"""Build the festival's real, offline audio with the installed VOICEVOX Core.

Core spoken clips plus all bounded neighboring-fact false claims, and six
original arrangements. False claims are keyed by their actual spoken product.
Re-running reuses clips whose text/render settings still match the manifest.
"""
from pathlib import Path
import argparse
import hashlib
import io
import json
import math
import wave
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/audio/festival'
ENGINE = ROOT / '.tools/voicevox'
CHEERS = ROOT / 'designs/20-minigames/cheers-100.json'
BPM = 132
BEAT = 60 / BPM
VOICE_SR = 24000
MUSIC_SR = 44100
MUSIC_BEATS = 32
RENDER_VERSION = 1
ANSWER_RENDER_VERSION = 2
NUMBER_SPEECH_RENDER_VERSION = 2
KANA_API_SOURCE = 'https://github.com/VOICEVOX/voicevox/blob/main/src/openapi/apis/DefaultApi.ts'
READING_SOURCE = 'https://www.kochinet.ed.jp/motoyama-t/sansuuseat/kuku.pdf'
NUMS = ['','いち','に','さん','よん','ご','ろく','なな','はち','きゅう']

# Hand-authored traditional readings. Each row contains the call followed by
# the *correct* product reading, not a TTS interpretation of an Arabic formula.
CALLS = [
 ['いんいちが','いんにが','いんさんが','いんしが','いんごが','いんろくが','いんしちが','いんはちが','いんくが'],
 ['にいちが','ににんが','にさんが','にしが','にご','にろく','にしち','にはち','にく'],
 ['さんいちが','さんにが','さざんが','さんし','さんご','さぶろく','さんしち','さんぱ','さんく'],
 ['しいちが','しにが','しさん','しし','しご','しろく','ししち','しは','しく'],
 ['ごいちが','ごに','ごさん','ごし','ごご','ごろく','ごしち','ごは','ごっく'],
 ['ろくいちが','ろくに','ろくさん','ろくし','ろくご','ろくろく','ろくしち','ろくは','ろっく'],
 ['しちいちが','しちに','しちさん','しちし','しちご','しちろく','しちしち','しちは','しちく'],
 ['はちいちが','はちに','はちさん','はちし','はちご','はちろく','はちしち','はっぱ','はっく'],
 ['くいちが','くに','くさん','くし','くご','くろく','くしち','くは','くく'],
]

def number(n, traditional=False):
    units = ['', 'いち', 'に', 'さん', 'し' if traditional else 'よん', 'ご', 'ろく', 'しち' if traditional else 'なな', 'はち', 'く' if traditional else 'きゅう']
    if n < 10:
        return units[n]
    tens, ones = divmod(n, 10)
    # Traditional forty is しじゅう, while other tens use their common reading.
    head = '' if tens == 1 else (units[tens] if traditional else NUMS[tens])
    return head + 'じゅう' + units[ones]

# A syllable-level contract independent of VOICEVOX's Japanese text analyzer.
# AquesTalk kana is parsed directly; it cannot reinterpret ハ as the particle ワ.
MORA_PHONEMES = {
    'イ': (None,'i'), 'ウ': (None,'u'), 'ン': (None,'N'), 'ッ': (None,'cl'),
    'チ': ('ch','i'), 'ガ': ('g','a'), 'ニ': ('n','i'), 'サ': ('s','a'),
    'シ': ('sh','i'), 'ゴ': ('g','o'), 'ロ': ('r','o'), 'ク': ('k','u'),
    'ハ': ('h','a'), 'ジュ': ('j','u'), 'ザ': ('z','a'), 'ブ': ('b','u'),
    'パ': ('p','a'),
    'ナ': ('n','a'), 'キュ': ('ky','u'), 'ヨ': ('y','o'), 'ケ': ('k','e'),
    'ル': ('r','u'), 'ワ': ('w','a'), 'ツ': ('ts','u'), 'デ': ('d','e'), 'カ': ('k','a'),
}

def katakana(text):
    return ''.join(chr(ord(char)+0x60) if 'ぁ' <= char <= 'ゖ' else char for char in text)

def split_moras(kana):
    moras=[]
    for char in kana:
        if char in 'ァィゥェォャュョ':
            if not moras:raise ValueError(f'Kana starts with a small vowel: {kana}')
            moras[-1]+=char
        else:moras.append(char)
    if any(mora not in MORA_PHONEMES for mora in moras):
        raise ValueError(f'Unreviewed mora in multiplication reading: {kana}')
    return moras

