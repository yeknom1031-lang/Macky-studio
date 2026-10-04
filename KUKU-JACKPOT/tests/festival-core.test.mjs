import test from 'node:test';
import assert from 'node:assert/strict';
import {BEAT,falseClaims,makeQuestion,makeStageQuestion,makePlaylist,queueBasketballRetry,grade,summarize,newSave,record,normalizeSave} from '../src/festival-core.js';
test('every multiplication has exactly one valid answer and matching truth statement',()=>{for(let a=1;a<10;a++)for(let b=1;b<10;b++)for(const random of [()=>.1,()=>.9]){const q=makeQuestion(a,b,random);assert.equal(q.answer,a*b);assert.equal(new Set(q.choices).size,3);assert.ok(q.choices.every(n=>n>=1&&n<=81));assert.equal(q.choices.filter(n=>n===a*b).length,1);assert.equal(q.claimed===a*b,q.truth);}});
test('whole tour keeps 63 questions and fixed table, with only an explicit reversed-sock exception',()=>{const list=makePlaylist('tour',1,7,()=>.2);assert.equal(list.length,63);assert.deepEqual([...new Set(list.map(q=>q.gameId))],Array.from({length:21},(_,i)=>i+1));assert.ok(list.every(q=>q.a===7||(q.gameId===13&&q.b===7&&q.lesson.tableException)));assert.equal(new Set(makePlaylist('mix',1,7).map(q=>q.gameId)).size,5);});
test('arithmetic and rhythm are independent, truth uses boolean rather than product',()=>{const q={...makeQuestion(7,8,()=>.1),gameId:1};assert.equal(grade(q,{value:56,performed:true,hitTime:0}).correct,true);assert.equal(grade(q,{value:55,performed:true,hitTime:12*BEAT}).rhythm,'perfect');assert.equal(grade(q,{value:55,performed:true,hitTime:12*BEAT}).correct,false);assert.equal(grade({...q,gameId:21},{value:0,performed:true,hitTime:12*BEAT}).correct,true);assert.equal(grade(q,{value:null,performed:false,hitTime:null}).rhythm,'miss');});
test('watch sessions never change progress and wrong answers are queued for review',()=>{const good=grade({...makeQuestion(7,8),gameId:1},{value:56,performed:true,hitTime:12*BEAT});const bad={...good,correct:false,a:9,b:9,answer:81};const save=newSave();assert.deepEqual(record(save,[{...good,watch:true}]),normalizeSave(save));const next=record(save,[good,bad]);assert.equal(next.plays,1);assert.equal(next.correct,1);assert.equal(next.facts['9-9'].lastCorrect,false);assert.deepEqual(summarize([good,bad,bad]).review,[{a:9,b:9}]);});
test('review contains only the actual missed facts and settings reject corrupt values',()=>{const list=makePlaylist('review',1,7,Math.random,[{a:3,b:8},{a:9,b:7}]);assert.ok(list.every(q=>q.a===3&&q.b===8||q.a===9&&q.b===7));const s=normalizeSave({version:1,settings:{music:1000,offset:-999},stars:{1:100}});assert.equal(s.settings.music,100);assert.equal(s.settings.offset,-300);assert.equal(s.stars[1],3);});

test('mixed anchors balance every table; explicitly linked teaching facts may repeat',()=>{
 for(let seed=1;seed<=20;seed++){
  let state=seed;const random=()=>((state=(state*1664525+1013904223)>>>0)/4294967296);
  const list=makePlaylist('tour',1,undefined,random);
  const anchors=list.filter(q=>!q.lesson.linked);
  for(let i=0;i+9<=anchors.length;i+=9)assert.deepEqual(anchors.slice(i,i+9).map(q=>q.a).sort(),[1,2,3,4,5,6,7,8,9]);
  assert.ok(list.filter(q=>q.lesson.linked).every(q=>[5,12,13].includes(q.gameId)));
  assert.ok(new Set(list.map(q=>q.a)).size===9);
 }
 assert.equal(new Set(makePlaylist('single',1).map(q=>q.a)).size,5);
});
test('fixed-table ordinary practice gives distinct operands and stage quantities stay valid',()=>{
 for(let a=1;a<=9;a++){
  const list=makePlaylist('single',1,a);
  assert.ok(list.every(q=>q.a===a));
  assert.equal(new Set(list.map(q=>q.b)).size,5);
  for(const q of makePlaylist('tour',1,a)){assert.ok(q.a>=1&&q.a<=9&&q.b>=1&&q.b<=9);assert.equal(q.answer,q.a*q.b);}
 }
});

test('false claims vary above and below the answer and match the recorded-voice candidate contract',()=>{
 for(let a=1;a<=9;a++)for(let b=1;b<=9;b++){
  const claims=falseClaims(a,b);assert.ok(claims.length>=(a===1&&b===1?1:2));
  assert.equal(new Set(claims).size,claims.length);
  for(const c of claims)assert.ok(c>=1&&c<=81&&c!==a*b);
  const seen=new Set();
  for(let i=0;i<claims.length;i++){let calls=0;const q=makeQuestion(a,b,()=>calls++===0?.1:(i+.01)/claims.length);assert.equal(q.truth,false);seen.add(q.claimed);}
  assert.deepEqual([...seen],claims);
 }
 assert.deepEqual(falseClaims(7,8),[49,63,55,57]);
 assert.deepEqual(falseClaims(9,9),[72,80]);
});

