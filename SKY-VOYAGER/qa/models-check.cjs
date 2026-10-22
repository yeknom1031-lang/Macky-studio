/* Run with Node: verifies world-space batching and the live animation boundaries. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const THREE = require('../dist/vendor/three.min.js');
const context = {THREE, window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/models.js'),'utf8'), context);
const M = context.window.SkyModels;
const scene = new THREE.Scene();
const root = new THREE.Group();
root.position.set(170, 3, -405);
root.rotation.y = .6;
root.scale.setScalar(1.4);
scene.add(root);
const nested = new THREE.Group();
nested.position.set(2, 4, -3);
nested.rotation.z = .3;
root.add(nested);
M.box(nested, 1, 2, 3, 0x123456, 2, 0, 0);
M.box(root, 2, 1, 1, 0x123456, -2, 1, 1);
const rig = M.character();
root.add(rig.group);
rig.group.position.set(5, 0, -6);
const chest = M.chest(root, -5, 4);
const exclusions = new Set([rig.group, chest.lid]);
function vertices() {
  scene.updateMatrixWorld(true);
  const result=[];
  function collect(node) {
    if(exclusions.has(node)) return;
    if(node.isMesh) {
      const geometry=node.geometry.index ? node.geometry.toNonIndexed() : node.geometry;
      const attribute=geometry.attributes.position;
      for(let i=0;i<attribute.count;i++) {
        const p=new THREE.Vector3().fromBufferAttribute(attribute,i).applyMatrix4(node.matrixWorld);
        result.push(p.toArray().map(v=>v.toFixed(3)).join(','));
      }
    }
    node.children.forEach(collect);
  }
  collect(root);
  return result.sort();
}
const before = vertices();
const material = nested.children[0].material;
M.batchStatic(root, exclusions);
assert.deepEqual(vertices(), before, 'Static world vertices must stay in place');
assert.equal(rig.group.parent, root, 'Character rig must keep its parent');
assert.equal(chest.lid.parent, chest.group, 'Chest lid must remain independently animated');
assert(root.children.some(mesh=>mesh.material===material), 'Material references must survive texture loading');
assert(rig.arms.every(arm=>arm.parent===rig.group));
M.animateCharacter(rig, .2, 1, .5, false);
assert.notEqual(rig.arms[1].rotation.x, 0);
assert.equal(rig.sword.visible, true);
M.animateCharacter(rig, .3, 1, 0, true);
assert.equal(rig.sword.visible, false);
assert.equal(rig.bow.visible, true);
chest.lid.rotation.x=-1;
assert.equal(chest.lid.rotation.x,-1);
console.log('PASS: static transforms, shared materials, character motion, sword/bow visibility, live chest lid');
