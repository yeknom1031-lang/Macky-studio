import {coordinates,lineIds,runs} from './puzzles3d.mjs';
const T=window.THREE;
export class VoxelView {
  constructor(container,callbacks={}) {
    this.container=container;this.callbacks=callbacks;this.yaw=Math.PI/4;this.elevation=.49;this.zoom=1;
    this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(38,1,.1,100);
    this.renderer=new T.WebGLRenderer({antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.renderer.outputEncoding=T.sRGBEncoding;this.renderer.setClearColor(0x000000,0);
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    this.canvas=this.renderer.domElement;container.append(this.canvas);this.canvas.tabIndex=0;this.canvas.setAttribute('aria-label','3Dピクロス盤面。ドラッグで回転、ホイールで拡大縮小。');
    this.scene.add(new T.HemisphereLight(0xffffff,0xa1af8b,.65));
    const light=new T.DirectionalLight(0xffffff,.55);light.position.set(-4,9,7);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-8;light.shadow.camera.right=8;light.shadow.camera.top=8;light.shadow.camera.bottom=-8;light.shadow.bias=-.001;this.scene.add(light);
    this.volume=new T.Group();this.scene.add(this.volume);this.ray=new T.Raycaster();this.pointer=new T.Vector2();this.materials=new Map();this.geometry=new T.BoxGeometry(.91,.91,.91);
    this.hoverOutline=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(.965,.965,.965)),new T.LineBasicMaterial({color:0xa0bc56,depthTest:false}));this.hoverOutline.renderOrder=9;this.hoverOutline.visible=false;this.scene.add(this.hoverOutline);
    this.errorOutline=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(.99,.99,.99)),new T.LineBasicMaterial({color:0xd36e51,depthTest:false}));this.errorOutline.renderOrder=10;this.errorOutline.visible=false;this.scene.add(this.errorOutline);
    this.pointers=new Map();this.installInput();this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(container);
    this.resize();this.running=true;const render=()=>{if(!this.running)return;this.renderer.render(this.scene,this.camera);this.frame=requestAnimationFrame(render);};render();
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();callbacks.contextLost?.();});
    this.canvas.addEventListener('webglcontextrestored',()=>this.renderer.render(this.scene,this.camera));
  }
  build(game){
    this.game=game;this.n=game.puzzle.size;this.volume.clear();this.hoverOutline.visible=false;this.hoverIndex=-1;this.sliced=0;this.sliceAxis=1;this.meshes=[];
    if(this.floor){this.scene.remove(this.floor);this.floor.geometry.dispose();this.floor.material.dispose();this.scene.remove(this.grid);this.grid.geometry.dispose();if(Array.isArray(this.grid.material))this.grid.material.forEach(m=>m.dispose());else this.grid.material.dispose();}
    this.floor=new T.Mesh(new T.CircleGeometry(this.n*1.45,64),new T.MeshLambertMaterial({color:0xecf0de}));this.floor.rotation.x=-Math.PI/2;this.floor.position.y=-this.n/2-.12;this.floor.receiveShadow=true;this.scene.add(this.floor);
    this.grid=new T.GridHelper(this.n*2.7,this.n*3,0xd2dbc1,0xe0e7d3);this.grid.position.y=-this.n/2-.1;this.grid.material.transparent=true;this.grid.material.opacity=.5;this.scene.add(this.grid);
    for(let i=0;i<this.n**3;i++){
      const p=coordinates(i,this.n);const maps=[0,1,2].map(axis=>runs(lineIds(axis,p,this.n).map(k=>game.puzzle.solution[k])));
      const mesh=new T.Mesh(this.geometry,[]);mesh.position.set(p[0]-(this.n-1)/2,p[1]-(this.n-1)/2,p[2]-(this.n-1)/2);mesh.userData={index:i,point:p,clues:maps};mesh.castShadow=true;mesh.receiveShadow=true;this.meshes.push(mesh);this.volume.add(mesh);
    }
    this.sync();this.reset();
  }
  faceMaterial(axis,clue,state,won){
    const background=won?this.game.puzzle.color:state===1?'#b6cc87':'#f8faed';
    const key=`${axis}:${clue.join(',')}:${background}:${won}`;if(this.materials.has(key))return this.materials.get(key);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle=background;ctx.fillRect(0,0,128,128);
    ctx.strokeStyle=won?'#ffffff22':'#d7dfc3';ctx.lineWidth=3;ctx.strokeRect(2,2,124,124);
    if(!won){ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#40533b';ctx.font=`600 ${clue.length>2?28:clue.length>1?34:46}px sans-serif`;ctx.fillText(clue.join('·'),64,68);
      ctx.fillStyle=['#a27662','#84995e','#819da5'][axis];ctx.font='500 15px sans-serif';ctx.fillText(['X →','Y ↑','Z →'][axis],64,21);
    }
    const texture=new T.CanvasTexture(canvas);texture.encoding=T.sRGBEncoding;texture.anisotropy=Math.min(this.renderer.capabilities.getMaxAnisotropy(),4);
    const material=new T.MeshLambertMaterial({map:texture});this.materials.set(key,material);return material;
  }
  sync(){
    if(!this.game)return;const won=this.game.status==='won';
    for(const mesh of this.meshes){const {index,point,clues}=mesh.userData,state=this.game.cells[index];
      mesh.visible=state!==-1&&(!this.sliced||point[this.sliceAxis]===this.sliced-1);
      const mats=clues.map((clue,axis)=>this.faceMaterial(axis,clue,state,won));mesh.material=[mats[0],mats[0],mats[1],mats[1],mats[2],mats[2]];
    }
    if(this.hoverIndex>=0&&!this.meshes[this.hoverIndex]?.visible)this.hoverOutline.visible=false;
    this.container.dataset.visibleBlocks=this.meshes.filter(m=>m.visible).length;
  }
  slice(axis,layer){this.sliceAxis=axis;this.sliced=layer;this.sync();}
  resize(){const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.positionCamera();}
  positionCamera(){
    const distance=(this.n||3)*2.85*this.zoom*Math.max(1,1/this.camera.aspect);
    this.camera.position.set(Math.sin(this.yaw)*Math.cos(this.elevation)*distance,Math.sin(this.elevation)*distance,Math.cos(this.yaw)*Math.cos(this.elevation)*distance);
    this.camera.lookAt(0,0,0);this.camera.updateMatrixWorld();this.callbacks.view?.(this.yaw,this.elevation,this.zoom);
  }
  reset(){this.yaw=Math.PI/4;this.elevation=.49;this.zoom=1;this.positionCamera();}
  preset(kind){this.yaw=kind==='side'?Math.PI/2:0;this.elevation=kind==='top'?Math.PI/2-.001:0;this.positionCamera();}
  hit(x,y){const rect=this.canvas.getBoundingClientRect();this.pointer.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);this.volume.updateMatrixWorld(true);return this.ray.intersectObjects(this.meshes.filter(m=>m.visible),false)[0]?.object;}
  hover(mesh){const i=mesh?.userData.index??-1;if(i===this.hoverIndex)return;this.hoverIndex=i;this.hoverOutline.visible=!!mesh;if(mesh)this.hoverOutline.position.copy(mesh.position);this.callbacks.hover?.(i);}
  flash(i){const mesh=this.meshes[i];if(!mesh)return;this.errorOutline.position.copy(mesh.position);this.errorOutline.visible=true;clearTimeout(this.flashTimeout);this.flashTimeout=setTimeout(()=>this.errorOutline.visible=false,550);}
  installInput(){
    this.canvas.addEventListener('contextmenu',e=>e.preventDefault());
    this.canvas.addEventListener('pointerdown',e=>{
      if(e.button>2)return;e.preventDefault();this.canvas.focus({preventScroll:true});this.canvas.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(this.pointers.size===2){const [a,b]=[...this.pointers.values()];this.pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom:this.zoom};if(this.drag)this.drag.moved=true;return;}
      this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:this.yaw,elevation:this.elevation,moved:false,button:e.button,type:e.pointerType};
    });
    this.canvas.addEventListener('pointermove',e=>{
      if(this.pointers.has(e.pointerId))this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(this.pointers.size===2&&this.pinch){const[a,b]=[...this.pointers.values()];this.zoom=Math.max(.65,Math.min(2.2,this.pinch.zoom*this.pinch.distance/Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))));this.positionCamera();return;}
      if(this.drag&&this.drag.id===e.pointerId){const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;if(Math.hypot(dx,dy)>6)this.drag.moved=true;
        if(this.drag.moved){this.yaw=this.drag.yaw-dx*.009;this.elevation=Math.max(-1.4,Math.min(1.56,this.drag.elevation+dy*.007));this.positionCamera();this.hover(null);return;}
      }
      this.hover(this.hit(e.clientX,e.clientY));
    });
    this.canvas.addEventListener('pointerup',e=>{
      const drag=this.drag;if(drag?.id===e.pointerId&&!drag.moved&&e.button!==1){const mesh=this.hit(e.clientX,e.clientY);if(mesh)this.callbacks.act?.(mesh.userData.index,e.button===2?'remove':e.pointerType==='mouse'?'keep':null);}
      this.pointers.delete(e.pointerId);if(this.drag?.id===e.pointerId)this.drag=null;this.pinch=null;
    });
    const cancel=e=>{this.pointers.delete(e.pointerId);if(this.drag?.id===e.pointerId)this.drag=null;this.pinch=null;};
    this.canvas.addEventListener('pointercancel',cancel);this.canvas.addEventListener('lostpointercapture',cancel);
    this.canvas.addEventListener('pointerleave',()=>{if(!this.drag)this.hover(null);});
    this.canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(.65,Math.min(2.2,this.zoom*Math.exp(e.deltaY*.001)));this.positionCamera();},{passive:false});
    this.canvas.addEventListener('keydown',e=>{
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')this.yaw-=.15;if(e.key==='ArrowRight')this.yaw+=.15;if(e.key==='ArrowUp')this.elevation=Math.min(1.56,this.elevation+.12);if(e.key==='ArrowDown')this.elevation=Math.max(-1.4,this.elevation-.12);if(['+','='].includes(e.key))this.zoom=Math.max(.65,this.zoom-.1);if(e.key==='-')this.zoom=Math.min(2.2,this.zoom+.1);this.positionCamera();}
    });
  }
}
