const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--allow-file-access-from-files']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+path.resolve('expedition/index.html'));await page.locator('[data-action=stage][data-id="0"]').click();await page.waitForSelector('[data-action=begin]',{timeout:90000});await page.locator('[data-action=begin]').click();await page.waitForFunction(()=>Wacha24Debug.state.status==='playing');await page.evaluate(()=>Wacha24Debug.pause());
  const result=await page.evaluate(()=>{
   const {state:s,world:w}=Wacha24Debug,fixture=s.definition.fixtures[0],p={...s.people[s.targetId],activity:'riding',ride:0,station:null,transitSite:null,x:fixture.x,y:fixture.y,phase:.125,yielding:0};
   const fixtureSite=s.sites.find(site=>site.fixture===fixture.id);if(!fixtureSite)throw Error('requires a foreground fixture');fixtureSite.occupant=p.id;
   const photo={target:p,takenAt:s.elapsed,rect:{x:p.x-100,y:p.y-150,w:200,h:200},eventSnapshot:[]},original=CanvasRenderingContext2D.prototype.drawImage,draws=[];
   let captured;try{CanvasRenderingContext2D.prototype.drawImage=function(...args){if(args[0] instanceof ImageBitmap)draws.push({sourceHeight:args[4],tileHeight:args[0].height});return Reflect.apply(original,this,args);};captured=w.photo(s,photo);}finally{CanvasRenderingContext2D.prototype.drawImage=original;}
   const mask=document.createElement('canvas');mask.width=captured.width;mask.height=captured.height;const scale=w.scale*w.dpr,maskContext=mask.getContext('2d');maskContext.setTransform(scale,0,0,scale,-photo.rect.x*scale,-photo.rect.y*scale);Wacha24Art.sprite(maskContext,p,p.x,p.y,46*p.height,0,true);
   const expected=w.photo(s,{...photo,target:{...p,x:-10000,y:-10000}}),c=expected.getContext('2d');Wacha24Art.sprite(c,p,p.x,p.y,46*p.height,0,true);
   const alpha=maskContext.getImageData(0,0,mask.width,mask.height).data,e=c.getImageData(0,0,expected.width,expected.height).data,got=captured.getContext('2d').getImageData(0,0,captured.width,captured.height).data,legY=(p.y-46*p.height*.28-photo.rect.y)*scale;let opaque=0,legs=0,mismatched=0;
   for(let i=0;i<e.length;i+=4)if(alpha[i+3]>=230){opaque++;if(Math.floor(i/4/expected.width)>=legY)legs++;if(Math.abs(e[i]-got[i])+Math.abs(e[i+1]-got[i+1])+Math.abs(e[i+2]-got[i+2])>3)mismatched++;}
   return{opaque,legs,mismatched,characterDraws:draws.length,fullBody:draws.every(d=>d.sourceHeight===d.tileHeight),image:captured.toDataURL()};
  });
  assert.equal(result.characterDraws,1,'all other people must be transparent in the photograph');assert.ok(result.fullBody,'riding must not crop the target');assert.ok(result.opaque>100);assert.ok(result.legs>5,'complete lower-body pixels must be present');assert.equal(result.mismatched,0,'nothing can obscure an opaque target pixel, including fixture fronts and ambient effects');assert.deepEqual(errors,[]);
  fs.writeFileSync('assets/production/review/revealing-photo.png',Buffer.from(result.image.split(',')[1],'base64'));delete result.image;const report={at:new Date().toISOString(),checks:['only one character is rendered','riding target uses the full captured pose','every opaque target pixel is visible above all scenery','lower body remains visible'],...result,errors};fs.writeFileSync('assets/production/review/photo-browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
