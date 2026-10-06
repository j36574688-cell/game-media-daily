// Gemini 翻譯：依「口吻」真正改寫，而不只是逐字翻譯。
// 只在伺服器端執行；API key 放在 Vercel 環境變數 GEMINI_API_KEY，不會傳到瀏覽器。
import { GAMER_GLOSSARY, GLOSSARY, PROPER_TERMS } from "./glossary";
import type { CustomTerm, TranslateMode } from "./translate-core";

// 預設用 Flash-Lite：速度快、免費額度最寬鬆。想換模型就在 Vercel 設 GEMINI_MODEL。
const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/";

export type GeminiItem = { id: string; title: string; excerpt: string };
export type GeminiResult = { id: string; title: string; excerpt: string };

export class GeminiError extends Error {
  constructor(message: string, readonly quota = false) {
    super(message);
  }
}

export function geminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

const LANG_NAME: Record<string, string> = {
  "zh-TW": "台灣繁體中文",
  en: "English",
  ja: "日本語",
  ko: "한국어",
};

const TONE: Record<TranslateMode, string> = {
  literal:
    "口吻：貼近原文。忠實直譯，盡量保留原句結構與語序，不增加、不刪減、不潤飾任何資訊。",
  news:
    "口吻：台灣新聞媒體。用詞正式、精簡、客觀，像台灣科技或遊戲新聞網站的編輯；標題不加句號；引號用「」；大數字用「萬」「億」（例如 125 萬）；未證實的消息保留「據報導」「傳聞」等語氣。",
  game:
    "口吻：台灣玩家社群。像在巴哈姆特、PTT 或 Threads 跟玩家聊遊戲新聞，用玩家慣用語（例如：第 27 賽季、造型、排位、過強、削弱、強化、版本答案、刷），語氣輕鬆自然但不誇張、不加表情符號、不加入原文沒有的情緒或資訊。",
};

function glossaryHint(mode: TranslateMode, custom: CustomTerm[]): string {
  const pairs: Array<[string, string]> = [...custom];
  if (mode !== "literal") pairs.push(...GLOSSARY);
  if (mode === "game") pairs.push(...GAMER_GLOSSARY);
  const seen = new Set<string>();
  const lines = pairs
    .filter(([from]) => {
      const k = from.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 90)
    .map(([from, to]) => `${from} → ${to}`);
  return lines.join("；");
}

function buildPrompt(target: string, mode: TranslateMode, custom: CustomTerm[]): string {
  const lang = LANG_NAME[target] || target;
  const zh = target.toLowerCase().startsWith("zh");
  return [
    `你是遊戲新聞的專業譯者。把使用者提供的每一則新聞的 title 與 excerpt 翻譯成${lang}。`,
    zh ? TONE[mode] : "Keep the meaning exact and natural for native readers.",
    "規則：",
    "1. 只能翻譯與調整語氣，不能新增、推測或刪除事實；數字、日期、版本號、人名必須與原文一致。",
    `2. 遊戲名稱、公司名稱、平台名稱維持英文原文（例如：${PROPER_TERMS.slice(0, 12).join("、")}）。`,
    "3. 網址原樣保留。",
    "4. excerpt 是空字串就回傳空字串。",
    zh ? `5. 下列術語請使用指定譯法（使用者自訂的優先）：${glossaryHint(mode, custom)}` : "",
    '只回傳 JSON 陣列，不要其他文字，格式：[{"id":"...","title":"...","excerpt":"..."}]，id 與輸入相同、順序相同。',
  ]
    .filter(Boolean)
    .join("\n");
}

function extractJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new GeminiError("Gemini 回傳格式無法解析");
  }
}

/** 一次請求翻譯一整批（最多 10 則），省免費額度。失敗時 throw GeminiError。 */
export async function geminiTranslate(items: GeminiItem[], target: string, mode: TranslateMode, custom: CustomTerm[]): Promise<GeminiResult[]> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new GeminiError("未設定 GEMINI_API_KEY");
  if (!items.length) return [];
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;

  const r = await fetch(ENDPOINT + encodeURIComponent(model) + ":generateContent", {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: buildPrompt(target, mode, custom) }] },
      contents: [{ role: "user", parts: [{ text: JSON.stringify(items) }] }],
      generationConfig: { temperature: mode === "literal" ? 0.1 : 0.4, responseMimeType: "application/json" },
    }),
    signal: AbortSignal.timeout(25000),
    cache: "no-store",
  });

  if (r.status === 429) throw new GeminiError("Gemini 免費額度暫時用完", true);
  if (!r.ok) {
    let detail = "";
    try {
      detail = String((await r.json())?.error?.message || "");
    } catch {
      /* ignore */
    }
    throw new GeminiError(`Gemini HTTP ${r.status}${detail ? "：" + detail.slice(0, 160) : ""}`);
  }

  const data = await r.json();
  const text: string = (data?.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || "").join("");
  if (!text) throw new GeminiError("Gemini 沒有回傳內容" + (data?.promptFeedback?.blockReason ? `（${data.promptFeedback.blockReason}）` : ""));

  const parsed = extractJson(text);
  if (!Array.isArray(parsed)) throw new GeminiError("Gemini 回傳不是陣列");
  const byId = new Map<string, GeminiResult>();
  for (const x of parsed as Array<Record<string, unknown>>) {
    const id = String(x?.id ?? "");
    if (id) byId.set(id, { id, title: String(x?.title ?? ""), excerpt: String(x?.excerpt ?? "") });
  }
  // 缺漏或標題空白的項目視為失敗，交給呼叫端改用備援翻譯
  return items.map((it) => {
    const got = byId.get(it.id);
    if (!got || (it.title.trim() && !got.title.trim())) throw new GeminiError("Gemini 回傳缺少部分項目");
    return { id: it.id, title: got.title.trim(), excerpt: it.excerpt.trim() ? got.excerpt.trim() : "" };
  });
}
