"""TCP reels' voice: Kokoro (v0.19, Apache 2.0) through sherpa-onnx, offline.

usage: python voice.py lines.json voice.wav timing.json [--voice bf_emma] [--speed 1.0]

lines.json is a list of {id, say, show?, pause?}: `say` is what the voice reads (numbers written as
words where it matters), `show` what the subtitles show (defaults to `say`), and `pause` the silence
before the line in seconds. Each line is spoken on its own, trimmed of silence and placed in turn.
Word times come from the line's own pauses: phrases split at punctuation are matched to the longest
silences inside the line, then each phrase's words share its time by length.
"""
import json
import re
import sys
import os

import numpy as np
import soundfile as sf
import sherpa_onnx
from scipy.signal import resample_poly

MODEL = os.environ.get('KOKORO_DIR', os.path.join(os.path.dirname(__file__), 'kokoro'))
VOICES = {'af': 0, 'af_bella': 1, 'af_nicole': 2, 'af_sarah': 3, 'af_sky': 4, 'am_adam': 5, 'am_michael': 6,
          'bf_emma': 7, 'bf_isabella': 8, 'bm_george': 9, 'bm_lewis': 10}
SR = 48000


def engine():
    cfg = sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(
                model=f'{MODEL}/model.int8.onnx', voices=f'{MODEL}/voices.bin',
                tokens=f'{MODEL}/tokens.txt', data_dir=f'{MODEL}/espeak-ng-data'),
            num_threads=4, provider='cpu'),
        max_num_sentences=1)
    return sherpa_onnx.OfflineTts(cfg)


def envelope(a, sr, win=0.02):
    n = max(1, int(sr * win))
    pad = np.pad(a ** 2, (n // 2, n - n // 2 - 1), mode='edge')
    return np.sqrt(np.convolve(pad, np.ones(n) / n, mode='valid'))


def trim(a, sr, thresh=0.012):
    env = envelope(a, sr)
    on = np.where(env > thresh)[0]
    if not len(on):
        return a
    lo = max(0, on[0] - int(0.03 * sr))
    hi = min(len(a), on[-1] + int(0.06 * sr))
    return a[lo:hi]


def gaps(a, sr, thresh=0.012, min_len=0.07):
    """Silences inside the line: (start, end) in seconds, longest first."""
    env = envelope(a, sr) < thresh
    out, i = [], 0
    while i < len(env):
        if env[i]:
            j = i
            while j < len(env) and env[j]:
                j += 1
            if (j - i) / sr >= min_len and i > 0 and j < len(env):
                out.append((i / sr, j / sr))
            i = j
        else:
            i += 1
    return sorted(out, key=lambda g: g[0] - g[1])


def phrases(text):
    """Words grouped into phrases that end at punctuation."""
    words = text.split()
    groups, cur = [], []
    for w in words:
        cur.append(w)
        if re.search(r'[,.;:!?—]$', w):
            groups.append(cur)
            cur = []
    if cur:
        groups.append(cur)
    return groups


def weight(w):
    core = re.sub(r'[^\w£$%]', '', w)
    return max(2.0, len(core) + (4 if re.search(r'\d', core) else 0))


def time_words(show, a, sr, t0):
    groups = phrases(show)
    dur = len(a) / sr
    inner = gaps(a, sr)[: max(0, len(groups) - 1)]
    inner = sorted(inner)
    if len(inner) != len(groups) - 1:
        inner = []
        groups = [sum(groups, [])]
    bounds = [0.0] + [g for pair in inner for g in pair] + [dur]
    words = []
    for gi, group in enumerate(groups):
        s, e = bounds[2 * gi], bounds[2 * gi + 1]
        total = sum(weight(w) for w in group)
        acc = s
        for w in group:
            span = (e - s) * weight(w) / total
            words.append({'w': w, 's': round(t0 + acc, 3), 'e': round(t0 + acc + span, 3)})
            acc += span
    return words


def main():
    args = sys.argv[1:]
    src, wav_out, json_out = args[:3]
    voice = args[args.index('--voice') + 1] if '--voice' in args else 'bf_emma'
    speed = float(args[args.index('--speed') + 1]) if '--speed' in args else 1.0
    lead = float(args[args.index('--lead') + 1]) if '--lead' in args else 0.25
    lines = json.load(open(src))
    tts = engine()
    track, t, timing = [np.zeros(int(lead * SR))], lead, []
    for line in lines:
        pause = line.get('pause', 0.22)
        if timing:
            track.append(np.zeros(int(pause * SR)))
            t += pause
        audio = tts.generate(line['say'], sid=VOICES[line.get('voice', voice)], speed=line.get('speed', speed))
        a = np.array(audio.samples, dtype=np.float32)
        a = resample_poly(a, SR, audio.sample_rate).astype(np.float32)
        a = trim(a, SR)
        words = time_words(line.get('show', line['say']), a, SR, t)
        timing.append({'id': line['id'], 'start': round(t, 3), 'end': round(t + len(a) / SR, 3), 'words': words, 'subs': line.get('subs', True)})
        track.append(a)
        t += len(a) / SR
    voice_track = np.concatenate(track)
    peak = np.abs(voice_track).max() or 1
    voice_track = voice_track / peak * 0.89
    sf.write(wav_out, voice_track, SR, subtype='PCM_16')
    json.dump({'duration': round(t, 3), 'voice': voice, 'lines': timing}, open(json_out, 'w'), indent=1)
    print(f'{len(lines)} lines, {t:.2f}s of voice ({voice})')


if __name__ == '__main__':
    main()