def answer_pronunciation(a,b):
    call=katakana(CALLS[a-1][b-1]); result=katakana(number(a*b,True))
    call_moras=split_moras(call); result_moras=split_moras(result)
    # Give the two parts of the chant their own accent and a short clear pause.
    result_accent=result.index('ジュウ')+3 if 'ジュウ' in result else len(result_moras[0])
    explicit=f"{call}'、{result[:result_accent]}'{result[result_accent:]}"
    expected=[{'text':mora,'consonant':MORA_PHONEMES[mora][0],'vowel':MORA_PHONEMES[mora][1]} for mora in call_moras+result_moras]
    return {'method':'create_audio_query_from_kana','kana':explicit,'reading':call+result,'expectedMoras':expected,'readingSource':READING_SOURCE,'apiSource':KANA_API_SOURCE}

def number_question_pronunciation(kind,a,b,claim=None):
    left=katakana(NUMS[a]); right=katakana(NUMS[b])
    if kind=='question':
        parts=[left+'カケル',right+'ワ']; interrogative=True
    elif kind=='false_claim':
        parts=[left+'カケル'+right+'ワ',katakana(number(claim))]; interrogative=False
    elif kind=='reverse_question':
        parts=[left+'カケル','イクツデ',katakana(number(a*b))]; interrogative=True
    else:raise ValueError(kind)
    expected=[{'text':mora,'consonant':MORA_PHONEMES[mora][0],'vowel':MORA_PHONEMES[mora][1]} for part in parts for mora in split_moras(part)]
    explicit='、'.join(part+"'" for part in parts)+('？' if interrogative else '')
    return {'method':'create_audio_query_from_kana','kana':explicit,'reading':''.join(parts),'expectedMoras':expected,'grammaticalWaCount':int(kind in ['question','false_claim']),'apiSource':KANA_API_SOURCE}

def query_moras(query):
    return [{'text':mora.text,'consonant':mora.consonant,'vowel':mora.vowel} for phrase in query.accent_phrases for mora in phrase.moras]

def phonemes(moras):
    return [phoneme for mora in moras for phoneme in (mora['consonant'],mora['vowel']) if phoneme is not None]

def definitions():
    clips = {}
    for a in range(1, 10):
        for b in range(1, 10):
            product = a*b
            false = 80 if product == 81 else product+1
            common = {'a': a, 'b': b, 'answer': product}
            clips[f'q-{a}-{b}'] = {**common, 'text': f'{NUMS[a]}かける、{NUMS[b]}は？', 'kind': 'question', 'slotSeconds': 3.0, 'pronunciation':number_question_pronunciation('question',a,b)}
            clips[f'a-{a}-{b}'] = {**common, 'text': f'{CALLS[a-1][b-1]}、{number(product, True)}！', 'kind': 'answer', 'slotSeconds': 2.55, 'claim': product, 'pronunciation':answer_pronunciation(a,b)}
            clips[f'f-{a}-{b}'] = {**common, 'text': f'{NUMS[a]}かける{NUMS[b]}は、{number(false)}！', 'kind': 'false_claim', 'slotSeconds': 3.0, 'claim': false, 'pronunciation':number_question_pronunciation('false_claim',a,b,false)}
            clips[f'r-{a}-{b}'] = {**common, 'text': f'{NUMS[a]}かける、いくつで、{number(product)}？', 'kind': 'reverse_question', 'slotSeconds': 3.0, 'hiddenOperand': 'b', 'pronunciation':number_question_pronunciation('reverse_question',a,b)}
            # Keep this pool in sync with festival-core.falseClaims. A key includes
            # the claim so the spoken number can never diverge from the scroll.
            for claim in dict.fromkeys([product-a, product+a, product-1, product+1]):
                if claim < 1 or claim > 81 or claim == product:
                    continue
                clips[f'f-{a}-{b}-{claim}'] = {**common, 'text': f'{NUMS[a]}かける{NUMS[b]}は、{number(claim)}！', 'kind': 'false_claim', 'slotSeconds': 3.0, 'claim': claim, 'pronunciation':number_question_pronunciation('false_claim',a,b,claim)}
    catalog = json.loads(CHEERS.read_text())
    assert len(catalog['clips']) == 100
    assert len({clip['text'] for clip in catalog['clips']}) == 100
    for clip in catalog['clips']:
        clips[clip['id']] = {**clip, 'kind': 'cheer', 'slotSeconds': None}
    return clips, catalog

