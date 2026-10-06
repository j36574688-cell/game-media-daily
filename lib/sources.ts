export type SourceKind = "官方"|"官方 / 平台"|"官方 / 平台帳號"|"新聞媒體"|"資料/追蹤"|"社群/平台"|"個人帳號";
export type SourceRecord = {id:string;name:string;kind:SourceKind;platform:string;region:string;focus:string[];url:string;evidenceHint:"E5"|"E4"|"E3"|"E2"|"E1";feedUrl?:string;note?:string;
  /** 這個 Feed 固定只報導某款遊戲時填寫（例如 Steam 單一遊戲新聞），名稱需對應 GAME_FAMILIES */
  game?:string};

export const SOURCE_REGISTRY:SourceRecord[]=[
{id:"ign",name:"IGN",kind:"新聞媒體",platform:"Web / YouTube / X",region:"全球",focus:["綜合","新聞","評測","指南"],url:"https://www.ign.com/news",evidenceHint:"E4",feedUrl:"https://www.ign.com/rss/v2/articles/feed"},
{id:"gamespot",name:"GameSpot",kind:"新聞媒體",platform:"Web / YouTube / X",region:"全球",focus:["新聞","評測","指南"],url:"https://www.gamespot.com/news/",evidenceHint:"E4",feedUrl:"https://www.gamespot.com/feeds/mashup/"},
{id:"eurogamer",name:"Eurogamer",kind:"新聞媒體",platform:"Web / YouTube",region:"歐洲",focus:["新聞","分析","評測","技術"],url:"https://www.eurogamer.net/",evidenceHint:"E4",feedUrl:"https://eurogamer.net/feed"},
{id:"gematsu",name:"Gematsu",kind:"新聞媒體",platform:"Web / X",region:"日本 / 亞洲",focus:["日本遊戲","發售","公告","消息"],url:"https://www.gematsu.com/",evidenceHint:"E4",feedUrl:"https://gematsu.com/feed"},
{id:"pcgamer",name:"PC Gamer",kind:"新聞媒體",platform:"Web / YouTube",region:"全球",focus:["PC","硬體","新聞","評測"],url:"https://www.pcgamer.com/",evidenceHint:"E4",feedUrl:"https://www.pcgamer.com/rss/"},
{id:"rps",name:"Rock Paper Shotgun",kind:"新聞媒體",platform:"Web",region:"英國",focus:["PC","獨立遊戲","新聞","評測"],url:"https://www.rockpapershotgun.com/",evidenceHint:"E4",feedUrl:"https://www.rockpapershotgun.com/feed"},
{id:"polygon",name:"Polygon",kind:"新聞媒體",platform:"Web / YouTube",region:"美國",focus:["新聞","文化","分析","評測"],url:"https://www.polygon.com/gaming",evidenceHint:"E4",feedUrl:"https://www.polygon.com/rss/index.xml"},
{id:"kotaku",name:"Kotaku",kind:"新聞媒體",platform:"Web",region:"美國",focus:["新聞","社群","文化","評論"],url:"https://kotaku.com/",evidenceHint:"E3",feedUrl:"https://kotaku.com/rss"},
{id:"vg247",name:"VG247",kind:"新聞媒體",platform:"Web",region:"英國",focus:["快訊","新聞","指南"],url:"https://www.vg247.com/",evidenceHint:"E3",feedUrl:"https://vg247.com/feed"},
{id:"pushsquare",name:"Push Square",kind:"新聞媒體",platform:"Web",region:"英國",focus:["PlayStation","新聞","評測","指南"],url:"https://www.pushsquare.com/",evidenceHint:"E3",feedUrl:"https://www.pushsquare.com/feeds/latest"},
{id:"purenxbox",name:"Pure Xbox",kind:"新聞媒體",platform:"Web",region:"英國",focus:["Xbox","Game Pass","新聞"],url:"https://www.purexbox.com/",evidenceHint:"E3",feedUrl:"https://www.purexbox.com/feeds/latest"},
{id:"nintendolife",name:"Nintendo Life",kind:"新聞媒體",platform:"Web / YouTube",region:"英國",focus:["Nintendo","Switch 2","新聞","評測"],url:"https://www.nintendolife.com/",evidenceHint:"E3",feedUrl:"https://www.nintendolife.com/feeds/latest"},
{id:"insidergaming",name:"Insider Gaming",kind:"新聞媒體",platform:"Web / YouTube",region:"全球",focus:["爆料","產業","獨家","新聞"],url:"https://insider-gaming.com/",evidenceHint:"E3",note:"網站不允許自動抓取，保留人工查看。"},
{id:"gamesindustry",name:"GamesIndustry.biz",kind:"新聞媒體",platform:"Web",region:"產業",focus:["產業","商業","裁員","併購"],url:"https://www.gamesindustry.biz/",evidenceHint:"E4",feedUrl:"https://www.gamesindustry.biz/feed"},
{id:"gamedeveloper",name:"Game Developer",kind:"新聞媒體",platform:"Web",region:"產業",focus:["開發","商業","技術","工作室"],url:"https://www.gamedeveloper.com/",evidenceHint:"E4",feedUrl:"https://www.gamedeveloper.com/rss.xml"},
{id:"theverge",name:"The Verge / Games",kind:"新聞媒體",platform:"Web",region:"美國",focus:["平台","硬體","產業","遊戲"],url:"https://www.theverge.com/games",evidenceHint:"E4",feedUrl:"https://www.theverge.com/rss/games/index.xml"},
{id:"arstechnica",name:"Ars Technica / Gaming",kind:"新聞媒體",platform:"Web",region:"美國",focus:["技術","平台","產業"],url:"https://arstechnica.com/gaming/",evidenceHint:"E4",feedUrl:"https://feeds.arstechnica.com/arstechnica/gaming"},
{id:"wccftech",name:"Wccftech Gaming",kind:"新聞媒體",platform:"Web",region:"全球",focus:["PC","硬體","新聞","消息"],url:"https://wccftech.com/gaming/",evidenceHint:"E3",feedUrl:"https://wccftech.com/topic/games/feed/"},
{id:"digitalfoundry",name:"Digital Foundry",kind:"資料/追蹤",platform:"Web / YouTube",region:"全球",focus:["技術分析","效能","畫質","主機"],url:"https://www.digitalfoundry.net/",evidenceHint:"E4"},
{id:"playstationblog",name:"PlayStation Blog",kind:"官方",platform:"Web",region:"Sony",focus:["PS5","公告","更新"],url:"https://blog.playstation.com/",evidenceHint:"E5",feedUrl:"https://blog.playstation.com/feed/"},
{id:"xboxwire",name:"Xbox Wire",kind:"官方",platform:"Web / X",region:"Microsoft",focus:["Xbox","Game Pass","公告","更新"],url:"https://news.xbox.com/en-us/",evidenceHint:"E5",feedUrl:"https://news.xbox.com/en-us/feed/"},
{id:"steamnews",name:"Steam News",kind:"官方 / 平台",platform:"Steam",region:"Valve",focus:["更新","版本","活動","商店"],url:"https://store.steampowered.com/news/",evidenceHint:"E5"},
{id:"epicnews",name:"Epic Games Newsroom",kind:"官方",platform:"Web",region:"Epic",focus:["Fortnite","Epic","Store","更新"],url:"https://www.epicgames.com/site/en-US/news",evidenceHint:"E5"},
{id:"ea",name:"EA News",kind:"官方",platform:"Web",region:"EA",focus:["Apex","Battlefield","公告"],url:"https://www.ea.com/news",evidenceHint:"E5"},
{id:"ubisoft",name:"Ubisoft News",kind:"官方",platform:"Web",region:"Ubisoft",focus:["Rainbow Six","Assassin's Creed","公告"],url:"https://news.ubisoft.com/",evidenceHint:"E5"},
{id:"blizzard",name:"Blizzard News",kind:"官方",platform:"Web",region:"Blizzard",focus:["Overwatch","Diablo","WoW","公告"],url:"https://news.blizzard.com/",evidenceHint:"E5"},
{id:"riot",name:"Riot Games",kind:"官方",platform:"Web",region:"Riot",focus:["League","VALORANT","公告","電競"],url:"https://www.riotgames.com/en/news",evidenceHint:"E5"},
{id:"apex",name:"Apex Legends News",kind:"官方",platform:"Web",region:"EA / Respawn",focus:["Apex","賽季","平衡","公告"],url:"https://www.ea.com/games/apex-legends/news",evidenceHint:"E5"},
{id:"steam-apex",name:"Steam · Apex Legends",kind:"官方 / 平台",platform:"Steam",region:"EA / Respawn",focus:["Apex","更新","賽季"],url:"https://store.steampowered.com/news/app/1172470",evidenceHint:"E5",feedUrl:"https://store.steampowered.com/feeds/news/app/1172470/",game:"Apex Legends"},
{id:"steam-cs2",name:"Steam · Counter-Strike 2",kind:"官方 / 平台",platform:"Steam",region:"Valve",focus:["CS2","更新","版本"],url:"https://store.steampowered.com/news/app/730",evidenceHint:"E5",feedUrl:"https://store.steampowered.com/feeds/news/app/730/",game:"Counter-Strike 2"},
{id:"steam-mhwilds",name:"Steam · Monster Hunter Wilds",kind:"官方 / 平台",platform:"Steam",region:"Capcom",focus:["Monster Hunter","更新","活動"],url:"https://store.steampowered.com/news/app/2246340",evidenceHint:"E5",feedUrl:"https://store.steampowered.com/feeds/news/app/2246340/",game:"Monster Hunter"},
{id:"steamdb",name:"SteamDB",kind:"資料/追蹤",platform:"Web",region:"Steam",focus:["更新","Build","價格","玩家數"],url:"https://steamdb.info/",evidenceHint:"E3"},
{id:"steamcharts",name:"SteamCharts",kind:"資料/追蹤",platform:"Web",region:"Steam",focus:["玩家數","歷史峰值","趨勢"],url:"https://steamcharts.com/",evidenceHint:"E3"},
{id:"steamspy",name:"Steam Spy",kind:"資料/追蹤",platform:"Web",region:"Steam",focus:["銷售估算","擁有量","數據"],url:"https://steamspy.com/",evidenceHint:"E3",note:"第三方估算，不能當官方銷售數字。"},
{id:"vginsights",name:"VG Insights",kind:"資料/追蹤",platform:"Web",region:"Steam",focus:["Steam 商業數據","收入估算","市場"],url:"https://vginsights.com/",evidenceHint:"E3"},
{id:"metacritic",name:"Metacritic",kind:"資料/追蹤",platform:"Web",region:"全球",focus:["評分","評論聚合"],url:"https://www.metacritic.com/",evidenceHint:"E2",note:"聚合評分，不等於事實證據。"},
{id:"opencritic",name:"OpenCritic",kind:"資料/追蹤",platform:"Web",region:"全球",focus:["評測聚合","評分"],url:"https://opencritic.com/",evidenceHint:"E2"}
];

