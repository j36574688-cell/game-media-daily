# Floot 重建紀錄

## 原專案
- Project: Game Media Daily
- Floot project id: dbb31713-ac45-4f22-b95b-501a56b75cb0
- Floot version observed: 1790373476141

## Floot 核心檔案已核對
- base.css
- pages/_index.tsx
- pages/_index.module.css
- helpers/sourceRegistry.tsx
- helpers/useNewsQuery.tsx
- helpers/useNewsTranslation.tsx
- helpers/useThreadsDraft.tsx
- helpers/themeMode.tsx
- helpers/useMediaQuery.tsx
- helpers/useScrollReveal.tsx
- helpers/useDebounce.tsx
- helpers/useCallbackRef.tsx
- endpoints/news_GET.ts
- endpoints/translate_POST.ts
- endpoints/threads_POST.ts
- 對應 schema

## 獨立部署替換
- Floot router / React page → Next.js App Router
- Floot `/_api/*` → Next.js `/api/*`
- `@floot/ai` → 可選外部 OpenAI-compatible endpoint + 本地 fallback
- Floot seeded component library → 本版本頁面使用自包含 CSS / native controls，避免被 `@floot/*` 綁定

## 目的
讓專案能直接放進 GitHub，再由 Vercel 部署，不需要依賴 Floot runtime。
