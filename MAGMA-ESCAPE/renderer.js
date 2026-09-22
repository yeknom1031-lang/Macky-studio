import {W,H,METER,AURAS,clamp,encounterPosition} from './core.js';
import {drawAnimation} from './animation.js';

export class Renderer {
  constructor(canvas,assets,atlas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.assets=assets;this.atlas=atlas;this.effects=[];this.labels=[];this.rings=[];this.shake=0;this.squash=0;this.reduced=false;this.resize();}
  resize(){const d=Math.min(window.devicePixelRatio||1,2);this.canvas.width=W*d;this.canvas.height=H*d;this.scale=d;}
  burst(x,y,color='#ffc56b',count=10){if(this.reduced)return;for(let i=0;i<count;i++)this.effects.push({x,y,vx:(Math.random()-.5)*140,vy:40+Math.random()*110,life:.5+Math.random()*.35,max:.85,color,r:1+Math.random()*2});}
  label(x,y,text,color='#d6ffed'){this.labels.push({x,y,text,color,life:1.15});}
  land(e){this.burst(e.x,e.y,e.perfect?'#a8ffe0':'#c4ded6',e.perfect?14:6);this.squash=.16;if(!this.reduced)this.rings.push({x:e.x,y:e.y,life:.4,color:e.perfect?'#a8ffe0':'#dfd8af'});if(e.perfect)this.label(e.x,e.y+85,'PERFECT +2');if(e.combo>1)this.label(e.x,e.y+110,`${e.combo} COMBO${e.combo%5===0?' +10':''}`,'#ffd899');if(e.impact>450&&!this.reduced)this.shake=.12;}
  sprite(name,index,x,y,w,h,flip=false){const c=this.ctx,img=this.assets[name],s=this.atlas[name]?.[index];if(!img||!s)return;c.save();c.translate(x,y);if(flip)c.scale(-1,1);c.drawImage(img,s.x,s.y,s.w,s.h,-w/2,-h,w,h);c.restore();}
  render(game,save,dt){
    const c=this.ctx,t=game.time,p=game.player;this.reduced=save.reduced;
    c.setTransform(this.scale,0,0,this.scale,0,0);c.fillStyle='#163244';c.fillRect(0,0,W,H);this.shake=Math.max(0,this.shake-dt);if(this.shake>0&&!save.reduced)c.translate(Math.sin(t*150)*this.shake*15,Math.cos(t*130)*this.shake*10);
    const drawWorld=(name,alpha=1)=>{const img=this.assets[name];if(!img)return;const h=W*img.height/img.width;const extra=H-h;const offset=Math.sin(game.camera*.0003)*13;c.globalAlpha=alpha;c.drawImage(img,0,Math.min(0,extra)+offset-20,W,Math.max(h,H)+40);c.globalAlpha=1;};
    drawWorld('world');if(game.height>48)drawWorld('world-mid',clamp((game.height-48)/5,0,1));if(game.height>98)drawWorld('world-sky',clamp((game.height-98)/5,0,1));
    c.fillStyle='rgba(8,21,38,.2)';c.fillRect(0,0,W,H);
    const sy=y=>H-155-(y-game.camera);
    // Physical side walls are readable independently from the decorative background.
    for(const side of [-1,1]){const x=side<0?0:W-10;c.save();c.fillStyle='#142e3de0';c.fillRect(x,0,10,H);c.fillStyle=game.wallSide===side?'#adffe5':'#82b6bc88';c.fillRect(side<0?9:W-10,0,2,H);for(let y=-32+(game.camera*.7)%32;y<H;y+=32){c.strokeStyle='#8bcfc33b';c.beginPath();c.moveTo(x,y+10);c.lineTo(x+10,y);c.stroke();}c.restore();}
    // Distant embers are screen-space, while platforms and effects remain in world-space.
    if(!save.reduced)for(let i=0;i<25;i++){
      const x=((i*71.7+Math.sin(t*.7+i)*15)%W),y=(H-((t*12+i*93)%H));
      c.globalAlpha=.15+((i%5)/5)*.25;c.fillStyle=i%2?'#ffe6aa':'#fb956b';c.beginPath();c.arc(x,y,i%3===0?1.6:.7,0,Math.PI*2);c.fill();
    }c.globalAlpha=1;
    // Quiet altitude ruler gives orientation during a long fall.
    c.font='8px system-ui';c.textAlign='left';
    const start=Math.floor(game.camera/METER/5)*5;
    for(let n=Math.max(0,start);n<start+20;n+=5){const y=sy(n*METER);if(y<140||y>H)continue;c.fillStyle='#c1e1e555';c.fillText(`${n}m`,7,y-5);c.fillRect(0,y,16,1);}
    for(const s of game.platforms){
      const y=sy(s.y);if(y<-60||y>H+60)continue;
      if(s.type==='crumble'&&!s.solid)continue;
      const idx={normal:0,moving:1,blink:2,crumble:3}[s.type];
      c.save();
      if(!s.solid)c.globalAlpha=.16;
      if(s.type==='blink'&&s.solid){const period=s.id>100?2.3:3.5;const phase=(t+s.phase)%period;if(phase>period*.59)c.globalAlpha=.55+Math.sin(t*28)*.35;}
      const sh=s.type==='crumble'&&s.touched>=0?Math.sin(t*90)*1.6:0;
      c.shadowColor='#061621';c.shadowBlur=12;c.shadowOffsetY=5;
      this.sprite('platforms',idx,s.x+sh,y+29,s.w+8,34);c.shadowBlur=0;c.shadowOffsetY=0;
      c.fillStyle=['#e3b270','#92f0e1','#7dddff','#ffad6c'][idx];c.globalAlpha*=.85;
      c.fillRect(s.x-s.w/2+6,y,s.w-12,1.5);
      if(s.type==='moving'){c.font='10px system-ui';c.textAlign='center';c.fillStyle='#b7ffed';c.fillText(s.vertical?'↕':'↔',s.x,y+15);}
      if(s.type==='crumble'&&s.touched>=0){const ratio=clamp(1-(t-s.touched)/(s.id>100?.36:.5),0,1);c.fillStyle='#ff966a';c.fillRect(s.x-s.w/2,y-5,s.w*ratio,2);}
      c.restore();
      if(s.coin){const bob=save.reduced?0:Math.sin(t*3+s.id)*3;this.sprite('items',0,s.x,y-17+bob,19,21);}
      if(s.id===game.nextShop){c.save();c.textAlign='center';c.font='bold 8px system-ui';c.fillStyle='#c7ffdf';c.fillText('SHOP',s.x,y-46);c.restore();}
      else if([10,25,50,100,200].includes(s.id)){c.save();c.textAlign='center';c.font='bold 9px system-ui';c.fillStyle='#ffdc9b';c.fillText(s.id===100?'100m / SUMMIT':`${s.id}m / MILESTONE`,s.x,y-46);c.restore();}
    }
    // Draw encounter actors after all platforms so the next ledge cannot hide their faces or labels.
    for(const s of game.platforms){
      const y=sy(s.y);if(y<-60||y>H+60)continue;
      if(s.encounter&&!s.encounter.used){
        const e=s.encounter,pos=encounterPosition(s,t),ey=sy(pos.y),armed=t>=game.nextEventAllowed;
        c.save();c.globalAlpha=armed?1:.6;c.shadowColor=e.type==='quiz'?'#bca5ff':'#ff9764';c.shadowBlur=14;
        if(e.type==='battle'){drawAnimation(c,this.assets['anim-enemy-idle'],t+s.id*.17,pos.x-30,ey-32,60,60,{fps:4,reduced:save.reduced||matchMedia('(prefers-reduced-motion: reduce)').matches});}
        else{c.fillStyle='#303356';c.strokeStyle='#d8c1ff';c.lineWidth=2;c.beginPath();c.arc(pos.x,ey,14,0,Math.PI*2);c.fill();c.stroke();c.shadowBlur=0;c.fillStyle='#f0e6ff';c.font='bold 19px system-ui';c.textAlign='center';c.fillText('?',pos.x,ey+7);}
        c.shadowBlur=0;c.textAlign='center';c.font='bold 7px system-ui';c.fillStyle=e.type==='quiz'?'#ead7ff':'#ffdab9';c.strokeStyle='#0c1b30';c.lineWidth=3;const label=e.type==='quiz'?'QUIZ +25':'BATTLE +40';c.strokeText(label,pos.x,ey-34);c.fillText(label,pos.x,ey-34);c.restore();
      }
    }
    const py=sy(p.y);
    if(game.wallSliding&&!save.reduced&&Math.random()<dt*35)this.burst(p.x, p.y+14,'#b3ffe9',1);
    const aura=AURAS.find(a=>a.id===save.equipped)||AURAS[0];
    c.save();c.translate(p.x,py-27);
    if(aura.id!=='ember'){
      const glow=c.createRadialGradient(0,0,0,0,0,52);glow.addColorStop(0,aura.color+'30');glow.addColorStop(1,aura.color+'00');c.fillStyle=glow;c.fillRect(-54,-54,108,108);
      c.strokeStyle=aura.color;c.lineWidth=1.2;c.globalAlpha=.5;c.beginPath();c.ellipse(0,17,29,9,Math.sin(t)*.2,0,Math.PI*2);c.stroke();c.globalAlpha=1;
      if(aura.id==='phoenix'){for(const side of [-1,1])for(let j=0;j<5;j++){c.fillStyle=j%2?'#ffe491aa':'#ffb53f99';c.shadowColor='#ffbd5d';c.shadowBlur=12;c.beginPath();c.moveTo(side*8,12);c.quadraticCurveTo(side*(24+j*6),-20-j*4,side*(50+j*4),-40+j*9+Math.sin(t*5)*6);c.quadraticCurveTo(side*36,12+j*2,side*8,22);c.fill();}c.shadowBlur=0;}
      if(aura.id==='ice'){for(let i=0;i<6;i++){const a=t*.6+i*Math.PI/3,x=Math.cos(a)*38,y=Math.sin(a)*29;c.save();c.translate(x,y);c.rotate(a);c.fillStyle='#b6f5ffd0';c.shadowColor='#c5faff';c.shadowBlur=8;c.beginPath();c.moveTo(0,-9);c.lineTo(4,0);c.lineTo(0,9);c.lineTo(-4,0);c.fill();c.restore();}}
      if(aura.id==='violet'){c.strokeStyle='#d2b5ff88';for(let i=0;i<2;i++){c.beginPath();c.ellipse(0,0,42,12,t*.8+i*1.7,0,Math.PI*2);c.stroke();}c.fillStyle='#ecd5ff';for(let i=0;i<3;i++){const a=t+i*2.1,x=Math.cos(a)*42,y=Math.sin(a)*27;c.fillRect(x-3,y-1,6,2);c.fillRect(x-1,y-3,2,6);}}
      if(aura.id==='mint'){for(let i=0;i<3;i++){const a=t*2+i*2.1;c.fillStyle='#a4ffead0';c.shadowColor='#80ffe2';c.shadowBlur=13;c.beginPath();c.ellipse(Math.cos(a)*33,Math.sin(a)*24,5,2.5,a,0,Math.PI*2);c.fill();}c.shadowBlur=0;}
    }
    if(!save.reduced)for(let i=0;i<(aura.id==='ember'?4:10);i++){const a=t*1.5+i*2.4,r=19+i%4*6;c.globalAlpha=.25+Math.sin(t*2+i)**2*.5;c.fillStyle=aura.color;c.fillRect(Math.cos(a)*r,Math.sin(a)*r,2,2);}c.restore();
    if(game.jetting){c.save();c.fillStyle='#96f5ff';c.shadowColor='#a7f7ff';c.shadowBlur=12;for(const side of [-1,1]){c.beginPath();c.moveTo(p.x+side*10-4,py-18);c.lineTo(p.x+side*10+4,py-18);c.lineTo(p.x+side*10,py+16+Math.random()*15);c.fill();}c.restore();}
    let pose=p.ground===null?(p.vy>0?1:3):Math.abs(p.vx)>30?2:0;
    const bob=p.ground!==null&&Math.abs(p.vx)>30&&!save.reduced?Math.sin(t*18)*2:0;
    this.squash=Math.max(0,this.squash-dt);const squash=!save.reduced?Math.sin(this.squash/.16*Math.PI)*.14:0;
    const s=this.atlas.hero?.[pose];const heroH=74*(1-squash),heroW=(s?74*s.w/s.h:52)*(1+squash);
    this.sprite('hero',pose,p.x,py+2+bob,heroW,heroH,p.face<0);
    this.effects=this.effects.filter(e=>e.life>0);
    for(const e of this.effects){if(!game.paused){e.life-=dt;e.x+=e.vx*dt;e.y+=e.vy*dt;e.vy-=220*dt;}c.globalAlpha=clamp(e.life/e.max,0,1);c.fillStyle=e.color;c.beginPath();c.arc(e.x,sy(e.y),e.r,0,Math.PI*2);c.fill();}c.globalAlpha=1;
    this.rings=this.rings.filter(r=>r.life>0);for(const r of this.rings){if(!game.paused)r.life-=dt;const ratio=1-r.life/.4;c.globalAlpha=clamp(1-ratio,0,1);c.strokeStyle=r.color;c.lineWidth=2;c.beginPath();c.ellipse(r.x,sy(r.y)+2,10+ratio*37,3+ratio*9,0,0,Math.PI*2);c.stroke();}c.globalAlpha=1;
    this.labels=this.labels.filter(l=>l.life>0);for(const l of this.labels){if(!game.paused){l.life-=dt;l.y+=dt*24;}c.globalAlpha=clamp(l.life*2,0,1);c.font=`bold ${l.text.includes('COMBO')?13:10}px system-ui`;c.textAlign='center';c.lineWidth=3;c.strokeStyle='#10242ccf';c.strokeText(l.text,clamp(l.x,65,W-65),sy(l.y));c.fillStyle=l.color;c.fillText(l.text,clamp(l.x,65,W-65),sy(l.y));}c.globalAlpha=1;
    // Animated molten surface: three independent layers and a warm bloom.
    const ly=sy(game.lava);
    if(ly<H+100){
      const bloom=c.createLinearGradient(0,ly-90,0,ly+70);bloom.addColorStop(0,'#ff8b2600');bloom.addColorStop(.65,'#ff762e3a');bloom.addColorStop(1,'#ff762e66');c.fillStyle=bloom;c.fillRect(0,ly-90,W,H-ly+100);
      for(let layer=0;layer<3;layer++){
        const y=ly+layer*8;c.beginPath();c.moveTo(0,H+30);c.lineTo(0,y);
        for(let x=0;x<=W+8;x+=8)c.lineTo(x,y+Math.sin(x*.035+t*(1.7+layer*.3)+layer)*5+Math.sin(x*.081-t)*2);
        c.lineTo(W,H+30);c.closePath();const g=c.createLinearGradient(0,y,0,H+30);g.addColorStop(0,['#ffd074','#ff983d','#f85c28'][layer]);g.addColorStop(1,'#8e2426');c.fillStyle=g;c.fill();
      }
      if(!save.reduced){c.strokeStyle='#ffcb6477';c.lineWidth=1.5;for(let i=0;i<9;i++){const x=(i*67+t*7)%W,y=ly+26+(i*37)%(Math.max(30,H-ly));c.beginPath();c.ellipse(x,y,17+i%3*8,3,Math.sin(t+i)*.3,0,Math.PI*2);c.stroke();}}
    }
    if(game.hunger<20){c.fillStyle='#df693022';c.fillRect(0,0,W,H);}
    if(game.pressure.phase==='surge'||game.pressure.phase==='warning'){const g=c.createLinearGradient(0,H-210,0,H);g.addColorStop(0,'#ff572000');g.addColorStop(1,game.pressure.phase==='surge'?'#ff602e44':'#ffb32a22');c.fillStyle=g;c.fillRect(0,H-210,W,210);}
  }
}
