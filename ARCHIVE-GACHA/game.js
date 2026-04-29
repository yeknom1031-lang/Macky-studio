const STORAGE_KEY = "archive-gacha-save-v1";
const CARD_POOL = Array.isArray(window.CARD_POOL) ? window.CARD_POOL : [];
const UNLIMITED_GACHA_FOR_TEST = true;
const GACHA_CINEMATIC_MS = 10000;
const BGM_THEME_ROTATE_MS = 42000;
const BGM_THEME_CHANGE_WAIT_MS = 5000;
const BGM_MASTER_GAIN = 0.32;
const BGM_BAR_STEPS = 16;

let isCinematicPlaying = false;

const state = loadState();

const refs = {
  appRoot: document.getElementById("appRoot"),
  pullsText: document.getElementById("pullsText"),
  progressText: document.getElementById("progressText"),
  dailyText: document.getElementById("dailyText"),
  resultCard: document.getElementById("resultCard"),
  resultImage: document.getElementById("resultImage"),
  resultRarity: document.getElementById("resultRarity"),
  resultName: document.getElementById("resultName"),
  resultSeries: document.getElementById("resultSeries"),
  pullBtn: document.getElementById("pullBtn"),
  bgmBtn: document.getElementById("bgmBtn"),
  resetBtn: document.getElementById("resetBtn"),
  messageText: document.getElementById("messageText"),
  historyList: document.getElementById("historyList"),
  collectionGrid: document.getElementById("collectionGrid"),
  cinematicOverlay: document.getElementById("cinematicOverlay"),
  cineLabel: document.getElementById("cineLabel"),
  cinePhase: document.getElementById("cinePhase"),
  cineBarFill: document.getElementById("cineBarFill"),
  mobileTabButtons: Array.from(document.querySelectorAll("[data-mobile-tab]")),
};

const BGM_THEMES = {
  fun: {
    label: "楽しい",
    stepMs: 132,
    rootMidi: 72,
    leadWave: "triangle",
    padWave: "sine",
    leadGain: 0.068,
    bassGain: 0.052,
    padGain: 0.018,
    kickGain: 0.14,
    snareGain: 0.06,
    hatGain: 0.015,
    leadLength: 0.14,
    bassLength: 0.2,
    padLength: 1.55,
    leadMotifs: [
      [0, 2, 4, 7, 9, 7, 4, 2, 0, 2, 4, 7, 11, 9, 7, 4],
      [0, null, 4, 7, 9, 11, 9, 7, 5, 4, 2, 0, 2, 4, 5, 7],
      [0, 4, 7, 9, 7, 4, 2, 0, 2, 5, 7, 9, 12, 9, 7, 5],
    ],
    progression: [0, 5, 9, 7],
    padShape: [0, 4, 7, 11],
    bassPattern: [0, null, 0, null, 5, null, 5, null, 9, null, 9, null, 7, null, 7, null],
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1],
    swing: 0.02,
    humanizeMs: 5,
  },
  brave: {
    label: "勇ましい",
    stepMs: 112,
    rootMidi: 67,
    leadWave: "sawtooth",
    padWave: "triangle",
    leadGain: 0.062,
    bassGain: 0.055,
    padGain: 0.016,
    kickGain: 0.16,
    snareGain: 0.072,
    hatGain: 0.014,
    leadLength: 0.11,
    bassLength: 0.18,
    padLength: 1.25,
    leadMotifs: [
      [0, 3, 7, 10, 12, 10, 7, 3, 0, 3, 7, 10, 14, 12, 10, 7],
      [0, null, 3, 7, 10, 7, 3, 0, 2, 3, 5, 7, 10, 12, 10, 5],
      [0, 5, 7, 10, 7, 5, 3, 2, 0, 2, 3, 7, 10, 7, 5, 3],
    ],
    progression: [0, 3, 5, 7],
    padShape: [0, 3, 7, 10],
    bassPattern: [0, null, 0, 3, 3, null, 3, 5, 5, null, 5, 7, 7, null, 7, 5],
    kick: [1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1],
    swing: 0,
    humanizeMs: 4,
  },
  spooky: {
    label: "こわい",
    stepMs: 178,
    rootMidi: 57,
    leadWave: "sine",
    padWave: "square",
    leadGain: 0.05,
    bassGain: 0.046,
    padGain: 0.019,
    kickGain: 0.12,
    snareGain: 0.032,
    hatGain: 0.008,
    leadLength: 0.24,
    bassLength: 0.34,
    padLength: 2.2,
    leadMotifs: [
      [0, null, 1, null, 6, null, 3, null, 1, null, 0, null, -1, null, 3, null],
      [0, null, 3, null, 6, null, 5, null, 3, null, 1, null, 0, null, -2, null],
      [0, null, null, 1, 3, null, 6, null, 3, null, 1, null, 0, null, 1, null],
    ],
    progression: [0, 1, -2, 3],
    padShape: [0, 3, 6, 10],
    bassPattern: [0, null, null, null, 1, null, null, null, -2, null, null, null, 3, null, null, null],
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
    snare: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
    swing: 0.04,
    humanizeMs: 7,
  },
  mystery: {
    label: "神秘",
    stepMs: 148,
    rootMidi: 62,
    leadWave: "square",
    padWave: "triangle",
    leadGain: 0.054,
    bassGain: 0.048,
    padGain: 0.018,
    kickGain: 0.13,
    snareGain: 0.05,
    hatGain: 0.013,
    leadLength: 0.16,
    bassLength: 0.24,
    padLength: 1.7,
    leadMotifs: [
      [0, null, 2, 7, null, 9, 7, null, 4, null, 2, 0, null, 2, 4, 7],
      [0, 4, null, 7, 9, null, 7, 4, null, 2, 0, null, 2, 4, 7, null],
      [0, null, 5, 7, null, 10, 7, null, 5, null, 3, 2, null, 0, 3, 5],
    ],
    progression: [0, 2, 7, 5],
    padShape: [0, 5, 7, 12],
    bassPattern: [0, null, 0, null, 2, null, 2, null, 7, null, 7, null, 5, null, 5, null],
    kick: [1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0],
    swing: 0.025,
    humanizeMs: 6,
  },
};

