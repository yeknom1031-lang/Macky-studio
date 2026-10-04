"""Build the offline, lazily loaded 24-stage edition from real accepted artwork.

Missing artwork is reported, never filled with repeated characters or recolours.
The existing index.html remains playable until the full release passes its gate.
"""
import argparse
import base64
import hashlib
import json
import math
import sys
from pathlib import Path
from PIL import Image
import numpy as np
from world_layout import layout
from sprite_layout import clean_bounds, person_boundaries, character_columns
from legacy_roles import role as legacy_role
from quality_backgrounds import scene_assets

ROOT=Path(__file__).resolve().parent
PROD=ROOT/'assets/production'
OUT=ROOT/'expedition'
TILE=96

def write_atomic(path,text):
    temporary=path.with_suffix(path.suffix+'.tmp')
    temporary.write_text(text)
    temporary.replace(path)

def asset(key,im,quality=92):
    import io
    f=io.BytesIO();im.save(f,'WEBP',quality=quality,method=4)
    data='data:image/webp;base64,'+base64.b64encode(f.getvalue()).decode()
    write_atomic(OUT/'images'/f'{key}.js','Wacha24Images['+json.dumps(key)+']='+json.dumps(data)+';')
    return key

def boundaries(alpha,n,axis):
    projection=(alpha>80).sum(axis=1 if axis=='y' else 0)
    size=len(projection);result=[0]
    for k in range(1,n):
        mid=k*size/n;span=size/n*.17;lo=max(1,round(mid-span));hi=min(size,round(mid+span));
        result.append(lo+int(np.argmin(projection[lo:hi])))
    return result+[size]

def measure(job,path):
    im=Image.open(path).convert('RGBA');a=np.asarray(im.getchannel('A'))
    if job['kind']=='background':return im,None
    if (a<40).mean()<.04:raise ValueError(f'{job["id"]}: transparent sheet required')
    ys=person_boundaries(a,job['rows'],job.get('rowBoundaries')) if job['kind'] in ['people','animals'] else boundaries(a,job['rows'],'y');cells=[]
    for row in range(job['rows']):
        y0,y1=ys[row:row+2];xs=job.get('columnBoundaries',{}).get(str(row)) or boundaries(a[y0:y1],job['cols'],'x');poses=[]
        selected=range(job['cols'])
        for col in selected:
            x0,x1=xs[col:col+2];cy0,cy1=y0,y1
            if job['id']=='S04-set' and row>=2:
                # This sheet has two complete environment rows, with a double-width
                # awning at the end of each. Preserve each whole awning pose.
                edges=[0,105,221,337,447,557,665,776,886,998,1109,1219,1330,1438,1547,1774]
                slot=col if row==2 else col+8
                if slot<14:
                    x0,x1=[round(v*im.width/1774) for v in edges[slot:slot+2]]
                else:
                    x0,x1=round(1547*im.width/1774),im.width
                    cy0,cy1=ys[2:4] if slot==14 else ys[3:5]
            alpha=a[cy0:cy1,x0:x1];yy,xx=np.nonzero(alpha>100)
            if len(xx)<100:raise ValueError(f'{job["id"]}: missing cell {row+1},{col+1}')
            crop=clean_bounds(alpha) if job['kind'] in ['people','animals'] else None
            box=(x0+crop[0],cy0+crop[1],x0+crop[2],cy0+crop[3]) if crop else (x0+int(xx.min()),cy0+int(yy.min()),x0+int(xx.max())+1,cy0+int(yy.max())+1)
            patch=next((v for v in job.get('frameOverrides',[]) if v['row']==row and v['col']==col),None)
            if patch:
                patch_im=Image.open(PROD/'source'/(patch['source']+'.png')).convert('RGBA')
                box=tuple(patch['box']);pose=patch_im.crop(box)
                height=patch.get('renderHeight',y1-y0-8)
                pose=pose.resize((max(1,round(pose.width*height/pose.height)),height),Image.Resampling.LANCZOS)
                poses.append((pose,box,patch['source']))
            else:poses.append((im.crop(box),box,None))
        cells.append(poses)
    cell_size=TILE if job['kind'] in ['people','animals'] else 192
    sheet=Image.new('RGBA',(job['cols']*cell_size,job['rows']*cell_size));rects=[]
    for row,poses in enumerate(cells):
        scale=min((cell_size-8)/max(p.width for p,b,s in poses),(cell_size-8)/max(p.height for p,b,s in poses))
        frames=[]
        for col,(p,box,source_image) in enumerate(poses):
            sprite=p.resize((max(1,round(p.width*scale)),max(1,round(p.height*scale))),Image.Resampling.LANCZOS)
            x=col*cell_size+(cell_size-sprite.width)//2;y=(row+1)*cell_size-3-sprite.height
            sheet.alpha_composite(sprite,(x,y));frames.append(dict(x=col*cell_size,y=row*cell_size,w=cell_size,h=cell_size,source=list(box)))
            if source_image:frames[-1]['sourceImage']=source_image
        rects.append(frames)
    return sheet,rects

