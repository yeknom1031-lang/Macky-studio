import { PLAYERS, BOARD_SIZES, boardSize, nextTurn, winners } from './engine.js';
import { DIFFICULTIES } from './ai.js';

export const CATALOG = Object.freeze([
  { id: 'classic', kind: 'board', name: 'クラシック', price: 0, description: '深緑の定番ボード。' },
  { id: 'walnut', kind: 'board', name: 'ウォールナット', price: 80, description: '木目のフレームと暖かなフェルト。' },
  { id: 'ocean', kind: 'board', name: 'オーシャン', price: 120, description: '涼やかなブルーとシルバー。' },
  { id: 'midnight', kind: 'board', name: 'ミッドナイト', price: 180, description: '黒い盤に、落ち着いた金の縁。' },
  { id: 'red', kind: 'color', name: '赤', price: 0, seat: 0 },
  { id: 'blue', kind: 'color', name: '青', price: 0, seat: 1 },
  { id: 'yellow', kind: 'color', name: '黄', price: 0, seat: 2 },
  { id: 'green', kind: 'color', name: '緑', price: 0, seat: 3 },
  { id: 'violet', kind: 'color', name: 'アメジスト', price: 50, seat: 0, description: 'つややかな紫色の駒。' },
  { id: 'coral', kind: 'color', name: 'ローズ', price: 70, seat: 0, description: '明るいピンク色の駒。' },
  { id: 'pearl', kind: 'color', name: 'パール', price: 90, seat: 0, description: 'やわらかな光沢の白い駒。' },
]);
export function normalizeProfile(value) {
  const raw = value && typeof value === 'object' ? value : {};
  const valid = kind => CATALOG.filter(i => i.kind === kind).map(i => i.id);
  const owned = (kind, values) => [...new Set([...CATALOG.filter(i => i.kind === kind && i.price === 0).map(i => i.id), ...(Array.isArray(values) ? values.filter(v => valid(kind).includes(v)) : [])])];
  const ownedBoards = owned('board', raw.ownedBoards), ownedColors = owned('color', raw.ownedColors);
  const integer = v => Number.isSafeInteger(v) && v >= 0 ? Math.min(v, 1000000000) : 0;
  return { version: 1, coins: integer(raw.coins), ownedBoards, ownedColors,
    equippedBoard: ownedBoards.includes(raw.equippedBoard) ? raw.equippedBoard : 'classic',
    equippedColor: ownedColors.includes(raw.equippedColor) ? raw.equippedColor : 'red',
    claimed: [...new Set(Array.isArray(raw.claimed) ? raw.claimed.filter(v => typeof v === 'string' && v.length <= 120).slice(-2000) : [])],
    stats: { played: integer(raw.stats?.played), wins: integer(raw.stats?.wins), draws: integer(raw.stats?.draws) } };
}
export function ownsItem(profile, item) { return (item.kind === 'board' ? profile.ownedBoards : profile.ownedColors).includes(item.id); }
export function purchaseItem(value, id) {
  const profile = normalizeProfile(value), item = CATALOG.find(i => i.id === id);
  if (!item) return { ok: false, profile, reason: '商品が見つかりません' };
  if (ownsItem(profile, item)) return { ok: false, profile, reason: '購入済みです' };
  if (profile.coins < item.price) return { ok: false, profile, reason: `あと${item.price - profile.coins}コイン必要です` };
  profile.coins -= item.price; (item.kind === 'board' ? profile.ownedBoards : profile.ownedColors).push(id);
  return { ok: true, profile, item };
}
export function equipItem(value, id) {
  const profile = normalizeProfile(value), item = CATALOG.find(i => i.id === id);
  if (!item || !ownsItem(profile, item)) return { ok: false, profile, reason: '未購入のアイテムです' };
  profile[item.kind === 'board' ? 'equippedBoard' : 'equippedColor'] = id;
  return { ok: true, profile, item };
}
export function matchReward(difficulty, size) { return (DIFFICULTIES[difficulty] ?? DIFFICULTIES.normal).reward + ({ 6: 0, 8: 10, 10: 25, 12: 40 }[size] ?? 10); }
export function awardMatch(value, match) {
  const profile = normalizeProfile(value), { id, board, human, mode, difficulty } = match;
  const playerCount = match.playerCount ?? 4;
  if (![2,4].includes(playerCount) || match.ending === 'resigned' || mode !== 'solo' || typeof id !== 'string' || !id || id.length > 120 || profile.claimed.includes(id) || !Array.isArray(board) || !BOARD_SIZES.includes(boardSize(board)) || !board.every(v => v === null || PLAYERS.slice(0,playerCount).some(p => p.id === v)) || !PLAYERS.slice(0,playerCount).some(p => p.id === human) || !nextTurn(board, 0, playerCount).ended) return { profile, earned: 0, awarded: false };
  const top = winners(board, playerCount), won = top.includes(human), tied = top.length > 1;
  const earned = won ? Math.floor(matchReward(difficulty, boardSize(board)) / (tied ? 2 : 1)) : 0;
  profile.coins = Math.min(1000000000, profile.coins + earned);
  profile.claimed.push(id); profile.claimed = profile.claimed.slice(-2000);
  profile.stats.played++; if (won) profile.stats[tied ? 'draws' : 'wins']++;
  return { profile, earned, awarded: true };
}
export function playerColors(colorId, mode = 'solo') {
  const selected = CATALOG.find(i => i.kind === 'color' && i.id === colorId) ?? CATALOG.find(i => i.id === 'red');
  const colors = PLAYERS.map(p => ({ id: p.color, name: p.name, seat: p.id }));
  if (mode === 'solo') colors[selected.seat] = selected;
  return { colors, human: selected.seat };
}

// Human color and seat are independent draws. Player IDs still follow 0 → 3,
// so rule, AI and reward calculations do not depend on a particular color.
export function randomSoloLineup(value, random = Math.random) {
  const profile = normalizeProfile(value);
  const pick = length => Math.min(length - 1, Math.max(0, Math.floor(random() * length)));
  const selectedId = profile.ownedColors[pick(profile.ownedColors.length)];
  const selected = CATALOG.find(i => i.id === selectedId);
  const human = pick(4);
  const opponents = CATALOG.filter(i => i.kind === 'color' && i.price === 0 && i.id !== selected.id);
  for (let i = opponents.length - 1; i > 0; i--) { const j = pick(i + 1); [opponents[i], opponents[j]] = [opponents[j], opponents[i]]; }
  const colors = Array.from({ length:4 }, (_,seat) => ({ ...(seat === human ? selected : opponents.shift()), seat }));
  return { human, colors };
}

export function recordResignation(value, match) {
  const profile = normalizeProfile(value);
  if (!match || match.mode !== 'solo' || match.phase !== 'ended' || match.ending !== 'resigned'
    || match.resigned !== match.human || !PLAYERS.some(p => p.id === match.human)
    || typeof match.id !== 'string' || !match.id || match.id.length > 120 || profile.claimed.includes(match.id)) return { profile, recorded: false };
  profile.claimed.push(match.id); profile.claimed = profile.claimed.slice(-2000);
  profile.stats.played++;
  return { profile, recorded: true };
}
