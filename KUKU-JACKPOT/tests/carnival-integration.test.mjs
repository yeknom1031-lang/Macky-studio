import test from 'node:test';
import assert from 'node:assert/strict';
import {CarnivalStage,CARNIVAL_GAMES} from '../src/carnival.js';
import {carnivalChart,CarnivalRound} from '../src/carnival-core.js';
import {newSave,record,normalizeSave} from '../src/festival-core.js';
const noop=()=>{};
function stageStub(){
 const nodes=new Map(),s=Object.create(CarnivalStage.prototype);
 Object.assign(s,{active:true,state:'playing',game:CARNIVAL_GAMES.find(g=>g.id===31),settings:{offset:0},watch:false,index:0,tour:false,buttons:[],images:{},results:[],chart:carnivalChart({gameId:31}),el:{classList:{remove:noop}},audio:{now:()=>0,duration:()=>0,speak:()=>({seconds:1})},wake:noop});
 s.q=selector=>{if(!nodes.has(selector))nodes.set(selector,{hidden:false,textContent:'',classList:{remove:noop,toggle:noop},setAttribute:noop});return nodes.get(selector);};
 return s;
}
test('a stage finishing loading in a background tab pauses before consuming its first question',()=>{
 const old={document:globalThis.document,innerWidth:globalThis.innerWidth,innerHeight:globalThis.innerHeight};
 try{
  globalThis.document={hidden:true};globalThis.innerWidth=667;globalThis.innerHeight=375;
  const s=stageStub();let paused=0;s.pause=()=>{paused++;s.state='paused';};s.openRound();
  assert.equal(paused,1,'hidden-page load must pause even without another visibilitychange event');assert.equal(s.state,'paused');
 }finally{for(const [key,value]of Object.entries(old))if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
});
test('a failed transition after disposal cannot overwrite another stage with an error modal',async()=>{
 const s=stageStub();s.chart=[{gameId:31},{gameId:32}];s.index=0;s.wasPractice=false;let reject,modals=0;
 s.enterGame=()=>new Promise((_,r)=>{reject=r;});s.modal=()=>modals++;
 const pending=s.next();s.active=false;reject(Error('late failed image'));await pending;
 assert.equal(modals,0,'discard stale asynchronous failure after leaving the stage');
});
test('practice and pause do not contaminate played results or accept hidden answers',()=>{
 const s=stageStub(),q=carnivalChart({gameId:32})[0];s.round=new CarnivalRound(q);s.roundStart=0;s.watch=false;let hits=0;s.hit=()=>hits++;
 for(const state of ['paused','loading','feedback','menu','error']){s.state=state;s.answer(q.choices.indexOf(q.answer));}
 assert.equal(hits,0);assert.equal(s.round.result,null);
 s.state='playing';s.answer(q.choices.indexOf(q.answer));s.answer(q.choices.indexOf(q.answer));assert.equal(hits,1);
});
test('inverse answers record the learned multiplication fact and survive the shared save pipeline',()=>{
 const q=carnivalChart({gameId:34,table:7,random:()=>.2})[1],round=new CarnivalRound(q),r=round.submit(q.choices.indexOf(q.b),0);
 assert.equal(q.inverse,true);assert.equal(r.value,q.b);assert.equal(r.correct,true);assert.equal(r.points,100);
 const save=normalizeSave(JSON.parse(JSON.stringify(record(newSave(),[r]))));assert.equal(save.facts[`7-${q.b}`].correct,1);assert.equal(save.stars[34],2);assert.equal(save.correct,1);
});
test('a second failed stage-load attempt remains recoverable instead of rejecting the retry handler',async()=>{
 const s=stageStub();s.chart=[{gameId:31},{gameId:32}];s.index=0;s.wasPractice=false;s.modal=noop;
 s.enterGame=async()=>{s.state='loading';throw Error('image still unavailable');};
 await s.next();assert.equal(s.state,'error');const retry=s.q('#cv-retry').onclick;assert.equal(typeof retry,'function');
 await assert.doesNotReject(retry());assert.equal(s.state,'error');
});
test('paint mural completes in a three-question tour while six-question solo progress remains partial',async()=>{
 const {drawC,GAMES_C}=await import('../src/carnival-scenes-c.js');
 const labels=[],c=new Proxy({}, {get(_,key){return key==='fillText'?(value)=>labels.push(String(value)):()=>{};},set(){return true;}});
 const base={game:GAMES_C[0],w:667,h:375,t:2,beat:4,phase:'feedback',result:{correct:true},resultAge:2,correctCount:3,roundIndex:2,reduced:true,images:{mural:{width:1254,height:1254}}};
 drawC(c,{...base,q:{a:2,b:3,stageTotal:3}});assert.ok(labels.includes('町の絵、完成！'));
 labels.length=0;drawC(c,{...base,q:{a:2,b:3,stageTotal:6}});assert.ok(labels.includes('町の絵 3 / 6'));assert.ok(!labels.includes('町の絵、完成！'));
});
test('rotating or hiding the page during pending audio resume keeps the round paused and allows a later safe resume',async()=>{
 const old={document:globalThis.document,innerWidth:globalThis.innerWidth,innerHeight:globalThis.innerHeight};
 try{
  for(const reason of ['portrait','hidden']){
   globalThis.document={hidden:false};globalThis.innerWidth=667;globalThis.innerHeight=375;
   const s=stageStub();let resolveResume,pauseCalls=0,wakeCalls=0;
   s.audio.pause=async()=>{pauseCalls++;};s.audio.resume=()=>new Promise(resolve=>{resolveResume=resolve;});s.wake=()=>wakeCalls++;
   await s.pause();assert.equal(s.state,'paused');assert.equal(s.q('.cv-modal').hidden,false);
   const resume=s.q('#cv-resume').onclick,pending=resume();
   assert.equal(s.state,'paused','audio resume is still pending');
   if(reason==='portrait'){globalThis.innerWidth=375;globalThis.innerHeight=667;}else globalThis.document.hidden=true;
   await s.pause(); // Real resize/visibility handler fires while already paused.
   resolveResume();await pending;
   assert.equal(s.state,'paused',`${reason} must prevent the pending callback restarting the round`);
   assert.equal(s.q('.cv-modal').hidden,false);assert.equal(pauseCalls,2,'audio that just resumed must be paused again');assert.equal(wakeCalls,0);
   globalThis.document.hidden=false;globalThis.innerWidth=667;globalThis.innerHeight=375;
   const retry=resume();resolveResume();await retry;
   assert.equal(s.state,'playing');assert.equal(s.q('.cv-modal').hidden,true);assert.equal(wakeCalls,1);
  }
 }finally{for(const [key,value]of Object.entries(old))if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
});
