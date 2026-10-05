const test = require('node:test');
const assert = require('node:assert/strict');
const B = require('./engine.js');
const arena = () => ({ id:'test', name:'テスト', theme:'garden', grid:B.baseGrid(false), spawns:[{x:1,y:1},{x:13,y:9}] });
const match = (options={}) => { const game=new B.Game(arena(),{random:()=>.9,...options});game.start();return game; };
const tick = (game,seconds) => { for(let n=0;n<Math.ceil(seconds/.02);n++)game.update(.02); };

test('all three themes have valid connected spawns and escape routes for 100 seeds',()=>{
  for(const theme of Object.keys(B.THEMES))for(let seed=0;seed<100;seed++)assert.equal(B.validateStage(B.createStage(theme,seed)),'');
});
test('small, large, rectangular and even-sized stages remain playable',()=>{
  for(const [width,height]of[[7,7],[8,8],[10,12],[31,25],[7,25],[31,7]])for(let seed=0;seed<20;seed++){
    const stage=B.createStage('garden',seed,width,height);assert.equal(B.validateStage(stage),'');const game=new B.Game(stage);assert.equal(game.width,width);assert.equal(game.height,height);
    assert.equal(game.blastCells({x:1,y:1,weapon:'line'}).length,width-2);assert.equal(game.blastCells({x:1,y:1,weapon:'vertical'}).length,height-2);
  }
});
test('resizing preserves interior tiles and relocates clipped spawns within the new border',()=>{
  const stage=arena();stage.grid[3][3]=2;const expanded=B.resizeStage(stage,21,17);assert.equal(expanded.grid[3][3],2);assert.equal(B.validateStage(expanded),'');
  const smaller=B.resizeStage(stage,7,8);assert.equal(smaller.grid[3][3],2);assert.equal(smaller.spawns[1].x,5);assert.equal(smaller.spawns[1].y,6);assert.equal(B.validateStage(smaller),'');
  assert.ok(!B.validSize(6,9));assert.ok(!B.validSize(32,9));assert.ok(!B.validSize(11,26));assert.ok(!B.validSize(11.5,9));assert.throws(()=>B.baseGrid(false,5,5));
});
test('invalid maps, duplicate spawns, disconnected rivals and sealed starts are rejected',()=>{
  assert.ok(B.validateStage({}));let stage=arena();stage.spawns.push({x:1,y:1});assert.ok(B.validateStage(stage));
  stage=arena();for(let x=1;x<14;x++)stage.grid[5][x]=1;assert.ok(B.validateStage(stage));
  stage=arena();stage.grid[1][2]=1;stage.grid[2][1]=1;assert.ok(B.validateStage(stage));
  stage=arena();stage.grid[1][2]=0;stage.grid[1][3]=2;stage.grid[2][1]=2;stage.grid[2][2]=1;assert.ok(B.validateStage(stage));
});
test('normal blasts stop at a wall or the first destructible block',()=>{
  const game=match();game.grid[4][5]=1;game.grid[5][6]=2;const cells=game.blastCells({x:5,y:5,power:4,weapon:'normal'}).map(p=>B.key(p.x,p.y));
  assert.ok(!cells.includes('5,4'));assert.ok(cells.includes('6,5'));assert.ok(!cells.includes('7,5'));
});
test('horizontal bomb destroys the complete row beyond both blocks and solid walls',()=>{
  const game=match({weapon:'line'});game.player.x=7;game.player.y=5;for(let x=1;x<14;x++)game.grid[5][x]=x===7?0:x===4?1:2;game.placeBomb();
  const cells=game.blastCells(game.bombs[0]);assert.equal(cells.length,13);assert.deepEqual(cells.map(p=>p.x),Array.from({length:13},(_,i)=>i+1));
  game.explode(game.bombs[0]);assert.equal(game.grid[5][4],1);for(let x=1;x<14;x++)if(x!==4)assert.equal(game.grid[5][x],0);assert.equal(game.flames.length,13);
});
test('vertical bomb destroys the complete column without affecting neighboring columns',()=>{
  const game=match({weapon:'vertical'});game.player.x=7;game.player.y=5;for(let y=1;y<10;y++){game.grid[y][7]=y===5?0:y===4?1:2;game.grid[y][6]=2;}game.placeBomb();
  const cells=game.blastCells(game.bombs[0]);assert.equal(cells.length,9);assert.ok(cells.every(p=>p.x===7));game.explode(game.bombs[0]);
  for(let y=1;y<10;y++){assert.equal(game.grid[y][7],y===4?1:0);assert.equal(game.grid[y][6],2);}
});
test('drill blasts pierce crates but not permanent walls',()=>{const game=match();game.grid[5][6]=2;game.grid[5][7]=2;game.grid[5][8]=1;const cells=game.blastCells({x:5,y:5,power:4,weapon:'pierce'}).map(p=>B.key(p.x,p.y));assert.ok(cells.includes('7,5'));assert.ok(!cells.includes('8,5'));});
test('bomb capacity, solid bombs, escape from a placed bomb, and chain reactions work',()=>{
  const game=match();assert.ok(game.placeBomb());assert.equal(game.placeBomb(),false);assert.ok(game.move(game.player,1,0));game.player.cooldown=0;assert.equal(game.move(game.player,-1,0),false);
  game.player.capacity=2;assert.ok(game.placeBomb());assert.equal(game.bombs.length,2);game.explode(game.bombs[0]);assert.equal(game.bombs.length,0);assert.equal(game.events.filter(e=>e.type==='explode').length,2);
});
test('a bomb detonates after its fuse, with player damage and invulnerability',()=>{
  const game=match();game.actors[1].think=100;game.placeBomb();tick(game,2.2);assert.equal(game.bombs.length,1);tick(game,.14);assert.equal(game.bombs.length,0);assert.equal(game.player.hp,2);tick(game,.4);assert.equal(game.player.hp,2);
});
test('Paku eats nearby bombs, clears the entire row, protects its owner, and has a cooldown',()=>{
  const game=match();game.player.invincible=0;game.grid[1][8]=2;game.placeBomb();assert.equal(game.useEgg(),'');assert.equal(game.bombs.length,0);assert.equal(game.grid[1][8],0);assert.equal(game.player.hp,3);assert.equal(game.eggCooldown,7);assert.ok(game.useEgg().includes('ひとやすみ'));
});
test('Paku cannot eat a distant bomb or a bomb behind a wall',()=>{
  const game=match();game.bombs.push({id:9,x:4,y:1,timer:2,power:2,weapon:'normal',owner:1});assert.ok(game.useEgg());game.bombs[0].x=3;game.grid[1][2]=1;assert.ok(game.useEgg());assert.equal(game.bombs.length,1);
});
test('shield blocks one explosion and speed egg reduces movement delay',()=>{
  const shield=match({egg:'shield'});shield.player.invincible=0;shield.flames=[{x:1,y:1,timer:.5}];shield.checkDamage();assert.equal(shield.player.hp,3);assert.equal(shield.eggCooldown,12);shield.player.invincible=0;shield.checkDamage();assert.equal(shield.player.hp,2);
  const normal=match(),speed=match({egg:'speed'});normal.move(normal.player,1,0);speed.move(speed.player,1,0);assert.ok(speed.player.cooldown<normal.player.cooldown);
});
test('pause freezes bombs and time; timeout and player death lose; final rival elimination wins',()=>{
  const paused=match();paused.placeBomb();paused.status='paused';tick(paused,3);assert.equal(paused.time,150);assert.equal(paused.bombs[0].timer,2.3);
  const timeout=match();timeout.time=.01;tick(timeout,.02);assert.equal(timeout.status,'lost');const won=match();won.actors[1].alive=false;won.checkEnd();assert.equal(won.status,'won');const lost=match();lost.player.alive=false;lost.checkEnd();assert.equal(lost.status,'lost');
});
test('simultaneous last-rival elimination and player death resolve as a loss',()=>{
  const game=match();game.player.invincible=0;game.player.hp=1;game.bombs=[{id:1,x:13,y:9,owner:0,timer:0,power:2,weapon:'normal'},{id:2,x:1,y:1,owner:1,timer:0,power:2,weapon:'normal'}];game.update(.02);assert.equal(game.status,'lost');
});
test('items increase stats with bounds, and waiting on a revealed item collects it',()=>{
  const game=match();for(const kind of['power','capacity','speed']){game.items=[{x:1,y:1,kind,delay:0}];game.collect();}assert.equal(game.player.power,3);assert.equal(game.player.capacity,2);assert.equal(game.player.speed,1);game.player.hp=2;game.items=[{x:1,y:1,kind:'heart',delay:.01}];game.update(.02);assert.equal(game.player.hp,3);assert.equal(game.items.length,0);
});
test('CPU places bombs and escapes its own blast without freezing simulation',()=>{
  const stage=B.createStage('garden',17),game=new B.Game(stage,{random:B.rng(5)});game.start();const actors=game.actors.slice(1);tick(game,8);assert.ok(game.events.some(e=>e.type==='place'));assert.ok(actors.some(a=>a.x!==stage.spawns[a.id].x||a.y!==stage.spawns[a.id].y));assert.ok(game.time<143);
});
