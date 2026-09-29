// Short contact noise + damped, inharmonic resonances model a hard disc on felt.
// Everything is generated locally; there are no samples or network requests.
export function stoneWave(sampleRate = 48000, kind = 'place', seed = 1) {
  let randomState = seed >>> 0 || 1;
  const random = () => { randomState ^= randomState << 13; randomState ^= randomState >>> 17; randomState ^= randomState << 5; return (randomState >>> 0) / 4294967296; };
  const flip = kind === 'flip', length = Math.ceil(sampleRate * .18), wave = new Float32Array(length);
  const pitch = (flip ? 1.22 : 1) * (.94 + random() * .12);
  const taps = flip ? [[0, .8], [.011 + random() * .005, .48], [.037, .11]] : [[0, 1], [.027 + random() * .01, .13]];
  for (const [offset, strength] of taps) {
    let smooth = 0;
    const start = Math.round(offset * sampleRate);
    for (let i = start; i < length; i++) {
      const t = (i - start) / sampleRate, noise = random() * 2 - 1;
      smooth += .24 * (noise - smooth);
      const attack = 1 - Math.exp(-t / .00022);
      const contact = (noise - smooth) * (.36 * Math.exp(-t / .0022) + .10 * Math.exp(-t / .009));
      const body = [[590,.024,.19],[1270,.016,.14],[2390,.009,.09],[4130,.005,.045]].reduce((v,[f,decay,a]) => v + a * Math.sin(2 * Math.PI * f * pitch * t) * Math.exp(-t / decay), 0);
      const felt = .12 * Math.sin(2 * Math.PI * 175 * t) * Math.exp(-t / .012);
      wave[i] += strength * attack * (contact + body + felt);
    }
  }
  // Very quiet early table reflections; no long ringing or musical pitch sweep.
  const dry = wave.slice();
  for (const [seconds, level] of [[.012,.09],[.026,.045]]) {
    const offset = Math.round(sampleRate * seconds);
    for (let i = offset; i < length; i++) wave[i] += dry[i - offset] * level;
  }
  const peak = wave.reduce((m,v) => Math.max(m,Math.abs(v)),0), scale = .82 / Math.max(peak,.01);
  for (let i = 0; i < length; i++) wave[i] *= scale * Math.min(1,(length - 1 - i) / (sampleRate * .012));
  return wave;
}

