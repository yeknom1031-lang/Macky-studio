(function (root) {
  'use strict';
  const UNITS = [
    { id: 0, name: 'ぽよスライム', role: 'すばやい前衛', description: 'ぽよんと登場、すいすい行進。少ない魔力で何度でも仲間を守る。', cost: 60, hp: 210, atk: 24, speed: 44, range: 23, rate: 1, cooldown: 2, size: 65, color: '#74b6ca' },
    { id: 1, name: 'キノコナイト', role: '頼れる盾役', description: '小さな木の盾に、大きな勇気。前線を長く支えてくれる森の騎士。', cost: 120, hp: 510, atk: 43, speed: 29, range: 26, rate: 1.25, cooldown: 4, size: 87, color: '#db8770' },
    { id: 2, name: 'ほわりゴースト', role: '遠距離アタッカー', description: 'ふわふわ浮かんで、遠くへ魔法。前衛の後ろからそっとお手伝い。', cost: 180, hp: 175, atk: 75, speed: 31, range: 185, rate: 1.7, cooldown: 6, size: 81, color: '#aa9ccf' },
    { id: 3, name: 'おひるねドラゴン', role: '範囲アタッカー', description: '普段はすやすや。目を覚ませば、やさしい炎が敵をまとめて包む。', cost: 320, hp: 640, atk: 102, speed: 22, range: 100, rate: 2.5, cooldown: 10, size: 118, color: '#8eac7f', area: 115 },
    { id: 4, name: 'めばえひつじ', role: '回復サポーター', description: 'もこもこの毛に命のしずく。近くの仲間の体力を少しずつ回復する。', cost: 200, hp: 290, atk: 17, speed: 26, range: 125, rate: 2, cooldown: 7, size: 84, color: '#d3ba86', heal: 48 },
    { id: 5, name: 'こけゴーレム', role: '重装の壁役', description: '頭のお花が自慢の力持ち。ゆっくりでも、押されても、仲間の盾に。', cost: 260, hp: 1250, atk: 60, speed: 17, range: 35, rate: 2, cooldown: 9, size: 108, color: '#9b9e83' },
    { id: 6, name: 'もみじキツネ', role: '俊足アタッカー', description: '風より速く駆ける森の旅人。すばやい連続攻撃で前線に飛び込む。', cost: 155, hp: 300, atk: 48, speed: 70, range: 28, rate: 0.7, cooldown: 5, size: 80, color: '#d49c60' },
    { id: 7, name: '星よみウィッチ', role: '遠距離・範囲魔法', description: '夜空の星をひとつまみ。遠くから降らせる星くずは敵をまとめて攻撃。', cost: 380, hp: 265, atk: 115, speed: 24, range: 220, rate: 2.7, cooldown: 12, size: 96, color: '#a691c4', area: 120 }
  ];
  const ENEMIES = [
    { id: 8, name: 'くろもこ', hp: 145, atk: 18, speed: 34, range: 23, rate: 1.35, size: 62, bounty: 19 },
    { id: 9, name: 'よるコウモリ', hp: 110, atk: 25, speed: 58, range: 38, rate: 1.2, size: 77, bounty: 24 },
    { id: 10, name: 'かげぼうし', hp: 200, atk: 42, speed: 24, range: 150, rate: 1.9, size: 84, bounty: 33 },
    { id: 11, name: 'キノコの王さま', hp: 1750, atk: 92, speed: 17, range: 85, rate: 2.2, size: 145, bounty: 150, area: 100 }
  ];
  const CHAPTERS = [
    { name: 'はじまりの森', sub: '木漏れ日に誘われて', image: 'meadow', icon: '01', color: '#748c62' },
    { name: '月あかりの湖', sub: '星のかけらを探しに', image: 'night', icon: '02', color: '#8685ae' },
    { name: '夕やけの丘', sub: '明日につながる冒険', image: 'sunset', icon: '03', color: '#c89068' }
  ];
  const stageNames = ['旅立ちの小道', '花咲く草原', '風の石橋', '森のおうさま', 'ほたるの入り江', 'ねむるキノコ林', '星くずの水辺', '月夜のいたずら', 'もみじの散歩道', '黄金色の谷', '夕空の境界', 'さいごの大行進'];
  const STAGES = stageNames.map((name, id) => ({ id, name, chapter: Math.floor(id / 4), number: `${Math.floor(id / 4) + 1}-${id % 4 + 1}`, boss: id % 4 === 3, baseHp: 1250 + id * 230, reward: 200 + id * 45 }));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const integer = (v, d, min, max) => Number.isFinite(v) ? clamp(Math.floor(v), min, max) : d;
  function freshSave() { return { version: 1, leaves: 1200, gems: 80, levels: Array(8).fill(1), owned: [0, 1, 2, 3, 4, 5], team: [0, 1, 2, 3, 4, 5], stars: Array(12).fill(0), cleared: 0, sound: true, lastStage: 0, summons: 0 }; }
  function normalizeSave(value) {
    const s = freshSave();
    if (!value || value.version !== 1) return s;
    s.leaves = integer(value.leaves, s.leaves, 0, 99999999);
    s.gems = integer(value.gems, s.gems, 0, 999999);
    s.levels = s.levels.map((_, i) => integer(value.levels?.[i], 1, 1, 20));
    s.owned = [...new Set([0, 1, 2, 3, 4, 5, ...(Array.isArray(value.owned) ? value.owned.filter(id => Number.isInteger(id) && id >= 0 && id < 8) : [])])];
    s.team = [...new Set((Array.isArray(value.team) ? value.team : []).filter(id => s.owned.includes(id)))].slice(0, 6);
    for (const id of s.owned) if (s.team.length < 6 && !s.team.includes(id)) s.team.push(id);
    s.stars = s.stars.map((_, i) => integer(value.stars?.[i], 0, 0, 3));
    s.cleared = 0;
    while (s.cleared < 12 && s.stars[s.cleared] > 0) s.cleared++;
    s.lastStage = integer(value.lastStage, 0, 0, Math.min(s.cleared, 11));
    s.sound = value.sound !== false;
    s.summons = integer(value.summons, 0, 0, 999999);
    return s;
  }
  function stats(id, level = 1) { const u = UNITS[id]; const m = 1 + (clamp(level, 1, 20) - 1) * 0.13; return { ...u, hp: Math.round(u.hp * m), atk: Math.round(u.atk * m), heal: u.heal ? Math.round(u.heal * m) : 0 }; }
  function upgradeCost(level) { return Math.round(90 * Math.pow(1.24, level - 1)); }
  function upgrade(save, id) {
    if (!save.owned.includes(id) || save.levels[id] >= 20) return false;
    const cost = upgradeCost(save.levels[id]);
    if (save.leaves < cost) return false;
    save.leaves -= cost; save.levels[id]++; return true;
  }
  function summon(save, rng = Math.random) {
    if (save.gems < 20) return null;
    save.gems -= 20; save.summons++;
    const locked = UNITS.filter(u => !save.owned.includes(u.id));
    const guaranteed = save.summons % 4 === 0 && locked.length;
    const id = guaranteed ? locked[Math.floor(rng() * locked.length)].id : Math.min(7, Math.floor(rng() * 8));
    const isNew = !save.owned.includes(id);
    if (isNew) save.owned.push(id); else save.leaves += 180;
    return { id, isNew, gift: isNew ? 0 : 180 };
  }
  function randomSeed(seed) { let a = seed >>> 0; return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  class Battle {
    constructor(stageId, save, seed = Date.now()) {
      this.stage = STAGES[clamp(stageId, 0, 11)]; this.team = [...save.team]; this.levels = [...save.levels];
      this.rng = randomSeed(seed); this.time = 0; this.money = 220; this.wallet = 1; this.maxMoney = 700; this.income = 30;
      this.maxHp = 2300; this.hp = this.maxHp; this.enemyMaxHp = this.stage.baseHp; this.enemyHp = this.enemyMaxHp;
      this.units = []; this.particles = []; this.events = []; this.cooldowns = Array(8).fill(0); this.cannon = 13;
      this.nextWave = 5; this.wave = 0; this.kills = 0; this.deployed = 0; this.bossSpawned = false;
      this.result = null; this.claimed = false; this.uid = 0; this.assistChoice = 0;
    }
    emit(type, data = {}) { this.events.push({ type, ...data }); if (this.events.length > 80) this.events.shift(); }
    drainEvents() { const a = this.events; this.events = []; return a; }
    canDeploy(id) { return !this.result && this.team.includes(id) && this.money >= UNITS[id].cost && this.cooldowns[id] <= 0 && this.units.filter(u => u.side === 1).length < 36; }
    deploy(id) {
      if (!this.canDeploy(id)) return false;
      const s = stats(id, this.levels[id]); this.money -= s.cost; this.cooldowns[id] = s.cooldown;
      this.units.push({ ...s, uid: ++this.uid, side: 1, x: 145, y: this.rng() * 20 - 10, maxHp: s.hp, attackTimer: 0.25, healTimer: 1, hurt: 0, action: 0, phase: this.rng() * 6.28, moving: true });
      this.deployed++; this.emit('deploy', { id }); return true;
    }
    upgradePrice() { return 130 + (this.wallet - 1) * 130; }
    upgradeWallet() {
      if (this.result || this.wallet >= 5 || this.money < this.upgradePrice()) return false;
      this.money -= this.upgradePrice(); this.wallet++; this.income = 30 + (this.wallet - 1) * 12; this.maxMoney = 700 + (this.wallet - 1) * 350;
      this.emit('wallet'); return true;
    }
    assist() {
      if (this.result) return;
      const allies = this.units.filter(u => u.side === 1);
      if (this.cannon >= 30 && this.units.some(u => u.side < 0)) this.fire();
      if (this.wallet < 3 && this.time > 12 && allies.length >= 3) {
        if (this.money >= this.upgradePrice()) { this.upgradeWallet(); return; }
        if (allies.length >= 5) return;
      }
      const cycle = [1, 2, 0, 3, 1, 5, 2, 4, 6, 7].filter(id => this.team.includes(id));
      let id = cycle[this.assistChoice % cycle.length];
      if (id === 4 && allies.some(u => u.id === 4)) { this.assistChoice++; id = cycle[this.assistChoice % cycle.length]; }
      if (this.deploy(id)) this.assistChoice++;
      else if (allies.length < 2 || this.units.some(u => u.side === -1 && u.x < 400)) {
        for (const tank of [1, 0, 5]) if (this.deploy(tank)) break;
      }
    }
    fire() {
      if (this.result || this.cannon < 30) return false;
      this.cannon = 0;
      for (const u of this.units.filter(u => u.side === -1)) { this.damage(u, 220 + this.stage.id * 7); u.x = Math.min(1270, u.x + 65); }
      this.enemyHp = Math.max(0, this.enemyHp - 70); this.emit('cannon'); this.checkEnd(); return true;
    }
    enemy(id) {
      if (this.units.filter(u => u.side === -1).length >= 25) return;
      const e = ENEMIES.find(u => u.id === id); const m = 1 + this.stage.id * 0.135;
      const hp = Math.round(e.hp * m); const atk = Math.round(e.atk * (1 + this.stage.id * 0.085));
      this.units.push({ ...e, uid: ++this.uid, side: -1, x: 1275, y: this.rng() * 20 - 10, hp, maxHp: hp, atk, attackTimer: 0.7, healTimer: 0, hurt: 0, action: 0, phase: this.rng() * 6.28, moving: true });
      if (id === 11) this.emit('boss');
    }
    damage(unit, amount) { if (unit.hp <= 0) return; unit.hp -= amount; unit.hurt = 0.16; this.emit('hit', { x: unit.x, y: unit.y, amount, side: unit.side }); }
    step(dt) {
      if (this.result) return;
      dt = clamp(dt, 0, 0.1); this.time += dt; this.money = Math.min(this.maxMoney, this.money + this.income * dt);
      this.cannon = Math.min(30, this.cannon + dt); this.cooldowns = this.cooldowns.map(n => Math.max(0, n - dt));
      this.nextWave -= dt;
      if (this.nextWave <= 0) {
        this.wave++; this.enemy(this.stage.id >= 1 && this.rng() < 0.32 ? 9 : 8);
        if (this.stage.id >= 2 && this.wave % 3 === 0) this.enemy(10);
        if (this.time > 45 || this.stage.id >= 6) this.enemy(this.rng() < 0.45 ? 9 : 8);
        this.nextWave = Math.max(3.4, 10.5 - this.stage.id * 0.36 - this.time * 0.018) + this.rng() * 1.4;
      }
      if (this.stage.boss && !this.bossSpawned && (this.time > 48 || this.enemyHp < this.enemyMaxHp * 0.6)) { this.bossSpawned = true; this.enemy(11); }
      for (const u of this.units) {
        if (u.hp <= 0) continue;
        u.attackTimer -= dt; u.hurt = Math.max(0, u.hurt - dt); u.action = Math.max(0, u.action - dt);
        if (u.heal) {
          u.healTimer -= dt;
          if (u.healTimer <= 0) {
            const patients = this.units.filter(p => p.side === u.side && p.hp > 0 && p.hp < p.maxHp && Math.abs(p.x - u.x) < 210);
            if (patients.length) { for (const p of patients) p.hp = Math.min(p.maxHp, p.hp + u.heal); this.emit('heal', { x: u.x }); u.action = 0.35; }
            u.healTimer = 2.8;
          }
        }
        let target = null; let dist = Infinity;
        for (const other of this.units) {
          if (other.side === u.side || other.hp <= 0) continue;
          const d = (other.x - u.x) * u.side;
          if (d >= -45 && d < dist) { target = other; dist = d; }
        }
        const baseX = u.side === 1 ? 1300 : 125;
        const atBase = Math.abs(baseX - u.x) <= u.range + 40;
        const inRange = target && dist <= u.range + (u.size + target.size) * 0.2;
        u.moving = !inRange && !atBase;
        if (u.moving) u.x += u.side * u.speed * dt;
        else if (u.attackTimer <= 0) {
          u.action = 0.27; u.attackTimer = u.rate;
          if (inRange) {
            if (u.area) for (const v of this.units.filter(v => v.side !== u.side && v.hp > 0 && Math.abs(v.x - target.x) <= u.area)) this.damage(v, u.atk);
            else this.damage(target, u.atk);
            if (u.range > 90) this.emit('projectile', { from: u.x, to: target.x, side: u.side, color: u.heal ? '#a5cc82' : '#cbb1e0' });
          } else if (u.side === 1) { this.enemyHp = Math.max(0, this.enemyHp - u.atk); this.emit('baseHit', { side: -1 }); }
          else { this.hp = Math.max(0, this.hp - u.atk); this.emit('baseHit', { side: 1 }); }
        }
      }
      for (const dead of this.units.filter(u => u.hp <= 0)) { if (dead.side === -1) { this.kills++; this.money = Math.min(this.maxMoney, this.money + dead.bounty); } this.emit('poof', { x: dead.x, side: dead.side }); }
      this.units = this.units.filter(u => u.hp > 0); this.checkEnd();
    }
    checkEnd() {
      if (this.result) return;
      if (this.hp <= 0 || this.time >= 300) this.result = 'defeat';
      else if (this.enemyHp <= 0) this.result = 'victory';
      if (this.result) this.emit(this.result);
    }
    claim(save) {
      if (!this.result || this.claimed) return null;
      this.claimed = true;
      const win = this.result === 'victory'; const first = win && save.stars[this.stage.id] === 0;
      const stars = win ? (this.hp / this.maxHp >= 0.7 ? 3 : this.hp / this.maxHp >= 0.35 ? 2 : 1) : 0;
      const leaves = win ? this.stage.reward + (first ? 150 : 0) : 35;
      const gems = first ? 20 : 0; save.leaves += leaves; save.gems += gems;
      let unlocked = null;
      if (win) {
        save.stars[this.stage.id] = Math.max(stars, save.stars[this.stage.id]);
        while (save.cleared < 12 && save.stars[save.cleared] > 0) save.cleared++;
        if ([3, 7].includes(this.stage.id)) { const id = this.stage.id === 3 ? 6 : 7; if (!save.owned.includes(id)) { save.owned.push(id); unlocked = id; } }
      }
      return { win, first, stars, leaves, gems, unlocked, time: this.time, kills: this.kills };
    }
  }
  const api = { UNITS, ENEMIES, CHAPTERS, STAGES, freshSave, normalizeSave, stats, upgradeCost, upgrade, summon, randomSeed, Battle, clamp };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Yurumon = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
