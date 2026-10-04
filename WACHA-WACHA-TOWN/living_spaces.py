"""Visible activity floors measured against the illustrated cutaway backgrounds.

Coordinates use the 1672x941 composition rather than source output resolution.
The navigation builder scales them to each world's dimensions. Polygons never
include opaque roofs; upper floors connect only through their drawn stairs.
"""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parent
CONFIG=ROOT/'assets/production/navigation/living-spaces.json'

def definitions(stage):
    data=json.loads(CONFIG.read_text()) if CONFIG.exists() else {}
    value=data.get(stage,[])
    return value.get('areas',[]) if isinstance(value,dict) else value

def inside(x,y,polygon):
    hit=False
    for i,(ax,ay) in enumerate(polygon):
        bx,by=polygon[i-1]
        if (ay>y)!=(by>y) and x<(bx-ax)*(y-ay)/(by-ay)+ax:hit=not hit
    return hit

def touches_hole(x,y,polygon,margin=2):
    xs=[p[0] for p in polygon];ys=[p[1] for p in polygon]
    if x<min(xs)-margin or x>max(xs)+margin or y<min(ys)-margin or y>max(ys)+margin:return False
    if inside(x,y,polygon):return True
    for a,b in zip(polygon,polygon[1:]+polygon[:1]):
        dx=b[0]-a[0];dy=b[1]-a[1];den=dx*dx+dy*dy
        t=max(0,min(1,((x-a[0])*dx+(y-a[1])*dy)/den)) if den else 0
        if (x-a[0]-t*dx)**2+(y-a[1]-t*dy)**2<=margin*margin:return True
    return False

def floor_contains(area,x,y):
    return inside(x,y,area['polygon']) and not any(touches_hole(x,y,h) for h in area.get('holes',[]))

def blockers(stage):
    data=json.loads(CONFIG.read_text()) if CONFIG.exists() else {}
    value=data.get(stage,{})
    return value.get('blockers',[]) if isinstance(value,dict) else []
