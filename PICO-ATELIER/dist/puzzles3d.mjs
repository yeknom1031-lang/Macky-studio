export const index3 = (x,y,z,n) => x+n*(y+n*z);
export function coordinates(i,n){return [i%n,Math.floor(i/n)%n,Math.floor(i/(n*n))];}
const definitions = [
  [3,'チェア',(x,y,z)=>y===1||(y===2&&z===2)||(y===0&&x!==1&&z!==1)],
  [3,'階段',(x,y,z)=>y<=x],
  [3,'クロス',(x,y,z)=>Number(x===1)+Number(y===1)+Number(z===1)>=2],
  [3,'ゲート',(x,y,z)=>z===1&&(x!==1||y===2)],
  [4,'ソファ',(x,y,z)=>z>=1&&(y===1||(y>=2&&z===3)||(y===2&&(x===0||x===3))||(y===0&&(x===0||x===3)&&(z===1||z===3)))],
  [4,'ピラミッド',(x,y,z)=>y===0||(y<=2&&x>=1&&x<=2&&z>=1&&z<=2)],
  [4,'ロボット',(x,y,z)=>(y===3&&z>=1&&z<=2)||(y>=1&&y<=2&&x>=1&&x<=2&&z>=1&&z<=2)||(y===0&&(x===1||x===2)&&z===1)||(y===1&&z===1)],
  [4,'アーチ',(x,y,z)=>z>=1&&z<=2&&(y===3||x===0||x===3)],
  [5,'もみの木',(x,y,z)=>z>=1&&z<=3&&(y===0?x===2:y===1?true:y<=3?x>=1&&x<=3:x===2)],
  [5,'ハート',(x,y,z)=>z>=1&&z<=3&&['00100','01110','11111','11111','01010'][y][x]==='1'],
  [5,'お城',(x,y,z)=>y<=2?((x===0||x===4||z===0||z===4)&&(y!==0||(x===0||x===4||z!==0))):y===3?(x===0||x===4)&&(z===0||z===4):(x===0||x===4)&&(z===0||z===4)],
  [5,'コーヒーカップ',(x,y,z)=>y===0?(x<=3&&z>=1&&z<=3):y<=3?((x===0||x===3||z===1||z===3)&&x<=3&&z>=1&&z<=3)||(x===4&&z===2&&(y===1||y===3)):false],
];
export const puzzles3d=definitions.map(([size,name,fn],number)=>({id:`3d-${number+1}`,number:number+1,size,name,
  solution:Array.from({length:size**3},(_,i)=>Number(!!fn(...coordinates(i,size)))),
  color:['#a1b96e','#efaf8f','#8caebb'][Math.floor(number/4)]}));
export function lineIds(axis,point,n){return Array.from({length:n},(_,k)=>{const p=[...point];p[axis]=k;return index3(...p,n);});}
export function runs(bits){const out=[];let count=0;for(const bit of bits){if(bit===1)count++;else if(count){out.push(count);count=0;}}if(count)out.push(count);return out.length?out:[0];}
export function allLines(puzzle){const n=puzzle.size,result=[];for(let axis=0;axis<3;axis++)for(let a=0;a<n;a++)for(let b=0;b<n;b++){const point=[0,0,0];point[(axis+1)%3]=a;point[(axis+2)%3]=b;const ids=lineIds(axis,point,n);result.push({axis,ids,clue:runs(ids.map(i=>puzzle.solution[i]))});}return result;}
export class Game3D{
  constructor(puzzle,saved){this.puzzle=puzzle;this.cells=Array(puzzle.size**3).fill(0);this.status='ready';this.remaining=1800;this.mistakes=0;this.hints=0;
    if(saved?.id===puzzle.id&&saved.cells?.length===this.cells.length&&saved.cells.every(v=>[-1,0,1].includes(v))&&Number.isFinite(saved.remaining)&&saved.remaining>0&&saved.remaining<=1800&&['playing','paused'].includes(saved.status)){
      this.cells=[...saved.cells];this.remaining=saved.remaining;this.mistakes=Number(saved.mistakes)||0;this.hints=Number(saved.hints)||0;this.status='paused';
    }
  }
  start(){if(['ready','paused'].includes(this.status))this.status='playing';}
  pause(){if(this.status==='playing')this.status='paused';}
  tick(seconds){if(this.status!=='playing')return;this.remaining=Math.max(0,this.remaining-seconds);if(this.remaining===0)this.status='lost';}
  act(i,tool){
    if(this.status!=='playing'||!Number.isInteger(i)||i<0||i>=this.cells.length||this.cells[i]===-1)return 'ignored';
    if(tool==='keep'&&this.cells[i]===1){this.cells[i]=0;return 'unmarked';}
    const solid=this.puzzle.solution[i]===1;
    if((tool==='remove'&&solid)||(tool==='keep'&&!solid)){
      const penalty=[120,240,480][Math.min(this.mistakes,2)];this.mistakes++;this.remaining=Math.max(0,this.remaining-penalty);if(!this.remaining)this.status='lost';return penalty;
    }
    this.cells[i]=tool==='remove'?-1:1;this.check();return tool==='remove'?'removed':'marked';
  }
  hint(point,free=false){
    if(this.status!=='playing'||point.length!==3||point.some(k=>!Number.isInteger(k)||k<0||k>=this.puzzle.size))return false;
    if(free&&(this.hints||this.remaining!==1800||this.cells.some(Boolean)))return false;
    if(!free&&this.remaining<=300)return false;
    if(!free)this.remaining-=300;this.hints++;
    for(let axis=0;axis<3;axis++)for(const i of lineIds(axis,point,this.puzzle.size))this.cells[i]=this.puzzle.solution[i]?1:-1;
    this.check();return true;
  }
  check(){if(this.puzzle.solution.every((v,i)=>v?this.cells[i]!==-1:this.cells[i]===-1))this.status='won';}
  snapshot(){return {id:this.puzzle.id,cells:this.cells,status:this.status,remaining:this.remaining,mistakes:this.mistakes,hints:this.hints};}
}
