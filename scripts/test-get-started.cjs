'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
const {renderPage}=require('./build-site.cjs');
const {catalogCopy}=require('./lib/project-copy.cjs');
const {parseHTML,hasClass,inside,textContent}=require('./lib/static-html.cjs');

test('Get Started and privacy are generated with the existing shared shell and one scroll owner',()=>{
 for(const page of ['get-started','privacy']){
  const html=renderPage(root,page);
  assert.equal(read(`${page}/index.html`),html);
  assert.equal((html.match(/id="floatingHeader"/g)||[]).length,1);
  assert.equal((html.match(/id="contact"/g)||[]).length,1);
  for(const script of ['site-header.js','raboty-scroll.js','footer-waves.js','footer-reveal.js'])assert.equal((html.match(new RegExp(`src="/js/${script}"`,'g'))||[]).length,1);
  assert.ok(!html.includes('src="/js/main.js"'));
  assert.ok(!/\{\{[^}]+\}\}/.test(html));
 }
});

test('Get Started cards use the live catalog copy, tags, image and registered case routes',()=>{
 const {nodes}=parseHTML(renderPage(root,'get-started'));
 const copy=catalogCopy(root),cases=require('./lib/case-page.cjs').casePages(root);
 const cards=nodes.filter(n=>hasClass(n,'case-card__open'));
 assert.equal(cards.length,6);
 for(const card of cards){
  const id=card.attrs['data-project'],children=nodes.filter(n=>inside(n,card));
  assert.equal(card.tag,'a');
  assert.equal(card.attrs.href,`/raboty/${cases.find(c=>c.catalog_id===id).slug}/`);
  assert.equal(textContent(children.find(n=>n.tag==='h2')).trim(),copy[id].title);
  assert.equal(textContent(children.find(n=>n.tag==='p')).trim(),copy[id].description);
  assert.deepEqual(children.filter(n=>hasClass(n,'tag')).map(n=>textContent(n).trim()),copy[id].tags);
 }
});

test('contact cards respond to a catalog update without independent copy',()=>{
 const {renderContactRelated}=require('./lib/get-started-page.cjs');
 const source=read('templates/pages/works.html');
 const updated=source.replace('Кабинет клиента</h2>','Новое название кабинета</h2>');
 assert.notEqual(updated,source);
 assert.ok(renderContactRelated(root,updated).includes('Новое название кабинета</h2>'));
 assert.ok(!renderContactRelated(root,updated).includes('<h2>Кабинет клиента</h2>'));
});

test('phone, contact, task and consent are mandatory, privacy opens in a new tab',()=>{
 const html=renderPage(root,'get-started'),{nodes}=parseHTML(html);
 for(const id of ['scClientName','scContact','scPhone','scTask','scDataConsent'])assert.ok(Object.hasOwn(nodes.find(n=>n.attrs.id===id).attrs,'required'),id);
 const phone=nodes.find(n=>n.attrs.id==='scPhone');
 assert.equal(phone.attrs['aria-describedby'],'scPhoneError');
 assert.equal(nodes.find(n=>n.attrs.id==='scPhoneE164').attrs.name,'phone');
 const privacy=nodes.find(n=>hasClass(n,'sc-contact__privacy-link'));
 assert.equal(privacy.attrs.href,'/privacy/');assert.equal(privacy.attrs.target,'_blank');
 assert.ok(html.indexOf('/js/get-started-phone.js')<html.indexOf('/js/get-started-form.js'));
});

test('new pages retain mail draft and legal draft status without false delivery claims',()=>{
 const contact=renderPage(root,'get-started'),privacy=renderPage(root,'privacy');
 assert.ok(contact.includes('Заявка ещё не отправлена'));
 assert.ok(contact.includes('id="scMailtoFallback" href="mailto:'));
 assert.ok(privacy.includes('До публикации:'));
 assert.ok(privacy.includes('Дата черновика: 26 октября 2026 года'));
 assert.ok(!privacy.includes('По желанию — телефон'));
 assert.ok(!/заявка успешно отправлена/i.test(contact));
});

test('all discussion CTA use the new route while real email contacts remain mailto',()=>{
 for(const file of ['index.html','raboty/index.html',...require('./lib/case-page.cjs').casePages(root).map(c=>`raboty/${c.slug}/index.html`)]){
  const {nodes}=parseHTML(read(file));
  const ctas=nodes.filter(n=>n.tag==='a'&&/Обсудить/.test(textContent(n)));
  assert.ok(ctas.length>=4,file);
  for(const cta of ctas)assert.equal(cta.attrs.href,'/get-started/',file+' '+textContent(cta));
 }
 assert.ok(renderPage(root,'privacy').includes('href="mailto:max.eroxin@gmail.com"'));
});
