import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCustomDisc,normalizeDiscLayer,transformDiscLayer,DISC_LAYER_LIMIT,DISC_STAMPS,DISC_FONT_STACKS,drawDiscDecoration,matchCosmetics} from '../src/cosmetics.js';
import {saveDiscDesign,equipDiscDesign} from '../src/disc-library.js';
import {createRoom,publicRoom} from '../server/game.js';
const layered=normalizeCustomDisc({enabled:true,gradientAngle:270,colorMode:'gradient',layers:[{type:'stamp',stamp:'heart',x:35,y:70,rotation:-25,scaleX:60,scaleY:120,color:'#ff99ab'},{type:'text',text:'彩り IRODORY',font:'serif',rotation:35,x:55,y:40,opacity:75}]});
test('透明シートの位置・角度・縦横サイズ・透明度・フォントを正規化し、上限は16枚',()=>{
 const bad=normalizeDiscLayer({text:'A\u202eB'.repeat(100),x:-1,y:200,rotation:Infinity,scaleX:0,scaleY:999,opacity:NaN,color:'url(evil)',font:{},stamp:'constructor'});
 assert.equal(bad.x,0);assert.equal(bad.y,100);assert.equal(bad.rotation,0);assert.equal(bad.scaleX,25);assert.equal(bad.scaleY,250);assert.equal(bad.opacity,100);assert.equal(bad.font,'sans');assert.equal(bad.stamp,'star');assert.equal(bad.color,'#fff4dd');assert.equal([...bad.text].length,24);assert.ok(!bad.text.includes('\u202e'));
 const full=normalizeCustomDisc({layers:Array(100).fill(bad),gradientAngle:Infinity});assert.equal(full.layers.length,DISC_LAYER_LIMIT);assert.equal(full.gradientAngle,135);
 assert.deepEqual(normalizeCustomDisc(layered),layered);assert.deepEqual(normalizeCustomDisc({text:'旧コマ'}).layers,[]);
 const maximum=normalizeCustomDisc({layers:Array(16).fill({text:'👩‍👩‍👧‍👧'.repeat(24),font:'impact'})});assert.ok(JSON.stringify({action:'join',protocol:2,customDisc:maximum}).length<16384);
});
test('文字・スタンプを保存した順に変形して描画し、クリップと状態を復元する',()=>{
 const calls=[];let depth=0;
 const ctx=new Proxy({save(){depth++;},restore(){depth--;},fillText(...args){calls.push(['text',...args]);}},{get:(o,k)=>o[k]??((...args)=>{for(const arg of args)if(typeof arg==='number')assert.ok(Number.isFinite(arg));calls.push([k,...args]);})});
 drawDiscDecoration(ctx,layered);assert.equal(depth,0);assert.ok(calls.some(c=>c[0]==='clip'));assert.ok(calls.some(c=>c[0]==='translate'&&c[1]===99&&c[2]===155));assert.ok(calls.some(c=>c[0]==='rotate'&&Math.abs(c[1]-35*Math.PI/180)<1e-9));assert.ok(calls.some(c=>c[0]==='text'&&c[1]==='彩り IRODORY'));
 for(const stamp of Object.keys(DISC_STAMPS))for(const font of Object.keys(DISC_FONT_STACKS)){drawDiscDecoration(ctx,{layers:[{type:'stamp',stamp},{type:'text',text:'<b>彩</b>',font}]});assert.equal(depth,0);}
});
test('ギャラリー保存・選択・JSON復元・オンライン共有でもシートを保持し、席の色を保つ',()=>{
 const result=saveDiscDesign({}, {name:'透明シート',design:layered},()=> 'layer-design');assert.equal(result.ok,true);
 const restored=JSON.parse(JSON.stringify(result.profile));assert.deepEqual(equipDiscDesign(restored,'layer-design').profile.customDisc.layers,layered.layers);
 const members=Array.from({length:4},(_,i)=>({id:'p'+i,name:'Player'+i,customDisc:layered})),room=createRoom('sheets',members,0,()=>.999),view=publicRoom(JSON.parse(JSON.stringify(room)),'p0',0);
 for(const seat of view.seats)assert.deepEqual(seat.customDisc.layers,layered.layers);
 const colors=['red','blue','yellow','green'].map(id=>({id,name:id})),cosmetics=matchCosmetics(colors,'online',0,layered,view.seats);
 assert.equal(cosmetics.designs['custom-0'].colorMode,'solid');assert.deepEqual(cosmetics.designs['custom-0'].layers,layered.layers);
});

test('画面サイズに依存せず移動し、回転後のローカル軸でシートの右下をリサイズ',()=>{
 const initial=normalizeDiscLayer({type:'text',rotation:90});
 const moved=transformDiscLayer(initial,.1,-.1);assert.equal(moved.x,64);assert.equal(moved.y,35);
 const resized=transformDiscLayer(initial,0,.1,true);assert.ok(resized.scaleX>100);assert.equal(resized.scaleY,100);
 assert.equal(transformDiscLayer(initial,10,10,true).scaleX,250);assert.equal(transformDiscLayer(initial,-10,-10,true).scaleX,25);
});
