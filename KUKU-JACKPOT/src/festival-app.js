import {GAMES,createMiniGame} from './minigames.js';
import {FestivalAudio} from './festival-audio.js';
import {FestivalArt} from './festival-art.js';
import {getPattern,RhythmRound} from './festival-rhythm.js';
import {BEAT,makePlaylist,grade,summarize,newSave,normalizeSave,record} from './festival-core.js';
const $=id=>document.getElementById(id), audio=new FestivalAudio(), art=new FestivalArt();
const KEY='kuku-beat-festival-v1';let save=newSave(),storageAvailable=true;
try{save=normalizeSave(JSON.parse(localStorage.getItem(KEY)));}catch{storageAvailable=false;}
let playlist=[],results=[],index=0,mini=null,roundStart=0,phase='',running=false,paused=false,watch=false,flags={},streak=0,lastOptions={},token=0,frame=0,allowPortrait=false,wakeLock=null,toastTimer;
let swRegistration=null,cacheStatus=null,offlineManifest=null,previewAudio=null,dialogRequest=0;
let artReady=null, rhythm=null, pattern=null, timing=null, noteNodes=[], awaitingIntro=false, retryHeldRound=false, heldInput=null, seenDemo=new Set();
function ensureArt(){if(!artReady)artReady=art.load().catch(error=>{artReady=null;throw error;});return artReady;}
ensureArt().catch(()=>{});
const ctx=$('stage').getContext('2d');
const musicFor=id=>[1,6,8,17].includes(id)?'jackpot':[2,7,10,13,18].includes(id)?'kitchen':[3,4,12,15].includes(id)?'space':[5,9,16,21].includes(id)?'forest':id===20?'finale':'sports';
const paths=['jackpot','sushi','rocket','ninja','frog','quiz','donuts','gorilla','train','magic','basketball','ghost','socks','hero','aliens','fishing','delivery','octopus','dragon','orchestra','forest'];
const artPath=id=>`./designs/20-minigames/images/${String(id).padStart(2,'0')}-${paths[id-1]}.webp`;
const safeText=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4500);}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(save));}catch{storageAvailable=false;toast('このブラウザでは記録を保存できません。遊びは続けられます。');}}
function screen(name){for(const id of ['home','play','results'])$(id).hidden=id!==name;document.body.classList.toggle('in-game',name==='play');window.scrollTo(0,0);orientation();}
function openDialog(content){dialogRequest++;$('dialog-content').innerHTML=content;if(!$('dialog').open)$('dialog').showModal();}
function applySettings(){audio.setVolumes(save.settings);art.reduceMotion=save.settings.reduceMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;document.body.classList.toggle('reduced',art.reduceMotion);}
function refreshHome(){
 $('home-record').textContent=save.plays?`${save.plays}回あそんだね！ ★ ${Object.values(save.stars).reduce((a,b)=>a+b,0)} / 63`:'はじめての九九も、だいじょうぶ。';
 $('game-grid').replaceChildren();
 for(const game of GAMES){const b=document.createElement('button');b.className='game-card';b.dataset.game=game.id;b.innerHTML=`<img loading="lazy" src="${artPath(game.id)}" alt=""><div class="card-copy"><small>SHOW ${String(game.id).padStart(2,'0')}</small><span class="card-stars">${'★'.repeat(save.stars[game.id]||0)}${'☆'.repeat(3-(save.stars[game.id]||0))}</span><h3>${game.title}</h3><p>${game.subtitle}</p></div>`;b.addEventListener('click',()=>preview(game));$('game-grid').append(b);}
}
function lessonInstruction(id){
 const action=getPattern(id).notes.some(n=>n.end!=null)?'●で下の答えを押して、○ではなそう。':'●に合わせて、下の答えを何度もタップ！';
 const meaning=id===21?'九九があっていたら「ほんと」、ちがったら「うそ」。':id===4?'正しい九九は「うけとる」、ちがう九九は「はじく」。':id===15?'□に入る、かける数を答えよう。':id===18?'□に入る数字を答えよう。':'正しい九九の答えを考えよう。';
 return `${meaning} ${action}`;
}
function preview(game){
 const p=getPattern(game.id);
 openDialog(`<img class="modal-hero" src="${artPath(game.id)}" alt="${game.title}"><h2>${game.title}</h2><p>${lessonInstruction(game.id)}</p><p>リズム：${p.instruction}</p><p>① 九九をきく　② お手本のリズムをきく<br>③ 下の答えボタンで、同じリズムを２回！<br>操作するのは、下の答えボタンだけ。5問・約1分。</p><div class="modal-buttons"><button id="start-single" class="primary">あそぶ！</button><button id="start-watch" class="secondary">お手本をみる</button></div>`);
 $('start-single').onclick=()=>start({mode:'single',gameId:game.id});
 $('start-watch').onclick=()=>start({mode:'single',gameId:game.id,watch:true});
}
async function start(options){
 const run=++token;
 running=false;paused=false;awaitingIntro=false;retryHeldRound=false;heldInput=null;
 audio.stop();cancelAnimationFrame(frame);$('dialog').close();$('loading').hidden=false;
 $('loading').querySelector('progress').value=0;
 watch=!!options.watch;lastOptions={...options};results=[];index=0;streak=0;
 playlist=makePlaylist(options.mode,options.gameId,Number($('table').value),Math.random,options.review||[]);
 try{
  await audio.unlock();applySettings();
  await Promise.all([ensureArt(),audio.load(playlist,p=>{$('loading').querySelector('progress').value=p;})]);
  if(run!==token)return;
  running=true;awaitingIntro=true;roundStart=4*BEAT;
  beginRound(true);$('loading').hidden=true;screen('play');
  $('intro-start').hidden=false;$('intro-start').textContent=watch?'お手本 スタート！':'わかった！ スタート';
  $('intro-start').onclick=launchRound;
  frame=requestAnimationFrame(tick);
 }catch(error){
  if(run!==token)return;
  $('loading').hidden=true;audio.stop();screen('home');
  openDialog(`<h2>準備がとまってしまいました</h2><p>通信を確認して、もう一度おためしください。保存済みならオフラインでも遊べます。</p><p>${safeText(error.message||'素材の読み込みに失敗しました')}</p><div class="modal-buttons"><button id="retry-load" class="primary">もう一度</button></div>`);
  $('retry-load').onclick=()=>start(options);
 }
}
async function launchRound(){
 if(!awaitingIntro)return;
 await audio.unlock();audio.start(musicFor(playlist[index].gameId));
 awaitingIntro=false;roundStart=4*BEAT;flags.scheduled=false;audio.cheer('start',{},1.6);
 $('intro-start').hidden=true;requestWakeLock();
}
function beginRound(changed){
 const q=playlist[index],game=GAMES[q.gameId-1];
 if(q.gameId===21)q.character=['オオカミ','ウサギ','クマ','キツネ'][(q.a+q.b)%4];
 const shift=[4,15,21].includes(game.id)?4:0;
 timing={demo:4+shift,play:8+shift,end:16+shift,reveal:17+shift,round:24+shift};
 const original=getPattern(game.id);
 pattern={...original,notes:original.notes.map(n=>({...n,beat:n.beat+shift,...(n.end==null?{}:{end:n.end+shift})}))};
 rhythm=new RhythmRound(pattern);seenDemo=new Set();heldInput=null;
 flags={q:false,answer:false,cheer:false,scheduled:false,auto:new Set(),release:new Set(),flashUntil:0};phase='intro';
 mini=createMiniGame(game.id,q,{drawCharacter:art.drawCharacter.bind(art),drawNumber:art.drawNumber.bind(art)});
 art.theme=game.id===21?'wood':[3,5,10,15,16,18].includes(game.id)?'jelly':'gold';
 $('game-no').textContent=String(game.id).padStart(2,'0');$('game-title').textContent=game.title;
 const scope=lastOptions.mode==='review'?'にがての九九':Number($('table').value)?`${$('table').value}のだん`:'1〜9のだん ミックス';
 $('play-mode').textContent=`${watch?'お手本 • ':''}${scope}`;
 $('round-count').textContent=`${index+1} / ${playlist.length}`;
 $('score-live').textContent=`せいかい ${results.filter(x=>x.correct).length}`;
 $('combo-live').textContent='0 COMBO';$('rhythm-grade').textContent='';
 $('feedback').hidden=true;$('progress-caption').textContent=`全${playlist.length}問`;
 $('round-hint').textContent='操作は下の答えボタンだけ。画面の絵は見て楽しもう！';
 const intro=$('game-intro');intro.hidden=!changed;
 intro.querySelector('small').textContent=awaitingIntro?'あそびかた':'つぎのステージ';
 intro.querySelector('h3').textContent=game.title;
 intro.querySelector('p').textContent=lessonInstruction(game.id);
 $('intro-start').hidden=!awaitingIntro;
 renderEquation('listen');$('answers').replaceChildren();
 mini.controls.forEach((c,i)=>{
  const b=document.createElement('button');b.className='answer-button';b.dataset.value=c.value;b.disabled=true;
  b.setAttribute('aria-label',`${c.label}。リズムに合わせて押す`);
  if(/^\d+$/.test(c.label))b.append(art.numberElement(c.label,art.theme));else b.append(document.createTextNode(c.label));
  const key=document.createElement('small');key.textContent=`PC: ${i+1}`;b.append(key);
  b.addEventListener('pointerdown',e=>{if(!canPlay()||heldInput)return;e.preventDefault();try{b.setPointerCapture?.(e.pointerId);}catch{}press(c.value,b,e.pointerId);});
  b.addEventListener('pointerup',e=>{if(heldInput?.id===e.pointerId){e.preventDefault();release();}});
  b.addEventListener('pointercancel',()=>release(true));
  b.addEventListener('lostpointercapture',()=>{if(heldInput?.button===b)release(true);});
  // Assistive-technology click activation has no pointerdown/up pair.
  b.addEventListener('click',e=>{if(e.detail===0&&canPlay()&&!heldInput){press(c.value,b,'accessible');release();}});
  $('answers').append(b);
 });
 const demo=pattern.notes.filter(n=>n.beat<timing.play+4).map(n=>({...n,beat:n.beat-4,...(n.end==null?{}:{end:n.end-4}),demo:true}));
 $('rhythm-notes').replaceChildren();
 noteNodes=[...demo,...pattern.notes.map((n,i)=>({...n,index:i}))].map(n=>{
  const el=document.createElement('span');el.className=`rhythm-note${n.end==null?'':' hold'}${n.demo?' demo':''}`;
  el.textContent=n.end==null?'●':'●';el.setAttribute('aria-hidden','true');
  if(n.end!=null){const tail=document.createElement('i');tail.className='hold-tail';tail.textContent='○';el.append(tail);}
  $('rhythm-notes').append(el);return {...n,el};
 });
 setPhase('intro');mini.update({rhythmMode:true,time:0,beat:0,phase:'listen',reduceMotion:art.reduceMotion});mini.draw(ctx,1000,440);
}
function localTime(){return audio.now()-roundStart;}
function inputBeat(){return localTime()/BEAT-save.settings.offset/(1000*BEAT);}
function canPlay(){return running&&!paused&&!awaitingIntro&&!watch&&phase==='play'&&!flags.answer;}
function renderEquation(p){const q=playlist[index],truth=[4,21].includes(q.gameId);$('equation').replaceChildren();
 const repair=q.answer>=10?(q.missing==='tens'?['□',q.answer%10]:[Math.floor(q.answer/10),'□']):['□'];
 const parts=p==='reveal'?[q.a,'×',q.b,'＝',q.answer]:q.gameId===18?[q.a,'×',q.b,'＝',...repair]:q.gameId===15?[q.a,'×','□','＝',q.answer]:truth?[q.a,'×',q.b,'＝',q.claimed]:[q.a,'×',q.b,'＝','？'];
 for(const part of parts){if(typeof part==='number')$('equation').append(art.numberElement(part,art.theme));else{const s=document.createElement('span');s.textContent=part;$('equation').append(s);}}
 $('equation').setAttribute('aria-label',parts.join(' '));
}
function updateControls(){
 for(const b of $('answers').children)b.disabled=!canPlay();
}
function setPhase(next){
 phase=next;$('play').dataset.phase=next;
 for(const step of $('phase-steps').children){step.classList.toggle('active',step.dataset.phase===next);if(step.dataset.phase===next)step.setAttribute('aria-current','step');else step.removeAttribute('aria-current');}
 const hold=pattern.notes.some(n=>n.end!=null);
 $('phase-label').textContent={intro:'あそびかた',listen:'① 九九をきこう',demo:'② お手本のリズム',play:watch?'③ お手本プレイ':'③ あなたのばん！',reveal:'④ いっしょに九九！'}[next];
 $('instruction').textContent=next==='play'?(hold?'●で押す → 線のあいだ長おし → ○ではなす':'●が「ここ」にきたら、答えをタップ！'):next==='demo'?'まずは見て、リズムを覚えよう。つぎはあなた！':next==='reveal'?'ただしい九九を、いっしょにいってみよう':pattern.instruction;
 $('input-hint').textContent=watch?'お手本を みてね':next==='play'?(hold?'下の答えを 長おし → ○ではなす ↓':'操作はここ！ 同じ答えを リズムでタップ ↓'):next==='demo'?'まだ押さないよ。お手本をきこう':next==='reveal'?'黄色が 正しい答えだよ':'答えを考えよう。まだ押さなくてOK';
 if(next!=='intro')$('game-intro').hidden=true;
 renderEquation(next);updateControls();
}
function scheduleCues(){
 if(flags.scheduled)return;
 flags.scheduled=true;
 // Schedule ahead on the AudioContext, rather than timing sounds with animation frames.
 for(let b=timing.demo;b<timing.end;b++)audio.cue?.(roundStart+b*BEAT,b%4===0?'accent':'tick');
 for(const n of pattern.notes.filter(n=>n.beat<timing.play+4)){
  audio.cue?.(roundStart+(n.beat-4)*BEAT,'demo');
  if(n.end!=null)audio.cue?.(roundStart+(n.end-4)*BEAT,'release');
 }
}
function animateEvent(event){
 if(!event||event.type==='ignored')return;
 const hold=event.type==='hold-start';
 if(event.type==='stray'){
  $('combo-live').textContent=`${rhythm.result().combo} COMBO`;
  $('rhythm-grade').textContent='●が「ここ」にきたら！';$('rhythm-grade').dataset.grade='early';
  audio.sfx('tap');flags.flashUntil=localTime()+.5;return;
 }
 if(event.type==='miss'){
  $('rhythm-grade').textContent='つぎの ● をねらおう';$('rhythm-grade').dataset.grade='miss';
 }else{
  $('rhythm-grade').textContent=hold?'そのまま… ○ではなす':event.success?(event.timing==='perfect'?'ぴったり！':'ナイス！'):'おしい！';
  $('rhythm-grade').dataset.grade=event.success||hold?'hit':'miss';
  audio.sfx(event.success?'hit':'tap');
 }
 flags.flashUntil=localTime()+.55;
 mini.pulse({beat:localTime()/BEAT,success:event.success,value:event.value,index:event.index,total:pattern.notes.length,holding:hold});
 const rr=rhythm.result();$('combo-live').textContent=`${rr.combo} COMBO`;
 $('rhythm-track').classList.remove('pulse');void $('rhythm-track').offsetWidth;$('rhythm-track').classList.add('pulse');
}
function press(value,button,id){
 if(!canPlay()||heldInput)return;
 heldInput={value,button,id};button.classList.add('pressed');
 const event=rhythm.inputdown(value,inputBeat());
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
function drawNotes(beat){
 const events=rhythm.result().events;
 for(const n of noteNodes){
  const visualBeat=beat-(n.demo||watch?0:save.settings.offset/(1000*BEAT));
  const left=20+(n.beat-visualBeat)*18, width=n.end==null?null:(n.end-n.beat)*18;
  n.el.style.left=`${left}%`;if(width!=null)n.el.style.width=`${width}%`;
  n.el.hidden=left>110||(n.end??n.beat)<beat-1;
  const event=n.demo?null:events.find(e=>e.index===n.index);
  n.el.classList.toggle('hit',!!event?.success);n.el.classList.toggle('miss',!!event&&!event.success);
 }
}
function tick(){
 if(!running)return;
 if(!paused&&!awaitingIntro){
  let time=localTime(),beat=time/BEAT;
  if(beat>=timing.round){
   if(!flags.answer)reveal();
   if(index+1>=playlist.length){finish();return;}
   const old=playlist[index].gameId, previousLength=timing.round;index++;
   const changed=old!==playlist[index].gameId;
   roundStart+=previousLength*BEAT+(changed?4*BEAT:0);
   if(changed){audio.setMusic(musicFor(playlist[index].gameId),audio.origin+roundStart-4*BEAT);audio.cheer('transition',{nextIsLast:index===playlist.length-1},1.6);}
   beginRound(changed);time=localTime();beat=time/BEAT;
  }
  scheduleCues();
  const compensatedBeat=beat-(watch?0:save.settings.offset/(1000*BEAT));
  const next=beat<0?'intro':beat<timing.demo?'listen':compensatedBeat<timing.play-.38?'demo':beat<timing.reveal?'play':'reveal';
  if(next!==phase)setPhase(next);
  const q=playlist[index];
  mini.update({rhythmMode:true,time:Math.max(0,time),beat:Math.max(0,beat),phase:phase==='reveal'?'reveal':phase==='play'?'play':'listen',reduceMotion:art.reduceMotion,correct:flags.grade?.correct});
  if(beat>=.2&&!flags.q){flags.q=true;const kind=[4,21].includes(q.gameId)?q.truth?'a':'f':q.gameId===15?'r':'q';audio.speak(`${kind}-${q.a}-${q.b}`,{maxSeconds:3.2});}
  // The demonstration animates the same actions the player will perform.
  noteNodes.filter(n=>n.demo).forEach((n,i)=>{
   if(beat>=n.beat&&!seenDemo.has(i)){seenDemo.add(i);mini.pulse({beat,demo:true,value:null,success:true,index:i,total:pattern.notes.length,holding:n.end!=null});}
   if(n.end!=null&&beat>=n.end&&!seenDemo.has(`end${i}`)){seenDemo.add(`end${i}`);mini.pulse({beat,demo:true,value:null,success:true,index:i,total:pattern.notes.length,holding:false});}
  });
  if(watch)autoPlay(beat);
  for(const event of rhythm.update(compensatedBeat))animateEvent(event);
  if(beat>=timing.reveal&&!flags.answer)reveal();
  if(flags.answer&&!flags.cheer&&beat>=timing.reveal+audio.duration(`a-${q.a}-${q.b}`)/BEAT+.08)playCheer(beat);
  drawNotes(beat);
  $('beat-count').textContent=beat<0?String(Math.ceil(-beat)):phase==='demo'?String(Math.max(1,Math.ceil(timing.play-beat))):phase==='play'?String(Math.floor(Math.max(0,beat-timing.play))%4+1):'♪';
  $('rhythm-message').textContent=beat<0?'もうすぐ！':phase==='listen'?'九九をきこう':phase==='demo'?'お手本♪':phase==='play'?(beat<timing.play+4?'まねして！':'もう１回！'):'できたね！';
  if(time>flags.flashUntil&&!heldInput)$('rhythm-grade').textContent='';
  mini.draw(ctx,1000,440);updateControls();
 }
 frame=requestAnimationFrame(tick);
}
function expected(q){return [4,21].includes(q.gameId)?Number(q.truth):q.answer;}
function autoPlay(beat){
 pattern.notes.forEach((n,i)=>{
  if(beat>=n.beat&&!flags.auto.has(i)){flags.auto.add(i);animateEvent(rhythm.inputdown(expected(playlist[index]),n.beat));if(n.end==null)rhythm.inputup(n.beat);}
  if(n.end!=null&&beat>=n.end&&!flags.release.has(i)){flags.release.add(i);animateEvent(rhythm.inputup(n.end));}
 });
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
 audio.sfx(r.correct?'correct':'wrong');audio.speak(`a-${q.a}-${q.b}`,{maxSeconds:2.6});renderEquation('reveal');
 $('feedback').hidden=false;$('feedback').className=`feedback ${r.correct?'':'retry'}`;
 $('feedback').textContent=r.correct?(q.gameId===21&&!q.truth?'みやぶった！':sequence.maxCombo===sequence.total&&!sequence.strays?'せいかい！ フルコンボ！':'せいかい！'):`いっしょに！ ${q.a} × ${q.b} ＝ ${q.answer}`;
 $('score-live').textContent=`せいかい ${results.filter(x=>x.correct).length}`;
 for(const b of $('answers').children)b.classList.toggle('correct-answer',Number(b.dataset.value)===expected(q));
 $('round-hint').textContent=`リズム ${sequence.hits} / ${sequence.total}　最大 ${sequence.maxCombo} コンボ。正しい九九を声に出してみよう！`;
}
async function finish(){
 running=false;paused=false;cancelAnimationFrame(frame);audio.stop();releaseWakeLock();const s=summarize(results);save=record(save,results);if(!watch)persist();refreshHome();screen('results');
 $('result-title').textContent=watch?'お手本、おしまい！':s.correct===s.total?'ぜんぶ、せいかい！':'さいごまで、できたね！';$('result-correct').textContent=`${s.correct} / ${s.total}`;$('result-rhythm').textContent=`${s.rhythmHits} / ${s.rhythmTotal}`;$('result-note').textContent=watch?'お手本はきろくに入りません。つぎは自分でやってみよう！':s.review.length?'下の九九を押すと、正しい答えをもう一度きけるよ。':'楽しくできたね！ 別のゲームや、別のだんでも遊んでみよう。';
 $('review-list').replaceChildren();for(const q of s.review){const b=document.createElement('button');b.textContent=`♪ ${q.a} × ${q.b} ＝ ${q.a*q.b}`;b.onclick=async()=>{await audio.unlock();audio.speak(`a-${q.a}-${q.b}`,{force:true});};$('review-list').append(b);}
 $('review-btn').hidden=!s.review.length||watch;$('review-btn').onclick=()=>start({mode:'review',gameId:1,review:s.review});audio.sfx('finish');audio.cheer('finish',{allCompleted:true,roundsCompleted:results.length,finale:lastOptions.mode==='tour'},4);
}
function home(){++token;running=false;paused=false;audio.stop();cancelAnimationFrame(frame);releaseWakeLock();$('loading').hidden=true;$('dialog').close();refreshHome();screen('home');}
async function pause(show=true){if(!running||paused)return;paused=true;retryHeldRound=rhythm?.result().holding!==null&&rhythm?.result().holding!==undefined;release(true);await audio.pause();releaseWakeLock();if(show)pauseDialog();}
function pauseDialog(){openDialog('<h2>ひとやすみ</h2><p>音楽もゲームも、とまっているよ。</p><div class="modal-buttons"><button id="resume-btn" class="primary">つづける</button><button id="pause-settings" class="secondary">設定</button><button id="quit-btn" class="quiet">ホームへ戻る</button></div>');$('resume-btn').onclick=()=>$('dialog').close();$('pause-settings').onclick=settings;$('quit-btn').onclick=home;}
async function resume(){if(!running||!paused)return;try{await audio.resume();paused=false;if(retryHeldRound){retryHeldRound=false;audio.start(musicFor(playlist[index].gameId));roundStart=4*BEAT;beginRound(false);toast('長おしの途中だったので、この問題からもう一度！');}requestWakeLock();}catch{toast('画面をもう一度タップしてください。');}}
function settings(){openDialog(`<h2>音とあそびの設定</h2>${[['music','音楽'],['voice','九九の声'],['cheer','掛け声'],['sfx','効果音']].map(([k,label])=>`<label class="setting-row">${label}<input type="range" min="0" max="100" value="${save.settings[k]}" data-setting="${k}" aria-label="${label}"></label>`).join('')}<label class="setting-row">動きをひかえめに<input type="checkbox" id="reduce-motion" ${save.settings.reduceMotion?'checked':''}></label><label class="setting-row">タイミング補正 <output id="offset-label">${save.settings.offset}ms</output><input id="offset" aria-label="タイミング補正" type="range" min="-300" max="300" step="10" value="${save.settings.offset}"></label><p>Bluetoothイヤホンなどでずれを感じるときに調整。プラスにすると、遅いタップに合わせます。</p><p>PCは1・2・3キーが下の答えボタン。音符に合わせて押してね。長い音符は同じキーを押しつづけ、○ではなそう。</p><div class="modal-buttons"><button class="secondary" id="voices-btn">掛け声100コレクション</button><button class="quiet" id="settings-done">もどる</button></div><p style="margin-top:18px;font-size:10px">音声：VOICEVOX:ずんだもん（キャラクターごとに抑揚を調整）<br>音楽6曲は本作のオリジナル。記録はこの端末内に保存されます。</p>`);
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
async function setupPWA(){if(!('serviceWorker'in navigator))return;try{swRegistration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});navigator.serviceWorker.addEventListener('message',e=>{const d=e.data;if(d?.type==='CACHE_PROGRESS'||d?.type==='CACHE_COMPLETE'||d?.type==='CACHE_STATUS'){cacheStatus={...d,complete:d.complete||d.type==='CACHE_COMPLETE'};renderOfflineStatus();if(d.type==='CACHE_COMPLETE')toast('オフラインのじゅんびができました！');}if(d?.type==='CACHE_ERROR'){cacheStatus={...cacheStatus,type:'CACHE_ERROR',complete:false};renderOfflineStatus();toast(d.message||'保存を中断しました。通信と空き容量を確認して、再開できます。');const b=$('cache-all');if(b)b.disabled=false;}});swRegistration.active?.postMessage({type:'GET_CACHE_STATUS'});swRegistration.addEventListener('updatefound',()=>{swRegistration.installing?.addEventListener('statechange',()=>{if(swRegistration.waiting)toast('新しいバージョンがあります。ホームの「スマホに追加」から更新できます。');});});}catch{/* Local source previews do not contain a production asset manifest. */}}
function renderOfflineStatus(){if(!$('offline-status'))return;const c=cacheStatus;$('offline-status').textContent=c?.complete?'保存済み。この端末でオフラインでも遊べます。':c?.total?`${c.completed||0} / ${c.total} ファイルを保存`:'素材を保存すると、通信がなくても遊べます。';if($('offline-progress'))$('offline-progress').value=c?.total?c.completed/c.total:0;const b=$('cache-all');if(b){b.disabled=!!c?.complete||c?.type==='CACHE_PROGRESS';b.textContent=c?.complete?'保存できました':c?.type==='CACHE_PROGRESS'?'保存中…':'全ゲームを端末に保存';}}
$('install-btn').onclick=async()=>{try{offlineManifest=await (await fetch('./assets-manifest.json')).json();}catch{}const mb=offlineManifest?.totalBytes?`約${Math.ceil(offlineManifest.totalBytes/1e6)}MB`:'';openDialog(`<h2>スマホに入れて、いつでも遊ぼう</h2><p>iPhoneではSafariで開き、共有ボタン →「ホーム画面に追加」。追加したアイコンから開き、横向きで遊んでね。</p><p>AndroidやPCでは、ブラウザの「アプリをインストール」も使えます。</p><p id="offline-status"></p><progress id="offline-progress" class="offline-progress" max="1" value="0"></progress><p>${mb}。保存中はこの画面を開いたままにしてください。端末が保存データを整理した場合は、再保存できます。</p><div class="modal-buttons"><button id="cache-all" class="primary">全ゲームを端末に保存</button>${swRegistration?.waiting?'<button id="update-app" class="secondary">新しいバージョンへ更新</button>':''}</div>`);renderOfflineStatus();$('cache-all').onclick=async()=>{if(!swRegistration){toast('公開版をSafariなどの対応ブラウザで開いてください。');return;}const reg=await navigator.serviceWorker.ready;reg.active?.postMessage({type:'CACHE_ALL'});$('cache-all').disabled=true;$('cache-all').textContent='保存中…';};if($('update-app'))$('update-app').onclick=()=>{navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});swRegistration.waiting?.postMessage({type:'ACTIVATE_UPDATE'});};};
applySettings();refreshHome();setupPWA();if(!storageAvailable)toast('記録保存が使えないため、今回の記録は画面を閉じるまで有効です。');
// This development-only bridge drives real UI/mini-game inputs in deterministic browser tests.
if(['127.0.0.1','localhost'].includes(location.hostname))globalThis.__festival={start,home,audio,get state(){return{running,paused,phase,index,question:playlist[index],mini,rhythm,pattern,timing,awaitingIntro,results,playlist,roundStart,save};},seekBeat(beat){roundStart=audio.now()-beat*BEAT;},async ready(){await ensureArt();},snapshot(){return{running,paused,phase,index,results:[...results],selected:mini?.selected,completed:mini?.completed};}};
