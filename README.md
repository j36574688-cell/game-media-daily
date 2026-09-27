# Game Media Daily — Floot 重建 / GitHub 版

這個版本是把原本 Floot 專案的核心功能與介面概念重建成獨立的 Next.js App Router 專案。

## 已保留

- 遊戲新聞總監控
- RSS 新聞雷達、搜尋、去重、來源篩選
- 40+ 新聞／官方／資料來源與 20+ 帳號資料
- Claim / Evidence / Scope / Causality 審核工作台
- Threads 草稿工作台
- 翻譯工作台
- Evidence Graph
- Rules Matrix
- Revalidation / Correction 追蹤
- LocalStorage 收藏、追蹤遊戲、深色模式
- Vercel 可部署的 server-side RSS API

## Floot 專用依賴的處理

原本 Floot endpoint 使用 `@floot/ai`。GitHub 版已移除這個平台專用依賴，改為：

1. 沒有 API Key 時：使用本地 fallback，不會因 AI 服務不存在而整個網站掛掉。
2. 有 `OPENAI_API_KEY` 時：翻譯 API 可切到外部 OpenAI-compatible endpoint。
3. Threads 目前保留穩定的本地 draft engine，方便先部署。

## 本機執行

```bash
npm install
npm run dev
```

## Vercel

直接把本專案目錄匯入 Vercel 即可。

## 注意

這不是 Floot 官方付費 ZIP 匯出檔，而是以 Floot 專案可讀取到的原始碼、專案設定與既有 GitHub 版本為基礎整理的獨立重建版。
