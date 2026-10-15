const fs=require('node:fs/promises');
const assert=require('node:assert/strict');
const {chromium}=require(require.resolve('playwright-core',{paths:[process.cwd(),process.env.USERPROFILE]}));
(async()=>{const b=await chromium.connectOverCDP('http://127.0.0.1:9222'),report={cases:[]};try{
  for(const scenario of['scrub-hold-next-gesture','native-during-scrub-catchup']){
    const c=await b.newContext({viewport:{width:1920,height:1080}}),p=await c.newPage(),e={scenario};
    try{await p.goto('http://127.0.0.1:4173/');await p.waitForFunction(()=>window.__synthecoreScrollQA.getState().ready);await p.mouse.move(2,2);await p.mouse.wheel(0,20000);
      await p.waitForFunction(()=>{const q=window.__synthecoreScrollQA.getState();return q.scrollSettled&&q.gateState==='SETTLING'&&q.timelineProgress<.999999;});
      e.catchingUp=await p.evaluate(()=>window.__synthecoreScrollQA.getState());assert.equal(e.catchingUp.scroll,e.catchingUp.pinEnd);
      if(scenario==='scrub-hold-next-gesture'){
        await p.waitForFunction(()=>window.__synthecoreScrollQA.getState().gateState==='READY');e.ready=await p.evaluate(()=>window.__synthecoreScrollQA.getState());assert.equal(e.ready.timelineProgress,1);
        await p.waitForTimeout(1600);assert.equal(await p.evaluate(()=>scrollY),e.ready.pinEnd);
        await p.mouse.wheel(0,200);await p.waitForTimeout(1800);e.leaving=await p.evaluate(()=>window.__synthecoreScrollQA.getState());assert.equal(e.leaving.gateState,'LEAVING');assert.ok(e.leaving.parallaxProgress>0);
      }else{
        await p.evaluate(()=>scrollTo(0,window.__synthecoreScrollQA.getState().pinEnd+200));await p.waitForTimeout(1600);e.after=await p.evaluate(()=>window.__synthecoreScrollQA.getState());
        assert.equal(e.after.gateState,'LEAVING');assert.equal(e.after.scroll,e.after.pinEnd+200);await p.mouse.wheel(0,100);await p.waitForTimeout(1600);assert.ok(await p.evaluate(()=>scrollY)>e.after.scroll);
      }e.status='passed';
    }catch(x){e.status='failed';e.error=x.stack;}finally{report.cases.push(e);console.log(scenario,e.status,e.error||'');await c.close();}
  }report.status=report.cases.every(e=>e.status==='passed')?'passed':'failed';await fs.writeFile('output/playwright/audience-parallax/checkpoint.json',JSON.stringify(report,null,2));if(report.status==='failed')process.exitCode=1;
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
