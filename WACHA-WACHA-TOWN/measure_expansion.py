"""Map the measured 170 additional designs to logical clips, preserving originals."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from measure_diversity import crop_rect
ROOT=Path(__file__).resolve().parent

def sheet_bounds(im):
 a=np.asarray(im.getchannel('A'));h,w=a.shape
 # Walking frames have the cleanest row gutters; props can extend beyond a row.
 proj=(a[:,:w//2]>180).sum(axis=1);ys=[0]
 for row in range(1,10):
  mid=round(h*row/10);radius=round(h/10*.3);lo,hi=mid-radius,mid+radius
  costs=np.convolve(proj,np.ones(3)/3,mode='same')[lo:hi]
  ys.append(lo+int(np.argmin(costs)))
 ys.append(h);return a,ys

def extend(meta):
 catalog=json.loads((ROOT/'assets/expansion/catalog.json').read_text());sheets={};chars=meta['characters'][:80]
 for info in catalog:
  source=info['source']
  if source not in sheets:
   im=Image.open(ROOT/'assets/expansion'/source).convert('RGBA');a,ys=sheet_bounds(im);assert (a==0).mean()>.1,source+' needs transparency';sheets[source]=(im,a,ys)
  im,a,ys=sheets[source];row=info['row'];y0,y1=ys[row:row+2]
  count=7 if source=='expansion-07.png' and row==3 else 8
  # The fencing action used three wide poses in the second half of its row.
  ideals=[round(im.width*k/8) for k in range(5)]+[round(im.width*(.5+.5*k/(count-4))) for k in range(1,count-3)]
  col=(a[y0:y1]>180).sum(axis=0);xs=[0]
  for mid in ideals[1:-1]:
   radius=round(im.width/8*.13);lo,hi=mid-radius,mid+radius;cost=col[lo:hi]+np.abs(np.arange(lo,hi)-mid)*.04;xs.append(lo+int(np.argmin(cost)))
  xs.append(im.width)
  if source=='expansion-16.png' and row==9:xs=[round(v*im.width/1122) for v in [0,146,273,397,518,655,804,954,1122]]
  poses=[crop_rect(a,xs[i],y0,xs[i+1],y1) for i in range(count)]
  walk=[round(k*3/4) for k in range(5)];action=[4+round(k*(count-5)/4) for k in range(5)]
  indices=walk+action+action
  chars.append(dict(source='expansion/'+source[:-4],row=row,source_frames=count,source_clip_counts=[4,count-4],frames=[poses[i] for i in indices],clips={'walk':[0,5],'gesture':[5,5],'action':[10,5]},name=info['name']))
 return dict(frame_count=15,base_count=len(chars),palette_count=4,characters=chars)