def read_wav(data):
    with wave.open(io.BytesIO(data), 'rb') as stream:
        rate = stream.getframerate()
        samples = np.frombuffer(stream.readframes(stream.getnframes()), dtype='<i2').astype(np.float64)
    active = np.where(np.abs(samples) > 130)[0]
    if len(active):
        samples = samples[max(0, active[0]-240):min(len(samples), active[-1]+720)]
    return samples, rate

def build_voice(manifest, force=False, answers_only=False):
    from voicevox_core.blocking import Onnxruntime, OpenJtalk, Synthesizer, VoiceModelFile
    synth = Synthesizer(Onnxruntime.load_once(filename=str(ENGINE/'onnxruntime/lib'/Onnxruntime.LIB_RECOMMENDED_VERSIONED_FILENAME)), OpenJtalk(str(ENGINE/'dict/open_jtalk_dic_utf_8-1.11')), cpu_num_threads=4)
    with VoiceModelFile.open(str(ENGINE/'models/vvms/0.vvm')) as model:
        synth.load_voice_model(model)
    definitions_by_key, catalog = definitions()
    manifest['cheers'] = catalog['clips']
    for index, (key, definition) in enumerate(definitions_by_key.items()):
        if answers_only and definition['kind']!='answer':continue
        path = OUT/'voice'/f'{key}.wav'
        prior = manifest['clips'].get(key, {})
        if not force and key.startswith('f-') and len(key.split('-')) == 4:
            legacy=manifest['clips'].get(f'f-{definition["a"]}-{definition["b"]}', {})
            if legacy.get('claim') == definition['claim'] and legacy.get('pronunciation',{}).get('verified') and (OUT/legacy.get('file','missing')).is_file():
                manifest['clips'][key]={**legacy, 'aliasOf':f'f-{definition["a"]}-{definition["b"]}'}
                continue
        render_version=ANSWER_RENDER_VERSION if definition['kind']=='answer' else NUMBER_SPEECH_RENDER_VERSION if 'pronunciation' in definition else RENDER_VERSION
        if not force and path.exists() and prior.get('text') == definition['text'] and prior.get('renderVersion') == render_version:
            continue
        if 'pronunciation' in definition:
            query=synth.create_audio_query_from_kana(definition['pronunciation']['kana'],3)
            actual=query_moras(query); expected=definition['pronunciation']['expectedMoras']
            if actual!=expected:raise ValueError(f'{key}: phoneme mismatch; refusing to synthesize incorrect learning audio: {actual} != {expected}')
            legacy=synth.create_audio_query(prior.get('text',definition['text']),3)
            legacy_moras=query_moras(legacy)
            definition['pronunciation'].update({'actualMoras':actual,'expectedPhonemes':phonemes(expected),'actualPhonemes':phonemes(actual),'verified':True,'previousTextAnalysis':{'text':prior.get('text',definition['text']),'kana':legacy.kana,'moras':legacy_moras,'phonemes':phonemes(legacy_moras)},'legacyHadWa':any(m['consonant']=='w' for m in legacy_moras),'legacyUnexpectedWaCount':max(0,sum(m['consonant']=='w' for m in legacy_moras)-definition['pronunciation'].get('grammaticalWaCount',0))})
        else:query = synth.create_audio_query(definition['text'], 3)
        query.speed_scale = 1.14 if definition['kind'] != 'cheer' else 1.09
        query.pitch_scale = {'wolf': -.045, 'rabbit': .045, 'bear': -.07, 'robot': -.015, 'fox': .02, 'frog': .055, 'gorilla': -.09, 'octopus': -.035}.get(definition.get('voice'), .018)
        query.intonation_scale = 1.22 if definition['kind'] == 'cheer' else 1.10
        query.pre_phoneme_length = .02
        query.post_phoneme_length = .04
        query.output_sampling_rate = VOICE_SR
        samples, rate = read_wav(synth.synthesis(query, 3))
        limit = definition['slotSeconds']
        if limit and len(samples)/rate > limit:
            query.speed_scale = min(1.48, query.speed_scale * len(samples)/rate/limit * 1.015)
            samples, rate = read_wav(synth.synthesis(query, 3))
        duration = len(samples)/rate
        if limit and duration > limit+.025:
            raise ValueError(f'Clip too long for spoken slot: {key} {duration:.3f}s, max {limit}s; do not truncate speech.')
        # Keep natural speech dynamics; normalize peaks with conservative headroom.
        samples *= .79*32767/max(1, np.max(np.abs(samples)))
        fade = min(120, len(samples)//2)
        samples[:fade] *= np.linspace(0, 1, fade)
        samples[-fade:] *= np.linspace(1, 0, fade)
        pcm = samples.astype('<i2')
        with wave.open(str(path), 'wb') as stream:
            stream.setnchannels(1)
            stream.setsampwidth(2)
            stream.setframerate(rate)
            stream.writeframes(pcm.tobytes())
        manifest['clips'][key] = {**definition, 'file': f'voice/{key}.wav', 'seconds': round(duration, 4), 'sampleRate': rate, 'frames': len(samples), 'speaker': 'VOICEVOX:ずんだもん', 'styleId': 3, 'renderVersion': render_version, 'speedScale': round(query.speed_scale, 4), 'roundEligible': duration+.1 <= 1.6 if definition['kind'] == 'cheer' else True, 'peak': round(float(np.max(np.abs(pcm)))/32768, 4), 'rms': round(float(np.sqrt(np.mean((pcm.astype(float)/32768)**2))), 4), 'status': 'generated', 'audioFile': f'voice/{key}.wav', 'actualDurationSeconds': round(duration, 4), 'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
        # Persist each clip so interruptions never lose provenance or require repeats.
        save_manifest(manifest)
        print(f'voice {index+1}/{len(definitions_by_key)} {key} {duration:.2f}s', flush=True)
    manifest['cheers'] = [{**clip, 'status': 'generated', 'audioFile': manifest['clips'][clip['id']]['file'], 'actualDurationSeconds': manifest['clips'][clip['id']]['seconds'], 'actualSpeaker': 'VOICEVOX:ずんだもん'} for clip in catalog['clips']]
    audited=[entry for entry in manifest['clips'].values() if entry['kind']=='answer' and entry.get('pronunciation',{}).get('verified')]
    manifest['pronunciationAudit']={'answerCount':len(audited),'method':'explicit AquesTalk kana; exact mora consonant/vowel verification before synthesis','noWaInAnswers':all('w' not in entry['pronunciation']['actualPhonemes'] for entry in audited),'readingSource':READING_SOURCE,'kanaApiSource':KANA_API_SOURCE,'variantPolicy':'Use this project’s established traditional reading consistently; regional variants also exist.'}
    manifest['pronunciationAudit']['numberSpeechCount']=sum(entry.get('pronunciation',{}).get('verified',False) for entry in manifest['clips'].values())
    save_manifest(manifest)

def build_music(manifest, force=False):
    sr = MUSIC_SR
    length = round(MUSIC_BEATS*BEAT*sr)
    settings = {
        'jackpot': {'title': 'ポップコーン・ジャックポット', 'root': 48, 'minor': False, 'lead': 'brass', 'groove': 'funk', 'seed': 471},
        'forest': {'title': '月あかりのウソホント', 'root': 50, 'minor': True, 'lead': 'marimba', 'groove': 'shuffle', 'seed': 527},
        'kitchen': {'title': 'まぜまぜスイートビート', 'root': 53, 'minor': False, 'lead': 'plucky', 'groove': 'bossa', 'seed': 684},
        'space': {'title': 'かけざん銀河エクスプレス', 'root': 45, 'minor': True, 'lead': 'fm', 'groove': 'electro', 'seed': 836},
        'sports': {'title': 'せーのでスーパーショット', 'root': 55, 'minor': False, 'lead': 'brass', 'groove': 'break', 'seed': 914},
        'finale': {'title': 'みんなの九九パレード', 'root': 48, 'minor': False, 'lead': 'chime', 'groove': 'disco', 'seed': 1051},
    }
    def hz(note): return 440*2**((note-69)/12)
    def envelope(t, duration, attack=.006, release=.055):
        return np.minimum(t/attack, 1)*np.minimum(np.maximum((duration-t)/release, 0), 1)
    def filter_(samples, cut, kind='lowpass'):
        return sosfilt(butter(2, cut, kind, fs=sr, output='sos'), samples)
    for name, spec in settings.items():
        path = OUT/'music'/f'{name}.wav'
        stems_ready=name!='finale' or len(manifest.get('orchestra',{}).get('stems',{}))==6
        if not force and stems_ready and path.exists() and manifest['music'].get(name, {}).get('renderVersion') == RENDER_VERSION:
            continue
        rng = np.random.default_rng(spec['seed'])
        tracks = {key: np.zeros((length,2), dtype=np.float32) for key in ['drums','bass','keys','lead']}
        if name=='finale':
            tracks.update({key:np.zeros((length,2),dtype=np.float32) for key in ['brass','bells']})
        events = []
        def add(track, signal, beat, gain=1, pan=0):
            start = round(beat*BEAT*sr) % length
            stereo = signal[:,None]*np.array([math.sqrt((1-pan)/2), math.sqrt((1+pan)/2)])[None,:]*gain
            # Wrap tails into the beginning: loop has an actual periodic sound field.
            for offset in range(0, len(stereo), length):
                portion = stereo[offset:offset+length]
                amount = min(len(portion), length-start)
                tracks[track][start:start+amount] += portion[:amount]
                if amount < len(portion): tracks[track][:len(portion)-amount] += portion[amount:]
        def instrument(kind, pitch, beats):
            duration = beats*BEAT
            t = np.arange(max(2, round(duration*sr)))/sr
            p = 2*np.pi*hz(pitch)*t
            if kind == 'bass':
                raw = np.sin(p)+.28*np.sin(2*p)*np.exp(-6*t)+.13*np.sin(3*p)*np.exp(-10*t)
                return np.tanh(raw*1.3)*envelope(t,duration,.004,.035)*np.exp(-1.4*t)
            if kind == 'keys':
                return (np.sin(p+1.3*np.sin(2*p)*np.exp(-5*t))+.13*np.sin(p*7)*np.exp(-18*t))*np.exp(-3.2*t)*envelope(t,duration,.004,.09)
            if kind == 'brass':
                raw = sum(np.sin(p*k)/k*np.exp(-k/6) for k in range(1,12))
                return filter_(raw, 2300)*envelope(t,duration,.017,.07)*(.7+.3*np.exp(-15*t))
            if kind == 'marimba':
                return (np.sin(p)+.22*np.sin(4*p)*np.exp(-22*t))*np.exp(-7*t)*envelope(t,duration,.002,.04)
            if kind == 'plucky':
                return (np.sin(p)+.35*np.sin(2*p)*np.exp(-8*t)+.13*np.sin(3*p)*np.exp(-12*t))*np.exp(-6*t)*envelope(t,duration,.002,.035)
            if kind == 'fm':
                return np.sin(p+1.7*np.sin(2*p)*np.exp(-6*t))*np.exp(-3*t)*envelope(t,duration,.008,.07)
            return (np.sin(p)+.23*np.sin(p*2.76)*np.exp(-6*t)+.16*np.sin(p*5.4)*np.exp(-15*t))*np.exp(-4*t)*envelope(t,duration,.002,.08)
        def note(track, pitch, beat, beats, gain=.25, pan=0, kind=None):
            events.append({'track':track,'note':pitch,'beat':beat,'length':beats,'gain':gain})
            add(track, instrument(kind or track,pitch,beats),beat,gain,pan)
        def kick():
            t=np.arange(round(sr*.42))/sr
            return .84*np.sin(2*np.pi*(48*t+90*.023*(1-np.exp(-t/.023))))*np.exp(-12*t)+.12*filter_(rng.normal(size=len(t)),5000)*np.exp(-160*t)
        def snare():
            t=np.arange(round(sr*.23))/sr
            return .23*filter_(rng.normal(size=len(t)),1300,'highpass')*np.exp(-23*t)+.24*np.sin(2*np.pi*180*t)*np.exp(-35*t)
        def hat(open_=False):
            d=.19 if open_ else .075
            t=np.arange(round(sr*d))/sr
            return filter_(rng.normal(size=len(t)),7200,'highpass')*.11*np.exp(-t*(20 if open_ else 65))*envelope(t,d,.001,.02)
        def wood():
            t=np.arange(round(sr*.12))/sr
            return (np.sin(2*np.pi*830*t)+.48*np.sin(2*np.pi*1270*t))*np.exp(-45*t)*.26
        k,s,h,ho,w=kick(),snare(),hat(),hat(True),wood()
        groove=spec['groove']
        for beat in range(MUSIC_BEATS):
            local=beat%4
            if groove=='bossa':
                if local in [0,2]: add('drums',k,beat,.61)
                if local in [1,3]: add('drums',w,beat,.58,.15)
            elif groove=='break':
                if local in [0,2]: add('drums',k,beat,.85)
                if local==2:add('drums',k,beat+.75,.6)
                if local in [1,3]:add('drums',s,beat,.84)
            else:
                add('drums',k,beat,.72 if local%2==0 else .56)
                if local in [1,3]:add('drums',s,beat,.72)
            off=.66 if groove=='shuffle' else .5
            add('drums',h,beat,.53,-.25)
            add('drums',ho if local==3 else h,beat+off,.64,.30)
            if groove in ['bossa','shuffle']:add('drums',w,beat+off,.35,.4)
            if beat in [15,31]:
                for offset,level in [(.25,.18),(.5,.25),(.75,.34)]:add('drums',s,beat+offset,level)
        roots = [0,5,3,7] if spec['minor'] else [0,-3,5,7]
        major_scale = [0,2,4,7,9,12,14,16]
        minor_scale = [0,2,3,7,10,12,14,15]
        scale=minor_scale if spec['minor'] else major_scale
        motifs = {
            'jackpot': [(0,2,.45),(.75,3,.23),(1.5,4,.4),(2.5,3,.28),(3.25,1,.45)],
            'forest': [(0,0,.55),(.66,2,.27),(1.66,3,.4),(2.66,2,.3),(3.5,1,.4)],
            'kitchen': [(.5,2,.4),(1.25,4,.28),(2,3,.5),(3,1,.4),(3.5,2,.38)],
            'space': [(0,0,.32),(.5,2,.32),(1,3,.32),(1.5,5,.32),(2.5,4,.4),(3.5,2,.34)],
            'sports': [(0,3,.6),(1,3,.28),(1.75,4,.23),(2.5,2,.6),(3.5,0,.28)],
            'finale': [(0,2,.4),(.5,3,.4),(1.5,4,.4),(2.5,5,.4),(3,4,.35),(3.5,3,.35)],
        }
        for bar in range(8):
            root=spec['root']+roots[(bar//2)%4]
            chord=[root+12,root+(15 if spec['minor'] else 16),root+19,root+22]
            for off,interval,dur,gain in [(0,0,.68,.39),(1.5,0,.4,.29),(2,7,.55,.32),(3,12,.25,.24),(3.5,7,.3,.25)]:
                note('bass',root-12+interval,bar*4+off,dur,gain)
            for off in ([.5,1.75,3] if groove!='bossa' else [0,1.5,2.5]):
                for index,pitch in enumerate(chord):note('keys',pitch,bar*4+off,.9,.072,-.45+index*.3)
            # Alternating call/response motif with a contrasting turnaround.
            for off,index,dur in motifs[name]:
                pitch=spec['root']+24+scale[(index+(1 if bar in [3,7] else 0))%len(scale)]
                note('lead',pitch,bar*4+off,dur,.17 if bar%2==0 else .125,.18 if bar%2==0 else -.2,spec['lead'])
        for track in ['keys','lead']:
            dry=tracks[track].copy()
            for delay,gain in [(BEAT*.75,.13),(BEAT*1.5,.065),(.037,.035),(.071,.026)]:
                tracks[track] += np.roll(dry,round(delay*sr),axis=0)[:,::-1]*gain
        if name=='finale':
            for bar in range(8):
                root=spec['root']+roots[(bar//2)%4]
                for pitch in [root+12,root+16,root+19]:
                    note('brass',pitch,bar*4+2,.7,.035,-.25,'brass')
                for off,interval in [(1,24),(2.5,31),(3.5,28)]:
                    note('bells',root+interval,bar*4+off,.4,.072,.35,'chime')
            # All six stems have the same origin, period and global gain. The game
            # unmutes them on beat boundaries; it never restarts a newly added part.
            absolute_sum=sum(np.abs(track) for track in tracks.values())
            stem_scale=.76/max(.01,float(np.max(absolute_sum)))
            stems={}
            labels={'drums':'ドラム','bass':'ベース','keys':'ピアノ','lead':'メロディ','brass':'ブラス','bells':'ベル'}
            for level,(track,signal) in enumerate(tracks.items()):
                signal=signal*stem_scale
                join=(signal[0]+signal[-1])*.5
                for i in range(24):
                    weight=(1-i/24)**2
                    signal[i]=signal[i]*(1-weight)+join*weight
                    signal[-1-i]=signal[-1-i]*(1-weight)+join*weight
                pcm_stem=(signal*32767).astype('<i2')
                stem_path=OUT/'music'/f'finale-stem-{track}.wav'
                with wave.open(str(stem_path),'wb') as stream:
                    stream.setnchannels(2);stream.setsampwidth(2);stream.setframerate(sr);stream.writeframes(pcm_stem.tobytes())
                stems[track]={'file':f'music/{stem_path.name}','instrument':labels[track],'unlockAfter':level,'bpm':BPM,'beats':MUSIC_BEATS,'frames':length,'seconds':length/sr,'sampleRate':sr,'peak':float(np.max(np.abs(signal))),'rms':float(np.sqrt(np.mean(signal**2))),'sha256':hashlib.sha256(stem_path.read_bytes()).hexdigest()}
            manifest['orchestra']={'origin':'same as finale downbeat','stems':stems,'rule':'drums first; add bass, keys, melody, brass and bells after each correct answer'}
        mix=np.tanh(sum(tracks.values())*.94)
        mix *= .73/max(.01,float(np.max(np.abs(mix))))
        # Endpoint repair over 0.5 ms removes quantization jumps without a gap.
        join=(mix[0]+mix[-1])*.5
        for i in range(24):
            weight=(1-i/24)**2
            mix[i]=mix[i]*(1-weight)+join*weight
            mix[-1-i]=mix[-1-i]*(1-weight)+join*weight
        pcm=(mix*32767).astype('<i2')
        with wave.open(str(path),'wb') as stream:
            stream.setnchannels(2);stream.setsampwidth(2);stream.setframerate(sr);stream.writeframes(pcm.tobytes())
        manifest['music'][name]={'file':f'music/{name}.wav','title':spec['title'],'bpm':BPM,'beats':MUSIC_BEATS,'seconds':round(length/sr,6),'sampleRate':sr,'frames':length,'peak':round(float(np.max(np.abs(mix))),4),'rms':round(float(np.sqrt(np.mean(mix**2))),4),'loopBoundaryDelta':round(float(np.max(np.abs(pcm[0].astype(float)-pcm[-1].astype(float)))/32768),7),'renderVersion':RENDER_VERSION,'original':True,'externalSamples':False}
        (OUT/'music'/f'{name}-score.json').write_text(json.dumps({'title':spec['title'],'bpm':BPM,'beats':MUSIC_BEATS,'settings':spec,'notes':events},ensure_ascii=False,indent=2))
        save_manifest(manifest)
        print(f'music {name} {length/sr:.4f}s loop delta={manifest["music"][name]["loopBoundaryDelta"]}',flush=True)

def save_manifest(manifest):
    (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--voice-only', action='store_true')
    parser.add_argument('--answers-only', action='store_true', help='Rebuild only the 81 pronunciation-audited answer WAVs; other audio is untouched.')
    parser.add_argument('--music-only', action='store_true')
    parser.add_argument('--force', action='store_true')
    args=parser.parse_args()
    (OUT/'voice').mkdir(parents=True,exist_ok=True)
    (OUT/'music').mkdir(parents=True,exist_ok=True)
    manifest_path=OUT/'manifest.json'
    manifest=json.loads(manifest_path.read_text()) if manifest_path.exists() else {'version':1,'credit':'VOICEVOX:ずんだもん','voicevoxCore':'0.17.0','musicCredit':'Original procedural compositions for 九九ビート大放送','bpm':BPM,'clips':{},'music':{}}
    if not args.music_only:build_voice(manifest,args.force,args.answers_only)
    if not args.voice_only and not args.answers_only:build_music(manifest,args.force)
    print(json.dumps({'spokenClips':len(manifest['clips']),'musicLoops':len(manifest['music']),'output':str(OUT)},ensure_ascii=False),flush=True)

if __name__=='__main__':main()
