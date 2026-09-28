(function () {
  'use strict';
  const C = window.ToiletCore, R = window.ToiletRender;
  const $ = s => document.querySelector(s), main = $('#main'), modalRoot = $('#modal-root');
  const STORAGE = 'toilet60-save-v1';
  const defaults = { records: {}, sound: true, volume: .35, reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches, difficulty: 'normal', reshuffle: true };
  let saved = { ...defaults }, canSave = true;
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE) || 'null');
    if (raw && typeof raw === 'object') {
      if (raw.records && typeof raw.records === 'object' && !Array.isArray(raw.records)) {
        saved.records = Object.fromEntries(Object.entries(raw.records).filter(([k, v]) => /^\d+-(easy|normal|hard)$/.test(k) && v && typeof v === 'object' && Number.isFinite(v.best) && v.best >= 0 && v.best <= 180).map(([k, v]) => [k, { best: v.best, wins: Math.max(1, Math.floor(Number(v.wins) || 1)) }]));
      }
      if (typeof raw.reshuffle === 'boolean') saved.reshuffle = raw.reshuffle;
      if (typeof raw.sound === 'boolean') saved.sound = raw.sound;
      if (Number.isFinite(raw.volume)) saved.volume = Math.max(0, Math.min(1, raw.volume));
      if (typeof raw.reduced === 'boolean') saved.reduced = raw.reduced;
      if (C.DIFFICULTIES[raw.difficulty]) saved.difficulty = raw.difficulty;
    }
  } catch (_) { /* Corrupt/unavailable saves never prevent playing. */ }
  function save() { try { localStorage.setItem(STORAGE, JSON.stringify(saved)); } catch (_) { canSave = false; } }
  const RUN_STORAGE='toilet60-run-v2';
  let resumeSnapshot=null,lastRunSave=0;
  try {const raw=localStorage.getItem(RUN_STORAGE);if(raw&&raw.length<2000000&&C.Game.restore(raw))resumeSnapshot=raw;}catch(_){}
  function stashRun(){if(!game||game.state!=='playing')return;resumeSnapshot=game.serialize();try{localStorage.setItem(RUN_STORAGE,resumeSnapshot);}catch(_){canSave=false;}}
  function forgetRun(){resumeSnapshot=null;try{localStorage.removeItem(RUN_STORAGE);}catch(_){}}
  let screen = 'title', game = null, world = null, stage = C.STAGES[0], difficulty = saved.difficulty;
  let filter = -1, page = 0, modal = null, returnFocus = null, lastTime = performance.now(), lastHud = 0, lastEvent = null, lastTickSecond = -1;
  let audioContext = null, practice = false, currentOptions = null, resultSaved = false;
  let lastFootstep = 0;
  const flushed = new Set();
  const keys = new Set(), held = new Set();
  function unlockAudio() {
    if (!saved.sound) return;
    try { audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); if (audioContext.state === 'suspended') audioContext.resume().catch(() => {}); } catch (_) { /* Audio is optional. */ }
  }
  function tone(frequency = 520, duration = .08, delay = 0, gain = .13, type = 'sine') {
    if (!saved.sound || !audioContext || audioContext.state !== 'running') return;
    try { const osc = audioContext.createOscillator(), vol = audioContext.createGain(), at = audioContext.currentTime + delay;
      osc.type = type; osc.frequency.value = frequency; vol.gain.setValueAtTime(0, at); vol.gain.linearRampToValueAtTime(saved.volume * gain, at + .01); vol.gain.exponentialRampToValueAtTime(.0001, at + duration);
      osc.connect(vol); vol.connect(audioContext.destination); osc.start(at); osc.stop(at + duration + .01);
    } catch (_) {}
  }
  function chime(won) { (won ? [523, 659, 784, 1046] : [392, 330, 262]).forEach((f, i) => tone(f, .25, i * .1, .16)); }
  function waterSound() {
    if (!saved.sound || !audioContext || audioContext.state !== 'running') return;
    try {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * .65, audioContext.sampleRate), data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const source = audioContext.createBufferSource(), filter = audioContext.createBiquadFilter(), gain = audioContext.createGain();
      source.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = 1250; gain.gain.value = saved.volume * .13;
      source.connect(filter); filter.connect(gain); gain.connect(audioContext.destination); source.start(); source.stop(audioContext.currentTime + .65);
    } catch (_) {}
  }
  function syncSettings() { document.body.classList.toggle('reduced-motion', saved.reduced); $('#sound-button').textContent = saved.sound ? '♪' : '♩'; $('#sound-button').setAttribute('aria-label', saved.sound ? '音をオフにする' : '音をオンにする'); }
  function announce(message) { $('#announcer').textContent = message; }
  function recordCount() { return C.STAGES.filter(s => Object.keys(C.DIFFICULTIES).some(d => saved.records[`${s.id}-${d}`])).length; }
  function setScreen(value) { screen = value; keys.clear(); held.clear(); document.body.dataset.screen = value; lastEvent = null; window.scrollTo(0, 0); }
  function renderTitle() {
    if(screen==='game')stashRun();closeModal(false); game = null; world = null; setScreen('title');
    main.innerHTML = `<section class="hero"><div><div class="eyebrow">A VERY URGENT DUNGEON ADVENTURE</div><h1>あと<span class="sixty">60</span>秒で<br>限界です<span class="coral">。</span></h1><p class="lead">トイレまで、あと少し。<br>待つか、走るか。その一瞬が、運命を変える。</p><div class="hero-buttons">${resumeSnapshot?'<button class="button primary" data-action="resume-run">つづきから ↗</button>':''}<button class="button primary" data-action="quick-start">はじめる <span>↗</span></button><div class="button-row"><button class="button secondary" data-action="stages">ステージ選択</button><button class="button secondary" data-action="help">あそびかた <span>?</span></button></div><button class="text-button" data-action="random">↻ 気ままにランダムマップ</button></div><p class="hero-note">キーボード・クリック・タッチで遊べます。<br>画像も全部入り。HTMLを開けば、サーバーなしで遊べます。<br><a href="index.html" download="あと60秒で限界です.html">↓ オフライン版HTMLを保存</a></p></div><div class="hero-art"><canvas id="title-art" aria-label="使用中のトイレの前で焦る棒人間と仲間"></canvas><div class="art-label">DUNGEON EDITION / VERSION 3</div><div class="art-caption"><span>待っている間も、時計は進む。</span><span>01 / PUBLIC SPACE</span></div></div></section><section class="feature-strip"><div class="feature"><strong>48</strong><p><b>広大な迷宮を探索</b>6つのエリア × 8ステージ</p></div><div class="feature"><strong>3</strong><p><b>あなたのペースで</b>180秒 / 120秒 / 75秒</p></div><div class="feature"><strong>∞</strong><p><b>毎回、違う曲がり角</b>ランダム生成でもっと遊ぶ</p></div></section>`;
    requestAnimationFrame(() => { if (screen === 'title') R.illustration($('#title-art')); });
  }
  function difficultyButtons() { return `<div class="difficulty" aria-label="難易度">${Object.entries(C.DIFFICULTIES).map(([id, d]) => `<button data-difficulty="${id}" class="${difficulty === id ? 'selected' : ''}" aria-pressed="${difficulty === id}">${d.label}</button>`).join('')}</div>`; }
  function difficultyNote() { return `${C.DIFFICULTIES[difficulty].time}秒 · ${difficulty === 'easy' ? '広く見えて、じっくり探索' : difficulty === 'normal' ? '待つか、探すか。基本の難易度' : '広い迷宮を短時間で突破'}`; }
  function renderStages() {
    closeModal(false); game = null; world = null; setScreen('stages');
    const list = C.STAGES.filter(s => filter < 0 || s.theme === filter), pages = Math.ceil(list.length / 6); page = Math.min(page, pages - 1);
    const visible = list.slice(page * 6, page * 6 + 6), theme = C.THEMES[stage.theme];
    main.innerHTML = `<div class="page-heading"><div><div class="eyebrow">CHOOSE YOUR NEXT EMERGENCY</div><h1>ステージ選択</h1><p>どのステージからでも。気になる場所を選ぼう。</p></div><div class="count"><strong>${recordCount()}</strong> / 48 CLEAR</div></div><nav class="tabs" aria-label="エリアで絞り込む">${[{ name: 'すべて', id: -1 }, ...C.THEMES.map((t, id) => ({ name: t.name, id }))].map(t => `<button class="tab ${filter === t.id ? 'selected' : ''}" data-filter="${t.id}" aria-pressed="${filter === t.id}">${t.name}</button>`).join('')}</nav><div class="select-layout"><div><div class="stage-grid">${visible.map(s => { const rec = saved.records[`${s.id}-${difficulty}`]; return `<button class="stage-card ${s.id === stage.id ? 'selected' : ''}" data-stage="${s.id}" aria-label="ステージ${s.id} ${s.name}" aria-pressed="${s.id === stage.id}"><canvas data-preview="${s.id}" aria-hidden="true"></canvas><div class="card-title"><span>${String(s.id).padStart(2, '0')}</span>${s.name}</div><div class="card-meta"><span>${C.THEMES[s.theme].name}</span><span class="check">${rec ? '✓ CLEAR' : '未クリア'}</span></div></button>`; }).join('')}</div><div class="page-nav"><button class="button small secondary" data-action="home">← タイトルへ</button><div class="pagination"><button class="icon-button" data-action="prev-page" aria-label="前のページ" ${page === 0 ? 'disabled' : ''}>‹</button><span>${page + 1} / ${pages}</span><button class="icon-button" data-action="next-page" aria-label="次のページ" ${page >= pages - 1 ? 'disabled' : ''}>›</button></div><button class="button small secondary" data-action="random">↻ ランダム</button></div></div><aside class="selected-panel"><div class="eyebrow">${theme.tag}</div><div class="number">${String(stage.id).padStart(2, '0')}</div><h2>${stage.name}</h2><canvas id="selected-map" aria-label="選択したステージのマップ"></canvas><p>${theme.name} · トイレ${C.DIFFICULTIES[difficulty].toilets}か所 / 62の仕掛け<br>通行人${C.DIFFICULTIES[difficulty].people}人 · 接触すると立ち話<br>全体地図は基本配置のサンプルです。</p>${difficultyButtons()}<label class="variation"><input id="map-variation" type="checkbox" ${saved.reshuffle?'checked':''}> プレイごとに配置を変える</label><div class="difficulty-note">${difficultyNote()}</div><button class="button primary" data-action="play-selected">このステージで遊ぶ ↗</button></aside></div>`;
    requestAnimationFrame(() => {
      if (screen !== 'stages') return;
      $$('canvas[data-preview]').forEach(c => { const s = C.STAGES[Number(c.dataset.preview) - 1]; R.thumbnail(c, C.generate(s.seed, difficulty, s.theme)); });
      R.thumbnail($('#selected-map'), C.generate(stage.seed, difficulty, stage.theme));
    });
  }
  function $$(s) { return Array.from(document.querySelectorAll(s)); }
  function openModal(kind, html, wide = false) {
    if (!modal) returnFocus = document.activeElement;
    modal = kind; $('#app').inert = true; keys.clear(); held.clear(); if (game && game.state === 'playing') game.paused = true;
    modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">${html}</section></div>`;
    const first = modalRoot.querySelector('button,input'); if (first) first.focus();
  }
  function closeModal(resume = true) {
    modal = null; modalRoot.innerHTML = ''; $('#app').inert = false; keys.clear(); held.clear(); lastTime = performance.now();
    if (game && resume && game.state === 'playing') game.paused = false;
    if (returnFocus && returnFocus.isConnected) returnFocus.focus({ preventScroll: true }); returnFocus = null;
  }
  function showHelp() {
    openModal('help', `<div class="eyebrow">HOW TO PLAY</div><h2 id="modal-title">空いているトイレを見つけよう。</h2><p class="lead">残り時間は「我慢できる時間」。入ってから3秒でクリアです。</p><div class="help-grid"><div class="help-card"><span class="step">1</span><div class="help-symbol">↑ ← ↓ →</div><h3>移動する</h3><p><kbd>WASD</kbd> / 矢印キーで移動。<br><kbd>Shift</kbd> で急ぐと、時計も少し早く進みます。約4秒の連続ダッシュで息切れ。歩くと回復します。見えている床をクリックしても移動できます。</p></div><div class="help-card"><span class="step">2</span><div class="help-symbol">WC ♫</div><h3>音を聞いて、決める</h3><p>近づいて <kbd>E</kbd> で入る・待つ。水を流す音なら、もうすぐ空くかも。待機中も移動すれば中断できます。</p></div><div class="help-card"><span class="step">3</span><div class="help-symbol">+ 3 sec.</div><h3>仲間と探す</h3><p><kbd>E</kbd> で仲間を誘うと +3秒。トイレ前で <kbd>Q</kbd> を押すと先に譲れます。案内係は2秒で場所を教えてくれます。</p></div></div><p class="controls-info" style="margin-top:18px">人に触れると3〜9秒の立ち話。歩いていても止められ、走ると会話が2秒長引きます。会話中は移動・入室できず、時計も進みます。<br>会話後2.5秒はつかまりません。人の脇を通り、息切れゲージにも注意。空いたトイレも再び使用中・清掃中になります。<br><kbd>M</kbd> 全体地図。<kbd>Esc</kbd> / <kbd>P</kbd> で一時停止。画面を離れると自動で止まります。<br>スマートフォンでは下の方向ボタンと「E アクション」で操作できます。</p><div class="gimmick-guide">${Object.entries(C.FEATURE_INFO).map(([id,f])=>`<div><b style="color:${f.color}">${f.icon} ${f.name}</b><small>${f.hint}</small></div>`).join('')}</div><div class="modal-actions"><button class="button secondary" data-action="close-modal">閉じる</button><button class="button primary" data-action="practice">練習してみる →</button></div>`, true);
  }
  function showMap(){
    if(!game||game.state!=='playing'||modal)return;
    openModal('map',`<div class="eyebrow">DUNGEON MAP / SEED ${game.options.seed}</div><h2 id="modal-title">探索マップ</h2><p class="lead">${game.map.w} × ${game.map.h} マス / ${game.map.nodes.length}の部屋と分岐。地図を見ている間は時間が止まります。</p><canvas id="dungeon-map" class="dungeon-map" aria-label="探索済みの全体地図"></canvas><div class="legend"><span>● あなた</span><span>緑：空き / 赤：使用中</span><span>黄：近道</span><span>紫：エレベーター</span></div><p class="controls-info">濃い部分は未探索。MAPの案内図を読むと全体が分かります。</p><div class="modal-actions"><button class="button primary" data-action="close-modal">探索に戻る</button></div>`,true);
    R.thumbnail($('#dungeon-map'),game.map,{game,route:game.route});
  }
  function showSettings() {
    openModal('settings', `<div class="eyebrow">SETTINGS</div><h2 id="modal-title">遊びやすく、整える。</h2><label class="settings-row"><span>効果音<small>足音・発見音・残り時間の音</small></span><input id="setting-sound" type="checkbox" ${saved.sound ? 'checked' : ''}></label><label class="settings-row"><span>音量</span><input id="setting-volume" type="range" min="0" max="1" step=".05" value="${saved.volume}"></label><label class="settings-row"><span>動きを控えめに<small>歩行アニメーション・点滅を抑えます</small></span><input id="setting-reduced" type="checkbox" ${saved.reduced ? 'checked' : ''}></label><p class="controls-info" style="margin-top:15px">記録はこのブラウザに自動保存します。<br>HTMLの場所やブラウザを変えると、記録が引き継がれない場合があります。</p>${!canSave ? '<p class="save-warning">現在のブラウザでは保存できません。ゲームはそのまま遊べます。</p>' : ''}<div class="modal-actions"><button class="button primary" data-action="close-modal">完了</button></div>`);
  }
  function ready(options) {
    currentOptions = options; const s = C.STAGES.find(s => s.id === options.stageId), label = options.practice ? '練習用の小さなマップ' : s ? `${String(s.id).padStart(2, '0')} ${s.name}` : '気ままにランダムマップ';
    openModal('ready', `<div class="eyebrow">READY WHEN YOU ARE</div><h2 id="modal-title">${label}</h2><p class="lead">トイレに入って、3秒。<br>人との接触は立ち話に！ 時計は止まりません。<br>少ないトイレを探し、清掃の合間に駆け込もう。</p><div class="ready-info"><span class="chip">${C.THEMES[options.theme].name}</span><span class="chip">${options.practice ? '練習 · 90秒' : `${C.DIFFICULTIES[options.difficulty].label} · ${C.DIFFICULTIES[options.difficulty].time}秒`}</span></div><p class="controls-info"><kbd>WASD</kbd> 移動 <kbd>Shift</kbd> 急ぐ <kbd>E</kbd> アクション<br>近くの仲間を誘うと +3秒。<kbd>M</kbd> で全体地図。<br>SEED ${options.seed} · 同じマップで再挑戦できます。</p><div class="modal-actions"><button class="button secondary" data-action="close-modal">戻る</button><button class="button primary" data-action="begin">準備OK、スタート →</button></div>`);
  }
  function startGame(options, restored = null) {
    closeModal(false); setScreen('game'); currentOptions = { ...options }; practice = !!options.practice;
    game = restored || new C.Game(options); resultSaved = false; lastTickSecond = -1; lastHud = 0; lastFootstep = 0; flushed.clear();
    const s = C.STAGES.find(s => s.id === options.stageId), label = practice ? 'PRACTICE' : s ? `STAGE ${String(s.id).padStart(2, '0')}` : 'RANDOM';
    main.innerHTML = `<div class="game-header"><div class="game-stage">${label} <span style="color:var(--muted)">/ ${C.THEMES[options.theme].name}</span><small>${practice ? 'ひと息つくまで、練習しよう' : s?.name || `SEED ${options.seed}`} · ${C.DIFFICULTIES[options.difficulty].label}</small></div><div class="timer-wrap"><div class="timer-label">限界まで</div><div class="timer" id="timer">${game.limit}:00</div><div class="time-track"><i id="time-fill"></i></div></div><div class="game-actions"><button class="button small secondary" data-action="map">M 地図</button><button class="button small secondary" data-action="pause">Ⅱ 一時停止</button></div></div><div class="game-board"><canvas id="world" tabindex="0" aria-label="ゲーム画面。WASDか矢印キーで移動、Eでアクション、Escで一時停止"></canvas><div class="map-caption" id="map-caption">見つけたトイレ 0 / ${game.map.toilets.length}</div><canvas class="minimap" id="minimap" aria-label="探索済みのミニマップ"></canvas><div class="toast hidden" id="toast" role="status"></div><div id="context" class="context-bar hidden"></div></div><div class="game-bottom"><div class="key-guide"><span><kbd>WASD</kbd> / <kbd>↑↓←→</kbd> 移動</span><span><kbd>Shift</kbd> 急ぐ</span><span><kbd>E</kbd> 調べる</span><span><kbd>M</kbd> 全体地図</span></div><div class="stamina-meter" id="stamina-meter"><span id="stamina-label">息の余裕 100%</span><div><i id="stamina-fill"></i></div></div><span class="inventory" id="inventory"></span><span class="buddy-status" id="buddy-status">ひとりで探索中</span></div><div class="touch-controls"><div class="dpad"><button data-key="up" aria-label="上に移動">↑</button><button data-key="left" aria-label="左に移動">←</button><button data-key="down" aria-label="下に移動">↓</button><button data-key="right" aria-label="右に移動">→</button></div><div class="touch-actions"><button data-key="sprint">急ぐ</button><button class="act" data-action="interact">E アクション</button></div></div>`;
    world = new R.World($('#world'), $('#minimap'), game, saved.reduced);
    $('#world').addEventListener('pointerdown', e => { if (modal) return; e.preventDefault(); unlockAudio(); const point = world.point(e.clientX, e.clientY); if(game.mode==='talk'){game.event(`立ち話中… あと${game.talk.remaining.toFixed(1)}秒、話を聞こう`,'bad');return;}if (!game.setDestination(point)) game.event('見えている通路を選んでください'); });
    $$('[data-key]').forEach(button => {
      button.addEventListener('pointerdown', e => { if (modal) return; e.preventDefault(); button.setPointerCapture(e.pointerId); held.add(button.dataset.key); unlockAudio(); });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => button.addEventListener(ev, () => held.delete(button.dataset.key)));
    });
    lastRunSave=0;stashRun();lastTime = performance.now(); updateHud(true); world.draw(performance.now() / 1000); announce('スタート。空いているトイレを探してください。');if(restored){game.paused=false;pause();}
  }
  function pause() {
    if (!game || game.state !== 'playing' || modal) return;
    stashRun();openModal('pause', `<div class="eyebrow">TAKE A BREATH</div><h2 id="modal-title">ひと休み。</h2><p class="lead">時計は止まっています。深呼吸して、次の一歩へ。</p>${game.migrated?'<p class="controls-info">途中データを新版へ引き継ぎました。トイレ・仕掛け・通行人は新しい配置になり、位置と残り時間はそのままです。</p>':''}<div class="modal-actions vertical"><button class="button primary" data-action="close-modal">続ける →</button><button class="button secondary" data-action="retry">同じマップでやり直す</button><button class="button secondary" data-action="reseed">新しい配置でやり直す</button><button class="button secondary" data-action="stages">ステージ選択へ</button><button class="text-button" data-action="home">タイトルへ</button></div>`);
  }
  function updateHud(force = false) {
    if (!game || screen !== 'game') return;
    const rem = Math.max(0, game.remaining), whole = Math.floor(rem), cents = Math.floor((rem - whole) * 100);
    const time = $('#timer'); time.textContent = `${String(whole).padStart(2, '0')}.${String(cents).padStart(2, '0')}`; time.classList.toggle('urgent', rem < 10);
    $('#time-fill').style.width = `${rem / game.limit * 100}%`; $('#time-fill').style.background = rem < 10 ? 'var(--coral)' : 'var(--teal)';
    $('#map-caption').textContent = `見つけたトイレ ${game.map.toilets.filter(t => t.discovered).length} / ${game.map.toilets.length}`;
    $('#inventory').textContent=`鍵 ${game.keys} / メダル ${game.coins}${game.boostUntil>game.elapsed?' / 加速 '+Math.ceil(game.boostUntil-game.elapsed)+'秒':''}`;
    $('#stamina-label').textContent=game.exhausted?'息切れ · 歩いて回復':`息の余裕 ${Math.ceil(game.stamina)}%`;
    $('#stamina-fill').style.width=`${game.stamina}%`;$('#stamina-meter').classList.toggle('exhausted',game.exhausted);
    $('#buddy-status').textContent = game.shared ? '✓ 仲間は無事に到着！' : game.map.buddy.busy ? '仲間を先に案内中' : game.recruited ? '青いスカーフの仲間と探索中' : 'ひとりで探索中';
    const c = game.context(), box = $('#context');
    if(c?.type==='door'){const status=game.toiletStatus(c.target),cue=`${c.target.id}:${Math.round((game.elapsed+status.left)*100)}`;if(!status.open&&status.reason!=='清掃中'&&status.left<4&&!flushed.has(cue)){waterSound();flushed.add(cue);}}
    let html = '';
    if(c?.type==='talk') html=`<div class="conversation" role="group" aria-label="立ち話の残り時間"><div class="conversation-top"><b>${c.label}との立ち話</b><strong>あと ${game.talk.remaining.toFixed(1)} 秒</strong></div><p>「${c.hint}」</p><div class="relief-track"><i style="width:${(1-game.talk.remaining/game.talk.total)*100}%"></i></div><small>話が終わるまで移動できません · 時計は進んでいます</small></div>`;
    else if (c?.type === 'relief') html = `<div class="context-hint">間に合って…！ あと ${Math.max(0, 3 - game.relief).toFixed(1)} 秒</div><div class="relief-track"><i style="width:${Math.min(100, game.relief / 3 * 100)}%"></i></div>`;
    else if (c) html = `<div class="context-hint">${c.hint}</div><div class="context-buttons"><button class="button primary" data-action="interact"><kbd>E</kbd> ${c.label}</button>${c.type === 'door' && game.map.buddy.active && !game.map.buddy.busy && !game.map.buddy.done ? '<button class="button secondary" data-action="yield"><kbd>Q</kbd> 仲間に譲る</button>' : ''}</div>`;
    box.classList.toggle('talking',c?.type==='talk');
    if (box.dataset.html !== html) { box.innerHTML = html; box.dataset.html = html; box.classList.toggle('hidden', !html); }
    const event = game.events[game.events.length - 1], toast = $('#toast');
    if (event && game.elapsed - event.at < 3.2) { toast.textContent = event.text; toast.className = `toast ${event.kind}`; if (event !== lastEvent) { announce(event.text); if (event.kind === 'discover') tone(750, .12); if (event.kind === 'bad') tone(165, .14, 0, .15, 'triangle'); if (event.kind === 'good') tone(660, .12); lastEvent = event; } } else toast.classList.add('hidden');
    if (whole < 10 && whole !== lastTickSecond && !game.paused && game.state === 'playing') { tone(whole < 4 ? 620 : 420, .07, 0, .08); lastTickSecond = whole; }
  }
  function renderResult() {
    forgetRun();const won = game.state === 'won'; setScreen('result'); world = null; closeModal(false);
    if (won && !resultSaved && !practice && game.options.stageId) {
      const k = `${game.options.stageId}-${game.options.difficulty}`, old = saved.records[k];
      saved.records[k] = { best: Math.max(old?.best || 0, game.remaining), wins: (old?.wins || 0) + 1 }; save(); resultSaved = true;
    }
    chime(won); announce(won ? '間に合った！ ステージクリア。' : '間に合わなかった。再挑戦できます。');
    const s = C.STAGES.find(s => s.id === game.options.stageId);
    main.innerHTML = `<section class="result"><div class="result-heading"><div class="eyebrow">${won ? 'STAGE CLEAR — BREATHE OUT.' : 'TIME UP — ONE MORE TRY.'}</div><h1>${won ? '間に合った！' : '間に合わなかった…'}</h1><p>${practice ? '練習マップ' : s ? `${String(s.id).padStart(2, '0')} ${s.name}` : 'ランダムマップ'} / ${C.DIFFICULTIES[game.options.difficulty].label}</p></div><div class="result-layout"><canvas class="result-art" id="result-art" aria-label="${won ? '喜ぶ棒人間' : '落ち込む棒人間を励ます仲間'}"></canvas><div class="result-panel">${won ? `<div class="stat"><span>残り時間</span><strong style="color:var(--coral)">${game.remaining.toFixed(2)}<small>秒</small></strong></div><div class="stat"><span>移動距離</span><strong>${Math.round(game.moved * 1.2)}<small>m</small></strong></div><div class="stat"><span>探検メダル / 発見した仕掛け</span><strong>${game.coins}<small>枚 / ${game.map.features.filter(f=>f.discovered).length}か所</small></strong></div><div class="stat"><span>立ち話の時間ロス</span><strong>${game.talkLost.toFixed(1)}<small>秒 / ${game.talkCount}回</small></strong></div><div class="award"><span>✦</span><div><small>獲得した称号</small><b>${game.title}</b></div></div>${!canSave ? '<p class="save-warning">ブラウザの制限により、記録は今回の起動中のみ保持されます。</p>' : ''}` : `<h3 style="font-size:15px">今回のルート</h3><canvas id="recap" class="recap" aria-label="通った道とタイムアップ時のトイレの空き状況"></canvas><div class="legend"><span style="color:var(--coral)">━ 通った道</span><span style="color:var(--teal)">■ 空き</span><span>× タイムアップ</span></div><p class="hint">${failureHint()}</p>`}</div></div><div class="result-buttons">${won ? `<button class="button primary" data-action="next-stage">${practice ? '本番へ進む' : game.options.stageId === 48 ? 'ランダムマップに挑戦' : '次のステージへ'} →</button><button class="button secondary" data-action="retry">もう一度</button>` : '<button class="button primary" data-action="retry">↻ 同じマップで再挑戦</button><button class="button secondary" data-action="reseed">新しい配置で挑戦</button>'}<button class="button secondary" data-action="stages">ステージ選択</button></div></section>`;
    requestAnimationFrame(() => { if (screen !== 'result') return; R.illustration($('#result-art'), won ? 'won' : 'lost'); if (!won) R.thumbnail($('#recap'), game.map, { game, full: true, route: game.route }); });
  }
  function failureHint() {
    if (game.mode === 'relief') return '入口に着いてから、あと3秒必要です。少し余裕を残して駆け込もう。';
    if (game.talkCount) return `立ち話${game.talkCount}回で${game.talkLost.toFixed(1)}秒のロス。人から少し距離をとって通ろう。会話が終わった直後は離れるチャンス！`;
    if(game.exhausted)return 'ダッシュは短く区切ろう。歩いて息を整えてから、ここぞという時に走ろう。';
    if (game.penalties > 1) return '走行禁止エリアや濡れた床は歩こう。資材の脇を通れば時間を節約できます。';
    if (game.waited > 10) return '長居の気配がしたら別のトイレへ。水を流す音なら、もうすぐです。';
    return '緑のマークは、タイムアップ時に空いていたトイレ。次はこの道も探してみよう。';
  }
  function randomSeed(){const a=new Uint32Array(1);if(window.crypto?.getRandomValues)window.crypto.getRandomValues(a);else a[0]=Date.now();return a[0]%1000000000;}
  function optionsFor(s, d = difficulty) { return { seed: saved.reshuffle?randomSeed():s.seed, difficulty: d, theme: s.theme, stageId: s.id }; }
  function randomReady() {
    const a = new Uint32Array(1); if (window.crypto?.getRandomValues) window.crypto.getRandomValues(a); else a[0] = Date.now();
    const seed = a[0] % 1000000000; ready({ seed, difficulty, theme: seed % C.THEMES.length, stageId: 0 });
  }
  const actions = {
    home: renderTitle,
    'resume-run':()=>{const restored=C.Game.restore(resumeSnapshot);if(restored)startGame(restored.options,restored);else{forgetRun();renderTitle();}},
    map:showMap,
    reseed:()=>ready({...game.options,seed:randomSeed()}),
    stages: () => { stage = C.STAGES.find(s => s.id === game?.options.stageId) || stage; renderStages(); },
    help: showHelp, settings: showSettings,
    sound: () => { saved.sound = !saved.sound; save(); syncSettings(); unlockAudio(); tone(); },
    'close-modal': () => closeModal(true),
    'quick-start': () => { const next = C.STAGES.find(s => !saved.records[`${s.id}-${difficulty}`]) || C.STAGES[0]; ready(optionsFor(next)); },
    'play-selected': () => ready(optionsFor(stage)),
    begin: () => startGame(currentOptions),
    practice: () => ready({ seed: 60317, difficulty: 'easy', theme: 0, practice: true, stageId: 0 }),
    pause,
    interact: () => { if (game && !modal) { game.interact(); updateHud(true); } },
    yield: () => { if (game && !modal) { game.yieldBuddy(); updateHud(true); } },
    retry: () => ready({ ...game.options }),
    random: randomReady,
    'next-stage': () => { const id = game.options.stageId; if (practice) ready(optionsFor(C.STAGES[0])); else if (!id || id >= 48) randomReady(); else { stage = C.STAGES[id]; ready(optionsFor(stage, game.options.difficulty)); } },
    'prev-page': () => { page = Math.max(0, page - 1); renderStages(); },
    'next-page': () => { page++; renderStages(); }
  };
  document.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button || button.disabled) return;
    unlockAudio();
    if (button.dataset.action && actions[button.dataset.action]) { tone(510, .025, 0, .04); actions[button.dataset.action](); }
    else if (button.dataset.stage) { stage = C.STAGES[Number(button.dataset.stage) - 1]; renderStages(); }
    else if (button.dataset.filter !== undefined) { filter = Number(button.dataset.filter); page = 0; stage = C.STAGES.find(s => filter < 0 || s.theme === filter); renderStages(); }
    else if (button.dataset.difficulty) { difficulty = button.dataset.difficulty; saved.difficulty = difficulty; save(); renderStages(); }
  });
  document.addEventListener('input', event => {
    const el = event.target;
    if(el.id==='map-variation'){saved.reshuffle=el.checked;save();}
    if (el.id === 'setting-sound') { saved.sound = el.checked; unlockAudio(); }
    if (el.id === 'setting-volume') { saved.volume = Number(el.value); tone(); }
    if (el.id === 'setting-reduced') { saved.reduced = el.checked; if (world) world.reduced = saved.reduced; }
    if (el.id.startsWith('setting-')) { save(); syncSettings(); }
  });
  const movementKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'ShiftLeft', 'ShiftRight'];
  document.addEventListener('keydown', e => {
    if (modal) {
      if (e.code === 'Escape') { e.preventDefault(); closeModal(true); return; }
      if (e.code === 'Tab') { const list = Array.from(modalRoot.querySelectorAll('button:not(:disabled),input')); const first = list[0], last = list[list.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
      return;
    }
    if (screen !== 'game' || !game) return;
    if (movementKeys.includes(e.code) || ['KeyE', 'KeyQ', 'Escape', 'KeyP', 'KeyM', 'Space'].includes(e.code)) e.preventDefault();
    unlockAudio(); if (movementKeys.includes(e.code)) keys.add(e.code);
    if (!e.repeat) { if (e.code === 'KeyE' || e.code === 'Space') actions.interact(); if (e.code === 'KeyQ') actions.yield(); if(e.code==='KeyM')showMap(); if (e.code === 'Escape' || e.code === 'KeyP') pause(); }
  });
  document.addEventListener('keyup', e => keys.delete(e.code));
  function focusLost() { keys.clear(); held.clear(); if (screen === 'game' && game?.state === 'playing' && !modal) pause(); }
  window.addEventListener('blur', focusLost);
  window.addEventListener('pagehide',stashRun);
  window.addEventListener('beforeunload',stashRun);
  document.addEventListener('visibilitychange', () => { if (document.hidden) focusLost(); });
  window.addEventListener('resize', () => {
    if (screen === 'title' && $('#title-art')) R.illustration($('#title-art'));
    if (screen === 'stages') { $$('canvas[data-preview]').forEach(c => { const s = C.STAGES[Number(c.dataset.preview) - 1]; R.thumbnail(c, C.generate(s.seed, difficulty, s.theme)); }); R.thumbnail($('#selected-map'), C.generate(stage.seed, difficulty, stage.theme)); }
    if (screen === 'result') { R.illustration($('#result-art'), game.state === 'won' ? 'won' : 'lost'); if ($('#recap')) R.thumbnail($('#recap'), game.map, { game, full: true, route: game.route }); }
  });
  function frame(now) {
    const dt = Math.min(.15, Math.max(0, (now - lastTime) / 1000)); lastTime = now;
    if (screen === 'game' && game) {
      const input = { x: Number(keys.has('KeyD') || keys.has('ArrowRight') || held.has('right')) - Number(keys.has('KeyA') || keys.has('ArrowLeft') || held.has('left')), y: Number(keys.has('KeyS') || keys.has('ArrowDown') || held.has('down')) - Number(keys.has('KeyW') || keys.has('ArrowUp') || held.has('up')), sprint: keys.has('ShiftLeft') || keys.has('ShiftRight') || held.has('sprint') };
      if(!game.paused&&now-lastRunSave>5000){stashRun();lastRunSave=now;}
      const movedBefore = game.moved; game.update(dt, input); game._moving = game.moved > movedBefore;
      if (game._moving && game.moved - lastFootstep > .85) { tone(input.sprint ? 170 : 125, .025, 0, .025, 'triangle'); lastFootstep = game.moved; }
      if (game.state !== 'playing' && !modal) renderResult();
      else if (world) { world.draw(now / 1000); if (now - lastHud > 60) { updateHud(); lastHud = now; } }
    }
    requestAnimationFrame(frame);
  }
  // Read-only diagnostics make automated browser checks independent of canvas pixels.
  window.ToiletApp = {
    snapshot: () => game ? ({ screen, modal, state: game.state, paused: game.paused, mode: game.mode, talk:game.talk?{...game.talk}:null,talkGrace:game.talkGrace,talkCount:game.talkCount,talkLost:game.talkLost,stamina:game.stamina,exhausted:game.exhausted,shoppers:game.map.shoppers.map(n=>({id:n.id,kind:n.kind,x:n.x,y:n.y,cooldown:n.cooldown})),remaining: game.remaining, elapsed: game.elapsed, player: { ...game.player }, seed: game.options.seed, stageId: game.options.stageId, difficulty: game.options.difficulty, features: game.map.features.map(f=>({...f})),gates:game.map.gates.map(g=>({...g})),keys:game.keys,coins:game.coins,boostUntil:game.boostUntil,mapKnown:game.mapKnown,speeds:{ArrowRight:game.speed(false,1,0),ArrowLeft:game.speed(false,-1,0),ArrowUp:game.speed(false,0,-1),ArrowDown:game.speed(false,0,1)},speed:game.speed(),relief: game.relief, waited: game.waited, penalties: game.penalties, shared: game.shared, buddy: { active: game.map.buddy.active, done: game.map.buddy.done }, toilets: game.map.toilets.map(t => ({ ...t,status:game.toiletStatus(t) })), map: { themeId:game.map.themeId,floorCount:game.map.floorCount,w: game.map.w, h: game.map.h, grid: game.map.grid.map(row => row.slice()) }, camera: world ? { ...world.camera, tile: world.tile } : null, records: JSON.parse(JSON.stringify(saved.records)) }) : ({ screen, modal, records: JSON.parse(JSON.stringify(saved.records)) }),
    version: '3.0.0'
  };
  save(); syncSettings(); renderTitle(); requestAnimationFrame(frame);
})();
