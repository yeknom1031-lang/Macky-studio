import test from 'node:test';
import assert from 'node:assert/strict';
import {SingleAnswerRound} from '../src/single-answer.js';
import {grade,BEAT} from '../src/festival-core.js';
const q={gameId:1,a:6,b:8,answer:48};
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
 const r=new SingleAnswerRound();assert.equal(r.inputdown(48,8).type,'ignored');r.inputup();
 assert.equal(r.result().answerValue,null);assert.equal(r.update(14).length,1);assert.equal(r.update(15).length,0);
 assert.equal(r.inputdown(48,15).type,'ignored');
 assert.equal(grade(q,{value:null,performed:false,sequence:r.result()}).points,0);
});
test('true/false uses one chosen decision and scores arithmetic independently of the beat',()=>{
 const r=new SingleAnswerRound();r.inputdown(0,10);
 const score=grade({...q,gameId:21,claimed:49,truth:false},{value:0,performed:true,sequence:r.result()});
 assert.equal(score.correct,true);assert.equal(score.points,100);assert.equal(score.rhythm,'off');
});
