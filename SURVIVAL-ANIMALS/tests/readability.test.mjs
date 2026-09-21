import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
// A deliberately small subset of the grade 1–3 kanji, not the full curriculum.
// New UI wording must remain inside this reviewed set or use hiragana.
import { EARLY_KANJI } from "./early-kanji.mjs";
for (const file of ["src/data.js", "src/core.js", "src/main.js", "index.html"])
  test(`young-reader wording: ${file}`, () => {
    const text = fs.readFileSync(
      new URL("../" + file, import.meta.url),
      "utf8",
    );
    const unsupported = [
      ...new Set(text.match(/\p{Script=Han}/gu) || []),
    ].filter((c) => !EARLY_KANJI.includes(c));
    assert.deepEqual(
      unsupported,
      [],
      `Use hiragana instead: ${unsupported.join("")}`,
    );
    assert.equal(
      /[\u30a1-\u30fa]/u.test(text),
      false,
      "Visible Japanese wording must not depend on katakana",
    );
  });
