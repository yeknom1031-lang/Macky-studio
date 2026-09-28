import test from 'node:test';
import assert from 'node:assert/strict';
import { randomSoloLineup, normalizeProfile, awardMatch, recordResignation } from '../src/progression.js';
import { initialBoard, legalMoves } from '../src/engine.js';
import { endByResignation } from '../src/match.js';
import { stoneWave, createStoneAudio } from '../src/audio.js';
const seeded = (seed = 401) => () => ((seed = (Math.imul(seed,1664525) + 1013904223) >>> 0) / 4294967296);
test('ソロ抽選：色と席の全16通りが現れ、四色が重複せず全席に合法手がある', () => {
 const random = seeded(), counts = new Map(), profile = normalizeProfile();
 const before = structuredClone(profile);
 for(let i=0;i<8000;i++) {
  const draw = randomSoloLineup(profile,random);
  assert.equal(new Set(draw.colors.map(c=>c.id)).size,4);
  const key = `${draw.colors[draw.human].id}:${draw.human}`;
  counts.set(key,(counts.get(key) ?? 0)+1);
  draw.colors.forEach((c,p) => { assert.equal(c.seat,p); assert.ok(legalMoves(initialBoard(),p).length); });
 }
 assert.equal(counts.size,16);
 for(const count of counts.values()) assert.ok(count > 380 && count < 620,count);
 assert.deepEqual(profile,before);
});
test('購入済みの特別色も全４席へ割り当てられ、未購入色は出ない', () => {
 const profile = normalizeProfile({ownedColors:['violet']});
 for(let human=0;human<4;human++) {
  const sequence = [.99,(human+.2)/4];
  const draw = randomSoloLineup(profile,()=>sequence.length ? sequence.shift() : .5);
  assert.equal(draw.human,human); assert.equal(draw.colors[human].id,'violet');
  assert.equal(new Set(draw.colors.map(c=>c.id)).size,4);
  assert.ok(draw.colors.every(c=>profile.ownedColors.includes(c.id)));
 }
 const random=seeded();for(let i=0;i<100;i++) assert.ok(randomSoloLineup(null,random).colors.every(c=>['red','blue','yellow','green'].includes(c.id)));
});
test('ランダムな人間の席でも勝利・降参を正しく人間に記録する', () => {
 for(let human=0;human<4;human++) {
  const draw=randomSoloLineup(null,()=> (human+.1)/4);
  const match={...draw,id:`seat-${human}`,mode:'solo',difficulty:'normal',phase:'playing',board:initialBoard(),player:0};
  const win=awardMatch(null,{...match,ending:'completed',board:Array(64).fill(draw.human)});
  assert.equal(win.earned,60);assert.equal(win.profile.stats.wins,1);
  const loss=recordResignation(null,endByResignation(match));
  assert.equal(loss.recorded,true);assert.equal(loss.profile.stats.played,1);assert.equal(loss.profile.coins,0);
 }
});
test('石の音は全サンプルレートで有限・クリップなし・末尾は静かに減衰する', () => {
 for(const rate of [22050,44100,48000,96000]) for(const kind of ['place','flip']) {
  const samples=stoneWave(rate,kind,772);
  assert.equal(samples.length,Math.ceil(rate*.18));
  assert.ok(samples.every(v=>Number.isFinite(v) && Math.abs(v)<=.83));
  assert.ok(samples.some(v=>Math.abs(v)>.5));
  const tail=samples.slice(-Math.floor(rate*.02));
  assert.ok(tail.reduce((s,v)=>s+v*v,0)/tail.length < .00001);
  assert.equal(Math.abs(samples.at(-1)),0);
 }
 assert.notDeepEqual(stoneWave(48000,'place',1),stoneWave(48000,'flip',1));
 assert.notDeepEqual(stoneWave(48000,'place',1),stoneWave(48000,'place',2));
});
test('ミュートは音声環境を作らず、非対応ブラウザもゲームを妨げない', () => {
 let created=0;const player=createStoneAudio(()=>({sound:false,volume:1}),()=>{created++;throw new Error('unavailable');});
 player.unlock();assert.equal(player.hit(),false);player.celebrate();player.stop();player.sync();assert.equal(created,0);
 const unsupported=createStoneAudio(()=>({sound:true,volume:.75}),()=>{throw new Error('unavailable');});
 assert.doesNotThrow(()=>unsupported.unlock());assert.equal(unsupported.hit(),false);
});
