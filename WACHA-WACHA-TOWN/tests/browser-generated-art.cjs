// Inspect the real bundled sheets, independently of the synthetic renderer fixture.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {artworkFingerprints}=require('./artwork-fingerprint.cjs');
const hashes=()=>Object.fromEntries(['data.js','expedition-core.js','expedition-render.js'].map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync('expedition/'+n)).digest('hex')]));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--allow-file-access-from-files']});
 const artwork=artworkFingerprints();
 const dir='assets/production/animation-expansion/review',report={at:new Date().toISOString(),runtimeHashes:hashes(),imageFingerprint:artwork.fingerprint,imageFileCount:artwork.fileCount,stages:[],errors:[]};
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto('file://'+path.resolve('expedition/index.html'));
  const ids=process.env.QA_STAGE?process.env.QA_STAGE.split(',').map(Number):Array.from({length:24},(_,i)=>i);
  for(const id of ids){
   await page.evaluate(id=>Wacha24Debug.prepare(id),id);await page.waitForSelector('[data-action=begin]',{timeout:120000});
   const r=await page.evaluate(async()=>{
    const {state:s}=Wacha24Debug,A=Wacha24Art,people=s.people.filter(p=>A.designs.get(p.design)?.clips),names=['base','walkBack','stairUp','stairDown','roleWork'];
    const scaleRegressions=new Set(['S13-C091','S15-C051','S15-C091','S22-C096']);
    const scaleReview=new Set([...scaleRegressions,'S02-C011','S13-C077','S13-C079','S13-C080','S13-C085','S13-C087','S13-C088','S13-C092','S16-C067','S17-C088','S19-C026','S19-C027','S19-C028','S19-C056','S20-C075','S20-C079','S22-C095','S23-C067','S23-C071']);
    const chosen=people.filter(p=>scaleReview.has(p.design));
    for(const p of people.filter(p=>A.designs.get(p.design)?.clips?.roleWork))if(chosen.length<8&&!chosen.includes(p))chosen.push(p);
    for(const p of people)if(chosen.length<8&&!chosen.includes(p))chosen.push(p);
    const canvas=document.createElement('canvas');canvas.width=600;canvas.height=chosen.length*112+30;const c=canvas.getContext('2d');c.fillStyle='#dce8cf';c.fillRect(0,0,canvas.width,canvas.height);c.fillStyle='#172b24';c.font='14px sans-serif';names.forEach((n,i)=>c.fillText(n,52+i*108,20));
    const checks=[],dimensions=[];
    for(const [row,p]of chosen.entries()){
     const d=A.designs.get(p.design);c.fillText(d.id,5,row*112+54);
     for(const [col,name]of names.entries()){
      const clip=d.clips?.[name];if(name!=='base'&&!clip)continue;
      if(clip){const im=await A.load(clip.image);for(const f of clip.frames)if(f.x<0||f.y<0||f.x+f.w>im.naturalWidth||f.y+f.h>im.naturalHeight)throw Error('Out-of-bounds frame '+d.id+' '+name);}
      const tile=document.createElement('canvas');tile.width=tile.height=96;A.sprite(tile.getContext('2d'),{...p,facing:1,activity:'walking'},48,96,96,{clip:name,frame:0},true);
      const pixels=tile.getContext('2d').getImageData(0,0,96,96).data;let min=96,max=-1,opaque=0;
      for(let i=3;i<pixels.length;i+=4)if(pixels[i]>100){const y=Math.floor(i/4/96);min=Math.min(min,y);max=Math.max(max,y);opaque++;}
      if(opaque<80)throw Error('Empty runtime pose '+d.id+' '+name);
      dimensions.push({id:d.id,clip:name,visibleHeight:max-min+1,foot:max,opaque});c.drawImage(tile,48+col*108,row*112+30);
     }
    }
    for(const p of chosen.filter(p=>scaleRegressions.has(p.design))){
     const poses=dimensions.filter(d=>d.id===p.design),base=poses.find(d=>d.clip==='base');
     for(const pose of poses.filter(d=>['walkBack','stairUp','stairDown'].includes(d.clip)))if(pose.visibleHeight<base.visibleHeight*.8)throw Error('Directional size regression '+p.design+' '+pose.clip);
    }
    for(const p of chosen)for(const clip of Object.values(A.designs.get(p.design).clips||{}))A.loaded.delete(clip.image);
    const cache=A.cacheStats();if(cache.clipBytes>cache.clipLimit)throw Error('Clip cache exceeded its budget');
    return{stage:s.definition.key,population:s.people.length,directional:people.filter(p=>A.designs.get(p.design).clips?.walkBack).length,role:people.filter(p=>A.designs.get(p.design).clips?.roleWork).length,environment:s.definition.animatedScenery.length,cache,dimensions,image:canvas.toDataURL()};
   });
   fs.writeFileSync(`${dir}/runtime-poses-${r.stage}.png`,Buffer.from(r.image.split(',')[1],'base64'));delete r.image;report.stages.push(r);console.log(r.stage,r.directional,r.role,r.environment);
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(hashes(),report.runtimeHashes);assert.equal(artworkFingerprints().fingerprint,artwork.fingerprint,'Runtime images changed during artwork review');report.imagesUnchanged=true;report.unchanged=true;report.passed=true;fs.writeFileSync(`${dir}/runtime-art-${process.env.QA_STAGE?'partial':'all'}.json`,JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
