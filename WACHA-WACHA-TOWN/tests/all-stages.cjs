const {Worker,isMainThread,parentPort,workerData}=require('node:worker_threads');
const C=require('../src/expedition-core.js'),fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync('expedition/data.js','utf8'),sandbox);const D=JSON.parse(JSON.stringify(sandbox.window.WACHA24_DATA));
const stages=D.stages.filter(s=>s.ready),results=[];
if(process.env.RELEASE_QA){assert.equal(stages.length,24);assert.equal(D.characters.length,4396);assert.equal(D.characters.filter(c=>c.stage==='G').length,1900);assert.equal(D.characters.filter(c=>c.animal).length,96);assert.equal(D.status.missing.length,0);assert.equal(D.status.errors.length,0);assert.equal(D.roles.length,250);}
function simulate(stage){
 const begin=performance.now(),s=C.create(D,stage.id,246810+stage.id),original=s.people.map(p=>[p.x,p.y]);C.start(s);
 assert.equal(s.people.length,stage.population);assert.equal(new Set(s.people.map(p=>p.design)).size,stage.population);assert.equal(s.people.filter(p=>p.exclusive).length,100);assert.equal(s.people.filter(p=>p.photographer).length,5);
 let maxWaterError=0;
 for(let tick=0;tick<1800;tick++){
  C.step(s,.1);
  assert.ok(s.people.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=s.width&&p.y>=0&&p.y<=s.height));
  if(tick%10===0)for(const p of s.people.filter(p=>p.habitat==='water')){
   const path=s.definition.waterPoints;let error=Infinity;
   for(let k=1;k<path.length;k++){const [ax,ay]=path[k-1],[bx,by]=path[k],dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((p.x-ax)*dx+(p.y-ay)*dy)/(dx*dx+dy*dy)||0));error=Math.min(error,Math.hypot(p.x-ax-t*dx,p.y-ay-t*dy));}
   maxWaterError=Math.max(maxWaterError,error);assert.ok(error<1,'swimming animals stay in measured water');
  }
 }
 assert.equal(s.status,'lost');assert.equal(s.remaining,0);assert.ok(s.stats.maxOverlap<3,`${stage.key}: overlap ${s.stats.maxOverlap}`);assert.ok(s.stats.events>=6);assert.ok(s.stats.purchases>0);assert.ok(s.stats.conversations>0);
 const animalMotion=s.people.filter(p=>p.animal).every(p=>Math.hypot(p.x-original[p.id][0],p.y-original[p.id][1])>1||p.activity==='acting');assert.ok(animalMotion);
 const result={stage:stage.key,population:stage.population,area:stage.area,stats:s.stats,seconds:Number(((performance.now()-begin)/1000).toFixed(2)),maxWaterError};return result;
}
if(!isMainThread){for(const id of workerData.stageIds)parentPort.postMessage(simulate(D.stages[id]));}
else (async()=>{
 const concurrency=Math.max(1,Math.min(3,Number(process.env.SIM_WORKERS)||3,stages.length)),groups=Array.from({length:concurrency},()=>[]);stages.forEach((stage,i)=>groups[i%concurrency].push(stage.id));
 await Promise.all(groups.map(stageIds=>new Promise((resolve,reject)=>{const worker=new Worker(__filename,{workerData:{stageIds}});worker.on('message',result=>{results.push(result);console.log(JSON.stringify(result));});worker.on('error',reject);worker.on('exit',code=>code?reject(Error('Simulation worker exited '+code)):resolve());})));
 results.sort((a,b)=>a.stage.localeCompare(b.stage));assert.equal(results.length,stages.length);
 fs.writeFileSync('assets/production/review/all-stages-simulation.json',JSON.stringify({at:new Date().toISOString(),durationPerStage:180,workers:concurrency,results},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
