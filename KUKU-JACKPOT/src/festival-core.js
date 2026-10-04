export const BPM=132, BEAT=60/BPM, ROUND_BEATS=24, TARGET_BEAT=12, REVEAL_BEAT=14;
export const shuffle=(values,random=Math.random)=>{const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
export function makeQuestion(a,b,random=Math.random){
  const answer=a*b, candidates=[...new Set([answer-a,answer+a,answer-1,answer+1,answer-2,answer+2])].filter(x=>x>0&&x<=81&&x!==answer);
  const truth=random()>.5, claimed=truth?answer:(answer===81?80:answer+1);
  return {a,b,answer,choices:shuffle([answer,...shuffle(candidates,random).slice(0,2)],random),truth,claimed,missing:answer>=10&&random()>.5?'tens':'ones'};
}
export function makePlaylist(mode,gameId,table=7,random=Math.random,review=[]){
  let ids=mode==='tour'?Array.from({length:21},(_,i)=>i+1):mode==='mix'?shuffle(Array.from({length:21},(_,i)=>i+1),random).slice(0,5):[Number(gameId)||1];
  const per=mode==='tour'?3:mode==='mix'?2:5;
  let bag=shuffle([1,2,3,4,5,6,7,8,9],random),i=0;
  return ids.flatMap(id=>Array.from({length:per},()=>{
    if(i&&i%9===0)bag=shuffle([1,2,3,4,5,6,7,8,9],random);
    const r=mode==='review'&&review.length?review[i%review.length]:null;
    const a=r?.a||(Number(table)||1+Math.floor(random()*9)),b=r?.b||bag[i++%9];
    if(r)i++;
    return {gameId:id,...makeQuestion(a,b,random)};
  }));
}
export function grade(question,result,{offset=0,watch=false}={}){
  const expected=[4,21].includes(question.gameId)?Number(question.truth):question.answer;
  const value=result?.value??null;
  const error=result?.performed&&Number.isFinite(result.hitTime)?(result.hitTime-TARGET_BEAT*BEAT)*1000-offset:null;
  return {a:question.a,b:question.b,answer:question.answer,gameId:question.gameId,value,correct:value===expected,performed:!!result?.performed,rhythm:error===null?'miss':Math.abs(error)<=150?'perfect':Math.abs(error)<=320?'nice':'off',errorMs:error,watch};
}
export function summarize(results){return {total:results.length,correct:results.filter(x=>x.correct).length,rhythm:results.filter(x=>x.rhythm==='perfect'||x.rhythm==='nice').length,review:[...new Map(results.filter(x=>!x.correct).map(x=>[`${x.a}-${x.b}`,{a:x.a,b:x.b}])).values()]};}
export function newSave(){return {version:1,plays:0,correct:0,attempts:0,stars:{},facts:{},settings:{music:55,voice:95,cheer:85,sfx:65,reduceMotion:false,offset:0}};}
export function normalizeSave(raw){
  const d=newSave();if(!raw||raw.version!==1)return d;
  for(const k of ['plays','correct','attempts'])d[k]=Math.min(1e8,Math.max(0,Number(raw[k])||0));
  for(let i=1;i<=21;i++)d.stars[i]=Math.min(3,Math.max(0,Math.floor(Number(raw.stars?.[i])||0)));
  for(let a=1;a<=9;a++)for(let b=1;b<=9;b++){const k=`${a}-${b}`,v=raw.facts?.[k];if(v)d.facts[k]={attempts:Math.max(0,Number(v.attempts)||0),correct:Math.max(0,Number(v.correct)||0),lastCorrect:!!v.lastCorrect};}
  for(const k of ['music','voice','cheer','sfx'])d.settings[k]=Math.min(100,Math.max(0,Number.isFinite(raw.settings?.[k])?raw.settings[k]:d.settings[k]));
  d.settings.offset=Math.min(300,Math.max(-300,Number(raw.settings?.offset)||0));d.settings.reduceMotion=!!raw.settings?.reduceMotion;return d;
}
export function record(save,results){
  const next=normalizeSave(save),played=results.filter(x=>!x.watch);if(!played.length)return next;
  next.plays++;next.attempts+=played.length;next.correct+=played.filter(x=>x.correct).length;
  for(const r of played){const k=`${r.a}-${r.b}`,f=next.facts[k]||{attempts:0,correct:0};next.facts[k]={attempts:f.attempts+1,correct:f.correct+Number(r.correct),lastCorrect:r.correct};}
  for(const id of new Set(played.map(x=>x.gameId))){const rs=played.filter(x=>x.gameId===id),n=rs.filter(x=>x.correct).length;const stars=n===rs.length?3:n>=rs.length*.6?2:1;next.stars[id]=Math.max(next.stars[id]||0,stars);}
  return next;
}
