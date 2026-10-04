"""Release audit must reject corrupt/unreviewed sources and rejected runtime rows."""
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from verify_animation_archive import audit


class ArchiveTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.prod = self.root / 'assets/production/animation-expansion'
        for folder in ['jobs', 'attempts', 'receipts', 'source', 'review']:
            (self.prod / folder).mkdir(parents=True)
        (self.root / 'expedition/images').mkdir(parents=True)
        reference = self.root / 'reference.png'; reference.write_bytes(b'reference')
        self.digest = hashlib.sha256(b'original').hexdigest()
        for i in range(1, 801):
            jid = f'A{i:04}'
            stage = f'S{(i-1)//3+1:02}' if i <= 72 else 'S01'
            job = {'id': jid, 'kind': 'environment' if i <= 72 else 'directional',
                   'stage': stage, 'rows': 4 if i <= 72 else 1, 'characters': [f'C{i}']}
            source = self.prod / 'source' / (jid + '.png'); source.write_bytes(b'original')
            receipt = {'id': jid, 'tool': 'built-in image_gen.imagegen', 'prompt': 'actual prompt',
                       'reference': str(reference), 'sha256': self.digest, 'savedPath': str(source),
                       'savedFrom': '/retained-original.png', 'finishedAt': '2026-10-05',
                       'reviewStatus': 'accepted', 'reviewNotes': 'reviewed all cells'}
            self.write('jobs/' + jid + '.json', job)
            self.write('receipts/' + jid + '.json', receipt)
            self.write('attempts/' + jid + '.json', receipt)
        self.write('review/build.json', {'plannedCalls': 800, 'attempted': 800, 'generated': 800, 'reviewed': 800, 'errors': []})
        (self.root / 'expedition/images/atlas.js').write_text('image')
        frame = {'x': 0, 'y': 0, 'w': 96, 'h': 96}
        self.data = {'releaseVersion': '2.2', 'characters': [{'id': 'C73', 'clips': {'walkBack': {'sourceId': 'A0073', 'image': 'atlas', 'frames': [frame] * 4}}}], 'stages': []}
        for stage in range(24):
            self.data['stages'].append({'key': f'S{stage+1:02}', 'animatedScenery': [
                {'sourceId': f'A{stage*3+n//4+1:04}', 'image': 'atlas', 'frames': [frame]*8, 'placements': [{'x': 1, 'y': 1}]}
                for n in range(12)]})
        self.save_data()

    def write(self, path, value):
        (self.prod / path).write_text(json.dumps(value))

    def save_data(self):
        (self.root / 'expedition/data.js').write_text('window.WACHA24_DATA=' + json.dumps(self.data) + ';\n')

    def test_preserved_generation_and_fallback_counts_are_distinct(self):
        result = audit(self.root)
        self.assertEqual(result['generationCalls'], 800)
        self.assertEqual(result['adoptedCharacterClips'], 1)
        self.assertEqual(result['originalMaterialFallbackClips'], 728*3-1)
        self.assertEqual(result['environmentObjects'], 288)

    def test_ground_only_stairs_are_not_claimed_as_fallback_animation(self):
        self.data['characters'][0]['mobility'] = 'wheelchair'
        self.save_data()
        result = audit(self.root)
        self.assertEqual(result['omittedGroundOnlyStairClips'], 2)
        self.assertEqual(result['originalMaterialFallbackClips'], 728*3-3)

    def test_missing_attempt_blocks_release(self):
        (self.prod / 'attempts/A0800.json').unlink()
        with self.assertRaisesRegex(AssertionError, 'attempts'):
            audit(self.root)

    def test_source_mutation_blocks_release(self):
        (self.prod / 'source/A0073.png').write_bytes(b'changed')
        with self.assertRaisesRegex(AssertionError, 'source changed'):
            audit(self.root)

    def test_unreviewed_source_blocks_release(self):
        path = self.prod / 'receipts/A0080.json'
        receipt = json.loads(path.read_text()); receipt['reviewStatus'] = 'pending'; path.write_text(json.dumps(receipt))
        with self.assertRaisesRegex(AssertionError, 'needs review'):
            audit(self.root)

    def test_runtime_rejected_row_blocks_release(self):
        path = self.prod / 'jobs/A0073.json'
        job = json.loads(path.read_text()); job['acceptedRows'] = []; path.write_text(json.dumps(job))
        with self.assertRaisesRegex(AssertionError, 'rejected row'):
            audit(self.root)


if __name__ == '__main__':
    unittest.main()
