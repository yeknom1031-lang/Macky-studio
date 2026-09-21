import test from "node:test";
import assert from "node:assert/strict";
import { Game, newState, validateSave, WORLD, makeWorld } from "../src/core.js";
import {
  SPECIES,
  RECIPES,
  BUILDINGS,
  ISLANDS,
  heightAt,
  CAVES,
  caveAt,
  caveWallAt,
} from "../src/data.js";
const step = (g, seconds, input = {}) => {
  for (let t = 0; t < seconds; t += 0.025) g.tick(0.025, input);
};
const rich = (g) => {
  for (const key in g.s.inventory) g.s.inventory[key] = 100;
};
const near = (g, e, d = 2) => Object.assign(g.s.player, { x: e.x, z: e.z + d });
function capture(g, id) {
  const e = g.wild.find((e) => e.id === id);
  near(g, e);
  g.hit(e, SPECIES[e.type].hp);
  assert.equal(g.startCapture(), true);
  step(g, 2.1);
  assert.ok(g.s.companions[e.type]);
}
test("world is deterministic and each island has resources", () => {
  assert.deepEqual(makeWorld(), WORLD);
  for (const i of ISLANDS)
    assert.equal(
      WORLD.resources.filter((r) => r.island === i.id).length,
      i.id === 0 ? 38 : 30,
    );
});
test("six islands include three real cave bosses; five islands are open from the start", () => {
  const g = new Game();
  assert.equal(ISLANDS.length, 6);
  assert.equal(CAVES.length, 3);
  for (const id of [0, 1, 3, 4, 5]) assert.equal(g.canTravel(id), true);
  assert.equal(g.canTravel(2), false);
  assert.equal(g.canTravel(999), false);
  for (const c of CAVES) {
    const e = g.wild.find((e) => e.id === c.id);
    assert.ok(SPECIES[e.type].boss);
    assert.ok(SPECIES[e.type].size > 5);
    assert.equal(caveAt(e.x, e.z), c);
  }
});
test("older saves receive a boat without losing captured animals or materials", () => {
  const s = newState();
  s.gear = {};
  s.inventory.wood = 31;
  s.companions.ember = { hp: 80, level: 3, bond: 18 };
  s.active = "ember";
  s.captured = ["fox1"];
  const v = validateSave(s);
  assert.equal(v.gear.raft, true);
  assert.equal(v.inventory.wood, 31);
  assert.equal(v.companions.ember.level, 3);
  assert.deepEqual(v.captured, ["fox1"]);
});
test("cave walls block movement, entrance is open, and entry/exit work", () => {
  const g = new Game(),
    c = CAVES[0];
  assert.equal(caveWallAt(c.x, c.z + 16), false);
  assert.equal(caveWallAt(c.x + 14, c.z), true);
  Object.assign(g.s.player, { x: c.x, z: c.z + 20 });
  assert.equal(g.context().type, "cave");
  g.interact();
  assert.equal(g.cave, c);
  Object.assign(g.s.player, { x: c.x + 11.9, z: c.z });
  step(g, 1, { x: 1 });
  assert.ok(g.s.player.x < c.x + 12.5);
  assert.equal(g.canBuild("campfire", c.x, c.z), false);
  Object.assign(g.s.player, { x: c.x, z: c.z + 14 });
  g.interact();
  assert.equal(g.cave, null);
});
test("cave guardian stays inside and cannot attack a visitor outside", () => {
  const g = new Game(),
    c = CAVES[0],
    e = g.wild.find((e) => e.id === c.id);
  Object.assign(g.s.player, { x: c.x, z: c.z + 20 });
  step(g, 5);
  assert.equal(e.mode, "idle");
  assert.equal(g.s.player.hp, 100);
  Object.assign(g.s.player, { x: c.x, z: c.z });
  step(g, 2);
  assert.ok(["chase", "windup", "recover"].includes(e.mode));
  assert.ok(e.z < c.z + 6);
});
test("all cave bosses can be captured and remain captured after reload", () => {
  const g = new Game();
  for (const c of CAVES) {
    capture(g, c.id);
    assert.ok(g.s.companions[c.boss]);
    assert.ok(g.s.inventory.meal >= 4);
  }
  const restored = new Game(validateSave(JSON.parse(JSON.stringify(g.s))));
  for (const c of CAVES)
    assert.equal(
      restored.wild.some((e) => e.id === c.id),
      false,
    );
});
test("boat can reach the new southern and western islands within world bounds", () => {
  const g = new Game();
  for (const id of [3, 4, 5]) {
    g.travel(id);
    step(g, 3.2);
    assert.equal(g.island.id, id);
    const x = g.s.player.x;
    step(g, 0.5, { x: 1 });
    assert.ok(g.s.player.x > x);
  }
  assert.deepEqual(validateSave(g.s).visited, [0, 3, 4, 5]);
});
test("new state validates and round-trips without data loss", () => {
  const s = newState();
  assert.deepEqual(validateSave(s).player, s.player);
  assert.deepEqual(validateSave(s).inventory, s.inventory);
});
test("save validation rejects prototype names and malformed buildings", () => {
  const s = newState();
  s.active = "__proto__";
  assert.equal(validateSave(s).active, null);
  s.buildings = [{ kind: "__proto__", x: 0, z: 25 }];
  assert.throws(() => validateSave(s));
  s.buildings = [null];
  assert.throws(() => validateSave(s));
});
test("environmental damage is rate-based and not suppressed by hit invulnerability", () => {
  const g = new Game();
  g.s.gear.raft = true;
  Object.assign(g.s.player, { x: 122, z: 10 });
  step(g, 2);
  assert.ok(g.s.player.hp < 99.3 && g.s.player.hp > 98.8);
});
test("reject corrupt save files without mutating caller state", () => {
  for (const mutate of [
    (s) => (s.version = 90),
    (s) => (s.player.x = Infinity),
    (s) => (s.inventory.wood = -2),
    (s) => (s.inventory.berry = "9"),
    (s) => (s.buildings = [{ kind: "shelter", x: 999, z: 999 }]),
    (s) => (s.visited = {}),
    (s) => (s.captured = "all"),
    (s) => (s.companions.ember = { hp: NaN, level: 1, bond: 0 }),
  ]) {
    const s = newState();
    mutate(s);
    assert.throws(() => validateSave(s));
  }
});
test("invalid fields are clamped or discarded", () => {
  const s = newState();
  s.player.hp = 400;
  s.gear.cheat = true;
  s.flags.won = true;
  s.settings.quality = "ultra";
  s.companions.ember = { hp: 120, level: 999, bond: 200 };
  const v = validateSave(s);
  assert.equal(v.player.hp, 100);
  assert.equal(v.companions.ember.level, 8);
  assert.equal(v.gear.cheat, undefined);
  assert.equal(v.flags.won, false);
  assert.equal(v.settings.quality, "medium");
});
test("Mina gives a one-time starter kit and advances quest", () => {
  const g = new Game();
  Object.assign(g.s.player, { x: 3, z: 23 });
  g.interact();
  const wood = g.s.inventory.wood;
  assert.equal(g.s.flags.met, true);
  g.interact();
  assert.equal(g.s.inventory.wood, wood);
  assert.equal(g.questIndex, 1);
});
test("gathering depletes a node until the following day", () => {
  const g = new Game(),
    r = WORLD.resources.find((r) => r.id === "start0");
  near(g, r, 0);
  const n = g.s.inventory.wood;
  g.interact();
  assert.equal(g.s.inventory.wood, n + 5);
  g.interact();
  assert.equal(g.s.inventory.wood, n + 5);
  g.s.day++;
  g.interact();
  assert.equal(g.s.inventory.wood, n + 8);
});
test("crafting costs exact materials, never negative, cannot duplicate equipment", () => {
  const g = new Game();
  g.s.gear.raft = false;
  assert.equal(g.craft("raft"), false);
  rich(g);
  const before = { ...g.s.inventory };
  assert.equal(g.craft("raft"), true);
  for (const [k, v] of Object.entries(
    RECIPES.find((r) => r.id === "raft").cost,
  ))
    assert.equal(g.s.inventory[k], before[k] - v);
  assert.equal(g.craft("raft"), false);
  assert.equal(g.s.gear.raft, true);
});
test("food needs a local fire and sky saddle requires guardian", () => {
  const g = new Game();
  rich(g);
  assert.equal(g.craft("meal"), false);
  g.s.buildings.push({
    id: "fire",
    kind: "campfire",
    x: g.s.player.x,
    z: g.s.player.z,
  });
  assert.equal(g.craft("meal"), true);
  assert.equal(g.craft("sky"), false);
  g.s.companions.frost = { hp: 100, level: 1, bond: 0 };
  assert.equal(g.craft("sky"), true);
});
test("building checks terrain, range, overlap and costs", () => {
  const g = new Game();
  rich(g);
  let pos;
  for (let x = -6; x < 7; x++)
    for (let z = 21; z < 30; z++)
      if (g.canBuild("campfire", x, z)) pos = { x, z };
  assert.ok(pos);
  const wood = g.s.inventory.wood;
  assert.equal(g.build("campfire", pos.x, pos.z), true);
  assert.equal(g.s.inventory.wood, wood - 4);
  assert.equal(g.build("shelter", pos.x, pos.z), false);
  assert.equal(g.canBuild("campfire", 500, 500), false);
  assert.equal(g.removeBuilding(g.s.buildings[0].id), true);
  assert.equal(g.s.inventory.wood, wood - 2);
});
test("capture threshold and cancellation preserve rune inventory", () => {
  const g = new Game(),
    e = g.wild.find((e) => e.id === "fox1");
  near(g, e);
  assert.equal(g.startCapture(), false);
  g.hit(e, 55);
  const rune = g.s.inventory.rune;
  assert.equal(g.startCapture(), true);
  assert.equal(g.s.inventory.rune, rune - 1);
  g.s.player.z += 10;
  g.tick(0.02);
  assert.equal(g.capture, null);
  assert.equal(g.s.inventory.rune, rune);
});
test("defeated animals remain capturable and cannot be duplicated", () => {
  const g = new Game();
  capture(g, "fox1");
  assert.equal(
    g.wild.some((e) => e.id === "fox1"),
    false,
  );
  assert.equal(g.s.active, "ember");
  const other = g.wild.find((e) => e.id === "fox2");
  near(g, other);
  g.hit(other, 200);
  assert.equal(g.startCapture(), false);
  assert.equal(Object.keys(g.s.companions).length, 1);
});
test("stealth opening damage is stronger on sleeping prey", () => {
  const g = new Game(),
    e = g.wild.find((e) => e.id === "fox1");
  g.s.time = 300;
  near(g, e);
  g.stealth = true;
  assert.equal(g.sleeping(e), true);
  g.attack();
  assert.ok(e.hp < SPECIES.ember.hp - 40);
});
test("feeding heals, levels and caps; cooldown cannot spend repeatedly", () => {
  const g = new Game();
  rich(g);
  g.s.companions.ember = { hp: 10, level: 1, bond: 18 };
  g.s.active = "ember";
  assert.equal(g.feed(), true);
  assert.equal(g.companion.hp, 50);
  assert.equal(g.companion.level, 2);
  assert.equal(g.feed(), false);
  g.feedCooldown = 0;
  g.companion.level = 8;
  g.companion.bond = 99;
  g.feed();
  assert.equal(g.companion.level, 8);
  assert.ok(g.companion.bond <= 100);
});
test("world travel enforces progression and arrives on valid ground", () => {
  const g = new Game();
  assert.equal(g.s.gear.raft, true);
  assert.equal(g.travel(1), true);
  step(g, 3.2);
  assert.equal(g.transit, null);
  assert.equal(g.island.id, 1);
  assert.ok(heightAt(g.s.player.x, g.s.player.z) > 0);
  assert.ok(g.s.visited.includes(1));
  assert.equal(g.travel(2), false);
});
test("mount requires a saddle and a healthy companion", () => {
  const g = new Game();
  assert.equal(g.toggleMount(), false);
  g.s.companions.ember = { hp: 100, level: 1, bond: 0 };
  g.s.active = "ember";
  g.s.gear.saddle = true;
  assert.equal(g.toggleMount(), true);
  assert.equal(g.mount, true);
  g.s.gear.sky = true;
  assert.equal(g.fly, true);
  g.toggleMount();
  assert.equal(g.mount, false);
});
test("flying cannot bypass combat or capture enemies", () => {
  const g = new Game();
  g.s.companions.ember = { hp: 100, level: 1, bond: 0 };
  g.s.active = "ember";
  g.s.gear.sky = true;
  g.toggleMount();
  assert.equal(g.attack(), false);
  assert.equal(g.command(), false);
  assert.equal(g.startCapture(), false);
});
test("capturing rewards wool without needing to defeat the animal", () => {
  const g = new Game(),
    e = g.wild.find((e) => e.id === "fox1");
  near(g, e);
  g.hit(e, 55);
  const wool = g.s.inventory.pelt;
  g.startCapture();
  step(g, 2.1);
  assert.equal(g.s.inventory.pelt, wool + 2);
});
test("rest restores party and repopulates resource harvest", () => {
  const g = new Game();
  assert.equal(g.rest(), false);
  g.s.buildings.push({ id: "b0", kind: "campfire", x: 0, z: 25 });
  g.s.player.hp = 10;
  g.s.player.hunger = 20;
  g.s.companions.ember = { hp: 0, level: 2, bond: 0 };
  const day = g.s.day;
  assert.equal(g.rest(), true);
  assert.equal(g.s.day, day + 1);
  assert.equal(g.s.player.hp, 100);
  assert.equal(g.s.companions.ember.hp, 100);
  assert.equal(g.s.player.hunger, 35);
});
test("death and rescue retain key progress but lose 20% of resources", () => {
  const g = new Game();
  g.s.inventory.wood = 10;
  g.s.gear.raft = true;
  g.s.companions.ember = { hp: 100, level: 1, bond: 0 };
  g.damage(200);
  assert.equal(g.dead, true);
  assert.equal(g.s.stats.deaths, 1);
  g.respawn();
  assert.equal(g.dead, false);
  assert.equal(g.s.player.hp, 100);
  assert.equal(g.s.inventory.wood, 8);
  assert.equal(g.s.gear.raft, true);
  assert.ok(g.s.companions.ember);
});
test("paused game freezes simulation, movement is delta-time based", () => {
  const a = new Game(),
    b = new Game();
  a.paused = true;
  step(a, 1, { z: 1 });
  assert.equal(a.s.player.z, 25);
  a.paused = false;
  step(a, 1, { z: 1 });
  for (let i = 0; i < 20; i++) b.tick(0.05, { z: 1 });
  assert.ok(Math.abs(a.s.player.z - b.s.player.z) < 0.15);
});
test("main campaign reaches ending using actual capture, craft, build and travel actions", () => {
  const g = new Game();
  Object.assign(g.s.player, { x: 3, z: 23 });
  g.interact();
  capture(g, "fox1");
  rich(g);
  Object.assign(g.s.player, { x: 0, z: 25 });
  let built = false;
  for (let x = -5; x < 5 && !built; x++)
    for (let z = 21; z < 29 && !built; z++)
      if (g.canBuild("campfire", x, z)) built = g.build("campfire", x, z);
  assert.ok(built);
  assert.ok(g.s.gear.raft);
  g.travel(1);
  step(g, 3.2);
  capture(g, "frost1");
  assert.ok(g.craft("sky"));
  g.travel(2);
  step(g, 3.2);
  const boss = g.wild.find((e) => e.id === "boss");
  near(g, boss);
  g.hit(boss, 350);
  assert.equal(g.startCapture(), false);
  g.hit(boss, 30);
  assert.equal(g.startCapture(), true);
  step(g, 2.1);
  assert.equal(g.s.flags.won, true);
  assert.equal(g.questIndex, 7);
  assert.ok(g.drain().some((e) => e.type === "win"));
  const restored = new Game(validateSave(JSON.parse(JSON.stringify(g.s))));
  assert.equal(restored.s.flags.won, true);
  assert.equal(restored.s.active, "tempest");
  assert.equal(
    restored.wild.some((e) => e.id === "boss"),
    false,
  );
});
