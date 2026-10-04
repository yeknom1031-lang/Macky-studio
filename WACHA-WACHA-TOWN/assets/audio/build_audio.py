"""Prepare compact offline music/ambience from credited, freely licensed sources.

Requires ffmpeg (set WACHA_FFMPEG). Original downloads are never modified.
"""
from pathlib import Path
import concurrent.futures,hashlib,json,os,shutil,subprocess,tempfile,zipfile,re
ROOT=Path(__file__).resolve().parent
FFMPEG=os.environ.get('WACHA_FFMPEG') or shutil.which('ffmpeg')
if not FFMPEG:raise SystemExit('Set WACHA_FFMPEG to an ffmpeg executable.')
# id, kind, source id, archive member or None, duration limit, start offset
specs=[
 ('music-town','music','loop-town',None,None,0),
 ('music-city','music','city',None,None,0),
 ('music-garden','music','quiet-village','Quiet Village/04 HoliznaCC0 - Quiet Village 1.ogg',None,0),
 ('music-market','music','quiet-village','Quiet Village/01 HoliznaCC0 - Quiet Village 2.ogg',None,0),
 ('music-water','music','quiet-village','Quiet Village/02 HoliznaCC0 - Quiet Village 3.ogg',None,0),
 ('music-magic','music','quiet-village','Quiet Village/03 HoliznaCC0 - Quiet Village 4.ogg',None,0),
 ('music-snow','music','ice-bells',None,None,0),
 ('crowd','ambience','crowd',None,60,75),
 ('birds','ambience','birds',None,60,4),
 ('waves','ambience','waves',None,None,0),
 ('wind','ambience','wind',None,None,0),
 ('machine','ambience','machines','ambient machinery 2/motor_1.wav',25,0),
 ('train','ambience','machines','ambient machinery 2/subwayTrain_B-line.wav',30,0),
 ('clockwork','ambience','machines','ambient machinery 2/wind_up_long_1.wav',25,0),
 ('whistle','environment-effect','whistle',None,None,0),
 ('countdown','effect','interface','Audio/pluck_001.ogg',None,0),
 ('start','effect','interface','Audio/confirmation_001.ogg',None,0),
 ('found','effect','jingles','Audio/Pizzicato jingles/jingles_PIZZI04.ogg',None,0),
 ('photographer','effect','interface','Audio/glass_001.ogg',None,0),
 ('wrong','effect','interface','Audio/error_004.ogg',None,0),
 ('lost','effect','jingles','Audio/Pizzicato jingles/jingles_PIZZI15.ogg',None,0),
 ('shutter','effect','interface','Audio/click_002.ogg',None,0),
 ('develop','effect','interface','Audio/confirmation_002.ogg',None,0),
 ('click','effect','interface','Audio/select_001.ogg',None,0),
]
sources={x['id']:x for x in json.loads((ROOT/'sources.json').read_text())}
(ROOT/'runtime').mkdir(exist_ok=True)
def convert(spec):
 id,kind,source,member,limit,offset=spec;s=sources[source];path=ROOT/s['file']
 with tempfile.TemporaryDirectory(prefix='wacha-audio-') as temporary:
  if member:
   dest=Path(temporary)/Path(member).name;dest.write_bytes(zipfile.ZipFile(path).read(member));path=dest
  cmd=[FFMPEG,'-nostdin','-hide_banner','-loglevel','error','-y','-i',str(path)]
  if offset:cmd+=['-ss',str(offset)]
  if limit:cmd+=['-t',str(limit)]
  filters=[]
  if kind in ['music','ambience']:
   filters+=['loudnorm=I='+('-18' if kind=='music' else '-24')+':TP=-2:LRA=10','afade=t=in:d=0.06','areverse','afade=t=in:d=0.06','areverse']
   if source=='crowd':filters+=['lowpass=f=4200']
  else:filters+=['alimiter=limit=0.85']
  out=ROOT/'runtime'/(id+'.ogg')
  cmd+=['-vn','-af',','.join(filters),'-ar','44100','-ac','2' if kind=='music' else '1','-c:a','libvorbis','-q:a','3',str(out)]
  subprocess.run(cmd,check=True)
  r=subprocess.run([FFMPEG,'-hide_banner','-i',str(out)],capture_output=True,text=True)
  match=re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)',r.stderr)
  duration=sum(float(x)*v for x,v in zip(match.groups(),[3600,60,1]))
  return dict(id=id,kind=kind,source=source,archiveMember=member,file='runtime/'+out.name,duration=duration,bytes=out.stat().st_size,sha256=hashlib.sha256(out.read_bytes()).hexdigest(),changes=f'Transcoded to 44.1 kHz Ogg Vorbis; {"stereo" if kind=="music" else "mono"}; '+('loudness normalized, 60ms fade-in/out' if kind in ['music','ambience'] else 'peak limited')+(f'; excerpt from {offset}s for up to {limit}s' if limit else '')+('; low-pass at 4.2kHz' if source=='crowd' else ''))
with concurrent.futures.ThreadPoolExecutor(4) as pool:tracks=list(pool.map(convert,specs))
(ROOT/'tracks.json').write_text(json.dumps(tracks,ensure_ascii=False,indent=2))
print(json.dumps(dict(tracks=len(tracks),bytes=sum(t['bytes'] for t in tracks),durations={t['id']:t['duration'] for t in tracks}),ensure_ascii=False))
