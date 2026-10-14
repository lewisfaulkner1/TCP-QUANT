"""The launch film's score, synthesised from scratch (no samples, nothing licensed): D minor,
150 BPM (a bar is 1.6 s, so every 3.2 s scene is two bars), hits placed on the film's cuts.
usage: python3 score.py out.wav
"""
import sys
import numpy as np
from scipy import signal

SR = 48000
DUR = 45.0
N = int(SR * DUR)
rng = np.random.default_rng(20260927)

dry = np.zeros((2, N))
rev = np.zeros((2, N))   # reverb send
dly = np.zeros((2, N))   # ping-pong delay send


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(n):
    return np.arange(n) / SR


def pan2(sig, pan):
    # equal-power pan, -1 left .. 1 right
    a = (pan + 1) * np.pi / 4
    return np.vstack([sig * np.cos(a), sig * np.sin(a)])


def add(start, sig, gain=1.0, pan=0.0, rv=0.0, dl=0.0):
    if sig.ndim == 1:
        sig = pan2(sig, pan)
    i = int(round(start * SR))
    if i >= N:
        return
    if i < 0:
        sig = sig[:, -i:]
        i = 0
    j = min(N, i + sig.shape[1])
    part = sig[:, : j - i] * gain
    dry[:, i:j] += part
    if rv:
        rev[:, i:j] += part * rv
    if dl:
        dly[:, i:j] += part * dl


def env_adsr(n, a=0.01, d=0.1, s=0.7, r=0.3, hold=None):
    t = tt(n)
    total = n / SR
    hold = total - r if hold is None else hold
    e = np.where(t < a, t / max(a, 1e-6), 1.0)
    e = np.where((t >= a) & (t < a + d), 1 - (1 - s) * (t - a) / max(d, 1e-6), e)
    e = np.where((t >= a + d) & (t < hold), s, e)
    rel = np.clip(1 - (t - hold) / max(r, 1e-6), 0, 1)
    e = np.where(t >= hold, s * rel, e)
    return e


def lp(x, fc, order=2):
    sos = signal.butter(order, min(fc, SR * 0.45), 'low', fs=SR, output='sos')
    return signal.sosfilt(sos, x, axis=-1)


def hp(x, fc, order=2):
    sos = signal.butter(order, fc, 'high', fs=SR, output='sos')
    return signal.sosfilt(sos, x, axis=-1)


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, min(hi, SR * 0.45)], 'band', fs=SR, output='sos')
    return signal.sosfilt(sos, x, axis=-1)


def sweep_lp(x, f_from, f_to, curve=1.0, block=256):
    """low-pass whose cutoff moves (exponentially) from f_from to f_to across x"""
    out = np.zeros_like(x)
    zi = None
    n = x.shape[-1]
    for b in range(0, n, block):
        k = (b / max(1, n - 1)) ** curve
        fc = f_from * (f_to / f_from) ** k
        sos = signal.butter(2, min(fc, SR * 0.45), 'low', fs=SR, output='sos')
        if zi is None:
            zi = np.zeros((sos.shape[0], 2)) if x.ndim == 1 else np.zeros((sos.shape[0], x.shape[0], 2))
        seg_ = x[..., b: b + block]
        if x.ndim == 1:
            y, zi = signal.sosfilt(sos, seg_, zi=zi)
        else:
            y, zi = signal.sosfilt(sos, seg_, axis=-1, zi=zi)
        out[..., b: b + block] = y
    return out


def saw(freq, n, harmonics=28, phase=0.0):
    t = tt(n)
    out = np.zeros(n)
    for h in range(1, harmonics + 1):
        if freq * h > SR * 0.42:
            break
        out += ((-1) ** (h + 1)) * np.sin(2 * np.pi * freq * h * t + phase * h) / h
    return out * (2 / np.pi)


def noise(n):
    return rng.standard_normal(n)


# ---------------------------------------------------------------- instruments
def pad(notes, dur, gain=0.16, cutoff=1400, attack=0.8, release=1.2, width=0.6):
    n = int(dur * SR)
    L = np.zeros(n)
    R = np.zeros(n)
    for m in notes:
        f = midi(m)
        for det, side in ((-0.09, -1), (0.0, 0), (0.1, 1)):
            v = saw(f * 2 ** (det / 12), n, harmonics=22, phase=rng.random() * 6.28)
            p = side * width
            a = (p + 1) * np.pi / 4
            L += v * np.cos(a)
            R += v * np.sin(a)
    sig = np.vstack([L, R]) / (len(notes) * 3)
    sig = lp(sig, cutoff, 2)
    e = env_adsr(n, a=attack, d=0.3, s=0.85, r=release)
    return sig * e * gain


