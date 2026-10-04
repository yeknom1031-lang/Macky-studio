"""Measure real generated environment atlases; diagnostic compositing only.
No image generation or sprite-pixel retouching occurs here. Reviewed originals
are never rewritten. Review sheets must still be inspected by a human/agent.
"""
from pathlib import Path
import json,hashlib,argparse
from PIL import Image,ImageDraw
import numpy as np
ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent

def valley(signal,expected,radius):
 lo=max(1,round(expected-radius));hi=min(len(signal)-1,round(expected+radius))
 minimum=min(signal[lo:hi]);positions=np.flatnonzero(signal[lo:hi]<=minimum)+lo
 return int(positions[np.argmin(abs(positions-expected))])

def review(ids):
 items=[]
 for jid in ids:
  jp=OUT/'jobs'/f'{jid}.json';job=json.loads(jp.read_text());p=OUT/'source'/f'{jid}.png'
  im=Image.open(p).convert('RGBA');a=np.array(im.getchannel('A'));w,h=im.size
  if job.get('atlas',{}).get('measuredOn')=='original-generated-PNG':
   rows=job['atlas']['rowEdges'];columns={str(r):job['atlas']['columnEdges'] for r in range(4)}
  else:
   strong=a>64;sy=strong.sum(axis=1);rows=[0]+[valley(sy,h*i/4,h*.085) for i in range(1,4)]+[h]
   columns={}
   for r in range(4):
    sx=strong[rows[r]:rows[r+1]].sum(axis=0);columns[str(r)]=[0]+[valley(sx,w*i/8,w*.018) for i in range(1,8)]+[w]
  clips=[]
  for r,obj in enumerate(job['objects']):
   cc=columns[str(r)];frames=[]
   for i in range(8):
    box=[cc[i],rows[r],cc[i+1],rows[r+1]];part=im.crop(box);aa=np.array(part.getchannel('A'));ys,xs=np.where(aa>32)
    frames.append({'x':box[0],'y':box[1],'w':part.width,'h':part.height,'visiblePixels':int(len(xs)),'rgbaSHA256':hashlib.sha256(part.tobytes()).hexdigest()})
   clips.append({'id':obj['id'],'name':obj['name'],'frames':frames,'allNonempty':all(f['visiblePixels']>5 for f in frames),'distinctFrames':len(set(f['rgbaSHA256'] for f in frames))})
  job['rowBoundaries']=rows;job['columnBoundaries']=columns;job['status']='generated-awaiting-runtime-integration'
  jp.write_text(json.dumps(job,ensure_ascii=False,indent=2)+'\n')
  color=Image.new('RGBA',im.size,'#91a77d');color.alpha_composite(im);color.convert('RGB').save(OUT/'review'/f'{jid}-on-color.jpg',quality=92)
  item={'id':jid,'size':[w,h],'sourceSHA256':hashlib.sha256(p.read_bytes()).hexdigest(),'alphaZeroFraction':round(float((a==0).mean()),5),'rowBoundaries':rows,'columnBoundaries':columns,'clips':clips,'technicalPassed':all(c['allNonempty'] and c['distinctFrames']==8 for c in clips),'manualVisualReview':'pending'}
  (OUT/'review'/f'{jid}-atlas-review.json').write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n');items.append(item)
 # High enough resolution to inspect all 32 frames at once on a color background.
 for bi in range(0,len(ids),4):
  selected=ids[bi:bi+4];board=Image.new('RGB',(1774,984),'#ece9de');pen=ImageDraw.Draw(board)
  for i,jid in enumerate(selected):
   im=Image.open(OUT/'review'/f'{jid}-on-color.jpg').resize((887,444),Image.Resampling.LANCZOS);x=i%2*887;y=i//2*492;board.paste(im,(x,y+30));pen.text((x+12,y+8),f'{jid}: 4 rows x 8 sequential frames - original alpha composited on green',fill='#111')
  board.save(OUT/'review'/f'environment-grid-{selected[0]}-{selected[-1]}.jpg',quality=92)
 print(json.dumps({'ids':ids,'technicalPassed':all(i['technicalPassed'] for i in items),'frames':len(ids)*32,'manualVisualReview':'pending','grids':[f'environment-grid-{ids[i]}-{ids[min(i+3,len(ids)-1)]}.jpg' for i in range(0,len(ids),4)]}))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('ids',nargs='+');args=p.parse_args();review(args.ids)
