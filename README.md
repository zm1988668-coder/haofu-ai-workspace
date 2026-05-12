# 浩富外贸AI工作台 (Haofu AI Foreign Trade Workstation)

AI-powered automation system for auto parts foreign trade: customer acquisition, competitor monitoring, product search bot.

## Token Consumption (May 2026, 12 days)

| Model | Tokens | API Calls |
|-------|--------|-----------|
| DeepSeek-V4-Pro | 551,032,988 | 5,404 |
| DeepSeek-V4-Flash | 1,721,355 | 1,296 |
| **Monthly projection** | **~1.5B** | — |

## System Architecture

```
Claude Code + OpenClaw Gateway
    │
    ├── Customer Acquisition Engine
    │   ├── Netease Customs Data Scraper
    │   ├── Exhibition Exhibitor Collector
    │   └── Facebook Marketplace Scraper (Argentina)
    │
    ├── Competitor Monitoring System
    │   ├── Guangzhou Competitor Discovery (86 companies)
    │   ├── Buyer Network Deep Dive
    │   └── Daily Change Detection (>20% alert)
    │
    ├── WeCom Product Bot
    │   ├── Part Number → Direct Feishu Search
    │   ├── Zero AI Hallucination (hardcoded search)
    │   └── DeepSeek Chat Fallback
    │
    ├── Daily Briefing (9 AM Auto-Push)
    │
    └── Feishu Data Hub
        ├── 5 Bases, 4000+ Products, 1887 Images
        └── WPS Excel → Bitable Auto-Sync
```

## Core Agents

### 1. Customer Acquisition Agent
Automates browser-based scraping: login → paginate → table parse → drawer extract → WhatsApp verify → write to Feishu. Each task involves 10+ sequential page interactions. Currently deployed for Argentina market (138+ leads collected).

### 2. Competitor Monitoring Agent
Discovers competitors → extracts export data → maps buyer networks → daily snapshot comparison. Alerts on >20% export value changes.

### 3. WeCom Product Bot
Receives part numbers via WeChat Work → regex extraction → direct Feishu multi-base search (4000+ products) → returns OEM/model/images. Hardcoded search path eliminates AI hallucination.

## Tech Stack

- **AI Orchestration**: Claude Code
- **Gateway**: OpenClaw
- **LLM**: DeepSeek-V4-Pro, DeepSeek-V4-Flash
- **Data**: Feishu Bitable API
- **Automation**: Playwright (browser), Node.js
- **Messaging**: WeChat Work (WeCom) AI Bot WebSocket

## Planned: MiMo Migration

Evaluating Xiaomi MiMo for long-context agent workflows — particularly multi-step web scraping (SPA pagination 10+ steps) and cross-base data comparison.
