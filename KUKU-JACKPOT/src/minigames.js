/** Twenty-one little stages. Positions use a 1000 × 440 logical canvas. */
const INK = '#172b46', CREAM = '#fff5db', CORAL = '#fb785f', GOLD = '#ffce59', TEAL = '#48c7bd';
const specs = [
  ['jackpot','九九ジャックポット','ぴたっと！ 大あたり','答えをえらんで、リールをタップ！','stop',['#f9c276','#ef815d'],'ビートくん','エレクトロ・ファンク'],
  ['sushi','回転ずし・つかみの達人','流れるお皿を つかまえよう','正しいお皿をタップして、つかもう！','catch',['#ffe1bd','#f69c85'],'ネコ','寿司ディスコ'],
  ['rocket','かけ算ロケット','宇宙まで とんでいけ！','答えをえらぶ → 長おし → はなして発射！','hold',['#253768','#7466ac'],'ロボット','スペース・エレクトロ'],
  ['ninja','九九ニンジャ・見切りの術','九九の巻物を 見きわめろ','あっていたら「うけとる」、ちがえば「はじく」！','truth',['#273d63','#766099'],'キツネ','和太鼓 × ベース'],
  ['frog','カエルの倍数ジャンプ','ぴょん！ はっぱをわたろう','正しい数字のはっぱをタップしてジャンプ！','jump',['#c0ead2','#75c9c7'],'カエル','池のスカ・バンド'],
  ['quiz','早口クイズ！九九オンエア','君がきょうの チャンピオン','正しい答えをえらんで、早おし！','buzzer',['#7463aa','#c28eb7'],'イヌの司会','クイズ番組のビッグバンド'],
  ['donuts','ドーナツ増殖工場','ぎゅっ！ 焼きたてできあがり','答えをえらんで、プレスをタップ！','press',['#b5e1da','#72b9bf'],'クマ','工場パーカッション'],
  ['gorilla','ゴリラの数字パンチ','十の位！ 一の位！','答えをえらんで、ドン・ドンと２回タップ！','double',['#e9c796','#ce956f'],'ゴリラ','ずっしりヒップホップ'],
  ['train','九九トレイン・出発進行','つないで 出発進行！','答えの車両をタップして、れんけつ！','connect',['#bfe4f1','#75bdce'],'ビートくん','車輪のスウィング'],
  ['magic','魔法のジュース研究所','まぜまぜ！ おいしい魔法','答えをえらぶ → 長おし → はなして完成！','pour',['#ddd0f1','#aa9cd9'],'ウサギ','魔法のマリンバ・ポップ'],
  ['basketball','リバウンド・九九バスケ','ねらえ！ ナイスシュート','答えをえらんで、上へスワイプ！ タップでもOK','throw',['#ffc080','#ee9271'],'ネコ','スタジアム・ビート'],
  ['ghost','おばけの穴あきディスコ','覚えて！ 消えて！ おどろう！','数字をおぼえて、正しいおばけをタップ！','memory',['#534b83','#827bbb'],'キツネ','ふしぎディスコ'],
  ['socks','くつしたペアペアランド','ぴったりペアで ダンシング','答えのくつしたを、左のくつしたに重ねよう！','pair',['#ffe0d3','#dda4c3'],'アライグマ','ランドリー・ハウス'],
  ['hero','となりの九九・ヒーロービル','とべ！ 九九ヒーロー','答えの階をえらんで、上へスワイプ！','climb',['#b2dfef','#88b0d5'],'ロボット','ヒーロー・ブラス'],
  ['aliens','宇宙人の逆九九トーク','ピポパ！ 何をかける？','□に入る数をえらんで、ふきだしをタップ！','echo',['#294c65','#517391'],'宇宙人','電子音のコール＆レスポンス'],
  ['fishing','九九フィッシング','ぴくぴく！ 大ものヒット','答えをえらぶ → 長おし → はなしてつろう！','pull',['#bce7e9','#62bdbd'],'カワウソ','トロピカル・ビート'],
  ['delivery','宅配ロボの九九エクスプレス','シュッ！ お届け完了','答えのポストへ、荷物をスワイプ！','deliver',['#ffe0ba','#bdcdbb'],'ロボット','メカニカル・ファンク'],
  ['octopus','タコの数字修理店','すぽっ！ 数字をなおそう','空いているところに、正しい数字をはめよう！','repair',['#b9e5e8','#75bccb'],'タコ','工具と木琴のポップ'],
  ['dragon','ドラゴンの九九くしゃみ','ためてためて… はっくしょん！','答えをえらぶ → 長おし → はなして花火！','breathe',['#f4d6a6','#c6c69a'],'ドラゴン','コミカル・オーケストラ'],
  ['orchestra','九九オールスター・大合奏','みんなで フィナーレ！','答えをえらんで、１・２・３と３回タップ！','conduct',['#f4c880','#e99aa0'],'ビートくん','オールスター・リミックス'],
  ['forest','ほんと？うそ？九九の森','どうぶつたちの 九九トーク','言っている九九は「ほんと」？ それとも「うそ」？','truth',['#c7e0c6','#7fb19c'],'オオカミ','森のスウィング・ファンク'],
];
export const GAMES = specs.map((s,i)=>Object.freeze({id:i+1,slug:s[0],title:s[1],subtitle:s[2],instruction:s[3],mechanic:s[4],theme:s[5],character:s[6],music:s[7]}));

