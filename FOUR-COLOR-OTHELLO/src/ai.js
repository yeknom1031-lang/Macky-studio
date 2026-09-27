import { PLAYERS, legalMoves, playMove, nextTurn, scores } from './engine.js';

const CORNERS = [0, 7, 56, 63];
const NEIGHBORS = [[1, 8, 9], [6, 14, 15], [48, 49, 57], [54, 55, 62]];

// Each player optimizes their own position (MaxN), rather than treating the
// other three colors as a single collaborating opponent.
function evaluate(board, terminal = false) {
  const counts = scores(board), empty = board.filter(v => v === null).length;
  const values = counts.map(count => count * (empty < 12 ? 7 : empty < 28 ? 2 : .35));
  if (terminal) {
    const top = Math.max(...counts), tied = counts.filter(n => n === top).length;
    return counts.map(n => n * 100 + (n === top ? (tied === 1 ? 100000 : 50000) : 0));
  }
  for (let p = 0; p < 4; p++) {
    if (!counts[p]) { values[p] = -100000; continue; }
    values[p] += legalMoves(board, p).length * 5;
  }
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p === null) continue;
    const row = Math.floor(i / 8), col = i % 8;
    if (row === 0 || row === 7 || col === 0 || col === 7) values[p] += 9;
    // Exposed discs give the other colors more opportunities to capture.
    let frontier = false;
    for (let dr = -1; dr <= 1 && !frontier; dr++) for (let dc = -1; dc <= 1; dc++) {
      const r = row + dr, c = col + dc;
      if ((dr || dc) && r >= 0 && r < 8 && c >= 0 && c < 8 && board[r * 8 + c] === null) { frontier = true; break; }
    }
    if (frontier) values[p] -= empty > 12 ? 2 : .5;
  }
  CORNERS.forEach((corner, k) => {
    if (board[corner] !== null) values[board[corner]] += 150;
    else for (const i of NEIGHBORS[k]) if (board[i] !== null) values[board[i]] -= (i % 8 !== 0 && i % 8 !== 7 && i > 7 && i < 56) ? 60 : 35;
  });
  return values;
}

function candidates(board, player, width) {
  return legalMoves(board, player).map(index => {
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

export function chooseAIMove(board, player, { depth = 3, width = 5 } = {}) {
  if (!PLAYERS.some(p => p.id === player)) return null;
  const levels = Math.max(1, Math.min(3, Math.trunc(depth) || 3));
  const breadth = Math.max(1, Math.min(8, Math.trunc(width) || 5));
  let bestIndex = null, bestValue = -Infinity;
  for (const candidate of candidates(board, player, breadth)) {
    const value = search(candidate.board, player, levels - 1, breadth)[player];
    if (value > bestValue) { bestIndex = candidate.index; bestValue = value; }
  }
  return bestIndex;
}
