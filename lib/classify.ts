// 前端與後端共用的分類、遊戲辨識、平台比對與文字工具。
// 只放純函式，不依賴 Node 或瀏覽器 API。

/** 分類器實際會產生的類型（新聞雷達的篩選選單只列這些，避免選了永遠 0 則）。 */
export const ARTICLE_KINDS = [
  "全部",
  "官方公告",
  "爆料",
  "延期",
  "發售",
  "版本更新",
  "評測",
  "價格 / Deals",
  "收購 / 投資",
  "裁員 / 勞動",
  "電競",
  "硬體 / 平台",
  "數據報導",
  "一般新聞",
] as const;

const KIND_RULES: Array<[string, RegExp]> = [
  ["爆料", /\b(leak|leaked|leaks|rumou?r|rumou?red|insider|datamine[ds]?|reportedly|allegedly)\b|疑似|爆料|傳聞|據傳|流出/i],
  ["延期", /\b(delay|delayed|delays|postpone[ds]?|pushed back)\b|延期|延後/i],
  ["收購 / 投資", /\b(acquir\w*|acquisition|merger|invest\w*|buyout|takeover)\b|收購|併購|投資/i],
  ["裁員 / 勞動", /\b(layoffs?|laid off|lays off|unioni[sz]\w*|on strike|redundanc\w*)\b|裁員|工會|罷工/i],
  ["評測", /\b(review|reviews|reviewed|impressions)\b|評測|試玩心得/i],
  ["價格 / Deals", /\b(price|priced|pricing|sale|deals?|discount\w*|\d+% off|free to keep|free this week)\b|價格|折扣|特價|限免/i],
  ["版本更新", /\b(patch|patches|hotfix|update|updated|version|season \d+|title update|changelog)\b|更新|版本|補丁|熱修正|新賽季/i],
  ["發售", /\b(release date|launch(es|ed)?|out now|available now|pre-?orders?|coming to)\b|發售|上市|推出|預購/i],
  ["電競", /\b(esports?|tournament|championship|vct|playoffs?|grand finals?)\b|電競|錦標賽|世界賽/i],
  ["硬體 / 平台", /\b(console|hardware|gpu|cpu|ps5 pro|switch 2|steam deck|handheld|controller|xbox series)\b|主機|硬體|掌機|顯示卡/i],
  ["數據報導", /\d[\d,.]*\s*(k|m|million)?\s*(concurrent )?players\b|\b(concurrent|all-time peak|units sold|copies sold|revenue|performance|fps|frame ?rate|benchmark)\b|玩家數|銷量|營收|效能|幀率|同時在線/i],
];

/** 依標題（加上摘要）分類；官方來源的一般新聞歸為「官方公告」。 */
export function classify(title: string, excerpt = "", sourceKind = ""): string {
  const text = title + " " + excerpt.slice(0, 160);
  // 標題優先：先只看標題，標題沒有線索才看摘要
  for (const target of [title, text]) {
    for (const [kind, re] of KIND_RULES) if (re.test(target)) return kind;
  }
  if (sourceKind.startsWith("官方")) return "官方公告";
  return "一般新聞";
}

/** 遊戲 / 平台家族；名稱需與 lib/sources.ts 的 GAME_FAMILIES 一致。 */
const GAME_RULES: Array<[string, RegExp]> = [
  ["Apex Legends", /\bapex legends?\b|\bapex\b|apex 英雄/i],
  ["Call of Duty", /\bcall of duty\b|\bcod\b|black ops|modern warfare|warzone/i],
  ["Fortnite", /\bfortnite\b|要塞英雄/i],
  ["Overwatch", /\boverwatch\b|鬥陣特攻/i],
  ["Valorant", /\bvalorant\b|特戰英豪/i],
  ["League of Legends", /\bleague of legends\b|\blol\b|英雄聯盟/i],
  ["Counter-Strike 2", /\bcounter-?strike\b|\bcs2\b|\bcs:?go\b/i],
  ["GTA", /\bgta\b|grand theft auto|俠盜獵車/i],
  ["Pokémon", /\bpok[eé]mon\b|寶可夢/i],
  ["Monster Hunter", /\bmonster hunter\b|魔物獵人/i],
  ["Final Fantasy", /\bfinal fantasy\b|\bff ?(vii|xiv|xvi|7|14|16)\b|太空戰士/i],
  ["Resident Evil", /\bresident evil\b|惡靈古堡/i],
  ["Minecraft", /\bminecraft\b|當個創世神/i],
  ["Elden Ring", /\belden ring\b|艾爾登法環/i],
  ["The Elder Scrolls", /\belder scrolls\b|\bskyrim\b|上古卷軸/i],
  ["Fallout", /\bfallout\b|異塵餘生/i],
  ["The Witcher", /\bwitcher\b|巫師/i],
  ["EA Sports FC", /\bea sports fc\b|\bea fc\b|\bfc 2\d\b/i],
  ["NBA 2K", /\bnba 2k/i],
  ["Nintendo", /\bnintendo\b|\bswitch 2\b|\bswitch (oled|lite|online)\b|任天堂/i],
  ["PlayStation", /\bplaystation\b|\bps5\b|\bps4\b|\bps plus\b/i],
  ["Xbox", /\bxbox\b|game pass/i],
  ["Steam", /\bsteam\b|\bvalve\b/i],
];

