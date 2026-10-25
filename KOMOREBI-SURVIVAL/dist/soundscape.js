(() => {
  class Soundscape {
    constructor() { this.context = null; this.musicVolume = 0.5; this.natureVolume = 0.65; this.muted = false; this.paused = false; this.stepAt = 0; }
    start() {
      if (this.context) { this.context.resume(); return; }
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.context = new AudioContext();
      const context = this.context;
      this.master = context.createGain(); this.master.gain.value = 0.65;
      const limiter = context.createDynamicsCompressor(); limiter.threshold.value = -16; limiter.ratio.value = 5;
      this.master.connect(limiter).connect(context.destination);
      this.music = context.createGain(); this.music.gain.value = this.musicVolume; this.music.connect(this.master);
      this.nature = context.createGain(); this.nature.gain.value = this.natureVolume; this.nature.connect(this.master);
      this.reverb = context.createConvolver();
      const impulse = context.createBuffer(2, context.sampleRate * 3, context.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const data = impulse.getChannelData(channel);
        for (let index = 0; index < data.length; index++) data[index] = (Math.random() * 2 - 1) * Math.pow(1 - index / data.length, 3) * 0.35;
      }
      this.reverb.buffer = impulse;
      const wet = context.createGain(); wet.gain.value = 0.28; this.reverb.connect(wet).connect(this.music);
      this.noise = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
      const samples = this.noise.getChannelData(0); let previous = 0;
      for (let index = 0; index < samples.length; index++) { previous = (previous + (Math.random() * 2 - 1) * 0.08) / 1.03; samples[index] = previous; }
      this.wind = this.noiseLayer(380, 0.24, 'lowpass');
      this.water = this.noiseLayer(1500, 0, 'bandpass');
      this.rain = this.noiseLayer(4800, 0, 'highpass');
      this.nextNote = context.currentTime + 0.1; this.noteIndex = 0; this.nextBird = context.currentTime + 1; this.nextNight = context.currentTime + 2;
      context.resume();
    }
    noiseLayer(frequency, volume, type) {
      const source = this.context.createBufferSource(); source.buffer = this.noise; source.loop = true;
      const filter = this.context.createBiquadFilter(); filter.type = type; filter.frequency.value = frequency; filter.Q.value = 0.65;
      const gain = this.context.createGain(); gain.gain.value = volume; source.connect(filter).connect(gain).connect(this.nature); source.start();
      return { gain, filter, source };
    }
    tone(frequency, at, duration, strength, type = 'sine', pan = 0, ambient = false) {
      const context = this.context, oscillator = context.createOscillator(), envelope = context.createGain(), stereo = context.createStereoPanner();
      oscillator.type = type; oscillator.frequency.value = frequency; stereo.pan.value = pan;
      envelope.gain.setValueAtTime(0.0001, at); envelope.gain.exponentialRampToValueAtTime(strength, at + (type === 'sine' ? 0.025 : 0.5)); envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      oscillator.connect(envelope).connect(stereo); stereo.connect(ambient ? this.nature : this.music);
      if (!ambient) envelope.connect(this.reverb);
      oscillator.start(at); oscillator.stop(at + duration + 0.05);
      oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); stereo.disconnect(); };
    }
    update({ paused, biome, altitude, water, weather, wind = 0.2, night = 0, moving, running, time }) {
      if (!this.context) return;
      if (paused !== this.paused) { this.paused = paused; if (paused) this.context.suspend(); else this.context.resume(); }
      if (paused || this.context.state !== 'running') return;
      const now = this.context.currentTime;
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.65, now, 0.08);
      this.music.gain.setTargetAtTime(this.musicVolume*(1-night*0.2), now, 1.2); this.nature.gain.setTargetAtTime(this.natureVolume, now, 0.3);
      this.wind.gain.gain.setTargetAtTime(0.1 + wind*0.28 + Math.min(0.4, altitude / 450) + Math.sin(time * 0.15) * 0.04, now, 1.5);
      this.wind.filter.frequency.setTargetAtTime(280+wind*550,now,2);
      this.water.gain.gain.setTargetAtTime(water ? 0.8 : 0.015, now, 2);
      this.rain.gain.gain.setTargetAtTime(weather * 0.65, now, 1);
      const chords = [[50, 57, 62, 66], [46, 53, 58, 62], [53, 60, 65, 69], [48, 55, 60, 64], [50, 57, 61, 69], [43, 50, 57, 62], [46, 53, 60, 65], [48, 55, 62, 67]];
      const melody = [0, 2, 1, 3, 2, 1, 0, 2, 3, 1, 2, 0, 1, 3, 2, 1];
      if (this.nextNote < now - 1) this.nextNote = now + 0.1;
      while (this.nextNote < now + 0.25) {
        const chord = chords[Math.floor(this.noteIndex / 16) % chords.length];
        const octave = ['snow', 'alpine'].includes(biome) ? 12 : 0;
        const note = chord[melody[this.noteIndex % melody.length]] + 12 + octave;
        const frequency = 440 * Math.pow(2, (note - 69) / 12);
        this.tone(frequency, this.nextNote, 3.5, 0.043, 'sine', Math.sin(this.noteIndex * 1.5) * 0.35);
        this.tone(frequency * 2, this.nextNote, 1.2, 0.008, 'sine', -0.25);
        if (this.noteIndex % 16 === 0) {
          for (const pitch of chord) this.tone(440 * Math.pow(2, (pitch - 69) / 12), this.nextNote, 12, 0.018, 'triangle');
          this.tone(440 * Math.pow(2, (chord[0] - 12 - 69) / 12), this.nextNote, 10, 0.045, 'sine');
        }
        if (this.noteIndex % 8 === 6) this.tone(frequency * 1.5, this.nextNote + 0.25, 5, 0.015, 'sine', 0.6);
        this.nextNote += 0.8+night*0.25; this.noteIndex++;
      }
      if (now > this.nextBird && !['snow', 'desert'].includes(biome)) {
        const pan = Math.sin(time * 0.4), pitch = 1700 + Math.random() * 1300;
        const strength = 0.035*(1-night)*(1-weather*0.85);
        if (strength > 0.0002) for (let count = 0; count < 3; count++) this.tone(pitch + Math.sin(count * 2) * 500, now + count * 0.13, 0.11, strength, 'sine', pan, true);
        this.nextBird = now + 3 + Math.random() * 8;
      }
      if (now > this.nextNight) {
        const strength = night*(1-weather*0.9), pan = Math.sin(time*0.17)*0.8;
        if (strength > 0.02 && !['snow','alpine','desert'].includes(biome)) {
          const pitch = 2600+Math.random()*700;
          for (let pulse = 0; pulse < 4; pulse++) this.tone(pitch,now+pulse*0.11,0.045,0.006*strength,'sine',pan,true);
          if (['forest','autumn'].includes(biome) && Math.random() < 0.3) {
            this.tone(430,now+0.6,0.3,0.018*strength,'sine',-pan,true);
            this.tone(370,now+1.1,0.55,0.014*strength,'sine',-pan,true);
          }
        }
        this.nextNight = now+2+Math.random()*5;
      }
      if (moving && now > this.stepAt) {
        this.stepAt = now + (running ? 0.27 : 0.46);
        const source = this.context.createBufferSource(), filter = this.context.createBiquadFilter(), gain = this.context.createGain();
        source.buffer = this.noise; filter.type = 'lowpass'; filter.frequency.value = water ? 1900 : biome === 'snow' ? 3600 : 700;
        gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
        source.connect(filter).connect(gain).connect(this.nature); source.start(); source.stop(now + 0.18);
        source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
      }
    }
    shutter() {
      if (!this.context || this.muted) return;
      const now = this.context.currentTime;
      this.tone(680, now, 0.05, 0.1, 'sine', 0, true); this.tone(170, now + 0.04, 0.09, 0.09, 'sine', 0, true);
    }
  }
  window.Soundscape = Soundscape;
})();
