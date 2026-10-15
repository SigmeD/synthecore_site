const fs=require('node:fs/promises');
const assert=require('node:assert/strict');
const {chromium}=require(require.resolve('playwright-core',{paths:[process.cwd(),process.env.USERPROFILE]}));
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await chromium.connectOverCDP('http://127.0.0.1:9222'),c=await b.newContext({viewport:{width:1920,height:1080}});
  const report={date:new Date().toISOString(),checks:[],errors:[]};try{
    const p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));
    const open=async url=>{await p.goto(url);await p.waitForFunction(()=>window.__synthecoreScrollQA.getState().ready);await pause(350);};
    const state=()=>p.evaluate(()=>window.__synthecoreScrollQA.getState());
    const wheelTo=async target=>{await p.mouse.wheel(0,target-(await state()).targetScroll);await pause(1600);};
    const visibility=()=>p.evaluate(()=>({inert:document.querySelector('.audience-container').inert,
      heading:getComputedStyle(document.querySelector('#audience-title')).visibility,
      options:[...document.querySelectorAll('.audience-option')].map(n=>getComputedStyle(n).visibility),
      following:[...document.querySelectorAll('#audiences ~ section')].map(n=>getComputedStyle(n).visibility),
      spacers:document.querySelectorAll('.pin-spacer').length,handoff:!!window.ScrollTrigger?.getById('synthecore-handoff')}));
    await open('http://127.0.0.1:4173/');let q=await state();
    await p.locator('.audience-option').first().focus();assert.equal(await p.locator('.audience-card.is-active').count(),0,'Intro controls cannot be focused invisibly');
    await wheelTo(q.pinEnd*.45);await p.setViewportSize({width:3840,height:2160});await pause(600);
    q=await state();assert.ok(Math.abs(q.handoffStart-q.pinEnd)<.01);assert.equal((await visibility()).inert,true);
    assert.equal((await visibility()).spacers,1);report.checks.push('Resize during first phase refreshes entrance boundary without adding a spacer');
    await wheelTo(q.handoffEnd+2);await p.locator('.audience-option').first().focus();assert.equal(await p.locator('.audience-card.is-active').count(),1);
    await wheelTo(q.pinEnd);await pause(300);assert.equal((await visibility()).inert,true);
    assert.equal(await p.locator('.audience-card.is-active').count(),0,'Reverse dismisses focus on hidden cards');report.checks.push('Reverse entrance hides content before image contracts and clears hidden focus');
    await p.emulateMedia({reducedMotion:'reduce'});await pause(400);let v=await visibility();
    assert.equal(v.inert,false);assert.equal(v.heading,'visible');assert.ok(v.options.every(n=>n==='visible'));
    assert.ok(v.following.every(n=>n==='visible'));assert.equal(v.spacers,0);assert.equal(v.handoff,false);
    report.checks.push('Reduced motion restores all original visibility, focusability and removes both triggers');
    await p.emulateMedia({reducedMotion:'no-preference'});await pause(400);
    await p.setViewportSize({width:390,height:844});await pause(500);v=await visibility();
    assert.equal((await state()).engine,'native-mobile');assert.equal(v.inert,false);assert.equal(v.handoff,false);assert.equal(v.spacers,0);
    assert.equal(v.heading,'visible');report.checks.push('Mobile fallback leaves no hidden content or inert container');
    await p.setViewportSize({width:1920,height:1080});await pause(500);assert.equal((await visibility()).spacers,1);
    await open('http://127.0.0.1:4173/#audiences');q=await state();assert.equal(q.handoffProgress,1);assert.equal((await visibility()).inert,false);
    await p.locator('.audience-option').first().hover();assert.equal(await p.locator('.audience-card.is-active').count(),1);
    await p.mouse.move(2,2);assert.equal(await p.locator('.audience-card.is-active').count(),0);
    await open('http://127.0.0.1:4173/#services');assert.equal((await state()).handoffProgress,1);assert.ok((await visibility()).following.every(n=>n==='visible'));
    report.checks.push('Direct audience/services anchors restore finished entrance and working hover preview');
    assert.deepEqual(report.errors,[]);report.status='passed';
  }catch(e){report.status='failed';report.errors.push(e.message);process.exitCode=1;}
  finally{await fs.writeFile('output/playwright/hero-two-phases/lifecycle.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await c.close();await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
