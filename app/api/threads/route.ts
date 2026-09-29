import { NextRequest, NextResponse } from "next/server";

function splitUnder(text:string,max:number){
  if(text.length<=max)return [text];
  const sentences=text.match(/[^.!?。！？]+[.!?。！？]*/g)||[text];
  const out:string[]=[];let current="";
  for(const sentence of sentences){
    if((current+sentence).length>max&&current){out.push(current.trim());current=sentence;}
    else current+=sentence;
  }
  if(current)out.push(current.trim());
  return out.flatMap(x=>x.length<=max?[x]:Array.from({length:Math.ceil(x.length/max)},(_,i)=>x.slice(i*max,(i+1)*max)));
}

export async function POST(req:NextRequest){
  try{
    const b=await req.json();
    const articles=Array.isArray(b.articles)?b.articles.slice(0,8):[];
    const max=500;
    const posts:string[]=[];
    for(const a of articles){
      const prefix=b.style==="casual"?"🎮 玩家速報：":b.style==="analysis"?"🔎 觀察：":b.style==="data"?"📊 數據筆記：":"📰 最新消息：";
      const body=prefix+String(a.titleZh||a.titleOriginal||a.title||"")+"\n\n"+String(a.excerptZh||a.excerptOriginal||a.excerpt||"");
      const footer="來源："+String(a.source||"未知來源")+"\n"+String(a.link||"");
      const chunks=splitUnder(body,Math.max(80,max-footer.length-2));
      for(const chunk of chunks)posts.push(chunk+"\n\n"+footer);
    }
    const joined=b.format==="thread"?posts:posts.slice(0,1);
    return NextResponse.json({posts:joined,model:"local-draft",limit:max,sourceMeta:articles.map((a:any)=>({id:a.id,source:a.source,link:a.link}))});
  }catch{return NextResponse.json({error:"Threads 草稿失敗"},{status:400});}
}
