import { NextResponse } from 'next/server'
import { aiJson } from '@/lib/ai'
export const runtime='nodejs'
export async function POST(req:Request){
  try{
    const body=await req.json(); const articles=Array.isArray(body?.articles)?body.articles.slice(0,12):[]
    if(!articles.length) return NextResponse.json({translations:[]})
    const system='You are a Traditional Chinese gaming news translator. Preserve names, versions, dates, numbers and uncertainty language. Return JSON {translations:[{id,titleZh,excerptZh}]} only.'
    const user=JSON.stringify(articles.map((a:any)=>({id:a.id,title:a.title,excerpt:a.excerpt||''})))
    const out=await aiJson<{translations:{id:string;titleZh:string;excerptZh:string}[]}>(system,user)
    return NextResponse.json(out)
  }catch(e){ return NextResponse.json({translations:[],error:e instanceof Error?e.message:String(e)},{status:200}) }
}
