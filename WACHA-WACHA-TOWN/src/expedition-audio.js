/* Offline soundtrack. Source credits and licenses: audio/CREDITS.html. */
window.Wacha24Sound = (() => {
  'use strict';
  const base = new URL('audio/', document.currentScript?.src || location.href);
  const key = 'wacha-24-audio';
  let settings = {muted: false, volume: .55};
  try {const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved){settings.muted=!!saved.muted;if(Number.isFinite(saved.volume))settings.volume=Math.max(0,Math.min(1,saved.volume));}}catch{}
  // [music, environmental beds, occasional environmental cue, crowd level]
  const profiles = [
    ['town',   ['birds'],       null,      .40], // 01 festival
    ['garden', ['birds','wind'],null,      .25], // 02 garden
    ['water',  ['waves','birds'],null,     .38], // 03 seaside market
    ['market', [],             null,      .42], // 04 sweets
    ['market', ['birds'],      null,      .28], // 05 autumn book market
    ['snow',   ['wind'],       null,      .30], // 06 winter market
    ['magic',  ['wind'],       null,      .40], // 07 lantern festival
    ['magic',  ['waves','birds'],null,     .26], // 08 hot spring lanes
    ['city',   ['train'],      'whistle', .44], // 09 station
    ['water',  ['waves'],      'whistle', .33], // 10 canal
    ['garden', ['birds','wind'],null,      .28], // 11 farm
    ['town',   ['machine'],    null,      .48], // 12 amusement park
    ['garden', ['birds'],      null,      .34], // 13 zoo
    ['city',   ['machine'],    null,      .31], // 14 studio
    ['water',  ['wind','machine'],'whistle',.29],// 15 airship port
    ['market', [],             null,      .19], // 16 museum
    ['city',   ['clockwork','machine'],null,.31],// 17 workshop
    ['market', ['wind'],       null,      .40], // 18 bazaar
    ['snow',   ['wind'],       null,      .26], // 19 mountain
    ['water',  ['waves','machine'],null,   .22], // 20 marine research
    ['magic',  ['wind','birds'],null,      .20], // 21 clouds
    ['magic',  ['clockwork'],  null,      .26], // 22 magic academy
    ['city',   ['train'],      null,      .44], // 23 metropolis
    ['town',   ['birds','waves'],null,     .50], // 24 grand festival
  ];
  const environmentalVolume = {birds:.30,waves:.34,wind:.22,machine:.17,train:.24,clockwork:.23};
  const effectVolume = {countdown:.55,start:.55,wrong:.46,photographer:.5,found:.65,lost:.6,shutter:.8,develop:.52,click:.5,whistle:.22};
  let unlocked=false, unlockPromise=null, stage=null, paused=false, generation=0, active=[], effects=[], cueTimer=null;
  const errors=[], eventLog=[], retiring=new Set();
  function record(name){eventLog.push(name);if(eventLog.length>40)eventLog.shift();}
  function report(error,id){const message=error?.message||String(error);if(error?.name!=='AbortError'){errors.push({id,message});if(errors.length>12)errors.shift();}}
  function effective(gain){return settings.muted?0:Math.max(0,Math.min(1,gain*settings.volume));}
  function save(){try{localStorage.setItem(key,JSON.stringify(settings));}catch{}}
  function media(id,gain,loop=false){const audio=new Audio(new URL(id+'.ogg',base).href);audio.preload='auto';audio.loop=loop;audio.volume=effective(gain);const item={id,audio,gain,fade:0};audio.addEventListener('error',()=>report(Error('音源を読めませんでした'),id));return item;}
  function retire(item){retiring.delete(item);item.fade++;item.audio.pause();item.audio.removeAttribute('src');item.audio.load();}
  function ramp(item,to,seconds=.6,after){const revision=++item.fade,from=item.audio.volume,start=performance.now();function step(now){if(item.fade!==revision)return;const t=Math.min(1,(now-start)/(seconds*1000));item.audio.volume=Math.max(0,Math.min(1,from+(to-from)*t));if(t<1)requestAnimationFrame(step);else after?.();}requestAnimationFrame(step);}
  function stop(){generation++;clearTimeout(cueTimer);cueTimer=null;for(const item of [...active,...effects,...retiring])retire(item);active=[];effects=[];stage=null;paused=false;record('stop');}
  function unlock(){if(unlocked)return Promise.resolve(true);if(unlockPromise)return unlockPromise;
    const silent=media('click',0);silent.audio.muted=true;
    unlockPromise=silent.audio.play().then(()=>{unlocked=true;retire(silent);record('unlock');return true;}).catch(error=>{retire(silent);if(error.name!=='NotAllowedError')report(error,'unlock');return false;}).finally(()=>{unlockPromise=null;});return unlockPromise;
  }
  function scheduleCue(token){clearTimeout(cueTimer);const cue=profiles[stage]?.[2];if(!cue)return;cueTimer=setTimeout(()=>{if(token!==generation||stage===null)return;if(!paused)play(cue);scheduleCue(token);},26000+Math.random()*20000);}
  async function start(index){const next=Math.max(0,Math.min(23,Math.floor(Number(index)||0)));if(stage===next&&active.length){setPaused(false);return true;}
    const token=++generation;clearTimeout(cueTimer);for(const item of active){retiring.add(item);ramp(item,0,.45,()=>retire(item));}for(const item of effects)retire(item);active=[];effects=[];stage=next;paused=false;
    if(!await unlock()||token!==generation)return false;
    const [music,beds,,crowd]=profiles[next];const requested=[['music-'+music,.68],['crowd',crowd],...beds.map(id=>[id,environmentalVolume[id]])];
    active=requested.map(([id,gain])=>media(id,gain,true));
    const results=await Promise.all(active.map(async item=>{item.audio.volume=0;try{await item.audio.play();if(token!==generation){retire(item);return false;}if(paused){item.audio.pause();return true;}ramp(item,effective(item.gain),1.4);return true;}catch(error){if(token===generation)report(error,item.id);return false;}}));
    if(token===generation){scheduleCue(token);record('stage-'+(next+1));}return results.every(Boolean);
  }
  function setPaused(value){paused=!!value;if(paused)for(const item of [...retiring])retire(item);for(const item of active){item.fade++;if(paused)item.audio.pause();else if(unlocked){item.audio.volume=0;item.audio.play().then(()=>{if(paused)item.audio.pause();else ramp(item,effective(item.gain),.45);}).catch(error=>report(error,item.id));}}if(paused){for(const item of effects)retire(item);effects=[];}record(paused?'pause':'resume');}
  function setMuted(value){settings.muted=!!value;save();for(const item of [...active,...effects]){item.fade++;item.audio.volume=effective(item.gain);}for(const item of [...retiring])retire(item);return settings.muted;}
  function setVolume(value){if(Number.isFinite(Number(value)))settings.volume=Math.max(0,Math.min(1,Number(value)));save();for(const item of [...active,...effects]){item.fade++;item.audio.volume=effective(item.gain);}for(const item of [...retiring])retire(item);return settings.volume;}
  function play(name){if(!(name in effectVolume)||paused||settings.muted)return;if(!unlocked){const token=generation;unlock().then(ok=>{if(ok&&token===generation)play(name);});return;}record(name);const item=media(name,effectVolume[name]);effects.push(item);if(effects.length>8)retire(effects.shift());item.audio.addEventListener('ended',()=>{effects=effects.filter(other=>other!==item);retire(item);},{once:true});item.audio.play().catch(error=>{effects=effects.filter(other=>other!==item);report(error,name);});}
  const getSettings=()=>({...settings});
  const getState=()=>({unlocked,stage,paused,...settings,active:active.map(item=>({id:item.id,time:item.audio.currentTime,paused:item.audio.paused,volume:item.audio.volume,readyState:item.audio.readyState})),effects:effects.map(item=>item.id),retiring:retiring.size,errors:[...errors],events:[...eventLog]});
  window.addEventListener('pagehide',stop);
  return {unlock,start,play,setPaused,stop,setMuted,setVolume,getSettings,getState,profiles:profiles.map((p,i)=>({stage:i,music:p[0],ambience:[...p[1]],cue:p[2]}))};
})();
