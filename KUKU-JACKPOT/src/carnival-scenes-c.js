/** Four scenes with exact groups and distinct one-tap outcomes. Numbers are code-rendered. */
const assets=slug=>({background:`./assets/runtime/carnival/${slug}/background.webp`,cast:`./assets/runtime/carnival/${slug}/cast.webp`});
export const GAMES_C=[
 {id:31,slug:'paint',title:'九九ペンキ・ころころローラー',subtitle:'ひと塗りで、街をカラフルに！',instruction:'ぬるマスの数をえらぼう！',action:'ぬる',accent:'#ffb95e',assets:{...assets('paint'),mural:'./assets/runtime/carnival/paint/mural.webp'}},
 {id:32,slug:'treasure',title:'九九お宝・金貨を見抜け！',subtitle:'袋の中には、何枚あるかな？',instruction:'金貨のぜんぶの数をえらぼう！',action:'ひらく',accent:'#ffdc70',assets:assets('treasure')},
 {id:33,slug:'copier',title:'九九コピーマシン',subtitle:'同じ数ずつ、ぽこぽこ登場！',instruction:'コピーした後の数をえらぼう！',action:'コピー',accent:'#7ae7e4',assets:assets('copier')},
 {id:34,slug:'keychain',title:'九九連鎖・答えが次のカギ',subtitle:'答えをつないで、秘密の部屋へ！',instruction:'式に合うカギを1つえらぼう！',action:'ひらく',accent:'#bfabff',inverse:true,assets:assets('keychain')}
];
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
function box(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
function text(c,s,x,y,size,color='#253958'){c.font=`900 ${size}px "Kuku Maru",sans-serif`;c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.fillText(String(s),x,y);}
function pill(c,s,x,y,w,h,color='#fff9e7'){box(c,x-w/2,y-h/2,w,h,h/2,color,'#ffffffb0');text(c,s,x,y,h*.43);}
function easing(t){return 1-Math.pow(1-clamp(t),3);}
function coin(c,x,y,r,scale=1){c.save();c.translate(x,y);c.scale(scale,1);c.fillStyle='#e5a524';c.beginPath();c.ellipse(0,r*.15,r,r,0,0,Math.PI*2);c.fill();c.fillStyle='#ffe581';c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();c.strokeStyle='#c18a1c';c.lineWidth=Math.max(1,r*.12);c.stroke();text(c,'✦',0,0,r*1.35,'#b97b14');c.restore();}
function sparkle(c,e,x,y,color='#fff5a6'){if(e.reduced)return;const age=e.resultAge||0;for(let n=0;n<18;n++){const a=n*2.399,d=15+age*80,s=1-clamp(age/2.5);c.save();c.globalAlpha=s;text(c,'✦',x+Math.cos(a)*d,y+Math.sin(a)*d*.5,e.h*(.016+(n%3)*.006),color);c.restore();}}
function cast(c,e,x,y,size){const im=e.images?.cast;if(!im)return;const f=e.reduced?0:e.result?.correct?2+(Math.floor((e.resultAge||0)*5)%2):Math.floor(e.beat||0)%2;const fw=im.width/4,dw=size*fw/im.height;c.save();c.translate(x,y+(e.reduced?0:Math.sin(e.t*5)*e.h*.004));c.drawImage(im,fw*f,0,fw,im.height,-dw/2,-size,dw,size);c.restore();}
function animal(c,x,y,r,kind=0){c.save();c.translate(x,y);c.fillStyle=['#ffdfaf','#bfdeff','#d4c0ff'][kind%3];c.beginPath();c.ellipse(-r*.54,-r*.66,r*.28,r*.47,-.3,0,7);c.ellipse(r*.54,-r*.66,r*.28,r*.47,.3,0,7);c.fill();c.beginPath();c.arc(0,0,r,0,7);c.fill();c.fillStyle='#29394c';for(const k of [-1,1]){c.beginPath();c.arc(k*r*.34,-r*.08,r*.09,0,7);c.fill();}c.strokeStyle='#784f51';c.lineWidth=Math.max(1,r*.08);c.beginPath();c.arc(0,r*.15,r*.21,0,Math.PI);c.stroke();c.restore();}
function shadow(c,x,y,rx,ry){c.fillStyle='#18313c20';c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function paint(c,e){
 const {w,h,q}=e,ok=e.result?.correct,p=e.result?(e.reduced?1:easing(e.resultAge/1.4)):0;
 const gw=w*.43,gh=h*.28,x=w*.295,y=h*.36,cw=gw/q.a,ch=gh/q.b;
 cast(c,e,w*.15,h*.69,h*.39);pill(c,`${q.a}マス × ${q.b}列`,w*.51,h*.31,w*.32,h*.044);
 box(c,x-8,y-8,gw+16,gh+16,10,'#fff7df','#d1ab79');
 const colors=['#ff846e','#ffcd64','#66cfb4','#80c8ef','#b4a2f3'];
 for(let row=0;row<q.b;row++)for(let col=0;col<q.a;col++){
  const painted=ok&&(col+.5)/q.a<=p;
  box(c,x+col*cw+1.5,y+row*ch+1.5,cw-3,ch-3,Math.min(5,cw*.1),painted?colors[(row+Math.floor(e.correctCount/2))%colors.length]:'#fffdf6','#b7a68d55');
  if(painted&&e.images?.mural){const im=e.images.mural;c.drawImage(im,col*im.width/q.a,row*im.height/q.b,im.width/q.a,im.height/q.b,x+col*cw+2,y+row*ch+2,cw-4,ch-4);}
  if(painted&&cw>20&&ch>15){c.fillStyle='#fff7';c.beginPath();c.arc(x+(col+.5)*cw,y+(row+.48)*ch,Math.min(cw,ch)*.12,0,7);c.fill();}
 }
 if(e.images?.mural){
  const im=e.images.mural,px=w*.795,py=h*.35,pw=w*.16,ph=h*.27,target=Math.max(1,Math.min(6,q.stageTotal||6)),done=Math.min(target,e.correctCount||0),tiles=Math.floor(done/target*6);
  box(c,px-5,py-5,pw+10,ph+10,9,'#fff7df','#d1ab79');
  c.save();c.globalAlpha=.12;c.drawImage(im,px,py,pw,ph);c.restore();
  for(let n=0;n<tiles;n++){const col=n%2,row=Math.floor(n/2);c.drawImage(im,col*im.width/2,row*im.height/3,im.width/2,im.height/3,px+col*pw/2,py+row*ph/3,pw/2,ph/3);}
  text(c,done===target?'町の絵、完成！':`町の絵 ${done} / ${target}`,px+pw/2,py+ph+h*.035,Math.max(10,h*.027),'#67472d');
 }
 const rx=x+(ok?p:0)*gw,ry=y+gh/2;
 c.strokeStyle='#4b6071';c.lineWidth=h*.018;c.beginPath();c.moveTo(rx,ry);c.lineTo(rx+h*.04,ry);c.lineTo(rx+h*.04,ry+gh*.56);c.stroke();
 box(c,rx-h*.025,y-3,h*.05,gh+6,h*.02,ok?'#ffb759':'#71d7c6','#ffffff');
 if(e.result&&!ok){pill(c,`${q.a} × ${q.b} = ${q.a*q.b}`,w*.51,h*.68,w*.28,h*.055,'#fff0c4');}
 else pill(c,ok?`${q.a*q.b}マス、ぬれた！`:'ぜんぶで何マス？',w*.51,h*.69,w*.32,h*.05);
 if(ok&&p>.8)sparkle(c,e,x+gw,y,'#fff3a1');
}
function treasure(c,e){
 const {w,h,q}=e,ok=e.result?.correct,p=ok?(e.reduced?1:easing(e.resultAge/1.2)):0;
 cast(c,e,w*.86,h*.69,h*.38);pill(c,`1袋 ${q.a}枚 × ${q.b}袋`,w*.49,h*.31,w*.36,h*.045);
 const cols=Math.min(q.b,5),rows=Math.ceil(q.b/cols),areaW=w*.56,cellW=areaW/cols,cellH=h*.26/rows,s=Math.min(cellW*.33,cellH*.37),left=w*.20;
 for(let n=0;n<q.b;n++){
  const cx=left+(n%cols+.5)*cellW,cy=h*.38+(Math.floor(n/cols)+.5)*cellH;
  shadow(c,cx,cy+s*.55,s*.8,s*.22);
  c.fillStyle='#ba7241';c.beginPath();c.moveTo(cx-s*.55,cy-s*.7);c.bezierCurveTo(cx-s*1.1,cy-s*.1,cx-s,cy+s*.55,cx,cy+s*.6);c.bezierCurveTo(cx+s,cy+s*.55,cx+s*1.1,cy-s*.1,cx+s*.55,cy-s*.7);c.closePath();c.fill();
  c.strokeStyle='#f6d5a0';c.lineWidth=3;c.beginPath();c.moveTo(cx-s*.55,cy-s*.65);c.lineTo(cx+s*.55,cy-s*.65);c.stroke();
  if(ok){for(let k=0;k<q.a;k++){const col=k%3,row=Math.floor(k/3),r=s*.18;coin(c,cx+(col-1)*s*.43,cy-s*.45+row*s*.42-s*.17*Math.sin(p*Math.PI),r,e.reduced?1:.7+.3*Math.abs(Math.cos(e.t*3+k)));}}
  else text(c,q.a,cx,cy,s*.75,'#fff1cb');
 }
 if(e.result){pill(c,`${q.a}枚ずつ ${q.b}袋 = ${q.a*q.b}枚`,w*.49,h*.69,w*.45,h*.052,ok?'#fff0a6':'#fff2da');if(ok)sparkle(c,e,w*.48,h*.45);}
 else pill(c,'袋の中の金貨、ぜんぶで何枚？',w*.49,h*.69,w*.48,h*.052);
}
function copier(c,e){
 const {w,h,q}=e,ok=e.result?.correct,p=ok?(e.reduced?1:clamp(e.resultAge/1.6)):0;
 cast(c,e,w*.86,h*.7,h*.36);
 const mx=w*.13,my=h*.41,mw=w*.18,mh=h*.20;
 shadow(c,mx+mw*.5,my+mh,mw*.55,h*.02);box(c,mx,my,mw,mh,18,'#5cbcbf','#efffff');box(c,mx+mw*.07,my-mh*.22,mw*.86,mh*.36,12,'#c7f3f0','#6aa7b0');box(c,mx+mw*.12,my+mh*.35,mw*.76,mh*.16,6,'#263b57');
 const pulse=e.reduced?0:Math.sin(e.t*8);for(let j=0;j<3;j++){c.fillStyle=ok?['#a0ffb2','#fff08e','#a0ffb2'][j]:'#badcd9';c.beginPath();c.arc(mx+mw*(.27+j*.23),my+mh*.73,h*.012+Math.max(0,pulse)*h*.002,0,7);c.fill();}
 pill(c,`${q.a}匹を ${q.b}組`,w*.5,h*.31,w*.32,h*.05);
 const ax=w*.35,ay=h*.36,aw=w*.39,ah=h*.28,cols=Math.min(3,q.b),rows=Math.ceil(q.b/cols),cw=aw/cols,ch=ah/rows;
 for(let group=0;group<q.b;group++){
  const gx=ax+(group%cols)*cw,gy=ay+Math.floor(group/cols)*ch;
  box(c,gx+2,gy+2,cw-5,ch-5,8,'#e8ffffc9','#80d1d3');
  const visible=!e.result?group===0:ok?group/q.b<=p:true;
  if(visible){const ac=Math.min(3,q.a),ar=Math.ceil(q.a/ac),radius=Math.min((cw-12)/ac,(ch-12)/ar)*.30;for(let k=0;k<q.a;k++){const x=gx+cw*.5+(k%ac-(ac-1)/2)*radius*2.5,y=gy+ch*.5+(Math.floor(k/ac)-(ar-1)/2)*radius*2.2;animal(c,x,y+(ok&&!e.reduced?Math.sin(e.t*7+group)*radius*.12:0),radius,(group+e.roundIndex)%3);}}
  else text(c,'?',gx+cw*.5,gy+ch*.5,Math.min(cw,ch)*.4,'#479598');
 }
 pill(c,e.result?`${q.a}匹ずつ ${q.b}組 = ${q.a*q.b}匹`:'同じ数ずつコピーするよ',w*.5,h*.69,w*.45,h*.05);
 if(ok&&p>.85)sparkle(c,e,w*.66,h*.46,'#c6fff9');
}
function keychain(c,e){
 const {w,h,q}=e,ok=e.result?.correct,p=ok?(e.reduced?1:easing(e.resultAge/1.5)):0,product=q.a*q.b;
 cast(c,e,w*.15,h*.71,h*.4);
 const dx=w*.43,dy=h*.37,dw=w*.20,dh=h*.29;
 c.save();c.shadowColor='#bf9bff';c.shadowBlur=ok?25:8;box(c,dx-8,dy-8,dw+16,dh+16,Math.min(dw*.4,dh*.3),'#ab80bc','#f7d896');c.restore();
 box(c,dx,dy,dw,dh,dw*.3,'#292342');
 c.save();c.beginPath();c.roundRect(dx,dy,dw,dh,dw*.3);c.clip();const glow=c.createRadialGradient(dx+dw/2,dy+dh/2,2,dx+dw/2,dy+dh/2,dh);glow.addColorStop(0,'#fff7ca');glow.addColorStop(1,'#9275eb');c.fillStyle=glow;c.fillRect(dx,dy,dw,dh);
 for(let i=0;i<7;i++)text(c,'✦',dx+dw*(.1+(i*.17)%1),dy+dh*(.15+(i*.23)% .8),h*.025,'#fffbd2');
 const width=dw*(1-p);box(c,dx,dy,width,dh,Math.min(width*.3,dh*.3),'#664f96','#d7b0e8');
 if(p<.85){text(c,e.result?product:q.inverse?product:'？',dx+width*.5,dy+dh*.44,h*.065,'#fff1c2');c.fillStyle='#ffd66e';c.beginPath();c.arc(dx+width*.76,dy+dh*.65,h*.012,0,7);c.fill();}c.restore();
 const kx=w*.75,ky=h*.48,kr=h*.048;c.save();c.translate(kx-(ok?p*w*.15:0),ky);c.rotate(e.reduced?0:ok?-p*.4:Math.sin(e.t*2)*.03);c.strokeStyle=ok?'#fff3a1':'#ffdb8d';c.lineWidth=h*.019;c.beginPath();c.arc(0,0,kr,0,7);c.moveTo(kr,0);c.lineTo(kr+h*.08,0);c.lineTo(kr+h*.08,h*.023);c.moveTo(kr+h*.05,0);c.lineTo(kr+h*.05,h*.023);c.stroke();c.restore();
 pill(c,q.inverse?`${product}をつくる、かける数は？`:'答えが、つぎのカギになる！',w*.53,h*.31,w*.44,h*.047);
 const steps=Math.max(1,Math.min(6,q.stageTotal||6)),gap=w*.325/Math.max(1,steps-1);for(let n=0;n<steps;n++){const px=w*.35+n*gap;box(c,px-w*.018,h*.68,w*.036,h*.035,5,n<(e.correctCount||0)?'#ffda91':'#9580b655');if(n<steps-1){c.strokeStyle='#d8bfa580';c.lineWidth=2;c.beginPath();c.moveTo(px+w*.022,h*.697);c.lineTo(px+gap-w*.022,h*.697);c.stroke();}}
 if(e.result&&!ok)pill(c,q.inverse?`${q.a} × ${q.b} = ${product}`:`カギは ${product}`,w*.53,h*.6,w*.27,h*.045,'#fff0d3');
 if(ok)sparkle(c,e,dx+dw*.5,dy+dh*.3,'#fff2bb');
}
export function drawC(ctx,e){ctx.save();try{({31:paint,32:treasure,33:copier,34:keychain}[e.game.id])?.(ctx,e);}finally{ctx.restore();}}
