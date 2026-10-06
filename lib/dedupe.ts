import type { Article } from "./types";

/**
 * 去重用的 token：英文 / 數字以單字為單位，中文以兩字一組（bigram）。
 * 舊版先把空白全部刪掉再切 token，整個標題變成一個 token，所以模糊去重從來沒生效。
 */
const STOPWORDS = new Set(["the", "a", "an", "to", "of", "and", "in", "on", "for", "is", "are", "with", "as", "at", "by", "it", "its", "from", "this", "that", "new"]);
function titleTokens(title: string): Set<string> {
  const lower = title.toLowerCase();
  const tokens = new Set<string>();
  for (const w of lower.match(/[a-z0-9]+/g) || []) if (!STOPWORDS.has(w)) tokens.add(w);
  for (const run of lower.match(/[㐀-鿿]+/g) || []) {
    if (run.length === 1) tokens.add(run);
    for (let i = 0; i < run.length - 1; i++) tokens.add(run.slice(i, i + 2));
  }
  return tokens;
}
function similarity(a: Set<string>, b: Set<string>) {
  if (a.size < 3 || b.size < 3) return 0; // 太短的標題不做模糊比對，避免誤刪
  let hit = 0;
  for (const t of a) if (b.has(t)) hit++;
  return hit / Math.max(a.size, b.size);
}
function normalizeLink(link: string) {
  return link.split("#")[0].replace(/[?&](utm_[^=&]+|cmpid|ref)=[^&]*/gi, "").replace(/\/$/, "").trim().toLowerCase();
}

export function dedupe(articles: Article[], threshold = 0.75): Article[] {
  const seenLinks = new Set<string>();
  const seenTitles: Set<string>[] = [];
  return articles.filter((a) => {
    const link = normalizeLink(a.link);
    if (link && seenLinks.has(link)) return false;
    const tokens = titleTokens(a.title);
    if (seenTitles.some((t) => similarity(t, tokens) >= threshold)) return false;
    if (link) seenLinks.add(link);
    seenTitles.push(tokens);
    return true;
  });
}
