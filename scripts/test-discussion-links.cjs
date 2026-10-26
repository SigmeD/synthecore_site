'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process'),crypto=require('node:crypto');
const {restoreCaseLinks}=require('./lib/approved-case-links.cjs');
const baseline=file=>cp.execFileSync('git',['show','6575dd7:'+file],{encoding:'utf8'});
const redirect=html=>html.replace(/<a\b[^>]*href="mailto:[^"]*"[^>]*>(?:<span[^>]*>)?Обсудить (?:задачу|похожую задачу)/g,anchor=>anchor.replace(/href="mailto:[^"]*"/,'href="/get-started/"'));

test('the v27 inverse accepts the approved href-only changes in the shared header',()=>{
 const file='templates/partials/header.html',original=baseline(file),changed=redirect(original);
 assert.notEqual(changed,original);
 assert.equal(restoreCaseLinks(file,changed),original);
});

const registeredFiles=[
 'templates/partials/header.html','templates/partials/footer.html',
 'templates/pages/home.html','templates/pages/works.html','templates/pages/case.html',
 'index.html','raboty/index.html',
 ...['beauty-insight','flowers','metal-calc','prostor','b2b','crm'].map(slug=>'raboty/'+slug+'/index.html')
];
test('only exact registered discussion anchors are restored, including legacy and mixed inputs',()=>{
 const {restoreDiscussionLinks}=require('./lib/approved-discussion-links.cjs');
 for(const file of registeredFiles){
  const original=baseline(file),changed=redirect(original);
  assert.notEqual(changed,original,file);
  assert.equal(restoreDiscussionLinks(file,original),original,'legacy '+file);
  assert.equal(restoreDiscussionLinks(file,changed),original,file);
  const mixed=changed.replace('href="/get-started/"',original.match(/href="mailto:[^"]*"/)[0]);
  assert.equal(restoreDiscussionLinks(file,mixed),original,'mixed '+file);
  const crlf=changed.replace(/\r?\n/g,'\r\n');
  assert.equal(restoreDiscussionLinks(file,crlf),original.replace(/\r?\n/g,'\r\n'),'raw EOL '+file);
 }
});
test('wrong destinations, duplicate anchors and changed attributes cannot pass the old byte contract',()=>{
 const {restoreDiscussionLinks}=require('./lib/approved-discussion-links.cjs');
 const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
 for(const file of registeredFiles){
  const original=baseline(file),changed=redirect(original),expected=hash(original);
  const accepted=html=>{try{return hash(restoreDiscussionLinks(file,html))===expected}catch{return false}};
  const anchor=changed.match(/<a\b[^>]*href="\/get-started\/"[^>]*>[\s\S]*?<\/a>/)[0];
  for(const href of ['/get-started','/get-started/#request','https://example.com/get-started/','mailto:other@example.com'])
   assert.equal(accepted(changed.replace('href="/get-started/"','href="'+href+'"')),false,file+': '+href);
  assert.equal(accepted(changed.replace(anchor,anchor+anchor)),false,'duplicate '+file);
  assert.equal(accepted(changed.replace(anchor,anchor.replace('<a ','<a data-extra="1" '))),false,'attributes '+file);
  assert.equal(accepted(changed.replace(anchor,anchor.replace('Обсудить','Уточнить'))),false,'label '+file);
  assert.equal(accepted(changed.replace(anchor,'')+anchor),false,'position '+file);
  assert.equal(accepted(changed.replace(anchor,anchor.replace('M4 12h15','M4 12h14'))),false,'SVG '+file);
  const email='<a href="mailto:contact@example.com">contact@example.com</a>';
  assert.equal(restoreDiscussionLinks(file,changed+email),original+email,'real email '+file);
 }
});
test('the exception never touches unregistered routes, script bytes or protected motion',()=>{
 const {restoreDiscussionLinks}=require('./lib/approved-discussion-links.cjs');
 const changed=redirect(baseline('templates/partials/header.html'));
 for(const file of ['get-started/index.html','privacy/index.html','raboty/unknown/index.html','css/faq-footer.css','js/main.js','', 'templates/pages/get-started.html'])
  assert.equal(restoreDiscussionLinks(file,changed),changed,file);
});
test('historical case inverses restore discussion links before their own route inversions',()=>{
 const {restoreRegisteredCaseLinks,restoreLaterCaseLinks}=require('./lib/case-baseline.cjs');
 const {casePages}=require('./lib/case-page.cjs'),path=require('node:path'),fs=require('node:fs');
 const root=path.resolve(__dirname,'..'),cases=casePages(root),hash=text=>crypto.createHash('sha256').update(text).digest('hex');
 for(const file of ['index.html','raboty/index.html','raboty/beauty-insight/index.html','templates/partials/header.html','templates/pages/case.html']){
  const original=baseline(file);
  assert.equal(restoreRegisteredCaseLinks(file,redirect(original),cases),restoreRegisteredCaseLinks(file,original,cases),file);
 }
 const joint=JSON.parse(fs.readFileSync(path.join(root,'docs/qa/case-integration/source-audit.json'),'utf8'));
 for(const [file,source]of Object.entries(joint.pages))
  assert.equal(hash(restoreLaterCaseLinks(redirect(baseline(file)),file)),source.normalizedBaselineSHA256,file);
 for(const name of ['b2b-v1','crm-v1','prostor-v1']){
  const audit=JSON.parse(fs.readFileSync(path.join(root,'docs/qa/'+name+'/source-audit.json'),'utf8'));
  const ids=audit.baselineCaseIds||['beauty','flowers','metal'];
  const later=cases.filter(c=>!ids.includes(c.catalog_id));
  for(const [file,expected]of Object.entries(audit.baselineFiles)){
   if(!file.endsWith('.html'))continue;
   const original=baseline(file),changed=redirect(original);
   // Some historical inputs record raw CRLF, so compare the inverse with its
   // identical legacy input here; the original audit tests retain raw SHA checks.
   assert.equal(restoreRegisteredCaseLinks(file,changed,later),restoreRegisteredCaseLinks(file,original,later),name+': '+file);
  }
 }
});
test('Git blob QA accepts exact CTA substitutions and rejects unrelated changes in a private index',()=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'synthecore-discussion-qa-'));
 const env={...process.env,GIT_INDEX_FILE:path.join(temp,'index')};
 const git=(args,input)=>cp.execFileSync('git',args,{env,input,encoding:'utf8'}).trim();
 const stage=(file,html)=>git(['update-index','--cacheinfo','100644',git(['hash-object','-w','--stdin'],html),file]);
 const verify=()=>cp.spawnSync(process.execPath,['docs/qa/v62-on-v27/verify-git.cjs'],{env,encoding:'utf8'});
 try{
  git(['read-tree','6575dd7']);
  for(const file of registeredFiles)stage(file,redirect(baseline(file)));
  const pass=verify();assert.equal(pass.status,0,pass.stdout+pass.stderr);
  const mutations=[
   ['templates/partials/header.html',html=>html.replace('href="/get-started/"','href="/get-started/#request"')],
   ['templates/partials/header.html',html=>html.replace('<a class="nav-cta"','<a data-extra="1" class="nav-cta"')],
   ['templates/partials/footer.html',html=>html.replace('Обсудить задачу','Написать нам')],
   ['templates/partials/footer.html',html=>html.replace('M4 12h15','M4 12h14')],
   ['templates/pages/works.html',html=>html.replace('class="catalog-intro__cta"','class="changed-cta"')],
   ['index.html',html=>html.replace('От небольшой доработки','Другая первая строка')],
   ['css/faq-footer.css',html=>html+'\n/* unauthorized */\n']
  ];
  for(const [file,mutate]of mutations){
   const approved=redirect(baseline(file)),changed=mutate(approved);assert.notEqual(changed,approved,file);
   stage(file,changed);const result=verify();assert.notEqual(result.status,0,file+' must fail blob QA');
   stage(file,approved);
  }
 }finally{
  assert.equal(path.dirname(path.resolve(temp)),path.resolve(os.tmpdir()));
  assert.ok(path.basename(temp).startsWith('synthecore-discussion-qa-'));
  fs.rmSync(temp,{recursive:true,force:true});
 }
});
