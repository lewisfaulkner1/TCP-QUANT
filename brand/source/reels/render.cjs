// Makes a reel: node render.cjs <reel> <workdir> [--stills=0.5,3.2] [--workers=4] [--safe] [--reuse] [--variant=name]
// (--reuse keeps the frames already drawn, to redo only the sound and the videos; --variant makes one of
// the spec's variants, such as an episode's personal-account cut, as tcp-<reel>-<variant>-*)
//   1. the voice (voice.py, Kokoro) and its word timings, if the reel has a voice
//   2. every frame, drawn by reel.js in Chromium and saved as a JPEG
//   3. the sound: music.py's bed and effects on the reel's cues, under the voice
//   4. the videos, with ffmpeg: <reel>-voice.mp4 (voice, music, effects) for reels with a voice,
//      <reel>-music.mp4 (music and effects) for reels without, <reel>-sound.mp4 (no sound: add a
//      trending one in the app; `sound: false` in the spec skips it), <reel>-sfx.mp4 (the effects only,
//      to keep under a trending sound; `sfx: true` in the spec makes it), and a cover
// Footage of the app comes from capture.cjs, in <workdir>/shots.
// Playwright from this folder's node_modules, or the copy installed globally in the cloud container.
const { chromium } = (() => { try { return require('playwright'); } catch { return require('/opt/node22/lib/node_modules/playwright'); } })();
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const REPO = path.resolve(HERE, '../../..');
const NAME = process.argv[2];
const WORK = path.resolve(process.argv[3]);
const args = Object.fromEntries(process.argv.slice(4).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
const FPS = 30;
// ffmpeg: $FFMPEG, or the build that ships with imageio-ffmpeg in the cloud container, or the one on the PATH.
const FFMPEG = process.env.FFMPEG || ['/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2'].find((f) => fs.existsSync(f)) || 'ffmpeg';
// Python: $PY_VOICE, or the virtual environment in the workdir (Linux and macOS, or Windows).
const PY_VOICE = process.env.PY_VOICE || [path.join(WORK, 'venv/bin/python'), path.join(WORK, 'venv/Scripts/python.exe')].find((f) => fs.existsSync(f)) || 'python3';
const VARIANT = typeof args.variant === 'string' ? args.variant : null;
const TAG = VARIANT ? `${NAME}-${VARIANT}` : NAME;
const OUT = path.join(REPO, 'brand/video/reels');
const DIR = path.join(WORK, 'reels', TAG);
// A variant's settings go over the spec's, and its scenes and voice lines patch the spec's by id
// (null drops one). The page gets the same function, so both sides see the same spec.
function variantOf(spec, name) {
  const v = spec.variants && spec.variants[name];
  if (!v) throw new Error(`no variant ${name}`);
  const patch = (list, by) => (list && by ? list.filter((x) => by[x.id] !== null).map((x) => (x.id && by[x.id] ? { ...x, ...by[x.id] } : x)) : list);
  return { ...spec, ...v, scenes: patch(spec.scenes, v.scenes), voice: patch(spec.voice, v.voice) };
}
const SPEC = VARIANT ? variantOf(require(path.join(HERE, 'specs', `${NAME}.js`)), VARIANT) : require(path.join(HERE, 'specs', `${NAME}.js`));
fs.mkdirSync(DIR, { recursive: true });
const log = (m) => console.log(`[${TAG}] ${m}`);

// ------------------------------------------------------------------ voice
let VOICE = null;
if (SPEC.voice) {
  fs.writeFileSync(path.join(DIR, 'lines.json'), JSON.stringify(SPEC.voice));
  execFileSync(PY_VOICE, [path.join(HERE, 'voice.py'), path.join(DIR, 'lines.json'), path.join(DIR, 'voice.wav'), path.join(DIR, 'voice.json'),
    '--voice', SPEC.voiceName || 'bf_emma', '--speed', String(SPEC.speed || 1.0)], { stdio: 'inherit', env: { ...process.env, KOKORO_DIR: path.join(WORK, 'kokoro') } });
  VOICE = JSON.parse(fs.readFileSync(path.join(DIR, 'voice.json'), 'utf8'));
}
const DURATION = typeof SPEC.duration === 'function' ? SPEC.duration(VOICE) : SPEC.duration || (VOICE.duration + (SPEC.tail || 3));
const FRAMES = Math.round(DURATION * FPS);
log(`${DURATION.toFixed(2)}s, ${FRAMES} frames`);

// ------------------------------------------------------------------ footage
const SHOTS = {};
const shotDir = path.join(WORK, 'shots');
if (fs.existsSync(shotDir)) {
  for (const name of fs.readdirSync(shotDir)) {
    const f = path.join(shotDir, name, 'shot.json');
    if (!fs.existsSync(f)) continue;
    const meta = JSON.parse(fs.readFileSync(f, 'utf8'));
    SHOTS[name] = { frames: meta.frames.map((x) => `shots/${name}/${x.file}`), box: meta.box };
  }
}
const svg = fs.readFileSync(path.join(REPO, 'brand/logo/official/tcp-crown.svg'), 'utf8');
const CROWN = {
  path: svg.match(/<path[^>]* d="([^"]+)"/)[1],
  circles: [...svg.matchAll(/<circle cx="([-\d.]+)" cy="([-\d.]+)" r="([-\d.]+)"/g)].map((m) => m.slice(1).map(Number)),
};

