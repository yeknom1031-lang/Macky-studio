/* Add-on coordinates. NatureWorld's terrain, vegetation, water, wildlife and sky remain the original implementation. */
(()=>{'use strict';
const T=THREE,anchor={x:211,z:191,y:NatureWorld.height(211,191)};
const hash=NatureWorld.hash;
const naturalGround=(x,z)=>NatureWorld.height(x+anchor.x,z+anchor.z)-anchor.y;
const nativeBiome=(x,z)=>NatureWorld.biome(x+anchor.x,z+anchor.z).id;
const slope=(x,z,r=12)=>Math.max(...[[r,0],[-r,0],[0,r],[0,-r]].map(([dx,dz])=>Math.abs(naturalGround(x+dx,z+dz)-naturalGround(x,z))));
function findSite(biome,preferredAngle,minDistance=120){let best=null;for(let r=minDistance;r<=2600;r+=35){for(let n=0;n<48;n++){const a=n/48*Math.PI*2,x=Math.sin(a)*r,z=Math.cos(a)*r,h=naturalGround(x,z);if(NatureWorld.height(x+anchor.x,z+anchor.z)<12||biome&&nativeBiome(x,z)!==biome||slope(x,z,15)>6)continue;const angleDiff=Math.abs(Math.atan2(Math.sin(a-preferredAngle),Math.cos(a-preferredAngle)));const score=r+angleDiff*110;if(!best||score<best.score)best={x:Math.round(x),z:Math.round(z),score};}if(best&&r>best.score+80)break;}return best||{x:300*Math.sin(preferredAngle),z:300*Math.cos(preferredAngle)};}
const forest=findSite('forest',-Math.PI/2,130),desert=findSite('desert',Math.PI/2,180),jungle=findSite('forest',0,250),cave=findSite(null,-2.45,210),snow=findSite('alpine',2.4,280);
// Keep the underground chamber above the untouched terrain; its entrance is reached by a stone ramp.
const caveHalf=22;
let caveY=-Infinity;for(let x=-caveHalf;x<=caveHalf;x+=4)for(let z=-caveHalf;z<=caveHalf;z+=4)caveY=Math.max(caveY,naturalGround(cave.x+x,cave.z+z));caveY+=.3;
const islands=[{x:75,z:-56,r:9},{x:100,z:-81,r:11},{x:139,z:-112,r:25}];
let skyBase=-Infinity;for(const i of islands)for(let n=0;n<12;n++){const a=n/12*Math.PI*2;skyBase=Math.max(skyBase,naturalGround(i.x+Math.cos(a)*i.r,i.z+Math.sin(a)*i.r));}islands.forEach((i,n)=>i.y=skyBase+12+n*18);
const sites={forest,desert,jungle,cave,snow,sky:{x:islands[2].x,z:islands[2].z,y:islands[2].y}};
const water=4-anchor.y;
function inCave(x,z){return Math.abs(x-cave.x)<caveHalf&&Math.abs(z-cave.z)<caveHalf;}
function ground(x,z){return naturalGround(x,z);}
function floor(x,z,y=0){let h=Math.max(water+.15,ground(x,z));if(inCave(x,z)){h=Math.max(h,caveY);if(y>=caveY+12.8)h=Math.max(h,caveY+13);}const dz=z-(cave.z+caveHalf);if(Math.abs(x-cave.x)<5&&dz>=0&&dz<20){const t=dz/20;h=Math.max(h,caveY*(1-t)+ground(x,cave.z+caveHalf+20)*t);}for(const i of islands)if(Math.hypot(x-i.x,z-i.z)<i.r-.45&&y>=i.y-.8)h=Math.max(h,i.y);return h;}
function biome(x,z,y=0){if(islands.some(i=>Math.hypot(x-i.x,z-i.z)<i.r&&y>i.y-3))return'sky';if(inCave(x,z))return'cave';if(Math.hypot(x-jungle.x,z-jungle.z)<100)return'jungle';const b=nativeBiome(x,z);return b==='desert'?'desert':b==='snow'||b==='alpine'?'snow':'forest';}
const shrine={x:0,z:-7,y:naturalGround(0,-7)+.3},shop={x:14,z:9,y:naturalGround(14,9)+.2};
function excludeTree(east,north){const x=east-anchor.x,z=north-anchor.z;return Math.hypot(x,z)<24||Object.values(sites).some(s=>Math.hypot(x-s.x,z-s.z)<(s===cave?34:18));}
window.KomorebiSurvivalPlacement={excludeTree};
window.EmberTerrain={anchor,hash,ground,naturalGround,nativeBiome,slope,floor,biome,inCave,islands,sites,caveY,caveHalf,water,shrine,shop};
})();
