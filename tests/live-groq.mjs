import {mkdirSync,writeFileSync} from 'node:fs';
import {Script} from 'node:vm';
const base='http://127.0.0.1:3000';
const email=process.env.STUDIO_TEST_EMAIL,password=process.env.STUDIO_TEST_PASSWORD;
if(!email||!password)throw Error('Set STUDIO_TEST_EMAIL and STUDIO_TEST_PASSWORD for your local test account.');
const login=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
if(!login.ok)throw Error('Local smoke-test login failed');
const cookie=login.headers.get('set-cookie').split(';')[0];
async function api(route,body){const response=await fetch(base+'/api'+route,{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body||{})});const data=await response.json();if(!response.ok)throw Error(data.error);return data;}
const connection=await api('/ai/test');
const enhanced=await api('/enhance',{prompt:'A beautiful global creative studio website with services, a portfolio, contact information and responsive navigation'});
const project=await api('/generate',{mode:'ai',type:'landing page',name:'Bebin · Groq Integration Test',prompt:'Create an elegant responsive landing page for Bebin Dev Studio. Include a hero, 3 service cards, accessible mobile navigation, project gallery, FAQ toggles, and a contact form demonstration. Use forest green, ivory and refined typography. No external dependencies or assets. Keep the source concise and complete.'});
const scripts=[...project.html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];for(const [,source]of scripts)new Script(source);
mkdirSync('qa',{recursive:true});writeFileSync('qa/groq-smoke.html',project.html);writeFileSync('qa/live-groq-result.json',JSON.stringify({checkedAt:new Date().toISOString(),provider:connection.provider,model:connection.model,enhancementEngine:enhanced.engine,projectId:project.id,bytes:project.html.length,inlineScripts:scripts.length,syntaxChecked:true},null,2));
console.log(JSON.stringify({connected:connection.ok,provider:connection.provider,model:connection.model,enhancementEngine:enhanced.engine,projectId:project.id,bytes:project.html.length,inlineScripts:scripts.length,syntaxChecked:true}));
