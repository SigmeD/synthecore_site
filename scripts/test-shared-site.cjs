const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');

test('both static routes are generated from one header and one footer',()=>{
 assert.ok(fs.existsSync(path.join(root,'templates/partials/header.html')),'shared header template must exist');
 const {renderPage}=require('./build-site.cjs');
 for(const page of ['home','works']) {
  const output=page==='home'?'index.html':'raboty/index.html';
  assert.equal(read(output),renderPage(root,page),'committed route must match shared sources');
  const source=read(`templates/pages/${page}.html`);
  assert.ok(source.includes('{{header}}')&&source.includes('{{footer}}'));
  assert.equal((read(output).match(/id="floatingHeader"/g)||[]).length,1);
  assert.equal((read(output).match(/id="roveiaWaveBg"/g)||[]).length,1);
  assert.equal((read(output).match(/src="[^\"]*footer-waves.js"/g)||[]).length,1);
  assert.ok(!/<animate\b|sc-footer__wave--/.test(read(output)),'no old SVG/SMIL waves');
 }
});

test('route-aware shared navigation resolves every local anchor',()=>{
 assert.ok(fs.existsSync(path.join(root,'raboty/index.html')),'Works route must exist');
 for(const file of ['index.html','raboty/index.html']) {
  const html=read(file),base=new URL(file==='index.html'?'/':'/raboty/','https://synthecore.test');
  for(const [,href] of html.matchAll(/href="([^\"]+)"/g)) {
   const url=new URL(href,base);if(url.origin!==base.origin)continue;
   const target=url.pathname==='/'?'index.html':url.pathname==='/raboty/'?'raboty/index.html':url.pathname.slice(1);
   assert.ok(fs.existsSync(path.join(root,target)),`missing target ${href}`);
   if(url.hash) assert.ok(read(target).includes(`id="${decodeURIComponent(url.hash.slice(1))}"`),`missing anchor ${href}`);
  }
  assert.equal((html.match(/href="\/raboty\/"/g)||[]).length,3);
 }
 assert.equal((read('raboty/index.html').match(/aria-current="page"/g)||[]).length,2);
});

test('catalog preserves six ordered project descriptions and approved assets',()=>{
 assert.ok(fs.existsSync(path.join(root,'raboty/index.html')),'Works route must exist');
 const {parseHTML,hasClass,inside,textContent}=require('./lib/static-html.cjs');
 const approved=require('./lib/works-copy.cjs'),pins=require('./lib/works-assets.cjs');
 const crypto=require('node:crypto'),{nodes}=parseHTML(read('raboty/index.html'));
 const buttons=nodes.filter(n=>hasClass(n,'case-card__open'));
 assert.deepEqual(buttons.map(n=>n.attrs['data-project']),Object.keys(approved));
 for(const button of buttons) {
  const id=button.attrs['data-project'],desc=nodes.filter(n=>inside(n,button));
  const norm=n=>textContent(n).replace(/\s+/g,' ').trim();
  assert.equal(norm(desc.find(n=>n.tag==='h2')),approved[id].title);
  assert.equal(norm(desc.find(n=>n.tag==='p')),approved[id].description);
  const image=desc.find(n=>n.tag==='img'),data=fs.readFileSync(path.join(root,image.attrs.src.replace(/^\//,'')));
  assert.equal(crypto.createHash('sha256').update(data).digest('hex'),pins[id].sha256);
  assert.equal(image.attrs.width,String(pins[id].width));assert.equal(image.attrs.height,String(pins[id].height));
 }
 assert.ok(!/cursor-follow|cursor-tooltip|case-cursor/.test(read('raboty/index.html')));
});

test('single footer and menu owners retain local motion contracts',()=>{
 assert.ok(fs.existsSync(path.join(root,'js/footer-waves.js')),'shared wave engine must exist');
 // v62 main.js is byte-locked and includes the homepage menu. The catalog
 // retains v27 site-header.js. Never load both owners on the same page.
 assert.ok(/menuToggle/.test(read('js/main.js')));
 assert.ok(!/src="[^\"]*site-header.js"/.test(read('index.html')));
 assert.ok(/src="[^\"]*site-header.js"/.test(read('raboty/index.html')));
 assert.ok(!/src="[^\"]*\/main.js"/.test(read('raboty/index.html')));
 // The legacy v62 footer loop has no .sc-footer__wave nodes to animate.
 assert.ok(!/class="[^\"]*\bsc-footer__wave\b/.test(read('index.html')));
 assert.ok(!/menuToggle/.test(read('js/raboty-cards.js')));
 const wave=read('js/footer-waves.js');
 for(const speed of ['0.50','0.60','0.70'])assert.ok(wave.includes(`speed: ${speed}`));
 assert.equal((wave.match(/wave: /g)||[]).length,3);
 for(const file of ['index.html','raboty/index.html']) {
  const html=read(file);assert.equal((html.match(/lenis-1.3.26.min.js/g)||[]).length,1);
  assert.ok(!/fonts.googleapis|fonts.gstatic/.test(html),'fonts must load locally');
 }
});

test('local Manrope distributions match the recorded hashes',async()=>{
 const {verifyManifest}=require('./lib/static-resources.cjs');
 assert.equal(await verifyManifest(root,'docs/font-manifest.json'),4);
});

test('combined build preserves v62 motion bytes/content and the owner-selected v27 shell',()=>{
 const crypto=require('node:crypto');
 const sources=JSON.parse(read('docs/V62_ON_V27_SOURCES.json'));
 const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
 assert.equal(Object.keys(sources.motion).length,17);
 for(const [file,expected] of Object.entries(sources.motion)) {
  assert.equal(hash(fs.readFileSync(path.join(root,file))),expected,`protected v62 bytes: ${file}`);
 }
 for(const [file,expected] of Object.entries(sources.v27)) {
  const data=fs.readFileSync(path.join(root,file));
  assert.equal(hash(file.endsWith('.ttf')?data:Buffer.from(data.toString('utf8').replace(/\r\n/g,'\n'))),expected,`v27 shell/catalog source: ${file}`);
 }
 const html=read('index.html');
 const content=html.slice(html.indexOf('<main>')+6,html.lastIndexOf('<section aria-labelledby="contact-title"'));
 assert.equal(hash(Buffer.from(content)),sources.v62ContentSha256,'all seven v62 content sections are unchanged');
 const bridge=read('css/v62-v27-shell-preservation.css');
 assert.ok(!/GSAP|ScrollTrigger|lenis|scrub:|position:\s*sticky/.test(bridge),'shell preservation adds no motion implementation');
});
