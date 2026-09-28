(function () {
  'use strict';
  const C = window.ToiletCore;
  const textures=(window.ToiletAssets||[]).map(src=>{const img=new Image();img.src=src;return img;});
  const materialCache=new Map();
  function material(theme,part){const id=theme+':'+part;if(materialCache.has(id))return materialCache.get(id);const img=textures[theme];if(!img?.complete||!img.naturalWidth)return null;const c=document.createElement('canvas');c.width=c.height=240;const ctx=c.getContext('2d'),half=img.naturalWidth/2;ctx.drawImage(img,(part%2)*half,Math.floor(part/2)*half,half,half,0,0,240,240);materialCache.set(id,c);return c;}
  const INK = '#203b3f', TEAL = '#167e80', CORAL = '#ec7365';
  function rr(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  function text(ctx, value, x, y, size = 12, color = INK, align = 'center', weight = 700) {
    ctx.fillStyle = color; ctx.font = `${weight} ${size}px "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(value, x, y);
  }
  function line(ctx, pts, color = INK, width = 2.5) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.stroke(); }
  function stick(ctx, x, y, s = 1, opts = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.fillStyle = '#203b3f1c'; ctx.beginPath(); ctx.ellipse(0, 2, 13, 4, 0, 0, Math.PI * 2); ctx.fill();
    const walk = opts.walk ? Math.sin(opts.walk) * 5 : 0, panic = opts.panic, happy = opts.happy, sad = opts.sad;
    if (opts.player) { ctx.fillStyle = '#f1cf5980'; ctx.beginPath(); ctx.ellipse(0, 1, 16, 7, 0, 0, Math.PI * 2); ctx.fill(); }
    const headY = sad ? -28 : -39;
    if (sad) {
      line(ctx, [[0, -16], [-5, -5], [9, -3]], INK, 3); line(ctx, [[-5, -5], [-15, 1], [-21, -4]], INK, 3); line(ctx, [[-1, -16], [13, -6], [17, 0]], INK, 3);
    } else {
      line(ctx, [[0, -27], [0, -14]], INK, 3);
      if (panic && !opts.walk) { line(ctx, [[0, -14], [5, -7], [-5, 0]], INK, 3); line(ctx, [[0, -14], [-5, -7], [5, 0]], INK, 3); line(ctx, [[-1, -25], [-8, -17], [0, -13], [8, -17], [1, -25]], INK, 2.6); }
      else { line(ctx, [[0, -14], [-6 - walk, 0]], INK, 3); line(ctx, [[0, -14], [6 + walk, -Math.abs(walk) * .7]], INK, 3); if (happy) { line(ctx, [[-1, -25], [-14, -36]], INK, 3); line(ctx, [[1, -25], [14, -36]], INK, 3); } else { line(ctx, [[0, -25], [-8 + walk, -13]], INK, 2.6); line(ctx, [[0, -25], [8 - walk, -14]], INK, 2.6); } }
    }
    ctx.lineWidth = 2.7; ctx.fillStyle = '#fffef7'; ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(0, headY, 12.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (panic) { line(ctx, [[-6, headY - 2], [-3, headY], [-6, headY + 2]], INK, 1.7); line(ctx, [[6, headY - 2], [3, headY], [6, headY + 2]], INK, 1.7); line(ctx, [[-3, headY + 7], [0, headY + 5], [3, headY + 7]], INK, 1.6); }
    else if (sad) { line(ctx, [[-7, headY], [-5, headY + 2], [-3, headY]], INK, 1.6); line(ctx, [[3, headY], [5, headY + 2], [7, headY]], INK, 1.6); }
    else if (happy) { line(ctx, [[-7, headY + 1], [-5, headY - 1], [-3, headY + 1]], INK, 1.6); line(ctx, [[3, headY + 1], [5, headY - 1], [7, headY + 1]], INK, 1.6); ctx.beginPath(); ctx.arc(0, headY + 3, 4, 0, Math.PI); ctx.fillStyle = INK; ctx.fill(); }
    else { ctx.fillStyle = INK; for (const v of [-4, 4]) { ctx.beginPath(); ctx.arc(v, headY, 1.5, 0, Math.PI * 2); ctx.fill(); } line(ctx, [[-2, headY + 6], [2, headY + 6]], INK, 1.4); }
    if (opts.buddy) { line(ctx, [[-9, -27], [7, -27], [13, -19]], '#4c9fc4', 5); }
    if (opts.staff) { rr(ctx, -11, headY - 16, 22, 7, 2, TEAL); text(ctx, 'i', 0, headY - 13, 6, '#fff'); }
    if (opts.bag) { rr(ctx, 6, -17, 10, 11, 2, '#bf9c7c', INK); }
    if (panic) { ctx.fillStyle = '#62b4cb'; ctx.beginPath(); ctx.ellipse(16, headY - 5, 2, 4, .5, 0, Math.PI * 2); ctx.fill(); }
    if (opts.player) { ctx.fillStyle = '#f4cf45'; ctx.strokeStyle = INK; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(-5, headY - 25); ctx.lineTo(5, headY - 25); ctx.lineTo(0, headY - 17); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }
  function plant(ctx, x, y, s = 1, tree = false) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (tree) { rr(ctx, -3, -10, 6, 15, 2, '#947f5a'); ctx.fillStyle = '#71966a'; for (const [xx, yy, r] of [[-8, -18, 12], [8, -18, 12], [0, -29, 13]]) { ctx.beginPath(); ctx.arc(xx, yy, r, 0, Math.PI * 2); ctx.fill(); } }
    else { rr(ctx, -9, -5, 18, 15, 2, '#c0c7b7', '#52696a'); for (const [angle, height] of [[-.7, 13], [.65, 16], [0, 20]]) { ctx.save(); ctx.rotate(angle); ctx.fillStyle = angle === 0 ? '#487858' : '#679b68'; ctx.beginPath(); ctx.ellipse(0, -height / 2 - 7, 4, height / 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } }
    ctx.restore();
  }
  function door(ctx, x, y, s, occupied, number, used = false) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineWidth = 1.5;
    rr(ctx, -20, -44, 40, 48, 3, '#fffdf2', '#49666a');
    rr(ctx, -16, -39, 32, 42, 2, used ? '#b2d4cb' : '#d6dfd8', '#7b9190');
    rr(ctx, -8, -38, 16, 5, 2, occupied ? CORAL : '#5aaf82');
    text(ctx, 'WC', 0, -23, 10, INK); rr(ctx, 9, -11, 3, 6, 1, '#6e8381');
    if (number !== undefined) text(ctx, String(number + 1).padStart(2, '0'), -24, -23, 6, '#6c837f');
    ctx.restore();
  }
  function sizeCanvas(canvas, width, height) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(width * dpr)), h = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return ctx;
  }
  function thumbnail(canvas, map, opts = {}) {
    const width = canvas.clientWidth || 260, height = canvas.clientHeight || 130, ctx = sizeCanvas(canvas, width, height);
    ctx.clearRect(0, 0, width, height);
    const s = Math.min((width - 18) / map.w, (height - 12) / map.h), ox = (width - map.w * s) / 2, oy = (height - map.h * s) / 2;
    ctx.fillStyle = map.theme.dark; ctx.fillRect(0, 0, width, height);
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      const seen = !opts.game || opts.full || opts.game.seen[y * map.w + x];
      ctx.fillStyle = seen ? (map.grid[y][x] ? map.theme.wall : map.theme.floor) : '#365457';
      ctx.fillRect(ox + x * s, oy + y * s, s + .2, s + .2);
    }
    if(opts.game) { for(const g of map.gates){if(opts.full||opts.game.seen[Math.floor(g.y)*map.w+Math.floor(g.x)]){ctx.fillStyle=g.open?'#8cd9ac':'#e6b354';ctx.fillRect(ox+g.x*s-2,oy+g.y*s-2,4,4);}} for(const f of map.features){if(f.used||(!opts.full&&!f.discovered))continue;if(['warp','terminal','fountain'].includes(f.type)){ctx.fillStyle=C.FEATURE_INFO[f.type].color;ctx.fillRect(ox+f.x*s-2,oy+f.y*s-2,4,4);}} }
    if (opts.route) { ctx.beginPath(); opts.route.forEach((p, i) => i && !p.jump ? ctx.lineTo(ox + p.x * s, oy + p.y * s) : ctx.moveTo(ox + p.x * s, oy + p.y * s)); ctx.strokeStyle = CORAL; ctx.lineWidth = Math.max(2, s * .32); ctx.lineJoin = 'round'; ctx.stroke(); }
    for (const t of map.toilets) {
      if (opts.game && !opts.full && !t.discovered) continue;
      const open = opts.game ? opts.game.toiletStatus(t).open : true;
      rr(ctx, ox + t.x * s - 4, oy + t.y * s - 5, 8, 9, 2, open ? '#1a8b73' : CORAL, '#fff');
      if (s > 7) text(ctx, 'WC', ox + t.x * s, oy + t.y * s, 5, '#fff');
    }
    const p = opts.game ? opts.game.player : map.start;
    ctx.beginPath(); ctx.arc(ox + p.x * s, oy + p.y * s, opts.game ? 3 : 3.5, 0, Math.PI * 2); ctx.fillStyle = '#f3cd46'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
    if (opts.route && opts.game?.state === 'lost') { const px = ox + p.x * s, py = oy + p.y * s; line(ctx, [[px - 4, py - 4], [px + 4, py + 4]], CORAL, 2); line(ctx, [[px - 4, py + 4], [px + 4, py - 4]], CORAL, 2); }
  }
  class World {
    constructor(canvas, minimap, game, reduced = false) {
      this.canvas=canvas;this.minimap=minimap;this.game=game;this.reduced=reduced;this.tile=56;this.camera={x:0,y:0};this.minimapTick=0;
      this.variants=new Uint8Array(game.map.w*game.map.h);
      for(const n of game.map.nodes)if(n.variant)for(let y=n.y-n.radius;y<=n.y+n.radius;y++)for(let x=n.x-n.radius;x<=n.x+n.radius;x++)this.variants[y*game.map.w+x]=1;
    }
    terrain(ctx,cx,cy,w,h){
      const map=this.game.map,s=this.tile,theme=map.theme;
      const x0=Math.max(0,Math.floor(cx/s)),x1=Math.min(map.w,Math.ceil((cx+w)/s)),y0=Math.max(0,Math.floor(cy/s)),y1=Math.min(map.h,Math.ceil((cy+h)/s));
      const mats=[0,1,2,3].map(part=>material(map.themeId,part));
      for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
        const px=x*s,py=y*s,wall=map.grid[y][x]===1,part=wall?2:this.variants[y*map.w+x],tex=mats[part];
        ctx.fillStyle=wall?theme.wall:theme.floor;ctx.fillRect(px,py,s,s);
        if(tex){const tx=(x%4)*60,ty=(y%4)*60;ctx.drawImage(tex,tx,ty,60,60,px,py,s+.3,s+.3);}
        if(wall){
          ctx.fillStyle='#172b3b28';ctx.fillRect(px,py,s,s);
          if(C.floor(map,x,y+1)||map.grid[y+1]?.[x]===2){ctx.fillStyle=theme.dark;ctx.fillRect(px,py+s-16,s,16);if(mats[3]){ctx.drawImage(mats[3],(x%4)*60,(y%4)*60,60,60,px,py+s-16,s,16);ctx.fillStyle='#10283966';ctx.fillRect(px,py+s-16,s,16);}ctx.fillStyle='#ffffff50';ctx.fillRect(px,py+s-18,s,3);}
          if(C.floor(map,x+1,y)){ctx.fillStyle='#12283835';ctx.fillRect(px+s-5,py,5,s);}
          if((x*7+y*11+map.seed)%67===0&&x>1&&y>1){if(theme.prop==='plant'||theme.prop==='tree')plant(ctx,px+s/2,py+s/2+12,1.15,theme.prop==='tree');else if(theme.prop==='desk'){rr(ctx,px+6,py+10,s-12,25,2,'#c4a17b','#695d50');rr(ctx,px+15,py+3,24,11,2,'#42696f');}else{rr(ctx,px+4,py+12,s-8,25,3,'#abc2c8','#3e616b');}}
        }else{
          ctx.strokeStyle='#344b3716';ctx.lineWidth=.7;ctx.strokeRect(px,py,s,s);
          if(y>0&&map.grid[y-1][x]===1){const shadow=ctx.createLinearGradient(0,py,0,py+22);shadow.addColorStop(0,'#14313855');shadow.addColorStop(1,'#14313800');ctx.fillStyle=shadow;ctx.fillRect(px,py,s,22);}
        }
      }
      map.signs.forEach(n=>{if(n.x*s<cx-50||n.x*s>cx+w+50||n.y*s<cy||n.y*s>cy+h)return;rr(ctx,n.x*s-28,n.y*s-9,56,19,3,'#fffdefca');text(ctx,`WC ${n.dx?(n.dx>0?'→':'←'):(n.dy>0?'↓':'↑')}`,n.x*s,n.y*s,10,theme.dark);});
    }
    point(clientX, clientY) {
      const r = this.canvas.getBoundingClientRect(), s = this.tile;
      const x = clientX - r.left + this.camera.x, y = clientY - r.top + this.camera.y;
      // The door artwork extends above its floor tile. Clicking the artwork
      // should still select the entrance, rather than the wall behind it.
      const target = this.game.map.toilets.find(t => this.game.seen[Math.floor(t.y) * this.game.map.w + Math.floor(t.x)] && Math.abs(x - t.x * s) < 25 * s / 43 && y >= t.y * s - 55 * s / 43 && y <= t.y * s + 8);
      return target ? { x: target.x, y: target.y } : { x: x / s, y: y / s };
    }
    draw(time = 0) {
      const canvas = this.canvas, game = this.game, map = game.map, s = this.tile;
      const w = canvas.clientWidth, h = canvas.clientHeight, ctx = sizeCanvas(canvas, w, h);
      const cx = Math.max(0, Math.min(map.w * s - w, game.player.x * s - w / 2));
      const cy = Math.max(0, Math.min(map.h * s - h, game.player.y * s - h * .57));
      this.camera = { x: cx, y: cy };
      ctx.fillStyle = map.theme.dark; ctx.fillRect(0, 0, w, h);
      ctx.save(); ctx.translate(-cx, -cy); this.terrain(ctx,cx,cy,w,h);
      if (game.autoPath.length) {
        ctx.beginPath(); ctx.moveTo(game.player.x * s, game.player.y * s); game.autoPath.forEach(p => ctx.lineTo(p.x * s, p.y * s));
        ctx.strokeStyle = '#20938a66'; ctx.lineWidth = 3; ctx.setLineDash([4, 8]); ctx.stroke(); ctx.setLineDash([]);
        const end = game.autoPath[game.autoPath.length - 1]; ctx.beginPath(); ctx.arc(end.x * s, end.y * s, 9, 0, Math.PI * 2); ctx.stroke();
      }
      const objects = [];
      const visible=f=>f.x*s>cx-80&&f.x*s<cx+w+80&&f.y*s>cy-80&&f.y*s<cy+h+100;
      map.features.filter(f=>!f.used&&visible(f)).forEach(f=>{
        const info=C.FEATURE_INFO[f.type],x=f.x*s,y=f.y*s;
        if(f.type==='puddle'){ctx.fillStyle='#6aacc17d';ctx.beginPath();ctx.ellipse(x,y,43,23,-.2,0,Math.PI*2);ctx.fill();text(ctx,'≈',x,y,27,'#e5faff');return;}
        if(f.type==='rubble'){rr(ctx,x-48,y-24,96,48,5,'#a1835d55','#ad8b60');for(const[ox,oy]of[[-28,4],[0,-4],[25,6]]){ctx.fillStyle='#b59469';ctx.beginPath();ctx.moveTo(x+ox-11,y+oy+10);ctx.lineTo(x+ox,y+oy-13);ctx.lineTo(x+ox+11,y+oy+10);ctx.closePath();ctx.fill();line(ctx,[[x+ox-5,y+oy],[x+ox+5,y+oy]],'#f7e3a4',4);}text(ctx,'工事中',x,y+32,10,'#745537');return;}
        if(f.type==='alarm'){rr(ctx,x-40,y-27,80,54,4,'#f0cb6188','#ba7354');for(let q=-30;q<40;q+=15)line(ctx,[[x+q,y-23],[x+q-12,y+23]],'#c5785c66',4);text(ctx,'歩いて',x,y,14,'#6c4339');return;}
        if(f.type==='conveyor'){rr(ctx,x-56,y-22,112,44,4,'#647c79','#d4e1d7');text(ctx,f.dx>0?'❯ ❯ ❯':'❮ ❮ ❮',x,y,20,'#eff7df');return;}
        objects.push({y:f.y,fn:()=>{const bob=this.reduced?0:Math.sin(time*2+f.id)*2;ctx.fillStyle='#162c3a22';ctx.beginPath();ctx.ellipse(x,y+5,20,7,0,0,Math.PI*2);ctx.fill();rr(ctx,x-22,y-34+bob,44,36,8,info.color,'#ffffffcb');text(ctx,info.icon,x,y-16+bob,f.type==='key'||f.type==='terminal'?12:18,'#fff');
          if(f.type==='switch'||f.type==='warp')text(ctx,String(f.type==='switch'?f.gateId+1:f.pair),x+19,y-39,11,info.color);
          if(C.distance(game.player,f)<2.4){rr(ctx,x-51,y-59,102,19,4,'#fffcf0ed');text(ctx,info.name,x,y-49,10,INK);}
        }});
      });
      map.gates.filter(g=>visible(g)).forEach(g=>{if(g.open){text(ctx,'OPEN',g.x*s,g.y*s,11,TEAL);return;}const x=g.x*s,y=g.y*s;ctx.save();ctx.translate(x,y);if(g.horizontal)ctx.rotate(Math.PI/2);rr(ctx,-s*1.5,-10,s*3,20,3,'#526b72','#d1b05f');for(let q=-s*1.4;q<s*1.4;q+=14){line(ctx,[[q,-9],[q+8,9]],'#e4bd60',4);}ctx.restore();rr(ctx,x-19,y-26,38,22,4,'#2b464b','#dfbd5d');text(ctx,`鍵 ${g.id+1}`,x,y-15,11,'#fff');});
      map.toilets.filter(visible).forEach(t => objects.push({ y: t.y, fn: () => {
        const status=game.toiletStatus(t),open = status.open;
        ctx.fillStyle = open ? '#70b39725' : '#e88a7e22'; ctx.beginPath(); ctx.ellipse(t.x * s, t.y * s + 8, 30, 15, 0, 0, Math.PI * 2); ctx.fill();
        door(ctx, t.x * s, t.y * s, 1.25 * s / 43, !open, t.id, game.mode === 'relief' && game.door === t);
        if (C.distance(game.player, t) < 4) { const label = open ? '空き' : status.reason; rr(ctx, t.x * s - 22, t.y * s - 101, 44, 17, 4, open ? '#e7f5e9' : '#fff2ed', open ? '#74a88d' : '#d69081'); text(ctx, label, t.x * s, t.y * s - 92, 9, open ? '#26715c' : '#b25447'); }
      } }));
      map.shoppers.filter(visible).forEach(n=>objects.push({y:n.y,fn:()=>{
        const info=C.NPC_INFO[n.kind],talking=game.talk?.npcId===n.id;
        ctx.fillStyle=n.cooldown>0?'#5ca38a30':info.color+'44';ctx.beginPath();ctx.ellipse(n.x*s,n.y*s+2,.68*s,.32*s,0,0,Math.PI*2);ctx.fill();
        stick(ctx,n.x*s,n.y*s,.86*s/43,{bag:n.bag,staff:n.kind==='guard',walk:this.reduced||talking?0:game.elapsed*3});
        rr(ctx,n.x*s-11,n.y*s-77,22,20,6,info.color);text(ctx,talking?'…':info.icon,n.x*s,n.y*s-67,13,'#fff');
        if(C.distance(game.player,n)<4.3){rr(ctx,n.x*s-48,n.y*s-102,96,18,4,'#fffcf2ef');text(ctx,n.cooldown>0&&!talking?'会話済み':info.name,n.x*s,n.y*s-93,10,info.color);}
      }}));
      objects.push({ y: map.staff.y, fn: () => { stick(ctx, map.staff.x * s, map.staff.y * s, .9 * s / 43, { staff: true }); text(ctx, map.staff.talked ? 'ありがとう！' : '案内係', map.staff.x * s, map.staff.y * s - 92, 10, INK); } });
      const b = map.buddy;
      if (!b.busy) objects.push({ y: b.y, fn: () => stick(ctx, b.x * s, b.y * s, .88 * s / 43, { buddy: true, panic: !b.done, happy: b.done, walk: b.active && !this.reduced ? game.player.walk : 0 }) });
      if (game.mode !== 'relief') objects.push({ y: game.player.y, fn: () => stick(ctx, game.player.x * s, game.player.y * s, s / 43, { player: true, panic: true, walk: !this.reduced && game._moving ? game.player.walk : 0 }) });
      objects.sort((a, b) => a.y - b.y).forEach(o => o.fn());
      // An opaque fog keeps unreached passages unknown, while persisting explored tiles.
      for (let y = Math.max(0, Math.floor(cy / s)); y < Math.min(map.h, (cy + h) / s); y++) for (let x = Math.max(0, Math.floor(cx / s)); x < Math.min(map.w, (cx + w) / s); x++) if (!game.seen[y * map.w + x]) { ctx.fillStyle = '#314e51'; ctx.fillRect(x * s, y * s, s + .3, s + .3); ctx.fillStyle = '#ffffff04'; ctx.fillRect(x * s + 1, y * s + 1, s - 2, s - 2); }
      if (game.mode === 'relief') {
        const t = game.door; text(ctx, '…！', t.x * s, t.y * s - 118, 20, TEAL);
      }
      ctx.restore();
      if (game.remaining < 10 && !this.reduced) { ctx.strokeStyle = `rgba(236,115,101,${.25 + .15 * Math.sin(time * 5)})`; ctx.lineWidth = 6; ctx.strokeRect(3, 3, w - 6, h - 6); }
      if (this.minimap && time - this.minimapTick > .12) { thumbnail(this.minimap, map, { game }); this.minimapTick = time; }
    }
  }
  function illustration(canvas, mode = 'title') {
    const w = canvas.clientWidth || 560, h = canvas.clientHeight || 490, ctx = sizeCanvas(canvas, w, h);
    const scale = Math.min(w / 560, h / 480);
    ctx.fillStyle = '#e8eee2'; ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.translate((w - 560 * scale) / 2, (h - 480 * scale) / 2); ctx.scale(scale, scale);
    ctx.fillStyle = '#e8eee2'; ctx.fillRect(0, 0, 560, 480);
    ctx.fillStyle = '#f0ecdc'; ctx.fillRect(0, 240, 560, 240);
    ctx.strokeStyle = '#6c8c7b16'; ctx.lineWidth = 1;
    for (let x = 0; x < 560; x += 48) { ctx.beginPath(); ctx.moveTo(x, 240); ctx.lineTo(x, 480); ctx.stroke(); }
    for (let y = 240; y < 480; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(560, y); ctx.stroke(); }
    rr(ctx, 38, 95, 484, 161, 4, '#97b5a6'); ctx.fillStyle = '#6b9185'; ctx.fillRect(38, 223, 484, 33);
    door(ctx, 408, 262, 2.8, mode === 'title', undefined, mode === 'won');
    plant(ctx, 70, 258, 1.9); plant(ctx, 506, 264, 1.7);
    rr(ctx, 66, 129, 133, 41, 6, '#fffcf1'); text(ctx, 'WC →', 131, 151, 21, TEAL);
    if (mode === 'title') {
      stick(ctx, 234, 371, 2.65, { player: true, panic: true }); stick(ctx, 330, 385, 1.85, { buddy: true, panic: true });
      rr(ctx, 73, 303, 110, 35, 18, '#fffdf7', '#9aafa0'); text(ctx, 'あと、少し…！', 128, 321, 12);
      rr(ctx, 291, 56, 167, 43, 10, '#fffdf5', '#c7d2c2'); text(ctx, '00:18', 375, 78, 28, CORAL);
      text(ctx, '使用中', 408, 105, 12, CORAL);
    } else if (mode === 'won') {
      stick(ctx, 210, 365, 2.7, { player: true, happy: true }); stick(ctx, 326, 370, 2.2, { buddy: true, happy: true });
      for (let i = 0; i < 16; i++) { ctx.fillStyle = i % 2 ? '#eecf68' : '#e8917d'; ctx.save(); ctx.translate(93 + (i * 73 % 350), 73 + (i * 51 % 200)); ctx.rotate(i); ctx.fillRect(0, 0, 6, 13); ctx.restore(); }
    } else { stick(ctx, 230, 358, 3, { sad: true }); stick(ctx, 328, 360, 2.3, { buddy: true }); text(ctx, '00:00', 188, 118, 28, CORAL); }
    ctx.restore();
  }
  window.ToiletRender = { textures, material, World, thumbnail, illustration, stick, sizeCanvas };
})();
