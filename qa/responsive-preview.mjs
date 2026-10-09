import http from 'node:http';
const html='<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Responsive workspace QA</title><style>body{margin:20px;background:#e9edf1;font:14px system-ui}section{display:inline-block;vertical-align:top;margin:10px}iframe{display:block;border:1px solid #8a9bac;border-radius:12px;background:white}</style><section><h2>Mobile · 390px</h2><iframe id="mobile-frame" title="Mobile workspace" width="390" height="844" src="http://127.0.0.1:3012/"></iframe></section><section><h2>Tablet · 768px</h2><iframe id="tablet-frame" title="Tablet workspace" width="768" height="844" src="http://127.0.0.1:3012/"></iframe></section>';
http.createServer(async(req,res)=>{
 if(req.url==='/qa'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(html.replaceAll('http://127.0.0.1:3012/','http://127.0.0.1:3013/'));}
 // Loopback-only QA proxy enables framed responsive testing; production keeps DENY.
 const headers={Cookie:req.headers.cookie||'','Content-Type':req.headers['content-type']||'application/json'};
 if(req.headers.origin)headers.Origin='http://127.0.0.1:3012';
 const data=await fetch('http://127.0.0.1:3012'+req.url,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:req,duplex:'half'});
 res.statusCode=data.status;
 for(const key of ['content-type','content-security-policy','cache-control','set-cookie','content-disposition'])if(data.headers.has(key))res.setHeader(key,data.headers.get(key));
 res.end(Buffer.from(await data.arrayBuffer()));
}).listen(3013,'127.0.0.1',()=>console.log('Responsive QA at http://127.0.0.1:3013/qa'));
