// The answer pads are the only controls. These scenes show what that one answer did.
const INK='#173549', PAPER='#fff8df', GOLD='#ffd36b', TEAL='#36b9a4', CORAL='#ec8170';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mix=(a,b,p)=>a+(b-a)*p;
const ease=p=>1-(1-clamp(p))**3;

export function drawScenes15to21(env){
 const {ctx,game,q,state,helpers,characterAt,num,label,rounded,ellipse,withNaturalAspect}=env;
 if(game.id<15||game.id>21)return false;
 const now=Number.isFinite(state.time)?state.time:0,beat=state.beat||0,quiet=!!state.reduceMotion;
 const pulse=state.lastPulse,answered=Number.isFinite(state.selected),value=answered?state.selected:null;
 const age=answered?Math.max(0,now-(pulse?.time??state.hitTime??now)):0;
 const reveal=state.phase==='reveal',right=reveal&&!!state.correct;
 // Even an answer just before reveal first completes the player's chosen action.
 const settledReveal=reveal&&(!answered||age>=.78);
 const actualReveal=Number.isFinite(state.revealedAt)?state.revealedAt:(state.revealBeat??14)*(state.beatDuration||60/132);
 const revealStart=Math.max(actualReveal,answered?(pulse?.time??state.hitTime??0)+.78:0);
 const revealAge=Math.max(0,now-revealStart);
 const travel=answered?(quiet?1:ease(age/.72)):0;
 const history=state.stageProgress?.history||[];
 const priorCorrect=state.stageProgress?.correct??history.filter(r=>r.correct).length;
 const totalCorrect=priorCorrect+Number(right);
 const controls=state.controls?.length?state.controls:q.choices?.map(n=>({value:n,label:String(n)}))||[];
 const index=answered?Math.max(0,controls.findIndex(c=>c.value===value)):-1;
 const beatPulse=quiet?0:Math.max(0,1-(beat%1)*4);
 const count=state.phase==='intro'||answered?0:clamp(Math.floor(beat)-8,0,3);
 const pose=reveal?(right?'celebrate':'recover'):answered?(age<.72?'act':'idle'):count?'anticipate':state.phase==='listen'?'talk':'idle';
 const text=(s,x,y,size=22,color=INK)=>label(ctx,s,x,y,size,color);
 const digit=(n,x,y,size=42)=>num(n,x,y,size);
 const natural=(x,y,fn)=>withNaturalAspect?withNaturalAspect(ctx,x,y,fn):fn();
 const box=(x,y,w,h,fill=PAPER,stroke=INK,r=16)=>rounded(ctx,x-w/2,y-h/2,w,h,r,fill,stroke,3);
 const stroke=(points,color=INK,width=4)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=color;ctx.stroke();};
 const prop=(x,y,size,frame=0,alpha=1)=>{ctx.save();ctx.globalAlpha*=alpha;natural(x+size/2,y+size/2,()=>helpers.drawProp?.(ctx,x,y,size,quiet?0:now,{frame}));ctx.restore();};
 const character=(x=155,y=329,size=200,name=game.character,action=pose)=>characterAt(name,x,y,size,action);
 const caption=(s,color=INK)=>{box(521,305,Math.min(520,Math.max(230,s.length*21)),26,'#fff8e5ed',null,13);text(s,521,305,18,color);};
 const token=(n,x,y,size=58,color=GOLD)=>natural(x,y,()=>{box(x,y,size,size,color,INK,14);digit(n,x,y,size*.67);});
 const crumbs=(kind,x=362,y=141)=>{
  const past=history.filter(r=>r.correct).slice(-4),all=right?[...past,{answer:q.answer}].slice(-5):past;
  all.forEach((r,i)=>{const xx=x+i*67;box(xx,y,58,27,'#e1f4de',TEAL,12);text(`${kind}${r.answer}`,xx,y,14);});
 };

 switch(game.id){
  case 15: {
   character(160,332,218);
   prop(660,139,139,answered?(right?4:Math.min(3,Math.floor(age*7))):count?count:0);
   box(466,212,348,99,'#edfaff',INK,23);
   // Keep the question readable while the reply travels into the missing factor.
   digit(q.a,341,212,46);text('×',386,212,35);text('＝',494,212,35);digit(q.answer,566,212,46);
   box(437,212,64,64,'#d9ecec',answered&&travel===1?TEAL:INK,13);
   const factor=settledReveal?q.b:answered&&travel===1?value/q.a:null;
   if(factor===null)text('□',437,212,41);else digit(factor,437,212,46);
   if(answered&&travel<1){
    const x=mix(719,437,travel),y=mix(256,212,travel)-Math.sin(travel*Math.PI)*40;
    stroke([[719,256],[x,y]],'#68d2d7',4);token(value/q.a,x,y,52,'#cdf4e9');
   }
   if(!answered&&!reveal){
    for(let i=0;i<3;i++)ellipse(ctx,343+i*28,274,8,8,count>i?GOLD:'#ecf3f2',INK,2);
    text('数字を おへんじ',537,275,21);
   }else if(reveal&&!answered){text('いっしょに おへんじ！',510,275,21);
   }else if(reveal&&!state.correct){
    text(`送った数 ${value/q.a}`,394,275,20);text(`→ 正解は ${q.b}`,552,275,20);
   }else text(reveal?'つうしん せいこう！':'おへんじが とどいた！',510,275,21);
   crumbs('★',363,140);
   caption(reveal?`${q.a} × ${q.b} ＝ ${q.answer}　で おへんじ！`:'□に入る数を 1回送ろう');
   break;
  }
  case 16: {
   character(145,333,196);
   // Only the rod is used from the prop sheet; the numbered fish below is the catch.
   ctx.save();ctx.beginPath();ctx.rect(195,127,160,122);ctx.clip();prop(199,131,153,0);ctx.restore();
   // Fish are live answer targets, so their numbers always match the three pads.
   const fish=(n,x,y,scale=1,color=GOLD)=>natural(x,y,()=>{
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    ctx.beginPath();ctx.moveTo(-34,0);ctx.lineTo(-60,-25);ctx.lineTo(-60,25);ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=3;ctx.stroke();
    ellipse(ctx,0,0,47,30,color,INK,3);ellipse(ctx,31,-9,6,7,PAPER,INK,2);ellipse(ctx,33,-9,2,3,INK);
    stroke([[-8,-25],[4,-35],[17,-26]],INK,3);digit(n,-5,2,35);ctx.restore();
   });
   const fishX=[407,563,719],fishY=250;
   // A small bob, then a full submerge marks the three preparatory beats.
   const floatX=529,floatY=beat>=12?225:185+(count?count*8+beatPulse*5:0);
   stroke([[298,144],[floatX,157],[floatX,floatY]],'#fffbed',3);
   ellipse(ctx,floatX,211,42+beatPulse*6,7,'#f2fffc66',TEAL,2);
   if(!answered){ellipse(ctx,floatX,floatY,9,15,CORAL,INK,2);ellipse(ctx,floatX,floatY-5,8,6,PAPER);}
   box(307,260,115,60,'#d7a76a',INK,13);
   for(let i=0;i<5;i++)stroke([[257+i*24,234],[257+i*24,287]],'#ae784b',2);
   stroke([[256,233],[256,213],[358,213],[358,233]],INK,4);
   history.filter(r=>r.correct).slice(-2).forEach((r,i)=>fish(r.answer,281+i*48,280,.35,'#b9e6bc'));
   const correcting=settledReveal&&!state.correct;
   controls.slice(0,3).forEach((c,i)=>{
    if(i===index&&answered){
     const returning=correcting?quiet?1:ease(revealAge/.6):0;
     const p=returning?1-returning:travel;
     fish(c.value,mix(fishX[i],307,p),mix(fishY,251,p)-Math.sin(p*Math.PI)*76,.94-p*.27,i===index?GOLD:TEAL);
    }else if(!(correcting&&c.value===q.answer&&revealAge>.65))fish(c.value,fishX[i],fishY+(quiet?0:Math.sin(now*2+i)*4),.94,[GOLD,'#f6bfae','#b8e4bd'][i]);
   });
   if(correcting&&revealAge>.65)fish(q.answer,307,251,.67,TEAL);
   crumbs('魚',397,140);
   caption(reveal?(right?`${q.answer} の魚、つれた！`:`正しい魚は ${q.answer}。いっしょに！`):answered?'えらんだ魚が かごへ！':'うきが しずむよ… 答えの魚をつろう');
   break;
  }
  case 17: {
   character(145,332,202);
   const xs=[385,553,721],destination=index<0?0:index;
   const correctIndex=controls.findIndex(c=>c.value===q.answer);
   const redirected=settledReveal&&!state.correct&&correctIndex>=0;
   const reroute=redirected?(quiet?1:ease(revealAge/.85)):0;
   controls.slice(0,3).forEach((c,i)=>{
    const chosen=answered&&i===destination;
    const delivered=redirected?i===correctIndex&&reroute>.85:chosen&&travel>.72;
    prop(xs[i]-70,149,141,delivered?2:5);
    box(xs[i],268,94,36,delivered?GOLD:chosen?'#ffe0d1':PAPER,chosen?CORAL:INK,11);digit(c.value,xs[i],268,30);
    if(chosen&&redirected){
     const x=xs[i];stroke([[x+12,216],[x+12,227],[x-12,227]],CORAL,4);
     stroke([[x-5,219],[x-13,227],[x-5,235]],CORAL,4);
    }
   });
   let x=answered?mix(258,xs[destination],travel):256+count*10,y=answered?mix(260,219,travel)-Math.sin(travel*Math.PI)*64:260;
   if(redirected){x=mix(answered?xs[destination]:256,xs[correctIndex],reroute);y=mix(answered?219:260,219,reroute)-Math.sin(reroute*Math.PI)*57;}
   natural(x,y,()=>{box(x,y,58,46,'#f3ba73',INK,7);stroke([[x,y-22],[x,y+22]],PAPER,8);box(x+1,y-2,40,23,PAPER,null,4);text(`${q.a}×${q.b}`,x,y-1,17);});
   crumbs('家',388,139);
   caption(reveal?(right?`${q.answer} 番地へ おとどけ完了！`:answered?`${q.answer} 番地へ おくりなおしたよ`:`正しい番地は ${q.answer} だよ`):answered?`${value} 番地へ、しゅっぱつ！`:'答えの番地へ 荷物を送ろう');
   break;
  }
  case 18: {
   character(145,333,198);
   prop(275,157,180,reveal?right?4:3:answered?2:count?1:0);
   box(622,197,330,103,'#fffbe9',INK,18);
   digit(q.a,492,198,39);text('×',530,198,28);digit(q.b,567,198,39);text('＝',607,198,28);
   const hasTens=q.answer>=10,missing=hasTens&&q.missing==='tens'?0:1;
   const xs=hasTens?[657,714]:[0,685],digits=[Math.floor(q.answer/10),q.answer%10];
   const holeX=xs[missing],selectedDigit=answered?(missing===0?Math.floor(value/10):value%10):null;
   for(const i of hasTens?[0,1]:[1]){
    box(xs[i],198,47,61,i===missing?'#dbeee6':PAPER,i===missing?TEAL:INK,10);
    const d=i!==missing||settledReveal?digits[i]:answered&&travel===1?selectedDigit:null;
    if(d===null)text('□',xs[i],198,34);else digit(d,xs[i],198,40);
   }
   const partX=[488,594,700];
   stroke([[224,271],[279,288],[346,273]],'#bb8ca4',13);
   controls.slice(0,3).forEach((c,i)=>{
    const d=missing===0?Math.floor(c.value/10):c.value%10,chosen=answered&&index===i;
    if(chosen&&travel===1)return;
    const x=chosen?mix(partX[i],holeX,travel):partX[i],y=chosen?mix(266,198,travel)-Math.sin(travel*Math.PI)*27:266;
    token(d,x,y,46,chosen?GOLD:'#d9eadb');
   });
   if(reveal&&!state.correct&&answered){box(393,266,82,43,'#f8dbcd',CORAL,9);text('えらんだ',393,254,13);digit(selectedDigit,393,271,25);}
   crumbs('直',375,133);
   caption(reveal?(right?`${q.answer} に なおった！`:`${q.answer} に なおして、もう一度！`):answered?'すぽっ！ 数字の部品を はめたよ':'空いたところへ 数字の部品を入れよう');
   break;
  }
  case 19: {
   const growth=!answered&&count?1+count*.025:1;
   character(202,336,221*growth,game.character,!answered&&count?'hold':pose);
   if(!answered&&!reveal){
    for(let i=0;i<count;i++){const x=362+i*37-(quiet?0:beatPulse*7);ellipse(ctx,x,218-i*15,12+i*3,9+i*2,'#ffffffac');}
    text(count?'はっ… はっ…':'くしゃみが でそう！',574,222,29);
   }else{
    const x=answered?mix(355,616,travel):616,y=209-Math.sin(travel*Math.PI)*26;
    prop(x-91,y-91,182,right?3:travel<.5?0:3);
    const shown=settledReveal?q.answer:value;box(x,y,109,65,'#fff8dfec',null,24);digit(shown,x,y,57);
    if(reveal&&!state.correct&&answered)text(`えらんだのは ${value}`,712,271,16);
    else if(travel<1)text('はっくしょん！',714,272,18);
   }
   const flowers=Math.min(5,totalCorrect);
   for(let i=0;i<flowers;i++)prop(335+i*53,239,65,3);
   caption(reveal?(right?`${q.answer} のくしゃみ、大せいこう！`:`正しくは ${q.answer}。いっしょに言おう！`):answered?`${value} のくしゃみを 出した！`:'答えを1回押して はっくしょん！');
   break;
  }
  case 20: {
   character(151,331,192);
   const members=['カエル','クマ','ウサギ','ネコ','ロボット'];
   // The audio layer joins on the answer itself, so the visible musician joins then too.
   const joined=Math.min(5,priorCorrect+Number(right||(answered&&age>=.72&&pulse?.success===true))),already=Math.min(5,priorCorrect);
   const instrument=(kind,x,y,playing)=>natural(x,y,()=>{
    ctx.save();ctx.translate(x,y+(playing&&!quiet?-beatPulse*2:0));
    if(kind===0){
     // A bass has a long neck and four visible strings.
     ellipse(ctx,0,6,18,19,'#d88d51',INK,2);ellipse(ctx,0,-5,13,12,'#edbc71',INK,2);
     box(0,-24,10,31,'#af7546',INK,3);box(0,-42,17,13,'#f6c879',INK,4);
     for(let i=0;i<4;i++)stroke([[-4+i*2.6,-43],[-4+i*2.6,17]],'#fff4d7',1);
     box(0,13,15,4,INK,null,1);
    }else if(kind===1){
     box(0,0,67,34,'#df826e',INK,7);box(0,1,59,23,PAPER,INK,3);
     for(let i=1;i<7;i++)stroke([[-29+i*8.4,-10],[-29+i*8.4,12]],INK,1);
     for(const i of [1,2,4,5,6])box(-29+i*8.4,-6,4,14,INK,null,1);
    }else if(kind===2){
     // The lead voice is a bright flute, distinct from the keyboard and brass.
     box(0,0,65,12,'#d6eef1',INK,6);box(-29,0,8,18,TEAL,INK,3);
     for(let i=0;i<5;i++)ellipse(ctx,-14+i*8,0,2,2,INK);
     stroke([[25,-5],[31,-10],[36,-10]],INK,3);
    }else if(kind===3){
     stroke([[-27,-3],[-6,-3],[3,7],[-7,15],[-20,15],[-24,8],[-12,3]],GOLD,12);
     ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(29,-20);ctx.lineTo(29,16);ctx.lineTo(0,6);ctx.closePath();ctx.fillStyle=GOLD;ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.stroke();
     ellipse(ctx,29,-2,5,18,'#dc9946',INK,2);for(let i=0;i<3;i++)stroke([[-17+i*7,-12],[-17+i*7,-4]],INK,3);
    }else{
     stroke([[-23,-18],[0,-27],[23,-18]],TEAL,5);
     for(const dx of [-14,14]){ellipse(ctx,dx,-3,11,15,GOLD,INK,2);box(dx,9,28,7,'#f6bf52',INK,3);ellipse(ctx,dx,15,4,4,INK);}
    }
    ctx.restore();
   });
   // The steady drum remains with the conductor while five new timbres join.
   natural(231,268,()=>{ellipse(ctx,231,270,25,21,'#e99572',INK,3);ellipse(ctx,231,260,25,12,PAPER,INK,3);stroke([[211,242],[226,255]],INK,4);stroke([[251,241],[236,255]],INK,4);});
   members.forEach((name,i)=>{
    const x=340+i*94,isJoined=i<joined,isNext=i===already;
    ctx.save();ctx.globalAlpha=isJoined?1:isNext?.72:.3;
    characterAt(name,x,237,109,isJoined?'act':reveal&&!state.correct&&isNext?'recover':'idle');
    instrument(i,x,267,isJoined);
    ctx.restore();
   });
   if(answered){
    const x=mix(227,714,travel),y=mix(164,120,travel);
    stroke([[219,259],[x,y]],right?GOLD:'#fff8df',4);
    token(settledReveal?q.answer:value,x,y,49,right?GOLD:PAPER);
   }else{
    const angle=count?-.7+count*.25:-.3;
    stroke([[217,266],[217+Math.cos(angle)*76,266+Math.sin(angle)*76]],PAPER,6);
   }
   caption(reveal?(right?`${joined} 人の音が かさなった！`:'正しい答えを みんなで演奏！'):answered?`${value} の合図を おくった！`:'答えで合図！ 音をかさねよう');
   break;
  }
  case 21: {
   character(163,334,216,q.character||game.character);
   prop(343,105,398,2);
   box(550,212,315,94,'#fff8e3',null,17);
   const corrected=settledReveal&&(quiet||revealAge>.55),claim=corrected?q.answer:q.claimed??q.answer;
   digit(q.a,434,211,39);text('×',477,211,30);digit(q.b,518,211,39);text('＝',561,211,30);digit(claim,629,211,40);
   if(reveal&&!q.truth&&!corrected)stroke([[602,206],[653,215]],CORAL,5);
   if(answered){
    const stampY=quiet?251:mix(168,251,travel),r=quiet?1:1+Math.sin(travel*Math.PI)*.14;
    natural(716,stampY,()=>{ctx.save();ctx.translate(716,stampY);ctx.rotate(quiet?0:-.13);ctx.scale(r,r);box(0,0,85,69,value? '#dbf5de':'#ffe0d1',value?TEAL:CORAL,15);text(value?'○':'×',0,-4,47,value?TEAL:CORAL);text(value?'ほんと':'うそ',0,24,14);ctx.restore();});
   }
   if(reveal){
    text(q.truth?'ほんとの九九だったね！':`「${q.claimed}」は ちがったね！`,530,274,21);
    caption(!answered?'正しい九九を いっしょに言おう！':!state.correct?`${value?'ほんと':'うそ'}を選んだね。正しい九九を もう一度！`:q.truth?'みんなで 正しい九九を言おう！':'みやぶった！ 正しい九九を言おう！');
   }else{
    for(let i=0;i<3;i++)ellipse(ctx,447+i*35,274,6,6,count>i?GOLD:'#efe4c5',INK,1.5);
    caption(answered?`${value?'ほんと':'うそ'} の判をおしたよ！`:'言っている九九は、ほんと？ うそ？');
   }
   crumbs('★',393,137);
   break;
  }
 }
 return true;
}
