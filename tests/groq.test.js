import {test} from 'node:test';
import assert from 'node:assert/strict';
import {groqComplete} from '../lib/groq.js';
test('Groq completion uses backend authorization and parses chat output',async()=>{
 let request;const output=await groqComplete('A portfolio website',{key:'test-key-not-real',fetcher:async(url,options)=>{request={url,options};return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:'```html\n<!doctype html><html><body>Ready</body></html>\n```'}}]})};}});
 assert.equal(request.url,'https://api.groq.com/openai/v1/chat/completions');assert.equal(request.options.headers.Authorization,'Bearer test-key-not-real');assert.equal(JSON.parse(request.options.body).messages[1].content,'A portfolio website');assert.match(output,/^<!doctype html>/);
});
test('Groq reports missing key, quota, provider failure and truncated output',async()=>{
 await assert.rejects(groqComplete('anything',{key:''}),/GROQ_API_KEY/);
 for(const [status,message]of [[401,/rejected/],[429,/rate limit/],[500,/could not complete/]])await assert.rejects(groqComplete('anything',{key:'fake',fetcher:async()=>({ok:false,status})}),message);
 await assert.rejects(groqComplete('anything',{key:'fake',fetcher:async()=>({ok:true,json:async()=>({choices:[{finish_reason:'length',message:{content:'<html>'}}]})})}),/truncated/);
 await assert.rejects(groqComplete('anything',{key:'fake',fetcher:async()=>({ok:true,json:async()=>({choices:[{message:{content:'not html'}}]})})}),/incomplete/);
});
test('prompt enhancement uses the same backend integration',async()=>{const text=await groqComplete('Improve my brief',{key:'fake',enhance:true,fetcher:async()=>({ok:true,json:async()=>({choices:[{message:{content:'A polished accessible portfolio with responsive navigation.'}}]})})});assert.match(text,/accessible/);});
