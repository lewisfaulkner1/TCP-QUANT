// Renders the launch film: node render.cjs <scratchpad> [--stills=3.2,10.5] [--from=0 --to=45] [--workers=4]
// Frames go to film/frames/NNNNN.jpg (1080 x 1920); stills to film/stills/t-<time>.jpg.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const SP = process.argv[2];
const DIR = path.join(SP, 'film');
const args = Object.fromEntries(process.argv.slice(3).map((a) => a.replace(/^--/, '').split('=')));
const FPS = 30;
const DURATION = 45;
const FONTS = '/home/user/TCP-QUANT/terminal/src/fonts';

// Each shot's frames at a steady 30 per second: the latest captured frame at each moment.
const SHOTS = {};
for (const name of fs.readdirSync(path.join(DIR, 'shots'))) {
  const meta = JSON.parse(fs.readFileSync(path.join(DIR, 'shots', name, 'shot.json'), 'utf8'));
  const t0 = meta.frames[0].t;
  const end = meta.frames[meta.frames.length - 1].t - t0 + 3; // hold the last frame a few seconds
  const frames = [];
  let j = 0;
  for (let k = 0; k <= end * FPS; k++) {
    const at = t0 + k / FPS;
    while (j + 1 < meta.frames.length && meta.frames[j + 1].t <= at) j++;
    frames.push(`shots/${name}/${meta.frames[j].file}`);
  }
  SHOTS[name] = { frames, box: meta.box };
}
const svg = fs.readFileSync('/home/user/TCP-QUANT/brand/logo/official/tcp-crown.svg', 'utf8');
const CROWN = {
  path: svg.match(/<path[^>]* d="([^"]+)"/)[1],
  circles: [...svg.matchAll(/<circle cx="([-\d.]+)" cy="([-\d.]+)" r="([-\d.]+)"/g)].map((m) => m.slice(1).map(Number)),
};

const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  page.on('console', (m) => m.type() === 'error' && console.error('console', m.text()));
  await page.route('http://film.local/**', (r) => {
    const rel = decodeURIComponent(new URL(r.request().url()).pathname.slice(1));
    const file = rel.startsWith('fonts/') ? path.join(FONTS, rel.slice(6)) : path.join(DIR, rel);
    if (!fs.existsSync(file)) return r.fulfill({ status: 404, body: 'missing ' + rel });
    return r.fulfill({ status: 200, contentType: TYPES[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
  });
  await page.addInitScript(({ SHOTS, CROWN }) => { window.SHOTS = SHOTS; window.CROWN = CROWN; }, { SHOTS, CROWN });
  await page.goto('http://film.local/film.html');
  await page.evaluate(() => window.filmReady);
  return page;
}
async function frame(page, t) {
  await page.evaluate(async (t) => {
    await window.renderFrame(t);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, t);
  return page.screenshot({ type: 'jpeg', quality: 95 });
}

(async () => {
  const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--force-color-profile=srgb'] });
  if (args.stills) {
    fs.mkdirSync(path.join(DIR, 'stills'), { recursive: true });
    const page = await openPage(browser);
    for (const s of args.stills.split(',').map(Number)) {
      // play up to the still so time-based state (caption spans, caches) matches a real render
      fs.writeFileSync(path.join(DIR, 'stills', `t-${s.toFixed(2)}.jpg`), await frame(page, s));
    }
    await browser.close();
    console.log('stills done');
    return;
  }
  const from = Math.round(Number(args.from || 0) * FPS);
  const to = Math.round(Number(args.to || DURATION) * FPS);
  const workers = Number(args.workers || 4);
  fs.mkdirSync(path.join(DIR, 'frames'), { recursive: true });
  const started = Date.now();
  let done = 0;
  const chunk = Math.ceil((to - from) / workers);
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const page = await openPage(browser);
    const a = from + w * chunk;
    const b = Math.min(to, a + chunk);
    for (let f = a; f < b; f++) {
      fs.writeFileSync(path.join(DIR, 'frames', `${String(f).padStart(5, '0')}.jpg`), await frame(page, f / FPS));
      if (++done % 60 === 0) console.log(`${done}/${to - from} frames, ${((Date.now() - started) / 1000).toFixed(0)}s`);
    }
  }));
  await browser.close();
  console.log(`rendered ${to - from} frames in ${((Date.now() - started) / 1000).toFixed(0)}s`);
})();
