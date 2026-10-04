window.Wacha24Art=(()=>{
 'use strict';
 window.Wacha24Images=window.Wacha24Images||{};
 const loaded=new Map(),pending=new Map(),portraits=new Map(),emptyStaticItems=[],designs=new Map(WACHA24_DATA.characters.map(c=>[c.id,c]));
 async function load(key){if(loaded.has(key))return loaded.get(key);if(pending.has(key))return pending.get(key);const promise=(async()=>{
  if(!Wacha24Images[key])await new Promise((resolve,reject)=>{const tag=document.createElement('script');tag.src='images/'+encodeURIComponent(key)+'.js';tag.onload=()=>{tag.remove();resolve();};tag.onerror=()=>{tag.remove();reject(Error('画像を読めません: '+key));};document.head.append(tag);});
  const im=new Image();im.src=Wacha24Images[key];await im.decode();loaded.set(key,im);delete Wacha24Images[key];return im;
 })();pending.set(key,promise);try{return await promise;}finally{pending.delete(key);}}
 async function prepare(s,progress=()=>{}){
  const selected=new Set(s.people.map(p=>p.design)),groups=new Map();for(const id of selected){const d=designs.get(id);if(!groups.has(d.image))groups.set(d.image,[]);groups.get(d.image).push(d);}
  for(const [id,value] of portraits)if(!selected.has(id)){value.image.close?.();portraits.delete(id);}
  const scenery=new Set([s.definition.background,s.definition.setImage,...(s.definition.backgroundTiles||[]).map(t=>t.image)]);for(const key of loaded.keys())if(!scenery.has(key))loaded.delete(key);
  let count=0;const total=groups.size+scenery.size;for(const key of scenery){await load(key);progress(++count,total);}
  const work=[...groups];await Promise.all(Array.from({length:4},async()=>{while(work.length){const [key,rows]=work.shift(),missing=rows.filter(d=>!portraits.has(d.id));if(missing.length){const im=await load(key);
    for(const d of missing){const size=d.frames[0].w,strip=document.createElement('canvas');strip.width=size*d.frames.length;strip.height=size;const ctx=strip.getContext('2d');d.frames.forEach((f,i)=>ctx.drawImage(im,f.x,f.y,f.w,f.h,i*size,0,size,size));const pixels=ctx.getImageData(0,0,strip.width,strip.height).data,mask=new Uint8Array(d.frames.length*24*24);for(let pose=0;pose<d.frames.length;pose++)for(let y=0;y<24;y++)for(let x=0;x<24;x++){const sx=pose*size+Math.min(size-1,Math.floor((x+.5)*size/24)),sy=Math.min(size-1,Math.floor((y+.5)*size/24));mask[pose*576+y*24+x]=pixels[(sy*strip.width+sx)*4+3];}const compact=await createImageBitmap(strip);portraits.set(d.id,{image:compact,size,mask});strip.width=strip.height=1;}
    loaded.delete(key);
   }progress(++count,total);}}));
 }
 function frame(p){const d=designs.get(p.design),moving=['walking','controlled','chase'].includes(p.activity)||p.yielding>0;if(p.activity==='riding')return 0;if(!moving&&p.behavior?.requiresSite&&p.station===null)return 0;return d.legacy?(d.base<16?Math.floor(p.phase*15)%15:(moving?0:10)+Math.floor(p.phase*5)%5):(moving?0:4)+Math.floor(p.phase*4)%4;}
 function sprite(ctx,p,x=p.x,y=p.y,height=46*p.height,pose=frame(p),fullBody=false){
  const d=designs.get(p.design);if(!d)return;const packed=portraits.get(p.design),im=packed?.image||loaded.get(d.image);if(!im)return;const f=packed?{x:pose*packed.size,y:0,w:packed.size,h:packed.size}:d.frames[pose],crop=p.activity==='riding'&&!fullBody?.75:1;ctx.save();ctx.translate(x,y);ctx.scale(p.facing||1,1);ctx.drawImage(im,f.x,f.y,f.w,f.h*crop,-height/2,-height*crop,height,height*crop);ctx.restore();
 }
 function portrait(canvas,p){const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);sprite(c,{...p,facing:1},canvas.width/2,canvas.height-4,Math.min(canvas.width,canvas.height)-8);}
 function setSprite(ctx,key,index,x,y,h=90,crop=null){const im=loaded.get(key);if(!im)return;const cell=192,col=index%8,row=Math.floor(index/8);if(crop){const from=cell*crop;ctx.drawImage(im,col*cell,row*cell+from,cell,cell-from,x-h/2,y-h+h*crop,h,h*(1-crop));}else ctx.drawImage(im,col*cell,row*cell,cell,cell,x-h/2,y-h,h,h);}
 class World{
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.width=0;this.height=0;this.cx=836;this.cy=470;this.zoom=1;this.scale=1;this.s=null;this.visibleCount=0;this.lowEnvironment=false;this.runnerView=false;this.staticCache=null;this.resize();}
  resize(){const r=this.canvas.getBoundingClientRect();this.width=Math.max(1,r.width);this.height=Math.max(1,r.height);this.dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);this.ctx.imageSmoothingEnabled=true;this.ctx.imageSmoothingQuality='high';this.base=Math.max(this.width/1672,this.height/941);this.clamp();}
  fit(s=this.s){this.s=s;this.zoom=1;this.cx=(s?.width||1672)/2;this.cy=(s?.height||941)/2;this.clamp();}
  clamp(){this.scale=(this.base||1)*this.zoom;const w=this.s?.width||1672,h=this.s?.height||941,vw=this.width/this.scale/2,vh=this.height/this.scale/2;this.cx=vw>w/2?w/2:Math.max(vw,Math.min(w-vw,this.cx));this.cy=vh>h/2?h/2:Math.max(vh,Math.min(h-vh,this.cy));}
  toWorld(x,y){return{x:(x-this.width/2)/this.scale+this.cx,y:(y-this.height/2)/this.scale+this.cy};}
  toScreen(x,y){return{x:(x-this.cx)*this.scale+this.width/2,y:(y-this.cy)*this.scale+this.height/2};}
  pan(dx,dy){this.cx-=dx/this.scale;this.cy-=dy/this.scale;this.clamp();}
  zoomAt(factor,x=this.width/2,y=this.height/2){const p=this.toWorld(x,y);this.zoom=Math.max(1,Math.min(4,this.zoom*factor));this.scale=this.base*this.zoom;this.cx=p.x-(x-this.width/2)/this.scale;this.cy=p.y-(y-this.height/2)/this.scale;this.clamp();}
  visible(x,y,pad=100){return Math.abs(x-this.cx)<this.width/this.scale/2+pad&&Math.abs(y-this.cy)<this.height/this.scale/2+pad;}
  ensureStaticCache(s){
   const definition=s.definition,zones=definition.foregroundZones||emptyStaticItems,tiles=definition.backgroundTiles||emptyStaticItems,width=this.canvas.width,height=this.canvas.height;
   const key=[definition,s.stage,s.width,s.height,width,height,this.width,this.height,this.dpr,this.scale,this.zoom,this.cx,this.cy,zones,tiles,loaded.get(definition.background),...tiles.map(tile=>loaded.get(tile.image))];
   const previous=this.staticCache;if(previous&&previous.key.length===key.length&&key.every((value,i)=>Object.is(value,previous.key[i])))return previous;
   const cache=previous||{background:document.createElement('canvas'),foregrounds:new Map(),builds:0};
   const prepareCanvas=(canvas,w,h,opaque=false)=>{if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;const c=canvas.getContext('2d',opaque?{alpha:false}:undefined);c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,w,h);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';return c;};
   const k=this.scale*this.dpr,tx=(this.width/2-this.cx*this.scale)*this.dpr,ty=(this.height/2-this.cy*this.scale)*this.dpr;
   const c=prepareCanvas(cache.background,width,height,true);c.fillStyle='#ede6d5';c.fillRect(0,0,width,height);c.setTransform(k,0,0,k,tx,ty);this.background(c,s,false);
   const foregrounds=new Map();for(const zone of zones){const polygon=zone.polygon||zone;if(!polygon?.length)continue;
    const xs=polygon.map(p=>p[0]*k+tx),ys=polygon.map(p=>p[1]*k+ty),x=Math.max(0,Math.floor(Math.min(...xs))-2),y=Math.max(0,Math.floor(Math.min(...ys))-2),right=Math.min(width,Math.ceil(Math.max(...xs))+2),bottom=Math.min(height,Math.ceil(Math.max(...ys))+2);
    if(right<=x||bottom<=y)continue;
    const entry=cache.foregrounds.get(zone)||{canvas:document.createElement('canvas')};entry.x=x;entry.y=y;const f=prepareCanvas(entry.canvas,right-x,bottom-y);
    // Keep the original image/clip compositing order, including antialiasing at
    // tile and polygon edges. Crop only to integer device-pixel bounds.
    f.save();f.setTransform(k,0,0,k,tx-x,ty-y);f.beginPath();polygon.forEach(([px,py],i)=>i?f.lineTo(px,py):f.moveTo(px,py));f.closePath();f.clip();this.background(f,s,false);f.restore();foregrounds.set(zone,entry);
   }
   for(const [zone,entry] of cache.foregrounds)if(!foregrounds.has(zone))entry.canvas.width=entry.canvas.height=1;
   cache.foregrounds=foregrounds;cache.key=key;cache.builds++;this.staticCache=cache;return cache;
  }
  blitStatic(ctx,canvas,x=0,y=0){ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;ctx.drawImage(canvas,x,y);ctx.restore();}
  background(ctx,s,photo=false){const bg=loaded.get(s.definition.background);if(bg)ctx.drawImage(bg,0,0,s.width,s.height);for(const tile of s.definition.backgroundTiles||[]){if(!photo&&(tile.x+tile.w<this.cx-this.width/this.scale/2||tile.x>this.cx+this.width/this.scale/2||tile.y+tile.h<this.cy-this.height/this.scale/2||tile.y>this.cy+this.height/this.scale/2))continue;const im=loaded.get(tile.image);if(im)ctx.drawImage(im,tile.x,tile.y,tile.w,tile.h);}}
  foreground(ctx,s,photo=false,zones=s.definition.foregroundZones||[],cache=null){for(const zone of zones){if(cache){const entry=cache.foregrounds.get(zone);if(entry)this.blitStatic(ctx,entry.canvas,entry.x,entry.y);continue;}const polygon=zone.polygon||zone;if(!polygon?.length)continue;ctx.save();ctx.beginPath();polygon.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();this.background(ctx,s,photo);ctx.restore();}}
  scene(ctx,s,photo=null){const cache=!photo&&ctx===this.ctx?this.ensureStaticCache(s):null;if(cache)this.blitStatic(ctx,cache.background);else this.background(ctx,s,!!photo);const people=photo?[]:s.people;const items=[];this.visibleCount=0;
   for(const zone of s.definition.foregroundZones||[])if(Number.isFinite(zone.depthY))items.push({kind:'foreground',zone,y:zone.depthY});
   for(const fixture of s.definition.fixtures||s.sites){if(fixture.drawFixture===false)continue;if(!photo&&!this.visible(fixture.x,fixture.y,160))continue;const site={...fixture,fixture:fixture.index??fixture.fixture};items.push({kind:'site',site,y:site.y-14});if(s.sites.some(p=>p.fixture===fixture.id&&p.occupant!==null))items.push({kind:'front',site,y:site.y+1});}
   for(const ride of s.rides||[]){if(!photo&&!this.visible(ride.x,ride.y,160))continue;items.push({kind:'ride',ride,y:ride.y-20+(ride.altitude>1?10000:0)});}
   for(const p of people){if(!photo&&!this.visible(p.x,p.y,70))continue;this.visibleCount++;const site=s.sites[p.station??p.transitSite],fixture=site&&s.definition.fixtures?.[site.fixture];const ride=p.ride!==null?s.rides?.[p.ride]:null;items.push({kind:'person',p,y:ride?.altitude>1?ride.y-19+10000:fixture&&fixture.drawFixture!==false?Math.max(p.y,fixture.y-5):p.y});}
   items.sort((a,b)=>a.y-b.y);for(const item of items){if(item.kind==='person'){const p=item.p;let y=p.y;if(['dance','acting'].includes(p.activity))y-=Math.sin(p.phase*Math.PI*2)*.8;const drawP={...p,yielding:p.yielding>s.elapsed?1:0};sprite(ctx,drawP,p.x,y);}
    else if(item.kind==='site')setSprite(ctx,s.definition.setImage,item.site.fixture,item.site.x,item.site.y,item.site.height);
    else if(item.kind==='front')setSprite(ctx,s.definition.setImage,item.site.fixture,item.site.x,item.site.y,item.site.height,.79);
    else if(item.kind==='foreground')this.foreground(ctx,s,!!photo,[item.zone],cache);
    else if(item.kind==='ride')setSprite(ctx,s.definition.setImage,8+item.ride.id*2+Math.floor(s.elapsed*3)%2,item.ride.x,item.ride.y-(item.ride.altitude||0),120);
   }
   this.foreground(ctx,s,!!photo,(s.definition.foregroundZones||[]).filter(zone=>!Number.isFinite(zone.depthY)),cache);this.ambient(ctx,s);
   // A developed photograph reveals the complete captured pose above every obstruction.
   if(photo){const p=photo.target,drawP={...p,yielding:p.yielding>s.elapsed?1:0},y=p.y-(['dance','acting'].includes(p.activity)?Math.sin(p.phase*Math.PI*2)*.8:0);sprite(ctx,drawP,p.x,y,46*p.height,frame(drawP),true);}
  }
  ambient(ctx,s){const t=s.elapsed;for(let kind=0;kind<8;kind++){const name=s.definition.environment[kind]||'',flying=/鳥|ハト|カモメ|スズメ|鳩|アジサシ|蝶|蜂|蛍|ミツバチ/.test(name),cloud=/雲|霧/.test(name),balloon=/風船/.test(name),water=/波|水面|反射|水流|航跡|海藻|クラゲ|魚群|海亀|浮き/.test(name),particle=/雪片|花びら|綿毛|紙吹雪/.test(name),n=particle&&!this.lowEnvironment?8:1;
   for(let k=0;k<n;k++){let x=((kind*213+k*71+140+s.seed%60)%(s.width-100))+50,y=((kind*119+k*97+110)%(s.height-150))+50;
    if(flying){x=((x+t*(12+kind*2))%(s.width+100))-50;y+=Math.sin(t*.5+kind)*26;}
    else if(cloud){x=((x+t*2)%(s.width+150))-75;y+=Math.sin(t*.025+kind)*12;}
    else if(balloon){y=s.height+60-((y+t*7)%(s.height+150));x+=Math.sin(t*.2+kind)*14;}
    else if(water){const anchor=s.definition.water||[.5,.88];x=anchor[0]*s.width+(kind-4)*16;y=anchor[1]*s.height;}
    else if(particle){y=(y+t*12)%(s.height+40);x+=Math.sin(t*.3+k)*12;}
    else{const site=s.sites[kind%s.sites.length];x=site.x+28;y=site.y-35;}
    if(!this.visible(x,y,160))continue;const frame=Math.floor(t*(flying?5:1.5)+kind)%2,h=cloud?145:balloon?40:flying?30:particle?15:water?52:45;ctx.save();if(cloud)ctx.globalAlpha=.3;setSprite(ctx,s.definition.setImage,16+kind*2+frame,x,y,h);ctx.restore();
   }
  }}
  draw(s){this.s=s;const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#ede6d5';c.fillRect(0,0,this.width,this.height);c.setTransform(this.scale*this.dpr,0,0,this.scale*this.dpr,(this.width/2-this.cx*this.scale)*this.dpr,(this.height/2-this.cy*this.scale)*this.dpr);this.scene(c,s);
   if(this.runnerView){const p=s.people[s.targetId];c.save();c.strokeStyle='#fff7dc';c.lineWidth=5;c.setLineDash([4,3]);c.beginPath();c.ellipse(p.x,p.y-3,20*p.height,7*p.height,0,0,Math.PI*2);c.stroke();c.strokeStyle='#305d47';c.lineWidth=2;c.stroke();c.restore();}
   if(s.lastHit&&s.elapsed-s.lastHit.at<.65){const p=s.people[s.lastHit.id];c.strokeStyle=p.photographer?'#f5d676':p.id===s.targetId?'#cbe7a5':'#de574b';c.lineWidth=3;c.beginPath();c.arc(p.x,p.y-22,28,0,Math.PI*2);c.stroke();}}
  hit(s,x,y){const point=this.toWorld(x,y),hits=s.people.filter(p=>Math.abs(p.x-point.x)<23*p.height&&point.y>p.y-46*p.height&&point.y<p.y+2);const depth=p=>{const site=s.sites[p.station??p.transitSite],fixture=site&&s.definition.fixtures?.[site.fixture];const ride=p.ride!==null?s.rides?.[p.ride]:null;return ride?.altitude>1?ride.y-19+10000:fixture&&fixture.drawFixture!==false?Math.max(p.y,fixture.y-5):p.y;};hits.sort((a,b)=>depth(b)-depth(a));for(const p of hits){const h=46*p.height,crop=p.activity==='riding'?.75:1,py=p.y-(['dance','acting'].includes(p.activity)?Math.sin(p.phase*Math.PI*2)*.8:0),u=Math.floor(((point.x-p.x)*(p.facing||1)/h+.5)*24),v=Math.floor((point.y-py+h*crop)/h*24),pose=frame({...p,yielding:p.yielding>s.elapsed?1:0}),mask=portraits.get(p.design)?.mask;if(u>=0&&u<24&&v>=0&&v<24*crop&&(!mask||mask[pose*576+v*24+u]>80))return p.id;}return null;}
  photo(s,record){const canvas=document.createElement('canvas'),r=record.rect,scale=this.scale*this.dpr;canvas.width=Math.max(1,Math.round(r.w*scale));canvas.height=Math.max(1,Math.round(r.h*scale));const c=canvas.getContext('2d');c.setTransform(scale,0,0,scale,-r.x*scale,-r.y*scale);this.scene(c,{...s,elapsed:record.takenAt,events:record.eventSnapshot},record);return canvas;}
 }
 return{load,prepare,portrait,sprite,World,loaded,designs};
})();
