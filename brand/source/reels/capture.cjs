// Footage of the terminal for the reels: the app in demo mode at the size Telegram gives it on a phone
// (390 x 713), its clock frozen and stepped 1/30 s at a time, CSS animations held to the same clock,
// and a 2x screenshot (780 x 1426) per step. One folder of frames per shot, in <workdir>/shots.
// usage: node capture.cjs <workdir> [shot,shot...]
// Playwright from this folder's node_modules, or the copy installed globally in the cloud container.
const { chromium } = (() => { try { return require('playwright'); } catch { return require('/opt/node22/lib/node_modules/playwright'); } })();
const fs = require('fs');
const path = require('path');

const WORK = path.resolve(process.argv[2]);
const OUT = path.join(WORK, 'shots');
const ONLY = process.argv[3] ? process.argv[3].split(',') : null;
const REPO = path.resolve(__dirname, '../../..');
const LWC = fs.readFileSync(process.env.LWC || path.join(WORK, '..', 'lwc/node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.js'));
const DPR = 2;
const STEP = 1000 / 30;
const START = new Date('2026-09-30T13:41:30Z'); // a Wednesday afternoon: London and New York both open
const log = (m) => { console.log(m); fs.appendFileSync(path.join(WORK, 'capture.log'), m + '\n'); };

async function openApp(browser) {
  const worker = (await import(path.join(REPO, 'terminal/dist/worker.js'))).default;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 713 }, deviceScaleFactor: DPR, timezoneId: 'Europe/London', locale: 'en-GB' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => log('pageerror: ' + e.message));
  page.on('dialog', (d) => d.accept());
  await page.route('**/*', async (r) => {
    const url = new URL(r.request().url());
    if (url.hostname === 'terminal.local') {
      const res = await worker.fetch(new Request(url.href), {});
      return r.fulfill({ status: res.status, headers: Object.fromEntries(res.headers), body: Buffer.from(await res.arrayBuffer()) });
    }
    if (url.hostname === 'telegram.org') return r.fulfill({ contentType: 'application/javascript', body: 'window.Telegram={WebApp:{initData:"",ready(){},expand(){},setHeaderColor(){},setBackgroundColor(){},HapticFeedback:{selectionChanged(){}}}}' });
    if (url.hostname === 'cdn.jsdelivr.net') return r.fulfill({ contentType: 'application/javascript', headers: { 'access-control-allow-origin': '*' }, body: LWC });
    return r.abort();
  });
  await page.clock.install({ time: START });
  await page.goto('http://terminal.local/?demo&gold=3860&btc=64000');
  await page.clock.pauseAt(new Date(START.getTime() + 2000));
  let virtual = 2000;
  const run = async (ms) => { await page.clock.runFor(ms); virtual += ms; };
  await run(1500);
  // The member's name in the header; the reels label the prices as demo themselves.
  await page.evaluate(() => {
    const fix = () => {
      const n = document.getElementById('whoName');
      if (n && n.textContent !== 'Lewis') { n.textContent = 'Lewis'; document.getElementById('whoInitial').textContent = 'L'; }
    };
    new MutationObserver(fix).observe(document.body, { subtree: true, childList: true, characterData: true });
    fix();
  });
  const sync = () => page.evaluate((now) => {
    for (const a of document.getAnimations()) {
      if (a.__t0 === undefined) a.__t0 = now - (a.currentTime || 0);
      if (a.playState !== 'paused') a.pause();
      a.currentTime = now - a.__t0;
    }
  }, virtual);
  return { page, run, sync };
}

