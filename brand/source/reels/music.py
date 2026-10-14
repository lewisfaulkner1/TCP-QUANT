"""TCP reels' sound: an original music bed and sound effects, synthesised from sine, saw and noise
(nothing sampled or licensed), with the voice on top and the music ducking under it.

usage: python3 music.py --dur 28.5 --out mix.wav [--voice voice.wav] [--cues cues.json]
                        [--style pulse|drive|calm|lofi|lounge|trap|noir|bounce|news|fight|gameshow]
                        [--bpm 120] [--seed 1]
                        [--amb cabin] [--bed bed.wav] [--sfx sfx.wav]

  pulse   a light bed for voiceovers (kick on 1 and 3, hats, pad, plucks), D minor
  drive   an upbeat track for reels without a voice (four to the floor, claps, 16th hats, bass)
  calm    pad and plucks only, for the welcome video
  lofi    lazy and warm, F major sevenths: electric piano, upright bass, swung hats, vinyl crackle
  lounge  a bossa in B flat: jazz chords pushed off the beat, rim clave, shaker, upright bass
  trap    half time in C sharp minor: 808s, a clap on 3, rolling hats and a dark bell
  noir    a detective's jazz in D minor: walking bass, brushes, vibraphone, a muted horn line
  bounce  a cartoon's bounce in F: oom-pah tuba, pizzicato, marimba runs, a woodblock
  news    a news theme in C minor: ticking sixteenths, timpani, brass stabs, strings
  fight   a fight night in E minor: heavy half-time drums, a growling bass, brass hits
  gameshow  big-band swing in B flat: brass shouts, walking bass, ride cymbal, snare fills
Cues are {t, sfx} with sfx one of tick, pop, slam, whoosh, rise, click, chime (an airliner's cabin
chime), ding (one soft bell), gps (a sat nav's prompt), blip, level and error (a game's), buzzer (a
line-up's), boing, wah (a sad trombone), flash (a camera), ring (a boxing bell, twice), punch,
drumroll, applause, or
{t, sfx: 'mute', until}, which drops the music out (a beat of silence for a punchline; the effects
carry on). --amb cabin lays an airliner cabin's steady roar under everything, with the effects.
--bed also writes the music and effects without the voice, and --sfx the effects alone.
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
p.add_argument('--sfx')
p.add_argument('--fadeout', type=float, default=1.6)
p.add_argument('--amb')
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


def epiano(notes, start, length, gain=0.06, pan=0.0):
    # an electric piano: a sine tine with a quick bell partial on top, a slow tremolo
    n = int((length + 0.8) * SR)
    t = tt(n)
    x = np.zeros(n)
    for m in notes:
        f = midi(m) * (1 + rng.uniform(-0.0015, 0.0015))
        x += (np.sin(2 * np.pi * f * t) + 0.18 * np.sin(4 * np.pi * f * t) * np.exp(-t * 3)
              + 0.22 * np.sin(2 * np.pi * f * 7.01 * t) * np.exp(-t * 18)) * np.exp(-t * 1.1)
    x *= (1 + 0.12 * np.sin(2 * np.pi * 4.8 * t)) * np.clip((length + 0.8 - t) / 0.4, 0, 1)
    put(music, start, lowpass(x, 3800) / len(notes) * 2 * gain, pan=pan, rv=0.4)


def snare(gain=1.0):
    n = int(0.22 * SR)
    t = tt(n)
    return (bandpass(rng.standard_normal(n), 1200, 6000) * np.exp(-t * 24) * 0.6 + np.sin(2 * np.pi * 185 * t) * np.exp(-t * 30) * 0.5) * gain


def rim(gain=1.0):
    n = int(0.05 * SR)
    t = tt(n)
    return (bandpass(rng.standard_normal(n), 1400, 2600) * np.exp(-t * 160) + np.sin(2 * np.pi * 1650 * t) * np.exp(-t * 120) * 0.5) * gain


def shaker(gain=1.0):
    n = int(0.07 * SR)
    t = tt(n)
    return highpass(rng.standard_normal(n), 5000) * np.minimum(1, t / 0.012) * np.exp(-np.clip(t - 0.012, 0, None) * 60) * gain


def upright(m, start, length, gain=0.3):
    # a plucked upright bass: round, with a little finger noise in the attack
    n = int(length * SR)
    t = tt(n)
    f = midi(m)
    x = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t) * np.exp(-t * 6) + 0.1 * np.sin(6 * np.pi * f * t) * np.exp(-t * 10)
    e = np.minimum(1, t / 0.008) * np.exp(-t * 2.2) * np.clip((length - t) / 0.06, 0, 1)
    put(music, start, lowpass(x * e, 900) * gain)


def b808(m, start, length, gain=0.5):
    # an 808: a sine that drops into the note, driven a little, with a long tail
    n = int(length * SR)
    t = tt(n)
    f = midi(m) * (1 + 0.6 * np.exp(-t * 30))
    x = np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * 1.8)
    e = np.minimum(1, t / 0.004) * np.exp(-t * 1.4) * np.clip((length - t) / 0.05, 0, 1)
    put(music, start, lowpass(x * e, 600) * gain)


def bell(m, start, gain=0.06, pan=0.0, decay=3.5):
    n = int(1.4 * SR)
    t = tt(n)
    f = midi(m)
    x = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(4 * np.pi * f * t) * np.exp(-t * 2) + 0.25 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t * 4)) * np.exp(-t * decay)
    put(music, start, x * gain, pan=pan, rv=0.5)


def vinyl():
    # a record's crackle: sparse clicks and a low hiss
    x = lowpass(rng.standard_normal(N), 2500) * 0.004
    clicks = np.zeros(N)
    idx = rng.integers(0, N, int(args.dur * 9))
    clicks[idx] = rng.uniform(-1, 1, len(idx)) * 0.06
    x += lowpass(highpass(clicks, 1500), 7000)
    music[0] += x
    music[1] += np.roll(x, 37)


def lofi_style():
    # F major sevenths, a bar each: Fmaj7, Em7, Dm7, Cmaj7; everything a touch behind the beat
    prog = [([53, 57, 60, 64], 41), ([52, 55, 59, 62], 40), ([50, 53, 57, 60], 38), ([48, 52, 55, 59], 36)]
    swing = beat * 0.08
    t0, k = 0.0, 0
    while t0 < args.dur:
        chord, root = prog[k % 4]
        epiano(chord, t0, bar * 0.55, gain=0.07, pan=-0.1)
        epiano(chord, t0 + beat * 1.5 + swing, bar * 0.4, gain=0.05, pan=0.1)
        upright(root, t0, beat * 1.6, gain=0.28)
        upright(root + 7, t0 + beat * 2.5 + swing, beat * 1.2, gain=0.2)
        for b in range(4):
            tb = t0 + b * beat
            if tb >= args.dur:
                break
            if b == 0 or (b == 2 and k % 2 == 1):
                put(music, tb, lowpass(kick(0.7), 2000))
                kicks.append(tb)
            if b == 2 and k % 2 == 0:
                put(music, tb + beat / 2 + swing, lowpass(kick(0.5), 2000))
                kicks.append(tb + beat / 2 + swing)
            if b in (1, 3):
                put(music, tb + swing / 2, snare(0.42), rv=0.25)
            put(music, tb, hat(0.14), pan=0.25)
            put(music, tb + beat / 2 + swing, hat(0.1), pan=0.25)
        if k % 2 == 1:
            for j, m in enumerate([chord[3] + 12, chord[2] + 12, chord[1] + 12]):
                bell(m, t0 + beat * (0.5 + j * 0.75), gain=0.035, pan=0.3, decay=2.5)
        t0 += bar
        k += 1
    vinyl()
    music[0] = lowpass(music[0], 5200)
    music[1] = lowpass(music[1], 5200)


def lounge_style():
    # a bossa in B flat, a bar each: Cm9, F13, Bbmaj9, Gm9; the chords on 1, the 'and' of 2, and 4
    prog = [([51, 55, 58, 62], 36), ([51, 57, 62, 67], 41), ([50, 53, 57, 60], 34), ([46, 50, 53, 57], 43)]
    t0, k = 0.0, 0
    while t0 < args.dur:
        chord, root = prog[k % 4]
        for off, ln, g in ((0, 0.9, 0.06), (1.5, 0.6, 0.05), (3.0, 0.8, 0.05)):
            epiano(chord, t0 + off * beat, ln * beat, gain=g, pan=0.15)
        upright(root, t0, beat * 1.4, gain=0.3)
        upright(root + 7, t0 + beat * 1.5, beat * 0.45, gain=0.18)
        upright(root + 7, t0 + beat * 2, beat * 1.4, gain=0.26)
        for b in range(4):
            tb = t0 + b * beat
            if tb >= args.dur:
                break
            if b in (0, 2):
                put(music, tb, lowpass(kick(0.45), 1500))
                kicks.append(tb)
            for q in range(4):
                put(music, tb + q * beat / 4, shaker(0.07 if q % 2 else 0.11), pan=0.35)
        for off in ((0, 1.5, 3.0) if k % 2 == 0 else (1.0, 2.5)):
            put(music, t0 + off * beat, rim(0.22), pan=-0.25, rv=0.15)
        t0 += bar
        k += 1


def trap_style():
    # half time in C sharp minor, a bar each: C#m, A, F#m, G#m; 808s under the kicks, a clap on 3
    prog = [([49, 52, 56], 37), ([45, 49, 52], 33), ([42, 45, 49], 30), ([44, 47, 51], 32)]
    melody = [68, 66, 64, 61, 64, 66, 61, 59]
    t0, k = 0.0, 0
    while t0 < args.dur:
        chord, root = prog[k % 4]
        pad_chord([m + 12 for m in chord], t0, bar + 0.3, gain=0.06)
        for off in ((0, 1.75, 2.5) if k % 2 == 0 else (0, 0.75, 2.25)):
            tb = t0 + off * beat
            if tb < args.dur:
                put(music, tb, kick(0.85))
                kicks.append(tb)
                b808(root, tb, beat * (1.2 if off == 0 else 0.7), gain=0.42)
        put(music, t0 + 2 * beat, clap(0.75), rv=0.25)
        for e8 in range(8):
            put(music, t0 + e8 * beat / 2, hat(0.16 if e8 % 2 == 0 else 0.1), pan=0.2)
        if k % 2 == 1:
            for r in range(6):
                put(music, t0 + 3 * beat + r * beat / 6, hat(0.08 + r * 0.012), pan=-0.2)
        for j in range(2):
            bell(melody[(k * 2 + j) % len(melody)], t0 + j * 2 * beat + (0.5 * beat if j else 0), gain=0.05, pan=0.25 if j else -0.25, decay=2.8)
        t0 += bar
        k += 1


def brush(gain=1.0):
    # a brush swept across the snare: a soft swish of high noise
    n = int(0.22 * SR)
    x = bandpass(rng.standard_normal(n), 2500, 9000) * env(n, 0.03, 0.18)
    return x * 0.5 * gain


def horn(m, start, length, gain=0.05, pan=0.0, mute=True):
    # a muted horn: a saw through a closing filter, a little breath and vibrato
    n = int(length * SR)
    t = tt(n)
    f = midi(m) * (1 + 0.004 * np.sin(2 * np.pi * 5.2 * t) * np.clip(t / 0.25, 0, 1))
    ph = np.cumsum(f) / SR
    x = 2 * (ph % 1) - 1
    x = lowpass(x, 1400 if mute else 2600) * env(n, 0.04, 0.12, hold=max(0.0, length - 0.2))
    x += bandpass(rng.standard_normal(n), 800, 2400) * env(n, 0.02, 0.1) * 0.08
    put(music, start, x * gain, pan=pan, rv=0.3)


def stab(notes, start, length=0.18, gain=0.05, pan=0.0, bright=3200):
    # a brass section's hit: detuned saws, bright then closing
    n = int(length * SR)
    x = sum(saw(midi(m), n, detune=0.004) for m in notes)
    x = lowpass(x, bright) * env(n, 0.006, length * 0.7)
    put(music, start, x * gain, pan=pan, rv=0.2)


def marimba(m, start, gain=0.06, pan=0.0):
    n = int(0.5 * SR)
    t = tt(n)
    x = (np.sin(2 * np.pi * midi(m) * t) + 0.25 * np.sin(2 * np.pi * midi(m) * 4 * t) * np.exp(-t * 30)) * np.exp(-t * 9)
    put(music, start, x * gain, pan=pan)


def timp(m, start, gain=0.5):
    n = int(0.9 * SR)
    t = tt(n)
    f = midi(m) * (1 + 0.06 * np.exp(-t * 20))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4) + lowpass(rng.standard_normal(n), 300) * np.exp(-t * 30) * 0.3
    put(music, start, x * gain, rv=0.3)
    kicks.append(start)


def noir_style():
    # D minor, a bar each: Dm9, Bbmaj7, Gm9, A7b9; walking bass in quarters, swung brushes, vibes on
    # the offbeats, and a muted horn line every other bar
    prog = [([53, 57, 60, 64], [38, 41, 45, 43]), ([50, 53, 57, 58], [34, 38, 41, 40]),
            ([46, 50, 53, 57], [31, 34, 38, 37]), ([49, 52, 55, 58], [33, 37, 40, 39])]
    line = [[69, 67, 65, 62], [65, 64, 62, 58], [62, 65, 67, 70], [69, 67, 64, 61]]
    sw = beat * 0.16
    t0, k = 0.0, 0
    while t0 < args.dur:
        chord, walk = prog[k % 4]
        for b in range(4):
            tb = t0 + b * beat
            if tb >= args.dur:
                break
            upright(walk[b], tb, beat * 0.9, gain=0.3)
            put(music, tb, brush(0.5 if b % 2 else 0.3), pan=-0.2)
            put(music, tb + beat * 0.5 + sw, hat(0.06), pan=0.3)
            if b in (1, 3):
                put(music, tb, rim(0.12), pan=0.2)
            if b == 0:
                put(music, tb, lowpass(kick(0.35), 900))
                kicks.append(tb)
        for off in (0.5, 2.5):
            for j, m in enumerate(chord):
                bell(m + 12, t0 + off * beat + sw + j * 0.012, gain=0.022, pan=0.25, decay=1.6)
        if k % 2 == 1:
            for j, m in enumerate(line[(k // 2) % 4]):
                horn(m, t0 + j * beat + (sw if j % 2 else 0), beat * (1.4 if j == 3 else 0.8), gain=0.05, pan=-0.15)
        t0 += bar
        k += 1


def bounce_style():
    # F major, a bar each: F, Bb, C7, F; oom-pah tuba, pizzicato offbeats, a marimba running sixteenths
    prog = [([53, 57, 60], 41), ([50, 53, 58], 46), ([52, 55, 58, 60], 48), ([53, 57, 60], 41)]
    run = [72, 69, 72, 74, 72, 69, 67, 69]
    t0, k = 0.0, 0
    while t0 < args.dur:
        chord, root = prog[k % 4]
        for b in range(4):
            tb = t0 + b * beat
            if tb >= args.dur:
                break
            bass(root - 12 if b % 2 == 0 else root - 5, tb, beat * 0.45, gain=0.3)
            if b % 2 == 0:
                put(music, tb, kick(0.55))
                kicks.append(tb)
            else:
                put(music, tb, clap(0.35), rv=0.15)
            for j, m in enumerate(chord):
                pluck(m + 12, tb + beat * 0.5 + j * 0.008, gain=0.035, pan=0.25)
            put(music, tb + beat * 0.75, rim(0.16), pan=-0.3)
        for q in range(8 if k % 2 else 4):
            marimba(run[(q + k * 3) % len(run)] + (0 if k % 4 < 2 else 2), t0 + q * beat / 2, gain=0.05, pan=-0.2 + 0.05 * q)
        t0 += bar
        k += 1


def news_style():
    # C minor: Cm, Ab, Eb, Bb; ticking sixteenths, timpani on 1, brass stabs, strings under
    prog = [([48, 51, 55], 36), ([44, 48, 51], 32), ([51, 55, 58], 39), ([46, 50, 53], 34)]
    t0, k = 0.0, 0
    while t0 < args.dur:
        chord, root = prog[k % 4]
        pad_chord([m + 12 for m in chord], t0, bar + 0.3, gain=0.07)
        timp(root, t0, gain=0.45)
        if k % 2 == 1:
            timp(root, t0 + 2.5 * beat, gain=0.3)
        for q in range(16):
            tq = t0 + q * beat / 4
            if tq < args.dur:
                put(music, tq, hat(0.1 if q % 4 else 0.16), pan=0.3)
        for off in (0, 1.5, 3):
            stab([m + 12 for m in chord] + [chord[0] + 24], t0 + off * beat, length=0.22, gain=0.045)
        put(music, t0 + beat, clap(0.25), rv=0.2)
        put(music, t0 + 3 * beat, clap(0.25), rv=0.2)
        bass(root, t0, beat * 1.5, gain=0.25)
        bass(root, t0 + 2 * beat, beat * 1.5, gain=0.2)
        t0 += bar
        k += 1


def fight_style():
    # E minor, half time: Em, C, D, B7; a heavy kick and snare, a growling bass, brass hits on the turns
    prog = [([52, 55, 59], 28), ([48, 52, 55], 24), ([50, 54, 57], 26), ([47, 51, 54, 57], 23)]
    t0, k = 0.0, 0
    while t0 < args.dur:
        chord, root = prog[k % 4]
        for off in ((0, 1.5, 2.75) if k % 2 == 0 else (0, 0.75, 2.5)):
            tb = t0 + off * beat
            if tb < args.dur:
                put(music, tb, kick(1.0))
                kicks.append(tb)
                b808(root + 12, tb, beat * 0.6, gain=0.32)
        put(music, t0 + 2 * beat, snare(0.9), rv=0.35)
        put(music, t0 + 2 * beat, clap(0.45), rv=0.3)
        for e8 in range(8):
            put(music, t0 + e8 * beat / 2, hat(0.13 if e8 % 2 == 0 else 0.08, open_=e8 == 7), pan=0.25)
        stab([m + 12 for m in chord], t0, length=0.32, gain=0.06, bright=2400)
        if k % 2 == 1:
            stab([m + 12 for m in chord], t0 + 3.5 * beat, length=0.16, gain=0.05, bright=2400)
            stab([m + 14 for m in chord], t0 + 3.75 * beat, length=0.2, gain=0.05, bright=2600)
        t0 += bar
        k += 1


def gameshow_style():
    # B flat major swing: Bb6, G7, Cm7, F7; shout chords on the offbeats, walking bass, the ride
    prog = [([58, 62, 65, 67], [34, 38, 41, 42]), ([55, 59, 62, 65], [31, 35, 38, 37]),
            ([48, 51, 55, 58], [36, 39, 43, 42]), ([53, 57, 60, 63], [29, 33, 36, 34])]
    sw = beat * 0.17
    t0, k = 0.0, 0
    while t0 < args.dur:
        chord, walk = prog[k % 4]
        for b in range(4):
            tb = t0 + b * beat
            if tb >= args.dur:
                break
            upright(walk[b] + 12, tb, beat * 0.85, gain=0.28)
            put(music, tb, hat(0.14, open_=True), pan=0.3)
            put(music, tb + beat * 0.5 + sw, hat(0.08), pan=0.3)
            if b in (1, 3):
                put(music, tb, snare(0.25), rv=0.2)
            if b == 0:
                put(music, tb, kick(0.5))
                kicks.append(tb)
        stab(chord, t0 + beat * 0.5 + sw, length=0.2, gain=0.05)
        stab(chord, t0 + beat * 2.5 + sw, length=0.3, gain=0.055)
        if k % 4 == 3:
            for r in range(6):
                put(music, t0 + 3 * beat + r * beat / 6, snare(0.15 + r * 0.04), rv=0.15)
        t0 += bar
        k += 1


# D minor: i - VI - III - VII, two bars each
PROG = [([50, 53, 57], 38), ([46, 50, 53], 34), ([53, 57, 60], 41), ([48, 52, 55], 36)]
style = args.style
kicks = []
if style == 'lofi':
    lofi_style()
elif style == 'lounge':
    lounge_style()
elif style == 'trap':
    trap_style()
elif style == 'noir':
    noir_style()
elif style == 'bounce':
    bounce_style()
elif style == 'news':
    news_style()
elif style == 'fight':
    fight_style()
elif style == 'gameshow':
    gameshow_style()
else:
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
DEPTH = {'lofi': 0.2, 'lounge': 0.1, 'trap': 0.3}.get(style, 0.45)
for tb in kicks:
    i = int(tb * SR)
    n = int(beat * 0.9 * SR)
    j = min(N, i + n)
    pump[i:j] = np.minimum(pump[i:j], 1 - DEPTH * np.exp(-tt(j - i) * 9))
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


def sfx_click():
    # a mouse button: the press, then a softer release
    n = int(0.14 * SR)
    out = np.zeros(n)
    for start, g in ((0.0, 1.0), (0.07, 0.5)):
        i = int(start * SR)
        t = tt(n - i)
        burst = highpass(rng.standard_normal(n - i), 2500) * np.exp(-t * 900) * 0.7
        ring = np.sin(2 * np.pi * 4300 * t) * np.exp(-t * 520) * 0.45
        body = np.sin(2 * np.pi * 950 * t) * np.exp(-t * 240) * 0.3
        out[i:] += (burst + ring + body) * g
    return out


def bell_tone(f, n, decay):
    t = tt(n)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 4)
            + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 8)) * np.exp(-t * decay)


def sfx_chime():
    # an airliner's cabin chime: a high bell, then a lower one
    n = int(1.9 * SR)
    out = np.zeros(n)
    for start, f in ((0.0, 1046.5), (0.42, 784.0)):
        i = int(start * SR)
        out[i:] += bell_tone(f, n - i, 2.4)
    return out * 0.35


def sfx_ding():
    return bell_tone(1318.5, int(1.4 * SR), 3.2) * 0.35


def sfx_gps():
    # a sat nav's prompt: two soft notes up
    n = int(0.42 * SR)
    out = np.zeros(n)
    for start, f in ((0.0, 880.0), (0.16, 1318.5)):
        i = int(start * SR)
        t = tt(n - i)
        out[i:] += np.sin(2 * np.pi * f * t) * np.minimum(1, t / 0.006) * np.exp(-t * 14)
    return out * 0.4


def sfx_blip():
    # a game's menu blip
    n = int(0.14 * SR)
    out = np.zeros(n)
    for start, f in ((0.0, 988.0), (0.06, 1480.0)):
        i = int(start * SR)
        m = min(n - i, int(0.055 * SR))
        t = tt(m)
        out[i:i + m] += signal.square(2 * np.pi * f * t) * np.exp(-t * 25)
    return lowpass(out, 6000) * 0.25


def sfx_level():
    # a game's success: four notes up
    n = int(0.9 * SR)
    out = np.zeros(n)
    for j, f in enumerate((523.25, 659.25, 783.99, 1046.5)):
        i = int(j * 0.075 * SR)
        t = tt(n - i)
        ln = 0.3 if j == 3 else 0.09
        e = np.minimum(1, t / 0.004) * np.exp(-np.clip(t - ln, 0, None) * 30)
        out[i:] += (signal.square(2 * np.pi * f * t) * 0.5 + np.sin(2 * np.pi * f * t) * 0.5) * e
    return lowpass(out, 7000) * 0.22


def sfx_error():
    # a game's wrong turn: a low buzz, falling
    n = int(0.45 * SR)
    t = tt(n)
    f = 220 * 2 ** (-t / 0.45)
    return lowpass(signal.square(2 * np.pi * np.cumsum(f) / SR) * np.minimum(1, t / 0.01) * np.exp(-t * 4), 2500) * 0.3


def sfx_buzzer():
    # a line-up's buzzer: a hard square wave at 120 Hz, a little detuned against itself
    n = int(0.55 * SR)
    t = tt(n)
    x = np.sign(np.sin(2 * np.pi * 120 * t)) + 0.6 * np.sign(np.sin(2 * np.pi * 121.5 * t))
    return lowpass(x, 2400) * env(n, 0.005, 0.05, hold=0.45) * 0.5


def sfx_boing():
    # a spring: a low tone shooting up, then wobbling as it settles
    n = int(0.42 * SR)
    t = tt(n)
    f = 180 + 420 * (1 - np.exp(-t * 30)) + 60 * np.sin(2 * np.pi * 14 * t) * np.exp(-t * 7)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6) * 0.8


def sfx_wah():
    # a sad trombone: four notes falling, the last one long and wobbling
    out = np.zeros(int(1.9 * SR))
    for i, (m, a, ln) in enumerate(((58, 0.0, 0.3), (57, 0.32, 0.3), (56, 0.64, 0.3), (55, 0.96, 0.9))):
        n = int(ln * SR)
        t = tt(n)
        f = midi(m) * (1 + (0.02 * np.sin(2 * np.pi * 6 * t) if i == 3 else 0))
        x = 2 * ((np.cumsum(f) / SR) % 1) - 1
        # the mute opening and closing: a dark copy and a bright one, crossfaded
        mod = np.sin(np.pi * np.clip(t / ln, 0, 1))
        dark, bright = lowpass(x, 600), lowpass(x, 2200)
        y = dark + (bright - dark) * mod
        s0 = int(a * SR)
        out[s0:s0 + n] += y * env(n, 0.03, 0.12, hold=ln - 0.15)
    return out * 0.6


def sfx_flash():
    # a camera: the shutter's two clicks and the flash's whine
    n = int(0.5 * SR)
    t = tt(n)
    x = np.zeros(n)
    for a in (0.0, 0.035):
        s0 = int(a * SR)
        x[s0:s0 + int(0.01 * SR)] += highpass(rng.standard_normal(int(0.01 * SR)), 2000) * 0.8
    x += np.sin(2 * np.pi * (2400 + 4000 * t) * t) * np.exp(-t * 7) * 0.07
    return x


def sfx_ring():
    # a boxing ring's bell, struck twice
    out = np.zeros(int(1.4 * SR))
    for a in (0.0, 0.32):
        n = int(1.0 * SR)
        t = tt(n)
        x = sum(np.sin(2 * np.pi * 760 * r * t) * np.exp(-t * d) * g for r, d, g in ((1, 2.5, 1), (2.76, 4, 0.5), (5.4, 7, 0.25)))
        s0 = int(a * SR)
        out[s0:s0 + n] += x * 0.45
    return out


def sfx_punch():
    n = int(0.28 * SR)
    t = tt(n)
    x = np.sin(2 * np.pi * np.cumsum(90 + 120 * np.exp(-t * 40)) / SR) * np.exp(-t * 14)
    x += lowpass(rng.standard_normal(n), 1800) * np.exp(-t * 45) * 0.6
    return x * 0.9


def sfx_drumroll():
    # a snare roll that swells, then the hit
    out = np.zeros(int(1.8 * SR))
    for i in range(48):
        a = i / 32
        g = 0.15 + 0.6 * (i / 48) ** 1.5
        s0 = int(a * SR)
        x = snare(g)
        out[s0:s0 + len(x)] += x[:len(out) - s0]
    s0 = int(1.5 * SR)
    hit = snare(1.0) + kick(0.8)[:len(snare(1.0))]
    out[s0:s0 + len(hit)] += hit[:len(out) - s0]
    return out * 0.55


def sfx_applause():
    # a room clapping, swelling and dying away: hundreds of short claps at random
    n = int(2.4 * SR)
    out = np.zeros(n)
    for _ in range(420):
        a = int(rng.uniform(0, 2.1) * SR)
        c = bandpass(rng.standard_normal(int(0.02 * SR)), 900, 5000) * env(int(0.02 * SR), 0.001, 0.015)
        out[a:a + len(c)] += c * rng.uniform(0.3, 1.0)
    t = tt(n)
    return out * np.sin(np.pi * np.clip(t / 2.3, 0, 1)) ** 0.6 * 0.35


SFX = {'tick': sfx_tick, 'pop': sfx_pop, 'slam': sfx_slam, 'whoosh': sfx_whoosh, 'rise': sfx_rise, 'click': sfx_click,
       'chime': sfx_chime, 'ding': sfx_ding, 'gps': sfx_gps, 'blip': sfx_blip, 'level': sfx_level, 'error': sfx_error,
       'buzzer': sfx_buzzer, 'boing': sfx_boing, 'wah': sfx_wah, 'flash': sfx_flash, 'ring': sfx_ring, 'punch': sfx_punch,
       'drumroll': sfx_drumroll, 'applause': sfx_applause}
GAIN = {'tick': 0.35, 'pop': 0.45, 'slam': 0.8, 'whoosh': 0.5, 'rise': 0.55, 'click': 0.6,
        'chime': 1.0, 'ding': 0.55, 'gps': 0.8, 'blip': 0.5, 'level': 0.6, 'error': 0.55,
        'buzzer': 0.35, 'boing': 0.45, 'wah': 0.6, 'flash': 0.6, 'ring': 0.6, 'punch': 0.7, 'drumroll': 0.6, 'applause': 0.7}
cues = json.load(open(args.cues)) if args.cues else []
for c in cues:
    if c['sfx'] in SFX and 0 <= c['t'] < args.dur:
        put(sfx, c['t'], SFX[c['sfx']]() * GAIN[c['sfx']], pan=rng.uniform(-0.2, 0.2), rv=0.25 if c['sfx'] in ('slam', 'whoosh') else 0.1)

if args.amb == 'cabin':
    # an airliner cabin: the engines' low roar and the air through the vents
    amb = lowpass(rng.standard_normal(N), 160) + bandpass(rng.standard_normal(N), 500, 3000) * 0.15
    amb = amb / (np.sqrt(np.mean(amb ** 2)) or 1) * 0.006
    sfx[0] += amb
    sfx[1] += np.roll(amb, 911)

# ----------------------------------------------------------------------- reverb
ir_n = int(1.8 * SR)
ir = rng.standard_normal((2, ir_n)) * np.exp(-tt(ir_n) * 3.2)
ir = np.vstack([lowpass(ir[0], 5000), lowpass(ir[1], 5000)])
wet = np.vstack([signal.fftconvolve(send[0], ir[0])[:N], signal.fftconvolve(send[1], ir[1])[:N]]) * 0.06

# fade the music out at the end, and drop it out where the cues say (effects keep their tails)
fade = np.ones(N)
f = int(args.fadeout * SR)
fade[-f:] = np.linspace(1, 0, f) ** 1.5
edge = int(0.02 * SR)
for c in cues:
    if c['sfx'] == 'mute':
        a, b = int(c['t'] * SR), min(N, int(c['until'] * SR))
        gate = np.ones(N)
        gate[max(0, a - edge):a] = np.linspace(1, 0, a - max(0, a - edge))
        gate[a:b] = 0
        gate[b:min(N, b + edge)] = np.linspace(0, 1, min(N, b + edge) - b)
        fade *= gate
bed = (music + wet) * fade + sfx

mix = bed * {'drive': 0.55, 'pulse': 0.42, 'lofi': 0.5, 'lounge': 0.5, 'trap': 0.55, 'noir': 0.5, 'bounce': 0.5,
             'news': 0.5, 'fight': 0.55, 'gameshow': 0.5}.get(style, 0.35)
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

if style in ('lofi', 'lounge', 'trap', 'noir', 'bounce', 'news', 'fight', 'gameshow'):
    # the newer styles are sparser, so one bright effect can set the peak and the loudness pass then
    # pushes it over: a peak limiter holds anything above 3.5 times the mix's RMS (1 ms look-ahead,
    # 120 ms release)
    from scipy.ndimage import maximum_filter1d
    ceiling = 3.5 * np.sqrt(np.mean(mix ** 2))
    need = maximum_filter1d(np.maximum(1, np.abs(mix).max(axis=0) / ceiling), size=2 * int(0.001 * SR) + 1)
    gain, cur, rel = np.empty(N), 1.0, np.exp(-1 / (0.12 * SR))
    for i in range(N):
        cur = min(1 / need[i], cur * rel + (1 - rel))
        gain[i] = cur
    mix = mix * gain
    # and a 30 ms fade in: a full mix from the very first sample makes AAC overshoot
    f0 = int(0.03 * SR)
    mix[:, :f0] *= np.linspace(0, 1, f0)
    bed[:, :f0] *= np.linspace(0, 1, f0)
    sfx[:, :f0] *= np.linspace(0, 1, f0)
mix = np.tanh(mix * 1.2) / np.tanh(1.2)
mix = mix / (np.abs(mix).max() or 1) * 0.95
wavfile.write(args.out, SR, (mix.T * 32767).astype(np.int16))
if args.bed:
    b2 = np.tanh(bed * 0.9)
    peak = np.abs(b2).max() or 1
    wavfile.write(args.bed, SR, ((b2 / peak * 0.95).T * 32767).astype(np.int16))
    if args.sfx:
        # the effects as loud as they are in the bed, so they sit the same under another sound
        wavfile.write(args.sfx, SR, ((np.tanh(sfx * 0.9) / peak * 0.95).T * 32767).astype(np.int16))
print(f'{args.out}: {args.dur:.2f}s, {style}, {args.bpm:.0f} bpm')
