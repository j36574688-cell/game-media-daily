import { NextRequest, NextResponse } from "next/server";

// 免費翻譯版：不使用 OpenAI API。
// 主要翻譯引擎使用 Google Translate 的公開翻譯端點，
// 再搭配遊戲術語表與不同語氣後處理，讓「新聞／遊戲／貼近原文」有實際差異。

const GLOSSARY: Array<[string, string]> = [
  ["patch notes", "更新說明"], ["patchnote", "更新說明"], ["patch notes", "更新說明"],
  ["hotfix", "熱修正"], ["live service", "長期營運"], ["live-service", "長期營運"],
  ["battle pass", "戰鬥通行證"], ["battlepass", "戰鬥通行證"], ["cross-play", "跨平台遊玩"],
  ["crossplay", "跨平台遊玩"], ["matchmaking", "配對"], ["ranked", "排位"],
  ["ranked mode", "排位模式"], ["loadout", "配裝"], ["respawn", "重生"],
  ["datamined", "資料探勘"], ["data mined", "資料探勘"], ["unconfirmed", "未經證實"],
  ["rumor", "傳聞"], ["rumour", "傳聞"], ["reportedly", "據報"], ["allegedly", "據稱"],
  ["leak", "爆料"], ["leaked", "流出"], ["insider", "業內消息人士"],
  ["buff", "強化"], ["nerf", "削弱"], ["damage", "傷害"], ["ability", "技能"],
  ["abilities", "技能"], ["cooldown", "冷卻時間"], ["weapon", "武器"], ["weapons", "武器"],
  ["character", "角色"], ["characters", "角色"], ["developer", "開發商"], ["publisher", "發行商"],
  ["player", "玩家"], ["players", "玩家"], ["server", "伺服器"], ["servers", "伺服器"],
  ["performance", "效能"], ["frame rate", "幀率"], ["frame-rate", "幀率"], ["resolution", "解析度"],
  ["update", "更新"], ["updates", "更新"], ["release", "發售"], ["released", "已推出"],
  ["launch", "推出"], ["launched", "已推出"], ["delayed", "延期"], ["delay", "延期"],
  ["confirmed", "已確認"], ["confirmation", "確認"], ["price", "價格"], ["sale", "折扣"],
  ["review", "評測"], ["reviews", "評測"], ["gameplay", "遊玩內容"], ["map", "地圖"],
  ["balance", "平衡性"], ["balancing", "平衡調整"]
];

// 常見台灣遊戲名稱／平台／服務，盡量保留原樣，避免被翻譯引擎亂改。
const PROPER_TERMS = [
  "Apex Legends", "Counter-Strike 2", "Call of Duty", "Grand Theft Auto", "GTA 6", "GTA VI",
  "Monster Hunter", "Monster Hunter Wilds", "Resident Evil", "Final Fantasy", "Helldivers 2",
  "Fortnite", "Overwatch", "VALORANT", "League of Legends", "Minecraft", "Roblox",
  "Nintendo Switch", "Switch 2", "PlayStation", "PS5", "PS5 Pro", "Xbox", "Xbox Series X",
  "Xbox Series S", "Steam", "Epic Games Store", "Epic Games", "Battle.net", "EA Sports",
  "Ubisoft", "Electronic Arts", "EA", "Capcom", "Square Enix", "Sony", "Microsoft",
  "Kojima Productions", "FromSoftware", "Bandai Namco", "Take-Two Interactive", "Valve",
  "Rockstar Games", "Respawn Entertainment", "Activision", "Infinity Ward", "Treyarch"
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyGlossary(text: string) {
  let out = text;
  // 先長詞後短詞，避免 "patch notes" 被 "patch" 搶先替換。
  const sorted = [...GLOSSARY].sort((a, b) => b[0].length - a[0].length);
  for (const [en, zh] of sorted) {
    out = out.replace(new RegExp(`\\b${escapeRegExp(en)}\\b`, "gi"), zh);
  }
  return out;
}

function applyProperTermProtection(text: string) {
  let out = text;
  for (const term of PROPER_TERMS) {
    const escaped = escapeRegExp(term);
    // 修正翻譯結果中常見的名稱變形，但不強制大小寫。
    if (new RegExp(escaped, "i").test(out)) {
      out = out.replace(new RegExp(escaped, "gi"), term);
    }
  }
  return out;
}

function cleanPunctuation(text: string) {
  return text
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([，。！？；：、])/g, "$1")
    .replace(/([，。！？；：、]){2,}/g, "$1")
    .trim();
}

