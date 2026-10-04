import test from 'node:test';
import assert from 'node:assert/strict';
import{getPattern,RhythmRound,PERFECT_WINDOW,NICE_WINDOW}from'../src/festival-rhythm.js';

test('21 motifs repeat exactly one four-beat phrase, with holds only on the intended stages',()=>{
  const signatures=new Set();
  for(let id=1;id<=21;id++){
    const p=getPattern(id),half=p.notes.length/2;assert.ok(p.name&&p.verb&&p.instruction);assert.ok(Number.isInteger(half));
    for(let i=0;i<half;i++){assert.equal(p.notes[i+half].beat,p.notes[i].beat+4);assert.equal(p.notes[i+half].end,p.notes[i].end===undefined?undefined:p.notes[i].end+4);}
    assert.ok(p.notes.every(n=>n.beat>=8&&n.beat<16&&(n.end===undefined||n.end<16)));
    assert.equal(p.notes.some(n=>n.end!==undefined),[3,10,16,19].includes(id));signatures.add(JSON.stringify(p.notes));
  }
  assert.ok(signatures.size>=16);
});

test('all stages can be played perfectly; each note records the actual answer without correcting it',()=>{
  for(let id=1;id<=21;id++){
    const p=getPattern(id),r=new RhythmRound(p);
    for(const note of p.notes){const start=r.inputdown(42,note.beat);assert.equal(start.success,true);if(note.end!==undefined){assert.equal(start.type,'hold-start');assert.equal(r.inputup(note.end).success,true);}}
    r.update(17);const result=r.result();assert.equal(result.hits,p.notes.length);assert.equal(result.perfect,p.notes.length);assert.equal(result.maxCombo,p.notes.length);assert.equal(result.answerValue,42);assert.equal(result.misses,0);assert.equal(result.complete,true);assert.ok(result.events.every(e=>e.value===42));
  }
});

test('perfect/nice windows have inclusive boundaries and an off-beat tap does not consume the next note',()=>{
  const r=new RhythmRound(1);assert.equal(r.inputdown(49,8-PERFECT_WINDOW).timing,'perfect');assert.equal(r.inputdown(49,9+NICE_WINDOW).timing,'nice');
  const stray=r.inputdown(42,11);assert.equal(stray.type,'stray');assert.equal(r.result().answerValue,42);assert.equal(r.inputdown(49,12).success,true);assert.equal(r.result().events.find(e=>e.index===3).value,49);
});

test('stray and rapid presses can change the arithmetic choice without inventing rhythm hits',()=>{
  const r=new RhythmRound(1);r.inputdown(49,8);const duplicate=r.inputdown(42,8.05);assert.equal(duplicate.type,'ignored');assert.equal(r.result().hits,1);assert.equal(r.result().answerValue,42);r.inputdown(56,8.5);assert.equal(r.result().hits,1);assert.equal(r.result().answerValue,56);assert.equal(r.result().strays,1);assert.equal(r.inputdown(49,9).success,true);
});

test('presses outside the play window or invalid values never change the last answer',()=>{
  const r=new RhythmRound(1);r.inputdown(49,8);r.inputdown(42,7);r.inputdown(56,16.5);r.inputdown(NaN,9);assert.equal(r.result().answerValue,49);
});

test('holds require both a valid beginning and a valid release',()=>{
  const p=getPattern(19),r=new RhythmRound(p);assert.equal(r.inputdown(49,8.1).type,'hold-start');assert.equal(r.result().hits,0);assert.equal(r.inputup(11.1).timing,'perfect');assert.equal(r.inputdown(49,12.3).type,'hold-start');assert.equal(r.inputup(15).timing,'nice');assert.equal(r.result().hits,2);assert.equal(r.result().perfect,1);
  const early=new RhythmRound(19);early.inputdown(49,8);assert.equal(early.inputup(10).success,false);assert.equal(early.result().misses,1);
  const late=new RhythmRound(19);late.inputdown(49,8);assert.equal(late.update(11.4)[0].reason,'held-too-long');assert.equal(late.inputup(11.5).type,'ignored');assert.equal(late.result().misses,1);
});

test('holding, releasing and cancellation can never record the same note twice',()=>{
  const r=new RhythmRound(19);r.inputdown(49,8);r.inputdown(42,8.5);assert.equal(r.result().answerValue,42);r.cancel(9);r.inputup(11);r.update(12);assert.equal(r.result().events.filter(e=>e.index===0).length,1);assert.equal(r.inputdown(49,12).type,'hold-start');assert.equal(r.inputup(15).success,true);
});

test('timeouts finish every note once, leave unanswered arithmetic null, and reset combos',()=>{
  const r=new RhythmRound(8);assert.equal(r.update(17).length,8);assert.equal(r.update(18).length,0);assert.equal(r.result().answerValue,null);assert.equal(r.result().misses,8);assert.equal(r.result().complete,true);
  const combo=new RhythmRound(7);combo.inputdown(49,8);combo.inputdown(49,9);combo.update(10.5);combo.inputdown(49,11);assert.equal(combo.result().maxCombo,2);assert.equal(combo.result().combo,1);
});

test('four-beat shifted patterns preserve all input windows and timeout behavior',()=>{
  const base=getPattern(21),p={...base,notes:base.notes.map(n=>({...n,beat:n.beat+4,...(n.end===undefined?{}:{end:n.end+4})}))};const r=new RhythmRound(p);
  assert.equal(r.inputdown(1,8).type,'ignored');for(const n of p.notes)r.inputdown(0,n.beat);r.inputdown(1,20);assert.equal(r.result().answerValue,1);assert.equal(r.result().hits,p.notes.length);assert.equal(r.result().strays,1);
});

test('patterns and result snapshots are defensive, ordered, and validate malformed notes',()=>{
  const p=getPattern(1),r=new RhythmRound(p);p.notes[0].beat=900;r.inputdown(49,8);const result=r.result();result.events[0].value=999;assert.equal(r.result().events[0].value,49);assert.throws(()=>new RhythmRound({notes:[{beat:8,end:7}]}),RangeError);assert.throws(()=>new RhythmRound({notes:[{beat:9},{beat:8}]}),RangeError);assert.throws(()=>getPattern(0),RangeError);
});
