import {createHash} from 'node:crypto';
import {artwork} from './designs.js';
export const digest=value=>createHash('sha256').update(value).digest('hex');
export function validateCatalog(catalog){
 const seen={id:new Map(),layout:new Map(),asset:new Map(),design:new Map()};
 for(const t of catalog){
  if(!t.body||!t.css||!t.features.length||!t.asset)throw Error('Incomplete template: '+t.id);
  // Text, palettes and IDs do not make a new layout. A cloned DOM composition is rejected.
  const layout=t.body.replace(/>[^<]*</g,'><').replace(/\s+[\w-]+=("[^"]*"|'[^']*')/g,'').replace(/\s+/g,'');
  const keys={id:t.id,layout:digest(layout),asset:digest(artwork(t).replace(/#[a-f0-9]{3,8}/gi,'#COLOR')),design:digest(t.body+t.css)};
  for(const [kind,key] of Object.entries(keys)){if(seen[kind].has(key))throw Error('Duplicate '+kind+': '+t.id+' / '+seen[kind].get(key));seen[kind].set(key,t.id);}
 }
 return catalog.map(t=>({id:t.id,layout:digest(t.body.replace(/>[^<]*</g,'><').replace(/\s+[\w-]+=("[^"]*"|'[^']*')/g,'').replace(/\s+/g,'')),design:digest(t.body+t.css),asset:digest(artwork(t))}));
}
