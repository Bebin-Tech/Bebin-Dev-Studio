import assert from 'node:assert/strict';
import {createDatabase} from '../lib/database.js';
import {defaultAppSpec} from '../lib/app-spec.js';
import {generatedSchema} from '../lib/fullstack-project.js';
import {createGeneratedAPI,sessionDigest} from '../lib/generated-api.js';
export async function verifyRuntime(dir,driver){
 const db=await createDatabase({root:dir,env:{DATABASE_DRIVER:driver}});
 try{
  await db.exec(generatedSchema);const spec=defaultAppSpec('CRM with email notifications and AI assistant','web app');let mailRequest,aiRequest;
  const api=createGeneratedAPI({db,env:{RESEND_API_KEY:'test-mail-secret',EMAIL_FROM:'sender@example.test',ADMIN_EMAIL:'owner@example.test',GROQ_API_KEY:'test-ai-secret'},fetcher:async(url,options)=>{if(url.includes('resend')){mailRequest=JSON.parse(options.body);return {ok:true};}aiRequest=JSON.parse(options.body);return {ok:true,json:async()=>({choices:[{message:{content:'Test answer'}}]})};}});
  const request=(space,route,method='GET',body,hash)=>api.request({space,spec,path:route,method,body,sessionHash:hash,client:'test'});
  const account=await request('first','/api/auth/register','POST',{name:'Member',email:'member@example.test',password:'TestPassword123!'});const hash=sessionDigest(account.sessionToken);
  assert.equal((await request('second','/api/auth/me','GET',{},hash)).body.user,null);
  const record=await request('first','/api/records/contacts','POST',{name:'Customer',email:'customer@example.test',company:'Example',stage:'New'},hash);assert.equal(record.status,201);
  const other=await request('first','/api/auth/register','POST',{name:'Other',email:'other@example.test',password:'TestPassword123!'});
  await assert.rejects(request('first','/api/records/contacts/'+record.body.id,'GET',{},sessionDigest(other.sessionToken)),/Record not found/);
  const contact=await request('first','/api/contact','POST',{name:'Visitor',email:'visitor@example.test',message:'A genuine inquiry'});assert.equal(contact.body.notification,'sent');assert.deepEqual(mailRequest.to,['owner@example.test']);
  const answer=await request('first','/api/ai','POST',{prompt:'Help me plan'},hash);assert.equal(answer.body.answer,'Test answer');assert.equal(aiRequest.messages[1].content,'Help me plan');assert.equal((await request('first','/api/records/ai_history','GET',{},hash)).body.items[0].answer,'Test answer');
  const stored=await db.prepare('SELECT * FROM built_users WHERE space=?').get('first');assert.notEqual(stored.password_hash,'TestPassword123!');assert.equal(stored.password_hash.length,128);
  const persisted=await db.prepare('SELECT * FROM built_sessions WHERE space=?').get('first');assert.notEqual(persisted.token_hash,account.sessionToken);
  const failing=createGeneratedAPI({db,env:{RESEND_API_KEY:'fake',EMAIL_FROM:'sender@example.test',ADMIN_EMAIL:'owner@example.test'},fetcher:async()=>({ok:false})});const saved=await failing.request({space:'mailfailure',spec,path:'/api/contact',method:'POST',body:{name:'Visitor',email:'visitor@example.test',message:'Save despite email failure'}});assert.equal(saved.body.notification,'failed');assert.ok(await db.prepare('SELECT * FROM built_records WHERE space=?').get('mailfailure'));
  for(let i=0;i<13;i++){try{await request('limited','/api/auth/login','POST',{email:'missing@example.test',password:'TestPassword123!'});}catch(error){assert.equal(error.status,i===12?429:401);}}
 }finally{db.close();}
}
await verifyRuntime(process.argv[2],process.argv[3]);
