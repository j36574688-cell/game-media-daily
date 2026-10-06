import { NextRequest, NextResponse } from "next/server";
import { buildThreadPosts, THREADS_LIMIT, type DraftArticle } from "@/lib/threads";
import type { DraftSettings } from "@/lib/types";

// 前端已直接用 lib/threads.ts 產生草稿；這支 API 保留給外部工具（例如捷徑、排程）使用，邏輯完全相同。
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const articles: DraftArticle[] = (Array.isArray(b.articles) ? b.articles.slice(0, 8) : []).map((a: Record<string, unknown>) => ({
      title: String(a.titleZh || a.title || ""),
      excerpt: String(a.excerptZh || a.excerpt || ""),
      source: String(a.source || ""),
      link: String(a.link || ""),
      game: String(a.game || ""),
    }));
    const settings: DraftSettings = {
      style: ["news", "casual", "analysis", "data"].includes(b.style) ? b.style : "news",
      format: b.format === "thread" ? "thread" : "single",
      focus: ["headline", "balanced", "body"].includes(b.focus) ? b.focus : "balanced",
      hashtags: b.hashtags !== false,
    };
    const posts = buildThreadPosts(articles, settings, String(b.myView || ""));
    return NextResponse.json({ posts, model: "local-draft", limit: THREADS_LIMIT });
  } catch {
    return NextResponse.json({ error: "Threads 草稿失敗" }, { status: 400 });
  }
}
