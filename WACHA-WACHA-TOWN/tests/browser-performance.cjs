const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const codeHashes=()=>Object.fromEntries(['expedition-core.js','expedition-app.js','expedition-render.js','expedition-input.js','expedition-audio.js','data.js'].map(name=>[name,crypto.createHash('sha256').update(fs.readFileSync(path.join('expedition',name))).digest('hex')]));
// IDs are zero-based. Partial measurements never replace the full release report.
const selected=process.env.QA_STAGE===undefined?null:process.env.QA_STAGE.split(',').map(value=>{
 assert.match(value.trim(),/^\d+$/,'QA_STAGE must be comma-separated numeric stage IDs');return Number(value);
});
if(selected){assert.equal(new Set(selected).size,selected.length,'QA_STAGE must not repeat a stage ID');assert.ok(selected.every(id=>id>=0&&id<24),'QA_STAGE IDs must be between 0 and 23');}
const fixedSeed=process.env.QA_SEED===undefined?null:Number(process.env.QA_SEED);
if(fixedSeed!==null)assert.ok(Number.isInteger(fixedSeed)&&fixedSeed>=0&&fixedSeed<=0xffffffff,'QA_SEED must be an unsigned 32-bit integer');

(async()=>{
 const testedHashes=codeHashes(),errors=[],results=[];
 const previous=JSON.parse(fs.readFileSync('assets/production/review/stages-browser-report.json','utf8'));
 const ids=selected||[...new Set([...previous.results.filter(s=>s.frameP95Ms>25).map(s=>s.id),23])];
 // Preserve the first/final Retina checks, restricted to selected stages for a partial run.
 const cases=[...ids.map(id=>({id,dpr:1})),...[0,23].filter(id=>!selected||selected.includes(id)).map(id=>({id,dpr:2}))];
 const reportPath=`assets/production/review/performance-isolated-${selected?'partial-':''}report.json`;
 let browser,page,ratio,currentCase=null;
 function save(status,failure=null){
  const currentHashes=codeHashes(),unchanged=JSON.stringify(currentHashes)===JSON.stringify(testedHashes);
  fs.writeFileSync(reportPath,JSON.stringify({at:new Date().toISOString(),passed:status==='passed',status,
   method:'headless Chrome at 1440 × 900, no concurrent simulation workers, 30-second warmup, 179-frame sample; first/final stages additionally checked at Retina 2× when included',
   scope:selected?'partial':'all',stageIds:ids,cases,currentCase,codeHashes:testedHashes,currentCodeHashes:currentHashes,unchanged,results,errors,
   ...(failure?{failure:{name:failure.name,message:failure.message,stack:failure.stack}}:{})},null,2));
 }
 try{
  save('running');
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--allow-file-access-from-files']});
  for(const {id,dpr} of cases){
   const seed=fixedSeed??(Date.now()>>>0);currentCase={id,dpr,seed,phase:'loading'};save('running');
   if(dpr!==ratio){
    await page?.close();page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:dpr});ratio=dpr;
    page.on('pageerror',e=>errors.push(e.message));await page.goto('file://'+path.resolve('expedition/index.html'));
   }
   await page.evaluate(async({id,seed})=>{
    const create=WachaExpedition.create;WachaExpedition.create=(data,index,_seed,mode)=>create(data,index,seed,mode);
    try{await Wacha24Debug.prepare(id);}finally{WachaExpedition.create=create;}
   },{id,seed});
   await page.waitForSelector('[data-action=begin]',{timeout:120000});
   currentCase.phase='countdown';save('running');
   await page.locator('[data-action=begin]').click();await page.waitForFunction(()=>Wacha24Debug.state.status==='playing');
   currentCase.phase='sampling';save('running');
   const result=await page.evaluate(async()=>{
    const {state:s,world:w}=Wacha24Debug;WachaExpedition.step(s,30);const frames=[];
    await new Promise(resolve=>{let last=performance.now(),n=0;function frame(t){if(n++>10)frames.push(t-last);last=t;if(n<190)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
    frames.sort((a,b)=>a-b);Wacha24Debug.pause();
    return{id:s.stage,seed:s.seed,devicePixelRatio,name:s.definition.name,population:s.people.length,visible:w.visibleCount,medianMs:frames[Math.floor(frames.length/2)],p95Ms:frames[Math.floor(frames.length*.95)],maxOverlap:s.stats.maxOverlap,elapsed:s.elapsed};
   });
   results.push(result);currentCase.phase='validation';save('running');console.log(JSON.stringify(result));
   assert.ok(result.maxOverlap<3,`stage ${id} seed ${result.seed}: maxOverlap=${result.maxOverlap}`);
   assert.ok(result.medianMs<34,`stage ${id} seed ${result.seed}: medianMs=${result.medianMs}; normal play should sustain at least 30 frames per second`);
   await page.locator('#dialog-body [data-action=leave]').click();
  }
  assert.deepEqual(errors,[]);assert.deepEqual(codeHashes(),testedHashes,'Code and data must stay unchanged throughout the performance check');
  currentCase=null;save('passed');
 }catch(error){save('failed',error);throw error;}finally{await browser?.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