def sub(m, dur, gain=0.5, attack=0.02, release=0.2):
    n = int(dur * SR)
    t = tt(n)
    f = midi(m)
    s_ = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    s_ = np.tanh(s_ * 1.4) / np.tanh(1.4)
    return s_ * env_adsr(n, a=attack, d=0.05, s=1.0, r=release) * gain


def midbass(m, dur, gain=0.1):
    n = int(dur * SR)
    t = tt(n)
    x = saw(midi(m), n, harmonics=18)
    x = lp(x, 1100)
    return np.tanh(x * 1.8) * np.exp(-t * 5) * env_adsr(n, a=0.005, d=0.02, s=1, r=0.03) * gain


def kick(gain=1.0):
    n = int(0.55 * SR)
    t = tt(n)
    f = 42 + 120 * np.exp(-t * 32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 7.5)
    knock = np.sin(2 * np.pi * 150 * t) * np.exp(-t * 38) * 0.55
    click = hp(noise(n), 2500) * np.exp(-t * 320) * 0.5
    return np.tanh((body * 0.8 + knock + click) * 1.6) * gain


def snare(gain=1.0):
    n = int(0.45 * SR)
    t = tt(n)
    nz = bp(noise(n), 900, 7000) * np.exp(-t * 18)
    body = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 28) * 0.6
    clap = np.zeros(n)
    for k, off in enumerate((0.0, 0.011, 0.022)):
        i = int(off * SR)
        seg_ = bp(noise(n - i), 1100, 5200) * np.exp(-tt(n - i) * (60 if k < 2 else 16))
        clap[i:] += seg_ * 0.55
    return (nz * 0.7 + body + clap) * gain


def hat(open_=False, gain=1.0):
    n = int((0.35 if open_ else 0.06) * SR)
    t = tt(n)
    x = hp(noise(n), 7500, 3) * np.exp(-t * (11 if open_ else 70))
    return x * gain


def pluck(m, dur=0.45, gain=0.3, bright=4000):
    n = int(dur * SR)
    t = tt(n)
    f = midi(m)
    x = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(4 * np.pi * f * t) * np.exp(-t * 18) + 0.2 * saw(f, n, 8)
    x = lp(x, bright)
    return x * np.exp(-t * 9) * gain


def ping(m, dur=2.8, gain=0.35):
    # a bell: two-operator FM with a falling index
    n = int(dur * SR)
    t = tt(n)
    f = midi(m)
    idx = 2.4 * np.exp(-t * 3.2)
    x = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * 3.5 * t))
    x += 0.35 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 4)
    return x * np.exp(-t * 2.2) * env_adsr(n, a=0.002, d=0.01, s=1, r=0.05) * gain


def tick(freq=2600, gain=0.12):
    n = int(0.03 * SR)
    t = tt(n)
    return np.sin(2 * np.pi * freq * t) * np.exp(-t * 180) * gain


def boom(gain=1.0, dur=3.2):
    n = int(dur * SR)
    t = tt(n)
    f = 28 + 52 * np.exp(-t * 3.5)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 1.5)
    crack = lp(noise(n), 1400) * np.exp(-t * 9) * 0.8
    air = hp(noise(n), 3500) * np.exp(-t * 14) * 0.25
    return np.tanh((body * 1.2 + crack + air) * 1.3) * gain


def braam(notes=(26, 33, 38, 41), dur=4.0, gain=0.5):
    n = int(dur * SR)
    L = np.zeros(n)
    R = np.zeros(n)
    for m in notes:
        for det, side in ((-0.14, -0.7), (0.13, 0.7)):
            v = saw(midi(m) * 2 ** (det / 12), n, harmonics=40)
            a = (side + 1) * np.pi / 4
            L += v * np.cos(a)
            R += v * np.sin(a)
    x = np.vstack([L, R]) / (len(notes) * 2)
    # the "brass" opening: cutoff up fast, then closing slowly
    half = int(0.35 * SR)
    up = sweep_lp(x[:, :half], 180, 1600, curve=0.6)
    down = sweep_lp(x[:, half:], 1600, 260, curve=0.5)
    x = np.concatenate([up, down], axis=1)
    x = np.tanh(x * 2.2) / np.tanh(2.2)
    return x * env_adsr(n, a=0.04, d=0.5, s=0.7, r=1.6) * gain


