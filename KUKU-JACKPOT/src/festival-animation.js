// Image generation supplies the actual poses. This player only selects frames
// and composites them against the shared audio clock.
const ROOT='./assets/runtime/rich/';
const actionFor={celebrate:'win',recover:'recover',talk:'talk',act:'act',hold:'hold',anticipate:'anticipate',idle:'idle',exit:'exit'};
export function animationFrame(clip,time,{start=0,beatDuration=.428571,framesPerBeat=3,loop=true,reduceMotion=false}={}){
 const frames=clip.usableFrames||Array.from({length:clip.frames||1},(_,i)=>i);
 if(reduceMotion)return frames[0];
 const frame=Math.floor(Math.max(0,time-start)/Math.max(.04,beatDuration/framesPerBeat));
 return frames[loop?frame%frames.length:Math.min(frames.length-1,frame)];
}
export function sourceCell(clip,frame){
 const columns=clip.columns||1,rows=clip.rows||1,width=clip.width/columns,height=clip.height/rows;
 return {x:(frame%columns)*width,y:Math.floor(frame/columns)*height,width,height};
}
export class FestivalAnimation{
 constructor(){this.clips=[];this.lookup=new Map();this.images=new Map();this.pending=new Map();this.failedUntil=new Map();this.stage='';this.variant=0;this.context={time:0,beat:0};this.actorStates=new Map();this.pinned=new Set();this.limit=54;this.stats={drawnFrames:0,frameIndices:new Set()};}
 async load(){
  const response=await fetch(ROOT+'manifest.json');
  if(!response.ok)throw Error('アニメーションの一覧を読み込めませんでした');
  this.clips=(await response.json()).clips||[];
  this.lookup.clear();
 }
 find(kind,{stage=this.stage,character,action,variant=this.variant,theme,digit}={}){
  const key=[kind,stage,character,action,variant,theme,digit].join('|');
  if(this.lookup.has(key))return this.lookup.get(key);
  const matching=this.clips.filter(c=>c.kind===kind&&(!character||c.character===character)&&(!action||c.action===action)&&(!theme||c.theme===theme)&&(digit===undefined||c.digit===digit));
  const exact=matching.filter(c=>c.stage===stage);
  const pool=exact.length?exact:matching.filter(c=>!c.stage||kind==='character');
  // Prefer a complete performance over a variant reduced to a still or two poses.
  const animated=pool.filter(c=>(c.frames||1)<3||(c.usableFrames?.length??c.frames)>=3);
  const candidates=animated.length?animated:pool;
  const clip=candidates.find(c=>c.variant===variant)||candidates.find(c=>c.variant===0)||candidates[0];
  this.lookup.set(key,clip);return clip;
 }
 setStage(stage,variant=0){if(this.stage!==stage||this.variant!==variant){this.stage=stage;this.variant=variant;this.actorStates.clear();this.pinned.clear();}}
 setContext(context){this.context=context;}
 async image(clip){
  if(!clip)return;
  if(this.images.has(clip.file))return this.images.get(clip.file);
  if(this.pending.has(clip.file))return this.pending.get(clip.file);
  if((this.failedUntil.get(clip.file)||0)>Date.now())throw Error('アニメーションの読み込みを待っています');
  const task=new Promise((resolve,reject)=>{
   const img=new Image();const timer=setTimeout(()=>{img.onload=null;img.onerror=null;reject(Error('アニメーションの読み込みが遅れています'));},15000);
   img.onload=()=>{clearTimeout(timer);this.images.set(clip.file,img);this.prune();resolve(img);};
   img.onerror=()=>{clearTimeout(timer);reject(Error('アニメーションを読み込めませんでした'));};img.src=ROOT+clip.file;
  }).catch(error=>{this.failedUntil.set(clip.file,Date.now()+15000);throw error;}).finally(()=>this.pending.delete(clip.file));
  this.pending.set(clip.file,task);return task;
 }
 prune(){while(this.images.size>this.limit){const oldest=[...this.images.keys()].find(file=>!this.pinned.has(file));if(!oldest)break;this.images.delete(oldest);}}
 get(clip){const image=clip&&this.images.get(clip.file);if(image){this.images.delete(clip.file);this.images.set(clip.file,image);}return image;}
 async prepare(stage,variant=0,characters=[]){
  const selected=[];const add=c=>{if(c&&!selected.some(s=>s.file===c.file))selected.push(c);};
  for(const action of ['idle','talk','anticipate','act','hold','win','recover','exit'])add(this.find('character',{stage,variant:variant%3,action,character:characters[0]}));
  for(const character of characters.slice(1))for(const action of ['talk','act','win'])add(this.find('character',{stage,character,action,variant:variant%3}));
  for(const kind of ['background','prop','duet','result'])add(this.find(kind,{stage,variant:variant%4}));
  for(const action of ['beat','success','charge','surprise'])add(this.find('effect',{stage,action}));
  add(this.find('party',{stage,variant:variant%10}));add(this.find('reward',{stage,variant:variant%10}));
  const theme=stage==='forest'?'wood':['rocket','frog','magic','aliens','fishing','octopus'].includes(stage)?'jelly':'gold';
  for(let digit=0;digit<10;digit++)add(this.find('digit',{theme,digit}));
  if(stage===this.stage&&variant===this.variant)this.pinned=new Set(selected.map(c=>c.file));
  // Optional decorative art must not stop an otherwise playable downloaded stage.
  await Promise.allSettled(selected.map(clip=>this.image(clip)));
 }
 drawCell(ctx,clip,frame,x,y,width,height=width){
  const image=this.get(clip);if(!image)return false;
  if(clip.usableFrames&&!clip.usableFrames.includes(frame))frame=clip.usableFrames.reduce((best,n)=>Math.abs(n-frame)<Math.abs(best-frame)?n:best);
  const cell=sourceCell(clip,frame);ctx.drawImage(image,cell.x,cell.y,cell.width,cell.height,x,y,width,height);
  this.stats.drawnFrames++;this.stats.frameIndices.add(`${clip.id}:${frame}`);return true;
 }
 drawCharacter(ctx,character,x,y,size,state,time,reduceMotion){
  let action=actionFor[state]||'idle';
  if(this.context.holding&&state!=='celebrate'&&state!=='recover')action='hold';
  else if(this.context.anticipating&&state==='idle')action='anticipate';
  let clip=this.find('character',{character,action,variant:this.variant%3});
  if(!this.get(clip))clip=this.find('character',{character,action:'talk',variant:this.variant%3});
  if(!this.get(clip))return false;
  const key=character;const pulse=this.context.pulseIndex??-1;
  let actor=this.actorStates.get(key);
  if(!actor||actor.action!==action||(['act','recover'].includes(action)&&actor.pulse!==pulse)||time<actor.start){actor={action,pulse,start:time};this.actorStates.set(key,actor);}
  const frame=animationFrame(clip,time,{start:actor.start,beatDuration:this.context.beatDuration,framesPerBeat:['act','recover'].includes(action)?6:3,reduceMotion,loop:!['anticipate','recover'].includes(action)});
  // All frames share the source cell's scale. Crouching remains a crouch.
  return this.drawCell(ctx,clip,frame,x-size*.61,y-size*1.07,size*1.22,size*1.22);
 }
 drawBackdrop(ctx,time,reduceMotion){
  const clip=this.find('background',{variant:this.variant%4});const image=this.get(clip);if(!image||clip.stage!==this.stage)return false;
  const scale=Math.max(1000/image.width,440/image.height)*1.025,w=image.width*scale,h=image.height*scale;
  const drift=reduceMotion?0:Math.sin(time*.32)*5;
  ctx.drawImage(image,(1000-w)/2+drift,(440-h)/2,w,h);return true;
 }
 drawProp(ctx,x,y,size,time,{frame,start=0,loop=true,reduceMotion=false}={}){
  const clip=this.find('prop');if(!clip||clip.stage!==this.stage)return false;
  return this.drawCell(ctx,clip,frame??animationFrame(clip,time,{start,loop,reduceMotion,beatDuration:this.context.beatDuration}),x,y,size);
 }
 hasProp(){return !!this.get(this.find('prop'));}
 digit(theme,digit){return this.find('digit',{theme,digit:Number(digit)});}
 drawDigit(ctx,digit,theme,x,y,height,reduceMotion=false){
  const clip=this.digit(theme,digit);if(!this.get(clip))return false;
  const age=this.context.time-(this.context.pulseTime??-100);
  const frame=age>=0&&age<.75?animationFrame(clip,age,{loop:false,reduceMotion,beatDuration:this.context.beatDuration}):(clip.posterFrame??clip.usableFrames?.[0]??0);
  return this.drawCell(ctx,clip,frame,x-height*.12,y-height*.66,height*1.32);
 }
 drawEffect(ctx,action,x,y,size,time,{start=0,reduceMotion=false,loop=false,alpha=1}={}){
  if(reduceMotion)return false;
  const clip=this.find('effect',{action})||this.find('effect',{action:'success'});if(!clip||clip.stage!==this.stage)return false;
  const frame=animationFrame(clip,time,{start,beatDuration:this.context.beatDuration,loop});
  ctx.save();ctx.globalAlpha*=alpha;const drawn=this.drawCell(ctx,clip,frame,x-size/2,y-size/2,size);ctx.restore();return drawn;
 }
 drawShared(ctx,kind,x,y,size,time,{start=0,reduceMotion=false,loop=false}={}){
  const clip=this.find(kind,{variant:this.variant%10});if(!clip)return false;
  return this.drawCell(ctx,clip,animationFrame(clip,time,{start,reduceMotion,loop,beatDuration:this.context.beatDuration}),x-size/2,y-size/2,size);
 }
 diagnostics(){return {stage:this.stage,availableSheets:this.clips.length,loadedSheets:this.images.size,decodedMegabytes:[...this.images.values()].reduce((n,i)=>n+i.width*i.height*4,0)/1048576,drawnFrames:this.stats.drawnFrames,uniqueFrames:this.stats.frameIndices.size};}
}
