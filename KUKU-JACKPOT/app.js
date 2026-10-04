import { BEAT, END, LAST_INPUT, REVEAL, TARGET, makeCourse, position, judge, summarize, missedStop } from './core.js';
import { SoundEngine } from './audio.js';

const $ = id => document.getElementById(id);
const sound = new SoundEngine();
const defaults = { music:70, voice:100, sfx:65, offset:0, motion:matchMedia('(prefers-reduced-motion: reduce)').matches };
let settings = {...defaults};
try {
  const saved = JSON.parse(localStorage.getItem('kuku-jackpot-settings') || '{}');
  for (const name of ['music','voice','sfx']) if(Number.isFinite(saved[name])) settings[name] = Math.max(0, Math.min(100, saved[name]));
  if (Number.isFinite(saved.offset)) settings.offset = Math.max(-250, Math.min(250, saved.offset));
  if (typeof saved.motion === 'boolean') settings.motion = saved.motion;
} catch {}
let mode='learn', screen='home', course=[], results=[], roundIndex=-1, picked=null, locked=false, revealed=false, paused=false, loading=false, oldBeat=-999, demo=false, hintUsed=false;
const answers = [...document.querySelectorAll('.answer-button')];
const nodes = [...document.querySelectorAll('.count-node')];

function applySettings() {
  document.body.classList.toggle('reduced-motion', settings.motion);
  for (const name of ['music','voice','sfx']) { $(`${name}-volume`).value=settings[name]; $(`${name}-value`).textContent=`${settings[name]}%`; }
  $('timing-offset').value=settings.offset; $('offset-value').textContent=`${settings.offset > 0 ? '+' : ''}${settings.offset} ms`;
  $('reduce-motion').checked=settings.motion; sound.volumes(settings);
  try {localStorage.setItem('kuku-jackpot-settings',JSON.stringify(settings));} catch {}
}
applySettings();
for(const name of ['music','voice','sfx']) $(`${name}-volume`).addEventListener('input',e=>{settings[name]=Number(e.target.value);applySettings();});
$('timing-offset').addEventListener('input',e=>{settings.offset=Number(e.target.value);applySettings();});
$('reduce-motion').addEventListener('change',e=>{settings.motion=e.target.checked;applySettings();});

