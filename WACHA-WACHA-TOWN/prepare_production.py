"""Prepare resumable, explicit image-generation jobs. Never generates via an API."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / 'docs/production-plan'))
from catalog_source import STAGES

OUT = ROOT / 'assets/production'
OUT.mkdir(exist_ok=True)
(OUT / 'receipts').mkdir(exist_ok=True)
ledger = json.loads((ROOT / 'docs/production-plan/production-ledger.json').read_text())
roles = {r['id']: r for r in ledger['roles']}
people = ledger['characters'][:2400] + ledger['characters'][2400 + 232:]
jobs = []
for prefix in [f'S{i:02}' for i in range(1,25)] + ['G']:
    cast = [c for c in people if c['id'].startswith(prefix + '-C')]
    for start in range(0,len(cast),10):
        batch = cast[start:start+10]
        jid = f'{prefix}-people-{start//10+1:02}'
        rows = '\n'.join(f"Row {i+1}: {c['name']}. {c['design']} Work cycle: {roles[c['role']]['name']}." for i,c in enumerate(batch))
        prompt = f'''Use case: stylized-concept. Production character animation sprite sheet for Wacha Wacha Town. Reference image is STYLE ONLY, do not copy those characters. Exactly {len(batch)} distinct NEW character rows and EIGHT equal columns. Portrait grid, transparent alpha, no text, no lines, no floor, no cast shadows. Cute polished hand-painted storybook chibi, soft dark outlines, three-quarter view slightly from above facing right. Columns 1–4: coherent four-pose walk loop. Columns 5–8: coherent four-pose dedicated work/action loop. Same face, body, outfit, tool throughout each row. Entire head, feet and tools must fit each cell with 8 percent gutters. Fixed foot baseline, scale and camera. Eight distinct poses per row. NO color-swapped characters: distinct anatomy, clothing construction and tools. Keep details legible at 80px tall. Do not omit or merge rows. Grid is 8 columns by {len(batch)} rows, about 1120 by {len(batch)*140} pixels. Props held in hands only; large stationary equipment supplied separately. Stage appropriate diverse skin tones, age, body shapes, clothing. Row identities:\n{rows}'''
        jobs.append(dict(id=jid,kind='people',stage=prefix,characters=[c['id'] for c in batch],rows=len(batch),cols=8,prompt=prompt,transparent=True,reference='assets/expansion/expansion-01.png'))

english = ['Festival town','Flower garden','Seaside market','Candy town','Autumn book fair','Snowy market','Lantern night','Hillside Japanese hot spring town','Grand railway station','Canal and bridge town','Harvest farm','Large amusement park','Zoo','Film studio backlot','Airship harbor','Grand museum','Clockwork workshop town','Desert bazaar','Snow mountain resort','Ocean research city','Town above the clouds','Magic academy','Day and night metropolis','Great world carnival']
for i,stage in enumerate(STAGES):
    sid = f'S{i+1:02}'
    if i>=7:
        prompt=f'''Use case: stylized-concept. Beautiful premium storybook game exploration map, {english[i]}, {stage['name']}. Same cute warm illustrated world as Wacha Wacha Town. Wide 16:9 landscape, orthographic three-quarter elevated view, complete level seen from above, no horizon, no people, no animals, no UI, no text. Detailed themed architecture and activity places: {stage['zones']}. IMPORTANT GAMEPLAY LAYOUT: wide connected pale paved streets form a rectangular lattice at x=8%,36%,64%,92% and y=18%,50%,82%, joined at intersections; keep these straight street centerlines clear. Buildings and equipment clustered BETWEEN streets in six block islands; leave generous streets occupying half the area for hundreds of tiny people. At top edges of building blocks include open second-floor balconies and stairs. Broad lower promenade. Environment theme {stage['env']}. No large foreground objects obscuring walkable streets. Consistent isometric scale, natural warm light, beautifully painted crisp miniature details, not pixel art.''' 
        jobs.append(dict(id=f'{sid}-background',kind='background',stage=sid,prompt=prompt,transparent=False))
    prompt=f'''Use case: stylized-concept. Transparent sprite sheet of high-quality hand-painted game props for {stage['name']}, {english[i]}. STYLE reference only. EXACT 8 columns by 4 rows, 32 distinct isolated equal cells, orthographic three-quarter top-down miniature storybook style, no people or text, transparent alpha, generous gutters. Row 1 columns 1–8: eight thematic workplace fixtures matching {stage['zones']} with counters, benches, visible empty seats, workshop tables. Row 2: four different vehicles {stage['vehicles']}, each in two sequential poses (wheel turn or sail movement), 8 cells. Row 3: first four environmental subjects from {stage['env']}, two animation poses each, 8 cells. Row 4: remaining four environmental subjects from {stage['env']}, two animation poses each, 8 cells. All eight environment subjects are distinct forms; birds have two clear wing poses; cloth/balloons have two swaying poses. Fixtures front facing with open work area above counter line. Vehicles are side three-quarter open-topped so passengers can be drawn on top. No color variations of a single object. Art is crisp and charming, not icons, no ground scenery.''' 
    jobs.append(dict(id=f'{sid}-set',kind='set',stage=sid,rows=4,cols=8,prompt=prompt,transparent=True,reference='assets/town-props.png'))

data=dict(version=1,characters=people,roles=ledger['roles'],stages=[dict(id=i,**s) for i,s in enumerate(STAGES)],jobs=jobs)
(OUT/'jobs.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
print(f'{len(people)} new people; {sum(j["kind"]=="people" for j in jobs)} character sheets; {len(jobs)} total jobs')
