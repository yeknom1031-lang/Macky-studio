export const SIZE = 8;
export const PLAYERS = Object.freeze([
  { id: 0, name: '赤', color: 'red' }, { id: 1, name: '青', color: 'blue' },
  { id: 2, name: '黄', color: 'yellow' }, { id: 3, name: '緑', color: 'green' },
]);
const DIRECTIONS = [-1, 0, 1].flatMap(r => [-1, 0, 1].filter(c => r || c).map(c => [r, c]));
export function initialBoard() {
  const board = Array(64).fill(null);
  for (let r = 2; r < 6; r++) for (let c = 2; c < 6; c++) board[r * 8 + c] = r < 4 ? (c < 4 ? 0 : 1) : (c < 4 ? 3 : 2);
  return board;
}
export function captures(board, player, index) {
  if (!Number.isInteger(index) || index < 0 || index >= 64 || board[index] !== null || !Number.isInteger(player) || player < 0 || player > 3) return [];
  const flips = [];
  for (const [dr, dc] of DIRECTIONS) {
    let r = Math.floor(index / 8) + dr, c = index % 8 + dc;
    const line = [];
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const i = r * 8 + c;
      if (board[i] === null) break;
      if (board[i] === player) { if (line.length) flips.push(...line); break; }
      line.push(i); r += dr; c += dc;
    }
  }
  return flips;
}
export function legalMoves(board, player) { return board.flatMap((_, index) => captures(board, player, index).length ? [index] : []); }
export function playMove(board, player, index) {
  const flips = captures(board, player, index);
  if (!flips.length) return null;
  const next = board.slice(); next[index] = player;
  for (const i of flips) next[i] = player;
  return { board: next, flips };
}
export function scores(board) { const result = [0, 0, 0, 0]; for (const v of board) if (v !== null) result[v]++; return result; }
export function nextTurn(board, current) {
  const skipped = [];
  for (let step = 1; step <= 4; step++) {
    const player = (current + step) % 4;
    if (legalMoves(board, player).length) return { player, skipped, ended: false };
    skipped.push(player);
  }
  return { player: null, skipped, ended: true };
}
export function winners(board) { const counts = scores(board), max = Math.max(...counts); return PLAYERS.filter(p => counts[p.id] === max).map(p => p.id); }
