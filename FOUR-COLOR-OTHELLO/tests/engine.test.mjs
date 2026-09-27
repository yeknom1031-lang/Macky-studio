import test from 'node:test';
import assert from 'node:assert/strict';
import { initialBoard, captures, legalMoves, playMove, nextTurn, scores, winners } from '../src/engine.js';
const blank = () => Array(64).fill(null);

test('中央4x4は各色4個、合計16個で始まる', () => {
  const b = initialBoard(); assert.equal(b.length, 64); assert.deepEqual(scores(b), [4, 4, 4, 4]);
  assert.deepEqual(b.slice(16, 24), [null, null, 0, 0, 1, 1, null, null]);
  assert.deepEqual(b.slice(40, 48), [null, null, 3, 3, 2, 2, null, null]);
  assert.equal(b.filter(v => v === null).length, 48);
});
test('各色の初手は対称で、赤の置き場所は9つ', () => {
  const b = initialBoard(); assert.deepEqual(legalMoves(b, 0), [13, 22, 30, 41, 46, 50, 51, 53, 54]);
  for (let p = 0; p < 4; p++) {
    assert.equal(legalMoves(b, p).length, 9);
    for (const i of legalMoves(b, p)) assert.ok(scores(playMove(b, p, i).board).every(c => c > 0));
  }
});
for (let p = 0; p < 4; p++) test(`色${p}: 他の3色が混ざった列をすべて返す`, () => {
  const b = blank(); b[24] = p; b[25] = (p + 1) % 4; b[26] = (p + 2) % 4; b[27] = (p + 3) % 4;
  assert.deepEqual(captures(b, p, 28), [27, 26, 25]);
  assert.deepEqual(playMove(b, p, 28).board.slice(24, 29), Array(5).fill(p));
});
for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) test(`8方向: ${dr},${dc}`, () => {
  const b = blank(), at = 27, mid = (3 + dr) * 8 + 3 + dc, end = (3 + 2 * dr) * 8 + 3 + 2 * dc;
  b[mid] = 2; b[end] = 0; assert.deepEqual(captures(b, 0, at), [mid]);
});
test('8方向を同時に返す', () => {
  const b = blank(); for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) { b[(3+dr)*8+3+dc] = 1; b[(3+2*dr)*8+3+2*dc] = 0; }
  assert.equal(captures(b, 0, 27).length, 8); assert.equal(scores(playMove(b, 0, 27).board)[0], 17);
});
test('空きマスで途切れる列・自分の石が隣・端まで相手の列は返さない', () => {
  const b = blank(); b[0] = 0; b[1] = 1; assert.deepEqual(captures(b, 0, 3), []);
  b[1] = 0; assert.deepEqual(captures(b, 0, 2), []);
  b[0] = 1; b[1] = 2; assert.deepEqual(captures(b, 0, 2), []);
});
test('行の端から次の行に回り込まない', () => {
  const b = blank(); b[7] = 1; b[8] = 0; assert.deepEqual(captures(b, 0, 6), []);
});
test('既にある石・範囲外・小数・不正なプレイヤーには置けない', () => {
  const b = initialBoard(); for (const i of [18,-1,64,1.5,NaN,'22',null]) assert.equal(playMove(b, 0, i), null);
  for (const p of [-1,4,NaN,null,'0']) assert.deepEqual(captures(b,p,22), []);
});
test('元の盤面を変更せず、一手で石数は1だけ増える', () => {
  const b = initialBoard(), copy = b.slice(), result = playMove(b,0,22);
  assert.deepEqual(b,copy); assert.deepEqual(scores(result.board),[7,2,4,4]);
  assert.equal(scores(result.board).reduce((a,b)=>a+b),17);
});
test('裏返した石からの連鎖取りはしない', () => {
  const b = blank(); b[24]=0; b[25]=1; b[33]=2; b[41]=0;
  const result=playMove(b,0,26); assert.equal(result.board[25],0); assert.equal(result.board[33],2);
});
test('通常の手番は赤・青・黄・緑・赤', () => {
  for(let p=0;p<4;p++) assert.deepEqual(nextTurn(initialBoard(),p),{player:(p+1)%4,skipped:[],ended:false});
});
test('石が0枚の色は飛ばし、前の人にも戻れる', () => {
  const b = blank(); b[0]=0; b[1]=1;
  assert.deepEqual(nextTurn(b,0),{player:0,skipped:[1,2,3],ended:false});
});
test('空きが残っても全員が置けなければ終了する', () => {
  const b=blank();b[0]=0;b[7]=1;b[56]=2;b[63]=3;
  assert.deepEqual(nextTurn(b,0),{player:null,skipped:[1,2,3,0],ended:true});
});
test('盤が全部埋まったときに終了し最多色が勝つ', () => {
  const b=Array(64).fill(2); assert.ok(nextTurn(b,0).ended); assert.deepEqual(winners(b),[2]);
});
test('同率一位は2人でも4人でも引き分け', () => {
  assert.deepEqual(winners(initialBoard()),[0,1,2,3]);
  const b=blank();b[0]=0;b[1]=0;b[2]=1;b[3]=1;b[4]=2;assert.deepEqual(winners(b),[0,1]);
});
// Independent oracle: start from existing friendly anchors and find candidate empty endpoints.
function oracle(b,p){
  const result=new Map();
  for(let anchor=0;anchor<64;anchor++) if(b[anchor]===p) for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){
    if(!dy&&!dx)continue;
    let y=Math.floor(anchor/8)+dy,x=anchor%8+dx;const crossed=[];
    while(x>=0&&x<8&&y>=0&&y<8){const i=y*8+x;if(b[i]===p)break;if(b[i]===null){if(crossed.length)result.set(i,[...(result.get(i)||[]),...crossed]);break;}crossed.push(i);y+=dy;x+=dx;}
  }
  return result;
}
test('500対局: 独立した判定との照合、全手の保存則、パス、終局を検証', () => {
  let randomState=20260927, totalMoves=0, totalPasses=0, earlyEnds=0;
  const random=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296;};
  for(let game=0;game<500;game++){
    let b=initialBoard(),p=0,moves=0;
    while(true){
      const reference=oracle(b,p),legal=legalMoves(b,p);
      assert.deepEqual(legal,[...reference.keys()].sort((a,b)=>a-b));
      assert.ok(legal.length>0);
      const index=legal[Math.floor(random()*legal.length)];
      assert.deepEqual(captures(b,p,index).sort((a,b)=>a-b),reference.get(index).sort((a,b)=>a-b));
      const before=scores(b),result=playMove(b,p,index),after=scores(result.board);
      assert.equal(after[p],before[p]+result.flips.length+1);
      assert.equal(after.reduce((a,b)=>a+b),17+moves); assert.equal(new Set(result.flips).size,result.flips.length);
      b=result.board;moves++;totalMoves++;assert.ok(moves<=48);
      const next=nextTurn(b,p);totalPasses+=next.skipped.length;
      for(const skipped of next.skipped)assert.equal(oracle(b,skipped).size,0);
      if(next.ended){for(let player=0;player<4;player++)assert.equal(oracle(b,player).size,0);if(b.includes(null))earlyEnds++;break;}
      p=next.player;
    }
  }
  console.log(JSON.stringify({simulatedGames:500,totalMoves,totalPasses,earlyEnds}));
});
