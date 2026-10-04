// Exercise actual audio files through file:// with networking disabled.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
const root=path.join(__dirname,'..');
(async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'wacha-audio-test-'));
 fs.copyFileSync(path.join(root,'src/expedition-audio.js'),path.join(temp,'expedition-audio.js'));
 fs.symlinkSync(path.join(root,'assets/audio/runtime'),path.join(temp,'audio'));
 fs.writeFileSync(path.join(temp,'index.html'),'<button onclick="Wacha24Sound.unlock().then(()=>Wacha24Sound.start(0))">Play</button><script src="expedition-audio.js"></script>');
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const results=[];const check=(name,value)=>{assert.ok(value,name);results.push({name,passed:true});};
 try{
  const context=await browser.newContext({offline:true});const page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  await page.addInitScript(()=>{window.audioElements=[];const NativeAudio=window.Audio;window.Audio=function(...args){const audio=new NativeAudio(...args);window.audioElements.push(audio);return audio;};});
  await page.goto(pathToFileURL(path.join(temp,'index.html')).href);
  check('initial silence',(await page.evaluate(()=>Wacha24Sound.getState())).active.length===0);
  await page.getByRole('button').click();
  await page.waitForFunction(()=>Wacha24Sound.getState().active.length===3&&Wacha24Sound.getState().active.every(t=>t.time>.1));
  check('gesture unlock and real file playback',(await page.evaluate(()=>Wacha24Sound.getState())).unlocked);
  const stages=[];
  for(let i=0;i<24;i++){
   const started=await page.evaluate(i=>Wacha24Sound.start(i),i);assert.equal(started,true);
   await page.waitForFunction(()=>Wacha24Sound.getState().active.every(t=>t.readyState>=2&&t.time>.04));
   stages.push(await page.evaluate(()=>({stage:Wacha24Sound.getState().stage,ids:Wacha24Sound.getState().active.map(t=>t.id)})));
  }
  check('all 24 stage music and environment profiles play',stages.length===24&&stages.every(s=>s.ids.includes('crowd')&&s.ids.some(id=>id.startsWith('music-'))));
  await page.evaluate(()=>Wacha24Sound.setVolume(.25));
  check('master volume',(await page.evaluate(()=>Wacha24Sound.getState())).active.every(t=>t.volume<=.25));
  await page.evaluate(()=>Wacha24Sound.setMuted(true));
  await page.waitForTimeout(120);
  check('mute all active and retiring media',await page.evaluate(()=>audioElements.every(a=>a.paused||a.volume===0)));
  await page.evaluate(()=>Wacha24Sound.setMuted(false));
  await page.evaluate(()=>Wacha24Sound.setPaused(true));
  const paused=await page.evaluate(()=>Wacha24Sound.getState());await page.waitForTimeout(250);
  check('pause freezes all media including fades',await page.evaluate(()=>audioElements.every(a=>a.paused)));
  check('pause preserves playback position',(await page.evaluate(()=>Wacha24Sound.getState())).active.every((t,i)=>Math.abs(t.time-paused.active[i].time)<.02));
  await page.evaluate(()=>Wacha24Sound.setPaused(false));await page.waitForTimeout(160);
  check('resume continues playback',(await page.evaluate(()=>Wacha24Sound.getState())).active.every((t,i)=>t.time>paused.active[i].time));
  await page.evaluate(()=>{for(const name of ['countdown','start','wrong','photographer','found','lost','shutter','develop','click'])Wacha24Sound.play(name);});
  await page.waitForTimeout(100);
  check('game cues recorded',(await page.evaluate(()=>Wacha24Sound.getState())).events.includes('shutter'));
  await page.evaluate(()=>{Wacha24Sound.start(8);Wacha24Sound.stop();});await page.waitForTimeout(650);
  check('exit during asynchronous stage change stops all audio',await page.evaluate(()=>audioElements.every(a=>a.paused)&&Wacha24Sound.getState().stage===null&&Wacha24Sound.getState().retiring===0));
  check('no playback errors before reload',(await page.evaluate(()=>Wacha24Sound.getState())).errors.length===0);
  await page.evaluate(()=>{Wacha24Sound.setMuted(true);Wacha24Sound.setVolume(.37);});await page.reload();
  check('mute and volume persist',(await page.evaluate(()=>Wacha24Sound.getSettings())).muted&&(await page.evaluate(()=>Wacha24Sound.getSettings())).volume===.37);
  // Decode every asset, including rarely scheduled whistles and every cue.
  const files=JSON.parse(fs.readFileSync(path.join(root,'assets/audio/tracks.json'))).map(t=>t.id);
  const decoded=await page.evaluate(async ids=>Promise.all(ids.map(id=>new Promise(resolve=>{const audio=new Audio('audio/'+id+'.ogg');audio.onloadedmetadata=()=>resolve({id,duration:audio.duration});audio.onerror=()=>resolve({id,error:true});audio.load();}))),files);
  check('all runtime files decode',decoded.every(t=>!t.error&&Number.isFinite(t.duration)&&t.duration>0));
  await page.evaluate(()=>{document.querySelector('button').onclick=async()=>{window.pcmContext=new AudioContext();await pcmContext.resume();};});
  await page.getByRole('button').click();await page.waitForFunction(()=>window.pcmContext?.state==='running');
  const signals=[];
  for(const id of files){
   const bytes=fs.readFileSync(path.join(root,'assets/audio/runtime',id+'.ogg')).toString('base64');
   const signal=await page.evaluate(async ({id,bytes})=>{
    const raw=Uint8Array.from(atob(bytes),c=>c.charCodeAt(0));
    const buffer=await pcmContext.decodeAudioData(raw.buffer),pcm=buffer.getChannelData(0);
    let peak=0,first=0;for(let n=0;n<pcm.length;n++){const a=Math.abs(pcm[n]);if(a>peak)peak=a;if(!first&&a>.002)first=n;}
    const source=pcmContext.createBufferSource(),gain=pcmContext.createGain(),analyser=pcmContext.createAnalyser();
    source.buffer=buffer;source.loop=true;gain.gain=.01;analyser.fftSize=2048;
    source.connect(gain);gain.connect(analyser);analyser.connect(pcmContext.destination);
    source.start(0,Math.min(first/buffer.sampleRate,Math.max(0,buffer.duration-.005)));
    await new Promise(r=>setTimeout(r,100));const wave=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(wave);
    const signalPeak=Math.max(...wave.map(Math.abs));source.stop();source.disconnect();gain.disconnect();analyser.disconnect();return{id,peak,signalPeak};
   },{id,bytes});signals.push(signal);
  }
  await page.evaluate(()=>pcmContext.close());
  check('all files contain nonzero decoded PCM',signals.every(s=>s.peak>.001));
  check('all files produce a nonzero Chrome analyser signal',signals.every(s=>s.signalPeak>1e-6));
  check('offline without network requests',requests.length===0);check('no browser exceptions',errors.length===0);
  check('no media errors',(await page.evaluate(()=>Wacha24Sound.getState())).errors.length===0);
  const report={at:new Date().toISOString(),offline:true,results,stages,decoded,signals,errors,networkRequests:requests};
  fs.writeFileSync(path.join(root,'assets/production/review/audio-browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:results.length,stages:stages.length,decoded:decoded.length}));
 }finally{await browser.close();fs.rmSync(temp,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