def riser(dur, gain=0.4, f_from=250, f_to=9000):
    n = int(dur * SR)
    t = tt(n)
    x = noise(n)
    out = np.zeros(n)
    block = 512
    for b in range(0, n, block):
        k = b / n
        fc = f_from * (f_to / f_from) ** k
        seg_ = bp(x[b: b + block + 64], max(60, fc * 0.6), fc * 1.4, 1)
        out[b: b + block] = seg_[: len(out[b: b + block])]
    tone_f = 110 * 2 ** (3 * t / dur)
    tone = np.sin(2 * np.pi * np.cumsum(tone_f) / SR) * 0.25
    e = (t / dur) ** 2.2
    return (out + tone) * e * gain


def whoosh(dur=0.9, gain=0.45, up=True):
    n = int(dur * SR)
    t = tt(n)
    x = noise(n)
    out = np.zeros(n)
    block = 256
    for b in range(0, n, block):
        k = b / n
        c = 400 * (6000 / 400) ** (k if up else 1 - k)
        seg_ = bp(x[b: b + block + 32], c * 0.5, c * 1.6, 1)
        out[b: b + block] = seg_[: len(out[b: b + block])]
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    L = out * e * np.linspace(1, 0.3, n)
    R = out * e * np.linspace(0.3, 1, n)
    return np.vstack([L, R]) * gain


# --------------------------------------------------------------------- score
BAR = 1.6
CHORDS = {  # voicings (pad) and roots (bass)
    'Dm': ([50, 53, 57, 60, 64], 26),
    'Bb': ([46, 50, 53, 57, 60], 22),
    'F': ([41, 45, 48, 52, 55], 29),
    'C': ([48, 52, 55, 62, 64], 24),
}
ARP = {'Dm': [62, 65, 69, 72, 74, 72, 69, 65], 'Bb': [58, 62, 65, 69, 70, 69, 65, 62],
       'F': [60, 65, 69, 72, 76, 72, 69, 65], 'C': [60, 64, 67, 72, 74, 72, 67, 64]}

# ---- cold open (0 - 3.6): a point of light, paths spreading, the crown forming
add(0.0, pad(CHORDS['Dm'][0][:3], 4.2, gain=0.22, cutoff=900, attack=2.2, release=0.8), rv=0.5)
add(0.0, sub(26, 3.6, gain=0.18, attack=1.5, release=0.3))
add(0.45, ping(86, gain=0.22), pan=0.1, rv=0.6, dl=0.35)
for k in range(24):
    at = 0.75 + k * 0.1
    m = ARP['Dm'][k % 8] + 12
    add(at, pluck(m, gain=0.08 + 0.16 * k / 24, bright=7000), pan=np.sin(k * 1.7) * 0.6, rv=0.35, dl=0.3)
add(2.2, riser(1.4, gain=0.34), rv=0.3)
add(3.35, whoosh(0.3, gain=0.2, up=True), rv=0.2)

# ---- the crown lands (3.6): the big hit
add(3.6, boom(gain=0.95), rv=0.35)
add(3.6, braam(gain=0.42), rv=0.45)
add(3.6, pad(CHORDS['Dm'][0], 3.0, gain=0.28, cutoff=3200, attack=0.3, release=0.6), rv=0.4)
add(3.62, ping(74, gain=0.18), rv=0.7, dl=0.4)
for k, at in enumerate(np.arange(5.6, 6.4, 0.1)):
    add(at, hat(gain=0.05 + 0.02 * k), pan=0.3)
add(5.6, riser(0.8, gain=0.22, f_from=500), rv=0.2)

