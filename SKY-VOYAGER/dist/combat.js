/* Deterministic combat clips. Animation, contact and input buffering share this clock. */
window.SkyCombat=(()=>{
  'use strict';
  const moves={
    slash:{name:'一閃',style:'slash',duration:.46,contact:.2116,cost:11,damage:1,reach:4.1,arc:1.15,lunge:1.1},
    backhand:{name:'返し斬り',style:'backhand',duration:.48,contact:.2064,cost:12,damage:1.12,reach:4.3,arc:1.3,lunge:1.35},
    finisher:{name:'風斬り',style:'finisher',duration:.66,contact:.3498,cost:16,damage:1.55,reach:4.7,arc:1.6,lunge:1.6},
    heavy:{name:'崩し斬り',style:'heavy',duration:.88,contact:.5456,cost:25,damage:2.05,reach:4.8,arc:1.05,lunge:1.9},
    bow:{name:'狙い撃ち',style:'bow',duration:.6,contact:.312,cost:8,damage:1,reach:36,arc:Math.PI,lunge:0}
  };
  function create({canStart=()=>true,onStart=()=>{},onContact=()=>{},onFinish=()=>{}}={}){
    let action=null,buffer=null,chain=0,chainLife=0,serial=0;
    function begin(kind){
      const combo=kind==='light'?(chainLife>0?chain%3+1:1):0;
      const key=kind==='light'?['slash','backhand','finisher'][combo-1]:kind;
      const definition=moves[key];if(!definition||!canStart(definition))return false;
      action={...definition,combo,id:++serial,elapsed:0,contactDone:false};buffer=null;
      chain=combo;chainLife=0;onStart(action);return true;
    }
    function request(kind='light'){
      if(!['light','heavy','bow'].includes(kind))return false;
      if(action){buffer={kind,life:.36};return true;}
      return begin(kind);
    }
    function update(dt){
      dt=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.15));
      chainLife=Math.max(0,chainLife-dt);
      if(buffer){buffer.life-=dt;if(buffer.life<=0)buffer=null;}
      if(!action)return;
      const current=action;current.elapsed=Math.min(current.duration,current.elapsed+dt);
      if(!current.contactDone&&current.elapsed>=current.contact){current.contactDone=true;onContact(current);}
      // Callbacks may cancel on death or an interrupted action.
      if(action!==current)return;
      if(current.elapsed>=current.duration){
        action=null;chainLife=current.combo?.45:0;onFinish(current);
        const next=buffer?.kind;buffer=null;if(next)begin(next);
      }
    }
    function cancel(){action=null;buffer=null;chain=0;chainLife=0;}
    return {request,update,cancel,clearBuffer(){buffer=null;},state:()=>action?{...action,progress:action.elapsed/action.duration}:null,status:()=>({action:action?.style||null,combo:action?.combo||0,progress:action?action.elapsed/action.duration:0,queued:buffer?.kind||null,serial})};
  }
  function defense({source,guarding,guardAge,facingDot,stamina,dodgeTime,invulnerable}){
    if(source&&dodgeTime>0)return'dodge';
    if(invulnerable)return'invulnerable';
    if(source&&guarding&&facingDot>.1){if(stamina<8)return'break';return guardAge<=.18?'parry':'guard';}
    return'hit';
  }
  return{moves,create,defense};
})();
