// Three controlled peers for checking the fourth player through the actual UI.
import WebSocket from 'ws';
import {firstRoundMoves} from '../src/engine.js';
const base=process.argv[2]??'http://127.0.0.1:8787',peers=[];
for(let i=1;i<=3;i++){
 const r=await fetch(base+'/api/session',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({name:'テスト相手'+i})});
 if(!r.ok)throw new Error('Session '+r.status);
 const ws=new WebSocket(base.replace(/^http/,'ws')+'/api/socket',{headers:{Origin:base,Cookie:r.headers.get('set-cookie').split(';')[0]}});peers.push(ws);
 let joined=false,ply=-1,roomId;
 ws.on('message',buffer=>{const msg=JSON.parse(String(buffer));if(msg.error){console.log(msg.error);return;}if(!joined){joined=true;ws.send(JSON.stringify({action:'join'}));}
 const room=msg.room;if(!room||room.phase!=='playing'||room.player!==room.you||room.ply===ply&&room.id===roomId)return;
 ply=room.ply;roomId=room.id;setTimeout(()=>{if(ws.readyState===1)ws.send(JSON.stringify({action:'move',room:room.id,ply:room.ply,index:firstRoundMoves(room.board,room.player,room.moved)[0]}));},400);
 });
}
const finish=()=>{for(const ws of peers)if(ws.readyState===1){ws.send(JSON.stringify({action:'leave'}));ws.close();}setTimeout(()=>process.exit(),300);};
process.on('SIGINT',finish);setTimeout(finish,180000);console.log('Three UI test peers are waiting.');
