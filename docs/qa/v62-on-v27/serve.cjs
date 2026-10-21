'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=process.cwd();
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf','.webm':'video/webm','.json':'application/json'};
for(const [port,dir] of [[4180,path.join(root,'output/worktrees/works-v27')],[4181,root],[4182,path.join(root,'output/v62-source')]]){
  http.createServer((req,res)=>{
    let f;
    try{f=path.resolve(dir,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch{res.writeHead(400).end();return;}
    if(f!==dir&&!f.startsWith(dir+path.sep)){res.writeHead(403).end();return;}
    if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
    fs.readFile(f,(e,b)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'}).end(b);});
  }).listen(port,'127.0.0.1',()=>console.log(port+' '+dir));
}