/** 由標題猜遊戲；猜不到回傳空字串（不要回傳「自動辨識」這種假值，會被當成 hashtag）。 */
export function guessGame(text: string, hint = ""): string {
  if (hint) return hint;
  for (const [game, re] of GAME_RULES) if (re.test(text)) return game;
  return "";
}

/** 判斷文章是否屬於某個遊戲 / 平台家族（不分大小寫）。 */
export function matchesGame(articleText: string, articleGame: string, family: string): boolean {
  if (articleGame === family) return true;
  const rule = GAME_RULES.find(([g]) => g === family);
  if (rule) return rule[1].test(articleText);
  return articleText.toLowerCase().includes(family.toLowerCase());
}

const PLATFORM_RULES: Record<string, RegExp> = {
  PC: /\bpc\b|\bsteam\b|\bwindows\b|\bepic games store\b/i,
  PS5: /\bps5\b|playstation 5/i,
  PS4: /\bps4\b|playstation 4/i,
  "Xbox Series": /xbox series|\bseries [xs]\b/i,
  "Xbox One": /xbox one/i,
  "Switch 2": /switch 2/i,
  // 「Switch」不能吃到「Switch 2」
  Switch: /\bSwitch\b(?!\s*2)/,
  Mobile: /\bmobile\b|\bios\b|\bandroid\b|\biphone\b|手機/i,
  "Steam Deck": /steam deck/i,
  Cloud: /\bcloud\b|xcloud|geforce now|雲端/i,
};

export function matchesPlatform(text: string, platform: string): boolean {
  const re = PLATFORM_RULES[platform];
  return re ? re.test(text) : text.toLowerCase().includes(platform.toLowerCase());
}

/** 以「看得到的字數」計算（emoji 算 1 個字）。 */
export function charLength(text: string): number {
  return Array.from(text).length;
}

/** 依句子切段，每段不超過 max 字。 */
export function splitUnder(text: string, max: number): string[] {
  if (charLength(text) <= max) return [text];
  const sentences = text.match(/[^.!?。！？\n]+[.!?。！？]*\n*/g) || [text];
  const out: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (charLength(current + sentence) > max && current) {
      out.push(current.trim());
      current = sentence;
    } else current += sentence;
  }
  if (current.trim()) out.push(current.trim());
  return out.flatMap((x) => {
    const chars = Array.from(x);
    if (chars.length <= max) return [x];
    return Array.from({ length: Math.ceil(chars.length / max) }, (_, i) => chars.slice(i * max, (i + 1) * max).join(""));
  });
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", mdash: "—", ndash: "–",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", laquo: "«", raquo: "»", bull: "•", middot: "·",
  copy: "©", reg: "®", trade: "™", eacute: "é", egrave: "è", ouml: "ö", uuml: "ü", auml: "ä",
};

export function decodeEntities(v: string): string {
  return v.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      try { return Number.isFinite(n) && n > 0 ? String.fromCodePoint(n) : whole; } catch { return whole; }
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? whole;
  });
}

/** 把 RSS 欄位轉成純文字：處理 CDATA、跳脫過的 HTML、雙重跳脫。 */
export function toPlainText(v: string): string {
  let out = v.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  // 先解碼再去標籤，跑兩輪以處理 &lt;p&gt; 與 &amp;lt;p&amp;gt; 這類跳脫 HTML
  for (let i = 0; i < 2; i++) {
    out = decodeEntities(out);
    out = out.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ");
  }
  return out.replace(/\s+/g, " ").trim();
}
