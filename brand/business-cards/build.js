#!/usr/bin/env node
// TCP business cards: print-ready PDF (85 x 55 mm + 3 mm bleed, front and back), 300 dpi PNGs and a mockup.
//   node build.js --name LEWIS --title FOUNDER --tag card --out out/tcp-card-lewis
// The QR code opens the onboarding bot with ?start=<tag>, so the team sees "Source: <tag>" on the lead.
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1]]);
  return acc;
}, []));
const NAME = (args.name || 'LEWIS').toUpperCase();
const TITLE = (args.title || 'FOUNDER').toUpperCase();
const TAG = args.tag || 'card';
const OUT = args.out || 'tcp-card';
const BOT = 'TCPInnerCircleBot';
if (!/^[\w-]{1,32}$/.test(TAG)) throw new Error('tag must be 1-32 letters, digits, _ or -');
const URL = `https://t.me/${BOT}?start=${TAG}`;

const ROOT = path.resolve(__dirname, process.env.REPO_ROOT || '../..');
const FONTS = path.join(ROOT, 'signals', 'fonts');
const LOGO = path.join(ROOT, 'brand', 'logo', 'official');
const fontUrl = (f) => 'file://' + path.join(FONTS, f);

// ---- geometry (mm) ----
const W = 91, H = 61, BLEED = 3; // trim 85 x 55
const C = { ink: '#0E0D0B', gold: '#D8AD4E', ivory: '#F2ECDF', stone: '#A69D8C' };

function svgBody(file, idPrefix) {
  const s = fs.readFileSync(path.join(LOGO, file), 'utf8');
  const vb = /viewBox="([^"]+)"/.exec(s)[1];
  const inner = s.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
    .replace(/id="foil"/g, `id="${idPrefix}"`).replace(/url\(#foil\)/g, `url(#${idPrefix})`);
  return { vb, inner };
}

function qrSvg(sizeMm) {
  const qr = QRCode.create(URL, { errorCorrectionLevel: 'H' });
  const n = qr.modules.size, m = sizeMm / n;
  // leave the middle clear for the crown badge (error correction H covers it)
  const hole = Math.round(n * 0.26) | 1, lo = (n - hole) / 2, hi = lo + hole;
  let d = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (!qr.modules.get(x, y)) continue;
    if (x >= lo && x < hi && y >= lo && y < hi) continue;
    d += `M${(x * m).toFixed(3)} ${(y * m).toFixed(3)}h${m.toFixed(3)}v${m.toFixed(3)}h-${m.toFixed(3)}z`;
  }
  return { d, n, version: qr.version, badge: hole * m, offset: lo * m, module: m };
}

function candles() {
  // a quiet candlestick silhouette along the bottom of the front: fixed seed, same every build
  let seed = 7, y = 50;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let out = '';
  for (let i = 0; i < 19; i++) {
    const x = 1.2 + i * 4.85, o = y, c = y + (rnd() - 0.52) * 4.2;
    const top = Math.min(o, c) - rnd() * 2.2, bot = Math.max(o, c) + rnd() * 2.2;
    out += `<rect x="${(x + 1.05).toFixed(2)}" y="${top.toFixed(2)}" width="0.3" height="${(bot - top).toFixed(2)}"/>`;
    out += `<rect x="${x.toFixed(2)}" y="${Math.min(o, c).toFixed(2)}" width="2.4" height="${Math.max(0.6, Math.abs(c - o)).toFixed(2)}" rx="0.25"/>`;
    y = c;
  }
  return out;
}

function html() {
  const stacked = svgBody('tcp-logo-stacked.svg', 'foilA');
  const crown = svgBody('tcp-crown.svg', 'foilB');
  const Q = 21, P = 27, px = 56, py = 13; // QR size, panel size, panel position
  const q = qrSvg(Q);
  const qx = px + (P - Q) / 2, qy = py + (P - Q) / 2;
  const bx = qx + q.offset, by = qy + q.offset, bs = q.badge;
  const logoH = 29, [lvx, lvy, lvw, lvh] = stacked.vb.split(/\s+/).map(Number), logoW = logoH * lvw / lvh;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:"TCP Display";src:url(${fontUrl('archivo-expanded-800.ttf')});font-weight:800}
