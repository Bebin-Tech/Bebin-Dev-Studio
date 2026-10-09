import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createDatabase} from '../lib/database.js';
import {spawnSync} from 'node:child_process';
for(const driver of ['sqlite','libsql'])test(driver+' atomic batches, rollback, concurrent usage and persistence',async()=>{
 const root=mkdtempSync(path.join(tmpdir(),'bebin-db-'));
 try{const result=spawnSync(process.execPath,['--input-type=module','-e',"import {verifyDatabase} from './tests/database-scenario.mjs';await verifyDatabase(process.argv[1],process.argv[2]);",root,driver],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);}
 finally{rmSync(root,{recursive:true,force:true});}
});
test('Vercel refuses ephemeral storage and missing database credentials',async()=>{
 await assert.rejects(createDatabase({root:'.',env:{VERCEL:'1'}}),/persistent/);
 await assert.rejects(createDatabase({root:'.',env:{VERCEL:'1',TURSO_DATABASE_URL:'libsql:\/\/example.turso.io'}}),/TURSO_AUTH_TOKEN/);
});
