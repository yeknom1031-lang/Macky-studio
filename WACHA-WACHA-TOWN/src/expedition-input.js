(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Wacha24Input=api;})(globalThis,function(){
 'use strict';
 const pressed=(pad,index)=>{const b=pad.buttons?.[index];return typeof b==='number'?b>.5:!!b?.pressed||Number(b?.value)>.5;};
 function normalize(pad,buttonIndex=0,deadzone=.2){
  if(!pad||pad.connected===false)return null;
  let x=Number(pad.axes?.[0])||0,y=Number(pad.axes?.[1])||0;
  const dx=Number(pressed(pad,15))-Number(pressed(pad,14)),dy=Number(pressed(pad,13))-Number(pressed(pad,12));
  if(dx||dy){x=dx;y=dy;}else if(pad.mapping!=='standard'&&pad.axes?.length>9){const hat=Number(pad.axes[9]);const position=Math.round((hat+1)*3.5);if(Number.isFinite(hat)&&hat>=-1.01&&hat<=1.01&&Math.abs(hat-(-1+position/3.5))<.08){const directions=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];[x,y]=directions[Math.max(0,Math.min(7,position))];}}
  const magnitude=Math.hypot(x,y);if(magnitude<=deadzone)x=y=0;else if(magnitude>1){x/=magnitude;y/=magnitude;}
  const act=pressed(pad,buttonIndex),anyButton=Array.from(pad.buttons||[]).some((_,i)=>pressed(pad,i)),active=!!(x||y||anyButton);
  return {x,y,act,active,connected:true,index:pad.index,id:pad.id||'コントローラー',mapping:pad.mapping||'',axes:pad.axes?.length||0,buttons:pad.buttons?.length||0,strength:Math.hypot(x,y)+(act?2:anyButton?1:0)};
 }
 function choose(pads,previousIndex=-1,buttonIndex=0){const states=Array.from(pads||[]).map(p=>normalize(p,buttonIndex)).filter(Boolean),active=states.filter(p=>p.active).sort((a,b)=>b.strength-a.strength);return {states,input:active[0]||states.find(p=>p.index===previousIndex)||states[0]||{x:0,y:0,act:false,active:false,connected:false,index:-1}};}
 return {normalize,choose};
});
