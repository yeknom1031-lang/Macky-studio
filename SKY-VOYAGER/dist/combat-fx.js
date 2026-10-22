/* Bounded, presentation-only combat effects. No gameplay state or damage changes. */
window.SkyCombatFX=(()=>{
  'use strict';
  const T=THREE,TAU=Math.PI*2;
  const LIMITS=Object.freeze({sparks:160,dust:40,rings:12,trails:10,audioVoices:24});
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z);
  function create({scene,camera,getAudio=()=>null,isSoundOn=()=>true}){
    const root=new T.Group();root.name='Pooled combat presentation';root.userData.skyDynamic=true;scene.add(root);
    const random=window.SkyModels?.seeded?.(534023)||Math.random;
    const dummy=new T.Object3D(),direction=new T.Vector3(),normal=new T.Vector3(),axis=new T.Vector3(0,0,1),up=new T.Vector3(0,1,0),color=new T.Color();
    const gold=new T.Color(0xffd99a),blue=new T.Color(0x8cf6ff),red=new T.Color(0xff9c6c),white=new T.Color(0xfff5d9),gray=new T.Color(0xc7bba0);
    let reducedMotion=false,serial=0,lastAppliedSerial=-1,shake=0,shakePhase=0,lastOffset=0;
    let lastSwing='none',lastImpact='none',emitted=0,recycled=0,audioEvents=0,audioErrors=0;
    const counters={sparks:0,dust:0,rings:0,trails:0};
    const activeSources=new Set(),audioStates=new WeakMap(),audioThrottle=new Map();
    const shakeDirection=new T.Vector3(1,.3,0);

    function pool(size){return Array.from({length:size},()=>({active:false,fresh:false,age:0,life:0,p:new T.Vector3(),v:new T.Vector3(),n:new T.Vector3(0,0,1),c:new T.Color(),size:1,stretch:1}));}
    const sparks=pool(LIMITS.sparks),dust=pool(LIMITS.dust),rings=pool(LIMITS.rings);
    const cursors={sparks:0,dust:0,rings:0,trails:0};
    function acquire(array,kind){
      let index=cursors[kind];
      for(let i=0;i<array.length;i++){const candidate=(index+i)%array.length;if(!array[candidate].active){index=candidate;break;}}
      const slot=array[index];if(slot.active)recycled++;slot.active=true;slot.fresh=true;slot.age=0;cursors[kind]=(index+1)%array.length;return slot;
    }
    const glowMaterial=new T.MeshBasicMaterial({color:0xffffff,transparent:true,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false,side:T.DoubleSide});
    function makeInstances(geometry,material,count,name){
      const m=new T.InstancedMesh(geometry,material,count);m.name=name;m.count=0;m.visible=false;m.frustumCulled=false;m.castShadow=m.receiveShadow=false;m.renderOrder=5;
      m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.userData.skyDynamic=true;root.add(m);return m;
    }
    const sparkMesh=makeInstances(new T.BoxGeometry(.065,.065,1),glowMaterial,LIMITS.sparks,'Combat sparks');
    const ringMesh=makeInstances(new T.TorusGeometry(1,.026,4,40),glowMaterial,LIMITS.rings,'Combat impact rings');
    const dustGeometry=new T.IcosahedronGeometry(1,0),dustAlpha=new T.InstancedBufferAttribute(new Float32Array(LIMITS.dust),1),dustTint=new T.InstancedBufferAttribute(new Float32Array(LIMITS.dust*3),3);
    dustGeometry.setAttribute('fxAlpha',dustAlpha);dustGeometry.setAttribute('fxTint',dustTint);
    const dustMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,
      vertexShader:'attribute float fxAlpha;attribute vec3 fxTint;varying float vAlpha;varying vec3 vTint;void main(){vAlpha=fxAlpha;vTint=fxTint;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}',
      fragmentShader:'varying float vAlpha;varying vec3 vTint;void main(){gl_FragColor=vec4(vTint,vAlpha);}'
    });
    const dustMesh=makeInstances(dustGeometry,dustMaterial,LIMITS.dust,'Combat dust');dustMesh.renderOrder=3;
    const trailMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false,
      vertexShader:'attribute float fxAlpha;attribute vec3 fxTint;varying float vAlpha;varying vec3 vTint;varying vec2 vUv;void main(){vAlpha=fxAlpha;vTint=fxTint;vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:'varying float vAlpha;varying vec3 vTint;varying vec2 vUv;void main(){float edge=pow(max(0.0,1.0-abs(vUv.y*2.0-1.0)),.45);float head=smoothstep(0.0,.1,vUv.x)*smoothstep(0.0,.14,1.0-vUv.x);gl_FragColor=vec4(vTint,vAlpha*edge*head);}'
    });
    const SEGMENTS=20,VERTICES=(SEGMENTS+1)*2;
    const trails=Array.from({length:LIMITS.trails},()=>{
      const geometry=new T.BufferGeometry(),positions=new T.BufferAttribute(new Float32Array(VERTICES*3),3),alphas=new T.BufferAttribute(new Float32Array(VERTICES),1),tints=new T.BufferAttribute(new Float32Array(VERTICES*3),3),uvs=new Float32Array(VERTICES*2),indices=[];
      positions.setUsage(T.DynamicDrawUsage);alphas.setUsage(T.DynamicDrawUsage);
      for(let i=0;i<=SEGMENTS;i++){for(let j=0;j<2;j++){uvs[(i*2+j)*2]=i/SEGMENTS;uvs[(i*2+j)*2+1]=j;}if(i<SEGMENTS){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}}
      geometry.setAttribute('position',positions);geometry.setAttribute('fxAlpha',alphas);geometry.setAttribute('fxTint',tints);geometry.setAttribute('uv',new T.BufferAttribute(uvs,2));geometry.setIndex(indices);
      const m=new T.Mesh(geometry,trailMaterial);m.visible=false;m.frustumCulled=false;m.renderOrder=6;m.userData.skyDynamic=true;root.add(m);
      return {active:false,fresh:false,age:0,life:0,mesh:m,positions,alphas,tints,enemy:false,style:'slash'};
    });

    function emitSparks(p,n,tint,count,force=1){
      for(let i=0;i<count;i++){
        const s=acquire(sparks,'sparks');s.p.copy(p);s.life=.14+random()*.25;s.size=.7+random()*.7;
        s.v.set((random()-.5)*6,(random()-.15)*4,(random()-.5)*6).addScaledVector(n,3+random()*3).multiplyScalar(force);s.c.copy(tint);s.stretch=.18+random()*.22;
      }
    }
    function emitDust(p,count,force=1){
      for(let i=0;i<count;i++){
        const d=acquire(dust,'dust');d.p.copy(p).addScaledVector(up,-.55+random()*.35);d.life=.28+random()*.3;d.size=.09+random()*.13;
        const a=random()*TAU;d.v.set(Math.sin(a)*(.6+random()),.45+random()*.8,Math.cos(a)*(.6+random())).multiplyScalar(force);d.c.copy(gray).multiplyScalar(.82+random()*.17);
      }
    }
    function emitRing(p,n,tint,force=1){
      const r=acquire(rings,'rings');r.p.copy(p);r.n.copy(n);r.life=.19+force*.055;r.size=force;r.c.copy(tint);r.v.set(0,0,0);
    }
    function audioState(ctx){
      if(audioStates.has(ctx))return audioStates.get(ctx);
      const gain=ctx.createGain();gain.gain.value=.52;gain.connect(ctx.destination);
      const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.4),ctx.sampleRate),data=buffer.getChannelData(0);
      let previous=0;for(let i=0;i<data.length;i++){previous=(previous+(random()*2-1)*.22)/1.15;data[i]=previous*2;}
      const state={gain,buffer};audioStates.set(ctx,state);return state;
    }
    function voice(ctx,state,{noise=false,freq=180,end=70,duration=.14,volume=.08,type='triangle',filter=1800,q=.7,delay=0}){
      if(activeSources.size>=LIMITS.audioVoices)return;
      const now=ctx.currentTime+delay,source=noise?ctx.createBufferSource():ctx.createOscillator(),envelope=ctx.createGain(),nodes=[source,envelope];
      if(noise){source.buffer=state.buffer;const band=ctx.createBiquadFilter();band.type='bandpass';band.frequency.setValueAtTime(filter,now);band.frequency.exponentialRampToValueAtTime(Math.max(100,filter*.45),now+duration);band.Q.value=q;source.connect(band);band.connect(envelope);nodes.push(band);}
      else {source.type=type;source.frequency.setValueAtTime(freq,now);source.frequency.exponentialRampToValueAtTime(Math.max(20,end),now+duration);source.connect(envelope);}
      envelope.gain.setValueAtTime(.0001,now);envelope.gain.linearRampToValueAtTime(volume,now+.007);envelope.gain.exponentialRampToValueAtTime(.0001,now+duration);envelope.connect(state.gain);
      activeSources.add(source);source.onended=()=>{activeSources.delete(source);for(const node of nodes)try{node.disconnect();}catch{}};
      source.start(now);source.stop(now+duration+.015);
    }
    function sound(kind,enemy=false,contact=false){
      if(!isSoundOn())return;
      try{
        const ctx=getAudio();if(!ctx||ctx.state!=='running')return;
        const now=ctx.currentTime,key=(contact?'impact:':'swing:')+kind;if(now-(audioThrottle.get(key)??-1)<.035)return;audioThrottle.set(key,now);
        const state=audioState(ctx),level=enemy?.72:1;audioEvents++;
        if(!contact&&['slash','backhand','finisher','heavy','bow'].includes(kind)){
          voice(ctx,state,{noise:true,duration:kind==='heavy'?.22:.12,volume:.075*level,filter:kind==='heavy'?750:kind==='bow'?3200:1800});
          if(kind==='finisher'||kind==='heavy')voice(ctx,state,{freq:160,end:65,duration:.17,volume:.045*level});
          if(kind==='bow')voice(ctx,state,{freq:950,end:220,duration:.09,volume:.04*level});
        }else if(kind==='parry'){
          voice(ctx,state,{noise:true,filter:3600,duration:.08,volume:.12});
          voice(ctx,state,{freq:1480,end:1040,type:'sine',duration:.22,volume:.075});voice(ctx,state,{freq:2220,end:1880,type:'sine',duration:.16,volume:.035,delay:.016});
        }else if(kind==='guard'){
          voice(ctx,state,{noise:true,filter:1200,duration:.1,volume:.11});voice(ctx,state,{freq:460,end:150,duration:.13,volume:.055,type:'triangle'});
        }else if(kind==='dodge')voice(ctx,state,{noise:true,filter:800,duration:.14,volume:.055});
        else {
          const heavy=kind==='heavy'||kind==='defeat';voice(ctx,state,{noise:true,filter:heavy?900:2100,duration:heavy?.19:.11,volume:heavy?.16:.12});
          voice(ctx,state,{freq:heavy?155:240,end:heavy?42:85,duration:heavy?.22:.1,volume:heavy?.1:.055});
          if(kind==='defeat')voice(ctx,state,{freq:590,end:390,type:'sine',duration:.3,volume:.025,delay:.04});
        }
      }catch{audioErrors++;}
    }
    function swing({position,yaw=0,style='slash',enemy=false}={}){
      if(!valid(position))return;style=['slash','backhand','finisher','heavy','bow'].includes(style)?style:'slash';yaw=Number.isFinite(yaw)?yaw:0;
      lastSwing=style;emitted++;sound(style,enemy);
      if(style==='bow')return;
      const trail=acquire(trails,'trails');trail.style=style;trail.enemy=enemy;trail.life=style==='heavy'||style==='finisher'?.30:.24;trail.mesh.visible=true;trail.mesh.position.copy(position);trail.mesh.rotation.set(0,yaw,0);
      const tint=enemy?red:style==='finisher'?blue:gold;
      const radius=(enemy?2.6:2.05)*(style==='finisher'?1.22:1),arc=style==='finisher'?Math.PI*1.62:Math.PI*1.06;
      for(let i=0;i<=SEGMENTS;i++){
        const u=i/SEGMENTS,a=(u-.5)*arc,reverse=style==='backhand'?-1:1;
        const width=(style==='heavy'?.21:style==='finisher'?.18:.13)*Math.pow(Math.sin(Math.PI*u),.45);
        for(let j=0;j<2;j++){
          const v=i*2+j,r=radius+(j?width:-width);
          let x=Math.sin(a)*r*reverse,y=1.25+Math.sin(a)*.48,z=-Math.cos(a)*r;
          if(style==='heavy'){const chop=u*Math.PI*.82;x=(u-.5)*r*.24;y=.25+Math.cos(chop)*r*.7+r*.7;z=-.6-Math.sin(chop)*r*.85;}
          trail.positions.setXYZ(v,x,y,z);trail.alphas.setX(v,.8);trail.tints.setXYZ(v,tint.r,tint.g,tint.b);
        }
      }
      trail.positions.needsUpdate=trail.alphas.needsUpdate=trail.tints.needsUpdate=true;
    }
    function impact({position,kind='hit',direction:inputDirection}={}){
      if(!valid(position))return;kind=['hit','heavy','guard','parry','dodge','defeat'].includes(kind)?kind:'hit';
      lastImpact=kind;emitted++;sound(kind,false,true);
      if(valid(inputDirection)&&inputDirection.lengthSq?.()>.00001)direction.copy(inputDirection).normalize();
      else if(camera&&valid(camera.position))direction.copy(camera.position).sub(position).normalize();
      else direction.set(0,.2,1).normalize();
      if(direction.lengthSq()<.00001)direction.set(0,0,1);
      const strong=kind==='heavy'||kind==='defeat',parry=kind==='parry',guard=kind==='guard';
      if(kind==='dodge'){
        emitDust(position,6,.8);emitRing(position,up,blue,.65);
      }else{
        const tint=parry?blue:guard?white:strong?gold:red;
        emitSparks(position,direction,tint,parry?28:strong?25:guard?14:16,parry?1.1:strong?1.15:.8);
        emitRing(position,direction,tint,parry?1.1:strong?1.25:guard?.7:.55);
        if(strong)emitDust(position,9,1.3);else if(!parry)emitDust(position,3,.6);
      }
      if(!reducedMotion&&kind!=='dodge'){
        shake=Math.min(.105,shake+(parry?.075:strong?.08:guard?.034:.037));shakeDirection.copy(direction);shakePhase=random()*TAU;
      }
    }
    function update(dt,time=0){
      dt=Number.isFinite(dt)?clamp(dt,0,.25):0;serial++;shake*=Math.exp(-17*dt);if(shake<.00004)shake=0;
      const streams=[[sparks,sparkMesh,'sparks'],[dust,dustMesh,'dust'],[rings,ringMesh,'rings']];
      for(const [array,mesh,kind] of streams){
        let count=0;
        for(const item of array){
          if(!item.active)continue;
          // Events can be born during a long game-update frame. Present their
          // initial attributes once before consuming any elapsed presentation time.
          const step=item.fresh?0:dt;item.fresh=false;item.age+=step;if(item.age>=item.life){item.active=false;continue;}
          const t=item.age/item.life,fade=1-t;
          if(kind!=='rings'){
            item.p.addScaledVector(item.v,step);item.v.multiplyScalar(Math.exp(-(kind==='dust'?3.7:1.6)*step));if(kind==='sparks')item.v.y-=7*step;
          }
          dummy.position.copy(item.p);
          if(kind==='sparks'){
            normal.copy(item.v);if(normal.lengthSq()<.0001)normal.set(0,0,1);normal.normalize();dummy.quaternion.setFromUnitVectors(axis,normal);
            dummy.scale.set(item.size*fade,item.size*fade,item.stretch*(.3+fade));color.copy(item.c).multiplyScalar(fade*fade*.9);
          }else if(kind==='rings'){
            dummy.quaternion.setFromUnitVectors(axis,item.n);const size=(.12+t*1.3)*item.size;dummy.scale.setScalar(size);color.copy(item.c).multiplyScalar(fade*fade*.72);
          }else{
            dummy.rotation.set(t*1.1,t*2.3,0);dummy.scale.setScalar(item.size*(1+t*2.9));dustAlpha.setX(count,.2*Math.sin(Math.PI*t)*fade);dustTint.setXYZ(count,item.c.r,item.c.g,item.c.b);
          }
          dummy.updateMatrix();mesh.setMatrixAt(count,dummy.matrix);if(kind!=='dust')mesh.setColorAt(count,color);count++;
        }
        mesh.count=count;mesh.visible=count>0;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;counters[kind]=count;
      }
      dustAlpha.needsUpdate=dustTint.needsUpdate=true;
      let count=0;
      for(const trail of trails){
        if(!trail.active)continue;
        const step=trail.fresh?0:dt;trail.fresh=false;trail.age+=step;if(trail.age>=trail.life){trail.active=false;trail.mesh.visible=false;continue;}
        const t=trail.age/trail.life;
        for(let i=0;i<=SEGMENTS;i++){
          const u=i/SEGMENTS,travel=u;
          const reveal=clamp((t*1.8-travel)*5+1,0,1),fade=Math.pow(1-t,1.35);
          trail.alphas.setX(i*2,reveal*fade*.9);trail.alphas.setX(i*2+1,reveal*fade*.9);
        }
        trail.alphas.needsUpdate=true;count++;
      }
      counters.trails=count;
    }
    function applyCamera(target=camera,time=0){
      if(!target||lastAppliedSerial===serial)return;lastAppliedSerial=serial;lastOffset=0;
      if(reducedMotion||shake===0)return;
      time=Number.isFinite(time)?time:0;
      // Translation only: the player's aim and camera orientation remain unchanged.
      normal.set(Math.sin(time*61+shakePhase),Math.cos(time*73+shakePhase)*.55,Math.sin(time*47)*.18);
      normal.applyQuaternion(target.quaternion).multiplyScalar(shake);
      normal.addScaledVector(shakeDirection,Math.sin(time*37+shakePhase)*shake*.18);
      lastOffset=normal.length();target.position.add(normal);
    }
    function setReducedMotion(value){reducedMotion=Boolean(value);if(reducedMotion){shake=0;lastOffset=0;}}
    function reset(){
      for(const array of [sparks,dust,rings])for(const item of array){item.active=false;item.fresh=false;item.age=0;}
      for(const trail of trails){trail.active=false;trail.fresh=false;trail.mesh.visible=false;trail.age=0;}
      for(const mesh of [sparkMesh,dustMesh,ringMesh]){mesh.count=0;mesh.visible=false;}
      for(const key of Object.keys(counters))counters[key]=0;
      for(const source of activeSources)try{source.stop();}catch{}activeSources.clear();audioThrottle.clear();
      shake=0;lastOffset=0;lastAppliedSerial=-1;lastSwing=lastImpact='none';
    }
    function status(){return{active:{...counters},capacity:{...LIMITS},emitted,recycled,lastSwing,lastImpact,reducedMotion,shake:Number(shake.toFixed(5)),cameraOffset:Number(lastOffset.toFixed(5)),audioVoices:activeSources.size,audioEvents,audioErrors,poolMeshes:root.children.length};}
    return {swing,impact,update,applyCamera,setReducedMotion,status,reset};
  }
  return {create};
})();
