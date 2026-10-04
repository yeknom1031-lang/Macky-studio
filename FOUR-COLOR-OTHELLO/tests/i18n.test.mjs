import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { t, normalizeLanguage, resolveLanguage, setLanguage, getLanguage, onlineSeatName, onlineNotice, createStaticTranslations } from '../src/i18n.js';
import { ENGLISH } from '../src/translations.js';
import { CATALOG } from '../src/progression.js';
import { DIFFICULTIES } from '../src/ai.js';
import { DISC_FINISHES, DISC_PATTERNS, DISC_EMBLEMS, DISC_SHAPES, DISC_FONTS, DISC_TEXT_POSITIONS, DISC_COLOR_MODES } from '../src/cosmetics.js';

const jp = /[\u3040-\u9fff]/;
test('automatic language uses the first browser preference and falls back to English', () => {
  for(const locale of ['ja','ja-JP','JA-jp','ja_JP'])assert.equal(resolveLanguage('auto',[locale,'en-US']),'ja');
  for(const locale of ['en-US','en-GB','fr-FR','es','zh-CN','ko','ar','hi'])assert.equal(resolveLanguage('auto',[locale,'ja']),'en');
  assert.equal(resolveLanguage('auto',[]),'en');
  assert.equal(resolveLanguage('ja',['en']),'ja');assert.equal(resolveLanguage('en',['ja']),'en');
  assert.equal(normalizeLanguage(null),'auto');assert.equal(normalizeLanguage('fr'),'auto');
  for(const choice of ['auto','ja','en'])assert.equal(normalizeLanguage(choice),choice);
});
test('switching language preserves dynamic values, including translation-like names and braces', () => {
  try {
    setLanguage('en'); assert.equal(getLanguage(),'en');
    assert.equal(t('設定'),'Settings');assert.equal(t`あなたは${t('赤')}`,'You are Red');
    assert.equal(t`${'あなた {1} $&'}が${8}枚返しました`,'あなた {1} $& flipped 8 discs.');
    setLanguage('ja');assert.equal(t`あなたは${t('赤')}`,'あなたは赤');
    assert.equal(t('An unknown server message'),'An unknown server message');
  } finally {setLanguage('ja');}
});
test('mixed-language online messages localize system text but never human nicknames', () => {
  const seats=[{name:'赤',bot:false},{name:'コンピューター 3',bot:false},{name:'コンピューター 2',bot:true}];
  try {
    setLanguage('en');
    assert.equal(onlineSeatName(seats[0]),'赤');assert.equal(onlineSeatName(seats[1]),'コンピューター 3');
    assert.equal(onlineSeatName(seats[2]),'Computer 2');
    assert.equal(onlineNotice('赤の手をAIが代行しました',seats),'AI played a move for 赤.');
    assert.equal(onlineNotice('コンピューター 2の手をAIが代行しました',seats),'AI played a move for Computer 2.');
    assert.equal(onlineNotice('赤・黄は置ける場所がありません。スキップ',seats),'No legal moves for Red / Yellow. Passing.');
    assert.equal(t('よろしく！'),'Let’s have a good game!');
    setLanguage('ja');assert.equal(t('よろしく！'),'よろしく！');
  } finally {setLanguage('ja');}
});
test('English translations preserve every placeholder and contain no untranslated Japanese', () => {
  for(const [key,value] of Object.entries(ENGLISH)) {
    assert.equal(typeof value,'string');assert.ok(!jp.test(value),key);
    const slots=s=>[...new Set(s.match(/\{\d+\}/g)??[])].sort();
    assert.deepEqual(slots(value),slots(key),key);
  }
});
test('all static UI text, catalog entries and difficulty descriptions have English translations', async () => {
  const html=(await readFile(new URL('../src/index.html',import.meta.url),'utf8')).replace(/<noscript>[\s\S]*?<\/noscript>/g,'');
  const messages=[...html.matchAll(/>([^<>]+)</g)].map(m=>m[1].trim());
  messages.push(...[...html.matchAll(/(?:aria-label|title|placeholder|content)="([^"]+)"/g)].map(m=>m[1]));
  messages.push(...CATALOG.flatMap(item=>[item.name,item.description].filter(Boolean)),...Object.values(DIFFICULTIES).flatMap(d=>[d.label,d.description]));
  messages.push(...Object.values(DISC_FINISHES),...Object.values(DISC_PATTERNS),...Object.values(DISC_EMBLEMS));
  messages.push(...[DISC_SHAPES,DISC_FONTS,DISC_TEXT_POSITIONS,DISC_COLOR_MODES].flatMap(Object.values));
  const missing=[...new Set(messages.filter(s=>jp.test(s)&&s!=='日本語'&&!Object.hasOwn(ENGLISH,s)))];
  assert.deepEqual(missing,[]);
});
test('literal UI and transport errors have translations', async () => {
  const sources=await Promise.all(['../src/app.js','../src/disc-library.js','../src/capture-preview.js','../src/online.js','../server/game.js','../server/lobby.js','../server/settings.js','../server/worker.js'].map(path=>readFile(new URL(path,import.meta.url),'utf8')));
  for(const source of sources){
    const keys=[...source.matchAll(/(?:t\(|new Error\(|error\s*[:=]\s*|reason\s*:\s*|onError\()'([^'\n]+)'/g)].map(m=>m[1]);
    for(const key of keys.filter(s=>jp.test(s)))assert.ok(Object.hasOwn(ENGLISH,key),key);
  }
});
test('static bindings switch both ways without overwriting later dynamic or player text', () => {
  let walks=0;
  const nodes=['設定','オンラインで遊ぶ','赤'].map(nodeValue=>({nodeValue,isConnected:true,parentElement:{closest:()=>null}}));
  let current=0;const doc={documentElement:{lang:'ja'},createTreeWalker(){walks++;return {nextNode:()=>nodes[current++]??null}},querySelectorAll:()=>[]};
  const apply=createStaticTranslations(doc);
  try{
    setLanguage('en');apply();assert.equal(nodes[0].nodeValue,'Settings');assert.equal(doc.documentElement.lang,'en');
    nodes[1].nodeValue='赤'; // Application has replaced this content with a nickname.
    nodes[2].isConnected=false;
    setLanguage('ja');apply();assert.equal(nodes[0].nodeValue,'設定');assert.equal(nodes[1].nodeValue,'赤');assert.equal(nodes[2].nodeValue,'Red');
    assert.equal(walks,1);
  }finally{setLanguage('ja');}
});
