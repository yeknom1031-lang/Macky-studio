import test from 'node:test';
import assert from 'node:assert/strict';
import { paintStone, createCellEffects } from '../src/rendering.js';

const cell = () => ({ firstElementChild:null, classList:new Set(), append(node) { this.firstElementChild=node; }, replaceChildren() { this.firstElementChild=null; } });
function effectCell() {
 const value=cell();value.classList={ values:new Set(),add(key){this.values.add(key);},remove(key){this.values.delete(key);} };return value;
}
test('144マスを100回捕獲しても石のDOMを作り直さず、色だけ更新する', () => {
 let created=0;
 const doc={createElement(){created++;return {setAttribute(){},className:''};}};
 const cells=Array.from({length:144},cell);
 for(let move=0;move<100;move++) cells.forEach((c,i)=>paintStone(c,['red','blue','yellow','green'][(i+move)%4],doc));
 assert.equal(created,144);
 assert.equal(cells[0].firstElementChild.className,'disc green');
 paintStone(cells[0],null,doc);assert.equal(cells[0].firstElementChild,null);
});
test('CSS終了イベントが来なくても連続する着地演出のタイマー数が増えず、終了時に全部解放する', () => {
 const timers=new Map();let id=0;
 const effects=createCellEffects(fn=>{timers.set(++id,fn);return id;},id=>timers.delete(id));
 const c=effectCell();
 for(let i=0;i<1000;i++) effects.pulse(c);
 assert.equal(timers.size,1);assert.equal(effects.size(),1);
 [...timers.values()][0]();assert.equal(timers.size,0);assert.equal(effects.size(),0);assert.equal(c.classList.values.size,0);
 const cells=Array.from({length:144},effectCell);cells.forEach(c=>effects.pulse(c));
 effects.clear();assert.equal(timers.size,0);assert.equal(effects.size(),0);assert.ok(cells.every(c=>c.classList.values.size===0));
});

import { createStoneAudio } from '../src/audio.js';
test('以前のBGMオン設定が残っていても、操作・設定更新で音楽ノードや周期タイマーを作らない', () => {
 let created=0,oscillators=0,timers=0;
 const param=()=>({value:0,setTargetAtTime(){}});
 const node=()=>({connect(){},gain:param()});
 const context={state:'running',currentTime:0,destination:{},createGain:node,
 createOscillator(){oscillators++;throw new Error('BGM must not start');},
 createDynamicsCompressor:()=>({...node(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()})};
 const settings={sound:true,music:true,volume:.75};
 const audio=createStoneAudio(()=>settings,()=>{created++;return context;},{schedule:()=>timers++});
 for(let n=0;n<1000;n++){audio.unlock();audio.sync();}
 assert.equal(created,1);assert.equal(oscillators,0);assert.equal(timers,0);assert.equal(audio.status().active,0);
 settings.sound=false;
 const muted=createStoneAudio(()=>settings,()=>{throw new Error('Silent game must not create audio');});
 muted.unlock();assert.equal(muted.status().state,'idle');
});
test('音のended通知が届かない環境でも音声ノードは16個以内で、寿命と停止で必ず解放', () => {
 const tasks=new Map();let sequence=0,disconnected=0;
 const param=()=>({value:0,setTargetAtTime(){},setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
 const node=()=>({connect(){},disconnect(){disconnected++;},stop(){},start(){},gain:param(),frequency:param(),playbackRate:param(),pan:param()});
 const context={state:'running',currentTime:0,sampleRate:22050,destination:{},createGain:node,createBufferSource:node,createOscillator:node,createStereoPanner:node,
 createDynamicsCompressor:()=>({...node(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()}),createBuffer:()=>({copyToChannel(){}})};
 const audio=createStoneAudio(()=>({sound:true,music:false,volume:.5}),()=>context,{schedule:fn=>{tasks.set(++sequence,fn);return sequence;},unschedule:id=>tasks.delete(id)});
 for(let i=0;i<300;i++)audio.hit('place');
 assert.equal(audio.status().contacts,300);assert.equal(audio.status().active,16);assert.equal(tasks.size,16);
 for(const fn of [...tasks.values()])fn();assert.equal(audio.status().active,0);assert.equal(tasks.size,0);assert.ok(disconnected>=900);
 audio.celebrate();assert.equal(audio.status().active,4);audio.stop();assert.equal(tasks.size,0);assert.equal(audio.status().active,0);
});

import { createHeldStonePointer } from '../src/rendering.js';
test('持った石は大量のpointermoveでも１フレームだけ予約し、最後の座標と現在の色を描画する',()=>{
 const handlers=new Map(),queue=new Map();let id=0;
 const surface={classList:effectCell().classList,addEventListener:(type,handler)=>handlers.set(type,handler),removeEventListener:type=>handlers.delete(type)};
 const element={hidden:true,style:{}};
 const pointer=createHeldStonePointer(surface,element,{frame:fn=>{queue.set(++id,fn);return id;},cancelFrame:id=>queue.delete(id)});
 pointer.sync('red',42);
 for(let i=0;i<1000;i++)handlers.get('pointermove')({pointerType:'mouse',clientX:i,clientY:100});
 assert.equal(queue.size,1);const fn=queue.values().next().value;queue.clear();fn();
 assert.equal(element.style.transform,'translate3d(999px,100px,0) translate(-50%,-50%)');assert.equal(element.className,'held-stone disc red');assert.equal(element.hidden,false);
 pointer.sync('white',35);assert.equal(queue.size,1);queue.values().next().value();queue.clear();assert.equal(element.className,'held-stone disc white');
 assert.equal(element.style.transform,'translate3d(999px,100px,0) translate(-50%,-50%)');assert.equal(element.style.width,'35px');
 pointer.sync(null,35);assert.equal(element.hidden,true);assert.equal(queue.size,0);assert.equal(surface.classList.values.size,0);
 pointer.destroy();assert.equal(handlers.size,0);
});
test('盤面外・タッチ入力・手番終了ではポインター石と予約済み描画を解除する',()=>{
 const handlers=new Map(),queue=new Map();let id=0;
 const surface={classList:effectCell().classList,addEventListener:(type,handler)=>handlers.set(type,handler),removeEventListener:type=>handlers.delete(type)};
 const element={hidden:true,style:{}};
 const pointer=createHeldStonePointer(surface,element,{frame:fn=>{queue.set(++id,fn);return id;},cancelFrame:id=>queue.delete(id)});
 pointer.sync('black',42);handlers.get('pointerenter')({pointerType:'mouse',clientX:50,clientY:60});assert.equal(queue.size,1);
 handlers.get('pointerleave')();assert.equal(queue.size,0);assert.equal(element.hidden,true);
 handlers.get('pointermove')({pointerType:'touch',clientX:50,clientY:60});assert.equal(queue.size,0);
 handlers.get('pointermove')({pointerType:'pen',clientX:50,clientY:60});assert.equal(queue.size,1);
 pointer.sync(null,42);assert.equal(queue.size,0);assert.equal(element.hidden,true);
});
