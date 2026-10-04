import assert from 'node:assert/strict';
import test from 'node:test';
import {drawScenes15to21} from '../src/festival-scenes-15-21.js';

const BEAT = 60 / 132;

// A drawing-only context records the numerical objects that reach the player.
// No browser, fonts, source artwork, or audio device is required for these tests.
function scene(id, a = 7, b = 8, options = {}) {
 const {selected = null, correct = false, phase = 'play', beat = 8,
  hitBeat = 5, quiet = false, missing = 'ones', progress = 0,
  truth = false, revealBeat = 14, revealedAt = null} = options;
 const answer = a * b;
 const q = {a, b, answer, claimed: truth ? answer : answer === 81 ? 80 : answer + 1,
  truth, missing, choices: [answer, answer + 1, answer + 2]};
 const missingDigit = missing === 'tens' && answer >= 10 ? Math.floor(answer / 10) : answer % 10;
 const controls = id === 15
  ? [b, b % 9 + 1, (b + 1) % 9 + 1].map(n => ({value: a * n, label: String(n)}))
  : id === 18
   ? [missingDigit, (missingDigit + 1) % 10, (missingDigit + 9) % 10].map(d => ({value: missing === 'tens' && answer >= 10 ? d * 10 + answer % 10 : Math.floor(answer / 10) * 10 + d, label: String(d)}))
   : id === 21 ? [{value: 1, label: 'ほんと'}, {value: 0, label: 'うそ'}]
    : q.choices.map(value => ({value, label: String(value)}));
 const trace = {numbers: [], text: [], props: [], chars: [], boxes: [], ellipses: []};
 let depth = 0;
 const finite = values => values.forEach(v => {
  if (typeof v === 'number') assert.ok(Number.isFinite(v), `nonfinite coordinate/value in stage ${id}`);
 });
 const ctx = new Proxy({globalAlpha: 1, save() { depth++; }, restore() { assert.ok(--depth >= 0); }}, {
  get(object, key) { return key in object ? object[key] : (...args) => finite(args); },
  set(object, key, value) { finite([value]); object[key] = value; return true; },
 });
 const state = {time: beat * BEAT, beat, phase, selected, correct, reduceMotion: quiet,
  beatDuration: BEAT, revealBeat, revealedAt, controls,
  lastPulse: selected === null ? null : {value: selected, index: controls.findIndex(c => c.value === selected), success: correct, timing: 'off', time: hitBeat * BEAT},
  stageProgress: {correct: progress, history: Array.from({length: progress}, (_, i) => ({answer: i + 2, correct: true}))}};
 const env = {ctx, game: {id, character: 'テスト'}, q, state,
  helpers: {drawProp(c, x, y, size, time, config) { finite([x, y, size, time]); trace.props.push({x, y, size, ...config}); }},
  characterAt(name, x, y, size, pose) { finite([x, y, size]); trace.chars.push({name, x, y, size, pose}); },
  num(n, x, y, size) { finite([n, x, y, size]); assert.notEqual(n, null); trace.numbers.push({n, x, y, size}); },
  label(c, s, x, y, size) { finite([x, y, size]); trace.text.push(String(s)); },
  rounded(c, x, y, w, h, r) { finite([x, y, w, h, r]); assert.ok(w >= 0 && h >= 0); trace.boxes.push({x, y, w, h}); },
  ellipse(c, x, y, rx, ry) { finite([x, y, rx, ry]); assert.ok(rx >= 0 && ry >= 0); trace.ellipses.push({x, y, rx, ry}); },
  withNaturalAspect(c, x, y, draw) { finite([x, y]); draw(); },
 };
 const before = JSON.stringify({q, state});
 assert.equal(drawScenes15to21(env), true);
 assert.equal(depth, 0, 'unbalanced Canvas save/restore');
 assert.equal(JSON.stringify({q, state}), before, 'drawing must not change question/scoring inputs');
 return trace;
}

const hasNumber = (trace, n, x) => trace.numbers.some(v => v.n === n && (x === undefined || v.x === x));

test('all 81 facts draw in every stage with reduced motion, unanswered, and correct reveal', () => {
 for (let id = 15; id <= 21; id++) for (let a = 1; a <= 9; a++) for (let b = 1; b <= 9; b++) {
  for (const quiet of [false, true]) for (const phase of ['listen', 'reveal']) {
   const trace = scene(id, a, b, {quiet, phase, beat: phase === 'reveal' ? 20 : 2,
    selected: phase === 'reveal' ? id === 21 ? 0 : a * b : null,
    correct: phase === 'reveal', missing: a * b >= 10 && b % 2 ? 'tens' : 'ones', progress: b % 6});
   assert.ok(trace.chars.length, `stage ${id} has a visible character`);
  }
 }
});

