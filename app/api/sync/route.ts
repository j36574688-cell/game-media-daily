import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

// 跨裝置同步：設定存在 Upstash Redis（Vercel → Storage 免費建立）。
// 用「同步碼」當鑰匙：伺服器只存同步碼的雜湊，不存同步碼本身。
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 512 * 1024;
const ONE_YEAR = 60 * 60 * 24 * 365;

function redisConfig() {
  // Vercel Marketplace 建立的 Upstash 用 KV_*；直接在 Upstash 建立的用 UPSTASH_*
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function redis(cmd: Array<string | number>): Promise<unknown> {
  const cfg = redisConfig();
  if (!cfg) throw new Error("同步儲存空間尚未設定");
  const r = await fetch(cfg.url, {
    method: "POST",
    headers: { authorization: "Bearer " + cfg.token, "content-type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d?.error) throw new Error("同步服務錯誤：" + String(d?.error || "HTTP " + r.status));
  return d?.result;
}

/** 同步碼：16~64 個英數字或連字號。太短容易被猜到。 */
function keyFor(code: unknown): string | null {
  const c = String(code || "").trim();
  if (!/^[A-Za-z0-9-]{16,64}$/.test(c)) return null;
  return "gmd:sync:" + createHash("sha256").update(c).digest("hex");
}

export async function POST(req: NextRequest) {
  let body: { action?: unknown; code?: unknown; data?: unknown; updatedAt?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }
  const action = String(body.action || "");
  if (action === "status") return NextResponse.json({ available: Boolean(redisConfig()) });
  if (!redisConfig()) return NextResponse.json({ error: "同步儲存空間尚未設定", available: false }, { status: 503 });

  const key = keyFor(body.code);
  if (!key) return NextResponse.json({ error: "同步碼格式不正確（需 16 個字以上的英數字）" }, { status: 400 });

  try {
    if (action === "pull") {
      const raw = await redis(["GET", key]);
      if (typeof raw !== "string") return NextResponse.json({ data: null, updatedAt: 0 });
      const saved = JSON.parse(raw) as { data: unknown; updatedAt: number };
      return NextResponse.json({ data: saved.data ?? null, updatedAt: Number(saved.updatedAt) || 0 });
    }
    if (action === "push") {
      if (!body.data || typeof body.data !== "object") return NextResponse.json({ error: "沒有可同步的資料" }, { status: 400 });
      const updatedAt = Number(body.updatedAt) || Date.now();
      const payload = JSON.stringify({ data: body.data, updatedAt });
      if (payload.length > MAX_BYTES) return NextResponse.json({ error: "資料太大（收藏太多？），無法同步" }, { status: 413 });
      await redis(["SET", key, payload, "EX", ONE_YEAR]);
      return NextResponse.json({ ok: true, updatedAt });
    }
    return NextResponse.json({ error: "未知的動作" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "同步失敗" }, { status: 502 });
  }
}
