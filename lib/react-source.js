import {readFileSync} from 'node:fs';

export const reactFiles = ['main.jsx','App.jsx','Account.jsx','Records.jsx','Forms.jsx','Store.jsx','api.js','record-values.js'];
export function reactSource(accent) {
  return Object.fromEntries([
    ...reactFiles.map(name => [name,readFileSync(new URL('react-client/' + name,import.meta.url),'utf8')]),
    ['_package-lock.json',readFileSync(new URL('react-package-lock.json',import.meta.url),'utf8')],
    ['styles.css',readFileSync(new URL('generated-style.css',import.meta.url),'utf8') + '\n:root{--accent:' + accent + '}\n']
  ]);
}

/** Saved alongside compiled previews so historical projects retain their exact JSX. */
export function readReactSource(html) {
  const snapshot = html.match(/<script type="application\/json" id="react-source">([\s\S]*?)<\/script>/)?.[1];
  if (!snapshot) throw Error('React source snapshot is missing. Regenerate this project before downloading.');
  let data;
  try { data = JSON.parse(snapshot); } catch { throw Error('Invalid React source snapshot. Regenerate this project.'); }
  const expected = [...reactFiles.filter(name=>name!=='record-values.js'||typeof data?.[name]==='string'),'styles.css'];
  if(data&&typeof data==='object'&&!data['_package-lock.json'])data['_package-lock.json']=readFileSync(new URL('react-package-lock.json',import.meta.url),'utf8');
  expected.push('_package-lock.json');
  if (!data || typeof data !== 'object' || Object.keys(data).length !== expected.length || expected.some(name => typeof data[name] !== 'string' || !data[name].trim())) throw Error('Incomplete React source snapshot');
  return data;
}
