/* Deterministic game rules, shared by the browser and Node's test runner. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ToiletCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DIFFICULTIES = {
    easy: { label: 'EASY', time: 90, cols: 5, rows: 4 },
    normal: { label: 'NORMAL', time: 60, cols: 6, rows: 4 },
    hard: { label: 'HARD', time: 30, cols: 5, rows: 3 }
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
  function path(map, start, goal, allowed) {
    const sx = Math.floor(start.x), sy = Math.floor(start.y), gx = Math.floor(goal.x), gy = Math.floor(goal.y);
    if (!floor(map, sx, sy) || !floor(map, gx, gy)) return [];
    const queue = [[sx, sy]], parents = new Map([[key(sx, sy), null]]);
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i];
      if (x === gx && y === gy) {
        const out = []; let p = [x, y];
        while (p) { out.push({ x: p[0] + .5, y: p[1] + .5 }); p = parents.get(key(...p)); }
        return out.reverse();
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = key(nx, ny);
        if (floor(map, nx, ny) && !parents.has(k) && (!allowed || allowed[ny * map.w + nx])) { parents.set(k, [x, y]); queue.push([nx, ny]); }
      }
    }
    return [];
  }
  function generate(seed, difficulty = 'normal', theme = 0, practice = false) {
    const random = rng(seed), cfg = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
    const cols = practice ? 3 : cfg.cols, rows = practice ? 2 : cfg.rows;
    const w = cols * 5 + 2, h = rows * 5 + 2;
    const grid = Array.from({ length: h }, () => Array(w).fill(1));
    const nodes = Array.from({ length: cols * rows }, (_, i) => ({ x: 3 + (i % cols) * 5, y: 3 + Math.floor(i / cols) * 5, id: i }));
    const carve = (x, y) => { for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) grid[yy][xx] = 0; };
    nodes.forEach(n => carve(n.x, n.y));
    const neighbors = id => [id % cols > 0 ? id - 1 : -1, id % cols < cols - 1 ? id + 1 : -1, id >= cols ? id - cols : -1, id < cols * (rows - 1) ? id + cols : -1].filter(i => i >= 0);
    const link = (a, b) => {
      let { x, y } = nodes[a]; const end = nodes[b];
      while (x !== end.x || y !== end.y) { carve(x, y); x += Math.sign(end.x - x); y += Math.sign(end.y - y); }
      carve(x, y);
    };
    const visited = new Set([0]), stack = [0];
    while (stack.length) {
      const a = stack[stack.length - 1], options = neighbors(a).filter(b => !visited.has(b));
      if (!options.length) { stack.pop(); continue; }
      const b = options[Math.floor(random() * options.length)]; link(a, b); visited.add(b); stack.push(b);
    }
    nodes.forEach(n => neighbors(n.id).forEach(b => { if (b > n.id && random() < .16) link(n.id, b); }));
    const startNode = nodes[Math.floor(rows / 2) * cols + Math.floor(cols / 2)];
    const start = { x: startNode.x + .5, y: startNode.y + .5 };
    const map = { w, h, grid, nodes, start, theme: THEMES[theme % THEMES.length], seed, difficulty };
    const candidates = nodes.filter(n => n.id !== startNode.id).map(n => ({ ...n, steps: path(map, start, { x: n.x + .5, y: n.y + .5 }).length - 1 })).sort((a, b) => a.steps - b.steps);
    const picked = [];
    const targets = practice ? [5, 12, 18] : [12, 24, 36, 48];
    for (const target of targets) {
      const choices = candidates.filter(n => !picked.includes(n)).sort((a, b) => Math.abs(a.steps - target) - Math.abs(b.steps - target));
      if (choices[0]) picked.push(choices[0]);
    }
    map.toilets = picked.map((n, i) => ({ id: i, x: n.x + .5, y: n.y - .5, openAt: i === 0 ? (practice ? 6 : 18 + random() * (difficulty === 'hard' ? 5 : 18)) : (i === 1 ? 0 : 4 + random() * 22), discovered: false, initial: true }));
    // Guarantee at least one reachable opening with enough time for the 3s finish.
    const safe = map.toilets[1] || map.toilets[0];
    const maxSteps = path(map, start, safe).length - 1;
    if (maxSteps / 3.2 + 7 >= cfg.time) { safe.x = picked[0].x + .5; safe.y = picked[0].y + .5; }
    safe.openAt = 0;
    map.safeId = safe.id;
    const toiletKeys = new Set(map.toilets.map(t => key(Math.floor(t.x), Math.floor(t.y))));
    const spare = nodes.filter(n => n.id !== startNode.id && !toiletKeys.has(key(n.x, n.y - 1)));
    const staffNode = spare[Math.floor(random() * spare.length)] || nodes[0];
    map.staff = { x: staffNode.x + .5, y: staffNode.y + .5, talked: false };
    map.buddy = { x: start.x + 1.1, y: start.y, active: false, done: false, busy: false, useDuration: 4 + Math.floor(random() * 4), path: [] };
    map.shoppers = Array.from({ length: practice ? 0 : 2 + (seed % 3) }, (_, i) => {
      const n = spare[(i * 7 + Math.floor(random() * spare.length)) % spare.length] || nodes[0];
      const goal = nodes[(n.id + 3) % nodes.length];
      return { x: n.x + .5, y: n.y + .5, path: path(map, { x: n.x, y: n.y }, goal), goal: goal.id, speed: .65 + random() * .4, cooldown: 0, bag: i % 2 === 0 };
    });
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
      this.autoPath = []; this.autoDoor = null; this.buddyCheck = 0; this.reveal();
    }
    event(text, kind = 'info') { this.events.push({ text, kind, at: this.elapsed }); if (this.events.length > 10) this.events.shift(); }
    reveal() {
      const { x, y } = this.player, m = this.map, radius = this.options.difficulty === 'easy' || this.options.practice ? 9 : (this.options.difficulty === 'hard' ? 6 : 7);
      for (let yy = Math.max(0, Math.floor(y) - radius); yy < Math.min(m.h, y + radius); yy++) for (let xx = Math.max(0, Math.floor(x) - radius); xx < Math.min(m.w, x + radius); xx++) if (Math.hypot(xx + .5 - x, yy + .5 - y) <= radius) this.seen[yy * m.w + xx] = 1;
      m.toilets.forEach(t => { if (!t.discovered && this.seen[Math.floor(t.y) * m.w + Math.floor(t.x)]) { t.discovered = true; this.event('トイレを発見！ 近づいて E', 'discover'); } });
    }
    nearDoor() { return this.map.toilets.find(t => distance(this.player, t) < 1.45); }
    context() {
      if (this.mode === 'relief') return { type: 'relief', label: 'あと少し…', hint: '3秒間でクリア' };
      const t = this.nearDoor();
      if (t) return { type: 'door', target: t, label: this.elapsed >= t.openAt ? 'トイレに入る' : (this.mode === 'wait' ? '待機をやめる' : 'ここで待つ'), hint: this.clue(t) };
      if (distance(this.player, this.map.staff) < 1.7 && !this.map.staff.talked) return { type: 'staff', label: '案内を聞く', hint: '2秒使って、全トイレの場所が分かる' };
      const b = this.map.buddy;
      if (distance(this.player, b) < 1.6 && !b.active && !b.done) return { type: 'buddy', label: '仲間を誘う', hint: '一緒に探そう！ 励ましで +3秒' };
      return null;
    }
    clue(t) {
      const left = t.openAt - this.elapsed;
      if (left <= 0) return '空いている！ 入ってから3秒でクリア';
      if (left < 4) return 'ジャー… 水を流す音！';
      if (left < 9) return 'ガサゴソ… 荷物をまとめている';
      if (left < 15) return '「あとちょっと！」';
      return '♪ 動画の音… 長くなりそう';
    }
    interact() {
      if (this.state !== 'playing' || this.paused || this.mode === 'relief') return;
      const c = this.context(); if (!c) return;
      this.autoPath = []; this.autoDoor = null;
      if (c.type === 'door') {
        this.door = c.target;
        if (this.elapsed >= this.door.openAt) this.enter();
        else { this.mode = this.mode === 'wait' ? 'explore' : 'wait'; this.event(this.mode === 'wait' ? '耳をすまして待機中。移動で中断できます' : '別のトイレを探そう'); }
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
      if (this.state !== 'playing' || this.paused || !t || !b.active || b.done || b.busy || this.mode === 'relief') return;
      b.busy = true; b.target = t; b.finishAt = Math.max(t.openAt, this.elapsed) + b.useDuration;
      t.openAt = b.finishAt; this.door = t; this.mode = 'wait'; this.autoPath = [];
      this.event(`仲間に譲った。「${b.useDuration}秒で出るよ！」 待つか、移動しよう`, 'info');
    }
    enter() {
      this.mode = 'relief'; this.relief = 0; this.autoPath = []; this.autoDoor = null;
      this.player.x = this.door.x; this.player.y = this.door.y; this.event('間に合って…！ あと3秒', 'enter');
    }
    setDestination(point) {
      if (this.state !== 'playing' || this.paused || this.mode === 'relief') return false;
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
      if (this.mode !== 'relief') {
        if (dx || dy) { this.autoPath = []; this.autoDoor = null; this.mode = 'explore'; }
        else if (this.autoPath.length) {
          const target = this.autoPath[0]; const d = distance(this.player, target);
          if (d < .08) { this.autoPath.shift(); }
          else { dx = (target.x - this.player.x) / d; dy = (target.y - this.player.y) / d; }
        }
        if (dx || dy) {
          const norm = Math.hypot(dx, dy), speed = input.sprint ? 5.1 : 3.2;
          let stride = speed * dt;
          if (this.autoPath.length) stride = Math.min(stride, distance(this.player, this.autoPath[0]));
          moving = this.move(dx / norm * stride, dy / norm * stride) > .0001;
        }
        if (this.autoDoor && this.autoPath.length === 0 && distance(this.player, this.autoDoor) < 1.45) this.interact();
      }
      const rate = moving && input.sprint ? 1.35 : 1;
      // Resolve at the exact countdown boundary; a simultaneous 3s finish wins.
      const active = Math.min(dt, this.remaining / rate);
      this.elapsed += active; this.remaining = Math.max(0, this.remaining - active * rate);
      if (this.mode === 'relief') { this.relief += active; if (this.relief >= 3 - 1e-7) { this.finish(true); return; } }
      const b = this.map.buddy;
      if (b.busy && this.elapsed >= b.finishAt) { b.busy = false; b.done = true; b.active = false; this.shared = true; this.event('仲間も間に合った！ 次はあなたの番', 'good'); }
      if (this.mode === 'wait') { this.waited += active; if (this.elapsed >= this.door.openAt && this.remaining > 0) this.enter(); }
      if (this.remaining <= 0) { this.finish(false); return; }
      for (const n of this.map.shoppers) {
        n.cooldown = Math.max(0, n.cooldown - dt);
        if (!n.path.length) { n.goal = (n.goal + 7) % this.map.nodes.length; n.path = path(this.map, n, this.map.nodes[n.goal]).slice(1); }
        if (n.path.length) { const target = n.path[0], d = distance(n, target), amount = Math.min(d, dt * n.speed); if (d < .03) n.path.shift(); else { n.x += (target.x - n.x) / d * amount; n.y += (target.y - n.y) / d * amount; } }
        if (moving && input.sprint && distance(n, this.player) < .65 && n.cooldown <= 0 && this.mode !== 'relief') { n.cooldown = 6; this.remaining = Math.max(0, this.remaining - 2); this.penalties++; this.event('ぶつかって焦った！ −2秒', 'bad'); }
      }
      if (b.active && !b.busy && this.mode !== 'relief') {
        this.buddyCheck -= dt;
        if (this.buddyCheck <= 0) { b.path = path(this.map, b, this.player).slice(1); this.buddyCheck = .45; }
        if (distance(b, this.player) > .85 && b.path.length) { const target = b.path[0], d = distance(b, target); if (d < .05) b.path.shift(); else { const m = Math.min(dt * 4.8, d); b.x += (target.x - b.x) / d * m; b.y += (target.y - b.y) / d * m; } }
      }
      this.reveal();
      if (this.remaining <= 0) this.finish(false);
    }
  }
  return { Game, generate, path, floor, rng, distance, DIFFICULTIES, THEMES, STAGES };
});