export const PERSONAL_ACCOUNTS:SourceRecord[]=[
{id:"wario64",name:"Wario64",kind:"個人帳號",platform:"X / Bluesky / Threads",region:"美國",focus:["遊戲消息","商店","Deals","快訊"],url:"https://x.com/Wario64",evidenceHint:"E2"},
{id:"billbil-kun",name:"billbil-kun",kind:"個人帳號",platform:"X / Dealabs",region:"法國",focus:["價格","預購","獨家","遊戲情報"],url:"https://x.com/billbil_kun",evidenceHint:"E2"},
{id:"playstationsize",name:"PlayStation Game Size",kind:"個人帳號",platform:"X / YouTube",region:"全球",focus:["PS5","下載容量","版本號","預載"],url:"https://x.com/PlaystationSize",evidenceHint:"E2"},
{id:"natethehate",name:"NateTheHate2",kind:"個人帳號",platform:"X / Podcast",region:"北美",focus:["Insider","平台","發售","爆料"],url:"https://x.com/NateTheHate2",evidenceHint:"E2"},
{id:"extas1stv",name:"eXtas1s",kind:"個人帳號",platform:"X / YouTube",region:"西班牙",focus:["Xbox","PS5","PC","Switch 2","Leaks"],url:"https://x.com/eXtas1stv",evidenceHint:"E2"},
{id:"zhugeex",name:"Daniel Ahmad / ZhugeEX",kind:"個人帳號",platform:"X / LinkedIn",region:"歐洲 / 亞洲市場",focus:["產業","亞洲市場","商業","數據"],url:"https://x.com/ZhugeEX",evidenceHint:"E3"},
{id:"jasonschreier",name:"Jason Schreier",kind:"個人帳號",platform:"Bluesky / Web",region:"美國",focus:["產業","採訪","勞動","調查"],url:"https://bsky.app/profile/jasonschreier.bsky.social",evidenceHint:"E3"},
{id:"shpeshalnick",name:"Shpeshal Nick",kind:"個人帳號",platform:"X / Bluesky / Twitch",region:"澳洲",focus:["Xbox","PlayStation","Rumors","Podcast"],url:"https://x.com/Shpeshal_Nick",evidenceHint:"E2"},
{id:"geoffkeighley",name:"Geoff Keighley",kind:"個人帳號",platform:"X / YouTube",region:"全球",focus:["活動","Summer Game Fest","The Game Awards","公告"],url:"https://x.com/geoffkeighley",evidenceHint:"E3"},
{id:"tomwarren",name:"Tom Warren",kind:"個人帳號",platform:"X / The Verge",region:"美國",focus:["Microsoft","Xbox","Windows","硬體"],url:"https://x.com/tomwarren",evidenceHint:"E3"},
{id:"jezcorden",name:"Jez Corden",kind:"個人帳號",platform:"X / Windows Central",region:"英國",focus:["Xbox","Microsoft","Insider"],url:"https://x.com/JezCorden",evidenceHint:"E2"},
{id:"shinobi602",name:"Shinobi602",kind:"個人帳號",platform:"X",region:"全球",focus:["PlayStation","Sony","遊戲開發"],url:"https://x.com/shinobi602",evidenceHint:"E2"},
{id:"genki",name:"Genki",kind:"個人帳號",platform:"X",region:"日本 / 全球",focus:["日本遊戲","Nintendo","PlayStation","活動"],url:"https://x.com/Genki_JPN",evidenceHint:"E2"},
{id:"okami13",name:"Okami Games",kind:"個人帳號",platform:"X",region:"全球",focus:["Xbox","PlayStation","Deals","公告"],url:"https://x.com/Okami13_",evidenceHint:"E2"},
{id:"gamepass",name:"Xbox Game Pass",kind:"官方 / 平台帳號",platform:"X / Web",region:"Microsoft",focus:["Game Pass","遊戲上架","離庫"],url:"https://x.com/XboxGamePass",evidenceHint:"E5"},
{id:"playstation",name:"PlayStation",kind:"官方 / 平台帳號",platform:"X / Blog",region:"Sony",focus:["PS5","PS Plus","公告"],url:"https://x.com/PlayStation",evidenceHint:"E5"},
{id:"xbox",name:"Xbox",kind:"官方 / 平台帳號",platform:"X / Blog",region:"Microsoft",focus:["Xbox","Game Pass","公告"],url:"https://x.com/Xbox",evidenceHint:"E5"},
{id:"nintendoamerica",name:"Nintendo of America",kind:"官方 / 平台帳號",platform:"X / Web",region:"Nintendo",focus:["Nintendo","Switch 2","公告"],url:"https://x.com/NintendoAmerica",evidenceHint:"E5"},
{id:"steam",name:"Steam",kind:"官方 / 平台帳號",platform:"X / Web",region:"Valve",focus:["Steam","活動","商店","更新"],url:"https://x.com/Steam",evidenceHint:"E5"},
{id:"igrandtheftauto",name:"iGrandTheftAuto",kind:"個人帳號",platform:"X / Web",region:"GTA 社群",focus:["GTA","網站變更","社群追蹤","消息"],url:"https://x.com/iGrandTheftAuto",evidenceHint:"E1",note:"社群追蹤帳號；發現網站變更不等於官方準備公告。"}
];

