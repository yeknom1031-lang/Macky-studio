import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)(process.argv[2]||'sharp');
const sources=JSON.parse(await readFile(new URL('../art-sources-v2.json',import.meta.url),'utf8'));
for(const [name,path] of Object.entries(sources)){
  const dest=new URL(`../assets/${name}.webp`,import.meta.url);
  await sharp(path).resize(name.startsWith('world')?900:name==='capsule'?512:720).webp({quality:86,alphaQuality:95}).toFile(dest.pathname);
  console.log(name,await sharp(dest.pathname).metadata());
}
