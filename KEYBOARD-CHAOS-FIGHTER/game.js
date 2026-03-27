const canvas = document.getElementById("arena-canvas");
const ctx = canvas.getContext("2d");

const preFightOverlay = document.getElementById("pre-fight-overlay");
const matchHud = document.getElementById("match-hud");
const pauseOverlay = document.getElementById("pause-overlay");
const startButton = document.getElementById("start-button");
const practiceButton = document.getElementById("practice-button");
const fullscreenButton = document.getElementById("fullscreen-button");
const pauseFullscreenButton = document.getElementById("pause-fullscreen-button");
const pauseButton = document.getElementById("pause-button");
const resumeButton = document.getElementById("resume-button");
const restartButton = document.getElementById("restart-button");
const endOverlay = document.getElementById("end-overlay");
const endTitle = document.getElementById("end-title");
const endMessage = document.getElementById("end-message");
const pauseTitle = document.getElementById("pause-title");
const pauseSubtitle = document.getElementById("pause-subtitle");
const pauseModeText = document.getElementById("pause-mode-text");
const timerText = document.getElementById("timer-text");
const roundState = document.getElementById("round-state");
const chantStatePill = document.getElementById("chant-state-pill");
const spellPreview = document.getElementById("spell-preview");
const spellHint = document.getElementById("spell-hint");
const compositionState = document.getElementById("composition-state");
const spellInput = document.getElementById("spell-input");
const combatLog = document.getElementById("combat-log");
const compactLog = document.getElementById("compact-log");
const keyboardGrid = document.getElementById("keyboard-grid");
const spellbookPreview = document.getElementById("spellbook-preview");
const spellCount = document.getElementById("spell-count");

const playerHpFill = document.getElementById("player-hp-fill");
const cpuHpFill = document.getElementById("cpu-hp-fill");
const playerMeterFill = document.getElementById("player-meter-fill");
const cpuMeterFill = document.getElementById("cpu-meter-fill");
const playerHpText = document.getElementById("player-hp-text");
const cpuHpText = document.getElementById("cpu-hp-text");
const playerMeterText = document.getElementById("player-meter-text");
const cpuMeterText = document.getElementById("cpu-meter-text");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const FLOOR_Y = 586;
const ROUND_TIME = 90;
const STAGE_LEFT = 84;
const STAGE_RIGHT = WIDTH - 84;
const MAX_LOGS = 7;
const KEY_ORDER = Object.keys(KEY_MOVE_MAP);

const THEME_COLORS = {
    flame: "#ff7a45",
    ice: "#8adfff",
    thunder: "#ffe15b",
    wind: "#7ef8cf",
    water: "#4ab8ff",
    earth: "#b68a5f",
    light: "#fff0a3",
    dark: "#8c63ff",
    plant: "#74d66f",
    metal: "#d0d7df",
    animal: "#ffb36b",
    food: "#ffc76e",
    emotion: "#ff86b5",
    concept: "#89c7ff",
    daily: "#d5d5d5"
};

const STATUS_COLORS = {
    burn: "#ff7f50",
    freeze: "#8adfff",
    shock: "#ffe35b",
    poison: "#7cff86",
    slow: "#91c3ff",
    root: "#76d975",
    curse: "#b278ff",
    blind: "#ffffff",
    rage: "#ff9d71",
    haste: "#7effc8",
    regen: "#8bffae",
    guard: "#ffe38f",
    weaken: "#b9c6d5",
    bleed: "#ff6d8b",
    armorbreak: "#ffd76d",
    thorns: "#9effa5",
    mist: "#c7ebff",
    evade: "#d6fbff",
    focus: "#a4c7ff",
    timewarp: "#89b7ff",
    pull: "#b8c3ff",
    float: "#ccefff",
    stagger: "#ffd0a8",
    reflect: "#ffe9a5",
    analyze: "#9fd4ff",
    wealth: "#ffe27a",
    drain: "#c5d4ff",
    radiant: "#fff0a3",
    fracture: "#91bfff",
    lift: "#b7fff0",
    soak: "#62bbff"
};

const STATUS_DURATION = {
    burn: 3.8,
    freeze: 2.2,
    shock: 2.5,
    poison: 3.5,
    slow: 3.6,
    root: 2.8,
    curse: 4.4,
    blind: 2.5,
    rage: 6,
    haste: 6,
    regen: 5.5,
    guard: 5,
    weaken: 4,
    bleed: 3.2,
    armorbreak: 4.8,
    thorns: 4.2,
    mist: 4.6,
    evade: 4.5,
    focus: 6,
    timewarp: 4.8,
    pull: 2.8,
    float: 1.9,
    stagger: 1.1,
    reflect: 3.5,
    analyze: 5.4,
    wealth: 5.6,
    drain: 3.1,
    radiant: 4,
    fracture: 4.4,
    lift: 1.6,
    soak: 3.4
};

const MOVE_TYPE_LABELS = {
    jab: "打撃",
    slash: "斬撃",
    rush: "突進",
    launcher: "打ち上げ",
    low: "足払い",
    wave: "衝撃波",
    guardBreak: "崩し",
    slide: "滑走",
    hop: "跳躍",
    projectile: "飛び道具",
    backstep: "後退",
    trap: "設置",
    beam: "光線",
    bomb: "爆弾",
    rain: "降下",
    shield: "防御",
    dash: "加速",
    counter: "返し技",
    barrier: "防壁",
    teleport: "瞬間移動",
    taunt: "挑発",
    heal: "回復",
    haste: "加速",
    evade: "回避",
    summon: "召喚",
    time: "時術",
    orbit: "追尾"
};

const STATUS_LABELS = {
    burn: "炎上",
    freeze: "凍結",
    shock: "感電",
    poison: "毒",
    slow: "鈍化",
    root: "拘束",
    curse: "呪い",
    blind: "目くらまし",
    rage: "激昂",
    haste: "加速",
    regen: "再生",
    guard: "防御",
    weaken: "弱体",
    bleed: "裂傷",
    armorbreak: "防御崩し",
    thorns: "反撃棘",
    mist: "霧隠れ",
    evade: "見切り",
    focus: "集中",
    timewarp: "時歪み",
    pull: "引力",
    float: "浮遊",
    stagger: "よろめき",
    reflect: "反射",
    analyze: "解析",
    wealth: "満ち足り",
    drain: "吸収",
    radiant: "光輝",
    fracture: "時裂き",
    lift: "巻き上げ",
    soak: "濡れ",
    counter: "返し技"
};

const game = {
    state: "ready",
    uiState: "menu",
    mode: "battle",
    timeLeft: ROUND_TIME,
    lastTimestamp: 0,
    player: null,
    cpu: null,
    projectiles: [],
    zones: [],
    walls: [],
    summons: [],
    particles: [],
    delayedActions: [],
    beams: [],
    logs: [],
    isChantMode: false,
    isComposing: false,
    spellRaw: "",
    screenShake: 0,
    spellMap: new Map(),
    duplicateAliases: [],
    stateMessageTimer: 0
};

function createFighter(name, side, x, colors) {
    return {
        name,
        side,
        x,
        y: FLOOR_Y,
        width: 92,
        height: 146,
        vx: 0,
        vy: 0,
        maxHp: 1000,
        hp: 1000,
        maxMeter: 100,
        meter: 40,
        barrier: 0,
        baseSpeed: 330,
        jumpStrength: 700,
        facing: side === "player" ? 1 : -1,
        hitstun: 0,
        recovery: 0,
        invuln: 0,
        counterWindow: 0,
        flash: 0,
        pulse: 0,
        isChanting: false,
        queuedAction: null,
        queuedActionKind: null,
        queuedLabel: "",
        queuedSource: null,
        cooldowns: {},
        effects: [],
        stateText: "",
        stateTextTimer: 0,
        aiDecisionTimer: 0,
        aiState: "observe",
        themeColors: colors,
        lastMoveLabel: "待機",
        activeOrbit: null
    };
}

function createParticle(x, y, color, options = {}) {
    game.particles.push({
        x,
        y,
        vx: options.vx ?? (Math.random() - 0.5) * 160,
        vy: options.vy ?? (Math.random() - 0.5) * 160,
        radius: options.radius ?? (Math.random() * 6 + 3),
        life: options.life ?? 0.5,
        maxLife: options.life ?? 0.5,
        color,
        gravity: options.gravity ?? 0,
        glow: options.glow ?? 0
    });
}

