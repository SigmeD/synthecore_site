// Focus, responsive rail and accordion regressions reproduced on the real site.
const fs=require('node:fs/promises');
const path=require('node:path');
const pw=require(require.resolve('playwright',{paths:[process.cwd(),process.env.USERPROFILE||'']}));
const phase=process.argv.find(a=>a.startsWith('--phase='))?.split('=')[1]||'after';
const url=process.env.SYNTHECORE_URL||'http://127.0.0.1:4174/';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const report={date:new Date().toISOString(),phase,checks:[]};
const check=(message,pass,data)=>{report.checks.push({message,pass:!!pass,data});console.log((pass?'PASS ':'FAIL ')+message);};
async function open(page){await page.goto(url,{waitUntil:'load'});await page.waitForFunction(()=>window.__synthecoreScrollQA?.getState().ready);await pause(700);}
(async()=>{
 const browser=await pw.chromium.launch({headless:true});
 try {
  const context=await browser.newContext({viewport:{width:850,height:900}}),page=await context.newPage();
  await open(page);
  await page.locator('[data-services-next]').click();await pause(700);
  const before=await page.locator('.sc-services__viewport').evaluate(n=>n.scrollLeft);
  await page.setViewportSize({width:1000,height:900});await pause(1000);
  const after=await page.evaluate(()=>window.__synthecoreServicesQA.getState());
  check('native rail offset clears when entering pin',before>0 && after.mode==='pinned-horizontal' && after.scrollLeft===0,{before,after});
  await open(page);
  await page.evaluate(()=>{scrollTo({top:ScrollTrigger.getById('sc-services-pin').start,behavior:'instant'});});await pause(600);
  await page.locator('.sc-service-card').last().focus();await pause(1300);
  const focus=await page.evaluate(()=>{const n=document.querySelector('.sc-service-card:last-child'),r=n.getBoundingClientRect();return{...window.__synthecoreServicesQA.getState(),rect:{left:r.left,right:r.right},width:innerWidth};});
  check('keyboard focuses last Services card through pin progress',focus.scrollLeft===0 && focus.rect.left>=-2 && focus.rect.right<=focus.width+2,focus);
  await page.setViewportSize({width:1440,height:900});await open(page);
  await page.locator('.sc-testimonial').last().focus();await pause(1500);
  const review=await page.locator('.sc-testimonial').last().evaluate(n=>{const r=n.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight,sceneScroll:document.querySelector('.sc-testimonials__scene').scrollLeft,railScroll:document.querySelector('.sc-testimonials__cards').scrollLeft,state:window.__synthecoreTestimonialsQA.getState()};});
  check('keyboard focuses last scroll-stream review visibly',review.sceneScroll===0 && review.railScroll===0 && review.left>=-1 && review.right<=review.width+1 && review.top<review.height && review.bottom>0,review);
  await open(page);
  await page.evaluate(()=>{window.__v60Refreshes=0;ScrollTrigger.addEventListener('refresh',()=>window.__v60Refreshes++);});
  await page.locator('.sc-faq__question').first().click();await pause(1200);
  const refreshes=await page.evaluate(()=>window.__v60Refreshes);
  check('FAQ expansion refreshes scroll geometry',refreshes>0,refreshes);
  await context.close();
  const mobile=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const phone=await mobile.newPage();await open(phone);
  await phone.locator('#menuToggle').tap();await phone.locator('#mobilePanel a').first().focus();await phone.keyboard.press('Escape');
  check('Escape restores focus from hidden menu',await phone.locator('#menuToggle').evaluate(n=>document.activeElement===n));
  await mobile.close();
 }finally{await browser.close();}
 const dir=path.resolve(__dirname,'../output/playwright/v60/regressions');await fs.mkdir(dir,{recursive:true});
 await fs.writeFile(path.join(dir,phase+'.json'),JSON.stringify(report,null,2));
 if(report.checks.some(c=>!c.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
