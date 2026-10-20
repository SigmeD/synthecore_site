const fs=require('node:fs/promises'),path=require('node:path');
const pw=require(require.resolve('playwright',{paths:[process.cwd(),process.env.USERPROFILE||'']}));
const root=path.resolve(__dirname,'..'),base=process.env.SYNTHECORE_URL||'http://127.0.0.1:4182/';
const dir=path.join(root,'output/playwright/works-v27/motion'),evidence=path.join(root,'docs/qa/works-v27');
const pause=ms=>new Promise(r=>setTimeout(r,ms)),report={date:new Date().toISOString(),checks:[]};
const check=(name,pass,data)=>{report.checks.push({name,pass:!!pass,data});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
(async()=>{
 await fs.mkdir(dir,{recursive:true});await fs.mkdir(evidence,{recursive:true});const browser=await pw.chromium.launch({headless:true});
 try{
  if(process.argv.includes('--diagnose')){
   for(const port of [4181,4182])for(const [width,height] of [[390,844],[1440,900]]){
    const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();await page.goto(`http://127.0.0.1:${port}/raboty/`);await pause(1500);
    await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await pause(3400);
    console.log(JSON.stringify(await page.evaluate(()=>{const n=document.querySelector('.sc-footer__fine');return{url:location.href,y:scrollY,max:document.documentElement.scrollHeight-innerHeight,vh:innerHeight,fine:n.getBoundingClientRect().toJSON(),opacity:getComputedStyle(n).opacity,classes:n.className,footer:document.querySelector('#contact').getBoundingClientRect().toJSON()};})));
    await context.close();
   }return;
  }
  const context=await browser.newContext({viewport:{width:1920,height:1080},recordVideo:{dir,size:{width:1440,height:810}}});const page=await context.newPage();
  await page.goto(new URL('/raboty/',base).href);await page.evaluate(()=>document.fonts.ready);await pause(1300);
  const b2b=page.locator('.case-card--b2b'),prostor=page.locator('.case-card--prostor');
  await b2b.scrollIntoViewIfNeeded();await page.mouse.move(5,5);await pause(1300);
  await b2b.screenshot({path:path.join(evidence,'b2b-normal.png')});await b2b.hover();await pause(1100);await b2b.screenshot({path:path.join(evidence,'b2b-hover.png')});
  await pause(1700);await page.mouse.move(5,5);await pause(1100);
  await prostor.scrollIntoViewIfNeeded();await pause(1200);await prostor.screenshot({path:path.join(evidence,'prostor-normal.png')});await prostor.hover();await pause(1100);await prostor.screenshot({path:path.join(evidence,'prostor-hover.png')});
  await page.mouse.move(5,5);await pause(1100);
  check('footer CTA starts pending',await page.locator('.sc-footer__intro').evaluate(n=>getComputedStyle(n).opacity==='0'&&getComputedStyle(n).transform==='matrix(0.8, 0, 0, 0.8, 0, 0)'));
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('.sc-footer__intro').classList.contains('sc12-cta-enter-visible'));
  await pause(100);
  const entering=await page.locator('.sc-footer__intro').evaluate(n=>({opacity:+getComputedStyle(n).opacity,transform:getComputedStyle(n).transform}));
  check('CTA animates opacity and scale without vertical translation',entering.opacity>0&&entering.opacity<1&&entering.transform.endsWith(', 0, 0)'),entering);
  await pause(1300);check('CTA reaches full opacity',await page.locator('.sc-footer__intro').evaluate(n=>getComputedStyle(n).opacity==='1'));
  await page.addScriptTag({url:new URL('/js/footer-waves.js',base).href});await page.addScriptTag({url:new URL('/js/footer-reveal.js',base).href});
  check('repeat inclusion does not duplicate waves or reset CTA',await page.evaluate(()=>document.querySelectorAll('#roveiaWaveBg .rwb-layer').length===3&&document.querySelector('.sc-footer__intro').classList.contains('sc12-cta-enter-visible')));
  await pause(5500);await context.close();
  const mobile=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const phone=await mobile.newPage();
  for(const [route,name] of [['/','home'],['/raboty/','works']]){
   await phone.goto(new URL(route,base).href);await pause(800);await phone.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await pause(3000);
   await phone.screenshot({path:path.join(evidence,`${name}-390-footer-bottom.png`)});
   const fine=await phone.locator('.sc-footer__fine').evaluate(n=>({opacity:getComputedStyle(n).opacity,rect:n.getBoundingClientRect().toJSON(),cls:n.className}));
   check(`${name} footer fine print reveals`,fine.opacity==='1',fine);
  }
  await mobile.close();
 }finally{await browser.close();}
 report.pass=report.checks.every(c=>c.pass);await fs.writeFile(path.join(evidence,'motion-report.json'),JSON.stringify(report,null,2));if(!report.pass)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