const bgmState = {
  enabled: true,
  started: false,
  pendingStart: false,
  currentTheme: "fun",
  step: 0,
  currentChord: 0,
  currentMotif: [],
  context: null,
  master: null,
  noiseBuffer: null,
  beatTimer: null,
  themeTimer: null,
  transitionTimer: null,
  isThemeTransitioning: false,
  gestureHandler: null,
};

init();

function init() {
  preloadImages();
  renderCollection();
  renderHistory();
  renderStats();
  attachEvents();
  initMobileTabs();
  initBgm();
  if (CARD_POOL.length === 0) {
    setResultCard(null, "カードが読み込めませんでした。");
    setMessage("カードデータが空です。", true);
    refs.pullBtn.disabled = true;
    return;
  }
  setResultCard(null, "ガチャでカードを集めよう！");
}

function attachEvents() {
  refs.pullBtn.addEventListener("click", () => {
    ensureBgmFromUserAction();
    runPull().catch(() => {
      isCinematicPlaying = false;
      setMessage("演出の再生中にエラーが発生しました。", true);
      renderStats();
    });
  });
  refs.resetBtn.addEventListener("click", handleReset);
}

function initBgm() {
  if (!refs.bgmBtn) {
    return;
  }

  if (!getAudioContextClass()) {
    refs.bgmBtn.textContent = "BGM 未対応";
    refs.bgmBtn.disabled = true;
    refs.bgmBtn.classList.remove("active");
    return;
  }

  refs.bgmBtn.addEventListener("click", handleBgmButton);
  armBgmAutostart();
  document.addEventListener("visibilitychange", handleBgmVisibilityChange);
  startBgm();
  updateBgmButton();
}

function handleBgmButton() {
  if (bgmState.enabled && (!bgmState.started || bgmState.pendingStart)) {
    startBgm();
    updateBgmButton();
    return;
  }
  toggleBgm();
}

