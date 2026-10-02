// The TCP Quant Terminal launch film (1080 x 1920, 30 fps, 45 s), drawn frame by frame:
// render.cjs calls renderFrame(t) for each frame time and screenshots the stage.
// Footage of the app comes from capture.cjs (window.SHOTS); the crown from the brand kit (window.CROWN).
'use strict';
const W = 1080, H = 1920, FPS = 30, DURATION = 45;
const $ = (id) => document.getElementById(id);

// ------------------------------------------------------------------ helpers
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  outCubic: (k) => 1 - (1 - k) ** 3,
  inCubic: (k) => k * k * k,
  inOutCubic: (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2),
  outExpo: (k) => (k >= 1 ? 1 : 1 - 2 ** (-10 * k)),
  inExpo: (k) => (k <= 0 ? 0 : 2 ** (10 * k - 10)),
  inOutSine: (k) => -(Math.cos(Math.PI * k) - 1) / 2,
  outBack: (k) => { const c = 1.3; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; },
  smooth: (k) => k * k * (3 - 2 * k),
};
// 0 before a, 1 between a+fi and b-fo, 0 after b
const inOut = (t, a, b, fi = 0.4, fo = 0.4) => Math.min(E.outCubic(seg(t, a, a + fi)), 1 - E.inCubic(seg(t, b - fo, b)));
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r) => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
const css = (el, props) => { for (const k in props) el.style[k] = props[k]; };

// ----------------------------------------------------------------- timeline
const T = {
  open: [0, 3.6], title: [3.6, 6.4], reveal: [6.4, 9.6], live: [9.6, 12.8], chart: [12.8, 16.0],
  odds: [16.0, 19.2], swarm: [19.2, 25.6], check: [25.6, 28.8], vclock: [28.8, 32.0], risk: [32.0, 35.2],
  signals: [35.2, 36.4], ai: [36.4, 37.6], montage: [37.6, 39.2], end: [39.2, 45.0],
};

// What the phone's screen shows: app footage, shot by shot (u = seconds into the shot).
const SCREEN = [
  { a: 6.4, b: 11.6, shot: 'markets', u0: 0.2, speed: 1 },
  { a: 11.6, b: 12.8, shot: 'btc', u0: 1.4, speed: 1 },
  { a: 12.8, b: 16.0, shot: 'chart', u0: 0.4, speed: 1 },
  { a: 16.0, b: 19.2, shot: 'odds', u0: 0.4, speed: 1 },
  { a: 19.2, b: 25.6, shot: 'swarm', u0: 1.0, speed: 1 },
  { a: 25.6, b: 28.8, shot: 'check', u0: 0.2, speed: 1 },
  { a: 28.8, b: 32.0, shot: 'vclock', u0: 0.4, speed: 1.7 },
  { a: 32.0, b: 35.2, shot: 'risk', u0: 1.5, speed: 1.25 },
  { a: 35.2, b: 36.4, shot: 'signals', u0: 1.0, speed: 1 },
  { a: 36.4, b: 37.6, shot: 'ai', u0: 1.2, speed: 1 },
];

// The phone's pose over time: centre (x, y), scale and rotation in degrees.
const POSE = [
  { t: 6.4, x: 540, y: 2750, s: 0.9, rx: 36, ry: -28, rz: 10 },
  { t: 8.3, x: 540, y: 1190, s: 1.0, rx: 7, ry: -10, rz: 0, ease: 'outCubic' },
  { t: 9.7, x: 540, y: 1190, s: 1.0, rx: 6, ry: -5, rz: 0 },
  { t: 10.3, x: 400, y: 1250, s: 0.9, rx: 5, ry: 17, rz: -1 },
  { t: 12.6, x: 410, y: 1245, s: 0.9, rx: 5, ry: 19, rz: -1 },
  { t: 13.4, x: 540, y: 1215, s: 1.16, rx: 3, ry: -5, rz: 0 },
  { t: 15.8, x: 540, y: 1195, s: 1.2, rx: 3, ry: -8, rz: 0 },
  { t: 16.6, x: 680, y: 1250, s: 0.9, rx: 5, ry: -18, rz: 1 },
  { t: 19.2, x: 690, y: 1250, s: 0.9, rx: 5, ry: -20, rz: 1 },
  { t: 25.6, x: 420, y: 1250, s: 0.9, rx: 5, ry: 18, rz: -1 },
  { t: 28.4, x: 430, y: 1250, s: 0.9, rx: 5, ry: 20, rz: -1 },
  { t: 29.2, x: 540, y: 1215, s: 1.14, rx: 3, ry: -8, rz: 0 },
  { t: 31.8, x: 540, y: 1200, s: 1.18, rx: 3, ry: -10, rz: 0 },
  { t: 32.6, x: 690, y: 1250, s: 0.9, rx: 5, ry: -17, rz: 1 },
  { t: 35.0, x: 690, y: 1245, s: 0.9, rx: 5, ry: -19, rz: 1 },
  { t: 35.6, x: 540, y: 1200, s: 1.0, rx: 5, ry: 9, rz: 0 },
  { t: 36.5, x: 540, y: 1200, s: 1.0, rx: 5, ry: -9, rz: 0 },
  { t: 37.6, x: 540, y: 1180, s: 1.06, rx: 4, ry: -12, rz: 0 },
];

