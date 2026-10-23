'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require(require.resolve('playwright',{paths:[process.cwd(),process.env.USERPROFILE||'']}));
const base=process.env.SYNTHECORE_URL||'http://127.0.0.1:4176/',baseline=process.env.REFACTOR_BASELINE_URL||'http://127.0.0.1:4193/';
const dir=path.resolve('output/playwright/style-scripts-refactor');fs.mkdirSync(dir,{recursive:true});
const report={date:new Date().toISOString(),base,baseline,checks:[],errors:[],comparisons:[],limitations:['Chromium automation does not prove physical-device smoothness.','Firefox/WebKit and real mobile hardware are not tested.']};
const hash=x=>crypto.createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex'),pause=ms=>new Promise(r=>setTimeout(r,ms));
const check=(name,pass,data)=>{report.checks.push({name,pass:!!pass,...(data===undefined?{}:{data})});if(!pass)console.log('FAIL '+name+' '+JSON.stringify(data))};
async function goto(page,url){await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await pause(1500)}
function watch(page,label){page.on('pageerror',e=>report.errors.push({label,error:e.message}));page.on('console',e=>{if(e.type()==='error')report.errors.push({label,error:e.text()})});page.on('requestfailed',r=>report.errors.push({label,error:r.failure()?.errorText,url:r.url()}));page.on('response',r=>{if(r.status()>=400)report.errors.push({label,status:r.status(),url:r.url()})})}
async function state(page){return page.evaluate(()=>{
 const normalize=value=>value.replaceAll(location.origin,'@SITE');
 const cssURL=(text,href)=>text.replace(/url\(("|')?([^"')]+)\1\)/g,(match,quote,value)=>{try{const url=new URL(value,href);return 'url("'+(url.origin===location.origin?'@SITE'+url.pathname+url.search+url.hash:url.href)+'")'}catch{return match}});
 const external=[],walk=(rules,href)=>[...rules].flatMap(rule=>{
  if(rule.type===CSSRule.IMPORT_RULE){const imported=new URL(rule.href,href);if(imported.origin!==location.origin){external.push(imported.href);return []}return walk(rule.styleSheet.cssRules,imported.href)}
  if(rule.cssRules)return [{group:rule.cssText.slice(0,rule.cssText.indexOf('{')).trim(),rules:walk(rule.cssRules,href)}];
  return [cssURL(rule.cssText,href)];
 });
 const rules=[...document.styleSheets].flatMap(sheet=>walk(sheet.cssRules,sheet.href||location.href));
 // CSSOM covers margin declarations; used auto-margin values vary during layout flushes.
 // Compare actual geometry rather than those transient resolved values.
 const properties=['display','position','width','height','top','right','bottom','left','padding-top','padding-right','padding-bottom','padding-left','overflow','overflow-x','overflow-y','font-family','font-size','font-weight','line-height','letter-spacing','color','background-color','background-image','border-radius','border-width','border-color','box-shadow','transform','opacity','z-index','animation-name','animation-duration','transition-property','transition-duration'];
 const styles=[...document.querySelectorAll('body,body *')].flatMap(e=>{const r=e.getBoundingClientRect();if(r.bottom<=0||r.top>=innerHeight||r.right<=0||r.left>=innerWidth||!r.width||!r.height)return [];const c=getComputedStyle(e);return [{tag:e.tagName,id:e.id,class:e.getAttribute('class'),geometry:[r.x,r.y,r.width,r.height].map(v=>Math.round(v*100)/100),styles:properties.map(p=>normalize(c.getPropertyValue(p)))}]});
 return {rules,external,styles,styleLinks:document.querySelectorAll('link[rel="stylesheet"]').length,localCSSRequests:performance.getEntriesByType('resource').filter(e=>new URL(e.name).origin===location.origin&&/\.css(?:\?|$)/.test(e.name)).length,overflow:document.documentElement.scrollWidth-innerWidth};
})}
async function pixels(page,before,after){return page.evaluate(async({before,after})=>{
 const images=await Promise.all([before,after].map(src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src='data:image/png;base64,'+src})));
 const canvas=document.createElement('canvas');canvas.width=images[0].width;canvas.height=images[0].height;const ctx=canvas.getContext('2d');ctx.drawImage(images[0],0,0);const a=ctx.getImageData(0,0,canvas.width,canvas.height).data;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(images[1],0,0);const b=ctx.getImageData(0,0,canvas.width,canvas.height).data;
 let changedPixels=0,maxDelta=0;for(let i=0;i<a.length;i+=4){let changed=false;for(let k=0;k<4;k++){const delta=Math.abs(a[i+k]-b[i+k]);maxDelta=Math.max(maxDelta,delta);changed ||= delta!==0}if(changed)changedPixels++}
 return {changedPixels,maxDelta,totalPixels:canvas.width*canvas.height};
},{before:before.toString('base64'),after:after.toString('base64')})}
(async()=>{const browser=await chromium.launch({headless:true});let completed=false;
try{
 const compare=await browser.newPage();
 for(const width of [320,390,768,1440,1920]){
  const ctx=await browser.newContext({viewport:{width,height:width>=1440?900:844},reducedMotion:'reduce'});
  const current=await ctx.newPage();watch(current,'comparison-'+width);
  for(const route of ['/','/raboty/','/raboty/beauty-insight/','/raboty/flowers/','/raboty/metal-calc/']){
   await goto(current,new URL(route,baseline).href);const a=await state(current),before=await current.screenshot();
   await goto(current,new URL(route,base).href);const b=await state(current),label=width+' '+route;
   check(label+' CSSOM cascade unchanged',hash(a.rules)===hash(b.rules),hash(a.rules)===hash(b.rules)?undefined:{before:hash(a.rules),after:hash(b.rules),firstBefore:a.rules.find((v,i)=>JSON.stringify(v)!==JSON.stringify(b.rules[i])),firstAfter:b.rules.find((v,i)=>JSON.stringify(v)!==JSON.stringify(a.rules[i]))});
   check(label+' external font imports unchanged',JSON.stringify(a.external)===JSON.stringify(b.external));
   check(label+' computed styles unchanged',hash(a.styles)===hash(b.styles),hash(a.styles)===hash(b.styles)?undefined:{firstBefore:a.styles.find((v,i)=>JSON.stringify(v)!==JSON.stringify(b.styles[i])),firstAfter:b.styles.find((v,i)=>JSON.stringify(v)!==JSON.stringify(a.styles[i]))});
   check(label+' no overflow',b.overflow<=0);check(label+' stylesheet delivery',route==='/'?a.styleLinks===18&&b.styleLinks===1:a.styleLinks===b.styleLinks);
   const after=await current.screenshot(),difference=await pixels(compare,before,after);
   if(route==='/')check(label+' identical viewport pixels',difference.changedPixels===0,difference);
   else{const oldResponse=await current.request.get(new URL(route,baseline).href),newResponse=await current.request.get(new URL(route,base).href);check(label+' unchanged HTML after newline normalization',(await oldResponse.text()).replace(/\r\n/g,'\n')===(await newResponse.text()).replace(/\r\n/g,'\n'))}
   report.comparisons.push({width,route,rulesBefore:hash(a.rules),rulesAfter:hash(b.rules),stylesBefore:hash(a.styles),stylesAfter:hash(b.styles),styleLinksBefore:a.styleLinks,styleLinksAfter:b.styleLinks,localCSSRequestsBefore:a.localCSSRequests,localCSSRequestsAfter:b.localCSSRequests,pixels:difference});
   if(route==='/'&&[1440,390].includes(width))await current.screenshot({path:path.join(dir,'home-'+width+'.jpg'),type:'jpeg',quality:70});
  }
  await ctx.close();
 }
 // Native scroll and the unchanged owners must also survive the new delivery path.
 for(const width of [1440,390]){
  const ctx=await browser.newContext({viewport:{width,height:width===1440?900:844}}),page=await ctx.newPage();watch(page,'motion-'+width);await goto(page,base);
  check(width+' one existing main owner',await page.evaluate(()=>!!window.__synthecoreWorksQA&&window.__synthecoreWorksQA.getState().mode==='single-pinned-timeline'));
  for(const selector of ['#audiences','#works','#services','#process','#testimonials','#faq','#contact']){await page.locator(selector).scrollIntoViewIfNeeded();await pause(250);check(width+' normal scroll '+selector,await page.evaluate(()=>Number.isFinite(scrollY)))}
  await page.mouse.wheel(0,-7000);await pause(1200);await page.evaluate(()=>window.SyntheCoreMotion.scrollTo(0,{immediate:true}));await page.waitForFunction(()=>scrollY<5);check(width+' reverse scroll',await page.evaluate(()=>scrollY<5));
  if(width===390){await page.locator('#menuToggle').click();check('mobile menu opens',await page.locator('#mobilePanel').isVisible());await page.keyboard.press('Escape');check('mobile menu closes',!(await page.locator('#mobilePanel').isVisible()))}
  await page.emulateMedia({reducedMotion:'reduce'});await pause(400);check(width+' reduced motion switches owner',await page.evaluate(()=>window.__synthecoreWorksQA.getState().mode==='reduced-motion'));await ctx.close();
 }
 // Count source-level duplicate rule groups with their media/supports context.
 const sources=fs.readdirSync('css').filter(f=>f.endsWith('.css')).map(file=>({file:'css/'+file,css:fs.readFileSync('css/'+file,'utf8').replace(/@import\s+url\([^;]+;/g,'')}));
 report.ruleAudit=await compare.evaluate(sources=>{
  const groups=new Map(),selectors=new Map();let count=0;
  for(const source of sources){const sheet=new CSSStyleSheet();sheet.replaceSync(source.css);const walk=(rules,context=[])=>{for(const [index,rule]of [...rules].entries()){
   if(rule.selectorText&&rule.style){count++;const location={file:source.file,context,index,selector:rule.selectorText,declarations:rule.style.cssText},key=JSON.stringify([context,rule.selectorText,rule.style.cssText]),selector=JSON.stringify([context,rule.selectorText]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(location);if(!selectors.has(selector))selectors.set(selector,[]);selectors.get(selector).push(location)}
   else if(rule.cssRules)walk(rule.cssRules,[...context,rule.cssText.slice(0,rule.cssText.indexOf('{')).trim()]);
  }};walk(sheet.cssRules)}
  return {sourceFiles:sources.length,styleRules:count,exactRuleGroups:[...groups.values()].filter(g=>g.length>1),repeatedSelectors:[...selectors.values()].filter(g=>g.length>1),note:'Identical rule text is not a deletion proof: cascade position and intervening declarations can be intentional.'};
 },sources);
 report.paintNote='Homepage pixels are a strict gate. Other unchanged HTML/CSS documents use exact input, CSSOM, visible-style and geometry checks; their pixel counts are diagnostic because same-URL reload controls reproduce raster differences.';
 completed=true;
}finally{await browser.close();check('all comparison scenarios completed',completed);check('no JS/console/network failures',report.errors.length===0,report.errors);report.pass=report.checks.every(c=>c.pass);fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(report.checks.filter(c=>c.pass).length+'/'+report.checks.length+' passed');if(!report.pass)process.exitCode=1}
})().catch(error=>{console.error(error);process.exitCode=1});
