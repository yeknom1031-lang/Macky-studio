const BASE = new URL('../assets/audio/festival/', import.meta.url);
const RECENT_LIMIT = 10;
export const FESTIVAL_BPM = 132;
export const FESTIVAL_BEAT = 60 / FESTIVAL_BPM;
export const MUSIC_NAMES = ['jackpot', 'forest', 'kitchen', 'space', 'sports', 'finale'];
export const musicForGame=id=>[1,6,8,17].includes(Number(id))?'jackpot':[2,7,10,13,18].includes(Number(id))?'kitchen':[3,4,12,15].includes(Number(id))?'space':[5,9,16,21].includes(Number(id))?'forest':Number(id)===20?'finale':'sports';
export const STAGE_AUDIO_PROFILES = [
 ['jackpot','metal',740,'rattle'],['sushi','wood',620,'pop'],['rocket','electro',390,'launch'],
 ['ninja','wood',480,'swish'],['frog','pluck',330,'boing'],['quiz','bell',660,'buzzer'],
 ['donuts','metal',290,'press'],['gorilla','drum',140,'punch'],['train','wood',420,'whistle'],
 ['magic','bell',880,'bubble'],['basketball','drum',240,'bounce'],['ghost','bell',550,'ghost'],
 ['socks','wood',560,'cloth'],['hero','electro',440,'rise'],['aliens','electro',700,'radio'],
 ['fishing','pluck',460,'splash'],['delivery','metal',510,'zip'],['octopus','wood',810,'click'],
 ['dragon','drum',190,'puff'],['orchestra','wood',920,'chord'],['forest','pluck',590,'leaf'],
].map(([slug,voice,frequency,action],i)=>Object.freeze({gameId:i+1,slug,voice,frequency,action}));