// Cards lifted out of the app to float in front of the phone. crop = [x, y, w, h] in the app's CSS pixels.
const POPS = [
  { el: 'popA', a: 9.95, b: 11.5, shot: 'markets', crop: [16, 169, 358, 237], u0: 0.2, from: 6.4, x: 640, y: 880, w: 620, ry: -8 },
  { el: 'popB', a: 11.5, b: 12.75, shot: 'btc', crop: [16, 169, 358, 167], u0: 1.4, from: 11.6, x: 640, y: 860, w: 620, ry: -8, flip: true },
  { el: 'popA', a: 16.35, b: 19.05, shot: 'odds', crop: [24, 30, 342, 452], u0: 0.4, from: 16.0, x: 420, y: 1010, w: 580, ry: 8 },
  { el: 'popB', a: 25.95, b: 28.65, shot: 'check', crop: [16, 221, 358, 404], u0: 0.2, from: 25.6, x: 650, y: 960, w: 600, ry: -8 },
  { el: 'popA', a: 34.25, b: 35.15, shot: 'risk', crop: [16, 316, 358, 330], uFixed: 5.3, x: 430, y: 1010, w: 600, ry: 8 },
];

// Captions: a label, a headline (display font) and an accent line (serif, gold).
const CAPS = [
  { a: 6.9, b: 9.55, label: 'Inside Telegram', head: 'A real quant engine.', accent: 'In your pocket.' },
  { a: 9.8, b: 12.7, label: '01 · Live markets', head: 'Live gold', accent: '& Bitcoin.' },
  { a: 12.95, b: 15.95, label: '02 · Key levels', head: 'Every key level,', accent: 'mapped.' },
  { a: 16.15, b: 19.1, label: '03 · Probability engine', head: 'The odds of every level', accent: 'before the close.' },
  { a: 19.6, b: 25.4, label: '04 · Probability swarm', head: 'Watch the odds', accent: 'come alive.' },
  { a: 25.8, b: 28.7, label: '05 · Model check', head: 'It checks itself,', accent: 'and tells you when it’s wrong.' },
  { a: 28.95, b: 31.9, label: '06 · Sessions & volatility', head: 'Know when', accent: 'the market moves.' },
  { a: 32.15, b: 35.1, label: '07 · Risk', head: 'Your lot size,', accent: 'in seconds.' },
  { a: 35.3, b: 36.38, label: '08 · Algo signals', head: 'Algo signals,', accent: 'once proven.', tag: 'IN FORWARD TEST' },
  { a: 36.45, b: 37.55, label: '09 · TCP AI', head: 'AI features,', accent: 'coming soon.' },
];

// Montage: eight flashes of the app, 0.2 s each.
const MONTAGE = [
  { shot: 'markets', u: 5.2, crop: [22, 222, 230, 60] },
  { shot: 'odds', u: 2.0, crop: [24, 30, 342, 200] },
  { shot: 'swarm', u: 9.5, crop: [33, 221, 324, 270] },
  { shot: 'chart', u: 4.0, crop: [27, 207, 336, 300] },
  { shot: 'btc', u: 4.5, crop: [22, 222, 230, 60] },
  { shot: 'risk', u: 5.3, crop: [16, 322, 358, 118] },
  { shot: 'check', u: 3.0, crop: [16, 221, 358, 404] },
  { shot: 'ai', u: 3.0, crop: [17, 103, 356, 230] },
];

// ------------------------------------------------------------------- footage
const DPR = 3; // the footage is 3 device pixels per CSS pixel
const APP_TOP = 97; // status bar (47) + Telegram header (50), in the phone's CSS pixels
function shotUrl(name, u) {
  const s = SHOTS[name];
  return s.frames[clamp(Math.round(u * FPS), 0, s.frames.length - 1)];
}
const images = new Map();
function load(url) {
  if (!images.has(url)) {
    const img = new Image();
    img.src = url;
    images.set(url, img.decode().then(() => img));
    if (images.size > 40) images.delete(images.keys().next().value);
  }
  return images.get(url);
}

