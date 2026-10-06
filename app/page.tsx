"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, Bookmark, Bot, BrainCircuit, CheckCircle2, CircleAlert, Clipboard, Crosshair, Database,
  Download, ExternalLink, Gauge, Globe2, ListChecks, Plus, Radar, RefreshCw, Rss, Search, Settings2,
  Send, ShieldCheck, Sparkles, Star, Trash2, Upload, Users2, XCircle
} from "lucide-react";
import { ALL_SOURCE_RECORDS, EVIDENCE_LABELS, GAME_FAMILIES, LANGUAGE_LEVELS, PERSONAL_ACCOUNTS, PLATFORMS, RSS_SOURCES, SOURCE_REGISTRY } from "@/lib/sources";
import { ARTICLE_KINDS, charLength, matchesGame, matchesPlatform } from "@/lib/classify";
import { GLOSSARY } from "@/lib/glossary";
import { buildThreadPosts, THREADS_LIMIT, type PostTemplate } from "@/lib/threads";
import { assessClaim, CONTENT_GATES, DECISION_LABEL, detectSignals, type Decision } from "@/lib/audit";
import { isStringArray, loadJSON, saveJSON, trimRecord } from "@/lib/storage";
import type { Article, DraftSettings, SourceStat, TranslationEntry } from "@/lib/types";

// ---------------------------------------------------------------- 型別與常數

type Section = "dashboard" | "news" | "sources" | "accounts" | "translate" | "audit" | "threads" | "rules" | "settings";
type TranslateMode = "news" | "game" | "literal";
type CustomTerm = { from: string; to: string };
type Audit = { id: string; text: string; type: string; evidence: string; decision: Decision; reasons: string[]; language: string; source: string };
type FeedHealth = { loaded: boolean; feedCount: number; successfulSources: number; failedSources: string[]; sourceStats: SourceStat[]; fetched: number; duplicatesRemoved: number; generatedAt: string };

const STATE_KEY = "gmd-state";
const TR_KEY = "gmd-translations-v4";
const REVIEW_KEY = "gmd-reviewed-v4";
const READ_KEY = "gmd-read-v1";
const SYNC_KEY = "gmd-sync-v1"; // 只存在這台裝置：同步碼與本機最後修改時間，不會被同步出去
const TR_CACHE_LIMIT = 600;
const AUTO_TRANSLATE_LIMIT = 60; // 每次最多自動翻譯目前清單前 60 則，其他按需翻譯
const AUTO_REFRESH_MS = 10 * 60 * 1000;
const DEFAULT_WATCH = ["Apex Legends", "GTA", "Monster Hunter", "PlayStation", "Xbox", "Nintendo"];
const DEFAULT_TEMPLATES: PostTemplate[] = [
  { id: "daily", name: "每日快報", opening: "🎮 今日遊戲快報", closing: "你怎麼看？留言聊聊 👇" },
];
const THREADS_INTENT = "https://www.threads.com/intent/post?text=";
const DEFAULT_DRAFT: DraftSettings = { style: "news", format: "single", focus: "balanced", hashtags: true };
const EMPTY_HEALTH: FeedHealth = { loaded: false, feedCount: RSS_SOURCES.length, successfulSources: 0, failedSources: [], sourceStats: [], fetched: 0, duplicatesRemoved: 0, generatedAt: "" };
const AUDIT_TYPES = Array.from(new Set([...ARTICLE_KINDS.filter((x) => x !== "全部"), ...Object.keys(CONTENT_GATES)]));

const NAV: Array<[Section, string, string, typeof Gauge]> = [
  ["dashboard", "總監控", "儀表板", Gauge],
  ["news", "新聞雷達", "聚合 / 去重 / 篩選", Radar],
  ["sources", "來源中心", "媒體 / RSS / 官方", Database],
  ["accounts", "帳號中心", "個人 / 爆料 / 社群", Users2],
  ["translate", "翻譯工作台", "遊戲術語 / 校對", Sparkles],
  ["audit", "Claim 提示", "語句風險 / 證據門檻", ShieldCheck],
  ["threads", "Threads 工坊", "勾選新聞 / 貼文草稿", Bot],
  ["rules", "規則參考", "Evidence / 語氣", ListChecks],
  ["settings", "設定", "追蹤 / 備份 / 自動更新", Settings2]
];
const PAGE_TITLE: Record<Section, string> = {
  dashboard: "今日遊戲新聞總監控", news: "新聞雷達", sources: "來源中心", accounts: "個人帳號中心",
  translate: "遊戲新聞翻譯工作台", audit: "Claim 語句風險提示", threads: "Threads 貼文工坊", rules: "規則與發布語氣參考", settings: "設定"
};
const MODE_LABEL: Record<TranslateMode, string> = { news: "台灣新聞格式", game: "玩家用語", literal: "貼近原文" };

// ---------------------------------------------------------------- 小工具

function initials(s: string) {
  return s.split(/[\s/·]+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase();
}
function formatAge(date: string) {
  const t = Date.parse(date);
  if (!t) return "時間不明";
  const mins = Math.max(1, Math.floor((Date.now() - t) / 60000));
  if (mins < 60) return mins + " 分鐘前";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + " 小時前";
  return Math.floor(hrs / 24) + " 天前";
}
function taipeiTime(date: string) {
  const t = Date.parse(date);
  if (!t) return "—";
  return new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(t));
}
function evidenceClass(e: string) {
  return e === "E5" ? "good" : e === "E1" || e === "E2" ? "warn" : "info";
}
function decisionClass(d: Decision) {
  return d === "EDIT_REQUIRED" ? "bad" : d === "FAST_UNVERIFIED" ? "warn" : "neutral";
}
function glossarySignature(terms: CustomTerm[]) {
  return terms.map((t) => t.from + ">" + t.to).join("|");
}
function trKey(id: string, mode: TranslateMode, sig: string) {
  // 簽章只取長度＋前 40 字，避免 key 過長；術語有變就會產生新 key
  return id + "|" + mode + "|" + sig.length + ":" + sig.slice(0, 40);
}
/** 產生 24 字的隨機同步碼（例如 k3Fq-9xZp-...），用瀏覽器的安全亂數。 */
function makeSyncCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const raw = Array.from(bytes, (b) => chars[b % chars.length]).join("");
  return raw.match(/.{1,5}/g)!.join("-");
}

function articleLinks(n: Article): string[] {
  return [n.link, ...(n.related || []).map((r) => r.link)];
}
function articleText(n: Article) {
  return n.title + " " + n.excerpt + " " + n.game;
}
/** 遊戲 / 平台家族比對：「PC」「Mobile」這類平台名用平台規則（避免 "pc" 命中 "npc"）。 */
function matchesFamily(n: Article, family: string) {
  const text = articleText(n);
  if (PLATFORMS.includes(family)) return matchesPlatform(text, family);
  return matchesGame(text, n.game, family);
}

// ---------------------------------------------------------------- 主頁

