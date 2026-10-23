'use strict';
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(require.resolve('playwright',{paths:[process.cwd(),process.env.USERPROFILE||'']}));
const base=process.env.SYNTHECORE_URL||'http://127.0.0.1:4176/';
const dir=path.resolve('output/playwright/project-copy');fs.mkdirSync(dir,{recursive:true});
const report={date:new Date().toISOString(),base,checks:[],errors:[],samples:[]};
const check=(name,pass,data)=>{report.checks.push({name,pass:!!pass,data});if(!pass)console.log('FAIL',name,JSON.stringify(data))};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const browser=await chromium.launch({headless:true});let completed=false;
 try{for(const width of [320,390,768,1024,1440]){
  const ctx=await browser.newContext({viewport:{width,height:width===1440?900:844},reducedMotion:'reduce'});
  const page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url())});
  await page.goto(new URL('/raboty/',base).href,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
  const catalog=await page.locator('.case-card__open').evaluateAll(cards=>Object.fromEntries(cards.map(e=>[e.dataset.project,{title:e.querySelector('h2').textContent.trim(),description:e.querySelector('.case-card__body p').textContent.trim(),tags:[...e.querySelectorAll('.tag')].map(tag=>tag.textContent.trim())}])));
  check(width+' source has six projects',Object.keys(catalog).length===6);
  const modalIds=await page.locator('button.case-card__open').evaluateAll(buttons=>buttons.map(button=>button.dataset.project));
  for(const id of modalIds){
   await page.locator('button[data-project="'+id+'"]').click();
   check(width+'/'+id+' modal category',await page.locator('#dialogType').textContent()===catalog[id].tags.join(' · '));
   await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#caseDialog').open);
  }
  await page.goto(base,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
  const home=await page.locator('.sc-work-item').evaluateAll(items=>Object.fromEntries(items.map(e=>[e.dataset.workId,{title:e.querySelector('h2').textContent.trim(),description:e.querySelector('.sc-work-content__description').textContent.trim(),category:e.querySelector('.sc-work-content__type').textContent.trim()}])));
  for(const id of Object.keys(catalog)){
   check(width+'/'+id+' homepage title',home[id]?.title===catalog[id].title);
   check(width+'/'+id+' homepage summary',home[id]?.description===catalog[id].description);
   check(width+'/'+id+' homepage category',home[id]?.category===catalog[id].tags.join(' · '),home[id]?.category);
  }
  check(width+' homepage no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if([390,1440].includes(width)){
   await page.locator('[data-work-id="beauty"]').scrollIntoViewIfNeeded();await pause(200);await page.screenshot({path:path.join(dir,'home-beauty-'+width+'.png')});
  }
  await page.goto(new URL('/raboty/beauty-insight/',base).href,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
  const detail=await page.evaluate(()=>({title:document.querySelector('#caseTitle').textContent.trim(),description:document.querySelector('.case-hero__intro p').textContent.trim(),metaTitle:document.title,metaDescription:document.querySelector('meta[name="description"]').content}));
  check(width+' detail H1',detail.title===catalog.beauty.title,detail.title);
  check(width+' detail intro',detail.description===catalog.beauty.description);
  check(width+' detail SEO',detail.metaTitle===catalog.beauty.title+' — SyntheCore'&&detail.metaDescription===catalog.beauty.description);
  check(width+' detail no overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  report.samples.push({width,catalog,home,detail});
  if([390,1440].includes(width))await page.screenshot({path:path.join(dir,'case-hero-'+width+'.png')});
  // Related card names and descriptions remain the same catalog copy.
  const related=await page.locator('.case-card:not([data-carousel-clone]) .case-card__open').evaluateAll(cards=>cards.map(e=>({id:e.dataset.project,title:e.querySelector('h2').textContent.trim(),description:e.querySelector('p').textContent.trim(),tags:[...e.querySelectorAll('.tag')].map(tag=>tag.textContent.trim())})));
  for(const item of related)check(width+'/'+item.id+' related copy',item.title===catalog[item.id].title&&item.description===catalog[item.id].description&&JSON.stringify(item.tags)===JSON.stringify(catalog[item.id].tags));
  await ctx.close();
 }completed=true;
 }finally{await browser.close();check('all scenarios completed',completed);check('no JS or network errors',report.errors.length===0,report.errors);report.pass=report.checks.every(c=>c.pass);fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(report.checks.filter(c=>c.pass).length+'/'+report.checks.length+' passed');if(!report.pass)process.exitCode=1}
})().catch(e=>{console.error(e);process.exitCode=1});