# ---- the groove (6.4 - 19.2 and 25.6 - 35.2), with a breakdown under the swarm
sections = [
    (6.4, 'Dm'), (9.6, 'Bb'), (12.8, 'F'), (16.0, 'C'),
    (19.2, 'Dm'), (22.4, 'Bb'),
    (25.6, 'F'), (28.8, 'C'), (32.0, 'Dm'), (35.2, 'Bb'),
]
KICK = [0, 7, 10]
for start, name in sections:
    voicing, root = CHORDS[name]
    breakdown = 19.2 <= start < 22.4
    building = start >= 35.2
    length = 2.4 if building else 3.2
    add(start, pad(voicing, length + 0.8, gain=0.26 if not breakdown else 0.3, cutoff=2800 if not breakdown else 3600, attack=0.25, release=0.8), rv=0.35)
    # strings an octave up: the chord in the range phone speakers carry
    add(start, pad([m + 12 for m in voicing[1:]], length + 0.8, gain=0.13 if not breakdown else 0.18, cutoff=4200, attack=0.35, release=0.9, width=0.9), rv=0.45)
    for b in range(int(np.ceil(length / BAR - 1e-9))):
        bs = start + b * BAR
        # bass: pumps against the kick
        for s16 in range(16):
            at = bs + s16 * 0.1
            if at >= start + length - 1e-6:
                break
            if s16 % 2 == 0:
                add(at, sub(root + 12, 0.19, gain=0.14 if breakdown else 0.18, attack=0.03, release=0.05))
                add(at, midbass(root + 24, 0.19, gain=0.07 if breakdown else 0.1), pan=-0.1)
        if not breakdown and not building:
            for s16 in KICK:
                add(bs + s16 * 0.1, kick(0.6))
            add(bs + 0.8, snare(0.62), pan=0.05, rv=0.25)
        for s16 in range(16):
            at = bs + s16 * 0.1
            if at >= start + length - 1e-6:
                break
            if s16 % 2 == 0 and not building:
                add(at, hat(gain=0.13 if s16 % 4 else 0.18), pan=0.25)
            if breakdown or s16 % 2 == 1:
                arp = ARP[name]
                add(at, pluck(arp[s16 % 8] + 12, dur=0.35, gain=0.12 if not breakdown else 0.17, bright=6500), pan=np.sin(at * 3.1) * 0.7, rv=0.3, dl=0.4)
    if not building:
        add(start - 0.35, whoosh(0.7, gain=0.16 if start not in (19.2,) else 0.4, up=start != 25.6), rv=0.25)

# the dive into the swarm: a deep swell, then the kick comes back for the second half
add(19.2, boom(gain=0.5, dur=2.0), rv=0.5)
add(20.8, riser(1.6, gain=0.2, f_from=300, f_to=5000), rv=0.3)
for b in range(2):
    bs = 22.4 + b * BAR
    for s16 in KICK:
        add(bs + s16 * 0.1, kick(0.8))
    add(bs + 0.8, snare(0.45), rv=0.3)

# price ticks while the live prices play
for k in range(22):
    at = 9.7 + k * 0.137 + (0.05 if k % 3 == 0 else 0)
    add(at, tick(2200 + (k * 373) % 1500, gain=0.07), pan=np.sin(k * 2.3) * 0.5, rv=0.1)

# ---- the build (35.2 - 37.6): a snare roll that speeds up
roll = []
t_ = 35.2
step = 0.2
while t_ < 37.55:
    roll.append(t_)
    t_ += step
    if t_ > 36.0:
        step = 0.1
    if t_ > 36.8:
        step = 0.05
for k, at in enumerate(roll):
    add(at, snare(0.18 + 0.4 * (at - 35.2) / 2.4), pan=np.sin(k) * 0.2, rv=0.2)
add(35.2, riser(2.4, gain=0.42), rv=0.3)
add(35.2, sub(22 + 12, 2.4, gain=0.2, attack=1.8))

# ---- the montage (37.6 - 39.2): a hit on every flash
for k in range(8):
    at = 37.6 + k * 0.2
    add(at, boom(gain=0.28 + 0.03 * k, dur=0.4), rv=0.2)
    add(at, snare(0.28), pan=(-1) ** k * 0.4)
    add(at, pluck([74, 77, 81, 84, 86, 84, 81, 77][k], dur=0.3, gain=0.12), pan=(-1) ** k * 0.5, dl=0.3)
add(38.4, riser(0.8, gain=0.3, f_from=800, f_to=12000), rv=0.3)

