import test from 'node:test';
import assert from 'node:assert/strict';
import { GAMES, createMiniGame } from '../src/minigames.js';

const question = { a:7,b:7,answer:49,choices:[42,49,56],claimed:56,truth:false,missing:'ones' };
const held = new Set([3,10,16,19]);
function ready(id,q=question){const game=createMiniGame(id,q);game.update({time:2,beat:4,phase:'play'});return game;}
function finish(game,value,time=3){
  game.choose(value,time);
  if(!game.completed){
    if(held.has(game.game.id)){
      game.pointer('down',500,410,time+.1);
      game.pointer('up',500,410,time+.6);
    }else{
      for(let i=0;i<3&&!game.completed;i++)game.key(' ',time+.1+i*.2);
    }
  }
  return game.getResult();
}

test('21 unique minigames expose distinct mechanic families and useful instructions',()=>{
  assert.equal(GAMES.length,21);
  assert.equal(new Set(GAMES.map(g=>g.slug)).size,21);
  assert.ok(new Set(GAMES.map(g=>g.mechanic)).size>=18);
  for(const g of GAMES){assert.ok(g.title&&g.instruction&&g.character&&g.music);assert.equal(g.theme.length,2);}
});

test('every stage can finish with the chosen correct answer and records a finite hit time',()=>{
  for(const meta of GAMES){
    const game=ready(meta.id),truth=meta.mechanic==='truth';
    const result=finish(game,truth?0:49);
    assert.equal(result.performed,true,meta.title);
    assert.equal(result.value,truth?0:49,meta.title);
    assert.ok(Number.isFinite(result.hitTime),meta.title);
  }
});

test('wrong answers remain wrong after both animation and reveal; later input cannot rewrite them',()=>{
  for(const meta of GAMES){
    const game=ready(meta.id);
    const wrong=meta.mechanic==='truth'?1:game.controls.find(c=>c.value!==49).value;
    const result=finish(game,wrong);
    assert.equal(result.value,wrong,meta.title);
    game.update({phase:'reveal',time:9,selected:49,correct:false});
    game.choose(49,9);game.key(' ',10);game.pointer('down',500,200,10);
    assert.deepEqual(game.getResult(),result,meta.title);
  }
});

test('listening and reveal phases cannot submit answers',()=>{
  for(const meta of GAMES){
    const game=createMiniGame(meta.id,question);
    game.choose(game.controls[0].value,0);game.key(' ',1);game.pointer('down',500,200,1);game.pointer('up',500,200,2);
    assert.equal(game.getResult().performed,false,meta.title);
    game.update({phase:'reveal',time:3});game.choose(game.controls[0].value,3);
    assert.equal(game.getResult().performed,false,meta.title);
  }
});

test('a cancelled long press never fires, and a later valid press can finish',()=>{
  for(const id of held){const game=ready(id);game.choose(42,2);game.pointer('down',500,400,3);game.pointer('cancel',500,400,3.5);game.pointer('up',500,400,4);assert.equal(game.completed,false);game.pointer('down',500,400,5);game.pointer('up',500,400,6);assert.deepEqual(game.getResult(),{value:42,performed:true,hitTime:6});}
});

test('gorilla requires two punches and the conductor requires three strokes',()=>{
  for(const [id,count] of [[8,2],[20,3]]){const game=ready(id);game.choose(49,2);for(let i=1;i<=count;i++){game.key(' ',2+i*.3);assert.equal(game.completed,i===count);assert.equal(game.presses,i);}assert.equal(game.getResult().hitTime,2+count*.3);}
});

test('hold-release can choose the displayed gauge candidate without a preceding button selection',()=>{
  for(const id of held){const game=ready(id);game.pointer('down',500,400,3);game.pointer('up',500,400,3.8);assert.equal(game.getResult().value,game.controls[1].value);}
});

test('digit repair always preserves the known digit, includes the correct answer, and has unique controls for all 81 facts',()=>{
  for(let a=1;a<=9;a++)for(let b=1;b<=9;b++)for(const missing of ['ones','tens']){
    const answer=a*b,game=ready(18,{a,b,answer,choices:[Math.max(0,answer-7),answer,answer+7],missing});
    assert.equal(game.controls.length,3);assert.equal(new Set(game.controls.map(c=>c.value)).size,3);
    assert.ok(game.controls.some(c=>c.value===answer));
    for(const c of game.controls)assert.equal(missing==='ones'?Math.floor(c.value/10):c.value%10,missing==='ones'?Math.floor(answer/10):answer%10);
    assert.equal(finish(game,answer).value,answer);
  }
});

