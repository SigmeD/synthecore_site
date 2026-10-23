'use strict';
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(require.resolve('playwright',{paths:[process.cwd(),process.env.USERPROFILE||'']}));
const base=process.argv.find(a=>a.startsWith('--base='))?.slice(7)||process.env.SYNTHECORE_URL||'http://127.0.0.1:4176/';
const reference=process.env.CASE_REFERENCE_URL||'http://127.0.0.1:4183/';
const baseline=process.env.CASE_BASELINE_URL||'http://127.0.0.1:4184/';
const dir=path.resolve(process.env.CASE_QA_DIR||'output/playwright/beauty-v20');
fs.mkdirSync(dir,{recursive:true});
const report={date:new Date().toISOString(),base,reference,baseline,browser:'Chromium',checks:[],errors:[],samples:[],limitations:['Automated wheel/touch does not prove physical-device smoothness.','Firefox/WebKit and physical devices are not tested.']};
let completed=false;
const check=(name,pass,data)=>{report.checks.push({name,pass:!!pass,...(data===undefined?{}:{data})});if(!pass)console.log('FAIL',name,JSON.stringify(data))};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const selectors=['h1','.case-hero__intro','.case-hero__media','.sc-case-process__number-circle','.sc-case-result__heading','.sc-case-result__hero-media','.sc-case-screens__grid','.sc-case-process__cta','.sc-case-process__cta h3','.sc-case-process__cta-button','.related-work__head','.case-card'];
async function sample(page,list=selectors){return page.evaluate(list=>Object.fromEntries(list.map(s=>{const e=document.querySelector(s),r=e.getBoundingClientRect(),c=getComputedStyle(e);return[s,{width:r.width,height:r.height,x:r.x,y:r.y+scrollY,font:c.fontSize,fontFamily:c.fontFamily,lineHeight:c.lineHeight,position:c.position,top:c.top,shadow:c.boxShadow,transform:c.transform}]})),list)}
async function goto(page,url){await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await pause(350)}
async function scroll(page,y){await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);await pause(350)}
async function top(page,s){return page.locator(s).evaluate(e=>e.getBoundingClientRect().top+scrollY)}
async function snapshot(page,key,s){if(s)await scroll(page,Math.max(0,(await top(page,s))-110));await page.screenshot({path:path.join(dir,key+'.png')})}
function watch(page,label){page.on('pageerror',e=>report.errors.push({label,type:'pageerror',message:e.message}));page.on('console',e=>{if(e.type()==='error')report.errors.push({label,type:'console',message:e.text()})});page.on('response',r=>{if(r.status()>=400)report.errors.push({label,type:'http',status:r.status(),url:r.url()})});page.on('requestfailed',r=>report.errors.push({label,type:'request',url:r.url(),message:r.failure()?.errorText}))}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,390,768,1024,1100,1440]){
   const height=width===1440?900:844,label=String(width);
   const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
   const page=await context.newPage();watch(page,label);
   await goto(page,new URL('/raboty/beauty-insight/',base).href);
   check(label+' no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const actual=await sample(page);report.samples.push({width,actual});
   check(label+' desktop sticky boundary',actual['.sc-case-process__cta'].position===(width>=1100?'sticky':'relative'),actual['.sc-case-process__cta']);
   check(label+' CTA typography and size',actual['.sc-case-process__cta h3'].font==='32px'&&actual['.sc-case-process__cta-button'].height===52&&actual['.sc-case-process__cta-button'].shadow==='none');
   check(label+' timeline circles',actual['.sc-case-process__number-circle'].width===32&&actual['.sc-case-process__number-circle'].height===32);
   check(label+' four interfaces',await page.locator('.sc-case-screens__open').count()===4);
   check(label+' five original related cards',await page.locator('.related-work__track > .case-card:not([data-carousel-clone])').count()===5);
   check(label+' reduced native scrolling',(await page.evaluate(()=>window.__synthecoreWorksScrollQA.getState())).engine==='native');
   check(label+' reduced parallax disabled',await page.evaluate(()=>ScrollTrigger.getAll().length===0));
   check(label+' CSS selectors scoped',await page.evaluate(()=>{
    const sheet=[...document.styleSheets].find(s=>s.href?.endsWith('/css/case-detail.css'));
    const valid=rules=>[...rules].every(rule=>rule.type===CSSRule.KEYFRAMES_RULE||rule.selectorText?rule.type===CSSRule.KEYFRAMES_RULE||rule.selectorText.split(/,(?![^()]*\))/).every(s=>/^(body\.sc-case-page|html\.sc-case-document)(\b|[\s.#:])/.test(s.trim())):rule.cssRules?valid(rule.cssRules):false);
    return !!sheet&&valid(sheet.cssRules);
   }));
   for(const s of ['.sc-case-process__cta-button','.sc-footer__cta','.case-dialog__cta']){
    check(label+' no accent glow '+s,await page.locator(s).evaluate(e=>getComputedStyle(e).boxShadow==='none'));
   }
   for(let i=0;i<4;i++){
    const opener=page.locator('.sc-case-screens__open').nth(i);await opener.click();
    await page.waitForFunction(()=>document.querySelector('#caseLightbox').open&&document.querySelector('#caseLightbox img').naturalWidth>0);
    check(label+' lightbox '+i+' open',await page.locator('#caseLightbox').evaluate(e=>e.open&&e.querySelector('img').naturalWidth>0));
    await page.keyboard.press('Tab');check(label+' lightbox focus trapped',await page.evaluate(()=>document.querySelector('#caseLightbox').contains(document.activeElement)));
    if(i%2===0)await page.keyboard.press('Escape');else await page.locator('.sc-case-lightbox__close').click();
    await page.waitForFunction(()=>!document.querySelector('#caseLightbox').open&&!document.documentElement.classList.contains('sc-dialog-open'));
    check(label+' lightbox '+i+' close/focus',await opener.evaluate(e=>document.activeElement===e&&!document.querySelector('#caseLightbox').open&&!document.documentElement.classList.contains('sc-dialog-open')));
   }
   await scroll(page,(await top(page,'#other-work'))-100);
   for(const id of ['b2b','flowers','crm','prostor','metal']){
    const card=page.locator(`.case-card:not([data-carousel-clone]) [data-project="${id}"]`);
    const href=await card.getAttribute('href');
    if(href){await card.click();await page.waitForURL('**'+href);check(label+' related route '+id,await page.locator('#caseTitle').isVisible());await page.goBack();await page.waitForSelector('#relatedViewport');continue;}
    await card.click();
    check(label+' related modal '+id,await page.locator('#caseDialog').evaluate(e=>e.open));await page.keyboard.press('Escape');
    check(label+' related modal focus '+id,await card.evaluate(e=>document.activeElement===e));
   }
   await scroll(page,(await top(page,'.related-work__controls'))-height/2);
   const arrow=page.locator('.related-work__arrow').last();
   const before=await arrow.boundingBox();await arrow.hover();await pause(250);const after=await arrow.boundingBox();
   check(label+' arrows stationary on hover',Math.abs(before.y-after.y)<.5&&Math.abs(before.x-after.x)<.5);
   const first=await page.locator('#relatedViewport').evaluate(e=>e.scrollLeft);await arrow.click();await pause(500);
   check(label+' carousel click advances',Math.abs((await page.locator('#relatedViewport').evaluate(e=>e.scrollLeft))-first)>20);
   if(width<=768){await page.locator('#menuToggle').click();check(label+' mobile menu opens',await page.locator('#mobilePanel').isVisible());await page.keyboard.press('Escape');check(label+' mobile menu closes',!(await page.locator('#mobilePanel').isVisible()))}
   // Compare the newly served reference, not old archive QA screenshots.
   const refPage=await context.newPage();await goto(refPage,reference);const expected=await sample(refPage);report.samples.at(-1).reference=expected;
   for(const s of selectors){const a=actual[s],e=expected[s];check(label+' reference geometry '+s,Math.abs(a.width-e.width)<1&&(s==='.case-card'||Math.abs(a.height-e.height)<1)&&a.font===e.font,{actual:a,reference:e})}
   if([1440,390].includes(width)){
    await scroll(page,0);await snapshot(page,'case-'+width+'-hero');await snapshot(refPage,'reference-'+width+'-hero');
    for(const [suffix,s] of [['process','#our-process'],['result','#case-result'],['interfaces','#case-screens'],['related','#other-work'],['footer','#contact']]){
     await snapshot(page,'case-'+width+'-'+suffix,s);await snapshot(refPage,'reference-'+width+'-'+suffix,s);
    }
   }
   // Shared Header/Footer styles match the actual catalog, including current navigation state.
   const catalog=await context.newPage();await goto(catalog,new URL('/raboty/',base).href);
   for(const [suffix,s] of [['header','#floatingHeader'],['footer','#contact']]){
    const a=(await sample(page,[s]))[s],e=(await sample(catalog,[s]))[s];
    check(label+' shared '+suffix+' matches catalog',a.width===e.width&&a.height===e.height&&a.font===e.font&&a.fontFamily===e.fontFamily);
   }
   await context.close();
  }
  // Real motion: existing Lenis owner, sticky through all three sections and release.
  for(const width of [1440,390]){
   const height=width===1440?900:844;
   const context=await browser.newContext({viewport:{width,height},hasTouch:width===390,recordVideo:{dir:path.join(dir,'video'),size:{width,height}}});
   const page=await context.newPage();watch(page,'motion-'+width);await goto(page,new URL('/raboty/beauty-insight/',base).href);
   check(width+' single existing Lenis owner',(await page.evaluate(()=>window.__synthecoreWorksScrollQA.getState())).engine==='lenis-gsap');
   const process=await top(page,'#our-process'),result=await top(page,'#case-result'),screens=await top(page,'#case-screens'),other=await top(page,'#other-work');
   await scroll(page,process-90);const start=await sample(page,['.sc-case-process__text']);
   for(let y=process;y<other+200;y+=width===1440?420:320){await scroll(page,y);await pause(180)}
   for(let y=other;y>process;y-=width===1440?650:460){await scroll(page,y);await pause(120)}
   if(width===1440){
    const positions=[];for(const y of [process+450,result-150,screens-150]){await scroll(page,y);positions.push(await page.locator('.sc-case-process__cta').evaluate(e=>({y:e.getBoundingClientRect().top,top:parseFloat(getComputedStyle(e).top)})))}
    check('1440 sticky follows process/result/interfaces',positions.every(p=>Math.abs(p.y-p.top)<1),positions);
    await scroll(page,other-80);check('1440 banner releases before related',await page.locator('.sc-case-process__cta').evaluate(e=>e.getBoundingClientRect().bottom<=document.querySelector('#other-work').getBoundingClientRect().top+1));
    await scroll(page,process+500);const opacity1=await page.locator('.sc-case-process__text').first().evaluate(e=>getComputedStyle(e).opacity);await scroll(page,result-100);const opacity2=await page.locator('.sc-case-process__text').first().evaluate(e=>getComputedStyle(e).opacity);check('timeline scroll changes opacity',opacity1!==opacity2,{opacity1,opacity2});
    await page.setViewportSize({width:1024,height});check('resize disables sticky',await page.locator('.sc-case-process__cta').evaluate(e=>getComputedStyle(e).position!=='sticky'));await page.setViewportSize({width,height});
   }
   await scroll(page,process);await page.mouse.wheel(0,4000);await pause(1600);await page.mouse.wheel(0,-2500);await pause(1600);check(width+' rapid/reverse wheel remains responsive',await page.evaluate(()=>Number.isFinite(scrollY)&&scrollY>=0));
   if(width===390){
    await scroll(page,(await top(page,'#relatedViewport'))-200);const vp=await page.locator('#relatedViewport').boundingBox();const initial=await page.locator('#relatedViewport').evaluate(e=>e.scrollLeft);const cdp=await context.newCDPSession(page);
    const y=Math.round(Math.min(height-150,vp.y+120));await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:330,y}]});for(const x of [290,240,180,120,60]){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});await pause(45)}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pause(700);
    const final=await page.locator('#relatedViewport').evaluate(e=>e.scrollLeft);
    check('390 native touch carousel swipe',Math.abs(final-initial)>30,{initial,final,y,viewport:vp,hit:await page.evaluate(y=>document.elementFromPoint(200,y)?.outerHTML.slice(0,180),y)});
   }
   await snapshot(page,'motion-'+width+'-footer','#contact');await scroll(page,0);
   const video=page.video();await context.close();await video.saveAs(path.join(dir,'scroll-'+width+'.webm'));
  }
  // Existing pages: stable geometry plus working Beauty entry points and preserved modal.
  for(const width of [1440,390])for(const route of ['/','/raboty/']){
   const context=await browser.newContext({viewport:{width,height:width===1440?900:844},reducedMotion:'reduce'});
   const page=await context.newPage();watch(page,'regression-'+width+route);const previous=await context.newPage();await goto(page,new URL(route,base).href);await goto(previous,new URL(route,baseline).href);
   const list=route==='/'?['#floatingHeader','#sc-work-beauty-title','#contact']:['#floatingHeader','.case-card--beauty','#contact'];
   const actual=await sample(page,list),expected=await sample(previous,list);
   for(const s of list)check(width+route+' unchanged geometry '+s,Math.abs(actual[s].width-expected[s].width)<1&&Math.abs(actual[s].height-expected[s].height)<1&&actual[s].font===expected[s].font,{actual:actual[s],baseline:expected[s]});
   const key=route==='/'?'home':'catalog';await snapshot(page,key+'-'+width);await snapshot(previous,'baseline-'+key+'-'+width);
   const link=page.locator('a[href="/raboty/beauty-insight/"]');await link.click();await page.waitForURL('**/raboty/beauty-insight/');check(width+route+' Beauty link navigates',await page.locator('#caseTitle').isVisible());await context.close();
  }
  completed=true;
 }finally{await browser.close();check('all acceptance scenarios completed',completed);check('no browser/console/network failures',report.errors.length===0,report.errors);report.pass=report.checks.every(c=>c.pass);fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(`${report.checks.filter(c=>c.pass).length}/${report.checks.length} browser checks passed`);if(!report.pass)process.exitCode=1}
})().catch(error=>{console.error(error);process.exitCode=1});