# ---- the end card (39.2 - 45): the final hit, then a held chord
add(39.2, boom(gain=1.0, dur=4.5), rv=0.45)
add(39.2, braam(notes=(26, 33, 38, 45), dur=4.6, gain=0.4), rv=0.5)
add(39.2, pad(CHORDS['Dm'][0] + [69], 5.8, gain=0.34, cutoff=3400, attack=0.4, release=2.2), rv=0.5)
add(39.2, sub(26, 5.6, gain=0.1, attack=0.8, release=1.5))
# a slow heartbeat under the call to action
for k in range(5):
    add(40.4 + k * 0.8, lp(kick(0.4), 900))
add(39.35, ping(81, dur=3.5, gain=0.2), rv=0.7, dl=0.45)
add(40.5, pluck(74, dur=0.8, gain=0.14), rv=0.5, dl=0.4)
add(40.62, pluck(81, dur=0.8, gain=0.11), rv=0.5, dl=0.4)
add(41.3, ping(86, dur=3.0, gain=0.1), pan=0.3, rv=0.7, dl=0.5)
for k in range(12):
    add(41.6 + k * 0.2, pluck(ARP['Dm'][k % 8] + 12, dur=0.3, gain=0.1), pan=np.sin(k) * 0.7, rv=0.4, dl=0.4)

# ------------------------------------------------------------------- effects
def reverb_ir(seconds=2.8, predelay=0.02):
    n = int(seconds * SR)
    t = tt(n)
    irs = []
    for _ in range(2):
        x = noise(n) * np.exp(-t * 3.0 / seconds * 2.3)
        x = lp(x, 6500)
        x[: int(predelay * SR)] = 0
        irs.append(x / np.sqrt(np.sum(x ** 2)))
    return irs


irL, irR = reverb_ir()
wet = np.vstack([signal.fftconvolve(rev[0], irL)[:N], signal.fftconvolve(rev[1], irR)[:N]])
wet = hp(wet, 180)

# ping-pong delay at a dotted eighth (0.3 s)
d = int(0.3 * SR)
echo = np.zeros((2, N))
fb = 0.42
src = dly.copy()
for k in range(1, 7):
    shift = d * k
    if shift >= N:
        break
    side = k % 2
    echo[side, shift:] += src[(side + k) % 2, : N - shift] * fb ** (k - 1) * 0.55
echo = lp(hp(echo, 400), 5000)

mix = dry + wet * 0.55 + echo * 0.5
mix = hp(mix, 32, 2)
low_part = lp(mix, 90, 2)
mix = mix - low_part * 0.45                         # about -5 dB below 90 Hz
presence = bp(mix, 1800, 5500, 1)
mix = mix + presence * 0.4                          # about +3 dB of presence

# glue: slow RMS compression, then a limiter that catches the big hits
rms = np.sqrt(signal.sosfilt(signal.butter(1, 8, fs=SR, output='sos'), (mix ** 2).mean(axis=0)) + 1e-9)
target = 0.18
g = np.minimum(1.0, (target / rms) ** 0.35)
mix = mix * g
from scipy.ndimage import maximum_filter1d
peak = maximum_filter1d(np.abs(mix).max(axis=0), size=int(0.006 * SR))       # 6 ms look-around
rel = signal.lfilter([1 - np.exp(-1 / (0.12 * SR))], [1, -np.exp(-1 / (0.12 * SR))], peak)
env = np.maximum(peak, rel)
thr = np.percentile(np.abs(mix), 99.2)
gr = np.minimum(1.0, thr / np.maximum(env, 1e-9))
gr = signal.sosfiltfilt(signal.butter(1, 60, fs=SR, output='sos'), gr)       # smooth the gain, no clicks
mix = mix * gr
mix = mix / np.max(np.abs(mix)) * 1.05
mix = np.tanh(mix * 1.2) / np.tanh(1.2)
# fade the very end, and never clip
fade = np.ones(N)
fs_ = int(0.8 * SR)
fade[-fs_:] = np.linspace(1, 0, fs_) ** 1.5
mix *= fade
mix = mix / np.max(np.abs(mix)) * 0.891  # -1 dBFS

out = (np.clip(mix.T, -1, 1) * 32767).astype(np.int16)
import wave
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(out.tobytes())
print('wrote', sys.argv[1], f'{N / SR:.1f}s')
