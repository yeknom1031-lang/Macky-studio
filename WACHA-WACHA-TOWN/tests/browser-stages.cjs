const { chromium } = require('playwright');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
(async () => {
 const browser = await chromium.launch({headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--allow-file-access-from-files']});
 const results=[],errors=[];
 try {
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+path.resolve('expedition/index.html'));
  const stages=await page.evaluate(()=>WACHA24_DATA.stages.filter(s=>s.ready).map(s=>({id:s.id,name:s.name,count:s.population})));
  if(process.env.RELEASE_QA)assert.equal(stages.length,24);
  for(const stage of stages){
   const began=Date.now();await page.evaluate(id=>Wacha24Debug.prepare(id),stage.id);
   await page.waitForSelector('[data-action=begin]',{timeout:120000});
   await page.locator('[data-action=begin]').click();
   await page.waitForFunction(()=>Wacha24Debug.state.status==='playing');
   const loadMs=Date.now()-began;
   const metrics=await page.evaluate(async()=>{
    const {state:s,world:w}=Wacha24Debug;WachaExpedition.step(s,30);const frames=[];
    await new Promise(resolve=>{let last=performance.now(),n=0;function frame(t){if(n++>5)frames.push(t-last);last=t;if(n<100)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
    frames.sort((a,b)=>a-b);Wacha24Debug.pause();
    return {count:s.people.length,unique:new Set(s.people.map(p=>p.design)).size,photographers:s.people.filter(p=>p.photographer).length,visible:w.visibleCount,frameMedianMs:frames[Math.floor(frames.length/2)],frameP95Ms:frames[Math.floor(frames.length*.95)],simulationElapsed:s.elapsed,maxOverlap:s.stats.maxOverlap,finite:s.people.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)),activities:[...new Set(s.people.map(p=>p.activity))]};
   });
   assert.equal(metrics.count,stage.count);assert.equal(metrics.unique,stage.count);assert.equal(metrics.photographers,5);assert.ok(metrics.finite);assert.ok(metrics.maxOverlap<3);
   await page.evaluate(()=>document.querySelector('#dialog').close());
   await page.screenshot({path:`assets/production/review/stage-${String(stage.id+1).padStart(2,'0')}.png`});
   if(stage.id>=7){
    await page.evaluate(()=>{const {state:s,world:w}=Wacha24Debug;w.cx=s.width-1;w.cy=s.height-1;w.zoomAt(1.5);w.clamp();w.draw(s);});
    await page.screenshot({path:`assets/production/review/stage-${String(stage.id+1).padStart(2,'0')}-corner.png`});
   }
   results.push({...stage,loadMs,...metrics});console.log(JSON.stringify(results.at(-1)));
   await page.evaluate(()=>document.querySelector('[data-action=leave]')?.click());
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync('assets/production/review/stages-browser-report.json',JSON.stringify({at:new Date().toISOString(),viewport:'1440 × 900',renderer:'headless Chrome',results,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
