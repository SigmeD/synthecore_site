const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(require.resolve('playwright-core', { paths: [process.cwd(), process.env.USERPROFILE] }));
const output = path.resolve(__dirname, '../output/playwright/audience-deck');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const report = { date: new Date().toISOString(), cases: [] };

async function geometry(page) {
  return page.locator('#audiences').evaluate(section => {
    const rect = node => { const r = node.getBoundingClientRect(); return { x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom }; };
    const heading = section.querySelector('h2');
    return { viewport:[innerWidth,innerHeight], overflow:document.documentElement.scrollWidth>innerWidth+1,
      headingSize:parseFloat(getComputedStyle(heading).fontSize), headingGap:parseFloat(getComputedStyle(heading).marginBottom),
      actions:section.querySelectorAll('.audience-option-action').length,
      pressed:[...section.querySelectorAll('.audience-option')].map(n=>n.getAttribute('aria-pressed')),
      cards:[...section.querySelectorAll('.audience-card')].map(node=>{
        const image=node.querySelector('img'), title=node.querySelector('h3'), s=getComputedStyle(node);
        return { ...rect(node), active:node.classList.contains('is-active'), hidden:node.getAttribute('aria-hidden'), inert:node.inert,
          visible:s.visibility==='visible'&&parseFloat(s.opacity)>.99, depth:+node.dataset.depth, z:+s.zIndex,
          contentFits:node.scrollHeight<=node.clientHeight+1, image:{...rect(image),natural:image.naturalWidth,fit:getComputedStyle(image).objectFit},
          title:rect(title), bodySize:parseFloat(getComputedStyle(node.querySelector('p')).fontSize),
          tags:[...node.querySelectorAll('.audience-tags span')].map(n=>({...rect(n),border:parseFloat(getComputedStyle(n).borderTopWidth)})) };
      }), engine:window.__synthecoreScrollQA.getEngine() };
  });
}

function check(state, index) {
  assert.equal(state.overflow,false,'No horizontal overflow');
  assert.equal(state.cards.filter(n=>n.active).length,1,'One front card exists by default');
  assert.equal(state.cards[index].active,true,'Requested category is in front');
  assert.equal(state.cards.filter(n=>n.visible).length,3,'Three card surfaces remain visible');
  assert.equal(state.cards.filter(n=>!n.inert&&n.hidden==='false').length,1,'Only front card exposed to assistive technology');
  assert.equal(state.pressed.filter(n=>n==='true').length,1,'Exactly one category pressed');
  assert.equal(state.pressed[index],'true');
  assert.equal(state.headingSize,32); assert.ok(state.headingGap>=32&&state.headingGap<=40);
  assert.equal(state.actions,0);
  for(let depth=0;depth<3;depth++) {
    const card=state.cards[(index+depth)%3];
    assert.equal(card.depth,depth,'Cyclic deck order follows categories');
    assert.ok(card.contentFits,'Full card content fits');
    assert.ok(card.x>=0&&card.right<=state.viewport[0]+1,'Entire deck stays within viewport');
    if(depth) {
      const previous=state.cards[(index+depth-1)%3];
      assert.ok(card.x>previous.x+4&&card.x<previous.x+20,'Small sequential horizontal offset');
      assert.ok(card.y>previous.y+4&&card.y<previous.y+18,'Small sequential vertical offset');
      assert.ok(card.z<previous.z,'Front card above following card');
    }
  }
  const active=state.cards[index];
  assert.ok(active.image.natural>0); assert.equal(active.image.fit,'contain');
  assert.ok(Math.abs(active.image.x-(active.x+(state.viewport[0]<=850?20:state.viewport[0]<=1100?22:28)))<1,'Image is aligned to left padding');
  assert.ok(active.image.y>=active.y&&active.image.bottom<=active.title.y-19,'Image is fully inside top with free space before text');
  assert.ok(active.bodySize>=16,'Readable copy');
  assert.ok(active.tags.every(n=>n.border===0&&Math.abs(n.y-active.tags[0].y)<1),'Tags stay borderless in one row');
  assert.ok(active.tags.every(n=>n.right<=active.right),'Tags fit card');
  assert.ok(active.height<(state.viewport[0]<=360?570:520),'Compact front card');
}

