'use strict';
const $ = s => document.querySelector(s);
const read = (key, fallback) => {try {return JSON.parse(localStorage.getItem(key)) ?? fallback;} catch {return fallback;}};
const storedFavorites = read('macky-favorites', []);
const storedRecent = read('macky-recent', {});
let favorites = new Set(Array.isArray(storedFavorites) ? storedFavorites.filter(x => typeof x === 'string') : []);
let recent = storedRecent && typeof storedRecent === 'object' && !Array.isArray(storedRecent) ? storedRecent : {};
let games = [], token = '', view = 'all', category = 'すべて', busy = new Set(), toastTimer;
const labels = {all:'すべてのゲーム',favorites:'お気に入り',recent:'最近遊んだ'};
const escapes = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
const esc = value => String(value).replace(/[&<>"']/g, c => escapes[c]);
const save = () => {try {localStorage.setItem('macky-favorites',JSON.stringify([...favorites]));localStorage.setItem('macky-recent',JSON.stringify(recent));} catch {toast('記録を保存できません。ブラウザの保存設定をご確認ください。', true);}};
function toast(message,error=false) { clearTimeout(toastTimer); const el=$('#toast');el.textContent=message;el.classList.toggle('error',error);el.hidden=false;toastTimer=setTimeout(()=>el.hidden=true,error?9000:4500); }
function selectView(next) {view=next;category='すべて';$('#search').value='';renderCategories();render();}
function renderCategories() {
 const categories=['すべて',...new Set(games.map(g=>g.category))];
 $('#categories').innerHTML=categories.map(c=>`<button class="category ${category===c?'active':''}" aria-pressed="${category===c}" data-category="${esc(c)}">${esc(c)}</button>`).join('');
}
function filtered() {
 const query=$('#search').value.trim().normalize('NFKC').toLocaleLowerCase();
 let result=games.filter(g=>(view!=='favorites'||favorites.has(g.id))&&(view!=='recent'||Number(recent[g.id])>0)&&(category==='すべて'||category===g.category)&&(`${g.title} ${g.id} ${g.description} ${g.category}`).normalize('NFKC').toLocaleLowerCase().includes(query));
 const sort=$('#sort').value;
 if(sort==='name') result.sort((a,b)=>a.title.localeCompare(b.title,'ja'));
 else if(sort==='recent'||view==='recent')result.sort((a,b)=>(Number(recent[b.id])||0)-(Number(recent[a.id])||0)||a.order-b.order);
 else result.sort((a,b)=>a.order-b.order||a.title.localeCompare(b.title,'ja'));
 return result;
}
function card(g,index) {
 const favorite=favorites.has(g.id), pending=busy.has(g.id), disabled=!g.available||pending;
 const initials=g.id.split('-').slice(0,2).map(x=>x.slice(0,1).toUpperCase()).join('');
 const art=g.cover?`<img src="${esc(g.cover)}" alt="${esc(g.title)}のサムネイル" loading="${index<8?'eager':'lazy'}" decoding="async">`:`<span class="cover-fallback" style="--hue:${(g.id.charCodeAt(0)*7+g.id.length*17)%360}"><strong>${esc(initials)}</strong><small>MACKY COLLECTION</small></span>`;
 const type=['app','godot'].includes(g.kind)?'MAC APP':'BROWSER';
 return `<article class="card ${pending?'launching':''}" data-id="${esc(g.id)}"><button class="cover-button" data-launch="${esc(g.id)}" aria-label="${esc(g.title)}を起動" ${disabled?'disabled':''}>${art}</button><button class="favorite ${favorite?'selected':''}" data-favorite="${esc(g.id)}" aria-label="${esc(g.title)}をお気に入り${favorite?'から外す':'に追加'}" aria-pressed="${favorite}">${favorite?'♥':'♡'}</button><div class="card-info"><div class="card-meta"><span class="genre">${esc(g.category)}</span><span>${type} ↗</span></div><h3><button class="title-button" data-launch="${esc(g.id)}" ${disabled?'disabled':''}>${esc(g.title)}</button></h3><p>${esc(g.description)}</p><div class="card-bottom"><span>${g.available?(recent[g.id]?'プレイ済み':'このMacで遊べます'):'起動ファイルを確認'}</span><button class="play-button" data-launch="${esc(g.id)}" ${disabled?'disabled':''}>${pending?'起動中…':g.available?'遊ぶ':'準備が必要'} <span>↗</span></button></div></div></article>`;
}
function render() {
 const result=filtered();
 $('#library-title').textContent=labels[view];$('#result-count').textContent=result.length;
 $('#nav-total').textContent=games.length;$('#nav-favorites').textContent=games.filter(g=>favorites.has(g.id)).length;
 document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-current',b.dataset.view===view?'page':'false');});
 $('#filter-summary').textContent=`${games.length}タイトルのコレクション${result.length!==games.length?` / ${result.length}タイトルを表示`:''} · クリックして遊ぶ`;
 $('#games').innerHTML=result.map(card).join('');$('#games').setAttribute('aria-busy','false');
 $('#empty').hidden=result.length!==0;
 $('#empty-description').textContent=view==='favorites'?'ゲームの♡を押すと、ここにお気に入りが並びます。':view==='recent'?'ゲームを起動すると、ここに最近遊んだ作品が並びます。':'検索ワードやジャンルを変えてみてください。';
 $('#surprise').disabled=!games.some(g=>g.available);
}
async function load() {
 $('#refresh').disabled=true;
 try {const response=await fetch('/api/games',{cache:'no-store'});if(!response.ok)throw new Error();const data=await response.json();games=data.games;token=data.token;renderCategories();render();}
 catch {$('#games').setAttribute('aria-busy','false');if(!games.length)$('#games').innerHTML='<div class="empty">ポータルに接続できません。<br>「ゲームポータルを開く.command」を開いて、一覧を更新してください。</div>';toast('一覧を取得できませんでした。「一覧を更新」で再試行できます。',true);}
 finally {$('#refresh').disabled=false;}
}
async function launch(id) {
 if(busy.has(id))return;
 const game=games.find(g=>g.id===id);if(!game?.available)return;
 // Reserve the tab during the click gesture, before the asynchronous server request.
 // Browser games must not depend on macOS's default URL-handler registration.
 let gameTab=null;
 if(game.kind==='web') {
  gameTab=window.open('about:blank','_blank');
  if(gameTab){gameTab.opener=null;gameTab.document.title=game.title;gameTab.document.body.textContent='ゲームを開いています…';}
 }
 busy.add(id);render();toast(`${game.title} を開いています…`);
 try {
  const response=await fetch(game.kind==='web'?'/api/prepare':'/api/launch',{method:'POST',headers:{'Content-Type':'application/json','X-Portal-Token':token},body:JSON.stringify({id}),signal:AbortSignal.timeout(45000)});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'起動できませんでした。');
  if(game.kind==='web') {
   const target=new URL(data.url);
   if(target.protocol!=='http:'||target.hostname!=='127.0.0.1')throw new Error('ゲームの起動先を確認できませんでした。');
   if(gameTab&&!gameTab.closed)gameTab.location.replace(target.href);
   else window.location.assign(target.href);
  }
  recent[id]=Date.now();save();toast(`${game.title}：${data.message}`);
 } catch(error) {if(gameTab&&!gameTab.closed)gameTab.close();toast(error.name==='TimeoutError'?'起動の確認が時間切れになりました。ブラウザまたはDockをご確認ください。':error.message||'起動できませんでした。もう一度お試しください。',true);}
 finally {busy.delete(id);render();}
}
$('#games').addEventListener('click',event=>{
 const fav=event.target.closest('[data-favorite]');if(fav){const id=fav.dataset.favorite;favorites.has(id)?favorites.delete(id):favorites.add(id);save();render();const next=[...document.querySelectorAll('[data-favorite]')].find(e=>e.dataset.favorite===id);next?.focus({preventScroll:true});return;}
 const button=event.target.closest('[data-launch]');if(button)launch(button.dataset.launch);
});
$('#categories').addEventListener('click',e=>{const button=e.target.closest('[data-category]');if(button){category=button.dataset.category;renderCategories();render();}});
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>selectView(b.dataset.view)));
$('#search').addEventListener('input',render);$('#sort').addEventListener('change',render);
$('#refresh').addEventListener('click',load);$('#clear').addEventListener('click',()=>selectView('all'));
$('#surprise').addEventListener('click',()=>{const pool=games.filter(g=>g.available);if(pool.length)launch(pool[Math.floor(Math.random()*pool.length)].id);});
$('#help').addEventListener('click',()=>$('#help-dialog').showModal());
$('#close-help').addEventListener('click',()=>$('#help-dialog').close());$('#help-done').addEventListener('click',()=>$('#help-dialog').close());
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!$('#help-dialog').open){e.preventDefault();$('#search').focus();}if(e.key==='Escape'&&document.activeElement===$('#search')){$('#search').value='';render();}});
window.addEventListener('storage',e=>{if(e.key==='macky-favorites'||e.key==='macky-recent'){const f=read('macky-favorites',[]),r=read('macky-recent',{});if(Array.isArray(f))favorites=new Set(f);if(r&&typeof r==='object'&&!Array.isArray(r))recent=r;render();}});
load();
