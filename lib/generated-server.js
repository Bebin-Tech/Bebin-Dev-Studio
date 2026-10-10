import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {createDatabase} from './backend/database.js';
import {createGeneratedAPI} from './backend/api.js';
import {validateAppSpec} from './backend/spec.js';
import {loadEnvironment} from './backend/environment.js';
const root=path.dirname(fileURLToPath(import.meta.url));
loadEnvironment(path.join(root,'.env'));
const spec=validateAppSpec(JSON.parse(readFileSync(path.join(root,'application.json'),'utf8')));
const db=await createDatabase({root});
await db.exec(readFileSync(path.join(root,'database/migrations/001_initial.sql'),'utf8'));
const api=createGeneratedAPI({db,env:process.env});
await api.bootstrap('application');
const production=process.env.NODE_ENV==='production'||!!process.env.VERCEL;
if(production&&!process.env.ADMIN_EMAIL)throw Error('Configure ADMIN_EMAIL and bootstrap your administrator before production');
if(production&&!process.env.APP_BASE_URL?.startsWith('https://'))throw Error('Set an HTTPS APP_BASE_URL in production');
if(production&&!process.env.TURSO_DATABASE_URL&&!process.env.DATA_DIR)throw Error('Configure durable database storage in production');
const publicRoot=path.join(root,'public');
const sessionName=production?'__Host-app_session':'app_session';
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon'};
function cookie(token,clear=false){return `${sessionName}=${clear?'':token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${clear?0:30*86400}${production?'; Secure':''}`;}
function token(req){return String(req.headers.cookie||'').split(';').map(c=>c.trim()).find(c=>c.startsWith(sessionName+'='))?.slice(sessionName.length+1);}
async function bodyJSON(req){
 if(!req.headers['content-type']?.startsWith('application/json')||req.headers['x-app-request']!=='1')throw Object.assign(Error('Use a JSON request with X-App-Request: 1'),{status:415});
 let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>65536)throw Object.assign(Error('Request too large'),{status:413});}
 try{const body=JSON.parse(raw||'{}');if(!body||typeof body!=='object'||Array.isArray(body))throw Error();return body;}catch{throw Object.assign(Error('Invalid JSON'),{status:400});}
}
export const server=http.createServer(async(req,res)=>{
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');res.setHeader('Cache-Control','no-store');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'");
 if(production)res.setHeader('Strict-Transport-Security','max-age=31536000');
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/')){
   const expected=process.env.APP_BASE_URL||`http://${req.headers.host}`;
   if(req.headers.origin&&req.headers.origin!==new URL(expected).origin)return send(403,{error:'Invalid request origin'});
   const body=['GET','HEAD'].includes(req.method)?{}:await bodyJSON(req);
   const response=await api.request({space:'application',spec,path:url.pathname+url.search,method:req.method,body,token:token(req),client:req.socket.remoteAddress||'unknown'});
   if(response.sessionToken)res.setHeader('Set-Cookie',cookie(response.sessionToken));
   if(response.clearSession)res.setHeader('Set-Cookie',cookie('',true));
   return send(response.status,response.body);
  }
  if(!['GET','HEAD'].includes(req.method))return send(405,{error:'Method not allowed'});
  const segments=decodeURIComponent(url.pathname).split('/').filter(Boolean);
  if(segments.some(s=>s.startsWith('.')||s.includes('\\')))return send(404,{error:'Not found'});
  const file=path.resolve(publicRoot,...(segments.length?segments:['index.html'])),relative=path.relative(publicRoot,file);
  if(relative.startsWith('..')||path.isAbsolute(relative))return send(404,{error:'Not found'});
  let content;try{content=await readFile(file);}catch{return send(404,{error:'Not found'});}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':content.length});res.end(req.method==='HEAD'?undefined:content);
 }catch(error){const status=Number.isInteger(error.status)&&error.status>=400&&error.status<600?error.status:500;if(status===500)console.error('Application request failed');send(status,{error:status===500?'Unexpected server error. Please retry.':error.message});}
});
if(!process.env.VERCEL)server.listen(Number(process.env.PORT||4173),process.env.HOST||'127.0.0.1',()=>console.log('Application running at http://127.0.0.1:'+server.address().port));
export default server;
