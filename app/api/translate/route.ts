import { NextRequest, NextResponse } from "next/server";

const dict: Record<string, string> = {
  update: "更新", patch: "補丁", season: "賽季", release: "發售", delayed: "延期", confirmed: "已確認",
  rumor: "傳聞", rumour: "傳聞", leak: "爆料", players: "玩家", player: "玩家", developer: "開發商",
  publisher: "發行商", launch: "推出", free: "免費", price: "價格", sale: "折扣", server: "伺服器",
  performance: "效能", review: "評測", weapon: "武器", weapons: "武器", damage: "傷害", buff: "強化",
  nerf: "削弱", ability: "技能", abilities: "技能", cooldown: "冷卻時間", ranked: "排位",
  unconfirmed: "未經證實", datamined: "資料探勘", hotfix: "熱修正", characters: "角色", character: "角色",
  loadout: "配裝"
};

function localTranslate(s: string, mode: string) {
  let out = s;
  for (const [a, b] of Object.entries(dict)) {
    out = out.replace(new RegExp(`\\b${a}\\b`, "gi"), b);
  }
  if (mode === "game") {
    out = out.replace(/ability/gi, "技能").replace(/abilities/gi, "技能").replace(/weapon/gi, "武器");
  }
  return out;
}

async function googleTranslate(text: string, target: string) {
  if (!text.trim()) return "";
  const tl = target === "zh-TW" ? "zh-TW" : target;
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text)}`;
  const r = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
  if (!r.ok) throw new Error(`translate ${r.status}`);
  const data: any = await r.json();
  const out = Array.isArray(data?.[0]) ? data[0].map((x: any) => String(x?.[0] || "")).join("") : "";
  return out || text;
}

async function tryExternalAI(body: any) {
  const key = process.env.OPENAI_API_KEY;
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  if (!key) return null;
  try {
    const prompt = `你是台灣遊戲新聞編譯器。把 JSON 陣列每筆 title 與 excerpt 翻譯成 ${body.targetLanguage || "zh-TW"}。保留人物、遊戲、公司、平台、版本、日期、數字與不確定語氣；遊戲術語使用台灣常見譯法。mode=${body.mode || "news"}。只回傳 JSON：{"translations":[{"id":"...","title":"...","excerpt":"..."}]}`;
    const r = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: [{ role: "system", content: prompt }, { role: "user", content: JSON.stringify(body.articles || []) }], temperature: 0.1 })
    });
    if (!r.ok) return null;
    const data = await r.json();
    const raw = String(data.choices?.[0]?.message?.content || "").replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.translations) ? parsed : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const targetLanguage = body.targetLanguage || "zh-TW";
    const mode = body.mode || "news";
    const articles = Array.isArray(body.articles) ? body.articles.slice(0, 20) : [];
    if (!articles.length) return NextResponse.json({ translations: [], model: "empty" });

    const external = await tryExternalAI(body);
    if (external?.translations?.length) {
      return NextResponse.json({ translations: external.translations, model: process.env.OPENAI_MODEL || "external-ai" });
    }

    const translations = await Promise.all(articles.map(async (a: any) => {
      const title = String(a.title || "");
      const excerpt = String(a.excerpt || "");
      try {
        const [t, e] = await Promise.all([googleTranslate(title, targetLanguage), googleTranslate(excerpt, targetLanguage)]);
        return { id: String(a.id), title: t, excerpt: e };
      } catch {
        return {
          id: String(a.id),
          title: targetLanguage === "zh-TW" ? localTranslate(title, mode) : title,
          excerpt: targetLanguage === "zh-TW" ? localTranslate(excerpt, mode) : excerpt
        };
      }
    }));

    return NextResponse.json({ translations, model: "google-translate-fallback" });
  } catch {
    return NextResponse.json({ error: "翻譯服務失敗" }, { status: 500 });
  }
}
