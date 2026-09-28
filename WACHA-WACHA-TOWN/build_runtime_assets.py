"""Bake a compact higher-resolution atlas of distinct bases; recolor variants in the GPU shader."""
from pathlib import Path
import json,hashlib
import numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parent
CW=CH=80
COLUMNS=48

def isolate_cell(image):
 # Remove disconnected remnants of an adjacent atlas cell; keep nearby held props.
 a=np.asarray(image.getchannel('A')); mask=a>110;parents=[];segments=[];previous=[]
 def root(n):
  while parents[n]!=n:parents[n]=parents[parents[n]];n=parents[n]
  return n
 for y,line in enumerate(mask):
  edges=np.diff(np.r_[False,line,False].astype(np.int8));runs=list(zip(np.flatnonzero(edges==1),np.flatnonzero(edges==-1)));current=[]
  for x0,x1 in runs:
   label=len(parents);parents.append(label)
   for px0,px1,old in previous:
    if px1>=x0 and px0<=x1:parents[root(old)]=root(label)
   current.append((int(x0),int(x1),label));segments.append((y,int(x0),int(x1),label))
  previous=current
 components={}
 for y,x0,x1,label in segments:
  key=root(label)
  if key not in components:components[key]=[0,x0,y,x1,y+1]
  c=components[key];c[0]+=x1-x0;c[1]=min(c[1],x0);c[2]=min(c[2],y);c[3]=max(c[3],x1);c[4]=max(c[4],y+1)
 if not components:return image
 main=max(components,key=lambda k:components[k][0]);area,left,top,right,bottom=components[main];keep={main}
 for key,(n,x0,y0,x1,y1) in components.items():
  gap=((max(left-x1,x0-right,0))**2+(max(top-y1,y0-bottom,0))**2)**.5
  edge=x0<=1 or x1>=image.width-1 or y0<=1
  if n>=max(5,area*.004) and gap<=14 and (not edge or n>=area*.08):keep.add(key)
 clean=np.zeros(a.shape,dtype=np.uint8)
 for y,x0,x1,label in segments:
  if root(label) in keep:clean[max(0,y-1):min(image.height,y+2),max(0,x0-1):min(image.width,x1+1)]=255
 im=image.copy();im.putalpha(Image.fromarray(np.minimum(a,clean)));box=im.getbbox()
 return im.crop(box) if box else image

def make_runtime(meta):
 out=ROOT/'assets/runtime';out.mkdir(exist_ok=True)
 sources=sorted({ROOT/'assets'/f"{c['source']}.png" for c in meta['characters']}|{ROOT/'assets/town-props.png'})
 signature=hashlib.sha256(Path(__file__).read_bytes()+json.dumps(meta).encode()+b''.join(p.read_bytes() for p in sources)).hexdigest()
 stamp=out/'atlas-meta.json'
 if stamp.exists() and json.loads(stamp.read_text()).get('signature')==signature:
  atlas_meta=json.loads(stamp.read_text())
 else:
  count=meta['base_count'];width=CW*COLUMNS
  loaded={str(p.relative_to(ROOT/'assets').with_suffix('')):Image.open(p).convert('RGBA') for p in sources}
  tiles=[];rects=[]
  for base,entry in enumerate(meta['characters']):
   frames=entry['frames'];unique={};sprites=[];indices=[]
   for f in frames:
    key=tuple(f.values())
    if key not in unique:
     unique[key]=len(sprites);sprites.append(isolate_cell(loaded[entry['source']].crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']))))
    indices.append(unique[key])
   walk_heights=[sprites[indices[i]].height for i in range(5)]
   scale=min(60/float(np.median(walk_heights)),76/max(im.width for im in sprites),75/max(im.height for im in sprites))
   positions=[]
   for im in sprites:
    sprite=im.resize((max(1,round(im.width*scale)),max(1,round(im.height*scale))),Image.Resampling.LANCZOS)
    tile=Image.new('RGBA',(CW,CH));ImageDraw.Draw(tile).ellipse((CW/2-8,CH-4,CW/2+8,CH-1),fill=(67,48,33,35));tile.alpha_composite(sprite,((CW-sprite.width)//2,CH-3-sprite.height))
    k=len(tiles);positions.append(dict(x=k%COLUMNS*CW,y=k//COLUMNS*CH,w=CW,h=CH));tiles.append(tile)
   rects.append([positions[i] for i in indices])
  prop_y=((len(tiles)+COLUMNS-1)//COLUMNS)*CH
  atlas=Image.new('RGBA',(width,prop_y+128))
  for i,tile in enumerate(tiles):atlas.alpha_composite(tile,(i%COLUMNS*CW,i//COLUMNS*CH))
  props=[];sheet=loaded['town-props'];cw,ch=sheet.width/4,sheet.height/2
  for index in range(8):
   cell=sheet.crop((round(index%4*cw),round(index//4*ch),round((index%4+1)*cw),round((index//4+1)*ch)))
   box=cell.getchannel('A').point(lambda a:255 if a>170 else 0).getbbox();cell=cell.crop(box);factor=120/max(cell.size)
   cell=cell.resize((round(cell.width*factor),round(cell.height*factor)),Image.Resampling.LANCZOS)
   px=index*128+(128-cell.width)//2;py=prop_y+128-cell.height-3;atlas.alpha_composite(cell,(px,py));props.append(dict(x=px,y=py,w=cell.width,h=cell.height))
  atlas.save(out/'crowd-atlas.webp','WEBP',quality=94,method=6)
  atlas_meta=dict(signature=signature,width=atlas.width,height=atlas.height,cw=CW,ch=CH,typeCount=count*4,baseCount=count,palettes=4,columns=COLUMNS,frames=15,props=props,rects=rects,uniqueFrames=len(tiles))
  stamp.write_text(json.dumps(atlas_meta,separators=(',',':')))
 for p in (ROOT/'assets').glob('*.png'):
  if p.stem.startswith(('walk-','town-props')):continue
  target=out/(p.stem+'.webp')
  if not target.exists() or target.stat().st_mtime<max(p.stat().st_mtime,Path(__file__).stat().st_mtime):Image.open(p).convert('RGB').save(target,'WEBP',quality=92,method=6)
 return atlas_meta
