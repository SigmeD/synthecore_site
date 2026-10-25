'use strict';
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(require.resolve('playwright',{paths:[process.cwd(),process.env.USERPROFILE||'']}));
const base=process.env.SYNTHECORE_URL||'http://127.0.0.1:4176/';
const reference=process.env.PROSTOR_REFERENCE_URL||'http://127.0.0.1:4194/';
const baseline=process.env.PROSTOR_BASELINE_URL||'http://127.0.0.1:4195/';
const dir=path.resolve(process.env.CASE_QA_OUTPUT||'output/playwright/prostor-v1');fs.mkdirSync(dir,{recursive:true});
const report={date:new Date().toISOString(),base,reference,baseline,checks:[],errors:[],measurements:[],differences:['H1, intro and SEO use the canonical catalog copy; text wrapping and vertical offsets therefore differ from standalone v1.','The central hero uses contain inside the original v1 frame to preserve the complete screenshot as required by the integration task.','Current shared Header/Footer, fonts, CTA policy, related cards and v20 runtime are reused.'],limitations:['Chromium with emulated viewports and touch; no physical mobile device or physical mouse/trackpad smoothness acceptance.','Firefox and WebKit were not tested.']};
const {check,pause,goto,scroll,top,shot,metrics,watch,instrument}=require('./lib/browser-qa.cjs').createBrowserQA({report,dir,settleMs:500,shotMs:400,resetWithoutSelector:true});
const data=JSON.parse(fs.readFileSync('templates/data/cases/prostor.json','utf8'));
async function eager(page){await page.locator('img[src]').evaluateAll(async images=>{for(const image of images)image.loading='eager';await Promise.all(images.map(image=>image.decode().catch(()=>{})))});}
async function snapshotSection(page,name,selector){
 await scroll(page,Math.max(0,(await top(page,selector))-110));await pause(400);
 await page.locator(selector).screenshot({path:path.join(dir,name+'.png')});
}
async function swipe(page,ctx,selector,width){
 const target=page.locator(selector);await target.scrollIntoViewIfNeeded();await pause(300);
 const box=await target.boundingBox(),y=Math.min(700,Math.max(150,box.y+100)),before=await target.evaluate(e=>e.scrollLeft),cdp=await ctx.newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:width-35,y}]});
 for(let x=width-70;x>35;x-=35){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});await pause(35)}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pause(500);await cdp.detach();
 return {before,after:await target.evaluate(e=>e.scrollLeft)};
}
(async()=>{
 const browser=await chromium.launch({headless:true});let completed=false;
 try{
  for(const width of [320,390,768,1024,1440,1920])for(const reducedMotion of ['reduce','no-preference']){
   const height=width>=1440?1080:width>=768?1024:844,key=width+'-'+reducedMotion;
   console.log('Checking '+key);
   const ctx=await browser.newContext({viewport:{width,height},reducedMotion,hasTouch:width<=768});await instrument(ctx);
   const page=await ctx.newPage();watch(page,key);await goto(page,new URL('/raboty/prostor/',base).href);await eager(page);
   check(key+' no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   check(key+' canonical title and intro',await page.evaluate(()=>document.querySelector('#caseTitle').textContent==='Интернет-магазин товаров для дома'&&document.querySelector('.case-hero__intro').textContent.includes('не действующий магазин')));
   check(key+' four steps / seven interfaces',await page.locator('.sc-case-process__step').count()===4&&await page.locator('.sc-case-screens__open').count()===7);
   check(key+' one header/footer/scroll owner',await page.locator('#floatingHeader').count()===1&&await page.locator('#contact').count()===1&&await page.evaluate(reduced=>window.__caseLenis.live===(reduced?0:1)&&window.__caseLenis.max<2,reducedMotion==='reduce'));
   check(key+' all images loaded',await page.locator('img[src]').evaluateAll(images=>images.every(image=>image.complete&&image.naturalWidth>0)));
   check(key+' Manrope',await page.locator('h1').evaluate(e=>getComputedStyle(e).fontFamily.startsWith('Manrope')&&document.fonts.check('16px Manrope')));
   check(key+' three hero roles and responsive visibility',await page.evaluate(width=>{
    const main=document.querySelector('.case-hero__figure--main img'),left=document.querySelector('.case-hero__figure--left'),right=document.querySelector('.case-hero__figure--right');
    return main.src.endsWith('/store-home.webp')&&left.querySelector('img').src.endsWith('/buyer-account.webp')&&right.querySelector('img').src.endsWith('/owner-dashboard.webp')&&[left,right].every(e=>(getComputedStyle(e).display!=='none')===(width>650));
   },width));
   check(key+' complete central screenshot',await page.locator('.case-hero__figure--main img').evaluate(img=>{const r=img.getBoundingClientRect(),parent=img.closest('.prostor-hero').getBoundingClientRect();return getComputedStyle(img).objectFit==='contain'&&r.left>=parent.left&&r.right<=parent.right+1&&r.top>=parent.top&&r.bottom<=parent.bottom+1}));
   check(key+' reduced-motion/native or one Lenis',await page.evaluate(reduced=>reduced?window.__synthecoreWorksScrollQA.getState().engine==='native'&&ScrollTrigger.getAll().length===0:window.__synthecoreWorksScrollQA.getState().engine==='lenis-gsap',reducedMotion==='reduce'));
   check(key+' responsive sticky',await page.locator('.sc-case-process__cta').evaluate((e,width)=>getComputedStyle(e).position===(width>=1100?'sticky':'relative'),width));
   check(key+' CSS selectors isolated',await page.evaluate(()=>{
    const sheet=[...document.styleSheets].find(s=>s.href?.endsWith('/css/case-prostor.css'));
    const valid=rules=>[...rules].every(rule=>rule.selectorText?rule.selectorText.split(/,(?![^()]*\))/).every(s=>s.trim().startsWith('body.sc-case-prostor')):rule.cssRules?valid(rule.cssRules):false);return !!sheet&&valid(sheet.cssRules);
   }));
   await shot(page,'prostor-'+key+'-hero');
   if(reducedMotion==='reduce'){
    const ref=await ctx.newPage();await goto(ref,reference);await eager(ref);
    const selectors=['.case-hero__media','.case-hero__figure--main','.case-hero__figure--left','.case-hero__figure--right','.sc-case-result__hero','.prostor-result__media','.sc-case-screens__grid','.sc-case-screens__open','.sc-case-process__cta'];
    const actual=await metrics(page,selectors),expected=await metrics(ref,selectors);report.measurements.push({width,actual,reference:expected});
    for(const selector of selectors)check(key+' v1 dimensions '+selector,Math.abs(actual[selector].width-expected[selector].width)<1&&Math.abs(actual[selector].height-expected[selector].height)<1,{actual:actual[selector],reference:expected[selector]});
    await shot(ref,'reference-'+width+'-hero');
    if([390,1440].includes(width))for(const [name,selector]of [['process','#our-process'],['result','#case-result'],['interfaces','#case-screens'],['related','#other-work']]){await shot(ref,'reference-'+width+'-'+name,selector);if(name==='interfaces')await snapshotSection(ref,'reference-'+width+'-interfaces-all',selector)}
    await ref.close();
   }
   const stepSelector='.sc-case-process__step',strengths=[];
   for(let i=0;i<4;i++){
    const y=await page.locator(stepSelector).nth(i).evaluate((e,height)=>e.getBoundingClientRect().top+scrollY-height*.22,height);
    await scroll(page,Math.max(0,y));await pause(700);
    strengths.push(await page.locator('.sc-case-process__text').evaluateAll(items=>items.map(e=>+getComputedStyle(e).opacity)));
    check(key+' step '+(i+1)+' text readable',await page.locator('.sc-case-process__text').nth(i).evaluate(e=>+getComputedStyle(e).opacity>=.39));
    if(reducedMotion==='no-preference'&&[390,1440].includes(width))await page.screenshot({path:path.join(dir,'prostor-'+width+'-process-step-'+(i+1)+'.png')});
   }
   if(width>=1100&&reducedMotion==='no-preference'){
    check(key+' process active state changes',strengths.some((a,i)=>i>0&&a.some((v,j)=>Math.abs(v-strengths[0][j])>.1)),strengths);
    await scroll(page,(await page.locator(stepSelector).first().evaluate(e=>e.getBoundingClientRect().top+scrollY))-height*.22);await pause(900);
    const back=await page.locator('.sc-case-process__text').evaluateAll(items=>items.map(e=>+getComputedStyle(e).opacity));
    check(key+' reverse process restores first state',back.every((value,i)=>Math.abs(value-strengths[0][i])<.03),{forward:strengths[0],reverse:back});
   }
   if(reducedMotion==='reduce'||[390,1440].includes(width))for(let i=0;i<7;i++){
    const opener=page.locator('.sc-case-screens__open').nth(i);await opener.scrollIntoViewIfNeeded();await pause(150);await opener.click();
    await page.waitForFunction(()=>{const image=document.querySelector('#caseLightbox img');return image.complete&&image.naturalWidth>0});
    check(key+' lightbox '+i+' original PNG/title/alt',await page.locator('#caseLightbox').evaluate((dialog,screen)=>{const image=dialog.querySelector('img');return dialog.open&&image.getAttribute('src')===screen.full_src&&image.naturalWidth===2880&&image.naturalHeight===2000&&image.alt===screen.alt&&dialog.querySelector('p').textContent===screen.caption},data.screens[i]));
    await page.keyboard.press('Tab');check(key+' lightbox '+i+' traps focus',await page.locator('#caseLightbox').evaluate(d=>d.contains(document.activeElement)));
    if([390,1440].includes(width)&&i===6&&reducedMotion==='reduce')await page.screenshot({path:path.join(dir,'prostor-'+width+'-owner-lightbox.png')});
    if(i%3===0)await page.keyboard.press('Escape');else if(i%3===1)await page.locator('.sc-case-lightbox__close').click();else await page.locator('#caseLightbox').click({position:{x:3,y:3}});
    await page.waitForFunction(()=>!document.querySelector('#caseLightbox').open&&!document.documentElement.classList.contains('sc-dialog-open'));
    check(key+' lightbox '+i+' closes/restores focus',await opener.evaluate(e=>document.activeElement===e));
   }
   if(width>=1100){
    const positions=[];
    for(const selector of ['#case-result','#case-screens']){await scroll(page,(await top(page,selector))-100);positions.push(await page.locator('.sc-case-process__cta').evaluate(e=>({actual:e.getBoundingClientRect().top,expected:parseFloat(getComputedStyle(e).top)})))}
    check(key+' sticky throughout result and seven screens',positions.every(p=>Math.abs(p.actual-p.expected)<1),positions);
    await scroll(page,(await top(page,'#other-work'))-80);check(key+' sticky ends before other work',await page.evaluate(()=>document.querySelector('.sc-case-process__cta').getBoundingClientRect().bottom<=document.querySelector('#other-work').getBoundingClientRect().top+1));
   }
   const related=page.locator('.related-work__track > .case-card:not([data-carousel-clone])');
   check(key+' five related projects/current excluded',await related.count()===5&&await related.locator('[data-project="prostor"]').count()===0);
   const arrows=page.locator('.related-work__arrow');await arrows.last().scrollIntoViewIfNeeded();await pause(250);const before=await page.locator('#relatedViewport').evaluate(e=>e.scrollLeft);await arrows.last().click();await pause(750);check(key+' carousel arrow works',Math.abs(await page.locator('#relatedViewport').evaluate(e=>e.scrollLeft)-before)>30);
   if(width<=390){const touch=await swipe(page,ctx,'#relatedViewport',width);check(key+' native carousel touch works',Math.abs(touch.after-touch.before)>30,touch)}
   check(key+' clones excluded from keyboard',await page.locator('[data-carousel-clone] a,[data-carousel-clone] button').evaluateAll(items=>items.every(e=>e.tabIndex===-1)));
   for(const selector of ['.sc-case-process__cta-button','.sc-footer__cta']){const button=page.locator(selector);await button.scrollIntoViewIfNeeded();await button.hover();check(key+' CTA mailto/no glow '+selector,(await button.getAttribute('href')).startsWith('mailto:')&&await button.evaluate(e=>getComputedStyle(e).boxShadow==='none'))}
   check(key+' no overflow after full journey',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if([390,1440].includes(width)){
    for(const [name,selector]of [['process','#our-process'],['result','#case-result'],['interfaces','#case-screens'],['related','#other-work'],['footer','#contact']])await shot(page,'prostor-'+key+'-'+name,selector);
    if(reducedMotion==='reduce'){
     await snapshotSection(page,'prostor-'+width+'-interfaces-all','#case-screens');
     if(width===390)await snapshotSection(page,'prostor-390-process-all','#our-process');
    }
   }
   if(reducedMotion==='no-preference'&&[390,1440].includes(width)){
    if(width===1440)check(key+' existing parallax targets gallery',await page.evaluate(()=>ScrollTrigger.getAll().some(t=>t.trigger?.classList.contains('sc-case-screens__item'))));
    const start=await top(page,'#our-process');await scroll(page,start);await page.mouse.wheel(0,6500);await pause(700);const down=await page.evaluate(()=>scrollY);await page.mouse.wheel(0,-3500);await pause(900);const up=await page.evaluate(()=>scrollY);check(key+' fast/reverse wheel responds',down>up&&up>=0,{down,up});
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>window.__caseLenis.live===0);await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>window.__caseLenis.live===1);check(key+' motion preference restores single owner',await page.evaluate(()=>window.__caseLenis.max===1));
   }
   if(reducedMotion==='reduce'&&[390,1440].includes(width)){
    for(const id of ['beauty','flowers','metal','b2b','crm']){
     const opener=related.locator('[data-project="'+id+'"]'),href=await opener.getAttribute('href');await opener.click();
     if(href){await page.waitForURL('**'+href);check(key+' related '+id+' navigates',await page.locator('#caseTitle').isVisible());await page.goBack({waitUntil:'networkidle'});await pause(400)}
     else{check(key+' related '+id+' modal remains',await page.locator('#caseDialog').evaluate(d=>d.open));await page.keyboard.press('Escape')}
    }
    if(width<851){await scroll(page,0);await page.locator('#menuToggle').click();check(key+' mobile menu opens',await page.locator('#mobilePanel').isVisible());await page.locator('#mobilePanel a[href="/raboty/"]').click()}
    else await page.locator('.header-links a[href="/raboty/"]').click();
    await page.waitForURL('**/raboty/');check(key+' back to catalog',await page.locator('#catalog-title').isVisible());
    for(const route of ['/','/raboty/','/raboty/beauty-insight/','/raboty/flowers/','/raboty/metal-calc/']){
     const old=await ctx.newPage();await goto(old,new URL(route,baseline).href);await goto(page,new URL(route,base).href);await eager(page);await eager(old);
     const selectors=route==='/'?['#floatingHeader','.sc-work-frame','#contact']:route==='/raboty/'?['#floatingHeader','.case-card--prostor','#contact']:['#floatingHeader','h1','.case-hero__media','.sc-case-process__cta','#contact'];
     const current=await metrics(page,selectors),previous=await metrics(old,selectors);
     for(const selector of selectors)check(key+' baseline '+route+selector,Math.abs(current[selector].width-previous[selector].width)<1&&Math.abs(current[selector].height-previous[selector].height)<1&&current[selector].font===previous[selector].font&&current[selector].color===previous[selector].color);
     const label=route==='/'?'home':route==='/raboty/'?'catalog':route.split('/')[2];await shot(page,'regression-'+label+'-'+width+'-after');await shot(old,'regression-'+label+'-'+width+'-before');
     if(route.startsWith('/raboty/')&&route!=='/raboty/'){
      const link=page.locator('.related-work__track > .case-card:not([data-carousel-clone]) [data-project="prostor"]');await link.click();await page.waitForURL('**/raboty/prostor/');check(key+' incoming related link '+label,await page.locator('#caseTitle').isVisible());
     }
     await old.close();
    }
   }
   await ctx.close();console.log('Finished '+key);
  }
  completed=true;
 }finally{
  await browser.close();check('all viewport and motion scenarios completed',completed);check('no JavaScript/network/HTTP errors',report.errors.length===0,report.errors);
  report.pass=report.checks.every(c=>c.pass);fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(report.checks.filter(c=>c.pass).length+'/'+report.checks.length+' passed');if(!report.pass)process.exitCode=1;
 }
})().catch(e=>{console.error(e);process.exitCode=1});
