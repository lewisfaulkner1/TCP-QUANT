// Character sheet: renders the founder in a grid of poses, to check the drawing and to approve it.
// usage: node sheet.cjs <out.png> [poses.json] [--scale=1.6] [--cols=3] [--bg=#1a1714]
//                       [--title=text] [--frames=a.jpg,b.jpg] [--labels=one,two]
// poses.json is a list of { label, pose }; without it, the standard sheet is drawn. --frames adds a
// row of stills from an episode under the grid, to show him in his sets.
const { chromium } = (() => { try { return require('playwright'); } catch { return require('/opt/node22/lib/node_modules/playwright'); } })();
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const REPO = path.resolve(HERE, '../../../..');
const OUT = path.resolve(process.argv[2] || 'sheet.png');
const args = Object.fromEntries(process.argv.slice(3).filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const posesFile = process.argv.slice(3).find((a) => !a.startsWith('--'));
const SCALE = Number(args.scale || 1.6);
const COLS = Number(args.cols || 3);
const BG = args.bg || '#1a1714';

const STANDARD = [
  { label: 'three-quarter (calm)', pose: {} },
  { label: 'facing left', pose: { flip: true } },
  { label: 'from behind', pose: { view: 'back' } },
  { label: 'side-eye to camera', pose: { look: [-1, 0.1], lid: 0.42, brow: [0.2, -0.2], mouth: { smile: -0.25 } } },
  { label: 'small smirk', pose: { look: [0.6, 0], lid: 0.32, mouth: { smirk: 1, smile: 0.1 }, brow: [0, 0.35] } },
  { label: 'eyebrow raise', pose: { brow: [1, 0.1], lid: 0.2, look: [0.2, 0] } },
  { label: 'disbelief', pose: { wide: 1, lid: 0, brow: [1, 1], mouth: { open: 0.35 }, look: [0.8, 0] } },
  { label: 'urgent', pose: { brow: [-0.8, -0.8], lid: 0.15, look: [1, 0.1], mouth: { open: 0.15, smile: -0.4 } } },
  { label: 'talking', pose: { mouth: { open: 0.6 }, brow: [0.3, 0.3], look: [0.4, 0] } },
  { label: 'shades on', pose: { shades: 1, mouth: { smirk: 0.6 } } },
  { label: 'cap backwards', pose: { cap: 'back', look: [0.5, 0] } },
  { label: 'arms folded', pose: { arms: 'fold', lid: 0.4, mouth: { smile: -0.2 } } },
];

(async () => {
  const items = posesFile ? JSON.parse(fs.readFileSync(posesFile, 'utf8')) : STANDARD;
  const svg = fs.readFileSync(path.join(REPO, 'brand/logo/official/tcp-crown.svg'), 'utf8');
  const CROWN = {
    path: svg.match(/<path[^>]* d="([^"]+)"/)[1],
    circles: [...svg.matchAll(/<circle cx="([-\d.]+)" cy="([-\d.]+)" r="([-\d.]+)"/g)].map((m) => m.slice(1).map(Number)),
  };
  const cellW = Math.round(520 * SCALE * 0.62), cellH = Math.round(760 * SCALE * 0.62);
  const rows = Math.ceil(items.length / COLS);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: cellW * COLS, height: cellH * rows }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  const frames = args.frames ? args.frames.split(',') : [];
  const labels = args.labels ? args.labels.split(',') : [];
  const W = cellW * COLS, fw = frames.length ? Math.floor(W / frames.length) : 0, fh = Math.round(fw * 16 / 9);
  await page.setViewportSize({ width: W, height: cellH * rows + (frames.length ? fh + 40 : 0) + (args.title ? 90 : 0) });
  await page.setContent(`<html><body style="margin:0;background:${BG};font:600 15px monospace;color:#bbb">
    ${args.title ? `<div style="height:90px;display:flex;align-items:center;padding:0 24px;font:600 30px monospace;color:#D8AD4E;letter-spacing:.08em">${args.title}</div>` : ''}
    <div id="grid" style="display:grid;grid-template-columns:repeat(${COLS},${cellW}px)"></div>
    ${frames.length ? `<div style="display:flex;padding-top:40px">${frames.map((f, i) => `<div style="position:relative;width:${fw}px;height:${fh}px">
      <img src="data:image/jpeg;base64,${fs.readFileSync(f).toString('base64')}" style="width:${fw}px;height:${fh}px;display:block">
      <div style="position:absolute;left:10px;top:-28px">${labels[i] || ''}</div></div>`).join('')}</div>` : ''}
    </body></html>`);
  await page.evaluate((c) => { window.CROWN = c; }, CROWN);
  await page.addScriptTag({ content: fs.readFileSync(path.join(HERE, 'founder.js'), 'utf8') });
  await page.evaluate(({ items, cellW, cellH, SCALE }) => {
    const grid = document.getElementById('grid');
    items.forEach((it, i) => {
      const s = SCALE * 0.62;
      const p = window.Founder.pose(it.pose);
      grid.insertAdjacentHTML('beforeend', `<div style="position:relative;width:${cellW}px;height:${cellH}px;border:1px solid #2a2622;box-sizing:border-box">
        <svg width="${cellW}" height="${cellH}" viewBox="0 0 ${cellW} ${cellH}"><g transform="translate(${cellW * 0.48} ${cellH * 0.36}) scale(${s})">${window.Founder.founderSVG(p, 'c' + i)}</g></svg>
        <div style="position:absolute;left:10px;top:8px">${it.label}</div></div>`);
    });
  }, { items, cellW, cellH, SCALE });
  await page.screenshot({ path: OUT, fullPage: true });
  await browser.close();
  console.log('wrote', OUT);
})();
