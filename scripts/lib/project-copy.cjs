'use strict';
const fs=require('node:fs'),path=require('node:path');
const {parseHTML,hasClass,inside,textContent}=require('./static-html.cjs');
const escape=value=>String(value).replace(/[&<>"'{}]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','{':'&#123;','}':'&#125;'}[c]));
function catalogCopy(root,source){
 const {nodes}=parseHTML(source===undefined?fs.readFileSync(path.join(root,'templates/pages/works.html'),'utf8'):source);
 const cards=nodes.filter(n=>hasClass(n,'case-card__open')),copy={};
 if(cards.length!==6)throw Error('Expected six catalog projects');
 for(const card of cards){
  const id=card.attrs['data-project'],children=nodes.filter(n=>inside(n,card));
  if(!id||Object.hasOwn(copy,id))throw Error('Duplicate or missing catalog project');
  const value=tag=>{const matches=children.filter(n=>n.tag===tag);if(matches.length!==1)throw Error('Expected one catalog '+tag);return textContent(matches[0]).replace(/\s+/g,' ').trim()};
  const tags=children.filter(n=>hasClass(n,'tag')).map(n=>textContent(n).replace(/\s+/g,' ').trim());
  if(tags.length!==2||tags.some(tag=>!tag))throw Error('Expected catalog format and topic: '+id);
  copy[id]={title:value('h2'),description:value('p'),tags,category:tags.join(' · ')};
  if(!copy[id].title||!copy[id].description)throw Error('Empty catalog copy: '+id);
 }
 return copy;
}
function renderHomeCopy(root,template){
 const copy=catalogCopy(root);
 return template.replace(/\{\{work_([a-z0-9]+)_(title|description|category)\}\}/g,(_,id,key)=>{
  if(!copy[id])throw Error('Unknown catalog project '+id);
  return escape(copy[id][key]);
 });
}
module.exports={catalogCopy,renderHomeCopy,escape};
