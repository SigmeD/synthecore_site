const fs=require('node:fs/promises');
const assert=require('node:assert/strict');
const {chromium}=require(require.resolve('playwright-core',{paths:[process.cwd(),process.env.USERPROFILE]}));
const report={date:new Date().toISOString(),cases:[]};
(async()=>{const b=await chromium.connectOverCDP('http://127.0.0.1:9222');try{
  for(const scenario of ['resize-during-expansion','native-during-settlement','middle-click-during-settlement']){
    const c=await b.newContext({viewport:{width:1920,height:1080}}),p=await c.newPage(),e={scenario};
    try{await p.goto('http://127.0.0.1:4173/');await p.waitForFunction(()=>window.__synthecoreScrollQA.getState().ready);await p.mouse.move(2,2);
      const state=()=>p.evaluate(()=>({...window.__synthecoreScrollQA.getState(),headingTop:document.querySelector('#audience-title').getBoundingClientRect().top,height:innerHeight}));
      if(scenario==='resize-during-expansion'){
        await p.mouse.wheel(0,1100);await p.waitForTimeout(90);e.before=await state();assert.equal(e.before.gateState,'EXPANDING');
        await p.setViewportSize({width:1366,height:768});await p.waitForTimeout(1700);e.after=await state();
        assert.equal(e.after.gateState,'READY');assert.ok(Math.abs(e.after.scroll-e.after.pinEnd)<1);assert.ok(e.after.headingTop>=e.after.height);
        await p.mouse.wheel(0,300);await p.waitForTimeout(1500);assert.equal((await state()).gateState,'LEAVING');
      }else if(scenario==='native-during-settlement'){
        await p.mouse.wheel(0,20000);await p.waitForTimeout(150);e.before=await state();assert.equal(e.before.gateState,'SETTLING');
        await p.evaluate(()=>scrollTo({top:1800,behavior:'instant'}));await p.waitForTimeout(1600);e.after=await state();
        assert.ok(Math.abs(e.after.scroll-1800)<1,'native input must cancel settlement');assert.equal(e.after.gateState,'LEAVING');
        assert.equal(e.after.gestureReason,'native-scroll');
        await p.keyboard.press('Home');await p.waitForTimeout(600);await p.mouse.wheel(0,20000);await p.waitForTimeout(1500);
        assert.equal((await state()).gateState,'READY','native bypass does not disable future checkpoints');
      }else{
        await p.mouse.wheel(0,20000);await p.waitForTimeout(150);e.before=await state();assert.equal(e.before.gateState,'SETTLING');
        await p.mouse.click(400,600,{button:'middle'});await p.waitForTimeout(1500);e.after=await state();
        assert.notEqual(e.after.gateState,'SETTLING','canceled Lenis completion must not strand the gate');
        await p.mouse.wheel(0,250);await p.waitForTimeout(1500);assert.ok((await state()).scroll>e.after.scroll+200);
        await p.mouse.wheel(0,20000);await p.waitForTimeout(1500);assert.equal((await state()).gateState,'READY');
      }e.status='passed';
    }catch(x){e.status='failed';e.error=x.stack;}finally{report.cases.push(e);console.log(scenario,e.status,e.error||'');await c.close();}
  }report.status=report.cases.every(e=>e.status==='passed')?'passed':'failed';
  await fs.writeFile('output/playwright/hero-gate/edge-acceptance.json',JSON.stringify(report,null,2));if(report.status==='failed')process.exitCode=1;
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
