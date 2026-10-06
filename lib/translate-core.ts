// 翻譯前後處理：保護網址與術語、套用自訂術語、台灣用語修正。
// 與實際翻譯引擎分開，方便測試與日後更換引擎。
import { GLOSSARY, PROPER_TERMS, TW_WORDING } from "./glossary";

export type TranslateMode = "news" | "game" | "literal";
export type CustomTerm = [string, string];

const HAS_CJK = /[㐀-鿿]/;

function esc(v: string) {
  return v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 佔位符：全大寫英數字，翻譯引擎通常原樣保留；還原時容許引擎插入空白。 */
const token = (i: number) => `ZQX${i}XQZ`;
const TOKEN_RE = /Z\s*Q\s*X\s*(\d+)\s*X\s*Q\s*Z/gi;

/** 文字是否已經以中文為主（就不必再送翻譯）。 */
export function isMostlyChinese(text: string): boolean {
  const cjk = (text.match(/[㐀-鿿]/g) || []).length;
  const latin = (text.match(/[a-z]/gi) || []).length;
  return cjk > 0 && cjk >= latin / 3;
}

/**
 * 把網址、專有名詞、術語換成佔位符。
 * 回傳 protectedText 給翻譯引擎，翻完再用 restore() 換回。
 */
export function protect(text: string, target: string, custom: CustomTerm[]) {
  const saved: string[] = [];
  const keep = (value: string) => {
    saved.push(value);
    return " " + token(saved.length - 1) + " ";
  };
  let out = text.replace(/https?:\/\/[^\s<>"]+/gi, (url) => keep(url));

  const toChinese = target.toLowerCase().startsWith("zh");
  // 英文來源的術語：自訂術語優先於內建術語；專有名詞保持原文
  const terms = new Map<string, string>();
  for (const name of PROPER_TERMS) terms.set(name.toLowerCase(), name);
  if (toChinese) for (const [en, zh] of GLOSSARY) terms.set(en.toLowerCase(), zh);
  for (const [from, to] of custom) if (!HAS_CJK.test(from)) terms.set(from.toLowerCase(), to);

  const keys = [...terms.keys()].filter(Boolean).sort((a, b) => b.length - a.length);
  if (keys.length) {
    const re = new RegExp("(?<![A-Za-z0-9])(" + keys.map(esc).join("|") + ")(?![A-Za-z0-9])", "gi");
    out = out.replace(re, (m) => keep(terms.get(m.toLowerCase()) ?? m));
  }

  const restore = (translated: string) =>
    translated
      .replace(TOKEN_RE, (whole, n: string) => saved[Number(n)] ?? "")
      .replace(/ {2,}/g, " ");
  return { protectedText: out.replace(/ {2,}/g, " ").trim(), restore };
}

/** 翻譯後處理：中文術語校正、台灣用語、標點空白。 */
export function postProcess(text: string, target: string, mode: TranslateMode, custom: CustomTerm[]): string {
  let out = text;
  if (target.toLowerCase().startsWith("zh")) {
    for (const [from, to] of TW_WORDING) out = out.split(from).join(to);
    if (mode === "game") out = out.replace(/用戶|使用者/g, "玩家");
    // 中文 → 中文的自訂術語（例如把引擎譯的「傳奇」改成「英雄」）
    for (const [from, to] of custom) if (HAS_CJK.test(from)) out = out.split(from).join(to);
    // 中文與標點之間不留空白；中英之間保留一個空白
    out = out
      .replace(/\s+([，。！？；：、」』）])/g, "$1")
      .replace(/([「『（])\s+/g, "$1")
      .replace(/([㐀-鿿，。！？；：、])\s+([㐀-鿿])/g, "$1$2");
  }
  return out.replace(/[ \t]{2,}/g, " ").trim();
}

/** 依句子切塊，避免單次請求過長。 */
export function splitForTranslation(text: string, max = 650): string[] {
  if (text.length <= max) return [text];
  const sentences = text.match(/[^.!?。！？]+[.!?。！？]*\s*/g) || [text];
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    if ((current + s).length > max && current) {
      chunks.push(current);
      current = s;
    } else current += s;
  }
  if (current) chunks.push(current);
  return chunks.flatMap((x) => (x.length <= max ? [x] : Array.from({ length: Math.ceil(x.length / max) }, (_, i) => x.slice(i * max, (i + 1) * max))));
}

/**
 * 完整流程：保護 → 分段翻譯 → 還原 → 後處理。
 * engine 是實際呼叫翻譯服務的函式，失敗時應該 throw。
 */
export async function translateWith(
  engine: (text: string, target: string) => Promise<string>,
  text: string,
  target: string,
  mode: TranslateMode,
  custom: CustomTerm[]
): Promise<string> {
  if (!text.trim()) return "";
  const toChinese = target.toLowerCase().startsWith("zh");
  if (toChinese && isMostlyChinese(text)) return postProcess(text, target, mode, custom);
  const { protectedText, restore } = protect(text, target, custom);
  const parts: string[] = [];
  for (const chunk of splitForTranslation(protectedText)) parts.push(await engine(chunk, target));
  return postProcess(restore(parts.join(toChinese ? "" : " ")), target, mode, custom);
}
