"""Measure unevenly spaced generated sprite cells without changing source artwork."""
from collections import deque
import numpy as np


def clean_bounds(alpha):
    # Use connected opaque regions only to choose the crop; never paint or recolour.
    small=alpha[::2,::2]>125;points=set(map(tuple,np.argwhere(small)));groups=[]
    while points:
        p=points.pop();queue=deque([p]);group=[p]
        while queue:
            y,x=queue.popleft()
            for q in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
                if q in points:points.remove(q);queue.append(q);group.append(q)
        if len(group)>2:
            ys=[p[0]*2 for p in group];xs=[p[1]*2 for p in group]
            groups.append((len(group),min(xs),min(ys),max(xs)+2,max(ys)+2))
    if not groups:return None
    groups.sort(reverse=True);main=groups[0];height,width=alpha.shape
    kept=[main]
    for comp in groups[1:]:
        area,x0,y0,x1,y1=comp
        edge=min(x0,y0,width-x1,height-y1)<4
        # A clipped shoe/head from the adjoining row must not shift the whole crop.
        if area>=main[0]*.12 or (not edge and area>=main[0]*.012):kept.append(comp)
    x0=max(0,min(g[1] for g in kept)-2);y0=max(0,min(g[2] for g in kept)-2)
    x1=min(width,max(g[3] for g in kept)+2);y1=min(height,max(g[4] for g in kept)+2)
    return tuple(map(int,(x0,y0,x1,y1)))


def person_boundaries(alpha,rows,manual=None):
    if manual:return manual
    height,width=alpha.shape
    profiles=[(alpha[:,round(c*width/8):round((c+1)*width/8)]>150).sum(1) for c in range(4)]
    profile=np.median(np.stack(profiles),axis=0);result=[0]
    for k in range(1,rows):
        mid=k*height/rows;span=height/rows*.3;lo=round(mid-span);hi=round(mid+span)
        # Small distance regularisation resolves equal empty gaps reproducibly.
        score=profile[lo:hi]+np.abs(np.arange(lo,hi)-mid)*.035
        result.append(lo+int(np.argmin(score)))
    return result+[height]


def character_columns(alpha,cols):
    """Locate clear gutters when four walk poses are narrower than action poses."""
    projection=(alpha>100).sum(axis=0);size=len(projection);result=[0]
    for k in range(1,cols):
        mid=k*size/cols;span=size/cols*.45
        lo=max(result[-1]+12,round(mid-span));hi=min(size-12,round(mid+span))
        # Prefer the nearest genuinely empty gutter; the larger search window
        # accommodates wider hand-held tools without cutting a head in half.
        score=projection[lo:hi]+np.abs(np.arange(lo,hi)-mid)*.002
        result.append(lo+int(np.argmin(score)))
    return result+[size]
