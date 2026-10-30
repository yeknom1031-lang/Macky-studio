const {chromium}=require('/Users/makibook/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const page=await browser.newPage({viewport:{width:1440,height:1100}});
 await page.goto('http://127.0.0.1:4390/');await page.waitForSelector('.card');
 await page.locator('.card img').evaluateAll(images=>images.forEach(img=>img.loading='eager'));
 await page.waitForFunction(()=>[...document.querySelectorAll('.card img')].length===46&&[...document.querySelectorAll('.card img')].every(i=>i.complete&&i.naturalWidth>0));
 await page.screenshot({path:__dirname+'/portal-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:__dirname+'/portal-mobile.png'});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const data=await (await page.request.get('http://127.0.0.1:4390/api/games')).json();
 await page.setViewportSize({width:1440,height:1200});
 await page.setContent(`<html><head><style>body{margin:0;background:#101613;color:#eef4e9;padding:20px;font:12px sans-serif}main{display:grid;grid-template-columns:repeat(6,1fr);gap:13px}.thumb{min-width:0}.thumb img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:9px}.thumb p{height:15px;overflow:hidden;margin:5px 0 0}</style></head><body><main>${data.games.map(g=>`<div class="thumb"><img src="http://127.0.0.1:4390${g.cover}"><p>${g.title}</p></div>`).join('')}</main></body></html>`);
 await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
 await page.screenshot({path:__dirname+'/thumbnails-contact.png',fullPage:true});
 console.log('46/46 image thumbnails loaded; final desktop, mobile and contact sheet saved.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
