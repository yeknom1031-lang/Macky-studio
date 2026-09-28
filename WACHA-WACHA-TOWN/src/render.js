window.WachaArt=(()=>{
 'use strict';
 const images={},M=WACHA_ASSETS.atlas,CW=M.cw,CH=M.ch;
 const moving=new Set(['walk','going','tag','police','pursue','flee','delivery']);
 async function init(progress){let loaded=0;const entries=Object.entries(WACHA_ASSETS.images);await Promise.all(entries.map(([key,url])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[key]=im;progress(Math.round(++loaded/entries.length*M.typeCount));resolve();};im.onerror=()=>reject(Error('画像を読み込めません: '+key));im.src=url;})));}
 const variantFrames=new Map(),TINTS=[[0,0,0],[.91,.32,.25],[.19,.64,.51],[.57,.39,.78]];
 function rect(type,frame){return {...M.rects[Math.floor(type/M.palettes)][Math.max(0,Math.min(14,frame))]};}
 function variant(type,frame){const key=type*15+frame;if(variantFrames.has(key))return variantFrames.get(key);const r=rect(type,frame),c=document.createElement('canvas');c.width=CW;c.height=CH;const ctx=c.getContext('2d');ctx.drawImage(images['crowd-atlas'],r.x,r.y,CW,CH,0,0,CW,CH);const palette=type%M.palettes;
  if(palette){const im=ctx.getImageData(0,0,CW,CH),a=im.data,tint=TINTS[palette];for(let i=0;i<a.length;i+=4){if(!a[i+3])continue;const r=a[i]/255,g=a[i+1]/255,b=a[i+2]/255,l=(Math.max(r,g,b)+Math.min(r,g,b))/2,y=Math.floor(i/4/CW)/CH;if(l<.1||(r>g*1.07&&g>b*1.06&&y<.68))continue;for(let k=0;k<3;k++)a[i+k]=Math.round(Math.min(1,Math.max(0,a[i+k]/255*.4+(tint[k]*(.25+l*1.3)+Math.max(l-.55,0)*.7)*.6))*255);}ctx.putImageData(im,0,0);}
  if(variantFrames.size>1500)variantFrames.delete(variantFrames.keys().next().value);variantFrames.set(key,c);return c;
 }
 function sprite(ctx,type,frame,x,y,height=51,facing=1,crop=1){const w=height*CW/CH;ctx.save();ctx.translate(x,y);ctx.scale(facing,1);ctx.drawImage(variant(type,frame),0,0,CW,CH*crop,-w/2,-height*crop,w,height*crop);ctx.restore();}
 function portrait(c,type,phase=0){const x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);const base=Math.floor(type/M.palettes),frame=base<16?Math.floor(phase*15)%15:5+Math.floor(phase*5)%5;sprite(x,type,frame,c.width/2,c.height-4,c.height-4);}
 function pose(p,s){const base=Math.floor(p.type/M.palettes),walking=p.yieldingUntil>s.elapsed||(moving.has(p.activity)&&p.pace>.07&&s.elapsed>=p.pauseUntil);let start=0,count=15;
  if(base>=16){start=walking?0:p.activity===p.signature?10:5;count=5;}
  else if(!walking){start=3;count=3;}
  const t=p.phase*count,frame=start+Math.floor(t)%count,next=start+(Math.floor(t)+1)%count;const blend=Math.max(0,(t%1-.78)/.22);return{frame,next,mix:blend*blend*(3-2*blend),walking};
 }

 class Batch {
  constructor(canvas){
   this.gl=canvas.getContext('webgl2',{alpha:true,antialias:false,premultipliedAlpha:false,powerPreference:'low-power'});this.mode=this.gl?'webgl2':'canvas2d';this.data=new Float32Array(1600*15);
   if(!this.gl){this.ctx=canvas.getContext('2d');return;}
   const g=this.gl,vs=`#version 300 es
   precision highp float;
   layout(location=0) in vec2 corner;
   layout(location=1) in vec4 box;
   layout(location=2) in vec4 uvBox;
   layout(location=3) in vec4 extra;
   layout(location=4) in vec3 shape;
   uniform vec2 resolution;
   uniform vec3 camera;
   out vec2 uv;out vec2 localUv;out vec4 effect;out float nextY;
   void main(){vec2 q=vec2((corner.x-.5)*box.z,(corner.y-1.)*box.w);float a=shape.x;vec2 p=box.xy+vec2(q.x*cos(a)-q.y*sin(a),q.x*sin(a)+q.y*cos(a));vec2 pixel=(p-camera.xy)*camera.z+resolution*.5;gl_Position=vec4(pixel.x/resolution.x*2.-1.,1.-pixel.y/resolution.y*2.,0.,1.);localUv=vec2(extra.x<0.?1.-corner.x:corner.x,corner.y);uv=uvBox.xy+localUv*uvBox.zw;effect=vec4(extra.yzw,shape.y);nextY=shape.z;}`;
   const fs=`#version 300 es
   precision highp float;uniform sampler2D atlas;in vec2 uv;in vec2 localUv;in vec4 effect;in float nextY;out vec4 color;
   void main(){vec4 first=texture(atlas,uv),second=texture(atlas,uv+vec2(effect.z,nextY));float alpha=mix(first.a,second.a,effect.y);color=vec4(mix(first.rgb*first.a,second.rgb*second.a,effect.y)/max(alpha,.001),alpha*effect.w);if(color.a<.015)discard;
    if(effect.x>.5){vec3 rgb=color.rgb;float l=(max(max(rgb.r,rgb.g),rgb.b)+min(min(rgb.r,rgb.g),rgb.b))*.5;bool skin=rgb.r>rgb.g*1.07&&rgb.g>rgb.b*1.06&&localUv.y<.68;
     if(l>=.1&&!skin){vec3 tint=effect.x<1.5?vec3(.91,.32,.25):effect.x<2.5?vec3(.19,.64,.51):vec3(.57,.39,.78);color.rgb=clamp(mix(rgb,tint*(.25+l*1.3)+max(l-.55,0.)*.7,.6),0.,1.);}
    }
   }`;
   const shader=(kind,src)=>{const sh=g.createShader(kind);g.shaderSource(sh,src);g.compileShader(sh);if(!g.getShaderParameter(sh,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(sh));return sh;};
   this.program=g.createProgram();g.attachShader(this.program,shader(g.VERTEX_SHADER,vs));g.attachShader(this.program,shader(g.FRAGMENT_SHADER,fs));g.linkProgram(this.program);if(!g.getProgramParameter(this.program,g.LINK_STATUS))throw Error(g.getProgramInfoLog(this.program));g.useProgram(this.program);
   const vertices=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,vertices);g.bufferData(g.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,1,1]),g.STATIC_DRAW);g.enableVertexAttribArray(0);g.vertexAttribPointer(0,2,g.FLOAT,false,0,0);
   this.buffer=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,this.buffer);g.bufferData(g.ARRAY_BUFFER,this.data.byteLength,g.DYNAMIC_DRAW);
   [[1,4,0],[2,4,16],[3,4,32],[4,3,48]].forEach(([index,size,offset])=>{g.enableVertexAttribArray(index);g.vertexAttribPointer(index,size,g.FLOAT,false,60,offset);g.vertexAttribDivisor(index,1);});
   this.texture=g.createTexture();g.bindTexture(g.TEXTURE_2D,this.texture);g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,images['crowd-atlas']);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.uniform1i(g.getUniformLocation(this.program,'atlas'),0);
   this.resolution=g.getUniformLocation(this.program,'resolution');this.camera=g.getUniformLocation(this.program,'camera');g.enable(g.BLEND);g.blendFunc(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA);g.clearColor(0,0,0,0);
  }
  draw(items,view){
   if(!this.gl){const c=this.ctx;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,view.canvas.width,view.canvas.height);const d=view.dpr||1;c.setTransform(view.scale*d,0,0,view.scale*d,(view.width/2-view.cx*view.scale)*d,(view.height/2-view.cy*view.scale)*d);for(const p of items){c.save();c.translate(p.x,p.y);c.rotate(p.tilt||0);c.scale(p.facing||1,1);if(p.type!==undefined)c.drawImage(variant(p.type,p.frame),0,0,CW,p.r.h,-p.w/2,-p.h,p.w,p.h);else c.drawImage(images['crowd-atlas'],p.r.x,p.r.y,p.r.w,p.r.h,-p.w/2,-p.h,p.w,p.h);c.restore();}return;}
   const g=this.gl;let i=0;for(const p of items){this.data[i++]=p.x;this.data[i++]=p.y;this.data[i++]=p.w;this.data[i++]=p.h;this.data[i++]=p.r.x/M.width;this.data[i++]=p.r.y/M.height;this.data[i++]=p.r.w/M.width;this.data[i++]=p.r.h/M.height;this.data[i++]=p.facing||1;this.data[i++]=p.palette||0;this.data[i++]=p.mix||0;this.data[i++]=(p.nextDelta||0)/M.width;this.data[i++]=p.tilt||0;this.data[i++]=1;this.data[i++]=(p.nextDeltaY||0)/M.height;}
   g.viewport(0,0,view.canvas.width,view.canvas.height);g.clear(g.COLOR_BUFFER_BIT);g.useProgram(this.program);g.uniform2f(this.resolution,view.width,view.height);g.uniform3f(this.camera,view.cx,view.cy,view.scale);g.bindBuffer(g.ARRAY_BUFFER,this.buffer);g.bufferSubData(g.ARRAY_BUFFER,0,this.data.subarray(0,i));g.drawArraysInstanced(g.TRIANGLE_STRIP,0,4,items.length);
  }
 }
 class World {
  constructor(c){this.canvas=c;this.batch=new Batch(c);this.overlay=document.querySelector('#life-overlay');this.ctx=this.overlay.getContext('2d');this.backdrop=document.querySelector('#world-backdrop');this.zoom=1;this.cx=836;this.cy=470.5;this.width=0;this.height=0;this.scale=1;this.rendered=0;this.drawFrames=0;this.backgroundKey='';this.resize();}
  resize(){const r=this.canvas.getBoundingClientRect();if(!r.width||!r.height)return;this.width=r.width;this.height=r.height;this.dpr=Math.min(window.devicePixelRatio||1,1.5);this.canvas.width=Math.round(r.width*this.dpr);this.canvas.height=Math.round(r.height*this.dpr);this.overlay.width=this.canvas.width;this.overlay.height=this.canvas.height;this.base=Math.max(this.width/1672,this.height/941);this.clamp();this.backgroundKey='';}
  clamp(){this.scale=this.base*this.zoom;const w=this.width/this.scale/2,h=this.height/this.scale/2;this.cx=w>=836?836:Math.max(w,Math.min(1672-w,this.cx));this.cy=h>=470.5?470.5:Math.max(h,Math.min(941-h,this.cy));}
  fit(){this.zoom=1;this.cx=836;this.cy=470.5;this.clamp();}
  toWorld(x,y){return{x:(x-this.width/2)/this.scale+this.cx,y:(y-this.height/2)/this.scale+this.cy};}
  toScreen(x,y){return{x:(x-this.cx)*this.scale+this.width/2,y:(y-this.cy)*this.scale+this.height/2};}
  zoomAt(factor,x=this.width/2,y=this.height/2){const p=this.toWorld(x,y);this.zoom=Math.max(1,Math.min(4,this.zoom*factor));this.scale=this.base*this.zoom;this.cx=p.x-(x-this.width/2)/this.scale;this.cy=p.y-(y-this.height/2)/this.scale;this.clamp();}
  pan(dx,dy){this.cx-=dx/this.scale;this.cy-=dy/this.scale;this.clamp();}
  visible(x,y,pad=60){return Math.abs(x-this.cx)<this.width/this.scale/2+pad&&Math.abs(y-this.cy)<this.height/this.scale/2+pad;}
  prop(items,prop,x,y,h,depth=y,facing=1){if(!this.visible(x,y,100))return;const r=M.props[prop];items.push({r,x,y,w:h*r.w/r.h,h,depth,facing});}
  draw(s){
   if(!this.width)return;this.drawFrames++;const key=[s.stage,this.scale,this.cx,this.cy,this.width,this.height].join(':');if(key!==this.backgroundKey){this.backgroundKey=key;this.backdrop.src=WACHA_ASSETS.images[WachaCore.STAGES[s.stage].image];this.backdrop.style.transform=`translate(${this.width/2-this.cx*this.scale}px,${this.height/2-this.cy*this.scale}px) scale(${this.scale})`;}
   const items=[],visible=[];this.rendered=0;
   if(s.life){for(const prop of s.life.props)this.prop(items,prop.prop,prop.x,prop.y,prop.height,prop.depth);for(const ride of s.life.rides)this.prop(items,ride.prop,ride.x,ride.y,ride.height,ride.y-23,ride.kind==='tram'?ride.driver.facing:1);}
   for(const p of s.people){if(!this.visible(p.x,p.y,65))continue;visible.push(p);this.rendered++;const anim=pose(p,s);let bob=anim.walking?Math.sin(p.phase*Math.PI*4)*.55:0,tilt=0;
    if(['dance','juggle','ribbon','mime','ballet','robot'].includes(p.activity)){tilt=Math.sin(p.phase*Math.PI*2)*.07;bob=Math.abs(Math.sin(p.phase*Math.PI*2))*2;}
    if(['play','hop','skip','basketball','football','float','pounce'].includes(p.activity))bob=Math.abs(Math.sin(p.phase*Math.PI*2))*4;
    const crop=p.activity==='ride'||p.activity==='delivery'?.78:1,r=rect(p.type,anim.frame);r.h*=crop;
    const height=51*(p.height||1),breathe=!anim.walking?1+Math.sin(s.elapsed*p.personalTempo*2+p.id)*.008:1;let y=p.y-bob;
    if(p.activity==='delivery'){this.prop(items,7,p.x,p.y+5,37,p.y-3,p.facing);y-=8;}
    items.push({r,type:p.type,frame:anim.frame,x:p.x,y,w:height*CW/CH,h:height*crop*breathe,depth:p.y,facing:p.facing,palette:p.type%M.palettes,mix:anim.mix,nextDelta:rect(p.type,anim.next).x-r.x,nextDeltaY:rect(p.type,anim.next).y-r.y,tilt});
   }
   items.sort((a,b)=>a.depth-b.depth);this.batch.draw(items,this);this.effects(s,visible);
  }
  effects(s,people){const c=this.ctx;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,this.overlay.width,this.overlay.height);const d=this.dpr;c.setTransform(this.scale*d,0,0,this.scale*d,(this.width/2-this.cx*this.scale)*d,(this.height/2-this.cy*this.scale)*d);
   for(const p of people){
    if(p.activity==='fishing'){
     const st=s.life.fishing[p.station],dx=st.waterX-p.x,dy=st.waterY-p.y,len=Math.hypot(dx,dy)||1,reach=Math.min(65,len),wx=p.x+dx/len*reach,wy=p.y+dy/len*reach;const reel=p.fishUntil>s.elapsed;
     c.strokeStyle='#7f6541';c.lineWidth=1.8;c.beginPath();c.moveTo(p.x+5*p.facing,p.y-17);c.lineTo(p.x+22*p.facing,p.y-(reel?49:39));c.stroke();c.strokeStyle='#f8f4dccc';c.lineWidth=.7;c.beginPath();c.moveTo(p.x+22*p.facing,p.y-(reel?49:39));c.quadraticCurveTo(wx,p.y-15,wx,wy+Math.sin(s.elapsed*3+p.id)*1.5);c.stroke();c.fillStyle='#ed8065';c.beginPath();c.arc(wx,wy,2,0,Math.PI*2);c.fill();
     if(reel){c.fillStyle='#82bfc0';c.beginPath();c.ellipse(wx,wy-12-Math.abs(Math.sin(s.elapsed*5))*10,5,2.5,-.5,0,Math.PI*2);c.fill();}
    }
    if(p.activity==='play'){const t=s.elapsed*2+p.id;c.fillStyle=['#ec8c6f','#eac867','#80bbae'][p.id%3];c.beginPath();c.arc(p.x+Math.sin(t)*17,p.y+6-Math.abs(Math.cos(t))*14,4,0,Math.PI*2);c.fill();}
    if(p.activity==='eat'){c.fillStyle='#ce996b';c.beginPath();c.moveTo(p.x+9*p.facing,p.y-12);c.lineTo(p.x+6*p.facing,p.y-21);c.lineTo(p.x+12*p.facing,p.y-21);c.fill();c.fillStyle='#f3bad1';c.beginPath();c.arc(p.x+9*p.facing,p.y-22,4,0,Math.PI*2);c.fill();}
    if(p.activity==='rest'){c.fillStyle='#99aaa9';c.fillRect(p.x+3,p.y-17,10,7);c.strokeStyle='#fffbe7';c.lineWidth=.8;c.beginPath();c.moveTo(p.x+8,p.y-17);c.lineTo(p.x+8,p.y-10);c.stroke();}
    if(p.inventory==='bag'&&p.activity!=='ride'){c.fillStyle='#cfab72';c.fillRect(p.x+9*p.facing-3,p.y-11,7,9);c.strokeStyle='#8c6b42';c.lineWidth=.7;c.strokeRect(p.x+9*p.facing-2,p.y-14,5,4);}

   }
   this.ambient(s,c);
   if(s.hint&&s.status==='playing'){c.strokeStyle='#fff7b5';c.lineWidth=4;c.setLineDash([12,8]);c.beginPath();c.ellipse(s.hint.x,s.hint.y,155,105,0,0,Math.PI*2);c.stroke();c.setLineDash([]);}
   if(s.lastHit&&s.elapsed-s.lastHit.at<.75){const p=s.people[s.lastHit.id];c.strokeStyle=p.id===s.targetId?'#fce99c':'#d45646';c.lineWidth=3;c.beginPath();c.arc(p.x,p.y-18,23,0,Math.PI*2);c.stroke();}
   if(s.status==='won'||s.status==='lost'){const p=s.people[s.targetId];c.strokeStyle='#fff9b6';c.lineWidth=4;c.beginPath();c.arc(p.x,p.y-18,30,0,Math.PI*2);c.stroke();}
  }
  ambient(s,c){const t=s.elapsed,night=s.stage===6;
   // Soft drifting cloud shadows pass across the map; each layer has its own wind.
   for(let i=0;i<7;i++){const x=((i*281+t*(2.4+i*.31)+s.seed%170)%2110)-180,y=75+(i*149)%800+Math.sin(t*.017+i)*12;if(!this.visible(x,y,180))continue;c.save();c.translate(x,y);c.scale(1.7,.58);c.fillStyle=night?'#bcbff210':'#ffffff35';c.beginPath();c.ellipse(0,0,58,22,0,0,Math.PI*2);c.ellipse(-40,7,36,18,0,0,Math.PI*2);c.ellipse(36,5,43,24,0,0,Math.PI*2);c.fill();c.restore();}
   for(let i=0;i<24;i++){const x=(i*197+65+s.seed%59)%1690+Math.sin(t*.22+i)*15+t%30*.15,y=1040-((i*87+t*(3.8+i%6))%1170);if(!this.visible(x,y,30))continue;c.strokeStyle='#9c887d88';c.lineWidth=.65;c.beginPath();c.moveTo(x,y+5);c.bezierCurveTo(x+9,y+20,x-7,y+29,x+Math.sin(t+i)*3,y+38);c.stroke();c.fillStyle=['#eaa393d9','#f0c76bdd','#89c8bfdc','#b6a4d7da'][i%4];c.beginPath();c.ellipse(x,y,7,9,Math.sin(t*.4+i)*.15,0,Math.PI*2);c.fill();c.fillStyle='#ffffff66';c.beginPath();c.ellipse(x-2,y-3,1.6,3,.3,0,Math.PI*2);c.fill();}
   for(let i=0;i<16;i++){const dir=i%2?1:-1,x=((i*137+t*(19+i%5*3)*dir)%1872+1872)%1872-100,y=60+(i*71)%750+Math.sin(t*.37+i)*26;if(!this.visible(x,y,30))continue;const flap=Math.sin(t*(5+i%3)+i)*7;c.strokeStyle=night?'#e7e8e8b0':'#ffffffed';c.lineWidth=3;c.beginPath();c.moveTo(x-11,y+flap);c.quadraticCurveTo(x-5,y-3,x,y+2);c.quadraticCurveTo(x+6,y-3,x+11,y+flap);c.stroke();c.strokeStyle='#667c7ec9';c.lineWidth=.7;c.stroke();}
   for(let i=0;i<18;i++){const x=(i*109+117)%1672+Math.sin(t*.63+i)*20,y=(i*83+150)%880+Math.sin(t*.81+i*2)*14;if(!this.visible(x,y,15))continue;const flap=Math.abs(Math.sin(t*10+i))*3+.5;c.fillStyle=night?'#fff2a5aa':['#f6d56e','#e9a8b3','#a8cfee'][i%3];c.beginPath();c.ellipse(x-2,y,flap,2.5,.6,0,Math.PI*2);c.ellipse(x+2,y,flap,2.5,-.6,0,Math.PI*2);c.fill();}
   for(const p of s.people){if(!this.visible(p.x,p.y,35))continue;if(p.activity==='bubbles'){for(let i=0;i<3;i++){const age=(t*.7+i*.31+p.id*.2)%1,x=p.x+age*26,y=p.y-25-age*38;c.strokeStyle='#a8dada99';c.lineWidth=.7;c.beginPath();c.arc(x,y,3+age*4,0,Math.PI*2);c.stroke();}}}
  }
  photo(s,area){
   const c=document.createElement('canvas'),d=this.dpr||1;c.width=Math.max(1,Math.round(area.w*this.scale*d));c.height=Math.max(1,Math.round(area.h*this.scale*d));const x=c.getContext('2d'),scale=this.scale*d;
   x.setTransform(scale,0,0,scale,-area.x*scale,-area.y*scale);
   x.drawImage(images[WachaCore.STAGES[s.stage].image],0,0,1672,941);
   const items=[];
   if(s.life){for(const prop of s.life.props)this.prop(items,prop.prop,prop.x,prop.y,prop.height,prop.depth);for(const ride of s.life.rides)this.prop(items,ride.prop,ride.x,ride.y,ride.height,ride.y-23,ride.kind==='tram'?ride.driver.facing:1);}
   const p=s.people[s.targetId],anim=pose(p,s),height=51*p.height,crop=p.activity==='ride'||p.activity==='delivery'?.78:1;
   items.push({type:p.type,frame:anim.frame,x:p.x,y:p.y,h:height,crop,facing:p.facing,depth:p.y});
   for(const item of items.sort((a,b)=>a.depth-b.depth)){if(item.type!==undefined)sprite(x,item.type,item.frame,item.x,item.y,item.h,item.facing,item.crop);else{x.save();x.translate(item.x,item.y);x.scale(item.facing||1,1);x.drawImage(images['crowd-atlas'],item.r.x,item.r.y,item.r.w,item.r.h,-item.w/2,-item.h,item.w,item.h);x.restore();}}
   this.ambient({...s,people:[p]},x);return c;
  }
  hit(s,x,y){const p=this.toWorld(x,y),hits=s.people.filter(a=>Math.abs(a.x-p.x)<17*(a.height||1)&&p.y>a.y-43*(a.height||1)&&p.y<a.y+3);if(hits.some(a=>a.id===s.targetId))return s.targetId;hits.sort((a,b)=>Math.hypot(a.x-p.x,a.y-18-p.y)-Math.hypot(b.x-p.x,b.y-18-p.y));return hits.length?hits[0].id:null;}
 }
 return{init,images,portrait,sprite,World,spriteCount:M.typeCount,frameCount:15};
})();
