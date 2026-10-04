"""Render deterministic, offline Japanese voice clips. VOICEVOX:ずんだもん.
Requires the official VOICEVOX Core 0.17.0 and 0.vvm in .tools/voicevox.
"""
from pathlib import Path
import io, json, wave
import numpy as np
from voicevox_core.blocking import Onnxruntime, OpenJtalk, Synthesizer, VoiceModelFile

ROOT = Path(__file__).resolve().parents[1]
ENGINE = ROOT / '.tools/voicevox'
OUT = ROOT / 'assets/audio/voice'
STYLE = 3
BEAT = 60 / 144

def main():
    synth = Synthesizer(Onnxruntime.load_once(filename=str(ENGINE / 'onnxruntime/lib' / Onnxruntime.LIB_RECOMMENDED_VERSIONED_FILENAME)), OpenJtalk(str(ENGINE / 'dict/open_jtalk_dic_utf_8-1.11')), cpu_num_threads=4)
    with VoiceModelFile.open(str(ENGINE / 'models/vvms/0.vvm')) as model:
        synth.load_voice_model(model)
    nums = ['いち','に','さん','よん','ご','ろく','なな','はち','きゅう']
    calls = ['シチイチガ、シチ！','シチニ、ジューシ！','シチサン、ニジューイチ！','シチシ、ニジューハチ！','シチゴ、サンジューゴ！','シチロク、シジューニ！','シチシチ、シジューク！','シチハ、ゴジューロク！','シチク、ロクジューサン！']
    clips = {f'q{n}': (f'ななかける、{nums[n-1]}は？', BEAT*3.7) for n in range(1,10)}
    clips.update({f'a{n}': (calls[n-1],BEAT*5.4) for n in range(1,10)})
    clips.update({'welcome':('リズムに乗って、ななのだん！', BEAT*6), 'finish':('やったね！さいごまで、大せいこう！', BEAT*6), 'three':('さん！',BEAT*.9), 'two':('に！',BEAT*.9), 'one':('いち！',BEAT*.9)})
    manifest = {'credit':'VOICEVOX:ずんだもん','core':'0.17.0','style':STYLE,'clips':{}}
    OUT.mkdir(parents=True,exist_ok=True)
    for key,(text,limit) in clips.items():
        query=synth.create_audio_query(text,STYLE)
        query.speed_scale=1.15
        query.pitch_scale=0.025
        query.intonation_scale=1.20
        query.pre_phoneme_length=0.025
        query.post_phoneme_length=0.045
        query.output_sampling_rate=24000
        data=synth.synthesis(query,STYLE)
        with wave.open(io.BytesIO(data),'rb') as f: duration=f.getnframes()/f.getframerate()
        if duration>limit:
            query.speed_scale*=duration/limit*1.02
            data=synth.synthesis(query,STYLE)
        with wave.open(io.BytesIO(data),'rb') as f:
            rate=f.getframerate(); samples=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').astype(float)
        # Trim only extra boundary silence and normalize clips consistently.
        active=np.where(np.abs(samples)>180)[0]
        if len(active): samples=samples[max(0,active[0]-240):min(len(samples),active[-1]+720)]
        samples*=0.86*32767/max(1,np.max(np.abs(samples)))
        fade=min(120,len(samples)//2)
        samples[:fade]*=np.linspace(0,1,fade); samples[-fade:]*=np.linspace(1,0,fade)
        with wave.open(str(OUT/f'{key}.wav'),'wb') as f:
            f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate);f.writeframes(samples.astype('<i2').tobytes())
        duration=len(samples)/rate
        assert duration<=limit+.05,(key,duration,limit)
        manifest['clips'][key]={'text':text,'seconds':round(duration,3),'slotSeconds':round(limit,3)}
        print(key,round(duration,3),text,flush=True)
    (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))

if __name__=='__main__': main()
