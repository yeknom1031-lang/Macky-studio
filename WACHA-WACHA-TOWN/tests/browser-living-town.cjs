const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const hashes=()=>Object.fromEntries(['data.js','expedition-core.js','expedition-render.js','expedition-app.js','expedition-input.js','expedition-audio.js'].map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync('expedition/'+n)).digest('hex')]));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--allow-file-access-from-files']});
 const report={at:new Date().toISOString(),runtimeHashes:hashes(),stages:[],errors:[]};
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto('file://'+path.resolve('expedition/index.html'));
  const stages=await page.evaluate(()=>WACHA24_DATA.stages.map(s=>s.id));
  const subset=process.env.QA_STAGE?.split(',').map(Number);
  for(const id of stages.filter(id=>!subset||subset.includes(id))){
   await page.evaluate(id=>{Date.now=()=>246810+id;return Wacha24Debug.prepare(id);},id);await page.waitForSelector('[data-action=begin]',{timeout:120000});
   await page.locator('[data-action=begin]').click();await page.waitForFunction(()=>Wacha24Debug.state.status==='playing');
   const metrics=await page.evaluate(()=>{
    const {state:s,world:w}=Wacha24Debug;
    const positions=s.people.map(p=>[p.x,p.y]);WachaExpedition.step(s,8);
    const moves=s.people.filter((p,i)=>Math.hypot(p.x-positions[i][0],p.y-positions[i][1])>8).length;
    const rooms=s.people.filter(p=>p.areaId!=null).length,upper=s.people.filter(p=>p.level>0).length;
    const actions=Object.fromEntries([...new Set(s.people.map(p=>p.activity))].map(a=>[a,s.people.filter(p=>p.activity===a).length]));
    Wacha24Debug.pause();document.querySelector('#dialog').close();w.draw(s);
    return {id:s.stage,name:s.definition.name,count:s.people.length,areas:s.definition.activityAreas?.length||0,
      livingTown:!!s.definition.livingTown,rooms,roomFraction:rooms/s.people.length,upper,moves,actions,
      detailTiles:s.definition.backgroundTiles?.length||0,pixelWidth:s.definition.detailPixelWidth,
      loadedTiles:(s.definition.backgroundTiles||[]).every(t=>Wacha24Art.loaded.get(t.image)?.naturalWidth>=1600),
      maxOverlap:s.stats.maxOverlap};
   });
   console.log(JSON.stringify(metrics));
   assert.ok(metrics.livingTown,'requires the measured open-building navigation');
   assert.ok(metrics.areas>=6,'each stage needs several actual activity floors');
   assert.ok(metrics.roomFraction>.25,'residents must inhabit rooms and gardens, not only roads');
   assert.ok(metrics.upper>=2,'upper floors need visible residents');
   assert.ok(metrics.moves>metrics.count*.10,'at least a tenth of the crowd moves while workers and resting residents remain in place');
   assert.ok((metrics.actions.working||0)>25,'special actions must already be visible');
   assert.ok(metrics.maxOverlap<3,'overlaps cannot persist for three seconds');
   if(id>=11){assert.equal(metrics.detailTiles,4);assert.ok(metrics.pixelWidth>=3000);assert.ok(metrics.loadedTiles);}
   await page.screenshot({path:`assets/production/quality/review/living-${String(id+1).padStart(2,'0')}.png`});
   await page.evaluate(()=>{const {state:s,world:w}=Wacha24Debug;w.zoom=Math.min(1672/s.width,941/s.height);w.cx=s.width/2;w.cy=s.height/2;w.clamp();w.draw(s);});
   await page.screenshot({path:`assets/production/quality/review/overview-${String(id+1).padStart(2,'0')}.png`});
   report.stages.push(metrics);
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(hashes(),report.runtimeHashes);report.unchanged=true;report.passed=true;
  fs.writeFileSync(`assets/production/quality/review/${subset?'living-town-partial':'living-town-browser-report'}.json`,JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
