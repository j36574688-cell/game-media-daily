# Game Media Daily

GitHub / Vercel 可直接部署的 Next.js 版遊戲新聞編輯台。

## 功能

- 新聞雷達：RSS 聚合、去重、關鍵字搜尋、內容類型、遊戲系列、來源篩選
- 來源中心：官方、媒體、資料追蹤來源資料庫
- 帳號中心：個人帳號、平台帳號、Evidence Hint
- 遊戲新聞翻譯工作台：新聞口吻／遊戲術語／貼近原文
- Claim 審核：Scope、Causality、Rumor Gate、Evidence Gate
- Threads 工坊：勾選新聞後生成單篇或串文草稿
- 證據圖譜、規則矩陣、修正追蹤、系統設定
- LocalStorage：收藏、追蹤遊戲、深色模式
- Server-side RSS fetch，避免前端直接碰 RSS CORS

## 本機執行

```bash
npm install
npm run dev
```

開啟 `http://localhost:3000`。

## GitHub

把此資料夾內的所有檔案上傳到 repository 根目錄，然後在 Vercel 匯入 GitHub repository 即可部署。

## 注意

翻譯與 Threads 目前採可離線運作的本地 fallback，因此沒有 AI API Key 也能執行。後續可把 `/app/api/translate/route.ts` 與 `/app/api/threads/route.ts` 改接你的 AI 服務。
