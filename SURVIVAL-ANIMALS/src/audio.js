export class Sound {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.last = 0;
  }
  start() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.14;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
  }
  tone(freq, duration = 0.15, type = "sine", volume = 0.3, delay = 0) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime + delay,
      o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(volume, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + duration + 0.02);
  }
  play(kind) {
    if (["captured", "win", "quest", "discovery"].includes(kind)) {
      [261.6, 329.6, 392, 523.2].forEach((f, i) =>
        this.tone(f, 0.6, "sine", 0.35, i * 0.13),
      );
    } else if (["gather", "craft", "build", "heal"].includes(kind)) {
      this.tone(660, 0.14, "sine", 0.25);
      this.tone(880, 0.22, "sine", 0.2, 0.07);
    } else if (kind === "swing") this.tone(110, 0.1, "triangle", 0.32);
    else if (kind === "hit" || kind === "impact")
      this.tone(65, 0.17, "triangle", 0.45);
    else if (kind === "damage") this.tone(100, 0.2, "sawtooth", 0.15);
    else if (kind === "dodge") this.tone(210, 0.1, "triangle", 0.15);
    else if (kind === "captureStart") this.tone(440, 0.6, "sine", 0.22);
  }
  tick(time, night) {
    if (!this.enabled || !this.ctx || time - this.last < 3.2) return;
    this.last = time;
    const notes = night
      ? [174.6, 220, 261.6, 329.6]
      : [196, 261.6, 329.6, 392, 523.2];
    const n = Math.floor(time / 3.2) % notes.length;
    this.tone(notes[n], 2.6, "sine", 0.065);
    this.tone(notes[(n + 2) % notes.length] / 2, 2.8, "sine", 0.06, 0.1);
  }
}
