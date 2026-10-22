import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {StarlineMusic} from '../src/starline-music.js';
import {STARLINE_TEMPOS,ENDLESS_TEMPOS} from '../src/starline-core.js';

test('expert music uses the original score and pitches, with real shorter loops at each BPM',async()=>{
 const base=new URL('../assets/audio/festival/starline/',import.meta.url);
 const manifest=JSON.parse(await readFile(new URL('manifest.json',base),'utf8'));
 assert.deepEqual(Object.keys(manifest.tracks).map(Number),ENDLESS_TEMPOS);
 const original=JSON.parse(await readFile(new URL('../music/space-score.json',base),'utf8'));
 for(const bpm of ENDLESS_TEMPOS.slice(1)){
  const track=manifest.tracks[bpm],score=JSON.parse(await readFile(new URL(`score-${bpm}.json`,base),'utf8'));
  assert.equal(score.bpm,bpm);assert.deepEqual(score.notes,original.notes);
  const wav=await readFile(new URL(track.file,base));assert.equal(createHash('sha256').update(wav).digest('hex'),track.sha256);
  assert.ok(Math.abs(track.frames/track.sampleRate-32*60/bpm)<1/track.sampleRate);
  assert.ok(track.peak<=.74);assert.equal(track.loopBoundaryDelta,0);
 }
});

test('tempo switches preserve musical phase, schedule on the audio clock, and stop with the shared player',()=>{
 const starts=[],stops=[],ramps=[];
 const audio={active:true,origin:10,sources:new Set(),musicDuck:{},musicSource:{stop(at){stops.push(at);}},ctx:{currentTime:10,
  createBufferSource(){return {connect(){},disconnect(){},start(...args){starts.push(args);},stop(at){stops.push(at);}};},
  createGain(){return {connect(){},disconnect(){},gain:{setValueAtTime(){},linearRampToValueAtTime(...args){ramps.push(args);}}};}
 }};
 const music=new StarlineMusic(audio);for(const bpm of STARLINE_TEMPOS)music.buffers.set(bpm,{duration:32*60/bpm});
 music.schedule(132,0,0);assert.deepEqual(starts[0],[10,0]);
 const next=music.schedule(154,15,36);assert.equal(next.when,25);assert.ok(Math.abs(next.offset-4*60/154)<1e-9);
 assert.equal(stops[1],25.016);assert.equal(audio.sources.size,2);assert.ok(ramps.some(([v,t])=>v===0&&t===25.015));
 audio.ctx.currentTime=30.08;const late=music.schedule(176,20,68);
 assert.equal(late.when,30.08);assert.ok(Math.abs(late.offset-(4*60/176+.08))<1e-9);
 audio.active=false;assert.equal(music.schedule(220,30,100),false);
});
