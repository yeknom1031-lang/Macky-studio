/* Real Three.js geometry/API regression checks, with image decode stubbed for Node. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const THREE=require('../dist/vendor/three.min.js');
const canvasContext=new Proxy({}, {get(target,key){if(key==='canvas')return {width:768,height:768};return target[key]||(target[key]=()=>{});},set(target,key,value){target[key]=value;return true;}});
const document={createElement:()=>({width:768,height:768,getContext:()=>canvasContext})};
const loaded=[];
THREE.TextureLoader.prototype.load=function(url,onLoad){const t=new THREE.Texture();t.userData={url};loaded.push(url);if(onLoad)onLoad(t);return t;};
const context={THREE,window:{},document};
const read=name=>fs.readFileSync(path.join(__dirname,'../dist',name),'utf8');
vm.runInNewContext(read('models.js'),context);
const M=context.window.SkyModels;
const baseFactory=M.ship;
function stats(root){let calls=0,triangles=0;root.traverse(node=>{if(node.isMesh&&node.visible){calls++;const g=node.geometry;triangles+=(g.index?g.index.count:g.attributes.position.count)/3;}});return{calls,triangles};}
function hasParent(node,root){for(let p=node;p;p=p.parent)if(p===root)return true;return false;}
vm.runInNewContext(read('shipwright.js'),context);
const results=[];
for(const enemy of [false,true]){
  const base=baseFactory(enemy),rig=M.ship(enemy);
  const legacyPorts=root=>root.children.filter(n=>n.isMesh&&n.geometry.type==='TorusGeometry'&&n.geometry.parameters.radius===.19&&n.geometry.parameters.tube===.055);
  assert.equal(legacyPorts(base.group).length,6,'Original ship has six detached legacy rings');
  assert.equal(legacyPorts(rig.group).length,0,'Upgraded ship removes legacy rings before batching');
  for(const key of enemy?['group','sail','engines']:['group','sail','hero','helm','engines','exhausts'])assert(rig[key],`${key} preserved`);
  const cloth=[];rig.sail.traverse(node=>{if(node.isMesh&&node.geometry.type==='PlaneGeometry')cloth.push(node);});
  assert.equal(cloth.length,2,'Main sail and pennant are preserved');
  const main=cloth.find(m=>m.geometry.parameters.width>5);
  assert.equal(main.geometry.attributes.position.count,289,'Original 16x16 sail grid retained');
  assert(main.material.map.userData.url.endsWith('embroidered-sail.png'),'Generated sail image actually mapped');
  const detail=rig.group.getObjectByName('shipwright-v4-static');
  assert(detail&&detail.children.every(n=>n.isMesh),'All decorative geometry batched by material');
  const hull=detail.children.find(n=>n.material.map?.userData.url?.endsWith('teal-gold-planking.png'));
  assert(hull,'Generated hull map actually used');
  const hp=hull.geometry.attributes.position,hn=hull.geometry.attributes.normal;
  // First strake triangle at stern must face outwards, not vanish from the camera.
  assert(hn.getZ(0)>.5,'Hull planking surface normals face outward');
  assert(detail.children.some(n=>n.material.map?.userData.url?.endsWith('carved-brass.png')));
  assert(detail.children.some(n=>n.material.map?.userData.url?.endsWith('honey-oak.png')));
  rig.group.traverse(node=>{if(!node.isMesh)return;for(const attr of Object.values(node.geometry.attributes))assert(Array.from(attr.array).every(Number.isFinite),'All geometry attributes finite');});
  const exclusions=new Set([rig.sail,...rig.engines,...(rig.exhausts||[]),...(rig.hero?[rig.hero.group,rig.helm]:[])]);
  M.batchStatic(rig.group,exclusions);
  for(const node of exclusions)assert(hasParent(node,rig.group),'Dynamic nodes survive outer world batching');
  const sailBefore=main.geometry.attributes.position.getZ(3);main.geometry.attributes.position.setZ(3,sailBefore+.04);assert.equal(main.geometry.attributes.position.getZ(3),Math.fround(sailBefore+.04));
  rig.engines[0].rotation.z=.75;assert.equal(rig.engines[0].rotation.z,.75,'Propellers remain live');
  const baseExclude=new Set([base.sail,...base.engines,...(base.exhausts||[]),...(base.hero?[base.hero.group,base.helm]:[])]);
  M.batchStatic(base.group,baseExclude);
  const before=stats(base.group),after=stats(rig.group);
  assert(after.calls-before.calls<18,'Added draw calls bounded');
  assert(after.triangles-before.triangles<25000,'Added triangle cost bounded');
  results.push({enemy,before,after,addedCalls:after.calls-before.calls,addedTriangles:after.triangles-before.triangles});
}
assert.equal(loaded.length,4,'Four textures loaded once and shared across ships');
assert.equal(context.window.SkyShipwright.status().ships,2);
assert(Object.values(context.window.SkyShipwright.status().textures).every(v=>v===true));
console.log(JSON.stringify({result:'PASS: API, live cloth/propellers, outward normals, generated maps, shared resources and bounded geometry',results},null,2));
