import {BEAT} from './festival-core.js';
import {makeStarlineChart,StarlineSession,STARLINE_MODES} from './starline-core.js';
const ROOT=new URL('../assets/runtime/starline/',import.meta.url),COLORS=['#5de4ff','#ffdb72','#ff78d2'];
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const image=file=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('ステージの絵を読み込めませんでした'));im.src=new URL(file,ROOT);});
export class StarlineStage{
 constructor({audio,settings,table,onFinish,onExit}){
  Object.assign(this,{audio,settings,table,onFinish,onExit});this.abort=new AbortController();this.active=true;this.state='menu';this.mode='normal';this.watch=false;this.frame=0;this.lastIndex=-1;this.lastBeat=-1;this.particles=[];this.flash=null;this.keys=new Set();this.reduced=settings.reduceMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;
  let el=document.getElementById('starline');if(!el){el=document.createElement('main');el.id='starline';document.body.append(el);}this.el=el;el.hidden=false;el.className=this.reduced?'sl-reduced':'';
  el.innerHTML=`<div class="sl-bg"></div><div class="sl-vignette"></div><canvas class="sl-canvas" aria-hidden="true"></canvas><header class="sl-top"><div class="sl-brand"><small>SHOW 22 / STARLINE</small><b>九九ビート・スターライン</b></div><div class="sl-status"><span id="sl-count">12問</span><b id="sl-score">0点</b><button id="sl-pause" aria-label="いちじていし">Ⅱ</button></div></header><div class="sl-question"><small id="sl-scope">${table?table+'のだん':'1〜9のだんミックス'}</small><strong id="sl-equation" aria-live="polite">7 × 8 = ?</strong></div><div class="sl-next" id="sl-next"></div><div class="sl-tip" id="sl-tip">正しい答えを<br>1回タップ！</div><div class="sl-combo"><b id="sl-combo">0</b><span>COMBO</span></div><div class="sl-hit-label">光るラインで<br>タイミングボーナス →</div><div class="sl-pads" role="group" aria-label="3つの答えレーン">${COLORS.map((c,i)=>`<button class="sl-pad" data-lane="${i}" style="--lane:${c}" disabled><b>—</b><small>PC ${i+1}</small></button>`).join('')}</div><div class="sl-feedback" id="sl-feedback" aria-live="polite"></div><div class="sl-training" id="sl-training"></div><div class="sl-progress"></div><div class="sl-modal"><div class="sl-panel"></div></div><div class="sl-rotate"><div>スマホを横にしてね<span>音楽を止めて待っているよ。<br>横にしたら「つづける」で再開。</span></div></div>`;
  this.canvas=el.querySelector('canvas');this.ctx=this.canvas.getContext('2d');this.pads=[...el.querySelectorAll('.sl-pad')];this.q=s=>el.querySelector(s);
  const signal=this.abort.signal;
  this.pads.forEach((b,i)=>{b.addEventListener('pointerdown',e=>{e.preventDefault();this.answer(i);},{signal});b.addEventListener('click',e=>{if(e.detail===0)this.answer(i);},{signal});});
  this.q('#sl-pause').onclick=()=>this.pause();
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();this.pause();return;}if(!['1','2','3','ArrowLeft','ArrowDown','ArrowRight'].includes(e.key)||e.repeat||this.keys.has(e.code))return;this.keys.add(e.code);e.preventDefault();this.answer({'1':0,'2':1,'3':2,ArrowLeft:0,ArrowDown:1,ArrowRight:2}[e.key]);},{signal});
  document.addEventListener('keyup',e=>this.keys.delete(e.code),{signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.pause();},{signal});
  window.addEventListener('pagehide',()=>this.pause(),{signal});window.addEventListener('resize',()=>{this.resize();if(innerHeight>innerWidth&&innerWidth<700)this.pause();},{signal});
  this.resize();this.menu();this.tick();
 }
 resize(){this.w=this.el.clientWidth;this.h=this.el.clientHeight;const d=Math.min(2,devicePixelRatio||1);this.canvas.width=Math.round(this.w*d);this.canvas.height=Math.round(this.h*d);this.ctx.setTransform(d,0,0,d,0,0);}
 modal(html){this.q('.sl-modal').hidden=false;this.q('.sl-panel').innerHTML=html;}
 menu(){this.state='menu';this.modal(`<small>NEW STAGE · 3 LANE RHYTHM</small><h2>答えを、ビートにのせよう。</h2><div class="sl-demo"><span>7 × 8</span><span>54　<b>56</b>　63 ↓</span></div><p>正しい答えのレーンを <b>1回だけタップ。</b><br>すぐ押しても正解100点。光るラインで押すと＋50点！<br>次の問題は、音楽に合わせて続くよ。</p><div class="sl-actions"><button class="main" id="sl-go">練習して はじめる</button><button id="sl-speed">ゆっくりにする</button><button id="sl-watch">お手本を見る</button><button id="sl-back">ホームへ</button></div>`);this.q('#sl-go').onclick=()=>this.load(false);this.q('#sl-watch').onclick=()=>this.load(true);this.q('#sl-speed').onclick=e=>{this.mode=this.mode==='normal'?'easy':'normal';e.target.textContent=this.mode==='easy'?'ノーマルに戻す':'ゆっくりにする';this.q('#sl-count').textContent=STARLINE_MODES[this.mode].count+'問・'+STARLINE_MODES[this.mode].label;};this.q('#sl-back').onclick=()=>this.exit();}
 async load(watch){
  if(this.state==='loading')return;this.state='loading';this.watch=watch;this.modal('<small>GET READY</small><h2>音と光を、準備中…</h2><p id="sl-load-status">0%</p>');
  try{
   await this.audio.unlock();this.audio.setVolumes(this.settings);this.chart=makeStarlineChart({table:this.table,mode:this.mode});
   await Promise.all([this.audio.load([...this.chart,{a:2,b:3,gameId:3}].map(q=>({...q,gameId:3})),p=>{const node=this.q('#sl-load-status');if(node)node.textContent=Math.round(p*100)+'%';}),image('backdrop.webp'),image('cast.webp').then(im=>this.cast=im)]);
   if(!this.active)return;this.audio.start('space');this.q('.sl-modal').hidden=true;
   if(watch)this.begin();else{this.state='practice';this.practiceStart=this.audio.now();this.practiceAnswer=null;this.practiceSpoken=false;this.practiceAnswerSpoken=false;this.practiceQ={a:2,b:3,answer:6,choices:[8,6,5],index:0,start:0,target:7*BEAT,end:12*BEAT};this.setQuestion(this.practiceQ);this.q('#sl-count').textContent='練習・点数なし';this.q('#sl-tip').innerHTML='「6」のレーンを<br>1回タップしよう！';this.q('#sl-training').textContent='光る真ん中のボタンを押してみてね';this.pads[1].classList.add('guide');}
  }catch(e){if(!this.active)return;this.state='error';this.audio.stop();this.modal('<h2>準備がとまったよ</h2><p>音と絵を読み込めませんでした。もう一度ためしてね。</p><div class="sl-actions"><button class="main" id="sl-retry">もう一度</button><button id="sl-back">ホームへ</button></div>');this.q('#sl-retry').onclick=()=>this.load(watch);this.q('#sl-back').onclick=()=>this.exit();}
 }
 begin(){this.state='playing';this.session=new StarlineSession(this.chart,{offset:this.settings.offset,watch:this.watch});this.audio.start('space');this.origin=4*BEAT;this.lastIndex=-1;this.lastBeat=-1;this.voiceQ=new Set();this.voiceA=new Set();this.cheered=new Set();this.cues=new Set();this.flash=null;this.particles=[];this.q('#sl-training').textContent=this.watch?'お手本・点数は保存しないよ':'';this.q('#sl-tip').innerHTML='正しい答えを<br>1回タップ！';this.pads.forEach(b=>b.classList.remove('guide'));this.q('.sl-modal').hidden=true;this.setQuestion(this.chart[0]);this.q('#sl-equation').textContent='READY?';this.pads.forEach(b=>{b.disabled=true;b.querySelector('b').textContent='♪';});this.wake();}
 setQuestion(q){this.current=q;this.q('.sl-question').classList.remove('answered');this.q('#sl-equation').textContent=`${q.a} × ${q.b} = ?`;this.q('#sl-count').textContent=`${q.index+1} / ${this.chart?.length||1}`;this.pads.forEach((b,i)=>{b.disabled=this.watch;b.classList.remove('chosen');b.querySelector('b').textContent=q.choices[i];b.setAttribute('aria-label',`${q.choices[i]}、${['左','まん中','右'][i]}のレーン`);});this.q('#sl-feedback').textContent='';}
 answer(lane){
  if(this.state==='practice'){
   if(this.practiceAnswer!==null)return;const correct=lane===1;this.practiceAnswer=lane;this.practiceAt=this.audio.now();this.pads.forEach((b,i)=>{b.disabled=true;b.classList.toggle('chosen',i===lane);b.classList.remove('guide');});this.q('#sl-equation').textContent='2 × 3 = 6';this.q('#sl-feedback').innerHTML=correct?'そう！ できたね！':'正しくは 6。覚えたね！';this.q('#sl-training').textContent='このあと本番。早く押してもOK！';this.audio.sfx(correct?'correct':'wrong');return;
  }
  if(this.state!=='playing'||this.watch)return;const time=this.audio.now()-this.origin;
  // At a measure boundary, never apply a tap on the previous visible choices to the next question.
  if(this.session.current(time)?.index!==this.current?.index)return;
  const result=this.session.submit(lane,time);if(result)this.hit(result,time);
 }
 hit(r,time){
  const q=this.current;if(!q||q.index!==r.index)return;
  this.flash={...r,time};this.q('.sl-question').classList.add('answered');this.q('#sl-equation').textContent=`${r.a} × ${r.b} = ${r.answer}`;this.q('#sl-score').textContent=this.session.score+'点';this.q('#sl-combo').textContent=this.session.combo;
  this.q('#sl-feedback').innerHTML=r.correct?`${r.rhythm==='perfect'?'PERFECT!':r.rhythm==='nice'?'NICE!':'せいかい！'}<small>＋100${r.timingBonus?' ＋'+r.timingBonus:''}${this.session.combo>=3?'　'+this.session.combo+' COMBO':''}</small>`:`${r.value===null?'いっしょに！':'おしい！'} ${r.a} × ${r.b} = ${r.answer}<small>つぎの問題で、またやってみよう</small>`;
  this.pads.forEach((b,i)=>{b.disabled=true;b.classList.toggle('chosen',i===(r.correct?r.lane:r.choices.indexOf(r.answer)));});
  this.audio.sfx(r.correct?'correct':'wrong');if(r.correct){this.audio.action(15,{correct:true,timing:r.rhythm,value:r.value});if(!this.reduced){for(let i=0;i<(r.rhythm==='perfect'?38:18);i++)this.particles.push({x:this.laneX(r.lane,.78),y:this.h*.77,vx:(Math.random()-.5)*180,vy:-70-Math.random()*150,t:time,life:.6+Math.random()*.6,color:COLORS[r.lane]});this.particles=this.particles.slice(-100);}}
 }
 async pause(){if(!['playing','practice'].includes(this.state))return;this.beforePause=this.state;this.frozenVisual=this.state==='practice'?this.audio.now()-this.practiceStart:this.audio.now()-this.origin;this.state='paused';await this.audio.pause();if(!this.active)return;this.releaseWake();this.modal('<small>TAKE A BREAK</small><h2>ひとやすみ</h2><p>音楽も答えも、そのまま止まっているよ。</p><div class="sl-actions"><button class="main" id="sl-resume">つづける</button><button id="sl-restart">はじめから</button><button id="sl-back">ホームへ</button></div>');this.q('#sl-resume').onclick=async()=>{try{await this.audio.resume();if(!this.active)return;this.state=this.beforePause;this.q('.sl-modal').hidden=true;this.wake();}catch{this.q('#sl-resume').textContent='もう一度タップしてね';}};this.q('#sl-restart').onclick=()=>{this.audio.stop();this.load(this.watch);};this.q('#sl-back').onclick=()=>this.exit();}
 async wake(){try{if(navigator.wakeLock)this.lock=await navigator.wakeLock.request('screen');}catch{}}
 releaseWake(){this.lock?.release().catch(()=>{});this.lock=null;}
 exit(){this.dispose();this.onExit();}
 dispose(){this.active=false;cancelAnimationFrame(this.frame);this.abort.abort();this.releaseWake();this.audio.stop();this.el.hidden=true;this.keys.clear();}
 tick=()=>{
  if(!this.active)return;
  const time=this.audio.now();let t=time-this.origin;
  if(this.state==='practice'){
   t=time-this.practiceStart;const q=this.practiceQ;
   if(!this.practiceSpoken){const p=this.audio.speak('q-2-3');if(p){this.practiceSpoken=true;this.practiceVoiceEnd=time+p.seconds;}}
   if(this.practiceAnswer!==null&&!this.practiceAnswerSpoken&&time>Math.max(this.practiceAt+.4,this.practiceVoiceEnd+.1)){const p=this.audio.speak('a-2-3');if(p){this.practiceAnswerSpoken=true;this.practiceEnd=time+p.seconds+.8;}}
   if(this.practiceAnswerSpoken&&time>=this.practiceEnd)this.begin();
  }else if(this.state==='playing'){
   const q=this.session.current(t);
   if(q&&q.index!==this.lastIndex){this.lastIndex=q.index;this.setQuestion(q);const next=this.chart[q.index+1];this.q('#sl-next').textContent=next?`つぎ　${next.a} × ${next.b}`:'ラスト！';}
   if(t<0){const c=Math.ceil(-t/BEAT);this.q('#sl-feedback').innerHTML=c>1?String(c-1):'GO!';}
   if(q){
    if(!this.voiceQ.has(q.index)&&t-q.start<2){const p=this.audio.speak(`q-${q.a}-${q.b}`);if(p)this.voiceQ.add(q.index);}
    // Schedule the final three approach beats ahead on the audio clock, not by RAF arrival.
    for(let n=2;n>=0;n--){const when=q.target-n*BEAT,key=q.index+':'+n;if(!this.cues.has(key)&&t>=when-.15){this.cues.add(key);this.audio.cue(this.origin+when,n===0?'accent':'tick',{gameId:15,step:2-n});}}
    if(this.watch&&t>=q.target&&!this.session.results.has(q.index)){const r=this.session.submit(q.choices.indexOf(q.answer),q.target);if(r)this.hit(r,t);}
   }
   for(const r of this.session.advance(t))this.hit(r,t);
   if(q&&this.session.combo>=3&&!this.cheered.has(q.index)&&this.session.results.get(q.index)?.correct&&t<q.target-.3){const room=q.target+.3-t;if(this.audio.cheer('correct',{streak:this.session.combo},Math.min(room,1.4)))this.cheered.add(q.index);}
   if(q&&t>=q.target+.4&&!this.voiceA.has(q.index)){const p=this.audio.speak(`a-${q.a}-${q.b}`);if(p)this.voiceA.add(q.index);}
   this.q('.sl-progress').style.width=clamp(t/this.chart.at(-1).end)*100+'%';
   if(t>=this.chart.at(-1).end){const results=[...this.session.results.values()];this.dispose();this.onFinish(results,{mode:this.mode,watch:this.watch,maxCombo:this.session.maxCombo});return;}
  }
  this.draw(this.state==='paused'?this.frozenVisual:Number.isFinite(t)?t:0);this.frame=requestAnimationFrame(this.tick);
 };
 laneX(i,p){return this.w*(.5+(i-1)*(.105+.065*clamp(p)));}
 text(text,x,y,size,color='#fff'){const c=this.ctx;c.font=`900 ${size}px "Kuku Maru",sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.fillText(text,x,y);}
 rounded(x,y,w,h,r,fill,stroke){const c=this.ctx;c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
 draw(t){
  const c=this.ctx,w=this.w,h=this.h;c.clearRect(0,0,w,h);const playing=this.state==='playing'||this.state==='paused'&&this.beforePause==='playing',q=this.current||{a:7,b:8,answer:56,choices:[54,56,63],start:0,target:7*BEAT,index:0};
  const visual=(this.state==='practice'||this.state==='paused'&&this.beforePause==='practice')?Math.min(7*BEAT,Math.max(0,t)):Math.max(0,t-q.start),duration=q.target-q.start||7*BEAT,progress=clamp(visual/duration,0,1.18);
  const pulse=this.reduced?0:Math.pow(1-(Math.max(0,t)/BEAT%1),4);
  for(let i=0;i<3;i++){
   const top=w*(.5+(i-1)*.105),bottom=w*(.5+(i-1)*.17),tw=w*.052,bw=w*.083;
   c.beginPath();c.moveTo(top-tw,h*.24);c.lineTo(top+tw,h*.24);c.lineTo(bottom+bw,h*.98);c.lineTo(bottom-bw,h*.98);c.closePath();c.fillStyle='#0a1139cf';c.fill();c.strokeStyle=COLORS[i]+'88';c.lineWidth=1.5;c.stroke();
   c.save();c.clip();for(let n=0;n<7;n++){let p=((n/7+(this.reduced?0:t*.16))%1+1)%1;const y=h*(.24+p*.74);c.fillStyle=COLORS[i]+(pulse>.6?'24':'12');c.fillRect(0,y,w,1+2*p);}c.restore();
  }
  c.save();c.shadowColor='#9feaff';c.shadowBlur=12+pulse*8;c.strokeStyle='#c5f5ff';c.lineWidth=3+pulse*2;c.beginPath();c.moveTo(w*.245,h*.78);c.lineTo(w*.755,h*.78);c.stroke();c.restore();
  // Full-body generated poses cycle to the musical beat; celebrations use a different pose.
  if(this.cast){const recent=this.flash&&t-this.flash.time<1.2&&this.flash.correct;const frame=this.reduced?0:recent?2:Math.floor(Math.max(0,t)/BEAT)%4;const cw=this.cast.width/4,ch=this.cast.height/2;for(let row=0;row<2;row++){const size=h*.43,dx=w*(row?.855:.145),dy=h*.80-(this.reduced?0:pulse*5);c.drawImage(this.cast,cw*frame,ch*row,cw,ch,dx-size/2,dy-size,size,size);}}
  const next=playing?this.chart?.[q.index+1]:null;
  if(next&&progress>.35){c.save();c.globalAlpha=.45;next.choices.forEach((v,i)=>{const x=this.laneX(i,0),y=h*.315;c.fillStyle='#182346';c.strokeStyle=COLORS[i];this.rounded(x-w*.032,y-h*.023,w*.064,h*.046,h*.016,'#15213eee',COLORS[i]+'88');this.text(String(v),x,y,h*.035,'#deedff');});c.restore();}
  const result=playing?this.session?.results.get(q.index):null,practiced=this.state==='practice'&&this.practiceAnswer!==null;
  q.choices.forEach((v,i)=>{
   const selected=result?.lane===i||practiced&&this.practiceAnswer===i;const answered=!!result||practiced;
   const p=progress,y=h*(.31+.47*p),x=this.laneX(i,p);const radius=h*(.035+.018*clamp(p));
   c.save();if(answered)c.globalAlpha=selected?.25:.18;
   if(!answered||!selected){c.shadowColor=COLORS[i];c.shadowBlur=12;this.rounded(x-w*.044,y-radius,w*.088,radius*2,radius*.75,COLORS[i]+'dd','#ffffffdd');c.shadowBlur=0;this.text(String(v),x,y,radius*1.35,'#152143');}c.restore();
  });
  if(this.state==='practice'&&this.practiceAnswer===null&&t>duration){this.text('ここでタップ！',w*.5,h*.69,h*.03,'#fff4a8');}
  if(this.flash&&t-this.flash.time<.7&&!this.reduced&&this.flash.correct){const age=t-this.flash.time,i=this.flash.lane,top=this.laneX(i,0),bottom=this.laneX(i,1);c.save();c.globalAlpha=(1-age/.7)*.55;const beam=c.createLinearGradient(0,h*.25,0,h*.96);beam.addColorStop(0,COLORS[i]+'00');beam.addColorStop(1,COLORS[i]);c.fillStyle=beam;c.beginPath();c.moveTo(top-w*.045,h*.25);c.lineTo(top+w*.045,h*.25);c.lineTo(bottom+w*.08,h*.96);c.lineTo(bottom-w*.08,h*.96);c.closePath();c.fill();c.restore();}
  if(this.flash&&t-this.flash.time<1&&!this.reduced&&this.flash.correct){const age=t-this.flash.time,x=this.laneX(this.flash.lane,.78);c.save();c.globalAlpha=1-age;c.strokeStyle=COLORS[this.flash.lane];c.lineWidth=3;c.beginPath();c.ellipse(x,h*.78,20+age*100,8+age*40,0,0,Math.PI*2);c.stroke();c.restore();}
  this.particles=this.particles.filter(p=>t-p.t<p.life&&t>=p.t);for(const p of this.particles){const age=t-p.t;c.save();c.globalAlpha=1-age/p.life;this.text('✦',p.x+p.vx*age,p.y+p.vy*age+120*age*age,8+5*(1-age/p.life),p.color);c.restore();}
 }
}
