import {
  VERSION,
  DAY_SECONDS,
  ISLANDS,
  SPECIES,
  ITEMS,
  RECIPES,
  BUILDINGS,
  QUESTS,
  clamp,
  dist,
  rng,
  islandAt,
  heightAt,
} from "./data.js";

export function makeWorld() {
  const random = rng(7324),
    decor = [],
    resources = [],
    wild = [];
  ISLANDS.forEach((i) => {
    for (let n = 0; n < 110; n++) {
      const a = random() * Math.PI * 2,
        r = 7 + random() * (i.r - 12),
        x = i.x + Math.cos(a) * r,
        z = i.z + Math.sin(a) * r;
      const encounters = [
        [8, 4],
        [-19, 8],
        [-15, -8],
        [21, -10],
        [-5, -23],
        [110, -15],
        [146, -18],
        [137, 0],
        [125, -32],
        [197, -114],
        [232, -106],
        [214, -129],
      ];
      if (
        Math.hypot(x - i.spawn[0], z - i.spawn[1]) < 8 ||
        (Math.abs(x - i.x) < 3.5 && z > i.z - 22 && z < i.z + 30) ||
        encounters.some(([ex, ez]) => Math.hypot(x - ex, z - ez) < 6.5) ||
        (i.id === 2 && Math.hypot(x - i.x, z - i.z + 9) < 14)
      )
        continue;
      const tree = n % 3 !== 0,
        scale = tree ? 3.5 + random() * 2 : 1 + random() * 1.8;
      decor.push({
        id: `d${i.id}-${n}`,
        island: i.id,
        x,
        z,
        kind: tree ? "tree" : "rock",
        variant: n % 3,
        scale,
        angle: random() * 6.28,
        radius: tree ? 0.65 : scale * 0.5,
      });
    }
    for (let n = 0; n < 30; n++) {
      const a = random() * 6.28,
        r = 6 + random() * (i.r - 12),
        x = i.x + Math.cos(a) * r,
        z = i.z + Math.sin(a) * r;
      const kinds =
        i.id === 0
          ? ["wood", "stone", "fiber", "berry"]
          : ["wood", "stone", "fiber", "berry", "crystal"];
      resources.push({
        id: `r${i.id}-${n}`,
        island: i.id,
        x,
        z,
        kind: kinds[n % kinds.length],
      });
    }
  });
  [
    ["wood", -3, 26],
    ["stone", 4, 26],
    ["fiber", -4, 20],
    ["berry", 6, 21],
    ["wood", -8, 28],
    ["fiber", 5, 29],
    ["stone", 9, 24],
    ["berry", -8, 18],
  ].forEach(([kind, x, z], n) =>
    resources.push({ id: `start${n}`, island: 0, x, z, kind }),
  );
  const add = (id, type, x, z, island) => wild.push({ id, type, x, z, island });
  add("fox1", "ember", 8, 4, 0);
  add("fox2", "ember", -19, 8, 0);
  add("bull1", "moss", -15, -8, 0);
  add("stag1", "leaf", 21, -10, 0);
  add("wolf0", "night", -5, -23, 0);
  add("wolf1", "night", 110, -15, 1);
  add("wolf2", "night", 146, -18, 1);
  add("stag2", "leaf", 137, 0, 1);
  add("frost1", "frost", 125, -32, 1);
  add("wolf3", "night", 197, -114, 2);
  add("bull2", "moss", 232, -106, 2);
  add("boss", "tempest", 214, -129, 2);
  return { decor, resources, wild };
}
export const WORLD = makeWorld();
export function newState() {
  return {
    version: VERSION,
    seed: 7324,
    time: 95,
    day: 1,
    playtime: 0,
    player: { x: 0, z: 25, angle: Math.PI, hp: 100, stamina: 100, hunger: 100 },
    inventory: {
      wood: 3,
      stone: 3,
      fiber: 2,
      berry: 6,
      rune: 3,
      meal: 1,
      pelt: 0,
      crystal: 0,
    },
    gear: {},
    companions: {},
    active: null,
    buildings: [],
    harvested: {},
    captured: [],
    visited: [0],
    flags: {},
    settings: { sound: true, quality: "medium", sensitivity: 1 },
    stats: { gathered: 0, captures: 0, deaths: 0 },
    lastSaved: null,
  };
}
const finite = (v) => typeof v === "number" && Number.isFinite(v);
export function validateSave(input) {
  if (!input || input.version !== VERSION || !input.player || !input.inventory)
    throw Error("対応していないセーブデータです。");
  const s = newState(),
    p = input.player;
  if (
    ![
      p.x,
      p.z,
      p.angle,
      p.hp,
      p.stamina,
      p.hunger,
      input.time,
      input.day,
    ].every(finite) ||
    Math.abs(p.x) > 500 ||
    Math.abs(p.z) > 500 ||
    input.day < 1 ||
    input.day > 100000
  )
    throw Error("座標または数値が壊れています。");
  s.player = {
    x: p.x,
    z: p.z,
    angle: p.angle,
    hp: clamp(p.hp, 0, 100),
    stamina: clamp(p.stamina, 0, 100),
    hunger: clamp(p.hunger, 0, 100),
  };
  s.time = clamp(input.time, 0, DAY_SECONDS);
  s.day = Math.floor(input.day);
  s.playtime = clamp(Number(input.playtime) || 0, 0, 1e8);
  for (const k of Object.keys(ITEMS)) {
    if (
      !Number.isInteger(input.inventory[k]) ||
      input.inventory[k] < 0 ||
      input.inventory[k] > 99999
    )
      throw Error("所持品データが壊れています。");
    s.inventory[k] = input.inventory[k];
  }
  for (const r of RECIPES)
    if (r.gear) s.gear[r.gear] = input.gear?.[r.gear] === true;
  for (const k of Object.keys(SPECIES)) {
    const c = input.companions?.[k];
    if (c) {
      if (![c.hp, c.level, c.bond].every(finite))
        throw Error("仲間データが壊れています。");
      s.companions[k] = {
        hp: clamp(c.hp, 0, 100),
        level: clamp(Math.floor(c.level), 1, 8),
        bond: clamp(c.bond, 0, 100),
      };
    }
  }
  s.active = Object.hasOwn(s.companions, input.active)
    ? input.active
    : Object.keys(s.companions)[0] || null;
  if (!Array.isArray(input.buildings) || input.buildings.length > 120)
    throw Error("建築データが壊れています。");
  s.buildings = input.buildings.map((b, n) => {
    if (
      !b ||
      !Object.hasOwn(BUILDINGS, b.kind) ||
      !finite(b.x) ||
      !finite(b.z) ||
      heightAt(b.x, b.z) < 0.8
    )
      throw Error("建築の位置が壊れています。");
    return {
      id: `b${n}`,
      kind: b.kind,
      x: b.x,
      z: b.z,
      angle: finite(b.angle) ? b.angle : 0,
    };
  });
  for (const r of WORLD.resources) {
    const d = input.harvested?.[r.id];
    if (Number.isInteger(d) && d >= 1 && d <= s.day) s.harvested[r.id] = d;
  }
  if (!Array.isArray(input.captured) || !Array.isArray(input.visited))
    throw Error("冒険の記録が壊れています。");
  s.captured = WORLD.wild
    .filter((e) => input.captured.includes(e.id))
    .map((e) => e.id);
  s.visited = [0, ...[1, 2].filter((i) => input.visited.includes(i))];
  s.flags = { met: input.flags?.met === true, won: !!s.companions.tempest };
  s.settings = {
    sound: input.settings?.sound !== false,
    quality: ["low", "medium", "high"].includes(input.settings?.quality)
      ? input.settings.quality
      : "medium",
    sensitivity: clamp(Number(input.settings?.sensitivity) || 1, 0.4, 2),
  };
  for (const k of Object.keys(s.stats))
    s.stats[k] = clamp(Math.floor(Number(input.stats?.[k]) || 0), 0, 1e7);
  s.lastSaved = typeof input.lastSaved === "string" ? input.lastSaved : null;
  return s;
}

