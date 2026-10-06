# Game Media Daily v4

遊戲新聞聚合、RSS / Atom 監控、免費翻譯（遊戲術語保護）、Claim 語句風險提示與 Threads 草稿工作台。部署在 Vercel，不需要任何 API key。

## v4 新功能

- **熱度排序**：不同媒體報導同一件事會合併成一張卡片，顯示「🔥 N 家報導」，可展開看各家連結；新聞雷達可改用「熱度」排序，儀表板有「熱門事件」。合併時會降低常見字（遊戲名稱）的權重，避免把同一款遊戲的不同新聞誤併。
- **NEW 標記**：上次之後才出現的新聞標示 NEW，側邊欄顯示數量；可「只看 NEW」、按「全部標為已讀」，點開原文的會自動變成已讀。
- **中文 / 日文來源**：新增巴哈姆特 GNN、4Gamer.net、AUTOMATON；中文來源不送翻譯，日文來源自動翻成中文；新聞雷達可依語言篩選；支援 Big5 編碼的 Feed。
- **Threads 一鍵發文**：草稿按「在 Threads 發這則」會打開 Threads 並帶入文字（官方 intent 網址）。
- **貼文範本**：可存多組開頭 / 結尾（例如「🎮 今日遊戲快報」、「你怎麼看？留言聊聊」）；單篇每則都加，串文只加在第一則 / 最後一則。
- **跨裝置同步**：收藏、追蹤清單、自訂術語、關注帳號、範本與篩選設定在電腦與手機之間同步（見下方「跨裝置同步設定」）。

## v3 修正重點

**新聞抓取**
- 修正摘要出現 `<p>`、`&nbsp;` 等 HTML 原始碼（先解碼再去標籤，處理跳脫過的 HTML）。
- 修正標題模糊去重從未生效：英文以單字、中文以兩字一組比對；連結去重會忽略 `utm_` 等追蹤參數。
- Atom 多個 `<link>` 時優先取文章連結；`guid` 不是網址時不再被當成連結。
- Feed 從 10 個增加到 22 個（新增 Push Square、Nintendo Life、Pure Xbox、Xbox Wire、GamesIndustry.biz、Game Developer、The Verge、Ars Technica、Wccftech，以及 Apex / CS2 / 魔物獵人荒野的 Steam 官方公告）。
- 開啟頁面就自動抓即時新聞，不再停在示範資料；可在設定開啟每 10 分鐘自動更新。

**翻譯**
- 遊戲術語、專有名詞、網址在翻譯「前」先保護，翻完換回指定譯法（舊版在翻譯後才套用，術語表幾乎從未生效）。
- 三種翻譯用詞模式（免費 Google 翻譯只調整用詞與格式，不改寫語氣）：
  - 貼近原文：只保護遊戲名稱、網址與自訂術語，其餘照翻譯引擎輸出。
  - 台灣新聞格式：套用術語表，並整理成台灣新聞寫法（「」引號、1,250,000 → 125 萬、報導、標題不加句號）。
  - 玩家用語：套用術語表＋玩家用語（Season 27 → 第 27 賽季、skins → 造型、ranked → 排位、overpowered → 過強）。
  - 切換模式會自動重翻；標題裡沒有這些元素時三種結果會相同。想要真正改寫語氣，可設定下方的 Gemini（選填）。
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
app/api/sync/route.ts        跨裝置同步（Upstash Redis）
lib/gemini.ts                Gemini 翻譯（選填）
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

## 跨裝置同步設定（選填，免費）

1. Vercel 專案 → **Storage** → **Create Database** → **Upstash for Redis**（Free 方案）。
2. 建立後按 **Connect Project** 選這個專案；環境變數會自動加入，不需要複製任何 key。
3. **Deployments** → 最新一筆 → **Redeploy**。
4. 打開網站 → 設定 → 跨裝置同步 → 「建立同步碼」，在其他裝置貼上同一組同步碼。

同步碼請像密碼一樣保管；伺服器只存同步碼的雜湊值。翻譯快取與已讀紀錄不同步（各裝置分開）。

## Gemini 翻譯（選填，讓三種口吻真的不同）

免費 Google 翻譯只能翻字；設定 Gemini 後，「貼近原文 / 新聞口吻 / 遊戲術語」會由 Gemini 真正改寫。

1. 到 [Google AI Studio](https://aistudio.google.com/apikey) 建立 API key（免費方案不需信用卡；Gemini 會員方案不包含 API 用量，兩者分開計算）。
2. Vercel 專案 → Settings → Environment Variables，新增 `GEMINI_API_KEY`，值貼上 key，Environments 勾 Production 與 Preview。
3. 重新部署（Deployments → 最新一筆 → Redeploy）。
4. 翻譯工作台右上角顯示「Gemini 已啟用」就成功了。

注意：
- 免費方案每天有請求上限，可在 AI Studio 查看；用完會自動改用 Google 翻譯並提示。每 10 則新聞只用 1 次請求。
- 免費方案的內容可能被 Google 用來改進產品；這裡處理的是公開新聞，但不要貼私人資料。
- 想換模型：設定 `GEMINI_MODEL`（例如 `gemini-3.5-flash`）。

## 翻譯服務

使用 Google Translate 的免費公開端點，不需要 key，但它不是正式服務，請求太頻繁可能暫時被限流。程式已經做了快取與失敗標示；翻譯結果一律建議人工校對後再發布。
