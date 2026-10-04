九九ビート大放送 — Festival audio assets

Speech credit: VOICEVOX:ずんだもん
Generated locally with the project's installed VOICEVOX Core 0.17.0, model 0.vvm,
normal style ID 3. Character flavor uses small pitch variations of that same
credited speaker; it is not a claim that 15 distinct speaker models were used.

424 actual speech recordings:
  q-a-b.wav: 81 multiplication questions, a and b in 1..9.
  a-a-b.wav: 81 correct traditional Japanese multiplication recitals.
             These use explicit AquesTalk kana via create_audio_query_from_kana,
             bypassing prose analysis that can turn ハ (h+a) into ワ (w+a).
             Every mora and consonant/vowel is checked before synthesis, and the
             manifest binds the phoneme audit to the actual WAV's SHA256 hash.
             72 is consistently recited シチジュウニ in the answer recordings.
  f-a-b.wav: 81 deliberately false claims for the true/false forest game.
             Claimed number is a*b+1, except 9*9 claims 80. The manifest records
             both the correct product and claimed number for exact UI matching.
  r-a-b.wav: 81 missing-factor questions for game 15. These say the first factor
             and product, for example "ななかける、いくつで、ごじゅうろく？", without
             saying the missing factor b. Correct feedback reuses a-a-b.wav.
  C001.wav .. C100.wav: 100 unique cheer scripts from the approved catalog.

All speech WAVs are 24 kHz mono 16-bit PCM, with real measured duration metadata.
All 324 numeric utterances (q/a/f/r) use explicit kana and checked phonemes.
Natural questions/claims preserve the grammatical particle ワ, while the number
eight is always ハチ; reverse questions contain no ワ at all. This also prevents
the earlier text analyzer's ワチ and ジュウワチ errors in questions and claims.
The 100 cheers are additional to the 324 multiplication clips. 64 cheer clips fit
the standard 1.6-second slot including a 100ms margin. Longer clips belong in
intro, finale, or other deliberately allocated spaces, never over lesson speech.

Six original instrumental compositions, produced from editable note data without
downloaded samples: jackpot, forest, kitchen, space, sports, finale.
All are 132 BPM, 32 beats (8 bars, approximately 14.545 seconds), stereo 44.1 kHz
16-bit PCM. Reverb/delay tails wrap periodically. First and last PCM samples
match on both channels. Each music file has its editable note score in JSON.

Reproduce with the already-installed local environment:
  .tools/venv/bin/python scripts/build_festival_audio.py
This resumes from manifest-backed generated clips. --force regenerates them.
--music-only or --voice-only limits the render to that asset family.
--answers-only regenerates only the 81 audited recitals when their version changes.

Runtime engine: src/festival-audio.js
One Web Audio clock drives music and game timing, with single-lane speech,
lesson-priority interruption of cheers, per-bus volumes, music ducking, and
AudioContext suspension for pause. No speech-generation service is contacted
during play. Optional game sounds are generated locally through Web Audio.
cue(at, kind) schedules short percussion precisely at audio.origin + at seconds;
kind accepts clap/kick/snare/hat/tick, with demo/accent/release aliases. Past cues
are skipped rather than played in a burst. Scheduled cues pause with the shared
AudioContext and are canceled by stop(). Immediate feedback sfx() remains available.

Pronunciation references:
  https://www.kochinet.ed.jp/motoyama-t/sansuuseat/kuku.pdf
  https://github.com/VOICEVOX/voicevox/blob/main/src/openapi/apis/DefaultApi.ts
The project uses one consistent traditional recital. This does not imply that
other regional/classroom readings are wrong; see the publisher's explanation:
  https://faq.tokyo-shoseki.co.jp/fa/customer/web/knowledge8282.html
