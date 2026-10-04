import test from 'node:test';
import assert from 'node:assert/strict';
import {BEAT,makeQuestion,makePlaylist,grade,summarize,newSave,record,normalizeSave} from '../src/festival-core.js';
test('every multiplication has exactly one valid answer and matching truth statement',()=>{for(let a=1;a<10;a++)for(let b=1;b<10;b++)for(const random of [()=>.1,()=>.9]){const q=makeQuestion(a,b,random);assert.equal(q.answer,a*b);assert.equal(new Set(q.choices).size,3);assert.ok(q.choices.every(n=>n>=1&&n<=81));assert.equal(q.choices.filter(n=>n===a*b).length,1);assert.equal(q.claimed===a*b,q.truth);}});
test('whole tour visits all 21 games and all tables may appear in mixed play',()=>{const list=makePlaylist('tour',1,7,()=>.2);assert.equal(list.length,63);assert.deepEqual([...new Set(list.map(q=>q.gameId))],Array.from({length:21},(_,i)=>i+1));assert.ok(list.every(q=>q.a===7));assert.equal(new Set(makePlaylist('mix',1,7).map(q=>q.gameId)).size,5);});
test('arithmetic and rhythm are independent, truth uses boolean rather than product',()=>{const q={...makeQuestion(7,8,()=>.1),gameId:1};assert.equal(grade(q,{value:56,performed:true,hitTime:0}).correct,true);assert.equal(grade(q,{value:55,performed:true,hitTime:12*BEAT}).rhythm,'perfect');assert.equal(grade(q,{value:55,performed:true,hitTime:12*BEAT}).correct,false);assert.equal(grade({...q,gameId:21},{value:0,performed:true,hitTime:12*BEAT}).correct,true);assert.equal(grade(q,{value:null,performed:false,hitTime:null}).rhythm,'miss');});
test('watch sessions never change progress and wrong answers are queued for review',()=>{const good=grade({...makeQuestion(7,8),gameId:1},{value:56,performed:true,hitTime:12*BEAT});const bad={...good,correct:false,a:9,b:9,answer:81};const save=newSave();assert.deepEqual(record(save,[{...good,watch:true}]),normalizeSave(save));const next=record(save,[good,bad]);assert.equal(next.plays,1);assert.equal(next.correct,1);assert.equal(next.facts['9-9'].lastCorrect,false);assert.deepEqual(summarize([good,bad,bad]).review,[{a:9,b:9}]);});
test('review contains only the actual missed facts and settings reject corrupt values',()=>{const list=makePlaylist('review',1,7,Math.random,[{a:3,b:8},{a:9,b:7}]);assert.ok(list.every(q=>q.a===3&&q.b===8||q.a===9&&q.b===7));const s=normalizeSave({version:1,settings:{music:1000,offset:-999},stars:{1:100}});assert.equal(s.settings.music,100);assert.equal(s.settings.offset,-300);assert.equal(s.stars[1],3);});

test('default mixed deck balances every table before repeating and does not repeat facts',()=>{
 for(let seed=1;seed<=20;seed++){
  let state=seed;const random=()=>((state=(state*1664525+1013904223)>>>0)/4294967296);
  const list=makePlaylist('tour',1,undefined,random);
  assert.equal(new Set(list.map(q=>`${q.a}-${q.b}`)).size,63);
  for(let i=0;i<63;i+=9)assert.deepEqual(list.slice(i,i+9).map(q=>q.a).sort(),[1,2,3,4,5,6,7,8,9]);
  const counts=Array.from({length:9},(_,i)=>list.filter(q=>q.a===i+1).length);
  assert.deepEqual(counts,Array(9).fill(7));
 }
 assert.equal(new Set(makePlaylist('single',1).map(q=>q.a)).size,5);
});
test('fixed table practice still cycles through all operands',()=>{
 for(let a=1;a<=9;a++){
  const list=makePlaylist('tour',1,a);
  assert.ok(list.every(q=>q.a===a));
  for(let i=0;i<63;i+=9)assert.equal(new Set(list.slice(i,i+9).map(q=>q.b)).size,9);
 }
});
test('multi-note rhythm measures hits and stars need both maths and rhythm',()=>{
 const q={...makeQuestion(7,8),gameId:1};
 const result={value:56,performed:true,sequence:{hits:2,total:6,perfect:1,maxCombo:2,events:[]}};
 const r=grade(q,result);assert.equal(r.correct,true);assert.equal(r.rhythm,'off');
 assert.equal(summarize([r]).rhythmHits,2);assert.equal(summarize([r]).rhythmTotal,6);
 assert.equal(record(newSave(),[r]).stars[1],2);
 const perfect=grade(q,{...result,sequence:{...result.sequence,hits:6}});
 assert.equal(record(newSave(),[perfect]).stars[1],3);
});
