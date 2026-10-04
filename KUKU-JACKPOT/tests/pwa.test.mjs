import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { webcrypto, createHash } from 'node:crypto';
import { buildFestival, MAX_ASSET_BYTES, publicAudioManifest } from '../scripts/build_festival.mjs';

const swSource = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
const digest = body => createHash('sha256').update(body).digest('hex');
const normal = input => new URL(typeof input === 'string' ? input : input.url, 'https://game.test').pathname;

test('the public audio catalogue keeps every playable voice and orchestra stem while omitting the source-only phoneme evidence',async()=>{
  const source=await readFile(new URL('../assets/audio/festival/manifest.json',import.meta.url),'utf8');
  const original=JSON.parse(source),runtime=JSON.parse(publicAudioManifest(source));
  assert.deepEqual(Object.keys(runtime.clips),Object.keys(original.clips));
  for(const [key,clip] of Object.entries(original.clips)){
    assert.equal(runtime.clips[key].file,clip.file);assert.equal(runtime.clips[key].seconds,clip.seconds);
    assert.equal(runtime.clips[key].text,clip.text);assert.equal(runtime.clips[key].pronunciation,undefined);
  }
  assert.deepEqual(runtime.orchestra,original.orchestra);assert.deepEqual(runtime.cheers,original.cheers);
  assert.ok(Buffer.byteLength(publicAudioManifest(source))<Buffer.byteLength(source)/4);
});

function serviceWorker({ files, version = 'test-v1', shell = ['/index.html'], cacheStore = new Map(), redirectedURLs = [] }) {
  const messages = [], calls = [], listeners = new Map();
  let offline = false, skipCount = 0, claimCount = 0;
  const assets = Object.entries(files).map(([url, body]) => ({ url, bytes: Buffer.byteLength(body), hash: digest(body) }));
  const manifest = { version, shell, assets, totalBytes: assets.reduce((sum, asset) => sum + asset.bytes, 0) };
  const server = new Map(Object.entries(files));
  server.set('/assets-manifest.json', JSON.stringify(manifest));
  const caches = {
    async open(name) {
      if (!cacheStore.has(name)) cacheStore.set(name, new Map());
      const entries = cacheStore.get(name);
      return {
        async match(key) { return entries.get(normal(key))?.clone(); },
        async put(key, response) { entries.set(normal(key), response.clone()); },
      };
    },
    async keys() { return [...cacheStore.keys()]; },
    async delete(key) { return cacheStore.delete(key); },
  };
  const client = { postMessage: message => messages.push(message) };
  const self = {
    location: { origin: 'https://game.test' },
    addEventListener: (type, handler) => listeners.set(type, handler),
    clients: { async matchAll() { return [client]; }, async claim() { claimCount++; } },
    async skipWaiting() { skipCount++; },
  };
  function followedRedirect(response) {
    Object.defineProperty(response, 'redirected', { value: true });
    const clone = response.clone.bind(response);
    response.clone = () => followedRedirect(clone());
    return response;
  }
  const context = vm.createContext({ self, caches, crypto: webcrypto, Response, Request, Headers, URL, console, fetch: async input => {
    const key = normal(input); calls.push(key);
    if (offline) throw new TypeError('offline');
    const response = server.has(key) ? new Response(server.get(key), { headers: { 'Content-Type': key.endsWith('.wav') ? 'audio/wav' : 'text/html', ...(redirectedURLs.includes(key) ? {'Content-Encoding':'br','Content-Length':'999'} : {}) } }) : new Response('missing', { status: 404 });
    return redirectedURLs.includes(key) ? followedRedirect(response) : response;
  } });
  vm.runInContext(swSource.replaceAll('__KUKU_BUILD_ID__', version), context);
  async function dispatch(type, props = {}) {
    const pending = [];
    let response;
    listeners.get(type)({ source: client, ...props, waitUntil: value => pending.push(value), respondWith: value => { response = value; } });
    const result = response && await response;
    await Promise.all(pending);
    return result;
  }
  return { dispatch, messages, calls, server, cacheStore, manifest, setOffline: value => { offline = value; }, get skipCount() { return skipCount; }, get claimCount() { return claimCount; } };
}

test('a new service worker preserves a running version until explicit activation', async () => {
  const store = new Map([['kuku-beat-festival-previous', new Map()], ['unrelated-cache', new Map()]]);
  const worker = serviceWorker({ files: { '/index.html': '<h1>九九</h1>' }, cacheStore: store });
  await worker.dispatch('install');
  assert.equal(worker.skipCount, 0);
  assert.ok(store.has('kuku-beat-festival-previous'));
  await worker.dispatch('message', { data: { type: 'ACTIVATE_UPDATE' } });
  assert.equal(worker.skipCount, 1);
  await worker.dispatch('activate');
  assert.equal(worker.claimCount, 1);
  assert.ok(!store.has('kuku-beat-festival-previous'));
  assert.ok(store.has('unrelated-cache'));
});

