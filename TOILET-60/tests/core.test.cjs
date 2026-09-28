const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/core.js');

function walkRoute(game, goal, sprint = false) {
  const route = C.path(game.map, game.player, goal).slice(1);
  for (const p of route) {
    let steps = 0;
    while (C.distance(game.player, p) > .035 && game.state === 'playing') {
      if(game.mode==='talk'){game.update(game.talk.remaining+.01);continue;}
      const dx = p.x - game.player.x, dy = p.y - game.player.y, d = Math.hypot(dx, dy);
      game.update(Math.min(.02, d / game.speed(sprint,dx,dy)), { x: dx / d, y: dy / d, sprint });
      assert.ok(++steps < 200, 'Player can follow a walkable route');
    }
  }
}
test('48 authored seeds and all difficulty settings produce distinct, repeatable layouts', () => {
  assert.equal(C.STAGES.length, 48);
  for (const d of Object.keys(C.DIFFICULTIES)) {
    const shapes = new Set();
    for (const s of C.STAGES) {
      const a = C.generate(s.seed, d, s.theme), b = C.generate(s.seed, d, s.theme);
      assert.deepEqual(a, b); shapes.add(JSON.stringify(a.grid));
      assert.equal(a.toilets.length, C.DIFFICULTIES[d].toilets);
      assert.ok(C.floor(a, Math.floor(a.start.x), Math.floor(a.start.y)));
      for (const t of a.toilets) assert.ok(C.path(a, a.start, t).length > 0);
      const safe = a.toilets[a.safeId], route = C.path(a, a.start, safe);
      assert.ok((route.length - 1) / 3.2 + 3 < C.DIFFICULTIES[d].time - 2);
    }
    assert.equal(shapes.size, 48, 'Each stage has distinct geometry');
  }
});
test('500 random seeds per difficulty always connect every toilet and preserve a feasible finish', () => {
  for (const d of Object.keys(C.DIFFICULTIES)) for (let seed = 0; seed < 500; seed++) {
    const map = C.generate(seed * 10103, d, seed % 6);
    for (const t of map.toilets) assert.ok(C.path(map, map.start, t).length > 1, `${d}/${seed} connected`);
    const safe = map.toilets[map.safeId];
    assert.ok(safe.openAt>0);assert.ok(map.toilets.every(t=>t.openAt>0));
    const arrival=(C.path(map,map.start,safe).length-1)/3.2,status=C.Game.prototype.toiletStatus.call({},safe,arrival);
    assert.ok(arrival+(status.open?0:status.left)+3<C.DIFFICULTIES[d].time,`${d}/${seed} feasible including occupancy`);
  }
});
test('every one of the 144 stage/difficulty combinations can be won using movement and interaction', () => {
  for (const d of Object.keys(C.DIFFICULTIES)) for (const s of C.STAGES) {
    let won=false;
    // The shorter-looking route may lose to a crowd or cleaning window. Retry the
    // other real entrance, using only walking, listening, waiting and interaction.
    for(const toiletId of [1,0]){
      const g = new C.Game({ seed: s.seed, theme: s.theme, difficulty: d });
      walkRoute(g,g.map.toilets[toiletId]);
      while(g.state==='playing'&&g.mode!=='relief'){if(g.mode==='talk')g.update(g.talk.remaining+.01);else{g.interact();g.update(.08);}}
      g.update(3.05);if(g.state==='won'){won=true;break;}
    }
    assert.ok(won,`stage ${s.id}/${d} has a verified walking solution`);
  }
});
test('wall collisions, normalized diagonal movement and sprint consumption', () => {
  const a = new C.Game(), b = new C.Game();
  const p = { ...a.player }; a.update(.1, { x: 1 }); b.update(.1, { x: 1, y: 1 });
  assert.ok(Math.abs(C.distance(a.player, p) - C.distance(b.player, p)) < 1e-6);
  const c = new C.Game(), before = c.remaining; c.update(.1, { x: 1, sprint: true });
  assert.ok(Math.abs(before - c.remaining - .135) < 1e-6);
  for (let i = 0; i < 100; i++) a.update(.03, { x: -1, y: 1 });
  assert.ok(a.fits(a.player.x, a.player.y));
  assert.ok(!a.fits(0, 0));
});
test('occupied toilet clues transition, waiting can be cancelled and then auto-enters', () => {
  const g = new C.Game(); const t = g.map.toilets[0]; walkRoute(g, t);
  t.openFor=0;g.map.shoppers=[];t.openAt = g.elapsed + 20; assert.match(g.clue(t), /動画/);
  t.openAt = g.elapsed + 12; assert.match(g.clue(t), /あとちょっと/);
  t.openAt = g.elapsed + 6; assert.match(g.clue(t), /ガサゴソ/);
  t.openAt = g.elapsed + 2; assert.match(g.clue(t), /ジャー/);
  g.interact(); assert.equal(g.mode, 'wait');
  g.update(.05, { x: 1 }); assert.equal(g.mode, 'explore');
  g.interact(); assert.equal(g.mode, 'wait'); g.update(2.1); assert.equal(g.mode, 'relief');
  g.update(3); assert.equal(g.state, 'won');
});
test('three-second relief wins at boundary but loses when less time remains', () => {
  for (const [remaining, expected] of [[3, 'won'], [2.99, 'lost'], [3.1, 'won']]) {
    const g = new C.Game(); const t = g.map.toilets[g.map.safeId]; t.openAt=0;t.openFor=0;g.player = { ...t, walk: 0 }; g.remaining = remaining;
    g.interact(); g.update(4); assert.equal(g.state, expected);
  }
});
test('pausing freezes time, NPCs and player; finished games never update', () => {
  const g = new C.Game(); g.paused = true; const initial = JSON.stringify(g);
  g.update(20, { x: 1 }); g.interact(); assert.equal(JSON.stringify(g), initial);
  g.paused = false; g.update(g.limit+1); assert.equal(g.state, 'lost');
  const ended = JSON.stringify(g); g.update(100, { x: 1 }); g.interact(); assert.equal(JSON.stringify(g), ended);
});
test('companion bonus cannot be farmed; yield completes both rescues without a random loss', () => {
  const g = new C.Game(); g.update(5); const before = g.remaining; g.interact();
  assert.equal(g.map.buddy.active, true); assert.ok(Math.abs(g.remaining - before - 3) < 1e-6);
  g.interact(); assert.ok(Math.abs(g.remaining - before - 3) < 1e-6);
  walkRoute(g, g.map.toilets[g.map.safeId]); g.yieldBuddy(); assert.equal(g.mode, 'wait');
  g.map.shoppers=[];g.update(g.map.buddy.finishAt-g.elapsed + 3.2); assert.equal(g.state, 'won'); assert.equal(g.shared, true); assert.equal(g.title, '誰も置いていかない');
});
test('staff reveals locations at a one-time 2 second cost including fatal boundary', () => {
  const g = new C.Game(); g.player.x = g.map.staff.x; g.player.y = g.map.staff.y;
  const before = g.remaining; g.interact(); assert.equal(g.remaining, before - 2); assert.ok(g.map.toilets.every(t => t.discovered));
  g.interact(); assert.equal(g.remaining, before - 2);
  const fatal = new C.Game(); fatal.player.x = fatal.map.staff.x; fatal.player.y = fatal.map.staff.y; fatal.remaining = 1; fatal.interact(); assert.equal(fatal.state, 'lost');
});
test('walking collisions start timed conversations and cannot immediately repeat', () => {
  const g=new C.Game();g.map.shoppers=[{id:0,kind:'chatter',...g.player,path:[],goal:0,speed:0,cooldown:0}];
  g.update(.02,{x:1});assert.equal(g.mode,'talk');assert.equal(g.talkCount,1);
  g.update(g.talk.remaining+.05,{x:1,sprint:true});assert.equal(g.mode,'explore');assert.equal(g.talkCount,1);
  g.update(.1,{x:1});assert.equal(g.talkCount,1);
});
test('click movement refuses hidden destinations, follows visible paths and pauses safely', () => {
  const g = new C.Game(); assert.equal(g.setDestination({ x: 0, y: 0 }), false);
  const goal = { x: g.player.x + 1, y: g.player.y }; assert.equal(g.setDestination(goal), true);
  g.update(.6); assert.ok(C.distance(g.player, goal) < .1);
  g.paused = true; assert.equal(g.setDestination(g.player), false);
});
test('practice generates a small connected map; rebuilding a seed resets all events', () => {
  const g = new C.Game({ practice: true, difficulty: 'easy' }); assert.equal(g.limit, 90); assert.ok(g.map.w < 25); assert.equal(g.map.shoppers.length, 0);
  g.update(10); const newGame = new C.Game(g.options); assert.equal(newGame.remaining, 90); assert.equal(newGame.elapsed, 0); assert.equal(newGame.waited, 0);
});
