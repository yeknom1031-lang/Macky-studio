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
