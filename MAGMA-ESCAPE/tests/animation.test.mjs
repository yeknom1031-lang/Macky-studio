import test from 'node:test';
import assert from 'node:assert/strict';
import {animationFrame,drawAnimation,paintArt,ANIMATION_NAMES} from '../animation.js';
test('nine generated sheets with four-frame looping and clamped one-shot animations',()=>{
  assert.equal(ANIMATION_NAMES.length,9);
  assert.deepEqual([0,.2,.4,.6,.8].map(t=>animationFrame(t)),[0,1,2,3,0]);
  assert.equal(animationFrame(99,{loop:false}),3);
  assert.equal(animationFrame(-1),0);assert.equal(animationFrame(NaN),0);
  assert.equal(animationFrame(20,{reduced:true}),0);
});
test('sheet sampling keeps every frame within its own quadrant',()=>{
  const calls=[],ctx={drawImage:(...args)=>calls.push(args)},img={width:1024,height:1024};
  for(let i=0;i<4;i++)drawAnimation(ctx,img,i/4,10,20,30,40,{fps:4});
  assert.deepEqual(calls.map(c=>c.slice(1,5)),[[0,0,512,512],[512,0,512,512],[0,512,512,512],[512,512,512,512]]);
  assert.equal(drawAnimation(ctx,null,0,0,0,1,1),false);
});
test('DOM sprites redraw only on frame changes and changing states invalidates cache',()=>{
  let draws=0;const canvas={width:100,height:100,dataset:{animation:'enemy-idle'},getContext:()=>({clearRect(){},drawImage(){draws++;}})};
  const assets={'anim-enemy-idle':{width:1024,height:1024},'anim-enemy-hit':{width:1024,height:1024}};
  paintArt(canvas,assets,0);paintArt(canvas,assets,.1);assert.equal(draws,1);
  paintArt(canvas,assets,.3);assert.equal(draws,2);
  canvas.dataset.animation='enemy-hit';paintArt(canvas,assets,.3);assert.equal(draws,3);
  paintArt(canvas,assets,15,{reduced:true});paintArt(canvas,assets,16,{reduced:true});assert.equal(draws,4);
});
