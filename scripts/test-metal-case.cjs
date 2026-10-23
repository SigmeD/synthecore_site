'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {parseHTML,hasClass,inside,textContent}=require('./lib/static-html.cjs');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8').replace(/\r\n/g,'\n');
test('metal route is generated through the shared shell and catalog copy',()=>{
 const {renderPage}=require('./build-site.cjs');
 const html=renderPage(root,'metal-calc');assert.equal(html,read('raboty/metal-calc/index.html'));
 const nodes=parseHTML(html).nodes;
 assert.equal(textContent(nodes.find(n=>n.attrs.id==='caseTitle')),'Калькулятор стоимости металлоизделий');
 assert.equal(nodes.filter(n=>n.attrs.id==='floatingHeader').length,1);
 assert.equal(nodes.filter(n=>n.attrs.id==='contact').length,1);
 assert.ok(html.includes('sc-case-metal'));
 assert.ok(html.includes('/css/case-metal.css'));
 for(const name of ['case-detail.js','site-header.js','raboty-scroll.js','footer-waves.js','footer-reveal.js'])assert.equal(html.split('/js/'+name+'"').length-1,1);
 assert.ok(!/src="[^\"]*(?:main\.js|hero-scroll\.js)/.test(html));
});
test('metal variant renders one hero, five steps and the approved result banner',()=>{
 const nodes=parseHTML(read('raboty/metal-calc/index.html')).nodes;
 const hero=nodes.find(n=>hasClass(n,'case-hero__media'));
 assert.equal(nodes.filter(n=>n.tag==='img'&&inside(n,hero)).length,1);
 assert.equal(nodes.filter(n=>hasClass(n,'sc-case-process__step')).length,5);
 assert.equal(nodes.filter(n=>hasClass(n,'sc-case-screens__open')).length,4);
 assert.equal(textContent(nodes.find(n=>hasClass(n,'metal-result-banner__value'))),'−50%');
 assert.equal(textContent(nodes.find(n=>hasClass(n,'metal-result-banner__label'))),'времени на расчёт стоимости изделий');
 assert.ok(!nodes.some(n=>hasClass(n,'sc-case-result__hero')),'v5 removed the separate result screenshot');
 const related=nodes.find(n=>hasClass(n,'related-work__track'));
 const cards=nodes.filter(n=>hasClass(n,'case-card__open')&&inside(n,related));
 assert.equal(cards.length,5);assert.ok(!cards.some(n=>n.attrs['data-project']==='metal'));
 assert.equal(cards.find(n=>n.attrs['data-project']==='beauty').attrs.href,'/raboty/beauty-insight/');
});
test('catalog registers the new primary route and keeps the other five cards',()=>{
 const nodes=parseHTML(read('raboty/index.html')).nodes;
 const cards=nodes.filter(n=>hasClass(n,'case-card__open'));assert.equal(cards.length,6);
 assert.equal(cards.find(n=>n.attrs['data-project']==='metal').attrs.href,'/raboty/metal-calc/');
 assert.equal(cards.find(n=>n.attrs['data-project']==='beauty').attrs.href,'/raboty/beauty-insight/');
 assert.equal(cards.filter(n=>n.tag==='button').length,4);
});

test('metal variant rejects extra hero images, unknown layouts and missing result proof fields',()=>{
 const {renderCase}=require('./lib/case-page.cjs');const data=JSON.parse(read('templates/data/cases/metal-calc.json'));
 assert.throws(()=>renderCase(root,{...data,variant:'../other'}),/Unknown case variant/);
 assert.throws(()=>renderCase(root,{...data,hero_media:{...data.hero_media,left:data.hero_media.main}}),/one complete central image/);
 assert.throws(()=>renderCase(root,{...data,process:data.process.slice(0,4)}),/five process steps/);
 assert.throws(()=>renderCase(root,{...data,result_metric:undefined}),/Missing metal result metric/);
 assert.throws(()=>renderCase(root,{...data,result_metric:{...data.result_metric,art:'/assets/../private.png'}}),/Invalid case asset/);
});

test('metal resources resolve from the nested route and imported images retain source bytes',()=>{
 const crypto=require('node:crypto'),audit=JSON.parse(read('docs/qa/metal-v5/source-audit.json'));
 const html=read('raboty/metal-calc/index.html');
 for(const [,value] of html.matchAll(/\b(?:src|href|data-full)="([^"]+)"/g)){
  if(/^(mailto:|https?:|data:)/.test(value))continue;
  assert.ok(value.startsWith('/')||value.startsWith('#'));
  const url=new URL(value,'http://local/raboty/metal-calc/');let file=url.pathname.slice(1)||'index.html';if(file.endsWith('/'))file+='index.html';
  assert.ok(fs.existsSync(path.join(root,file)),'missing '+value);
  if(url.hash)assert.ok(read(file).includes(`id="${decodeURIComponent(url.hash.slice(1))}"`),'missing anchor '+value);
 }
 assert.equal(Object.keys(audit.assets).length,5);
 for(const [src,asset] of Object.entries(audit.assets)){
  const bytes=fs.readFileSync(path.join(root,src.slice(1)));assert.equal(bytes.length,asset.bytes);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),asset.sha256);
 }
});

test('Beauty content and the other five catalog cards remain byte-identical to main',()=>{
 const crypto=require('node:crypto'),audit=JSON.parse(read('docs/qa/metal-v5/source-audit.json'));
 const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
 for(const match of read('raboty/index.html').matchAll(/<article class="case-card case-card--([^\"]+)">[\s\S]*?<\/article>/g)){
  const article=match[0],id=match[1];
  if(id==='metal')continue;assert.equal(hash(article),audit.catalogArticles[id].baselineSHA256,'unchanged catalog card '+id);
 }
 const beauty=read('raboty/beauty-insight/index.html').replace(/<article class="case-card case-card--metal">[\s\S]*?<\/article>/g,article=>article.replace('<a ','<button ').replace(' href="/raboty/metal-calc/">',' type="button">').replace('</a>','</button>'));
 assert.equal(hash(beauty),audit.beauty.baselineSHA256);
});
