// Threads 草稿產生器（前端與 /api/threads 共用）。
import { charLength, splitUnder } from "./classify";
import type { DraftSettings } from "./types";

export const THREADS_LIMIT = 500;

export type DraftArticle = {
  title: string;
  excerpt: string;
  source: string;
  link: string;
  game?: string;
};

const PREFIX: Record<DraftSettings["style"], string> = {
  news: "📰 最新消息",
  casual: "🎮 玩家速報",
  analysis: "🔎 觀察",
  data: "📊 數據筆記",
};

function firstSentence(text: string, max = 90) {
  const s = (text.match(/^[^。！？.!?]+[。！？.!?]?/) || [text])[0].trim();
  return charLength(s) > max ? Array.from(s).slice(0, max - 1).join("") + "…" : s;
}

/** 依「素材比例」組合本文。 */
function articleBody(a: DraftArticle, settings: DraftSettings) {
  const title = a.title.trim();
  const excerpt = a.excerpt.trim();
  const prefix = PREFIX[settings.style];
  if (settings.focus === "headline") return `${prefix}｜${title}` + (excerpt ? `\n\n${firstSentence(excerpt)}` : "");
  if (settings.focus === "body") return `${prefix}\n\n${excerpt || title}` + (excerpt ? `\n\n（${title}）` : "");
  return `${prefix}｜${title}` + (excerpt ? `\n\n${excerpt}` : "");
}

/** Threads 一則貼文只會把一個 hashtag 當成主題標籤，所以只放一個：辨識得出的遊戲名稱。 */
function hashtagFor(a: DraftArticle) {
  const tag = (a.game || "").replace(/[^\p{L}\p{N}]+/gu, "");
  return tag ? `#${tag}` : "";
}

function footerFor(a: DraftArticle) {
  return `來源：${a.source || "未知來源"}\n${a.link}`;
}

/** 把一篇文章拆成多則，來源與連結只放在最後一則，避免每則重複佔字數。 */
function articlePosts(a: DraftArticle, settings: DraftSettings, extra: string, limit: number): string[] {
  // 「我的看法」太長時獨立成一則，不跟來源擠在一起
  if (extra && charLength(extra) > limit / 2) return [...articlePosts(a, settings, "", limit), ...splitUnder(extra, limit)];
  const tag = settings.hashtags ? hashtagFor(a) : "";
  const tail = [extra, footerFor(a), tag].filter(Boolean).join("\n\n");
  const body = articleBody(a, settings);
  const room = limit - charLength(tail) - 2;
  if (charLength(body) <= room) return [body + "\n\n" + tail];
  const pieces = splitUnder(body, limit);
  const last = pieces.pop() || "";
  if (charLength(last) <= room) return [...pieces, last + "\n\n" + tail];
  return [...pieces, ...splitUnder(last, limit), tail];
}

/**
 * single：每篇新聞各自一則獨立貼文（「我的看法」附在每則後面）。
 * thread：所有新聞串成一串，自動加上 (1/N) 編號，「我的看法」作為最後一則。
 */
export function buildThreadPosts(articles: DraftArticle[], settings: DraftSettings, myView = ""): string[] {
  const view = myView.trim() ? `💬 我的看法：${myView.trim()}` : "";
  if (settings.format === "single") return articles.flatMap((a) => articlePosts(a, settings, view, THREADS_LIMIT));

  // 預留「\n\n(12/12)」編號的字數
  const limit = THREADS_LIMIT - 10;
  const posts = articles.flatMap((a) => articlePosts(a, settings, "", limit));
  if (view) posts.push(...splitUnder(view, limit));
  if (posts.length <= 1) return posts;
  return posts.map((p, i) => `${p}\n\n(${i + 1}/${posts.length})`);
}
