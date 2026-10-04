"""Original 144 BPM, C-major electro-funk score, rendered from editable note data.
No downloaded music or instrument samples. Also exports standard MIDI for DAWs.
The exact 160-beat WAV is the game's master clock; first question starts at beat 8.
"""
from pathlib import Path
import json, wave, struct
import numpy as np
from scipy.signal import butter, sosfilt

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/audio'
SR=44100; BPM=144; B=60/BPM; BEATS=160
N=round(BEATS*B*SR)
rng=np.random.default_rng(7349)
tracks={k:np.zeros((N,2),dtype=np.float32) for k in ['drums','bass','keys','brass','sparkle']}
notes=[]
drum_notes=[]

def env(t,d,a=.006,r=.045):
    return np.minimum(t/a,1)*np.minimum(np.maximum((d-t)/r,0),1)
def freq(n): return 440*2**((n-69)/12)
def filt(x,cut,kind='lowpass'):
    return sosfilt(butter(2,cut,kind,fs=SR,output='sos'),x)
def add(track,signal,beat,gain=1,pan=0):
    start=round(beat*B*SR)
    if start>=N:return
    count=min(len(signal),N-start)
    signal=signal[:count]*gain
    tracks[track][start:start+count,0]+=signal*np.sqrt((1-pan)/2)
    tracks[track][start:start+count,1]+=signal*np.sqrt((1+pan)/2)
def drum(sample,n,beat,gain=1,pan=0):
    drum_notes.append((n,beat,gain))
    add('drums',sample,beat,gain,pan)
def instrument(kind,n,d):
    t=np.arange(max(2,round(d*SR)))/SR; f=freq(n); p=2*np.pi*f*t
    if kind=='bass':
        x=np.sin(p)+.32*np.sin(2*p)*np.exp(-8*t)+.13*np.sin(3*p)*np.exp(-12*t)
        return np.tanh(x*1.3)*env(t,d,.004,.035)*np.exp(-1.9*t)
    if kind=='keys':
        # Warm tine piano; bell partial decays independently of body.
        x=np.sin(p+1.6*np.sin(2*p)*np.exp(-5*t))+.17*np.sin(p*7)*np.exp(-18*t)
        return x*np.exp(-4*t)*env(t,d,.002,.08)
    if kind=='brass':
        vibr=.007*np.sin(2*np.pi*5.1*t)*np.minimum(t*6,1)
        phase=p + vibr*np.sin(p*.001)
        x=sum(np.sin(phase*k+.02*k)/k * np.exp(-k/9) for k in range(1,15))
        x=filt(x,2500)*env(t,d,.018,.07)*(.75+.25*np.exp(-12*t))
        return x
    # Sparkling marimba-like FM tone.
    return np.sin(p+2.8*np.sin(p*3)*np.exp(-20*t))*np.exp(-7*t)*env(t,d,.001,.04)
def note(kind,n,beat,length,gain=.3,pan=0):
    notes.append((kind,n,beat,length,gain))
    add(kind,instrument(kind,n,length*B),beat,gain,pan)
def kick():
    t=np.arange(int(SR*.45))/SR
    ph=2*np.pi*(47*t+95*.025*(1-np.exp(-t/.025)))
    return .9*np.sin(ph)*np.exp(-t*11)+.18*filt(rng.normal(size=len(t)),6000)*np.exp(-t*160)
def snare():
    t=np.arange(int(SR*.27))/SR
    noise=filt(rng.normal(size=len(t)),1400,'highpass')
    return .34*noise*np.exp(-t*23)+.37*np.sin(2*np.pi*185*t)*np.exp(-t*35)
def hat(open=False):
    d=.26 if open else .08;t=np.arange(int(SR*d))/SR
    x=filt(rng.normal(size=len(t)),7500,'highpass')
    return x*np.exp(-t*(18 if open else 70))*.15*env(t,d,.001,.025)
def clap():
    t=np.arange(int(SR*.19))/SR;x=filt(rng.normal(size=len(t)),1100,'highpass')
    e=sum(np.exp(-np.maximum(t-o,0)*75)*(t>=o) for o in [0,.012,.025])
    return x*e*.12
K=kick(); S=snare(); C=clap(); HC=hat(); HO=hat(True)

# Intro and outro are two bars each; every question has a four-bar musical phrase.
roots=[36,33,38,31,36,33,38,31,36]
chords=[[60,64,67,71,74],[57,60,64,67,71],[62,65,69,72,76],[59,62,65,69,76]]
melody=[(0,76,.45),(.75,79,.22),(1,81,.45),(1.75,79,.2),(2.5,76,.4),(3.25,74,.3),(4,72,.75),(5,74,.4),(5.75,76,.22),(6,79,.4),(7,76,.6)]

for beat in range(BEATS):
    local=(beat-8)%16
    in_round=8<=beat<152
    # Leave an intentional pocket around the "STOP" accent.
    drum(K,36,beat,.8 if beat%2==0 else .58)
    if beat%4 in [1,3]:
        drum(S,38,beat,.73);drum(C,39,beat,.8, .12)
    for half in [0,.5]:
        drum(HO if half and beat%4==3 else HC,46 if half and beat%4==3 else 42,beat+half,.75 if half else .45,-.35 if half else .3)
    if beat%4==2:drum(K,36,beat+.75,.36)
    if in_round and local in [5,6,7]:
        t=np.arange(int(SR*.075))/SR
        add('sparkle',np.sin(2*np.pi*(1000+local*100)*t)*np.exp(-70*t),beat,.12)

