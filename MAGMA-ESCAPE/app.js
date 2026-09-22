import {Game,AURAS,FOOD,QUESTIONS,MILESTONES,freshSave,normalizeSave,rollGacha,awardMilestones,transact,upgradeCost,clamp,METER,routeSection} from './core.js';
import {Renderer} from './renderer.js';
import {Sound} from './audio.js';
import {GachaScene} from './gacha-scene.js';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const SAVE_KEY='magma-escape.v1';
let save=freshSave(),storageOK=true;
try{save=normalizeSave(JSON.parse(localStorage.getItem(SAVE_KEY)));}catch{storageOK=false;}
const sound=new Sound();sound.enabled=save.sound;
document.body.classList.toggle('reduced',save.reduced);
let game=null,renderer=null,view='home',panelType=null,dialogType=null,quiz=null,battle=null,returnToPause=false,assetsReady=false,inactive=false,runStartBest=save.best,cinema=null,deathDelay=0;
let input={left:false,right:false,jump:false,jet:false},jumpQueued=false,toastTimer,tipUntil=6,last=0,accumulator=0,gameOverHandled=false,uiTick=0;
const assets={},pointerKeys=new Map(),keyboard=new Set();
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));storageOK=true;}catch{storageOK=false;}sync();}
function sync(){ $$('[data-coins]').forEach(e=>e.textContent=save.coins.toLocaleString());$$('[data-best]').forEach(e=>e.textContent=save.best);const next=MILESTONES.find(m=>!save.claims.includes(m.height));let goal=$('.milestone-home');if(!goal){goal=document.createElement('div');goal.className='milestone-home';$('.home-bottom').prepend(goal);}goal.innerHTML=next?`<span>NEXT GOAL / ${next.height}m に着地</span><b>初回 +${next.reward} コイン</b>`:'<span>ALL MILESTONES CLEARED</span><b>次は、自分の記録の先へ。</b>'; }
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('show');toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2600);}
function dismissToast(){clearTimeout(toastTimer);$('#toast').classList.remove('show');}
function resetInput(){input={left:false,right:false,jump:false,jet:false};jumpQueued=false;pointerKeys.clear();keyboard.clear();$$('[data-control]').forEach(b=>b.classList.remove('held'));}
function showView(name){view=name;dismissToast();$$('.screen').forEach(s=>s.classList.remove('active'));$('#'+(name==='game'?'game-screen':name)).classList.add('active');resetInput();}
function openDialog(type,html){dialogType=type;resetInput();dismissToast();$('#modal').innerHTML=`<section class="dialog" role="dialog" aria-modal="true" tabindex="-1" aria-labelledby="dialog-title">${html}</section>`;$('#modal h2').id='dialog-title';$('#modal').hidden=false;$('#modal .dialog').focus({preventScroll:true});}
function closeDialog(){dialogType=null;$('#modal').hidden=true;$('#modal').innerHTML='';resetInput();}
function button(action,label,cls='primary',extra=''){return `<button class="${cls}" data-action="${action}" ${extra}>${label}</button>`;}
function header(title){return `<header class="panel-header"><button class="back-button" data-action="back" aria-label="戻る">‹</button><h2>${title}</h2><span class="balance"><i class="coin-icon"></i><b data-coins>${save.coins.toLocaleString()}</b></span></header>`;}
function panel(type){
  panelType=type;showView('panel');$('#panel').className='screen panel active'+(type==='gacha'?' gacha-panel':'');
  if(type==='upgrades'){
    $('#panel').innerHTML=header('装備を強化')+`<div class="panel-content"><p class="section-kicker">UPGRADE YOUR ADVENTURE</p><h3>昨日より、もっと上へ。</h3><p class="lede">集めたコインを、次の一歩の力に。<br>強化した能力は、ずっと引き継がれます。</p>${['speed','jet'].map(key=>{const lv=save[key],isJet=key==='jet';return `<article class="upgrade-card"><div class="card-top">${isJet?'<span class="sprite-icon item-3"></span>':'<span class="upgrade-icon">⇧</span>'}<div><h4>${isJet?'ジェットパック':'移動スピード'}</h4><p>LEVEL ${lv} / 5 ・ ${isJet?'ピンチに使える空への切り札':'足場の間を、軽やかに'}</p></div></div><div class="level-pips">${Array.from({length:5},(_,i)=>`<i class="${i<lv?'on':''}"></i>`).join('')}</div><div class="stat-comparison"><span>${isJet?(1.8+lv*.35).toFixed(2)+'秒':Math.round((1+lv*11/205)*100)+'%'}</span><span>→</span><strong>${lv===5?'MAX':isJet?(1.8+(lv+1)*.35).toFixed(2)+'秒':Math.round((1+(lv+1)*11/205)*100)+'%'}</strong></div><button class="purchase" data-action="upgrade" data-key="${key}" ${lv===5?'disabled':''}>${lv===5?'最大レベル':'強化する <i class="coin-icon"></i> '+upgradeCost(lv)}</button></article>`;}).join('')}<p class="small-note">強化は次の冒険から反映されます。ジェット燃料は足場に立つと回復します。</p></div>`;
  }else if(type==='gacha'){
    $('#panel').innerHTML=header('エフェクトガチャ')+`<div class="gacha-body"><p class="section-kicker">A LITTLE MAGIC FOR YOU</p><h3>冒険に、きらめきを。</h3><p class="lede">カプセルの中に、まだ見ぬ光。<br>オーラは見た目だけのアイテムです。</p><div class="gacha-bottom"><div class="rarity-banner">✧ FIND YOUR LEGENDARY AURA ✧</div><button class="purchase" data-action="draw" data-count="1">1回まわす <i class="coin-icon"></i> 100</button><button class="purchase batch-draw" data-action="draw" data-count="5">5連でまわす <i class="coin-icon"></i> 450 <small>50お得</small></button><div class="rates">${AURAS.map(a=>`<span><b>${a.rarity==='LEGENDARY'?'LEGEND':a.rarity}</b>${a.weight}%</span>`).join('')}</div><p class="small-note" style="margin:10px 0 0;text-align:center">重複は30コインに変換。5連も1回ごとに同じ確率です。</p><button class="gacha-preview-link" data-action="preview-select">全レア度の演出を見る / 無料プレビュー ↗</button>${save.history.length?`<div class="history-strip" aria-label="最近の獲得オーラ">${save.history.slice(-8).map(id=>`<img src="assets/aura-${id}.webp" alt="${AURAS.find(a=>a.id===id).name}">`).join('')}</div>`:''}</div></div>`;
  }else if(type==='collection'){
    $('#panel').innerHTML=header('コレクション')+`<div class="panel-content"><p class="section-kicker">YOUR LITTLE TREASURES</p><h3>まとうのは、冒険の光。</h3><p class="lede">お気に入りを装備して出発しよう。</p><div class="collection-progress"><span>オーラコレクション</span><b>${save.owned.length} / ${AURAS.length}</b></div><div class="aura-grid">${AURAS.map(a=>{const owned=save.owned.includes(a.id),equipped=save.equipped===a.id;return `<article class="aura-card ${owned?'':'locked'} ${equipped?'equipped':''}" style="--aura:${a.color}"><span class="aura-rarity">${a.rarity}</span><img class="collection-art" src="assets/aura-${a.id}.webp" alt="${a.name}"><h4>${a.name}</h4><button data-action="equip" data-id="${a.id}" ${!owned?'disabled':''}>${equipped?'✓ 装備中':owned?'装備する':'未入手'}</button><button class="aura-preview" data-action="preview" data-id="${a.id}">開封演出を見る ↗</button></article>`;}).join('')}</div><p class="small-note">オーラによる能力の差はありません。すべてゲーム内で集めたコインで入手できます。</p><section class="milestone-list"><p class="section-kicker">ADVENTURE MILESTONES</p><h3 style="font-size:23px">一歩ずつ、冒険の証。</h3>${MILESTONES.map(m=>`<div class="milestone-row ${save.claims.includes(m.height)?'claimed':''}"><strong>${m.height}m</strong><p>${m.name}<small>${m.height}m以上の足場に初めて着地</small></p><span>${save.claims.includes(m.height)?'✓ 達成':`+${m.reward} ◈`}</span></div>`).join('')}</section></div>`;
  }else if(type==='help'){
    $('#panel').innerHTML=header('遊び方')+`<div class="panel-content"><p class="section-kicker">YOUR FIRST ADVENTURE</p><h3>あと1m。その先へ。</h3><p class="lede">下から迫るマグマをかわしながら、<br>足場を飛び移って、どこまでも登ろう。</p>${[
      ['‹ ›','左右に移動','画面左下のボタン、または ← → / A D キー。'],
      ['↑','ジャンプ','画面右下の JUMP、または Space / ↑。空中で押し直すと二段ジャンプ。長押しは着地後に連続ジャンプ。'],
      ['↗','壁キック','左右の壁でJUMPを押すと反対側へ蹴り上がる。壁へ移動を押し続けると滑り降りる。同じ壁からの連続キックは着地か反対側の壁で回復。'],
      ['⇡','ジェットパック','JET ボタン、または E / Shift を長押し。燃料は足場に立つと回復。'],
      ['◈','コインを集めよう','1枚で5コイン。獲得したコインはすぐに保存されます。'],
      ['✧','着地をつなごう','新しい足場の中央に着地で+2コイン。素早く5連続着地すると+10コイン。10・25・50・100・200mには初回報酬も。'],
      ['↔','3つの特殊な足場','青い金属は動く、氷は点滅、ひび割れは0.5秒で崩れる。'],
      ['♨','道中でひと休み','SHOP足場で食事。紫の「？」を取るとクイズ、見えているゴーレムに触れるとバトル。避けて通ることもできます。イベント中はマグマが止まります。'],
      ['▲','マグマの緩急','高度・プレイ時間で加速。3秒の予告後に6秒の噴き上がり、その後は小休止。素早い階段・横移動・広い休憩足場を使い分けよう。'],
      ['△','空腹に気をつけて','空腹20以下で移動と体力回復が低下。ご飯を食べて回復しよう。'],
    ].map(([icon,title,desc])=>`<div class="help-row"><div class="help-symbol">${icon}</div><div><h4>${title}</h4><p>${desc}</p></div></div>`).join('')}<div class="help-footer">${button('help-done',returnToPause?'ゲームに戻る':'さあ、登ろう！')}</div></div>`;
  }else if(type==='settings'){
    $('#panel').innerHTML=header('設定')+`<div class="panel-content"><p class="section-kicker">MAKE YOURSELF AT HOME</p><h3>心地よい冒険を。</h3><div class="toggle-row"><div><b>サウンド</b><small>BGMと効果音</small></div><button class="toggle ${save.sound?'on':''}" role="switch" aria-checked="${save.sound}" aria-label="サウンド" data-action="toggle-sound"></button></div><div class="toggle-row"><div><b>演出を控えめに</b><small>粒子・画面振動・開封の光を控えめに</small></div><button class="toggle ${save.reduced?'on':''}" role="switch" aria-checked="${save.reduced}" aria-label="演出を控えめに" data-action="toggle-reduced"></button></div><div class="settings-box"><h4>iPhoneのホーム画面に追加</h4><p>Safariの共有メニューから「ホーム画面に追加」を選ぶと、アプリとして起動できます。</p><p class="small-note">オフライン対応にはHTTPS、またはlocalhostでの初回読み込みが必要です。</p></div><div class="settings-box"><h4>冒険の記録</h4><p>最高記録 ${save.best}m ・ 挑戦 ${save.runs}回<br>このブラウザにコイン・強化・オーラを保存します。進行中のステージは再読み込みで終了します。</p><p class="small-note">${storageOK?'自動保存は有効です。ブラウザのデータ削除で記録も削除されます。':'現在このブラウザでは保存できません。データはこの画面を閉じると失われます。'}</p></div>${button('help','操作ガイド','secondary')}<p class="small-note" style="margin-top:24px;text-align:center">MAGMA ESCAPE 2.1.0<br>Made with imagination. / MACKY STUDIO</p></div>`;
  }
  $('#panel').scrollTop=0;
}
function leavePanel(){if(returnToPause&&game?.alive){returnToPause=false;showView('game');showPause();}else{showView('home');sync();}}
function start(){
  if(!assetsReady){toast('素材を読み込んでいます');return;}
  if(cinema)return;closeDialog();resetInput();returnToPause=false;quiz=null;battle=null;gameOverHandled=false;deathDelay=0;
  runStartBest=save.best;game=new Game({speed:save.speed,jet:save.jet,onEvent:handleGameEvent});save.runs++;persist();showView('game');tipUntil=7;$('#game-tip').textContent='空中で再タップ＝二段 / 壁でJUMP＝壁キック';$('#game-tip').style.opacity='1';renderer.effects=[];renderer.labels=[];renderer.rings=[];accumulator=0;sound.unlock();
  if(!save.tutorial){game.pause();openDialog('tutorial',`<p class="section-kicker">READY TO CLIMB?</p><h2>1m先へ、飛び出そう。</h2><p class="lede">足場をジャンプでつないで、<br>迫るマグマから逃げよう。</p><div class="help-row"><div class="help-symbol">‹ ›</div><div><h4>左手で移動</h4><p>パソコンは ← → キー</p></div></div><div class="help-row"><div class="help-symbol">↑</div><div><h4>二段ジャンプ ＋ 壁キック</h4><p>空中でJUMPを押し直すと二段目。<br>左右の壁に寄せてJUMPで壁キック。<br>パソコンは Space キー。</p></div></div><div class="help-row"><div class="help-symbol">⇡</div><div><h4>ピンチはジェット</h4><p>JET / E を長押し。足場で充電。</p></div></div>${button('tutorial-go','わかった、出発！')}`);}
  updateHUD();renderer.render(game,save,0);
}
function resume(){closeDialog();quiz=null;battle=null;game?.resume();accumulator=0;resetInput();}
function showPause(){if(!game?.alive)return;game.pause();openDialog('pause',`<p class="section-kicker">TAKE A LITTLE BREAK</p><h2>ちょっと、ひと息。</h2><div class="pause-stats"><div><small>到達高度</small><b>${game.height}m</b></div><div><small>今回のコイン</small><b>${game.coins}</b></div></div>${button('resume','冒険をつづける')}${button('restart-confirm','はじめから挑戦','secondary')}${button('settings','設定','secondary')}${button('home-confirm','ホームに戻る','text-button')}`);}
function finish(abandoned=false){
  if(!game||gameOverHandled)return;gameOverHandled=true;game.alive=false;
  const previousBest=runStartBest;save.best=Math.max(save.best,game.height);persist();
  if(abandoned){closeDialog();showView('home');return;}
  openDialog('result',`<p class="section-kicker">EVERY CLIMB IS AN ADVENTURE</p><h2>${game.cleared?'火山塔の、その先へ。':'また、もう1m。'}</h2><div class="result-number">${game.height}<small>m</small></div><div class="result-title">${game.height>previousBest?'✧ NEW PERSONAL BEST ✧':'NICE ADVENTURE'}</div><p class="result-flavor">${game.height<5?'ジャンプの後は、次の足場へ左右移動。<br>JETを長押しすると、落下から復帰できます。':game.height<50?'踏み出した一歩は、ちゃんと残っている。<br>装備を強化して、もう少し高く。':'ここまで来たあなたなら、まだ先へ行ける。'}</p><div class="result-combo"><span>最高 ${game.maxCombo} COMBO</span><span>PERFECT ${game.perfects}回</span></div><div class="result-grid"><div><small>獲得コイン・保存済み</small><b>+${game.coins}</b></div><div><small>ベスト記録</small><b>${save.best}m</b></div></div>${button('play','もう一度、挑戦する')}${button('result-home','ホームに戻る','secondary')}`);
}
function handleGameEvent(e){
  if(e.type==='coins'){save.coins+=e.amount;persist();sound.play('coin');}
  if(e.type==='pickup'){renderer?.burst(e.x,e.y,'#ffdc7c',8);renderer?.label(e.x,e.y+20,'+5','#ffdc7c');}
  if(e.type==='land'){renderer?.land(e);sound.play(e.perfect?'coin':'land');const earned=awardMilestones(save,game.highestLanded);if(earned.length){game.coins+=earned.reduce((n,m)=>n+m.reward,0);persist();sound.play('milestone');const m=earned.at(-1);toast(`${m.height}m 達成！ 初回報酬 +${earned.reduce((n,m)=>n+m.reward,0)} コイン`);}}
  if(e.type==='jump'){sound.play('jump');if(e.kind==='double'||e.kind==='wall'){renderer?.burst(e.x,e.y,e.kind==='wall'?'#ffcf8f':'#a5ffe0',16);renderer?.label(e.x,e.y+82,e.kind==='wall'?'WALL KICK':'DOUBLE JUMP',e.kind==='wall'?'#ffcf8f':'#a5ffe0');}}
  if(e.type==='death'){deathDelay=.75;resetInput();renderer?.burst(game.player.x,game.player.y,'#ffad5c',35);sound.play('bad');}
  if(e.type==='shop')showShop();
  if(e.type==='quiz')showQuiz();
  if(e.type==='battle')showBattle();
  if(e.type==='encounter'){renderer?.burst(e.x,e.y,e.kind==='quiz'?'#c3a4ff':'#ffa870',18);sound.play(e.kind==='quiz'?'coin':'hit');}
  if(e.type==='pressure'&&(e.phase==='warning'||e.phase==='surge'||e.phase==='breather')){tipUntil=game.time+2.5;$('#game-tip').textContent=e.phase==='warning'?'▲ まもなくマグマが噴き上がる！':e.phase==='surge'?'MAGMA RUSH / 二段ジャンプで急げ！':'小休止 / 足場で燃料を回復しよう';if(e.phase==='warning')sound.play('bad');}
  if(e.type==='zone'){tipUntil=game.time+4;$('#game-tip').textContent=e.zone===1?'ZONE 02 / 揺らぐ火山壁':'ZONE 03 / 天空の試練';sound.play('milestone');}
  if(e.type==='summit'){save.best=Math.max(save.best,game.height);persist();sound.reveal(4);openDialog('summit',`<p class="section-kicker">VOLCANIC TOWER CLEARED</p><h2>100m、その先の空へ。</h2><img class="summit-art" src="assets/aura-phoenix.webp" alt="火山塔の踏破を祝う冒険者"><p class="lede">おめでとう！ 火山塔を踏破しました。<br>この先は、終わりのない天空の試練。<br>空腹・体力・燃料を全回復して進もう。</p><div class="result-combo"><span>最高 ${game.maxCombo} COMBO</span><span>獲得 ${game.coins} COINS</span></div>${button('endless','無限エリアに挑戦する →')}${button('summit-finish','今回の冒険を終える','secondary')}`);}
}
function showShop(){openDialog('shop',`<p class="section-kicker">CHECKPOINT / ${Math.floor(game.player.y/METER)}m</p><h2>いただきます、冒険飯。</h2><p class="lede">ここではマグマもひと休み。<br>ご飯を食べて、元気に出発しよう。</p><div class="shop-hunger">空腹 <strong id="shop-hunger">${Math.round(game.hunger)}%</strong> <span style="padding:0 12px">/</span> <i class="coin-icon"></i> <b data-coins>${save.coins}</b></div>${FOOD.map(f=>`<article class="food-card"><div class="card-top"><span class="sprite-icon item-${f.sprite}"></span><div><h4>${f.name}</h4><p>${f.caption}</p><p style="color:#a0e2c6;margin-top:7px">${f.heal===100?'空腹を全回復':'空腹 +'+f.heal+'%'}</p></div></div><button class="purchase" data-action="buy-food" data-id="${f.id}">食べる <i class="coin-icon"></i> ${f.price}</button></article>`).join('')}${button('resume','元気に出発する')}`);}
function showQuiz(){const q=QUESTIONS[Math.floor(Math.random()*QUESTIONS.length)];quiz={q,remaining:10,answered:false};openDialog('quiz',`<p class="section-kicker">QUICK QUIZ / BONUS +25</p><h2>クイズオーブを手に入れた！</h2><p class="question">${q.q}</p>${q.a.map((a,i)=>`<button class="quiz-choice" data-action="answer" data-index="${i}"><strong>${'ABC'[i]}</strong>${a}</button>`).join('')}<div class="timer-bar"><i id="quiz-timer"></i></div><p class="small-note">10秒で答えよう。マグマは止まっています。</p>`);}
function answer(index){if(!quiz||quiz.answered)return;quiz.answered=true;const success=index===quiz.q.correct;if(success){game.addCoins(25);game.hunger=Math.min(100,game.hunger+10);}sound.play(success?'good':'bad');openDialog('quiz-result',`<p class="section-kicker">${success?'BRILLIANT!':'A LITTLE WISDOM'}</p><h2>${success?'大正解！':'次はきっと、わかる。'}</h2><p class="lede">正解は「${quiz.q.a[quiz.q.correct]}」<br>${quiz.q.note}</p>${success?'<div class="pause-stats"><b>+25 コイン</b><b>空腹 +10</b></div>':''}${button('resume','冒険をつづける')}`);}
function showBattle(){battle={time:0,hits:0,lives:3,cooldown:0,remaining:20,cursor:.5,ending:false};openDialog('battle',`<p class="section-kicker">GOLEM CHALLENGE / BONUS +40</p><h2>ゴーレムとぶつかった！</h2><div class="battle-arena"><img class="battle-enemy" src="assets/enemy.webp" alt="マグマゴーレム"><span class="battle-impact">HIT!</span></div><div class="enemy-health" aria-label="ゴーレムの体力"><i></i><i></i><i></i></div><div class="battle-lives" id="battle-lives">♥ ♥ ♥</div><div class="battle-score" id="battle-score">ヒット 0 / 3 ・ のこり20秒</div><div class="battle-track"><i class="target"></i><i id="battle-needle" class="needle"></i></div><p id="battle-message" class="battle-message">白いバーが緑のゾーンに来たらタップ！</p>${button('attack','タイミングアタック！')}<p class="small-note">3回成功で勝利。失敗3回で空腹 −15。<br>この間、マグマは止まっています。</p>`);}
function attack(){if(!battle||battle.cooldown>0||battle.ending)return;const ok=battle.cursor>=.35&&battle.cursor<=.65;battle.cooldown=.65;const arena=$('.battle-arena');arena.classList.remove('hit','miss');void arena.offsetWidth;arena.classList.add(ok?'hit':'miss');if(ok){battle.hits++;sound.play('hit');$('.battle-impact').textContent=Math.abs(battle.cursor-.5)<.055?'PERFECT!':'HIT!';$('#battle-message').textContent='ナイス！ ゴーレムにヒット！';$$('.enemy-health i').forEach((e,i)=>e.classList.toggle('empty',i<battle.hits));}else{battle.lives--;sound.play('bad');$('#battle-message').textContent='惜しい！ 緑のゾーンを狙おう。';}if(battle.hits>=3||battle.lives<=0)battle.ending=true;}
function endBattle(won){if(!battle)return;battle=null;if(won)game.addCoins(40);else game.hunger=Math.max(0,game.hunger-15);openDialog('battle-result',`<p class="section-kicker">${won?'GOLEM DEFEATED':'KEEP ON CLIMBING'}</p><h2>${won?'道が、ひらけた！':'なんとか逃げ切った！'}</h2><img class="battle-enemy" src="assets/enemy.webp" alt="ゴーレム"><p class="lede">${won?'ゴーレムからの贈りもの。<br>40コインを手に入れた！':'逃げるのも、冒険の知恵。<br>空腹が15減りました。'}</p>${button('resume','上を目指そう')}`);}
function gacha(count=1){if(cinema)return;if(save.pending){launchGacha(save.pending.entries);return;}const result=rollGacha(save,count);if(!result){toast('コインが足りません。冒険で集めよう！');return;}persist();launchGacha(result.entries);}
function launchGacha(entries,preview=false){if(cinema)return;closeDialog();resetInput();$('#panel').inert=true;$('#home').inert=true;cinema=new GachaScene({host:$('#app'),entries,sound,reduced:save.reduced||matchMedia('(prefers-reduced-motion: reduce)').matches,preview,onEquip:id=>{if(save.owned.includes(id)){save.equipped=id;persist();}},onFinish:()=>{cinema=null;$('#panel').inert=false;$('#home').inert=false;if(!preview){save.pending=null;persist();}panel(panelType==='collection'?'collection':'gacha');$('#panel .back-button').focus({preventScroll:true});}});}
function previewSelect(){openDialog('preview-select',`<p class="section-kicker">FREE PRESENTATION PREVIEW</p><h2>どの光を、見てみる？</h2><p class="lede">コインは消費しません。報酬もありません。</p>${AURAS.map(a=>`<button class="secondary" data-action="preview" data-id="${a.id}" style="color:${a.color}">${a.rarity} / ${a.name}</button>`).join('')}${button('close','戻る','text-button')}`);}

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');if(!b||b.disabled)return;
  if(cinema)return;
  const action=b.dataset.action;sound.unlock();sound.play('click');
  if(action==='play')start();
  else if(action==='home'||action==='result-home'){closeDialog();showView('home');sync();}
  else if(['upgrades','gacha','collection','help','settings'].includes(action)){
    if(view==='game'&&game?.alive){game.pause();returnToPause=true;}closeDialog();panel(action);
  }else if(action==='back')leavePanel();
  else if(action==='help-done'){if(returnToPause)leavePanel();else start();}
  else if(action==='tutorial-go'){save.tutorial=true;persist();resume();}
  else if(action==='pause')showPause();
  else if(action==='resume')resume();
  else if(action==='restart-confirm'||action==='home-confirm')openDialog('confirm',`<p class="section-kicker">END THIS ADVENTURE?</p><h2>今回の冒険を終えますか？</h2><p class="lede">集めたコインと最高記録は残ります。</p>${button(action==='restart-confirm'?'restart-now':'home-now',action==='restart-confirm'?'新しく挑戦する':'ホームに戻る')}${button('pause','冒険に戻る','secondary')}`);
  else if(action==='restart-now'){finish(true);start();}
  else if(action==='home-now')finish(true);
  else if(action==='upgrade'){
    const key=b.dataset.key;if(!['speed','jet'].includes(key)||save[key]>=5)return;
    if(transact(save,upgradeCost(save[key]),s=>s[key]++)){persist();sound.play('good');panel('upgrades');toast('強化完了！ 次の冒険で試してみよう。');}else toast('コインが足りません。冒険で集めよう！');
  }else if(action==='draw')gacha(Number(b.dataset.count)||1);
  else if(action==='preview-select')previewSelect();
  else if(action==='preview'){if(AURAS.some(a=>a.id===b.dataset.id))launchGacha([{id:b.dataset.id,isNew:true,refund:0}],true);}
  else if(action==='endless'){game.hunger=100;game.stamina=100;game.fuel=game.maxFuel;game.nextShop=Math.max(game.nextShop,game.highestLanded+15);resume();}
  else if(action==='summit-finish')finish();
  else if(action==='equip'||action==='equip-drawn'){
    if(!save.owned.includes(b.dataset.id))return;save.equipped=b.dataset.id;persist();if(action==='equip-drawn')closeDialog();else panel('collection');toast('オーラを装備しました');
  }else if(action==='close')closeDialog();
  else if(action==='buy-food'){
    const f=FOOD.find(f=>f.id===b.dataset.id);if(!f||dialogType!=='shop')return;
    if(game.hunger>=99.9){toast('おなかはいっぱいです');return;}
    if(transact(save,f.price)){game.hunger=Math.min(100,game.hunger+f.heal);game.stamina=100;persist();$('#shop-hunger').textContent=Math.round(game.hunger)+'%';sound.play('good');toast('おいしい！ 元気が戻ってきた。');updateHUD();}else toast('コインが足りません');
  }else if(action==='answer')answer(Number(b.dataset.index));
  else if(action==='attack')attack();
  else if(action==='toggle-sound'){save.sound=!save.sound;sound.enabled=save.sound;if(save.sound)sound.unlock();persist();panel('settings');}
  else if(action==='toggle-reduced'){save.reduced=!save.reduced;document.body.classList.toggle('reduced',save.reduced);persist();panel('settings');}
});
$('.studio').addEventListener('click',e=>e.preventDefault());

