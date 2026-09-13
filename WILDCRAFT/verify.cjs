// Run with Node.js. Exercises the actual game logic and Three.js geometry in a
// lightweight DOM harness; browser rendering is checked separately.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const THREE = { ...require('./vendor/three.min.js') };
const elements = new Map(), scheduled = [], saved = new Map();
function element() {
  return { hidden: true, value: 'wildwood', innerHTML: '', textContent: '', style: {},
    classList: { add() {}, remove() {}, toggle() {} }, firstElementChild: {style:{}},
    addEventListener() {}, getContext: () => new Proxy({}, {get:()=>()=>{}}),
    toDataURL: () => 'data:image/png;base64,', requestPointerLock() {} };
}
THREE.WebGLRenderer = class {constructor(){this.info={render:{triangles:0}};}setPixelRatio(){}setSize(){}render(){}};
const context = {
  THREE, console, Uint8Array, Math, Number, Object, Array, Set, Map, String,
  document: {getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},
    createElement:element,querySelectorAll:()=>[],addEventListener(){},exitPointerLock(){},body:element()},
  innerWidth:1280,innerHeight:800,devicePixelRatio:1,HTMLInputElement:class{},
  localStorage:{setItem:(k,v)=>saved.set(k,v),getItem:k=>saved.get(k)||null},
  setTimeout:fn=>scheduled.push(fn),clearTimeout(){},requestAnimationFrame(){},
  matchMedia:()=>({matches:true}),confirm:()=>true,
};
context.window=context;context.addEventListener=()=>{};
vm.createContext(context);
const source=fs.readFileSync(__dirname+'/game.js','utf8');
const tests=`
sound=false;generate();started=true;paused=false;screen='game';
check(chunks.size===36,'36 terrain chunks generated');
check(world.reduce((a,b)=>a+!!b,0)>100000,'substantial voxel terrain generated');
check(!collision(player),'spawn has player clearance');
const original=world.slice();generate();check(original.every((v,i)=>world[i]===v),'world generation is deterministic');
for(const mesh of chunks.values()) {
 const p=mesh.geometry.attributes.position.array;
 check(p.every(Number.isFinite),'geometry positions are finite');
}
const origin=new THREE.Vector3(48.5,40,48.5);
const hit=rayVoxel(origin,new THREE.Vector3(0,-1,0),40);
check(!!hit&&hit.prev.y===hit.y+1,'axis-aligned ray hits top face without NaNs');
check(get(hit.x,hit.prev.y,hit.z)===0,'placement neighbor is empty');
check(!rayVoxel(new THREE.Vector3(-2,40,-2),new THREE.Vector3(0,1,0),5),'ray miss terminates');
inventory={};mode='survival';
setBlock(48,30,48,5);mineBlock({x:48,y:30,z:48,id:5});
check(!get(48,30,48)&&count(5)===1,'mining removes block and gives log');
craft(0);check(count(5)===0&&count(7)===4,'planks consume one log');
craft(0);check(count(7)===4,'crafting refuses missing materials');
inventory={7:20,stick:4};
check(!recipeAvailable(RECIPES[3]),'tool crafting requires nearby workbench');
const bx=Math.floor(player.x)+2,by=Math.floor(player.y),bz=Math.floor(player.z);
setBlock(bx,by,bz,12);craft(3);
check(count('woodpick')===1&&count(7)===17&&count('stick')===2,'workbench tool recipe works');
setBlock(bx,by+1,bz,3);mineBlock({x:bx,y:by+1,z:bz,id:3});
check(count(3)===1,'wooden pick collects stone');
setBlock(bx,by+1,bz,9);mineBlock({x:bx,y:by+1,z:bz,id:9});
check(count(9)===0,'wooden pick cannot collect iron');
inventory.stonepick=1;setBlock(bx,by+1,bz,9);mineBlock({x:bx,y:by+1,z:bz,id:9});
check(count(9)===1,'stone pick collects iron');
inventory.coal=2;check(!recipeAvailable(RECIPES[6]),'smelting requires nearby furnace');
setBlock(bx+1,by,bz,16);craft(6);
check(count('iron')===1&&count('coal')===1&&count(9)===0,'smelting consumes ore and fuel');
inventory[7]=2;selected=4;camera.position.copy(player).add(new THREE.Vector3(0,1.58,0));camera.rotation.set(-.6,-Math.PI/2,0);
const placeTarget=rayVoxel(camera.position,camera.getWorldDirection(new THREE.Vector3()),6);
check(!!placeTarget,'building ray finds a surface');
placeBlock();check(count(7)===1,'placing consumes exactly one block');
check(get(placeTarget.prev.x,placeTarget.prev.y,placeTarget.prev.z)===7,'block is placed against the target face');
camera.rotation.set(-Math.PI/2,0,0);const beforeSelf=count(7);placeBlock();
check(count(7)===beforeSelf,'placing inside player is refused without consuming material');
const yBefore=player.y;moveAxis('y',-20);check(player.y>=yBefore-.1,'ground collision prevents falling through');
health=10;hunger=8;inventory.apple=2;eat();check(health===12&&hunger===14&&count('apple')===1,'food restores health and hunger');
mode='creative';damage(9);check(health===12,'creative player is immune');
mode='survival';damage(2);check(health===10,'survival player takes damage');
saveWorld(true);const data=JSON.parse(localStorage.getItem(SAVE_KEY));
check(validSave(data),'saved state validates');
check(data.edits[idx(bx,by,bz)]===12&&data.inventory.iron===1,'world edits and inventory persist');
check(!validSave({...data,player:[-10,20,48]}),'out-of-bounds save is rejected');
check(!validSave({...data,edits:{9999999:1}}),'invalid edit indices are rejected');
health=0;resume();check(screen==='death'&&paused,'zero-health reload opens respawn screen');health=10;resume();
const saveX=player.x;player.x+=5;begin(true);
`;
let checks=0;context.check=(value,msg)=>{assert.ok(value,msg);checks++;};
vm.runInContext(source.replace(/\}\)\(\);\s*$/,tests+'})();'),context,{timeout:30000});
// Execute only the load callback (earlier timers are startup and toast callbacks).
scheduled.at(-1)();
const state=context.Wildcraft.getState();
assert.equal(state.inventory.iron,1);
assert.equal(state.mode,'survival');
assert.equal(state.position[0],JSON.parse(saved.get('wildcraft.world.v1')).player[0]);
console.log('PASS: '+(checks+3)+' checks — terrain, geometry, ray casting, mining, crafting, collision, food, damage, save and load.');
