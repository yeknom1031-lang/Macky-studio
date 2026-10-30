import test from 'node:test';
import assert from 'node:assert/strict';
import {carnivalChart,CarnivalRound,CARNIVAL_IDS,carnivalTiming} from '../src/carnival-core.js';
import {normalizeSave,newSave,record,BEAT} from '../src/festival-core.js';
test('all twelve carnival games use correct unique choices and all requested tables',()=>{
 for(const gameId of CARNIVAL_IDS)for(let table=0;table<=9;table++){
  const rows=carnivalChart({gameId,table,count:18});assert.equal(rows.length,18);
  for(const q of rows){assert.equal(q.answer,q.inverse?q.b:q.a*q.b);assert.equal(new Set(q.choices).size,3);assert.equal(q.choices.filter(v=>v===q.answer).length,1);assert.ok(q.choices.every(v=>Number.isInteger(v)&&v>0&&v<=81));if(table)assert.equal(q.a,table);}
  if(!table&&gameId!==34)assert.equal(new Set(rows.slice(0,9).map(q=>q.a)).size,9);
 }
});
test('keychain inverse questions reuse the earned product rather than an unrelated fact',()=>{const rows=carnivalChart({gameId:34});for(let i=1;i<rows.length;i+=2){assert.equal(rows[i].inverse,true);assert.equal(rows[i].a,rows[i-1].a);assert.equal(rows[i].b,rows[i-1].b);assert.ok(rows[i].choices.every(v=>v<=9));}});
test('tour includes three rounds of each new game in order',()=>{const rows=carnivalChart({tour:true});assert.equal(rows.length,36);assert.deepEqual([...new Set(rows.map(q=>q.gameId))],CARNIVAL_IDS);for(const id of CARNIVAL_IDS)assert.equal(rows.filter(q=>q.gameId===id).length,3);});
test('early answers work during speech and one input cannot become a second answer',()=>{for(const offset of [-300,0,300]){const q=carnivalChart()[0],r=new CarnivalRound(q,{voiceSeconds:3,offset});const answer=r.submit(q.choices.indexOf(q.answer),0);assert.equal(answer.points,100);assert.equal(r.submit(0,1),null);assert.equal(r.advance(20),null);}});
test('timing is a bonus only and a wrong answer never earns points',()=>{const q=carnivalChart()[0];for(const [delta,bonus] of [[0,50],[.25,25],[.5,0]]){const r=new CarnivalRound(q);assert.equal(r.submit(q.choices.indexOf(q.answer),r.target+delta).timingBonus,bonus);}const r=new CarnivalRound(q);assert.equal(r.submit((q.choices.indexOf(q.answer)+1)%3,r.target).points,0);});
test('invalid input and timeouts cannot strand or double count a round',()=>{const q=carnivalChart()[0],r=new CarnivalRound(q);for(const lane of [-1,3,1.5,NaN])assert.equal(r.submit(lane,0),null);assert.equal(r.submit(0,-1),null);assert.equal(r.submit(0,NaN),null);assert.equal(r.submit(0,100),null);const missed=r.advance(100);assert.equal(missed.value,null);assert.equal(missed.points,0);assert.equal(r.advance(101),null);});
test('long questions move the bonus target after speech without locking early input',()=>{for(const seconds of [0,1,2.5,4,8]){const t=carnivalTiming(seconds);assert.ok(t.target>=seconds+.4);assert.ok(t.deadline>t.target+.32);assert.ok(Math.abs(t.target/BEAT-Math.round(t.target/BEAT))<1e-8);}});
test('new game stars persist through normalization and watch does not create progress',()=>{const rows=CARNIVAL_IDS.map(gameId=>{const q=carnivalChart({gameId})[0],r=new CarnivalRound(q);return r.submit(q.choices.indexOf(q.answer),r.target);});const save=record(newSave(),rows),restored=normalizeSave(JSON.parse(JSON.stringify(save)));for(const id of CARNIVAL_IDS)assert.equal(restored.stars[id],3);assert.equal(restored.correct,12);assert.deepEqual(record(restored,rows.map(r=>({...r,watch:true}))),restored);});
