"""Measure walkable paving from background pixels without editing source images."""
from pathlib import Path
import json
from collections import deque
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parent
FILES = ['01-festival','02-garden','03-seaside','04-sweets','05-autumn','06-snow','07-lantern']
STEP = 12
GRIDS = []
for name in FILES:
    image = Image.open(ROOT / 'assets' / (name + '.png')).convert('RGB')
    a = np.asarray(image).astype(float)
    r,g,b = a[:,:,0],a[:,:,1],a[:,:,2]
    high, low = a.max(axis=2), a.min(axis=2)
    stone = (r>139)&(g>121)&(b>92)&(r>=g*.94)&(g>=b*.98)&(r>b*1.022)&((high-low)/np.maximum(high,1)<.31)
    width,height=image.size
    nodes=[]
    for gy,y in enumerate(range(12,height-12,STEP)):
        for gx,x in enumerate(range(12,width-12,STEP)):
            patch=stone[y-5:y+6,x-5:x+6]
            if patch.mean()>.61:
                nodes.append((gx,gy))
    coords=set(nodes); components=[]
    while coords:
        seed=coords.pop(); q=deque([seed]); component=[seed]
        while q:
            x,y=q.popleft()
            for nx,ny in [(x+1,y),(x-1,y),(x,y+1),(x,y-1)]:
                if (nx,ny) in coords:
                    coords.remove((nx,ny));q.append((nx,ny));component.append((nx,ny))
        components.append(component)
    # Small isolated pale props/rooftops are not navigable streets.
    components=[c for c in components if len(c)>=100]
    kept=sorted(p for c in components for p in c)
    lookup={p:i for i,p in enumerate(kept)}
    out=[]
    for x,y in kept:
        links=[]
        for dx,dy in [(1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)]:
            dest=(x+dx,y+dy)
            if dest in lookup:
                if dx and dy and ((x+dx,y) not in lookup or (x,y+dy) not in lookup):
                    continue
                links.append(lookup[dest])
        out.append([12+x*STEP,12+y*STEP,links])
    assert len(out)>500, (name,len(out))
    GRIDS.append(out)
    print(name,'walkable nodes:',len(out),'areas:',[len(c) for c in components])
(ROOT/'assets'/'navigation.json').write_text(json.dumps(GRIDS,separators=(',',':')))
