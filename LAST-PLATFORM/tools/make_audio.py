"""Synthesize the project's original ambient loop, footsteps and cues."""
import math
import random
import struct
import wave
from pathlib import Path

RATE = 22050
OUT = Path(__file__).resolve().parents[1] / "assets" / "audio"
OUT.mkdir(parents=True, exist_ok=True)
rng = random.Random(8247)

def write(name, seconds, sample):
    count = int(RATE * seconds)
    with wave.open(str(OUT / name), "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(RATE)
        audio.writeframes(b"".join(struct.pack("<h", int(max(-0.95, min(0.95, sample(i / RATE))) * 32767)) for i in range(count)))

def ambience(t):
    # Whole-cycle low tones plus a gentle, loop-safe air texture.
    hum = sum(math.sin(math.tau * f * t) * a for f, a in [(50, .10), (100, .035), (149, .015), (211, .014)])
    air = sum(math.sin(math.tau * (357 + i * 53) * t + i * .74) for i in range(14)) * .007
    return (hum + air) * (.72 + .12 * math.sin(math.tau * t / 8))

write("platform.wav", 8, ambience)
write("step.wav", .25, lambda t: (math.sin(math.tau * (100 - t * 130) * t) * .34 + rng.uniform(-1, 1) * .17) * math.exp(-t * 27) * min(1, t * 500))
write("accept.wav", 1.8, lambda t: sum(math.sin(math.tau * f * max(0, t - onset)) * math.exp(-max(0, t - onset) * 3) * min(1, max(0, t - onset) * 120) for f, onset in [(523.25, 0), (659.25, .22), (783.99, .44)]) * .16)
write("reject.wav", 1.6, lambda t: (math.sin(math.tau * 164.81 * t) + .6 * math.sin(math.tau * 174.61 * t)) * .16 * math.exp(-t * 2.7) * min(1, t * 100))
print("Generated four original WAV files.")
