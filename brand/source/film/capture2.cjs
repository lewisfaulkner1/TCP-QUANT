// Captures the terminal (demo prices at today's level) as sharp footage for the film: the page's
// clock is frozen and stepped 1/30 s at a time, CSS animations are held to the same clock, and each
// step is a 3x screenshot (1170 x 2139). Shots run in parallel pages.
// usage: node capture2.cjs <scratchpad> [shot,shot...]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const SP = process.argv[2];
const OUT = SP + '/film/shots/';
const ONLY = process.argv[3] ? process.argv[3].split(',') : null;
const LWC = fs.readFileSync(SP + '/lwc/node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.js');
const DPR = 3;
const STEP = 1000 / 30;
const START = new Date('2026-09-23T13:41:30Z');
const log = (m) => fs.appendFileSync(SP + '/film/capture2.log', m + '\n');

async function openApp(browser) {
  const worker = (await import('/home/user/TCP-QUANT/terminal/dist/worker.js')).default;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 713 }, deviceScaleFactor: DPR, timezoneId: 'Europe/London', locale: 'en-GB' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => log('pageerror: ' + e.message));
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
  await page.goto('http://terminal.local/?demo&gold=4286&btc=84460');
  await page.clock.pauseAt(new Date(START.getTime() + 2000));
  let virtual = 2000;
  const run = async (ms) => { await page.clock.runFor(ms); virtual += ms; };
  await run(1500);
  // The product as members see it: the live status bar and a member's name (the film says the prices are demo).
  await page.evaluate(() => {
    const fix = () => {
      const s = document.getElementById('engineState');
      if (s && s.textContent === 'DEMO') s.textContent = 'LIVE';
      const y = document.getElementById('engineSync');
      const btc = document.querySelector('.segment button[data-symbol="BTCUSD"]').getAttribute('aria-pressed') === 'true';
      const want = btc ? 'Coinbase ticks' : 'synced just now';
      if (y && y.textContent !== want) y.textContent = want;
      const u = document.getElementById('updated');
      if (u) u.style.visibility = 'hidden';
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
  return { page, run, sync, get virtual() { return virtual; } };
}

async function record(app, name, seconds, sels, actions = {}) {
  const { page } = app;
  const dir = OUT + name + '/';
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const box = await page.evaluate((sels) => Object.fromEntries(Object.entries(sels).map(([k, sel]) => {
    const el = document.querySelector(sel);
    if (!el) return [k, null];
    const r = el.getBoundingClientRect();
    return [k, { x: r.x, y: r.y, w: r.width, h: r.height }];
  })), sels);
  const frames = [];
  const n = Math.round(seconds * 30);
  const t0 = Date.now();
  for (let f = 0; f < n; f++) {
    if (actions[f]) await actions[f]();
    await app.run(STEP);
    await app.sync();
    const file = `${String(f).padStart(5, '0')}.jpg`;
    await page.screenshot({ path: dir + file, type: 'jpeg', quality: 93 });
    frames.push({ file, t: f / 30 });
  }
  fs.writeFileSync(dir + 'shot.json', JSON.stringify({ name, dpr: DPR, frames, box }, null, 1));
  log(`${name}: ${frames.length} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

const scrollTo = (page, sel, block = 'center') => page.evaluate(([sel, block]) => document.querySelector(sel).scrollIntoView({ block }), [sel, block]);
// A smooth scroll driven by the page's (frozen) clock: started here, it moves as the clock steps.
const glide = (page, dy, ms) => page.evaluate(([dy, ms]) => {
  const y0 = scrollY; const t0 = performance.now();
  const step = () => { const k = Math.min(1, (performance.now() - t0) / ms); const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; scrollTo(0, y0 + dy * e); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}, [dy, ms]);
// Type one character per call, as a person would.
const typer = (page, sel, text) => [...text].map((ch) => () => page.type(sel, ch));

const SHOTS = {
  async markets(app) {
    const { page } = app;
    return record(app, 'markets', 6.2, { quote: '.card:has(#price)', price: '#price', brief: '.card.brief' }, {
      105: async () => {
        const level = await page.evaluate(() => Math.min(...[...document.querySelectorAll('.lv.above .lv-price')].map((b) => Number(b.textContent.replace(/,/g, '')))));
        await page.evaluate((p) => window.tcpDemo.price(p), level - 0.9);
      },
    });
  },
  async btc(app) {
    const { page } = app;
    await page.click('.segment button[data-symbol="BTCUSD"]');
    await app.run(1500);
    return record(app, 'btc', 5.0, { price: '#price', quote: '.card:has(#price)' });
  },
  async chart(app) {
    await scrollTo(app.page, '#chart');
    await app.run(600);
    return record(app, 'chart', 4.6, { card: '.card:has(#chart)', chart: '#chart' });
  },
  async odds(app) {
    await scrollTo(app.page, '#levels');
    await app.run(600);
    return record(app, 'odds', 4.0, { card: '.card:has(#levels)', levels: '#levels' });
  },
  async swarm(app) {
    const { page } = app;
    await scrollTo(page, '#swarm');
    await app.run(400);
    await page.click('#swarm');
    return record(app, 'swarm', 10.0, { card: '.card:has(#swarm)', swarm: '#swarm', legend: '#swarmLegend' });
  },
  async check(app) {
    await scrollTo(app.page, '#check');
    await app.run(600);
    return record(app, 'check', 3.6, { card: '.card:has(#check)', check: '#check' });
  },
  async vclock(app) {
    const { page } = app;
    await scrollTo(page, '#vclock');
    await app.run(600);
    return record(app, 'vclock', 6.2, { card: '.card:has(#vclock)', vclock: '#vclock' }, { 3: () => glide(page, 420, 5200) });
  },
  async risk(app) {
    const { page } = app;
    await page.click('nav button[data-tab="risk"]');
    await app.run(600);
    await page.fill('#balance', '');
    const actions = {};
    typer(page, '#balance', '10000').forEach((fn, i) => { actions[18 + i * 4] = fn; });
    actions[48] = async () => {
      const entry = await page.inputValue('#entry');
      await page.fill('#stop', '');
      app.stop = (parseFloat(entry.replace(/,/g, '')) - 6).toFixed(2);
    };
    for (let i = 0; i < 8; i++) actions[51 + i * 4] = async () => { if (app.stop && i < app.stop.length) await page.type('#stop', app.stop[i]); };
    actions[88] = () => page.evaluate(() => document.activeElement && document.activeElement.blur());
    actions[96] = () => glide(page, 330, 1500);
    return record(app, 'risk', 5.4, { card: '#risk .card' }, actions);
  },
  async signals(app) {
    await app.page.click('nav button[data-tab="signals"]');
    await app.run(800);
    return record(app, 'signals', 2.8, { card: '.card:has(.pipe)', pipe: '.pipe' });
  },
  async ai(app) {
    await app.page.click('nav button[data-tab="ai"]');
    await app.run(800);
    return record(app, 'ai', 3.4, { hero: '.ai-hero', orb: '#orb' });
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
  log('done');
  process.exit(0);
})();
