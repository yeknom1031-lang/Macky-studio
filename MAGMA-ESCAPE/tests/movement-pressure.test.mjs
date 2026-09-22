import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,W,METER,lavaPressure,routeSection,encounterPosition} from '../core.js';
const dt=1/120;
function airGame(){const events=[],g=new Game({seed:6,onEvent:e=>events.push(e)});g.platforms=[];g.generate=()=>{};Object.assign(g.player,{x:210,y:250,ground:null,coyote:0,vy:0});return {g,events};}
test('二段目は押し直した時だけ使い、三段目は使えない',()=>{
  const events=[],g=new Game({seed:1,onEvent:e=>events.push(e)});g.step(dt,{jump:true});for(let i=0;i<15;i++)g.step(dt,{jump:true});assert(g.airJumpAvailable);assert.equal(events.filter(e=>e.type==='jump').length,1);
  g.step(dt,{});g.step(dt,{jump:true});assert(!g.airJumpAvailable);assert(g.player.vy>500);assert.equal(events.filter(e=>e.kind==='double').length,1);
  g.step(dt,{});const before=g.player.vy;g.step(dt,{jump:true});assert(g.player.vy<before);assert.equal(events.filter(e=>e.type==='jump').length,2);
});
test('着地で空中ジャンプと壁キックの回数が回復する',()=>{
  const g=new Game();g.airJumpAvailable=false;g.lastWall=-1;Object.assign(g.player,{y:2,vy:-250,ground:null,coyote:0});g.step(dt,{});assert.equal(g.player.ground,0);assert(g.airJumpAvailable);assert.equal(g.lastWall,0);
});
for(const side of [-1,1])test(`${side<0?'左':'右'}壁のキックは壁から離れ、同じ壁の連打で無限上昇しない`,()=>{
  const {g,events}=airGame();g.player.x=side<0?18:W-18;g.step(dt,{jump:true,left:side<0,right:side>0});assert(g.player.vx*side<-290);assert(g.player.vy>580);assert(g.airJumpAvailable);assert.equal(events.at(-1).kind,'wall');
  for(let i=0;i<10;i++)g.step(dt,{left:side<0,right:side>0});assert(g.player.vx*side<0,'brief input lock preserves the kick impulse');
  g.player.x=side<0?18:W-18;g.wallLock=0;g.step(dt,{jump:true});assert.equal(events.filter(e=>e.kind==='wall').length,1);
  g.step(dt,{});g.player.x=side<0?W-18:18;g.step(dt,{jump:true});assert.equal(events.filter(e=>e.kind==='wall').length,2,'opposite wall may be kicked');
});
test('壁へ押し続けると落下が緩まり、離すと通常の重力へ戻る',()=>{
  const {g}=airGame();g.player.x=18;g.player.vy=-500;g.step(dt,{left:true});assert(g.wallSliding);assert.equal(g.player.vy,-115);g.step(dt,{right:true});assert(!g.wallSliding);assert(g.player.vy<-115);
});
test('マグマの基本速度は高度と経過時間で上がる',()=>{
  assert.equal(lavaPressure(3,100).speed,0);assert(lavaPressure(10,30).speed>lavaPressure(10,0).speed);
  assert(lavaPressure(66,30).speed>lavaPressure(40,30).speed);assert(lavaPressure(10,100).speed>50);
});
test('通常→3秒予告→6秒噴き上がり→小休止の強弱がある',()=>{
  assert.equal(lavaPressure(20,30).phase,'climb');assert.equal(lavaPressure(21,30).warning,3);assert.equal(lavaPressure(23.5,30).warning,1);
  assert.equal(lavaPressure(24,30).phase,'surge');assert.equal(lavaPressure(29.99,30).phase,'surge');assert.equal(lavaPressure(30,30).phase,'breather');
  assert(lavaPressure(25,30).speed>lavaPressure(22,30).speed*1.7);assert(lavaPressure(31,30).speed<lavaPressure(22,30).speed*.75);
});
test('追従マグマは瞬間移動せず速度で進み、イベント中は停止する',()=>{
  const {g}=airGame();g.time=25;g.peak=500;g.lava=-500;const before=g.lava;g.step(dt,{});assert(g.lava>before);assert(g.lava-before<3);g.pause();const frozen={lava:g.lava,time:g.time,phase:g.pressure.phase};for(let i=0;i<500;i++)g.step(dt,{});assert.deepEqual({lava:g.lava,time:g.time,phase:g.pressure.phase},frozen);
});
test('区間には連続ジャンプ・横移動・休憩の配置差がある',()=>{
  const g=new Game({seed:2});g.generate(80);assert.equal(routeSection(17),'sprint');assert.equal(routeSection(25),'traverse');assert.equal(routeSection(33),'rest');
  const rest=g.platforms.filter(s=>s.section==='rest');assert(rest.every(s=>s.type==='normal'));assert(rest.every(s=>s.w>=134));assert(g.platforms.some(s=>s.section==='sprint'&&s.type==='crumble'));
});
test('再開時の猶予はイベント後だけで、通常ポーズでは減速を再取得できない',()=>{
  const g=new Game();g.pause();g.resume();assert.equal(g.resumeGrace,0);g.trigger('quiz');g.resume();assert.equal(g.resumeGrace,.8);
});
function encounterGame(type){
  const events=[],g=new Game({seed:2,onEvent:e=>events.push(e)});g.generate(60);const s=g.platforms.find(s=>s.encounter?.type===type),pos=encounterPosition(s,g.time);
  Object.assign(g.player,{x:pos.x,y:s.y,vy:0,vx:0,ground:s.id,coyote:.1});g.peak=s.y;g.camera=s.y-275;g.lava=s.y-300;g.nextShop=1000;return {g,s,events};
}
for(const type of ['quiz','battle']){
  test(`${type}: 画面上の予告表示前は突然開始しない`,()=>{const {g,s}=encounterGame(type);g.step(dt,{});assert(!g.paused);assert(!s.encounter.used);assert.equal(s.encounter.revealedAt,g.time);});
  test(`${type}: 接触で即座に開始し、一度消費した相手は再発しない`,()=>{
    const {g,s,events}=encounterGame(type);s.encounter.revealedAt=-1;g.player.ground=null;g.player.y+=12;g.step(dt,{});assert.equal(g.event,type);assert(s.encounter.used);assert(g.paused);assert(events.some(e=>e.type==='encounter'&&e.kind===type));g.resume();for(let i=0;i<380;i++)g.step(dt,{});assert.equal(events.filter(e=>e.type===type).length,1);
  });
  test(`${type}: 同じ高度でも触れずに通ると始まらない`,()=>{
    const {g,s,events}=encounterGame(type);s.encounter.revealedAt=-1;g.player.x=s.x-s.encounter.offset;for(let i=0;i<90;i++)g.step(dt,{});assert(!g.paused);assert(!s.encounter.used);assert.equal(events.filter(e=>e.type===type).length,0);
  });
}
test('接触イベント後に別の敵へ触れてもクールダウン中には割り込まない',()=>{
  const {g,s}=encounterGame('quiz');s.encounter.revealedAt=-1;g.nextEventAllowed=3;for(let i=0;i<100;i++)g.step(dt,{});assert(!g.paused);assert(!s.encounter.used);
});
