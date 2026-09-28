"""Bake smaller runtime images; retain all generated originals for future edits."""
from pathlib import Path
import json
import hashlib
import numpy as np
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parent
CW,CH=40,48
HUES=[0,350,28,50,80,115,155,175,190,205,220,255,272,290,320,337,12,33,130,235]

def tint(image,palette):
    if palette==0:return image.copy()
    a=np.array(image);rgb=a[:,:,:3].astype(float)/255;r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
    hi=rgb.max(axis=2);lo=rgb.min(axis=2);delta=hi-lo;l=(hi+lo)/2
    safe=np.maximum(delta,.00001);s=delta/np.maximum(1-np.abs(2*l-1),.00001)
    h=np.where(hi==r,((g-b)/safe)%6,np.where(hi==g,(b-r)/safe+2,(r-g)/safe+4))*60;h%=360
    y=np.arange(CH)[:,None]/CH
    mask=(a[:,:,3]>=120)&(delta>=.09)&(hi>=.28)&(l<=.93)
    mask &= ~((h>7)&(h<52)&((y<.56)|(s<.44)))
    mask &= ~((l<.25)&(h<60))
    h=(HUES[palette]+(h-170)*.11+360)%360;s=np.clip(s*(.78+(palette%3)*.09),.35,.78);l=np.clip(l,.22,.83)
    amp=s*np.minimum(l,1-l)
    for c,n in enumerate([0,8,4]):
        k=(n+h/30)%12;v=255*(l-amp*np.maximum(-1,np.minimum(np.minimum(k-3,9-k),1)))
        a[:,:,c]=np.where(mask,np.clip(v,0,255),a[:,:,c]).astype(np.uint8)
    return Image.fromarray(a)

def make_runtime(meta):
    out=ROOT/'assets'/'runtime';out.mkdir(exist_ok=True)
    sources=[ROOT/'assets'/name for name in ['walk-a.png','walk-b.png','walk-c.png','town-props.png']]
    signature=hashlib.sha256(Path(__file__).read_bytes()+json.dumps(meta).encode()+b''.join(p.read_bytes() for p in sources)).hexdigest()
    stamp=out/'atlas-meta.json'
    if stamp.exists() and json.loads(stamp.read_text()).get('signature')==signature:
        atlas_meta=json.loads(stamp.read_text())
    else:
        count=meta['base_count']*20;width=CW*15*4;prop_y=((count+3)//4)*CH
        atlas=Image.new('RGBA',(width,prop_y+128));loaded={p.stem:Image.open(p).convert('RGBA') for p in sources}
        for base,entry in enumerate(meta['characters']):
            strip=Image.new('RGBA',(CW*15,CH));scale=42/max(f['h'] for f in entry['frames'])
            for i,f in enumerate(entry['frames']):
                sprite=loaded[entry['source']].crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']))
                sprite=sprite.resize((max(1,round(f['w']*scale)),max(1,round(f['h']*scale))),Image.Resampling.LANCZOS)
                ImageDraw.Draw(strip).ellipse((i*CW+CW/2-6,CH-4,i*CW+CW/2+6,CH-1),fill=(67,48,33,35))
                strip.alpha_composite(sprite,(i*CW+(CW-sprite.width)//2,CH-3-sprite.height))
            for palette in range(20):
                typ=base*20+palette;atlas.alpha_composite(tint(strip,palette),((typ%4)*CW*15,(typ//4)*CH))
        props=[];sheet=loaded['town-props'];cw,ch=sheet.width/4,sheet.height/2
        for index in range(8):
            cell=sheet.crop((round(index%4*cw),round(index//4*ch),round((index%4+1)*cw),round((index//4+1)*ch)))
            mask=cell.getchannel('A').point(lambda a:255 if a>170 else 0);box=mask.getbbox();cell=cell.crop(box)
            factor=120/max(cell.size);cell=cell.resize((round(cell.width*factor),round(cell.height*factor)),Image.Resampling.LANCZOS)
            px=index*128+(128-cell.width)//2;py=prop_y+128-cell.height-3;atlas.alpha_composite(cell,(px,py));props.append(dict(x=px,y=py,w=cell.width,h=cell.height))
        atlas.save(out/'crowd-atlas.webp','WEBP',quality=88,method=6)
        old=out/'crowd-atlas.png'
        if old.exists():old.unlink()
        atlas_meta=dict(signature=signature,width=atlas.width,height=atlas.height,cw=CW,ch=CH,typeCount=count,columns=4,frames=15,props=props)
        stamp.write_text(json.dumps(atlas_meta,separators=(',',':')))
    for p in (ROOT/'assets').glob('*.png'):
        if p.stem.startswith(('walk-','town-props')):continue
        target=out/(p.stem+'.webp')
        if not target.exists() or target.stat().st_mtime<p.stat().st_mtime:
            Image.open(p).convert('RGB').save(target,'WEBP',quality=83,method=6)
    return atlas_meta
