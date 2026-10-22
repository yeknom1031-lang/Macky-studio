/* Whole-rig regression checks: real world-space blade arcs, action recovery and gameplay root ownership. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const dist=path.resolve(__dirname,'../dist'),THREE=require(path.join(dist,'vendor/three.min.js'));
THREE.TextureLoader.prototype.load=function(file,onLoad){assert.ok(fs.existsSync(path.join(dist,file)));const map=new THREE.Texture();onLoad?.(map);return map;};
const document={createElement(){return{width:0,height:0,getContext(){return{fillRect(){},drawImage(){}};}};}};
const sandbox={window:{},THREE,document,console};vm.createContext(sandbox);
for(const file of ['models.js','characters.js'])vm.runInContext(fs.readFileSync(path.join(dist,file),'utf8'),sandbox);
const M=sandbox.window.SkyModels,hero=M.character(),reference=M.character(),shield=M.character('shield'),boss=M.character('boss');
hero.group.position.set(4,2,-9);hero.group.rotation.set(.02,.37,-.03);const position=hero.group.position.clone(),rotation=hero.group.quaternion.clone(),scale=hero.group.scale.clone();
let now=0;const report={styles:{},frameChecks:0};
function step(r,attack=0,context={},bow=false){now+=1/60;M.animateCharacter(r,now,0,attack,bow,{dt:1/60,...context});r.group.updateMatrixWorld(true);r.group.traverse(o=>o.matrixWorld.elements.forEach(v=>assert.ok(Number.isFinite(v),'all animated transforms stay finite')));if(r===hero){assert.ok(r.group.position.equals(position),'combat cannot move the gameplay root');assert.ok(r.group.quaternion.equals(rotation),'combat cannot rotate the gameplay root');assert.ok(r.group.scale.equals(scale),'combat cannot resize the gameplay root');}report.frameChecks++;}
function joints(r){return[r.body,r.torso,r.head,...r.arms,...r.elbows,...r.wrists,...r.legs,...r.knees,...r.feet];}
function pose(r){return[...r.body.position.toArray(),...joints(r).flatMap(o=>[o.rotation.x,o.rotation.y,o.rotation.z])];}
function tip(r){return r.sword.localToWorld(new THREE.Vector3(0,-1.58,0));}
function compareNeutral(r,bow=false){M.animateCharacter(reference,now,0,0,bow,{dt:1/60});const a=pose(r),b=pose(reference);a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<.001,'an action fully recovers to the ordinary pose at channel '+i));}
for(const [style,contact]of Object.entries({slash:.46,backhand:.43,finisher:.53,heavy:.62})){
  const traces=[],poses=[];for(let frame=0;frame<=60;frame++){step(hero,frame/60,{attackStyle:style});traces.push(tip(hero));poses.push(pose(hero));}
  const extent=new THREE.Box3().setFromPoints(traces).getSize(new THREE.Vector3());assert.ok(extent.length()>1,'each attack moves the real blade through a substantial arc');
  assert.notDeepEqual(poses[12],poses[36],'anticipation and follow-through have different body poses');compareNeutral(hero);
  step(hero,contact,{attackStyle:style});report.styles[style]={bladeExtent:extent.toArray().map(v=>+v.toFixed(3)),contactSpineYaw:+hero.torso.rotation.y.toFixed(3),contactBodyY:+hero.body.position.y.toFixed(3)};
  for(let i=0;i<75;i++)step(hero);compareNeutral(hero);assert.ok(Math.abs(hero.clothCombat)<.001,'cloth recoil settles after combat');
}
assert.ok(report.styles.slash.contactSpineYaw>0&&report.styles.backhand.contactSpineYaw<0,'combo one and two rotate through opposite attack directions');
assert.ok(report.styles.heavy.contactBodyY<report.styles.slash.contactBodyY-.1,'heavy attack visibly sinks more weight into the strike');
step(hero,.43,{combo:2});assert.ok(hero.torso.rotation.y<-.5,'combo two selects backhand without an explicit style');step(hero,.53,{combo:3});assert.ok(hero.body.position.y<-.1,'combo three selects finisher');
for(let i=0;i<30;i++)step(hero,0,{guard:true});const guardPose=pose(hero),guardTip=tip(hero);assert.ok(hero.elbows[1].rotation.x>1.5,'guard raises the sword hand');
step(hero,0,{guard:true,parry:1});assert.ok(tip(hero).distanceTo(guardTip)>.2,'parry creates a visible deflection of the actual sword');assert.notDeepEqual(guardPose,pose(hero));
for(let i=0;i<30;i++)step(shield,0,{guard:true});assert.ok(shield.arms[0].rotation.x>1,'shield guard presents the shield arm');
for(let i=0;i<75;i++)step(hero);compareNeutral(hero);
step(hero,0,{hitReaction:1});assert.ok(hero.torso.rotation.x>.35&&hero.body.position.z>.1,'a hit recoils torso and hips backwards');step(hero);compareNeutral(hero);
step(hero,0,{dodgeProgress:.4,dodgeSide:-1});const left={x:hero.body.position.x,lean:hero.body.rotation.z,height:hero.body.position.y};
step(hero,0,{dodgeProgress:.4,dodgeSide:1});assert.ok(left.x<0&&hero.body.position.x>0,'dodges lean towards their direction');assert.ok(left.lean>0&&hero.body.rotation.z<0);assert.ok(left.height<-.2&&hero.knees[0].rotation.x<-.7,'dodge lowers the body and bends the knees');
step(hero,0,{dodgeProgress:1});compareNeutral(hero);step(hero,0,{dodge:.15});assert.ok(hero.body.position.y<-.2,'legacy dodge countdown remains supported');
for(const p of [.1,.4,.57,.8,1]){step(hero,p,{},true);if(p===.4)report.bowDraw=hero.elbows[1].rotation.x;if(p===.57)report.bowRelease=hero.elbows[1].rotation.x;}
assert.ok(report.bowDraw-report.bowRelease>.3,'bow arm releases rapidly after drawing');compareNeutral(hero,true);assert.ok(hero.bow.visible&&!hero.sword.visible);
for(let i=0;i<=30;i++)step(hero,0,{defeat:i/30});assert.ok(hero.body.rotation.x>1.4,'defeat tips the whole rig down');assert.ok(hero.eyes[0].scale.y<.04,'defeat closes the eyes');const fallen=pose(hero);step(hero,0,{defeat:1});pose(hero).forEach((v,i)=>assert.ok(Math.abs(v-fallen[i])<1e-12,'defeat remains settled without accumulating transforms'));
for(let i=0;i<75;i++)step(hero);compareNeutral(hero);
for(const style of ['slash','backhand','finisher','heavy'])for(const p of [.1,.25,.5,.75,1])step(boss,p,{attackStyle:style});assert.equal(boss.group.scale.x,1.6,'boss gameplay size is unchanged');
let meshes=0;hero.group.traverse(o=>meshes+=o.isMesh?1:0);assert.equal(meshes,28,'combat adds no rendering cost through extra meshes');
const stone=M.character('stone');assert.ok(stone.stoneBody,'stone has an internal body pivot');let stoneMeshes=0;stone.group.traverse(o=>stoneMeshes+=o.isMesh?1:0);
stone.group.position.set(-11,3,6);stone.group.rotation.set(.01,-.7,.05);const stonePosition=stone.group.position.clone(),stoneRotation=stone.group.quaternion.clone(),stoneScale=stone.group.scale.clone();
step(stone,.43,{attackStyle:'heavy'});const raised=stone.arms[0].rotation.x;assert.ok(raised>2.5,'stone raises both heavy arms overhead');assert.ok(Math.abs(stone.arms[1].rotation.x-raised)<.001);
step(stone,.62,{attackStyle:'heavy'});assert.ok(stone.arms[0].rotation.x<1.1&&stone.stoneBody.position.y<-.1,'stone slams both arms and puts weight into contact at .62');
step(stone,0,{hitReaction:1});assert.ok(stone.stoneBody.rotation.x>.2,'stone visibly reacts to impact');
for(let i=0;i<=30;i++)step(stone,0,{defeat:i/30});assert.ok(stone.stoneBody.rotation.x>1.4,'stone falls through its internal pivot');
assert.ok(stone.group.position.equals(stonePosition)&&stone.group.quaternion.equals(stoneRotation)&&stone.group.scale.equals(stoneScale),'stone reactions preserve all gameplay root transforms');
step(stone);assert.ok(stone.stoneBody.position.length()<1e-9&&Math.abs(stone.stoneBody.rotation.x)<1e-9,'stone resets cleanly for replay or respawn');
assert.ok(!stone.sword.visible&&!stone.bow.visible);let stoneMeshesAfter=0;stone.group.traverse(o=>stoneMeshesAfter+=o.isMesh?1:0);assert.equal(stoneMeshesAfter,stoneMeshes,'stone animation introduces no additional meshes');
report.stone={meshes:stoneMeshes,slamContact:.62,rootPreserved:true,defeatResets:true};
console.log(JSON.stringify({passed:true,...report,heroMeshes:meshes,animationVersion:M.characterArtStatus().combatAnimationVersion},null,2));
