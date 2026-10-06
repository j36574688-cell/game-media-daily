import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { RSS_SOURCES, type SourceRecord } from "@/lib/sources";
import { classify, guessGame, toPlainText } from "@/lib/classify";
import { clusterCoverage, dedupe } from "@/lib/dedupe";
import type { Article, SourceStat } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel Hobby 方案可設定到 60 秒；所有 Feed 平行抓取、各自 8 秒逾時，實際約 8~10 秒。
export const maxDuration = 30;

const FEED_TIMEOUT_MS = 8000;
const PER_SOURCE_LIMIT = 20;
const TOTAL_LIMIT = 150;

function firstMatch(x: string, patterns: RegExp[]) {
  for (const re of patterns) {
    const m = x.match(re);
    if (m?.[1]) return m[1];
  }
  return "";
}

/** Atom 的 <link> 可能有多個（self / replies / enclosure），優先取 rel="alternate" 或沒有 rel 的。 */
function pickLink(entry: string): string {
  const tags = entry.match(/<link\b[^>]*>/gi) || [];
  let fallback = "";
  for (const tag of tags) {
    const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    const rel = tag.match(/\brel=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (!rel || rel === "alternate") return href;
    if (!fallback && rel !== "self" && rel !== "enclosure" && rel !== "replies") fallback = href;
  }
  const plain = toPlainText(firstMatch(entry, [/<link(?:\s[^>]*)?>([\s\S]*?)<\/link>/i]));
  if (/^https?:\/\//i.test(plain)) return plain;
  if (fallback) return fallback;
  // guid 只有在是網址、且沒有標示 isPermaLink="false" 時才當連結
  const guidTag = entry.match(/<guid\b([^>]*)>([\s\S]*?)<\/guid>/i);
  if (guidTag && !/isPermaLink=["']false["']/i.test(guidTag[1])) {
    const guid = toPlainText(guidTag[2]);
    if (/^https?:\/\//i.test(guid)) return guid;
  }
  return "";
}

function toIso(date: string): string {
  const t = Date.parse(date);
  return Number.isFinite(t) ? new Date(t).toISOString() : "";
}

function stableId(sourceId: string, title: string, link: string) {
  return sourceId + "-" + createHash("sha1").update(sourceId + "\n" + link + "\n" + title).digest("hex").slice(0, 16);
}

function parse(xml: string, source: SourceRecord): Article[] {
  // 同時支援 RSS 2.0 <item> 與 Atom <entry>
  const chunks = xml.match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi) || [];
  return chunks
    .map((x): Article => {
      const title = toPlainText(firstMatch(x, [/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/i]));
      const link = pickLink(x).trim();
      const publishedAt = toIso(
        toPlainText(
          firstMatch(x, [
            /<pubDate(?:\s[^>]*)?>([\s\S]*?)<\/pubDate>/i,
            /<published(?:\s[^>]*)?>([\s\S]*?)<\/published>/i,
            /<dc:date(?:\s[^>]*)?>([\s\S]*?)<\/dc:date>/i,
            /<updated(?:\s[^>]*)?>([\s\S]*?)<\/updated>/i,
          ])
        )
      );
      const excerpt = toPlainText(
        firstMatch(x, [
          /<description(?:\s[^>]*)?>([\s\S]*?)<\/description>/i,
          /<summary(?:\s[^>]*)?>([\s\S]*?)<\/summary>/i,
          /<content:encoded(?:\s[^>]*)?>([\s\S]*?)<\/content:encoded>/i,
          /<content(?:\s[^>]*)?>([\s\S]*?)<\/content>/i,
        ])
      ).slice(0, 280);
      return {
        id: stableId(source.id, title, link),
        title,
        link,
        source: source.name,
        sourceId: source.id,
        publishedAt,
        excerpt,
        kind: classify(title, excerpt, source.kind),
        game: guessGame(title + " " + excerpt.slice(0, 120), source.game),
        evidence: source.evidenceHint,
      };
    })
    .filter((x) => x.title && x.link);
}

async function fetchFeed(source: SourceRecord): Promise<Article[]> {
  const r = await fetch(source.feedUrl!, {
    headers: {
      accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.8",
      "user-agent": "Mozilla/5.0 (compatible; GameMediaDaily/2.1; RSS reader)",
    },
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
  });
  if (!r.ok) throw new Error("HTTP " + r.status);
  const parsed = parse(await r.text(), source).slice(0, PER_SOURCE_LIMIT);
  if (!parsed.length) throw new Error("RSS / Atom 無可解析項目");
  return parsed;
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("query") || "").trim().toLowerCase();
  const ids = (req.nextUrl.searchParams.get("sourceIds") || "").split(",").filter(Boolean);
  const feeds = ids.length ? RSS_SOURCES.filter((s) => ids.includes(s.id)) : RSS_SOURCES;

  const results = await Promise.allSettled(feeds.map(fetchFeed));

  const failedSources: string[] = [];
  const sourceStats: SourceStat[] = results.map((r, i) => {
    const s = feeds[i];
    if (r.status === "fulfilled") return { id: s.id, name: s.name, status: "ok", count: r.value.length };
    failedSources.push(s.name);
    const reason = r.reason as Error | undefined;
    const error = reason?.name === "TimeoutError" || reason?.name === "AbortError" ? "逾時" : String(reason?.message || "fetch failed");
    return { id: s.id, name: s.name, status: "error", count: 0, error };
  });

  const raw = results
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .filter((a) => !q || (a.title + " " + a.excerpt + " " + a.source).toLowerCase().includes(q));
  raw.sort((a, b) => (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0));
  const unique = dedupe(raw);
  // 不同媒體報導同一件事 → 合併成一張卡片並記錄熱度
  const clustered = clusterCoverage(unique);
  clustered.sort((a, b) => (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0));
  const articles = clustered.slice(0, TOTAL_LIMIT);

  return NextResponse.json(
    {
      articles,
      fetched: articles.length,
      duplicatesRemoved: raw.length - unique.length,
      mergedStories: unique.length - clustered.length,
      sourceCount: feeds.length,
      feedCount: feeds.length,
      successfulSources: sourceStats.filter((x) => x.status === "ok").length,
      failedSources,
      sourceStats,
      generatedAt: new Date().toISOString(),
      isDemo: false,
    },
    // Vercel CDN 快取 2 分鐘：連按「更新」不會每次都重抓 22 個 Feed
    { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } }
  );
}
