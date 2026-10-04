const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),Module=require('node:module');
const root=path.resolve(__dirname,'..'),coreFile=path.join(root,'src/expedition-core.js'),coreBytes=fs.readFileSync(coreFile),coreModule=new Module(coreFile,module);
// Compile the exact captured bytes so a later source edit cannot relabel an
// already-running simulation with a different implementation's checksum.
coreModule.filename=coreFile;coreModule.paths=module.paths;coreModule._compile(coreBytes.toString('utf8'),coreFile);const C=coreModule.exports;
const dataSource=process.env.QA_DATA||'expedition/data.js',dataBytes=fs.readFileSync(process.env.QA_DATA||path.join(root,dataSource));
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),sourceSHA=sha(coreBytes),dataSHA=sha(dataBytes);
let D;if(process.env.QA_DATA)D=JSON.parse(dataBytes.toString('utf8'));else{const ctx={window:{}};vm.runInNewContext(dataBytes.toString('utf8'),ctx);D=JSON.parse(JSON.stringify(ctx.window.WACHA24_DATA));}
const seconds=Number(process.env.QA_SECONDS||12),stages=[];
function inside(x,y,poly){let b=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],c=poly[j];if((a[1]>y)!==(c[1]>y)&&x<(c[0]-a[0])*(y-a[1])/(c[1]-a[1])+a[0])b=!b;}return b;}
function inHole(s,p){return (s.definition.activityAreas||[]).some(a=>(a.level||0)===(p.level||0)&&(a.holes||[]).some(h=>inside(p.x,p.y,h)));}
for(let i=0;i<24;i++){
 const s=C.create(D,i,4200+i),a=s.definition.activityAreas||[],floor=s.people.filter(p=>a.some(q=>(q.level||0)===(p.level||0)&&inside(p.x,p.y,q.polygon)&&!(q.holes||[]).some(h=>inside(p.x,p.y,h)))).length;
 const seen=new Set([0]),queue=[0];for(let k=0;k<queue.length;k++)for(const n of s.graph.nodes[queue[k]].links)if(!seen.has(n)){seen.add(n);queue.push(n);}
 const r={id:s.definition.key,population:s.people.length,areaCount:a.length,upperAreas:a.filter(x=>x.level).length,totalFloorNodes:s.graph.nodes.filter(n=>n.areaId).length,reachableFloorNodes:s.graph.nodes.filter((n,j)=>n.areaId&&seen.has(j)).length,initialFloorFraction:floor/s.people.length,initialWorking:s.people.filter(p=>p.station!==null).length,initialContactWorkers:s.people.filter(p=>p.station!==null&&s.sites[p.station].contact).length,initialUpperResidents:s.people.filter(p=>p.level===1).length,maxOffFloor:0,maxInHoles:0,maxOverlap:0,failures:[],examples:[]};
 const inspect=()=>{const ground=s.people.filter(p=>p.ride===null&&p.layer<2),bad=ground.filter(p=>!C.canStand(s,p,p.x,p.y)),holes=ground.filter(p=>inHole(s,p));r.maxOffFloor=Math.max(r.maxOffFloor,bad.length);r.maxInHoles=Math.max(r.maxInHoles,holes.length);if(bad.length&&!r.examples.length)r.examples=bad.slice(0,6).map(p=>({id:p.id,x:p.x,y:p.y,node:p.node,to:p.to,level:p.level,area:p.areaId,activity:p.activity}));};
 inspect();C.start(s);for(let k=0;k<seconds*10;k++){C.step(s,.1);inspect();}r.maxOverlap=s.stats.maxOverlap;
 if(!s.definition.livingTown||a.length<6)r.failures.push('missing floor areas');if(seen.size!==s.graph.nodes.length)r.failures.push('disconnected navigation');if(r.initialFloorFraction<.3)r.failures.push('insufficient initial floor distribution');if(r.initialUpperResidents<1)r.failures.push('empty upper floors');if(r.initialContactWorkers<3)r.failures.push('missing visible equipment work');if(r.maxOffFloor)r.failures.push('actor outside navigable surface');if(r.maxInHoles)r.failures.push('actor on furniture/water exclusion');if(r.maxOverlap>=3)r.failures.push('overlap at least three seconds');r.passed=!r.failures.length;stages.push(r);console.log(JSON.stringify(r));
}
const report={schemaVersion:1,passed:stages.every(s=>s.passed),secondsPerStage:seconds,createdAt:new Date().toISOString(),sourceSHA,dataSHA,dataSource,stages};fs.writeFileSync(path.join(root,'assets/production/review/living-town-qa.json'),JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
