import test from 'node:test';
import assert from 'node:assert/strict';
import {puzzles} from '../dist/puzzles.mjs';
import {Game,clues,puzzleClues} from '../dist/engine.mjs';
// An independent line-candidate solver proves every published puzzle can be
// completed using only its printed clues, without guessing or checking answers.
function candidates(n, hints) {
  if(hints[0]===0)return [Array(n).fill(0)];
  const result=[];
  function visit(k,start,line){
    if(k===hints.length){result.push(line);return;}
    const tail=hints.slice(k+1).reduce((a,b)=>a+b,0)+hints.length-k-1;
    for(let pos=start;pos<=n-hints[k]-tail;pos++){
      const copy=[...line];for(let j=pos;j<pos+hints[k];j++)copy[j]=1;
      visit(k+1,pos+hints[k]+1,copy);
    }
  }
  visit(0,0,Array(n).fill(0));return result;
}
function logicSolve(puzzle) {
  const n=puzzle.size,c=puzzleClues(puzzle),grid=Array(n*n).fill(-1);
  const options={rows:c.rows.map(x=>candidates(n,x)),cols:c.cols.map(x=>candidates(n,x))};
  let changed=true;
  while(changed){changed=false;for(const axis of ['rows','cols'])for(let a=0;a<n;a++){
    const ids=Array.from({length:n},(_,k)=>axis==='rows'?a*n+k:k*n+a);
    options[axis][a]=options[axis][a].filter(line=>ids.every((id,k)=>grid[id]===-1||grid[id]===line[k]));
    assert.ok(options[axis][a].length,`contradiction in ${puzzle.id}`);
    for(let k=0;k<n;k++){const bit=options[axis][a][0][k];if(grid[ids[k]]===-1&&options[axis][a].every(x=>x[k]===bit)){grid[ids[k]]=bit;changed=true;}}
  }}
  return grid;
}
for(const puzzle of puzzles)test(`Puzzle ${puzzle.id}: valid and uniquely solvable without guessing`,()=>{
  assert.equal(puzzle.solution.length,puzzle.size**2);
  assert.ok(puzzle.solution.every(v=>v===0||v===1));
  assert.deepEqual(logicSolve(puzzle),puzzle.solution);
});
test('clues keep separate runs and represent empty lines with zero',()=>{
  assert.deepEqual(clues([1,1,0,1,0]),[2,1]);assert.deepEqual(clues([0,0,0]),[0]);
});
test('penalties are 2, 4, then 8 minutes and cause time over',()=>{
  const g=new Game(puzzles[0]);g.start();const blank=g.puzzle.solution.indexOf(0);
  for(const amount of [120,240,480,480,480])assert.equal(g.act(blank,'fill'),amount);
  assert.equal(g.remaining,0);assert.equal(g.status,'lost');assert.equal(g.act(0,'fill'),'ignored');
});
test('X marks never cost time, can be erased, and can cover correct squares',()=>{
  const g=new Game(puzzles[0]);g.start();const filled=g.puzzle.solution.indexOf(1);
  g.act(filled,'mark');assert.equal(g.cells[filled],2);assert.equal(g.remaining,1800);
  g.act(filled,'mark',true);assert.equal(g.cells[filled],0);g.act(filled,'fill');assert.equal(g.cells[filled],1);
  g.act(filled,'mark');assert.equal(g.cells[filled],1);
});
test('completion requires all solution squares but does not require X marks',()=>{
  const g=new Game(puzzles[0]);g.start();g.puzzle.solution.forEach((v,i)=>{if(v)g.act(i,'fill');});assert.equal(g.status,'won');
});
test('free hint opens one row and column only at the start; paid hints cost 5 minutes',()=>{
  const g=new Game(puzzles[8]);g.start();assert.equal(g.hint(2,3,true),true);assert.equal(g.remaining,1800);
  const n=g.puzzle.size;for(let k=0;k<n;k++){for(const i of [2*n+k,k*n+3])assert.equal(g.cells[i],g.puzzle.solution[i]?1:2);}
  assert.equal(g.hint(3,4,true),false);assert.equal(g.hint(3,4),true);assert.equal(g.remaining,1500);
  g.remaining=300;assert.equal(g.hint(0,0),false);
});
test('paused timer stays still; loading a saved game always pauses it',()=>{
  const g=new Game(puzzles[0]);g.start();g.tick(12);assert.equal(g.remaining,1788);g.pause();g.tick(60);assert.equal(g.remaining,1788);
  g.start();const restored=new Game(puzzles[0],g.snapshot());assert.equal(restored.status,'paused');assert.equal(restored.remaining,1788);
});
test('filled cells are immutable and invalid coordinates cannot edit the board',()=>{
  const g=new Game(puzzles[0]);g.start();g.act(1,'fill');assert.equal(g.act(1,'fill'),'ignored');assert.equal(g.act(-1,'fill'),'ignored');assert.equal(g.act(25,'fill'),'ignored');
});
