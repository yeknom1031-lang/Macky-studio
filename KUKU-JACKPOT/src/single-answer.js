import {BEAT} from './festival-core.js';

export const SINGLE_TIMING={countdown:9,target:12,play:0,reveal:14,end:14,round:24};
const ignored=reason=>({type:'ignored',success:false,reason});

// A deliberate answer is accepted once. Timing can add a bonus, but never
// changes which answer the child selected or whether the multiplication is true.
export class SingleAnswerRound{
 constructor({openBeat=SINGLE_TIMING.play,targetBeat=SINGLE_TIMING.target,closeBeat=SINGLE_TIMING.reveal}={}){
  this.openBeat=openBeat;this.targetBeat=targetBeat;this.closeBeat=closeBeat;
  this.answerValue=null;this.event=null;this.closed=false;
 }
 inputdown(value,beat,{offsetMs=0}={}){
  if(!Number.isFinite(value)||!Number.isFinite(beat)||!Number.isFinite(offsetMs))return ignored('invalid');
  if(this.event||this.closed)return ignored('already-answered');
  if(beat<this.openBeat||beat>=this.closeBeat)return ignored('outside-answer-window');
  // Calibration adjusts only the bonus, never when a visible question accepts answers.
  const errorMs=(beat-this.targetBeat)*BEAT*1000-offsetMs;
  const timing=Math.abs(errorMs)<=150?'perfect':Math.abs(errorMs)<=320?'nice':'off';
  this.answerValue=value;
  this.event={type:'answer',index:0,value,beat,targetBeat:this.targetBeat,errorMs,timing,success:timing!=='off',final:true};
  return {...this.event};
 }
 inputup(){return ignored('single-tap');}
 cancelHold(){return ignored('single-tap');}
 update(beat){
  if(this.closed||!Number.isFinite(beat)||beat<this.closeBeat)return [];
  this.closed=true;
  if(this.event)return [];
  return [{type:'miss',index:0,value:null,beat,targetBeat:this.targetBeat,timing:'miss',success:false,final:true}];
 }
 result(){
  const timing=this.event?.timing||'miss',hits=Number(['perfect','nice'].includes(timing));
  return {single:true,answerValue:this.answerValue,timing,errorMs:this.event?.errorMs??null,hits,total:1,perfect:Number(timing==='perfect'),combo:hits,maxCombo:hits,strays:0,holding:null,events:this.event?[{...this.event}]:[],complete:!!this.event||this.closed};
 }
}
