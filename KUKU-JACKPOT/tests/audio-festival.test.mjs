import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { chooseCheer, eligibleCheer, FestivalAudio, MUSIC_NAMES } from '../src/festival-audio.js';

const base = new URL('../assets/audio/festival/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', base), 'utf8'));
const catalog = manifest.cheers;
const clip = id => catalog.find(item => item.id === id);

function wavInfo(path) {
  const bytes = readFileSync(path);
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WAVE');
  let cursor = 12;
  let format;
  let data;
  while (cursor + 8 <= bytes.length) {
    const kind = bytes.toString('ascii', cursor, cursor + 4);
    const size = bytes.readUInt32LE(cursor + 4);
    const body = cursor + 8;
    if (kind === 'fmt ') format = { codec: bytes.readUInt16LE(body), channels: bytes.readUInt16LE(body + 2), rate: bytes.readUInt32LE(body + 4), bits: bytes.readUInt16LE(body + 14) };
    if (kind === 'data') data = bytes.subarray(body, body + size);
    cursor = body + size + (size % 2);
  }
  assert.ok(format && data);
  return { ...format, data, seconds: data.length / (format.rate * format.channels * format.bits / 8) };
}

test('all 81 equations have actual question, correct answer, and consistent false-claim recordings', () => {
  assert.equal(Object.keys(manifest.clips).length, 424);
  for (let a = 1; a <= 9; a++) {
    for (let b = 1; b <= 9; b++) {
      for (const kind of ['q', 'a', 'f']) {
        const entry = manifest.clips[`${kind}-${a}-${b}`];
        assert.ok(entry, `${kind}-${a}-${b}`);
        assert.equal(entry.answer, a * b);
        assert.equal(entry.a, a);
        assert.equal(entry.b, b);
        assert.ok(entry.seconds <= (kind === 'a' ? 2.55 : 3), `${kind}-${a}-${b} fits its spoken window`);
        if (kind === 'a') assert.equal(entry.claim, a * b);
        if (kind === 'f') {
          assert.equal(entry.claim, a * b === 81 ? 80 : a * b + 1);
          assert.notEqual(entry.claim, entry.answer);
        }
      }
    }
  }
});

test('all 81 missing-factor questions speak the given factor and product without revealing b', () => {
  const units = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];
  const reading = value => value < 10 ? units[value] : `${value < 20 ? '' : units[Math.floor(value / 10)]}じゅう${units[value % 10]}`;
  for (let a = 1; a <= 9; a++) {
    for (let b = 1; b <= 9; b++) {
      const entry = manifest.clips[`r-${a}-${b}`];
      assert.equal(entry.kind, 'reverse_question');
      assert.equal(entry.hiddenOperand, 'b');
      assert.equal(entry.answer, a * b);
      assert.equal(entry.text, `${units[a]}かける、いくつで、${reading(a * b)}？`);
      assert.ok(entry.seconds <= 3);
    }
  }
});

test('game 15 loads reverse questions instead of revealing the missing factor in q or f', async () => {
  const audio = new FestivalAudio();
  audio.ctx = {};
  audio.manifest = manifest;
  const requests = [];
  audio.loadClip = async key => { requests.push(key); };
  await audio.load([{ gameId: 15, a: 7, b: 8 }, { gameId: 1, a: 3, b: 4 }]);
  assert.ok(requests.includes('r-7-8'));
  assert.ok(requests.includes('a-7-8'));
  assert.ok(!requests.includes('q-7-8'));
  assert.ok(!requests.includes('f-7-8'));
  assert.ok(requests.includes('q-3-4'));
  assert.ok(!requests.includes('r-3-4'));
});

test('100 distinct cheer scripts have 100 real non-silent WAVs with measured durations', () => {
  assert.equal(catalog.length, 100);
  assert.equal(new Set(catalog.map(item => item.text)).size, 100);
  assert.equal(new Set(catalog.map(item => item.id)).size, 100);
  for (let n = 1; n <= 100; n++) {
    const id = `C${String(n).padStart(3, '0')}`;
    assert.equal(clip(id).status, 'generated');
    assert.ok(manifest.clips[id].text.length > 0);
    assert.ok(manifest.clips[id].seconds > .3);
  }
});

test('every spoken file is decodable PCM, matches metadata and has no clipping or silence', () => {
  for (const [key, entry] of Object.entries(manifest.clips)) {
    const wav = wavInfo(new URL(entry.file, base));
    assert.equal(wav.codec, 1, key);
    assert.equal(wav.bits, 16, key);
    assert.equal(wav.channels, 1, key);
    assert.equal(wav.rate, 24000, key);
    assert.ok(Math.abs(wav.seconds - entry.seconds) < .00011, key);
    assert.ok(entry.peak > .1 && entry.peak < .9, key);
    assert.ok(entry.rms > .005, key);
    assert.ok(statSync(new URL(entry.file, base)).size < 25 * 1024 * 1024, key);
  }
});

