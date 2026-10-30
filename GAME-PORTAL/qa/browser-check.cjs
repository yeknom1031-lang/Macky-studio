const {chromium}=require('/Users/makibook/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4390/');await page.waitForSelector('.card');
 assert.equal(await page.locator('.card').count(),46);
 await page.locator('#search').fill('ピクロス');assert.equal(await page.locator('.card').count(),2);
 await page.locator('#search').fill('KOMOREBI');assert.equal(await page.locator('.card').count(),3);
 await page.locator('#search').fill('存在しないゲームXYZ');assert.equal(await page.locator('.card').count(),0);assert(await page.locator('#empty').isVisible());
 await page.locator('#clear').click();assert.equal(await page.locator('.card').count(),46);
 const favorite=page.locator('.favorite').first();await favorite.click();await page.locator('[data-view="favorites"]').click();assert.equal(await page.locator('.card').count(),1);
 await page.reload();await page.waitForSelector('.card');await page.locator('[data-view="favorites"]').click();assert.equal(await page.locator('.card').count(),1);
 await page.locator('.favorite').click();assert(await page.locator('#empty').isVisible());await page.locator('[data-view="all"]').click();
 await page.getByRole('button',{name:'リズム',exact:true}).click();assert.equal(await page.locator('.card').count(),5);
 await page.getByRole('button',{name:'すべて',exact:true}).click();
 await page.locator('#help').click();assert(await page.locator('dialog').isVisible());await page.keyboard.press('Escape');assert(!(await page.locator('dialog').isVisible()));
 await page.keyboard.press('/');assert.equal(await page.locator('#search').evaluate(e=>e===document.activeElement),true);await page.keyboard.press('Escape');await page.locator('#search').blur();
 await page.screenshot({path:__dirname+'/portal-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:__dirname+'/portal-mobile.png',fullPage:false});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.setViewportSize({width:1440,height:1100});
 // Confirm the UI launch event and history with the real API prepare route (no mass launching).
 await page.route('**/api/launch',route=>route.continue({url:'http://127.0.0.1:4390/api/prepare'}));
 await page.locator('[data-id="PICO-ATELIER"] .play-button').click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('macky-recent')||'{}')['PICO-ATELIER']>0);
 await page.locator('[data-view="recent"]').click();assert.equal(await page.locator('.card').count(),1);
 await page.locator('[data-view="all"]').click();await page.unroute('**/api/launch');
 const catalog=await (await page.request.get('http://127.0.0.1:4390/api/games')).json();
 const checks=[];
 for(const g of catalog.games){
  const response=await page.request.post('http://127.0.0.1:4390/api/prepare',{headers:{Origin:'http://127.0.0.1:4390','X-Portal-Token':catalog.token},data:{id:g.id}});
  const data=await response.json();assert.equal(response.status(),200,`${g.id}: ${JSON.stringify(data)}`);
  if(data.url){const entry=await page.request.get(data.url);assert.equal(entry.status(),200,`${g.id} entry`);assert((await entry.text()).includes('<html'),`${g.id} HTML`);}
  checks.push({id:g.id,kind:g.kind,url:data.url||null,available:g.available,ok:true});
 }
 assert.equal(errors.length,0,errors.join('\n'));
 // Render representative actual games and check local resource failures, without changing progress.
 const previews=[];
 for(const id of ['PICO-ATELIER','BOMB-STUDIO','KOMOREBI-SURVIVAL','SKY-VOYAGER','TOWER-TOGETHER-3D']){
  const g=catalog.games.find(x=>x.id===id),item=checks.find(x=>x.id===id);
  if(!item.url)continue;
  const gamePage=await browser.newPage({viewport:{width:1280,height:800}});const failures=[],gameErrors=[];
  gamePage.on('response',r=>{if(r.status()>=400&&r.url().startsWith(item.url))failures.push(`${r.status()} ${r.url()}`);});
  gamePage.on('pageerror',e=>gameErrors.push(e.message));
  await gamePage.goto(item.url,{waitUntil:'domcontentloaded'});await gamePage.waitForTimeout(2000);
  await gamePage.screenshot({path:__dirname+'/'+id+'.png'});
  previews.push({id,failures,gameErrors});await gamePage.close();
 }
 fs.writeFileSync(__dirname+'/verification.json',JSON.stringify({ui:'passed',desktop:1440,mobile:390,errors,checks,previews},null,2));
 console.log(JSON.stringify({games:checks.length,ui:'passed',previews},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