@font-face{font-family:"Archivo";src:url(${fontUrl('archivo-400.ttf')});font-weight:400}
@font-face{font-family:"Instrument Serif";src:url(${fontUrl('instrument-serif-italic.ttf')});font-style:italic}
@font-face{font-family:"JetBrains Mono";src:url(${fontUrl('jetbrains-mono-500.ttf')});font-weight:500}
@font-face{font-family:"JetBrains Mono";src:url(${fontUrl('jetbrains-mono-600.ttf')});font-weight:600}
@page{size:${W}mm ${H}mm;margin:0}
html,body{margin:0;padding:0;background:#333}
.page{width:${W}mm;height:${H}mm;position:relative;overflow:hidden;background:${C.ink};break-after:page}
.bg{position:absolute;inset:0;background:
  radial-gradient(60mm 38mm at 50% -6%, rgba(216,173,78,.16), rgba(216,173,78,0) 70%),
  radial-gradient(50mm 34mm at 0% 105%, rgba(58,34,104,.45), rgba(36,22,64,0) 70%)}
svg.abs{position:absolute;overflow:visible}
.t{position:absolute;margin:0;white-space:nowrap;color:${C.ivory}}
.name{font:800 13pt/1 "TCP Display";letter-spacing:.01em}
.title{font:600 5.6pt/1 "JetBrains Mono";letter-spacing:.22em;color:${C.gold}}
.offer{font:400 6.8pt/1.5 "Archivo";color:rgba(242,236,223,.9)}
.lbl{font:500 4.8pt/1 "JetBrains Mono";letter-spacing:.18em;color:${C.stone}}
.handle{font:500 6.6pt/1 "JetBrains Mono";letter-spacing:.02em}
.legal{font:500 4.6pt/1 "JetBrains Mono";letter-spacing:.12em;color:${C.stone}}
.scan{font:italic 400 8pt/1 "Instrument Serif";color:${C.ivory};text-align:center;width:${P}mm}
.tagline{font:italic 400 8.2pt/1 "Instrument Serif";color:rgba(242,236,223,.82);text-align:center;width:${W}mm;left:0}
</style></head><body>

<section class="page" id="front">
  <div class="bg"></div>
  <svg class="abs" style="left:0;top:0;width:${W}mm;height:${H}mm" viewBox="0 0 ${W} ${H}"><g fill="${C.gold}" opacity=".075">${candles()}</g></svg>
  <svg class="abs" style="left:${(W - logoW) / 2}mm;top:9.5mm;width:${logoW}mm;height:${logoH}mm" viewBox="${stacked.vb}">${stacked.inner}</svg>
  <p class="t tagline" style="top:44mm">Trade the playbook.</p>
</section>

<section class="page" id="back">
  <div class="bg"></div>
  <p class="t name" style="left:8mm;top:11.5mm">${NAME}</p>
  <p class="t title" style="left:8.1mm;top:18.6mm">${TITLE}</p>
  <div style="position:absolute;left:8mm;top:22.6mm;width:16mm;height:.25mm;background:rgba(216,173,78,.55)"></div>
  <p class="t offer" style="left:8mm;top:25mm">Quant trading system<br>Algorithmic signals<br>A+ setups · Mentorship</p>
  <p class="t lbl" style="left:8mm;top:39.4mm">TELEGRAM</p>
  <p class="t handle" style="left:8mm;top:42.2mm">@${BOT}</p>
  <p class="t legal" style="left:8mm;top:51.2mm">HIGH RISK · NOT FINANCIAL ADVICE · 18+</p>

  <div style="position:absolute;left:${px}mm;top:${py}mm;width:${P}mm;height:${P}mm;border-radius:2.2mm;background:${C.ivory};box-shadow:0 0 0 .3mm rgba(216,173,78,.65)"></div>
  <svg class="abs" style="left:${qx}mm;top:${qy}mm;width:${Q}mm;height:${Q}mm" viewBox="0 0 ${Q} ${Q}" shape-rendering="crispEdges"><path fill="${C.ink}" d="${q.d}"/></svg>
  <div style="position:absolute;left:${bx + 0.35}mm;top:${by + 0.35}mm;width:${bs - 0.7}mm;height:${bs - 0.7}mm;border-radius:1.1mm;background:${C.ink}"></div>
  <svg class="abs" style="left:${bx + 0.95}mm;top:${by + 1.25}mm;width:${bs - 1.9}mm;height:${bs - 2.3}mm" viewBox="${crown.vb}">${crown.inner}</svg>
  <p class="t scan" style="left:${px}mm;top:${py + P + 3.2}mm">Scan to request access</p>
</section>
</body></html>`;
}

(async () => {
  fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
  const page_html = html();
  const htmlFile = path.resolve(OUT + '.html');
  fs.writeFileSync(htmlFile, page_html);
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 300 / 96, viewport: { width: 400, height: 520 } });
  await page.goto('file://' + htmlFile);
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: OUT + '-print.pdf', width: `${W}mm`, height: `${H}mm`, printBackground: true, pageRanges: '1-2' });
  const clip = async (id, file, trim) => {
    const el = await page.$('#' + id); const b = await el.boundingBox();
    const bleedPx = trim ? (BLEED / 25.4) * 96 : 0;
    await page.screenshot({ path: file, clip: { x: b.x + bleedPx, y: b.y + bleedPx, width: b.width - 2 * bleedPx, height: b.height - 2 * bleedPx } });
  };
  await clip('front', OUT + '-front.png'); await clip('back', OUT + '-back.png');
  await clip('front', OUT + '-front-trim.png', true); await clip('back', OUT + '-back-trim.png', true);

  // prove the printed QR scans: decode it from the 300 dpi back with jsQR
  const decoder = await browser.newPage();
  await decoder.addScriptTag({ path: require.resolve('jsqr/dist/jsQR.js') });
  const png = fs.readFileSync(OUT + '-back.png').toString('base64');
  const decoded = await decoder.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height);
    const r = jsQR(d.data, c.width, c.height);
    // also at phone-camera-like resolution (the card about 25 cm away)
    const s = document.createElement('canvas'); s.width = Math.round(img.width / 3); s.height = Math.round(img.height / 3);
    s.getContext('2d').drawImage(img, 0, 0, s.width, s.height);
    const d2 = s.getContext('2d').getImageData(0, 0, s.width, s.height);
    const r2 = jsQR(d2.data, s.width, s.height);
    return [r && r.data, r2 && r2.data];
  }, png);
  if (decoded[0] !== URL || decoded[1] !== URL) throw new Error(`QR check failed: ${JSON.stringify(decoded)} (expected ${URL})`);

  // mockup: both sides on a dark surface
  const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
  const mock = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await mock.setContent(`<!doctype html><body style="margin:0;width:1600px;height:1000px;overflow:hidden;background:
    radial-gradient(900px 600px at 30% 20%, #2a2620, #12100d 70%), #12100d">
    <svg width="0" height="0"><filter id="n"><feTurbulence baseFrequency=".9" numOctaves="2"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .06 0"/></filter></svg>
    <div style="position:absolute;inset:0;filter:url(#n)"></div>
    <img src="${b64(OUT + '-back-trim.png')}" style="position:absolute;left:830px;top:400px;width:700px;transform:rotate(5deg);border-radius:10px;box-shadow:0 30px 60px rgba(0,0,0,.6),0 8px 16px rgba(0,0,0,.5)">
    <img src="${b64(OUT + '-front-trim.png')}" style="position:absolute;left:70px;top:120px;width:700px;transform:rotate(-6deg);border-radius:10px;box-shadow:0 30px 60px rgba(0,0,0,.6),0 8px 16px rgba(0,0,0,.5)">
    </body>`);
  await mock.waitForTimeout(200);
  await mock.screenshot({ path: OUT + '-mockup.png' });
  await browser.close();
  fs.unlinkSync(htmlFile);
  console.log(`${OUT}: QR v${qrSvg(21).version} (${qrSvg(21).n}x${qrSvg(21).n}, module ${qrSvg(21).module.toFixed(2)} mm) decodes to ${URL}`);
})().catch((e) => { console.error(e.message); process.exit(1); });
