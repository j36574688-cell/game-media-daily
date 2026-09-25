export type Excerpt = { id:string; text:string; charCount:number; source:'articleBody'|'article'|'paragraphs' }

function decode(v:string){return v.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim()}
function strip(v:string){return decode(v.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<svg[\s\S]*?<\/svg>/gi,' ').replace(/<noscript[\s\S]*?<\/noscript>/gi,' ').replace(/<[^>]+>/g,' '))}
function reject(v:string){return /cookie|privacy|subscribe|newsletter|advertisement|sign in|log in|accept all|terms of service|all rights reserved/i.test(v)}
function sentenceChunks(body:string){
  const paras=body.split(/\n+|(?<=[.!?。！？])\s+/).map(s=>s.trim()).filter(s=>s.length>=160 && s.length<=1200 && !reject(s))
  const uniq:string[]=[]; const seen=new Set<string>()
  for(const p of paras){const key=p.slice(0,220).toLowerCase(); if(!seen.has(key)){seen.add(key);uniq.push(p)}}
  return uniq
}
function bestExcerpts(body:string):Excerpt[]{
  const candidates=sentenceChunks(body)
  const scored=candidates.map((text,index)=>{
    const signal=(/\b(announced|confirmed|launch|released|release date|update|patch|price|sales|players|developer|publisher)\b|宣布|確認|推出|發售|更新|補丁|價格|銷量|玩家|開發商|發行商/i.test(text)?35:0)
    const length=Math.min(25,Math.round(text.length/20))
    const position=Math.max(0,18-index)
    return {text,score:signal+length+position,index}
  }).sort((a,b)=>b.score-a.score)
  const picked:string[]=[]
  for(const x of scored){ if(picked.length>=4) break; if(picked.some(p=>Math.abs(p.length-x.text.length)<80 || p.slice(0,110)===x.text.slice(0,110))) continue; picked.push(x.text) }
  return picked.map((text,i)=>({id:`ex-${i+1}`,text,charCount:text.length,source:'paragraphs'}))
}

export async function extractArticle(url:string){
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),7000)
  try{
    const r=await fetch(url,{signal:controller.signal,headers:{'user-agent':'Mozilla/5.0 (compatible; GameMediaDaily/1.0)'},cache:'no-store'})
    if(!r.ok) throw new Error(`HTTP ${r.status}`)
    const html=await r.text()
    const jsonldBodies:string[]=[]
    for(const match of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
      try{
        const parsed=JSON.parse(match[1])
        const nodes=Array.isArray(parsed)?parsed:[parsed,...(parsed?.['@graph']||[])]
        for(const n of nodes){ if(typeof n?.articleBody==='string') jsonldBodies.push(n.articleBody) }
      }catch{}
    }
    const article=html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1]||''
    const paragraphs=[...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>strip(m[1])).filter(t=>t.length>=60 && !reject(t))
    const body=strip(jsonldBodies.sort((a,b)=>b.length-a.length)[0]||article||paragraphs.join('\n'))
    const limited=body.slice(0,120000)
    const excerpts=bestExcerpts(limited)
    return {ok:true,url,bodyAvailable:limited.length>=240,bodyChars:limited.length,excerpts,body:limited}
  } finally {clearTimeout(timer)}
}
