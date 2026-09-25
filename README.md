# Game Media Daily — Vercel / GitHub migration starter

這份專案是從現有 Floot 版 Editorial OS 的已知架構建立的 **Vercel + GitHub 遷移起始版**。它特別先把「Threads 貼文區 → 原文長段重點 → 單段複製／全部複製」功能做進去。

## 目前已包含

- Next.js App Router
- `/api/news`：多 RSS 來源、來源失敗隔離、去重、日期排序
- `/api/article-extract`：JSON-LD / `<article>` / `<p>` 內文擷取
- 原文重點摘錄：4 段、約 160–1200 字候選，UI 單段複製與全部複製
- Threads 工坊：新聞／玩家／分析／數據、單篇／2–5 Thread、來源模式、偏重內容選項
- `/api/translate`：OpenAI-compatible JSON translation adapter
- `/api/threads`：OpenAI-compatible Threads adapter；沒有 API key 時不冒充成功
- Audit / Sources / Settings 遷移骨架
- `vercel.json`：每 15 分鐘新聞 Cron 起始設定
- `.env.example`

## 重要限制

目前無法從 Floot 直接匯出最新專案原始碼，因此這不是對 Floot 專案的逐檔 1:1 export；它是依目前已知功能與架構建立的 GitHub/Vercel migration starter。完整 1:1 遷移需要把最新 Floot source tree 帶入 GitHub。

## 本機

```bash
npm install
npm run dev
```

## Vercel

設定：

```text
OPENAI_API_KEY
OPENAI_MODEL
OPENAI_BASE_URL (optional)
```

RSS 新聞功能不依賴 AI。AI 翻譯與 Threads 生成則需要設定 provider。
