const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {parseHTML,hasClass,inside,textContent} = require('./lib/static-html.cjs');
const root = path.resolve(__dirname, '..');
const {nodes} = parseHTML(fs.readFileSync(path.join(root,'index.html'),'utf8'));
const service = nodes.find(n=>n.tag==='section'&&n.attrs.id==='services');
assert.ok(service&&hasClass(service,'sc-services'),'Expected #services.sc-services');
const ids = nodes.filter(n=>n.tag==='h3'&&inside(n,service));
const cards=nodes.filter(n=>hasClass(n,'sc-service-card')&&inside(n,service));
assert.equal(cards.length,6,'Expected exactly six services cards');
assert.equal(ids.length,cards.length,'Each services card must have its own title');
assert.ok(cards.every(c=>ids.some(h=>h.attrs.id===c.attrs['aria-labelledby']&&textContent(h).trim())), 'Card title references must resolve');
const srcs=nodes.filter(n=>n.tag==='img'&&inside(n,service)).map(n=>n.attrs.src);
assert.equal(srcs.length,12,'Each services card needs two illustration states');
for (const card of cards){
  const images=nodes.filter(n=>n.tag==='img'&&inside(n,card));
  assert.equal(images.length,2,'Each card must contain mono and color illustration');
  assert.ok(images.some(n=>hasClass(n,'sc-service-card__icon--mono')&&n.attrs.src.endsWith('-mono.svg')),'Mono SVG required');
  assert.ok(images.some(n=>hasClass(n,'sc-service-card__icon--color')&&!n.attrs.src.endsWith('-mono.svg')),'Color SVG required');
}
for(const image of srcs){
 assert.ok(image.startsWith('./assets/services/')&&image.endsWith('.svg'),'Only local services art supported');
 assert.ok(fs.existsSync(path.resolve(root,image)),'Missing artwork '+image);
}
const css=fs.readFileSync(path.join(root,'css/services.css'),'utf8');
const js=fs.readFileSync(path.join(root,'js/services.js'),'utf8');
assert.ok(!/\bnew\s+(?:window\.)?Lenis\s*\(/.test(js),'No second Lenis allowed');
assert.ok(!/\bnew\s+ScrollTrigger\b|\bScrollTrigger\.create\(/.test(js),'Services should not add ScrollTrigger');
assert.ok(!/addEventListener\(\s*['"]wheel['"]/.test(js),'No vertical wheel capture');
assert.ok(css.includes('.sc-services__track')&&css.includes('overflow-x:auto'),'Track must scroll horizontally');
assert.ok(css.includes('rotateZ(-6deg)')&&css.includes('rotateY(-9deg)'),'Idle icons require subtle 3D tilt');
assert.ok(css.includes('rotateZ(0deg) rotateY(0deg)'),'Active icons must align flat on hover');
assert.ok(css.includes('prefers-reduced-motion:reduce'),'Reduced-motion path required');
console.log('PASS: six services cards, accessible headings, twelve local illustrations (mono + color), idle tilt, active alignment, single scroll owner, no vertical wheel capture.');
