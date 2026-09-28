import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const [template, css, ...modules] = await Promise.all(['src/index.html', 'src/style.css', 'src/engine.js', 'src/ai.js', 'src/match.js', 'src/progression.js', 'src/audio.js', 'src/app.js'].map(read));
// Only our local named imports/exports are removed. The resulting classic
// script has no fetches, module imports, CDN, or file:// CORS dependency.
const art = await readFile(new URL('src/assets/table-atmosphere.jpg', root));
const logo = await readFile(new URL('src/assets/irodory-logo.png', root));
const embeddedCSS = css.replaceAll('__TABLE_ART__', `data:image/jpeg;base64,${art.toString('base64')}`)
  .replaceAll('__IRODORY_LOGO__', `data:image/png;base64,${logo.toString('base64')}`);
const code = modules.map(source => source.replace(/^import .*?;\s*$/gm, '').replace(/^export /gm, '')).join('\n');
const html = template.replace('<link rel="stylesheet" href="./style.css">', () => `<style>\n${embeddedCSS}\n</style>`)
  .replace(/^[ \t]*<script type="module" src=".\/app.js"><\/script>\s*$/m, '')
  .replace('</body>', () => `<script>\n(() => {\n'use strict';\n${code.replace(/<\/script/gi, '<\\/script')}\n})();\n</script>\n</body>`);
await mkdir(new URL('dist/', root), { recursive: true });
for (const path of ['dist/index.html', 'Irodory.html', '4色オセロ.html']) await writeFile(new URL(path, root), html);
console.log(`Built self-contained HTML (${Buffer.byteLength(html)} bytes): ${fileURLToPath(new URL('Irodory.html', root))}`);
