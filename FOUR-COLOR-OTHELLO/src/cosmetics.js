export const DISC_FINISHES = Object.freeze({gloss:'つやあり',matte:'マット',metal:'メタリック'});
export const DISC_PATTERNS = Object.freeze({plain:'無地',rings:'同心円',rays:'光のすじ',waves:'波模様'});
export const DISC_EMBLEMS = Object.freeze({none:'なし',star:'星',moon:'月',diamond:'ダイヤ',flower:'花'});
export const SEAT_COLORS = Object.freeze({red:'#d82b36',blue:'#147ad5',yellow:'#e9b72c',green:'#0db76c',black:'#24282b',white:'#edece4'});
export function normalizeCustomDisc(raw) {
  const value=raw&&typeof raw==='object'?raw:{};
  return {enabled:value.enabled===true,color:typeof value.color==='string'&&/^#[0-9a-f]{6}$/i.test(value.color)?value.color.toLowerCase():'#9354ce',
    finish:Object.hasOwn(DISC_FINISHES,value.finish)?value.finish:'gloss',pattern:Object.hasOwn(DISC_PATTERNS,value.pattern)?value.pattern:'plain',emblem:Object.hasOwn(DISC_EMBLEMS,value.emblem)?value.emblem:'none'};
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
    designs[id]={...design,color:mode==='online'||colors.length===2?SEAT_COLORS[color.id]:design.color};
    return {...color,id,name:mode==='online'||colors.length===2?color.name:'マイコマ'};
  });
  return {colors:palette,designs};
}
// Decorative geometry stays inside the face. No uploaded image, markup, or per-disc DOM is needed.
export function drawDiscDecoration(ctx,design) {
  const {pattern,emblem,finish}=normalizeCustomDisc(design);
  ctx.save();ctx.beginPath();ctx.ellipse(126,121,99,94,0,0,Math.PI*2);ctx.clip();
  ctx.strokeStyle=finish==='metal'?'#fff2c97a':'#fff0ca4d';ctx.lineWidth=2;
  if(pattern==='rings')for(const radius of [52,67,82]){ctx.beginPath();ctx.ellipse(126,121,radius,radius*.95,0,0,Math.PI*2);ctx.stroke();}
  if(pattern==='rays')for(let n=0;n<24;n++){const a=n*Math.PI/12;ctx.beginPath();ctx.moveTo(126+Math.cos(a)*48,121+Math.sin(a)*45);ctx.lineTo(126+Math.cos(a)*97,121+Math.sin(a)*92);ctx.stroke();}
  if(pattern==='waves')for(let y=55;y<215;y+=17){ctx.beginPath();ctx.moveTo(20,y);ctx.bezierCurveTo(80,y-32,160,y+32,234,y);ctx.stroke();}
  if(emblem!=='none') {
    ctx.translate(126,121);ctx.fillStyle='#f6e2af';ctx.strokeStyle='#624824aa';ctx.lineWidth=1.5;ctx.shadowColor='#0006';ctx.shadowBlur=3;ctx.shadowOffsetY=2;ctx.beginPath();
    if(emblem==='star')for(let n=0;n<10;n++){const a=n*Math.PI/5-Math.PI/2,r=n%2?17:37;n?ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r):ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);}
    if(emblem==='diamond'){ctx.moveTo(0,-37);ctx.lineTo(29,0);ctx.lineTo(0,37);ctx.lineTo(-29,0);}
    if(emblem==='moon'){ctx.arc(0,0,34,.35*Math.PI,1.65*Math.PI);ctx.bezierCurveTo(-9,-26,-9,26,Math.cos(.35*Math.PI)*34,Math.sin(.35*Math.PI)*34);}
    if(emblem==='flower')for(let n=0;n<=120;n++){const a=n*Math.PI/60,r=26+9*Math.cos(a*5);n?ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r):ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);}
    ctx.closePath();ctx.fill();ctx.stroke();
  }
  ctx.restore();
}
