const fs=require('fs'),assert=require('assert'),path=require('path');
const root=path.join(__dirname,'..');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
const hero=read('js/hero-scroll.js'),works=read('js/works.js'),services=read('js/services.js'),css=read('css/sticky-handoff-v61.css');
assert.match(hero,/revealPortion:\s*1\b/);
assert.match(works,/--sc-works-scroll-length/);
assert.match(services,/--sc-services-scroll-length/);
for(const [name,code] of [['hero',hero],['works',works],['services',services]]) {
  const anchor=name==='hero'? 'synthecore-hero':name==='works'? 'sc-works-timeline':'sc-services-pin';
  const near=code.slice(code.indexOf("id:'"+anchor+"'",0)<0?code.indexOf("id: '"+anchor+"'"):code.indexOf("id:'"+anchor+"'"));
  assert.ok(near.length,`${name} trigger exists`);
}
assert.match(css,/position:sticky/);
assert.match(read('css/testimonials.css'),/height:533svh;min-height:3770px/);
assert.match(read('js/testimonials.js'),/smoothSeconds:\s*0\.18/);
console.log('PASS: experimental CSS sticky scenes and +30% testimonials.');