test('full offline save reports real counts, serves all assets offline, and supports Safari media ranges', async () => {
  const worker = serviceWorker({ files: { '/index.html': '<h1>九九</h1>', '/src/app.js': 'let game = true;', '/assets/voice.wav': '0123456789', '/assets/stage.webp': 'picture' }, shell: ['/index.html', '/src/app.js'] });
  await worker.dispatch('install');
  await worker.dispatch('message', { data: { type: 'GET_CACHE_STATUS' } });
  assert.equal(worker.messages.at(-1).completed, 2);
  assert.equal(worker.messages.at(-1).complete, false);
  await worker.dispatch('message', { data: { type: 'CACHE_ALL' } });
  assert.equal(worker.messages.at(-1).type, 'CACHE_COMPLETE');
  assert.equal(worker.messages.at(-1).completed, 4);
  assert.equal(worker.messages.at(-1).bytes, worker.manifest.totalBytes);
  worker.setOffline(true);
  assert.equal(await (await worker.dispatch('fetch', { request: new Request('https://game.test/?source=pwa') })).text(), '<h1>九九</h1>');
  assert.equal(await (await worker.dispatch('fetch', { request: new Request('https://game.test/assets/stage.webp') })).text(), 'picture');
  const partial = await worker.dispatch('fetch', { request: new Request('https://game.test/assets/voice.wav', { headers: { range: 'bytes=2-5' } }) });
  assert.equal(partial.status, 206);
  assert.equal(partial.headers.get('Content-Range'), 'bytes 2-5/10');
  assert.equal(await partial.text(), '2345');
  const invalid = await worker.dispatch('fetch', { request: new Request('https://game.test/assets/voice.wav', { headers: { range: 'bytes=999-' } }) });
  assert.equal(invalid.status, 416);
});

test('interrupted downloads can resume, but mixed deployment assets never report complete', async () => {
  const worker = serviceWorker({ files: { '/index.html': 'shell', '/assets/voice.wav': 'original' } });
  await worker.dispatch('install');
  worker.server.set('/assets/voice.wav', 'changed');
  await worker.dispatch('message', { data: { type: 'CACHE_ALL' } });
  assert.equal(worker.messages.at(-1).type, 'CACHE_ERROR');
  assert.ok(!worker.messages.some(message => message.type === 'CACHE_COMPLETE'));
  worker.server.set('/assets/voice.wav', 'original');
  await worker.dispatch('message', { data: { type: 'CACHE_ALL' } });
  assert.equal(worker.messages.at(-1).type, 'CACHE_COMPLETE');
});

test('normal play caches a fetched asset without downloading it twice', async () => {
  const worker = serviceWorker({ files: { '/index.html': 'shell', '/assets/voice.wav': 'sound' } });
  await worker.dispatch('install');
  const response = await worker.dispatch('fetch', { request: new Request('https://game.test/assets/voice.wav') });
  assert.equal(await response.text(), 'sound');
  assert.equal(worker.calls.filter(call => call === '/assets/voice.wav').length, 1);
  worker.setOffline(true);
  assert.equal(await (await worker.dispatch('fetch', { request: new Request('https://game.test/assets/voice.wav') })).text(), 'sound');
});

test('offline navigation recognizes Cloudflare canonical HTML URLs', async () => {
  const worker = serviceWorker({ files: { '/index.html': 'home', '/designs/index.html': 'gallery', '/designs/release-plan.html': 'plan' } });
  await worker.dispatch('install');
  await worker.dispatch('message', { data: { type: 'CACHE_ALL' } });
  worker.setOffline(true);
  assert.equal(await (await worker.dispatch('fetch', { request: new Request('https://game.test/designs/') })).text(), 'gallery');
  assert.equal(await (await worker.dispatch('fetch', { request: new Request('https://game.test/designs/release-plan') })).text(), 'plan');
});

