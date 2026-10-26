'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(require.resolve('playwright',{paths:[process.cwd(),process.env.USERPROFILE||'']}));
const {createBrowserQA}=require('./lib/browser-qa.cjs');
const base=process.env.SYNTHECORE_QA_BASE||'http://127.0.0.1:4176/';
const dir=path.join(process.cwd(),'output/playwright/get-started-v4.9.2');
const carouselOnly=process.argv.includes('--carousel-only');
const shellOnly=process.argv.includes('--shell-only');
fs.mkdirSync(dir,{recursive:true});
const report={version:'4.9.2',base,createdAt:new Date().toISOString(),checks:[],errors:[],viewports:[],reference:[],cta:[],limitations:[
 'Browser automation verifies wheel/touch response; it does not establish physical mouse/trackpad smoothness.',
 'Historical modal CTA are tested by opening preserved dialogs programmatically: all six work cards now navigate directly, so these dialogs have no normal entry point.',
 'The mailto fallback is inspected without launching an external email client. No backend or delivery exists.',
 'Phone masks validate digit counts, not number ownership or carrier allocation. Privacy remains a draft.'
]};
const {check,pause,goto,watch,instrument}=createBrowserQA({report,dir,settleMs:1450,shotMs:200});
const original='.related-work__track > .case-card:not([data-carousel-clone])';
const routes=['/','/raboty/',...fs.readdirSync('templates/data/cases').filter(f=>f.endsWith('.json')).map(f=>'/raboty/'+JSON.parse(fs.readFileSync('templates/data/cases/'+f)).slug+'/')];
const url=route=>new URL(route,base).href;
async function eager(page){await page.locator('img[src]').evaluateAll(async images=>{images.forEach(i=>i.loading='eager');await Promise.all(images.map(i=>i.decode().catch(()=>{})))});}
async function state(page){return page.evaluate(()=>{
 const vp=document.querySelector('#relatedViewport'),r=vp.getBoundingClientRect();
 const cards=[...vp.querySelectorAll('.case-card')];
 const first=cards.find(e=>{const b=e.getBoundingClientRect();return Math.abs(b.left-r.left)<2});
 return {first:first?.querySelector('a')?.getAttribute('href'),transform:vp.querySelector('.related-work__track').style.transform,scrollLeft:vp.scrollLeft};
});}
async function carousel(page,ctx,key,width,reduced){
 const viewport=page.locator('#relatedViewport'),next=page.locator('[data-direction="1"]'),prev=page.locator('[data-direction="-1"]');
 await next.scrollIntoViewIfNeeded();await pause(200);
 const start=await state(page);
 await next.click();await pause(reduced?80:720);const forward=await state(page);
 check(key+' arrow advances transform',forward.first!==start.first&&forward.scrollLeft===0,{start,forward});
 await prev.click();await pause(reduced?80:720);check(key+' previous reverses', (await state(page)).first===start.first);
 for(let i=0;i<6;i++)await next.click();await pause(reduced?100:4400);
 check(key+' six quick clicks complete full loop',(await state(page)).first===start.first,await state(page));
 for(let i=0;i<6;i++)await prev.click();await pause(reduced?100:4400);
 check(key+' previous full loop',(await state(page)).first===start.first);
 await viewport.focus();await page.keyboard.press('ArrowRight');await pause(reduced?80:720);
 check(key+' keyboard next',(await state(page)).first===forward.first);
 await page.keyboard.press('ArrowLeft');await pause(reduced?80:720);
 check(key+' keyboard previous',(await state(page)).first===start.first);
 await next.scrollIntoViewIfNeeded();await page.mouse.move(1,1);await pause(250);
 const style=async()=>next.evaluate(e=>{const r=e.getBoundingClientRect(),c=getComputedStyle(e);return{x:r.x,y:r.y,w:r.width,h:r.height,background:c.backgroundColor,border:c.borderColor,transform:c.transform}});
 const before=await style();await next.hover();await pause(260);const after=await style();
 check(key+' arrow hover white stationary neutral border',JSON.stringify(before)===JSON.stringify(after)&&after.background==='rgb(255, 255, 255)',{before,after});
 check(key+' clone links excluded from tab order',await page.locator('[data-carousel-clone] a').evaluateAll(a=>a.every(e=>e.tabIndex===-1)));
 if(width<=390){
  await viewport.scrollIntoViewIfNeeded();const box=await viewport.boundingBox(),y=Math.max(80,Math.min(650,box.y+110)),cdp=await ctx.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:width-35,y}]});
  for(let x=width-60;x>35;x-=25){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});await pause(20)}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pause(reduced?100:800);await cdp.detach();
  check(key+' real CDP touch swipe',(await state(page)).first===forward.first,{before:start,after:await state(page)});
 }
 await viewport.focus();
 for(let i=0;i<6;i++){
  await page.keyboard.press('Tab');await pause(reduced?80:720);
  const focused=await viewport.evaluate(e=>{const a=document.activeElement,v=e.getBoundingClientRect(),r=a.getBoundingClientRect();return{link:a.getAttribute('href'),inside:e.contains(a),left:r.left,right:r.right,viewportLeft:v.left,viewportRight:v.right,scrollLeft:e.scrollLeft}});
  check(key+' native Tab card '+(i+1)+' visible without native horizontal scroll',focused.inside&&focused.scrollLeft===0&&focused.left>=focused.viewportLeft-1&&focused.right<=focused.viewportRight+1,focused);
 }
 const tabEnd=await state(page),hrefs=await page.locator(original+' a').evaluateAll(a=>a.map(e=>e.getAttribute('href'))),expectedNext=hrefs[(hrefs.indexOf(tabEnd.first)+1)%hrefs.length];
 await next.click();await pause(reduced?80:720);check(key+' next after keyboard wrap uses transform',(await state(page)).first===expectedNext&&(await state(page)).scrollLeft===0,{before:tabEnd,expectedNext,after:await state(page)});
 for(let i=0;i<6;i++)await next.click();await pause(reduced?100:4400);check(key+' full loop after native keyboard',(await state(page)).first===expectedNext&&(await state(page)).scrollLeft===0,{expectedNext,after:await state(page)});
 await next.click();await pause(reduced?80:720);await page.keyboard.press('Shift+Tab');await page.keyboard.press('Shift+Tab');
 for(let i=0;i<2;i++){
  if(i)await page.keyboard.press('Shift+Tab');await pause(reduced?80:720);
  check(key+' ShiftTab after arrows '+i+' aligns real card',await viewport.evaluate(e=>{const a=document.activeElement,r=a.getBoundingClientRect(),v=e.getBoundingClientRect();return e.contains(a)&&e.scrollLeft===0&&r.left>=v.left-1&&r.right<=v.right+1}));
 }
}
async function metrics(page){return page.evaluate(()=>{
 const selectors=['.works-surface','.sc-contact__layout','.sc-contact__intro h1','.sc-contact__form','#scPhoneGroup','.sc-contact__submit','.related-work','#relatedViewport','.related-work__arrow'];
 return Object.fromEntries(selectors.map(s=>{const e=document.querySelector(s),r=e.getBoundingClientRect(),c=getComputedStyle(e);return[s,{x:r.x,y:r.y+scrollY,width:r.width,height:r.height,font:c.fontSize,lineHeight:c.lineHeight,radius:c.borderRadius}]}));
});}
async function compareReference(page,ctx,width){
 const ref=await ctx.newPage();await ref.goto('file:///D:/downloads/SyntheCore_Get_Started_v4.9.2.html',{waitUntil:'load'});await ref.evaluate(()=>document.fonts.ready);await pause(300);
 const actual=await metrics(page),reference=await metrics(ref);report.reference.push({width,actual,reference});
 for(const selector of ['.sc-contact__layout','.sc-contact__form','#scPhoneGroup','.sc-contact__submit','#relatedViewport','.related-work__arrow']){
  const a=actual[selector],b=reference[selector];check(width+' reference dimensions '+selector,Math.abs(a.width-b.width)<1&&Math.abs(a.height-b.height)<1&&Math.abs(a.x-b.x)<1&&Math.abs(a.y-b.y)<1,{actual:a,reference:b});
 }
 await ref.close();
}
async function formChecks(page,key){
 const submit=page.locator('.sc-contact__submit');await submit.click();
 for(const [field,error]of [['scClientName','scNameError'],['scContact','scContactError'],['scPhone','scPhoneError'],['scTask','scTaskError'],['scDataConsent','scConsentError']])check(key+' required '+field,await page.locator('#'+field).getAttribute('aria-invalid')==='true'&&!!(await page.locator('#'+error).textContent()));
 check(key+' phone country defaults BY / 44 countries',await page.locator('#scPhoneCountry').inputValue()==='BY'&&await page.locator('#scPhoneCountry option').count()===44);
 const countries=[['BY','291234567','+375291234567'],['EE','5123456','+3725123456'],['EE','51234567','+37251234567'],['RU','9991234567','+79991234567'],['KZ','7011234567','+77011234567'],['UZ','901234567','+998901234567'],['US','2025550123','+12025550123'],['DE','1512345','+491512345'],['DE','151234567890','+49151234567890']];
 for(const [country,number,expected]of countries){await page.selectOption('#scPhoneCountry',country);await page.fill('#scPhone',number);check(key+' phone '+country+' '+number.length,await page.evaluate(expected=>window.scPhone.valid()&&window.scPhone.getE164()===expected&&document.querySelector('[name="phone"]').value===expected,expected));}
 for(const [number,country,expected]of [['+375291234567','BY','+375291234567'],['+37251234567','EE','+37251234567']]){await page.fill('#scPhone',number);check(key+' international paste '+country,await page.evaluate(({country,expected})=>scPhone.getCountry()===country&&scPhone.getE164()===expected,{country,expected}));}
 await page.context().grantPermissions(['clipboard-read','clipboard-write']);await page.evaluate(()=>navigator.clipboard.writeText('+375291234567'));await page.locator('#scPhone').focus();await page.keyboard.press('Control+A');await page.keyboard.press('Control+V');check(key+' real clipboard paste normalizes phone',await page.evaluate(()=>scPhone.getCountry()==='BY'&&scPhone.getE164()==='+375291234567'));
 for(const [caret,keyPress,expected]of [[2,'Delete','29 234-56-7'],[3,'Backspace','21 234-56-7']]){await page.fill('#scPhone','291234567');await page.locator('#scPhone').focus();await page.locator('#scPhone').evaluate((e,caret)=>e.setSelectionRange(caret,caret),caret);await page.keyboard.press(keyPress);check(key+' phone '+keyPress+' crosses separator',await page.locator('#scPhone').inputValue()===expected,{actual:await page.locator('#scPhone').inputValue(),expected});}
 await page.fill('#scPhone','12');await submit.click();check(key+' rejects short phone',await page.locator('#scPhone').getAttribute('aria-invalid')==='true');
 await page.fill('#scClientName','QA User');await page.fill('#scContact','invalid');await page.fill('#scTask','short');await page.fill('#scProjectUrl','javascript:alert(1)');await submit.click();
 check(key+' rejects malformed contact task URL',await page.locator('#scContact[aria-invalid="true"],#scTask[aria-invalid="true"],#scProjectUrl[aria-invalid="true"]').count()===3);
 await page.fill('#scContact','qa@example.test');await page.fill('#scPhone','+375291234567');await page.fill('#scTask','Нужно обсудить доработку кабинета и интеграции.');await page.fill('#scProjectUrl','https://example.test/project');await page.check('#scDataConsent');
 const requests=[];const onRequest=r=>requests.push({method:r.method(),url:r.url(),type:r.resourceType()});page.on('request',onRequest);
 await submit.click();await pause(300);page.off('request',onRequest);
 const fallback=await page.locator('#scMailtoFallback').getAttribute('href'),body=new URL(fallback).searchParams.get('body');
 check(key+' valid email honest demo / no clearing / international mailto',await page.locator('#scSubmitStatus').isVisible()&&(await page.locator('#scSubmitStatus').textContent()).includes('ещё не отправлена')&&await page.locator('#scClientName').inputValue()==='QA User'&&body.includes('+375291234567')&&body.includes('qa@example.test'),{mailto:decodeURIComponent(fallback)});
 check(key+' no network submission',requests.length===0,requests);
 for(const contact of ['@qa_username','https://t.me/qa_username']){await page.fill('#scContact',contact);await submit.click();check(key+' accepts Telegram '+contact,await page.locator('#scSubmitStatus').isVisible()&&(new URL(await page.locator('#scMailtoFallback').getAttribute('href'))).searchParams.get('body').includes(contact));}
 await page.fill('#scProjectUrl','');await submit.click();check(key+' optional URL can be empty',await page.locator('#scSubmitStatus').isVisible());
 await page.uncheck('#scDataConsent');await submit.click();check(key+' consent required independently',await page.locator('#scDataConsent').getAttribute('aria-invalid')==='true'&&!await page.locator('#scSubmitStatus').isVisible());
 const policy=page.locator('.sc-contact__privacy-link');check(key+' privacy link target and rel',await policy.getAttribute('href')==='/privacy/'&&await policy.getAttribute('target')==='_blank'&&(await policy.getAttribute('rel')).includes('noopener'));
 const popupWait=page.waitForEvent('popup');await policy.click();const popup=await popupWait;await popup.waitForLoadState();check(key+' privacy opens new tab',new URL(popup.url()).pathname==='/privacy/');await popup.close();
 await page.locator('#scPhoneCountry').focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');check(key+' native country keyboard',await page.locator('#scPhoneCountry').inputValue()==='RU');
}
async function ctaClick(page,route,selector,source,mode='click'){
 await goto(page,url(route));
 if(selector.startsWith('#mobilePanel')){await page.setViewportSize({width:390,height:844});await page.locator('#menuToggle').click();}
 else await page.setViewportSize({width:1440,height:1000});
 if(selector.startsWith('#caseDialog'))await page.locator('#caseDialog').evaluate(d=>d.showModal());
 await eager(page);const a=page.locator(selector).first(),href=await a.getAttribute('href');await a.scrollIntoViewIfNeeded();
 if(mode==='keyboard'){await a.focus();await page.keyboard.press('Enter')}else await a.click();
 await page.waitForURL('**/get-started/');await page.waitForLoadState('networkidle');await eager(page);const passed=new URL(page.url()).pathname==='/get-started/'&&await page.locator('#projectRequestForm').isVisible();
 report.cta.push({route,selector,source,href,activation:mode,result:page.url(),pass:passed,modal:selector.startsWith('#caseDialog')?'preserved dialog opened programmatically':undefined});check('CTA '+route+' '+selector+' '+mode,passed&&href==='/get-started/');
}
async function scrollbarChecks(browser){
 for(const width of [390,1440]){
  const ctx=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await ctx.newPage();watch(page,'scrollbar-'+width);
  for(const route of ['/get-started/','/privacy/']){
   await goto(page,url(route));await eager(page);await page.addStyleTag({content:'html{scrollbar-gutter:stable}::-webkit-scrollbar{width:15px}'});await pause(200);
   const geometry=await page.locator('.works-surface').evaluate(e=>{const r=e.getBoundingClientRect(),layoutWidth=document.documentElement.getBoundingClientRect().width;return{layoutWidth,clientWidth:document.documentElement.clientWidth,innerWidth,scrollWidth:document.documentElement.scrollWidth,left:r.left,right:layoutWidth-r.right,scrollbar:innerWidth-layoutWidth}});
   check(width+route+' 15px scrollbar no overflow / symmetric outer hero',geometry.scrollbar===15&&geometry.scrollWidth<=geometry.layoutWidth&&Math.abs(geometry.left-geometry.right)<1,geometry);
  }
  await ctx.close();
 }
}
async function shellTypography(browser){
 const selectors=['#floatingHeader','#floatingHeader .brand-name','#floatingHeader .brand-note','#floatingHeader .header-links','#floatingHeader > .nav-cta','#contact .brand-name'];
 const metrics=page=>page.evaluate(selectors=>Object.fromEntries(selectors.map(selector=>{
  const e=document.querySelector(selector),s=getComputedStyle(e),r=e.getBoundingClientRect();
  return[selector,{fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,letterSpacing:s.letterSpacing,lineHeight:s.lineHeight,width:r.width,height:r.height}];
 })),selectors);
 for(const width of [320,390,768,1024,1440,2560])for(const reducedMotion of ['reduce','no-preference']){
  const key=width+'-'+reducedMotion,ctx=await browser.newContext({viewport:{width,height:1000},reducedMotion});
  const page=await ctx.newPage();watch(page,'shell '+key);await goto(page,url('/raboty/'));
  const expected=await metrics(page);
  for(const route of ['/get-started/','/privacy/']){
   await goto(page,url(route));const actual=await metrics(page);
   for(const selector of selectors){
    const before=expected[selector],after=actual[selector];
    check(key+route+' shared shell typography '+selector,Object.keys(before).every(property=>typeof before[property]==='number'?Math.abs(before[property]-after[property])<0.1:before[property]===after[property]),{expected:before,actual:after});
   }
   check(key+route+' content retains Manrope',await page.locator('main').evaluate(e=>getComputedStyle(e).fontFamily.startsWith('Manrope')));
   if(reducedMotion==='reduce'&&[390,1440].includes(width)){
    if(route==='/get-started/')await compareReference(page,ctx,width);
    await page.screenshot({path:path.join(dir,(route==='/privacy/'?'privacy':'get-started')+'-'+width+'.png')});
   }
  }
  await ctx.close();console.log('Shell '+key);
 }
}
(async()=>{
 const browser=await chromium.launch({headless:true});let completed=false;
 try{
  if(shellOnly){await shellTypography(browser);completed=true;return;}
  if(carouselOnly){
   for(const width of [1440,2560])for(const reducedMotion of ['reduce','no-preference']){
    const key=width+'-'+reducedMotion,ctx=await browser.newContext({viewport:{width,height:1000},reducedMotion});await instrument(ctx);const page=await ctx.newPage();watch(page,key);await goto(page,url('/get-started/'));await eager(page);await carousel(page,ctx,key,width,reducedMotion==='reduce');await ctx.close();console.log('Carousel rerun '+key);
   }
   await scrollbarChecks(browser);completed=true;return;
  }
  for(const width of [320,390,768,1024,1440,2560])for(const reducedMotion of ['reduce','no-preference']){
   const key=width+'-'+reducedMotion,ctx=await browser.newContext({viewport:{width,height:1000},reducedMotion,hasTouch:width<=768});await instrument(ctx);const page=await ctx.newPage();watch(page,key);
   for(const route of ['/get-started/','/privacy/']){
    await goto(page,url(route));await eager(page);
    const data=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,header:document.querySelectorAll('#floatingHeader').length,footer:document.querySelectorAll('#contact').length,lenis:window.__caseLenis,script:[...document.scripts].map(e=>e.getAttribute('src')).filter(Boolean)}));report.viewports.push({key,route,...data});
    check(key+route+' no overflow',data.scrollWidth<=width,{scrollWidth:data.scrollWidth,width});check(key+route+' single shell / scroll / menu owner',data.header===1&&data.footer===1&&data.lenis.live===(reducedMotion==='reduce'?0:1)&&data.lenis.max<=1&&data.script.filter(s=>s.endsWith('/site-header.js')).length===1&&!data.script.some(s=>s.endsWith('/main.js')));
    check(key+route+' all images loaded',await page.locator('img[src]').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0)));
    if(reducedMotion==='reduce'&&[390,1440].includes(width))await page.screenshot({path:path.join(dir,(route==='/privacy/'?'privacy':'get-started')+'-'+width+'.png')});
    if(route==='/get-started/'){
     const geometry=await page.locator('#relatedViewport').evaluate(e=>{const r=e.getBoundingClientRect(),c=e.querySelector('.case-card').getBoundingClientRect();return{width:r.width,card:c.width,gap:parseFloat(getComputedStyle(e.querySelector('.related-work__track')).gap)}}),columns=width<=650?1:width<=1180?2:3;
     check(key+' responsive '+columns+' cards',Math.abs((geometry.width-(columns-1)*geometry.gap)/columns-geometry.card)<1,geometry);check(key+' six real cards',await page.locator(original).count()===6);
     if(reducedMotion==='reduce'&&[390,1440].includes(width))await compareReference(page,ctx,width);
     if([390,1440].includes(width))await carousel(page,ctx,key,width,reducedMotion==='reduce');
     if([320,390,768,1440].includes(width)&&reducedMotion==='reduce')await formChecks(page,key);
    }
   }
   await ctx.close();console.log('Finished '+key);
  }
  const ctx=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await instrument(ctx);const page=await ctx.newPage();watch(page,'CTA');
  await scrollbarChecks(browser);
  for(const route of routes){
   const source=route==='/'?'templates/pages/home.html':route==='/raboty/'?'templates/pages/works.html':'templates/pages/case.html';
   await ctaClick(page,route,'#floatingHeader > .nav-cta','templates/partials/header.html');await ctaClick(page,route,'#mobilePanel a[href="/get-started/"]','templates/partials/header.html');await ctaClick(page,route,'.sc-footer__cta','templates/partials/footer.html');
   await ctaClick(page,route,route==='/'?'.main-cta':route==='/raboty/'?'.catalog-intro__cta':'.sc-case-process__cta-button',source,'keyboard');
   if(route!=='/')await ctaClick(page,route,'#caseDialog .case-dialog__cta',source);console.log('CTA finished '+route);
  }
  for(const reducedMotion of ['reduce','no-preference'])for(const route of ['/get-started/','/privacy/'])for(const selector of ['#floatingHeader > .nav-cta','#mobilePanel a:last-child','.sc-footer__cta']){
   await page.emulateMedia({reducedMotion});await page.setViewportSize({width:selector.startsWith('#mobilePanel')?390:1440,height:1000});await goto(page,url(route));
   await eager(page);if(route==='/get-started/')await page.fill('#scClientName','Preserve QA');
   if(selector.startsWith('#mobilePanel'))await page.locator('#menuToggle').click();
   const a=page.locator(selector),href=await a.getAttribute('href');await a.click();await pause(reducedMotion==='reduce'?200:1800);await page.waitForLoadState('networkidle');await eager(page);
   const passed=new URL(page.url()).pathname==='/get-started/'&&new URL(page.url()).hash==='#request'&&(route!=='/get-started/'||await page.locator('#scClientName').inputValue()==='Preserve QA');report.cta.push({route,selector,source:selector.includes('footer')?'templates/partials/footer.html':'templates/partials/header.html',href,activation:'click '+reducedMotion,result:page.url(),pass:passed});check(route+' '+selector+' '+reducedMotion+' request preserves state',passed);
  }
  await goto(page,url('/get-started/'));await eager(page);const first=page.locator(original+' a').first(),destination=await first.getAttribute('href');await first.focus();await page.keyboard.press('Enter');await page.waitForURL('**'+destination);await page.waitForLoadState('networkidle');await eager(page);check('work card Enter navigates actual case',await page.locator('#caseTitle').isVisible()&&!await page.locator('#caseDialog[open]').count());
  await goto(page,url('/get-started/'));await eager(page);const popupWait=ctx.waitForEvent('page');await page.locator(original+' a').first().click({modifiers:['Control']});const popup=await popupWait;await popup.waitForURL('**'+destination);await popup.waitForLoadState('networkidle');check('work card Ctrl-click new tab',new URL(popup.url()).pathname===destination&&new URL(page.url()).pathname==='/get-started/');await popup.close();
  await goto(page,url('/raboty/'));check('catalog all six anchor details / preserved modal',await page.locator('.case-grid .case-card__open').evaluateAll(a=>a.length===6&&a.every(e=>e.tagName==='A'&&/^\/raboty\/[^/]+\/$/.test(e.getAttribute('href'))))&&await page.locator('#caseDialog').count()===1);
  const catalog=await page.locator('.case-grid .case-card').evaluateAll(cards=>cards.map(e=>({title:e.querySelector('h2').textContent,description:e.querySelector('.case-card__body p').textContent,tags:[...e.querySelectorAll('.tag')].map(t=>t.textContent),href:e.querySelector('a').getAttribute('href'),src:e.querySelector('img').getAttribute('src')})));
  await goto(page,url('/get-started/'));const generated=await page.locator(original).evaluateAll(cards=>cards.map(e=>({title:e.querySelector('h2,h3').textContent,description:e.querySelector('.case-card__body p').textContent,tags:[...e.querySelectorAll('.tag')].map(t=>t.textContent),href:e.querySelector('a').getAttribute('href'),src:e.querySelector('img').getAttribute('src')})));
  check('all six carousel titles descriptions two tags images routes match current catalog',JSON.stringify(catalog)===JSON.stringify(generated),{catalog,generated});
  for(let i=0;i<6;i++){
   await goto(page,url('/get-started/'));await eager(page);const a=page.locator(original+' a').nth(i);await a.focus();await a.locator(i%2?'h2,h3':'.case-card__image').click();await page.waitForURL('**'+catalog[i].href);await page.waitForLoadState('networkidle');await eager(page);check('carousel actual '+(i%2?'title':'image')+' click '+catalog[i].href,await page.locator('#caseTitle').isVisible()&&!await page.locator('#caseDialog[open]').count());
  }
  await goto(page,url('/raboty/'));await eager(page);const ctaPopupWait=ctx.waitForEvent('page');await page.locator('#floatingHeader > .nav-cta').click({modifiers:['Control']});const ctaPopup=await ctaPopupWait;await ctaPopup.waitForURL('**/get-started/');await ctaPopup.waitForLoadState('networkidle');const ctaPopupPass=new URL(ctaPopup.url()).pathname==='/get-started/'&&new URL(page.url()).pathname==='/raboty/';check('Header CTA Ctrl-click opens form new tab',ctaPopupPass);report.cta.push({route:'/raboty/',selector:'#floatingHeader > .nav-cta',source:'templates/partials/header.html',href:'/get-started/',activation:'Ctrl-click',result:ctaPopup.url(),pass:ctaPopupPass});await ctaPopup.close();
  await ctx.close();await shellTypography(browser);completed=true;
 }finally{
  await browser.close();check('all scenarios completed',completed);check('no browser JavaScript / HTTP / resource errors',report.errors.length===0,report.errors);report.pass=report.checks.every(c=>c.pass);fs.writeFileSync(path.join(dir,shellOnly?'shell-report.json':carouselOnly?'carousel-report.json':'report.json'),JSON.stringify(report,null,2)+'\n');console.log(report.checks.filter(c=>c.pass).length+'/'+report.checks.length+' passed; '+report.cta.length+' CTA activations');if(!report.pass)process.exitCode=1;
 }
})().catch(e=>{console.error(e);process.exitCode=1});
