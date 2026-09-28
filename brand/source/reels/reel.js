// TCP reels: short 9:16 videos (1080 x 1920, 30 fps) drawn frame by frame. render.cjs loads a reel's
// spec (window.SPEC), its voice timings (window.VOICE, from voice.py), the app footage (window.SHOTS)
// and the crown (window.CROWN), then screenshots the stage after renderFrame(t) for every frame.
// Everything on screen is a function of t, so any frame can be drawn on its own, in any order.
'use strict';
const W = 1080, H = 1920, FPS = 30;
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
  inOutSine: (k) => -(Math.cos(Math.PI * k) - 1) / 2,
  outBack: (k) => { const c = 1.4; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; },
};
// 0 before a, 1 between a+fi and b-fo, 0 after b
const inOut = (t, a, b, fi = 0.35, fo = 0.3) => Math.min(E.outCubic(seg(t, a, a + fi)), 1 - E.inCubic(seg(t, b - fo, b)));
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r) => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
const css = (node, props) => { for (const k in props) node.style[k] = props[k]; };
function el(tag, cls, parent, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  if (parent) parent.appendChild(n);
  return n;
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Wrap each word so it can move on its own; *word* marks an accent word in gold.
const wordsOf = (text, cls = '') => String(text).split(/(\n|[ \t]+)/).map((w) => (w === '\n' ? '<br>' : /^\s+$/.test(w) ? w : `<span class="w${cls || /^\*.*\*$/.test(w) ? ' foil' : ''}">${esc(w.replace(/^\*|\*$/g, ''))}</span>`)).join('');
// Words stagger in from below, sharpening as they come.
function revealWords(root, t, a, step = 0.055, dur = 0.42) {
  root.querySelectorAll('.w').forEach((w, i) => {
    const k = E.outCubic(seg(t, a + i * step, a + i * step + dur));
    css(w, { opacity: k, transform: `translateY(${(1 - k) * 46}px)`, filter: k < 1 ? `blur(${(1 - k) * 10}px)` : 'none' });
  });
}

// ---------------------------------------------------------------------- time
// A time in the spec is seconds, or a voice line's id: 'b' is when it starts, 'b.end' when it ends,
// and either can take an offset: 'b+0.4', 'b.end-0.2'.
function at(x) {
  if (typeof x === 'number') return x;
  const m = /^([a-z][a-z0-9_]*)(\.end)?([+-][\d.]+)?$/i.exec(String(x));
  if (!m) throw new Error(`bad time ${x}`);
  const line = (window.VOICE && VOICE.lines.find((l) => l.id === m[1]));
  if (!line) throw new Error(`no voice line ${m[1]}`);
  return (m[2] ? line.end : line.start) + (m[3] ? Number(m[3]) : 0);
}

// ------------------------------------------------------------------- crown
function crownSvg(svg, id) {
  const c = window.CROWN;
  svg.innerHTML = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6E3A3"/><stop offset=".42" stop-color="#D8AD4E"/><stop offset=".72" stop-color="#B0812F"/><stop offset="1" stop-color="#E3C06D"/></linearGradient></defs>`
    + `<path fill="url(#${id})" fill-rule="evenodd" d="${c.path}"/>` + c.circles.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${id})"/>`).join('');
}

