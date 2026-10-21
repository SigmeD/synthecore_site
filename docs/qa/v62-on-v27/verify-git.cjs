'use strict';
const fs=require('node:fs'),cp=require('node:child_process'),crypto=require('node:crypto');
const manifest=JSON.parse(fs.readFileSync('docs/V62_ON_V27_SOURCES.json','utf8'));
const ref=process.argv[2]||'';
const paths=[...new Set([...Object.keys(manifest.motion),...Object.keys(manifest.v27),'index.html'])];
const bytes=cp.execFileSync('git',['cat-file','--batch'],{input:paths.map(f=>ref+':'+f).join('\n')+'\n',maxBuffer:64*1024*1024});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
let cursor=0;const blobs={},failures=[];
for(const file of paths){const end=bytes.indexOf(10,cursor),header=bytes.subarray(cursor,end).toString(),size=Number(header.split(' ').at(-1));if(!/ blob \d+$/.test(header))throw Error(header);blobs[file]=bytes.subarray(end+1,end+1+size);cursor=end+1+size+1;}
for(const [f,h] of Object.entries(manifest.motion))if(hash(blobs[f])!==h)failures.push('motion: '+f);
for(const [f,h] of Object.entries(manifest.v27))if(hash(f.endsWith('.ttf')?blobs[f]:Buffer.from(blobs[f].toString('utf8').replace(/\r\n/g,'\n')))!==h)failures.push('v27: '+f);
const html=blobs['index.html'].toString('utf8').replace(/\r\n/g,'\n');
const content=html.slice(html.indexOf('<main>')+6,html.lastIndexOf('<section aria-labelledby="contact-title"'));
if(hash(Buffer.from(content))!==manifest.v62ContentSha256)failures.push('v62 sections');
const result={ref:ref||'INDEX',motionFiles:17,v27Files:25,v62ContentMatches:!failures.includes('v62 sections'),failures,pass:failures.length===0};
console.log(JSON.stringify(result,null,2));
if(failures.length)process.exitCode=1;
