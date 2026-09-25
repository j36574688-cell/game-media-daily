import { NextResponse } from 'next/server'
import { fetchNews } from '@/lib/news'

export const runtime = 'nodejs'

export async function GET(req: Request){
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),12000)
  try{
    const data=await fetchNews(controller.signal)
    return NextResponse.json({version:'vercel-migration-v1',source:'rss',...data,count:data.items.length})
  }catch(e){
    return NextResponse.json({version:'vercel-migration-v1',source:'rss',items:[],count:0,errors:[e instanceof Error?e.message:String(e)],fetchedAt:new Date().toISOString()},{status:502})
  }finally{clearTimeout(timer)}
}
