import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createDatabase} from '../lib/database.js';
import {defaultAppSpec,validateAppSpec,appSpecInstruction,assertSupportedBrief} from '../lib/app-spec.js';
import {applicationHTML,fullstackProjectFiles,generatedSchema} from '../lib/fullstack-project.js';
import {createGeneratedAPI,sessionDigest,validateRecord} from '../lib/generated-api.js';
import {groqComplete} from '../lib/groq.js';
const cases=[['Build a professional landing page','landing page'],['Build a productivity workspace','web app'],['Create an ERP inventory and sales application','web app'],['Create a CRM lead management application','web app'],['Build a school and courses platform','web app'],['Create a travel booking request application','web app'],['Create a finance expense tracker','web app'],['Build a coffee storefront with product orders','storefront']];
test('complete generated projects build, migrate and pass independent end-to-end tests',()=>{
 for(const [brief,type]of cases){
  const spec=defaultAppSpec(brief,type,'Independent '+type,'#635bff'),html=applicationHTML(spec),files=fullstackProjectFiles({html,app_spec:JSON.stringify(spec)});
  assert.equal(files['preview-source.html'],html);assert.equal(files['.env.example'].includes('ADMIN_PASSWORD=\n'),true);
  let reconstructed=files['public/index.html'];
  reconstructed=reconstructed.replace(/<link rel="stylesheet" href="([^"]+)">/g,(_,file)=>'<style>'+files['public/'+file]+'</style>');
  reconstructed=reconstructed.replace(/<script([^>]*) src="([^"]+)"><\/script>/g,(_,attrs,file)=>'<script'+attrs+'>'+files['public/'+file]+'</script>');
  assert.equal(reconstructed,html,'preview matches complete source');
  const dir=mkdtempSync(path.join(tmpdir(),'bebin-fullstack-'));
  try{
   for(const [name,content]of Object.entries(files)){const target=path.join(dir,name);mkdirSync(path.dirname(target),{recursive:true});writeFileSync(target,content);}
   for(const args of [['scripts/build.mjs'],['scripts/migrate.mjs'],['--test','tests/application.test.mjs']]){
    const result=spawnSync(process.execPath,args,{cwd:dir,encoding:'utf8',env:{...process.env,VERCEL:'',TURSO_DATABASE_URL:'',TURSO_AUTH_TOKEN:'',DATA_DIR:'',DATABASE_DRIVER:''},timeout:30000});assert.equal(result.status,0,brief+' '+args.join(' ')+'\n'+result.stdout+'\n'+result.stderr);
   }
  }finally{rmSync(dir,{recursive:true,force:true});}
 }
});
test('AI specifications are parsed, validated and cannot introduce executable backend code',async()=>{
 const spec=defaultAppSpec('Build a CRM for lead management','web app');let request;
 const result=await groqComplete('CRM',{application:true,instruction:appSpecInstruction,key:'fake-test',fetcher:async(url,options)=>{request=JSON.parse(options.body);return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(spec)}}]})};}});
 assert.deepEqual(validateAppSpec(result),spec);assert.match(request.messages[0].content,/not code/);
 assert.throws(()=>validateAppSpec({...spec,collections:[{name:'../secret',fields:[]}]}),/Invalid/);
 assert.throws(()=>validateAppSpec({...spec,collections:[{name:'contacts',fields:[{name:'__proto__',type:'text'}]}]}),/Invalid/);
 assert.throws(()=>validateAppSpec({...spec,collections:[{name:'contacts',fields:[{name:'script',type:'javascript'}]}]}),/Unsupported/);
 assert.throws(()=>validateAppSpec({...spec,integrations:['stripe']}),/Unsupported integration/);
 assert.throws(()=>assertSupportedBrief('Build a shop accepting Stripe payments'),/does not yet implement/);
 assert.doesNotThrow(()=>assertSupportedBrief('Build a shop with unpaid orders'));
 assert.throws(()=>validateRecord(spec.collections[0],{unknown:'value'}),/Unknown/);
 await assert.rejects(groqComplete('CRM',{application:true,instruction:appSpecInstruction,key:'fake',fetcher:async()=>({ok:true,json:async()=>({choices:[{message:{content:'<script>malicious()</script>'}}]})})}),/invalid application specification/);
});
for(const driver of ['sqlite','libsql'])test('generated namespaces, integrations and auth rate limits: '+driver,()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'bebin-runtime-'));
 try{const result=spawnSync(process.execPath,['tests/fullstack-scenario.mjs',dir,driver],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);}finally{rmSync(dir,{recursive:true,force:true});}
});
