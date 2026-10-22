/* Real Three.js regression fixture for scenery-only micro-detail LOD. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const THREE=require('../dist/vendor/three.min.js');
const context={window:{},THREE};
for(const file of ['models.js','performance.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist',file),'utf8'),context);
const M=context.window.SkyModels,P=context.window.SkyPerformance;
const scene=new THREE.Scene();
const triangleCount=geometry=>(geometry.index?geometry.index.count:geometry.attributes.position.count)/3;
function rendered(root){let calls=0,triangles=0;root.traverseVisible(node=>{if(node.isMesh){calls++;triangles+=triangleCount(node.geometry)*(node.isInstancedMesh?node.count:1);}});return{calls,triangles};}
function staticWorldVertices(root){
  scene.updateMatrixWorld(true);const vertices=[],p=new THREE.Vector3();
  root.traverse(node=>{if(!node.isMesh||node.isInstancedMesh)return;const geo=node.geometry.index?node.geometry.toNonIndexed():node.geometry;const pos=geo.attributes.position;
    for(let i=0;i<pos.count;i++){p.fromBufferAttribute(pos,i).applyMatrix4(node.matrixWorld);vertices.push(p.toArray().map(v=>v.toFixed(4)).join(','));}
  });return vertices.sort();
}
const island=M.island(12,200);island.position.set(200,-25,-180);scene.add(island);M.tree(island,0,0,.8);
const layers=island.children.filter(node=>node.isInstancedMesh);
assert.equal(layers.length,3,'Only stones, trailing leaves and small flowers are LOD layers');
assert.deepEqual(layers.map(n=>n.count),[42,98,75]);
const layerIdentities=layers.map(node=>({node,geometry:node.geometry,matrix:node.instanceMatrix,material:node.material}));
const staticBefore=staticWorldVertices(island),full=rendered(island);
const lod=P.detailLOD(island.position,layers);
M.batchStatic(island);island.updateMatrix();island.matrixAutoUpdate=false;
assert.deepEqual(staticWorldVertices(island),staticBefore,'Batching retains cliff, island top and tree world geometry');
const fixedMeshes=island.children.filter(node=>node.isMesh&&!node.isInstancedMesh);
assert(fixedMeshes.length>0);
function camera(distance){return island.position.clone().add(new THREE.Vector3(distance,0,0));}
lod.update(camera(200));const distant=rendered(island);
assert.equal(lod.isNear(),false);assert(layers.every(node=>!node.visible));assert(fixedMeshes.every(node=>node.visible),'Distant island silhouette and trees remain visible');
assert.equal(full.triangles-distant.triangles,9588,'Only the three micro-detail layers are removed');
lod.update(camera(89));assert.equal(lod.isNear(),true);assert(layers.every(node=>node.visible));
assert.equal(rendered(island).triangles,full.triangles,'Camera approach restores full original geometry');
assert.equal(rendered(island).calls-distant.calls,3,'Exactly three instanced draws disappear after both cases are batched');
lod.update(camera(110));assert(layers.every(node=>node.visible),'Near-detail survives inside the hysteresis band');
lod.update(camera(121));assert(layers.every(node=>!node.visible));
lod.update(camera(110));assert(layers.every(node=>!node.visible),'Far-detail remains hidden inside the hysteresis band');
lod.update(island.position.clone().add(new THREE.Vector3(0,89,0)));assert(layers.every(node=>node.visible),'Vertical camera approach also restores detail');
for(const {node,geometry,matrix,material} of layerIdentities){assert.equal(node.parent,island);assert.equal(node.geometry,geometry);assert.equal(node.instanceMatrix,matrix);assert.equal(node.material,material);}
assert.deepEqual(staticWorldVertices(island),staticBefore,'Repeated distance changes never alter cliff, top or tree');

// A playable island never registered with scenery LOD retains every detail.
const playable=M.island(28,8);scene.add(playable);const playableDetail=playable.children.filter(n=>n.isInstancedMesh);const playableBefore=rendered(playable);
lod.update(camera(1000));assert(playableDetail.every(node=>node.visible));assert.deepEqual(rendered(playable),playableBefore);

// Aggregate the 25 scenery islands, preserving their trees and rocky silhouettes.
const rng=M.seeded(239),background=[];let allTriangles=0,farTriangles=0,fullCalls=0,farCalls=0;
for(let k=0;k<25;k++){
  const g=M.island(6+rng()*12,200+k);g.position.set(260+k*38,-12-rng()*30,-230);scene.add(g);if(k%2===0)M.tree(g,0,0,.8);
  const details=g.children.filter(node=>node.isInstancedMesh);M.batchStatic(g);const initial=rendered(g);allTriangles+=initial.triangles;fullCalls+=initial.calls;
  const control=P.detailLOD(g.position,details);control.update(new THREE.Vector3());const far=rendered(g);farTriangles+=far.triangles;farCalls+=far.calls;
  assert(far.triangles>0,'Each distant island remains rendered');background.push({g,control});
}
assert.equal(allTriangles-farTriangles,239700);assert.equal(fullCalls-farCalls,75);
background[12].control.update(background[12].g.position.clone());assert.equal(background[12].control.isNear(),true);
console.log(JSON.stringify({result:'PASS: real Three.js scenery layers, world transforms, preserved cliff/top/trees, approach restoration, hysteresis, playable-island isolation',singleIsland:{fullTriangles:full.triangles,distantTriangles:distant.triangles,savedTriangles:full.triangles-distant.triangles},background25:{fullTriangles:allTriangles,distantTriangles:farTriangles,savedTriangles:allTriangles-farTriangles,savedDraws:fullCalls-farCalls}},null,2));
