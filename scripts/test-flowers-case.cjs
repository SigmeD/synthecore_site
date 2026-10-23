'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {parseHTML,hasClass,inside,textContent}=require('./lib/static-html.cjs');
const {restoreLaterCaseLinks}=require('./lib/case-baseline.cjs');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n'),hash=text=>crypto.createHash('sha256').update(text).digest('hex');
test('Flowers is built from the canonical catalog copy and existing shared components',()=>{
 const html=read('raboty/flowers/index.html');assert.equal(require('./build-site.cjs').renderPage(root,'flowers'),html);
 const nodes=parseHTML(html).nodes;assert.equal(textContent(nodes.find(n=>n.attrs.id==='caseTitle')),'Приложение для заказа цветов');
 assert.equal(nodes.filter(n=>n.attrs.id==='floatingHeader').length,1);assert.equal(nodes.filter(n=>n.attrs.id==='contact').length,1);
 for(const file of ['case-detail.js','site-header.js','raboty-scroll.js','footer-waves.js','footer-reveal.js'])assert.equal(html.split('/js/'+file+'"').length-1,1);
 assert.ok(html.includes('/css/case-flowers.css'));assert.ok(html.includes('sc-case-flowers'));
 assert.ok(!/src="[^\"]*(?:main\.js|hero-scroll\.js)/.test(html));
});
test('Flowers retains three phones, four factual prototype stages, two result devices and four full interfaces',()=>{
 const nodes=parseHTML(read('raboty/flowers/index.html')).nodes;
 assert.equal(nodes.filter(n=>hasClass(n,'flowers-hero__phone')).length,3);assert.equal(nodes.filter(n=>hasClass(n,'sc-case-process__step')).length,4);
 assert.equal(nodes.filter(n=>hasClass(n,'flowers-result__device')).length,2);assert.equal(nodes.filter(n=>hasClass(n,'sc-case-screens__open')).length,4);
 const process=nodes.find(n=>n.attrs.id==='our-process'),result=nodes.find(n=>n.attrs.id==='case-result');
 assert.match(textContent(process),/По данным заказчика, около 80%/);assert.match(textContent(result),/UX\/UI-концепт и интерактивный прототип/);
 const top=nodes.find(n=>n.attrs.id==='caseTitle').parent;assert.doesNotMatch(textContent(top),/UX\/UI · Mobile First|Дизайн и прототип/);
 const related=nodes.find(n=>hasClass(n,'related-work__track')),cards=nodes.filter(n=>hasClass(n,'case-card__open')&&inside(n,related));
 assert.equal(cards.length,5);assert.ok(!cards.some(n=>n.attrs['data-project']==='flowers'));assert.equal(cards.find(n=>n.attrs['data-project']==='beauty').attrs.href,'/raboty/beauty-insight/');
});
test('the Flowers variant rejects unapproved layouts and incorrect media/process data',()=>{
 const {renderCase}=require('./lib/case-page.cjs'),data=JSON.parse(read('templates/data/cases/flowers.json'));
 for(const mutate of [d=>d.variant='flowers-v3',d=>d.process.pop(),d=>delete d.hero_media.right,d=>d.hero_media.extra=d.hero_media.main,d=>d.hero_media.main.src='/assets/../secret',d=>d.h1='Alternative title']){
  const changed=structuredClone(data);mutate(changed);assert.throws(()=>renderCase(root,changed));
 }
});
test('Flowers assets retain source bytes, resources resolve, and other catalog/Beauty content remains unchanged',()=>{
 const audit=JSON.parse(read('docs/qa/flowers-v2/source-audit.json')),html=read('raboty/flowers/index.html');assert.equal(Object.keys(audit.assets).length,4);
 for(const [src,data] of Object.entries(audit.assets)){const bytes=fs.readFileSync(path.join(root,src.slice(1)));assert.equal(bytes.length,data.bytes);assert.equal(hash(bytes),data.sha256)}
 for(const [,value]of html.matchAll(/\b(?:src|href|data-full)="([^"]+)"/g)){
  if(/^(mailto:|https?:|data:)/.test(value))continue;assert.ok(value.startsWith('/')||value.startsWith('#'));
  const url=new URL(value,'http://local/raboty/flowers/');let file=url.pathname.slice(1)||'index.html';if(file.endsWith('/'))file+='index.html';assert.ok(fs.existsSync(path.join(root,file)),value);
  if(url.hash)assert.ok(read(file).includes('id="'+decodeURIComponent(url.hash.slice(1))+'"'),value);
 }
 for(const match of restoreLaterCaseLinks(read('raboty/index.html')).matchAll(/<article class="case-card case-card--([^\"]+)">[\s\S]*?<\/article>/g))if(match[1]!=='flowers')assert.equal(hash(match[0]),audit.catalogArticles[match[1]].baselineSHA256);
 const beauty=restoreLaterCaseLinks(read('raboty/beauty-insight/index.html'));
 assert.equal(hash(beauty),audit.beauty.baselineSHA256);
});
