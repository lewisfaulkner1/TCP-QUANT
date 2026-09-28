"""TCP reels' sound: an original music bed and sound effects, synthesised from sine, saw and noise
(nothing sampled or licensed), with the voice on top and the music ducking under it.

usage: python3 music.py --dur 28.5 --out mix.wav [--voice voice.wav] [--cues cues.json]
                        [--style pulse|drive|calm] [--bpm 120] [--seed 1] [--bed bed.wav]

  pulse  a light bed for voiceovers (kick on 1 and 3, hats, pad, plucks)
  drive  an upbeat track for reels without a voice (four to the floor, claps, 16th hats, bass)
  calm   pad and plucks only, for the welcome video
Cues are {t, sfx} with sfx one of tick, pop, slam, whoosh, rise. --bed also writes the music and
effects without the voice.
"""
import argparse
import json

import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
p = argparse.ArgumentParser()
p.add_argument('--dur', type=float, required=True)
p.add_argument('--out', required=True)
p.add_argument('--voice')
p.add_argument('--cues')
p.add_argument('--style', default='pulse')
p.add_argument('--bpm', type=float, default=120)
p.add_argument('--seed', type=int, default=1)
p.add_argument('--bed')
p.add_argument('--fadeout', type=float, default=1.6)
args = p.parse_args()

N = int(SR * args.dur)
rng = np.random.default_rng(args.seed)
music = np.zeros((2, N))
send = np.zeros((2, N))  # to the reverb
sfx = np.zeros((2, N))
beat = 60 / args.bpm
bar = beat * 4


def tt(n):
    return np.arange(n) / SR


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def pan2(x, pan=0.0):
    a = (pan + 1) * np.pi / 4
    return np.vstack([x * np.cos(a), x * np.sin(a)])


def put(buf, start, x, gain=1.0, pan=0.0, rv=0.0):
    if x.ndim == 1:
        x = pan2(x, pan)
    i = int(round(start * SR))
    if i >= N or i + x.shape[1] <= 0:
        return
    if i < 0:
        x, i = x[:, -i:], 0
    j = min(N, i + x.shape[1])
    buf[:, i:j] += x[:, : j - i] * gain
    if rv:
        send[:, i:j] += x[:, : j - i] * gain * rv


def env(n, a=0.005, r=0.2, hold=0.0):
    t = tt(n)
    e = np.minimum(1, t / max(a, 1e-4))
    rel = np.clip((t - a - hold) / max(r, 1e-4), 0, None)
    return e * np.exp(-3 * rel)


def saw(f, n, detune=0.0):
    t = tt(n)
    x = np.zeros(n)
    for d in (-detune, 0, detune):
        x += signal.sawtooth(2 * np.pi * f * (1 + d) * t + rng.random() * 6.28)
    return x / 3


def lowpass(x, f, order=2):
    b, a = signal.butter(order, f / (SR / 2), 'low')
    return signal.lfilter(b, a, x)


def highpass(x, f, order=2):
    b, a = signal.butter(order, f / (SR / 2), 'high')
    return signal.lfilter(b, a, x)


def bandpass(x, lo, hi):
    b, a = signal.butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band')
    return signal.lfilter(b, a, x)


# ------------------------------------------------------------------ instruments
def kick(gain=1.0):
    n = int(0.42 * SR)
    t = tt(n)
    f = 45 + 75 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 7.5)
    x += 0.35 * np.exp(-t * 90) * rng.standard_normal(n) * 0.3
    return x * gain


def hat(gain=1.0, open_=False):
    n = int((0.16 if open_ else 0.04) * SR)
    x = highpass(rng.standard_normal(n), 7000) * np.exp(-tt(n) * (14 if open_ else 80))
    return x * gain


def clap(gain=1.0):
    n = int(0.25 * SR)
    x = bandpass(rng.standard_normal(n), 900, 3200)
    e = np.exp(-tt(n) * 22)
    for k in (0.0, 0.012, 0.024):
        e += 0.6 * np.exp(-np.clip(tt(n) - k, 0, None) * 120) * (tt(n) >= k)
    return x * e * 0.5 * gain


