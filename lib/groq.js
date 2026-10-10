import {existsSync,readFileSync} from 'node:fs';
export function loadEnvironment(file) {
  if(!existsSync(file))return;
  for(const line of readFileSync(file,'utf8').split(/\r?\n/)) {
    const match=line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if(!match||process.env[match[1]]!==undefined)continue;
    process.env[match[1]]=match[2].replace(/^(['"])(.*)\1$/,'$2');
  }
}
export async function groqComplete(prompt,{fetcher=fetch,key=process.env.GROQ_API_KEY,model=process.env.GROQ_MODEL||'openai/gpt-oss-20b',enhance=false,application=false,instruction}={}) {
  if(!key)throw Object.assign(Error('Configure GROQ_API_KEY in the backend .env file.'),{status:400});
  const response=await fetcher('https://api.groq.com/openai/v1/chat/completions',{
    method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
    body:JSON.stringify({model,messages:[{role:'system',content:application?instruction:enhance?'Improve the website brief with a concise accessible design specification. Return only the improved prompt, under 3000 characters. Do not include personal data or invent business claims.':'Return only a complete standalone HTML document with inline CSS and JavaScript. Create an accessible polished responsive website. No external resources or network requests. Navigation and local interactions must work. Do not claim payment, email, or authentication integrations exist. Do not include markdown fences.'},{role:'user',content:prompt}],...(model.includes("gpt-oss")?{reasoning_effort:"low"}:{}),temperature:0.6,max_completion_tokens:enhance?4000:16000}),signal:AbortSignal.timeout(90000)
  });
  if(!response.ok){const status=response.status;throw Object.assign(Error(status===401?'Groq rejected the server API key.':status===429?'Groq rate limit reached. Please try again shortly.':'Groq could not complete the request.'),{status:status===429?429:502});}
  const data=await response.json();
  if(data.choices?.[0]?.finish_reason==='length')throw Object.assign(Error('Groq output was truncated. Try a smaller project brief.'),{status:502});
  const result=data.choices?.[0]?.message?.content?.trim().replace(/^```(?:html|json)?\s*|\s*```$/g,'');
  if(application){try{return JSON.parse(result);}catch{throw Object.assign(Error('Groq returned an invalid application specification. Please retry.'),{status:502});}}
  if(!result||(!enhance&&!/<html[\s>]/i.test(result)))throw Object.assign(Error('Groq returned an incomplete result. Please retry.'),{status:502});
  return result;
}
