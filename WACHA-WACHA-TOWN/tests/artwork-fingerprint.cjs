// Bind visual checks to the encoded images as well as the unchanged game code.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
function artworkFingerprints(root='expedition'){
 const text=fs.readFileSync(path.join(root,'data.js'),'utf8');
 const data=JSON.parse(text.slice(text.indexOf('=')+1).trim().replace(/;$/,''));
 const files=Object.fromEntries(fs.readdirSync(path.join(root,'images')).filter(n=>n.endsWith('.js')).sort().map(n=>[n,digest(fs.readFileSync(path.join(root,'images',n)))]));
 const fingerprint=hashes=>digest(Object.entries(hashes).map(([n,h])=>n+' '+h+'\n').join(''));
 const stages=Object.fromEntries(data.stages.map(stage=>{
  const keys=new Set([stage.background,stage.setImage,...(stage.backgroundTiles||[]).map(t=>t.image),...(stage.animatedScenery||[]).map(c=>c.image)]);
  for(const c of data.characters)if(c.stage===stage.key||c.stage==='G'||c.stage==='A'){
   keys.add(c.image);for(const clip of Object.values(c.clips||{}))keys.add(clip.image);
  }
  const images=Object.fromEntries([...keys].filter(Boolean).sort().map(k=>{const n=k+'.js';if(!files[n])throw Error('Missing image '+n);return[n,files[n]];}));
  return[stage.key,{imageHashes:images,imageFingerprint:fingerprint(images)}];
 }));
 return{schemaVersion:1,fileCount:Object.keys(files).length,fingerprint:fingerprint(files),files,stages};
}
module.exports={artworkFingerprints};