def pad_chord(notes, start, length, gain=0.12):
    n = int(length * SR)
    x = np.zeros(n)
    for m in notes:
        x += saw(midi(m), n, detune=0.004)
    x = lowpass(x, 1400, 2)
    e = np.minimum(1, tt(n) / 0.6) * np.minimum(1, (length - tt(n)) / 0.5).clip(0, 1)
    put(music, start, np.vstack([x * e, np.roll(x, 240) * e]) * gain, rv=0.5)


def pluck(m, start, gain=0.08, pan=0.0):
    n = int(0.45 * SR)
    t = tt(n)
    f = midi(m)
    x = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * signal.square(2 * np.pi * f * t)) * np.exp(-t * 9)
    put(music, start, x * gain, pan=pan, rv=0.35)
    put(music, start + beat * 0.75, x * gain * 0.35, pan=-pan, rv=0.3)  # a dotted-eighth echo


def bass(m, start, length, gain=0.32):
    n = int(length * SR)
    t = tt(n)
    x = np.sin(2 * np.pi * midi(m) * t) + 0.25 * np.sin(4 * np.pi * midi(m) * t)
    put(music, start, x * env(n, 0.01, length * 0.6) * gain)


# D minor: i - VI - III - VII, two bars each
PROG = [([50, 53, 57], 38), ([46, 50, 53], 34), ([53, 57, 60], 41), ([48, 52, 55], 36)]
style = args.style
kicks = []
t0 = 0.0
k = 0
while t0 < args.dur:
    chord, root = PROG[(k // 2) % 4]
    if k % 2 == 0:
        pad_chord([m + 12 for m in chord], t0, bar * 2 + 0.4, gain=0.07 if style == 'calm' else 0.1)
    for b in range(4):
        tb = t0 + b * beat
        if tb >= args.dur:
            break
        if style == 'drive' or (style == 'pulse' and b in (0, 2)):
            put(music, tb, kick(0.9 if style == 'drive' else 0.55))
            kicks.append(tb)
        if style == 'drive' and b in (1, 3):
            put(music, tb, clap(0.55), rv=0.2)
        if style != 'calm':
            put(music, tb + beat / 2, hat(0.16 if style == 'pulse' else 0.24), pan=0.2)
            if style == 'drive':
                put(music, tb + beat / 4, hat(0.1), pan=-0.2)
                put(music, tb + 3 * beat / 4, hat(0.1), pan=-0.2)
        if style == 'drive':
            bass(root, tb, beat * 0.45)
            bass(root, tb + beat / 2, beat * 0.4, gain=0.22)
        elif style == 'pulse' and b in (0, 2):
            bass(root, tb, beat * 1.8, gain=0.22)
        # plucks: the chord tones rising, sixteenths in drive, eighths otherwise
        step = beat / (4 if style == 'drive' else 2)
        tones = [m + 24 for m in chord] + [chord[0] + 36]
        for s in range(int(beat / step)):
            pluck(tones[(b * 4 + s) % len(tones)], tb + s * step, gain=0.05 if style != 'drive' else 0.045, pan=0.3 if s % 2 else -0.3)
    t0 += bar
    k += 1

# sidechain pump: music dips on each kick
pump = np.ones(N)
for tb in kicks:
    i = int(tb * SR)
    n = int(beat * 0.9 * SR)
    j = min(N, i + n)
    pump[i:j] = np.minimum(pump[i:j], 1 - 0.45 * np.exp(-tt(j - i) * 9))
music *= pump

# ---------------------------------------------------------------------- effects
def sfx_tick():
    n = int(0.05 * SR)
    return np.sin(2 * np.pi * 1900 * tt(n)) * np.exp(-tt(n) * 110) * 0.5


def sfx_pop():
    n = int(0.12 * SR)
    f = 520 + 520 * tt(n) / 0.12
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt(n) * 40) * 0.6


def sfx_slam():
    n = int(0.9 * SR)
    t = tt(n)
    f = 32 + 70 * np.exp(-t * 18)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4.5)
    crack = lowpass(rng.standard_normal(n), 2500) * np.exp(-t * 35) * 0.5
    return (boom + crack) * 0.9


