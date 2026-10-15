const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require(require.resolve('playwright-core',{paths:[process.cwd(),process.env.USERPROFILE]}));
const output=path.resolve(__dirname,'../output/playwright/hero-handoff');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const baseline=process.argv.includes('--before');
const proposal=process.argv.includes('--proposal');
const report={date:new Date().toISOString(),cases:[]};
async function frame(page){return page.evaluate(()=>{
  const hero=document.querySelector('.hero').getBoundingClientRect(),heading=document.querySelector('#audience-title').getBoundingClientRect();
  const photo=document.querySelector('.hero-image-expander'),image=photo.querySelector('img'),s=getComputedStyle(photo);
  return {qa:window.__synthecoreScrollQA.getState(),hero:{y:hero.y,height:hero.height,bottom:hero.bottom},heading:{y:heading.y,bottom:heading.bottom},
    viewport:[innerWidth,innerHeight],clip:s.clipPath,scale:new DOMMatrix(getComputedStyle(image).transform).a,
    shade:s.getPropertyValue('--photo-shade-opacity'),overflow:document.documentElement.scrollWidth>innerWidth+1,
    selected:document.querySelectorAll('.audience-option.is-active').length,
    titleY:document.querySelector('.hero h1').getBoundingClientRect().y,
    ctaY:document.querySelector('.hero .main-cta').getBoundingClientRect().y,
    gap:document.querySelector('#audiences').getBoundingClientRect().top-hero.bottom,
    documentHeight:document.documentElement.scrollHeight};
});}
function verifyFrames(frames){
  for(const s of frames){
    assert.equal(s.overflow,false);assert.equal(s.selected,0,'Scrolling never selects audience cards');
    assert.ok(Math.abs(s.qa.timelineProgress-s.qa.scrollProgress)<.002,'Reveal stays synchronized to physical pin progress');
    if(s.qa.scrollProgress<.998){
      assert.ok(s.heading.y>=s.viewport[1]-1,'Next heading must stay below viewport throughout reveal');
    }
    if(s.hero.y<0){assert.ok(s.qa.timelineProgress>.999,'Hero moves out only after full reveal');}
  }
}
(async()=>{await fs.mkdir(output,{recursive:true});const b=await chromium.connectOverCDP('http://127.0.0.1:9222');try{
  for(const[width,height]of[[1366,768],[1920,1080],[3840,2160]]){
    const c=await b.newContext({viewport:{width,height}}),entry={label:`${width}x${height}`,errors:[],controls:[],samples:[]};
    try{const p=await c.newPage();p.on('pageerror',e=>entry.errors.push(e.message));
      if(proposal)await p.route('**/css/main.css',async r=>r.fulfill({contentType:'text/css',body:await fs.readFile(path.resolve(__dirname,'../css/main.css'),'utf8')+
        '\n#imageScrollSticky.is-image-animated > .hero{height:calc(100svh - 2 * var(--hero-edge))}\n'}));
      await p.goto('http://127.0.0.1:4173/');await p.waitForFunction(()=>window.__synthecoreScrollQA.getState().ready);await pause(350);await p.mouse.move(2,2);
      const first=await frame(p),end=first.qa.pinEnd,distance=end-first.qa.pinStart;
      const wheelTo=async target=>{await p.mouse.wheel(0,target-await p.evaluate(()=>window.__synthecoreScrollQA.getState().targetScroll));await pause(1500);};
      for(const[name,target]of[['start',0],['middle',distance*.5],['complete',end],['transition',end+Math.min(240,height*.2)],['reverse-complete',end],['reverse-middle',distance*.5],['reverse-start',0]]){
        await wheelTo(target);const s=await frame(p);entry.controls.push({name,...s});
        await p.screenshot({path:path.join(output,`${proposal?'proposal':baseline?'before':'after'}-${width}x${height}-${name}.png`)});
      }
      // Sample real frames continuously, including fast overshoot and reverse.
      await p.evaluate(()=>{
        window.__handoffSamples=[];window.__handoffSampling=true;
        const sample=()=>{
          const qa=window.__synthecoreScrollQA.getState(),h=document.querySelector('.hero').getBoundingClientRect(),a=document.querySelector('#audience-title').getBoundingClientRect();
          window.__handoffSamples.push({qa,hero:{y:h.y,bottom:h.bottom},heading:{y:a.y},viewport:[innerWidth,innerHeight],
            overflow:document.documentElement.scrollWidth>innerWidth+1,selected:document.querySelectorAll('.audience-option.is-active').length});
          if(window.__handoffSampling)requestAnimationFrame(sample);
        };sample();
      });
      await p.mouse.wheel(0,distance*.45);await pause(1800); // Stop wheel halfway and allow existing Lenis to settle.
      await p.mouse.wheel(0,end+height);await pause(1600);
      await p.mouse.wheel(0,-end-height);await pause(1600);
      for(let i=0;i<10;i++){await p.mouse.wheel(0,distance/10);await pause(70);}await pause(1500);
      for(let i=0;i<10;i++){await p.mouse.wheel(0,-distance/10);await pause(70);}await pause(1500);
      entry.samples=await p.evaluate(()=>{window.__handoffSampling=false;return window.__handoffSamples;});
      verifyFrames(entry.samples);
      const completed=entry.controls.find(n=>n.name==='complete');assert.ok(completed.heading.y>=height,'Completed reveal still has no next heading');
      assert.ok(completed.qa.timelineProgress>.999&&Math.abs(completed.scale-1)<.002,'Full image revealed at pin end');
      const released=entry.controls.find(n=>n.name==='transition');assert.ok(released.hero.y<0&&released.heading.y<height,'Further scroll moves Hero and brings in next heading');
      assert.ok(released.gap<150,'No extra gap inserted between banners');
      assert.deepEqual(entry.errors,[]);entry.status='passed';
    }catch(e){entry.status='failed';entry.errors.push(e.message);}finally{report.cases.push(entry);console.log(entry.label,entry.status,entry.errors.join('; '));await c.close();}
  }
  report.status=report.cases.every(n=>n.status==='passed')?'passed':'failed';if(report.status==='failed')process.exitCode=1;
  await fs.writeFile(path.join(output,proposal?'proposal-acceptance.json':baseline?'baseline-failures.json':'acceptance.json'),JSON.stringify(report,null,2));console.log(report.status);
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
