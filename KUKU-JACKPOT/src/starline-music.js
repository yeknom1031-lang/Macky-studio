/** Tempo-specific recordings share the existing audio clock, pause and volume buses. */
export class StarlineMusic{
 constructor(audio){this.audio=audio;this.buffers=new Map();this.current=null;this.scheduledBpm=132;}
 async load(maxBpm=220){
  const base=new URL('../assets/audio/festival/starline/',import.meta.url);
  const response=await fetch(new URL('manifest.json',base));if(!response.ok)throw Error('加速する音楽を読み込めませんでした');
  const manifest=await response.json();this.buffers.set(132,this.audio.buffers.get('music:space'));
  const entries=Object.values(manifest.tracks).filter(t=>t.bpm!==132&&t.bpm<=maxBpm);let cursor=0;
  await Promise.all(Array.from({length:2},async()=>{while(cursor<entries.length){const track=entries[cursor++],res=await fetch(new URL(track.file,base));if(!res.ok)throw Error('加速する音楽を読み込めませんでした');this.buffers.set(track.bpm,await this.audio.ctx.decodeAudioData(await res.arrayBuffer()));}}));
 }
 schedule(bpm,at,beat){
  const a=this.audio,buffer=this.buffers.get(bpm);if(!buffer||!a.active)return false;
  const when=a.origin+at,startsAt=Math.max(a.ctx.currentTime,when),offset=((beat%32)*60/bpm+startsAt-when)%buffer.duration;
  if(this.current){this.current.gain.gain.setValueAtTime(1,startsAt);this.current.gain.gain.linearRampToValueAtTime(0,startsAt+.015);this.current.source.stop(startsAt+.016);}
  else if(a.musicSource){a.musicSource.stop(startsAt);a.musicSource=null;}
  const source=a.ctx.createBufferSource(),gain=a.ctx.createGain();source.buffer=buffer;source.loop=true;
  gain.gain.setValueAtTime(0,startsAt);gain.gain.linearRampToValueAtTime(1,startsAt+.015);
  source.connect(gain);gain.connect(a.musicDuck);a.sources.add(source);
  source.onended=()=>{a.sources.delete(source);source.disconnect();gain.disconnect();};source.start(startsAt,offset);
  this.current={source,gain};this.scheduledBpm=bpm;return {when:startsAt,offset,bpm};
 }
}
