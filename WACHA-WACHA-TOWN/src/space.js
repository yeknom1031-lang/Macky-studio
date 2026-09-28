(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WachaSpace=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 // Local personal space follows the person's route. Small sidesteps start immediately,
 // with firmer yielding before three seconds; the route itself stays continuous.
 function before(s,C){for(const p of s.people){
  const sx=p.separationX||0,sy=p.separationY||0;
  if(p.activity!=='ride'&&Math.hypot(sx,sy)>14&&s.elapsed>=(p.reanchorAt||0)){
   p.reanchorAt=s.elapsed+1.2;const x=p.x,y=p.y,node=C.nearest(s,x,y,s.graph.nodes[p.from].component),n=s.graph.nodes[node];
   if(Math.hypot(x-n.x,y-n.y)<Math.hypot(sx,sy)){
    const goal=p.goal,arrived=p.arrived,old=s.graph.nodes[p.to],dx=old.x-s.graph.nodes[p.from].x,dy=old.y-s.graph.nodes[p.from].y;
    C.place(s,p,node);p.to=n.links.reduce((a,b)=>{const A=s.graph.nodes[a],B=s.graph.nodes[b];return(B.x-n.x)*dx+(B.y-n.y)*dy>(A.x-n.x)*dx+(A.y-n.y)*dy?b:a;},n.links[0]);
    if(goal>=0&&!arrived)C.route(s,p,goal);p.arrived=arrived;p.separationX=x-n.x;p.separationY=y-n.y;p.x=x;p.y=y;
   }
  }
  p.x-=p.separationX||0;p.y-=p.separationY||0;if(p.activity==='ride'){p.separationX*=.92;p.separationY*=.92;}
 }}
 function metric(p,q){const h=(p.height+q.height)/2,rx=23*h,ry=25*h,dx=q.x-p.x,dy=(q.y-18*q.height)-(p.y-18*p.height);return{dx,dy,rx,ry,d:Math.hypot(dx/rx,dy/ry)};}
 function pairs(people){const bins=new Map(),result=[];for(const p of people){const x=Math.floor(p.x/40),y=Math.floor((p.y-18*p.height)/40);for(let yy=y-1;yy<=y+1;yy++)for(let xx=x-1;xx<=x+1;xx++)for(const q of bins.get(xx+','+yy)||[])if(metric(p,q).d<1.08)result.push([q,p]);const k=x+','+y;if(!bins.has(k))bins.set(k,[]);bins.get(k).push(p);}return result;}
 function after(s,dt,C,initial=false){
  const space=s.space||(s.space={ages:new Map(),resolved:0,maxAge:0}),orig=s.people.map(p=>({x:p.x,y:p.y}));
  for(const p of s.people){p.separationX=p.separationX||0;p.separationY=p.separationY||0;p.x+=p.separationX;p.y+=p.separationY;}
  const start=s.people.map(p=>({x:p.x,y:p.y})),overdue=new Set();
  // Measure the final, actually displayed positions. Intermediate path positions
  // can briefly separate a pair before another neighbor pushes them together.
  for(const [key,age] of space.ages)if(age>1.8){overdue.add(Math.floor(key/1000));overdue.add(key%1000);}
  for(let pass=0;pass<(initial||overdue.size?24:6);pass++){
   for(const [p,q] of pairs(s.people)){
    const m=metric(p,q);if(m.d>=1.045)continue;
    const age=space.ages.get(p.id*1000+q.id)||0;
    let ux=m.dx/m.rx,uy=m.dy/m.ry,d=m.d;
    if(d<.001){const angle=(p.id*2.399+q.id*.781)%6.283;ux=Math.cos(angle);uy=Math.sin(angle);d=1;}
    const gain=initial||overdue.size?1:age>1.3?.95:.5;
    const dx=ux/d*(1.05-m.d)*m.rx*.5*gain,dy=uy/d*(1.05-m.d)*m.ry*.5*gain;
    // Even passengers can shuffle along their seat when two rides pass.
    const wp=p.activity==='ride'&&q.activity!=='ride'?.08:q.activity==='ride'&&p.activity!=='ride'?1.92:1,wq=2-wp;
    p.x-=dx*wp;p.y-=dy*wp;q.x+=dx*wq;q.y+=dy*wq;
   }
   for(const p of s.people){p.x=Math.max(10,Math.min(C.WIDTH-10,p.x));p.y=Math.max(20*p.height,Math.min(C.HEIGHT-5,p.y));}
  }
  for(const p of s.people){const old=start[p.id],base=orig[p.id],dx=p.x-old.x,dy=p.y-old.y,d=Math.hypot(dx,dy),limit=initial?Infinity:overdue.has(p.id)?Math.max(14,dt*72):dt*48;
   if(d>limit){p.x=old.x+dx/d*limit;p.y=old.y+dy/d*limit;}
   p.x=Math.max(10,Math.min(C.WIDTH-10,p.x));p.y=Math.max(20*p.height,Math.min(C.HEIGHT-5,p.y));
   p.separationX=p.x-base.x;p.separationY=p.y-base.y;
   if(d>.08&&!initial){p.yieldingUntil=s.elapsed+.15;p.phase=(p.phase+dt*.6)%1;if(Math.abs(dx)>.2)p.facing=dx<0?-1:1;}
  }
  const next=new Map();for(const [p,q] of pairs(s.people))if(metric(p,q).d<1){const key=p.id*1000+q.id,age=(space.ages.get(key)||0)+dt;next.set(key,age);space.maxAge=Math.max(space.maxAge,age);}
  for(const key of space.ages.keys())if(!next.has(key))space.resolved++;
  space.ages=next;
 }
 return{before,after,metric};
});