(async()=>{
  await fs.mkdir(output,{recursive:true});
  const browser=await chromium.connectOverCDP('http://127.0.0.1:9222');
  try {
    for(const [width,height,reduced,missing] of [[1366,768],[1920,1080],[3840,2160],[390,844],[320,740],[430,932],[850,900],[851,900],[1920,1080,true],[390,844,true],[1920,1080,false,true]]) {
      const label=`${width}x${height}${reduced?'-reduced':''}${missing?'-no-libraries':''}`;
      const context=await browser.newContext({viewport:{width,height},isMobile:width<=850,hasTouch:width<=850,reducedMotion:reduced?'reduce':'no-preference'});
      const entry={label,errors:[],frames:[]};
      try {
        const page=await context.newPage(); page.on('pageerror',e=>entry.errors.push(e.message));
        if(missing) await page.route('**/assets/vendor/*.js',route=>route.abort());
        await page.goto('http://127.0.0.1:4173/');
        await page.waitForFunction(()=>window.__synthecoreScrollQA?.getState().ready);
        await page.evaluate(()=>scrollTo(0,document.querySelector('#audiences').getBoundingClientRect().top+scrollY-120));
        await pause(800);
        const first=await geometry(page); check(first,first.cards.findIndex(n=>n.active));
        const initialHeight=first.cards[0].height;
        for(let i=0;i<3;i++) {
          await page.locator('.audience-option').nth(i).click(); await pause(800);
          const state=await geometry(page); check(state,i); assert.equal(state.cards[i].height,initialHeight,'Height stable during switching'); entry.frames.push(state);
        }
        await page.locator('.audience-option').nth(2).click(); await pause(700); check(await geometry(page),2);
        await page.locator('.audience-option').first().focus(); await page.keyboard.press('Enter'); await pause(750); check(await geometry(page),0);
        await page.keyboard.press('ArrowDown'); await pause(750); check(await geometry(page),1);
        await page.keyboard.press(' '); await pause(750); check(await geometry(page),1);
        await page.keyboard.press('End'); await pause(750); check(await geometry(page),2);
        await page.keyboard.press('ArrowDown'); await pause(750); check(await geometry(page),0);
        await page.keyboard.press('ArrowUp'); await pause(750); check(await geometry(page),2);
        await page.keyboard.press('Home'); await pause(750); check(await geometry(page),0);
        await page.keyboard.press('Escape'); assert.equal(await page.locator('.audience-option:focus').count(),0);
        if(width===1920&&!reduced&&!missing) {
          await page.evaluate(()=>{
            window.__deckFrames=[];
            const until=performance.now()+1500;
            const sample=()=>{
              const cards=[...document.querySelectorAll('.audience-card')];
              const front=cards.find(n=>n.classList.contains('is-front'));
              window.__deckFrames.push({fronts:cards.filter(n=>n.classList.contains('is-front')).length,
                content:front&&getComputedStyle(front.querySelector('h3')).visibility==='visible',
                top:front&&cards.every(n=>+getComputedStyle(n).zIndex<=+getComputedStyle(front).zIndex)});
              if(performance.now()<until) requestAnimationFrame(sample);
            };sample();
          });
          await page.locator('.audience-option').nth(1).click();await pause(75);
          await page.locator('.audience-option').nth(2).click();await pause(75);
          await page.locator('.audience-option').nth(0).click();await pause(1500);
          const frames=await page.evaluate(()=>window.__deckFrames);
          assert.ok(frames.length>20,'Sample actual rendered animation frames');
          assert.ok(frames.every(n=>n.fronts===1&&n.content&&n.top),'Front text remains visible throughout interrupted transitions');
          check(await geometry(page),0);
          await page.setViewportSize({width:390,height:844});await pause(850);check(await geometry(page),0);
          await page.setViewportSize({width:1920,height:1080});await pause(850);
          const resized=await geometry(page);check(resized,resized.cards.findIndex(n=>n.active));
        }
        // Real pointer movement must not leave the deck empty between rows.
        if(width>850) {
          await page.locator('.audience-option').nth(1).hover(); await pause(750); check(await geometry(page),1);
          await page.mouse.move(2,2); await pause(750); check(await geometry(page),1);
          const row=await page.locator('.audience-option').nth(2).boundingBox();
          await page.mouse.move(row.x+50,row.y+row.height/2); await pause(60);
          const row0=await page.locator('.audience-option').first().boundingBox();
          await page.mouse.move(row0.x+50,row0.y+row0.height/2); await pause(750); check(await geometry(page),0);
        }
        if(!missing) {
          await page.evaluate(()=>document.activeElement.blur()); await page.mouse.move(2,2);
          const range=await page.evaluate(()=>{const t=ScrollTrigger.getById('synthecore-audiences'); return t&&{start:t.start,end:t.end,pin:!!t.pin};});
          assert.ok(range,'Audience observes existing scroll'); assert.equal(range.pin,false,'Audience never pins or captures scrolling');
          for(const index of [0,1,2,1,0]) {
            const target=range.start+(range.end-range.start)*(index+.5)/3;
            await page.mouse.wheel(0,target-await page.evaluate(()=>window.__synthecoreScrollQA.getState().targetScroll));
            await pause(1900); const state=await geometry(page); check(state,index);
          }
          await page.emulateMedia({reducedMotion:'reduce'}); await pause(300);
          await page.locator('.audience-option').nth(1).click(); check(await geometry(page),1);
          assert.equal(await page.locator('.audience-card.is-active').evaluate(n=>getComputedStyle(n).transitionDuration),'0s');
          assert.equal(await page.evaluate(()=>gsap.getTweensOf(document.querySelectorAll('.audience-card')).filter(t=>t.isActive()).length),0,'No active deck tween in reduced motion');
        }
        assert.deepEqual(entry.errors,[]); entry.status='passed';
      } catch(e) {entry.status='failed';entry.errors.push(e.message);}
      finally {report.cases.push(entry);console.log(`${entry.label}: ${entry.status}${entry.errors.length?' — '+entry.errors.join('; '):''}`);await context.close();}
    }
    report.status=report.cases.every(n=>n.status==='passed')?'passed':'failed';
    if(report.status==='failed') process.exitCode=1;
    await fs.writeFile(path.join(output,'acceptance.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify({status:report.status,cases:report.cases.map(({label,status,errors})=>({label,status,errors}))},null,2));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
