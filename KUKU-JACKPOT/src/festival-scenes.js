// Generated objects react to the very same hits that drive the rhythm score.
// Numbers remain live game data; they are never baked into a scene illustration.
export function drawRichScene(ctx,{game,q,state,t,p,done,pulseActive,reaction,helpers,characterAt,num,chip,label,rounded,ellipse,withNaturalAspect}){
 if(game.id===1||!helpers.hasProp?.())return false;
 const pulse=state.lastPulse,age=state.time-(pulse?.time??-100),beat=state.beat;
 const active=age>=0&&age<.75&&pulse?.success,success=state.phase==='reveal'&&state.correct;
 const charging=state.down||(state.anticipating&&[3,10,16,19].includes(game.id));
 const beatFrame=state.reduceMotion?0:Math.floor(beat*2)%6;
 const actionFrame=state.reduceMotion?3:Math.min(5,Math.floor(Math.max(0,age)*8));
 const frame=success?4:charging?(state.reduceMotion?1:1+Math.floor(beat*2)%2):active?actionFrame:0;
 const value=state.phase==='reveal'?q.answer:state.selected??'♪';
 const target=(pulse?.index??0)%3;
 const prop=(x,y,size,f=frame)=>withNaturalAspect(ctx,x+size/2,y+size/2,()=>helpers.drawProp(ctx,x,y,size,t,{frame:f}));
 const badge=(text,x,y,w=210)=>{if(!state.rhythmMode)chip(ctx,text,x,y,w,'#fff5db',28);};
 const main=(x=156,y=368,size=240,pose=reaction)=>characterAt(game.character,x,y,size,pose);
 const note=(x,y,size=60)=>{if(!state.rhythmMode)num(value,x,y,size);};
 const board=(x,y,w=220,h=96)=>{if(!state.rhythmMode||[7,8].includes(game.id))rounded(ctx,x-w/2,y-h/2,w,h,20,'#fff5db','#172b46',4);};
 const arc=active&&!state.reduceMotion?Math.sin(Math.min(1,age/.7)*Math.PI):0;
 switch(game.id){
  case 2: {
   prop(225,-16,480,active?actionFrame:beatFrame%2);main(138,374,254);
   const x=active&&!state.reduceMotion?690+Math.sin(age*5)*50:770,y=active?240-arc*95:252;
   board(x,y,176,94);note(x,y,68);badge(active?'パクッ！':'お皿がくるよ',786,74,240);break;
  }
  case 3: {
   const lift=active&&!charging&&!state.reduceMotion?Math.min(1,age/.7)*270:0;
   prop(294,-10-lift,430,charging?1+beatFrame%2:active?actionFrame:0);main();
   board(810,210,170,155);note(810,190,75);
   const fuel=charging?Math.max(.05,Math.min(1,state.rhythmMode?(beat-9)/3:state.held/1.2)):active?1:.05;
   rounded(ctx,744,256,132,14,7,'#dfded4',null);rounded(ctx,744,256,Math.max(8,132*fuel),14,7,'#48c7bd',null);
   badge(state.down?'ためて…！':active?'はっしゃ！':'ロケット、準備！',520,380,320);break;
  }
  case 4: {
   const movement=!state.rhythmMode&&active&&!pulse?.demo&&!state.reduceMotion?(state.selected? -1:1)*Math.min(1,age/.7)*110:0;
   prop(310+movement,-15,435,active?Math.min(3,actionFrame):2);main(142,375,245);
   if(!state.rhythmMode)label(ctx,`${q.a} × ${q.b} = ${state.phase==='reveal'?q.answer:q.claimed??q.answer}`,532+movement,204,46);
   badge(active&&!pulse?.demo?(state.selected?'うけとった！':'ひらり！'):'巻物を見きわめよう',785,337,300);break;
  }
  case 5: {
   for(let i=0;i<3;i++)prop(297+i*209,180-(i%2)*35,225,active&&target===i?actionFrame:0);
   const progress=active&&!state.reduceMotion?Math.min(1,age/.7):0,x=active?156+(398+target*209-156)*progress:156;
   main(x,332-arc*140,204,active?'act':reaction);board(812,81,220,83);note(812,81,59);break;
  }
  case 6: {
   for(let i=0;i<3;i++)prop(302+i*204,97,282,active&&target===i?frame:0);
   main(151,370,260);badge('ピンポーン！',147,75,248);
   for(let i=0;i<3;i++)num(active&&i===target?value:'♪',444+i*204,257,50);break;
  }
  case 7: {
   prop(245,70,345,active?actionFrame:0);main(139,373,234);
   // This separate tray always has exactly a rows × b columns.
   board(710,234,220,212);
   const dx=Math.min(25,178/q.b),dy=Math.min(18,132/q.a);
   for(let r=0;r<q.a;r++)for(let c=0;c<q.b;c++){
    const x=710+(c-(q.b-1)/2)*dx,y=246+(r-(q.a-1)/2)*dy;
    ellipse(ctx,x,y,Math.min(10,dx*.4),Math.min(8,dy*.4),active?'#fb785f':'#ffce59');
    ellipse(ctx,x,y,2,2,'#fff5db');
   }
   label(ctx,`${q.a} だん × ${q.b} こ`,710,156,25);note(710,312,59);break;
  }
  case 8: {
   prop(344,1,441,frame);main(202+(active?34:0),378,290,active?'act':reaction);
   const digits=typeof value==='number'?[Math.floor(value/10),value%10]:['♪','♪'];
   digits.forEach((d,i)=>{board(463+i*181,185,104,97);num(d,463+i*181,185,73);rounded(ctx,393+i*181,255,140,31,12,'#fff5db',null);label(ctx,i?'一のくらい':'十のくらい',463+i*181,270,23);});break;
  }
  case 9: {
   const offset=active&&!state.reduceMotion?Math.sin(age*2)*90:0;
   prop(331-offset,11,442,beatFrame);main(157,367,237);
   board(831,214,167,103);note(831,214);badge(active?'ガタン、ゴトン！':'まもなく出発！',595,384,330);break;
  }
  case 10: {
   prop(297,0,417,charging?1+beatFrame%2:frame);main(150,365,239);
   board(804,240,189,122);note(804,240,80);badge(state.down?'とろ〜り…':'おいしい魔法！',779,78,298);break;
  }
  case 11: {
   prop(325,-9,427,active?actionFrame:0);main(170,371,235,active?'act':reaction);
   board(830,106,171,94);note(830,106,67);badge(active?'シュッ！':'ねらいをさだめて',788,363,287);break;
  }
  case 12: {
   for(let i=0;i<3;i++)prop(295+i*200,72+(i%2)*27,260,beatFrame);main(145,384,202);
   board(811,296,192,103);if(!state.rhythmMode)num(state.phase==='listen'||state.phase==='reveal'||active?value:'？',811,296,70);
   badge(active?'おばけも ダンス！':'九九をおぼえて…',717,64,336);break;
  }
  case 13: {
   prop(295,-16,445,active?actionFrame:beatFrame);main(151,371,241);
   board(815,235,201,128);note(815,235,78);badge(active?'ぴったり ペア！':'ペアで ステップ！',675,377,330);break;
  }
  case 14: {
   prop(389,-17,425,active?actionFrame:0);
   main(active&&!state.reduceMotion?324:163,active&&!state.reduceMotion?370-Math.min(1,age/.7)*240:370,232,active?'act':reaction);
   board(850,224,151,115);note(850,224);badge(active?'とんだー！':'ヒーロー、準備！',230,70,300);break;
  }
  case 15: {
   prop(state.rhythmMode?340:624,20,state.rhythmMode?425:315,beatFrame);main(175,367,245);
   if(!state.rhythmMode){board(478,111,377,99);label(ctx,`${q.a} × □ = ${q.answer}`,478,111,51);
   board(545,291,331,121);label(ctx,state.selected===null?'何をかける？':`${state.selected/q.a} をかける！`,545,291,45);
   characterAt('ビートくん',880,387,159,active?'act':'idle');}break;
  }
  case 16: {
   prop(280,-18,469,charging?1+beatFrame%2:frame);main(139,374,234);
   board(805,233-arc*50,185,116);note(805,233-arc*50,77);badge(state.down?'ぐぐぐ…！':active?'つれたー！':'ぴくぴく…',745,74,269);break;
  }
  case 17: {
   for(let i=0;i<3;i++)prop(293+i*209,89,290,active&&target===i?actionFrame:0);
   main(151,378,244);badge(active?'おとどけ！':'つぎの町へ！',708,66,292);
   board(541,342,180,84);note(541,342,64);break;
  }
  case 18: {
   prop(286,105,414,active?actionFrame:beatFrame);main(135,351,228);
   const digits=[Math.floor(q.answer/10),q.answer%10],missing=q.missing==='tens'?0:1;
   if(state.phase!=='reveal')digits[missing]=state.selected===null?'？':missing===0?Math.floor(state.selected/10):state.selected%10;
   if(!state.rhythmMode){board(650,88,510,123);label(ctx,`${q.a} × ${q.b} =`,513,88,47);
   digits.forEach((d,i)=>num(d,711+i*96,88,67));}badge(active?'すぽっ！':'数字をなおそう！',805,326,273);break;
  }
  case 19: {
   main(253,390,charging?290:270,charging?'hold':reaction);
   if(active||success)prop(457,-26,443,frame);
   else badge(state.down?'はっ… はっ…':'くしゃみの準備！',704,137,324);
   board(768,332,191,100);note(768,332,71);break;
  }
  case 20: {
   ['カエル','クマ','ウサギ','ネコ'].forEach((name,i)=>characterAt(name,340+i*145,280,130,active?'act':'idle'));
   prop(410,235,230,beatFrame);main(147,389,217,active?'act':reaction);
   badge(active?'せーのっ！ 大合奏！':'みんなで フィナーレ！',545,60,440);
   board(850,333,142,95);note(850,333);break;
  }
  case 21: {
   prop(347,12,439,active?Math.min(4,actionFrame):2);
   characterAt(q.character||game.character,157,378,253,state.phase==='listen'?'talk':reaction);
   if(!state.rhythmMode){board(573,155,418,111);label(ctx,`${q.a} × ${q.b} = ${state.phase==='reveal'?q.answer:q.claimed??q.answer}`,573,155,53);}
   badge(active&&!pulse?.demo?(state.selected?'ほんと！':'うそ！'):'よ〜く きいてね',818,350,270);break;
  }
  default:return false;
 }
 return true;
}
