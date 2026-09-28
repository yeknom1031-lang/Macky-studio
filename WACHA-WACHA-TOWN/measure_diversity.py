"""Measure generated action sheets; retain originals and document actual source counts."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parent
# Actual generated layouts, validated visually. Clip boundaries need not equal requested grids.
LAYOUTS={
 'people-a':(8,0,5,5,4), 'animals':(8,0,4,5,5),
 'workers':(7,0,5,5,5), 'festival':(8,6,6,5,5),
 'sports':(8,0,6,6,5), 'neighbors':(8,0,6,5,5),
 'families':(8,0,6,6,5), 'costumes':(8,4,6,6,5),
}

ROW_BOUNDS={'people-a':[0,113,230,361,488,611,735,832,916], 'festival':[0,104,230,342,467,600,697,815,916], 'sports':[0,114,229,351,459,579,688,784,916]}

def bounds(image,rows,anchor,count,source=None):
 a=np.asarray(image.getchannel('A')); projection=(a>180).sum(axis=1)
 ys=[0]
 for k in range(1,rows):
  mid=round(k*image.height/rows); radius=round(image.height/rows*.18)
  lo,hi=max(ys[-1]+10,mid-radius),min(image.height,mid+radius)
  ys.append(lo+int(np.argmin(projection[lo:hi])))
 ys.append(image.height)
 if source in ROW_BOUNDS:ys=ROW_BOUNDS[source]
 col=(a[ys[anchor]:ys[anchor+1]]>180).sum(axis=0); active=col>8
 runs=[];start=None
 for x,value in enumerate(active):
  if value and start is None:start=x
  if not value and start is not None:
   if x-start>25:runs.append((start,x))
   start=None
 if start is not None:runs.append((start,image.width))
 assert len(runs)==count,(image.size,anchor,len(runs),count,runs)
 centers=[(x+y)/2 for x,y in runs]
 xs=[0]+[round((centers[k-1]+centers[k])/2) for k in range(1,count)]+[image.width]
 return a,ys,xs

def crop_rect(a,x0,y0,x1,y1):
 yy,xx=np.nonzero(a[y0:y1,x0:x1]>180)
 assert len(xx)>60,(x0,y0,x1,y1)
 left=max(x0,x0+int(xx.min())-2);top=max(y0,y0+int(yy.min())-2)
 right=min(x1,x0+int(xx.max())+3);bottom=min(y1,y0+int(yy.max())+3)
 return dict(x=left,y=top,w=right-left,h=bottom-top)

def measure(original):
 catalog=json.loads((ROOT/'assets/diversity/catalog.json').read_text()); sheets={}; characters=original['characters'][:16]
 for source,(rows,anchor,w,g,a) in LAYOUTS.items():
  im=Image.open(ROOT/'assets/diversity'/f'{source}.png'); alpha,ys,xs=bounds(im,rows,anchor,w+g+a,source)
  sheets[source]=(im,alpha,ys,xs,(w,g,a))
 for info in catalog:
  source=info['source'];row=info['row']
  if source=='workers' and row==6:
   im=Image.open(ROOT/'assets/diversity/potter.png');a,ys,xs=bounds(im,3,0,5)
   frames=[crop_rect(a,xs[col],ys[r],xs[col+1],ys[r+1]) for r in range(3) for col in range(5)]
   characters.append(dict(source='diversity/potter',row=0,source_frames=15,frames=frames,clips={'walk':[0,5],'gesture':[5,5],'action':[10,5]},name=info['name']))
   continue
  if source=='workers' and row==7:row=6
  im,alpha,ys,xs,clips=sheets[source]; w,g,a=clips
  original_frames=[crop_rect(alpha,xs[col],ys[row],xs[col+1],ys[row+1]) for col in range(w+g+a)]
  indices=[];offset=0
  for length in clips:
   indices += [offset+round(k*(length-1)/4) for k in range(5)]
   offset+=length
  frames=[original_frames[i] for i in indices]
  characters.append(dict(source='diversity/'+source,row=row,source_frames=sum(clips),source_clip_counts=clips,frames=frames,clips={'walk':[0,5],'gesture':[5,5],'action':[10,5]},name=info['name']))
 return dict(frame_count=15,base_count=len(characters),palette_count=4,characters=characters)