// --------------------------------------------------------------- the screen
const scr = $('screen').getContext('2d');
scr.imageSmoothingQuality = 'high';
let navColour = '#12110e';
function statusBar(ctx) {
  // 2 canvas px per phone CSS px
  ctx.fillStyle = '#0E0D0B';
  ctx.fillRect(0, 0, 780, 194);
  ctx.fillStyle = '#F2ECDF';
  ctx.font = '600 33px Archivo';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('9:41', 74, 64);
  // signal bars
  for (let i = 0; i < 4; i++) { const h = 9 + i * 5; ctx.fillRect(598 + i * 11, 64 - h, 7, h); }
  // wifi
  ctx.strokeStyle = '#F2ECDF'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(668, 66, 7 + i * 8, Math.PI * 1.25, Math.PI * 1.75); ctx.stroke(); }
  // battery
  ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(242,236,223,.55)';
  roundRect(ctx, 698, 44, 48, 23, 7); ctx.stroke();
  ctx.fillStyle = '#F2ECDF'; roundRect(ctx, 702, 48, 36, 15, 4); ctx.fill();
  ctx.fillStyle = 'rgba(242,236,223,.55)'; roundRect(ctx, 748, 51, 4, 9, 2); ctx.fill();
  // Telegram's Mini App header
  ctx.fillStyle = '#F2ECDF';
  ctx.font = '400 31px Archivo';
  ctx.fillText('Close', 32, 152);
  ctx.textAlign = 'center';
  ctx.font = '600 31px Archivo';
  ctx.fillText('TCP Quant Terminal', 390, 142);
  ctx.font = '400 24px Archivo';
  ctx.fillStyle = 'rgba(166,157,140,.95)';
  ctx.fillText('mini app', 390, 174);
  ctx.textAlign = 'left';
  ctx.strokeStyle = 'rgba(242,236,223,.8)'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(728, 144, 22, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#F2ECDF';
  for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(728 + i * 9, 144, 3, 0, Math.PI * 2); ctx.fill(); }
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function screenAt(t) {
  const i = SCREEN.findIndex((s) => t >= s.a && t < s.b);
  const cur = SCREEN[i < 0 ? (t < SCREEN[0].a ? 0 : SCREEN.length - 1) : i];
  const u = cur.u0 + (t - cur.a) * cur.speed;
  const prev = i > 0 ? SCREEN[i - 1] : null;
  const k = prev && prev.b === cur.a ? seg(t, cur.a, cur.a + 0.32) : 1;
  const out = [{ shot: cur.shot, u, alpha: 1, dy: (1 - E.outCubic(k)) * 90 }];
  if (k < 1) out.unshift({ shot: prev.shot, u: prev.u0 + (prev.b - prev.a) * prev.speed, alpha: 1 - E.smooth(k), dy: -E.outCubic(k) * 90 });
  return out;
}
async function drawScreen(t) {
  const layers = screenAt(t);
  const imgs = await Promise.all(layers.map((l) => load(shotUrl(l.shot, l.u))));
  scr.fillStyle = navColour;
  scr.fillRect(0, 194, 780, 1494);
  layers.forEach((l, i) => {
    scr.globalAlpha = l.alpha;
    scr.drawImage(imgs[i], 0, 0, imgs[i].naturalWidth, imgs[i].naturalHeight, 0, 194 + l.dy, 780, 1426);
  });
  scr.globalAlpha = 1;
  // the strip under the app, and the home indicator
  scr.fillStyle = navColour;
  scr.fillRect(0, 1620, 780, 68);
  scr.fillStyle = 'rgba(242,236,223,.85)';
  roundRect(scr, 256, 1660, 268, 10, 5); scr.fill();
  statusBar(scr);
}

// ------------------------------------------------------------ phone and glow
function poseAt(t) {
  let i = POSE.findIndex((p) => p.t > t);
  if (i === -1) i = POSE.length;
  const a = POSE[Math.max(0, i - 1)], b = POSE[Math.min(POSE.length - 1, i)];
  const k = a === b ? 0 : (E[b.ease] || E.inOutCubic)(seg(t, a.t, b.t));
  const p = {};
  for (const key of ['x', 'y', 's', 'rx', 'ry', 'rz']) p[key] = lerp(a[key], b[key], k);
  // a slow, living drift
  p.rx += Math.sin(t * 0.8) * 1.3; p.ry += Math.sin(t * 0.55 + 1.2) * 1.8; p.y += Math.sin(t * 0.9) * 7;
  return p;
}
function phoneState(t) {
  // visible from the reveal to the montage, except while we dive into the swarm
  let o = seg(t, 6.4, 6.6), s = 1, blur = 0;
  if (t >= 19.2 && t < 25.6) {
    const dive = E.inExpo(seg(t, 19.2, 19.75));
    const back = 1 - E.outCubic(seg(t, 25.15, 25.75));
    s = t < 22 ? 1 + dive * 4.5 : 1 + back * 1.6;
    o = t < 22 ? 1 - seg(t, 19.45, 19.75) : 1 - back;
    blur = t < 22 ? dive * 14 : back * 10;
  }
  if (t >= 37.3) o = 1 - seg(t, 37.3, 37.62);
  return { o, s, blur };
}
function drawPhone(t) {
  const ph = $('phone');
  const st = phoneState(t);
  if (st.o <= 0.001 || t < 6.4) { ph.style.display = 'none'; return false; }
  const p = poseAt(t);
  // cards in front dim the phone behind them
  const dim = Math.max(...POPS.map((q) => inOut(t, q.a, q.b, 0.4, 0.3))) * 0.42;
  ph.style.display = 'block';
  css(ph, {
    transform: `translate(${p.x - 302}px, ${p.y - 630}px) rotateX(${p.rx}deg) rotateY(${p.ry}deg) rotateZ(${p.rz}deg) scale(${p.s * st.s})`,
    opacity: st.o,
    filter: `brightness(${1 - dim}) blur(${st.blur}px)`,
  });
  $('glare').style.background = `linear-gradient(${112 + p.ry * 1.5}deg, rgba(255,255,255,0) ${28 + p.ry}%, rgba(255,255,255,.075) ${40 + p.ry}%, rgba(255,255,255,0) ${52 + p.ry}%)`;
  return true;
}

