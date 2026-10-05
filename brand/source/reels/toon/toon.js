// TCP toons: the animated founder episodes, drawn by the reel engine one frame at a time. A spec loads
// this with founder.js (modules: ['toon/founder.js', 'toon/toon.js']) and uses three more kinds:
//
//   toon       one shot: a set ('desk', 'ots', 'screen', 'mouse') seen through a camera, with the founder
//              and the story chart. { set, cam: [{ t, s, x, y }], pose, chart, dof: { bg, fg, all }, hits: [t] }
//              A chart key with story: 'clutter' draws EP08's chart instead (indicators, a menu, levels).
//   caption    meme-style text, one thought at a time { text, y, size }; a numbered lesson card
//              { style: 'note', num, text, sub }; or a line of steps { style: 'steps', text }
//   handPhone  the real app in a phone, held in his hand (the phone kind, plus a hand)
//
// Times are seconds or voice-line ids. A spec gives every shot the same pose track and chart track,
// so a cut never changes what he's doing or where the price is. Poses blend between keys, with blinks
// and breathing added. Sets are drawn in layers that move at their own depth, for parallax.
(function () {
  const F = window.Founder;
  const n = (v) => Math.round(v * 100) / 100;
  const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const mix = (a, b, k) => a + (b - a) * k;
  const easeIO = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const easeOut = (k) => 1 - Math.pow(1 - k, 3);
  const UP = '#35A68C', DOWN = '#E0613F', GOLD = '#D8AD4E', GOLDHI = '#F6E3A3';

  const style = document.createElement('style');
  style.textContent = `
    .toon { position: absolute; inset: 0; overflow: hidden; background: #0B0908; }
    .toon svg { position: absolute; left: 0; top: 0; }
    .toon .hit { position: absolute; inset: 0; background: radial-gradient(75% 55% at 50% 50%, rgba(224,97,63,0) 40%, rgba(224,97,63,.55) 100%); opacity: 0; }
    .caption { position: absolute; left: 60px; right: 60px; text-align: center; font: 800 66px/1.08 "TCP Display"; letter-spacing: -0.02em; color: #F7F2E8;
      text-shadow: 0 5px 0 rgba(0,0,0,.6), 0 0 34px rgba(0,0,0,.85), 0 0 6px rgba(0,0,0,.9); transform-origin: 50% 60%; }
    .caption .w { margin: 0 .1em; }
    .caption.note { display: grid; grid-template-columns: auto auto; justify-content: center; align-items: center; column-gap: 28px; text-align: left; text-shadow: none; }
    .caption.note i { grid-row: span 2; width: 104px; height: 104px; border-radius: 50%; background: linear-gradient(180deg, #F6E3A3, #D8AD4E 60%, #C29640); color: #15110A;
      font: 800 60px/104px "TCP Display"; font-style: normal; text-align: center; box-shadow: 0 10px 40px rgba(216,173,78,.35); }
    .caption.note b { font: 800 62px/1 "TCP Display"; letter-spacing: -0.02em; color: #F6E3A3; text-shadow: 0 4px 24px rgba(0,0,0,.8); }
    .caption.note span { margin-top: 12px; font: 400 42px/1.15 "Archivo"; color: #F2ECDF; text-shadow: 0 3px 18px rgba(0,0,0,.8); }
    .caption.steps { font: 600 44px/1.2 "JB Mono"; letter-spacing: .06em; color: #F6E3A3; }
    .phone .hand { position: absolute; overflow: visible; pointer-events: none; }`;
  document.head.appendChild(style);

  // ------------------------------------------------------------ keyframes
  function keyed(keys, t, blend) {
    const ks = keys.map((k) => ({ ...k, at: at(k.t) }));
    if (t <= ks[0].at) return ks[0];
    for (let i = 0; i < ks.length - 1; i++) {
      const a = ks[i], b = ks[i + 1];
      if (t < b.at) return blend(a, b, (b.ease === 'out' ? easeOut : b.ease === 'linear' ? (k) => k : easeIO)(cl((t - a.at) / Math.max(1e-6, b.at - a.at))));
    }
    return ks[ks.length - 1];
  }
  const numBlend = (a, b, k) => { const o = {}; for (const key in a) o[key] = typeof a[key] === 'number' && typeof b[key] === 'number' ? mix(a[key], b[key], k) : (k < 0.5 ? a[key] : b[key]); return o; };

  // The founder at time t: the keys (partial poses) blended, then life: blinks every 2.6 to 4.2 s and
  // breathing. Two keys a moment apart make a change happen on a cut rather than as a move.
  function founderAt(keys, t, seed = 3) {
    const full = keys.map((k) => ({ t: k.t, ease: k.ease, p: F.pose(k.pose || {}) }));
    const p = keyed(full, t, (a, b, k) => ({ p: F.blendPose(a.p, b.p, k) })).p;
    const out = JSON.parse(JSON.stringify(p));
    const r = rng(seed);
    for (let bt = 0.6 + r() * 1.2; bt < t + 1; bt += 2.6 + r() * 1.6) {
      const d = t - bt;
      if (d > 0 && d < 0.16) out.blink = Math.max(out.blink, 1 - Math.abs(d - 0.07) / 0.09);
    }
    out.blink = cl(out.blink);
    out.head.dy += Math.sin(t * Math.PI * 2 / 3.8) * 1.4;
    out.head.rot += Math.sin(t * Math.PI * 2 / 5.3 + 1) * 0.5;
    out.lean += Math.sin(t * Math.PI * 2 / 3.8) * 0.2;
    return out;
  }

  // ------------------------------------------------------------ the story chart
  // An example, not a market's history: a range, a breakout that fails, a breakdown that sweeps the
  // lows and rips back, a higher high, a pullback, then the move. Prices are chart units.
  const OHLC = [
    [52, 52, 54.5, 50.6], [52, 55, 56.2, 51.2], [55, 59, 60, 54.2], [59, 57, 60.4, 56], [57, 62, 63, 56.4], [62, 66, 68.6, 61.4],
    [66, 63, 66.8, 62], [63, 59, 63.6, 58.2], [59, 55, 59.8, 54], [55, 50, 55.6, 49], [50, 46, 50.8, 44.6], [46, 43, 46.6, 40.8],
    [43, 45, 46, 41.6], [45, 49, 49.8, 44.2], [49, 53, 54, 48.4], [53, 57, 58, 52.2], [57, 60, 61.2, 56.4], [60, 63, 64, 59.2],
    [63, 65, 66.2, 62.4], [65, 67, 69.4, 64.2], [67, 66, 68.2, 64.8], [66, 64, 66.6, 62.8], [64, 66, 67, 63.4], [66, 68.5, 69.6, 65.6],
    [68.5, 74.5, 75.6, 68], // 24: the breakout everyone buys
    [74.5, 60, 75, 58.8],   // 25: the slam
    [60, 62, 62.6, 59], [62, 60, 61.4, 58.6], [60, 56, 60.6, 55], [56, 52, 56.8, 51.2], [52, 48, 52.4, 47], [48, 45, 48.8, 44],
    [45, 42, 45.6, 41.2], [42, 37.5, 42.4, 36.8], // 33: the breakdown everyone sells
    [37.5, 36.5, 38.4, 33],  // 34: the sweep of the lows
    [36.5, 50, 51, 36],      // 35: the rip
    [50, 54, 55, 49.2], [54, 59, 59.8, 53.4], [59, 64, 65, 58.4], // 38: above the last lower high: a higher high
    [64, 60, 64.6, 59.4], [60, 56, 60.6, 55.2], [56, 53, 56.4, 51.6], // 41: the pullback
    [53, 56, 56.8, 52.6], [56, 59, 59.8, 55.4], [59, 63, 63.8, 58.4], [63, 61, 63.6, 60.2], [61, 66, 66.8, 60.6], [66, 70, 70.8, 65.4],
    [70, 73, 74, 69.2], [73, 72, 74.2, 71], [72, 76, 76.8, 71.6], [76, 80, 80.6, 75.4], [80, 83, 84.2, 79.2], [83, 81, 83.6, 80], [81, 86, 86.8, 80.6], [86, 90, 91, 85.4],
  ].map(([o, c, h, l]) => ({ o, c, h, l }));
  const RANGE = { hi: 70, lo: 40 };
  const LOWER_HIGH = { i: 26, p: 62.6 };

  // A forming candle's close, high and low at fraction k of its life.
  function forming(c, k) {
    const e = easeOut(cl(k));
    const close = c.o + (c.c - c.o) * e;
    return { close, hi: Math.max(c.o, close) + (c.h - Math.max(c.o, c.c)) * e, lo: Math.min(c.o, close) - (Math.min(c.o, c.c) - c.l) * e };
  }
  // The fraction of a candle's life at which it first reaches a price.
  function reach(c, price) {
    let a = 0, b = 1;
    const hit = (k) => { const f = forming(c, k); return f.lo <= price && price <= f.hi; };
    if (!hit(1)) return 1;
    for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (hit(m)) b = m; else a = m; }
    return b;
  }
  // His two trades. `at` is when the order goes in (as a candle count), `out` when the stop is hit.
  const TRADES = [
    { side: 'BUY', i: 24, at: 24.7, entry: 74.5, stop: 67, label: 'breakout buy' },
    { side: 'SELL', i: 33, at: 33.7, entry: 37.5, stop: 43.5, label: 'fakeout sell' },
  ];
  TRADES[0].out = 25 + reach(OHLC[25], TRADES[0].stop);
  TRADES[1].out = 35 + reach(OHLC[35], TRADES[1].stop);
  // A chart key's candle count can name a moment: 'buy', 'stop1', 'sell', 'stop2'.
  const MARK = { buy: TRADES[0].at, stop1: TRADES[0].out, sell: TRADES[1].at, stop2: TRADES[1].out };
  const markOf = (v) => (typeof v === 'string' ? MARK[v] : v);

  // The chart's state at t: candles shown (i), replay notes shown (notes, fractional fades the next in),
  // how far his trades fade back (dim), and the REPLAY badge (replay).
  function chartAt(keys, t) {
    if (!keys) return { i: 0, notes: 0, dim: 0, replay: 0 };
    const ks = keys.map((k) => ({ notes: 0, dim: 0, replay: 0, ...k, i: markOf(k.i) }));
    return keyed(ks, t, numBlend);
  }
  // The colour the screen throws on his face: the latest candle's, stronger the bigger it is.
  function glowOf(st) {
    if (st.story === 'clutter') {
      const k = cl((st.ind || 0) / 27), a = [159, 194, 255], b = [196, 168, 255];
      return `rgb(${a.map((v, j) => Math.round(mix(v, b[j], k))).join(',')})`;
    }
    const i = Math.max(0, Math.min(OHLC.length - 1, Math.floor(st.i - 0.001)));
    const c = OHLC[i];
    const f = forming(c, cl(st.i - i));
    const size = cl((Math.abs(f.close - c.o) - 3) / 9);
    const base = [159, 194, 255], to = f.close < c.o ? [255, 110, 84] : [92, 224, 184];
    return `rgb(${base.map((v, j) => Math.round(mix(v, to[j], size * 0.85))).join(',')})`;
  }

  // The chart, 860 x 560, in the chart's own units. Every set scales this same drawing.
  const CW = 860, CH = 560;
  function chartSVG(st, id, bare = false) {
    if (st.story === 'clutter') return clutterSVG(st, id, bare);
    const pmin = 28, pmax = 96, padL = 22, padR = 22, top = 70, bot = 26;
    const step = (CW - padL - padR) / OHLC.length;
    const y = (p) => top + (1 - (p - pmin) / (pmax - pmin)) * (CH - top - bot);
    const x = (i) => padL + step * (i + 0.5);
    const shown = cl(st.i, 0, OHLC.length);
    const full = Math.floor(shown), frac = shown - full;
    const o = [];
    o.push(`<rect width="${CW}" height="${CH}" rx="6" fill="#0A0D11"/>`);
    for (let g = 1; g < 6; g++) { const gy = n(top + (CH - top) * g / 6); o.push(`<line x1="0" x2="${CW}" y1="${gy}" y2="${gy}" stroke="#161C24" stroke-width="1.5"/>`); }
    for (let g = 1; g < 8; g++) { const gx = n(CW * g / 8); o.push(`<line y1="${top - 10}" y2="${CH}" x1="${gx}" x2="${gx}" stroke="#131820" stroke-width="1.5"/>`); }
    o.push(`<rect width="${CW}" height="48" fill="#0E1218"/><line x1="0" x2="${CW}" y1="48" y2="48" stroke="#1E2630" stroke-width="2"/>`);
    if (!bare) o.push(`<circle cx="26" cy="24" r="6" fill="${GOLD}"/>
      <text x="42" y="31" font-family="JB Mono" font-weight="600" font-size="19" fill="#C9D1DC" letter-spacing="2">EXAMPLE CHART</text>
      <text x="252" y="31" font-family="JB Mono" font-weight="500" font-size="17" fill="#5F6A78" letter-spacing="1">not real prices</text>`);
    if (st.replay > 0.01 && !bare) {
      o.push(`<g opacity="${n(st.replay)}" transform="translate(${CW - 150} 10)"><rect width="136" height="28" rx="6" fill="${GOLD}"/>
        <path d="M 16 14 L 26 7 L 26 21 Z M 27 14 L 37 7 L 37 21 Z" fill="#14110C"/>
        <text x="46" y="21" font-family="JB Mono" font-weight="600" font-size="16" fill="#14110C" letter-spacing="2">REPLAY</text></g>`);
    }
    for (const [p, label] of [[RANGE.hi, 'RANGE HIGH'], [RANGE.lo, 'RANGE LOW']]) {
      o.push(`<line x1="${padL}" x2="${CW - padR}" y1="${n(y(p))}" y2="${n(y(p))}" stroke="#4E5866" stroke-width="2" stroke-dasharray="8 7"/>
        <text x="${padL + 4}" y="${n(y(p) - 9)}" font-family="JB Mono" font-weight="600" font-size="15" fill="#6B7584" letter-spacing="2">${label}</text>`);
    }
    // candles, the last one forming
    const last = Math.min(OHLC.length, full + (frac > 0 ? 1 : 0));
    const bw = step * 0.64;
    for (let i = 0; i < last; i++) {
      const c = OHLC[i];
      const f = i === full ? forming(c, frac) : { close: c.c, hi: c.h, lo: c.l };
      const col = f.close >= c.o ? UP : DOWN;
      const t0 = y(Math.max(c.o, f.close)), b0 = y(Math.min(c.o, f.close));
      o.push(`<line x1="${n(x(i))}" x2="${n(x(i))}" y1="${n(y(f.hi))}" y2="${n(y(f.lo))}" stroke="${col}" stroke-width="2"/>
        <rect x="${n(x(i) - bw / 2)}" y="${n(t0)}" width="${n(bw)}" height="${n(Math.max(1.5, b0 - t0))}" rx="1.5" fill="${col}"/>`);
    }
    if (last > 0) {
      const c = OHLC[last - 1], f = last - 1 === full ? forming(c, frac) : { close: c.c };
      o.push(`<line x1="${padL}" x2="${CW - 70}" y1="${n(y(f.close))}" y2="${n(y(f.close))}" stroke="${f.close >= c.o ? UP : DOWN}" stroke-width="1.2" stroke-dasharray="3 4" opacity="0.7"/>`);
    }
    // his trades: entry and stop lines, the tag, then the cross where the stop is hit
    for (const tr of TRADES) {
      if (shown < tr.at) continue;
      const stopped = shown >= tr.out;
      const col = tr.side === 'BUY' ? UP : DOWN;
      const ex = x(tr.i), ey = y(tr.entry), sy = y(tr.stop);
      const right = stopped ? x(Math.floor(tr.out)) : CW - padR;
      const pop = easeOut(cl((shown - tr.at) / 0.25));
      o.push(`<g opacity="${n(1 - st.dim * 0.55)}">
        <line x1="${n(ex)}" x2="${n(right)}" y1="${n(ey)}" y2="${n(ey)}" stroke="${col}" stroke-width="2" stroke-dasharray="6 5"/>
        <line x1="${n(ex)}" x2="${n(right)}" y1="${n(sy)}" y2="${n(sy)}" stroke="${DOWN}" stroke-width="2" stroke-dasharray="2 5"/>
        <g transform="translate(${n(ex - 12)} ${n(ey)}) scale(${n(0.6 + 0.4 * pop)}) translate(-58 -17)"><rect width="58" height="34" rx="7" fill="${col}"/>
          <text x="29" y="23" text-anchor="middle" font-family="JB Mono" font-weight="600" font-size="17" fill="#06110D">${tr.side}</text></g>`);
      if (stopped) {
        const k = easeOut(cl((shown - tr.out) / 0.2));
        o.push(`<g transform="translate(${n(x(Math.floor(tr.out)))} ${n(sy)}) scale(${n(0.4 + 0.6 * k)})"><circle r="15" fill="${DOWN}"/>
          <path d="M -6 -6 L 6 6 M 6 -6 L -6 6" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/></g>
          ${st.notes > 0.01 ? `<text x="${n(x(Math.floor(tr.out)) + 22)}" y="${n(sy + (tr.side === 'BUY' ? -12 : 26))}" font-family="JB Mono" font-weight="600" font-size="17" fill="#FFB39E" opacity="${n(cl(st.notes * 2))}">${tr.label}</text>` : ''}`);
      }
      o.push('</g>');
    }
    // the replay's marks, numbered to match the notes the set shows: 1 the trap (both stop-outs),
    // 2 the higher high, 3 the pullback, then the move
    const badge = (bx, by, num, a) => `<g transform="translate(${n(bx)} ${n(by)}) scale(${n(0.5 + 0.5 * easeOut(a))})" opacity="${n(cl(a * 2))}">
      <circle r="15" fill="${GOLD}"/><text y="7" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="19" fill="#15110A">${num}</text></g>`;
    const a1 = cl(st.notes), a2 = cl(st.notes - 1), a3 = cl(st.notes - 2);
    if (a1 > 0) {
      for (const tr of TRADES) {
        const cx = x(Math.floor(tr.out)), cy = y(tr.stop);
        o.push(`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(23 + 8 * (1 - easeOut(a1)))}" fill="none" stroke="${GOLD}" stroke-width="3.4" opacity="${n(a1)}"/>${badge(cx - 22, cy - 22, 1, a1)}`);
      }
    }
    if (a2 > 0) {
      const hx0 = x(LOWER_HIGH.i), hx1 = x(38), hy = y(LOWER_HIGH.p);
      o.push(`<line x1="${n(hx0)}" x2="${n(mix(hx0, hx1 + 16, easeOut(a2)))}" y1="${n(hy)}" y2="${n(hy)}" stroke="${GOLD}" stroke-width="2.8" stroke-dasharray="7 5"/>
        <circle cx="${n(x(38))}" cy="${n(y(OHLC[38].h))}" r="${n(8 * easeOut(a2))}" fill="${GOLD}"/>${badge(x(38), y(OHLC[38].h) - 30, 2, a2)}`);
    }
    if (a3 > 0) {
      const zx = x(39) - step * 0.6, zw = x(42) + step * 0.6 - zx, z0 = y(57), z1 = y(51);
      o.push(`<rect x="${n(zx)}" y="${n(z0)}" width="${n(zw)}" height="${n(z1 - z0)}" rx="5" fill="${GOLD}" fill-opacity="${n(0.22 * a3)}" stroke="${GOLD}" stroke-width="2.6" opacity="${n(cl(a3 * 2))}"/>${badge(zx + zw / 2, z1 + 26, 3, a3)}`);
      const run = cl((shown - 42) / (OHLC.length - 42));
      if (run > 0) o.push(`<path d="M ${n(x(41.5))} ${n(y(52))} C ${n(x(46))} ${n(y(56))}, ${n(x(50))} ${n(y(70))}, ${n(x(55.5))} ${n(y(92))}" fill="none" stroke="${GOLDHI}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${n(460 * run)} 460" opacity="0.9"/>`);
    }
    return `<g>${o.join('')}</g>`;
  }

  // ------------------------------------------------------------ the cluttered chart (EP08)
  // Another example chart: it fills up with indicators until the price can't be seen, then is wiped
  // back to the candles and the 4 levels that matter. Every indicator is worked out from the candles,
  // with 200 more candles of history before the 64 shown, so even the 200-candle average is real.
  // The state's story is 'clutter': ind is how many indicators are on (0 to 27; a fraction fades the
  // next one in, or the last one out on the way down), menu and hover the right-click menu and its
  // "Remove all indicators" row, levels the 4 levels drawing in.
  const CL = (() => {
    const r = rng(81), all = [];
    const legs = [0.42, 0.5, -0.5, -0.2, 0.45, 0.3, -0.25, 0.2];
    let p = 40;
    for (let i = 0; i < 264; i++) {
      const d = i < 200 ? Math.sin(i / 23) * 0.32 + 0.05 : legs[Math.floor((i - 200) / 8)];
      const o = p, c = o + d + (r() - 0.5) * 2.6;
      all.push({ o, c, h: Math.max(o, c) + r() * 1.3, l: Math.min(o, c) - r() * 1.3, v: 40 + r() * 60 + Math.abs(c - o) * 24 });
      p = c;
    }
    return all;
  })();
  const CLI = (() => {
    const C = CL.map((c) => c.c), H = CL.map((c) => c.h), L = CL.map((c) => c.l), V = CL.map((c) => c.v);
    const sma = (a, k) => a.map((_, i) => (i < k - 1 ? null : a.slice(i - k + 1, i + 1).reduce((s, v) => s + v, 0) / k));
    const ema = (a, k) => { const al = 2 / (k + 1); let e = a[0]; return a.map((v, i) => (e = i ? al * v + (1 - al) * e : v)); };
    const rma = (a, k) => { let e = a[0]; return a.map((v, i) => (e = i ? (e * (k - 1) + v) / k : v)); };
    const hh = (a, k) => a.map((_, i) => Math.max(...a.slice(Math.max(0, i - k + 1), i + 1)));
    const ll = (a, k) => a.map((_, i) => Math.min(...a.slice(Math.max(0, i - k + 1), i + 1)));
    const sd = (a, k) => a.map((_, i) => { if (i < k - 1) return null; const s = a.slice(i - k + 1, i + 1), m = s.reduce((x, y) => x + y, 0) / k; return Math.sqrt(s.reduce((x, y) => x + (y - m) ** 2, 0) / k); });
    const TR = CL.map((c, i) => (i ? Math.max(c.h - c.l, Math.abs(c.h - CL[i - 1].c), Math.abs(c.l - CL[i - 1].c)) : c.h - c.l));
    const atr14 = rma(TR, 14), atr10 = rma(TR, 10);
    const sma20 = sma(C, 20), sd20 = sd(C, 20), ema20 = ema(C, 20);
    const gain = C.map((c, i) => (i ? Math.max(0, c - C[i - 1]) : 0)), loss = C.map((c, i) => (i ? Math.max(0, C[i - 1] - c) : 0));
    const ag = rma(gain, 14), al = rma(loss, 14);
    const e12 = ema(C, 12), e26 = ema(C, 26), macd = e12.map((v, i) => v - e26[i]), sig = ema(macd, 9);
    const h14 = hh(H, 14), l14 = ll(L, 14), raw = C.map((c, i) => (100 * (c - l14[i])) / ((h14[i] - l14[i]) || 1));
    const k3 = sma(raw.map((v) => v), 3).map((v, i) => v ?? raw[i]), d3 = sma(k3, 3).map((v, i) => v ?? k3[i]);
    const tp = CL.map((c) => (c.h + c.l + c.c) / 3), tp20 = sma(tp, 20);
    const cci = tp.map((v, i) => { if (i < 19) return 0; const s = tp.slice(i - 19, i + 1), md = s.reduce((x, y) => x + Math.abs(y - tp20[i]), 0) / 20; return (v - tp20[i]) / (0.015 * (md || 1)); });
    let ob = 0;
    const obv = C.map((c, i) => (ob += i ? Math.sign(c - C[i - 1]) * V[i] : 0));
    const pdm = CL.map((c, i) => (i && c.h - CL[i - 1].h > CL[i - 1].l - c.l ? Math.max(0, c.h - CL[i - 1].h) : 0));
    const mdm = CL.map((c, i) => (i && CL[i - 1].l - c.l > c.h - CL[i - 1].h ? Math.max(0, CL[i - 1].l - c.l) : 0));
    const sp = rma(pdm, 14), sm = rma(mdm, 14);
    const dx = sp.map((p, i) => { const a = (100 * p) / atr14[i], b = (100 * sm[i]) / atr14[i]; return (100 * Math.abs(a - b)) / ((a + b) || 1); });
    const adx = rma(dx, 14);
    // supertrend (10, 3)
    const st = [];
    let up = 0, dn = 0, trend = 1;
    CL.forEach((c, i) => {
      const mid = (c.h + c.l) / 2, u = mid - 3 * atr10[i], d = mid + 3 * atr10[i];
      up = i && C[i - 1] > up ? Math.max(u, up) : u;
      dn = i && C[i - 1] < dn ? Math.min(d, dn) : d;
      if (c.c > dn) trend = 1; else if (c.c < up) trend = -1;
      st.push({ v: trend > 0 ? up : dn, up: trend > 0 });
    });
    // parabolic SAR (0.02, 0.2)
    const sar = [];
    let long = true, af = 0.02, ep = CL[0].h, s = CL[0].l;
    CL.forEach((c, i) => {
      if (i) {
        s += af * (ep - s);
        if (long) { s = Math.min(s, CL[i - 1].l, CL[Math.max(0, i - 2)].l); if (c.l < s) { long = false; s = ep; ep = c.l; af = 0.02; } else if (c.h > ep) { ep = c.h; af = Math.min(0.2, af + 0.02); } }
        else { s = Math.max(s, CL[i - 1].h, CL[Math.max(0, i - 2)].h); if (c.h > s) { long = true; s = ep; ep = c.h; af = 0.02; } else if (c.l < ep) { ep = c.l; af = Math.min(0.2, af + 0.02); } }
      }
      sar.push(s);
    });
    const conv = hh(H, 9).map((v, i) => (v + ll(L, 9)[i]) / 2), base = hh(H, 26).map((v, i) => (v + ll(L, 26)[i]) / 2);
    const spanA = conv.map((v, i) => (v + base[i]) / 2), spanB = hh(H, 52).map((v, i) => (v + ll(L, 52)[i]) / 2);
    return { C, H, L, V, sma20, ema9: ema(C, 9), ema21: ema(C, 21), ema50: ema(C, 50), sma200: sma(C, 200), bbU: sma20.map((m, i) => m + 2 * sd20[i]), bbL: sma20.map((m, i) => m - 2 * sd20[i]),
      kcU: ema20.map((m, i) => m + 2 * atr10[i]), kcL: ema20.map((m, i) => m - 2 * atr10[i]), dcU: hh(H, 20), dcL: ll(L, 20),
      rsi: ag.map((g, i) => 100 - 100 / (1 + g / (al[i] || 1e-9))), macd, sig, stK: k3, stD: d3, atr: atr14, cci, obv, adx, st, sar, conv, base, spanA, spanB, tp };
  })();
  function clutterSVG(st, id, bare) {
    const N = 64, off = CL.length - N, S = CL.slice(off), at = (a, i) => a[off + i];
    const padL = 10, padR = 78, top = 56, bottom = CH - 6;
    const step = (CW - padL - padR) / N, x = (i) => padL + step * (i + 0.5);
    const ind = cl(st.ind || 0, 0, 27), on = (k) => cl(ind - (k - 1));
    // the panels under the price, each added at the bottom as it comes on
    const PANELS = [[3, 'RSI 14', '#A78BFA'], [4, 'MACD 12 26 9', '#60A5FA'], [6, 'Vol', '#7C8796'], [10, 'Stoch 14 3 3', '#38BDF8'], [15, 'ATR 14', '#94A3B8'], [20, 'CCI 20', '#FB923C'], [26, 'OBV', '#2DD4BF'], [27, 'ADX 14', '#F472B6']];
    const PH = 40;
    const panes = PANELS.map(([k, name, col]) => ({ k, name, col, h: PH * easeIO(on(k)), a: on(k) })).filter((p) => p.a > 0);
    const total = panes.reduce((s, p) => s + p.h, 0);
    const pb = bottom - total;
    let yy = pb;
    panes.forEach((p) => { p.y0 = yy; yy += p.h; p.y1 = yy; });
    const lo = Math.min(...S.map((c) => c.l)), hi = Math.max(...S.map((c) => c.h)), pad = (hi - lo) * 0.08;
    const y = (p) => top + 8 + (1 - (p - (lo - pad)) / (hi - lo + 2 * pad)) * (pb - top - 16);
    const o = [];
    const line = (vals, col, w = 1.8, extra = '') => {
      const pts = vals.map((v, i) => (v == null ? null : `${n(x(i))} ${n(y(v))}`)).filter(Boolean);
      return pts.length > 1 ? `<path d="M ${pts.join(' L ')}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linejoin="round"${extra}/>` : '';
    };
    const band = (u, l, col, op) => `<path d="M ${u.map((v, i) => `${n(x(i))} ${n(y(v))}`).join(' L ')} L ${l.map((v, i) => `${n(x(i))} ${n(y(v))}`).reverse().join(' L ')} Z" fill="${col}" opacity="${op}"/>`;
    const seg = (a) => S.map((_, i) => at(a, i));
    o.push(`<rect width="${CW}" height="${CH}" rx="6" fill="#0A0D11"/>`);
    for (let g = 1; g < 8; g++) { const gx = n(CW * g / 8); o.push(`<line y1="${top}" y2="${bottom}" x1="${gx}" x2="${gx}" stroke="#121820" stroke-width="1.5"/>`); }
    for (let g = 1; g < 6; g++) { const gy = n(top + (pb - top) * g / 6); o.push(`<line x1="0" x2="${CW}" y1="${gy}" y2="${gy}" stroke="#141A22" stroke-width="1.5"/>`); }
    o.push(`<rect width="${CW}" height="48" fill="#0E1218"/><line x1="0" x2="${CW}" y1="48" y2="48" stroke="#1E2630" stroke-width="2"/>`);
    if (!bare) o.push(`<circle cx="26" cy="24" r="6" fill="${GOLD}"/>
      <text x="42" y="31" font-family="JB Mono" font-weight="600" font-size="19" fill="#C9D1DC" letter-spacing="2">EXAMPLE CHART</text>
      <text x="252" y="31" font-family="JB Mono" font-weight="500" font-size="17" fill="#5F6A78" letter-spacing="1">not real prices</text>`);
    // the count, top right, gold while any indicator is on
    const count = Math.round(ind);
    if (ind > 0.01) {
      o.push(`<g opacity="${n(cl(ind * 3))}"><text x="${CW - 96}" y="31" text-anchor="end" font-family="JB Mono" font-weight="600" font-size="15" fill="#8A93A0" letter-spacing="2">INDICATORS</text>
        <rect x="${CW - 86}" y="9" width="72" height="31" rx="7" fill="${count >= 20 ? '#3A1712' : '#2A2213'}" stroke="${count >= 20 ? DOWN : GOLD}" stroke-width="2"/>
        <text x="${CW - 50}" y="33" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="24" fill="${count >= 20 ? '#FF8A6E' : GOLDHI}">${count}</text></g>`);
    }
    // the price pane: overlays under the candles first, then the candles, then the rest on top
    o.push(`<clipPath id="${id}pp"><rect x="0" y="${top}" width="${CW - padR + 4}" height="${n(pb - top)}"/></clipPath><g clip-path="url(#${id}pp)">`);
    const fade = (k, svg) => (on(k) > 0 ? `<g opacity="${n(on(k))}">${svg}</g>` : '');
    // 8 Ichimoku cloud (shifted 26 candles forward, so it runs on past the last candle)
    if (on(8) > 0) {
      const A = S.map((_, i) => at(CLI.spanA, i - 26)), B = S.map((_, i) => at(CLI.spanB, i - 26));
      let cloud = '';
      for (let i = 1; i < N; i++) {
        const up = A[i] >= B[i];
        cloud += `<path d="M ${n(x(i - 1))} ${n(y(A[i - 1]))} L ${n(x(i))} ${n(y(A[i]))} L ${n(x(i))} ${n(y(B[i]))} L ${n(x(i - 1))} ${n(y(B[i - 1]))} Z" fill="${up ? '#22C55E' : '#EF4444'}" opacity="0.16"/>`;
      }
      o.push(fade(8, `${cloud}${line(A, '#4ADE80', 1.3)}${line(B, '#F87171', 1.3)}${line(seg(CLI.conv), '#2563EB', 1.4)}${line(seg(CLI.base), '#B91C1C', 1.4)}`));
    }
    // 5 Bollinger, 16 Keltner, 19 Donchian, 25 regression channel
    o.push(fade(5, `${band(seg(CLI.bbU), seg(CLI.bbL), '#2DD4BF', 0.08)}${line(seg(CLI.bbU), '#2DD4BF', 1.5)}${line(seg(CLI.bbL), '#2DD4BF', 1.5)}${line(seg(CLI.sma20), '#F59E0B', 1.2, ' stroke-dasharray="5 4"')}`));
    o.push(fade(16, `${line(seg(CLI.kcU), '#C084FC', 1.5, ' stroke-dasharray="7 5"')}${line(seg(CLI.kcL), '#C084FC', 1.5, ' stroke-dasharray="7 5"')}`));
    o.push(fade(19, `${line(seg(CLI.dcU), '#A3E635', 1.4)}${line(seg(CLI.dcL), '#A3E635', 1.4)}`));
    if (on(25) > 0) {
      const xs = S.map((_, i) => i), ys = S.map((c) => c.c), mx = (N - 1) / 2, my = ys.reduce((s, v) => s + v, 0) / N;
      const b = xs.reduce((s, xi, i) => s + (xi - mx) * (ys[i] - my), 0) / xs.reduce((s, xi) => s + (xi - mx) ** 2, 0), a0 = my - b * mx;
      const res = Math.sqrt(ys.reduce((s, v, i) => s + (v - (a0 + b * i)) ** 2, 0) / N);
      const L0 = (k) => `<line x1="${n(x(0))}" x2="${n(x(N - 1))}" y1="${n(y(a0 + k * res))}" y2="${n(y(a0 + b * (N - 1) + k * res))}" stroke="#E879F9" stroke-width="1.5"${k ? ' stroke-dasharray="3 4"' : ''}/>`;
      o.push(fade(25, `${L0(0)}${L0(2)}${L0(-2)}`));
    }
    // 23 support and resistance zones, 12 pivots, 9 Fibonacci
    o.push(fade(23, [[hi - 1.2, hi + 0.4, '#EF4444'], [lo - 0.4, lo + 1.2, '#22C55E'], [S[30].h - 0.8, S[30].h + 0.6, '#F59E0B']].map(([a, b, c]) => `<rect x="${n(x(0))}" y="${n(y(b))}" width="${n(x(N - 1) - x(0))}" height="${n(y(a) - y(b))}" fill="${c}" opacity="0.13"/>`).join('')));
    if (on(12) > 0) {
      const d = S.slice(0, 32), H0 = Math.max(...d.map((c) => c.h)), L0 = Math.min(...d.map((c) => c.l)), C0 = d[31].c, P = (H0 + L0 + C0) / 3;
      const lv = [['P', P], ['R1', 2 * P - L0], ['S1', 2 * P - H0], ['R2', P + (H0 - L0)], ['S2', P - (H0 - L0)]];
      o.push(fade(12, lv.map(([t, v]) => `<line x1="${n(x(32))}" x2="${n(x(N - 1))}" y1="${n(y(v))}" y2="${n(y(v))}" stroke="#FACC15" stroke-width="1.4"/><text x="${n(x(32) + 3)}" y="${n(y(v) - 3)}" font-family="JB Mono" font-size="10" fill="#FACC15">${t}</text>`).join('')));
    }
    if (on(9) > 0) {
      const fl = [[0, '#9CA3AF'], [0.236, '#EF4444'], [0.382, '#F59E0B'], [0.5, '#22C55E'], [0.618, '#06B6D4'], [0.786, '#3B82F6'], [1, '#9CA3AF']];
      o.push(fade(9, fl.map(([f, c]) => { const v = hi - (hi - lo) * f; return `<line x1="${n(x(0))}" x2="${n(x(N - 1))}" y1="${n(y(v))}" y2="${n(y(v))}" stroke="${c}" stroke-width="1.2" opacity="0.85"/><text x="${n(x(0) + 2)}" y="${n(y(v) - 3)}" font-family="JB Mono" font-size="10" fill="${c}">${f}</text>`; }).join('')));
    }
    // the candles
    const shown = cl(st.i ?? N, 0, N), full = Math.floor(shown), frac = shown - full;
    const bw = step * 0.62;
    for (let i = 0; i < Math.min(N, full + (frac > 0 ? 1 : 0)); i++) {
      const c = S[i], f = i === full ? forming(c, frac) : { close: c.c, hi: c.h, lo: c.l };
      const col = f.close >= c.o ? UP : DOWN, t0 = y(Math.max(c.o, f.close)), b0 = y(Math.min(c.o, f.close));
      o.push(`<line x1="${n(x(i))}" x2="${n(x(i))}" y1="${n(y(f.hi))}" y2="${n(y(f.lo))}" stroke="${col}" stroke-width="1.8"/><rect x="${n(x(i) - bw / 2)}" y="${n(t0)}" width="${n(bw)}" height="${n(Math.max(1.5, b0 - t0))}" rx="1.2" fill="${col}"/>`);
    }
    // moving averages and the rest of the lines
    o.push(fade(1, line(seg(CLI.sma20), '#FACC15', 2)));
    o.push(fade(2, line(seg(CLI.ema50), '#3B82F6', 2)));
    if (on(7) > 0) {
      let pv = 0, vv = 0;
      const vw = S.map((c, i) => { if (i < 32) return null; pv += at(CLI.tp, i) * c.v; vv += c.v; return pv / vv; });
      o.push(fade(7, line(vw, '#FB923C', 2.2)));
    }
    o.push(fade(11, line(seg(CLI.sma200), '#EF4444', 2.2)));
    if (on(13) > 0) {
      let s = '';
      for (let i = 1; i < N; i++) { const a = at(CLI.st, i - 1), b = at(CLI.st, i); if (a.up === b.up) s += `<line x1="${n(x(i - 1))}" x2="${n(x(i))}" y1="${n(y(a.v))}" y2="${n(y(b.v))}" stroke="${b.up ? '#22C55E' : '#EF4444'}" stroke-width="2.2"/>`; }
      o.push(fade(13, s));
    }
    o.push(fade(14, S.map((_, i) => `<circle cx="${n(x(i))}" cy="${n(y(at(CLI.sar, i)))}" r="1.9" fill="#E5E7EB"/>`).join('')));
    o.push(fade(17, line(seg(CLI.ema9), '#F472B6', 1.6)));
    o.push(fade(18, line(seg(CLI.ema21), '#22D3EE', 1.6)));
    if (on(21) > 0 || on(22) > 0) {
      // swings for the zig zag and the trendlines: a turn of 3.5 or more
      const piv = [];
      let dir = 0, ext = S[0].c, ei = 0;
      S.forEach((c, i) => {
        if (dir >= 0 && c.h > ext) { ext = c.h; ei = i; } else if (dir <= 0 && c.l < ext) { ext = c.l; ei = i; }
        if (dir >= 0 && ext - c.l > 3.5) { piv.push({ i: ei, v: ext, hi: true }); dir = -1; ext = c.l; ei = i; } else if (dir <= 0 && c.h - ext > 3.5) { piv.push({ i: ei, v: ext, hi: false }); dir = 1; ext = c.h; ei = i; }
      });
      piv.push({ i: ei, v: ext, hi: dir > 0 });
      o.push(fade(21, `<path d="M ${piv.map((q) => `${n(x(q.i))} ${n(y(q.v))}`).join(' L ')}" fill="none" stroke="#F8FAFC" stroke-width="1.6" opacity="0.8"/>`));
      const highs = piv.filter((q) => q.hi), lows = piv.filter((q) => !q.hi), tl = [];
      for (const arr of [highs, lows]) for (let j = 1; j < arr.length && tl.length < 6; j += 1) {
        const a = arr[j - 1], b = arr[j], sl = (b.v - a.v) / ((b.i - a.i) || 1);
        tl.push(`<line x1="${n(x(a.i))}" y1="${n(y(a.v))}" x2="${n(x(N - 1))}" y2="${n(y(a.v + sl * (N - 1 - a.i)))}" stroke="${arr === highs ? '#F87171' : '#4ADE80'}" stroke-width="1.6"/>`);
      }
      o.push(fade(22, tl.join('')));
    }
    if (on(24) > 0) {
      let s = '';
      for (let i = 1; i < N; i++) {
        const d0 = at(CLI.ema9, i - 1) - at(CLI.ema21, i - 1), d1 = at(CLI.ema9, i) - at(CLI.ema21, i);
        if (d0 <= 0 && d1 > 0) s += `<g transform="translate(${n(x(i))} ${n(y(S[i].l) + 16)})"><path d="M 0 -9 L 7 0 L -7 0 Z" fill="${UP}"/><rect x="-17" y="1" width="34" height="15" rx="3" fill="${UP}"/><text y="12.5" text-anchor="middle" font-family="JB Mono" font-weight="700" font-size="10" fill="#04130D">BUY</text></g>`;
        if (d0 >= 0 && d1 < 0) s += `<g transform="translate(${n(x(i))} ${n(y(S[i].h) - 16)})"><path d="M 0 9 L 7 0 L -7 0 Z" fill="${DOWN}"/><rect x="-19" y="-16" width="38" height="15" rx="3" fill="${DOWN}"/><text y="-4.5" text-anchor="middle" font-family="JB Mono" font-weight="700" font-size="10" fill="#1A0703">SELL</text></g>`;
      }
      o.push(fade(24, s));
    }
    // the levels that matter: the previous day's high and low, and the Asia session's
    if ((st.levels || 0) > 0) {
      const d = S.slice(0, 32), as = S.slice(32, 44);
      const lv = [['PDH', Math.max(...d.map((c) => c.h)), '#E9C46A'], ['ASIA H', Math.max(...as.map((c) => c.h)), '#8E7CF0'], ['ASIA L', Math.min(...as.map((c) => c.l)), '#8E7CF0'], ['PDL', Math.min(...d.map((c) => c.l)), '#E9C46A']];
      lv.forEach(([t, v, c], j) => {
        const a = cl(st.levels * 1.6 - j * 0.2), ly = y(v), x1 = mix(x(0), CW - padR + 2, easeOut(a));
        if (a <= 0) return;
        o.push(`<line x1="${n(x(0))}" x2="${n(x1)}" y1="${n(ly)}" y2="${n(ly)}" stroke="${c}" stroke-width="2.4" stroke-dasharray="9 6"/>`);
      });
    }
    o.push('</g>');
    // the levels' tags, outside the clip, at the right edge
    if ((st.levels || 0) > 0) {
      const d = S.slice(0, 32), as = S.slice(32, 44);
      const lv = [['PDH', Math.max(...d.map((c) => c.h)), '#E9C46A'], ['ASIA H', Math.max(...as.map((c) => c.h)), '#8E7CF0'], ['ASIA L', Math.min(...as.map((c) => c.l)), '#8E7CF0'], ['PDL', Math.min(...d.map((c) => c.l)), '#E9C46A']];
      lv.forEach(([t, v, c], j) => {
        const a = cl(st.levels * 1.6 - j * 0.2 - 0.5);
        if (a <= 0) return;
        o.push(`<g opacity="${n(a)}" transform="translate(${CW - padR + 4} ${n(y(v))})"><rect x="0" y="-11" width="${t.length > 3 ? 70 : 46}" height="22" rx="4" fill="${c}"/><text x="${t.length > 3 ? 35 : 23}" y="5" text-anchor="middle" font-family="JB Mono" font-weight="700" font-size="12" fill="#14110C">${t}</text></g>`);
      });
    }
    // the legend of every overlay on, in rows across the top of the price pane
    const OV = [[1, 'SMA 20', '#FACC15'], [2, 'EMA 50', '#3B82F6'], [5, 'BB 20 2', '#2DD4BF'], [7, 'VWAP', '#FB923C'], [8, 'Ichimoku 9 26 52', '#4ADE80'], [9, 'Fib', '#06B6D4'], [11, 'SMA 200', '#EF4444'], [12, 'Pivots', '#FACC15'], [13, 'Supertrend 10 3', '#22C55E'], [14, 'PSAR', '#E5E7EB'],
      [16, 'Keltner 20', '#C084FC'], [17, 'EMA 9', '#F472B6'], [18, 'EMA 21', '#22D3EE'], [19, 'Donchian 20', '#A3E635'], [21, 'Zig Zag', '#F8FAFC'], [22, 'Trendlines', '#F87171'], [23, 'S/R zones', '#F59E0B'], [24, 'Signals', '#35A68C'], [25, 'Lin Reg', '#E879F9']];
    let lx = 10, ly = top + 16;
    for (const [k, name, col] of OV) {
      const a = on(k);
      if (a <= 0) continue;
      const w = name.length * 7.2 + 22;
      if (lx + w > CW - padR - 6) { lx = 10; ly += 17; }
      o.push(`<g opacity="${n(a)}"><rect x="${n(lx - 3)}" y="${n(ly - 12)}" width="${n(w)}" height="16" rx="3" fill="#0A0D11" opacity="0.72"/><circle cx="${n(lx + 4)}" cy="${n(ly - 4)}" r="3.5" fill="${col}"/><text x="${n(lx + 12)}" y="${n(ly)}" font-family="JB Mono" font-size="12" fill="${col}">${name}</text></g>`);
      lx += w + 4;
    }
    // the panels
    const sub = (k, arr) => S.map((_, i) => at(arr, i));
    for (const p of panes) {
      const h = p.y1 - p.y0, pad2 = 5;
      o.push(`<g opacity="${n(p.a)}"><rect x="0" y="${n(p.y0)}" width="${CW}" height="${n(h)}" fill="#0B0F14"/><line x1="0" x2="${CW}" y1="${n(p.y0)}" y2="${n(p.y0)}" stroke="#263040" stroke-width="1.5"/>`);
      if (h > 14) {
        const series = { 3: [CLI.rsi], 4: [CLI.macd, CLI.sig], 6: null, 10: [CLI.stK, CLI.stD], 15: [CLI.atr], 20: [CLI.cci], 26: [CLI.obv], 27: [CLI.adx] }[p.k];
        const py = (v, mn, mx) => p.y1 - pad2 - ((v - mn) / ((mx - mn) || 1)) * (h - 2 * pad2);
        if (p.k === 6) {
          const mxv = Math.max(...S.map((c) => c.v));
          S.forEach((c, i) => { const bh = (c.v / mxv) * (h - 2 * pad2); o.push(`<rect x="${n(x(i) - bw / 2)}" y="${n(p.y1 - pad2 - bh)}" width="${n(bw)}" height="${n(bh)}" fill="${c.c >= c.o ? UP : DOWN}" opacity="0.55"/>`); });
        } else {
          const vals = series.map((a) => sub(p.k, a));
          let mn = Math.min(...vals.flat()), mx = Math.max(...vals.flat());
          if (p.k === 3 || p.k === 10) { mn = 0; mx = 100; [70, 30, 80, 20].slice(p.k === 3 ? 0 : 2, p.k === 3 ? 2 : 4).forEach((g) => o.push(`<line x1="0" x2="${CW - padR}" y1="${n(py(g, mn, mx))}" y2="${n(py(g, mn, mx))}" stroke="#3A4250" stroke-width="1" stroke-dasharray="4 4"/>`)); }
          if (p.k === 4) {
            const hist = vals[0].map((v, i) => v - vals[1][i]), hm = Math.max(...hist.map(Math.abs)) || 1, z = (p.y0 + p.y1) / 2;
            hist.forEach((v, i) => o.push(`<rect x="${n(x(i) - bw / 2)}" y="${n(Math.min(z, z - (v / hm) * (h / 2 - pad2)))}" width="${n(bw)}" height="${n(Math.abs((v / hm) * (h / 2 - pad2)))}" fill="${v >= 0 ? '#22C55E' : '#EF4444'}" opacity="0.5"/>`));
          }
          const cols = [p.col, '#F59E0B'];
          vals.forEach((vs, j) => o.push(`<path d="M ${vs.map((v, i) => `${n(x(i))} ${n(py(v, mn, mx))}`).join(' L ')}" fill="none" stroke="${cols[j]}" stroke-width="1.5"/>`));
        }
        o.push(`<text x="8" y="${n(p.y0 + 13)}" font-family="JB Mono" font-size="11" fill="${p.col}">${p.name}</text>`);
      }
      o.push('</g>');
    }
    // the right-click menu, its "Remove all indicators" row lit as the pointer reaches it
    if ((st.menu || 0) > 0.01) {
      const mxp = 470, myp = 150, a = easeOut(cl(st.menu)), hv = cl(st.hover || 0);
      const rows = ['Reset chart view', 'Add alert…', 'Remove all indicators', 'Remove drawings', 'Settings…'];
      o.push(`<g opacity="${n(a)}" transform="translate(${mxp} ${myp}) scale(${n(0.94 + 0.06 * a)})">
        <rect x="6" y="8" width="250" height="${rows.length * 34 + 14}" rx="8" fill="#000" opacity="0.45"/>
        <rect width="250" height="${rows.length * 34 + 14}" rx="8" fill="#1B2028" stroke="#323B48" stroke-width="1.5"/>
        ${rows.map((r, j) => `${j === 2 ? `<rect x="6" y="${7 + j * 34}" width="238" height="32" rx="5" fill="#2A5BD7" opacity="${n(hv)}"/>` : ''}
          <text x="20" y="${29 + j * 34}" font-family="Archivo" font-weight="${j === 2 ? 600 : 400}" font-size="16" fill="${j === 2 && hv > 0.5 ? '#FFFFFF' : '#C9D1DC'}">${r}</text>`).join('')}
        <path d="M ${n(150 + 40 * (1 - hv))} ${n(70 + 18 * (1 - hv) + 10)} l 0 22 l 6 -5 l 4 9 l 4 -2 l -4 -9 l 8 0 Z" fill="#fff" stroke="#000" stroke-width="1.4"/></g>`);
    }
    return `<g>${o.join('')}</g>`;
  }

  // ------------------------------------------------------------ set pieces
  function roomDefs(id, glow) {
    return `<defs>
      <linearGradient id="${id}wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0D0B09"/><stop offset="0.55" stop-color="#17130F"/><stop offset="1" stop-color="#0A0908"/></linearGradient>
      <linearGradient id="${id}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#060A14"/><stop offset="0.7" stop-color="#151A2E"/><stop offset="1" stop-color="#2A2236"/></linearGradient>
      <linearGradient id="${id}desk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B241C"/><stop offset="1" stop-color="#15110D"/></linearGradient>
      <linearGradient id="${id}front" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#100D0A"/><stop offset="1" stop-color="#070605"/></linearGradient>
      <radialGradient id="${id}glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${glow}" stop-opacity="0.5"/><stop offset="0.45" stop-color="${glow}" stop-opacity="0.16"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>
      <radialGradient id="${id}warm" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#E7B04F" stop-opacity="0.55"/><stop offset="1" stop-color="#E7B04F" stop-opacity="0"/></radialGradient>
      <radialGradient id="${id}vig" cx="0.5" cy="0.46" r="0.72"><stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.7"/></radialGradient>
      <linearGradient id="${id}mouse" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3A3A40"/><stop offset="0.4" stop-color="#1A1A1E"/><stop offset="1" stop-color="#0B0B0D"/></linearGradient>
      <linearGradient id="${id}skinh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6D3BA"/><stop offset="0.55" stop-color="#EDBB98"/><stop offset="1" stop-color="#C9917A"/></linearGradient>
      <linearGradient id="${id}slat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1C1611"/><stop offset="0.6" stop-color="#2C2219"/><stop offset="1" stop-color="#5A4128"/></linearGradient>
      <linearGradient id="${id}chair" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0E0D0C"/><stop offset="0.6" stop-color="#1A1816"/><stop offset="1" stop-color="#2A2622"/></linearGradient>
      <linearGradient id="${id}glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.07"/><stop offset="0.56" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <filter color-interpolation-filters="sRGB" id="${id}b2" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2"/></filter>
      <filter color-interpolation-filters="sRGB" id="${id}b8" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="8"/></filter>
      <filter color-interpolation-filters="sRGB" id="${id}b20" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="20"/></filter>
    </defs>`;
  }
  function bokeh(x0, y0, w, h, count, seed, sizes = [3, 12]) {
    const r = rng(seed);
    const cols = ['#F6C46A', '#F2E2B8', '#FFFFFF', '#E7A24A', '#9FC2FF', '#F6C46A'];
    let s = '';
    for (let i = 0; i < count; i++) {
      const rad = sizes[0] + r() * (sizes[1] - sizes[0]);
      s += `<circle cx="${n(x0 + r() * w)}" cy="${n(y0 + h * (0.3 + 0.7 * r() ** 0.7))}" r="${n(rad)}" fill="${cols[Math.floor(r() * cols.length)]}" opacity="${n(0.2 + r() * 0.55)}"/>`;
    }
    return s;
  }
  function crown(x, y, scale, fill = GOLD) {
    const k = window.CROWN;
    if (!k) return '';
    return `<g transform="translate(${x} ${y}) scale(${scale}) translate(-100 -88)"><path d="${k.path}" fill="${fill}" fill-rule="evenodd"/>${k.circles.map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`).join('')}</g>`;
  }
  // The monitor: bezel, the chart, and the screen's own sheen. w is its width in set units.
  function monitor(st, id, w, bare = false) {
    const k = w / CW;
    return `<rect x="${n(-14 * k)}" y="${n(-14 * k)}" width="${n(w + 28 * k)}" height="${n(CH * k + 28 * k)}" rx="${n(14 * k)}" fill="#0B0B0C" stroke="#2A2A2C" stroke-width="${n(2 * k)}"/>
      <g transform="scale(${n(k)})">${chartSVG(st, id, bare)}
        <path d="M 0 0 L ${CW * 0.42} 0 L ${CW * 0.18} ${CH} L 0 ${CH} Z" fill="#FFFFFF" opacity="0.025"/></g>`;
  }

  // ------------------------------------------------------------ props
  // A wall of vertical wood slats, lit warm from the strip below.
  function slats(x0, y0, w, h, id) {
    let o = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#120E0B"/>`;
    for (let x = x0 + 6; x < x0 + w; x += 26) o += `<rect x="${x}" y="${y0}" width="17" height="${h}" fill="url(#${id}slat)"/>`;
    return o;
  }
  // A snake plant in a black pot: upright leaves, banded, with pale edges.
  function plant(x, y, sc, seed) {
    const r = rng(seed);
    let leaves = '';
    const set = [[-26, 120, -14], [-14, 160, -6], [-2, 186, 2], [10, 150, 8], [20, 128, 14], [-6, 104, -20], [14, 96, 22]];
    for (const [bx, h, lean] of set) {
      const w = 14 + r() * 5, tipX = bx + lean * 1.4, tipY = -h;
      const c = r() < 0.5 ? '#2E5737' : '#3A6A42';
      leaves += `<path d="M ${bx - w / 2} 0 C ${bx - w / 2 + lean * 0.3} ${n(tipY * 0.5)}, ${n(tipX - 4)} ${n(tipY * 0.85)}, ${n(tipX)} ${tipY} C ${n(tipX + 3)} ${n(tipY * 0.8)}, ${bx + w / 2 + lean * 0.4} ${n(tipY * 0.5)}, ${bx + w / 2} 0 Z" fill="${c}"/>
        <path d="M ${bx - w / 2} 0 C ${bx - w / 2 + lean * 0.3} ${n(tipY * 0.5)}, ${n(tipX - 4)} ${n(tipY * 0.85)}, ${n(tipX)} ${tipY}" fill="none" stroke="#B9C77A" stroke-width="2" opacity="0.7"/>
        ${[0.25, 0.45, 0.65].map((k) => `<path d="M ${n(bx - w * 0.4 + lean * k * 0.6)} ${n(tipY * k)} q ${n(w * 0.4)} -4 ${n(w * 0.8)} 0" fill="none" stroke="#1E3A24" stroke-width="2.4" opacity="0.6"/>`).join('')}`;
    }
    return `<g transform="translate(${x} ${y}) scale(${sc})">${leaves}
      <path d="M -36 -4 L 36 -4 L 30 40 L -30 40 Z" fill="#1A1714"/><path d="M -36 -4 L 36 -4" stroke="${GOLD}" stroke-width="2.4" opacity="0.7"/>
      <path d="M -36 -4 L -30 40" stroke="#fff" stroke-width="2" opacity="0.06"/></g>`;
  }
  function books(x, y) {
    const spines = [[22, 96, '#2B2420'], [16, 84, '#1F2A2E'], [26, 102, '#3A2A1E'], [18, 90, '#22201D'], [20, 78, '#2E2620']];
    let o = '', cx = x;
    for (const [w, h, c] of spines) {
      o += `<rect x="${cx}" y="${y - h}" width="${w}" height="${h}" rx="2" fill="${c}"/><rect x="${cx + 3}" y="${y - h + 12}" width="${w - 6}" height="3" fill="${GOLD}" opacity="0.5"/><rect x="${cx}" y="${y - h}" width="2" height="${h}" fill="#fff" opacity="0.06"/>`;
      cx += w + 2;
    }
    return `${o}<g transform="rotate(-14 ${cx + 10} ${y})"><rect x="${cx + 4}" y="${y - 84}" width="20" height="84" rx="2" fill="#2A2522"/></g>`;
  }
  // Steam off the mug: three wisps rising and swaying.
  function steam(x, y, t, id) {
    let o = '';
    for (let i = 0; i < 3; i++) {
      const ph = t * 1.6 + i * 2.1, pts = [];
      for (let k = 0; k <= 8; k++) pts.push(`${n(x + (i - 1) * 12 + Math.sin(ph + k * 0.7) * (4 + k * 1.6))} ${n(y - k * 18)}`);
      o += `<path d="M ${pts.join(' L ')}" fill="none" stroke="#F2E9DD" stroke-width="${7 - i}" stroke-linecap="round" opacity="0.16" filter="url(#${id}b8)"/>`;
    }
    return o;
  }
  // The desk's top in dark walnut: a few long grain lines.
  function grain(x0, y0, x1, y1, seed) {
    const r = rng(seed);
    let o = '';
    for (let i = 0; i < 9; i++) {
      const y = y0 + (y1 - y0) * (i + r() * 0.6) / 9;
      o += `<path d="M ${x0} ${n(y)} C ${n(x0 + (x1 - x0) * 0.3)} ${n(y + (r() - 0.5) * 6)}, ${n(x0 + (x1 - x0) * 0.7)} ${n(y + (r() - 0.5) * 6)}, ${x1} ${n(y + (r() - 0.5) * 4)}" stroke="#3A2E24" stroke-width="${n(1 + r() * 1.5)}" fill="none" opacity="0.6"/>`;
    }
    return o;
  }
  // A gaming chair's back: the shell, stitched panels, gold piping.
  function chair(id) {
    return `<path d="M 90 860 C 90 760, 140 720, 236 720 L 500 720 C 576 720, 604 784, 604 870 L 604 1900 L 90 1900 Z" fill="url(#${id}chair)"/>
      <path d="M 150 900 C 150 820, 180 790, 250 788 L 444 788 C 510 790, 540 830, 540 900 L 540 1900 L 150 1900 Z" fill="#17140F"/>
      <path d="M 150 900 C 150 820, 180 790, 250 788 L 444 788 C 510 790, 540 830, 540 900" fill="none" stroke="${GOLD}" stroke-width="3" opacity="0.55"/>
      <path d="M 166 906 C 166 834, 194 806, 252 804 L 440 804 C 498 806, 524 840, 524 906" fill="none" stroke="#3A332B" stroke-width="1.6" stroke-dasharray="6 5"/>
      ${[0, 1, 2].map((i) => `<path d="M 160 ${1000 + i * 130} C 260 ${990 + i * 130}, 430 ${990 + i * 130}, 530 ${1000 + i * 130}" fill="none" stroke="#0C0A08" stroke-width="5" opacity="0.8"/>`).join('')}
      <path d="M 108 880 C 110 790, 150 744, 232 740" fill="none" stroke="#3A342D" stroke-width="6"/>`;
  }

  // ------------------------------------------------------------ the sets
  // Each returns its layers, back to front: { f: depth (1 moves with the subject, less is further
  // away), svg, blur }.
  const SETS = {};

  // At the desk, three-quarter: him on the left facing the monitor on the right, the city behind.
  const HIM = { x: 330, y: 880, s: 1.6 };
  SETS.desk = (s, t, st, p, id) => {
    const glow = glowOf(st);
    p.light = { ...p.light, tint: glow, rim: 0.9 };
    const r = rng(5);
    const towers = [[-80, 1010, 130], [40, 900, 110], [140, 1060, 90], [220, 960, 130], [340, 1030, 100], [430, 940, 110]].map(([x, top, w]) => {
      let lit = '';
      for (let wy = top + 20; wy < 1330; wy += 26) for (let wx = x + 12; wx < x + w - 12; wx += 22) if (r() < 0.32) lit += `<rect x="${wx}" y="${wy}" width="9" height="12" fill="${r() < 0.8 ? '#F3C46E' : '#BFD4FF'}" opacity="${n(0.35 + r() * 0.5)}"/>`;
      return `<rect x="${x}" y="${top}" width="${w}" height="${1340 - top}" fill="#0B0D16"/>${lit}`;
    }).join('');
    const bg = `${roomDefs(id, glow)}
      <rect x="-700" y="-700" width="2480" height="3320" fill="url(#${id}wall)"/>
      ${slats(520, -400, 760, 1840, id)}
      <rect x="-80" y="160" width="600" height="1180" fill="url(#${id}sky)"/>
      <g filter="url(#${id}b2)">${bokeh(-80, 160, 600, 760, 34, 11, [2, 8])}${towers}</g>
      <rect x="-80" y="160" width="600" height="1180" fill="url(#${id}glass)"/>
      <path d="M -60 180 L 120 180 L -60 520 Z" fill="#fff" opacity="0.03"/>
      <path d="M -80 160 h 600 v 1180 h -600 Z M 220 160 v 1180 M -80 760 h 600" fill="none" stroke="#090807" stroke-width="20"/>
      <path d="M -70 170 h 580 M 230 170 v 580" stroke="#2A241E" stroke-width="3"/>
      <rect x="-100" y="1330" width="640" height="28" fill="#0F0D0B"/><rect x="-100" y="1330" width="640" height="4" fill="#3A3128"/>
      <rect x="586" y="456" width="218" height="264" rx="3" fill="#0B0908"/>
      <rect x="600" y="470" width="190" height="236" rx="2" fill="#16120E" stroke="#3A2F23" stroke-width="5"/>
      <rect x="616" y="486" width="158" height="204" fill="#0E0C0A" stroke="#2A231B" stroke-width="2"/>
      ${crown(695, 560, 0.34)}
      <text x="695" y="652" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="34" fill="${GOLD}">TCP</text>
      <text x="695" y="674" text-anchor="middle" font-family="JB Mono" font-weight="600" font-size="9" fill="#8A7A5E" letter-spacing="2">THE CRYPTO PLAYBOOK</text>
      <rect x="810" y="330" width="420" height="16" fill="#2A2018"/><rect x="810" y="346" width="420" height="5" fill="#000" opacity="0.4"/>
      ${books(838, 330)}
      ${plant(1040, 290, 0.8, 4)}
      <rect x="-200" y="1418" width="1500" height="30" fill="${GOLD}" opacity="0.6" filter="url(#${id}b20)"/>
      <rect x="-200" y="1430" width="1500" height="5" fill="${GOLDHI}" opacity="0.6"/>
      <ellipse cx="560" cy="1432" rx="760" ry="140" fill="url(#${id}warm)"/>`;
    const place = `translate(${HIM.x} ${HIM.y}) scale(${HIM.s})`;
    const subject = `
      ${chair(id)}
      <g transform="${place}">${F.founderSVG(p, id + 'f', 'body')}</g>
      <!-- the monitor on its stand, turned towards him and us -->
      <path d="M 874 1080 L 910 1080 L 914 1452 L 870 1452 Z" fill="#161618"/><path d="M 874 1080 L 880 1080 L 882 1452 L 870 1452 Z" fill="#26262A"/>
      <g transform="translate(690 740) skewY(-9) scale(0.72 1)">${monitor(st, id + 'c', 560)}</g>
      <path d="M 690 726 L 683 730 L 683 1150 L 690 1146 Z" fill="#202024"/>
      <!-- the desk: walnut top with its grain, the near edge, the front -->
      <path d="M -300 1448 L 1400 1448 L 1400 1600 L -300 1600 Z" fill="url(#${id}desk)"/>
      ${grain(-300, 1452, 1400, 1596, 9)}
      <path d="M -300 1448 L 1400 1448" stroke="#4A3D30" stroke-width="3"/>
      <path d="M 560 1466 L 1120 1458 L 1150 1560 L 540 1570 Z" fill="#141312"/><path d="M 560 1466 L 1120 1458" stroke="#2C2925" stroke-width="2"/>
      <ellipse cx="892" cy="1462" rx="86" ry="12" fill="#18181A"/><ellipse cx="892" cy="1458" rx="70" ry="7" fill="#26262A"/>
      <path d="M -300 1600 L 1400 1600 L 1400 2400 L -300 2400 Z" fill="url(#${id}front)"/>
      <path d="M -300 1600 L 1400 1600" stroke="#5A4A3A" stroke-width="4"/><path d="M -300 1604 L 1400 1604" stroke="#000" stroke-width="3" opacity="0.5"/>
      <!-- the keyboard under his far hand, the mug and its steam -->
      <path d="M 740 1474 L 1010 1468 L 1026 1508 L 748 1516 Z" fill="#141416"/>
      <path d="M 754 1480 L 1000 1475 L 1012 1502 L 760 1508 Z" fill="#202024"/>
      ${Array.from({ length: 3 }, (_, rr) => Array.from({ length: 12 }, (__, c) => `<rect x="${n(760 + c * 20.5 + rr * 3)}" y="${n(1482 + rr * 8 - c * 0.4)}" width="16" height="5" rx="1" fill="#2E2E34"/>`).join('')).join('')}
      <g transform="translate(1100 1540)"><ellipse cx="0" cy="8" rx="44" ry="8" fill="#000" opacity="0.4"/><rect x="-38" y="-86" width="76" height="94" rx="11" fill="#141312"/><rect x="-38" y="-86" width="14" height="94" rx="7" fill="#fff" opacity="0.05"/><path d="M 38 -66 C 66 -66, 66 -18, 38 -18" fill="none" stroke="#141312" stroke-width="12"/><ellipse cx="0" cy="-86" rx="38" ry="7" fill="#0A0908"/><ellipse cx="0" cy="-85" rx="32" ry="5" fill="#2A1A10"/>${crown(0, -40, 0.17)}</g>
      ${steam(1100, 1446, t, id)}
      <g transform="${place}">${F.founderSVG(p, id + 'f', 'arm')}</g>
      <!-- the screen's light on him and the desk, and the room falling off -->
      <ellipse cx="860" cy="980" rx="560" ry="620" fill="url(#${id}glow)" style="mix-blend-mode:screen"/>
      <ellipse cx="820" cy="1500" rx="420" ry="90" fill="url(#${id}glow)" style="mix-blend-mode:screen" opacity="0.7"/>
      <rect x="-700" y="-700" width="2480" height="3320" fill="url(#${id}vig)"/>`;
    return [{ f: 0.4, svg: bg, blur: s.dof && s.dof.bg }, { f: 1, svg: subject, blur: s.dof && s.dof.all }];
  };

  // Over his shoulder: the monitor straight on, his back in the foreground, out of focus.
  SETS.ots = (s, t, st, p, id) => {
    const glow = glowOf(st);
    const bg = `${roomDefs(id, glow)}
      <rect x="-700" y="-700" width="2480" height="3320" fill="url(#${id}wall)"/>
      ${slats(-400, -400, 1880, 1520, id)}
      <rect x="640" y="300" width="460" height="16" fill="#2A2018"/><rect x="640" y="316" width="460" height="5" fill="#000" opacity="0.4"/>
      ${books(700, 300)}${plant(980, 264, 0.85, 8)}
      <rect x="40" y="250" width="160" height="200" rx="3" fill="#16120E" stroke="#3A2F23" stroke-width="5"/>${crown(120, 330, 0.26)}
      <rect x="-200" y="1100" width="1500" height="34" fill="${GOLD}" opacity="0.6" filter="url(#${id}b20)"/>
      <rect x="-200" y="1114" width="1500" height="5" fill="${GOLDHI}" opacity="0.55"/>
      <ellipse cx="540" cy="1120" rx="760" ry="150" fill="url(#${id}warm)"/>`;
    const mw = 900, mx = 540 - mw / 2, my = 560;
    const desk = `
      <path d="M -300 1190 L 1380 1190 L 1380 2300 L -300 2300 Z" fill="url(#${id}desk)"/>
      ${grain(-300, 1196, 1380, 1500, 21)}
      <path d="M -300 1190 L 1380 1190" stroke="#4A3D30" stroke-width="3"/>
      <path d="M 120 1250 L 980 1250 L 1060 1470 L 40 1470 Z" fill="#141312"/><path d="M 120 1250 L 980 1250" stroke="#2C2925" stroke-width="2"/>
      <path d="M 486 1100 L 474 1192 L 606 1192 L 594 1100 Z" fill="#161618"/><path d="M 486 1100 L 494 1100 L 484 1192 L 474 1192 Z" fill="#26262A"/>
      <ellipse cx="540" cy="1196" rx="120" ry="13" fill="#18181A"/><ellipse cx="540" cy="1192" rx="98" ry="8" fill="#26262A"/>
      <g transform="translate(1010 660) skewY(12) scale(0.5 1)"><rect x="0" y="0" width="300" height="420" rx="12" fill="#0B0B0C" stroke="#2A2A2C" stroke-width="3"/><rect x="12" y="12" width="276" height="396" rx="6" fill="#0D1117"/>
        ${Array.from({ length: 9 }, (_, i) => `<rect x="28" y="${40 + i * 40}" width="${120 + (i * 37) % 110}" height="12" rx="3" fill="${i % 3 ? '#1F2A36' : '#35A68C'}" opacity="0.7"/>`).join('')}</g>
      <g transform="translate(${mx} ${my})">${monitor(st, id + 'c', mw)}</g>
      <path d="M 240 1300 L 840 1300 L 860 1372 L 220 1372 Z" fill="#141416"/>
      <path d="M 258 1310 L 822 1310 L 838 1362 L 242 1362 Z" fill="#1E1E22"/>
      ${Array.from({ length: 4 }, (_, rr) => Array.from({ length: 15 }, (__, c) => `<rect x="${n(262 + c * 37.5 - rr * 1.5)}" y="${n(1314 + rr * 12)}" width="31" height="8" rx="2" fill="#2E2E34"/>`).join('')).join('')}
      <ellipse cx="960" cy="1350" rx="56" ry="34" fill="url(#${id}mouse)"/><path d="M 920 1340 C 940 1322, 980 1322, 1000 1340" stroke="#4A4A52" stroke-width="2" fill="none"/>
      <g transform="translate(150 1290)"><ellipse cx="0" cy="8" rx="44" ry="8" fill="#000" opacity="0.4"/><rect x="-38" y="-86" width="76" height="94" rx="11" fill="#141312"/><path d="M -38 -66 C -66 -66, -66 -18, -38 -18" fill="none" stroke="#141312" stroke-width="12"/><ellipse cx="0" cy="-86" rx="38" ry="7" fill="#0A0908"/>${crown(0, -40, 0.17)}</g>
      ${steam(150, 1196, t, id)}
      <ellipse cx="540" cy="860" rx="700" ry="560" fill="url(#${id}glow)" style="mix-blend-mode:screen" opacity="0.8"/>`;
    const him = `<g transform="translate(250 1560) scale(2.5)">${F.founderSVG(F.pose({ view: 'back', cap: p.cap }), id + 'b')}</g>`;
    const vig = `<rect x="-700" y="-700" width="2480" height="3320" fill="url(#${id}vig)"/>`;
    return [{ f: 0.45, svg: bg, blur: (s.dof && s.dof.bg) ?? 3 }, { f: 1, svg: desk }, { f: 1.5, svg: him, blur: (s.dof && s.dof.fg) ?? 9 }, { f: 1, svg: vig }];
  };

  // The monitor up close: the chart fills the width, the camera follows the story along it. The
  // example label and the replay badge stay put above it.
  SETS.screen = (s, t, st, p, id) => {
    const k = 2.0;
    // EP08 frames the whole monitor, so his desk shows under it: the stand, the keyboard, the mouse
    // and the mug, out of focus, in the screen's light
    const glow = glowOf(st);
    const below = st.story === 'clutter' ? [{ f: 1, blur: 7, svg: `
      <rect x="-1400" y="1700" width="4800" height="1700" fill="url(#${id}desk)"/>
      ${grain(-1400, 1720, 3400, 2700, 31)}
      <path d="M -1400 1700 L 3400 1700" stroke="#4A3D30" stroke-width="4"/>
      <ellipse cx="900" cy="1820" rx="980" ry="260" fill="url(#${id}glow)" style="mix-blend-mode:screen" opacity="0.8"/>
      <path d="M 850 1650 L 950 1650 L 962 1782 L 838 1782 Z" fill="#141416"/><path d="M 850 1650 L 862 1650 L 850 1782 L 838 1782 Z" fill="#26262A"/>
      <ellipse cx="900" cy="1790" rx="230" ry="26" fill="#18181A"/><ellipse cx="900" cy="1784" rx="190" ry="16" fill="#26262A"/>
      <path d="M 330 1930 L 1470 1930 L 1520 2150 L 280 2150 Z" fill="#141416"/><path d="M 352 1946 L 1450 1946 L 1492 2132 L 306 2132 Z" fill="#1E1E22"/>
      ${Array.from({ length: 5 }, (_, r) => Array.from({ length: 15 }, (__, c) => `<rect x="${n(372 + c * 72 - r * 6)}" y="${n(1958 + r * 34)}" width="60" height="26" rx="5" fill="#2C2C32"/>`).join('')).join('')}
      <path d="M 330 1930 L 1470 1930" stroke="${glow}" stroke-width="3" opacity="0.4"/>
      <ellipse cx="1700" cy="2060" rx="80" ry="50" fill="url(#${id}mouse)"/><path d="M 1640 2040 C 1670 2010, 1730 2010, 1760 2040" stroke="#4A4A52" stroke-width="3" fill="none"/>
      <g transform="translate(120 2020) scale(2)"><ellipse cx="0" cy="8" rx="44" ry="8" fill="#000" opacity="0.4"/><rect x="-38" y="-86" width="76" height="94" rx="11" fill="#141312"/><path d="M 38 -66 C 66 -66, 66 -18, 38 -18" fill="none" stroke="#141312" stroke-width="12"/><ellipse cx="0" cy="-86" rx="38" ry="7" fill="#0A0908"/><ellipse cx="0" cy="-85" rx="32" ry="5" fill="#2A1A10"/>${crown(0, -40, 0.17)}</g>` }] : [];
    return [{ f: 1, svg: `${roomDefs(id, glow)}
      <rect x="-1400" y="-700" width="4800" height="3320" fill="#08090B"/>
      <g transform="translate(40 500)">${monitor(st, id + 'c', CW * k, true)}</g>` }, ...below,
    { f: 0, svg: `<rect x="-10" y="-10" width="1100" height="1940" fill="url(#${id}vig)" opacity="0.5"/>
      <text x="64" y="452" font-family="JB Mono" font-weight="600" font-size="24" fill="#8A93A0" letter-spacing="3">EXAMPLE CHART · NOT REAL PRICES</text>
      ${st.replay > 0.01 ? `<g opacity="${n(st.replay)}" transform="translate(848 420)"><rect width="170" height="44" rx="9" fill="${GOLD}"/>
        <path d="M 20 22 L 34 12 L 34 32 Z M 35 22 L 49 12 L 49 32 Z" fill="#14110C"/>
        <text x="60" y="31" font-family="JB Mono" font-weight="600" font-size="22" fill="#14110C" letter-spacing="2">REPLAY</text></g>` : ''}` }];
  };

  // The mouse, close: his hand from the left, the click on the left button.
  SETS.mouse = (s, t, st, p, id) => {
    const glow = glowOf(st);
    const click = cl(p.hand.click);
    const bg = `${roomDefs(id, glow)}
      <rect x="-700" y="-700" width="2480" height="3320" fill="#0B0908"/>
      <ellipse cx="620" cy="300" rx="760" ry="520" fill="url(#${id}glow)"/>
      <rect x="-200" y="560" width="1500" height="26" fill="${GOLD}" opacity="0.5" filter="url(#${id}b20)"/>`;
    const desk = `
      <path d="M -400 640 L 1480 640 L 1480 2400 L -400 2400 Z" fill="url(#${id}desk)"/>
      <path d="M -400 640 L 1480 640" stroke="#3B3229" stroke-width="3"/>
      <g filter="url(#${id}b8)"><path d="M -300 700 L 420 690 L 450 860 L -300 880 Z" fill="#141416"/>
        ${Array.from({ length: 4 }, (_, r) => Array.from({ length: 6 }, (__, c) => `<rect x="${-280 + c * 112 + r * 8}" y="${712 + r * 40}" width="96" height="30" rx="5" fill="#232328"/>`).join('')).join('')}</g>
      <ellipse cx="560" cy="1250" rx="600" ry="420" fill="url(#${id}glow)" style="mix-blend-mode:screen" opacity="0.5"/>
      <g transform="translate(470 1180) rotate(-16) scale(1.3)">${mouseHand(id, click, glow)}</g>
      <rect x="-700" y="-700" width="2480" height="3320" fill="url(#${id}vig)"/>`;
    return [{ f: 0.4, svg: bg, blur: 10 }, { f: 1, svg: desk }];
  };

  // His right hand on the mouse, seen from above, fingers to the right; click 0..1 presses the left
  // button. Five fingers: the thumb along the far side, four on the buttons. His forearm is the same
  // sleeve as in every other shot, zoomed in: the muscle under black jersey, gathered above a ribbed
  // cuff at his wrist, the hand coming out of it. The sleeve is in his body's units (the wrist at 0,
  // the elbow off to the left), scaled so the hand keeps its size against it.
  const FOREARM = {
    out: [[-210, -44], [-160, -45.5], [-110, -42], [-66, -36.5], [-34, -32], [-18, -28.5], [0, -26.5]],
    inn: [[-210, 40], [-160, 40.5], [-110, 38], [-66, 34.5], [-34, 30.5], [-18, 27.5], [0, 26.5]],
    folds: [[[-150, -22], [-118, -27], [-88, -24]], [[-128, 14], [-100, 8], [-74, 11]], [[-58, -18], [-48, -6], [-52, 8]]],
    cuff: 16, litEdge: 'out', lw: 0.62,
  };
  function mouseHand(id, click, glow) {
    const press = click * 6;
    const F = window.Founder, k = 3.75 / F.HAND_SCALE;
    const sl = F.sleeveSVG(`${id}fa`, { ...FOREARM, rim: { colour: glow, op: 0.42 } }, 1);
    return `
      <ellipse cx="110" cy="46" rx="330" ry="150" fill="#000" opacity="0.5" filter="url(#${id}b20)"/>
      <ellipse cx="-330" cy="70" rx="320" ry="120" fill="#000" opacity="0.45" filter="url(#${id}b20)"/>
      <!-- the mouse -->
      <path d="M -60 -98 C 70 -120, 250 -114, 332 -52 C 368 -22, 368 24, 332 54 C 250 116, 70 122, -60 100 C -132 86, -132 -86, -60 -98 Z" fill="url(#${id}mouse)"/>
      <path d="M 150 0 L 354 0" stroke="#060607" stroke-width="3"/>
      <path d="M 150 -108 C 160 -60, 160 60, 150 108" fill="none" stroke="#060607" stroke-width="3"/>
      <path d="M 150 -106 C 232 -102, 302 -82, 336 -48 L 354 0 L 150 0 Z" fill="#000" opacity="${n(click * 0.4)}"/>
      <rect x="226" y="-11" width="48" height="22" rx="10" fill="#2E2E34"/><path d="M 232 -4 L 268 -4" stroke="#4A4A52" stroke-width="2"/>
      <path d="M 196 -104 C 260 -98, 312 -76, 340 -42" fill="none" stroke="#9A9AA6" stroke-width="3" opacity="0.35" stroke-linecap="round"/>
      <path d="M -40 -96 C 80 -114, 240 -106, 320 -58" fill="none" stroke="${glow}" stroke-width="3" opacity="0.4"/>
      <!-- his forearm in its sleeve, the hand drawn like every other hand of his, the cuff over the wrist -->
      <g transform="translate(-58 -4) scale(${n(k)})">${sl.body}</g>
      <g transform="translate(-58 -4) scale(3.75)">${F.handSVG(press > 3 ? { ...F.HANDS.mouse, index: [-5, 9, 26] } : F.HANDS.mouse, { id, lw: 0.7, sep: 0.42, openWrist: true, rim: glow })}</g>
      <g transform="translate(-58 -4) scale(${n(k)})">${sl.cuff}</g>`;
  }

  // ------------------------------------------------------------ the kinds
  KINDS.toon = {
    make(s, root) {
      s.node = el('div', 'toon', root);
      s.svgs = [];
      s.hit = el('div', 'hit', s.node);
      s.id = 't' + Math.random().toString(36).slice(2, 7);
      s.cues = (s.hits || []).map((h) => ({ t: at(h), sfx: s.hitSfx || 'slam' })).filter((c) => c.t >= s.a && c.t < s.b);
    },
    draw(s, t) {
      const cam = keyed(s.cam || [{ t: s.a, s: 1, x: 540, y: 960 }], t, numBlend);
      const p = founderAt(s.pose || [{ t: 0 }], t, s.seed);
      const st = chartAt(s.chart, t);
      const layers = SETS[s.set](s, t, st, p, s.id);
      // shake and the red edge when a stop is hit
      let shake = 0, hit = 0;
      for (const h of s.hits || []) {
        const d = t - at(h);
        if (d >= 0 && d < 0.45) { shake = Math.max(shake, 16 * (1 - d / 0.45) ** 2); hit = Math.max(hit, 1 - d / 0.45); }
      }
      const sx = shake ? Math.sin(t * 97) * shake : 0, sy = shake ? Math.cos(t * 83) * shake * 0.7 : 0;
      while (s.svgs.length < layers.length) s.svgs.push(s.node.insertBefore(document.createElementNS('http://www.w3.org/2000/svg', 'svg'), s.hit));
      layers.forEach((L, i) => {
        const f = L.f, sc = 1 + (cam.s - 1) * f;
        const x = 540 + (cam.x - 540) * f, y = 960 + (cam.y - 960) * f;
        const svg = s.svgs[i];
        svg.setAttribute('width', 1080);
        svg.setAttribute('height', 1920);
        svg.setAttribute('viewBox', '0 0 1080 1920');
        svg.style.filter = L.blur ? `blur(${L.blur}px)` : 'none';
        svg.innerHTML = `<g transform="translate(${n(540 + sx * f)} ${n(960 + sy * f)}) scale(${n(sc)}) translate(${n(-x)} ${n(-y)})">${L.svg}</g>`;
      });
      for (let i = layers.length; i < s.svgs.length; i++) s.svgs[i].innerHTML = '';
      s.hit.style.opacity = n(hit * 0.9);
      // a hard cut (fi and fo near 0) is fully on from its first frame to its last; otherwise it fades
      const cut = (s.fi ?? 0.35) <= 0.02;
      s.node.style.opacity = cut ? (t >= s.a && t < s.b ? 1 : 0) : s.p;
    },
  };

  // style 'note': a numbered lesson card ({ num, text, sub }); 'steps': a one-line summary.
  KINDS.caption = {
    make(s, root) {
      s.node = el('div', `caption${s.style ? ' ' + s.style : ''}`, root);
      s.node.style.top = `${s.y || 300}px`;
      if (s.size) s.node.style.fontSize = `${s.size}px`;
      s.node.innerHTML = s.style === 'note' ? `<i>${esc(s.num)}</i><b>${esc(s.text)}</b><span>${esc(s.sub)}</span>` : wordsOf(s.text);
      s.cues = s.sfx === false ? [] : [{ t: s.a, sfx: s.sfx || 'pop' }];
    },
    draw(s, t) {
      const k = E.outBack(seg(t, s.a, s.a + 0.3));
      css(s.node, { opacity: clamp(seg(t, s.a, s.a + 0.1)) * s.pOut, transform: `scale(${n(0.8 + 0.2 * k)})` });
    },
  };

  // The real app in a phone in his right hand, seen as he sees it: four fingertips curling round the
  // left edge from behind, the thumb up the right edge with its nail towards us, the heel of the hand
  // under the phone. Phone space: the phone is 604 x 1260.
  // His right hand holding the phone, as he sees it (the shot is his point of view): the phone lies in
  // his palm, his fingers wrapped round its left edge with their tips and nails over it, his thumb up
  // its right side onto the screen, the heel of his hand and his wrist below it going into the cuff
  // of his sleeve. Drawn like his other hands, to a real hand's size against the phone (the phone is
  // 604 by 1260 here, 7.1 cm wide). Returns the part behind the phone and the part in front of it.
  function povHand(F, id) {
    const C = F.colours, NAIL = { nail: '#EDBCA9', edge: '#F5DCCF', moon: '#F2CDBE', crease: '#B07058' };
    const n = (v) => Math.round(v * 10) / 10, xy = (p) => `${n(p[0])} ${n(p[1])}`;
    const LW = 4.2;
    const smooth = (pts, closed) => {
      const P = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
      let d = `M ${xy(P[1])}`;
      for (let i = 1; i < P.length - 2; i++) {
        const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
        d += ` C ${xy([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])}, ${xy([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])}, ${xy(p2)}`;
      }
      return closed ? d + ' Z' : d;
    };
    const stroke = (pts, w, col, op = 1, extra = '') => `<path d="${smooth(pts)}" fill="none" stroke="${col}" stroke-width="${n(w)}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}"${extra}/>`;
    const blur = (k) => ` filter="url(#${id}pb${k})"`;
    const defs = `<defs>${[3, 7, 14, 24].map((k) => `<filter id="${id}pb${k}" filterUnits="userSpaceOnUse" x="-600" y="-600" width="2400" height="3400" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${k}"/></filter>`).join('')}</defs>`;
    // a nail, its length along the finger: the plate, the pale crescent of its free edge at the tip,
    // the half-moon at its root, a gleam, the cuticle
    const nailSVG = (c, ang, nl, nw, gleamSide = -1) => {
      const a = nl / 2, b = nw / 2;
      const plate = `M ${n(-a)} ${n(-b * 0.82)} C ${n(-a * 0.4)} ${n(-b * 1.04)}, ${n(a * 0.5)} ${n(-b * 1.04)}, ${n(a * 0.86)} ${n(-b * 0.78)} C ${n(a * 1.08)} ${n(-b * 0.4)}, ${n(a * 1.08)} ${n(b * 0.4)}, ${n(a * 0.86)} ${n(b * 0.78)} C ${n(a * 0.5)} ${n(b * 1.04)}, ${n(-a * 0.4)} ${n(b * 1.04)}, ${n(-a)} ${n(b * 0.82)} C ${n(-a * 1.1)} ${n(b * 0.3)}, ${n(-a * 1.1)} ${n(-b * 0.3)}, ${n(-a)} ${n(-b * 0.82)} Z`;
      const edge = `M ${n(a * 0.5)} ${n(-b * 0.98)} C ${n(a * 0.28)} ${n(-b * 0.4)}, ${n(a * 0.28)} ${n(b * 0.4)}, ${n(a * 0.5)} ${n(b * 0.98)} C ${n(a * 0.9)} ${n(b * 0.7)}, ${n(a * 1.06)} ${n(b * 0.36)}, ${n(a * 1.06)} 0 C ${n(a * 1.06)} ${n(-b * 0.36)}, ${n(a * 0.9)} ${n(-b * 0.7)}, ${n(a * 0.5)} ${n(-b * 0.98)} Z`;
      return `<g transform="translate(${xy(c)}) rotate(${n(ang)})">
        <path d="${plate}" fill="${NAIL.nail}" stroke="${C.skinShade}" stroke-width="2.2" stroke-opacity="0.75"/>
        <path d="${edge}" fill="${NAIL.edge}" opacity="0.9"/>
        <ellipse cx="${n(-a * 0.7)}" cy="0" rx="${n(a * 0.2)}" ry="${n(b * 0.52)}" fill="${NAIL.moon}" opacity="0.75"/>
        <ellipse cx="${n(-a * 0.05)}" cy="${n(b * 0.36 * gleamSide)}" rx="${n(a * 0.5)}" ry="${n(b * 0.14)}" fill="#fff" opacity="0.4"/>
        <path d="M ${n(-a - 2)} ${n(-b * 0.8)} Q ${n(-a * 1.25 - 4)} 0 ${n(-a - 2)} ${n(b * 0.8)}" fill="none" stroke="${C.skinShade}" stroke-width="2.8" opacity="0.6"/></g>`;
    };

    // A finger where it wraps round the phone's left edge, seen from the front: on the left the bend
    // of its last joint turning away behind the phone, then the tip lying over the edge with its nail.
    // at: the middle of the bend; ang: the way it points (degrees); len: bend to tip; w: width.
    const finger = (at, ang, len, w, k, nailOn = true) => {
      const a = ang * Math.PI / 180, u = [Math.cos(a), Math.sin(a)], v = [-u[1], u[0]];
      const P = (s, t) => [at[0] + u[0] * s + v[0] * t, at[1] + u[1] * s + v[1] * t];
      const h0 = w / 2, h1 = w * 0.44;
      const top = [P(0, -h0), P(len * 0.3, -h0 * 0.985), P(len * 0.55, -h0 * 0.95), P(len * 0.8, -h1 * 1.02), P(len - h1 * 0.9, -h1)];
      const tip = [];
      for (let i = 1; i < 14; i++) { const th = -Math.PI / 2 + (i / 14) * Math.PI, c = Math.cos(th); tip.push(P(len - h1 * 0.9 + Math.pow(c, 0.7) * h1 * 0.98, Math.sin(th) * h1)); }
      const bot = [P(len - h1 * 0.9, h1), P(len * 0.8, h1 * 1.02), P(len * 0.55, h0 * 0.95), P(len * 0.3, h0 * 0.985), P(0, h0)];
      const bend = [];
      for (let i = 1; i < 14; i++) { const th = Math.PI / 2 + (i / 14) * Math.PI; bend.push(P(Math.cos(th) * h0 * 0.62, Math.sin(th) * h0)); }
      const outline = [...top, ...tip, ...bot, ...bend];
      const d = `M ${outline.map(xy).join(' L ')} Z`, cid = `${id}f${k}`;
      const nl = Math.min(len * 0.46, w * 0.62), nw = w * 0.5;
      const crease = (s, span, bow, op) => `<path d="M ${xy(P(s, -h0 * span))} Q ${xy(P(s + bow, 0))} ${xy(P(s, h0 * span * 0.9))}" fill="none" stroke="${NAIL.crease}" stroke-width="2.6" stroke-linecap="round" opacity="${op}"/>`;
      return {
        shadow: `<path d="${d}" transform="translate(12 18)" fill="#000" opacity="0.45"${blur(7)}/>`,
        line: `<path d="${d}" fill="${C.line}" stroke="${C.line}" stroke-width="${LW * 2}" stroke-linejoin="round"/>`,
        body: `<clipPath id="${cid}"><path d="${d}"/></clipPath>
          <path d="${d}" fill="${C.skin}"/>
          <g clip-path="url(#${cid})">
            ${stroke([P(-h0, h0 * 0.8), P(len * 0.4, h0 * 0.86), P(len, h1 * 0.9)], w * 0.42, C.skinShade, 0.55, blur(7))}
            ${stroke([P(-h0 * 0.4, -h0 * 1.1), P(-h0 * 0.7, 0), P(-h0 * 0.4, h0 * 1.1)], w * 0.42, C.skinDeep, 0.5, blur(14))}
            ${stroke([P(len * 0.1, -h0 * 0.52), P(len * 0.45, -h0 * 0.55), P(len * 0.8, -h1 * 0.5)], w * 0.14, C.skinHi, 0.65, blur(3))}
            ${crease(len * 0.22, 0.6, 8, 0.38)}${crease(len * 0.22 + 10, 0.46, 7, 0.3)}${crease(len * 0.22 - 9, 0.4, 6, 0.22)}
            ${nailOn ? nailSVG(P(len - nl * 0.5 - 4, -w * 0.03), ang, nl, nw) : ''}
          </g>`,
      };
    };

    // The thumb from the ball of his hand at the phone's bottom corner, the back of it towards us, up
    // the right edge and onto the screen: the joint's wrinkles, the nail.
    const thumb = (() => {
      const B = [742, 1312], J = [664, 1094], T = [602, 902];
      const lerp2 = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
      const dir = (p, q) => { const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy); return [dx / L, dy / L]; };
      const d1 = dir(B, J), d2 = dir(J, T), n1 = [-d1[1], d1[0]], n2 = [-d2[1], d2[0]];
      const nJ = [(n1[0] + n2[0]) / 2, (n1[1] + n2[1]) / 2];
      const at = (p, nn, h) => [p[0] + nn[0] * h, p[1] + nn[1] * h];
      // n points to the thumb's right going up it (towards the screen's middle is its left)
      const L = [at(lerp2(B, J, -0.8), n1, -112), at(lerp2(B, J, -0.35), n1, -104), at(B, n1, -100), at(lerp2(B, J, 0.5), n1, -88), at(J, nJ, -82), at(lerp2(J, T, 0.5), n2, -76), at(T, n2, -70)];
      const R = [at(lerp2(B, J, -0.8), n1, 118), at(lerp2(B, J, -0.35), n1, 112), at(B, n1, 104), at(lerp2(B, J, 0.5), n1, 90), at(J, nJ, 84), at(lerp2(J, T, 0.5), n2, 76), at(T, n2, 70)];
      const h = 70, cap = [];
      for (let i = 1; i < 14; i++) { const th = -Math.PI / 2 + (i / 14) * Math.PI, c = Math.cos(th); cap.push([T[0] + d2[0] * Math.pow(c, 0.7) * h * 1.02 + n2[0] * Math.sin(th) * h, T[1] + d2[1] * Math.pow(c, 0.7) * h * 1.02 + n2[1] * Math.sin(th) * h]); }
      const side = (pts) => smooth(pts).replace(/^M [-\d.]+ [-\d.]+/, '');
      const d = `${smooth(L)} L ${cap.map(xy).join(' L ')} L ${xy(R[R.length - 1])}${side(R.slice().reverse())} Z`;
      // its outline: up the side towards the screen from where it leaves the ball of the hand, round the
      // tip, and down the outer side into the hand's edge
      const open = `${smooth(L.slice(3))} L ${cap.map(xy).join(' L ')} L ${xy(R[R.length - 1])}${side(R.slice().reverse())}`;
      const cid = `${id}th`, ang = Math.atan2(d2[1], d2[0]) * 180 / Math.PI;
      const cr = (t, span, bow, op) => { const c = lerp2(J, T, t); return `<path d="M ${xy(at(c, nJ, -84 * span))} Q ${xy([c[0] + d2[0] * bow, c[1] + d2[1] * bow])} ${xy(at(c, nJ, 84 * span * 0.9))}" fill="none" stroke="${NAIL.crease}" stroke-width="2.8" stroke-linecap="round" opacity="${op}"/>`; };
      // it fades into the ball of the hand below its base
      const f0 = lerp2(B, J, 0.3), f1 = lerp2(B, J, -0.45);
      const fade = `<linearGradient id="${cid}fg" gradientUnits="userSpaceOnUse" x1="${n(f0[0])}" y1="${n(f0[1])}" x2="${n(f1[0])}" y2="${n(f1[1])}"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
        <mask id="${cid}m" maskUnits="userSpaceOnUse" x="-600" y="-600" width="2400" height="3400"><rect x="-600" y="-600" width="2400" height="3400" fill="url(#${cid}fg)"/></mask>`;
      return {
        fade, mask: `mask="url(#${cid}m)"`,
        shadow: `<path d="${d}" transform="translate(-16 20)" fill="#000" opacity="0.42"${blur(14)}/>`,
        line: `<path d="${open}" fill="none" stroke="${C.line}" stroke-width="${LW * 2}" stroke-linejoin="round"/>`,
        body: `<clipPath id="${cid}"><path d="${d}"/></clipPath>
          <path d="${d}" fill="${C.skin}"/>
          <g clip-path="url(#${cid})">
            ${stroke(R.slice(2).map((p, i) => at(p, i < 3 ? n1 : n2, -30)), 74, C.skinShade, 0.5, blur(14))}
            ${stroke(L.slice(2, 7).map((p, i) => at(p, i < 2 ? n1 : n2, 30)), 28, C.skinHi, 0.5, blur(7))}
            <ellipse cx="${n(J[0] - 6)}" cy="${n(J[1] + 4)}" rx="46" ry="32" fill="${C.skinHi}" opacity="0.32"${blur(7)}/>
            ${cr(0.06, 0.4, 9, 0.42)}${cr(0.11, 0.32, 8, 0.32)}${cr(0.01, 0.3, 7, 0.24)}
            ${nailSVG(lerp2(J, T, 0.84), ang, 112, 92, 1)}
            ${stroke([at(lerp2(B, J, -0.1), n1, -60), at(lerp2(B, J, -0.6), n1, -40)], 40, C.skinShade, 0.25, blur(14))}
          </g>`,
      };
    })();

    // The heel of his hand and his wrist below the phone (the palm side towards us: the phone lies in
    // his palm), in the phone's shadow along the top; the creases of his wrist; then his sleeve.
    const palmPts = [[180, 1120], [210, 1240], [252, 1334], [318, 1420], [382, 1504], [418, 1600], [430, 1720], [600, 1740], [772, 1712], [796, 1580], [830, 1452], [856, 1340], [854, 1236], [814, 1142], [700, 1060]];
    const palmD = smooth(palmPts, true);
    const fingers = [
      finger([-14, 1052], 7, 160, 132, 3),
      finger([-30, 912], 1, 194, 146, 2),
      finger([-22, 774], -5, 172, 138, 1),
    ];
    const k = 11.2, ang = -104;
    const sl = F.sleeveSVG(`${id}psl`, {
      out: [[-210, -44], [-160, -45.5], [-110, -42], [-66, -36.5], [-34, -32], [-18, -28.5], [0, -26.5]],
      inn: [[-210, 40], [-160, 40.5], [-110, 38], [-66, 34.5], [-34, 30.5], [-18, 27.5], [0, 26.5]],
      folds: [[[-150, -22], [-118, -27], [-88, -24]], [[-128, 14], [-100, 8], [-74, 11]], [[-58, -18], [-48, -6], [-52, 8]]],
      cuff: 16, litEdge: 'out', lw: 0.36,
    }, 1);
    const wrist = [600, 1528];
    const back = `${defs}
      <g transform="translate(${xy(wrist)}) rotate(${ang}) scale(${k})">${sl.body}</g>
      <path d="${palmD}" fill="${C.line}" stroke="${C.line}" stroke-width="${LW * 2}" stroke-linejoin="round"/>
      <clipPath id="${id}palm"><path d="${palmD}"/></clipPath>
      <path d="${palmD}" fill="${C.skin}"/>
      <g clip-path="url(#${id}palm)">
        ${stroke([[150, 1272], [400, 1290], [640, 1286], [880, 1262]], 110, C.skinDeep, 0.55, blur(24))}
        ${stroke([[300, 1420], [430, 1500], [610, 1530], [790, 1490]], 60, C.skinShade, 0.4, blur(14))}
        ${stroke([[740, 1300], [776, 1360], [770, 1420]], 80, C.skinHi, 0.32, blur(24))}
        ${stroke([[330, 1330], [400, 1380], [470, 1400]], 60, C.skinHi, 0.26, blur(24))}
        ${stroke([[600, 1300], [580, 1380], [586, 1450]], 40, C.skinShade, 0.32, blur(14))}
        ${stroke([[662, 1282], [632, 1356], [626, 1430]], 3, NAIL.crease, 0.45)}
        ${stroke([[400, 1476], [520, 1500], [650, 1500], [790, 1470]], 2.8, NAIL.crease, 0.45)}
        ${stroke([[412, 1502], [530, 1522], [660, 1522], [780, 1496]], 2.4, NAIL.crease, 0.32)}
      </g>
      <g transform="translate(${xy(wrist)}) rotate(${ang}) scale(${k})">${sl.cuff}</g>
      ${thumb.fade}<g ${thumb.mask}>${thumb.line}${thumb.body}</g>`;
    // over the phone: the fingertips, and the thumb again where it lies on the phone (the same drawing,
    // so it joins the part beside the phone without a seam)
    const phoneClip = `<clipPath id="${id}ph"><rect x="0" y="0" width="604" height="1260" rx="92"/></clipPath>`;
    const front = `${defs}${phoneClip}
      <g clip-path="url(#${id}ph)">${fingers.map((f) => f.shadow).join('')}${thumb.shadow}</g>
      ${fingers.map((f) => f.line + f.body).join('')}
      <g clip-path="url(#${id}ph)">${thumb.line}${thumb.body}</g>`;
    return { back, front };
  }

  KINDS.handPhone = {
    make(s, root) {
      KINDS.phone.make(s, root);
      const h = povHand(window.Founder, `ph${Math.random().toString(36).slice(2, 7)}`);
      const wrap = (inner) => `<svg class="hand" style="position:absolute;left:-260px;top:0;width:1124px;height:1900px;overflow:visible;filter:brightness(0.9)" viewBox="-260 0 1124 1900">${inner}</svg>`;
      // the phone's shadow falls on the room, not on his hand: drawn first, under the hand
      s.phone.querySelector('.shell').style.boxShadow = '0 0 0 1.5px rgba(246,227,163,.18) inset, 0 0 0 5px #0b0a08 inset';
      const shadow = `<svg class="hand" style="position:absolute;left:-260px;top:0;width:1124px;height:1900px;overflow:visible" viewBox="-260 0 1124 1900">
        <filter id="${s.id || 'ph'}sh" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="50"/></filter>
        <rect x="10" y="60" width="584" height="1240" rx="92" fill="#000" opacity="0.7" filter="url(#${s.id || 'ph'}sh)"/></svg>`;
      s.phone.insertAdjacentHTML('afterbegin', wrap(h.back));
      s.phone.insertAdjacentHTML('afterbegin', shadow);
      s.phone.insertAdjacentHTML('beforeend', wrap(h.front));
    },
    async draw(s, t) {
      await KINDS.phone.draw(s, t);
      // the demo label above the phone, clear of the hand
      const pose = s.pose ? s.pose : [{ t: s.a, x: 540, y: 1000, s: 0.86 }];
      const k = keyed(pose, t, numBlend);
      css(s.tag, { left: `${k.x - 110}px`, top: `${k.y - 630 * k.s - 70}px` });
    },
  };
})();
