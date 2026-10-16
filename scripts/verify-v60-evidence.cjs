// Validate retained acceptance evidence and collect fresh static logs.
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const pw=require(require.resolve('playwright',{paths:[process.cwd(),process.env.USERPROFILE||'']}));
const root=path.resolve(__dirname,'..'),qa=path.join(root,'docs/qa/v60');
const url=process.env.SYNTHECORE_URL||'http://127.0.0.1:4174/';
const sizes=['3840x2160','2560x1440','2048x1080','1920x1080','1440x900','1366x768','1024x768','768x1024','390x844','320x568'];
(async()=>{
 const summary={date:new Date().toISOString(),matrix:[],videos:[],videoPolicy:'local-only; recordings are intentionally excluded from Git',static:[]};
 for(const size of sizes){const r=JSON.parse(await fs.readFile(path.join(qa,size,'results.json')));assert.equal(r.pass,true,size);assert.equal(Object.keys(r.sectionResults).length,8,size+' sections');assert.ok(Object.values(r.sectionResults).every(Boolean));summary.matrix.push({viewport:size,checks:r.checks.length,samples:r.scrollSamples.length,pass:true});}
 const commands=[['scripts/check-project.cjs','--http',url],['scripts/verify-works-static.cjs'],['scripts/verify-services-static.cjs'],['scripts/check-hero-geometry.cjs'],['scripts/verify-works-handoff-v45.cjs'],['--test','scripts/test-static-checks.cjs']];
 let log='Fresh v60 checks '+new Date().toISOString()+'\n';
 for(const args of commands){const r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});log+='\nnode '+args.join(' ')+'\n'+r.stdout+r.stderr;summary.static.push({command:'node '+args.join(' '),exit:r.status});assert.equal(r.status,0,args.join(' '));}
 await fs.writeFile(path.join(qa,'static-checks.txt'),log);
 const browser=await pw.chromium.launch({headless:true});
 try{const page=await browser.newPage();for(const size of ['3840x2160','2560x1440','1920x1080','1440x900']){
   await page.goto(url,{waitUntil:'load'});
   await page.evaluate(source=>{document.body.innerHTML='';const video=document.createElement('video');video.controls=true;video.preload='auto';video.src=source;document.body.append(video);},url+'docs/qa/v60/'+size+'/scroll-and-checks.webm');
   await page.waitForFunction(()=>{const v=document.querySelector('video');return v.readyState>=2 && v.duration>0;});
   const metadata=await page.locator('video').evaluate(v=>({duration:v.duration,width:v.videoWidth,height:v.videoHeight}));assert.ok(metadata.duration>20);
   for(const progress of [.05,.45,.85]){await page.locator('video').evaluate((v,p)=>{v.currentTime=v.duration*p;},progress);await page.waitForFunction(()=>{const v=document.querySelector('video');return !v.seeking&&v.readyState>=2;});assert.equal(await page.locator('video').evaluate(v=>v.error),null);}
   summary.videos.push({viewport:size,...metadata,decoded:true});
 }}finally{await browser.close();}
 const motion=JSON.parse(await fs.readFile(path.join(root,'output/playwright/v60/motion/report-isolated.json')));
 await fs.mkdir(path.join(qa,'motion'),{recursive:true});await fs.writeFile(path.join(qa,'motion/report-isolated.json'),JSON.stringify(motion,null,2));
 summary.motion=motion.cases.map(c=>({viewport:c.viewport,...c.frames}));
 await fs.writeFile(path.join(qa,'summary.json'),JSON.stringify(summary,null,2));
 let index='# Материалы QA v60\n\nПолный протокол: [QA_V60](../../QA_V60.md). Снимки выполнены с DPR 1. По указанию владельца видео сохраняются только локально и исключены из Git; их фактические параметры и результат декодирования указаны в [сводке](summary.json). После клонирования записи можно повторно создать браузерным сценарием.\n\n';
 for(const size of sizes){index+='## '+size+'\n\n[Измерения и проверки]('+size+'/results.json)';if(summary.videos.some(v=>v.viewport===size))index+=' · локальная запись: `docs/qa/v60/'+size+'/scroll-and-checks.webm`';index+='\n\n';for(const file of (await fs.readdir(path.join(qa,size))).filter(f=>f.endsWith('.jpg')))index+='- ['+file.replace('.jpg','')+']('+size+'/'+file+')\n';index+='\n';}
 await fs.writeFile(path.join(qa,'README.md'),index.trimEnd()+'\n');
 console.log(JSON.stringify({matrix:summary.matrix,videos:summary.videos,static:summary.static},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
