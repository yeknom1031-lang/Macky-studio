import {puzzles} from './puzzles.mjs';
import {Game, puzzleClues} from './engine.mjs';
const $ = selector => document.querySelector(selector);
const storageKey = 'pico-atelier-v1';
let saved = {records:{},runs:{},size:5,lastId:'5-1',sound:false};
try { const data=JSON.parse(localStorage.getItem(storageKey)); if(data && typeof data==='object') saved={...saved,...data,records:data.records||{},runs:data.runs||{}}; } catch {}
let selectedSize=[5,10,15].includes(saved.size)?saved.size:5;
let game, hintClues, tool='fill', cursor=0, drag=null, roulette=null, audio=null, endHandled=false;
let lastTick=performance.now(), lastPersist=0;
const format = seconds => `${String(Math.floor(Math.max(0,seconds)/60)).padStart(2,'0')}:${String(Math.floor(Math.max(0,seconds))%60).padStart(2,'0')}`;
function persist() {
  if(game) {
    saved.lastId=game.puzzle.id; saved.size=selectedSize;
    if(['playing','paused'].includes(game.status)) saved.runs[game.puzzle.id]=game.snapshot();
    else delete saved.runs[game.puzzle.id];
  }
  try{localStorage.setItem(storageKey,JSON.stringify(saved));}catch{}
}
function sound(kind='fill') {
  if(!saved.sound)return;
  try {
    audio??=new (window.AudioContext||window.webkitAudioContext)(); audio.resume();
    const osc=audio.createOscillator(),gain=audio.createGain();osc.connect(gain);gain.connect(audio.destination);
    osc.type=kind==='error'?'sawtooth':'sine';const t=audio.currentTime;
    osc.frequency.setValueAtTime(kind==='error'?170:kind==='win'?600:kind==='mark'?350:470,t);
    osc.frequency.exponentialRampToValueAtTime(kind==='error'?75:kind==='win'?1100:kind==='mark'?250:620,t+.1);
    gain.gain.setValueAtTime(.055,t);gain.gain.exponentialRampToValueAtTime(.001,t+.14);osc.start(t);osc.stop(t+.15);
  }catch{}
}
function pixelImage(puzzle) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=puzzle.size;
  const ctx=canvas.getContext('2d');ctx.fillStyle=puzzle.color;ctx.fillRect(0,0,puzzle.size,puzzle.size);ctx.fillStyle='#374536';
  puzzle.solution.forEach((v,i)=>{if(v)ctx.fillRect(i%puzzle.size,Math.floor(i/puzzle.size),1,1);});return canvas.toDataURL();
}
function renderList() {
  $('.level-tabs').querySelectorAll('button').forEach(b=>b.setAttribute('aria-selected',Number(b.dataset.size)===selectedSize));
  $('#collection-count').textContent=`${Object.keys(saved.records).length} / ${puzzles.length}`;
  $('#puzzle-list').replaceChildren();
  for(const p of puzzles.filter(p=>p.size===selectedSize)) {
    const record=saved.records[p.id];const button=document.createElement('button');button.className='puzzle-card'+(game?.puzzle.id===p.id?' active':'');
    button.setAttribute('aria-label',`パズル${String(p.number).padStart(2,'0')}${record?' クリア済み '+p.name:''}`);
    if(game?.puzzle.id===p.id)button.setAttribute('aria-current','true');
    button.innerHTML=record?`<span class="clear-dot">✓</span><img class="mini-result" src="${pixelImage(p)}" alt=""><strong>${p.name}</strong><small>${format(record.time)}${record.hints?' · ✧':''}</small>`:`<span class="mini-grid" aria-hidden="true">${'<i></i>'.repeat(25)}</span><strong>パズル ${String(p.number).padStart(2,'0')}</strong><small>${saved.runs[p.id]?'つづきから':p.size+' × '+p.size}</small>`;
    button.onclick=()=>selectPuzzle(p.id);$('#puzzle-list').append(button);
  }
}
function selectPuzzle(id) {
  if(game?.puzzle.id===id)return;
  persist();const puzzle=puzzles.find(p=>p.id===id)||puzzles[0]; selectedSize=puzzle.size;
  game=new Game(puzzle,saved.runs[id]);hintClues=puzzleClues(puzzle);endHandled=false;cursor=0;drag=null;
  $('#puzzle-category').textContent=`${['FIRST STEPS','A LITTLE SPARK','TAKE YOUR TIME'][[5,10,15].indexOf(puzzle.size)]} / ${String(puzzle.number).padStart(2,'0')}`;
  $('#puzzle-title').textContent=saved.records[id]?puzzle.name:`${puzzle.size===5?'はじめての':puzzle.size===10?'ひらめきの':'じっくり'}パズル ${String(puzzle.number).padStart(2,'0')}`;
  $('#size-badge').textContent=`${puzzle.size} × ${puzzle.size}`;
  renderBoard();renderList();update();persist();
}
function resizeBoard() {
  const n=game.puzzle.size;
  const count=Math.max(...hintClues.rows.map(x=>x.length),...hintClues.cols.map(x=>x.length),2);
  const available=$('.board-area').clientWidth-28;
  const cell=Math.min(n===5?44:n===10?32:26,Math.floor((available-count*15-3)/n));
  $('#board').style.setProperty('--cell',Math.max(14,cell)+'px');
  $('#board').style.setProperty('--hint', (n===5?23:n===10?18:15)+'px');
  // Recalculate with the actual hint width so the whole board fits on a phone.
  const hint=n===5?23:n===10?18:15;
  $('#board').style.setProperty('--cell',Math.max(14,Math.min(n===5?44:n===10?32:26,Math.floor((available-count*hint-3)/n)))+'px');
  $('#board').style.setProperty('--hint-count',count);
}
function renderBoard() {
  const n=game.puzzle.size,board=$('#board');board.replaceChildren();board.style.setProperty('--n',n);board.tabIndex=0;
  const corner=document.createElement('div');corner.className='board-corner';corner.textContent='✳';board.append(corner);
  const clueElement=(clues,axis,index)=>{const el=document.createElement('div');el.className=`clue ${axis}`;el.dataset[axis]=index;el.setAttribute('aria-label',`${axis==='row'?'行':'列'}${index+1}の手がかり ${clues.join('、')}`);el.innerHTML=clues.map(c=>`<span>${c}</span>`).join('');return el;};
  hintClues.cols.forEach((c,i)=>board.append(clueElement(c,'col',i)));
  for(let r=0;r<n;r++) {
    board.append(clueElement(hintClues.rows[r],'row',r));
    for(let c=0;c<n;c++) {
      const button=document.createElement('button');button.className=`cell${c%5===4?' fifth-col':''}${r%5===4?' fifth-row':''}`;
      button.dataset.index=r*n+c;button.tabIndex=-1;button.setAttribute('aria-label',`${r+1}行 ${c+1}列 未入力`);board.append(button);
    }
  }
  resizeBoard();
}
function update() {
  $('#timer').textContent=format(Math.ceil(game.remaining));$('#timer').classList.toggle('danger',game.remaining<=300);
  $('#mistakes').textContent=game.mistakes;$('#next-penalty').textContent=`次は −${[2,4,8][Math.min(game.mistakes,2)]}分`;
  $('#pause').disabled=!['playing','paused'].includes(game.status);
  $('#pause').textContent=game.status==='paused'?'▶':'Ⅱ';$('#pause').setAttribute('aria-label',game.status==='paused'?'再開':'一時停止');
  $('#hint').disabled=game.status!=='playing'||game.remaining<=300;
  const n=game.puzzle.size;
  $('#board').querySelectorAll('.cell').forEach((el,i)=>{
    el.classList.toggle('filled',game.cells[i]===1);el.classList.toggle('marked',game.cells[i]===2);el.classList.toggle('cursor',cursor===i&&game.status==='playing');
    el.setAttribute('aria-label',`${Math.floor(i/n)+1}行 ${i%n+1}列 ${['未入力','塗ったマス','×印'][game.cells[i]]}`);
  });
  $('#board').querySelectorAll('.clue').forEach(el=>{
    const row=el.dataset.row,col=el.dataset.col;
    const indices=Array.from({length:n},(_,k)=>row!==undefined?Number(row)*n+k:k*n+Number(col));
    el.classList.toggle('complete',indices.every(i=>game.puzzle.solution[i]?game.cells[i]===1:game.cells[i]!==1));
    el.classList.toggle('focused',game.status==='playing'&&(row!==undefined?Number(row)===Math.floor(cursor/n):Number(col)===cursor%n));
  });
  const overlay=$('#board-overlay');overlay.hidden=game.status==='playing';
  if(game.status==='ready'||game.status==='paused') {
    overlay.innerHTML=`<span class="overlay-flower">✳</span><p>${game.status==='paused'?'ひと息ついたら、また続きを。':'どんな絵が隠れているかな？'}</p><button class="primary" id="start">${game.status==='paused'?'つづきから遊ぶ':'パズルをはじめる'} <span>↗</span></button>${game.status==='ready'?'<button class="text-button" id="start-hint">無料ヒントを使ってはじめる</button>':''}`;
    $('#start').onclick=()=>{game.start();lastTick=performance.now();update();message('大きな数字の列から、少しずつ解いてみよう。');persist();$('#board').focus({preventScroll:true});};
    if($('#start-hint'))$('#start-hint').onclick=()=>startRoulette(true);
  } else if(game.status==='won'||game.status==='lost') {
    overlay.innerHTML=`<span class="overlay-flower">${game.status==='won'?'✦':'◷'}</span><p>${game.status==='won'?`「${game.puzzle.name}」が完成しました！`:'時間切れ。もう一度、挑戦しよう。'}</p><button class="primary" id="show-result">${game.status==='won'?'完成した絵を見る':'もう一度挑戦する'} <span>↗</span></button>`;
    $('#show-result').onclick=()=>game.status==='won'?showResult():restartGame();
    if(!endHandled)finish();
  }
}
function message(text){$('#game-message').textContent=text;}
function act(index,inputTool=tool,erase=false) {
  cursor=index;const result=game.act(index,inputTool,erase);
  if(typeof result==='number') {
    sound('error');$('#penalty').textContent=`−${result/60}:00`;
    setTimeout(()=>{$('#penalty').textContent='';},1500);
    const el=$(`#board [data-index="${index}"]`);el?.classList.remove('error');requestAnimationFrame(()=>el?.classList.add('error'));
    message(`ここは空白でした。残り時間 −${result/60}分。数字をもう一度見てみよう。`);
  }else if(result==='filled') {sound();message('いい感じ。その調子で、ひとマスずつ。');}
  else if(result==='marked')sound('mark');
  update();persist();
}
function setTool(value){tool=value;$('#fill-tool').classList.toggle('selected',value==='fill');$('#mark-tool').classList.toggle('selected',value==='mark');$('#fill-tool').setAttribute('aria-pressed',value==='fill');$('#mark-tool').setAttribute('aria-pressed',value==='mark');}
$('#fill-tool').onclick=()=>setTool('fill');$('#mark-tool').onclick=()=>setTool('mark');
$('#board').addEventListener('contextmenu',e=>e.preventDefault());
$('#board').addEventListener('pointerdown',e=>{
  const el=e.target.closest('.cell');if(!el||game.status!=='playing'||e.button>2||(e.pointerType==='mouse'&&e.button===1))return;
  e.preventDefault();const index=Number(el.dataset.index),inputTool=e.button===2?'mark':e.pointerType==='mouse'?'fill':tool;
  drag={id:e.pointerId,seen:new Set([index]),tool:inputTool,erase:inputTool==='mark'&&game.cells[index]===2,start:index,axis:null};
  $('#board').setPointerCapture(e.pointerId);$('#board').focus({preventScroll:true});act(index,inputTool,drag.erase);
});
$('#board').addEventListener('pointermove',e=>{
  if(game.status!=='playing')return;
  const el=document.elementFromPoint(e.clientX,e.clientY)?.closest('.cell');if(!el)return;
  const index=Number(el.dataset.index);cursor=index;
  if(drag&&drag.id===e.pointerId&&!drag.seen.has(index)){
    const n=game.puzzle.size,sr=Math.floor(drag.start/n),sc=drag.start%n,r=Math.floor(index/n),c=index%n;
    if(!drag.axis)drag.axis=r===sr?'row':c===sc?'col':null;
    if(!drag.axis||(drag.axis==='row'?r!==sr:c!==sc))return;
    // Fill every crossed cell when a fast pointer move skips over cells.
    const from=drag.axis==='row'?sc:sr,to=drag.axis==='row'?c:r;
    for(let k=Math.min(from,to);k<=Math.max(from,to);k++){
      const i=drag.axis==='row'?sr*n+k:k*n+sc;if(drag.seen.has(i))continue;drag.seen.add(i);act(i,drag.tool,drag.erase);
    }
    cursor=index;
  }
  update();
});
const stopDrag=()=>{drag=null;};$('#board').addEventListener('pointerup',stopDrag);$('#board').addEventListener('pointercancel',stopDrag);$('#board').addEventListener('lostpointercapture',stopDrag);
$('#board').addEventListener('click',e=>{if(e.detail===0&&e.target.closest('.cell'))act(Number(e.target.dataset.index));});
document.addEventListener('keydown',e=>{
  if($('#dialog').open){if(roulette&&[' ','Enter'].includes(e.key)){e.preventDefault();stopRoulette();}return;}
  if(e.key.toLowerCase()==='p'){e.preventDefault();togglePause();return;}
  if(game.status!=='playing')return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){
    e.preventDefault();const n=game.puzzle.size,r=Math.floor(cursor/n),c=cursor%n;
    cursor=e.key==='ArrowUp'?Math.max(0,r-1)*n+c:e.key==='ArrowDown'?Math.min(n-1,r+1)*n+c:e.key==='ArrowLeft'?r*n+Math.max(0,c-1):r*n+Math.min(n-1,c+1);update();$('#board').focus({preventScroll:true});
  }else if(['z','x',' ','Enter'].includes(e.key)||['Z','X'].includes(e.key)){
    if(e.target.closest('button')&&e.target.closest('#board')===null)return;
    e.preventDefault();if(e.repeat)return;
    const key=e.key.toLowerCase();if(key==='z')setTool('fill');if(key==='x')setTool('mark');
    const input=key==='x'?'mark':key==='z'?'fill':tool;act(cursor,input,input==='mark'&&game.cells[cursor]===2);
  }
});
function togglePause(){if(game.status==='playing'){game.pause();message('一時停止中。残り時間は減りません。');}else if(game.status==='paused'){game.start();lastTick=performance.now();message('おかえりなさい。続きを解いていこう。');}update();persist();}
$('#pause').onclick=togglePause;
function modal(html){$('#dialog-body').innerHTML=html;if(!$('#dialog').open)$('#dialog').showModal();drag=null;}
function closeModal(){$('#dialog').close();lastTick=performance.now();}
$('#dialog').addEventListener('close',()=>{roulette=null;lastTick=performance.now();});
$('#dialog').addEventListener('cancel',()=>{roulette=null;lastTick=performance.now();});
$('#help').onclick=()=>{
  modal(`<p class="dialog-eyebrow">HOW TO PLAY</p><h2>数字から、絵を見つけよう。</h2><ol class="help-steps"><li>上と左の数字は、その列に<strong>連続して塗るマスの数</strong>。数字は上から下・左から右の順です。</li><li>「2 1」なら、2マス → 1マス以上の空白 → 1マス。0の列は全部空白です。</li><li>空白だと思う場所には×印を。×は自由に消せて、間違えても減点されません。</li><li>正解のマスをすべて塗るとクリア。空白の×は必須ではありません。</li><li>制限時間は30分。塗り間違いは1回目−2分、2回目−4分、3回目以降−8分です。</li><li>開始時のヒントは無料。途中のヒントは−5分で、縦横1列ずつの答えが開きます。</li></ol><p class="keyboard-help">マウス：左クリック・左ドラッグで塗る／右クリック・右ドラッグで×<br>キーボード：矢印で移動／Zで塗る／Xで×／Pで一時停止<br>スマホ：下の「塗る」「×をつける」を選んでタッチ<br>画面を離れると自動で一時停止。途中経過も保存します。</p><div class="modal-actions"><button class="primary" id="close-help">わかった、遊んでみる ↗</button></div>`);
  $('#close-help').onclick=closeModal;
};
function startRoulette(free=false){
  if(free&&game.status!=='ready')return;
  if(!free&&(game.status!=='playing'||game.remaining<=300))return;
  const n=game.puzzle.size;roulette={free,phase:'col',col:0,row:0,last:performance.now()};
  modal(`<p class="dialog-eyebrow">HINT ROULETTE ${free?'· FREE':'· −5 MIN'}</p><h2>ひらめきの、おすそわけ。</h2><p>ストップを押して、開く列を選びます。<br>${free?'最初のヒントは無料です。':'縦横1列ずつを開き、残り時間から5分を使います。'}</p><div class="roulette-grid" style="grid-template-columns:repeat(${n},1fr)">${'<i></i>'.repeat(n*n)}</div><p class="roulette-info" id="roulette-info">まずは、縦の列をストップ。</p><div class="modal-actions"><button class="primary" id="roulette-stop">縦の列をストップ ■</button><button class="secondary" id="roulette-cancel">やめる</button></div>`);
  $('#roulette-stop').onclick=stopRoulette;$('#roulette-cancel').onclick=closeModal;paintRoulette();
}
function paintRoulette(){if(!roulette)return;const n=game.puzzle.size;$('.roulette-grid')?.querySelectorAll('i').forEach((el,i)=>el.classList.toggle('lit',i%n===roulette.col||(roulette.phase==='row'&&Math.floor(i/n)===roulette.row)));}
function stopRoulette(){
  if(!roulette)return;
  if(roulette.phase==='col'){roulette.phase='row';$('#roulette-info').textContent='つぎは、横の列をストップ。';$('#roulette-stop').textContent='横の列をストップ ■';paintRoulette();return;}
  const {free,row,col}=roulette;if(free)game.start();const used=game.hint(row,col,free);closeModal();
  if(used){sound('win');message(`${col+1}列目と${row+1}行目を開きました。${free?'無料ヒントです。':'残り時間 −5分。'}`);}
  update();persist();
}
$('#hint').onclick=()=>startRoulette(false);
function restartGame(){closeModal();delete saved.runs[game.puzzle.id];game=new Game(game.puzzle);endHandled=false;cursor=0;renderBoard();update();persist();message('新しい気持ちで、もう一度。');}
$('#restart').onclick=()=>{
  if(game.status==='ready'){restartGame();return;}
  modal('<p class="dialog-eyebrow">TRY AGAIN</p><h2>最初からやり直す？</h2><p>この問題の入力を消して、残り時間を30分に戻します。クリアしたコレクションは残ります。</p><div class="modal-actions"><button class="secondary" id="cancel-restart">続きを遊ぶ</button><button class="primary" id="confirm-restart">やり直す ↻</button></div>');
  $('#cancel-restart').onclick=closeModal;$('#confirm-restart').onclick=restartGame;
};
function finish(){
  endHandled=true;
  if(game.status==='won'){
    const id=game.puzzle.id,record={time:Math.round(1800-game.remaining),elapsed:Math.round(game.elapsed),mistakes:game.mistakes,hints:game.hints};
    if(!saved.records[id]||record.time<saved.records[id].time)saved.records[id]=record;
    $('#puzzle-title').textContent=game.puzzle.name;renderList();sound('win');persist();celebrate();showResult();message('おめでとう！ 数字の先に、小さな絵がありました。');
  }else{persist();sound('error');modal('<div class="result"><p class="dialog-eyebrow">TIME UP</p><h2>もう一度、ひらめこう。</h2><p>残り時間がなくなりました。<br>次は無料ヒントからはじめてみるのもおすすめ。</p><div class="modal-actions"><button class="secondary" id="close-lost">パズル帳へ</button><button class="primary" id="retry-lost">もう一度挑戦 ↻</button></div></div>');$('#close-lost').onclick=closeModal;$('#retry-lost').onclick=restartGame;}
}
function showResult(){
  const p=game.puzzle,idx=puzzles.findIndex(x=>x.id===p.id),next=puzzles[(idx+1)%puzzles.length];
  modal(`<div class="result"><p class="dialog-eyebrow">A LITTLE DISCOVERY / ${String(p.number).padStart(2,'0')}</p><h2>「${p.name}」ができた！</h2><img class="result-art" src="${pixelImage(p)}" alt="完成した${p.name}のドット絵"><p>ひとマスずつのひらめきが、絵になりました。</p><div class="result-details"><span>タイム ${format(1800-game.remaining)}</span><span>ミス ${game.mistakes}</span><span>ヒント ${game.hints}</span></div><div class="modal-actions"><button class="secondary" id="close-result">パズル帳へ</button><button class="primary" id="next-puzzle">つぎのパズル ↗</button></div></div>`);
  $('#close-result').onclick=closeModal;$('#next-puzzle').onclick=()=>{closeModal();selectPuzzle(next.id);};
}
function celebrate(){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;$('#confetti').innerHTML=Array.from({length:36},(_,i)=>`<i style="left:${Math.random()*100}%;background:${['#d7ed8c','#efab8d','#b6d4ff'][i%3]};animation-delay:${Math.random()*.5}s"></i>`).join('');setTimeout(()=>$('#confetti').replaceChildren(),2600);}
$('.level-tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{selectedSize=Number(b.dataset.size);selectPuzzle(puzzles.find(p=>p.size===selectedSize).id);});
function updateSound(){$('#sound-status').textContent=saved.sound?'ON':'OFF';$('#sound').setAttribute('aria-label',`効果音を${saved.sound?'オフ':'オン'}にする`);$('#sound').setAttribute('aria-pressed',!!saved.sound);}
$('#sound').onclick=()=>{saved.sound=!saved.sound;updateSound();sound();persist();};updateSound();
window.addEventListener('resize',()=>{if(game)resizeBoard();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.status==='playing'){game.pause();drag=null;update();persist();}lastTick=performance.now();});
window.addEventListener('pagehide',persist);
setInterval(()=>{
  const now=performance.now(),seconds=(now-lastTick)/1000;lastTick=now;
  if(roulette&&now-roulette.last>90){roulette.last=now;roulette[roulette.phase]=(roulette[roulette.phase]+1)%game.puzzle.size;paintRoulette();}
  if(game.status==='playing'&&!$('#dialog').open&&!document.hidden){game.tick(seconds);$('#timer').textContent=format(Math.ceil(game.remaining));$('#timer').classList.toggle('danger',game.remaining<=300);$('#hint').disabled=game.remaining<=300;if(game.status==='lost')update();}
  if(now-lastPersist>1500){lastPersist=now;persist();}
},100);
selectPuzzle(puzzles.some(p=>p.id===saved.lastId)?saved.lastId:puzzles[0].id);
