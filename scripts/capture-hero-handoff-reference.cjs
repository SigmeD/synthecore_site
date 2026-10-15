const fs=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require(require.resolve('playwright-core',{paths:[process.cwd(),process.env.USERPROFILE]}));
const output=path.resolve(__dirname,'../output/playwright/hero-handoff');
(async()=>{await fs.mkdir(output,{recursive:true});const b=await chromium.connectOverCDP('http://127.0.0.1:9222');const report=[];try{
  for(const[width,height]of[[1366,768],[1920,1080],[3840,2160]]){
    const c=await b.newContext({viewport:{width,height}});try{
      const p=await c.newPage();await p.goto('https://www.roveia.com/',{waitUntil:'load',timeout:30000});await p.evaluate(()=>document.fonts.ready);
      await p.waitForFunction(()=>window.ScrollTrigger?.getAll().some(t=>t.trigger.matches('.section_home-hero')&&t.pin),null,{timeout:20000});
      await p.waitForTimeout(400);await p.mouse.move(2,2);
      const range=await p.evaluate(()=>{const t=ScrollTrigger.getAll().find(t=>t.trigger.matches('.section_home-hero'));return {start:t.start,end:t.end};});
      const entry={viewport:[width,height],frames:[]};
      for(const[name,target]of[['start',0],['middle',range.end*.5],['complete',range.end],['transition',range.end+Math.min(240,height*.2)],['reverse-complete',range.end]]){
        await p.mouse.wheel(0,target-await p.evaluate(()=>scrollY));await p.waitForTimeout(1900);
        entry.frames.push(await p.evaluate(name=>{
          const t=ScrollTrigger.getAll().find(t=>t.trigger.matches('.section_home-hero'));
          const hero=document.querySelector('.wrapper_home-hero').getBoundingClientRect(),heading=document.querySelector('.section_home-where-we-work h2').getBoundingClientRect(),image=document.querySelector('.video-hero').getBoundingClientRect();
          return {name,scroll:scrollY,pinActive:t.isActive,progress:t.progress,visualProgress:t.animation.progress(),scrub:t.vars.scrub,
            hero:{y:hero.y,height:hero.height,bottom:hero.bottom},heading:{y:heading.y},image:{width:image.width,height:image.height}};
        },name));
        await p.screenshot({path:path.join(output,`roveia-${width}x${height}-${name}.png`)});
      }
      report.push(entry);console.log('Reference captured',width,height);
    }finally{await c.close();}
  }
  await fs.writeFile(path.join(output,'reference.json'),JSON.stringify(report,null,2));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
