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
};

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
};

export type DraftSettings = {
  style: "news" | "casual" | "analysis" | "data";
  format: "single" | "thread";
  focus: "headline" | "balanced" | "body";
  hashtags: boolean;
};
