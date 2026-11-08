import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialFieldValue, recordValues, accentForeground} from '../lib/react-client/record-values.js';
import {validateRecord} from '../lib/generated-api.js';

const fields = [
  {name:'stage',label:'Stage',type:'select',required:false,options:['New','Qualified']},
  {name:'approved',label:'Approved',type:'boolean',required:false},
  {name:'quantity',label:'Quantity',type:'number',required:false}
];

test('optional form values remain unset through frontend conversion and backend validation', () => {
  for (const field of fields) {
    assert.equal(initialFieldValue(field, null), '');
    assert.equal(initialFieldValue(field, undefined), '');
  }
  const blank = recordValues(fields, {stage:'',approved:'',quantity:''});
  assert.deepEqual(blank, {stage:null,approved:null,quantity:null});
  assert.deepEqual(validateRecord({fields},blank), blank);
  assert.deepEqual(recordValues(fields,{}),blank);
});

test('explicit false and zero are preserved, while required choices retain defaults', () => {
  assert.equal(initialFieldValue(fields[1],false),'false');
  assert.equal(initialFieldValue(fields[2],0),'0');
  const values = recordValues(fields,{stage:'Qualified',approved:'false',quantity:'0'});
  assert.deepEqual(values,{stage:'Qualified',approved:false,quantity:0});
  assert.deepEqual(validateRecord({fields},values),values);
  assert.equal(initialFieldValue({...fields[0],required:true},null),'New');
  assert.equal(initialFieldValue({...fields[1],required:true},null),'false');
});


test('AI and custom accent backgrounds always receive at least AA normal-text contrast',()=>{
 const luminance=hex=>{const channels=hex.slice(1).match(/../g).map(value=>parseInt(value,16)/255).map(value=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4);return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;};
 for(let r=0;r<=255;r+=17)for(let g=0;g<=255;g+=17)for(let b=0;b<=255;b+=17){const accent='#'+[r,g,b].map(value=>value.toString(16).padStart(2,'0')).join(''),foreground=accentForeground(accent),levels=[luminance(accent),luminance(foreground)].sort((a,b)=>a-b);assert.ok((levels[1]+0.05)/(levels[0]+0.05)>=4.5,accent);}
 assert.equal(accentForeground('#FFB347'),'#000000');assert.equal(accentForeground('#245c46'),'#ffffff');
});
