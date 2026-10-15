const fs=require('node:fs/promises');
const{chromium}=require(require.resolve('playwright-core',{paths:[process.cwd(),process.env.USERPROFILE]}));
(async()=>{const b=await chromium.connectOverCDP('http://127.0.0.1:9222'),c=await b.newContext({viewport:{width:1888,height:736}}),report=[];try{
  for(const[mode,times]of[['reference',[2.55,3.35]],['local',[1.5,2.1]]]){
    const p=await c.newPage();await p.goto('http://127.0.0.1:4173/README.md');await p.setContent('<video muted></video>');
    const v=p.locator('video');await v.evaluate(async(v,mode)=>{const r=await fetch(`/output/playwright/hero-gate/input-${mode}.mp4`);v.src=URL.createObjectURL(new Blob([await r.arrayBuffer()],{type:'video/mp4'}));},mode);
    await v.evaluate(v=>new Promise((resolve,reject)=>{if(v.readyState>=1)return resolve();v.addEventListener('loadedmetadata',resolve,{once:true});v.addEventListener('error',()=>reject(Error('MP4 decoder: '+v.error?.message)),{once:true});}));
    const entry=await v.evaluate(v=>({duration:v.duration,width:v.videoWidth,height:v.videoHeight}));
    for(const time of times){await v.evaluate((v,time)=>new Promise(resolve=>{v.addEventListener('seeked',resolve,{once:true});v.currentTime=time;}),time);await p.waitForTimeout(250);
      const png=await v.evaluate(v=>{const canvas=document.createElement('canvas');canvas.width=v.videoWidth;canvas.height=v.videoHeight;canvas.getContext('2d').drawImage(v,0,0);return canvas.toDataURL('image/png').split(',')[1];});
      await fs.writeFile(`output/playwright/hero-gate/input-${mode}-${time}.png`,Buffer.from(png,'base64'));
    }report.push({mode,...entry,times});await p.close();
  }await fs.writeFile('output/playwright/hero-gate/input-videos.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await c.close();await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
