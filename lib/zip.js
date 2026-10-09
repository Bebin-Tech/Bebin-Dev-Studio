// Portable, uncompressed ZIP archives. File names come only from trusted project manifests.
const table=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc(buffer){let n=0xffffffff;for(const b of buffer)n=table[(n^b)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
export function zip(files){let offset=0;const local=[],central=[];for(const [name,text]of Object.entries(files)){
  if(name.includes('..')||name.startsWith('/')||name.includes('\\'))throw Error('Unsafe archive path');
  const filename=Buffer.from(name),data=Buffer.from(text),sum=crc(data),head=Buffer.alloc(30);
  head.writeUInt32LE(0x04034b50);head.writeUInt16LE(20,4);head.writeUInt16LE(0x800,6);head.writeUInt32LE(sum,14);head.writeUInt32LE(data.length,18);head.writeUInt32LE(data.length,22);head.writeUInt16LE(filename.length,26);
  local.push(head,filename,data);const entry=Buffer.alloc(46);entry.writeUInt32LE(0x02014b50);entry.writeUInt16LE(20,4);entry.writeUInt16LE(20,6);entry.writeUInt16LE(0x800,8);entry.writeUInt32LE(sum,16);entry.writeUInt32LE(data.length,20);entry.writeUInt32LE(data.length,24);entry.writeUInt16LE(filename.length,28);entry.writeUInt32LE(offset,42);central.push(entry,filename);offset+=head.length+filename.length+data.length;
 }const entries=Object.keys(files).length,size=central.reduce((n,b)=>n+b.length,0),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries,8);end.writeUInt16LE(entries,10);end.writeUInt32LE(size,12);end.writeUInt32LE(offset,16);return Buffer.concat([...local,...central,end]);}