/** Deterministic short sounds: cue timbre identifies the activity, never its answer. */
export function synthesizeStageSound(gameId,part='tick',sampleRate=24000,{step=0,value,timing,soundOverride}={}){
 const profile=STAGE_AUDIO_PROFILES[Number(gameId)-1];
 if(!profile)return null;
 const action=part==='action',duration=action?.34:part==='accent'?.17:.11;
 const samples=new Float32Array(Math.ceil(duration*sampleRate));
 const pitch=profile.frequency*2**((part==='accent'?7:clampSound(step,0,2)*2)/12);
 const sound=action?(soundOverride||profile.action):profile.voice;
 let seed=2017+profile.gameId*97,last=0,phase=0;
 for(let i=0;i<samples.length;i++){
  const t=i/sampleRate,u=t/duration;
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const noise=seed/2147483648-1,bright=noise-.75*last;last=noise;
  const attack=Math.min(1,t/.003),tail=Math.min(1,(duration-t)/.018);
  let f=pitch,raw=0,decay=action?10:30;
  if(['boing','bounce','bubble','splash'].includes(sound))f=pitch*(1.9-1.35*u)+Math.sin(t*49)*pitch*.12;
  else if(['launch','rise','zip','whistle'].includes(sound))f=pitch*(.7+1.7*u);
  else if(['punch','press','puff'].includes(sound))f=70+pitch*.45*Math.exp(-t*35);
  else if(sound==='ghost')f=pitch*(1+.25*Math.sin(t*19));
  phase+=2*Math.PI*f/sampleRate;
  const fundamental=Math.sin(phase);
  switch(sound){
   case 'wood':case 'click':raw=(fundamental+.36*Math.sin(phase*1.71))*Math.exp(-t*42);break;
   case 'metal':case 'rattle':raw=(fundamental+.38*Math.sin(phase*2.76)+bright*.1)*Math.exp(-t*23);break;
   case 'bell':raw=(fundamental+.25*Math.sin(phase*2.73)+.13*Math.sin(phase*5.4))*Math.exp(-t*19);break;
   case 'drum':case 'punch':case 'press':case 'puff':raw=(fundamental*.8+bright*.33*Math.exp(-t*22))*Math.exp(-t*16);break;
   case 'swish':raw=value===1?(fundamental*.6+bright*.2)*Math.exp(-t*20):bright*Math.sin(Math.PI*u)*.9;break;
   case 'net':raw=bright*Math.exp(-t*22)*.55;break;
   case 'rim':raw=(Math.sin(phase*2.3)+.24*Math.sin(phase*5.4))*Math.exp(-t*28);break;
   case 'leaf':case 'cloth':raw=bright*Math.sin(Math.PI*u)*.48+fundamental*.3*Math.exp(-t*24);break;
   case 'buzzer':raw=(fundamental+.25*Math.sin(phase*1.5))*Math.exp(-t*12);break;
   case 'radio':raw=Math.sin(phase+2*Math.sin(phase*2)*Math.exp(-t*12))*Math.exp(-t*12);break;
   case 'chord':raw=(fundamental+Math.sin(phase*1.25)+Math.sin(phase*1.5))/2*Math.exp(-t*10);break;
   case 'launch':raw=(fundamental*.4+bright*.65*Math.sin(Math.PI*u))*Math.exp(-t*3);break;
   case 'splash':case 'bubble':raw=(fundamental*.68+bright*.3*Math.exp(-t*6))*Math.exp(-t*9);break;
   default:raw=(fundamental+.16*Math.sin(phase*2))*Math.exp(-t*decay);
  }
  // Effects remain below teaching speech, including an early answer during q.
  const gain=action?.24:part==='accent'?.15:.1;
  const sheen=action&&timing==='perfect'?Math.sin(phase*2)*Math.exp(-t*23)*.06:0;
  samples[i]=(raw*gain+sheen)*attack*tail;
 }
 return {samples,seconds:duration,kind:sound};
}
const clampSound=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));

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
    this.cueBuffers = new Map();
    this.scheduledCues = new Map();
    this.recentCheers = [];
    this.volumeSettings = { music: 68, voice: 100, cheer: 85, sfx: 70 };
    this.origin = 0;
    this.active = false;
    this.spoken = null;
    this.manifest = null;
    this.musicLayers = [];
    this.orchestraLevel = 0;
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
    const wanted = this.requiredKeys(questionList);
    for(const clip of this.manifest.cheers)wanted.add(clip.id);
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

  requiredKeys(questionList=[]){
    const wanted=new Set(questionList.map(question=>`music:${musicForGame(question.gameId)}`));
    if(questionList.some(q=>Number(q.gameId)===20))for(const key of Object.keys(this.manifest?.orchestra?.stems||{}))wanted.add(`stem:${key}`);
    for (const question of questionList) {
      const a = question.a ?? question.left ?? question.table;
      const b = question.b ?? question.right ?? question.n;
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || a > 9 || b < 1 || b > 9) {
        throw new Error('九九の出題データが正しくありません。');
      }
      const truthGame=[4,21].includes(Number(question.gameId));
      const kinds = Number(question.gameId) === 15 ? ['r', 'a'] : truthGame||(Number(question.gameId)===12&&question.lesson?.showHint)?['a']:['q','a'];
      for (const kind of kinds) wanted.add(`${kind}-${a}-${b}`);
      if([4,21].includes(Number(question.gameId))&&question.truth===false){
        const key=`f-${a}-${b}-${question.claimed}`;
        if(!this.manifest?.clips[key])throw new Error(`九九の主張と音声が一致しません: ${key}`);
        wanted.add(key);
      }
    }
    return wanted;
  }

  isReadyFor(questionList=[]){
    if(!this.manifest)return false;
    try{return [...this.requiredKeys(questionList)].every(key=>this.buffers.has(key));}catch{return false;}
  }

  async loadClip(key) {
    if (this.buffers.has(key)) return this.buffers.get(key);
    if (this.pending.has(key)) return this.pending.get(key);
    const definition = key.startsWith('music:') ? this.manifest.music[key.slice(6)] : key.startsWith('stem:')?this.manifest.orchestra?.stems[key.slice(5)]:this.manifest.clips[key];
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
    const startsAt = Math.max(this.ctx.currentTime, when);
    if (this.musicSource) {
      try { this.musicSource.stop(startsAt); } catch { /* source already ended */ }
    }
    for(const layer of this.musicLayers){try{layer.source.stop(startsAt);}catch{}}
    this.musicLayers=[];
    if(name==='finale'&&Object.keys(this.manifest?.orchestra?.stems||{}).every(key=>this.buffers.has(`stem:${key}`))&&Object.keys(this.manifest?.orchestra?.stems||{}).length){
      this.musicSource=null;this.currentMusic='finale';
      for(const [instrument,definition] of Object.entries(this.manifest.orchestra.stems)){
        const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();
        source.buffer=this.buffers.get(`stem:${instrument}`);source.loop=true;source.loopStart=0;source.loopEnd=source.buffer.duration;
        gain.gain.value=definition.unlockAfter<=this.orchestraLevel?1:0;
        source.connect(gain);gain.connect(this.musicDuck);this.sources.add(source);
        source.onended=()=>{this.sources.delete(source);source.disconnect();gain.disconnect();};
        source.start(startsAt,(startsAt-when)%source.buffer.duration);
        this.musicLayers.push({source,gain,instrument,unlockAfter:definition.unlockAfter});
      }
      return true;
    }
    this.currentMusic=name;this.orchestraLevel=0;
    const source = this.ctx.createBufferSource();
    source.buffer = this.buffers.get(key);
    source.loop = true;
    source.loopStart = 0;
    source.loopEnd = source.buffer.duration;
    source.connect(this.musicDuck);
    this.sources.add(source);
    source.onended = () => { this.sources.delete(source); source.disconnect(); };
    // If a render frame arrived after the bar line, seek past that elapsed time
    // instead of moving the new track's downbeat off the shared musical grid.
    const offset = (startsAt - when) % source.buffer.duration;
    source.start(startsAt, offset);
    this.musicSource = source;
    return true;
  }

  /** Add real instrumental stems together at the next shared beat boundary. */
  orchestraProgress(count=0){
    const level=Math.floor(clampSound(count,0,5));
    this.orchestraLevel=level;
    if(!this.ctx||!this.active||this.currentMusic!=='finale')return {level,instruments:[]};
    const now=this.ctx.currentTime;
    const when=this.origin+Math.max(0,Math.ceil((now-this.origin)/FESTIVAL_BEAT-1e-6))*FESTIVAL_BEAT;
    for(const layer of this.musicLayers){
      const target=layer.unlockAfter<=level?1:0;
      layer.gain.gain.cancelScheduledValues(when);
      layer.gain.gain.setTargetAtTime(target,Math.max(now,when),.018);
    }
    return {level,when,instruments:this.musicLayers.filter(l=>l.unlockAfter<=level).map(l=>l.instrument)};
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

  /** Schedule a rhythm demonstration on the music clock, never a UI timer. */
  cue(at, kind = 'clap', options = {}) {
    if (!this.ctx || !this.active || !Number.isFinite(at) || at < 0) return false;
    const when = this.origin + at;
    // A late animation frame must not bunch old beats together at "now".
    if (when < this.ctx.currentTime) return false;
    if(STAGE_AUDIO_PROFILES[Number(options.gameId)-1])return this.stageSound(options.gameId,kind==='accent'?'accent':'tick',when,{...options,scheduledCue:true});
    const resolved = { accent: 'kick', demo: 'clap', release: 'snare' }[kind] || kind;
    const name = ['clap', 'kick', 'snare', 'hat', 'tick'].includes(resolved) ? resolved : 'clap';
    if (!this.cueBuffers.has(name)) {
      const sampleRate = this.ctx.sampleRate;
      const seconds = { clap: .17, kick: .24, snare: .17, hat: .065, tick: .065 }[name];
      const buffer = this.ctx.createBuffer(1, Math.ceil(sampleRate * seconds), sampleRate);
      const samples = buffer.getChannelData(0);
      let seed = 1739;
      let lastNoise = 0;
      for (let i = 0; i < samples.length; i++) {
        const t = i / sampleRate;
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const noise = seed / 2147483648 - 1;
        const brightNoise = noise - .82 * lastNoise;
        lastNoise = noise;
        const attack = Math.min(1, t / .0015);
        const tail = Math.min(1, (seconds - t) / .018);
        if (name === 'clap') {
          const bursts = [0, .013, .029].reduce((sum, offset) => sum + (t >= offset ? Math.exp(-(t - offset) * 65) : 0), 0);
          samples[i] = brightNoise * bursts * .21 * attack * tail;
        } else if (name === 'kick') {
          const phase = 2 * Math.PI * (55 * t + 80 * .018 * (1 - Math.exp(-t / .018)));
          samples[i] = Math.sin(phase) * Math.exp(-t * 18) * .62 * attack * tail;
        } else if (name === 'snare') {
          samples[i] = (brightNoise * Math.exp(-t * 28) * .3 + Math.sin(2 * Math.PI * 185 * t) * Math.exp(-t * 40) * .19) * attack * tail;
        } else if (name === 'hat') {
          samples[i] = brightNoise * Math.exp(-t * 80) * .28 * attack * tail;
        } else {
          samples[i] = Math.sin(2 * Math.PI * 1320 * t) * Math.exp(-t * 65) * .12 * attack * tail;
        }
      }
      this.cueBuffers.set(name, buffer);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = this.cueBuffers.get(name);
    source.connect(this.buses.sfx);
    this.sources.add(source);
    this.scheduledCues.set(source,when);
    source.onended = () => { this.sources.delete(source); this.scheduledCues.delete(source); source.disconnect(); };
    source.start(when);
    return { at, when, kind: name, seconds: source.buffer.duration };
  }

  stageSound(gameId,part,when,options={}){
    const key=`stage:${gameId}:${part}:${options.step||0}:${options.value===1?'take':'other'}:${options.timing==='perfect'?'perfect':'plain'}:${options.soundOverride||''}`;
    const profile=STAGE_AUDIO_PROFILES[Number(gameId)-1];
    let buffer=this.cueBuffers.get(key),kind=part==='action'?(options.soundOverride||profile?.action):profile?.voice;
    if(!buffer){
      const rendered=synthesizeStageSound(gameId,part,this.ctx.sampleRate,options);
      if(!rendered)return false;
      buffer=this.ctx.createBuffer(1,rendered.samples.length,this.ctx.sampleRate);buffer.getChannelData(0).set(rendered.samples);kind=rendered.kind;
      this.cueBuffers.set(key,buffer);
    }
    const source=this.ctx.createBufferSource();source.buffer=buffer;source.connect(this.buses.sfx);this.sources.add(source);
    if(options.scheduledCue)this.scheduledCues.set(source,when);
    source.onended=()=>{this.sources.delete(source);this.scheduledCues.delete(source);source.disconnect();};source.start(when);
    return {gameId,part,when,kind,seconds:buffer.duration};
  }

  /** One physical action per accepted answer; it does not queue another voice. */
  action(gameId,options={}){
    if(!this.ctx||!this.active||this.ctx.state!=='running')return false;
    const now=this.ctx.currentTime;
    if(Number(gameId)===8){
      const first=this.stageSound(gameId,'action',now,options);
      const hits=Number.isFinite(options.value)&&options.value<10?1:2;
      if(hits===2)this.stageSound(gameId,'action',now+.27,options);
      return {...first,automaticHits:hits};
    }
    if(Number(gameId)===11&&options.correct){
      const first=this.stageSound(gameId,'action',now,{...options,soundOverride:'swish',value:0});
      if(options.timing!=='perfect')this.stageSound(gameId,'action',now+.5,{...options,soundOverride:'rim'});
      this.stageSound(gameId,'action',now+(options.timing==='perfect'?.65:.75),{...options,soundOverride:'net'});
      return {...first,route:options.timing==='perfect'?'swish':'bank'};
    }
    return this.stageSound(gameId,'action',now,options);
  }

  /** Cancel only not-yet-played countdown sounds, preserving voices and actions. */
  cancelCues(){
    let count=0;
    for(const [source,when] of this.scheduledCues){
      if(when<=(this.ctx?.currentTime??0))continue;
      try{source.stop();}catch{}
      source.disconnect();this.sources.delete(source);this.scheduledCues.delete(source);count++;
    }
    return count;
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
    this.musicLayers = [];
    this.orchestraLevel = 0;
    this.currentMusic = null;
    for (const source of this.sources) {
      try { source.stop(); } catch { /* already ended */ }
      source.disconnect();
    }
    this.sources.clear();
    this.scheduledCues.clear();
    if (this.ctx && this.musicDuck) {
      this.musicDuck.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicDuck.gain.value = 1;
    }
  }
}
