// Four original stages: their objects explain both the action and its outcome.
const root='./assets/runtime/carnival/';
export const GAMES_B=[
 {id:27,slug:'balance',title:'九九シーソー・ぴったりバランス',subtitle:'同じ重さで、ぴたっと水平！',instruction:'おもり全部と同じ重さを、1つ選ぼう！',action:'のせる',accent:'#68d8ba',assets:{background:root+'balance/background.webp',cast:root+'balance/cast.webp'}},
 {id:28,slug:'chameleon',title:'九九カメレオン・数字キャッチ',subtitle:'ビヨーン！ 正しい数字をキャッチ',instruction:'正しい答えの虫を、1つ選ぼう！',action:'つかまえる',accent:'#9ae66c',assets:{background:root+'chameleon/background.webp',cast:root+'chameleon/cast.webp'}},
 {id:29,slug:'domino',title:'九九ドミノ・最後の1枚',subtitle:'答えをはめて、しかけをつなごう',instruction:'空いている答えのドミノを、1つ選ぼう！',action:'はめる',accent:'#ffc56a',assets:{background:root+'domino/background.webp',cast:root+'domino/cast.webp'}},
 {id:30,slug:'tv',title:'九九テレビ・ピントぴったり',subtitle:'正解して、ひみつの正体を見よう',instruction:'正しい答えで、テレビをくっきりさせよう！',action:'ピント！',accent:'#c6a5ff',assets:{background:root+'tv/background.webp',cast:root+'tv/cast.webp'}}
];
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
function box(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
function text(c,s,x,y,size,color='#253b49'){c.font=`900 ${size}px "Kuku Maru",sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.fillText(s,x,y);}
function ellipse(c,x,y,rx,ry,fill){c.beginPath();c.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),0,0,Math.PI*2);c.fillStyle=fill;c.fill();}
function line(c,x,y,xx,yy,color,width=3){c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.stroke();}
function beat(e){return Number(e.beat)||0;}
function age(e){return Math.max(0,Number(e.resultAge)||0);}
function bob(e){return e.reduced?0:Math.sin(beat(e)*Math.PI*2);}
function sprite(c,e,x,y,size,frame,flip=false){
 const im=e.images?.cast;if(!im)return;const iw=im.naturalWidth||im.width,sh=im.naturalHeight||im.height,f=clamp(frame,0,3);
 // The chameleon sheet's pose widths vary; crop at inspected transparent gutters.
 const edges=e.game.id===28?[0,600/2172,1144/2172,1635/2172,1]:[0,.25,.5,.75,1],sx=iw*edges[f],sw=iw*(edges[f+1]-edges[f]),dw=size*sw/sh;
 c.save();c.translate(x,y);if(flip)c.scale(-1,1);c.drawImage(im,sx,0,sw,sh,-dw/2,-size,dw,size);c.restore();
}
function pose(e){return e.result?.correct?3:e.result?2:e.reduced?0:Math.floor(beat(e))%2;}
function plaque(c,s,x,y,w,h,accent='#fff4cc'){box(c,x-w/2,y-h/2,w,h,h*.3,accent,'#ffffffaa');text(c,s,x,y,h*.42);}
function stars(c,e,x,y,r){if(e.reduced||!e.result?.correct)return;const a=age(e);for(let i=0;i<12;i++){const p=i*Math.PI/6+a*1.8,d=r*(.45+Math.min(a,1)*.55);c.save();c.globalAlpha=clamp(1.7-a);text(c,'✦',x+Math.cos(p)*d,y+Math.sin(p)*d*.6,8+i%3*3,['#fff4ae','#80ffe0','#ffaff0'][i%3]);c.restore();}}

function balance(c,e){
 const {w,h,q}=e,cy=h*.58,cx=w*.5,span=w*.24;
 const wrong=e.result&&!e.result.correct,entered=e.result?.value;
 const mismatch=entered==null?-1:clamp((entered-q.answer)/Math.max(5,q.answer),-1,1);
 const finalAngle=e.result?.correct?0:wrong?mismatch*.2:-.10;
 const blend=e.result?clamp(age(e)*2):0,angle=-.10+(finalAngle+.10)*blend;
 ellipse(c,cx,h*.69,w*.26,h*.025,'#22293b35');
 c.beginPath();c.moveTo(cx,h*.51);c.lineTo(cx-w*.055,h*.69);c.lineTo(cx+w*.055,h*.69);c.closePath();c.fillStyle='#e5ab62';c.fill();c.strokeStyle='#795032';c.lineWidth=3;c.stroke();
 ellipse(c,cx,cy,h*.025,h*.025,'#fff2ca');
 c.save();c.translate(cx,cy);c.rotate(angle);
 box(c,-span-h*.04,-h*.012,span*2+h*.08,h*.04,h*.018,'#7d5b45','#e3b76d');
 for(const side of [-1,1]){line(c,side*span,-h*.01,side*span,-h*.18,'#f8e3ae',3);line(c,side*span,-h*.18,side*span-w*.09,-h*.015,'#f8e3ae',2);line(c,side*span,-h*.18,side*span+w*.09,-h*.015,'#f8e3ae',2);box(c,side*span-w*.11,-h*.005,w*.22,h*.027,h*.014,'#59bca8','#e5fff0');}
 const cols=Math.min(q.b,3),rows=Math.ceil(q.b/cols),bw=w*.047,bh=h*.048;
 for(let i=0;i<q.b;i++){const x=-span+(i%cols-(cols-1)/2)*(bw+3),y=-h*.025-(Math.floor(i/cols)+1)*(bh+2);box(c,x-bw/2,y,bw,bh,5,'#ffcf79','#fff4cc');text(c,String(q.a),x,y+bh*.55,bh*.64,'#62482d');}
 const right=e.result?.correct?q.answer:entered??'?';const fall=e.result&&!e.reduced?(1-clamp(age(e)*3))*h*.18:0;
 box(c,span-w*.055,-h*.115-fall,w*.11,h*.09,10,e.result?.correct?'#a9f4cc':wrong?'#ffd5b1':'#c5d9fa','#fff5e2');text(c,String(right),span,-h*.068-fall,h*.05);
 c.restore();
 plaque(c,`${q.a} kg が ${q.b}こ`,w*.265,h*.32,w*.25,h*.07);
 plaque(c,e.result?.correct?`${q.answer} kg で ぴったり！`:'右に同じ重さをのせよう',w*.72,h*.32,w*.30,h*.07,'#d9fff1');
 sprite(c,e,w*.095,h*.69,h*.29,pose(e));sprite(c,e,w*.91,h*.69,h*.25,e.result?.correct?3:1,true);
 if(e.result?.correct){stars(c,e,cx,cy,h*.22);text(c,'＝',cx,h*.43,h*.09,'#fff6b5');}
 else if(wrong)plaque(c,entered==null?'正しくは '+q.answer+' kg':entered<q.answer?'少し軽かったね':'少し重かったね',cx,h*.69,w*.29,h*.055,'#fff2db');
}
function bug(c,x,y,size,color,value,wing){
 ellipse(c,x-size*.45,y-size*.05,size*.48,size*(.18+.07*wing),'#efffffbb');ellipse(c,x+size*.45,y-size*.05,size*.48,size*(.18+.07*wing),'#efffffbb');
 ellipse(c,x,y,size*.37,size*.5,color);ellipse(c,x,y-size*.28,size*.25,size*.21,'#fff4cd');ellipse(c,x-size*.10,y-size*.30,size*.045,size*.065,'#294848');ellipse(c,x+size*.10,y-size*.30,size*.045,size*.065,'#294848');
 line(c,x-size*.1,y-size*.43,x-size*.24,y-size*.66,'#284d43',2);line(c,x+size*.1,y-size*.43,x+size*.24,y-size*.66,'#284d43',2);
 text(c,String(value),x,y+size*.1,size*.43,'#173d36');
}
function chameleon(c,e){
 const {w,h,q}=e,colors=['#b9f38c','#ffd187','#ffb7da'],baseY=h*.49,phase=bob(e),from={x:w*.16,y:h*.51};
 plaque(c,'虫の数字を 1つ選んで キャッチ！',w*.56,h*.32,w*.52,h*.07,'#e8ffd9');
 for(let i=0;i<3;i++){
  const x=w*(.28+i*.22),y=baseY+(e.reduced?0:Math.sin(e.t*2+i)*h*.012),picked=e.result?.lane===i;
  c.save();if(e.result&&picked&&age(e)>.45)c.globalAlpha=e.result.correct?.1:.5;
  ellipse(c,x,h*.68,w*.06,h*.012,'#143b3e33');bug(c,x,y,h*.12,colors[i],q.choices[i],phase);c.restore();
 }
 if(e.result?.lane!=null){const i=e.result.lane,a=age(e),reach=e.reduced?1:a<.28?clamp(a/.28):a<.55?1:clamp(1-(a-.55)*2);const to={x:w*(.28+i*.22),y:baseY};
  c.save();c.strokeStyle='#ff8fa5';c.lineWidth=h*.025;c.lineCap='round';c.beginPath();c.moveTo(from.x,from.y);c.quadraticCurveTo(w*.24,h*.34,from.x+(to.x-from.x)*reach,from.y+(to.y-from.y)*reach);c.stroke();ellipse(c,from.x+(to.x-from.x)*reach,from.y+(to.y-from.y)*reach,h*.022,h*.015,'#ffd5d9');c.restore();
 }
 sprite(c,e,w*.125,h*.68,h*.34,pose(e));
 if(e.result?.correct){stars(c,e,w*(.28+e.result.lane*.22),baseY,h*.18);plaque(c,`${q.a} × ${q.b} ＝ ${q.answer}`,w*.53,h*.68,w*.31,h*.065,'#dcffb5');}
 else if(e.result)plaque(c,`正しい虫は ${q.answer}！`,w*.53,h*.68,w*.31,h*.065,'#fff4cf');
 // A growing skin-pattern badge is a persistent reward, not another answer.
 const spots=Math.min(6,e.correctCount||0);for(let i=0;i<spots;i++)ellipse(c,w*.06+i*w*.018,h*.73,h*.008,h*.008,colors[i%3]);
}
function dominoTile(c,x,y,tw,th,angle,num,color){c.save();c.translate(x,y);c.rotate(angle);box(c,-tw/2,-th,tw,th,5,color,'#fff5c4');line(c,-tw*.32,-th*.48,tw*.32,-th*.48,'#bb9777',1.5);text(c,num,0,-th*.72,th*.25,'#614c43');ellipse(c,0,-th*.24,tw*.12,tw*.12,'#9c6a42');c.restore();}
function domino(c,e){
 const {w,h,q}=e,a=age(e),success=e.result?.correct,cols=11,start=w*.23,step=w*.054,base=h*.62;
 plaque(c,'答えの1枚で、最後までつながる！',w*.52,h*.315,w*.49,h*.07);
 const filled=Math.min(5,e.correctCount||0);
 for(let k=0;k<5;k++){const x=w*(.38+k*.07);line(c,x,h*.37,x,h*.43,'#ffe5a1',2);c.fillStyle=k<filled?'#ffb862':'#ffffff66';c.beginPath();c.moveTo(x,h*.37);c.lineTo(x+w*.025,h*.38);c.lineTo(x,h*.405);c.fill();}
 for(let i=0;i<cols;i++){
  const x=start+i*step,y=base+Math.sin(i/10*Math.PI)*h*.025;
  if(i===5&&!e.result){box(c,x-w*.025,y-h*.13,w*.05,h*.13,6,'#3d6073aa','#fff2a4');text(c,'?',x,y-h*.07,h*.07,'#fff5c5');continue;}
  const fall=success&&!e.reduced?clamp((a-i*.08)*4)*1.22:success?1.22:0;
  const num=i===5?(success?q.answer:e.result?.value??'?'):'♪';
  dominoTile(c,x,y,w*.035,h*.14,fall,num,i===5?'#ffbc73':['#a0eadc','#dbd1ff','#ffd5a0'][i%3]);
 }
 // The answer tile slides down into its gap before the chain moves.
 if(success&&a<.3&&!e.reduced)dominoTile(c,start+5*step,base-(.3-a)*h*.5,w*.043,h*.16,0,q.answer,'#ffda82');
 sprite(c,e,w*.105,h*.69,h*.31,success?3:pose(e));
 const wheelX=w*.9,wheelY=h*.43,r=h*.09,rotation=success&&!e.reduced?a*7:0;
 c.save();c.translate(wheelX,wheelY);c.rotate(rotation);for(let i=0;i<4;i++){c.rotate(Math.PI/2);box(c,0,-r*.22,r,r*.44,6,['#ffc57d','#9be4da','#ff9fb1','#ccc0ff'][i]);}c.restore();ellipse(c,wheelX,wheelY,h*.025,h*.025,'#fff8d8');line(c,wheelX,wheelY,wheelX,h*.65,'#e9b878',h*.018);
 if(success){stars(c,e,wheelX,wheelY,h*.2);plaque(c,filled===5?'大しかけ、完成！':`${filled} / 5 の旗がひらいた！`,w*.53,h*.70,w*.33,h*.055,'#fff3a9');}
 else if(e.result)plaque(c,`次は ${q.answer} の牌でつなごう`,w*.53,h*.70,w*.42,h*.055,'#fff4df');
}
function tv(c,e){
 const {w,h,q}=e,x=w*.30,y=h*.27,sw=w*.41,sh=h*.42;
 ellipse(c,w*.51,h*.73,w*.25,h*.025,'#15132f55');
 line(c,w*.45,y,w*.41,y-h*.06,'#ffe2ad',4);line(c,w*.55,y,w*.60,y-h*.06,'#ffe2ad',4);
 box(c,x,y,sw,sh,h*.055,'#f4b485','#ffe6b4');box(c,x+sw*.04,y+sh*.08,sw*.78,sh*.82,h*.035,'#142a42','#ffe7b5');
 const sx=x+sw*.055,sy=y+sh*.105,iw=sw*.75,ih=sh*.77;
 c.save();c.beginPath();c.roundRect(sx,sy,iw,ih,h*.025);c.clip();
 const gradient=c.createLinearGradient(sx,sy,sx+iw,sy+ih);gradient.addColorStop(0,'#94f0dc');gradient.addColorStop(1,'#dfb1ff');c.fillStyle=gradient;c.fillRect(sx,sy,iw,ih);
 const count=e.correctCount||0,before=Math.max(0,count-(e.result?.correct?1:0)),roundProgress=Math.min(before,3);
 const reveal=e.result?.correct?Math.min(1,(roundProgress+clamp(age(e)*1.8))/3):roundProgress/3;
 const change=e.reduced?0:Math.sin(e.t*3)*h*.006;
 sprite(c,e,sx+iw*.5,sy+ih*.97+change,ih*.98,e.result?.correct?3:Math.floor(beat(e))%3);
 const cc=6,rr=4,total=cc*rr,open=Math.floor(3+reveal*(total-3));
 for(let i=0;i<total;i++){
  const perm=(i*7)%total;if(perm<open)continue;const xx=sx+i%cc*iw/cc,yy=sy+Math.floor(i/cc)*ih/rr;
  c.fillStyle=['#9fbae3ee','#c5dce6ef','#aabedcec','#cbbee8eb'][(i+Math.floor(e.t*2))%4];c.fillRect(xx,yy,iw/cc+.5,ih/rr+.5);
  if(!e.reduced){c.fillStyle='#ffffff35';c.fillRect(xx,yy+ih/rr*.45,iw/cc,1);}
 }
 c.restore();
 for(let i=0;i<2;i++){ellipse(c,x+sw*.91,y+sh*(.29+i*.31),h*.031,h*.031,'#736a91');ellipse(c,x+sw*.91,y+sh*(.29+i*.31),h*.014,h*.014,'#fff2c6');}
 const now=Math.min(3,e.result?.correct?roundProgress+1:roundProgress);
 for(let i=0;i<3;i++){ellipse(c,w*(.44+i*.065),h*.255,h*.009,h*.009,i<now?'#fff0a1':'#fff3');}
 plaque(c,now>=3?'正体は… ウサギ姿のオオカミ！':`あと ${3-now} 正解で、正体がわかる！`,w*.51,h*.71,w*.48,h*.065,'#f5e7ff');
 if(e.result?.correct)stars(c,e,sx+iw*.5,sy+ih*.5,ih*.6);
 // Keep the mystery character offstage until its identity has been revealed.
 if(now>=3)sprite(c,e,w*.12,h*.70,h*.25,pose(e));
 // Reception meters react to the beat without obstructing the answer targets.
 for(let side=0;side<2;side++)for(let i=0;i<5;i++){const bh=h*(.03+.025*(1+Math.sin((e.reduced?0:e.t*4)+i)));box(c,w*(side?.84:.06)+i*w*.012,h*.72-bh,w*.007,bh,2,['#83e9e5','#ffe19e','#efb2ff'][i%3]);}
}
export function drawB(ctx,e){const render={27:balance,28:chameleon,29:domino,30:tv}[e.game.id];if(!render)return false;ctx.save();render(ctx,e);ctx.restore();return true;}
