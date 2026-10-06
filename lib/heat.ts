// 熱度分數：基礎分 + 各種加成，每一項都列出來，讓你知道分數怎麼來的。
// 每條規則都可以在設定頁開關、改分數（存在 heatWeights）。
// 純函式，前端計算（新鮮度與個人化加成會隨時間、隨設定改變）。
import type { Article } from "./types";

export type HeatPart = { id: string; label: string; value: number };
export type Heat = { score: number; parts: HeatPart[] };
export type HeatContext = { now: number; watched: boolean; saved: boolean };
/** 使用者自訂：false = 關閉；數字 = 改成這個分數（負數代表扣分） */
export type HeatWeights = Record<string, number | false>;

type Rule = {
  id: string;
  group: "傳播" | "內容" | "時效" | "個人" | "扣分";
  name: string;
  /** 設定頁的說明 */
  hint: string;
  /** 預設分數；scaled 規則代表「每單位」的分數 */
  weight: number;
  /** 回傳 null 代表不適用；回傳 { label, units } 時分數 = weight × units */
  match: (a: Article, ctx: HeatContext) => { label: string; units?: number } | null;
};

const HOUR = 3600000;
const LANG_NAME: Record<string, string> = { en: "英文", zh: "中文", ja: "日文" };

const text = (a: Article) => (a.title + " " + a.excerpt).toLowerCase();
const has = (a: Article, re: RegExp) => re.test(a.title + " " + a.excerpt);

/** 大作 IP：這些名字一出現，討論度通常高很多 */
const BIG_IP = /\b(gta|grand theft auto|pok[eé]mon|zelda|mario|call of duty|elden ring|monster hunter|final fantasy|resident evil|the witcher|cyberpunk|fallout|elder scrolls|skyrim|god of war|halo|minecraft|fortnite|switch 2|ps6|half-life|silksong)\b|寶可夢|薩爾達|瑪利歐|魔物獵人|艾爾登|太空戰士|惡靈古堡|ポケモン|ゼルダ|マリオ|モンハン/i;
const SHOWCASE = /\b(nintendo direct|state of play|xbox (games )?showcase|the game awards|summer game fest|gamescom|tokyo game show|tgs|evo)\b|直面會|發表會|ニンテンドーダイレクト|東京ゲームショウ/i;
const REVEAL = /\b(announce[ds]?|announcement|reveal(ed|s)?|unveil(ed|s)?|world premiere|first look|teaser|trailer)\b|首度公開|正式公開|預告|發表|発表|公開/i;
const FREE = /\b(free to keep|free this week|free for a limited time|free weekend|free-to-play launch|giveaway|100% off)\b|限時免費|免費領取|限免|無料配布|基本プレイ無料/i;
const CONTROVERSY = /\b(controvers(y|ial)|backlash|review[- ]bomb(ed|ing)?|outrage|boycott|lawsuit|sued|apolog(y|ize|ises|izes)|refund|layoffs?)\b|爭議|炎上|抵制|道歉|退款|訴訟|批評|炎上/i;
const NUMBERS = /\b\d[\d,.]*\s*(million|billion|k|m)\b|\b\d+(\.\d+)?%|\$\s?\d|\b\d[\d,]{4,}\b|萬|億|銷量|\d+\s*(萬|億|%)/i;
const SOON = /\b(today|tonight|tomorrow|this week|next week|out now|available now|live now|launches today)\b|今天|今日|明天|本週|下週|即日起|本日|明日/i;
const TAIWAN = /台灣|臺灣|繁體中文|繁中|中文版|港澳|亞洲版|taiwan|traditional chinese/i;
const LOW_VALUE = /\b(guide|how to|walkthrough|best .* (to|for)|tier list|where to find|all .* locations|wordle|deals? roundup|ranked:?|\d+ (best|things|games))\b|攻略|懶人包|教學|全收集|位置一覽/i;

