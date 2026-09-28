const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),url=pathToFileURL(path.join(root,'index.html')).href;
const out=path.join(root,'test-results');let browser;
async function ready(page){await page.goto(url,{timeout:60000});await page.waitForFunction(()=>window.WachaGame?.snapshot().ready,undefined,{timeout:60000});}
(async()=>{
 browser=await chromium.launch({channel:'chrome',headless:true});
 const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});const p=await mobile.newPage();await ready(p);
 const layout=await p.evaluate(()=>{const q=s=>{const r=document.querySelector(s).getBoundingClientRect();return{top:r.top,bottom:r.bottom,left:r.left,right:r.right};};return{title:q('h1'),lead:q('.hero-lead'),copy:q('.hero-copy'),stats:q('.hero-stats'),button:q('.hero-cta'),paper:q('.hero-paper'),width:innerWidth,scroll:document.documentElement.scrollWidth};});
 assert.ok(layout.title.bottom<layout.lead.top);assert.ok(layout.lead.bottom<=layout.copy.top);assert.ok(layout.copy.bottom<layout.stats.top);assert.ok(layout.stats.bottom<layout.button.top);assert.ok(layout.button.bottom<layout.paper.bottom);assert.ok(layout.scroll<=layout.width);
 await p.screenshot({path:path.join(out,'11-mobile-home.png'),fullPage:true});await p.getByRole('button',{name:'さがしにいこう ↗',exact:true}).tap();await p.getByRole('button',{name:'準備OK、さがそう！',exact:true}).tap();
 const s=await p.evaluate(()=>WachaGame.snapshot());assert.equal(s.count,600);assert.ok(s.zoom>2);assert.ok(s.view.scale*941>=s.view.height-1);await p.screenshot({path:path.join(out,'12-mobile-game.png'),fullPage:true});await p.getByRole('button',{name:'全体表示に戻す'}).tap();assert.equal((await p.evaluate(()=>WachaGame.snapshot())).zoom,1);await mobile.close();
 const desktop=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});const d=await desktop.newPage();await ready(d);await d.getByRole('button',{name:'さがしにいこう ↗',exact:true}).click();await d.getByRole('button',{name:'準備OK、さがそう！',exact:true}).click();
 const perf=await d.evaluate(()=>new Promise(resolve=>{let frames=0,start,last,drawStart=WachaGame.snapshot().drawFrames;const intervals=[];function sample(t){if(!start)start=t;if(last)intervals.push(t-last);last=t;if(++frames>=120){intervals.sort((a,b)=>a-b);resolve({frames,fps:(frames-1)*1000/(t-start),drawFps:(WachaGame.snapshot().drawFrames-drawStart)*1000/(t-start),p95FrameMs:intervals[Math.floor(intervals.length*.95)],count:WachaGame.snapshot().count,rendered:WachaGame.snapshot().rendered});}else requestAnimationFrame(sample);}requestAnimationFrame(sample);}));
 fs.writeFileSync(path.join(out,'performance-raw.json'),JSON.stringify(perf,null,2));assert.equal(perf.count,600);assert.equal(perf.rendered,600);assert.ok(perf.drawFps>=25,'600-person crowd should sustain at least 25 drawn frames per second in local headless Chrome');
 fs.writeFileSync(path.join(out,'mobile-performance-report.json'),JSON.stringify({mobile:'passed; no overlapping text; map fills portrait viewport; fit works',layout,performance:perf},null,2));console.log(JSON.stringify(perf));await browser.close();
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exit(1);});
