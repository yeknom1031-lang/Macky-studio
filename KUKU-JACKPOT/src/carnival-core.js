import {BEAT,makeQuestion,shuffle} from './festival-core.js';
export const CARNIVAL_IDS=Object.freeze(Array.from({length:12},(_,i)=>i+23));
export function carnivalChart({gameId=23,tour=false,table=0,random=Math.random,count=6}={}){
 if(!CARNIVAL_IDS.includes(gameId))throw Error('Unknown carnival game');
 let tables=[],operands=Object.fromEntries(Array.from({length:9},(_,i)=>[i+1,[]]));
 const rows=[],ids=tour?CARNIVAL_IDS:[gameId];
 for(const id of ids)for(let n=0;n<(tour?3:count);n++){
  if(!tables.length)tables=shuffle([1,2,3,4,5,6,7,8,9],random);
  let a=table>=1&&table<=9?table:tables.pop();if(!operands[a].length)operands[a]=shuffle([1,2,3,4,5,6,7,8,9],random);
  let b=operands[a].pop(),inverse=id===34&&n%2===1;
  if(inverse){a=rows.at(-1).a;b=rows.at(-1).b;}
  const q=makeQuestion(a,b,random);
  if(inverse){q.answer=b;q.choices=shuffle([b,...shuffle([1,2,3,4,5,6,7,8,9].filter(v=>v!==b),random).slice(0,2)],random);}
  rows.push({...q,gameId:id,index:rows.length,stageIndex:n,stageTotal:tour?3:count,inverse});
 }
 return rows;
}
export function carnivalTiming(voiceSeconds=0){const target=Math.ceil(Math.max(4*BEAT,voiceSeconds+.4)/BEAT)*BEAT;return {target,deadline:Math.max(9*BEAT,target+3*BEAT)};}
export class CarnivalRound{
 constructor(q,{offset=0,watch=false,voiceSeconds=0}={}){this.q=q;this.offset=offset;this.watch=watch;Object.assign(this,carnivalTiming(voiceSeconds));this.result=null;}
 submit(lane,time){
  if(this.result||!Number.isFinite(time)||time<0||time>this.deadline||!Number.isInteger(lane)||lane<0||lane>2)return null;
  return this.resolve(lane,time);
 }
 resolve(lane,time){
  if(this.result)return null;const value=lane===null?null:this.q.choices[lane],correct=value===this.q.answer,errorMs=lane===null?null:(time-this.target)*1000-this.offset;
  const rhythm=errorMs===null?'miss':Math.abs(errorMs)<=150?'perfect':Math.abs(errorMs)<=320?'nice':'off';
  const timingBonus=correct?(rhythm==='perfect'?50:rhythm==='nice'?25:0):0;
  return this.result={...this.q,value,lane,correct,rhythm,errorMs,timingBonus,points:correct?100+timingBonus:0,watch:this.watch,at:time};
 }
 advance(time){return !this.result&&time>this.deadline?this.resolve(null,time):null;}
}
