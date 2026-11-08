import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultAppSpec,validateAppSpec} from '../lib/app-spec.js';
import {applicationHTML,fullstackProjectFiles} from '../lib/fullstack-project.js';
test('briefs choose distinct layouts and compatible working views',()=>{
 const cases=[['portfolio gallery','cards','editorial'],['recipe catalog','cards','sidebar'],['real estate properties','cards','sidebar'],['task project pipeline','board','sidebar'],['appointment booking','calendar','sidebar'],['finance expense tracker','ledger','sidebar'],['education course catalog editorial','cards','editorial'],['creative music studio','table','studio']];
 const signatures=new Set();
 for(const [brief,view,layout] of cases){const spec=defaultAppSpec(brief,'web app');assert.equal(spec.design.views[spec.collections[0].name],view);assert.equal(spec.design.layout,layout);assert.deepEqual(validateAppSpec(spec),spec);signatures.add(JSON.stringify(spec.design));}
 assert.equal(signatures.size,cases.length);
});
test('invalid view prerequisites safely fall back and design cannot carry executable properties',()=>{
 const spec=defaultAppSpec('simple tracker','web app');const result=validateAppSpec({...spec,design:{layout:'javascript:bad',palette:'url(bad)',views:{tasks:'calendar'},html:'<script>'}});
 assert.equal(result.design.layout,'sidebar');assert.equal(result.design.views.tasks,'calendar'); // tasks have a date
 assert.equal(result.design.html,undefined);
 const withoutDate={...spec,collections:[{name:'notes',label:'Notes',fields:[{name:'title',label:'Title',type:'text'}]}],design:{views:{notes:'board'}}};
 assert.equal(validateAppSpec(withoutDate).design.views.notes,'cards');
});
test('React source exports preserve the prompt presentation and working API backed views',()=>{
 const spec=validateAppSpec({...defaultAppSpec('finance expense tracker dark','web app'),framework:'react'});
 const html=applicationHTML(spec),files=fullstackProjectFiles({app_spec:spec,html});
 assert.deepEqual(JSON.parse(files['application.json']).design,spec.design);
 assert.match(files['src/Records.jsx'],/record-groups/);assert.match(files['src/Records.jsx'],/api\('\/api\/records\//);
 assert.match(files['src/App.jsx'],/spec.design/);assert.match(files['src/styles.css'],/palette-midnight/);
 assert.ok(files['backend/api.js']);assert.ok(files['database/migrations/001_initial.sql']);
});
