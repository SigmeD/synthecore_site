'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),cp=require('node:child_process');
const read=file=>fs.readFileSync(file,'utf8');
test('Hero and all Works frames consume one source of surface geometry',()=>{
 const hero=read('css/main.css'),works=read('css/works.css');
 assert.match(hero,/--hero-surface-height:clamp\(620px,74\.2svh,968px\)/);
 assert.match(hero,/--hero-surface-radius:clamp\(20px,1\.5vw,30px\)/);
 assert.match(hero,/#imageScrollSticky > \.hero\{[\s\S]*?height:var\(--hero-surface-height\)/);
 for(const variable of ['--hero-edge','--hero-surface-height','--hero-surface-radius'])assert.ok(works.includes(`var(${variable})`),variable);
 assert.ok(!/100vw|--works-aspect|--works-width|--works-padding/.test(works),'image ratios and viewport width/padding must not size the frame');
 assert.match(works,/width:100%;max-width:100%;height:var\(--works-height\)/);
 assert.match(works,/\.sc-work-media img\{object-fit:cover;object-position:center\}/);
});
test('the existing transitions and glass animation retain bytes outside the exact geometry/refresh change',()=>{
 const original=cp.execFileSync('git',['show','91235aa:js/works.js']);
 const {restoreWorksGeometry}=require('./lib/approved-works-geometry.cjs');
 assert.ok(restoreWorksGeometry('js/works.js',fs.readFileSync('js/works.js')).equals(original));
 const originalCSS=cp.execFileSync('git',['show','91235aa:css/works.css'],{encoding:'utf8'});
 const glass=source=>source.slice(source.indexOf('.sc-work-content {'),source.indexOf('@supports not'));
 assert.equal(glass(read('css/works.css')),glass(originalCSS));
});
test('last-card hold extends the existing sticky stage by 15svh without stretching transitions',()=>{
 assert.match(read('css/works.css'),/--works-hold:15svh/);
 assert.match(read('css/sticky-handoff-v61.css'),/height:calc\(var\(--works-height\) \+ var\(--sc-works-scroll-length,0px\) \+ var\(--works-hold\)\)/);
 assert.match(read('js/works.js'),/scrollScreensPerCard: 0\.92/);
});