test('each of the three delivery answers reaches its actual mailbox', () => {
 for (const quiet of [false, true]) for (let index = 0; index < 3; index++) {
  const trace = scene(17, 6, 7, {selected: 42 + index, beat: 10, hitBeat: 4, quiet});
  const parcel = trace.boxes.findLast(box => box.w === 58 && box.h === 46);
  assert.equal(parcel.x + parcel.w / 2, [385, 553, 721][index]);
 }
});

test('a late wrong tap completes the chosen action before teaching the correction', () => {
 for (const quiet of [false, true]) for (const id of [15, 18, 19, 20, 21]) {
  const trace = scene(id, 7, 8, {selected: id === 21 ? 1 : id === 15 ? 63 : 57, phase: 'reveal', beat: 14.05, hitBeat: 13.99, quiet});
  if (id === 15) assert.equal(hasNumber(trace, 8, 437), false);
  if (id === 18) assert.equal(hasNumber(trace, 6, 714), false);
  if (id === 19 || id === 20) assert.ok(hasNumber(trace, 57));
  if (id === 21) assert.ok(hasNumber(trace, 57, 629));
 }
});

test('off-beat correct math still produces scene success and keeps past progress', () => {
 for (let id = 15; id <= 21; id++) {
  const trace = scene(id, 7, 8, {selected: id === 21 ? 0 : 56, correct: true, phase: 'reveal', beat: 20, hitBeat: 2, quiet: true, progress: 2});
  assert.ok(trace.chars.some(c => c.pose === 'celebrate'));
  if (id === 20) assert.equal(trace.chars.filter(c => c.pose === 'act').length, 3);
 }
});

test('no tap still reveals the correct one-digit and two-digit equation', () => {
 for (const id of [15, 18, 19, 21]) for (const answer of [6, 56]) {
  const trace = scene(id, answer === 6 ? 2 : 7, answer === 6 ? 3 : 8, {phase: 'reveal', beat: 20, quiet: true});
  if (id === 15) assert.ok(hasNumber(trace, answer === 6 ? 3 : 8, 437));
  if (id === 18) assert.ok(hasNumber(trace, answer % 10, answer < 10 ? 685 : 714));
  if (id === 19) assert.ok(hasNumber(trace, answer, 616));
  if (id === 21) {
   assert.ok(hasNumber(trace, answer, 629));
   assert.equal(trace.text.some(s => s.includes('みやぶった')), false, 'no tap must not be called a successful judgement');
  }
 }
});

test('early answer timelines use the actual reveal time, not a fixed fourteenth beat', () => {
 for (const quiet of [false, true]) for (const revealBeat of [3, 6, 10]) for (const id of [15, 18, 19, 21]) {
  const trace = scene(id, 7, 8, {selected: id === 21 ? 1 : id === 15 ? 63 : 57,
   phase: 'reveal', beat: revealBeat + 3, hitBeat: revealBeat - 2, quiet, revealBeat, revealedAt: revealBeat * BEAT});
  if (id === 15) assert.ok(hasNumber(trace, 8, 437));
  if (id === 18) assert.ok(hasNumber(trace, 6, 714));
  if (id === 19) assert.ok(hasNumber(trace, 56, 616));
  if (id === 21) assert.ok(hasNumber(trace, 56, 629));
 }
});

test('the orchestra adds exactly one musician after the action and before reveal', () => {
 const active = trace => trace.chars.filter(c => c.pose === 'act' && c.name !== 'テスト').length;
 const sample = extra => scene(20, 7, 8, {selected: 56, correct: true, phase: 'play', hitBeat: 2, progress: 2, ...extra});
 assert.equal(active(sample({beat: 3})), 2, 'the joining motion takes 0.72 seconds');
 assert.equal(active(sample({beat: 4})), 3, 'do not wait for reveal to mirror the music');
 for (const quiet of [false, true]) {
  const arrived = sample({beat: 4, quiet});
  assert.ok(arrived.numbers.some(n => n.n === 56 && n.x === 714 && n.y === 120), 'the sent number settles above the musician faces');
 }
 assert.equal(active(sample({beat: 20, phase: 'reveal'})), 3, 'reveal must not add the same answer twice');
 assert.equal(active(sample({beat: 4, selected: 57, correct: false})), 2, 'wrong answers do not add a stem');
 assert.equal(active(sample({beat: 4, progress: 5})), 5, 'the band has five instruments');
});

test('the forest keeps the player stamp while replacing a false claim with correct math', () => {
 const trace = scene(21, 7, 8, {selected: 1, phase: 'reveal', beat: 20, hitBeat: 2, quiet: true});
 assert.ok(trace.text.includes('ほんと'));
 assert.ok(trace.text.some(s => s.includes('ほんとを選んだね')));
 assert.ok(hasNumber(trace, 56, 629));
 assert.equal(hasNumber(trace, 57, 629), false);
});

test('this scene module declines games outside its owned range', () => {
 for (const id of [1, 14, 22]) assert.equal(drawScenes15to21({game: {id}}), false);
});
