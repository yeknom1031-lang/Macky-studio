"""Diagnostic composites of generated cutouts using the real runtime packer."""
from pathlib import Path
import sys,json,hashlib
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT))
from animation_assets import pack
PROD=ROOT/'assets/production/animation-expansion'

def render(stage_numbers):
    for stage in stage_numbers:
        key=f'S{stage:02}'
        background=Image.open(PROD/'references'/f'{key}-runtime-background.png').convert('RGBA')
        jobs=[json.loads((PROD/'jobs'/f'A{n:04}.json').read_text()) for n in range(721+(stage-1)*3,724+(stage-1)*3)]
        scene=background.copy();details=Image.new('RGB',(1400,1050),'#eeeae0');draw=ImageDraw.Draw(details)
        results=[]
        for ji,j in enumerate(jobs):
            atlas,frames,report=pack(j,PROD/'source'/f'{j["id"]}.png')
            (PROD/'review'/f'{j["id"]}-packed-review.json').write_text(json.dumps(report,indent=2)+'\n')
            atlas.save(PROD/'review'/f'{j["id"]}-packed.png')
            for row,obj in enumerate(j['objects']):
                p=obj['placement'];xr,yr=p['referencePosition'];sx=xr/p['x'] if p['x'] else 1;sy=yr/p['y'] if p['y'] else 1
                w,h=round(p['width']*sx),round(p['height']*sy);ax,ay=obj['anchor'];x,y=round(xr-w*ax),round(yr-h*ay)
                f=frames[row][2];sprite=atlas.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])).resize((w,h),Image.Resampling.LANCZOS)
                scene.alpha_composite(sprite,(x,y))
                cx=max(0,min(1672-210,round(xr-105)));cy=max(0,min(941-180,round(yr-90)))
                crop=background.crop((cx,cy,cx+210,cy+180));crop.alpha_composite(sprite,(x-cx,y-cy));crop=crop.resize((350,300),Image.Resampling.LANCZOS)
                i=ji*4+row;col=i%4;rr=i//4;details.paste(crop.convert('RGB'),(col*350,rr*350+40))
                draw.text((col*350+8,rr*350+6),f'{obj["id"]}: {xr}, {yr} / {p["surface"]}',fill='black')
                draw.text((col*350+8,rr*350+20),f'{obj["layer"]} / {w}x{h}',fill='black')
                results.append({'id':obj['id'],'referencePosition':[xr,yr],'referenceSize':[w,h],'layer':obj['layer']})
        scene.convert('RGB').save(PROD/'review'/f'{key}-environment-composite.jpg',quality=95)
        details.save(PROD/'review'/f'{key}-environment-details.jpg',quality=94)
        print(key,len(results),flush=True)

if __name__=='__main__':
    render([int(x) for x in sys.argv[1:]] or list(range(1,25)))
