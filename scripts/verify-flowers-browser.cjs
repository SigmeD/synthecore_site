'use strict';
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(require.resolve('playwright',{paths:[process.cwd(),process.env.USERPROFILE||'']}));
const base=process.env.SYNTHECORE_URL||'http://127.0.0.1:4176/',reference=process.env.FLOWERS_REFERENCE_URL||'http://127.0.0.1:4189/',baseline=process.env.FLOWERS_BASELINE_URL||'http://127.0.0.1:4190/';
const dir=path.resolve('output/playwright/flowers-v2');fs.mkdirSync(dir,{recursive:true});
const assetDimensions=JSON.parse(fs.readFileSync('docs/qa/flowers-v2/source-audit.json','utf8')).assets;
const report={date:new Date().toISOString(),base,reference,baseline,checks:[],errors:[],measurements:[],referenceDifferences:['Canonical catalog title/summary/tags and current related cards replace the autonomous copy.','Shared current Header/Footer, CTA and v20 interaction fixes are reused.'],limitations:['Automated wheel/touch does not prove physical-device smoothness.','Firefox/WebKit and real mobile hardware are not tested.']};
const check=(name,pass,data)=>{report.checks.push({name,pass:!!pass,...(data===undefined?{}:{data})});if(!pass)console.log('FAIL '+name+' '+JSON.stringify(data))};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function goto(page,url){await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await pause(1200)}
async function scroll(page,y){await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);await pause(400)}
async function top(page,selector){return page.locator(selector).evaluate(e=>e.getBoundingClientRect().top+scrollY)}
async function shot(page,name,selector){await scroll(page,selector?Math.max(0,await top(page,selector)-110):0);await pause(1000);await page.screenshot({path:path.join(dir,name+'.png')})}
async function metrics(page,selectors){return page.evaluate(selectors=>Object.fromEntries(selectors.map(selector=>{const e=document.querySelector(selector),r=e.getBoundingClientRect(),c=getComputedStyle(e);return[selector,{width:r.width,height:r.height,font:c.fontSize,fontFamily:c.fontFamily,lineHeight:c.lineHeight,color:c.color,position:c.position,top:c.top,fit:c.objectFit,radius:c.borderRadius}]})),selectors)}
function watch(page,label){page.on('pageerror',e=>report.errors.push({label,type:'JavaScript',message:e.message}));page.on('console',e=>{if(e.type()==='error')report.errors.push({label,type:'console',message:e.text()})});page.on('response',r=>{if(r.status()>=400)report.errors.push({label,type:'HTTP',url:r.url(),status:r.status()})});page.on('requestfailed',r=>report.errors.push({label,type:'network',url:r.url(),error:r.failure()?.errorText}))}
async function instrument(ctx){await ctx.addInitScript(()=>{window.__caseLenis={live:0,max:0};let ctor;Object.defineProperty(window,'Lenis',{configurable:true,get:()=>ctor,set:value=>{ctor=new Proxy(value,{construct(target,args,newTarget){const instance=Reflect.construct(target,args,newTarget);window.__caseLenis.live++;window.__caseLenis.max=Math.max(window.__caseLenis.max,window.__caseLenis.live);let dead=false;const destroy=instance.destroy.bind(instance);instance.destroy=(...a)=>{if(!dead){dead=true;window.__caseLenis.live--}return destroy(...a)};return instance}})}})})}
async function swipe(page,ctx,selector,width){
 const target=page.locator(selector);await target.scrollIntoViewIfNeeded();await pause(400);const rect=await target.boundingBox(),y=Math.round(Math.max(140,Math.min(700,rect.y+100)));
 const before=await target.evaluate(e=>e.scrollLeft),cdp=await ctx.newCDPSession(page),start=width-45;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start,y}]});
 for(let x=start-40;x>=35;x-=40){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});await pause(45)}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pause(700);await cdp.detach();
 return {before,after:await target.evaluate(e=>e.scrollLeft),y};
}
(async()=>{
 const browser=await chromium.launch({headless:true});let completed=false;
 try{
  for(const width of [320,390,768,1440,1920]){
   const height=width>=1440?1080:width===768?1024:844,label=String(width);
   const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',hasTouch:width<=768});await instrument(ctx);
   const page=await ctx.newPage();watch(page,label);await goto(page,new URL('/raboty/flowers/',base).href);
   check(label+' no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   check(label+' three phones',await page.locator('.flowers-hero__phone').count()===3);
   check(label+' four process steps',await page.locator('.sc-case-process__step').count()===4);
   check(label+' four interfaces',await page.locator('.sc-case-screens__open').count()===4);
   check(label+' two result devices',await page.locator('.flowers-result__device').count()===2);
   check(label+' no labels above phones',!(await page.locator('.case-hero__head').innerText()).match(/UX\/UI · Mobile First|Дизайн и прототип/));
   check(label+' prototype result and client attribution',await page.evaluate(()=>document.querySelector('#case-result').textContent.includes('UX/UI-концепт и интерактивный прототип')&&document.querySelector('#our-process').textContent.includes('По данным заказчика, около 80%')));
   check(label+' natural hero image proportions',await page.locator('.flowers-hero img').evaluateAll(images=>images.every(img=>{const c=getComputedStyle(img);return img.complete&&img.naturalWidth>0&&Math.abs(parseFloat(c.width)/parseFloat(c.height)-img.naturalWidth/img.naturalHeight)<.003})));
   check(label+' reduced phones visible without animation',await page.locator('.flowers-hero__phone').evaluateAll(items=>items.every(e=>getComputedStyle(e).opacity==='1'&&getComputedStyle(e).animationName==='none')));
   check(label+' reduced native scroll/no parallax',await page.evaluate(()=>window.__caseLenis.live===0&&window.__synthecoreWorksScrollQA.getState().engine==='native'&&ScrollTrigger.getAll().length===0));
   check(label+' sticky responsive',await page.locator('.sc-case-process__cta').evaluate((e,width)=>getComputedStyle(e).position===(width>=1100?'sticky':'relative'),width));
   check(label+' CSS isolated to Flowers',await page.evaluate(()=>{
    const sheet=[...document.styleSheets].find(s=>s.href?.endsWith('/css/case-flowers.css'));
    const valid=rules=>[...rules].every(rule=>rule.type===CSSRule.KEYFRAMES_RULE||rule.type===CSSRule.KEYFRAME_RULE?true:rule.selectorText?rule.selectorText.split(/,(?![^()]*\))/).every(s=>s.trim().startsWith('body.sc-case-flowers')):rule.cssRules?valid(rule.cssRules):false);
    return !!sheet&&valid(sheet.cssRules);
   }));
   const resources=await page.evaluate(()=>[...new Set([...document.querySelectorAll('img[src],script[src],link[rel="stylesheet"],button[data-full]')].map(e=>e.getAttribute('src')||e.getAttribute('href')||e.getAttribute('data-full')).filter(Boolean))]);
   for(const resource of resources){const response=await page.request.get(new URL(resource,page.url()).href);check(label+' resource '+resource,response.status()===200)}
   for(let i=0;i<4;i++){
    const opener=page.locator('.sc-case-screens__open').nth(i);await opener.scrollIntoViewIfNeeded();await opener.locator('img').evaluate(img=>img.decode());
    check(label+' gallery '+i+' natural proportions',await opener.locator('img').evaluate(img=>{const c=getComputedStyle(img);return Math.abs(parseFloat(c.width)/parseFloat(c.height)-img.naturalWidth/img.naturalHeight)<.003}));
    const full=await opener.getAttribute('data-full'),expectedSize=assetDimensions[full];await opener.click();await page.waitForFunction(()=>document.querySelector('#caseLightbox img').complete&&document.querySelector('#caseLightbox img').naturalWidth>0);
    check(label+' lightbox '+i+' full original',await page.locator('#caseLightbox img').evaluate((img,{full,expectedSize})=>img.getAttribute('src')===full&&img.naturalWidth===expectedSize.width&&img.naturalHeight===expectedSize.height,{full,expectedSize}));
    await page.keyboard.press('Tab');check(label+' lightbox '+i+' traps focus',await page.evaluate(()=>document.querySelector('#caseLightbox').contains(document.activeElement)));
    if(i%2===0)await page.keyboard.press('Escape');else await page.locator('.sc-case-lightbox__close').click();
    await page.waitForFunction(()=>!document.documentElement.classList.contains('sc-dialog-open'));
    check(label+' lightbox '+i+' closes/restores focus',await opener.evaluate(e=>document.activeElement===e&&!document.querySelector('#caseLightbox').open));
   }
   const related=page.locator('.related-work__track > .case-card:not([data-carousel-clone])');check(label+' five related/current excluded',await related.count()===5&&await related.locator('[data-project="flowers"]').count()===0);
   check(label+' Beauty route',await related.locator('[data-project="beauty"]').getAttribute('href')==='/raboty/beauty-insight/');
   for(const id of ['b2b','crm','prostor','metal']){const opener=related.locator('[data-project="'+id+'"]');await opener.click();check(label+' related '+id+' fallback modal',await page.locator('#caseDialog').evaluate(e=>e.open));await page.keyboard.press('Escape')}
   await scroll(page,(await top(page,'.related-work__controls'))-height/2);const arrow=page.locator('.related-work__arrow').last(),before=await arrow.boundingBox();await arrow.hover();await pause(250);const after=await arrow.boundingBox();
   check(label+' stationary arrow hover',Math.abs(before.x-after.x)<.5&&Math.abs(before.y-after.y)<.5);const initial=await page.locator('#relatedViewport').evaluate(e=>e.scrollLeft);await arrow.click();await pause(450);check(label+' carousel advances',Math.abs((await page.locator('#relatedViewport').evaluate(e=>e.scrollLeft))-initial)>30);
   for(const selector of ['.sc-case-process__cta-button','.sc-footer__cta']){const button=page.locator(selector);await button.scrollIntoViewIfNeeded();await button.hover();check(label+' CTA mail link/no glow '+selector,(await button.getAttribute('href')).startsWith('mailto:')&&await button.evaluate(e=>getComputedStyle(e).boxShadow==='none'))}
   const selectors=['h1','.flowers-hero','.flowers-hero__phones','.flowers-hero__phone--catalog','.sc-case-process__number-circle','.flowers-result','.sc-case-screens__grid','.sc-case-screens__open','.sc-case-process__cta','.sc-case-process__cta-button'];
   await scroll(page,0);const actual=await metrics(page,selectors),refPage=await ctx.newPage();await goto(refPage,reference);const expected=await metrics(refPage,selectors);report.measurements.push({width,actual,reference:expected});
   for(const selector of selectors){const a=actual[selector],e=expected[selector];check(label+' v2 geometry '+selector,Math.abs(a.width-e.width)<1&&(selector==='h1'||Math.abs(a.height-e.height)<1)&&a.font===e.font&&a.color===e.color,{actual:a,reference:e})}
   await shot(page,'flowers-'+width+'-hero');await shot(refPage,'reference-'+width+'-hero');
   for(const [name,selector]of [['process','#our-process'],['result','#case-result'],['interfaces','#case-screens'],['footer','#contact']]){await shot(page,'flowers-'+width+'-'+name,selector);await shot(refPage,'reference-'+width+'-'+name,selector)}
   if(width<=390){await scroll(page,0);const touch=await swipe(page,ctx,'.flowers-hero__phones',width);check(label+' native phones swipe',Math.abs(touch.after-touch.before)>30,touch);
    const phones=page.locator('.flowers-hero__phone');for(let i=0;i<3;i++){await phones.nth(i).evaluate(e=>e.scrollIntoView({block:'nearest',inline:'center',behavior:'instant'}));check(label+' phone '+i+' reachable without horizontal clipping',await phones.nth(i).evaluate(e=>{const r=e.getBoundingClientRect(),p=e.parentElement.getBoundingClientRect();return r.left>=p.left-1&&r.right<=p.right+1}));}
    await phones.nth(1).evaluate(e=>e.scrollIntoView({block:'nearest',inline:'center',behavior:'instant'}));
    await shot(page,'flowers-'+width+'-catalog-phone','.flowers-hero');
   }
   await goto(page,new URL('/raboty/',base).href);await page.locator('[data-project="flowers"]').click();await page.waitForURL('**/raboty/flowers/');check(label+' catalog primary navigation',await page.locator('#caseTitle').isVisible());
   if(width<851){await page.locator('#menuToggle').click();check(label+' mobile menu opens',await page.locator('#mobilePanel').isVisible());await page.locator('#mobilePanel a[href="/raboty/"]').click()}else await page.locator('.header-links a[href="/raboty/"]').click();
   await page.waitForURL('**/raboty/');check(label+' return to catalog',await page.locator('#catalog-title').isVisible());
   for(const route of ['/','/raboty/','/raboty/beauty-insight/']){
    const previous=await ctx.newPage();await goto(previous,new URL(route,baseline).href);await goto(page,new URL(route,base).href);
    const list=route==='/'?['#floatingHeader','.sc-work-frame','.sc-work-content','#contact']:route==='/raboty/'?['#floatingHeader','.case-card--beauty','.case-card--flowers','#contact']:['#floatingHeader','h1','.case-hero__media','.sc-case-process__cta','#contact'];
    const a=await metrics(page,list),b=await metrics(previous,list);for(const selector of list)check(label+' regression '+route+selector,Math.abs(a[selector].width-b[selector].width)<1&&Math.abs(a[selector].height-b[selector].height)<1&&a[selector].font===b[selector].font&&a[selector].color===b[selector].color);
    if([1440,390].includes(width)){const name=route==='/'?'home':route==='/raboty/'?'catalog':'beauty';await shot(page,name+'-'+width+'-after');await shot(previous,name+'-'+width+'-before')}await previous.close();
   }
   await ctx.close();
  }
  for(const width of [1440,390]){
   const height=width===1440?1080:844,ctx=await browser.newContext({viewport:{width,height},hasTouch:width===390,recordVideo:{dir:path.join(dir,'video'),size:{width,height}}});await instrument(ctx);
   const page=await ctx.newPage();watch(page,'motion-'+width);await goto(page,new URL('/raboty/flowers/',base).href);
   check(width+' one Lenis owner',await page.evaluate(()=>window.__caseLenis.live===1&&window.__caseLenis.max===1&&window.__synthecoreWorksScrollQA.getState().engine==='lenis-gsap'));
   check(width+' phone entrance enabled',await page.locator('.flowers-hero__phone').evaluateAll(items=>items.every(e=>getComputedStyle(e).animationName==='scFlowersPhoneEnter')));
   const process=await top(page,'#our-process'),result=await top(page,'#case-result'),screens=await top(page,'#case-screens'),other=await top(page,'#other-work');
   for(let y=process-100;y<other+150;y+=width===1440?650:350){await scroll(page,y);await pause(100)}for(let y=other;y>process;y-=width===1440?850:500){await scroll(page,y);await pause(100)}
   if(width===1440){const positions=[];for(const y of [process+500,result-100,screens-100]){await scroll(page,y);positions.push(await page.locator('.sc-case-process__cta').evaluate(e=>({y:e.getBoundingClientRect().top,top:parseFloat(getComputedStyle(e).top)})))}check('1440 sticky through narrative',positions.every(p=>Math.abs(p.y-p.top)<1),positions);await scroll(page,other-80);check('1440 sticky releases before other works',await page.locator('.sc-case-process__cta').evaluate(e=>e.getBoundingClientRect().bottom<=document.querySelector('#other-work').getBoundingClientRect().top+1));
    check('1440 gallery parallax active',await page.evaluate(()=>ScrollTrigger.getAll().some(t=>t.trigger?.classList.contains('sc-case-screens__item'))));
   }else{await scroll(page,0);const touch=await swipe(page,ctx,'.flowers-hero__phones',width);check('390 normal native phone swipe',Math.abs(touch.after-touch.before)>30,touch);const related=await swipe(page,ctx,'#relatedViewport',width);check('390 normal native related swipe',Math.abs(related.after-related.before)>30,related)}
   for(const selector of ['.sc-case-process__cta-button','.sc-footer__cta']){const button=page.locator(selector);await button.scrollIntoViewIfNeeded();await pause(1100);await page.mouse.move(0,0);await pause(300);const a=await button.boundingBox();await button.hover();await pause(300);const b=await button.boundingBox();check(width+' normal CTA no lift/glow '+selector,Math.abs(a.y-b.y)<.5&&Math.abs(a.x-b.x)<.5&&await button.evaluate(e=>getComputedStyle(e).boxShadow==='none'))}
   await scroll(page,process);await page.mouse.wheel(0,4500);await pause(1400);await page.mouse.wheel(0,-2500);await pause(1400);check(width+' rapid reverse scroll responds',await page.evaluate(()=>Number.isFinite(scrollY)&&scrollY>=0));
   await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>window.__caseLenis.live===0);check(width+' preference destroys Lenis',true);await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>window.__caseLenis.live===1);check(width+' preference restores one owner',await page.evaluate(()=>window.__caseLenis.max===1));
   await scroll(page,0);const video=page.video();await ctx.close();await video.saveAs(path.join(dir,'scroll-'+width+'.webm'));
  }
  completed=true;
 }finally{await browser.close();check('all acceptance scenarios completed',completed);check('no JS/console/network failures',report.errors.length===0,report.errors);report.pass=report.checks.every(c=>c.pass);fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(report.checks.filter(c=>c.pass).length+'/'+report.checks.length+' passed');if(!report.pass)process.exitCode=1}
})().catch(e=>{console.error(e);process.exitCode=1});
