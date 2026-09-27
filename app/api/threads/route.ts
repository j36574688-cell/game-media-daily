import { NextRequest, NextResponse } from "next/server";

export async function POST(req:NextRequest){
  try{
    const b=await req.json();
    const articles=Array.isArray(b.articles)?b.articles.slice(0,8):[];
    const posts=articles.map((a:any)=>{
      const prefix=b.style==="casual"?"🎮 玩家速報：":b.style==="analysis"?"🔎 觀察：":b.style==="data"?"📊 數據筆記：":"📰 最新消息：";
      const src=b.sourceMode==="none"?"":b.sourceMode==="full"?`\n\n來源：${a.source}\n${a.link||""}`:`\n\n來源：${a.source}`;
      const hash=b.hashtags?`\n\n#遊戲新聞 #GameMediaDaily #${String(a.game||"Gaming").replace(/[\s/]+/g,"")}`:"";
      return `${prefix}${a.titleZh||a.titleOriginal||""}\n\n${a.excerptZh||a.excerptOriginal||""}${src}${hash}`;
    });
    const joined=b.format==="thread"?posts:posts.slice(0,1);
    return NextResponse.json({
      posts:joined,
      model:"local-draft",
      sourceMeta:articles.map((a:any)=>({id:a.id,bodyAvailable:!!a.bodyText,bodyChars:String(a.bodyText||"").length}))
    });
  }catch{
    return NextResponse.json({error:"Threads 草稿失敗"},{status:400});
  }
}