export const HEAT_RULES: Rule[] = [
  // ---------- 傳播
  { id: "coverage", group: "傳播", name: "多家媒體報導", hint: "每多一家不同媒體報導（最多算 4 家）", weight: 15,
    match: (a) => ((a.coverage || 1) > 1 ? { label: `${a.coverage} 家媒體報導`, units: Math.min(4, (a.coverage || 1) - 1) } : null) },
  { id: "crossLang", group: "傳播", name: "跨語系報導", hint: "英文、中文、日文媒體都在報，每多一種語言", weight: 10,
    match: (a) => {
      const langs = new Set([a.lang || "en", ...(a.related || []).map((r) => r.lang || "en")]);
      return langs.size > 1 ? { label: `跨 ${langs.size} 語系（${[...langs].map((l) => LANG_NAME[l] || l).join("、")}）`, units: langs.size - 1 } : null;
    } },
  { id: "velocity", group: "傳播", name: "快速擴散", hint: "最早一則到現在 6 小時內就有 3 家以上跟進", weight: 10,
    match: (a) => {
      const first = Date.parse(a.firstSeenAt || a.publishedAt) || 0;
      const last = Date.parse(a.publishedAt) || 0;
      return (a.coverage || 1) >= 3 && first && last && last - first <= 6 * HOUR ? { label: "6 小時內快速擴散" } : null;
    } },
  { id: "official", group: "傳播", name: "官方一手消息", hint: "有官方來源（E5）參與報導", weight: 10,
    match: (a) => ([a.evidence, ...(a.related || []).map((r) => r.evidence || "")].includes("E5") ? { label: "官方一手消息" } : null) },

  // ---------- 內容
  { id: "bigIp", group: "內容", name: "大作 IP", hint: "GTA、寶可夢、薩爾達、魔物獵人、Switch 2 等話題性最高的作品", weight: 10,
    match: (a) => (BIG_IP.test(text(a)) ? { label: "大作 IP" } : null) },
  { id: "showcase", group: "內容", name: "大型發表會", hint: "Nintendo Direct、State of Play、TGA、Gamescom、TGS 等", weight: 10,
    match: (a) => (has(a, SHOWCASE) ? { label: "大型發表會" } : null) },
  { id: "reveal", group: "內容", name: "新作公開 / 預告", hint: "首度公開、正式發表、預告片", weight: 8,
    match: (a) => (has(a, REVEAL) ? { label: "新作公開 / 預告" } : null) },
  { id: "kindHot", group: "內容", name: "高討論類型", hint: "爆料、延期", weight: 10,
    match: (a) => (a.kind === "爆料" || a.kind === "延期" ? { label: `類型：${a.kind}` } : null) },
  { id: "kindMid", group: "內容", name: "重大類型", hint: "發售、收購 / 投資、裁員 / 勞動、官方公告", weight: 7,
    match: (a) => (["發售", "收購 / 投資", "裁員 / 勞動", "官方公告"].includes(a.kind) ? { label: `類型：${a.kind}` } : null) },
  { id: "kindLow", group: "內容", name: "一般類型", hint: "版本更新、價格、硬體、電競、數據報導", weight: 4,
    match: (a) => (["版本更新", "價格 / Deals", "硬體 / 平台", "電競", "數據報導"].includes(a.kind) ? { label: `類型：${a.kind}` } : null) },
  { id: "free", group: "內容", name: "免費好康", hint: "限時免費、免費領取（最容易被轉發）", weight: 8,
    match: (a) => (has(a, FREE) ? { label: "免費好康" } : null) },
  { id: "controversy", group: "內容", name: "爭議話題", hint: "爭議、炎上、抵制、道歉、退款、訴訟", weight: 8,
    match: (a) => (has(a, CONTROVERSY) ? { label: "爭議話題" } : null) },
  { id: "numbers", group: "內容", name: "有具體數字", hint: "銷量、百分比、價格等數字（適合做數據貼文）", weight: 4,
    match: (a) => (NUMBERS.test(a.title) ? { label: "有具體數字" } : null) },
  { id: "taiwan", group: "內容", name: "台灣玩家相關", hint: "提到台灣、繁體中文、中文版，或有中文媒體報導", weight: 8,
    match: (a) => (has(a, TAIWAN) || a.lang === "zh" || (a.related || []).some((r) => r.lang === "zh") ? { label: "台灣玩家相關" } : null) },

  // ---------- 時效
  { id: "fresh3", group: "時效", name: "3 小時內", hint: "剛發生的新聞", weight: 15,
    match: (a, c) => { const age = ageH(a, c); return age !== null && age <= 3 ? { label: "3 小時內" } : null; } },
  { id: "fresh12", group: "時效", name: "12 小時內", hint: "", weight: 8,
    match: (a, c) => { const age = ageH(a, c); return age !== null && age > 3 && age <= 12 ? { label: "12 小時內" } : null; } },
  { id: "fresh24", group: "時效", name: "24 小時內", hint: "", weight: 3,
    match: (a, c) => { const age = ageH(a, c); return age !== null && age > 12 && age <= 24 ? { label: "24 小時內" } : null; } },
  { id: "soon", group: "時效", name: "即將發生", hint: "今天、明天、本週、現已推出", weight: 6,
    match: (a) => (has(a, SOON) ? { label: "即將發生 / 今天" } : null) },

  // ---------- 個人
  { id: "watched", group: "個人", name: "你追蹤的遊戲", hint: "符合設定頁的追蹤清單", weight: 12,
    match: (_a, c) => (c.watched ? { label: "你追蹤的遊戲" } : null) },
  { id: "saved", group: "個人", name: "你收藏的", hint: "已加入收藏", weight: 5,
    match: (_a, c) => (c.saved ? { label: "你收藏的" } : null) },

  // ---------- 扣分
  { id: "stale", group: "扣分", name: "超過 3 天", hint: "舊聞", weight: -15,
    match: (a, c) => { const age = ageH(a, c); return age !== null && age > 72 ? { label: "超過 3 天" } : null; } },
  { id: "lowValue", group: "扣分", name: "攻略 / 清單文", hint: "攻略、教學、排行清單，新聞價值較低", weight: -8,
    match: (a) => (LOW_VALUE.test(a.title) ? { label: "攻略 / 清單文" } : null) },
  { id: "loneRumor", group: "扣分", name: "單一來源傳聞", hint: "只有一家、且來源可信度 E2 以下的爆料", weight: -6,
    match: (a) => (a.kind === "爆料" && (a.coverage || 1) === 1 && ["E1", "E2"].includes(a.evidence) ? { label: "單一來源傳聞（未證實）" } : null) },
];

