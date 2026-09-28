export const SIZE = 8;
export const BOARD_SIZES = Object.freeze([6, 8, 10, 12]);
export const PLAYERS = Object.freeze([
  { id: 0, name: '赤', color: 'red' }, { id: 1, name: '青', color: 'blue' },
  { id: 2, name: '黄', color: 'yellow' }, { id: 3, name: '緑', color: 'green' },
]);
const DIRECTIONS = [-1, 0, 1].flatMap(r => [-1, 0, 1].filter(c => r || c).map(c => [r, c]));
export function boardSize(board) { const n = Math.sqrt(board.length); return BOARD_SIZES.includes(n) ? n : 0; }
export function initialBoard(size = SIZE) {
  if (!BOARD_SIZES.includes(size)) throw new RangeError('盤は6・8・10・12のいずれかです');
  const board = Array(size * size).fill(null), start = size / 2 - 2;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) board[(start + r) * size + start + c] = r < 2 ? (c < 2 ? 0 : 1) : (c < 2 ? 3 : 2);
  return board;
}
export function captures(board, player, index) {
  const size = boardSize(board);
  if (!size || !Number.isInteger(index) || index < 0 || index >= board.length || board[index] !== null || !Number.isInteger(player) || player < 0 || player > 3) return [];
  const flips = [];
  for (const [dr, dc] of DIRECTIONS) {
    let r = Math.floor(index / size) + dr, c = index % size + dc;
    const line = [];
    while (r >= 0 && r < size && c >= 0 && c < size) {
      const i = r * size + c;
      if (board[i] === null) break;
      if (board[i] === player) { if (line.length) flips.push(...line); break; }
      line.push(i); r += dr; c += dc;
    }
  }
  return flips;
}
export function legalMoves(board, player) { return board.flatMap((_, index) => captures(board, player, index).length ? [index] : []); }
export function playMove(board, player, index) {
  const flips = captures(board, player, index); if (!flips.length) return null;
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