// -------------------------------------------------------------- background
const BG = { ctx: null, motes: [], path: [] };
function setupBackground() {
  BG.ctx = $('bg').getContext('2d');
  const r = rng(7);
  for (let i = 0; i < 34; i++) BG.motes.push({ x: r() * W, y: r() * H, s: 2 + r() * 5, v: 6 + r() * 16, ph: r() * 6.28, a: 0.05 + r() * 0.12 });
  // a slow price line drifting across the back: a random walk, for texture
  let y = 0;
  for (let i = 0; i < 400; i++) { y += gauss(r) * 6; y *= 0.985; BG.path.push(y); }
}
function drawBackground(t) {
  const c = BG.ctx;
  const g = c.createRadialGradient(540, -120, 60, 540, 300, 1500);
  g.addColorStop(0, '#2a2112');
  g.addColorStop(0.35, '#15120d');
  g.addColorStop(1, '#060504');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  // faint grid
  c.strokeStyle = 'rgba(216,173,78,0.035)';
  c.lineWidth = 1;
  const off = (t * 12) % 90;
  for (let x = -90 + off; x < W; x += 90) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
  for (let y = 0; y < H; y += 90) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  // the drifting price line
  c.beginPath();
  const shift = t * 26;
  for (let i = 0; i < BG.path.length; i++) {
    const x = i * 4 - (shift % 4);
    const y = 1640 + BG.path[(i + Math.floor(shift / 4)) % BG.path.length];
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.strokeStyle = 'rgba(216,173,78,0.10)';
  c.lineWidth = 3;
  c.stroke();
  // motes of gold dust
  for (const m of BG.motes) {
    const y = (m.y - t * m.v + H) % H;
    const x = m.x + Math.sin(t * 0.6 + m.ph) * 14;
    const a = m.a * (0.6 + 0.4 * Math.sin(t * 1.3 + m.ph));
    const rg = c.createRadialGradient(x, y, 0, x, y, m.s * 4);
    rg.addColorStop(0, `rgba(246,227,163,${a})`);
    rg.addColorStop(1, 'rgba(246,227,163,0)');
    c.fillStyle = rg;
    c.beginPath();
    c.arc(x, y, m.s * 4, 0, Math.PI * 2);
    c.fill();
  }
}

// ------------------------------------------------------------------- grain
const GRAIN = [];
function setupGrain() {
  const g = $('grain').getContext('2d');
  for (let i = 0; i < 6; i++) {
    const img = g.createImageData(540, 960);
    const r = rng(100 + i);
    for (let p = 0; p < img.data.length; p += 4) { const v = r() * 255; img.data[p] = img.data[p + 1] = img.data[p + 2] = v; img.data[p + 3] = 255; }
    GRAIN.push(img);
  }
}

// ---------------------------------------------------------------- subtitles
// Groups each line's words into short chunks (a few words, a phrase at a time), shown while spoken.
let CHUNKS = [];
function setupSubs() {
  CHUNKS = [];
  if (!window.VOICE) return;
  for (const line of VOICE.lines) {
    if (line.subs === false) continue;
    let cur = [];
    const push = () => { if (cur.length) CHUNKS.push({ words: cur, a: cur[0].s }); cur = []; };
    for (const w of line.words) {
      const len = cur.reduce((n, x) => n + x.w.length + 1, 0);
      if (cur.length && (len + w.w.length > (SPEC.subsChars || 16) || /[.,:;!?]$/.test(cur[cur.length - 1].w))) push();
      cur.push(w);
    }
    push();
  }
  CHUNKS.forEach((c, i) => { c.b = i + 1 < CHUNKS.length ? Math.min(CHUNKS[i + 1].a, c.words[c.words.length - 1].e + 0.6) : c.words[c.words.length - 1].e + 0.5; });
}
let subsKey = '';
function drawSubs(t) {
  const box = $('subs');
  const c = CHUNKS.find((x) => t >= x.a - 0.02 && t < x.b);
  const endCard = SCENES.find((x) => x.kind === 'end');
  if (!c || (endCard && t >= endCard.a) || (SPEC.subsOff && SPEC.subsOff.some(([a, b]) => t >= at(a) && t < at(b)))) { box.style.opacity = 0; return; }
  const key = String(c.a);
  if (key !== subsKey) {
    subsKey = key;
    box.innerHTML = c.words.map((w) => `<span class="w">${esc(w.w)}</span>`).join(' ');
  }
  const k = E.outBack(seg(t, c.a - 0.02, c.a + 0.16));
  css(box, { opacity: clamp(k * 1.4), transform: `translateY(${(1 - k) * 18}px) scale(${0.92 + 0.08 * k})`, top: `${SPEC.subsY || 1318}px` });
  box.querySelectorAll('.w').forEach((n, i) => {
    const w = c.words[i];
    const on = t >= w.s - 0.03 && (i + 1 >= c.words.length || t < c.words[i + 1].s - 0.03);
    n.classList.toggle('on', on);
    const pop = E.outCubic(seg(t, w.s - 0.03, w.s + 0.1));
    n.style.transform = on ? `scale(${1 + 0.06 * (1 - pop) + 0.02})` : 'none';
  });
}

// --------------------------------------------------------------- the scenes
// Each kind makes its DOM once, then draw(s, t) sets it for time t. s.a and s.b are the scene's
// start and end in seconds; s.p is how present it is (0 to 1), easing in and out.
const KINDS = {};

KINDS.kicker = {
  make(s, root) { s.node = el('div', 'kicker', root, `<i></i>${esc(s.text)}<i></i>`); s.node.style.top = `${s.y || 300}px`; },
  draw(s, t) { css(s.node, { opacity: s.p, letterSpacing: `${0.3 + (1 - s.p) * 0.2}em` }); },
};

KINDS.head = {
  make(s, root) {
    s.node = el('div', `head${s.small ? ' small' : ''}${s.big ? ' big' : ''}`, root);
    s.node.style.top = `${s.y || 380}px`;
    if (s.l1) el('div', 'l1', s.node, wordsOf(s.l1));
    if (s.l2) el('div', 'l2', s.node, wordsOf(s.l2, 'foil'));
    if (s.l3) el('div', 'l3', s.node, wordsOf(s.l3));
  },
  draw(s, t) {
    revealWords(s.node, t, s.a + (s.delay || 0), s.step || 0.06);
    const out = 1 - s.p;
    css(s.node, { opacity: s.pOut, transform: `translateY(${-out * 40}px) scale(${1 + (t - s.a) * 0.004})` });
  },
};

KINDS.note = {
  make(s, root) { s.node = el('div', 'note', root, esc(s.text)); s.node.style.top = `${s.y}px`; },
  draw(s) { s.node.style.opacity = s.p; },
};

// A row of trades turning over one by one, with the running total.
KINDS.tiles = {
  make(s, root) {
    s.node = el('div', 'tiles', root);
    s.node.style.top = `${s.y || 640}px`;
    s.tiles = s.items.map(() => el('div', 'tile', s.node, '?'));
    s.total = el('div', 'total', root, `${esc(s.totalLabel || 'TOTAL')}<b>£0</b>`);
    s.total.style.top = `${(s.y || 640) + Math.ceil(s.items.length / 5) * 172 + 40}px`;
    s.flips = s.items.map((_, i) => lerp(at(s.flip[0]), at(s.flip[1]), s.items.length > 1 ? i / (s.items.length - 1) : 0));
    s.cues = s.flips.map((ft) => ({ t: ft, sfx: 'tick' }));
  },
  draw(s, t) {
    let sum = 0;
    s.items.forEach((it, i) => {
      const tile = s.tiles[i];
      const k = seg(t, s.flips[i], s.flips[i] + 0.22);
      const shown = k > 0.5;
      if (shown) sum += it.value;
      tile.className = `tile${shown ? (it.value >= 0 ? ' win' : ' loss') : ''}`;
      tile.textContent = shown ? it.label : '?';
      const flip = Math.abs(Math.cos(k * Math.PI));
      tile.style.transform = `perspective(600px) rotateY(${k < 1 ? (1 - flip) * 90 * (k < 0.5 ? 1 : -1) : 0}deg) scale(${1 + 0.06 * Math.sin(k * Math.PI)})`;
      tile.style.opacity = clamp(seg(t, s.a, s.a + 0.3 + i * 0.03) * 1.2);
    });
    const b = s.total.querySelector('b');
    b.textContent = `${sum < 0 ? '−' : sum > 0 ? '+' : ''}£${Math.abs(sum)}`;
    b.style.color = sum < 0 ? '#FF8A6B' : sum > 0 ? '#7FE0C6' : '#F2ECDF';
    css(s.node, { opacity: s.p, transform: `translateY(${(1 - s.p) * 40}px)` });
    s.total.style.opacity = s.p * clamp(seg(t, s.flips[0], s.flips[0] + 0.3));
  },
};

// One big number, slammed in.
KINDS.stamp = {
  make(s, root) {
    s.node = el('div', `stamp${s.size === 'm' ? ' m' : ''}`, root, `<b class="${s.foil ? 'foil' : ''}">${esc(s.text)}</b>${s.sub ? `<span>${esc(s.sub)}</span>` : ''}`);
    s.node.style.top = `${s.y || 760}px`;
    if (s.color) s.node.querySelector('b').style.color = s.color;
    s.cues = [{ t: s.a, sfx: 'slam' }];
  },
  draw(s, t) {
    const k = E.outBack(seg(t, s.a, s.a + 0.32));
    const shake = t - s.a < 0.35 ? Math.sin((t - s.a) * 90) * (1 - seg(t, s.a, s.a + 0.35)) * 10 : 0;
    css(s.node, { opacity: s.pOut * clamp(k * 2), transform: `translateX(${shake}px) scale(${lerp(1.6, 1, clamp(k))})` });
    if (s.flash !== false) flash = Math.max(flash, (1 - seg(t, s.a, s.a + 0.4)) * (t >= s.a ? 0.55 : 0));
  },
};

// Rows (odds, rules of thumb), with one lit at a time.
KINDS.table = {
  make(s, root) {
    s.node = el('div', 'table', root);
    s.node.style.top = `${s.y || 600}px`;
    s.rows = s.rows.map((r) => ({ ...r, n: el('div', 'row', s.node, `<span>${esc(r.k)}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</span><b>${esc(r.v)}</b>`) }));
    s.cues = s.rows.filter((r) => r.hot).map((r) => ({ t: at(r.hot[0]), sfx: 'pop' }));
  },
  draw(s, t) {
    s.rows.forEach((r, i) => {
      const k = E.outCubic(seg(t, s.a + 0.12 * i, s.a + 0.12 * i + 0.45));
      const hot = r.hot && t >= at(r.hot[0]) && t < at(r.hot[1]);
      r.n.classList.toggle('hot', !!hot);
      css(r.n, { opacity: k * (s.dim && !hot && s.rows.some((x) => x.hot && t >= at(x.hot[0]) && t < at(x.hot[1])) ? 0.45 : 1), transform: `translateX(${(1 - k) * 80}px) scale(${hot ? 1.03 : 1})` });
    });
    css(s.node, { opacity: s.pOut, transform: `translateY(${(1 - s.p) * 30}px)` });
  },
};

// Accounts losing trade after trade: one bar each, shrinking with every loss.
KINDS.drain = {
  make(s, root) {
    s.cv = el('canvas', 'full', root);
    s.cv.width = W;
    s.cv.height = H;
    s.ctx = s.cv.getContext('2d');
    s.steps = s.losses || 10;
    s.t0 = at(s.run[0]);
    s.t1 = at(s.run[1]);
    s.cues = Array.from({ length: s.steps }, (_, i) => ({ t: lerp(s.t0, s.t1, (i + 1) / s.steps), sfx: 'tick' }));
  },
  draw(s, t) {
    const c = s.ctx;
    c.clearRect(0, 0, W, H);
    c.globalAlpha = s.pOut;
    const done = clamp((t - s.t0) / (s.t1 - s.t0)) * s.steps;
    const n = Math.floor(done + 1e-9);
    const y0 = s.y || 620;
    // loss counter
    c.font = '600 30px "JB Mono"';
    c.fillStyle = '#A69D8C';
    c.textAlign = 'center';
    c.fillText(`LOSING TRADES IN A ROW: ${n}`, 540, y0 - 30);
    s.accounts.forEach((a, i) => {
      const y = y0 + i * 190;
      const k = E.outCubic(seg(t, s.a + i * 0.1, s.a + i * 0.1 + 0.45));
      const eq = (1 - a.r) ** Math.min(done, s.steps);
      const x0 = 110, w = 860;
      c.save();
      c.translate((1 - k) * -120, 0);
      const hot = a.hot && t >= at(a.hot[0]) && t < at(a.hot[1]);
      const lit = s.accounts.some((x) => x.hot && t >= at(x.hot[0]) && t < at(x.hot[1]));
      c.globalAlpha = s.pOut * k * (lit && !hot ? 0.4 : 1);
      c.fillStyle = hot ? '#221d13' : '#16140F';
      c.strokeStyle = hot ? '#D8AD4E' : '#2E2A22';
      c.lineWidth = hot ? 4 : 2;
      if (hot) { c.shadowColor = 'rgba(216,173,78,.35)'; c.shadowBlur = 40; }
      roundRect(c, x0, y, w, 96, 26);
      c.fill();
      c.stroke();
      c.shadowBlur = 0;
      const fillW = Math.max(0, (w - 12) * eq);
      const grad = c.createLinearGradient(x0, 0, x0 + w, 0);
      const bad = eq < 0.7;
      grad.addColorStop(0, bad ? '#8c2e1c' : '#1e5b4d');
      grad.addColorStop(1, bad ? '#E0613F' : '#35A68C');
      c.fillStyle = grad;
      roundRect(c, x0 + 6, y + 6, fillW, 84, 21);
      c.fill();
      c.font = '800 44px "TCP Display"';
      c.textAlign = 'left';
      c.fillStyle = '#F2ECDF';
      c.fillText(`${a.label}`, x0 + 28, y + 64);
      c.font = '800 50px "TCP Display"';
      c.textAlign = 'right';
      c.fillStyle = eq < 0.999 ? (bad ? '#FFB39E' : '#F2ECDF') : '#F2ECDF';
      const pct = (eq - 1) * 100;
      c.fillText(`${pct < -0.05 ? '−' : ''}${Math.abs(pct).toFixed(1)}%`, x0 + w - 26, y + 66);
      c.restore();
    });
    c.globalAlpha = 1;
  },
};

// Compounding: a curve that outgrows its own chart, with the multiple called out.
KINDS.curve = {
  make(s, root) {
    s.cv = el('canvas', 'full', root);
    s.cv.width = W;
    s.cv.height = H;
    s.ctx = s.cv.getContext('2d');
    s.cues = (s.marks || []).map((m) => ({ t: at(m.at), sfx: 'pop' }));
  },
  draw(s, t) {
    const c = s.ctx;
    c.clearRect(0, 0, W, H);
    const box = { x: 120, y: s.y || 560, w: 840, h: 640 };
    // how far along the months the curve has got, and the scale, which follows the marks
    let months = 0;
    let top = 3.3;
    for (const m of s.marks) {
      const k = E.inOutCubic(seg(t, at(m.at) - 1.2, at(m.at)));
      if (k > 0) { months = Math.max(months, lerp(m.from || 0, m.m, k)); top = Math.max(top, lerp(m.prevTop || 3.3, m.top, E.inOutCubic(seg(t, at(m.at) - 1.2, at(m.at) - 0.1)))); }
    }
    const maxM = s.months;
    const X = (m) => box.x + (m / maxM) * box.w;
    const Y = (v) => box.y + box.h - ((v - 1) / (top - 1)) * box.h;
    c.globalAlpha = s.pOut;
    // axes
    c.strokeStyle = '#2E2A22';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(box.x, box.y);
    c.lineTo(box.x, box.y + box.h);
    c.lineTo(box.x + box.w, box.y + box.h);
    c.stroke();
    c.font = '500 24px "JB Mono"';
    c.fillStyle = '#8A8274';
    c.textAlign = 'right';
    c.fillText('×1', box.x - 14, box.y + box.h + 8);
    c.fillText(`×${top < 10 ? top.toFixed(1) : Math.round(top)}`, box.x - 14, box.y + 8);
    c.textAlign = 'center';
    for (const yrs of [1, 2, 3, 4, 5]) if (yrs * 12 <= maxM) c.fillText(`${yrs}y`, X(yrs * 12), box.y + box.h + 40);
    // the curve
    c.save();
    c.beginPath();
    c.rect(box.x, box.y - 40, box.w + 40, box.h + 40);
    c.clip();
    c.beginPath();
    for (let m = 0; m <= months; m += 0.25) {
      const v = (1 + s.rate) ** m;
      if (m === 0) c.moveTo(X(m), Y(v)); else c.lineTo(X(m), Y(v));
    }
    const g = c.createLinearGradient(0, box.y + box.h, 0, box.y);
    g.addColorStop(0, '#B0812F');
    g.addColorStop(1, '#F6E3A3');
    c.strokeStyle = g;
    c.lineWidth = 7;
    c.lineJoin = 'round';
    c.shadowColor = 'rgba(216,173,78,.6)';
    c.shadowBlur = 24;
    c.stroke();
    c.restore();
    // the multiple, for the latest mark reached
    const reached = s.marks.filter((m) => t >= at(m.at) - 0.05);
    const m = reached[reached.length - 1];
    if (m) {
      const v = (1 + s.rate) ** m.m;
      const k = E.outBack(seg(t, at(m.at), at(m.at) + 0.35));
      const px = Math.min(X(m.m), box.x + box.w), py = clamp(Y(v), box.y, box.y + box.h);
      c.fillStyle = '#F6E3A3';
      c.beginPath();
      c.arc(px, py, 12 * k, 0, Math.PI * 2);
      c.fill();
      c.textAlign = 'left';
      c.font = '800 110px "TCP Display"';
      c.fillStyle = '#F6E3A3';
      c.globalAlpha = s.pOut * clamp(k * 1.5);
      c.fillText(m.label, box.x + 40, box.y + 110);
      c.font = '600 28px "JB Mono"';
      c.fillStyle = '#A69D8C';
      c.fillText(m.sub, box.x + 44, box.y + 160);
    }
    c.globalAlpha = 1;
  },
};

// A hundred coin flips (or trades) filling a grid, then the longest losing run lit up.
KINDS.coins = {
  make(s, root) {
    s.cv = el('canvas', 'full', root);
    s.cv.width = W;
    s.cv.height = H;
    s.ctx = s.cv.getContext('2d');
    // find a run of flips whose longest losing streak is exactly s.streak
    let seed = s.seed || 1;
    for (;;) {
      const r = rng(seed);
      const flips = Array.from({ length: 100 }, () => r() < 0.5);
      let best = 0, run = 0, end = -1;
      flips.forEach((win, i) => { run = win ? 0 : run + 1; if (run > best) { best = run; end = i; } });
      if (best === s.streak) { s.flips = flips; s.run = [end - best + 1, end]; break; }
      seed++;
    }
    s.t0 = at(s.fill[0]);
    s.t1 = at(s.fill[1]);
    s.hl = at(s.highlight);
    s.cues = [{ t: s.hl, sfx: 'slam' }];
  },
  draw(s, t) {
    const c = s.ctx;
    c.clearRect(0, 0, W, H);
    c.globalAlpha = s.pOut;
    const size = s.size || 70, gap = Math.round(size * 0.17), cols = 10;
    const x0 = (W - (cols * size + (cols - 1) * gap)) / 2, y0 = s.y || 520;
    const shown = clamp((t - s.t0) / (s.t1 - s.t0)) * 100;
    const lit = E.outCubic(seg(t, s.hl, s.hl + 0.5));
    s.flips.forEach((win, i) => {
      const k = clamp(shown - i);
      if (k <= 0) return;
      const x = x0 + (i % cols) * (size + gap) + size / 2;
      const y = y0 + Math.floor(i / cols) * (size + gap) + size / 2;
      const inRun = i >= s.run[0] && i <= s.run[1];
      const r = (size / 2 - 3) * E.outBack(k);
      c.globalAlpha = s.pOut * (lit > 0 && !inRun ? 1 - 0.65 * lit : 1);
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fillStyle = win ? 'rgba(53,166,140,.22)' : 'rgba(224,97,63,.22)';
      c.fill();
      c.lineWidth = inRun && lit > 0 ? 3 + 3 * lit : 3;
      c.strokeStyle = win ? '#35A68C' : '#E0613F';
      c.stroke();
      c.fillStyle = win ? '#7FE0C6' : '#FFB39E';
      c.font = `800 ${Math.round(size * 0.43)}px "TCP Display"`;
      c.textAlign = 'center';
      c.fillText(win ? 'W' : 'L', x, y + size * 0.155);
      if (inRun && lit > 0) {
        c.save();
        c.globalAlpha = s.pOut * lit;
        c.shadowColor = '#E0613F';
        c.shadowBlur = 30;
        c.strokeStyle = '#FF8A6B';
        c.lineWidth = 4;
        c.beginPath();
        c.arc(x, y, r + 5, 0, Math.PI * 2);
        c.stroke();
        c.restore();
      }
    });
    c.globalAlpha = 1;
  },
};

// Ticks and crosses, one at a time.
KINDS.list = {
  make(s, root) {
    s.node = el('div', 'list', root);
    s.node.style.top = `${s.y || 560}px`;
    s.items = s.items.map((it) => ({ ...it, n: el('div', `item ${it.ok ? 'yes' : 'no'}`, s.node, `<i>${it.ok ? '✓' : '✕'}</i><span>${esc(it.text)}</span>`) }));
    s.times = s.items.map((it, i) => (it.at != null ? at(it.at) : s.a + 0.2 + i * (s.step || 0.6)));
    s.cues = s.times.map((x, i) => ({ t: x, sfx: s.items[i].ok ? 'pop' : 'tick' }));
  },
  draw(s, t) {
    s.items.forEach((it, i) => {
      const k = E.outBack(seg(t, s.times[i], s.times[i] + 0.35));
      css(it.n, { opacity: clamp(k * 1.5), transform: `translateX(${(1 - clamp(k)) * 120}px) scale(${0.9 + 0.1 * k})` });
    });
    css(s.node, { opacity: s.pOut, transform: `translateY(${(1 - s.p) * 30}px)` });
  },
};

// Two cards, side by side. With `reveal`, both stay neutral and their marks hidden until then, so
// viewers can guess first.
KINDS.vs = {
  make(s, root) {
    s.node = el('div', 'vs', root);
    s.node.style.top = `${s.y || 620}px`;
    s.cards = [s.left, s.right].map((d) => el('div', `card ${d.good ? 'good' : 'bad'}`, s.node, `<small>${esc(d.small)}</small><b>${esc(d.big)}</b><span>${esc(d.span)}</span><i>${esc(d.mark)}</i>`));
    s.marks = s.cards.map((n) => n.querySelector('i'));
    s.times = [at(s.left.at || s.a), at(s.right.at || s.a + 0.6)];
    s.shown = s.reveal == null ? null : at(s.reveal);
    s.cues = s.times.map((x) => ({ t: x, sfx: 'pop' }));
    if (s.shown != null) s.cues.push({ t: s.shown, sfx: 'slam' });
  },
  draw(s, t) {
    s.cards.forEach((n, i) => {
      const k = E.outBack(seg(t, s.times[i], s.times[i] + 0.4));
      css(n, { opacity: clamp(k * 1.5), transform: `translateY(${(1 - clamp(k)) * 80}px) scale(${0.92 + 0.08 * k})` });
      if (s.shown != null) n.classList.toggle('hold', t < s.shown);
    });
    if (s.shown != null) {
      const k = E.outBack(seg(t, s.shown, s.shown + 0.35));
      for (const m of s.marks) css(m, { opacity: clamp(k * 1.4), transform: `scale(${0.5 + 0.5 * k})` });
    }
    css(s.node, { opacity: s.pOut });
  },
};

// Records chained one to the next, so a later change would show.
KINDS.chain = {
  make(s, root) {
    s.node = el('div', 'chain', root);
    s.node.style.top = `${s.y || 560}px`;
    s.blocks = s.blocks.map((b, i) => {
      const n = el('div', 'block', s.node, `<em>#${esc(b.hash)}</em><b>${esc(b.title)}</b><span>${esc(b.meta)}</span>`);
      const link = i ? el('div', 'link', n) : null;
      if (link) link.style.top = '-66px';
      return { n, link, t: b.at != null ? at(b.at) : s.a + 0.3 + i * 0.7 };
    });
    s.cues = s.blocks.map((b) => ({ t: b.t, sfx: 'pop' }));
  },
  draw(s, t) {
    s.blocks.forEach((b) => {
      const k = E.outCubic(seg(t, b.t, b.t + 0.45));
      css(b.n, { opacity: k, transform: `translateY(${(1 - k) * -60}px)` });
      if (b.link) b.link.style.transform = `scaleY(${E.outCubic(seg(t, b.t + 0.2, b.t + 0.6))})`, b.link.style.transformOrigin = 'top';
    });
    css(s.node, { opacity: s.pOut });
  },
};

// The real app in a phone, from footage captured in demo mode.
const images = new Map();
function load(url) {
  if (!images.has(url)) {
    images.set(url, new Promise((res) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = url;
    }));
  }
  return images.get(url);
}
function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
KINDS.phone = {
  make(s, root) {
    s.wrap = el('div', 'layer', root);
    s.wrap.style.perspective = '2600px';
    s.phone = el('div', 'phone', s.wrap, '<div class="shell"></div><div class="box"><canvas width="780" height="1688"></canvas><div class="glare"></div></div><div class="island"></div>');
    s.ctx = s.phone.querySelector('canvas').getContext('2d');
    s.tag = el('div', 'demo-tag', root, esc(s.tag || 'DEMO PRICES'));
  },
  async draw(s, t) {
    const pose = poseAt(s, t);
    css(s.phone, { transform: `translate(${pose.x - 302}px, ${pose.y - 630}px) rotateX(${pose.rx}deg) rotateY(${pose.ry}deg) rotateZ(${pose.rz}deg) scale(${pose.s})` });
    s.wrap.style.opacity = s.pOut;
    css(s.tag, { opacity: s.pOut * 0.95, left: `${pose.x - 110}px`, top: `${pose.y + 630 * pose.s + 26}px` });
    // which shot, and which of its frames
    const cut = (s.shots || [{ shot: s.shot, from: s.a, u0: s.u0 || 0, speed: s.speed || 1 }]).filter((x) => t >= at(x.from)).pop();
    if (!cut) return;
    const shot = window.SHOTS[cut.shot];
    if (!shot) return;
    const u = (cut.u0 || 0) + (t - at(cut.from)) * (cut.speed || 1);
    const i = clamp(Math.floor(u * FPS), 0, shot.frames.length - 1);
    const im = await load(shot.frames[i]);
    const c = s.ctx;
    c.fillStyle = '#0E0D0B';
    c.fillRect(0, 0, 780, 1688);
    if (im) {
      // the app is 390 x 713 CSS px at 3x; Telegram's header sits above it
      const sc = 780 / im.width;
      c.drawImage(im, 0, 1688 - im.height * sc, 780, im.height * sc);
      c.fillStyle = '#12110e';
      c.fillRect(0, 0, 780, 1688 - im.height * sc);
    }
    statusBar(c, 1688 - (im ? im.height * (780 / im.width) : 1688));
  },
};
function poseAt(s, t) {
  const keys = s.pose || [{ t: s.a, x: 540, y: 1000, s: 0.86, rx: 6, ry: -12, rz: 0 }];
  const k = keys.map((p) => ({ ...p, t: at(p.t) }));
  if (t <= k[0].t) return k[0];
  for (let i = 1; i < k.length; i++) {
    if (t <= k[i].t) {
      const e = E.inOutCubic(seg(t, k[i - 1].t, k[i].t));
      const o = {};
      for (const f of ['x', 'y', 's', 'rx', 'ry', 'rz']) o[f] = lerp(k[i - 1][f], k[i][f], e);
      return o;
    }
  }
  return k[k.length - 1];
}
// A phone status bar and Telegram's Mini App header over the top of the footage.
function statusBar(c, h) {
  if (h < 60) return;
  c.fillStyle = '#F2ECDF';
  c.font = '600 34px -apple-system, "Archivo"';
  c.textAlign = 'left';
  c.fillText('9:41', 64, 70);
  c.textAlign = 'right';
  c.fillText('100%', 716, 70);
  c.textAlign = 'center';
  c.font = '600 32px "Archivo"';
  c.fillText('TCP Quant Terminal', 390, h - 40);
  c.font = '400 24px "Archivo"';
  c.fillStyle = '#A69D8C';
  c.fillText('mini app', 390, h - 10);
  c.textAlign = 'left';
  c.fillStyle = '#D8AD4E';
  c.font = '400 30px "Archivo"';
  c.fillText('Close', 34, h - 26);
}