function addLog(side, text) {
    const entry = { side, text };
    game.logs.unshift(entry);
    game.logs = game.logs.slice(0, MAX_LOGS);
    renderLogs();
}

function createLogElement(entry) {
    const li = document.createElement("li");
    li.className = entry.side;
    li.textContent = entry.text;
    return li;
}

function renderCompactLog() {
    compactLog.innerHTML = "";
    const compactEntries = game.logs.slice(0, 2);
    compactEntries.forEach((entry) => {
        compactLog.appendChild(createLogElement(entry));
    });
}

function renderLogs() {
    combatLog.innerHTML = "";
    game.logs.forEach((entry) => {
        combatLog.appendChild(createLogElement(entry));
    });
    renderCompactLog();
}

function setRoundState(text, timer = 2.2) {
    roundState.textContent = text;
    game.stateMessageTimer = timer;
}

function syncUiVisibility() {
    document.body.dataset.uiState = game.uiState;
    document.body.dataset.mode = game.mode;
    preFightOverlay.classList.toggle("hidden", game.uiState !== "menu");
    matchHud.classList.toggle("hidden", !["match", "pause", "result"].includes(game.uiState));
    pauseOverlay.classList.toggle("hidden", game.uiState !== "pause");
    endOverlay.classList.toggle("hidden", game.uiState !== "result");
}

function updatePauseCopy() {
    pauseModeText.textContent = game.mode === "practice" ? "練習モード" : "対戦モード";
    if (game.mode === "practice") {
        pauseTitle.textContent = "練習メニュー";
        pauseSubtitle.textContent = "木人相手に、技や詠唱を落ち着いて確認できます。";
    } else {
        pauseTitle.textContent = "一時停止";
        pauseSubtitle.textContent = "試合を止めて、技表や必殺語録を確認できます。";
    }
}

function setUiState(nextState) {
    game.uiState = nextState;
    if (game.uiState === "pause") {
        spellInput.blur();
    } else if (game.uiState === "match" && game.isChantMode) {
        requestAnimationFrame(() => spellInput.focus({ preventScroll: true }));
    }
    updatePauseCopy();
    syncUiVisibility();
}

function togglePauseOverlay(forceState = null) {
    if (game.state !== "running") return;
    const shouldOpen = forceState ?? game.uiState !== "pause";
    setUiState(shouldOpen ? "pause" : "match");
}

