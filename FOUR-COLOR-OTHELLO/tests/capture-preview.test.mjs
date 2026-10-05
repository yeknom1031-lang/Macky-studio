import test from 'node:test';
import assert from 'node:assert/strict';
import { createCapturePreview } from '../src/capture-preview.js';
import { initialBoard, captures, firstRoundMoves, playMove } from '../src/engine.js';

function harness(board, player=0, moved=Array(4).fill(true), color='red') {
  const handlers=new Map(), styles=new Map(); let reads=0;
  const cells=board.map((_,i)=>{
    const classes=new Set(),attrs=new Map();
    return {dataset:{index:String(i)},classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)},
      setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k),getAttribute:k=>attrs.get(k),
      getBoundingClientRect(){return {top:100,right:200,width:50,height:50};},
      closest(){return this;},matches(){return true;}};
  });
  const surface={contains:c=>cells.includes(c),style:{setProperty:(k,v)=>styles.set(k,v)},
    addEventListener:(k,v)=>handlers.set(k,v),removeEventListener:k=>handlers.delete(k)};
  const badge={hidden:true,style:{}},preview=createCapturePreview(surface,badge), legal=new Set(firstRoundMoves(board,player,moved));
  for(const i of legal)cells[i].classList.add('legal-hint');
  const options={enabled:true,cells,color,resolve:i=>{reads++;return legal.has(i)?captures(board,player,i):[];}};
  preview.sync(options);
  return {preview,badge,cells,handlers,styles,options,reads:()=>reads,
    hover:(i,pointerType='mouse')=>handlers.get('pointermove')({target:cells[i],pointerType}),
    marked:()=>cells.flatMap((c,i)=>c.classList.contains('capture-preview')?[i]:[])};
}

test('混色の縦・横・斜めを同時に予告し、実際に取れる石と枚数が一致、盤面は変えない',()=>{
  const board=Array(64).fill(null);
  for(const [i,p] of [[26,1],[25,2],[24,0],[19,3],[11,0],[36,2],[45,1],[54,0]])board[i]=p;
  const original=board.slice(),h=harness(board);
  h.hover(27);
  assert.deepEqual(h.marked(),[19,25,26,36,45]);
  assert.deepEqual(h.marked(),playMove(board,0,27).flips.sort((a,b)=>a-b));
  assert.equal(h.cells[27].getAttribute('data-capture-count'),'5');
  assert.match(h.cells[27].getAttribute('aria-description'),/5枚/);
  assert.deepEqual(board,original);
});

test('同じマス上の1000入力では１回だけ計算し、候補変更・盤面外・停止で前の予告を解放',()=>{
  const h=harness(initialBoard()); const moves=firstRoundMoves(initialBoard(),0,[false,false,false,false]);
  for(let n=0;n<1000;n++)h.hover(moves[0]);
  assert.equal(h.reads(),1);
  h.hover(moves[1]); assert.equal(h.reads(),2);
  assert.equal(h.cells[moves[0]].getAttribute('data-capture-count'),undefined);
  h.handlers.get('pointerleave')();assert.deepEqual(h.marked(),[]);
  h.hover(moves[0]);h.preview.sync({...h.options,enabled:false});h.hover(moves[1]);assert.deepEqual(h.marked(),[]);
  h.preview.destroy();assert.equal(h.handlers.size,0);
});

test('占有マス・非合法手は予告せず、タッチ入力で残像を消す',()=>{
  const board=initialBoard(),h=harness(board),move=firstRoundMoves(board,0,[false,false,false,false])[0];
  h.hover(move);assert.ok(h.marked().length);
  h.hover(27);assert.deepEqual(h.marked(),[]);
  h.hover(0);assert.deepEqual(h.marked(),[]);
  h.hover(move);h.hover(move,'touch');assert.deepEqual(h.marked(),[]);
});

test('初手保護で禁止される絶滅手は予告も枚数表示もしない',()=>{
  const board=Array(64).fill(null);board[26]=0;board[27]=1;board[28]=1;board[35]=0;
  const h=harness(board,0,[true,false,true,true]);
  h.hover(21);assert.ok(h.marked().length);
  h.hover(29);assert.deepEqual(h.marked(),[]);assert.equal(h.cells[29].getAttribute('data-capture-count'),undefined);
});

test('黒白と購入色に対応し、矢印キーのフォーカスでも予告して離れると解除',()=>{
  for(const color of ['black','white','violet','pearl']) {
    const board=initialBoard(8,2),h=harness(board,0,[false,false],color),move=firstRoundMoves(board,0,[false,false])[0];
    h.handlers.get('focusin')({target:h.cells[move]});
    assert.deepEqual(h.marked(),captures(board,0,move));
    assert.equal(h.styles.get('--capture-image'),`var(--stone-${color})`);
    h.handlers.get('focusout')();assert.deepEqual(h.marked(),[]);
  }
});

 test('枚数は盤面外の共通バッジに表示し、候補変更・退出・停止で消える',()=>{
  const board=initialBoard(),h=harness(board),move=firstRoundMoves(board,0,[false,false,false,false])[0];
  h.hover(move);assert.equal(h.badge.hidden,false);assert.equal(h.badge.textContent,`${captures(board,0,move).length}枚`);
  assert.equal(h.badge.style.left,'198.5px');assert.equal(h.badge.style.top,'101.5px');
  h.hover(0);assert.equal(h.badge.hidden,true);
  h.hover(move);h.handlers.get('pointerleave')();assert.equal(h.badge.hidden,true);
  h.hover(move);h.preview.sync({...h.options,enabled:false});assert.equal(h.badge.hidden,true);
});
