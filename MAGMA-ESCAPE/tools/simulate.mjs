import {Game} from '../core.js';
for(let seed=1;seed<=20;seed++){
  const g=new Game({seed});let target=1,events=[];
  for(let i=0;i<120*240&&g.alive&&g.height<110;i++){
    if(g.paused){events.push(g.event);g.hunger=100;g.resume();}
    if(g.player.ground!==null)target=g.player.ground+1;
    const s=g.platforms.find(p=>p.id===target);if(!s)break;
    const dx=s.x-g.player.x;
    g.step(1/120,{left:dx<-6,right:dx>6,jump:g.player.ground!==null,jet:false});
  }
  console.log(JSON.stringify({seed,height:g.height,alive:g.alive,time:Math.round(g.time),events:events.length}));
}
