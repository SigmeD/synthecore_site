'use strict';
// Geometry is measured through the existing scroll owner; no runtime positions are patched.
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {execFileSync} = require('node:child_process');
const {chromium} = require(require.resolve('playwright', {paths:[process.cwd(), process.env.USERPROFILE || '']}));
const base = process.env.SYNTHECORE_URL || 'http://127.0.0.1:4176/';
const baseline = '91235aa239d49effb90bde72409d6f6f5db49e7b';
const dir = path.resolve('output/playwright/works-v34');
fs.mkdirSync(dir, {recursive:true});
const report = {date:new Date().toISOString(),base,baseline,checks:[],errors:[],viewports:[],resize:[],fallback:[],regression:[],limitations:['Chromium automation does not establish physical mouse/touchpad smoothness or real-device performance.','Reserved classic scrollbars are exercised with a local browser-only 15px scrollbar stylesheet.','Footer wave paths are compared by their owning SVG viewport: the unchanged RAF wave shape has a different phase between pages.','Baseline regression snapshots synchronize CSS animation time only: finite entrances finish and infinite floats pause at 1000ms. Actual Works scroll tests do not alter animations.','Without JavaScript, compact intrinsic Hero height cannot be measured into the Works variable; these extra compact fallback cases require readable ordinary flow rather than an exact intrinsic height match.']};
const pause = ms => new Promise(resolve => setTimeout(resolve,ms));
const check = (name,pass,data) => {report.checks.push({name,pass:!!pass,...(data === undefined ? {} : {data})});if(!pass) console.log('FAIL '+name+' '+JSON.stringify(data));};
const round = n => Math.round(n*1000)/1000;
async function load(page,url=base) {await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await pause(1100);}
async function scroll(page,y) {await page.evaluate(y => window.SyntheCoreMotion ? window.SyntheCoreMotion.scrollTo(y,{immediate:true}) : window.scrollTo({top:y,behavior:'instant'}),y);await pause(220);}
async function state(page) {return page.evaluate(()=>window.__synthecoreWorksQA.getState());}
function watch(page,label) {page.on('pageerror',e=>report.errors.push({label,message:e.message}));page.on('console',m=>{if(m.type()==='error') report.errors.push({label,message:m.text()});});page.on('response',r=>{if(r.status()>=400)report.errors.push({label,url:r.url(),status:r.status()});});}
async function measure(page,index) {return page.evaluate(index=>{
 const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
 const hero=document.querySelector('#imageScrollSticky > .hero'),item=document.querySelectorAll('.sc-work-item')[index],frame=item.querySelector('.sc-work-frame'),caption=item.querySelector('.sc-work-content'),image=item.querySelector('img'),hr=rect(hero),fr=rect(frame),cr=rect(caption),body=rect(document.body),fc=getComputedStyle(frame),cc=getComputedStyle(caption);
 // Tight line-height can legitimately make H2.scrollHeight exceed clientHeight.
 // Check rendered text ranges against the clipping panel instead of the line box.
 const text=[...caption.children].map(e=>{const range=document.createRange();range.selectNodeContents(e);const r=range.getBoundingClientRect();return {rect:{x:r.x,y:r.y,right:r.right,bottom:r.bottom},font:parseFloat(getComputedStyle(e).fontSize)};});
 return {id:item.dataset.workId,scrollY,viewport:{width:innerWidth,height:innerHeight,clientWidth:document.documentElement.clientWidth,bodyWidth:body.width},hero:{...hr,radius:parseFloat(getComputedStyle(hero).borderTopLeftRadius),left:hr.x-body.x,right:body.right-hr.right},frame:{...fr,radius:parseFloat(fc.borderTopLeftRadius),left:fr.x-body.x,right:body.right-fr.right,scale:window.gsap?Number(gsap.getProperty(frame,'scale')):1},caption:{...cr,font:cc.fontSize,glassY:cc.getPropertyValue('--glass-y').trim(),glassGlint:cc.getPropertyValue('--glass-glint').trim(),inside:cr.x>=fr.x-1&&cr.right<=fr.right+1&&cr.y>=fr.y-1&&cr.bottom<=fr.bottom+1,textInside:text.every(t=>t.rect.x>=cr.x-1&&t.rect.right<=cr.right+1&&t.rect.y>=cr.y-1&&t.rect.bottom<=cr.bottom+1),minFont:Math.min(...text.map(t=>t.font))},media:{loaded:image.complete&&image.naturalWidth>0,fit:getComputedStyle(image).objectFit,position:getComputedStyle(image).objectPosition,src:image.currentSrc.startsWith('data:')?image.currentSrc.slice(0,image.currentSrc.indexOf(',')+1)+'[embedded '+image.currentSrc.length+' chars]':image.currentSrc},overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
 },index);}
function geometry(label,m,compare=true) {
 const delta={width:round(m.frame.width-m.hero.width),height:round(m.frame.height-m.hero.height),left:round(m.frame.left-m.hero.left),right:round(m.frame.right-m.hero.right),radius:round(m.frame.radius-m.hero.radius),symmetry:round(m.frame.left-m.frame.right)};
 if(compare)check(label+' Hero geometry',Object.values(delta).every(v=>Math.abs(v)<=1),delta);
 check(label+' HTML caption/media',m.caption.inside&&m.caption.textInside&&m.caption.minFont>=12&&m.media.loaded&&m.media.fit==='cover'&&m.overflow<=1,{caption:m.caption,media:m.media,overflow:m.overflow});
 return delta;
}
async function cards(page,label,shots=false) {
 const initial=await state(page),measurements=[];
 check(label+' one six-card timeline',initial.mode==='single-pinned-timeline'&&initial.itemCount===6&&initial.timelineDuration===5,initial);
 for(let i=0;i<6;i++) {
  const s=await state(page),target=s.pinStart+(s.pinEnd-s.pinStart)*i/5;
  await scroll(page,target);await page.locator('.sc-work-item').nth(i).locator('img').evaluate(img=>img.decode().catch(()=>{}));
  const m=await measure(page,i);m.delta=geometry(label+' '+m.id,m);measurements.push(m);
  check(label+' '+m.id+' fully expanded',Math.abs(m.frame.y)<=1&&Math.abs(m.frame.scale-1)<=.001,{top:m.frame.y,scale:m.frame.scale});
  if(shots&&i===1)await page.screenshot({path:path.join(dir,'works-'+label+'.png')});
 }
 check(label+' canonical order',measurements.map(m=>m.id).join(',')==='b2b,flowers,crm,beauty,prostor,metal');
 const s=await state(page),mid=s.pinStart+(s.pinEnd-s.pinStart)*1.5/5;
 await scroll(page,mid);const forward=await measure(page,2);
 await scroll(page,s.pinEnd);await scroll(page,mid);const reverse=await measure(page,2);
 const expectedScale=page.viewportSize().width<=480?.95:.9425;
 check(label+' forward/reverse midpoint scale and glass',Math.abs(forward.frame.scale-expectedScale)<.002&&Math.abs(reverse.frame.scale-forward.frame.scale)<.001&&Math.abs(forward.frame.y-page.viewportSize().height/2)<1&&forward.caption.glassY===reverse.caption.glassY&&forward.caption.glassGlint===reverse.caption.glassGlint,{forward:{scale:forward.frame.scale,top:forward.frame.y,glassY:forward.caption.glassY,glassGlint:forward.caption.glassGlint},reverse:{scale:reverse.frame.scale,top:reverse.frame.y,glassY:reverse.caption.glassY,glassGlint:reverse.caption.glassGlint}});
 const hold=0;
 await scroll(page,s.pinEnd+hold);const held=await measure(page,5);
 await scroll(page,s.pinEnd+hold+80);const released=await measure(page,5);
 check(label+' last card 0svh hold then natural release',Math.abs(held.frame.y)<=1&&Math.abs(released.frame.y+80)<=1,{pinEnd:s.pinEnd,holdDistance:hold,heldTop:held.frame.y,releasedTop:released.frame.y});
 return {label,initial,measurements,midpoint:{forward:{scale:forward.frame.scale,top:forward.frame.y,glassY:forward.caption.glassY,glassGlint:forward.caption.glassGlint},reverse:{scale:reverse.frame.scale,top:reverse.frame.y,glassY:reverse.caption.glassY,glassGlint:reverse.caption.glassGlint}},hold:{heldTop:held.frame.y,releasedTop:released.frame.y}};
}
async function sectionSnapshot(page,selector) {return page.locator(selector).evaluate(root=>{
 const rr=root.getBoundingClientRect(),properties=['font-family','font-size','font-weight','line-height','letter-spacing','color','background-color','border-radius','box-shadow','display','overflow','padding-top','padding-right','padding-bottom','padding-left'];
 return [root,...root.querySelectorAll('*')].map(e=>{const box=e.tagName.toLowerCase()==='path'&&e.closest('#roveiaWaveBg')?e.ownerSVGElement:e;const r=box.getBoundingClientRect(),c=getComputedStyle(e);return {tag:e.tagName,class:e.getAttribute('class')||'',text:e.children.length?'':e.textContent.trim(),rect:[r.x,r.y-rr.y,r.width,r.height],styles:properties.map(p=>c.getPropertyValue(p))};});
 });}
function compareSnapshots(a,b) {let max=0,styleDifferences=0,contentDifferences=0;if(a.length!==b.length)return {pass:false,lengths:[a.length,b.length]};for(let i=0;i<a.length;i++){a[i].rect.forEach((v,j)=>max=Math.max(max,Math.abs(v-b[i].rect[j])));if(JSON.stringify(a[i].styles)!==JSON.stringify(b[i].styles))styleDifferences++;if(a[i].text!==b[i].text||a[i].tag!==b[i].tag||a[i].class!==b[i].class)contentDifferences++;}return {pass:max<=1&&styleDifferences===0&&contentDifferences===0,elements:a.length,maxGeometryDelta:round(max),styleDifferences,contentDifferences};}
(async()=>{
 const browser=await chromium.launch({headless:true});let complete=false;
 try {
  for(const [width,height] of [[1920,1080],[1440,900],[1280,800],[390,844]]) {
   const ctx=await browser.newContext({viewport:{width,height}}),page=await ctx.newPage(),label=width+'x'+height;watch(page,label);await load(page);
   if([1440,390].includes(width)){await scroll(page,0);await page.screenshot({path:path.join(dir,'hero-'+label+'.png')});}
   report.viewports.push(await cards(page,label,[1440,390].includes(width)));await ctx.close();
  }
  // A single live page crosses width branches and short-height DevTools geometry.
  const resizeCtx=await browser.newContext({viewport:{width:1440,height:900}}),resizePage=await resizeCtx.newPage();watch(resizePage,'resize');await load(resizePage);
  for(const [width,height] of [[1280,740],[1440,680],[390,844],[390,600],[320,568],[844,390],[1024,790],[1440,900]]) {
   let s=await state(resizePage);await scroll(resizePage,s.pinStart+(s.pinEnd-s.pinStart)*.5);
   await resizePage.setViewportSize({width,height});await pause(1100);s=await state(resizePage);
   check('resize '+width+'x'+height+' refreshed scroll range',Math.abs(s.pinEnd-s.pinStart-Math.round(5*height*.92))<=1,s);
   const positions=await resizePage.evaluate(()=>{const s=window.__synthecoreWorksQA.getState(),time=s.progress*5,stackTop=document.querySelector('.sc-works-stack').getBoundingClientRect().top;return [...document.querySelectorAll('.sc-work-item')].map((item,i)=>{const progress=i===0?1:Math.max(0,Math.min(1,time-(i-1)));return {id:item.dataset.workId,actual:item.getBoundingClientRect().top-stackTop,expected:innerHeight*(1-progress),time};});});
   check('resize '+width+'x'+height+' timeline positions',positions.every(p=>Math.abs(p.actual-p.expected)<=1),positions);
   await scroll(resizePage,s.pinStart+(s.pinEnd-s.pinStart)*2/5);const m=await measure(resizePage,2);geometry('resize '+width+'x'+height,m);check('resize '+width+'x'+height+' no stale translate',Math.abs(m.frame.y)<=1&&Math.abs(m.frame.scale-1)<.001,{top:m.frame.y,scale:m.frame.scale});report.resize.push({viewport:{width,height},state:s,measurement:m});
   await scroll(resizePage,s.pinStart);
   const reverse=await resizePage.evaluate(()=>({progress:__synthecoreWorksQA.getState().progress,y:[...document.querySelectorAll('.sc-work-item')].slice(1).map(e=>Number(gsap.getProperty(e,'y')))}));
   check('resize '+width+'x'+height+' reverse to first drops cached startAt',reverse.progress<.0001&&reverse.y.every(y=>Math.abs(y-height)<=1),reverse);
  }
  await resizeCtx.close();
  for(const [width,beforeHeight,height] of [[1440,680,900],[390,600,844]]) {
   const ctx=await browser.newContext({viewport:{width,height:beforeHeight}}),page=await ctx.newPage();watch(page,'pending-resize-'+width);await load(page);let s=await state(page);await scroll(page,s.pinStart);await page.setViewportSize({width,height});await pause(1100);s=await state(page);await scroll(page,s.pinStart);
   const pending=await page.evaluate(()=>({state:window.__synthecoreWorksQA.getState(),y:[...document.querySelectorAll('.sc-work-item')].slice(1).map(e=>Number(gsap.getProperty(e,'y')))}));
   check('height increase '+width+' '+beforeHeight+' to '+height+' pending cards use new viewport',pending.state.progress<.0001&&pending.y.every(y=>Math.abs(y-height)<=1),pending);await ctx.close();
  }
  const classicBrowser=await chromium.launch({headless:true,ignoreDefaultArgs:['--hide-scrollbars']});
  for(const [width,height] of [[1440,900],[390,844]]) {
   const ctx=await classicBrowser.newContext({viewport:{width,height}});await ctx.addInitScript(()=>document.addEventListener('DOMContentLoaded',()=>{const style=document.createElement('style');style.textContent='html{overflow-y:scroll!important;scrollbar-width:auto!important}::-webkit-scrollbar{display:block!important;width:15px!important}';document.head.append(style);}));const page=await ctx.newPage();watch(page,'classic-scrollbar-'+width);await load(page);
   const result=await cards(page,'classic-'+width+'x'+height);check('classic '+width+' reserves 15px',result.measurements[0].viewport.width-result.measurements[0].viewport.clientWidth===15,result.measurements[0].viewport);report.viewports.push(result);await ctx.close();
  }
  for(const [width,height] of [[1440,900],[390,844],[390,600],[320,568],[844,390]])for(const mode of ['reduced-motion','no-gsap','no-js']) {
   const ctx=await browser.newContext({viewport:{width,height},reducedMotion:mode==='reduced-motion'?'reduce':'no-preference',javaScriptEnabled:mode!=='no-js'});
   if(mode==='no-gsap')await ctx.route(/(?:gsap|ScrollTrigger)[^/]*\.js(?:\?.*)?$/i,route=>route.fulfill({status:200,contentType:'application/javascript',body:'/* intentional QA dependency absence */'}));
   const page=await ctx.newPage();watch(page,mode+'-'+width);await load(page);const list=[];
   const dependency=await page.evaluate(()=>({hasGSAP:!!window.gsap,mode:window.__synthecoreWorksQA?.getState().mode||'no-js'}));
   check(mode+' '+width+'x'+height+' dependency branch',mode==='no-js'?dependency.mode==='no-js':mode==='no-gsap'?!dependency.hasGSAP&&dependency.mode==='fallback':dependency.mode==='reduced-motion',dependency);
   for(let i=0;i<6;i++){await page.locator('.sc-work-item').nth(i).scrollIntoViewIfNeeded();await pause(150);const m=await measure(page,i);geometry(mode+' '+width+'x'+height+' '+m.id,m,mode!=='no-js'||(width===1440&&height===900)||(width===390&&height===844));list.push(m);}
   const flow=await page.evaluate(()=>{const frames=[...document.querySelectorAll('.sc-work-frame')];return {timeline:document.querySelector('#works').classList.contains('sc-works--timeline'),positions:frames.map(e=>{const r=e.getBoundingClientRect();return {top:r.top+scrollY,bottom:r.bottom+scrollY,transform:getComputedStyle(e).transform};})};});
   check(mode+' '+width+' ordinary visible flow',!flow.timeline&&flow.positions.every((r,i)=>!i||r.top>=flow.positions[i-1].bottom-1),flow);report.fallback.push({mode,width,height,flow,measurements:list});await ctx.close();
  }
  await classicBrowser.close();
  // Baseline differs only by its accepted pre-change generated CSS. Each section
  // is compared at the same relative scene position and in local coordinates,
  // allowing Works' intentional downstream offset. Exercise both motion modes.
  const css=execFileSync('git',['show',baseline+':css/generated/home.css'],{maxBuffer:8*1024*1024});
  for(const motion of ['reduce','no-preference'])for(const [width,height] of [[1440,900],[390,844]]) {
   const contextOptions={viewport:{width,height},reducedMotion:motion},oldCtx=await browser.newContext(contextOptions),newCtx=await browser.newContext(contextOptions);
   await oldCtx.route('**/css/generated/home.css',route=>route.fulfill({status:200,contentType:'text/css',body:css}));const oldPage=await oldCtx.newPage(),newPage=await newCtx.newPage();watch(oldPage,'baseline-'+width);watch(newPage,'regression-'+width);await Promise.all([load(oldPage),load(newPage)]);
   for(const selector of ['#imageScrollSticky > .hero','#floatingHeader','#audiences','#services','#process','#testimonials','#faq','#contact']) {
    await Promise.all([oldPage,newPage].map(async p=>{const y=await p.locator(selector).evaluate(e=>e.getBoundingClientRect().top+scrollY);await scroll(p,selector==='#floatingHeader'||selector==='#imageScrollSticky > .hero'?0:Math.max(0,y-100));}));
    await pause(motion==='no-preference'?1500:250);
    if(motion==='no-preference')await Promise.all([oldPage,newPage].map(p=>p.evaluate(()=>{for(const animation of document.getAnimations()){const end=animation.effect?.getComputedTiming().endTime;animation.pause();animation.currentTime=Number.isFinite(end)?end:1000;}})));
    const comparison=compareSnapshots(await sectionSnapshot(oldPage,selector),await sectionSnapshot(newPage,selector));check(width+' '+motion+' baseline unchanged '+selector,comparison.pass,comparison);report.regression.push({width,height,motion,selector,...comparison});
   }
   await oldCtx.close();await newCtx.close();
  }
  const artifact=path.resolve('output/works-v34/SyntheCore_Works_v34.html');
  check('v34 standalone exists',fs.existsSync(artifact),{path:artifact});
  if(fs.existsSync(artifact))for(const [width,height] of [[1440,900],[390,844]]) {
   const ctx=await browser.newContext({viewport:{width,height}}),page=await ctx.newPage();watch(page,'standalone-'+width);await load(page,pathToFileURL(artifact).href);
   const localURL=page.url();await page.locator('a.scroll-next[href="#audiences"]').click();await pause(500);check('standalone '+width+' local audiences anchor stays in artifact',page.url().startsWith(localURL.split('#')[0])&&page.url().endsWith('#audiences')&&new URL(page.url()).protocol==='file:'&&(await page.locator('meta[name="sc-review-version"]').getAttribute('content'))==='works-v34',{url:page.url(),reviewVersion:await page.locator('meta[name="sc-review-version"]').getAttribute('content')});
   const result=await cards(page,'standalone-'+width+'x'+height);report.standalone ||= [];report.standalone.push(result);await ctx.close();
  }
  complete=true;
 } finally {
  await browser.close();check('all browser scenarios completed',complete);check('no browser JavaScript/console/HTTP errors',report.errors.length===0,report.errors);report.pass=report.checks.every(c=>c.pass);fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(report.checks.filter(c=>c.pass).length+'/'+report.checks.length+' passed; report '+path.join(dir,'report.json'));if(!report.pass)process.exitCode=1;
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
