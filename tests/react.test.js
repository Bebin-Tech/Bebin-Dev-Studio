import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {defaultAppSpec, validateAppSpec, assertSupportedBrief} from '../lib/app-spec.js';
import {applicationHTML, fullstackProjectFiles} from '../lib/fullstack-project.js';
import {reactFiles, readReactSource} from '../lib/react-source.js';

test('React exports preserve JSX snapshots, compile the preview bundle and pass backend workflows', () => {
  for (const [prompt,type] of [['React expense tracker with categories','web app'],['React education courses and students app','web app'],['React coffee catalog with unpaid orders','storefront']]) {
    const spec = validateAppSpec({...defaultAppSpec(prompt,type,'React '+type),framework:'react'});
    const html = applicationHTML(spec);
    const files = fullstackProjectFiles({html,app_spec:JSON.stringify(spec)});
    const snapshot = readReactSource(html);
    for (const file of reactFiles) assert.equal(files['src/'+file],snapshot[file]);
    assert.equal(files['preview-source.html'],html);
    assert.match(files['src/main.jsx'],/createRoot/);
    assert.match(files['src/Records.jsx'],/useState/);
    assert.doesNotMatch(files['src/App.jsx'],/innerHTML|dangerouslySetInnerHTML/);
    assert.equal(JSON.parse(files['package.json']).dependencies.react,'19.3.1');
    assert.match(html,/data-framework="react"/);
    const dir = mkdtempSync(path.join(tmpdir(),'bebin-react-'));
    try {
      for (const [name,content] of Object.entries(files)) {
        const target=path.join(dir,name); mkdirSync(path.dirname(target),{recursive:true}); writeFileSync(target,content);
      }
      symlinkSync(path.resolve('node_modules'),path.join(dir,'node_modules'),'junction');
      const env={...process.env,VERCEL:'',TURSO_DATABASE_URL:'',TURSO_AUTH_TOKEN:'',DATA_DIR:'',DATABASE_DRIVER:''};
      for (const args of [['scripts/build.mjs'],['scripts/migrate.mjs'],['--test','tests/application.test.mjs']]) {
        const result=spawnSync(process.execPath,args,{cwd:dir,encoding:'utf8',env,timeout:45000});
        assert.equal(result.status,0,prompt+'\n'+result.stdout+'\n'+result.stderr);
      }
      const bundle=readFileSync(path.join(dir,'public/scripts/app.js'),'utf8');
      assert.equal(bundle,readFileSync('lib/react-preview.bundle.js','utf8'),'preview and downloaded JSX compile to exactly the same React JS');
      assert.match(readFileSync(path.join(dir,'public/index.html'),'utf8'),/scripts\/app.css/);
      assert.match(readFileSync(path.join(dir,'public/scripts/app.css'),'utf8'),/--accent/);
    } finally { rmSync(dir,{recursive:true,force:true}); }
  }
});

test('React is supported while native frameworks and malformed source snapshots fail explicitly', () => {
  assert.doesNotThrow(()=>assertSupportedBrief('Create a React app with a Node backend'));
  assert.throws(()=>assertSupportedBrief('Create a React Native app'),/framework-specific/);
  assert.throws(()=>validateAppSpec({...defaultAppSpec('Records application','web app'),framework:'angular'}),/Unsupported frontend/);
  assert.throws(()=>readReactSource('<html></html>'),/missing/);
  assert.throws(()=>readReactSource('<script type="application/json" id="react-source">{}</script>'),/Incomplete/);
});
