"""Original, quiet environmental sounds. No external audio assets."""
from pathlib import Path
import math
import random
import struct
import wave

ROOT=Path(__file__).parent/'assets/audio'
ROOT.mkdir(parents=True,exist_ok=True)
RATE=22050
rng=random.Random(717)

def write(name,duration,fn):
    samples=[max(-.9,min(.9,fn(i/RATE,i))) for i in range(int(RATE*duration))]
    with wave.open(str(ROOT/(name+'.wav')),'wb') as output:
        output.setparams((1,2,RATE,0,'NONE','not compressed'))
        output.writeframes(b''.join(struct.pack('<h',int(v*32767)) for v in samples))

for number in range(1,4):
    n=number
    def foot(t,i):
        envelope=math.exp(-t*33)
        impact=(rng.uniform(-1,1)*.3+math.sin(2*math.pi*(105+n*11)*t)*.4)*envelope
        if t>.1: impact+=math.sin(2*math.pi*180*(t-.1))*.075*math.exp(-(t-.1)*22)
        if t>.22: impact+=rng.uniform(-1,1)*.035*math.exp(-(t-.22)*17)
        return impact
    write('step'+str(number),.7,foot)

write('handle',.33,lambda t,i:(math.sin(2*math.pi*1170*t)*.1+rng.uniform(-1,1)*.16)*math.exp(-t*30))
write('close',.65,lambda t,i:(math.sin(2*math.pi*84*t)*.45+rng.uniform(-1,1)*.09)*math.exp(-t*14))
write('key',.5,lambda t,i:(math.sin(2*math.pi*1800*t)*.14+math.sin(2*math.pi*2700*t)*.1)*math.exp(-t*17))
write('confirm',.7,lambda t,i:(math.sin(2*math.pi*440*t)+math.sin(2*math.pi*660*t))*.12*math.sin(math.pi*min(t/.7,1))**2*math.exp(-t*3))
# Frequencies complete whole cycles over 12 seconds for a seamless air-tone loop.
write('room',12,lambda t,i: .06*math.sin(2*math.pi*60*t)+.025*math.sin(2*math.pi*120*t)+.009*math.sin(2*math.pi*179.5*t))
print('Generated 8 original WAV files')
