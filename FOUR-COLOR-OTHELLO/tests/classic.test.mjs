import test from 'node:test';
import assert from 'node:assert/strict';
import { initialBoard, legalMoves, firstRoundMoves, playMove, nextTurn, scores, winners } from '../src/engine.js';
import { chooseAIMove } from '../src/ai.js';
import { awardMatch, recordResignation } from '../src/progression.js';
import { canResign, endByResignation } from '../src/match.js';

test('通常８×８は中央の黒白２枚ずつ、黒の初手は４か所', () => {
 const b=initialBoard(8,2);
 assert.deepEqual(scores(b),[2,2,0,0]);
 assert.deepEqual([b[27],b[28],b[35],b[36]],[1,0,0,1]);
 assert.deepEqual(legalMoves(b,0),[19,26,37,44]);
 assert.deepEqual(firstRoundMoves(b,0,[false,false]),legalMoves(b,0));
 assert.equal(nextTurn(playMove(b,0,19).board,0,2).player,1);
 assert.throws(()=>initialBoard(8,3),RangeError);
});
test('黒白のパス・空きがある終局・引き分けを判定し、色２・３へ進まない', () => {
 const b=Array(64).fill(0);b[0]=null;b[1]=1;
 assert.deepEqual(nextTurn(b,0,2),{player:0,skipped:[1],ended:false});
 const finished=playMove(b,0,0).board;finished[63]=null;
 assert.equal(nextTurn(finished,0,2).ended,true);
 assert.deepEqual(winners(finished,2),[0]);
 assert.deepEqual(winners(Array.from({length:64},(_,i)=>i%2),2),[0,1]);
 assert.equal(chooseAIMove(initialBoard(8,2),2,{playerCount:2}),null);
});
test('全サイズ・全AI難易度の２色対局を完走し、合法手と保存則を検証', () => {
 for(const size of [6,8,10,12]) for(const difficulty of ['easy','normal','hard']) {
  let board=initialBoard(size,2),player=0,moves=0;
  while(true){
   const index=chooseAIMove(board,player,{difficulty,playerCount:2,random:()=>.371});
   assert.ok(legalMoves(board,player).includes(index));
   const result=playMove(board,player,index);
   assert.equal(scores(result.board).reduce((a,b)=>a+b,0),4+(++moves));
   assert.ok(result.board.every(v=>v===null||v===0||v===1));
   board=result.board;const next=nextTurn(board,player,2);
   if(next.ended)break;player=next.player;assert.ok(moves<board.length);
  }
  assert.ok(moves>0);assert.ok(winners(board,2).every(p=>p===0||p===1));
 }
});
test('２色の勝利コイン・二重受け取り防止・降参も共通セーブへ正しく記録', () => {
 const match={id:'classic-win',board:Array(64).fill(1),mode:'solo',human:1,player:0,playerCount:2,difficulty:'normal',phase:'ended',ending:'completed'};
 const win=awardMatch(null,match);assert.equal(win.earned,60);assert.equal(win.profile.stats.wins,1);
 assert.equal(awardMatch(win.profile,match).earned,0);
 const playing={...match,id:'classic-resign',board:initialBoard(8,2),phase:'playing',ending:undefined};
 assert.equal(canResign(playing),true);
 const resigned=endByResignation(playing);assert.equal(resigned.resigned,1);
 assert.equal(awardMatch(null,resigned).earned,0);assert.equal(recordResignation(null,resigned).profile.stats.played,1);
 assert.equal(awardMatch(null,{...match,human:3}).awarded,false);
 assert.equal(awardMatch(null,{...match,board:Array(64).fill(2)}).awarded,false);
});
