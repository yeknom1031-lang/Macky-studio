"""Check atlas boundaries without painting or altering generated source artwork.

Use --apply only after visual inspection. Quality exclusions remain cumulative.
"""
import argparse,json
from pathlib import Path
from PIL import Image

parser=argparse.ArgumentParser()
parser.add_argument('--start',type=int,default=1)
parser.add_argument('--end',type=int,default=800)
parser.add_argument('--apply',action='store_true')
args=parser.parse_args()
root=Path(__file__).resolve().parent.parent
jobs=json.loads((root/'assets/source-art/rich-800/jobs.json').read_text())
report=[]
for job in jobs:
    if not args.start<=job['id']<=args.end: continue
    path=root/f"assets/source-art/rich-800/receipts/{job['id']:04}.json"
    if not path.exists(): continue
    receipt=json.loads(path.read_text())
    if receipt['status']!='complete': continue
    counts=[]
    if job['transparent']:
        im=Image.open(root/receipt['source']).convert('RGBA').getchannel('A')
        cw,ch=im.width/job['columns'],im.height/job['rows']
        for index in range(job['frames']):
            x,y=index%job['columns'],index//job['columns']
            cell=im.crop((round(x*cw),round(y*ch),round((x+1)*cw),round((y+1)*ch)))
            strips=[cell.crop((0,0,cell.width,1)),cell.crop((0,cell.height-1,cell.width,cell.height)),cell.crop((0,0,1,cell.height)),cell.crop((cell.width-1,0,cell.width,cell.height))]
            counts.append(sum(sum(strip.histogram()[129:]) for strip in strips))
    excluded=[i for i,n in enumerate(counts) if n>4]
    previous=receipt.get('usableFrames',list(range(job['frames'])))
    usable=[i for i in previous if i not in excluded]
    newlyExcluded=[i for i in previous if i in excluded]
    if newlyExcluded: report.append({'id':job['id'],'edgePixels':counts,'newlyExcluded':newlyExcluded,'remaining':usable})
    if args.apply:
        receipt['usableFrames']=usable
        receipt['boundaryAudit']={'opaquePixelsAtEdges':counts,'excludedFrames':excluded,'threshold':4}
        if not usable:
            receipt['status']='rejected'
            receipt['qualityNote']=(receipt.get('qualityNote','')+' All cells touch atlas boundaries; excluded conservatively.').strip()
        if receipt.get('posterFrame') not in usable and usable:
            receipt['posterFrame']=usable[0]
        path.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