export default function HomePage() {
  const [hydrated, setHydrated] = useState(false);
  const [section, setSection] = useState<Section>("dashboard");

  // 新聞
  const [news, setNews] = useState<Article[]>([]);
  const [health, setHealth] = useState<FeedHealth>(EMPTY_HEALTH);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);

  // 篩選
  const [query, setQuery] = useState("");
  const [feedQuery, setFeedQuery] = useState("");
  const [contentType, setContentType] = useState("全部");
  const [gameFamily, setGameFamily] = useState("全部");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = useState("全部");
  const [onlyWatched, setOnlyWatched] = useState(false);
  const [onlySaved, setOnlySaved] = useState(false);
  const [onlyNew, setOnlyNew] = useState(false);
  const [langFilter, setLangFilter] = useState<"all" | "zh" | "en" | "ja">("all");
  const [sortBy, setSortBy] = useState<"latest" | "heat">("latest");
  // NEW 標記：seenLinks = 看過的連結；unreadLinks = 上次「全部已讀」之後才出現的連結
  const [seenLinks, setSeenLinks] = useState<string[]>([]);
  const [unreadLinks, setUnreadLinks] = useState<string[]>([]);
  const [watch, setWatch] = useState<string[]>(DEFAULT_WATCH);

  // 收藏、帳號關注
  const [savedArticles, setSavedArticles] = useState<Article[]>([]);
  const [followed, setFollowed] = useState<string[]>([]);
  const [onlyAccounts, setOnlyAccounts] = useState(false);
  const [onlyFollowed, setOnlyFollowed] = useState(false);
  const [sourceSearch, setSourceSearch] = useState("");

  // 翻譯
  const [translateMode, setTranslateMode] = useState<TranslateMode>("news");
  const [customTerms, setCustomTerms] = useState<CustomTerm[]>([]);
  const [trCache, setTrCache] = useState<Record<string, TranslationEntry>>({});
  const [reviewed, setReviewed] = useState<string[]>([]);
  const [failedIds, setFailedIds] = useState<string[]>([]);
  const [translating, setTranslating] = useState(0);
  const inFlight = useRef<Set<string>>(new Set());
  const [newTermFrom, setNewTermFrom] = useState("");
  const [newTermTo, setNewTermTo] = useState("");
  const [manualText, setManualText] = useState("");
  const [manualOut, setManualOut] = useState("");
  const [manualReviewed, setManualReviewed] = useState(false);
  const [targetLang, setTargetLang] = useState("zh-TW");
  const [manualBusy, setManualBusy] = useState(false);
  const [engine, setEngine] = useState<{ gemini: boolean; model: string | null } | null>(null);

  // Threads
  const [selected, setSelected] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<string[]>([]);
  const [draftIndex, setDraftIndex] = useState(0);
  const [myView, setMyView] = useState("");
  const [templates, setTemplates] = useState<PostTemplate[]>(DEFAULT_TEMPLATES);
  const [templateId, setTemplateId] = useState("");
  const [editingTemplates, setEditingTemplates] = useState(false);

  // 跨裝置同步
  const [syncAvailable, setSyncAvailable] = useState<boolean | null>(null);
  const [syncCode, setSyncCode] = useState("");
  const [syncInput, setSyncInput] = useState("");
  const [syncStatus, setSyncStatus] = useState("");
  const [showCode, setShowCode] = useState(false);
  const localUpdatedAt = useRef(0);
  const skipNextPush = useRef(false);
  const firstPersist = useRef(true);
  const syncReady = useRef(false);
  const [draftSettings, setDraftSettings] = useState<DraftSettings>(DEFAULT_DRAFT);
  const [copied, setCopied] = useState("");

  // Claim
  const [auditText, setAuditText] = useState("武器 X 被削弱後，玩家都不再使用它，因為這次改動讓它變得毫無競爭力。");
  const [auditType, setAuditType] = useState("一般新聞");
  const [audits, setAudits] = useState<Audit[]>([]);

  const sig = glossarySignature(customTerms);

  // ---------- 本機狀態：先讀取，讀完才開始寫入（避免預設值蓋掉使用者設定）
  const applyState = useCallback((x: Record<string, unknown>) => {
    if (isStringArray(x.watch)) setWatch(x.watch);
    if (typeof x.query === "string") setQuery(x.query);
    if (typeof x.feedQuery === "string") setFeedQuery(x.feedQuery);
    if (typeof x.contentType === "string" && (ARTICLE_KINDS as readonly string[]).includes(x.contentType)) setContentType(x.contentType);
    if (typeof x.gameFamily === "string" && GAME_FAMILIES.includes(x.gameFamily)) setGameFamily(x.gameFamily);
    if (isStringArray(x.platforms)) setPlatforms(x.platforms.filter((p) => PLATFORMS.includes(p)));
    if (typeof x.sourceFilter === "string") setSourceFilter(x.sourceFilter === "全部" || RSS_SOURCES.some((s) => s.id === x.sourceFilter) ? x.sourceFilter : "全部");
    if (typeof x.onlyWatched === "boolean") setOnlyWatched(x.onlyWatched);
    if (typeof x.onlySaved === "boolean") setOnlySaved(x.onlySaved);
    if (typeof x.onlyAccounts === "boolean") setOnlyAccounts(x.onlyAccounts);
    if (typeof x.onlyFollowed === "boolean") setOnlyFollowed(x.onlyFollowed);
    if (typeof x.sourceSearch === "string") setSourceSearch(x.sourceSearch);
    if (isStringArray(x.followed)) setFollowed(x.followed);
    if (Array.isArray(x.savedArticles)) setSavedArticles((x.savedArticles as Article[]).filter((a) => a && typeof a.id === "string" && typeof a.link === "string").slice(-200));
    if (Array.isArray(x.customTerms)) setCustomTerms((x.customTerms as CustomTerm[]).filter((t) => t && typeof t.from === "string" && typeof t.to === "string" && t.from && t.to).slice(0, 80));
    if (typeof x.myView === "string") setMyView(x.myView);
    if (x.translateMode === "news" || x.translateMode === "game" || x.translateMode === "literal") setTranslateMode(x.translateMode);
    if (typeof x.autoRefresh === "boolean") setAutoRefresh(x.autoRefresh);
    if (x.sortBy === "latest" || x.sortBy === "heat") setSortBy(x.sortBy);
    if (Array.isArray(x.templates)) setTemplates((x.templates as PostTemplate[]).filter((t) => t && typeof t.id === "string" && typeof t.name === "string").map((t) => ({ id: t.id, name: t.name, opening: String(t.opening || ""), closing: String(t.closing || "") })).slice(0, 20));
    if (typeof x.templateId === "string") setTemplateId(x.templateId);
    if (typeof x.onlyNew === "boolean") setOnlyNew(x.onlyNew);
    if (x.langFilter === "all" || x.langFilter === "zh" || x.langFilter === "en" || x.langFilter === "ja") setLangFilter(x.langFilter);
    const d = x.draftSettings as Partial<DraftSettings> | undefined;
    if (d && typeof d === "object") {
      setDraftSettings({
        style: d.style === "casual" || d.style === "analysis" || d.style === "data" ? d.style : "news",
        format: d.format === "thread" ? "thread" : "single",
        focus: d.focus === "headline" || d.focus === "body" ? d.focus : "balanced",
        hashtags: d.hashtags !== false
      });
    }
  }, []);

  useEffect(() => {
    applyState(loadJSON<Record<string, unknown>>(STATE_KEY, {}));
    setTrCache(loadJSON<Record<string, TranslationEntry>>(TR_KEY, {}));
    const sy = loadJSON<{ code?: unknown; localUpdatedAt?: unknown }>(SYNC_KEY, {});
    if (typeof sy.code === "string") setSyncCode(sy.code);
    localUpdatedAt.current = Number(sy.localUpdatedAt) || 0;
    const rd = loadJSON<{ seen?: unknown; unread?: unknown }>(READ_KEY, {});
    if (isStringArray(rd.seen)) setSeenLinks(rd.seen.slice(-4000));
    if (isStringArray(rd.unread)) setUnreadLinks(rd.unread.slice(-1500));
    const r = loadJSON<unknown>(REVIEW_KEY, []);
    if (isStringArray(r)) setReviewed(r.slice(-1000));
    setHydrated(true);
  }, [applyState]);

  const persisted = useMemo(
    () => ({ version: 3, watch, query, feedQuery, contentType, gameFamily, platforms, sourceFilter, onlyWatched, onlySaved, onlyAccounts, onlyFollowed, sourceSearch, followed, savedArticles, customTerms, myView, translateMode, autoRefresh, draftSettings, sortBy, onlyNew, langFilter, templates, templateId }),
    [templates, templateId, langFilter, sortBy, onlyNew, watch, query, feedQuery, contentType, gameFamily, platforms, sourceFilter, onlyWatched, onlySaved, onlyAccounts, onlyFollowed, sourceSearch, followed, savedArticles, customTerms, myView, translateMode, autoRefresh, draftSettings]
  );
  useEffect(() => { if (hydrated) saveJSON(STATE_KEY, persisted); }, [hydrated, persisted]);

  // ---------- 跨裝置同步
  const syncCall = useCallback(async (payload: Record<string, unknown>) => {
    const r = await fetch("/api/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d?.error || "同步失敗");
    return d;
  }, []);
  const saveSyncMeta = useCallback((code: string) => saveJSON(SYNC_KEY, { code, localUpdatedAt: localUpdatedAt.current }), []);

  useEffect(() => {
    fetch("/api/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "status" }) })
      .then((r) => r.json())
      .then((d) => setSyncAvailable(Boolean(d?.available)))
      .catch(() => setSyncAvailable(false));
  }, []);

  const persistedRef = useRef(persisted);
  persistedRef.current = persisted;
  const pushNow = useCallback(async (code: string) => {
    try {
      const d = await syncCall({ action: "push", code, data: persistedRef.current, updatedAt: localUpdatedAt.current || Date.now() });
      setSyncStatus("已同步 " + taipeiTime(new Date(Number(d.updatedAt) || Date.now()).toISOString()));
    } catch (e) {
      setSyncStatus("同步失敗：" + (e instanceof Error ? e.message : "未知錯誤"));
    }
  }, [syncCall]);

  // 開啟頁面（或剛設定同步碼）時：雲端比較新就載入雲端，否則把這台的設定上傳
  useEffect(() => {
    if (!hydrated || !syncAvailable || !syncCode) return;
    let cancelled = false;
    syncReady.current = false;
    setSyncStatus("同步中…");
    (async () => {
      try {
        const d = await syncCall({ action: "pull", code: syncCode });
        if (cancelled) return;
        if (d.data && Number(d.updatedAt) > localUpdatedAt.current) {
          skipNextPush.current = true;
          applyState(d.data as Record<string, unknown>);
          localUpdatedAt.current = Number(d.updatedAt);
          saveSyncMeta(syncCode);
          setSyncStatus("已載入雲端設定 " + taipeiTime(new Date(Number(d.updatedAt)).toISOString()));
        } else {
          if (!localUpdatedAt.current) localUpdatedAt.current = Date.now();
          saveSyncMeta(syncCode);
          await pushNow(syncCode);
        }
      } catch (e) {
        if (!cancelled) setSyncStatus("同步失敗：" + (e instanceof Error ? e.message : "未知錯誤"));
      } finally {
        if (!cancelled) syncReady.current = true;
      }
    })();
    return () => { cancelled = true; };
  }, [hydrated, syncAvailable, syncCode, syncCall, applyState, pushNow, saveSyncMeta]);

  // 設定有變動：記下修改時間，停 2.5 秒沒再變就上傳
  useEffect(() => {
    if (!hydrated) return;
    if (firstPersist.current) { firstPersist.current = false; return; } // 剛從本機載入，不算修改
    if (skipNextPush.current) { skipNextPush.current = false; return; } // 剛套用雲端資料，不用再傳回去
    localUpdatedAt.current = Date.now();
    saveSyncMeta(syncCode);
    if (!syncAvailable || !syncCode || !syncReady.current) return;
    const t = setTimeout(() => void pushNow(syncCode), 2500);
    return () => clearTimeout(t);
  }, [hydrated, persisted, syncAvailable, syncCode, pushNow, saveSyncMeta]);

  function startSync(code: string) {
    const c = code.trim();
    if (!/^[A-Za-z0-9-]{16,64}$/.test(c)) { setSyncStatus("同步碼格式不正確：需 16 個字以上的英數字（可含 -）"); return; }
    // 用別台的同步碼加入時，以雲端為準
    localUpdatedAt.current = 0;
    setSyncCode(c);
    saveSyncMeta(c);
    setSyncInput("");
  }
  function stopSync() {
    setSyncCode("");
    saveSyncMeta("");
    setSyncStatus("已停止同步（雲端資料保留，用同一組同步碼可再加入）");
  }
  useEffect(() => { if (hydrated) saveJSON(TR_KEY, trimRecord(trCache, TR_CACHE_LIMIT)); }, [hydrated, trCache]);
  useEffect(() => { if (hydrated) saveJSON(REVIEW_KEY, reviewed.slice(-1000)); }, [hydrated, reviewed]);
  useEffect(() => { if (hydrated) saveJSON(READ_KEY, { seen: seenLinks.slice(-4000), unread: unreadLinks.slice(-1500) }); }, [hydrated, seenLinks, unreadLinks]);

  // ---------- 抓新聞
  const refreshNews = useCallback(async () => {
    setLoading(true);
    setNotice("");
    try {
      const params = new URLSearchParams();
      if (feedQuery.trim()) params.set("query", feedQuery.trim());
      if (sourceFilter !== "全部") params.set("sourceIds", sourceFilter);
      const qs = params.toString();
      const r = await fetch(qs ? "/api/news?" + qs : "/api/news", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "新聞來源更新失敗");
      const articles: Article[] = Array.isArray(d.articles) ? d.articles : [];
      setNews(articles);
      // 標記 NEW：第一次使用時全部當作看過（不然 100 則全是 NEW）；之後只有沒看過的連結算 NEW
      const links = articles.flatMap(articleLinks);
      setSeenLinks((seen) => {
        const seenSet = new Set(seen);
        if (seen.length) {
          const fresh = links.filter((l) => !seenSet.has(l));
          if (fresh.length) setUnreadLinks((u) => Array.from(new Set([...u, ...fresh])).slice(-1500));
        }
        return Array.from(new Set([...seen, ...links])).slice(-4000);
      });
      const failed: string[] = Array.isArray(d.failedSources) ? d.failedSources : [];
      setHealth({
        loaded: true,
        feedCount: Number(d.feedCount || 0),
        successfulSources: Number(d.successfulSources || 0),
        failedSources: failed,
        sourceStats: Array.isArray(d.sourceStats) ? d.sourceStats : [],
        fetched: Number(d.fetched || 0),
        duplicatesRemoved: Number(d.duplicatesRemoved || 0),
        generatedAt: String(d.generatedAt || "")
      });
      setNotice(
        "已取得 " + articles.length + " 則（去除重複 " + Number(d.duplicatesRemoved || 0) + " 則、合併多家報導 " + Number(d.mergedStories || 0) + " 則）；" +
          (failed.length ? failed.length + " 個來源失敗：" + failed.join("、") : (d.successfulSources || 0) + "/" + (d.feedCount || 0) + " 個 Feed 正常。")
      );
    } catch (e) {
      setNotice("更新失敗：" + (e instanceof Error ? e.message : "無法連線到新聞服務") + "。目前保留既有資料。");
    } finally {
      setLoading(false);
    }
  }, [feedQuery, sourceFilter]);

  // 目前的翻譯引擎（Gemini 或免費 Google）
  useEffect(() => {
    fetch("/api/translate", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setEngine({ gemini: Boolean(d?.gemini), model: d?.model ? String(d.model) : null }))
      .catch(() => setEngine({ gemini: false, model: null }));
  }, []);
  const engineLabel = engine?.gemini ? "Gemini" : "Google";

  // 開啟頁面就抓一次即時新聞（不再停在示範資料）
  const firstLoad = useRef(false);
  useEffect(() => {
    if (!hydrated || firstLoad.current) return;
    firstLoad.current = true;
    void refreshNews();
  }, [hydrated, refreshNews]);

  // 每 10 分鐘自動更新（設定頁可開關；分頁在背景時不抓）
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => { if (document.visibilityState === "visible") void refreshNews(); }, AUTO_REFRESH_MS);
    return () => clearInterval(t);
  }, [autoRefresh, refreshNews]);

  // ---------- 篩選
  const pool = useMemo(() => {
    if (!onlySaved) return news;
    return [...savedArticles].reverse();
  }, [news, onlySaved, savedArticles]);

  const unreadSet = useMemo(() => new Set(unreadLinks), [unreadLinks]);
  const isNew = useCallback((n: Article) => articleLinks(n).some((l) => unreadSet.has(l)), [unreadSet]);
  const newCount = useMemo(() => news.filter(isNew).length, [news, isNew]);
  function markRead(n: Article) {
    const ls = new Set(articleLinks(n));
    setUnreadLinks((u) => u.filter((l) => !ls.has(l)));
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = pool.filter((n) => {
      const text = articleText(n);
      const tr = trCache[trKey(n.id, translateMode, sig)];
      const searchable = (text + " " + n.source + " " + (tr ? tr.title + " " + tr.excerpt : "")).toLowerCase();
      if (q && !searchable.includes(q)) return false;
      if (contentType !== "全部" && n.kind !== contentType) return false;
      if (gameFamily !== "全部" && !matchesFamily(n, gameFamily)) return false;
      if (platforms.length && !platforms.some((p) => matchesPlatform(text, p))) return false;
      if (onlyWatched && !watch.some((w) => matchesFamily(n, w))) return false;
      if (sourceFilter !== "全部" && n.sourceId !== sourceFilter && !(n.related || []).some((r) => r.sourceId === sourceFilter)) return false;
      if (onlyNew && !articleLinks(n).some((l) => unreadSet.has(l))) return false;
      if (langFilter !== "all" && (n.lang || "en") !== langFilter) return false;
      return true;
    });
    if (sortBy === "heat") {
      list.sort((a, b) => (b.coverage || 1) - (a.coverage || 1) || (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0));
    }
    return list;
  }, [pool, query, contentType, gameFamily, platforms, onlyWatched, watch, sourceFilter, trCache, translateMode, sig, onlyNew, unreadSet, sortBy, langFilter]);

  const savedIds = useMemo(() => new Set(savedArticles.map((a) => a.id)), [savedArticles]);
  const tr = useCallback((id: string) => trCache[trKey(id, translateMode, sig)], [trCache, translateMode, sig]);
  const isReviewed = useCallback((id: string) => reviewed.includes(trKey(id, translateMode, sig)), [reviewed, translateMode, sig]);

  // ---------- 翻譯：只翻「還沒翻過」的文章；結果存在本機，篩選或重新整理都不會重翻、不會清掉校對紀錄
  const translateItems = useCallback(async (items: Article[], force = false) => {
    const todo = items.filter((n) => {
      if (n.lang === "zh") return false; // 中文原文不用翻
      const key = trKey(n.id, translateMode, sig);
      if (inFlight.current.has(key)) return false;
      return force || !trCache[key];
    });
    if (!todo.length) return;
    // 先把整批都標成處理中，避免中途觸發的自動翻譯重複送出還在排隊的文章
    const allKeys = todo.map((n) => trKey(n.id, translateMode, sig));
    allKeys.forEach((k) => inFlight.current.add(k));
    let i = 0;
    for (; i < todo.length; i += 10) {
      const batch = todo.slice(i, i + 10);
      const keys = batch.map((n) => trKey(n.id, translateMode, sig));
      setTranslating((v) => v + batch.length);
      try {
        const r = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetLanguage: "zh-TW", mode: translateMode, customGlossary: customTerms, articles: batch.map((n) => ({ id: n.id, title: n.title, excerpt: n.excerpt })) })
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || "translate failed");
        const ok: Record<string, TranslationEntry> = {};
        const failed: string[] = [];
        for (const x of (d.translations || []) as Array<{ id: string; title: string; excerpt: string; failed?: boolean; engine?: string }>) {
          if (x.failed) failed.push(x.id);
          else ok[trKey(x.id, translateMode, sig)] = { title: x.title, excerpt: x.excerpt, engine: x.engine === "gemini" ? "gemini" : "google" };
        }
        if (d.notice) setNotice(String(d.notice));
        setTrCache((p) => ({ ...p, ...ok }));
        if (force) setReviewed((p) => p.filter((k) => !(k in ok)));
        setFailedIds((p) => [...p.filter((id) => !batch.some((n) => n.id === id)), ...failed]);
        if (failed.length) setNotice("有 " + failed.length + " 則翻譯失敗（免費翻譯服務可能暫時限流），已保留原文，可稍後按「翻譯」重試。");
      } catch {
        setFailedIds((p) => Array.from(new Set([...p, ...batch.map((n) => n.id)])));
        setNotice("翻譯服務暫時失敗，已保留原文，可稍後重試。");
        keys.forEach((k) => inFlight.current.delete(k));
        setTranslating((v) => Math.max(0, v - batch.length));
        break; // 服務掛了就不要繼續狂打
      }
      keys.forEach((k) => inFlight.current.delete(k));
      setTranslating((v) => Math.max(0, v - batch.length));
    }
    // 中斷時釋放還沒送出的文章，之後可以再試
    allKeys.slice(i).forEach((k) => inFlight.current.delete(k));
  }, [trCache, translateMode, sig, customTerms]);

  // 自動翻譯：新聞載入後，對目前清單前 N 則「缺翻譯且沒失敗過」的文章補翻
  const pendingKey = useMemo(
    () => filtered.filter((n) => n.lang !== "zh").slice(0, AUTO_TRANSLATE_LIMIT).filter((n) => !trCache[trKey(n.id, translateMode, sig)] && !failedIds.includes(n.id)).map((n) => n.id).join("|"),
    [filtered, trCache, translateMode, sig, failedIds]
  );
  useEffect(() => {
    if (!hydrated || !health.loaded || !pendingKey) return;
    const t = setTimeout(() => {
      const ids = new Set(pendingKey.split("|"));
      void translateItems(filtered.filter((n) => ids.has(n.id)));
    }, 600); // 打字搜尋時稍等，不要每個字都送出
    return () => clearTimeout(t);
  }, [hydrated, health.loaded, pendingKey]);

  async function translateManual() {
    if (!manualText.trim()) return;
    setManualBusy(true);
    setManualReviewed(false);
    try {
      const r = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetLanguage: targetLang, mode: translateMode, customGlossary: customTerms, articles: [{ id: "manual", title: manualText, excerpt: "" }] })
      });
      const d = await r.json();
      const x = d.translations?.[0];
      if (!r.ok || !x || x.failed) throw new Error("failed");
      setManualOut(x.title);
      if (d.notice) setNotice(String(d.notice));
    } catch {
      setManualOut("");
      setNotice("翻譯失敗：免費翻譯服務暫時無法使用，請稍後再試。");
    } finally {
      setManualBusy(false);
    }
  }

  // 切換翻譯模式時，翻譯工作台已有結果就用新模式重翻一次
  const lastManualMode = useRef(translateMode);
  useEffect(() => {
    if (lastManualMode.current === translateMode) return;
    lastManualMode.current = translateMode;
    if (manualText.trim() && manualOut) void translateManual();
  });

  function addTerm() {
    const from = newTermFrom.trim();
    const to = newTermTo.trim();
    if (!from || !to) return;
    setCustomTerms((p) => [...p.filter((x) => x.from.toLowerCase() !== from.toLowerCase()), { from, to }].slice(-80));
    setNewTermFrom("");
    setNewTermTo("");
  }

  // ---------- 收藏、選取、關注
  function toggleList(setter: (f: (p: string[]) => string[]) => void, v: string) {
    setter((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  }
  function toggleSaved(n: Article) {
    setSavedArticles((p) => (p.some((a) => a.id === n.id) ? p.filter((a) => a.id !== n.id) : [...p, n].slice(-200)));
  }
  function toggleReviewed(id: string) {
    toggleList(setReviewed, trKey(id, translateMode, sig));
  }

  // ---------- Threads
  const articleById = useMemo(() => {
    const m = new Map<string, Article>();
    for (const a of savedArticles) m.set(a.id, a);
    for (const a of news) m.set(a.id, a);
    return m;
  }, [news, savedArticles]);
  const selectedArticles = useMemo(() => selected.map((id) => articleById.get(id)).filter((a): a is Article => Boolean(a)).slice(0, 8), [selected, articleById]);
  const unreviewedSelected = selectedArticles.filter((n) => tr(n.id) && !isReviewed(n.id)).length;

  function generateThreads() {
    if (!selectedArticles.length) return;
    const posts = buildThreadPosts(
      selectedArticles.map((n) => ({ title: tr(n.id)?.title || n.title, excerpt: tr(n.id)?.excerpt || n.excerpt, source: n.source, link: n.link, game: n.game })),
      draftSettings,
      myView,
      templates.find((t) => t.id === templateId) || null
    );
    setDrafts(posts);
    setDraftIndex(0);
    setSection("threads");
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      setNotice("瀏覽器不允許自動複製，請手動選取文字複製。");
    }
  }

  // ---------- Claim
  function runAudit() {
    const t = auditText.trim();
    if (!t) return;
    const r = assessClaim(t, auditType);
    setAudits((p) => [{ id: "C-" + String(p.length + 1).padStart(3, "0") + "-" + Date.now().toString(36).slice(-3), text: t, type: r.type, evidence: r.gate, decision: r.decision, reasons: r.reasons, language: r.language, source: "使用者輸入" }, ...p].slice(0, 50));
  }
  const liveSignals = detectSignals(auditText);

  // ---------- 匯出 / 匯入
  function exportState() {
    const blob = new Blob([JSON.stringify({ ...persisted, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "game-media-daily-settings.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  function importState() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        applyState(JSON.parse(await file.text()));
        setNotice("設定已匯入。");
      } catch {
        setNotice("匯入失敗：不是有效的 Game Media Daily JSON。");
      }
    };
    input.click();
  }

  // ---------- 衍生資料
  const statById = useMemo(() => new Map(health.sourceStats.map((s) => [s.id, s])), [health.sourceStats]);
  const sources = useMemo(() => {
    const q = sourceSearch.trim().toLowerCase();
    return ALL_SOURCE_RECORDS.filter((s) => {
      const isAccount = s.kind.includes("帳號");
      if (onlyAccounts && !isAccount) return false;
      return !q || [s.name, s.kind, s.platform, s.region, ...s.focus].join(" ").toLowerCase().includes(q);
    });
  }, [sourceSearch, onlyAccounts]);
  const accounts = useMemo(() => {
    const list = onlyFollowed ? PERSONAL_ACCOUNTS.filter((a) => followed.includes(a.id)) : PERSONAL_ACCOUNTS;
    return [...list].sort((a, b) => Number(followed.includes(b.id)) - Number(followed.includes(a.id)));
  }, [followed, onlyFollowed]);
  const topStories = filtered.slice(0, 6);
  const hotStories = useMemo(
    () => news.filter((n) => (n.coverage || 1) >= 2).sort((a, b) => (b.coverage || 1) - (a.coverage || 1) || (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0)).slice(0, 6),
    [news]
  );
  const riskCount = audits.filter((a) => a.decision === "EDIT_REQUIRED" || a.decision === "FAST_UNVERIFIED").length;
  const needTranslation = filtered.filter((n) => n.lang !== "zh");
  const translatedCount = needTranslation.filter((n) => tr(n.id)).length;
  const statusText = loading ? "更新中…" : health.loaded ? "更新於 " + taipeiTime(health.generatedAt) : "尚未載入";

  // ---------------------------------------------------------------- 畫面

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark"><Crosshair size={17} /></div>
          <div>
            <div className="brandTitle">GAME MEDIA</div>
            <div className="brandSub">EDITORIAL DESK</div>
          </div>
        </div>
        <div className="livePulse"><span className={health.loaded && !health.failedSources.length ? "" : "dotWarn"} />{statusText}</div>
        <nav className="nav">
          {NAV.map(([id, label, sub, Icon]) => (
            <button key={id} className={section === id ? "navItem navItemActive" : "navItem"} onClick={() => setSection(id)} title={label}>
              <Icon size={17} />
              <span><strong>{label}{id === "news" && newCount > 0 && <em className="navBadge">{newCount}</em>}</strong><small>{sub}</small></span>
            </button>
          ))}
        </nav>
        <div className="sidebarBottom">
          <div className="engineMini"><span>FEED</span><span>{health.loaded ? health.successfulSources + "/" + health.feedCount : "—/" + RSS_SOURCES.length}</span></div>
          <div className="sidebarNote">Claim-level · Evidence-aware · 人工校對優先</div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="kicker"><Activity size={13} /> GAME MEDIA OPERATIONS</div>
            <h1>{PAGE_TITLE[section]}</h1>
          </div>
          <div className="topActions">
            <div className="systemBadge">來源 {ALL_SOURCE_RECORDS.length} · Feed {RSS_SOURCES.length}</div>
            <button className="btn primary" onClick={() => void refreshNews()} disabled={loading}>
              <RefreshCw size={14} className={loading ? "spin" : ""} />{loading ? "更新中…" : "更新"}
            </button>
          </div>
        </header>

        {notice && (
          <div className="content noticeWrap">
            <div className="sourceNotice"><CircleAlert size={13} /><span>{notice}</span><button className="noticeClose" onClick={() => setNotice("")} aria-label="關閉"><XCircle size={13} /></button></div>
          </div>
        )}

        {section === "dashboard" && (
          <div className="content">
            <div className="heroGrid">
              <section className="heroCard">
                <div className="heroTop"><span>EDITORIAL PULSE</span><span className={`badge ${health.loaded ? "good" : "neutral"}`}>{health.loaded ? "LIVE" : loading ? "載入中" : "未載入"}</span></div>
                <div className="heroNumber">{filtered.length}<small> 則新聞</small></div>
                <p className="heroDesc">RSS / Atom → 清洗 → 去重 → 分類 → 翻譯（術語保護）→ Claim 提示 → Threads 草稿。來源失敗會列出名稱與原因；翻譯失敗會標示並保留原文。</p>
                <div className="heroActions">
                  <button className="btn primary" onClick={() => setSection("news")}><Radar size={15} />新聞雷達</button>
                  <button className="btn" onClick={() => setSection("threads")}><Bot size={15} />Threads 工坊</button>
                </div>
              </section>
              <section className="metricStack">
                <div className="metricCard"><div><span>NEWS INGEST</span><strong>{health.loaded ? health.fetched : "—"}</strong></div><Rss size={18} /></div>
                <div className="metricCard"><div><span>FEEDS OK</span><strong>{health.loaded ? health.successfulSources + "/" + health.feedCount : "—"}</strong></div><Globe2 size={18} /></div>
                <div className="metricCard"><div><span>RISK QUEUE</span><strong>{riskCount}</strong></div><CircleAlert size={18} /></div>
              </section>
            </div>

            <section className="controlBar">
              <div className="controlLeft">
                <span className="controlLabel">類型</span>
                <select className="select" value={contentType} onChange={(e) => setContentType(e.target.value)}>{ARTICLE_KINDS.map((x) => <option key={x}>{x}</option>)}</select>
                <label className="checkLine"><input type="checkbox" checked={onlyWatched} onChange={(e) => setOnlyWatched(e.target.checked)} />只看追蹤</label>
              </div>
              <div className="controlChips">
                {GAME_FAMILIES.slice(1, 13).map((x) => <button className={watch.includes(x) ? "chipActive" : "chip"} key={x} onClick={() => toggleList(setWatch, x)}>{x}</button>)}
              </div>
            </section>

            <div className="grid3">
              <section className="panel">
                <div className="panelHeader"><div><span className="sectionKicker">LATEST</span><h2>最新事件</h2></div><button className="btn ghost" onClick={() => setSection("news")}>查看全部 →</button></div>
                {topStories.length ? topStories.map((n, i) => (
                  <article className="storyRow" key={n.id}>
                    <div className="storyIndex">{String(i + 1).padStart(2, "0")}</div>
                    <div>
                      <div className="rowMeta"><span className="sourcePill">{n.source}</span><span>{formatAge(n.publishedAt)}</span><span className={`badge ${evidenceClass(n.evidence)}`}>{n.evidence}</span>{isNew(n) && <span className="badge new">NEW</span>}{(n.coverage || 1) >= 2 && <span className="badge hot">🔥 {n.coverage} 家</span>}</div>
                      <h3><a href={n.link} target="_blank" rel="noopener noreferrer" onClick={() => markRead(n)}>{tr(n.id)?.title || n.title}</a></h3>
                      <div className="storyTags"><span>{n.kind}</span>{n.game && <span>{n.game}</span>}</div>
                    </div>
                  </article>
                )) : <div className="empty"><Rss size={20} /><div><strong>{loading ? "正在抓取新聞…" : "目前沒有符合條件的新聞"}</strong><span>{loading ? "第一次載入約需 5~10 秒。" : "調整篩選或按右上角「更新」。"}</span></div></div>}
              </section>

              <section className="panel">
                <div className="panelHeader"><div><span className="sectionKicker">FEED HEALTH</span><h2>來源健康度</h2></div><Rss size={17} /></div>
                <div className="healthRows">
                  {RSS_SOURCES.map((s) => {
                    const st = statById.get(s.id);
                    const state = !health.loaded ? "wait" : !st ? "skip" : st.status;
                    return (
                      <div className="healthRow" key={s.id} title={st?.error || ""}>
                        <span>{s.name}</span>
                        <div className="progress"><i className={state === "error" ? "barBad" : ""} style={{ width: state === "ok" ? Math.max(12, Math.min(100, (st?.count || 0) * 5)) + "%" : state === "error" ? "100%" : "0%" }} /></div>
                        <b className={state === "error" ? "badText" : state === "ok" ? "goodText" : ""}>{state === "ok" ? st?.count + " 則" : state === "error" ? st?.error || "ERR" : state === "skip" ? "未選" : "—"}</b>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="panel">
                <div className="panelHeader"><div><span className="sectionKicker">HOT</span><h2>熱門事件</h2></div><button className="btn ghost" onClick={() => { setSortBy("heat"); setSection("news"); }}>依熱度看 →</button></div>
                {hotStories.length ? hotStories.map((n) => (
                  <article className="storyRow" key={n.id}>
                    <div className="storyIndex heat">🔥{n.coverage}</div>
                    <div>
                      <div className="rowMeta"><span className="sourcePill">{n.source}</span><span>{formatAge(n.publishedAt)}</span>{isNew(n) && <span className="badge new">NEW</span>}</div>
                      <h3><a href={n.link} target="_blank" rel="noopener noreferrer" onClick={() => markRead(n)}>{tr(n.id)?.title || n.title}</a></h3>
                      <div className="storyTags"><span>{n.coverage} 家報導</span>{n.game && <span>{n.game}</span>}</div>
                    </div>
                  </article>
                )) : <div className="empty"><Rss size={20} /><div><strong>{health.loaded ? "目前沒有多家媒體同時報導的事件" : "載入新聞後顯示"}</strong><span>同一件事被 2 家以上媒體報導時會出現在這裡。</span></div></div>}
              </section>
            </div>
          </div>
        )}

        {section === "news" && (
          <div className="content">
            <section className="panel">
              <div className="filterHeader">
                <div className="searchWrap"><Search size={16} /><input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜尋標題、摘要、譯文、媒體、遊戲…" /></div>
                <div className="filterGroup">
                  <select className="select" value={contentType} onChange={(e) => setContentType(e.target.value)} aria-label="類型">{ARTICLE_KINDS.map((x) => <option key={x}>{x}</option>)}</select>
                  <select className="select" value={gameFamily} onChange={(e) => setGameFamily(e.target.value)} aria-label="遊戲">{GAME_FAMILIES.map((x) => <option key={x}>{x}</option>)}</select>
                  <select className="select sourceSelect" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} aria-label="來源"><option value="全部">全部來源</option>{RSS_SOURCES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                  <select className="select" value={langFilter} onChange={(e) => setLangFilter(e.target.value as "all" | "zh" | "en" | "ja")} aria-label="語言"><option value="all">全部語言</option><option value="zh">中文來源</option><option value="en">英文來源</option><option value="ja">日文來源</option></select>
                </div>
              </div>
              <div className="toolrow">
                <span className="controlLabel">平台</span>
                <div className="controlChips">{PLATFORMS.slice(1).map((p) => <button key={p} className={platforms.includes(p) ? "chipActive" : "chip"} onClick={() => toggleList(setPlatforms, p)}>{p}</button>)}</div>
              </div>
              <div className="toolrow">
                <label className="checkLine"><input type="checkbox" checked={onlyWatched} onChange={(e) => setOnlyWatched(e.target.checked)} />只看追蹤遊戲</label>
                <label className="checkLine"><input type="checkbox" checked={onlySaved} onChange={(e) => setOnlySaved(e.target.checked)} />只看收藏（{savedArticles.length}）</label>
                <label className="checkLine"><input type="checkbox" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} />只看 NEW（{newCount}）</label>
                {newCount > 0 && <button className="btn ghost" onClick={() => setUnreadLinks([])}><CheckCircle2 size={13} />全部標為已讀</button>}
                <span className="controlLabel">排序</span>
                <select className="select modeSelect" value={sortBy} onChange={(e) => setSortBy(e.target.value as "latest" | "heat")}><option value="latest">最新</option><option value="heat">熱度（多家報導）</option></select>
                <span className="controlLabel">翻譯用詞</span>
                <select className="select modeSelect" value={translateMode} onChange={(e) => setTranslateMode(e.target.value as TranslateMode)}>{(Object.keys(MODE_LABEL) as TranslateMode[]).map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}</select>
                <button className="btn ghost" disabled={!filtered.length} onClick={() => { setFailedIds([]); void translateItems(filtered.slice(0, 20), true); }}><Sparkles size={13} />重翻前 20 則</button>
              </div>
              <div className="toolrow">
                <label className="checkLine">
                  <input type="checkbox" checked={filtered.length > 0 && filtered.every((n) => selected.includes(n.id))} onChange={(e) => setSelected(e.target.checked ? Array.from(new Set([...selected, ...filtered.slice(0, 8).map((n) => n.id)])).slice(0, 8) : selected.filter((id) => !filtered.some((n) => n.id === id)))} />
                  全選（最多 8 則）
                </label>
                <span className="smallMuted">已選 {selected.length}/8</span>
                {selected.length > 0 && <button className="btn ghost" onClick={() => setSelected([])}>清除選取</button>}
                <button className="btn primary" disabled={!selected.length} onClick={generateThreads}><Bot size={14} />生成 Threads</button>
              </div>
              <div className="newsStatus">
                <span><span className={health.loaded ? "dot" : "dot dotWarn"} /> {health.loaded ? "即時來源" : loading ? "載入中" : "尚未載入"}</span>
                <span>Feed {health.loaded ? health.successfulSources + "/" + health.feedCount : "—"}</span>
                <span>顯示 {filtered.length} 則</span>
                <span>翻譯（{engineLabel}）{translatedCount}/{needTranslation.length}{translating ? "（翻譯中 " + translating + "）" : ""}</span>
                <span>台北時間 {taipeiTime(health.generatedAt)}</span>
              </div>

              <div className="newsList">
                {filtered.length ? filtered.map((n) => {
                  const t = tr(n.id);
                  const chosen = selected.includes(n.id);
                  const failed = !t && failedIds.includes(n.id);
                  return (
                    <article className={chosen ? "newsCard selected" : "newsCard"} key={n.id}>
                      <label className="newsSelect"><input type="checkbox" checked={chosen} disabled={!chosen && selected.length >= 8} onChange={() => toggleList(setSelected, n.id)} /><span>加入 Threads</span></label>
                      <div className="newsTop"><span className="sourcePill">{n.source}</span><span>{formatAge(n.publishedAt)}</span><span className={`badge ${evidenceClass(n.evidence)}`}>{n.evidence}</span>{isNew(n) && <span className="badge new">NEW</span>}{(n.coverage || 1) >= 2 && <span className="badge hot">🔥 {n.coverage} 家報導</span>}</div>
                      <h3>{t?.title || n.title}</h3>
                      {t && <div className="origTitle">{n.title}</div>}
                      {t && <div className={isReviewed(n.id) ? "aiLabel" : "aiLabel aiPending"}><Sparkles size={11} />{t.engine === "gemini" ? "Gemini" : "Google"} · {MODE_LABEL[translateMode]} · {isReviewed(n.id) ? "已人工校對" : "待人工校對"}</div>}
                      {failed && <div className="aiLabel aiFailed"><CircleAlert size={11} />翻譯失敗，顯示原文</div>}
                      <p>{t?.excerpt || n.excerpt || "無摘要；開啟原文閱讀完整內容。"}</p>
                      {(n.related || []).length > 0 && (
                        <details className="related">
                          <summary>另外 {n.related!.length} 篇報導：{Array.from(new Set(n.related!.map((r) => r.source))).join("、")}</summary>
                          {n.related!.map((r) => <a key={r.link} href={r.link} target="_blank" rel="noopener noreferrer" onClick={() => markRead(n)}><b>{r.source}</b>{r.title}</a>)}
                        </details>
                      )}
                      <div className="newsBottom">
                        <div className="storyTags"><span>{n.kind}</span>{n.game && <span>{n.game}</span>}{n.lang && n.lang !== "en" && <span>{n.lang === "zh" ? "中文" : "日文"}</span>}</div>
                        <div className="rowButtons">
                          <button className={savedIds.has(n.id) ? "btn" : "btn ghost"} onClick={() => toggleSaved(n)}><Bookmark size={13} />{savedIds.has(n.id) ? "已收藏" : "收藏"}</button>
                          {n.lang === "zh" ? null : t ? (
                            <button className={isReviewed(n.id) ? "btn" : "btn ghost"} onClick={() => toggleReviewed(n.id)}><CheckCircle2 size={13} />{isReviewed(n.id) ? "已校對" : "標記校對"}</button>
                          ) : (
                            <button className="btn ghost" onClick={() => { setFailedIds((p) => p.filter((x) => x !== n.id)); void translateItems([n], true); }}><Sparkles size={13} />{failed ? "重試翻譯" : "翻譯"}</button>
                          )}
                          <a className="btn ghost" href={n.link} target="_blank" rel="noopener noreferrer" onClick={() => markRead(n)}><ExternalLink size={13} />原文</a>
                          <button className="btn" onClick={() => { setAuditText(t?.title || n.title); setAuditType(n.kind); setSection("audit"); }}><ShieldCheck size={13} />Claim</button>
                        </div>
                      </div>
                    </article>
                  );
                }) : (
                  <div className="empty">
                    <Rss size={20} />
                    <div>
                      <strong>{loading ? "正在抓取新聞…" : onlySaved ? "還沒有收藏的新聞" : "目前沒有符合條件的新聞"}</strong>
                      <span>{loading ? "第一次載入約需 5~10 秒。" : "放寬類型 / 遊戲 / 平台篩選，或按「更新」。"}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="toolrow">
                <div className="searchWrap"><Rss size={15} /><input className="input" value={feedQuery} onChange={(e) => setFeedQuery(e.target.value)} placeholder="（進階）伺服器端關鍵字：只抓含這個字的新聞，按「更新」生效" /></div>
              </div>
            </section>
          </div>
        )}

        {section === "sources" && (
          <div className="content">
            <section className="panel">
              <div className="panelHeader">
                <div><span className="sectionKicker">SOURCE REGISTRY</span><h2>來源與 Feed</h2><p className="smallMuted">RSS / Atom 會自動聚合；Web Only 保留作人工查證入口。新增 Steam 遊戲公告：在 lib/sources.ts 複製 steam-apex 那行，改成該遊戲的 App ID。</p></div>
                <span className="badge info">Feed {RSS_SOURCES.length} / 來源 {SOURCE_REGISTRY.length}</span>
              </div>
              <div className="toolrow">
                <div className="searchWrap"><Search size={15} /><input className="input" value={sourceSearch} onChange={(e) => setSourceSearch(e.target.value)} placeholder="搜尋來源、地區、平台、主題" /></div>
                <label className="checkLine"><input type="checkbox" checked={onlyAccounts} onChange={(e) => setOnlyAccounts(e.target.checked)} />只看帳號</label>
              </div>
              <div className="sources">
                <div className="sourceHead"><span>來源</span><span>類型</span><span>地區</span><span>平台</span><span>Feed</span><span>Evidence</span><span /></div>
                {sources.map((s) => {
                  const st = statById.get(s.id);
                  return (
                    <div className="sourceRow" key={s.id}>
                      <div className="entity"><div className="avatar">{initials(s.name)}</div><div><strong>{s.name}</strong><small>{s.note || s.focus.join(" · ")}</small></div></div>
                      <span className="smallMuted">{s.kind}</span>
                      <span className="smallMuted">{s.region}</span>
                      <span className="smallMuted">{s.platform}</span>
                      <span className={s.feedUrl ? (st?.status === "error" ? "feedBad" : "feedOk") : "feedWeb"}>{s.feedUrl ? (st ? (st.status === "ok" ? "RSS · " + st.count + " 則" : "RSS · " + (st.error || "失敗")) : "RSS / Atom") : "Web Only"}</span>
                      <span className={`badge ${evidenceClass(s.evidenceHint)}`}>{s.evidenceHint}</span>
                      <a className="btn ghost" href={s.url} target="_blank" rel="noopener noreferrer" aria-label={"開啟 " + s.name}><ExternalLink size={13} /></a>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {section === "accounts" && (
          <div className="content">
            <section className="panel">
              <div className="panelHeader">
                <div><span className="sectionKicker">ACCOUNT WATCHLIST</span><h2>個人帳號與平台帳號</h2><p className="smallMuted">X / Threads 帳號沒有免費的公開 Feed，這裡是人工巡看清單：標記關注的會排在最前面。帳號訊息屬早期訊號，不自動升級成已確認事實。</p></div>
                <label className="checkLine"><input type="checkbox" checked={onlyFollowed} onChange={(e) => setOnlyFollowed(e.target.checked)} />只看關注（{followed.length}）</label>
              </div>
              <div className="accountGrid">
                {accounts.map((a) => (
                  <article className={followed.includes(a.id) ? "accountCard followed" : "accountCard"} key={a.id}>
                    <div className="accountTop">
                      <div className="avatar">{initials(a.name)}</div>
                      <div><h3>{a.name}</h3><p>{a.platform}</p></div>
                      <span className={`badge ${evidenceClass(a.evidenceHint)}`}>{a.evidenceHint}</span>
                    </div>
                    <div className="accountMeta"><span><Globe2 size={11} />{a.region}</span><span><Crosshair size={11} />{a.focus.slice(0, 2).join(" · ")}</span></div>
                    <p className="accountNote">{a.note || "個人 / 社群訊息來源；逐條核實，不作單一來源定案。"}</p>
                    <div className="accountActions">
                      <a className="btn" href={a.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} />開啟</a>
                      <button className={followed.includes(a.id) ? "btn" : "btn ghost"} onClick={() => toggleList(setFollowed, a.id)}><Star size={13} />{followed.includes(a.id) ? "已關注" : "標記關注"}</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {section === "translate" && (
          <div className="content">
            <div className="translatorHero">
              <div>
                <span className="sectionKicker">GAME TRANSLATION LAB</span>
                <h2>{engine?.gemini ? "Gemini 翻譯：三種口吻改寫" : "免費翻譯＋遊戲術語保護"}</h2>
                {engine?.gemini ? (
                  <p>目前使用 Gemini（{engine.model}）。三種口吻會真的改寫：<b>貼近原文</b>忠實直譯；<b>新聞口吻</b>像台灣新聞編輯的正式寫法；<b>遊戲術語</b>像在巴哈、PTT 跟玩家聊天。術語表與自訂術語會一起交給 Gemini 參考。Gemini 額度用完或失敗時，會自動改用免費 Google 翻譯並提示你。</p>
                ) : (
                  <p>免費 Google 翻譯只能翻字，三個選項調整的是<b>用詞與格式</b>，不會改寫語氣：<b>貼近原文</b>只保護遊戲名稱與你的自訂術語；<b>台灣新聞格式</b>套用術語表、「」引號、125 萬、標題不加句號；<b>玩家用語</b>再加上第 27 賽季、造型、排位等玩家說法。標題裡沒有這些元素時，三個選項的結果會一樣，這是正常的。</p>
                )}
              </div>
              <span className={`badge ${engine?.gemini ? "good" : "neutral"}`}>{engine === null ? "檢查中" : engine.gemini ? "Gemini 已啟用" : "Google 免費翻譯"}</span>
            </div>
            <div className="grid2">
              <section className="panel">
                <div className="panelHeader">
                  <div><span className="sectionKicker">SOURCE</span><h2>原文</h2></div>
                  <select className="select" value={targetLang} onChange={(e) => setTargetLang(e.target.value)}><option value="zh-TW">繁體中文（台灣）</option><option value="en">English</option><option value="ja">日本語</option><option value="ko">한국어</option></select>
                </div>
                <textarea className="textarea" value={manualText} onChange={(e) => setManualText(e.target.value)} placeholder="貼上英文新聞、Patch Notes、X 貼文或遊戲內文字…" />
                <div className="toolrow">
                  <select className="select modeSelect" value={translateMode} onChange={(e) => setTranslateMode(e.target.value as TranslateMode)}>{(Object.keys(MODE_LABEL) as TranslateMode[]).map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}</select>
                  <button className="btn primary" onClick={translateManual} disabled={manualBusy || !manualText.trim()}><Sparkles size={15} />{manualBusy ? "翻譯中…" : "翻譯"}</button>
                </div>
              </section>
              <section className="panel">
                <div className="panelHeader"><div><span className="sectionKicker">OUTPUT</span><h2>翻譯結果</h2></div><span className={`badge ${manualReviewed ? "good" : "warn"}`}>{manualReviewed ? "已人工校對" : "待人工校對"}</span></div>
                <textarea className="textarea" value={manualOut} onChange={(e) => { setManualOut(e.target.value); setManualReviewed(false); }} placeholder="翻譯結果會出現在這裡，可以直接修改…" />
                <div className="toolrow">
                  <button className={manualReviewed ? "btn" : "btn ghost"} disabled={!manualOut} onClick={() => setManualReviewed((v) => !v)}><CheckCircle2 size={13} />{manualReviewed ? "已校對" : "標記已校對"}</button>
                  <button className="btn" disabled={!manualOut} onClick={() => void copy(manualOut, "manual")}><Clipboard size={13} />{copied === "manual" ? "已複製" : "複製"}</button>
                </div>
              </section>
            </div>
            <section className="panel" style={{ marginTop: 14 }}>
              <div className="panelHeader">
                <div><span className="sectionKicker">USER GLOSSARY</span><h2>自訂術語</h2><p className="smallMuted">英文 → 中文：翻譯前保護（例如 Wingman → 辛烷手槍）。中文 → 中文：翻譯後替換，用來修正翻譯引擎的固定錯譯（例如 傳奇 → 英雄）。自訂術語優先於內建術語。</p></div>
                <span className="badge neutral">{customTerms.length}/80</span>
              </div>
              <div className="glossaryEditor">
                <input className="input" value={newTermFrom} onChange={(e) => setNewTermFrom(e.target.value)} placeholder="原文，例如 Wingman" onKeyDown={(e) => e.key === "Enter" && addTerm()} />
                <input className="input" value={newTermTo} onChange={(e) => setNewTermTo(e.target.value)} placeholder="譯法，例如 辛烷手槍" onKeyDown={(e) => e.key === "Enter" && addTerm()} />
                <button className="btn primary" onClick={addTerm}><Plus size={13} />加入</button>
              </div>
              <div className="termCloud">
                {customTerms.map((t) => (
                  <span key={t.from} className="termCustom">{t.from} → {t.to}<button className="termRemove" onClick={() => setCustomTerms((p) => p.filter((x) => x.from !== t.from))} aria-label={"刪除 " + t.from}><Trash2 size={11} /></button></span>
                ))}
              </div>
              <details className="glossaryDetails">
                <summary>內建遊戲術語（{GLOSSARY.length} 個）</summary>
                <div className="termCloud">{GLOSSARY.map(([en, zh]) => <span key={en}>{en} → {zh}</span>)}</div>
              </details>
            </section>
          </div>
        )}

        {section === "audit" && (
          <div className="content">
            <div className="grid2">
              <section className="panel">
                <div className="panelHeader">
                  <div><span className="sectionKicker">CLAIM-LEVEL HINTS</span><h2>語句風險提示</h2><p className="smallMuted">只做字詞層級提示（中英文皆可）。沒偵測到風險不代表可以發布：結果預設是「待查證」，要看來源證據是否達到門檻。</p></div>
                </div>
                <div className="formGrid">
                  <div>
                    <label className="label">內容類型</label>
                    <select className="select" value={auditType} onChange={(e) => setAuditType(e.target.value)}>{AUDIT_TYPES.map((x) => <option key={x}>{x}</option>)}</select>
                  </div>
                  <div>
                    <label className="label">Evidence 等級說明</label>
                    <div className="evidenceRail">{EVIDENCE_LABELS.map((x) => <div className={"evidenceNode" + (x.id === (CONTENT_GATES[auditType] || "E3") ? " evidenceGate" : "")} key={x.id}><b>{x.id}</b><small>{x.label}</small></div>)}</div>
                  </div>
                </div>
                <label className="label" style={{ marginTop: 10 }}>標題 / 句子 / 段落</label>
                <textarea className="textarea" value={auditText} onChange={(e) => setAuditText(e.target.value)} />
                <div className="human5"><div><strong>人工 5 問</strong><small>誰說的？有獨立證據嗎？上下文完整嗎？因果有資料嗎？錯了 5 分鐘內能修正嗎？</small></div></div>
                <div className="toolrow">
                  <button className="btn primary" onClick={runAudit} disabled={!auditText.trim()}><ShieldCheck size={15} />加入提示紀錄</button>
                  <button className="btn" onClick={() => setAuditText("")}><XCircle size={14} />清空</button>
                </div>
              </section>
              <section className="panel">
                <div className="panelHeader"><div><span className="sectionKicker">SIGNAL VIEW</span><h2>即時偵測</h2></div><BrainCircuit size={17} /></div>
                <div className="decisionBox">
                  <div><span>內容類型</span><strong>{auditType}</strong></div>
                  <div><span>建議最低 Evidence</span><strong>{CONTENT_GATES[auditType] || "E3"}</strong></div>
                  <div><span>Scope（範圍）</span><strong className={liveSignals.absolute ? "badText" : "goodText"}>{liveSignals.absolute ? "範圍過大，需縮小" : "未偵測"}</strong></div>
                  <div><span>因果</span><strong className={liveSignals.causal ? "badText" : "goodText"}>{liveSignals.causal ? "需要資料支持" : "未偵測"}</strong></div>
                  <div className="decisionMain"><span>建議狀態</span><strong>{auditText.trim() ? DECISION_LABEL[assessClaim(auditText, auditType).decision] : "—"}</strong></div>
                </div>
              </section>
            </div>
            <section className="panel" style={{ marginTop: 14 }}>
              <div className="panelHeader"><div><span className="sectionKicker">RECENT</span><h2>提示紀錄</h2></div>{audits.length > 0 && <button className="btn ghost" onClick={() => setAudits([])}>清除</button>}</div>
              <div className="claimList">
                {audits.length ? audits.map((a) => (
                  <div className="claimRow" key={a.id}>
                    <span className="claimId">{a.id.slice(0, 5)}</span>
                    <div className="claimText"><strong>{a.text}</strong><small>{a.type} · {a.source}</small></div>
                    <span className="claimEvidence">≥{a.evidence}</span>
                    <span className="languageTag">{a.language}</span>
                    <span className={`badge ${decisionClass(a.decision)}`}>{DECISION_LABEL[a.decision]}</span>
                    <div className="reasonList">{a.reasons.slice(0, 2).map((r) => <span key={r}>• {r}</span>)}</div>
                  </div>
                )) : <div className="empty"><ShieldCheck size={18} /><div><strong>還沒有紀錄</strong><span>在新聞卡片按「Claim」或在上方貼上句子。</span></div></div>}
              </div>
            </section>
          </div>
        )}

        {section === "threads" && (
          <div className="content">
            <div className="translatorHero">
              <div>
                <span className="sectionKicker">THREADS POST STUDIO</span>
                <h2>新聞 → Threads</h2>
                <p>每篇都附來源名稱＋原文連結，每則保證在 {THREADS_LIMIT} 字內。「每則各一篇」適合分開發；「串成一串」會加上 (1/N) 編號。Threads 一篇只會有一個主題標籤，所以只放一個 hashtag。</p>
              </div>
              <span className="badge good">{selectedArticles.length} 則已選</span>
            </div>
            <div className="threadsLayout">
              <section className="panel">
                <div className="panelHeader"><div><span className="sectionKicker">SELECTED NEWS</span><h2>本次素材</h2></div><button className="btn ghost" onClick={() => setSection("news")}>回新聞雷達</button></div>
                {selectedArticles.length ? selectedArticles.map((n) => (
                  <div className="selectedStory" key={n.id}>
                    <div className="selectedStoryMeta">
                      <span className="sourcePill">{n.source}</span><span className={`badge ${evidenceClass(n.evidence)}`}>{n.evidence}</span>
                      {tr(n.id) && <span className={`badge ${isReviewed(n.id) ? "good" : "warn"}`}>{isReviewed(n.id) ? "譯文已校對" : "譯文待校對"}</span>}
                      <button className="btn ghost tiny" onClick={() => toggleList(setSelected, n.id)}>移除</button>
                    </div>
                    <strong>{tr(n.id)?.title || n.title}</strong>
                    <small>{n.kind} · {tr(n.id)?.excerpt || n.excerpt}</small>
                  </div>
                )) : <div className="empty"><Bot size={18} /><div><strong>還沒有選新聞</strong><span>回新聞雷達勾選素材（最多 8 則）。</span></div></div>}
              </section>
              <section className="panel">
                <div className="panelHeader"><div><span className="sectionKicker">EDITOR SETTINGS</span><h2>貼文設定</h2></div></div>
                <div className="optionGrid">
                  <div><label className="label">風格</label><select className="select" value={draftSettings.style} onChange={(e) => setDraftSettings((s) => ({ ...s, style: e.target.value as DraftSettings["style"] }))}><option value="news">新聞速報</option><option value="casual">玩家口語</option><option value="analysis">分析觀察</option><option value="data">數據整理</option></select></div>
                  <div><label className="label">格式</label><select className="select" value={draftSettings.format} onChange={(e) => setDraftSettings((s) => ({ ...s, format: e.target.value as DraftSettings["format"] }))}><option value="single">每則各一篇</option><option value="thread">串成一串（1/N）</option></select></div>
                  <div><label className="label">素材比例</label><select className="select" value={draftSettings.focus} onChange={(e) => setDraftSettings((s) => ({ ...s, focus: e.target.value as DraftSettings["focus"] }))}><option value="headline">標題為主（摘要只留一句）</option><option value="balanced">標題＋摘要</option><option value="body">摘要為主</option></select></div>
                  <div><label className="label">來源</label><span className="sourceLock"><CheckCircle2 size={12} />強制附名稱＋連結</span></div>
                </div>
                <label className="label" style={{ marginTop: 10 }}>我的看法（選填）</label>
                <textarea className="textarea opinion" value={myView} onChange={(e) => setMyView(e.target.value)} placeholder="寫你的觀察；會明確標示為「我的看法」，跟來源事實分開。" />
                <label className="checkLine"><input type="checkbox" checked={draftSettings.hashtags} onChange={(e) => setDraftSettings((s) => ({ ...s, hashtags: e.target.checked }))} />加上遊戲 hashtag（辨識不出遊戲就不加）</label>
                <div className="templateRow">
                  <label className="label">貼文範本</label>
                  <div className="toolrow" style={{ marginTop: 0 }}>
                    <select className="select" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                      <option value="">不使用範本</option>
                      {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <button className="btn ghost" onClick={() => setEditingTemplates((v) => !v)}>{editingTemplates ? "完成" : "管理範本"}</button>
                  </div>
                  {editingTemplates && (
                    <div className="templateEditor">
                      {templates.map((t) => (
                        <div className="templateItem" key={t.id}>
                          <input className="input" value={t.name} onChange={(e) => setTemplates((p) => p.map((x) => (x.id === t.id ? { ...x, name: e.target.value } : x)))} placeholder="範本名稱" />
                          <textarea className="textarea small" value={t.opening} onChange={(e) => setTemplates((p) => p.map((x) => (x.id === t.id ? { ...x, opening: e.target.value } : x)))} placeholder="開頭（放在每則最前面；串文只放第一則）" />
                          <textarea className="textarea small" value={t.closing} onChange={(e) => setTemplates((p) => p.map((x) => (x.id === t.id ? { ...x, closing: e.target.value } : x)))} placeholder="結尾（例如提問、簽名；串文只放最後一則）" />
                          <button className="btn ghost" onClick={() => { setTemplates((p) => p.filter((x) => x.id !== t.id)); if (templateId === t.id) setTemplateId(""); }}><Trash2 size={13} />刪除</button>
                        </div>
                      ))}
                      <button className="btn" disabled={templates.length >= 20} onClick={() => { const id = "t" + Date.now().toString(36); setTemplates((p) => [...p, { id, name: "新範本", opening: "", closing: "" }]); setTemplateId(id); }}><Plus size={13} />新增範本</button>
                    </div>
                  )}
                </div>
                <button className="btn primary full" disabled={!selectedArticles.length} onClick={generateThreads}><Sparkles size={15} />生成 / 重新生成</button>
              </section>
            </div>
            <section className="panel" style={{ marginTop: 14 }}>
              <div className="panelHeader">
                <div><span className="sectionKicker">DRAFT OUTPUT</span><h2>草稿</h2></div>
                {drafts.length > 1 && (
                  <div className="toolrow" style={{ marginTop: 0 }}>
                    <button className="btn ghost" onClick={() => setDraftIndex((i) => Math.max(0, i - 1))} disabled={draftIndex === 0}>上一則</button>
                    <span className="smallMuted">{draftIndex + 1}/{drafts.length}</span>
                    <button className="btn ghost" onClick={() => setDraftIndex((i) => Math.min(drafts.length - 1, i + 1))} disabled={draftIndex >= drafts.length - 1}>下一則</button>
                  </div>
                )}
              </div>
              {drafts.length ? (
                <>
                  <div className="draftMeta">
                    <span className={`badge ${charLength(drafts[draftIndex] || "") > THREADS_LIMIT ? "bad" : "good"}`}>{charLength(drafts[draftIndex] || "")}/{THREADS_LIMIT}</span>
                    {unreviewedSelected > 0 && <span className="badge warn">尚有 {unreviewedSelected} 則譯文待人工校對</span>}
                    {draftSettings.format === "thread" && drafts.length > 1 && <span className="smallMuted">串文：先發第 1 則，之後在 Threads 對自己的貼文按「回覆」，再回來按「下一則」→ 複製貼上。</span>}
                  </div>
                  <textarea className="textarea" rows={14} value={drafts[draftIndex] || ""} onChange={(e) => setDrafts((p) => p.map((x, i) => (i === draftIndex ? e.target.value : x)))} />
                  <div className="toolrow">
                    <a className="btn primary" href={THREADS_INTENT + encodeURIComponent(drafts[draftIndex] || "")} target="_blank" rel="noopener noreferrer"><Send size={13} />在 Threads 發這則</a>
                    <button className="btn" onClick={() => void copy(drafts[draftIndex] || "", "one")}><Clipboard size={13} />{copied === "one" ? "已複製" : "複製這則"}</button>
                    {drafts.length > 1 && <button className="btn" onClick={() => void copy(drafts.join("\n\n---\n\n"), "all")}><Clipboard size={13} />{copied === "all" ? "已複製" : "複製全部"}</button>}
                  </div>
                </>
              ) : <div className="empty"><Bot size={18} /><div><strong>還沒有草稿</strong><span>勾選新聞後按「生成」。</span></div></div>}
            </section>
          </div>
        )}

        {section === "rules" && (
          <div className="content">
            <section className="panel">
              <div className="panelHeader"><div><span className="sectionKicker">EVIDENCE GATES</span><h2>內容類型 × 建議最低證據</h2><p className="smallMuted">Claim 提示用的門檻表，可在 lib/audit.ts 的 CONTENT_GATES 調整。</p></div></div>
              <div className="matrixHead"><span>內容</span><span>最低 Evidence</span><span>說明</span></div>
              {Object.entries(CONTENT_GATES).map(([k, gate]) => (
                <div className="matrixRow" key={k}>
                  <strong>{k}</strong>
                  <span className={`badge ${evidenceClass(gate)}`}>{gate}</span>
                  <span>{EVIDENCE_LABELS.find((x) => x.id === gate)?.label}</span>
                </div>
              ))}
            </section>
            <section className="panel" style={{ marginTop: 14 }}>
              <div className="panelHeader"><div><span className="sectionKicker">LANGUAGE LEVELS</span><h2>發布語氣層級</h2></div></div>
              <div className="termCloud">{LANGUAGE_LEVELS.map((x) => <span key={x}>{x}</span>)}</div>
            </section>
          </div>
        )}

        {section === "settings" && (
          <div className="content">
            <section className="panel">
              <div className="panelHeader"><div><span className="sectionKicker">SETTINGS</span><h2>自動更新與本機資料</h2></div><Settings2 size={17} /></div>
              <div className="settingRow">
                <div><strong>每 10 分鐘自動更新新聞</strong><small>只在這個分頁開著、且在前景時更新。</small></div>
                <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
              </div>
              <div className="settingRow">
                <div><strong>Feed 健康度</strong><small>成功 / 總 Feed：{health.loaded ? health.successfulSources + "/" + health.feedCount : "尚未載入"}{health.failedSources.length ? "｜失敗：" + health.failedSources.join("、") : ""}</small></div>
                <strong>{health.failedSources.length ? health.failedSources.length + " 失敗" : health.loaded ? "正常" : "—"}</strong>
              </div>
              <div className="settingRow">
                <div><strong>翻譯快取</strong><small>已存 {Object.keys(trCache).length} 筆譯文在這台裝置；重新整理不會重翻。清除後會重新翻譯，校對紀錄也會清掉。</small></div>
                <button className="btn" onClick={() => { setTrCache({}); setReviewed([]); setFailedIds([]); }}><Trash2 size={13} />清除</button>
              </div>
              <div className="settingRow">
                <div><strong>設定備份</strong><small>追蹤清單、篩選、收藏、關注帳號、自訂術語、貼文設定都會匯出。換電腦或換瀏覽器時匯入即可。</small></div>
                <div className="toolrow" style={{ marginTop: 0 }}>
                  <button className="btn" onClick={exportState}><Download size={13} />匯出 JSON</button>
                  <button className="btn" onClick={importState}><Upload size={13} />匯入 JSON</button>
                </div>
              </div>
            </section>
            <section className="panel" style={{ marginTop: 14 }}>
              <div className="panelHeader"><div><span className="sectionKicker">SYNC</span><h2>跨裝置同步</h2><p className="smallMuted">收藏、追蹤清單、自訂術語、關注帳號、貼文範本與篩選設定，在電腦和手機之間自動同步（翻譯快取與已讀紀錄各裝置分開）。</p></div><span className={`badge ${syncCode && syncAvailable ? "good" : "neutral"}`}>{syncAvailable === null ? "檢查中" : !syncAvailable ? "未啟用" : syncCode ? "同步中" : "未設定"}</span></div>
              {syncAvailable === false && (
                <div className="syncSetup">
                  <strong>需要先在 Vercel 建立免費的同步儲存空間（約 2 分鐘，只需要做一次）：</strong>
                  <ol>
                    <li>Vercel 專案 → 上方 <b>Storage</b> → <b>Create Database</b> → 選 <b>Upstash for Redis</b>（選 Free 方案）</li>
                    <li>建立後按 <b>Connect Project</b>，選這個專案（環境變數會自動加好，不用複製任何 key）</li>
                    <li>到 <b>Deployments</b> 對最新一筆按 <b>Redeploy</b>，回來重新整理這頁</li>
                  </ol>
                </div>
              )}
              {syncAvailable && !syncCode && (
                <div className="syncSetup">
                  <div className="settingRow">
                    <div><strong>第一台裝置</strong><small>建立同步碼，之後在其他裝置輸入同一組同步碼即可。</small></div>
                    <button className="btn primary" onClick={() => { startSync(makeSyncCode()); setShowCode(true); localUpdatedAt.current = Date.now(); }}>建立同步碼</button>
                  </div>
                  <div className="settingRow">
                    <div><strong>其他裝置</strong><small>貼上第一台裝置的同步碼（會以雲端資料為準，覆蓋這台的設定）。</small></div>
                    <div className="toolrow" style={{ marginTop: 0 }}>
                      <input className="input" value={syncInput} onChange={(e) => setSyncInput(e.target.value)} placeholder="貼上同步碼" />
                      <button className="btn" disabled={!syncInput.trim()} onClick={() => startSync(syncInput)}>加入</button>
                    </div>
                  </div>
                </div>
              )}
              {syncAvailable && syncCode && (
                <div className="syncSetup">
                  <div className="settingRow">
                    <div><strong>同步碼</strong><small>在其他裝置的「設定 → 跨裝置同步 → 其他裝置」貼上。請像密碼一樣保管，拿到的人能看到並修改你的設定。</small></div>
                    <div className="toolrow" style={{ marginTop: 0 }}>
                      <code className="syncCode">{showCode ? syncCode : syncCode.slice(0, 5) + "-•••••-•••••-•••••"}</code>
                      <button className="btn ghost" onClick={() => setShowCode((v) => !v)}>{showCode ? "隱藏" : "顯示"}</button>
                      <button className="btn" onClick={() => void copy(syncCode, "sync")}><Clipboard size={13} />{copied === "sync" ? "已複製" : "複製"}</button>
                    </div>
                  </div>
                  <div className="settingRow">
                    <div><strong>狀態</strong><small>{syncStatus || "—"}</small></div>
                    <div className="toolrow" style={{ marginTop: 0 }}>
                      <button className="btn" onClick={() => void pushNow(syncCode)}><RefreshCw size={13} />立即同步</button>
                      <button className="btn ghost" onClick={stopSync}>停止同步</button>
                    </div>
                  </div>
                </div>
              )}
              {syncStatus && !syncCode && <p className="smallMuted">{syncStatus}</p>}
            </section>
            <section className="panel" style={{ marginTop: 14 }}>
              <div className="panelHeader"><div><span className="sectionKicker">WATCH GAMES</span><h2>追蹤清單</h2><p className="smallMuted">「只看追蹤遊戲」會用這份清單過濾。</p></div><span className="badge neutral">{watch.length}</span></div>
              <div className="controlChips wrap">{GAME_FAMILIES.slice(1).map((x) => <button className={watch.includes(x) ? "chipActive" : "chip"} key={x} onClick={() => toggleList(setWatch, x)}>{x}</button>)}</div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
