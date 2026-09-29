import { PLAYERS, boardSize, legalMoves, playMove, nextTurn, scores } from './engine.js';
export const DIFFICULTIES = Object.freeze({
  easy: { label: 'やさしい', description: '気軽に練習。いろいろな手を打ちます。', depth: 0, width: 1, reward: 30 },
  normal: { label: 'ふつう', description: '角と次の一手を考える相手。', depth: 2, width: 4, reward: 50 },
  hard: { label: 'つよい', description: '3手先まで考える手ごわい相手。', depth: 3, width: 5, reward: 80 },
});
function evaluate(board, terminal = false) {
  const size = boardSize(board), last = size - 1, counts = scores(board), empty = board.filter(v => v === null).length;
  const ratio = empty / board.length;
  const values = counts.map(count => count * (ratio < .2 ? 7 : ratio < .45 ? 2 : .35));
  if (terminal) {
    const top = Math.max(...counts), tied = counts.filter(n => n === top).length;
    return counts.map(n => n * 100 + (n === top ? (tied === 1 ? 100000 : 50000) : 0));
  }
  for (let p = 0; p < 4; p++) {
    if (!counts[p]) { values[p] = -100000; continue; }
    values[p] += legalMoves(board, p).length * 5;
  }
  for (let i = 0; i < board.length; i++) {
    const p = board[i]; if (p === null) continue;
    const row = Math.floor(i / size), col = i % size;
    if (row === 0 || row === last || col === 0 || col === last) values[p] += 9;
    let frontier = false;
    for (let dr = -1; dr <= 1 && !frontier; dr++) for (let dc = -1; dc <= 1; dc++) {
      const r = row + dr, c = col + dc;
      if ((dr || dc) && r >= 0 && r < size && c >= 0 && c < size && board[r * size + c] === null) { frontier = true; break; }
    }
    if (frontier) values[p] -= ratio > .2 ? 2 : .5;
  }
  for (const [r, c] of [[0, 0], [0, last], [last, 0], [last, last]]) {
    const corner = r * size + c;
    if (board[corner] !== null) values[board[corner]] += 150;
    else for (const [dr, dc] of [[r === 0 ? 1 : -1, 0], [0, c === 0 ? 1 : -1], [r === 0 ? 1 : -1, c === 0 ? 1 : -1]]) {
      const p = board[(r + dr) * size + c + dc]; if (p !== null) values[p] -= dr && dc ? 60 : 35;
    }
  }
  return values;
}
function candidates(board, player, width, allowedMoves) {
  return (allowedMoves ? legalMoves(board,player).filter(index => allowedMoves.includes(index)) : legalMoves(board, player)).map(index => {
    const result = playMove(board, player, index);
    return { index, board: result.board, score: evaluate(result.board)[player] };
  }).sort((a, b) => b.score - a.score || a.index - b.index).slice(0, width);
}
function search(board, previous, depth, width) {
  const next = nextTurn(board, previous);
  if (next.ended) return evaluate(board, true);
  if (depth === 0) return evaluate(board);
  let best = null;
  for (const candidate of candidates(board, next.player, width)) {
    const value = search(candidate.board, next.player, depth - 1, width);
    if (best === null || value[next.player] > best[next.player]) best = value;
  }
  return best ?? evaluate(board);
}
export function chooseAIMove(board, player, { difficulty = 'hard', depth, width, random = Math.random, allowedMoves } = {}) {
  if (!PLAYERS.some(p => p.id === player)) return null;
  const level = DIFFICULTIES[difficulty] ?? DIFFICULTIES.normal;
  if (difficulty === 'easy') {
    const moves = allowedMoves ? legalMoves(board,player).filter(index => allowedMoves.includes(index)) : legalMoves(board, player);
    const sample = Math.max(0, Math.min(.999999, Number(random()) || 0));
    return moves.length ? moves[Math.floor(sample * moves.length)] : null;
  }
  const levels = Math.max(1, Math.min(3, Math.trunc(depth ?? level.depth) || 2));
  // Bound the search tree on larger boards: the old 5×5×5 beam could take
  // tens of seconds once a 10×10 position had many legal moves.
  const maxWidth = boardSize(board) >= 10 ? (difficulty === 'hard' ? 2 : 3) : 3;
  const breadth = Math.max(1, Math.min(maxWidth, Math.trunc(width ?? level.width) || maxWidth));
  let bestIndex = null, bestValue = -Infinity;
  for (const candidate of candidates(board, player, breadth, allowedMoves)) {
    const value = search(candidate.board, player, levels - 1, breadth)[player];
    if (value > bestValue) { bestIndex = candidate.index; bestValue = value; }
  }
  return bestIndex;
}
