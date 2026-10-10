import {randomBytes,createHash,scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const derive=promisify(scrypt);
const uid=()=>randomBytes(16).toString('hex');
export const sessionDigest=token=>createHash('sha256').update(token).digest('hex');
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
const cleanUser=u=>({id:u.id,email:u.email,name:u.name,role:u.role});
const email=value=>{
 const result=String(value||'').trim().toLowerCase();
 if(result.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result))fail(400,'Enter a valid email');
 return result;
};
const password=value=>{if(typeof value!=='string'||value.length<12||value.length>128)fail(400,'Use a password with 12–128 characters');return value;};
const plain=value=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
export function validateRecord(module,input){
 if(!plain(input))fail(400,'Expected a record object');
 const keys=new Set(module.fields.map(f=>f.name));
 if(Object.keys(input).some(k=>!keys.has(k)))fail(400,'Unknown record fields');
 const result={};
 for(const f of module.fields){
  const value=input[f.name];
  if(value===undefined||value===null||value===''){if(f.required)fail(400,f.label+' is required');result[f.name]=null;continue;}
  if(f.type==='boolean'){if(typeof value!=='boolean')fail(400,f.label+' must be true or false');result[f.name]=value;}
  else if(f.type==='number'){if(typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>1000000000)fail(400,f.label+' must be a finite number');if(f.name==='price'&&(value<0||value>1000000))fail(400,'Price is out of range');result[f.name]=value;}
  else{
   if(typeof value!=='string'||value.length>2000)fail(400,f.label+' must be at most 2,000 characters');
   const v=value.trim();if(f.required&&!v)fail(400,f.label+' is required');
   if(f.type==='email')email(v);
   if(f.type==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v))fail(400,'Invalid date');
   if(f.type==='select'&&!f.options.includes(v))fail(400,'Invalid '+f.label);
   result[f.name]=v;
  }
 }
 return result;
}

