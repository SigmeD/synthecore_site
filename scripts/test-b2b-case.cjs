'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {renderCase}=require('./lib/case-page.cjs');
const {parseHTML,hasClass,textContent,inside}=require('./lib/static-html.cjs');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n'),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function fixture(){const beauty=JSON.parse(read('templates/data/cases/beauty-insight.json'));return {...beauty,slug:'b2b',catalog_id:'b2b',variant:'b2b-v1',process:[...beauty.process,beauty.process[0]],screens:beauty.screens.map(s=>({...s,full_src:beauty.hero_media.main.src}))}}
test('B2B v1 reuses the shared renderer with four steps and distinct preview/full image sources',()=>{
 const data=fixture(),html=renderCase(root,data);
 assert.ok(html.includes('sc-case-b2b'));assert.ok(html.includes('/css/case-b2b.css'));
 assert.equal((html.match(/class="sc-case-screens__open"/g)||[]).length,4);assert.equal((html.match(/data-process-step=/g)||[]).length,4);
 assert.ok(html.includes('data-full="'+data.screens[0].full_src+'"'));assert.ok(html.includes('<img src="'+data.screens[0].src+'"'));
 for(const file of ['beauty-insight','flowers','metal-calc','prostor']){
  const old=JSON.parse(read('templates/data/cases/'+file+'.json')),original=renderCase(root,old);
  if(file!=='prostor')assert.equal(renderCase(root,{...old,screens:old.screens.map(s=>({...s,full_src:'/assets/not-used.png'}))}),original,'Legacy variants retain their existing image behavior');
 }
});
test('B2B v1 rejects incorrect route, step/screen count and unsafe full-size assets',()=>{
 const data=fixture();
 for(const count of [0,3,5,7])assert.throws(()=>renderCase(root,{...data,screens:Array.from({length:count},(_,i)=>data.screens[i%4])}),/screens/i);
 assert.throws(()=>renderCase(root,{...data,process:data.process.slice(0,3)}),/four process/i);
 assert.throws(()=>renderCase(root,{...data,slug:'other'}),/B2B/i);assert.throws(()=>renderCase(root,{...data,catalog_id:'crm'}),/B2B/i);
 for(const full_src of ['https://example.com/image.png','/assets/../secret.png','/assets/cases/b2b/missing.png','javascript:alert(1)','']){
  const changed=structuredClone(data);changed.screens[0].full_src=full_src;assert.throws(()=>renderCase(root,changed),/asset/i);
 }
 assert.throws(()=>renderCase(root,{...data,hero_media:{main:data.hero_media.main}}),/hero/i);
 assert.throws(()=>renderCase(root,{...data,hero_media:{...data.hero_media,extra:data.hero_media.main}}),/hero/i);
});
test('B2B content and original images match the approved kit and preview',()=>{
 const data=JSON.parse(read('templates/data/cases/b2b.json')),html=read('raboty/b2b/index.html'),audit=JSON.parse(read('docs/qa/b2b-v1/source-audit.json'));
 assert.equal(require('./build-site.cjs').renderPage(root,'b2b'),html);
 const nodes=parseHTML(html).nodes,copy=require('./lib/project-copy.cjs').catalogCopy(root).b2b;
 assert.equal(textContent(nodes.find(n=>n.attrs.id==='caseTitle')),copy.title);assert.equal(copy.title,'Кабинет клиента');assert.ok(html.includes(copy.description));assert.ok(html.includes(copy.title+' — SyntheCore'));
 assert.equal(nodes.filter(n=>n.attrs.id==='floatingHeader').length,1);assert.equal(nodes.filter(n=>n.attrs.id==='contact').length,1);
 assert.deepEqual(data.process.map(s=>s.title),['Анализ задачи','Структура и сценарии','Дизайн интерфейсов','Интерактивный прототип и MVP']);
 assert.match(data.result,/интерактивный прототип и MVP/);assert.match(data.result_media.src,/request-detail.webp$/);assert.match(data.result_media.alt,/демонстрационные/);
 assert.deepEqual(data.screens.map(s=>s.caption),['Обзор кабинета','Реестр заявок','Платежи и реквизиты','Карточка заявки']);
 for(const [key,file]of [['left','requests'],['main','dashboard'],['right','payments']])assert.ok(data.hero_media[key].src.endsWith('/'+file+'.webp'));
 const track=nodes.find(n=>hasClass(n,'related-work__track')),cards=nodes.filter(n=>hasClass(n,'case-card__open')&&inside(n,track));assert.equal(cards.length,5);assert.ok(!cards.some(n=>n.attrs['data-project']==='b2b'));
 const crmCard=cards.find(n=>n.attrs['data-project']==='crm');assert.equal(crmCard.tag,'a');assert.equal(crmCard.attrs.href,'/raboty/crm/');
 for(const file of ['site-header.js','raboty-scroll.js','case-detail.js','footer-waves.js','footer-reveal.js'])assert.equal(html.split('/js/'+file+'"').length-1,1);
 assert.doesNotMatch(html,/src="[^\"]*(?:main\.js|hero-scroll\.js)/);
 for(const value of Object.values(audit.previewMatches))assert.equal(value,true);
 assert.equal(audit.images.length,8);for(const image of audit.images){const bytes=fs.readFileSync(image.destination);assert.equal(bytes.length,image.bytes);assert.equal(hash(bytes),image.sha256)}
 for(const field of ['src','full_src'])assert.equal(new Set(data.screens.map(s=>hash(fs.readFileSync(s[field].slice(1))))).size,4);
 for(const [,attr,value]of html.matchAll(/\b(src|href|data-full)="([^"]+)"/g)){
  if(/^(mailto:|https?:|data:)/.test(value))continue;assert.ok(value.startsWith('/')||value.startsWith('#'),attr+': '+value);
  const url=new URL(value,'http://local/raboty/b2b/'),file=(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname).slice(1);assert.ok(fs.existsSync(file),value);if(url.hash)assert.ok(read(file).includes('id="'+url.hash.slice(1)+'"'),value);
 }
});
test('B2B baseline preserves runtime/pages after exact registered anchors and v34 geometry reversal',()=>{
 const {restoreRegisteredCaseLinks,restoreWorksGeometry}=require('./lib/case-baseline.cjs'),audit=JSON.parse(read('docs/qa/b2b-v1/source-audit.json'));
 const later=require('./lib/case-page.cjs').casePages(root).filter(c=>!audit.baselineCaseIds.includes(c.catalog_id));
 for(const [file,expected]of Object.entries(audit.baselineFiles)){
  const bytes=restoreWorksGeometry(file,fs.readFileSync(file));let restored=file.endsWith('.html')?Buffer.from(restoreRegisteredCaseLinks(file,bytes.toString('utf8'),later)):bytes;
  if(audit.baselineTextEol.includes(file))restored=Buffer.from(restored.toString('utf8').replace(/\r\n/g,'\n'));
  assert.equal(hash(restored),expected,file);
 }
});
test('the B2B baseline names actual Git blobs and never normalizes protected motion',()=>{
 const {execFileSync}=require('node:child_process'),audit=JSON.parse(read('docs/qa/b2b-v1/source-audit.json'));
 const motion=JSON.parse(read('docs/V62_SOURCE_SHA256.json')).motion_lock;
 for(const [file,expected]of Object.entries(audit.baselineFiles)){
  const source=execFileSync('git',['show',audit.baseCommit+':'+file],{cwd:root});assert.equal(hash(source),expected,file);
  if(audit.baselineTextEol.includes(file))assert.ok(!Object.hasOwn(motion,file),'Raw motion may not be normalized: '+file);
 }
});
test('baseline restoration refuses wrong URLs and duplicate links and does not hide changed copy',()=>{
 const {restoreRegisteredCaseLinks}=require('./lib/case-baseline.cjs'),data=JSON.parse(read('templates/data/cases/b2b.json'));
 const audit=JSON.parse(read('docs/qa/b2b-v1/source-audit.json'));
 const later=require('./lib/case-page.cjs').casePages(root).filter(c=>!audit.baselineCaseIds.includes(c.catalog_id));
 for(const file of ['index.html','raboty/index.html','raboty/prostor/index.html']){
  assert.equal(hash(restoreRegisteredCaseLinks(file,read(file),later)),audit.baselineFiles[file]);
  const html=read(file);assert.throws(()=>restoreRegisteredCaseLinks(file,html.replace('/raboty/b2b/','/raboty/wrong-b2b/'),[data]),/route|link/i);
  const marker=file==='index.html'?html.match(/<a class="sc-work-detail-link"[^>]*href="\/raboty\/b2b\/"[^>]*><\/a>/)[0]:html.match(/<a [^>]*data-project="b2b"[^>]*>/)[0];
  assert.throws(()=>restoreRegisteredCaseLinks(file,html.replace(marker,marker+marker),[data]),/anchor|link/i);
  assert.notEqual(hash(restoreRegisteredCaseLinks(file,html.replace('Кабинет клиента','Другой кабинет'),later)),audit.baselineFiles[file]);
 }
});
