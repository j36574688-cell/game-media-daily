import { NextRequest, NextResponse } from "next/server";

const GLOSSARY:Array<[string,string]>=[
["patch notes","更新說明"],["hotfix","熱修正"],["live service","長期營運"],["battle pass","戰鬥通行證"],["cross-play","跨平台遊玩"],["crossplay","跨平台遊玩"],["matchmaking","配對"],["ranked mode","排位模式"],["loadout","配裝"],["datamined","資料探勘"],["unconfirmed","未經證實"],["reportedly","據報"],["allegedly","據稱"],["leak","爆料"],["leaked","流出"],["insider","業內消息人士"],["buff","強化"],["nerf","削弱"],["damage","傷害"],["ability","技能"],["cooldown","冷卻時間"],["weapon","武器"],["character","角色"],["developer","開發商"],["publisher","發行商"],["player","玩家"],["players","玩家"],["server","伺服器"],["performance","效能"],["frame rate","幀率"],["resolution","解析度"],["update","更新"],["release","發售"],["released","已推出"],["launch","推出"],["launched","已推出"],["delayed","延期"],["delay","延期"],["confirmed","已確認"],["price","價格"],["sale","折扣"],["review","評測"],["gameplay","遊玩內容"],["map","地圖"],["balance","平衡性"],["balancing","平衡調整"]
];
const PROPER_TERMS=["Apex Legends","Counter-Strike 2","Call of Duty","Grand Theft Auto","GTA 6","GTA VI","Monster Hunter","Monster Hunter Wilds","Resident Evil","Final Fantasy","Helldivers 2","Fortnite","Overwatch","VALORANT","League of Legends","Minecraft","Roblox","Nintendo Switch","Switch 2","PlayStation","PS5","PS5 Pro","Xbox","Xbox Series X","Xbox Series S","Steam","Epic Games Store","Epic Games","Battle.net","EA Sports","Ubisoft","Electronic Arts","EA","Capcom","Square Enix","Sony","Microsoft","Kojima Productions","FromSoftware","Bandai Namco","Take-Two Interactive","Valve","Rockstar Games","Respawn Entertainment","Activision","Infinity Ward","Treyarch"];
function esc(v:string){return v.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");}
function applyProper(text:string){let out=text;for(const term of PROPER_TERMS)out=out.replace(new RegExp(esc(term),"gi"),term);return out;}
function applyGlossary(text:string,custom:Array<[string,string]>){let out=text;const list=[...custom,...GLOSSARY].filter(x=>x[0].trim()&&x[1].trim()).sort((a,b)=>b[0].length-a[0].length);for(const [en,zh] of list)out=out.replace(new RegExp("\\b"+esc(en)+"\\b","gi"),zh);return out;}
function mode(text:string,kind:string,custom:Array<[string,string]>){let out=applyGlossary(applyProper(text),custom);if(kind==="literal")return out;if(kind==="game")out=out.replace(/平衡性調整/g,"平衡調整").replace(/遊戲模式/g,"模式").replace(/使用者/g,"玩家").replace(/發布/g,"推出");else out=out.replace(/大家/g,"玩家").replace(/很多/g,"大量").replace(/出現了/g,"出現").replace(/宣布了/g,"宣布");return out.replace(/\s+([，。！？；：、])/g,"$1").replace(/([，。！？；：、]){2,}/g,"$1").trim();}
function protectUrls(text:string){const saved:string[]=[];const protectedText=text.replace(/https?:\/\/[^\s]+/gi,url=>{const token="GMDURL"+saved.length+"TOKEN";saved.push(url);return token;});return {protectedText,restore:(v:string)=>saved.reduce((out,url,i)=>out.replace(new RegExp("GMDURL"+i+"TOKEN","gi"),url),v)};}
function splitText(text:string,max=650){if(text.length<=max)return [text];const sentences=text.match(/[^.!?。！？]+[.!?。！？]*/g)||[text];const chunks:string[]=[];let current="";for(const sentence of sentences){if((current+sentence).length>max&&current){chunks.push(current);current=sentence;}else current+=sentence;}if(current)chunks.push(current);return chunks.flatMap(x=>x.length<=max?[x]:Array.from({length:Math.ceil(x.length/max)},(_,i)=>x.slice(i*max,(i+1)*max)));}
async function translateChunk(text:string,target:string){if(!text.trim())return "";const url="https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl="+encodeURIComponent(target)+"&dt=t&q="+encodeURIComponent(text);for(let attempt=0;attempt<2;attempt++){try{const r=await fetch(url,{headers:{accept:"application/json"},signal:AbortSignal.timeout(6000),cache:"no-store"});if(!r.ok)throw new Error("translate "+r.status);const d=await r.json();const out=Array.isArray(d?.[0])?d[0].map((x:any)=>String(x?.[0]||"")).join(""):"";if(out)return out;}catch{if(attempt===1)throw new Error("translation failed");}}return text;}
async function translateText(text:string,target:string,kind:string,custom:Array<[string,string]>){if(!text.trim())return "";const {protectedText,restore}=protectUrls(text);const chunks=splitText(protectedText);const results:string[]=[];for(const chunk of chunks)results.push(await translateChunk(chunk,target));return mode(restore(results.join("")),kind,custom);}
async function mapLimit<T,R>(items:T[],limit:number,fn:(item:T)=>Promise<R>){const out:R[]=new Array(items.length);let cursor=0;async function worker(){while(true){const i=cursor++;if(i>=items.length)return;out[i]=await fn(items[i]);}}await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));return out;}

export async function POST(req:NextRequest){
  try{
    const body=await req.json();const target=String(body.targetLanguage||"zh-TW");const modeName=String(body.mode||"news");
    const custom: Array<[string, string]> = Array.isArray(body.customGlossary)
      ? body.customGlossary
          .slice(0, 80)
          .map((x: any): [string, string] => [
            String(x?.from || ""),
            String(x?.to || "")
          ])
          .filter(([from, to]) => Boolean(from && to))
      : [];
    const articles=Array.isArray(body.articles)?body.articles.slice(0,20):[];
    const translations=await mapLimit(articles,4,async(article:any)=>{const id=String(article.id);const title=String(article.title||"");const excerpt=String(article.excerpt||"");try{const pair=await Promise.all([translateText(title,target,modeName,custom),translateText(excerpt,target,modeName,custom)]);return {id,title:pair[0],excerpt:pair[1]};}catch{return {id,title:mode(title,modeName,custom),excerpt:mode(excerpt,modeName,custom)};}});
    return NextResponse.json({translations,model:"free-google-translate",mode:modeName,customGlossaryApplied:custom.length});
  }catch{return NextResponse.json({error:"翻譯服務失敗"},{status:500});}
}
