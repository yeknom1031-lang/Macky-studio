import { initialBoard, PLAYERS, BOARD_SIZES, legalMoves, firstRoundMoves, playMove, nextTurn, scores, winners } from './engine.js';
import { chooseAIMove, DIFFICULTIES } from './ai.js';
import { canResign, endByResignation } from './match.js';
import { CATALOG, normalizeProfile, ownsItem, purchaseItem, equipItem, matchReward, awardMatch, recordResignation, playerColors, randomSoloLineup } from './progression.js';

import { createStoneAudio } from './audio.js';
import { installStoneTextures, paintStone, createCellEffects } from './rendering.js';

const $ = s => document.querySelector(s);
const ui = { home: $('#home'), game: $('#game'), board: $('#board'), turn: $('#turn'), scores: $('#scores'), notice: $('#notice'), live: $('#live'), result: $('#result-dialog') };
const STORAGE = { prefs: 'four-color-othello.preferences', profile: 'four-color-othello.profile' };
function normalizePreferences(raw = {}) {
  raw = raw && typeof raw === 'object' ? raw : {};
  return { volume: typeof raw.volume === 'number' && Number.isFinite(raw.volume) ? Math.min(1,Math.max(0,raw.volume)) : .75, sound: typeof raw.sound === 'boolean' ? raw.sound : true, music: typeof raw.music === 'boolean' ? raw.music : true, reducedMotion: typeof raw.reducedMotion === 'boolean' ? raw.reducedMotion : matchMedia('(prefers-reduced-motion: reduce)').matches, hints: raw.hints === true, difficulty: Object.hasOwn(DIFFICULTIES, raw.difficulty) ? raw.difficulty : 'normal', size: BOARD_SIZES.includes(raw.size) ? raw.size : 8 };
}
function readSave(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
let preferences = normalizePreferences(readSave(STORAGE.prefs));
let profile = normalizeProfile(readSave(STORAGE.profile));
let state = { board: initialBoard(), player: 0, phase: 'home', mode: 'solo', size: 8, human: 0, colors: playerColors('red').colors };
const stoneAudio = createStoneAudio(() => preferences, () => new (window.AudioContext || window.webkitAudioContext)());
const cellEffects = createCellEffects();
let storageWorking = true;
let epoch = 0, cells = [], focusIndex = 0, noticeTimer, setupMode = 'solo', setupCount = 4, lastConfig, resumeWaiters = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const piece = color => `<i aria-hidden="true" class="disc ${color}"></i>`;
const stone = player => piece(state.colors[player].id);
const nameOf = player => state.colors[player].name;
const matchPlayers = () => PLAYERS.slice(0,state.colors.length);
const winningPlayers = () => winners(state.board,state.colors.length);
const active = run => run === epoch && !['home', 'ended'].includes(state.phase);
function cancelRun() {
  stoneAudio.stop(); cellEffects.clear(); ++epoch; const waiters = resumeWaiters; resumeWaiters = []; waiters.forEach(resolve => resolve());
  ui.board.getAnimations?.({ subtree: true }).forEach(animation => animation.cancel());
  cells.forEach(cell => cell.classList.remove('is-flipping'));
}
const isPaused = () => state.phase !== 'home' && !!document.querySelector('dialog[open]');
function persist() {
  try { localStorage.setItem(STORAGE.prefs, JSON.stringify(preferences)); localStorage.setItem(STORAGE.profile, JSON.stringify(profile)); $('#storage-message').hidden = true; storageWorking = true; }
  catch { storageWorking = false; $('#storage-message').textContent = 'このブラウザでは保存できません。設定の「データを書き出す」で残せます。'; $('#storage-message').hidden = false; }
}
function wake() { if (!isPaused()) { const waiters = resumeWaiters; resumeWaiters = []; waiters.forEach(resolve => resolve()); } updateInputState(); }
async function ready(run) { while (active(run) && isPaused()) await new Promise(resolve => resumeWaiters.push(resolve)); return active(run); }
function openDialog(id) { if (!$(id).open) { $(id).showModal(); $(id).scrollTop = 0; } updateInputState(); }
function closeDialogs() { document.querySelectorAll('dialog[open]').forEach(d => d.close()); }
function announce(text) { ui.live.textContent = text; }
function renderHome() {
  const palette = playerColors(profile.equippedColor).colors;
  const rack = p => `<div class="rack rack-${['top','right','bottom','left'][p]} ${palette[p].id}"></div>`;
  $('#home-board').innerHTML = [0,1,2,3].map(rack).join('') + `<div class="board hero-grid">${initialBoard().map(p => `<span class="cell">${p === null ? '' : piece(palette[p].id)}</span>`).join('')}</div>`;
  $('#home-theme-name').textContent = CATALOG.find(item => item.id === profile.equippedBoard).name;
  $('#home-board').dataset.theme = profile.equippedBoard;
  document.querySelectorAll('.coin-balance').forEach(el => { el.textContent = `${profile.coins.toLocaleString('ja-JP')} コイン`; });
  $('#home-record').textContent = profile.stats.played ? `${profile.stats.wins} 勝 · ${profile.stats.draws} 引き分け · ${profile.stats.played} 対局` : '次の色は、対局が始まるお楽しみ。';
}
function buildBoard() {
  const n = state.size; focusIndex = (n / 2 - 1) * n + n / 2 - 1;
  ui.board.replaceChildren(); ui.board.style.setProperty('--grid-size', n);
  ui.board.setAttribute('aria-label', `Irodoryの盤面、${n}行${n}列、${state.colors.length}色`); ui.board.setAttribute('aria-rowcount', n); ui.board.setAttribute('aria-colcount', n);
  for (let row = 0; row < n; row++) {
    const line = document.createElement('div'); line.className = 'board-row'; line.setAttribute('role', 'row');
    for (let col = 0; col < n; col++) {
      const cell = document.createElement('button'), index = row * n + col;
      cell.className = 'cell'; cell.type = 'button'; cell.dataset.index = index; cell.setAttribute('role', 'gridcell'); cell.tabIndex = index === focusIndex ? 0 : -1;
      cell.addEventListener('click', () => { setFocus(index, false); void moveAt(index); });
      cell.addEventListener('keydown', event => {
        const keys = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
        if (!keys[event.key]) return;
        event.preventDefault(); const [dr, dc] = keys[event.key];
        setFocus(Math.max(0, Math.min(n - 1, row + dr)) * n + Math.max(0, Math.min(n - 1, col + dc)), true);
      }); line.append(cell);
    } ui.board.append(line);
  }
  cells = [...ui.board.querySelectorAll('.cell')];
  $('#board-shell').querySelectorAll('.rack').forEach((rack, p) => { const color = state.colors[state.colors.length === 2 ? (p === 2 ? 1 : 0) : p]; rack.hidden = state.colors.length === 2 && (p === 1 || p === 3); rack.className = `rack rack-${['top','right','bottom','left'][p]} ${color.id}`; rack.replaceChildren(); });
  $('#board-shell').dataset.theme = state.theme;
}
function setFocus(index, focus) { if (cells[focusIndex]) cells[focusIndex].tabIndex = -1; focusIndex = index; cells[index].tabIndex = 0; if (focus) cells[index].focus({ preventScroll: true }); }
function updateCell(index) {
  const player = state.board[index], cell = cells[index]; paintStone(cell, player === null ? null : state.colors[player].id, document); cell.dataset.player = player === null ? '' : String(player);
  cell.setAttribute('aria-label', `${Math.floor(index / state.size) + 1}行${index % state.size + 1}列、${player === null ? '空きマス' : nameOf(player) + 'の石'}`);
}
let scoreKey = '', turnKey = '', scoreNodes = [];
function renderStatus() {
  const counts = scores(state.board), p = state.player;
  const who = state.mode === 'solo' ? (p === state.human ? 'あなた' : state.phase === 'thinking' ? 'AI・考え中' : 'AI') : '';
  const nextTurnKey = `${state.colors[p].id}:${who}`;
  if (turnKey !== nextTurnKey) {
    turnKey = nextTurnKey;
    ui.turn.innerHTML = `${stone(p)}<span>${nameOf(p)}の番${who ? `<small class="turn-who">${who}</small>` : ''}</span><span class="menu-chevron" aria-hidden="true">⌄</span>`;
    ui.turn.className = `turn ${state.colors[p].id}`;
    ui.turn.dataset.player = String(p); ui.turn.setAttribute('aria-label', `${nameOf(p)}の番${who ? '、' + who : ''}。対局メニューを開く`);
  }
  const nextScoreKey = `${state.mode}:${state.human}:${state.colors.map(c => c.id).join(',')}`;
  if (scoreKey !== nextScoreKey) {
    scoreKey = nextScoreKey;
    ui.scores.innerHTML = matchPlayers().map(p => `<div class="score ${state.colors[p.id].id}" data-player="${p.id}">${stone(p.id)}<span><span class="score-name">${nameOf(p.id)}</span> <b></b><small>枚</small></span>${state.mode === 'solo' && p.id === state.human ? '<em class="score-owner">あなた</em>' : ''}</div>`).join('');
    scoreNodes = [...ui.scores.querySelectorAll('.score')].map(row => ({ row, count:row.querySelector('b') }));
  }
  scoreNodes.forEach(({row,count}, player) => {
    const value = String(counts[player]);
    if (count.textContent !== value) count.textContent = value;
    row.classList.toggle('is-current', player === state.player);
    const label = `${nameOf(player)} ${value}枚`;
    if (row.getAttribute('aria-label') !== label) row.setAttribute('aria-label', label);
  });
  updateInputState();
}
function updateInputState() {
  ui.game.dataset.phase = state.phase;
  ui.board.setAttribute('aria-busy', String(['intro', 'animating', 'thinking'].includes(state.phase)));
  const canPlay = state.phase === 'playing' && !isPaused();
  const available = canPlay && preferences.hints ? turnMoves(state.board,state.player) : [];
  const hints = new Set(canPlay && preferences.hints ? available : []);
  cells.forEach((cell, i) => { const disabled = String(!canPlay || state.board[i] !== null); if (cell.getAttribute('aria-disabled') !== disabled) cell.setAttribute('aria-disabled', disabled); cell.classList.toggle('legal-hint', hints.has(i)); if (hints.has(i)) cell.setAttribute('aria-description', 'ここに置けます'); else cell.removeAttribute('aria-description'); });
}
function hideNotice() { clearTimeout(noticeTimer); ui.notice.hidden = true; ui.notice.textContent = ''; }
function showNotice(text, detail = '') {
  hideNotice(); const title = document.createElement('strong'); title.textContent = text; ui.notice.append(title);
  if (detail) { const line = document.createElement('span'); line.textContent = detail; ui.notice.append(line); } ui.notice.hidden = false;
}
function turnMoves(board, player) {
  return firstRoundMoves(board,player,state.movedPlayers);
}
function nextPlayableTurn(board, player) {
  const skipped = [];
  for(let step=1;step<=state.colors.length;step++) {
    const candidate=(player+step)%state.colors.length;
    if(turnMoves(board,candidate).length) return {player:candidate,skipped,ended:false};
    skipped.push(candidate);
  }
  return {player:null,skipped,ended:true};
}
function sound(kind = 'place', index = Math.floor(state.board.length / 2)) {
  if (isPaused() || document.hidden) return;
  stoneAudio.hit(kind, ((index % state.size) / (state.size - 1) - .5) * .8);
}
async function landStone(index, run) {
  const disc = cells[index].firstElementChild;
  if (!preferences.reducedMotion && disc?.animate) {
    const drop = disc.animate([
      { transform:'translateY(-16px) scale(1.08)', opacity:.25 },
      { transform:'translateY(0) scale(1.025,.97)', opacity:1, offset:.72 },
      { transform:'translateY(-2px) scale(1)', offset:.86 },
      { transform:'translateY(0) scale(1)' }
    ], { duration:205, easing:'cubic-bezier(.22,.7,.3,1)' });
    await pause(145); if (active(run)) sound('place',index);
    try { await drop.finished.catch(() => {}); } finally { drop.cancel(); }
  } else if (active(run)) sound('place',index);
}
async function flipStone(index, delay, run) {
  if (preferences.reducedMotion) { if (active(run)) updateCell(index); return; }
  await pause(delay); if (!active(run)) return;
  const cell = cells[index], disc = cell.firstElementChild;
  if (!disc?.animate) { updateCell(index); sound('flip',index); return; }
  let out, into;
  cell.classList.add('is-flipping');
  try {
    out = disc.animate([{ transform:'translateY(0) rotateY(0deg)' }, { transform:'translateY(-7px) rotateY(90deg)' }], { duration:130, easing:'ease-in', fill:'forwards' });
    await out.finished.catch(() => {}); if (!active(run)) return;
    out.cancel(); updateCell(index);
    into = disc.animate([
      { transform:'translateY(-7px) rotateY(-90deg)' },
      { transform:'translateY(0) rotateY(0deg) scale(1.025,.97)', offset:.78 },
      { transform:'translateY(-1px) scale(1)', offset:.9 },
      { transform:'translateY(0) rotateY(0deg)' }
    ], { duration:220, easing:'ease-out' });
    await pause(172); if (active(run)) sound('flip',index);
    await into.finished.catch(() => {});
  } finally { out?.cancel(); into?.cancel(); cell.classList.remove('is-flipping'); }
}
async function moveAt(index, actor = 'human') {
  const ai = state.mode === 'solo' && state.player !== state.human;
  if (isPaused()) return { ok: false, reason: 'メニューを閉じると対局に戻ります' };
  if (actor === 'human' && ai) return { ok: false, reason: 'AIの手番です' };
  if (state.phase !== (actor === 'ai' ? 'thinking' : 'playing') || (actor === 'ai' && !ai)) return { ok: false, reason: '手番の切り替え中です' };
  const result = playMove(state.board, state.player, index);
  if (!result) { showNotice('ここには置けません', '相手の石をはさめるマスに置いてください'); noticeTimer = setTimeout(hideNotice, 1300); return { ok: false, reason: 'ここでは石をはさめません' }; }
  if (!turnMoves(state.board,state.player).includes(index)) {
    showNotice('まだ最初の手番中です','まだ一度も打っていない色が０枚になる手は置けません');
    noticeTimer = setTimeout(hideNotice, 1650); return {ok:false,reason:'初手の保護中は未着手の色を０枚にできません'};
  }
  hideNotice(); const run = epoch, player = state.player, n = state.size;
  state.movedPlayers[player] = true;
  state.phase = 'animating'; state.board = result.board; updateInputState(); updateCell(index);
  if (!preferences.reducedMotion) cellEffects.pulse(cells[index]);
  const animatedFlips=result.flips.length>8?[]:result.flips;
  if(result.flips.length>8) result.flips.forEach(updateCell);
  await Promise.all([landStone(index,run), ...animatedFlips.map(i => flipStone(i, 175 + 55 * Math.max(Math.abs(Math.floor(i / n) - Math.floor(index / n)), Math.abs(i % n - index % n)), run))]);
  if (!active(run)) return { ok: false, reason: 'ゲームが終了しました' };
  renderStatus(); if (preferences.reducedMotion || result.flips.length>8) sound('flip',index); announce(`${nameOf(player)}が${result.flips.length}枚ひっくり返しました。`); await advanceTurn(player, run);
  return { ok: true, flipped: result.flips.length, ...snapshot() };
}
async function advanceTurn(player, run) {
  if (!await ready(run)) return;
  const next = nextPlayableTurn(state.board, player);
  if (next.ended && !state.board.includes(null)) { finish(); return; }
  for (const skipped of next.skipped) {
    if (!await ready(run)) return;
    state.player = skipped; state.phase = 'skipping'; renderStatus();
    const safeOpening = state.colors.length === 4 && !state.movedPlayers.every(Boolean);
    showNotice(`${nameOf(skipped)}は${safeOpening && legalMoves(state.board,skipped).length ? '初手の保護で今回はパス' : '置ける場所がありません'}`, safeOpening ? '全員が一度打つまでは、どの色も０枚になりません' : '次の人に進みます');
    await pause(1500);
  }
  if (!await ready(run)) return;
  hideNotice(); if (next.ended) { finish(); return; } state.player = next.player; beginTurn(run); announce(`${nameOf(state.player)}の番です。`);
}
function beginTurn(run) {
  if (!active(run)) return;
  const ai = state.mode === 'solo' && state.player !== state.human; state.phase = ai ? 'thinking' : 'playing'; renderStatus(); if (ai) void takeAITurn(run);
}
async function takeAITurn(run) {
  await pause(preferences.reducedMotion ? 300 : 600);
  if (!await ready(run) || state.phase !== 'thinking') return;
  const allowedMoves=turnMoves(state.board,state.player);
  const width=state.size>=10 && state.difficulty==='hard' ? 2 : 3;
  const index = chooseAIMove(state.board, state.player, { difficulty: state.difficulty, width, allowedMoves, playerCount:state.colors.length });
  if (!active(run)) return;
  if (index === null) { await advanceTurn(state.player, run); return; } await moveAt(index, 'ai');
}
function finish() {
  if (state.phase === 'ended') return;
  state.phase = 'ended'; state.ending = 'completed'; hideNotice(); renderStatus();
  const humanWon = winningPlayers().includes(state.human), draw = winningPlayers().length > 1;
  const outcome = state.mode === 'friends' ? (draw ? 'draw' : 'win') : humanWon ? (draw ? 'draw' : 'win') : 'loss';
  decorateResult(outcome); if (outcome === 'win') stoneAudio.celebrate();
  $('#result-context').textContent = '最終スコア';
  const counts = scores(state.board), winning = winningPlayers(), label = winning.map(nameOf).join('・');
  $('#result-title').textContent = winning.length === 1 ? `${label}の勝ち！` : `${label}の引き分け！`;
  $('#result-scores').innerHTML = [...matchPlayers()].sort((a, b) => counts[b.id] - counts[a.id]).map(p => `<div class="result-row${winning.includes(p.id) ? ' winner' : ''}">${stone(p.id)}<span>${nameOf(p.id)}${state.mode === 'solo' && p.id === state.human ? '<small>（あなた）</small>' : ''}</span><b>${counts[p.id]}<small>枚</small></b></div>`).join('');
  // Merge the latest profile if another local tab finished a game or bought an item.
  if (storageWorking) profile = normalizeProfile(readSave(STORAGE.profile) ?? profile);
  const awarded = awardMatch(profile, state); profile = awarded.profile; persist(); renderHome();
  $('#result-reward').textContent = state.mode === 'friends' ? 'みんなで対戦、ありがとう！' : awarded.earned ? `${winning.length > 1 ? '引き分け' : '勝利'}ボーナス ＋${awarded.earned} コイン！　合計 ${profile.coins} コイン` : `次の一局で勝利をめざそう！　所持 ${profile.coins} コイン`;
  openDialog('#result-dialog'); announce(`${$('#result-title').textContent} ${$('#result-reward').textContent}`);
}
function decorateResult(outcome) {
  ui.result.dataset.outcome = outcome;
  $('#result-sparks').innerHTML = outcome === 'win' && !preferences.reducedMotion ? Array.from({length:22},(_,i) => `<i style="--x:${(i * 47) % 100}%;--delay:${(i % 7) * .075}s;--spin:${(i % 2 ? 1 : -1) * (120 + i * 13)}deg"></i>`).join('') : '';
  $('#result-eyebrow').textContent = { win:'VICTORY', draw:'DRAW', loss:'MATCH FINISHED', resigned:'RESIGNED' }[outcome];
  const flag = '<path d="M14 34V8m0 1c8-7 12 7 20 0v16c-8 7-12-7-20 0M9 36h10"/>';
  const trophy = '<path d="M15 8h18v9c0 8-4 12-9 12s-9-4-9-12V8Zm0 3H8v6c0 5 4 8 9 8m16-14h7v6c0 5-4 8-9 8M24 29v8m-8 2h16"/>';
  $('#result-symbol').innerHTML = `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${outcome === 'resigned' ? flag : trophy}</svg>`;
}
function resignGame() {
  const ended = endByResignation(state);
  if (!ended) { $('#resign-dialog').close(); return; }
  cancelRun(); state = ended; hideNotice(); $('#match-intro').hidden = true; closeDialogs();
  cells.forEach((_, i) => updateCell(i)); renderStatus();
  if (storageWorking) profile = normalizeProfile(readSave(STORAGE.profile) ?? profile);
  profile = recordResignation(profile, state).profile; persist(); renderHome(); decorateResult('resigned');
  $('#result-title').textContent = `${nameOf(state.resigned)}が降参`;
  $('#result-context').textContent = '降参時の枚数・順位なし';
  const counts = scores(state.board);
  $('#result-scores').innerHTML = matchPlayers().map(p => `<div class="result-row">${stone(p.id)}<span>${nameOf(p.id)}${p.id === state.resigned ? '<small>（降参）</small>' : ''}</span><b>${counts[p.id]}<small>枚</small></b></div>`).join('');
  $('#result-reward').textContent = state.mode === 'solo' ? '敗北を記録。コインは変わりません。' : '対局を終了。コインは変わりません。';
  openDialog('#result-dialog'); announce(`${nameOf(state.resigned)}が降参しました。対局終了です。`);
}
function startGame(config = lastConfig) {
  cancelRun(); hideNotice(); closeDialogs();
  stoneAudio.unlock();
  const palette = config.playerCount === 2 ? { colors:[{id:'black',name:'黒',seat:0},{id:'white',name:'白',seat:1}], human:config.mode === 'solo' ? Math.floor(Math.random()*2) : 0 } : config.mode === 'solo' ? randomSoloLineup(profile) : playerColors('red','friends'); lastConfig = { ...config };
  state = { ...config, ...palette, id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`, board: initialBoard(config.size, config.playerCount ?? 4), player: 0, phase: 'playing', movedPlayers:Array(config.playerCount ?? 4).fill(false) };
  ui.home.hidden = true; ui.game.hidden = false; document.body.classList.add('playing');
  ui.game.dataset.playerCount = String(state.colors.length);
  buildBoard(); cells.forEach((_, i) => updateCell(i));
  state.phase = 'intro'; renderStatus();
  $('#intro-title').textContent = state.mode === 'solo' ? `あなたは${nameOf(state.human)}` : '対局開始';
  $('#intro-detail').textContent = state.mode === 'solo' ? `${state.human + 1}番目の手番です` : state.colors.length === 2 ? '黒と白で、勝負。' : '４つの色で、勝負。';
  $('#intro-pieces').innerHTML = state.colors.map((color,p) => `<span class="intro-seat${state.mode === 'solo' && p === state.human ? ' is-you' : ''}">${stone(p)}<small>${p + 1}${state.mode === 'solo' && p === state.human ? ' · あなた' : ''}</small></span>`).join('');
  $('#match-intro').hidden = false; void enterGame(epoch);
  wake(); setFocus(focusIndex, true); announce(state.mode === 'solo' ? `あなたは${nameOf(state.human)}、${state.human + 1}番目です。${nameOf(0)}から開始します。` : `ゲーム開始。${nameOf(0)}から開始します。`);
  if (location.hash !== '#play') history.pushState(null, '', '#play');
}
async function enterGame(run) {
  await pause(preferences.reducedMotion ? 1600 : 2500); if (!await ready(run)) return; $('#match-intro').hidden = true; beginTurn(run);
}
function goHome() {
  cancelRun(); state.phase = 'home'; $('#match-intro').hidden = true; hideNotice(); closeDialogs(); wake();
  ui.home.hidden = false; ui.game.hidden = true; document.body.classList.remove('playing'); renderHome();
  if (location.hash) history.replaceState(null, '', location.pathname + location.search); $('#start').focus({ preventScroll: true });
}
function setup(mode, count = 4) {
  setupCount = count; setupMode = mode;
  $('#classic-mode-field').hidden = count !== 2;
  $('#classic-mode-field input[value="solo"]').checked = true; $('#setup-title').textContent = mode === 'solo' ? 'ひとりで遊ぶ' : '4人で遊ぶ'; $('#difficulty-field').hidden = $('#color-field').hidden = mode !== 'solo';
  $('#difficulty-options').innerHTML = Object.entries(DIFFICULTIES).map(([id, d]) => `<label class="choice"><input type="radio" name="difficulty" value="${id}" ${id === preferences.difficulty ? 'checked' : ''}><span>${d.label}</span></label>`).join('');
  $('#size-options').innerHTML = BOARD_SIZES.map(n => `<label class="choice"><input type="radio" name="size" value="${n}" ${n === (count === 2 ? 8 : preferences.size) ? 'checked' : ''}><span>${n} × ${n}</span></label>`).join('');
  $('#color-options').innerHTML = profile.ownedColors.map(id => `<span class="draw-color">${piece(id)}</span>`).join('');
  $('#setup-hints').checked = preferences.hints; setupNotes(); openDialog('#setup-dialog');
}
function setupNotes() {
  if (setupCount === 2) setupMode = $('#classic-mode-field input:checked').value;
  $('#setup-title').textContent = setupCount === 2 ? '通常の２色オセロ' : setupMode === 'solo' ? 'ひとりで遊ぶ' : '4人で遊ぶ';
  $('#difficulty-field').hidden = setupMode !== 'solo';
  $('#color-field').hidden = setupMode !== 'solo' || setupCount === 2;
  $('#size-note').textContent = setupCount === 2 ? '8 × 8 が通常の広さ。中央に黒２枚・白２枚、黒から開始。' : '8 × 8 が基本。中央に各色４枚ずつ、合計16枚。';
  const difficulty = $('#difficulty-options input:checked')?.value ?? preferences.difficulty, size = Number($('#size-options input:checked')?.value ?? preferences.size);
  $('#difficulty-description').textContent = DIFFICULTIES[difficulty].description;
  $('#color-note').textContent = '持っている色から１色、手番は１〜４番目から毎回抽選。購入した色も候補に加わります。';
  $('#setup-reward').textContent = setupMode === 'solo' ? `勝つと ${matchReward(difficulty, size)} コイン。最多で引き分けると半分。` : setupCount === 2 ? '黒 → 白の順に、２人で交代します。' : '赤 → 青 → 黄 → 緑の順に、みんなで交代します。';
}
function syncSettings() { stoneAudio.sync(); $('#sound-volume').value = String(Math.round(preferences.volume * 100)); $('#volume-value').textContent = `${Math.round(preferences.volume * 100)}%`; $('#sound-volume').disabled = $('#sound-preview').disabled = !preferences.sound; $('#music-setting').checked=preferences.music; document.body.classList.toggle('reduce-motion', preferences.reducedMotion); for (const [id,key] of [['sound-setting','sound'],['motion-setting','reducedMotion'],['hints-setting','hints'],['setup-hints','hints']]) $('#' + id).checked = preferences[key]; }
function renderShop() {
  renderHome();
  for (const kind of ['board', 'color']) {
    const items = CATALOG.filter(i => i.kind === kind);
    $('#' + kind + '-products').innerHTML = items.map(item => {
      const owned = ownsItem(profile, item), equipped = kind === 'board' && profile.equippedBoard === item.id;
      const preview = kind === 'board' ? `<div class="board-swatch" data-theme="${item.id}"><div>${piece('red')}${piece('blue')}${piece('green')}${piece('yellow')}</div></div>` : `<div class="color-swatch">${piece(item.id)}</div>`;
      return `<article class="product${equipped ? ' equipped' : ''}">${preview}<h4>${item.name}</h4><p>${item.description ?? '最初から使える基本の色。'}</p><button class="product-action" data-item="${item.id}" ${(kind === 'color' && owned) || (kind === 'board' && equipped) || (!owned && profile.coins < item.price) ? 'disabled' : ''}>${kind === 'color' && owned ? '抽選の対象' : equipped ? '使用中' : owned ? '使う' : `${item.price} コインで購入`}</button>${!owned && profile.coins < item.price ? `<small>あと ${item.price - profile.coins} コイン</small>` : '<small> </small>'}</article>`;
    }).join('');
  }
}
$('#shop-dialog').addEventListener('click', event => {
  const button = event.target.closest('[data-item]'); if (!button || button.disabled) return;
  const item = CATALOG.find(i => i.id === button.dataset.item); if (!item) return;
  if (storageWorking) profile = normalizeProfile(readSave(STORAGE.profile) ?? profile);
  let result = ownsItem(profile, item) ? { ok: true, profile } : purchaseItem(profile, item.id);
  if (result.ok && item.kind === 'board') result = equipItem(result.profile, item.id);
  if (result.ok) { profile = result.profile; persist(); renderShop(); $('#shop-message').textContent = item.kind === 'color' ? `${item.name}が色の抽選に加わりました。` : `${item.name}を選びました。次の対局から使えます。`; $('#shop-dialog [data-item="' + item.id + '"]')?.closest('.product')?.scrollIntoView({ block: 'nearest' }); }
  else $('#shop-message').textContent = result.reason;
});
$('#start').addEventListener('click', () => setup('solo')); $('#friends-open').addEventListener('click', () => setup('friends'));
$('#classic-open').addEventListener('click', () => setup('solo',2));
$('#setup-dialog').addEventListener('change', setupNotes);
$('#launch').addEventListener('click', () => {
  preferences.difficulty = $('#difficulty-options input:checked').value; preferences.size = Number($('#size-options input:checked').value); preferences.hints = $('#setup-hints').checked;
  syncSettings(); persist();
  startGame({ mode: setupMode, playerCount:setupCount, difficulty: preferences.difficulty, size: preferences.size, theme: profile.equippedBoard });
});
$('#again').addEventListener('click', () => startGame()); $('#home-button').addEventListener('click', goHome); $('#leave-game').addEventListener('click', goHome);
window.addEventListener('hashchange', () => { if (location.hash !== '#play' && state.phase !== 'home') goHome(); });
ui.result.addEventListener('cancel', event => { event.preventDefault(); goHome(); });
for (const name of ['rules', 'settings']) $(`#${name}-open`).addEventListener('click', () => openDialog(`#${name}-dialog`));
$('#shop-open').addEventListener('click', () => { renderShop(); $('#shop-message').textContent = ''; openDialog('#shop-dialog'); });
ui.turn.addEventListener('click', () => { $('#resign-open').disabled = !canResign(state); $('#match-info').textContent = `${state.mode === 'solo' ? `ひとり · ${DIFFICULTIES[state.difficulty].label}` : `${state.colors.length}人で交代`} · ${state.size} × ${state.size}${state.mode === 'solo' ? ` · あなたは${nameOf(state.human)}、${state.human + 1}番目` : ''}\n手番：${state.colors.map(c => c.name).join(' → ')}`; openDialog('#menu-dialog'); });
$('#resign-open').addEventListener('click', () => {
  if (!canResign(state)) return;
  $('#resign-description').textContent = state.mode === 'solo' ? `${nameOf(state.human)}のあなたが降参し、負けとして１対局を記録します。コインは増減しません。` : `${nameOf(state.player)}が降参し、${state.colors.length}人全員のこの対局を終了します。途中の枚数で勝者は決めません。`;
  openDialog('#resign-dialog');
});
$('#resign-confirm').addEventListener('click', resignGame);
$('#game-rules').addEventListener('click', () => openDialog('#rules-dialog')); $('#game-settings').addEventListener('click', () => openDialog('#settings-dialog'));
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('close', wake));
for (const [id,key] of [['sound-setting','sound'],['music-setting','music'],['motion-setting','reducedMotion'],['hints-setting','hints']]) $('#' + id).addEventListener('change', event => { preferences[key] = event.target.checked; stoneAudio.unlock(); syncSettings(); persist(); updateInputState(); });
document.addEventListener('pointerdown', () => stoneAudio.unlock(), { passive:true });
document.addEventListener('keydown', () => stoneAudio.unlock());
document.addEventListener('visibilitychange', () => { if (document.hidden) stoneAudio.suspend(); else stoneAudio.unlock(); });
$('#sound-volume').addEventListener('input', event => { preferences.volume = Number(event.target.value) / 100; syncSettings(); persist(); });
$('#sound-preview').addEventListener('click', async () => {
  stoneAudio.unlock(); await pause(30);
  if (!$('#settings-dialog').open) return;
  stoneAudio.hit('place',-.2); await pause(330);
  if (!$('#settings-dialog').open) return;
  stoneAudio.hit('flip',.2); $('#sound-status').textContent = stoneAudio.status().state === 'running' ? '置く音、返す音の順に再生しました。' : '音の準備中です。もう一度お試しください。';
});
$('#export-save').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ format: 'four-color-othello', version: 1, profile, preferences }, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = 'Irodory-セーブデータ.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 30000); $('#save-message').textContent = 'セーブデータを書き出しました。安全な場所に残してください。';
});
$('#import-save').addEventListener('click', () => { if (state.phase !== 'home') { $('#save-message').textContent = 'ホームに戻ってから読み込んでください。'; return; } $('#save-file').click(); });
$('#save-file').addEventListener('change', async event => {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    if (file.size > 1000000) throw new Error('大きすぎるファイルです');
    const saved = JSON.parse(await file.text());
    if (saved?.format !== 'four-color-othello' || saved.version !== 1 || !saved.profile || typeof saved.profile !== 'object' || !saved.preferences) throw new Error('このゲームのセーブデータを選んでください');
    if (state.phase !== 'home') throw new Error('ホームに戻ってから読み込んでください');
    profile = normalizeProfile(saved.profile); preferences = normalizePreferences(saved.preferences); persist(); syncSettings(); renderHome(); $('#save-message').textContent = 'コイン・購入品・設定を読み込みました。';
  } catch (error) { $('#save-message').textContent = `読み込めませんでした。${error instanceof SyntaxError ? 'JSON形式のセーブデータを選んでください。' : error.message}`; }
  event.target.value = '';
});
function snapshot() { return { rendering:{ stones:ui.board.querySelectorAll('.disc').length, animations:ui.board.getAnimations?.({subtree:true}).length ?? 0, effects:cellEffects.size(), flipping:ui.board.querySelectorAll('.is-flipping').length }, sound: { enabled:preferences.sound, volume:preferences.volume, ...stoneAudio.status() }, firstMoves:state.movedPlayers?.slice() ?? [false,false,false,false], phase: state.phase, ending: state.ending ?? null, resigned: state.resigned ?? null, stats: { ...profile.stats }, paused: isPaused(), player: state.player, mode: state.mode, human: state.human, difficulty: state.difficulty, size: state.size, playerCount:state.colors.length, colors: state.colors.map(c => c.id), board: state.board.slice(), scores: scores(state.board).slice(0,state.colors.length), hints: preferences.hints, coins: profile.coins, ownedBoards: [...profile.ownedBoards], ownedColors: [...profile.ownedColors] }; }
function registerTools() {
  const context = document.modelContext; if (!context?.registerTool) return;
  const lifecycle = new AbortController(); window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
  const tools = [
    { name: 'read_othello_game', title: '盤面を読む', description: '盤面、手番、設定を読む。boardの値はプレイヤー番号0〜3、空きはnull。colorsが対応する色。', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: () => snapshot() },
    { name: 'place_othello_stone', title: '石を置く', description: '人間の手番に1枚置く。行・列は1始まり、設定した盤の広さ以内。はさめない場所・AIの番・メニュー表示中には置けない。', inputSchema: { type: 'object', properties: { row: { type: 'integer', minimum: 1, maximum: 12 }, column: { type: 'integer', minimum: 1, maximum: 12 } }, required: ['row','column'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: input => { if (!input || Object.keys(input).some(k => !['row','column'].includes(k)) || ![input.row,input.column].every(v => Number.isInteger(v) && v >= 1 && v <= state.size)) throw new Error(`行と列は1〜${state.size}の整数で指定してください`); return moveAt((input.row - 1) * state.size + input.column - 1); } },
  ];
  for (const tool of tools) { try { Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch { /* Optional browser integration. */ } }
}
window.addEventListener('storage', event => {
  if (event.key === STORAGE.profile) { profile = normalizeProfile(readSave(STORAGE.profile)); renderHome(); if ($('#shop-dialog').open) renderShop(); }
});
installStoneTextures(document, [...CATALOG.filter(item => item.kind === 'color').map(item => item.id), 'black','white']);
renderHome(); syncSettings(); registerTools();
// Opening a saved URL always returns to the setup, never starts an unwanted game.
if (location.hash === '#play') history.replaceState(null, '', location.pathname + location.search);
