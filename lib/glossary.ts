// 遊戲術語表：前端顯示與翻譯 API 共用同一份。
//
// 三種翻譯模式的差別：
// - 貼近原文：只保護專有名詞、網址與自訂術語，其餘照翻譯引擎原樣輸出。
// - 新聞口吻：套用 GLOSSARY，並整理成台灣新聞寫法（「」引號、報導、萬 / 億、標題不加句號）。
// - 遊戲術語：套用 GLOSSARY + GAMER_GLOSSARY，用玩家社群慣用語（第 N 賽季、造型、排位…）。

/** 英文 → 繁中。翻譯前會先把這些詞換成佔位符，翻譯完再換回中文，Google 才不會亂翻。 */
export const GLOSSARY: Array<[string, string]> = [
  ["patch notes", "更新說明"], ["patch", "更新檔"], ["hotfix", "熱修正"], ["live service", "長期營運"], ["live-service", "長期營運"],
  ["battle pass", "戰鬥通行證"], ["cross-play", "跨平台遊玩"], ["crossplay", "跨平台遊玩"], ["cross-progression", "跨平台進度"],
  ["matchmaking", "配對"], ["ranked mode", "排位模式"], ["loadout", "配裝"], ["datamined", "資料探勘"],
  ["datamine", "資料探勘"], ["dataminer", "資料探勘者"], ["early access", "搶先體驗"], ["season pass", "季票"],
  ["free-to-play", "免費遊玩"], ["free to play", "免費遊玩"], ["microtransactions", "微交易"], ["loot box", "戰利品箱"],
  ["buff", "強化"], ["buffed", "強化"], ["nerf", "削弱"], ["nerfed", "削弱"], ["cooldown", "冷卻時間"],
  ["frame rate", "幀率"], ["framerate", "幀率"], ["remaster", "重製版"], ["remake", "重製"], ["DLC", "DLC"],
  ["roguelike", "Roguelike"], ["soulslike", "類魂"], ["souls-like", "類魂"], ["open world", "開放世界"],
  ["showcase", "發表會"], ["State of Play", "State of Play"], ["Nintendo Direct", "Nintendo Direct"],
];

/** 專有名詞：保持英文原樣，不讓翻譯引擎亂翻。 */
export const PROPER_TERMS = [
  "Apex Legends", "Counter-Strike 2", "Call of Duty", "Grand Theft Auto", "GTA 6", "GTA VI", "Monster Hunter Wilds", "Monster Hunter",
  "Resident Evil", "Final Fantasy", "Helldivers 2", "Fortnite", "Overwatch", "VALORANT", "League of Legends", "Minecraft", "Roblox",
  "Nintendo Switch", "Switch 2", "PlayStation Plus", "PlayStation", "PS5 Pro", "PS5", "Xbox Game Pass", "Game Pass", "Xbox Series X",
  "Xbox Series S", "Xbox", "Steam Deck", "Steam", "Epic Games Store", "Epic Games", "Battle.net", "EA Sports", "Ubisoft",
  "Electronic Arts", "Capcom", "Square Enix", "Kojima Productions", "FromSoftware", "Bandai Namco", "Take-Two Interactive", "Valve",
  "Rockstar Games", "Respawn Entertainment", "Activision", "Blizzard", "Infinity Ward", "Treyarch", "Bungie", "Riot Games",
];

/** Google 繁中輸出常混入的大陸用語 → 台灣用語。只做意思不變的替換。 */
export const TW_WORDING: Array<[string, string]> = [
  ["視頻", "影片"], ["質量", "品質"], ["信息", "資訊"], ["軟件", "軟體"], ["硬件", "硬體"], ["網絡", "網路"], ["默認", "預設"],
  ["服務器", "伺服器"], ["屏幕", "螢幕"], ["鼠標", "滑鼠"], ["程序員", "程式設計師"], ["數據庫", "資料庫"], ["界面", "介面"],
  ["發佈", "發布"], ["游戲", "遊戲"], ["在線", "線上"], ["高清", "高畫質"],
];

/** 只在「遊戲術語」模式使用的玩家用語（翻譯前保護）。 */
export const GAMER_GLOSSARY: Array<[string, string]> = [
  ["skins", "造型"], ["skin", "造型"], ["cosmetics", "外觀道具"], ["cosmetic", "外觀道具"],
  ["ranked", "排位"], ["ranked split", "排位賽階段"], ["map rotation", "地圖輪替"], 
  ["overpowered", "過強"], ["OP", "過強"], ["underpowered", "過弱"],
  ["loot", "戰利品"], ["drop rate", "掉落率"], ["drop rates", "掉落率"], ["gacha", "抽卡"],
  ["grind", "刷"], ["grinding", "刷"], ["speedrun", "速通"], ["speedrunner", "速通玩家"],
  ["queue", "排隊配對"], ["queue times", "排隊時間"], ["lobby", "大廳"], ["squad", "小隊"], ["duos", "雙人組"],
  ["battle royale", "大逃殺"], ["hero shooter", "英雄射擊"], ["extraction shooter", "撤離射擊"],
  ["endgame", "終局內容"], ["community", "玩家社群"], ["raid", "團隊副本"], ["boss", "Boss"], ["NPC", "NPC"], ["PvP", "PvP"], ["PvE", "PvE"],
];

/** 「遊戲術語」模式：有編號的固定說法，翻譯前直接換成中文。 */
export const GAMER_PATTERNS: Array<[RegExp, string]> = [
  [/\bSeason\s+(\d+)\b/gi, "第 $1 賽季"],
  [/\bChapter\s+(\d+)\b/gi, "第 $1 章"],
  [/\bAct\s+(\d+)\b/g, "第 $1 幕"],
  [/\bSplit\s+(\d+)\b/gi, "第 $1 階段"],
  [/\bPatch\s+(\d+(?:\.\d+)+)\b/gi, "$1 版更新"],
];

/** 「遊戲術語」模式：翻譯後把翻譯引擎的一般用語換成玩家用語（只換在遊戲語境下意思不變的詞）。 */
export const GAMER_WORDING: Array<[string, string]> = [
  ["用戶", "玩家"], ["使用者", "玩家"], ["皮膚", "造型"], ["排名賽", "排位賽"], ["排名模式", "排位模式"],
  ["遊戲玩法", "玩法"], ["多人遊戲模式", "多人模式"],
];

/** 「新聞口吻」模式：翻譯後改成台灣新聞常見寫法（意思不變）。 */
export const NEWS_WORDING: Array<[string, string]> = [
  ["報道", "報導"], ["據報道", "據報導"], ["宣布了", "宣布"], ["表示說", "表示"], ["發布了", "發布"],
  ["公佈", "公布"], ["透露了", "透露"],
];
