const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require(require.resolve('playwright-core',{paths:[process.cwd(),process.env.USERPROFILE]}));
const output=path.resolve(__dirname,'../output/playwright/audience-preview');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const capture=process.argv.includes('--capture'), initialOnly=process.argv.includes('--initial-only');
const report={date:new Date().toISOString(),cases:[]};

async function state(page){
  return page.locator('#audiences').evaluate(section=>{
    const visual=section.querySelector('.audience-visual'), shell=section.querySelector('.audience-card-shell');
    const rect=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
    const vs=getComputedStyle(visual),heading=section.querySelector('h2');
    return {active:[...section.querySelectorAll('.audience-option')].findIndex(n=>n.classList.contains('is-active')),
      pressed:[...section.querySelectorAll('.audience-option')].map(n=>n.getAttribute('aria-pressed')),
      open:visual.classList.contains('is-open'),visualDisplay:vs.display,visualVisible:vs.visibility==='visible'&&parseFloat(vs.opacity)>.99,
      overflow:document.documentElement.scrollWidth>innerWidth+1,headingSize:parseFloat(getComputedStyle(heading).fontSize),headingGap:parseFloat(getComputedStyle(heading).marginBottom),
      actionCount:section.querySelectorAll('.audience-option-action').length,shell:rect(shell),
      cards:[...section.querySelectorAll('.audience-card')].map(node=>{
        const s=getComputedStyle(node),image=node.querySelector('img');
        return {...rect(node),active:node.classList.contains('is-active'),visible:s.visibility==='visible'&&parseFloat(s.opacity)>.99,
          hidden:node.getAttribute('aria-hidden'),inert:node.inert,background:s.backgroundImage,
          fits:node.scrollHeight<=node.clientHeight+1,image:{...rect(image),natural:image.naturalWidth,fit:getComputedStyle(image).objectFit},
          bodySize:parseFloat(getComputedStyle(node.querySelector('p')).fontSize),
          tags:[...node.querySelectorAll('.audience-tags span')].map(n=>({...rect(n),border:parseFloat(getComputedStyle(n).borderTopWidth)}))};
      }),audienceTrigger:!!window.ScrollTrigger?.getById('synthecore-audiences'),engine:window.__synthecoreScrollQA.getEngine()};
  });
}
function check(s,index){
  assert.equal(s.active,index,'Category selection');assert.equal(s.open,index>=0,'Preview state');
  assert.equal(s.overflow,false,'No horizontal overflow');assert.equal(s.audienceTrigger,false,'No scroll-driven selection trigger');
  assert.equal(s.headingSize,32);assert.ok(s.headingGap>=32&&s.headingGap<=40);assert.equal(s.actionCount,0);
  assert.equal(s.cards.filter(n=>n.visible).length,index>=0?1:0,'Only selected article visible');
  assert.equal(s.cards.filter(n=>!n.inert&&n.hidden==='false').length,index>=0?1:0,'Matching accessibility exposure');
  assert.equal(s.pressed.filter(n=>n==='true').length,index>=0?1:0);
  if(index<0){assert.equal(s.visualVisible,false);return;}
  assert.equal(s.visualVisible,true);const card=s.cards[index];assert.ok(card.active&&card.fits);
  assert.equal(card.background,'none','Articles have no independent card surfaces');
  assert.ok(card.image.natural>0);assert.equal(card.image.fit,'contain');
  assert.ok(card.image.x>=card.x&&card.image.right<=card.right&&card.image.y>=card.y&&card.image.bottom<=card.bottom,'Whole image fits card');
  assert.ok(card.image.x<card.x+35,'Top illustration left-aligned');assert.ok(card.bodySize>=16);
  assert.ok(card.tags.every(n=>n.border===0&&Math.abs(n.y-card.tags[0].y)<1&&n.right<=card.right),'Compact borderless tags fit one line');
  assert.ok(s.shell.height<560,'Preview height comes from compact content');
}
async function shot(page,label,name,mobile){
  await page.screenshot({path:path.join(output,`${label}-${name}.png`)});
  if(mobile){const clip=await page.locator('#audiences').evaluate(node=>{const r=node.getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height};});
    await page.screenshot({path:path.join(output,`${label}-${name}-section.png`),fullPage:true,clip,style:'#floatingHeader{visibility:hidden!important}'});}
}
(async()=>{
  await fs.mkdir(output,{recursive:true});const browser=await chromium.connectOverCDP('http://127.0.0.1:9222');
  try{
    for(const [width,height,reduced,missing] of [[1366,768],[1920,1080],[3840,2160],[390,844],[320,740],[430,932],[850,900],[851,900],[1920,1080,true],[390,844,true],[1920,1080,false,true]]){
      const mobile=width<=850,label=`${width}x${height}${reduced?'-reduced':''}${missing?'-no-libraries':''}`;
      const only=process.argv.find(arg=>arg.startsWith('--only='))?.slice(7);
      if(only&&only!==label)continue;
      const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,reducedMotion:reduced?'reduce':'no-preference'});
      const entry={label,errors:[],frames:[]};
      try{
        const page=await context.newPage();page.on('pageerror',e=>entry.errors.push(e.message));
        if(missing)await page.route('**/assets/vendor/*.js',r=>r.abort());
        await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.__synthecoreScrollQA?.getState().ready);
        await pause(300);check(await state(page),-1);
        await page.mouse.move(2,2);await page.evaluate(()=>scrollTo(0,document.querySelector('#audiences').getBoundingClientRect().top+scrollY-120));await pause(650);
        check(await state(page),-1);
        if(initialOnly){entry.status='passed';continue;}
        if(capture&&[1366,1920,390].includes(width)&&!reduced&&!missing)await shot(page,label,'closed',mobile);
        for(let i=0;i<3;i++){
          const option=page.locator('.audience-option').nth(i);if(mobile)await option.tap();else await option.hover();await pause(450);
          const frame=await state(page);check(frame,i);entry.frames.push(frame);
          if(capture&&[1366,1920,390].includes(width)&&!reduced&&!missing)await shot(page,label,`card-${i}`,mobile);
        }
        if(mobile){
          await page.locator('.audience-option').nth(2).tap();await pause(350);check(await state(page),-1);
          assert.equal((await state(page)).visualDisplay,'none','Closed mobile preview has no empty slot');
          await page.locator('.audience-option').first().tap();await pause(350);check(await state(page),0);
          await page.mouse.wheel(0,80);await pause(400);check(await state(page),0); // Read a tapped card while scrolling.
          await page.locator('.audience-option').first().tap();await pause(350);check(await state(page),-1);
        }else{
          const box=await page.locator('.audience-visual').boundingBox();
          await page.mouse.move(box.x+box.width/2,box.y+Math.min(box.height/2,160));await pause(350);check(await state(page),2);
          await page.mouse.move(2,2);await pause(350);check(await state(page),-1);
          // Move onto category 0, then scroll the list under the stationary pointer.
          await page.locator('.audience-option').first().hover();await pause(350);check(await state(page),0);
          await page.mouse.wheel(0,110);await pause(1600);check(await state(page),-1);
          await page.mouse.wheel(0,-110);await pause(1600);check(await state(page),-1);
          const row=await page.locator('.audience-option').first().boundingBox();
          await page.mouse.move(row.x+70,row.y+row.height/2);await pause(400);check(await state(page),0);
          await page.mouse.move(2,2);await pause(350);check(await state(page),-1);
        }
        // A closed tap keeps native focus on that button. Start a new focus event
        // for the keyboard path rather than refocusing an already focused node.
        await page.evaluate(()=>document.activeElement.blur());
        await page.locator('.audience-option').first().focus();await pause(350);check(await state(page),0);
        await page.keyboard.press('ArrowDown');await pause(350);check(await state(page),1);
        await page.keyboard.press(' ');await pause(350);check(await state(page),1);
        await page.keyboard.press('End');await pause(350);check(await state(page),2);
        await page.keyboard.press('ArrowDown');await pause(350);check(await state(page),0);
        await page.keyboard.press('ArrowUp');await pause(350);check(await state(page),2);
        await page.keyboard.press('Home');await pause(350);check(await state(page),0);
        await page.keyboard.press('Escape');await pause(350);check(await state(page),-1);
        await page.emulateMedia({reducedMotion:'reduce'});await pause(350);
        await page.locator('.audience-option').nth(1).focus();check(await state(page),1);
        assert.equal(await page.locator('.audience-card.is-active').evaluate(n=>getComputedStyle(n).animationName),'none');
        await page.keyboard.press('Escape');check(await state(page),-1);
        assert.deepEqual(entry.errors,[]);entry.status='passed';
      }catch(e){entry.status='failed';entry.errors.push(e.stack||e.message);}
      finally{report.cases.push(entry);console.log(`${label}: ${entry.status}${entry.errors.length?' — '+entry.errors.join('; '):''}`);await context.close();}
    }
    report.status=report.cases.every(c=>c.status==='passed')?'passed':'failed';if(report.status==='failed')process.exitCode=1;
    await fs.writeFile(path.join(output,initialOnly?'baseline-failures.json':'acceptance.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify({status:report.status,cases:report.cases.map(({label,status,errors})=>({label,status,errors}))},null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