export class Game {
  constructor(state = newState()) {
    this.s = state;
    this.events = [];
    this.paused = false;
    this.dead = state.player.hp <= 0;
    this.mount = false;
    this.stealth = false;
    this.cooldown = 0;
    this.invulnerable = 0;
    this.dodge = 0;
    this.capture = null;
    this.attackPose = 0;
    this.companionCooldown = 0;
    this.effects = [];
    this.moving = 0;
    this.ally = { x: state.player.x - 2, z: state.player.z + 1, angle: 0 };
    this.wild = WORLD.wild
      .filter((e) => !state.captured.includes(e.id))
      .map((e) => ({
        ...e,
        hp: SPECIES[e.type].hp,
        homeX: e.x,
        homeZ: e.z,
        angle: 0,
        mode: "idle",
        timer: 1,
        hit: 0,
        down: false,
      }));
    this.currentQuest = this.questIndex;
    this.transit = null;
    this.feedCooldown = 0;
  }
  get night() {
    return this.s.time < 65 || this.s.time > 255;
  }
  get island() {
    return (
      islandAt(this.s.player.x, this.s.player.z) ||
      ISLANDS.reduce((a, b) =>
        dist(this.s.player, a) < dist(this.s.player, b) ? a : b,
      )
    );
  }
  get questIndex() {
    const n = QUESTS.findIndex((q) => !q.test(this.s));
    return n < 0 ? 7 : n;
  }
  get quest() {
    return QUESTS[this.questIndex];
  }
  get companion() {
    return this.s.companions[this.s.active];
  }
  get warm() {
    return this.s.buildings.some(
      (b) =>
        ["campfire", "shelter"].includes(b.kind) && dist(this.s.player, b) < 9,
    );
  }
  get cold() {
    return this.island.id === 1 && !this.s.gear.coat && !this.warm;
  }
  get fly() {
    return this.mount && this.s.gear.sky;
  }
  get boat() {
    return (
      !!this.s.gear.raft &&
      heightAt(this.s.player.x, this.s.player.z) < 0.15 &&
      !this.fly
    );
  }
  get sleepBonus() {
    return Object.keys(ITEMS)[(this.s.day - 1) % 4];
  }
  emit(type, text = "", data = {}) {
    this.events.push({ type, text, ...data });
  }
  drain() {
    return this.events.splice(0);
  }
  add(items) {
    for (const [k, v] of Object.entries(items)) this.s.inventory[k] += v;
  }
  canPay(cost) {
    return Object.entries(cost).every(([k, v]) => this.s.inventory[k] >= v);
  }
  pay(cost) {
    if (!this.canPay(cost)) return false;
    for (const [k, v] of Object.entries(cost)) this.s.inventory[k] -= v;
    return true;
  }
  nearestCreature(range = 7) {
    return (
      this.wild
        .filter(
          (e) =>
            dist(e, this.s.player) < range &&
            (!this.s.companions[e.type] || e.type === "tempest"),
        )
        .sort((a, b) => dist(a, this.s.player) - dist(b, this.s.player))[0] ||
      null
    );
  }
  nearestEnemy(range = 7) {
    return (
      this.wild
        .filter((e) => dist(e, this.s.player) < range && !e.down)
        .sort((a, b) => dist(a, this.s.player) - dist(b, this.s.player))[0] ||
      null
    );
  }
  sleeping(e) {
    return (
      !e.down &&
      e.mode === "idle" &&
      (e.type === "night"
        ? !this.night
        : this.night && ["moss", "leaf", "ember"].includes(e.type))
    );
  }
  context() {
    const p = this.s.player;
    if (dist(p, { x: 3, z: 22 }) < 3.6)
      return { type: "npc", name: "ミナと話す", x: 3, z: 22 };
    const b = this.s.buildings
      .filter((b) => dist(p, b) < 3.3)
      .sort((a, b) => dist(a, p) - dist(b, p))[0];
    const r = WORLD.resources
      .filter((r) => this.s.harvested[r.id] !== this.s.day && dist(p, r) < 3.3)
      .sort((a, b) => dist(a, p) - dist(b, p))[0];
    if (r)
      return { type: "resource", name: `${ITEMS[r.kind].name}を採集`, ...r };
    if (b)
      return {
        type: "building",
        name:
          b.kind === "campfire"
            ? "焚き火で休息"
            : `${BUILDINGS[b.kind].name}を使う`,
        ...b,
      };
    return null;
  }
  interact() {
    if (this.dead || this.capture || this.transit) return;
    const c = this.context();
    if (!c) return;
    if (c.type === "npc") {
      if (!this.s.flags.met) {
        this.s.flags.met = true;
        this.add({ wood: 5, fiber: 4, rune: 2, berry: 4, pelt: 2 });
      }
      this.emit(
        "dialog",
        "島の獣たちは、きっと旅の仲間になる。狐を弱らせて Q で絆を結んでみて。資源は毎朝戻るよ。焚き火を置いていかだを作れば、霧氷の島へ進める。",
        { speaker: "ミナ / 島の案内人" },
      );
    }
    if (c.type === "resource") {
      this.s.harvested[c.id] = this.s.day;
      const n = c.kind === this.sleepBonus ? 5 : 3;
      this.add({ [c.kind]: n });
      if (c.kind === "fiber" && this.s.day % 2 === 0) this.add({ pelt: 1 });
      this.s.stats.gathered += n;
      this.emit("gather", `${ITEMS[c.kind].name} +${n}`, {
        x: c.x,
        z: c.z,
        color: ITEMS[c.kind].color,
      });
    }
    if (c.type === "building")
      this.emit(
        "menu",
        c.kind === "campfire" ? "rest" : c.kind === "chest" ? "bag" : "craft",
      );
  }
  craft(id) {
    const r = RECIPES.find((r) => r.id === id);
    if (!r) return false;
    if (r.gear && this.s.gear[r.gear]) return this.fail("すでに製作済みです。");
    if (r.unlock && !this.s.companions[r.unlock])
      return this.fail("霧氷の守護獣と絆を結ぶと解放されます。");
    if (
      r.station &&
      !this.s.buildings.some(
        (b) => b.kind === r.station && dist(b, this.s.player) < 10,
      )
    )
      return this.fail("近くに焚き火が必要です。");
    if (!this.pay(r.cost))
      return this.fail("材料が足りません。採集してから再挑戦しよう。");
    if (r.out) this.add(r.out);
    if (r.gear) this.s.gear[r.gear] = true;
    this.emit("craft", `${r.name} を製作しました`);
    return true;
  }
  canBuild(kind, x, z) {
    return (
      !!BUILDINGS[kind] &&
      finite(x) &&
      finite(z) &&
      heightAt(x, z) > 0.9 &&
      dist(this.s.player, { x, z }) < 9 &&
      this.s.buildings.every((b) => dist(b, { x, z }) > 2.2) &&
      WORLD.decor.every((d) => dist(d, { x, z }) > d.radius + 1.1) &&
      dist({ x, z }, { x: 3, z: 22 }) > 2.5 &&
      !(islandAt(x, z)?.id === 2 && dist({ x, z }, { x: 214, z: -129 }) < 14)
    );
  }
  build(kind, x, z) {
    if (this.s.buildings.length >= 120)
      return this.fail("建築上限です。不要な建物を撤去してください。");
    if (!this.canBuild(kind, x, z))
      return this.fail("この場所には置けません。平らな空き地へ移動しよう。");
    if (!this.pay(BUILDINGS[kind].cost))
      return this.fail("建築材料が足りません。");
    this.s.buildings.push({
      id: `b${Date.now()}-${this.s.buildings.length}`,
      kind,
      x,
      z,
      angle: this.s.player.angle,
    });
    this.emit("build", `${BUILDINGS[kind].name}を設置しました`);
    return true;
  }
  removeBuilding(id) {
    const n = this.s.buildings.findIndex((b) => b.id === id);
    if (n < 0 || dist(this.s.player, this.s.buildings[n]) > 10) return false;
    const b = this.s.buildings.splice(n, 1)[0];
    for (const [k, v] of Object.entries(BUILDINGS[b.kind].cost))
      this.s.inventory[k] += Math.ceil(v * 0.5);
    this.emit("build", "撤去して資材の半分を回収しました");
    return true;
  }
  eat() {
    const inv = this.s.inventory,
      kind = inv.meal > 0 ? "meal" : inv.berry > 0 ? "berry" : null;
    if (!kind) return this.fail("食料がありません。実を採集しよう。");
    inv[kind]--;
    const p = this.s.player;
    p.hp = clamp(p.hp + (kind === "meal" ? 45 : 16), 0, 100);
    p.hunger = clamp(p.hunger + (kind === "meal" ? 50 : 22), 0, 100);
    this.emit("heal", `${ITEMS[kind].name}を食べた`);
    return true;
  }
  feed(type = this.s.active) {
    const c = this.s.companions[type];
    if (!c) return this.fail("先に仲間を捕獲しよう。");
    if (this.feedCooldown > 0)
      return this.fail("お腹が落ち着くまで、少し待とう。");
    const food = this.s.inventory.meal > 0 ? "meal" : "berry";
    if (this.s.inventory[food] < 1)
      return this.fail("仲間にあげる食料がありません。");
    this.s.inventory[food]--;
    c.hp = clamp(c.hp + 40, 0, 100);
    c.bond = clamp(c.bond + 18, 0, 100);
    if (c.bond >= 36 && c.level < 8) {
      c.bond -= 36;
      c.level++;
    }
    this.feedCooldown = 3;
    this.emit("heal", `${SPECIES[type].name}と絆が深まった · Lv.${c.level}`);
    return true;
  }
  select(type) {
    if (!this.s.companions[type]) return false;
    this.mount = false;
    this.s.active = type;
    this.ally.x = this.s.player.x - 2;
    this.ally.z = this.s.player.z;
    this.emit("select", `${SPECIES[type].name}が同行します`);
    return true;
  }
  toggleMount() {
    if (this.mount) {
      this.mount = false;
      return true;
    }
    if (!this.s.gear.saddle && !this.s.gear.sky)
      return this.fail("サドルを製作すると騎乗できます。");
    if (!this.companion || this.companion.hp <= 0)
      return this.fail("元気な仲間を同行させてください。");
    this.mount = true;
    this.emit("mount", this.fly ? "空へ！ WASDで飛行します" : "騎乗しました");
    return true;
  }
  attack() {
    if (this.fly) return this.fail("Rで地上に降りてから戦おう。");
    if (
      this.dead ||
      this.capture ||
      this.transit ||
      this.cooldown > 0 ||
      this.s.player.stamina < 9
    )
      return false;
    this.s.player.stamina -= 9;
    this.cooldown = 0.53;
    this.attackPose = 0.32;
    const e = this.nearestEnemy(this.s.gear.spear ? 4.5 : 4);
    this.emit("swing");
    if (!e) return false;
    this.s.player.angle = Math.atan2(
      e.x - this.s.player.x,
      e.z - this.s.player.z,
    );
    let damage = this.s.gear.spear ? 29 : 18;
    if (this.stealth && this.sleeping(e)) damage *= 2.7;
    this.hit(e, damage);
    return true;
  }
  hit(e, amount) {
    e.hp = Math.max(0, e.hp - amount);
    e.hit = 0.22;
    if (e.hp <= 0 && !e.down) {
      e.down = true;
      e.mode = "down";
      this.add({ pelt: e.type === "tempest" ? 6 : 2, berry: 2 });
      this.emit("toast", "疲労状態！ 近づいて Q で捕獲できます。");
    } else if (e.mode === "idle") e.mode = "chase";
    this.emit("hit", `${Math.round(amount)}`, {
      x: e.x,
      z: e.z,
      color: "#ffe5a3",
    });
  }
  command() {
    if (this.fly) return this.fail("仲間の技は地上で使おう。");
    if (!this.companion || this.companion.hp <= 0)
      return this.fail("元気な仲間が必要です。");
    if (this.companionCooldown > 0) return this.fail("仲間の技を準備中です。");
    const e = this.nearestEnemy(16);
    if (!e) return this.fail("近くに敵がいません。");
    this.companionCooldown = 7;
    this.hit(e, 24 + this.companion.level * 7);
    this.emit("skill", "仲間の技！", { x: e.x, z: e.z, color: "#72eed7" });
    return true;
  }
  startCapture() {
    if (this.fly) return this.fail("Rで地上に降りてから絆を結ぼう。");
    if (this.dead || this.transit || this.capture) return false;
    const e = this.nearestCreature(6);
    if (!e) return this.fail("捕獲できる獣の近くへ。");
    if (this.s.companions[e.type]) return this.fail("この種はすでに仲間です。");
    const threshold = e.type === "tempest" ? 0.2 : 0.35;
    if (e.hp / SPECIES[e.type].hp > threshold)
      return this.fail(`体力を${threshold * 100}%以下に弱らせよう。`);
    if (this.s.inventory.rune < 1)
      return this.fail("ルーン石が必要です。Tabから製作できます。");
    this.s.inventory.rune--;
    this.capture = { id: e.id, time: 0 };
    this.emit("captureStart", "絆を結んでいます…近くにとどまろう。");
    return true;
  }
  finishCapture(e) {
    this.s.companions[e.type] = { hp: 100, level: 1, bond: 0 };
    this.s.captured.push(e.id);
    this.s.stats.captures++;
    this.add({ pelt: 2 });
    this.s.active = e.type;
    this.mount = false;
    this.ally.x = e.x;
    this.ally.z = e.z;
    this.wild = this.wild.filter((w) => w !== e);
    this.capture = null;
    this.emit("captured", `${SPECIES[e.type].name}が仲間になった！`, {
      typeId: e.type,
      x: e.x,
      z: e.z,
    });
    if (e.type === "frost") this.add({ crystal: 5, fiber: 4 });
    if (e.type === "tempest") {
      this.s.flags.won = true;
      this.emit("win");
    }
  }
  canTravel(id) {
    return (
      id === 0 ||
      (id === 1 && this.s.gear.raft) ||
      (id === 2 && this.s.gear.sky && !!this.s.companions.frost)
    );
  }
  travel(id) {
    if (!ISLANDS[id] || !this.canTravel(id))
      return this.fail(
        id === 1
          ? "いかだを製作してから出航しよう。"
          : "空のサドルと霧氷の守護獣との絆が必要です。",
      );
    if (this.capture) return false;
    this.mount = false;
    this.transit = {
      id,
      t: 0,
      from: { x: this.s.player.x, z: this.s.player.z },
    };
    this.emit("travel", `${ISLANDS[id].name}へ`);
    return true;
  }
  visit(id) {
    if (!this.s.visited.includes(id)) {
      this.s.visited.push(id);
      this.emit("discovery", `${ISLANDS[id].name}を発見`);
    }
  }
  rest() {
    if (!this.warm) return this.fail("焚き火か住居の近くで休もう。");
    this.s.day++;
    this.s.time = 80;
    this.s.player.hp = 100;
    this.s.player.stamina = 100;
    this.s.player.hunger = Math.max(35, this.s.player.hunger - 10);
    for (const c of Object.values(this.s.companions)) c.hp = 100;
    this.wild.forEach((e) => {
      if (!e.down) {
        e.hp = SPECIES[e.type].hp;
        e.x = e.homeX;
        e.z = e.homeZ;
        e.mode = "idle";
        e.timer = 1;
      }
    });
    this.emit("rest", "朝になりました。資源が再び採集できます。");
    return true;
  }
  damage(amount, environment = false) {
    if ((this.invulnerable > 0 && !environment) || this.dead || this.transit)
      return;
    this.s.player.hp = Math.max(0, this.s.player.hp - amount);
    if (!environment) {
      this.invulnerable = 0.65;
      if (this.capture) {
        this.capture = null;
        this.s.inventory.rune++;
        this.emit("toast", "集中が途切れた。ルーン石は戻りました。");
      }
      this.emit("damage");
    }
    if (this.s.player.hp <= 0) {
      this.dead = true;
      this.mount = false;
      this.s.stats.deaths++;
      this.emit("death");
    }
  }
  respawn() {
    if (!this.dead) return;
    const i = this.island;
    this.s.player.x = i.spawn[0];
    this.s.player.z = i.spawn[1];
    this.s.player.hp = 100;
    this.s.player.stamina = 100;
    this.s.player.hunger = 75;
    for (const k of ["wood", "stone", "fiber", "berry", "crystal"])
      this.s.inventory[k] = Math.floor(this.s.inventory[k] * 0.8);
    this.dead = false;
    this.invulnerable = 4;
    this.capture = null;
    this.wild.forEach((e) => {
      e.x = e.homeX;
      e.z = e.homeZ;
      e.mode = e.down ? "down" : "idle";
    });
    this.emit("toast", "浜辺で救助された。仲間と装備は無事です。");
  }
  fail(text) {
    this.emit("toast", text);
    return false;
  }
  tick(dt, input = {}) {
    dt = clamp(dt, 0, 0.05);
    if (this.paused || this.dead) return;
    const s = this.s,
      p = s.player;
    s.playtime += dt;
    s.time += dt;
    if (s.time >= DAY_SECONDS) {
      s.time -= DAY_SECONDS;
      s.day++;
      this.emit("toast", "新しい朝の資源が島に戻りました。");
    }
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.attackPose = Math.max(0, this.attackPose - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.companionCooldown = Math.max(0, this.companionCooldown - dt);
    this.feedCooldown = Math.max(0, this.feedCooldown - dt);
    this.dodge = Math.max(0, this.dodge - dt);
    if (this.transit) {
      const t = this.transit;
      t.t += dt;
      const i = ISLANDS[t.id],
        f = clamp(t.t / 3, 0, 1),
        k = f * f * (3 - 2 * f);
      p.x = t.from.x + (i.spawn[0] - t.from.x) * k;
      p.z = t.from.z + (i.spawn[1] - t.from.z) * k;
      if (f >= 1) {
        this.transit = null;
        this.visit(i.id);
        this.invulnerable = 3;
        this.emit("arrive", `${i.name}に到着しました`);
      }
      this.ally.x = p.x - 2;
      this.ally.z = p.z;
      return;
    }
    this.stealth = !!input.stealth;
    if (input.dodge && this.dodge === 0 && p.stamina >= 22) {
      p.stamina -= 22;
      this.dodge = 0.36;
      this.invulnerable = 0.5;
      this.emit("dodge");
    }
    let mx = input.x || 0,
      mz = input.z || 0;
    const len = Math.hypot(mx, mz);
    if (len > 1) {
      mx /= len;
      mz /= len;
    }
    if (this.capture) {
      const e = this.wild.find((e) => e.id === this.capture.id);
      if (!e || dist(e, p) > 6.8) {
        this.capture = null;
        s.inventory.rune++;
        this.emit("toast", "離れすぎました。ルーン石は戻りました。");
      } else {
        this.capture.time += dt;
        if (this.capture.time >= 2) this.finishCapture(e);
      }
      mx *= 0.25;
      mz *= 0.25;
    }
    const running = input.sprint && p.stamina > 1 && !this.stealth;
    let speed = this.stealth ? 2 : running ? 7.8 : 4.8;
    if (this.mount) speed = this.fly ? 15 : 9 + SPECIES[s.active].speed * 0.6;
    if (this.boat) speed = 10;
    if (this.dodge > 0) {
      speed = 15;
      if (len === 0) {
        mx = Math.sin(p.angle);
        mz = Math.cos(p.angle);
      }
    }
    if (heightAt(p.x, p.z) < 0.1 && !s.gear.raft && !this.fly) speed = 2;
    const nx = p.x + mx * speed * dt,
      nz = p.z + mz * speed * dt,
      ni = islandAt(nx, nz);
    const allowed =
      (!ni || this.canTravel(ni.id)) &&
      Math.abs(nx) < 320 &&
      nz > -220 &&
      nz < 95;
    const collide = (x, z) =>
      !this.fly &&
      WORLD.decor.some((d) => Math.hypot(x - d.x, z - d.z) < d.radius + 0.38);
    if (allowed) {
      if (!collide(nx, p.z)) p.x = nx;
      if (!collide(p.x, nz)) p.z = nz;
      if (ni) this.visit(ni.id);
    }
    this.moving = Math.hypot(mx, mz);
    if (this.moving > 0.01) p.angle = Math.atan2(mx, mz);
    p.stamina = clamp(p.stamina + dt * (running && len > 0 ? -13 : 18), 0, 100);
    p.hunger = clamp(p.hunger - dt * 0.08, 0, 100);
    if (p.hunger <= 0) this.damage(dt * 0.8, true);
    if (this.cold) this.damage(dt * 0.4, true);
    if (heightAt(p.x, p.z) < -0.3 && !s.gear.raft && !this.fly) {
      p.stamina = Math.max(0, p.stamina - dt * 23);
      if (p.stamina <= 0) this.damage(3);
    }
    if (this.warm) {
      p.hp = Math.min(100, p.hp + dt * 2);
      for (const c of Object.values(s.companions))
        c.hp = Math.min(100, c.hp + dt * 4);
    }
    if (
      this.companion &&
      s.active === "ember" &&
      this.island.id === 1 &&
      !this.warm &&
      !s.gear.coat
    )
      this.companion.hp = Math.max(0, this.companion.hp - dt * 0.12);
    this.ally.x +=
      (p.x - Math.cos(p.angle) * 1.8 - this.ally.x) * Math.min(1, dt * 4);
    this.ally.z +=
      (p.z + Math.sin(p.angle) * 1.8 - this.ally.z) * Math.min(1, dt * 4);
    this.ally.angle = p.angle;
    for (const e of this.wild) {
      e.hit = Math.max(0, e.hit - dt);
      if (e.down || e.island !== this.island.id) continue;
      if (this.capture?.id === e.id) {
        e.mode = "idle";
        continue;
      }
      const sp = SPECIES[e.type],
        d = dist(e, p);
      if (this.sleeping(e) && d > 1.8) continue;
      e.timer -= dt;
      if (d > (e.type === "tempest" ? 21 : 17) || this.fly) {
        e.mode = "idle";
        const a = Math.atan2(e.homeX - e.x, e.homeZ - e.z);
        e.walking = Math.hypot(e.x - e.homeX, e.z - e.homeZ) > 2;
        if (e.walking) {
          e.x += Math.sin(a) * dt * 1.5;
          e.z += Math.cos(a) * dt * 1.5;
          e.angle = a;
        } else if (e.type !== "tempest" && !this.sleeping(e)) {
          const phase = s.playtime * 0.15 + e.homeX;
          e.x = e.homeX + Math.sin(phase) * 1.7;
          e.z = e.homeZ + Math.cos(phase) * 1.7;
          e.angle = phase + Math.PI / 2;
          e.walking = true;
        }
        continue;
      }
      e.walking = false;
      if (
        e.mode === "idle" &&
        d < (this.stealth ? 2.8 : e.type === "tempest" ? 17 : 8)
      ) {
        e.mode = "chase";
        e.timer = 0.3;
      }
      if (e.mode === "chase") {
        e.angle = Math.atan2(p.x - e.x, p.z - e.z);
        if (d > (e.type === "tempest" ? 5 : 2.7)) {
          e.x += Math.sin(e.angle) * sp.speed * dt;
          e.z += Math.cos(e.angle) * sp.speed * dt;
        } else {
          e.mode = "windup";
          e.timer = e.type === "tempest" ? 1.2 : 0.95;
          e.aim = { x: p.x, z: p.z };
          this.emit("warning", "攻撃予告！ Spaceで回避", { id: e.id });
        }
      } else if (e.mode === "windup" && e.timer <= 0) {
        const radius =
          e.type === "tempest" ? (e.hp / sp.hp < 0.5 ? 6 : 4.5) : 3;
        if (dist(p, e.aim || e) < radius)
          this.damage(sp.damage * (this.night ? 1.1 : 1));
        if (this.companion && dist(this.ally, e) < radius)
          this.companion.hp = Math.max(0, this.companion.hp - 8);
        e.mode = "recover";
        e.timer = e.type === "tempest" ? 1.8 : 1.4;
        this.emit("impact", "", {
          x: e.x,
          z: e.z,
          color: e.type === "tempest" ? "#f5ce86" : "#eb8262",
        });
      } else if (e.mode === "recover" && e.timer <= 0) e.mode = "chase";
      if (this.companion && this.companion.hp > 0 && d < 9 && !this.mount) {
        e.allyTimer = (e.allyTimer || 0) - dt;
        if (e.allyTimer <= 0) {
          e.allyTimer = 2.5;
          this.hit(
            e,
            (SPECIES[s.active].damage + this.companion.level * 2) *
              (s.active === "ember" && this.island.id === 1 && !s.gear.coat
                ? 0.5
                : 1),
          );
        }
      }
    }
    const qi = this.questIndex;
    if (qi !== this.currentQuest) {
      this.currentQuest = qi;
      this.emit("quest", this.quest.title);
    }
  }
}
