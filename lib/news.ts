export type NewsItem = {
  id:string; title:string; url:string; source:string; sourceDomain?:string; publishedAt:string;
  language?:string; evidence?:'E2'|'E3'|'E4'|'E5'; kind?:'media'|'official'|'data'|'account';
  excerpt?:string; game?:string;
}

const FEEDS = [
  ['IGN','https://feeds.feedburner.com/ign/games','media'],
  ['GameSpot','https://www.gamespot.com/feeds/mashup/','media'],
  ['VGC','https://www.videogameschronicle.com/feed/','media'],
  ['Gematsu','https://www.gematsu.com/feed','media'],
  ['Eurogamer','https://www.eurogamer.net/feed','media'],
  ['PC Gamer','https://www.pcgamer.com/rss/','media']
] as const

function cleanHtml(v:string){ return v.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim() }
function decode(v:string){ return v.replace(/<!\[CDATA\[/g,'').replace(/\]\]>/g,'') }
function tag(item:string,name:string){ const m=item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i')); return m?cleanHtml(decode(m[1])):'' }
function normalizeTitle(v:string){ return v.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().slice(0,180) }
export function parseFeed(xml:string, source:string):NewsItem[]{
  const items=xml.match(/<item>[\s\S]*?<\/item>/gi)||[]
  return items.flatMap(raw=>{
    const title=tag(raw,'title');
    const link=tag(raw,'link') || (raw.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1] ?? '')
    const pub=tag(raw,'pubDate') || tag(raw,'published') || tag(raw,'updated')
    const desc=tag(raw,'description')
    if(!title||!link) return []
    const dt=new Date(pub)
    const publishedAt=Number.isFinite(dt.getTime())?dt.toISOString():new Date().toISOString()
    const host=(()=>{try{return new URL(link).hostname.replace(/^www\./,'')}catch{return ''}})()
    return [{id:`${source}:${normalizeTitle(title)}:${link}`,title,url:link,source,sourceDomain:host,publishedAt,excerpt:desc,evidence:'E3' as const,kind:'media' as const}]
  })
}

export async function fetchNews(signal?:AbortSignal):Promise<{items:NewsItem[];errors:string[];fetchedAt:string}>{
  const results=await Promise.allSettled(FEEDS.map(async([source,url])=>{
    const r=await fetch(url,{signal,headers:{'user-agent':'GameMediaDaily/1.0'},cache:'no-store'})
    if(!r.ok) throw new Error(`${source} HTTP ${r.status}`)
    return parseFeed(await r.text(),source)
  }))
  const errors:string[]=[]; const map=new Map<string,NewsItem>()
  results.forEach((r,i)=>{ if(r.status==='rejected'){errors.push(String(r.reason?.message||r.reason||FEEDS[i][0]))} else r.value.forEach(n=>{const key=n.url.toLowerCase()||n.title.toLowerCase(); if(!map.has(key)) map.set(key,n)}) })
  const items=[...map.values()].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,90)
  return {items,errors,fetchedAt:new Date().toISOString()}
}