export const ALL_SOURCE_RECORDS=[...SOURCE_REGISTRY,...PERSONAL_ACCOUNTS];
// 想追蹤其他遊戲的 Steam 官方新聞：複製上面 steam-apex 那一行，把網址中的數字換成該遊戲的 Steam App ID。
export const RSS_SOURCES=SOURCE_REGISTRY.filter(x=>x.feedUrl);
export const CONTENT_TYPES=["全部","快訊","爆料","官方公告","版本更新","補丁","熱修正","發售","延期","預購","價格 / Deals","DLC / 擴充","角色 / 英雄","武器 / 裝備","平衡性","伺服器 / 連線","封禁 / 制裁","收購 / 投資","工作室異動","裁員 / 勞動","開發進度","實機 / 展示","評測","攻略","數據報導","社群觀察","爭議","電競","活動 / 賽季","Steam / 商店榜","硬體 / 平台","免費遊戲 / 促銷","跨平台","獨立遊戲","日本遊戲"];
export const GAME_FAMILIES=["全部","Apex Legends","Call of Duty","Fortnite","Overwatch","Valorant","League of Legends","Counter-Strike 2","GTA","Pokémon","Monster Hunter","Final Fantasy","Resident Evil","Minecraft","Elden Ring","The Elder Scrolls","Fallout","The Witcher","EA Sports FC","NBA 2K","Steam","Nintendo","PlayStation","Xbox","PC","Mobile","Indie"];
export const PLATFORMS=["全部","PC","PS5","PS4","Xbox Series","Xbox One","Switch 2","Switch","Mobile","Steam Deck","Cloud"];
export const EVIDENCE_LABELS=[{id:"E0",label:"無證據"},{id:"E1",label:"匿名 / 截圖 / 二手"},{id:"E2",label:"社群 / 個人帳號"},{id:"E3",label:"一般媒體 / 第三方資料"},{id:"E4",label:"專業 / 高信任來源"},{id:"E5",label:"官方 / 一手資料"}];
export const CONFIDENCE_DIMS=[["C01","Source","來源"],["C02","Evidence","證據"],["C03","Data","數據"],["C04","Identity","身份"],["C05","Version","版本"],["C06","Time","時間"],["C07","Calculation","計算"],["C08","Interpretation","解讀"],["C09","Causality","因果"],["C10","Final Fact","最終事實"]] as const;
export const LANGUAGE_LEVELS=["L0 禁止","L1 推測","L2 未證實","L3 觀察","L4 有資料支持","L5 高度確認","L6 已驗證"];
