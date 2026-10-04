import test from 'node:test';
import assert from 'node:assert/strict';
import { BEAT, END, INTRO, ROUND, TARGET, makeCourse, position, judge, summarize, missedStop } from '../core.js';

test('the course covers all nine facts with three distinct, valid choices',()=>{
  for(let k=0;k<500;k++){
    const course=makeCourse(k%2?'learn':'challenge');
    assert.deepEqual(course.map(q=>q.n).sort((a,b)=>a-b),[1,2,3,4,5,6,7,8,9]);
    course.forEach((q,i)=>{assert.equal(q.answer,q.n*7);assert.equal(new Set(q.choices).size,3);assert(q.choices.includes(q.answer));assert(q.choices.every(n=>n>0&&n<=81));assert.equal(q.start,INTRO+i*ROUND);});
  }
});
test('beat timeline has no boundary overlap and exactly nine rounds',()=>{
  assert.equal(position(INTRO-.001).phase,'intro');
  assert.equal(position(INTRO).index,0);
  assert.equal(position(INTRO+ROUND-.001).index,0);
  assert.equal(position(INTRO+ROUND).index,1);
  assert.equal(position(INTRO+9*ROUND).phase,'outro');
  assert.equal(END*BEAT,160*60/144);
});
test('correctness does not depend on rhythmic accuracy',()=>{
  const q=makeCourse('learn')[6];
  const correctButEarly=judge(q,49,4.5);
  assert.equal(correctButEarly.correct,true);assert.equal(correctButEarly.rhythm,'off');
  const wrongButOnTime=judge(q,48,TARGET);
  assert.equal(wrongButOnTime.correct,false);assert.equal(wrongButOnTime.rhythm,'perfect');
});
test('timing offset compensates for consistent late input without altering answer',()=>{
  const q=makeCourse('learn')[0];
  const beat=TARGET+.180/BEAT;
  assert.equal(judge(q,7,beat).rhythm,'great');
  assert.equal(judge(q,7,beat,180).rhythm,'perfect');
  assert(Math.abs(judge(q,7,beat,180).errorMs)<.001);
});
test('results mark unanswered facts for review and rhythm is independent',()=>{
  const results=[{n:1,correct:true,rhythm:'off'},{n:2,correct:false,rhythm:'perfect'},{n:3,correct:false,rhythm:'miss'}];
  assert.deepEqual(summarize(results),{correct:1,perfect:1,rhythm:1,review:[2,3]});
});
test('a correct selection still counts when the stop button is missed',()=>{
  const q=makeCourse('learn')[6];
  assert.equal(missedStop(q,49).correct,true);
  assert.equal(missedStop(q,49).rhythm,'miss');
  assert.equal(missedStop(q,null).correct,false);
  assert.equal(missedStop(q,48).correct,false);
});
