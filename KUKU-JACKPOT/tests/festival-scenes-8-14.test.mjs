import test from 'node:test';
import assert from 'node:assert/strict';
import {makeStageQuestion} from '../src/festival-core.js';
import {drawScenes8to14,memoryPresentation} from '../src/festival-scenes-8-14.js';

function render(gameId,{a=7,b=8,value=null,phase='play',time=6,hitTime=5.4,beat=12,correct=value===a*b,timing='off',reduceMotion=false,showHint=false,history=[]}={}){
 const calls={numbers:[],texts:[],characters:[],props:[],effects:[],ellipses:[]};let depth=0;
 const noop=()=>{};
 const ctx={globalAlpha:1,save(){depth++;},restore(){depth--;assert.ok(depth>=0);},beginPath:noop,moveTo:noop,lineTo:noop,stroke:noop,ellipse:noop,clip:noop};
 const q=makeStageQuestion(gameId,a,b,{showHint,random:()=>.2});
 if(value!==null&&!q.choices.includes(value))q.choices[q.choices.findIndex(n=>n!==q.answer)]=value;
 const state={time,beat,phase,selected:value,correct,reduceMotion,controls:q.choices.map(value=>({value})),stageProgress:{history}};
 if(value!==null)state.lastPulse={value,time:hitTime,index:state.controls.findIndex(c=>c.value===value),success:correct,timing};
 const draw=drawScenes8to14({ctx,game:{id:gameId,character:'test'},q,state,t:time,
  helpers:{drawProp:(...args)=>calls.props.push(args.slice(1)),drawEffect:(...args)=>calls.effects.push(args.slice(1))},
  characterAt:(...args)=>calls.characters.push(args),num:(...args)=>calls.numbers.push(args),label:(_ctx,...args)=>calls.texts.push(args),
  rounded:(_ctx,...args)=>{assert.ok(args.slice(0,5).every(Number.isFinite));},ellipse:(_ctx,...args)=>{assert.ok(args.slice(0,4).every(Number.isFinite));calls.ellipses.push(args);},withNaturalAspect:(_ctx,_x,_y,fn)=>fn(),
 });
 assert.equal(depth,0,'canvas save/restore stays balanced');return {draw,calls,q,state};
}

test('all seven scenes consume generated props and accept correct, wrong, absent and reduced-motion answers',()=>{
 for(let gameId=8;gameId<=14;gameId++)for(const value of [null,56,55])for(const phase of ['listen','play','reveal'])for(const reduceMotion of [false,true]){
  const {calls,draw}=render(gameId,{value,phase,reduceMotion});
  assert.equal(draw,true);assert.ok(calls.props.length>0);assert.ok(calls.characters.length>0);
  for(const [_value,x,y,size] of calls.numbers){assert.ok([x,y,size].every(Number.isFinite));assert.ok(y>=120&&y<=340,'important numbers stay between the top question and bottom answer overlays');}
 }
});

test('wrong answers still travel and display the selected number; timing never changes arithmetic success',()=>{
 for(let id=8;id<=14;id++){
  const wrong=render(id,{value:55,time:5.7});
  if(id===8)assert.ok(wrong.calls.numbers.filter(c=>c[0]===5).length>=2);
  else assert.ok(wrong.calls.numbers.some(c=>c[0]===55),`game ${id} displays the actual wrong selection`);
  const ordinary=render(id,{value:56,timing:'off'}),perfect=render(id,{value:56,timing:'perfect'});
  assert.deepEqual(ordinary.calls.props,perfect.calls.props);assert.deepEqual(ordinary.calls.characters,perfect.calls.characters);
  assert.equal(ordinary.calls.effects.length,0);assert.equal(perfect.calls.effects.length,1);
 }
});

test('gorilla uses the chosen digits and omits an invented leading zero for a one-digit answer',()=>{
 const small=render(8,{a:1,b:7,value:7});assert.ok(small.calls.numbers.some(c=>c[0]===7));assert.equal(small.calls.numbers.some(c=>c[0]===0),false);
 const wrong=render(8,{value:55,phase:'reveal',correct:false});
 assert.ok(wrong.calls.numbers.some(c=>c[0]===56),'revealed decomposition is the correct fact');
});

test('ghost hint ends at 5.5 beats, remains answerable immediately, and advanced recall never exposes the answer early',()=>{
 const q=makeStageQuestion(12,7,8,{showHint:true}),state={phase:'listen',beat:0,selected:null};
 assert.deepEqual(memoryPresentation(q,state),{value:56,hint:true,hidden:false});
 assert.deepEqual(memoryPresentation(q,{...state,beat:5.5}),{value:'？',hint:false,hidden:true});
 assert.deepEqual(memoryPresentation(q,{...state,selected:55}),{value:55,hint:false,hidden:false});
 assert.deepEqual(memoryPresentation({...q,lesson:{...q.lesson,showHint:false}},state),{value:'？',hint:false,hidden:true});
 assert.equal(memoryPresentation(q,{...state,phase:'reveal',selected:55}).value,56);
 const hidden=render(12,{phase:'listen',beat:0,showHint:false});assert.equal(hidden.calls.numbers.some(c=>c[0]===56),false);
});

test('basketball actual goals count correct history and the current answer once, without including misses',()=>{
 const {calls}=render(11,{value:56,history:[{correct:true},{correct:false},{correct:true}]});
 assert.ok(calls.numbers.some(([n,x,y])=>n===3&&x===461&&y===211));
 const none=render(11,{value:null,phase:'reveal',correct:false,history:[{correct:true}]});
 assert.ok(none.calls.numbers.some(([n,x,y])=>n===1&&x===461&&y===211));
});

test('hero moves to the selected room and remains there after the flight instead of snapping home',()=>{
 const landed=render(14,{value:55,time:9,hitTime:2});
 const actor=landed.calls.characters[0];assert.equal(actor[1],567);assert.ok(actor[2]>200&&actor[2]<=330);
 const initial=render(14,{value:null});assert.equal(initial.calls.characters[0][1],276);
});

test('train keeps corrected passenger totals at past stations and juice shelves contain only completed recipes',()=>{
 const history=[{a:3,b:7,answer:21,value:22,correct:false},{a:5,b:5,answer:25,value:25,correct:true}];
 const train=render(9,{history});assert.ok(train.calls.numbers.some(([n,,y])=>n===21&&y===144));assert.ok(train.calls.numbers.some(([n,,y])=>n===25&&y===144));
 const juice=render(10,{value:56,history});const bottles=juice.calls.numbers.filter(([, ,y])=>y===299).map(([n])=>n);
 assert.deepEqual(bottles,[25,56]);
});

test('perfect basketball swishes and ordinary correct shots bank, but both settle through the same hoop',()=>{
 const bank=render(11,{value:56,time:5.85,timing:'off'}),swish=render(11,{value:56,time:5.85,timing:'perfect'});
 const ball=r=>r.calls.ellipses.find(c=>c[2]===31&&c[3]===31).slice(0,2);
 assert.notDeepEqual(ball(bank),ball(swish));
 assert.deepEqual(ball(render(11,{value:56,time:8,timing:'off'})),ball(render(11,{value:56,time:8,timing:'perfect'})));
});
