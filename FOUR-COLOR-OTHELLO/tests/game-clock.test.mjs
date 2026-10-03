import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameClock } from '../src/game-clock.js';

function harness() {
  let now=0, id=0;
  const timers=new Map();
  const clock=createGameClock({now:()=>now,schedule:(fn,ms)=>{timers.set(++id,{fn,at:now+ms});return id;},unschedule:id=>timers.delete(id)});
  function advance(ms) {
    const end=now+ms;
    while(true) {
      const next=[...timers].filter(([,job])=>job.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
      if(!next)break;
      now=next[1].at;timers.delete(next[0]);next[1].fn();
    }
    now=end;
  }
  return {clock,timers,advance};
}

test('イントロ・自動パス・効果音待ちは長いポーズの間停止し、残り時間から再開する',async()=>{
  for(const duration of [145,1500,2500]) {
    const {clock,advance,timers}=harness();let fired=false;
    const done=clock.wait(duration).then(value=>{fired=value;});
    advance(100);clock.setPaused(true);advance(60000);
    assert.equal(clock.time(),100);assert.equal(timers.size,0);assert.equal(clock.pending(),1);
    await Promise.resolve();assert.equal(fired,false);
    clock.setPaused(false);advance(duration-101);await Promise.resolve();assert.equal(fired,false);
    advance(1);await done;assert.equal(fired,true);assert.equal(clock.time(),duration);assert.equal(clock.pending(),0);
  }
});

test('設定を重ねて開いても時計は進まず、停止中の新しい処理も再開するまで動かない',()=>{
  const {clock,advance,timers}=harness();let fired=0;
  clock.schedule(()=>fired++,1000);advance(250);clock.setPaused(true);
  advance(500);clock.setPaused(true);clock.schedule(()=>fired++,200);advance(4000);
  assert.equal(clock.time(),250);assert.equal(fired,0);assert.equal(timers.size,0);
  clock.setPaused(false);advance(199);assert.equal(fired,0);
  advance(1);assert.equal(fired,1);advance(549);assert.equal(fired,1);
  advance(1);assert.equal(fired,2);assert.equal(clock.time(),1000);
});

test('降参・ホーム・再戦で保留処理を解放し、前の対局の待機を持ち越さない',async()=>{
  const {clock,advance,timers}=harness();let calls=0;
  const waiting=clock.wait(1000);const cancelled=clock.schedule(()=>calls++,500);
  clock.clear(cancelled);advance(100);clock.setPaused(true);clock.schedule(()=>calls++,50);
  clock.reset();assert.equal(await waiting,false);assert.equal(clock.time(),0);assert.equal(clock.paused(),false);
  assert.equal(timers.size,0);assert.equal(clock.pending(),0);
  advance(10000);assert.equal(calls,0);
  clock.schedule(()=>calls++,25);advance(25);assert.equal(calls,1);
});

test('ポーズと再開を1000回繰り返してもタイマーが増えず、演出の残り時間が保たれる',()=>{
  const {clock,advance,timers}=harness();let fired=0;
  clock.schedule(()=>fired++,2000);
  for(let i=0;i<1000;i++) {
    advance(1);clock.setPaused(true);advance(10000);clock.setPaused(false);
    assert.equal(timers.size,1);assert.equal(clock.pending(),1);
  }
  assert.equal(clock.time(),1000);advance(999);assert.equal(fired,0);
  advance(1);assert.equal(fired,1);assert.equal(timers.size,0);assert.equal(clock.pending(),0);
});
