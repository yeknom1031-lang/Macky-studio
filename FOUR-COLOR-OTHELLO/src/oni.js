import { boardSize } from './engine.js';

const oniGeometry = new Map();
function oniRays(size) {
  if (!oniGeometry.has(size)) {
    oniGeometry.set(size, Array.from({length:size*size}, (_,i) => {
      const rays=[];
      for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if(dr||dc){
        const ray=[];
        for(let r=Math.floor(i/size)+dr,c=i%size+dc;r>=0&&c>=0&&r<size&&c<size;r+=dr,c+=dc)ray.push(r*size+c);
        if(ray.length>1)rays.push(ray);
      }
      return rays;
    }));
  }
  return oniGeometry.get(size);
}

// Iterative deepening always returns the last fully completed iteration.
// Two players: full-width negamax / alpha-beta, bounded transposition table.
// Four players: Max-N (each opponent maximizes its own score), a wider beam,
// and exhaustive endgame search. Opening protection is part of the search.
export function analyzeOniMove(input, player, options = {}) {
  const size=boardSize(input), count=options.playerCount ?? 4;
  if(!size || ![2,4].includes(count) || !Number.isInteger(player) || player<0 || player>=count || !input.every(p=>p===null||Number.isInteger(p)&&p>=0&&p<count))return {index:null,depth:0,nodes:0,solved:false};
  const now=options.now ?? (()=>performance.now()), start=now();
  const budget=Math.max(1,Math.min(10000,Number(options.timeMs) || (count===2?5000:4000)));
  const deadline=start+budget, maxNodes=Math.max(1,Math.min(2000000,options.maxNodes ?? 1000000));
  const maxDepth=Math.max(1,Math.min(input.length,options.maxDepth ?? (count===2?20:10)));
  const rays=oniRays(size), last=size-1, corners=[0,last,last*size,input.length-1];
  const fullMask=(1<<count)-1;
  const initialMask=count===2?fullMask:(options.movedPlayers ?? Array(4).fill(true)).reduce((mask,done,p)=>mask|(done?1<<p:0),0);
  const table=new Map(), timeout={};
  let nodes=0, cutoffs=0, hits=0;
  function check() { nodes++; if(nodes>maxNodes || now()>=deadline)throw timeout; }
  function counts(board) { const totals=Array(count).fill(0);for(const p of board)if(p!==null)totals[p]++;return totals; }
  function moves(board,p,mask) {
    const result=[], totals=mask===fullMask?null:counts(board);
    for(let i=0;i<board.length;i++)if(board[i]===null){
      const flips=[];
      for(const ray of rays[i]){
        let length=0;
        for(const j of ray){if(board[j]===null)break;if(board[j]===p){if(length)flips.push(...ray.slice(0,length));break;}length++;}
      }
      if(!flips.length)continue;
      if(totals){const lost=Array(count).fill(0);for(const j of flips)lost[board[j]]++;
        if(totals.some((total,id)=>id!==p && !(mask&(1<<id)) && total-lost[id]===0))continue;
      }
      result.push({index:i,flips});
    }
    return result;
  }
  function apply(board,move,p) {const next=board.slice();next[move.index]=p;for(const j of move.flips)next[j]=p;return next;}
  function terminal(board) {
    const total=counts(board), top=Math.max(...total), tied=total.filter(n=>n===top).length;
    if(count===2)return [total[0]-total[1],total[1]-total[0]].map(diff=>diff*100+(diff>0?100000:diff<0?-100000:0));
    return total.map(n=>(n===top?(tied===1?100000:50000):-100000)+(n-Math.max(...total))*100+n);
  }
  function evaluate(board) {
    const total=counts(board), empty=board.filter(p=>p===null).length, ratio=empty/board.length;
    const value=total.map(n=>n*(ratio<.18?12:ratio<.4?2:.15));
    for(let p=0;p<count;p++) {
      if(!total[p]){value[p]=-30000;continue;}
      value[p]+=moves(board,p,fullMask).length*(ratio<.15?3:10);
    }
    const frontier=Array(count).fill(0), potential=Array.from({length:count},()=>new Set());
    for(let i=0;i<board.length;i++)if(board[i]!==null){
      const p=board[i],r=Math.floor(i/size),c=i%size;let exposed=false;
      for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if(dr||dc){
        const nr=r+dr,nc=c+dc;
        if(nr>=0&&nc>=0&&nr<size&&nc<size&&board[nr*size+nc]===null){exposed=true;for(let other=0;other<count;other++)if(other!==p)potential[other].add(nr*size+nc);}
      }
      if(exposed)frontier[p]++;
    }
    for(let p=0;p<count;p++)value[p]+=(potential[p].size*1.5-frontier[p]*5)*(ratio<.15?.2:1);
    for(const corner of corners){
      const p=board[corner],r=Math.floor(corner/size),c=corner%size;
      const dr=r===0?1:-1,dc=c===0?1:-1;
      if(p===null){for(const [offset,penalty] of [[dr*size,45],[dc,45],[dr*size+dc,110]])if(board[corner+offset]!==null)value[board[corner+offset]]-=penalty;}
      else {value[p]+=260;for(const step of [dr*size,dc])for(let k=1;k<size&&board[corner+k*step]===p;k++)value[p]+=28;}
    }
    if(count===2){const diff=value[0]-value[1];return [diff,-diff];}
    return value.map((v,p)=>v-Math.max(...value.filter((_,id)=>id!==p))*.8);
  }
  function order(list,board,p,preferred) {
    const endgame=board.filter(v=>v===null).length<12;
    return list.map(move=>{
      const i=move.index,r=Math.floor(i/size),c=i%size;
      let priority=i===preferred?100000:0;
      if(corners.includes(i))priority+=10000;
      for(const corner of corners)if(board[corner]===null){const cr=Math.floor(corner/size),cc=corner%size;if(Math.abs(r-cr)<=1&&Math.abs(c-cc)<=1)priority-=r!==cr&&c!==cc?700:300;}
      if(r===0||c===0||r===last||c===last)priority+=35;
      priority+=move.flips.length*(endgame?3:-1);
      return {...move,priority};
    }).sort((a,b)=>b.priority-a.priority||a.index-b.index);
  }
  function key(board,p,mask,passes=0){return `${p}:${mask}:${passes}:${board.map(v=>v===null?'.':v).join('')}`;}
  function put(k,value){if(table.size>=60000)table.clear();table.set(k,value);}
  function negamax(board,p,depth,alpha,beta,passes) {
    check();const k=key(board,p,fullMask,passes),entry=table.get(k), originalAlpha=alpha,originalBeta=beta;
    if(entry?.depth>=depth){hits++;if(entry.flag==='exact')return entry.value;if(entry.flag==='lower')alpha=Math.max(alpha,entry.value);else beta=Math.min(beta,entry.value);if(alpha>=beta)return entry.value;}
    const list=moves(board,p,fullMask);
    if(!list.length)return passes?terminal(board)[p]:-negamax(board,1-p,depth,-beta,-alpha,1);
    if(!depth)return evaluate(board)[p];
    let best=-Infinity,bestMove=null;
    for(const move of order(list,board,p,entry?.move)){
      const value=-negamax(apply(board,move,p),1-p,depth-1,-beta,-alpha,0);
      if(value>best){best=value;bestMove=move.index;}alpha=Math.max(alpha,best);
      if(alpha>=beta){cutoffs++;break;}
    }
    put(k,{depth,value:best,move:bestMove,flag:best<=originalAlpha?'upper':best>=originalBeta?'lower':'exact'});return best;
  }
  function maxn(board,p,mask,depth,passes,exact) {
    check();const k=key(board,p,mask,passes)+`:${exact}`,entry=table.get(k);
    if(entry?.depth===depth){hits++;return entry.value;}
    let list=moves(board,p,mask);
    if(!list.length)return passes===count-1?terminal(board):maxn(board,(p+1)%count,mask,depth,passes+1,exact);
    if(!depth)return evaluate(board);
    list=order(list,board,p,entry?.move);
    if(!exact)list=list.slice(0,8);
    let best=null,bestMove=null;
    for(const move of list){const value=maxn(apply(board,move,p),(p+1)%count,mask|(1<<p),depth-1,0,exact);if(!best||value[p]>best[p]){best=value;bestMove=move.index;}}
    put(k,{depth,value:best,move:bestMove});return best;
  }
  let legal=moves(input,player,initialMask);
  if(options.allowedMoves)legal=legal.filter(move=>options.allowedMoves.includes(move.index));
  if(!legal.length)return {index:null,depth:0,nodes,solved:true,elapsedMs:now()-start};
  let best=order(legal,input,player)[0].index,completed=0,solved=false,score=null;
  const empty=input.filter(v=>v===null).length,exact=count===2||empty<=8;
  for(let depth=1;depth<=Math.min(maxDepth,empty);depth++){
    let candidate=best,value=-Infinity,alpha=-Infinity;
    try {
      for(const move of order(legal,input,player,best)){
        check();const board=apply(input,move,player);
        const result=count===2?-negamax(board,1-player,depth-1,-Infinity,-alpha,0):maxn(board,(player+1)%count,initialMask|(1<<player),depth-1,0,exact)[player];
        if(result>value){value=result;candidate=move.index;}alpha=Math.max(alpha,result);
      }
      best=candidate;completed=depth;score=value;solved=exact&&depth>=empty;
      options.onProgress?.({index:best,depth,nodes,solved,score:value,elapsedMs:now()-start});
      if(solved)break;
    } catch(error){if(error!==timeout)throw error;break;}
  }
  return {index:best,depth:completed,nodes,cutoffs,hits,solved,score,elapsedMs:now()-start};
}
