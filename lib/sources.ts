export type SourceRecord = { id:string; name:string; url:string; kind:'media'|'official'|'data'|'account'; domain:string }
export const SOURCES: SourceRecord[] = [
  ['ign','IGN','https://www.ign.com/','media','ign.com'],
  ['gamespot','GameSpot','https://www.gamespot.com/','media','gamespot.com'],
  ['vgc','VGC','https://www.videogameschronicle.com/','media','videogameschronicle.com'],
  ['gematsu','Gematsu','https://www.gematsu.com/','media','gematsu.com'],
  ['eurogamer','Eurogamer','https://www.eurogamer.net/','media','eurogamer.net'],
  ['pcgamer','PC Gamer','https://www.pcgamer.com/','media','pcgamer.com'],
  ['rps','Rock Paper Shotgun','https://www.rockpapershotgun.com/','media','rockpapershotgun.com'],
  ['polygon','Polygon','https://www.polygon.com/','media','polygon.com'],
  ['gamesindustry','GamesIndustry.biz','https://www.gamesindustry.biz/','media','gamesindustry.biz'],
  ['insider-gaming','Insider Gaming','https://insider-gaming.com/','media','insider-gaming.com'],
  ['playstation-blog','PlayStation Blog','https://blog.playstation.com/','official','blog.playstation.com'],
  ['xbox-wire','Xbox Wire','https://news.xbox.com/','official','news.xbox.com'],
  ['nintendo','Nintendo News','https://www.nintendo.com/us/gaming-systems/','official','nintendo.com'],
  ['steam-news','Steam News','https://store.steampowered.com/news/','official','store.steampowered.com'],
  ['steamdb','SteamDB','https://steamdb.info/','data','steamdb.info'],
  ['steamcharts','SteamCharts','https://steamcharts.com/','data','steamcharts.com'],
  ['metacritic','Metacritic','https://www.metacritic.com/','data','metacritic.com'],
  ['opencritic','OpenCritic','https://opencritic.com/','data','opencritic.com'],
  ['wario64','Wario64','https://x.com/Wario64','account','x.com']
].map(x=>({id:x[0],name:x[1],url:x[2],kind:x[3] as SourceRecord['kind'],domain:x[4]}))

export const RSS_FEEDS = [
  'https://feeds.feedburner.com/ign/games',
  'https://www.gamespot.com/feeds/mashup/',
  'https://www.videogameschronicle.com/feed/',
  'https://www.gematsu.com/feed',
  'https://www.eurogamer.net/feed',
  'https://www.pcgamer.com/rss/'
]
