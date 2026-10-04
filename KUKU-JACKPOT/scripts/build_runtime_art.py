"""Pack generated game sheets into runtime sprites; preserve source art and alpha."""
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter
import argparse, json
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'assets/source-art'; OUT=ROOT/'assets/runtime'; OUT.mkdir(exist_ok=True)
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--characters-only',action='store_true',help='Repack character sprites while leaving digits, icons and the manifest untouched.')
args=parser.parse_args()
groups=[('cast-forest',['bird','wolf','rabbit','bear','fox']),('cast-factory',['robot','cat','frog','gorilla','dragon']),('cast-friends',['alien','octopus','raccoon','otter','dog'])]
manifest={'characters':{},'digits':{},'method':'Generated transparent sheets; runtime slicing and resizing only'}
def boundaries(im, count, axis):
    a=im.getchannel('A'); length=im.width if axis==0 else im.height
    vals=[]
    for v in range(length):
        line=a.crop((v,0,v+1,im.height)) if axis==0 else a.crop((0,v,im.width,v+1))
        vals.append(sum(x>96 for x in line.tobytes()))
    out=[0]
    for k in range(1,count):
        target=length*k/count; r=int(length/count*.19)
        candidates=range(max(out[-1]+1,int(target-r)),min(length,int(target+r)))
        out.append(min(candidates,key=lambda i:(vals[i],abs(i-target))))
    return out+[length]
def largest_alpha_component(im):
    """Extract the sprite body without neighboring fragments or clipping its AA.

    Faint alpha noise can bridge two otherwise separate characters. Label solid
    pixels first, then include a four-pixel antialias margin around the body.
    The retained pixels keep their original RGBA values; no art is regenerated.
    """
    alpha=im.getchannel('A'); values=alpha.tobytes(); width,height=im.size
    visited=bytearray(len(values)); largest=[]; components=0
    for seed,value in enumerate(values):
        if value<=60 or visited[seed]:continue
        visited[seed]=1; stack=[seed]; component=[]; components+=1
        while stack:
            index=stack.pop(); component.append(index); y,x=divmod(index,width)
            for ny in range(max(0,y-1),min(height,y+2)):
                start=ny*width
                for nx in range(max(0,x-1),min(width,x+2)):
                    neighbor=start+nx
                    if values[neighbor]>60 and not visited[neighbor]:
                        visited[neighbor]=1; stack.append(neighbor)
        if len(component)>len(largest):largest=component
    if not largest:raise ValueError('Character crop has no visible pixels')
    kept=bytearray(len(values))
    for index in largest:kept[index]=255
    body=Image.frombytes('L',im.size,bytes(kept)).filter(ImageFilter.MaxFilter(9))
    retained=ImageChops.multiply(alpha,body); result=im.copy()
    result.putalpha(retained)
    removed=sum(value>0 and mask==0 for value,mask in zip(values,body.tobytes()))
    return result.crop(retained.getbbox()),components,removed
removed_total=0
for source,names in groups:
    im=Image.open(SOURCE/(source+'.png')).convert('RGBA'); ys=boundaries(im,3,1)
    for row,state in enumerate(['idle','talk','win']):
        strip=im.crop((0,ys[row],im.width,ys[row+1])); xs=boundaries(strip,5,0)
        for col,name in enumerate(names):
            crop=strip.crop((xs[col],0,xs[col+1],strip.height))
            crop,components,removed=largest_alpha_component(crop); removed_total+=removed
            crop.thumbnail((340,400),Image.Resampling.LANCZOS)
            file=f'{name}-{state}.webp'; crop.save(OUT/file,quality=90,method=6)
            manifest['characters'].setdefault(name,{})[state]=file
            if components>1:print(f'{file}: retained body, removed {removed} pixels from {components-1} disconnected components')
if args.characters_only:
    print('Repacked 15 characters × 3 poses; removed',removed_total,'fragment pixels; digits, icons and manifest unchanged')
    raise SystemExit(0)
im=Image.open(SOURCE/'digits.png').convert('RGBA'); ys=boundaries(im,6,1)
for row in range(6):
    strip=im.crop((0,ys[row],im.width,ys[row+1])); xs=boundaries(strip,5,0)
    for col in range(5):
        crop=strip.crop((xs[col],0,xs[col+1],strip.height)); crop=crop.crop(crop.getchannel('A').getbbox());crop.thumbnail((128,160),Image.Resampling.LANCZOS)
        theme=['gold','jelly','wood'][row//2];digit=row%2*5+col;file=f'digit-{theme}-{digit}.webp';crop.save(OUT/file,quality=93,method=6)
        manifest['digits'].setdefault(theme,{})[str(digit)]=file
# Opaque app icons reuse the generated bird, inside generous iOS safe margins.
bird=Image.open(OUT/'bird-win.webp').convert('RGBA')
for size in [192,512]:
    icon=Image.new('RGBA',(size,size),'#17354d');b=bird.copy();b.thumbnail((int(size*.78),int(size*.78)),Image.Resampling.LANCZOS);icon.alpha_composite(b,((size-b.width)//2,(size-b.height)//2));icon.convert('RGB').save(OUT/f'icon-{size}.png')
(OUT/'art-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('Packed',len(manifest['characters']),'characters × 3 poses, 30 digits, 2 icons')
