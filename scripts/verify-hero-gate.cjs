const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require(require.resolve('playwright-core',{paths:[process.cwd(),process.env.USERPROFILE]}));
const out=path.resolve(__dirname,'../output/playwright/hero-gate');
const before=process.argv.includes('--before');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const report={date:new Date().toISOString(),cases:[]};
async function frame(p){return p.evaluate(()=>{
  const rect=n=>{const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,width:r.width,height:r.height};};
  const hero=document.querySelector('.hero'),photo=hero.querySelector('.hero-image-expander'),heading=document.querySelector('#audience-title');
  const img=photo?.querySelector('img'),m=new DOMMatrix(img?getComputedStyle(img).transform:'none');
  return {qa:window.__synthecoreScrollQA.getState(),hero:rect(hero),photo:rect(photo||hero.querySelector('.photo')),
    audiences:rect(document.querySelector('#audiences')),heading:rect(heading),headingOpacity:getComputedStyle(heading).opacity,
    headingTransform:getComputedStyle(heading).transform,containerOpacity:getComputedStyle(heading.parentElement).opacity,
    clip:photo?getComputedStyle(photo).clipPath:null,scale:[m.a,m.d],shade:photo?+getComputedStyle(photo).getPropertyValue('--photo-shade-opacity'):0,
    title:rect(hero.querySelector('h1')),cta:rect(hero.querySelector('.main-cta')),
    overflow:document.documentElement.scrollWidth>innerWidth+1,documentHeight:document.documentElement.scrollHeight,
    selected:document.querySelectorAll('.audience-option.is-active').length,viewport:[innerWidth,innerHeight],
    triggers:window.ScrollTrigger?.getAll().map(t=>t.vars.id)||[]};
});}
function check(s){
  assert.equal(s.overflow,false);assert.equal(s.selected,0,'scroll must not select cards');
  assert.ok(Math.abs(s.qa.timelineProgress-s.qa.scrollProgress)<.002,'single smoothing owner');
  assert.equal(s.headingOpacity,'1','heading remains painted');assert.equal(s.headingTransform,'none','heading has no independent motion');
  assert.equal(s.containerOpacity,'1');assert.ok(!s.triggers.includes('synthecore-handoff'));
  if(s.qa.scroll<=s.qa.pinEnd+.5) assert.ok(s.heading.top>=s.viewport[1],'A/B: heading physically outside viewport');
  if(s.hero.top < -1) assert.ok(s.qa.timelineProgress>.999,'departure requires full reveal');
  assert.ok(Math.abs(s.scale[0]-s.scale[1])<.0001,'uniform photo scale');
}
async function synthetic(p,deltas,gap=20){for(const delta of deltas){await p.evaluate(d=>window.dispatchEvent(new WheelEvent('wheel',{deltaY:d,deltaMode:0,bubbles:true,cancelable:true})),delta);await wait(gap);}}
(async()=>{await fs.mkdir(out,{recursive:true});const b=await chromium.connectOverCDP('http://127.0.0.1:9222');try{
  for(const [width,height]of[[1366,768],[1920,1080],[3840,2160]]){
    const c=await b.newContext({viewport:{width,height}}),e={label:`${width}x${height}`,controls:[],errors:[]};
    try{
      if(before)for(const [url,file]of[['**/js/hero-scroll.js','hero-scroll.js'],['**/css/main.css','main.css']]){
        const body=await fs.readFile(path.resolve(__dirname,'../backup/hero-gate-before-2026-10-14',file));
        await c.route(url,r=>r.fulfill({body,contentType:file.endsWith('.css')?'text/css':'application/javascript'}));
      }
      const p=await c.newPage();p.on('pageerror',x=>e.errors.push(x.message));await p.goto('http://127.0.0.1:4173/');
      await p.waitForFunction(()=>window.__synthecoreScrollQA.getState().ready);await wait(250);await p.mouse.move(2,2);
      const save=async name=>{const s=await frame(p);e.controls.push({name,...s});await p.screenshot({path:path.join(out,`${before?'before-':''}${e.label}-${name}.png`)});return s;};
      const first=await save('start'),end=first.qa.pinEnd;
      if(!before)await p.evaluate(()=>{
        window.__gateSamples=[];window.__sampleGate=true;
        const sample=()=>{const q=window.__synthecoreScrollQA.getState(),h=document.querySelector('.hero').getBoundingClientRect(),a=document.querySelector('#audiences').getBoundingClientRect(),title=document.querySelector('#audience-title').getBoundingClientRect();
          window.__gateSamples.push({time:performance.now(),qa:q,heroTop:h.top,heroBottom:h.bottom,audiencesTop:a.top,headingTop:title.top});
          if(window.__sampleGate)requestAnimationFrame(sample);};sample();
      });
      await p.mouse.wheel(0,end/2);await wait(1450);const A=await save('A');
      await p.mouse.wheel(0,before?end/2:end*4);
      if(!before) await synthetic(p,[80,60,40,25,15,8,4,2,1]);
      await wait(1650);const B=await save('B');
      if(before){check(B);continue;}check(first);check(A);check(B);
      assert.equal(B.qa.gateState,'READY');assert.ok(Math.abs(B.qa.scroll-end)<1);assert.ok(B.qa.timelineProgress>.999);
      assert.ok(Math.abs(B.scale[0]-1)<.001);assert.ok(Math.abs(B.shade-.98)<.001);assert.ok(B.clip.startsWith('inset(0px'));
      await synthetic(p,[20,18,16,8,4,1],220);assert.equal((await frame(p)).qa.gateState,'READY','separated decaying small tails cannot unlock');
      await synthetic(p,[1]);await wait(250);await synthetic(p,[1]);await wait(1900);
      const held=await save('held-tail');check(held);assert.equal(held.qa.gateState,'READY');assert.ok(Math.abs(held.qa.scroll-end)<1,'tail/idle cannot release');
      await p.mouse.wheel(0,height*.25);await wait(1550);const C=await save('C');check(C);
      assert.equal(C.qa.gateState,'LEAVING');assert.ok(C.hero.top<0&&C.heading.top<height,'new gesture moves entire section');
      assert.ok(Math.abs((B.heading.top-C.heading.top)-(B.audiences.top-C.audiences.top))<1,'heading and section move together');
      assert.equal(C.documentHeight,first.documentHeight,'no dynamic spacer');
      await p.mouse.wheel(0,-height*.25);await wait(1550);const reverseB=await save('reverse-B');check(reverseB);
      await p.mouse.wheel(0,-end/2);await wait(1550);const reverseA=await save('reverse-A');check(reverseA);assert.ok(reverseA.qa.timelineProgress<.6);
      await p.mouse.wheel(0,-end*2);await wait(1550);check(await save('reverse-start'));
      e.samples=await p.evaluate(()=>{window.__sampleGate=false;return window.__gateSamples;});
      assert.ok(e.samples.some(s=>s.qa.gateState==='SETTLING')&&e.samples.some(s=>s.qa.gateState==='READY'));
      for(const s of e.samples){
        assert.ok(Math.abs(s.qa.timelineProgress-s.qa.scrollProgress)<.002);
        if(s.qa.scroll<=end+.5)assert.ok(s.headingTop>=height,'Every sampled frame keeps the heading outside A/B');
        if(s.heroTop<-1)assert.ok(s.qa.timelineProgress>.999,'No premature release frame');
        if(s.qa.gateState==='READY')assert.ok(Math.abs(s.qa.scroll-end)<1&&s.qa.timelineProgress>.999);
      }
      // A slow, continuous gesture with its decaying tail cannot bypass READY.
      for(let i=0;i<18;i++){await p.mouse.wheel(0,end/12);await wait(35);}await wait(1600);
      const slow=await save('slow-ready');check(slow);assert.equal(slow.qa.gateState,'READY');
      // Precision-input restart requires acceleration, not one tiny late tail.
      await synthetic(p,[1]);await wait(220);await synthetic(p,[2,5,12,24]);await wait(1550);
      const precision=await frame(p);check(precision);assert.equal(precision.qa.gateState,'LEAVING');assert.ok(precision.qa.scroll>end);
      // Keyboard navigation is never gated.
      await p.keyboard.press('End');await wait(600);assert.ok((await frame(p)).qa.scroll>end+height);
      await p.keyboard.press('Home');await wait(600);await p.keyboard.press('PageDown');await wait(600);assert.ok((await frame(p)).qa.scroll>0);
      await p.evaluate(()=>{const a=document.createElement('a');a.href='#audiences';document.body.append(a);a.click();a.remove();});await wait(1600);
      const anchor=await save('anchor');assert.equal(await p.evaluate(()=>location.hash),'#audiences');assert.ok(anchor.heading.top>=0&&anchor.heading.top<height);
      // Refresh occupied checkpoint; no stuck old scroll boundary.
      await p.evaluate(()=>{history.replaceState(null,'',location.pathname);window.scrollTo(0,0);});await wait(200);
      await p.mouse.wheel(0,end*4);await wait(1650);assert.equal((await frame(p)).qa.gateState,'READY');
      await p.setViewportSize({width,height:height+100});await wait(750);const resized=await save('resize-ready');check(resized);
      assert.equal(resized.qa.gateState,'READY');assert.ok(Math.abs(resized.qa.scroll-resized.qa.pinEnd)<1);
      await p.evaluate(()=>window.__synthecoreScrollQA.refresh());await wait(250);check(await frame(p));
      await p.mouse.wheel(0,300);await wait(1500);assert.equal((await frame(p)).qa.gateState,'LEAVING');
      // Interrupt SETTLING before completion: reverse starts from actual scroll,
      // rather than continuing toward the old positive wheel target.
      await p.keyboard.press('Home');await wait(600);await p.mouse.wheel(0,end*4);await wait(120);
      const settling=await frame(p);assert.equal(settling.qa.gateState,'SETTLING');assert.ok(settling.qa.timelineProgress<.999);
      await p.mouse.wheel(0,-200);await wait(1500);const interrupted=await frame(p);check(interrupted);
      assert.ok(interrupted.qa.scroll<settling.qa.scroll+1,'reverse interrupts unfinished settlement');
      await p.mouse.wheel(0,end*4);await wait(1500);assert.equal((await frame(p)).qa.gateState,'READY');
      await synthetic(p,[20],220);assert.equal((await frame(p)).qa.gateState,'READY');
      await synthetic(p,[20],220);await wait(1500);assert.equal((await frame(p)).qa.gateState,'LEAVING','low-sensitivity wheel does not trap user');
      assert.deepEqual(e.errors,[]);e.status='passed';
    }catch(x){e.status='failed';e.errors.push(x.stack);}finally{console.log(e.label,e.status,e.errors.join('\n'));report.cases.push(e);await c.close();}
  }
  if(!before)for(const config of [{viewport:{width:390,height:844},isMobile:true,hasTouch:true},{viewport:{width:1920,height:1080},reducedMotion:'reduce'}]){
    const c=await b.newContext(config),p=await c.newPage(),e={label:config.isMobile?'mobile-native':'reduced-motion-native'};
    try{if(config.reducedMotion)await p.emulateMedia({reducedMotion:config.reducedMotion});
      await p.goto('http://127.0.0.1:4173/');await p.waitForFunction(()=>window.__synthecoreScrollQA.getState().ready);await wait(150);e.initial=await frame(p);
      assert.ok(e.initial.qa.engine.startsWith('native-'));assert.equal(e.initial.qa.gateState,'DISABLED');assert.equal(e.initial.qa.pinEnd,0);
      await p.evaluate(()=>window.scrollTo(0,innerHeight*2));await wait(100);e.after=await frame(p);assert.ok(e.after.qa.scroll>0);assert.equal(e.after.overflow,false);e.status='passed';
    }catch(x){e.status='failed';e.error=x.stack;}finally{report.cases.push(e);console.log(e.label,e.status,e.error||'');await c.close();}
  }
  report.status=report.cases.every(x=>x.status==='passed')?'passed':'failed';await fs.writeFile(path.join(out,before?'baseline.json':'acceptance.json'),JSON.stringify(report,null,2));if(report.status==='failed')process.exitCode=1;
}finally{await b.close();}})().catch(x=>{console.error(x);process.exitCode=1;});
