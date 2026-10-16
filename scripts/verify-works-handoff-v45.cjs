/* Regression guard for v45 Works → Services transition.
   Static checks only. Browser acceptance must verify actual scrolling. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'css/works.css'),'utf8');
const works = fs.readFileSync(path.join(root, 'js/works.js'),'utf8');
const servicesCss = fs.readFileSync(path.join(root, 'css/services.css'),'utf8');
const servicesJs = fs.readFileSync(path.join(root, 'js/services.js'),'utf8');
const assert = require('node:assert/strict');
assert.match(css,/\.sc-works--timeline\s*\{\s*height:calc\(var\(--works-height\)\s*\+\s*2\s*\*\s*var\(--works-padding\)\)/);
assert.match(css,/\.sc-works--timeline\s+\.sc-works-stack\s*\{[^}]*overflow:visible/s);
assert.match(works,/\by:\(\)=>innerHeight\b/);
assert.doesNotMatch(works,/LAST_HOLD/);
assert.match(works,/scrub:true/);
assert.match(servicesCss,/margin-top:0/);
assert.doesNotMatch(servicesCss,/margin-top:-\d/);
assert.match(servicesJs,/id:'sc-services-pin'/);
assert.equal((works.match(/id:'sc-works-timeline'/g)||[]).length,1);
console.log('PASS v45: viewport-based entrances visible outside frame-sized scene, no final hold, one Works pin, adjacent Services.');
