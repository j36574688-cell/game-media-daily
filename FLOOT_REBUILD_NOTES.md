# Floot 重建紀錄 / GitHub v2

原始專案：Game Media Daily
Floot project id：dbb31713-ac45-4f22-b95b-501a56b75cb0

## v2 原則

- 保留原本的 Editorial OS 工作台結構。
- 移除對 Floot runtime 的依賴。
- GitHub / Vercel 版採 Next.js App Router。
- 翻譯不使用 OpenAI API；改走免費 Google Translate 公開端點 + glossary + local fallback。
- RSS / Atom 解析、來源健康度、穩定 ID、去重、錯誤提示與 Mobile UI 重新整理。
