import assert from 'node:assert/strict';
import WebSocket from 'ws';
import {firstRoundMoves} from '../src/engine.js';
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
 for(const c of group)c.send('join');
 await until(()=>group.every(c=>c.state.room),'four humans match');
 const roomId=group[0].state.room.id;assert.ok(group.every(c=>c.state.room.id===roomId));assert.equal(group[0].state.room.seats.filter(s=>s.bot).length,0);
 assert.equal(new Set(group.map(c=>c.state.room.you)).size,4);
 await until(()=>group.every(c=>c.state.room.phase==='playing'),'countdown');
 const wrong=group.find(c=>c.state.room.you!==c.state.room.player);wrong.send('move',{index:0,ply:0,room:roomId});await until(()=>wrong.errors.length,'illegal turn rejected');assert.equal(wrong.state.room.ply,0);
 const reconnect=group[2];reconnect.ws.close();await wait(300);await connect(reconnect);assert.equal(reconnect.state.room.id,roomId);assert.equal(reconnect.state.room.seats[reconnect.state.room.you].forfeit,false);
 let moves=0;
 while(group[0].state.room.phase!=='ended'){
  const room=group[0].state.room,c=group.find(c=>c.state.room.you===room.player),index=firstRoundMoves(room.board,room.player,room.moved)[0];
  c.send('move',{index,ply:room.ply,room:room.id});await until(()=>group.every(c=>c.state.room.ply>room.ply),'move sync');
  assert.ok(group.every(c=>JSON.stringify(c.state.room.board)===JSON.stringify(group[0].state.room.board)));
  moves++;await wait(180);
 }
 assert.ok(moves>0);assert.equal(group[0].state.room.board.filter(p=>p!==null).length,16+moves);
 for(const c of group){assert.equal(c.state.ledger.played,1);const r=c.state.room;assert.equal(c.state.ledger.earned,r.winners.includes(r.you)?r.winners.length>1?35:70:0);}
 const earned=group.map(c=>c.state.ledger.earned);group[0].send('state');await wait(250);assert.deepEqual(group.map(c=>c.state.ledger.earned),earned);
 for(const c of group)c.send('rematch');await until(()=>group.every(c=>c.state.room.id!==roomId),'all consent rematch');assert.equal(new Set(group.map(c=>c.state.room.id)).size,1);
 for(const c of group)c.send('resign');await until(()=>group.every(c=>c.state.room.phase==='ended'),'all resign');assert.ok(group.every(c=>c.state.room.abandoned));
 for(const c of group){c.send('leave');await wait(60);c.ws.close();}
 console.log(JSON.stringify({fourPlayerMatch:true,moves,reconnected:true,synchronized:true,serverReward:true,rematch:true,resign:true}));
 if(!process.argv.includes('--quick')){
  const solo=await player('ひとり動作テスト');solo.send('join');await until(()=>solo.state.waiting,'solo queue');const joined=Date.now();
  const ping=setInterval(()=>{if(solo.ws.readyState===1)solo.ws.send('ping');},15000);
  try{
   await until(()=>solo.state.room,'60 second automatic AI fill',68000);assert.equal(solo.state.room.seats.filter(s=>s.bot).length,3);assert.ok(Date.now()-joined>=59000);
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
