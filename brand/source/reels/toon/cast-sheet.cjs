// The cast sheet: the trading emotions (toon/cast.js) in a grid of poses, beside the founder for scale,
// to check the drawing and to approve it.
// usage: node cast-sheet.cjs <out.png> [--t=0.4] [--only=fomo,greed]
const { chromium } = (() => { try { return require('playwright'); } catch { return require('/opt/node22/lib/node_modules/playwright'); } })();
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const REPO = path.resolve(HERE, '../../../..');
const OUT = path.resolve(process.argv[2] || 'cast-sheet.png');
const args = Object.fromEntries(process.argv.slice(3).filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const T = Number(args.t || 0.4);

// Each row: one of them, its line, and its poses.
const ROWS = [
  ['fomo', 'can’t sit still; always sure it’s leaving without you', [
    ['standing', {}], ['“it’s pumping!”', { arms: 'phone', screen: '+$4,000', mouth: { open: 0.5, smile: 0.5, teeth: 1 }, look: [0.6, 0] }],
    ['pulling your sleeve', { arms: 'pull', lean: -14, legs: 'walk', mouth: { open: 0.3, smile: -0.2, teeth: 1 }, brow: { worry: 0.6 }, look: [1, 0] }],
    ['pointing up', { arms: 'point', look: [0.8, -0.8], hop: 18, legs: 'tuck' }], ['deflated', { squash: 0.6, arms: 'down', lid: 0.45, brow: { worry: 1, raise: 0 }, mouth: { smile: -0.6, open: 0, teeth: 0 }, look: [0, 0.6], shake: 0 }]]],
  ['revenge', 'wants it back, now, and twice the size', [
    ['guard', {}], ['punch', { arms: 'punch', lean: 8, mouth: { open: 0.5, smile: -0.6, teeth: 1 } }],
    ['fuming', { arms: 'hips', mouth: { smile: -0.8, open: 0 }, lid: 0.25 }], ['shouting', { arms: 'up', mouth: { open: 0.75, smile: -0.4, teeth: 1 }, hop: 10 }],
    ['walking off', { arms: 'down', legs: 'walk', face: -1, look: [-1, 0], lid: 0.3 }]]],
  ['greed', 'one more pip. always one more pip', [
    ['rubbing hands', {}], ['“just a bit more…”', { arms: 'grab', mouth: { open: 0.35, smile: 0.6, teeth: 1 }, look: [0.5, -0.3] }],
    ['pointing higher', { arms: 'point', look: [0.8, -0.8], mouth: { smile: 0.8, teeth: 1, open: 0.15 } }], ['shocked', { arms: 'up', mouth: { open: 0.8, smile: -0.3, teeth: 0 }, brow: { raise: 1 }, lid: 0 }],
    ['fainted', { squash: 0.8, arms: 'down', lid: 1, mouth: { smile: -0.4, open: 0, teeth: 0 }, lean: -10 }]]],
  ['fear', 'closes the trade the second it moves', [
    ['shaking', {}], ['peeking', { arms: 'hug', look: [1, 0], lid: 0.2 }], ['“close it!!”', { arms: 'up', mouth: { open: 0.6, wavy: 0, smile: -0.5 }, hop: 8 }],
    ['hiding', { arms: 'hug', squash: 0.4, lid: 0.6 }], ['running', { arms: 'up', legs: 'run', face: -1, look: [-1, 0], mouth: { open: 0.5, wavy: 0, smile: -0.4 } }]]],
  ['patience', 'the TCP one: waits for the plan, every time', [
    ['tea', {}], ['sitting', { legs: 'sit' }], ['“no setup.”', { arms: 'hips', lid: 0.4, mouth: { smile: 0.15 } }],
    ['waving', { arms: 'wave', lid: 0.3, mouth: { smile: 0.5 } }], ['holding a number', { arms: 'sign', card: '5', lid: 0.35 }]]],
];

(async () => {
  const rows = ROWS.filter(([who]) => !args.only || args.only.split(',').includes(who));
  const cols = 5, cw = 330, ch = 400, head = 90, label = 40;
  const W = cols * cw + 300, H = head + rows.length * (ch + label);
  const svg = fs.readFileSync(path.join(REPO, 'brand/logo/official/tcp-crown.svg'), 'utf8');
  const CROWN = { path: svg.match(/<path[^>]* d="([^"]+)"/)[1], circles: [...svg.matchAll(/<circle cx="([-\d.]+)" cy="([-\d.]+)" r="([-\d.]+)"/g)].map((m) => m.slice(1).map(Number)) };
  const font = (f) => `data:font/woff2;base64,${fs.readFileSync(path.join(REPO, 'terminal/src/fonts', f)).toString('base64')}`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  await page.setContent(`<html><head><style>
    @font-face { font-family: "Archivo"; src: url(${font('archivo-400.woff2')}); font-weight: 400; }
    @font-face { font-family: "Archivo"; src: url(${font('archivo-expanded-800.woff2')}); font-weight: 800; }
    @font-face { font-family: "TCP Display"; src: url(${font('archivo-expanded-800.woff2')}); font-weight: 800; }
    @font-face { font-family: "JB Mono"; src: url(${font('jetbrains-mono-600.woff2')}); font-weight: 600; }
    body { margin: 0; background: #1a1714; color: #c9c1b4; font: 600 17px "JB Mono"; }
    .row { display: flex; height: ${ch + label}px; border-top: 1px solid #2a2622; }
    .who { width: 300px; padding: 26px 24px; box-sizing: border-box; }
    .who b { display: block; font: 800 34px "TCP Display"; letter-spacing: -0.01em; margin-bottom: 10px; }
    .cell { width: ${cw}px; position: relative; }
    .cell div { position: absolute; left: 0; right: 0; bottom: 10px; text-align: center; color: #8d857a; }
  </style></head><body>
    <div style="height:${head}px;display:flex;align-items:center;padding:0 26px;font:800 34px 'TCP Display';color:#D8AD4E;letter-spacing:.02em">THE TRADING EMOTIONS · CAST SHEET V1 · FOR APPROVAL</div>
    <div id="rows"></div></body></html>`);
  await page.evaluate((c) => { window.CROWN = c; }, CROWN);
  await page.addScriptTag({ content: fs.readFileSync(path.join(HERE, 'cast.js'), 'utf8') });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(({ rows, cw, ch, T }) => {
    const host = document.getElementById('rows');
    rows.forEach(([who, line, poses], r) => {
      const c = window.Cast.WHO[who];
      const cells = poses.map(([lab, p], i) => `<div class="cell"><svg width="${cw}" height="${ch}" viewBox="0 0 ${cw} ${ch}">
        <g transform="translate(${cw / 2} ${ch - 40}) scale(1.05)">${window.Cast.svg(who, p, T + i * 0.37, `s${r}x${i}`)}</g></svg><div>${lab}</div></div>`).join('');
      host.insertAdjacentHTML('beforeend', `<div class="row"><div class="who"><b style="color:${c.tag}">${c.name}</b>${line}</div>${cells}</div>`);
    });
  }, { rows, cw, ch, T });
  await page.waitForTimeout(150);
  await page.screenshot({ path: OUT, fullPage: true });
  await browser.close();
  console.log('wrote', OUT);
})();
