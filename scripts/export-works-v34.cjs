'use strict';
// Review artifact only. Production sources remain templates + the ordinary build.
const fs=require('node:fs'),path=require('node:path');
const {build}=require('./build-site.cjs');
function previewHTML(root){
 build(root,true);
 const mime={'.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2'};
 const local=href=>{
  const file=path.resolve(root,decodeURIComponent(new URL(href,'https://preview.invalid/').pathname).replace(/^\//,''));
  if(!file.startsWith(path.resolve(root)+path.sep))throw Error('Preview resource outside project');
  return file;
 };
 const cache=new Map();
 const dataURL=href=>{
  if(!cache.has(href)){const file=local(href);cache.set(href,`data:${mime[path.extname(file)]||'application/octet-stream'};base64,${fs.readFileSync(file).toString('base64')}`)}
  return cache.get(href);
 };
 let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 html=html.replace('<head>','<head>\n<meta name="sc-review-version" content="works-v34">');
 html=html.replace(/<a\b[^>]*>/g,anchor=>anchor.replace(/href="(\/[^\"]*)"/,'href="http://127.0.0.1:4176$1"'));
 html=html.replace(/<title>[\s\S]*?<\/title>/,'<title>SyntheCore — Works v34 / Hero geometry</title>');
 html=html.replace(/(<img\b[^>]*\bsrc=")([^"]+)(")/g,(_,before,href,after)=>before+dataURL(href)+after);
 html=html.replace(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>\s*<\/script>/g,(_,href)=>'<script>\n'+fs.readFileSync(local(href),'utf8').replace(/<\/script/gi,'<\\/script')+'\n</script>');
 html=html.replace(/<link rel="stylesheet" href="([^"]+)">/g,(_,href)=>{
  const css=fs.readFileSync(local(href),'utf8').replace(/url\(\s*(?:(["'])(.*?)\1|([^\s)]+))\s*\)/g,(original,quote,quoted,plain)=>{
   const resource=quoted??plain;
   return /^(?:[a-z][\w+.-]*:|\/\/|#)/i.test(resource)?original:'url("'+dataURL(resource)+'")';
  });
  return '<style>\n'+css.replace(/<\/style/gi,'<\\/style')+'\n</style>';
 });
 return html;
}
if(require.main===module){
 const root=path.resolve(__dirname,'..'),destination=path.join(root,'output/works-v34/SyntheCore_Works_v34.html');
 fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,previewHTML(root));console.log(destination);
}
module.exports={previewHTML};
