/* Bounded pools, finite geometry, lifetimes, audio limits and camera decay. */
const assert=require('node:assert/strict');
const T=require('../dist/vendor/three.min.js');global.THREE=T;global.window=global;
require('../dist/models.js');require('../dist/combat-fx.js');
const scene=new T.Scene(),camera=new T.PerspectiveCamera(),base=new T.Vector3(0,5,10);camera.position.copy(base);
const scheduled=[],events=[];
function param(){return{value:0,setValueAtTime(v,t){assert(Number.isFinite(v)&&Number.isFinite(t));events.push(v);},linearRampToValueAtTime(v,t){assert(Number.isFinite(v)&&Number.isFinite(t));},exponentialRampToValueAtTime(v,t){assert(v>0&&Number.isFinite(v)&&Number.isFinite(t));}};}
function node(){return{gain:param(),frequency:param(),Q:{value:0},connect(){},disconnect(){},start(t){assert(Number.isFinite(t));},stop(t){if(t===undefined){this.onended?.();return;}scheduled.push({node:this,time:t});}};}
const ctx={state:'running',currentTime:1,sampleRate:44100,destination:{},createGain:node,createBuffer:(c,n)=>({getChannelData:()=>new Float32Array(n)}),createBufferSource:node,createOscillator:node,createBiquadFilter:node};
let enabled=true;const fx=SkyCombatFX.create({scene,camera,getAudio:()=>ctx,isSoundOn:()=>enabled});
const root=scene.children[0],meshCount=root.children.length,geometries=root.children.map(m=>m.geometry),materials=new Set(root.children.map(m=>m.material));
assert.equal(meshCount,13);assert.equal(materials.size,3);
function finite(){
  root.traverse(n=>{if(!n.isMesh)return;for(const attr of Object.values(n.geometry.attributes))assert(Array.from(attr.array).every(Number.isFinite),n.name+' has bad attribute');if(n.isInstancedMesh)assert(Array.from(n.instanceMatrix.array).every(Number.isFinite),n.name+' bad instances');});
}
const p=new T.Vector3(2,1,-3),dir=new T.Vector3(1,.1,0).normalize();
for(const style of ['slash','backhand','finisher','heavy','bow'])fx.swing({position:p,yaw:.8,style,enemy:style==='heavy'});
for(const kind of ['hit','heavy','guard','parry','dodge','defeat'])fx.impact({position:p,kind,direction:dir});
fx.update(1/60,1);finite();assert(fx.status().active.trails>=4);assert(fx.status().active.sparks>0);assert.equal(fx.status().audioErrors,0);
camera.position.copy(base);fx.applyCamera(camera,1);const initialOffset=camera.position.distanceTo(base);assert(initialOffset>0&&initialOffset<.14);
const once=camera.position.clone();fx.applyCamera(camera,1);assert(camera.position.equals(once),'camera shake applied twice in a single update');
for(let i=0;i<1000;i++){
  fx.swing({position:p,yaw:i*.1,style:i%2?'slash':'finisher'});fx.impact({position:p,kind:i%2?'parry':'heavy',direction:dir});
}
fx.update(.016,1.1);finite();const full=fx.status();
for(const key of ['sparks','dust','rings','trails'])assert(full.active[key]<=full.capacity[key]);
assert(full.recycled>0);assert(full.audioVoices<=full.capacity.audioVoices);assert.equal(root.children.length,meshCount);root.children.forEach((m,i)=>assert.equal(m.geometry,geometries[i]));
for(let i=0;i<120;i++){fx.update(1/60,2+i/60);camera.position.copy(base);fx.applyCamera(camera,2+i/60);}
const expired=fx.status();assert.deepEqual(expired.active,{sparks:0,dust:0,rings:0,trails:0});assert.equal(expired.shake,0);assert.equal(expired.cameraOffset,0);assert(camera.position.equals(base));
fx.setReducedMotion(true);fx.impact({position:p,kind:'parry'});fx.update(.016,5);camera.position.copy(base);fx.applyCamera(camera,5);assert(camera.position.equals(base));assert.equal(fx.status().shake,0);assert(fx.status().active.sparks>0,'reduced motion keeps combat readable');
const audioEvents=fx.status().audioEvents;enabled=false;ctx.currentTime+=1;fx.impact({position:p,kind:'defeat'});assert.equal(fx.status().audioEvents,audioEvents);
fx.setReducedMotion(false);fx.reset();assert.deepEqual(fx.status().active,{sparks:0,dust:0,rings:0,trails:0});assert.equal(fx.status().audioVoices,0);assert(root.children.every(m=>!m.visible));
// At low FPS, an event born in the game update must get one unaged visible frame.
fx.swing({position:p,style:'slash'});fx.impact({position:p,kind:'parry',direction:dir});fx.update(.1,10);
assert.equal(fx.status().active.trails,1);assert.equal(fx.status().active.rings,1);assert(fx.status().active.sparks>0);
const bornSparks=root.children.find(m=>m.name==='Combat sparks'),bornTrail=root.children.find(m=>!m.isInstancedMesh&&m.visible);
const firstMatrix=new T.Matrix4();bornSparks.getMatrixAt(0,firstMatrix);assert(new T.Vector3().setFromMatrixPosition(firstMatrix).distanceTo(p)<1e-6,'birth frame integrated particle motion');
const bornAlpha=Array.from(bornTrail.geometry.getAttribute('fxAlpha').array);assert(Math.max(...bornAlpha)>.8,'birth frame ribbon invisible');
for(let i=0;i<4;i++)fx.update(0,10);assert.deepEqual(Array.from(bornTrail.geometry.getAttribute('fxAlpha').array),bornAlpha,'hit-stop advanced presentation age');
fx.update(.1,10.1);assert.equal(fx.status().active.trails,1);assert.equal(fx.status().active.rings,1);
assert(Math.max(...bornTrail.geometry.getAttribute('fxAlpha').array)<Math.max(...bornAlpha),'trail did not age after birth frame');
fx.update(.1,10.2);assert.equal(fx.status().active.trails,1,'slash not readable across low-FPS frames');
for(let i=0;i<8;i++)fx.update(.1,10.3+i*.1);assert.deepEqual(fx.status().active,{sparks:0,dust:0,rings:0,trails:0});
fx.swing({position:p,style:'heavy'});fx.update(.25,12);assert.equal(fx.status().active.trails,1,'long birth frame consumed new heavy trail');
fx.update(.25,12.25);assert.equal(fx.status().active.trails,1);fx.update(.1,12.35);assert.equal(fx.status().active.trails,0,'heavy trail did not expire');
assert.equal(root.children.length,meshCount);finite();fx.reset();
fx.swing({position:{x:NaN,y:0,z:0}});fx.impact({position:null});fx.update(NaN);fx.update(-1);finite();
console.log(JSON.stringify({ok:true,poolMeshes:meshCount,sharedMaterials:materials.size,capacity:full.capacity,recycled:full.recycled,initialCameraOffset:initialOffset,expired:expired.active,birthFramePreserved:true,lowFPSLifetimes:true,audioErrors:fx.status().audioErrors},null,2));