function rebuildInput(){const wasJump=input.jump;for(const key of ['left','right','jump','jet'])input[key]=keyboard.has(key)||[...pointerKeys.values()].includes(key);if(input.jump&&!wasJump)jumpQueued=true;$$('[data-control]').forEach(b=>b.classList.toggle('held',input[b.dataset.control]));}
$$('[data-control]').forEach(b=>{
  b.addEventListener('pointerdown',e=>{e.preventDefault();if(view!=='game'||game?.paused)return;b.setPointerCapture(e.pointerId);pointerKeys.set(e.pointerId,b.dataset.control);rebuildInput();sound.unlock();});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,e=>{pointerKeys.delete(e.pointerId);rebuildInput();});
  b.addEventListener('contextmenu',e=>e.preventDefault());
});
const keyMap={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'jump',ArrowUp:'jump',KeyW:'jump',KeyE:'jet',ShiftLeft:'jet',ShiftRight:'jet'};
document.addEventListener('keydown',e=>{
  if(cinema)return;
  if(e.code==='Tab'&&!$('#modal').hidden){const focusable=[...$('#modal').querySelectorAll('button:not(:disabled)')];if(focusable.length){const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement.classList.contains('dialog'))){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
  if(e.code==='Escape'){e.preventDefault();if(view==='game'&&game?.alive){if(!dialogType)showPause();else if(dialogType==='pause')resume();}else if(view==='panel'&&!dialogType)leavePanel();else if(dialogType==='gacha-result')closeDialog();return;}
  const key=keyMap[e.code];if(key&&view==='game'&&!game?.paused){e.preventDefault();keyboard.add(key);rebuildInput();sound.unlock();}
});
document.addEventListener('keyup',e=>{const key=keyMap[e.code];if(key){keyboard.delete(key);rebuildInput();}});
function suspend(){resetInput();sound.cancelSequence();if(game?.alive){save.best=Math.max(save.best,game.height);persist();if(view==='game'&&!game.paused)showPause();}if(sound.ctx?.state==='running')sound.ctx.suspend().catch(()=>{});}
window.addEventListener('blur',()=>{inactive=true;suspend();});window.addEventListener('focus',()=>{inactive=false;last=0;accumulator=0;});document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();else inactive=false;last=0;accumulator=0;});window.addEventListener('pagehide',suspend);window.addEventListener('resize',()=>renderer?.resize());

