import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import os from 'node:os';
const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.MAGMA_PORT||4188);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.md':'text/plain; charset=utf-8'};
const openBrowser=()=>{if(process.argv.includes('--open'))spawn(process.platform==='darwin'?'open':'xdg-open',[`http://localhost:${port}`],{stdio:'ignore'}).on('error',()=>{});};
const lanAddress=Object.values(os.networkInterfaces()).flat().find(a=>a.family==='IPv4'&&!a.internal&&/^192[.]168[.]|^10[.]|^172[.](1[6-9]|2\d|3[01])[.]/.test(a.address));
const server=http.createServer((req,res)=>{
  try{
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
    const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.resolve(root,'.'+(rel==='/'?'/index.html':rel));
    if(!file.startsWith(root+path.sep)||rel.split('/').some(p=>p.startsWith('.'))){res.writeHead(403).end();return;}
    fs.stat(file,(err,stat)=>{
      if(err||!stat.isFile()){res.writeHead(404).end('Not found');return;}
      res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
      if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
    });
  }catch{res.writeHead(400).end();}
});
server.on('error',error=>{if(error.code==='EADDRINUSE'){console.log(`Port ${port} is already in use. Try http://localhost:${port}, or change MAGMA_PORT.`);openBrowser();}else{console.error(error.message);process.exitCode=1;}});
server.listen(port,'0.0.0.0',()=>{console.log(`MAGMA ESCAPE → http://localhost:${port}`);if(lanAddress)console.log(`同じWi-Fiから → http://${lanAddress.address}:${port}`);else console.log('LANのIPv4アドレスを見つけられません。ネットワーク接続を確認してください。');openBrowser();});
