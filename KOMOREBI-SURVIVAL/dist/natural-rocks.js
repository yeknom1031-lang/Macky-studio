/* Ten reusable rock meshes, with triangle-accurate support instead of spherical collision. */
(()=>{'use strict';const T=THREE;
const types=[
 {name:'丸みのある埋没岩',sx:1.65,sy:.8,sz:1.35,n:11,kind:'worn'},
 {name:'平たい板岩',sx:2.3,sy:.38,sz:1.4,n:7,kind:'slab'},
 {name:'割れた楔岩',sx:1.6,sy:1.2,sz:1.3,n:5,kind:'wedge'},
 {name:'細長い岩稜',sx:2.6,sy:.85,sz:.85,n:7,kind:'ridge'},
 {name:'層状の露岩',sx:2.1,sy:1.1,sz:1.55,n:8,kind:'strata'},
 {name:'低い割れ岩',sx:1.55,sy:.65,sz:1.3,n:10,kind:'worn'},
 {name:'割れ目のある双岩',sx:1.9,sy:1.1,sz:1.3,n:6,kind:'split'},
 {name:'崩れた岩塊',sx:2.1,sy:.85,sz:1.6,n:6,kind:'cluster'},
 {name:'傾いた岩盤',sx:1.9,sy:.65,sz:1.45,n:6,kind:'tilt'},
 {name:'風化した露岩',sx:1.7,sy:.65,sz:1.4,n:11,kind:'worn'}
];
const hash=(a,b)=>{const v=Math.sin(a*127.1+b*311.7)*43758.5453;return v-Math.floor(v);};
function shape(type,index){const pos=[],uv=[],tri=(a,b,c)=>{pos.push(...a,...b,...c);for(const p of[a,b,c])uv.push((p[0]+p[1]*.3)/2,(p[2]+p[1]*.6)/2);};
 function piece(cx,cz,scale,seed){const n=type.n,rings=[],levels=type.kind==='strata'?[[-.9,.97],[-.2,1],[.0,.96],[.32,.9],[.45,.84],[.72,.72],[.9,.61]]:[[-.9,.82],[-.12,1],[.48,.86],[1,.52]];
 for(let j=0;j<levels.length;j++){const[y,r]=levels[j],ring=[];for(let k=0;k<n;k++){const a=k/n*Math.PI*2+(hash(k,seed)-.5)*.15,rad=r*(.82+hash(k,seed+2)*.3),tilt=type.kind==='tilt'?Math.cos(a)*.15:0,peak=type.kind==='wedge'?Math.cos(a)*.12:type.kind==='jagged'?(hash(k,44)-.5)*.6:0;
 const py=y<0?y:y+tilt+peak*(j/(levels.length-1));ring.push([cx+(Math.cos(a)*rad+j*.025)*scale,py*scale,cz+Math.sin(a)*rad*scale]);}rings.push(ring);}
 for(let j=1;j<rings.length;j++)for(let k=0;k<n;k++){const next=(k+1)%n;tri(rings[j-1][k],rings[j][k],rings[j][next]);tri(rings[j-1][k],rings[j][next],rings[j-1][next]);}
 const cap=[cx+.06*scale,(type.kind==='slab'?.92:.99)*scale,cz-.06*scale];for(let k=0;k<n;k++){tri(rings.at(-1)[k],cap,rings.at(-1)[(k+1)%n]);tri(rings[0][(k+1)%n],[cx,-.9*scale,cz],rings[0][k]);}}
 if(type.kind==='split'){piece(-.48,0,.58,index);piece(.46,.1,.67,index+31);}else if(type.kind==='cluster'){piece(-.45,-.28,.58,index);piece(.43,-.16,.55,index+21);piece(.1,.45,.61,index+43);}else piece(0,0,1,index+10);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();g.userData.rockType=index;return g;
}
const geometries=types.map(shape);
function material(texture){const m=new T.MeshStandardMaterial({map:texture,color:'#bdb7aa',roughness:1});m.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 rockPosition; varying vec3 rockNormal;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nrockPosition=position;rockNormal=normal;');shader.fragmentShader='varying vec3 rockPosition; varying vec3 rockNormal;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
 vec3 w=pow(abs(normalize(rockNormal)),vec3(4.0));w/=max(.001,w.x+w.y+w.z);vec4 stone=texture2D(map,rockPosition.yz)*w.x+texture2D(map,rockPosition.xz)*w.y+texture2D(map,rockPosition.xy)*w.z;diffuseColor*=mapTexelToLinear(stone);
 #endif`);};m.customProgramCacheKey=()=> 'ten-natural-rocks-v1';return m;}
function prepare(r,east,north,height){r.variant??=Math.floor(hash(east+r.east,north+r.north)*10);const spec=types[r.variant],x=east+r.east,z=north+r.north,angle=r.angle??hash(x,z+71)*Math.PI*2,size=r.scale||1;
 const sx=spec.sx*size,sy=spec.sy*size,sz=spec.sz*size,co=Math.cos(angle),si=Math.sin(angle);let low=height(x,z);for(let k=0;k<8;k++){const a=k*Math.PI/4,dx=Math.cos(a)*sx*.85,dz=Math.sin(a)*sz*.85;low=Math.min(low,height(x+dx*co+dz*si,z-dx*si+dz*co));}
 const base=r.baseY??low-sy*.16,scale=new T.Vector3(sx,sy,sz),rotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),angle);r.matrix=new T.Matrix4().compose(new T.Vector3(r.east,base,r.north),rotation,scale);
 const transform=new T.Matrix4().compose(new T.Vector3(x,base,z),rotation,scale),p=geometries[r.variant].attributes.position,v=new T.Vector3();r.triangles=[];r.bounds=new T.Box3();
 for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(transform);r.triangles.push(v.x,v.y,v.z);r.bounds.expandByPoint(v);}r.altitude=height(x,z);r.worldX=x;r.worldZ=z;return r;}
function topAt(r,x,z){const b=r.bounds;if(!b||x<b.min.x||x>b.max.x||z<b.min.z||z>b.max.z)return null;let top=-Infinity;const p=r.triangles;for(let i=0;i<p.length;i+=9){const ax=p[i],az=p[i+2],bx=p[i+3],bz=p[i+5],cx=p[i+6],cz=p[i+8],den=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz);if(Math.abs(den)<1e-8)continue;const a=((bz-cz)*(x-cx)+(cx-bx)*(z-cz))/den,bb=((cz-az)*(x-cx)+(ax-cx)*(z-cz))/den;if(a>=-1e-6&&bb>=-1e-6&&a+bb<=1.000001)top=Math.max(top,a*p[i+1]+bb*p[i+4]+(1-a-bb)*p[i+7]);}return top===-Infinity?null:top;}
function build(group,rocks,mat,height){const east=group.userData.east,north=group.userData.north;for(const r of rocks)prepare(r,east,north,height);for(let i=0;i<10;i++){const subset=rocks.filter(r=>r.variant===i);if(!subset.length)continue;const mesh=new T.InstancedMesh(geometries[i],mat,subset.length);subset.forEach((r,j)=>mesh.setMatrixAt(j,r.matrix));mesh.castShadow=mesh.receiveShadow=true;mesh.userData.naturalRockType=i;mesh.frustumCulled=false;group.add(mesh);}}
window.NaturalRocks={types,geometries,material,prepare,topAt,build};
})();