function updateHUD(){if(!game)return;$('#height').innerHTML=`${game.height}<span>m</span>`;$('#run-coins').textContent=game.coins;
  $('#hunger-fill').style.width=game.hunger+'%';$('#hunger-value').textContent=Math.ceil(game.hunger);$('#stamina-fill').style.width=game.stamina+'%';$('#stamina-value').textContent=Math.ceil(game.stamina);$('#fuel-fill').style.width=(game.fuel/game.maxFuel*100)+'%';
  const gap=(game.player.y-game.lava)/METER;$('#lava-gap').textContent=gap.toFixed(1)+'m';$('.lava-distance').style.color=gap<2?'#ffc07e':'';
  $('#zone-label').textContent=game.height>100?'03 / 天空の試練':game.height>50?'02 / 揺らぐ火山壁':'01 / はじまりの峡谷';
  $('#game-tip').style.opacity=game.time<tipUntil?'1':'0';
  const phase=game.pressure.phase;$('#pressure-panel').dataset.phase=phase;
  $('#pressure-label').textContent=phase==='start'?'スタート猶予':phase==='warning'?`噴き上がりまで ${game.pressure.warning}秒`:phase==='surge'?'▲ MAGMA RUSH':phase==='breather'?'小休止 / RECOVER':'マグマ接近中';
  const route={intro:'ウォームアップ',flow:'リズム区間',sprint:'連続ジャンプ区間',traverse:'横移動区間',rest:'広い休憩足場'}[routeSection(Math.max(1,game.height))];
  $('#pressure-speed').textContent=`${(game.lavaSpeed/METER).toFixed(1)}m/s ・ ${route}`;
  const wallReady=game.wallSide&&game.lastWall!==game.wallSide;
  $('#air-jump-status').textContent=wallReady?'壁でJUMP ↗':game.airJumpAvailable?'空中JUMP ●':'空中JUMP ○ 着地で回復';
  $('#air-jump-status').classList.toggle('spent',!game.airJumpAvailable);$('#air-jump-status').classList.toggle('wall-ready',!!wallReady);
}
function tick(now){
  const dt=last?Math.min((now-last)/1000,.1):0;last=now;
  if(!document.hidden&&!inactive){
    cinema?.update(dt);
    if(game&&view==='game'){
      if(!game.paused&&game.alive){accumulator+=dt;let n=0;while(accumulator>=1/120&&n++<12){game.step(1/120,{...input,jump:input.jump||jumpQueued});jumpQueued=false;accumulator-=1/120;}sound.update(dt);}else accumulator=0;
      renderer?.render(game,save,dt);uiTick+=dt;if(uiTick>.08){updateHUD();uiTick=0;}
      if(deathDelay>0){deathDelay-=dt;if(deathDelay<=0)finish();}
    }
    if(quiz&&!quiz.answered&&dialogType==='quiz'){quiz.remaining=Math.max(0,quiz.remaining-dt);$('#quiz-timer').style.width=(quiz.remaining*10)+'%';if(!quiz.remaining)answer(-1);}
    if(battle&&dialogType==='battle'){
      battle.time+=dt;battle.remaining-=dt;battle.cooldown=Math.max(0,battle.cooldown-dt);battle.cursor=.5+Math.sin(battle.time*3.8)*.47;
      $('#battle-needle').style.left=(battle.cursor*100)+'%';$('#battle-lives').textContent='♥ '.repeat(battle.lives)+'♡ '.repeat(3-battle.lives);$('#battle-score').textContent=`ヒット ${battle.hits} / 3 ・ のこり${Math.ceil(battle.remaining)}秒`;
      if(battle.ending&&battle.cooldown===0)endBattle(battle.hits>=3);else if(battle.remaining<=0&&!battle.ending)endBattle(false);
    }
  }
  requestAnimationFrame(tick);
}

