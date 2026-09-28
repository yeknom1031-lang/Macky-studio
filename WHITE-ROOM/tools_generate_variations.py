"""Twenty original, quiet procedural environmental sound designs; no voices or jump scares."""
from pathlib import Path
import math, random, struct, wave
ROOT=Path(__file__).parent/'assets/audio/variations'
ROOT.mkdir(parents=True,exist_ok=True)
RATE=22050
TAU=math.tau
for kind in range(20):
    rng=random.Random(9300+kind)
    memory=0.0
    values=[]
    duration=1.0 if kind in [7,8,9] else 6.0
    for i in range(int(RATE*duration)):
        t=i/RATE
        white=rng.uniform(-1,1)
        memory+=(white-memory)*0.035
        sine=lambda f:math.sin(TAU*f*t)
        env=math.sin(math.pi*min(1,t/duration))**2
        pulse=lambda start,rate:math.exp(-max(0,t-start)*rate) if t>=start else 0
        if kind==0: v=(sine(293)+.5*sine(617)+.2*sine(1021))*.09*math.exp(-t*.7)
        elif kind==1: v=memory*.9*math.sin(math.pi*t/6)**2
        elif kind==2:
            phase=t%1.2
            v=math.sin(TAU*(950*phase-110*phase*phase))*.15*math.exp(-phase*19)
        elif kind==3: v=(sine(52)+.4*sine(79)+.22*sine(131))*.11
        elif kind==4: v=(sine(710)+sine(716))*.055*(.7+.3*sine(.4))
        elif kind==5: v=memory*(.45+.3*sine(1.3))+.03*sine(144)
        elif kind==6: v=(sine(183)*.2+white*.035)*(pulse(.6,15)+pulse(1.5,15))
        elif kind==7: v=(memory*.7+white*.04+sine(106)*.15)*math.exp(-t*9)
        elif kind==8: v=(memory*.3+sine(84)*.1)*math.exp(-t*22)
        elif kind==9: v=(sine(370)*.08+sine(113)*.16+white*.025)*math.exp(-t*10)
        elif kind==10: v=memory*(.5+.4*sine(.25))
        elif kind==11: v=(sine(64)*.08+memory*.35)*(.5+.5*sine(.5))
        elif kind==12: v=(sine(38)+.45*sine(57))*.14*(.75+.25*sine(.2))
        elif kind==13: v=math.sin(TAU*(180*t+12*t*t))*.09+memory*.3
        elif kind==14:
            phase=t%.73
            v=(sine(1410)*.08+white*.05)*math.exp(-phase*45)
        elif kind==15: v=memory*.5+math.sin(TAU*(100*t+35*math.sin(t)))*.055
        elif kind==16: v=(sine(192)*.1+sine(301)*.04)*(pulse(.7,4)+pulse(2.1,4)*.6+pulse(3.5,4)*.3)
        elif kind==17: v=memory*.5+sine(48)*.12
        elif kind==18: v=(sine(220)+sine(221.2)+.3*sine(440))*.055
        else: v=(memory*.6+sine(93)*.04)*(.5+.5*math.sin(TAU*(.8*t+.04*t*t)))
        fade=min(1,t/.06,(duration-t)/.25)
        values.append(max(-.65,min(.65,v*max(0,fade)*(1 if kind in [7,8,9] else env))))
    with wave.open(str(ROOT/('%02d.wav'%kind)),'wb') as out:
        out.setparams((1,2,RATE,0,'NONE','not compressed'))
        out.writeframes(b''.join(struct.pack('<h',int(v*32767)) for v in values))
print('20 environmental variations generated')
