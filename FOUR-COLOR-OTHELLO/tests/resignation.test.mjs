import test from 'node:test';
import assert from 'node:assert/strict';
import { initialBoard } from '../src/engine.js';
import { canResign, endByResignation } from '../src/match.js';
import { normalizeProfile, awardMatch, recordResignation } from '../src/progression.js';
const match = (extra = {}) => ({ id:'resignation-test', board:initialBoard(), mode:'solo', phase:'playing', player:0, human:0, ...extra });
test('人間の番でもAIの思考中でも、選んだ人間の色が降参する', () => {
 for(const phase of ['intro','playing','thinking','animating','skipping']){
  const s=match({phase,human:3,player:1}), copy=structuredClone(s), ended=endByResignation(s);
  assert.equal(canResign(s),true);assert.equal(ended.resigned,3);assert.equal(ended.phase,'ended');assert.equal(ended.ending,'resigned');assert.deepEqual(ended.board,s.board);assert.notEqual(ended.board,s.board);assert.deepEqual(s,copy);
 }
});
test('ホーム・終了後・終局盤面からは降参できない',()=>{
 for(const extra of [{phase:'home'},{phase:'ended'},{board:Array(64).fill(0)},{board:Array(64).fill(null)}])assert.equal(endByResignation(match(extra)),null);
});
test('不正なモード・色・盤面を受け付けない',()=>{
 for(const extra of [{mode:'invalid'},{human:4},{board:[0]},{board:Array(64).fill(7)}])assert.equal(canResign(match(extra)),false);
 assert.equal(canResign(null),false);
});
test('4人モードは現在手番の色が降参し、この卓を終了する',()=>{
 const ended=endByResignation(match({mode:'friends',player:2,human:0}));assert.equal(ended.resigned,2);assert.equal(ended.phase,'ended');assert.equal(recordResignation(null,ended).recorded,false);
});
test('ひとり降参は1敗として1対局を記録。コインと購入品は維持',()=>{
 const profile=normalizeProfile({coins:170,ownedBoards:['walnut'],ownedColors:['violet'],stats:{played:5,wins:3,draws:1}}), copy=structuredClone(profile);
 const result=recordResignation(profile,endByResignation(match()));assert.equal(result.recorded,true);assert.equal(result.profile.coins,170);assert.deepEqual(result.profile.stats,{played:6,wins:3,draws:1});assert.deepEqual(result.profile.ownedBoards,profile.ownedBoards);assert.deepEqual(profile,copy);
});
test('降参の二重記録や、降参後の勝利コイン受取を拒否',()=>{
 const ended=endByResignation(match()), result=recordResignation(null,ended);assert.equal(recordResignation(result.profile,ended).recorded,false);assert.equal(awardMatch(result.profile,{...ended,ending:'completed',board:Array(64).fill(0)}).awarded,false);
 assert.equal(awardMatch(null,{...ended,board:Array(64).fill(0)}).awarded,false);
});
test('降参未確定の状態や不正な受取IDからは戦績を変更しない',()=>{
 const ended=endByResignation(match());for(const s of [match(),{...ended,id:''},{...ended,resigned:1},{...ended,phase:'playing'}])assert.equal(recordResignation(null,s).recorded,false);
});
