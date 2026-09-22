import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshSave,normalizeSave,rollGacha,awardMilestones,METER} from '../core.js';

test('単発ガチャは結果を先に保存し、演出中の多重購入を拒否する',()=>{
  const s=freshSave(),r=rollGacha(s,1,()=>.99);assert.equal(s.coins,50);assert.equal(r.entries[0].id,'phoenix');assert(s.owned.includes('phoenix'));assert.equal(s.draws,1);
  assert.equal(rollGacha(s,1),null);assert.equal(s.coins,50);const restored=normalizeSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(restored.pending,r);assert.deepEqual(restored.owned,s.owned);
});
test('5連は450コインで、同一バッチの重複も30コインに変換する',()=>{
  const s=freshSave();s.coins=500;const r=rollGacha(s,5,()=>.99);assert.equal(s.coins,170);assert.equal(r.entries.filter(e=>e.isNew).length,1);assert.equal(r.entries.reduce((n,e)=>n+e.refund,0),120);assert.equal(s.draws,5);assert.equal(s.history.length,5);assert.equal(normalizeSave(s).pending.entries.length,5);
});
test('コイン不足・不正回数・復元済みの開封では追加決済しない',()=>{
  const s=freshSave();for(const n of [0,2,5,100]){const before=JSON.stringify(s);assert.equal(rollGacha(s,n),null);assert.equal(JSON.stringify(s),before);}s.coins=99;assert.equal(rollGacha(s,1),null);
});
test('初回到達報酬は飛び越した目標も付与し、再読込や再挑戦で二重付与しない',()=>{
  const s=freshSave();assert.equal(awardMilestones(s,9).length,0);assert.equal(awardMilestones(s,26).length,2);assert.equal(s.coins,240);assert.equal(awardMilestones(s,26).length,0);const restored=normalizeSave(s);assert.equal(awardMilestones(restored,100).length,2);assert.equal(restored.coins,540);assert.equal(awardMilestones(restored,99).length,0);
});
test('破損した開封記録を捨て、従来のセーブデータを維持する',()=>{
  const s=normalizeSave({version:1,coins:123,best:47,speed:2,owned:['mint'],equipped:'mint',pending:{entries:[{id:'unknown'}]},claims:[10,10,-5,'100'],history:['mint','invalid']});assert.equal(s.pending,null);assert.deepEqual(s.claims,[10]);assert.equal(s.coins,123);assert.equal(s.equipped,'mint');assert.deepEqual(s.history,['mint']);
});
test('長押しジャンプは着地後に連続ジャンプし、同じ足場では着地報酬を繰り返さない',()=>{
  const events=[],g=new Game({seed:5,onEvent:e=>events.push(e)});g.platforms=g.platforms.slice(0,1);g.generate=()=>{};g.lava=-10000;
  for(let i=0;i<210;i++)g.step(1/120,{jump:true});assert(events.filter(e=>e.type==='jump').length>=2);assert.equal(g.coins,0);assert.equal(g.perfects,0);
});
test('100mの着地で踏破イベントが一度だけ発生する',()=>{
  const events=[],g=new Game({seed:1,onEvent:e=>events.push(e)});g.generate(110);const s=g.platforms.find(s=>s.id===100);g.player={x:s.x,y:s.y+2,vx:0,vy:-250,ground:null,coyote:0,face:1};g.peak=s.y;g.camera=s.y-300;g.lava=s.y-500;g.step(1/120,{});assert.equal(g.event,'summit');assert.equal(g.cleared,true);assert(g.paused);g.resume();g.nextShop=g.nextQuiz=g.nextBattle=1000;for(let i=0;i<400;i++)g.step(1/120,{});assert.equal(events.filter(e=>e.type==='summit').length,1);
});
test('イベント足場は通常足場になり、再開直後に次イベントが重ならない',()=>{
  const g=new Game({seed:1});g.generate(20);const s=g.platforms.find(s=>s.id===15);s.type='crumble';g.player={x:s.x,y:s.y,vx:0,vy:0,ground:15,coyote:0,face:1};g.peak=s.y;g.lava=s.y-500;g.step(1/120,{});assert.equal(g.event,'shop');assert.equal(s.type,'normal');g.resume();g.step(1/120,{});assert.equal(g.paused,false);
});