function handleBgmVisibilityChange() {
  if (!bgmState.context || !bgmState.started) {
    return;
  }
  if (document.hidden) {
    bgmState.context.suspend().catch(() => {});
    return;
  }
  if (bgmState.enabled) {
    bgmState.context.resume().catch(() => {});
  }
}

function armBgmAutostart() {
  if (bgmState.gestureHandler) {
    return;
  }
  bgmState.gestureHandler = () => {
    if (!bgmState.enabled || (bgmState.started && !bgmState.pendingStart)) {
      return;
    }
    startBgm();
  };
  document.addEventListener("pointerdown", bgmState.gestureHandler, { passive: true });
  document.addEventListener("touchstart", bgmState.gestureHandler, { passive: true });
  document.addEventListener("mousedown", bgmState.gestureHandler, { passive: true });
  document.addEventListener("keydown", bgmState.gestureHandler);
}

function clearBgmAutostart() {
  if (!bgmState.gestureHandler) {
    return;
  }
  document.removeEventListener("pointerdown", bgmState.gestureHandler);
  document.removeEventListener("touchstart", bgmState.gestureHandler);
  document.removeEventListener("mousedown", bgmState.gestureHandler);
  document.removeEventListener("keydown", bgmState.gestureHandler);
  bgmState.gestureHandler = null;
}

function toggleBgm() {
  bgmState.enabled = !bgmState.enabled;
  if (bgmState.enabled) {
    startBgm();
    if (!bgmState.started && !bgmState.pendingStart) {
      armBgmAutostart();
    }
  } else {
    stopBgm();
    clearBgmAutostart();
  }
  updateBgmButton();
}

function startBgm() {
  const AudioContextClass = getAudioContextClass();
  if (!AudioContextClass || !bgmState.enabled) {
    return;
  }

  if (!bgmState.context || bgmState.context.state === "closed") {
    bgmState.context = new AudioContextClass();
    bgmState.master = bgmState.context.createGain();
    bgmState.master.gain.value = BGM_MASTER_GAIN;
    bgmState.master.connect(bgmState.context.destination);
  }

  if (bgmState.context.state === "suspended") {
    bgmState.pendingStart = true;
    bgmState.context
      .resume()
      .then(() => {
        if (bgmState.enabled && (!bgmState.started || bgmState.pendingStart)) {
          startBgm();
        }
      })
      .catch(() => {});
    updateBgmButton();
    return;
  }
  if (bgmState.context.state !== "running") {
    bgmState.pendingStart = true;
    updateBgmButton();
    return;
  }

  bgmState.pendingStart = false;
  if (bgmState.started) {
    return;
  }

  bgmState.started = true;
  bgmState.currentTheme = pickNextTheme(null);
  resetBgmPhrase();
  runBgmStep();
  scheduleNextBgmStep();
  bgmState.themeTimer = window.setInterval(rotateBgmTheme, BGM_THEME_ROTATE_MS);
  clearBgmAutostart();
  updateBgmButton();
}

function stopBgm() {
  if (bgmState.beatTimer) {
    clearTimeout(bgmState.beatTimer);
    bgmState.beatTimer = null;
  }
  if (bgmState.themeTimer) {
    clearInterval(bgmState.themeTimer);
    bgmState.themeTimer = null;
  }
  if (bgmState.transitionTimer) {
    clearTimeout(bgmState.transitionTimer);
    bgmState.transitionTimer = null;
  }

  bgmState.started = false;
  bgmState.pendingStart = false;
  bgmState.step = 0;
  bgmState.isThemeTransitioning = false;
  const ctx = bgmState.context;
  const master = bgmState.master;
  bgmState.context = null;
  bgmState.master = null;
  bgmState.noiseBuffer = null;
  if (ctx && master) {
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    window.setTimeout(() => {
      ctx.close().catch(() => {});
    }, 420);
  }
}

function scheduleNextBgmStep() {
  if (!bgmState.started) {
    return;
  }
  const theme = BGM_THEMES[bgmState.currentTheme] || BGM_THEMES.fun;
  const jitter = (Math.random() * 2 - 1) * (theme.humanizeMs || 0);
  const delay = Math.max(78, theme.stepMs + jitter);
  bgmState.beatTimer = window.setTimeout(() => {
    runBgmStep();
    scheduleNextBgmStep();
  }, delay);
}

