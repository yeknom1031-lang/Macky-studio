/* Organic, buried passages. Terrain apertures, walking and mesh share these functions. */
(()=>{'use strict';const W=EmberTerrain,T=THREE,clamp=T.MathUtils.clamp;
const themes=[['石灰','cave-limestone','#b7ac96'],['青晶','cave-limestone','#83969e'],['苔岩','moss-stone','#87927b'],['黒曜','obsidian','#8e8792']];
const forms=['蛇行洞','環状洞','双子の岩窟','三叉洞','岩柱の洞','折れ曲がる洞','枝分かれ洞','連なる岩窟'];
const width=s=>3.8+.35*Math.sin(s*.31),bump=(u,s)=>.17*Math.sin(s*.42)*Math.cos(u*.53),plane=(c,u,s)=>c.y-.30*s+bump(u,s);
const local=(c,x,z)=>{const dx=x-c.x,dz=z-c.z;return{u:dx*c.fz-dz*c.fx,s:dx*c.fx+dz*c.fz};};
const point=(c,u,s)=>({x:c.x+u*c.fz+s*c.fx,z:c.z-u*c.fx+s*c.fz});
function layout(n){const v=Math.floor(n/8),f=n%8,q=1+v*.11,paths=[[ [0,-5,3.8],[0,23,4.2] ]];
 const add=p=>paths.push(p.map(([u,s,r=4])=>[u*q,s,r]));
 if(f===0)add([[0,23],[6,33,5],[10,43],[3,55,6],[-8,65,7]]);
 if(f===1){add([[0,23],[-10,33],[-13,48],[0,59,6],[14,48],[12,33],[0,23]]);}
 if(f===2){add([[0,23],[-7,35,7],[-8,45,8]]);add([[0,25],[10,39,7],[12,51,8]]);}
 if(f===3){add([[0,23],[-14,37,5],[-19,51,7]]);add([[0,24],[13,40],[20,55,6]]);add([[0,26],[0,48,5],[3,65,6]]);}
 if(f===4){add([[0,23],[-11,32],[-16,47],[-9,62],[6,66],[17,55],[17,38],[8,29],[0,23]]);add([[-16,47],[-4,42],[8,44],[17,55]]);}
 if(f===5)add([[0,23],[-12,33],[-15,44],[0,48,5],[14,53],[12,65],[-2,73,6]]);
 if(f===6){add([[0,23],[0,40,8],[0,66,5]]);add([[-22,54,6],[-10,43],[0,40],[12,44],[22,56,7]]);}
 if(f===7)add([[0,23],[5,34,7],[-3,47,4],[4,59,7],[-5,73,6]]);
 return{paths,name:themes[v][0]+'の'+forms[f],theme:themes[v]};}
function field(c,u,s){if(s<20){const end=Math.max(0,-5-s);return width(s)-Math.hypot(u,end);}
 let best=-1e6;for(const p of c.paths)for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i],dx=b[0]-a[0],dz=b[1]-a[1],t=clamp(((u-a[0])*dx+(s-a[1])*dz)/(dx*dx+dz*dz),0,1);best=Math.max(best,a[2]+t*(b[2]-a[2])-Math.hypot(u-a[0]-dx*t,s-a[1]-dz*t));}
 return best+Math.min(1,(s-20)/6)*(.38*Math.sin(u*1.31+s*.43)+.23*Math.sin(s*.91-u*.73));}
