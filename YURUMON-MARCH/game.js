(() => {
  'use strict';
  const C = window.Yurumon;
  const { UNITS, CHAPTERS, STAGES, stats, upgradeCost, clamp } = C;
  const app = document.getElementById('app'), overlay = document.getElementById('overlay');
  const SAVE_KEY = 'yurumon-march-v1';
  let storageWorks = true, save;
  try { save = C.normalizeSave(JSON.parse(localStorage.getItem(SAVE_KEY))); } catch { save = C.freshSave(); }
  let page = 'home', chapter = Math.min(2, Math.floor(save.cleared / 4)), selectedStage = Math.min(save.cleared, 11);
  let selectedUnit = 1, selectedSlot = 0, battle = null, paused = false, speed = 1, auto = false;
  let effectList = [], shake = 0, cannonFlash = 0, lastTime = 0, autoClock = 0, hudClock = 0, bannerUntil = 0;
  let audioContext, toastTimer, resultReward = null, previousFocus, bannerText = '', battleContext;
  const imageAssets = {};
  // Explicit atlas regions keep every hand-made silhouette intact.
  const rects = [[8,45,301,416],[313,63,330,402],[643,38,264,426],[909,53,336,410],[5,473,290,345],[306,474,327,340],[638,494,320,322],[967,487,283,324],[5,842,300,371],[307,878,328,320],[641,845,291,368],[934,813,320,407]];
  for (const name of ['characters', 'castles', 'meadow', 'night', 'sunset', 'home']) { const img = new Image(); img.src = `assets/${name}.png`; imageAssets[name] = img; }
  const iconPaths = {
    home: '<path d="m3 10 9-7 9 7v10H4V10m5 10v-7h6v7"/>',
    leaf: '<path d="M20 3C9 2 3 6 4 13s12 8 16-10Z"/><path d="M3 22 15 9"/>',
    gem: '<path d="m8 3-5 6 9 12 9-12-5-6Zm-5 6h18M8 3l4 18 4-18"/>',
    map: '<path d="m3 5 6-2 6 3 6-2v15l-6 2-6-3-6 2Zm6-2v15m6-12v15"/>',
    team: '<circle cx="9" cy="8" r="3"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M16 5a3 3 0 0 1 0 6m2 3a6 6 0 0 1 4 6"/>',
    star: '<path d="m12 3 2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3 9.4l6-.9Z"/>',
    magic: '<path d="m4 21 12-12m-4-5 1-3 1 3 3 1-3 1-1 3-1-3-3-1Zm6 10 1-2 1 2 2 1-2 1-1 2-1-2-2-1Z"/>',
    gear: '<path d="m10 3 4 0 1 3 3 1 3 3v4l-3 1-1 3-3 3h-4l-1-3-3-1-3-3v-4l3-1 1-3Z"/><circle cx="12" cy="12" r="3"/>',
    arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
    back: '<path d="M20 12H5m6-6-6 6 6 6"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
    book: '<path d="M12 5C9 2 4 3 2 4v16c4-2 7-2 10 0 3-2 6-2 10 0V4c-3-1-7-2-10 1Zm0 0v15"/>',
    flag: '<path d="M5 22V3m0 1c4-4 9 5 15 0v10c-6 5-11-4-15 0"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    sound: '<path d="m3 9 4 0 5-5v16l-5-5H3Zm13-2a7 7 0 0 1 0 10m3-13a11 11 0 0 1 0 16"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    heart: '<path d="M12 21 3 12C-2 5 8 0 12 7 16 0 26 5 21 12Z"/>',
    cannon: '<path d="m4 11 13-7 4 7-13 6Z"/><circle cx="8" cy="18" r="3"/><path d="M12 19h8M18 2l2-1m1 5h2"/>',
    expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>'
  };
  function icon(name) { return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || iconPaths.star}</svg>`; }
  function sprite(id, extra = '') { const [x,y,w,h] = rects[id]; return `<span class="sprite ${extra}" aria-hidden="true"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMax meet"><svg width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}" overflow="hidden"><image href="assets/characters.png" width="1254" height="1254"/></svg></svg></span>`; }
  const num = n => Math.floor(n).toLocaleString('ja-JP');
  const seconds = t => `${Math.floor(t / 60).toString().padStart(2,'0')}:${Math.floor(t % 60).toString().padStart(2,'0')}`;
  const starsHTML = n => '<span>' + '★'.repeat(n) + '<span class="off">' + '☆'.repeat(3 - n) + '</span></span>';
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { if (storageWorks) toast('このブラウザでは自動保存が使えません。設定からセーブを書き出せます。'); storageWorks = false; } }
  function toast(text) { const el = document.getElementById('toast'); el.textContent = text; el.classList.add('toast-show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('toast-show'), 2900); }
  function audioStart() { if (!save.sound) return; try { audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); if (audioContext.state === 'suspended') audioContext.resume().catch(() => {}); } catch {} }
  function tone(freq = 480, duration = .09, delay = 0, type = 'sine', volume = .055) {
    if (!save.sound || !audioContext) return;
    const start = audioContext.currentTime + delay, osc = audioContext.createOscillator(), gain = audioContext.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq,start); gain.gain.setValueAtTime(0,start); gain.gain.linearRampToValueAtTime(volume,start+.01); gain.gain.exponentialRampToValueAtTime(.001,start+duration);
    osc.connect(gain).connect(audioContext.destination); osc.start(start); osc.stop(start+duration+.03);
  }
  function tune(kind) { if (kind === 'victory') [523,659,784,1047].forEach((f,i)=>tone(f,.3,i*.13)); else if (kind === 'summon') [392,523,659,784,1047].forEach((f,i)=>tone(f,.4,i*.11)); else if (kind === 'cannon') { tone(120,.3,0,'triangle',.09); tone(70,.45,.1,'sine',.08); } else tone(kind === 'deploy' ? 660 : 430,.07); }
  function resources() { return `<div class="resources"><div class="currency leaf" title="育成に使う、森のしずく">${icon('leaf')}<b data-resource="leaves">${num(save.leaves)}</b></div><div class="currency gem" title="仲間の召喚に使う、星のかけら">${icon('gem')}<b data-resource="gems">${num(save.gems)}</b></div><button class="circle-button" data-action="settings" aria-label="設定">${icon('gear')}</button></div>`; }
  function refreshResources() { document.querySelectorAll('[data-resource]').forEach(el=>el.textContent=num(save[el.dataset.resource])); }
  function header() { return `<header class="topbar"><button class="brand" data-action="home" aria-label="ゆるモン大行進 ホーム"><span class="brand-mark">${icon('leaf')}</span><span><b>ゆるモン大行進</b><small>A LITTLE MONSTER JOURNEY</small></span></button>${resources()}</header>`; }
  const pages = [['home','home','ホーム'],['map','map','冒険'],['team','team','編成'],['upgrade','leaf','育成'],['summon','magic','召喚']];
  function nav() { return `<nav class="bottom-nav" aria-label="メインメニュー">${pages.map(([id,i,label])=>`<button class="nav-item ${page===id?'active':''}" ${page===id?'aria-current="page"':''} data-action="${id}">${icon(i)}<span>${label}</span></button>`).join('')}</nav>`; }
  function pageHead(kicker,title,description='',right='') { return `<div class="page-head"><div><span class="eyebrow">${kicker}</span><h1>${title}</h1>${description?`<p>${description}</p>`:''}</div>${right}</div>`; }
  function miniUnit(id, action='inspect', slot=null) { const u=UNITS[id]; return `<button class="mini-unit ${slot===selectedSlot&&page==='team'?'slot-selected':''}" data-action="${action}" data-id="${slot??id}" aria-label="${u.name} レベル${save.levels[id]}"><span class="unit-level">Lv.${save.levels[id]}</span>${sprite(id)}<span class="unit-name">${u.name}</span><span class="unit-cost">魔力 ${u.cost}</span></button>`; }
  function areaCard(ch,i) { const open=save.cleared>=i*4;return `<button class="area-card ${!open?'locked':''}" data-action="chapter" data-id="${i}"><img src="assets/${ch.image}.png" alt=""><div><small>CHAPTER ${ch.icon}</small><b>${ch.name}</b><span>${open?`${save.stars.slice(i*4,i*4+4).filter(Boolean).length} / 4 ステージクリア`:'前のエリアをクリアして解放'}</span></div>${icon(open?'arrow':'lock')}</button>`; }
  function homeView() {
    const next=Math.min(save.cleared,11), ch=CHAPTERS[Math.floor(next/4)], done=save.stars.filter(Boolean).length;
    return `${pageHead('YOUR LITTLE ADVENTURE','おかえりなさい、冒険者さん。','今日も、小さな仲間たちが待っています。',`<span class="date-tag">${icon('sun')} のんびり、冒険日和。</span>`)}
    <div class="home-grid"><section class="hero"><div class="hero-content"><span class="hero-pill">${icon('leaf')} 絵本の世界へ、ようこそ</span><h2>小さな仲間と、<br>大きな冒険。</h2><p>ぽよん、ふわり、とことこ。<br>自分だけの仲間と、森の向こうへ。</p><button class="primary" data-action="map">冒険に出かける ${icon('arrow')}</button></div></section><aside class="journey"><div class="journey-header">${icon('book')} 冒険のきろく</div><h3>${ch.name}</h3><p>次の目的地：${STAGES[next].name}</p><div class="mini-art" style="background-image:url('assets/${ch.image}.png')">${sprite(0)}</div><div class="progress-label"><span>旅の進みぐあい</span><b>${done} / 12</b></div><div class="progress"><span style="width:${done/12*100}%"></span></div><button class="text-button" data-action="map">冒険の地図をひらく ${icon('arrow')}</button></aside></div>
    ${save.cleared===12?'<div class="completion">✦ すべてのエリアを踏破しました！ 最高の仲間たちと、全ステージ三つ星に挑戦してみましょう。</div>':''}
    <div class="section-title"><h2>${icon('team')} いっしょに旅する仲間 <span>YOUR PARTY</span></h2><button class="text-button" data-action="team">編成する ${icon('arrow')}</button></div><section class="party-strip">${save.team.map(id=>miniUnit(id)).join('')}</section>
    <div class="section-title"><h2>${icon('map')} 冒険の世界 <span>EXPLORE THE WORLD</span></h2><span class="quiet-tag">3つのエリア、12の物語。</span></div><section class="areas">${CHAPTERS.map(areaCard).join('')}</section><p class="footer-note">進みぐあいは自動で保存されます。あせらず、あなたのペースで。</p>`;
  }
  function mapView() {
    const ch=CHAPTERS[chapter], st=STAGES[selectedStage], open=selectedStage<=save.cleared;
    return `${pageHead('WORLD MAP','冒険の地図','気になる場所を選んで、仲間と出発しましょう。')}<div class="chapter-tabs">${CHAPTERS.map((c,i)=>`<button class="chapter-tab ${chapter===i?'active':''}" data-action="chapter" data-id="${i}">${i+1}. ${c.name}</button>`).join('')}</div><section class="map-scene" style="background-image:url('assets/${ch.image}.png')"><div class="map-caption"><span class="eyebrow">CHAPTER ${ch.icon}</span><h2>${ch.name}</h2><p>${ch.sub}</p></div><div class="map-trail">${STAGES.filter(s=>s.chapter===chapter).map((s,i)=>`<button class="stage-node ${s.id===selectedStage?'selected':''} ${s.id>save.cleared?'locked':''}" style="left:${i*100/3}%" data-action="select-stage" data-id="${s.id}" aria-label="${s.number} ${s.name}${s.id>save.cleared?' 未解放':''}"><span>${s.id>save.cleared?icon('lock'):s.boss?icon('flag'):s.number}</span><small>${save.stars[s.id]?'★'.repeat(save.stars[s.id]):s.boss?'ボスステージ':s.number}</small></button>`).join('')}</div></section><section class="stage-detail"><div><span class="eyebrow">STAGE ${st.number} ${st.boss?'・ BOSS':''}</span><h3>${st.name}</h3><p>${open?st.boss?'大きな敵が登場！ 盾役と回復役を忘れずに。':'仲間を召喚して、向こうの拠点をめざそう。':'ひとつ前のステージをクリアすると遊べます。'}</p></div><div class="reward">${icon('leaf')} ${st.reward}${!save.stars[st.id]?` ＋ 初回ボーナス`:''}</div><button class="primary coral" data-action="start" data-id="${st.id}" ${open?'':'disabled'}>${open?'このステージへ出発':'まだ未解放'} ${icon(open?'arrow':'lock')}</button></section><div class="section-title"><h2>出撃メンバー</h2><button class="text-button" data-action="team">編成を変える ${icon('arrow')}</button></div><section class="party-strip">${save.team.map(id=>miniUnit(id)).join('')}</section>`;
  }
  function teamView() { return `${pageHead('YOUR COMPANIONS','旅の仲間を編成','上の出撃枠を選んでから、下の仲間をタップして入れ替えます。')}<section class="party-strip">${save.team.map((id,i)=>miniUnit(id,'slot',i)).join('')}</section><p class="team-note">枠 ${selectedSlot+1} を選択中 · すでに出撃中の仲間を選ぶと、位置を交換します。</p><div class="section-title"><h2>仲間ずかん <span>${save.owned.length} / 8 FRIENDS</span></h2><button class="text-button" data-action="summon">新しい仲間をさがす ${icon('arrow')}</button></div><section class="team-grid">${UNITS.map(u=>unitCard(u)).join('')}</section>`; }
  function unitCard(u) { const own=save.owned.includes(u.id), s=stats(u.id,save.levels[u.id]);return `<button class="unit-card ${own?'':'locked'} ${save.team.includes(u.id)?'selected':''}" data-action="equip" data-id="${u.id}"><div class="card-meta"><span class="tag">${own?save.team.includes(u.id)?'出撃中':'待機中':'未加入'}</span><span>Lv.${save.levels[u.id]}</span></div>${sprite(u.id)}<h3>${u.name}</h3><p>${u.role}</p><div class="stat-pills"><span>魔力 ${u.cost}</span><span>体力 ${s.hp}</span><span>攻撃 ${s.atk}</span></div></button>`; }
  function upgradeView() { const u=UNITS[selectedUnit], lv=save.levels[u.id], s=stats(u.id,lv), next=stats(u.id,lv+1), cost=upgradeCost(lv);return `${pageHead('GROW TOGETHER','仲間を育てる','森のしずくを使って、仲間をもっとたくましく。')}<div class="upgrade-layout"><aside class="unit-picker">${save.owned.map(id=>miniUnit(id,'pick-upgrade')).join('')}</aside><section class="upgrade-card"><div class="upgrade-art">${sprite(u.id)}</div><div class="upgrade-info"><span class="eyebrow">${u.role}</span><h2>${u.name}</h2><p>${u.description}</p><span class="hero-pill">レベル ${lv} / 20</span><dl><div><dt>体力</dt><dd>${s.hp}${lv<20?` → ${next.hp}`:''}</dd></div><div><dt>攻撃力</dt><dd>${s.atk}${lv<20?` → ${next.atk}`:''}</dd></div><div><dt>召喚に必要な魔力</dt><dd>${u.cost}</dd></div>${s.heal?`<div><dt>回復量</dt><dd>${s.heal} → ${next.heal}</dd></div>`:''}</dl><button class="primary" data-action="level-up" data-id="${u.id}" ${lv>=20||save.leaves<cost?'disabled':''}>${icon('leaf')} ${lv>=20?'最大レベル':`${num(cost)} でレベルアップ`}</button><p style="text-align:center;font-size:10px">${lv>=20?'とても立派に育ちました。':save.leaves<cost?'しずくが足りません。冒険で集めましょう。':'育成した強さは、次の戦闘から反映されます。'}</p></div></section></div>`; }
  function summonView() { return `${pageHead('A NEW FRIEND','星の召喚','まだ見ぬ仲間との、小さな出会い。')}<section class="summon-scene"><div class="summon-copy"><span class="eyebrow">THE FOREST IS FULL OF FRIENDS</span><h2>星のかけらが、<br>ご縁をつなぐ。</h2><p>森のどこかで待っている仲間を呼んでみよう。<br>どんな子に出会えるかは、お楽しみ。</p><button class="primary gold" data-action="draw" ${save.gems<20?'disabled':''}>${icon('gem')} 20 で仲間をよぶ ${icon('magic')}</button><p class="fineprint">通常は全8種から各12.5%。4回ごとに未加入の仲間を優先。重複すると育成のしずく180個に。星のかけらは冒険で獲得できます。</p></div><div class="summon-magic"><span class="orbit"></span>${sprite(7)}<span class="sparkle" style="top:12%;right:10%">✦</span><span class="sparkle" style="bottom:5%;left:10%">✧</span></div></section><div class="summon-gallery">${UNITS.map(u=>sprite(u.id)).join('')}</div><p class="footer-note">次の確定召喚まで あと ${4-save.summons%4} 回 · 全${save.owned.length}種類の仲間と出会いました</p>`; }
  function battleView() { const st=battle.stage; return `${pageHead(`CHAPTER ${CHAPTERS[st.chapter].icon} · STAGE ${st.number}`,st.name,'仲間を呼んで、相手の拠点をこわそう。',`<div class="battle-tools"><button data-action="auto" id="auto-button" class="${auto?'on':''}">オート ${auto?'ON':'OFF'}</button><button data-action="speed" id="speed-button">×${speed}</button><button data-action="pause" aria-label="一時停止">${icon('pause')}</button><button data-action="fullscreen" aria-label="全画面表示">${icon('expand')}</button></div>`)}<div class="battle-board"><canvas id="battle-canvas" width="1440" height="655" aria-label="仲間と敵が進軍する戦場"></canvas><div class="battle-hud"><div class="base-hud"><div><span>わたしたちの城</span><b id="player-hp">2,300</b></div><div class="progress"><span id="player-bar" style="width:100%"></span></div></div><span class="timer" id="battle-timer">00:00</span><div class="base-hud enemy"><div><span>相手の拠点</span><b id="enemy-hp">${num(battle.enemyHp)}</b></div><div class="progress"><span id="enemy-bar" style="width:100%"></span></div></div></div><div class="battle-banner" id="battle-banner"></div></div><div class="battle-dock"><div class="mana-panel"><small>召喚の魔力 · <span id="wallet-level">Lv.1</span></small><div class="mana-value"><span id="money">220</span><small> / <span id="max-money">700</span></small></div><div class="progress"><span id="money-bar" style="width:30%"></span></div><button data-action="wallet" id="wallet-button">回復力UP · 130</button></div><div class="deploy-row">${battle.team.map((id,i)=>`<button class="deploy-unit" data-action="deploy" data-id="${id}" id="deploy-${id}" aria-label="${UNITS[id].name}を召喚 魔力${UNITS[id].cost}"><kbd>${i+1}</kbd>${sprite(id)}<small>${UNITS[id].name}</small><b>${UNITS[id].cost}</b><span class="cooldown"></span><span class="cd-label"></span></button>`).join('')}</div><button class="cannon-button" data-action="cannon" id="cannon-button">${icon('cannon')}<b>森の大砲</b><small id="cannon-label">チャージ中</small><span class="charge" id="cannon-charge"></span></button></div><p class="battle-hint">仲間をタップして召喚。回復力UPで魔力が早く貯まります。<span class="desktop"> <kbd>1</kbd>〜<kbd>6</kbd> 召喚 <kbd>Q</kbd> 回復力UP <kbd>Space</kbd> 大砲 <kbd>Esc</kbd> 一時停止</span></p>`; }
  function render() {
    document.body.classList.toggle('battling',page==='battle');
    const views={home:homeView,map:mapView,team:teamView,upgrade:upgradeView,summon:summonView,battle:battleView};
    app.innerHTML=`<div class="app-shell ${page==='battle'?'battle-shell':''}">${header()}<main>${views[page]()}</main></div>${page==='battle'?'':nav()}`;
    if(page==='battle') { battleContext=document.getElementById('battle-canvas').getContext('2d'); updateHud(); }
  }
  function navigate(target) { page=target; closeModal(); window.scrollTo(0,0); render(); }
  function modal(html, dismiss=true) {
    previousFocus=document.activeElement;
    overlay.innerHTML=`<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabindex="-1">${dismiss?`<button class="modal-close" data-action="close-modal" aria-label="閉じる">${icon('close')}</button>`:''}${html}</section></div>`;
    const title=overlay.querySelector('h2');if(title)title.id='dialog-title';
    (overlay.querySelector('.modal-buttons button')||overlay.querySelector('button')||overlay.querySelector('.modal')).focus();
  }
  function closeModal() { overlay.innerHTML=''; if(previousFocus?.isConnected) previousFocus.focus(); previousFocus=null; }
  function help() { modal(`<span class="eyebrow">HOW TO PLAY</span><h2>冒険のてびき</h2><div class="help-steps"><p><b>01　魔力を貯めて仲間をよぼう</b>下のカードをタップすると召喚。仲間は自動で歩き、敵を攻撃します。</p><p><b>02　役割を組み合わせよう</b>盾役を前に、遠距離や回復役を後ろに。回復力UPで召喚のペースもアップ。</p><p><b>03　森の大砲でまとめて攻撃</b>30秒でチャージ。敵全体を攻撃し、前線を押し戻します。</p><p><b>04　向こうの拠点をこわして勝利</b>報酬で育成、召喚、編成。全12ステージを巡りましょう。時間制限は5分です。</p></div><button class="primary" data-action="${page==='battle'?'resume':'close-modal'}">わかった！ ${icon('arrow')}</button>`,page!=='battle'); }
  function settings() { if(page==='battle') paused=true;modal(`<span class="eyebrow">A LITTLE BREAK</span><h2>冒険の設定</h2><div class="setting-row"><div><b>効果音</b><p>やさしい音で冒険を彩ります。</p></div><button class="setting-toggle" data-action="sound">${save.sound?'ON':'OFF'}</button></div><div class="setting-row"><div><b>セーブデータ</b><p>${storageWorks?'このブラウザに自動保存しています。':'自動保存が使えないため、書き出して保管してください。'}</p></div><button class="setting-toggle" data-action="export">書き出す</button></div><div class="modal-buttons"><button class="secondary" data-action="help">遊び方</button><button class="secondary" data-action="import">セーブを読み込む</button><button class="primary" data-action="${page==='battle'?'resume':'close-modal'}">もどる</button></div>`,page!=='battle'); }
  function startBattle(id) {
    if(id>save.cleared || !STAGES[id]) return;
    battle=new C.Battle(id,save);save.lastStage=id;persist();paused=false;auto=false;speed=1;effectList=[];shake=0;cannonFlash=0;autoClock=0;hudClock=0;resultReward=null;
    page='battle';closeModal();render();window.scrollTo(0,0);banner('さあ、小さな冒険のはじまり。',3.7);audioStart();
  }
  function banner(text,duration=2.5) { bannerText=text;bannerUntil=(battle?.time||0)+duration; }
  function pauseMenu() { if(!battle||battle.result) return; paused=true;modal(`<span class="eyebrow">TAKE YOUR TIME</span><h2>ひとやすみ。</h2>${sprite(3)}<p>仲間たちも、ちょっと休憩中です。</p><div class="modal-buttons"><button class="primary" data-action="resume">冒険をつづける ${icon('arrow')}</button><button class="secondary" data-action="help">遊び方</button><button class="light-button" data-action="retreat">地図にもどる</button></div>`,false); }
  function showResults() {
    if(resultReward) return;
    resultReward=battle.claim(save);persist();refreshResources(); const r=resultReward;
    tune(r.win?'victory':'click');
    const complete=r.win&&battle.stage.id===11;
    modal(`<span class="eyebrow">${r.win?'A LITTLE VICTORY':'WE WILL MEET AGAIN'}</span><h2>${complete?'大冒険、ひとくぎり。':r.win?'よくがんばりました！':'もう一度、いっしょに。'}</h2>${r.win?`<div class="modal-stars">${starsHTML(r.stars)}</div>`:sprite(0)}<p>${complete?'全12ステージ踏破、おめでとう！ 森のみんながあなたを待っています。':r.win?`${battle.stage.number} ${battle.stage.name} をクリア`:'仲間を育てたり、盾役を増やして再挑戦しよう。'}<br>${seconds(r.time)} · ${r.kills}体の敵を撃退</p><div class="reward-grid"><div><small>森のしずく</small><b>＋${r.leaves}</b></div><div><small>星のかけら</small><b>＋${r.gems}</b></div></div>${r.unlocked!==null?`<p class="completion">${UNITS[r.unlocked].name} が新しい仲間になりました！</p>`:''}<div class="modal-buttons"><button class="secondary" data-action="result-map">地図へ</button><button class="secondary" data-action="retry">もう一度</button>${r.win&&battle.stage.id<11?`<button class="primary coral" data-action="next-stage">次のステージ ${icon('arrow')}</button>`:`<button class="primary" data-action="result-upgrade">仲間を育てる</button>`}</div>`,false);
  }
  function updateHud() {
    if(page!=='battle') return;
    const set=(id,t)=>{const e=document.getElementById(id);if(e)e.textContent=t;};
    set('money',num(battle.money));set('max-money',num(battle.maxMoney));set('wallet-level',`Lv.${battle.wallet}`);set('player-hp',num(battle.hp));set('enemy-hp',num(battle.enemyHp));set('battle-timer',seconds(battle.time));
    document.getElementById('player-bar').style.width=`${battle.hp/battle.maxHp*100}%`;document.getElementById('enemy-bar').style.width=`${battle.enemyHp/battle.enemyMaxHp*100}%`;document.getElementById('money-bar').style.width=`${battle.money/battle.maxMoney*100}%`;
    const w=document.getElementById('wallet-button');w.textContent=battle.wallet===5?'回復力 MAX':`回復力UP · ${battle.upgradePrice()}`;w.disabled=battle.wallet>=5||battle.money<battle.upgradePrice()||paused;
    for(const id of battle.team) { const b=document.getElementById(`deploy-${id}`), cd=battle.cooldowns[id];b.disabled=!battle.canDeploy(id)||paused;b.querySelector('.cooldown').style.height=`${cd/UNITS[id].cooldown*100}%`;b.querySelector('.cd-label').textContent=cd>.1?Math.ceil(cd):''; }
    const c=document.getElementById('cannon-button');c.disabled=battle.cannon<30||paused;document.getElementById('cannon-charge').style.width=`${battle.cannon/30*100}%`;set('cannon-label',battle.cannon>=30?'発射できる！':`あと ${Math.ceil(30-battle.cannon)} 秒`);
    const b=document.getElementById('battle-banner');b.textContent=bannerText;b.style.opacity=battle.time<bannerUntil?'1':'0';
  }
  function canvasSprite(ctx,id,x,y,size,flip=false,rotation=0) {
    const img=imageAssets.characters;if(!img.complete||!img.naturalWidth)return;
    const [sx,sy,sw,sh]=rects[id], h=size, w=size*sw/sh;
    ctx.save();ctx.translate(x,y);ctx.scale(flip?-1:1,1);ctx.rotate(rotation);ctx.drawImage(img,sx,sy,sw,sh,-w/2,-h,w,h);ctx.restore();
  }
  function drawBattle(dt,now) {
    const ctx=battleContext;if(!ctx)return;const W=1440,H=655,ground=481;
    ctx.clearRect(0,0,W,H);ctx.save();if(shake>0){ctx.translate(Math.sin(now*.07)*shake,Math.cos(now*.1)*shake*.6);shake=Math.max(0,shake-dt*35);}
    const bg=imageAssets[CHAPTERS[battle.stage.chapter].image];if(bg.complete&&bg.naturalWidth)ctx.drawImage(bg,0,0,W,H);else{ctx.fillStyle='#e2e8d6';ctx.fillRect(0,0,W,H);}
    for(let i=0;i<14;i++){const x=(i*113+Math.sin(now/3400+i)*30)%W,y=95+((i*43+now*.008)%350);ctx.globalAlpha=.22+Math.sin(now/900+i)*.15;ctx.fillStyle=battle.stage.chapter===1?'#fff1a5':'#fffde1';ctx.beginPath();ctx.ellipse(x,y,2.5,4,-.6,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    const castles=imageAssets.castles;
    if(castles.complete&&castles.naturalWidth){ctx.drawImage(castles,0,0,887,887,-32,ground-315,310,310);ctx.drawImage(castles,887,0,887,887,1160,ground-322,310,310);}
    const sorted=[...battle.units].sort((a,b)=>a.y-b.y);
    for(const u of sorted){
      const phase=battle.time*(u.moving?8:3)+u.phase;const hop=u.id===2||u.id===9?Math.sin(phase)*7+16:u.moving?Math.abs(Math.sin(phase))*4:Math.sin(phase)*1.2;
      const y=ground+u.y-hop,attack=u.action>0?Math.sin(u.action/.27*Math.PI)*7*u.side:0;
      ctx.fillStyle='#39412b1a';ctx.beginPath();ctx.ellipse(u.x,ground+u.y+1,u.size*.3,6,0,0,Math.PI*2);ctx.fill();
      const drawSize=u.size*1.23;
      if(u.hurt>0)ctx.globalAlpha=.58;canvasSprite(ctx,u.id,u.x+attack,y,drawSize,u.side<0,u.moving?Math.sin(phase)*.025:attack*.004);ctx.globalAlpha=1;
      if(u.hp<u.maxHp||u.id===11){const width=drawSize*.63;ctx.fillStyle='#fffdf0e0';ctx.beginPath();ctx.roundRect(u.x-width/2-2,y-drawSize-12,width+4,7,4);ctx.fill();ctx.fillStyle=u.side>0?'#8ba274':'#b8808b';ctx.beginPath();ctx.roundRect(u.x-width/2,y-drawSize-10,width*clamp(u.hp/u.maxHp,0,1),3,2);ctx.fill();}
    }
    for(const p of effectList){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;
      if(p.text){ctx.font=`bold ${p.size||16}px sans-serif`;ctx.textAlign='center';ctx.fillText(p.text,p.x,p.y);}else{ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();}}
    effectList=effectList.filter(p=>p.life>0).slice(-240);ctx.globalAlpha=1;
    if(cannonFlash>0){ctx.fillStyle=`rgba(255,245,186,${cannonFlash*.22})`;ctx.fillRect(0,0,W,H);ctx.strokeStyle=`rgba(255,250,212,${cannonFlash*.8})`;ctx.lineWidth=20*cannonFlash;ctx.beginPath();ctx.moveTo(170,270);ctx.lineTo(1350,ground-60);ctx.stroke();cannonFlash=Math.max(0,cannonFlash-dt*2);}
    ctx.restore();
  }
  function particles(x,y,color,count=10) { for(let i=0;i<count;i++){const angle=Math.random()*Math.PI*2,force=25+Math.random()*80;effectList.push({x,y,vx:Math.cos(angle)*force,vy:Math.sin(angle)*force-15,color,size:2+Math.random()*4,life:.5+Math.random()*.5,max:1});} }
  function battleEvents() {
    for(const e of battle.drainEvents()) {
      if(e.type==='hit'){if(Math.random()<.35)effectList.push({x:e.x,y:392+e.y,vx:Math.random()*12-6,vy:-30,color:e.side>0?'#a36863':'#686b46',text:`${e.amount}`,life:.65,max:.65});particles(e.x,440,e.side>0?'#fff5c9':'#dccee8',3);}
      else if(e.type==='poof')particles(e.x,444,e.side>0?'#e0efd1':'#c6b6d7',12);
      else if(e.type==='heal'){particles(e.x,420,'#b6d296',12);effectList.push({x:e.x,y:395,vx:0,vy:-24,text:'＋',color:'#6d9459',size:26,life:1,max:1});}
      else if(e.type==='projectile'){effectList.push({x:e.from,y:411,vx:(e.to-e.from)/.24,vy:0,color:e.color,size:6,life:.24,max:.24});}
      else if(e.type==='cannon'){shake=9;cannonFlash=1;tune('cannon');}
      else if(e.type==='boss'){banner('森の主があらわれた！',4);tone(150,.3);}
      else if(e.type==='deploy') { particles(143,440,'#d8e6b8',8);tune('deploy'); }
      else if(e.type==='baseHit') { particles(e.side>0?125:1290,435,'#eac592',5); }
    }
  }
  function autoPlay(dt) { autoClock-=dt;if(autoClock>0)return;autoClock=.5;battle.assist(); }
  function frame(now) {
    const dt=Math.min(.05,(now-(lastTime||now))/1000);lastTime=now;
    if(page==='battle'&&battle){if(!paused&&!battle.result){const scaled=dt*speed;if(auto)autoPlay(scaled);battle.step(scaled);battleEvents();hudClock+=dt;if(hudClock>.08){updateHud();hudClock=0;}}
      drawBattle(paused?0:dt,paused?battle.time*1000:now);
      if(battle.result&&!resultReward){updateHud();showResults();}}
    requestAnimationFrame(frame);
  }
  function inspect(id){selectedUnit=id;navigate('upgrade');}
  function handle(action,id,button) {
    audioStart();
    if(pages.some(p=>p[0]===action)) {if(page==='battle'&&!battle.result){pauseMenu();return;}navigate(action);return;}
    switch(action){
      case 'chapter': chapter=id;selectedStage=clamp(save.cleared,chapter*4,chapter*4+3);navigate('map');break;
      case 'select-stage':selectedStage=id;render();break;
      case 'start':startBattle(id);break;
      case 'inspect':case 'pick-upgrade':inspect(id);break;
      case 'slot':selectedSlot=id;render();break;
      case 'equip':if(!save.owned.includes(id)){toast('召喚、またはエリアクリアで仲間になります。');break;} {const old=save.team.indexOf(id);if(old>=0)[save.team[selectedSlot],save.team[old]]=[save.team[old],save.team[selectedSlot]];else save.team[selectedSlot]=id;persist();tune('click');render();toast(`${UNITS[id].name} を枠${selectedSlot+1}に編成しました。`);}break;
      case 'level-up':if(C.upgrade(save,id)){persist();tune('summon');render();toast(`${UNITS[id].name} がレベル${save.levels[id]}に！`);}break;
      case 'draw': {const result=C.summon(save);if(!result)return;persist();render();tune('summon');modal(`<span class="eyebrow">${result.isNew?'WELCOME TO THE FAMILY':'A FRIENDLY REUNION'}</span><h2>${result.isNew?'新しい仲間！':'また会えたね。'}</h2>${sprite(result.id)}<h3>${UNITS[result.id].name}</h3><p>${UNITS[result.id].description}</p>${result.isNew?'<p class="new-label">編成画面から出撃メンバーに加えられます。</p>':`<p class="completion">森のしずく ＋${result.gift}</p>`}<div class="modal-buttons"><button class="secondary" data-action="close-modal">閉じる</button><button class="primary" data-action="team">仲間を編成する ${icon('arrow')}</button></div>`);break;}
      case 'deploy':if(!paused)battle.deploy(id);updateHud();break;
      case 'wallet':if(!paused&&battle.upgradeWallet())tune('click');updateHud();break;
      case 'cannon':if(!paused)battle.fire();battleEvents();updateHud();break;
      case 'auto':auto=!auto;button.classList.toggle('on',auto);button.textContent=`オート ${auto?'ON':'OFF'}`;break;
      case 'speed':speed=speed===1?2:1;button.textContent=`×${speed}`;break;
      case 'pause':pauseMenu();break;
      case 'resume':paused=false;closeModal();updateHud();break;
      case 'retreat':modal(`<span class="eyebrow">BACK TO THE MAP</span><h2>冒険を中断しますか？</h2><p>この戦闘の報酬は獲得できません。<br>育成や編成の記録は保存されています。</p><div class="modal-buttons"><button class="primary" data-action="resume">つづける</button><button class="secondary" data-action="confirm-retreat">地図へもどる</button></div>`,false);break;
      case 'confirm-retreat':battle=null;paused=false;navigate('map');break;
      case 'result-map':selectedStage=Math.min(save.cleared,11);chapter=Math.floor(selectedStage/4);battle=null;navigate('map');break;
      case 'result-upgrade':battle=null;navigate('upgrade');break;
      case 'retry':startBattle(battle.stage.id);break;
      case 'next-stage':startBattle(battle.stage.id+1);break;
      case 'settings':settings();break;
      case 'help':help();break;
      case 'sound':save.sound=!save.sound;persist();button.textContent=save.sound?'ON':'OFF';audioStart();tone();break;
      case 'close-modal':if(page==='battle'&&!battle.result){paused=false;updateHud();}closeModal();break;
      case 'fullscreen':if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>toast('このブラウザは全画面表示に対応していません。'));break;
      case 'export':{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(save,null,2)],{type:'application/json'}));a.href=url;a.download='ゆるモン大行進-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('セーブデータを書き出しました。');break;}
      case 'import':if(page==='battle'){toast('戦闘を終えてホームから読み込んでください。');break;} {const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=async()=>{try{const file=input.files[0];if(!file||file.size>100000)throw Error();const value=JSON.parse(await file.text());if(value.version!==1||!Array.isArray(value.levels)||!Array.isArray(value.stars))throw Error();const loaded=C.normalizeSave(value);modal(`<h2>記録を読み込みますか？</h2><p>${loaded.cleared} / 12 ステージクリアの記録に切り替えます。</p><div class="modal-buttons"><button class="secondary" data-action="close-modal">やめる</button><button id="confirm-import" class="primary">読み込む</button></div>`);document.getElementById('confirm-import').onclick=()=>{save=loaded;persist();chapter=Math.min(2,Math.floor(save.cleared/4));selectedStage=Math.min(save.cleared,11);navigate('home');toast('記録を読み込みました。');};}catch{toast('ゆるモン大行進のセーブデータを選んでください。');}};input.click();}break;
    }
  }
  document.addEventListener('click',event=>{const b=event.target.closest('button[data-action]');if(b&&!b.disabled)handle(b.dataset.action,Number(b.dataset.id),b);});
  document.addEventListener('keydown',e=>{
    if(overlay.firstChild){if(e.key==='Tab'){const nodes=[...overlay.querySelectorAll('button:not(:disabled),[tabindex="0"]')];if(!nodes.length){e.preventDefault();return;}const a=nodes[0],b=nodes.at(-1);if(e.shiftKey&&document.activeElement===a){e.preventDefault();b.focus();}else if(!e.shiftKey&&document.activeElement===b){e.preventDefault();a.focus();}}if(e.key==='Escape'){if(page==='battle'&&!battle?.result){paused=false;closeModal();updateHud();}else if(overlay.querySelector('[data-action="close-modal"]'))closeModal();}return;}
    if(page!=='battle'||battle.result||e.repeat)return;
    if(['Space','Escape','Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','KeyQ'].includes(e.code))e.preventDefault();
    if(e.code==='Escape'){pauseMenu();return;}if(paused)return;audioStart();
    if(/^Digit[1-6]$/.test(e.code))battle.deploy(battle.team[Number(e.code.slice(-1))-1]);if(e.code==='Space')battle.fire();if(e.code==='KeyQ')battle.upgradeWallet();battleEvents();updateHud();
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&page==='battle'&&!battle.result&&!paused)pauseMenu();});
  window.addEventListener('pagehide',persist);
  render();persist();requestAnimationFrame(frame);
})();
