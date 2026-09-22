// Mechanical packaging only: resize/compress generated art and measure sprite bounds.
// Pass the path to the sharp package if it is not installed in this project.
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
const require=createRequire(import.meta.url);
const sharp=require(process.argv[2]||'sharp');
const root=new URL('../',import.meta.url);
const sources=JSON.parse(await fs.readFile(new URL('art-sources.json',root),'utf8'));
await fs.mkdir(new URL('assets/',root),{recursive:true});
const atlas={};
for(const [name,source] of Object.entries(sources)){
  const width=['world','lobby','gacha'].includes(name)?900:name==='enemy'?512:1024;
  const dest=new URL(`assets/${name}.webp`,root);
  await sharp(source).resize({width,withoutEnlargement:true}).webp({quality:85,alphaQuality:100}).toFile(dest.pathname);
  if(['hero','platforms','items'].includes(name)){
    const {data,info}=await sharp(dest.pathname).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    if(!info.channels||info.channels!==4)throw new Error(`${name} missing RGBA`);
    const sprites=[];
    for(let i=0;i<4;i++){
      const x0=i%2*(info.width/2),y0=Math.floor(i/2)*(info.height/2),x1=x0+info.width/2,y1=y0+info.height/2;
      let left=x1,top=y1,right=x0,bottom=y0;
      for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(data[(y*info.width+x)*4+3]>60){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
      sprites.push({x:left,y:top,w:right-left+1,h:bottom-top+1});
    }
    atlas[name]=sprites;
    console.log(name,info.width,info.height,'corner alpha',data[3],JSON.stringify(sprites));
  }
  if(name==='icon')for(const size of [192,512])await sharp(source).resize(size,size).png().toFile(new URL(`assets/icon-${size}.png`,root).pathname);
}
await fs.writeFile(new URL('assets/atlas.json',root),JSON.stringify(atlas));
console.log('Assets packaged.');
