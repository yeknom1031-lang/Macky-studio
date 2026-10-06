import { normalizeOnlineSettings } from './settings.js';
import { normalizeCustomDisc } from '../src/cosmetics.js';
import {initialBoard, firstRoundMoves, playMove, scores, PLAYERS} from '../src/engine.js';
import {chooseAIMove} from '../src/ai.js';
export const TURN_MS=45000, GRACE_MS=60000, COUNTDOWN_MS=5000, WAIT_MS=60000;
export const STAMPS=['よろしく！','いい一手！','ありがとう！','楽しかった！'];
export function nickname(value) {
  const name=typeof value==='string'?value.normalize('NFKC').trim().replace(/\s+/g,' '):'';
  if(!name||[...name].length>12||! /^[\p{L}\p{N} _ー・.!！?？-]+$/u.test(name))throw new Error('名前は1〜12文字の文字・数字で入力してください');
  return name;
}
export function createRoom(id,members,now,random=Math.random,settings={}) {
  settings=normalizeOnlineSettings(settings);
  const seats=members.map(p=>({id:p.id,name:p.name,customDisc:normalizeCustomDisc(p.customDisc),bot:false,connected:true,disconnectedAt:null,forfeit:false,misses:0,rematch:false}));
  while(seats.length<4)seats.push({id:null,name:`コンピューター ${seats.length+1}`,bot:true,connected:true,disconnectedAt:null,forfeit:false,misses:0,rematch:true});
  for(let i=seats.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[seats[i],seats[j]]=[seats[j],seats[i]];}
  return {id,seats,settings,board:initialBoard(settings.size),player:0,moved:[false,false,false,false],phase:'countdown',startAt:now+COUNTDOWN_MS,deadline:now+COUNTDOWN_MS,ply:0,lastMove:null,lastPlacements:[],notice:'まもなく対局開始',reactions:[],createdAt:now,endedAt:null};
}
export function endRoom(room,now,abandoned=false) {
  room.phase='ended';room.endedAt=now;room.deadline=null;room.abandoned=abandoned;
  const counts=scores(room.board),eligible=room.seats.map((s,i)=>s.forfeit?-1:counts[i]),max=Math.max(...eligible);
  room.winners=abandoned?[]:eligible.flatMap((n,i)=>n===max?[i]:[]);
}
function turnDeadline(room,now){return now+(room.seats[room.player].bot||room.seats[room.player].forfeit?1100:(room.settings?.turnSeconds??45)*1000);}
export function advanceRoom(room,now) {
  const skipped=[];
  for(let step=1;step<=4;step++){
    const next=(room.player+step)%4;
    if(firstRoundMoves(room.board,next,room.moved).length){room.player=next;room.deadline=turnDeadline(room,now);room.notice=skipped.length?`${skipped.map(i=>PLAYERS[i].name).join('・')}は置ける場所がありません。スキップ`:'';return;}
    skipped.push(next);
  }
  endRoom(room,now);
}
export function applyRoomMove(room,index,now,automatic=false) {
  if(!firstRoundMoves(room.board,room.player,room.moved).includes(index))throw new Error('そこには置けません');
  const p=room.player,result=playMove(room.board,p,index);
  room.board=result.board;room.moved[p]=true;room.ply++;room.lastMove={index,player:p,flips:result.flips,automatic,ply:room.ply,at:now};
  room.lastPlacements ??= [];room.lastPlacements[p]={index,player:p};
  advanceRoom(room,now);
}
export function tickRoom(room,now) {
  if(room.phase==='ended')return;
  for(const seat of room.seats)if(!seat.bot&&!seat.forfeit&&seat.disconnectedAt!==null&&now-seat.disconnectedAt>=GRACE_MS)seat.forfeit=true;
  if(room.seats.every(s=>s.bot||s.forfeit)){endRoom(room,now,true);return;}
  if(room.phase==='countdown') {
    if(now<room.startAt)return;
    room.phase='playing';room.deadline=turnDeadline(room,now);room.notice='対局開始';
  }
  const seat=room.seats[room.player];
  if(seat.forfeit)room.deadline=Math.min(room.deadline,now+1100);
  if(now>=room.deadline){
    const moves=firstRoundMoves(room.board,room.player,room.moved);
    if(!moves.length){advanceRoom(room,now);return;}
    if(!seat.bot&&!seat.forfeit){seat.misses++;if(seat.misses>=2)seat.forfeit=true;}
    const move=chooseAIMove(room.board,room.player,{difficulty:room.settings?.aiDifficulty??'normal',width:room.board.length>=100?2:3,allowedMoves:moves,playerCount:4});
    applyRoomMove(room,move,now,true);
    if(room.phase==='playing'&&!seat.bot)room.notice=`${seat.name}の手をAIが代行しました`;
  }
}
export function roomAction(room,id,action,input,now) {
  tickRoom(room,now);
  const index=room.seats.findIndex(s=>s.id===id),seat=room.seats[index];
  if(!seat)throw new Error('この対局には参加していません');
  if(action==='state')return;
  if(action==='reaction') {
    if(!STAMPS.includes(input.stamp))throw new Error('そのリアクションは使えません');
    if(now-(seat.lastReaction??-Infinity)<3000)throw new Error('少し待ってから送ってください');
    seat.lastReaction=now;room.reactions=room.reactions.filter(r=>now-r.at<7000).slice(-7);room.reactions.push({seat:index,stamp:input.stamp,at:now});return;
  }
  if(action==='rematch') {if(room.phase!=='ended'||seat.forfeit||room.abandoned)throw new Error('この対局は再戦できません');seat.rematch=true;return;}
  if(room.phase==='ended')throw new Error('対局は終了しています');
  if(action==='resign') {seat.forfeit=true;if(room.player===index)room.deadline=Math.min(room.deadline,now+1100);tickRoom(room,now);return;}
  if(action==='move') {
    if(seat.forfeit)throw new Error('この席はAIが引き継ぎました');
    if(room.phase!=='playing'||room.player!==index)throw new Error('あなたの手番ではありません');
    if(input.ply!==room.ply||input.room!==room.id)throw new Error('盤面が更新されました。もう一度選んでください');
    if(!Number.isInteger(input.index))throw new Error('置くマスを選んでください');
    applyRoomMove(room,input.index,now);seat.misses=0;return;
  }
  throw new Error('使えない操作です');
}
export function publicRoom(room,id,now) {
  return {...room,settings:normalizeOnlineSettings(room.settings),seats:room.seats.map((s,i)=>({name:s.name,customDisc:normalizeCustomDisc(s.customDisc),color:PLAYERS[i].color,bot:s.bot,forfeit:s.forfeit,connected:s.connected,rematch:s.rematch})),you:room.seats.findIndex(s=>s.id===id),serverNow:now};
}
export function rewardFor(room,id) {
  const seat=room.seats.findIndex(s=>s.id===id);
  if(room.phase!=='ended'||seat<0)return null;
  const won=!room.abandoned&&!room.seats[seat].forfeit&&room.winners.includes(seat),draw=won&&room.winners.length>1;
  return {amount:won?(draw?35:70):0,won:won&&!draw,draw,forfeit:room.seats[seat].forfeit};
}
