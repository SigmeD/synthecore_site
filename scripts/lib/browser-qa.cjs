'use strict';
const path=require('node:path');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function scroll(page,y){await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);await pause(400)}
async function top(page,selector){return page.locator(selector).evaluate(e=>e.getBoundingClientRect().top+scrollY)}
async function metrics(page,selectors){return page.evaluate(selectors=>Object.fromEntries(selectors.map(selector=>{const e=document.querySelector(selector),r=e.getBoundingClientRect(),c=getComputedStyle(e);return[selector,{width:r.width,height:r.height,font:c.fontSize,fontFamily:c.fontFamily,lineHeight:c.lineHeight,color:c.color,position:c.position,top:c.top,fit:c.objectFit,radius:c.borderRadius}]})),selectors)}
async function instrument(ctx){await ctx.addInitScript(()=>{window.__caseLenis={live:0,max:0};let ctor;Object.defineProperty(window,'Lenis',{configurable:true,get:()=>ctor,set:value=>{ctor=new Proxy(value,{construct(target,args,newTarget){const instance=Reflect.construct(target,args,newTarget);window.__caseLenis.live++;window.__caseLenis.max=Math.max(window.__caseLenis.max,window.__caseLenis.live);let dead=false;const destroy=instance.destroy.bind(instance);instance.destroy=(...a)=>{if(!dead){dead=true;window.__caseLenis.live--}return destroy(...a)};return instance}})}})})}
function createBrowserQA({report,dir,settleMs=1250,shotMs=1100,resetWithoutSelector=false}){
 const check=(name,pass,data)=>{report.checks.push({name,pass:!!pass,...(data===undefined?{}:{data})});if(!pass)console.log('FAIL '+name+' '+JSON.stringify(data))};
 async function goto(page,url){await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await pause(settleMs)}
 async function shot(page,name,selector){if(selector||resetWithoutSelector)await scroll(page,selector?Math.max(0,(await top(page,selector))-110):0);await pause(shotMs);await page.screenshot({path:path.join(dir,name+'.png')})}
 function watch(page,label){page.on('pageerror',e=>report.errors.push({label,type:'JavaScript',message:e.message}));page.on('console',e=>{if(e.type()==='error')report.errors.push({label,type:'console',message:e.text()})});page.on('response',r=>{if(r.status()>=400)report.errors.push({label,type:'HTTP',url:r.url(),status:r.status()})});page.on('requestfailed',r=>report.errors.push({label,type:'network',url:r.url(),error:r.failure()?.errorText}))}
 return {check,pause,goto,scroll,top,shot,metrics,watch,instrument};
}
module.exports={createBrowserQA};
