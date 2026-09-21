import { Game, newState, validateSave, WORLD } from "./core.js";
import { View } from "./view.js";
import { Sound } from "./audio.js";
import {
  SAVE_KEY,
  DAY_SECONDS,
  ISLANDS,
  SPECIES,
  ITEMS,
  RECIPES,
  BUILDINGS,
  QUESTS,
  clamp,
  dist,
  heightAt,
  CAVES,
} from "./data.js";

const $ = (s) => document.querySelector(s),
  show = (s, on = true) => ($(s).hidden = !on);
const txt = (s, v) => {
  const e = $(s);
  if (e.textContent !== String(v)) e.textContent = v;
};
const fill = (s, v) => ($(s).style.width = `${clamp(v, 0, 100)}%`);
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let game = new Game(),
  view,
  started = false,
  panel = null,
  build = null,
  saved = null,
  saveError = false,
  lastSave = 0,
  lastHud = 0,
  lastFrame = performance.now();
const keys = new Set(),
  sound = new Sound();
let dodge = false,
  drag = null,
  previousFocus = null;
const tabs = {
  bag: "もちもの",
  craft: "ものを作る",
  companions: "なかま",
  build: "家づくり",
  map: "ちず",
  journal: "たびのめも",
  settings: "せってい",
};
const titleNames = {
  ...tabs,
  pause: "ひと息、つこう。",
  rest: "たき火のそばで",
  dialog: "しまのあんない人",
  death: "もう一度、海のかぜの中へ。",
  win: "あらしの むこうへ。",
  new: "新しいたびをはじめますか？",
  import: "たびのきろくをひらきますか？",
};
let pendingImport = null;

