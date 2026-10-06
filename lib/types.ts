export type Article = {
  id: string;
  title: string;
  excerpt: string;
  link: string;
  source: string;
  sourceId: string;
  publishedAt: string;
  kind: string;
  game: string;
  evidence: string;
  /** 原文語言：zh 不需翻譯；ja / en 需要 */
  lang?: "en" | "zh" | "ja";
  /** 有幾家不同媒體報導同一件事（含自己）；1 代表只有這一家 */
  coverage?: number;
  /** 其他媒體對同一件事的報導 */
  related?: RelatedItem[];
  /** 同一事件最早一則報導的時間（用來算擴散速度） */
  firstSeenAt?: string;
};

export type RelatedItem = { source: string; sourceId: string; title: string; link: string; publishedAt: string; evidence?: string; lang?: "en" | "zh" | "ja" };

export type SourceStat = {
  id: string;
  name: string;
  status: "ok" | "error";
  count: number;
  error?: string;
};

export type TranslationEntry = {
  title: string;
  excerpt: string;
  /** true 代表翻譯服務失敗，title / excerpt 是原文 */
  failed?: boolean;
  /** 實際使用的翻譯引擎 */
  engine?: "gemini" | "google";
};

export type DraftSettings = {
  style: "news" | "casual" | "analysis" | "data";
  format: "single" | "thread";
  focus: "headline" | "balanced" | "body";
  hashtags: boolean;
};
