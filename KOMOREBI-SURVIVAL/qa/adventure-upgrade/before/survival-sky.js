/* The original atmosphere, climate, cloud reflection, moon, stars and weather pipeline. */
(()=>{'use strict';const T=THREE;
class SurvivalSky{
 constructor(scene,camera,renderer,sun,ambient,world){Object.assign(this,{scene,camera,renderer,sun,ambient,world});this.atmosphere=new Atmosphere(scene);this.cycle=new WorldClimate();world.native.waterUniforms.cloudLayer.value=this.atmosphere.cloudTexture;this.shadowUpdate=-1;
 const starPoints=new Float32Array(600*3);for(let i=0;i<600;i++){const a=NatureWorld.hash(i,1)*Math.PI*2,v=NatureWorld.hash(i,2)*.95+.05,r=Math.sqrt(1-v*v);starPoints.set([Math.cos(a)*r*1100,v*1100,Math.sin(a)*r*1100],i*3);}const sg=new T.BufferGeometry();sg.setAttribute('position',new T.BufferAttribute(starPoints,3));this.stars=new T.Points(sg,new T.PointsMaterial({color:'#f0ead6',size:2,transparent:true,opacity:0}));scene.add(this.stars);
 const rainPoints=new Float32Array(900*6);for(let i=0;i<900;i++){const x=(Math.random()-.5)*110,y=Math.random()*70,z=(Math.random()-.5)*110;rainPoints.set([x,y,z,x-.08,y+.75,z],i*6);}const rg=new T.BufferGeometry();rg.setAttribute('position',new T.BufferAttribute(rainPoints,3));this.rain=new T.LineSegments(rg,new T.LineBasicMaterial({color:'#a9c4d2',transparent:true,opacity:.4,depthWrite:false}));scene.add(this.rain);
 }
 restore(state){this.cycle.restore({worldTime:state.worldTime,dayLength:state.dayLength,weatherMode:state.weatherMode,automaticTime:state.automaticTime});}
 update(state,dt,paused){const {scene,camera,renderer,sun,ambient,world,atmosphere:a,cycle}=this;if(!paused)cycle.advance(dt);const east=state.x+EmberTerrain.anchor.x,north=state.z+EmberTerrain.anchor.z,day=cycle.day,climate=cycle.sample(east,north);world.update(state.time,state,{day,...climate});const {daylight,dusk,moonlight=0}=a.update(camera,day,cycle.worldTime,climate.cloudCover,east,north,cycle.worldDays);
 for(const m of Object.values(world.native.vegetation.canopies))m.color.setScalar(.07+daylight*.93+dusk*.09+moonlight*.16);
 scene.background.copy(a.horizon);scene.fog.color.copy(a.horizon);scene.fog.density=climate.fog;
 const solar=daylight*(1.65-climate.cloudCover*.9),lunar=moonlight*.3,moon=lunar>solar;
 sun.intensity=Math.max(solar,lunar);ambient.intensity=.14+daylight*(.38+climate.cloudCover*.12)+moonlight*.13;
 sun.color.set(moon?'#c1d7ed':'#ffca98').lerp(new T.Color(moon?'#c1d7ed':'#fff2dd'),T.MathUtils.smoothstep(daylight,.03,.6));const mix=T.MathUtils.smoothstep(daylight,0,.25);ambient.color.set('#a5bbd7').lerp(new T.Color('#dbeaf1'),mix);ambient.groundColor.set('#343e46').lerp(new T.Color('#39412d'),mix);
 const step=170/2048;sun.target.position.set(Math.round(camera.position.x/step)*step,camera.position.y-1.8,Math.round(camera.position.z/step)*step);sun.position.copy(sun.target.position).addScaledVector(moon?a.moonDirection:a.sunDirection,260);sun.target.updateMatrixWorld();const now=performance.now();if(now-this.shadowUpdate>180){renderer.shadowMap.needsUpdate=true;this.shadowUpdate=now;}
 const u=world.native.waterUniforms;u.horizon.value.copy(a.horizon);u.zenith.value.copy(a.zenith);u.sunDirection.value.copy(a.sunDirection);u.daylight.value=daylight;u.moonDirection.value.copy(a.moonDirection||a.sunDirection);u.moonlight.value=moonlight;u.cloudShift.value=east*.0000008;u.cloudTime.value=cycle.worldTime;u.cloudCover.value=climate.cloudCover;u.dusk.value=dusk;
 this.stars.position.copy(camera.position);this.stars.material.opacity=Math.max(0,.85-daylight*3-dusk*.6)*(1-climate.cloudCover*.94)*(1-moonlight*.35);
 const cave=EmberTerrain.inCave(state.x,state.z)&&state.y<EmberTerrain.caveY+12;
 this.rain.position.set(camera.position.x,camera.position.y-5,camera.position.z);this.rain.visible=!cave&&climate.rainfall>.005;this.rain.material.opacity=climate.rainfall*.44;
 if(this.rain.visible&&!paused){const p=this.rain.geometry.attributes.position;for(let i=0;i<p.count;i+=2){let y=p.getY(i)-dt*35,x=p.getX(i)+dt*climate.wind*4;if(y<0)y+=70;if(x>55)x-=110;p.setXY(i,x,y);p.setXY(i+1,x-climate.wind*.13,y+.75);}p.needsUpdate=true;}
 Object.assign(state,cycle.snapshot());return{...climate,cave,day};}
}
window.SurvivalSky=SurvivalSky;
})();
