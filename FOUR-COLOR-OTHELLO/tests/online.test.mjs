import test from 'node:test';
import assert from 'node:assert/strict';
import {Lobby} from '../server/lobby.js';
import {nickname,createRoom,roomAction,tickRoom,rewardFor,publicRoom} from '../server/game.js';
import {firstRoundMoves,scores} from '../src/engine.js';
import {mergeOnlineLedger} from '../src/online.js';
const people=Array.from({length:8},(_,i)=>({id:'p'+i,name:'プレイヤー'+i}));
function lobby(){let n=0;return new Lobby(undefined,()=>`room-${++n}`);}
test('ニックネームは1〜12文字、制御文字とHTMLを拒否',()=>{assert.equal(nickname(' ネコ１２ '),'ネコ12');for(const n of ['','<img src=x>','a\u202eb','長'.repeat(13),{},null])assert.throws(()=>nickname(n));});
test('1〜3人でもちょうど60秒でAI補充、4人なら即座に同じ卓',()=>{
 for(let humans=1;humans<=4;humans++){
  const l=lobby();people.slice(0,humans).forEach(p=>l.action(p,'join',{},1000));
  if(humans<4){l.tick(60999);assert.equal(Object.keys(l.data.rooms).length,0);l.tick(61000);}
  const room=l.room('p0');assert.equal(room.seats.filter(p=>p.bot).length,4-humans);
  for(const p of people.slice(0,humans))assert.equal(l.room(p.id).id,room.id);
 }
});
test('重複参加・8人同時参加・キャンセル・通信切断の待機席',()=>{
 const l=lobby();l.action(people[0],'join',{},0);l.action(people[0],'join',{},0);assert.equal(l.data.queue.length,1);
 l.action(people[0],'leave',{},10);assert.equal(l.data.queue.length,0);
 people.forEach(p=>l.action(p,'join',{},20));assert.equal(Object.keys(l.data.rooms).length,2);assert.equal(new Set(Object.values(l.data.assignments)).size,2);
 const q=lobby();q.action(people[0],'join',{},0);q.disconnect('p0',1000);q.tick(61000);assert.equal(q.data.queue.length,0);assert.equal(Object.keys(q.data.rooms).length,0);
});
test('手番・部外者・古い盤面・不正手をサーバーが拒否する',()=>{
 const r=createRoom('r',people.slice(0,4),0,()=>.999);tickRoom(r,5000);
 const move=firstRoundMoves(r.board,0,r.moved)[0],before=r.board.slice();
 for(const [id,m]of [['p1',{index:move,ply:0,room:'r'}],['other',{}],['p0',{index:move,ply:1,room:'r'}],['p0',{index:27,ply:0,room:'r'}],['p0',{index:move,ply:0,room:'wrong'}]])assert.throws(()=>roomAction(r,id,'move',m,5100));
 assert.deepEqual(r.board,before);roomAction(r,'p0','move',{index:move,ply:0,room:'r'},5100);assert.equal(r.ply,1);
 assert.throws(()=>roomAction(r,'p0','move',{index:move,ply:0,room:'r'},5100));assert.equal(r.ply,1);
});
test('最初の着手前にどの色も全滅させず、45秒のタイムアウトをAIが代行',()=>{
 const r=createRoom('r',people.slice(0,4),0,()=>.999);tickRoom(r,5000);tickRoom(r,49999);assert.equal(r.ply,0);tickRoom(r,50000);assert.equal(r.ply,1);assert.equal(r.seats[0].misses,1);assert.ok(scores(r.board).every(n=>n>0));assert.equal(r.lastMove.automatic,true);
});
test('60秒以内の再接続は席を保ち、経過後と降参はAIが継続する',()=>{
 const l=lobby();people.slice(0,4).forEach(p=>l.action(p,'join',{},0));const r=l.room('p0');l.disconnect('p0',100);l.connect('p0',59999);assert.equal(r.seats.find(s=>s.id==='p0').forfeit,false);
 l.disconnect('p0',60000);l.tick(120000);assert.equal(r.seats.find(s=>s.id==='p0').forfeit,true);
 l.action(people[1],'resign',{},120001);assert.notEqual(r.phase,'ended');assert.equal(r.seats.find(s=>s.id==='p1').forfeit,true);
});
test('再戦は全員同意したときだけ、新しい一意の部屋へ移る',()=>{
 const l=lobby();people.slice(0,4).forEach(p=>l.action(p,'join',{},0));const first=l.room('p0');first.phase='ended';first.winners=[0];first.endedAt=1;
 for(const p of people.slice(0,3))l.action(p,'rematch',{},10);assert.equal(l.room('p0').id,first.id);
 l.action(people[3],'rematch',{},10);const second=l.room('p0');assert.notEqual(second.id,first.id);assert.equal(second.ply,0);assert.equal(second.seats.filter(s=>s.bot).length,0);
 second.phase='ended';second.winners=[0];second.endedAt=20;people.slice(0,4).forEach(p=>l.action(p,'rematch',{},30));assert.notEqual(l.room('p0').id,second.id);
});
test('全員退出で終了、部屋の掃除と報酬・スタンプ・ID秘匿',()=>{
 const l=lobby();people.slice(0,4).forEach(p=>l.action(p,'join',{},0));const r=l.room('p0');l.action(people[0],'reaction',{stamp:'よろしく！'},1);assert.throws(()=>l.action(people[0],'reaction',{stamp:'よろしく！'},2));
 assert.ok(publicRoom(r,'p0',5).seats.every(s=>s.id===undefined));people.slice(0,4).forEach(p=>l.action(p,'leave',{},20));assert.equal(r.phase,'ended');assert.equal(rewardFor(r,'p0').amount,0);r.settled=true;l.tick(600020);assert.equal(Object.keys(l.data.rooms).length,0);assert.equal(l.nextAlarm(600020),null);
});
test('複数対局を完走し報酬を二重加算しない。AI席・引継ぎ席は人間の報酬にしない',()=>{
 for(let n=0;n<20;n++){
  const r=createRoom('match'+n,people.slice(0,4),0);tickRoom(r,5000);let now=6000;
  while(r.phase!=='ended'){const moves=firstRoundMoves(r.board,r.player,r.moved);roomAction(r,r.seats[r.player].id,'move',{index:moves[n%moves.length],room:r.id,ply:r.ply},now++);assert.equal(r.board.filter(p=>p!==null).length,16+r.ply);}
  for(const p of people.slice(0,4)){const reward=rewardFor(r,p.id);assert.ok([0,35,70].includes(reward.amount));}
 }
 const ledger={id:'abc',earned:70,played:1,wins:1,draws:0};const p=mergeOnlineLedger(null,ledger);assert.equal(p.coins,70);assert.deepEqual(mergeOnlineLedger(p,ledger),p);
 const latest=mergeOnlineLedger(p,{...ledger,earned:140,played:2,wins:2});assert.equal(latest.coins,140);
 assert.equal(mergeOnlineLedger(mergeOnlineLedger(latest,ledger),{...ledger,earned:140,played:2,wins:2}).coins,140);
});
test('通信クライアントは操作前に接続せず、切断後に再参加し、停止すると再試行しない',async()=>{
 const {createOnlineClient}=await import('../src/online.js');
 const oldWS=globalThis.WebSocket,oldLocation=globalThis.location,all=[];
 class FakeSocket{constructor(){this.readyState=0;this.sent=[];all.push(this);}send(text){this.sent.push(text);}close(code=1000){this.readyState=3;this.onclose?.({code});}}
 globalThis.WebSocket=FakeSocket;globalThis.location={href:'https://game.example/',protocol:'https:'};
 const states=[],errors=[];const client=createOnlineClient({onState:s=>states.push(s),onStatus:()=>{},onError:e=>errors.push(e)});
 try{
  assert.equal(all.length,0);client.connect();assert.equal(all.length,1);
  const first=all[0];first.readyState=1;first.onopen();first.onmessage({data:JSON.stringify({waiting:false})});assert.equal(JSON.parse(first.sent[0]).action,'join');
  first.onmessage({data:JSON.stringify({error:'拒否'})});assert.deepEqual(errors,['拒否']);
  first.close();await new Promise(r=>setTimeout(r,760));assert.equal(all.length,2);
  const second=all[1];second.readyState=1;second.onopen();second.onmessage({data:JSON.stringify({waiting:false})});assert.equal(JSON.parse(second.sent[0]).action,'join');
  client.stop();await new Promise(r=>setTimeout(r,760));assert.equal(all.length,2);
 }finally{client.stop();globalThis.WebSocket=oldWS;globalThis.location=oldLocation;}
});
