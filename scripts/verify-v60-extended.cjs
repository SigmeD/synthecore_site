// Cross-engine, real touch input, delayed-resource and focus/resize stress probes.
const fs=require('node:fs/promises'),path=require('node:path');
const pw=require(require.resolve('playwright',{paths:[process.cwd(),process.env.USERPROFILE||'']}));
const url=process.env.SYNTHECORE_URL||'http://127.0.0.1:4174/';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const out=path.resolve(__dirname,'../output/playwright/v60/extended');
const report={date:new Date().toISOString(),cases:[]};
const selectedEngine=process.argv.find(a=>a.startsWith('--engine='))?.split('=')[1];
const selectedWidth=Number(process.argv.find(a=>a.startsWith('--width='))?.split('=')[1])||null;
const reportName=selectedEngine?'report-'+selectedEngine+(selectedWidth?'-'+selectedWidth:'')+'.json':'report.json';
function check(entry,message,pass,data){entry.checks.push({message,pass:!!pass,data});}
async function open(page){await page.goto(url,{waitUntil:'load'});await page.waitForFunction(()=>window.__synthecoreScrollQA?.getState().ready);await pause(700);}
async function swipe(page,selector){
 const rect=await page.locator(selector).boundingBox(),cdp=await page.context().newCDPSession(page);
 const y=Math.max(120,Math.min(rect.y+rect.height/2,700)),start=Math.min(350,rect.x+rect.width-20);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start,y}]});
 for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start-i*22,y}]});await pause(20);}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pause(600);await cdp.detach();
}
(async()=>{
 await fs.mkdir(out,{recursive:true});
 for(const engine of ['chromium','firefox','webkit'].filter(e=>!selectedEngine||e===selectedEngine)) {
  let browser;
  try{browser=await pw[engine].launch({headless:true});}catch(e){report.cases.push({engine,status:'BLOCKED',reason:String(e)});continue;}
  try{
   for(const [width,height] of [[1440,900],[390,844]].filter(s=>!selectedWidth||s[0]===selectedWidth)) {
    const entry={engine,version:browser.version(),viewport:width+'x'+height,checks:[],errors:[]};report.cases.push(entry);
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:width===390,...(engine!=='firefox'?{isMobile:width===390}:{})});
    const page=await context.newPage();page.on('pageerror',e=>entry.errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)entry.errors.push(r.status()+' '+r.url());});
    try{
     await open(page);
     check(entry,'engine ready',await page.evaluate(()=>window.__synthecoreScrollQA.getState().ready));
     const max=await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
     await page.mouse.move(5,5);
     const mobileWebKit=engine==='webkit'&&width===390;
     let last=0;for(let i=0;i<100;i++){if(mobileWebKit)await page.evaluate(h=>scrollBy({top:h,behavior:'instant'}),height);else await page.mouse.wheel(0,height);await pause(100);last=await page.evaluate(()=>scrollY);if(max-last<3)break;}
     await pause(1500);check(entry,mobileWebKit?'native scroll reaches footer (mobile WebKit has no wheel API)':'wheel reaches footer',await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight-scrollY<3));
     await page.screenshot({path:path.join(out,engine+'-'+width+'-footer.jpg'),type:'jpeg',quality:65});
     await page.keyboard.press('Home');await pause(900);
     // Full seven-question keyboard accordion with real layout changes.
     for(let i=0;i<7;i++) {const q=page.locator('.sc-faq__question').nth(i);await q.focus();await q.press('Enter');await pause(550);check(entry,'FAQ keyboard opens '+i,await q.getAttribute('aria-expanded')==='true');await q.press('Enter');await pause(550);}
     for(const [w,h] of [[850,900],[851,900],[1199,799],[1200,800],[width,height]]) {await page.setViewportSize({width:w,height:h});await pause(500);}
     const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,pins:ScrollTrigger.getAll().filter(t=>t.vars.pin).length,spacers:document.querySelectorAll('.pin-spacer').length,ids:ScrollTrigger.getAll().map(t=>t.vars.id)}));
     check(entry,'responsive pins have no duplicate ids/spacers',geometry.pins===geometry.spacers && new Set(geometry.ids).size===geometry.ids.length,geometry);
     check(entry,'no horizontal document overflow',geometry.overflow<=1,geometry.overflow);
     if(engine==='chromium'&&width===390){
      await page.locator('.sc-services__viewport').scrollIntoViewIfNeeded();await pause(500);await swipe(page,'.sc-services__viewport');
      check(entry,'real touch swipe scrolls Services rail',await page.locator('.sc-services__viewport').evaluate(n=>n.scrollLeft>50));
      await page.locator('.sc-testimonials__cards').scrollIntoViewIfNeeded();await pause(500);await swipe(page,'.sc-testimonials__cards');
      check(entry,'real touch swipe scrolls Reviews rail',await page.locator('.sc-testimonials__cards').evaluate(n=>n.scrollLeft>50));
     }
     await page.emulateMedia({reducedMotion:'reduce'});await pause(800);
     const reduced=await page.evaluate(()=>({pins:ScrollTrigger.getAll().filter(t=>t.vars.pin).length,hero:window.__synthecoreScrollQA.getState().engine,paused:[...document.querySelectorAll('.sc-footer__wave svg')].every(n=>n.animationsPaused()&&getComputedStyle(n).animationName==='none')}));
     check(entry,'reduced motion native and static waves',reduced.pins===0 && reduced.hero==='native-reduced-motion' && reduced.paused,reduced);
     check(entry,'no JS or HTTP errors',entry.errors.length===0,entry.errors);
     await page.screenshot({path:path.join(out,engine+'-'+width+'-reduced.jpg'),type:'jpeg',quality:65});
    }catch(e){entry.errors.push(String(e));check(entry,'probe completed',false,String(e));}
    entry.pass=entry.checks.every(c=>c.pass);await context.close();
    console.log(engine+' '+width+'x'+height+': '+(entry.pass?'PASS':'FAIL'));
    await fs.writeFile(path.join(out,reportName),JSON.stringify(report,null,2));
   }
   if(engine==='chromium') {
    const entry={engine,scenario:'delayed-images-and-fonts',checks:[],errors:[]};report.cases.push(entry);
    const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();page.on('pageerror',e=>entry.errors.push(String(e)));
    await page.route(/\.(?:png|webp|woff2?)(?:\?|$)/,async route=>{await pause(900);await route.continue();});
    await open(page);await pause(1000);
    check(entry,'Hero ready after delayed image decode',await page.evaluate(()=>window.__synthecoreScrollQA.getState().ready));
    check(entry,'late-loaded images decode',await page.locator('img').evaluateAll(ns=>ns.filter(n=>n.loading!=='lazy').every(n=>n.complete&&n.naturalWidth>0)));
    check(entry,'no initialization errors',entry.errors.length===0,entry.errors);
    entry.pass=entry.checks.every(c=>c.pass);await context.close();
   }
  }finally{await browser.close();}
 }
 report.pass=report.cases.every(c=>c.pass);await fs.writeFile(path.join(out,reportName),JSON.stringify(report,null,2));
 if(!report.pass)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
