import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCustomDisc,cleanDiscText,DISC_SHAPES,traceDiscShape,drawDiscDecoration,matchCosmetics} from '../src/cosmetics.js';
import {normalizeDiscCollection,saveDiscDesign,equipDiscDesign,removeDiscDesign,restoreDiscDesign,DISC_LIBRARY_LIMIT} from '../src/disc-library.js';
import {normalizeProfile,purchaseItem} from '../src/progression.js';
import {mergeOnlineLedger} from '../src/online.js';
import {installStoneTextures} from '../src/rendering.js';
import {createRoom,publicRoom} from '../server/game.js';
import {PLAYERS} from '../src/engine.js';

const ornate=normalizeCustomDisc({enabled:true,shape:'heart',color:'#ff5a91',secondaryColor:'#4b1649',colorMode:'gradient',text:'彩り☆',textFont:'serif',textPosition:'center',textSize:40,textColor:'#e4f4ff',edgeWidth:5,edgeColor:'#ead397',pattern:'waves',emblem:'moon',accentColor:'#dcc2ff'});
const fresh=()=>normalizeProfile({coins:300,stats:{played:4,wins:2,draws:0}});
const save=(profile,id,name='星のコマ',design=ornate,equip=true)=>saveDiscDesign(profile,{name,design,equip},()=>id);