test('six distinct original music loops are exactly 32 beats with a continuous boundary', () => {
  assert.deepEqual(Object.keys(manifest.music), MUSIC_NAMES);
  const signatures = new Set();
  for (const [key, entry] of Object.entries(manifest.music)) {
    const wav = wavInfo(new URL(entry.file, base));
    assert.equal(wav.channels, 2);
    assert.equal(wav.rate, 44100);
    assert.equal(entry.bpm, 132);
    assert.equal(entry.beats, 32);
    assert.ok(Math.abs(wav.seconds - 32 * 60 / 132) <= 1 / 44100);
    assert.ok(entry.loopBoundaryDelta < .001, key);
    assert.ok(entry.rms > .05 && entry.peak < .8, key);
    assert.equal(wav.data.readInt16LE(0), wav.data.readInt16LE(wav.data.length - 4));
    assert.equal(wav.data.readInt16LE(2), wav.data.readInt16LE(wav.data.length - 2));
    assert.ok(statSync(new URL(entry.file, base)).size < 25 * 1024 * 1024);
    signatures.add(wav.data.subarray(0, 4096).toString('hex'));
  }
  assert.equal(signatures.size, 6);
});

test('wrong/timeout answers are never described as correct', () => {
  for (const item of catalog.filter(item => ['correct_short', 'correct_big'].includes(item.category))) {
    assert.equal(eligibleCheer(item, item.event, { correct: false }), false);
    assert.equal(eligibleCheer(item, item.event, {}), false);
  }
  assert.equal(eligibleCheer(clip('C061'), 'wrong', { correct: false, attempted: false, nearMiss: true }), false);
  assert.equal(eligibleCheer(clip('C061'), 'wrong', { correct: false, attempted: true, nearMiss: true }), true);
});

test('specific streak statements match actual streaks and cannot guess unknown progress', () => {
  for (const [id, expected] of [['C041', 2], ['C042', 3], ['C043', 5]]) {
    for (const streak of [0, 1, 2, 3, 4, 5, 6]) {
      assert.equal(eligibleCheer(clip(id), 'streak', { correct: true, streak }), streak === expected);
    }
  }
  assert.equal(eligibleCheer(clip('C048'), 'streak', { correct: true }), false);
  assert.equal(eligibleCheer(clip('C048'), 'streak', { correct: true, improved: true }), true);
});

test('retry, pre-answer and halfway promises require actual matching game state', () => {
  for (const [id, event, field] of [['C062', 'wrong', 'willRetry'], ['C065', 'wrong', 'replaySameNext'], ['C068', 'wrong', 'beforeAnswer'], ['C069', 'wrong', 'reviewQueued'], ['C079', 'transition', 'isHalfway'], ['C080', 'transition', 'nextIsLast']]) {
    assert.equal(eligibleCheer(clip(id), event, { correct: false }), false);
    assert.equal(eligibleCheer(clip(id), event, { correct: false, [field]: true }), true);
  }
});

test('wolf lie reaction requires the wolf, a false claim and a correct decision', () => {
  const line = clip('C082');
  assert.equal(eligibleCheer(line, 'character', { character: 'wolf', correct: true }), false);
  assert.equal(eligibleCheer(line, 'character', { character: 'rabbit', correct: true, claimFalse: true, caughtLie: true }), false);
  assert.equal(eligibleCheer(line, 'character', { character: 'wolf', correct: true, claimFalse: true, caughtLie: true }), true);
});

test('time limit and ten most recent IDs are enforced before random selection', () => {
  const context = { correct: true };
  const recent = catalog.filter(item => item.category === 'correct_short').map(item => item.id);
  assert.equal(chooseCheer(catalog, manifest.clips, 'correct', context, 1.6, recent), null);
  assert.equal(chooseCheer(catalog, manifest.clips, 'correct', context, .1), null);
  for (let n = 0; n < 10; n++) {
    const result = chooseCheer(catalog, manifest.clips, 'correct', context, 1.6, [], () => n / 10);
    assert.ok(result);
    assert.ok(manifest.clips[result.id].seconds + .1 <= 1.6);
  }
});

test('music/voice/cheer/effects volumes clamp independently', () => {
  const audio = new FestivalAudio();
  audio.setVolumes({ music: 300, voice: -20, cheer: 31, sfx: 27 });
  assert.deepEqual(audio.volumeSettings, { music: 100, voice: 0, cheer: 31, sfx: 27 });
  audio.setVolumes({ music: NaN });
  assert.equal(audio.volumeSettings.music, 100);
});
