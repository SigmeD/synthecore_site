const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require(require.resolve('playwright-core',{paths:[process.cwd(),process.env.USERPROFILE]}));
const out=path.resolve(__dirname,'../output/playwright/audience-parallax');
async function state(p){return p.evaluate(()=>{
  const rect=n=>{const r=n.getBoundingClientRect();return {top:r.top,left:r.left,width:r.width,height:r.height};};
  const h=document.querySelector('.hero'),photo=h.querySelector('.hero-image-expander');
  return {qa:window.__synthecoreScrollQA.getState(),hero:rect(h),title:rect(h.querySelector('h1')),frame:rect(h.querySelector('.photo-position-holder')),
    footer:rect(h.querySelector('.hero-bottom')),cta:rect(h.querySelector('.main-cta')),photo:rect(photo),clip:getComputedStyle(photo).clipPath,
    imageTransform:getComputedStyle(photo.querySelector('img')).transform,shade:getComputedStyle(photo).getPropertyValue('--photo-shade-opacity'),
    font:getComputedStyle(h.querySelector('h1')).fontFamily};
});}
(async()=>{const b=await chromium.connectOverCDP('http://127.0.0.1:9222'),report={date:new Date().toISOString(),cases:[]};try{
  for(const[width,height]of[[1366,768],[1920,1080],[3840,2160]]){
    const c=await b.newContext({viewport:{width,height}}),r=await c.newPage(),p=await c.newPage(),entry={label:`${width}x${height}`,frames:[]};
    try{for(const[page,url]of[[r,'http://127.0.0.1:4173/output/playwright/audience-parallax/reference/source.html'],[p,'http://127.0.0.1:4173/']]){
      await page.goto(url,{waitUntil:'load'});await page.waitForFunction(()=>window.__synthecoreScrollQA.getState().ready);await page.evaluate(()=>document.fonts.ready);
    }
    const end=(await state(r)).qa.pinEnd;
    for(const[name,target]of[['start',0],['middle',end*.5],['full',end],['reverse-middle',end*.5]]){
      await Promise.all([r,p].map(page=>page.evaluate(y=>scrollTo(0,y),target)));await p.waitForTimeout(2200);
      const a=await state(r),s=await state(p);entry.frames.push({name,reference:a,local:s});
      for(const key of['hero','title','frame','footer','cta','photo'])for(const dim of Object.keys(a[key]))assert.ok(Math.abs(a[key][dim]-s[key][dim])<.1,`${key}.${dim}: Hero equals supplied v8 file`);
      assert.equal(s.qa.scrub,a.qa.scrub);assert.equal(s.qa.pinEnd,a.qa.pinEnd);assert.equal(s.font,a.font);
      assert.equal(s.clip,a.clip);assert.equal(s.imageTransform,a.imageTransform);assert.equal(s.shade,a.shade);
    }entry.status='passed';
    }catch(e){entry.status='failed';entry.error=e.stack;}finally{report.cases.push(entry);console.log(entry.label,entry.status,entry.error||'');await c.close();}
  }report.status=report.cases.every(e=>e.status==='passed')?'passed':'failed';await fs.writeFile(path.join(out,'hero-reference-equivalence.json'),JSON.stringify(report,null,2));if(report.status==='failed')process.exitCode=1;
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
