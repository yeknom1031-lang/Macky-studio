import test from 'node:test';
import assert from 'node:assert/strict';
import { initialBoard } from '../src/engine.js';
import { CATALOG, normalizeProfile, purchaseItem, equipItem, matchReward, awardMatch, playerColors } from '../src/progression.js';
const won = (id = 'one', extra = {}) => ({ id, board:Array(64).fill(0), human:0, mode:'solo', difficulty:'normal', ...extra });
test('初期データは0コイン・基本盤と4色を所有', () => {
 const p=normalizeProfile(null);assert.equal(p.coins,0);assert.deepEqual(p.ownedBoards,['classic']);assert.deepEqual(p.ownedColors,['red','blue','yellow','green']);
});
test('破損・未知の保存データを正規化し、未購入品を装備しない', () => {
 const p=normalizeProfile({coins:-100,ownedBoards:['missing','walnut','walnut'],ownedColors:'violet',equippedColor:'violet',equippedBoard:'missing',claimed:[{},'a','a'],stats:{wins:NaN,played:3.5,draws:5}});
 assert.equal(p.coins,0);assert.equal(p.equippedBoard,'classic');assert.equal(p.equippedColor,'red');assert.deepEqual(p.ownedBoards,['classic','walnut']);assert.deepEqual(p.claimed,['a']);assert.deepEqual(p.stats,{wins:0,played:0,draws:5});
});
test('購入は残高から正確に引く、元データは変更しない', () => {
 const p=normalizeProfile({coins:100});const copy=structuredClone(p);const r=purchaseItem(p,'walnut');assert.equal(r.ok,true);assert.equal(r.profile.coins,20);assert.ok(r.profile.ownedBoards.includes('walnut'));assert.deepEqual(p,copy);
});
test('購入済み・不足・未知の商品を二重課金しない', () => {
 const p=normalizeProfile({coins:79});assert.equal(purchaseItem(p,'walnut').ok,false);assert.equal(purchaseItem(p,'classic').profile.coins,79);assert.equal(purchaseItem(p,'missing').ok,false);
 const r=purchaseItem(normalizeProfile({coins:200}),'walnut');assert.equal(purchaseItem(r.profile,'walnut').profile.coins,120);
});
test('所有アイテムの着せ替えは無料、未購入品は拒否', () => {
 const p=normalizeProfile({coins:50,ownedColors:['violet']});assert.equal(equipItem(p,'violet').profile.equippedColor,'violet');assert.equal(equipItem(p,'violet').profile.coins,50);assert.equal(equipItem(p,'ocean').ok,false);
});
test('勝利報酬は難易度と盤サイズを反映し、最大120', () => {
 assert.equal(matchReward('easy',6),30);assert.equal(matchReward('normal',8),60);assert.equal(matchReward('hard',12),120);
 const p=awardMatch(null,won());assert.equal(p.earned,60);assert.equal(p.profile.stats.wins,1);assert.equal(p.profile.stats.played,1);
});
test('同じ対局を再集計してもコイン・戦績は増えない', () => {
 const r=awardMatch(null,won());const twice=awardMatch(r.profile,won());assert.equal(twice.earned,0);assert.equal(twice.awarded,false);assert.deepEqual(twice.profile,r.profile);
});
test('最多引き分けは半額。下位の同点や敗北には付与しない', () => {
 const board=Array.from({length:64},(_,i)=>i%2);let r=awardMatch(null,won('draw',{board}));assert.equal(r.earned,30);assert.equal(r.profile.stats.draws,1);assert.equal(r.profile.stats.wins,0);
 r=awardMatch(null,won('loss',{board,human:3}));assert.equal(r.earned,0);assert.equal(r.profile.stats.played,1);
});
test('中断・対人戦・不正な盤面には報酬を付与しない', () => {
 for (const extra of [{board:initialBoard()},{mode:'friends'},{board:[0]},{board:Array(64).fill(9)},{human:9},{id:''}]) assert.equal(awardMatch(null,won('invalid',extra)).awarded,false);
});
test('選んだ青・黄・緑の手番に人間を割り当て、特別色は赤枠を置換', () => {
 for(const c of CATALOG.filter(c=>c.kind==='color')) {
  const r=playerColors(c.id);assert.equal(r.human,c.seat);assert.equal(r.colors[c.seat].id,c.id);assert.equal(new Set(r.colors.map(c=>c.id)).size,4);
 }
 assert.deepEqual(playerColors('violet','friends').colors.map(c=>c.id),['red','blue','yellow','green']);
});
test('保存JSONを往復して購入品・残高・二重付与防止情報を保つ', () => {
 let p=awardMatch(null,won('offline',{difficulty:'hard'})).profile;p=purchaseItem(p,'violet').profile;p=equipItem(p,'violet').profile;
 assert.deepEqual(normalizeProfile(JSON.parse(JSON.stringify(p))),p);assert.equal(awardMatch(p,won('offline')).earned,0);
});
