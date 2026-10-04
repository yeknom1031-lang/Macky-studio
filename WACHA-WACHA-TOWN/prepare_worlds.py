"""Extract connected pavement and water routes from the accepted painted maps.

Source images are never altered. Debug overlays are separate review artifacts.
"""
import json
from collections import deque
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parent
PROD=ROOT/'assets/production'

def component_grid(mask, width, height, step=12):
    points=set()
    for y in range(12,height-12,step):
        for x in range(12,width-12,step):
            if mask[y-5:y+6,x-5:x+6].mean()>.55:points.add((x,y))
    groups=[]
    while points:
        first=min(points);points.remove(first);queue=deque([first]);group=[first]
        while queue:
            x,y=queue.popleft()
            for q in ((x+step,y),(x-step,y),(x,y+step),(x,y-step)):
                if q in points:points.remove(q);queue.append(q);group.append(q)
        groups.append(group)
    return sorted(groups,key=len,reverse=True)

def measure(path,w,h,all_pavement=False):
    im=Image.open(path).convert('RGB');a=np.asarray(im).astype(float);r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
    high,low=a.max(2),a.min(2)
    stone=(r>130)&(g>118)&(b>89)&(r>=g*.96)&(g>=b*.99)&(r>b*1.025)&((high-low)/np.maximum(high,1)<.32)
    if path.stem.startswith('S18'):stone=(r>160)&(g>128)&(b>90)&(r>g)&(g>b)&((high-low)/np.maximum(high,1)<.46)
    if path.stem.startswith('S19'):
        stone=(low>165)&((high-low)/np.maximum(high,1)<.17)
        # Snow-covered roofs and the sky share the pavement palette, but are not ground.
        stone[:round(im.height*.075)]=False
        for x0,y0,x1,y1 in [(.59,.075,.70,.20),(.105,.105,.30,.335),(.395,.12,.595,.34),(.70,.105,.91,.335),(.12,.445,.30,.65),(.40,.445,.595,.65),(.70,.445,.91,.65)]:
            stone[round(y0*im.height):round(y1*im.height),round(x0*im.width):round(x1*im.width)]=False
    groups=component_grid(stone,*im.size)
    if not groups or len(groups[0])<150:raise ValueError(f'{path.stem}: pavement needs manual navigation review')
    # Keep the connected main street; pale disconnected roofs are not streets.
    kept=sorted(p for group in (groups if all_pavement else groups[:1]) if len(group)>=4 for p in group);lookup={p:i for i,p in enumerate(kept)};nodes=[];sx=w/im.width;sy=h/im.height
    for x,y in kept:
        links=[]
        for dx,dy in [(12,0),(-12,0),(0,12),(0,-12),(12,12),(12,-12),(-12,12),(-12,-12)]:
            q=(x+dx,y+dy)
            if q in lookup and (not dx or not dy or ((x+dx,y) in lookup and (x,y+dy) in lookup)):links.append(lookup[q])
        nodes.append([round(x*sx,2),round(y*sy,2),links,0])
    blue=(g>r*1.04)&(b>r*1.07)&(b>110)&(g>115)
    if all_pavement:
        from water_spaces import allowed_water
        blue &= allowed_water(path.stem[:3],im.size)
    waters=component_grid(blue,*im.size)
    water=[]
    if waters and len(waters[0])>=20:
        wet=set(waters[0]);shore=min(wet,key=lambda p:min((p[0]-q[0])**2+(p[1]-q[1])**2 for q in kept[::3]))
        parents={shore:None};queue=deque([shore]);last=shore
        while queue:
            last=queue.popleft();x,y=last
            for q in [(x+12,y),(x-12,y),(x,y+12),(x,y-12)]:
                if q in wet and q not in parents:parents[q]=last;queue.append(q)
        samples=[]
        while last is not None:samples.append(last);last=parents[last]
        water=[[round(x*sx,2),round(y*sy,2)] for x,y in reversed(samples)]
    overlay=im.copy();d=ImageDraw.Draw(overlay)
    for x,y in kept:d.ellipse((x-2,y-2,x+2,y+2),fill='#ff4060')
    overlay.thumbnail((1100,700))
    return nodes,water,overlay,[len(g) for g in groups[:8]]

