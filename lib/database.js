import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import path from 'node:path';

export async function createDatabase({root,env=process.env,client}={}){
 const remote=!!env.TURSO_DATABASE_URL;
 if(env.VERCEL&&!remote&&!client)throw Error('Configure a persistent TURSO_DATABASE_URL before deploying.');
 if(remote&&!env.TURSO_AUTH_TOKEN&&!client)throw Error('Configure TURSO_AUTH_TOKEN for the persistent database.');
 if(client||remote||env.DATABASE_DRIVER==='libsql'){
  if(!client){
   const dataDir=env.DATA_DIR||path.join(root,'data');
   if(!remote)mkdirSync(dataDir,{recursive:true});
   const {createClient}=await import(remote?'@libsql/client/web':'@libsql/client');
   client=createClient({url:remote?env.TURSO_DATABASE_URL:'file:'+path.join(dataDir,'studio.sqlite').replaceAll('\\','/'),authToken:remote?env.TURSO_AUTH_TOKEN:undefined});
  }
  const execute=async(sql,args=[])=>client.execute({sql,args:args.map(v=>v===undefined?null:v)});
  return {kind:'libsql',exec:sql=>client.executeMultiple(sql),prepare:sql=>({get:async(...args)=>(await execute(sql,args)).rows[0],all:async(...args)=>(await execute(sql,args)).rows,run:(...args)=>execute(sql,args)}),batch:statements=>client.batch(statements,'write'),close:()=>client.close()};
 }
 const dataDir=env.DATA_DIR||path.join(root,'data');mkdirSync(dataDir,{recursive:true});
 const sqlite=new DatabaseSync(path.join(dataDir,'studio.sqlite'));sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
 return {kind:'sqlite',exec:sql=>sqlite.exec(sql),prepare:sql=>sqlite.prepare(sql),batch:async statements=>{sqlite.exec('BEGIN IMMEDIATE');try{const rows=statements.map(({sql,args=[]})=>sqlite.prepare(sql).run(...args));sqlite.exec('COMMIT');return rows;}catch(error){sqlite.exec('ROLLBACK');throw error;}},close:()=>sqlite.close()};
}