export function createStoneAudio(options, contextFactory) {
  let context, master, musicGain, limiter, count = 0, lastFlip = -1, chordGeneration = 0, musicTimer = 0, chordIndex = 0;
  const voices = new Set(), musicVoices = new Map(), cache = new Map();
  const progression = [
    [261.63,329.63,392,493.88,587.33], [220,261.63,329.63,392,493.88],
    [174.61,220,261.63,329.63,392], [196,246.94,293.66,349.23,440]
  ];
  function stopMusic() {
    clearTimeout(musicTimer); musicTimer = 0;
    for (const [source,gain] of musicVoices) {
      try {
        if (context?.state === 'running') {
          gain.gain.cancelScheduledValues(context.currentTime);
          gain.gain.setTargetAtTime(.0001,context.currentTime,.025);
          source.stop(context.currentTime + .14);
        } else source.stop();
      } catch {}
    }
  }
  function scheduleChord() {
    if (!options().music || context?.state !== 'running') return;
    const notes = progression[chordIndex++ % progression.length], now = context.currentTime;
    const chord = [...notes.slice(0,4), notes[0] / 2];
    for (const [i,frequency] of chord.entries()) {
      const oscillator = context.createOscillator(), gain = context.createGain();
      const at = now + i * (i === 4 ? .15 : .42), pad = i === 4;
      oscillator.type = pad ? 'sine' : 'triangle';
      oscillator.frequency.value = pad ? frequency * 1.003 : frequency;
      const level = options().volume * (pad ? .026 : .018);
      gain.gain.setValueAtTime(.0001,at);
      gain.gain.exponentialRampToValueAtTime(Math.max(.0002,level),at + (pad ? 2.2 : .9));
      gain.gain.setValueAtTime(Math.max(.0002,level),at + 6.8);
      gain.gain.exponentialRampToValueAtTime(.0001,at + 8.25);
      oscillator.connect(gain); gain.connect(musicGain);
      oscillator.start(at); oscillator.stop(at + 8.4);
      musicVoices.set(oscillator,gain);
      oscillator.onended = () => { musicVoices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    }
    musicTimer = setTimeout(scheduleChord,8500);
  }
  function startMusic() {
    if (!options().music || context?.state !== 'running' || musicTimer) return;
    scheduleChord();
  }
  function unlock() {
    if (!options().sound && !options().music) return;
    try {
      if (!context) {
        context = contextFactory();
        master = context.createGain(); musicGain = context.createGain(); limiter = context.createDynamicsCompressor();
        limiter.threshold.value = -10; limiter.knee.value = 8; limiter.ratio.value = 8;
        limiter.attack.value = .002; limiter.release.value = .07;
        master.connect(limiter); musicGain.connect(limiter); limiter.connect(context.destination);
      }
      master.gain.setTargetAtTime(options().sound ? options().volume * .78 : 0, context.currentTime,.025);
      musicGain.gain.setTargetAtTime(options().music ? .72 * options().volume : 0, context.currentTime,.15);
      if (context.state === 'suspended') void context.resume().then(startMusic).catch(() => {});
      else startMusic();
    } catch { /* Audio must never prevent playing. */ }
  }
  function track(source, output) {
    voices.add(source);
    source.onended = () => { voices.delete(source); source.disconnect(); output?.disconnect(); };
  }
  function hit(kind = 'place', pan = 0, intensity = 1) {
    if (!options().sound || !options().volume) return false;
    unlock(); if (!context || context.state !== 'running') return false;
    const now = context.currentTime;
    // Simultaneous flips share a contact, preventing harsh piles of transients.
    if (kind === 'flip' && now - lastFlip < .025) return false;
    if (kind === 'flip') lastFlip = now;
    try {
      const variant = Math.floor(Math.random() * 8), key = `${kind}-${variant}`;
      if (!cache.has(key)) {
        const samples = stoneWave(context.sampleRate, kind, 1927 + variant * 7919);
        const buffer = context.createBuffer(1, samples.length, context.sampleRate);
        buffer.copyToChannel(samples,0); cache.set(key,buffer);
      }
      const source = context.createBufferSource(), gain = context.createGain();
      source.buffer = cache.get(key); source.playbackRate.value = .98 + Math.random() * .04;
      gain.gain.value = (kind === 'flip' ? .67 : 1) * Math.min(1,Math.max(0,intensity));
      source.connect(gain);
      if (context.createStereoPanner) {
        const stereo = context.createStereoPanner(); stereo.pan.value = Math.max(-.55, Math.min(.55,pan));
        gain.connect(stereo); stereo.connect(master); track(source,stereo);
        source.addEventListener('ended', () => gain.disconnect(), { once:true });
      } else { gain.connect(master); track(source,gain); }
      source.start(now); count++; return true;
    } catch { return false; }
  }
  function stop() {
    chordGeneration++; lastFlip = -1;
    for (const source of voices) { try { source.stop(); } catch {} }
    voices.clear();
  }
  function suspend() { stop(); stopMusic(); }
  function celebrate() {
    if (!options().sound) return;
    unlock(); if (!context || context.state !== 'running') return;
    const generation = ++chordGeneration;
    for (const [i, frequency] of [523.25,659.25,783.99,1046.5].entries()) {
      if (generation !== chordGeneration) return;
      const source = context.createOscillator(), gain = context.createGain(), at = context.currentTime + i * .1;
      source.type = 'sine'; source.frequency.value = frequency;
      gain.gain.setValueAtTime(0,at); gain.gain.linearRampToValueAtTime(.035,at + .012); gain.gain.exponentialRampToValueAtTime(.0001,at + .65);
      source.connect(gain); gain.connect(master); track(source,gain); source.start(at); source.stop(at + .7);
    }
  }
  function sync() {
    if (!options().sound || !options().volume) stop();
    if (musicGain) musicGain.gain.setTargetAtTime(options().music ? .72 * options().volume : 0,context.currentTime,.15);
    if (master) master.gain.setTargetAtTime(options().sound ? options().volume * .78 : 0,context.currentTime,.012);
    if (options().music) startMusic(); else stopMusic();
  }
  return { unlock, hit, stop, suspend, celebrate, sync, status: () => ({ state:context?.state ?? 'idle', contacts:count, active:voices.size, music:options().music, musicActive:musicVoices.size>0 }) };
}