test('tap targets use the visible object value rather than silently using the correct answer',()=>{
  const frog=ready(5);frog.pointer('down',360,280,2);assert.equal(frog.getResult().value,42);
  const forest=ready(21);forest.pointer('down',670,286,2);assert.equal(forest.getResult().value,0);
  const quiz=ready(6);quiz.pointer('down',345,265,2);assert.equal(quiz.getResult().value,42);
});

test('selection can be changed before performing, invalid values are ignored',()=>{
  const game=ready(1);game.choose(42,2);game.choose(999,2);assert.equal(game.selected,42);game.choose(56,3);game.key(' ',4);assert.equal(game.getResult().value,56);
});

test('invalid game ids and invalid multiplication operands are rejected',()=>{
  assert.throws(()=>createMiniGame(22,question),RangeError);
  assert.throws(()=>createMiniGame(1,{...question,a:0}),RangeError);
  assert.throws(()=>createMiniGame(1,{...question,b:1.2}),RangeError);
});

function fakeContext(){
  let depth=0, calls=0;
  const ctx=new Proxy({}, {get(target,key){
    if(Object.hasOwn(target,key))return target[key];
    if(key==='save')return()=>{depth++;};
    if(key==='restore')return()=>{depth--;assert.ok(depth>=0,'unbalanced canvas restore');};
    if(key==='createLinearGradient')return()=>({addColorStop(){}});
    return (...args)=>{calls++;for(const value of args)if(typeof value==='number')assert.ok(Number.isFinite(value),`non-finite argument in ${String(key)}`);};
  },set(target,key,value){target[key]=value;return true;}});
  return {ctx,check:()=>{assert.equal(depth,0);assert.ok(calls>20);}};
}
test('every stage draws finite coordinates and balances canvas state before and after a wrong answer',()=>{
  for(const meta of GAMES){
    const game=ready(meta.id);
    for(const reduceMotion of [false,true]){
      game.update({time:2.3,beat:5,phase:'play',reduceMotion});
      let fake=fakeContext();game.draw(fake.ctx,1000,440);fake.check();
      finish(game,game.controls[0].value,3);
      game.update({time:5,beat:8,phase:'reveal',correct:false,reduceMotion});
      fake=fakeContext();game.draw(fake.ctx,844,280);fake.check();
    }
  }
});

test('reverse multiplication asks for a factor while returning the corresponding full product for every fact',()=>{
  for(let a=1;a<=9;a++)for(let b=1;b<=9;b++){
    const answer=a*b,game=ready(15,{a,b,answer,choices:[Math.max(1,answer-1),answer,answer+1]});
    assert.equal(game.controls.length,3);assert.equal(new Set(game.controls.map(c=>c.label)).size,3);
    for(const c of game.controls){assert.ok(Number(c.label)>=1&&Number(c.label)<=9);assert.equal(c.value,a*Number(c.label));}
    assert.equal(game.controls.find(c=>c.value===answer).label,String(b));
    assert.equal(finish(game,answer).value,answer);
  }
});

test('slot reels finish centered on the chosen wrong number, not on the question answer',()=>{
  const game=ready(1);finish(game,56,3);game.update({phase:'reveal',time:6,correct:false});
  const seen=[];const fake=fakeContext();game.draw(fake.ctx,1000,440,{drawNumber(_ctx,value,x,y){if(Math.abs(y-184)<.001)seen.push({value,x});}});
  assert.deepEqual(seen.map(s=>s.value),[5,6]);assert.equal(game.getResult().value,56);
});