async function record(app, name, seconds, actions = {}) {
  const { page } = app;
  const dir = path.join(OUT, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const frames = [];
  const n = Math.round(seconds * 30);
  const t0 = Date.now();
  for (let f = 0; f < n; f++) {
    if (actions[f]) await actions[f]();
    await app.run(STEP);
    await app.sync();
    const file = `${String(f).padStart(5, '0')}.jpg`;
    await page.screenshot({ path: path.join(dir, file), type: 'jpeg', quality: 92 });
    frames.push({ file, t: f / 30 });
  }
  fs.writeFileSync(path.join(dir, 'shot.json'), JSON.stringify({ name, dpr: DPR, frames }, null, 1));
  log(`${name}: ${frames.length} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

const scrollTo = (page, sel, block = 'start', offset = 0) => page.evaluate(([sel, block, offset]) => { document.querySelector(sel).scrollIntoView({ block }); scrollBy(0, offset); }, [sel, block, offset]);
// A smooth scroll driven by the page's frozen clock: started here, it moves as the clock steps.
const glide = (page, dy, ms) => page.evaluate(([dy, ms]) => {
  const y0 = scrollY; const t0 = performance.now();
  const step = () => { const k = Math.min(1, (performance.now() - t0) / ms); const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; scrollTo(0, y0 + dy * e); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}, [dy, ms]);
const typer = (page, sel, text) => [...text].map((ch) => () => page.type(sel, ch));

const SHOTS = {
  async markets(app) {
    return record(app, 'markets', 6, { 60: () => glide(app.page, 300, 2600) });
  },
  async odds(app) {
    const { page } = app;
    await scrollTo(page, '#levels', 'start', -70);
    await app.run(600);
    return record(app, 'odds', 7, {
      90: async () => {
        const level = await page.evaluate(() => Math.min(...[...document.querySelectorAll('.lv.above .lv-price')].map((b) => Number(b.textContent.replace(/,/g, '')))));
        await page.evaluate((p) => window.tcpDemo.price(p), level - 1.2);
      },
    });
  },
  async swarm(app) {
    const { page } = app;
    await scrollTo(page, '#swarm', 'center');
    await app.run(400);
    await page.click('#swarm');
    return record(app, 'swarm', 10);
  },
  async risk(app) {
    const { page } = app;
    await page.click('nav button[data-tab="risk"]');
    await app.run(600);
    await page.fill('#balance', '');
    const actions = {};
    typer(page, '#balance', '10000').forEach((fn, i) => { actions[16 + i * 4] = fn; });
    actions[44] = async () => {
      const entry = await page.inputValue('#entry');
      await page.fill('#stop', '');
      app.stop = (parseFloat(entry.replace(/,/g, '')) - 6).toFixed(2);
    };
    for (let i = 0; i < 8; i++) actions[48 + i * 4] = async () => { if (app.stop && i < app.stop.length) await page.type('#stop', app.stop[i]); };
    actions[86] = () => page.evaluate(() => document.activeElement && document.activeElement.blur());
    actions[96] = () => glide(page, 330, 1500);
    return record(app, 'risk', 6.5, actions);
  },
  async playbook(app) {
    const { page } = app;
    await page.click('nav button[data-tab="signals"]');
    await app.run(1500);
    return record(app, 'playbook', 9, { 45: () => glide(page, 520, 2600), 170: () => glide(page, 560, 2400) });
  },
  async ranks(app) {
    const { page } = app;
    await page.click('nav button[data-tab="ranks"]');
    await app.run(1200);
    return record(app, 'ranks', 8, { 40: () => glide(page, 640, 3200), 170: () => glide(page, -640, 1400) });
  },
  async measured(app) {
    const { page } = app;
    await page.click('nav button[data-tab="account"]');
    await app.run(800);
    await scrollTo(page, '#mtMeasured', 'start', -80);
    await app.run(100);
    return record(app, 'measured', 6, { 80: () => glide(page, 260, 1800) });
  },
  async brief(app) {
    const { page } = app;
    await page.click('nav button[data-tab="ai"]');
    await app.run(1500);
    await scrollTo(page, '#brList', 'start', -80);
    await app.run(300);
    return record(app, 'brief', 7, { 60: () => glide(page, 480, 2600) });
  },
};

(async () => {
  const browser = await chromium.launch();
  const names = Object.keys(SHOTS).filter((n) => !ONLY || ONLY.includes(n));
  const queue = [...names];
  await Promise.all(Array.from({ length: Math.min(3, names.length) }, async () => {
    while (queue.length) {
      const name = queue.shift();
      const app = await openApp(browser);
      try { await SHOTS[name](app); } catch (e) { log(`${name} failed: ${e.stack}`); }
      await app.page.context().close();
    }
  }));
  await browser.close();
  log('capture done');
})();
