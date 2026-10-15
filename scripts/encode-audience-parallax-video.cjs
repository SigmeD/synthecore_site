const fs=require('node:fs/promises');
const {chromium}=require(require.resolve('playwright-core',{paths:[process.cwd(),process.env.USERPROFILE]}));
const base='output/playwright/audience-parallax';
(async()=>{const meta=JSON.parse(await fs.readFile(`${base}/recording.json`)),b=await chromium.connectOverCDP('http://127.0.0.1:9222'),c=await b.newContext({viewport:{width:1920,height:1080}});
try{const p=await c.newPage();await p.goto('http://127.0.0.1:4173/README.md');
  const encoded=await p.evaluate(async meta=>{
    const load=async f=>{const r=await fetch(`/output/playwright/audience-parallax/frames/${f.name}`);if(!r.ok)throw Error(`${f.name}:HTTP${r.status}`);return createImageBitmap(await r.blob());};
    const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;const ctx=canvas.getContext('2d');
    const first=await load(meta.frames[0]);ctx.drawImage(first,0,0);first.close();
    const stream=canvas.captureStream(12),chunks=[];
    const type=MediaRecorder.isTypeSupported('video/webm;codecs=vp8')?'video/webm;codecs=vp8':'video/webm;codecs=vp9';
    const recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:3500000});
    const done=new Promise(resolve=>{recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=resolve;});
    recorder.start();const started=performance.now(),origin=meta.frames[0].timestamp;
    for(let i=0;i<meta.frames.length;i++){const bitmap=await load(meta.frames[i]);const delay=meta.frames[i].timestamp-origin-(performance.now()-started);if(delay>0)await new Promise(r=>setTimeout(r,delay));ctx.drawImage(bitmap,0,0);bitmap.close();}
    await new Promise(r=>setTimeout(r,150));recorder.stop();await done;stream.getTracks().forEach(t=>t.stop());
    const blob=new Blob(chunks,{type:'video/webm'});return new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(blob);});
  },meta);await fs.writeFile(`${base}/transition.webm`,Buffer.from(encoded,'base64'));
  await p.setContent('<video muted style="width:1920px;height:1080px"></video>');const v=p.locator('video');
  await v.evaluate(async v=>{const r=await fetch('/output/playwright/audience-parallax/transition.webm');v.src=URL.createObjectURL(await r.blob());});
  await v.evaluate(v=>new Promise((resolve,reject)=>{v.onloadedmetadata=resolve;v.onerror=()=>reject(Error(v.error.message));if(v.readyState>=1)resolve();}));
  // MediaRecorder WebM may omit duration; seeking to the end resolves it.
  await v.evaluate(v=>new Promise(resolve=>{v.onseeked=resolve;v.currentTime=1e6;}));
  const info=await v.evaluate(v=>({duration:v.duration,width:v.videoWidth,height:v.videoHeight}));
  if(info.width!==1920||info.height!==1080||info.duration<10)throw Error('Video must preserve viewport and complete transition');
  for(const time of[0,3.5,5,7,10]){
    await v.evaluate((v,t)=>new Promise(resolve=>{v.onseeked=resolve;v.currentTime=t+.01;}),time);await p.waitForTimeout(200);
    const png=await v.evaluate(v=>{const canvas=document.createElement('canvas');canvas.width=v.videoWidth;canvas.height=v.videoHeight;canvas.getContext('2d').drawImage(v,0,0);return canvas.toDataURL().split(',')[1];});
    await fs.writeFile(`${base}/playback-${time}.png`,Buffer.from(png,'base64'));
  }
  await fs.writeFile(`${base}/video-verification.json`,JSON.stringify(info,null,2));console.log(info);
}finally{await c.close();await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