// Gold dust: paths that wander like prices, then gather into the crown.
KINDS.swarm = {
  make(s, root) {
    s.cv = el('canvas', 'full', root);
    s.cv.width = W;
    s.cv.height = H;
    s.ctx = s.cv.getContext('2d');
    const r = rng(s.seed || 11);
    s.n = s.n || 260;
    s.paths = Array.from({ length: s.n }, () => {
      const pts = [];
      let y = 0;
      for (let i = 0; i <= 120; i++) { pts.push(y); y += gauss(r) * 5.5; }
      return { pts, a: r() * 1.4, hue: r() };
    });
    // points on the crown, in a 360-px-wide box around (540, 900)
    const probe = document.createElement('canvas');
    probe.width = 360;
    probe.height = 294;
    const pc = probe.getContext('2d');
    const path = new Path2D(window.CROWN.path);
    pc.scale(360 / 238.4, 294 / 194.2);
    pc.translate(19.2, 19.53);
    const inside = [];
    for (let tries = 0; inside.length < s.n && tries < 50000; tries++) {
      const x = r() * 238.4 - 19.2, y = r() * 194.2 - 19.53;
      const inCircle = window.CROWN.circles.some(([cx, cy, cr]) => (x - cx) ** 2 + (y - cy) ** 2 < cr * cr);
      if (pc.isPointInPath(path, (x + 19.2) * (360 / 238.4), (y + 19.53) * (294 / 194.2), 'evenodd') || inCircle) inside.push([540 - 180 + (x + 19.2) * (360 / 238.4), (s.cy || 900) - 147 + (y + 19.53) * (294 / 194.2)]);
    }
    s.targets = inside;
    s.gather = s.gather != null ? at(s.gather) : null;
    if (s.gather != null) s.cues = [{ t: s.gather, sfx: 'rise' }, { t: s.gather + 1.1, sfx: 'slam' }];
  },
  draw(s, t) {
    const c = s.ctx;
    c.clearRect(0, 0, W, H);
    const local = t - s.a;
    const g = s.gather != null ? E.inOutCubic(seg(t, s.gather, s.gather + 1.1)) : 0;
    c.globalCompositeOperation = 'lighter';
    s.paths.forEach((p, i) => {
      // each path runs left to right across the screen from the centre line, on its own clock
      const cyc = ((local * 0.32 + p.a) % 1.4) / 1.4;
      const head = cyc * 120;
      const x0 = 60, span = 960, yc = s.cy || 900;
      const px = (j) => x0 + (j / 120) * span;
      const py = (j) => yc + p.pts[Math.floor(j)] * 3.2;
      const hx = px(head), hy = py(head);
      const tgt = s.targets[i % s.targets.length] || [540, yc];
      const x = lerp(hx, tgt[0], g), y = lerp(hy, tgt[1], g);
      const alpha = s.pOut * (g > 0 ? 0.55 + 0.45 * g : 0.5 * Math.sin(cyc * Math.PI));
      if (g < 0.95) {
        c.strokeStyle = `rgba(216,173,78,${0.10 * (1 - g) * s.pOut})`;
        c.lineWidth = 2;
        c.beginPath();
        for (let j = Math.max(0, head - 18); j <= head; j += 1) {
          const xx = lerp(px(j), tgt[0], g), yy = lerp(py(j), tgt[1], g);
          if (j === Math.max(0, head - 18)) c.moveTo(xx, yy); else c.lineTo(xx, yy);
        }
        c.stroke();
      }
      const rad = 3.2 + 2 * g;
      const rg = c.createRadialGradient(x, y, 0, x, y, rad * 3);
      rg.addColorStop(0, `rgba(255,240,200,${alpha})`);
      rg.addColorStop(0.4, `rgba(216,173,78,${alpha * 0.7})`);
      rg.addColorStop(1, 'rgba(216,173,78,0)');
      c.fillStyle = rg;
      c.beginPath();
      c.arc(x, y, rad * 3, 0, Math.PI * 2);
      c.fill();
    });
    c.globalCompositeOperation = 'source-over';
    if (s.gather != null) flash = Math.max(flash, (1 - seg(t, s.gather + 1.1, s.gather + 1.6)) * (t >= s.gather + 1.1 ? 0.7 : 0));
  },
};