async function init(){
  sync();const names=['world','world-mid','world-sky','hero','platforms','lobby','items','enemy','gacha','icon','capsule',...AURAS.map(a=>'aura-'+a.id)];let loaded=0;const failed=[];
  await Promise.all(names.map(name=>new Promise(resolve=>{const img=new Image();img.onload=()=>{assets[name]=img;loaded++;$('#load-fill').style.width=loaded/names.length*100+'%';$('#load-status').textContent=loaded+' / '+names.length;resolve();};img.onerror=()=>{failed.push(name);resolve();};img.src=`assets/${name}.webp`;})));
  let atlas;try{const response=await fetch('assets/atlas.json');if(!response.ok)throw new Error('atlas');atlas=await response.json();}catch{failed.push('atlas');}
  if(failed.length){$('#loading h2').textContent='素材を読み込めませんでした';$('#loading p').textContent='接続を確認して、もう一度お試しください。';const b=document.createElement('button');b.className='primary';b.textContent='再読み込み';b.style.cssText='padding:14px 25px;border-radius:10px;margin-top:15px';b.onclick=()=>location.reload();$('#loading').append(b);return;}
  renderer=new Renderer($('#game'),assets,atlas);assetsReady=true;$('#loading').classList.add('done');setTimeout(()=>$('#loading').hidden=true,500);requestAnimationFrame(tick);
  if(!storageOK)toast('保存機能が使えません。記録はこの画面内のみ残ります。');
  if('serviceWorker'in navigator&&window.isSecureContext){registerUpdates();}
  if(save.pending){panel('gacha');launchGacha(save.pending.entries);toast('前回の開封結果を再表示します。追加の消費はありません。');}
  if(new URLSearchParams(location.search).has('test'))window.__magma={get game(){return game;},get save(){return save;},get view(){return view;},get dialog(){return dialogType;},get battle(){return battle;},get cinema(){return cinema;},start,panel,showShop,showQuiz,showBattle,answer,attack,resume,persist,finish,assets};
}
async function registerUpdates(){try{const registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});const offer=()=>{if(!registration.waiting||!navigator.serviceWorker.controller||$('.update-banner'))return;const banner=document.createElement('div');banner.className='update-banner';banner.innerHTML='<span>新しいバージョンがあります。<br>更新すると今回の冒険は終了します。コインと装備は残ります。</span><button>保存して更新</button>';banner.querySelector('button').onclick=()=>{if(game?.alive){save.best=Math.max(save.best,game.height);persist();}navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});registration.waiting?.postMessage({type:'SKIP_WAITING'});};$('#app').append(banner);};offer();registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed')offer();});});registration.update().catch(()=>{});}catch{}}
init();
