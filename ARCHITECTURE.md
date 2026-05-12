# Architecture

## Directory Structure

```
~/OpenClaw/                          # OpenClaw gateway + scraping scripts
├── scripts/
│   ├── discover-gz-*.mjs            # Guangzhou competitor discovery (v2-v12)
│   ├── gz-buyer-test.mjs            # Buyer network exploration
│   ├── gz-drawer-explore.mjs        # Drawer data extraction
│   ├── gz-locator-test.mjs          # Company locator
│   └── gz-test-extract*.mjs         # Extraction tests

~/haofu-bot/                         # Standalone WeCom bot
├── bot.mjs                          # WebSocket client + message routing
├── feishu.mjs                       # Feishu bitable search + image download
├── search-api.mjs                   # Search API endpoints
├── config.mjs                       # WeCom + Feishu + DeepSeek config
└── mcp-server.mjs                   # MCP server (alternative path)

~/.claude/projects/-Users-a0000/memory/  # Persistent cross-session memory
├── 飞书数据插座/                     # Feishu data hub (5 memories)
├── 外贸获客引擎/                     # Customer acquisition (2 memories)
├── 展会客户数据背调/                  # Exhibition leads (2 memories)
├── 同行采购商背调/                    # Competitor monitoring (1 memory)
├── 日报/                             # Daily briefing (1 memory)
├── 企业机器人/                        # WeCom bot (1 memory)
└── 元规则/                           # Meta rules (1 memory)
```

## Data Flow

```
WeCom User Message
  → WebSocket → bot.mjs
  → Regex extract part number
  → feishu.mjs → Feishu Bitable API (5 bases, parallel search)
  → Format: OEM + type + image
  → WebSocket reply

Scraping Task
  → Claude Code agent dispatch
  → Playwright browser automation
  → 163 waimao / Facebook / Exhibition platform
  → Parse HTML tables, drawers
  → Validate + dedup
  → feishu.ts insertLead() → WhatsApp线索Base
```

## Feishu Bases

| Base | Token | Records |
|------|-------|---------|
| KITLAMT 2025-9.17 | T9mzbxny2aAtmjsy3lIcZKxyn2b | — |
| Electric Steering 电子机目录2026 | OjXNbFwfjak0JpsgMatc9qCVnre | — |
| 齿条-丝杆产品目录26.4 | Pd85bxKNjaYFcYsk1xHcvjprnIX | — |
| 电子方向机翻新 | XaCwbMYE4atRa2sVVu5c1qjandf | 424 |
| 刹车片目录 | QMJZb85bJa1Y1KsmX7RcjtQ2nsc | 1908+372+164 |
| WhatsApp客户线索 | IJPrbMcTaa0FmIssubIcUELfnMv | — |
| 展会客户 | CWm2bq0J1azniss1S0EcBpSNnOf | — |

All under tenant: acnoz4oil6vw.feishu.cn
