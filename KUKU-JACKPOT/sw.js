/* Build replaces this marker with a hash of the exact deployed asset set. */
const VERSION = '__KUKU_BUILD_ID__';
const CACHE_PREFIX = 'kuku-beat-festival-';
const CACHE_NAME = CACHE_PREFIX + VERSION;
const MANIFEST_URL = '/assets-manifest.json';
let manifestPromise;
let fullSave;

async function manifest() {
  if (!manifestPromise) manifestPromise = (async () => {
    const cache = await caches.open(CACHE_NAME);
    let response = await cache.match(MANIFEST_URL);
    if (!response) {
      response = await fetch(MANIFEST_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error('素材一覧を読み込めませんでした。');
      const content = await response.clone().json();
      if (content.version !== VERSION) throw new Error('更新中です。少し待って、もう一度お試しください。');
      await cache.put(MANIFEST_URL, response.clone());
    }
    return response.json();
  })().catch(error => { manifestPromise = undefined; throw error; });
  return manifestPromise;
}

async function saveResponse(cache, asset, response) {
  if (!response.ok || response.status === 206) throw new Error(`素材を保存できませんでした: ${asset.url}`);
  // A deployment may happen during a long download. Never label mixed versions complete.
  const body = await response.clone().arrayBuffer();
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', body))].map(b => b.toString(16).padStart(2, '0')).join('');
  if (hash !== asset.hash) throw new Error('新しいバージョンが公開されました。ゲームを閉じて開き直してから保存してください。');
  await cache.put(asset.url, response);
}

async function saveAsset(cache, asset) {
  if (await cache.match(asset.url)) return;
  await saveResponse(cache, asset, await fetch(asset.url, { cache: 'reload' }));
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const data = await manifest();
    const cache = await caches.open(CACHE_NAME);
    for (const url of data.shell) await saveAsset(cache, data.assets.find(asset => asset.url === url));
    // Waiting updates leave an ongoing game and its original cache untouched.
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME) await caches.delete(name);
    await self.clients.claim();
  })());
});

async function status() {
  const data = await manifest();
  const cache = await caches.open(CACHE_NAME);
  let completed = 0, bytes = 0;
  for (const asset of data.assets) if (await cache.match(asset.url)) { completed++; bytes += asset.bytes; }
  return { completed, total: data.assets.length, bytes, totalBytes: data.totalBytes, complete: completed === data.assets.length, version: VERSION };
}

async function broadcast(message) {
  for (const client of await self.clients.matchAll({ type: 'window', includeUncontrolled: true })) client.postMessage(message);
}

async function saveEverything() {
  const data = await manifest();
  const cache = await caches.open(CACHE_NAME);
  const pending = [];
  for (const asset of data.assets) if (!await cache.match(asset.url)) pending.push(asset);
  // Ordinary game loading can fill the cache at the same time. Derive both
  // counters from the same pending set instead of two racing cache snapshots.
  let completed = data.assets.length - pending.length;
  let bytes = data.totalBytes - pending.reduce((sum, asset) => sum + asset.bytes, 0);
  const progress = () => ({ completed, total: data.assets.length, bytes, totalBytes: data.totalBytes, version: VERSION });
  await broadcast({ type: 'CACHE_PROGRESS', ...progress() });
  let next = 0, failure;
  await Promise.all(Array.from({ length: Math.min(3, pending.length) }, async () => {
    while (next < pending.length && !failure) {
      const asset = pending[next++];
      try { await saveAsset(cache, asset); } catch (error) { failure = error; break; }
      completed++; bytes += asset.bytes;
      await broadcast({ type: 'CACHE_PROGRESS', ...progress() });
    }
  }));
  if (failure) throw failure;
  const final = await status();
  if (!final.complete) throw new Error('保存した素材を確認できませんでした。端末の空き容量を確認して、もう一度お試しください。');
  await broadcast({ type: 'CACHE_COMPLETE', ...final });
}

self.addEventListener('message', event => {
  const type = event.data?.type;
  if (type === 'ACTIVATE_UPDATE') {
    // The page only sends this after the player explicitly chooses to update from a menu.
    event.waitUntil(self.skipWaiting());
  } else if (type === 'GET_CACHE_STATUS') {
    event.waitUntil(status().then(value => event.source?.postMessage({ type: 'CACHE_STATUS', ...value })).catch(error => event.source?.postMessage({ type: 'CACHE_ERROR', message: error.message, version: VERSION })));
  } else if (type === 'CACHE_ALL') {
    if (!fullSave) fullSave = saveEverything().catch(error => broadcast({ type: 'CACHE_ERROR', message: error.name === 'QuotaExceededError' ? '端末の空き容量が足りません。容量を空けて、もう一度保存してください。' : error.message, version: VERSION })).finally(() => { fullSave = undefined; });
    event.waitUntil(fullSave);
  }
});

async function rangeResponse(response, range) {
  const bytes = await response.arrayBuffer();
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${bytes.byteLength}` } });
  const start = match[1] ? Number(match[1]) : Math.max(0, bytes.byteLength - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), bytes.byteLength - 1) : bytes.byteLength - 1;
  if (start > end || start >= bytes.byteLength) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${bytes.byteLength}` } });
  const headers = new Headers(response.headers);
  headers.delete('Content-Encoding');
  headers.delete('Transfer-Encoding');
  headers.set('Content-Range', `bytes ${start}-${end}/${bytes.byteLength}`);
  headers.set('Content-Length', String(end - start + 1));
  headers.set('Accept-Ranges', 'bytes');
  return new Response(bytes.slice(start, end + 1), { status: 206, headers });
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname === '/sw.js') return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    let key = url.pathname === '/' ? '/index.html' : url.pathname;
    let cached = await cache.match(key);
    // Cloudflare canonicalizes page.html to /page and folder/index.html to /folder/.
    if (!cached && !/\.[^/]+$/.test(key)) {
      for (const alias of key.endsWith('/') ? [`${key}index.html`] : [`${key}.html`, `${key}/index.html`]) {
        cached = await cache.match(alias);
        if (cached) { key = alias; break; }
      }
    }
    if (cached) return request.headers.has('range') ? rangeResponse(cached, request.headers.get('range')) : cached;
    try {
      const response = await fetch(request);
      if (response.ok && response.status !== 206) {
        const data = await manifest();
        const asset = data.assets.find(asset => asset.url === key || asset.url === `${key}.html` || asset.url === `${key.endsWith('/') ? key : key + '/'}index.html`);
        if (asset) {
          // Opportunistic game loads may be saved without blocking this response.
          event.waitUntil(saveResponse(cache, asset, response.clone()).catch(() => {}));
        }
      }
      return response;
    } catch (error) {
      if (request.mode === 'navigate') {
        const fallback = await cache.match('/index.html');
        if (fallback) return fallback;
      }
      throw error;
    }
  })());
});
