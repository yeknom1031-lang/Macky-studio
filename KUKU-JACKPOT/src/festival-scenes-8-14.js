// These scenes share one answer tap, but use that answer in different physical
// actions. They are driven only by question/state data, never their own timers.
const INK='#172b46',CREAM='#fff5db',GOLD='#ffce59',TEAL='#48c7bd',CORAL='#fb785f';
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const lerp=(a,b,p)=>a+(b-a)*p;
const FLAVORS={strawberry:{name:'いちご',hue:160,color:'#ff869e'},grape:{name:'ぶどう',hue:100,color:'#bd95e1'},melon:{name:'メロン',hue:0,color:TEAL},lemon:{name:'レモン',hue:245,color:GOLD}};
const flavorOf=q=>FLAVORS[q.lesson?.flavor||['strawberry','grape','melon','lemon'][(q.a+q.b)%4]];
const flavoredPots=new WeakMap();

// Safari has no Canvas filter. Blend against the generated sprite and restore
// its original alpha instead. Cache each small frame for the current stage.
function flavoredPot(ctx,drawProp,x,y,size,time,frame,flavor){
 if(!drawProp)return;
 const browserCanvas=typeof OffscreenCanvas!=='undefined'||typeof document!=='undefined';
 if(!flavor.hue||!browserCanvas)return drawProp(ctx,x,y,size,time,{frame});
 let cache=flavoredPots.get(drawProp);if(!cache){cache=new Map();flavoredPots.set(drawProp,cache);}
 const key=`${flavor.name}:${frame}`;let canvas=cache.get(key);
 if(!canvas){
  canvas=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(256,256):document.createElement('canvas');canvas.width=canvas.height=256;
  const paint=canvas.getContext('2d');
  if(!paint||drawProp(paint,0,0,256,time,{frame})===false)return drawProp(ctx,x,y,size,time,{frame});
  paint.globalCompositeOperation='color';paint.globalAlpha=.8;paint.fillStyle=flavor.color;paint.fillRect(0,0,256,256);
  paint.globalAlpha=1;paint.globalCompositeOperation='destination-in';drawProp(paint,0,0,256,time,{frame});
  paint.globalCompositeOperation='source-over';cache.set(key,canvas);
 }
 ctx.drawImage(canvas,x,y,size,size);return true;
}

export function memoryPresentation(q,state){
 if(state.phase==='reveal')return {value:q.answer,hint:false,hidden:false};
 if(Number.isFinite(state.selected))return {value:state.selected,hint:false,hidden:false};
 const hint=!!q.lesson?.showHint&&state.phase!=='intro'&&state.beat<(q.lesson.hintUntilBeat??5.5);
 return {value:hint?q.answer:'？',hint,hidden:!hint};
}

