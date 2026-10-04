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

def measure(path,w,h):
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
    kept=sorted(groups[0]);lookup={p:i for i,p in enumerate(kept)};nodes=[];sx=w/im.width;sy=h/im.height
    for x,y in kept:
        links=[]
        for dx,dy in [(12,0),(-12,0),(0,12),(0,-12),(12,12),(12,-12),(-12,12),(-12,-12)]:
            q=(x+dx,y+dy)
            if q in lookup and (not dx or not dy or ((x+dx,y) in lookup and (x,y+dy) in lookup)):links.append(lookup[q])
        nodes.append([round(x*sx,2),round(y*sy,2),links,0])
    blue=(g>r*1.04)&(b>r*1.07)&(b>110)&(g>115)
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

if __name__=='__main__':build()
