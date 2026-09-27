import test from 'node:test';
import assert from 'node:assert/strict';
import { initialBoard, legalMoves, playMove, nextTurn, scores, winners } from '../src/engine.js';
import { chooseAIMove } from '../src/ai.js';

test('AIは全4色で合法手を選び、入力盤面を変更しない', () => {
 const board=initialBoard(),copy=board.slice();
 for(let player=0;player<4;player++) {
  const move=chooseAIMove(board,player);assert.ok(legalMoves(board,player).includes(move));
  assert.equal(chooseAIMove(board,player),move);
 }
 assert.deepEqual(board,copy);
});
test('置けない色・0枚の色・満盤ではAIは手を返さない', () => {
 const board=Array(64).fill(null);board[0]=0;board[1]=1;
 for(const p of [1,2,3])assert.equal(chooseAIMove(board,p),null);
 assert.equal(chooseAIMove(Array(64).fill(0),0),null);
 assert.equal(chooseAIMove(initialBoard(),4),null);
});
test('AIは安全な角を確保する', () => {
 const board=Array(64).fill(null);board[1]=1;board[2]=0;board[27]=0;board[28]=1;
 assert.ok(legalMoves(board,0).includes(0));assert.equal(chooseAIMove(board,0),0);
});
test('最後の1マスで勝てる手を打つ', () => {
 const board=Array(64).fill(0);board[0]=null;board[1]=1;
 const index=chooseAIMove(board,0);assert.equal(index,0);
 assert.deepEqual(winners(playMove(board,0,index).board),[0]);
});
test('人間相当1人＋AI3人で24対局を完走。自動パスと全滅後も継続', () => {
 let random=20260927,totalMoves=0,passes=0,maxDecisionMs=0,humanEliminations=0;
 for(let game=0;game<24;game++){
  let board=initialBoard(),player=0,moves=0;
  while(true){
   const legal=legalMoves(board,player);assert.ok(legal.length);
   const started=performance.now();
   random=(Math.imul(random,1664525)+1013904223)>>>0;
   const index=player===0?legal[random%legal.length]:chooseAIMove(board,player);
   maxDecisionMs=Math.max(maxDecisionMs,performance.now()-started);
   assert.ok(legal.includes(index));const next=playMove(board,player,index);board=next.board;moves++;totalMoves++;
   assert.equal(scores(board).reduce((a,b)=>a+b),16+moves);assert.ok(moves<=48);
   const turn=nextTurn(board,player);passes+=turn.skipped.length;
   for(const skipped of turn.skipped)assert.equal(legalMoves(board,skipped).length,0);
   if(turn.ended){assert.ok(winners(board).length>0);if(scores(board)[0]===0)humanEliminations++;break;}
   player=turn.player;
  }
 }
 console.log(JSON.stringify({aiGames:24,totalMoves,passes,humanEliminations,maxDecisionMs:Math.round(maxDecisionMs)}));
});
