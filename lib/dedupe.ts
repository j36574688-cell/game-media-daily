import type { Article, RelatedItem } from "./types";

/**
 * 去重用的 token：英文 / 數字以單字為單位，中日文以兩字一組（bigram）。
 */
const STOPWORDS = new Set([
  "the", "a", "an", "to", "of", "and", "in", "on", "for", "is", "are", "with", "as", "at", "by", "it", "its", "from", "this", "that",
  "new", "now", "has", "have", "be", "will", "about", "after", "out", "up", "your", "you", "how", "why", "what", "here", "s",
]);
const CJK_RUN = /[぀-ヿ㐀-鿿]+/g;

// 同一個東西的不同寫法，比對前先統一
const ALIASES: Array<[RegExp, string]> = [
  [/grand theft auto/g, "gta"],
  [/playstation plus|ps plus/g, "psplus"],
  [/playstation 5/g, "ps5"],
  [/nintendo switch 2/g, "switch2"],
  [/switch 2/g, "switch2"],
  [/counter-strike 2/g, "cs2"],
  [/call of duty/g, "cod"],
  [/game pass/g, "gamepass"],
  [/’|'/g, ""],
];

/** 簡易字根：delays / delayed / delaying → delay */
function stem(w: string): string {
  if (w.length <= 4 || /^\d/.test(w)) return w;
  for (const suf of ["ing", "ed", "es", "s"]) {
    if (w.endsWith(suf) && w.length - suf.length >= 4) return w.slice(0, -suf.length);
  }
  return w;
}

export function titleTokens(title: string): Set<string> {
  let lower = title.toLowerCase();
  for (const [re, to] of ALIASES) lower = lower.replace(re, to);
  const tokens = new Set<string>();
  for (const w of lower.match(/[a-z0-9]+/g) || []) if (!STOPWORDS.has(w)) tokens.add(stem(w));
  for (const run of lower.match(CJK_RUN) || []) {
    if (run.length === 1) tokens.add(run);
    for (let i = 0; i < run.length - 1; i++) tokens.add(run.slice(i, i + 2));
  }
  return tokens;
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (a.size < 3 || b.size < 3) return 0; // 太短的標題不做模糊比對，避免誤刪
  let hit = 0;
  for (const t of a) if (b.has(t)) hit++;
  return hit / Math.max(a.size, b.size);
}

export function normalizeLink(link: string) {
  return link.split("#")[0].replace(/[?&](utm_[^=&]+|cmpid|ref)=[^&]*/gi, "").replace(/\/$/, "").trim().toLowerCase();
}

/** 第一步：刪掉真正重複的（同連結，或標題幾乎一模一樣）。 */
export function dedupe(articles: Article[], threshold = 0.75): Article[] {
  const seenLinks = new Set<string>();
  const seenTitles: Set<string>[] = [];
  return articles.filter((a) => {
    const link = normalizeLink(a.link);
    if (link && seenLinks.has(link)) return false;
    const tokens = titleTokens(a.title);
    if (seenTitles.some((t) => jaccard(t, tokens) >= threshold)) return false;
    if (link) seenLinks.add(link);
    seenTitles.push(tokens);
    return true;
  });
}

const EVIDENCE_RANK: Record<string, number> = { E5: 5, E4: 4, E3: 3, E2: 2, E1: 1 };
const DAY = 86400000;

/**
 * 第二步：把「不同媒體報導同一件事」合併成一張卡片，計算熱度。
 * 用 IDF 加權：出現在很多標題的字（apex、legends、update）權重低，
 * 罕見的字（delay、november、wingman）權重高，避免「Apex 第 27 季更新」和「Apex 第 27 季預告」被誤併。
 */
export function clusterCoverage(articles: Article[], threshold = 0.42, windowDays = 3): Article[] {
  const tokens = articles.map((a) => titleTokens(a.title));
  const df = new Map<string, number>();
  for (const set of tokens) for (const t of set) df.set(t, (df.get(t) || 0) + 1);
  const n = Math.max(articles.length, 1);
  const idf = (t: string) => Math.log(1 + n / (df.get(t) || 1));

  const weighted = (a: Set<string>, b: Set<string>) => {
    if (a.size < 3 || b.size < 3) return 0;
    let inter = 0;
    let union = 0;
    for (const t of a) {
      const w = idf(t);
      if (b.has(t)) inter += w;
      union += w;
    }
    for (const t of b) if (!a.has(t)) union += idf(t);
    return union ? inter / union : 0;
  };

  const time = (a: Article) => Date.parse(a.publishedAt) || 0;
  const parent = articles.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));

  for (let i = 0; i < articles.length; i++) {
    for (let j = i + 1; j < articles.length; j++) {
      if (articles[i].sourceId === articles[j].sourceId) continue; // 同一家媒體的不同文章不算「多家報導」
      const ti = time(articles[i]);
      const tj = time(articles[j]);
      if (ti && tj && Math.abs(ti - tj) > windowDays * DAY) continue;
      if (weighted(tokens[i], tokens[j]) >= threshold) parent[find(j)] = find(i);
    }
  }

  const groups = new Map<number, number[]>();
  articles.forEach((_, i) => {
    const root = find(i);
    groups.set(root, [...(groups.get(root) || []), i]);
  });

  const out: Article[] = [];
  for (const idxs of groups.values()) {
    // 代表卡片：證據等級最高者優先，其次最新
    const sorted = [...idxs].sort(
      (x, y) => (EVIDENCE_RANK[articles[y].evidence] || 0) - (EVIDENCE_RANK[articles[x].evidence] || 0) || time(articles[y]) - time(articles[x])
    );
    const lead = articles[sorted[0]];
    const related: RelatedItem[] = sorted.slice(1).map((k) => ({
      source: articles[k].source,
      sourceId: articles[k].sourceId,
      title: articles[k].title,
      link: articles[k].link,
      publishedAt: articles[k].publishedAt,
      evidence: articles[k].evidence,
      lang: articles[k].lang,
    }));
    const sources = new Set(idxs.map((k) => articles[k].sourceId));
    const newest = Math.max(...idxs.map((k) => time(articles[k])));
    const known = idxs.map((k) => time(articles[k])).filter(Boolean);
    const oldest = known.length ? Math.min(...known) : 0;
    out.push({
      ...lead,
      // 卡片時間用整個事件最新一則的時間，排序時才不會被舊的代表文章拖到後面
      publishedAt: newest ? new Date(newest).toISOString() : lead.publishedAt,
      coverage: sources.size,
      firstSeenAt: oldest ? new Date(oldest).toISOString() : lead.publishedAt,
      related,
    });
  }
  return out;
}
