// CTA/FAQ geometry and sampled scrolling frame intervals on desktop viewports.
const fs=require('node:fs/promises'),path=require('node:path');
const pw=require(require.resolve('playwright',{paths:[process.cwd(),process.env.USERPROFILE||'']}));
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const url=process.env.SYNTHECORE_URL||'http://127.0.0.1:4174/';
const report={date:new Date().toISOString(),cases:[],limitation:'Headless software/browser timings on this machine; not physical-device FPS certification.'};
const isolated=process.argv.includes('--isolated');
const check=(e,message,pass,data)=>e.checks.push({message,pass:!!pass,data});
(async()=>{
 const browser=await pw.chromium.launch({headless:true});
 try{for(const [width,height] of [[3840,2160],[2560,1440],[1920,1080],[1440,900],[320,568]]){
  const e={viewport:width+'x'+height,checks:[]};report.cases.push(e);
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1}),page=await context.newPage();
  await page.goto(url,{waitUntil:'load'});await page.waitForFunction(()=>window.__synthecoreScrollQA?.getState().ready);await pause(700);
  const layout=()=>page.locator('.sc-faq__question').first().evaluate(n=>{const s=n.querySelector('svg'),r=s.getBoundingClientRect(),q=n.getBoundingClientRect(),m=new DOMMatrixReadOnly(getComputedStyle(s).transform);return{x:r.x+r.width/2-q.x,y:r.y+r.height/2-q.y,angle:Math.atan2(m.b,m.a)*180/Math.PI};});
  const q=page.locator('.sc-faq__question').first();await q.scrollIntoViewIfNeeded();await pause(500);const before=await layout();await q.click();await pause(750);const after=await layout();
  check(e,'FAQ arrow rotates -45deg without centre shift',Math.abs(after.angle+45)<1 && Math.abs(after.x-before.x)<1 && Math.abs(after.y-before.y)<1,{before,after});
  await q.click();await pause(650);
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await pause(900);
  await page.evaluate(()=>{window.__v60FrameTimes=[];let previous=performance.now();function frame(now){window.__v60FrameTimes.push(now-previous);previous=now;if(window.__v60FrameTimes.length<300)requestAnimationFrame(frame);}requestAnimationFrame(frame);});
  await page.mouse.move(5,5);for(let i=0;i<20;i++){await page.mouse.wheel(0,height*.6);await pause(140);}
  await pause(1700);
  const sample=await page.evaluate(()=>window.__v60FrameTimes.slice(2).sort((a,b)=>a-b));
  e.frames={n:sample.length,median:sample[Math.floor(sample.length*.5)],p95:sample[Math.floor(sample.length*.95)],max:sample.at(-1),over100ms:sample.filter(t=>t>100).length,finalScroll:await page.evaluate(()=>scrollY)};
  check(e,'scroll frame sampling completes',sample.length>=20 && e.frames.finalScroll>height,e.frames);
  await context.close();console.log(e.viewport,JSON.stringify(e.frames));
 }}finally{await browser.close();}
 report.pass=report.cases.every(e=>e.checks.every(c=>c.pass));const dir=path.resolve(__dirname,'../output/playwright/v60/motion');await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,isolated?'report-isolated.json':'report.json'),JSON.stringify(report,null,2));if(!report.pass)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
