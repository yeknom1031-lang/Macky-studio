import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)(process.argv[2]||'sharp');
const sources=JSON.parse(await readFile(new URL('../art-sources-animation.json',import.meta.url),'utf8'));
for(const [name,path] of Object.entries(sources)){
  const metadata=await sharp(path).metadata();
  if(!metadata.hasAlpha||metadata.width!==metadata.height)throw new Error(name+': expected square alpha sheet');
  // Preserve cell-local anchors and transparent pixels; never crop frames individually.
  await sharp(path).resize(1024,1024).webp({quality:84,alphaQuality:95}).toFile(new URL('../assets/'+name+'.webp',import.meta.url).pathname);
  console.log(name,metadata.width+'×'+metadata.height+' → 1024×1024 alpha WebP');
}
