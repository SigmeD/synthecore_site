'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const os=require('node:os');
const {parseHTML,hasClass,inside,textContent}=require('./lib/static-html.cjs');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const norm=n=>textContent(n).replace(/\s+/g,' ').trim();
test('all six homepage titles and summaries match the catalog source',()=>{
 const source=parseHTML(read('templates/pages/works.html')).nodes;
 const home=parseHTML(read('index.html')).nodes;
 const projects=source.filter(n=>hasClass(n,'case-card__open'));
 assert.equal(projects.length,6);
 for(const card of projects){
  const id=card.attrs['data-project'],children=source.filter(n=>inside(n,card));
  const item=home.find(n=>n.attrs['data-work-id']===id),desc=home.filter(n=>inside(n,item));
  assert.equal(norm(desc.find(n=>hasClass(n,'sc-work-content__title'))),norm(children.find(n=>n.tag==='h2')),id+' title');
  assert.equal(norm(desc.find(n=>hasClass(n,'sc-work-content__description'))),norm(children.find(n=>n.tag==='p')),id+' summary');
  const tags=children.filter(n=>hasClass(n,'tag')).map(norm);
  assert.equal(tags.length,2,id+' format and topic');
  assert.equal(norm(desc.find(n=>hasClass(n,'sc-work-content__type'))),tags.join(' · '),id+' category');
 }
});

test('editing catalog copy updates both dependent templates automatically',t=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'sc-project-copy-'));
 t.after(()=>{assert.ok(temp.startsWith(path.join(os.tmpdir(),'sc-project-copy-')));fs.rmSync(temp,{recursive:true,force:true})});
 fs.cpSync(path.join(root,'templates'),path.join(temp,'templates'),{recursive:true});
 fs.cpSync(path.join(root,'assets/cases'),path.join(temp,'assets/cases'),{recursive:true});
 const {catalogCopy,renderHomeCopy}=require('./lib/project-copy.cjs');
 const source=catalogCopy(root).beauty,file=path.join(temp,'templates/pages/works.html');
 fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('<h2>'+source.title+'</h2>','<h2>Новый заголовок &amp; команда</h2>').replace(source.description,'Новое согласованное краткое описание.'));
 fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace(/<article class="case-card case-card--beauty">[\s\S]*?<\/article>/,article=>article.replace('>Прототип</span>','>Новый формат</span>').replace('>Финансовая аналитика</span>','>Новая тематика</span>')));
 const home=renderHomeCopy(temp,read('templates/pages/home.html'));
 const data=JSON.parse(read('templates/data/cases/beauty-insight.json'));
 const detail=require('./lib/case-page.cjs').renderCase(temp,data);
 assert.ok(home.includes('Новый формат · Новая тематика'));
 for(const html of [home,detail]){assert.ok(html.includes('Новый заголовок &amp; команда'));assert.ok(html.includes('Новое согласованное краткое описание.'));assert.ok(!html.includes(source.title))}
 const {restoreHomeCopy}=require('./lib/approved-home-copy.cjs');
 assert.doesNotThrow(()=>restoreHomeCopy('index.html',home,fs.readFileSync(file,'utf8')));
 assert.throws(()=>restoreHomeCopy('index.html',home.replace('Новый формат · Новая тематика','Несогласованная метка'),fs.readFileSync(file,'utf8')),/Unapproved category copy/);
 assert.throws(()=>restoreHomeCopy('index.html',home,read('templates/pages/works.html')),/Unapproved.*copy/,'Git QA must use the catalog from the same ref');
});
test('case first screen and metadata use catalog title and summary, not independent copies',()=>{
 const source=parseHTML(read('templates/pages/works.html')).nodes;
 const card=source.find(n=>n.attrs['data-project']==='beauty'),children=source.filter(n=>inside(n,card));
 const title=norm(children.find(n=>n.tag==='h2')),summary=norm(children.find(n=>n.tag==='p'));
 const nodes=parseHTML(read('raboty/beauty-insight/index.html')).nodes;
 assert.equal(norm(nodes.find(n=>n.attrs.id==='caseTitle')),title);
 assert.equal(norm(nodes.find(n=>hasClass(n,'case-hero__intro'))),summary);
 assert.equal(nodes.find(n=>n.tag==='meta'&&n.attrs.name==='description').attrs.content,summary);
 assert.equal(norm(nodes.find(n=>n.tag==='title')),title+' — SyntheCore');
 const data=JSON.parse(read('templates/data/cases/beauty-insight.json'));
 for(const field of ['h1','intro','meta_title','meta_description'])assert.ok(!Object.hasOwn(data,field),'remove duplicate '+field);
});
