// Paint each finish once; every static stone shares one cached bitmap.
export function installStoneTextures(doc, colors, computed = getComputedStyle) {
  const style = doc.createElement('style'), rules = [];
  const probe = doc.createElement('i'); probe.style.display = 'none'; doc.body.append(probe);
  try {
    for (const color of colors) {
      probe.className = `disc ${color}`;
      const css = computed(probe), canvas = doc.createElement('canvas');
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      const value = key => css.getPropertyValue(key).trim();
      ctx.beginPath(); ctx.ellipse(128, 139, 110, 107, 0, 0, Math.PI * 2);
      ctx.fillStyle = value('--dark'); ctx.shadowColor = '#0009'; ctx.shadowBlur = 9; ctx.shadowOffsetY = 5; ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.beginPath(); ctx.arc(128, 123, 109, 0, Math.PI * 2);
      const face = ctx.createRadialGradient(86, 62, 5, 128, 123, 155);
      face.addColorStop(0, value('--bright')); face.addColorStop(.52, value('--stone')); face.addColorStop(1, value('--dark'));
      ctx.fillStyle = face; ctx.fill(); ctx.strokeStyle = value('--rim'); ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.arc(128, 122, 101, Math.PI * 1.05, Math.PI * 1.91);
      ctx.strokeStyle = '#ffffff80'; ctx.lineWidth = 2; ctx.stroke();
      const shine = ctx.createRadialGradient(89, 69, 0, 92, 72, 62);
      shine.addColorStop(0, '#ffffff8c'); shine.addColorStop(.4, '#ffffff28'); shine.addColorStop(1, '#ffffff00');
      ctx.fillStyle = shine; ctx.beginPath(); ctx.arc(128, 123, 105, 0, Math.PI * 2); ctx.fill();
      rules.push(`.${color}{--disc-image:url("${canvas.toDataURL()}")}`);
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