function ageH(a: Article, c: HeatContext): number | null {
  const t = Date.parse(a.publishedAt);
  return t ? (c.now - t) / HOUR : null;
}

export const BASE_SCORE = 10;

export function heatScore(a: Article, ctx: Partial<HeatContext> = {}, weights: HeatWeights = {}): Heat {
  const c: HeatContext = { now: ctx.now ?? Date.now(), watched: Boolean(ctx.watched), saved: Boolean(ctx.saved) };
  const parts: HeatPart[] = [{ id: "base", label: "基礎", value: BASE_SCORE }];
  for (const rule of HEAT_RULES) {
    const w = weights[rule.id];
    if (w === false) continue;
    const weight = typeof w === "number" && Number.isFinite(w) ? w : rule.weight;
    if (!weight) continue;
    const m = rule.match(a, c);
    if (!m) continue;
    parts.push({ id: rule.id, label: m.label, value: Math.round(weight * (m.units ?? 1)) });
  }
  const score = Math.max(0, parts.reduce((s, p) => s + p.value, 0));
  return { score, parts };
}

/** 分數對應的火焰等級，用在卡片顏色 */
export function heatLevel(score: number): "blaze" | "hot" | "warm" | "cool" {
  if (score >= 70) return "blaze";
  if (score >= 45) return "hot";
  if (score >= 25) return "warm";
  return "cool";
}
