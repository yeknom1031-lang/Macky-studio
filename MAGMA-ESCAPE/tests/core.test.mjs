import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,normalizeSave,freshSave,drawAura,transact,upgradeCost,METER} from '../core.js';

test('ジャンプは上の足場を通過し、下降時に着地できる',()=>{
  const g=new Game({seed:1});g.platforms=g.platforms.slice(0,2);g.platforms[1].x=g.platforms[1].baseX=210;
  let landed=false,peak=0;
  for(let i=0;i<120;i++){g.step(1/120,{jump:i===0});peak=Math.max(peak,g.player.y);if(g.player.ground===1){landed=true;break;}}
  assert(peak>METER);assert(peak<2*METER);assert(landed);assert.equal(g.player.y,METER);
});
test('崩れる足場は0.5秒後に衝突判定が消える',()=>{
  const g=new Game({seed:1});const s=g.platforms[0];s.type='crumble';s.touched=0;
  for(let i=0;i<59;i++)g.step(1/120,{});assert.equal(s.solid,true);
  for(let i=0;i<3;i++)g.step(1/120,{});assert.equal(s.solid,false);assert.equal(g.player.ground,null);
});
test('移動足場に乗っている間はキャラクターも追従する',()=>{
  const g=new Game({seed:1});const s=g.platforms[0];s.type='moving';s.phase=0;
  for(let i=0;i<40;i++)g.step(1/120,{});assert(Math.abs(g.player.x-s.x)<.001);assert.equal(g.player.ground,0);
});
test('ポーズで時間、空腹、マグマが停止する',()=>{
  const g=new Game({seed:1});const before={time:g.time,hunger:g.hunger,lava:g.lava,y:g.player.y};g.pause();
  for(let i=0;i<120;i++)g.step(1/120,{jump:true,jet:true});
  assert.deepEqual({time:g.time,hunger:g.hunger,lava:g.lava,y:g.player.y},before);
});
test('ジェットは燃料を消費し、着地中に回復する',()=>{
  const g=new Game({seed:1,jet:2});g.player.y=200;g.player.ground=null;
  for(let i=0;i<60;i++)g.step(1/120,{jet:true});assert(g.player.y>200);assert(g.fuel<g.maxFuel-.45);
  g.player.y=0;g.player.vy=0;g.player.x=210;g.player.ground=0;
  for(let i=0;i<120;i++)g.step(1/120,{});assert.equal(g.fuel,g.maxFuel);
});
test('マグマ接触による死亡イベントは一度だけ発生する',()=>{
  let deaths=0;const g=new Game({onEvent:e=>{if(e.type==='death')deaths++;}});g.lava=50;
  for(let i=0;i<20;i++)g.step(1/120,{});assert.equal(deaths,1);assert.equal(g.alive,false);
});
test('コインは同じ足場で重複獲得できない',()=>{
  const g=new Game({seed:1});g.platforms[0].coin=true;
  for(let i=0;i<60;i++)g.step(1/120,{});assert.equal(g.coins,5);
});
test('ショップに到達すると安全に停止して次の出現高度を設定する',()=>{
  let event;const g=new Game({seed:1,onEvent:e=>{if(e.type==='shop')event=e;}});const p=g.platforms.find(p=>p.id===15);g.player={x:p.x,y:p.y,vy:0,vx:0,ground:p.id,coyote:.1};g.step(1/120,{});
  assert.equal(event.type,'shop');assert.equal(g.paused,true);assert.equal(g.nextShop,30);
});
test('多くのシードでも足場の幅・高低差・間隔に到達可能な上限がある',()=>{
  for(let seed=0;seed<100;seed++){
    const g=new Game({seed});g.generate(300);
    for(let i=1;i<g.platforms.length;i++){
      const a=g.platforms[i-1],b=g.platforms[i];assert.equal(b.baseY-a.baseY,METER);
      assert(Math.abs(b.baseX-a.baseX)<=105.00001);assert(b.w>=76);assert(b.baseX>=80&&b.baseX<=340);
    }
  }
});
test('セーブは破損・未知の装備・負数に耐える',()=>{
  assert.deepEqual(normalizeSave(null),freshSave());const s=normalizeSave({version:1,coins:-5,best:Infinity,speed:800,owned:['fake','ice'],equipped:'fake'});
  assert.equal(s.coins,0);assert.equal(s.best,0);assert.equal(s.speed,5);assert.deepEqual(s.owned,['ember','ice']);assert.equal(s.equipped,'ember');
});
test('不足コインでは購入せず、十分なコインで一度だけ決済する',()=>{
  const s=freshSave();assert(!transact(s,200,x=>x.jet++));assert.equal(s.coins,150);assert.equal(s.jet,0);
  assert(transact(s,upgradeCost(0),x=>x.jet++));assert.equal(s.coins,50);assert.equal(s.jet,1);assert(!transact(s,-1));
});
test('ガチャの重みが表示確率と一致する',()=>{
  const counts={};for(let i=0;i<10000;i++){const a=drawAura(()=>(i+.5)/10000);counts[a.id]=(counts[a.id]||0)+1;}
  assert.deepEqual(counts,{ember:4000,mint:2500,violet:2000,ice:1200,phoenix:300});
});
