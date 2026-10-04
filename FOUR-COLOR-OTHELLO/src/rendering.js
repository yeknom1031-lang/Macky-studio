import { drawDiscDecoration } from './cosmetics.js';
// Paint each finish once; every static stone shares one cached bitmap.
export function installStoneTextures(doc, colors, computed = getComputedStyle, designs = {}, styleId = 'irodory-stone-textures') {
  const style = doc.getElementById(styleId) ?? doc.createElement('style'), rules = [];
  style.id=styleId;
  const signature=JSON.stringify([colors,designs]);if(style.dataset.signature===signature)return;style.dataset.signature=signature;
  const probe = doc.createElement('i'); probe.style.display = 'none'; doc.body.append(probe);
  try {
    for (const color of colors) {
      probe.className = `disc ${color}`;
      const css = computed(probe), canvas = doc.createElement('canvas');
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      const design=designs[color];
      const shade=(hex,factor)=>'#'+hex.slice(1).match(/../g).map(part=>Math.round(parseInt(part,16)*factor).toString(16).padStart(2,'0')).join('');
      const custom=design?{'--stone':design.color,'--rim':shade(design.color,.7),'--dark':shade(design.color,.32)}:null;
      const value = key => custom?.[key] ?? css.getPropertyValue(key).trim();
      // Warm, broad upper-left light and a low, flat resin face match the lounge.
      const tint = (hex, light, amount) => {
        const rgb = hex.replace('#','');
        const expanded = rgb.length === 3 ? [...rgb].map(c=>c+c).join('') : rgb;
        return `rgb(${[0,2,4].map((offset,i)=>Math.round(parseInt(expanded.slice(offset,offset+2),16)*(1-amount)+light[i]*amount)).join(',')})`;
      };
      const base = tint(value('--stone'),[92,79,55],.18);
      const light = tint(value('--stone'),[238,215,172],.29);
      const edge = tint(value('--rim'),[56,45,29],.24);
      ctx.beginPath(); ctx.ellipse(129, 138, 108, 102, 0, 0, Math.PI * 2);
      ctx.fillStyle = value('--dark'); ctx.shadowColor = '#00000085'; ctx.shadowBlur = 13; ctx.shadowOffsetX = 6; ctx.shadowOffsetY = 7; ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
      const side = ctx.createLinearGradient(0,112,0,241);
      side.addColorStop(0,edge); side.addColorStop(.73,edge); side.addColorStop(1,value('--dark'));
      ctx.fillStyle=side;ctx.fill();
      ctx.beginPath(); ctx.ellipse(126, 121, 107, 102, 0, 0, Math.PI * 2);
      const face = ctx.createLinearGradient(40, 20, 181, 225);
      face.addColorStop(0, light); face.addColorStop(.38, base);
      if(design?.finish==='metal'){face.addColorStop(.52,tint(value('--stone'),[255,237,190],.65));face.addColorStop(.62,base);}
      face.addColorStop(.8, base); face.addColorStop(1, edge);
      ctx.fillStyle=face;ctx.fill();ctx.strokeStyle=edge;ctx.lineWidth=2;ctx.stroke();
      if(design)drawDiscDecoration(ctx,design);
      ctx.save();if(design?.finish==='matte')ctx.globalAlpha=.17;ctx.translate(100,64);ctx.rotate(-.35);ctx.scale(1,.42);
      const shine=ctx.createRadialGradient(0,0,8,0,0,86);
      shine.addColorStop(0,'#fff1d63d');shine.addColorStop(.5,'#ffebc61b');shine.addColorStop(1,'#ffebc600');
      ctx.fillStyle=shine;ctx.beginPath();ctx.arc(0,0,86,0,Math.PI*2);ctx.fill();ctx.restore();
      ctx.beginPath();ctx.ellipse(126,121,104,99,0,Math.PI*1.02,Math.PI*1.91);
      ctx.strokeStyle='#ffebbd65';ctx.lineWidth=1.5;ctx.stroke();
      ctx.beginPath();ctx.ellipse(126,121,103,98,0,.14,Math.PI*.8);
      ctx.strokeStyle='#080b0738';ctx.lineWidth=2;ctx.stroke();
      // A whole storage row is one shared bitmap, irrespective of board size.
      const stock=doc.createElement('canvas');stock.width=544;stock.height=64;
      const rack=stock.getContext('2d');
      for(let i=29;i>=0;i--){
        const x=24+i*17;
        rack.beginPath();rack.ellipse(x,32,18,27,0,0,Math.PI*2);
        rack.fillStyle=value('--dark');rack.shadowColor='#000b';rack.shadowBlur=3;rack.shadowOffsetX=3;rack.fill();rack.shadowColor='transparent';
        const edge=rack.createLinearGradient(x-15,0,x+15,0);edge.addColorStop(0,value('--dark'));edge.addColorStop(.3,value('--rim'));edge.addColorStop(.55,light);edge.addColorStop(.82,base);edge.addColorStop(1,value('--dark'));
        rack.fillStyle=edge;rack.fill();rack.strokeStyle='#010504b3';rack.lineWidth=1.5;rack.stroke();
        rack.beginPath();rack.ellipse(x-2,32,13,24,0,Math.PI*1.08,Math.PI*1.77);rack.strokeStyle='#f8dfac52';rack.lineWidth=1.2;rack.stroke();
      }
      const vertical=doc.createElement('canvas');vertical.width=64;vertical.height=544;const v=vertical.getContext('2d');v.translate(64,0);v.rotate(Math.PI/2);v.drawImage(stock,0,0);
      if(custom)rules.push(`.${color}{--stone:${value('--stone')};--rim:${value('--rim')};--dark:${value('--dark')};--bright:${light}}`);
      rules.push(`:root{--stone-${color}:url("${canvas.toDataURL()}")}.${color}{--disc-image:var(--stone-${color});--rack-image:url("${stock.toDataURL()}");--rack-vertical:url("${vertical.toDataURL()}")}`);
    }
    style.textContent = rules.join('\n'); doc.head.append(style); doc.body.classList.add('stone-textures');
  } finally { probe.remove(); }
}