def build():
    folder=PROD/'navigation';folder.mkdir(exist_ok=True);review=PROD/'review';review.mkdir(exist_ok=True)
    data=json.loads((PROD/'jobs.json').read_text());report=[]
    old=['01-festival','02-garden','03-seaside','04-sweets','05-autumn','06-snow','07-lantern']
    for s in data['stages']:
        key=f'S{s["id"]+1:02}';path=ROOT/'assets'/f'{old[s["id"]]}.png' if s['id']<7 else PROD/'source'/f'{key}-background.png'
        if not path.exists():continue
        scale=s['area']**.5;nodes,water,overlay,groups=measure(path,round(1672*scale),round(941*scale))
        if s['id']>=7:(folder/f'{key}.json').write_text(json.dumps(nodes,separators=(',',':')))
        (folder/f'{key}-water.json').write_text(json.dumps(water,separators=(',',':')))
        overlay.save(review/f'{key}-navigation.jpg',quality=88)
        report.append(dict(stage=key,nodes=len(nodes),waterPoints=len(water),components=groups,review='pending'))
    (folder/'report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))



def connect_activity_areas(nodes,areas,w,h,blocked=None,water_mask=None):
    """Add measured open floors and their visible doorway/stair connections."""
    from living_spaces import floor_contains,inside,touches_hole
    sx=w/1672;sy=h/941
    ground_areas=[a for a in areas if not a.get('level')]
    def eligible(n):
        x=n[0]/sx;y=n[1]/sy
        if y<25 or any(touches_hole(x,y,h) for a in ground_areas for h in a.get('holes',[])):return False
        return not any(inside(x,y,p) for p in blocked or []) or any(floor_contains(a,x,y) for a in ground_areas)
    keep=[i for i,n in enumerate(nodes) if eligible(n)];remap={old:i for i,old in enumerate(keep)}
    nav=[[nodes[i][0],nodes[i][1],[remap[j] for j in nodes[i][2] if j in remap],0,None] for i in keep]
    lookup={(round(n[0],2),round(n[1],2),0):i for i,n in enumerate(nav)}
    def add(x,y,level,area=None):
        key=(round(x*sx,2),round(y*sy,2),level)
        if key not in lookup:lookup[key]=len(nav);nav.append([key[0],key[1],[],level,area])
        index=lookup[key]
        if area is not None:nav[index][4]=area
        return index
    def link(a,b):
        if a!=b:
            if b not in nav[a][2]:nav[a][2].append(b)
            if a not in nav[b][2]:nav[b][2].append(a)
    # Join neighbouring pavement islands across painted shadows/lamps. Only
    # distinct components are connected, and every sample avoids walls and water.
    parent=list(range(len(nav)))
    def root(i):
        while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
        return i
    def union(i,j):parent[root(i)]=root(j)
    for i,n in enumerate(nav):
        for j in n[2]:union(i,j)
    bins={}
    for i,n in enumerate(nav):bins.setdefault((int(n[0]/sx//120),int(n[1]/sy//120)),[]).append(i)
    candidates=[]
    for i,n in enumerate(nav):
        x=n[0]/sx;y=n[1]/sy;bx=int(x//120);by=int(y//120)
        for yy in range(by-1,by+2):
            for xx in range(bx-1,bx+2):
                for j in bins.get((xx,yy),[]):
                    if j<=i or root(i)==root(j):continue
                    q=nav[j];distance=((q[0]/sx-x)**2+(q[1]/sy-y)**2)**.5
                    if distance<=120:candidates.append((distance,i,j))
    for distance,i,j in sorted(candidates):
        if root(i)==root(j):continue
        a=nav[i];b=nav[j];safe=True
        for t in np.linspace(0,1,max(3,int(distance/4))):
            x=a[0]+(b[0]-a[0])*t;y=a[1]+(b[1]-a[1])*t
            if not eligible([x,y]):safe=False;break
            if water_mask is not None:
                yy=min(water_mask.shape[0]-1,max(0,round(y/h*water_mask.shape[0])));xx=min(water_mask.shape[1]-1,max(0,round(x/w*water_mask.shape[1])))
                if water_mask[yy,xx]:safe=False;break
        if safe:link(i,j);union(i,j)
    road_groups={}
    for i,n in enumerate(nav):
        if not any(inside(n[0]/sx,n[1]/sy,p) for p in blocked or []):road_groups.setdefault(root(i),[]).append(i)
    original_ground=max(road_groups.values(),key=len);result=[]
    for area in areas:
        level=area.get('level',0);points={};poly=area['polygon'];x0=min(p[0] for p in poly);x1=max(p[0] for p in poly);y0=min(p[1] for p in poly);y1=max(p[1] for p in poly)
        for y in range(int(y0//12)*12,int(y1)+1,12):
            for x in range(int(x0//12)*12,int(x1)+1,12):
                if floor_contains(area,x,y) and not any(touches_hole(x,y,hole) for other in areas if other.get('level',0)==level and other is not area for hole in other.get('holes',[])):points[(x,y)]=add(x,y,level,area['id'])
        for (x,y),n in points.items():
            for dx,dy in [(12,0),(0,12),(12,12),(-12,12)]:
                q=(x+dx,y+dy)
                if q in points and floor_contains(area,x+dx/2,y+dy/2) and (not dx or not dy or ((x+dx,y) in points and (x,y+dy) in points)):link(n,points[q])
        if not points:continue
        entries=[]
        for path in area.get('entries',[]):
            first=path[0]
            if level:
                connected={original_ground[0]};todo=deque(connected)
                while todo:
                    at=todo.popleft()
                    for q in nav[at][2]:
                        if q not in connected:connected.add(q);todo.append(q)
                approaches=[i for i in connected if nav[i][3]==0]
            else:approaches=original_ground
            bottom=min(approaches,key=lambda i:(nav[i][0]-first[0]*sx)**2+(nav[i][1]-first[1]*sy)**2);route=[bottom];last=bottom
            for segment,(a,b) in enumerate(zip(path,path[1:])):
                distance=((b[0]-a[0])**2+(b[1]-a[1])**2)**.5;steps=max(1,int(distance/7))
                for tick in range(1,steps+1):
                    t=tick/steps;x=a[0]+(b[0]-a[0])*t;y=a[1]+(b[1]-a[1])*t
                    node_level=level if level else 0
                    n=add(x,y,node_level,area['id']);link(last,n);route.append(n);last=n
            final=path[-1];target=min(points.values(),key=lambda i:(nav[i][0]-final[0]*sx)**2+(nav[i][1]-final[1]*sy)**2);link(last,target);route.append(target);entries.append(route)
        result.append({**area,'polygon':[[x*sx,y*sy] for x,y in poly],'holes':[[[x*sx,y*sy] for x,y in h] for h in area.get('holes',[])],'contacts':[{**c,'x':c['x']*sx,'y':c['y']*sy} for c in area.get('contacts',[])],'nodeIds':list(points.values()),'entryRoutes':entries,'actorScale':1,'foreground':[{'polygon':[[x*sx,y*sy] for x,y in f['polygon']],'depthY':f['depthY']*sy} if isinstance(f,dict) else [[x*sx,y*sy] for x,y in f] for f in area.get('foreground',[])]})
    # Isolated pixels/very narrow strips behind furniture are not usable floor.
    # Every retained floor and stair must have a continuous route to the street.
    reachable={original_ground[0]};queue=deque(reachable)
    while queue:
        at=queue.popleft()
        for other in nav[at][2]:
            if other not in reachable:reachable.add(other);queue.append(other)
    kept=sorted(reachable);remap={old:i for i,old in enumerate(kept)}
    nav=[[nav[i][0],nav[i][1],[remap[j] for j in nav[i][2] if j in remap],nav[i][3],nav[i][4]] for i in kept]
    for a in result:
        a['excludedUnreachablePixels']=sum(n not in remap for n in a['nodeIds'])
        a['nodeIds']=[remap[n] for n in a['nodeIds'] if n in remap]
        a['entryRoutes']=[[remap[n] for n in route if n in remap] for route in a['entryRoutes']]
        if not a['nodeIds']:raise ValueError(a['id']+': room has no connected floor')
    return nav,result


def prepare_quality_stage(key):
    from living_spaces import definitions,blockers
    stage=next(s for s in json.loads((PROD/'jobs.json').read_text())['stages'] if f'S{s["id"]+1:02}'==key)
    path=PROD/'quality/source'/f'{key}-background.png';areas=definitions(key)
    if not path.exists() or not areas:raise ValueError(f'{key}: reviewed source and activity-floor definitions are required')
    scale=stage['area']**.5;w=round(1672*scale);h=round(941*scale)
    nodes,water,overlay,groups=measure(path,w,h,all_pavement=True);pixels=np.asarray(Image.open(path).convert('RGB')).astype(float);r,g,b=pixels[:,:,0],pixels[:,:,1],pixels[:,:,2];water_mask=(g>r*1.04)&(b>r*1.07)&(b>110)&(g>115);nodes,areas=connect_activity_areas(nodes,areas,w,h,blockers(key),water_mask);folder=PROD/'navigation';folder.mkdir(exist_ok=True)
    (folder/f'{key}.json').write_text(json.dumps(nodes,separators=(',',':')))
    (folder/f'{key}-water.json').write_text(json.dumps(water,separators=(',',':')))
    (folder/f'{key}-areas.json').write_text(json.dumps(areas,ensure_ascii=False,separators=(',',':')))
    im=Image.open(path).convert('RGB');draw=ImageDraw.Draw(im,'RGBA');ix=im.width/w;iy=im.height/h
    for a in areas:
        draw.polygon([(x*ix,y*iy) for x,y in a['polygon']],fill=(110,230,90,40) if not a.get('level') else (110,160,255,70),outline=(20,120,50,220))
        for hole in a.get('holes',[]):draw.polygon([(x*ix,y*iy) for x,y in hole],fill=(220,50,50,70))
    for n in nodes:draw.ellipse((n[0]*ix-1,n[1]*iy-1,n[0]*ix+1,n[1]*iy+1),fill=(20,120,230,160) if n[3] else (240,65,90,160))
    im.thumbnail((1250,800));im.save(PROD/'review'/f'{key}-living-navigation.jpg',quality=91)
    return dict(stage=key,nodes=len(nodes),areas=len(areas),upperAreas=sum(bool(a.get('level')) for a in areas),floorNodes=sum(bool(n[4]) for n in nodes),review='illustration-aligned-open-floors-and-stairs')


def prepare_quality_water(key):
    stage=next(s for s in json.loads((PROD/'jobs.json').read_text())['stages'] if f'S{s["id"]+1:02}'==key)
    scale=stage['area']**.5;w=round(1672*scale);h=round(941*scale);path=PROD/'quality/source'/f'{key}-background.png'
    _,water,_,_=measure(path,w,h,all_pavement=True)
    (PROD/'navigation'/f'{key}-water.json').write_text(json.dumps(water,separators=(',',':')))
    im=Image.open(path).convert('RGB');d=ImageDraw.Draw(im)
    if water:d.line([(x*im.width/w,y*im.height/h) for x,y in water],fill='#ff4050',width=4)
    im.thumbnail((1000,650));im.save(PROD/'review'/f'{key}-water-route.jpg',quality=88)
    return dict(stage=key,waterPoints=len(water),minimumY=min((p[1] for p in water),default=None))


if __name__=='__main__':
    if (PROD/'navigation/living-spaces.json').exists() and (PROD/'quality/source/S24-background.png').exists():
        report=[prepare_quality_stage(f'S{n:02}') for n in range(1,25)]
        (PROD/'review/quality-navigation-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
        print(json.dumps(report,ensure_ascii=False))
    else:build()
