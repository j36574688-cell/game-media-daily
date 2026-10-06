import { NextRequest, NextResponse } from "next/server";
import { translateWith, postProcess, type CustomTerm, type TranslateMode } from "@/lib/translate-core";

export const runtime = "nodejs";
export const maxDuration = 30;

// 同一個 Vercel 執行個體內的簡易快取：同一句話不重複打翻譯服務
const CACHE = new Map<string, string>();
const CACHE_LIMIT = 3000;
function cacheGet(key: string) {
  const v = CACHE.get(key);
  if (v !== undefined) {
    CACHE.delete(key);
    CACHE.set(key, v); // 移到最新
  }
  return v;
}
function cacheSet(key: string, value: string) {
  CACHE.set(key, value);
  if (CACHE.size > CACHE_LIMIT) CACHE.delete(CACHE.keys().next().value as string);
}

/** 免費 Google Translate 公開端點（非官方、不保證永久可用）。失敗時 throw。 */
async function googleTranslate(text: string, target: string): Promise<string> {
  if (!text.trim()) return text;
  const key = target + "\n" + text;
  const hit = cacheGet(key);
  if (hit !== undefined) return hit;
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" +
    encodeURIComponent(target) +
    "&dt=t&q=" +
    encodeURIComponent(text);
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(6000), cache: "no-store" });
      if (r.status === 429) throw new Error("翻譯服務暫時限流（429）");
      if (!r.ok) throw new Error("translate HTTP " + r.status);
      const d = await r.json();
      const out = Array.isArray(d?.[0]) ? d[0].map((x: unknown) => String((x as unknown[])?.[0] ?? "")).join("") : "";
      if (!out) throw new Error("translate empty result");
      cacheSet(key, out);
      return out;
    } catch (e) {
      lastError = e;
      if (attempt === 0) await new Promise((r) => setTimeout(r, 400));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("translation failed");
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

type InArticle = { id?: unknown; title?: unknown; excerpt?: unknown };

export async function POST(req: NextRequest) {
  let body: { targetLanguage?: unknown; mode?: unknown; customGlossary?: unknown; articles?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }
  const target = String(body.targetLanguage || "zh-TW");
  const modeRaw = String(body.mode || "news");
  const mode: TranslateMode = modeRaw === "game" || modeRaw === "literal" ? modeRaw : "news";
  const custom: CustomTerm[] = Array.isArray(body.customGlossary)
    ? body.customGlossary
        .slice(0, 80)
        .map((x: { from?: unknown; to?: unknown }): CustomTerm => [String(x?.from || "").trim(), String(x?.to || "").trim()])
        .filter(([from, to]: CustomTerm) => Boolean(from && to))
    : [];
  const articles: InArticle[] = Array.isArray(body.articles) ? body.articles.slice(0, 20) : [];

  const translations = await mapLimit(articles, 3, async (article) => {
    const id = String(article.id ?? "");
    const title = String(article.title || "").slice(0, 4000);
    const excerpt = String(article.excerpt || "").slice(0, 1500);
    try {
      const [t, e] = await Promise.all([
        translateWith(googleTranslate, title, target, mode, custom),
        translateWith(googleTranslate, excerpt, target, mode, custom),
      ]);
      return { id, title: t, excerpt: e, failed: false };
    } catch {
      // 失敗時明確回報，並回傳原文（不再回傳「半翻譯」的中英夾雜文字）
      return { id, title: postProcess(title, "en", mode, []), excerpt: postProcess(excerpt, "en", mode, []), failed: true };
    }
  });

  return NextResponse.json({
    translations,
    failedCount: translations.filter((x) => x.failed).length,
    model: "free-google-translate",
    mode,
    customGlossaryApplied: custom.length,
  });
}
