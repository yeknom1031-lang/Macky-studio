import { BEAT, END } from './core.js';

export class SoundEngine {
  constructor() { this.buffers = new Map(); this.sources = new Set(); this.origin = 0; this.loaded = false; }
  async unlock() {
    if (!this.ctx) {
      this.ctx = new AudioContext({ latencyHint: 'interactive' });
      this.master = this.ctx.createGain(); this.master.gain.value = .82;
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -3; limiter.knee.value = 3; limiter.ratio.value = 12; limiter.attack.value = .003; limiter.release.value = .12;
      this.master.connect(limiter); limiter.connect(this.ctx.destination);
      for (const name of ['music', 'voice', 'sfx']) { this[name] = this.ctx.createGain(); this[name].connect(this.master); }
    }
    await this.ctx.resume();
  }
  async load(onProgress) {
    if (this.loaded) return;
    const names = ['welcome', 'finish', 'three', 'two', 'one', ...Array.from({length:9}, (_,i) => `q${i+1}`), ...Array.from({length:9}, (_,i) => `a${i+1}`)];
    const files = [['music', './assets/audio/jackpot-funk.wav'], ...names.map(n => [n, `./assets/audio/voice/${n}.wav`])];
    let completed = 0;
    await Promise.all(files.map(async ([key, url]) => {
      if (!this.buffers.has(key)) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`音声ファイルを読み込めませんでした: ${key}`);
        const buffer = await this.ctx.decodeAudioData(await response.arrayBuffer());
        this.buffers.set(key, buffer);
      }
      onProgress?.(++completed / files.length);
    }));
    this.loaded = true;
  }
  volumes(settings) {
    if (!this.ctx) return;
    for (const name of ['music', 'voice', 'sfx']) this[name].gain.setTargetAtTime(settings[name] / 100, this.ctx.currentTime, .03);
  }
  play(name, when = this.ctx.currentTime, bus = 'voice') {
    const buffer = this.buffers.get(name); if (!buffer) return;
    const source = this.ctx.createBufferSource(); source.buffer = buffer; source.connect(this[bus]);
    source.onended = () => { this.sources.delete(source); source.disconnect(); };
    this.sources.add(source); source.start(when); return source;
  }
  tone(when, frequency, length, gain = .17, type = 'sine') {
    const osc = this.ctx.createOscillator(), amp = this.ctx.createGain();
    osc.type = type; osc.frequency.value = frequency;
    amp.gain.setValueAtTime(0, when); amp.gain.linearRampToValueAtTime(gain, when + .004); amp.gain.exponentialRampToValueAtTime(.0001, when + length);
    osc.connect(amp); amp.connect(this.sfx); this.sources.add(osc);
    osc.onended = () => { this.sources.delete(osc); osc.disconnect(); amp.disconnect(); };
    osc.start(when); osc.stop(when + length + .02);
  }
  start(course) {
    this.stop(); this.origin = this.ctx.currentTime + .25;
    this.play('music', this.origin, 'music');
    this.play('welcome', this.origin + BEAT * .3);
    course.forEach(round => {
      const at = beat => this.origin + (round.start + beat) * BEAT;
      this.play(`q${round.n}`, at(.1));
      ['three','two','one'].forEach((name,i) => this.play(name, at(5 + i)));
      this.play(`a${round.n}`, at(10));
      this.tone(at(8), 1568, .13, .10); this.tone(at(8), 1046.5, .21, .07);
    });
    this.play('finish', this.origin + (END - 7.5) * BEAT);
  }
  // Map the audible clock to the screen/input clock, rather than using setInterval as a metronome.
  now() {
    if (!this.ctx) return 0;
    const stamp = this.ctx.getOutputTimestamp?.();
    if (stamp?.contextTime > 0 && stamp.performanceTime > 0 && this.ctx.state === 'running') {
      return Math.min(this.ctx.currentTime, stamp.contextTime + (performance.now() - stamp.performanceTime) / 1000);
    }
    return this.ctx.currentTime - (this.ctx.outputLatency || 0);
  }
  beat() { return (this.now() - this.origin) / BEAT; }
  select() { this.tone(this.ctx.currentTime, 740, .07, .09); }
  hit(correct) {
    const t = this.ctx.currentTime;
    if (correct) [784, 988, 1175, 1568].forEach((f,i) => this.tone(t + i * .045, f, .2, .10));
    else { this.tone(t, 392, .16, .09); this.tone(t+.12, 523, .24, .07); }
  }
  async pause() { if (this.ctx?.state === 'running') await this.ctx.suspend(); }
  async resume() { if (this.ctx) await this.ctx.resume(); }
  stop() {
    for (const source of this.sources) { try { source.stop(); } catch {} source.disconnect(); }
    this.sources.clear();
  }
}
