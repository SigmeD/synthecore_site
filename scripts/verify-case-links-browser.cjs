'use strict';
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(require.resolve('playwright',{paths:[process.cwd(),process.env.USERPROFILE||'']}));
const base=process.env.SYNTHECORE_URL||'http://127.0.0.1:4176/';
const project=process.env.CASE_PROJECT||'beauty';
const registered=require('./lib/case-page.cjs').casePages(process.cwd()).find(c=>c.catalog_id===project);
if(!registered)throw Error('No registered detail page for '+project);
const destination='/raboty/'+registered.slug+'/';
const out=path.resolve(process.env.CASE_LINK_QA_OUTPUT||'output/playwright/case-primary-links'+(project==='beauty'?'':'-'+project));fs.mkdirSync(out,{recursive:true});
const report={date:new Date().toISOString(),base,project,destination,checks:[],errors:[]};
const check=(name,pass,data)=>{report.checks.push({name,pass:!!pass,data});if(!pass)console.log('FAIL',name,data)};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function prepare(page,route){
 await page.goto(new URL(route,base).href,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
 if(route==='/'){
  await page.evaluate(project=>{
   const state=window.__synthecoreWorksQA?.getState();
   const cards=[...document.querySelectorAll('[data-work-id]')],index=cards.findIndex(e=>e.dataset.workId===project);
   const y=state?.mode==='single-pinned-timeline'?state.pinStart+(state.pinEnd-state.pinStart)*(index/(cards.length-1)+.005):cards[index].getBoundingClientRect().top+scrollY-110;
   scrollTo({top:y,behavior:'instant'});
  },project);
 }else await page.locator('[data-project="'+project+'"]').scrollIntoViewIfNeeded();
 await wait(600);
}
(async()=>{
 const browser=await chromium.launch({headless:true});let completed=false;
 try{for(const width of [390,1440])for(const reducedMotion of ['no-preference','reduce']){
  const ctx=await browser.newContext({viewport:{width,height:width===1440?900:844},reducedMotion});
  const page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url())});
  for(const route of ['/','/raboty/']){
   const key=`${width}-${reducedMotion}-${route==='/'?'home':'catalog'}`;
   for(const part of ['image','title','cta','keyboard','new-tab']){
    if(route==='/'&&part==='cta')continue;
    await prepare(page,route);
    const card=page.locator(route==='/'?'[data-work-id="'+project+'"]':'.case-card--'+project);
    const link=card.locator('a[href="'+destination+'"]');
    check(key+'/'+part+' native anchor',await link.evaluate((e,destination)=>e.tagName==='A'&&e.href.endsWith(destination),destination));
    if(part==='image'||part==='title'||part==='cta'){
     const target=card.locator(part==='image'?'img':part==='title'?'h2':'.case-card__more');const box=await target.boundingBox();
     // Click actual image/title/CTA coordinates. No force/dispatchEvent shortcuts.
     const x=part==='image'?Math.min(width-25,box.x+box.width*.76):box.x+Math.min(box.width/2,100);
     const y=part==='image'?box.y+Math.min(box.height*.3,100):box.y+box.height/2;
     const hit=await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest('a')?.getAttribute('href'),{x,y});
     check(key+'/'+part+' hit reaches primary link',hit===destination,{x,y,hit});
     await page.mouse.click(x,y);
    }else if(part==='keyboard'){await link.focus();await page.keyboard.press('Enter')}
    else{
     const opened=ctx.waitForEvent('page');await link.click({modifiers:['Control']});const tab=await opened;await tab.waitForLoadState('networkidle');
     check(key+'/Ctrl-click opens detail in new tab',tab.url().endsWith(destination));await tab.close();continue;
    }
    await page.waitForURL('**'+destination);check(key+'/'+part+' navigates',await page.locator('#caseTitle').isVisible());
    check(key+'/'+part+' no modal',await page.locator('#caseDialog').evaluate(e=>!e.open));
   }
   await prepare(page,route);if(reducedMotion==='reduce')await page.screenshot({path:path.join(out,key+'.png')});
   if(route==='/raboty/')for(const id of await page.locator('button.case-card__open').evaluateAll(buttons=>buttons.map(button=>button.dataset.project))){
    const button=page.locator('button[data-project="'+id+'"]');await button.click();check(key+'/'+id+' fallback modal',await page.locator('#caseDialog').evaluate(e=>e.open));await page.keyboard.press('Escape');
   }
  }
  await ctx.close();
 }completed=true;
 }finally{await browser.close();check('all primary-link scenarios completed',completed);check('no JavaScript or HTTP errors',report.errors.length===0,report.errors);report.pass=report.checks.every(c=>c.pass);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(report.checks.filter(c=>c.pass).length+'/'+report.checks.length+' passed');if(!report.pass)process.exitCode=1}
})().catch(e=>{console.error(e);process.exitCode=1});
