/** One four-beat phrase, echoed twice by the player. Beats are audio-clock beats. */
const PHRASES = [
  ['ぴたっ・ぴたっ・ポン','とめる','ポン・ポン・ポン、ひとやすみ',[0,1,2]],
  ['つかんで、おかわり','つかむ','タタ・おやすみ・タン・タン',[0,.5,2,3]],
  ['ためて、発射！','発射','光るあいだ長おし、はなして、ポン',[{beat:0,end:2.5},3.5]],
  ['忍びのステップ','はじく','タン・タタン、忍びのリズム',[0,1.5,2.5]],
  ['ぴょん・ぴょん・ぴょん','ジャンプ','タン・ターン・タン、はねよう',[0,1.5,3]],
  ['オンエア・ジングル','ポン','タタタン、おやすみ、タン',[0,.5,1,3]],
  ['やきたて４拍子','プレス','タン・タン・タン・タン',[0,1,2,3]],
  ['ドンドン・ドンドン','パンチ','ドンドン、おやすみ、ドンドン',[0,.5,2,2.5]],
  ['ガタンゴトン','つなぐ','タン・タン・タタン',[0,1,2.5,3.5]],
  ['とろ〜り、まぜまぜ','そそぐ','長おし、はなして、ポン・ポン',[{beat:0,end:1.5},2.5,3.5]],
  ['バウンド・シュート','シュート','タッタン、おやすみ、シュート',[0,.75,2.5]],
  ['おばけの裏拍子','おどる','タン、おやすみ、タン・タン',[0,2,3]],
  ['ペアペア・ステップ','ペア','タタ、タタン、ペアでおどろう',[0,.5,1.5,2]],
  ['ヒーロー・ステップ','とぶ','タン・タン、ターン！',[0,1,2.5]],
  ['ピポパ・おへんじ','こたえる','タタ、タン、タン！',[0,.5,1.5,3]],
  ['まって、つれた！','つる','長おし、はなして、ポン！',[{beat:0,end:1.5},3]],
  ['シュッ！ おとどけ','おとどけ','タン、タタン、タン！',[0,1.5,2,3.5]],
  ['トントン・カチッ','なおす','タタタン、タタン！',[0,.5,1,2.5,3]],
  ['ためて、はっくしょん','はっくしょん','光るあいだ長おし、最後にはなす',[{beat:0,end:3}]],
  ['みんなで大合奏','えんそう','タン・タン・タタタン！',[0,1,2,2.5,3]],
  ['森のコール＆レスポンス','こたえる','タン・タン、おやすみ、タン',[0,1,3]],
];
export const PERFECT_WINDOW=.18;
export const NICE_WINDOW=.38;
export const MIN_INPUT_GAP=.22;
const EPSILON=1e-9;
export function getPattern(gameId){
  const phrase=PHRASES[Number(gameId)-1];if(!phrase)throw new RangeError(`Unknown rhythm game: ${gameId}`);
  const [name,verb,instruction,motif]=phrase;
  const notes=[0,4].flatMap(repeat=>motif.map(n=>typeof n==='number'?{beat:8+repeat+n}:{beat:8+repeat+n.beat,end:8+repeat+n.end}));
  return{name,verb,instruction,notes};
}
const timingFor=error=>Math.abs(error)<=PERFECT_WINDOW+EPSILON?'perfect':Math.abs(error)<=NICE_WINDOW+EPSILON?'nice':'miss';
const noInput=(beat,extra={})=>({type:'ignored',success:false,timing:'ignored',beat,final:false,...extra});

