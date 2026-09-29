# Game Media Daily v2

遊戲新聞聚合、RSS / Atom 監控、來源健康度、免費翻譯、遊戲術語、Claim 風險提示與 Threads 草稿工作台。

## v2 這次處理的重點

- RSS parser 同時支援 RSS `<item>` 與 Atom `<entry>`。
- Atom `<link href="...">`、一般 `<link>...</link>` 與 `<guid>` 都可作連結備援。
- 每個 Feed 有 6 秒獨立 timeout；單一來源失敗不會拖垮整批來源。
- 新聞 ID 改成由 `source + link + title` 產生的穩定 hash，不再依賴排序 index。
- 來源總數與真正可讀 Feed 數分開顯示；UI 明確標出 `RSS / Atom`、`Web Only`。
- 首次載入使用示範資料並明確標籤；按「更新」後才切換成即時資料。
- 搜尋、來源篩選、平台與追蹤遊戲可保留在 LocalStorage。
- LocalStorage 可匯出 / 匯入 JSON。
- Threads 草稿強制附來源名稱與原文連結，並自動拆成每則不超過 500 字的可貼上內容。
- Threads 工作台增加「我的看法」，明確與來源事實分開。
- 翻譯維持免費路線，不依賴 OpenAI API；增加術語表、自訂遊戲術語、retry / timeout / concurrency。
- 翻譯結果預設標示「待人工校對」，完成校對後才標示已校對。
- Claim 工具改成「語句風險提示」，降低把簡單字詞匹配誤當成最終判決的問題。
- 時間顯示固定使用 `Asia/Taipei`。
- Mobile / tablet / desktop 皆有 responsive layout。

## 執行

```bash
npm install
npm run dev
```

## Vercel

把 GitHub repository 匯入 Vercel 即可。專案使用 Next.js App Router，不需要額外平台 runtime。

## 翻譯

預設使用免費 Google Translate 公開翻譯端點，再套用遊戲專有名詞與自訂 glossary。此做法不保證服務永久可用，因此程式保留本地 fallback；翻譯仍建議人工覆核。

## 來源資料

`lib/sources.ts` 把來源資料分成可聚合 Feed 與 Web / 帳號入口。不是每個來源都一定提供公開 RSS，因此 UI 不會再把「來源筆數」當成「Feed 筆數」。
