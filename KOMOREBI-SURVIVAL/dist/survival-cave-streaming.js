/* Stable world-wide cave cells. Only nearby surfaces and dungeon rooms occupy GPU memory. */
(()=>{'use strict';const W=EmberTerrain,P=EmberWorld.prototype,SD=SurvivalDungeons;
const legacy=W.caves.slice(),legacyDungeons=SD.dungeons.slice(),cells=new Map();W.legacyCaves=legacy;
const retained=legacy.filter(c=>c.index%4!==1||c.index===13);for(const c of legacy)c.hasDungeon=[2,13,27].includes(c.index);
function cell(x,z){const key=x+','+z;if(cells.has(key))return cells.get(key);const c=W.createWildCave(x,z);cells.set(key,c);if(cells.size>256)cells.delete(cells.keys().next().value);return c;}
function region(x,z){const out=retained.filter(c=>Math.hypot(c.x-x,c.z-z)<1800),cx=Math.floor(x/800),cz=Math.floor(z/800);for(let a=cx-2;a<=cx+2;a++)for(let b=cz-2;b<=cz+2;b++){const c=cell(a,b);if(c&&Math.hypot(c.x-x,c.z-z)<1800)out.push(c);}return out.sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z)).slice(0,32);}
// Discard only geometry/materials owned by these generated groups, never shared rock meshes.
function release(world,roots){const sharedMaterials=new Set(world.materials.values()),sharedGeometry=new Set(Object.values(NaturalRocks.geometries)),disposed=new Set();for(const root of roots){root.traverse(o=>{if(o.geometry&&(o.userData.ownedGeometry||root.userData.surface===o||o.userData.caveOutcrop||o.isInstancedMesh)){if(!sharedGeometry.has(o.geometry)&&!disposed.has(o.geometry)){o.geometry.dispose();disposed.add(o.geometry);}o.dispose?.();}for(const m of(Array.isArray(o.material)?o.material:[o.material]))if(m&&!sharedMaterials.has(m)&&!disposed.has(m)){m.dispose();disposed.add(m);}});root.removeFromParent?root.removeFromParent():root.parent?.remove(root);}}
function syncMeshes(world,state,force=false){const desired=W.caves.filter(c=>Math.hypot(c.x-state.x,c.z-state.z)<950),ids=new Set(desired.map(c=>c.id));world.caveGroups||=[];world.entranceRocks||=[];
 const removed=world.caveGroups.filter(v=>!ids.has(v.c.id));release(world,removed.map(v=>v.g));for(const {c}of removed)c.floorCache?.clear();world.caveGroups=world.caveGroups.filter(v=>ids.has(v.c.id));world.entranceRocks=world.entranceRocks.filter(r=>ids.has(r.caveId));world.resources=world.resources.filter(r=>{if(r.source?.cave&&!ids.has(r.source.cave)){r.root.parent?.remove(r.root);return false;}return true;});
 const loaded=new Set(world.caveGroups.filter(v=>v.g.userData.surface).map(v=>v.c.id));
 if(world.caveBuildJob&&!ids.has(world.caveBuildJob.c.id)){world.caveBuildJob.iterator.return();world.caveBuildJob=null;}
 if(force){const critical=W.extraCaveAt(state.x,state.z,state.y)||desired[0];if(critical&&!loaded.has(critical.id)){if(world.caveBuildJob?.c.id===critical.id){for(const unused of world.caveBuildJob.iterator){}world.caveBuildJob=null;}else buildSurvivalCaves(world,[critical]);loaded.add(critical.id);}}
 if(!world.caveBuildJob){const c=desired.find(c=>!loaded.has(c.id));if(c)world.caveBuildJob={c,iterator:createSurvivalCaveBuilder(world,[c])};}
 if(world.caveBuildJob){const deadline=performance.now()+6;do{if(world.caveBuildJob.iterator.next().done){loaded.add(world.caveBuildJob.c.id);world.caveBuildJob=null;break;}}while(performance.now()<deadline);}
 const visible=desired.filter(c=>loaded.has(c.id));W.setVisibleCavePortals(visible);
 const wanted=visible.map(c=>legacyDungeons.find(d=>d.cave.id===c.id)||SD.forCave(c)).filter(Boolean),dids=new Set(wanted.map(d=>d.id));for(const entry of world.dungeonGroups||[])if(!dids.has(entry.d.id))release(world,[entry.root,entry.doorRoot]);world.dungeonGroups=(world.dungeonGroups||[]).filter(e=>dids.has(e.d.id));world.dungeonTorches=(world.dungeonTorches||[]).filter(t=>dids.has(t.d.id));SD.dungeons.splice(0,SD.dungeons.length,...wanted);const built=new Set(world.dungeonGroups.map(e=>e.d.id));const additions=wanted.filter(d=>!built.has(d.id));if(additions.length||!world.dungeonLights)SD.build(world,additions);
}
let lastX=Infinity,lastZ=Infinity;
W.syncCaveRegion=(state,world,force=false)=>{if(!force&&Math.hypot(state.x-lastX,state.z-lastZ)<160)return;lastX=state.x;lastZ=state.z;const next=region(state.x,state.z);
 // Keep an older saved underground location usable even if its entrance was thinned out.
 for(const p of[state,state.checkpoint,...(state.structures||[])]){if(!p||p.y>=W.ground(p.x,p.z)-1)continue;for(const c of legacy){const v=W.caveLocal(c,p.x,p.z);if(Math.hypot(c.x-state.x,c.z-state.z)<1800&&W.caveField(c,v.u,v.s)>0&&Math.abs(p.y-W.caveFloor(c,v.u,v.s))<3&&!next.includes(c))next.unshift(c);}}
 W.caves.splice(0,W.caves.length,...next.slice(0,32));if(world)syncMeshes(world,state,force);};
const oldUpdate=P.update;P.update=function(t,state,env){W.syncCaveRegion(state,this);syncMeshes(this,state);return oldUpdate.call(this,t,state,env);};
W.caveDistribution={cellSize:800,dungeonChance:.1,retainedStartCaves:retained.length,cell,region,get cachedCells(){return cells.size;}};
W.syncCaveRegion({x:0,z:24,y:W.ground(0,24)},null,true);
// Initial constructors build this local region; their entrances must match the same uniforms.
const initial=W.caves.filter(c=>Math.hypot(c.x,c.z-24)<950),builder=window.buildSurvivalCaves;window.buildSurvivalCaves=(world,list)=>builder(world,list||initial.slice(0,1));W.setVisibleCavePortals(initial.slice(0,1));SD.dungeons.splice(0,SD.dungeons.length,...initial.map(c=>legacyDungeons.find(d=>d.cave.id===c.id)||SD.forCave(c)).filter(Boolean));
})();
