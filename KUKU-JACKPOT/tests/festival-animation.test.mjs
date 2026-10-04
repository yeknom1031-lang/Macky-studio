import test from 'node:test';
import assert from 'node:assert/strict';
import {animationFrame,sourceCell,FestivalAnimation} from '../src/festival-animation.js';

test('animation follows the audio beat across delays and loops without drifting',()=>{
 const clip={frames:6};
 assert.equal(animationFrame(clip,10,{start:10,beatDuration:.5}),0);
 assert.equal(animationFrame(clip,10.51,{start:10,beatDuration:.5}),3);
 assert.equal(animationFrame(clip,12.51,{start:10,beatDuration:.5}),3);
 assert.equal(animationFrame(clip,99,{start:10,beatDuration:.5,loop:false}),5);
 assert.equal(animationFrame(clip,9,{start:10}),0);
});
test('rejected frames are never shown and reduced motion keeps a valid still',()=>{
 const clip={frames:6,usableFrames:[1,2,5]};
 assert.equal(animationFrame(clip,0),1);
 assert.equal(animationFrame(clip,.3,{beatDuration:.6}),2);
 assert.equal(animationFrame(clip,.5,{beatDuration:.6}),5);
 assert.equal(animationFrame(clip,17,{reduceMotion:true}),1);
 assert.equal(animationFrame(clip,17,{loop:false}),5);
});
test('source coordinates never sample the neighbouring sprite cell',()=>{
 const clip={columns:3,rows:2,width:768,height:512};
 assert.deepEqual(sourceCell(clip,4),{x:256,y:256,width:256,height:256});
 for(let frame=0;frame<6;frame++){
  const c=sourceCell(clip,frame);assert.ok(c.x+c.width<=clip.width);assert.ok(c.y+c.height<=clip.height);
 }
});
test('stage backgrounds cannot leak from another world, character fallbacks can',()=>{
 const player=new FestivalAnimation();player.clips=[
  {kind:'background',stage:'forest',variant:0,file:'forest.webp'},
  {kind:'character',stage:'forest',character:'wolf',action:'talk',variant:0,file:'wolf.webp'}
 ];player.setStage('sushi');
 assert.equal(player.find('background'),undefined);
 assert.equal(player.find('character',{character:'wolf',action:'talk'}).file,'wolf.webp');
});
test('the decoded image cache evicts only unpinned sheets during next-stage loading',()=>{
 const player=new FestivalAnimation();player.limit=2;player.pinned.add('playing');
 player.images.set('playing',{});player.images.set('old',{});player.images.set('new',{});player.prune();
 assert.deepEqual([...player.images.keys()],['playing','new']);
 player.images.set('later',{});player.get({file:'new'});player.prune();
 assert.deepEqual([...player.images.keys()],['playing','new']);
});
test('a character variant with clipped poses falls back to a fuller animation',()=>{
 const player=new FestivalAnimation();player.clips=[
  {kind:'character',stage:'octopus',character:'octopus',action:'act',variant:2,frames:6,usableFrames:[0,5],file:'short.webp'},
  {kind:'character',stage:'octopus',character:'octopus',action:'act',variant:0,frames:6,usableFrames:[0,1,2,3,4,5],file:'full.webp'}
 ];player.setStage('octopus',2);
 assert.equal(player.find('character',{character:'octopus',action:'act'}).file,'full.webp');
});