/** Arithmetic is the last intentional pad value; rhythm has one result per note. */
export class RhythmRound{
  constructor(patternOrId,options={}){
    const pattern=typeof patternOrId==='number'?getPattern(patternOrId):patternOrId;
    if(!pattern||!Array.isArray(pattern.notes)||!pattern.notes.length)throw new TypeError('A rhythm pattern needs notes');
    this.pattern={...pattern,notes:pattern.notes.map(n=>({...n}))};
    this.notes=this.pattern.notes.map((note,index)=>{
      if(!Number.isFinite(note.beat)||(note.end!==undefined&&(!Number.isFinite(note.end)||note.end<=note.beat)))throw new RangeError('Invalid rhythm note');
      if(index&&note.beat<=pattern.notes[index-1].beat)throw new RangeError('Rhythm notes must be ordered');
      return{...note,index,status:'pending',value:null};
    });
    this.startBeat=options.startBeat??this.notes[0].beat;
    this.endBeat=options.endBeat??this.startBeat+8;
    this.answerValue=null;this.held=null;this.combo=0;this.maxCombo=0;this.strays=0;this._events=[];this._lastDown=-Infinity;this._lastBeat=-Infinity;
  }
  _event(note,success,timing,beat,extra={}){
    note.status=success?'hit':'miss';
    if(this.held===note.index)this.held=null;
    this.combo=success?this.combo+1:0;this.maxCombo=Math.max(this.maxCombo,this.combo);
    const event={type:success?'hit':'miss',index:note.index,value:note.value,success,timing,beat,targetBeat:note.beat,...(note.end===undefined?{}:{endBeat:note.end}),final:true,...extra};
    this._events.push(event);return event;
  }
  update(beat){
    if(!Number.isFinite(beat))return[];
    this._lastBeat=Math.max(this._lastBeat,beat);const expired=[];
    for(const note of this.notes){
      if(note.status==='pending'&&beat>note.beat+NICE_WINDOW+EPSILON)expired.push(this._event(note,false,'miss',beat,{reason:'unplayed'}));
      else if(note.status==='holding'&&beat>note.end+NICE_WINDOW+EPSILON)expired.push(this._event(note,false,'miss',beat,{reason:'held-too-long',startError:note.startError,endError:beat-note.end}));
    }
    return expired;
  }
  inputdown(value,beat){
    if(!Number.isFinite(value)||!Number.isFinite(beat))return noInput(beat,{reason:'invalid'});
    if(beat<this.startBeat-NICE_WINDOW-EPSILON||beat>this.endBeat+NICE_WINDOW+EPSILON)return noInput(beat,{reason:'outside-play'});
    // Even an off-beat or repeated press is a real arithmetic choice.
    this.answerValue=value;
    const expired=this.update(beat);
    if(beat-this._lastDown<MIN_INPUT_GAP-EPSILON)return noInput(beat,{reason:'repeat',value,expired});
    this._lastDown=beat;
    if(this.held!==null)return noInput(beat,{reason:'already-holding',value,expired});
    const candidate=this.notes.filter(n=>n.status==='pending'&&Math.abs(beat-n.beat)<=NICE_WINDOW+EPSILON).sort((a,b)=>Math.abs(beat-a.beat)-Math.abs(beat-b.beat)||a.index-b.index)[0];
    if(!candidate){this.strays++;this.combo=0;return{type:'stray',index:null,value,success:false,timing:'miss',beat,final:false,expired};}
    candidate.value=value;candidate.startError=beat-candidate.beat;
    const timing=timingFor(candidate.startError);
    if(candidate.end!==undefined){candidate.status='holding';this.held=candidate.index;return{type:'hold-start',index:candidate.index,value,success:true,timing,beat,targetBeat:candidate.beat,endBeat:candidate.end,final:false,startError:candidate.startError,expired};}
    return{...this._event(candidate,true,timing,beat,{error:beat-candidate.beat}),expired};
  }
  inputup(beat){
    if(!Number.isFinite(beat))return noInput(beat,{reason:'invalid'});
    const heldIndex=this.held,expired=this.update(beat);
    if(heldIndex===null)return noInput(beat,{reason:'no-hold',expired});
    const note=this.notes[heldIndex];
    if(note.status!=='holding')return expired.find(event=>event.index===heldIndex)||noInput(beat,{reason:'expired',expired});
    const endError=beat-note.end,success=Math.abs(endError)<=NICE_WINDOW+EPSILON;
    const timing=success?(timingFor(note.startError)==='perfect'&&timingFor(endError)==='perfect'?'perfect':'nice'):'miss';
    return{...this._event(note,success,timing,beat,{startError:note.startError,endError,...(success?{}:{reason:'released-too-early'})}),expired};
  }
  cancelHold(beat){return this.cancel(beat);}
  cancel(beat){
    if(this.held===null)return noInput(beat,{reason:'no-hold'});
    return this._event(this.notes[this.held],false,'miss',beat,{reason:'cancelled'});
  }
  result(){
    const hits=this._events.filter(e=>e.success).length,misses=this._events.filter(e=>!e.success).length;
    return{hits,total:this.notes.length,perfect:this._events.filter(e=>e.timing==='perfect').length,maxCombo:this.maxCombo,combo:this.combo,misses,events:this._events.map(e=>({...e})),answerValue:this.answerValue,strays:this.strays,complete:hits+misses===this.notes.length,holding:this.held};
  }
}
