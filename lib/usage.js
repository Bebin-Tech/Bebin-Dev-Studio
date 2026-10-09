export async function consumeUsage(db,bucket,limit,windowMs,now=Date.now()){
 const key=bucket+':'+Math.floor(now/windowMs);
 const row=await db.prepare('INSERT INTO usage_limits(bucket,count) VALUES(?,1) ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count').get(key);
 if(row.count>limit)throw Object.assign(Error('Usage limit reached. Please try again later.'),{status:429});
 return row.count;
}
