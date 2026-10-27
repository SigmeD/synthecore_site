'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {parseHTML,hasClass}=require('./lib/static-html.cjs');
test('v34 preview is exported from the current build with all local media, styles and scripts embedded',()=>{
 const html=require('./export-works-v34.cjs').previewHTML(path.resolve(__dirname,'..')),{nodes}=parseHTML(html);
 assert.equal(nodes.filter(n=>hasClass(n,'sc-work-item')).length,6);
 assert.ok(nodes.filter(n=>n.tag==='img').every(n=>n.attrs.src.startsWith('data:image/')));
 assert.ok(nodes.filter(n=>n.tag==='script').every(n=>!n.attrs.src));
 assert.ok(!nodes.some(n=>n.tag==='link'&&n.attrs.rel==='stylesheet'));
 assert.ok(html.includes('content="works-v34"'));
 assert.ok(html.includes('--works-height:var(--hero-used-height,var(--hero-surface-height))'));
 assert.ok(!nodes.some(n=>n.tag==='base'),'local fragment navigation must stay in the review artifact');
 assert.ok(nodes.some(n=>n.tag==='a'&&n.attrs.href==='#audiences'));
 assert.ok(nodes.some(n=>n.tag==='a'&&n.attrs.href==='http://127.0.0.1:4176/raboty/'));
});
