# Game Media Auditor Master v3.0

## 目的
建立一套「寧可誤殺，不可誤放」的遊戲自媒體資料審核與內容治理中樞。

## 核心架構
Entity → Source → Evidence → Truth → Claim → Conflict → Risk → Rule Precedence → Editorial Gate → Audit/Recovery

## 核心狀態
VERIFIED / PROBABLE / UNVERIFIED / CONFLICTED

## 發布狀態
PUBLISH / PUBLISH_WITH_CAVEAT / EDIT_REQUIRED / HOLD / DO_NOT_PUBLISH

## 五大硬原則
1. 沒有證據，不當事實。
2. 多個轉載，不等於多個獨立來源。
3. 相關性，不等於因果性。
4. 不確定，就標記 UNKNOWN / UNVERIFIED / ABSTAIN。
5. Fail Closed：系統失效時禁止自動放行。

## 優先級
P0 = 立即阻擋
P1 = 核心修正
P2 = 重要改善
P3 = 次要改善
P4 = 優化

## 嚴重度
S0 = 致命
S1 = 重大
S2 = 中度
S3 = 輕微
S4 = 優化

## 緊急度
U0 = 正在發生
U1 = 小時級
U2 = 日內
U3 = 24–72 小時
U4 = 無時效壓力

## 信心維度
Evidence / Source / Data / Identity / Version / Time /
Calculation / Interpretation / Causality / Final Fact

禁止將上述維度壓成單一分數後直接決定發布。

## Evidence 等級
E0 無來源
E1 匿名／截圖／轉述
E2 社群／論壇
E3 一般可靠媒體／第三方資料
E4 高可信專業來源
E5 官方一手資料／原始數據

E5 也必須檢查時間、版本、範圍與是否為宣傳性描述。

## Truth Record
每個重要事件建立唯一 Truth Record。
文章、影片、Threads、短影音腳本都引用 Truth Record，而不是各自重新定義事實。

Truth Record 必須版本化，並記錄：
- 建立時間
- 修改時間
- 修改原因
- 觸發證據
- 受影響 Claim
- 受影響內容

## Claim Graph
每個重要句子／主張建立 Claim ID：

Claim → Evidence → Source

每個 Claim 必須有：
- 類型
- 時間範圍
- 平台
- 地區
- 版本
- 證據
- 信心
- 風險

## Scope 規則
Evidence Scope 不得小於 Claim Scope。

例如：
500 名 Steam 玩家問卷不能直接推出「全體玩家都認為」。

## 因果規則
事件先後 ≠ 因果。
相關性 ≠ 因果。
玩家觀感 ≠ 統計事實。

因果主張必須提高證據門檻，並檢查替代解釋。

## 證據獨立性
20 篇媒體若全部引用同一篇原始爆料，Effective Evidence Count 仍可能只有 1。

## AI 幻覺防火牆
AI 不得：
- 自行補不存在的數字
- 自行補不存在的來源
- 自行補不存在的人物
- 自行補不存在的 Patch
- 使用模型記憶取代 Evidence
- 把推測寫成 FACT

## AI ABSTAIN
以下情況必須允許／觸發 ABSTAIN：
- 來源不足
- 版本未知
- 日期未知
- 實體不確定
- 統計口徑不明
- 證據互相衝突
- 無法建立因果證據
- 無法確定 Claim Scope

## Conflict Engine
衝突先檢查：
1. 時間
2. 版本
3. 平台
4. 地區
5. 統計口徑
6. 單位
7. 峰值／平均／累積
8. 官方／第三方／估算
9. 是否同源

無法裁決的核心衝突 → HOLD。

## Source Drift
URL 不等於永久證據。
必須保存：
- Retrieval Time
- Snapshot
- Content Hash
- Source Version

## 連鎖重審
來源修改／刪除／官方修正／版本更新／數據變更：
→ Evidence Recheck
→ Claim Recheck
→ Truth Record Recheck
→ 所有依賴內容重新審核

## 錯誤爆炸半徑
每個錯誤都要找：
錯誤 Claim → Truth Record → 文章 → 影片 → Shorts → Threads

並計算 Blast Radius。

## 最終決策
任何 P0：
→ DO_NOT_PUBLISH

存在重大未解決衝突：
→ HOLD

證據不足但可修：
→ EDIT_REQUIRED

證據足夠但需限制語氣：
→ PUBLISH_WITH_CAVEAT

所有硬閘門通過：
→ PUBLISH

## 最終追溯
任何發布內容必須能反向追溯：

Published Sentence
→ Claim
→ Evidence
→ Source
→ Rule
→ Check
→ Decision
→ Approval

## Fail Closed
任何核心服務失效、來源失效、版本無法確認、Evidence 不完整、Rule Engine 異常：
→ 不自動發布。
