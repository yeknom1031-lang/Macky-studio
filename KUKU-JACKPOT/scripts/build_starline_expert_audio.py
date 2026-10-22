"""Render the existing score at each expert tempo, preserving all note pitches."""
from pathlib import Path
import hashlib
import json
import shutil
import tempfile
import build_festival_audio as music

DEST = music.ROOT / 'assets/audio/festival/starline'
TEMPOS = [132, 154, 176, 198, 220, 242, 264, 286, 308, 330]

def main():
    DEST.mkdir(parents=True, exist_ok=True)
    tracks = {'132': {'file': '../music/space.wav', 'bpm': 132, 'beats': 32}}
    old = music.OUT, music.BPM, music.BEAT
    try:
        with tempfile.TemporaryDirectory(prefix='kuku-starline-') as folder:
            music.OUT = Path(folder)
            (music.OUT / 'music').mkdir()
            for bpm in TEMPOS[1:]:
                music.BPM, music.BEAT = bpm, 60 / bpm
                manifest = {'music': {}}
                music.build_music(manifest, force=True, only={'space'})
                filename = f'space-{bpm}.wav'
                shutil.copyfile(music.OUT / 'music/space.wav', DEST / filename)
                shutil.copyfile(music.OUT / 'music/space-score.json', DEST / f'score-{bpm}.json')
                tracks[str(bpm)] = {**manifest['music']['space'], 'file': filename,
                    'sha256': hashlib.sha256((DEST / filename).read_bytes()).hexdigest()}
    finally:
        music.OUT, music.BPM, music.BEAT = old
    (DEST / 'manifest.json').write_text(json.dumps({
        'title': 'スターライン・加速ライブ',
        'method': 'The original space score is synthesized at each BPM; no playback-rate or pitch shift.',
        'tracks': tracks,
    }, ensure_ascii=False, indent=2) + '\n')

if __name__ == '__main__':
    main()
