/* Real browser acceptance for shared shell and Works. Uses the existing local Playwright installation. */
const fs=require('node:fs/promises'),path=require('node:path');
const pw=require(require.resolve('playwright',{paths:[process.cwd(),process.env.USERPROFILE||'']}));
const root=process.cwd(),base=process.env.SYNTHECORE_URL||'http://127.0.0.1:4181/';
const dir=path.join(root,'output/v62-on-v27/catalog');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const report={date:new Date().toISOString(),url:base,checks:[],measurements:[]};
function check(name,pass,data){report.checks.push({name,pass:!!pass,...(data===undefined?{}:{data})});console.log(`${pass?'PASS':'FAIL'} ${name}`);}
async function instrument(context){
 await context.addInitScript(()=>{
  window.__lenisCounts={live:0,max:0,created:0};let ctor;
  Object.defineProperty(window,'Lenis',{configurable:true,get:()=>ctor,set:value=>{
   ctor=new Proxy(value,{construct(target,args,newTarget){const instance=Reflect.construct(target,args,newTarget),c=window.__lenisCounts;
    c.live++;c.created++;c.max=Math.max(c.max,c.live);const destroy=instance.destroy.bind(instance);let dead=false;
    instance.destroy=(...args)=>{if(!dead){dead=true;c.live--;}return destroy(...args);};return instance;}});
  }});
 });
}
async function metrics(page){return page.evaluate(()=>{
 const rect=s=>document.querySelector(s)?.getBoundingClientRect().toJSON();
 const css=(s,k)=>getComputedStyle(document.querySelector(s))[k];
 return {header:rect('header'),headerCTA:rect('header>.nav-cta'),navSize:css('.header-links','fontSize'),navFont:css('.header-links','fontFamily'),
  footerTitleSize:css('.sc-footer h2','fontSize'),footerNavSize:css('.sc-footer__nav a','fontSize'),footerFont:css('.sc-footer h2','fontFamily'),
  overflow:document.documentElement.scrollWidth-innerWidth,lenis:window.__lenisCounts,
  catalog:document.body.classList.contains('works-catalog')?{
   h1:css('#catalog-title','fontSize'),grid:css('.case-grid','gridTemplateColumns'),gap:css('.case-grid','gap'),
   card:rect('.case-card'),radius:css('.case-card','borderRadius'),title:css('.case-card h2','fontSize'),copy:css('.case-card__body p','fontSize'),weight:css('.case-card__body p','fontWeight'),tag:css('.tag','fontSize'),link:css('.case-card__more','fontSize'),
   shadowDuration:css('.case-card','transitionDuration'),arrow:rect('.case-card__more .arrow'),scroll:window.__synthecoreWorksScrollQA?.getState()
  }:null};
 });}
