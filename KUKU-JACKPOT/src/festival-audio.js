const BASE = new URL('../assets/audio/festival/', import.meta.url);
const RECENT_LIMIT = 10;
export const FESTIVAL_BPM = 132;
export const FESTIVAL_BEAT = 60 / FESTIVAL_BPM;
export const MUSIC_NAMES = ['jackpot', 'forest', 'kitchen', 'space', 'sports', 'finale'];

const eventAliases = {
  start: 'intro', correct: 'answer_correct', correct_big: 'answer_correct_big',
  rhythm: 'rhythm_hit', streak: 'streak_or_progress', wrong: 'answer_wrong_or_timeout',
  retry: 'answer_wrong_or_timeout', character: 'character_reaction', end: 'finish',
};

/** Restrict scripted claims to facts that the caller has positively established. */
export function eligibleCheer(clip, event, context = {}) {
  const requested = eventAliases[event] || event;
  if (clip.event !== requested) return false;
  const c = context;
  const id = Number(clip.id.slice(1));
  if (id >= 11 && id <= 30 && c.correct !== true) return false;
  if (id >= 31 && id <= 40 && c.rhythmHit !== true) return false;
  if (id >= 41 && id <= 50 && c.correct !== true) return false;
  if (id >= 61 && id <= 70 && c.correct !== false) return false;
  if (id >= 81 && id <= 90 && c.character !== clip.voice) return false;
  const conditions = {
    27: () => c.hintUsed === false,
    28: () => c.considered === true || c.responseSeconds >= 1.5,
    39: () => c.gameId === 'jackpot' || c.gameId === 'slot' || c.isSlot === true,
    40: () => c.isJump === true,
    41: () => c.streak === 2,
    42: () => c.streak === 3,
    43: () => c.streak === 5,
    44: () => c.streak >= 2,
    45: () => c.streak >= 3,
    46: () => c.wasWrongBefore === true,
    47: () => c.hintUsed === false,
    48: () => c.improved === true,
    49: () => c.struggled === true,
    50: () => c.isLast === true,
    61: () => c.attempted === true && c.nearMiss === true,
    62: () => c.willRetry === true,
    63: () => c.answerShown === true,
    64: () => c.recitationPrompt === true,
    65: () => c.replaySameNext === true,
    68: () => c.beforeAnswer === true,
    69: () => c.reviewQueued === true,
    70: () => c.attempted === false || c.struggled === true,
    79: () => c.isHalfway === true,
    80: () => c.nextIsLast === true,
    81: () => c.correct === true,
    82: () => c.correct === true && c.claimFalse === true && c.caughtLie === true,
    83: () => c.correct === true,
    84: () => c.correct === true || c.rhythmHit === true,
    85: () => c.correct === true && c.claimFalse === true && c.caughtLie === true,
    86: () => c.correct === true || c.rhythmHit === true,
    87: () => c.correct === true,
    88: () => c.correct === true || c.rhythmHit === true,
    89: () => c.punchSuccess === true,
    90: () => c.repairSuccess === true,
    91: () => c.allCompleted === true,
    94: () => c.roundsCompleted >= 2,
    95: () => c.allCompleted === true,
    96: () => c.finale === true,
    99: () => c.roundsCompleted >= 2,
  };
  return conditions[id] ? conditions[id]() : true;
}

/** Pure selection is exported so truth/timeout/streak restrictions can be tested. */
export function chooseCheer(catalog, clips, event, context = {}, maxSeconds = 1.6, recent = [], random = Math.random) {
  const available = catalog.filter(clip => {
    const seconds = clips[clip.id]?.seconds;
    return Number.isFinite(seconds) && seconds + .1 <= maxSeconds
      && !recent.includes(clip.id) && eligibleCheer(clip, event, context);
  });
  if (!available.length) return null;
  return available[Math.min(available.length - 1, Math.floor(Math.max(0, random()) * available.length))];
}

/** One AudioContext owns the musical clock, voices and sound effects, including pause. */
export class FestivalAudio {
  constructor() {
    this.buffers = new Map();
    this.sources = new Set();
    this.pending = new Map();
    this.recentCheers = [];
    this.volumeSettings = { music: 68, voice: 100, cheer: 85, sfx: 70 };
    this.origin = 0;
    this.active = false;
    this.spoken = null;
    this.manifest = null;
  }