function normalizeSpellInput(raw) {
    if (!raw) return "";
    let normalized = raw.normalize("NFKC").toLowerCase();
    normalized = normalized.replace(/[ァ-ヶ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));
    normalized = normalized.replace(/[ーｰ]/g, "");
    normalized = normalized.replace(/[・\s"'`´.,!?！？。、_=-]/g, "");
    return normalized;
}

function resolveSpecialMove(normalized) {
    return game.spellMap.get(normalized) ?? null;
}

function buildSpellMap() {
    const spellMap = new Map();
    const duplicates = [];

    SPECIAL_LEXICON.forEach((entry) => {
        [entry.canonical, ...entry.aliases].forEach((alias) => {
            const normalized = normalizeSpellInput(alias);
            if (!normalized) return;
            if (spellMap.has(normalized) && spellMap.get(normalized).id !== entry.id) {
                duplicates.push(`${normalized}: ${spellMap.get(normalized).id} / ${entry.id}`);
                return;
            }
            spellMap.set(normalized, entry);
        });
    });

    game.spellMap = spellMap;
    game.duplicateAliases = duplicates;
    if (duplicates.length) {
        console.warn("必殺技の別名が重複しています", duplicates);
    }
}

function populateKeyboardGrid() {
    keyboardGrid.innerHTML = "";
    KEY_ORDER.forEach((key) => {
        const move = KEY_MOVE_MAP[key];
        const item = document.createElement("div");
        item.className = "keycap";
        item.innerHTML = `
            <span class="keycap-key">${move.key.toUpperCase()}</span>
            <span class="keycap-name">${move.label}</span>
            <span class="keycap-type">${MOVE_TYPE_LABELS[move.effect] ?? move.effect}</span>
        `;
        keyboardGrid.appendChild(item);
    });
}

function populateSpellbookPreview() {
    spellbookPreview.innerHTML = "";
    const previewList = SPECIAL_LEXICON.slice(0, 24);
    previewList.forEach((spell) => {
        const chip = document.createElement("div");
        chip.className = "spell-chip";
        chip.innerHTML = `
            <strong>${spell.canonical}</strong>
            <span>${spell.aliases[0]} / ${spell.aliases[1]}</span>
        `;
        spellbookPreview.appendChild(chip);
    });
    spellCount.textContent = `${SPECIAL_LEXICON.length}語`;
}

function resetRound() {
    game.player = createFighter("あなた", "player", 290, { main: "#35f2ff", accent: "#b6faff" });
    game.cpu = createFighter("キー砕き", "cpu", 990, { main: "#ff4b88", accent: "#ffc0d7" });
    game.player.meter = 42;
    game.cpu.meter = 38;
    game.timeLeft = ROUND_TIME;
    game.projectiles = [];
    game.zones = [];
    game.walls = [];
    game.summons = [];
    game.particles = [];
    game.delayedActions = [];
    game.beams = [];
    game.screenShake = 0;
    game.lastTimestamp = 0;
    game.player.lastMoveLabel = game.mode === "practice" ? "練習中" : "待機";
    game.cpu.lastMoveLabel = game.mode === "practice" ? "木人" : "待機";
    if (game.mode === "practice") {
        game.timeLeft = Infinity;
        game.player.meter = 100;
        game.cpu.meter = 0;
    }
    exitChantMode("reset", true);
    setRoundState(game.mode === "practice" ? "練習モード" : "打って戦え", 2.6);
    updateHud();
    updatePauseCopy();
}

function startGame(mode = "battle") {
    game.mode = mode;
    resetRound();
    game.logs = [];
    renderLogs();
    game.state = "running";
    setUiState("match");
    if (game.mode === "practice") {
        addLog("system", "練習モード開始。CPUは攻撃しません。時間無制限で自由に試せます。");
        addLog("system", "ゲージは自動回復します。単語詠唱やキー技を落ち着いて試してください。");
    } else {
        addLog("system", "対戦開始。通常技でゲージを溜めて、単語必殺技で決めろ。");
    }
}

function finishRound(winner, reason) {
    if (game.state !== "running") return;
    game.state = "finished";
    exitChantMode("finish", true);
    if (winner.side === "player") {
        endTitle.textContent = "あなたの勝ち";
        endMessage.textContent = reason;
    } else {
        endTitle.textContent = "あなたの負け";
        endMessage.textContent = reason;
    }
    setRoundState("対戦終了", 99);
    addLog("system", reason);
    setUiState("result");
}

function getOpponent(actor) {
    return actor.side === "player" ? game.cpu : game.player;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function addMeter(actor, amount) {
    actor.meter = clamp(actor.meter + amount, 0, actor.maxMeter);
}

function healActor(actor, amount) {
    actor.hp = clamp(actor.hp + amount, 0, actor.maxHp);
}

function addBarrier(actor, amount, label = "防壁") {
    actor.barrier = clamp(actor.barrier + amount, 0, 260);
    actor.stateText = `${label} +${Math.round(amount)}`;
    actor.stateTextTimer = 1.1;
}

function hasEffect(actor, name) {
    return actor.effects.some((effect) => effect.name === name);
}

function addEffect(actor, name, duration, potency = 1) {
    if (!name) return;
    const existing = actor.effects.find((effect) => effect.name === name);
    if (existing) {
        existing.time = Math.max(existing.time, duration);
        existing.potency = Math.max(existing.potency, potency);
        return;
    }
    actor.effects.push({
        name,
        time: duration,
        potency,
        tick: 0
    });
    actor.stateText = STATUS_LABELS[name] ?? name;
    actor.stateTextTimer = 0.8;
}

function getActorStats(actor) {
    let speedMult = 1;
    let damageMult = 1;
    let meterRegen = 0;
    let damageTakenMult = 1;

    if (hasEffect(actor, "freeze")) speedMult *= 0.58;
    if (hasEffect(actor, "slow")) speedMult *= 0.8;
    if (hasEffect(actor, "root")) speedMult *= 0.5;
    if (hasEffect(actor, "haste")) speedMult *= 1.28;
    if (hasEffect(actor, "evade")) speedMult *= 1.1;
    if (hasEffect(actor, "rage")) damageMult *= 1.24;
    if (hasEffect(actor, "focus")) damageMult *= 1.08;
    if (hasEffect(actor, "weaken")) damageMult *= 0.82;
    if (hasEffect(actor, "guard")) damageTakenMult *= 0.76;
    if (hasEffect(actor, "armorbreak")) damageTakenMult *= 1.16;
    if (hasEffect(actor, "timewarp")) {
        speedMult *= 1.16;
        meterRegen += 6;
    }
    if (hasEffect(actor, "wealth")) meterRegen += 4;
    if (hasEffect(actor, "regen")) meterRegen += 2.2;

    return { speedMult, damageMult, meterRegen, damageTakenMult };
}

function queueAction(actor, time, label, kind, callback) {
    actor.queuedAction = { time, callback };
    actor.queuedActionKind = kind;
    actor.queuedLabel = label;
    actor.stateText = label;
    actor.stateTextTimer = Math.max(actor.stateTextTimer, Math.min(1.3, time + 0.3));
}

function clearQueuedAction(actor, reason = "") {
    actor.queuedAction = null;
    actor.queuedActionKind = null;
    actor.queuedLabel = "";
    if (reason) {
        actor.stateText = reason;
        actor.stateTextTimer = 0.8;
    }
}

function createImpact(x, y, color, power = 1) {
    for (let i = 0; i < 10 + power * 3; i += 1) {
        createParticle(x, y, color, {
            vx: (Math.random() - 0.5) * 240 * power,
            vy: (Math.random() - 0.5) * 240 * power,
            radius: Math.random() * 5 + 2,
            life: 0.22 + Math.random() * 0.26,
            glow: 10
        });
    }
    game.screenShake = Math.max(game.screenShake, 6 * power);
}

function applyStatusFromSource(target, status) {
    if (!status) return;
    addEffect(target, status, STATUS_DURATION[status] ?? 3.6, 1);
}

function counterStrike(defender, attacker, sourceName) {
    const damage = 48;
    defender.invuln = 0.24;
    attacker.hitstun = Math.max(attacker.hitstun, 0.32);
    attacker.vx += (defender.side === "player" ? 1 : -1) * 360;
    const minHp = game.mode === "practice" ? 1 : 0;
    attacker.hp = clamp(attacker.hp - damage, minHp, attacker.maxHp);
    createImpact(attacker.x, attacker.y - 80, "#fff1a0", 1.4);
    addLog(defender.side, `${defender.name} が ${sourceName} をカウンター`);
    if (game.mode !== "practice" && attacker.hp <= 0) {
        finishRound(defender, `${defender.name} が見切りカウンターで勝利。`);
    }
}

function damageActor(attacker, target, amount, options = {}) {
    if (target.invuln > 0 && !options.unblockable) return false;
    if (target.counterWindow > 0 && attacker && !options.unblockable) {
        target.counterWindow = 0;
        counterStrike(target, attacker, options.sourceName ?? "攻撃");
        return false;
    }
    if (hasEffect(target, "evade") && Math.random() < 0.14 && !options.unblockable) {
        addLog(target.side, `${target.name} が回避`);
        createImpact(target.x, target.y - 70, "#d6fbff", 0.8);
        return false;
    }

    const attackerStats = attacker ? getActorStats(attacker) : { damageMult: 1 };
    const targetStats = getActorStats(target);
    let damage = amount * attackerStats.damageMult * targetStats.damageTakenMult;
    if (options.dot) damage *= 0.72;
    damage = Math.max(1, Math.round(damage));

    if (target.barrier > 0 && !options.direct) {
        const absorbed = Math.min(target.barrier, damage);
        target.barrier -= absorbed;
        damage -= absorbed;
        if (absorbed > 0) {
            createImpact(target.x, target.y - 90, "#fff0a3", 0.6);
        }
    }

    if (damage > 0) {
        const minHp = game.mode === "practice" ? 1 : 0;
        target.hp = clamp(target.hp - damage, minHp, target.maxHp);
        if (!options.dot) {
            target.hitstun = Math.max(target.hitstun, options.hitstun ?? 0.18);
            target.vx += (attacker ? Math.sign(target.x - attacker.x) : (target.side === "player" ? -1 : 1)) * (options.knockback ?? 280);
        }
        target.flash = 0.18;
        if (options.status) applyStatusFromSource(target, options.status);
        if (hasEffect(target, "thorns") && attacker && !options.dot) {
            attacker.hp = clamp(attacker.hp - 12, 0, attacker.maxHp);
            createImpact(attacker.x, attacker.y - 72, "#9effa5", 0.7);
        }
        if (options.drain && attacker) healActor(attacker, Math.round(damage * 0.3));
        if (target.side === "player" && game.isChantMode && !options.dot) {
            exitChantMode("hit", true);
            addLog("system", "被弾で詠唱中断");
        }
    }

    if (target.queuedActionKind === "special" && !options.dot) {
        clearQueuedAction(target, "詠唱中断");
    }

    if (game.mode !== "practice" && target.hp <= 0) {
        const winner = attacker ?? getOpponent(target);
        finishRound(winner, `${winner.name} が ${options.sourceName ?? "一撃"} で勝利。`);
    }
    return true;
}

function enqueueDelayedAction(delay, callback) {
    game.delayedActions.push({ delay, callback });
}

function createProjectile(owner, config) {
    const direction = owner.side === "player" ? 1 : -1;
    const spreadAngle = config.angle ?? 0;
    const speed = config.speed ?? 720;
    game.projectiles.push({
        owner,
        x: owner.x + direction * 42,
        y: owner.y - 78,
        vx: Math.cos(spreadAngle) * speed * direction,
        vy: Math.sin(spreadAngle) * speed,
        gravity: config.gravity ?? 0,
        radius: config.radius ?? 18,
        color: config.color ?? owner.themeColors.main,
        damage: config.damage ?? 30,
        status: config.status ?? null,
        knockback: config.knockback ?? 320,
        life: config.life ?? 2.3,
        pierce: config.pierce ?? 0,
        sourceName: config.sourceName ?? "飛び道具",
        theme: config.theme ?? "neutral"
    });
}

function createBeam(owner, config) {
    const direction = owner.side === "player" ? 1 : -1;
    const length = config.length ?? 360;
    const target = getOpponent(owner);
    game.beams.push({
        x: owner.x,
        y: owner.y - 84,
        length,
        direction,
        color: config.color,
        life: 0.14
    });
    const inRange =
        direction > 0
            ? target.x >= owner.x && target.x <= owner.x + length
            : target.x <= owner.x && target.x >= owner.x - length;
    if (inRange && Math.abs(target.y - owner.y) < 120) {
        damageActor(owner, target, config.damage, {
            sourceName: config.sourceName,
            status: config.status,
            knockback: config.knockback ?? 360,
            hitstun: 0.22,
            drain: config.drain ?? false
        });
        createImpact(target.x, target.y - 80, config.color, 1.2);
    }
}

function createZone(owner, config) {
    const target = getOpponent(owner);
    const direction = owner.side === "player" ? 1 : -1;
    game.zones.push({
        owner,
        x: config.anchor === "self" ? owner.x : config.x ?? target.x + direction * (config.offset ?? -36),
        y: config.y ?? FLOOR_Y - (config.heightOffset ?? 66),
        radius: config.radius ?? 120,
        duration: config.duration ?? 4,
        tickRate: config.tickRate ?? 0.5,
        tickTimer: config.tickRate ?? 0.5,
        color: config.color ?? owner.themeColors.main,
        damage: config.damage ?? 18,
        status: config.status ?? null,
        sourceName: config.sourceName ?? "領域",
        kind: config.kind ?? "circle",
        pull: config.pull ?? 0,
        anchor: config.anchor ?? "ground",
        angle: Math.random() * Math.PI * 2
    });
}

function createWall(owner, config) {
    const direction = owner.side === "player" ? 1 : -1;
    const target = getOpponent(owner);
    const x = config.x ?? clamp((owner.x + target.x) * 0.5 + direction * 10, STAGE_LEFT + 90, STAGE_RIGHT - 90);
    game.walls.push({
        owner,
        x,
        y: FLOOR_Y,
        width: config.width ?? 30,
        height: config.height ?? 120,
        duration: config.duration ?? 5.4,
        color: config.color ?? owner.themeColors.main,
        damage: config.damage ?? 20,
        status: config.status ?? null,
        sourceName: config.sourceName ?? "防壁"
    });
}

function createSummon(owner, config) {
    const direction = owner.side === "player" ? 1 : -1;
    game.summons.push({
        owner,
        x: owner.x + direction * 30,
        y: owner.y - 80,
        vx: direction * (config.speed ?? 520),
        radius: config.radius ?? 28,
        color: config.color ?? owner.themeColors.main,
        damage: config.damage ?? 48,
        status: config.status ?? null,
        life: config.life ?? 1.6,
        sourceName: config.sourceName ?? "召喚体",
        homing: config.homing ?? false
    });
}

function createRain(owner, config) {
    const target = getOpponent(owner);
    const shots = config.shots ?? 6;
    for (let i = 0; i < shots; i += 1) {
        enqueueDelayedAction(i * 0.08, () => {
            game.projectiles.push({
                owner,
                x: target.x + (Math.random() - 0.5) * (config.spread ?? 220),
                y: 90 + Math.random() * 40,
                vx: (Math.random() - 0.5) * 80,
                vy: config.speedY ?? 640,
                gravity: config.gravity ?? 0,
                radius: config.radius ?? 16,
                color: config.color ?? owner.themeColors.main,
                damage: config.damage ?? 28,
                status: config.status ?? null,
                knockback: config.knockback ?? 260,
                life: config.life ?? 1.5,
                pierce: 0,
                sourceName: config.sourceName ?? "降下攻撃",
                theme: config.theme ?? "neutral"
            });
        });
    }
}

function createOrbit(owner, config) {
    createZone(owner, {
        anchor: "self",
        kind: "orbit",
        radius: config.radius ?? 72,
        duration: config.duration ?? 5,
        tickRate: 0.24,
        color: config.color ?? owner.themeColors.main,
        damage: config.damage ?? 20,
        status: config.status ?? null,
        sourceName: config.sourceName ?? "追尾攻撃"
    });
}

function createTeleportStrike(owner, config) {
    const target = getOpponent(owner);
    owner.x = clamp(target.x + (owner.side === "player" ? -140 : 140), STAGE_LEFT + 20, STAGE_RIGHT - 20);
    owner.vx = (owner.side === "player" ? 1 : -1) * 120;
    createImpact(owner.x, owner.y - 70, config.color ?? owner.themeColors.main, 1);
    if (Math.abs(owner.x - target.x) < 150) {
        damageActor(owner, target, config.damage, {
            sourceName: config.sourceName,
            status: config.status,
            knockback: 340,
            hitstun: 0.24
        });
    }
}

function executeKeyMove(actor, move) {
    const opponent = getOpponent(actor);
    const direction = actor.side === "player" ? 1 : -1;
    addMeter(actor, move.meterGain);
    actor.recovery = Math.max(actor.recovery, move.recovery / 60);
    actor.lastMoveLabel = `${move.key.toUpperCase()} ${move.label}`;

    switch (move.effect) {
        case "jab":
        case "slash":
        case "low":
        case "spin":
        case "guardBreak":
        case "launcher":
        case "rush":
        case "slide":
        case "wave":
        case "hop": {
            actor.vx += direction * move.speed * 32;
            if (move.effect === "launcher" || move.effect === "hop") {
                actor.vy = -actor.jumpStrength * 0.7;
            }
            const reach = move.reach + (move.effect === "rush" ? 40 : 0);
            if (Math.abs(opponent.x - actor.x) < reach && Math.abs(opponent.y - actor.y) < 120) {
                damageActor(actor, opponent, move.damage, {
                    sourceName: move.label,
                    status: move.status,
                    knockback: move.knockback * 28,
                    hitstun: move.effect === "launcher" ? 0.28 : 0.18
                });
                createImpact(opponent.x, opponent.y - 76, move.tint, 1);
            } else {
                createImpact(actor.x + direction * 80, actor.y - 70, move.tint, 0.55);
            }
            break;
        }
        case "projectile": {
            const shots = move.shots ?? 1;
            for (let i = 0; i < shots; i += 1) {
                const angleOffset = shots > 1 ? (i - (shots - 1) / 2) * 0.08 : 0;
                createProjectile(actor, {
                    speed: move.speed * 52,
                    angle: angleOffset,
                    radius: 16,
                    damage: move.damage,
                    color: move.tint,
                    status: move.status,
                    sourceName: move.label
                });
            }
            break;
        }
        case "beam": {
            createBeam(actor, {
                length: move.reach + 120,
                color: move.tint,
                damage: move.damage,
                status: move.status,
                sourceName: move.label
            });
            break;
        }
        case "trap": {
            createZone(actor, {
                radius: move.reach * 0.7,
                duration: move.duration ?? 4,
                damage: Math.max(14, move.damage * 0.45),
                status: move.status,
                color: move.tint,
                sourceName: move.label
            });
            break;
        }
        case "bomb": {
            createProjectile(actor, {
                speed: 420,
                angle: -0.35,
                gravity: 980,
                radius: 24,
                damage: move.damage,
                color: move.tint,
                status: move.status,
                sourceName: move.label
            });
            break;
        }
        case "rain": {
            createRain(actor, {
                shots: 6,
                spread: 180,
                damage: Math.max(18, move.damage * 0.58),
                color: move.tint,
                status: move.status,
                sourceName: move.label
            });
            break;
        }
        case "shield":
        case "barrier": {
            addBarrier(actor, move.barrier || 100, move.label);
            break;
        }
        case "dash": {
            actor.vx += direction * 620;
            break;
        }
        case "counter": {
            actor.counterWindow = 0.9;
            addEffect(actor, move.buff ?? "counter", 2.2, 1);
            break;
        }
        case "backstep": {
            actor.vx -= direction * 520;
            actor.invuln = Math.max(actor.invuln, 0.18);
            break;
        }
        case "hop": {
            actor.vy = -actor.jumpStrength * 0.85;
            actor.vx += direction * 180;
            break;
        }
        case "teleport": {
            createTeleportStrike(actor, {
                color: move.tint,
                damage: move.damage,
                status: move.status,
                sourceName: move.label
            });
            break;
        }
        case "taunt": {
            addEffect(opponent, "weaken", 3.6, 1);
            addMeter(actor, 6);
            createImpact(opponent.x, opponent.y - 70, move.tint, 0.5);
            break;
        }
        case "heal": {
            healActor(actor, move.heal || 40);
            addEffect(actor, "regen", 4.2, 1);
            break;
        }
        case "haste": {
            addEffect(actor, move.buff || "haste", 5.6, 1);
            break;
        }
        case "evade": {
            addEffect(actor, move.buff || "evade", 4.8, 1);
            actor.invuln = Math.max(actor.invuln, 0.22);
            break;
        }
        case "summon": {
            createSummon(actor, {
                speed: 560,
                color: move.tint,
                damage: move.damage,
                status: move.status,
                sourceName: move.label
            });
            break;
        }
        case "time": {
            addEffect(actor, move.buff || "timewarp", 4.8, 1);
            addEffect(opponent, "slow", 2.8, 1);
            break;
        }
        case "orbit": {
            createOrbit(actor, {
                radius: 72,
                duration: move.duration ?? 4.6,
                color: move.tint,
                damage: 18,
                status: move.status,
                sourceName: move.label
            });
            break;
        }
        default:
            createImpact(actor.x + direction * 70, actor.y - 70, move.tint, 0.4);
    }

    if (actor.side === "player") {
        addLog("player", `[${move.key.toUpperCase()}] ${move.label}`);
    } else if (Math.random() < 0.55) {
        addLog("cpu", `CPU: ${move.label}`);
    }
}

function specialShots(def) {
    if (def.shots) return def.shots;
    if (def.effectType === "rain") return 7;
    if (def.canonical === "寿司") return 4;
    return 1;
}

function triggerSpecialMove(def, actor = game.player) {
    if (game.state !== "running") return;
    if (actor.meter < def.meterCost) {
        addLog(actor.side, `${def.canonical} を出すにはゲージが足りない`);
        return;
    }
    actor.meter -= def.meterCost;
    actor.recovery = Math.max(actor.recovery, def.castTime + 0.18);
    queueAction(actor, def.castTime, def.canonical, "special", () => executeSpecialMove(actor, def));
    setRoundState(`${actor.side === "player" ? "必殺技" : "CPU必殺技"}: ${def.canonical}`, 1.6);
    addLog(actor.side, `${actor.name} が「${def.canonical}」を詠唱`);
}

function executeSpecialMove(actor, def) {
    const target = getOpponent(actor);
    const color = def.projectile?.color || THEME_COLORS[def.theme] || actor.themeColors.main;
    actor.lastMoveLabel = `${def.canonical} (${def.aliases[1]})`;
    createImpact(actor.x, actor.y - 86, color, 1.4);

    switch (def.effectType) {
        case "projectile": {
            const shots = specialShots(def);
            for (let i = 0; i < shots; i += 1) {
                const angleOffset = shots > 1 ? (i - (shots - 1) / 2) * 0.12 : 0;
                createProjectile(actor, {
                    speed: (def.projectile.speed ?? 8) * 80,
                    angle: angleOffset,
                    radius: def.projectile.size ?? 22,
                    damage: def.damage,
                    color,
                    status: def.status,
                    sourceName: def.canonical,
                    pierce: def.projectile.pierce ?? 0
                });
            }
            break;
        }
        case "beam": {
            createBeam(actor, {
                length: def.area.range + 120,
                damage: def.damage,
                color,
                status: def.status,
                sourceName: def.canonical,
                drain: def.status === "drain"
            });
            break;
        }
        case "rain": {
            createRain(actor, {
                shots: specialShots(def),
                spread: def.area.range,
                damage: def.damage * 0.72,
                color,
                radius: def.projectile.size ?? 18,
                status: def.status,
                sourceName: def.canonical,
                speedY: 700
            });
            break;
        }
        case "zone":
        case "trap": {
            createZone(actor, {
                radius: def.area.radius,
                duration: def.duration,
                damage: def.damage * 0.46,
                status: def.status,
                color,
                sourceName: def.canonical,
                pull: def.status === "pull" ? 50 : 0
            });
            break;
        }
        case "barrier": {
            addBarrier(actor, 120, def.canonical);
            if (def.status) addEffect(actor, def.status, def.duration, 1);
            createZone(actor, {
                anchor: "self",
                radius: def.area.radius * 0.56,
                duration: Math.max(2.4, def.duration * 0.7),
                damage: 10,
                status: null,
                color,
                sourceName: `${def.canonical} の気配`
            });
            break;
        }
        case "wall": {
            createWall(actor, {
                width: 34,
                height: 130,
                duration: def.duration,
                color,
                damage: def.damage * 0.35,
                status: def.status,
                sourceName: def.canonical
            });
            break;
        }
        case "summon": {
            createSummon(actor, {
                speed: 620,
                radius: def.projectile.size ?? 30,
                color,
                damage: def.damage,
                status: def.status,
                sourceName: def.canonical,
                homing: true,
                life: 1.85
            });
            break;
        }
        case "rush": {
            actor.vx += (actor.side === "player" ? 1 : -1) * 860;
            if (Math.abs(target.x - actor.x) < def.area.range && Math.abs(target.y - actor.y) < 130) {
                damageActor(actor, target, def.damage, {
                    sourceName: def.canonical,
                    status: def.status,
                    knockback: 460,
                    hitstun: 0.28
                });
                createImpact(target.x, target.y - 80, color, 1.5);
            }
            break;
        }
        case "buff": {
            addEffect(actor, def.status ?? "focus", def.duration, 1);
            addBarrier(actor, 36, def.canonical);
            break;
        }
        case "heal": {
            healActor(actor, 84);
            addEffect(actor, "regen", 5.2, 1);
            break;
        }
        case "meteor": {
            enqueueDelayedAction(0.22, () => {
                createRain(actor, {
                    shots: 3,
                    spread: 110,
                    damage: def.damage,
                    color,
                    radius: 28,
                    status: def.status,
                    sourceName: def.canonical,
                    speedY: 780
                });
            });
            break;
        }
        case "orbit": {
            createOrbit(actor, {
                radius: def.area.radius * 0.56,
                duration: def.duration,
                damage: def.damage * 0.36,
                color,
                status: def.status,
                sourceName: def.canonical
            });
            break;
        }
        case "wave": {
            if (Math.abs(target.x - actor.x) < def.area.range && Math.abs(target.y - actor.y) < 130) {
                damageActor(actor, target, def.damage, {
                    sourceName: def.canonical,
                    status: def.status,
                    knockback: 410,
                    hitstun: 0.22
                });
            }
            createZone(actor, {
                radius: def.area.radius,
                duration: 1.1,
                damage: 12,
                status: def.status,
                color,
                sourceName: `${def.canonical} の衝撃波`
            });
            break;
        }
        case "time": {
            addEffect(actor, "timewarp", def.duration, 1);
            addEffect(target, "slow", Math.max(2.4, def.duration * 0.72), 1);
            if (def.damage > 0) {
                damageActor(actor, target, def.damage * 0.6, {
                    sourceName: def.canonical,
                    status: def.status,
                    knockback: 210,
                    hitstun: 0.16
                });
            }
            break;
        }
        case "teleport": {
            createTeleportStrike(actor, {
                color,
                damage: def.damage,
                status: def.status,
                sourceName: def.canonical
            });
            break;
        }
        case "counter": {
            actor.counterWindow = 1.2;
            addEffect(actor, def.status ?? "reflect", def.duration, 1);
            break;
        }
        default:
            createProjectile(actor, {
                speed: (def.projectile.speed ?? 8) * 80,
                radius: def.projectile.size ?? 22,
                damage: def.damage,
                color,
                status: def.status,
                sourceName: def.canonical
            });
    }
}

function updateEffects(actor, dt) {
    const stats = getActorStats(actor);
    if (stats.meterRegen > 0) {
        addMeter(actor, stats.meterRegen * dt);
    }

    actor.effects = actor.effects.filter((effect) => {
        effect.time -= dt;
        effect.tick += dt;

        if (effect.name === "burn" && effect.tick >= 0.48) {
            effect.tick = 0;
            damageActor(null, actor, 9 * effect.potency, { sourceName: "burn", dot: true, direct: true });
            createParticle(actor.x, actor.y - 90, STATUS_COLORS.burn, { vx: (Math.random() - 0.5) * 40, vy: -50, life: 0.4, radius: 6 });
        }
        if (effect.name === "poison" && effect.tick >= 0.62) {
            effect.tick = 0;
            damageActor(null, actor, 8 * effect.potency, { sourceName: "poison", dot: true, direct: true });
        }
        if (effect.name === "regen" && effect.tick >= 0.72) {
            effect.tick = 0;
            healActor(actor, 10 * effect.potency);
            createParticle(actor.x, actor.y - 120, STATUS_COLORS.regen, { vy: -40, life: 0.45, radius: 5 });
        }
        if (effect.name === "shock" && effect.tick >= 0.86) {
            effect.tick = 0;
            actor.hitstun = Math.max(actor.hitstun, 0.08);
        }
        if (effect.name === "drain" && effect.tick >= 0.7) {
            effect.tick = 0;
            damageActor(null, actor, 8, { sourceName: "drain", dot: true, direct: true });
        }

        return effect.time > 0;
    });
}

function updateFighter(actor, dt) {
    if (actor.invuln > 0) actor.invuln -= dt;
    if (actor.hitstun > 0) actor.hitstun -= dt;
    if (actor.recovery > 0) actor.recovery -= dt;
    if (actor.counterWindow > 0) actor.counterWindow -= dt;
    if (actor.flash > 0) actor.flash -= dt;
    if (actor.stateTextTimer > 0) actor.stateTextTimer -= dt;
    actor.pulse += dt * 4.2;

    Object.keys(actor.cooldowns).forEach((key) => {
        actor.cooldowns[key] -= dt;
        if (actor.cooldowns[key] <= 0) delete actor.cooldowns[key];
    });

    updateEffects(actor, dt);
    const stats = getActorStats(actor);

    if (actor.queuedAction) {
        actor.queuedAction.time -= dt;
        if (actor.queuedAction.time <= 0) {
            const callback = actor.queuedAction.callback;
            clearQueuedAction(actor);
            callback();
        }
    }

    if (actor.y < FLOOR_Y || actor.vy < 0) {
        actor.vy += 1600 * dt;
        actor.y += actor.vy * dt;
        if (actor.y >= FLOOR_Y) {
            actor.y = FLOOR_Y;
            actor.vy = 0;
        }
    }

    actor.x += actor.vx * dt;
    actor.vx *= Math.pow(0.0007, dt);

    game.walls.forEach((wall) => {
        if (wall.owner === actor) return;
        const overlapX = Math.abs(actor.x - wall.x) < wall.width * 0.5 + actor.width * 0.35;
        const overlapY = Math.abs(actor.y - wall.y) < wall.height * 0.7;
        if (overlapX && overlapY) {
            actor.x += actor.x < wall.x ? -16 : 16;
            actor.vx *= 0.4;
        }
    });

    actor.x = clamp(actor.x, STAGE_LEFT, STAGE_RIGHT);
    const opponent = getOpponent(actor);
    actor.facing = opponent.x > actor.x ? 1 : -1;

    if (actor.side === "player") {
        actor.isChanting = game.isChantMode;
    }
}

function updateProjectiles(dt) {
    game.projectiles = game.projectiles.filter((projectile) => {
        projectile.life -= dt;
        projectile.x += projectile.vx * dt;
        projectile.y += projectile.vy * dt;
        projectile.vy += projectile.gravity * dt;

        const target = getOpponent(projectile.owner);
        const hit =
            Math.abs(projectile.x - target.x) < projectile.radius + target.width * 0.36 &&
            Math.abs(projectile.y - (target.y - 84)) < projectile.radius + 70;

        const blockedByWall = game.walls.some((wall) => {
            if (wall.owner === projectile.owner) return false;
            return (
                projectile.x > wall.x - wall.width * 0.5 &&
                projectile.x < wall.x + wall.width * 0.5 &&
                projectile.y > wall.y - wall.height &&
                projectile.y < wall.y + 10
            );
        });

        if (blockedByWall) {
            createImpact(projectile.x, projectile.y, "#ffffff", 0.6);
            return false;
        }

        if (hit) {
            damageActor(projectile.owner, target, projectile.damage, {
                sourceName: projectile.sourceName,
                status: projectile.status,
                knockback: projectile.knockback,
                hitstun: 0.18
            });
            createImpact(projectile.x, projectile.y, projectile.color, 1);
            if (projectile.pierce > 0) {
                projectile.pierce -= 1;
                return true;
            }
            return false;
        }

        return projectile.life > 0 && projectile.x > -100 && projectile.x < WIDTH + 100 && projectile.y > -80 && projectile.y < HEIGHT + 120;
    });
}

function updateZones(dt) {
    game.zones = game.zones.filter((zone) => {
        zone.duration -= dt;
        zone.tickTimer -= dt;

        if (zone.anchor === "self") {
            zone.angle += dt * 3.4;
            zone.x = zone.owner.x + Math.cos(zone.angle) * zone.radius;
            zone.y = zone.owner.y - 86 + Math.sin(zone.angle) * zone.radius * 0.42;
        }

        if (zone.tickTimer <= 0) {
            zone.tickTimer = zone.tickRate;
            const target = getOpponent(zone.owner);
            const dx = target.x - zone.x;
            const dy = target.y - zone.y;
            if (Math.hypot(dx, dy) <= zone.radius + 58) {
                damageActor(zone.owner, target, zone.damage, {
                    sourceName: zone.sourceName,
                    status: zone.status,
                    knockback: 180,
                    hitstun: 0.12
                });
            }
            if (zone.pull) {
                target.vx += Math.sign(zone.x - target.x) * zone.pull;
            }
        }

        return zone.duration > 0;
    });
}

function updateWalls(dt) {
    game.walls = game.walls.filter((wall) => {
        wall.duration -= dt;
        if (wall.duration > 0) return true;
        createImpact(wall.x, wall.y - 30, wall.color, 0.7);
        return false;
    });
}

function updateSummons(dt) {
    game.summons = game.summons.filter((summon) => {
        summon.life -= dt;
        const target = getOpponent(summon.owner);
        if (summon.homing) {
            summon.vx += Math.sign(target.x - summon.x) * 380 * dt;
            summon.vx = clamp(summon.vx, -780, 780);
        }
        summon.x += summon.vx * dt;
        const hit =
            Math.abs(summon.x - target.x) < summon.radius + target.width * 0.34 &&
            Math.abs(summon.y - (target.y - 82)) < summon.radius + 60;
        if (hit) {
            damageActor(summon.owner, target, summon.damage, {
                sourceName: summon.sourceName,
                status: summon.status,
                knockback: 380,
                hitstun: 0.22
            });
            createImpact(summon.x, summon.y, summon.color, 1.2);
            return false;
        }
        return summon.life > 0 && summon.x > -160 && summon.x < WIDTH + 160;
    });
}

function updateParticles(dt) {
    game.particles = game.particles.filter((particle) => {
        particle.life -= dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vy += particle.gravity * dt;
        return particle.life > 0;
    });
}

function updateBeams(dt) {
    game.beams = game.beams.filter((beam) => {
        beam.life -= dt;
        return beam.life > 0;
    });
}

function updateDelayedActions(dt) {
    game.delayedActions = game.delayedActions.filter((action) => {
        action.delay -= dt;
        if (action.delay <= 0) {
            action.callback();
            return false;
        }
        return true;
    });
}

function updateCpuAI(dt) {
    const cpu = game.cpu;
    const player = game.player;
    if (game.state !== "running") return;
    if (game.mode === "practice") {
        cpu.aiState = "practice";
        cpu.vx *= Math.pow(0.0001, dt);
        return;
    }
    if (cpu.hitstun > 0 || cpu.queuedAction || cpu.recovery > 0) return;

    cpu.aiDecisionTimer -= dt;
    if (cpu.aiDecisionTimer > 0) return;
    cpu.aiDecisionTimer = 0.16 + Math.random() * 0.16;

    const distance = Math.abs(cpu.x - player.x);

    if (player.isChanting) {
        cpu.aiState = "pressure";
    } else if (distance > 320) {
        cpu.aiState = "zoning";
    } else if (distance < 150) {
        cpu.aiState = "scramble";
    } else {
        cpu.aiState = "mid";
    }

    if (cpu.hp < 300 && cpu.meter >= 18 && Math.random() < 0.18) {
        const defensiveSpell = resolveSpecialMove(normalizeSpellInput(Math.random() < 0.5 ? "wall" : "love"));
        if (defensiveSpell) {
            triggerSpecialMove(defensiveSpell, cpu);
            return;
        }
    }

    if (player.y < FLOOR_Y - 24 && distance < 180) {
        triggerKeyMove("r", cpu);
        return;
    }

    if (cpu.aiState === "pressure") {
        if (distance > 180) {
            triggerKeyMove(Math.random() < 0.5 ? "d" : "e", cpu);
        } else if (cpu.meter >= 24 && Math.random() < 0.25) {
            const punishSpell = resolveSpecialMove(normalizeSpellInput(Math.random() < 0.5 ? "thunder" : "cat"));
            if (punishSpell) {
                triggerSpecialMove(punishSpell, cpu);
                return;
            }
        } else {
            triggerKeyMove(["f", "c", "q"][Math.floor(Math.random() * 3)], cpu);
        }
        return;
    }

    if (cpu.aiState === "zoning") {
        triggerKeyMove(["i", "p", ".", "j", "o"][Math.floor(Math.random() * 5)], cpu);
        return;
    }

    if (cpu.aiState === "scramble") {
        if (Math.random() < 0.2) {
            triggerKeyMove("[", cpu);
        } else {
            triggerKeyMove(["q", "w", "f", "c", ","][Math.floor(Math.random() * 5)], cpu);
        }
        return;
    }

    if (Math.random() < 0.18) {
        triggerKeyMove(["1", "4", "5", "-", "]"][Math.floor(Math.random() * 5)], cpu);
        return;
    }

    triggerKeyMove(["u", "h", "n", "v", "a"][Math.floor(Math.random() * 5)], cpu);
}

function triggerKeyMove(code, actor = game.player) {
    const move = KEY_MOVE_MAP[code];
    if (!move || game.state !== "running") return;
    if (actor.hitstun > 0 || actor.queuedAction || actor.recovery > 0) return;
    if (actor.cooldowns[move.key]) return;
    actor.cooldowns[move.key] = move.cooldown / 60;
    queueAction(actor, move.startup / 60, move.label, "key", () => executeKeyMove(actor, move));
}

function updateHud() {
    const player = game.player;
    const cpu = game.cpu;
    if (!player || !cpu) return;

    playerHpFill.style.width = `${(player.hp / player.maxHp) * 100}%`;
    cpuHpFill.style.width = `${(cpu.hp / cpu.maxHp) * 100}%`;
    playerMeterFill.style.width = `${(player.meter / player.maxMeter) * 100}%`;
    cpuMeterFill.style.width = `${(cpu.meter / cpu.maxMeter) * 100}%`;
    playerHpText.textContent = `${Math.round(player.hp)} / ${player.maxHp}`;
    cpuHpText.textContent = `${Math.round(cpu.hp)} / ${cpu.maxHp}`;
    playerMeterText.textContent = `${Math.round(player.meter)} / ${player.maxMeter}`;
    cpuMeterText.textContent = `${Math.round(cpu.meter)} / ${cpu.maxMeter}`;
    timerText.textContent = game.mode === "practice" ? "∞" : `${Math.ceil(game.timeLeft)}`;
}

function updateSpellUi() {
    if (game.uiState === "pause") {
        chantStatePill.className = "pill idle";
        chantStatePill.textContent = "停止中";
        spellPreview.textContent = game.spellRaw || "一時停止中";
        spellHint.textContent = "`Esc` で試合へ戻る";
        spellInput.disabled = true;
        spellInput.placeholder = "一時停止中";
    } else if (game.isChantMode) {
        chantStatePill.className = "pill active";
        chantStatePill.textContent = game.player?.queuedActionKind === "special" ? "発動中" : "詠唱中";
        spellPreview.textContent = game.spellRaw || "入力待ち...";
        spellHint.textContent = "かな / ローマ字 / 英語 の完全一致で必殺技";
        spellInput.disabled = false;
        spellInput.placeholder = "単語を入力して Enter で発動";
    } else if (game.player?.queuedActionKind === "special") {
        chantStatePill.className = "pill casting";
        chantStatePill.textContent = "発動中";
        spellPreview.textContent = game.player.queuedLabel || "詠唱中";
        spellHint.textContent = "詠唱発動中";
        spellInput.disabled = true;
        spellInput.placeholder = "詠唱発動中";
    } else {
        chantStatePill.className = "pill idle";
        chantStatePill.textContent = "待機中";
        spellPreview.textContent = "待機中";
        spellHint.textContent = "`Tab` で詠唱モードへ";
        spellInput.disabled = true;
        spellInput.placeholder = "Tabで詠唱開始。ひらがな / ローマ字 / 英語で入力";
    }
    compositionState.textContent = `IME: ${game.isComposing ? "変換中" : "準備完了"}`;
}

function enterChantMode() {
    if (game.state !== "running" || game.isChantMode) return;
    if (game.player.hitstun > 0 || game.player.queuedAction || game.player.recovery > 0) return;
    game.isChantMode = true;
    game.player.isChanting = true;
    game.spellRaw = "";
    spellInput.value = "";
    spellInput.disabled = false;
    requestAnimationFrame(() => spellInput.focus({ preventScroll: true }));
    addLog("player", "詠唱モード開始");
    setRoundState("詠唱準備", 1.4);
    updateSpellUi();
}

function exitChantMode(reason = "cancel", silent = false) {
    game.isChantMode = false;
    game.isComposing = false;
    if (game.player) game.player.isChanting = false;
    spellInput.blur();
    spellInput.value = "";
    game.spellRaw = "";
    if (!silent && reason === "cancel") {
        addLog("system", "詠唱をキャンセル");
    }
    updateSpellUi();
}

function submitSpell() {
    if (game.state !== "running") return;
    const raw = game.spellRaw;
    const normalized = normalizeSpellInput(raw);
    if (!normalized) {
        addLog("system", "空詠唱は不発");
        exitChantMode("cancel", true);
        return;
    }

    const spell = resolveSpecialMove(normalized);
    if (!spell) {
        addLog("system", `「${raw}」は辞書にないので暴発`);
        game.player.hitstun = Math.max(game.player.hitstun, 0.28);
        createImpact(game.player.x, game.player.y - 80, "#ffffff", 0.8);
        exitChantMode("fail", true);
        return;
    }

    if (game.player.meter < spell.meterCost) {
        addLog("system", `${spell.canonical} にはゲージが ${spell.meterCost} 必要`);
        exitChantMode("fail", true);
        return;
    }

    exitChantMode("cast", true);
    triggerSpecialMove(spell, game.player);
}

function syncSpellRaw() {
    game.spellRaw = spellInput.value;
    updateSpellUi();
}

function appendSpellCharacter(char) {
    spellInput.value += char;
    syncSpellRaw();
}

function removeSpellCharacter() {
    spellInput.value = spellInput.value.slice(0, -1);
    syncSpellRaw();
}

function resolveCombatKey(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return null;
    if (/^Key[A-Z]$/.test(event.code)) {
        return event.code.slice(3).toLowerCase();
    }
    if (/^Digit[0-9]$/.test(event.code)) {
        return event.code.slice(5);
    }
    if (!event.key || event.key.length !== 1) return null;
    const key = event.key.toLowerCase();
    return KEY_MOVE_MAP[key] ? key : null;
}

function handleKeyDown(event) {
    if (game.uiState === "pause") {
        if (event.key === "Escape") {
            event.preventDefault();
            togglePauseOverlay(false);
        }
        return;
    }

    if (event.repeat && !game.isChantMode) return;

    if (event.key === "Tab") {
        event.preventDefault();
        if (game.isChantMode) {
            exitChantMode("cancel");
        } else {
            enterChantMode();
        }
        return;
    }

    if (game.isChantMode) {
        if (event.key === "Escape") {
            event.preventDefault();
            exitChantMode("cancel");
            return;
        }
        if (event.key === "Enter" && !game.isComposing) {
            event.preventDefault();
            submitSpell();
            return;
        }
        if (event.key === "Backspace" && !game.isComposing && document.activeElement !== spellInput) {
            event.preventDefault();
            removeSpellCharacter();
            return;
        }
        if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.length === 1 && !game.isComposing && document.activeElement !== spellInput) {
            event.preventDefault();
            appendSpellCharacter(event.key);
            return;
        }
        spellInput.focus({ preventScroll: true });
        return;
    }

    if (game.state !== "running" || event.isComposing) return;

    if (event.key === "Escape") {
        event.preventDefault();
        togglePauseOverlay(true);
        return;
    }

    const combatKey = resolveCombatKey(event);
    if (combatKey) {
        event.preventDefault();
        triggerKeyMove(combatKey, game.player);
    }
}

function handleTimer(dt) {
    if (game.state !== "running") return;
    if (game.mode === "practice") {
        if (game.stateMessageTimer > 0) {
            game.stateMessageTimer -= dt;
            if (game.stateMessageTimer <= 0) {
                roundState.textContent = game.isChantMode ? "詠唱モード" : "練習中";
            }
        }
        return;
    }
    game.timeLeft -= dt;
    if (game.stateMessageTimer > 0) {
        game.stateMessageTimer -= dt;
        if (game.stateMessageTimer <= 0) {
            roundState.textContent = game.isChantMode ? "詠唱モード" : "対戦中";
        }
    }
    if (game.timeLeft <= 0) {
        const winner = game.player.hp >= game.cpu.hp ? game.player : game.cpu;
        finishRound(winner, `${winner.name} が時間切れ判定で勝利。`);
    }
}

async function toggleFullscreen() {
    try {
        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
        } else {
            await document.exitFullscreen();
        }
    } catch (error) {
        addLog("system", "全画面表示に切り替えられませんでした。");
        console.error(error);
    }
}

function syncFullscreenButton() {
    const label = document.fullscreenElement ? "全画面終了" : "全画面表示";
    if (fullscreenButton) fullscreenButton.textContent = label;
    if (pauseFullscreenButton) pauseFullscreenButton.textContent = label;
}

function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, "#182b49");
    gradient.addColorStop(0.44, "#101527");
    gradient.addColorStop(1, "#2a0e30");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.save();
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 13; i += 1) {
        ctx.fillStyle = i % 2 === 0 ? "#35f2ff" : "#ff8f3d";
        ctx.fillRect(60 + i * 96, 60 + Math.sin((performance.now() * 0.001) + i) * 18, 8, 8);
    }
    ctx.restore();

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    for (let x = 0; x < WIDTH; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, HEIGHT);
        ctx.stroke();
    }
    for (let y = 0; y < HEIGHT; y += 48) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WIDTH, y);
        ctx.stroke();
    }

    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(0, FLOOR_Y + 10, WIDTH, HEIGHT - FLOOR_Y - 10);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(0, FLOOR_Y + 8, WIDTH, 6);
}

