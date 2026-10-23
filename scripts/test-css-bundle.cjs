'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {compileCSS}=require('./lib/css-bundle.cjs');
const {SOURCE_HREFS,BUNDLE_PATH,BUNDLE_TAG,bundleHomeHead,restoreHomeHead,buildHomeCSS,verifyHomeCSSSnapshot}=require('./lib/home-styles.cjs');
const root=path.resolve(__dirname,'..');
function fixture(t,files){const tempRoot=path.resolve(os.tmpdir()),dir=fs.mkdtempSync(path.join(tempRoot,'sc-css-'));t.after(()=>{assert.equal(path.dirname(path.resolve(dir)),tempRoot);assert.ok(path.basename(dir).startsWith('sc-css-'));fs.rmSync(dir,{recursive:true,force:true})});for(const [file,css]of Object.entries(files)){fs.mkdirSync(path.dirname(path.join(dir,file)),{recursive:true});fs.writeFileSync(path.join(dir,file),css)}return dir}
test('CSS compilation keeps cascade order, imports once per occurrence and rebases only actual URL tokens',t=>{
 const dir=fixture(t,{'css/a.css':'.a{color:red;background:url(../assets/a.png)}\n@media(min-width:1px){.a{color:green}}','css/b.css':'@import url("./p.css");\n.b::after{content:"url(fake.png)"}/* url(comment.png) */.a{color:blue}','css/p.css':'.policy{background:url("../assets/p.svg#x")}'});
 const css=compileCSS(dir,['css/a.css','css/b.css']).css;
 assert.ok(css.indexOf('color:red')<css.indexOf('color:green')&&css.indexOf('color:green')<css.indexOf('.policy')&&css.indexOf('.policy')<css.indexOf('color:blue'));
 assert.ok(css.includes('url(/assets/a.png)'));assert.ok(css.includes('url("/assets/p.svg#x")'));assert.ok(css.includes('content:"url(fake.png)"'));assert.ok(css.includes('/* url(comment.png) */'));
 assert.ok(!css.includes('@import url("./p.css")'));assert.equal(compileCSS(dir,['css/p.css','css/p.css']).css.split('.policy').length-1,2,'intentional repeated source order is not deduplicated');
});
test('font import stays valid without moving it across preceding font faces; unsupported imports fail safely',t=>{
 const font="@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700&display=swap');";
 const dir=fixture(t,{'css/a.css':'.a{color:red}','css/font.css':font+'.a{color:blue}','css/face.css':'@font-face{font-family:Local;src:url(a.ttf)}','css/cycle.css':'@import url("./cycle.css");','css/unknown.css':'@import url("https://example.com/style.css");','css/media.css':'@import url("./a.css") print;','css/escaped.css':'.a{background:u\\72l("../assets/a.png")}','css/escaped-import.css':'@im\\70ort url("./a.css");'});
 const css=compileCSS(dir,['css/a.css','css/font.css','css/face.css']).css;assert.ok(css.trimStart().startsWith('@import'));assert.ok(css.indexOf('color:red')<css.indexOf('color:blue'));assert.ok(css.indexOf('@import')<css.indexOf('@font-face'));
 assert.throws(()=>compileCSS(dir,['css/face.css','css/font.css']),/font.face|hoist/i);assert.throws(()=>compileCSS(dir,['css/cycle.css']),/cycle/i);assert.throws(()=>compileCSS(dir,['css/unknown.css']),/external/i);assert.throws(()=>compileCSS(dir,['css/media.css']),/unsupported/i);assert.throws(()=>compileCSS(dir,['../outside.css']),/outside/i);
 assert.throws(()=>compileCSS(dir,['css/escaped.css']),/escaped CSS identifier/i);assert.throws(()=>compileCSS(dir,['css/escaped-import.css']),/escaped CSS identifier/i);
});
test('homepage has one exact compiled hook and preserves the original stylesheet list for baseline checks',()=>{
 const template=fs.readFileSync(path.join(root,'templates/pages/home.html'),'utf8').replace(/\r\n/g,'\n'),bundled=bundleHomeHead(template);
 assert.equal(SOURCE_HREFS.length,18);assert.equal((bundled.match(/rel="stylesheet"/g)||[]).length,1);assert.ok(bundled.includes(BUNDLE_TAG));assert.equal(restoreHomeHead('index.html',bundled),template);
 assert.throws(()=>restoreHomeHead('index.html',bundled.replace('</head>','<link rel="stylesheet" href="evil.css"></head>')),/one|duplicate/i);
 for(const tag of ['<link rel=stylesheet href="/css/main.css">','<link rel=" stylesheet " href="/css/main.css">','<link rel="alternate STYLESHEET" href="/css/main.css">'])assert.throws(()=>restoreHomeHead('index.html',bundled.replace('</head>',tag+'</head>')),/one|duplicate/i);
 assert.throws(()=>restoreHomeHead('index.html',bundled.replace('css/generated/home.css','css/generated/wrong.css')),/stylesheet|bundle/i);
 assert.throws(()=>restoreHomeHead('index.html',bundled.replace(BUNDLE_TAG,'<link rel="stylesheet" href="/css/case-metal.css">')),/stylesheet|source order/i);
 assert.throws(()=>restoreHomeHead('index.html',bundled.replace(BUNDLE_TAG,'')),/stylesheet|source order/i);
 assert.throws(()=>restoreHomeHead('index.html',template.replace('</head>','<link rel="stylesheet" href="evil.css"></head>')),/stylesheet|source order/i);
 assert.throws(()=>restoreHomeHead('index.html',template.replace('</head>','<style>body{display:none}</style></head>')),/inline stylesheet/i);
 assert.throws(()=>bundleHomeHead(template.replace('href="./css/main.css"','href="./css/wrong.css"')),/order|source/i);
 assert.equal(fs.readFileSync(path.join(root,'css/generated/home.css'),'utf8'),buildHomeCSS(root).css,'committed bundle must match every current source');
 const comment='<!-- '+BUNDLE_TAG+' -->';assert.equal(restoreHomeHead('index.html',bundled.replace('<head>','<head>'+comment)),template.replace('<head>','<head>'+comment),'normalization replaces the active node, not an example inside a comment');
});
test('a valid working copy cannot hide a stale or tampered bundle in a separate Git snapshot',()=>{
 const read=file=>fs.readFileSync(path.join(root,file));
 assert.doesNotThrow(()=>verifyHomeCSSSnapshot(root,read));
 assert.throws(()=>verifyHomeCSSSnapshot(root,file=>file===BUNDLE_PATH?Buffer.concat([read(file),Buffer.from('html{display:none}')]):read(file)),/source snapshot/i);
 assert.throws(()=>verifyHomeCSSSnapshot(root,file=>file==='css/works.css'?Buffer.concat([read(file),Buffer.from('.sc-works{display:none}')]):read(file)),/source snapshot/i);
});
