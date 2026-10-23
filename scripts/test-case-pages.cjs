'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8').replace(/\r\n/g,'\n');

test('case renderer builds a nested route from shared shell and case content',()=>{
 const {renderPage}=require('./build-site.cjs');
 const html=renderPage(root,'beauty-insight');
 assert.equal(html,read('raboty/beauty-insight/index.html'));
 assert.equal((html.match(/id="floatingHeader"/g)||[]).length,1);
 assert.equal((html.match(/id="roveiaWaveBg"/g)||[]).length,1);
 assert.ok(/интерактивный прототип/i.test(html));
 assert.ok(!/\{\{[^}]+\}\}/.test(html));
 for(const file of ['main.js','hero-scroll.js'])assert.ok(!html.includes(`/js/${file}`));
 for(const file of ['site-header.js','raboty-scroll.js','footer-waves.js','footer-reveal.js','raboty-cards.js'])assert.equal(html.split(`/js/${file}`).length-1,1);
 assert.equal((html.match(/class="sc-case-screens__open"/g)||[]).length,4);
 assert.equal((html.match(/data-process-step=/g)||[]).length,3);
 const related=html.slice(html.indexOf('id="relatedViewport"'),html.indexOf('related-work__controls'));
 assert.equal((related.match(/data-project=/g)||[]).length,5);
 assert.ok(!related.includes('data-project="beauty"'));
});

test('all case assets and local links resolve under the nested URL',()=>{
 const html=read('raboty/beauty-insight/index.html');
 for(const [,attr,value] of html.matchAll(/\b(src|href|data-full)="([^"]+)"/g)){
  if(/^(mailto:|https?:|data:)/.test(value))continue;
  assert.ok(value.startsWith('/')||value.startsWith('#'),`${attr} must be root absolute: ${value}`);
  const url=new URL(value,'http://local/raboty/beauty-insight/');
  let file=url.pathname.slice(1)||'index.html';
  if(file.endsWith('/'))file+='index.html';
  assert.ok(fs.existsSync(path.join(root,file)),`missing ${value}`);
  if(url.hash)assert.ok(read(file).includes(`id="${decodeURIComponent(url.hash.slice(1))}"`),`missing anchor ${value}`);
 }
});

test('case renderer escapes content and rejects missing or unsafe project data',()=>{
 const {renderCase}=require('./lib/case-page.cjs');
 const data=JSON.parse(read('templates/data/cases/beauty-insight.json'));
 const changed=structuredClone(data);changed.intro='<script>alert("x")</script> {{header}} {{footer}} {{home}}';
 const html=renderCase(root,changed);
 assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(!html.includes('<script>alert('));
 assert.ok(html.includes('&#123;&#123;header&#125;&#125;'));
 assert.equal((html.match(/\{\{header\}\}/g)||[]).length,1,'plain-text case data cannot inject a second shared shell');
 assert.throws(()=>renderCase(root,{...data,slug:'../escape'}),/slug/i);
 assert.throws(()=>renderCase(root,{...data,screens:[]}),/screens/i);
 assert.throws(()=>renderCase(root,{...data,hero_media:{...data.hero_media,main:{src:'javascript:alert(1)',alt:'x'}}}),/asset/i);
 const next=renderCase(root,{...data,slug:'next-case',catalog_id:'b2b',status:'Веб-сервис'});
 assert.ok(next.includes('data-project="beauty"'));
 assert.ok(!next.includes('sc-case-card-detail-link'),'catalog-only extra link must not alter future related-card geometry');
 assert.ok(next.includes('Beauty Insight AI — Веб-сервис'));
});

test('authorized case links restore exact original pages and reject other mutations',()=>{
 const crypto=require('node:crypto');const {restoreCaseLinks,linkedTitle,cardLink}=require('./lib/approved-case-links.cjs');
 const originals={'templates/pages/home.html':'49bed7ee41cd91c5c34b696a5d596fa9d32ee917ba32c6756347bc8b36f50b4f','templates/pages/works.html':'9f733f48690270aeb5a968b9f2311eb2c560cf165b0cab24c7964b33cc6e16f7'};
 const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
 for(const [file,marker] of [['templates/pages/home.html',linkedTitle],['templates/pages/works.html',cardLink]]){
  const html=read(file),original=originals[file];
  assert.equal(hash(restoreCaseLinks(file,html)),original);
  assert.throws(()=>restoreCaseLinks(file,html.replace(marker,marker+marker)),/exactly one/);
  assert.throws(()=>restoreCaseLinks(file,html.replace('/raboty/beauty-insight/','/raboty/missing/')),/exactly one|inside Beauty/);
  assert.throws(()=>restoreCaseLinks(file,html.replace('<link rel="stylesheet" href="/css/case-links.css">\n','').replace('</head>','</head><link rel="stylesheet" href="/css/case-links.css">\n')),/exactly one/);
  if(file.includes('works'))assert.throws(()=>restoreCaseLinks(file,html.replace(cardLink,'').replace('{{header}}','{{header}}'+cardLink)),/inside Beauty/);
  const changed=restoreCaseLinks(file,html.replace('id="top"','id="changed-top"'));
  if(html.includes('id="top"'))assert.notEqual(hash(changed),original);
 }
});

test('imported case images retain verified handoff bytes',()=>{
 const crypto=require('node:crypto');const audit=JSON.parse(read('docs/qa/beauty-v20/source-audit.json'));
 assert.equal(audit.images.length,9);
 for(const image of audit.images){const bytes=fs.readFileSync(path.join(root,image.destination));assert.equal(bytes.length,image.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),image.sha256)}
});