function drawActor(actor) {
    const statusTint = actor.effects[0] ? STATUS_COLORS[actor.effects[0].name] || actor.themeColors.accent : actor.themeColors.main;
    ctx.save();
    ctx.translate(actor.x, actor.y);
    ctx.scale(actor.facing, 1);

    if (actor.flash > 0) {
        ctx.globalAlpha = 0.5 + Math.sin(performance.now() * 0.04) * 0.3;
    }

    if (actor.isChanting || actor.queuedActionKind === "special") {
        ctx.strokeStyle = actor.isChanting ? "#ffe06b" : statusTint;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -94, 58 + Math.sin(performance.now() * 0.01) * 5, 0, Math.PI * 2);
        ctx.stroke();
    }

    if (actor.barrier > 0) {
        ctx.strokeStyle = "#fff0a3";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(0, -76, 62, 84, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.fillStyle = actor.themeColors.main;
    ctx.fillRect(-24, -126, 48, 70);
    ctx.fillStyle = actor.themeColors.accent;
    ctx.fillRect(-34, -58, 68, 44);

    ctx.fillStyle = statusTint;
    ctx.beginPath();
    ctx.arc(0, -154, 26, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#08111c";
    ctx.fillRect(-12, -146, 8, 8);
    ctx.fillRect(4, -146, 8, 8);

    ctx.fillStyle = actor.themeColors.main;
    ctx.fillRect(-34, -10, 20, 84);
    ctx.fillRect(14, -10, 20, 84);
    ctx.fillRect(-56, -52, 20, 56);
    ctx.fillRect(36, -52, 20, 56);

    if (actor.stateTextTimer > 0) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "700 18px Noto Sans JP";
        ctx.textAlign = "center";
        ctx.fillText(actor.stateText, 0, -188);
    }

    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(0, 8, 58, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawProjectiles() {
    game.projectiles.forEach((projectile) => {
        ctx.save();
        ctx.fillStyle = projectile.color;
        ctx.shadowBlur = 18;
        ctx.shadowColor = projectile.color;
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

function drawZones() {
    game.zones.forEach((zone) => {
        ctx.save();
        ctx.globalAlpha = 0.2 + Math.sin(performance.now() * 0.01) * 0.05;
        ctx.fillStyle = zone.color;
        ctx.strokeStyle = zone.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    });
}

function drawWalls() {
    game.walls.forEach((wall) => {
        ctx.save();
        ctx.fillStyle = wall.color;
        ctx.globalAlpha = 0.82;
        ctx.fillRect(wall.x - wall.width * 0.5, wall.y - wall.height, wall.width, wall.height);
        ctx.restore();
    });
}

function drawSummons() {
    game.summons.forEach((summon) => {
        ctx.save();
        ctx.translate(summon.x, summon.y);
        ctx.fillStyle = summon.color;
        ctx.shadowBlur = 18;
        ctx.shadowColor = summon.color;
        ctx.beginPath();
        ctx.moveTo(0, -summon.radius);
        ctx.lineTo(summon.radius, 0);
        ctx.lineTo(0, summon.radius);
        ctx.lineTo(-summon.radius, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    });
}

function drawBeams() {
    game.beams.forEach((beam) => {
        ctx.save();
        ctx.strokeStyle = beam.color;
        ctx.lineWidth = 12;
        ctx.shadowBlur = 24;
        ctx.shadowColor = beam.color;
        ctx.beginPath();
        ctx.moveTo(beam.x, beam.y);
        ctx.lineTo(beam.x + beam.length * beam.direction, beam.y);
        ctx.stroke();
        ctx.restore();
    });
}

function drawParticles() {
    game.particles.forEach((particle) => {
        ctx.save();
        ctx.globalAlpha = particle.life / particle.maxLife;
        ctx.fillStyle = particle.color;
        ctx.shadowBlur = particle.glow;
        ctx.shadowColor = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

function drawStatusStrip(actor, x, y) {
    const visible = actor.effects.slice(0, 4);
    visible.forEach((effect, index) => {
        ctx.fillStyle = STATUS_COLORS[effect.name] || "#ffffff";
        ctx.fillRect(x + index * 26, y, 18, 10);
    });
}

function render() {
    ctx.save();
    if (game.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * game.screenShake;
        const shakeY = (Math.random() - 0.5) * game.screenShake;
        ctx.translate(shakeX, shakeY);
        game.screenShake *= 0.88;
    }

    drawBackground();
    drawZones();
    drawWalls();
    drawBeams();
    drawProjectiles();
    drawSummons();
    drawActor(game.player);
    drawActor(game.cpu);
    drawParticles();
    drawStatusStrip(game.player, 90, 86);
    drawStatusStrip(game.cpu, WIDTH - 190, 86);

    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.font = "700 18px Noto Sans JP";
    ctx.fillText(`直前: ${game.player.lastMoveLabel}`, 92, HEIGHT - 42);
    ctx.textAlign = "right";
    ctx.fillText(`CPU: ${game.cpu.lastMoveLabel}`, WIDTH - 92, HEIGHT - 42);
    ctx.restore();
}

function tick(timestamp) {
    if (!game.lastTimestamp) game.lastTimestamp = timestamp;
    const dt = Math.min(0.033, (timestamp - game.lastTimestamp) / 1000);
    game.lastTimestamp = timestamp;

    if (game.state === "running" && game.uiState !== "pause") {
        updateFighter(game.player, dt);
        updateFighter(game.cpu, dt);
        if (game.mode === "practice") {
            healActor(game.player, dt * 18);
            healActor(game.cpu, dt * 30);
            addMeter(game.player, dt * 30);
            game.cpu.meter = 0;
            game.cpu.counterWindow = 0;
            game.cpu.queuedAction = null;
            game.cpu.queuedActionKind = null;
            game.cpu.queuedLabel = "";
        }
        updateProjectiles(dt);
        updateZones(dt);
        updateWalls(dt);
        updateSummons(dt);
        updateParticles(dt);
        updateBeams(dt);
        updateDelayedActions(dt);
        updateCpuAI(dt);
        handleTimer(dt);
        updateHud();
        updateSpellUi();
    } else if (game.state === "running") {
        updateHud();
        updateSpellUi();
    } else {
        updateParticles(dt);
        updateBeams(dt);
    }

    render();
    requestAnimationFrame(tick);
}

spellInput.addEventListener("input", syncSpellRaw);
spellInput.addEventListener("compositionstart", () => {
    game.isComposing = true;
    updateSpellUi();
});
spellInput.addEventListener("compositionend", () => {
    game.isComposing = false;
    syncSpellRaw();
});

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("mousedown", () => {
    if (game.isChantMode && game.uiState === "match") spellInput.focus();
});

startButton.addEventListener("click", () => startGame("battle"));
practiceButton.addEventListener("click", () => startGame("practice"));
fullscreenButton.addEventListener("click", toggleFullscreen);
pauseFullscreenButton.addEventListener("click", toggleFullscreen);
pauseButton.addEventListener("click", () => togglePauseOverlay(true));
resumeButton.addEventListener("click", () => togglePauseOverlay(false));
restartButton.addEventListener("click", () => startGame(game.mode));
document.addEventListener("fullscreenchange", syncFullscreenButton);

buildSpellMap();
populateKeyboardGrid();
populateSpellbookPreview();
resetRound();
setUiState("menu");
if (game.duplicateAliases.length) {
    addLog("system", `必殺技の別名に重複があります: ${game.duplicateAliases.length}件`);
} else {
    addLog("system", `必殺技辞書を読み込みました: ${SPECIAL_LEXICON.length}語`);
}
updateSpellUi();
syncFullscreenButton();
syncUiVisibility();
renderCompactLog();
render();
requestAnimationFrame(tick);
