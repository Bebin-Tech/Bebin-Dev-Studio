import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {catalog} from '../lib/catalog.js';
import {validateCatalog,digest} from '../lib/catalog-integrity.js';
import {projectFiles,templateHTML} from '../lib/templates.js';
import {Script} from 'node:vm';
test('catalog rejects cosmetic layout clones and repeated source/asset designs',()=>{
 const report=validateCatalog(catalog);assert.equal(report.length,20);
 const clone={...catalog[0],id:'clone',name:'Different brand',colors:['#111','#fff']};
 assert.throws(()=>validateCatalog([catalog[0],clone]),/Duplicate layout/);
 const hashes=new Set();for(const t of catalog){const f=projectFiles(t);const hash=digest(f['public/index.html']+f['public/styles.css']);assert.ok(!hashes.has(hash),t.id);hashes.add(hash);}
});
test('previews embed the exact downloadable layout, CSS, scripts and illustrations',()=>{
 for(const t of catalog){const files=projectFiles(t),preview=templateHTML(t);assert.ok(preview.includes(t.body.replaceAll('src="assets/'+t.asset+'.svg"','src="data:image/svg+xml,'+encodeURIComponent(files['public/assets/'+t.asset+'.svg'])+'"')),t.id+' body');assert.ok(preview.includes('<style>'+files['public/styles.css']+'</style>'));assert.ok(preview.includes(files['public/app.js']));assert.ok(preview.includes(encodeURIComponent(files['public/assets/'+t.asset+'.svg'])));for(const [,script]of preview.matchAll(/<script>([\s\S]*?)<\/script>/g))new Script(script);}
});
test('screenshots are unique and tied to current rendered source revisions',()=>{
 const manifest=JSON.parse(readFileSync('public/screenshots/manifest.json','utf8')),hashes=new Set();
 for(const t of catalog){const row=manifest.find(x=>x.id===t.id);assert.ok(row,t.id);assert.equal(row.source,digest(templateHTML(t)));const bytes=readFileSync('public/screenshots/'+t.id+'.jpg');assert.ok(bytes.length>4000);const hash=digest(bytes);assert.ok(!hashes.has(hash),'duplicate preview '+t.id);hashes.add(hash);assert.equal(row.image,hash);}
});
