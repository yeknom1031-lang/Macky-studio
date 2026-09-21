import { createRequire } from "node:module";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "/Users/makibook/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--enable-webgl", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
await page.route("**/*", (route) => {
  const url = new URL(route.request().url());
  return url.hostname === "127.0.0.1" || url.protocol === "data:"
    ? route.continue()
    : route.abort();
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("response", (r) => {
  if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
});
await fs.mkdir(new URL("../test-results/", import.meta.url), {
  recursive: true,
});
try {
  await page.goto("http://127.0.0.1:4177/?qa=1");
  await page.waitForFunction(() => window.__SA?.view.loaded, {
    timeout: 60000,
  });
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: new URL("../test-results/title.png", import.meta.url).pathname,
  });
  await page.click("#start");
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: new URL("../test-results/gameplay.png", import.meta.url).pathname,
  });
  if (process.argv.includes("--full")) {
    const screenshot = async (name) => {
      await page.waitForTimeout(450);
      await page.screenshot({
        path: new URL(`../test-results/${name}.png`, import.meta.url).pathname,
      });
    };
    const key = async (k) => {
      await page.keyboard.press(k);
      await page.waitForTimeout(100);
    };
    // Navigation between encounters is shortened by positioning the player.
    // Materials are gathered, recipes paid, enemies fought and captures completed through real UI inputs.
    const teleport = async (x, z) => {
      await page.evaluate(
        ([x, z]) => {
          Object.assign(__SA.game.s.player, { x, z });
          __SA.game.mount = false;
        },
        [x, z],
      );
    };
    const close = async () => {
      if (await page.locator("#modal").isVisible())
        await page.click("#close-modal");
    };
    const craft = async (id) => {
      await key("Tab");
      await page.click('[data-action="panel"][data-id="craft"]');
      await page.click(`[data-action="craft"][data-id="${id}"]`);
      await close();
    };
    const travel = async (id) => {
      await key("m");
      await page.click(`[data-action="travel"][data-id="${id}"]`);
      await page.waitForFunction(
        (id) => !__SA.game.transit && __SA.game.island.id === id,
        id,
      );
    };
    const gather = async (island) => {
      const resources = await page.evaluate(
        async (island) =>
          (await import("./src/core.js")).WORLD.resources.filter(
            (r) => r.island === island,
          ),
        island,
      );
      for (const r of resources) {
        await teleport(r.x, r.z);
        await key("e");
        await close();
      }
      console.log("gathered island", island);
    };
    const fight = async (id, name) => {
      for (let n = 0; n < 40; n++) {
        const e = await page.evaluate((id) => {
          const e = __SA.game.wild.find((e) => e.id === id);
          return {
            x: e.x,
            z: e.z,
            hp: e.hp,
            type: e.type,
            health: __SA.game.s.player.hp,
          };
        }, id);
        const threshold =
          e.type === "tempest" ? 92 : e.type === "frost" ? 80.5 : 25.2;
        if (e.hp <= threshold) break;
        await teleport(e.x, e.z + 2.4);
        if (e.health < 60) await key("1");
        await key("j");
        await page.waitForTimeout(500);
      }
      await screenshot(name);
      await key("q");
      await page.waitForFunction(
        (id) => __SA.game.s.captured.includes(id),
        id,
        { timeout: 8000 },
      );
    };
    const startX = await page.evaluate(() => __SA.game.s.player.x);
    await page.keyboard.down("d");
    await page.waitForTimeout(600);
    await page.keyboard.up("d");
    assert.ok((await page.evaluate(() => __SA.game.s.player.x)) > startX + 1);
    await teleport(3, 23);
    await key("e");
    assert.equal(await page.evaluate(() => __SA.game.s.flags.met), true);
    await close();
    await fight("fox1", "first-capture");
    await gather(0);
    await teleport(0, 25);
    await page.evaluate(() => (__SA.game.s.player.angle = Math.PI));
    await key("b");
    await page.click('[data-action="blueprint"][data-id="campfire"]');
    await page.evaluate(() => {
      const g = __SA.game;
      for (let x = -5; x < 5; x++)
        for (let z = 21; z < 30; z++)
          if (g.canBuild("campfire", x, z)) {
            Object.assign(g.s.player, { x, z: z + 4.2, angle: Math.PI });
            return;
          }
    });
    await key("e");
    assert.equal(
      await page.evaluate(() =>
        __SA.game.s.buildings.some((b) => b.kind === "campfire"),
      ),
      true,
    );
    await screenshot("camp");
    await craft("spear");
    await craft("raft");
    await craft("saddle");
    await craft("coat");
    await key("r");
    assert.equal(await page.evaluate(() => __SA.game.mount), true);
    await key("r");
    await key("Tab");
    await screenshot("inventory");
    await page.click('[data-action="panel"][data-id="companions"]');
    await screenshot("companions");
    await close();
    await key("m");
    await screenshot("map");
    await close();
    await travel(1);
    await screenshot("frost-island");
    await gather(1);
    await fight("frost1", "guardian");
    await craft("sky");
    await teleport(94, -18);
    await key("r");
    assert.equal(await page.evaluate(() => __SA.game.fly), true);
    await page.keyboard.down("w");
    await page.waitForTimeout(800);
    await page.keyboard.up("w");
    await screenshot("flight");
    await travel(2);
    await screenshot("storm-island");
    await fight("boss", "boss-fight");
    assert.equal(await page.evaluate(() => __SA.game.s.flags.won), true);
    assert.equal(
      await page.locator("#modal-title").innerText(),
      "嵐の、その先に。",
    );
    await screenshot("ending");
    await page.click('[data-action="close"]');
    await key("Escape");
    await page.click('[data-action="save"]');
    await close();
    const record = await page.evaluate(() => ({
      wood: __SA.game.s.inventory.wood,
      captured: __SA.game.s.captured,
      buildings: __SA.game.s.buildings.length,
    }));
    await page.reload();
    await page.waitForFunction(() => window.__SA?.view.loaded);
    await page.click("#continue");
    assert.equal(await page.evaluate(() => __SA.game.s.flags.won), true);
    assert.deepEqual(
      await page.evaluate(() => ({
        wood: __SA.game.s.inventory.wood,
        captured: __SA.game.s.captured,
        buildings: __SA.game.s.buildings.length,
      })),
      record,
    );
    await key("Tab");
    const dl = page.waitForEvent("download");
    await page.click('[data-action="export"]');
    const file = await dl;
    const filename = new URL(
      "../test-results/roundtrip-save.json",
      import.meta.url,
    ).pathname;
    await file.saveAs(filename);
    await page.click('[data-action="panel"][data-id="settings"]');
    await page.setInputFiles("#save-file", filename);
    await page.click('[data-action="importConfirmed"]');
    assert.equal(await page.evaluate(() => __SA.game.s.flags.won), true);
    await page.evaluate(() => {
      __SA.game.invulnerable = 0;
      __SA.game.damage(1000);
    });
    await page.waitForSelector('[data-action="respawn"]');
    await page.click('[data-action="respawn"]');
    assert.equal(await page.evaluate(() => __SA.game.dead), false);
    assert.equal(await page.evaluate(() => __SA.game.s.flags.won), true);
    await key("Escape");
    const time = await page.evaluate(() => __SA.game.s.time);
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => __SA.game.s.time), time);
    await close();
    await page.setViewportSize({ width: 1024, height: 720 });
    await key("Tab");
    await screenshot("small-window");
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await close();
    await key("Tab");
    await page.click('[data-action="panel"][data-id="settings"]');
    await page.setInputFiles("#save-file", {
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":999}'),
    });
    assert.equal(await page.evaluate(() => __SA.game.s.flags.won), true);
    assert.equal(await page.evaluate(() => __SA.panel), "settings");
    await page.selectOption("#quality-setting", "low");
    assert.equal(
      await page.evaluate(() => __SA.view.renderer.shadowMap.enabled),
      false,
    );
    await page.selectOption("#quality-setting", "medium");
    await close();
    await page.evaluate(async () => {
      const { SAVE_KEY } = await import("./src/data.js");
      localStorage.setItem(SAVE_KEY, "broken-save");
    });
    await page.reload();
    await page.waitForFunction(() => window.__SA?.view.loaded);
    await page.click("#continue");
    assert.equal(await page.evaluate(() => __SA.game.s.flags.won), true);
    await page.setViewportSize({ width: 1440, height: 900 });
    await travel(0);
    await page.evaluate(() => {
      const g = __SA.game,
        b = g.s.buildings[0];
      Object.assign(g.s.player, { x: b.x + 2, z: b.z + 3, angle: Math.PI });
      g.s.time = 300;
    });
    await page.waitForTimeout(2600);
    await screenshot("night-camp");
    assert.deepEqual(errors, []);
    console.log(
      "PASS: browser campaign, UI controls, gathering economy, endgame, save/reload, export/import, death recovery, pause, compact viewport",
    );
  }
  console.log(
    JSON.stringify(
      {
        errors,
        info: await page.evaluate(() => ({
          fps: __SA.view.fps,
          drawCalls: __SA.view.renderer.info.render.calls,
          triangles: __SA.view.renderer.info.render.triangles,
          player: __SA.game.s.player,
          assets: __SA.view.assets.size,
          animations: __SA.view.assets
            .get("creatures/Fox.gltf")
            .animations.map((a) => a.name),
        })),
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
