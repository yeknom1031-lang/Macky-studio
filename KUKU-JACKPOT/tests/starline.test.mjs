import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {makeStarlineChart,StarlineSession,STARLINE_MODES,STARLINE_TEMPOS,expertTempo} from '../src/starline-core.js';import {BEAT,newSave,record,normalizeSave} from '../src/festival-core.js';
const correct=q=>q.choices.indexOf(q.answer);
test('starline charts balance tables and preserve the selected table, with three unique valid choices',()=>{for(let table=0;table<=9;table++)for(const mode of Object.keys(STARLINE_MODES)){const chart=makeStarlineChart({table,mode,random:()=>.23});assert.equal(chart.length,STARLINE_MODES[mode].count);for(const q of chart){assert.equal(q.gameId,22);assert.equal(q.answer,q.a*q.b);assert.equal(new Set(q.choices).size,3);assert.equal(q.choices.filter(x=>x===q.answer).length,1);assert.ok(q.choices.every(x=>x>=1&&x<=81));if(table)assert.equal(q.a,table);assert.ok(q.target+.36<q.end);}if(!table&&chart.length>=9)assert.equal(new Set(chart.slice(0,9).map(q=>q.a)).size,9);}});
test('early answer, perfect and nice give separate bonuses and never accept a second lane',()=>{const chart=makeStarlineChart(),s=new StarlineSession(chart);let r=s.submit(correct(chart[0]),0);assert.equal(r.points,100);assert.equal(s.submit((correct(chart[0])+1)%3,.1),null);r=s.submit(correct(chart[1]),chart[1].target);assert.equal(r.points,150);r=s.submit(correct(chart[2]),chart[2].target+.25);assert.equal(r.points,125);assert.equal(s.score,375);assert.equal(s.combo,3);});
test('wrong answers never receive rhythm points or become corrected recorded answers',()=>{const chart=makeStarlineChart(),s=new StarlineSession(chart),q=chart[0],lane=(correct(q)+1)%3;const r=s.submit(lane,q.target);assert.equal(r.points,0);assert.equal(r.rhythm,'perfect');assert.equal(r.value,q.choices[lane]);assert.equal(s.submit(correct(q),q.target+.1),null);s.advance(q.end);assert.equal(s.results.get(0).value,q.choices[lane]);});
test('expired and skipped rounds advance once and a late frame does not strand the result screen',()=>{const chart=makeStarlineChart(),s=new StarlineSession(chart);assert.equal(s.submit(0,-.01),null);assert.equal(s.submit(0,chart[0].target+.361),null);const missed=s.advance(chart.at(-1).end+10);assert.equal(missed.length,chart.length);assert.equal(s.done,true);assert.equal(s.advance(999).length,0);assert.equal(s.score,0);assert.equal(s.submit(1,999),null);});
test('calibration only changes bonus; early inputs remain open and invalid lanes cannot lock a question',()=>{const chart=makeStarlineChart();for(const offset of [-300,0,300]){const s=new StarlineSession(chart,{offset});for(const lane of [-1,3,NaN,.5])assert.equal(s.submit(lane,0),null);assert.equal(s.submit(correct(chart[0]),0).points,100);}const s=new StarlineSession(chart,{offset:200});assert.equal(s.submit(correct(chart[0]),chart[0].target+.2).timingBonus,50);});
test('new stage stars persist, all facts record and demonstrations do not change progress',()=>{const chart=makeStarlineChart(),s=new StarlineSession(chart);chart.forEach(q=>s.submit(correct(q),q.target));const result=record(newSave(),[...s.results.values()]);assert.equal(result.stars[22],3);assert.equal(normalizeSave(result).stars[22],3);assert.equal(result.attempts,chart.length);const d=new StarlineSession(chart,{watch:true});chart.forEach(q=>d.submit(correct(q),q.target));assert.deepEqual(record(newSave(),[...d.results.values()]),normalizeSave(newSave()));});
test('every voice fits its fixed measure without overlapping the next question',async()=>{const {clips}=JSON.parse(await readFile(new URL('../assets/audio/festival/manifest.json',import.meta.url),'utf8'));for(const spec of Object.values(STARLINE_MODES).filter(s=>!s.questionVoiceOnly))for(let a=1;a<=9;a++)for(let b=1;b<=9;b++){assert.ok(clips[`q-${a}-${b}`].seconds<spec.target*BEAT);assert.ok(spec.target*BEAT+.4+clips[`a-${a}-${b}`].seconds<spec.beats*BEAT);}});


test('expert accelerates only future measures after four correct answers, up to 220 BPM',()=>{
 const chart=makeStarlineChart({mode:'expert'}),session=new StarlineSession(chart),bpms=[],firstDuration=chart[0].end-chart[0].start;
 for(const q of chart){
  const before={...q},future=chart[q.index+1],nextStart=future?.start;
  assert.equal(q.bpm,expertTempo(q.index));bpms.push(q.bpm);
  const r=session.submit(correct(q),q.start+.02);assert.equal(r.points,100);
  assert.deepEqual(q,before,'the current note cannot jump after a tap');
  if(future){assert.equal(future.start,nextStart);assert.equal(future.bpm,expertTempo(q.index+1));}
 }
 assert.deepEqual([...new Set(bpms)],STARLINE_TEMPOS);assert.equal(session.score,2400);assert.equal(session.maxCombo,24);
 assert.ok(chart.at(-1).end-chart.at(-1).start<firstDuration*.61);
 for(let i=1;i<chart.length;i++)assert.equal(chart[i].start,chart[i-1].end);
 assert.ok(chart.at(-1).end<70);assert.equal(session.done,true);
});
test('expert misses do not accelerate or reset earned tempo and double inputs cannot unlock speed',()=>{
 const chart=makeStarlineChart({mode:'expert'}),s=new StarlineSession(chart);
 for(let i=0;i<4;i++){const q=chart[i];s.submit(correct(q),q.start);assert.equal(s.submit(correct(q),q.target),null);}
 assert.equal(chart[4].bpm,154);s.submit((correct(chart[4])+1)%3,chart[4].target);s.advance(chart[5].target+.4);
 assert.equal(s.correctCount,4);assert.equal(chart[6].bpm,154);assert.equal(s.combo,0);
});
test('timing bonuses keep real millisecond windows at the highest tempo',()=>{
 for(const [delta,bonus] of [[-.14,50],[.25,25],[.34,0]]){
  const chart=makeStarlineChart({mode:'expert'}),s=new StarlineSession(chart);
  for(let i=0;i<16;i++)s.submit(correct(chart[i]),chart[i].start);
  const q=chart[16];assert.equal(q.bpm,220);assert.equal(s.submit(correct(q),q.target+delta).timingBonus,bonus);
 }
});
test('all question recordings fit every expert tempo with unchanged voice pitch',async()=>{
 const {clips}=JSON.parse(await readFile(new URL('../assets/audio/festival/manifest.json',import.meta.url),'utf8'));
 for(const bpm of STARLINE_TEMPOS)for(let a=1;a<=9;a++)for(let b=1;b<=9;b++)assert.ok(clips[`q-${a}-${b}`].seconds+.15<STARLINE_MODES.expert.beats*60/bpm);
});
test('expert watch result is excluded from records after all five speeds',()=>{
 const chart=makeStarlineChart({mode:'expert'}),s=new StarlineSession(chart,{watch:true});for(const q of chart)s.submit(correct(q),q.target);
 assert.equal(s.score,3600);assert.equal(chart.at(-1).bpm,220);assert.deepEqual(record(newSave(),[...s.results.values()]),normalizeSave(newSave()));
});
