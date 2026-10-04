#!/usr/bin/env python3
"""Summarize completed v2.1 checks and bind the result to the tested runtime."""
import hashlib
import json
import re
import statistics
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REVIEW = ROOT / 'assets/production/review'


def read(name):
    return json.loads((REVIEW / name).read_text())


def main():
    build = json.loads((ROOT / 'assets/production/build-report.json').read_text())
    assert not build['missing'] and not build['errors']
    assert len(build['playableStages']) == 24 and build['characters'] == 4396
    assert build['qualityGenerated'] == 76
    simulation = read('all-stages-simulation.json')
    browser = read('stages-browser-report.json')
    solo, duo, photo = [read(name) for name in ['browser-report.json', 'duo-browser-report.json', 'photo-browser-report.json']]
    ui = read('ui-final-report.json')
    performance = read('performance-isolated-report.json')
    living = read('living-town-qa.json')
    scenes = json.loads((ROOT / 'assets/production/quality/review/living-town-visual-coverage.json').read_text())
    render_cache = json.loads((ROOT / 'assets/production/quality/review/render-cache-qa.json').read_text())
    audio = read('audio-browser-report.json')
    units = read('input-audio-unit-report.json')
    core = (REVIEW / 'core-test-report.txt').read_text()
    core_integrity = read('core-test-integrity.json')
    core_pass = re.search(r'(?:#|ℹ) pass (\d+)', core)
    assert core_pass and re.search(r'(?:#|ℹ) fail 0\b', core)
    assert core_integrity['passed'] and core_integrity['unchanged'] and core_integrity['sourceRuntimeMatch']
    assert core_integrity['exitCode'] == 0 and core_integrity['fail'] == 0
    assert core_integrity['pass'] == int(core_pass[1]) == core_integrity['total']
    assert core_integrity['startSha'] == core_integrity['endSha']
    for name, digest in core_integrity['startSha'].items():
        assert hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == digest, name
    assert simulation['passed'] and not simulation.get('failures')
    assert simulation['durationPerStage'] == 180 and len(simulation['results']) == 24
    assert browser['passed'] and len(browser['results']) == 24 and not browser['errors']
    assert all(r['maxOverlap'] < 3 for r in browser['results'])
    assert len(solo['checks']) >= 9 and len(duo['checks']) >= 14 and len(photo['checks']) >= 4
    assert ui['passed'] and ui['totalBrowserChecks'] == len(solo['checks']) + len(duo['checks']) + len(photo['checks'])
    for name, digest in ui['sourceSha256'].items():
        if name.endswith('expedition-core.js'):
            continue  # The later crowd-only change has its own complete core test run.
        assert hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == digest, name
    assert all(not report['errors'] for report in [solo, duo, photo, performance, audio])
    assert living['passed'] and len(living['stages']) == 24 and all(s['passed'] for s in living['stages'])
    assert scenes['passed'] and len(scenes['stages']) == 24
    assert scenes['full24']['passed'] and scenes['updated3']['passed']
    assert render_cache['passed'] and len(render_cache['stages']) == 24 and not render_cache['errors']
    assert len(audio['results']) >= 18 and all(r['passed'] for r in audio['results'])
    assert len(audio['signals']) == 24 and all(r['signalPeak'] > 0 for r in audio['signals'])
    assert units['exitCode'] == 0 and units['failed'] == 0 and units['passed'] == 8
    for name, digest in units['sourceSha256'].items():
        assert hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == digest, name
    overlap = max(r['stats']['maxOverlap'] for r in simulation['results'])
    assert overlap < 3
    assert all(r.get('maxOffFloor') == 0 for r in simulation['results'])
    assert performance['passed'] and performance['scope'] == 'all' and performance['currentCase'] is None
    assert performance['results'] and all(r['medianMs'] < 34 for r in performance['results'])
    names = ['expedition-core.js', 'expedition-app.js', 'expedition-render.js', 'expedition-input.js', 'expedition-audio.js', 'data.js']
    hashes = {}
    for name in names:
        source = ROOT / ('expedition' if name == 'data.js' else 'src') / name
        assert source.read_bytes() == (ROOT / 'expedition' / name).read_bytes()
        hashes[name] = hashlib.sha256(source.read_bytes()).hexdigest()
    assert browser['codeHashes'] == hashes, 'Browser QA must match the shipped code and data.'
    assert performance['codeHashes'] == hashes and performance['unchanged'], 'Performance QA must match the shipped code and data.'
    assert simulation['sourceSHA'] == hashes['expedition-core.js']
    assert simulation['dataSHA'] == hashes['data.js']
    assert living['sourceSHA'] == hashes['expedition-core.js']
    assert living['dataSHA'] == hashes['data.js']
    assert scenes['dataSHA'] == hashes['data.js']
    assert render_cache['rendererSHA'] == hashes['expedition-render.js']
    assert render_cache['dataSHA'] == hashes['data.js']
    assert render_cache['coreSHA'] == hashes['expedition-core.js']
    if ui['sourceSha256']['src/expedition-core.js'] != hashes['expedition-core.js']:
        assert ui['incrementalValidation']['currentCoreSha256'] == hashes['expedition-core.js']
        assert ui['incrementalValidation']['currentDataSha256'] == hashes['data.js']
        assert ui['incrementalValidation']['coreTestsPassed'] == core_integrity['pass']
    result = {
        'passed': True, 'at': datetime.now(timezone.utc).isoformat(), 'version': '2.1',
        'build': {'stages': 24, 'originalDesigns': 4396, 'people': 4300, 'animals': 96,
                  'roles': 250, 'generatedSourceImages': build['totalGenerated'],
                  'preservedSourceImages': build['generated'], 'newQualityImages': 76,
                  'missing': [], 'errors': []},
        'checks': {'coreUnit': int(core_pass[1]), 'inputAndAudioUnit': 8,
                   'full180SecondSimulations': 24, 'fullStageBrowserChecks': 24,
                   'livingTownBrowserChecks': 24, 'livingTownNavigationChecks': 24,
                   'renderCacheStages': 24,
                   'solo': len(solo['checks']), 'duo': len(duo['checks']),
                   'revealingPhoto': len(photo['checks']), 'audio': len(audio['results']),
                   'isolatedPerformance': len(performance['results'])},
        'metrics': {'simulatedMinutes': 72, 'maxCharacterOverlapSeconds': overlap, 'maxOffFloorActors': 0,
                    'maxSwimmingRouteError': max(r['maxWaterError'] for r in simulation['results']),
                    'medianFrameMs': statistics.median(r['medianMs'] for r in performance['results']),
                    'isolatedWorstP95FrameMs': max(r['p95Ms'] for r in performance['results']),
                    'minimumRoomPopulationFraction': min(r['roomFraction'] for r in scenes['stages']),
                    'maximumPopulation': 2000, 'physicalControllerTested': False},
        'method': 'Chrome 1440 × 900. All 24 stages: 180-second simulation, actual artwork rendering, interior population and activity checks. Performance sampled without concurrent simulation workers. Gamepad inputs simulated; physical controller not verified.',
        'codeHashes': hashes,
        'reports': ['core-test-report.txt', 'core-test-integrity.json', 'input-audio-unit-report.json', 'all-stages-simulation.json',
                    'stages-browser-report.json', 'living-town-qa.json', 'browser-report.json',
                    'duo-browser-report.json', 'photo-browser-report.json', 'ui-final-report.json', 'audio-browser-report.json',
                    'performance-isolated-report.json', '../quality/review/living-town-visual-coverage.json',
                    '../quality/review/render-cache-qa.json', 'core-equivalence-report.json', 'core-performance-review.json',
                    '../quality/review/living-town-browser-report.json', '../quality/review/living-town-partial.json',
                    '../quality/review/living-focus-final.json',
                    '../quality/manifest.json']}
    (REVIEW / 'release-qa-summary.json').write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