/** Shared by the downloadable server and the isolated Studio preview adapter. */
export function createGeneratedAPI({db,env={},fetcher=fetch}){
 const run=(sql,...args)=>db.prepare(sql).run(...args);
 const get=(sql,...args)=>db.prepare(sql).get(...args);
 const all=(sql,...args)=>db.prepare(sql).all(...args);
 let nextCleanup=0;
 async function limit(space,key,count=60){
  if(Date.now()>nextCleanup){nextCleanup=Date.now()+60000;await run('DELETE FROM built_limits WHERE expires<?',Date.now());}
  const bucket=space+':'+key+':'+Math.floor(Date.now()/60000);
  const row=await get('INSERT INTO built_limits(bucket,count,expires) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count',bucket,Date.now()+120000);
  if(row.count>count)fail(429,'Too many requests. Try again shortly.');
 }
 async function account(space,input,role='member'){
  const address=email(input.email),secret=password(input.password),name=String(input.name||'Member').trim().slice(0,80);
  if(!name)fail(400,'Name is required');
  const salt=uid(),hash=(await derive(secret,salt,64)).toString('hex'),id=uid();
  try{await run('INSERT INTO built_users(space,id,email,name,password_hash,salt,role,created) VALUES(?,?,?,?,?,?,?,?)',space,id,address,name,hash,salt,role,new Date().toISOString());}
  catch(error){if(String(error.message).includes('UNIQUE'))fail(409,'Unable to create this account. Try signing in.');throw error;}
  return get('SELECT * FROM built_users WHERE space=? AND id=?',space,id);
 }
 async function issue(space,user){
  const token=randomBytes(32).toString('hex');
  await run('DELETE FROM built_sessions WHERE space=? AND expires<?',space,Date.now());
  await run('INSERT INTO built_sessions(space,token_hash,user_id,expires) VALUES(?,?,?,?)',space,sessionDigest(token),user.id,Date.now()+30*86400000);
  return {status:200,body:{user:cleanUser(user)},sessionToken:token};
 }
 async function bootstrap(space){
  if(!env.ADMIN_EMAIL&&!env.ADMIN_PASSWORD)return;
  const address=email(env.ADMIN_EMAIL),existing=await get('SELECT role FROM built_users WHERE space=? AND email=?',space,address);
  if(existing){if(existing.role!=='admin')fail(409,'Configured administrator email belongs to a member');return;}
  password(env.ADMIN_PASSWORD);await account(space,{email:address,password:env.ADMIN_PASSWORD,name:'Administrator'},'admin');
 }
 async function request({space,spec,path:requestPath,method='GET',body={},token,sessionHash,client='local',preview=false}){
  if(!/^[a-zA-Z0-9_-]{1,100}$/.test(space))fail(400,'Invalid application namespace');
  if(!['GET','POST','PUT','DELETE'].includes(method))fail(405,'Method not allowed');
  if(typeof requestPath!=='string'||!requestPath.startsWith('/api/')||requestPath.length>1500)fail(400,'Invalid API route');
  const url=new URL(requestPath,'http://app.invalid'),route=url.pathname;
  await limit(space,'requests:'+client,300);
  const hash=sessionHash||(token?sessionDigest(token):null);
  const user=hash?await get('SELECT u.* FROM built_users u JOIN built_sessions s ON s.space=u.space AND s.user_id=u.id WHERE s.space=? AND s.token_hash=? AND s.expires>?',space,hash,Date.now()):null;
  const needUser=()=>{if(!user)fail(401,'Sign in to continue');return user;};
  const needAdmin=()=>{needUser();if(user.role!=='admin')fail(403,'Administrator access required');};
  const ok=(data,status=200)=>({status,body:data});
  const record=r=>({id:r.id,...JSON.parse(r.data),created:r.created,updated:r.updated});
  const audit=(action,module,id)=>({sql:'INSERT INTO built_audit(space,id,actor,action,module,record_id,created) VALUES(?,?,?,?,?,?,?)',args:[space,uid(),user?.id||'visitor',action,module,id,new Date().toISOString()]});
  if(route==='/api/health'&&method==='GET'){await get('SELECT 1 AS ready');return ok({ok:true});}
  if(route==='/api/config'&&method==='GET')return ok({signup:env.ALLOW_SIGNUP!=='false',preview,spec,integrations:{email:!!(env.RESEND_API_KEY&&env.EMAIL_FROM&&env.ADMIN_EMAIL),ai:!!env.GROQ_API_KEY,payments:false},externalServicesNote:'Payment processing, OAuth and password recovery are not configured by this runtime.'});
  if(route==='/api/auth/me'&&method==='GET')return ok({user:user?cleanUser(user):null});
  if(route==='/api/auth/register'&&method==='POST'){
   await limit(space,'auth:'+client,12);if(env.ALLOW_SIGNUP==='false')fail(403,'Registration is disabled');
   return issue(space,await account(space,body,preview?'admin':'member'));
  }
  if(route==='/api/auth/login'&&method==='POST'){
   await limit(space,'auth:'+client,12);const address=email(body.email),secret=password(body.password);
   const candidate=await get('SELECT * FROM built_users WHERE space=? AND email=?',space,address);
   const actual=await derive(secret,candidate?.salt||'invalid-account-dummy-salt',64);
   if(!candidate||!timingSafeEqual(actual,Buffer.from(candidate.password_hash,'hex')))fail(401,'Email or password is incorrect');
   return issue(space,candidate);
  }
  if(route==='/api/auth/logout'&&method==='POST'){if(hash)await run('DELETE FROM built_sessions WHERE space=? AND token_hash=?',space,hash);return {status:200,body:{ok:true},clearSession:true};}
  if(route==='/api/contact'&&method==='POST'){
   await limit(space,'contact:'+client,10);
   const value=validateRecord({fields:[{name:'name',label:'Name',type:'text',required:true},{name:'email',label:'Email',type:'email',required:true},{name:'message',label:'Message',type:'text',required:true}]},body);
   const id=uid(),now=new Date().toISOString();await db.batch([{sql:'INSERT INTO built_records(space,module,id,owner,data,created,updated) VALUES(?,?,?,?,?,?,?)',args:[space,'submissions',id,'public',JSON.stringify(value),now,now]},audit('create','submissions',id)]);
   let notification='not_configured';
   if(spec.integrations.includes('email')&&env.RESEND_API_KEY&&env.EMAIL_FROM&&env.ADMIN_EMAIL){
    try{const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:env.EMAIL_FROM,to:[env.ADMIN_EMAIL],subject:'New application inquiry',text:value.name+' <'+value.email+'>\n\n'+value.message}),signal:AbortSignal.timeout(15000)});notification=response.ok?'sent':'failed';}catch{notification='failed';}
   }
   await run('UPDATE built_records SET data=? WHERE space=? AND module=? AND id=?',JSON.stringify({...value,notification}),space,'submissions',id);
   return ok({id,message:'Your message has been saved.',notification},201);
  }
  if(route==='/api/products'&&method==='GET'){
   if(spec.type!=='storefront')fail(404,'Products are not enabled');
   return ok({items:(await all('SELECT * FROM built_records WHERE space=? AND module=? ORDER BY updated DESC LIMIT 100',space,'products')).map(record)});
  }
  if(route==='/api/orders'&&method==='POST'){
   needUser();if(spec.type!=='storefront')fail(404,'Orders are not enabled');
   if(!Array.isArray(body.items)||!body.items.length||body.items.length>30)fail(400,'Choose 1–30 products');
   if(typeof body.delivery!=='string'||body.delivery.trim().length<5||body.delivery.length>1000)fail(400,'Enter delivery instructions');
   const seen=new Set(),items=[];let totalMinor=0;const scale=spec.currency==='JPY'?1:100;
   for(const line of body.items){
    if(!line||typeof line.id!=='string'||seen.has(line.id)||!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>99)fail(400,'Invalid order items');seen.add(line.id);
    const product=await get('SELECT * FROM built_records WHERE space=? AND module=? AND id=?',space,'products',line.id);if(!product)fail(400,'A product is no longer available');
    const value=JSON.parse(product.data),unitMinor=Math.round(value.price*scale);totalMinor+=unitMinor*line.quantity;items.push({id:line.id,name:value.name,quantity:line.quantity,unitMinor});
   }
   const id=uid(),now=new Date().toISOString(),value={items,totalMinor,currency:spec.currency,status:'Submitted — unpaid',delivery:body.delivery.trim()};
   await db.batch([{sql:'INSERT INTO built_records(space,module,id,owner,data,created,updated) VALUES(?,?,?,?,?,?,?)',args:[space,'orders',id,user.id,JSON.stringify(value),now,now]},audit('create','orders',id)]);
   return ok({id,...value},201);
  }
  if(route==='/api/ai'&&method==='POST'){
   needUser();if(!spec.integrations.includes('ai'))fail(404,'AI is not enabled');if(!env.GROQ_API_KEY)fail(503,'Configure GROQ_API_KEY on the application server');
   await limit(space,'ai:'+user.id,5);if(typeof body.prompt!=='string'||body.prompt.trim().length<3||body.prompt.length>4000)fail(400,'Use a prompt with 3–4,000 characters');
   const response=await fetcher('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+env.GROQ_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:env.GROQ_MODEL||'openai/gpt-oss-20b',...((env.GROQ_MODEL||'openai/gpt-oss-20b').includes('gpt-oss')?{reasoning_effort:'low'}:{}),messages:[{role:'system',content:'Help the user concisely. Do not claim to execute actions or access their data.'},{role:'user',content:body.prompt}],max_completion_tokens:4096}),signal:AbortSignal.timeout(30000)});
   if(!response.ok)fail(response.status===429?429:502,'AI provider could not complete the request');
   const data=await response.json(),answer=data.choices?.[0]?.message?.content;if(typeof answer!=='string'||data.choices?.[0]?.finish_reason==='length')fail(502,'AI response was incomplete');const id=uid(),now=new Date().toISOString();await db.batch([{sql:'INSERT INTO built_records(space,module,id,owner,data,created,updated) VALUES(?,?,?,?,?,?,?)',args:[space,'ai_history',id,user.id,JSON.stringify({prompt:body.prompt,answer}),now,now]},audit('create','ai_history',id)]);return ok({id,answer});
  }
  const match=route.match(/^\/api\/records\/([a-z][a-z0-9_]{0,39})(?:\/([a-f0-9]{32}))?$/);
  if(match){
   needUser();const [,moduleName,id]=match,module=spec.collections.find(c=>c.name===moduleName);
   const system=['submissions','orders','ai_history'].includes(moduleName);if(!module&&!system)fail(404,'Data module not found');
   if(moduleName==='submissions'||moduleName==='products')needAdmin();
   if(moduleName==='ai_history'&&!spec.integrations.includes('ai'))fail(404,'AI history is not enabled');
   if(moduleName==='orders'&&spec.type!=='storefront')fail(404,'Orders are not enabled');
   const ownerSQL=user.role==='admin'?'':' AND owner=?',ownerArgs=user.role==='admin'?[]:[user.id];
   if(!id&&method==='GET'){
    const rawPage=url.searchParams.get('page')||'1',rawLimit=url.searchParams.get('limit')||'25';
    if(!/^\d{1,5}$/.test(rawPage)||!/^\d{1,3}$/.test(rawLimit))fail(400,'Invalid pagination');
    const page=Math.max(1,Number(rawPage)),size=Math.min(100,Math.max(1,Number(rawLimit))),q=(url.searchParams.get('q')||'').slice(0,100);
    const filter=q?' AND data LIKE ?':'',args=[space,moduleName,...ownerArgs,...(q?['%'+q.replace(/[\\%_]/g,'\\$&')+'%']:[])];
    const search=filter?filter+" ESCAPE '\\'":'';
    const total=await get('SELECT count(*) AS total FROM built_records WHERE space=? AND module=?'+ownerSQL+search,...args);
    const rows=await all('SELECT * FROM built_records WHERE space=? AND module=?'+ownerSQL+search+' ORDER BY updated DESC LIMIT ? OFFSET ?',...args,size,(page-1)*size);
    return ok({items:rows.map(record),total:Number(total.total),page,pageSize:size});
   }
   if(system&&method!=='GET')fail(405,'Submitted orders and inquiries are read-only');
   if(!id&&method==='POST'){
    const value=validateRecord(module,body);if(moduleName==='products'&&Math.abs(value.price*(spec.currency==='JPY'?1:100)-Math.round(value.price*(spec.currency==='JPY'?1:100)))>0.000001)fail(400,'Price must use valid currency precision');const rid=uid(),now=new Date().toISOString();
    await db.batch([{sql:'INSERT INTO built_records(space,module,id,owner,data,created,updated) VALUES(?,?,?,?,?,?,?)',args:[space,moduleName,rid,user.id,JSON.stringify(value),now,now]},audit('create',moduleName,rid)]);return ok({id:rid,...value},201);
   }
   if(!id)fail(405,'Method not allowed');
   const existing=await get('SELECT * FROM built_records WHERE space=? AND module=? AND id=?'+ownerSQL,space,moduleName,id,...ownerArgs);
   if(!existing)fail(404,'Record not found');
   if(method==='GET')return ok(record(existing));
   if(method==='PUT'){
    const value=validateRecord(module,body);if(moduleName==='products'&&Math.abs(value.price*(spec.currency==='JPY'?1:100)-Math.round(value.price*(spec.currency==='JPY'?1:100)))>0.000001)fail(400,'Price must use valid currency precision');const now=new Date().toISOString();await db.batch([{sql:'UPDATE built_records SET data=?,updated=? WHERE space=? AND module=? AND id=?',args:[JSON.stringify(value),now,space,moduleName,id]},audit('update',moduleName,id)]);return ok({id,...value,updated:now});
   }
   if(method==='DELETE'){await db.batch([{sql:'DELETE FROM built_records WHERE space=? AND module=? AND id=?',args:[space,moduleName,id]},audit('delete',moduleName,id)]);return ok({ok:true});}
  }
  fail(404,'API route not found');
 }
 return {request,bootstrap};
}
