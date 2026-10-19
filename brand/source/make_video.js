// Render the TCP logo intro / outro to MP4, frame by frame.
// usage: node make_video.js <intro|outro> <9x16|16x9> <out.mp4> [--frames-only]
// Every frame is drawn by render(t) at an exact time, screenshotted by headless
// Chromium, then encoded with ffmpeg (libx264, yuv420p, no audio).
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const [kind, aspect, out] = process.argv.slice(2);
const HERE = __dirname;
const parts = JSON.parse(fs.readFileSync(path.join(HERE, 'out_video/parts.json'), 'utf8'));
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FPS = 30;
const DUR = kind === 'intro' ? 3.6 : 4.5;
const [W, H] = aspect === '9x16' ? [1080, 1920] : [1920, 1080];

const font = (f) => fs.readFileSync(path.join(HERE, 'fonts', f)).toString('base64');
const INK = '#0E0D0B', GOLD = '#D8AD4E', IVORY = '#F2ECDF', STONE = '#A69D8C';
const RISK = ['CFDs and crypto are high-risk. Leveraged products can lose you money fast.',
              'Past performance is not a guide to future results. Not financial advice. 18+.'];

// ---- layout: where the logo sits (logo units -> pixels) --------------------
const LH = parts.bottom - parts.top;
let logo;  // {k, ox, oy}
function place(k, cx, cy) { return { k, ox: cx - (parts.width / 2) * k, oy: cy - ((parts.top + parts.bottom) / 2) * k }; }
if (kind === 'intro') logo = aspect === '9x16' ? place(640 / parts.width, 540, 900) : place(600 / LH, 960, 540);
else logo = aspect === '9x16' ? { k: 1.45, ox: 540 - 143 * 1.45, oy: 290 - parts.top * 1.45 } : place(1.5, 600, 520);