function toast(message, good = false) {
  if (panel === "win") return;
  const e = document.createElement("div");
  e.className = "toast" + (good ? " good" : "");
  e.textContent = message;
  $("#toasts").append(e);
  while ($("#toasts").children.length > 2) $("#toasts").firstChild.remove();
  setTimeout(() => e.remove(), 3900);
}
function readSave() {
  for (const key of [SAVE_KEY, `${SAVE_KEY}.backup`]) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const s = validateSave(JSON.parse(raw));
        if (key.endsWith(".backup"))
          toast("ひとつ前の きろくから つづけられるよ。");
        return s;
      }
    } catch (e) {
      console.warn("Save recovery:", e.message);
    }
  }
  return null;
}
function save(manual = false) {
  if (!started) return false;
  try {
    const state = structuredClone(game.s);
    if (game.capture) state.inventory.rune++;
    state.lastSaved = new Date().toISOString();
    validateSave(state);
    const old = localStorage.getItem(SAVE_KEY);
    if (old) {
      try {
        validateSave(JSON.parse(old));
        localStorage.setItem(`${SAVE_KEY}.backup`, old);
      } catch {
        /* Never replace a valid backup with corrupted data. */
      }
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    game.s.lastSaved = state.lastSaved;
    saved = state;
    saveError = false;
    lastSave = game.s.playtime;
    if (manual) toast("たびをきろくしました。", true);
    return true;
  } catch (e) {
    if (manual || !saveError)
      toast("きろくできないよ。「せってい」で「外に のこす」を えらんでね。");
    saveError = true;
    return false;
  }
}
function exportSave() {
  const blob = new Blob([JSON.stringify(game.s, null, 2)], {
      type: "application/json",
    }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = `survival-animals-day${game.s.day}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("たびのきろくを外に のこしたよ。", true);
}
function applySettings() {
  sound.enabled = game.s.settings.sound;
  view?.quality(game.s.settings.quality);
}
function launch(state) {
  game = new Game(state);
  started = true;
  build = null;
  panel = null;
  keys.clear();
  lastSave = game.s.playtime;
  show("#title", false);
  show("#hud");
  show("#modal", false);
  applySettings();
  sound.start();
  view.target.set(game.s.player.x, 2, game.s.player.z);
  view.camera.position.set(game.s.player.x + 3, 9, game.s.player.z + 12);
  toast("WASD でうごく。↑↓←→で 見まわせるよ。");
  if (game.dead) openPanel("death");
  else save();
}
function closePanel() {
  if (panel === "death") return;
  if (panel === "win") save();
  panel = null;
  show("#modal", false);
  game.paused = !started;
  keys.clear();
  previousFocus?.focus({ preventScroll: true });
}
function openPanel(name, html = null) {
  if (!view?.loaded) return;
  previousFocus = document.activeElement;
  panel = name;
  if (name === "win") $("#toasts").replaceChildren();
  game.paused = true;
  keys.clear();
  dodge = false;
  show("#modal");
  txt("#modal-title", titleNames[name] || name);
  txt(
    "#modal-eyebrow",
    name === "win"
      ? "おめでとう！"
      : name === "death"
        ? "もう一回 やってみよう"
        : "たびの のーと",
  );
  $("#close-modal").hidden = name === "death";
  $("#tabs").innerHTML =
    started && tabs[name]
      ? Object.entries(tabs)
          .map(
            ([id, label]) =>
              `<button data-action="panel" data-id="${id}" class="${name === id ? "active" : ""}">${label}</button>`,
          )
          .join("")
      : "";
  $("#modal-body").innerHTML = html ?? panelContent(name);
  requestAnimationFrame(() =>
    ($("#modal-body button:not([disabled])") || $("#close-modal")).focus({
      preventScroll: true,
    }),
  );
}
const button = (label, action, id = "", style = "primary", disabled = false) =>
  `<button class="${style}" data-action="${action}" data-id="${id}" ${disabled ? "disabled" : ""}>${label}</button>`;
const cost = (c) =>
  `<div class="cost">${Object.entries(c)
    .map(
      ([k, n]) =>
        `<span class="${game.s.inventory[k] < n ? "missing" : ""}">${ITEMS[k].name} ${game.s.inventory[k]} / ${n}</span>`,
    )
    .join("")}</div>`;
function panelContent(name) {
  const s = game.s;
  if (name === "bag")
    return `<p class="section-note">${s.day}日目のたくさん とれるもの：${ITEMS[game.sleepBonus].name}。木や石は 次の日に またとれるよ。いくつでも もてるよ。</p><div class="inventory-grid">${Object.entries(
      ITEMS,
    )
      .map(
        ([id, i]) =>
          `<div class="inventory-item"><span class="symbol" style="color:${i.color}">${i.icon}</span><div><strong>${i.name}</strong><b>${s.inventory[id]}</b></div></div>`,
      )
      .join(
        "",
      )}</div><h3 class="section-title">たびのどうぐ</h3><div class="equipment">${
      RECIPES.filter((r) => r.gear && s.gear[r.gear])
        .map((r) => `<span>${r.icon} ${r.name}</span>`)
        .join("") ||
      "<small>まだありません。ものを作るのところから作れます。</small>"
    }</div><div class="menu-actions">${button("食べて元気になる", "eat")}${button("たびをきろく", "save", "", "secondary")}${button("きろくを外に のこす", "export", "", "secondary")}</div>`;
  if (name === "craft")
    return `<p class="section-note">作った どうぐは すぐ つかえるよ。ごはんは たき火の近くで 作ろう。</p><div class="grid">${RECIPES.map(
      (r) => {
        const made = r.gear && s.gear[r.gear],
          locked = r.unlock && !s.companions[r.unlock],
          station =
            r.station &&
            !s.buildings.some(
              (b) => b.kind === r.station && dist(s.player, b) < 10,
            );
        return `<article class="card"><span class="symbol">${r.icon}</span><h3>${r.name}</h3><p>${r.description}</p>${cost(r.cost)}${button(made ? "もう 作ったよ" : locked ? "大きなぼすとのきずながひつよう" : station ? "たき火の近くでものを作る" : "作る", "craft", r.id, "primary", made || locked || station || !game.canPay(r.cost))}</article>`;
      },
    ).join("")}</div>`;
  if (name === "companions")
    return `<p class="section-note">なかまは いっしょに たたかってくれるよ。F で大わざ、2 でごはん、R で のる。元気が なくなったら ごはんや たき火で 休もう。</p><div class="grid">${Object.entries(
      SPECIES,
    )
      .map(([id, sp]) => {
        const c = s.companions[id];
        return `<article class="card"><span class="symbol">${c ? "♧" : "◇"}</span><h3>${sp.name}${s.active === id ? '<span class="badge">いっしょにいる</span>' : ""}</h3><small>${sp.element} / ${c ? `つよさ ${c.level} · 体力 ${Math.ceil(c.hp)}%` : "まだ なかまではないよ"}</small><p>${sp.description}</p>${c ? `<div class="bar"><i style="width:${c.hp}%"></i></div>${button("いっしょに行く", "select", id, "secondary", s.active === id)}${button("ごはんをあげる", "feed", id, "primary", s.inventory.berry + s.inventory.meal === 0)}` : "<small>よわらせて、近くで Q をおそう。</small>"}</article>`;
      })
      .join("")}</div>`;
  if (name === "build")
    return `<p class="section-note">作るものを えらぼう。みどりのところで E をおすと おけるよ。Esc で やめる。作ったものの近くで E をおすと つかえるよ。</p><div class="grid">${Object.entries(
      BUILDINGS,
    )
      .map(
        ([id, b]) =>
          `<article class="card"><span class="symbol">${b.icon}</span><h3>${b.name}</h3><p>${b.description}</p>${cost(b.cost)}${button("おくところを えらぶ", "blueprint", id, "primary", !game.canPay(b.cost))}</article>`,
      )
      .join("")}</div><h3 class="section-title">近くの作ったもの</h3>${
      s.buildings
        .filter((b) => dist(b, s.player) < 10)
        .map(
          (b) =>
            `<div class="list-row"><span>${BUILDINGS[b.kind].name}</span>${button("かたづける / ざいりょうを半分もどる", "remove", b.id, "text-button")}</div>`,
        )
        .join("") || "<small>近くに作ったものはありません。</small>"
    }`;
  if (name === "map")
    return `<p class="section-note">行きたいしまを おしてね。ふねは はじめから つかえるよ！ どうくつの おくには 大きなぼすが いるよ。</p><div class="map-layout"><div class="world-map">${worldMap()}</div><div class="island-list">${[
      ...ISLANDS,
    ]
      .sort((a, b) => Number(b.id >= 3) - Number(a.id >= 3))
      .map((i) => {
        const c = CAVES.find((c) => c.island === i.id);
        return `<article class="island-card"><small>${c ? "どうくつと 大きなぼす" : i.en}</small><h3>${i.name}</h3><p>${i.description}</p>${c ? `<small>${s.companions[c.boss] ? "★ ぼすと なかまになった！" : "◇ どうくつを さがそう"}</small><br>` : ""}${button(game.island.id === i.id ? "海のそばに もどる" : game.canTravel(i.id) ? "このしまへ 行く" : "空のくらが ひつよう", "travel", i.id, "primary", !game.canTravel(i.id))}</article>`;
      })
      .join("")}</div></div>`;
  if (name === "journal")
    return `<p class="section-note">あらしのおおかみを なかまにするのが さいしょの めあてだよ。ほかのしまの どうくつにも 行ってみよう。こまったら みなに 話そう。</p>${QUESTS.slice(
      0,
      7,
    )
      .map(
        (q, n) =>
          `<div class="list-row"><div><small>${String(n + 1).padStart(2, "0")} ${q.test(s) ? "✓ できた" : n === game.questIndex ? "→ つぎ" : ""}</small><h3>${q.title}</h3><p class="section-note">${q.detail}</p></div></div>`,
      )
      .join(
        "",
      )}<h3 class="section-title">たびのきろく</h3><p class="section-note">${Math.floor(s.playtime / 60)}分 / ${s.stats.gathered}こあつめる / ${Object.keys(s.companions).length}しゅるいときずな / たすけてもらった ${s.stats.deaths}回</p>`;
  if (name === "settings")
    return `<div class="settings-row"><label for="sound-setting">おんがくと 音</label><input id="sound-setting" type="checkbox" ${s.settings.sound ? "checked" : ""}></div><div class="settings-row"><label for="quality-setting">がめんの きれいさ</label><select id="quality-setting">${[
      ["low", "かるい / かげなし"],
      ["medium", "ふつう"],
      ["high", "とても きれい"],
    ]
      .map(
        ([id, label]) =>
          `<option value="${id}" ${s.settings.quality === id ? "selected" : ""}>${label}</option>`,
      )
      .join(
        "",
      )}</select></div><div class="settings-row"><label for="sensitivity-setting">見まわす はやさ</label><input id="sensitivity-setting" type="range" min="0.4" max="2" step="0.1" value="${s.settings.sensitivity}"></div><h3 class="section-title">あそびかた</h3><div class="controls-grid">${[
      ["WASD", "うごく"],
      ["↑↓←→", "見まわす"],
      [
        "右をおしたまま うごかす / まんなかの くるくる",
        "見まわす / 近くや とおく",
      ],
      ["J / 左をおす", "近くでこうげき"],
      ["Space / Shift", "よける / 走る"],
      ["C 長くおす", "しゃがみ・こっそりこうげき"],
      ["E / Q", "話す・あつめる / なかまにする"],
      ["F / R", "なかまの大わざ / のる"],
      ["1 / 2", "食べる / なかまにごはん"],
      ["Tab / B / M", "もちもの / 家づくり / ちず"],
      ["Esc", "お休み / とじる"],
    ]
      .map(([k, v]) => `<div><kbd>${k}</kbd>${v}</div>`)
      .join(
        "",
      )}</div><p class="section-note" style="margin-top:20px">赤いまるが 出たら Space で よこへにげよう。体力を35%までへらすと なかまにできるよ。大きなぼすは20%まで。体力が0でも だいじょうぶ。ねている どうぶつには C でそっと近づこう。</p><h3 class="section-title">きろくを のこす</h3><p class="section-note">${s.lastSaved ? "さいごのきろく：" + escape(new Date(s.lastSaved).toLocaleString("ja-JP")) : "まだきろくされていません。"}<br>いつもと 同じがめんで つづきから あそべるよ。大人と いっしょに、きろくを 外にも のこしておこう。</p><div class="menu-actions">${started ? button("きろく", "save") + button("外に のこす", "export", "", "secondary") : ""}${button("きろくを ひらく", "importFile", "", "secondary")}</div><h3 class="section-title">つくったひと</h3><p class="credits">木や家を つくったひと： <a href="https://kenney.nl/assets" target="_blank" rel="noopener">けにー</a><br>どうぶつを つくったひと： <a href="https://quaternius.com/packs/ultimateanimatedanimals.html" target="_blank" rel="noopener">くあてにうす</a><br>あそびを うごかすしくみ： <a href="https://threejs.org/" target="_blank" rel="noopener">すりー じぇいえす</a><br>海や山、人、音などは このあそびのために 作りました。お金は かかりません。</p>`;
  if (name === "pause")
    return `<p class="dialog-text">いまは たびを お休みしているよ。<br>じぶんの はやさで、しまを 歩こう。</p><div class="menu-actions">${button("たびにもどる", "close")}${button("きろくする", "save", "", "secondary")}${button("せってい・あそびかた", "panel", "settings", "secondary")}${button("はじめのがめんへ", "title", "", "secondary")}</div>`;
  if (name === "rest")
    return `<p class="dialog-text">火のそばなら、さむさも少しやわらぐ。<br>朝まで休むと体力となかまがぜんぶ もどり、しまの木や石がもどるよ。</p><div class="menu-actions">${button("朝まで休む", "rest")}${button("ごはんをつくる", "panel", "craft", "secondary")}${button("たびにもどる", "close", "", "secondary")}</div>`;
  if (name === "death")
    return `<p class="dialog-text">みなが たすけてくれたよ。<br>木や石が 少しへるけど、なかま・どうぐ・家は なくならないよ。</p><div class="menu-actions">${button("海のそばからもう一回 はじめる", "respawn")}</div>`;
  if (name === "win")
    return `<div class="ending"><div class="seal">✧</div><p class="eyebrow">もう ひとりじゃない。</p><h3>いちばん 大きなあいてが、なかまになった。</h3><p>あらしのおおかみが、あなたの手に ふれた。<br>いっしょに たすけあって、生きていこう。<br>それが このしまの 大切なたからもの。</p><div class="record"><div><strong>${s.day}</strong><small>あそんだ日</small></div><div><strong>${Object.keys(s.companions).length}</strong><small>なかまの数</small></div><div><strong>${Math.floor(s.playtime / 60)}</strong><small>あそんだ時間</small></div></div>${button("なかまたちとたびをつづける", "close")}<p class="credits">おしまい。そして、つぎのたびへ。<br>ほかのしまや どうくつにも 行ってみよう。たびは まだまだ つづくよ。</p></div>`;
  if (name === "new")
    return `<p class="dialog-text">いまの たびのきろくが 新しくなるよ。のこしたいときは、先に「外に のこす」を えらんでね。</p><div class="menu-actions">${button("新しいたびをはじめる", "newConfirmed")}${button("もどる", "close", "", "secondary")}</div>`;
  if (name === "import")
    return `<p class="dialog-text">${pendingImport.day}日目、${Object.keys(pendingImport.companions).length}しゅるいのなかまがいるたびです。いまの たびを このきろくに かえるよ。</p><div class="menu-actions">${button("このきろくで あそぶ", "importConfirmed")}${button("やめる", "close", "", "secondary")}</div>`;
  return "";
}
function worldMap() {
  const mx = (x) => 173 + x * 0.73,
    my = (z) => 155 + z * 0.77;
  return `<svg viewBox="0 0 400 310" role="img" aria-label="6つのしまの ちず"><rect width="400" height="310" fill="#123641"/><path d="M86 155H173L265 141 329 63 M173 155V249L265 240 265 141" fill="none" stroke="#d0d9a5" stroke-dasharray="5 6" opacity=".6"/>${ISLANDS.map((i) => `<g role="button" tabindex="0" data-action="travel" data-id="${i.id}" aria-label="${i.name}へ 行く" style="cursor:pointer"><ellipse cx="${mx(i.x)}" cy="${my(i.z)}" rx="${i.r * 0.65}" ry="${i.r * 0.5}" fill="${i.color}" fill-opacity="${game.canTravel(i.id) ? ".65" : ".2"}" stroke="${i.color}"/><text x="${mx(i.x)}" y="${my(i.z) + 4}" fill="#fff5cf" text-anchor="middle" font-size="17">${i.id >= 3 ? "◠" : game.canTravel(i.id) ? "◬" : "◇"}</text><text x="${mx(i.x)}" y="${my(i.z) + i.r * 0.5 + 15}" fill="#e4f3dd" text-anchor="middle" font-size="12">${i.name}</text></g>`).join("")}<circle cx="${mx(game.s.player.x)}" cy="${my(game.s.player.z)}" r="4" fill="#fff5b0" stroke="#263b35"/><text x="16" y="22" fill="#d6e5da" font-size="12">行きたいしまを おしてね</text><text x="348" y="23" fill="#d6e5da" font-size="12">きた ↑</text><text x="16" y="301" fill="#bad4c7" font-size="11">● いま いるところ　◠ どうくつ</text></svg>`;
}
function place() {
  if (!build) return;
  const p = view.buildPosition(game);
  if (game.build(build, p.x, p.z)) {
    build = null;
    save();
  }
  processEvents();
}
function act(action, id) {
  sound.start();
  switch (action) {
    case "panel":
      openPanel(id);
      return;
    case "close":
      closePanel();
      return;
    case "craft":
      game.craft(id);
      break;
    case "blueprint":
      build = id;
      closePanel();
      toast("みどりのところで E をおすと おけるよ。Esc でやめる。");
      return;
    case "remove":
      game.removeBuilding(id);
      break;
    case "eat":
      game.eat();
      break;
    case "feed":
      game.feed(id || game.s.active);
      break;
    case "select":
      game.select(id);
      break;
    case "save":
      save(true);
      break;
    case "export":
      exportSave();
      return;
    case "importFile":
      $("#save-file").click();
      return;
    case "importConfirmed":
      launch(pendingImport);
      pendingImport = null;
      toast("たびをきろくの よみこみました。", true);
      return;
    case "travel":
      if (game.travel(Number(id))) closePanel();
      break;
    case "rest":
      if (game.rest()) closePanel();
      break;
    case "respawn":
      game.respawn();
      save();
      panel = null;
      closePanel();
      break;
    case "newConfirmed":
      launch(newState());
      return;
    case "title":
      save();
      started = false;
      game.paused = true;
      panel = null;
      build = null;
      show("#modal", false);
      show("#hud", false);
      show("#title");
      show("#continue", !!saved);
      return;
    case "attack":
      if (build) place();
      else game.attack();
      break;
    case "capture":
      game.startCapture();
      break;
    case "mount":
      game.toggleMount();
      break;
  }
  processEvents();
  if (panel && tabs[panel]) openPanel(panel);
  updateHud();
}
document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-action]");
  if (a) act(a.dataset.action, a.dataset.id);
  const p = e.target.closest("[data-panel]");
  if (p) openPanel(p.dataset.panel);
  const k = e.target.closest("[data-key]");
  if (k && !panel) act(k.dataset.key);
});
$("#start").onclick = () => (saved ? openPanel("new") : launch(newState()));
$("#continue").onclick = () => {
  if (saved) launch(validateSave(saved));
};
$("#title-options").onclick = () => openPanel("settings");
$("#pause-button").onclick = () => openPanel("pause");
$("#close-modal").onclick = closePanel;
$("#save-file").onchange = async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    if (file.size > 1000000) throw Error("きろくの ふくろが大きすぎます。");
    pendingImport = validateSave(JSON.parse(await file.text()));
    openPanel("import");
  } catch (err) {
    toast("きろくを ひらけなかったよ。正しい きろくを えらんでね。");
  }
};
document.addEventListener("change", (e) => {
  if (e.target.id === "sound-setting") game.s.settings.sound = e.target.checked;
  if (e.target.id === "quality-setting")
    game.s.settings.quality = e.target.value;
  if (e.target.id === "sensitivity-setting")
    game.s.settings.sensitivity = Number(e.target.value);
  if (e.target.id.endsWith("-setting")) {
    sound.start();
    applySettings();
    if (started) save();
  }
});
function processEvents() {
  for (const e of game.drain()) {
    sound.play(e.type);
    if (["gather", "hit", "impact", "skill", "captured"].includes(e.type))
      view.burst(
        e.x,
        e.z,
        e.color || "#9bf5d3",
        e.type === "captured" ? 45 : 14,
      );
    if (e.type === "damage") {
      show("#warning", false);
      $("#hurt").classList.add("active");
      setTimeout(() => $("#hurt").classList.remove("active"), 220);
    }
    if (e.type === "dialog") {
      openPanel(
        "dialog",
        `<p class="eyebrow">${escape(e.speaker)}</p><p class="dialog-text">${escape(e.text)}</p><div class="menu-actions">${button("たびへ", "close")}</div>`,
      );
      save();
    } else if (e.type === "menu") openPanel(e.text);
    else if (e.type === "death") {
      save();
      openPanel("death");
    } else if (e.type === "win") {
      save();
      openPanel("win");
    } else if (e.type === "discovery") {
      txt("#discovery h2", e.text.replace("を見つけた", ""));
      show("#discovery");
      setTimeout(() => show("#discovery", false), 3500);
      save();
    } else if (
      e.text &&
      !["hit", "swing", "warning", "impact"].includes(e.type)
    )
      toast(e.text, ["captured", "quest", "craft"].includes(e.type));
    if (["captured", "craft", "build", "rest", "arrive"].includes(e.type))
      save();
  }
}
function updateHud() {
  if (!started) return;
  const s = game.s,
    p = s.player,
    i = game.island,
    q = game.quest;
  txt("#island-en", i.en);
  txt("#island-name", game.cave?.name || i.name);
  txt(
    "#quest-no",
    game.questIndex === 7
      ? "できた！"
      : `${String(game.questIndex + 1).padStart(2, "0")} / 07`,
  );
  const cave = CAVES.find((c) => c.island === i.id);
  txt(
    "#quest-title",
    cave
      ? game.s.companions[cave.boss]
        ? "大きな なかまが できた！"
        : game.cave
          ? "どうくつの おくへ"
          : "どうくつに 行こう"
      : q.title,
  );
  txt(
    "#quest-detail",
    cave
      ? game.s.companions[cave.boss]
        ? "M のちずで、つぎのしまにも 行ってみよう。"
        : game.cave
          ? `${SPECIES[cave.boss].name}が いるよ。赤いまるから にげよう！`
          : "しまのまん中の 大きな入口へ。E で 入れるよ。"
      : q.detail,
  );
  const minutes = Math.floor((s.time / DAY_SECONDS) * 1440);
  txt(
    "#time",
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
  );
  txt("#day", `${s.day}日目`);
  txt("#time-icon", game.night ? "☾" : "☀");
  txt(
    "#weather",
    i.id === 1
      ? "こおり · −3°C"
      : i.id === 2
        ? "あらしのようす · 14°C"
        : game.night
          ? "星明かり · 16°C"
          : "海のかぜ · 24°C",
  );
  for (const [id, value] of [
    ["health", p.hp],
    ["stamina", p.stamina],
    ["hunger", p.hunger],
  ]) {
    txt(`#${id}`, Math.ceil(value));
    fill(`#${id}-fill`, value);
  }
  txt("#food-count", `食べもの ${s.inventory.meal + s.inventory.berry}`);
  txt("#rune-count", `なかま ${s.inventory.rune}`);
  txt(
    "#status-tags",
    [
      game.cold
        ? "❄ さむさ：あたたかい ふくかたき火を"
        : game.warm
          ? "♨ あたたかさで元気になる中"
          : "",
      p.hunger < 25 ? "食べものがひつようです" : "",
      game.stealth ? "しゃがみ / こっそりこうげき" : "",
      game.fly
        ? "空を とんでいる"
        : game.mount
          ? "のる中"
          : game.boat
            ? "いかだで海を すすむ"
            : "",
    ]
      .filter(Boolean)
      .join(" · "),
  );
  const c = game.context();
  show("#interaction", !!c && !build && !game.capture && !game.transit);
  if (c) txt("#interaction span", c.name);
  show("#capture-progress", !!game.capture);
  if (game.capture) fill("#capture-progress i", (game.capture.time / 2) * 100);
  show("#ally", !!game.companion);
  if (game.companion) {
    txt("#ally-title", `なかま / つよさ ${game.companion.level}`);
    txt("#ally-name", SPECIES[s.active].name);
    fill("#ally-fill", game.companion.hp);
    txt(
      "#skill-status",
      game.companionCooldown > 0
        ? Math.ceil(game.companionCooldown) + "s"
        : "F",
    );
  }
  const enemy = game.nearestCreature(14) || game.nearestEnemy(12);
  let visible = false;
  if (enemy) {
    const sp = SPECIES[enemy.type],
      pos = view.screenPosition(
        enemy.x,
        heightAt(enemy.x, enemy.z) + sp.size + 1,
        enemy.z,
      );
    visible =
      pos.visible &&
      pos.y > 90 &&
      pos.y < innerHeight - 170 &&
      pos.x > 120 &&
      pos.x < innerWidth - 120;
    if (visible) {
      $("#target").style.left = pos.x + "px";
      $("#target").style.top = pos.y + "px";
      txt(
        "#target-element",
        sp.element +
          " / " +
          (game.sleeping(enemy) ? "ねている" : "しまの どうぶつ"),
      );
      txt("#target-name", sp.name);
      fill("#target-fill", (enemy.hp / sp.hp) * 100);
      txt(
        "#target-status",
        s.companions[enemy.type]
          ? "すでになかまにした どうぶつ"
          : enemy.hp / sp.hp <= (sp.boss ? 0.2 : 0.35)
            ? "Q · なかまに できるよ"
            : game.sleeping(enemy)
              ? "C でそっと近づく → J こっそりこうげき"
              : "よわらせてなかまにする",
      );
    }
  }
  show("#target", visible && !panel && !SPECIES[enemy?.type]?.boss);
  const boss = game.wild.find(
    (e) =>
      SPECIES[e.type].boss &&
      dist(e, p) < 27 &&
      (e.island < 3 || game.cave?.island === e.island),
  );
  show("#boss", !!boss);
  if (boss) {
    txt("#boss h2", SPECIES[boss.type].name);
    fill("#boss-fill", (boss.hp / SPECIES[boss.type].hp) * 100);
    txt(
      "#boss small",
      boss.hp / SPECIES[boss.type].hp <= 0.2
        ? "Q · なかまに できるよ"
        : "大きなぼす",
    );
  }
  show(
    "#warning",
    !panel && game.wild.some((e) => e.mode === "windup" && dist(e, p) < 12),
  );
  show("#build-hint", !!build);
  if (build)
    txt(
      "#build-hint",
      `${BUILDINGS[build].name}をおく · E で おく · Escでもどる`,
    );
  txt(
    "#bearing",
    ["きた", "北東", "ひがし", "南東", "みなみ", "南西", "にし", "北西"][
      ((Math.round(-view.theta / (Math.PI / 4)) % 8) + 8) % 8
    ],
  );
  drawMinimap();
}
function drawMinimap() {
  const cv = $("#minimap"),
    ctx = cv.getContext("2d"),
    p = game.s.player,
    scale = 1.75;
  ctx.clearRect(0, 0, 180, 180);
  ctx.save();
  ctx.translate(90, 90);
  ctx.fillStyle = "#173c4b";
  ctx.fillRect(-90, -90, 180, 180);
  const point = (o, r, c) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc((o.x - p.x) * scale, (o.z - p.z) * scale, r, 0, Math.PI * 2);
    ctx.fill();
  };
  for (const i of ISLANDS)
    point(
      i,
      i.r * scale,
      i.id === 1 ? "#587f87" : i.id === 2 ? "#635b64" : "#526f57",
    );
  for (const r of WORLD.resources)
    if (game.s.harvested[r.id] !== game.s.day) point(r, 1.5, "#b6d99a");
  for (const b of game.s.buildings) point(b, 2.4, "#fae4ac");
  point({ x: 3, z: 22 }, 3, "#9be9d3");
  for (const e of game.wild)
    point(e, 2.3, SPECIES[e.type].boss ? "#ffb666" : "#e5a37e");
  for (const c of CAVES) point({ x: c.x, z: c.z + 17 }, 4, "#99f1df");
  if (game.quest.at)
    point({ x: game.quest.at[0], z: game.quest.at[1] }, 4, "#ffdd88");
  ctx.rotate(-p.angle);
  ctx.fillStyle = "#fff0c1";
  ctx.beginPath();
  ctx.moveTo(0, 7);
  ctx.lineTo(-4, -4);
  ctx.lineTo(4, -4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
window.addEventListener("keydown", (e) => {
  if (panel) {
    if (
      (e.code === "Enter" || e.code === "Space") &&
      e.target.matches('[role="button"][data-action="travel"]')
    ) {
      e.preventDefault();
      act("travel", e.target.dataset.id);
      return;
    }
    if (e.code === "Escape") {
      e.preventDefault();
      closePanel();
    }
    if (e.code === "Tab") {
      const els = [
        ...$("#modal").querySelectorAll(
          'button:not([disabled]):not([hidden]),input:not([hidden]),select,a[href],[role="button"][tabindex="0"]',
        ),
      ];
      if (els.length) {
        const first = els[0],
          last = els.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    return;
  }
  if (!started) return;
  if (
    [
      "Space",
      "Tab",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
    ].includes(e.code)
  )
    e.preventDefault();
  keys.add(e.code);
  if (e.repeat) return;
  if (e.code === "Escape") {
    if (build) build = null;
    else openPanel("pause");
    return;
  }
  const panels = { Tab: "bag", KeyB: "build", KeyM: "map" };
  if (panels[e.code]) {
    openPanel(panels[e.code]);
    return;
  }
  switch (e.code) {
    case "KeyE":
      if (build) place();
      else game.interact();
      break;
    case "KeyJ":
      if (build) place();
      else game.attack();
      break;
    case "KeyQ":
      game.startCapture();
      break;
    case "KeyF":
      game.command();
      break;
    case "KeyR":
      game.toggleMount();
      break;
    case "Digit1":
      game.eat();
      break;
    case "Digit2":
      game.feed();
      break;
    case "Space":
      dodge = true;
      break;
  }
  sound.start();
  processEvents();
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
  keys.clear();
  drag = null;
  if (started && !panel) openPanel("pause");
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    save();
    if (started && !panel) openPanel("pause");
  }
});
window.addEventListener("pagehide", () => save());
$("#world").addEventListener("contextmenu", (e) => e.preventDefault());
$("#world").addEventListener("pointerdown", (e) => {
  if (!started || panel) return;
  sound.start();
  if (e.button === 2) {
    drag = { x: e.clientX, y: e.clientY };
    e.target.setPointerCapture(e.pointerId);
  } else if (e.button === 0) act("attack");
});
$("#world").addEventListener("pointermove", (e) => {
  if (!drag || panel) return;
  const sensitivity = game.s.settings.sensitivity;
  view.theta -= (e.clientX - drag.x) * 0.005 * sensitivity;
  view.pitch = clamp(
    view.pitch + (e.clientY - drag.y) * 0.004 * sensitivity,
    0.12,
    1.15,
  );
  drag = { x: e.clientX, y: e.clientY };
});
$("#world").addEventListener("pointerup", () => (drag = null));
$("#world").addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    if (view && !panel)
      view.distance = clamp(view.distance + e.deltaY * 0.01, 6, 22);
  },
  { passive: false },
);
function frame(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  if (view?.loaded) {
    game.paused = !started || !!panel;
    if (started && !panel) {
      const sensitivity = game.s.settings.sensitivity;
      view.theta +=
        ((keys.has("ArrowLeft") ? 1 : 0) - (keys.has("ArrowRight") ? 1 : 0)) *
        dt *
        1.65 *
        sensitivity;
      view.pitch = clamp(
        view.pitch +
          ((keys.has("ArrowUp") ? 1 : 0) - (keys.has("ArrowDown") ? 1 : 0)) *
            dt *
            0.95 *
            sensitivity,
        0.12,
        1.15,
      );
    }
    const x = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0),
      z = (keys.has("KeyS") ? 1 : 0) - (keys.has("KeyW") ? 1 : 0);
    game.tick(dt, {
      x: x * Math.cos(view.theta) + z * Math.sin(view.theta),
      z: -x * Math.sin(view.theta) + z * Math.cos(view.theta),
      sprint: keys.has("ShiftLeft") || keys.has("ShiftRight"),
      stealth: keys.has("KeyC"),
      dodge,
    });
    dodge = false;
    processEvents();
    view.update(dt, game, { title: !started, build });
    if (now - lastHud > 80) {
      updateHud();
      lastHud = now;
    }
    if (started && !panel) {
      sound.tick(game.s.playtime, game.night);
      if (game.s.playtime - lastSave > 25) save();
    }
  }
  requestAnimationFrame(frame);
}
async function boot() {
  try {
    view = new View($("#world"));
    await view.load((progress) => {
      fill("#load-fill", progress * 100);
      txt("#load-status", `しまのようい ${Math.round(progress * 100)}%`);
    });
    saved = readSave();
    if (saved) {
      game = new Game(validateSave(saved));
      applySettings();
    }
    show("#loading", false);
    show("#title");
    show("#continue", !!saved);
    requestAnimationFrame(frame);
    if (new URLSearchParams(location.search).get("qa") === "1")
      window.__SA = {
        get game() {
          return game;
        },
        get view() {
          return view;
        },
        get panel() {
          return panel;
        },
        get build() {
          return build;
        },
        launch,
        openPanel,
        closePanel,
        save,
        processEvents,
        updateHud,
      };
  } catch (err) {
    console.error(err);
    txt(
      "#load-status",
      "うまく はじめられなかったよ。大人と いっしょに ひらきなおしてね。",
    );
    const p = document.createElement("p");
    p.className = "section-note";
    p.textContent = "もう一回 ひらいてみよう。こまったら 大人に きいてね。";
    $("#loading").append(p);
    const b = document.createElement("button");
    b.className = "primary";
    b.textContent = "もう一回 ひらく";
    b.onclick = () => location.reload();
    $("#loading").append(b);
  }
}
boot();
