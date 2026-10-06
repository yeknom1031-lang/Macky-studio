export const DISC_FINISHES = Object.freeze({gloss:'つやあり',matte:'マット',metal:'メタリック'});
export const DISC_PATTERNS = Object.freeze({plain:'無地',rings:'同心円',rays:'光のすじ',waves:'波模様'});
export const DISC_EMBLEMS = Object.freeze({none:'なし',star:'星',moon:'月',diamond:'ダイヤ',flower:'花'});
export const DISC_SHAPES = Object.freeze({round:'丸',square:'角丸四角',hexagon:'六角形',octagon:'八角形',star:'星型',heart:'ハート',flower:'花型'});
export const DISC_FONTS = Object.freeze({sans:'すっきり',serif:'クラシカル',rounded:'まる文字'});
export const DISC_TEXT_POSITIONS = Object.freeze({center:'中央',top:'上',bottom:'下'});
export const DISC_COLOR_MODES = Object.freeze({solid:'単色',gradient:'グラデーション'});
export const SEAT_COLORS = Object.freeze({red:'#d82b36',blue:'#147ad5',yellow:'#e9b72c',green:'#0db76c',black:'#24282b',white:'#edece4'});
export const DISC_STAMPS = Object.freeze({star:'星',heart:'ハート',moon:'月',diamond:'ダイヤ',flower:'花',round:'丸',hexagon:'六角形',sparkle:'きらめき'});
export const DISC_LAYER_LIMIT = 16;
export const DISC_FONT_STACKS = Object.freeze({sans:'"Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif',serif:'"Yu Mincho", Georgia, serif',rounded:'"Hiragino Maru Gothic ProN", "Arial Rounded MT Bold", sans-serif',mono:'"SFMono-Regular", Menlo, monospace',cursive:'"Snell Roundhand", "Segoe Script", cursive',impact:'Impact, "Arial Black", sans-serif'});
export function normalizeDiscLayer(raw={}) {
  const v=raw&&typeof raw==='object'?raw:{};
  const num=(k,min,max,d)=>Number.isFinite(v[k])?Math.round(Math.min(max,Math.max(min,v[k]))):d;
  const hex=(k,d)=>typeof v[k]==='string'&&/^#[0-9a-f]{6}$/i.test(v[k])?v[k].toLowerCase():d;
  return {type:v.type==='stamp'?'stamp':'text',text:cleanDiscText(v.text,24),stamp:typeof v.stamp==='string'&&Object.hasOwn(DISC_STAMPS,v.stamp)?v.stamp:'star',
    x:num('x',0,100,50),y:num('y',0,100,50),rotation:num('rotation',-180,180,0),scaleX:num('scaleX',25,250,100),scaleY:num('scaleY',25,250,100),
    color:hex('color','#fff4dd'),font:typeof v.font==='string'&&Object.hasOwn(DISC_FONT_STACKS,v.font)?v.font:'sans',opacity:num('opacity',10,100,100)};
}
// Pointer deltas use fractions of the 256px shared texture, so zoom and screen size agree.
export function transformDiscLayer(raw,dx,dy,resize=false){
 const layer=normalizeDiscLayer(raw),angle=layer.rotation*Math.PI/180;
 const localX=dx*Math.cos(angle)+dy*Math.sin(angle),localY=-dx*Math.sin(angle)+dy*Math.cos(angle);
 const changes=resize?{scaleX:layer.scaleX+localX*512/(layer.type==='text'?140:64)*100,scaleY:layer.scaleY+localY*512/64*100}:{x:layer.x+dx*256/1.8,y:layer.y+dy*256/1.7};
 return normalizeDiscLayer({...layer,...changes});
}
let discTextSegmenter;
export function cleanDiscText(value,limit=8) {
  if(typeof value!=='string')return '';
  // Keep ordinary multilingual text/emoji, never controls or bidi overrides.
  const clean=value.slice(0,256).normalize('NFC').replace(/[\p{Cc}\u200b\u200e\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gu,'').replace(/\s+/gu,' ').trim();
  if(!clean)return '';
  const bounded=[...clean].slice(0,64).join('');
  const letters=typeof Intl.Segmenter==='function'?[...(discTextSegmenter??=new Intl.Segmenter(undefined,{granularity:'grapheme'})).segment(bounded)].map(s=>s.segment):[...bounded];
  return letters.slice(0,limit).join('');
}
export function normalizeCustomDisc(raw) {
  const value=raw&&typeof raw==='object'?raw:{};
  const hex=(key,fallback)=>typeof value[key]==='string'&&/^#[0-9a-f]{6}$/i.test(value[key])?value[key].toLowerCase():fallback;
  const choice=(key,options,fallback)=>typeof value[key]==='string'&&Object.hasOwn(options,value[key])?value[key]:fallback;
  const number=(key,min,max,fallback)=>Number.isFinite(value[key])?Math.round(Math.min(max,Math.max(min,value[key]))):fallback;
  return {enabled:value.enabled===true,color:hex('color','#9354ce'),
    finish:choice('finish',DISC_FINISHES,'gloss'),pattern:choice('pattern',DISC_PATTERNS,'plain'),emblem:choice('emblem',DISC_EMBLEMS,'none'),
    shape:choice('shape',DISC_SHAPES,'round'),colorMode:choice('colorMode',DISC_COLOR_MODES,'solid'),secondaryColor:hex('secondaryColor','#203c65'),
    accentColor:hex('accentColor','#f6e2af'),edgeColor:hex('edgeColor','#d6ba76'),edgeWidth:number('edgeWidth',0,8,0),
    text:cleanDiscText(value.text),textColor:hex('textColor','#fff4dd'),textFont:choice('textFont',DISC_FONTS,'sans'),
    textPosition:choice('textPosition',DISC_TEXT_POSITIONS,'bottom'),textSize:number('textSize',18,48,32),
    gradientAngle:number('gradientAngle',0,360,135),layers:Array.isArray(value.layers)?value.layers.slice(0,DISC_LAYER_LIMIT).map(normalizeDiscLayer):[]};
}
export function matchCosmetics(colors,mode,human,customDisc,seats=[]) {
  const designs={};
  const own=normalizeCustomDisc(customDisc);
  if(mode==='solo'&&colors.length===4&&own.enabled){
    const rgb=hex=>hex.slice(1).match(/../g).map(v=>parseInt(v,16)),base=rgb(own.color);
    const options=['red','blue','yellow','green'].sort((a,b)=>{
      const distance=id=>rgb(SEAT_COLORS[id]).reduce((sum,v,i)=>sum+(v-base[i])**2,0);
      return distance(b)-distance(a);
    }).slice(0,3);
    const labels={red:'赤',blue:'青',yellow:'黄',green:'緑'};
    colors=colors.map((color,i)=>{if(i===human)return color;const id=options.splice(Math.max(0,options.indexOf(color.id)),1)[0];return {...color,id,name:labels[id]};});
  }
  const palette=colors.map((color,index)=>{
    const design=normalizeCustomDisc(mode==='online'?seats[index]?.customDisc:customDisc);
    if(!design.enabled||mode==='friends'||(mode!=='online'&&index!==human))return {...color};
    const id=`custom-${index}`;
    // Online and classic discs retain the assigned seat color, even for a custom design.
    const locked=mode==='online'||colors.length===2;
    designs[id]={...design,color:locked?SEAT_COLORS[color.id]:design.color,colorMode:locked?'solid':design.colorMode};
    return {...color,id,name:mode==='online'||colors.length===2?color.name:'マイコマ'};
  });
  return {colors:palette,designs};
}
// The same bounded silhouette is used for the face, thickness, clipping and stock.
export function traceDiscShape(ctx,shape='round',x=126,y=121,rx=107,ry=102) {
  ctx.beginPath();ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);
  if(shape==='square'){
    const r=.29;ctx.moveTo(-1+r,-1);ctx.lineTo(1-r,-1);ctx.quadraticCurveTo(1,-1,1,-1+r);ctx.lineTo(1,1-r);ctx.quadraticCurveTo(1,1,1-r,1);ctx.lineTo(-1+r,1);ctx.quadraticCurveTo(-1,1,-1,1-r);ctx.lineTo(-1,-1+r);ctx.quadraticCurveTo(-1,-1,-1+r,-1);
  }else if(shape==='heart'){
    ctx.moveTo(0,.97);ctx.bezierCurveTo(-.3,.68,-1,.12,-1,-.36);ctx.bezierCurveTo(-1,-1.02,-.28,-1.1,0,-.53);ctx.bezierCurveTo(.28,-1.1,1,-1.02,1,-.36);ctx.bezierCurveTo(1,.12,.3,.68,0,.97);
  }else if(['hexagon','octagon','star','flower'].includes(shape)){
    const count=shape==='hexagon'?6:shape==='octagon'?8:shape==='star'?10:120;
    for(let i=0;i<count;i++){const a=i*Math.PI*2/count-Math.PI/2,r=shape==='star'?(i%2?.64:1):shape==='flower'?.88+.12*Math.cos(i*Math.PI*12/count):1;const px=Math.cos(a)*r,py=Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}
  }else ctx.arc(0,0,1,0,Math.PI*2);
  ctx.closePath();ctx.restore();
}
// Decorative geometry stays inside the face. No uploaded image, markup, or per-disc DOM is needed.
export function drawDiscDecoration(ctx,design) {
  const {pattern,emblem,finish,shape,accentColor,text,textColor,textFont,textPosition,textSize}=normalizeCustomDisc(design);
  ctx.save();traceDiscShape(ctx,shape,126,121,99,94);ctx.clip();
  ctx.strokeStyle=accentColor+(finish==='metal'?'88':'66');ctx.lineWidth=2;
  if(pattern==='rings')for(const radius of [52,67,82]){ctx.beginPath();ctx.ellipse(126,121,radius,radius*.95,0,0,Math.PI*2);ctx.stroke();}
  if(pattern==='rays')for(let n=0;n<24;n++){const a=n*Math.PI/12;ctx.beginPath();ctx.moveTo(126+Math.cos(a)*48,121+Math.sin(a)*45);ctx.lineTo(126+Math.cos(a)*97,121+Math.sin(a)*92);ctx.stroke();}
  if(pattern==='waves')for(let y=55;y<215;y+=17){ctx.beginPath();ctx.moveTo(20,y);ctx.bezierCurveTo(80,y-32,160,y+32,234,y);ctx.stroke();}
  if(emblem!=='none') {
    ctx.save();ctx.translate(126,text?(textPosition==='center'?79:textPosition==='top'?139:107):121);if(text)ctx.scale(textPosition==='center'?.5:.65,textPosition==='center'?.5:.65);ctx.fillStyle=accentColor;ctx.strokeStyle='#624824aa';ctx.lineWidth=1.5;ctx.shadowColor='#0006';ctx.shadowBlur=3;ctx.shadowOffsetY=2;ctx.beginPath();
    if(emblem==='star')for(let n=0;n<10;n++){const a=n*Math.PI/5-Math.PI/2,r=n%2?17:37;n?ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r):ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);}
    if(emblem==='diamond'){ctx.moveTo(0,-37);ctx.lineTo(29,0);ctx.lineTo(0,37);ctx.lineTo(-29,0);}
    if(emblem==='moon'){ctx.arc(0,0,34,.35*Math.PI,1.65*Math.PI);ctx.bezierCurveTo(-9,-26,-9,26,Math.cos(.35*Math.PI)*34,Math.sin(.35*Math.PI)*34);}
    if(emblem==='flower')for(let n=0;n<=120;n++){const a=n*Math.PI/60,r=26+9*Math.cos(a*5);n?ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r):ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);}
    ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  }
  if(text){
    const fonts={sans:'"Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif',serif:'"Yu Mincho", Georgia, serif',rounded:'"Hiragino Maru Gothic ProN", "Arial Rounded MT Bold", sans-serif'};
    const inset=shape==='heart'||shape==='star',y=textPosition==='top'?(inset?96:72):textPosition==='bottom'?(inset?156:167):122;
    const maxWidth=shape==='star'?(textPosition==='center'?116:96):shape==='heart'&&textPosition!=='center'?110:132;
    ctx.font=`700 ${textPosition==='center'?textSize:Math.min(textSize,32)}px ${fonts[textFont]}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.lineWidth=2;ctx.strokeStyle='#15201899';ctx.fillStyle=textColor;
    ctx.strokeText(text,126,y,maxWidth);ctx.fillText(text,126,y,maxWidth);
  }
  for(const layer of normalizeCustomDisc(design).layers){
    ctx.save();ctx.translate(126+(layer.x-50)*1.8,121+(layer.y-50)*1.7);ctx.rotate(layer.rotation*Math.PI/180);ctx.scale(layer.scaleX/100,layer.scaleY/100);ctx.globalAlpha=layer.opacity/100;ctx.fillStyle=layer.color;
    if(layer.type==='text'){
      ctx.font=`700 32px ${DISC_FONT_STACKS[layer.font]}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(layer.text,0,0,140);
    }else{
      if(['star','heart','flower','round','hexagon'].includes(layer.stamp))traceDiscShape(ctx,layer.stamp,0,0,30,30);
      else {ctx.beginPath();if(layer.stamp==='moon'){ctx.arc(0,0,29,.35*Math.PI,1.65*Math.PI);ctx.bezierCurveTo(-8,-23,-8,23,Math.cos(.35*Math.PI)*29,Math.sin(.35*Math.PI)*29);}else{const narrow=layer.stamp==='sparkle'?8:0;ctx.moveTo(0,-30);ctx.lineTo(narrow||25,-narrow);ctx.lineTo(30,0);ctx.lineTo(narrow, narrow||0);ctx.lineTo(0,30);ctx.lineTo(-narrow,narrow);ctx.lineTo(-30,0);ctx.lineTo(-narrow,-narrow); }ctx.closePath();}
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}
