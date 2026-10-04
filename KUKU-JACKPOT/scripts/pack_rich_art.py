"""Resize generated sheets for runtime without drawing or changing their artwork."""
import sys,json
from pathlib import Path
from PIL import Image
source,target,cols,rows,kind=sys.argv[1:]
cols,rows=int(cols),int(rows)
im=Image.open(source).convert('RGBA')
if kind=='alpha':
    hist=im.getchannel('A').histogram()
    alpha=sum(hist[:16])/sum(hist)
    if alpha<.05: raise ValueError('Generated sheet lacks sufficient real transparency; keep source and request a new generation, never silently remove its background.')
    # Preserve proportions even when the generator returns a square sheet.
    # Every cell uses the same scale and padding, so poses retain their anchors.
    sheet=Image.new('RGBA',(cols*256,rows*256))
    cw,ch=im.width/cols,im.height/rows
    scale=min(256/cw,256/ch)
    size=(round(cw*scale),round(ch*scale))
    for row in range(rows):
        for col in range(cols):
            cell=im.crop((round(col*cw),round(row*ch),round((col+1)*cw),round((row+1)*ch)))
            cell=cell.resize(size,Image.Resampling.LANCZOS)
            sheet.paste(cell,(col*256+(256-size[0])//2,row*256+(256-size[1])//2))
    im=sheet
else:
    alpha=0
    im.thumbnail((1400,700),Image.Resampling.LANCZOS)
    im=im.convert('RGB')
Path(target).parent.mkdir(parents=True,exist_ok=True)
im.save(target,format='WEBP',quality=86,method=4)
print(json.dumps({'width':im.width,'height':im.height,'alpha':round(alpha,4),'bytes':Path(target).stat().st_size}))