const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  page.on('console', (m) => m.type() === 'error' && console.error('console', m.text()));
  await page.route('http://reel.local/**', (r) => {
    const rel = decodeURIComponent(new URL(r.request().url()).pathname.slice(1));
    let file;
    if (rel.startsWith('fonts/')) file = path.join(REPO, 'terminal/src/fonts', rel.slice(6));
    else if (rel.startsWith('shots/')) file = path.join(WORK, rel);
    else if (rel === 'spec.js') file = path.join(HERE, 'specs', `${NAME}.js`);
    else file = path.join(HERE, rel);
    if (!fs.existsSync(file)) return r.fulfill({ status: 404, body: 'missing ' + rel });
    let body = fs.readFileSync(file);
    // (the spec's own `const SPEC` is what reel.js reads, so the variant patches that object in place)
    if (rel === 'spec.js' && VARIANT) body = `${body}\nObject.assign(window.SPEC, (${variantOf})(window.SPEC, ${JSON.stringify(VARIANT)}));\n`;
    return r.fulfill({ status: 200, contentType: TYPES[path.extname(file)] || 'application/octet-stream', body });
  });
  await page.addInitScript(({ SHOTS, CROWN, VOICE, SAFE }) => {
    window.SHOTS = SHOTS; window.CROWN = CROWN; window.VOICE = VOICE; window.SHOW_SAFE = SAFE; window.module = undefined;
  }, { SHOTS, CROWN, VOICE, SAFE: !!args.safe });
  await page.goto('http://reel.local/reel.html');
  // the spec runs in the page too (it sets window.SPEC), before reel.js sets up
  await page.waitForFunction(() => window.reelReady);
  await page.evaluate(() => window.reelReady);
  return page;
}
async function frame(page, t) {
  await page.evaluate(async (t) => {
    await window.renderFrame(t);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, t);
  return page.screenshot({ type: 'jpeg', quality: 94 });
}
function ffmpeg(list) {
  execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...list], { stdio: 'inherit' });
}

