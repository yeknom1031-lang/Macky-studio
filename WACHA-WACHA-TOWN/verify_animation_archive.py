"""Audit the 800 built-in generation receipts and their actual runtime adoption."""
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def audit(root):
    root = Path(root)
    prod = root / 'assets/production/animation-expansion'
    ids = {f'A{i:04}' for i in range(1, 801)}
    for folder, suffix in [('jobs', 'json'), ('attempts', 'json'), ('receipts', 'json'), ('source', 'png')]:
        actual = {p.stem for p in (prod / folder).glob('A*.' + suffix)}
        assert actual == ids, f'{folder}: missing={sorted(ids-actual)} extra={sorted(actual-ids)}'
    rows = []
    reviewed = {}
    requested = set()
    kinds = Counter()
    for jid in sorted(ids):
        job = json.loads((prod / 'jobs' / (jid + '.json')).read_text())
        receipt = json.loads((prod / 'receipts' / (jid + '.json')).read_text())
        attempt = json.loads((prod / 'attempts' / (jid + '.json')).read_text())
        assert job['id'] == receipt['id'] == attempt['id'] == jid
        assert receipt['tool'] == attempt['tool'] == 'built-in image_gen.imagegen', jid
        assert receipt.get('reviewStatus') in ('accepted', 'accepted-partial', 'rejected'), jid + ' needs review'
        assert receipt.get('reviewNotes') or receipt.get('notes') or job.get('reviewNotes'), jid + ' needs review notes'
        for field in ('prompt', 'reference', 'sha256', 'savedPath', 'savedFrom', 'finishedAt'):
            assert receipt.get(field) and receipt[field] == attempt.get(field), jid + ' receipt/attempt ' + field
        source = prod / 'source' / (jid + '.png')
        assert sha(source) == receipt['sha256'], jid + ' source changed'
        assert Path(receipt['savedPath']).resolve() == source.resolve(), jid + ' source path'
        assert Path(receipt['reference']).is_file(), jid + ' reference missing'
        kinds[job['kind']] += 1
        reviewed[jid] = (job, receipt)
        if job['kind'] in ('directional', 'interaction'):
            names = ['walkBack', 'stairUp', 'stairDown'] if job['kind'] == 'directional' else ['roleWork']
            requested.update((cid, name) for cid in job['characters'] for name in names)
        rows.append({'id': jid, 'kind': job['kind'], 'sha256': receipt['sha256'],
                     'jobSHA': sha(prod / 'jobs' / (jid + '.json')),
                     'attemptSHA': sha(prod / 'attempts' / (jid + '.json')),
                     'receiptSHA': sha(prod / 'receipts' / (jid + '.json')),
                     'reviewStatus': receipt['reviewStatus']})
    runtime = json.loads((root / 'expedition/data.js').read_text().split('=', 1)[1].rstrip(';\n'))
    assert runtime['releaseVersion'] == '2.2'
    # The original plan covered all 2,400 exclusive people, including slots
    # reassigned to repairs. Those omitted directional clips are also fallbacks.
    requested.update((c['id'], name) for c in runtime['characters']
                     if c.get('stage') in {f'S{i:02}' for i in range(1,25)}
                     for name in ('walkBack', 'stairUp', 'stairDown'))
    build = json.loads((prod / 'review/build.json').read_text())
    assert build['plannedCalls'] == build['attempted'] == build['generated'] == build['reviewed'] == 800
    assert not build['errors']
    used, adopted, by_clip = set(), set(), Counter()
    for character in runtime['characters']:
        for name, clip in character.get('clips', {}).items():
            jid = clip.get('sourceId')
            assert jid in reviewed, f'Unknown clip source {jid}'
            job, receipt = reviewed[jid]
            assert receipt['reviewStatus'] in ('accepted', 'accepted-partial'), jid
            row = job['characters'].index(character['id'])
            assert row in job.get('acceptedRows', range(job['rows'])), f'{jid} rejected row'
            assert name not in job.get('disabledClipsByRow', {}).get(str(row), []), f'{jid} disabled clip'
            assert (root / 'expedition/images' / (clip['image'] + '.js')).is_file()
            assert clip['frames'] and all(f['w'] > 0 and f['h'] > 0 for f in clip['frames'])
            used.add(jid); adopted.add((character['id'], name)); by_clip[name] += 1
    environments = 0
    for stage in runtime['stages']:
        assert len(stage['animatedScenery']) == 12, stage['key']
        for clip in stage['animatedScenery']:
            jid = clip['sourceId']; job, receipt = reviewed[jid]
            assert job['kind'] == 'environment' and job['stage'] == stage['key']
            assert receipt['reviewStatus'] in ('accepted', 'accepted-partial')
            assert len(clip['frames']) == 8 and clip['placements']
            assert (root / 'expedition/images' / (clip['image'] + '.js')).is_file()
            used.add(jid); environments += 1
    assert environments == 288
    base_repairs = []
    repair_path = root / 'assets/production/repairs.json'
    repair_plan = json.loads(repair_path.read_text()) if repair_path.exists() else {}
    overrides = repair_plan.get('frameOverrides', {})
    for jid, (job, receipt) in reviewed.items():
        if job['kind'] != 'baseRepair' or receipt['reviewStatus'] == 'rejected':
            continue
        matches = [(base, frame) for base, frames in overrides.items() for frame in frames if frame.get('source') == jid]
        assert matches, jid + ' base repair is not integrated'
        copied = root / 'assets/production/source' / (jid + '.png')
        assert copied.is_file() and sha(copied) == receipt['sha256'], jid + ' base repair copy differs'
        base_repairs.append({'id': jid, 'frameOverrides': len(matches), 'baseSheets': sorted({base for base, _ in matches})})
    ground_only = {c['id'] for c in runtime['characters'] if c.get('mobility') in ('wheelchair', 'ski', 'skate')}
    omitted_mobility = sorted((cid, clip) for cid, clip in requested - adopted if cid in ground_only and clip in ('stairUp', 'stairDown'))
    fallback = sorted((requested - adopted) - set(omitted_mobility))
    result = {'at': datetime.now(timezone.utc).isoformat(), 'passed': True, 'generationCalls': 800,
              'preservedOriginals': 800, 'kinds': dict(kinds), 'reviewStatuses': dict(Counter(r['reviewStatus'] for r in rows)),
              'runtimeClipSourceSheets': len(used), 'adoptedCharacterClips': len(adopted), 'clipsByName': dict(by_clip),
              'environmentObjects': environments, 'baseRepairs': base_repairs, 'requestedCharacterClips': len(requested),
              'unadoptedCharacterClips': len(requested - adopted),
              'omittedGroundOnlyStairClips': len(omitted_mobility),
              'originalMaterialFallbackClips': len(fallback), 'fallback': [{'character': cid, 'clip': name} for cid, name in fallback],
              'dataSHA': sha(root / 'expedition/data.js'), 'sources': rows,
              'note': '800 generation calls are preserved, including rejected rows and repair sheets. Missing optional generated clips use existing artwork; unused stairs for ground-only mobility are reported separately. Runtime clip source counts exclude base repairs recorded in the base artwork metadata.'}
    (prod / 'review/archive-audit.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    return result


if __name__ == '__main__':
    result = audit(Path(__file__).resolve().parent)
    print(json.dumps({k: v for k, v in result.items() if k not in ('sources', 'fallback')}, ensure_ascii=False, indent=2))