export function drawScenes8to14(env){
 const {ctx,game,q,state,t=state.time||0,helpers={},characterAt,num,label,rounded,ellipse,withNaturalAspect}=env;
 if(game.id<8||game.id>14)return false;
 const lesson=q.lesson||{},pulse=state.lastPulse,beat=Math.max(0,state.beat||0);
 const selected=Number.isFinite(state.selected)?state.selected:null,answered=selected!==null,reveal=state.phase==='reveal';
 const correct=answered&&selected===q.answer,success=reveal?!!state.correct:correct;
 const value=reveal?q.answer:selected;
 const age=answered?Math.max(0,state.time-(pulse?.time??state.hitTime??state.time)):0;
 const moving=answered&&!state.reduceMotion,travel=answered?(state.reduceMotion?1:clamp(age/.75)):0;
 const selectedIndex=Math.max(0,(state.controls||[]).findIndex(c=>c.value===selected));
 const perfect=success&&pulse?.timing==='perfect';
 const pose=reveal?(success?'celebrate':'recover'):answered?(age<.8?'act':correct?'celebrate':'recover'):state.phase==='listen'?'talk':'anticipate';
 const countdown=state.phase==='play'&&!answered?clamp((beat-9)/3):0;
 const frame=answered?Math.min(5,Math.floor(age*7)):state.reduceMotion?0:Math.floor(beat)%2;
 const history=state.stageProgress?.history||[];
 const natural=withNaturalAspect||((_ctx,_x,_y,draw)=>draw());
 const prop=(x,y,size,f=frame,alpha=1)=>{ctx.save();ctx.globalAlpha*=alpha;natural(ctx,x+size/2,y+size/2,()=>helpers.drawProp?.(ctx,x,y,size,t,{frame:f}));ctx.restore();};
 const main=(x=164,y=333,size=207,p=pose)=>characterAt?.(game.character,x,y,size,p);
 const plate=(x,y,w,h,fill=CREAM,stroke=INK)=>rounded(ctx,x-w/2,y-h/2,w,h,15,fill,stroke,3);
 const text=(s,x,y,size=24,color=INK)=>label(ctx,s,x,y,size,color);
 const caption=(s,x=527,y=303,w=455)=>{y=Math.min(y,304);plate(x,y,w,28,CREAM,null);text(s,x,y,20);};
 const math=(parts,x,y,size=33)=>{
  const widths=parts.map(v=>typeof v==='number'?String(v).length*size*.63:size*.7),width=widths.reduce((a,b)=>a+b,0)+9*(parts.length-1);
  let left=x-width/2;parts.forEach((v,i)=>{const cx=left+widths[i]/2;typeof v==='number'?num(v,cx,y,size):text(v,cx,y,size);left+=widths[i]+9;});
 };
 const dots=(count,x,y,spacing=9,color=TEAL)=>{for(let n=0;n<count;n++)ellipse(ctx,x+(n%3-1)*spacing,y+(Math.floor(n/3)-Math.floor((count-1)/3)/2)*spacing,3,3,color);};
 const choiceToken=(n,x,y,size=45,fill=GOLD)=>{plate(x,y,size*1.45,size*1.12,fill);num(n,x,y,size*.72);};
 const beam=(x1,y1,x2,y2,color=TEAL,width=5)=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.stroke();};
 const settledNumber=()=>value===null?'？':value;
 ctx.save();
 switch(game.id){
  case 8:{
   // One input starts both punches. Their delayed impacts are a performance,
   // not a second action the player has to discover.
   const punch=answered&&!state.reduceMotion?Math.sin(Math.min(1,age/.66)*Math.PI)*16:countdown*5;
   main(218+punch,336,235,pose);
   const machineFrame=!answered?0:age<.24?1:age<.52?2:success?4:5;
   prop(360,86,349,machineFrame);
   const tens=value===null?'？':value>=10?Math.floor(value/10):null,ones=value===null?'？':value%10;
   const positions=[456,614];
   [tens,ones].forEach((digit,i)=>{
    const hit=answered&&digit!==null&&(state.reduceMotion||age>=(i&&tens!==null?.27:0));
    if(hit){ctx.save();ctx.globalAlpha=.32;ellipse(ctx,positions[i],232,48,56,success?GOLD:CORAL);ctx.restore();}
    if(digit!==null)num(digit,positions[i],232,58);
    plate(positions[i],281,128,29,CREAM,null);text(i?'一のくらい':'十のくらい',positions[i],281,20);
   });
   if(value!==null){
    plate(535,308,292,30,success?GOLD:CREAM,null);
    value>=10?math([Math.floor(value/10)*10,'+',value%10,'=',value],535,308,26):math([value],535,308,29);
   }else caption('答えをわたして、ドン・パッ！',535,318,365);
   break;
  }
  case 9:{
   const groupSize=lesson.groupSize??q.a,groups=lesson.groups??q.b;
   const departure=answered?(state.reduceMotion?22:travel*36):0;
   main(149,331,194);
   prop(225+departure,150,192,answered?Math.floor(age*9)%6:Math.floor(beat*2)%2);
   plate(578,144,397,42);text('駅めぐり',420,144,18);
   const stops=Math.max(2,Math.min(5,lesson.stageTotal||5)),stationX=i=>478+i*264/(stops-1),current=lesson.stageIndex??history.length;
   beam(stationX(0),144,stationX(stops-1),144,TEAL,4);
   for(let i=0;i<stops;i++){
    const past=history[i],present=i===current,n=past?.answer??(present?settledNumber():null);
    ellipse(ctx,stationX(i),144,19,19,past?GOLD:present?CREAM:'#e5edeb',INK,2);
    if(n!==null)num(n,stationX(i),144,23);else ellipse(ctx,stationX(i),144,4,4,TEAL);
   }
   const carWidth=Math.min(58,344/groups),start=414+(344-carWidth*groups)/2;
   for(let i=0;i<groups;i++){
    const cx=start+carWidth*(i+.5)+departure*.4;
    plate(cx,211,carWidth-4,72,i===groups-1&&answered?GOLD:CREAM);
    dots(groupSize,cx,203,Math.min(9,(carWidth-10)/3));
    ellipse(ctx,cx-carWidth*.22,253,5,5,INK);ellipse(ctx,cx+carWidth*.22,253,5,5,INK);
    if(i)beam(cx-carWidth*.5,238,cx-carWidth*.5+4,238);
   }
   text(`${groupSize}人ずつ　${groups}両`,588,271,22);
   if(answered){
    const fromX=[370,540,710][selectedIndex%3],x=lerp(fromX,585,travel),y=lerp(329,301,travel);
    plate(x,y,190,38,reveal?success?GOLD:CREAM:GOLD);text(reveal?'ぜんぶで':'きっぷ',x-56,y,19);num(settledNumber(),x+26,y,29);text('人',x+65,y,19);
   }else caption('同じ人数の車両を、つなごう！',585,315,380);
   break;
  }
  case 10:{
   main(174,334,214);
   const flavor=flavorOf(q);
   const pot=(x,y,size,f,fl)=>natural(ctx,x+size/2,y+size/2,()=>flavoredPot(ctx,helpers.drawProp,x,y,size,t,f,fl));
   const potFrame=!answered?(countdown>.65?3:countdown>0?1:0):travel<.5?3:4;
   pot(318,104,228,potFrame,flavor);
   plate(641,177,234,95);text('ジュースのレシピ',641,145,23);
   math([lesson.perCup??q.a,'×',lesson.cups??q.b],641,181,37);
   text('こずつ　　 はい',643,213,21);
   plate(641,243,191,29,flavor.color);text(`${flavor.name}ジュース`,641,243,20);
   const made=history.filter(h=>h.correct).map(h=>({a:h.a,b:h.b,answer:h.answer}));
   if(correct)made.push({a:q.a,b:q.b,answer:q.answer});
   beam(545,317,770,317,INK,4);text('できたジュース',657,266,17);
   if(made.length){made.slice(-5).forEach((juice,i)=>{const x=543+i*45;pot(x,271,47,4,flavorOf(juice));num(juice.answer,x+23,299,20);});}
   else text('ここに ふえていくよ',656,296,18);
   if(answered){
    const dy=lerp(137,230,travel),dx=lerp(569,432,travel);
    choiceToken(travel<1?selected:settledNumber(),dx,dy,43,flavor.color);
   }else{
    const dropletY=142+(state.reduceMotion?0:Math.sin(beat*Math.PI*2)*4);
    ellipse(ctx,430,dropletY,8+countdown*5,11+countdown*6,flavor.color,INK,2);
   }
   break;
  }
  case 11:{
   main(163,334,204);
   // The empty generated hoop leaves the selected numeric ball unambiguous.
   prop(563,110,215,5);
   const goals=history.filter(h=>h.correct).length;
   plate(415,150,252,42,lesson.retry?GOLD:CREAM);text(lesson.retry?'リバウンド！ もう一度':'答えのボールをシュート',415,150,22);
   if(answered){
    const fromX=[344,405,466][selectedIndex%3],inFlight=travel<1;
    let x=lerp(fromX,671,travel),y=lerp(291,235,travel)-(moving?Math.sin(travel*Math.PI)*96:0);
    if(correct&&!perfect){
     const bank=clamp(travel/.68),fall=clamp((travel-.68)/.32);
     x=travel<.68?lerp(fromX,701,bank):lerp(701,671,fall);
     y=travel<.68?lerp(291,165,bank)-(moving?Math.sin(bank*Math.PI)*58:0):lerp(165,235,fall);
     if(travel>.62&&travel<.83){beam(714,163,729,154,GOLD,4);beam(716,176,734,176,GOLD,4);}
    }
    if(!correct&&travel>.68){const bounce=clamp((travel-.68)/.32);x=lerp(645,497,bounce);y=lerp(210,282,bounce);}
    if(reveal&&!correct){x=497;y=278;}
    ellipse(ctx,x,y,31,31,correct?GOLD:CORAL,INK,3);num(selected,x,y,39);
    if(!inFlight&&correct){beam(652,245,685,249,TEAL,4);beam(657,255,680,259,TEAL,3);}
    if(reveal&&!correct){plate(641,304,235,32);text('こたえ',572,304,19);num(q.answer,666,304,29);}
    else caption(correct?'ナイスシュート！':'つぎに、もう一度おぼえよう',508,317,380);
   }else{
    const bounce=state.reduceMotion?0:Math.abs(Math.sin(beat*Math.PI))*36;
    ellipse(ctx,380,270-bounce,27,27,CORAL,INK,3);text('？',380,270-bounce,34);
    caption('トン・トン・トン、シュート！',494,316,372);
   }
   plate(418,211,175,37,CREAM);text('ゴール',376,211,21);num(goals+(correct?1:0),461,211,28);
   break;
  }
  case 12:{
   const presentation=memoryPresentation(q,state);
   main(151,334,188);
   const shimmer=state.reduceMotion?0:Math.sin(beat*Math.PI)*5;
   prop(305,183+shimmer,127,Math.floor(beat)%6,.66);
   prop(468,134-shimmer,184,answered?frame:Math.floor(beat*2)%6,presentation.hidden?.56:1);
   prop(687,183-shimmer,123,Math.floor(beat+2)%6,.66);
   plate(560,240,127,77,presentation.hint?GOLD:answered?CREAM:'#eff4f8');
   num(presentation.value,560,240,54);
   if(presentation.hint){
    plate(560,145,211,32,CREAM,null);text('こたえを おぼえよう',560,145,23);
    caption('見えているあいだも、答えていいよ',544,316,429);
   }else caption(reveal?'正しい九九を、いっしょに！':answered?'答えが、おばけにもどった！':lesson.showHint?'消えた答えを、よびもどそう':'おぼえた答えを、よびもどそう',548,316,431);
   break;
  }
  case 13:{
   main(165,334,212);
   const partner=lesson.partner||{a:q.b,b:q.a,answer:q.answer};
   const second=lesson.role==='second',partnerValue=second?partner.answer:reveal?q.answer:correct?selected:null;
   const pairFrame=answered&&correct?(state.reduceMotion?2:Math.floor(age*5)%6):0;
   prop(364,122,319,pairFrame);
   plate(418,152,159,45,CREAM);math([partner.a,'×',partner.b],418,152,28);
   plate(657,152,159,45,CREAM);math([q.a,'×',q.b],657,152,28);
   const leftX=466,rightX=591;
   plate(leftX,250,94,59,partnerValue===null?CREAM:GOLD);num(partnerValue??'？',leftX,250,41);
   const rightY=answered?250-(moving?Math.sin(travel*Math.PI)*28:0):250;
   plate(rightX,rightY,94,59,answered?correct?GOLD:CORAL:CREAM);num(settledNumber(),rightX,rightY,41);
   if(reveal||correct){beam(507,284,550,284,TEAL,5);text('＝',529,284,30,TEAL);}
   caption(reveal?'じゅんばんが逆でも、答えは同じ！':lesson.finalPair?'さいごに、もう一度ペアにしよう！':second?'さっきの九九を、ぎゃくに！':'答えで、くつしたをペアにしよう',545,316,439);
   break;
  }
  case 14:{
   const known=lesson.known||{a:q.a,b:q.b-1,answer:q.a*(q.b-1)},step=lesson.step??q.a;
   prop(552,114,230,success?4:answered?Math.min(3,frame):0);
   plate(391,180,246,100);text(known.b===0?'まだ 0 くみ':'ひとつ前の九九',391,149,21);
   known.b===0?math([0],391,187,34):math([known.a,'×',known.b,'=',known.answer],391,187,30);
   plate(428,255,151,40,GOLD);math(['+',step],428,255,34);text('もう 1 くみ',427,289,22);
   const controls=state.controls?.length?state.controls:q.choices.map(value=>({value}));
   const roomY=i=>294-i*44;
   controls.forEach((c,i)=>{
    const chosen=selected===c.value,correctRoom=reveal&&c.value===q.answer;
    plate(667,roomY(i),91,36,correctRoom?GOLD:chosen?correct?GOLD:CORAL:CREAM);
    num(c.value,667,roomY(i),29);
   });
   const targetY=roomY(selectedIndex),px=answered?lerp(276,567,travel):276,py=answered?lerp(320,targetY+29,travel)-(moving?Math.sin(travel*Math.PI)*64:0):320;
   main(px,py,117,answered?'act':pose);
   if(reveal){plate(399,308,244,30,CREAM,null);math([known.answer,'+',step,'=',q.answer],399,308,25);}
   break;
  }
 }
 if(perfect&&age<1.4)helpers.drawEffect?.(ctx,'success',734,239,116,t,{start:pulse.time});
 ctx.restore();return true;
}
