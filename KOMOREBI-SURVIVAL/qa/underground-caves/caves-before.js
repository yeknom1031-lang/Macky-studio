/* Deterministic cave layouts: 32 connected patterns in addition to the original boss cave. */
(()=>{'use strict';const W=EmberTerrain,T=THREE,cell=5,half=2.5;
const themes=[['石灰','cave-limestone','#c2b9a3'],['青晶','blue-crystal','#7eabd3'],['苔岩','moss-stone','#78917b'],['黒曜','obsidian','#777889']];
const forms=['曲がり廊下','環状回廊','双子の広間','三叉の洞','柱の迷宮','段違い回廊','星形の洞','連なる小部屋'];
const patterns=[];for(let n=0;n<32;n++){const cells=new Set(),add=(x,z)=>{if(x>=0&&x<9&&z>=0&&z<9)cells.add(x+','+z);},line=(x,z,a,b)=>{while(x!==a){add(x,z);x+=Math.sign(a-x);}while(z!==b){add(x,z);z+=Math.sign(b-z);}add(a,b);},room=(x,z,r=1)=>{for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++)add(x+dx,z+dz);};
line(4,8,4,4);const v=Math.floor(n/8),f=n%8;
if(f===0){line(4,5,1+v,2);line(1+v,2,7,1);room(7,1);}
if(f===1){line(4,6,1,6);line(1,6,1,1+v);line(1,1+v,7,1+v);line(7,1+v,7,6);line(7,6,4,6);}
if(f===2){room(2,2+v%2);room(6,2+v);line(4,4,2,2+v%2);line(4,4,6,2+v);}
if(f===3){line(4,4,1,2+v);line(4,4,7,1+v);line(4,4,4,0);room(4,1,1);}
if(f===4){for(let z=1;z<7;z+=2)line(1,z,7,z);for(let x=1;x<8;x+=3)line(x,1,x,7);line(4,7,1+v,7);}
if(f===5){line(4,6,1,6);line(1,6,1,4);line(1,4,7,4);line(7,4,7,1);line(7,1,2+v,1);}
if(f===6){room(4,4);for(const [x,z]of[[0,4],[8,4],[4,0],[1+v,1],[7,7-v]])line(4,4,x,z);}
if(f===7){for(let j=0;j<4;j++){const x=1+(j%2)*5,z=1+j*2;room(x,z);line(4,4,x,z);}}
// Variant branches alter actual connectivity and chambers, not only decoration.
line(4,4,1+v*2,3);room(1+v*2,3,0);add(1+v*2,2);add(1+v*2,1);if(v>0)line(4,6,1+v,6-v);
patterns.push({id:'pattern-'+n,name:themes[v][0]+'の'+forms[f],theme:themes[v],cells:[...cells].map(k=>k.split(',').map(Number)),signature:[...cells].sort().join(';')});}
const caves=[];for(let n=0;n<32;n++){let best=null;for(let k=0;k<220;k++){const a=n*2.399+k*.17,r=300+Math.floor(n/8)*310+k*4,x=Math.round(Math.sin(a)*r),z=Math.round(Math.cos(a)*r);if(Object.values(W.sites).some(p=>Math.hypot(x-p.x,z-p.z)<105)||caves.some(p=>Math.hypot(x-p.x,z-p.z)<110))continue;let lo=Infinity,hi=-Infinity;for(let dx=-24;dx<=24;dx+=12)for(let dz=-24;dz<=24;dz+=12){const y=W.ground(x+dx,z+dz);lo=Math.min(lo,y);hi=Math.max(hi,y);}if(lo<W.water+4)continue;const score=hi-lo+k*.008;if(!best||score<best.score)best={x,z,lo,hi,score};if(score<3)break;}
if(!best)throw Error('No dry cave site '+n);const p=patterns[n],c={...best,...p,id:'cave-'+n,index:n,y:best.hi+.25,height:6.5+(n%4)*.7,cellSet:new Set(p.cells.map(([x,z])=>x+','+z)),walls:[]};
for(const [ix,iz]of c.cells)for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){if(c.cellSet.has((ix+dx)+','+(iz+dz))||ix===4&&iz===8&&dz===1)continue;c.walls.push({x:(ix-4)*cell+dx*half,z:(iz-4)*cell+dz*half,sx:dx?.22:half+.2,sz:dz?.22:half+.2});}
c.rampLength=Math.max(18,Math.ceil((c.y-W.ground(c.x,c.z+42.5))/.55));c.rampEndY=W.ground(c.x,c.z+22.5+c.rampLength);caves.push(c);}
const inCell=(c,x,z)=>c.cellSet.has((Math.floor((x-c.x+half)/cell)+4)+','+(Math.floor((z-c.z+half)/cell)+4));
const at=(x,z)=>caves.find(c=>Math.abs(x-c.x)<=22.5&&Math.abs(z-c.z)<=22.5&&inCell(c,x,z));
const rampAt=(x,z)=>caves.find(c=>Math.abs(x-c.x)<2.5&&z>=c.z+22.5&&z<=c.z+22.5+c.rampLength);
const rampY=(c,z)=>T.MathUtils.lerp(c.y,c.rampEndY,(z-c.z-22.5)/c.rampLength);
const oldFloor=W.floor,oldBiome=W.biome,oldInCave=W.inCave;
W.floor=(x,z,y=0)=>{let h=oldFloor(x,z,y),c=at(x,z),r=rampAt(x,z);if(c){h=Math.max(h,c.y);if(y>=c.y+c.height+.8-.05)h=Math.max(h,c.y+c.height+.8);}if(r)h=Math.max(h,rampY(r,z));return h;};
W.inCave=(x,z)=>oldInCave(x,z)||!!at(x,z);W.biome=(x,z,y)=>at(x,z)?'cave':oldBiome(x,z,y);
W.caveCeiling=(x,z,y)=>{const c=at(x,z);return c&&y<c.y+c.height?c.y+c.height:oldInCave(x,z)&&y<W.caveY+11?W.caveY+11:Infinity;};
W.caveBlocked=(x,z,y,r=.32)=>{for(const c of caves){if(Math.abs(x-c.x)>24||Math.abs(z-c.z)>24||y>c.y+c.height+.8||y+1.7<c.y)continue;const lx=x-c.x,lz=z-c.z;if(c.walls.some(w=>Math.abs(lx-w.x)<w.sx+r&&Math.abs(lz-w.z)<w.sz+r))return true;}return false;};
W.caves=caves;W.cavePatterns=patterns;W.extraCaveAt=at;W.extraCaveRampAt=rampAt;W.extraCaveRampY=rampY;
const previousExclude=window.KomorebiSurvivalPlacement.excludeTree;window.KomorebiSurvivalPlacement.excludeTree=(x,z)=>previousExclude(x,z)||caves.some(c=>Math.abs(x-W.anchor.x-c.x)<29&&Math.abs(z-W.anchor.z-c.z)<29+c.rampLength);
window.buildSurvivalCaves=function(world){world.caveGroups=[];for(const c of caves){const g=world.group(c.x,c.y,c.z);g.userData.caveId=c.id;world.caveGroups.push({c,g});const points=[],uvs=[],quad=(a,b,d,e)=>{for(const p of [a,b,d,a,d,e]){points.push(...p);uvs.push(p[0]/4+p[2]/7,p[1]/4+p[2]/4);}};
for(const[ix,iz]of c.cells){const x=(ix-4)*cell,z=(iz-4)*cell,l=x-half,r=x+half,t=z-half,b=z+half,h=c.height;quad([l,0,t],[l,0,b],[r,0,b],[r,0,t]);quad([l,h,t],[r,h,t],[r,h,b],[l,h,b]);quad([l,h+.8,t],[l,h+.8,b],[r,h+.8,b],[r,h+.8,t]);}
for(const w of c.walls){const x=w.x,z=w.z,dx=w.sx>.3?half:0,dz=w.sz>.3?half:0;quad([x-dx,-(c.y-c.lo+.7),z-dz],[x+dx,-(c.y-c.lo+.7),z+dz],[x+dx,c.height+.8,z+dz],[x-dx,c.height+.8,z-dz]);}
const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(points,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.computeVertexNormals();const mat=world.mat(c.theme[2],false,c.theme[1]).clone();mat.side=T.DoubleSide;const mesh=new T.Mesh(geometry,mat);mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);g.userData.surface=mesh;
const rampGeo=new T.BufferGeometry();rampGeo.setAttribute('position',new T.Float32BufferAttribute([-2.5,0,22.5,-2.5,c.rampEndY-c.y,22.5+c.rampLength,2.5,c.rampEndY-c.y,22.5+c.rampLength,2.5,0,22.5],3));rampGeo.setAttribute('uv',new T.Float32BufferAttribute([0,0,0,4,1,4,1,0],2));rampGeo.setIndex([0,1,2,0,2,3]);rampGeo.computeVertexNormals();const ramp=new T.Mesh(rampGeo,mat);ramp.receiveShadow=true;g.add(ramp);
// Rocky buttresses, a distinct entrance crown, and stalactites identify each cave.
for(let n=0;n<c.walls.length;n+=3){const w=c.walls[n],o=world.mesh(g,'rock',c.theme[2],w.x,c.height*.48,w.z,.7,c.height*.65,.7,false,c.theme[1]);o.rotation.y=n;}
for(const x of[-3.4,3.4])world.mesh(g,'rock',c.theme[2],x,2.9,23,1.1,3.8,1.2,false,c.theme[1]);world.mesh(g,'rock',c.theme[2],0,c.height+.3,23,4,1.1,1.6,false,c.theme[1]);
for(let n=0;n<c.cells.length;n+=5){const[ix,iz]=c.cells[n],x=(ix-4)*cell,z=(iz-4)*cell;world.mesh(g,'cone',c.theme[2],x+.8,c.height-.7,z,.25,-1.4,.25,false,c.theme[1]);}
const picks=c.cells.filter(([x,z])=>!(x===4&&z>=7));for(let n=0;n<Math.min(10,picks.length);n++){const[ix,iz]=picks[Math.floor(n*picks.length/10)],kind=['ore','crystal','spore','stone'][n%4],x=c.x+(ix-4)*cell+1.5,z=c.z+(iz-4)*cell;world.resource(c.id+'-'+n,kind,x,c.y,z,'cave',{type:'cave-wall',cave:c.id});}
const light=new T.PointLight(c.index%2?'#a9c4e9':'#a8c6a8',.8,45);light.position.set(0,4,0);g.add(light);
}}
})();
