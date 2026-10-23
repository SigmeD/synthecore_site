'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {compileCSS}=require('./css-bundle.cjs');
const {parseHTML}=require('./static-html.cjs');
const SOURCE_HREFS=['./css/main.css','./assets/vendor/lenis-1.3.26.css','./css/works.css','./css/services.css','./css/process.css','./css/testimonials.css','./css/faq-footer.css','./css/design-system-v61.css','./css/sticky-handoff-v61.css','./css/v62-services-alignment.css','./css/v62-typography-content-candidate.css','./css/v62-hero-copy.css','./css/fonts.css','./css/design-tokens.css','./css/site-footer.css','./css/shared-header-cta.css','./css/v62-v27-shell-preservation.css','/css/case-links.css'];
const ORIGINAL_TAGS=SOURCE_HREFS.map(href=>'<link rel="stylesheet" href="'+href+'">'),ORIGINAL_BLOCK=ORIGINAL_TAGS.join('\n');
const BUNDLE_PATH='css/generated/home.css',BUNDLE_TAG='<link rel="stylesheet" href="/'+BUNDLE_PATH+'">';
function styleNodes(html){const {nodes}=parseHTML(html);assert.ok(!nodes.some(n=>n.tag==='style'),'Unexpected inline stylesheet');return nodes.filter(n=>n.tag==='link'&&(n.attrs.rel||'').toLowerCase().split(/\s+/).includes('stylesheet'))}
const rawTag=(html,node)=>html.slice(node.sourceStart,node.sourceOpenEnd);
function isBundledHome(html){const nodes=styleNodes(html);return nodes.length===1&&rawTag(html,nodes[0])===BUNDLE_TAG}
function bundleHomeHead(html){const nodes=styleNodes(html);assert.deepEqual(nodes.map(n=>rawTag(html,n)),ORIGINAL_TAGS,'Homepage CSS source order changed');const start=nodes[0].sourceStart,end=nodes.at(-1).sourceOpenEnd;assert.equal(html.slice(start,end),ORIGINAL_BLOCK,'Homepage CSS source block changed');return html.slice(0,start)+BUNDLE_TAG+html.slice(end)}
function restoreHomeHead(file,html){
 if(!['index.html','templates/pages/home.html'].includes(file))return html;
 const nodes=styleNodes(html),styles=nodes.map(n=>rawTag(html,n));
 if(!styles.some(s=>s.includes('css/generated/'))){assert.deepEqual(styles,ORIGINAL_TAGS,'Unapproved homepage stylesheet source order');return html}
 assert.deepEqual(styles,[BUNDLE_TAG],'Exactly one approved bundled stylesheet hook is required; duplicate or unexpected hook');
 return html.slice(0,nodes[0].sourceStart)+ORIGINAL_BLOCK+html.slice(nodes[0].sourceOpenEnd);
}
function buildHomeCSS(root,options){return compileCSS(root,SOURCE_HREFS.map(href=>href.replace(/^(\.\/|\/)/,'')),options)}
function verifyHomeCSS(root){const expected=buildHomeCSS(root).css,actual=fs.readFileSync(path.join(root,BUNDLE_PATH),'utf8');assert.equal(actual,expected,'Compiled stylesheet is stale or modified; run node scripts/build-site.cjs');return BUNDLE_PATH}
function verifyHomeCSSSnapshot(root,readFile){assert.ok(Buffer.from(buildHomeCSS(root,{readFile}).css).equals(readFile(BUNDLE_PATH)),'Compiled stylesheet differs from the CSS source snapshot')}
module.exports={SOURCE_HREFS,BUNDLE_PATH,BUNDLE_TAG,isBundledHome,bundleHomeHead,restoreHomeHead,buildHomeCSS,verifyHomeCSS,verifyHomeCSSSnapshot};
