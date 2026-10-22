import {BEAT,makeQuestion,shuffle} from './festival-core.js';
export const STARLINE_GAME=Object.freeze({id:22,slug:'starline',title:'九九ビート・スターライン',subtitle:'3つのレーンで、答えをつなごう！'});
export const STARLINE_TEMPOS=Object.freeze([132,154,176,198,220]);
export const STARLINE_MODES=Object.freeze({normal:{beats:12,target:7,count:12,label:'ノーマル'},easy:{beats:16,target:10,count:8,label:'ゆっくり'},expert:{beats:8,target:5,count:24,label:'上級スピードアップ',questionVoiceOnly:true}});
export function expertTempo(correct){return STARLINE_TEMPOS[Math.min(STARLINE_TEMPOS.length-1,Math.floor(Math.max(0,correct)/4))];}
function timeQuestion(q,start,bpm){const beat=60/bpm;return {...q,start,bpm,beat,target:start+q.targetBeat*beat,end:start+q.beats*beat};}
export function makeStarlineChart({table=0,mode='normal',random=Math.random,count}={}){
 const spec=STARLINE_MODES[mode]||STARLINE_MODES.normal, n=count??spec.count;
 let bag=[],operands=Object.fromEntries(Array.from({length:9},(_,i)=>[i+1,[]]));
 return Array.from({length:n},(_,i)=>{
  if(!bag.length)bag=shuffle([1,2,3,4,5,6,7,8,9],random);
  const a=Number.isInteger(table)&&table>=1&&table<=9?table:bag.pop();
  if(!operands[a].length)operands[a]=shuffle([1,2,3,4,5,6,7,8,9],random);
  return timeQuestion({...makeQuestion(a,operands[a].pop(),random),gameId:22,index:i,mode,beats:spec.beats,targetBeat:spec.target,beatStart:i*spec.beats},i*spec.beats*BEAT,132);
 });
}
/** Audio-clock-only judgment. Visual position and latency calibration never lock an early answer. */
export class StarlineSession{
 constructor(chart,{offset=0,watch=false}={}){this.chart=chart;this.offset=offset;this.watch=watch;this.results=new Map();this.combo=0;this.maxCombo=0;this.correctCount=0;}
 current(time){return this.chart.find(q=>time>=q.start&&time<q.end)||null;}
 submit(lane,time){
  const q=this.current(time);if(!q||this.results.has(q.index)||!Number.isInteger(lane)||lane<0||lane>2||time>q.target+.36)return null;
  return this.resolve(q,lane,time);
 }
 resolve(q,lane,time){
  if(this.results.has(q.index))return null;
  const value=lane===null?null:q.choices[lane],correct=value===q.answer,errorMs=lane===null?null:(time-q.target)*1000-this.offset;
  const rhythm=errorMs===null?'miss':Math.abs(errorMs)<=150?'perfect':Math.abs(errorMs)<=320?'nice':'off';
  const timingBonus=correct?(rhythm==='perfect'?50:rhythm==='nice'?25:0):0;
  this.combo=correct?this.combo+1:0;this.maxCombo=Math.max(this.maxCombo,this.combo);
  if(correct)this.correctCount++;
  // Accelerate only the next measure. A note already visible never jumps or changes its deadline.
  if(q.mode==='expert'&&this.chart[q.index+1]?.bpm!==expertTempo(this.correctCount)){
   let start=q.end;for(let i=q.index+1;i<this.chart.length;i++){const next=timeQuestion(this.chart[i],start,expertTempo(this.correctCount));Object.assign(this.chart[i],next);start=next.end;}
  }
  const result={...q,lane,value,correct,rhythm,errorMs,timingBonus,points:correct?100+timingBonus:0,at:time,watch:this.watch,maxCombo:this.maxCombo};this.results.set(q.index,result);return result;
 }
 advance(time){const expired=[];for(const q of this.chart)if(time>q.target+.36&&!this.results.has(q.index))expired.push(this.resolve(q,null,time));return expired;}
 get score(){return [...this.results.values()].reduce((n,r)=>n+r.points,0);}
 get done(){return this.results.size===this.chart.length;}
}
