import {build, context} from 'esbuild';
import {readFileSync, mkdirSync, writeFileSync, copyFileSync} from 'node:fs';
import {validateAppSpec} from '../backend/spec.js';

export async function buildFrontend(watch = false) {
  const spec = validateAppSpec(JSON.parse(readFileSync('application.json','utf8')));
  mkdirSync('public/scripts',{recursive:true});
  copyFileSync('src/styles.css','public/styles.css');
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  writeFileSync('public/index.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(spec.name)}</title><link rel="stylesheet" href="/scripts/app.css"></head><body><div id="application" data-framework="react">Connecting to your application…</div><script type="application/json" id="application-spec">${JSON.stringify(spec).replaceAll('<','\\u003c')}</script><script src="/scripts/app.js" defer></script></body></html>`);
  const options = {entryPoints:['src/main.jsx'],outfile:'public/scripts/app.js',bundle:true,format:'iife',platform:'browser',target:'es2022',jsx:'automatic',minify:!watch,define:{'process.env.NODE_ENV':JSON.stringify(watch ? 'development' : 'production')},legalComments:'inline'};
  if (watch) { const compiler = await context(options); await compiler.watch(); return compiler; }
  await build(options);
}

if (process.argv[1]?.replaceAll('\\','/').endsWith('/build-frontend.mjs')) await buildFrontend();
