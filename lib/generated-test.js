import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
const spec=JSON.parse(readFileSync('application.json','utf8'));
const credentials={email:'test.member@example.test',password:'TestMemberPassword123!',name:'Test member'};
function values(module,suffix='one'){return Object.fromEntries(module.fields.map(f=>[f.name,f.type==='number'?29:f.type==='boolean'?true:f.type==='date'?'2026-10-10':f.type==='select'?f.options[0]:f.type==='email'?'tester@example.test':'Test '+suffix]));}
test('backend end-to-end: accounts, isolated CRUD, forms, orders and restart persistence',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'generated-app-test-'));let proc,base;
 async function start(production=false){
  proc=spawn(process.execPath,['server.js'],{env:{...process.env,DATA_DIR:dir,PORT:'0',HOST:'127.0.0.1',NODE_ENV:production?'production':'development',VERCEL:'',APP_BASE_URL:production?'https://production.example.test':'',TURSO_DATABASE_URL:'',TURSO_AUTH_TOKEN:'',DATABASE_DRIVER:'',GROQ_API_KEY:'',RESEND_API_KEY:'',EMAIL_FROM:'',ALLOW_SIGNUP:'true',ADMIN_EMAIL:'test.admin@example.test',ADMIN_PASSWORD:'TestAdminPassword123!'},stdio:['ignore','pipe','pipe']});
  const output=await new Promise((resolve,reject)=>{proc.stdout.once('data',data=>resolve(data.toString()));proc.once('error',reject);proc.once('exit',code=>reject(Error('Application exited '+code)));});
  base=output.match(/http:\/\/127\.0\.0\.1:\d+/)[0];
 }
 async function stop(){if(!proc)return;const ended=new Promise(resolve=>proc.once('exit',resolve));proc.kill();await ended;proc=null;}
 async function request(route,method='GET',body,cookie=''){
  const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json','X-App-Request':'1',Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body)});
  return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0],headers:response.headers};
 }
 try{
  await start();assert.equal((await request('/api/health')).status,200);assert.equal((await fetch(base+'/.env')).status,404);assert.equal((await fetch(base+'/backend/api.js')).status,404);
  const adminLogin=await request('/api/auth/login','POST',{email:'test.admin@example.test',password:'TestAdminPassword123!'});assert.equal(adminLogin.status,200);const admin=adminLogin.cookie;assert.equal(adminLogin.body.user.role,'admin');assert.match(adminLogin.headers.get('set-cookie'),/HttpOnly/);assert.match(adminLogin.headers.get('set-cookie'),/SameSite=Lax/);
  const register=await request('/api/auth/register','POST',credentials);assert.equal(register.status,200);const member=register.cookie;assert.equal(register.body.user.role,'member');
  assert.equal((await request('/api/auth/me','GET',undefined,member)).body.user.email,credentials.email);
  const outsider=(await request('/api/auth/register','POST',{...credentials,email:'test.other@example.test'})).cookie;
  const created=[];
  for(const module of spec.collections){
   const route='/api/records/'+module.name,actor=module.name==='products'?admin:member;
   assert.equal((await request(route)).status,401);
   assert.equal((await request(route,'POST',{...values(module),unknown:'reject'},actor)).status,400);
   const record=await request(route,'POST',values(module),actor);assert.equal(record.status,201);created.push({module,id:record.body.id,actor});
   assert.equal((await request(route+'/'+record.body.id,'GET',undefined,outsider)).status,module.name==='products'?403:404);
   assert.equal((await request(route+'/'+record.body.id,'PUT',values(module,'updated'),actor)).status,200);
   assert.equal((await request(route+'?page=1&limit=10','GET',undefined,actor)).body.total,1);
   assert.equal((await request(route+'?page=invalid','GET',undefined,actor)).status,400);
  }
  assert.equal((await request('/api/contact','POST',{name:'Tester',email:'bad',message:'Inquiry'})).status,400);
  const contact=await request('/api/contact','POST',{name:'Tester',email:'tester@example.test',message:'Persistent inquiry test'});assert.equal(contact.status,201);
  assert.equal((await request('/api/records/submissions','GET',undefined,admin)).body.items[0].message,'Persistent inquiry test');assert.equal((await request('/api/records/submissions','GET',undefined,member)).status,403);
  if(spec.type==='storefront'){
   const product=(await request('/api/products')).body.items[0];assert.ok(product);const productModule=spec.collections.find(c=>c.name==='products');assert.equal((await request('/api/records/products','POST',{...values(productModule),price:1.005},admin)).status,400);
   const order=await request('/api/orders','POST',{items:[{id:product.id,quantity:2}],delivery:'Test delivery address'},member);assert.equal(order.status,201);assert.equal(order.body.totalMinor,Math.round(product.price*(spec.currency==='JPY'?1:100))*2);
   assert.equal((await request('/api/records/orders','GET',undefined,member)).body.total,1);assert.equal((await request('/api/records/orders','GET',undefined,outsider)).body.total,0);
   assert.equal((await request('/api/orders','POST',{items:[{id:product.id,quantity:-1}],delivery:'Test delivery'},member)).status,400);
  }
  assert.equal((await fetch(base+'/api/contact',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json','X-App-Request':'1'},body:'{}'})).status,403);
  assert.equal((await fetch(base+'/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,415);
  await stop();await start();assert.equal((await request('/api/auth/me','GET',undefined,member)).body.user.email,credentials.email);
  for(const record of created){const route='/api/records/'+record.module.name+'/'+record.id;assert.equal((await request(route,'GET',undefined,record.actor)).status,200);assert.equal((await request(route,'DELETE',{},record.actor)).status,200);assert.equal((await request(route,'GET',undefined,record.actor)).status,404);}
  assert.equal((await request('/api/auth/logout','POST',{},member)).status,200);assert.equal((await request('/api/auth/me','GET',undefined,member)).body.user,null);
  const login=await request('/api/auth/login','POST',credentials);assert.equal(login.status,200);assert.equal((await request('/api/auth/login','POST',{...credentials,password:'WrongPassword123!'})).status,401);
  await stop();await start(true);const secureLogin=await request('/api/auth/login','POST',credentials);assert.equal(secureLogin.status,200);assert.match(secureLogin.headers.get('set-cookie'),/__Host-app_session=/);assert.match(secureLogin.headers.get('set-cookie'),/; Secure/);
 }finally{await stop();rmSync(dir,{recursive:true,force:true});}
});
