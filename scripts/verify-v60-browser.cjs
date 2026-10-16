/* Real HTTP/browser acceptance. No application transforms or timelines are mocked.
 * Run: node scripts/verify-v60-browser.cjs [--only=1440x900] [--engine=chromium]
 * Evidence is kept outside the public runtime in output/playwright/v60/.
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const pw = require(require.resolve('playwright', {paths:[process.cwd(), process.env.USERPROFILE || '']}));
const root = path.resolve(__dirname, '..');
const url = process.env.SYNTHECORE_URL || 'http://127.0.0.1:4174/';
const engine = process.argv.find(a=>a.startsWith('--engine='))?.split('=')[1] || 'chromium';
const only = process.argv.find(a=>a.startsWith('--only='))?.split('=')[1];
const phase = process.argv.find(a=>a.startsWith('--phase='))?.split('=')[1] || 'audit';
const group = process.argv.find(a=>a.startsWith('--group='))?.split('=')[1];
const sizes = [[3840,2160],[2560,1440],[2048,1080],[1920,1080],[1440,900],[1366,768],[1024,768],[768,1024],[390,844],[320,568]];
if (!pw[engine] || (only && !sizes.some(s=>s.join('x')===only))) throw Error('Unknown engine/viewport');
const output = path.join(root,'output/playwright/v60',phase,engine);
const pause = ms=>new Promise(r=>setTimeout(r,ms));
const report = {date:new Date().toISOString(),url,engine,phase,commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),cases:[]};

async function instrument(context) {
  await context.addInitScript(()=>{
    window.__v60Lenis={live:0,max:0,created:0};
    let ctor;
    Object.defineProperty(window,'Lenis',{configurable:true,get:()=>ctor,set:value=>{
      ctor=new Proxy(value,{construct(target,args,newTarget){
        const instance=Reflect.construct(target,args,newTarget), counts=window.__v60Lenis;
        counts.live++;counts.created++;counts.max=Math.max(counts.max,counts.live);
        const destroy=instance.destroy.bind(instance);let dead=false;
        instance.destroy=(...args)=>{if(!dead){dead=true;counts.live--;}return destroy(...args);};
        return instance;
      }});
    }});
  });
}
async function open(page) {
  await page.goto(url,{waitUntil:'load'});
  await page.waitForFunction(()=>window.__synthecoreScrollQA?.getState().ready && window.__synthecoreTestimonialsQA);
  await page.evaluate(()=>document.fonts.ready);
  await pause(650);
}
async function state(page) {
  return page.evaluate(()=>({
    y:scrollY,max:document.documentElement.scrollHeight-innerHeight,
    overflow:document.documentElement.scrollWidth-innerWidth,
    zoom:{dpr:devicePixelRatio,scale:visualViewport.scale},
    lenis:window.__v60Lenis,
    hero:window.__synthecoreScrollQA.getState(),works:window.__synthecoreWorksQA.getState(),
    services:window.__synthecoreServicesQA.getState(),reviews:window.__synthecoreTestimonialsQA.getState(),
    process:window.__synthecoreProcessQA.getState(),
    pins:ScrollTrigger.getAll().filter(t=>t.vars.pin).map(t=>({id:t.vars.id,start:t.start,end:t.end,active:t.isActive})),
    spacers:document.querySelectorAll('.pin-spacer').length,
    sections:[...document.querySelectorAll('main > section')].map(n=>({id:n.id,top:Math.round(n.getBoundingClientRect().top+scrollY),height:Math.round(n.getBoundingClientRect().height)}))
  }));
}
async function go(page,target) {
  const y=await page.evaluate(t=>Math.max(0,Math.min(document.documentElement.scrollHeight-innerHeight,t)),target);
  const before=await page.evaluate(()=>scrollY);
  await page.mouse.move(5,5);
  await page.mouse.wheel(0,y-before);
  await page.waitForFunction(y=>Math.abs(scrollY-y)<3,y,{timeout:9000});
  await pause(650);
}
async function shot(page,dir,label) {
  await page.screenshot({path:path.join(dir,label+'.jpg'),type:'jpeg',quality:65,animations:'allow'});
}
function check(entry,condition,message,details) {
  entry.checks.push({message,pass:!!condition,...(details===undefined?{}:{details})});
}
async function sweep(page,dir,entry,height) {
  entry.scrollSamples=[];
  for (const direction of [1,-1]) {
    let n=0,stuck=0,previous=-1;
    while(n++<1000) {
      const sample=await state(page);
      entry.scrollSamples.push({direction,y:sample.y,max:sample.max,overflow:sample.overflow,works:sample.works.progress,services:sample.services.progress,reviews:sample.reviews.progress,pins:sample.pins.filter(t=>t.active).map(t=>t.id)});
      if(direction===1 ? sample.max-sample.y<3 : sample.y<3) break;
      if(Math.abs(sample.y-previous)<.5)stuck++;else stuck=0;
      if(stuck>50)throw Error('Scroll stuck at '+sample.y);
      previous=sample.y;
      await page.mouse.wheel(0,direction*height*.65);
      await pause(110);
    }
    await pause(900);
    await shot(page,dir,direction===1?'scroll-bottom':'scroll-top-return');
    const end=await state(page);
    check(entry,direction===1 ? end.max-end.y<3 : end.y<3,direction===1?'wheel: reached footer':'wheel: returned to top',end.y);
  }
  check(entry,entry.scrollSamples.every(s=>s.overflow<=1),'no horizontal document overflow during full down/up scroll');
}
async function sections(page,dir,entry,width,height) {
  entry.sectionResults={};
  const initial=await state(page);entry.initial=initial;
  check(entry,initial.lenis.max<=1,'one live Lenis owner at most',initial.lenis);
  check(entry,initial.zoom.dpr===1 && initial.zoom.scale===1,'100% zoom, DPR 1',initial.zoom);
  entry.sectionResults.Hero=initial.hero.ready;
  await shot(page,dir,'01-hero');
  const audience=await page.locator('#audiences').evaluate(n=>n.getBoundingClientRect().top+scrollY);
  await go(page,audience-90);
  const options=page.locator('.audience-option');
  for(let i=0;i<await options.count();i++) {
    await options.nth(i).focus();
    check(entry,await options.nth(i).getAttribute('aria-pressed')==='true','audience keyboard selection '+(i+1));
  }
  await shot(page,dir,'02-audiences');
  await page.keyboard.press('Escape');
  entry.sectionResults.Audiences=entry.checks.filter(c=>c.message.startsWith('audience')).every(c=>c.pass);
  const works=initial.works;
  const workShots=[];
  for(let i=0;i<6;i++) {
    const target=works.pinStart==null ? await page.locator('.sc-work-item').nth(i).evaluate(n=>n.getBoundingClientRect().top+scrollY) : works.pinStart+(works.pinEnd-works.pinStart)*i/5;
    await go(page,target);
    const frame=await page.locator('.sc-work-frame').nth(i).boundingBox();
    const visible=!!frame && frame.y<height && frame.y+frame.height>0 && frame.x>=-2 && frame.x+frame.width<=width+2;
    check(entry,visible,'Works card '+(i+1)+' visible at its stage',frame);
    await shot(page,dir,'03-work-'+(i+1));
    workShots.push({i,frame,state:(await state(page)).works});
  }
  entry.workStages=workShots;
  entry.sectionResults.Works=entry.checks.filter(c=>c.message.startsWith('Works')).every(c=>c.pass);
  const service=await page.evaluate(()=>({top:document.querySelector('#services').getBoundingClientRect().top+scrollY,...window.__synthecoreServicesQA.getState()}));
  for(let i=0;i<6;i++) {
    if(service.mode==='pinned-horizontal') await go(page,service.pinStart+(service.pinEnd-service.pinStart)*i/5);
    else {
      await go(page,service.top-85);
      if(i && !await page.locator('[data-services-next]').isDisabled()) {await page.locator('[data-services-next]').click();await pause(650);}
    }
    const viewport=await page.locator('.sc-services__viewport').boundingBox();
    const rect=await page.locator('.sc-service-card').nth(i).boundingBox();
    check(entry,rect && rect.x+rect.width>viewport.x && rect.x<viewport.x+viewport.width,'Services card '+(i+1)+' reachable',rect);
    if(i===0 || i===5) await shot(page,dir,'04-services-'+(i+1));
  }
  entry.sectionResults.Services=entry.checks.filter(c=>c.message.startsWith('Services')).every(c=>c.pass);
  const process=await page.locator('#process').evaluate(n=>n.getBoundingClientRect().top+scrollY);
  await go(page,process-80);
  for(let i=0;i<3;i++) {
    await page.locator('.sc-process__marker').nth(i).click();
    check(entry,await page.locator('.sc-process__marker').nth(i).getAttribute('aria-pressed')==='true','Process step '+(i+1));
  }
  await shot(page,dir,'05-process');
  entry.sectionResults.Process=entry.checks.filter(c=>c.message.startsWith('Process')).every(c=>c.pass);
  const review=await page.evaluate(()=>{const t=ScrollTrigger.getById('sc-testimonials-card-stream');return{top:document.querySelector('#testimonials').getBoundingClientRect().top+scrollY,start:t?.start,end:t?.end};});
  entry.reviewStages=[];
  if(review.start!=null) {
    for(const progress of [0,.2,.4,.6,.8,1]) {
      await go(page,review.start+(review.end-review.start)*progress);await pause(900);
      entry.reviewStages.push(await page.evaluate(()=>window.__synthecoreTestimonialsQA.getState()));
      await shot(page,dir,'06-reviews-'+Math.round(progress*100));
    }
    const last=entry.reviewStages.at(-1);
    check(entry,last.positions[3].right>0 && last.positions[3].left<width/2,'Reviews fourth card still visible on release',last.positions);
    check(entry,entry.reviewStages.every(s=>s.pins===0 && s.cardOpacities.every(o=>o===1)),'Reviews v58: opaque cards, no second GSAP pin');
  } else {
    await go(page,review.top-70);
    const rail=page.locator('.sc-testimonials__cards');
    for(let i=0;i<4;i++) {
      await rail.evaluate((n,i)=>{n.scrollLeft=i*(n.firstElementChild.offsetWidth+16);},i);await pause(150);
      const r=await page.locator('.sc-testimonials__card-slot').nth(i).boundingBox();
      check(entry,r && r.x<width && r.x+r.width>0,'Reviews native card '+(i+1)+' reachable',r);
    }
    await shot(page,dir,'06-reviews-native');
  }
  check(entry,await page.locator('#testimonials[data-demo="true"] .sc-testimonial__demo').count()===4,'Reviews demo labeling preserved');
  entry.sectionResults.Reviews=entry.checks.filter(c=>c.message.startsWith('Reviews')).every(c=>c.pass);
  const faq=await page.locator('#faq').evaluate(n=>n.getBoundingClientRect().top+scrollY);
  await go(page,faq-100);
  const questions=page.locator('.sc-faq__question');
  for(let i=0;i<7;i++) {
    await questions.nth(i).click();await pause(550);
    check(entry,await questions.nth(i).getAttribute('aria-expanded')==='true','FAQ opens '+(i+1));
    check(entry,await page.locator('.sc-faq__item.is-open').count()===1,'FAQ single expanded item '+(i+1));
    await questions.nth(i).press('Enter');await pause(550);
    check(entry,await questions.nth(i).getAttribute('aria-expanded')==='false','FAQ keyboard closes '+(i+1));
  }
  await shot(page,dir,'07-faq');
  entry.sectionResults.FAQ=entry.checks.filter(c=>c.message.startsWith('FAQ')).every(c=>c.pass);
  await go(page,Number.MAX_SAFE_INTEGER);
  const waveState=()=>page.evaluate(()=>[...document.querySelectorAll('.sc-footer__wave svg')].map(n=>({transform:getComputedStyle(n).transform,d:n.querySelector('path').getAttribute('d'),time:n.getCurrentTime(),paused:n.animationsPaused()})));
  const before=await waveState();const scrollBefore=await page.evaluate(()=>scrollY);await pause(1200);const after=await waveState();
  check(entry,before.length===3 && before.every((s,i)=>s.transform!==after[i].transform),'Footer: all three waves animate while scroll is stopped',{before,after});
  check(entry,Math.abs(await page.evaluate(()=>scrollY)-scrollBefore)<1,'Footer wave animation does not move scroll');
  check(entry,await page.locator('#contact a[href^="mailto:"]').count()>=1,'Footer CTA has contact email');
  await shot(page,dir,'08-footer');
  entry.sectionResults.Footer=entry.checks.filter(c=>c.message.startsWith('Footer')).every(c=>c.pass);
}
async function extras(page,dir,entry,width,height,context) {
  // Responsive rebuild must not leave duplicate pin spacers or Lenis owners.
  await page.setViewportSize({width:height,height:width});await pause(900);
  await page.setViewportSize({width,height});await pause(1000);
  await go(page,0);
  const resized=await state(page);entry.afterOrientation=resized;
  check(entry,resized.lenis.max<=1,'resize/orientation: no duplicate Lenis');
  check(entry,resized.spacers===resized.pins.length,'resize/orientation: one spacer per active pin owner',resized.pins);
  check(entry,resized.overflow<=1,'resize/orientation: no overflow');
  await page.reload({waitUntil:'load'});await page.waitForFunction(()=>window.__synthecoreScrollQA?.getState().ready);await pause(700);
  check(entry,(await state(page)).overflow<=1,'reload: no overflow');
  if(width<=850) {
    const toggle=page.locator('#menuToggle');await toggle.tap();
    check(entry,await toggle.getAttribute('aria-expanded')==='true','mobile touch menu opens');
    await page.keyboard.press('Escape');
    check(entry,await toggle.getAttribute('aria-expanded')==='false','mobile Escape closes menu');
    await toggle.tap();await page.locator('#mobilePanel a[href="#services"]').tap();await pause(1800);
    check(entry,await toggle.getAttribute('aria-expanded')==='false' && new URL(page.url()).hash==='#services','mobile menu anchor closes and navigates');
  } else {
    for(const hash of ['works','services','contact']) {
      await page.locator('.header-links a[href="#'+hash+'"]').click();await pause(1800);
      const r=await page.locator('#'+hash).evaluate(n=>{const r=n.getBoundingClientRect(),top=r.top+scrollY,margin=parseFloat(getComputedStyle(n).scrollMarginTop)||0,max=document.documentElement.scrollHeight-innerHeight;return{top:r.top,expectedTop:top-Math.min(max,Math.max(0,top-margin)),scroll:scrollY,max};});
      check(entry,new URL(page.url()).hash==='#'+hash && Math.abs(r.top-r.expectedTop)<4,'header anchor #'+hash,r);
    }
  }
  if(width>=1200) {
    await go(page,0);
    for(const selector of ['#floatingHeader > .nav-cta','.main-cta','#contact .sc-footer__cta']) {
      const node=page.locator(selector);
      if(!await node.count())continue;
      await node.scrollIntoViewIfNeeded();await pause(700);
      await page.mouse.move(2,2);await pause(450);
      const before=await node.evaluate(n=>{const r=n.getBoundingClientRect(),a=n.querySelector('.arrow').getBoundingClientRect();return{y:r.y,cy:a.y+a.height/2,color:getComputedStyle(n).backgroundColor};});
      await node.hover();await pause(500);
      const after=await node.evaluate(n=>{const r=n.getBoundingClientRect(),a=n.querySelector('.arrow').getBoundingClientRect();return{y:r.y,cy:a.y+a.height/2,color:getComputedStyle(n).backgroundColor,transform:getComputedStyle(n.querySelector('.arrow')).transform};});
      check(entry,Math.abs(before.y-after.y)<1 && Math.abs(before.cy-after.cy)<1,'CTA no vertical shift: '+selector,{before,after});
      check(entry,after.color===(selector.includes('floatingHeader')?'rgb(228, 77, 31)':'rgb(252, 112, 69)'),'CTA hover color: '+selector,{before,after});
    }
  }
  await page.emulateMedia({reducedMotion:'reduce'});await pause(850);
  const reduced=await state(page);entry.reduced=reduced;
  check(entry,reduced.lenis.live===0 && reduced.pins.length===0 && reduced.works.mode==='reduced-motion' && reduced.reviews.mode==='native','reduced motion disables smooth owner and all pins',reduced.pins);
  const waves=await page.locator('.sc-footer__wave svg').evaluateAll(ns=>ns.map(n=>({css:getComputedStyle(n).animationName,paused:n.animationsPaused()})));
  check(entry,waves.every(w=>w.css==='none' && w.paused),'reduced motion stops CSS and SVG waves',waves);
  check(entry,reduced.overflow<=1,'reduced motion: no overflow');
  await page.emulateMedia({reducedMotion:'no-preference'});await pause(850);
}
(async()=>{
  await fs.mkdir(output,{recursive:true});
  const browser=await pw[engine].launch({headless:true});report.browser=browser.version();
  try {
    for(const [width,height] of sizes.filter(s=>(!only||s.join('x')===only) && (!group || (group==='large'?s[0]>1920:s[0]<=1920)))) {
      const name=width+'x'+height,dir=path.join(output,name);await fs.mkdir(dir,{recursive:true});
      const mobile=width<=850;
      const options={viewport:{width,height},deviceScaleFactor:1,hasTouch:mobile,...(engine!=='firefox'?{isMobile:mobile}:{})};
      if(engine==='chromium' && [3840,2560,1920,1440].includes(width)) options.recordVideo={dir,size:{width:Math.min(width,1920),height:Math.round(height*Math.min(width,1920)/width)}};
      const context=await browser.newContext(options);await instrument(context);
      const page=await context.newPage();page.setDefaultTimeout(10000);
      const entry={viewport:name,checks:[],errors:[],httpErrors:[]};report.cases.push(entry);
      page.on('pageerror',e=>entry.errors.push(String(e)));
      page.on('console',m=>{if(m.type()==='error')entry.errors.push(m.text());});
      page.on('response',r=>{if(r.status()>=400)entry.httpErrors.push({url:r.url(),status:r.status()});});
      try {
        await open(page);await sweep(page,dir,entry,height);
        await sections(page,dir,entry,width,height);await extras(page,dir,entry,width,height,context);
      } catch(e) {entry.errors.push(e.stack);await shot(page,dir,'failure').catch(()=>{});}
      check(entry,entry.errors.length===0,'no JS errors or aborted acceptance steps',entry.errors);
      check(entry,entry.httpErrors.length===0,'no HTTP 404/errors',entry.httpErrors);
      entry.pass=entry.checks.every(c=>c.pass);
      await fs.writeFile(path.join(dir,'results.json'),JSON.stringify(entry,null,2));
      await context.close();
      console.log(name+': '+(entry.pass?'PASS':'FAIL')+' '+entry.checks.filter(c=>c.pass).length+'/'+entry.checks.length+'; '+entry.errors.length+' errors');
      await fs.writeFile(path.join(output,'report'+(only?'-'+only:group?'-'+group:'')+'.json'),JSON.stringify(report,null,2));
    }
  } finally {await browser.close();}
  report.pass=report.cases.every(c=>c.pass);
  await fs.writeFile(path.join(output,'report'+(only?'-'+only:group?'-'+group:'')+'.json'),JSON.stringify(report,null,2));
  if(!report.pass)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
