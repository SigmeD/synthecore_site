'use strict';
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(require.resolve('playwright',{paths:[process.cwd(),process.env.USERPROFILE]}));
const output=path.resolve('output/v62-on-v27/shell');fs.mkdirSync(output,{recursive:true});
const sizes=[[320,568],[390,844],[768,1024],[1024,768],[1440,900],[1920,1080]];
const selectors=['header.floating-header','header .brand','header .brand-name','header .brand-note','header .brand-divider','header .header-links','header .header-links a','header > .nav-cta','header > .nav-cta .arrow','header .menu-toggle','header .mobile-panel','header .mobile-panel a','#contact','#contact .sc-footer__content','#contact h2','#contact .sc-footer__intro','#contact .sc-footer__intro p','#contact .sc-footer__cta','#contact .sc-footer__brand','#contact .brand-name','#contact .brand-note','#contact .sc-footer__bottom','#contact .sc-footer__nav','#contact .sc-footer__nav a','#contact .sc-footer__fine'];
const props=['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','width','height','minHeight','maxWidth','gap','paddingTop','paddingRight','paddingBottom','paddingLeft','marginTop','marginRight','marginBottom','marginLeft','borderRadius','backgroundColor','color','display','position','opacity','transform'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const browser=await chromium.launch({headless:true});const report={cases:[]};try{
  for(const [width,height] of sizes){const entry={width,height,pages:[],differences:[]};report.cases.push(entry);
    for(const [name,port] of [['v27',4180],['combined',4181]]){
      const context=await browser.newContext({viewport:{width,height},hasTouch:width<=850,isMobile:width<=850});const page=await context.newPage();const errors=[];
      page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
      await page.goto('http://127.0.0.1:'+port+'/',{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);await sleep(700);
      const measure=()=>page.evaluate(({selectors,props})=>Object.fromEntries(selectors.map(s=>{const n=document.querySelector(s);const c=getComputedStyle(n);return[s,Object.fromEntries(props.map(p=>[p,c[p]]))];})),{selectors,props});
      const top=await measure();await page.screenshot({path:path.join(output,name+'-'+width+'-header.jpg'),type:'jpeg',quality:80});
      await page.evaluate(()=>{if(window.SyntheCoreMotion)window.SyntheCoreMotion.scrollTo(document.documentElement.scrollHeight,{immediate:true});else {window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'});}});await sleep(3300);
      const footer=await measure();await page.screenshot({path:path.join(output,name+'-'+width+'-footer.jpg'),type:'jpeg',quality:80});
      if(width<=850){await page.evaluate(()=>{if(window.SyntheCoreMotion)window.SyntheCoreMotion.scrollTo(0,{immediate:true});else window.scrollTo({top:0,behavior:'instant'});});await sleep(200);await page.locator('#menuToggle').tap();entry[name+'MenuOpen']=await page.locator('#menuToggle').getAttribute('aria-expanded');}
      entry.pages.push({name,top,footer,errors});await context.close();
    }
    for(const s of selectors){const pos=s.startsWith('#contact')?'footer':'top';for(const p of props){const a=entry.pages[0][pos][s][p],b=entry.pages[1][pos][s][p];if(a!==b)entry.differences.push({selector:s,property:p,v27:a,combined:b});}}
    console.log(width+': '+entry.differences.length+' shell style differences; menu '+entry.combinedMenuOpen);console.log(JSON.stringify(entry.differences));
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
