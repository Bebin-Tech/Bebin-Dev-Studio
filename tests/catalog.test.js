import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {catalog,categories} from '../lib/catalog.js';
import {projectFiles,templateHTML} from '../lib/templates.js';
import {zip} from '../lib/zip.js';
function unpack(buffer){const files={};let i=0;while(buffer.readUInt32LE(i)===0x04034b50){const size=buffer.readUInt32LE(i+18),namesize=buffer.readUInt16LE(i+26),extra=buffer.readUInt16LE(i+28),name=buffer.subarray(i+30,i+30+namesize).toString(),start=i+30+namesize+extra;files[name]=buffer.subarray(start,start+size).toString();i=start+size;}return files;}
test('all distinct actual source archives build, pass their tests and serve working APIs',async()=>{
 assert.equal(catalog.length,20);assert.equal(new Set(catalog.map(x=>x.category)).size,categories.length);const results=[];
 for(const t of catalog){const dir=mkdtempSync(path.join(tmpdir(),'bebin-template-'));let process;
 try{const original=projectFiles(t),files=unpack(zip(original));assert.deepEqual(files,original);
 for(const [name,content]of Object.entries(files)){const file=path.join(dir,name);mkdirSync(path.dirname(file),{recursive:true});writeFileSync(file,content);}
 const build=spawnSync(globalThis.process.execPath,['build.mjs'],{cwd:dir,encoding:'utf8'});assert.equal(build.status,0,t.id+' build: '+build.stderr);
 const tests=spawnSync(globalThis.process.execPath,['--test','tests/project.test.mjs'],{cwd:dir,encoding:'utf8'});assert.equal(tests.status,0,t.id+' tests: '+tests.stderr);
 process=spawn(globalThis.process.execPath,['server.mjs'],{cwd:dir,env:{...globalThis.process.env,PORT:'3191',GROQ_API_KEY:''},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{process.stdout.once('data',resolve);process.once('error',reject);process.once('exit',code=>reject(Error('Project exited '+code)));});
 const base='http://127.0.0.1:3191';assert.equal((await fetch(base)).status,200);for(const name of ['/styles.css','/app.js','/assets/brand.svg','/assets/'+t.asset+'.svg'])assert.equal((await fetch(base+name)).status,200);
 assert.equal((await fetch(base+'/.env')).status,404);
 const contact=await fetch(base+'/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'tester@example.com',message:'Inquiry from the automated smoke test'})});assert.equal(contact.status,201);
 const invalid=await fetch(base+'/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"email":"bad"}'});assert.equal(invalid.status,400);
 const reg=await fetch(base+'/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'tester@example.com',password:'LocalTemplate123!',name:'Template Tester'})});assert.equal(reg.status,200);const cookie=reg.headers.get('set-cookie').split(';')[0];assert.equal((await fetch(base+'/api/me',{headers:{Cookie:cookie}})).status,200);
 const logout=await fetch(base+'/api/logout',{method:'POST',headers:{Cookie:cookie}});assert.equal(logout.status,200);assert.equal((await fetch(base+'/api/me',{headers:{Cookie:cookie}})).status,401);
 const login=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'tester@example.com',password:'LocalTemplate123!'})});assert.equal(login.status,200);
 const unavailable=await fetch(base+'/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"prompt":"Write a launch plan"}'});assert.equal(unavailable.status,503);
 const html=templateHTML(t);assert.match(html,/sandbox|template-config/);assert.ok(!html.includes('test-key'));results.push({id:t.id,sha256:createHash('sha256').update(JSON.stringify(original)).digest('hex'),build:true,http:true,auth:true,forms:true});
 }finally{if(process){const exited=new Promise(resolve=>process.once('exit',resolve));process.kill();await exited;}rmSync(dir,{recursive:true,force:true});}}
 writeFileSync('catalog-validation.json',JSON.stringify({checkedAt:new Date().toISOString(),results},null,2));
});