// The end card.
KINDS.end = {
  make(s, root) {
    s.node = el('div', 'end', root, `<svg viewBox="-19.2 -19.53 238.4 194.2"></svg><div class="tcp foil">TCP</div><div class="what">${esc(s.what || 'THE CRYPTO PLAYBOOK')}</div>`
      + `<div class="cta">${esc(s.cta || 'Follow for more')}</div>${s.sub ? `<div class="sub">${wordsOf(s.sub)}</div>` : ''}<div class="risk">${esc(s.risk || 'Education, not financial advice. Trading carries risk.').replace(/\n/g, '<br>')}</div>`);
    crownSvg(s.node.querySelector('svg'), `endfoil${Math.random().toString(36).slice(2, 7)}`);
    s.cues = [{ t: s.a, sfx: 'whoosh' }];
  },
  draw(s, t) {
    const k = E.outCubic(seg(t, s.a, s.a + 0.6));
    const parts = s.node.children;
    [...parts].forEach((n, i) => {
      const kk = E.outCubic(seg(t, s.a + i * 0.08, s.a + i * 0.08 + 0.5));
      css(n, { opacity: kk, transform: `${n.tagName === 'svg' ? '' : ''}translateY(${(1 - kk) * 40}px)` });
    });
    const sub = s.node.querySelector('.sub');
    if (sub) revealWords(sub, t, s.a + 0.5);
    s.node.style.opacity = Math.min(k, s.pOut);
  },
};

