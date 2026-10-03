// Only game-time work belongs here; menu controls keep using ordinary timers.
export function createGameClock({ now = () => performance.now(), schedule = setTimeout, unschedule = clearTimeout } = {}) {
  const jobs = new Map();
  let sequence=0, frozen=false, origin=now(), frozenAt=0, excluded=0;
  function time(){return (frozen?frozenAt:now())-origin-excluded;}
  function arm(job){
    job.started=now();
    job.timer=schedule(()=>{if(!jobs.has(job.id))return;jobs.delete(job.id);job.callback();},job.remaining);
  }
  function later(callback,ms,onCancel){
    const job={id:++sequence,callback,onCancel,remaining:Math.max(0,ms),timer:null,started:0};
    jobs.set(job.id,job);if(!frozen)arm(job);return job.id;
  }
  function clear(id){const job=jobs.get(id);if(!job)return;unschedule(job.timer);jobs.delete(id);job.onCancel?.();}
  function setPaused(value){
    if(value===frozen)return;
    if(value){frozenAt=now();frozen=true;for(const job of jobs.values()){unschedule(job.timer);job.timer=null;job.remaining=Math.max(0,job.remaining-(frozenAt-job.started));}}
    else {excluded+=now()-frozenAt;frozen=false;for(const job of jobs.values())arm(job);}
  }
  function reset(){for(const id of [...jobs.keys()])clear(id);frozen=false;origin=now();excluded=0;}
  return {schedule:later,clear,setPaused,reset,time,wait:ms=>new Promise(resolve=>later(()=>resolve(true),ms,()=>resolve(false))),pending:()=>jobs.size,paused:()=>frozen};
}
