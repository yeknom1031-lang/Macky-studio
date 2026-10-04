import { readFile, writeFile, mkdir, readdir, stat, rm, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

export const MAX_ASSET_BYTES = 25 * 1024 * 1024;
export const MAX_ASSET_COUNT = 20000;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const allowedRuntime = /\.(?:js|css|json|png|webp|jpg|jpeg|svg|mp3|wav|ogg|m4a|woff2|txt)$/i;
const allowedAudio = /\.(?:json|mp3|wav|ogg|m4a|txt)$/i;

async function exists(file) {
  try { await stat(file); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

async function walk(dir, accept = () => true) {
  const result = [];
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.')) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await walk(file, accept));
    else if (entry.isFile() && accept(file)) result.push(file);
  }
  return result;
}

export function publicDesignHTML(source) {
  return source
    .replaceAll('.png', '.webp')
    .replace(/<a\b[^>]*href="[^"]+\.zip"[^>]*>[^<]*<\/a>/g, '')
    .replaceAll('元のPNGを保存', '画像を保存')
    .replaceAll('PNGを保存', '画像を保存')
    .replaceAll('完成したジャックポットで遊ぶ', '九九ビートフェスティバルで遊ぶ');
}

export async function buildFestival({ root = projectRoot, outDir = path.join(root, 'dist'), requireRuntime = true } = {}) {
  const outputRelative = path.relative(path.resolve(root), path.resolve(outDir));
  if (!outputRelative || outputRelative.startsWith('..') || path.isAbsolute(outputRelative)) throw new Error('Output directory must be inside, and differ from, source.');
  if (requireRuntime) {
    for (const file of ['index.html', 'src/festival-app.js', 'src/minigames.js', 'src/festival-audio.js', 'assets/runtime/icon-192.png', 'assets/runtime/icon-512.png']) {
      if (!await exists(path.join(root, file))) throw new Error(`Missing release asset: ${file}`);
    }
    const entry = await readFile(path.join(root, 'index.html'), 'utf8');
    if (!entry.includes('src/festival-app.js')) throw new Error('index.html still points to the old prototype; festival entrypoint is required.');
  }
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  const files = ['index.html', 'manifest.webmanifest', '_headers'];
  let adoptedArt;
  const richManifest=path.join(root,'assets/runtime/rich/manifest.json');
  if(await exists(richManifest))adoptedArt=new Set(JSON.parse(await readFile(richManifest,'utf8')).clips.map(clip=>clip.file));
  if (await exists(path.join(root, 'recover.html'))) files.push('recover.html');
  for (const name of ['festival.css', 'festival-style.css']) if (await exists(path.join(root, name))) files.push(name);
  for (const [dir, accept] of [
    ['src', f => /\.(?:js|css|json)$/.test(f)],
    ['assets/runtime', f => allowedRuntime.test(f)&&(!f.includes(`${path.sep}rich${path.sep}`)||path.basename(f)==='manifest.json'||adoptedArt?.has(path.basename(f)))],
    ['assets/audio/festival', f => allowedAudio.test(f)],
    ['assets/fonts', f => /\.(?:woff2|txt)$/i.test(f)],
    ['designs/20-minigames', f => !f.includes(`${path.sep}qa${path.sep}`) && /\.(?:html|json|webp)$/i.test(f)],
  ]) {
    const absolute = path.join(root, dir);
    if (await exists(absolute)) files.push(...(await walk(absolute, accept)).map(file => path.relative(root, file)));
  }
  for (const relative of [...new Set(files)]) {
    const target = path.join(outDir, relative);
    await mkdir(path.dirname(target), { recursive: true });
    if (relative.startsWith('designs/') && relative.endsWith('.html')) {
      await writeFile(target, publicDesignHTML(await readFile(path.join(root, relative), 'utf8')));
    } else if (relative === 'designs/20-minigames/manifest.json') {
      // The public gallery downloads the lightweight previews; raw art stays local.
      const designManifest = await readFile(path.join(root, relative), 'utf8');
      await writeFile(target, designManifest.replaceAll('.png', '.webp'));
    } else await copyFile(path.join(root, relative), target);
  }

  if (requireRuntime) {
    const entry = await readFile(path.join(outDir, 'index.html'), 'utf8');
    for (const match of entry.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
      const ref = match[1];
      if (/^(?:[a-z]+:|#|\/\/)/i.test(ref)) continue;
      const parsed = new URL(ref, 'https://release.test/');
      let relative = decodeURIComponent(parsed.pathname).replace(/^\//, '');
      if (!relative || relative.endsWith('/')) relative += 'index.html';
      if (!await exists(path.join(outDir, relative))) throw new Error(`Entry references missing release file: ${ref}`);
    }
  }

  const assets = [];
  for (const file of await walk(outDir)) {
    const relative = path.relative(outDir, file).split(path.sep).join('/');
    if (relative === '_headers') continue;
    const content = await readFile(file);
    if (content.length > MAX_ASSET_BYTES) throw new Error(`Asset exceeds Cloudflare 25 MiB limit: ${relative}`);
    assets.push({ url: `/${relative}`, bytes: content.length, hash: createHash('sha256').update(content).digest('hex') });
  }
  if (assets.length + 2 > MAX_ASSET_COUNT) throw new Error(`Asset count exceeds ${MAX_ASSET_COUNT}.`);
  const swTemplate = await readFile(path.join(root, 'sw.js'), 'utf8');
  const version = createHash('sha256').update(JSON.stringify(assets)).update(swTemplate).digest('hex').slice(0, 16);
  const shell = assets.filter(asset => asset.url === '/index.html' || asset.url === '/manifest.webmanifest' || asset.url.startsWith('/src/') || asset.url.endsWith('.css') || asset.url.startsWith('/assets/fonts/') || /\/icon-(192|512)\.png$/.test(asset.url)).map(asset => asset.url);
  const manifest = { version, totalBytes: assets.reduce((sum, asset) => sum + asset.bytes, 0), totalAssets: assets.length, shell, assets };
  await writeFile(path.join(outDir, 'assets-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  // Keep this small recovery checkpoint out of the versioned cache manifest.
  // A broken old worker must fetch the currently deployed version from network.
  await writeFile(path.join(outDir, 'recovery-version.json'), JSON.stringify({ version }) + '\n');
  await writeFile(path.join(outDir, 'sw.js'), swTemplate.replaceAll('__KUKU_BUILD_ID__', version));
  console.log(`Built ${assets.length} assets, ${(manifest.totalBytes / 1024 / 1024).toFixed(2)} MiB. Version ${version}.`);
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await buildFestival();
