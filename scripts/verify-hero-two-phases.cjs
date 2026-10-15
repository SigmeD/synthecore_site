const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require(require.resolve('playwright-core',{paths:[process.cwd(),process.env.USERPROFILE]}));
const output=path.resolve(__dirname,'../output/playwright/hero-two-phases');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const baseline=process.argv.includes('--before');
const report={date:new Date().toISOString(),cases:[]};
async function frame(page){return page.evaluate(()=>{
  const rect=node=>{const r=node.getBoundingClientRect();return {y:r.y,height:r.height,bottom:r.bottom};};
  const paint=node=>{let opacity=1,visible=true;for(let p=node;p;p=p.parentElement){const s=getComputedStyle(p);opacity*=+s.opacity;visible&&=s.visibility!=='hidden'&&s.display!=='none';}return {opacity,visible,transformY:new DOMMatrix(getComputedStyle(node).transform).f};};
  const hero=document.querySelector('.hero'),audience=document.querySelector('.audience-container'),heading=document.querySelector('#audience-title');
  const photo=document.querySelector('.hero-image-expander');
  return {qa:window.__synthecoreScrollQA.getState(),hero:rect(hero),heading:{...rect(heading),...paint(heading)},
    rows:[...document.querySelectorAll('.audience-option')].map(paint),container:paint(audience),inert:audience.inert,
    following:[...document.querySelectorAll('#audiences ~ section')].map(paint),
    clip:getComputedStyle(photo).clipPath,scale:new DOMMatrix(getComputedStyle(photo.querySelector('img')).transform).a,
    shade:+getComputedStyle(photo).getPropertyValue('--photo-shade-opacity'),
    gap:document.querySelector('#audiences').getBoundingClientRect().top-hero.getBoundingClientRect().bottom,
    selected:document.querySelectorAll('.audience-option.is-active').length,
    documentHeight:document.documentElement.scrollHeight,viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth+1};
});}
function verify(s){
  assert.equal(s.overflow,false);assert.equal(s.selected,0,'Scroll never selects a category');
  assert.ok(Math.abs(s.qa.timelineProgress-s.qa.scrollProgress)<.002,'Reveal and pin share smoothed scroll');
  if(s.qa.scroll<=s.qa.pinEnd){
    assert.ok(!s.heading.visible||s.heading.opacity===0,'A/B: heading is not painted before further scroll');
    assert.ok(s.rows.every(n=>!n.visible||n.opacity===0),'A/B: directions are not painted');
    assert.ok(s.following.every(n=>!n.visible||n.opacity===0),'Later sections do not show through intro');
    assert.ok(s.inert,'Hidden audience controls cannot receive focus or pointer activation');
  }
  if(s.heading.visible&&s.heading.opacity>.001){
    assert.ok(s.qa.timelineProgress>.999,'Heading entrance begins only after full image reveal');
    assert.ok(s.qa.scroll>s.qa.pinEnd,'Entrance starts in a separate scroll interval');
  }
  if(s.hero.y<0)assert.ok(s.qa.timelineProgress>.999,'Hero leaves only fully revealed');
}
(async()=>{await fs.mkdir(output,{recursive:true});const b=await chromium.connectOverCDP('http://127.0.0.1:9222');try{
  for(const[width,height]of[[1366,768],[1920,1080],[3840,2160]]){
    const c=await b.newContext({viewport:{width,height}}),entry={label:`${width}x${height}`,errors:[],controls:[],samples:[]};
    try{const p=await c.newPage();p.on('pageerror',e=>entry.errors.push(e.message));await p.goto('http://127.0.0.1:4173/');await p.waitForFunction(()=>window.__synthecoreScrollQA.getState().ready);await pause(300);await p.mouse.move(2,2);
      const first=await frame(p);verify(first);const end=first.qa.pinEnd,distance=end-first.qa.pinStart,entranceEnd=first.qa.handoffEnd;
      if(baseline){entry.status='passed';continue;}
      assert.ok(entranceEnd>end,'Second scroll range exists after pin release');
      assert.ok(Math.abs(first.qa.handoffStart-end)<.01,'No independent empty pause or overlap');
      const wheelTo=async target=>{await p.mouse.wheel(0,target-await p.evaluate(()=>window.__synthecoreScrollQA.getState().targetScroll));await pause(1500);};
      for(const[name,target]of[['start',0],['A',distance*.5],['B',end],['heading-first',end+(entranceEnd-end)*.15],['V',entranceEnd+2],['reverse-B',end],['reverse-A',distance*.5],['reverse-start',0]]){
        await wheelTo(target);const s=await frame(p);verify(s);entry.controls.push({name,...s});
        assert.equal(s.documentHeight,first.documentHeight,'Animations add no page height');assert.equal(s.hero.height,first.hero.height,'Banner height unchanged');
        await p.screenshot({path:path.join(output,`${width}x${height}-${name}.png`)});
      }
      const B=entry.controls.find(n=>n.name==='B'),V=entry.controls.find(n=>n.name==='V'),early=entry.controls.find(n=>n.name==='heading-first');
      assert.ok(B.qa.timelineProgress>.999&&Math.abs(B.scale-1)<.002&&Math.abs(B.shade-.98)<.002,'B: full image and scrim');
      assert.ok(V.hero.y<0&&V.heading.y<height&&V.heading.opacity>.999&&V.rows.every(n=>n.opacity>.999),'V: heading then all three directions');
      assert.ok(early.heading.opacity>0&&early.rows.every(n=>n.opacity===0),'Heading appears ahead of directions');
      assert.ok(V.gap<40,'No additional space inserted between sections');
      await p.evaluate(()=>{window.__phaseFrames=[];window.__phaseSampling=true;
        const paint=node=>{let opacity=1,visible=true;for(let n=node;n;n=n.parentElement){const s=getComputedStyle(n);opacity*=+s.opacity;visible&&=s.visibility!=='hidden'&&s.display!=='none';}return {opacity,visible};};
        const sample=()=>{const q=window.__synthecoreScrollQA.getState(),h=document.querySelector('.hero').getBoundingClientRect();
          window.__phaseFrames.push({qa:q,hero:{y:h.y},heading:paint(document.querySelector('#audience-title')),
            rows:[...document.querySelectorAll('.audience-option')].map(paint),following:[...document.querySelectorAll('#audiences ~ section')].map(paint),
            inert:document.querySelector('.audience-container').inert,selected:document.querySelectorAll('.audience-option.is-active').length,overflow:document.documentElement.scrollWidth>innerWidth+1});
          if(window.__phaseSampling)requestAnimationFrame(sample);};sample();});
      await p.mouse.wheel(0,distance*.45);await pause(1700);
      await p.mouse.wheel(0,end+height);await pause(1700);
      await p.mouse.wheel(0,-end-height);await pause(1700);
      for(let i=0;i<12;i++){await p.mouse.wheel(0,(entranceEnd+100)/12);await pause(80);}await pause(1500);
      for(let i=0;i<12;i++){await p.mouse.wheel(0,-(entranceEnd+100)/12);await pause(80);}await pause(1500);
      entry.samples=await p.evaluate(()=>{window.__phaseSampling=false;return window.__phaseFrames;});entry.samples.forEach(verify);
      assert.deepEqual(entry.errors,[]);entry.status='passed';
    }catch(e){entry.status='failed';entry.errors.push(e.message);}finally{report.cases.push(entry);console.log(entry.label,entry.status,entry.errors.join('; '));await c.close();}
  }
  report.status=report.cases.every(n=>n.status==='passed')?'passed':'failed';if(report.status==='failed')process.exitCode=1;
  await fs.writeFile(path.join(output,baseline?'baseline-failures.json':'acceptance.json'),JSON.stringify(report,null,2));console.log(report.status);
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
