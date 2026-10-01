import { analyzeOniMove } from './oni.js';

const oniWorkerSource = '__AI_WORKER_SOURCE__';
export function createOniRunner({ workerFactory = source => { const url=URL.createObjectURL(new Blob([source], {type:'text/javascript'})); try { const worker=new Worker(url); worker.releaseSource=()=>URL.revokeObjectURL(url); return worker; } catch(error) { URL.revokeObjectURL(url); throw error; } }, schedule = setTimeout, unschedule = clearTimeout } = {}) {
  let pending=null, serial=0;
  function cancel() {
    if(!pending)return;
    const job=pending;pending=null;job.worker?.terminate();job.worker?.releaseSource?.();unschedule(job.watchdog);job.resolve(null);
  }
  async function fallback(board,player,options,token) {
    let result=analyzeOniMove(board,player,{...options,timeMs:35,maxDepth:1,maxNodes:2000});
    for(let depth=2;depth<=8;depth++){
      await new Promise(resolve=>schedule(resolve,0));
      if(token!==serial)return null;
      const next=analyzeOniMove(board,player,{...options,timeMs:35,maxDepth:depth,maxNodes:5000});
      if(next.depth<depth)break;
      result=next;options.onProgress?.(next);if(next.solved)break;
    }
    return {...result,backend:'fallback'};
  }
  function think(board,player,options={}) {
    cancel();const token=++serial;
    let worker;
    try { worker=workerFactory(oniWorkerSource); } catch { return fallback(board,player,options,token); }
    return new Promise(resolve=>{
      const job={worker,resolve,watchdog:null};pending=job;
      const finish=result=>{if(pending!==job)return;pending=null;worker.terminate();worker.releaseSource?.();unschedule(job.watchdog);resolve(result);};
      worker.onmessage=event=>{if(pending!==job)return;if(event.data.type==='progress')options.onProgress?.(event.data.result);else if(event.data.type==='result')finish({...event.data.result,backend:'worker'});else finish(null);};
      worker.onerror=()=>{finish(null);};
      job.watchdog=schedule(()=>finish(null),(options.timeMs ?? 5000)+2000);
      const {onProgress,...request}=options;
      try { worker.postMessage({board,player,options:request}); } catch { finish(null); }
    });
  }
  return {think,cancel:()=>{serial++;cancel();},active:()=>!!pending};
}
