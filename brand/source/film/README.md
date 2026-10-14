# Quant Terminal launch film · source

`brand/video/tcp-quant-terminal-launch-9x16.mp4` (and `-nomusic`) is made from the files here.
Nothing is filmed or licensed: the footage is the real terminal in demo mode, the motion graphics are
drawn frame by frame in a browser, and the music is synthesised.

| File | What it does |
|---|---|
| `capture2.cjs` | Opens the terminal (`?demo&gold=4286&btc=84460`) at 390 × 713, the size it gets inside Telegram on a phone, with its clock frozen. Steps the clock 1/30 s at a time, holds CSS animations to the same clock, and saves a 3× screenshot (1170 × 2139) per step: one folder of frames per shot. |
| `film.html`, `film.js` | The film at 1080 × 1920: `renderFrame(t)` draws any moment. The swarm-to-crown opening, the title, the phone (status bar and Telegram's Mini App header drawn over the footage), cards lifted out of the app, captions, the dive into the swarm, the montage and the end card. |
| `render.cjs` | Screenshots `renderFrame` at every frame (four browser pages in parallel), or single stills for review. |
| `score.py` | The music: D minor at 150 BPM, so each 3.2 s scene is two bars. Pads, bass, drums, plucks, risers and impacts from sine, saw and noise, with reverb, delay, EQ and a limiter. |

The phone shows the status bar as LIVE and the member as Lewis, and hides the "demo data" source
line; the end card says the interface is shown with demo prices.

To remake it (Node with Playwright and Chromium, Python with numpy and scipy, ffmpeg):

```
node capture2.cjs <workdir>                 # footage into <workdir>/film/shots
node render.cjs <workdir>                   # frames into <workdir>/film/frames
python3 score.py score.wav
ffmpeg -framerate 30 -i frames/%05d.jpg -i score.wav -c:v libx264 -preset slow -crf 17 \
  -pix_fmt yuv420p -c:a aac -b:a 256k -shortest -movflags +faststart launch.mp4
```

The scripts expect the scratch layout they were written in (fonts from `terminal/src/fonts`, the
crown from `brand/logo/official/tcp-crown.svg`, Lightweight Charts from a local npm install); adjust
the paths at the top of each file.
