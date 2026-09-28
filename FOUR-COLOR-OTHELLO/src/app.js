import { initialBoard, PLAYERS, BOARD_SIZES, legalMoves, playMove, nextTurn, scores, winners } from './engine.js';
import { chooseAIMove, DIFFICULTIES } from './ai.js';
import { canResign, endByResignation } from './match.js';
import { CATALOG, normalizeProfile, ownsItem, purchaseItem, equipItem, matchReward, awardMatch, recordResignation, playerColors } from './progression.js';

const $ = s => document.querySelector(s);
const ui = { home: $('#home'), game: $('#game'), board: $('#board'), turn: $('#turn'), scores: $('#scores'), notice: $('#notice'), live: $('#live'), result: $('#result-dialog') };
const STORAGE = { prefs: 'four-color-othello.preferences', profile: 'four-color-othello.profile' };
function normalizePreferences(raw = {}) {
  raw = raw && typeof raw === 'object' ? raw : {};
  return { sound: typeof raw.sound === 'boolean' ? raw.sound : true, reducedMotion: typeof raw.reducedMotion === 'boolean' ? raw.reducedMotion : matchMedia('(prefers-reduced-motion: reduce)').matches, hints: raw.hints === true, difficulty: Object.hasOwn(DIFFICULTIES, raw.difficulty) ? raw.difficulty : 'normal', size: BOARD_SIZES.includes(raw.size) ? raw.size : 8 };
}
function readSave(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
let preferences = normalizePreferences(readSave(STORAGE.prefs));
let profile = normalizeProfile(readSave(STORAGE.profile));
let state = { board: initialBoard(), player: 0, phase: 'home', mode: 'solo', size: 8, human: 0, colors: playerColors('red').colors };
let storageWorking = true;
let epoch = 0, cells = [], focusIndex = 0, noticeTimer, audio, setupMode = 'solo', lastConfig, resumeWaiters = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const piece = color => `<i aria-hidden="true" class="disc ${color}"></i>`;
const stone = player => piece(state.colors[player].id);
const nameOf = player => state.colors[player].name;
const active = run => run === epoch && !['home', 'ended'].includes(state.phase);
function cancelRun() {
  ++epoch; const waiters = resumeWaiters; resumeWaiters = []; waiters.forEach(resolve => resolve());
  ui.board.getAnimations?.({ subtree: true }).forEach(animation => animation.cancel());
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
  const rack = p => `<div class="rack rack-${['top','right','bottom','left'][p]} ${palette[p].id}">${'<i class="reserve"><i class="reserve-face"></i></i>'.repeat(48)}</div>`;
  $('#home-board').innerHTML = [0,1,2,3].map(rack).join('') + `<div class="board hero-grid">${initialBoard().map(p => `<span class="cell">${p === null ? '' : piece(palette[p].id)}</span>`).join('')}</div>`;
  $('#home-theme-name').textContent = CATALOG.find(item => item.id === profile.equippedBoard).name;
  $('#home-board').dataset.theme = profile.equippedBoard;
  document.querySelectorAll('.coin-balance').forEach(el => { el.textContent = `${profile.coins.toLocaleString('ja-JP')} コイン`; });
  $('#home-record').textContent = profile.stats.played ? `${profile.stats.wins} 勝 · ${profile.stats.draws} 引き分け · ${profile.stats.played} 対局` : '好きな色で、じっくり一局。';
}
function buildBoard() {
  const n = state.size; focusIndex = (n / 2 - 1) * n + n / 2 - 1;
  ui.board.replaceChildren(); ui.board.style.setProperty('--grid-size', n);
  ui.board.setAttribute('aria-label', `4色オセロの盤面、${n}行${n}列`); ui.board.setAttribute('aria-rowcount', n); ui.board.setAttribute('aria-colcount', n);
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
  $('#board-shell').querySelectorAll('.rack').forEach((rack, p) => { rack.className = `rack rack-${['top','right','bottom','left'][p]} ${state.colors[p].id}`; rack.innerHTML = '<i class="reserve"><i class="reserve-face"></i></i>'.repeat(48); });
  $('#board-shell').dataset.theme = state.theme;
}
function setFocus(index, focus) { if (cells[focusIndex]) cells[focusIndex].tabIndex = -1; focusIndex = index; cells[index].tabIndex = 0; if (focus) cells[index].focus({ preventScroll: true }); }
function updateCell(index) {
  const player = state.board[index], cell = cells[index]; cell.innerHTML = player === null ? '' : stone(player); cell.dataset.player = player === null ? '' : String(player);
  cell.setAttribute('aria-label', `${Math.floor(index / state.size) + 1}行${index % state.size + 1}列、${player === null ? '空きマス' : nameOf(player) + 'の石'}`);
}
function renderStatus() {
  const counts = scores(state.board), p = state.player;
  const who = state.mode === 'solo' ? (p === state.human ? 'あなた' : state.phase === 'thinking' ? 'AI・考え中' : 'AI') : '';
  ui.turn.innerHTML = `${stone(p)}<span>${nameOf(p)}の番${who ? `<small class="turn-who">${who}</small>` : ''}</span><span class="menu-chevron" aria-hidden="true">⌄</span>`;
  ui.turn.className = `turn ${state.colors[p].id}`;
  ui.turn.dataset.player = String(p); ui.turn.setAttribute('aria-label', `${nameOf(p)}の番${who ? '、' + who : ''}。対局メニューを開く`);
  ui.scores.innerHTML = PLAYERS.map(p => `<div class="score ${state.colors[p.id].id}${p.id === state.player ? ' is-current' : ''}" data-player="${p.id}" aria-label="${nameOf(p.id)} ${counts[p.id]}枚">${stone(p.id)}<span><span class="score-name">${nameOf(p.id)}</span> <b>${counts[p.id]}</b><small>枚</small></span></div>`).join(''); updateInputState();
}
function updateInputState() {
  ui.game.dataset.phase = state.phase;
  ui.board.setAttribute('aria-busy', String(['intro', 'animating', 'thinking'].includes(state.phase)));
  const canPlay = state.phase === 'playing' && !isPaused();
  const hints = new Set(canPlay && preferences.hints ? legalMoves(state.board, state.player) : []);
  cells.forEach((cell, i) => { cell.setAttribute('aria-disabled', String(!canPlay || state.board[i] !== null)); cell.classList.toggle('legal-hint', hints.has(i)); if (hints.has(i)) cell.setAttribute('aria-description', 'ここに置けます'); else cell.removeAttribute('aria-description'); });
}
function hideNotice() { clearTimeout(noticeTimer); ui.notice.hidden = true; ui.notice.textContent = ''; }
function showNotice(text, detail = '') {
  hideNotice(); const title = document.createElement('strong'); title.textContent = text; ui.notice.append(title);
  if (detail) { const line = document.createElement('span'); line.textContent = detail; ui.notice.append(line); } ui.notice.hidden = false;
}
function sound(kind = 'place') {
  if (!preferences.sound) return;
  try { audio ??= new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') void audio.resume().catch(() => {});
    const oscillator = audio.createOscillator(), gain = audio.createGain(), now = audio.currentTime;
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(kind === 'place' ? 390 : 620, now); oscillator.frequency.exponentialRampToValueAtTime(100, now + .07);
    gain.gain.setValueAtTime(.075, now); gain.gain.exponentialRampToValueAtTime(.001, now + .09); oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(now); oscillator.stop(now + .1);
  } catch { /* Audio support never blocks gameplay. */ }
}
async function flipStone(index, delay, run) {
  if (preferences.reducedMotion) { if (active(run)) updateCell(index); return; }
  await pause(delay); if (!active(run)) return;
  const disc = cells[index].firstElementChild; if (!disc?.animate) { updateCell(index); return; }
  const out = disc.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(90deg)' }], { duration: 160, easing: 'ease-in', fill: 'forwards' });
  await out.finished.catch(() => {}); if (!active(run)) return;
  out.cancel(); updateCell(index);
  const into = cells[index].firstElementChild.animate([{ transform: 'rotateY(-90deg)' }, { transform: 'rotateY(0deg)' }], { duration: 190, easing: 'ease-out' }); await into.finished.catch(() => {});
}
async function moveAt(index, actor = 'human') {
  const ai = state.mode === 'solo' && state.player !== state.human;
  if (isPaused()) return { ok: false, reason: 'メニューを閉じると対局に戻ります' };
  if (actor === 'human' && ai) return { ok: false, reason: 'AIの手番です' };
  if (state.phase !== (actor === 'ai' ? 'thinking' : 'playing') || (actor === 'ai' && !ai)) return { ok: false, reason: '手番の切り替え中です' };
  const result = playMove(state.board, state.player, index);
  if (!result) { showNotice('ここには置けません', '相手の石をはさめるマスに置いてください'); noticeTimer = setTimeout(hideNotice, 1300); return { ok: false, reason: 'ここでは石をはさめません' }; }
  hideNotice(); const run = epoch, player = state.player, n = state.size;
  state.phase = 'animating'; state.board = result.board; updateInputState(); updateCell(index); sound();
  if (!preferences.reducedMotion) cells[index].firstElementChild.animate?.([{ transform: 'translateY(-10px) scale(1.07)', opacity: .4 }, { transform: 'translateY(0) scale(1)', opacity: 1 }], { duration: 180, easing: 'ease-out' });
  await Promise.all(result.flips.map(i => flipStone(i, 100 + 60 * Math.max(Math.abs(Math.floor(i / n) - Math.floor(index / n)), Math.abs(i % n - index % n)), run)));
  if (!active(run)) return { ok: false, reason: 'ゲームが終了しました' };
  renderStatus(); sound('flip'); announce(`${nameOf(player)}が${result.flips.length}枚ひっくり返しました。`); await advanceTurn(player, run);
  return { ok: true, flipped: result.flips.length, ...snapshot() };
}
async function advanceTurn(player, run) {
  if (!await ready(run)) return;
  const next = nextTurn(state.board, player);
  if (next.ended && !state.board.includes(null)) { finish(); return; }
  for (const skipped of next.skipped) {
    if (!await ready(run)) return;
    state.player = skipped; state.phase = 'skipping'; renderStatus(); showNotice(`${nameOf(skipped)}は置ける場所がありません`, 'スキップします'); await pause(1500);
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
  const index = chooseAIMove(state.board, state.player, { difficulty: state.difficulty });
  if (!active(run)) return;
  if (index === null) { await advanceTurn(state.player, run); return; } await moveAt(index, 'ai');
}
function finish() {
  if (state.phase === 'ended') return;
  state.phase = 'ended'; state.ending = 'completed'; hideNotice(); renderStatus();
  const humanWon = winners(state.board).includes(state.human), draw = winners(state.board).length > 1;
  const outcome = state.mode === 'friends' ? (draw ? 'draw' : 'win') : humanWon ? (draw ? 'draw' : 'win') : 'loss';
  decorateResult(outcome);
  $('#result-context').textContent = '最終スコア';
  const counts = scores(state.board), winning = winners(state.board), label = winning.map(nameOf).join('・');
  $('#result-title').textContent = winning.length === 1 ? `${label}の勝ち！` : `${label}の引き分け！`;
  $('#result-scores').innerHTML = [...PLAYERS].sort((a, b) => counts[b.id] - counts[a.id]).map(p => `<div class="result-row${winning.includes(p.id) ? ' winner' : ''}">${stone(p.id)}<span>${nameOf(p.id)}${state.mode === 'solo' && p.id === state.human ? '<small>（あなた）</small>' : ''}</span><b>${counts[p.id]}<small>枚</small></b></div>`).join('');
  // Merge the latest profile if another local tab finished a game or bought an item.
  if (storageWorking) profile = normalizeProfile(readSave(STORAGE.profile) ?? profile);
  const awarded = awardMatch(profile, state); profile = awarded.profile; persist(); renderHome();
  $('#result-reward').textContent = state.mode === 'friends' ? 'みんなで対戦、ありがとう！' : awarded.earned ? `${winning.length > 1 ? '引き分け' : '勝利'}ボーナス ＋${awarded.earned} コイン！　合計 ${profile.coins} コイン` : `次の一局で勝利をめざそう！　所持 ${profile.coins} コイン`;
  openDialog('#result-dialog'); announce(`${$('#result-title').textContent} ${$('#result-reward').textContent}`);
}
function decorateResult(outcome) {
  ui.result.dataset.outcome = outcome;
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
  $('#result-title').textContent = `${nameOf(state.resigned)}が降参しました`;
  $('#result-context').textContent = '降参時の枚数（最終順位ではありません）';
  const counts = scores(state.board);
  $('#result-scores').innerHTML = PLAYERS.map(p => `<div class="result-row">${stone(p.id)}<span>${nameOf(p.id)}${p.id === state.resigned ? '<small>（降参）</small>' : ''}</span><b>${counts[p.id]}<small>枚</small></b></div>`).join('');
  $('#result-reward').textContent = state.mode === 'solo' ? '負けとして１対局を記録しました。コインは増減しません。' : 'この対局を終了しました。コインは増減しません。';
  openDialog('#result-dialog'); announce(`${nameOf(state.resigned)}が降参しました。対局終了です。`);
}
function startGame(config = lastConfig) {
  cancelRun(); hideNotice(); closeDialogs();
  const palette = playerColors(config.color, config.mode); lastConfig = { ...config };
  state = { ...config, ...palette, id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`, board: initialBoard(config.size), player: 0, phase: 'playing' };
  ui.home.hidden = true; ui.game.hidden = false; document.body.classList.add('playing');
  buildBoard(); cells.forEach((_, i) => updateCell(i));
  if (preferences.reducedMotion) { $('#match-intro').hidden = true; beginTurn(epoch); }
  else { state.phase = 'intro'; renderStatus(); $('#intro-pieces').innerHTML = [0,1,2,3].map(stone).join(''); $('#match-intro').hidden = false; void enterGame(epoch); }
  wake(); setFocus(focusIndex, true); announce(`ゲーム開始。${nameOf(0)}の番です。`);
  if (location.hash !== '#play') history.pushState(null, '', '#play');
}
async function enterGame(run) {
  await pause(1000); if (!await ready(run)) return; $('#match-intro').hidden = true; beginTurn(run);
}
function goHome() {
  cancelRun(); state.phase = 'home'; $('#match-intro').hidden = true; hideNotice(); closeDialogs(); wake();
  ui.home.hidden = false; ui.game.hidden = true; document.body.classList.remove('playing'); renderHome();
  if (location.hash) history.replaceState(null, '', location.pathname + location.search); $('#start').focus({ preventScroll: true });
}
function setup(mode) {
  setupMode = mode; $('#setup-title').textContent = mode === 'solo' ? 'ひとりで遊ぶ' : '4人で遊ぶ'; $('#difficulty-field').hidden = $('#color-field').hidden = mode !== 'solo';
  $('#difficulty-options').innerHTML = Object.entries(DIFFICULTIES).map(([id, d]) => `<label class="choice"><input type="radio" name="difficulty" value="${id}" ${id === preferences.difficulty ? 'checked' : ''}><span>${d.label}</span></label>`).join('');
  $('#size-options').innerHTML = BOARD_SIZES.map(n => `<label class="choice"><input type="radio" name="size" value="${n}" ${n === preferences.size ? 'checked' : ''}><span>${n} × ${n}</span></label>`).join('');
  $('#color-options').innerHTML = CATALOG.filter(i => i.kind === 'color' && ownsItem(profile, i)).map(i => `<label class="choice color-choice"><input type="radio" name="color" value="${i.id}" ${i.id === profile.equippedColor ? 'checked' : ''}><span>${piece(i.id)}<b>${i.name}</b></span></label>`).join('');
  $('#setup-hints').checked = preferences.hints; setupNotes(); openDialog('#setup-dialog');
}
function setupNotes() {
  const difficulty = $('#difficulty-options input:checked')?.value ?? preferences.difficulty, size = Number($('#size-options input:checked')?.value ?? preferences.size), color = $('#color-options input:checked')?.value ?? profile.equippedColor;
  const selected = CATALOG.find(i => i.id === color), ordinal = ['最初','２番目','３番目','４番目'][selected.seat];
  $('#difficulty-description').textContent = DIFFICULTIES[difficulty].description;
  $('#color-note').textContent = `あなたは${selected.name}。${ordinal}に打ちます。新しい色はショップで増やせます。`;
  $('#setup-reward').textContent = setupMode === 'solo' ? `勝つと ${matchReward(difficulty, size)} コイン。最多で引き分けると半分。` : '赤 → 青 → 黄 → 緑の順に、みんなで交代します。';
}
function syncSettings() { document.body.classList.toggle('reduce-motion', preferences.reducedMotion); for (const [id,key] of [['sound-setting','sound'],['motion-setting','reducedMotion'],['hints-setting','hints'],['setup-hints','hints']]) $('#' + id).checked = preferences[key]; }
function renderShop() {
  renderHome();
  for (const kind of ['board', 'color']) {
    const items = CATALOG.filter(i => i.kind === kind);
    $('#' + kind + '-products').innerHTML = items.map(item => {
      const owned = ownsItem(profile, item), equipped = profile[kind === 'board' ? 'equippedBoard' : 'equippedColor'] === item.id;
      const preview = kind === 'board' ? `<div class="board-swatch" data-theme="${item.id}"><div>${piece('red')}${piece('blue')}${piece('green')}${piece('yellow')}</div></div>` : `<div class="color-swatch">${piece(item.id)}</div>`;
      return `<article class="product${equipped ? ' equipped' : ''}">${preview}<h4>${item.name}</h4><p>${item.description ?? '最初から使える基本の色。'}</p><button class="product-action" data-item="${item.id}" ${equipped || (!owned && profile.coins < item.price) ? 'disabled' : ''}>${equipped ? '使用中' : owned ? '使う' : `${item.price} コインで購入`}</button>${!owned && profile.coins < item.price ? `<small>あと ${item.price - profile.coins} コイン</small>` : '<small> </small>'}</article>`;
    }).join('');
  }
}
$('#shop-dialog').addEventListener('click', event => {
  const button = event.target.closest('[data-item]'); if (!button || button.disabled) return;
  const item = CATALOG.find(i => i.id === button.dataset.item); if (!item) return;
  if (storageWorking) profile = normalizeProfile(readSave(STORAGE.profile) ?? profile);
  let result = ownsItem(profile, item) ? { ok: true, profile } : purchaseItem(profile, item.id);
  if (result.ok) result = equipItem(result.profile, item.id);
  if (result.ok) { profile = result.profile; persist(); renderShop(); $('#shop-message').textContent = `${item.name}を選びました。次の対局から使えます。`; $('#shop-dialog [data-item="' + item.id + '"]')?.closest('.product')?.scrollIntoView({ block: 'nearest' }); }
  else $('#shop-message').textContent = result.reason;
});
$('#start').addEventListener('click', () => setup('solo')); $('#friends-open').addEventListener('click', () => setup('friends'));
$('#setup-dialog').addEventListener('change', setupNotes);
$('#launch').addEventListener('click', () => {
  preferences.difficulty = $('#difficulty-options input:checked').value; preferences.size = Number($('#size-options input:checked').value); preferences.hints = $('#setup-hints').checked;
  profile = equipItem(profile, $('#color-options input:checked').value).profile; syncSettings(); persist();
  startGame({ mode: setupMode, difficulty: preferences.difficulty, size: preferences.size, color: profile.equippedColor, theme: profile.equippedBoard });
});
$('#again').addEventListener('click', () => startGame()); $('#home-button').addEventListener('click', goHome); $('#leave-game').addEventListener('click', goHome);
window.addEventListener('hashchange', () => { if (location.hash !== '#play' && state.phase !== 'home') goHome(); });
ui.result.addEventListener('cancel', event => { event.preventDefault(); goHome(); });
for (const name of ['rules', 'settings']) $(`#${name}-open`).addEventListener('click', () => openDialog(`#${name}-dialog`));
$('#shop-open').addEventListener('click', () => { renderShop(); $('#shop-message').textContent = ''; openDialog('#shop-dialog'); });
ui.turn.addEventListener('click', () => { $('#resign-open').disabled = !canResign(state); $('#match-info').textContent = `${state.mode === 'solo' ? `ひとり · ${DIFFICULTIES[state.difficulty].label}` : '4人で交代'} · ${state.size} × ${state.size}`; openDialog('#menu-dialog'); });
$('#resign-open').addEventListener('click', () => {
  if (!canResign(state)) return;
  $('#resign-description').textContent = state.mode === 'solo' ? `${nameOf(state.human)}のあなたが降参し、負けとして１対局を記録します。コインは増減しません。` : `${nameOf(state.player)}が降参し、４人全員のこの対局を終了します。途中の枚数で勝者は決めません。`;
  openDialog('#resign-dialog');
});
$('#resign-confirm').addEventListener('click', resignGame);
$('#game-rules').addEventListener('click', () => openDialog('#rules-dialog')); $('#game-settings').addEventListener('click', () => openDialog('#settings-dialog'));
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('close', wake));
for (const [id,key] of [['sound-setting','sound'],['motion-setting','reducedMotion'],['hints-setting','hints']]) $('#' + id).addEventListener('change', event => { preferences[key] = event.target.checked; syncSettings(); persist(); updateInputState(); });
$('#export-save').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ format: 'four-color-othello', version: 1, profile, preferences }, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = '4色オセロ-セーブデータ.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 30000); $('#save-message').textContent = 'セーブデータを書き出しました。安全な場所に残してください。';
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
function snapshot() { return { phase: state.phase, ending: state.ending ?? null, resigned: state.resigned ?? null, stats: { ...profile.stats }, paused: isPaused(), player: state.player, mode: state.mode, human: state.human, difficulty: state.difficulty, size: state.size, colors: state.colors.map(c => c.id), board: state.board.slice(), scores: scores(state.board), hints: preferences.hints, coins: profile.coins, ownedBoards: [...profile.ownedBoards], ownedColors: [...profile.ownedColors] }; }
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
renderHome(); syncSettings(); registerTools();
// Opening a saved URL always returns to the setup, never starts an unwanted game.
if (location.hash === '#play') history.replaceState(null, '', location.pathname + location.search);
