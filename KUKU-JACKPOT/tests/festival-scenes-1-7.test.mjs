import test from 'node:test';
import assert from 'node:assert/strict';
import {drawScenes1to7,sceneAction1to7} from '../src/festival-scenes-1-7.js';

function scene(id,overrides={}){
 const numbers=[],characters=[],props=[],labels=[];
 const noop=()=>{};
 const ctx=new Proxy({},{get:(_target,key)=>key==='globalAlpha'?1:noop,set:()=>true});
 const state={selected:null,lastPulse:null,time:0,beat:0,phase:'listen',correct:null,controls:[{value:10},{value:12},{value:15}],stageProgress:{correct:0,history:[]},...overrides};
 const env={ctx,game:{id,character:id===5?'カエル':'テスト役'},q:{a:3,b:4,answer:12,claimed:15,choices:[10,12,15],lesson:{from:9}},state,t:state.time,
  helpers:{drawProp:(_ctx,x,y,size,_t,options)=>props.push({x,y,size,frame:options.frame})},
  characterAt:(name,x,y,size,pose)=>characters.push({name,x,y,size,pose}),
  num:(value,x,y,size)=>numbers.push({value,x,y,size}),
  label:(_ctx,value,x,y)=>labels.push({value:String(value),x,y}),rounded:noop,ellipse:noop,withNaturalAspect:(_ctx,_x,_y,draw)=>draw()};
 return {env,state,numbers,characters,props,labels,draw:()=>drawScenes1to7(env)};
}

test('wrong answers still act and their endpoints persist beyond the old pulse timeout',()=>{
 const state={selected:15,lastPulse:{time:1,index:2,success:false},time:2,phase:'play'};
 assert.deepEqual({...sceneAction1to7(state),age:0},{acted:true,age:0,progress:1,index:2,value:15,revealed:false,correct:false,timing:'off'});
 state.time=8;
 assert.equal(sceneAction1to7(state).progress,1);
});

test('frog jumps to the actual selected pad, even for a wrong answer, then stays there',()=>{
 for(const index of [0,1,2]){
  const s=scene(5,{selected:[10,12,15][index],lastPulse:{time:0,index,success:index===1},time:1});
  assert.equal(s.draw(),true);
  const landing=s.characters.at(-1);
  assert.equal(landing.x,[362,548,734][index]);
  assert.equal(landing.size,100,'small frog keeps its face clear of the lesson panel');
  const chosenNumber=s.numbers.find(n=>n.value===[10,12,15][index]&&n.x===landing.x);
  assert.ok(chosenNumber.y>landing.y,'the selected leaf number remains below the landed frog');
  s.state.time=8;s.draw();assert.equal(s.characters.at(-1).x,landing.x);
 }
});

test('quiz chooses the corresponding generated buzzer rather than always the left one',()=>{
 const s=scene(6,{selected:15,lastPulse:{time:0,index:2,success:false},time:2});s.draw();
 assert.deepEqual(s.props.map(p=>p.frame),[0,0,1]);
 assert.deepEqual(s.numbers.map(n=>n.value),[10,12,15]);
});

test('ninja takes or rejects the scroll by the selected action, independent of correctness',()=>{
 for(const value of [0,1]){
  const s=scene(4,{selected:value,lastPulse:{time:0,index:value===1?0:1,success:false},time:2});s.draw();
  assert.ok(s.labels.some(l=>l.value===(value?'うけとった！':'はじいた！')));
  assert.ok(s.labels.some(l=>l.value==='3 × 4 ＝ 15'));
  s.state.phase='reveal';s.state.correct=false;s.draw();
  assert.ok(s.labels.some(l=>l.value==='3 × 4 ＝ 12'));
  assert.ok(s.labels.some(l=>l.value==='ちがった式'));
  assert.ok(s.labels.some(l=>l.value==='ほんとうは'));
 }
});

test('generated props remain in sushi, rocket, quiz and donuts production scenes',()=>{
 for(const id of [2,3,6,7]){
  const s=scene(id);assert.equal(s.draw(),true);assert.ok(s.props.length>0,`game ${id}`);
 }
 assert.equal(scene(1).draw(),false,'slot retains its continuous generated-digit reel path');
});

test('donuts preserves a objects per group and reports the selected capacity mismatch',()=>{
 const s=scene(7,{selected:15,lastPulse:{time:0,index:2,success:false},time:3,phase:'reveal',correct:false});s.draw();
 assert.ok(s.labels.some(l=>l.value==='3こ × 4くみ'));
 assert.ok(s.numbers.some(n=>n.value===15));
 assert.ok(s.labels.some(l=>l.value==='3こぶん あくよ'));
 assert.ok(s.labels.some(l=>l.value==='できた数 12こ'));
});
