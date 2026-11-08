const fieldTypes=new Set(['text','email','number','date','boolean','select']);
const identifier=/^[a-z][a-z0-9_]{0,39}$/;
const invalid=message=>{throw Object.assign(Error(message),{status:400});};
const text=(value,max=100)=>String(value??'').trim().slice(0,max);
const field=(name,label,type='text',required=true,options)=>({name,label,type,required,...(options?{options}:{} )});
const collection=(name,label,fields)=>({name,label,fields});

/** Only declarative data is accepted from AI. Generated code is never executed on Studio. */
export function validateAppSpec(input){
 if(!input||typeof input!=='object'||Array.isArray(input))invalid('Invalid application specification');
 if(input.type!==undefined&&!['landing page','web app','storefront'].includes(input.type))invalid('Unsupported application type');
 if(input.currency!==undefined&&!['USD','EUR','GBP','INR','CAD','AUD','JPY'].includes(input.currency))invalid('Unsupported currency');
 if(input.integrations!==undefined&&(!Array.isArray(input.integrations)||input.integrations.some(x=>!['email','ai'].includes(x))))invalid('Unsupported integration');
 if(input.framework!==undefined&&!['html','react'].includes(input.framework))invalid('Unsupported frontend framework');
 const allowed=new Set(['framework','version','name','description','type','accent','currency','collections','integrations','design']);
 if(Object.keys(input).some(k=>!allowed.has(k)))invalid('Application specification contains an unsupported property');
 if(!Array.isArray(input.collections)||!input.collections.length||input.collections.length>8)invalid('Use 1–8 data modules');
 const names=new Set();
 const collections=input.collections.map(c=>{
  if(!c||typeof c!=='object'||Object.keys(c).some(k=>!['name','label','fields'].includes(k)))invalid('Invalid module specification');
  if(!identifier.test(c.name)||names.has(c.name)||['orders','submissions','ai_history','users','sessions'].includes(c.name))invalid('Invalid or duplicate module name');
  names.add(c.name);
  if(!Array.isArray(c.fields)||!c.fields.length||c.fields.length>12)invalid('Use 1–12 fields per module');
  const keys=new Set();
  return {name:c.name,label:text(c.label)||c.name,fields:c.fields.map(f=>{
   if(!f||typeof f!=='object'||Object.keys(f).some(k=>!['name','label','type','required','options'].includes(k)))invalid('Invalid field specification');
   if(!identifier.test(f.name)||keys.has(f.name)||['id','owner','created','updated','__proto__','constructor','prototype'].includes(f.name))invalid('Invalid or duplicate field');
   keys.add(f.name);if(!fieldTypes.has(f.type))invalid('Unsupported field type');
   const options=f.type==='select'?[...new Set((Array.isArray(f.options)?f.options:[]).map(x=>text(x,80)).filter(Boolean))].slice(0,20):undefined;
   if(f.type==='select'&&!options.length)invalid('Select fields need options');
   return {name:f.name,label:text(f.label)||f.name,type:f.type,required:f.required!==false,...(options?{options}:{})};
  })};
 });
 const type=['landing page','web app','storefront'].includes(input.type)?input.type:'web app';
 if(type==='storefront'&&!collections.some(c=>c.name==='products'&&c.fields.some(f=>f.name==='name'&&f.type==='text'&&f.required)&&c.fields.some(f=>f.name==='price'&&f.type==='number'&&f.required)))invalid('Storefronts require product name and numeric price fields');
 const design=validateDesign(input.design,input.description,collections,type);
 return {design,version:1,framework:input.framework||'html',name:text(input.name,80)||'My application',description:text(input.description,1000),type,accent:/^#[0-9a-f]{6}$/i.test(input.accent||'')?input.accent:'#245c46',currency:['USD','EUR','GBP','INR','CAD','AUD','JPY'].includes(input.currency)?input.currency:'USD',collections,integrations:[...new Set((Array.isArray(input.integrations)?input.integrations:[]).filter(x=>['email','ai'].includes(x)))]};
}

/** Reject known unsupported requests rather than outputting an app that falsely advertises them. */
export function assertSupportedBrief(prompt){
 const unsupported=[
  ['native/framework-specific source (this builder exports HTML or React web apps with Node)',/\b(flutter|react native|native android|native ios|swiftui|kotlin)\b/i],
  ['online payment processing',/\b(stripe|paypal|payment processing|paid checkout|take payments|process payments|accept payments|online payments)\b/i],
  ['third-party OAuth',/\b(oauth|google sign.?in|sign.?in with google|social login)\b/i],
  ['file uploads',/\b(file uploads?|upload files?|photo upload|image upload)\b/i],
  ['realtime communication',/\b(real.?time chat|websockets?|push notifications)\b/i],
  ['password recovery',/\b(password reset|password recovery|forgot password)\b/i],
  ['automated booking availability',/\b(avoid double bookings?|availability calendar|automatic booking confirmation)\b/i],
  ['additional external APIs',/\b(weather api|google maps|twilio|sms integration)\b/i]
 ].filter(([,pattern])=>pattern.test(prompt)).map(([name])=>name);
 if(unsupported.length)throw Object.assign(Error('This request requires '+unsupported.join(', ')+', which this compiler does not yet implement. Supported workflows include secure accounts, database record management, saved inquiries, unpaid orders, and configured email/AI. No incomplete application has been generated.'),{status:422});
}

export function defaultAppSpec(prompt,type,name,accent){
 let collections;
 if(type==='storefront')collections=[collection('products','Products',[field('name','Product name'),field('description','Description','text',false),field('price','Price','number'),field('category','Category','text',false)])];
 else if(/portfolio|gallery|creative studio/i.test(prompt))collections=[collection('projects','Portfolio projects',[field('title','Project title'),field('description','Project story','text',false),field('discipline','Discipline'),field('year','Year','number')])];
 else if(/recipe|food journal/i.test(prompt))collections=[collection('recipes','Recipes',[field('title','Recipe'),field('ingredients','Ingredients'),field('instructions','Instructions'),field('minutes','Preparation minutes','number'),field('category','Category')])];
 else if(/real estate|propert|rental listing/i.test(prompt))collections=[collection('properties','Properties',[field('title','Property'),field('location','Location'),field('price','Asking price','number'),field('bedrooms','Bedrooms','number'),field('status','Status','select',true,['Available','Under offer','Sold'])])];
 else if(/notes|journal|knowledge base|blog|publishing/i.test(prompt))collections=[collection('articles','Articles',[field('title','Title'),field('content','Content'),field('category','Category','text',false),field('status','Status','select',true,['Draft','Published'])])];
 else if(/erp|inventory|stock/i.test(prompt))collections=[collection('inventory','Inventory',[field('name','Item'),field('sku','SKU'),field('quantity','Quantity','number'),field('reorder_level','Reorder level','number')]),collection('sales','Sales',[field('customer','Customer'),field('amount','Amount','number'),field('date','Date','date')])];
 else if(/crm|customer|lead/i.test(prompt))collections=[collection('contacts','Contacts',[field('name','Name'),field('email','Email','email'),field('company','Company','text',false),field('stage','Stage','select',true,['New','Qualified','Customer'])])];
 else if(/school|college|education|course/i.test(prompt))collections=[collection('courses','Courses',[field('name','Course'),field('instructor','Instructor'),field('capacity','Capacity','number')]),collection('students','Students',[field('name','Name'),field('email','Email','email'),field('course','Course')])];
 else if(/booking|travel|restaurant|appointment|health/i.test(prompt))collections=[collection('bookings','Booking requests',[field('name','Name'),field('email','Email','email'),field('date','Date','date'),field('service','Service'),field('status','Status','select',true,['Requested','Confirmed','Cancelled'])])];
 else if(/finance|budget|expense/i.test(prompt))collections=[collection('expenses','Expenses',[field('description','Description'),field('amount','Amount','number'),field('date','Date','date'),field('category','Category')])];
 else if(type==='landing page')collections=[collection('leads','Leads',[field('name','Name'),field('email','Email','email'),field('notes','Notes','text',false)])];
 else collections=[collection('tasks','Tasks',[field('title','Task'),field('status','Status','select',true,['To do','In progress','Done']),field('due_date','Due date','date',false)])];
 return validateAppSpec({name:name||prompt.replace(/^(build|create|make|design)\s+(a|an)?\s*/i,'').slice(0,80),description:prompt,type,accent,collections,integrations:[...(/email|notification/i.test(prompt)?['email']:[]),...(/\bai\b|assistant|chatbot/i.test(prompt)?['ai']:[])]});
}

export const appSpecInstruction=`Return only a JSON application specification, not code or markdown. Supported schema: {name,description,type:"web app"|"landing page"|"storefront",accent:"#rrggbb",currency:"USD"|"EUR"|"GBP"|"INR"|"CAD"|"AUD"|"JPY",collections:[{name:"lower_snake_case",label,fields:[{name:"lower_snake_case",label,type:"text"|"email"|"number"|"date"|"boolean"|"select",required:true,options:["select options"]}]}],integrations:["email","ai"]}. Use 1–8 meaningful industry-specific CRUD modules, 1–12 fields each. Storefront must include products with name:text and price:number. Reserved collection names orders,submissions,ai_history,users,sessions are forbidden. Authentication, access-controlled persistence, contact submissions, and order handling are compiled by our tested runtime. Payments, OAuth, file uploads, password recovery, scheduling conflict checks and arbitrary custom logic are not supported in this compiler: do not imply they are included. Also return design:{layout:"sidebar"|"editorial"|"studio",palette:"forest"|"ocean"|"midnight"|"warm"|"violet",views:{module_name:"table"|"board"|"calendar"|"cards"|"ledger"}}. Choose genuinely appropriate layouts and views for the user brief. Boards need a status/stage select; calendars need a date; ledgers need a numeric amount. Honor explicit design preferences. No secrets, URLs, business claims, HTML or executable code.`;


/** Bounded presentation language: no remote assets, executable code or invented data. */
export function validateDesign(input,brief='',collections=[],type='web app') {
 const source=input&&typeof input==='object'?input:{};
 const words=String(brief).toLowerCase();
 const choose=(value,allowed,fallback)=>allowed.includes(value)?value:fallback;
 const layout=choose(source.layout,['sidebar','editorial','studio'],/portfolio|blog|magazine|publishing|editorial/.test(words)?'editorial':/creative|design|music|entertainment/.test(words)?'studio':type==='web app'?'sidebar':'editorial');
 const palette=choose(source.palette,['forest','ocean','midnight','warm','violet'],/dark|futur|cyber|gaming/.test(words)?'midnight':/health|wellness|nature/.test(words)?'forest':/finance|corporate|business/.test(words)?'ocean':/warm|restaurant|food|luxury|editorial/.test(words)?'warm':'violet');
 const views={};
 for(const module of collections){
  if(!module||!Array.isArray(module.fields))continue;
  const status=module.fields.find(f=>f?.type==='select'&&/status|stage|progress/.test(f.name));
  const date=module.fields.find(f=>f?.type==='date');
  const amount=module.fields.find(f=>f?.type==='number'&&/amount|cost|price|budget|balance/.test(f.name));
  let view=choose(source.views?.[module.name],['table','board','calendar','cards','ledger'],/task|project|pipeline|crm/.test(words)&&status?'board':/booking|appointment|event|travel|schedule/.test(words)&&date?'calendar':/finance|expense|budget/.test(words)&&amount?'ledger':/course|education|portfolio|recipe|property|real estate|catalog/.test(words)?'cards':'table');
  if(view==='board'&&!status||view==='calendar'&&!date||view==='ledger'&&!amount)view='cards';
  views[module.name]=view;
 }
 return {layout,palette,views};
}
