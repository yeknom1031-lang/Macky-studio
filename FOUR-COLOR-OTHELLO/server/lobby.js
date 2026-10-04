import {createRoom,roomAction,tickRoom,publicRoom,WAIT_MS,GRACE_MS} from './game.js';
export class Lobby {
  constructor(data={queue:[],rooms:{},assignments:{}},uuid=()=>crypto.randomUUID()){this.data=data;this.uuid=uuid;}
  connect(id,now){
    const q=this.data.queue.find(p=>p.id===id);if(q)q.disconnectedAt=null;
    const room=this.room(id),seat=room?.seats.find(s=>s.id===id);
    if(seat){tickRoom(room,now);seat.connected=true;seat.disconnectedAt=null;}
  }
  disconnect(id,now){
    const q=this.data.queue.find(p=>p.id===id);if(q)q.disconnectedAt=now;
    const seat=this.room(id)?.seats.find(s=>s.id===id);if(seat){seat.connected=false;seat.disconnectedAt=now;}
  }
  room(id){return this.data.rooms[this.data.assignments[id]];}
  leave(id,now){
    const room=this.room(id);if(room&&room.phase!=='ended')roomAction(room,id,'resign',{},now);
    if(room){const seat=room.seats.find(s=>s.id===id);seat.rematch=false;seat.connected=false;}
    delete this.data.assignments[id];this.data.queue=this.data.queue.filter(p=>p.id!==id);
  }
  action(player,action,input,now){
    this.tick(now);
    if(action==='leave'){this.leave(player.id,now);return;}
    if(action==='join'){
      if(this.room(player.id)||this.data.queue.some(p=>p.id===player.id))return;
      if(!player.name)throw new Error('先にニックネームを決めてください');
      if(this.data.queue.length>=64||Object.values(this.data.rooms).filter(r=>r.phase!=='ended').length>=64)throw new Error('満席です。少し待ってからお試しください');
      this.data.queue.push({id:player.id,name:player.name,joined:now,disconnectedAt:null});this.tick(now);return;
    }
    const room=this.room(player.id);if(!room){if(action==='state')return;throw new Error('対局が見つかりません');}
    roomAction(room,player.id,action,input,now);
    if(action==='rematch'){
      const humans=room.seats.filter(s=>!s.bot&&!s.forfeit);
      if(humans.length&&humans.every(s=>s.rematch&&s.connected&&this.data.assignments[s.id]===room.id))this.match(humans,now);
    }
  }
  match(members,now){
    const room=createRoom(this.uuid(),members,now);this.data.rooms[room.id]=room;
    for(const member of members)this.data.assignments[member.id]=room.id;
    const ids=new Set(members.map(p=>p.id));this.data.queue=this.data.queue.filter(p=>!ids.has(p.id));return room;
  }
  tick(now){
    this.data.queue=this.data.queue.filter(p=>p.disconnectedAt===null||now-p.disconnectedAt<15000);
    let connected=this.data.queue.filter(p=>p.disconnectedAt===null);
    while(connected.length>=4){this.match(connected.slice(0,4),now);connected=connected.slice(4);}
    if(connected.length&&now-connected[0].joined>=WAIT_MS)this.match(connected,now);
    for(const room of Object.values(this.data.rooms)){
      tickRoom(room,now);
      if(room.phase==='ended'&&room.settled&&now-room.endedAt>=600000){
        for(const s of room.seats)if(this.data.assignments[s.id]===room.id)delete this.data.assignments[s.id];
        delete this.data.rooms[room.id];
      }
    }
  }
  nextAlarm(now){
    const dates=[];
    for(const p of this.data.queue)dates.push(p.disconnectedAt===null?p.joined+WAIT_MS:p.disconnectedAt+15000);
    for(const r of Object.values(this.data.rooms)){
      if(r.phase==='ended'){dates.push(r.endedAt+600000);continue;}
      dates.push(r.deadline);
      for(const s of r.seats)if(!s.bot&&!s.forfeit&&s.disconnectedAt!==null)dates.push(s.disconnectedAt+GRACE_MS);
    }
    return dates.length?Math.max(now+50,Math.min(...dates)):null;
  }
  view(id,now){
    const room=this.room(id);if(room)return {room:publicRoom(room,id,now),serverNow:now};
    const entry=this.data.queue.find(p=>p.id===id),connected=this.data.queue.filter(p=>p.disconnectedAt===null);
    return {waiting:!!entry,players:connected.slice(0,4).map(p=>({name:p.name,you:p.id===id})),startAt:entry?(connected[0]?.joined??entry.joined)+WAIT_MS:null,serverNow:now};
  }
}
