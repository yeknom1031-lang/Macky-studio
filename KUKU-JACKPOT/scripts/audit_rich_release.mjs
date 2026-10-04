import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'assets/source-art/rich-800');
const jobs=JSON.parse(await fs.readFile(path.join(source,'jobs.json'),'utf8'));
const names=(await fs.readdir(path.join(source,'receipts'))).filter(n=>n.endsWith('.json'));
assert.equal(jobs.length,800);assert.equal(names.length,800,'The actual-call budget is not complete');
const records=await Promise.all(names.map(async n=>JSON.parse(await fs.readFile(path.join(source,'receipts',n),'utf8'))));
assert.equal(new Set(records.map(r=>r.id)).size,800);
const hashes=new Set(),adopted=[];
for(const job of jobs){
 const receipt=records.find(r=>r.id===job.id);
 assert(receipt,`Missing call ${job.id}`);assert.equal(receipt.tool,'image_gen');
 assert(['complete','rejected'].includes(receipt.status),`Call ${job.id} unresolved`);
 assert(receipt.dispatchedAt&&receipt.completedAt,`Call ${job.id} missing timestamps`);
 assert(receipt.qualityNote||receipt.quality?.notes,`Call ${job.id} has no visual review`);
 const original=await fs.readFile(path.join(root,receipt.source));
 const hash=createHash('sha256').update(original).digest('hex');
 assert(!hashes.has(hash),`Repeated source output for ${job.id}`);hashes.add(hash);
 if(receipt.status==='complete'){
  const file=path.join(root,'assets/runtime/rich',receipt.runtime),bytes=(await fs.stat(file)).size;
  assert(bytes<25*1024*1024);assert(receipt.usableFrames.length>0);
  if(job.transparent)assert(receipt.alpha>=.05,`Call ${job.id} lacks transparency`);
  adopted.push({...job,...receipt,bytes});
 }
}
const manifest=JSON.parse(await fs.readFile(path.join(root,'assets/runtime/rich/manifest.json'),'utf8'));
assert.equal(manifest.clips.length,adopted.length);
for(const clip of adopted)assert(manifest.clips.some(c=>c.id===clip.id&&c.file===clip.runtime));
const stages=[...new Set(jobs.filter(j=>j.stage).map(j=>j.stage))];
const coverage=stages.map(stage=>{
 const clips=adopted.filter(c=>c.stage===stage),characters=clips.filter(c=>c.kind==='character');
 for(const action of ['talk','idle','anticipate','act','hold','win','recover','exit'])assert(characters.some(c=>c.action===action&&c.usableFrames.length>=3),`${stage}/${action}: no coherent animated performance`);
 assert.equal(clips.filter(c=>c.kind==='background').length,4,`${stage}: missing backgrounds`);
 assert(clips.some(c=>c.kind==='prop'),`${stage}: missing interactive object`);
 assert(clips.some(c=>c.kind==='result'),`${stage}: missing result artwork`);
 return {stage,adoptedSheets:clips.length,characterClips:characters.length,characterFrames:characters.reduce((n,c)=>n+c.usableFrames.length,0),backgrounds:4};
});
assert.equal(stages.length,21);
assert.equal(adopted.filter(c=>c.kind==='digit').length,30);
const report={version:1,checkedAt:new Date().toISOString(),actualImageGenerationCalls:800,uniqueOriginalOutputs:hashes.size,adoptedSheets:adopted.length,rejectedSheets:records.filter(r=>r.status==='rejected').length,adoptedFrames:adopted.reduce((n,c)=>n+c.usableFrames.length,0),runtimeBytes:adopted.reduce((n,c)=>n+c.bytes,0),coverage,countPolicy:'Actual built-in image_gen invocations, not individual frames. Historical calls are excluded. Rejected and repaired outputs still count as calls.',qualityPolicy:'Visual review plus conservative alpha boundary exclusions. Original outputs are retained locally; only adopted WebP assets are deployed.'};
await fs.writeFile(path.join(root,'designs/20-minigames/rich-release-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
