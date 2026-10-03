import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { initialBoard, legalMoves, firstRoundMoves, playMove, nextTurn, scores } from '../src/engine.js';
import { analyzeOniMove } from '../src/oni.js';
import { chooseAIMove } from '../src/ai.js';
import { createOniRunner } from '../src/ai-runner.js';
import { matchReward } from '../src/progression.js';

function terminalValue(board,count){const total=scores(board).slice(0,count),top=Math.max(...total),tied=total.filter(n=>n===top).length;return count===2?[total[0]-total[1],total[1]-total[0]].map(diff=>diff*100+(diff>0?100000:diff<0?-100000:0)):total.map(n=>(n===top?(tied===1?100000:50000):-100000)+(n-top)*100+n);}
function oracle(board,previous,count){const next=nextTurn(board,previous,count);if(next.ended)return terminalValue(board,count);let best=null;for(const i of legalMoves(board,next.player)){const value=oracle(playMove(board,next.player,i).board,next.player,count);if(!best||value[next.player]>best[next.player])best=value;}return best;}
function ending(count,seed){let board=initialBoard(6,count),player=0;while(board.filter(v=>v===null).length>5){const list=legalMoves(board,player);seed=(Math.imul(seed,1664525)+1013904223)>>>0;board=playMove(board,player,list[seed%list.length]).board;const next=nextTurn(board,player,count);if(next.ended)break;player=next.player;}return {board,player};}

test('２色と４色の終盤で独立した全手探索の最善手と一致（パスと終局を含む）',()=>{
 for(const count of [2,4])for(let seed=1;seed<=8;seed++){
  const {board,player}=ending(count,seed), legal=legalMoves(board,player);if(!legal.length)continue;
  const values=legal.map(i=>[i,oracle(playMove(board,player,i).board,player,count)[player]]);
  const best=Math.max(...values.map(v=>v[1]));
  const result=analyzeOniMove(board,player,{playerCount:count,timeMs:10000,maxDepth:board.length,maxNodes:100000,now:()=>0});
  assert.equal(values.find(v=>v[0]===result.index)[1],best,JSON.stringify({count,seed,result,values}));
  assert.equal(result.solved,true);assert.equal(result.score,best);
 }
});
test('探索が時間・ノード上限に達しても合法手を返し、入力盤と初手保護を守る',()=>{
 for(const n of [6,8,10,12])for(const count of [2,4]){
  const board=initialBoard(n,count),copy=board.slice(), movedPlayers=Array(count).fill(false);
  const allowed=firstRoundMoves(board,0,movedPlayers);
  let tick=0;const result=analyzeOniMove(board,0,{playerCount:count,allowedMoves:allowed,movedPlayers,timeMs:10,now:()=>tick++,maxNodes:15});
  assert.ok(allowed.includes(result.index));assert.ok(result.nodes<=16);assert.deepEqual(board,copy);
 }
 const board=Array(64).fill(null);board[0]=0;board[1]=1;
 assert.equal(analyzeOniMove(board,1,{playerCount:2}).index,null);
 assert.equal(analyzeOniMove(board,4).index,null);
});
test('時間を使うと深さが増え、２色で枝刈り・同一局面の再利用が働く',()=>{
 const result=analyzeOniMove(initialBoard(8,2),0,{playerCount:2,timeMs:10000,maxDepth:7,maxNodes:100000,now:()=>0});
 assert.equal(result.depth,7);assert.ok(result.cutoffs>0);assert.ok(result.hits>0);
 assert.equal(matchReward('oni',8),170);assert.equal(matchReward('oni',12),200);
});
test('Workerを途中停止すると古い結果を捨て、再試合・降参後に勝手に着手しない',async()=>{
 const workers=[],timers=new Map();let id=0,revoked=0;
 const runner=createOniRunner({workerFactory:()=>{const w={terminate(){this.terminated=true;},releaseSource(){revoked++;},postMessage(data){this.request=data;}};workers.push(w);return w;},schedule:fn=>{timers.set(++id,fn);return id;},unschedule:id=>timers.delete(id)});
 const old=runner.think(initialBoard(),0,{timeMs:10});const stale=workers[0].onmessage;
 const next=runner.think(initialBoard(),1,{timeMs:10});assert.equal(await old,null);assert.equal(workers[0].terminated,true);
 stale({data:{type:'result',result:{index:0}}});assert.equal(runner.active(),true);
 workers[1].onmessage({data:{type:'result',result:{index:33,depth:6}}});assert.equal((await next).index,33);assert.equal(timers.size,0);assert.equal(runner.active(),false);assert.equal(revoked,2);
 const cancel=runner.think(initialBoard(),2);runner.cancel();assert.equal(await cancel,null);assert.equal(timers.size,0);
});
test('Workerが失敗・応答不能でも終了し、Worker非対応では短い処理に分けて合法手を返す',async()=>{
 let watchdog;const worker={postMessage(){},terminate(){this.stopped=true;}};
 const runner=createOniRunner({workerFactory:()=>worker,schedule:fn=>{watchdog=fn;return 1;},unschedule(){}});
 const result=runner.think(initialBoard(),0);watchdog();assert.equal(await result,null);assert.equal(worker.stopped,true);
 const fallback=createOniRunner({workerFactory:()=>{throw Error('unsupported');}});
 const choice=await fallback.think(initialBoard(8,2),0,{playerCount:2});assert.ok(legalMoves(initialBoard(8,2),0).includes(choice.index));assert.equal(choice.backend,'fallback');
});
test('配布HTMLに埋め込んだ実Workerのスクリプトが単独実行でき、進捗と合法手を返す',async()=>{
 const html=await readFile(new URL('../Irodory.html',import.meta.url),'utf8');
 const literal=html.match(/const oniWorkerSource = ("(?:[^"\\]|\\.)*");/)[1];
 const messages=[],scope={performance,postMessage:m=>messages.push(m)};vm.createContext(scope);
 vm.runInContext(JSON.parse(literal),scope);scope.onmessage({data:{board:initialBoard(8,2),player:0,options:{playerCount:2,timeMs:30}}});
 const progress=messages.filter(m=>m.type==='progress');assert.ok(progress.length);
 for(const {result} of progress){assert.ok(legalMoves(initialBoard(8,2),0).includes(result.index));assert.ok(result.depth>0);assert.ok(Number.isFinite(result.elapsedMs));}
 const result=messages.at(-1);assert.equal(result.type,'result');assert.ok(legalMoves(initialBoard(8,2),0).includes(result.result.index));
});

 test('浅いAIが16枚差で負ける終盤で、鬼は8枚差で勝つ手を読み切る',()=>{
 const board=[...'011.01000001100100.00000...000.111.0'].map(c=>c==='.'?null:Number(c));
 const hard=chooseAIMove(board,1,{difficulty:'hard',playerCount:2});
 const oni=analyzeOniMove(board,1,{playerCount:2,timeMs:10000,now:()=>0,maxDepth:36,maxNodes:100000});
 assert.equal(hard,25);assert.equal(oni.index,3);assert.equal(oni.solved,true);
 assert.equal(oracle(playMove(board,1,hard).board,1,2)[1],-101600);
 assert.equal(oracle(playMove(board,1,oni.index).board,1,2)[1],100800);
 });