// ------------------------------------------------------------------ assemble
let SCENES = [];
let flash = 0;
function setupScenes() {
  const root = $('scenes');
  root.innerHTML = '';
  SCENES = SPEC.scenes.map((spec) => {
    const s = { ...spec };
    s.a = at(s.from);
    s.b = at(s.to);
    s.root = el('div', 'layer', root);
    KINDS[s.kind].make(s, s.root);
    return s;
  });
}
// Every moment the sound should mark: taken by render.cjs for the mix.
function cues() {
  return SCENES.flatMap((s) => (s.cues || []).map((c) => ({ ...c, t: Math.round(c.t * 1000) / 1000 }))).concat(SPEC.cues ? SPEC.cues.map((c) => ({ ...c, t: at(c.t) })) : []);
}

async function renderFrame(t) {
  drawBackground(t);
  flash = 0;
  for (const s of SCENES) {
    const on = t >= s.a - 0.01 && t < s.b + 0.01;
    s.root.style.display = on ? 'block' : 'none';
    if (!on) continue;
    s.p = inOut(t, s.a, s.b, s.fi ?? 0.35, s.fo ?? 0.3);
    s.pOut = 1 - E.inCubic(seg(t, s.b - (s.fo ?? 0.3), s.b));
    await KINDS[s.kind].draw(s, t);
  }
  // the brand bug stays, except over the end card
  const endAt = SCENES.find((s) => s.kind === 'end');
  $('bug').style.opacity = endAt ? 1 - seg(t, endAt.a, endAt.a + 0.3) : 1;
  drawSubs(t);
  $('flash').style.opacity = flash;
  $('grain').getContext('2d').putImageData(GRAIN[Math.floor(t * FPS) % GRAIN.length], 0, 0);
}

window.renderFrame = renderFrame;
window.reelCues = () => cues();
window.reelReady = (async () => {
  await Promise.all(['400 20px "Archivo"', '800 20px "TCP Display"', '500 20px "JB Mono"', '600 20px "JB Mono"', 'italic 20px "Serif"'].map((f) => document.fonts.load(f)));
  crownSvg(document.querySelector('#bug svg'), 'bugfoil');
  setupBackground();
  setupGrain();
  setupSubs();
  setupScenes();
  $('safe').classList.toggle('on', !!window.SHOW_SAFE);
  return true;
})();
