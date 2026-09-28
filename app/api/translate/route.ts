import { NextRequest, NextResponse } from "next/server";

const dict: Record<string, string> = {
  update: "更新", patch: "補丁", season: "賽季", release: "發售", delayed: "延期", confirmed: "已確認",
  rumor: "傳聞", rumour: "傳聞", leak: "爆料", players: "玩家", player: "玩家", developer: "開發商",
  publisher: "發行商", launch: "推出", free: "免費", price: "價格", sale: "折扣", server: "伺服器",
  performance: "效能", review: "評測", weapon: "武器", weapons: "武器", damage: "傷害", buff: "強化",
  nerf: "削弱", ability: "技能", abilities: "技能", cooldown: "冷卻時間", ranked: "排位",
  unconfirmed: "未經證實", datamined: "資料探勘", hotfix: "熱修正", characters: "角色", character: "角色",
  loadout: "配裝", gameplay: "遊玩內容", matchmaking: "配對", crossplay: "跨平台遊玩",
  battlepass: "戰鬥通行證", battle: "戰鬥", loot: "戰利品", respawn: "重生", map: "地圖",
  patchnotes: "更新說明", balance: "平衡性", balancing: "平衡調整", rankedmode: "排位模式"
};

function applyGlossary(s: string) {
  let out = s;
  for (const [a, b] of Object.entries(dict)) {
    out = out.replace(new RegExp(`\\b${a}\\b`, "gi"), b);
  }
  return out;
}

function applyMode(text: string, mode: string) {
  let out = text.trim();
  if (!out) return "";
  if (mode === "literal") return out;

  out = applyGlossary(out);

  if (mode === "game") {
    // 台灣玩家常用遊戲術語與用字
    out = out
      .replace(/調整平衡/g, "平衡調整")
      .replace(/能力/g, "技能")
      .replace(/武器的傷害/g, "武器傷害")
      .replace(/角色能力/g, "角色技能")
      .replace(/比賽/g, "對戰")
      .replace(/遊戲模式/g, "模式")
      .replace(/玩家們/g, "玩家")
      .replace(/伺服器器/g, "伺服器");
    return out;
  }

  // 新聞口吻：正式、精簡，避免口語詞。
  return out
    .replace(/大家/g, "玩家")
    .replace(/我們/g, "團隊")
    .replace(/你們/g, "玩家")
    .replace(/出現了/g, "出現")
    .replace(/推出了一項/g, "推出一項")
    .replace(/宣布了/g, "宣布")
    .replace(/表示說/g, "表示")
    .replace(/可以看到/g, "可見")
    .replace(/很多/g, "大量")
    .replace(/超級/g, "大幅")
    .replace(/很快/g, "迅速")
    .replace(/不會再/g, "將不再");
}

async function googleTranslate(text: string, target: string, mode: string) {
  if (!text.trim()) return "";
  const tl = target === "zh-TW" ? "zh-TW" : target;
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text)}`;
  const r = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
  if (!r.ok) throw new Error(`translate ${r.status}`);
  const data: any = await r.json();
  const translated = Array.isArray(data?.[0]) ? data[0].map((x: any) => String(x?.[0] || "")).join("") : "";
  if (!translated) return text;
  return target === "zh-TW" ? applyMode(translated, mode) : translated;
}

async function tryExternalAI(body: any) {
  const key = process.env.OPENAI_API_KEY;
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  if (!key) return null;
  try {
    const mode = body.mode || "news";
    const style = mode === "news"
      ? "台灣遊戲新聞媒體正式口吻：精簡、客觀、像新聞標題與導語。"
      : mode === "game"
        ? "台灣遊戲玩家口吻：使用台灣玩家常用遊戲術語，例如補丁、熱修正、削弱、強化、技能、配裝、排位、伺服器。保留遊戲名稱與專有名詞。"
        : "貼近原文：盡量保持原句結構、語氣與資訊，不自行改寫或補充。";
    const prompt = `你是台灣遊戲新聞編譯器。${style} 把 JSON 陣列每筆 title 與 excerpt 翻譯成 ${body.targetLanguage || "zh-TW"}。保留人物、遊戲、公司、平台、版本、日期、數字與不確定語氣。只回傳 JSON：{"translations":[{"id":"...","title":"...","excerpt":"..."}]}`;
    const r = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: JSON.stringify(body.articles || []) }
        ],
        temperature: 0.1
      })
    });
    if (!r.ok) return null;
    const data = await r.json();
    const raw = String(data.choices?.[0]?.message?.content || "")
      .replace(/^```json\s*/i, "")
      .replace(/```$/i, "")
      .trim();
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
    if (!articles.length) return NextResponse.json({ translations: [], model: "empty", mode });

    const external = await tryExternalAI(body);
    if (external?.translations?.length) {
      return NextResponse.json({
        translations: external.translations,
        model: process.env.OPENAI_MODEL || "external-ai",
        mode
      });
    }

    const translations = await Promise.all(articles.map(async (a: any) => {
      const title = String(a.title || "");
      const excerpt = String(a.excerpt || "");
      try {
        const [t, e] = await Promise.all([
          googleTranslate(title, targetLanguage, mode),
          googleTranslate(excerpt, targetLanguage, mode)
        ]);
        return { id: String(a.id), title: t, excerpt: e };
      } catch {
        return {
          id: String(a.id),
          title: targetLanguage === "zh-TW" ? applyMode(localTranslate(title), mode) : title,
          excerpt: targetLanguage === "zh-TW" ? applyMode(localTranslate(excerpt), mode) : excerpt
        };
      }
    }));

    return NextResponse.json({ translations, model: "google-translate-fallback", mode });
  } catch {
    return NextResponse.json({ error: "翻譯服務失敗" }, { status: 500 });
  }
}

function localTranslate(s: string) {
  return applyGlossary(s);
}