test('generated scenes preserve every stage character, a neutral unsubmitted demo and the actual chosen answer',()=>{
 for(const meta of GAMES){
  const game=ready(meta.id),numbers=[],texts=[],actors=[],props=[];
  const fake=fakeContext();fake.ctx.fillText=text=>texts.push(String(text));
  const helpers={hasProp:()=>true,drawProp(_ctx,x,y,size,time,options){props.push(options.frame);return true;},drawCharacter(_ctx,name){actors.push(name);},drawNumber(_ctx,value){numbers.push(value);}};
  game.update({rhythmMode:true,time:2,beat:4,phase:'demo'});
  game.pulse({beat:4,success:true,value:null,index:0,total:6,demo:true});
  game.draw(fake.ctx,844,280,helpers);fake.check();
  assert.ok(actors.includes(meta.character),meta.title);
  // Answer targets and quantity illustrations may include the correct number.
  // A demonstration must never turn one of those targets into a submitted answer.
  assert.equal(game.getResult().value,null,`demo submits an answer: ${meta.title}`);
  game.update({phase:'play',time:4,beat:8});
  game.pulse({value:meta.mechanic==='truth'?1:56,success:false,index:0});
  game.draw(fake.ctx,844,280,helpers);fake.check();
  assert.equal(game.selected,meta.mechanic==='truth'?1:56,`wrong choice changed: ${meta.title}`);
  game.setAnswer(meta.mechanic==='truth'?1:56,false);
  game.update({phase:'reveal',time:5,beat:10,correct:false});
  game.draw(fake.ctx,844,280,helpers);fake.check();
  assert.equal(game.getResult().value,meta.mechanic==='truth'?1:56);
 }
});

test('revealing a single answer never starts the stopped slot reels spinning again',()=>{
 const game=ready(1);game.update({rhythmMode:true,phase:'play',time:5.5,beat:12});
 game.pulse({value:56,success:false,index:0,total:1});
 game.update({time:6.5,beat:14});game.setAnswer(56,false);
 const seen=[],fake=fakeContext();
 game.draw(fake.ctx,1000,440,{drawNumber(_ctx,value,x,y){if(Math.abs(y-184)<.001)seen.push(value);}});
 assert.deepEqual(seen,[5,6]);assert.equal(game.getResult().hitTime,5.5);
});

test('all 21 stages also complete with touch down/move/up sequences, without a keyboard',()=>{
  for(const meta of GAMES){
    const game=ready(meta.id),value=meta.mechanic==='truth'?0:49;game.choose(value,2);
    for(let n=0;n<3&&!game.completed;n++){
      const at=3+n;game.pointer('down',500,410,at);
      game.pointer('move',500,250,at+.15);
      game.pointer('up',500,240,at+.35);
    }
    assert.equal(game.getResult().performed,true,meta.title);
    assert.equal(game.getResult().value,value,meta.title);
  }
});

test('truth stages replace the spoken false claim with the correct equation during the teaching reveal',()=>{
  for(const id of [4,21]){const game=ready(id);finish(game,0,3);game.update({phase:'reveal',time:5,correct:true});const texts=[];const fake=fakeContext();fake.ctx.fillText=(text)=>texts.push(String(text));game.draw(fake.ctx);assert.ok(texts.includes('7 × 7 = 49'));assert.ok(!texts.includes('7 × 7 = 56'));}
});

test('all rhythm stages animate repeated pulses and neutral demos without legacy controls or answer leaks',()=>{
  for(const meta of GAMES){
    const game=ready(meta.id);game.update({rhythmMode:true,phase:'listen',time:2,beat:4});
    game.pulse({beat:4,success:true,value:null,index:0,total:6,demo:true});
    assert.equal(game.selected,null,meta.title);let fake=fakeContext();const texts=[];fake.ctx.fillText=text=>texts.push(String(text));game.draw(fake.ctx);fake.check();
    assert.ok(!texts.some(t=>t.includes('下から 答えを')||t==='うけとる ○'||t==='ほんと ○'),meta.title);
    for(let i=0;i<4;i++){game.update({time:4+i*.5,beat:8+i,phase:'play'});game.pulse({beat:8+i,success:true,value:meta.mechanic==='truth'?0:42,index:i,total:6,holding:i===1&&[3,10,16,19].includes(meta.id)});game.update({time:4+i*.5+.1,beat:8+i+.2});fake=fakeContext();game.draw(fake.ctx);fake.check();assert.equal(game.completed,false);}
    game.setAnswer(meta.mechanic==='truth'?0:42,false);game.update({phase:'reveal',time:9});fake=fakeContext();game.draw(fake.ctx);fake.check();assert.equal(game.getResult().value,meta.mechanic==='truth'?0:42);
  }
});
