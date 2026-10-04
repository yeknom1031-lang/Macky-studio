"""Validate and pack generated animation strips without painting image content."""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
PROD = ROOT / 'assets/production/animation-expansion'


def edges(alpha, count, axis):
    profile = (alpha > 100).sum(axis=1 if axis == 'y' else 0)
    length = len(profile)
    result = [0]
    for index in range(1, count):
        center = index * length / count
        spread = length / count * .44
        lo, hi = max(result[-1]+2, round(center-spread)), min(length-2, round(center+spread))
        candidates = np.arange(lo, hi)
        score = profile[lo:hi] + abs(candidates-center)*.002
        result.append(int(candidates[np.argmin(score)]))
    return result + [length]


def pack(job, source):
    image = Image.open(source).convert('RGBA')
    alpha = np.asarray(image.getchannel('A'))
    if float((alpha < 40).mean()) < .1:
        raise ValueError('transparent background missing')
    rows, cols = job['rows'], job['cols']
    source_cols = job.get('sourceCols',cols)
    atlas=job.get('atlas',{})
    ys = job.get('rowBoundaries') or atlas.get('rowEdges') or edges(alpha, rows, 'y')
    size = 192 if job['kind'] == 'environment' else 96
    output = Image.new('RGBA', (cols*size, rows*size))
    all_frames, registrations, problems = [], [], []
    component_rows=component_boxes=None
    if job.get('extraction')=='components':
        from animation_components import component_cells
        component_rows,component_boxes,component_report=component_cells(image,rows,source_cols)
    for row in range(rows):
        y0, y1 = ys[row:row+2]
        xs = job.get('columnBoundaries', {}).get(str(row)) or atlas.get('columnEdges') or edges(alpha[y0:y1], source_cols, 'x')
        selected = job.get('sourceColumnsByRow',{}).get(str(row),job.get('sourceColumns',list(range(cols))))
        if len(selected)!=cols:
            raise ValueError('sourceColumns must provide exactly the runtime frame count')
        cells, boxes = [], []
        # Every cell is padded to the same size before measuring one shared row
        # transform. Repeated poses retain their relative feet/body positions.
        cell_w = max(b-a for a, b in zip(xs, xs[1:]))
        cell_h = y1-y0
        for column in selected:
            x0, x1 = xs[column:column+2]
            if component_rows is not None:
                cell=component_rows[row][column]
                cell_w,cell_h=cell.size
            else:
                patch = image.crop((x0,y0,x1,y1))
                cell = Image.new('RGBA', (cell_w, cell_h))
                cell.alpha_composite(patch, ((cell_w-patch.width)//2,0))
            pixels = np.asarray(cell.getchannel('A'))
            yy, xx = np.nonzero(pixels > 100)
            if len(xx) < 80:
                raise ValueError(f'empty sprite at row {row+1}, column {column+1}')
            bbox = (int(xx.min()),int(yy.min()),int(xx.max())+1,int(yy.max())+1)
            if min(bbox[0],bbox[1],cell_w-bbox[2],cell_h-bbox[3]) < 1:
                problems.append(f'edge contact {row+1}:{column+1}')
            cells.append(cell)
            boxes.append(bbox)
        bounds = (min(b[0] for b in boxes),min(b[1] for b in boxes),max(b[2] for b in boxes),max(b[3] for b in boxes))
        width, height = bounds[2]-bounds[0],bounds[3]-bounds[1]
        # Reviewed rows can discard generated vertical travel from the sizing
        # measurement. Feet are still registered below, with one common scale
        # for every pose; all unlisted rows retain the original calculation.
        foot_aligned_scale = row in job.get('footAlignedScaleRows',[])
        scale_height = max(b[3]-b[1] for b in boxes) if foot_aligned_scale else height
        scale = min((size-8)/width,(size-8)/scale_height)
        target_w,target_h = max(1,round(width*scale)),max(1,round(height*scale))
        frames=[]
        for column,cell in enumerate(cells):
            sprite = cell.crop(bounds).resize((target_w,target_h),Image.Resampling.LANCZOS)
            # Scale stays identical for every pose; only the measured planted
            # foot is registered vertically so a generated uphill strip cannot
            # make the entire actor jump several pixels at the loop boundary.
            foot_shift=round((bounds[3]-boxes[column][3])*scale) if job['kind']!='environment' else 0
            if foot_aligned_scale:
                # The shared crop still contains the strip's transparent travel
                # margin. Contain its faint alpha fringe within this cell.
                registered = Image.new('RGBA',(size,size))
                registered.alpha_composite(sprite,((size-target_w)//2,size-3-target_h+foot_shift))
                output.alpha_composite(registered,(column*size,row*size))
            else:
                output.alpha_composite(sprite,(column*size+(size-target_w)//2,(row+1)*size-3-target_h+foot_shift))
            original_column=selected[column]
            source_box=component_boxes[row][original_column] if component_boxes is not None else [xs[original_column],y0,xs[original_column+1],y1]
            frames.append(dict(x=column*size,y=row*size,w=size,h=size,source=source_box))
        all_frames.append(frames)
        registrations.append(dict(row=row,sourceCell=[cell_w,cell_h],sharedBounds=list(bounds),
                                  scale=scale,anchor=[.5,1],method='shared row scale and horizontal origin; planted-foot vertical registration' if job['kind']!='environment' else 'one affine transform per complete row'))
    if job.get('footAlignedScaleRows'):
        # Preserve every unselected row byte-for-byte, including existing alpha-1
        # sampling fringes from adjacent rows. Only these four opt-in sheets pay
        # for a second extraction; the normal cache and packing path is unchanged.
        legacy_job={k:v for k,v in job.items() if k!='footAlignedScaleRows'}
        legacy,_,_=pack(legacy_job,source)
        for row in job['footAlignedScaleRows']:
            legacy.paste(output.crop((0,row*size,cols*size,(row+1)*size)),(0,row*size))
        output=legacy
    return output,all_frames,dict(width=image.width,height=image.height,rows=rows,cols=cols,
                                 frames=rows*cols,transparentFraction=float((alpha<40).mean()),
                                 registration=registrations,warnings=problems)


def stair_edges(stage):
    result=[]
    seen=set()
    for area in stage.get('activityAreas',[]):
        if not area.get('level'):
            continue
        for route in area.get('entryRoutes',[]):
            for a,b in zip(route,route[1:]):
                if a==b or (a,b) in seen:
                    continue
                seen.add((a,b))
                result.append(dict(**{'from':a,'to':b},areaId=area['id'],direction='up'))
    return result


def cached_pack(job, source, digest):
    """Reuse a byte-identical technical extraction while its inputs are unchanged."""
    version=Path(__file__).read_bytes()+(ROOT/'animation_components.py').read_bytes()
    signature=hashlib.sha256(version+digest.encode()+json.dumps(job,sort_keys=True).encode()).hexdigest()
    cache=ROOT/'.cache/animation-packs'
    cache.mkdir(parents=True,exist_ok=True)
    stem=cache/job['id'];metadata=stem.with_suffix('.json');bitmap=stem.with_suffix('.png')
    if metadata.exists() and bitmap.exists():
        saved=json.loads(metadata.read_text())
        if saved['signature']==signature:
            return Image.open(bitmap).convert('RGBA'),saved['frames'],saved['report']
    image,frames,report=pack(job,source)
    image.save(bitmap)
    metadata.write_text(json.dumps(dict(signature=signature,frames=frames,report=report)))
    return image,frames,report


def integrate(characters, stages, emit, strict=False):
    """Only reviewed sheets reach gameplay; partial production remains playable."""
    characters_by_id={c['id']:c for c in characters}
    for mobility_name in ('wheelchair-designs.json','mobility-designs.json'):
        mobility_path=PROD/mobility_name
        if mobility_path.exists():
            for design in json.loads(mobility_path.read_text())['characters']:
                for field in ('mobility','mobilityArea'):
                    if field in design:
                        characters_by_id[design['id']][field]=design[field]
    stages_by_key={s['key']:s for s in stages}
    reports=[];errors=[];accepted=0
    for stage in stages:
        stage['stairEdges']=stair_edges(stage)
        stage['animatedScenery']=[]
    for receipt_path in sorted((PROD/'receipts').glob('A*.json')):
        receipt=json.loads(receipt_path.read_text())
        if receipt.get('reviewStatus') not in ['accepted','accepted-partial']:
            continue
        jid=receipt['id'];job_path=PROD/'jobs'/(jid+'.json')
        job=json.loads(job_path.read_text());source=PROD/'source'/(jid+'.png')
        try:
            digest=hashlib.sha256(source.read_bytes()).hexdigest()
            if digest!=receipt['sha256']:
                raise ValueError('source changed since receipt')
            image,frames,report=cached_pack(job,source,digest)
            key='animation-'+jid
            emit(key,image,quality=96)
            if job['kind'] in ['directional','interaction']:
                for row,cid in enumerate(job['characters']):
                    if row not in job.get('acceptedRows',range(job['rows'])):
                        continue
                    character=characters_by_id[cid]
                    clips=character.setdefault('clips',{})
                    if job['kind']=='directional':
                        for index,name in enumerate(['walkBack','stairUp','stairDown']):
                            if name in job.get('disabledClipsByRow',{}).get(str(row),[]):
                                continue
                            selected=job.get('clipFramesByRow',{}).get(str(row),{}).get(name,list(range(index*4,index*4+4)))
                            clips[name]=dict(image=key,frames=[frames[row][f] for f in selected],fps=6,
                                             clock='distance',cyclePixels=38,view='back' if index<2 else 'front',
                                             anchor=[.5,1],mirror=True,sourceId=jid)
                    else:
                        selected=job.get('clipFramesByRow',{}).get(str(row),{}).get('roleWork',list(range(len(frames[row]))))
                        clips['roleWork']=dict(image=key,frames=[frames[row][f] for f in selected],fps=8,clock='time',loop=True,
                                               role=character['role'],anchor=[.5,1],mirror=True,sourceId=jid)
            elif job['kind']=='environment':
                for row,obj in enumerate(job.get('objects',[])):
                    if row not in job.get('acceptedRows',range(job['rows'])):
                        continue
                    if 'placement' in obj and 'placements' not in obj:
                        obj=obj|dict(placements=[obj['placement']])
                    stages_by_key[job['stage']]['animatedScenery'].append(obj|dict(id=f'{jid}-{row}',
                       image=key,frames=frames[row],fps=obj.get('fps',6),loop=True,anchor=obj.get('anchor',[.5,1]),sourceId=jid))
            accepted+=1;reports.append(dict(id=jid,sha256=digest,**report))
        except (ValueError,KeyError,OSError) as exc:
            errors.append(dict(id=jid,error=str(exc)))
    attempts=len(list((PROD/'attempts').glob('A*.json')))
    generated=len(list((PROD/'receipts').glob('A*.json')))
    reviewed=sum(json.loads(p.read_text()).get('reviewStatus') in ['accepted','accepted-partial','rejected']
                 for p in (PROD/'receipts').glob('A*.json'))
    result=dict(plannedCalls=800,attempted=attempts,generated=generated,accepted=accepted,
                reviewed=reviewed,
                directionalCharacters=sum('walkBack' in c.get('clips',{}) for c in characters),
                roleCharacters=sum('roleWork' in c.get('clips',{}) for c in characters),
                environmentObjects=sum(len(s['animatedScenery']) for s in stages),errors=errors,sheets=reports)
    (PROD/'review').mkdir(parents=True,exist_ok=True)
    (PROD/'review/build.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    if strict and errors:
        raise ValueError(f'Animation build errors: {errors}')
    if strict and (attempts!=800 or generated!=800 or reviewed!=800):
        raise ValueError(f'Animation release requires all 800 generation calls and reviews: {attempts=}, {generated=}, {reviewed=}')
    return result