test('new collections are empty and old single-design saves migrate once without losing progress',()=>{
  assert.deepEqual(fresh().discLibrary,[]);assert.equal(fresh().activeDiscId,null);
  const old={coins:170,customDisc:{enabled:true,color:'#173862',finish:'metal',emblem:'moon'},stats:{played:3,wins:1}};
  const profile=normalizeProfile(old);assert.equal(profile.discLibrary.length,1);assert.equal(profile.activeDiscId,'legacy-custom');assert.equal(profile.customDisc.color,'#173862');assert.equal(profile.customDisc.shape,'round');assert.equal(profile.coins,170);assert.equal(profile.stats.wins,1);
  assert.deepEqual(normalizeProfile(JSON.parse(JSON.stringify(profile))),profile);
  const disabled=normalizeProfile({...old,customDisc:{...old.customDisc,enabled:false}});assert.equal(disabled.discLibrary.length,1);assert.equal(disabled.activeDiscId,null);assert.equal(disabled.customDisc.enabled,false);
});
test('creating, editing and selecting named designs preserve other designs and saved progress',()=>{
  const a=save(fresh(),'a','星のコマ').profile,b=save(a,'b','花のコマ',{...ornate,shape:'flower'},false).profile;
  assert.equal(b.discLibrary.length,2);assert.equal(b.activeDiscId,'a');assert.equal(a.discLibrary.length,1);
  const selected=equipDiscDesign(b,'b').profile;assert.equal(selected.customDisc.shape,'flower');
  const edited=saveDiscDesign(selected,{id:'b',name:'花と文字',design:{...ornate,shape:'flower',text:'HELLO'},equip:false}).profile;
  assert.equal(edited.discLibrary.length,2);assert.equal(edited.customDisc.text,'HELLO');assert.equal(edited.discLibrary[0].design.text,'彩り☆');assert.equal(edited.coins,300);assert.deepEqual(edited.stats,fresh().stats);
  assert.deepEqual(mergeOnlineLedger(purchaseItem(edited,'walnut').profile,{id:'ledger',earned:70,played:1,wins:1,draws:0}).discLibrary,edited.discLibrary);
});
test('deletion is recoverable and removing an equipped design switches to standard discs',()=>{
  const profile=save(save(fresh(),'a').profile,'b','第二作',ornate,false).profile;
  const removal=removeDiscDesign(profile,'a');assert.equal(removal.ok,true);assert.equal(removal.profile.customDisc.enabled,false);assert.equal(removal.profile.activeDiscId,null);assert.equal(removal.profile.discLibrary.length,1);
  const restored=restoreDiscDesign(removal.profile,removal.removed);assert.equal(restored.ok,true);assert.equal(restored.profile.discLibrary.length,2);assert.deepEqual(restored.profile.discLibrary.find(d=>d.id==='a').design,ornate);
  assert.equal(equipDiscDesign(restored.profile,'a').profile.customDisc.enabled,true);
  assert.equal(restoreDiscDesign(restored.profile,removal.removed).ok,false);
  assert.equal(profile.discLibrary.length,2);
});
test('collection size limits, duplicate IDs and stale edits never overwrite another saved design',()=>{
  let profile=fresh();for(let i=0;i<DISC_LIBRARY_LIMIT;i++){const result=save(profile,`disc-${i}`);assert.equal(result.ok,true);profile=result.profile;}
  const before=JSON.stringify(profile);assert.equal(save(profile,'overflow').ok,false);assert.equal(JSON.stringify(profile),before);
  const edit=saveDiscDesign(profile,{id:'disc-0',name:'updated',design:ornate});assert.equal(edit.ok,true);assert.equal(edit.profile.discLibrary.length,24);
  assert.equal(saveDiscDesign(profile,{id:'deleted-id',design:ornate}).ok,false);assert.equal(equipDiscDesign(profile,'missing').ok,false);
  assert.equal(save(save(fresh(),'same').profile,'same').ok,false);
});
test('imported collections bound names and geometry, reject unsafe IDs and restore only a valid equipped item',()=>{
  const raw={discLibrary:[{id:'bad;}',name:'bad',design:ornate},{id:'good',name:'<img src=x>\u202e'.repeat(8),design:ornate},{id:'good',name:'duplicate',design:{}},...Array.from({length:70},(_,i)=>({id:`d-${i}`,design:{shape:'url(bad)',edgeWidth:Infinity,textSize:999,textFont:'evil',text:'123456789'}}))],activeDiscId:'good'};
  const normalized=normalizeDiscCollection(raw);assert.equal(normalized.discLibrary.length,24);assert.equal(normalized.customDisc.shape,'heart');assert.ok(normalized.discLibrary[0].name.length<=24);assert.ok(!normalized.discLibrary[0].name.includes('\u202e'));
  for(const item of normalized.discLibrary.slice(1)){assert.equal(item.design.shape,'round');assert.equal(item.design.text,'12345678');assert.equal(item.design.textSize,48);assert.equal(item.design.edgeWidth,0);}
  const invalid=normalizeDiscCollection({...raw,activeDiscId:'bad;}'});assert.equal(invalid.activeDiscId,null);assert.equal(invalid.customDisc.enabled,false);
});
test('inscriptions preserve multilingual graphemes, reject hidden controls and fit the socket payload limit',()=>{
  assert.equal(cleanDiscText('か\u3099'), 'が');assert.equal(cleanDiscText('彩り HELLO WORLD'),'彩り HELLO');
  assert.equal(cleanDiscText('A\u202eB\u0000C'),'ABC');assert.equal(cleanDiscText('👩‍🎨'.repeat(10)),'👩‍🎨'.repeat(8));
  const text=normalizeCustomDisc({...ornate,text:'👩‍👩‍👧‍👧'.repeat(100)}).text;assert.ok([...text].length<=64);assert.ok(JSON.stringify({action:'join',protocol:2,customDisc:{...ornate,text}}).length<1024);
  for(const bad of [{shape:'constructor',color:'url(javascript:1)',textFont:{},edgeWidth:-99,textSize:NaN},{shape:'<svg>',text:['x']}]){const d=normalizeCustomDisc(bad);assert.equal(d.shape,'round');assert.equal(d.color,'#9354ce');assert.equal(d.textFont,'sans');assert.equal(d.edgeWidth,0);}
});
test('all silhouettes generate finite closed geometry and text is painted as text, never interpreted as markup',()=>{
  const calls=[];let depth=0;
  const ctx=new Proxy({save(){depth++;},restore(){depth--;},fillText(...args){calls.push(['text',...args]);}},{get:(o,k)=>o[k]??((...args)=>{for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a));calls.push([k,...args]);})});
  for(const shape of Object.keys(DISC_SHAPES)){const start=calls.length;traceDiscShape(ctx,shape);assert.equal(depth,0);assert.ok(calls.slice(start).some(c=>c[0]==='closePath'));drawDiscDecoration(ctx,{...ornate,shape,text:'<b>彩</b>'});assert.equal(depth,0);}
  assert.equal(calls.filter(c=>c[0]==='text').length,7);assert.ok(calls.filter(c=>c[0]==='text').every(c=>c[1]==='<b>彩</b>'));
});
test('gallery textures are bounded to one style and create no stock textures; identical reopenings do no drawing',()=>{
  let canvases=0,drawnText=0;const styles=new Map(),gradient={addColorStop(){}};
  const context=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,fillText:()=>drawnText++},{get:(o,k)=>o[k]??(()=>{})});
  const doc={getElementById:id=>styles.get(id),head:{append:s=>styles.set(s.id,s)},body:{append(){},classList:{add(){}}},createElement:type=>type==='canvas'?{getContext(){canvases++;return context;},toDataURL:()=>`data:image/png;base64,${canvases}`}:{dataset:{},style:{},remove(){}}};
  const designs=Object.fromEntries(Array.from({length:24},(_,i)=>[`library-${i}`,{...ornate,shape:Object.keys(DISC_SHAPES)[i%7]}]));
  const paint=()=>installStoneTextures(doc,Object.keys(designs),()=>({getPropertyValue:()=>''}),designs,'gallery',{racks:false});
  paint();assert.equal(canvases,24);assert.equal(drawnText,24);const style=styles.get('gallery');
  for(let i=0;i<30;i++)paint();assert.equal(canvases,24);assert.equal(styles.size,1);assert.equal(styles.get('gallery'),style);assert.ok(!style.textContent.includes('--rack-image'));
});
test('online peers receive shape and inscription; each keeps the same assigned base color while offline retains gradients',()=>{
  const players=Array.from({length:4},(_,i)=>({id:`p${i}`,name:`P${i}`,customDisc:ornate})),room=createRoom('shapes',players,0,()=>.999),view=publicRoom(room,'p0',0);
  assert.ok(view.seats.every(s=>s.customDisc.shape==='heart'&&s.customDisc.text==='彩り☆'&&!('id' in s)));
  const colors=PLAYERS.map(p=>({id:p.color,name:p.name})),styled=matchCosmetics(colors,'online',0,ornate,view.seats);
  for(const d of Object.values(styled.designs)){assert.equal(d.shape,'heart');assert.equal(d.textFont,'serif');assert.equal(d.colorMode,'solid');}
  assert.equal(new Set(Object.values(styled.designs).map(d=>d.color)).size,4);
  assert.equal(matchCosmetics(colors,'solo',0,ornate).designs['custom-0'].colorMode,'gradient');
});
