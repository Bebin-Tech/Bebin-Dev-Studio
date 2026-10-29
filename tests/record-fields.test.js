import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialFieldValue, recordValues} from '../lib/react-client/record-values.js';
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
