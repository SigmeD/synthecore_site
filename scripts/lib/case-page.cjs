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
 if(!['beauty-v20','flowers-v2','metal-v5','prostor-v1','b2b-v1','crm-v1'].includes(variant))throw Error('Unknown case variant');
 const flowers=variant==='flowers-v2';
 const metal=variant==='metal-v5';
 const prostor=variant==='prostor-v1';
 const b2b=variant==='b2b-v1';
 const crm=variant==='crm-v1';
 const fullSize=prostor||b2b||crm;
 if(prostor&&(data.slug!=='prostor'||data.catalog_id!=='prostor'))throw Error('Prostor v1 requires its own route and catalog project');
 if(b2b&&(data.slug!=='b2b'||data.catalog_id!=='b2b'))throw Error('B2B v1 requires its own route and catalog project');
 if(crm&&(data.slug!=='crm'||data.catalog_id!=='crm'))throw Error('CRM v1 requires its own route and catalog project');
 for(const field of ['catalog_id','status','result'])if(typeof data[field]!=='string'||!data[field].trim())throw Error('Missing case field '+field);
 for(const field of ['h1','intro','meta_title','meta_description','short_name'])if(Object.hasOwn(data,field))throw Error('Case '+field+' must come from catalog');
 const copy=catalogCopy(root)[data.catalog_id];if(!copy)throw Error('Unknown catalog project '+data.catalog_id);
 if(!Array.isArray(data.process)||!data.process.length||data.process.some(s=>typeof s.title!=='string'||!s.title.trim()||typeof s.body!=='string'||!s.body.trim()))throw Error('Invalid process');
 if(!Array.isArray(data.screens)||data.screens.length!==(prostor?7:crm?3:4)||data.screens.some(s=>!s||typeof s.caption!=='string'||!s.caption.trim()))throw Error(prostor?'Prostor screens must contain seven approved images and captions':crm?'CRM screens must contain three approved images and captions':'Case screens must contain four approved images and captions');
 if(crm&&new Set(data.screens.map(s=>s.src)).size!==3)throw Error('CRM requires three distinct screens');
 if(prostor&&new Set(data.screens.map(s=>s.src)).size!==7)throw Error('Prostor requires seven distinct screens');
 if(prostor&&data.process.length!==4)throw Error('Prostor v1 requires four process steps');
 if(b2b&&data.process.length!==4)throw Error('B2B v1 requires four process steps');
 if(crm&&data.process.length!==4)throw Error('CRM v1 requires four process steps');
 if(flowers&&data.process.length!==4)throw Error('Flowers v2 requires four process steps');
 if(metal&&data.process.length!==5)throw Error('Metal v5 requires five process steps');
 if(metal&&(!data.result_metric||['value','label','aria_label','art'].some(k=>typeof data.result_metric[k]!=='string'||!data.result_metric[k].trim())))throw Error('Missing metal result metric');
 const images=[...Object.values(data.hero_media||{}),...(flowers?[]:metal?[{src:data.result_metric.art,alt:'Result artwork'}]:[data.result_media]),...data.screens,...(fullSize?data.screens.filter(s=>Object.hasOwn(s,'full_src')).map(s=>({src:s.full_src,alt:s.alt})):[])];
 for(const image of images){
  if(!image||!/^\/assets\/[\w/.-]+$/.test(image.src)||image.src.includes('..')||!image.alt)throw Error('Invalid case asset');
  if(!fs.existsSync(path.join(root,image.src.slice(1))))throw Error('Missing case asset '+image.src);
 }
 for(const key of metal?['main']:['left','main','right'])if(!data.hero_media?.[key])throw Error('Missing hero asset '+key);
 if(flowers&&Object.keys(data.hero_media).length!==3)throw Error('Flowers hero requires exactly three phone screens');
 if(metal&&Object.keys(data.hero_media).length!==1)throw Error('Metal hero requires one complete central image');
 if(prostor&&Object.keys(data.hero_media).length!==3)throw Error('Prostor hero requires exactly three screens');
 if(b2b&&Object.keys(data.hero_media).length!==3)throw Error('B2B hero requires exactly three screens');
 if(crm&&Object.keys(data.hero_media).length!==3)throw Error('CRM hero requires exactly three screens');
 const values={result:escape(data.result),status:escape(data.status),h1:escape(copy.title),short_name:escape(copy.title),intro:escape(copy.description),meta_title:escape(copy.title+' — SyntheCore'),meta_description:escape(copy.description)};
 values.process=data.process.map((step,i)=>`<article class="sc-case-process__step" data-process-step="${i+1}"><div class="sc-case-process__number-wrap"><span class="sc-case-process__number-circle" aria-hidden="true">${i+1}</span></div><div class="sc-case-process__text"><h3>${escape(step.title)}</h3><p>${escape(step.body)}</p></div></article>`).join('\n');
 values.screens=data.screens.map(screen=>`<figure class="sc-case-screens__item sc-case-reveal"><button class="sc-case-screens__open" type="button" aria-label="Увеличить: ${escape(screen.caption)}" data-full="${escape(fullSize&&screen.full_src?screen.full_src:screen.src)}" data-title="${escape(screen.caption)}"><img src="${escape(screen.src)}" alt="${escape(screen.alt)}" loading="lazy" decoding="async"></button><figcaption>${escape(screen.caption)}</figcaption></figure>`).join('\n');
 for(const [key,image] of Object.entries(data.hero_media)){values['hero_'+key+'_src']=escape(image.src);values['hero_'+key+'_alt']=escape(image.alt);}
 if(metal){
  values.metric_value=escape(data.result_metric.value);values.metric_label=escape(data.result_metric.label);values.metric_aria=escape(data.result_metric.aria_label);values.metric_art=escape(data.result_metric.art);
 }else if(!flowers){values.result_src=escape(data.result_media.src);values.result_alt=escape(data.result_media.alt);}
 values.case_class=flowers?' sc-case-flowers':metal?' sc-case-metal':prostor?' sc-case-prostor':b2b?' sc-case-b2b':crm?' sc-case-crm':'';
 values.case_styles=flowers?'\n<link rel="stylesheet" href="/css/case-flowers.css">':metal?'\n<link rel="stylesheet" href="/css/case-metal.css">':prostor?'\n<link rel="stylesheet" href="/css/case-prostor.css">':b2b?'\n<link rel="stylesheet" href="/css/case-b2b.css">':crm?'\n<link rel="stylesheet" href="/css/case-crm.css">':'';
 // Reuse current semantic catalog cards and its dialog behavior, with no second project list.
 const {wireCaseLinks}=require('./case-links.cjs');
 const catalog=wireCaseLinks('works',read(root,'templates/pages/works.html'),casePages(root));
 const cards=[...catalog.matchAll(/<article class="case-card\b[\s\S]*?<\/article>/g)].map(m=>m[0]);
 if(cards.length!==6||!cards.some(c=>c.includes(`data-project="${data.catalog_id}"`)))throw Error('Case must match one of six catalog projects');
 values.related=cards.filter(c=>!c.includes(`data-project="${data.catalog_id}"`)).join('\n');
 const template=read(root,'templates/pages/case.html')
  .replace('{{hero_media}}',read(root,'templates/partials/cases/'+(flowers?'hero-flowers':metal?'hero-metal':prostor?'hero-prostor':b2b?'hero-b2b':crm?'hero-crm':'hero-collage')+'.html'))
  .replace('{{result_content}}',read(root,'templates/partials/cases/'+(flowers?'result-flowers':metal?'result-metal':prostor?'result-prostor':b2b?'result-b2b':crm?'result-crm':'result-screen')+'.html'));
 return template.replace(/\{\{([a-z0-9_]+)\}\}/g,(marker,key)=>Object.hasOwn(values,key)?values[key]:marker);
}
module.exports={casePages,renderCase};