// --------------------------------------------------------------- pop cards
async function drawPops(t) {
  const shown = { popA: null, popB: null };
  for (const q of POPS) if (t >= q.a - 0.05 && t < q.b + 0.05) shown[q.el] = q;
  for (const id of ['popA', 'popB']) {
    const cv = $(id);
    const q = shown[id];
    if (!q) { cv.style.display = 'none'; continue; }
    const vis = inOut(t, q.a, q.b, 0.45, 0.3);
    const u = q.uFixed ?? q.u0 + (t - q.from) * (q.speed || 1);
    const img = await load(shotUrl(q.shot, u));
    const [cx, cy, cw, ch] = q.crop;
    const w = q.w, h = Math.round((w * ch) / cw);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    roundRect(ctx, 0, 0, w, h, 30); ctx.clip();
    ctx.fillStyle = '#16140F'; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, cx * DPR, cy * DPR, cw * DPR, ch * DPR, 0, 0, w, h);
    ctx.restore();
    const kin = E.outCubic(seg(t, q.a, q.a + 0.5));
    let ry = q.ry + Math.sin(t * 0.9) * 2.5;
    if (q.flip) ry += (1 - E.outCubic(seg(t, q.a, q.a + 0.35))) * -80;
    const y = q.y + (1 - kin) * 70 + Math.sin(t * 1.3) * 6;
    cv.style.display = 'block';
    css(cv, {
      width: w + 'px', height: h + 'px', opacity: vis,
      transform: `translate(${q.x - w / 2}px, ${y - h / 2}px) perspective(2000px) rotateY(${ry}deg) rotateX(${3 + Math.sin(t * 0.7) * 1.5}deg) scale(${0.86 + 0.14 * kin})`,
      filter: `blur(${(1 - kin) * 10}px)`,
    });
  }
}

// ------------------------------------------------------------------ captions
let capKey = '';
function words(text, cls = '') {
  return text.split(/(\s+)/).map((w) => (w.trim() ? `<span class="w ${cls}">${w}</span>` : w)).join('');
}
function drawCaption(t) {
  const cap = CAPS.find((c) => t >= c.a && t < c.b);
  const box = $('cap');
  if (!cap) { box.style.display = 'none'; capKey = ''; return; }
  const key = cap.label;
  if (key !== capKey) {
    capKey = key;
    $('capLabel').innerHTML = `<i></i><span>${cap.label}</span><i></i>`;
    $('capHead').innerHTML = words(cap.head);
    $('capAccent').innerHTML = words(cap.accent, 'foil');
    $('capHead').style.fontSize = cap.head.length > 21 ? '62px' : '70px';
    $('capAccent').style.fontSize = cap.accent.length > 22 ? '76px' : '92px';
    $('capAccent').classList.remove('foil');
    $('capTagWrap').innerHTML = cap.tag ? `<div id="capTag">${cap.tag}</div>` : '';
  }
  box.style.display = 'block';
  const out = E.inCubic(seg(t, cap.b - 0.3, cap.b));
  const quick = cap.b - cap.a < 1.5;
  const lab = $('capLabel');
  css(lab, { opacity: E.outCubic(seg(t, cap.a, cap.a + 0.3)) * (1 - out), transform: `translateY(${(1 - E.outCubic(seg(t, cap.a, cap.a + 0.4))) * 16 - out * 20}px)` });
  const anim = (els, start, gap) => els.forEach((el, i) => {
    const k = E.outCubic(seg(t, start + i * gap, start + i * gap + (quick ? 0.3 : 0.5)));
    css(el, { opacity: k * (1 - out), transform: `translateY(${(1 - k) * 46 - out * 26}px)`, filter: `blur(${(1 - k) * 12 + out * 8}px)` });
  });
  anim([...$('capHead').querySelectorAll('.w')], cap.a + 0.08, quick ? 0.04 : 0.07);
  anim([...$('capAccent').querySelectorAll('.w')], cap.a + (quick ? 0.16 : 0.3), quick ? 0.04 : 0.07);
  const tag = $('capTag');
  if (tag) css(tag, { opacity: E.outCubic(seg(t, cap.a + 0.3, cap.a + 0.6)) * (1 - out) });
}

