import assert from 'node:assert/strict';
import WebSocket from 'ws';
import {firstRoundMoves} from '../src/engine.js';
import {normalizeCustomDisc} from '../src/cosmetics.js';
const base=process.argv[2]??'http://127.0.0.1:8787';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label,timeout=12000){const start=Date.now();while(!fn()){if(Date.now()-start>timeout)throw new Error('Timed out: '+label);await wait(40);}}
const clients=[];
async function player(name){
 const response=await fetch(base+'/api/session',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({name})});assert.equal(response.status,200);const user=await response.json();
 const c={user,cookie:response.headers.get('set-cookie').split(';')[0],state:null,errors:[]};clients.push(c);await connect(c);return c;
}
async function connect(c){
 c.state=null;c.errors=[];c.ws=new WebSocket(base.replace(/^http/,'ws')+'/api/socket',{headers:{Origin:base,Cookie:c.cookie}});
 c.ws.on('message',bytes=>{const text=String(bytes);if(text==='pong')return;const data=JSON.parse(text);if(data.error)c.errors.push(data.error);else c.state=data;});
 await until(()=>c.state,'websocket handshake');c.send=(action,input={})=>c.ws.send(JSON.stringify({action,...input}));
}
try{
 assert.equal((await fetch(base+'/api/health')).status,200);
 assert.equal((await fetch(base+'/api/session',{method:'POST',headers:{Origin:'https://untrusted.example'},body:'{}'})).status,403);
 assert.equal((await fetch(base+'/api/session',{method:'POST',headers:{Origin:base},body:JSON.stringify({name:'<script>'})})).status,400);
 const group=await Promise.all([1,2,3,4].map(i=>player('動作テスト'+i)));
 assert.equal(group[0].state.players?.length,0,'Run integration tests only when the waiting room is empty.');
 const settings={size:6,turnSeconds:30,aiDifficulty:'hard'};
 const customDisc=normalizeCustomDisc({enabled:true,color:'#9354ce',finish:'metal',pattern:'rings',emblem:'star',shape:'hexagon',text:'彩り☆',textPosition:'center',textFont:'serif',edgeWidth:4,colorMode:'gradient',secondaryColor:'#df749d'});
 group[0].send('join',{protocol:2,customDisc});await until(()=>group[0].state.isHost,'first player is host');
 const startAt=group[0].state.startAt;
 group[0].send('settings',{settings});await until(()=>group[0].state.settings?.size===6,'host settings saved');
 assert.equal(group[0].state.startAt,startAt);
 group[1].send('join',{protocol:2});await until(()=>group[1].state.waiting,'second joins');assert.deepEqual(group[1].state.settings,settings);
 group[1].send('settings',{settings:{...settings,size:12}});await until(()=>group[1].errors.length,'nonhost changes rejected');assert.equal(group[1].state.settings.size,6);
 group[0].send('leave');await until(()=>group[1].state.isHost,'host transfers');assert.deepEqual(group[1].state.settings,settings);
 group[0].send('join',{protocol:2,customDisc});await until(()=>group[0].state.waiting,'original host returns');assert.equal(group[0].state.isHost,false);
 for(const c of group.slice(2))c.send('join',{protocol:2});
 await until(()=>group.every(c=>c.state.room),'four humans match');
 const roomId=group[0].state.room.id;assert.ok(group.every(c=>c.state.room.id===roomId));assert.equal(group[0].state.room.seats.filter(s=>s.bot).length,0);
 assert.equal(new Set(group.map(c=>c.state.room.you)).size,4);
 for(const c of group){assert.equal(c.state.room.board.length,36);assert.deepEqual(c.state.room.settings,settings);assert.deepEqual(c.state.room.seats.find(s=>s.name===group[0].user.name).customDisc,customDisc);}
 await until(()=>group.every(c=>c.state.room.phase==='playing'),'countdown');
 const wrong=group.find(c=>c.state.room.you!==c.state.room.player),previousErrors=wrong.errors.length;wrong.send('move',{index:0,ply:0,room:roomId});await until(()=>wrong.errors.length>previousErrors,'illegal turn rejected');assert.equal(wrong.state.room.ply,0);
 const reconnect=group[2];reconnect.ws.close();await wait(300);await connect(reconnect);assert.equal(reconnect.state.room.id,roomId);assert.equal(reconnect.state.room.seats[reconnect.state.room.you].forfeit,false);
 let moves=0;
 while(group[0].state.room.phase!=='ended'){
  const room=group[0].state.room,c=group.find(c=>c.state.room.you===room.player),index=firstRoundMoves(room.board,room.player,room.moved)[0];
  c.send('move',{index,ply:room.ply,room:room.id});await until(()=>group.every(c=>c.state.room.ply>room.ply),'move sync');
  assert.ok(group.every(c=>JSON.stringify(c.state.room.board)===JSON.stringify(group[0].state.room.board)));
  for(const client of group)assert.deepEqual(client.state.room.lastPlacements[room.player],{index,player:room.player});
  moves++;await wait(180);
 }
 assert.ok(moves>0);assert.equal(group[0].state.room.board.filter(p=>p!==null).length,16+moves);
 for(const c of group){assert.equal(c.state.ledger.played,1);const r=c.state.room;assert.equal(c.state.ledger.earned,r.winners.includes(r.you)?r.winners.length>1?35:70:0);}
 const earned=group.map(c=>c.state.ledger.earned);group[0].send('state');await wait(250);assert.deepEqual(group.map(c=>c.state.ledger.earned),earned);
 for(const c of group)c.send('rematch');await until(()=>group.every(c=>c.state.room.id!==roomId),'all consent rematch');assert.equal(new Set(group.map(c=>c.state.room.id)).size,1);
 assert.deepEqual(group[0].state.room.settings,settings);
 for(const c of group)c.send('resign');await until(()=>group.every(c=>c.state.room.phase==='ended'),'all resign');assert.ok(group.every(c=>c.state.room.abandoned));
 for(const c of group){c.send('leave');await wait(60);c.ws.close();}
 console.log(JSON.stringify({fourPlayerMatch:true,hostSettings:true,hostTransfer:true,nonHostRejected:true,customDiscShared:true,size:6,moves,reconnected:true,synchronized:true,serverReward:true,rematch:true,resign:true}));
 if(!process.argv.includes('--quick')){
  const solo=await player('ひとり動作テスト');solo.send('join',{protocol:2});await until(()=>solo.state.waiting,'solo queue');const joined=Date.now();
  solo.send('settings',{settings:{size:12,turnSeconds:90,aiDifficulty:'hard'}});await until(()=>solo.state.settings?.size===12,'solo host settings');
  const ping=setInterval(()=>{if(solo.ws.readyState===1)solo.ws.send('ping');},15000);
  try{
   await until(()=>solo.state.room,'60 second automatic AI fill',68000);assert.equal(solo.state.room.seats.filter(s=>s.bot).length,3);assert.ok(Date.now()-joined>=59000);
   assert.equal(solo.state.room.board.length,144);assert.deepEqual(solo.state.room.settings,{size:12,turnSeconds:90,aiDifficulty:'hard'});
   await until(()=>solo.state.room.phase==='playing','solo countdown');
   const initial=solo.state.room.ply;
   for(let i=0;i<4;i++){
    const r=solo.state.room;
    if(r.you===r.player)solo.send('move',{index:firstRoundMoves(r.board,r.player,r.moved)[0],ply:r.ply,room:r.id});
    await until(()=>solo.state.room.ply>r.ply,'AI autonomous move',6000);
   }
   solo.send('leave');console.log(JSON.stringify({solo:true,automaticAI:3,waitedSeconds:Math.round((Date.now()-joined)/1000),aiMoves:solo.state.room.ply-initial}));
  }finally{clearInterval(ping);}
 }
}finally{for(const c of clients)if(c.ws?.readyState===1){c.send('leave');c.ws.close();}}
