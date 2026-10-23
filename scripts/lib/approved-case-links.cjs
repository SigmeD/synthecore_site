'use strict';
// Restore only registered whole-card links before the original SHA comparison.
const path=require('node:path');
const {casePages}=require('./case-page.cjs');
const {homeLink}=require('./case-links.cjs');
const {restoreHomeCopy}=require('./approved-home-copy.cjs');
const stylesheet='<link rel="stylesheet" href="/css/case-links.css">\n';
function once(text,from,to){if(text.split(from).length!==2)throw Error('Expected exactly one authorized case link insertion');return text.replace(from,to)}
function restoreCaseLinks(file,text,catalogSource){
 if(file==='js/raboty-cards.js')return once(text,"document.querySelectorAll('button.case-card__open')","document.querySelectorAll('.case-card__open')");
 const page=['index.html','templates/pages/home.html'].includes(file)?'home':['raboty/index.html','templates/pages/works.html'].includes(file)?'works':null;
 if(!page)return text;
 const cases=casePages(path.resolve(__dirname,'../..'));
 for(const project of cases)text=text.replace(/<article\b[\s\S]*?<\/article>/g,article=>{
  if(page==='home'){
   if(!article.includes(`data-work-id="${project.catalog_id}"`))return article;
   const id=article.match(/aria-labelledby="([^"]+)"/)?.[1],link=homeLink(project,id);
   if(!article.includes('sc-work-detail-link'))return article;
   if(!/^<\/div>\s*<\/article>$/.test(article.slice(article.indexOf(link)+link.length)))throw Error('Case link must end its own project frame');
   return once(article,link,'');
  }
  if(!article.includes(`data-project="${project.catalog_id}"`)||!article.includes('<a '))return article;
  const opening=article.match(/<a [^>]+>/)?.[0];
  if(!opening?.endsWith(` data-project="${project.catalog_id}" href="/raboty/${project.slug}/">`))throw Error('Unexpected case card link');
  return once(once(article,opening,opening.replace('<a ','<button ').replace(` href="/raboty/${project.slug}/">`,' type="button">')),'</a>','</button>');
 });
 if(/sc-work-detail-link|sc-case-card-detail-link/.test(text))throw Error('Case link outside its own project frame');
 return restoreHomeCopy(file,once(text,stylesheet+'</head>','</head>'),catalogSource);
}
module.exports={restoreCaseLinks,stylesheet};
