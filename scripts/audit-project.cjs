'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
function audit(root=path.resolve(__dirname,'..')){
 const files=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean),read=f=>fs.readFileSync(path.join(root,f),'utf8');
 const source=new Map(files.filter(f=>/\.(?:cjs|js|ps1|bat|md|html|css)$/.test(f)&&!f.startsWith('backup/')).map(f=>[f,read(f)]));
 const history=JSON.parse(read('docs/qa/style-scripts-refactor/before.json'));
 const recorded=new Map(history.inventory.scripts.files.map(f=>[f.file,f.sha256]));
 const historical=new Set(history.legacyCandidates.map(f=>f.file));
 const legacy=files.filter(f=>historical.has(f)&&crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')===recorded.get(f));
 const references=Object.fromEntries(legacy.map(f=>[f,[...source].filter(([p,s])=>p!==f&&p!=='scripts/audit-project.cjs'&&!legacy.includes(p)&&(s.includes(f)||s.includes(path.posix.basename(f)))).map(([p])=>p)]));
 const inventory={};for(const folder of ['css','scripts','backup']){
  const list=files.filter(f=>f.startsWith(folder+'/')).map(file=>{const bytes=fs.readFileSync(path.join(root,file));return {file,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')}}),groups={};
  for(const item of list)(groups[item.sha256]??=[]).push(item.file);
  inventory[folder]={count:list.length,bytes:list.reduce((sum,x)=>sum+x.bytes,0),exactDuplicates:Object.values(groups).filter(g=>g.length>1),files:list};
 }
 const pages=['index.html','raboty/index.html',...files.filter(f=>/^raboty\/[^/]+\/index\.html$/.test(f))];
 const entries=Object.fromEntries(pages.map(p=>[p,[...read(p).matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)].map(m=>m[1])]));
 const {SOURCE_HREFS}=require('./lib/home-styles.cjs'),used=new Set([...Object.values(entries).flat(),...SOURCE_HREFS].map(p=>p.replace(/^(\.\/|\/)/,'')));
 for(const file of [...used])for(const [,target]of read(file).matchAll(/@import\s+url\(["']([^"']+)["']\)/g))if(!/https?:/.test(target))used.add(path.posix.normalize(path.posix.join(path.posix.dirname(file),target)));
 const protectedCSS=new Set([...Object.keys(JSON.parse(read('docs/V62_SOURCE_SHA256.json')).motion_lock),...Object.keys(JSON.parse(read('docs/V62_ON_V27_SOURCES.json')).v27)].filter(f=>f.startsWith('css/')));
 const unusedCSS=inventory.css.files.filter(f=>!used.has(f.file)).map(f=>({file:f.file,protected:protectedCSS.has(f.file)})),dependencies=[],unresolvedRelativeRequires=[];
 for(const [file,text]of source)if(/\.(?:cjs|js)$/.test(file))for(const [, ,target]of text.matchAll(/\brequire\(\s*(["'])(\.[^"']+)\1\s*\)/g)){
  const base=path.resolve(root,path.dirname(file),target),resolved=[base,base+'.cjs',base+'.js',path.join(base,'index.cjs'),path.join(base,'index.js')].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());
  if(resolved)dependencies.push({file,target:path.relative(root,resolved).split(path.sep).join('/')});else unresolvedRelativeRequires.push({file,target});
 }
 return {base:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),inventory,entries,unusedCSS,dependencies,unresolvedRelativeRequires,legacyCandidates:legacy.map(file=>({file,referencesOutsideRemovalSet:references[file]}))};
}
if(require.main===module){try{if(process.argv.slice(2).some(a=>a!=='--json'))throw Error('Usage: node scripts/audit-project.cjs [--json]');const r=audit();console.log(JSON.stringify(process.argv.includes('--json')?r:{folders:Object.fromEntries(Object.entries(r.inventory).map(([k,v])=>[k,{count:v.count,bytes:v.bytes,exactDuplicateGroups:v.exactDuplicates.length}])),styleLinks:Object.fromEntries(Object.entries(r.entries).map(([k,v])=>[k,v.length])),unusedCSS:r.unusedCSS,legacyCandidates:r.legacyCandidates.length,referencedCandidates:r.legacyCandidates.filter(x=>x.referencesOutsideRemovalSet.length),unresolvedRelativeRequires:r.unresolvedRelativeRequires},null,2))}catch(error){console.error(error.message);process.exitCode=1}}
module.exports={audit};
