'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {renderCase}=require('./lib/case-page.cjs');
const {parseHTML,hasClass,textContent,inside}=require('./lib/static-html.cjs');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
function fixture(){
 const beauty=JSON.parse(read('templates/data/cases/beauty-insight.json'));
 const sources=[...new Set([...beauty.screens.map(s=>s.src),...Object.values(beauty.hero_media).map(s=>s.src)])];
 sources.push('/assets/cases/shared/dashboard.webp');
 return {...beauty,slug:'prostor',catalog_id:'prostor',variant:'prostor-v1',process:[...beauty.process,beauty.process[0]],screens:sources.slice(0,7).map((src,i)=>({src,alt:'Экран '+i,caption:'Экран '+i,full_src:src}))};
}
test('only Prostor v1 supports seven screens and separate full-size images',()=>{
 const data=fixture(),html=renderCase(root,data);
 assert.equal((html.match(/class="sc-case-screens__open"/g)||[]).length,7);
 assert.equal((html.match(/data-process-step=/g)||[]).length,4);
 assert.ok(html.includes('sc-case-prostor'));assert.ok(html.includes('/css/case-prostor.css'));
 const altered=structuredClone(data);altered.screens[0].full_src=data.hero_media.main.src;
 assert.ok(renderCase(root,altered).includes('data-full="'+altered.screens[0].full_src+'"'));
 for(const file of ['beauty-insight','flowers','metal-calc']){
  const previous=JSON.parse(read('templates/data/cases/'+file+'.json'));
  assert.throws(()=>renderCase(root,{...previous,screens:data.screens}),/screens/i);
 }
});
test('Prostor rejects wrong counts, duplicate screens, wrong identities and unsafe full-size images',()=>{
 const data=fixture();
 for(const count of [0,4,6,8])assert.throws(()=>renderCase(root,{...data,screens:Array.from({length:count},(_,i)=>data.screens[i%7])}),/screens/i);
 assert.throws(()=>renderCase(root,{...data,process:data.process.slice(0,3)}),/four process/i);
 assert.throws(()=>renderCase(root,{...data,slug:'flowers',catalog_id:'flowers'}),/Prostor/i);
 assert.throws(()=>renderCase(root,{...data,screens:data.screens.map(()=>data.screens[0])}),/distinct|unique/i);
 assert.throws(()=>renderCase(root,{...data,hero_media:{main:data.hero_media.main}}),/hero/i);
 for(const full_src of ['https://example.com/image.png','/assets/../secret.png','/assets/cases/prostor/missing.png','javascript:alert(1)']){
  const changed=structuredClone(data);changed.screens[0].full_src=full_src;assert.throws(()=>renderCase(root,changed),/asset/i);
 }
});
test('Prostor builds canonical copy, approved screen order, shared shell and truthful prototype content',()=>{
 const data=JSON.parse(read('templates/data/cases/prostor.json')),html=read('raboty/prostor/index.html');
 assert.equal(require('./build-site.cjs').renderPage(root,'prostor'),html);
 const nodes=parseHTML(html).nodes,copy=require('./lib/project-copy.cjs').catalogCopy(root).prostor;
 assert.equal(textContent(nodes.find(n=>n.attrs.id==='caseTitle')),copy.title);
 assert.ok(html.includes(copy.description));assert.ok(html.includes(copy.title+' — SyntheCore'));
 assert.equal(nodes.filter(n=>n.attrs.id==='floatingHeader').length,1);assert.equal(nodes.filter(n=>n.attrs.id==='contact').length,1);
 assert.deepEqual(data.process.map(s=>s.title),['Запрос и анализ','Структура платформы','Проектирование интерфейсов','Интерактивный прототип']);
 assert.match(data.result,/передали заказчику интерактивный концепт/);assert.match(data.result_media.alt,/демонстрационные/);
 assert.deepEqual(data.screens.map(s=>s.caption),['Магазин','Категории','Каталог и фильтры','Корзина','Кабинет покупателя','CRM менеджера','Кабинет владельца']);
 assert.match(data.hero_media.left.src,/buyer-account/);assert.match(data.hero_media.main.src,/store-home/);assert.match(data.hero_media.right.src,/owner-dashboard/);
 const track=nodes.find(n=>hasClass(n,'related-work__track')),cards=nodes.filter(n=>hasClass(n,'case-card__open')&&inside(n,track));
 assert.equal(cards.length,5);assert.ok(!cards.some(n=>n.attrs['data-project']==='prostor'));
 for(const file of ['site-header.js','raboty-scroll.js','case-detail.js','footer-waves.js','footer-reveal.js'])assert.equal(html.split('/js/'+file+'"').length-1,1);
 assert.doesNotMatch(html,/src="[^\"]*(?:main\.js|hero-scroll\.js)/);
 for(const [,attr,value]of html.matchAll(/\b(src|href|data-full)="([^"]+)"/g)){
  if(/^(mailto:|https?:|data:)/.test(value))continue;
  assert.ok(value.startsWith('/')||value.startsWith('#'),attr+': '+value);
  const url=new URL(value,'http://local/raboty/prostor/'),file=(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname).slice(1);
  assert.ok(fs.existsSync(path.join(root,file)),value);if(url.hash)assert.ok(read(file).includes('id="'+url.hash.slice(1)+'"'),value);
 }
});
test('all fourteen imported images retain approved bytes and seven interfaces are distinct',()=>{
 const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
 const audit=JSON.parse(read('docs/qa/prostor-v1/source-audit.json')),data=JSON.parse(read('templates/data/cases/prostor.json'));
 assert.equal(audit.images.length,14);
 for(const image of audit.images){const bytes=fs.readFileSync(path.join(root,image.destination));assert.equal(bytes.length,image.bytes);assert.equal(hash(bytes),image.sha256)}
 for(const field of ['src','full_src'])assert.equal(new Set(data.screens.map(s=>hash(fs.readFileSync(path.join(root,s[field].slice(1)))))).size,7);
});
test('historical runtime/pages preserve their SHA with only registered anchors and v27 text EOL differences',()=>{
 const audit=JSON.parse(read('docs/qa/prostor-v1/source-audit.json')),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
 const {restoreRegisteredCaseLinks}=require('./lib/case-baseline.cjs');
 const later=require('./lib/case-page.cjs').casePages(root).filter(c=>!['beauty','flowers','metal'].includes(c.catalog_id));
 const contract=JSON.parse(read('docs/V62_ON_V27_SOURCES.json'));
 for(const [file,expected]of Object.entries(audit.baselineFiles)){
  let bytes=fs.readFileSync(path.join(root,file));
  if(file.endsWith('.html')){
   bytes=Buffer.from(restoreRegisteredCaseLinks(file,bytes.toString('utf8'),later));
  }
  // The historical audit recorded the original Windows working bytes. Keep
  // those hashes; v27 text permits LF/CRLF, while all motion stays raw.
  const textEol=!Object.hasOwn(contract.motion,file)&&(Object.hasOwn(contract.v27,file)||['docs/asset-manifest.json','docs/font-manifest.json'].includes(file));
  const candidates=textEol?[bytes,Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n')),Buffer.from(bytes.toString('utf8').replace(/\r?\n/g,'\r\n'))]:[bytes];
  assert.ok(candidates.some(value=>hash(value)===expected),file);
 }
});
