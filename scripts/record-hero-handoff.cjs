const fs=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require(require.resolve('playwright-core',{paths:[process.cwd(),process.env.USERPROFILE]}));
const proposal=process.argv.includes('--proposal');
const directory=path.resolve(__dirname,`../output/playwright/hero-handoff/${proposal?'proposal-full-viewport':'current'}`);
(async()=>{
  const browser=await chromium.connectOverCDP('http://127.0.0.1:9222');
  try{
    const recorder={newContext:async options=>{
      const context=await browser.newContext(options);
      if(proposal)await context.route('**/css/main.css',async route=>route.fulfill({contentType:'text/css',
        body:await fs.readFile(path.resolve(__dirname,'../css/main.css'),'utf8')+
          '\n#imageScrollSticky.is-image-animated > .hero{height:calc(100svh - 2 * var(--hero-edge))}\n'}));
      return context;
    }};
    await fs.mkdir(path.join(directory,'hero-frames'),{recursive:true});
    const context=await recorder.newContext({viewport:{width:1920,height:1080}});
    try{
      const page=await context.newPage();const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.__synthecoreScrollQA.getState().ready);
      await page.waitForTimeout(350);
      let capturing=true;const frames=[];
      // CDP screencast uses the physical Chrome surface, which is shorter than
      // this emulated viewport. Capture actual full viewport screenshots instead.
      const capture=(async()=>{while(capturing){
        const timestamp=Date.now()/1000,name=`viewport-${String(frames.length).padStart(5,'0')}.jpg`;
        const data=await page.screenshot({type:'jpeg',quality:85});
        await fs.writeFile(path.join(directory,'hero-frames',name),data);
        frames.push({name,timestamp});
      }})();
      await page.waitForTimeout(500);
      for(let i=0;i<16;i++){await page.mouse.wheel(0,110);await page.waitForTimeout(200);}
      await page.waitForTimeout(1800);
      for(let i=0;i<16;i++){await page.mouse.wheel(0,-110);await page.waitForTimeout(200);}
      await page.waitForTimeout(1800);capturing=false;await capture;
      if(errors.length)throw Error(errors.join('; '));
      const result={source:'Actual Playwright viewport screenshots',proposal,viewport:[1920,1080],frameCount:frames.length,
        duration:frames.at(-1).timestamp-frames[0].timestamp,frames};
      await fs.writeFile(path.join(directory,'recording.json'),JSON.stringify(result,null,2));
      console.log(JSON.stringify({proposal,directory,frameCount:result.frameCount,duration:result.duration}));
    }finally{await context.close();}
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
