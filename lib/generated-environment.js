import {existsSync,readFileSync} from 'node:fs';
export function loadEnvironment(file){
 if(!existsSync(file))return;
 for(const line of readFileSync(file,'utf8').split(/\r?\n/)){
  const match=line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
  if(!match||process.env[match[1]]!==undefined)continue;
  process.env[match[1]]=match[2].replace(/^(['"])(.*)\1$/,'$2');
 }
}
