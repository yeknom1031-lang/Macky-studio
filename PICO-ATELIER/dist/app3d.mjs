import {puzzles3d,Game3D,coordinates,lineIds,runs} from './puzzles3d.mjs';
import {VoxelView} from './scene3d.mjs';
const $=s=>document.querySelector(s),key='pico-atelier-3d-v1';
const clock=s=>{s=Math.ceil(Math.max(0,s));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;};
let saved={records:{},runs:{},lastId:'3d-1'};try{const data=JSON.parse(localStorage.getItem(key));if(data&&typeof data==='object')saved={...saved,...data,records:data.records||{},runs:data.runs||{}};}catch{}
let game,view,selectedSize=3,selected=-1,touchTool='keep',sliceAxis=1,layer=0,endHandled=false,lastTick=performance.now(),lastSave=0;
function message(text){$('#game-message').textContent=text;}
function save(){if(game){saved.lastId=game.puzzle.id;if(['playing','paused'].includes(game.status))saved.runs[game.puzzle.id]=game.snapshot();else delete saved.runs[game.puzzle.id];}try{localStorage.setItem(key,JSON.stringify(saved));}catch{}}
function renderList(){
  $('.level-tabs').querySelectorAll('button').forEach(b=>b.setAttribute('aria-selected',Number(b.dataset.size)===selectedSize));
  $('#collection-count').textContent=`${Object.keys(saved.records).length} / ${puzzles3d.length}`;$('#puzzle-list').replaceChildren();
  puzzles3d.filter(p=>p.size===selectedSize).forEach(p=>{const done=saved.records[p.id],b=document.createElement('button');b.className=`puzzle-card${game?.puzzle.id===p.id?' active':''}${done?' completed':''}`;
    b.setAttribute('aria-label',`立体パズル${String(p.number).padStart(2,'0')}${done?' クリア済み '+p.name:''}`);if(game?.puzzle.id===p.id)b.setAttribute('aria-current','true');
    b.innerHTML=`${done?'<span class="clear-dot">✓</span>':''}<div class="cube-card-icon" aria-hidden="true"></div><strong>${done?p.name:'立体 '+String(p.number).padStart(2,'0')}</strong><small>${done?clock(done.time):saved.runs[p.id]?'つづきから':p.size+' × '+p.size+' × '+p.size}</small>`;b.onclick=()=>selectPuzzle(p.id);$('#puzzle-list').append(b);
  });
}
function selectPuzzle(id){
  if(game?.puzzle.id===id)return;save();const p=puzzles3d.find(p=>p.id===id)||puzzles3d[0];game=new Game3D(p,saved.runs[p.id]);selectedSize=p.size;selected=-1;endHandled=false;sliceAxis=1;layer=0;
  $('#puzzle-category').textContent=`${['FIRST VOLUME','A LITTLE DEPTH','THINK IN VOLUME'][p.size-3]} / ${String(p.number).padStart(2,'0')}`;
  $('#puzzle-title').textContent=saved.records[p.id]?p.name:`${['はじめの立体','ひらめきの立体','じっくり立体'][p.size-3]} ${String(p.number).padStart(2,'0')}`;
  $('#size-badge').textContent=`${p.size} × ${p.size} × ${p.size}`;$('#slice').max=p.size;$('#slice').value=0;
  view?.build(game);renderList();updateSlice();update();hover(-1);save();message('「0」の列はすべて削れます。まずは見つけてみよう。');
}
function hover(i){
  if(i>=0)selected=i;
  if(i<0){$('#selected-position').textContent='ブロックにマウスを重ねると表示';$('#line-clues').querySelectorAll('strong').forEach(el=>el.textContent='—');$('#scene-status').textContent=layer?`${['X','Y','Z'][sliceAxis]}方向の${layer}層目を表示中`:'ドラッグでぐるっと回転';return;}
  const n=game.puzzle.size,point=coordinates(i,n);$('#selected-position').textContent=`X ${point[0]+1} · Y ${point[1]+1} · Z ${point[2]+1}`;
  $('#line-clues').innerHTML=[0,1,2].map(axis=>{const ids=lineIds(axis,point,n),clue=runs(ids.map(i=>game.puzzle.solution[i])),done=ids.every(i=>game.puzzle.solution[i]?game.cells[i]===1:game.cells[i]===-1);return `<div class="${done?'done':''}"><b class="axis-${['x','y','z'][axis]}">${['X','Y','Z'][axis]}</b><strong>${clue.join('·')}</strong><small>${done?'✓ 完了':n+'個の列'}</small></div>`;}).join('');
  $('#scene-status').textContent=`選択：X${point[0]+1} Y${point[1]+1} Z${point[2]+1} ｜ X ${runs(lineIds(0,point,n).map(k=>game.puzzle.solution[k])).join('·')} / Y ${runs(lineIds(1,point,n).map(k=>game.puzzle.solution[k])).join('·')} / Z ${runs(lineIds(2,point,n).map(k=>game.puzzle.solution[k])).join('·')}`;
}
function update(){
  $('#timer').textContent=clock(game.remaining);$('#timer').classList.toggle('danger',game.remaining<=300);$('#mistakes').textContent=game.mistakes;$('#next-penalty').textContent=`次は −${[2,4,8][Math.min(game.mistakes,2)]}分`;
  $('#pause').disabled=!['playing','paused'].includes(game.status);$('#pause').textContent=game.status==='paused'?'▶':'Ⅱ';$('#pause').setAttribute('aria-label',game.status==='paused'?'再開':'一時停止');$('#hint').disabled=game.status!=='playing'||game.remaining<=300;
  const remaining=game.cells.filter(v=>v!==-1).length;$('#block-count').textContent=`${remaining} / ${game.puzzle.size**3} BLOCKS`;view?.sync();
  const overlay=$('#scene-overlay');overlay.hidden=game.status==='playing';overlay.classList.toggle('paused',game.status==='paused'||game.status==='lost');
  if(game.status==='ready'){
    overlay.innerHTML='<p class="overlay-label">YOUR FIRST LITTLE SCULPTURE</p><h3>数字から、立体を見つけよう。</h3><p>ドラッグで回して、いろいろな角度から。</p><button id="start" class="primary">パズルをはじめる ↗</button><button id="start-hint" class="text-button">無料ヒントを使ってはじめる</button>';
    $('#start').onclick=()=>start();$('#start-hint').onclick=()=>start(true);
  }else if(game.status==='paused'){
    overlay.innerHTML='<p class="overlay-label">TAKE A LITTLE BREAK</p><h3>ひと息ついたら、また続きを。</h3><p>途中経過と残り時間は保存されています。</p><button id="resume" class="primary">つづきから遊ぶ ↗</button>';$('#resume').onclick=()=>start();
  }else if(['won','lost'].includes(game.status)){
    overlay.hidden=game.status==='won';if(game.status==='lost')overlay.innerHTML='<h3>時間切れ。もう一度、挑戦しよう。</h3><button id="retry" class="primary">もう一度挑戦する ↗</button>';if($('#retry'))$('#retry').onclick=restart;
    if(!endHandled)finish();
  }
  if(!view){overlay.hidden=true;$('#pause').disabled=true;$('#hint').disabled=true;}
}
function start(free=false){game.start();if(free){const n=game.puzzle.size;game.hint([Math.floor(n/2),Math.floor(n/2),Math.floor(n/2)],true);message('中央を通る3方向の列を開きました。無料ヒントです。');}else message('左クリックで残す印、右クリックで削る。ドラッグで回してみよう。');lastTick=performance.now();update();save();}
function act(i,tool){
  if($('#dialog').open)return;selected=i;const result=game.act(i,tool||touchTool);if(result==='ignored')return;
  if(typeof result==='number'){
    view.flash(i);$('#penalty').textContent=`−${result/60}:00`;setTimeout(()=>$('#penalty').textContent='',1600);
    message(`${tool==='remove'?'ここは残すブロックでした。':'ここは削るブロックでした。'}残り時間 −${result/60}分。`);
  }else message(result==='removed'?'ひとつ削れました。少しずつ形が見えてくる。':result==='unmarked'?'残す印を外しました。':'残す印をつけました。数字に合う形を探そう。');
  update();hover(i);save();
}
try{view=new VoxelView($('#render-target'),{act,hover,view:(yaw,elevation,zoom)=>{$('#view-angle').textContent=`視点 ${Math.round(yaw*180/Math.PI)}° / ${Math.round(elevation*180/Math.PI)}°`;$('#render-target').dataset.zoom=zoom.toFixed(2);},contextLost:()=>{if(game){game.pause();update();save();}message('3D描画が一時停止しました。画面を再読み込みすると途中から再開できます。');}});}
catch(error){$('#render-target').innerHTML='<div class="no-webgl">3D画面を表示できませんでした。<br>ブラウザのハードウェアアクセラレーションを確認してください。<br><a href="2d.html">2Dピクロスで遊ぶ ↗</a></div>';console.error(error);$('#start').disabled=true;}
function updateSlice(){
  $('.slice-axis').querySelectorAll('button').forEach(b=>{const active=Number(b.dataset.axis)===sliceAxis;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',active);});
  $('#slice-output').textContent=layer?`${['X','Y','Z'][sliceAxis]} ${layer}層目`:'全体';view?.slice(sliceAxis,layer);$('#scene-status').textContent=layer?`${['X','Y','Z'][sliceAxis]}方向の${layer}層目を表示中。数字は全体の列の手がかりです。`:'ドラッグでぐるっと回転';
}
$('.slice-axis').querySelectorAll('button').forEach(b=>b.onclick=()=>{sliceAxis=Number(b.dataset.axis);updateSlice();});$('#slice').oninput=()=>{layer=Number($('#slice').value);updateSlice();};$('#slice-reset').onclick=()=>{layer=0;$('#slice').value=0;updateSlice();};
$('#view-front').onclick=()=>view?.preset('front');$('#view-top').onclick=()=>view?.preset('top');$('#view-side').onclick=()=>view?.preset('side');$('#view-reset').onclick=()=>view?.reset();
function setTool(tool){touchTool=tool;for(const [id,value]of [['keep-tool','keep'],['remove-tool','remove']]){const b=$('#'+id);b.classList.toggle('selected',value===tool);b.setAttribute('aria-pressed',value===tool);}}
$('#keep-tool').onclick=()=>setTool('keep');$('#remove-tool').onclick=()=>setTool('remove');
function pause(){if(game.status==='playing'){game.pause();message('一時停止中。時間は減りません。');}else if(game.status==='paused')game.start();lastTick=performance.now();update();save();}$('#pause').onclick=pause;
document.addEventListener('keydown',e=>{if($('#dialog').open)return;if(e.key.toLowerCase()==='p'){e.preventDefault();pause();}if(game.status==='playing'&&['z','x'].includes(e.key.toLowerCase())){e.preventDefault();const tool=e.key.toLowerCase()==='z'?'keep':'remove';setTool(tool);if(selected>=0)act(selected,tool);}});
function modal(html){$('#dialog-body').innerHTML=html;if(!$('#dialog').open)$('#dialog').showModal();}
function closeModal(){$('#dialog').close();lastTick=performance.now();}$('#dialog').addEventListener('close',()=>lastTick=performance.now());
$('#help').onclick=()=>{
  modal('<p class="dialog-eyebrow">HOW TO PLAY IN 3D</p><h2>回して、見つけて、削り出そう。</h2><ol class="help-steps"><li>各面の数字は、その面と垂直な列で<strong>連続して残すブロックの数</strong>。数字が複数なら、かたまりの間を1個以上削ります。</li><li>たとえば「1·2」なら1個のかたまり、空白、2個のかたまり。<strong>0の列は全部削る</strong>、列の長さと同じ数字なら全部残します。</li><li>左クリックで残す印（もう一度で外す）、右クリックで不要なブロックを削ります。不要なものを全部削ればクリア。残す印は任意です。</li><li><strong>マウスをドラッグして視点を回転</strong>。ホイールで拡大縮小。上面・正面・側面のボタンでも視点を変えられます。</li><li>輪切りのX・Y・Zを選び、スライダーで1層ずつ表示。奥のブロックを操作できます。数字は輪切り後も<strong>元の全体の列</strong>を表します。</li><li>持ち時間は30分。間違って残す・削ると−2分、−4分、以後−8分。開始時のヒントは無料、途中は−5分で選択ブロックの3方向の列を開きます。</li></ol><p class="keyboard-help">キーボード：マウスで選んだブロックをZで残す、Xで削る。矢印で回転、＋／−でズーム、Pで一時停止。<br>スマホ：タッチで選んだツールを適用。スワイプで回転、2本指で拡大縮小。</p><div class="modal-actions"><button id="close-help" class="primary">わかった、立体を解いてみる ↗</button></div>');$('#close-help').onclick=closeModal;
};
$('#hint').onclick=()=>{
  if(game.status!=='playing'||game.remaining<=300)return;
  const n=game.puzzle.size,point=selected>=0?coordinates(selected,n):[Math.floor(n/2),Math.floor(n/2),Math.floor(n/2)];
  modal(`<p class="dialog-eyebrow">A LITTLE HELP · −5 MIN</p><h2>3方向の列を開く？</h2><p>X${point[0]+1}・Y${point[1]+1}・Z${point[2]+1}のブロックを通る3方向の列を、残す・削るで確定します。残り時間を5分使います。</p><div class="modal-actions"><button id="cancel-hint" class="secondary">自分で考える</button><button id="confirm-hint" class="primary">ヒントを使う ✧</button></div>`);$('#cancel-hint').onclick=closeModal;$('#confirm-hint').onclick=()=>{closeModal();if(game.hint(point)){message('選んだ場所を通る3方向の列を開きました。残り時間 −5分。');update();hover(selected);save();}};
};
function restart(){closeModal();delete saved.runs[game.puzzle.id];game=new Game3D(game.puzzle);selected=-1;layer=0;$('#slice').value=0;endHandled=false;view?.build(game);updateSlice();update();save();message('新しい気持ちで、もう一度。');}
$('#restart').onclick=()=>{if(game.status==='ready'){restart();return;}modal('<p class="dialog-eyebrow">TRY AGAIN</p><h2>立体を最初からやり直す？</h2><p>ブロックを元に戻し、残り時間を30分に戻します。コレクションは残ります。</p><div class="modal-actions"><button id="cancel-restart" class="secondary">続きを遊ぶ</button><button id="confirm-restart" class="primary">やり直す ↻</button></div>');$('#cancel-restart').onclick=closeModal;$('#confirm-restart').onclick=restart;};
function finish(){
  endHandled=true;if(game.status==='won'){
    const p=game.puzzle,record={time:Math.round(1800-game.remaining),mistakes:game.mistakes,hints:game.hints};if(!saved.records[p.id]||record.time<saved.records[p.id].time)saved.records[p.id]=record;
    layer=0;$('#slice').value=0;updateSlice();view?.sync();$('#puzzle-title').textContent=p.name;renderList();save();message(`「${p.name}」が完成しました！ 自由に回して眺めてみよう。`);
    const next=puzzles3d[(puzzles3d.indexOf(p)+1)%puzzles3d.length];modal(`<div class="result"><p class="dialog-eyebrow">A LITTLE SCULPTURE / ${String(p.number).padStart(2,'0')}</p><h2>「${p.name}」ができた！</h2><p>数字の中から、立体を見つけました。<br>完成した形も、ドラッグで回して眺められます。</p><div class="result-details"><span>タイム ${clock(record.time)}</span><span>ミス ${game.mistakes}</span><span>ヒント ${game.hints}</span></div><div class="modal-actions"><button id="close-result" class="secondary">立体を眺める</button><button id="next-puzzle" class="primary">つぎの立体 ↗</button></div></div>`);$('#close-result').onclick=closeModal;$('#next-puzzle').onclick=()=>{closeModal();selectPuzzle(next.id);};
  }else{save();modal('<div class="result"><p class="dialog-eyebrow">TIME UP</p><h2>もう一度、ひらめこう。</h2><p>残り時間がなくなりました。<br>無料ヒントを使って始めることもできます。</p><div class="modal-actions"><button id="close-lost" class="secondary">パズル帳へ</button><button id="retry-lost" class="primary">もう一度挑戦 ↻</button></div></div>');$('#close-lost').onclick=closeModal;$('#retry-lost').onclick=restart;}
}
$('.level-tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>selectPuzzle(puzzles3d.find(p=>p.size===Number(b.dataset.size)).id));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.status==='playing'){game.pause();update();save();}lastTick=performance.now();});window.addEventListener('pagehide',save);
setInterval(()=>{const now=performance.now(),dt=(now-lastTick)/1000;lastTick=now;if(game.status==='playing'&&!document.hidden&&!$('#dialog').open){game.tick(dt);$('#timer').textContent=clock(game.remaining);$('#timer').classList.toggle('danger',game.remaining<=300);$('#hint').disabled=game.remaining<=300;if(game.status==='lost')update();}if(now-lastSave>1500){lastSave=now;save();}},100);
selectPuzzle(puzzles3d.some(p=>p.id===saved.lastId)?saved.lastId:'3d-1');