function applyMode(text: string, mode: string) {
  let out = cleanPunctuation(applyProperTermProtection(text));
  if (!out) return "";
  if (mode === "literal") return out;

  out = applyGlossary(out);

  if (mode === "game") {
    // 台灣玩家常見用法：偏口語，但不加入原文沒有的資訊。
    return cleanPunctuation(
      out
        .replace(/平衡性調整/g, "平衡調整")
        .replace(/能力/g, "技能")
        .replace(/角色能力/g, "角色技能")
        .replace(/武器的傷害/g, "武器傷害")
        .replace(/遊戲模式/g, "模式")
        .replace(/玩家們/g, "玩家")
        .replace(/使用者/g, "玩家")
        .replace(/對手/g, "敵方玩家")
        .replace(/削弱了/g, "削弱")
        .replace(/強化了/g, "強化")
        .replace(/發布/g, "推出")
    );
  }

  // 新聞口吻：正式、精簡，避免過度口語化。
  return cleanPunctuation(
    out
      .replace(/大家/g, "玩家")
      .replace(/我們/g, "團隊")
      .replace(/你們/g, "玩家")
      .replace(/超級/g, "大幅")
      .replace(/很多/g, "大量")
      .replace(/很快/g, "迅速")
      .replace(/出現了/g, "出現")
      .replace(/宣布了/g, "宣布")
      .replace(/表示說/g, "表示")
      .replace(/可以看到/g, "可見")
      .replace(/不會再/g, "將不再")
  );
}

function protectUrls(text: string) {
  const saved: string[] = [];
  const protectedText = text.replace(/https?:\/\/[^\s]+/gi, (url) => {
    const token = `GMDURL${saved.length}TOKEN`;
    saved.push(url);
    return token;
  });
  return { protectedText, restore(value: string) {
    let out = value;
    saved.forEach((url, i) => {
      out = out.replace(new RegExp(`GMDURL${i}TOKEN`, "gi"), url);
    });
    return out;
  }};
}

function splitText(text: string, max = 700) {
  const clean = text.trim();
  if (clean.length <= max) return [clean];
  const sentences = clean.match(/[^.!?。！？！？]+[.!?。！？！？]*/g) || [clean];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if ((current + sentence).length > max && current) {
      chunks.push(current);
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current) chunks.push(current);
  return chunks.length ? chunks : [clean];
}

async function googleTranslateChunk(text: string, target: string) {
  if (!text.trim()) return "";
  const tl = target === "zh-TW" ? "zh-TW" : target;
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text)}`;
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`translate ${response.status}`);
  const data: any = await response.json();
  const translated = Array.isArray(data?.[0])
    ? data[0].map((x: any) => String(x?.[0] || "")).join("")
    : "";
  return translated || text;
}

async function googleTranslate(text: string, target: string, mode: string) {
  if (!text.trim()) return "";
  const { protectedText, restore } = protectUrls(text);
  const chunks = splitText(protectedText);
  const translatedChunks = [] as string[];
  for (const chunk of chunks) {
    translatedChunks.push(await googleTranslateChunk(chunk, target));
  }
  let translated = restore(translatedChunks.join(""));
  if (target === "zh-TW") translated = applyMode(translated, mode);
  return cleanPunctuation(translated);
}

async function localFallback(text: string, target: string, mode: string) {
  if (!text.trim()) return "";
  if (target === "zh-TW") return applyMode(text, mode);
  return text;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const targetLanguage = body.targetLanguage || "zh-TW";
    const mode = body.mode || "news";
    const articles = Array.isArray(body.articles) ? body.articles.slice(0, 20) : [];

    if (!articles.length) {
      return NextResponse.json({ translations: [], model: "free-google-translate", mode });
    }

    const translations = await Promise.all(
      articles.map(async (article: any) => {
        const id = String(article.id);
        const title = String(article.title || "");
        const excerpt = String(article.excerpt || "");

        try {
          const [translatedTitle, translatedExcerpt] = await Promise.all([
            googleTranslate(title, targetLanguage, mode),
            googleTranslate(excerpt, targetLanguage, mode)
          ]);
          return {
            id,
            title: translatedTitle,
            excerpt: translatedExcerpt
          };
        } catch {
          return {
            id,
            title: await localFallback(title, targetLanguage, mode),
            excerpt: await localFallback(excerpt, targetLanguage, mode)
          };
        }
      })
    );

    return NextResponse.json({
      translations,
      model: "free-google-translate",
      mode
    });
  } catch {
    return NextResponse.json({ error: "翻譯服務失敗" }, { status: 500 });
  }
}
