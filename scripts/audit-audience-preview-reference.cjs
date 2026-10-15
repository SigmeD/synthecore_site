const fs=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require(require.resolve('playwright-core',{paths:[process.cwd(),process.env.USERPROFILE]}));
const output=path.resolve(__dirname,'../output/playwright/audience-preview');
(async()=>{
  await fs.mkdir(output,{recursive:true});const browser=await chromium.connectOverCDP('http://127.0.0.1:9222');
  const context=await browser.newContext({viewport:{width:1920,height:1080}});
  const report={date:new Date().toISOString(),url:'https://www.roveia.com/',viewport:[1920,1080],frames:[]};
  try{
    const page=await context.newPage();await page.goto(report.url,{waitUntil:'domcontentloaded',timeout:30000});
    const heading=page.getByRole('heading',{name:'Who We Work With',exact:true});
    await heading.waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(2500);
    await page.mouse.move(2,2);
    await page.evaluate(()=>{
      const node=[...document.querySelectorAll('h2')].find(n=>n.textContent.trim()==='Who We Work With');
      const target=node.getBoundingClientRect().top+scrollY-120;
      if(window.lenis)window.lenis.scrollTo(target,{immediate:true,force:true});else scrollTo(0,target);
    });await page.waitForTimeout(1000);
    for(let attempt=0;attempt<4;attempt++){
      const delta=await heading.evaluate(node=>node.getBoundingClientRect().top-120);
      if(Math.abs(delta)<3)break;
      await page.mouse.wheel(0,delta);await page.waitForTimeout(1800);
    }
    report.headingTop=await heading.evaluate(node=>node.getBoundingClientRect().top);
    if(Math.abs(report.headingTop-120)>15)throw new Error(`Reference not aligned: heading top ${report.headingTop}`);
    async function capture(name){
      await page.screenshot({path:path.join(output,`roveia-1920x1080-${name}.png`)});
      report.frames.push(await page.locator('.section_home-where-we-work').evaluate(section=>({
        cards:[...section.querySelectorAll('.flex-block-47')].map(node=>{
          const r=node.getBoundingClientRect(),s=getComputedStyle(node);const ancestors=[];
          for(let parent=node,depth=0;parent&&depth<4;parent=parent.parentElement,depth++){
            const style=getComputedStyle(parent);ancestors.push({class:parent.className,display:style.display,opacity:style.opacity,visibility:style.visibility});
          }
          return {width:r.width,height:r.height,padding:s.padding,transform:s.transform,ancestors};
        })
      })));
    }
    await capture('closed');
    for(let i=0;i<3;i++){
      await page.locator('.section_home-where-we-work .heading-12.linked').nth(i).hover();await page.waitForTimeout(1000);await capture(`card-${i}`);
    }
    await page.mouse.move(2,2);await page.waitForTimeout(1000);await capture('leave');
    await fs.writeFile(path.join(output,'reference.json'),JSON.stringify(report,null,2));
    console.log('Reference captured: closed, three categories, pointer leave; 1920x1080.');
  }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
