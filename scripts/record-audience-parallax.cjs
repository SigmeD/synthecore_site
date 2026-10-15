const fs=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require(require.resolve('playwright-core',{paths:[process.cwd(),process.env.USERPROFILE]}));
const out=path.resolve(__dirname,'../output/playwright/audience-parallax');
(async()=>{await fs.mkdir(path.join(out,'frames'),{recursive:true});const b=await chromium.connectOverCDP('http://127.0.0.1:9222'),c=await b.newContext({viewport:{width:1920,height:1080}});
try{const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:4173/');await p.waitForFunction(()=>window.__synthecoreScrollQA.getState().ready);await p.mouse.move(2,2);
  let capturing=true;const frames=[];
  // Full viewport screenshots preserve the emulated1080px height. CDP
  // screencast on this workstation captures only its shorter physical surface.
  const capture=(async()=>{while(capturing){const timestamp=Date.now(),name=`${String(frames.length).padStart(5,'0')}.jpg`,data=await p.screenshot({type:'jpeg',quality:82});
    await fs.writeFile(path.join(out,'frames',name),data);frames.push({name,timestamp});}})();
  await p.waitForTimeout(400);const end=await p.evaluate(()=>window.__synthecoreScrollQA.getState().pinEnd);
  await p.mouse.wheel(0,end*3);await p.waitForFunction(()=>window.__synthecoreScrollQA.getState().gateState==='READY');await p.waitForTimeout(1000);
  // Separate gesture after an explicit stable READY frame.
  await p.mouse.wheel(0,240);await p.waitForTimeout(1100);
  for(let i=0;i<8;i++){await p.mouse.wheel(0,100);await p.waitForTimeout(120);}await p.waitForTimeout(1300);
  for(let i=0;i<10;i++){await p.mouse.wheel(0,-104);await p.waitForTimeout(110);}await p.waitForTimeout(1400);
  await p.mouse.wheel(0,-end);await p.waitForTimeout(1800);capturing=false;await capture;
  if(errors.length)throw Error(errors.join('; '));
  // Encode a12fps sequence using actual captured frames and elapsed timestamps.
  // Repeated frames preserve pauses; no interpolated or fabricated browser image.
  const fps=12,start=frames[0].timestamp,duration=(frames.at(-1).timestamp-start)/1000;
  const bytes=await Promise.all(frames.map(f=>fs.readFile(path.join(out,'frames',f.name))));
  const sequence=[];let index=0;for(let i=0;i<=Math.ceil(duration*fps);i++){const t=start+i*1000/fps;while(index+1<frames.length&&frames[index+1].timestamp<=t)index++;sequence.push(bytes[index]);}
  await fs.writeFile(path.join(out,'recording.mjpeg'),Buffer.concat(sequence));
  await fs.writeFile(path.join(out,'recording.json'),JSON.stringify({source:'Actual Chromium full viewport screenshots',viewport:[1920,1080],duration,fps,frameCount:frames.length,frames},null,2));
  console.log(JSON.stringify({duration,fps,frameCount:frames.length,output:'recording.mjpeg'}));
}finally{await c.close();await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
