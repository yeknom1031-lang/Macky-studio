/* Frame pacing and resolution policy; independent of gameplay and saves. */
window.SkyPerformance = (() => {
  'use strict';
  function steps(elapsed) {
    const duration=Math.max(0,Math.min(Number.isFinite(elapsed)?elapsed:0,.15));
    const count=Math.max(1,Math.ceil(duration/.04));
    return Array(count).fill(duration/count);
  }
  function create({deviceRatio=1,apply,mode='auto'}) {
    const maximum=Math.min(1.5,Math.max(1,deviceRatio));
    let choice='auto',ratio=maximum,slow=0,fast=0,average=24;
    function setMode(next) {
      choice=['auto','clear','light'].includes(next)?next:'auto';
      ratio=choice==='light'?Math.min(1,maximum):maximum;
      slow=fast=0;average=24;apply(ratio,choice==='light'?1024:2048);
    }
    function sample(milliseconds,seconds) {
      if(choice!=='auto'||!Number.isFinite(milliseconds)||milliseconds<4)return;
      average=average*.95+Math.min(milliseconds,150)*.05;
      slow=average>35?slow+seconds:0;fast=average<21?fast+seconds:0;
      if(slow>3&&ratio>.85){ratio=Math.max(.85,Math.round((ratio-.15)*100)/100);slow=fast=0;apply(ratio,ratio<1?1024:2048);}
      else if(fast>10&&ratio<maximum){ratio=Math.min(maximum,Math.round((ratio+.1)*100)/100);slow=fast=0;apply(ratio,ratio<1?1024:2048);}
    }
    setMode(mode);
    return {setMode,sample,status:()=>({mode:choice,pixelRatio:ratio})};
  }
  function detailLOD(center,layers) {
    let near=false;for(const layer of layers)layer.visible=false;
    return {update(camera){const d=Math.hypot(center.x-camera.x,center.y-camera.y,center.z-camera.z);const next=near?d<120:d<90;if(next!==near){near=next;for(const layer of layers)layer.visible=near;}},isNear:()=>near};
  }
  return {steps,create,detailLOD};
})();
