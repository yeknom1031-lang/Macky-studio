"""Apply hand-measured environment placement corrections; preserve image originals."""
from pathlib import Path
import json
P=Path(__file__).resolve().parent
overrides=json.loads((P/'placement_overrides.json').read_text())
for stage,items in overrides.items():
    for index,pos in items.items():
        objindex=int(index)-1;n=721+(int(stage[1:])-1)*3+objindex//4
        path=P/'jobs'/f'A{n:04}.json';job=json.loads(path.read_text());obj=job['objects'][objindex%4];p=obj['placement']
        oldx,oldy=p['referencePosition'];sx=p['x']/oldx if oldx else 1;sy=p['y']/oldy if oldy else 1
        p['referencePosition']=pos[:2];p['x']=round(pos[0]*sx,4);p['y']=round(pos[1]*sy,4);p['depthY']=p['y']
        if len(pos)>2:
            intended=obj['intendedVisibleGeometry'];packed=obj['packedPlacementCorrection']['visibleSize']
            intended['width']=pos[2]*sx;intended['height']=pos[3]*sy
            p['width']=round(intended['width']*192/packed[0],4);p['height']=round(intended['height']*192/packed[1],4)
        obj['reviewState']='source-frames-reviewed-background-position-corrected-runtime-pending'
        path.write_text(json.dumps(job,ensure_ascii=False,indent=2)+'\n')
print('Applied',sum(len(v) for v in overrides.values()),'measured placement corrections')
