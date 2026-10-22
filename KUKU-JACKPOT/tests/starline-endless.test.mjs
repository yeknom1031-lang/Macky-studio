import test from 'node:test';
import assert from 'node:assert/strict';
import {EndlessStarlineSession,endlessProfile} from '../src/starline-core.js';
import {newSave,normalizeSave,record} from '../src/festival-core.js';
import {updateEndlessRecords,normalizeEndlessRecords} from '../src/starline-records.js';
const lane=q=>q.choices.indexOf(q.answer);

test('endless generates beyond 24 and 81 questions, preserving each visible deadline and balanced tables',()=>{
 const s=new EndlessStarlineSession({random:()=>.23}),seen=[];
 for(let i=0;i<120;i++){
  const q=s.chart[i],before={...q};assert.equal(q.index,i);assert.ok(q.deadline<q.end);assert.ok(q.deadline>=q.target);
  assert.equal(s.submit(lane(q),q.start).correct,true);assert.equal(s.done,false);assert.deepEqual(q,before);
  assert.equal(s.chart[i+1].start,q.end);assert.ok(s.chart.length>=i+3);seen.push(q.a);
 }
 for(let i=0;i+9<=seen.length;i+=9)assert.equal(new Set(seen.slice(i,i+9)).size,9);
 assert.equal(s.correctCount,120);assert.ok(s.score>=12000);
 assert.ok(s.chart[24].bpm>220);assert.equal(s.chart[40].bpm,330);assert.ok(s.chart[44].beats<s.chart[40].beats);
});
test('one wrong answer ends endless and no further answers or fabricated misses can change it',()=>{
 const s=new EndlessStarlineSession();for(let i=0;i<3;i++)s.submit(lane(s.chart[i]),s.chart[i].start);
 const q=s.chart[3],r=s.submit((lane(q)+1)%3,q.target);assert.equal(r.correct,false);assert.equal(s.done,true);assert.equal(s.correctCount,3);
 assert.equal(s.submit(lane(q),q.target+.01),null);assert.deepEqual(s.advance(1e6),[]);assert.equal(s.results.size,4);assert.equal(s.score,300);
});
test('timeout ends on the first unanswered question even when the frame skips far ahead',()=>{
 const s=new EndlessStarlineSession();s.submit(lane(s.chart[0]),0);
 const missed=s.advance(1e6);assert.equal(missed.length,1);assert.equal(missed[0].index,1);assert.equal(missed[0].value,null);assert.equal(s.done,true);assert.equal(s.results.size,2);
});
test('endless early and calibrated taps are accepted at fast density with no double credit',()=>{
 const s=new EndlessStarlineSession({offset:200,table:7});
 for(let i=0;i<45;i++){const q=s.chart[i];assert.equal(q.a,7);assert.ok(s.submit(lane(q),q.start));assert.equal(s.submit(lane(q),q.start),null);}
 assert.equal(s.done,false);assert.equal(s.correctCount,45);assert.ok(endlessProfile(44).speed>endlessProfile(40).speed);
});
test('records preserve independent high scores and runs, survive save normalization, and separate tables',()=>{
 let out=updateEndlessRecords({}, {correct:28,score:3000,maxBpm:264,maxSpeed:2},{finished:true});
 out=updateEndlessRecords(out.records,{correct:30,score:3000,maxBpm:286,maxSpeed:2.17},{finished:true});
 out=updateEndlessRecords(out.records,{correct:2,score:200,maxBpm:132,maxSpeed:1},{finished:true});
 assert.equal(out.record.bestCorrect,30);assert.equal(out.record.bestScore,3000);assert.equal(out.record.bestBpm,286);assert.equal(out.record.runs,3);
 out=updateEndlessRecords(out.records,{correct:4,score:600,maxBpm:132,maxSpeed:1},{table:7});
 assert.equal(out.records['7'].bestCorrect,4);assert.equal(out.records.mix.bestCorrect,30);
 const saved={...newSave(),endlessRecords:out.records};
 assert.deepEqual(normalizeSave(JSON.parse(JSON.stringify(saved))).endlessRecords,out.records);
 assert.deepEqual(record(saved,[{a:1,b:1,gameId:1,correct:true,rhythm:'perfect'}]).endlessRecords,out.records);
});
test('progress checkpoints preserve an unfinished best without counting a completed run or a demonstration',()=>{
 const first=updateEndlessRecords({}, {correct:12,score:1200,maxBpm:176,maxSpeed:1.33});assert.equal(first.record.runs,0);
 assert.equal(updateEndlessRecords(first.records,{correct:10,score:1000,maxBpm:176,maxSpeed:1.33}).changed,false);
 const demo=updateEndlessRecords(first.records,{correct:80,score:12000,maxBpm:330,maxSpeed:100},{watch:true,finished:true});assert.deepEqual(demo.records,first.records);
});
test('old saves and malformed record fields do not corrupt the rest of a save',()=>{
 const old=newSave();delete old.endlessRecords;old.correct=22;const normalized=normalizeSave(old);assert.equal(normalized.correct,22);assert.deepEqual(normalized.endlessRecords,{});
 assert.deepEqual(normalizeEndlessRecords({mix:{bestCorrect:NaN,bestScore:-4,bestBpm:Infinity,bestSpeed:'broken',runs:null},invalid:{bestCorrect:999}}),{mix:{bestCorrect:0,bestScore:0,bestBpm:0,bestSpeed:0,runs:0}});
});
