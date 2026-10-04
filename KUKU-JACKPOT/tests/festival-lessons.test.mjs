import test from 'node:test';
import assert from 'node:assert/strict';
import {STAGE_DESIGNS,practicePrompt,answerDisplay,lessonHint} from '../src/festival-lessons.js';
import {makeStageQuestion} from '../src/festival-core.js';
import {createMiniGame} from '../src/minigames.js';

test('every first-tap practice points at one real answer button, including reversed factors, repair digits and truth decisions',()=>{
 assert.equal(STAGE_DESIGNS.length,21);
 for(let id=1;id<=21;id++)for(const [a,b] of [[2,3],[7,8],[9,9],[1,2]]){
  const q=makeStageQuestion(id,a,b,{random:()=>.2}),game=createMiniGame(id,q),prompt=practicePrompt(q,game.controls);
  const expected=[4,21].includes(id)?Number(q.truth):a*b;
  const target=game.controls.filter(c=>c.value===prompt.expected);
  assert.equal(prompt.expected,expected);assert.equal(target.length,1);
  const display=answerDisplay(id,target[0]);assert.ok(prompt.title.includes(display.label));
  if(id===15)assert.equal(Number(display.label),b);
  if(id===18)assert.equal(Number(display.label),q.missing==='tens'?Math.floor(a*b/10):a*b%10);
  assert.ok(lessonHint(q).length>0);
 }
});
