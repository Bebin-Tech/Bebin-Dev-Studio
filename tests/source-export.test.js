import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {sourceProjectFiles} from '../lib/source-export.js';
import {catalog} from '../lib/catalog.js';
import {templateHTML} from '../lib/templates.js';
import {zip} from '../lib/zip.js';
export function unpack(buffer){const files={};let i=0;while(buffer.readUInt32LE(i)===0x04034b50){const size=buffer.readUInt32LE(i+18),n=buffer.readUInt16LE(i+26),extra=buffer.readUInt16LE(i+28),name=buffer.subarray(i+30,i+30+n).toString(),start=i+30+n+extra;files[name]=buffer.subarray(start,start+size).toString();i=start+size;}return files;}
test('preview source ZIPs preserve exact content, build and run independently',async()=>{
 for(const t of catalog){
  const html=templateHTML(t),original=sourceProjectFiles({name:t.name,type:t.type,html}),files=unpack(zip(original));assert.deepEqual(files,original);
  assert.equal(files['public/index.html'],html);assert.equal(JSON.parse(files['source-manifest.json']).sha256,createHash('sha256').update(html).digest('hex'));
  assert.deepEqual(JSON.parse(files['package.json']).dependencies,{});
  const dir=mkdtempSync(path.join(tmpdir(),'bebin-export-'));let proc;
  try{
   for(const [name,content]of Object.entries(files)){const file=path.join(dir,name);mkdirSync(path.dirname(file),{recursive:true});writeFileSync(file,content);}
   const build=spawnSync(process.execPath,['build.mjs'],{cwd:dir,encoding:'utf8'});assert.equal(build.status,0,t.id+': '+build.stderr);
   assert.equal(readFileSync(path.join(dir,'dist/index.html'),'utf8'),html);
   proc=spawn(process.execPath,['server.mjs'],{cwd:dir,env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
   // Read the listening address from the runtime, which uses an OS-assigned test port.
   const output=await new Promise((resolve,reject)=>{proc.stdout.once('data',x=>resolve(x.toString()));proc.once('error',reject);proc.once('exit',c=>reject(Error('Export exited '+c)));});
   const base=output.match(/http:\/\/127\.0\.0\.1:\d+/)[0];
   assert.equal(await (await fetch(base)).text(),html);
   assert.equal((await fetch(base+'/.env')).status,404);assert.equal((await fetch(base+'/package.json')).status,404);
   assert.equal((await fetch(base,{method:'POST'})).status,405);
  }finally{if(proc){const ended=new Promise(r=>proc.once('exit',r));proc.kill();await ended;}rmSync(dir,{recursive:true,force:true});}
 }
});
test('export build rejects malformed JavaScript instead of certifying it',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'bebin-invalid-export-'));
 try{for(const [name,content]of Object.entries(sourceProjectFiles({html:'<!doctype html><script>const broken = ;</script>'}))){const file=path.join(dir,name);mkdirSync(path.dirname(file),{recursive:true});writeFileSync(file,content);}assert.notEqual(spawnSync(process.execPath,['build.mjs'],{cwd:dir,stdio:'ignore'}).status,0);}finally{rmSync(dir,{recursive:true,force:true});}
});
