import { NextResponse } from 'next/server'
import { extractArticle } from '@/lib/extract'
export const runtime='nodejs'
export async function POST(req:Request){
  try{
    const {url}=await req.json()
    if(typeof url!=='string'||!/^https?:\/\//i.test(url)) return NextResponse.json({error:'Invalid url'},{status:400})
    const data=await extractArticle(url)
    return NextResponse.json(data)
  }catch(e){ return NextResponse.json({ok:false,error:e instanceof Error?e.message:String(e),bodyAvailable:false,bodyChars:0,excerpts:[]},{status:502}) }
}
