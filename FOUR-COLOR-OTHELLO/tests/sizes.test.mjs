import test from 'node:test';
import assert from 'node:assert/strict';
import { BOARD_SIZES, initialBoard, boardSize, legalMoves, playMove, nextTurn, scores, winners } from '../src/engine.js';
import { chooseAIMove } from '../src/ai.js';
function oracle(board,p,index) {
 const n=Math.sqrt(board.length),r=Math.floor(index/n),c=index%n,flips=[];if(board[index]!==null)return [];
 for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++) {
  if(!dr&&!dc)continue;let rr=r+dr,cc=c+dc,line=[];
  while(rr>=0&&rr<n&&cc>=0&&cc<n&&board[rr*n+cc]!==null&&board[rr*n+cc]!==p){line.push(rr*n+cc);rr+=dr;cc+=dc;}
  if(rr>=0&&rr<n&&cc>=0&&cc<n&&board[rr*n+cc]===p)flips.push(...line);
 }return flips.sort((a,b)=>a-b);
}
for(const n of BOARD_SIZES){
 test(`${n}×${n}: 中央4×4・4色4枚・初手でどの色も絶滅しない`,()=>{
  const b=initialBoard(n);assert.equal(boardSize(b),n);assert.deepEqual(scores(b),[4,4,4,4]);
  for(let p=0;p<4;p++){assert.ok(legalMoves(b,p).length);for(const m of legalMoves(b,p))assert.ok(scores(playMove(b,p,m).board).every(c=>c>0));}
 });
 test(`${n}×${n}: 100対局を独立判定で照合`,()=>{
  let seed=17,total=0,passes=0;
  for(let g=0;g<100;g++){
   let b=initialBoard(n),p=0,moves=0;
   while(true){
    const expected=b.flatMap((_,i)=>oracle(b,p,i).length?[i]:[]);assert.deepEqual(legalMoves(b,p),expected);assert.ok(expected.length);
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;const m=expected[seed%expected.length];const result=playMove(b,p,m);assert.deepEqual([...result.flips].sort((a,b)=>a-b),oracle(b,p,m));b=result.board;moves++;total++;
    assert.equal(scores(b).reduce((a,c)=>a+c),16+moves);assert.ok(moves<=n*n-16);
    const next=nextTurn(b,p);for(const skip of next.skipped){assert.equal(legalMoves(b,skip).length,0);passes++;}
    if(next.ended){assert.ok(winners(b).length);assert.ok([0,1,2,3].every(p=>legalMoves(b,p).length===0));break;}p=next.player;
   }
  }console.log(JSON.stringify({size:n,games:100,moves:total,passes}));
 });
 for(const difficulty of ['easy','normal','hard']) test(`${n}×${n}: ${difficulty}が2対局完走`,()=>{
  let seed=19,elapsed=0;
  for(let g=0;g<2;g++) {let b=initialBoard(n),p=0,moves=0;while(true){
   const t=performance.now(), m=chooseAIMove(b,p,{difficulty,random:()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;}});elapsed=Math.max(elapsed,performance.now()-t);assert.ok(legalMoves(b,p).includes(m));b=playMove(b,p,m).board;assert.ok(++moves<=n*n-16);
   const next=nextTurn(b,p);if(next.ended)break;p=next.player;
  }}console.log(JSON.stringify({size:n,difficulty,maxDecisionMs:Math.round(elapsed)}));
 });
}
test('未対応サイズ・不正入力を拒否',()=>{for(const n of [0,5,7,9,13,8.5,NaN])assert.throws(()=>initialBoard(n),RangeError);assert.equal(boardSize(Array(65)),0);});
test('やさしいAIは乱数に応じて複数の合法手を選ぶ',()=>{const b=initialBoard(),moves=legalMoves(b,0);assert.equal(chooseAIMove(b,0,{difficulty:'easy',random:()=>0}),moves[0]);assert.equal(chooseAIMove(b,0,{difficulty:'easy',random:()=>.999}),moves.at(-1));});
