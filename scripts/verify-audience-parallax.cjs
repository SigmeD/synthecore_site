const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require(require.resolve('playwright-core',{paths:[process.cwd(),process.env.USERPROFILE]}));
const out=path.resolve(__dirname,'../output/playwright/audience-parallax');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const report={date:new Date().toISOString(),cases:[]};
async function frame(p){return p.evaluate(()=>{
  const rect=n=>{const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,width:r.width};};
  const section=document.querySelector('#audiences'),copy=section.querySelector('.audience-copy'),heading=copy.querySelector('h2');
  return {qa:window.__synthecoreScrollQA.getState(),section:rect(section),copy:rect(copy),heading:rect(heading),
    y:new DOMMatrix(getComputedStyle(copy).transform).f,opacity:getComputedStyle(copy).opacity,headingOpacity:getComputedStyle(heading).opacity,
    sectionStyle:{padding:getComputedStyle(section).padding,margin:getComputedStyle(section).margin,overflow:getComputedStyle(section).overflow},
    documentHeight:document.documentElement.scrollHeight,followingTop:document.querySelector('#services').getBoundingClientRect().top+scrollY,
    selected:section.querySelectorAll('.audience-option.is-active').length,overflow:document.documentElement.scrollWidth>innerWidth+1,
    triggers:window.ScrollTrigger?.getAll().map(t=>t.vars.id)||[]};
});}
(async()=>{await fs.mkdir(out,{recursive:true});const b=await chromium.connectOverCDP('http://127.0.0.1:9222');try{
  for(const[width,height]of[[1366,768],[1920,1080],[3840,2160]]){
    const c=await b.newContext({viewport:{width,height}}),p=await c.newPage(),e={label:`${width}x${height}`,frames:[],samples:[],errors:[]};
    try{p.on('pageerror',x=>e.errors.push(x.message));await p.goto('http://127.0.0.1:4173/');await p.waitForFunction(()=>window.__synthecoreScrollQA.getState().ready);await wait(250);await p.mouse.move(2,2);
      const save=async name=>{const s=await frame(p);e.frames.push({name,...s});await p.screenshot({path:path.join(out,`${e.label}-${name}.png`)});return s;};
      const first=await save('start');assert.ok(first.triggers.includes('synthecore-audience-parallax'),'Independent copy animation exists');
      assert.ok(first.y>=80&&first.y<=140);const end=first.qa.pinEnd,range=first.qa.parallaxEnd-end;
      assert.equal(first.qa.parallaxStart,end);assert.equal(first.qa.parallaxScrub,.55);
      const check=s=>{assert.equal(s.documentHeight,first.documentHeight);assert.equal(s.followingTop,first.followingTop);assert.equal(s.section.height,first.section.height);
        assert.deepEqual(s.sectionStyle,first.sectionStyle);assert.equal(s.opacity,'1');assert.equal(s.headingOpacity,'1');assert.equal(s.selected,0);assert.equal(s.overflow,false);
        assert.ok(s.y>=-.01&&s.y<=first.y+.01);if(s.qa.scroll<=end+.5)assert.ok(s.qa.parallaxProgress<.001,'copy does not animate before allowed transition');
        if(s.copy.bottom<height)assert.ok(s.copy.bottom<=s.section.bottom+.5,'visible copy is not clipped by parent');};
      await p.mouse.wheel(0,end*4);await p.waitForFunction(()=>window.__synthecoreScrollQA.getState().gateState==='READY');const ready=await save('READY');check(ready);assert.equal(ready.qa.gateState,'READY');assert.equal(ready.qa.timelineProgress,1);assert.ok(Math.abs(ready.y-first.y)<.01);
      await wait(800);assert.equal((await frame(p)).qa.scroll,ready.qa.scroll);
      await p.mouse.wheel(0,range*.5);
      for(let i=0;i<24;i++){const s=await frame(p);check(s);e.samples.push(s);await wait(80);}
      const middle=await save('mid');assert.ok(middle.y>0&&middle.y<first.y);assert.ok(Math.abs(middle.y-first.y*.5)<2);
      const extra=(ready.copy.top-middle.copy.top)-(ready.section.top-middle.section.top);assert.ok(extra>first.y*.4,'copy moves upward in addition to document scroll');
      for(let i=1;i<e.samples.length;i++)assert.ok(e.samples[i].y<=e.samples[i-1].y+.05,'wheel stop settles without bounce');
      await p.evaluate(()=>window.__synthecoreScrollQA.refresh());await wait(700);check(await frame(p));assert.ok(Math.abs((await frame(p)).y-middle.y)<2,'refresh preserves transform');
      await p.mouse.wheel(0,range*.6);await wait(1800);const settled=await save('settled');check(settled);assert.ok(Math.abs(settled.y)<.01);
      await p.mouse.wheel(0,-range*.6);await wait(1800);const reverse=await save('reverse-mid');check(reverse);assert.ok(Math.abs(reverse.y-middle.y)<2);
      await p.mouse.wheel(0,-range*.5);await wait(1800);const back=await save('reverse-READY');check(back);assert.ok(Math.abs(back.y-first.y)<.05);
      await p.mouse.wheel(0,-end);await wait(1500);check(await save('reverse-start'));
      await p.setViewportSize({width,height:height+100});await wait(650);const resized=await frame(p);assert.ok(Math.abs(resized.y-Math.min(140,Math.max(80,(height+100)*.1)))<.05);
      await p.emulateMedia({reducedMotion:'reduce'});await p.waitForFunction(()=>window.__synthecoreScrollQA.getEngine()==='native-reduced-motion');const reduced=await frame(p);
      assert.equal(reduced.y,0);assert.ok(!reduced.triggers.includes('synthecore-audience-parallax'));assert.equal((await p.locator('.audience-copy').getAttribute('style')||'').trim(),'');
      await p.emulateMedia({reducedMotion:'no-preference'});await p.waitForFunction(()=>window.__synthecoreScrollQA.getEngine()==='lenis-gsap-scrolltrigger');assert.ok((await frame(p)).y>=80);
      await p.setViewportSize({width:390,height:844});await p.waitForFunction(()=>window.__synthecoreScrollQA.getEngine()==='native-mobile');assert.equal((await frame(p)).y,0);
      assert.deepEqual(e.errors,[]);e.status='passed';
    }catch(x){e.status='failed';e.errors.push(x.stack);}finally{report.cases.push(e);console.log(e.label,e.status,e.errors.join('\n'));await c.close();}
  }report.status=report.cases.every(x=>x.status==='passed')?'passed':'failed';await fs.writeFile(path.join(out,'acceptance.json'),JSON.stringify(report,null,2));if(report.status==='failed')process.exitCode=1;
}finally{await b.close();}})().catch(x=>{console.error(x);process.exitCode=1;});
