import { NextRequest, NextResponse } from "next/server";
import { RSS_SOURCES } from "@/lib/sources";

function decodeHtml(v:string){return v
  .replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'")
  .replace(/&apos;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">")
  .replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCharCode(parseInt(n,16)));
}
function strip(v:string){return decodeHtml(v
  .replace(/<!\[CDATA\[/g,"").replace(/\]\]>/g,"")
  .replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim());}
function firstMatch(x:string,patterns:RegExp[]){for(const re of patterns){const m=x.match(re);if(m?.[1])return m[1];}return "";}
function classify(t:string){const l=t.toLowerCase();if(/leak|rumor|rumour|insider|疑似|爆料/.test(l))return "爆料";if(/patch|update|version|hotfix|更新|版本|補丁/.test(l))return "版本更新";if(/review|評測/.test(l))return "評測";if(/price|sale|deal|價格|折扣/.test(l))return "價格 / Deals";if(/performance|fps|vrr|player|players|效能|幀率/.test(l))return "數據報導";return "一般新聞";}
function guessGame(t:string){for(const g of ["Apex Legends","GTA","Fortnite","Overwatch","VALORANT","League of Legends","Counter-Strike 2","Pokémon","Monster Hunter","Final Fantasy","Resident Evil","Minecraft","Elden Ring","Xbox","PlayStation","Nintendo","Steam"]){if(t.toLowerCase().includes(g.toLowerCase()))return g;}return "自動辨識";}
function parse(xml:string,sourceName:string,sourceId:string){
  const chunks=xml.match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi)||[];
  const evidence=RSS_SOURCES.find(s=>s.id===sourceId)?.evidenceHint||"E3";
  return chunks.map((x,i)=>{
    const title=strip(firstMatch(x,[/<title[^>]*>([\s\S]*?)<\/title>/i]));
    const link=strip(firstMatch(x,[/<link[^>]*>([\s\S]*?)<\/link>/i,/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i]));
    const publishedAt=strip(firstMatch(x,[/<(?:pubDate|published|updated|dc:date)[^>]*>([\s\S]*?)<\/(?:pubDate|published|updated|dc:date)>/i]));
    const excerpt=strip(firstMatch(x,[/<description[^>]*>([\s\S]*?)<\/description>/i,/<summary[^>]*>([\s\S]*?)<\/summary>/i,/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i,/<content[^>]*>([\s\S]*?)<\/content>/i])).slice(0,220);
    return {id:`${sourceId}-${i}-${title.slice(0,20)}`,title,link,source:sourceName,sourceId,publishedAt,excerpt,kind:classify(title),game:guessGame(title),evidence};
  }).filter(x=>x.title&&x.link);
}
export async function GET(req:NextRequest){
  const q=(req.nextUrl.searchParams.get("query")||"").trim().toLowerCase();
  const ids=(req.nextUrl.searchParams.get("sourceIds")||"").split(",").filter(Boolean);
  const sources=ids.length?RSS_SOURCES.filter(s=>ids.includes(s.id)):RSS_SOURCES;
  const failed:string[]=[];
  const settled=await Promise.allSettled(sources.filter(s=>s.feedUrl).map(async s=>{
    const r=await fetch(s.feedUrl!,{headers:{accept:"application/rss+xml, application/atom+xml, application/xml, text/xml, */*"},next:{revalidate:60}});
    if(!r.ok)throw new Error(String(r.status));
    return parse(await r.text(),s.name,s.id).slice(0,12);
  }));
  const feedSources=sources.filter(s=>s.feedUrl);
  const articles=settled.flatMap((r,i)=>r.status==="fulfilled"?r.value:(failed.push(feedSources[i].name),[]))
    .filter(a=>!q||`${a.title} ${a.excerpt} ${a.source}`.toLowerCase().includes(q))
    .sort((a,b)=>(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0));
  const seen=new Set<string>();
  const deduped=articles.filter(a=>{const k=a.title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g,"").slice(0,100);if(seen.has(k))return false;seen.add(k);return true;}).slice(0,70);
  return NextResponse.json({articles:deduped,fetched:deduped.length,failedSources:failed,generatedAt:new Date().toISOString()});
}
