'use strict';
// Handoff v4.9.2 §4A authorizes only these href substitutions. Historical
// manifests remain unchanged: restore opening tags, then compare original SHA.
// Labels, SVG, positions, surrounding markup and unrelated mailto links are
// deliberately left to the existing complete-file/content hash contracts.
const assert=require('node:assert/strict');
const discussion='mailto:max.eroxin@gmail.com?subject=SyntheCore%20%E2%80%94%20%D0%BE%D0%B1%D1%81%D1%83%D0%B4%D0%B8%D1%82%D1%8C%20%D0%B7%D0%B0%D0%B4%D0%B0%D1%87%D1%83';
const newTask='mailto:max.eroxin@gmail.com?subject=SyntheCore%20%E2%80%94%20%D0%BD%D0%BE%D0%B2%D0%B0%D1%8F%20%D0%B7%D0%B0%D0%B4%D0%B0%D1%87%D0%B0';
const header=[['nav-cta',discussion],['',discussion]],footer=[['nav-cta sc-footer__cta',discussion]];
const home=[['main-cta',newTask]],works=[['catalog-intro__cta',discussion],['case-dialog__cta',discussion]];
const detail=[['main-cta sc-case-process__cta-button',discussion],['case-dialog__cta',discussion]];
const registry=new Map([
 ['templates/partials/header.html',header],['templates/partials/footer.html',footer],
 ['templates/pages/home.html',home],['templates/pages/works.html',works],['templates/pages/case.html',detail],
 ['index.html',[...header,...home,...footer]],['raboty/index.html',[...header,...works,...footer]],
 ...['beauty-insight','flowers','metal-calc','prostor','b2b','crm'].map(slug=>['raboty/'+slug+'/index.html',[...header,...detail,...footer]])
]);
function restoreDiscussionLinks(file,text){
 const anchors=registry.get(file);if(!anchors)return text;
 for(const [classes,href] of anchors){
  const prefix='<a '+(classes?'class="'+classes+'" ':'')+'href="';
  const original=prefix+href+'">',approved=prefix+'/get-started/">';
  const count=text.split(original).length-1+text.split(approved).length-1;
  assert.equal(count,1,file+': expected one exact registered discussion anchor');
  text=text.replace(approved,original);
 }
 return text;
}
module.exports={restoreDiscussionLinks};
