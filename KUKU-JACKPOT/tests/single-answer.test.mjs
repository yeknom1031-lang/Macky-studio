import test from 'node:test';
import assert from 'node:assert/strict';
import {SingleAnswerRound,SINGLE_TIMING,answeredTimeline} from '../src/single-answer.js';
import {grade,BEAT} from '../src/festival-core.js';
const q={gameId:1,a:6,b:8,answer:48};
test('early answers finish sooner on a bar boundary without cutting either equation or the response',()=>{
 for(const questionSeconds of [1.2,2.5,3.2])for(const answerSeconds of [1.5,2.6]){
  const timing=answeredTimeline(1,{questionSeconds,answerSeconds});
  assert.ok(timing.reveal>=3);
  assert.ok((timing.reveal-.2)*BEAT>=questionSeconds);
  assert.ok((timing.round-timing.reveal)*BEAT>=answerSeconds+1.5);
  assert.equal(timing.round%4,0);assert.ok(timing.round<24);
  assert.equal(timing.target,12);assert.equal(timing.play,0);
 }
 const late=answeredTimeline(13.9);assert.equal(late.reveal,14);assert.equal(late.round,24);
});
test('a delayed question frame cannot overlap the answer voice, including a start past the normal reveal deadline',()=>{
 for(const questionStartBeat of [1,4,13]){
  const timing=answeredTimeline(questionStartBeat+.1,{questionStartBeat,questionSeconds:2.4,answerSeconds:2});
  assert.ok(timing.reveal*BEAT>(questionStartBeat*BEAT+2.4));
  assert.ok((timing.round-timing.reveal)*BEAT>=3.6);
  assert.equal(timing.round%4,0);
 }
});
test('the first answer is locked, including a wrong answer; repeated taps cannot fish for points',()=>{
 const r=new SingleAnswerRound();assert.equal(r.inputdown(42,12).type,'answer');
 assert.equal(r.inputdown(48,12.1).type,'ignored');r.inputup();r.update(20);
 assert.equal(r.result().answerValue,42);
 const score=grade(q,{value:r.result().answerValue,performed:true,sequence:r.result()});
 assert.equal(score.correct,false);assert.equal(score.points,0);assert.equal(score.timingBonus,0);
});
test('a correct answer counts even far from the beat; only timing adds bonus points',()=>{
 for(const [ms,bonus] of [[0,50],[140,50],[250,25],[450,0],[-950,0]]){
  const r=new SingleAnswerRound();r.inputdown(48,12+ms/(BEAT*1000));
  const score=grade(q,{value:48,performed:true,sequence:r.result()});
  assert.equal(score.correct,true);assert.equal(score.timingBonus,bonus);assert.equal(score.points,100+bonus);
 }
});
test('no answer is selected by countdown, release, timeout or an out-of-window tap',()=>{
 const r=new SingleAnswerRound();assert.equal(r.inputdown(48,-.01).type,'ignored');r.inputup();
 assert.equal(r.result().answerValue,null);assert.equal(r.update(14).length,1);assert.equal(r.update(15).length,0);
 assert.equal(r.inputdown(48,15).type,'ignored');
 assert.equal(grade(q,{value:null,performed:false,sequence:r.result()}).points,0);
});
test('answers are accepted from the first question frame, throughout speech and countdown',()=>{
 assert.equal(SINGLE_TIMING.play,0);
 for(const beat of [0,.01,2,8.99,9,10,11,12,13.99]){
  const r=new SingleAnswerRound();assert.equal(r.inputdown(48,beat).type,'answer');
  assert.equal(r.result().answerValue,48);
  assert.equal(r.inputdown(42,12).type,'ignored');
  const score=grade(q,{value:r.result().answerValue,performed:true,sequence:r.result()});
  assert.equal(score.correct,true);assert.equal(score.points,beat===12?150:100);
 }
});
test('early wrong answers stay locked and never score or turn into automatic correct answers',()=>{
 const r=new SingleAnswerRound();r.inputdown(42,0);
 assert.equal(r.inputdown(48,12).type,'ignored');r.update(14);
 const score=grade(q,{value:r.result().answerValue,performed:true,sequence:r.result()});
 assert.equal(score.correct,false);assert.equal(score.points,0);assert.equal(r.result().answerValue,42);
});
test('calibration changes the bonus only; it cannot delay opening or move the answer deadline',()=>{
 for(const offsetMs of [-300,0,300]){
  const early=new SingleAnswerRound();assert.equal(early.inputdown(48,0,{offsetMs}).type,'answer');
  assert.equal(early.result().timing,'off');
  const aligned=new SingleAnswerRound();aligned.inputdown(48,12+offsetMs/(BEAT*1000),{offsetMs});
  assert.equal(aligned.result().timing,'perfect');
  const late=new SingleAnswerRound();assert.equal(late.inputdown(48,13.99,{offsetMs}).type,'answer');
  const closed=new SingleAnswerRound();assert.equal(closed.inputdown(48,14,{offsetMs}).type,'ignored');
  assert.equal(closed.update(14).length,1);
 }
});
test('true/false uses one chosen decision and scores arithmetic independently of the beat',()=>{
 const r=new SingleAnswerRound();r.inputdown(0,10);
 const score=grade({...q,gameId:21,claimed:49,truth:false},{value:0,performed:true,sequence:r.result()});
 assert.equal(score.correct,true);assert.equal(score.points,100);assert.equal(score.rhythm,'off');
});
