"""Fingerprints for the encoded artwork actually shipped in the game."""
import hashlib
import json
from pathlib import Path


def fingerprint(files):
    manifest = ''.join(f'{name} {files[name]}\n' for name in sorted(files))
    return hashlib.sha256(manifest.encode()).hexdigest()


def artwork_fingerprints(runtime):
    runtime = Path(runtime)
    files = {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
             for p in sorted((runtime / 'images').glob('*.js'))}
    text = (runtime / 'data.js').read_text()
    data = json.loads(text.split('=', 1)[1].strip().removesuffix(';'))
    stages = {}
    for stage in data['stages']:
        keys = {stage['background'], stage['setImage']}
        keys.update(t['image'] for t in stage.get('backgroundTiles', []))
        keys.update(c['image'] for c in stage.get('animatedScenery', []))
        for character in data['characters']:
            if character['stage'] in (stage['key'], 'G', 'A'):
                keys.add(character['image'])
                keys.update(c['image'] for c in character.get('clips', {}).values())
        images = {key + '.js': files[key + '.js'] for key in sorted(keys) if key}
        stages[stage['key']] = dict(imageHashes=images, imageFingerprint=fingerprint(images))
    return dict(schemaVersion=1, files=files, fileCount=len(files),
                fingerprint=fingerprint(files), stages=stages)
