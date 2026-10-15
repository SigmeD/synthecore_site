const fs=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require(require.resolve('playwright-core',{paths:[process.cwd(),process.env.USERPROFILE]}));
const out=path.resolve(__dirname,'../output/playwright/hero-compact');
const before=process.argv.includes('--before'),reference=process.argv.includes('--reference');
(async()=>{await fs.mkdir(out,{recursive:true});const b=await chromium.connectOverCDP('http://127.0.0.1:9222'),results=[];
try{for(const [width,height]of[[1366,768],[1920,1080],[3840,2160]]){
  const c=await b.newContext({viewport:{width,height}}),p=await c.newPage();
  try{await p.goto(reference?'https://www.roveia.com/':'http://127.0.0.1:4173/',{waitUntil:'load',timeout:30000});
    await p.evaluate(()=>document.fonts.ready);if(!reference)await p.waitForFunction(()=>window.__synthecoreScrollQA?.getState().ready);await p.waitForTimeout(reference?1500:250);
    const result=await p.evaluate(reference=>{
      const rect=n=>{if(!n)return null;const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width,height:r.height,left:r.left};};
      if(reference)return {viewport:[innerWidth,innerHeight],elements:[...document.querySelectorAll('[class*=hero], [class*=banner], .pin-spacer')].map(n=>({class:n.className,...rect(n),display:getComputedStyle(n).display})).filter(n=>n.width>100&&n.height>10)};
      const h=document.querySelector('.hero'),s=document.querySelector('#imageScrollSticky'),f=h.querySelector('.hero-bottom'),photo=h.querySelector('.photo-position-holder');
      return {viewport:[innerWidth,innerHeight],qa:window.__synthecoreScrollQA.getState(),hero:rect(h),scene:rect(s),footer:rect(f),photo:rect(photo),title:rect(h.querySelector('h1')),cta:rect(h.querySelector('.main-cta')),
        footerGap:h.getBoundingClientRect().bottom-f.getBoundingClientRect().bottom,heading:rect(document.querySelector('#audience-title')),
        grid:getComputedStyle(h.querySelector('.hero-content')).gridTemplateRows,padding:getComputedStyle(h.querySelector('.hero-content')).padding};
    },reference);results.push(result);console.log(JSON.stringify(result));await p.screenshot({path:path.join(out,`${reference?'reference':before?'before':'after'}-${width}x${height}-start.png`)});
  }finally{await c.close();}
}await fs.writeFile(path.join(out,`${reference?'reference':before?'before':'after'}-geometry.json`),JSON.stringify(results,null,2));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