const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>1-Math.pow(1-clamp(t),3);
const mod=(v,n)=>((v%n)+n)%n;
const hit=(x,y,cx,cy,rx,ry=rx)=>Math.abs(x-cx)<=rx && Math.abs(y-cy)<=ry;
function rounded(ctx,x,y,w,h,r=18,fill=CREAM,stroke=INK,line=4){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}}
function ellipse(ctx,x,y,rx,ry,fill,stroke=null,line=4){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}}
function line(ctx,points,color=INK,width=5){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();}
// A short landscape viewport stretches the stage, but never a face or a digit.
function withNaturalAspect(ctx,x,y,draw){
  let factor=1;const canvas=ctx.canvas;
  if(canvas&&typeof canvas.getBoundingClientRect==='function'&&typeof ctx.getTransform==='function'){
    const rect=canvas.getBoundingClientRect(),matrix=ctx.getTransform();
    const sx=rect.width/canvas.width*Math.hypot(matrix.a,matrix.b),sy=rect.height/canvas.height*Math.hypot(matrix.c,matrix.d);
    if(sx>0&&sy>0)factor=clamp(sy/sx,.3,3);
  }
  ctx.save();ctx.translate(x,y);ctx.scale(factor,1);ctx.translate(-x,-y);draw();ctx.restore();
}
function label(ctx,text,x,y,size=28,color=INK,align='center'){withNaturalAspect(ctx,x,y,()=>{ctx.fillStyle=color;ctx.font=`900 ${size}px "Kuku Maru", "Hiragino Maru Gothic ProN", sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(String(text),x,y);});}
function star(ctx,x,y,r,color=GOLD,rotation=0){ctx.beginPath();for(let i=0;i<10;i++){const a=rotation+i*Math.PI/5-Math.PI/2,rr=i%2?r*.45:r;const xx=x+Math.cos(a)*rr,yy=y+Math.sin(a)*rr;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.closePath();ctx.fillStyle=color;ctx.fill();}
function shadow(ctx,x,y,rx=55){ellipse(ctx,x,y,rx,10,'#172b4626');}
function number(ctx,value,x,y,size,helpers){if(helpers.drawNumber)withNaturalAspect(ctx,x,y,()=>helpers.drawNumber(ctx,value,x,y,size));else label(ctx,value,x,y,size);}
function character(ctx,name,x,y,size,state,time,helpers){
  if(helpers.drawCharacter){withNaturalAspect(ctx,x,y,()=>helpers.drawCharacter(ctx,name,x,y,size,state,time));return;}
  const faces={'ビートくん':'🐥','オオカミ':'🐺','ウサギ':'🐰','クマ':'🐻','キツネ':'🦊','ロボット':'🤖','ネコ':'🐱','カエル':'🐸','ゴリラ':'🦍','ドラゴン':'🐲','宇宙人':'👽','タコ':'🐙','アライグマ':'🦝','カワウソ':'🦦','イヌの司会':'🐶'};
  const bob=state==='celebrate'?Math.abs(Math.sin(time*9))*16:Math.sin(time*3)*3;shadow(ctx,x,y-2,size*.32);label(ctx,faces[name]||'🐥',x,y-size*.48-bob,size);
}
function bubble(ctx,text,x,y,w=290,color=CREAM,size=38){rounded(ctx,x-w/2,y-40,w,80,24,color);line(ctx,[[x-12,y+39],[x-23,y+58],[x+18,y+40]],INK,4);label(ctx,text,x,y,size);}
function chip(ctx,text,x,y,w=160,color=CREAM,size=26){rounded(ctx,x-w/2,y-23,w,46,22,color,INK,3);label(ctx,text,x,y,size);}
function wheel(ctx,x,y,r,t){ellipse(ctx,x,y,r,r,INK);ellipse(ctx,x,y,r*.65,r*.65,CREAM);line(ctx,[[x+Math.cos(t)*r*.6,y+Math.sin(t)*r*.6],[x-Math.cos(t)*r*.6,y-Math.sin(t)*r*.6]],INK,4);}
function dotTrail(ctx,points,color=GOLD){points.forEach(([x,y],i)=>ellipse(ctx,x,y,4+i%2,4+i%2,color));}

/** A round never changes the player's recorded value to a correct value. */
export function createMiniGame(gameId, question, suppliedHelpers={}) {
  const game=GAMES.find(g=>g.id===Number(gameId));
  if(!game)throw new RangeError(`Unknown mini-game: ${gameId}`);
  const q={...question};
  if(!Number.isInteger(q.a)||!Number.isInteger(q.b)||q.a<1||q.a>9||q.b<1||q.b>9)throw new RangeError('Multipliers must be integers from 1 to 9');
  q.answer=q.a*q.b;
  const choices=Array.from(new Set((q.choices||[]).filter(Number.isFinite)));
  if(!choices.includes(q.answer))choices.splice(Math.min(choices.length,2),0,q.answer);
  for(let n=1;choices.length<3;n++)if(!choices.includes(q.answer+n))choices.push(q.answer+n);
  choices.length=3;
  const truth=game.mechanic==='truth';
  let controls=truth?[{label:game.id===4?'うけとる ○':'ほんと ○',value:1},{label:game.id===4?'はじく ×':'うそ ×',value:0}]:choices.map(value=>({label:String(value),value}));
  if(game.id===15){
    const factors=choices.map(v=>clamp(Math.round(v/q.a),1,9));
    const correctIndex=choices.indexOf(q.answer);factors[correctIndex]=q.b;
    const used=new Set([q.b]);
    for(let i=0;i<factors.length;i++){if(i===correctIndex)continue;if(used.has(factors[i])){for(let distance=1;distance<10;distance++){const candidate=mod(q.b-1+distance,9)+1;if(!used.has(candidate)){factors[i]=candidate;break;}}}used.add(factors[i]);}
    controls=factors.map(factor=>({label:String(factor),value:q.a*factor}));
  }
  if(game.id===18){
    const missing=q.missing==='tens'?'tens':'ones';q.missing=missing;
    const digit=v=>missing==='tens'?Math.floor(v/10):v%10;
    const digits=[...new Set(choices.map(digit).map(d=>clamp(d,0,9)))];
    if(!digits.includes(digit(q.answer)))digits[digits.length-1]=digit(q.answer);
    for(let n=0;digits.length<3;n++)if(!digits.includes(n))digits.push(n);
    controls=digits.slice(0,3).map(d=>({label:`${d} をはめる`,value:missing==='tens'?d*10+q.answer%10:Math.floor(q.answer/10)*10+d}));
  }
  const state={time:0,beat:0,phase:'listen',selected:null,correct:null,reduceMotion:false,value:null,hitTime:null,completed:false,down:false,downAt:0,downX:0,downY:0,pointerX:500,pointerY:230,presses:0,actionAt:null,held:0,slots:[0,0],reelStart:0,ghostSeen:false,playStartedAt:null,nudgeUntil:0};
  const heldGames=new Set([3,10,16,19]);
  const directGames=new Set([4,6,18,21]);
  function selected(){return state.selected;}
  function active(){return state.phase==='play'&&!state.completed;}
  function setChoice(value){const c=controls.find(c=>c.value===Number(value));if(!c||state.completed)return false;state.selected=c.value;return true;}
  function complete(value,time){if(!active()||!Number.isFinite(value))return false;state.value=value;state.selected=value;state.completed=true;state.hitTime=Number.isFinite(time)?time:state.time;state.actionAt=state.hitTime;state.down=false;return true;}
  function perform(time){
    if(!active())return false;
    if(selected()===null){state.nudgeUntil=time+1.7;return false;}
    state.actionAt=time;
    if(game.id===8||game.id===20){state.presses++;if(state.presses<(game.id===8?2:3))return false;}
    return complete(selected(),time);
  }
  function choose(value,time=state.time){if(!active()||!setChoice(value))return false;if(directGames.has(game.id))return complete(selected(),time);return true;}
  function objectCenters(time){
    if(game.id===2)return controls.map((c,i)=>({...c,x:175+mod(i*250+time*62,750),y:245}));
    if(game.id===5)return controls.map((c,i)=>({...c,x:360+i*235,y:280-(i%2)*55}));
    if(game.id===6)return controls.map((c,i)=>({...c,x:345+i*225,y:265}));
    if(game.id===9)return controls.map((c,i)=>({...c,x:405+i*220,y:235}));
    if(game.id===11)return controls.map((c,i)=>({...c,x:340+i*245,y:120}));
    if(game.id===12)return controls.map((c,i)=>({...c,x:310+i*240,y:210}));
    if(game.id===13)return controls.map((c,i)=>({...c,x:400+i*220,y:200}));
    if(game.id===14)return controls.map((c,i)=>({...c,x:670,y:295-i*98}));
    if(game.id===16)return controls.map((c,i)=>({...c,x:345+i*245+Math.sin(time*1.5+i)*25,y:250+(i%2)*50}));
    if(game.id===17)return controls.map((c,i)=>({...c,x:390+i*235,y:200}));
    if(game.id===18)return controls.map((c,i)=>({...c,x:345+i*220,y:315}));
    if(truth)return controls.map((c,i)=>({...c,x:350+i*320,y:286}));
    return [];
  }
  function pointer(type,x,y,time=state.time){
    if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(time))return false;
    if(type==='cancel'){state.down=false;state.held=0;return false;}
    if(!active())return false;
    state.pointerX=x;state.pointerY=y;
    if(type==='down'){
      state.down=true;state.downAt=time;state.downX=x;state.downY=y;
      const obj=objectCenters(time).find(c=>hit(x,y,c.x,c.y,game.id===14?150:88,game.id===14?45:80));
      if(obj){setChoice(obj.value);if([2,4,5,6,9,12,14,18,21].includes(game.id))return perform(time);}
      if([1,7,8,15,20].includes(game.id))return perform(time);
      return true;
    }
    if(type==='move')return state.down;
    if(type==='up'&&state.down){
      state.down=false;state.held=Math.max(0,time-state.downAt);
      if(heldGames.has(game.id)){
        if(selected()===null){const i=clamp(Math.floor(state.held/0.65),0,controls.length-1);setChoice(controls[i].value);}
        return perform(time);
      }
      if([11,13,14,17].includes(game.id))return perform(time);
      if([2,5,9,12,18].includes(game.id))return perform(time);
    }
    return false;
  }
  function key(key,time=state.time){
    if(!active())return false;
    if(['1','2','3'].includes(key)){const c=controls[Number(key)-1];return c?choose(c.value,time):false;}
    if(key==='ArrowLeft'||key==='ArrowRight'){
      const index=controls.findIndex(c=>c.value===selected());const next=mod(index+(key==='ArrowLeft'?-1:1),controls.length);return choose(controls[next].value,time);
    }
    if(key===' '||key==='Enter'){
      if(heldGames.has(game.id)){if(!state.down){state.down=true;state.downAt=time;return true;}state.down=false;state.held=Math.max(0,time-state.downAt);if(selected()===null)setChoice(controls[clamp(Math.floor(state.held/.65),0,controls.length-1)].value);return perform(time);}
      return perform(time);
    }
    return false;
  }
  function update(next){
    if(Number.isFinite(next.time))state.time=next.time;
    if(Number.isFinite(next.beat))state.beat=next.beat;
    if(next.phase){if(next.phase==='play'&&state.phase!=='play')state.playStartedAt=state.time;state.phase=next.phase;}
    if(next.correct!==undefined)state.correct=next.correct;
    if(next.reduceMotion!==undefined)state.reduceMotion=Boolean(next.reduceMotion);
    if(next.selected!==undefined&&next.selected!==null&&!state.completed)setChoice(next.selected);
    if(state.down)state.held=Math.max(0,state.time-state.downAt);
    if(state.phase!=='play')state.down=false;
  }
  function draw(ctx,w=1000,h=440,extraHelpers={}){
    const helpers={...suppliedHelpers,...extraHelpers};ctx.save();ctx.scale(w/1000,h/440);
    const t=state.reduceMotion?0:state.time,beat=Math.sin(state.beat*Math.PI*2),done=state.completed,p=done?ease((state.time-state.hitTime)/.85):0;
    const reaction=state.phase==='reveal'?(state.correct?'celebrate':'recover'):(state.down?'act':state.phase==='listen'?'talk':'idle');
    const characterAt=(name,x,y,size=165,pose=reaction)=>character(ctx,name,x,y,size,pose,t,helpers);
    const num=(value,x,y,size=66)=>number(ctx,value,x,y,size,helpers);
    const picked=(value)=>selected()===value;
    const bg=ctx.createLinearGradient(0,0,0,440);bg.addColorStop(0,game.theme[0]);bg.addColorStop(1,game.theme[1]);ctx.fillStyle=bg;ctx.fillRect(0,0,1000,440);
    // Small moving shapes make each stage feel alive without obscuring the numbers.
    if([3,4,12,15].includes(game.id)){for(let i=0;i<26;i++){const x=mod(i*173+17,1000),y=mod(i*61+23,345);star(ctx,x,y,3+(i%3),i%2?CREAM:GOLD,t*.08);}}
    else {for(let i=0;i<7;i++){ellipse(ctx,i*170+35,44+(i%3)*23,44,15,'#fff8');ellipse(ctx,i*170+62,40+(i%3)*23,25,20,'#fff8');}}
    if(game.id===1){
      // The reel strip is continuous; after input it travels to the EXACT selected digits.
      rounded(ctx,278,26,454,307,38,INK,INK,5);rounded(ctx,292,39,426,275,30,CORAL,CREAM,5);
      for(let i=0;i<15;i++)ellipse(ctx,310+i*27,59,5,5,i%2?(beat>0?GOLD:CREAM):CREAM);
      for(let r=0;r<2;r++){
        const x=329+r*173;rounded(ctx,x,87,148,191,20,CREAM,INK,5);ctx.save();ctx.beginPath();ctx.roundRect(x+5,92,138,181,14);ctx.clip();
        const target=done?Math.floor(state.value/(r===0?10:1))%10:0,at=state.hitTime??state.time;
        const moving=at*15+r*3.25;
        let pos=moving;
        if(done){const start=at*15+r*3.25;const finish=Math.ceil((start-target)/10)*10+target+10;pos=lerp(start,finish,ease((state.time-at)/(.75+r*.18)));}
        if(state.reduceMotion)pos=done?target:Math.floor(state.time*3)+r*3;
        const base=Math.floor(pos);for(let j=-2;j<=2;j++){const n=mod(base+j,10),yy=184+(base+j-pos)*125;num(n,x+74,yy,108);}
        ctx.restore();line(ctx,[[x+7,121],[x+141,121]],'#172b461b',3);line(ctx,[[x+7,246],[x+141,246]],'#172b461b',3);
      }
      line(ctx,[[741,210],[776,173-done*25]],INK,14);ellipse(ctx,781,163-done*25,23,23,TEAL,INK);characterAt('ビートくん',159,345,225);star(ctx,850,83,35,GOLD,t*.3);chip(ctx,done?'ぴたっ！':'ぐるぐる…',835,303,176,CREAM);
    } else if(game.id===2){
      for(let x=0;x<1000;x+=70){line(ctx,[[x,0],[x,140]],'#fff5',2);}rounded(ctx,0,310,1000,130,0,'#d4745d',null);rounded(ctx,82,179,836,144,65,INK,INK);rounded(ctx,92,191,816,118,56,'#d9ede1',null);
      for(let i=0;i<14;i++){const x=100+mod(i*63-t*45,800);line(ctx,[[x,200],[x,300]],'#94bab0',3);}
      objectCenters(state.time).forEach(c=>{const raise=done&&c.value===state.value?p*104:0;ctx.save();ctx.translate(c.x,c.y-raise);ellipse(ctx,0,42,88,23,picked(c.value)?GOLD:CREAM,INK);rounded(ctx,-59,-39,118,59,24,CREAM,INK);rounded(ctx,-65,-47,130,37,16,CORAL,INK,3);line(ctx,[[-46,-33],[-28,-46]],'#ffe3ca',5);line(ctx,[[0,-28],[18,-42]],'#ffe3ca',5);num(c.value,0,19,54);ctx.restore();});
      const cx=done?(objectCenters(state.time).find(c=>c.value===state.value)?.x??500):500;line(ctx,[[cx-43,32],[cx-20,170-p*75]],GOLD,12);line(ctx,[[cx+40,29],[cx+17,170-p*75]],GOLD,12);characterAt('ネコ',105,146,130,'talk');chip(ctx,'お皿をつかもう',802,64,270,CREAM,25);
    } else if(game.id===3){
      ellipse(ctx,470,497,800,170,'#bec4d7',INK);for(let i=0;i<5;i++)ellipse(ctx,110+i*175,376+(i%2)*30,34,12,'#9ba3ba');
      const lift=done?p*460:0,shake=state.down?Math.sin(t*55)*3:0;ctx.save();ctx.translate(400+shake,238-lift);line(ctx,[[-54,74],[-82,104],[-40,99]],CORAL,17);line(ctx,[[54,74],[82,104],[40,99]],CORAL,17);rounded(ctx,-49,-110,98,199,48,CREAM,INK,5);ctx.beginPath();ctx.moveTo(-45,-73);ctx.quadraticCurveTo(0,-179,45,-73);ctx.fillStyle=CORAL;ctx.fill();ctx.strokeStyle=INK;ctx.stroke();ellipse(ctx,0,-23,29,29,TEAL,INK);if(state.down||done){ctx.beginPath();ctx.moveTo(-29,92);ctx.lineTo(0,148+(beat+1)*20);ctx.lineTo(29,92);ctx.fillStyle=GOLD;ctx.fill();}ctx.restore();
      drawGauge(ctx,controls,selected(),state.down?clamp(state.held/1.5):done?1:.08,730,100,180,230,num,'FUEL');characterAt('ロボット',158,373,149);chip(ctx,state.down?'はなして 発射！':'おして ためよう',475,366,290,GOLD);
    } else if(game.id===4){
      for(let i=0;i<5;i++){rounded(ctx,i*220-50,127,235,21,4,'#427777',INK);line(ctx,[[i*220-30,145],[i*220+80,81],[i*220+185,145]],INK,8);}for(let i=0;i<3;i++){line(ctx,[[150+i*350,0],[150+i*350,35]],GOLD,3);rounded(ctx,128+i*350,28,44,55,14,CORAL,INK,3);}
      const dx=done?(state.value===1?-p*235:p*385):Math.sin(t*2)*13;ctx.save();ctx.translate(533+dx,168-(done?p*40:0));ctx.rotate(done&&state.value===0?p*1.2:0);rounded(ctx,-194,-64,388,128,10,CREAM,INK);rounded(ctx,-202,-71,21,141,8,GOLD,INK,3);rounded(ctx,180,-71,21,141,8,GOLD,INK,3);label(ctx,`${q.a} × ${q.b} = ${state.phase==='reveal'?q.answer:(q.claimed??q.answer)}`,0,0,53);ctx.restore();characterAt('キツネ',140,363,200);drawTruthPads(ctx,controls,picked,done);if(done&&state.value===0)for(let i=0;i<9;i++)star(ctx,660+i*25,88+Math.sin(i)*38,10,'#ffd5da',t+i);
    } else if(game.id===5){
      ellipse(ctx,500,368,640,192,'#57b4bd');for(let i=0;i<8;i++)line(ctx,[[i*145+10,335+(i%3)*23],[i*145+70,335+(i%3)*23]],'#b5e8db',4);
      objectCenters(state.time).forEach(c=>{const y=c.y+Math.sin(t*2+c.x)*4;ellipse(ctx,c.x,y+40,98,27,'#398c74',INK);ellipse(ctx,c.x,y+29,94,25,picked(c.value)?GOLD:'#b5dc7b',INK);num(c.value,c.x,y-6,60);});
      const target=objectCenters(state.time).find(c=>c.value===state.value)||{x:145,y:290};characterAt('カエル',lerp(125,target.x,p),lerp(317,target.y+24,p)-Math.sin(p*Math.PI)*155,160,done?'act':reaction);for(let i=0;i<4;i++){line(ctx,[[35+i*40,317],[31+i*40,253-i%2*23]],'#427857',7);}
    } else if(game.id===6){
      for(let i=0;i<9;i++){const xx=80+i*108;ctx.save();ctx.globalAlpha=.18;ctx.beginPath();ctx.moveTo(xx,0);ctx.lineTo(xx-100,355);ctx.lineTo(xx+100,355);ctx.closePath();ctx.fillStyle=i%2?GOLD:CREAM;ctx.fill();ctx.restore();}rounded(ctx,310,24,390,64,30,INK,GOLD);label(ctx,'KUKU ON AIR',505,56,36,GOLD);
      controls.forEach((c,i)=>{const x=345+i*225,up=done&&state.value===c.value?-20*p:0;rounded(ctx,x-91,218+up,182,127,15,[TEAL,CORAL,GOLD][i],INK);ellipse(ctx,x,223+up,48,15,INK);ellipse(ctx,x,210+up+(picked(c.value)?8:0),46,16,picked(c.value)?'#ffef94':CREAM,INK);num(c.value,x,278+up,64);label(ctx,String(i+1),x,328+up,19);});characterAt('イヌの司会',138,343,191);bubble(ctx,'こたえは？',167,116,236,CREAM,34);for(let i=0;i<11;i++)ellipse(ctx,35+i*90,401,31,39,'#443b69',INK,2);
    } else if(game.id===7){
      rounded(ctx,90,286,820,88,43,INK);for(let i=0;i<11;i++)wheel(ctx,129+i*74,331,19,t*3);rounded(ctx,291,38,416,51,10,GOLD,INK);rounded(ctx,470,77,58,70+(state.down?74:done?(1-p)*70:0),8,INK);const py=150+(done?Math.sin(p*Math.PI)*95:0);rounded(ctx,337,py,327,44,9,CORAL,INK);
      // Each tray is a group. The visible array has exactly a rows × b columns.
      const gw=Math.min(33,228/q.b),gh=Math.min(28,111/q.a);rounded(ctx,351,206,294,103,13,CREAM,INK);for(let row=0;row<q.a;row++)for(let col=0;col<q.b;col++){const x=498+(col-(q.b-1)/2)*gw,y=255+(row-(q.a-1)/2)*gh;ellipse(ctx,x,y,Math.min(gw*.4,12),Math.min(gh*.4,10),done?CORAL:GOLD,INK,1);ellipse(ctx,x,y,3,3,CREAM);}
      characterAt('クマ',177,291,174);if(selected()!==null)chip(ctx,`${selected()} こ の予定`,803,183,213,CREAM);chip(ctx,`${q.a} だん × ${q.b} こ`,496,343,290,CREAM);
    } else if(game.id===8){
      rounded(ctx,0,338,1000,102,0,'#b17962',null);for(let i=0;i<6;i++)line(ctx,[[i*180,0],[i*180+35,225]],'#d1a471',11);
      const val=selected(),digits=val===null?['?','?']:[Math.floor(val/10),val%10];digits.forEach((d,i)=>{const x=502+i*200,broken=state.presses>i;ctx.save();ctx.translate(x,202);ctx.rotate(broken?Math.sin(t*10)*.02:0);rounded(ctx,-77,-89,154,178,17,broken?GOLD:CREAM,INK,6);if(broken)line(ctx,[[-75,-18],[-22,-6],[3,16],[25,5],[76,30]],CORAL,7);num(d,0,2,95);label(ctx,i===0?'十のくらい':'一のくらい',0,113,25);ctx.restore();});
      characterAt('ゴリラ',206+(state.presses?20:0),358,247,state.presses?'act':reaction);const pulse=state.actionAt===null?0:clamp(1-(state.time-state.actionAt)*3);if(pulse)star(ctx,405+Math.min(state.presses-1,1)*185,201,44*pulse,GOLD,t);chip(ctx,state.presses===0?'ドン！ ドン！':state.presses===1?'あと １かい！':'ドンドン！',658,371,290,CREAM);
    } else if(game.id===9){
      for(let i=0;i<8;i++)ellipse(ctx,i*155,266,148,101,i%2?'#95c589':'#badb9f');line(ctx,[[0,343],[1000,343]],INK,7);line(ctx,[[0,367],[1000,367]],INK,5);for(let i=0;i<20;i++)line(ctx,[[i*58,339],[i*58-15,371]],'#9c8267',8);
      let trainX=done?p*100:0;ctx.save();ctx.translate(trainX,0);rounded(ctx,68,192,191,112,17,CORAL,INK);rounded(ctx,115,123,110,123,12,TEAL,INK);rounded(ctx,135,143,60,54,8,CREAM,INK,3);rounded(ctx,70,173,28,44,5,INK);wheel(ctx,116,306,25,t*3);wheel(ctx,220,306,25,t*3);ctx.restore();
      objectCenters(state.time).forEach(c=>{const x=done&&c.value===state.value?lerp(c.x,337+trainX,p):c.x;rounded(ctx,x-83,179,166,120,13,picked(c.value)?GOLD:CREAM,INK);rounded(ctx,x-63,194,126,62,9,'#b8e6df',INK,2);num(c.value,x,228,62);wheel(ctx,x-47,306,24,t*3);wheel(ctx,x+48,306,24,t*3);line(ctx,[[x-98,283],[x-83,283]],INK,6);});chip(ctx,done?'しゅっぱーつ！':'車両をつなごう',505,68,330,CREAM);
    } else if(game.id===10){
      for(let i=0;i<4;i++){rounded(ctx,55+i*255,34,152,21,4,'#8b76b2',INK,3);rounded(ctx,90+i*255,0,24,37,5,TEAL,INK,2);}rounded(ctx,0,338,1000,102,0,'#866bb1',null);ctx.save();ctx.beginPath();ctx.moveTo(393,108);ctx.lineTo(432,323);ctx.quadraticCurveTo(512,347,585,323);ctx.lineTo(624,108);ctx.closePath();ctx.fillStyle=CREAM;ctx.fill();ctx.clip();const fill=state.down?clamp(state.held/1.3):done?1:.08;ctx.fillStyle=selected()===null?TEAL:[TEAL,CORAL,GOLD][controls.findIndex(c=>c.value===selected())%3];ctx.fillRect(380,320-fill*179,260,260);for(let i=0;i<12;i++){ellipse(ctx,420+mod(i*43,180),310-mod(t*55+i*21,fill*170||30),7+(i%4),7+(i%4),'#fff7');}ctx.restore();line(ctx,[[393,108],[432,323],[462,335],[550,335],[585,323],[624,108]],INK,6);ellipse(ctx,508,108,115,17,'#fffd',INK);if(state.down)line(ctx,[[599,33],[558,108],[535,145]],TEAL,14);num(selected()??'?',509,245,77);characterAt('ウサギ',173,338,209);chip(ctx,done?'できあがり！':state.down?'はなして まぜよう！':'魔法をそそごう',810,264,291,CREAM,24);
    } else if(game.id===11){
      rounded(ctx,0,278,1000,162,0,'#cd7f52',null);for(let i=0;i<6;i++)line(ctx,[[i*170,285],[i*220-50,440]],'#f6c59a',3);ellipse(ctx,500,384,166,32,'#d78b5c',CREAM,3);
      objectCenters(state.time).forEach(c=>{rounded(ctx,c.x-63,48,126,72,7,CREAM,INK,4);line(ctx,[[c.x-40,115],[c.x+40,115]],picked(c.value)?GOLD:CORAL,10);for(let i=0;i<5;i++)line(ctx,[[c.x-37+i*18,120],[c.x-23+i*11,166]],'#fffc',3);line(ctx,[[c.x-26,147],[c.x+26,147]],'#fffc',2);num(c.value,c.x,85,52);});
      const target=objectCenters(state.time).find(c=>c.value===state.value)||{x:560,y:120};const bx=done?lerp(176,target.x,p):176,by=done?lerp(271,133,p)-Math.sin(p*Math.PI)*173:270+Math.abs(Math.sin(t*4))*35;ellipse(ctx,bx,by,31,31,CORAL,INK,4);line(ctx,[[bx-29,by],[bx+29,by]],INK,3);line(ctx,[[bx,by-29],[bx,by+29]],INK,3);characterAt('ネコ',127,336,137);dotTrail(ctx,[[250,265],[319,218],[384,188]],CREAM);
    } else if(game.id===12){
      for(let i=0;i<7;i++)line(ctx,[[0,330+i*20],[1000,330+i*20]],'#aaa1d933',2);for(let i=0;i<9;i++)line(ctx,[[500,300],[i*150-100,440]],'#aaa1d933',2);ellipse(ctx,499,40,45,45,TEAL,INK);for(let i=0;i<7;i++)star(ctx,120+i*132,108+(i%2)*31,10,GOLD,t*.3);
      objectCenters(state.time).forEach((c,i)=>{const yy=c.y+Math.sin(t*2+i)*11;ctx.save();ctx.translate(c.x,yy);ctx.beginPath();ctx.moveTo(-77,91);ctx.lineTo(-77,-16);ctx.bezierCurveTo(-77,-130,77,-130,77,-16);ctx.lineTo(77,91);for(let j=0;j<5;j++)ctx.lineTo(77-j*38,69+(j%2)*22);ctx.closePath();ctx.fillStyle=picked(c.value)?'#fff0b1':CREAM;ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=5;ctx.stroke();ellipse(ctx,-28,-36,7,12,INK);ellipse(ctx,28,-36,7,12,INK);const visible=state.phase==='listen'||done||state.phase==='reveal'||state.time-(state.playStartedAt??0)<.8;if(visible)num(c.value,0,27,58);else{label(ctx,'?',0,31,54,'#9b90bc');label(ctx,'おぼえた？',0,133,22,CREAM);}ctx.restore();});
    } else if(game.id===13){
      line(ctx,[[55,38],[950,60]],INK,4);for(let i=0;i<13;i++)ellipse(ctx,35+i*80,401,47,28,'#e8bccf');
      drawSock(ctx,171,211,`${q.a}×${q.b}`,CORAL,false,helpers);label(ctx,'ペアはどれ？',172,335,27);
      objectCenters(state.time).forEach((c,i)=>{let x=c.x,y=c.y+Math.sin(t*2+i)*9;if(state.down&&picked(c.value)){x=state.pointerX;y=state.pointerY;}if(done&&state.value===c.value){x=lerp(c.x,292,p);y=lerp(y,213,p)-Math.sin(p*Math.PI)*60;}drawSock(ctx,x,y,c.value,[TEAL,GOLD,'#bba8dc'][i],picked(c.value),helpers);});if(done)star(ctx,235,108,33,GOLD,t);
    } else if(game.id===14){
      for(let i=0;i<7;i++)rounded(ctx,i*160-45,140+(i%3)*28,123,267,3,['#80a9bf','#749db8','#91b3c5'][i%3],null);rounded(ctx,473,14,363,375,12,'#edf0d9',INK,5);rounded(ctx,454,5,402,28,8,CORAL,INK);objectCenters(state.time).forEach(c=>{rounded(ctx,c.x-139,c.y-38,278,77,8,picked(c.value)?GOLD:'#acd9e3',INK,4);line(ctx,[[c.x-92,c.y-38],[c.x-92,c.y+38]],INK,4);num(c.value,c.x+19,c.y,58);});const target=objectCenters(state.time).find(c=>c.value===state.value)||{x:235,y:315};characterAt('ロボット',lerp(192,target.x-80,p),lerp(384,target.y+37,p)-Math.sin(p*Math.PI)*150,169,done?'act':reaction);dotTrail(ctx,[[295,307],[365,234],[405,171]],GOLD);chip(ctx,'上へ！',263,97,146,CREAM);
    } else if(game.id===15){
      ellipse(ctx,489,453,650,130,'#789091',INK);ellipse(ctx,814,91,114,25,GOLD,INK);ellipse(ctx,814,68,61,45,'#9cdcc9',INK);ellipse(ctx,811,79,23,26,TEAL);characterAt('宇宙人',207,337,218,'talk');const waveform=[];for(let i=0;i<18;i++)waveform.push([352+i*14,116+Math.sin(i*1.6+t*8)*18]);line(ctx,waveform,TEAL,5);bubble(ctx,`${q.a} × □ = ${q.answer}`,437,61,345,CREAM,41);bubble(ctx,selected()===null?'何を かける？':`${selected()/q.a} を かける！`,669,240,395,done?GOLD:CREAM,43);characterAt('ビートくん',887,355,137,done?'act':'idle');for(let i=0;i<5;i++)ellipse(ctx,459+i*60,338,5+(Math.sin(t*4+i)+1)*9,5+(Math.sin(t*4+i)+1)*9,TEAL);
    } else if(game.id===16){
      rounded(ctx,0,172,1000,268,0,'#61c1ca',null);for(let i=0;i<8;i++)line(ctx,[[i*142,186+(i%3)*36],[i*142+77,186+(i%3)*36]],'#c8f3e5',4);rounded(ctx,29,253,217,58,20,'#c89969',INK);characterAt('カワウソ',147,258,175);line(ctx,[[188,173],[278,79],[401,103]],INK,7);const target=objectCenters(state.time).find(c=>c.value===selected())||{x:500,y:256};const hookY=done?lerp(target.y,101,p):target.y;line(ctx,[[402,105],[target.x,hookY]],CREAM,3);ellipse(ctx,target.x,179+Math.sin(t*5)*7,11,16,CORAL,INK,2);
      objectCenters(state.time).forEach((c,i)=>{const flying=done&&state.value===c.value,xx=flying?lerp(c.x,307,p):c.x,yy=flying?lerp(c.y,98,p)-Math.sin(p*Math.PI)*86:c.y;drawFish(ctx,xx,yy,c.value,[GOLD,CORAL,'#b5d88e'][i],picked(c.value),helpers);});chip(ctx,state.down?'はなして つろう！':'ぴくぴく…',777,72,292,CREAM);
    } else if(game.id===17){
      for(let i=0;i<5;i++){rounded(ctx,i*226-60,28+(i%2)*41,174,199,13,['#efb791','#d5b4b9','#97c6bb'][i%3],null);for(let j=0;j<3;j++)rounded(ctx,i*226-33+j*47,65+(i%2)*41,25,43,5,CREAM,null);}rounded(ctx,0,322,1000,118,0,'#848e94',null);for(let i=0;i<8;i++)rounded(ctx,i*150,375,72,9,4,GOLD,null);
      objectCenters(state.time).forEach((c,i)=>{const open=done&&state.value===c.value;rounded(ctx,c.x-68,158,136,135,21,[TEAL,CORAL,GOLD][i],INK);rounded(ctx,c.x-81,137-open*p*26,162,47,15,CREAM,INK);rounded(ctx,c.x-40,196,80,17,5,INK,null);num(c.value,c.x,247,51);line(ctx,[[c.x,294],[c.x,329]],INK,11);});characterAt('ロボット',150,341,194);const tar=objectCenters(state.time).find(c=>c.value===state.value)||{x:175,y:235};ctx.save();ctx.translate(lerp(185,tar.x,p),lerp(261,173,p)-Math.sin(p*Math.PI)*145);ctx.rotate(done?p*1.1:0);rounded(ctx,-30,-24,60,48,5,'#e7bb79',INK,3);line(ctx,[[0,-22],[0,22]],CREAM,9);ctx.restore();
    } else if(game.id===18){
      rounded(ctx,95,241,810,136,14,'#8baf9f',INK,5);rounded(ctx,85,224,830,35,10,GOLD,INK);characterAt('タコ',169,231,184);const tens=Math.floor(q.answer/10),ones=q.answer%10;rounded(ctx,319,42,501,140,22,CREAM,INK);label(ctx,`${q.a} × ${q.b} =`,448,111,45);const chosenDigit=selected()===null?null:(q.missing==='tens'?Math.floor(selected()/10):selected()%10);const ds=[q.missing==='tens'?chosenDigit:tens,q.missing==='ones'?chosenDigit:ones];ds.forEach((d,i)=>{rounded(ctx,574+i*89,69,75,83,11,d===null?'#dbe9e4':GOLD,INK,3);if(d===null)label(ctx,'?',611+i*89,111,53);else num(d,611+i*89,111,59);});objectCenters(state.time).forEach(c=>{rounded(ctx,c.x-68,c.y-53,136,94,18,picked(c.value)?GOLD:CREAM,INK);num(q.missing==='tens'?Math.floor(c.value/10):c.value%10,c.x,c.y-5,60);});line(ctx,[[191,218],[276,273],[314,280]],'#a477a4',17);line(ctx,[[151,218],[215,304],[265,291]],'#a477a4',15);
    } else if(game.id===19){
      for(let i=0;i<6;i++)ellipse(ctx,i*210-50,405,160,155,['#a8bd8c','#bdd0a1'][i%2]);const grow=state.down?1+Math.min(state.held,.9)*.1:1;characterAt('ドラゴン',295,364,260*grow,state.down?'act':reaction);rounded(ctx,674,282,194,68,19,CREAM,INK);num(selected()??'?',771,314,62);if(state.down){for(let i=0;i<3;i++)ellipse(ctx,450+i*46,244-i*15,8+i*4,8+i*4,'#fff8');}if(done){for(let i=0;i<17;i++){const angle=i*Math.PI*2/17,rr=70+p*125;star(ctx,726+Math.cos(angle)*rr,156+Math.sin(angle)*rr,9+(i%3)*4,[GOLD,CORAL,TEAL,CREAM][i%4],t+i);}num(state.value,727,155,91);}else bubble(ctx,state.down?'はっ… はっ…':'ためるぞ〜！',706,126,329,CREAM,36);
    } else if(game.id===20){
      rounded(ctx,0,320,1000,120,0,'#ac686c',null);for(let i=0;i<9;i++)line(ctx,[[i*145,321],[i*170-80,440]],'#dda58d',3);for(let i=0;i<4;i++){ctx.save();ctx.globalAlpha=.12;ctx.beginPath();ctx.moveTo(190+i*215,0);ctx.lineTo(20+i*215,330);ctx.lineTo(355+i*215,330);ctx.fillStyle=CREAM;ctx.fill();ctx.restore();}
      const band=['カエル','クマ','ウサギ','ネコ','ロボット'];band.forEach((name,i)=>{characterAt(name,120+i*188,283,143,state.presses>i%3?'celebrate':'idle');if(i%2===0){ellipse(ctx,120+i*188,282,43,19,GOLD,INK);line(ctx,[[100+i*188,263],[130+i*188,245]],INK,5);}else{rounded(ctx,93+i*188,254,54,47,11,CORAL,INK);line(ctx,[[95+i*188,255],[145+i*188,255]],CREAM,4);}});for(let i=0;i<3;i++)star(ctx,425+i*75,71,25,i<state.presses?GOLD:'#fff5',i*.2);chip(ctx,selected()===null?'答えで指揮しよう':`${selected()} のハーモニー`,502,353,391,CREAM,30);line(ctx,[[849,381],[881+Math.sin(t*5)*20,310]],INK,8);
    } else if(game.id===21){
      for(let i=0;i<7;i++){const x=i*179-28;rounded(ctx,x-12,86,26,293,8,'#8c6b52',null);ellipse(ctx,x,69+(i%2)*25,99,84,['#6c9d77','#96b986','#b5c990'][i%3]);}ellipse(ctx,504,429,699,131,'#a2c284');for(let i=0;i<14;i++){const x=mod(i*173+28,990);star(ctx,x,319+(i%3)*31,7,i%2?CREAM:GOLD,t*.15);}
      const cast=['オオカミ','ウサギ','クマ','キツネ'];const name=q.character||cast[(q.a+q.b)%cast.length];characterAt(name,128,348,189,state.phase==='listen'?'talk':reaction);bubble(ctx,`${q.a} × ${q.b} = ${state.phase==='reveal'?q.answer:(q.claimed??q.answer)}`,582,119,450,CREAM,53);drawTruthPads(ctx,controls,picked,done);if(done)chip(ctx,state.value?'ほんと！':'うそ！',848,349,182,CREAM);
    }
    if(state.phase==='reveal'&&state.correct){const now=state.reduceMotion?0:Math.max(0,state.time-(state.hitTime??state.time));for(let i=0;i<16;i++){const x=mod(i*193+47,980)+10,y=mod(i*61+now*90,355);star(ctx,x,y,5+(i%3)*2,[GOLD,CREAM,CORAL,TEAL][i%4],t+i);}}
    const action=actionText(game,state);rounded(ctx,273,389,454,39,19,state.nudgeUntil>state.time?CORAL:'#172b46eb',null);label(ctx,action,500,409,21,CREAM);
    if(state.phase==='play'&&!state.completed&&state.nudgeUntil>state.time){line(ctx,[[503,374],[503,347],[514,358],[503,347],[492,358]],CREAM,5);}
    ctx.restore();
  }
  return {game,controls,choose,pointer,key,update,draw,getResult:()=>({value:state.value,performed:state.completed,hitTime:state.hitTime}),get completed(){return state.completed;},get selected(){return state.selected;},get presses(){return state.presses;}};
}

function actionText(game,s){
  if(s.completed)return s.phase==='reveal'?(s.correct?'できた！':'つぎは きっとできる！'):'こたえを送ったよ！';
  if(s.phase==='listen')return game.id===12?'数字と場所を おぼえよう！':'まずは 九九を きこう！';
  if(s.phase==='reveal')return 'ただしい 九九を きこう！';
  if(s.nudgeUntil>s.time)return '先に 下から答えを えらんでね！';
  if(game.id===12&&s.time-(s.playStartedAt??0)<.8)return 'よく見て！ もうすぐ 数字が消えるよ！';
  if(game.mechanic==='truth')return '○ か × を えらぼう！';
  if(s.selected===null)return [2,5,9,12,13,14,17,18].includes(game.id)?'答えのものを タップしよう！':'下から 答えを えらぼう！';
  if([3,10,16,19].includes(game.id))return s.down?'はなして！':'画面を 長おしして はなそう！';
  if(game.id===8)return s.presses?'あと１かい ドン！':'２かい ドン・ドン！';
  if(game.id===20)return `あと ${3-s.presses} かい タップ！`;
  if([11,14,17].includes(game.id))return '上へスワイプ！ タップでもOK';
  if(game.id===13)return '左のくつしたへ！ タップでもOK';
  return '画面をタップして 決めよう！';
}
function drawTruthPads(ctx,controls,picked,done){controls.forEach((c,i)=>{const x=350+i*320;rounded(ctx,x-127,250,254,79,24,picked(c.value)?GOLD:i?CORAL:TEAL,INK,5);label(ctx,c.label,x,291,33);if(done&&picked(c.value))star(ctx,x+113,252,20,GOLD);});}
function drawGauge(ctx,controls,selected,fill,x,y,w,h,num,title){
  rounded(ctx,x-8,y-28,w+16,h+59,24,CREAM,INK);label(ctx,title,x+w/2,y-6,20);rounded(ctx,x+20,y+17,44,h-33,16,'#d4e4dd',INK,3);ctx.save();ctx.beginPath();ctx.roundRect(x+23,y+20,38,h-39,12);ctx.clip();ctx.fillStyle=TEAL;ctx.fillRect(x+22,y+20+(h-39)*(1-fill),40,h);ctx.restore();controls.forEach((c,i)=>{const yy=y+h-37-i*((h-76)/2);line(ctx,[[x+67,yy],[x+81,yy]],INK,3);if(c.value===selected)rounded(ctx,x+87,yy-25,78,50,15,GOLD,INK,2);num(c.value,x+125,yy,40);});}
function drawSock(ctx,x,y,value,color,selected,helpers){ctx.save();ctx.translate(x,y);ctx.beginPath();ctx.moveTo(-43,-100);ctx.lineTo(45,-100);ctx.lineTo(45,37);ctx.quadraticCurveTo(80,58,66,80);ctx.quadraticCurveTo(29,112,-5,86);ctx.lineTo(-42,62);ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=selected?7:5;ctx.stroke();rounded(ctx,-46,-105,94,28,7,CREAM,INK,3);line(ctx,[[-40,-53],[42,-53]],'#fff8',10);number(ctx,value,0,0,typeof value==='string'?39:60,helpers);ctx.restore();}
function drawFish(ctx,x,y,value,color,selected,helpers){ctx.save();ctx.translate(x,y);ctx.beginPath();ctx.moveTo(50,0);ctx.lineTo(87,-35);ctx.lineTo(87,35);ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=3;ctx.stroke();ellipse(ctx,0,0,68,43,color,INK,selected?6:3);ellipse(ctx,-44,-11,8,8,CREAM,INK,2);ellipse(ctx,-45,-11,3,4,INK);number(ctx,value,7,6,48,helpers);ctx.restore();}
