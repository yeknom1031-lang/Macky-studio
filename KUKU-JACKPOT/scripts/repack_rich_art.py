"""Rebuild adopted runtime atlases from untouched local generated originals."""
import json,subprocess,sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed

root=Path(__file__).resolve().parent.parent
jobs=json.loads((root/'assets/source-art/rich-800/jobs.json').read_text())
selected=[]
for job in jobs:
    path=root/f"assets/source-art/rich-800/receipts/{job['id']:04}.json"
    if path.exists():
        receipt=json.loads(path.read_text())
        if receipt['status']=='complete': selected.append((job,receipt))

def pack(item):
    job,receipt=item
    output=subprocess.check_output([sys.executable,str(root/'scripts/pack_rich_art.py'),str(root/receipt['source']),str(root/'assets/runtime/rich'/receipt['runtime']),str(job['columns']),str(job['rows']),'alpha' if job['transparent'] else 'opaque'],text=True)
    return {'id':job['id'],**json.loads(output)}

packed=[]
with ThreadPoolExecutor(max_workers=4) as pool:
    futures=[pool.submit(pack,item) for item in selected]
    for future in as_completed(futures):
        packed.append(future.result())
        if len(packed)%50==0: print(f'Packed {len(packed)} / {len(selected)}',flush=True)
# Generation workers may still be writing quality reviews. Do not overwrite receipts here.
(root/'assets/source-art/rich-800/packing-report.json').write_text(json.dumps(sorted(packed,key=lambda r:r['id']),indent=2)+'\n')
print(f'Packed {len(packed)} adopted atlases with preserved cell proportions.',flush=True)
