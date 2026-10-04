import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.wav': 'audio/wav' };

/** Match Workers Static Assets HTML canonicalization, including redirect history. */
export function cloudflareStaticServer(directory, requests = []) {
  const root = path.resolve(directory);
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    requests.push(pathname);
    try {
      let fileRoute = pathname;
      if (fileRoute.endsWith('/')) fileRoute += 'index.html';
      else if (!path.extname(fileRoute)) fileRoute += '.html';
      const file = path.resolve(root, '.' + fileRoute);
      if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
      const content = await readFile(file);
      if (pathname.endsWith('.html')) {
        const canonical = pathname.endsWith('/index.html') ? pathname.slice(0, -10) : pathname.slice(0, -5);
        res.writeHead(307, { Location: canonical + url.search, 'Cache-Control': 'no-store' });
        res.end(); return;
      }
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch { res.writeHead(404); res.end(); }
  });
}

export async function cachedHTML(page, version) {
  return page.evaluate(async version => {
    const cache = await caches.open('kuku-beat-festival-' + version);
    const html = (await cache.keys()).filter(request => new URL(request.url).pathname.endsWith('.html'));
    return Promise.all(html.map(async request => {
      const response = await cache.match(request);
      return { path: new URL(request.url).pathname, redirected: response.redirected, status: response.status };
    }));
  }, version);
}
