/* Survival terrain: rendered triangles, plants and collision use one height field. */
(()=>{'use strict';
const bossContentEnabled=false;
const T=THREE,anchor={x:211,z:191,y:NatureWorld.legacyHeight(211,191)};
const hash=NatureWorld.hash;
const naturalGround=(x,z)=>NatureWorld.height(x+anchor.x,z+anchor.z)-anchor.y;
const legacyGround=(x,z)=>NatureWorld.legacyHeight(x+anchor.x,z+anchor.z)-anchor.y;
const nativeBiome=(x,z)=>NatureWorld.biome(x+anchor.x,z+anchor.z).id;
const slope=(x,z,r=12)=>Math.max(...[[r,0],[-r,0],[0,r],[0,-r]].map(([dx,dz])=>Math.abs(naturalGround(x+dx,z+dz)-naturalGround(x,z))));
function findSite(biome,preferredAngle,minDistance=120){let best=null;for(let r=minDistance;r<=2600;r+=35){for(let n=0;n<48;n++){const a=n/48*Math.PI*2,x=Math.sin(a)*r,z=Math.cos(a)*r,h=legacyGround(x,z);if(h+anchor.y<12||biome&&NatureWorld.biome(x+anchor.x,z+anchor.z,h+anchor.y).id!==biome||Math.max(...[[15,0],[-15,0],[0,15],[0,-15]].map(([dx,dz])=>Math.abs(legacyGround(x+dx,z+dz)-h)))>6)continue;const angleDiff=Math.abs(Math.atan2(Math.sin(a-preferredAngle),Math.cos(a-preferredAngle)));const score=r+angleDiff*110;if(!best||score<best.score)best={x:Math.round(x),z:Math.round(z),score};}if(best&&r>best.score+80)break;}return best||{x:300*Math.sin(preferredAngle),z:300*Math.cos(preferredAngle)};}
const forest=findSite('forest',-Math.PI/2,130),desert=findSite('desert',Math.PI/2,180),jungle=findSite('forest',0,250),cave=findSite(null,-2.45,210),snow=findSite('alpine',2.4,280);
// Keep landmark coordinates stable for saves; recalculate their support heights.
const caveHalf=22;
let caveY=-Infinity;for(let x=-caveHalf;x<=caveHalf;x+=4)for(let z=-caveHalf;z<=caveHalf;z+=4)caveY=Math.max(caveY,naturalGround(cave.x+x,cave.z+z));caveY+=.3;
const islands=[{x:75,z:-56,r:9},{x:100,z:-81,r:11},{x:139,z:-112,r:25}];
let skyBase=-Infinity;for(const i of islands)for(let n=0;n<12;n++){const a=n/12*Math.PI*2;skyBase=Math.max(skyBase,naturalGround(i.x+Math.cos(a)*i.r,i.z+Math.sin(a)*i.r));}islands.forEach((i,n)=>i.y=skyBase+12+n*18);
let legacyCaveY=-Infinity,legacySkyBase=-Infinity;
for(let x=-caveHalf;x<=caveHalf;x+=4)for(let z=-caveHalf;z<=caveHalf;z+=4)legacyCaveY=Math.max(legacyCaveY,legacyGround(cave.x+x,cave.z+z));legacyCaveY+=.3;
for(const i of islands)for(let n=0;n<12;n++){const a=n/12*Math.PI*2;legacySkyBase=Math.max(legacySkyBase,legacyGround(i.x+Math.cos(a)*i.r,i.z+Math.sin(a)*i.r));}
const sites={forest,desert,jungle,cave,snow,sky:{x:islands[2].x,z:islands[2].z,y:islands[2].y}};
const water=4-anchor.y;
function inCave(x,z){return bossContentEnabled&&Math.abs(x-cave.x)<caveHalf&&Math.abs(z-cave.z)<caveHalf;}
function ground(x,z){return naturalGround(x,z);}
// This interpolation is also used by the visible entrance ramp.
function rampHeight(x,z){
 const u=(x-cave.x+5)/5, v=(z-cave.z-caveHalf)/(20/12), ix=Math.min(1,Math.max(0,Math.floor(u))), iz=Math.min(11,Math.max(0,Math.floor(v))), fx=u-ix,fz=v-iz;
 const vertex=(a,b)=>caveY+(ground(cave.x-5+a*5,cave.z+caveHalf+20)-caveY)*(b/12);
 const a=vertex(ix,iz),b=vertex(ix+1,iz),c=vertex(ix,iz+1),d=vertex(ix+1,iz+1);
 return fx+fz<=1?a+(b-a)*fx+(c-a)*fz:d+(c-d)*(1-fx)+(b-d)*(1-fz);
}
function onIsland(x,z,i){const dx=x-i.x,dz=z-i.z,step=Math.PI/8,a=((Math.atan2(dz,dx)%step)+step)%step;return Math.hypot(dx,dz)<=i.r*Math.cos(step/2)/Math.cos(a-step/2)-.01;}
function floor(x,z,y=0){
 let h=ground(x,z);
 if(inCave(x,z))h=Math.max(h,caveY);
 if(bossContentEnabled&&Math.abs(x-cave.x)<=caveHalf+2.5&&Math.abs(z-cave.z)<=caveHalf+2.5&&y>=caveY+13-.05)h=Math.max(h,caveY+13);
 const dz=z-cave.z-caveHalf;if(bossContentEnabled&&Math.abs(x-cave.x)<=5&&dz>=0&&dz<=20)h=Math.max(h,rampHeight(x,z));
 for(const i of islands)if(onIsland(x,z,i)&&y>=i.y-.05)h=Math.max(h,i.y);
 return h;
}
function upgradeTerrainSave(s){
 if(s.terrainVersion===2)return;
 const rebase=p=>{if(!p||!Number.isFinite(p.y))return;
  let old=Math.max(water+.15,legacyGround(p.x,p.z)),next=Math.max(water-1.2,ground(p.x,p.z));
  if(inCave(p.x,p.z)){old=Math.max(old,legacyCaveY);next=Math.max(next,caveY);if(p.y>=legacyCaveY+12.8){old=Math.max(old,legacyCaveY+13);next=Math.max(next,caveY+13);}}
  const dz=p.z-cave.z-caveHalf;if(Math.abs(p.x-cave.x)<5&&dz>=0&&dz<20){const t=dz/20;old=Math.max(old,legacyCaveY*(1-t)+legacyGround(p.x,cave.z+caveHalf+20)*t);next=Math.max(next,rampHeight(p.x,p.z));}
  islands.forEach((i,n)=>{const oldY=legacySkyBase+12+n*18;if(Math.hypot(p.x-i.x,p.z-i.z)<i.r&&p.y>=oldY-.8){old=Math.max(old,oldY);next=Math.max(next,i.y);}});
  p.y=next+Math.max(0,p.y-old);
 };
 [s,s.checkpoint,...s.structures,...s.piles,...s.jobs,...s.bags].forEach(rebase);s.terrainVersion=2;
}
function biome(x,z,y=0){if(islands.some(i=>Math.hypot(x-i.x,z-i.z)<i.r&&y>i.y-3))return'sky';if(inCave(x,z))return'cave';if(Math.hypot(x-jungle.x,z-jungle.z)<100)return'jungle';const b=nativeBiome(x,z);return b==='desert'?'desert':b==='snow'||b==='alpine'?'snow':'forest';}
const shrine={x:0,z:-7,y:naturalGround(0,-7)+.3},shop={x:14,z:9,y:naturalGround(14,9)+.2};
function excludeTree(east,north){const x=east-anchor.x,z=north-anchor.z;return Math.hypot(x-shop.x,z-shop.z)<9||(bossContentEnabled&&(Math.hypot(x,z)<24||Object.values(sites).some(s=>Math.hypot(x-s.x,z-s.z)<(s===cave?34:18))));}
// Keep the original two reachable islands, then spread a seeded sky archipelago across the world.
if(!bossContentEnabled)islands.splice(2,1);
for(let n=0;n<48;n++){const a=n*2.399963,r=600+Math.sqrt(n)*790,x=Math.round(Math.sin(a)*r),z=Math.round(Math.cos(a)*r),radius=10+hash(n,912)*22;islands.push({x,z,r:radius,y:Math.max(naturalGround(x,z),water)+80+hash(n,913)*150,variant:n%6});}
window.KomorebiSurvivalPlacement={excludeTree};
window.EmberTerrain={enemiesEnabled:false,bossContentEnabled,anchor,hash,ground,naturalGround,nativeBiome,slope,floor,onIsland,rampHeight,upgradeTerrainSave,biome,inCave,islands,sites,caveY,caveHalf,water,shrine,shop};
})();
