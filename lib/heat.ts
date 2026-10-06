// 熱度分數：基礎分 + 各種加成，每一項都列出來，讓你知道分數怎麼來的。
// 純函式，前端計算（新鮮度與追蹤遊戲會隨時間、隨個人設定改變）。
import type { Article } from "./types";

export type HeatPart = { label: string; value: number };
export type Heat = { score: number; parts: HeatPart[] };

const HOUR = 3600000;

/** 類型加成：這幾類通常最容易引發討論 */
const KIND_BONUS: Record<string, number> = {
  爆料: 10, 延期: 10, 發售: 8, "收購 / 投資": 8, "裁員 / 勞動": 8, 官方公告: 6,
  版本更新: 5, "價格 / Deals": 4, "硬體 / 平台": 4, 電競: 3, 數據報導: 3,
};

const LANG_NAME: Record<string, string> = { en: "英文", zh: "中文", ja: "日文" };

export function heatScore(a: Article, opt: { watched?: boolean; now?: number } = {}): Heat {
  const now = opt.now ?? Date.now();
  const parts: HeatPart[] = [];
  const coverage = Math.max(1, a.coverage || 1);

  // 1) 報導家數：每多一家 +15，最多 +60
  parts.push({ label: "基礎", value: 10 });
  if (coverage > 1) parts.push({ label: `${coverage} 家媒體報導`, value: Math.min(60, (coverage - 1) * 15) });

  // 2) 跨語系：英文、中文、日文媒體都在報，代表是全球話題
  const langs = new Set([a.lang || "en", ...(a.related || []).map((r) => r.lang || "en")]);
  if (langs.size > 1) parts.push({ label: `跨 ${langs.size} 語系（${[...langs].map((l) => LANG_NAME[l] || l).join("、")}）`, value: (langs.size - 1) * 10 });

  // 3) 官方 / 一手來源參與
  const evidences = [a.evidence, ...(a.related || []).map((r) => r.evidence || "")];
  if (evidences.includes("E5")) parts.push({ label: "官方一手消息", value: 10 });

  // 4) 新聞類型
  const kb = KIND_BONUS[a.kind];
  if (kb) parts.push({ label: `類型：${a.kind}`, value: kb });

  // 5) 擴散速度：最早一則到現在 6 小時內就有 3 家以上跟進
  const first = Date.parse(a.firstSeenAt || a.publishedAt) || 0;
  const last = Date.parse(a.publishedAt) || 0;
  if (coverage >= 3 && first && last && last - first <= 6 * HOUR) parts.push({ label: "6 小時內快速擴散", value: 10 });

  // 6) 新鮮度：越新越高；超過 3 天扣分
  const age = last ? (now - last) / HOUR : Infinity;
  if (age <= 3) parts.push({ label: "3 小時內", value: 15 });
  else if (age <= 12) parts.push({ label: "12 小時內", value: 8 });
  else if (age <= 24) parts.push({ label: "24 小時內", value: 3 });
  else if (age > 72 && age !== Infinity) parts.push({ label: "超過 3 天", value: -15 });

  // 7) 你追蹤的遊戲
  if (opt.watched) parts.push({ label: "你追蹤的遊戲", value: 12 });

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
