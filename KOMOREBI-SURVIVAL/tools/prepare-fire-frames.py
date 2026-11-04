"""Split the generated 10x6 sheet, preserving alpha, and pad an atlas for filtering."""
from pathlib import Path
from PIL import Image
import sys, hashlib, json
out=Path(__file__).resolve().parents[1]/'dist/assets/survival/fire'
out.mkdir(parents=True,exist_ok=True)
im=Image.open(sys.argv[1]).convert('RGBA')
im.save(out/'generated-sheet.png')
atlas=Image.new('RGBA',(1640,984));frames=[]
for i in range(60):
    col,row=i%10,i//10
    box=(round(col*im.width/10),round(row*im.height/6),round((col+1)*im.width/10),round((row+1)*im.height/6))
    frame=im.crop(box).resize((160,160),Image.Resampling.LANCZOS)
    name=f'flame-{i:02}.png';frame.save(out/name)
    atlas.paste(frame,(col*164+2,row*164+2))
    frames.append({'file':name,'sha256':hashlib.sha256(frame.tobytes()).hexdigest()})
assert len({f['sha256'] for f in frames})==60
atlas.save(out/'flame-atlas.png')
(out/'manifest.json').write_text(json.dumps({'frames':frames,'fps':30,'duration':2,'columns':10,'rows':6,'cell':164,'padding':2},indent=2))
print('60 distinct transparent frames, 30fps, 2 second loop')