def sfx_whoosh():
    n = int(0.6 * SR)
    t = tt(n)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    for i, (lo, hi) in enumerate([(300, 900), (700, 2000), (1500, 4200)]):
        seg = slice(i * n // 3, (i + 1) * n // 3)
        out[seg] = bandpass(x, lo, hi)[seg]
    return out * np.sin(np.pi * t / t[-1]) ** 2 * 0.45


def sfx_rise():
    n = int(1.1 * SR)
    t = tt(n)
    noise = highpass(rng.standard_normal(n), 1500) * (t / t[-1]) ** 2 * 0.3
    f = 200 * 2 ** (t / t[-1] * 2.5)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * (t / t[-1]) ** 3 * 0.25
    return noise + tone


SFX = {'tick': sfx_tick, 'pop': sfx_pop, 'slam': sfx_slam, 'whoosh': sfx_whoosh, 'rise': sfx_rise}
GAIN = {'tick': 0.35, 'pop': 0.45, 'slam': 0.8, 'whoosh': 0.5, 'rise': 0.55}
if args.cues:
    for c in json.load(open(args.cues)):
        if c['sfx'] in SFX and 0 <= c['t'] < args.dur:
            put(sfx, c['t'], SFX[c['sfx']]() * GAIN[c['sfx']], pan=rng.uniform(-0.2, 0.2), rv=0.25 if c['sfx'] in ('slam', 'whoosh') else 0.1)

# ----------------------------------------------------------------------- reverb
ir_n = int(1.8 * SR)
ir = rng.standard_normal((2, ir_n)) * np.exp(-tt(ir_n) * 3.2)
ir = np.vstack([lowpass(ir[0], 5000), lowpass(ir[1], 5000)])
wet = np.vstack([signal.fftconvolve(send[0], ir[0])[:N], signal.fftconvolve(send[1], ir[1])[:N]]) * 0.06

bed = music + wet + sfx
# fade the music out at the end (effects keep their tails)
fade = np.ones(N)
f = int(args.fadeout * SR)
fade[-f:] = np.linspace(1, 0, f) ** 1.5
bed = (music + wet) * fade + sfx

mix = bed * (0.55 if style == 'drive' else 0.42 if style == 'pulse' else 0.35)
if args.voice:
    vsr, v = wavfile.read(args.voice)
    v = v.astype(np.float64) / (32768.0 if v.dtype == np.int16 else 1.0)
    if v.ndim > 1:
        v = v.mean(axis=1)
    if vsr != SR:
        v = signal.resample_poly(v, SR, vsr)
    v = np.pad(v, (0, max(0, N - len(v))))[:N]
    # duck the music under the voice
    e = np.sqrt(np.convolve(v ** 2, np.ones(int(0.05 * SR)) / int(0.05 * SR), mode='same'))
    e = np.clip(e / 0.06, 0, 1)
    b, a = signal.butter(1, 4 / (SR / 2))
    e = signal.filtfilt(b, a, e)
    duck = 1 - 0.55 * np.clip(e, 0, 1)
    mix = mix * duck + np.vstack([v, v])

mix = np.tanh(mix * 1.2) / np.tanh(1.2)
mix = mix / (np.abs(mix).max() or 1) * 0.95
wavfile.write(args.out, SR, (mix.T * 32767).astype(np.int16))
if args.bed:
    b2 = np.tanh(bed * 0.9)
    wavfile.write(args.bed, SR, ((b2 / (np.abs(b2).max() or 1) * 0.95).T * 32767).astype(np.int16))
print(f'{args.out}: {args.dur:.2f}s, {style}, {args.bpm:.0f} bpm')
