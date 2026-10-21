'use strict';
// Read-only acceptance of the imported build. No runtime files or timelines are modified.
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(require.resolve('playwright',{paths:[process.cwd(),process.env.USERPROFILE]}));
const root = process.cwd();
const output = path.join(root,'output/v62-on-v27/motion');
fs.mkdirSync(output,{recursive:true});
const report = {date:new Date().toISOString(),cases:[],limitations:['Automated Chromium wheel/touch input does not establish subjective smoothness with a physical mouse or touchpad. Physical-device review remains required.']};
const sizes = [[320,568],[390,844],[768,1024],[1024,768],[1440,900],[1920,1080]];
const only = process.argv.find(a=>a.startsWith('--only='))?.slice(7);
const sleep = ms=>new Promise(r=>setTimeout(r,ms));
function check(entry,pass,label,details){entry.checks.push({pass:!!pass,label,...(details===undefined?{}:{details})});}
async function instrument(context){
  await context.addInitScript(()=>{
    window.__v62Lenis={live:0,max:0,created:0};
    let ctor;
    Object.defineProperty(window,'Lenis',{configurable:true,get:()=>ctor,set:value=>{
      ctor=new Proxy(value,{construct(target,args,newTarget){
        const instance=Reflect.construct(target,args,newTarget),c=window.__v62Lenis;
        c.live++;c.created++;c.max=Math.max(c.max,c.live);
        const destroy=instance.destroy.bind(instance);let dead=false;
        instance.destroy=(...args)=>{if(!dead){dead=true;c.live--;}return destroy(...args);};
        return instance;
      }});
    }});
  });
}
async function open(page,url){
  await page.goto(url,{waitUntil:'load',timeout:40000});
  await page.waitForFunction(()=>window.__synthecoreScrollQA?.getState().ready && window.__synthecoreTestimonialsQA);
  await page.evaluate(()=>document.fonts.ready);
  await sleep(700);
}
async function seek(page,y){
  await page.evaluate(y=>window.SyntheCoreMotion.scrollTo(Math.max(0,Math.min(document.documentElement.scrollHeight-innerHeight,y)),{immediate:true}),y);
  await sleep(280);
}
async function state(page){return page.evaluate(()=>{
  const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
  const viewport=document.querySelector('.sc-services__viewport');
  return {
    y:scrollY,max:document.documentElement.scrollHeight-innerHeight,overflow:document.documentElement.scrollWidth-innerWidth,
    lenis:window.__v62Lenis,motion:window.SyntheCoreMotion.getScrollState(),
    hero:window.__synthecoreScrollQA.getState(),works:window.__synthecoreWorksQA.getState(),
    services:window.__synthecoreServicesQA.getState(),reviews:window.__synthecoreTestimonialsQA.getState(),
    triggers:ScrollTrigger.getAll().map(t=>({id:t.vars.id,start:t.start,end:t.end,pin:!!t.vars.pin,progress:t.progress})),
    spacers:document.querySelectorAll('.pin-spacer').length,
    sticky:['#imageScrollSticky','.sc-works-stack','.sc-services__scene'].map(s=>({selector:s,position:getComputedStyle(document.querySelector(s)).position,...rect(document.querySelector(s))})),
    serviceViewport:{...rect(viewport),scrollLeft:viewport.scrollLeft,overflow:getComputedStyle(viewport).overflowX},
    serviceHeading:rect(document.querySelector('.sc-services__title')),
    serviceCards:[...document.querySelectorAll('.sc-service-card')].map(rect),
    reviewHeight:document.querySelector('#testimonials').getBoundingClientRect().height,
    fonts:{family:getComputedStyle(document.querySelector('#top h1')).fontFamily,manrope:document.fonts.check('16px Manrope')},
    counts:{works:document.querySelectorAll('.sc-work-item').length,services:document.querySelectorAll('.sc-service-card').length,reviews:document.querySelectorAll('.sc-testimonial__demo').length,faq:document.querySelectorAll('.sc-faq__question').length}
  };
});}
async function shot(page,dir,label){await page.screenshot({path:path.join(dir,label+'.jpg'),type:'jpeg',quality:80,animations:'allow'});}
async function swipe(page,context,selector){
  const b=await page.locator(selector).boundingBox();
  const cdp=await context.newCDPSession(page);
  const startX=Math.min(page.viewportSize().width-25,b.x+b.width-25),y=Math.max(10,Math.min(page.viewportSize().height-20,b.y+Math.min(160,b.height/2)));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:startX,y}]});
  for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:startX-i*Math.min(24,(startX-20)/12),y}]});await sleep(18);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await sleep(500);await cdp.detach();
}
async function geometry(page,context,entry,dir,width,height){
  const initial=await state(page);entry.initial=initial;
  check(entry,initial.overflow<=1,'no horizontal document overflow',initial.overflow);
  check(entry,initial.lenis.live===1 && initial.lenis.max===1,'one live global Lenis',initial.lenis);
  check(entry,initial.motion.lerp===0.068,'approved Lenis interpolation',initial.motion);
  check(entry,initial.spacers===0 && initial.triggers.every(t=>!t.pin),'no legacy GSAP pins/spacers',initial.triggers);
  check(entry,initial.counts.works===6 && initial.counts.services===6 && initial.counts.reviews===4 && initial.counts.faq===7,'approved content counts',initial.counts);
  await shot(page,dir,'01-hero');
  if(width>850){check(entry,initial.sticky[0].position==='sticky','Hero uses CSS sticky');}
  check(entry,initial.sticky[1].position==='sticky','Works uses CSS sticky');
  const hero=initial.hero;
  if(hero.pinEnd>hero.pinStart){
    entry.heroStages=[];
    for(const p of [0,.5,1]){await seek(page,hero.pinStart+(hero.pinEnd-hero.pinStart)*p);entry.heroStages.push(await page.locator('.photo.hero-image-expander').evaluate(n=>({clip:getComputedStyle(n).clipPath,imageScale:new DOMMatrixReadOnly(getComputedStyle(n.querySelector('img')).transform).a,progress:window.__synthecoreScrollQA.getProgress()})));await shot(page,dir,'02-hero-'+p);}
    check(entry,entry.heroStages[0].imageScale<entry.heroStages[1].imageScale && entry.heroStages[1].imageScale<entry.heroStages[2].imageScale && entry.heroStages[2].imageScale>.999 && entry.heroStages[0].clip!==entry.heroStages[2].clip,'Hero image and clip expand across full scene',entry.heroStages);
  }
  const work=initial.works;
  entry.firstEntry=[];
  for(const p of [0,.5,1]){await seek(page,work.firstEntryStart+(work.firstEntryEnd-work.firstEntryStart)*p);entry.firstEntry.push((await state(page)).works.cards[0].scale);await shot(page,dir,'03-work-first-'+p);}
  check(entry,entry.firstEntry[0]<entry.firstEntry[1] && entry.firstEntry[1]<entry.firstEntry[2] && entry.firstEntry[2]>.999,'first Works card progressively scales to 1',entry.firstEntry);
  entry.worksForward=[];entry.worksReverse=[];
  for(const [direction,indices] of [['Forward',[0,1,2,3,4,5]],['Reverse',[5,4,3,2,1,0]]]){
    for(const i of indices){
      await seek(page,work.pinStart+(work.pinEnd-work.pinStart)*i/5);
      const s=await state(page);entry['works'+direction].push(s.works);
      check(entry,Math.abs(s.works.cards[i].scale-1)<.003 && Math.abs(s.works.cards[i].top)<2,'Works card '+(i+1)+' '+direction.toLowerCase()+' reaches sticky stage',s.works.cards[i]);
      if(direction==='Forward')await shot(page,dir,'04-work-'+(i+1));
    }
  }
  const service=(await state(page)).services;
  if(service.mode==='pinned-horizontal'){
    await seek(page,service.pinStart);
    const start=await state(page);entry.serviceStart=start;
    check(entry,start.sticky[2].position==='sticky','Services uses CSS sticky');
    check(entry,start.serviceViewport.overflow==='clip' && start.services.scrollLeft===0,'Services overflow clip and scrollLeft zero',start.serviceViewport);
    const c=start.serviceCards[0],v=start.serviceViewport;
    check(entry,Math.abs(c.x-start.serviceHeading.x)<1,'first service card aligned with heading',{card:c.x,heading:start.serviceHeading.x});
    check(entry,c.x>=v.x-1 && c.right<=v.right+1,'first service card fully visible at start',{card:c,viewport:v});
    await shot(page,dir,'05-services-start');
    await seek(page,service.pinEnd);
    const end=await state(page);entry.serviceEnd=end;
    const last=end.serviceCards[5];
    check(entry,last.x>=end.serviceViewport.x-1 && last.right<=end.serviceViewport.right+1,'last service card reachable at end',last);
    check(entry,end.services.scrollLeft===0,'Services end retains zero scrollLeft');
    await shot(page,dir,'06-services-end');
  }else{
    const top=await page.locator('#services').evaluate(n=>n.getBoundingClientRect().top+scrollY);
    await seek(page,top-50);await shot(page,dir,'05-services-native');
    const before=await page.locator('.sc-services__viewport').evaluate(n=>n.scrollLeft);
    await swipe(page,context,'.sc-services__viewport');
    const after=await page.locator('.sc-services__viewport').evaluate(n=>n.scrollLeft);
    check(entry,after>before+20,'native Services responds to touch swipe',{before,after});
    for(let i=0;i<6;i++){
      await page.locator('.sc-services__viewport').evaluate((n,i)=>{const cards=n.querySelectorAll('.sc-service-card');n.scrollTo({left:cards[i].offsetLeft,behavior:'instant'});},i);await sleep(100);
      const r=await page.locator('.sc-service-card').nth(i).boundingBox();
      check(entry,r.x<width && r.x+r.width>0,'native service card '+(i+1)+' reachable',r);
    }
    await shot(page,dir,'06-services-native-last');
  }
  const review=(await state(page)).triggers.find(t=>t.id==='sc-testimonials-card-stream');
  entry.reviewStages=[];
  if(review){
    check(entry,Math.abs((await state(page)).reviewHeight-Math.max(height*5.33,3770))<1,'testimonials approved +30% scene height',(await state(page)).reviewHeight);
    for(const p of [0,.25,.5,.75,1]){await seek(page,review.start+(review.end-review.start)*p);await sleep(500);entry.reviewStages.push((await state(page)).reviews);await shot(page,dir,'07-reviews-'+p);}
    check(entry,entry.reviewStages.every(s=>s.cardOpacities.every(o=>o===1) && s.pins===0),'testimonials opaque, no GSAP pin');
    const last=entry.reviewStages.at(-1).positions[3];
    check(entry,last.right>0 && last.left<width/2,'fourth review remains visible at release',last);
  }else{
    const top=await page.locator('#testimonials').evaluate(n=>n.getBoundingClientRect().top+scrollY);
    await seek(page,top-50);await shot(page,dir,'07-reviews-native');
  }
  const faq=await page.locator('#faq').evaluate(n=>n.getBoundingClientRect().top+scrollY);
  await seek(page,faq-70);
  for(let i=0;i<7;i++){
    const q=page.locator('.sc-faq__question').nth(i);
    await q.click();await sleep(350);
    check(entry,await q.getAttribute('aria-expanded')==='true','FAQ opens '+(i+1));
    await q.press('Enter');await sleep(350);
    check(entry,await q.getAttribute('aria-expanded')==='false','FAQ keyboard closes '+(i+1));
  }
  await shot(page,dir,'08-faq');
  await seek(page,Number.MAX_SAFE_INTEGER);await shot(page,dir,'09-footer');
  await seek(page,0);
  if(width<=850){
    const menu=page.locator('#menuToggle');await menu.tap();
    check(entry,await menu.getAttribute('aria-expanded')==='true','mobile menu opens');
    await page.keyboard.press('Escape');
    check(entry,await menu.getAttribute('aria-expanded')==='false','mobile menu Escape closes');
  }
}
async function wheelAudit(page,entry,dir){
  await page.addScriptTag({path:path.join(root,'QA/DEVTOOLS_STICKY_TRACE.js')});
  entry.wheelBoundaries=[];
  const s=await state(page);
  const boundaries=[s.hero.pinEnd,s.works.firstEntryEnd,s.works.pinEnd,s.services.pinStart,s.services.pinEnd].filter(y=>y>0);
  await page.mouse.move(5,5);
  for(const boundary of boundaries){
    await seek(page,boundary-150);
    const traceFrom=await page.evaluate(()=>SCT_TRACE.samples.length);
    const from=await page.evaluate(()=>scrollY);
    for(let i=0;i<18;i++){await page.mouse.wheel(0,20);await sleep(20);}
    await sleep(1000);
    const forward=await state(page);
    for(let i=0;i<18;i++){await page.mouse.wheel(0,-20);await sleep(20);}
    await sleep(1000);
    const backward=await state(page);
    const slowTrace=await page.evaluate(start=>SCT_TRACE.samples.slice(start),traceFrom);
    entry.wheelBoundaries.push({boundary,from,forward:forward.y,backward:backward.y,frames:slowTrace.length,maxFrameDelta:Math.max(...slowTrace.map(t=>Math.abs(t.scrollDelta)))});
    check(entry,forward.y>boundary && Math.abs(backward.y-from)<3,'slow wheel crosses and reverses boundary '+Math.round(boundary),entry.wheelBoundaries.at(-1));
    check(entry,forward.spacers===0 && backward.spacers===0 && forward.serviceViewport.scrollLeft===0,'wheel boundary retains sticky and single horizontal owner');
    check(entry,entry.wheelBoundaries.at(-1).maxFrameDelta<60,'slow wheel frame displacement remains bounded across boundary');
  }
  await seek(page,0);
  entry.fastWheel=[];
  for(const direction of [1,-1]){
    let reached=false;
    for(let i=0;i<180;i++){
      await page.mouse.wheel(0,direction*1600);await sleep(60);
      const y=await page.evaluate(()=>({y:scrollY,max:document.documentElement.scrollHeight-innerHeight,overflow:document.documentElement.scrollWidth-innerWidth}));
      entry.fastWheel.push({direction,...y});
      if(direction===1?y.max-y.y<2:y.y<2){reached=true;break;}
    }
    await sleep(700);
    check(entry,reached,'fast wheel '+(direction===1?'reaches footer':'returns to top'));
    await shot(page,dir,direction===1?'10-wheel-bottom':'11-wheel-top-return');
  }
  check(entry,entry.fastWheel.every(s=>s.overflow<=1),'fast wheel no horizontal document overflow');
  const trace=await page.evaluate(()=>{SCT_TRACE.stop();return SCT_TRACE.samples;});
  fs.writeFileSync(path.join(dir,'sticky-trace.json'),JSON.stringify(trace,null,2)+'\n');
  check(entry,trace.length>30 && trace.every(t=>t.pinCount===0),'provided DevTools trace records zero GSAP pins',{frames:trace.length,note:'Full trace includes intentional immediate seeks between isolated scenarios. Wheel-only frame displacement is reported per boundary.'});
}
async function resizeAndReduce(page,entry,dir,width,height){
  entry.resize=[];
  for(const w of [1440,768,390,1024,width]){
    await page.setViewportSize({width:w,height});await sleep(650);
    const s=await state(page);entry.resize.push({width:w,state:s});
    const ids=s.triggers.map(t=>t.id).filter(Boolean);
    check(entry,ids.length===new Set(ids).size && s.spacers===0 && s.lenis.max<=1,'resize '+w+' no duplicate triggers/pins/Lenis');
    check(entry,s.overflow<=1,'resize '+w+' no horizontal document overflow',s.overflow);
  }
  await page.emulateMedia({reducedMotion:'reduce'});await sleep(700);
  const reduced=await state(page);entry.reduced=reduced;
  check(entry,reduced.lenis.live===0 && reduced.triggers.length===0 && reduced.spacers===0 && reduced.works.mode==='reduced-motion' && reduced.reviews.mode==='native','reduced motion removes animation ownership',reduced);
  check(entry,reduced.overflow<=1,'reduced motion no document overflow',reduced.overflow);
  await seek(page,Number.MAX_SAFE_INTEGER);await shot(page,dir,'12-reduced-footer');
  const waves=await page.locator('#roveiaWaveBg .rwb-layer svg').evaluateAll(ns=>ns.map(n=>({css:getComputedStyle(n).animationName,paused:!n.querySelector('animate')})));
  check(entry,waves.length===3 && waves.every(w=>w.css==='none' && w.paused),'reduced motion stops footer waves',waves);
  await page.emulateMedia({reducedMotion:'no-preference'});await sleep(700);await seek(page,0);
  const restored=await state(page);
  check(entry,restored.lenis.live===1 && restored.lenis.max===1 && restored.spacers===0,'motion preference restoration keeps one Lenis',restored.lenis);
}
async function compareArchive(browser,entry,dir,width,height){
  entry.reference=[];
  for(const [name,port] of [['archive',4182],['import',4181]]){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:width<=850,isMobile:width<=850});
    await instrument(context);const page=await context.newPage();await open(page,`http://127.0.0.1:${port}/`);
    const samples=[];
    for(const label of ['hero','work-first-mid','services-start']){
      const s=await state(page);
      await seek(page,label==='hero'?0:label==='work-first-mid'?(s.works.firstEntryStart+s.works.firstEntryEnd)/2:s.services.pinStart??await page.locator('#services').evaluate(n=>n.getBoundingClientRect().top+scrollY));
      const next=await state(page);
      samples.push({label,y:next.y,sticky:next.sticky,works:next.works,serviceViewport:next.serviceViewport,serviceCards:next.serviceCards,reviewHeight:next.reviewHeight,fonts:next.fonts,counts:next.counts});
      await shot(page,dir,'compare-'+name+'-'+label);
    }
    entry.reference.push({name,samples});await context.close();
  }
  check(entry,JSON.stringify(entry.reference[0].samples)===JSON.stringify(entry.reference[1].samples),'archive/import computed geometry and motion states match at three checkpoints');
}
(async()=>{
  const browser=await chromium.launch({headless:true});report.browser=browser.version();
  try{
    for(const [width,height] of sizes.filter(s=>!only || s.join('x')===only)){
      const name=width+'x'+height,dir=path.join(output,name);fs.mkdirSync(dir,{recursive:true});
      const entry={viewport:name,checks:[],errors:[],httpErrors:[],failedRequests:[]};report.cases.push(entry);
      const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:width<=850,isMobile:width<=850,...(width===1440?{recordVideo:{dir,size:{width,height}}}:{})});
      await instrument(context);const page=await context.newPage();page.setDefaultTimeout(12000);
      page.on('pageerror',e=>entry.errors.push(String(e)));
      page.on('console',m=>{if(m.type()==='error')entry.errors.push(m.text());});
      page.on('response',r=>{if(r.status()>=400)entry.httpErrors.push({url:r.url(),status:r.status()});});
      page.on('requestfailed',r=>entry.failedRequests.push({url:r.url(),failure:r.failure()}));
      try{
        await open(page,'http://127.0.0.1:4181/');
        await geometry(page,context,entry,dir,width,height);
        if(width===1440)await wheelAudit(page,entry,dir);
        await resizeAndReduce(page,entry,dir,width,height);
        if(width===1440 || width===390)await compareArchive(browser,entry,dir,width,height);
      }catch(e){entry.errors.push(e.stack);await shot(page,dir,'failure').catch(()=>{});}
      check(entry,entry.errors.length===0,'no console/runtime errors',entry.errors);
      check(entry,entry.httpErrors.length===0 && entry.failedRequests.length===0,'no HTTP errors or failed resources',{http:entry.httpErrors,requests:entry.failedRequests});
      entry.pass=entry.checks.every(c=>c.pass);
      await context.close();
      fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify(entry,null,2)+'\n');
      fs.writeFileSync(path.join(output,only?'report-'+only+'.json':'report.json'),JSON.stringify(report,null,2)+'\n');
      console.log(name+': '+(entry.pass?'PASS':'FAIL')+' '+entry.checks.filter(c=>c.pass).length+'/'+entry.checks.length+'; '+entry.errors.length+' errors');
      for(const c of entry.checks.filter(c=>!c.pass))console.log('FAIL '+c.label+' '+JSON.stringify(c.details));
    }
  }finally{await browser.close();}
  report.pass=report.cases.every(c=>c.pass);
  fs.writeFileSync(path.join(output,only?'report-'+only+'.json':'report.json'),JSON.stringify(report,null,2)+'\n');
  if(!report.pass)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
