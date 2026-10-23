'use strict';
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(require.resolve('playwright',{paths:[process.cwd(),process.env.USERPROFILE||'']}));
const base=process.env.SYNTHECORE_URL||'http://127.0.0.1:4176/';
const reference=process.env.METAL_REFERENCE_URL||'http://127.0.0.1:4186/';
const baseline=process.env.METAL_BASELINE_URL||'http://127.0.0.1:4187/';
const dir=path.resolve('output/playwright/metal-v5');fs.mkdirSync(dir,{recursive:true});
const report={date:new Date().toISOString(),base,reference,baseline,checks:[],errors:[],measurements:[],referenceDifferences:['Shared title/summary and related cards use current catalog copy.','The reference hides the focus image with reduced motion; the integrated variant keeps it visible without animation.'],limitations:['Automated scrolling does not prove physical-device smoothness.','Firefox/WebKit and real mobile hardware are not tested.']};
const check=(name,pass,data)=>{report.checks.push({name,pass:!!pass,...(data===undefined?{}:{data})});if(!pass)console.log('FAIL '+name+' '+JSON.stringify(data))};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function goto(page,url){await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await pause(1250)}
async function scroll(page,y){await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);await pause(400)}
async function top(page,selector){return page.locator(selector).evaluate(e=>e.getBoundingClientRect().top+scrollY)}
async function shot(page,name,selector){if(selector)await scroll(page,Math.max(0,(await top(page,selector))-110));await pause(1100);await page.screenshot({path:path.join(dir,name+'.png')})}
async function metrics(page,selectors){return page.evaluate(selectors=>Object.fromEntries(selectors.map(selector=>{const e=document.querySelector(selector),r=e.getBoundingClientRect(),c=getComputedStyle(e);return[selector,{width:r.width,height:r.height,font:c.fontSize,fontFamily:c.fontFamily,lineHeight:c.lineHeight,color:c.color,position:c.position,top:c.top,fit:c.objectFit,radius:c.borderRadius}]})),selectors)}
function watch(page,label){page.on('pageerror',e=>report.errors.push({label,type:'JavaScript',message:e.message}));page.on('console',e=>{if(e.type()==='error')report.errors.push({label,type:'console',message:e.text()})});page.on('response',r=>{if(r.status()>=400)report.errors.push({label,type:'HTTP',url:r.url(),status:r.status()})});page.on('requestfailed',r=>report.errors.push({label,type:'network',url:r.url(),error:r.failure()?.errorText}))}
async function instrument(ctx){await ctx.addInitScript(()=>{window.__caseLenis={live:0,max:0};let ctor;Object.defineProperty(window,'Lenis',{configurable:true,get:()=>ctor,set:value=>{ctor=new Proxy(value,{construct(target,args,newTarget){const instance=Reflect.construct(target,args,newTarget);window.__caseLenis.live++;window.__caseLenis.max=Math.max(window.__caseLenis.max,window.__caseLenis.live);let dead=false;const destroy=instance.destroy.bind(instance);instance.destroy=(...a)=>{if(!dead){dead=true;window.__caseLenis.live--}return destroy(...a)};return instance}})}})})}
(async()=>{
 const browser=await chromium.launch({headless:true});let completed=false;
 try{
  for(const width of [390,768,1440,1920]){
   const height=width>=1440?900:844,label=String(width);
   const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});await instrument(ctx);
   const page=await ctx.newPage();watch(page,label);
   await goto(page,new URL('/raboty/metal-calc/',base).href);
   check(label+' no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   check(label+' five process steps',await page.locator('.sc-case-process__step').count()===5);
   check(label+' four interfaces',await page.locator('.sc-case-screens__open').count()===4);
   check(label+' result metric',await page.locator('.metal-result-banner__value').textContent()==='−50%');
   check(label+' one centered complete hero',await page.evaluate(()=>{
    const media=document.querySelector('.case-hero__media'),images=media.querySelectorAll('img');if(images.length!==1)return false;
    const img=images[0],r=img.getBoundingClientRect(),m=media.getBoundingClientRect();
    return img.complete&&img.naturalWidth>0&&getComputedStyle(img).objectFit==='contain'&&r.left>=m.left&&r.right<=m.right&&r.top>=m.top&&r.bottom<=m.bottom&&Math.abs(r.left+r.width/2-(m.left+m.width/2))<1;
   }));
   check(label+' reduced hero visible without animation',await page.locator('.case-hero__figure').evaluate(e=>getComputedStyle(e).opacity==='1'&&getComputedStyle(e).animationName==='none'));
   check(label+' reduced native owner',await page.evaluate(()=>window.__caseLenis.live===0&&window.__synthecoreWorksScrollQA.getState().engine==='native'));
   check(label+' reduced parallax disabled',await page.evaluate(()=>ScrollTrigger.getAll().length===0));
   check(label+' sticky responsive',await page.locator('.sc-case-process__cta').evaluate((e,width)=>getComputedStyle(e).position===(width>=1100?'sticky':'relative'),width));
   check(label+' CSS isolated to metal',await page.evaluate(()=>{
    const sheet=[...document.styleSheets].find(s=>s.href?.endsWith('/css/case-metal.css'));
    const valid=rules=>[...rules].every(rule=>rule.selectorText?rule.selectorText.split(/,(?![^()]*\))/).every(s=>s.trim().startsWith('body.sc-case-metal')):rule.cssRules?valid(rule.cssRules):false);
    return !!sheet&&valid(sheet.cssRules);
   }));
   const resources=await page.evaluate(()=>[...new Set([...document.querySelectorAll('img[src],script[src],link[rel="stylesheet"],button[data-full]')].map(e=>e.getAttribute('src')||e.getAttribute('href')||e.getAttribute('data-full')).filter(Boolean))]);
   for(const resource of resources){const response=await page.request.get(new URL(resource,page.url()).href);check(label+' resource '+resource,response.status()===200)}
   for(let i=0;i<4;i++){
    const opener=page.locator('.sc-case-screens__open').nth(i);await opener.click();
    await page.waitForFunction(()=>document.querySelector('#caseLightbox img').naturalWidth>0);
    check(label+' lightbox '+i+' opens',await page.locator('#caseLightbox').evaluate(e=>e.open));
    await page.keyboard.press('Tab');check(label+' lightbox '+i+' traps focus',await page.evaluate(()=>document.querySelector('#caseLightbox').contains(document.activeElement)));
    if(i%2===0)await page.keyboard.press('Escape');else await page.locator('.sc-case-lightbox__close').click();
    await page.waitForFunction(()=>!document.documentElement.classList.contains('sc-dialog-open'));
    check(label+' lightbox '+i+' closes/restores',await opener.evaluate(e=>document.activeElement===e&&!document.querySelector('#caseLightbox').open));
   }
   const related=page.locator('.related-work__track > .case-card:not([data-carousel-clone])');
   check(label+' five other projects',await related.count()===5);
   check(label+' current metal excluded',await related.locator('[data-project="metal"]').count()===0);
   check(label+' related Beauty has existing route',await related.locator('[data-project="beauty"]').getAttribute('href')==='/raboty/beauty-insight/');
   for(const id of ['b2b','flowers','crm','prostor']){const opener=related.locator('[data-project="'+id+'"]');await opener.click();check(label+' related '+id+' modal',await page.locator('#caseDialog').evaluate(e=>e.open));await page.keyboard.press('Escape')}
   await scroll(page,(await top(page,'.related-work__controls'))-height/2);
   const arrow=page.locator('.related-work__arrow').last(),before=await arrow.boundingBox();await arrow.hover();await pause(250);const after=await arrow.boundingBox();
   check(label+' arrow does not lift',Math.abs(before.x-after.x)<.5&&Math.abs(before.y-after.y)<.5);
   const initial=await page.locator('#relatedViewport').evaluate(e=>e.scrollLeft);await arrow.click();await pause(500);check(label+' carousel advances',Math.abs((await page.locator('#relatedViewport').evaluate(e=>e.scrollLeft))-initial)>30);
   for(const selector of ['.sc-case-process__cta-button','.sc-footer__cta']){
    await page.locator(selector).scrollIntoViewIfNeeded();await page.locator(selector).hover();check(label+' no glow '+selector,await page.locator(selector).evaluate(e=>getComputedStyle(e).boxShadow==='none'));
   }
   const selectors=['h1','.case-hero__media','.case-hero__figure','.sc-case-process__number-circle','.metal-result-banner','.metal-result-banner__value','.metal-result-banner__label','.sc-case-screens__grid','.sc-case-process__cta','.sc-case-process__cta-button'];
   await scroll(page,0);const actual=await metrics(page,selectors);
   const referencePage=await ctx.newPage();await referencePage.emulateMedia({reducedMotion:'no-preference'});await goto(referencePage,reference);const expected=await metrics(referencePage,selectors);
   report.measurements.push({width,actual,reference:expected});
   for(const selector of selectors){const a=actual[selector],e=expected[selector];check(label+' v5 geometry '+selector,Math.abs(a.width-e.width)<1&&Math.abs(a.height-e.height)<1&&a.font===e.font&&a.color===e.color,{actual:a,reference:e})}
   await shot(page,'metal-'+width+'-hero');await shot(referencePage,'reference-'+width+'-hero');
   for(const [name,selector] of [['process','#our-process'],['result','#case-result'],['interfaces','#case-screens'],['footer','#contact']]){await shot(page,'metal-'+width+'-'+name,selector);await shot(referencePage,'reference-'+width+'-'+name,selector)}
   // Existing header/footer components, navigation back to catalog and the Metal primary action.
   await goto(page,new URL('/raboty/',base).href);await page.locator('[data-project="metal"]').click();await page.waitForURL('**/raboty/metal-calc/');
   check(label+' catalog primary route',await page.locator('#caseTitle').isVisible());
   if(width<851){await page.locator('#menuToggle').click();await page.locator('#mobilePanel a[href="/raboty/"]').click()}else await page.locator('.header-links a[href="/raboty/"]').click();
   await page.waitForURL('**/raboty/');check(label+' back navigation to catalog',await page.locator('#catalog-title').isVisible());
   // Regression against the actual pre-change main, with matched viewport and preference.
   for(const route of ['/','/raboty/','/raboty/beauty-insight/']){
    const previous=await ctx.newPage();await goto(previous,new URL(route,baseline).href);await goto(page,new URL(route,base).href);
    const list=route==='/'?['#floatingHeader','.sc-work-frame','.sc-work-content','#contact']:route==='/raboty/'?['#floatingHeader','.case-card--beauty','.case-card--metal','#contact']:['#floatingHeader','h1','.case-hero__media','.sc-case-process__cta','#contact'];
    const a=await metrics(page,list),b=await metrics(previous,list);
    for(const selector of list)check(label+' regression '+route+selector,Math.abs(a[selector].width-b[selector].width)<1&&Math.abs(a[selector].height-b[selector].height)<1&&a[selector].font===b[selector].font&&a[selector].color===b[selector].color);
    if([1440,390].includes(width)){const name=route==='/'?'home':route==='/raboty/'?'catalog':'beauty';await shot(page,name+'-'+width+'-after');await shot(previous,name+'-'+width+'-before')}
    await previous.close();
   }
   await ctx.close();
  }
  // Ordinary and reverse scroll with the unchanged Lenis/GSAP owner; record the actual page.
  for(const width of [1440,390]){
   const height=width===1440?900:844;const ctx=await browser.newContext({viewport:{width,height},recordVideo:{dir:path.join(dir,'video'),size:{width,height}}});await instrument(ctx);
   const page=await ctx.newPage();watch(page,'motion-'+width);await goto(page,new URL('/raboty/metal-calc/',base).href);
   check(width+' one Lenis owner',await page.evaluate(()=>window.__caseLenis.live===1&&window.__caseLenis.max===1&&window.__synthecoreWorksScrollQA.getState().engine==='lenis-gsap'));
   for(const selector of ['.sc-case-process__cta-button','.sc-footer__cta']){
    const button=page.locator(selector);await button.scrollIntoViewIfNeeded();await pause(1100);
    await page.mouse.move(0,0);await pause(350);const before=await button.boundingBox();
    await button.hover();await pause(350);const after=await button.boundingBox();
    check(width+' normal hover no lift/glow '+selector,Math.abs(before.y-after.y)<.5&&Math.abs(before.x-after.x)<.5&&await button.evaluate(e=>getComputedStyle(e).boxShadow==='none'));
   }
   const process=await top(page,'#our-process'),result=await top(page,'#case-result'),screens=await top(page,'#case-screens'),other=await top(page,'#other-work');
   for(let y=process-100;y<other+150;y+=width===1440?550:350){await scroll(page,y);await pause(120)}
   for(let y=other;y>process;y-=width===1440?800:500){await scroll(page,y);await pause(100)}
   if(width===1440){
    const positions=[];for(const y of [process+500,result-100,screens-100]){await scroll(page,y);positions.push(await page.locator('.sc-case-process__cta').evaluate(e=>({y:e.getBoundingClientRect().top,top:parseFloat(getComputedStyle(e).top)})))}
    check('1440 sticky through process/result/interfaces',positions.every(p=>Math.abs(p.y-p.top)<1),positions);
    await scroll(page,other-80);check('1440 sticky releases before other works',await page.locator('.sc-case-process__cta').evaluate(e=>e.getBoundingClientRect().bottom<=document.querySelector('#other-work').getBoundingClientRect().top+1));
   }
   await scroll(page,process);await page.mouse.wheel(0,4500);await pause(1600);await page.mouse.wheel(0,-2500);await pause(1600);check(width+' rapid reverse scroll responsive',await page.evaluate(()=>Number.isFinite(scrollY)&&scrollY>=0));
   await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>window.__caseLenis.live===0);check(width+' preference change destroys Lenis',true);
   await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>window.__caseLenis.live===1);check(width+' preference change restores one owner',await page.evaluate(()=>window.__caseLenis.max===1));
   await shot(page,'motion-'+width+'-result','#case-result');await scroll(page,0);
   const video=page.video();await ctx.close();await video.saveAs(path.join(dir,'scroll-'+width+'.webm'));
  }
  completed=true;
 }finally{await browser.close();check('all acceptance scenarios completed',completed);check('no JS/console/network failures',report.errors.length===0,report.errors);report.pass=report.checks.every(c=>c.pass);fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(report.checks.filter(c=>c.pass).length+'/'+report.checks.length+' passed');if(!report.pass)process.exitCode=1}
})().catch(e=>{console.error(e);process.exitCode=1});