(async () => {
  const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--force-color-profile=srgb'] });
  if (args.stills) {
    const page = await openPage(browser);
    fs.mkdirSync(path.join(DIR, 'stills'), { recursive: true });
    for (const s of String(args.stills).split(',').map(Number)) fs.writeFileSync(path.join(DIR, 'stills', `t-${s.toFixed(2)}.jpg`), await frame(page, s));
    await browser.close();
    log('stills done');
    return;
  }
  const frameDir = path.join(DIR, 'frames');
  const workers = Number(args.workers || 4);
  const started = Date.now();
  let cues = [];
  const have = fs.existsSync(frameDir) ? fs.readdirSync(frameDir).length : 0;
  if (args.reuse && have === FRAMES && fs.existsSync(path.join(DIR, 'cues.json'))) {
    cues = JSON.parse(fs.readFileSync(path.join(DIR, 'cues.json'), 'utf8'));
    log('reusing the frames');
  } else {
    fs.rmSync(frameDir, { recursive: true, force: true });
    fs.mkdirSync(frameDir, { recursive: true });
    const chunk = Math.ceil(FRAMES / workers);
    await Promise.all(Array.from({ length: workers }, async (_, w) => {
      const page = await openPage(browser);
      if (w === 0) cues = await page.evaluate(() => window.reelCues());
      for (let f = w * chunk; f < Math.min(FRAMES, (w + 1) * chunk); f++) {
        fs.writeFileSync(path.join(frameDir, `${String(f).padStart(5, '0')}.jpg`), await frame(page, f / FPS));
      }
      await page.close();
    }));
  }
  await browser.close();
  log(`frames in ${((Date.now() - started) / 1000).toFixed(0)}s, ${cues.length} sound cues`);

  // ---------------------------------------------------------------- sound
  fs.writeFileSync(path.join(DIR, 'cues.json'), JSON.stringify(cues));
  const music = [process.env.PY_MUSIC || 'python3', path.join(HERE, 'music.py'), '--dur', DURATION.toFixed(3), '--cues', path.join(DIR, 'cues.json'),
    '--style', SPEC.style || (VOICE ? 'pulse' : 'drive'), '--bpm', String(SPEC.bpm || 120), '--seed', String(SPEC.seed || 1),
    '--out', path.join(DIR, 'mix.wav'), '--bed', path.join(DIR, 'bed.wav'), '--sfx', path.join(DIR, 'sfx.wav')];
  if (VOICE) music.push('--voice', path.join(DIR, 'voice.wav'));
  if (SPEC.ambience) music.push('--amb', SPEC.ambience);
  execFileSync(music[0], music.slice(1), { stdio: 'inherit' });

  // ---------------------------------------------------------------- videos
  fs.mkdirSync(OUT, { recursive: true });
  const video = ['-framerate', String(FPS), '-i', path.join(frameDir, '%05d.jpg')];
  // capped at 8 Mbps so a bright, grainy reel still comes in under 30 MB (TikTok and Instagram recompress anyway)
  const enc = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-maxrate', '8M', '-bufsize', '16M', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', '-r', String(FPS)];
  const loud = ['-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000'];
  const made = [];
  if (VOICE) {
    ffmpeg([...video, '-i', path.join(DIR, 'mix.wav'), ...enc, ...loud, '-shortest', path.join(OUT, `tcp-${TAG}-voice.mp4`)]);
    made.push(`tcp-${TAG}-voice.mp4`);
  }
  if (SPEC.music ?? !VOICE) {
    ffmpeg([...video, '-i', path.join(DIR, 'bed.wav'), ...enc, ...loud, '-shortest', path.join(OUT, `tcp-${TAG}-music.mp4`)]);
    made.push(`tcp-${TAG}-music.mp4`);
  }
  if (SPEC.sfx) {
    // the effects at the level they have in the mix, not loudness-matched: they sit under the app's sound
    ffmpeg([...video, '-i', path.join(DIR, 'sfx.wav'), ...enc, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', path.join(OUT, `tcp-${TAG}-sfx.mp4`)]);
    made.push(`tcp-${TAG}-sfx.mp4`);
  }
  if (SPEC.sound ?? true) {
    ffmpeg([...video, '-f', 'lavfi', '-i', `anullsrc=channel_layout=stereo:sample_rate=48000`, ...enc, '-c:a', 'aac', '-b:a', '64k', '-t', DURATION.toFixed(3), path.join(OUT, `tcp-${TAG}-sound.mp4`)]);
    made.push(`tcp-${TAG}-sound.mp4`);
  }
  const coverFrame = Math.min(FRAMES - 1, Math.round((SPEC.cover ?? 0.8) * FPS));
  fs.copyFileSync(path.join(frameDir, `${String(coverFrame).padStart(5, '0')}.jpg`), path.join(OUT, `tcp-${TAG}-cover.jpg`));
  made.push(`tcp-${TAG}-cover.jpg`);
  log(`made ${made.join(', ')} in ${((Date.now() - started) / 1000).toFixed(0)}s`);
})().catch((e) => { console.error(e); process.exit(1); });
