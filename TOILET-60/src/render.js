(function () {
  'use strict';
  const C = window.ToiletCore;
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
    if (opts.route) { ctx.beginPath(); opts.route.forEach((p, i) => i ? ctx.lineTo(ox + p.x * s, oy + p.y * s) : ctx.moveTo(ox + p.x * s, oy + p.y * s)); ctx.strokeStyle = CORAL; ctx.lineWidth = Math.max(2, s * .32); ctx.lineJoin = 'round'; ctx.stroke(); }
    for (const t of map.toilets) {
      if (opts.game && !opts.full && !t.discovered) continue;
      const open = opts.game ? opts.game.elapsed >= t.openAt : true;
      rr(ctx, ox + t.x * s - 4, oy + t.y * s - 5, 8, 9, 2, open ? '#1a8b73' : CORAL, '#fff');
      if (s > 7) text(ctx, 'WC', ox + t.x * s, oy + t.y * s, 5, '#fff');
    }
    const p = opts.game ? opts.game.player : map.start;
    ctx.beginPath(); ctx.arc(ox + p.x * s, oy + p.y * s, opts.game ? 3 : 3.5, 0, Math.PI * 2); ctx.fillStyle = '#f3cd46'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
    if (opts.route && opts.game?.state === 'lost') { const px = ox + p.x * s, py = oy + p.y * s; line(ctx, [[px - 4, py - 4], [px + 4, py + 4]], CORAL, 2); line(ctx, [[px - 4, py + 4], [px + 4, py - 4]], CORAL, 2); }
  }
  class World {
    constructor(canvas, minimap, game, reduced = false) {
      this.canvas = canvas; this.minimap = minimap; this.game = game; this.reduced = reduced; this.tile = 60; this.camera = { x: 0, y: 0 }; this.minimapTick = 0;
      this.static = document.createElement('canvas'); this.cacheMap();
    }
    cacheMap() {
      const { map } = this.game, s = this.tile, c = this.static; c.width = map.w * s; c.height = map.h * s;
      const ctx = c.getContext('2d'); const theme = map.theme;
      for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
        const px = x * s, py = y * s;
        ctx.fillStyle = map.grid[y][x] ? theme.dark : theme.floor; ctx.fillRect(px, py, s, s);
        if (!map.grid[y][x]) {
          ctx.fillStyle = (x + y) % 3 === 0 ? '#ffffff13' : '#253d3805'; ctx.fillRect(px + 1, py + 1, s - 1, s - 1);
          ctx.strokeStyle = '#53746a12'; ctx.lineWidth = 1; ctx.strokeRect(px + .5, py + .5, s, s);
          if (y > 0 && map.grid[y - 1][x]) { ctx.fillStyle = '#203d3914'; ctx.fillRect(px, py, s, 10); }
        } else {
          ctx.fillStyle = theme.wall; ctx.fillRect(px, py, s, s);
          if (C.floor(map, x, y + 1)) { ctx.fillStyle = '#ffffff22'; ctx.fillRect(px, py + 4, s, 3); ctx.fillStyle = theme.dark; ctx.fillRect(px, py + s - 10, s, 10); }
          if ((x * 7 + y * 11 + map.seed) % 31 === 0 && x > 1 && y > 1) {
            if (theme.prop === 'plant' || theme.prop === 'tree') plant(ctx, px + s / 2, py + s / 2 + 10, .85, theme.prop === 'tree');
            else if (theme.prop === 'desk') { rr(ctx, px + 6, py + 11, s - 12, 19, 2, '#d7bd94', '#876f56'); rr(ctx, px + 14, py + 5, 14, 8, 2, '#597d75'); }
            else { rr(ctx, px + 5, py + 15, s - 10, 15, 3, '#b8c6cb', '#516d79'); }
          }
        }
      }
      // Reusable floor arrows provide local direction, without revealing availability.
      map.nodes.forEach((n, i) => {
        if (i % 3 !== 0) return;
        const nearest = [...map.toilets].sort((a, b) => C.path(map, n, a).length - C.path(map, n, b).length)[0];
        const p = C.path(map, n, nearest);
        if (p.length < 4) return;
        const next = p[3], dx = next.x - n.x - .5, dy = next.y - n.y - .5;
        text(ctx, `WC ${Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? '→' : '←') : (dy > 0 ? '↓' : '↑')}`, (n.x + .5) * s, (n.y + 1.5) * s, 10, theme.dark);
      });
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
      ctx.save(); ctx.translate(-cx, -cy); ctx.drawImage(this.static, 0, 0);
      if (game.autoPath.length) {
        ctx.beginPath(); ctx.moveTo(game.player.x * s, game.player.y * s); game.autoPath.forEach(p => ctx.lineTo(p.x * s, p.y * s));
        ctx.strokeStyle = '#20938a66'; ctx.lineWidth = 3; ctx.setLineDash([4, 8]); ctx.stroke(); ctx.setLineDash([]);
        const end = game.autoPath[game.autoPath.length - 1]; ctx.beginPath(); ctx.arc(end.x * s, end.y * s, 9, 0, Math.PI * 2); ctx.stroke();
      }
      const objects = [];
      map.toilets.forEach(t => objects.push({ y: t.y, fn: () => {
        const open = game.elapsed >= t.openAt;
        ctx.fillStyle = open ? '#70b39725' : '#e88a7e22'; ctx.beginPath(); ctx.ellipse(t.x * s, t.y * s + 8, 30, 15, 0, 0, Math.PI * 2); ctx.fill();
        door(ctx, t.x * s, t.y * s, 1.25 * s / 43, !open, t.id, game.mode === 'relief' && game.door === t);
        if (C.distance(game.player, t) < 4) { const label = open ? '空き' : '使用中'; rr(ctx, t.x * s - 22, t.y * s - 101, 44, 17, 4, open ? '#e7f5e9' : '#fff2ed', open ? '#74a88d' : '#d69081'); text(ctx, label, t.x * s, t.y * s - 92, 9, open ? '#26715c' : '#b25447'); }
      } }));
      map.shoppers.forEach(n => objects.push({ y: n.y, fn: () => stick(ctx, n.x * s, n.y * s, .86 * s / 43, { bag: n.bag, walk: this.reduced ? 0 : game.elapsed * 3 }) }));
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
  window.ToiletRender = { World, thumbnail, illustration, stick, sizeCanvas };
})();