// ---- outro text blocks -------------------------------------------------------
function outroSvg() {
  const arrow = (x, y, s) => `<g id="arrow" transform="translate(${x} ${y}) scale(${s})"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  if (aspect === '9x16') {
    return `
    <g id="tag1"><text x="540" y="900" text-anchor="middle" font-family="TCPHead" font-size="118" letter-spacing="-4" fill="${IVORY}">Trade the</text></g>
    <g id="tag2"><text x="540" y="1036" text-anchor="middle" font-family="TCPSerif" font-style="italic" font-size="146" fill="${GOLD}">playbook.</text></g>
    <g id="cta"><rect x="170" y="1118" width="740" height="104" rx="52" fill="${GOLD}"/>
      <text x="513" y="1183" text-anchor="middle" font-family="TCPBody" font-size="38" fill="${INK}">Request access — link in bio</text>${arrow(785, 1151, 1.6)}</g>
    <g id="risk"><text x="540" y="1478" text-anchor="middle" font-family="TCPReg" font-size="23" fill="${STONE}">${RISK[0]}</text>
      <text x="540" y="1512" text-anchor="middle" font-family="TCPReg" font-size="23" fill="${STONE}">${RISK[1]}</text></g>`;
  }
  return `
    <rect x="900" y="330" width="1.5" height="380" fill="#3A3429"/>
    <g id="tag1"><text x="990" y="470" font-family="TCPHead" font-size="112" letter-spacing="-4" fill="${IVORY}">Trade the</text></g>
    <g id="tag2"><text x="990" y="598" font-family="TCPSerif" font-style="italic" font-size="138" fill="${GOLD}">playbook.</text></g>
    <g id="cta"><rect x="990" y="668" width="640" height="92" rx="46" fill="${GOLD}"/>
      <text x="1287" y="726" text-anchor="middle" font-family="TCPBody" font-size="33" fill="${INK}">Request access — link in bio</text>${arrow(1524, 698, 1.35)}</g>
    <g id="risk"><text x="960" y="1010" text-anchor="middle" font-family="TCPReg" font-size="21" fill="${STONE}">${RISK.join(' ')}</text></g>`;
}

// ---- the page ----------------------------------------------------------------
const P = parts;
const candleSvg = P.candles.map((c, i) => `<path id="c${i}" d="${c.d}" fill="url(#foilCrown)"/>`).join('');
const jewelSvg = P.jewels.map((j, i) => `<circle id="j${i}" cx="${j.cx}" cy="${j.cy}" r="${j.r}" fill="url(#foilBox)"/>`).join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:'TCPHead';src:url(data:font/ttf;base64,${font('archivo-exp-800.ttf')})}
@font-face{font-family:'TCPSerif';font-style:italic;src:url(data:font/ttf;base64,${font('instrument-serif-italic.ttf')})}
@font-face{font-family:'TCPBody';src:url(data:font/ttf;base64,${font('archivo-700.ttf')})}
@font-face{font-family:'TCPReg';src:url(data:font/ttf;base64,${font('archivo-400.ttf')})}
html,body{margin:0;background:${INK};overflow:hidden}
</style></head><body>
<svg id="stage" xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="foilCrown" gradientUnits="userSpaceOnUse" x1="0" y1="${P.crown.top}" x2="0" y2="${P.crown.bottom}">
    <stop offset="0" stop-color="#F6E3A3"/><stop offset="0.42" stop-color="#D8AD4E"/><stop offset="0.72" stop-color="#B0812F"/><stop offset="1" stop-color="#E3C06D"/></linearGradient>
  <linearGradient id="foilWord" gradientUnits="userSpaceOnUse" x1="0" y1="-1.5" x2="0" y2="101.5">
    <stop offset="0" stop-color="#F6E3A3"/><stop offset="0.42" stop-color="#D8AD4E"/><stop offset="0.72" stop-color="#B0812F"/><stop offset="1" stop-color="#E3C06D"/></linearGradient>
  <linearGradient id="foilBox" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#F6E3A3"/><stop offset="0.42" stop-color="#D8AD4E"/><stop offset="0.72" stop-color="#B0812F"/><stop offset="1" stop-color="#E3C06D"/></linearGradient>
  <radialGradient id="glowG"><stop offset="0" stop-color="#D8AD4E" stop-opacity="0.20"/><stop offset="1" stop-color="#D8AD4E" stop-opacity="0"/></radialGradient>
  <linearGradient id="sheenG" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#FFF6DC" stop-opacity="0"/><stop offset="0.5" stop-color="#FFF6DC" stop-opacity="0.85"/><stop offset="1" stop-color="#FFF6DC" stop-opacity="0"/></linearGradient>
  <clipPath id="wordClip"><rect x="-20" y="-40" width="${P.width + 40}" height="141.5"/></clipPath>
  <clipPath id="logoClip">
    <use href="#crownPath" clip-rule="evenodd"/>${P.jewels.map((j) => `<circle cx="${j.cx}" cy="${j.cy}" r="${j.r}"/>`).join('')}
    <use href="#T" transform="translate(0 ${P.word.y})"/><use href="#C" transform="translate(0 ${P.word.y})"/>
    <use href="#P" transform="translate(0 ${P.word.y})" clip-rule="evenodd"/><use href="#desc" transform="translate(0 ${P.word.y})"/>
  </clipPath>
</defs>
<rect width="${W}" height="${H}" fill="${INK}"/>
<circle id="glow" cx="${logo.ox + 143 * logo.k}" cy="${logo.oy + ((P.top + P.bottom) / 2) * logo.k}" r="${Math.max(W, H) * 0.42}" fill="url(#glowG)" opacity="0"/>
<g id="logo" transform="translate(${logo.ox} ${logo.oy}) scale(${logo.k})">
  <g id="candles">${candleSvg}</g>
  <g id="crown"><path id="crownPath" d="${P.crown.d}" fill="url(#foilCrown)" fill-rule="evenodd"/></g>
  <g id="jewels">${jewelSvg}</g>
  <g transform="translate(0 ${P.word.y})">
    <g clip-path="url(#wordClip)">
      <path id="T" d="${P.word.T}" fill="url(#foilWord)"/>
      <path id="C" d="${P.word.C}" fill="url(#foilWord)"/>
      <path id="P" d="${P.word.P}" fill="url(#foilWord)" fill-rule="evenodd"/>
    </g>
    <path id="desc" d="${P.desc.d}" fill="${GOLD}"/>
  </g>
  <g clip-path="url(#logoClip)"><rect id="sheen" x="0" y="${P.top - 40}" width="110" height="${LH + 80}" fill="url(#sheenG)" opacity="0"/></g>
</g>
${kind === 'outro' ? outroSvg() : ''}
</svg>
<script>
const P = ${JSON.stringify({ candles: P.candles, jewels: P.jewels, crown: { cx: P.crown.cx, cy: P.crown.cy }, width: P.width, top: P.top, bottom: P.bottom })};
const L = ${JSON.stringify(logo)}, KIND = '${kind}';
const clamp = (x) => Math.max(0, Math.min(1, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const out3 = (x) => 1 - Math.pow(1 - x, 3);
const inout = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const back = (x) => { const c1 = 1.9, c3 = c1 + 1; return x <= 0 ? 0 : 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const $ = (id) => document.getElementById(id);
const about = (cx, cy, s, sy) => 'translate(' + cx + ' ' + cy + ') scale(' + s + ' ' + (sy ?? s) + ') translate(' + (-cx) + ' ' + (-cy) + ')';
function sheen(t, a, b) {
  const p = inout(seg(t, a, b));
  $('sheen').setAttribute('opacity', p > 0 && p < 1 ? 1 : 0);
  $('sheen').setAttribute('transform', 'translate(' + (-180 + p * (P.width + 420)) + ' 0) skewX(-22)');
}
function render(t) {
  const cyMid = (P.top + P.bottom) / 2;
  if (KIND === 'intro') {
    $('glow').setAttribute('opacity', out3(seg(t, 0, 0.6)));
    const push = 1 + 0.015 * inout(seg(t, 1.4, 3.6));
    $('logo').setAttribute('transform', 'translate(' + L.ox + ' ' + L.oy + ') scale(' + L.k + ') ' + about(143, cyMid, push));
    [[0, 0.15, 0.60], [2, 0.30, 0.75], [1, 0.45, 0.95]].forEach(([i, a, b]) => {
      const p = out3(seg(t, a, b)), c = P.candles[i];
      $('c' + i).setAttribute('transform', about(c.x, c.bottom, 1, Math.max(p, 0.0001)));
      $('c' + i).setAttribute('opacity', p > 0 ? 1 : 0);
    });
    $('candles').setAttribute('opacity', 1 - seg(t, 1.15, 1.5));
    const cp = out3(seg(t, 0.85, 1.35));
    $('crown').setAttribute('opacity', cp);
    $('crown').setAttribute('transform', 'translate(0 ' + (12 * (1 - cp)) + ') ' + about(P.crown.cx, P.crown.cy, 0.9 + 0.1 * cp));
    [[0, 1.05, 1.35], [2, 1.10, 1.40], [1, 1.15, 1.45]].forEach(([i, a, b]) => {
      const j = P.jewels[i], s = back(seg(t, a, b));
      $('j' + i).setAttribute('transform', about(j.cx, j.cy, Math.max(s, 0.0001)));
    });
    [['T', 1.35, 1.80], ['C', 1.45, 1.90], ['P', 1.55, 2.00]].forEach(([id, a, b]) => {
      $(id).setAttribute('transform', 'translate(0 ' + (115 * (1 - out3(seg(t, a, b)))) + ')');
    });
    const dp = out3(seg(t, 1.9, 2.4));
    $('desc').setAttribute('opacity', dp);
    $('desc').setAttribute('transform', about(143, 130, 1.15 - 0.15 * dp, 1));
    sheen(t, 2.3, 3.0);
  } else {
    const lp = out3(seg(t, 0, 0.6));
    $('glow').setAttribute('opacity', lp);
    $('logo').setAttribute('opacity', lp);
    $('logo').setAttribute('transform', 'translate(' + L.ox + ' ' + L.oy + ') scale(' + L.k + ') ' + about(143, cyMid, 0.94 + 0.06 * lp));
    $('candles').setAttribute('opacity', 0);
    sheen(t, 0.5, 1.2);
    [['tag1', 0.5, 1.1, 30], ['tag2', 0.7, 1.3, 30], ['cta', 1.1, 1.6, 24], ['risk', 1.4, 1.9, 0]].forEach(([id, a, b, dy]) => {
      const p = out3(seg(t, a, b));
      $(id).setAttribute('opacity', p);
      $(id).setAttribute('transform', 'translate(0 ' + (dy * (1 - p)) + ')');
    });
    const arrow = $('arrow'), base = arrow.getAttribute('data-base') || arrow.getAttribute('transform');
    arrow.setAttribute('data-base', base);
    const nudge = t > 2.0 ? 5 * (0.5 - 0.5 * Math.cos((t - 2.0) * Math.PI * 2 / 1.2)) : 0;
    arrow.setAttribute('transform', 'translate(' + nudge + ' 0) ' + base);
  }
}
</script></body></html>`;

(async () => {
  const framesDir = path.join(HERE, 'frames', `${kind}-${aspect}`);
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });
  fs.writeFileSync(path.join(HERE, 'out_video', `${kind}-${aspect}.html`), html);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.setContent(html);
  await page.evaluate(async () => {
    await Promise.all(['800 100px TCPHead', 'italic 100px TCPSerif', '100px TCPBody', '100px TCPReg'].map((f) => document.fonts.load(f)));
    await document.fonts.ready;
  });
  const N = Math.round(DUR * FPS);
  for (let i = 0; i < N; i++) {
    await page.evaluate((t) => render(t), i / FPS);
    await page.screenshot({ path: path.join(framesDir, `f_${String(i).padStart(4, '0')}.png`) });
  }
  await browser.close();
  if (process.argv.includes('--frames-only')) { console.log(`${N} frames -> ${framesDir}`); return; }
  const r = spawnSync(FFMPEG, ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(framesDir, 'f_%04d.png'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'slow', '-movflags', '+faststart', out]);
  if (r.status !== 0) { console.error(r.stderr.toString()); process.exit(1); }
  console.log(`${out}: ${N} frames, ${W}x${H}, ${DUR}s @ ${FPS}fps, ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
})();
