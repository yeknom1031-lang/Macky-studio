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
  bag: "持ち物",
  craft: "製作",
  companions: "仲間",
  build: "建築",
  map: "海図",
  journal: "冒険日誌",
  settings: "設定",
};
const titleNames = {
  ...tabs,
  pause: "ひと息、つこう。",
  rest: "焚き火のそばで",
  dialog: "島の案内人",
  death: "もう一度、潮風の中へ。",
  win: "嵐の、その先に。",
  new: "新しい冒険をはじめますか？",
  import: "セーブデータを読み込みますか？",
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
          toast("前回のバックアップから復元できます。");
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
    if (manual) toast("冒険を保存しました。", true);
    return true;
  } catch (e) {
    if (manual || !saveError)
      toast("端末への保存ができません。設定からセーブを書き出してください。");
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
  toast("セーブデータを書き出しました。", true);
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
  toast("WASD で移動。浜辺のミナに近づいて E で話そう。");
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
      ? "JOURNEY COMPLETE"
      : name === "death"
        ? "THE ISLAND REMEMBERS YOU"
        : "FIELD JOURNAL",
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
    return `<p class="section-note">${s.day}日目の豊作：${ITEMS[game.sleepBonus].name}。採集した資源は翌日に戻ります。所持品の重量制限はありません。</p><div class="inventory-grid">${Object.entries(
      ITEMS,
    )
      .map(
        ([id, i]) =>
          `<div class="inventory-item"><span class="symbol" style="color:${i.color}">${i.icon}</span><div><strong>${i.name}</strong><b>${s.inventory[id]}</b></div></div>`,
      )
      .join(
        "",
      )}</div><h3 class="section-title">旅の装備</h3><div class="equipment">${
      RECIPES.filter((r) => r.gear && s.gear[r.gear])
        .map((r) => `<span>${r.icon} ${r.name}</span>`)
        .join("") || "<small>まだありません。製作タブから作れます。</small>"
    }</div><div class="menu-actions">${button("食べて回復", "eat")}${button("冒険を保存", "save", "", "secondary")}${button("データを書き出す", "export", "", "secondary")}</div>`;
  if (name === "craft")
    return `<p class="section-note">装備は製作すると自動で有効になります。料理は設置した焚き火の近くで作れます。</p><div class="grid">${RECIPES.map(
      (r) => {
        const made = r.gear && s.gear[r.gear],
          locked = r.unlock && !s.companions[r.unlock],
          station =
            r.station &&
            !s.buildings.some(
              (b) => b.kind === r.station && dist(s.player, b) < 10,
            );
        return `<article class="card"><span class="symbol">${r.icon}</span><h3>${r.name}</h3><p>${r.description}</p>${cost(r.cost)}${button(made ? "製作済み" : locked ? "守護獣との絆が必要" : station ? "焚き火の近くで製作" : "製作する", "craft", r.id, "primary", made || locked || station || !game.canPay(r.cost))}</article>`;
      },
    ).join("")}</div>`;
  if (name === "companions")
    return `<p class="section-note">同行する仲間は自動で加勢します。F で大技、2 で食事、R で騎乗。仲間は倒れても失われず、食事や焚き火で回復します。</p><div class="grid">${Object.entries(
      SPECIES,
    )
      .map(([id, sp]) => {
        const c = s.companions[id];
        return `<article class="card"><span class="symbol">${c ? "♧" : "◇"}</span><h3>${sp.name}${s.active === id ? '<span class="badge">同行中</span>' : ""}</h3><small>${sp.element} / ${c ? `Lv.${c.level} · 体力 ${Math.ceil(c.hp)}%` : "未発見の絆"}</small><p>${sp.description}</p>${c ? `<div class="bar"><i style="width:${c.hp}%"></i></div>${button("同行する", "select", id, "secondary", s.active === id)}${button("ごはんをあげる", "feed", id, "primary", s.inventory.berry + s.inventory.meal === 0)}` : "<small>弱らせて、近くで Q を押そう。</small>"}</article>`;
      })
      .join("")}</div>`;
  if (name === "build")
    return `<p class="section-note">設計図を選ぶと配置モードへ。緑色の場所に E / 左クリックで設置、Esc でキャンセル。建物の近くでは E で利用できます。</p><div class="grid">${Object.entries(
      BUILDINGS,
    )
      .map(
        ([id, b]) =>
          `<article class="card"><span class="symbol">${b.icon}</span><h3>${b.name}</h3><p>${b.description}</p>${cost(b.cost)}${button("設置場所を選ぶ", "blueprint", id, "primary", !game.canPay(b.cost))}</article>`,
      )
      .join("")}</div><h3 class="section-title">近くの建物</h3>${
      s.buildings
        .filter((b) => dist(b, s.player) < 10)
        .map(
          (b) =>
            `<div class="list-row"><span>${BUILDINGS[b.kind].name}</span>${button("撤去 / 資材を半分回収", "remove", b.id, "text-button")}</div>`,
        )
        .join("") || "<small>近くに建物はありません。</small>"
    }`;
  if (name === "map")
    return `<p class="section-note">島々は同じ3D世界につながっています。地図からの移動も可能。海ではいかだに自動乗船します。嵐冠の島は空のサドルで解放されます。</p><div class="map-layout"><div class="world-map">${worldMap()}</div><div>${ISLANDS.map((i) => `<article class="island-card"><small>${i.en}</small><h3>${i.name} ${s.visited.includes(i.id) ? '<span class="badge">発見済み</span>' : ""}</h3><p>${["温かな森と、最初の出会い。", "冷たい風の先に、角を輝かせる守護獣。", "嵐を越えた旅人を待つ、最後の絆。"][i.id]}</p>${button(game.island.id === i.id ? "浜辺へ戻る" : game.canTravel(i.id) ? "この島へ出発" : i.id === 1 ? "いかだが必要" : "空のサドルが必要", "travel", i.id, "secondary", !game.canTravel(i.id))}</article>`).join("")}</div></div>`;
  if (name === "journal")
    return `<p class="section-note">勝利条件はテンペストとの絆。すべての行動は後から取り戻せます。困ったら浜辺のミナへ。</p>${QUESTS.slice(
      0,
      7,
    )
      .map(
        (q, n) =>
          `<div class="list-row"><div><small>${String(n + 1).padStart(2, "0")} ${q.test(s) ? "✓ COMPLETE" : n === game.questIndex ? "→ NEXT" : ""}</small><h3>${q.title}</h3><p class="section-note">${q.detail}</p></div></div>`,
      )
      .join(
        "",
      )}<h3 class="section-title">旅の記録</h3><p class="section-note">${Math.floor(s.playtime / 60)}分 / ${s.stats.gathered}個採集 / ${Object.keys(s.companions).length}種と絆 / 救助 ${s.stats.deaths}回</p>`;
  if (name === "settings")
    return `<div class="settings-row"><label for="sound-setting">音楽・効果音</label><input id="sound-setting" type="checkbox" ${s.settings.sound ? "checked" : ""}></div><div class="settings-row"><label for="quality-setting">描画品質</label><select id="quality-setting">${[
      ["low", "軽量 / 影なし"],
      ["medium", "標準"],
      ["high", "高画質"],
    ]
      .map(
        ([id, label]) =>
          `<option value="${id}" ${s.settings.quality === id ? "selected" : ""}>${label}</option>`,
      )
      .join(
        "",
      )}</select></div><div class="settings-row"><label for="sensitivity-setting">視点の感度</label><input id="sensitivity-setting" type="range" min="0.4" max="2" step="0.1" value="${s.settings.sensitivity}"></div><h3 class="section-title">操作方法</h3><div class="controls-grid">${[
      ["WASD / ↑↓←→", "移動"],
      ["右ドラッグ / ホイール", "視点回転 / 距離"],
      ["J / 左クリック", "近接攻撃"],
      ["Space / Shift", "回避 / 走る"],
      ["C 長押し", "しゃがみ・不意打ち"],
      ["E / Q", "話す・採集 / 捕獲"],
      ["F / R", "仲間の大技 / 騎乗"],
      ["1 / 2", "食べる / 仲間にごはん"],
      ["Tab / B / M", "バッグ / 建築 / 海図"],
      ["Esc", "一時停止 / 閉じる"],
    ]
      .map(([k, v]) => `<div><kbd>${k}</kbd>${v}</div>`)
      .join(
        "",
      )}</div><p class="section-note" style="margin-top:20px">敵の攻撃予告中は横へ回避。捕獲は体力35%以下、テンペストは20%以下。倒し切っても捕獲できます。C で眠った獣に近づくと不意打ちダメージが上昇します。</p><h3 class="section-title">セーブ管理</h3><p class="section-note">${s.lastSaved ? "最終保存：" + escape(new Date(s.lastSaved).toLocaleString("ja-JP")) : "まだ保存されていません。"}<br>同じブラウザ・同じURLに自動保存。ブラウザのデータ削除に備え、書き出したファイルも保管してください。</p><div class="menu-actions">${started ? button("保存", "save") + button("書き出す", "export", "", "secondary") : ""}${button("読み込む", "importFile", "", "secondary")}</div><h3 class="section-title">CREDITS</h3><p class="credits">3D environment & props: <a href="https://kenney.nl/assets" target="_blank" rel="noopener">Kenney</a> · CC0<br>Animated animals: <a href="https://quaternius.com/packs/ultimateanimatedanimals.html" target="_blank" rel="noopener">Quaternius</a> · CC0<br>Engine: <a href="https://threejs.org/" target="_blank" rel="noopener">Three.js</a> · MIT<br>地形・海・主人公・装飾・UI・効果音は本ゲーム用に制作。外部の有料サービス、広告、課金、アカウントは使用しません。</p>`;
  if (name === "pause")
    return `<p class="dialog-text">冒険は一時停止しています。<br>あなたのペースで、島を歩こう。</p><div class="menu-actions">${button("冒険に戻る", "close")}${button("保存する", "save", "", "secondary")}${button("設定・操作方法", "panel", "settings", "secondary")}${button("タイトルへ", "title", "", "secondary")}</div>`;
  if (name === "rest")
    return `<p class="dialog-text">火のそばなら、寒さも少しやわらぐ。<br>朝まで休むと体力と仲間が全回復し、島の資源が戻ります。</p><div class="menu-actions">${button("朝まで休む", "rest")}${button("料理をつくる", "panel", "craft", "secondary")}${button("冒険に戻る", "close", "", "secondary")}</div>`;
  if (name === "death")
    return `<p class="dialog-text">島の案内人に救助されました。<br>資源の一部（20%）を失いますが、仲間・装備・建物は残ります。</p><div class="menu-actions">${button("浜辺から再開する", "respawn")}</div>`;
  if (name === "win")
    return `<div class="ending"><div class="seal">✧</div><p class="eyebrow">YOU ARE NOT ALONE.</p><h3>最強の獣は、最後の仲間に。</h3><p>あなたの差し出した手に、嵐の守護獣が応えた。<br>支配ではなく、共に生きること。<br>この島で見つけた、本当の強さ。</p><div class="record"><div><strong>${s.day}</strong><small>生き抜いた日</small></div><div><strong>${Object.keys(s.companions).length}</strong><small>結んだ絆</small></div><div><strong>${Math.floor(s.playtime / 60)}</strong><small>冒険の分数</small></div></div>${button("仲間たちと旅をつづける", "close")}<p class="credits">THE END — AND A NEW BEGINNING<br>探索・育成・拠点づくりは、この先も続けられます。</p></div>`;
  if (name === "new")
    return `<p class="dialog-text">現在の冒険は新しいデータに置き換わります。残しておきたい場合は、先に書き出してください。</p><div class="menu-actions">${button("新しい冒険をはじめる", "newConfirmed")}${button("戻る", "close", "", "secondary")}</div>`;
  if (name === "import")
    return `<p class="dialog-text">${pendingImport.day}日目、${Object.keys(pendingImport.companions).length}種の仲間がいる冒険です。現在の冒険をこのデータに置き換えます。</p><div class="menu-actions">${button("この冒険を読み込む", "importConfirmed")}${button("キャンセル", "close", "", "secondary")}</div>`;
  return "";
}
function worldMap() {
  const mx = (x) => 60 + x * 1.08,
    my = (z) => 245 + z * 1.12;
  return `<svg viewBox="0 0 370 340" role="img" aria-label="陽だまり・霧氷・嵐冠の三島を結ぶ海図"><defs><pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="#c2e2d4" stroke-opacity=".07"/></pattern></defs><rect width="370" height="340" fill="url(#grid)"/><path d="M60 245 Q130 205 196 225 T291 111" fill="none" stroke="#c5d8b0" stroke-width="1" stroke-dasharray="4 5"/>${ISLANDS.map((i) => `<g><ellipse cx="${mx(i.x)}" cy="${my(i.z)}" rx="${i.r * 0.73}" ry="${i.r * 0.6}" fill="${i.color}" fill-opacity="${game.canTravel(i.id) ? ".46" : ".13"}" stroke="${i.color}"/><text x="${mx(i.x)}" y="${my(i.z) + i.r * 0.9}" fill="#d4e6d7" text-anchor="middle" font-size="10">${i.name}</text><text x="${mx(i.x)}" y="${my(i.z) + 5}" fill="#f4ddac" text-anchor="middle" font-size="20">${game.canTravel(i.id) ? "◬" : "◇"}</text></g>`).join("")}<circle cx="${mx(game.s.player.x)}" cy="${my(game.s.player.z)}" r="5" fill="#f6e1a4" stroke="#18333a" stroke-width="2"/><text x="20" y="25" fill="#b9d3cd" font-size="10" letter-spacing="3">THE ARCHIPELAGO</text><text x="333" y="38" fill="#c7d5bc" font-size="12">N ↑</text><text x="20" y="322" fill="#94b9b5" font-size="9">● 現在地　 ┄ 航路</text></svg>`;
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
      toast("緑の場所に E / 左クリックで設置。Esc でキャンセル。");
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
      toast("冒険を読み込みました。", true);
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
    if (file.size > 1000000) throw Error("ファイルが大きすぎます。");
    pendingImport = validateSave(JSON.parse(await file.text()));
    openPanel("import");
  } catch (err) {
    toast("読み込めませんでした：" + err.message);
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
        `<p class="eyebrow">${escape(e.speaker)}</p><p class="dialog-text">${escape(e.text)}</p><div class="menu-actions">${button("冒険へ", "close")}</div>`,
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
      txt("#discovery h2", e.text.replace("を発見", ""));
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
  txt("#island-name", i.name);
  txt(
    "#quest-no",
    game.questIndex === 7
      ? "COMPLETE"
      : `${String(game.questIndex + 1).padStart(2, "0")} / 07`,
  );
  txt("#quest-title", q.title);
  txt("#quest-detail", q.detail);
  const minutes = Math.floor((s.time / DAY_SECONDS) * 1440);
  txt(
    "#time",
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
  );
  txt("#day", `DAY ${String(s.day).padStart(2, "0")}`);
  txt("#time-icon", game.night ? "☾" : "☀");
  txt(
    "#weather",
    i.id === 1
      ? "霧氷 · −3°C"
      : i.id === 2
        ? "嵐の気配 · 14°C"
        : game.night
          ? "星明かり · 16°C"
          : "潮風 · 24°C",
  );
  for (const [id, value] of [
    ["health", p.hp],
    ["stamina", p.stamina],
    ["hunger", p.hunger],
  ]) {
    txt(`#${id}`, Math.ceil(value));
    fill(`#${id}-fill`, value);
  }
  txt("#food-count", `食料 ${s.inventory.meal + s.inventory.berry}`);
  txt("#rune-count", `ルーン ${s.inventory.rune}`);
  txt(
    "#status-tags",
    [
      game.cold
        ? "❄ 寒さ：防寒マントか焚き火を"
        : game.warm
          ? "♨ 温もりで回復中"
          : "",
      p.hunger < 25 ? "食料が必要です" : "",
      game.stealth ? "しゃがみ / 不意打ち" : "",
      game.fly
        ? "飛行中"
        : game.mount
          ? "騎乗中"
          : game.boat
            ? "いかだで航行中"
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
    txt("#ally-title", `COMPANION / Lv.${game.companion.level}`);
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
        sp.element + " / " + (game.sleeping(enemy) ? "SLEEPING" : "WILD"),
      );
      txt("#target-name", sp.name);
      fill("#target-fill", (enemy.hp / sp.hp) * 100);
      txt(
        "#target-status",
        s.companions[enemy.type]
          ? "すでに絆を結んだ種"
          : enemy.hp / sp.hp <= (enemy.type === "tempest" ? 0.2 : 0.35)
            ? "Q · 捕獲できる"
            : game.sleeping(enemy)
              ? "C で接近 → J 不意打ち"
              : "弱らせて捕獲",
      );
    }
  }
  show("#target", visible && !panel && enemy?.type !== "tempest");
  const boss = game.wild.find((e) => e.type === "tempest" && dist(e, p) < 26);
  show("#boss", !!boss);
  if (boss) {
    fill("#boss-fill", (boss.hp / SPECIES.tempest.hp) * 100);
    txt(
      "#boss small",
      boss.hp / SPECIES.tempest.hp <= 0.2
        ? "Q · 捕獲できる / GUARDIAN OF THE STORM"
        : "GUARDIAN OF THE STORM",
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
      `${BUILDINGS[build].name}を配置 · E / 左クリックで設置 · Escで戻る`,
    );
  txt(
    "#bearing",
    ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][
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
    point(e, 2.3, e.type === "tempest" ? "#ffb666" : "#e5a37e");
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
    if (e.code === "Escape") {
      e.preventDefault();
      closePanel();
    }
    if (e.code === "Tab") {
      const els = [
        ...$("#modal").querySelectorAll(
          "button:not([disabled]):not([hidden]),input:not([hidden]),select,a[href]",
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
    const x =
        (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
        (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0),
      z =
        (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) -
        (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
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
      txt("#load-status", `島の準備 ${Math.round(progress * 100)}%`);
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
      "読み込みに失敗しました。起動用ファイルから開き直してください。",
    );
    const p = document.createElement("p");
    p.className = "section-note";
    p.textContent = err.message;
    $("#loading").append(p);
    const b = document.createElement("button");
    b.className = "primary";
    b.textContent = "再読み込み";
    b.onclick = () => location.reload();
    $("#loading").append(b);
  }
}
boot();
