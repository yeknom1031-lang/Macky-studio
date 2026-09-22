const CACHE='magma-escape-v5';
const FILES=['./','index.html','style.css','app.js','core.js','renderer.js','audio.js','manifest.webmanifest','assets/atlas.json',...['world','hero','platforms','lobby','items','enemy','gacha','icon'].map(n=>`assets/${n}.webp`),'assets/icon-192.png','assets/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('magma-escape-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);if(url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
  if(e.request.mode==='navigate'){e.respondWith(caches.open(CACHE).then(c=>c.match(new URL('index.html',self.registration.scope).href)).then(c=>c||fetch(e.request)));return;}
  e.respondWith(caches.open(CACHE).then(c=>c.match(e.request,{ignoreSearch:true})).then(c=>c||fetch(e.request)));
});
