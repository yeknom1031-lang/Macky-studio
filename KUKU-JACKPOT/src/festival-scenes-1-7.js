const INK='#172b46', PAPER='#fff5db', GOLD='#ffce59', TEAL='#48c7bd', CORAL='#fb785f';
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>1-(1-clamp(t))**3;

/** Selection drives motion even on a wrong answer; the final pose never expires. */
export function sceneAction1to7(state){
 const pulse=state.lastPulse;
 const acted=Number.isFinite(state.selected)&&!!pulse&&!pulse.demo;
 const age=acted?Math.max(0,state.time-pulse.time):0;
 return {acted,age,progress:acted?(state.reduceMotion?1:ease(age/.7)):0,index:clamp(pulse?.index??0,0,2),value:state.selected,revealed:state.phase==='reveal',correct:state.correct===true,timing:pulse?.timing||'off'};
}

/** The immersive entry calls this before its legacy rich-scene fallback. */
export function drawScenes1to7(env){
 const {ctx,game,q,state,t,helpers,characterAt,num,label,rounded,ellipse,withNaturalAspect}=env;
 if(game.id<2||game.id>7)return false;
 const action=sceneAction1to7(state),{acted,progress,age,index,value,revealed,correct}=action;
 const controls=state.controls||q.choices?.map(value=>({value,label:String(value)}))||[];
 const positions=[362,548,734];
 const count=state.stageProgress?.correct||0;
 const finishColor=revealed?(correct?'#bce8a3':'#ffcfaa'):GOLD;
 const line=(points,color=INK,width=4)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();};
 const panel=(x,y,w,h,fill=PAPER)=>rounded(ctx,x-w/2,y-h/2,w,h,14,fill,INK,3);
 const text=(s,x,y,size=22,color=INK)=>label(ctx,s,x,y,size,color);
 const character=(x=147,y=330,size=218,pose)=>characterAt(game.character,x,y,size,pose||(acted&&age<.7?'act':revealed?(correct?'celebrate':'recover'):state.anticipating?(game.id===3?'hold':'anticipate'):state.phase==='listen'?'talk':'idle'));
 const prop=(x,y,size,frame=0)=>withNaturalAspect(ctx,x+size/2,y+size/2,()=>helpers.drawProp?.(ctx,x,y,size,t,{frame}));
 const star=(x,y,size,color=GOLD)=>{
  ctx.beginPath();for(let i=0;i<10;i++){const r=size*(i%2?.43:1),a=-Math.PI/2+i*Math.PI/5;i?ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r):ctx.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=1.5;ctx.stroke();
 };
 const rowCount=()=>{
  const earned=Math.min(8,count+Number(revealed&&correct));
  if(game.id===2){for(let i=0;i<earned;i++)ellipse(ctx,265,325-i*7,32,7,i%2?TEAL:PAPER,INK,2);}
  else if(game.id===3){
   if(earned>1)line(Array.from({length:earned},(_,i)=>[343+i*42,320-(i%2)*9]),'#fff5db',3);
   for(let i=0;i<earned;i++)star(343+i*42,320-(i%2)*9,12);
  }else if(game.id===4){for(let i=0;i<earned;i++){rounded(ctx,342+i*43,318,33,16,5,PAPER,INK,1);line([[347+i*43,325],[353+i*43,329],[366+i*43,320]],TEAL,2);}}
  else if(game.id===5){for(let i=0;i<earned;i++)ellipse(ctx,339+i*42,320,17,6,TEAL,INK,1);}
  else if(game.id===6){for(let i=0;i<earned*2;i++){const x=301+i*28;ellipse(ctx,x,321,8,9,['#f2b69e','#b7e2bf','#ead07d'][i%3],INK,1);line([[x-7,327],[x-13,318]],INK,2);line([[x+7,327],[x+13,316]],INK,2);}}
  else if(game.id===7){for(let i=0;i<earned;i++){const x=274+(i%4)*32,y=325-Math.floor(i/4)*24;rounded(ctx,x,y-19,28,22,4,'#e8ba78',INK,1.5);line([[x+14,y-18],[x+14,y+2]],'#af7e46',2);}}
 };
 const groups=(x,y,width,height,unit,groups,filled=true)=>{
  const dx=Math.min(18,width/(unit+1)),dy=Math.min(18,height/(groups+1));
  for(let row=0;row<groups;row++){
   const yy=y+(row-(groups-1)/2)*dy;
   rounded(ctx,x-unit*dx/2-5,yy-dy*.42,unit*dx+10,dy*.84,5,filled?'#ffe8b3':'#fff5db88','#be9e66',1);
   for(let col=0;col<unit;col++){
    const xx=x+(col-(unit-1)/2)*dx;
    ellipse(ctx,xx,yy,Math.min(6,dx*.3),Math.min(5,dy*.3),filled?CORAL:'#d5cab8',null);
   }
  }
 };
 switch(game.id){
  case 2:{
   // Each visible plate is a real answer target in the same order as the pads.
   character(135,330,220);
   panel(535,170,290,54,'#fff5dbe6');
   text(`${q.a}こずつ × ${q.b}さら`,535,156,22);
   groups(535,180,255,30,q.a,q.b);
   controls.forEach((c,i)=>{
    const selected=acted&&i===index;
    const propFrame=selected?(revealed&&correct?4:Math.min(3,Math.floor(age*7))):Math.floor(state.beat)%2;
    prop(positions[i]-78,193,156,propFrame);
    const x=selected?lerp(positions[i],266,progress):positions[i];
    const y=selected?lerp(286,234,progress)-Math.sin(progress*Math.PI)*30:286;
    if(selected){ellipse(ctx,x,y+15,48,13,finishColor,INK,3);rounded(ctx,x-32,y-12,64,25,10,'#ffad91',INK,2);line([[x-28,y-58],[x-9,y-17]],GOLD,6);line([[x+28,y-58],[x+9,y-17]],GOLD,6);}
    panel(x,y-1,59,38,selected?finishColor:PAPER);num(c.value,x,y-1,34);
   });
   if(acted)text('えらんだ おさら',265,189,18);
   rowCount('おいしく とれた！');
   break;
  }
  case 3:{
   const selectedX=positions[index];
   const launch=acted?progress:0;
   const x=acted?lerp(500,selectedX,launch):500;
   const y=lerp(293,235,launch);
   character(145,330,209,acted&&age<.7?'act':undefined);
   controls.forEach((c,i)=>{
    const chosen=acted&&i===index;
    ellipse(ctx,positions[i],164,58,27,chosen?finishColor:'#d3e9ff',INK,3);
    num(c.value,positions[i],159,39);
   });
   const charge=acted?1:clamp((state.beat-9)/3);
   prop(x-70,y-66,140,acted?(revealed&&correct?4:3):charge>.1?1+Math.floor(state.beat*2)%2:0);
   if(acted&&!state.reduceMotion&&age<.7){ellipse(ctx,x,y+55,17,22+Math.sin(t*40)*7,GOLD);ellipse(ctx,x,y+52,8,16,PAPER);}
   panel(734,251,152,84,'#fff5dbed');
   text('ねんりょう',734,227,19);
   if(acted)num(value,734,256,37);else text(`${q.a}ずつ ${q.b}くみ`,734,253,18);
   const fuel=acted?clamp(value/q.answer):charge;
   rounded(ctx,675,280,118,9,5,'#c3c1b8',null);rounded(ctx,675,280,Math.max(3,118*fuel),9,5,TEAL,null);
   if(revealed&&!correct){text(`${q.answer}こで とどくよ`,524,286,23);}
   else if(acted)text('えらんだ 星へ！',475,292,23);
   else text('3・2・1で じゅんび！',474,301,21);
   rowCount('星へ とどいた！');
   break;
  }
  case 4:{
   const take=value===1;
   const x=acted?lerp(518,take?304:779,progress):518;
   const y=acted?lerp(222,take?247:168,progress):222;
   const scale=acted?lerp(1,.68,progress):1;
   character(140,331,218,acted&&age<.7?'act':undefined);
   const falseClaim=q.claimed!==q.answer;
   if(acted){panel(529,155,354,37,'#fff5dbdc');text(revealed?`巻物は ${falseClaim?'うそ':'ほんとう'}でした`:`${q.a} × ${q.b} ＝ ${q.claimed}`,529,155,revealed?22:25);}
   ctx.save();ctx.translate(x,y);ctx.rotate(!take&&acted?progress*.48:0);ctx.scale(scale,scale);
   rounded(ctx,-188,-44,376,88,12,PAPER,INK,3);
   rounded(ctx,-199,-53,21,106,7,GOLD,INK,3);rounded(ctx,178,-53,21,106,7,GOLD,INK,3);
   if(revealed&&falseClaim){
    text('ちがった式',0,-22,18,'#7d827c');
    text(`${q.a} × ${q.b} ＝ ${q.claimed}`,0,13,31,'#929991');
    line([[-133,13],[133,13]],'#aa6558',4);
   }else text(`${q.a} × ${q.b} ＝ ${q.claimed}`,0,0,39);
   ctx.restore();
   if(acted)text(take?'うけとった！':'はじいた！',take?305:752,291,23);
   if(revealed){panel(528,276,350,66,finishColor);text('ほんとうは',528,255,17);text(`${q.a} × ${q.b} ＝ ${q.answer}`,528,283,35);}
   else if(!acted)text('ほんとう？ ちがう？',517,297,23);
   rowCount('みきわめた！');
   break;
  }
  case 5:{
   const from=q.lesson?.from??q.a*(q.b-1);
   ellipse(ctx,514,301,300,26,'#69b9c6');
   ellipse(ctx,188,291,64,18,'#a8d577',INK,3);num(from,188,267,31);
   controls.forEach((c,i)=>{
    const selected=acted&&i===index;
    const yy=270-(i%2)*16;
    ellipse(ctx,positions[i],yy+22,74,20,selected?finishColor:'#a8d577',INK,3);
    num(c.value,positions[i],selected?yy+51:yy-9,43);
   });
   const targetY=270-(index%2)*16;
   const x=lerp(188,positions[index],progress),y=lerp(299,targetY+28,progress)-Math.sin(progress*Math.PI)*(state.reduceMotion?0:91);
   characterAt('カエル',x,y,100,acted&&age<.7?'act':revealed?(correct?'celebrate':'recover'):state.anticipating?'anticipate':'idle');
   panel(515,170,352,47,'#fff5dbed');text(`${from} から ${q.a} すすむと？`,515,170,27);
   if(revealed&&!correct)text(`正しい はっぱは ${q.answer}`,520,211,24);
   rowCount(`${q.a}ずつ わたれた！`);
   break;
  }
  case 6:{
   character(146,330,222,acted&&age<.7?'act':undefined);
   text(acted?'こたえを うけつけました！':'せーの！ こたえは？',539,156,23);
   controls.forEach((c,i)=>{
    const chosen=acted&&i===index,x=positions[i];
    prop(x-80,175,160,chosen?(revealed?(correct?4:2):1):0);
    num(c.value,x,270,42);
    if(chosen){ellipse(ctx,x,204,8,8,revealed?(correct?TEAL:CORAL):GOLD,INK,2);}
   });
   if(revealed&&!correct)text(`こたえは ${q.answer}！`,539,181,24);
   rowCount('番組で せいかい！');
   break;
  }
  case 7:{
   character(139,330,210);
   prop(218,148,195,acted?Math.min(5,Math.floor(age*8)):Math.floor(state.beat)%2);
   panel(499,221,193,173,'#fff5dbea');
   text(`${q.a}こ × ${q.b}くみ`,499,157,23);
   groups(499,231,176,129,q.a,q.b,acted||revealed);
   // The mathematical batch is fixed; the child's answer selects box capacity.
   if(acted){
    const gap=value-q.answer;
    panel(715,240,155,137,finishColor);
    text('えらんだ はこ',715,189,19);num(value,715,222,44);text('こ いり',715,256,19);
    line([[597,240],[629,240]],INK,5);line([[621,230],[634,240],[621,250]],INK,5);
    if(revealed){text(correct?'ぴったり！':gap>0?`${gap}こぶん あくよ`:`${-gap}こ はみでる`,715,285,20);text(`できた数 ${q.answer}こ`,499,301,22);}
   }else{
    panel(715,237,155,109,'#fff5dbdc');text('なんこ いりの',715,217,20);text('はこにする？',715,250,20);
   }
   rowCount('ぴったり はこづめ！');
   break;
  }
 }
 return true;
}
