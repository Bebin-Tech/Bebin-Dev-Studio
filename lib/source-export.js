import {createHash} from 'node:crypto';

const runtime=`import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const publicRoot=fileURLToPath(new URL('./public/',import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2'};
const port=Number(process.env.PORT||4173);
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end('Method not allowed');}
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const segments=pathname.split('/').filter(Boolean);
  if(segments.some(s=>s.startsWith('.')||s.includes('\\\\'))){res.writeHead(404);return res.end('Not found');}
  const file=path.resolve(publicRoot,...(segments.length?segments:['index.html']));
  const relative=path.relative(publicRoot,file);
  if(relative.startsWith('..')||path.isAbsolute(relative)||!(await stat(file)).isFile()){res.writeHead(404);return res.end('Not found');}
  const content=await readFile(file);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':content.length,'Cache-Control':'no-store'});
  res.end(req.method==='HEAD'?undefined:content);
 }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log('Your app is running at http://127.0.0.1:'+server.address().port));
`;

const build=`import {readFileSync,mkdirSync,cpSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
const html=readFileSync('public/index.html','utf8');
if(!html.trim())throw Error('public/index.html is empty');
const syntax=spawnSync(process.execPath,['--check','server.mjs'],{stdio:'inherit'});
if(syntax.status)process.exit(syntax.status);
const temporary=mkdtempSync(path.join(tmpdir(),'app-build-'));
try{
 let index=0;
 for(const script of html.matchAll(/<script\\b([^>]*)>([\\s\\S]*?)<\\/script\\s*>/gi)){
  const attributes=script[1],type=attributes.match(/\\btype\\s*=\\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
  if(/\\bsrc\\s*=/i.test(attributes)||(type&&!['module','text/javascript','application/javascript'].includes(type)))continue;
  const file=path.join(temporary,'inline-'+index+++(type==='module'?'.mjs':'.cjs'));
  writeFileSync(file,script[2]);
  const result=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});
  if(result.status)throw Error('Inline JavaScript syntax check failed');
 }
 mkdirSync('dist',{recursive:true});cpSync('public','dist',{recursive:true});
 console.log('Source syntax verified. Static build created in dist/. Test your app interactions in the browser.');
}finally{rmSync(temporary,{recursive:true,force:true});}
`;

export function sourceProjectFiles(project){
 const html=String(project.html||'');
 const name=String(project.name||'My app').replace(/[\r\n]/g,' ').slice(0,80);
 const slug=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,64)||'my-app';
 return {
  'public/index.html':html,
  'server.mjs':runtime,
  'build.mjs':build,
  'package.json':JSON.stringify({name:slug,version:'1.0.0',private:true,type:'module',engines:{node:'>=24'},scripts:{start:'node server.mjs',dev:'node server.mjs',build:'node build.mjs'},dependencies:{}},null,2)+'\n',
  '.gitignore':'node_modules/\ndist/\n.env\n',
  'source-manifest.json':JSON.stringify({name,type:project.type||'website',entry:'public/index.html',sha256:createHash('sha256').update(html).digest('hex')},null,2)+'\n',
  'README.md':`# ${name}\n\nThe complete saved HTML document from your Bebin Dev Studio live preview is in public/index.html. Its inline CSS, JavaScript and embedded assets are preserved exactly, including your source edits. No studio account, database connection or API key is included or required to run this export.\n\n## Run in VS Code\n\n1. Extract this ZIP and open the extracted folder in VS Code.\n2. Install Node.js 24 or newer.\n3. Open the integrated terminal and run:\n\n\`\`\`sh\nnpm install\nnpm run build\nnpm start\n\`\`\`\n\nOpen http://127.0.0.1:4173. npm install needs no third-party dependencies. Set PORT to choose another port. The server binds to your own computer.\n\n## Edit and use independently\n\nEdit public/index.html in VS Code. Styles and scripts are inline so the download matches the saved preview. You can move them into public/styles.css and public/app.js and reference those files from the HTML. Put additional assets inside public/. Refresh the browser after saving. npm run dev also starts the local server. npm run build verifies inline JavaScript syntax and copies public/ to dist/ for static hosting.\n\n## Functionality and verification\n\nThis is the application shown in the preview, not the Bebin Dev Studio builder itself. Generated local interactions remain local; the exported server serves files and does not invent backend integrations. Demonstration forms, carts and account screens do not become live email, payments or authentication services by downloading. Add your own backend for those services. Existing browser-local data is not exported.\n\nThe export runner is tested with the supported generated project types. Your generated/edited content is not automatically certified functional: run npm run build and check navigation, forms and other interactions after every change. Custom external URLs or integrations introduced in your edits need their own configuration. source-manifest.json records the original HTML checksum for preview/download comparison. Never place secrets inside public/.\n`
 };
}
