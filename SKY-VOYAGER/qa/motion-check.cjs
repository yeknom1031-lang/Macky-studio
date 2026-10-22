const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('../dist/vendor/three.min.js');
const context={THREE,window:{}};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../dist/motion.js'),'utf8'),context);
const scene=new THREE.Scene(),sail=new THREE.Group();
const mesh=new THREE.Mesh(new THREE.PlaneGeometry(4,6,4,6),new THREE.MeshBasicMaterial());sail.add(mesh);scene.add(sail);
const original=mesh.geometry.attributes.position.array.slice(),hero={group:new THREE.Group()};
const motion=context.window.SkyMotion.create({scene,ship:{sail},islands:[]});
motion.update(.016,1,hero,{mode:'walk'},true);
const pos=mesh.geometry.attributes.position;let changed=0;
for(let i=0;i<pos.count;i++){assert(Number.isFinite(pos.getZ(i)));if(pos.getY(i)===3)assert.equal(pos.getZ(i),original[i*3+2],'mast edge stays pinned');if(pos.getZ(i)!==original[i*3+2])changed++;}
assert(changed>0,'free edge flutters');
const dust=scene.children.find(x=>x.isInstancedMesh),m=new THREE.Matrix4(),scale=new THREE.Vector3();
function active(){let n=0;for(let i=0;i<dust.count;i++){dust.getMatrixAt(i,m);scale.setFromMatrixScale(m);if(scale.x>0)n++;}return n;}
assert.equal(active(),0,'idle produces no dust');
hero.group.position.x+=.13;motion.update(.016,1.016,hero,{mode:'walk'},true);assert(active()>0,'grounded movement emits dust');
for(let i=0;i<50;i++)motion.update(.016,1.1+i*.016,hero,{mode:'walk'},true);assert.equal(active(),0,'particles expire at rest');
hero.group.position.x+=.13;motion.update(.016,2,hero,{mode:'walk'},false);assert.equal(active(),0,'airborne movement emits no ground dust');
hero.group.position.x+=50;motion.update(.016,2.1,hero,{mode:'walk'},true);assert.equal(active(),0,'teleport does not emit footsteps');
console.log('PASS: pinned cloth, finite flutter, moving-only footsteps, airborne/teleport suppression');
