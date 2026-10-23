'use strict';
// Exact owner-authorized entry points, 2026-10-23. The original baseline manifests stay unchanged.
const stylesheet='<link rel="stylesheet" href="/css/case-links.css">\n';
const title='<h2 class="sc-work-content__title" id="sc-work-beauty-title">Beauty Insight AI</h2>';
const linkedTitle='<h2 class="sc-work-content__title" id="sc-work-beauty-title"><a class="sc-work-detail-link" href="/raboty/beauty-insight/">Beauty Insight AI</a></h2>';
const cardLink='<a class="sc-case-card-detail-link" href="/raboty/beauty-insight/" aria-label="Подробный кейс: Beauty Insight AI">Подробный кейс →</a>';
function once(text,from,to){if(text.split(from).length!==2)throw Error('Expected exactly one authorized case link insertion');return text.replace(from,to)}
function restoreCaseLinks(file,text){
 if(['index.html','templates/pages/home.html'].includes(file)){
  if(!text.includes(linkedTitle)&&!text.includes(stylesheet))return text;
  text=once(text,linkedTitle,title);return once(text,stylesheet+'</head>','</head>');
 }
 if(['raboty/index.html','templates/pages/works.html'].includes(file)){
  if(!text.includes(cardLink)&&!text.includes(stylesheet))return text;
  if(text.split(cardLink).length!==2)throw Error('Expected exactly one authorized case link insertion');
  const article=text.match(/<article class="case-card case-card--beauty">[\s\S]*?<\/article>/)?.[0];
  if(!article||!article.includes('</button>'+cardLink+'\n</article>'))throw Error('Expected authorized case link inside Beauty card');
  text=text.replace(article,once(article,cardLink,''));return once(text,stylesheet+'</head>','</head>');
 }
 return text;
}
module.exports={restoreCaseLinks,stylesheet,title,linkedTitle,cardLink};
