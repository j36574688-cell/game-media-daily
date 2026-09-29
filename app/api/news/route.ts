import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { RSS_SOURCES } from "@/lib/sources";

export const runtime="nodejs";
export const dynamic="force-dynamic";

function decodeHtml(v:string){return v.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&apos;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCharCode(parseInt(n,16)));}
function strip(v:string){return decodeHtml(v.replace(/<!\[CDATA\[/g,"").replace(/\]\]>/g,"").replace(/<[^>]+>/g," ")).replace(/\s+/g," ").trim();}
function firstMatch(x:string,patterns:RegExp[]){for(const re of patterns){const m=x.match(re);if(m?.[1])return m[1];}return "";}
function classify(t:string){const l=t.toLowerCase();if(/leak|rumor|rumour|insider|疑似|爆料/.test(l))return "爆料";if(/patch|update|version|hotfix|更新|版本|補丁/.test(l))return "版本更新";if(/review|評測/.test(l))return "評測";if(/price|sale|deal|價格|折扣/.test(l))return "價格 / Deals";if(/performance|fps|vrr|player|players|效能|幀率/.test(l))return "數據報導";return "一般新聞";}
function guessGame(t:string){for(const g of ["Apex Legends","GTA","Fortnite","Overwatch","VALORANT","League of Legends","Counter-Strike 2","Pokémon","Monster Hunter","Final Fantasy","Resident Evil","Minecraft","Elden Ring","Xbox","PlayStation","Nintendo","Steam"]){if(t.toLowerCase().includes(g.toLowerCase()))return g;}return "自動辨識";}
function stableId(sourceId:string,title:string,link:string){return sourceId+"-"+createHash("sha1").update(sourceId+"\n"+link+"\n"+title).digest("hex").slice(0,16);}
function parse(xml:string,sourceName:string,sourceId:string){
  const chunks=xml.match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi)||[];
  const evidence=RSS_SOURCES.find(s=>s.id===sourceId)?.evidenceHint||"E3";
  return chunks.map(x=>{
    const title=strip(firstMatch(x,[/<title[^>]*>([\s\S]*?)<\/title>/i]));
    const link=strip(firstMatch(x,[/<link[^>]+href=["']([^"']+)["'][^>]*\/?/i,/<link[^>]*>([\s\S]*?)<\/link>/i,/<guid[^>]*>([\s\S]*?)<\/guid>/i]));
    const publishedAt=strip(firstMatch(x,[/<(?:pubDate|published|updated|dc:date)[^>]*>([\s\S]*?)<\/(?:pubDate|published|updated|dc:date)>/i]));
    const excerpt=strip(firstMatch(x,[/<description[^>]*>([\s\S]*?)<\/description>/i,/<summary[^>]*>([\s\S]*?)<\/summary>/i,/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i,/<content[^>]*>([\s\S]*?)<\/content>/i])).slice(0,280);
    return {id:stableId(sourceId,title,link),title,link,source:sourceName,sourceId,publishedAt,excerpt,kind:classify(title),game:guessGame(title),evidence};
  }).filter(x=>x.title&&x.link);
}
function normalizeTitle(t:string){return t.toLowerCase().replace(/&[^;\s]+;/g,"").replace(/[^a-z0-9\u4e00-\u9fff]+/g,"").slice(0,150);}
function tokenSimilarity(a:string,b:string){const aa=new Set(a.match(/[a-z0-9\u4e00-\u9fff]{2,}/g)||[]);const bb=new Set(b.match(/[a-z0-9\u4e00-\u9fff]{2,}/g)||[]);if(!aa.size||!bb.size)return 0;let hit=0;for(const t of aa)if(bb.has(t))hit++;return hit/Math.max(aa.size,bb.size);}

export async function GET(req:NextRequest){
  const q=(req.nextUrl.searchParams.get("query")||"").trim().toLowerCase();
  const ids=(req.nextUrl.searchParams.get("sourceIds")||"").split(",").filter(Boolean);
  const sources=ids.length?RSS_SOURCES.filter(s=>ids.includes(s.id)):RSS_SOURCES;
  const feeds=sources.filter(s=>s.feedUrl);
  const results=await Promise.allSettled(feeds.map(async s=>{
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),6000);
    try{
      const r=await fetch(s.feedUrl!,{headers:{accept:"application/rss+xml, application/atom+xml, application/xml, text/xml, */*"},next:{revalidate:60},signal:controller.signal});
      if(!r.ok)throw new Error("HTTP "+r.status);
      const parsed=parse(await r.text(),s.name,s.id).slice(0,20);
      if(!parsed.length)throw new Error("RSS / Atom 無可解析項目");
      return parsed;
    }finally{clearTimeout(timeout);}
  }));
  const failedSources:string[]=[];
  const sourceStats=results.map((r,i)=>{const s=feeds[i];if(r.status==="fulfilled")return {id:s.id,name:s.name,status:"ok" as const,count:r.value.length};failedSources.push(s.name);return {id:s.id,name:s.name,status:"error" as const,count:0,error:String(r.reason?.message||"fetch failed")};});
  const raw=results.flatMap(r=>r.status==="fulfilled"?r.value:[]).filter(a=>!q||(a.title+" "+a.excerpt+" "+a.source).toLowerCase().includes(q));
  raw.sort((a,b)=>(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0));
  const seenLinks=new Set<string>();const seenTitles:string[]=[];
  const articles=raw.filter(a=>{
    const link=a.link.split("#")[0].trim().toLowerCase();
    if(link&&seenLinks.has(link))return false;if(link)seenLinks.add(link);
    const nt=normalizeTitle(a.title);if(nt&&seenTitles.some(t=>t===nt||tokenSimilarity(t,nt)>=0.82))return false;if(nt)seenTitles.push(nt);return true;
  }).slice(0,100);
  const generatedAt=new Date().toISOString();
  return NextResponse.json({articles,fetched:articles.length,sourceCount:sources.length,feedCount:feeds.length,successfulSources:sourceStats.filter(x=>x.status==="ok").length,failedSources,sourceStats,generatedAt,isDemo:false},{headers:{"Cache-Control":"no-store"}});
}
