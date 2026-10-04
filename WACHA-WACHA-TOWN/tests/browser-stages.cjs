const { chromium } = require('playwright');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
// QA_STAGE accepts comma-separated zero-based stage IDs; partial runs never replace full QA.
const selected = process.env.QA_STAGE === undefined ? null : process.env.QA_STAGE.split(',').map(n => Number(n.trim()));
if (selected) assert.ok(selected.length && selected.every(n => Number.isInteger(n) && n >= 0 && n < 24));
const fixedSeed = process.env.QA_SEED === undefined ? null : Number(process.env.QA_SEED);
if (fixedSeed !== null) assert.ok(Number.isInteger(fixedSeed) && fixedSeed >= 0 && fixedSeed <= 0xffffffff);
const reportPath = `assets/production/review/stages-browser-${selected ? 'partial-' : ''}report.json`;
const codeHashes = Object.fromEntries(['expedition-core.js','expedition-render.js','expedition-app.js','expedition-input.js','expedition-audio.js','data.js'].map(name => [name,crypto.createHash('sha256').update(fs.readFileSync(path.join('expedition',name))).digest('hex')]));
(async () => {
 const browser = await chromium.launch({headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--allow-file-access-from-files']});
 const results=[],errors=[];
 try {
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+path.resolve('expedition/index.html'));
  let stages=await page.evaluate(()=>WACHA24_DATA.stages.filter(s=>s.ready).map(s=>({id:s.id,name:s.name,count:s.population})));
  if(process.env.RELEASE_QA)assert.equal(stages.length,24);
  if(selected) { stages=stages.filter(stage=>selected.includes(stage.id)); assert.equal(stages.length,new Set(selected).size); }
  for(const stage of stages){
   const began=Date.now();await page.evaluate(async({id,seed})=>{const create=WachaExpedition.create;if(seed!==null)WachaExpedition.create=(data,index,_seed,mode)=>create(data,index,seed,mode);try{await Wacha24Debug.prepare(id);}finally{WachaExpedition.create=create;}},{id:stage.id,seed:fixedSeed});
   await page.waitForSelector('[data-action=begin]',{timeout:120000});
   await page.locator('[data-action=begin]').click();
   await page.waitForFunction(()=>Wacha24Debug.state.status==='playing');
   const loadMs=Date.now()-began;
   const metrics=await page.evaluate(async()=>{
    const {state:s,world:w}=Wacha24Debug, C=WachaExpedition, originalStep=C.step, worst=new Map(),initialElapsed=s.elapsed;
    const person=p=>({id:p.id,design:p.design,role:p.role,x:p.x,y:p.y,level:p.level,layer:p.layer,ride:p.ride,activity:p.activity,node:p.node,to:p.to,station:p.station,areaId:p.areaId,path:p.path.slice(0,8),floorEscape:p.floorEscape?JSON.parse(JSON.stringify(p.floorEscape)):null,rideState:p.ride===null?null:{...s.rides[p.ride],path:s.rides[p.ride].path?.slice(0,8),passengers:[...s.rides[p.ride].passengers]}});
    function sample(){for(const [key,age] of s.overlaps)if(age>=1.8&&age>(worst.get(key)?.age||0)){const [a,b]=key.split(':').map(Number);worst.set(key,{key,age,at:s.elapsed,p:person(s.people[a]),q:person(s.people[b])});}}
    C.step=(state,dt)=>{const value=originalStep(state,dt);if(state===s)sample();return value;};
    for(let i=0;i<300;i++)C.step(s,.1);const frames=[];
    await new Promise(resolve=>{let last=performance.now(),n=0;function frame(t){if(n++>5)frames.push(t-last);last=t;if(n<100)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
    frames.sort((a,b)=>a-b);Wacha24Debug.pause();C.step=originalStep;
    return {seed:s.seed,initialElapsed,worstOverlaps:[...worst.values()].sort((a,b)=>b.age-a.age).slice(0,12),currentOverlaps:[...s.overlaps].sort((a,b)=>b[1]-a[1]).slice(0,12),count:s.people.length,unique:new Set(s.people.map(p=>p.design)).size,photographers:s.people.filter(p=>p.photographer).length,visible:w.visibleCount,frameMedianMs:frames[Math.floor(frames.length/2)],frameP95Ms:frames[Math.floor(frames.length*.95)],simulationElapsed:s.elapsed,maxOverlap:s.stats.maxOverlap,finite:s.people.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)),activities:[...new Set(s.people.map(p=>p.activity))]};
   });
   results.push({...stage,loadMs,...metrics});console.log(JSON.stringify(results.at(-1)));
   assert.equal(metrics.count,stage.count);assert.equal(metrics.unique,stage.count);assert.equal(metrics.photographers,5);assert.ok(metrics.finite);assert.ok(metrics.maxOverlap<3,`S${stage.id+1} seed=${metrics.seed} maxOverlap=${metrics.maxOverlap}`);
   await page.evaluate(()=>document.querySelector('#dialog').close());
   await page.screenshot({path:`assets/production/review/stage-${String(stage.id+1).padStart(2,'0')}.png`});
   if(stage.id>=7){
    await page.evaluate(()=>{const {state:s,world:w}=Wacha24Debug;w.cx=s.width-1;w.cy=s.height-1;w.zoomAt(1.5);w.clamp();w.draw(s);});
    await page.screenshot({path:`assets/production/review/stage-${String(stage.id+1).padStart(2,'0')}-corner.png`});
   }
   await page.evaluate(()=>document.querySelector('[data-action=leave]')?.click());
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(reportPath,JSON.stringify({passed:true,at:new Date().toISOString(),viewport:'1440 × 900',renderer:'headless Chrome',selected,codeHashes,results,errors},null,2));
 }catch(error){fs.writeFileSync(reportPath,JSON.stringify({passed:false,at:new Date().toISOString(),selected,codeHashes,results,errors,failure:String(error)},null,2));throw error;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
