/* Deterministic game rules, shared by the browser and Node's test runner. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ToiletCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DIFFICULTIES = {
    easy: { label: 'EASY', time: 180, cols: 11, rows: 8, toilets: 3, people: 22, talkExtra: 0 },
    normal: { label: 'NORMAL', time: 120, cols: 13, rows: 10, toilets: 2, people: 28, talkExtra: .5 },
    hard: { label: 'HARD', time: 75, cols: 12, rows: 9, toilets: 2, people: 34, talkExtra: 1 }
  };
  const THEMES = [
    { name: '公共施設', tag: 'CIVIC', wall: '#659596', dark: '#355e65', floor: '#eee9d9', prop: 'plant' },
    { name: '学校', tag: 'SCHOOL', wall: '#92a997', dark: '#49675b', floor: '#ede3ca', prop: 'desk' },
    { name: '駅', tag: 'STATION', wall: '#7e97ad', dark: '#405e76', floor: '#e6e9e7', prop: 'bench' },
    { name: 'モール', tag: 'MALL', wall: '#c19388', dark: '#8a5e58', floor: '#f3e8de', prop: 'plant' },
    { name: '公園', tag: 'PARK', wall: '#88a16d', dark: '#486747', floor: '#e6dec3', prop: 'tree' },
    { name: 'オフィス', tag: 'OFFICE', wall: '#a29cb5', dark: '#635c7a', floor: '#e9e6ee', prop: 'desk' }
  ];
  const NAMES = ['はじめての廊下', '分かれ道', '待つか、走るか', '遠回りの近道', '人混みを抜けて', 'となりの気配', 'もうひとつ先へ', '最後の曲がり角'];
  const STAGES = Array.from({ length: 48 }, (_, i) => ({ id: i + 1, theme: Math.floor(i / 8), name: NAMES[i % 8], seed: 60317 + i * 7919 + (i === 47 ? 1 : 0) }));
  const key = (x, y) => `${x},${y}`;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function floor(map, x, y) { return x >= 0 && y >= 0 && x < map.w && y < map.h && map.grid[y][x] === 0; }
  function distances(map, start, allowed) {
    const len = map.w * map.h, prev = new Int32Array(len).fill(-2), dist = new Int32Array(len).fill(-1), queue = new Int32Array(len);
    const sx = Math.floor(start.x), sy = Math.floor(start.y), origin = sy * map.w + sx;
    if (!floor(map, sx, sy)) return { prev, dist };
    prev[origin] = -1; dist[origin] = 0; queue[0] = origin; let size = 1;
    for (let i = 0; i < size; i++) {
      const at = queue[i], x = at % map.w, y = Math.floor(at / map.w);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, n = ny * map.w + nx;
        if (floor(map, nx, ny) && prev[n] === -2 && (!allowed || allowed[n])) { prev[n] = at; dist[n] = dist[at] + 1; queue[size++] = n; }
      }
    }
    return { prev, dist };
  }
  function path(map, start, goal, allowed) {
    const gx = Math.floor(goal.x), gy = Math.floor(goal.y);
    if (!floor(map, gx, gy)) return [];
    const { prev } = distances(map, start, allowed); let at = gy * map.w + gx;
    if (prev[at] === -2) return [];
    const out = [];
    while (at >= 0) { out.push({ x: at % map.w + .5, y: Math.floor(at / map.w) + .5 }); at = prev[at]; }
    return out.reverse();
  }
  const FEATURE_INFO = {
    clock: { icon: '+12', name: 'ひと息キャンディ', color: '#519c84', hint: '拾うと残り時間 +12秒' },
    boots: { icon: '»', name: 'かけ足シューズ', color: '#db9e43', hint: '拾うと10秒間、移動速度アップ' },
    key: { icon: 'KEY', name: 'キーカード', color: '#d8ae43', hint: '鍵のかかった近道を1つ開けられる' },
    coin: { icon: '★', name: '探検メダル', color: '#c7943e', hint: '集めた枚数がクリア結果に表示される' },
    puddle: { icon: '≈', name: '濡れた床', color: '#6b9db0', hint: '歩けば安全。走ると滑って −2秒' },
    conveyor: { icon: '»»', name: '動く歩道', color: '#889492', hint: '矢印方向は加速、逆方向はゆっくり' },
    chest: { icon: '?', name: 'お楽しみロッカー', color: '#ba8051', hint: 'Eで開く。時間・鍵・シューズのどれか！' },
    fountain: { icon: '+20', name: '休憩ベンチ', color: '#4c978a', hint: 'Eで深呼吸。1回だけ +20秒' },
    terminal: { icon: 'MAP', name: '館内案内図', color: '#63849a', hint: 'Eで全通路とトイレの場所を発見' },
    warp: { icon: '↔', name: '連絡エレベーター', color: '#8e75ae', hint: 'Eで対応する遠くの出口へ移動' },
    rubble: { icon: '▲', name: '工事の資材', color: '#a47e54', hint: '資材の上は速度が半分以下。脇を通ろう' },
    alarm: { icon: '歩', name: '走行禁止エリア', color: '#bd7358', hint: '走って踏むと注意されて −5秒。歩けば安全' },
    switch: { icon: 'ON', name: '開閉スイッチ', color: '#6d98ac', hint: 'Eで同じ番号の近道を開ける' }
  };
  const NPC_INFO = {
    chatter: { name: 'おしゃべり好き', icon: '…', color: '#ba785d', duration: 3, lines: ['あら、こんにちは！ そういえば最近ね…', '昨日の話なんだけど、もう少しだけ！', 'あっ、急いでいたのね。いってらっしゃい！'] },
    survey: { name: 'アンケート係', icon: '?', color: '#8b75a3', duration: 5, lines: ['すみません、簡単なアンケートを！', '当施設の使い心地はいかがですか？', 'ご協力ありがとうございます！'] },
    promoter: { name: 'おすすめ係', icon: '!', color: '#bd9652', duration: 6, lines: ['お客様！ 本日のおすすめを紹介します！', 'こちらの魅力が、まだまだありまして…', 'ぜひ覚えて帰ってくださいね！'] },
    guard: { name: '巡回スタッフ', icon: '✓', color: '#5b8392', duration: 4, lines: ['ちょっとお待ちください。通行の確認です。', '人が多いので、周囲をよく見てください。', '確認できました。お気をつけて！'] }
  };
  function generate(seed, difficulty = 'normal', theme = 0, practice = false) {
    const random = rng(seed), cfg = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
    const cols = practice ? 3 : cfg.cols, rows = practice ? 2 : cfg.rows, step = practice ? 5 : 7;
    const w = cols * step + 6, h = rows * step + 6;
    const grid = Array.from({ length: h }, () => Array(w).fill(1));
    const nodes = Array.from({ length: cols * rows }, (_, i) => ({ x: 4 + (i % cols) * step, y: 4 + Math.floor(i / cols) * step, id: i, radius: practice ? 1 : (random() < .3 ? 2 : 1), variant: random() < .3 ? 1 : 0 }));
    const carve = (x, y, r = 1) => { for (let yy = y - r; yy <= y + r; yy++) for (let xx = x - r; xx <= x + r; xx++) grid[yy][xx] = 0; };
    nodes.forEach(n => carve(n.x, n.y, n.radius));
    const neighbors = id => [id % cols > 0 ? id - 1 : -1, id % cols < cols - 1 ? id + 1 : -1, id >= cols ? id - cols : -1, id < cols * (rows - 1) ? id + cols : -1].filter(i => i >= 0);
    const edges = new Set(), edgeKey = (a, b) => [Math.min(a,b), Math.max(a,b)].join(':');
    const link = (a, b) => {
      let { x, y } = nodes[a]; const end = nodes[b]; edges.add(edgeKey(a,b));
      while (x !== end.x || y !== end.y) { carve(x, y); x += Math.sign(end.x - x); y += Math.sign(end.y - y); } carve(x, y);
    };
    const visited = new Set([0]), stack = [0];
    while (stack.length) {
      const a = stack[stack.length - 1], choices = neighbors(a).filter(b => !visited.has(b));
      if (!choices.length) { stack.pop(); continue; }
      const b = choices[Math.floor(random() * choices.length)]; link(a,b); visited.add(b); stack.push(b);
    }
    nodes.forEach(n => neighbors(n.id).forEach(b => { if (b > n.id && !edges.has(edgeKey(n.id,b)) && random() < .085) link(n.id,b); }));
    const startNode = nodes[Math.floor(rows / 2) * cols + Math.floor(cols / 2)];
    const start = { x: startNode.x + .5, y: startNode.y + .5 };
    const map = { w, h, grid, nodes, start, theme: THEMES[theme % THEMES.length], themeId: theme % THEMES.length, seed, difficulty, cols, rows, step, gates: [], features: [] };
    // Locked connections are ONLY additional shortcuts. The original spanning
    // tree is never blocked, so keys and random events cannot make a map unwinnable.
    const shortcuts = [];
    nodes.forEach(n => neighbors(n.id).forEach(b => { if (b > n.id && !edges.has(edgeKey(n.id,b))) shortcuts.push([n.id,b]); }));
    for (let i = 0; !practice && i < 6 && shortcuts.length; i++) {
      const [a,b] = shortcuts.splice(Math.floor(random()*shortcuts.length),1)[0]; link(a,b);
      const A=nodes[a], B=nodes[b], x=Math.floor((A.x+B.x)/2), y=Math.floor((A.y+B.y)/2), horizontal=A.y===B.y;
      const tiles=[]; for(let j=-1;j<=1;j++) { const gx=x+(horizontal?0:j), gy=y+(horizontal?j:0); grid[gy][gx]=2; tiles.push({x:gx,y:gy}); }
      map.gates.push({ id:i, x:x+.5, y:y+.5, horizontal, tiles, open:false });
    }
    const dist = distances(map,start).dist;
    const candidates = nodes.filter(n=>n.id!==startNode.id).map(n=>({...n, steps:dist[n.y*w+n.x]})).sort((a,b)=>a.steps-b.steps);
    const far = candidates[candidates.length-1].steps;
    const targets = practice ? [5,12,18] : [56, 105, Math.max(150,far*.7)].slice(0,cfg.toilets);
    const picked=[];
    for(const target of targets) { const choice=candidates.filter(n=>!picked.includes(n)).sort((a,b)=>Math.abs(a.steps-target)-Math.abs(b.steps-target))[0]; if(choice)picked.push(choice); }
    map.toilets=picked.map((n,i)=>({
      id:i,x:n.x+.5,y:n.y-.5,
      openAt:practice?(i===0?6:0):(i===0?cfg.time*.48+random()*5:cfg.time*.22+random()*5),
      openFor:practice?0:(difficulty==='hard'?7:10)+i*2,
      closedFor:practice?0:(difficulty==='hard'?14:10)+Math.floor(random()*5),
      reservedUntil:0,discovered:false
    }));
    map.safeId=1;
    const occupied = new Set([startNode.id,...picked.map(n=>n.id)]);
    const pool=nodes.filter(n=>!occupied.has(n.id));
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    const take=()=>pool.pop() || nodes[0];
    function add(type, count, extra=()=>({})) { for(let i=0;i<count&&pool.length;i++){const n=take();map.features.push({id:map.features.length,type,x:n.x+.5,y:n.y+.5,used:false,discovered:false,...extra(i)});} }
    if(!practice){
      // One useful pickup in the first room makes the new rules discoverable.
      map.features.push({id:0,type:'clock',x:start.x-1,y:start.y,used:false,discovered:true});
      add('clock',2); add('boots',3); add('key',4); add('coin',8); add('puddle',10,()=>({cooldown:0}));
      add('conveyor',6,()=>({dx:random()<.5?1:-1,dy:0}));
      add('chest',4,()=>({reward:['clock','key','boots'][Math.floor(random()*3)]}));
      add('fountain',1); add('terminal',2); add('switch',map.gates.length,i=>({gateId:i}));
      for(let pair=0;pair<2;pair++){const id=map.features.length;add('warp',2,i=>({pair:pair+1,targetId:id+(1-i)}));}
    }
    if(!practice){add('rubble',6);add('alarm',5,()=>({cooldown:0}));}
    const staffNode=take(); map.staff={x:staffNode.x+.5,y:staffNode.y+.5,talked:false};
    map.buddy={x:start.x+1.1,y:start.y,active:false,done:false,busy:false,useDuration:4+Math.floor(random()*4),path:[]};
    const peopleNodes=nodes.filter(n=>distance(n,start)>5 && !picked.some(t=>t.id===n.id));
    for(let i=peopleNodes.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[peopleNodes[i],peopleNodes[j]]=[peopleNodes[j],peopleNodes[i]];}
    // A nearby encounter teaches the collision rule; other people patrol the whole dungeon.
    const nearby=candidates.find(n=>n.steps>=7&&!picked.includes(n));
    if(nearby){const i=peopleNodes.findIndex(n=>n.id===nearby.id);if(i>=0)[peopleNodes[0],peopleNodes[i]]=[peopleNodes[i],peopleNodes[0]];}
    map.shoppers=Array.from({length:practice?0:cfg.people},(_,i)=>{
      const n=peopleNodes[i%peopleNodes.length],goal=nodes[(n.id+3)%nodes.length],kind=Object.keys(NPC_INFO)[i%4];
      return{id:i,kind,x:n.x+.5,y:n.y+.5,path:path(map,n,goal).slice(1),goal:goal.id,speed:i===0?.35:.55+random()*.65,cooldown:0,bag:i%2===0};
    });
    const fields=map.toilets.map(t=>distances(map,t).dist);
    map.signs=nodes.filter((n,i)=>i%3===0).map(n=>{const pos=n.y*w+n.x;const field=fields.reduce((a,b)=>a[pos]<b[pos]?a:b);let best=null;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const v=field[(n.y+dy)*w+n.x+dx];if(v>=0&&v<field[pos]&&(!best||v<best.v))best={dx,dy,v};}return best?{x:n.x+.5,y:n.y+1.2,...best}:null;}).filter(Boolean);
    map.floorCount=grid.reduce((total,row)=>total+row.filter(v=>v===0).length,0);
    return map;
  }
  class Game {
    constructor({ seed = 60317, difficulty = 'normal', theme = 0, practice = false, stageId = 1 } = {}) {
      this.options = { seed, difficulty, theme, practice, stageId };
      this.map = generate(seed, difficulty, theme, practice);
      this.player = { ...this.map.start, facing: 1, walk: 0 };
      this.limit = practice ? 90 : DIFFICULTIES[difficulty].time;
      this.remaining = this.limit; this.elapsed = 0; this.state = 'playing'; this.paused = false;
      this.mode = 'explore'; this.door = null; this.relief = 0; this.waited = 0; this.moved = 0;
      this.penalties = 0; this.events = []; this.recruited = false; this.shared = false;
      this.seen = new Uint8Array(this.map.w * this.map.h); this.route = [{ ...this.player }];
      this.autoPath = []; this.autoDoor = null; this.buddyCheck = 0; this.keys = 0; this.coins = 0; this.collected = 0; this.boostUntil = 0; this.warpCooldown = 0; this.mapKnown = false; this.talk = null; this.talkGrace = 0; this.talkCount = 0; this.talkLost = 0; this.stamina = 100; this.exhausted = false; this.sprintRest = 0; this.reveal();
    }
    event(text, kind = 'info') { this.events.push({ text, kind, at: this.elapsed }); if (this.events.length > 10) this.events.shift(); }
    reveal() {
      const { x, y } = this.player, m = this.map, radius = this.options.difficulty === 'easy' || this.options.practice ? 9 : (this.options.difficulty === 'hard' ? 6 : 7);
      for (let yy = Math.max(0, Math.floor(y) - radius); yy < Math.min(m.h, y + radius); yy++) for (let xx = Math.max(0, Math.floor(x) - radius); xx < Math.min(m.w, x + radius); xx++) if (Math.hypot(xx + .5 - x, yy + .5 - y) <= radius) this.seen[yy * m.w + xx] = 1;
      m.features.forEach(f => { if (this.seen[Math.floor(f.y) * m.w + Math.floor(f.x)]) f.discovered = true; });
      m.toilets.forEach(t => { if (!t.discovered && this.seen[Math.floor(t.y) * m.w + Math.floor(t.x)]) { t.discovered = true; this.event('トイレを発見！ 近づいて E', 'discover'); } });
    }
    toiletStatus(t, at=this.elapsed) {
      if(at<t.openAt)return {open:false,left:t.openAt-at,reason:'使用中'};
      if(at<(t.reservedUntil||0))return {open:false,left:t.reservedUntil-at,reason:'仲間が使用中'};
      if(!t.openFor)return {open:true,left:0,reason:'空き'};
      if(at<(t.priorityUntil||0))return {open:true,left:t.priorityUntil-at,reason:'空き'};
      const cycle=t.openFor+t.closedFor, phase=(at-t.openAt)%cycle;
      if(phase<t.openFor)return {open:true,left:t.openFor-phase,reason:'空き'};
      return {open:false,left:cycle-phase,reason:Math.floor((at-t.openAt)/cycle)%2?'使用中':'清掃中'};
    }
    startTalk(n, sprint=false) {
      if(this.mode==='talk'||this.mode==='relief'||this.state!=='playing'||this.paused||this.talkGrace>0||n.cooldown>0)return false;
      const info=NPC_INFO[n.kind]||NPC_INFO.chatter;
      const duration=info.duration+DIFFICULTIES[this.options.difficulty].talkExtra+(sprint?2:0);
      this.talk={npcId:n.id,kind:n.kind||'chatter',remaining:duration,total:duration,sprint};
      this.mode='talk';this.talkCount++;this.penalties++;this.autoPath=[];this.autoDoor=null;this.door=null;
      n.cooldown=duration+22;
      this.event(`${info.name}につかまった！ ${duration}秒の立ち話${sprint?' · 走ってぶつかって +2秒':''}`,'bad');
      return true;
    }
    talkLine() {
      if(!this.talk)return '';
      const info=NPC_INFO[this.talk.kind],ratio=1-this.talk.remaining/this.talk.total;
      return info.lines[Math.min(2,Math.floor(ratio*3))];
    }
    nearDoor() { return this.map.toilets.find(t => distance(this.player, t) < 1.45); }
    context() {
      if(this.mode==='talk')return {type:'talk',label:NPC_INFO[this.talk.kind].name,hint:this.talkLine()};
      if (this.mode === 'relief') return { type: 'relief', label: 'あと少し…', hint: '3秒間でクリア' };
      const t = this.nearDoor();
      if (t) return { type: 'door', target: t, label: this.toiletStatus(t).open ? 'トイレに入る' : (this.mode === 'wait' ? '待機をやめる' : 'ここで待つ'), hint: this.clue(t) };
      const feature = this.map.features.find(f => !f.used && ['chest','fountain','terminal','warp','switch'].includes(f.type) && distance(this.player,f)<1.5);
      if(feature) return {type:'feature',target:feature,label:FEATURE_INFO[feature.type].name,hint:FEATURE_INFO[feature.type].hint};
      const gate=this.map.gates.find(g=>!g.open&&distance(this.player,g)<2.6);
      if(gate) return {type:'gate',target:gate,label:this.keys?'近道を開ける':'鍵が必要',hint:`近道 ${gate.id+1} · キーカード1枚、または同じ番号のスイッチ`};
      if (distance(this.player, this.map.staff) < 1.7 && !this.map.staff.talked) return { type: 'staff', label: '案内を聞く', hint: '2秒使って、全トイレの場所が分かる' };
      const person=this.map.shoppers.find(n=>!n.cooldown&&distance(this.player,n)<1.5);
      if(person)return {type:'person',target:person,label:'話しかける',hint:`${NPC_INFO[person.kind].name} · 話を聞く間も時計は進みます`};
      const b = this.map.buddy;
      if (distance(this.player, b) < 1.6 && !b.active && !b.done) return { type: 'buddy', label: '仲間を誘う', hint: '一緒に探そう！ 励ましで +3秒' };
      return null;
    }
    clue(t) {
      const status=this.toiletStatus(t),left=status.left;
      if(status.open)return this.options.practice?'空いている！ 入ってから3秒でクリア':`空いている！ 次の利用・清掃まで約${Math.ceil(left)}秒` ;
      if(status.reason==='清掃中')return `清掃中… あと${Math.ceil(left)}秒で使えます`;
      if(status.reason==='仲間が使用中')return `仲間が使用中… あと${Math.ceil(left)}秒`;
      if (left < 4) return 'ジャー… 水を流す音！';
      if (left < 9) return 'ガサゴソ… 荷物をまとめている';
      if (left < 15) return '「あとちょっと！」';
      return '♪ 動画の音… 長くなりそう';
    }
    interact() {
      if (this.state !== 'playing' || this.paused || this.mode === 'relief' || this.mode === 'talk') return;
      const c = this.context(); if (!c) return;
      this.autoPath = []; this.autoDoor = null;
      if (c.type === 'door') {
        this.door = c.target;
        if (this.toiletStatus(this.door).open) this.enter();
        else { this.mode = this.mode === 'wait' ? 'explore' : 'wait'; this.event(this.mode === 'wait' ? '耳をすまして待機中。移動で中断できます' : '別のトイレを探そう'); }
      } else if(c.type === 'person'){this.startTalk(c.target);
      } else if(c.type === 'feature') { this.useFeature(c.target);
      } else if(c.type === 'gate') { if(this.keys>0){this.keys--;this.openGate(c.target); } else this.event('キーカードか、同じ番号のスイッチを探そう');
      } else if (c.type === 'staff') {
        this.map.staff.talked = true; this.remaining = Math.max(0, this.remaining - 2);
        this.map.toilets.forEach(t => { t.discovered = true; });
        this.event('案内を聞いた！ ミニマップに全トイレを表示 −2秒', 'info');
        if (this.remaining <= 0) this.finish(false);
      } else if (c.type === 'buddy') {
        this.map.buddy.active = true; this.recruited = true;
        this.remaining = Math.min(this.limit, this.remaining + 3); this.event('「一緒なら大丈夫！」 仲間が同行 +3秒', 'good');
      }
    }
    yieldBuddy() {
      const b = this.map.buddy, t = this.nearDoor();
      if (this.state !== 'playing' || this.paused || !t || !b.active || b.done || b.busy || this.mode === 'relief' || this.mode === 'talk') return;
      b.busy = true; b.target = t; b.finishAt = this.elapsed + (this.toiletStatus(t).open?0:this.toiletStatus(t).left) + b.useDuration;
      t.reservedUntil = b.finishAt; t.priorityUntil=b.finishAt+5; this.door = t; this.mode = 'wait'; this.autoPath = [];
      this.event(`仲間に譲った。「${b.useDuration}秒で出るよ！」 待つか、移動しよう`, 'info');
    }
    enter() {
      this.mode = 'relief'; this.relief = 0; this.autoPath = []; this.autoDoor = null;
      this.player.x = this.door.x; this.player.y = this.door.y; this.event('間に合って…！ あと3秒', 'enter');
    }
    speed(sprint=false, dx=0, dy=0) {
      sprint=sprint&&!this.exhausted&&this.stamina>0;
      let value = sprint ? 6.2 : 4.2;
      if(this.options.practice) value=sprint?5.1:3.2;
      if(this.elapsed < this.boostUntil) value *= 1.45;
      const under=this.map.features.find(f=>!f.used&&distance(this.player,f)<1.2&&['puddle','conveyor','rubble'].includes(f.type));
      if(under?.type==='rubble') value*=.42;
      if(under?.type==='puddle') value*=.6;
      if(under?.type==='conveyor') value*=dx*under.dx+dy*under.dy>0?1.6:.6;
      return value;
    }
    give(type) {
      if(type==='clock') {this.remaining=Math.min(this.limit,this.remaining+12);this.event('ひと息キャンディ！ +12秒','good');}
      if(type==='key') {this.keys++;this.event('キーカードを手に入れた！ 近道を開けよう','good');}
      if(type==='boots') {this.boostUntil=this.elapsed+10;this.event('かけ足シューズ！ 10秒間スピードアップ','good');}
      if(type==='coin') {this.coins++;this.event(`探検メダル ${this.coins}枚目！`,'good');}
    }
    openGate(gate) {
      if(!gate||gate.open)return;
      gate.open=true;gate.tiles.forEach(t=>{this.map.grid[t.y][t.x]=0;});
      this.autoPath=[];this.event(`近道 ${gate.id+1} が開いた！`,'good');
    }
    useFeature(f) {
      if(f.used)return;
      if(f.type==='chest'){f.used=true;this.collected++;this.give(f.reward);}
      if(f.type==='fountain'){f.used=true;this.remaining=Math.min(this.limit,this.remaining+20);this.event('ひと休みで復活！ +20秒','good');}
      if(f.type==='terminal'){f.used=true;this.mapKnown=true;this.seen.fill(1);this.map.toilets.forEach(t=>t.discovered=true);this.map.features.forEach(t=>t.discovered=true);this.event('館内案内図を読んだ！ Mで全体地図を開こう','good');}
      if(f.type==='switch'){f.used=true;this.openGate(this.map.gates[f.gateId]);}
      if(f.type==='warp'){
        if(this.elapsed<this.warpCooldown){this.event('エレベーターは少し待つと再利用できます');return;}
        const target=this.map.features.find(g=>g.id===f.targetId);
        if(target){this.player.x=target.x;this.player.y=target.y;this.warpCooldown=this.elapsed+3;this.autoPath=[];this.autoDoor=null;this.mode='explore';if(this.map.buddy.active){this.map.buddy.x=target.x+1;this.map.buddy.y=target.y;this.map.buddy.path=[];}this.route.push({...this.player,jump:true});this.reveal();this.event(`連絡エレベーター ${f.pair} で移動！`,'good');}
      }
    }
    updateFeatures(dt,moving,input){
      for(const f of this.map.features){
        if(f.cooldown)f.cooldown=Math.max(0,f.cooldown-dt);
        if(f.used||this.mode==='relief'||this.mode==='talk'||distance(this.player,f)>.65)continue;
        if(['clock','boots','key','coin'].includes(f.type)){f.used=true;this.collected++;this.give(f.type);}
        if(f.type==='alarm'&&moving&&input.sprint&&!f.cooldown){f.cooldown=5;this.remaining=Math.max(0,this.remaining-5);this.penalties++;this.event('走行禁止エリア！ 注意されて −5秒','bad');}
        if(f.type==='puddle'&&moving&&input.sprint&&!f.cooldown){f.cooldown=4;this.remaining=Math.max(0,this.remaining-2);this.penalties++;this.event('つるっ！ 濡れた床は歩こう −2秒','bad');}
      }
    }
    serialize(){
      return JSON.stringify({version:3,options:this.options,state:{talk:this.talk,talkGrace:this.talkGrace,talkCount:this.talkCount,talkLost:this.talkLost,stamina:this.stamina,exhausted:this.exhausted,sprintRest:this.sprintRest,remaining:this.remaining,elapsed:this.elapsed,player:this.player,mode:this.mode,relief:this.relief,waited:this.waited,moved:this.moved,penalties:this.penalties,recruited:this.recruited,shared:this.shared,keys:this.keys,coins:this.coins,collected:this.collected,boostUntil:this.boostUntil,warpCooldown:this.warpCooldown,mapKnown:this.mapKnown,seen:Array.from(this.seen),route:this.route,doorId:this.door?.id,map:this.map}});
    }
    static restore(serialized){
      try{
        const data=JSON.parse(serialized),s=data.state,o=data.options;
        if(![2,3].includes(data.version)||!o||!DIFFICULTIES[o.difficulty]||!Number.isFinite(o.seed)||!Number.isInteger(o.theme)||o.theme<0||o.theme>5||!s||!Number.isFinite(s.remaining)||s.remaining<=0||s.remaining>(o.practice?90:DIFFICULTIES[o.difficulty].time)||!Number.isFinite(s.elapsed)||s.elapsed<0||!s.player||!Number.isFinite(s.player.x)||!Number.isFinite(s.player.y)||!['explore','wait','relief','talk'].includes(s.mode))return null;
        const g=new Game(o), expected=g.map;
        if(s.map.w!==expected.w||s.map.h!==expected.h||!Array.isArray(s.seen)||s.seen.length!==g.seen.length||!Array.isArray(s.map.features)||s.map.features.length!==expected.features.length||!Array.isArray(s.map.toilets)||(data.version===3&&s.map.toilets.length!==expected.toilets.length)||!Array.isArray(s.map.gates)||s.map.gates.length!==expected.gates.length)return null;
        // Rebuild immutable geometry. Only restore mutable per-run fields.
        expected.toilets.forEach((t,i)=>{const v=s.map.toilets[i];if(data.version===3){if(Number.isFinite(v.openAt)&&v.openAt>=0)t.openAt=v.openAt;for(const k of ['reservedUntil','priorityUntil'])if(Number.isFinite(v[k])&&v[k]>=0)t[k]=v[k];t.discovered=!!v.discovered;}else t.discovered=!!s.seen[Math.floor(t.y)*expected.w+Math.floor(t.x)];});
        expected.features.forEach((f,i)=>{const old=data.version===3?s.map.features[i]:s.map.features.find(v=>v.type===f.type&&v.x===f.x&&v.y===f.y);f.used=!!old?.used;f.discovered=!!s.seen[Math.floor(f.y)*expected.w+Math.floor(f.x)];f.cooldown=Math.max(0,Number(old?.cooldown)||0);});
        expected.gates.forEach((gate,i)=>{if(s.map.gates[i].open)g.openGate(gate);});
        expected.staff.talked=!!s.map.staff.talked;
        if(Array.isArray(s.map.shoppers)&&s.map.shoppers.length===expected.shoppers.length)expected.shoppers.forEach((n,i)=>{const v=s.map.shoppers[i];if(Number.isFinite(v.x)&&Number.isFinite(v.y)&&floor(expected,Math.floor(v.x),Math.floor(v.y))){n.x=v.x;n.y=v.y;n.cooldown=Math.max(0,Number(v.cooldown)||0);if(Number.isInteger(v.goal)&&expected.nodes[v.goal])n.goal=v.goal;n.path=path(expected,n,expected.nodes[n.goal]).slice(1);}});
        const b=s.map.buddy;if(b&&Number.isFinite(b.x)&&Number.isFinite(b.y)&&floor(expected,Math.floor(b.x),Math.floor(b.y)))Object.assign(expected.buddy,b,{path:[]});
        if(!g.fits(s.player.x,s.player.y))return null;
        for(const k of ['remaining','elapsed','relief','waited','moved','penalties','keys','coins','collected','boostUntil','warpCooldown']){if(!Number.isFinite(s[k])||s[k]<0)return null;g[k]=s[k];}
        g.player={...s.player};g.mode=s.mode;g.recruited=!!s.recruited;g.shared=!!s.shared;g.mapKnown=!!s.mapKnown;
        g.seen=Uint8Array.from(s.seen,v=>v?1:0);g.route=Array.isArray(s.route)?s.route.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)).slice(-15000):[];if(!g.route.length)g.route=[{...g.player}];
        g.door=expected.toilets.find(t=>t.id===s.doorId)||null;if(['wait','relief'].includes(g.mode)&&!g.door){if(data.version===2)g.mode='explore';else return null;}
        if(data.version===3){for(const k of ['talkGrace','talkCount','talkLost','stamina','sprintRest']){if(!Number.isFinite(s[k])||s[k]<0)return null;g[k]=s[k];}if(g.stamina>100)return null;g.exhausted=!!s.exhausted;
          if(g.mode==='talk'){const t=s.talk;if(!t||!NPC_INFO[t.kind]||!Number.isFinite(t.remaining)||t.remaining<=0||!Number.isFinite(t.total)||t.total<t.remaining||t.total>15||!expected.shoppers.some(n=>n.id===t.npcId))return null;g.talk={...t};}
        }else{g.talkGrace=2.5;g.migrated=true;g.mode='explore';g.door=null;g.relief=0;if(expected.buddy.busy){expected.buddy.busy=false;expected.buddy.active=true;expected.buddy.done=false;}}
        g.events=[];g.paused=true;return g;
      }catch(_){return null;}
    }
    setDestination(point) {
      if (this.state !== 'playing' || this.paused || this.mode === 'relief' || this.mode === 'talk') return false;
      const x = Math.floor(point.x), y = Math.floor(point.y);
      if (!this.seen[y * this.map.w + x]) return false;
      const route = path(this.map, this.player, point, this.seen);
      if (!route.length) return false;
      this.mode = 'explore'; this.autoPath = route.slice(1);
      this.autoDoor = this.map.toilets.find(t => Math.floor(t.x) === x && Math.floor(t.y) === y) || null;
      return true;
    }
    fits(x, y) {
      const r = .22;
      return [[-r, -r], [r, -r], [-r, r], [r, r]].every(([dx, dy]) => floor(this.map, Math.floor(x + dx), Math.floor(y + dy)));
    }
    move(dx, dy) {
      const p = this.player, ox = p.x, oy = p.y;
      if (this.fits(p.x + dx, p.y)) p.x += dx;
      if (this.fits(p.x, p.y + dy)) p.y += dy;
      const d = Math.hypot(p.x - ox, p.y - oy);
      this.moved += d; p.walk += d * 3; if (Math.abs(dx) > .001) p.facing = Math.sign(dx);
      if (d > 0 && distance(p, this.route[this.route.length - 1]) > .5) this.route.push({ x: p.x, y: p.y });
      return d;
    }
    finish(won) {
      if (this.state !== 'playing') return;
      this.state = won ? 'won' : 'lost'; this.remaining = Math.max(0, this.remaining); this.autoPath = [];
      this.title = !won ? 'あと少しだった…' : this.shared ? '誰も置いていかない' : this.remaining < 2 ? '残り1秒の奇跡' : this.waited >= 4 ? '待った甲斐があった' : this.penalties === 0 ? 'スマートな生還' : '無事に到着！';
      this.event(won ? '間に合った！' : 'タイムアップ…', won ? 'win' : 'lose');
    }
    update(dt, input = {}) {
      if (this.paused || this.state !== 'playing') return;
      // Split long frames; collisions and the three-second finish remain consistent.
      const steps = Math.ceil(Math.max(0, dt) / .04);
      for (let i = 0; i < steps && this.state === 'playing'; i++) this.step(dt / steps, input);
    }
    step(dt, input) {
      let dx = Number(input.x) || 0, dy = Number(input.y) || 0, moving = false;
      const sprint=!!input.sprint&&!this.exhausted&&this.stamina>0;
      this.talkGrace=Math.max(0,this.talkGrace-dt);
      if (this.mode !== 'relief' && this.mode !== 'talk') {
        if (dx || dy) { this.autoPath = []; this.autoDoor = null; this.mode = 'explore'; }
        else if (this.autoPath.length) {
          const target = this.autoPath[0]; const d = distance(this.player, target);
          if (d < .08) { this.autoPath.shift(); }
          else { dx = (target.x - this.player.x) / d; dy = (target.y - this.player.y) / d; }
        }
        if (dx || dy) {
          const norm = Math.hypot(dx, dy), speed = this.speed(sprint, dx, dy);
          let stride = speed * dt;
          if (this.autoPath.length) stride = Math.min(stride, distance(this.player, this.autoPath[0]));
          moving = this.move(dx / norm * stride, dy / norm * stride) > .0001;
        }
        if (this.autoDoor && this.autoPath.length === 0 && distance(this.player, this.autoDoor) < 1.45) this.interact();
      }
      const rate = moving && sprint ? 1.35 : 1;
      // Resolve at the exact countdown boundary; a simultaneous 3s finish wins.
      const active = Math.min(dt, this.remaining / rate);
      this.elapsed += active; this.remaining = Math.max(0, this.remaining - active * rate);
      if (this.mode === 'relief') { this.relief += active; if (this.relief >= 3 - 1e-7) { this.finish(true); return; } }
      if(moving&&sprint&&!this.options.practice){this.stamina=Math.max(0,this.stamina-active*24);this.sprintRest=.7;if(this.stamina<=0){this.exhausted=true;this.event('息切れ！ 歩きながら息を整えよう','bad');}}
      else{this.sprintRest=Math.max(0,this.sprintRest-active);if(!this.sprintRest)this.stamina=Math.min(100,this.stamina+active*15);if(this.exhausted&&this.stamina>=35)this.exhausted=false;}
      if(this.mode==='talk'){
        const spent=Math.min(active,this.talk.remaining);this.talk.remaining-=spent;this.talkLost+=spent;
        if(this.talk.remaining<=1e-7){this.talk=null;this.mode='explore';this.talkGrace=2.5;this.event('やっと話が終わった！ 今のうちに離れよう','good');}
      }
      this.updateFeatures(dt, moving, {...input,sprint});
      const b = this.map.buddy;
      if (b.busy && this.elapsed >= b.finishAt) { b.busy = false; b.done = true; b.active = false; this.shared = true; this.event('仲間も間に合った！ 次はあなたの番', 'good'); }
      if (this.mode === 'wait') { this.waited += active; if (this.toiletStatus(this.door).open && this.remaining > 0) this.enter(); }
      if (this.remaining <= 0) { this.finish(false); return; }
      for (const n of this.map.shoppers) {
        n.cooldown = Math.max(0, n.cooldown - dt);
        if(this.mode==='talk'&&this.talk.npcId===n.id)continue;
        if (!n.path.length) { n.goal = (n.goal + 7) % this.map.nodes.length; n.path = path(this.map, n, this.map.nodes[n.goal]).slice(1); }
        if (n.path.length) { const target = n.path[0], d = distance(n, target), amount = Math.min(d, dt * n.speed); if (d < .03) n.path.shift(); else { n.x += (target.x - n.x) / d * amount; n.y += (target.y - n.y) / d * amount; } }
        if (distance(n,this.player)<.68&&n.cooldown<=0&&this.mode!=='relief'&&this.mode!=='talk')this.startTalk(n,moving&&sprint);
      }
      if (b.active && !b.busy && this.mode !== 'relief') {
        this.buddyCheck -= dt;
        if (this.buddyCheck <= 0) { b.path = path(this.map, b, this.player).slice(1); this.buddyCheck = .65; }
        if (distance(b, this.player) > .85 && b.path.length) { const target = b.path[0], d = distance(b, target); if (d < .05) b.path.shift(); else { const m = Math.min(dt * 7.5, d); b.x += (target.x - b.x) / d * m; b.y += (target.y - b.y) / d * m; } }
      }
      this.reveal();
      if (this.remaining <= 0) this.finish(false);
    }
  }
  return { Game, generate, path, distances, floor, rng, distance, DIFFICULTIES, THEMES, STAGES, FEATURE_INFO, NPC_INFO };
});
