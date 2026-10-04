// All gameplay times are beats in the same 144 BPM score as the rendered music.
export const BPM = 144;
export const BEAT = 60 / BPM;
export const INTRO = 8;
export const ROUND = 16;
export const TARGET = 8;
export const LAST_INPUT = 9.25;
export const REVEAL = 10;
export const END = INTRO + 9 * ROUND + 8;
export const READINGS = ['しちいち が しち', 'しちに じゅうし', 'しちさん にじゅういち', 'しちし にじゅうはち', 'しちご さんじゅうご', 'しちろく しじゅうに', 'しちしち しじゅうく', 'しちは ごじゅうろく', 'しちく ろくじゅうさん'];

export function shuffle(items, random = Math.random) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function makeCourse(mode, random = Math.random) {
  const order = mode === 'challenge' ? shuffle([1,2,3,4,5,6,7,8,9], random) : [1,2,3,4,5,6,7,8,9];
  return order.map((n, i) => {
    const answer = n * 7;
    const distractors = shuffle([...new Set([answer - 7, answer + 7, answer - 1, answer + 1])].filter(v => v > 0 && v <= 81), random);
    return { n, answer, choices: shuffle([answer, ...distractors.slice(0,2)], random), start: INTRO + i * ROUND, reading: READINGS[n-1] };
  });
}
export function position(beat) {
  if (beat < INTRO) return { index: -1, local: beat, phase: 'intro' };
  const index = Math.floor((beat - INTRO) / ROUND);
  if (index >= 9) return { index: 9, local: beat - INTRO - ROUND * 9, phase: 'outro' };
  const local = beat - INTRO - index * ROUND;
  return { index, local, phase: local >= REVEAL ? 'reveal' : local >= 5 ? 'count' : 'choose' };
}
export function judge(round, choice, localBeat, offsetMs = 0) {
  const errorMs = (localBeat - TARGET) * BEAT * 1000 - offsetMs;
  const distance = Math.abs(errorMs);
  return { n: round.n, answer: round.answer, choice, correct: choice === round.answer,
    rhythm: distance <= 105 ? 'perfect' : distance <= 225 ? 'great' : 'off', errorMs };
}
export function summarize(results) {
  return { correct: results.filter(r => r.correct).length, perfect: results.filter(r => r.rhythm === 'perfect').length,
    rhythm: results.filter(r => ['perfect', 'great'].includes(r.rhythm)).length,
    review: results.filter(r => !r.correct).map(r => r.n) };
}
export function missedStop(round, choice, hintUsed = false) {
  return {n:round.n,answer:round.answer,choice,correct:choice===round.answer,rhythm:'miss',errorMs:null,hintUsed};
}
