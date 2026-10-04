import {animationFrame} from './festival-animation.js';

// Home greetings and the encore use a quiet visual clock; gameplay uses audio time.
export class FestivalDecorations{
 constructor(art){this.art=art;this.mode='';this.frame=0;this.phase=-1;this.requested=new Set();this.last=0;}
 show(mode,game){
  cancelAnimationFrame(this.frame);this.mode=mode;this.game=game;this.phase=-1;this.started=performance.now()/1000;
  if(!['home','results'].includes(mode))return;
  const parent=document.querySelector(mode==='home'?'.hero-world':'.result-celebration');
  if(!parent)return;
  let canvas=parent.querySelector('canvas');
  if(!canvas){canvas=document.createElement('canvas');canvas.width=mode==='home'?660:1000;canvas.height=mode==='home'?440:600;canvas.className='festival-encore';canvas.setAttribute('aria-hidden','true');parent.append(canvas);}
  this.parent=parent;this.canvas=canvas;this.ctx=canvas.getContext('2d');
  this.tick();
 }
 request(clips){for(const clip of clips.filter(Boolean)){
  if(this.art.animation.get(clip)||this.requested.has(clip.file))continue;
  this.requested.add(clip.file);this.art.animation.image(clip).catch(()=>{}).finally(()=>this.requested.delete(clip.file));
 }}
 tick=()=>{
  const now=performance.now()/1000;
  if(!document.hidden&&now-this.last>1/15){this.draw(now-this.started);this.last=now;}
  this.frame=requestAnimationFrame(this.tick);
 };
 draw(time){
  const a=this.art.animation,ctx=this.ctx,reduced=this.art.reduceMotion;let drawn=false;
  ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
  if(this.mode==='home'){
   const cast=['wolf','bird','rabbit','cat','robot','frog','bear','fox','dog','gorilla','raccoon','alien','otter','octopus','dragon'];
   const page=reduced?0:Math.floor(time/12)%5;
   const clips=cast.slice(page*3,page*3+3).map(character=>a.find('greeting',{character}));
   this.request(clips);
   clips.forEach((clip,i)=>{
    if(!clip)return;
    drawn=a.drawCell(ctx,clip,animationFrame(clip,time,{beatDuration:.7,framesPerBeat:2,reduceMotion:reduced}),i*195+7,i===1?51:98,i===1?268:226)||drawn;
   });
  }else{
   const stage=this.game?.slug||'jackpot',variant=Math.floor(time/5)%10;
   const backdrop=a.find('result',{stage}),duet=a.find('duet',{stage}),reward=a.find('reward',{variant});
   this.request([backdrop,duet,reward]);
   const background=a.get(backdrop);
   if(background){const scale=Math.max(1000/background.width,600/background.height),w=background.width*scale,h=background.height*scale;ctx.fillStyle='#fff5db';ctx.fillRect(0,0,1000,600);ctx.drawImage(background,(1000-w)/2,(600-h)/2,w,h);drawn=true;}
   if(duet)drawn=a.drawCell(ctx,duet,animationFrame(duet,time,{beatDuration:.6,reduceMotion:reduced}),654,309,260)||drawn;
   if(reward&&!reduced){const frame=animationFrame(reward,time%5,{beatDuration:.7,loop:false});a.drawCell(ctx,reward,frame,24,25,210);a.drawCell(ctx,reward,frame,765,22,210);}
  }
  this.parent.classList.toggle('has-rich-encore',drawn);
 }
}
