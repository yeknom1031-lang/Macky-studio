const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const previous=JSON.parse(fs.readFileSync('assets/production/review/stages-browser-report.json','utf8')),ids=[...new Set([...previous.results.filter(s=>s.frameP95Ms>25).map(s=>s.id),23])],browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--allow-file-access-from-files']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('file://'+path.resolve('expedition/index.html'));
  for(const id of ids){await page.evaluate(id=>Wacha24Debug.prepare(id),id);await page.waitForSelector('[data-action=begin]',{timeout:120000});await page.locator('[data-action=begin]').click();await page.waitForFunction(()=>Wacha24Debug.state.status==='playing');
   const result=await page.evaluate(async()=>{const {state:s,world:w}=Wacha24Debug;WachaExpedition.step(s,30);const frames=[];await new Promise(resolve=>{let last=performance.now(),n=0;function frame(t){if(n++>10)frames.push(t-last);last=t;if(n<190)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});frames.sort((a,b)=>a-b);Wacha24Debug.pause();return{id:s.stage,name:s.definition.name,population:s.people.length,visible:w.visibleCount,medianMs:frames[Math.floor(frames.length/2)],p95Ms:frames[Math.floor(frames.length*.95)],maxOverlap:s.stats.maxOverlap,elapsed:s.elapsed};});assert.ok(result.maxOverlap<3);assert.ok(result.medianMs<34,'normal play should sustain at least 30 frames per second');results.push(result);console.log(JSON.stringify(result));await page.locator('[data-action=leave]').click();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync('assets/production/review/performance-isolated-report.json',JSON.stringify({at:new Date().toISOString(),method:'headless Chrome at 1440 × 900, no concurrent simulation workers, 30-second warmup, 179-frame sample',results,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
