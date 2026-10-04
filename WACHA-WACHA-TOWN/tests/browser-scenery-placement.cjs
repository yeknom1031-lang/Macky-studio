// Capture the actual generated scenery together with each stage's residents.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {artworkFingerprints}=require('./artwork-fingerprint.cjs');
const out='assets/production/animation-expansion/review';
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const subset=process.env.QA_STAGE?process.env.QA_STAGE.split(',').map(v=>Number(v.trim())):null;
if(subset)assert.ok(subset.length&&subset.every(v=>Number.isInteger(v)&&v>=0&&v<24)&&new Set(subset).size===subset.length,'QA_STAGE must contain unique zero-based stage IDs from 0 to 23');
const reportFile=subset?'scenery-runtime-partial.json':'scenery-runtime-placement.json';
const imagePrefix=subset?'focused':'runtime';
(async()=>{
 const artwork=artworkFingerprints();
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--allow-file-access-from-files']});
 const report={at:new Date().toISOString(),scope:subset?'partial':'all',requestedStages:subset,runtimeHashes:Object.fromEntries(['data.js','expedition-core.js','expedition-render.js','expedition-app.js','expedition-input.js','expedition-audio.js'].map(n=>[n,hash('expedition/'+n)])),stages:[],errors:[],visualReview:'pending'};
 report.unresolvedFindings=JSON.parse(fs.readFileSync(out+'/scenery-known-findings.json','utf8')).findings.filter(r=>r.state!=='resolved').map(r=>r.stage);
 const save=()=>fs.writeFileSync(out+'/'+reportFile,JSON.stringify(report,null,2)+'\n');
 try{
  const page=await browser.newPage({viewport:{width:1672,height:941}});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto('file://'+path.resolve('expedition/index.html'));
  const ids=await page.evaluate(wanted=>WACHA24_DATA.stages.map(s=>s.id).filter(id=>!wanted||wanted.includes(id)),subset);
  for(const id of ids){
   await page.evaluate(id=>{Date.now=()=>547321+id;return Wacha24Debug.prepare(id)},id);
   await page.waitForSelector('[data-action=begin]',{timeout:120000});
   await page.locator('[data-action=begin]').click();
   await page.waitForFunction(()=>Wacha24Debug.state.status==='playing');
   await page.waitForTimeout(1200);
   const metrics=await page.evaluate(()=>{
    const {state:s,world:w}=Wacha24Debug;
    Wacha24Debug.pause();document.querySelector('#dialog').close();
    w.zoom=Math.min(1672/s.width,941/s.height);w.cx=s.width/2;w.cy=s.height/2;w.clamp();w.draw(s);
    return {stage:s.definition.key,name:s.definition.name,population:s.people.length,elapsed:s.elapsed,
     scenery:s.definition.animatedScenery.map(c=>({id:c.id,name:c.name,layer:c.layer,placements:c.placements.length,loaded:!!Wacha24Art.loaded.get(c.image)?.naturalWidth})),
     areas:s.definition.activityAreas.map(a=>({id:a.id,name:a.name,level:a.level,people:s.people.filter(p=>p.areaId===a.id).length})),
     working:s.people.filter(p=>p.activity==='working').length,upper:s.people.filter(p=>p.level>0).length,
     maxOverlap:s.stats.maxOverlap};
   });
   await page.screenshot({path:out+'/'+metrics.stage+'-'+imagePrefix+'-overview.png'});
   await page.evaluate(()=>{const {state:s,world:w}=Wacha24Debug;w.zoom=1;w.cx=s.width*.5;w.cy=s.height*.5;w.clamp();w.draw(s)});
   await page.screenshot({path:out+'/'+metrics.stage+'-'+imagePrefix+'-detail.png'});
   const views=['overview','detail'];
   if(id>=7){
    await page.evaluate(()=>{const {state:s,world:w}=Wacha24Debug;w.cx=s.width-1;w.cy=s.height-1;w.zoomAt(1.5);w.clamp();w.draw(s)});
    await page.screenshot({path:out+'/'+metrics.stage+'-'+imagePrefix+'-corner.png'});views.push('corner');
   }
   Object.assign(metrics,artwork.stages[metrics.stage]);
   metrics.screenshots=Object.fromEntries(views.map(k=>{const file=out+'/'+metrics.stage+'-'+imagePrefix+'-'+k+'.png';return [k,{path:file,sha256:hash(file)}]}));
   report.stages.push(metrics);save();
   assert.equal(metrics.scenery.length,12,metrics.stage+' needs all 12 reviewed environment objects');
   assert.ok(metrics.scenery.every(c=>c.loaded),metrics.stage+' loads every scenery atlas');
   assert.ok(metrics.upper>0,metrics.stage+' includes upper floor residents');
   console.log(JSON.stringify({stage:metrics.stage,scenery:metrics.scenery.length,population:metrics.population,working:metrics.working,upper:metrics.upper}));
  }
  assert.deepEqual(report.stages.map(s=>Number(s.stage.slice(1))-1).sort((a,b)=>a-b),ids.slice().sort((a,b)=>a-b));
  assert.equal(ids.length,subset?subset.length:24);
  assert.deepEqual(report.errors,[]);report.unchanged=Object.entries(report.runtimeHashes).every(([n,d])=>hash('expedition/'+n)===d);assert.ok(report.unchanged);
  assert.equal(artworkFingerprints().fingerprint,artwork.fingerprint,'Runtime images changed during capture');
  report.imageFingerprint=artwork.fingerprint;report.imageFileCount=artwork.fileCount;report.imagesUnchanged=true;report.capturePassed=true;save();
 }finally{save();await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
