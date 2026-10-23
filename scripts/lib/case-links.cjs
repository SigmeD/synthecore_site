'use strict';
// Published case data owns entry points on both existing lists. Missing cases keep their modal.
const homeLink=(project,id)=>`<a class="sc-work-detail-link" href="/raboty/${project.slug}/" aria-labelledby="${id}"></a>`;
function wireCaseLinks(page,html,cases){
 if(!['home','works'].includes(page))return html;
 for(const project of cases){
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug)||!/^(b2b|flowers|crm|beauty|prostor|metal)$/.test(project.catalog_id))throw Error('Invalid case entry point');
  let matches=0;
  html=html.replace(/<article\b[\s\S]*?<\/article>/g,article=>{
   if(page==='home'&&!article.includes(`data-work-id="${project.catalog_id}"`))return article;
   if(page==='works'&&!article.includes(`data-project="${project.catalog_id}"`))return article;
   matches++;
   if(page==='home'){
    const id=article.match(/aria-labelledby="([^"]+)"/)?.[1];
    if(!id||!article.match(/<\/div>\s*<\/article>$/))throw Error('Missing case frame or accessible title');
    return article.replace(/<\/div>(\s*<\/article>)$/,homeLink(project,id)+'</div>$1');
   }
   return article.replace('<button ','<a ').replace(' type="button">',` href="/raboty/${project.slug}/">`).replace('</button>','</a>');
  });
  if(matches!==1)throw Error('Expected one '+page+' card for '+project.catalog_id);
 }
 return html;
}
module.exports={wireCaseLinks,homeLink};
