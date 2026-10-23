'use strict';
// Historical case snapshots used a Beauty-only registry. Restore only exact
// later native anchors; keep all content and the preexisting Beauty link intact.
const assert=require('node:assert/strict'),path=require('node:path');
const {casePages}=require('./case-page.cjs');
function restoreLaterCaseLinks(html){
 const cases=casePages(path.resolve(__dirname,'../..')).filter(c=>c.catalog_id!=='beauty');
 return html.replace(/<article\b[\s\S]*?<\/article>/g,article=>{
  const project=cases.find(c=>article.includes('data-project="'+c.catalog_id+'"'));if(!project)return article;
  const opening=article.match(/<a [^>]*class="case-card__open"[^>]*>/)?.[0];if(!opening)return article;
  const suffix=' data-project="'+project.catalog_id+'" href="/raboty/'+project.slug+'/">';
  assert.ok(opening.endsWith(suffix),'Unexpected registered case route');
  assert.equal(article.split('</a>').length,2,'Expected one whole-card anchor');
  return article.replace(opening,opening.replace('<a ','<button ').replace(' href="/raboty/'+project.slug+'/">',' type="button">')).replace('</a>','</button>');
 });
}
module.exports={restoreLaterCaseLinks};
