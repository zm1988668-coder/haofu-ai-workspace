import { FEISHU, SCORING } from "./config.js";
import type { ExtractedNumber } from "./extractor.js";

let _token: string | null = null;
let _tokenExpiry = 0;

async function getToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiry) return _token;
  const resp = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: FEISHU.appId, app_secret: FEISHU.appSecret }),
  });
  const data = (await resp.json()) as any;
  _token = data.tenant_access_token;
  _tokenExpiry = Date.now() + (data.expire || 7200) * 1000 - 60000;
  return _token!;
}

async function api(path: string, method = "GET", body?: any): Promise<any> {
  const token = await getToken();
  const opts: RequestInit = {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  const resp = await fetch(`https://open.feishu.cn${path}`, opts);
  return resp.json();
}

const TABLE_PATH = `/open-apis/bitable/v1/apps/${FEISHU.baseToken}/tables/${FEISHU.tableId}`;

/** 查重：检查 WhatsApp 号码是否已在表中 */
export async function findExisting(cleanedNumber: string): Promise<string | null> {
  const res = await api(
    `${TABLE_PATH}/records/search`,
    "POST",
    {
      filter: {
        conjunction: "and",
        conditions: [{ field_name: "WhatsApp", operator: "is", value: [cleanedNumber] }],
      },
      page_size: 1,
    }
  );
  if (res.code !== 0 || !res.data?.items?.length) return null;
  return res.data.items[0].record_id;
}

/** 计算优先级打分 */
function calcScore(sourceType: string, hasCompanyName: boolean, hasEmail: boolean, isBusinessAccount: boolean): number {
  let score = 0;
  switch (sourceType) {
    case "海关进口数据": score = SCORING.customsImportRecord; break;
    case "展会": score = SCORING.exhibitionExhibitor; break;
    case "协会": score = SCORING.associationMember; break;
    case "谷歌地图": score = SCORING.googleMapsMidSize; break;
    case "LinkedIn": score = SCORING.linkedInPurchasingManager; break;
    default: score = SCORING.socialMediaScattered;
  }
  if (isBusinessAccount) score += SCORING.bonus.whatsappBusiness;
  if (hasCompanyName) score += SCORING.bonus.hasCompanyName;
  if (hasEmail) score += SCORING.bonus.hasEmail;
  return score;
}

export interface LeadRecord {
  whatsapp: string;
  name: string;
  company: string;
  country: string;
  sourceUrl: string;
  sourceType: string;
  product: string;
  email: string;
  context: string;
  searchKeyword: string;
  searchBatch: string;
  followerCount: string;
}

/** 明确不是汽配的关键词（命中直接拒绝） */
const NON_AUTO_PARTS_KW = [
  "plastic", "plast", "minera", "mining", "lithium", "mineral",
  "calzado", "shoe", "compresor", "compressor",
  "software", "frio", "refrigeracion",
  "satelite", "galvanotecnia", "electroplating",
  "quimica", "petroquimica", "lubrication",
  "feria", "union", "sindicato", "camara",
  "gas", "energia", "geosistema", "ecotecnica",
  "disegno", "cosmetica", "alimento", "farmacia", "textil",
];

/** 占位符公司名（抓取残留） */
const PLACEHOLDER_NAMES = ["结果", "赞助商", "测试公司"];

/** 校验是否为汽配相关线索。只拒绝明确非汽配的，其余放行避免误杀 */
export function validateAutoParts(company: string, context: string, product: string): { valid: boolean; reason: string } {
  const companyNorm = (company || "").trim();

  // 1. 占位符拒绝
  for (const ph of PLACEHOLDER_NAMES) {
    if (companyNorm === ph || companyNorm.includes("赞助商")) {
      return { valid: false, reason: `占位符公司名: ${companyNorm}` };
    }
  }

  // 2. 空记录拒绝（无公司名且无WhatsApp在上层已处理，这里只看公司名）
  if (!companyNorm || companyNorm.length === 0) {
    return { valid: false, reason: "公司名为空" };
  }

  // 3. 明确非汽配关键词拒绝
  const checkText = `${companyNorm} ${context || ""} ${product || ""}`.toLowerCase();
  for (const kw of NON_AUTO_PARTS_KW) {
    if (checkText.includes(kw)) {
      return { valid: false, reason: `非汽配关键词: ${kw}` };
    }
  }

  // 4. 其余全部放行（避免误杀）
  return { valid: true, reason: "通过" };
}

/** 写入一条客户线索（含去重+汽配校验） */
export async function insertLead(lead: LeadRecord): Promise<{ created: boolean; recordId?: string; skipped?: boolean; skipReason?: string }> {
  const existing = await findExisting(lead.whatsapp);
  if (existing) return { created: false, recordId: existing };

  // 汽配相关性校验
  const validation = validateAutoParts(lead.company, lead.context, lead.product);
  if (!validation.valid) {
    console.log(`[filter] SKIP ${lead.company || lead.whatsapp}: ${validation.reason}`);
    return { skipped: true, skipReason: validation.reason };
  }

  const score = calcScore(lead.sourceType, !!lead.company, !!lead.email, false);

  const fields: Record<string, any> = {
    WhatsApp: lead.whatsapp,
    名称: lead.name || "未知",
    公司名: lead.company || "",
    国家: lead.country || "",
    来源链接: { link: lead.sourceUrl, text: lead.sourceUrl.substring(0, 80) },
    产品: lead.product || "",
    邮箱: lead.email || "",
    优先级打分: score,
    WhatsApp验证状态: "已验证",
    文本: lead.context || "",
    搜到关键词: lead.searchKeyword || "",
    搜索批次: lead.searchBatch || "",
    粉丝数: lead.followerCount || "",
    状态: "新线索",
  };

  const res = await api(`${TABLE_PATH}/records`, "POST", { fields });
  if (res.code !== 0) throw new Error(`Feishu insert failed: ${res.msg}`);
  return { created: true, recordId: res.data?.record?.record_id };
}

/** 更新 WhatsApp 验证状态 */
export async function updateVerificationStatus(recordId: string, status: string) {
  await api(`${TABLE_PATH}/records/${recordId}`, "PUT", {
    fields: { WhatsApp验证状态: status },
  });
}

/** 获取所有待验证的记录 */
/** 从飞书字段值中提取纯文本（records/search 返回数组格式 [{text, type}]） */
function fieldText(v: any): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && v.length > 0 && v[0].text) return v[0].text;
  return String(v ?? "");
}

export async function getPendingVerifications(limit = 100): Promise<Array<{ recordId: string; whatsapp: string }>> {
  const res = await api(
    `${TABLE_PATH}/records/search`,
    "POST",
    {
      filter: {
        conjunction: "and",
        conditions: [{ field_name: "WhatsApp验证状态", operator: "is", value: ["待验证"] }],
      },
      page_size: limit,
    }
  );
  if (res.code !== 0 || !res.data?.items?.length) return [];
  return res.data.items.map((r: any) => ({
    recordId: r.record_id,
    whatsapp: fieldText(r.fields.WhatsApp),
  }));
}

/** 保存监听任务 */
export async function upsertMonitorTask(url: string, status = "活跃") {
  // 简单的监控：存到一个 JSON 文件，后续可用飞书表存
  return { url, status };
}
