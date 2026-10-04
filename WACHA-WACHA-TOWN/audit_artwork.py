"""Read-only source/atlas audit. --release rejects missing, stale or unreviewed art.

Row component counts are a review aid, never proof of missing artwork: touching
silhouettes can merge. Human decisions are bound to the exact source SHA-256.
"""
from pathlib import Path
from collections import deque
import argparse, hashlib, json
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parent
P=ROOT/'assets/production'
REVIEW=P/'review'

def all_jobs():
    manifest=json.loads((P/'jobs.json').read_text())
    repairs=json.loads((P/'repairs.json').read_text())
    jobs=manifest['jobs']+repairs.get('jobs',[])+json.loads((P/'animal-jobs.json').read_text())['jobs']
    for j in jobs:
        if j['id'] in repairs.get('sourceRows',{}):
            j['characters']=repairs['sourceRows'][j['id']]
            j['rows']=len(j['characters'])
        for field in ['columnBoundaries','frameOverrides']:
            if j['id'] in repairs.get(field,{}):j[field]=repairs[field][j['id']]
    return jobs,manifest

def component_rows(im,col,rows):
    w,h=im.size;left=round(col*w/8);right=round((col+1)*w/8)
    a=np.asarray(im.crop((left,0,right,h)).resize((max(1,(right-left)//4),max(1,h//4)),Image.Resampling.BOX).getchannel('A'))>130
    points=set(map(tuple,np.argwhere(a)));components=[]
    while points:
        first=points.pop();q=deque([first]);group=[first]
        while q:
            y,x=q.popleft()
            for p in ((y+1,x),(y-1,x),(y,x+1),(y,x-1)):
                if p in points:points.remove(p);q.append(p);group.append(p)
        if len(group)>100:
            yy=[p[0]*4 for p in group];components.append((sum(yy)/len(yy),len(group)))
    groups=[]
    for y,weight in sorted(components,key=lambda c:-c[1]):
        if not any(abs(y-v[0])<h/max(rows,10)*.5 for v in groups):groups.append((y,weight))
    return len(groups)

def audit(release=False):
    REVIEW.mkdir(exist_ok=True)
    jobs,manifest=all_jobs();by_id={j['id']:j for j in jobs}
    decisions_path=REVIEW/'artwork-decisions.json'
    decisions=json.loads(decisions_path.read_text()) if decisions_path.exists() else {}
    cache_path=REVIEW/'source-audit-cache.json'
    cache=json.loads(cache_path.read_text()) if cache_path.exists() else {}
    data_path=ROOT/'expedition/data.js'
    data=json.loads(data_path.read_text().removeprefix('window.WACHA24_DATA=').removesuffix(';')) if data_path.exists() else {}
    metadata=data.get('sourceMetadata',{})
    results=[];hashes={};missing=[];errors=[];identities=[]
    if len(by_id)!=len(jobs):errors.append('Duplicate job ID in manifest')
    for j in jobs:
        jid=j['id'];path=P/'source'/(jid+'.png');issues=[];warnings=[]
        identities+=j.get('characters',[])
        if not path.exists():missing.append(jid);continue
        digest=hashlib.sha256(path.read_bytes()).hexdigest()
        if digest in hashes:issues.append('Identical original source: '+hashes[digest])
        hashes[digest]=jid
        try:
            im=Image.open(path);im.load();im=im.convert('RGBA');a=np.asarray(im.getchannel('A'))
        except Exception as e:
            results.append(dict(id=jid,sha256=digest,issues=['Unreadable PNG: '+str(e)]));continue
        counts=None
        if j['kind']!='background':
            if (a<40).mean()<.04:issues.append('Missing transparent background')
            if (a>100).mean()<.015:issues.append('Almost empty source')
            if j['kind'] in ['people','animals']:
                if len(j['characters'])!=j['rows']:issues.append('Row-to-character mapping mismatch')
                cached=cache.get(jid,{})
                if cached.get('sha256')==digest and cached.get('rows')==j['rows']:
                    counts=cached['counts']
                else:
                    counts=[component_rows(im,c,j['rows']) for c in range(4)]
                    cache[jid]=dict(sha256=digest,rows=j['rows'],counts=counts)
                if max(counts)<j['rows']:
                    decision=decisions.get(jid,{})
                    if decision.get('sha256')!=digest or decision.get('rows')!=j['rows'] or decision.get('status')!='accepted':
                        issues.append(f'Visual row inspection required: detected {counts}, expected {j["rows"]}')
                    else:warnings.append('Touching silhouettes: exact source visually accepted')
            meta=metadata.get(jid,{})
            frames=meta.get('frames',[])
            if meta.get('sha256')!=digest:issues.append('Built atlas missing or stale')
            if len(frames)!=j['rows'] or any(len(row)!=j['cols'] for row in frames):issues.append('Atlas frame count mismatch')
            else:
                for row,poses in enumerate(frames):
                    for col,f in enumerate(poses):
                        box=f.get('source',[])
                        expected_patch=next((v for v in j.get('frameOverrides',[]) if v['row']==row and v['col']==col),None)
                        if expected_patch and (f.get('sourceImage')!=expected_patch['source'] or box!=expected_patch['box']):
                            issues.append(f'Corrective pose not built {row+1}/{col+1}')
                        column_bounds=j.get('columnBoundaries',{}).get(str(row))
                        if column_bounds and not f.get('sourceImage') and len(box)==4 and not(column_bounds[col]<=box[0]<box[2]<=column_bounds[col+1]):
                            issues.append(f'Corrective column boundary not built {row+1}/{col+1}')
                        frame_im=im;frame_alpha=a
                        if f.get('sourceImage'):
                            patch_path=P/'source'/(f['sourceImage']+'.png')
                            if not patch_path.exists():
                                issues.append('Missing corrective source: '+f['sourceImage']);continue
                            patch_digest=hashlib.sha256(patch_path.read_bytes()).hexdigest()
                            if metadata.get(f['sourceImage'],{}).get('sha256')!=patch_digest:issues.append('Stale corrective source: '+f['sourceImage'])
                            frame_im=Image.open(patch_path).convert('RGBA');frame_alpha=np.asarray(frame_im.getchannel('A'))
                        if len(box)!=4 or not(0<=box[0]<box[2]<=frame_im.width and 0<=box[1]<box[3]<=frame_im.height):
                            issues.append(f'Invalid source rectangle {row+1}/{col+1}');continue
                        alpha=frame_alpha[box[1]:box[3],box[0]:box[2]]
                        if np.count_nonzero(alpha>100)<100:issues.append(f'Empty atlas frame {row+1}/{col+1}')
                if not (ROOT/'expedition/images'/f'{jid}.js').exists():issues.append('Missing offline atlas file')
        elif metadata.get(jid,{}).get('sha256')!=digest:issues.append('Built background missing or stale')
        receipt=P/'receipts'/f'{jid}.json'
        if not receipt.exists():issues.append('Missing image-generation receipt')
        else:
            try:
                r=json.loads(receipt.read_text())
                if r.get('id')!=jid or not r.get('prompt') or not (r.get('method')=='built-in' or r.get('tool')=='built-in image_gen'):issues.append('Incomplete image-generation receipt')
            except (ValueError,TypeError):issues.append('Invalid image-generation receipt')
        results.append(dict(id=jid,width=im.width,height=im.height,sha256=digest,rowCounts=counts,issues=issues,warnings=warnings))
    if len(set(identities))!=len(identities):errors.append('Duplicate character ID assigned to source rows')
    expected={c['id'] for c in manifest['characters']} | {a['id'] for a in json.loads((P/'animal-jobs.json').read_text())['animals'] if not a.get('legacyId')}
    if set(identities)!=expected:errors.append('Source identity coverage mismatch: '+json.dumps(dict(missing=sorted(expected-set(identities)),extra=sorted(set(identities)-expected))))
    blockers=[dict(id=r['id'],issues=r['issues']) for r in results if r['issues']]
    report=dict(planned=len(jobs),present=len(results),missing=missing,errors=errors,blocking=blockers,passed=not(missing or errors or blockers),records=results)
    cache_path.write_text(json.dumps(cache,separators=(',',':')))
    (REVIEW/'artwork-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps({k:v for k,v in report.items() if k!='records'},ensure_ascii=False))
    if release and not report['passed']:raise SystemExit('Artwork release gate failed. Inspect assets/production/review/artwork-audit.json')
    return report

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--release',action='store_true');args=parser.parse_args();audit(args.release)