// One stone node per occupied cell, including repeated captures.
export function paintStone(cell, color, doc) {
  if (color === null) { if (cell.firstElementChild) cell.replaceChildren(); return; }
  let disc = cell.firstElementChild;
  if (!disc) { disc = doc.createElement('i'); disc.setAttribute('aria-hidden', 'true'); cell.append(disc); }
  const className = `disc ${color}`;
  if (disc.className !== className) disc.className = className;
}

// Cleanup must work even when CSS animations are disabled or interrupted.
export function createCellEffects(schedule = setTimeout, unschedule = clearTimeout) {
  const pending = new Map();
  function clear(cell) {
    if (pending.has(cell)) unschedule(pending.get(cell));
    pending.delete(cell); cell.classList.remove('just-placed');
  }
  return {
    pulse(cell) { clear(cell); cell.classList.add('just-placed'); pending.set(cell, schedule(() => clear(cell), 650)); },
    clear() { for (const cell of pending.keys()) clear(cell); },
    size() { return pending.size; }
  };
}

// One reused stone and at most one queued frame, never a continuous render loop.
export function createHeldStonePointer(surface, element, { frame = requestAnimationFrame, cancelFrame = cancelAnimationFrame } = {}) {
  let color=null, inside=false, queued=null, x=0, y=0;
  function hide() {
    element.hidden=true;surface.classList.remove('holding-stone');
    if(queued!==null){cancelFrame(queued);queued=null;}
  }
  function paint() {
    queued=null;
    if(!inside||!color){hide();return;}
    element.style.transform=`translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
    element.hidden=false;surface.classList.add('holding-stone');
  }
  function move(event) {
    if(event.pointerType==='touch'){inside=false;hide();return;}
    inside=true;x=event.clientX;y=event.clientY;
    if(color&&queued===null)queued=frame(paint);
  }
  function leave(){inside=false;hide();}
  surface.addEventListener('pointerenter',move,{passive:true});
  surface.addEventListener('pointermove',move,{passive:true});
  surface.addEventListener('pointerleave',leave,{passive:true});
  surface.addEventListener('pointercancel',leave,{passive:true});
  return {
    sync(nextColor,size) {
      color=nextColor;
      if(nextColor){element.className=`held-stone disc ${nextColor}`;element.style.width=`${Math.max(20,Math.min(80,size))}px`;}
      if(!color)hide();else if(inside&&queued===null)queued=frame(paint);
    },
    hide:leave,
    destroy(){leave();for(const [type,handler] of [['pointerenter',move],['pointermove',move],['pointerleave',leave],['pointercancel',leave]])surface.removeEventListener(type,handler);}
  };
}
