/* Small continuous secondary motion, independent of combat and collision state. */
window.SkyMotion = (() => {
  const T=THREE;
  function create({scene,ship,islands}) {
    const cloth=[];
    const rigs=[ship,...islands.flatMap(i=>[i.flagship,i.raider].filter(Boolean))];
    for(const rig of rigs)rig.sail?.traverse(mesh=>{
      if(!mesh.isMesh||mesh.geometry.type!=='PlaneGeometry')return;
      cloth.push({mesh,base:mesh.geometry.attributes.position.array.slice(),height:mesh.geometry.parameters.height,phase:cloth.length*1.7});
    });
    const count=24,dummy=new T.Object3D(),particles=Array.from({length:count},()=>({life:0,x:0,y:0,z:0,vx:0,vz:0}));
    const dust=new T.InstancedMesh(new T.SphereGeometry(1,6,4),new T.MeshBasicMaterial({color:0xe3cda2,transparent:true,opacity:.23,depthWrite:false}),count);
    dust.frustumCulled=false;dust.castShadow=false;scene.add(dust);
    let stepTimer=0,cursor=0,lastPosition=null;
    function update(dt,time,hero,state,grounded) {
      for(const {mesh,base,height,phase} of cloth){
        const pos=mesh.geometry.attributes.position;
        for(let i=0;i<pos.count;i++){
          const x=base[i*3],y=base[i*3+1],weight=Math.pow(Math.max(0,.5-y/height),1.3);
          pos.setZ(i,base[i*3+2]+Math.sin(time*2.2+x*.7-y*.9+phase)*weight*.16+Math.sin(time*4.2-y*1.8)*weight*.035);
        }pos.needsUpdate=true;mesh.geometry.computeVertexNormals();
      }
      const position=hero.group.position,travel=lastPosition?Math.hypot(position.x-lastPosition.x,position.z-lastPosition.z):0;lastPosition={x:position.x,z:position.z};const moving=travel<2?Math.min(1,travel/Math.max(dt,1/240)/8.4):0;const emit=state?.mode==='walk'&&moving>.4&&grounded;
      stepTimer-=dt;if(emit&&stepTimer<=0){stepTimer=moving>.8?.16:.24;const p=particles[cursor++%count];const angle=hero.group.rotation.y;p.life=.48;p.x=hero.group.position.x+Math.cos(angle)*(cursor%2?.18:-.18);p.z=hero.group.position.z;p.y=.08;p.vx=Math.sin(angle)*.55;p.vz=Math.cos(angle)*.55;}
      for(let i=0;i<count;i++){const p=particles[i];p.life=Math.max(0,p.life-dt);p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=dt*.28;const scale=p.life>0?.06+(.48-p.life)*.23:0;dummy.position.set(p.x,p.y,p.z);dummy.scale.set(scale,scale*.55,scale);dummy.updateMatrix();dust.setMatrixAt(i,dummy.matrix);}dust.instanceMatrix.needsUpdate=true;
    }
    return {update,status:()=>({clothSurfaces:cloth.length,footstepParticles:count})};
  }
  return {create};
})();
