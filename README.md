# Game Media Daily v3

遊戲新聞聚合、RSS / Atom 監控、免費翻譯（遊戲術語保護）、Claim 語句風險提示與 Threads 草稿工作台。部署在 Vercel，不需要任何 API key。

## v3 修正重點

**新聞抓取**
- 修正摘要出現 `<p>`、`&nbsp;` 等 HTML 原始碼（先解碼再去標籤，處理跳脫過的 HTML）。
- 修正標題模糊去重從未生效：英文以單字、中文以兩字一組比對；連結去重會忽略 `utm_` 等追蹤參數。
- Atom 多個 `<link>` 時優先取文章連結；`guid` 不是網址時不再被當成連結。
- Feed 從 10 個增加到 22 個（新增 Push Square、Nintendo Life、Pure Xbox、Xbox Wire、GamesIndustry.biz、Game Developer、The Verge、Ars Technica、Wccftech，以及 Apex / CS2 / 魔物獵人荒野的 Steam 官方公告）。
- 開啟頁面就自動抓即時新聞，不再停在示範資料；可在設定開啟每 10 分鐘自動更新。

**翻譯**
- 遊戲術語、專有名詞、網址在翻譯「前」先保護，翻完換回指定譯法（舊版在翻譯後才套用，術語表幾乎從未生效）。
- 自訂術語：英文 → 中文在翻譯前保護；中文 → 中文在翻譯後替換，用來修正固定錯譯。
- 移除會改壞句子的硬替換（舊版會把所有「很多」改成「大量」）。
- 翻譯失敗會明確標示「翻譯失敗，顯示原文」，不再回傳中英夾雜的半成品。
- 譯文與人工校對紀錄存在本機；篩選、搜尋、重新整理都不會重翻或清掉校對紀錄，大幅減少對免費翻譯端點的請求。

**Threads 草稿**
- 不再出現 `#自動辨識`、`#GameMediaDaily`；只放一個辨識得到的遊戲 hashtag。
- 「素材比例」真的有作用；「每則各一篇」或「串成一串（1/N）」兩種格式；每則保證 500 字內。

**介面**
- 類型篩選只列分類器真的會產生的類型；新增平台篩選；PC 不會誤中 NPC、Switch 不會誤中 Switch 2。
- 收藏會保存整篇文章，可用「只看收藏」查看；帳號可標記關注並排在最前面。
- 儀表板顯示真實的最新新聞與每個 Feed 的狀態（則數或失敗原因）。
- Claim 提示支援中英文；沒偵測到風險時結果為「待查證」而不是「可發布」。
- 字體放大，手機上可閱讀。
- 移除沒有實際功能的頁面與按鈕（證據圖譜、修正追蹤、EN 切換、淺色模式切換）。

## 專案結構

```
app/page.tsx                 介面（單頁）
app/api/news/route.ts        抓 RSS / Atom、解析、去重
app/api/translate/route.ts   免費 Google 翻譯 + 術語保護
app/api/threads/route.ts     Threads 草稿 API（給外部工具用，前端直接用 lib/threads.ts）
lib/sources.ts               來源清單（新增 Feed 改這裡）
lib/classify.ts              分類、遊戲 / 平台辨識、HTML 清理
lib/dedupe.ts                去重
lib/glossary.ts              內建遊戲術語、專有名詞、台灣用語
lib/translate-core.ts        翻譯前後處理
lib/threads.ts               Threads 草稿產生
lib/audit.ts                 Claim 風險提示與 Evidence 門檻
```

## 新增來源

在 `lib/sources.ts` 的 `SOURCE_REGISTRY` 加一行並填 `feedUrl`。想追蹤某款遊戲的 Steam 官方公告：複製 `steam-apex` 那一行，把網址裡的 `1172470` 換成該遊戲的 Steam App ID（商店網址 `/app/` 後面的數字）。

## 執行

```bash
npm install
npm run dev
```

## Vercel

GitHub repository 匯入 Vercel 即可，不需要設定環境變數。

網站網址是公開的，理論上別人也能呼叫你的 `/api/translate`。這個工具用量小，通常不是問題；如果在意，可以研究 Vercel 的 Deployment Protection（部分選項需付費方案）。

## 翻譯服務

使用 Google Translate 的免費公開端點，不需要 key，但它不是正式服務，請求太頻繁可能暫時被限流。程式已經做了快取與失敗標示；翻譯結果一律建議人工校對後再發布。
