export function clues(line) {
  const result = []; let run = 0;
  for (const bit of line) { if (bit === 1) run++; else if (run) { result.push(run); run = 0; } }
  if (run) result.push(run);
  return result.length ? result : [0];
}
export function puzzleClues(puzzle) {
  const {size:n, solution:s} = puzzle;
  return { rows: Array.from({length:n}, (_,r)=>clues(s.slice(r*n,(r+1)*n))),
    cols: Array.from({length:n}, (_,c)=>clues(Array.from({length:n},(_,r)=>s[r*n+c]))) };
}
export class Game {
  constructor(puzzle, saved) {
    this.puzzle = puzzle; this.cells = Array(puzzle.size ** 2).fill(0);
    this.remaining = 1800; this.mistakes = 0; this.hints = 0; this.elapsed = 0;
    this.status = 'ready'; this.freeHintUsed = false;
    if (saved && saved.id === puzzle.id && saved.cells?.length === this.cells.length &&
      saved.cells.every(v=>[0,1,2].includes(v)) && Number.isFinite(saved.remaining) &&
      saved.remaining > 0 && saved.remaining <= 1800 && ['playing','paused'].includes(saved.status)) {
      this.cells = [...saved.cells]; this.remaining = saved.remaining;
      this.mistakes = Math.max(0, Number(saved.mistakes) || 0); this.hints = Math.max(0, Number(saved.hints) || 0);
      this.elapsed = Math.max(0, Number(saved.elapsed) || 0); this.freeHintUsed = !!saved.freeHintUsed; this.status = 'paused';
    }
  }
  start() { if (['ready','paused'].includes(this.status)) this.status = 'playing'; }
  pause() { if (this.status === 'playing') this.status = 'paused'; }
  tick(seconds) {
    if (this.status !== 'playing') return;
    this.elapsed += seconds; this.remaining = Math.max(0, this.remaining - seconds);
    if (!this.remaining) this.status = 'lost';
  }
  act(index, tool, erase = false) {
    if (this.status !== 'playing' || index < 0 || index >= this.cells.length || !Number.isInteger(index)) return 'ignored';
    if (tool === 'mark') {
      if (this.cells[index] === 1) return 'ignored';
      this.cells[index] = erase ? 0 : 2; return 'marked';
    }
    if (this.cells[index] === 1) return 'ignored';
    if (this.puzzle.solution[index] !== 1) {
      const penalty = [120,240,480][Math.min(this.mistakes,2)];
      this.mistakes++; this.remaining = Math.max(0,this.remaining - penalty);
      this.cells[index] = 2;
      if (!this.remaining) this.status = 'lost';
      return penalty;
    }
    this.cells[index] = 1; this.check(); return 'filled';
  }
  hint(row, col, free = false) {
    const n = this.puzzle.size;
    if (this.status !== 'playing' || row < 0 || col < 0 || row >= n || col >= n) return false;
    if (free && (this.freeHintUsed || this.elapsed > 0 || this.hints > 0 || this.cells.some(Boolean))) return false;
    if (!free && this.remaining <= 300) return false;
    if (free) this.freeHintUsed = true; else this.remaining -= 300;
    this.hints++;
    for (let k=0;k<n;k++) {
      for (const i of [row*n+k,k*n+col]) this.cells[i] = this.puzzle.solution[i] ? 1 : 2;
    }
    this.check(); return true;
  }
  check() { if (this.puzzle.solution.every((v,i)=>v ? this.cells[i]===1 : this.cells[i]!==1)) this.status='won'; }
  snapshot() { return {id:this.puzzle.id,cells:this.cells,remaining:this.remaining,mistakes:this.mistakes,hints:this.hints,elapsed:this.elapsed,status:this.status,freeHintUsed:this.freeHintUsed}; }
}
