import assert from 'node:assert/strict';
import {createDatabase} from '../lib/database.js';
import {consumeUsage} from '../lib/usage.js';
export async function verifyDatabase(root,driver){
 const env={DATABASE_DRIVER:driver};let db=await createDatabase({root,env});
 try{
  await db.exec('CREATE TABLE items(id TEXT PRIMARY KEY,value TEXT);CREATE TABLE usage_limits(bucket TEXT PRIMARY KEY,count INTEGER);');
  await db.batch([{sql:'INSERT INTO items VALUES(?,?)',args:['a','original']},{sql:'INSERT INTO items VALUES(?,?)',args:['b','second']}]);
  await assert.rejects(db.batch([{sql:'UPDATE items SET value=? WHERE id=?',args:['changed','a']},{sql:'INSERT INTO items VALUES(?,?)',args:['b','duplicate']}]));
  assert.equal((await db.prepare('SELECT * FROM items WHERE id=?').get('a')).value,'original');
  const outcomes=await Promise.allSettled(Array.from({length:8},()=>consumeUsage(db,'ai-test',3,60000,1000)));
  assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,3);assert.ok(outcomes.filter(x=>x.status==='rejected').every(x=>x.reason.status===429));
  db.close();db=await createDatabase({root,env});assert.equal((await db.prepare('SELECT count(*) AS n FROM items').get()).n,2);
 }finally{db.close();}
}
