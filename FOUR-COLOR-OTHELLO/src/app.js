import { normalizeCustomDisc, matchCosmetics, DISC_FINISHES, DISC_PATTERNS, DISC_EMBLEMS } from './cosmetics.js';
import { t, normalizeLanguage, setLanguage, getLanguage, createStaticTranslations, onlineSeatName, onlineNotice } from './i18n.js';
import { initialBoard, PLAYERS, BOARD_SIZES, captures, legalMoves, firstRoundMoves, playMove, nextTurn, scores, winners } from './engine.js';
import { createGameClock } from './game-clock.js';
import { createOniRunner } from './ai-runner.js';
import { chooseAIMove, DIFFICULTIES } from './ai.js';
import { canResign, endByResignation } from './match.js';
import { CATALOG, normalizeProfile, ownsItem, purchaseItem, equipItem, matchReward, awardMatch, recordResignation, playerColors, randomSoloLineup } from './progression.js';

import { createOnlineClient, mergeOnlineLedger, ONLINE_URL } from './online.js';
import { createStoneAudio } from './audio.js';
import { createCapturePreview } from './capture-preview.js';
import { installStoneTextures, paintStone, createCellEffects, createHeldStonePointer } from './rendering.js';

// Reaction payloads and palette names stay canonical across client languages.
const ONLINE_STAMPS=['よろしく！','いい一手！','ありがとう！','楽しかった！'];
const BLACK_NAME='黒', WHITE_NAME='白';
const $ = s => document.querySelector(s);
const ui = { home: $('#home'), game: $('#game'), board: $('#board'), turn: $('#turn'), scores: $('#scores'), notice: $('#notice'), live: $('#live'), result: $('#result-dialog') };
const STORAGE = { prefs: 'four-color-othello.preferences', profile: 'four-color-othello.profile' };
function normalizePreferences(raw = {}) {
  raw = raw && typeof raw === 'object' ? raw : {};
  return { language: normalizeLanguage(raw.language), volume: typeof raw.volume === 'number' && Number.isFinite(raw.volume) ? Math.min(1,Math.max(0,raw.volume)) : .75, sound: typeof raw.sound === 'boolean' ? raw.sound : true, reducedMotion: typeof raw.reducedMotion === 'boolean' ? raw.reducedMotion : matchMedia('(prefers-reduced-motion: reduce)').matches, hints: raw.hints === true, difficulty: Object.hasOwn(DIFFICULTIES, raw.difficulty) ? raw.difficulty : 'normal', size: BOARD_SIZES.includes(raw.size) ? raw.size : 8 };
}
function readSave(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
let preferences = normalizePreferences(readSave(STORAGE.prefs));
const translateStatic = createStaticTranslations(document);
setLanguage(preferences.language, navigator.languages?.length ? navigator.languages : [navigator.language]);
translateStatic();
let profile = normalizeProfile(readSave(STORAGE.profile));
let state = { board: initialBoard(), player: 0, phase: 'home', mode: 'solo', size: 8, human: 0, colors: playerColors('red').colors };
const stoneAudio = createStoneAudio(() => preferences, () => new (window.AudioContext || window.webkitAudioContext)());
const heldElement = document.createElement('i');
heldElement.hidden=true;heldElement.setAttribute('aria-hidden','true');document.body.append(heldElement);
const heldPointer = createHeldStonePointer(ui.board,heldElement);
const capturePreview = createCapturePreview(ui.board);
let heldSize=40;
function syncHeldPointer() {
  const humanTurn=state.phase==='playing'&&(state.mode!=='online'||online.connected())&&!isPaused()&&(state.mode==='friends'||state.player===state.human);
  heldPointer.sync(humanTurn?state.colors[state.player].id:null,heldSize);
}
function measureHeldStone() { heldSize=ui.board.getBoundingClientRect().width/state.size*.8;syncHeldPointer(); }
if(window.ResizeObserver)new ResizeObserver(measureHeldStone).observe(ui.board);
window.addEventListener('resize',measureHeldStone,{passive:true});
window.addEventListener('scroll',()=>{heldPointer.hide();capturePreview.hide();},{passive:true});
window.addEventListener('blur',()=>{heldPointer.hide();capturePreview.hide();});
const gameClock = createGameClock();
const cellEffects = createCellEffects(gameClock.schedule,gameClock.clear);
const pausedAnimations = new Set(), dialogStack = [];
let gamePaused=false, pauseVersion=0;
const oniRunner = createOniRunner();
let aiAnalysis = null;
let storageWorking = true;
let epoch = 0, cells = [], focusIndex = 0, noticeTimer, setupMode = 'solo', setupCount = 4, lastConfig, resumeWaiters = [];
const pause = ms => gameClock.wait(ms);
const wallDelay = ms => new Promise(resolve => setTimeout(resolve,ms));
const piece = color => `<i aria-hidden="true" class="disc ${color}"></i>`;
const stone = player => piece(state.colors[player].id);
const nameOf = player => t(state.colors[player].name);
const matchPlayers = () => PLAYERS.slice(0,state.colors.length);
const winningPlayers = () => winners(state.board,state.colors.length);
const active = run => run === epoch && !['home', 'ended'].includes(state.phase);
function cancelRun() {
  heldPointer.hide(); capturePreview.hide(); stoneAudio.stop(); oniRunner.cancel(); aiAnalysis = null; cellEffects.clear(); ++epoch; const waiters = resumeWaiters; resumeWaiters = []; waiters.forEach(resolve => resolve());
  ui.board.getAnimations?.({ subtree: true }).forEach(animation => animation.cancel());
  cells.forEach(cell => cell.classList.remove('is-flipping'));
  pausedAnimations.clear();gameClock.reset();gamePaused=false;ui.game.classList.remove('is-paused');
}
const isPaused = () => !['home','ended'].includes(state.phase) && !!document.querySelector('dialog[open]');
function persist() {
  try { localStorage.setItem(STORAGE.prefs, JSON.stringify(preferences)); localStorage.setItem(STORAGE.profile, JSON.stringify(profile)); $('#storage-message').hidden = true; storageWorking = true; }
  catch { storageWorking = false; $('#storage-message').textContent = t('このブラウザでは保存できません。設定の「データを書き出す」で残せます。'); $('#storage-message').hidden = false; }
}
function syncGamePause() {
  const paused=isPaused();if(paused===gamePaused)return;
  gamePaused=paused;gameClock.setPaused(state.mode==='online'?false:paused);
  if(paused){
    pauseVersion++;heldPointer.hide();stoneAudio.stop();oniRunner.cancel();
    for(const animation of ui.board.getAnimations?.({subtree:true}) ?? [])if(animation.playState==='running' || animation.pending){animation.pause();pausedAnimations.add(animation);}
    ui.game.classList.add('is-paused');
  } else {
    ui.game.classList.remove('is-paused');
    for(const animation of pausedAnimations)if(animation.playState==='paused')animation.play();
    pausedAnimations.clear();
  }
}
function wake() { syncGamePause(); if (!isPaused()) { const waiters = resumeWaiters; resumeWaiters = []; waiters.forEach(resolve => resolve()); } updateInputState(); }
async function ready(run) { while (active(run) && isPaused()) await new Promise(resolve => resumeWaiters.push(resolve)); return active(run); }
function openDialog(id) { if (!$(id).open) { $(id).showModal(); $(id).scrollTop = 0; dialogStack.push($(id)); } syncGamePause(); updateInputState(); }
function closeDialogs() { document.querySelectorAll('dialog[open]').forEach(d => d.close()); }
function announce(text) { ui.live.textContent = text; }
function renderHome() {
  $('#home-theme-name').textContent = t(CATALOG.find(item => item.id === profile.equippedBoard).name);
  document.querySelectorAll('.coin-balance').forEach(el => { el.textContent = t`${profile.coins.toLocaleString(getLanguage())} コイン`; });
  $('#home-record').textContent = profile.stats.played ? t`${profile.stats.wins} 勝 · ${profile.stats.draws} 引き分け · ${profile.stats.played} 対局` : t('次の色は、対局が始まるお楽しみ。');
}
function buildBoard() {
  const n = state.size; focusIndex = (n / 2 - 1) * n + n / 2 - 1;
  ui.board.replaceChildren(); ui.board.style.setProperty('--grid-size', n);
  ui.board.setAttribute('aria-label', t`Irodoryの盤面、${n}行${n}列、${state.colors.length}色`); ui.board.setAttribute('aria-rowcount', n); ui.board.setAttribute('aria-colcount', n);
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
  cell.setAttribute('aria-label', t`${Math.floor(index / state.size) + 1}行${index % state.size + 1}列、${player === null ? t('空きマス') : nameOf(player) + t('の石')}`);
}
let scoreKey = '', turnKey = '', scoreNodes = [];
function renderStatus() {
  const counts = scores(state.board), p = state.player;
  if(state.mode!=='online')ui.turn.title=t('ポーズ（Esc）');
  const who = state.mode === 'solo' ? (p === state.human ? t('あなた') : state.phase === 'thinking' ? state.difficulty === 'oni' ? t('鬼・深く思考中') : t('AI・考え中') : 'AI') : '';
  const nextTurnKey = `${getLanguage()}:${state.colors[p].id}:${who}`;
  if (turnKey !== nextTurnKey) {
    turnKey = nextTurnKey;
    ui.turn.innerHTML = t`${stone(p)}<span>${nameOf(p)}の番${who ? `<small class="turn-who">${who}</small>` : ''}</span><span class="menu-chevron" aria-hidden="true">⌄</span>`;
    ui.turn.className = `turn ${state.colors[p].id}`;
    ui.turn.dataset.player = String(p); ui.turn.setAttribute('aria-label', t`${nameOf(p)}の番${who ? t('、') + who : ''}。ポーズを開く（Esc）`);
  }
  const nextScoreKey = `${getLanguage()}:${state.mode}:${state.human}:${state.colors.map(c => c.id).join(',')}:${state.mode==='online'?state.id:''}`;
  if (scoreKey !== nextScoreKey) {
    scoreKey = nextScoreKey;
    ui.scores.innerHTML = matchPlayers().map(p => t`<div class="score ${state.colors[p.id].id}" data-player="${p.id}">${stone(p.id)}<span><span class="score-name">${nameOf(p.id)}</span> <b></b><small>枚</small></span>${state.mode === 'solo' && p.id === state.human ? t('<em class="score-owner">あなた</em>') : ''}</div>`).join('');
    scoreNodes = [...ui.scores.querySelectorAll('.score')].map(row => ({ row, count:row.querySelector('b') }));
  }
  scoreNodes.forEach(({row,count}, player) => {
    const value = String(counts[player]);
    if (count.textContent !== value) count.textContent = value;
    row.classList.toggle('is-current', player === state.player);
    const label = t`${nameOf(player)} ${value}枚`;
    if (row.getAttribute('aria-label') !== label) row.setAttribute('aria-label', label);
  });
  if(state.mode==='online'&&onlineRoom){
    scoreNodes.forEach(({row},i)=>{const seat=onlineRoom.seats[i];row.querySelector('.score-name').textContent=onlineSeatName(seat,i);row.title=`${nameOf(i)} · ${onlineSeatName(seat,i)}${i===state.human?t('（あなた）'):''}${seat.bot||seat.forfeit?' · AI':''}`;let label=row.querySelector('em');if(!label){label=document.createElement('em');label.className='score-owner';row.append(label);}label.textContent=seat.bot?'AI':seat.forfeit?t('AI引継'):i===state.human?t('あなた'):seat.connected?t('参加中'):t('復帰待ち');});
    ui.turn.title=t('対局メニュー（Esc）');ui.turn.setAttribute('aria-label',nameOf(p)+t('の番。対局メニューを開く（Esc）'));
    ui.turn.querySelector('span').textContent=t`${nameOf(p)} · ${p===state.human?t('あなた'):onlineSeatName(onlineRoom.seats[p],p)}の番`;
  }
  updateInputState();
}
function updateInputState() {
  capturePreview.hide();
  syncHeldPointer();
  ui.game.dataset.phase = state.phase;
  ui.board.setAttribute('aria-busy', String(['intro', 'animating', 'thinking'].includes(state.phase)));
  const canPlay = state.phase === 'playing' && (state.mode!=='online'||online.connected()) && !isPaused() && !document.hidden && (state.mode === 'friends' || state.player === state.human);
  const available = canPlay && preferences.hints ? turnMoves(state.board,state.player) : [];
  const hints = new Set(canPlay && preferences.hints ? available : []);
  cells.forEach((cell, i) => { const disabled = String(!canPlay || state.board[i] !== null); if (cell.getAttribute('aria-disabled') !== disabled) cell.setAttribute('aria-disabled', disabled); cell.classList.toggle('legal-hint', hints.has(i)); if (hints.has(i)) cell.setAttribute('aria-description', t('ここに置けます')); else cell.removeAttribute('aria-description'); });
  capturePreview.sync({ enabled:canPlay && preferences.hints, cells, color:state.colors[state.player].id, resolve:index => hints.has(index) ? captures(state.board,state.player,index) : [] });
}
function hideNotice() { gameClock.clear(noticeTimer); ui.notice.hidden = true; ui.notice.textContent = ''; }
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
    const landed=drop.finished.catch(() => {});
    await pause(145); if (await ready(run)) sound('place',index);
    try { await landed; } finally { drop.cancel(); }
  } else if (active(run)) sound('place',index);
}
async function flipStone(index, delay, run) {
  if (preferences.reducedMotion) { if (active(run)) updateCell(index); return; }
  await pause(delay); if (!await ready(run)) return;
  const cell = cells[index], disc = cell.firstElementChild;
  if (!disc?.animate) { updateCell(index); sound('flip',index); return; }
  let out, into;
  cell.classList.add('is-flipping');
  try {
    out = disc.animate([{ transform:'translateY(0) rotateY(0deg)' }, { transform:'translateY(-7px) rotateY(90deg)' }], { duration:130, easing:'ease-in', fill:'forwards' });
    await out.finished.catch(() => {}); if (!await ready(run)) return;
    out.cancel(); updateCell(index);
    into = disc.animate([
      { transform:'translateY(-7px) rotateY(-90deg)' },
      { transform:'translateY(0) rotateY(0deg) scale(1.025,.97)', offset:.78 },
      { transform:'translateY(-1px) scale(1)', offset:.9 },
      { transform:'translateY(0) rotateY(0deg)' }
    ], { duration:220, easing:'ease-out' });
    const flipped=into.finished.catch(() => {});
    await pause(172); if (await ready(run)) sound('flip',index);
    await flipped;
  } finally { out?.cancel(); into?.cancel(); cell.classList.remove('is-flipping'); }
}
async function moveAt(index, actor = 'human') {
  if(state.mode==='online')return onlineMove(index);
  const ai = state.mode === 'solo' && state.player !== state.human;
  if (isPaused()) return { ok: false, reason: t('メニューを閉じると対局に戻ります') };
  if (actor === 'human' && ai) return { ok: false, reason: t('AIの手番です') };
  if (state.phase !== (actor === 'ai' ? 'thinking' : 'playing') || (actor === 'ai' && !ai)) return { ok: false, reason: t('手番の切り替え中です') };
  const result = playMove(state.board, state.player, index);
  if (!result) { showNotice(t('ここには置けません'), t('相手の石をはさめるマスに置いてください')); noticeTimer = gameClock.schedule(hideNotice, 1300); return { ok: false, reason: t('ここでは石をはさめません') }; }
  if (!turnMoves(state.board,state.player).includes(index)) {
    showNotice(t('まだ最初の手番中です'),t('まだ一度も打っていない色が０枚になる手は置けません'));
    noticeTimer = gameClock.schedule(hideNotice, 1650); return {ok:false,reason:t('初手の保護中は未着手の色を０枚にできません')};
  }
  hideNotice(); const run = epoch, player = state.player, n = state.size;
  state.movedPlayers[player] = true;
  state.phase = 'animating'; state.board = result.board; updateInputState(); updateCell(index);
  if (!preferences.reducedMotion) cellEffects.pulse(cells[index]);
  const animatedFlips=result.flips.length>8?[]:result.flips;
  if(result.flips.length>8) result.flips.forEach(updateCell);
  await Promise.all([landStone(index,run), ...animatedFlips.map(i => flipStone(i, 175 + 55 * Math.max(Math.abs(Math.floor(i / n) - Math.floor(index / n)), Math.abs(i % n - index % n)), run))]);
  if (!await ready(run)) return { ok: false, reason: t('ゲームが終了しました') };
  renderStatus(); if (preferences.reducedMotion || result.flips.length>8) sound('flip',index); announce(t`${nameOf(player)}が${result.flips.length}枚ひっくり返しました。`); await advanceTurn(player, run);
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
    showNotice(t`${nameOf(skipped)}は${safeOpening && legalMoves(state.board,skipped).length ? t('初手の保護で今回はパス') : t('置ける場所がありません')}`, safeOpening ? t('全員が一度打つまでは、どの色も０枚になりません') : t('次の人に進みます'));
    await pause(1500);
  }
  if (!await ready(run)) return;
  hideNotice(); if (next.ended) { finish(); return; } state.player = next.player; beginTurn(run); announce(t`${nameOf(state.player)}の番です。`);
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
  let index;
  if(state.difficulty === 'oni') {
    aiAnalysis = { depth:0,nodes:0,backend:'worker' };
    let remaining=state.colors.length===2?5000:4000, best=null;
    do {
      if(!await ready(run) || state.phase!=='thinking')return;
      const version=pauseVersion, started=gameClock.time();
      const result = await oniRunner.think(state.board,state.player,{playerCount:state.colors.length,allowedMoves,movedPlayers:state.movedPlayers.slice(),timeMs:Math.max(1,remaining),onProgress:progress=>{
        if(active(run)&&version===pauseVersion){
          if(Number.isInteger(progress.index)&&(!best||progress.depth>=best.depth))best={...progress,backend:'worker'};
          aiAnalysis=best ?? {...progress,backend:'worker'};
        }
      }});
      remaining-=Math.max(0,gameClock.time()-started);
      if(!active(run))return;
      if(result&&(!best||result.depth>=best.depth))best=result;
      if(!await ready(run) || state.phase!=='thinking')return;
      if(version===pauseVersion || remaining<=0)break;
    } while(true);
    if(best){aiAnalysis=best;index=best.index;}
    else {aiAnalysis={backend:'fallback',depth:3};index=chooseAIMove(state.board,state.player,{difficulty:'hard',width,allowedMoves,playerCount:state.colors.length});}
  } else index = chooseAIMove(state.board, state.player, { difficulty: state.difficulty, width, allowedMoves, playerCount:state.colors.length });
  if (!active(run)) return;
  if (index === null) { await advanceTurn(state.player, run); return; } await moveAt(index, 'ai');
}
function finish() {
  if (state.phase === 'ended') return;
  state.phase = 'ended'; state.ending = 'completed'; hideNotice(); renderStatus();
  const humanWon = winningPlayers().includes(state.human), draw = winningPlayers().length > 1;
  const outcome = state.mode === 'friends' ? (draw ? 'draw' : 'win') : humanWon ? (draw ? 'draw' : 'win') : 'loss';
  decorateResult(outcome); if (outcome === 'win') stoneAudio.celebrate();
  // Merge the latest profile if another local tab finished a game or bought an item.
  if (storageWorking) profile = normalizeProfile(readSave(STORAGE.profile) ?? profile);
  const awarded = awardMatch(profile, state); profile = awarded.profile; state.reward=awarded.earned; persist(); renderHome(); renderLocalResult();
  openDialog('#result-dialog'); announce(`${$('#result-title').textContent} ${$('#result-reward').textContent}`);
}
function renderLocalResult() {
  $('#result-context').textContent = t('最終スコア');
  const counts = scores(state.board), winning = winningPlayers(), label = winning.map(nameOf).join(t('・'));
  $('#result-title').textContent = winning.length === 1 ? t`${label}の勝ち！` : t`${label}の引き分け！`;
  $('#result-scores').innerHTML = [...matchPlayers()].sort((a, b) => counts[b.id] - counts[a.id]).map(p => t`<div class="result-row${winning.includes(p.id) ? ' winner' : ''}">${stone(p.id)}<span>${nameOf(p.id)}${state.mode === 'solo' && p.id === state.human ? t('<small>（あなた）</small>') : ''}</span><b>${counts[p.id]}<small>枚</small></b></div>`).join('');
  $('#result-reward').textContent = state.mode === 'friends' ? t('みんなで対戦、ありがとう！') : state.reward ? t`${winning.length > 1 ? t('引き分け') : t('勝利')}ボーナス ＋${state.reward} コイン！　合計 ${profile.coins} コイン` : t`次の一局で勝利をめざそう！　所持 ${profile.coins} コイン`;
}
function decorateResult(outcome) {
  ui.result.dataset.outcome = outcome;
  $('#result-flavor').textContent = {win:t('その一手が、景色を変えた。'),draw:t('互いに譲らない、見事な一局。'),loss:t('次の一手に、新しい可能性を。'),resigned:t('また、この卓で。')}[outcome];
  $('#result-sparks').innerHTML = outcome === 'win' && !preferences.reducedMotion ? Array.from({length:22},(_,i) => `<i style="--x:${(i * 47) % 100}%;--delay:${(i % 7) * .075}s;--spin:${(i % 2 ? 1 : -1) * (120 + i * 13)}deg"></i>`).join('') : '';
  $('#result-eyebrow').textContent = { win:'VICTORY', draw:'DRAW', loss:'MATCH FINISHED', resigned:'RESIGNED' }[outcome];
  const flag = '<path d="M14 34V8m0 1c8-7 12 7 20 0v16c-8 7-12-7-20 0M9 36h10"/>';
  const trophy = '<path d="M15 8h18v9c0 8-4 12-9 12s-9-4-9-12V8Zm0 3H8v6c0 5 4 8 9 8m16-14h7v6c0 5-4 8-9 8M24 29v8m-8 2h16"/>';
  $('#result-symbol').innerHTML = outcome === 'win' ? '<span class="victory-seal"></span>' : `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${outcome === 'resigned' ? flag : trophy}</svg>`;
}
function resignGame() {
  if(state.mode==='online'){online.send('resign');closeDialogs();return;}
  const ended = endByResignation(state);
  if (!ended) { $('#resign-dialog').close(); return; }
  cancelRun(); state = ended; hideNotice(); $('#match-intro').hidden = true; closeDialogs();
  cells.forEach((_, i) => updateCell(i)); renderStatus();
  if (storageWorking) profile = normalizeProfile(readSave(STORAGE.profile) ?? profile);
  profile = recordResignation(profile, state).profile; persist(); renderHome(); decorateResult('resigned');
  renderResignedResult();
  openDialog('#result-dialog'); announce(t`${nameOf(state.resigned)}が降参しました。対局終了です。`);
}
function renderResignedResult() {
  $('#result-title').textContent = t`${nameOf(state.resigned)}が降参`;
  $('#result-context').textContent = t('降参時の枚数・順位なし');
  const counts = scores(state.board);
  $('#result-scores').innerHTML = matchPlayers().map(p => t`<div class="result-row">${stone(p.id)}<span>${nameOf(p.id)}${p.id === state.resigned ? t('<small>（降参）</small>') : ''}</span><b>${counts[p.id]}<small>枚</small></b></div>`).join('');
  $('#result-reward').textContent = state.mode === 'solo' ? t('敗北を記録。コインは変わりません。') : t('対局を終了。コインは変わりません。');
}
function installMatchCosmetics(seats=[]) {
  const styled=matchCosmetics(state.colors,state.mode,state.human,profile.customDisc,seats);
  installStoneTextures(document,Object.keys(styled.designs),getComputedStyle,styled.designs,'irodory-match-textures');
  state.colors=styled.colors;
}
function startGame(config = lastConfig) {
  if(onlineEnabled)stopOnline();
  $('#online-hud').hidden=true;$('#online-new-opponents').hidden=true;$('#again').textContent=t('同じ設定でもう一局');$('#again').disabled=false;
  cancelRun(); hideNotice(); closeDialogs();
  stoneAudio.unlock();
  const palette = config.playerCount === 2 ? { colors:[{id:'black',name:BLACK_NAME,seat:0},{id:'white',name:WHITE_NAME,seat:1}], human:config.mode === 'solo' ? Math.floor(Math.random()*2) : 0 } : config.mode === 'solo' ? randomSoloLineup(profile) : playerColors('red','friends'); lastConfig = { ...config };
  state = { ...config, ...palette, id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`, board: initialBoard(config.size, config.playerCount ?? 4), player: 0, phase: 'playing', movedPlayers:Array(config.playerCount ?? 4).fill(false) };
  installMatchCosmetics();
  ui.home.hidden = true; ui.game.hidden = false; document.body.classList.add('playing');
  ui.game.dataset.playerCount = String(state.colors.length);
  ui.game.dataset.difficulty = state.mode === 'solo' ? state.difficulty : 'friends';
  $('#intro-emblem').textContent = state.mode==='solo' && state.difficulty==='oni' ? t('鬼') : '◇';
  $('#intro-eyebrow').textContent = state.mode==='solo' && state.difficulty==='oni' ? 'THE ONI CHALLENGE' : 'TAKE YOUR SEAT';
  buildBoard(); measureHeldStone(); cells.forEach((_, i) => updateCell(i));
  state.phase = 'intro'; renderStatus();
  $('#intro-title').textContent = state.mode === 'solo' ? t`あなたは${nameOf(state.human)}` : t('対局開始');
  $('#intro-detail').textContent = state.mode === 'solo' ? t`${state.human + 1}番目の手番です` : state.colors.length === 2 ? t('黒と白で、勝負。') : t('４つの色で、勝負。');
  $('#intro-pieces').innerHTML = state.colors.map((color,p) => `<span class="intro-seat${state.mode === 'solo' && p === state.human ? ' is-you' : ''}">${stone(p)}<small>${p + 1}${state.mode === 'solo' && p === state.human ? t(' · あなた') : ''}</small></span>`).join('');
  $('#match-intro').hidden = false; void enterGame(epoch);
  wake(); setFocus(focusIndex, true); announce(state.mode === 'solo' ? t`あなたは${nameOf(state.human)}、${state.human + 1}番目です。${nameOf(0)}から開始します。` : t`ゲーム開始。${nameOf(0)}から開始します。`);
  if (location.hash !== '#play') history.pushState(null, '', '#play');
}
async function enterGame(run) {
  await pause(preferences.reducedMotion ? 1600 : 2500); if (!await ready(run)) return; $('#match-intro').hidden = true; beginTurn(run);
}
function goHome() {
  if(onlineEnabled)stopOnline();
  $('#online-hud').hidden=true;
  cancelRun(); state.phase = 'home'; $('#match-intro').hidden = true; hideNotice(); closeDialogs(); wake();
  ui.home.hidden = false; ui.game.hidden = true; document.body.classList.remove('playing'); renderHome();
  if (location.hash) history.replaceState(null, '', location.pathname + location.search); $('#start').focus({ preventScroll: true });
}
function setup(mode, count = 4) {
  setupCount = count; setupMode = mode;
  $('#classic-mode-field').hidden = count !== 2;
  $('#classic-mode-field input[value="solo"]').checked = true; $('#setup-title').textContent = mode === 'solo' ? t('ひとりで遊ぶ') : t('4人で遊ぶ'); $('#difficulty-field').hidden = $('#color-field').hidden = mode !== 'solo';
  $('#difficulty-options').innerHTML = Object.entries(DIFFICULTIES).map(([id, d]) => `<label class="choice"><input type="radio" name="difficulty" value="${id}" ${id === preferences.difficulty ? 'checked' : ''}><span>${t(d.label)}</span></label>`).join('');
  $('#size-options').innerHTML = BOARD_SIZES.map(n => `<label class="choice"><input type="radio" name="size" value="${n}" ${n === (count === 2 ? 8 : preferences.size) ? 'checked' : ''}><span>${n} × ${n}</span></label>`).join('');
  $('#color-options').innerHTML = profile.ownedColors.map(id => `<span class="draw-color">${piece(id)}</span>`).join('');
  $('#setup-hints').checked = preferences.hints; setupNotes(); openDialog('#setup-dialog');
}
function setupNotes() {
  if (setupCount === 2) setupMode = $('#classic-mode-field input:checked').value;
  $('#setup-title').textContent = setupCount === 2 ? t('通常の２色オセロ') : setupMode === 'solo' ? t('ひとりで遊ぶ') : t('4人で遊ぶ');
  $('#difficulty-field').hidden = setupMode !== 'solo';
  $('#color-field').hidden = setupMode !== 'solo' || setupCount === 2;
  $('#size-note').textContent = setupCount === 2 ? t('8 × 8 が通常の広さ。中央に黒２枚・白２枚、黒から開始。') : t('8 × 8 が基本。中央に各色４枚ずつ、合計16枚。');
  const difficulty = $('#difficulty-options input:checked')?.value ?? preferences.difficulty, size = Number($('#size-options input:checked')?.value ?? preferences.size);
  $('#setup-dialog').dataset.challenge=setupMode==='solo' && difficulty==='oni' ? 'oni' : 'standard';
  $('#difficulty-description').textContent = t(DIFFICULTIES[difficulty].description);
  $('#color-note').textContent = profile.customDisc.enabled?t('作成したマイコマを使います。手番は毎回ランダムです。'):t('持っている色から１色、手番は１〜４番目から毎回抽選。購入した色も候補に加わります。');
  $('#setup-reward').textContent = setupMode === 'solo' ? t`勝つと ${matchReward(difficulty, size)} コイン。最多で引き分けると半分。` : setupCount === 2 ? t('黒 → 白の順に、２人で交代します。') : t('赤 → 青 → 黄 → 緑の順に、みんなで交代します。');
}
function syncSettings() { $('#language-setting').value=preferences.language; stoneAudio.sync(); $('#sound-volume').value = String(Math.round(preferences.volume * 100)); $('#volume-value').textContent = `${Math.round(preferences.volume * 100)}%`; $('#sound-volume').disabled = $('#sound-preview').disabled = !preferences.sound; document.body.classList.toggle('reduce-motion', preferences.reducedMotion); for (const [id,key] of [['sound-setting','sound'],['motion-setting','reducedMotion'],['hints-setting','hints'],['setup-hints','hints']]) $('#' + id).checked = preferences[key]; }
let previewItem='classic', previewTheme='classic', previewColor='red';
function previewBoard(color='red') {
  const colors=playerColors(color).colors;
  return colors.map((c,p)=>`<div class="rack rack-${['top','right','bottom','left'][p]} ${c.id}"></div>`).join('')+
    `<div class="board">${initialBoard().map(p=>`<span class="cell">${p===null?'':piece(colors[p].id)}</span>`).join('')}</div>`;
}
function itemAction(item) {
  const owned=ownsItem(profile,item), equipped=item.kind==='board' && profile.equippedBoard===item.id;
  return {disabled:(item.kind==='color'&&owned)||equipped||(!owned&&profile.coins<item.price),label:item.kind==='color'&&owned?t('抽選の対象'):equipped?t('使用中'):owned?t('使う'):t`${item.price} コインで購入`};
}
function renderCollectionPreview() {
  const item=CATALOG.find(i=>i.id===previewItem), owned=ownsItem(profile,item), action=itemAction(item);
  const board=$('#shop-preview-board');board.dataset.theme=previewTheme;board.innerHTML=previewBoard(previewColor);
  $('#shop-preview-name').textContent=t(item.name);
  $('#shop-preview-description').textContent=t(item.description ?? '一局を彩る、つややかな基本の色。');
  $('#shop-preview-status').textContent=owned ? item.kind==='board'&&profile.equippedBoard===item.id?t('現在のボード'):t('コレクション済み') : t`${item.price} コイン`;
  const button=$('#shop-preview-action');button.dataset.item=item.id;button.textContent=action.label;button.disabled=action.disabled;
  document.querySelectorAll('[data-preview]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.preview===previewItem)));
}
function renderShop() {
  renderHome();
  for (const kind of ['board', 'color']) {
    const items = CATALOG.filter(i => i.kind === kind);
    $('#' + kind + '-products').innerHTML = items.map(item => {
      const owned=ownsItem(profile,item), equipped=kind==='board'&&profile.equippedBoard===item.id, action=itemAction(item);
      const art=kind==='board'?`<div class="board-shell product-board" data-theme="${item.id}" aria-hidden="true">${previewBoard()}</div>`:`<div class="color-swatch" aria-hidden="true">${piece(item.id)}</div>`;
      return t`<article class="product${equipped?' equipped':''}"><button class="product-preview" data-preview="${item.id}" aria-label="${t(item.name)}を試す" aria-pressed="false">${art}<span class="preview-label">見た目を試す ↗</span></button><h4>${t(item.name)}</h4><p>${t(item.description ?? '最初から使える基本の色。')}</p><button class="product-action" data-item="${item.id}" ${action.disabled?'disabled':''}>${action.label}</button><small>${!owned&&profile.coins<item.price?t`あと ${item.price-profile.coins} コイン`:owned?'OWNED':'COLLECTION'}</small></article>`;
    }).join('');
  }
  renderCollectionPreview();
}
$('#shop-dialog').addEventListener('click', event => {
  const preview=event.target.closest('[data-preview]');
  if(preview){const item=CATALOG.find(i=>i.id===preview.dataset.preview);if(!item)return;previewItem=item.id;if(item.kind==='board')previewTheme=item.id;else previewColor=item.id;renderCollectionPreview();$('.collection-showcase').scrollIntoView({block:'nearest',behavior:preferences.reducedMotion?'instant':'smooth'});return;}
  const button = event.target.closest('[data-item]'); if (!button || button.disabled) return;
  const item = CATALOG.find(i => i.id === button.dataset.item); if (!item) return;
  if (storageWorking) profile = normalizeProfile(readSave(STORAGE.profile) ?? profile);
  let result = ownsItem(profile, item) ? { ok: true, profile } : purchaseItem(profile, item.id);
  if (result.ok && item.kind === 'board') result = equipItem(result.profile, item.id);
  if (result.ok) { profile = result.profile; persist(); renderShop(); $('#shop-message').textContent = item.kind === 'color' ? t`${t(item.name)}が色の抽選に加わりました。` : t`${t(item.name)}を選びました。次の対局から使えます。`;  }
  else $('#shop-message').textContent = /^あと\d+コイン必要です$/.test(result.reason) ? t`あと${item.price-profile.coins}コイン必要です` : t(result.reason);
});
$('#start').addEventListener('click', () => setup('solo')); $('#friends-open').addEventListener('click', () => setup('friends'));
$('#classic-open').addEventListener('click', () => setup('solo',2));
$('#setup-dialog').addEventListener('change', setupNotes);
$('#launch').addEventListener('click', () => {
  preferences.difficulty = $('#difficulty-options input:checked').value; preferences.size = Number($('#size-options input:checked').value); preferences.hints = $('#setup-hints').checked;
  syncSettings(); persist();
  startGame({ mode: setupMode, playerCount:setupCount, difficulty: preferences.difficulty, size: preferences.size, theme: profile.equippedBoard });
});
$('#again').addEventListener('click', () => {if(state.mode==='online'){online.send('rematch');$('#again').disabled=true;$('#again').textContent=t('ほかのプレイヤーを待っています…');}else startGame();}); $('#home-button').addEventListener('click', goHome); $('#leave-game').addEventListener('click', goHome);
window.addEventListener('hashchange', () => { if (location.hash !== '#play' && state.phase !== 'home') goHome(); });
ui.result.addEventListener('cancel', event => { event.preventDefault(); goHome(); });
for (const name of ['rules', 'settings']) $(`#${name}-open`).addEventListener('click', () => openDialog(`#${name}-dialog`));
function openCollection(){previewItem=previewTheme=profile.equippedBoard;previewColor=profile.equippedColor;renderShop();$('#shop-message').textContent='';openDialog('#shop-dialog');}
$('#shop-open').addEventListener('click',openCollection);$('#collection-open').addEventListener('click',openCollection);
function openPause() {
  $('#menu-dialog .eyebrow').textContent=state.mode==='online'?'ONLINE MATCH':'PAUSED';$('#menu-title').textContent=state.mode==='online'?t('対局メニュー'):t('ポーズ');$('#menu-dialog .pause-note').textContent=state.mode==='online'?t('オンライン対戦の時間は進み続けます'):t('ゲームの時間が止まっています');
  if(state.mode==='online'){if(!onlineRoom)return;$('#resign-open').disabled=onlineRoom.seats[onlineRoom.you].forfeit||onlineRoom.phase==='ended';$('#match-info').textContent=t`オンライン · ${state.size} × ${state.size} · 1手${onlineRoom.settings?.turnSeconds??45}秒 · あなたは${nameOf(state.human)}`;$('#leave-game').textContent=t('退出してホームへ（対局中は降参）');openDialog('#menu-dialog');return;}
  $('#leave-game').textContent=t('この対局を終了してホームへ');
  if(['home','ended'].includes(state.phase))return;
  $('#resign-open').disabled = !canResign(state); $('#match-info').textContent = t`${state.mode === 'solo' ? t`ひとり · ${t(DIFFICULTIES[state.difficulty].label)}` : t`${state.colors.length}人で交代`} · ${state.size} × ${state.size}${state.mode === 'solo' ? t` · あなたは${nameOf(state.human)}、${state.human + 1}番目` : ''}\n手番：${state.colors.map(c => t(c.name)).join(' → ')}`; openDialog('#menu-dialog');
}
ui.turn.addEventListener('click', openPause);
document.addEventListener('keydown',event=>{
  if(event.key!=='Escape'||['home','ended'].includes(state.phase))return;
  event.preventDefault();event.stopPropagation();if(event.repeat)return;
  const top=[...dialogStack].reverse().find(dialog=>dialog.open);
  if(top){top.close();wake();}else openPause();
},true);
$('#resign-open').addEventListener('click', () => {
  $('#resign-confirm').textContent=state.mode==='online'?t('降参してAIに引き継ぐ'):t('降参して対局を終了する');
  if(state.mode==='online'){if(!onlineRoom||onlineRoom.seats[onlineRoom.you].forfeit)return;$('#resign-description').textContent=t('あなたは負けとなり、残りの手はAIが引き継ぎます。ほかのプレイヤーの対局は続きます。');openDialog('#resign-dialog');return;}
  if (!canResign(state)) return;
  $('#resign-description').textContent = state.mode === 'solo' ? t`${nameOf(state.human)}のあなたが降参し、負けとして１対局を記録します。コインは増減しません。` : t`${nameOf(state.player)}が降参し、${state.colors.length}人全員のこの対局を終了します。途中の枚数で勝者は決めません。`;
  openDialog('#resign-dialog');
});
$('#resign-confirm').addEventListener('click', resignGame);
$('#game-rules').addEventListener('click', () => openDialog('#rules-dialog')); $('#game-settings').addEventListener('click', () => openDialog('#settings-dialog'));
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('close', () => { const i=dialogStack.indexOf(dialog);if(i>=0)dialogStack.splice(i,1);wake(); }));
for (const [id,key] of [['sound-setting','sound'],['motion-setting','reducedMotion'],['hints-setting','hints']]) $('#' + id).addEventListener('change', event => { preferences[key] = event.target.checked; stoneAudio.unlock(); syncSettings(); persist(); updateInputState(); });
document.addEventListener('pointerdown', () => stoneAudio.unlock(), { passive:true });
document.addEventListener('keydown', () => stoneAudio.unlock());
document.addEventListener('visibilitychange', () => { if (document.hidden) {heldPointer.hide();capturePreview.hide();stoneAudio.suspend();} else stoneAudio.unlock(); updateInputState(); });
$('#sound-volume').addEventListener('input', event => { preferences.volume = Number(event.target.value) / 100; syncSettings(); persist(); });
$('#sound-preview').addEventListener('click', async () => {
  stoneAudio.unlock(); await wallDelay(30);
  if (!$('#settings-dialog').open) return;
  stoneAudio.hit('place',-.2); await wallDelay(330);
  if (!$('#settings-dialog').open) return;
  stoneAudio.hit('flip',.2); $('#sound-status').textContent = stoneAudio.status().state === 'running' ? t('置く音、返す音の順に再生しました。') : t('音の準備中です。もう一度お試しください。');
});
$('#export-save').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ format: 'four-color-othello', version: 1, profile, preferences }, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = t('Irodory-セーブデータ.json'); link.click(); setTimeout(() => URL.revokeObjectURL(url), 30000); $('#save-message').textContent = t('セーブデータを書き出しました。安全な場所に残してください。');
});
$('#import-save').addEventListener('click', () => { if (state.phase !== 'home') { $('#save-message').textContent = t('ホームに戻ってから読み込んでください。'); return; } $('#save-file').click(); });
$('#save-file').addEventListener('change', async event => {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    if (file.size > 1000000) throw new Error(t('大きすぎるファイルです'));
    const saved = JSON.parse(await file.text());
    if (saved?.format !== 'four-color-othello' || saved.version !== 1 || !saved.profile || typeof saved.profile !== 'object' || !saved.preferences) throw new Error(t('このゲームのセーブデータを選んでください'));
    if (state.phase !== 'home') throw new Error(t('ホームに戻ってから読み込んでください'));
    profile = normalizeProfile(saved.profile); preferences = normalizePreferences(saved.preferences); persist(); refreshLanguage(); $('#save-message').textContent = t('コイン・購入品・設定を読み込みました。');
  } catch (error) { $('#save-message').textContent = t`読み込めませんでした。${error instanceof SyntaxError ? t('JSON形式のセーブデータを選んでください。') : error.message}`; }
  event.target.value = '';
});
function snapshot() { return { language:getLanguage(), languageSetting:preferences.language, clock:{timeMs:Math.floor(gameClock.time()),paused:gameClock.paused(),pending:gameClock.pending()}, ai:aiAnalysis ? {...aiAnalysis,active:oniRunner.active()} : null, rendering:{ stones:ui.board.querySelectorAll('.disc').length, animations:ui.board.getAnimations?.({subtree:true}).length ?? 0, effects:cellEffects.size(), flipping:ui.board.querySelectorAll('.is-flipping').length }, sound: { enabled:preferences.sound, volume:preferences.volume, ...stoneAudio.status() }, firstMoves:state.movedPlayers?.slice() ?? [false,false,false,false], phase: state.phase, ending: state.ending ?? null, resigned: state.resigned ?? null, stats: { ...profile.stats }, paused: isPaused(), player: state.player, mode: state.mode, human: state.human, difficulty: state.difficulty, size: state.size, playerCount:state.colors.length, colors: state.colors.map(c => c.id), board: state.board.slice(), scores: scores(state.board).slice(0,state.colors.length), hints: preferences.hints, coins: profile.coins, ownedBoards: [...profile.ownedBoards], ownedColors: [...profile.ownedColors] }; }
function registerTools() {
  const context = document.modelContext; if (!context?.registerTool) return;
  const lifecycle = new AbortController(); window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
  const tools = [
    { name: 'read_othello_game', title: t('盤面を読む'), description: t('盤面、手番、設定を読む。boardの値はプレイヤー番号0〜3、空きはnull。colorsが対応する色。'), inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: () => snapshot() },
    { name: 'place_othello_stone', title: t('石を置く'), description: t('人間の手番に1枚置く。行・列は1始まり、設定した盤の広さ以内。はさめない場所・AIの番・メニュー表示中には置けない。'), inputSchema: { type: 'object', properties: { row: { type: 'integer', minimum: 1, maximum: 12 }, column: { type: 'integer', minimum: 1, maximum: 12 } }, required: ['row','column'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: input => { if (!input || Object.keys(input).some(k => !['row','column'].includes(k)) || ![input.row,input.column].every(v => Number.isInteger(v) && v >= 1 && v <= state.size)) throw new Error(t`行と列は1〜${state.size}の整数で指定してください`); return moveAt((input.row - 1) * state.size + input.column - 1); } },
  ];
  for (const tool of tools) { try { Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch { /* Optional browser integration. */ } }
}
window.addEventListener('storage', event => {
  if (event.key === STORAGE.profile) { profile = normalizeProfile(readSave(STORAGE.profile)); renderHome(); if ($('#shop-dialog').open) renderShop(); }
});
let onlineEnabled=false,onlineRoom=null,onlineTimer=null,onlineStartAt=null,onlineOffset=0,onlinePending=false,onlineResultId=null,onlineReactionTimer=null,onlineViewKey='',onlineLedgerKey='',onlinePlayers=[],onlineConnectionMessage='オンライン',onlineErrorMessage='',onlineLobby=null;
const online=createOnlineClient({getJoinOptions:()=>({customDisc:normalizeCustomDisc(profile.customDisc)}),onState:receiveOnline,onStatus:(message,connected)=>{
  onlineConnectionMessage=message;$('#online-connection').textContent=t(message);$('#online-lobby-status').textContent=connected?t('対戦相手を探しています…'):t(message);
  if(state.mode==='online')updateInputState();
},onError:message=>{onlinePending=false;onlineErrorMessage=message;$('#online-lobby-error').textContent=t(message);if(state.mode==='online'){$('#online-connection').textContent=t(message);renderStatus();}}});
function stopOnline(){
  if(online.connected())online.send('leave');online.stop();onlineEnabled=false;onlineRoom=null;onlineStartAt=null;onlinePending=false;clearInterval(onlineTimer);clearTimeout(onlineReactionTimer);onlineTimer=null;$('#online-stamps').hidden=true;$('#online-reaction').textContent='';
}
async function openOnline(){
  $('#online-open').disabled=true;$('#online-name-error').textContent='';$('#online-lobby-error').textContent='';
  try{
    if(location.protocol==='file:')throw new Error(t('ローカルHTMLのオンライン対戦は、下の公開版リンクから遊べます'));
    const user=await online.session();acceptOnlineLedger(user.ledger);
    if(!user.name){openDialog('#online-name-dialog');$('#online-name').focus();return;}
    $('#online-name').value=user.name;startOnline();
  }catch(e){openDialog('#online-lobby-dialog');$('#online-lobby-status').textContent=t('オンラインに接続できませんでした');$('#online-lobby-error').textContent=e.name==='AbortError'?t('接続がタイムアウトしました。もう一度お試しください'):t(e.message);$('#online-countdown').textContent='—';$('#online-seats').replaceChildren();}
  finally{$('#online-open').disabled=false;}
}
function startOnline(){
  onlineViewKey='';onlineLedgerKey='';closeDialogs();onlineEnabled=true;onlineResultId=null;onlinePending=false;onlineRoom=null;onlineStartAt=null;onlinePlayers=[];onlineErrorMessage='';onlineLobby=null;$('#online-config').hidden=true;
  $('#online-lobby-error').textContent='';$('#online-seats').replaceChildren();$('#online-countdown').textContent='60';openDialog('#online-lobby-dialog');
  clearInterval(onlineTimer);onlineTimer=setInterval(updateOnlineTime,250);online.connect();
}
function acceptOnlineLedger(ledger){if(!ledger)return;const key=JSON.stringify(ledger);if(key===onlineLedgerKey)return;onlineLedgerKey=key;if(storageWorking)profile=normalizeProfile(readSave(STORAGE.profile)??profile);profile=mergeOnlineLedger(profile,ledger);persist();renderHome();}
function receiveOnline(data){
  if(!onlineEnabled)return;acceptOnlineLedger(data.ledger);onlineOffset=data.serverNow-Date.now();onlinePending=false;
  if(!data.room){
    onlineLobby=data;renderOnlineConfig();onlineStartAt=data.startAt;
    if(data.waiting&&onlineRoom){cancelRun();onlineRoom=null;onlineViewKey='';state.phase='home';ui.home.hidden=false;ui.game.hidden=true;document.body.classList.remove('playing');$('#online-hud').hidden=true;closeDialogs();openDialog('#online-lobby-dialog');}
    if(data.waiting){onlinePlayers=data.players;$('#online-lobby-error').textContent='';$('#online-lobby-status').textContent=t`${data.players.length} / 4 人が着席しました`;renderOnlineSeats(data.players);}
    updateOnlineTime();return;
  }
  const signature=JSON.stringify([data.room.id,data.room.ply,data.room.phase,data.room.deadline,data.room.seats,data.room.reactions,data.room.notice]);if(signature===onlineViewKey)return;onlineViewKey=signature;
  const room=data.room,previous=onlineRoom,isNew=previous?.id!==room.id;onlineRoom=room;onlineStartAt=null;
  if(isNew){
    cancelRun();closeDialogs();hideNotice();$('#match-intro').hidden=true;onlineResultId=null;
    state={mode:'online',id:room.id,size:room.settings?.size??Math.sqrt(room.board.length),human:room.you,player:room.player,colors:playerColors('red','friends').colors,theme:profile.equippedBoard,board:room.board,movedPlayers:room.moved,phase:'intro'};
    ui.home.hidden=true;ui.game.hidden=false;document.body.classList.add('playing');ui.game.dataset.playerCount='4';ui.game.dataset.difficulty='online';
    installMatchCosmetics(room.seats);buildBoard();measureHeldStone();cells.forEach((_,i)=>updateCell(i));$('#online-hud').hidden=false;
    if(location.hash!=='#play')history.pushState(null,'','#play');
  }
  const changed=room.board.flatMap((p,i)=>previous&&previous.board[i]!==p?[i]:[]);
  state.board=room.board;state.player=room.player;state.movedPlayers=room.moved;state.phase=room.phase==='countdown'?'intro':room.phase==='ended'?'ended':room.seats[room.you].forfeit?'watching':'playing';
  for(const i of changed){updateCell(i);if(!preferences.reducedMotion&&changed.length<=8&&!isPaused()){cells[i].firstElementChild?.animate([{transform:'scaleX(.15) translateY(-5px)'},{transform:'scaleX(1) translateY(0)'}],{duration:320,easing:'ease-out'});}}
  if(changed.length&&!isPaused()){sound('place',room.lastMove.index);announce(t`${onlineSeatName(room.seats[room.lastMove.player],room.lastMove.player)}が${room.lastMove.flips.length}枚返しました`);}
  renderStatus();
  if(room.phase==='countdown'){showNotice(t`あなたは${nameOf(room.you)}`,t`${room.you+1}番目の手番です`);}
  else if(room.notice&&room.notice!==previous?.notice){showNotice(onlineNotice(room.notice,room.seats));noticeTimer=gameClock.schedule(hideNotice,2000);}
  else if(previous?.phase==='countdown')hideNotice();
  const reaction=room.reactions.at(-1);
  if(reaction&&Date.now()+onlineOffset-reaction.at<7000){$('#online-reaction').textContent=t`${onlineSeatName(room.seats[reaction.seat],reaction.seat)}：${t(reaction.stamp)}`;clearTimeout(onlineReactionTimer);onlineReactionTimer=setTimeout(()=>{$('#online-reaction').textContent='';},Math.max(0,7000-(Date.now()+onlineOffset-reaction.at)));}
  if(room.phase==='ended'&&onlineResultId!==room.id)showOnlineResult(room);
  updateOnlineTime();
}
function renderOnlineSeats(players){
  $('#online-seats').replaceChildren();
  for(let i=0;i<4;i++){const member=players[i],el=document.createElement('div');el.className='online-seat'+(member?'':' empty');el.innerHTML=member?piece(PLAYERS[i].color):t('<span class="seat-placeholder">＋</span>');const name=document.createElement('b');name.textContent=member?.name??t('空いている席');el.append(name);const note=document.createElement('small');note.textContent=member?(member.you?t('あなた'):t('プレイヤー'))+(member.host?t(' · ホスト'):''):t('1分後にAI');if(member?.host)note.classList.add('host-badge');el.append(note);$('#online-seats').append(el);}
}
function updateOnlineTime(){
  const now=Date.now()+onlineOffset;
  if(onlineStartAt)$('#online-countdown').textContent=String(Math.max(0,Math.ceil((onlineStartAt-now)/1000)));
  if(!onlineRoom)return;const seconds=Math.max(0,Math.ceil((onlineRoom.deadline-now)/1000));
  const text=onlineRoom.phase==='ended'?t('対局終了'):onlineRoom.phase==='countdown'?t`開始まで ${seconds}秒`:onlineRoom.seats[onlineRoom.you].forfeit?t('AIが引継ぎ · 観戦中'):t`残り ${seconds}秒`;
  if($('#online-turn-time').textContent!==text)$('#online-turn-time').textContent=text;
  $('#online-turn-time').classList.toggle('urgent',onlineRoom.phase==='playing'&&onlineRoom.player===onlineRoom.you&&seconds<=10);
}
function onlineMove(index){
  if(!onlineRoom||state.phase!=='playing'||isPaused()||onlinePending||onlineRoom.player!==onlineRoom.you)return {ok:false,reason:t('あなたの手番ではありません')};
  if(!turnMoves(state.board,state.player).includes(index)){showNotice(t('ここには置けません'),t('相手の石をはさめるマスに置いてください'));noticeTimer=gameClock.schedule(hideNotice,1300);return {ok:false};}
  onlinePending=online.send('move',{index,ply:onlineRoom.ply,room:onlineRoom.id});return {ok:onlinePending};
}
function showOnlineResult(room){
  onlineResultId=room.id;hideNotice();closeDialogs();const won=room.winners.includes(room.you)&&!room.seats[room.you].forfeit,draw=won&&room.winners.length>1;
  decorateResult(room.seats[room.you].forfeit?'resigned':won?draw?'draw':'win':'loss');if(won&&!draw)stoneAudio.celebrate();
  renderOnlineResult(room);openDialog('#result-dialog');
}
function renderOnlineResult(room){
  const won=room.winners.includes(room.you)&&!room.seats[room.you].forfeit,draw=won&&room.winners.length>1;
  $('#result-title').textContent=room.abandoned?t('対局終了'):won?draw?t('引き分け！'):t('あなたの勝ち！'):t('対局終了');$('#result-context').textContent=room.abandoned?t('参加者が退出したため終了しました'):t('オンライン · 最終スコア');
  $('#result-scores').replaceChildren();const counts=scores(room.board);
  for(const i of [0,1,2,3].sort((a,b)=>counts[b]-counts[a])){const row=document.createElement('div');row.className='result-row'+(room.winners.includes(i)?' winner':'');row.innerHTML=stone(i);const name=document.createElement('span');name.textContent=onlineSeatName(room.seats[i],i)+(i===room.you?t('（あなた）'):'')+(room.seats[i].forfeit?t(' · 降参／AI引継'):room.seats[i].bot?' · AI':'');const count=document.createElement('b');count.textContent=counts[i]+t('枚');row.append(name,count);$('#result-scores').append(row);}
  $('#result-reward').textContent=won?t`＋${draw?35:70} コイン！ 所持 ${profile.coins} コイン`:t`また次の一局で。所持 ${profile.coins} コイン`;
  $('#again').textContent=t('同じメンバーに再戦を申し込む');$('#again').disabled=room.seats[room.you].forfeit||room.abandoned;$('#online-new-opponents').hidden=false;
}
$('#online-open').addEventListener('click',openOnline);
$('#online-name-form').addEventListener('submit',async event=>{event.preventDefault();$('#online-name-submit').disabled=true;try{await online.session($('#online-name').value);startOnline();}catch(e){$('#online-name-error').textContent=t(e.message);}finally{$('#online-name-submit').disabled=false;}});
$('#online-cancel').addEventListener('click',()=>{stopOnline();goHome();});
$('#online-lobby-dialog').addEventListener('cancel',event=>{event.preventDefault();stopOnline();goHome();});
$('#online-rename').addEventListener('click',()=>{stopOnline();closeDialogs();openDialog('#online-name-dialog');});
$('#online-new-opponents').addEventListener('click',()=>{stopOnline();goHome();void openOnline();});
$('#online-stamps-toggle').addEventListener('click',()=>{$('#online-stamps').hidden=!$('#online-stamps').hidden;});
for(const stamp of ONLINE_STAMPS){const button=document.createElement('button');button.textContent=t(stamp);button.dataset.stamp=stamp;button.addEventListener('click',()=>{online.send('reaction',{stamp});$('#online-stamps').hidden=true;});$('#online-stamps').append(button);}
window.addEventListener('pagehide',()=>{online.stop();clearInterval(onlineTimer);});
window.addEventListener('pageshow',event=>{if(event.persisted&&onlineEnabled){onlineTimer=setInterval(updateOnlineTime,250);online.connect();}});


function renderOnlineConfig() {
  const waiting=onlineEnabled&&onlineLobby?.waiting&&!onlineRoom;
  $('#online-config').hidden=!waiting;if(!waiting)return;
  $('#online-host-field').disabled=!onlineLobby.isHost;
  const settings=onlineLobby.settings??{size:8,turnSeconds:45,aiDifficulty:'normal'};
  $('#online-size').value=String(settings.size);$('#online-time').value=String(settings.turnSeconds);$('#online-ai').value=settings.aiDifficulty;
  const host=onlineLobby.players?.find(p=>p.host);
  $('#online-host-note').textContent=onlineLobby.isHost?t('あなたがホストです。開始まで設定を変更できます。'):t`${host?.name??''}がホストです。開始まで設定を変更できます。`;
}
$('#online-host-field').addEventListener('change',()=>{
  if(!onlineLobby?.isHost||onlineRoom)return;
  online.send('settings',{settings:{size:Number($('#online-size').value),turnSeconds:Number($('#online-time').value),aiDifficulty:$('#online-ai').value}});
});
let discDraft=normalizeCustomDisc(),discPreviewFrame=null;
function renderCreator() {
  $('#creator-color').value=discDraft.color;
  for(const [target,key,options] of [['creator-finishes','finish',DISC_FINISHES],['creator-patterns','pattern',DISC_PATTERNS],['creator-emblems','emblem',DISC_EMBLEMS]]) {
    const group=$('#'+target);
    if(!group.children.length)group.innerHTML=Object.keys(options).map(value=>`<button type="button" data-disc-field="${key}" data-disc-value="${value}"></button>`).join('');
    for(const button of group.children){button.textContent=t(options[button.dataset.discValue]);button.setAttribute('aria-pressed',String(discDraft[key]===button.dataset.discValue));}
  }
  renderDiscPreview();
}
function renderDiscPreview() {
  installStoneTextures(document,['custom-preview'],getComputedStyle,{'custom-preview':discDraft},'irodory-preview-texture');
  $('#creator-summary').textContent=[t(DISC_FINISHES[discDraft.finish]),t(DISC_PATTERNS[discDraft.pattern]),t(DISC_EMBLEMS[discDraft.emblem])].join(' · ');
  document.querySelectorAll('[data-disc-color]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.discColor===discDraft.color)));
}
$('#creator-open').addEventListener('click',()=>{discDraft=normalizeCustomDisc(profile.customDisc);$('#creator-message').textContent='';renderCreator();openDialog('#creator-dialog');});
$('#creator-dialog').addEventListener('click',event=>{
  const button=event.target.closest('[data-disc-field],[data-disc-color]');if(!button)return;
  if(button.dataset.discColor)discDraft.color=button.dataset.discColor;
  else discDraft[button.dataset.discField]=button.dataset.discValue;
  renderCreator();
});
$('#creator-color').addEventListener('input',event=>{
  discDraft.color=normalizeCustomDisc({color:event.target.value}).color;
  if(discPreviewFrame===null)discPreviewFrame=requestAnimationFrame(()=>{discPreviewFrame=null;renderDiscPreview();});
});
$('#creator-dialog').addEventListener('close',()=>{if(discPreviewFrame!==null)cancelAnimationFrame(discPreviewFrame);discPreviewFrame=null;});
function saveCustomDisc(enabled) {
  if(storageWorking)profile=normalizeProfile(readSave(STORAGE.profile)??profile);
  profile.customDisc=normalizeCustomDisc({...discDraft,enabled});persist();renderHome();
  $('#creator-message').textContent=enabled?t('マイコマを保存しました。次の対局から使えます。'):t('通常のコマに戻しました。デザインは工房に残ります。');
}
$('#creator-save').addEventListener('click',()=>saveCustomDisc(true));
$('#creator-disable').addEventListener('click',()=>saveCustomDisc(false));

function refreshLanguage() {
  setLanguage(preferences.language, navigator.languages?.length ? navigator.languages : [navigator.language]);
  translateStatic(); syncSettings(); renderHome();
  for (const id of ['save-message','sound-status','shop-message','online-name-error']) $('#'+id).textContent='';
  document.querySelectorAll('[data-stamp]').forEach(button=>{button.textContent=t(button.dataset.stamp);});
  if ($('#setup-dialog').open) {
    for (const input of document.querySelectorAll('#difficulty-options input')) input.nextElementSibling.textContent=t(DIFFICULTIES[input.value].label);
    setupNotes();
  }
  if ($('#shop-dialog').open) renderShop();
  if ($('#creator-dialog').open) renderCreator();
  renderOnlineConfig();
  if (state.phase !== 'home') {
    ui.board.setAttribute('aria-label',t`Irodoryの盤面、${state.size}行${state.size}列、${state.colors.length}色`);
    cells.forEach((_,i)=>updateCell(i)); renderStatus();
    if ($('#menu-dialog').open) openPause();
    if (!$('#match-intro').hidden) {
      $('#intro-emblem').textContent=state.mode==='solo'&&state.difficulty==='oni'?t('鬼'):'◇';
      $('#intro-title').textContent=state.mode==='solo'?t`あなたは${nameOf(state.human)}`:t('対局開始');
      $('#intro-detail').textContent=state.mode==='solo'?t`${state.human+1}番目の手番です`:state.colors.length===2?t('黒と白で、勝負。'):t('４つの色で、勝負。');
      $('#intro-pieces').querySelectorAll('small').forEach((el,p)=>{el.textContent=String(p+1)+(state.mode==='solo'&&p===state.human?t(' · あなた'):'');});
    }
    hideNotice();
  }
  if (state.phase==='ended') {
    if (state.mode==='online'&&onlineRoom) renderOnlineResult(onlineRoom);
    else if (state.ending==='resigned') renderResignedResult(); else renderLocalResult();
    $('#result-flavor').textContent=t({win:'その一手が、景色を変えた。',draw:'互いに譲らない、見事な一局。',loss:'次の一手に、新しい可能性を。',resigned:'また、この卓で。'}[ui.result.dataset.outcome]);
  }
  if (onlineEnabled) {
    $('#online-connection').textContent=t(onlineErrorMessage||onlineConnectionMessage);
    $('#online-lobby-error').textContent=t(onlineErrorMessage);
    if (!onlineRoom) {renderOnlineSeats(onlinePlayers);$('#online-lobby-status').textContent=t`${onlinePlayers.length} / 4 人が着席しました`;}
    const reaction=onlineRoom?.reactions.at(-1);
    if(reaction&&Date.now()+onlineOffset-reaction.at<7000) $('#online-reaction').textContent=t`${onlineSeatName(onlineRoom.seats[reaction.seat],reaction.seat)}：${t(reaction.stamp)}`;
    updateOnlineTime();
  }
}
$('#language-setting').addEventListener('change',event=>{preferences.language=normalizeLanguage(event.target.value);refreshLanguage();persist();});
window.addEventListener('languagechange',()=>{if(preferences.language==='auto')refreshLanguage();});

installStoneTextures(document, [...CATALOG.filter(item => item.kind === 'color').map(item => item.id), 'black','white']);
renderHome(); syncSettings(); registerTools();
// Opening a saved URL always returns to the setup, never starts an unwanted game.
if (location.hash === '#play') history.replaceState(null, '', location.pathname + location.search);