for i in range(9):
    start=8+i*16; root=roots[i]; chord=chords[i%4]
    for bar in range(4):
        base=start+bar*4
        for off,interval,length,vel in [(0,0,.7,.52),(.75,12,.2,.34),(1.5,0,.4,.44),(2.5,7,.4,.42),(3,10,.2,.3),(3.5,12,.3,.42)]:
            note('bass',root+interval,base+off,length,vel)
        for off,length in [(.5,.8),(1.75,.5),(2.5,.9),(3.5,.4)]:
            for ni,n in enumerate(chord):note('keys',n,base+off,length,.085, -.5+ni*.23)
    # Catchy instrumental fill while choosing; spoken response gets a clear pocket.
    for off,n,length in melody[:6]:
        note('sparkle',n+(0 if i%2==0 else -3),start+4+off,length,.16, .3)
    for off in [8,8.75,9.5]:
        for ni,n in enumerate(chord[:4]): note('brass',n, start+off,.4,.11,-.3+ni*.2)
    if i in [2,5,8]:
        for off,n in [(14,72),(14.5,76),(15,79),(15.5,84)]: note('sparkle',n,start+off,.5,.13,-.2)
    # A short snare pickup into the next phrase.
    for off,v in [(15.25,.24),(15.5,.32),(15.75,.44)]: drum(S,38,start+off,v)

for base in [0,152]:
    for off,n,length in melody:
        note('brass',n,base+off,length,.20,-.1)
        note('sparkle',n+12,base+off,length,.10,.45)
    for b in range(8):
        note('bass',36+[0,0,7,12][b%4],base+b,.72,.46)
    for off in [0,1.5,3,4,5.5,7]:
        for ni,n in enumerate(chords[0]):note('keys',n,base+off,1,.09,-.5+ni*.25)

# Subtle stereo rooms and eighth-note delay, mixed as sends rather than washed out reverb.
for name in ['keys','brass','sparkle']:
    dry=tracks[name].copy()
    for seconds,gain in [(B*.75,.16),(B*1.5,.08),(.047,.06),(.083,.04)]:
        shift=round(seconds*SR)
        tracks[name][shift:]+=dry[:-shift,::-1]*gain

timeline=np.arange(N)/SR/B
duck=np.ones(N,dtype=np.float32)
for i in range(9):
    start=8+16*i
    for a,b in [(start,start+3.8),(start+10,start+15.7)]:
        mask=(timeline>=a)&(timeline<b)
        duck[mask]=.64
# Smooth 20ms automation transitions.
duck=np.convolve(np.pad(duck,(441,441),mode='edge'),np.ones(883)/883,'valid')[:N]
mix=sum(tracks.values())*duck[:,None]
mix=np.tanh(mix*.95)
mix*=.79/np.max(np.abs(mix))
mix[:500]*=np.linspace(0,1,500)[:,None]
mix[-int(SR*.9):]*=np.linspace(1,0,int(SR*.9))[:,None]
OUT.mkdir(parents=True,exist_ok=True)
with wave.open(str(OUT/'jackpot-funk.wav'),'wb') as f:
    f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes((mix*32767).astype('<i2').tobytes())

# Standard MIDI type 1, 480 ticks/quarter; exported score can be re-instrumented in a DAW.
def vlq(n):
    a=[n&127];n>>=7
    while n:a.insert(0,128|(n&127));n>>=7
    return bytes(a)
def chunk(events):
    last=0;data=b''
    for tick,event in sorted(events,key=lambda e:e[0]):
        data+=vlq(tick-last)+event;last=tick
    data+=b'\x00\xff\x2f\x00'
    return b'MTrk'+struct.pack('>I',len(data))+data
tempo=round(60e6/BPM)
mid=[chunk([(0,b'\xff\x51\x03'+tempo.to_bytes(3,'big')),(0,b'\xff\x58\x04\x04\x02\x18\x08')])]
for channel,(kind,program) in enumerate([('bass',33),('keys',4),('brass',61),('sparkle',12)]):
    events=[(0,bytes([0xc0+channel,program]))]
    for k,n,b,d,g in notes:
        if k==kind:
            events.extend([(round(b*480),bytes([0x90+channel,n,max(25,min(115,round(g*200)))])),(round((b+d)*480),bytes([0x80+channel,n,0]))])
    mid.append(chunk(events))
drum_events=[]
for n,b,g in drum_notes:
    drum_events.extend([(round(b*480),bytes([0x99,n,max(20,min(120,round(g*110)))])),(round((b+.12)*480),bytes([0x89,n,0]))])
mid.append(chunk(drum_events))
(OUT/'jackpot-funk.mid').write_bytes(b'MThd'+struct.pack('>IHHH',6,1,len(mid),480)+b''.join(mid))
(OUT/'score.json').write_text(json.dumps({'title':'Seven on the Floor','bpm':BPM,'beats':BEATS,'sampleRate':SR,'introBeats':8,'roundBeats':16,'targetBeat':8,'answerBeat':10,'notes':notes,'drums':drum_notes},indent=2))
print(json.dumps({'seconds':N/SR,'peak':float(np.max(np.abs(mix))),'rms':float(np.sqrt(np.mean(mix**2))),'notes':len(notes)},indent=2))
