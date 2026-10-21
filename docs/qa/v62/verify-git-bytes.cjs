'use strict';
const fs=require('node:fs');
const crypto=require('node:crypto');
const cp=require('node:child_process');
const comparison=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'comparison.json'),'utf8'));
const ref=process.argv[2]||'';
const specs=comparison.files.map(f=>ref+':'+f.path);
const data=cp.execFileSync('git',['cat-file','--batch'],{input:specs.join('\n')+'\n',maxBuffer:128*1024*1024});
let offset=0;
const failures=[];
for(const f of comparison.files){
  const end=data.indexOf(10,offset);
  const header=data.subarray(offset,end).toString('utf8');
  const match=header.match(/^([a-f0-9]+) blob (\d+)$/);
  if(!match)throw new Error('Invalid git object '+f.path+': '+header);
  const length=Number(match[2]),blob=data.subarray(end+1,end+1+length);
  offset=end+1+length+1;
  const actual=crypto.createHash('sha256').update(blob).digest('hex');
  if(actual!==f.approved)failures.push({path:f.path,expected:f.approved,actual});
}
const manifest=JSON.parse(fs.readFileSync('docs/V62_SOURCE_SHA256.json','utf8'));
const old=cp.execFileSync('git',['cat-file','--batch'],{input:comparison.files.filter(f=>f.before).map(f=>comparison.base+':'+f.path).join('\n')+'\n',maxBuffer:128*1024*1024});
offset=0;
const previousStorageDifferences=[];
for(const f of comparison.files.filter(f=>f.before)){
  const end=old.indexOf(10,offset),header=old.subarray(offset,end).toString();
  const size=Number(header.split(' ').at(-1)),blob=old.subarray(end+1,end+1+size);offset=end+1+size+1;
  const checkout=fs.readFileSync('output/v62-source/'+f.path);
  if(f.status==='identical' && !blob.equals(checkout))previousStorageDifferences.push(f.path);
}
const result={ref:ref||'INDEX',checked:comparison.files.length,matched:comparison.files.length-failures.length,manifestFiles:Object.keys(manifest.source_files_sha256).length,motionFiles:Object.keys(manifest.motion_lock).length,failures,previousStorageDifferences,note:'Previously identical checkout files may differ from old Git blobs due to historical CRLF normalization. Imported Git blobs preserve exact ZIP bytes.'};
fs.writeFileSync('output/v62-migration/git-bytes'+(ref?'-'+ref.replace(/[^a-z0-9]/gi,'_'):'')+'.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
if(failures.length)process.exitCode=1;
