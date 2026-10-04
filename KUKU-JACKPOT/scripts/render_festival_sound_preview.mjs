// Reproducible listening samples of the production synthesizer and actual stems.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {synthesizeStageSound,FESTIVAL_BEAT} from '../src/festival-audio.js';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const base=path.join(root,'assets/audio/festival'),out=path.join(root,'qa/festival/audio-previews');
fs.mkdirSync(out,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(path.join(base,'manifest.json'),'utf8'));
const report={stageOrder:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21],samples:[]};
function wavRead(file){
 const b=fs.readFileSync(file);let p=12,channels,rate,data;
 while(p+8<=b.length){const size=b.readUInt32LE(p+4),name=b.toString('ascii',p,p+4);if(name==='fmt '){channels=b.readUInt16LE(p+10);rate=b.readUInt32LE(p+12);}if(name==='data')data=b.subarray(p+8,p+8+size);p+=8+size+(size%2);}
 return {channels,rate,samples:Float32Array.from({length:data.length/2},(_,i)=>data.readInt16LE(i*2)/32768)};
}
function write(name,data,rate,channels=1){
 let peak=0,sum=0;for(const v of data){peak=Math.max(peak,Math.abs(v));sum+=v*v;}
 if(peak>=.99)throw new Error(`${name}: clipped preview ${peak}`);
 const b=Buffer.alloc(44+data.length*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(channels,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*channels*2,28);b.writeUInt16LE(channels*2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(data.length*2,40);
 for(let i=0;i<data.length;i++)b.writeInt16LE(Math.round(data[i]*32767),44+i*2);
 fs.writeFileSync(path.join(out,name),b);report.samples.push({file:name,seconds:data.length/rate/channels,peak,rms:Math.sqrt(sum/data.length),bytes:b.length});
}
function add(output,samples,at,rate,gain=1){const start=Math.round(at*rate);for(let i=0;i<samples.length&&start+i<output.length;i++)output[start+i]+=samples[i]*gain;}
for(let group=0;group<3;group++){
 const rate=24000,output=new Float32Array(Math.ceil(7*6*FESTIVAL_BEAT*rate));
 for(let j=0;j<7;j++){
  const gameId=group*7+j+1,start=j*6*FESTIVAL_BEAT;
  for(let beat=0;beat<3;beat++)add(output,synthesizeStageSound(gameId,'tick',rate,{step:beat}).samples,start+beat*FESTIVAL_BEAT,rate,.65*.85);
  add(output,synthesizeStageSound(gameId,'accent',rate).samples,start+3*FESTIVAL_BEAT,rate,.65*.85);
  add(output,synthesizeStageSound(gameId,'action',rate,{timing:'perfect',value:0}).samples,start+3*FESTIVAL_BEAT,rate,.65*.85);
  if(gameId===8)add(output,synthesizeStageSound(gameId,'action',rate,{timing:'perfect'}).samples,start+3*FESTIVAL_BEAT+.27,rate,.65*.85);
 }
 write(`stage-cues-${group*7+1}-${group*7+7}.wav`,output,rate);
}
{
 const stems=Object.values(manifest.orchestra.stems).map(entry=>({...entry,...wavRead(path.join(base,entry.file))}));
 const rate=44100,frames=Math.round(24*FESTIVAL_BEAT*rate),output=new Float32Array(frames*2);
 for(let frame=0;frame<frames;frame++)for(let level=0;level<stems.length;level++){
  const t=frame/rate,starts=level*4*FESTIVAL_BEAT;if(t<starts)continue;
  const ramp=Math.min(1,(t-starts)/.025),stem=stems[level];
  for(let c=0;c<2;c++)output[frame*2+c]+=stem.samples[(frame*2+c)%stem.samples.length]*.55*.85*ramp;
 }
 write('orchestra-adds-six-parts.wav',output,rate,2);
}
{
 const rate=24000,output=new Float32Array(rate*6),q=wavRead(path.join(base,manifest.clips['q-7-8'].file));
 const music=wavRead(path.join(base,manifest.music.space.file));
 for(let i=0;i<output.length;i++){
  const j=Math.floor(i*music.rate/rate)*2;output[i]=(music.samples[j%music.samples.length]+music.samples[(j+1)%music.samples.length])/2*.55*.32*.85;
 }
 add(output,q.samples,.2*FESTIVAL_BEAT,rate,.95*.85);
 add(output,synthesizeStageSound(3,'action',rate).samples,.65,rate,.65*.85);
 write('early-answer-during-question.wav',output,rate);
}
fs.writeFileSync(path.join(out,'qa.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
