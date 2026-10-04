"""Retain all 18 existing animal designs, then fill the 96-design catalogue."""
import json
from pathlib import Path
P=Path(__file__).resolve().parent/'assets/production';root=P.parent.parent
ledger=json.loads((root/'docs/production-plan/production-ledger.json').read_text());old=json.loads((root/'docs/production-plan/existing-assets.json').read_text())
reuse=dict(zip(['AN001','AN002','AN003','AN004','AN005','AN006','AN007','AN008','AN009','AN010','AN012','AN015','AN034','AN041','AN043','AN044','AN045','AN053'],['EX026','EX025','EX221','EX224','EX028','EX027','EX222','EX223','EX029','EX030','EX032','EX031','EX228','EX230','EX227','EX226','EX225','EX229']))
old_by={c['id']:c for c in old['characters']};animals=[]
for a in ledger['animals']:
 a=dict(a);n=int(a['id'][2:]);a['habitat']='air' if 17<=n<=33 or n in [39,40] or 73<=n<=80 or n in [89,92,93,96] else 'water' if 60<=n<=72 or n==95 else 'ground'
 if a['id'] in reuse:a['legacyId']=reuse[a['id']];a['proposedName']=a['name'];a['name']=old_by[a['legacyId']]['name'];a['habitat']='ground'
 a['height']=1.12 if a['group']=='大型動物' else .42 if a['group']=='昆虫' else .7
 animals.append(a)
new=[a for a in animals if not a.get('legacyId')];jobs=[]
for start in range(0,len(new),5):
 rows=new[start:start+5];n=len(rows);descriptions=[]
 for i,a in enumerate(rows):
  action='FOUR different phases of airborne wing beats in columns 1-4; four hovering or turning poses in columns 5-8' if a['habitat']=='air' else 'four clearly different swimming poses in columns 1-4; four turning and tail/fin flexing poses in columns 5-8' if a['habitat']=='water' else 'four different walking poses with alternate legs forward in columns 1-4; four grooming, sniffing, feeding or playful poses in columns 5-8'
  descriptions.append(f"ROW {i+1}: {a['name']} ({a['group']}). {action}.")
 prompt=f"""Use case: stylized-concept. A beautiful polished hand-painted cute storybook game ANIMAL sprite sheet. Exactly {n} rows, eight columns, no humans. One distinct animal species and anatomy per row, same identity in every cell. Entire body, ears, tail, wings, feet must be visible, never cropped or overlapping. Generous 15 percent clear transparent gutters between all cells and 5 percent outside margin. Genuine transparent alpha, NO scenery, labels, boxes, grid lines or cast shadows. Three-quarter elevated view facing right, crisp dark soft outlines, warm appealing painted details. First four columns are a smooth moving cycle, last four are another species-appropriate action loop. Clear motion changes, not copied poses. All EIGHT poses and ALL {n} rows, including the final row, fully drawn. Distinct real anatomies and silhouettes, no recolours.\n"""+'\n'.join(descriptions)
 jobs.append(dict(id=f'A-animals-{start//5+1:02}',kind='animals',stage='A',rows=n,cols=8,characters=[a['id'] for a in rows],prompt=prompt))
(P/'animal-jobs.json').write_text(json.dumps(dict(animals=animals,jobs=jobs,reuse=reuse),ensure_ascii=False,indent=2));print(len(new),'new animals in',len(jobs),'sheets')
