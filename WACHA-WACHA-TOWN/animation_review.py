"""Render technical extraction contact sheets for manual frame-by-frame review.

This never marks art as accepted and never changes generated source pixels.
"""
import argparse
import json
from PIL import Image, ImageDraw
from animation_assets import PROD, pack


def contact(start, end):
    for first in range(start,end+1,4):
        last=min(first+3,end)
        sheet=Image.new('RGB',(1152,(last-first+1)*408),'#dce8cf')
        draw=ImageDraw.Draw(sheet)
        for row,n in enumerate(range(first,last+1)):
            jid=f'A{n:04}'
            job=json.loads((PROD/'jobs'/f'{jid}.json').read_text())
            try:
                bitmap,frames,report=pack(job,PROD/'source'/f'{jid}.png')
                (PROD/'review'/f'{jid}-packed-review.json').write_text(json.dumps(report,indent=2)+'\n')
                sheet.paste(bitmap,(0,row*408+24),bitmap)
                draw.text((8,row*408+4),jid,fill='black')
                print(jid,report['warnings'],flush=True)
            except Exception as error:
                print(jid,str(error),flush=True)
                draw.text((8,row*408+4),jid+' ERROR '+str(error),fill='red')
        sheet.save(PROD/'review'/f'root-packed-{first}-{last}.jpg',quality=92)


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('start',type=int)
    parser.add_argument('end',type=int)
    args=parser.parse_args()
    contact(args.start,args.end)