async function shot(page,name){await page.screenshot({path:path.join(dir,name+'.png')});}
async function footerCheck(page,label,width){
 await page.locator('#contact').scrollIntoViewIfNeeded();await pause(3000);
 const waves=await page.locator('#roveiaWaveBg .rwb-layer').evaluateAll(nodes=>nodes.map(n=>({h:n.offsetHeight,blur:getComputedStyle(n).filter,d:n.querySelector('path').getAttribute('d')})));
 await pause(200);
 const next=await page.locator('#roveiaWaveBg path').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d')));
 check(`${label} exactly three v12 waves and heights`,waves.length===3&&waves.every((n,i)=>n.h===[600,500,350][i]+(width<=600?50:0)),waves.map(n=>({h:n.h,blur:n.blur})));
 check(`${label} waves move in viewport`,waves.length===3&&waves.every((n,i)=>n.d!==next[i]));
 const intro=await page.locator('.sc-footer__intro').evaluate(n=>({opacity:getComputedStyle(n).opacity,transform:getComputedStyle(n).transform,duration:getComputedStyle(n).transitionDuration,cls:n.className,cta:n.querySelector('.sc-footer__cta').getBoundingClientRect().height}));
 check(`${label} CTA v12 visible with .92s scale/opacity reveal`,intro.opacity==='1'&&intro.duration==='0.92s, 0.92s'&&intro.cls.includes('sc12-cta-enter-visible')&&intro.cta===52,intro);
 if([390,1440,1920].includes(width))await shot(page,`${label}-footer`);
 // Re-enter after leaving: reveal does not reset; waves must stop outside the viewport.
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await pause(500);
 const stopped=await page.locator('#roveiaWaveBg path').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d')));
 await pause(180);
 check(`${label} waves sleep away from footer`,JSON.stringify(stopped)===JSON.stringify(await page.locator('#roveiaWaveBg path').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d')))));
 check(`${label} CTA stays revealed once`,await page.locator('.sc-footer__intro').evaluate(n=>n.classList.contains('sc12-cta-enter-visible')));
}
async function modalCheck(page,label){
 for(const [index,button] of (await page.locator('.case-card__open').all()).entries()){
  await button.click();await pause(80);
  check(`${label} dialog ${index+1} content`,await page.locator('#caseDialog').evaluate(n=>n.open&&n.querySelector('#dialogDescription').textContent.length>30));
  const y=await page.evaluate(()=>scrollY);await page.mouse.wheel(0,400);await pause(250);
  check(`${label} dialog ${index+1} locks document`,Math.abs(y-await page.evaluate(()=>scrollY))<2);
  await page.keyboard.press('Escape');
  const project=await button.getAttribute('data-project');
  await page.waitForFunction(id=>{
    const n=document.querySelector(`.case-card__open[data-project="${id}"]`);
    return document.activeElement===n&&!document.querySelector('#caseDialog').open&&!document.documentElement.classList.contains('sc-dialog-open');
  },project,{timeout:2000});
  check(`${label} dialog ${index+1} ESC restores focus/unlocks`,true);
 }
}
(async()=>{
 await fs.mkdir(dir,{recursive:true});const browser=await pw.chromium.launch({headless:true});
 try {
 for(const [width,height] of [[320,568],[390,844],[768,1024],[990,900],[1440,900],[1920,1080],[2560,1440]]){
  for(const route of ['/','/raboty/']){
   const name=route==='/'?'home':'works',label=`${name}-${width}`;
   const context=await browser.newContext({viewport:{width,height},hasTouch:width<=768,isMobile:width<=540});await instrument(context);
   const page=await context.newPage(),errors=[],failures=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
   const response=await page.goto(new URL(route,base).href,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);await pause(1550);
   if(name==='home')await page.waitForFunction(()=>window.__synthecoreScrollQA?.getState().ready);
   const m=await metrics(page);report.measurements.push({route,width,height,...m});
   check(`${label} direct route loads`,response.status()===200);
   check(`${label} header height`,m.header.height===(width<=540?62:width<=850?66:56),m.header);
   check(`${label} no horizontal overflow`,m.overflow<=1,m.overflow);
   check(`${label} UI typography`,m.navSize==='16px'&&m.navFont.includes('Manrope')&&m.footerNavSize==='16px'&&m.footerFont.includes('Manrope'));
   const expectedLenis=1;
   check(`${label} one scroll owner`,m.lenis.live===expectedLenis&&m.lenis.max<=1,m.lenis);
   if(width>850)check(`${label} header CTA 40px`,m.headerCTA.height===40,m.headerCTA);
   if([390,1440,1920].includes(width))await shot(page,`${label}-top`);
   if(width<=850){
    await page.locator('#menuToggle').click();check(`${label} menu opens`,await page.locator('#mobilePanel').isVisible());
    if(width===390)await shot(page,`${label}-menu`);
    await page.locator('#mobilePanel a').first().focus();await page.keyboard.press('Escape');
    check(`${label} menu ESC restores focus`,await page.locator('#menuToggle').evaluate(n=>document.activeElement===n&&n.getAttribute('aria-expanded')==='false'));
    await page.locator('#menuToggle').click();await page.mouse.click(2,height-5);
    check(`${label} menu closes outside`,await page.locator('#mobilePanel').isHidden());
   }
   if(name==='works'){
    const c=m.catalog,cols=c.grid.split(' ').length;
    check(`${label} grid 3/2/1`,cols===(width>1180?3:width>680?2:1),c);
    check(`${label} title/copy type`,c.title===(width<=650?'22px':'24px')&&c.copy===(width<=650?'14px':'16px')&&c.weight==='500');
    check(`${label} arrows 20px`,c.arrow.width===20&&c.arrow.height===20,c.arrow);
    check(`${label} v27 hover timings`,c.shadowDuration==='0.64s, 0.82s',c.shadowDuration);
    if(width>=1440)check(`${label} approved full desktop geometry`,Math.abs(c.card.width-412)<1&&Math.abs(c.card.height-451)<1&&c.h1==='70px'&&m.footerTitleSize==='70px'&&c.radius==='24px'&&c.gap==='16px',c);
    await page.locator('.case-grid').scrollIntoViewIfNeeded();await pause(1300);
    if([390,1440,1920].includes(width))await shot(page,`${label}-grid`);
    if(width===1920){
     const card=page.locator('.case-card').first();await page.mouse.move(2,2);await pause(900);
     await shot(page,`${label}-normal`);
     await card.hover();await pause(950);await shot(page,`${label}-hover`);
     const hover=await card.evaluate(n=>({transform:getComputedStyle(n).transform,color:getComputedStyle(n.querySelector('.case-card__more')).color,arrow:getComputedStyle(n.querySelector('.arrow')).transform,image:getComputedStyle(n.querySelector('img')).transform}));
     check(`${label} stationary orange arrow/no zoom/3px lift`,hover.transform==='matrix(1, 0, 0, 1, 0, -3)'&&hover.color==='rgb(228, 77, 31)'&&hover.arrow==='none'&&hover.image==='none',hover);
     check(`${label} no cursor-follow badge`,await page.locator('[class*="cursor"],[id*="cursor"]').count()===0);
     await page.mouse.move(2,2);await pause(900);await page.locator('.case-card--prostor').scrollIntoViewIfNeeded();await pause(1200);await shot(page,`${label}-prostor`);
     await modalCheck(page,label);
    }
    if(width===390||width===320){await modalCheck(page,label);}
    for(const card of await page.locator('.case-card').all()){await card.scrollIntoViewIfNeeded();await pause(120);}
    await pause(1300);
    check(`${label} all six cards reveal once`,await page.evaluate(()=>window.__synthecoreWorksScrollQA.getState().pending===0));
    if(width===1440){
     const anchor=page.locator('.header-links a[href="#contact"]');await anchor.focus();await page.keyboard.press('Enter');await pause(1650);
     check(`${label} keyboard anchor transfers focus`,await page.locator('#contact').evaluate(n=>document.activeElement===n));
     await page.keyboard.press('Tab');check(`${label} next Tab reaches footer CTA`,await page.locator('.sc-footer__cta').evaluate(n=>document.activeElement===n));
     await page.locator('.sc-footer__nav a[href="/#services"]').click();await page.waitForURL('**/#services');await page.waitForFunction(()=>window.__synthecoreScrollQA?.getState().ready);
     check(`${label} cross-page Services route`,await page.locator('#services').count()===1);
     await page.locator('.header-links a[href="/raboty/"]').click();await page.waitForURL('**/raboty/');await page.reload({waitUntil:'load'});await pause(1000);
     check(`${label} Works nav and refresh`,await page.locator('#catalog-title').count()===1);
    }
   } else {
    const faq=page.locator('.sc-faq__question').first();await faq.click();await pause(600);
    check(`${label} FAQ preserved`,await faq.getAttribute('aria-expanded')==='true');await faq.click();
   }
   await footerCheck(page,label,width);
   check(`${label} no runtime/network errors`,errors.length===0&&failures.length===0,{errors,failures});
   await context.close();
  }
 }
 for(const route of ['/','/raboty/']){
  const label=route==='/'?'home-reduced':'works-reduced';
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await instrument(context);const page=await context.newPage();
  await page.goto(new URL(route,base).href);await pause(600);
  check(`${label} native scrolling`,await page.evaluate(()=>window.__lenisCounts.live===0));
  check(`${label} centered header`,await page.locator('header').evaluate(n=>Math.abs(n.getBoundingClientRect().left+n.offsetWidth/2-innerWidth/2)<1));
  await page.locator('#contact').scrollIntoViewIfNeeded();await pause(200);const d=await page.locator('#roveiaWaveBg path').evaluateAll(ns=>ns.map(n=>n.getAttribute('d')));await pause(200);
  check(`${label} static waves`,d.length===3&&JSON.stringify(d)===JSON.stringify(await page.locator('#roveiaWaveBg path').evaluateAll(ns=>ns.map(n=>n.getAttribute('d')))));
  check(`${label} CTA immediately visible`,await page.locator('.sc-footer__intro').evaluate(n=>getComputedStyle(n).opacity==='1'));
  await shot(page,label+'-footer');await context.close();
 }
 // A live preference change must destroy/recreate Lenis once and stop moving waves.
 const context=await browser.newContext({viewport:{width:1440,height:900}});await instrument(context);const page=await context.newPage();await page.goto(new URL('/raboty/',base).href);await pause(900);
 await page.emulateMedia({reducedMotion:'reduce'});await pause(250);check('works live reduced-motion destroys Lenis',await page.evaluate(()=>window.__lenisCounts.live===0&&window.__synthecoreWorksScrollQA.getState().pending===0));
 await page.emulateMedia({reducedMotion:'no-preference'});await pause(300);check('works live motion resumes with one owner',await page.evaluate(()=>window.__lenisCounts.live===1&&window.__lenisCounts.max===1));await context.close();
 }finally{await browser.close();}
 report.total=report.checks.length;report.failed=report.checks.filter(c=>!c.pass).length;
 await fs.writeFile(path.join(dir,'browser-report.json'),JSON.stringify(report,null,2));
 console.log(`RESULT ${report.total-report.failed}/${report.total}`);if(report.failed)process.exitCode=1;
})().catch(async e=>{console.error(e);report.error=e.stack;await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'browser-report.json'),JSON.stringify(report,null,2));process.exitCode=1;});
