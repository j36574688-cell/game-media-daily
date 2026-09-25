import { NextResponse } from 'next/server'
import { aiJson } from '@/lib/ai'
import { extractArticle } from '@/lib/extract'
export const runtime='nodejs'

type A={id:string;source:string;link:string;titleOriginal:string;titleZh?:string;excerptOriginal?:string;excerptZh?:string;bodyText?:string}
export async function POST(req:Request){
  try{
    const input=await req.json(); const articles=(Array.isArray(input?.articles)?input.articles:[]).slice(0,8) as A[]
    if(!articles.length) return NextResponse.json({posts:[],sourceMeta:[]})
    const enriched=await Promise.all(articles.map(async a=>{
      if(a.bodyText) return {...a,sourceMeta:{id:a.id,bodyAvailable:true,bodyChars:a.bodyText.length,excerpts:[]}}
      try{const x=await extractArticle(a.link); return {...a,bodyText:x.bodyAvailable?x.body:'',sourceMeta:{id:a.id,bodyAvailable:x.bodyAvailable,bodyChars:x.bodyChars,excerpts:x.excerpts}}}
      catch{return {...a,bodyText:'',sourceMeta:{id:a.id,bodyAvailable:false,bodyChars:0,excerpts:[]}}}
    }))
    const sourceMeta=enriched.map(a=>a.sourceMeta)
    const system='You are a careful gaming social editor. Use only supplied material. Do not invent facts or imply full-article reading when bodyAvailable is false. Preserve uncertainty. Return JSON {posts:string[]}. If format=thread, 2-5 posts. Do not include long verbatim quotations.'
    const settings={style:input?.style||'news',format:input?.format||'single',sourceMode:input?.sourceMode||'compact',contentFocus:input?.contentFocus||'balanced',hashtags:!!input?.hashtags}
    const out=await aiJson<{posts:string[]}>(system,JSON.stringify({settings,articles:enriched.map(({sourceMeta,...a})=>a)}))
    return NextResponse.json({posts:Array.isArray(out.posts)?out.posts.slice(0,5):[],sourceMeta})
  }catch(e){return NextResponse.json({posts:[],sourceMeta:[],error:e instanceof Error?e.message:String(e)},{status:200})}
}
