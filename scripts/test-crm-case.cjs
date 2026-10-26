'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {renderCase}=require('./lib/case-page.cjs');
const {parseHTML,hasClass,textContent,inside}=require('./lib/static-html.cjs');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function fixture(){const beauty=JSON.parse(read('templates/data/cases/beauty-insight.json'));return {...beauty,slug:'crm',catalog_id:'crm',variant:'crm-v1',process:[...beauty.process,beauty.process[0]],screens:beauty.screens.slice(0,3).map(s=>({...s,full_src:beauty.hero_media.main.src}))}}
test('CRM alone renders three interfaces, four stages and separate full-size media',()=>{
 const data=fixture(),html=renderCase(root,data);assert.ok(html.includes('sc-case-crm'));assert.ok(html.includes('/css/case-crm.css'));
 assert.equal((html.match(/class="sc-case-screens__open"/g)||[]).length,3);assert.equal((html.match(/data-process-step=/g)||[]).length,4);
 assert.ok(html.includes('data-full="'+data.screens[0].full_src+'"'));assert.ok(html.includes('<img src="'+data.screens[0].src+'"'));
 for(const file of ['beauty-insight','flowers','metal-calc','b2b','prostor']){
  const old=JSON.parse(read('templates/data/cases/'+file+'.json'));assert.throws(()=>renderCase(root,{...old,screens:data.screens}),/screens/i);
 }
});
test('CRM rejects wrong route, three-screen count, duplicate images, steps and unsafe originals',()=>{
 const data=fixture();for(const count of [0,2,4,7])assert.throws(()=>renderCase(root,{...data,screens:Array.from({length:count},(_,i)=>data.screens[i%3])}),/screens/i);
 assert.throws(()=>renderCase(root,{...data,screens:data.screens.map(()=>data.screens[0])}),/distinct|unique/i);
 for(const process of [data.process.slice(0,3),[...data.process,data.process[0]]])assert.throws(()=>renderCase(root,{...data,process}),/four process/i);
 assert.throws(()=>renderCase(root,{...data,slug:'other'}),/CRM/i);assert.throws(()=>renderCase(root,{...data,catalog_id:'b2b'}),/CRM/i);
 for(const full_src of ['https://example.com/image.png','/assets/../private.png','/assets/cases/crm/missing.png','javascript:alert(1)','']){const changed=structuredClone(data);changed.screens[0].full_src=full_src;assert.throws(()=>renderCase(root,changed),/asset/i)}
 assert.throws(()=>renderCase(root,{...data,hero_media:{main:data.hero_media.main}}),/hero/i);assert.throws(()=>renderCase(root,{...data,hero_media:{...data.hero_media,extra:data.hero_media.main}}),/hero/i);
});
test('CRM copy, source screens and related work match the catalog and approved preview',()=>{
 const data=JSON.parse(read('templates/data/cases/crm.json')),html=read('raboty/crm/index.html'),audit=JSON.parse(read('docs/qa/crm-v1/source-audit.json'));
 assert.equal(require('./build-site.cjs').renderPage(root,'crm'),html);const nodes=parseHTML(html).nodes,copy=require('./lib/project-copy.cjs').catalogCopy(root).crm;
 assert.equal(copy.title,'CRM для управления продажами');assert.deepEqual(copy.tags,['Веб-сервис','Клиенты и сделки']);
 assert.equal(textContent(nodes.find(n=>n.attrs.id==='caseTitle')),copy.title);assert.ok(html.includes(copy.description));assert.ok(html.includes(copy.title+' — SyntheCore'));
 assert.equal(nodes.filter(n=>n.attrs.id==='floatingHeader').length,1);assert.equal(nodes.filter(n=>n.attrs.id==='contact').length,1);
 assert.deepEqual(data.process.map(s=>s.title),['Анализ задачи','Структура и сценарии','Дизайн интерфейсов','Реализация CRM']);
 assert.deepEqual(data.screens.map(s=>s.caption),['Карточка сделки','Компании и контакты','Аналитика продаж']);assert.ok(data.result_media.src.endsWith('/analytics.webp'));assert.match(data.result_media.alt,/демонстрационные/);
 for(const [key,file]of [['left','companies'],['main','deal'],['right','analytics']])assert.ok(data.hero_media[key].src.endsWith('/'+file+'.webp'));
 const track=nodes.find(n=>hasClass(n,'related-work__track')),cards=nodes.filter(n=>hasClass(n,'case-card__open')&&inside(n,track));assert.equal(cards.length,5);assert.ok(!cards.some(n=>n.attrs['data-project']==='crm'));assert.ok(cards.every(n=>n.tag==='a'));
 for(const file of ['site-header.js','raboty-scroll.js','case-detail.js','footer-waves.js','footer-reveal.js'])assert.equal(html.split('/js/'+file+'"').length-1,1);assert.doesNotMatch(html,/src="[^\"]*(?:main\.js|hero-scroll\.js)/);
 assert.equal(audit.images.length,6);for(const image of audit.images){const bytes=fs.readFileSync(image.destination);assert.equal(bytes.length,image.bytes);assert.equal(hash(bytes),image.sha256)}
 for(const field of ['src','full_src'])assert.equal(new Set(data.screens.map(s=>hash(fs.readFileSync(s[field].slice(1))))).size,3);
 for(const value of Object.values(audit.previewMatches))assert.equal(value,true);
 const css=read('css/case-crm.css').replaceAll('body.sc-case-crm','body.detail-crm');assert.equal(hash(css),audit.sourceFiles['preview:CRM-style']);
 for(const [,attr,value]of html.matchAll(/\b(src|href|data-full)="([^"]+)"/g)){
  if(/^(mailto:|https?:|data:)/.test(value))continue;assert.ok(value.startsWith('/')||value.startsWith('#'),attr+': '+value);
  const url=new URL(value,'http://local/raboty/crm/'),file=(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname).slice(1);assert.ok(fs.existsSync(file),value);if(url.hash)assert.ok(read(file).includes('id="'+url.hash.slice(1)+'"'),value);
 }
});
test('CRM snapshot preserves runtime/pages after exact registered anchor and v34 geometry reversal',()=>{
 const {restoreRegisteredCaseLinks,restoreWorksGeometry}=require('./lib/case-baseline.cjs'),data=JSON.parse(read('templates/data/cases/crm.json')),audit=JSON.parse(read('docs/qa/crm-v1/source-audit.json'));
 for(const [file,expected]of Object.entries(audit.baselineFiles)){
  let bytes=restoreWorksGeometry(file,fs.readFileSync(file));if(file.endsWith('.html'))bytes=Buffer.from(restoreRegisteredCaseLinks(file,bytes.toString('utf8'),[data]));
  if(audit.baselineTextEol.includes(file))bytes=Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n'));assert.equal(hash(bytes),expected,file);
 }
});
test('CRM baseline uses actual Git blobs and never normalizes raw motion',()=>{
 const {execFileSync}=require('node:child_process'),audit=JSON.parse(read('docs/qa/crm-v1/source-audit.json')),motion=JSON.parse(read('docs/V62_SOURCE_SHA256.json')).motion_lock;
 for(const [file,expected]of Object.entries(audit.baselineFiles)){
  assert.equal(hash(execFileSync('git',['show',audit.baseCommit+':'+file],{cwd:root})),expected,file);
  if(audit.baselineTextEol.includes(file))assert.ok(!Object.hasOwn(motion,file));
 }
});
test('CRM route restoration rejects malformed/duplicate links and preserves content checks',()=>{
 const {restoreRegisteredCaseLinks}=require('./lib/case-baseline.cjs'),data=JSON.parse(read('templates/data/cases/crm.json')),audit=JSON.parse(read('docs/qa/crm-v1/source-audit.json'));
 for(const file of ['index.html','raboty/index.html','raboty/b2b/index.html']){
  const html=read(file);assert.equal(hash(restoreRegisteredCaseLinks(file,html,[data])),audit.baselineFiles[file]);
  assert.throws(()=>restoreRegisteredCaseLinks(file,html.replace('/raboty/crm/','/raboty/broken-crm/'),[data]),/link|route/i);
  const marker=file==='index.html'?html.match(/<a class="sc-work-detail-link"[^>]*href="\/raboty\/crm\/"[^>]*><\/a>/)[0]:html.match(/<a [^>]*data-project="crm"[^>]*>/)[0];
  assert.throws(()=>restoreRegisteredCaseLinks(file,html.replace(marker,marker+marker),[data]),/link|anchor/i);
  assert.notEqual(hash(restoreRegisteredCaseLinks(file,html.replace('CRM для управления продажами','Другая CRM'),[data])),audit.baselineFiles[file]);
 }
});