def lattice(w,h):
    # The generated maps use open corridors; per-map measured overrides can replace this.
    xs=[.08,.36,.655,.925];ys=[.365,.71];nodes=[];by={};step=16
    def add(x,y):
        k=(round(x),round(y))
        if k not in by:by[k]=len(nodes);nodes.append([k[0],k[1],[],0])
        return by[k]
    def line(x0,y0,x1,y1):
        n=math.ceil(math.hypot(x1-x0,y1-y0)/step);ids=[add(x0+(x1-x0)*k/n,y0+(y1-y0)*k/n) for k in range(n+1)]
        for a,b in zip(ids,ids[1:]):
            if b not in nodes[a][2]:nodes[a][2].append(b)
            if a not in nodes[b][2]:nodes[b][2].append(a)
    for y in ys:
        for a,b in zip(xs,xs[1:]):line(a*w,y*h,b*w,y*h)
    for x in xs:line(x*w,ys[0]*h,x*w,ys[1]*h)
    return nodes

def build(release=False):
    OUT.mkdir(exist_ok=True);(OUT/'images').mkdir(exist_ok=True)
    manifest=json.loads((PROD/'jobs.json').read_text());legacy=json.loads((ROOT/'docs/production-plan/existing-assets.json').read_text());oldmeta=json.loads((ROOT/'assets/runtime/atlas-meta.json').read_text())
    animal_plan=json.loads((PROD/'animal-jobs.json').read_text());animal_by={a['id']:a for a in animal_plan['animals']};legacy_animals={a['legacyId']:a for a in animal_plan['animals'] if a.get('legacyId')}
    # Keep original accepted legacy atlas; palette conversion is never applied in this edition.
    asset('legacy',Image.open(ROOT/'assets/runtime/crowd-atlas.webp'))
    asset('cover',Image.open(ROOT/'assets/runtime/cover.webp'))
    old_navigation=json.loads((ROOT/'assets/navigation.json').read_text())
    oldinfo=legacy['characters'];characters=[];jobs_by_id={};missing=[];errors=[];source_meta={}
    cache_path=PROD/'sprite-cache.json';cache=json.loads(cache_path.read_text()) if cache_path.exists() else {}
    for c in oldinfo:
        base=c['legacy_base_index'];characters.append(dict(id=c['id'],name=c['name'],stage='A' if c['animal'] else 'G',animal=c['animal'],role=legacy_role(c),height=.66 if c['animal'] else 1,action='legacy',image='legacy',frames=oldmeta['rects'][base],legacy=True,base=base,photographer=False,nonCrowd=c['action']=='photo'))
        if c['animal']:characters[-1].update(animalId=legacy_animals[c['id']]['id'],habitat='ground',group=legacy_animals[c['id']]['group'])
    proposed={c['id']:c for c in manifest['characters']}
    repair_path=PROD/'repairs.json';repairs=json.loads(repair_path.read_text()) if repair_path.exists() else {}
    for job in manifest['jobs']:
        if job['id'] in repairs.get('sourceRows',{}):
            job['characters']=repairs['sourceRows'][job['id']];job['rows']=len(job['characters']);job['rowBoundaries']=repairs.get('rowBoundaries',{}).get(job['id'])
    manifest['jobs']+=repairs.get('jobs',[])
    manifest['jobs']+=animal_plan['jobs']
    for job in manifest['jobs']:
        for field in ['columnBoundaries','frameOverrides']:
            if job['id'] in repairs.get(field,{}):job[field]=repairs[field][job['id']]
        path=PROD/'source'/f'{job["id"]}.png'
        if not path.exists() or not (PROD/'receipts'/f'{job["id"]}.json').exists():missing.append(job['id']);continue
        patch_paths=[PROD/'source'/(v['source']+'.png') for v in job.get('frameOverrides',[])]
        if any(not p.exists() for p in patch_paths):missing.append(job['id']);continue
        try:
            signature=path.read_bytes()+(b'grid-v4-awning' if job['id']=='S04-set' else b'grid-v3')+json.dumps(job.get('rowBoundaries')).encode()
            extras={k:job[k] for k in ['columnBoundaries','frameOverrides'] if job.get(k)}
            if extras:
                signature+=json.dumps(extras,sort_keys=True).encode()
                for patch_path in sorted(set(patch_paths)):signature+=hashlib.sha256(patch_path.read_bytes()).digest()
            digest=hashlib.sha256(signature).hexdigest();cached=cache.get(job['id']);key=job['id']
            if cached and cached['signature']==digest and (OUT/'images'/f'{key}.js').exists():frames=cached['frames']
            else:
                image,frames=measure(job,path);asset(key,image);cache[key]=dict(signature=digest,frames=frames)
            jobs_by_id[key]=job;source_meta[key]=dict(path=str(path.relative_to(ROOT)),sha256=hashlib.sha256(path.read_bytes()).hexdigest(),frames=frames)
            if job['kind']=='people':
                for row,cid in enumerate(job['characters']):
                    c=proposed[cid];height=.84 if '小柄' in c['design'] else 1.13 if any(word in c['design'] for word in ['大柄','背が高','脚が長']) else 1
                    characters.append(dict(id=cid,name=c['name'],stage='G' if c['stage']=='COMMON' else c['stage'],role=c['role'],height=height,animal=False,action=c['role'],photographer=c['photographer'],image=key,frames=frames[row],design=c['design'],nonCrowd=not c['photographer'] and c['role'] in ['R200','R201','R202']))
            elif job['kind']=='animals':
                for row,cid in enumerate(job['characters']):
                    a=animal_by[cid];characters.append(dict(id=cid,animalId=cid,name=a['name'],stage='A',role='R096',height=a['height'],animal=True,habitat=a['habitat'],group=a['group'],action='animal',photographer=False,image=key,frames=frames[row]))
        except ValueError as e:errors.append(str(e))
    old_names=['01-festival','02-garden','03-seaside','04-sweets','05-autumn','06-snow','07-lantern'];stages=[]
    for i,src in enumerate(manifest['stages']):
        key=f'S{i+1:02}';scale=math.sqrt(src['area']);w=round(1672*scale);h=round(941*scale)
        background=old_names[i] if i<7 else f'{key}-background'
        if i<7:asset(background,Image.open(ROOT/'assets/runtime'/f'{background}.webp'))
        navigation=old_navigation[i] if i<7 else lattice(w,h)
        override=PROD/'navigation'/f'{key}.json'
        if override.exists():navigation=json.loads(override.read_text())
        cast=[c for c in characters if c['stage']==key];all_cast=[c for c in proposed.values() if c['stage']==key]
        role_ids=list(dict.fromkeys(c['role'] for c in all_cast))
        water_path=PROD/'navigation'/f'{key}-water.json';water=json.loads(water_path.read_text()) if water_path.exists() else []
        world_layout=layout(src,navigation,w,h,role_ids,water)
        navigation,fixtures,sites=world_layout[:3]
        spatial_metadata=world_layout[3] if len(world_layout)>3 else {}
        scenery=scene_assets(key,w,h,asset)
        common=sum(c['stage']=='G' and not c['animal'] and not c.get('nonCrowd') for c in characters);animal_count=sum(c['animal'] for c in characters)
        complete=len(cast)==100 and common>=src['pop']-100-min(18,animal_count) and f'{key}-set' in jobs_by_id and (i<7 or background in jobs_by_id)
        stages.append(dict(id=i,key=key,name=src['name'],area=src['area'],population=src['pop'],width=w,height=h,background=background,setImage=f'{key}-set',navigation=navigation,fixtures=fixtures,sites=sites,waterPoints=water,water=[water[0][0]/w,water[0][1]/h] if water else None,events=src['events'].split('|'),environment=src['env'].split('|'),vehicles=src['vehicles'].split('|'),ready=complete,castAvailable=len(cast)))
        stages[-1].update(spatial_metadata)
        stages[-1].update(scenery)
    quality_count=sum(bool(s.get('openBuildings'))+len(s.get('backgroundTiles',[])) for s in stages)
    data=dict(version=2,releaseVersion='2.1',characters=characters,stages=stages,roles=manifest['roles'],animalCatalog=animal_plan['animals'],sourceMetadata=source_meta,status=dict(generated=len(jobs_by_id),planned=len(manifest['jobs']),qualityGenerated=quality_count,qualityPlanned=76,totalGenerated=len(jobs_by_id)+quality_count,missing=missing,errors=errors))
    write_atomic(OUT/'data.js','window.WACHA24_DATA='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';')
    cache_path.write_text(json.dumps(cache,separators=(',',':')))
    (PROD/'build-report.json').write_text(json.dumps(data['status']|dict(characters=len(characters),playableStages=[s['key'] for s in stages if s['ready']]),ensure_ascii=False,indent=2))
    for name in ['expedition-core.js','expedition-render.js','expedition-app.js','expedition-input.js','expedition-audio.js','expedition.css']:
        path=ROOT/'src'/name
        if path.exists():(OUT/name).write_bytes(path.read_bytes())
    shell=ROOT/'src/expedition.html'
    if shell.exists():(OUT/'index.html').write_bytes(shell.read_bytes())
    import shutil
    audio=ROOT/'assets/audio/runtime'
    if audio.exists():
        shutil.copytree(audio,OUT/'audio',dirs_exist_ok=True)
        credits=ROOT/'assets/audio/CREDITS.html'
        if credits.exists():shutil.copyfile(credits,OUT/'audio/CREDITS.html')
    print(json.dumps(dict(characters=len(characters),generated=len(jobs_by_id),planned=len(manifest['jobs']),playable=[s['key'] for s in stages if s['ready']],errors=errors),ensure_ascii=False))
    if release and (missing or errors or not all(s['ready'] for s in stages)):raise SystemExit('Release blocked: incomplete artwork. See assets/production/build-report.json')
    if release and (quality_count!=76 or not all(s.get('livingTown') and len(s.get('activityAreas',[]))>=6 for s in stages)):
        raise SystemExit('Release blocked: finish the 76 background/detail images and all 24 living-space layouts.')
    return data

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--release',action='store_true');args=parser.parse_args();build(args.release)
