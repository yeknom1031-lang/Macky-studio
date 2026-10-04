export const BPM=132, BEAT=60/BPM, ROUND_BEATS=24, TARGET_BEAT=12, REVEAL_BEAT=14;
export const shuffle=(values,random=Math.random)=>{const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
// This exact set is also the contract for the recorded f-a-b-claimed voices.
export function falseClaims(a,b){
  const answer=a*b;
  return [...new Set([answer-a,answer+a,answer-1,answer+1])].filter(n=>n>=1&&n<=81&&n!==answer);
}
export function makeQuestion(a,b,random=Math.random){
  const answer=a*b, candidates=[...new Set([answer-a,answer+a,answer-1,answer+1,answer-2,answer+2])].filter(x=>x>0&&x<=81&&x!==answer);
  const truth=random()>.5, claims=falseClaims(a,b), claimed=truth?answer:claims[Math.min(claims.length-1,Math.floor(random()*claims.length))];
  return {a,b,answer,choices:shuffle([answer,...shuffle(candidates,random).slice(0,2)],random),truth,claimed,missing:answer>=10&&random()>.5?'tens':'ones'};
}
/** A stage lesson describes actual quantities and relationships, never painted-in answers. */
export function makeStageQuestion(gameId,a,b,{random=Math.random,stageIndex=0,stageTotal=5,fixedTable=0,source=null,showHint,recallOf=null,pairId,role,finalPair=false,retry=false,sourceIndex=null,attempt=0,linked=false}={}){
  if(!Number.isInteger(a)||!Number.isInteger(b)||a<1||a>9||b<1||b>9)throw new RangeError('Stage operands must be integers from 1 to 9');
  const q={gameId:Number(gameId),...makeQuestion(a,b,random)};
  const lesson={kind:'recall',stageIndex,stageTotal,fixedTable,linked};
  switch(q.gameId){
    case 5:Object.assign(lesson,{kind:'multiples',step:a,from:a*(b-1),target:q.answer,path:Array.from({length:Math.min(3,b+1)},(_,i)=>a*(Math.max(0,b-2)+i)),hop:b});break;
    case 8:Object.assign(lesson,{kind:'place-value',tens:Math.floor(q.answer/10),ones:q.answer%10});break;
    case 9:Object.assign(lesson,{kind:'train',groupSize:a,groups:b});break;
    case 10:Object.assign(lesson,{kind:'recipe',perCup:a,cups:b,flavor:['strawberry','grape','melon','lemon'][(a+b)%4]});break;
    case 11:Object.assign(lesson,{kind:'rebound',retry,sourceIndex,attempt});break;
    case 12:Object.assign(lesson,{kind:'memory',showHint:showHint??stageIndex<Math.max(1,stageTotal-2),hintUntilBeat:5.5,recallOf});break;
    case 13:Object.assign(lesson,{kind:'pair',pairId:pairId??`pair-${Math.floor(stageIndex/2)}`,role:role??(stageIndex%2?'second':'first'),finalPair,partner:source?{a:source.a,b:source.b,answer:source.answer}:{a:b,b:a,answer:q.answer},tableException:!!fixedTable&&a!==fixedTable});break;
    case 14:Object.assign(lesson,{kind:'neighbor',known:{a,b:b-1,answer:a*(b-1)},step:a});break;
  }
  q.lesson=lesson;return q;
}
export function makePlaylist(mode,gameId,table=0,random=Math.random,review=[]){
  let ids=mode==='tour'?Array.from({length:21},(_,i)=>i+1):mode==='mix'?shuffle(Array.from({length:21},(_,i)=>i+1),random).slice(0,5):[Number(gameId)||1];
  const per=mode==='tour'?3:mode==='mix'?2:5;
  const digits=[1,2,3,4,5,6,7,8,9], chosen=Number(table);
  const fixed=Number.isInteger(chosen)&&chosen>=1&&chosen<=9?chosen:0;
  let tables=[],i=0;
  const operands=Object.fromEntries(digits.map(a=>[a,[]]));
  const takeFact=()=>{
    const r=mode==='review'&&review.length?review[i%review.length]:null;
    if(!tables.length)tables=shuffle(digits,random);
    const a=r?.a||fixed||tables.pop();
    if(!operands[a].length)operands[a]=shuffle(digits,random);
    const b=r?.b||operands[a].pop();
    i++;
    return {a,b};
  };
  // Generic questions still use balanced bags. Linked teaching sequences intentionally
  // repeat a fact/table: frog paths, ghost recall, and the reversed socks companion.
  // In fixed-table play only the socks companion may put that table on the right.
  return ids.flatMap(id=>{
    const stage=[],hintCount=Math.max(1,per-2);
    for(let n=0;n<per;n++){
      let fact,source=null;const options={random,stageIndex:n,stageTotal:per,fixedTable:fixed};
      if(mode!=='review'&&id===5&&n){fact={a:stage[0].a,b:stage[0].b+n};options.linked=true;}
      else if(mode!=='review'&&id===12&&n>=hintCount){
        source=stage[(n-hintCount)%hintCount];fact={a:source.a,b:source.b};options.showHint=false;options.recallOf=source.lesson.stageIndex;options.linked=true;
      }else if(mode!=='review'&&id===13&&n>0&&(n%2||n===per-1)){
        // An odd-length set finishes a known pair instead of leaving a lone sock.
        source=stage[n-1];fact={a:source.b,b:source.a};options.source=source;options.pairId=source.lesson.pairId;options.role='second';options.linked=true;options.finalPair=n===per-1;
      }else{
        fact=takeFact();
        if(mode!=='review'&&id===5)fact.b=Math.min(fact.b,10-per);
        if(mode!=='review'&&id===13){
          // Swapping different operands makes the relationship visible. Keep
          // actual missed square facts untouched in targeted review mode.
          const used=n=>stage.some(q=>q.a===fact.a&&q.b===n);
          if(fact.a===fact.b||used(fact.b)){
            for(let offset=1;offset<10;offset++){const candidate=(fact.b-1+offset)%9+1;if(candidate!==fact.a&&!used(candidate)){fact.b=candidate;break;}}
          }
        }
      }
      stage.push(makeStageQuestion(id,fact.a,fact.b,options));
    }
    return stage;
  });
}
/** Replace an unplayed basketball question, without growing or reordering the tour. */
export function queueBasketballRetry(playlist,index,result,{random=Math.random}={}){
  const q=playlist[index];
  if(!q||q.gameId!==11||!result||result.correct||result.watch||q.lesson?.retry)return {queued:false};
  const eligible=i=>playlist[i]?.gameId===11&&!playlist[i].lesson?.retry;
  const targetIndex=[index+2,index+3,index+1].find(eligible);
  if(targetIndex===undefined)return {queued:false};
  const target=playlist[targetIndex];
  const question=makeStageQuestion(11,q.a,q.b,{random,stageIndex:target.lesson?.stageIndex??targetIndex,stageTotal:target.lesson?.stageTotal??5,fixedTable:q.lesson?.fixedTable??0,retry:true,sourceIndex:index,attempt:1,linked:true});
  playlist[targetIndex]=question;
  return {queued:true,targetIndex,question};
}
export function grade(question,result,{offset=0,watch=false}={}){
  const expected=[4,21].includes(question.gameId)?Number(question.truth):question.answer;
  const value=result?.value??null;
  const error=result?.performed&&Number.isFinite(result.hitTime)?(result.hitTime-TARGET_BEAT*BEAT)*1000-offset:null;
  const sequence=result?.sequence;
  const rhythm=sequence?.single?sequence.timing:sequence?(sequence.hits===sequence.total&&sequence.total>0&&!sequence.strays?'perfect':sequence.hits>=(sequence.total+(sequence.strays||0))*.6&&sequence.hits>0?'nice':sequence.hits?'off':'miss'):error===null?'miss':Math.abs(error)<=150?'perfect':Math.abs(error)<=320?'nice':'off';
  const correct=value===expected,timingBonus=correct?(rhythm==='perfect'?50:rhythm==='nice'?25:0):0;
  return {a:question.a,b:question.b,answer:question.answer,gameId:question.gameId,value,correct,points:correct?100+timingBonus:0,timingBonus,performed:!!result?.performed,rhythm,errorMs:sequence?.single?sequence.errorMs:error,watch,...(sequence?{rhythmHits:sequence.hits,rhythmTotal:sequence.total,perfectHits:sequence.perfect,maxCombo:sequence.maxCombo,events:sequence.events}: {})};
}
export function summarize(results){return {total:results.length,correct:results.filter(x=>x.correct).length,rhythm:results.filter(x=>x.rhythm==='perfect'||x.rhythm==='nice').length,rhythmHits:results.reduce((n,r)=>n+(r.rhythmHits||0),0),rhythmTotal:results.reduce((n,r)=>n+(r.rhythmTotal||0),0),maxCombo:Math.max(0,...results.map(r=>r.maxCombo||0)),review:[...new Map(results.filter(x=>!x.correct).map(x=>[`${x.a}-${x.b}`,{a:x.a,b:x.b}])).values()]};}
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
  for(const id of new Set(played.map(x=>x.gameId))){const rs=played.filter(x=>x.gameId===id),n=rs.filter(x=>x.correct).length;const musical=rs.every(r=>r.rhythm==='perfect'||r.rhythm==='nice');const stars=n===rs.length&&musical?3:n>=rs.length*.6?2:1;next.stars[id]=Math.max(next.stars[id]||0,stars);}
  return next;
}
