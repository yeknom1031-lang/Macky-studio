import {AURAS,clamp} from './core.js';

// One clock owns the entire presentation. Rewards are already committed by core.rollGacha.
export class GachaScene {
  constructor({host,entries,sound,reduced=false,preview=false,onEquip,onFinish}){
    Object.assign(this,{host,entries,sound,reduced,preview,onEquip,onFinish});
    this.index=0;this.elapsed=0;this.age=0;this.phase='charge';this.particles=[];this.disposed=false;
    this.el=document.createElement('section');this.el.className='gacha-cinema';this.el.setAttribute('role','dialog');this.el.setAttribute('aria-modal','true');this.el.setAttribute('aria-label','オーラ開封');this.el.tabIndex=-1;
    this.el.innerHTML=`<div class="summon-world"></div><div class="summon-vignette"></div><canvas class="summon-particles" aria-hidden="true"></canvas><div class="summon-rays"></div><div class="summon-flash"></div><header class="summon-header"><span>${preview?'PREVIEW / コイン消費なし':'AURA SUMMONING'}<small class="summon-count"></small></span><button class="summon-skip" data-cinema="skip">演出スキップ ›</button></header><div class="summon-machine"><div class="summon-ring"></div><div class="summon-ring ring-two"></div><div class="summon-beam"></div></div><div class="capsule-wrap"><button class="capsule-button" data-cinema="open" aria-label="カプセルを開ける" disabled><img class="capsule-top" src="assets/capsule.webp" alt=""><img class="capsule-bottom" src="assets/capsule.webp" alt=""></button></div><div class="summon-status" aria-live="polite"><p class="summon-status-title">火山のエネルギーを集めています</p><div class="summon-meter"><i></i></div><small>一粒の光が、冒険を変える。</small></div><div class="summon-reward" hidden></div><div class="summon-summary" hidden></div>`;
    host.append(this.el);this.canvas=this.el.querySelector('canvas');this.ctx=this.canvas.getContext('2d');this.canvas.width=450;this.canvas.height=900;
    this.el.addEventListener('click',e=>{const b=e.target.closest('[data-cinema]');if(!b||b.disabled)return;e.stopPropagation();this.action(b.dataset.cinema,b.dataset.id);});
    this.el.addEventListener('keydown',e=>{if(e.code==='Escape'){e.preventDefault();e.stopPropagation();this.skip();}if(e.code==='Tab'){const buttons=[...this.el.querySelectorAll('button:not(:disabled)')].filter(b=>b.getClientRects().length);const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===this.el)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}});
    this.el.focus({preventScroll:true});this.prepare();
  }
  get entry(){return this.entries[this.index];}
  get aura(){return AURAS.find(a=>a.id===this.entry.id);}
  q(s){return this.el.querySelector(s);}
  prepare(){
    this.elapsed=0;this.phase='charge';this.particles=[];this.el.dataset.phase='charge';this.el.dataset.rarity=this.aura.rarity;this.el.style.setProperty('--aura',this.aura.color);
    this.q('.summon-count').textContent=this.entries.length>1?`${this.index+1} / ${this.entries.length}`:'';
    this.q('.summon-reward').hidden=true;this.q('.summon-summary').hidden=true;this.q('.capsule-button').disabled=true;this.q('.summon-status-title').textContent='火山のエネルギーを集めています';this.q('.summon-status small').textContent='一粒の光が、冒険を変える。';this.q('.summon-skip').textContent='演出スキップ ›';this.sound.play('charge');
  }
  setPhase(phase){this.phase=phase;this.elapsed=0;this.el.dataset.phase=phase;}
  update(dt){
    if(this.disposed)return;this.elapsed+=dt;this.age+=dt;
    if(this.phase==='charge'){
      this.q('.summon-meter i').style.width=clamp(this.elapsed/(this.reduced?.15:1.4),0,1)*100+'%';
      if(this.elapsed>(this.reduced?.15:1.4)){this.setPhase('drop');this.sound.play('capsule');this.q('.summon-status-title').textContent='光が、かたちになった。';}
    }else if(this.phase==='drop'&&this.elapsed>(this.reduced?.15:1.1)){
      this.setPhase('ready');this.q('.capsule-button').disabled=false;this.q('.summon-status-title').textContent='タップして、解き放とう';this.q('.summon-status small').textContent='TAP THE CAPSULE';this.q('.capsule-button').focus({preventScroll:true});
    }else if(this.phase==='opening'&&this.elapsed>(this.reduced?.18:this.aura.rarity==='LEGENDARY'?1.45:.85))this.reveal();
    this.drawParticles(dt);
  }
  action(action,id){
    if(action==='open'&&this.phase==='ready'){this.setPhase('opening');this.q('.capsule-button').disabled=true;this.q('.summon-status-title').textContent=this.aura.rarity==='LEGENDARY'?'伝説の光が、目を覚ます。':'新しい光が、生まれる。';this.sound.play('open');}
    if(action==='skip')this.skip();
    if(action==='next'){if(this.index+1<this.entries.length){this.index++;this.prepare();}else if(this.entries.length>1)this.summary();else this.finish();}
    if(action==='equip'){this.onEquip?.(id);for(const b of this.el.querySelectorAll('[data-cinema="equip"]')){b.disabled=b.dataset.id===id;b.textContent=b.disabled?'✓ 装備しました':this.phase==='summary'?'装備する':'このオーラを装備する';}}
    if(action==='finish')this.finish();
  }
  skip(){if(this.phase==='summary')return;if(this.entries.length>1){this.summary();return;}if(this.phase==='reveal'){this.finish();return;}this.reveal();}
  reveal(){
    if(this.phase==='reveal')return;this.setPhase('reveal');const a=this.aura,e=this.entry;
    this.q('.summon-reward').hidden=false;
    this.q('.summon-reward').innerHTML=`<div class="reward-art-stage"><div class="reward-orbit"></div><img class="reward-art" src="assets/aura-${a.id}.webp" alt="${a.name}のオーラをまとった冒険者"></div><div class="reward-copy"><span class="reward-rarity">${a.rarity}</span><h2>${a.name}</h2><span class="new-badge">${this.preview?'演出プレビュー / 報酬はありません':e.isNew?'NEW AURA UNLOCKED':'重複ボーナス +30 COINS'}</span><p>${a.detail}</p></div><footer class="reward-actions">${this.preview?'':`<button class="primary" data-cinema="equip" data-id="${a.id}">このオーラを装備する</button>`}<button class="secondary" data-cinema="next">${this.index+1<this.entries.length?'次のカプセルへ →':this.entries.length>1?'獲得結果を見る':'ガチャに戻る'}</button></footer>`;
    this.q('.summon-skip').textContent=this.entries.length>1?'すべての結果へ ›':'閉じる ×';this.sound.reveal(AURAS.indexOf(a));this.explode(a.color);this.q('.reward-actions button').focus({preventScroll:true});
  }
  summary(){
    this.setPhase('summary');this.q('.summon-reward').hidden=true;this.q('.summon-summary').hidden=false;
    this.q('.summon-count').textContent='5 / 5 COMPLETE';
    this.q('.summon-skip').hidden=true;
    this.q('.summon-summary').innerHTML=`<p class="section-kicker">YOUR NEW LITTLE MAGIC</p><h2>5つの光を、あなたに。</h2><div class="summary-grid">${this.entries.map(e=>{const a=AURAS.find(a=>a.id===e.id);return `<article style="--aura:${a.color}"><span>${a.rarity}</span><img src="assets/aura-${a.id}.webp" alt="${a.name}"><h3>${a.name}</h3><small>${e.isNew?'NEW!':'+30 COINS'}</small><button data-cinema="equip" data-id="${a.id}">装備する</button></article>`;}).join('')}</div><p class="small-note">獲得したオーラとコインは保存済みです。</p><button class="primary" data-cinema="finish">ガチャに戻る</button>`;
    this.sound.play('good');this.q('[data-cinema="finish"]').focus({preventScroll:true});
  }
  explode(color){if(this.reduced)return;const count=this.aura.rarity==='LEGENDARY'?130:75;for(let i=0;i<count;i++){const angle=Math.random()*Math.PI*2,speed=70+Math.random()*330;this.particles.push({x:225,y:385,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:1.5+Math.random()*2,max:3.5,size:1+Math.random()*3,color});}}
  drawParticles(dt){
    const c=this.ctx;c.clearRect(0,0,450,900);if(this.reduced)return;
    if(this.phase!=='summary')for(let i=0;i<42;i++){const a=this.age*(this.phase==='charge'?2:.25)+i*2.4;const r=this.phase==='charge'?Math.max(15,220-this.elapsed*95)+(i%4)*12:90+(i%7)*24;const x=225+Math.cos(a)*r,y=370+Math.sin(a)*r*.85;c.globalAlpha=.18+(Math.sin(this.age*2+i)+1)*.2;c.fillStyle=this.phase==='charge'?'#acfff3':this.aura.color;c.beginPath();c.arc(x,y,i%5===0?2:1,0,Math.PI*2);c.fill();}
    this.particles=this.particles.filter(p=>p.life>0);for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=55*dt;p.vx*=Math.pow(.45,dt);c.globalAlpha=clamp(p.life,0,1);c.fillStyle=p.color;c.save();c.translate(p.x,p.y);c.rotate(this.age+p.x);c.fillRect(-p.size,-p.size,p.size*2,p.size*2);c.restore();}c.globalAlpha=1;
  }
  finish(){if(this.disposed)return;this.disposed=true;this.sound.cancelSequence();this.el.remove();this.onFinish?.();}
}
