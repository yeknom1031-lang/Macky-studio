import {GAMES,createMiniGame} from './minigames.js';
import {FestivalAudio,musicForGame as musicFor} from './festival-audio.js';
import {FestivalArt} from './festival-art.js';
import {FestivalDecorations} from './festival-decorations.js';
import {SingleAnswerRound,SINGLE_TIMING,answeredTimeline} from './single-answer.js';
import {stageDesign,lessonHint,answerDisplay,practicePrompt} from './festival-lessons.js';
import {BEAT,makePlaylist,makeStageQuestion,queueBasketballRetry,grade,summarize,newSave,normalizeSave,record} from './festival-core.js';
const $=id=>document.getElementById(id), audio=new FestivalAudio(), art=new FestivalArt();
const decorations=new FestivalDecorations(art);
const KEY='kuku-beat-festival-v1';let save=newSave(),storageAvailable=true;
try{save=normalizeSave(JSON.parse(localStorage.getItem(KEY)));}catch{storageAvailable=false;}
let playlist=[],results=[],index=0,mini=null,roundStart=0,phase='',running=false,paused=false,watch=false,flags={},streak=0,lastOptions={},token=0,frame=0,allowPortrait=false,wakeLock=null,toastTimer;
let swRegistration=null,cacheStatus=null,offlineManifest=null,previewAudio=null,dialogRequest=0;
let artReady=null, rhythm=null, pattern=null, timing=null, noteNodes=[], awaitingIntro=false, launching=false, preparing=false, retryHeldRound=false, heldInput=null, seenDemo=new Set(), tutorial=null, stageProgress=null;
const DEMO_KEY='kuku-beat-first-taps-v1';
try{const seen=JSON.parse(localStorage.getItem(DEMO_KEY));if(Array.isArray(seen))seenDemo=new Set(seen.filter(id=>Number.isInteger(id)&&id>=1&&id<=21));}catch{}
function rememberDemo(id){seenDemo.add(id);try{localStorage.setItem(DEMO_KEY,JSON.stringify([...seenDemo]));}catch{}}
function ensureArt(){if(!artReady)artReady=art.load().catch(error=>{artReady=null;throw error;});return artReady;}
ensureArt().then(()=>{if(!$('home').hidden)decorations.show('home');}).catch(()=>{});
const ctx=$('stage').getContext('2d');
const paths=['jackpot','sushi','rocket','ninja','frog','quiz','donuts','gorilla','train','magic','basketball','ghost','socks','hero','aliens','fishing','delivery','octopus','dragon','orchestra','forest'];
const artPath=id=>`./designs/20-minigames/images/${String(id).padStart(2,'0')}-${paths[id-1]}.webp`;
const safeText=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4500);}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(save));}catch{storageAvailable=false;toast('このブラウザでは記録を保存できません。遊びは続けられます。');}}
function screen(name){for(const id of ['home','play','results'])$(id).hidden=id!==name;document.body.classList.toggle('in-game',name==='play');decorations.show(name,GAMES[(playlist[Math.min(index,playlist.length-1)]?.gameId||1)-1]);window.scrollTo(0,0);orientation();}
function openDialog(content){dialogRequest++;$('dialog-content').innerHTML=content;if(!$('dialog').open)$('dialog').showModal();}
function applySettings(){audio.setVolumes(save.settings);art.reduceMotion=save.settings.reduceMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;document.body.classList.toggle('reduced',art.reduceMotion);}
function refreshHome(){
 $('home-record').textContent=save.plays?`${save.plays}回あそんだね！ ★ ${Object.values(save.stars).reduce((a,b)=>a+b,0)} / 63`:'はじめての九九も、だいじょうぶ。';
 $('game-grid').replaceChildren();
 for(const game of GAMES){const b=document.createElement('button');b.className='game-card';b.dataset.game=game.id;b.innerHTML=`<img loading="lazy" src="${artPath(game.id)}" alt=""><div class="card-copy"><small>SHOW ${String(game.id).padStart(2,'0')}</small><span class="card-stars">${'★'.repeat(save.stars[game.id]||0)}${'☆'.repeat(3-(save.stars[game.id]||0))}</span><h3>${game.title}</h3><p>${game.subtitle}</p></div>`;b.addEventListener('click',()=>preview(game));$('game-grid').append(b);}
}
function lessonInstruction(id){return `${stageDesign(id).instruction} わかったらすぐ1回。ポン！に合わせるとボーナス。`;}
function currentQuestion(){return tutorial?.q||playlist[index];}
function questionVoice(q){return [4,21].includes(q.gameId)?q.truth?`a-${q.a}-${q.b}`:`f-${q.a}-${q.b}-${q.claimed}`:q.gameId===15?`r-${q.a}-${q.b}`:q.gameId===12&&q.lesson?.showHint?`a-${q.a}-${q.b}`:`q-${q.a}-${q.b}`;}
function createStage(q){return createMiniGame(q.gameId,q,{drawCharacter:art.drawCharacter.bind(art),drawNumber:art.drawNumber.bind(art),drawBackdrop:art.drawBackdrop.bind(art),drawProp:art.drawProp.bind(art),hasProp:art.hasProp.bind(art),drawEffect:art.drawEffect.bind(art),drawShared:art.drawShared.bind(art),setArtContext:art.setContext.bind(art)});}
function progressBeforeQuestion(){const history=results.slice(0,index).filter(r=>r.gameId===playlist[index].gameId).map(r=>({...r,timing:r.rhythm}));return {answered:history.length,correct:history.filter(r=>r.correct).length,perfect:history.filter(r=>r.rhythm==='perfect'&&r.correct).length,history};}
function practiceQuestion(id){return makeStageQuestion(id,2,3,{random:()=>.2,stageIndex:0,stageTotal:5});}
function upcomingAudio(at){const q=playlist[at];return [q,...(!watch&&(lastOptions.practice||!seenDemo.has(q.gameId))?[practiceQuestion(q.gameId)]:[])];}
async function prepareQuestion(at){
 if(preparing)return;preparing=true;const run=token;
 $('loading').hidden=false;$('loading').querySelector('progress').value=0;
 try{
  await audio.pause();
  await Promise.all([audio.load(upcomingAudio(at),p=>{if(run===token)$('loading').querySelector('progress').value=p;}),art.prepareStage(GAMES[playlist[at].gameId-1],at,forestGuest(playlist[at]))]);
  if(run!==token||!running)return;
  $('loading').hidden=true;if(!paused)await audio.resume();preparing=false;
 }catch{
  if(run!==token)return;preparing=false;paused=true;$('loading').hidden=true;
  openDialog('<h2>つぎの声をじゅんびしよう</h2><p>ここまでのゲームはそのまま。通信を確認して続けてね。</p><div class="modal-buttons"><button id="retry-next" class="primary">もう一度じゅんび</button><button id="leave-next" class="quiet">ホームへ</button></div>');
  $('retry-next').onclick=()=>{paused=false;$('dialog').close();prepareQuestion(at);};$('leave-next').onclick=home;
 }
}
function preview(game){
 openDialog(`<img class="modal-hero" src="${artPath(game.id)}" alt="${game.title}"><h2>${game.title}</h2><p>${lessonInstruction(game.id)}</p><p>問題が出たら、声の途中でも回答OK！<br>最初の1回で答えが決まるよ。<br>正解で100点。「ポン！」にぴったりなら＋50点！<br>5問・約1分。</p><div class="modal-buttons"><button id="start-single" class="primary">あそぶ！</button><button id="start-watch" class="secondary">お手本をみる</button><button id="start-practice" class="quiet">操作をためす</button></div>`);
 $('start-single').onclick=()=>start({mode:'single',gameId:game.id});
 $('start-watch').onclick=()=>start({mode:'single',gameId:game.id,watch:true});
 $('start-practice').onclick=()=>start({mode:'single',gameId:game.id,practice:true});
}
async function start(options){
 const run=++token;
 running=false;paused=false;awaitingIntro=false;launching=false;preparing=false;tutorial=null;retryHeldRound=false;heldInput=null;
 audio.stop();cancelAnimationFrame(frame);$('dialog').close();$('loading').hidden=false;
 $('loading').querySelector('progress').value=0;
 watch=!!options.watch;lastOptions={...options};results=[];index=0;streak=0;
 playlist=makePlaylist(options.mode,options.gameId,Number($('table').value),Math.random,options.review||[]);
 try{
  await audio.unlock();applySettings();
  const firstStage=playlist.filter(q=>q.gameId===playlist[0].gameId);
  await Promise.all([ensureArt(),audio.load([...firstStage,practiceQuestion(playlist[0].gameId)],p=>{$('loading').querySelector('progress').value=p;})]);
  await art.prepareStage(GAMES[playlist[0].gameId-1],0,forestGuest(playlist[0]));
  if(run!==token)return;
  // The next voices load while the child plays. A stage boundary waits safely
  // if the connection is slower than the current game.
  audio.load([...playlist,...[...new Set(playlist.map(q=>q.gameId))].map(practiceQuestion)]).catch(()=>{});
  running=true;awaitingIntro=true;roundStart=4*BEAT;
  beginRound(true);$('loading').hidden=true;screen('play');
  $('intro-start').hidden=false;$('intro-start').textContent=watch?'お手本 スタート！':'わかった！ スタート';
  $('intro-start').onclick=launchRound;
  if(!watch&&(options.practice||!seenDemo.has(playlist[index].gameId)))beginTutorial();
  else await launchRound();
  frame=requestAnimationFrame(tick);
 }catch(error){
  if(run!==token)return;
  $('loading').hidden=true;audio.stop();screen('home');
  openDialog(`<h2>準備がとまってしまいました</h2><p>通信を確認して、もう一度おためしください。保存済みならオフラインでも遊べます。</p><p>${safeText(error.message||'素材の読み込みに失敗しました')}</p><div class="modal-buttons"><button id="retry-load" class="primary">もう一度</button></div>`);
  $('retry-load').onclick=()=>start(options);
 }
}
async function launchRound(){
 if(!awaitingIntro||launching)return;
 launching=true;const run=token,gameId=playlist[index].gameId;
 try{await audio.unlock();}catch{launching=false;toast('音を始めるには、もう一度スタートを押してね。');return;}
 if(run!==token||!running){launching=false;return;}
 rememberDemo(gameId);tutorial=null;awaitingIntro=false;
 $('game-intro').classList.remove('coaching');$('play').classList.remove('practice','answered');
 audio.start(musicFor(gameId));launching=false;
 roundStart=0;beginRound(false);flags.scheduled=false;
 if(gameId===20)audio.orchestraProgress?.(stageProgress.correct);
 $('intro-start').hidden=true;requestWakeLock();
}
function beginTutorial(){
 const q=practiceQuestion(playlist[index].gameId);q.character=forestGuest(q);
 awaitingIntro=true;tutorial={q,answeredAt:null,spoken:false,correct:false};
 audio.start(musicFor(q.gameId));if(q.gameId===20)audio.orchestraProgress?.(0);
 mini=createStage(q);stageProgress={answered:0,correct:0,perfect:0,history:[]};
 $('play').classList.add('practice');$('game-intro').classList.add('coaching');$('game-intro').hidden=false;
 const prompt=practicePrompt(q,mini.controls),intro=$('game-intro');
 intro.querySelector('small').textContent='はじめに1回 れんしゅう・点数なし';
 intro.querySelector('h3').textContent=prompt.title;intro.querySelector('p').textContent=prompt.detail;
 $('intro-start').hidden=false;$('intro-start').textContent='スキップして遊ぶ';$('intro-start').onclick=launchRound;
 $('play-mode').textContent='れんしゅう • まずは1回ためそう';$('round-count').textContent='練習';
 $('lesson-title').textContent=stageDesign(q.gameId).title;$('lesson-detail').textContent=lessonHint(q);$('stage-progress').textContent='';
 phase='listen';$('play').dataset.phase=phase;renderEquation('listen');renderControls(GAMES[q.gameId-1]);
 for(const button of $('answers').children)button.classList.toggle('practice-target',Number(button.dataset.value)===prompt.expected);
 $('input-hint').textContent=prompt.title;updateControls();
}
function tickTutorial(){
 const time=Math.max(0,audio.now()),q=tutorial.q,answered=tutorial.answeredAt!==null;
 const beat=time/BEAT;
 if(!tutorial.spoken){const spoken=audio.speak(questionVoice(q),{maxSeconds:3.2});if(spoken){tutorial.spoken=true;tutorial.questionEndsAt=time+spoken.seconds;}}
 const readyToReveal=answered&&time>=Math.max(tutorial.answeredAt+.75,(tutorial.questionEndsAt??time)+.12);
 if(readyToReveal&&phase!=='reveal'){
  phase='reveal';tutorial.revealedAt=time;mini.setAnswer(tutorial.value,tutorial.correct);renderEquation('reveal');
  for(const b of $('answers').children)b.classList.toggle('correct-answer',Number(b.dataset.value)===expected(q));
 }
 if(readyToReveal&&tutorial.answerSpokenAt===undefined){const spoken=audio.speak(`a-${q.a}-${q.b}`,{maxSeconds:3.2});if(spoken)tutorial.answerSpokenAt=time;}
 mini.update({rhythmMode:true,time,beat,beatDuration:BEAT,revealBeat:(tutorial.revealedAt??Infinity)/BEAT,phase,reduceMotion:art.reduceMotion,stageProgress,correct:answered?tutorial.correct:null});mini.draw(ctx,1000,440);
 $('beat-count').textContent=answered?'✓':'☝';$('rhythm-message').textContent=answered?'できた！':'ためそう';
 if(tutorial.answerSpokenAt!==undefined&&time-tutorial.answerSpokenAt>audio.duration(`a-${q.a}-${q.b}`)+.8)launchRound();
}
function answerTutorial(value){
 const q=tutorial.q,time=Math.max(0,audio.now()),correct=value===expected(q);
 tutorial.answeredAt=time;tutorial.value=value;tutorial.correct=correct;rememberDemo(q.gameId);
 mini.pulse({beat:time/BEAT,value,index:mini.controls.findIndex(c=>c.value===value),success:correct,timing:'off',total:1});
 audio.action?.(q.gameId,{correct,timing:'off',value});
 if(q.gameId===20&&correct)audio.orchestraProgress?.(1);
 $('game-intro').querySelector('h3').textContent=correct?'そう！ できたね！':'正しい答えを見てみよう';
 $('game-intro').querySelector('p').textContent=`${q.a} × ${q.b} ＝ ${q.answer}。つぎは本番！`;
 $('input-hint').textContent='1回でOK！ このあと本番へ';
 for(const b of $('answers').children){b.classList.remove('practice-target');b.classList.toggle('chosen',Number(b.dataset.value)===value);}
 updateControls();
}
function forestGuest(q){return q?.gameId===21?['オオカミ','ウサギ','クマ','キツネ'][(q.a+q.b)%4]:undefined;}
function beginRound(changed){
 const q=playlist[index],game=GAMES[q.gameId-1];
 stageProgress=progressBeforeQuestion();$('play').classList.remove('answered');
 if(q.gameId===21)q.character=forestGuest(q);
 timing={...SINGLE_TIMING};
 pattern={notes:[{beat:timing.target}]};
 rhythm=new SingleAnswerRound();heldInput=null;
 flags={q:false,answer:false,cheer:false,scheduled:false,auto:new Set(),release:new Set(),flashUntil:0};phase='intro';
 art.setStage(game,index);
 art.prepareStage(game,index,q.character).catch(()=>{});
 const nextQuestion=playlist[index+1];
 if(nextQuestion)art.prepareStage(GAMES[nextQuestion.gameId-1],index+1,forestGuest(nextQuestion)).catch(()=>{});
 mini=createStage(q);
 art.theme=game.id===21?'wood':[3,5,10,15,16,18].includes(game.id)?'jelly':'gold';
 $('play').dataset.game=game.id;
 $('lesson-title').textContent=stageDesign(game.id).title;$('lesson-detail').textContent=lessonHint(q);
 $('stage-progress').textContent=`${stageProgress.correct}${stageDesign(game.id).progress}`;
 $('answer-record').textContent='';
 $('game-no').textContent=String(game.id).padStart(2,'0');$('game-title').textContent=game.title;
 const scope=lastOptions.mode==='review'?'にがての九九':Number($('table').value)?`${$('table').value}のだん${game.id===13?'・逆の式も':''}`:'1〜9のだん ミックス';
 $('play-mode').textContent=`${watch?'お手本 • ':''}${scope}`;
 $('round-count').textContent=`${index+1} / ${playlist.length}`;
 $('score-live').textContent=`${results.reduce((sum,r)=>sum+r.points,0)}点`;
 $('combo-live').textContent='';$('rhythm-grade').textContent='';
 $('feedback').hidden=true;$('progress-caption').textContent=`全${playlist.length}問`;
 $('round-hint').textContent='正解で100点。ぴったりなら＋50点！';
 const intro=$('game-intro');intro.hidden=!changed;
 intro.querySelector('small').textContent=awaitingIntro?'あそびかた':'つぎのステージ';
 intro.querySelector('h3').textContent=game.title;
 intro.querySelector('p').textContent=lessonInstruction(game.id);
 $('intro-start').hidden=!awaitingIntro;
 renderEquation('listen');renderControls(game);
 $('rhythm-notes').replaceChildren();noteNodes=[];
 setPhase('intro');mini.update({rhythmMode:true,time:0,beat:0,phase:'listen',reduceMotion:art.reduceMotion,stageProgress});mini.draw(ctx,1000,440);
}
function renderControls(game){
 $('answers').replaceChildren();
 mini.controls.forEach((c,i)=>{
  const b=document.createElement('button');b.className='answer-button';b.dataset.value=c.value;b.disabled=true;
  b.setAttribute('aria-label',`${c.label}。わかったら1回タップ。ポンに合わせるとボーナス`);
  const {label:displayLabel,suffix}=answerDisplay(game.id,c);
  if(/^\d+$/.test(displayLabel))b.append(art.numberElement(displayLabel,art.theme));else b.append(document.createTextNode(displayLabel));
  if(suffix){const caption=document.createElement('span');caption.className='answer-action';caption.textContent=suffix;b.append(caption);}
  const key=document.createElement('small');key.textContent=`PC: ${i+1}`;b.append(key);
  b.addEventListener('pointerdown',e=>{if(!canPlay()||heldInput)return;e.preventDefault();try{b.setPointerCapture?.(e.pointerId);}catch{}press(c.value,b,e.pointerId);});
  b.addEventListener('pointerup',e=>{if(heldInput?.id===e.pointerId){e.preventDefault();release();}});
  b.addEventListener('pointercancel',()=>release(true));
  b.addEventListener('lostpointercapture',()=>{if(heldInput?.button===b)release(true);});
  // Assistive-technology click activation has no pointerdown/up pair.
  b.addEventListener('click',e=>{if(e.detail===0&&canPlay()&&!heldInput){press(c.value,b,'accessible');release();}});
  $('answers').append(b);
 });
}
function localTime(){return audio.now()-roundStart;}
function inputBeat(){return localTime()/BEAT;}
function canPlay(){if(tutorial)return running&&!paused&&tutorial.answeredAt===null;return running&&!paused&&!awaitingIntro&&!watch&&['listen','play'].includes(phase)&&inputBeat()>=timing.play&&inputBeat()<timing.reveal&&!flags.answer&&rhythm?.result().answerValue===null;}
function renderEquation(p){const q=currentQuestion(),truth=[4,21].includes(q.gameId);$('equation').replaceChildren();
 const repair=q.answer>=10?(q.missing==='tens'?['□',q.answer%10]:[Math.floor(q.answer/10),'□']):['□'];
 const parts=p==='reveal'?[q.a,'×',q.b,'＝',q.answer]:q.gameId===18?[q.a,'×',q.b,'＝',...repair]:q.gameId===15?[q.a,'×','□','＝',q.answer]:truth?[q.a,'×',q.b,'＝',q.claimed]:[q.a,'×',q.b,'＝',q.gameId===12&&q.lesson?.showHint&&!flags.memoryHidden?q.answer:'？'];
 for(const part of parts){if(typeof part==='number')$('equation').append(art.numberElement(part,art.theme));else{const s=document.createElement('span');s.textContent=part;$('equation').append(s);}}
 $('equation').setAttribute('aria-label',parts.join(' '));
}
function updateControls(){
 for(const b of $('answers').children)b.disabled=!canPlay();
}
function setPhase(next){
 phase=next;$('play').dataset.phase=next;
 $('phase-label').textContent={intro:'あそびかた',listen:'もう答えてOK！',play:'3・2・1・ポン！',reveal:'こたえあわせ'}[next];
 $('instruction').textContent=next==='reveal'?'正しい九九をいっしょに言おう':'わかったら1回タップ。ポンでボーナス！';
 $('input-hint').textContent=watch?'お手本を みてね':next==='reveal'?'黄色が 正しい答えだよ':rhythm.result().answerValue!==null?'こたえを うけとったよ！':next==='intro'?'答えは1回だけタップ':'今すぐ答えてOK！ ポンで＋50点';
 if(next!=='intro')$('game-intro').hidden=true;
 renderEquation(next);updateControls();
}
function scheduleCues(){
 if(flags.scheduled)return;flags.scheduled=true;
 const gameId=playlist[index].gameId;
 for(let b=timing.countdown;b<timing.target;b++)audio.cue?.(roundStart+b*BEAT,'tick',{gameId,step:b-timing.countdown});
 audio.cue?.(roundStart+timing.target*BEAT,'accent',{gameId});
}
function animateEvent(event){
 if(!event||event.type==='ignored')return;
 if(event.type==='miss')return;
 const mathCorrect=event.value===expected(playlist[index]);
 $('rhythm-grade').textContent=event.timing==='perfect'?'タイミングぴったり！':event.timing==='nice'?'ナイスタイミング！':'こたえた！';
 $('rhythm-grade').dataset.grade='hit';
 const q=playlist[index],design=stageDesign(q.gameId),choice=mini.controls.find(c=>c.value===event.value);
 $('input-hint').textContent=`${design.action} こたえをうけとったよ`;
 $('answer-record').textContent=`あなたの答え：${answerDisplay(q.gameId,choice).label}`;
 $('play').classList.add('answered');
 audio.action?.(q.gameId,{correct:mathCorrect,timing:event.timing,value:event.value});flags.flashUntil=localTime()+1.5;
 mini.pulse({beat:localTime()/BEAT,success:mathCorrect,value:event.value,index:mini.controls.findIndex(c=>c.value===event.value),timing:event.timing,total:1,holding:false});
 timing=answeredTimeline(event.beat,{questionSeconds:audio.duration(questionVoice(q)),answerSeconds:audio.duration(`a-${q.a}-${q.b}`),questionStartBeat:flags.questionStartBeat??.2});
 audio.cancelCues?.();
 if(q.gameId===20&&mathCorrect)audio.orchestraProgress?.(stageProgress.correct+1);
 for(const b of $('answers').children)b.classList.toggle('chosen',Number(b.dataset.value)===event.value);
 updateControls();
}
function press(value,button,id){
 if(!canPlay()||heldInput)return;
 heldInput={value,button,id};button.classList.add('pressed');
 if(tutorial){answerTutorial(value);return;}
 if(!art.reduceMotion)for(const digit of button.querySelectorAll('.sprite-digit'))digit.animate([...JSON.parse(digit.dataset.frames||'[0,1,2,3,4,5]').map(f=>({backgroundPosition:`${(f%3)*50}% ${Math.floor(f/3)*100}%`})),{backgroundPosition:digit.style.backgroundPosition}],{duration:BEAT*2000,easing:'steps(1,end)'});
 const event=rhythm.inputdown(value,inputBeat(),{offsetMs:save.settings.offset});
 for(const missed of event?.expired||[])animateEvent(missed);
 if(event?.type==='hold-start')button.classList.add('holding');
 animateEvent(event);
}
function release(cancel=false){
 if(!heldInput)return;
 const {button}=heldInput;button.classList.remove('pressed','holding');heldInput=null;
 if(!running||awaitingIntro)return;
 const event=cancel?rhythm.cancelHold?.(inputBeat()):rhythm.inputup(inputBeat());
 if(event)animateEvent(event);
}
function drawCountdown(beat){
 const answered=rhythm.result().answerValue!==null;
 const remaining=Math.ceil(timing.target-beat-1e-6);
 const text=phase==='intro'?'♪':phase==='reveal'?(flags.grade?.correct?'★':'♪'):answered?'✓':phase==='listen'?'♪':remaining>0?String(Math.min(3,remaining)):'ポン!';
 $('beat-count').textContent=text;
 const design=stageDesign(playlist[index].gameId);
 $('cue-word').textContent=phase==='play'&&!answered?design.cues[Math.min(3,Math.max(0,Math.floor(beat-timing.countdown)))]:'';
 $('rhythm-message').textContent=phase==='intro'?'もうすぐ':phase==='reveal'?'こたえあわせ':answered?'こたえた！':phase==='listen'?'答えてOK':remaining>0?'ボーナスまで':'ボーナス！';
 $('beat-count').classList.toggle('go',phase==='play'&&!answered&&remaining<=0);
 $('play').style.setProperty('--count-pulse',String(art.reduceMotion?1:1+Math.max(0,1-(beat%1)*4)*.09));
}
function tick(){
 if(!running)return;
 if(tutorial){if(!paused)tickTutorial();frame=requestAnimationFrame(tick);return;}
 if(!paused&&!awaitingIntro&&!preparing){
  let time=localTime(),beat=time/BEAT;
  if(beat>=timing.round&&!flags.answer)reveal();
  if(flags.answer&&!flags.answerSpoken){playAnswerVoice(beat);if(!flags.answerSpoken&&beat>=timing.round)timing.round=Math.ceil((beat+4)/4)*4;}
  if(beat>=timing.round){
   if(index+1>=playlist.length){finish();return;}
   if(!audio.isReadyFor(upcomingAudio(index+1))){prepareQuestion(index+1);frame=requestAnimationFrame(tick);return;}
   const old=playlist[index].gameId, previousLength=timing.round;index++;
   const changed=old!==playlist[index].gameId;
   if(changed&&!watch&&(lastOptions.practice||!seenDemo.has(playlist[index].gameId))){beginRound(true);beginTutorial();frame=requestAnimationFrame(tick);return;}
   roundStart+=previousLength*BEAT+(changed?4*BEAT:0);
   if(changed){audio.setMusic(musicFor(playlist[index].gameId),audio.origin+roundStart-4*BEAT);audio.cheer('transition',{nextIsLast:index===playlist.length-1},1.6);}
   beginRound(changed);time=localTime();beat=time/BEAT;
  }
  scheduleCues();
  const next=beat<0?'intro':beat>=timing.reveal?'reveal':beat<timing.countdown?'listen':'play';
  if(next!==phase)setPhase(next);
  const q=playlist[index];
  mini.update({rhythmMode:true,time,beat:Math.max(0,beat),beatDuration:BEAT,revealBeat:timing.reveal,nextCueBeat:timing.target,phase,anticipating:phase==='play'&&rhythm.result().answerValue===null,reduceMotion:art.reduceMotion,correct:flags.grade?.correct,stageProgress});
  if(beat>=.2&&!flags.q&&!flags.answer){const spoken=audio.speak(questionVoice(q),{maxSeconds:3.2});if(spoken){flags.q=true;flags.questionStartBeat=beat;const answered=rhythm.result().events[0];if(answered)timing=answeredTimeline(answered.beat,{questionSeconds:spoken.seconds,answerSeconds:audio.duration(`a-${q.a}-${q.b}`),questionStartBeat:beat});}}
  if(q.gameId===12&&q.lesson?.showHint&&!flags.memoryHidden&&beat>=(q.lesson.hintUntilBeat??5.5)&&!flags.answer){flags.memoryHidden=true;renderEquation(phase);$('lesson-detail').textContent=lessonHint(q,{recalling:true});}
  if(watch)autoPlay(beat);
  for(const event of rhythm.update(beat))animateEvent(event);
  if(beat>=timing.reveal&&!flags.answer)reveal();
  if(flags.answer&&!flags.answerSpoken)playAnswerVoice(beat);
  if(flags.answerSpoken&&!flags.cheer&&beat>=flags.answerVoiceEndBeat+.08)playCheer(beat);
  drawCountdown(beat);
  if(time>flags.flashUntil&&!heldInput)$('rhythm-grade').textContent='';
  mini.draw(ctx,1000,440);updateControls();
 }
 frame=requestAnimationFrame(tick);
}
function expected(q){return [4,21].includes(q.gameId)?Number(q.truth):q.answer;}
function playAnswerVoice(beat){
 if(flags.answerSpoken)return;
 const q=playlist[index],spoken=audio.speak(`a-${q.a}-${q.b}`,{maxSeconds:3.2});
 if(spoken){flags.answerSpoken=true;flags.answerVoiceEndBeat=beat+spoken.seconds/BEAT;timing.round=Math.max(timing.round,Math.ceil((flags.answerVoiceEndBeat+1.6/BEAT)/4)*4);}
}
function autoPlay(beat){
 if(beat>=timing.target&&!flags.auto.has(0)){flags.auto.add(0);animateEvent(rhythm.inputdown(expected(playlist[index]),timing.target));}
}
function playCheer(beat){
 flags.cheer=true;const q=playlist[index],r=flags.grade;if(!r)return;
 const context={correct:r.correct,attempted:r.value!==null,rhythmHit:['perfect','nice'].includes(r.rhythm),streak,answerShown:true,reviewQueued:!r.correct,nearMiss:r.value!==null&&Math.abs(r.value-q.answer)<=2,isLast:index===playlist.length-1,gameId:GAMES[q.gameId-1].slug,isSlot:q.gameId===1,hintUsed:watch,claimFalse:!q.truth,caughtLie:!q.truth&&r.correct,character:q.character||GAMES[q.gameId-1].character,isJump:[5,14].includes(q.gameId),punchSuccess:q.gameId===8&&r.correct&&r.performed,repairSuccess:q.gameId===18&&r.correct&&r.performed,responseSeconds:2};
 const events=r.correct?['correct','correct_big',...(context.rhythmHit?['rhythm']:[]),...(streak>=2?['streak']:[])]:['wrong'];
 const room=Math.max(0,(timing.round-beat)*BEAT-.02);
 const cheer=audio.cheer(events[Math.floor(Math.random()*events.length)],context,room)||audio.cheer(r.correct?'correct':'encourage',context,room);
 if(cheer)$('round-hint').textContent=cheer.text;
}
function reveal(){
 release(true);flags.answer=true;
 const q=playlist[index],sequence=rhythm.result();
 const r=grade(q,{value:sequence.answerValue,performed:sequence.answerValue!==null,sequence},{watch});
 flags.grade=r;results.push(r);streak=r.correct?streak+1:0;mini.setAnswer(r.value,r.correct);
 const retry=queueBasketballRetry(playlist,index,r);if(retry.queued)audio.load([retry.question]).catch(()=>{});
 $('stage-progress').textContent=`${stageProgress.correct+Number(r.correct)}${stageDesign(q.gameId).progress}`;
 if(q.gameId===20)audio.orchestraProgress?.(stageProgress.correct+Number(r.correct));
 audio.sfx(r.correct?'correct':'wrong');playAnswerVoice(inputBeat());renderEquation('reveal');
 $('feedback').hidden=false;$('feedback').className=`feedback ${r.correct?'':'retry'}`;
 $('feedback').textContent=r.correct?(`${q.gameId===21&&!q.truth?'みやぶった！':'せいかい！'} +100${r.timingBonus?` ＋${r.timingBonus}`:''}`):`いっしょに！ ${q.a} × ${q.b} ＝ ${q.answer}`;
 $('score-live').textContent=`${results.reduce((sum,r)=>sum+r.points,0)}点`;
 for(const b of $('answers').children){b.classList.toggle('correct-answer',Number(b.dataset.value)===expected(q));b.classList.toggle('wrong-answer',r.value!==null&&!r.correct&&Number(b.dataset.value)===r.value);}
 $('round-hint').textContent=r.correct?`せいかい100点 ＋ タイミング${r.timingBonus}点`:'正しい九九を、いっしょに言ってみよう！';
}
async function finish(){
 running=false;paused=false;cancelAnimationFrame(frame);audio.stop();releaseWakeLock();const s=summarize(results);save=record(save,results);if(!watch)persist();refreshHome();screen('results');
 $('result-title').textContent=watch?'お手本、おしまい！':s.correct===s.total?'ぜんぶ、せいかい！':'さいごまで、できたね！';$('result-correct').textContent=`${s.correct} / ${s.total}`;$('result-rhythm').textContent=`＋${results.reduce((sum,r)=>sum+r.timingBonus,0)}点`;$('result-note').textContent=watch?'お手本はきろくに入りません。つぎは自分でやってみよう！':s.review.length?'下の九九を押すと、正しい答えをもう一度きけるよ。':'楽しくできたね！ 別のゲームや、別のだんでも遊んでみよう。';
 const practiced=[...new Map(results.map(q=>[`${q.a}-${q.b}`,q])).values()];
 $('review-list').replaceChildren();for(const q of practiced){const b=document.createElement('button');b.textContent=`♪ ${q.a} × ${q.b} ＝ ${q.a*q.b}`;b.onclick=async()=>{await audio.unlock();audio.speak(`a-${q.a}-${q.b}`,{force:true});};$('review-list').append(b);}
 $('review-btn').hidden=!s.review.length||watch;$('review-btn').onclick=()=>start({mode:'review',gameId:1,review:s.review});audio.sfx('finish');audio.cheer('finish',{allCompleted:true,roundsCompleted:results.length,finale:lastOptions.mode==='tour'},4);
}
function home(){++token;running=false;paused=false;tutorial=null;audio.stop();cancelAnimationFrame(frame);releaseWakeLock();$('loading').hidden=true;$('dialog').close();refreshHome();screen('home');}
async function pause(show=true){if(!running||paused)return;paused=true;retryHeldRound=rhythm?.result().holding!==null&&rhythm?.result().holding!==undefined;release(true);await audio.pause();releaseWakeLock();if(show)pauseDialog();}
function pauseDialog(){openDialog('<h2>ひとやすみ</h2><p>音楽もゲームも、とまっているよ。</p><div class="modal-buttons"><button id="resume-btn" class="primary">つづける</button><button id="pause-settings" class="secondary">設定</button><button id="quit-btn" class="quiet">ホームへ戻る</button></div>');$('resume-btn').onclick=()=>$('dialog').close();$('pause-settings').onclick=settings;$('quit-btn').onclick=home;}
async function resume(){if(!running||!paused)return;try{await audio.resume();paused=false;if(retryHeldRound){retryHeldRound=false;audio.start(musicFor(playlist[index].gameId));roundStart=4*BEAT;beginRound(false);toast('長おしの途中だったので、この問題からもう一度！');}requestWakeLock();}catch{toast('画面をもう一度タップしてください。');}}
function settings(){openDialog(`<h2>音とあそびの設定</h2>${[['music','音楽'],['voice','九九の声'],['cheer','掛け声'],['sfx','効果音']].map(([k,label])=>`<label class="setting-row">${label}<input type="range" min="0" max="100" value="${save.settings[k]}" data-setting="${k}" aria-label="${label}"></label>`).join('')}<label class="setting-row">動きをひかえめに<input type="checkbox" id="reduce-motion" ${save.settings.reduceMotion?'checked':''}></label><label class="setting-row">タイミング補正 <output id="offset-label">${save.settings.offset}ms</output><input id="offset" aria-label="タイミング補正" type="range" min="-300" max="300" step="10" value="${save.settings.offset}"></label><p>Bluetoothイヤホンなどでずれを感じるときに調整。プラスにすると、遅いタップに合わせます。</p><p>PCは1・2・3キーが答えボタン。問題が出たら、わかったときに1回押そう。正解で100点。3・2・1・ポン！に合わせるとさらに加点。</p><div class="modal-buttons"><button class="secondary" id="voices-btn">掛け声100コレクション</button><button class="quiet" id="settings-done">もどる</button></div><p style="margin-top:18px;font-size:10px">音声：VOICEVOX:ずんだもん（キャラクターごとに抑揚を調整）<br>音楽6曲は本作のオリジナル。記録はこの端末内に保存されます。</p>`);
 for(const input of document.querySelectorAll('[data-setting]'))input.oninput=()=>{save.settings[input.dataset.setting]=Number(input.value);applySettings();persist();};$('reduce-motion').onchange=e=>{save.settings.reduceMotion=e.target.checked;applySettings();persist();};$('offset').oninput=e=>{save.settings.offset=Number(e.target.value);$('offset-label').textContent=e.target.value+'ms';persist();};$('settings-done').onclick=()=>running?pauseDialog():$('dialog').close();$('voices-btn').onclick=voices;
}
async function voices(){previewAudio?.stop();previewAudio=new FestivalAudio();const player=previewAudio;openDialog('<h2>掛け声100コレクション</h2><p>声をじゅんびしています…</p>');const request=dialogRequest;try{await player.unlock();await player.load([],()=>{});if(request!==dialogRequest||!$('dialog').open){player.stop();if(player.ctx.state!=='closed')player.ctx.close();return;}player.setVolumes(save.settings);const clips=player.manifest.cheers;openDialog('<h2>掛け声100コレクション</h2><p>好きな台詞を押すと、声がきけるよ。</p><div class="review-list" id="voice-collection"></div><div class="modal-buttons"><button class="quiet" id="voices-back">設定へ</button></div>');for(const c of clips){const b=document.createElement('button');b.textContent=c.text;b.onclick=()=>player.speak(c.id,{force:true});$('voice-collection').append(b);}$('voices-back').onclick=()=>{player.stop();player.ctx.close();previewAudio=null;settings();};}catch{if(request===dialogRequest&&$('dialog').open)toast('声を読み込めませんでした。通信を確認してください。');}}
function records(){const facts=Object.entries(save.facts);openDialog(`<h2>九九のきろく</h2><p>${save.plays}回プレイ ／ ${save.correct}問せいかい ／ ★ ${Object.values(save.stars).reduce((a,b)=>a+b,0)} / 63</p><div class="fact-grid">${Array.from({length:81},(_,i)=>{const a=Math.floor(i/9)+1,b=i%9+1,f=save.facts[`${a}-${b}`];return `<span class="${f?f.lastCorrect?'learned':'retry':''}" title="${a}×${b}：${f?.correct||0}回正解">${a}×${b}</span>`;}).join('')}</div><p class="record-legend">緑：さいきん正解した九九　黄：もう一度れんしゅう<br>お手本の結果は記録しません。</p><div class="modal-buttons"><button class="primary" id="weak-btn">苦手な九九をれんしゅう</button><button class="quiet" id="export-btn">きろくを書き出す</button></div>`);$('weak-btn').onclick=()=>{const review=facts.filter(([,f])=>!f.lastCorrect).map(([k])=>{const [a,b]=k.split('-').map(Number);return{a,b};});if(!review.length){toast('苦手の記録はまだないよ。好きなゲームを遊んでみよう！');return;}start({mode:'review',gameId:1,review});};$('export-btn').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(save,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='kuku-beat-record.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};}
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&running&&!$('dialog').open){e.preventDefault();pause();return;}
 if(!canPlay()||e.repeat||heldInput)return;
 let button;
 if(['1','2','3'].includes(e.key))button=$('answers').children[Number(e.key)-1];
 else if([' ','Enter'].includes(e.key)&&document.activeElement?.classList.contains('answer-button'))button=document.activeElement;
 if(button){e.preventDefault();press(Number(button.dataset.value),button,`key:${e.code}`);}
});
document.addEventListener('keyup',e=>{if(heldInput?.id===`key:${e.code}`){e.preventDefault();release();}});
$('dialog').addEventListener('close',()=>{previewAudio?.stop();previewAudio?.ctx?.close();previewAudio=null;dialogRequest++;if(!running)audio.stopSpoken();if(running&&paused&&$('rotate').hidden)resume();});
$('mix-btn').onclick=()=>start({mode:'mix'});$('tour-btn').onclick=()=>start({mode:'tour'});$('browse-btn').onclick=()=>$('library').scrollIntoView({behavior:art.reduceMotion?'instant':'smooth'});$('settings-btn').onclick=settings;$('records-btn').onclick=records;$('pause-btn').onclick=()=>pause();$('home-btn').onclick=home;$('again-btn').onclick=()=>start(lastOptions);
function orientation(){const portrait=innerHeight>innerWidth&&innerWidth<700;const show=running&&portrait&&!allowPortrait;$('rotate').hidden=!show;if(show&&!paused)pause(false);else if(!show&&running&&paused&&!$('dialog').open)pauseDialog();}
$('portrait-continue').onclick=()=>{allowPortrait=true;$('rotate').hidden=true;pauseDialog();};addEventListener('resize',orientation);document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)pause();});addEventListener('pagehide',()=>{if(running)pause(false);});
async function requestWakeLock(){try{if(navigator.wakeLock&&!document.hidden)wakeLock=await navigator.wakeLock.request('screen');}catch{}}
function releaseWakeLock(){wakeLock?.release().catch(()=>{});wakeLock=null;}
function showUpdate(){if(swRegistration?.waiting){$('home-update').hidden=false;toast('新しいゲームの準備ができました。ホームの「新しいゲームに更新」を押してね。');}}
function activateUpdate(){
 if(!swRegistration?.waiting)return;
 $('home-update').disabled=true;$('home-update').textContent='更新しています…';
 navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});
 swRegistration.waiting.postMessage({type:'ACTIVATE_UPDATE'});
}
$('home-update').onclick=activateUpdate;
async function setupPWA(){if(!('serviceWorker'in navigator))return;try{swRegistration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});navigator.serviceWorker.addEventListener('message',e=>{const d=e.data;if(d?.type==='CACHE_PROGRESS'||d?.type==='CACHE_COMPLETE'||d?.type==='CACHE_STATUS'){cacheStatus={...d,complete:d.complete||d.type==='CACHE_COMPLETE'};renderOfflineStatus();if(d.type==='CACHE_COMPLETE')toast('オフラインのじゅんびができました！');}if(d?.type==='CACHE_ERROR'){cacheStatus={...cacheStatus,type:'CACHE_ERROR',complete:false};renderOfflineStatus();toast(d.message||'保存を中断しました。通信と空き容量を確認して、再開できます。');const b=$('cache-all');if(b)b.disabled=false;}});swRegistration.active?.postMessage({type:'GET_CACHE_STATUS'});showUpdate();swRegistration.addEventListener('updatefound',()=>{swRegistration.installing?.addEventListener('statechange',()=>{showUpdate();});});}catch{/* Local source previews do not contain a production asset manifest. */}}
function renderOfflineStatus(){if(!$('offline-status'))return;const c=cacheStatus;$('offline-status').textContent=c?.complete?'保存済み。この端末でオフラインでも遊べます。':c?.total?`${c.completed||0} / ${c.total} ファイルを保存`:'素材を保存すると、通信がなくても遊べます。';if($('offline-progress'))$('offline-progress').value=c?.total?c.completed/c.total:0;const b=$('cache-all');if(b){b.disabled=!!c?.complete||c?.type==='CACHE_PROGRESS';b.textContent=c?.complete?'保存できました':c?.type==='CACHE_PROGRESS'?'保存中…':'全ゲームを端末に保存';}}
$('install-btn').onclick=async()=>{try{offlineManifest=await (await fetch('./assets-manifest.json')).json();}catch{}const mb=offlineManifest?.totalBytes?`約${Math.ceil(offlineManifest.totalBytes/1e6)}MB`:'';openDialog(`<h2>スマホに入れて、いつでも遊ぼう</h2><p>iPhoneではSafariで開き、共有ボタン →「ホーム画面に追加」。追加したアイコンから開き、横向きで遊んでね。</p><p>AndroidやPCでは、ブラウザの「アプリをインストール」も使えます。</p><p id="offline-status"></p><progress id="offline-progress" class="offline-progress" max="1" value="0"></progress><p>${mb}。保存中はこの画面を開いたままにしてください。端末が保存データを整理した場合は、再保存できます。</p><div class="modal-buttons"><button id="cache-all" class="primary">全ゲームを端末に保存</button>${swRegistration?.waiting?'<button id="update-app" class="secondary">新しいバージョンへ更新</button>':''}</div>`);renderOfflineStatus();$('cache-all').onclick=async()=>{if(!swRegistration){toast('公開版をSafariなどの対応ブラウザで開いてください。');return;}const reg=await navigator.serviceWorker.ready;reg.active?.postMessage({type:'CACHE_ALL'});$('cache-all').disabled=true;$('cache-all').textContent='保存中…';};if($('update-app'))$('update-app').onclick=activateUpdate;};
applySettings();refreshHome();setupPWA();if(!storageAvailable)toast('記録保存が使えないため、今回の記録は画面を閉じるまで有効です。');
// This development-only bridge drives real UI/mini-game inputs in deterministic browser tests.
if(['127.0.0.1','localhost'].includes(location.hostname))globalThis.__festival={start,home,audio,get state(){return{running,paused,phase,index,question:playlist[index],mini,rhythm,pattern,timing,awaitingIntro,results,playlist,roundStart,save};},seekBeat(beat){roundStart=audio.now()-beat*BEAT;},async ready(){await ensureArt();},snapshot(){return{running,paused,phase,index,results:[...results],selected:mini?.selected,completed:mini?.completed};}};
