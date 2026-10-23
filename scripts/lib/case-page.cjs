'use strict';
const fs=require('node:fs'),path=require('node:path');
const read=(root,file)=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
const {escape,catalogCopy}=require('./project-copy.cjs');
function casePages(root){
 return fs.readdirSync(path.join(root,'templates/data/cases')).filter(f=>f.endsWith('.json')).sort().map(f=>{
  const data=JSON.parse(read(root,'templates/data/cases/'+f));
  if(f!==data.slug+'.json'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug))throw Error('Invalid case slug: '+f);
  return data;
 });
}
function renderCase(root,data){
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug))throw Error('Invalid case slug');
 const variant=data.variant||'beauty-v20';
 if(!['beauty-v20','flowers-v2'].includes(variant))throw Error('Unknown case variant');
 const flowers=variant==='flowers-v2';
 for(const field of ['catalog_id','status','result'])if(typeof data[field]!=='string'||!data[field].trim())throw Error('Missing case field '+field);
 for(const field of ['h1','intro','meta_title','meta_description','short_name'])if(Object.hasOwn(data,field))throw Error('Case '+field+' must come from catalog');
 const copy=catalogCopy(root)[data.catalog_id];if(!copy)throw Error('Unknown catalog project '+data.catalog_id);
 if(!Array.isArray(data.process)||!data.process.length||data.process.some(s=>typeof s.title!=='string'||!s.title.trim()||typeof s.body!=='string'||!s.body.trim()))throw Error('Invalid process');
 if(!Array.isArray(data.screens)||data.screens.length!==4||data.screens.some(s=>typeof s.caption!=='string'||!s.caption.trim()))throw Error('Case screens must contain four approved images and captions');
 if(flowers&&data.process.length!==4)throw Error('Flowers v2 requires four process steps');
 const images=[...Object.values(data.hero_media||{}),...(flowers?[]:[data.result_media]),...data.screens];
 for(const image of images){
  if(!image||!/^\/assets\/[\w/.-]+$/.test(image.src)||image.src.includes('..')||!image.alt)throw Error('Invalid case asset');
  if(!fs.existsSync(path.join(root,image.src.slice(1))))throw Error('Missing case asset '+image.src);
 }
 for(const key of ['left','main','right'])if(!data.hero_media?.[key])throw Error('Missing hero asset '+key);
 if(flowers&&Object.keys(data.hero_media).length!==3)throw Error('Flowers hero requires exactly three phone screens');
 const values={result:escape(data.result),status:escape(data.status),h1:escape(copy.title),short_name:escape(copy.title),intro:escape(copy.description),meta_title:escape(copy.title+' — SyntheCore'),meta_description:escape(copy.description)};
 values.process=data.process.map((step,i)=>`<article class="sc-case-process__step" data-process-step="${i+1}"><div class="sc-case-process__number-wrap"><span class="sc-case-process__number-circle" aria-hidden="true">${i+1}</span></div><div class="sc-case-process__text"><h3>${escape(step.title)}</h3><p>${escape(step.body)}</p></div></article>`).join('\n');
 values.screens=data.screens.map(screen=>`<figure class="sc-case-screens__item sc-case-reveal"><button class="sc-case-screens__open" type="button" aria-label="Увеличить: ${escape(screen.caption)}" data-full="${escape(screen.src)}" data-title="${escape(screen.caption)}"><img src="${escape(screen.src)}" alt="${escape(screen.alt)}" loading="lazy" decoding="async"></button><figcaption>${escape(screen.caption)}</figcaption></figure>`).join('\n');
 for(const [key,image] of Object.entries(data.hero_media)){values['hero_'+key+'_src']=escape(image.src);values['hero_'+key+'_alt']=escape(image.alt);}
 if(!flowers){values.result_src=escape(data.result_media.src);values.result_alt=escape(data.result_media.alt);}
 values.case_class=flowers?' sc-case-flowers':'';
 values.case_styles=flowers?'\n<link rel="stylesheet" href="/css/case-flowers.css">':'';
 // Reuse current semantic catalog cards and its dialog behavior, with no second project list.
 const {wireCaseLinks}=require('./case-links.cjs');
 const catalog=wireCaseLinks('works',read(root,'templates/pages/works.html'),casePages(root));
 const cards=[...catalog.matchAll(/<article class="case-card\b[\s\S]*?<\/article>/g)].map(m=>m[0]);
 if(cards.length!==6||!cards.some(c=>c.includes(`data-project="${data.catalog_id}"`)))throw Error('Case must match one of six catalog projects');
 values.related=cards.filter(c=>!c.includes(`data-project="${data.catalog_id}"`)).join('\n');
 const template=read(root,'templates/pages/case.html')
  .replace('{{hero_media}}',read(root,'templates/partials/cases/'+(flowers?'hero-flowers':'hero-collage')+'.html'))
  .replace('{{result_content}}',read(root,'templates/partials/cases/'+(flowers?'result-flowers':'result-screen')+'.html'));
 return template.replace(/\{\{([a-z0-9_]+)\}\}/g,(marker,key)=>Object.hasOwn(values,key)?values[key]:marker);
}
module.exports={casePages,renderCase};
