import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCustomDisc,matchCosmetics,SEAT_COLORS} from '../src/cosmetics.js';
import {normalizeProfile,purchaseItem,equipItem,awardMatch} from '../src/progression.js';
import {mergeOnlineLedger} from '../src/online.js';
import {installStoneTextures} from '../src/rendering.js';
import {PLAYERS,firstRoundMoves,scores} from '../src/engine.js';
import {Lobby} from '../server/lobby.js';
import {createRoom,publicRoom,tickRoom,roomAction} from '../server/game.js';
import {normalizeOnlineSettings,validateOnlineSettings} from '../server/settings.js';

const design=normalizeCustomDisc({enabled:true,color:'#9354ce',finish:'metal',pattern:'rings',emblem:'star'});
const palette=PLAYERS.map(p=>({id:p.color,name:p.name,seat:p.id}));
const players=Array.from({length:4},(_,i)=>({id:`maker-${i}`,name:`Maker ${i}`}));
const config={size:10,turnSeconds:90,aiDifficulty:'hard'};
function waiting(){let id=0;const l=new Lobby(undefined,()=>`workshop-${++id}`);l.action(players[0],'join',{protocol:2,customDisc:design},1000);return l;}

test('custom designs migrate safely and only allow bounded colors, materials and geometry',()=>{
  for(const raw of [undefined,null,4,'<svg>',[],{enabled:'yes',color:'red;}',finish:'__proto__',pattern:'<img>',emblem:'constructor'}]){
    assert.deepEqual(normalizeCustomDisc(raw),normalizeCustomDisc());
  }
  assert.deepEqual(normalizeCustomDisc({...design,color:'#ABCDEF',extra:'<script>'}),{...design,color:'#abcdef'});
  assert.equal(normalizeProfile({coins:300}).customDisc.enabled,false);
  assert.equal(normalizeProfile({customDisc:{...design,enabled:false}}).customDisc.emblem,'star');
});
test('custom disc survives purchases, equipment changes, solo rewards and server ledger merges',()=>{
  const original=normalizeProfile({coins:300,customDisc:design});
  const bought=purchaseItem(original,'walnut');assert.equal(bought.ok,true);
  const equipped=equipItem(bought.profile,'walnut').profile;
  const reward=awardMatch(equipped,{id:'workshop-win',board:Array(36).fill(0),human:0,mode:'solo',difficulty:'normal'});
  assert.equal(reward.awarded,true);
  const merged=mergeOnlineLedger(reward.profile,{id:'workshop-ledger',earned:70,played:1,wins:1,draws:0});
  assert.deepEqual(merged.customDisc,design);assert.equal(merged.equippedBoard,'walnut');assert.ok(merged.coins>220);
  assert.equal(original.coins,300);
});
test('solo custom hue has three distinct opponents regardless of seat; seat colors remain fixed online and in classic',()=>{
  for(let human=0;human<4;human++)for(const color of Object.values(SEAT_COLORS)){
    const result=matchCosmetics(palette,'solo',human,{...design,color});
    const hues=result.colors.map(c=>result.designs[c.id]?.color??SEAT_COLORS[c.id]);
    assert.equal(hues[human],color);assert.equal(new Set(hues).size,4);
    assert.equal(Object.keys(result.designs).length,1);
  }
  const classic=matchCosmetics([{id:'black',name:'黒'},{id:'white',name:'白'}],'solo',1,design);
  assert.equal(classic.designs['custom-1'].color,SEAT_COLORS.white);assert.equal(classic.colors[1].name,'白');
  const seats=players.map(()=>({customDisc:design}));
  const first=matchCosmetics(palette,'online',0,design,seats),other=matchCosmetics(palette,'online',3,{...design,color:'#ffffff'},seats);
  assert.deepEqual(first,other);
  for(let i=0;i<4;i++){assert.equal(first.designs[`custom-${i}`].color,SEAT_COLORS[palette[i].id]);assert.equal(first.designs[`custom-${i}`].emblem,'star');}
  assert.deepEqual(matchCosmetics(palette,'friends',0,design),{colors:palette,designs:{}});
  assert.deepEqual(palette.map(c=>c.id),['red','blue','yellow','green']);
});
test('custom texture installation reuses the same bitmap style and skips unchanged designs',()=>{
  let canvases=0;const styles=new Map();
  const gradient={addColorStop(){}};
  const context=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>o[k]??(()=>{})});
  const doc={getElementById:id=>styles.get(id),body:{append(){},classList:{add(){}}},head:{append:s=>styles.set(s.id,s)},createElement:type=>{
    if(type==='canvas'){canvases++;return {getContext:()=>context,toDataURL:()=>`data:image/png;base64,${canvases}`};}
    return {style:{},dataset:{},remove(){}};
  }};
  const install=d=>installStoneTextures(doc,['custom-preview'],()=>({getPropertyValue:()=>''}),{'custom-preview':d},'preview');
  install(design);const initial=canvases,style=styles.get('preview');
  for(let i=0;i<20;i++)install({...design});assert.equal(canvases,initial);
  for(const emblem of ['star','moon','diamond','flower'])install({...design,emblem});
  assert.equal(styles.size,1);assert.equal(styles.get('preview'),style);assert.ok(style.textContent.includes('--stone:#9354ce'));
});
test('host controls are validated on the server; changes preserve the original wait deadline',()=>{
  const l=waiting();l.action(players[1],'join',{protocol:2},2000);
  assert.equal(l.view(players[0].id,2000).isHost,true);assert.equal(l.view(players[1].id,2000).isHost,false);
  for(const p of [players[1],players[2]])assert.throws(()=>l.action(p,'settings',{settings:config},3000),/ホスト/);
  for(const settings of [{...config,size:7},{...config,size:'10'},{...config,turnSeconds:0},{...config,aiDifficulty:'oni'},null])assert.throws(()=>l.action(players[0],'settings',{settings},3000),/設定/);
  l.action(players[0],'settings',{settings:{...config,extra:'discard'}},4000);
  for(const p of players.slice(0,2)){const view=l.view(p.id,4000);assert.deepEqual(view.settings,config);assert.equal(view.startAt,61000);assert.equal(view.players[0].host,true);}
  assert.deepEqual(normalizeOnlineSettings(),{size:8,turnSeconds:45,aiDifficulty:'normal'});
  assert.deepEqual(validateOnlineSettings(config),config);
});
test('host transfers on disconnect or leaving and preserves settings for the next waiting player',()=>{
  for(const leave of [false,true]){
    const l=waiting();l.action(players[1],'join',{protocol:2},2000);l.action(players[0],'settings',{settings:config},2500);
    if(leave)l.action(players[0],'leave',{},3000);else l.disconnect(players[0].id,3000);
    assert.equal(l.view(players[1].id,3000).isHost,true);assert.deepEqual(l.view(players[1].id,3000).settings,config);
    assert.throws(()=>l.action(players[0],'settings',{settings:config},4000),/ホスト/);
    l.action(players[1],'settings',{settings:{...config,size:6}},4000);assert.equal(l.view(players[1].id,4000).settings.size,6);
    l.action(players[1],'leave',{},5000);l.tick(20000);assert.deepEqual(l.data.waitingSettings,normalizeOnlineSettings());
  }
});
test('four humans start with host settings and sanitized designs; settings become immutable during a match',()=>{
  const l=waiting();l.action(players[0],'settings',{settings:config},2000);
  for(const p of players.slice(1))l.action(p,'join',{protocol:2,customDisc:{...design,color:'bad',html:'<svg>'}},3000);
  const room=l.room(players[0].id);assert.equal(room.board.length,100);assert.deepEqual(room.settings,config);
  assert.throws(()=>l.action(players[0],'settings',{settings:{...config,size:6}},3100),/ホスト/);
  for(const p of players){const view=l.view(p.id,3100).room;assert.deepEqual(view.settings,config);assert.ok(view.seats.every(s=>s.id===undefined&&s.customDisc.color==='#9354ce'&&s.customDisc.html===undefined));}
  assert.deepEqual(l.data.waitingSettings,normalizeOnlineSettings());
});
test('one-player queue fills with three AI after 60 seconds using the chosen board and difficulty',()=>{
  const l=waiting();l.action(players[0],'settings',{settings:config},60000);
  l.tick(60999);assert.equal(l.room(players[0].id),undefined);l.tick(61000);
  const room=l.room(players[0].id);assert.equal(room.board.length,100);assert.deepEqual(room.settings,config);assert.equal(room.seats.filter(s=>s.bot).length,3);
  tickRoom(room,66000);tickRoom(room,room.deadline);assert.equal(room.ply,1);assert.ok(scores(room.board).every(v=>v>0));
});
test('all board sizes can finish and each selected human time limit is respected',()=>{
  for(const size of [6,8,10,12])for(const turnSeconds of [30,45,60,90]){
    const r=createRoom('dimension',players,0,()=>.999,{size,turnSeconds,aiDifficulty:'easy'});tickRoom(r,5000);
    assert.equal(r.deadline,5000+turnSeconds*1000);tickRoom(r,r.deadline-1);assert.equal(r.ply,0);tickRoom(r,r.deadline);assert.equal(r.ply,1);
    let now=r.deadline-turnSeconds*1000+1;
    while(r.phase!=='ended'){
      const index=firstRoundMoves(r.board,r.player,r.moved)[0];assert.ok(Number.isInteger(index));
      roomAction(r,r.seats[r.player].id,'move',{index,ply:r.ply,room:r.id},now++);
      assert.equal(r.board.length,size*size);assert.equal(r.board.filter(v=>v!==null).length,16+r.ply);
    }
    assert.ok(r.ply<=size*size-16);assert.ok(r.winners.length>0);
  }
});
test('rematches retain settings and designs, while a new empty lobby starts with defaults',()=>{
  const l=waiting();l.action(players[0],'settings',{settings:config},2000);for(const p of players.slice(1))l.action(p,'join',{protocol:2},3000);
  const first=l.room(players[0].id);first.phase='ended';first.endedAt=4000;first.winners=[0];
  for(const p of players)l.action(p,'rematch',{},4100);
  const next=l.room(players[0].id);assert.notEqual(first.id,next.id);assert.deepEqual(next.settings,config);assert.deepEqual(next.seats.find(s=>s.id===players[0].id).customDisc,design);
});
test('old clients cannot enter configurable matches, while saved active matches and new waiting rooms restore safely',()=>{
  const l=waiting();assert.throws(()=>l.action(players[1],'join',{},1100),/再読み込み/);
  l.action(players[0],'settings',{settings:config},2000);
  const copy=new Lobby(JSON.parse(JSON.stringify(l.data)));assert.equal(copy.host().id,players[0].id);assert.deepEqual(copy.data.waitingSettings,config);
  const legacy=createRoom('old',players,0,()=>.999);delete legacy.settings;legacy.seats.forEach(s=>delete s.customDisc);
  const restored=new Lobby({queue:[{id:'old-wait',joined:0,disconnectedAt:null}],rooms:{old:legacy},assignments:{[players[0].id]:'old'}});
  assert.equal(restored.data.queue.length,0);const view=publicRoom(legacy,players[0].id,0);assert.equal(view.settings.size,8);assert.ok(view.seats.every(s=>!s.customDisc.enabled));
  tickRoom(legacy,5000);assert.equal(legacy.deadline,50000);
});
