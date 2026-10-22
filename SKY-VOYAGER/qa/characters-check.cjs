/* Validate the actual procedural geometry and poses without a browser or graphics driver. */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const dist=path.resolve(__dirname,'../dist'),THREE=require(path.join(dist,'vendor/three.min.js'));
THREE.TextureLoader.prototype.load=function(file,onLoad){assert.ok(fs.existsSync(path.join(dist,file)),file);const t=new THREE.Texture();if(onLoad)onLoad(t);return t;};
const sandbox={window:{},THREE,console};vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dist,'models.js'),'utf8'),sandbox);vm.runInContext(fs.readFileSync(path.join(dist,'characters.js'),'utf8'),sandbox);
const M=sandbox.window.SkyModels,stats=[],checkedLocks=new Set(),surfaceChecks={locks:0,sideFaces:0,capFaces:0};
const originalBatch=M.batchStatic;
M.batchStatic=function(root,...rest){
  root.traverse(o=>{
    const g=o.geometry,layout=g?.userData?.taperedLock;if(!layout||checkedLocks.has(g))return;checkedLocks.add(g);surfaceChecks.locks++;
    const {rings,sides}=layout,p=g.attributes.position,indices=g.index.array,centers=[];
    const point=i=>new THREE.Vector3().fromBufferAttribute(p,i);
    for(let ring=0;ring<rings;ring++){const c=new THREE.Vector3();for(let j=0;j<sides;j++)c.add(point(ring*(sides+1)+j));centers.push(c.divideScalar(sides));}
    const sideFaceCount=(rings-1)*sides*2;
    for(let f=0;f<indices.length/3;f++){
      const ids=[indices[f*3],indices[f*3+1],indices[f*3+2]],a=point(ids[0]),b=point(ids[1]),c=point(ids[2]),normal=b.clone().sub(a).cross(c.clone().sub(a)).normalize();
      if(f<sideFaceCount){
        const center=new THREE.Vector3();ids.forEach(i=>center.add(centers[Math.floor(i/(sides+1))]));center.divideScalar(3);
        const radial=a.clone().add(b).add(c).divideScalar(3).sub(center).normalize();
        assert.ok(normal.dot(radial)>0,'actual tapered hair triangle faces away from its centerline');surfaceChecks.sideFaces++;
      }else{
        const start=(f-sideFaceCount)%2===0,outward=start?centers[0].clone().sub(centers[1]):centers[rings-1].clone().sub(centers[rings-2]);
        assert.ok(normal.dot(outward.normalize())>0,'root and tip caps face outward');surfaceChecks.capFaces++;
      }
    }
  });
  return originalBatch(root,...rest);
};
function snapshot(r){return JSON.stringify([r.body.position.toArray(),r.torso.rotation.toArray(),r.head.rotation.toArray(),...r.legs.map(x=>x.rotation.toArray()),...r.knees.map(x=>x.rotation.toArray()),...r.arms.map(x=>x.rotation.toArray()),...r.elbows.map(x=>x.rotation.toArray())]);}
for(const type of ['hero','merchant','alchemist','cook','pirate','archer','shield','boss']){
  const r=M.character(type),meshes=[];r.group.traverse(o=>{if(o.isMesh){meshes.push(o);for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v),type+' has finite vertices');}});
  assert.equal(r.legs.length,2);assert.equal(r.knees.length,2);assert.equal(r.elbows.length,2);assert.ok(r.sword.parent&&r.bow.parent);
  const parent=new THREE.Group();parent.add(r.group);M.batchStatic(parent);assert.equal(r.group.parent,parent,'outer world batching preserves articulated rig');
  const savedPosition=r.group.position.clone().set(8,2,-5);r.group.position.copy(savedPosition);M.animateCharacter(r,1,0,0,false,{dt:1/60});const idle=snapshot(r);
  for(let k=0;k<40;k++)M.animateCharacter(r,1+k/60,1,0,false,{dt:1/60,grounded:true});const walk=snapshot(r);assert.notEqual(idle,walk);
  const attacks=[];for(const p of [.15,.4,.7]){M.animateCharacter(r,2,0,p,false,{dt:1/60});attacks.push(snapshot(r));}assert.equal(new Set(attacks).size,3,'windup strike recovery are distinct');
  M.animateCharacter(r,3,0,0,true,{dt:1/60});assert.ok(r.bow.visible);assert.ok(!r.sword.visible);
  M.animateCharacter(r,3.1,0,0,false,{dt:1/60,grounded:false,jumpVelocity:5});assert.ok(r.wasAirborne);assert.ok(r.knees[0].rotation.x<0);
  M.animateCharacter(r,3.12,0,0,false,{dt:1/60,grounded:true});assert.ok(r.landing>0);assert.ok(r.body.position.y<0);
  M.animateCharacter(r,4,0,0,false,{dt:1/60,flight:true});assert.ok(!r.sword.visible&&!r.bow.visible);
  assert.ok(r.group.position.equals(savedPosition),'animation preserves gameplay root position');
  r.group.updateMatrixWorld(true);r.group.traverse(o=>o.matrixWorld.elements.forEach(v=>assert.ok(Number.isFinite(v))));
  stats.push({type,meshes:meshes.length,vertices:meshes.reduce((n,m)=>n+m.geometry.attributes.position.count,0)});
}
assert.equal(M.characterArtStatus().generatedTextures,3);assert.ok(Object.values(M.characterArtStatus().textures).every(x=>x==='ready'));
const stone=M.character('stone');M.animateCharacter(stone,1,.5,.3,false);assert.ok(stone.group.children.length>0);
assert.ok(surfaceChecks.locks>=80&&surfaceChecks.capFaces>0,'real unbatched hair geometry was checked');
console.log(JSON.stringify({passed:true,assets:M.characterArtStatus(),surfaceChecks,characters:stats},null,2));
