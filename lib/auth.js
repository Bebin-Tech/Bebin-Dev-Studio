import {randomBytes,createHash} from 'node:crypto';
import {createRemoteJWKSet,jwtVerify} from 'jose';
import nodemailer from 'nodemailer';
import {consumeUsage} from './usage.js';
const googleKeys=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const digest=value=>createHash('sha256').update(value).digest('hex');
const random=()=>randomBytes(32).toString('base64url');
const failure=(message,status=400)=>Object.assign(Error(message),{status});
const emailValid=email=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&email.length<=254;
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MAX_AGE=400*86400;
export async function verifyGoogleIdentity(token,{clientId,nonce,keys=googleKeys}){
 const {payload}=await jwtVerify(token,keys,{issuer:['https://accounts.google.com','accounts.google.com'],audience:clientId,algorithms:['RS256'],maxTokenAge:'10m',clockTolerance:5});
 if(payload.nonce!==nonce||payload.email_verified!==true||!emailValid(payload.email||'')||typeof payload.sub!=='string'||!payload.sub||payload.sub.length>255||(payload.azp&&payload.azp!==clientId))throw failure('Google could not verify this identity.');
 return payload;
}
export async function createAuth({db,env=process.env,fetcher=fetch,mailer,verifyIdentity=verifyGoogleIdentity,now=()=>Date.now()}){
 await db.exec(`CREATE TABLE IF NOT EXISTS auth_challenges(hash TEXT PRIMARY KEY,purpose TEXT,payload TEXT,expires INTEGER);
 CREATE TABLE IF NOT EXISTS auth_identities(provider TEXT,subject TEXT,user_id TEXT REFERENCES users(id),PRIMARY KEY(provider,subject));
 CREATE INDEX IF NOT EXISTS auth_challenges_expiry ON auth_challenges(expires);
 CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires);`);
 const secure=env.NODE_ENV==='production'||!!env.VERCEL,cookieName=secure?'__Host-session':'session';
 const cookies=req=>Object.fromEntries(String(req.headers.cookie||'').split(';').map(s=>s.trim().split('=')));
 const setCookie=(res,name,value,maxAge,sameSite='Lax')=>{const old=res.getHeader('Set-Cookie')||[];res.setHeader('Set-Cookie',[...(Array.isArray(old)?old:[old]),`${name}=${value}; HttpOnly; SameSite=${sameSite}; Path=/; Max-Age=${maxAge}${secure?'; Secure':''}`]);};
 const base=()=>{let url;try{url=new URL(env.APP_BASE_URL);}catch{throw failure('Sign-in is not configured yet.',503);}if(url.username||url.password||url.pathname!=='/'||url.search||url.hash||(url.protocol!=='https:'&&(secure||url.protocol!=='http:'||!['localhost','127.0.0.1'].includes(url.hostname))))throw failure('Sign-in URL is not configured securely.',503);return url.origin;};
 const emailReady=()=>!!env.EMAIL_FROM&&!!(mailer||(env.RESEND_API_KEY)||(env.SMTP_HOST&&env.SMTP_USER&&env.SMTP_PASSWORD));
 const googleReady=()=>!!env.GOOGLE_CLIENT_ID&&!!env.GOOGLE_CLIENT_SECRET&&!!env.APP_BASE_URL;
 const config=()=>({google:googleReady(),email:emailReady()&&!!env.APP_BASE_URL});
 const rate=async(req,key='auth',limit=20,window=60000)=>{const ip=env.VERCEL?String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim():req.socket?.remoteAddress||'unknown';await consumeUsage(db,key+':'+digest(ip),limit,window,now());};
 async function challenge(purpose,payload,ttl=900000){const token=random();await db.prepare('DELETE FROM auth_challenges WHERE expires<=?').run(now());await db.prepare('INSERT INTO auth_challenges VALUES(?,?,?,?)').run(digest(token),purpose,JSON.stringify(payload),now()+ttl);return token;}
 async function peek(token,purpose){if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))throw failure('This sign-in link is invalid or expired.');const row=await db.prepare('SELECT * FROM auth_challenges WHERE hash=? AND purpose=? AND expires>?').get(digest(token),purpose,now());if(!row)throw failure('This sign-in link is invalid or expired.');return JSON.parse(row.payload);}
 async function consume(token,purpose){const row=await db.prepare('DELETE FROM auth_challenges WHERE hash=? AND purpose=? AND expires>? RETURNING payload').get(digest(token),purpose,now());if(!row)throw failure('This sign-in link was already used or has expired.');return JSON.parse(row.payload);}
 async function account(email,name,subject){email=email.toLowerCase();if(subject){const known=await db.prepare('SELECT users.* FROM users JOIN auth_identities ON users.id=auth_identities.user_id WHERE provider=? AND subject=?').get('google',subject);if(known)return known;}
  await db.prepare('INSERT INTO users(id,email,name,password,salt) VALUES(?,?,?,?,?) ON CONFLICT(email) DO NOTHING').run(randomBytes(16).toString('hex'),email,String(name||email.split('@')[0]).slice(0,80),null,null);
  const user=await db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if(subject){await db.prepare('INSERT INTO auth_identities VALUES(?,?,?) ON CONFLICT(provider,subject) DO NOTHING').run('google',subject,user.id);const identity=await db.prepare('SELECT user_id FROM auth_identities WHERE provider=? AND subject=?').get('google',subject);if(identity.user_id!==user.id)throw failure('This Google identity is linked to a different account.',409);}
  return user;
 }
 async function issue(req,res,user){const token=randomBytes(32).toString('hex'),previous=cookies(req)[cookieName]||cookies(req).session;await db.batch([...(previous?[{sql:'DELETE FROM sessions WHERE token=?',args:[digest(previous)]}]:[]),{sql:'INSERT INTO sessions VALUES(?,?,?)',args:[digest(token),user.id,now()+MAX_AGE*1000]}]);setCookie(res,cookieName,token,MAX_AGE);if(secure)setCookie(res,'session','',0);return user;}
 async function authenticated(req,res){const jar=cookies(req),token=jar[cookieName]||jar.session;if(!token||!/^[a-f0-9]{64}$/.test(token))return null;const hash=digest(token);const row=await db.prepare('SELECT users.*,sessions.expires AS session_expires FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=? AND expires>?').get(hash,now());if(!row)return null;
  // Renew a rolling browser cookie and server expiry at most once per day.
  if(row.session_expires<now()+(MAX_AGE-86400)*1000||!jar[cookieName]){await db.prepare('UPDATE sessions SET expires=? WHERE token=?').run(now()+MAX_AGE*1000,hash);setCookie(res,cookieName,token,MAX_AGE);if(secure&&jar.session)setCookie(res,'session','',0);}
  return {...row,sessionHash:hash};
 }
 async function logout(req,res){for(const name of new Set([cookieName,'session'])){const token=cookies(req)[name];if(token)await db.prepare('DELETE FROM sessions WHERE token=?').run(digest(token));setCookie(res,name,'',0);}setCookie(res,'oauth_state','',0);setCookie(res,'magic_intent','',0);}
 async function sendLink(email,token){const link=base()+'/auth/confirm#token='+token;const message={from:env.EMAIL_FROM,to:email,subject:'Confirm your sign-in to Bebin Dev Studio',text:`Confirm Sign-In: ${link}\n\nThis link expires in 15 minutes and can be used once. If you did not request it, ignore this message.`,html:`<div style="font-family:system-ui;max-width:480px;margin:auto;padding:32px;color:#242824"><h1 style="font-family:Georgia;font-weight:400">Your studio is ready.</h1><p>Confirm your sign-in to Bebin Dev Studio.</p><p><a href="${escape(link)}" style="display:inline-block;background:#252824;color:white;padding:15px 24px;border-radius:28px;text-decoration:none">Confirm Sign-In</a></p><p style="font-size:13px;color:#6f756c">This link expires in 15 minutes and can be used once. If you did not request this email, you can safely ignore it.</p></div>`};
  if(mailer)return mailer(message);
  if(env.RESEND_API_KEY){const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({...message,to:[email]}),signal:AbortSignal.timeout(15000)});if(!response.ok)throw failure('The sign-in email could not be sent. Please try again later.',503);return;}
  const port=Number(env.SMTP_PORT||465);if(![465,587].includes(port))throw failure('Configure a TLS email transport.',503);const transport=nodemailer.createTransport({host:env.SMTP_HOST,port,secure:port===465,requireTLS:true,auth:{user:env.SMTP_USER,pass:env.SMTP_PASSWORD},connectionTimeout:15000,socketTimeout:20000,tls:{minVersion:'TLSv1.2'}});try{await transport.sendMail(message);}catch{throw failure('The sign-in email could not be sent. Please try again later.',503);}finally{transport.close();}
 }
 async function requestEmail(req,res,email,extra={}){email=String(email||'').trim().toLowerCase();if(!emailValid(email))throw failure('Enter a valid email address.');if(!emailReady())throw failure('Email sign-in is not configured yet.',503);base();await rate(req,'email-ip',5,600000);await consumeUsage(db,'email-address:'+digest(email),3,600000,now());await consumeUsage(db,'email-global',200,86400000,now());
  const intent=random(),token=await challenge('email',{email,intent:digest(intent),...extra});try{await sendLink(email,token);}catch(error){await db.prepare('DELETE FROM auth_challenges WHERE hash=?').run(digest(token));throw error;}setCookie(res,'magic_intent',intent,900);return {ok:true,message:'Check your inbox for your sign-in confirmation link.'};
 }
 async function emailInfo(req,token){const data=await peek(token,'email');const [local,domain]=data.email.split('@');return {email:local.slice(0,2)+'…@'+domain,automatic:digest(cookies(req).magic_intent||'')===data.intent};}
 async function confirmEmail(req,res,token,confirmed){const data=await peek(token,'email');if(digest(cookies(req).magic_intent||'')!==data.intent&&confirmed!==true)throw failure('Please confirm sign-in on this device.',409);const verified=await consume(token,'email');const user=await account(verified.email,verified.name,verified.subject);await issue(req,res,user);setCookie(res,'magic_intent','',0);return user;}
 async function googleStart(req,res){if(!googleReady())throw failure('Google sign-in is not configured yet.',503);await rate(req);const nonce=random(),verifier=random();const state=await challenge('google',{nonce,verifier},600000);setCookie(res,'oauth_state',state,600);const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');url.search=new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,redirect_uri:base()+'/api/auth/google/callback',response_type:'code',scope:'openid email profile',state,nonce,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',prompt:'select_account'});return url.href;}
 async function googleCallback(req,res,url){const state=url.searchParams.get('state');if(!state||state!==cookies(req).oauth_state)throw failure('Google sign-in expired. Please start again.');await peek(state,'google');const context=await consume(state,'google');setCookie(res,'oauth_state','',0);if(url.searchParams.has('error'))throw failure('Google sign-in was cancelled.');const code=url.searchParams.get('code');if(!code||code.length>4096)throw failure('Google did not return a valid sign-in code.');
  const response=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,code,code_verifier:context.verifier,grant_type:'authorization_code',redirect_uri:base()+'/api/auth/google/callback'}),signal:AbortSignal.timeout(15000)});if(!response.ok)throw failure('Google could not complete sign-in. Please try again.',502);const tokens=await response.json();let identity;try{identity=await verifyIdentity(tokens.id_token,{clientId:env.GOOGLE_CLIENT_ID,nonce:context.nonce});}catch{throw failure('Google could not verify this sign-in.');}
  const linked=await db.prepare('SELECT users.* FROM users JOIN auth_identities ON users.id=auth_identities.user_id WHERE provider=? AND subject=?').get('google',identity.sub);
  // Google is authoritative for Gmail and managed Workspace addresses. Other domains
  // require current mailbox proof before creating/linking an account.
  if(!linked&&!identity.email.toLowerCase().endsWith('@gmail.com')&&!identity.hd){await requestEmail(req,res,identity.email,{subject:identity.sub,name:identity.name});return {emailConfirmation:true};}
  const user=linked||await account(identity.email,identity.name,identity.sub);await issue(req,res,user);return {user};
 }
 return {config,authenticated,logout,issue,requestEmail,emailInfo,confirmEmail,googleStart,googleCallback};
}