  async unlock() {
    if (!this.ctx) {
      const Constructor = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Constructor) throw new Error('このブラウザでは音声再生を利用できません。');
      this.ctx = new Constructor({ latencyHint: 'interactive' });
      this.master = this.ctx.createGain();
      this.master.gain.value = .85;
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -3;
      limiter.knee.value = 3;
      limiter.ratio.value = 12;
      limiter.attack.value = .003;
      limiter.release.value = .15;
      this.master.connect(limiter);
      limiter.connect(this.ctx.destination);
      this.buses = {};
      for (const name of ['music', 'voice', 'cheer', 'sfx']) {
        this.buses[name] = this.ctx.createGain();
        this.buses[name].gain.value = this.volumeSettings[name] / 100;
        this.buses[name].connect(this.master);
      }
      this.musicDuck = this.ctx.createGain();
      this.musicDuck.connect(this.buses.music);
      // Unlock iOS during the user gesture, before any network awaits.
      const pulse = this.ctx.createBufferSource();
      pulse.buffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
      pulse.connect(this.master);
      pulse.onended = () => pulse.disconnect();
      pulse.start();
    }
    await this.ctx.resume();
  }

  async load(questionList = [], onProgress) {
    if (!this.ctx) await this.unlock();
    if (!this.manifest) {
      const response = await fetch(new URL('manifest.json', BASE));
      if (!response.ok) throw new Error('音声リストを読み込めませんでした。');
      this.manifest = await response.json();
    }
    const wanted = new Set(this.manifest.cheers.map(clip => clip.id));
    for (const question of questionList) {
      const a = question.a ?? question.left ?? question.table;
      const b = question.b ?? question.right ?? question.n;
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || a > 9 || b < 1 || b > 9) {
        throw new Error('九九の出題データが正しくありません。');
      }
      const kinds = Number(question.gameId) === 15 ? ['r', 'a'] : ['q', 'a', 'f'];
      for (const kind of kinds) wanted.add(`${kind}-${a}-${b}`);
    }
    for (const key of MUSIC_NAMES) wanted.add(`music:${key}`);
    const list = [...wanted];
    let completed = 0;
    let cursor = 0;
    onProgress?.(0);
    // Bounded decoding avoids a burst of 300 simultaneous decoders on iPhone.
    const worker = async () => {
      while (cursor < list.length) {
        const key = list[cursor++];
        await this.loadClip(key);
        onProgress?.(++completed / list.length);
      }
    };
    await Promise.all(Array.from({ length: Math.min(6, list.length) }, worker));
    this.loaded = true;
  }

  async loadClip(key) {
    if (this.buffers.has(key)) return this.buffers.get(key);
    if (this.pending.has(key)) return this.pending.get(key);
    const definition = key.startsWith('music:') ? this.manifest.music[key.slice(6)] : this.manifest.clips[key];
    if (!definition) throw new Error(`音声が見つかりません: ${key}`);
    const request = (async () => {
      const response = await fetch(new URL(definition.file, BASE));
      if (!response.ok) throw new Error(`音声を読み込めませんでした: ${key}`);
      const buffer = await this.ctx.decodeAudioData(await response.arrayBuffer());
      this.buffers.set(key, buffer);
      return buffer;
    })();
    this.pending.set(key, request);
    try { return await request; } finally { this.pending.delete(key); }
  }

  start(musicName = 'jackpot') {
    if (!this.ctx || !this.loaded) throw new Error('音声の準備がまだ完了していません。');
    this.stop();
    this.origin = this.ctx.currentTime + .1;
    this.active = true;
    this.recentCheers = [];
    this.setMusic(musicName, this.origin);
    return this.origin;
  }

  setMusic(name = 'jackpot', when = this.ctx?.currentTime) {
    const key = `music:${MUSIC_NAMES.includes(name) ? name : 'jackpot'}`;
    if (!this.ctx || !this.buffers.has(key)) return false;
    if (this.musicSource) {
      try { this.musicSource.stop(when); } catch { /* source already ended */ }
    }
    const source = this.ctx.createBufferSource();
    source.buffer = this.buffers.get(key);
    source.loop = true;
    source.loopStart = 0;
    source.loopEnd = source.buffer.duration;
    source.connect(this.musicDuck);
    this.sources.add(source);
    source.onended = () => { this.sources.delete(source); source.disconnect(); };
    source.start(when);
    this.musicSource = source;
    return true;
  }

  /** Seconds since start on the audible clock; suspended contexts stay still. */
  now() {
    if (!this.ctx || !this.active) return 0;
    let clock = this.ctx.currentTime;
    const stamp = this.ctx.getOutputTimestamp?.();
    if (this.ctx.state === 'running' && stamp?.contextTime > 0 && stamp.performanceTime > 0) {
      clock = Math.min(clock, stamp.contextTime + (performance.now() - stamp.performanceTime) / 1000);
    }
    return Math.max(0, clock - this.origin);
  }

  duration(key) { return this.buffers.get(key)?.duration ?? this.manifest?.clips[key]?.seconds ?? 0; }

  /** Spoken clips share a single lane. Lesson speech may interrupt a cheer. */
  speak(key, options = {}) {
    if (!this.ctx || !this.buffers.has(key) || this.ctx.state !== 'running') return false;
    const isCheer = key.startsWith('C');
    const priority = isCheer ? 1 : 3;
    const now = this.ctx.currentTime;
    const when = Math.max(now, options.at == null ? now : this.origin + options.at);
    const seconds = this.duration(key);
    if (options.maxSeconds != null && seconds + .1 > options.maxSeconds) return false;
    if (this.spoken && this.spoken.until > when) {
      if (priority <= this.spoken.priority && !options.force) return false;
      this.stopSpoken();
    }
    const source = this.ctx.createBufferSource();
    source.buffer = this.buffers.get(key);
    source.connect(this.buses[isCheer ? 'cheer' : 'voice']);
    const spoken = { source, until: when + seconds, priority, key };
    this.spoken = spoken;
    this.sources.add(source);
    this.musicDuck.gain.cancelScheduledValues(now);
    this.musicDuck.gain.setTargetAtTime(isCheer ? .5 : .32, when, .025);
    source.onended = () => {
      this.sources.delete(source);
      source.disconnect();
      if (this.spoken === spoken) {
        this.spoken = null;
        this.musicDuck.gain.setTargetAtTime(1, this.ctx.currentTime, .11);
      }
    };
    source.start(when);
    return { key, seconds };
  }

  cheer(event, context = {}, maxSeconds = 1.6) {
    if (!this.manifest || this.spoken?.until > this.ctx.currentTime) return null;
    const clip = chooseCheer(this.manifest.cheers, this.manifest.clips, event, context, maxSeconds, this.recentCheers);
    if (!clip) return null;
    const played = this.speak(clip.id, { maxSeconds });
    if (!played) return null;
    this.recentCheers.push(clip.id);
    this.recentCheers = this.recentCheers.slice(-RECENT_LIMIT);
    return { ...played, text: clip.text };
  }

  stopSpoken() {
    if (!this.spoken) return;
    const source = this.spoken.source;
    this.spoken = null;
    try { source.stop(); } catch { /* already ended */ }
    this.sources.delete(source);
    source.disconnect();
    this.musicDuck.gain.setTargetAtTime(1, this.ctx.currentTime, .04);
  }

  setVolumes(values = {}) {
    for (const name of ['music', 'voice', 'cheer', 'sfx']) {
      if (Number.isFinite(values[name])) this.volumeSettings[name] = Math.max(0, Math.min(100, values[name]));
      if (this.buses) this.buses[name].gain.setTargetAtTime(this.volumeSettings[name] / 100, this.ctx.currentTime, .03);
    }
  }

  sfx(kind = 'tap') {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const patterns = {
      tap: [[880, 0, .065, .09]], tick: [[1320, 0, .038, .055]],
      hit: [[660, 0, .1, .11], [990, .04, .12, .08]],
      correct: [[784, 0, .16, .1], [988, .06, .16, .1], [1175, .12, .21, .1]],
      wrong: [[392, 0, .16, .07], [523, .1, .18, .06]],
      finish: [[784, 0, .21, .09], [988, .09, .21, .09], [1175, .18, .21, .09], [1568, .27, .35, .1]],
    };
    for (const [frequency, offset, duration, volume] of patterns[kind] || patterns.tap) {
      const time = this.ctx.currentTime + offset;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(volume, time + .004);
      gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
      osc.connect(gain);
      gain.connect(this.buses.sfx);
      this.sources.add(osc);
      osc.onended = () => { this.sources.delete(osc); osc.disconnect(); gain.disconnect(); };
      osc.start(time);
      osc.stop(time + duration + .01);
    }
  }

  async pause() { if (this.ctx?.state === 'running') await this.ctx.suspend(); }
  async resume() { if (this.ctx) await this.ctx.resume(); }

  stop() {
    this.active = false;
    this.spoken = null;
    this.musicSource = null;
    for (const source of this.sources) {
      try { source.stop(); } catch { /* already ended */ }
      source.disconnect();
    }
    this.sources.clear();
    if (this.ctx && this.musicDuck) {
      this.musicDuck.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicDuck.gain.value = 1;
    }
  }
}
