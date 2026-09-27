import { initialBoard, PLAYERS, playMove, nextTurn, scores, winners } from './engine.js';

const $ = s => document.querySelector(s);
const ui = { home: $('#home'), game: $('#game'), board: $('#board'), turn: $('#turn'), scores: $('#scores'), notice: $('#notice'), live: $('#live'), result: $('#result-dialog') };
const preferences = { sound: true, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches };
try { const saved = JSON.parse(localStorage.getItem('four-color-othello.preferences')); if (saved && typeof saved.sound === 'boolean') preferences.sound = saved.sound; if (saved && typeof saved.reducedMotion === 'boolean') preferences.reducedMotion = saved.reducedMotion; } catch { /* Storage is optional. */ }
let state = { board: initialBoard(), player: 0, phase: 'home' };
let epoch = 0, focusIndex = 27, noticeTimer, audio;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const stone = player => `<i aria-hidden="true" class="disc ${PLAYERS[player].color}"></i>`;
const active = run => run === epoch && state.phase !== 'home';

$('#home-board').innerHTML = initialBoard().filter(v => v !== null).map(p => `<span class="demo-cell">${stone(p)}</span>`).join('');
document.querySelectorAll('.rack').forEach(rack => { rack.innerHTML = '<i class="reserve"></i>'.repeat(28); });
for (let row = 0; row < 8; row++) {
  const line = document.createElement('div'); line.className = 'board-row'; line.setAttribute('role', 'row');
  for (let col = 0; col < 8; col++) {
    const cell = document.createElement('button'), index = row * 8 + col;
    cell.className = 'cell'; cell.type = 'button'; cell.dataset.index = index;
    cell.setAttribute('role', 'gridcell'); cell.tabIndex = index === focusIndex ? 0 : -1;
    cell.addEventListener('click', () => { setFocus(index, false); void moveAt(index); });
    cell.addEventListener('keydown', event => {
      const keys = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
      if (!keys[event.key]) return;
      event.preventDefault();
      const [dr, dc] = keys[event.key];
      setFocus(Math.max(0, Math.min(7, row + dr)) * 8 + Math.max(0, Math.min(7, col + dc)), true);
    });
    line.append(cell);
  }
  ui.board.append(line);
}
const cells = [...ui.board.querySelectorAll('.cell')];
function setFocus(index, focus) { cells[focusIndex].tabIndex = -1; focusIndex = index; cells[index].tabIndex = 0; if (focus) cells[index].focus({ preventScroll: true }); }
function updateCell(index) {
  const player = state.board[index], cell = cells[index];
  cell.innerHTML = player === null ? '' : stone(player);
  cell.dataset.player = player === null ? '' : String(player);
  cell.setAttribute('aria-label', `${Math.floor(index / 8) + 1}行${index % 8 + 1}列、${player === null ? '空きマス' : PLAYERS[player].name + 'の石'}`);
}
function renderBoard() { cells.forEach((_, index) => updateCell(index)); }
function renderStatus() {
  const player = PLAYERS[state.player], counts = scores(state.board);
  ui.turn.innerHTML = `${stone(player.id)}<span>${player.name}の番</span>`;
  ui.turn.dataset.player = String(player.id);
  ui.scores.innerHTML = PLAYERS.map(p => `<div class="score" data-player="${p.id}" aria-label="${p.name} ${counts[p.id]}枚">${stone(p.id)}<span>${p.name} <b>${counts[p.id]}</b><small>枚</small></span></div>`).join('');
  updateInputState();
}
function updateInputState() {
  ui.game.dataset.phase = state.phase;
  ui.board.setAttribute('aria-busy', String(state.phase === 'animating'));
  cells.forEach((cell, i) => cell.setAttribute('aria-disabled', String(state.phase !== 'playing' || state.board[i] !== null)));
}
function announce(text) { ui.live.textContent = text; }
function hideNotice() { clearTimeout(noticeTimer); ui.notice.hidden = true; ui.notice.textContent = ''; }
function showNotice(text, detail = '') {
  hideNotice();
  const title = document.createElement('strong'); title.textContent = text; ui.notice.append(title);
  if (detail) { const line = document.createElement('span'); line.textContent = detail; ui.notice.append(line); }
  ui.notice.hidden = false;
}
function sound(kind = 'place') {
  if (!preferences.sound) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') void audio.resume().catch(() => {});
    const oscillator = audio.createOscillator(), gain = audio.createGain(), now = audio.currentTime;
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(kind === 'place' ? 390 : 620, now);
    oscillator.frequency.exponentialRampToValueAtTime(100, now + .07);
    gain.gain.setValueAtTime(.075, now); gain.gain.exponentialRampToValueAtTime(.001, now + .09);
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(now); oscillator.stop(now + .1);
  } catch { /* Audio support never blocks gameplay. */ }
}
async function flipStone(index, delay, run) {
  if (preferences.reducedMotion) { if (active(run)) updateCell(index); return; }
  await pause(delay);
  if (!active(run)) return;
  const disc = cells[index].firstElementChild;
  if (!disc?.animate) { updateCell(index); return; }
  const out = disc.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(90deg)' }], { duration: 160, easing: 'ease-in', fill: 'forwards' });
  await out.finished.catch(() => {});
  if (!active(run)) return;
  out.cancel(); updateCell(index);
  const into = cells[index].firstElementChild.animate([{ transform: 'rotateY(-90deg)' }, { transform: 'rotateY(0deg)' }], { duration: 190, easing: 'ease-out' });
  await into.finished.catch(() => {});
}
async function moveAt(index) {
  if (state.phase !== 'playing') return { ok: false, reason: '手番の切り替え中です' };
  const result = playMove(state.board, state.player, index);
  if (!result) {
    showNotice('ここには置けません', '相手の石をはさめるマスに置いてください');
    noticeTimer = setTimeout(hideNotice, 1300);
    return { ok: false, reason: 'ここでは石をはさめません' };
  }
  hideNotice();
  const run = epoch, player = state.player;
  state.phase = 'animating'; state.board = result.board; updateInputState(); updateCell(index); sound();
  const placed = cells[index].firstElementChild;
  if (!preferences.reducedMotion) placed.animate?.([{ transform: 'translateY(-10px) scale(1.07)', opacity: .4 }, { transform: 'translateY(0) scale(1)', opacity: 1 }], { duration: 180, easing: 'ease-out' });
  await Promise.all(result.flips.map(i => flipStone(i, 100 + 60 * Math.max(Math.abs(Math.floor(i / 8) - Math.floor(index / 8)), Math.abs(i % 8 - index % 8)), run)));
  if (!active(run)) return { ok: false, reason: 'ゲームが終了しました' };
  renderStatus(); sound('flip');
  announce(`${PLAYERS[player].name}が${result.flips.length}枚ひっくり返しました。`);
  await advanceTurn(player, run);
  return { ok: true, flipped: result.flips.length, ...snapshot() };
}
async function advanceTurn(player, run) {
  const next = nextTurn(state.board, player);
  if (next.ended && !state.board.includes(null)) { finish(); return; }
  for (const skipped of next.skipped) {
    if (!active(run)) return;
    state.player = skipped; state.phase = 'skipping'; renderStatus();
    showNotice(`${PLAYERS[skipped].name}は置ける場所がありません`, 'スキップします');
    await pause(1500);
  }
  if (!active(run)) return;
  hideNotice();
  if (next.ended) { finish(); return; }
  state.player = next.player; state.phase = 'playing'; renderStatus();
  announce(`${PLAYERS[state.player].name}の番です。`);
}
function finish() {
  state.phase = 'ended'; hideNotice(); updateInputState();
  const counts = scores(state.board), winning = winners(state.board);
  const label = winning.map(id => PLAYERS[id].name).join('・');
  $('#result-title').textContent = winning.length === 1 ? `${label}の勝ち！` : `${label}の引き分け！`;
  $('#result-scores').innerHTML = [...PLAYERS].sort((a, b) => counts[b.id] - counts[a.id]).map(p => `<div class="result-row${winning.includes(p.id) ? ' winner' : ''}">${stone(p.id)}<span>${p.name}</span><b>${counts[p.id]}<small>枚</small></b></div>`).join('');
  ui.result.showModal(); announce(`${$('#result-title').textContent} ゲーム終了です。`);
}
function closeDialogs() { document.querySelectorAll('dialog[open]').forEach(d => d.close()); }
function startGame() {
  ++epoch; hideNotice(); closeDialogs(); state = { board: initialBoard(), player: 0, phase: 'playing' };
  ui.home.hidden = true; ui.game.hidden = false; document.body.classList.add('playing');
  renderBoard(); renderStatus(); setFocus(27, false); announce('ゲーム開始。赤の番です。');
}
function goHome() {
  ++epoch; state.phase = 'home'; hideNotice(); closeDialogs();
  ui.home.hidden = false; ui.game.hidden = true; document.body.classList.remove('playing');
  $('#start').focus({ preventScroll: true });
}
$('#start').addEventListener('click', () => { if (location.hash !== '#play') location.hash = 'play'; else startGame(); });
$('#again').addEventListener('click', startGame);
$('#home-button').addEventListener('click', () => { location.hash = ''; });
window.addEventListener('hashchange', () => { if (location.hash === '#play') startGame(); else goHome(); });
ui.result.addEventListener('cancel', event => { event.preventDefault(); location.hash = ''; });
for (const name of ['rules', 'settings']) $(`#${name}-open`).addEventListener('click', () => $(`#${name}-dialog`).showModal());
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('dialog:not(#result-dialog)').forEach(dialog => dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
}));
for (const [id, key] of [['sound-setting', 'sound'], ['motion-setting', 'reducedMotion']]) {
  $('#' + id).checked = preferences[key];
  $('#' + id).addEventListener('change', event => { preferences[key] = event.target.checked; try { localStorage.setItem('four-color-othello.preferences', JSON.stringify(preferences)); } catch { /* Optional persistence. */ } });
}
function snapshot() { return { phase: state.phase, player: state.player, board: state.board.slice(), scores: scores(state.board) }; }
function registerTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
  const tools = [
    { name: 'read_othello_game', title: '盤面を読む', description: '現在の盤面と手番と枚数を読む。色は0=赤、1=青、2=黄、3=緑、空きはnull。', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: () => snapshot() },
    { name: 'place_othello_stone', title: '石を置く', description: '進行中のゲームで1枚置く。行・列は1〜8。はさめない場所には置けない。演出と自動パス後に結果を返す。', inputSchema: { type: 'object', properties: { row: { type: 'integer', minimum: 1, maximum: 8 }, column: { type: 'integer', minimum: 1, maximum: 8 } }, required: ['row', 'column'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: input => { if (!input || Object.keys(input).some(k => !['row', 'column'].includes(k)) || ![input.row, input.column].every(v => Number.isInteger(v) && v >= 1 && v <= 8)) throw new Error('行と列は1〜8の整数で指定してください'); return moveAt((input.row - 1) * 8 + input.column - 1); } },
  ];
  for (const tool of tools) { try { Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch { /* Optional browser integration. */ } }
}
registerTools();
if (location.hash === '#play') startGame();
