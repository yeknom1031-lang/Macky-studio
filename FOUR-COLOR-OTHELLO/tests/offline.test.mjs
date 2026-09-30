import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const html=await readFile(new URL('../Irodory.html',import.meta.url),'utf8');
test('配布HTML・旧名ファイル・公開版は同一',async()=>{
 for(const path of ['../dist/index.html','../4色オセロ.html']) assert.equal(html,await readFile(new URL(path,import.meta.url),'utf8'));
});
test('単体HTMLは外部JS・CSS・画像やモジュールを読み込まない',()=>{
 assert.doesNotMatch(html,/<script\b[^>]*\bsrc\s*=/i);
 assert.doesNotMatch(html,/<script\b[^>]*type=["']module/i);
 assert.doesNotMatch(html,/<link\b[^>]*rel=["']stylesheet/i);
 assert.doesNotMatch(html,/<(?:img|iframe|audio|video)\b[^>]*src=["'](?!data:)/i);
 const styles=[...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n');
 for(const [,url] of styles.matchAll(/url\(["']?([^"')]+)/g))assert.ok(url.startsWith('data:') || url.startsWith('#') || url.startsWith('%23'),url);
});
test('JavaScriptはfile://で実行可能なclassic scriptで構文エラーなし',()=>{
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,1);
 assert.doesNotThrow(()=>new vm.Script(scripts[0][1]));
 assert.doesNotMatch(scripts[0][1],/^\s*(import|export)\s/m);
 assert.doesNotMatch(scripts[0][1],/\b(fetch|XMLHttpRequest)\s*\(/);
});
