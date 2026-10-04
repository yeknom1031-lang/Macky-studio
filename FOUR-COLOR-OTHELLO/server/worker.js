import {DurableObject} from 'cloudflare:workers';
import {Lobby} from './lobby.js';
import {nickname,rewardFor} from './game.js';
const json=(value,status=200,headers={})=>Response.json(value,{status,headers:{'Cache-Control':'no-store',...headers}});
async function smallBody(request){
  if(Number(request.headers.get('Content-Length'))>1024)throw new Error('入力が大きすぎます');
  const reader=request.body?.getReader();if(!reader)return '{}';
  let bytes=0,text='';const decoder=new TextDecoder();
  try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>1024){await reader.cancel();throw new Error('入力が大きすぎます');}text+=decoder.decode(value,{stream:true});}return text+decoder.decode();}finally{reader.releaseLock();}
}
const digest=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(n=>n.toString(16).padStart(2,'0')).join('');
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return json({ok:true,game:'Irodory',version:'online-1.0.0'});
    if(!['/api/session','/api/socket'].includes(url.pathname))return json({error:'見つかりません'},404);
    if(request.headers.get('Origin')!==url.origin)return json({error:'このサイトから接続してください'},403);
    return env.IRODORY_HUB.get(env.IRODORY_HUB.idFromName('public-v1')).fetch(request);
  }
};
export class IrodoryHub extends DurableObject {
  constructor(ctx,env){
    super(ctx,env);this.ctx=ctx;this.sql=ctx.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, token TEXT UNIQUE, name TEXT, updated INTEGER, earned INTEGER DEFAULT 0, played INTEGER DEFAULT 0, wins INTEGER DEFAULT 0, draws INTEGER DEFAULT 0)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS receipts (room TEXT, player TEXT, PRIMARY KEY(room, player))');
    this.sql.exec('CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY, count INTEGER, expires INTEGER)');
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping','pong'));
    ctx.blockConcurrencyWhile(async()=>{this.lobby=new Lobby(await ctx.storage.get('lobby'));});
  }
  ledger(id){const p=this.sql.exec('SELECT id,earned,played,wins,draws FROM players WHERE id=?',id).toArray()[0];return p;}
  async fetch(request){
    const url=new URL(request.url),cookie=request.headers.get('Cookie')?.match(/(?:^|;\s*)irodory_session=([a-f0-9]{64})(?:;|$)/)?.[1];
    const hash=cookie?await digest(cookie):'';
    const ip=await digest(request.headers.get('CF-Connecting-IP')??'local');
    return this.ctx.blockConcurrencyWhile(async()=>{
      let player=hash?this.sql.exec('SELECT * FROM players WHERE token=?',hash).toArray()[0]:null;
      if(url.pathname==='/api/session'){
        if(request.method!=='POST')return json({error:'POSTで接続してください'},405);
        let raw;try{raw=await smallBody(request);}catch(e){return json({error:e.message},413);}
        let input;try{input=JSON.parse(raw);if(!input||typeof input!=='object')throw 0;}catch{return json({error:'入力を確認してください'},400);}
        let name;try{if(input.name!==undefined)name=nickname(input.name);}catch(e){return json({error:e.message},400);}
        const now=Date.now(),bucket='session:'+ip+':'+Math.floor(now/3600000);
        const count=this.sql.exec('SELECT count FROM limits WHERE key=?',bucket).toArray()[0]?.count??0;
        if(count>=60)return json({error:'接続回数が多いため、少し時間をおいてお試しください'},429);
        this.sql.exec('INSERT INTO limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1',bucket,now+3600000);
        this.sql.exec('DELETE FROM players WHERE updated<?',now-7776000000);
        this.sql.exec('DELETE FROM receipts WHERE player NOT IN (SELECT id FROM players)');
        let token;
        if(!player){
          token=(crypto.randomUUID()+crypto.randomUUID()).replaceAll('-','');
          const id=crypto.randomUUID();this.sql.exec('INSERT INTO players(id,token,name,updated) VALUES(?,?,?,?)',id,await digest(token),name??'',now);
          player={id,name:name??''};
        }else if(name!==undefined){
          if((this.lobby.room(player.id)&&this.lobby.room(player.id).phase!=='ended')||this.lobby.data.queue.some(p=>p.id===player.id))return json({error:'対局・待機を終えてから名前を変えてください'},409);
          this.sql.exec('UPDATE players SET name=?,updated=? WHERE id=?',name,now,player.id);player.name=name;
        }
        const headers=token?{'Set-Cookie':`irodory_session=${token}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=7776000${url.protocol==='https:'?'; Secure':''}`} : {};
        return json({id:player.id,name:player.name,ledger:this.ledger(player.id)},200,headers);
      }
      if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return json({error:'WebSocketで接続してください'},426);
      if(!player?.name)return json({error:'先にニックネームを登録してください'},401);
      if(this.ctx.getWebSockets().length>=512)return json({error:'ただいま満席です'},503);
      for(const old of this.ctx.getWebSockets(player.id))old.close(4001,'別のタブで接続されました');
      const pair=new WebSocketPair(),[client,server]=Object.values(pair);
      this.ctx.acceptWebSocket(server,[player.id]);server.serializeAttachment({id:player.id,name:player.name,window:Date.now(),count:0});
      this.sql.exec('UPDATE players SET updated=? WHERE id=?',Date.now(),player.id);
      this.lobby.connect(player.id,Date.now());await this.flush();
      return new Response(null,{status:101,webSocket:client});
    });
  }
  async webSocketMessage(ws,message){
    return this.ctx.blockConcurrencyWhile(async()=>{
      const p=ws.deserializeAttachment(),now=Date.now();
      if(typeof message!=='string'||message.length>1024){ws.close(1009,'大きすぎるメッセージです');return;}
      if(now-p.window>=10000){p.window=now;p.count=0;}p.count++;ws.serializeAttachment(p);
      if(p.count>30){ws.send(JSON.stringify({error:'操作が速すぎます。少しお待ちください'}));return;}
      let error;
      try{const m=JSON.parse(message);if(!m||!['join','leave','settings','state','move','resign','reaction','rematch'].includes(m.action))throw new Error('使えない操作です');this.lobby.action(p,m.action,m,now);}catch(e){error=e instanceof SyntaxError?'入力を確認してください':e.message;}
      await this.flush();if(error)ws.send(JSON.stringify({error}));
    });
  }
  async webSocketClose(ws){
    return this.ctx.blockConcurrencyWhile(async()=>{
      const p=ws.deserializeAttachment();
      if(!this.ctx.getWebSockets(p.id).some(s=>s!==ws&&s.readyState===1))this.lobby.disconnect(p.id,Date.now());
      await this.flush();
    });
  }
  async webSocketError(ws){ws.close(1011,'再接続してください');await this.webSocketClose(ws);}
  async alarm(){return this.ctx.blockConcurrencyWhile(async()=>{this.lobby.tick(Date.now());await this.flush();});}
  async flush(){
    const now=Date.now();this.lobby.tick(now);
    this.ctx.storage.transactionSync(()=>{
      for(const room of Object.values(this.lobby.data.rooms))if(room.phase==='ended'&&!room.settled){
        for(const seat of room.seats)if(seat.id){
          const r=rewardFor(room,seat.id);
          const inserted=this.sql.exec('INSERT OR IGNORE INTO receipts(room,player) VALUES(?,?) RETURNING player',room.id,seat.id).toArray();
          if(inserted.length)this.sql.exec('UPDATE players SET earned=earned+?,played=played+1,wins=wins+?,draws=draws+? WHERE id=?',r.amount,r.won?1:0,r.draw?1:0,seat.id);
        }
        room.settled=true;
      }
      this.sql.exec('DELETE FROM limits WHERE expires<?',now);
    });
    await this.ctx.storage.put('lobby',this.lobby.data);
    const next=this.lobby.nextAlarm(now);if(next!==null)await this.ctx.storage.setAlarm(next);else await this.ctx.storage.deleteAlarm();
    for(const ws of this.ctx.getWebSockets()){
      const {id}=ws.deserializeAttachment();
      try{ws.send(JSON.stringify({...this.lobby.view(id,now),ledger:this.ledger(id)}));}catch{/* The close event starts the reconnect grace period. */}
    }
  }
}