test('release builder excludes raw material, generates a reproducible version, and keeps gallery previews working', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'kuku-pwa-'));
  try {
    for (const [file, body] of Object.entries({
      'index.html': '<script type="module" src="/src/festival-app.js"></script>',
      'src/festival-app.js': 'export const game = 21;',
      'manifest.webmanifest': '{}', '_headers': '/*\n  X-Content-Type-Options: nosniff', 'sw.js': swSource,
      'assets/runtime/icon-192.png': 'icon', 'assets/audio/festival/voice.wav': 'audio',
      'assets/runtime/rich/manifest.json': '{"clips":[{"file":"adopted.webp"}]}',
      'assets/runtime/rich/adopted.webp': 'reviewed art', 'assets/runtime/rich/rejected.webp': 'bad pose',
      'assets/art/original.png': 'large raw art', '.tools/private.txt': 'private', 'tests/secret.txt': 'private',
      'designs/20-minigames/index.html': '<img src="images/21-forest.png"><a href="21-minigames-designs.zip" download>全22枚を保存</a>',
      'designs/20-minigames/images/21-forest.webp': 'webp', 'designs/20-minigames/images/21-forest.png': 'raw',
    })) {
      await mkdir(path.dirname(path.join(root, file)), { recursive: true });
      await writeFile(path.join(root, file), body);
    }
    const first = await buildFestival({ root, requireRuntime: false });
    assert.ok(first.assets.every(asset => !asset.url.includes('/.tools/') && !asset.url.includes('/tests/') && !asset.url.includes('/assets/art/')));
    assert.ok(!first.assets.some(asset => asset.url.endsWith('/21-forest.png')));
    assert.ok(first.assets.some(asset => asset.url.endsWith('/rich/adopted.webp')));
    assert.ok(!first.assets.some(asset => asset.url.endsWith('/rich/rejected.webp')));
    const gallery = await readFile(path.join(root, 'dist/designs/20-minigames/index.html'), 'utf8');
    assert.ok(gallery.includes('images/21-forest.webp'));
    assert.ok(!gallery.includes('.zip'));
    assert.ok((await readFile(path.join(root, 'dist/sw.js'), 'utf8')).includes(first.version));
    assert.equal((await buildFestival({ root, requireRuntime: false })).version, first.version);
    await writeFile(path.join(root, 'src/festival-app.js'), 'export const game = 22;');
    assert.notEqual((await buildFestival({ root, requireRuntime: false })).version, first.version);
    assert.ok((await readdir(path.join(root, 'dist'))).includes('assets-manifest.json'));
    await writeFile(path.join(root, 'assets/runtime/too-large.wav'), Buffer.alloc(MAX_ASSET_BYTES + 1));
    await assert.rejects(buildFestival({ root, requireRuntime: false }), /25 MiB/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('release PWA requests standalone landscape and uses same-origin icons', async () => {
  const manifest = JSON.parse(await readFile(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.orientation, 'landscape');
  assert.equal(manifest.scope, '/');
  assert.deepEqual(manifest.icons.map(icon => icon.sizes), ['192x192', '512x512']);
});

test('canonical redirects are saved as fresh responses that Safari can navigate to', async () => {
  const worker = serviceWorker({files:{'/index.html':'<h1>九九</h1>','/designs/release-plan.html':'plan'},redirectedURLs:['/index.html','/designs/release-plan.html']});
  await worker.dispatch('install');await worker.dispatch('message',{data:{type:'CACHE_ALL'}});
  const cache=worker.cacheStore.get('kuku-beat-festival-test-v1');
  for(const key of ['/index.html','/designs/release-plan.html']){
    const response=cache.get(key);assert.equal(response.redirected,false);assert.equal(response.headers.get('content-encoding'),null);assert.equal(response.headers.get('content-length'),null);
  }
  worker.setOffline(true);
  for(const pathname of ['/','/','/designs/release-plan','/index.html']){
    const response=await worker.dispatch('fetch',{request:{url:'https://game.test'+pathname,method:'GET',mode:'navigate',redirect:'manual',headers:new Headers()}});
    assert.equal(response.redirected,false);assert.equal(response.status,200);assert.ok((await response.text()).length>0);
  }
});
test('a previously cached redirected page is also safe on both cache and offline fallback paths', async () => {
  const response=new Response('old cached body',{headers:{'Content-Type':'text/html'}});
  function mark(r){Object.defineProperty(r,'redirected',{value:true});const clone=r.clone.bind(r);r.clone=()=>mark(clone());return r;}
  const store=new Map([['kuku-beat-festival-test-v1',new Map([['/index.html',mark(response)]])]]);
  const worker=serviceWorker({files:{'/index.html':'old cached body'},cacheStore:store});worker.setOffline(true);
  for(const pathname of ['/','/missing-route']){
    const result=await worker.dispatch('fetch',{request:{url:'https://game.test'+pathname,method:'GET',mode:'navigate',redirect:'manual',headers:new Headers()}});
    assert.equal(result.redirected,false);assert.equal(await result.text(),'old cached body');
  }
});
