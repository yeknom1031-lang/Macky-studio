/* Geometry/LOD regression check; no browser, GPU, save or gameplay state required. */
const assert=require('node:assert/strict');
const T=require('../dist/vendor/three.min.js');
global.THREE=T;global.window=global;
const loaded=[];
T.TextureLoader.prototype.load=function(url,done){loaded.push(url);done(new T.Texture());};
require('../dist/models.js');require('../dist/village.js');
const scene=new T.Scene(),worldGroups={};
const islands=[
  {id:'market',kind:'market',r:28,x:0,z:0},
  {id:'ruins',kind:'ruins',r:31,x:0,z:-195},
  {id:'storm',kind:'storm',r:23,x:-215,z:-310},
  {id:'ancient',kind:'ancient',r:27,x:0,z:-540},
  {id:'mirror',kind:'mirror',r:24,x:-315,z:-470}
];
for(const i of islands){const g=new T.Group();g.position.set(i.x,0,i.z);scene.add(g);worldGroups[i.id]=g;SkyModels.tree(g,-12,14,.8,0);SkyModels.tree(g,12,14,.8,1);}
for(const args of [[-13,-14,8,7,6.5],[12,-14,8,7,8],[0,-22,7,5,9]])SkyModels.house(worldGroups.market,...args);
SkyModels.cyl(worldGroups.storm,2.6,3.7,14,0xc0c8b5,0,7,-5,10);
const art=SkyVillage.create({scene,worldGroups,islands,renderer:{capabilities:{getMaxAnisotropy:()=>8}}});
for(const group of Object.values(worldGroups))SkyModels.batchStatic(group);
let vertexCount=0,instances=0,meshes=0;
scene.traverse(n=>{
  if(!n.isMesh)return;meshes++;
  if(n.isInstancedMesh){instances+=n.count;assert(Array.from(n.instanceMatrix.array).every(Number.isFinite));}
  const p=n.geometry.getAttribute('position');vertexCount+=p.count;
  assert(Array.from(p.array).every(Number.isFinite),n.name+' has non-finite positions');
  const uv=n.geometry.getAttribute('uv');assert(uv&&uv.count===p.count,n.name+' missing material UVs');
  if(n.material.onBeforeCompile&&n.material.customProgramCacheKey().startsWith('village')){
    const shader={uniforms:{},vertexShader:'#include <begin_vertex>'};n.material.onBeforeCompile(shader);assert(shader.uniforms.villageTime);assert(shader.vertexShader.includes('villageTime'));
  }
});
art.update(.016,1,new T.Vector3(0,10,30));const market=art.status();
assert.equal(market.houses,3);assert.equal(market.ruinColumns,6);assert.equal(market.lighthouseDetails,1);
assert.equal(market.lod.nearIslands,1);assert.equal(market.lod.farIslands,4);
assert.equal(Object.keys(market.loaded).length,10);assert(Object.values(market.loaded).every(Boolean));
art.update(.016,2,new T.Vector3(0,10,-195));const ruins=art.status();
assert.equal(ruins.lod.nearIslands,1);assert(ruins.lod.detailedLeavesVisible>0);
art.update(.016,3,new T.Vector3(0,10,-350));const far=art.status();
assert(far.lod.culledDetailMeshes>0);
const manifest=require('../ISLAND-V4-PROMPTS.json');assert.equal(manifest.generated_count,5);
for(const asset of manifest.assets)assert(loaded.some(url=>url.endsWith(asset.file)),asset.file+' is unused');
console.log(JSON.stringify({ok:true,vertexCount,instances,meshes,loadedTextures:loaded.length,leaves:market.leaves,marketLOD:market.lod,ruinsLOD:ruins.lod},null,2));
