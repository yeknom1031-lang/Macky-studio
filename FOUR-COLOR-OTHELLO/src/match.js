import { PLAYERS, boardSize, nextTurn } from './engine.js';

// Resigning ends this table. In local four-player mode the current player resigns;
// the unfinished piece totals do not designate a winner among the remaining three.
export function canResign(match) {
  return !!match && ['intro', 'playing', 'thinking', 'animating', 'skipping'].includes(match.phase)
    && ['solo', 'friends'].includes(match.mode)
    && PLAYERS.slice(0,match.playerCount ?? 4).some(p => p.id === (match.mode === 'solo' ? match.human : match.player))
    && Array.isArray(match.board) && !!boardSize(match.board)
    && match.board.every(v => v === null || PLAYERS.slice(0,match.playerCount ?? 4).some(p => p.id === v))
    && !nextTurn(match.board, 0, match.playerCount ?? 4).ended;
}
export function endByResignation(match) {
  if (!canResign(match)) return null;
  return { ...match, board: match.board.slice(), phase: 'ended', ending: 'resigned', resigned: match.mode === 'solo' ? match.human : match.player };
}