test('frog questions form a real consecutive multiples path without wrapping 9 to 1',()=>{
 for(const mode of ['single','mix','tour'])for(let a=1;a<=9;a++){
  const stage=(mode==='mix'?makePlaylist(mode,5,a,()=>.1):makePlaylist(mode,5,a)).filter(q=>q.gameId===5);
  for(let i=0;i<stage.length;i++){
   const q=stage[i];assert.equal(q.lesson.from+q.lesson.step,q.answer);
   assert.equal(q.lesson.path.at(-1),q.answer);
   if(i){assert.equal(q.a,stage[i-1].a);assert.equal(q.b,stage[i-1].b+1);assert.equal(q.lesson.from,stage[i-1].answer);}
  }
 }
});

test('ghost teaches a true fact then tests the same fact without showing a hint; it never changes input rules',()=>{
 for(const lengthMode of ['single','tour']){
  const stage=makePlaylist(lengthMode,12,7).filter(q=>q.gameId===12);
  assert.ok(stage[0].lesson.showHint);assert.equal(stage[0].lesson.hintUntilBeat,5.5);
  for(const q of stage.slice(-2)){
   assert.equal(q.lesson.showHint,false);
   const original=stage[q.lesson.recallOf];assert.ok(original.lesson.showHint);
   assert.deepEqual([q.a,q.b,q.answer],[original.a,original.b,original.answer]);
   assert.equal('openBeat' in q.lesson,false);
  }
 }
});

test('socks actually reverse the preceding operands, including the disclosed fixed-table exception',()=>{
 const stage=makePlaylist('single',13,7,()=>.2);
 for(const i of [1,3]){
  assert.equal(stage[i].a,stage[i-1].b);assert.equal(stage[i].b,stage[i-1].a);
  assert.equal(stage[i].answer,stage[i-1].answer);assert.equal(stage[i].lesson.pairId,stage[i-1].lesson.pairId);
  assert.deepEqual(stage[i].lesson.partner,{a:stage[i-1].a,b:stage[i-1].b,answer:stage[i-1].answer});
  assert.equal(stage[i].lesson.role,'second');assert.equal(stage[i].lesson.fixedTable,7);
 }
 for(const mode of ['single','tour']){
  const socks=makePlaylist(mode,13,7).filter(q=>q.gameId===13),last=socks.at(-1),previous=socks.at(-2);
  assert.equal(last.lesson.role,'second');assert.equal(last.lesson.finalPair,true);assert.equal(last.lesson.pairId,previous.lesson.pairId);
  assert.deepEqual([last.a,last.b,last.answer],[previous.b,previous.a,previous.answer]);
 }
 const squares=makePlaylist('single',13,9,()=>.99);
 assert.ok(squares.filter(q=>q.lesson.role==='first').every(q=>q.a!==q.b));
 const squareReview=makePlaylist('review',13,9,()=>.99,[{a:9,b:9}]);
 assert.ok(squareReview.every(q=>q.a===9&&q.b===9));
});

test('neighbor lessons prove the next fact with exactly one additional group, including b=1',()=>{
 for(let a=1;a<=9;a++)for(let b=1;b<=9;b++){
  const q=makeStageQuestion(14,a,b);const {known,step}=q.lesson;
  assert.equal(known.answer+step,q.answer);assert.equal(known.b+1,b);assert.equal(known.a,a);
 }
 assert.throws(()=>makeStageQuestion(14,7,10),RangeError);
});

test('basketball schedules one actual repeat after a spacer without increasing the deck or changing other games',()=>{
 const list=makePlaylist('single',11,7),original=list[0],spacer=list[1];
 const queued=queueBasketballRetry(list,0,{correct:false});
 assert.equal(queued.queued,true);assert.equal(queued.targetIndex,2);assert.equal(list.length,5);assert.equal(list[1],spacer);
 assert.deepEqual([list[2].a,list[2].b],[original.a,original.b]);assert.equal(list[2].lesson.retry,true);
 assert.equal(list[2].lesson.sourceIndex,0);assert.equal(queueBasketballRetry(list,2,{correct:false}).queued,false);
 assert.equal(queueBasketballRetry(list,3,{correct:false}).targetIndex,4,'last available round is the disclosed immediate rebound fallback');
 assert.equal(queueBasketballRetry(list,4,{correct:false}).queued,false);
 assert.equal(queueBasketballRetry(list,1,{correct:true}).queued,false);
 assert.equal(queueBasketballRetry(list,1,{correct:false,watch:true}).queued,false);
 const tour=makePlaylist('tour',11,7),last=tour.findLastIndex(q=>q.gameId===11),next=tour[last+1];
 assert.equal(queueBasketballRetry(tour,last,{correct:false}).queued,false);assert.equal(tour[last+1],next);
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
