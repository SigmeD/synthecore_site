const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require(require.resolve('playwright-core',{paths:[process.cwd(),process.env.USERPROFILE]}));
const out=path.resolve(__dirname,'../output/playwright/hero-compact');
const report={date:new Date().toISOString(),cases:[]};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function snapshot(p){return p.evaluate(()=>{
  const rect=n=>{const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width,height:r.height,left:r.left};};
  const h=document.querySelector('.hero'),s=document.querySelector('#imageScrollSticky'),f=h.querySelector('.hero-bottom'),photo=h.querySelector('.hero-image-expander'),img=photo.querySelector('img');
  const m=new DOMMatrix(getComputedStyle(img).transform),heading=document.querySelector('#audience-title');
  return {viewport:[innerWidth,innerHeight],qa:window.__synthecoreScrollQA.getState(),hero:rect(h),scene:rect(s),footer:rect(f),photo:rect(photo),frame:rect(h.querySelector('.photo-position-holder')),
    title:rect(h.querySelector('h1')),cta:rect(h.querySelector('.main-cta')),heading:rect(heading),headingOpacity:getComputedStyle(heading).opacity,headingTransform:getComputedStyle(heading).transform,
    footerGap:h.getBoundingClientRect().bottom-f.getBoundingClientRect().bottom,scale:[m.a,m.d],clip:getComputedStyle(photo).clipPath,
    selected:document.querySelectorAll('.audience-option.is-active').length,documentHeight:document.documentElement.scrollHeight,overflow:document.documentElement.scrollWidth>innerWidth+1};
});}
(async()=>{await fs.mkdir(out,{recursive:true});const b=await chromium.connectOverCDP('http://127.0.0.1:9222');try{
  const baseline=JSON.parse(await fs.readFile(path.join(out,'before-geometry.json')));
  for(const[width,height]of[[1366,768],[1920,1080],[3840,2160]]){
    const c=await b.newContext({viewport:{width,height}}),p=await c.newPage(),e={label:`${width}x${height}`,frames:[],errors:[]};
    try{p.on('pageerror',x=>e.errors.push(x.message));await p.goto('http://127.0.0.1:4173/');await p.waitForFunction(()=>window.__synthecoreScrollQA.getState().ready);await pause(200);await p.mouse.move(2,2);
      const capture=async name=>{const s=await snapshot(p);e.frames.push({name,...s});await p.screenshot({path:path.join(out,`after-${e.label}-${name}.png`)});return s;};
      const initial=await capture('start'),old=baseline.find(x=>x.viewport[0]===width);
      const expected=height<=790?Math.max(600,.92*height):Math.min(968,Math.max(620,.742*height));
      assert.ok(Math.abs(initial.hero.height-expected)<1,'Initial Hero uses the original compact height');
      assert.ok(initial.hero.bottom<height-35,'White area is visible below compact Hero');
      assert.ok(Math.abs(initial.scene.height-height)<1,'Only the pinned scene occupies the viewport');
      assert.ok(initial.footerGap>=19&&initial.footerGap<=41,'Footer is near the banner bottom');
      for(const key of['title','cta','frame'])assert.deepEqual(initial[key],old[key==='frame'?'photo':key],`${key} is unchanged`);
      const finalHeight=height-2*initial.hero.top;
      const check=s=>{
        const expectedHeight=initial.hero.height+(finalHeight-initial.hero.height)*s.qa.timelineProgress;
        assert.ok(Math.abs(s.hero.height-expectedHeight)<1,'Compact banner expands only with the reveal progress');
        assert.ok(Math.abs(s.footerGap-initial.footerGap)<1,'Footer stays attached to the banner');
        assert.equal(s.documentHeight,initial.documentHeight,'No changing spacer/document height');
        assert.equal(s.selected,0);assert.equal(s.overflow,false);assert.equal(s.headingOpacity,'1');assert.equal(s.headingTransform,'none');
        assert.ok(Math.abs(s.scale[0]-s.scale[1])<.001,'Uniform photo scaling');
        if(s.qa.scroll<=s.qa.pinEnd+.5)assert.ok(s.heading.top>=height,'Heading physically outside the scene during reveal/READY');
      };
      const end=initial.qa.pinEnd;await p.mouse.wheel(0,end/2);await pause(1450);check(await capture('A'));
      await p.mouse.wheel(0,end*3);await pause(1450);const B=await capture('B');check(B);assert.equal(B.qa.gateState,'READY');assert.equal(B.qa.timelineProgress,1);assert.ok(Math.abs(B.scale[0]-1)<.001);assert.ok(B.clip.startsWith('inset(0px'));
      await pause(1600);const held=await snapshot(p);check(held);assert.equal(held.qa.scroll,B.qa.scroll);
      await p.mouse.wheel(0,height*.25);await pause(1450);const C=await capture('C');check(C);assert.equal(C.qa.gateState,'LEAVING');assert.ok(C.heading.top<height);
      await p.mouse.wheel(0,-height*.25);await pause(1450);check(await capture('reverse-B'));
      await p.mouse.wheel(0,-end);await pause(1450);const reverse=await capture('reverse-start');check(reverse);assert.ok(reverse.qa.timelineProgress<.001);
      await p.mouse.wheel(0,end/2);await pause(1450);
      const newHeight=Math.max(700,Math.round(height*.65));await p.setViewportSize({width,height:newHeight});await pause(700);
      const resized=await capture('resize-half'),compactHeight=newHeight<=790?Math.max(600,newHeight*.92):Math.min(968,Math.max(620,newHeight*.742));
      const targetHeight=newHeight-2*resized.hero.top;
      assert.ok(Math.abs(resized.scene.height-newHeight)<1,'Resized scene height ignores child animation height');
      assert.ok(Math.abs(resized.hero.height-(compactHeight+(targetHeight-compactHeight)*resized.qa.timelineProgress))<1,'Mid-reveal resize remeasures compact and final heights');
      assert.ok(resized.footerGap>=19&&resized.footerGap<=41);
      await p.evaluate(()=>window.__synthecoreScrollQA.refresh());await pause(150);const refreshed=await snapshot(p);
      assert.ok(Math.abs(refreshed.hero.height-resized.hero.height)<1,'Explicit refresh preserves mid-reveal height');
      assert.deepEqual(e.errors,[]);e.status='passed';
    }catch(x){e.status='failed';e.errors.push(x.stack);}finally{console.log(e.label,e.status,e.errors.join('\n'));report.cases.push(e);await c.close();}
  }
  const native=await b.newContext({viewport:{width:1920,height:1080},reducedMotion:'reduce'}),np=await native.newPage(),e={label:'1920x1080-native-reduced'};
  try{await np.emulateMedia({reducedMotion:'reduce'});await np.goto('http://127.0.0.1:4173/');await np.waitForFunction(()=>window.__synthecoreScrollQA.getState().ready);await pause(200);
    e.frame=await np.evaluate(()=>{const h=document.querySelector('.hero').getBoundingClientRect(),f=document.querySelector('.hero-bottom').getBoundingClientRect();return {qa:window.__synthecoreScrollQA.getState(),heroHeight:h.height,footerGap:h.bottom-f.bottom};});
    assert.equal(e.frame.qa.engine,'native-reduced-motion');assert.equal(e.frame.qa.gateState,'DISABLED');assert.ok(e.frame.footerGap<=41,'Native reduced footer matches compact composition');e.status='passed';
  }catch(x){e.status='failed';e.error=x.stack;}finally{report.cases.push(e);console.log(e.label,e.status,e.error||'');await native.close();}
  report.status=report.cases.every(x=>x.status==='passed')?'passed':'failed';await fs.writeFile(path.join(out,'acceptance.json'),JSON.stringify(report,null,2));if(report.status==='failed')process.exitCode=1;
}finally{await b.close();}})().catch(x=>{console.error(x);process.exitCode=1;});