// ------------------------------------------------------ the film's own swarm
// Dots flow from "now" to "the close" along random walks, light up when they cross a level,
// and pile into a histogram: the app's swarm, restaged for the opening and the end card.
const SWARM = (() => {
  const r = rng(20260927);
  const N = 720, STEPS = 48;
  const ps = [];
  for (let i = 0; i < N; i++) {
    const walks = [];
    for (let w = 0; w < 3; w++) {
      const pts = [0];
      let y = 0;
      for (let k = 0; k < STEPS; k++) { y += gauss(r); pts.push(y); }
      walks.push(pts);
    }
    ps.push({ walks, phase: r(), speed: 0.85 + r() * 0.3, size: 1.6 + r() * 1.8, tw: r() * 6.28 });
  }
  return { ps, STEPS };
})();
let crownTargets = [];
function swarmGeometry(mode) {
  return mode === 'open'
    ? { x0: 120, x1: 880, y0: 1110, spread: 30, levels: [{ y: 1110 - 215, name: 'PDH', side: 'above' }, { y: 1110 + 250, name: 'PDL', side: 'below' }], cross: 1.7, spawn: 2.6 }
    : { x0: 90, x1: 900, y0: 1730, spread: 11, levels: [{ y: 1730 - 95, name: 'PDH', side: 'above' }, { y: 1730 + 110, name: 'PDL', side: 'below' }], cross: 2.2, spawn: 5.2 };
}
function drawSwarm(ctx, t, t0, mode, alpha, converge = 0) {
  const g = swarmGeometry(mode);
  const { ps, STEPS } = SWARM;
  const local = t - t0;
  const bins = new Array(60).fill(0);
  ctx.save();
  ctx.globalAlpha = alpha * (1 - E.smooth(clamp(converge * 1.6)));
  // levels
  ctx.setLineDash([10, 12]);
  ctx.lineWidth = 2;
  for (const l of g.levels) {
    ctx.strokeStyle = l.side === 'above' ? 'rgba(216,173,78,.55)' : 'rgba(140,123,209,.55)';
    ctx.beginPath(); ctx.moveTo(g.x0, l.y); ctx.lineTo(g.x1, l.y); ctx.stroke();
    ctx.fillStyle = l.side === 'above' ? 'rgba(227,192,109,.9)' : 'rgba(170,158,230,.9)';
    ctx.font = '600 22px "JB Mono"';
    ctx.fillText(l.name, g.x0, l.y - 12);
  }
  ctx.setLineDash([]);
  // "now" point
  const pulse = 0.5 + 0.5 * Math.sin(t * 7);
  const orb = ctx.createRadialGradient(g.x0, g.y0, 0, g.x0, g.y0, 40 + pulse * 18);
  orb.addColorStop(0, 'rgba(255,244,210,1)'); orb.addColorStop(0.25, 'rgba(246,227,163,.8)'); orb.addColorStop(1, 'rgba(216,173,78,0)');
  ctx.fillStyle = orb;
  ctx.beginPath(); ctx.arc(g.x0, g.y0, 60, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = alpha;
  // particles
  const scale = g.spread;
  const posAt = (walk, p) => {
    const f = p * STEPS, k = Math.floor(f), frac = f - k;
    const y = k >= STEPS ? walk[STEPS] : lerp(walk[k], walk[k + 1], frac);
    return [g.x0 + p * (g.x1 - g.x0), g.y0 + y * scale * Math.sqrt(1)];
  };
  ctx.globalCompositeOperation = 'lighter';
  ps.forEach((pt, i) => {
    const born = local - pt.phase * g.spawn;
    if (born < 0) return;
    const cycles = born * pt.speed / g.cross;
    const c = Math.floor(cycles);
    const p = cycles - c;
    const walk = pt.walks[c % pt.walks.length];
    for (let j = 0; j < Math.min(c, 3); j++) {
      const last = pt.walks[j % pt.walks.length][STEPS];
      bins[clamp(Math.round(30 + last * 1.9), 0, 59)] += 1;
    }
    let [x, y] = posAt(walk, p);
    // did this path cross a level so far?
    let lit = null;
    for (let k = 0; k <= Math.floor(p * STEPS); k++) {
      const yy = g.y0 + walk[k] * scale;
      if (yy <= g.levels[0].y) { lit = 'above'; break; }
      if (yy >= g.levels[1].y) { lit = 'below'; break; }
    }
    let a = Math.min(1, p * 8) * (p > 0.96 ? (1 - p) * 25 : 1);
    if (converge > 0 && crownTargets.length) {
      const [tx, ty] = crownTargets[i % crownTargets.length];
      const k = E.inOutCubic(clamp(converge * 1.15 - (i % 17) * 0.009));
      x = lerp(x, tx, k); y = lerp(y, ty, k);
      a = lerp(a, 1, k);
    }
    const col = lit === 'above' ? '255,214,120' : lit === 'below' ? '176,160,255' : '246,227,163';
    // trail
    if (converge < 0.5) {
      const tail = Math.max(0, p - 0.07);
      const [tx0, ty0] = posAt(walk, tail);
      const grad = ctx.createLinearGradient(tx0, ty0, x, y);
      grad.addColorStop(0, `rgba(${col},0)`); grad.addColorStop(1, `rgba(${col},${0.55 * a * (1 - converge * 2)})`);
      ctx.strokeStyle = grad;
      ctx.beginPath(); ctx.moveTo(tx0, ty0);
      const n = 5;
      for (let s = 1; s <= n; s++) { const [xx, yy] = posAt(walk, tail + ((p - tail) * s) / n); ctx.lineTo(lerp(xx, x, converge), lerp(yy, y, converge)); }
      ctx.lineWidth = pt.size * 3.2; ctx.globalAlpha = alpha * 0.18; ctx.stroke();
      ctx.lineWidth = pt.size * 0.9; ctx.globalAlpha = alpha; ctx.stroke();
    }
    const tw = 0.75 + 0.25 * Math.sin(t * 5 + pt.tw);
    ctx.fillStyle = `rgba(${col},${a * tw * 0.16})`;
    ctx.beginPath(); ctx.arc(x, y, pt.size * 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(${col},${a * tw})`;
    ctx.beginPath(); ctx.arc(x, y, pt.size * (lit ? 1.25 : 1), 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalCompositeOperation = 'source-over';
  // the histogram of closes, at the right
  if (converge < 0.2) {
    const max = Math.max(1, ...bins);
    bins.forEach((n, b) => {
      if (!n) return;
      const y = g.y0 + ((b - 30) / 1.9) * scale;
      const len = (n / max) * 120;
      ctx.fillStyle = `rgba(216,173,78,${0.25 + 0.55 * (n / max)})`;
      ctx.fillRect(g.x1 + 24, y - 3, len, 6);
    });
  }
  ctx.restore();
}
function sampleCrown() {
  // points on the crown, where the dots gather at the end of the opening (crown at 390..690, 596..840)
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const k = 300 / 238.4;
  c.setTransform(k, 0, 0, k, 390 + 19.2 * k, 596 + 19.53 * k);
  c.fillStyle = '#fff';
  c.fill(new Path2D(CROWN.path), 'evenodd');
  for (const [x, y, r] of CROWN.circles) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
  const data = c.getImageData(0, 0, W, H).data;
  const pts = [];
  for (let y = 560; y < 880; y += 3) for (let x = 360; x < 720; x += 3) if (data[(y * W + x) * 4 + 3] > 128) pts.push([x, y]);
  const r = rng(99);
  for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
  crownTargets = pts.slice(0, SWARM.ps.length);
}

// --------------------------------------------------------- background layer
const BOKEH = (() => {
  const r = rng(5);
  return Array.from({ length: 64 }, () => ({ x: r() * W, y: r() * H, rad: 6 + r() ** 2 * 46, a: 0.05 + r() * 0.2, vy: 6 + r() * 22, vx: (r() - 0.5) * 8, ph: r() * 6.28, depth: 0.3 + r() * 0.7 }));
})();
function drawBackground(t) {
  const ctx = $('bg').getContext('2d');
  const g = ctx.createRadialGradient(540, 900, 50, 540, 960, 1300);
  g.addColorStop(0, '#17130c'); g.addColorStop(0.45, '#0b0907'); g.addColorStop(1, '#040303');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const bokehOn = Math.max(seg(t, 3.4, 4.6) * (1 - seg(t, 37.6, 37.8)), seg(t, 39.2, 40));
  if (bokehOn > 0) {
    for (const b of BOKEH) {
      const y = ((b.y - t * b.vy * b.depth) % H + H) % H;
      const x = b.x + Math.sin(t * 0.3 + b.ph) * 30 * b.depth + t * b.vx;
      const a = b.a * bokehOn * (0.6 + 0.4 * Math.sin(t * 1.3 + b.ph));
      const rg = ctx.createRadialGradient(x, y, 0, x, y, b.rad);
      rg.addColorStop(0, `rgba(246,227,163,${a})`); rg.addColorStop(0.6, `rgba(216,173,78,${a * 0.45})`); rg.addColorStop(1, 'rgba(216,173,78,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, b.rad, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// --------------------------------------------------------- title (3.6-6.4)
function drawTitle(t) {
  const on = t >= 3.4 && t < 6.6;
  $('title').style.display = on ? 'block' : 'none';
  if (!on) return;
  const out = E.inCubic(seg(t, 6.05, 6.5));
  const crownIn = E.outCubic(seg(t, 3.5, 3.95));
  css($('crown'), { opacity: crownIn * (1 - out), transform: `scale(${1 + out * 0.25}) translateY(${-out * 40}px)`, filter: `drop-shadow(0 0 ${30 + 30 * (1 - crownIn)}px rgba(216,173,78,.55))` });
  const tcpIn = E.outExpo(seg(t, 3.75, 4.35));
  const shine = lerp(-40, 140, E.inOutSine(seg(t, 4.25, 5.35)));
  css($('tcp'), { opacity: tcpIn * (1 - out), transform: `translateY(${(1 - tcpIn) * 70 - out * 30}px) scale(${1 + out * 0.08})`, filter: `blur(${(1 - tcpIn) * 16 + out * 10}px)`,
    backgroundImage: `linear-gradient(100deg, rgba(255,250,232,0) ${shine - 14}%, rgba(255,250,232,.95) ${shine}%, rgba(255,250,232,0) ${shine + 14}%), linear-gradient(180deg, #F6E3A3 0%, #E3C06D 30%, #D8AD4E 52%, #B0812F 76%, #E3C06D 100%)` });
  const track = E.outCubic(seg(t, 4.0, 5.0));
  css($('qt'), { opacity: E.outCubic(seg(t, 4.0, 4.5)) * (1 - out), letterSpacing: `${lerp(0.95, 0.46, track)}em`, transform: `translateX(${lerp(0.95, 0.46, track) * 20}px)` });
  const tagIn = E.outCubic(seg(t, 4.75, 5.35));
  css($('tagline'), { opacity: tagIn * (1 - out), transform: `translateY(${(1 - tagIn) * 30}px)`, filter: `blur(${(1 - tagIn) * 10}px)` });
  // light sweep across the wordmark
  $('titleSweep').style.display = 'none';
}

// ------------------------------------------------------ swarm hero (19.2-25.6)
async function drawFull(t) {
  const cv = $('fullCv');
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  ctx.imageSmoothingQuality = 'high';
  let used = false;
  if (t >= 19.35 && t < 25.8) {
    used = true;
    const u = 1.0 + (t - 19.2);
    const img = await load(shotUrl('swarm', u));
    const inK = E.outCubic(seg(t, 19.4, 20.0));
    const outK = E.inExpo(seg(t, 25.1, 25.7));
    const push = 1 + (t - 19.2) * 0.012;
    const s = (0.62 + 0.38 * inK) * push * (1 + outK * 2.2);
    const alpha = inK * (1 - outK);
    // the swarm canvas (324 x 270 CSS px) at nearly its native resolution
    const [cx, cy, cw, ch] = [33, 221, 324, 270];
    const w = 1000 * s, h = (1000 * ch / cw) * s;
    const x = 540 - w / 2, y = 1010 - h / 2;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = 'rgba(216,173,78,.28)'; ctx.shadowBlur = 90;
    roundRect(ctx, x, y, w, h, 28 * s); ctx.fillStyle = '#0c0b09'; ctx.fill();
    ctx.shadowBlur = 0;
    ctx.save(); roundRect(ctx, x, y, w, h, 28 * s); ctx.clip();
    ctx.drawImage(img, cx * DPR, cy * DPR, cw * DPR, ch * DPR, x, y, w, h);
    ctx.restore();
    ctx.strokeStyle = 'rgba(246,227,163,.28)'; ctx.lineWidth = 1.5; roundRect(ctx, x, y, w, h, 28 * s); ctx.stroke();
    // the legend: what share of paths touched each level, against the engine's odds
    const [lx, ly, lw, lh] = [33, 503, 324, 42];
    const lW = 1000 * s, lH = (1000 * lh / lw) * s;
    ctx.globalAlpha = alpha * E.outCubic(seg(t, 20.0, 20.6));
    ctx.drawImage(img, lx * DPR, ly * DPR, lw * DPR, lh * DPR, 540 - lW / 2, y + h + 34 * s, lW, lH);
    ctx.restore();
  }
  if (t >= T.montage[0] && t < T.montage[1]) {
    used = true;
    const i = Math.min(7, Math.floor((t - T.montage[0]) / 0.2));
    const m = MONTAGE[i];
    const k = ((t - T.montage[0]) % 0.2) / 0.2;
    const img = await load(shotUrl(m.shot, m.u));
    const [cx, cy, cw, ch] = m.crop;
    const s = 1.14 - 0.14 * E.outCubic(k);
    const w = 980 * s, h = (980 * ch / cw) * s;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.drawImage(img, cx * DPR, cy * DPR, cw * DPR, ch * DPR, 540 - w / 2 + (i % 2 ? 1 : -1) * (1 - k) * 60, 960 - h / 2, w, h);
    ctx.restore();
  }
  cv.style.display = used ? 'block' : 'none';
}

// ---------------------------------------------------------------- end card
function drawEnd(t) {
  const on = t >= T.end[0];
  $('end').style.display = on ? 'block' : 'none';
  if (!on) return;
  const rise = (el, a, d = 0.55, dist = 40) => {
    const k = E.outCubic(seg(t, a, a + d));
    css(el, { opacity: k, transform: `translateY(${(1 - k) * dist}px)`, filter: `blur(${(1 - k) * 10}px)` });
  };
  const ck = E.outBack(seg(t, 39.3, 39.9));
  css($('endCrown'), { opacity: seg(t, 39.3, 39.6), transform: `scale(${0.6 + 0.4 * ck})`, filter: `drop-shadow(0 0 ${24 + 12 * Math.sin(t * 2)}px rgba(216,173,78,.5))` });
  rise($('endGet'), 39.55);
  rise($('endName'), 39.75, 0.6, 60);
  rise($('endAnd'), 40.1, 0.6, 50);
  const cta = E.outBack(seg(t, 40.5, 41.1));
  css($('endCta'), { opacity: seg(t, 40.5, 40.8), transform: `scale(${0.8 + 0.2 * cta})` });
  // a shine across the button every couple of seconds
  const shine = ((t - 41.3) % 2.2) / 0.9;
  $('endCta').style.backgroundImage = shine >= 0 && shine <= 1 && t > 41.3
    ? `linear-gradient(105deg, rgba(255,255,255,0) ${lerp(-30, 110, shine) - 12}%, rgba(255,255,255,.65) ${lerp(-30, 110, shine)}%, rgba(255,255,255,0) ${lerp(-30, 110, shine) + 12}%), linear-gradient(180deg, #F6E3A3, #D8AD4E 55%, #C29640)`
    : 'linear-gradient(180deg, #F6E3A3, #D8AD4E 55%, #C29640)';
  rise($('endBio'), 40.9);
  rise($('endRisk'), 41.2, 0.6, 20);
}

// ------------------------------------------------------------------- effects
const GRAIN = [];
function makeGrain() {
  const r = rng(3);
  for (let i = 0; i < 6; i++) {
    const img = new ImageData(540, 960);
    for (let p = 0; p < img.data.length; p += 4) { const v = 128 + gauss(r) * 42; img.data[p] = img.data[p + 1] = img.data[p + 2] = v; img.data[p + 3] = 255; }
    GRAIN.push(img);
  }
}
function drawFx(t, frame) {
  $('grain').getContext('2d').putImageData(GRAIN[frame % GRAIN.length], 0, 0);
  // flashes: the crown forming, the end card, and each montage cut
  let f = 0;
  const hit = (at, peak, decay) => (t >= at - 0.06 ? peak * Math.max(0, t < at ? seg(t, at - 0.06, at) : 1 - seg(t, at, at + decay)) : 0);
  f = Math.max(hit(3.6, 0.85, 0.7), hit(39.2, 0.95, 0.9), hit(19.7, 0.35, 0.5));
  if (t >= T.montage[0] && t < T.montage[1]) f = Math.max(f, hit(T.montage[0] + Math.floor((t - T.montage[0]) / 0.2) * 0.2, 0.32, 0.1));
  $('flash').style.opacity = f;
  // light leaks drifting across at the big moments
  const leaks = [6.35, 12.7, 19.15, 25.55, 31.95, 39.1];
  let lk = 0, lx = 0, ly = 0;
  leaks.forEach((at, i) => {
    const k = seg(t, at, at + 1.1);
    if (k > 0 && k < 1) { lk = Math.sin(Math.PI * k) * 0.55; lx = lerp(i % 2 ? 1300 : -1100, i % 2 ? -900 : 900, k); ly = 300 + (i * 390) % 1300; }
  });
  css($('leak'), { opacity: lk, transform: `translate(${lx - 900 + 540}px, ${ly - 900}px)` });
  // a light streak across each montage cut and the reveal
  const st = [6.5, 37.6, 38.0, 38.4, 38.8].find((a) => t >= a && t < a + 0.3);
  if (st !== undefined) { const k = seg(t, st, st + 0.3); css($('streak'), { opacity: Math.sin(Math.PI * k), top: `${lerp(700, 1300, (st * 7) % 1)}px`, transform: `translateX(${lerp(-600, 600, k)}px) rotate(-8deg)` }); }
  else $('streak').style.opacity = 0;
  // the scrim behind captions while the phone is up
  $('scrim').style.opacity = t >= 6.6 && t < 37.8 ? 1 - seg(t, 37.4, 37.8) : seg(t, 6.4, 6.6) * 0;
}

// ---------------------------------------------------------------- the frame
async function renderFrame(t) {
  const frame = Math.round(t * FPS);
  drawBackground(t);
  // the film's own swarm: the opening, then the end card's backdrop
  const sctx = $('swarmFx').getContext('2d');
  sctx.clearRect(0, 0, W, H);
  if (t < 4.3) {
    const alpha = seg(t, 0.35, 0.9) * (1 - seg(t, 3.7, 4.25));
    drawSwarm(sctx, t, 0.45, 'open', alpha, E.inOutCubic(seg(t, 2.75, 3.62)));
    // a lone point of light before the paths appear
    if (t < 0.9) {
      const k = 0.5 + 0.5 * Math.sin(t * 9);
      const g = sctx.createRadialGradient(120, 1110, 0, 120, 1110, 70);
      g.addColorStop(0, `rgba(255,244,210,${seg(t, 0.05, 0.4) * (0.7 + 0.3 * k)})`); g.addColorStop(1, 'rgba(216,173,78,0)');
      sctx.fillStyle = g; sctx.beginPath(); sctx.arc(120, 1110, 70, 0, Math.PI * 2); sctx.fill();
    }
  } else if (t >= T.end[0]) {
    drawSwarm(sctx, t, 39.2, 'end', 0.42 * seg(t, 39.3, 40.2));
  }
  // opening lines
  drawOpenText(t);
  drawTitle(t);
  // glow behind whatever is centre stage
  const p = poseAt(t);
  const glowOn = t < 6.4 ? seg(t, 3.5, 4.2) * 0.9 : t < 37.6 ? 1 : seg(t, 39.2, 40) * 0.8;
  const gx = t < 6.4 || t >= 39 ? 540 : p.x, gy = t < 6.4 ? 760 : t >= 39 ? 760 : p.y;
  css($('glow'), { opacity: glowOn * (0.75 + 0.25 * Math.sin(t * 1.1)), transform: `translate(${gx - 700}px, ${gy - 700}px)` });
  const phoneShown = drawPhone(t);
  if (phoneShown) await drawScreen(t);
  await drawPops(t);
  await drawFull(t);
  drawCaption(t);
  drawEnd(t);
  drawFx(t, frame);
}

function drawOpenText(t) {
  let box = $('openText');
  if (!box) {
    box = document.createElement('div');
    box.id = 'openText';
    box.style.cssText = 'position:absolute;left:0;right:0;top:420px;text-align:center';
    box.innerHTML = '<div id="o1" style="font:800 84px/1.05 \'TCP Display\';letter-spacing:-.025em;color:#F2ECDF">Every price</div>' +
      '<div id="o2" class="foil" style="margin-top:8px;font:italic 124px/1 Serif">has a probability.</div>';
    $('stage').insertBefore(box, $('title'));
  }
  const on = t < 3.2;
  box.style.display = on ? 'block' : 'none';
  if (!on) return;
  const out = E.inCubic(seg(t, 2.55, 3.0));
  const a = E.outCubic(seg(t, 0.55, 1.15));
  const b = E.outCubic(seg(t, 1.05, 1.7));
  css($('o1'), { opacity: a * (1 - out), transform: `translateY(${(1 - a) * 40 - out * 30}px)`, filter: `blur(${(1 - a) * 14 + out * 12}px)` });
  css($('o2'), { opacity: b * (1 - out), transform: `translateY(${(1 - b) * 40 - out * 30}px) scale(${1 + out * 0.05})`, filter: `blur(${(1 - b) * 14 + out * 12}px)` });
}

// ------------------------------------------------------------------- setup
window.filmReady = (async () => {
  const svg = `<defs><linearGradient id="foilG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6E3A3"/><stop offset="0.42" stop-color="#D8AD4E"/><stop offset="0.72" stop-color="#B0812F"/><stop offset="1" stop-color="#E3C06D"/></linearGradient></defs>` +
    `<path fill="url(#foilG)" fill-rule="evenodd" d="${CROWN.path}"/>` + CROWN.circles.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#foilG)"/>`).join('');
  $('crown').innerHTML = svg;
  $('endCrown').innerHTML = svg.replace(/foilG/g, 'foilE');
  await Promise.all(['800 40px "TCP Display"', '400 30px Archivo', '600 30px "JB Mono"', '500 30px "JB Mono"', 'italic 40px Serif'].map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  sampleCrown();
  makeGrain();
  // the colour of the strip under the app: the app's own nav bar
  const img = await load(shotUrl('markets', 0));
  const c = document.createElement('canvas'); c.width = c.height = 1;
  const cx = c.getContext('2d');
  cx.drawImage(img, 10, img.naturalHeight - 4, 1, 1, 0, 0, 1, 1);
  const [r, g, b] = cx.getImageData(0, 0, 1, 1).data;
  navColour = `rgb(${r},${g},${b})`;
  return true;
})();
window.renderFrame = renderFrame;
window.FILM = { W, H, FPS, DURATION };
