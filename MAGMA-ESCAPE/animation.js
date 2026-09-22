// Generated 2×2 sheets share one clock with gameplay, never independent timers.
export const ANIMATION_NAMES=['enemy-idle','enemy-attack','enemy-hit','capsule',...['ember','mint','violet','ice','phoenix'].map(id=>'aura-'+id)].map(id=>'anim-'+id);
export function animationFrame(time,{fps=5,loop=true,reduced=false}={}){
  if(reduced)return 0;
  const frame=Math.floor(Math.max(0,Number.isFinite(time)?time:0)*fps);
  return loop?frame%4:Math.min(3,frame);
}
export function drawAnimation(ctx,image,time,x,y,width,height,options={}){
  if(!image?.width||!image?.height)return false;
  const frame=animationFrame(time,options),w=image.width/2,h=image.height/2;
  ctx.drawImage(image,(frame%2)*w,Math.floor(frame/2)*h,w,h,x,y,width,height);
  return true;
}
export function animatedArt(name,label,className='',size=480){
  return `<canvas class="${className}" data-animation="${name}" width="${size}" height="${size}" role="img" aria-label="${label}"></canvas>`;
}
export function paintArt(canvas,assets,time,options={}){
  if(!canvas)return;
  const name=canvas.dataset.animation,frame=animationFrame(time,options),key=name+':'+frame;
  if(canvas.dataset.frame===key)return;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
  if(drawAnimation(ctx,assets['anim-'+name],time,0,0,canvas.width,canvas.height,options))canvas.dataset.frame=key;
}
