'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.json':'application/json','.woff2':'font/woff2'};
for (const [port, dir] of [[4176,root],[4177,path.join(root,'output/v62-source')]]) {
  http.createServer((req,res)=>{
    let file;
    try {file=path.resolve(dir,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch{res.writeHead(400).end();return;}
    if(file===dir)file=path.join(dir,'index.html');
    if(!file.startsWith(dir+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);});
  }).listen(port,'127.0.0.1',()=>console.log(`Serving ${dir} on http://127.0.0.1:${port}/`));
}
