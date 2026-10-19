"""Checks a reel's voice: transcribes each WAV with PocketSphinx's bundled US English
model, so you can see the words are the script's. It's rough (it's a small model, and a British voice),
so look for missing or garbled lines, not exact words.

usage: python hear.py <workdir>/reels/win-rate/voice.wav [more.wav ...]
"""
import sys

import numpy as np
import soundfile as sf
from pocketsphinx import Decoder
from scipy.signal import resample_poly

decoder = Decoder(samprate=16000)


def hear(path):
    audio, rate = sf.read(path, dtype='float32')
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    if rate != 16000:
        audio = resample_poly(audio, 16000, rate)
    pcm = (np.clip(audio, -1, 1) * 32767).astype(np.int16).tobytes()
    decoder.start_utt()
    decoder.process_raw(pcm, full_utt=True)
    decoder.end_utt()
    return decoder.hyp().hypstr if decoder.hyp() else ''


if __name__ == '__main__':
    for path in sys.argv[1:]:
        print(f'{path}\n  {hear(path)}\n')
