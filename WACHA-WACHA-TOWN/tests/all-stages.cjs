const {Worker,isMainThread,parentPort,workerData}=require('node:worker_threads');
const C=require('../src/expedition-core.js'),fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const crypto=require('node:crypto'),dataText=fs.readFileSync('expedition/data.js','utf8'),sourceSHA=crypto.createHash('sha256').update(fs.readFileSync('src/expedition-core.js')).digest('hex'),dataSHA=crypto.createHash('sha256').update(dataText).digest('hex');
const sandbox={window:{}};vm.runInNewContext(dataText,sandbox);const D=JSON.parse(JSON.stringify(sandbox.window.WACHA24_DATA));
const readyStages=D.stages.filter(s=>s.ready),results=[],failures=[];
const subset=process.env.QA_STAGE===undefined?null:process.env.QA_STAGE.split(',').map(value=>{assert.match(value.trim(),/^\d+$/,'QA_STAGE must be comma-separated numeric stage IDs');return Number(value);});
if(subset){assert.equal(new Set(subset).size,subset.length,'QA_STAGE must not repeat a stage ID');for(const id of subset)assert.ok(readyStages.some(stage=>stage.id===id),`QA_STAGE ${id} is not a ready stage`);}
const stages=subset?subset.map(id=>readyStages.find(stage=>stage.id===id)):readyStages;
if(process.env.RELEASE_QA){assert.equal(readyStages.length,24);assert.equal(D.characters.length,4396);assert.equal(D.characters.filter(c=>c.stage==='G').length,1900);assert.equal(D.characters.filter(c=>c.animal).length,96);assert.equal(D.status.missing.length,0);assert.equal(D.status.errors.length,0);assert.equal(D.roles.length,250);}
function simulate(stage){
 const begin=performance.now(),s=C.create(D,stage.id,246810+stage.id),original=s.people.map(p=>[p.x,p.y]),animals=s.people.filter(p=>p.animal),animalMaxDisplacement=new Map(animals.map(p=>[p.id,0]));C.start(s);
 assert.equal(s.people.length,stage.population);assert.equal(new Set(s.people.map(p=>p.design)).size,stage.population);assert.equal(s.people.filter(p=>p.exclusive).length,100);assert.equal(s.people.filter(p=>p.photographer).length,5);
 let maxWaterError=0,maxOffFloor=0;
 for(let tick=0;tick<1800;tick++){
  C.step(s,.1);
  assert.ok(s.stats.maxOverlap<3,`${stage.key} at ${s.elapsed.toFixed(2)}s: overlap ${s.stats.maxOverlap}, pairs ${JSON.stringify([...s.overlaps].filter(([,age])=>age>=2.8))}`);
  for(const p of animals)animalMaxDisplacement.set(p.id,Math.max(animalMaxDisplacement.get(p.id),Math.hypot(p.x-original[p.id][0],p.y-original[p.id][1])));
  assert.ok(s.people.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=s.width&&p.y>=0&&p.y<=s.height));
  if(tick%10===0){const off=s.people.filter(p=>!C.canStand(s,p,p.x,p.y));maxOffFloor=Math.max(maxOffFloor,off.length);assert.equal(off.length,0,`${stage.key} at ${s.elapsed.toFixed(1)}s: off-floor actors ${off.slice(0,5).map(p=>`${p.id}@${p.x.toFixed(2)},${p.y.toFixed(2)} L${p.level}`).join('; ')}`);}
  if(tick%10===0)for(const p of s.people.filter(p=>p.habitat==='water')){
   const path=s.definition.waterPoints;let error=Infinity;
   for(let k=1;k<path.length;k++){const [ax,ay]=path[k-1],[bx,by]=path[k],dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((p.x-ax)*dx+(p.y-ay)*dy)/(dx*dx+dy*dy)||0));error=Math.min(error,Math.hypot(p.x-ax-t*dx,p.y-ay-t*dy));}
   maxWaterError=Math.max(maxWaterError,error);assert.ok(error<1,`${stage.key} at ${s.elapsed.toFixed(1)}s: swimming animal ${p.id} is ${error.toFixed(2)}px from water route`);
  }
 }
 assert.equal(s.status,'lost');assert.equal(s.remaining,0);assert.ok(s.stats.maxOverlap<3,`${stage.key}: overlap ${s.stats.maxOverlap}`);assert.ok(s.stats.events>=6);assert.ok(s.stats.purchases>0);assert.ok(s.stats.conversations>0);
 const immobileAnimals=animals.filter(p=>animalMaxDisplacement.get(p.id)<=1&&p.activity!=='acting');assert.deepEqual(immobileAnimals.map(p=>({id:p.id,name:p.name,activity:p.activity,maxDisplacement:animalMaxDisplacement.get(p.id)})),[],`${stage.key}: each animal must move during the run or finish in its resting animation`);
 const result={stage:stage.key,population:stage.population,area:stage.area,stats:s.stats,seconds:Number(((performance.now()-begin)/1000).toFixed(2)),maxWaterError,maxOffFloor,minAnimalDisplacement:Math.min(...animalMaxDisplacement.values())};return result;
}
if(!isMainThread){for(const id of workerData.stageIds){try{parentPort.postMessage(simulate(D.stages[id]));}catch(error){parentPort.postMessage({stage:D.stages[id].key,failed:true,error:error.stack});}}}
else (async()=>{
 const concurrency=Math.max(1,Math.min(6,require('node:os').availableParallelism(),Number(process.env.SIM_WORKERS)||3,stages.length)),groups=Array.from({length:concurrency},()=>[]);stages.forEach((stage,i)=>groups[i%concurrency].push(stage.id));
 await Promise.all(groups.map(stageIds=>new Promise((resolve,reject)=>{const worker=new Worker(__filename,{workerData:{stageIds}});worker.on('message',result=>{(result.failed?failures:results).push(result);console.log(JSON.stringify(result));});worker.on('error',reject);worker.on('exit',code=>code?reject(Error('Simulation worker exited '+code)):resolve());})));
 results.sort((a,b)=>a.stage.localeCompare(b.stage));assert.equal(results.length+failures.length,stages.length);
 const report=subset?'all-stages-partial-simulation.json':'all-stages-simulation.json';
 fs.writeFileSync('assets/production/review/'+report,JSON.stringify({at:new Date().toISOString(),sourceSHA,dataSHA,scope:subset?'partial':'all',stageIds:stages.map(stage=>stage.id),durationPerStage:180,workers:concurrency,passed:failures.length===0,results,failures},null,2));assert.deepEqual(failures,[],subset?'all selected stages must pass':'all 24 stages must pass');
})().catch(error=>{console.error(error);process.exitCode=1;});
