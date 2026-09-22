const CACHE='magma-escape-v2.1.0-r2';
const FILES=['./','index.html','style.css','gacha.css','app.js','gacha-scene.js','core.js','renderer.js','audio.js','manifest.webmanifest','assets/atlas.json',...['world','world-mid','world-sky','hero','platforms','lobby','items','enemy','gacha','icon','capsule','aura-ember','aura-mint','aura-violet','aura-ice','aura-phoenix'].map(n=>`assets/${n}.webp`),'assets/icon-192.png','assets/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>caches.keys()).then(keys=>{
  // The original release had no update UI. Migrate its worker once, without reloading an active run.
  if(keys.some(k=>/^magma-escape-v[1-5]$/.test(k)))return self.skipWaiting();
})));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('magma-escape-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);if(url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
  if(e.request.mode==='navigate'){e.respondWith(caches.open(CACHE).then(c=>c.match(new URL('index.html',self.registration.scope).href)).then(c=>c||fetch(e.request)));return;}
  e.respondWith(caches.open(CACHE).then(c=>c.match(e.request,{ignoreSearch:true})).then(c=>c||fetch(e.request)));
});
