const fs=require('node:fs/promises');
const {chromium}=require(require.resolve('playwright-core',{paths:[process.cwd(),process.env.USERPROFILE]}));
(async()=>{const b=await chromium.connectOverCDP('http://127.0.0.1:9222'),c=await b.newContext({viewport:{width:1920,height:1080}}),report=[];try{
  for(const mode of ['current','proposal-full-viewport']){
    const p=await c.newPage();await p.goto('http://127.0.0.1:4173/README.md');
    await p.setContent('<body style="margin:0"><video muted style="width:1920px;height:1080px"></video></body>');
    const video=p.locator('video');
    // The small local server does not implement HTTP byte ranges. Load the whole
    // recording into a blob so seeking verifies the chosen decoded frame.
    await video.evaluate(async(v,mode)=>{const response=await fetch(`http://127.0.0.1:4173/output/playwright/hero-handoff/${mode}/down-up.webm`);
      v.src=URL.createObjectURL(await response.blob());},mode);
    await video.evaluate(v=>new Promise((resolve,reject)=>{v.addEventListener('loadedmetadata',resolve,{once:true});v.addEventListener('error',()=>reject(Error('Video decode failed')),{once:true});if(v.readyState>=1)resolve();}));
    const meta=await video.evaluate(v=>({duration:v.duration,width:v.videoWidth,height:v.videoHeight}));
    if(!(meta.duration>10&&meta.width===1920&&meta.height===1080))throw Error('Recording must preserve the full viewport');
    for(const time of [0,3,5,9]){
      await video.evaluate((v,time)=>new Promise(resolve=>{v.addEventListener('seeked',resolve,{once:true});v.currentTime=time+.01;}),time);
      await p.waitForTimeout(250); // Allow the decoder's newly presented frame to reach the compositor.
      await p.screenshot({path:`output/playwright/hero-handoff/${mode}/playback-${time}.png`});
    }
    report.push({mode,...meta});await p.close();
  }
  await fs.writeFile('output/playwright/hero-handoff/video-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await c.close();await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
