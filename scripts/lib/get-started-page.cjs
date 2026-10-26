'use strict';
const fs=require('node:fs'),path=require('node:path');
const {casePages}=require('./case-page.cjs');
const {wireCaseLinks}=require('./case-links.cjs');
function renderContactRelated(root,source=fs.readFileSync(path.join(root,'templates/pages/works.html'),'utf8')){
 const catalog=wireCaseLinks('works',source.replace(/\r\n/g,'\n'),casePages(root));
 const cards=[...catalog.matchAll(/<article class="case-card\b[\s\S]*?<\/article>/g)].map(match=>match[0]);
 if(cards.length!==6||cards.some(card=>!/<a\s[^>]*class="case-card__open"/.test(card)))throw Error('Get Started requires six linked catalog cards');
 return cards.join('\n');
}
module.exports={renderContactRelated};