function resetBgmPhrase() {
  const theme = BGM_THEMES[bgmState.currentTheme] || BGM_THEMES.fun;
  bgmState.step = 0;
  bgmState.currentChord = theme.progression[0] || 0;
  bgmState.currentMotif = randomChoice(theme.leadMotifs) || [];
}

function runBgmStep() {
  if (!bgmState.started || !bgmState.context || !bgmState.master) {
    return;
  }
  if (bgmState.isThemeTransitioning) {
    return;
  }

  const theme = BGM_THEMES[bgmState.currentTheme] || BGM_THEMES.fun;
  const step = bgmState.step++;
  const barStep = step % BGM_BAR_STEPS;
  const barIndex = Math.floor(step / BGM_BAR_STEPS);
  const now = bgmState.context.currentTime + 0.025;
  const swing = barStep % 2 === 1 ? (theme.swing || 0) * (theme.stepMs / 1000) : 0;
  const when = now + swing;

  if (barStep === 0) {
    bgmState.currentChord = theme.progression[barIndex % theme.progression.length] || 0;
    bgmState.currentMotif = randomChoice(theme.leadMotifs) || bgmState.currentMotif || [];
    playPadChord(theme, when, bgmState.currentChord);
  }

  const motif = bgmState.currentMotif || [];
  const leadInterval = motif.length > 0 ? motif[barStep % motif.length] : null;
  if (leadInterval !== null && leadInterval !== undefined) {
    const leadMidi = theme.rootMidi + bgmState.currentChord + leadInterval;
    playLead(theme, leadMidi, when);
  }

  const bassInterval = theme.bassPattern[barStep];
  if (bassInterval !== null && bassInterval !== undefined) {
    const bassMidi = theme.rootMidi - 24 + bgmState.currentChord + bassInterval;
    playBass(theme, bassMidi, when);
  }

  if (theme.kick[barStep]) {
    playKick(when, theme.kickGain);
  }
  if (theme.snare[barStep]) {
    playSnare(when, theme.snareGain);
  }
  if (theme.hat[barStep]) {
    const hatGain = theme.hatGain * (barStep % 4 === 3 ? 1.2 : 0.9);
    playHat(when, hatGain);
  }

  if (bgmState.currentTheme === "spooky" && barStep % 8 === 6) {
    playLead(theme, theme.rootMidi + bgmState.currentChord + 13, when + 0.07, 0.018, 0.12, "sine");
  }
}

function playLead(theme, midi, when, gainOverride, lengthOverride, waveOverride) {
  const freq = midiToHz(midi);
  const gain = gainOverride ?? theme.leadGain;
  const length = lengthOverride ?? theme.leadLength;
  const wave = waveOverride ?? theme.leadWave;
  playBgmNote(freq, length, gain, wave, when, 0.012, 0.11);

  if (bgmState.currentTheme === "brave" && Math.random() < 0.32) {
    playBgmNote(freq * 2, length * 0.8, gain * 0.32, "square", when + 0.01, 0.01, 0.09);
  }
  if (bgmState.currentTheme === "spooky" && Math.random() < 0.58) {
    playBgmNote(freq * 1.006, length * 1.2, gain * 0.35, "triangle", when + 0.01, 0.02, 0.16);
  }
}

function playBass(theme, midi, when) {
  const freq = midiToHz(midi);
  playBgmNote(freq, theme.bassLength, theme.bassGain, "sine", when, 0.01, 0.1);
  if (bgmState.currentTheme === "brave" || bgmState.currentTheme === "fun") {
    playBgmNote(freq * 0.5, theme.bassLength * 0.9, theme.bassGain * 0.45, "triangle", when, 0.02, 0.12);
  }
}

