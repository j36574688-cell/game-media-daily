export async function aiJson<T>(system:string,user:string):Promise<T>{
  const key=process.env.OPENAI_API_KEY
  const base=(process.env.OPENAI_BASE_URL||'https://api.openai.com/v1').replace(/\/$/,'')
  const model=process.env.OPENAI_MODEL
  if(!key||!model) throw new Error('AI provider is not configured. Set OPENAI_API_KEY and OPENAI_MODEL.')
  const r=await fetch(`${base}/chat/completions`,{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${key}`},body:JSON.stringify({model,messages:[{role:'system',content:system},{role:'user',content:user}],response_format:{type:'json_object'}})})
  if(!r.ok) throw new Error(`AI HTTP ${r.status}`)
  const j=await r.json(); const content=j?.choices?.[0]?.message?.content
  if(typeof content!=='string') throw new Error('AI response missing content')
  return JSON.parse(content) as T
}
