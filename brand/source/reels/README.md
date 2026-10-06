# Reel studio

Makes TCP's vertical videos for TikTok, Instagram and Telegram from a short script: an AI voiceover
with word-by-word subtitles, animated graphics, footage of the Quant Terminal, and original music and
sound effects. Everything is drawn from scratch, so there's nothing to license.

Each reel is one file in `specs/`. `node render.cjs <reel> <workdir>` turns it into
`brand/video/reels/`:

| File | What |
|---|---|
| `tcp-<reel>-voice.mp4` | Voiceover, subtitles, music and effects (reels with a voice) |
| `tcp-<reel>-music.mp4` | Music and effects (reels without a voice) |
| `tcp-<reel>-sound.mp4` | No sound: add a trending one in the app |
| `tcp-<reel>-cover.jpg` | The cover frame |

All are 1080 × 1920 at 30 fps, H.264 and AAC, loudness-matched to −14 LUFS (what TikTok and
Instagram play at). The captions and posting plan are in `brand/video/reels/POSTS.md`.

## How it works

| File | Does |
|---|---|
| `reel.html`, `reel.js` | The engine: draws any moment of a reel from its script, in Chromium. Background, headlines, stamps, tables, coin grids, compounding curves, lists, a phone playing app footage, the probability swarm, the end card, and the subtitles |
| `toon/` | The animated founder and his sets, for the episodes |
| `voice.py` | The voice: Kokoro through sherpa-onnx, offline. Speaks each line, trims it, and times every word for the subtitles |
| `music.py` | Original music, synthesised: `pulse` under a voice, `drive` without and `calm` for the welcome video (D minor); `lofi` (F major sevenths, electric piano, vinyl crackle), `lounge` (a bossa in B flat) and `trap` (half time in C sharp minor, 808s). The sound effects on the cues the frames report, including a cabin chime, a seatbelt ding, a sat nav's prompt and a game's blips, and `ambience: 'cabin'` for an airliner's roar. Ducks under the voice |
| `render.cjs` | Runs the lot: voice, frames (4 browsers at once), sound, and the videos with ffmpeg |
| `capture.cjs` | Records the terminal in demo mode, as a phone shows it, frame by frame, for the phone scenes |
| `hear.py` | Transcribes a voice track, to check the voice read the script |

## Setting up

In the cloud container (Node 22, Playwright and Chromium are already there; ffmpeg comes with
Python's `imageio-ffmpeg`):

```sh
W=/path/to/workdir                               # anywhere outside the repo
python3.12 -m venv $W/venv
$W/venv/bin/pip install -r requirements.txt
# The voice model: Kokoro v0.19, int8 (Apache 2.0, about 150 MB, not committed). It comes inside an
# npm package, because GitHub and Hugging Face are blocked in the container:
(cd $W && npm pack n8n-nodes-ttsbro && tar xzf n8n-nodes-ttsbro-*.tgz && mv package/kokoro-int8-en-v0_19 kokoro && rm -r package n8n-nodes-ttsbro-*.tgz)
# The terminal's chart library, for capture.cjs:
(mkdir -p $W/../lwc && cd $W/../lwc && npm install lightweight-charts@4.2.3)
```

Anywhere else, get the same model from sherpa-onnx's text-to-speech model releases (Kokoro English
v0.19), and
install Playwright (`npm install playwright`, then `npx playwright install chromium`) and ffmpeg. Set
`FFMPEG`, `PY_VOICE` or `PY_MUSIC` if they aren't where `render.cjs` looks.

## Making a reel

```sh
cd terminal && npm test && cd -                  # the terminal footage comes from dist/worker.js
node capture.cjs $W                              # once, and whenever the app changes (a few minutes)
node render.cjs win-rate $W --stills=1,8,15      # check the look: stills in $W/reels/win-rate/stills
node render.cjs win-rate $W                      # the whole reel, about 2 minutes for 30 seconds
$W/venv/bin/python hear.py $W/reels/win-rate/voice.wav
```

`--safe` draws TikTok's buttons and caption area over the stills. `--reuse` keeps the frames and
redoes only the sound and the videos.

## Writing a script

A spec is a list of voice lines and a list of scenes. Copy one close to what you want.

- `voice`: `{ id, say, show?, pause? }`. `say` is what's spoken (write numbers as words where it
  helps: "ten per cent"), `show` what the subtitles show ("10%"), `pause` the silence before it.
  A reel without a voice sets `duration` instead.
- `scenes`: `{ kind, from, to, ... }`. A time is seconds, or a voice line: `'c'` is when line c
  starts, `'c.end'` when it ends, and `'c+0.4'` adds seconds.
- Kinds: `kicker`, `head` (`l1`, `l2`; `*word*` in gold, `\n` breaks a line), `note`, `stamp`, `tiles`,
  `table`, `drain`, `curve`, `coins`, `list`, `vs`, `chain`, `phone`, `swarm`, `end`. The specs show
  each in use, and its code in `reel.js` reads every option it takes.
- Other settings: `tail` (seconds after the voice), `cover` (the cover's time), `seed`, `style` and
  `bpm` for the music, `subsY` (subtitle height), `voiceName` (`bf_emma` by default; `bf_isabella`,
  `bm_george` and `bm_lewis` are the other British voices), `speed`, `music` (make a `-music` file
  even with a voice), `sound: false` (no silent copy), `sfx: true` (a copy with the effects only, to
  keep under a trending sound), `bug: false` (no TCP badge in the corner) and `cues` (extra sound
  effects: `tick`, `pop`, `slam`, `whoosh`, `rise`, `click`, or `{ t, sfx: 'mute', until }` to drop
  the music out for a punchline).
- `variants`: other cuts of the same reel, made with `--variant=<name>` and named
  `tcp-<reel>-<name>-*`. A variant's settings go over the spec's, and its `scenes` and `voice` patch
  the spec's by `id` (`null` drops one). The animated episodes use one for the founder's own account.

## Animated episodes

`toon/` adds the founder as an animated character (see `brand/video/reels/EPISODES.md`). A spec
loads it with `modules: ['toon/founder.js', 'toon/toon.js']`:

- `toon/founder.js` draws him from parameters: view, head turn, lean, eyes, lids, brows, mouth, cap,
  shades and arms. Poses blend, so one drawing serves every shot.
- `toon/toon.js` adds the `toon` kind (a shot: a set, a camera that moves by keys, his pose track and
  the story chart's track, depth of field, and a shake when a stop is hit), `caption` (meme text, a
  numbered lesson `note`, or a line of `steps`) and `handPhone` (the phone scene, held in his hand).
  Sets: `desk`, `ots` (over the shoulder), `screen` and `mouse`.
- `node toon/sheet.cjs <out.png>` draws the character sheet, to check a change to him.

## Rules

- **Honest numbers.** Every figure in a reel is worked out, not guessed, and matches the caption.
  Demo prices or data in app footage are labelled on screen (`tag: 'DEMO DATA'`, or the default
  `DEMO PRICES`) and in the caption.
- **Education, not selling.** Reels end on "Follow for more". Joining happens through the link in bio
  and the bot, which shows the partner disclosure and risk warning.
- **Safe zones.** Keep text between y 130 and 1540, and clear of the right-hand buttons: check with
  `--safe`.
- **AI label.** The voice is AI: label voiceover reels as AI-generated when posting. The animated
  founder is drawn in code, not by an AI model.
- **One founder.** Don't redraw him per episode: change `toon/founder.js` only on purpose, and check
  the sheet.
