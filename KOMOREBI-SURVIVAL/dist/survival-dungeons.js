/* Fixed rare cave connections. The room map drives both masonry and collision. */
(()=>{'use strict';const T=THREE,W=EmberTerrain,D=SurvivalData,P=EmberWorld.prototype;
const selected=[2,13,27],names=['古い工匠の地下遺跡','風切りの地下遺跡','星読みの地下遺跡'];
const rooms=[{type:'pit',name:'四角い広間 — 落とし穴',z0:8,z1:20},{type:'spikes',name:'細長い回廊 — 周期棘',z0:26,z1:44},{type:'maze',name:'入り組んだ大広間 — 迷路',z0:50,z1:70}];
const tiles=new Set(),key=(x,z)=>x+','+z;
function rect(x0,x1,z0,z1){for(let x=x0;x<x1;x++)for(let z=z0;z<z1;z++)tiles.add(key(x,z));}
rect(-2,2,0,8);rect(-6,6,8,20);rect(-2,2,20,26);rect(-3,3,26,44);rect(-2,2,44,50);rect(-7,7,50,70);rect(-5,5,70,80);
// A deterministic depth-first maze has branches and dead ends, not only a zigzag hall.
for(let x=-7;x<7;x++)for(let z=50;z<70;z++)tiles.delete(key(x,z));
let mazeSeed=7319;const random=()=>{mazeSeed=(Math.imul(mazeSeed,1664525)+1013904223)>>>0;return mazeSeed/4294967296;};
const mazeSeen=new Set(),mazeEdges=[];
function carve(cx,cz){mazeSeen.add(key(cx,cz));const x=-6+cx*3,z=51+cz*3;rect(x,x+2,z,z+2);const directions=[[1,0],[-1,0],[0,1],[0,-1]];for(let i=3;i>0;i--){const j=Math.floor(random()*(i+1));[directions[i],directions[j]]=[directions[j],directions[i]];}
 for(const [dx,dz]of directions){const nx=cx+dx,nz=cz+dz;if(nx<0||nx>=4||nz<0||nz>=6||mazeSeen.has(key(nx,nz)))continue;mazeEdges.push([[cx,cz],[nx,nz]]);const xx=-6+nx*3,zz=51+nz*3;rect(Math.min(x,xx),Math.max(x,xx)+2,Math.min(z,zz),Math.max(z,zz)+2);carve(nx,nz);}}
carve(2,0);rect(0,2,50,51);rect(0,2,68,70);
const pit=(x,z)=>x>=-4&&x<4&&z>=11&&z<17;
const solid=(x,z)=>!tiles.has(key(Math.floor(x),Math.floor(z)));
const dungeons=selected.map((n,i)=>{const cave=W.caves[n],path=cave.paths[1],end=path[path.length-1],p=W.cavePoint(cave,end[0],end[1]),y=W.caveFloor(cave,end[0],end[1]);return{id:'dungeon-'+i,index:i,name:names[i],cave,door:{...p,y},x:cave.x,z:cave.z+320,y:-600-i*30,rooms};});
const at=(x,z,y)=>y< -500?dungeons.find(d=>Math.abs(x-d.x)<18&&z-d.z> -6&&z-d.z<86):null;
const phase=(t,row)=>((t+row*1.33)%4+4)%4;
const spikeHeight=(t,row)=>{const p=phase(t,row);return p<1.5?0:p<1.7?(p-1.5)/.2:p<2.7?1:Math.max(0,1-(p-2.7)/.35);};
const oldFloor=W.floor,oldIn=W.inCave,oldBiome=W.biome,oldRoof=W.caveCeiling,oldDark=W.caveDarkness;
W.floor=(x,z,y)=>{const d=at(x,z,y);return d?d.y-(pit(x-d.x,z-d.z)?6:0):oldFloor(x,z,y);};
W.inCave=(x,z,y)=>!!at(x,z,y)||oldIn(x,z,y);W.biome=(x,z,y)=>at(x,z,y)?'cave':oldBiome(x,z,y);
W.caveCeiling=(x,z,y)=>{const d=at(x,z,y);return d?d.y+4.5:oldRoof(x,z,y);};W.caveDarkness=(x,z,y)=>at(x,z,y)?1:oldDark(x,z,y);
const oldBlocked=P.blocked,oldSupport=P.floor,oldUpdate=P.update;
P.blocked=function(x,z,y,state){const d=at(x,z,y);if(!d)return oldBlocked.call(this,x,z,y,state);const u=x-d.x,v=z-d.z;if(Math.abs(u)<1.4&&Math.abs(v-76)<.95&&y<d.y+1.4)return true;for(const [dx,dz]of [[0,0],[.3,0],[-.3,0],[0,.3],[0,-.3]])if(solid(u+dx,v+dz))return true;return false;};
P.floor=function(x,z,y,state){return at(x,z,y)?W.floor(x,z,y):oldSupport.call(this,x,z,y,state);};
// Smooth daylight cannot reach the sealed underground rooms. Only the nearby torches emit lights.
P.update=function(t,state,env){oldUpdate.call(this,t,state,env);if(!this.dungeonGroups)return;const active=at(state.x,state.z,state.y);for(const entry of this.dungeonGroups){entry.root.visible=active===entry.d;entry.doorRoot.visible=!active&&Math.hypot(entry.d.door.x-state.x,entry.d.door.z-state.z)<140;entry.lid.rotation.x=state.openedDungeonChests?.includes(entry.d.id)?-1.1:0;for(const p of entry.spikes){const h=spikeHeight(t,p.row);p.mesh.position.y=-1.1+h*1.25;p.warning.material.emissiveIntensity=phase(t,p.row)> .75&&phase(t,p.row)<1.5?.9:.05;}}
 for(const [i,p]of this.dungeonTorches.entries()){p.flame.scale.y=.62*(1+.15*Math.sin(t*10+i));p.flame.rotation.z=.07*Math.sin(t*7+i);}
 const nearby=this.dungeonTorches.filter(p=>active?p.d===active:p.door).sort((a,b)=>a.position.distanceToSquared(new T.Vector3(state.x,state.y+1.7,state.z))-b.position.distanceToSquared(new T.Vector3(state.x,state.y+1.7,state.z))).slice(0,6);this.dungeonLights.forEach((l,i)=>{const p=nearby[i];l.visible=!!p&&p.position.distanceTo(new T.Vector3(state.x,state.y,state.z))<28;if(p){l.position.copy(p.position);l.intensity=1.6+Math.sin(t*9+i*3)*.12;}});
};
function build(world){world.dungeonGroups=[];world.dungeonTorches=[];world.dungeonLights=Array.from({length:6},()=>{const l=new T.PointLight('#ffb45d',1.8,16,1.4);world.scene.add(l);return l;});
 const box=new T.BoxGeometry(1,1,1),matrix=new T.Matrix4(),rotation=new T.Quaternion(),scale=new T.Vector3(),position=new T.Vector3();
 const mortar=new T.MeshStandardMaterial({color:'#353a36',roughness:1});
 const stone=world.mat('#8e9c99',false,'cave-limestone'),floorMat=world.mat('#858881',false,'moss-stone');
 function batch(parent,rows,mat){const mesh=new T.InstancedMesh(box,mat,rows.length);rows.forEach((r,i)=>{position.set(r[0],r[1],r[2]);scale.set(r[3],r[4],r[5]);matrix.compose(position,rotation,scale);mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,new T.Color().setScalar(.76+(i*17%23)/100));});mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 function torch(parent,x,y,z,d,door=false){world.mesh(parent,'box','#50616a',x,y-.25,z,.15,.5,.3,false,'forged-iron');world.mesh(parent,'cylinder','#704830',x,y,z,.075,.85,.075);const flame=world.mesh(parent,'cone','#ff9b32',x,y+.57,z,.17,.62,.17,true);flame.material=flame.material.clone();flame.material.emissiveIntensity=2;flame.castShadow=false;world.mesh(parent,'cone','#fff0a0',x,y+.48,z,.09,.32,.09,true);parent.updateWorldMatrix(true,false);world.dungeonTorches.push({d,door,flame,position:parent.localToWorld(new T.Vector3(x,y+.6,z))});}
 for(const d of dungeons){const root=world.group(d.x,d.y,d.z),walls=[],floors=[],backing=[],ceilings=[],spikes=[],doorRoot=world.group(d.door.x,d.door.y,d.door.z);root.visible=false;doorRoot.rotation.y=Math.atan2(d.cave.fx,d.cave.fz);
  for(const value of tiles){const [x,z]=value.split(',').map(Number),hole=pit(x+.5,z+.5);floors.push([x+.5,hole?-6.16:-.16,z+.5,.97,.32,.97]);ceilings.push([x+.5,4.7,z+.5,1.01,.4,1.01]);backing.push([x+.5,hole?-6.36:-.36,z+.5,1,.38,1]);
   for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){if(!tiles.has(key(x+dx,z+dz)))backing.push([x+.5+dx*.62,2.25,z+.5+dz*.62,dx?.32:1.01,4.5,dz?.32:1.01]);if(!tiles.has(key(x+dx,z+dz)))for(let row=0;row<6;row++)walls.push([x+.5+dx*.5,row*.75+.375,z+.5+dz*.5,dx?.28:.97,.72,dz?.28:.97]);
    if(hole&&!pit(x+.5+dx,z+.5+dz))backing.push([x+.5+dx*.62,-3,z+.5+dz*.62,dx?.24:.96,5.94,dz?.24:.96]);if(hole&&!pit(x+.5+dx,z+.5+dz))for(let row=0;row<8;row++)walls.push([x+.5+dx*.5,-row*.75-.375,z+.5+dz*.5,dx?.24:.97,.72,dz?.24:.97]);}
  }
  batch(root,backing,mortar);batch(root,walls,stone);batch(root,floors,floorMat);batch(root,ceilings,stone);
  // Recessed slots clearly telegraph the three bands of the same timed spike trap.
  for(let row=0;row<3;row++){const z=30+row*5,group=world.group(0,0,z,root);for(let x=-2.5;x<3;x+=1)for(const dz of[-.45,.45])world.mesh(group,'cone','#abc5cb',x,0,dz,.15,1.45,.15,false,'forged-iron');const warning=world.mesh(root,'box','#af7038',0,.015,z,5.85,.025,1.85,true,'forged-iron');warning.material=warning.material.clone();spikes.push({row,mesh:group,warning});}
  for(const [x,z]of [[-1.7,3],[-5.7,9],[5.7,19],[-2.7,27],[2.7,36],[-1.7,46],[-6.7,52],[6.7,58],[-6.7,67],[-4.7,74],[4.7,77]])torch(root,x,2.2,z,d);
  // Stone lintel, iron door and two wall torches mark the stairs found at the cave's end.
  for(const x of[-1.65,1.65])world.mesh(doorRoot,'box','#8e9c99',x,1.6,0,.65,3.2,.7,false,'cave-limestone');world.mesh(doorRoot,'box','#8e9c99',0,3.3,0,4,.55,.8,false,'ancient-runes');world.mesh(doorRoot,'box','#50616a',0,1.5,.12,2.6,3,.2,false,'forged-iron');for(const x of[-.7,0,.7])world.mesh(doorRoot,'box','#a79565',x,1.5,-.02,.08,2.8,.08,false,'brass');torch(doorRoot,-2.1,2,0,d,true);torch(doorRoot,2.1,2,0,d,true);
  const chest=world.group(0,0,76,root);world.mesh(chest,'box','#704830',0,.55,0,2.2,1.1,1.25,false,'timber');const lid=world.group(0,1.05,.6,chest);world.mesh(lid,'box','#94704b',0,.12,-.6,2.25,.3,1.3,false,'timber');for(const x of[-.8,.8]){world.mesh(chest,'box','#c4aa6e',x,.55,-.64,.13,1.1,.08,false,'brass');world.mesh(lid,'box','#c4aa6e',x,.3,-.6,.14,.06,1.3,false,'brass');}world.mesh(chest,'box','#c4aa6e',0,.8,-.68,.3,.3,.12,false,'brass');
  // Return stair doorway and visible treads lead back to the same cave.
  world.mesh(root,'box','#50616a',0,1.5,.15,2.5,3,.2,false,'forged-iron');
  world.dungeonGroups.push({d,root,doorRoot,spikes,lid});
 }
}
function target(state){const d=at(state.x,state.z,state.y);if(d){const x=state.x-d.x,z=state.z-d.z;if(z<4.2&&Math.abs(x)<1.8)return{type:'dungeonExit',data:d,label:'石の扉を開けて洞窟へ戻る'};if(z>72.5&&Math.hypot(x,z-76)<3.4&&!state.openedDungeonChests.includes(d.id))return{type:'dungeonTreasure',data:d,label:'古い宝箱を開ける'};return null;}const entry=dungeons.find(d=>Math.hypot(state.x-d.door.x,state.z-d.door.z)<3.5&&Math.abs(state.y-d.door.y)<2.5);return entry?{type:'dungeonEnter',data:entry,label:'石の扉の奥へ — '+entry.name}:null;}
function destination(d,enter){if(enter)return{x:d.x,z:d.z+3,y:d.y,yaw:Math.PI,pitch:0};const p=W.cavePoint(d.cave,...(()=>{const e=d.cave.paths[1].at(-1);return[e[0],e[1]-2.5];})());const local=W.caveLocal(d.cave,p.x,p.z);return{...p,y:W.caveFloor(d.cave,local.u,local.s),yaw:Math.atan2(d.cave.fx,d.cave.fz),pitch:0};}
function hazard(state){const d=at(state.x,state.z,state.y);if(!d)return null;const x=state.x-d.x,z=state.z-d.z;if(pit(x,z)&&state.y<d.y-2.5)return{type:'pit',damage:22,reset:{x:d.x,z:d.z+9,y:d.y}};if(Math.abs(x)<3&&state.y<d.y+1.2)for(let row=0;row<3;row++)if(Math.abs(z-(30+row*5))<1&&spikeHeight(state.time,row)>.28)return{type:'spikes',damage:18};return null;}
window.SurvivalDungeons={dungeons,rooms,tiles,mazeEdges,pit,solid,at,phase,spikeHeight,build,target,destination,hazard};
})();