function playPadChord(theme, when, chordOffset) {
  for (const interval of theme.padShape) {
    const midi = theme.rootMidi + chordOffset + interval;
    playBgmNote(midiToHz(midi), theme.padLength, theme.padGain, theme.padWave, when, 0.08, 0.95);
  }
  playBgmNote(
    midiToHz(theme.rootMidi - 12 + chordOffset),
    theme.padLength * 0.92,
    theme.padGain * 0.42,
    "sine",
    when,
    0.09,
    0.9
  );
}

function playKick(when, gainValue) {
  if (!bgmState.context || !bgmState.master) {
    return;
  }
  const osc = bgmState.context.createOscillator();
  const gain = bgmState.context.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, when);
  osc.frequency.exponentialRampToValueAtTime(46, when + 0.18);
  gain.gain.setValueAtTime(Math.max(gainValue, 0.0001), when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.2);
  osc.connect(gain);
  gain.connect(bgmState.master);
  osc.start(when);
  osc.stop(when + 0.22);
}

function playSnare(when, gainValue) {
  if (!bgmState.context || !bgmState.master) {
    return;
  }
  const noise = createNoiseSource();
  if (noise) {
    const filter = bgmState.context.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 1650;
    const gain = bgmState.context.createGain();
    gain.gain.setValueAtTime(Math.max(gainValue, 0.0001), when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(bgmState.master);
    noise.start(when);
    noise.stop(when + 0.17);
  }

  playBgmNote(midiToHz(48), 0.06, gainValue * 0.35, "triangle", when, 0.004, 0.07);
}

function playHat(when, gainValue) {
  if (!bgmState.context || !bgmState.master) {
    return;
  }
  const noise = createNoiseSource();
  if (!noise) {
    return;
  }
  const filter = bgmState.context.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 5400;
  const gain = bgmState.context.createGain();
  gain.gain.setValueAtTime(Math.max(gainValue, 0.0001), when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.045);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(bgmState.master);
  noise.start(when);
  noise.stop(when + 0.05);
}

function createNoiseSource() {
  if (!bgmState.context) {
    return null;
  }
  const source = bgmState.context.createBufferSource();
  source.buffer = getNoiseBuffer();
  return source;
}

function getNoiseBuffer() {
  if (!bgmState.context) {
    return null;
  }
  if (bgmState.noiseBuffer && bgmState.noiseBuffer.sampleRate === bgmState.context.sampleRate) {
    return bgmState.noiseBuffer;
  }
  const buffer = bgmState.context.createBuffer(1, bgmState.context.sampleRate, bgmState.context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  bgmState.noiseBuffer = buffer;
  return buffer;
}

function playBgmNote(freq, length, gainValue, wave, when, attack = 0.02, release = 0.18) {
  if (!bgmState.context || !bgmState.master) {
    return;
  }
  const osc = bgmState.context.createOscillator();
  const gain = bgmState.context.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(Math.max(gainValue, 0.0001), when + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + length + release);
  osc.connect(gain);
  gain.connect(bgmState.master);
  osc.start(when);
  osc.stop(when + length + release + 0.03);
}

function rotateBgmTheme() {
  startThemeTransition();
}

function startThemeTransition() {
  if (!bgmState.started || !bgmState.context || !bgmState.master) {
    return;
  }
  if (bgmState.isThemeTransitioning) {
    return;
  }

  bgmState.isThemeTransitioning = true;
  const now = bgmState.context.currentTime;
  bgmState.master.gain.cancelScheduledValues(now);
  bgmState.master.gain.setValueAtTime(Math.max(bgmState.master.gain.value, 0.0001), now);
  bgmState.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

  if (bgmState.transitionTimer) {
    clearTimeout(bgmState.transitionTimer);
  }
  bgmState.transitionTimer = window.setTimeout(() => {
    if (!bgmState.started || !bgmState.context || !bgmState.master) {
      bgmState.isThemeTransitioning = false;
      bgmState.transitionTimer = null;
      return;
    }
    bgmState.currentTheme = pickNextTheme(bgmState.currentTheme);
    resetBgmPhrase();

    const restartAt = bgmState.context.currentTime;
    bgmState.master.gain.cancelScheduledValues(restartAt);
    bgmState.master.gain.setValueAtTime(0.0001, restartAt);
    bgmState.master.gain.exponentialRampToValueAtTime(BGM_MASTER_GAIN, restartAt + 0.9);

    bgmState.isThemeTransitioning = false;
    bgmState.transitionTimer = null;
    updateBgmButton();
  }, BGM_THEME_CHANGE_WAIT_MS);

  updateBgmButton();
}

function pickNextTheme(current) {
  const candidates = Object.keys(BGM_THEMES).filter((name) => name !== current);
  return candidates[Math.floor(Math.random() * candidates.length)] || "fun";
}

function randomChoice(list) {
  if (!Array.isArray(list) || list.length === 0) {
    return null;
  }
  return list[Math.floor(Math.random() * list.length)];
}

function updateBgmButton() {
  if (!refs.bgmBtn) {
    return;
  }
  const theme = BGM_THEMES[bgmState.currentTheme] || BGM_THEMES.fun;
  if (!bgmState.enabled) {
    refs.bgmBtn.textContent = "BGM OFF";
  } else if (bgmState.pendingStart) {
    refs.bgmBtn.textContent = "BGM 準備中";
  } else {
    refs.bgmBtn.textContent = bgmState.started ? "BGM ON" : "BGM 開始";
  }
  refs.bgmBtn.classList.toggle("active", bgmState.enabled);
  refs.bgmBtn.setAttribute(
    "title",
    bgmState.enabled
      ? `${
          bgmState.isThemeTransitioning
            ? "BGM切替待機中（5秒）"
            : bgmState.started
            ? "BGM再生中"
            : "BGM待機中"
        }（${theme.label} / 音量ひかえめ）`
      : "BGM停止中"
  );
}

function getAudioContextClass() {
  return window.AudioContext || window.webkitAudioContext || null;
}

function midiToHz(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function ensureBgmFromUserAction() {
  if (!bgmState.enabled || (bgmState.started && !bgmState.pendingStart)) {
    return;
  }
  startBgm();
}

function initMobileTabs() {
  if (!refs.appRoot || refs.mobileTabButtons.length === 0) {
    return;
  }

  for (const button of refs.mobileTabButtons) {
    button.addEventListener("click", () => {
      setMobileTabView(button.dataset.mobileTab);
    });
  }
  setMobileTabView(refs.appRoot.dataset.mobileView || "gacha");
}

function setMobileTabView(tabName) {
  if (!refs.appRoot) {
    return;
  }
  const selected = tabName === "collection" ? "collection" : "gacha";
  refs.appRoot.dataset.mobileView = selected;
  for (const button of refs.mobileTabButtons) {
    const isActive = button.dataset.mobileTab === selected;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  }
}

async function runPull() {
  if (CARD_POOL.length === 0) {
    setMessage("カードデータがありません。", true);
    return;
  }

  if (isCinematicPlaying) {
    return;
  }

  if (!UNLIMITED_GACHA_FOR_TEST && alreadyPulledToday()) {
    setMessage("今日はもうガチャ済みです。明日また引けます。", true);
    renderStats();
    return;
  }

  if (!UNLIMITED_GACHA_FOR_TEST) {
    state.lastPullDate = todayTokyoKey();
  }
  const card = pullOne();
  if (!card) {
    setMessage("カード抽選に失敗しました。", true);
    return;
  }

  isCinematicPlaying = true;
  renderStats();
  setMessage("転送シーケンスを開始します…");
  await playGachaCinematic(card.rarity);

  state.owned[card.id] = (state.owned[card.id] || 0) + 1;
  state.totalPulls += 1;
  addHistory(`${rarityLabel(card.rarity)} ${card.name}`);
  setResultCard(card, "ガチャ成功！");
  isCinematicPlaying = false;
  renderCollection();
  renderHistory();
  renderStats();
  saveState();
}

function pullOne() {
  if (CARD_POOL.length === 0) {
    return null;
  }

  state.pity += 1;
  if (state.pity >= 12) {
    const mythics = CARD_POOL.filter((card) =>
      ["mythic", "legendary"].includes(card.rarity)
    );
    const forced = mythics[Math.floor(Math.random() * mythics.length)] || CARD_POOL[0];
    state.pity = 0;
    return forced;
  }

  const totalWeight = CARD_POOL.reduce((sum, card) => sum + card.weight, 0);
  let pick = Math.random() * totalWeight;
  for (const card of CARD_POOL) {
    pick -= card.weight;
    if (pick <= 0) {
      if (["mythic", "legendary"].includes(card.rarity)) {
        state.pity = 0;
      }
      return card;
    }
  }
  return CARD_POOL[CARD_POOL.length - 1] || CARD_POOL[0];
}

function renderStats() {
  refs.pullsText.textContent = String(state.totalPulls);
  const ownedCount = CARD_POOL.filter((card) => (state.owned[card.id] || 0) > 0).length;
  refs.progressText.textContent = `${ownedCount} / ${CARD_POOL.length}`;
  if (isCinematicPlaying) {
    refs.dailyText.textContent = "演出再生中";
    refs.pullBtn.disabled = true;
    return;
  }

  if (UNLIMITED_GACHA_FOR_TEST) {
    refs.dailyText.textContent = "確認モード（無制限）";
    refs.pullBtn.disabled = false;
    return;
  }

  const pulledToday = alreadyPulledToday();
  refs.dailyText.textContent = pulledToday ? "実行済み" : "未実行";
  refs.pullBtn.disabled = pulledToday;
}

function renderHistory() {
  refs.historyList.innerHTML = "";
  const entries = state.history.slice(0, 18);
  for (const line of entries) {
    const li = document.createElement("li");
    li.textContent = line;
    refs.historyList.appendChild(li);
  }
}

function renderCollection() {
  refs.collectionGrid.innerHTML = "";
  const ownedCards = CARD_POOL.filter((card) => (state.owned[card.id] || 0) > 0);

  if (ownedCards.length === 0) {
    const empty = document.createElement("p");
    empty.className = "collection-empty";
    empty.textContent = "まだカードがありません。ガチャで集めよう！";
    refs.collectionGrid.appendChild(empty);
    return;
  }

  for (const card of ownedCards) {
    const owned = state.owned[card.id];
    const article = document.createElement("article");
    article.className = "card";

    const image = document.createElement("img");
    image.className = "thumb";
    image.src = card.src;
    image.alt = card.name;
    image.onerror = () => {
      image.src = svgFallback(card.name, card.rarity);
    };
    article.appendChild(image);

    const name = document.createElement("p");
    name.className = "name";
    name.textContent = card.name;
    article.appendChild(name);

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = `
      <span class="rarity ${card.rarity}">${rarityLabel(card.rarity)}</span>
      <span>x${owned}</span>
    `;
    article.appendChild(meta);

    refs.collectionGrid.appendChild(article);
  }
}

function setResultCard(card, message) {
  if (!card) {
    refs.resultImage.src = svgFallback("準備中", "uncommon");
    refs.resultRarity.textContent = "準備OK";
    refs.resultRarity.className = "uncommon";
    refs.resultName.textContent = "ボタンを押してガチャ！";
    refs.resultSeries.textContent = "収集画像カード";
    setMessage(message || "");
    return;
  }

  refs.resultImage.src = card.src;
  refs.resultImage.alt = card.name;
  refs.resultImage.onerror = () => {
    refs.resultImage.src = svgFallback(card.name, card.rarity);
  };
  refs.resultRarity.textContent = rarityLabel(card.rarity);
  refs.resultRarity.className = card.rarity;
  refs.resultName.textContent = card.name;
  refs.resultSeries.textContent = card.series;
  setMessage(message || "");

  refs.resultCard.classList.remove("reveal");
  void refs.resultCard.offsetWidth;
  refs.resultCard.classList.add("reveal");
}

function setMessage(text, isWarn = false) {
  refs.messageText.textContent = text;
  refs.messageText.className = isWarn ? "message warn" : "message";
}

function addHistory(line) {
  const time = new Date().toLocaleTimeString("ja-JP", { hour12: false });
  state.history.unshift(`[${time}] ${line}`);
  state.history = state.history.slice(0, 120);
}

function rarityLabel(rarity) {
  if (rarity === "singularity") return "奇跡";
  if (rarity === "celestial") return "極レア";
  if (rarity === "mythic") return "神話";
  if (rarity === "legendary") return "伝説";
  if (rarity === "epic") return "超レア";
  if (rarity === "rare") return "レア";
  if (rarity === "uncommon") return "ふつう";
  if (rarity === "common") return "よく出る";
  return "ふつう";
}

function preloadImages() {
  for (const card of CARD_POOL) {
    const img = new Image();
    img.src = card.src;
  }
}

function svgFallback(title, rarity) {
  let color = "#4f9fdd";
  if (rarity === "common") color = "#7ea69a";
  if (rarity === "uncommon") color = "#4f9fdd";
  if (rarity === "rare") color = "#2b7bd4";
  if (rarity === "epic") color = "#c66f16";
  if (rarity === "legendary") color = "#b34635";
  if (rarity === "mythic") color = "#8e2a82";
  if (rarity === "celestial") color = "#f2a93d";
  if (rarity === "singularity") color = "#ef3fb6";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1d2d44"/>
          <stop offset="100%" stop-color="#2d1f3d"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <rect x="14" y="14" width="292" height="292" fill="none" stroke="${color}" stroke-width="4"/>
      <text x="50%" y="46%" fill="${color}" font-family="sans-serif" text-anchor="middle" font-size="22">画像カード</text>
      <text x="50%" y="58%" fill="#d1d5db" font-family="sans-serif" text-anchor="middle" font-size="14">${escapeXml(title)}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escapeXml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function handleReset() {
  if (!window.confirm("図鑑データを初期化しますか？")) {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
}

function loadState() {
  const empty = {
    totalPulls: 0,
    pity: 0,
    lastPullDate: "",
    owned: {},
    history: [],
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    return {
      ...empty,
      ...parsed,
      owned: parsed.owned || {},
      history: Array.isArray(parsed.history) ? parsed.history : [],
      lastPullDate: parsed.lastPullDate || "",
    };
  } catch {
    return empty;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function todayTokyoKey() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

function alreadyPulledToday() {
  return state.lastPullDate === todayTokyoKey();
}

async function playGachaCinematic(rarity) {
  const overlay = refs.cinematicOverlay;
  overlay.dataset.tier = rarity;
  overlay.classList.remove("opening", "flare");
  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");
  refs.cineBarFill.style.width = "0%";
  refs.cineLabel.textContent = "封印扉 開門儀式";

  const phases = [
    { at: 0, text: "古代錠を解析中…" },
    { at: 1700, text: "封印鍵を解放しています…" },
    { at: 3600, text: "門にエネルギーを注入中…" },
    { at: 6200, text: "封印扉をこじ開けています…" },
    { at: 8600, text: "光の間からカードを召喚中…" },
  ];

  await animateCinematicProgress(GACHA_CINEMATIC_MS, phases, (ratio) => {
    if (ratio >= 0.68 && !overlay.classList.contains("opening")) {
      overlay.classList.add("opening");
    }
    if (ratio >= 0.9 && !overlay.classList.contains("flare")) {
      overlay.classList.add("flare");
    }
  });

  refs.cinePhase.textContent = "開門完了！";
  await sleep(420);

  overlay.classList.remove("show", "opening", "flare");
  overlay.setAttribute("aria-hidden", "true");
}

function animateCinematicProgress(duration, phases, onProgress) {
  return new Promise((resolve) => {
    const started = performance.now();

    function tick(now) {
      const elapsed = now - started;
      const ratio = Math.min(1, elapsed / duration);
      refs.cineBarFill.style.width = `${(ratio * 100).toFixed(1)}%`;
      if (typeof onProgress === "function") {
        onProgress(ratio, elapsed);
      }

      let currentText = phases[0].text;
      for (const phase of phases) {
        if (elapsed >= phase.at) {
          currentText = phase.text;
        }
      }
      refs.cinePhase.textContent = currentText;

      if (ratio < 1) {
        requestAnimationFrame(tick);
        return;
      }
      resolve();
    }

    requestAnimationFrame(tick);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
