window.WachaArt=(()=>{
 'use strict';
 const images={},M=WACHA_ASSETS.atlas,CW=M.cw,CH=M.ch;
 const moving=new Set(['walk','going','tag','police','pursue','flee','delivery']);
 async function init(progress){let loaded=0;const entries=Object.entries(WACHA_ASSETS.images);await Promise.all(entries.map(([key,url])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[key]=im;progress(Math.round(++loaded/entries.length*M.typeCount));resolve();};im.onerror=()=>reject(Error('画像を読み込めません: '+key));im.src=url;})));}
 function rect(type,frame){return{x:(type%4)*CW*15+Math.max(0,Math.min(14,frame))*CW,y:Math.floor(type/4)*CH,w:CW,h:CH};}
 function sprite(ctx,type,frame,x,y,height=37,facing=1,crop=1){const r=rect(type,frame),w=height*CW/CH;ctx.save();ctx.translate(x,y);ctx.scale(facing,1);ctx.drawImage(images['crowd-atlas'],r.x,r.y,r.w,r.h*crop,-w/2,-height*crop,w,height*crop);ctx.restore();}
 function portrait(c,type,phase=0){const x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);sprite(x,type,Math.floor(phase*15)%15,c.width/2,c.height-4,c.height-8);}
 class Batch {
  constructor(canvas){
   this.gl=canvas.getContext('webgl2',{alpha:true,antialias:false,premultipliedAlpha:false,powerPreference:'low-power'});this.mode=this.gl?'webgl2':'canvas2d';this.data=new Float32Array(1600*10);
   if(!this.gl){this.ctx=canvas.getContext('2d');return;}
   const g=this.gl,vs=`#version 300 es
   precision highp float;
   layout(location=0) in vec2 corner;
   layout(location=1) in vec4 box;
   layout(location=2) in vec4 uvBox;
   layout(location=3) in vec2 extra;
   uniform vec2 resolution;
   uniform vec3 camera;
   out vec2 uv;out float opacity;
   void main(){vec2 p=box.xy+vec2((corner.x-.5)*box.z,(corner.y-1.)*box.w);vec2 pixel=(p-camera.xy)*camera.z+resolution*.5;gl_Position=vec4(pixel.x/resolution.x*2.-1.,1.-pixel.y/resolution.y*2.,0.,1.);uv=uvBox.xy+vec2(extra.x<0.?1.-corner.x:corner.x,corner.y)*uvBox.zw;opacity=extra.y;}`;
   const fs=`#version 300 es
   precision highp float;uniform sampler2D atlas;in vec2 uv;in float opacity;out vec4 color;
   void main(){color=texture(atlas,uv);color.a*=opacity;if(color.a<.015)discard;}`;
   const shader=(kind,src)=>{const sh=g.createShader(kind);g.shaderSource(sh,src);g.compileShader(sh);if(!g.getShaderParameter(sh,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(sh));return sh;};
   this.program=g.createProgram();g.attachShader(this.program,shader(g.VERTEX_SHADER,vs));g.attachShader(this.program,shader(g.FRAGMENT_SHADER,fs));g.linkProgram(this.program);if(!g.getProgramParameter(this.program,g.LINK_STATUS))throw Error(g.getProgramInfoLog(this.program));g.useProgram(this.program);
   const vertices=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,vertices);g.bufferData(g.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,1,1]),g.STATIC_DRAW);g.enableVertexAttribArray(0);g.vertexAttribPointer(0,2,g.FLOAT,false,0,0);
   this.buffer=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,this.buffer);g.bufferData(g.ARRAY_BUFFER,this.data.byteLength,g.DYNAMIC_DRAW);
   [[1,4,0],[2,4,16],[3,2,32]].forEach(([index,size,offset])=>{g.enableVertexAttribArray(index);g.vertexAttribPointer(index,size,g.FLOAT,false,40,offset);g.vertexAttribDivisor(index,1);});
   this.texture=g.createTexture();g.bindTexture(g.TEXTURE_2D,this.texture);g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,images['crowd-atlas']);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.uniform1i(g.getUniformLocation(this.program,'atlas'),0);
   this.resolution=g.getUniformLocation(this.program,'resolution');this.camera=g.getUniformLocation(this.program,'camera');g.enable(g.BLEND);g.blendFunc(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA);g.clearColor(0,0,0,0);
  }
  draw(items,view){
   if(!this.gl){const c=this.ctx;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,view.width,view.height);c.setTransform(view.scale,0,0,view.scale,view.width/2-view.cx*view.scale,view.height/2-view.cy*view.scale);for(const p of items){c.save();c.translate(p.x,p.y);c.scale(p.facing||1,1);c.drawImage(images['crowd-atlas'],p.r.x,p.r.y,p.r.w,p.r.h,-p.w/2,-p.h,p.w,p.h);c.restore();}return;}
   const g=this.gl;let i=0;for(const p of items){this.data[i++]=p.x;this.data[i++]=p.y;this.data[i++]=p.w;this.data[i++]=p.h;this.data[i++]=p.r.x/M.width;this.data[i++]=p.r.y/M.height;this.data[i++]=p.r.w/M.width;this.data[i++]=p.r.h/M.height;this.data[i++]=p.facing||1;this.data[i++]=1;}
   g.viewport(0,0,view.canvas.width,view.canvas.height);g.clear(g.COLOR_BUFFER_BIT);g.useProgram(this.program);g.uniform2f(this.resolution,view.width,view.height);g.uniform3f(this.camera,view.cx,view.cy,view.scale);g.bindBuffer(g.ARRAY_BUFFER,this.buffer);g.bufferSubData(g.ARRAY_BUFFER,0,this.data.subarray(0,i));g.drawArraysInstanced(g.TRIANGLE_STRIP,0,4,items.length);
  }
 }
 class World {
  constructor(c){this.canvas=c;this.batch=new Batch(c);this.overlay=document.querySelector('#life-overlay');this.ctx=this.overlay.getContext('2d');this.backdrop=document.querySelector('#world-backdrop');this.zoom=1;this.cx=836;this.cy=470.5;this.width=0;this.height=0;this.scale=1;this.rendered=0;this.drawFrames=0;this.backgroundKey='';this.bubbles=new Map();this.resize();}
  resize(){const r=this.canvas.getBoundingClientRect();if(!r.width||!r.height)return;this.width=r.width;this.height=r.height;this.canvas.width=Math.round(r.width);this.canvas.height=Math.round(r.height);this.overlay.width=this.canvas.width;this.overlay.height=this.canvas.height;this.base=Math.min(this.width/1672,this.height/941);this.clamp();this.backgroundKey='';}
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
   for(const p of s.people){if(!this.visible(p.x,p.y,40))continue;visible.push(p);this.rendered++;let frame=moving.has(p.activity)?Math.floor(p.phase*15):Math.floor(p.phase*4)+3;let bob=p.activity==='dance'?Math.abs(Math.sin(s.elapsed*5+p.id))*3:p.activity==='play'?Math.abs(Math.sin(s.elapsed*3+p.id))*2:0;let crop=p.activity==='ride'||p.activity==='delivery'?.76:1;const r=rect(p.type,frame);r.h*=crop;const height=37*crop;let y=p.y-bob;
    if(p.activity==='delivery'){this.prop(items,7,p.x,p.y+5,37,p.y-3,p.facing);y-=8;}
    items.push({r,x:p.x,y,w:37*CW/CH,h:height,depth:p.y,facing:p.facing});
   }
   items.sort((a,b)=>a.depth-b.depth);this.batch.draw(items,this);this.effects(s,visible);
  }
  bubble(text){if(this.bubbles.has(text))return this.bubbles.get(text);const c=document.createElement('canvas'),x=c.getContext('2d');x.font='11px sans-serif';c.width=Math.max(25,Math.ceil(x.measureText(text).width)+14);c.height=23;x.fillStyle='#fffdf0f5';x.strokeStyle='#8b8e7066';x.lineWidth=1;x.beginPath();x.roundRect(.5,.5,c.width-1,18,6);x.fill();x.stroke();x.beginPath();x.moveTo(9,17);x.lineTo(12,22);x.lineTo(15,17);x.fill();x.fillStyle='#547164';x.font='11px sans-serif';x.textAlign='center';x.fillText(text,c.width/2,13);this.bubbles.set(text,c);return c;}
  effects(s,people){const c=this.ctx;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,this.width,this.height);c.setTransform(this.scale,0,0,this.scale,this.width/2-this.cx*this.scale,this.height/2-this.cy*this.scale);
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
    let text=p.bubble;
    if(!text&&p.activity==='chat'&&(Math.floor(s.elapsed/2)+p.id)%3===0)text=['…','♪','♡'][p.id%3];
    if(!text&&p.activity==='music')text='♫';if(!text&&p.activity==='shopping')text='￥';if(!text&&p.activity==='pursue')text='！';
    if(text){if(this.zoom<1.4&&text.length>3)text=p.activity==='pursue'?'！':p.activity==='fishing'?'♪':'…';const b=this.bubble(text);c.drawImage(b,p.x-b.width/2,p.y-58-Math.sin(s.elapsed*2+p.id));}
   }
   if(s.hint&&s.status==='playing'){c.strokeStyle='#fff7b5';c.lineWidth=4;c.setLineDash([12,8]);c.beginPath();c.ellipse(s.hint.x,s.hint.y,155,105,0,0,Math.PI*2);c.stroke();c.setLineDash([]);}
   if(s.lastHit&&s.elapsed-s.lastHit.at<.75){const p=s.people[s.lastHit.id];c.strokeStyle=p.id===s.targetId?'#fce99c':'#d45646';c.lineWidth=3;c.beginPath();c.arc(p.x,p.y-18,23,0,Math.PI*2);c.stroke();}
   if(s.status==='won'||s.status==='lost'){const p=s.people[s.targetId];c.strokeStyle='#fff9b6';c.lineWidth=4;c.beginPath();c.arc(p.x,p.y-18,30,0,Math.PI*2);c.stroke();}
  }
  hit(s,x,y){const p=this.toWorld(x,y),hits=s.people.filter(a=>Math.abs(a.x-p.x)<13&&p.y>a.y-36&&p.y<a.y+3);if(hits.some(a=>a.id===s.targetId))return s.targetId;hits.sort((a,b)=>Math.hypot(a.x-p.x,a.y-18-p.y)-Math.hypot(b.x-p.x,b.y-18-p.y));return hits.length?hits[0].id:null;}
 }
 return{init,images,portrait,sprite,World,spriteCount:M.typeCount,frameCount:15};
})();