function setScreen(value) {
  screen=value;
  for(const name of ['home','game','results']) $(name).hidden=name!==value;
  $('pause-button').hidden=value!=='game';
  window.scrollTo({top:0,behavior:'instant'});
}
function selectMode(value) {
  mode=value;
  document.querySelectorAll('.mode').forEach(button=>{const active=button.dataset.mode===value;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
}
document.querySelectorAll('.mode').forEach(button=>button.addEventListener('click',()=>selectMode(button.dataset.mode)));

async function start(watch=false) {
  if(loading)return;
  loading=true; $('start-button').disabled=true; $('watch-button').disabled=true; $('replay-button').disabled=true;
  $('load-status').hidden=false; $('load-status').textContent='バンドの準備中…';
  try {
    await sound.unlock(); sound.volumes(settings);
    await sound.load(progress=>{$('load-status').textContent=`声と音楽を準備中… ${Math.round(progress*100)}%`;});
    demo=watch; course=makeCourse(watch?'learn':mode); results=[];roundIndex=-1;picked=null;locked=false;revealed=false;paused=false;oldBeat=-999;
    $('game').classList.remove('revealing','paused'); $('game').classList.add('intro');
    $('game-bird').src='assets/art/beat-bird.webp'; $('factor').textContent='?'; $('slot-answer').textContent='?';
    $('question-label').textContent='ななのだん、いくよ！'; $('host-line').innerHTML='さあ、いっしょに<br>はじめよう！';
    $('answer-caption').textContent=watch?'見て、きいて、いっしょに言ってみよう':'こたえをえらんで、3・2・1、ぴたっ！';
    $('round-number').innerHTML='00 <small>/ 09</small>';
    $('round-dots').innerHTML=Array.from({length:9},()=>'<i class="round-dot"></i>').join('');
    $('play-mode').textContent=watch?'お手本':mode==='learn'?'練習':'挑戦';
    $('correct-count').textContent='0'; $('rhythm-count').textContent='リズム ★ 0';
    $('feedback').className='feedback'; $('hint-button').disabled=true; $('hint-text').textContent='';
    $('stop-button').disabled=true;$('stop-button').className='stop-button';$('stop-title').textContent=watch?'お手本をみよう':'ぴたっ！';
    $('game-footer-text').textContent=watch?'声に出して、いっしょに九九を言ってみよう！':matchMedia('(pointer:coarse)').matches?'数字をタップ → 合図にあわせて「ぴたっ！」':'こたえ：1・2・3 キー ／ とめる：スペース';
    for(const button of answers){button.disabled=true;button.className='answer-button';button.querySelector('b').textContent='?';button.querySelector('span').textContent='えらぶ';button.setAttribute('aria-pressed','false');}
    setScreen('game'); sound.start(course);
  } catch(error) {
    console.error(error); setScreen('home'); $('load-status').hidden=false;
    $('load-status').textContent='音の準備ができませんでした。もう一度「あそぶ」を押してね。';
  } finally {
    loading=false; $('start-button').disabled=false;$('watch-button').disabled=false;$('replay-button').disabled=false;
  }
}
$('start-button').addEventListener('click',()=>start(false));
$('watch-button').addEventListener('click',()=>start(true));
$('replay-button').addEventListener('click',()=>start(false));

function beginRound(index) {
  roundIndex=index; picked=null;locked=false;revealed=false;hintUsed=false;
  const round=course[index];
  $('game').classList.remove('intro','revealing'); $('factor').textContent=round.n; $('slot-answer').textContent='?';
  $('number-reel').classList.remove('spinning');void $('number-reel').offsetWidth;$('number-reel').classList.add('spinning');
  $('question-label').textContent=`なな × ${['','いち','に','さん','よん','ご','ろく','なな','はち','きゅう'][round.n]} は？`;
  $('answer-caption').textContent=demo?'ビートくんのお手本をみてね':'こたえはどれ？ ひとつえらぼう';
  $('host-line').innerHTML=demo?'いっしょに<br>おぼえよう！':'わかるかな？<br>えらんでね！';
  $('game-bird').src='assets/art/beat-bird.webp'; $('round-number').innerHTML=`${String(index+1).padStart(2,'0')} <small>/ 09</small>`;
  $('round-dots').children[index].classList.add('current');
  $('hint-button').disabled=mode!=='learn'||demo; $('hint-text').textContent=''; $('hint-button').textContent='✦ ヒントをみる';
  $('feedback').className='feedback'; $('stop-button').className='stop-button'; $('stop-title').textContent=demo?'お手本をみよう':'ぴたっ！';
  answers.forEach((button,i)=>{button.disabled=demo;button.className='answer-button';button.querySelector('b').textContent=round.choices[i];button.querySelector('span').textContent='えらぶ';button.setAttribute('aria-label',`こたえ ${round.choices[i]}`);button.setAttribute('aria-pressed','false');});
}
function choose(index, auto=false) {
  if(screen!=='game'||paused||roundIndex<0||roundIndex>=9||locked||(demo&&!auto))return;
  const pos=position(sound.beat());
  if(pos.index!==roundIndex||pos.local>LAST_INPUT)return;
  picked=course[roundIndex].choices[index];
  answers.forEach((button,i)=>{button.classList.toggle('selected',i===index);button.setAttribute('aria-pressed',String(i===index));button.querySelector('span').textContent=i===index?'これにする！':'えらぶ';});
  $('slot-answer').textContent=picked; $('answer-caption').textContent=demo?'3・2・1 のつぎで、とめるよ':'えらんだね！「3・2・1」のつぎで止めよう';
  if(!auto)sound.select();
}
answers.forEach((button,i)=>button.addEventListener('click',()=>choose(i)));
$('hint-button').addEventListener('click',()=>{
  if(roundIndex<0||locked)return;
  hintUsed=true;$('hint-text').textContent=`7 × ${course[roundIndex].n} = ${course[roundIndex].answer}`;$('hint-button').textContent='✦ いっしょに覚えよう';
});

function showFeedback(title, detail) {
  const node=$('feedback');node.replaceChildren(document.createTextNode(title));
  const small=document.createElement('small');small.textContent=detail;node.append(small);node.className='feedback show';
}
function confetti() {
  if(settings.motion)return;
  const colors=['#ffc942','#ff693e','#10a5a1','#fff9e9','#244f9d'];
  $('confetti').replaceChildren();
  for(let i=0;i<25;i++){
    const piece=document.createElement('i');piece.style.left=`${Math.random()*100}%`;piece.style.background=colors[i%colors.length];piece.style.animationDelay=`${Math.random()*.35}s`;piece.style.animationDuration=`${1.3+Math.random()*.8}s`;
    $('confetti').append(piece);
  }
}
function submit(auto=false) {
  if(screen!=='game'||paused||roundIndex<0||roundIndex>=9||locked||picked===null||(demo&&!auto))return;
  const pos=position(sound.beat());
  if(pos.index!==roundIndex||pos.local<4||pos.local>LAST_INPUT)return;
  const result=judge(course[roundIndex],picked,auto?TARGET:pos.local,auto?0:settings.offset);
  result.hintUsed=hintUsed;
  finishRound(result);
  sound.hit(result.correct);
}
$('stop-button').addEventListener('pointerdown',e=>{
  if(e.button!==0||$('stop-button').disabled)return;
  e.preventDefault();submit();
});
// Keyboard and assistive-technology activation uses click (pointer already submitted above).
$('stop-button').addEventListener('click',()=>submit());
function finishRound(result) {
  if(locked)return;
  locked=true;results[roundIndex]=result;
  answers.forEach(button=>{button.disabled=true;});
  $('hint-button').disabled=true; $('stop-button').disabled=true;
  $('stop-button').classList.add('hit'); $('stop-title').textContent='ナイス！';
  const dot=$('round-dots').children[roundIndex];dot.classList.remove('current');dot.classList.add(result.correct?'correct':'review');
  const total=summarize(results.filter(Boolean));$('correct-count').textContent=total.correct;$('rhythm-count').textContent=`リズム ★ ${total.rhythm}`;
  if(result.correct){
    const timing=result.rhythm==='perfect'?'リズムも、ぴったり！':result.rhythm==='great'?'いいリズム！':result.rhythm==='miss'?'つぎは合図で、とめてみよう！':result.errorMs<0?'リズムは、すこし はやめ':'リズムは、すこし おそめ';
    showFeedback('せいかい！',timing);$('host-line').innerHTML='そのちょうし！<br>いいね！';
    $('game-bird').src='assets/art/beat-bird-win.webp';confetti();
    answers.find(button=>Number(button.querySelector('b').textContent)===result.answer)?.classList.add('right');
  }else{
    showFeedback(result.choice===null?'いっしょに言おう！':'おしい！', 'つぎは声にあわせて、おぼえよう');
    $('host-line').innerHTML='だいじょうぶ！<br>いっしょに！';
    answers.find(button=>Number(button.querySelector('b').textContent)===result.choice)?.classList.add('wrong');
  }
}
function reveal() {
  if(revealed)return;revealed=true;
  const round=course[roundIndex];$('game').classList.add('revealing');$('feedback').className='feedback';
  $('slot-answer').textContent=round.answer;$('answer-caption').textContent=round.reading;
  $('question-label').textContent=`7 × ${round.n} = ${round.answer}`;
  $('hint-text').textContent='こえに出して、いっしょに！';
  $('stop-title').textContent='いっしょに！';
  answers.forEach(button=>{button.classList.toggle('right',Number(button.querySelector('b').textContent)===round.answer);});
}

function updateFrame() {
  if(screen==='game'&&!paused){
    const beat=sound.beat(), pos=position(beat);
    const b=Math.floor(beat); const bounce=Math.max(0,1-((beat%1+1)%1)*3);
    $('game').style.setProperty('--bounce',settings.motion?0:bounce);
    if(b!==oldBeat){oldBeat=b;$('game').classList.toggle('beat-hit',b%2===0);}
    $('remaining').textContent=`あと ${Math.max(0,Math.ceil((END-beat)*BEAT))} 秒`;
    if(pos.index>=0&&pos.index<9){
      if(roundIndex!==pos.index)beginRound(pos.index);
      if(demo&&pos.local>=3&&picked===null)choose(course[roundIndex].choices.indexOf(course[roundIndex].answer),true);
      if(demo&&pos.local>=TARGET&&!locked)submit(true);
      if(pos.local>LAST_INPUT&&!locked)finishRound(missedStop(course[roundIndex],picked,hintUsed));
      if(pos.local>=REVEAL)reveal();
      const active=pos.local>=4&&pos.local<=LAST_INPUT&&!locked&&!demo&&picked!==null;
      $('stop-button').disabled=!active;$('stop-button').classList.toggle('ready',active&&pos.local>=7);
      const progress=Math.min(1,Math.max(0,(pos.local-5)/3));
      $('beat-fill').style.width=`calc((100% - 46px) * ${progress})`;
      $('beat-cursor').style.left=`calc(20px + (100% - 49px) * ${progress})`;
      nodes.forEach((node,i)=>node.classList.toggle('lit',pos.local>=5+i&&pos.local<6+i));
      $('timing-instruction').textContent=pos.local>=REVEAL?'いっしょに九九を言ってみよう！':locked?'答えをきいて、おぼえよう':pos.local>=8?'いま！ ぴたっ！':pos.local>=5?`${Math.max(1,8-Math.floor(pos.local))}… つぎの拍で、ぴたっ！`:picked===null?'こたえをえらんで、まってね':'そのまま、合図をきこう';
    }else if(pos.phase==='intro'){
      $('timing-instruction').textContent=beat<4?'音にあわせて、からだをゆらそう':'もうすぐ、さいしょの問題！';
      nodes.forEach((node,i)=>node.classList.toggle('lit',Math.floor(beat)%4===i&&beat>=0));
      $('beat-fill').style.width='0px';$('beat-cursor').style.left='20px';
    }else if(pos.phase==='outro'){
      $('timing-instruction').textContent='7のだん、さいごまでできたね！';$('stop-button').disabled=true;$('host-line').innerHTML='さいごまで<br>ありがとう！';
      if(beat>=END)showResults();
    }
  }
  requestAnimationFrame(updateFrame);
}
requestAnimationFrame(updateFrame);

function showResults() {
  sound.stop();setScreen('results');
  const total=summarize(results.filter(Boolean));
  $('result-title').textContent=demo?'7のだんを、一周！':total.correct===9?'九九ジャックポット！':total.correct>=6?'ナイス・グルーヴ！':'いいね、その一歩！';
  $('result-message').textContent=demo?'こんどはきみの番。いっしょにやってみよう！':total.correct===9?'9もん、ぜんぶ正解。きみが今日のスター！':'声に出した九九が、きみの力になるよ。';
  $('result-correct').innerHTML=demo?'お手本':`${total.correct}<small>/9</small>`;
  $('result-rhythm').innerHTML=demo?'♪':`${total.rhythm}<small>/9</small>`;
  $('review-title').innerHTML=total.review.length&&!demo?'あと少しの九九を、もういちど！ <small>タップすると声がきけるよ</small>':'声に出して、もういちど！ <small>タップすると声がきけるよ</small>';
  $('review-grid').replaceChildren();
  [...course].sort((a,b)=>a.n-b.n).forEach(round=>{
    const needs=!demo&&total.review.includes(round.n);const button=document.createElement('button');button.className=`review-item${needs?' needs-review':''}`;button.textContent=`7 × ${round.n} = ${round.answer}`;
    const icon=document.createElement('span');icon.textContent=needs?'復習 ♪':'♪';button.append(icon);button.setAttribute('aria-label',`${round.reading}をきく`);
    button.addEventListener('click',async()=>{try{await sound.unlock();sound.stop();sound.play(`a${round.n}`);}catch{}});$('review-grid').append(button);
  });
  $('replay-button').innerHTML=demo?'じぶんで あそぶ <span>▶</span>':'もういっかい！ <span>↻</span>';
  $('saved-note').textContent=demo?'見て、きいて、言うだけでも。何度でもいっしょに！':'きろくは、このブラウザに保存されます。';
  if(!demo){
    try {
      let history=JSON.parse(localStorage.getItem('kuku-jackpot-history')||'[]');if(!Array.isArray(history))history=[];
      history.push({at:new Date().toISOString(),mode,...total,results});
      localStorage.setItem('kuku-jackpot-history',JSON.stringify(history.slice(-30)));
      const best=Math.max(...history.filter(h=>h.mode===mode).map(h=>Number(h.correct)||0));
      $('saved-note').textContent=`このモードのベスト：${best} / 9 問　・　きろくを保存したよ！`;
    } catch { $('saved-note').textContent='きろくの保存はできませんでしたが、何度でも遊べます。'; }
  }
}
function home() {
  sound.stop();paused=false;$('game').classList.remove('paused');
  document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());
  setScreen('home');$('load-status').hidden=true;
}
$('home-button').addEventListener('click',home);
$('quit-button').addEventListener('click',home);

async function pause() {
  if(screen!=='game'||paused)return;
  paused=true;$('game').classList.add('paused');await sound.pause();
}
async function resume() {
  if(screen!=='game'||!paused)return;
  await sound.resume();paused=false;$('game').classList.remove('paused');
}
function openDialog(id){
  if(screen==='game')pause();
  if(!$(id).open)$(id).showModal();
}
async function closeDialog(dialog){if(screen==='game')await resume();dialog.close();}
for(const [button,dialog] of [['help-button','help-dialog'],['settings-button','settings-dialog'],['credits-button','credits-dialog'],['pause-button','pause-dialog']]) $(button).addEventListener('click',()=>openDialog(dialog));
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>closeDialog(button.closest('dialog'))));
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog(dialog);}));
$('resume-button').addEventListener('click',()=>closeDialog($('pause-dialog')));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&screen==='game'&&!paused){pause();if(!document.querySelector('dialog[open]'))$('pause-dialog').showModal();}});
window.addEventListener('keydown',event=>{
  if(event.repeat)return;
  if(document.querySelector('dialog[open]'))return;
  if(screen!=='game')return;
  if(event.code==='Escape'){event.preventDefault();openDialog('pause-dialog');return;}
  if(event.code==='Space'){event.preventDefault();submit();return;}
  if(['Digit1','Digit2','Digit3','Numpad1','Numpad2','Numpad3'].includes(event.code)){event.preventDefault();choose(Number(event.code.at(-1))-1);}
});

// Read-only instrumentation for deterministic integration checks, enabled explicitly by URL.
if(new URLSearchParams(location.search).has('test')) Object.defineProperty(window,'__kuku',{get:()=>({screen,mode,demo,paused,roundIndex,picked,locked,beat:sound.ctx?sound.beat():0,position:sound.ctx?position(sound.beat()):null,course,results,audioState:sound.ctx?.state,loaded:sound.loaded,sourceCount:sound.sources.size})});
