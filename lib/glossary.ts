// 遊戲術語表：前端顯示與翻譯 API 共用同一份。

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