function floor(c,u,s){const p=point(c,u,s);return Math.min(W.ground(p.x,p.z)-.035,plane(c,u,s));}
function roof(c,u,s){const d=field(c,u,s),w=s<20?width(s):5;return plane(c,u,s)+1.9+3.9*Math.sqrt(clamp(d/w,0,1))+(s<20?0:.25*Math.sin(s*.68+u*.89));}
const caves=[];
for(let n=0;n<32;n++){let c=null;const spec=layout(n);for(let k=0;k<1000;k++){const a=n*2.399963+k*.23,r=260+Math.floor(n/8)*330+k*4,x=Math.round(Math.sin(a)*r),z=Math.round(Math.cos(a)*r),y=W.ground(x,z);if(y<W.water+38||caves.some(p=>Math.hypot(p.x-x,p.z-z)<155)||Math.hypot(x-W.shop.x,z-W.shop.z)<100)continue;
 const gx=W.ground(x+8,z)-W.ground(x-8,z),gz=W.ground(x,z+8)-W.ground(x,z-8),len=Math.hypot(gx,gz);if(len<1.6||len>11)continue;
 const test={...spec,id:'cave-'+n,index:n,x,z,y,fx:gx/len,fz:gz/len};let valid=true;
 for(const path of spec.paths)for(const p of path){if(p[1]<20)continue;for(const u of [p[0]-p[2],p[0],p[0]+p[2]]){const v=point(test,u,p[1]);if(W.ground(v.x,v.z)<roof(test,u,p[1])+1||floor(test,u,p[1])<W.water+3){valid=false;break;}}if(!valid)break;}
 if(!valid)continue;c=test;break;}
 if(!c)throw Error('地下洞窟の地形を確保できません: '+n);
 c.entrance={...point(c,0,0),y:c.y};c.spawnPoints=[32,42,54].map(s=>{const p=c.paths[1][Math.min(c.paths[1].length-1,Math.floor((s-25)/12)+1)],v=point(c,p[0],p[1]);return{...v,y:floor(c,p[0],p[1])};});
 c.bounds={minU:Math.floor(Math.min(...c.paths.flat().map(p=>p[0]-p[2]))-2),maxU:Math.ceil(Math.max(...c.paths.flat().map(p=>p[0]+p[2]))+2),minS:-10,maxS:Math.ceil(Math.max(...c.paths.flat().map(p=>p[1]+p[2]))+2)};caves.push(c);
}
function near(x,z){return caves.find(c=>Math.hypot(x-c.x,z-c.z)<110);}
function at(x,z,y){const c=near(x,z);if(!c)return null;const p=local(c,x,z);if(field(c,p.u,p.s)<0||p.s<-9)return null;if(y!==undefined&&y>=roof(c,p.u,p.s)-.1)return null;return c;}
const oldFloor=W.floor,oldBiome=W.biome;
W.floor=(x,z,y=0)=>{const c=at(x,z,y);if(!c)return oldFloor(x,z,y);const p=local(c,x,z);return floor(c,p.u,p.s);};
W.inCave=(x,z,y)=>!!at(x,z,y);W.biome=(x,z,y)=>at(x,z,y)?'cave':oldBiome(x,z,y);
W.caveCeiling=(x,z,y)=>{const c=at(x,z,y);if(!c)return Infinity;const p=local(c,x,z),h=roof(c,p.u,p.s);return h<W.ground(x,z)+.1?h:Infinity;};
W.caveDarkness=(x,z,y)=>{const c=at(x,z,y);if(!c)return 0;const p=local(c,x,z);return T.MathUtils.smoothstep(p.s,4,30);};
W.caveBlocked=(x,z,y,r=.32)=>{const c=near(x,z);if(!c)return false;const p=local(c,x,z),b=c.bounds;if(p.u<b.minU-1||p.u>b.maxU+1||p.s<b.minS-1||p.s>b.maxS+1||y>=W.ground(x,z)-.45)return false;const d=field(c,p.u,p.s);return d<r||y+1.8>roof(c,p.u,p.s);};
W.caves=caves;W.cavePatterns=caves;W.extraCaveAt=at;W.caveLocal=local;W.cavePoint=point;W.caveField=field;W.caveFloor=floor;W.caveRoof=roof;
const exclude=window.KomorebiSurvivalPlacement.excludeTree;window.KomorebiSurvivalPlacement.excludeTree=(x,z)=>{if(exclude(x,z))return true;const c=near(x-W.anchor.x,z-W.anchor.z);if(!c)return false;const p=local(c,x-W.anchor.x,z-W.anchor.z);return p.s>-12&&p.s<22&&Math.abs(p.u)<width(p.s)+3;};
// Only the exposed mouth is cut out of the height field; the mountain remains over the tunnels.
W.cutCaveMouths=shader=>{shader.uniforms.cavePortals={value:caves.map(c=>new T.Vector4(c.x+W.anchor.x,c.z+W.anchor.z,c.fx,c.fz))};shader.uniforms.caveLevels={value:caves.map(c=>c.y+W.anchor.y)};
 shader.fragmentShader='uniform vec4 cavePortals[32]; uniform float caveLevels[32];\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
 float caveMouthStone=0.0;
 for(int i=0;i<32;i++){vec2 delta=vNature.xz-cavePortals[i].xy;float s=dot(delta,cavePortals[i].zw);if(s<0.0||s>20.0)continue;float u=dot(delta,vec2(cavePortals[i].w,-cavePortals[i].z));float w=3.8+0.35*sin(s*0.31);caveMouthStone=max(caveMouthStone,(1.0-smoothstep(w+0.2,w+3.5,abs(u)))*smoothstep(0.0,2.0,s)*(1.0-smoothstep(10.0,19.0,s)));if(abs(u)>w)continue;float low=caveLevels[i]-0.30*s+0.17*sin(s*0.42)*cos(u*0.53);float high=low+1.9+3.9*sqrt(clamp(1.0-abs(u)/w,0.0,1.0));if(vNature.y>low-0.12&&vNature.y<high-0.02)discard;}`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`diffuseColor.rgb=mix(diffuseColor.rgb,texture2D(rockDetail,vNature.xz/4.0).rgb*vec3(0.58,0.55,0.48),caveMouthStone*0.9);
#include <roughnessmap_fragment>`);};
const oldSites=[
  {
    "id": "cave-0",
    "x": 283,
    "z": -210,
    "y": -8.833106412336626
  },
  {
    "id": "cave-1",
    "x": 26,
    "z": -463,
    "y": -1.2819928068373585
  },
  {
    "id": "cave-2",
    "x": -399,
    "z": -177,
    "y": -35.438729061529436
  },
  {
    "id": "cave-3",
    "x": -80,
    "z": -498,
    "y": -7.8864568609450245
  },
  {
    "id": "cave-4",
    "x": -579,
    "z": -222,
    "y": -30.390370621130266
  },
  {
    "id": "cave-5",
    "x": -618,
    "z": -346,
    "y": -30.577512397215166
  },
  {
    "id": "cave-6",
    "x": -632,
    "z": -484,
    "y": -30.823316826269426
  },
  {
    "id": "cave-7",
    "x": 60,
    "z": -713,
    "y": 15.690074310853682
  },
  {
    "id": "cave-8",
    "x": -820,
    "z": -239,
    "y": -29.693083657667437
  },
  {
    "id": "cave-9",
    "x": -173,
    "z": -602,
    "y": -0.74375785772542
  },
  {
    "id": "cave-10",
    "x": -720,
    "z": -180,
    "y": -32.51115871851186
  },
  {
    "id": "cave-11",
    "x": -837,
    "z": -41,
    "y": -27.407763137266436
  },
  {
    "id": "cave-12",
    "x": -466,
    "z": -406,
    "y": -21.65285827104787
  },
  {
    "id": "cave-13",
    "x": -524,
    "z": -849,
    "y": -7.7998784918043995
  },
  {
    "id": "cave-14",
    "x": -303,
    "z": 790,
    "y": 97.54454408700724
  },
  {
    "id": "cave-15",
    "x": 77,
    "z": -867,
    "y": 6.178364620759687
  },
  {
    "id": "cave-16",
    "x": -1015,
    "z": 53,
    "y": -18.2492352861617
  },
  {
    "id": "cave-17",
    "x": 453,
    "z": -1120,
    "y": 15.091375217988691
  },
  {
    "id": "cave-18",
    "x": -140,
    "z": -1006,
    "y": -20.20415390913228
  },
  {
    "id": "cave-19",
    "x": -1403,
    "z": -289,
    "y": -23.745340718672075
  },
  {
    "id": "cave-20",
    "x": 737,
    "z": -1452,
    "y": 48.89814840371867
  },
  {
    "id": "cave-21",
    "x": -1529,
    "z": -510,
    "y": -4.158869161054888
  },
  {
    "id": "cave-22",
    "x": -912,
    "z": -312,
    "y": -24.808058990881243
  },
  {
    "id": "cave-23",
    "x": -98,
    "z": -1172,
    "y": -27.930884255811968
  },
  {
    "id": "cave-24",
    "x": -1750,
    "z": 786,
    "y": -1.461059226438799
  },
  {
    "id": "cave-25",
    "x": 607,
    "z": -1543,
    "y": 47.886336193635664
  },
  {
    "id": "cave-26",
    "x": -1785,
    "z": 216,
    "y": -18.210763587400713
  },
  {
    "id": "cave-27",
    "x": -1800,
    "z": 589,
    "y": -5.001477851316729
  },
  {
    "id": "cave-28",
    "x": -1316,
    "z": 1503,
    "y": -11.651457919523516
  },
  {
    "id": "cave-29",
    "x": 397,
    "z": 1316,
    "y": 237.1614159208085
  },
  {
    "id": "cave-30",
    "x": 873,
    "z": -1242,
    "y": 35.86935268457194
  },
  {
    "id": "cave-31",
    "x": -2092,
    "z": -205,
    "y": 5.006948814943037
  }
];
W.upgradeCaveSave=state=>{if(state.caveVersion===2)return;for(const p of[state,state.checkpoint,...state.structures,...state.piles,...state.jobs,...state.bags]){if(p&&oldSites.some(c=>Math.abs(p.x-c.x)<30&&Math.abs(p.z-c.z)<75))p.y=W.ground(p.x,p.z);}
state.caveVersion=2;state.caveBrightness=70;};
function clip(poly,fn){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=fn(a),db=fn(b);if(da>=0)out.push(a);if((da>=0)!==(db>=0)){const t=da/(da-db);out.push(a.map((v,j)=>v+(b[j]-v)*t));}}return out;}
window.buildSurvivalCaves=world=>{world.caveGroups=[];for(const c of caves){const g=world.group(c.x,0,c.z);g.rotation.y=Math.atan2(c.fx,c.fz);g.userData.caveId=c.id;world.caveGroups.push({c,g});const positions=[],uv=[];
 const triangle=(a,b,d)=>{positions.push(...a,...b,...d);for(const p of[a,b,d])uv.push((p[0]+p[1]*.31)/3.3,(p[2]+p[1]*.57)/3.3);};
 const fan=poly=>{for(let i=1;i+1<poly.length;i++)triangle(poly[0],poly[i],poly[i+1]);};
 const ground=(u,s)=>{const p=point(c,u,s);return W.ground(p.x,p.z);};
 const grid=new Map(),sample=(u,s)=>{const key=u+','+s;if(!grid.has(key))grid.set(key,{u,s,d:field(c,u,s)});return grid.get(key);};
 for(let u=c.bounds.minU;u<c.bounds.maxU;u++)for(let s=c.bounds.minS;s<c.bounds.maxS;s++){
 for(const raw of [[[u,s],[u+1,s],[u,s+1]],[[u+1,s],[u+1,s+1],[u,s+1]]]){const poly=clip(raw,p=>sample(p[0],p[1]).d);if(poly.length<3)continue;
 fan(clip(poly.map(([u,s])=>[u,floor(c,u,s),s]),p=>ground(p[0],p[2])-plane(c,p[0],p[2])-.06));
 const ceiling=poly.map(([u,s])=>[u,roof(c,u,s),s]);fan(clip(ceiling,p=>ground(p[0],p[2])+.3-p[1]));
 const edges=[];for(let i=0;i<raw.length;i++){const a=raw[i],b=raw[(i+1)%raw.length],da=field(c,...a),db=field(c,...b);if((da>=0)!==(db>=0)){const t=da/(da-db);edges.push(a.map((v,j)=>v+(b[j]-v)*t));}}
 if(edges.length===2){const[a,b]=edges,fa=floor(c,...a),fb=floor(c,...b),ra=Math.min(roof(c,...a),ground(...a)+.2),rb=Math.min(roof(c,...b),ground(...b)+.2);
 const wallPoint=(p,f,r,t)=>{const du=field(c,p[0]+.05,p[1])-field(c,p[0]-.05,p[1]),ds=field(c,p[0],p[1]+.05)-field(c,p[0],p[1]-.05),len=Math.hypot(du,ds)||1,bulge=.13*Math.sin(t*Math.PI)*Math.sin(p[1]*1.3+t*7);return[p[0]+du/len*bulge,f+(r-f)*t,p[1]+ds/len*bulge];};
 if(Math.max(ra-fa,rb-fb)>.3)for(let j=0;j<4;j++)fan([wallPoint(a,fa,ra,j/4),wallPoint(b,fb,rb,j/4),wallPoint(b,fb,rb,(j+1)/4),wallPoint(a,fa,ra,(j+1)/4)]);}

 }}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();geometry.computeBoundingSphere();const mat=world.mat(c.theme[2],false,c.theme[1]).clone();mat.side=T.DoubleSide;mat.emissive.set(0);mat.roughness=1;mat.bumpMap=null;
 mat.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 cavePosition; varying vec3 caveNormal;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ncavePosition=position;caveNormal=normal;');shader.fragmentShader='varying vec3 cavePosition; varying vec3 caveNormal;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
 vec3 cw=pow(abs(normalize(caveNormal)),vec3(4.0));cw/=max(.001,cw.x+cw.y+cw.z);vec4 stone=texture2D(map,cavePosition.zy/4.0)*cw.x+texture2D(map,cavePosition.xz/4.0)*cw.y+texture2D(map,cavePosition.xy/4.0)*cw.z;diffuseColor*=mapTexelToLinear(stone);
 #endif`);};mat.customProgramCacheKey=()=>"organic-cave-triplanar-v1";
 const mesh=new T.Mesh(geometry,mat);mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);g.userData.surface=mesh;
 const path=c.paths.slice(1).flat();for(let i=0;i<Math.min(12,path.length*2);i++){const p=path[i%path.length],u=p[0]+(i%2?1:-1)*(p[2]-1.6),s=p[1]+(i%3-1)*.5;if(field(c,u,s)<.7)continue;const v=point(c,u,s),h=floor(c,u,s);world.resource(c.id+'-'+i,['ore','crystal','spore','stone'][i%4],v.x,h,v.z,'cave',{type:'cave-wall',cave:c.id});
 if(i%3===0&&s>25){const stal=world.mesh(g,'cone',c.theme[2],u,roof(c,u,s)-.65,s,.22,-1.3,.3,false,c.theme[1]);stal.material=mat;}}
 }};
})();
