// Isolated origin; no user's cache or save data is touched.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.MAGMA_PLAYWRIGHT||'playwright');
const root=new URL('../',import.meta.url),worker=await readFile(new URL('sw.js',root),'utf8');
let version='legacy';
const server=http.createServer(async(req,res)=>{try{const rel=new URL(req.url,'http://localhost').pathname;let data=await readFile(new URL('.'+(rel==='/'?'/index.html':rel),root));if(rel==='/sw.js'){const cache=version==='legacy'?'magma-escape-v5':version==='current'?'magma-escape-v2.0.1':'magma-escape-v2.0.2';data=Buffer.from(worker.replace(/const CACHE='[^']+'/,`const CACHE='${cache}'`));}const ext=rel.split('.').at(-1);res.writeHead(200,{'Content-Type':ext==='js'?'text/javascript':ext==='css'?'text/css':ext==='webp'?'image/webp':ext==='json'?'application/json':'text/html','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  const url=`http://127.0.0.1:${server.address().port}/?test=1`;await page.goto(url);await page.waitForFunction(()=>window.__magma);await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>window.__magma);
  await page.evaluate(()=>{window.__magma.save.coins=713;window.__magma.save.tutorial=true;window.__magma.persist();});
  version='current';await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});await page.waitForFunction(async()=>!(await caches.keys()).includes('magma-escape-v5'));await page.reload();await page.waitForFunction(()=>window.__magma);assert.equal(await page.evaluate(()=>window.__magma.save.coins),713);
  version='next';await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});await page.locator('.update-banner').waitFor();
  assert((await page.evaluate(()=>caches.keys())).includes('magma-escape-v2.0.1'));
  await page.getByRole('button',{name:'保存して更新'}).click();await page.waitForFunction(async()=>!(await caches.keys()).includes('magma-escape-v2.0.1'));await page.waitForFunction(()=>window.__magma);assert.equal(await page.evaluate(()=>window.__magma.save.coins),713);assert.deepEqual(errors,[]);
  console.log('PASS: legacy cache migration, explicit future update prompt, activate+reload, save preserved.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
