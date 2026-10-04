import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const base=process.env.KUKU_PUBLIC_URL||'https://kuku-beat-festival.yeknom1031.workers.dev';
const local=JSON.parse(await readFile('dist/assets-manifest.json','utf8'));
const remote=await(await fetch(`${base}/assets-manifest.json`,{cache:'no-store'})).json();
assert.equal(remote.version,local.version);
let cursor=0,verified=0;
await Promise.all(Array.from({length:8},async()=>{while(cursor<remote.assets.length){const a=remote.assets[cursor++],res=await fetch(base+a.url);assert.equal(res.status,200,a.url);const body=Buffer.from(await res.arrayBuffer());assert.equal(body.length,a.bytes,a.url);assert.equal(createHash('sha256').update(body).digest('hex'),a.hash,a.url);verified++;}}));
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,serviceWorkers:'block'}),page=await context.newPage(),errors=[],games=[];
page.on('pageerror',e=>errors.push(e.message));
await mkdir('qa/festival',{recursive:true});
try{
 await page.goto(base,{waitUntil:'networkidle'});
 assert.equal(await page.locator('.game-card').count(),21);assert.equal(await page.locator('#table').inputValue(),'0');assert.equal(await page.locator('#action-btn').count(),0);assert.equal(await page.evaluate(()=>typeof window.__festival),'undefined');
 for(const id of [1,21]){
  await page.locator(`.game-card[data-game="${id}"]`).click();await page.locator('#start-single').click();await page.waitForSelector('#intro-start:visible');await page.locator('#intro-start').click();
  const formula=(await page.locator('#equation').getAttribute('aria-label')).match(/\d+/g).map(Number);
  const answer=id===21?Number(formula[0]*formula[1]===formula[2]):formula[0]*formula[1];
  const rect=await page.locator(`#answers [data-value="${answer}"]`).boundingBox();await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);
  const count=await page.locator('.rhythm-note:not(.demo)').count();
  for(let i=0;i<count;i++){
   await page.waitForFunction(index=>{
    const note=document.querySelectorAll('.rhythm-note:not(.demo)')[index],line=document.querySelector('.rhythm-hit-line');if(!note||note.hidden)return false;
    const a=note.getBoundingClientRect(),b=line.getBoundingClientRect(),distance=a.x+a.width/2-b.x-b.width/2;
    return distance<=7&&distance>=-25;
   },i,{polling:'raf',timeout:15000});
   await page.mouse.down();await page.mouse.up();
  }
  await page.waitForSelector('#feedback:visible');const feedback=await page.locator('#feedback').textContent();assert.match(feedback,/せいかい|みやぶった/);const combo=await page.locator('#combo-live').textContent();assert.equal(combo,`${count} COMBO`);games.push({id,feedback,combo});
  await page.screenshot({path:`qa/festival/public-${id}.png`});await page.locator('#pause-btn').click();await page.locator('#quit-btn').click();
 }
 assert.deepEqual(errors,[]);const report={passed:true,base,version:remote.version,assetsVerified:verified,games,errors};await writeFile('qa/festival/public.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
