'use strict';
// Historical case snapshots used a Beauty-only registry. Restore only exact
// later native anchors; keep all content and the preexisting Beauty link intact.
const assert=require('node:assert/strict'),path=require('node:path');
const {casePages}=require('./case-page.cjs');
const {homeLink}=require('./case-links.cjs');
function restoreRegisteredCaseLinks(file,html,cases){
 const home=file==='index.html';
 return html.replace(/<article\b[\s\S]*?<\/article>/g,article=>{
  const project=cases.find(c=>article.includes((home?'data-work-id':'data-project')+'="'+c.catalog_id+'"'));if(!project)return article;
  if(home){
   if(!article.includes('sc-work-detail-link'))return article;
   const id=article.match(/aria-labelledby="([^"]+)"/)?.[1],link=homeLink(project,id);
   assert.equal(article.split(link).length,2,'Expected one exact registered home link');
   assert.match(article.slice(article.indexOf(link)+link.length),/^<\/div>\s*<\/article>$/,'Home link must end its own project frame');
   return article.replace(link,'');
  }
  const opening=article.match(/<a [^>]*class="case-card__open"[^>]*>/)?.[0];if(!opening)return article;
  const suffix=' data-project="'+project.catalog_id+'" href="/raboty/'+project.slug+'/">';
  assert.ok(opening.endsWith(suffix),'Unexpected registered case route');
  assert.equal((article.match(/<a\s/g)||[]).length,1,'Expected one whole-card anchor');
  assert.equal(article.split('</a>').length,2,'Expected one whole-card anchor');
  return article.replace(opening,opening.replace('<a ','<button ').replace(' href="/raboty/'+project.slug+'/">',' type="button">')).replace('</a>','</button>');
 });
}
function restoreLaterCaseLinks(html){
 return restoreRegisteredCaseLinks('',html,casePages(path.resolve(__dirname,'../..')).filter(c=>c.catalog_id!=='beauty'));
}
module.exports={restoreLaterCaseLinks,restoreRegisteredCaseLinks};
