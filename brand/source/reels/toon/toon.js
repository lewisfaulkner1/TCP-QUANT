// TCP toons: the animated founder episodes, drawn by the reel engine one frame at a time. A spec loads
// this with founder.js (modules: ['toon/founder.js', 'toon/toon.js']) and uses three more kinds:
//
//   toon       one shot: a set ('desk', 'ots', 'screen', 'mouse') seen through a camera, with the founder
//              and the story chart. { set, cam: [{ t, s, x, y }], pose, chart, dof: { bg, fg, all }, hits: [t] }
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
      <filter id="${id}b2" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2"/></filter>
      <filter id="${id}b8" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="8"/></filter>
      <filter id="${id}b20" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="20"/></filter>
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
      <rect x="-80" y="160" width="600" height="1180" fill="url(#${id}sky)"/>
      <g filter="url(#${id}b2)">${bokeh(-80, 160, 600, 760, 34, 11, [2, 8])}${towers}</g>
      <path d="M -80 160 h 600 v 1180 h -600 Z M 220 160 v 1180 M -80 760 h 600" fill="none" stroke="#090807" stroke-width="20"/>
      <rect x="-100" y="1330" width="640" height="28" fill="#0F0D0B"/>
      <rect x="600" y="470" width="190" height="236" rx="3" fill="#0E0C0A" stroke="#2D261E" stroke-width="6"/>
      ${crown(695, 560, 0.34)}
      <text x="695" y="658" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="36" fill="${GOLD}">TCP</text>
      <rect x="-200" y="1418" width="1500" height="30" fill="${GOLD}" opacity="0.6" filter="url(#${id}b20)"/>
      <rect x="-200" y="1430" width="1500" height="5" fill="${GOLDHI}" opacity="0.6"/>
      <ellipse cx="560" cy="1432" rx="760" ry="140" fill="url(#${id}warm)"/>`;
    const place = `translate(${HIM.x} ${HIM.y}) scale(${HIM.s})`;
    const subject = `
      <path d="M 90 860 C 90 770, 140 730, 230 730 L 500 730 C 570 730, 600 790, 600 870 L 600 1900 L 90 1900 Z" fill="#110F0D"/>
      <path d="M 108 880 C 110 800, 146 754, 226 750" fill="none" stroke="#2E2A25" stroke-width="6"/>
      <g transform="${place}">${F.founderSVG(p, id + 'f', 'body')}</g>
      <!-- the monitor on its stand, turned towards him and us -->
      <path d="M 880 1080 L 904 1080 L 908 1460 L 876 1460 Z" fill="#141415"/>
      <g transform="translate(690 740) skewY(-9) scale(0.72 1)">${monitor(st, id + 'c', 560)}</g>
      <!-- the desk: its top, the near edge, the front -->
      <path d="M -300 1448 L 1400 1448 L 1400 1600 L -300 1600 Z" fill="url(#${id}desk)"/>
      <path d="M -300 1448 L 1400 1448" stroke="#3B3229" stroke-width="3"/>
      <ellipse cx="892" cy="1462" rx="84" ry="12" fill="#151516"/>
      <path d="M -300 1600 L 1400 1600 L 1400 2400 L -300 2400 Z" fill="url(#${id}front)"/>
      <path d="M -300 1600 L 1400 1600" stroke="#4A3F33" stroke-width="4"/>
      <!-- the keyboard under his far hand, a mug -->
      <path d="M 610 1474 L 880 1468 L 896 1508 L 618 1516 Z" fill="#141416"/>
      <path d="M 624 1480 L 870 1475 L 882 1502 L 630 1508 Z" fill="#202024"/>
      <g transform="translate(1010 1540)"><rect x="-38" y="-86" width="76" height="94" rx="11" fill="#131211"/><path d="M 38 -66 C 66 -66, 66 -18, 38 -18" fill="none" stroke="#131211" stroke-width="12"/>${crown(0, -40, 0.17)}</g>
      <g transform="${place}">${F.founderSVG(p, id + 'f', 'arm')}</g>
      <!-- the screen's light on him and the desk, and the room falling off -->
      <ellipse cx="860" cy="980" rx="560" ry="620" fill="url(#${id}glow)" style="mix-blend-mode:screen"/>
      <rect x="-700" y="-700" width="2480" height="3320" fill="url(#${id}vig)"/>`;
    return [{ f: 0.4, svg: bg, blur: s.dof && s.dof.bg }, { f: 1, svg: subject, blur: s.dof && s.dof.all }];
  };

  // Over his shoulder: the monitor straight on, his back in the foreground, out of focus.
  SETS.ots = (s, t, st, p, id) => {
    const glow = glowOf(st);
    const bg = `${roomDefs(id, glow)}
      <rect x="-700" y="-700" width="2480" height="3320" fill="url(#${id}wall)"/>
      <rect x="760" y="250" width="230" height="16" fill="#1B1712"/>
      <g opacity="0.8"><rect x="790" y="170" width="22" height="80" fill="#2A221A"/><rect x="816" y="186" width="18" height="64" fill="#3A2D1E"/><rect x="838" y="176" width="24" height="74" fill="#1F1A14"/>${crown(930, 214, 0.26)}</g>
      <rect x="-200" y="1100" width="1500" height="34" fill="${GOLD}" opacity="0.6" filter="url(#${id}b20)"/>
      <rect x="-200" y="1114" width="1500" height="5" fill="${GOLDHI}" opacity="0.55"/>
      <ellipse cx="540" cy="1120" rx="760" ry="150" fill="url(#${id}warm)"/>`;
    const mw = 900, mx = 540 - mw / 2, my = 560;
    const desk = `
      <path d="M -300 1190 L 1380 1190 L 1380 2300 L -300 2300 Z" fill="url(#${id}desk)"/>
      <path d="M -300 1190 L 1380 1190" stroke="#3B3229" stroke-width="3"/>
      <path d="M 490 1100 L 476 1196 L 604 1196 L 590 1100 Z" fill="#121213"/>
      <ellipse cx="540" cy="1198" rx="110" ry="12" fill="#0E0E0F"/>
      <g transform="translate(${mx} ${my})">${monitor(st, id + 'c', mw)}</g>
      <path d="M 240 1300 L 840 1300 L 860 1372 L 220 1372 Z" fill="#141416"/>
      <path d="M 258 1310 L 822 1310 L 838 1362 L 242 1362 Z" fill="#1E1E22"/>
      <ellipse cx="960" cy="1350" rx="56" ry="34" fill="url(#${id}mouse)"/>
      <ellipse cx="540" cy="860" rx="700" ry="560" fill="url(#${id}glow)" style="mix-blend-mode:screen" opacity="0.8"/>`;
    const him = `<g transform="translate(250 1560) scale(2.5)">${F.founderSVG(F.pose({ view: 'back', cap: p.cap }), id + 'b')}</g>`;
    const vig = `<rect x="-700" y="-700" width="2480" height="3320" fill="url(#${id}vig)"/>`;
    return [{ f: 0.45, svg: bg, blur: (s.dof && s.dof.bg) ?? 3 }, { f: 1, svg: desk }, { f: 1.5, svg: him, blur: (s.dof && s.dof.fg) ?? 9 }, { f: 1, svg: vig }];
  };

  // The monitor up close: the chart fills the width, the camera follows the story along it. The
  // example label and the replay badge stay put above it.
  SETS.screen = (s, t, st, p, id) => {
    const k = 2.0;
    return [{ f: 1, svg: `${roomDefs(id, '#9FC2FF')}
      <rect x="-1400" y="-700" width="4800" height="3320" fill="#08090B"/>
      <g transform="translate(40 500)">${monitor(st, id + 'c', CW * k, true)}</g>` },
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
  // button. Five fingers: the thumb along the far side, four on the buttons.
  function mouseHand(id, click, glow) {
    const press = click * 6;
    const skin = `fill="url(#${id}skinh)"`;
    const crease = 'fill="none" stroke="#B57F67" stroke-width="2.6" stroke-linecap="round"';
    const finger = (x0, y0, x1, y1, w, dip = 0) => {
      const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
      const p = (a, b) => `${n(x0 + ux * a + nx * b)} ${n(y0 + uy * a + ny * b + dip * (a / len))}`;
      const hw = w / 2;
      return `<path d="M ${p(0, -hw)} L ${p(len - hw, -hw * 0.9)} C ${p(len + hw * 0.35, -hw * 0.85)}, ${p(len + hw * 0.35, hw * 0.85)}, ${p(len - hw, hw * 0.9)} L ${p(0, hw)} Z" ${skin}/>
        <path d="M ${p(4, hw * 0.55)} L ${p(len - hw, hw * 0.6)} C ${p(len + hw * 0.1, hw * 0.55)}, ${p(len + hw * 0.25, hw * 0.2)}, ${p(len + hw * 0.3, 0)}" fill="none" stroke="#B9836B" stroke-width="5" opacity="0.45" stroke-linecap="round"/>
        <path d="M ${p(len - hw * 1.6, -hw * 0.5)} C ${p(len - hw * 0.15, -hw * 0.56)}, ${p(len - hw * 0.15, hw * 0.56)}, ${p(len - hw * 1.6, hw * 0.5)} Z" fill="#F8DECF"/>
        <path d="M ${p(len - hw * 1.4, -hw * 0.3)} L ${p(len - hw * 0.6, -hw * 0.32)}" stroke="#fff" stroke-width="2.4" opacity="0.6" stroke-linecap="round"/>
        <path d="M ${p(len * 0.5, -hw * 0.55)} Q ${p(len * 0.54, 0)} ${p(len * 0.5, hw * 0.55)}" ${crease} opacity="0.5"/>`;
    };
    return `
      <ellipse cx="110" cy="46" rx="330" ry="150" fill="#000" opacity="0.5" filter="url(#${id}b20)"/>
      <!-- the mouse -->
      <path d="M -60 -98 C 70 -120, 250 -114, 332 -52 C 368 -22, 368 24, 332 54 C 250 116, 70 122, -60 100 C -132 86, -132 -86, -60 -98 Z" fill="url(#${id}mouse)"/>
      <path d="M 150 0 L 354 0" stroke="#060607" stroke-width="3"/>
      <path d="M 150 -108 C 160 -60, 160 60, 150 108" fill="none" stroke="#060607" stroke-width="3"/>
      <path d="M 150 -106 C 232 -102, 302 -82, 336 -48 L 354 0 L 150 0 Z" fill="#000" opacity="${n(click * 0.4)}"/>
      <rect x="226" y="-11" width="48" height="22" rx="10" fill="#2E2E34"/><path d="M 232 -4 L 268 -4" stroke="#4A4A52" stroke-width="2"/>
      <path d="M 196 -104 C 260 -98, 312 -76, 340 -42" fill="none" stroke="#9A9AA6" stroke-width="3" opacity="0.35" stroke-linecap="round"/>
      <path d="M -40 -96 C 80 -114, 240 -106, 320 -58" fill="none" stroke="${glow}" stroke-width="3" opacity="0.4"/>
      <!-- the sleeve and wrist -->
      <path d="M -540 -62 L -250 -66 L -250 94 L -540 108 Z" fill="#141312"/>
      <path d="M -272 -68 L -236 -68 L -236 98 L -272 98 Z" fill="#0B0A09"/>
      ${Array.from({ length: 7 }, (_, i) => `<path d="M ${-270 + i * 5} -62 L ${-270 + i * 5} 92" stroke="#1F1D1B" stroke-width="1.4"/>`).join('')}
      <path d="M -540 -62 L -250 -66" stroke="${glow}" stroke-width="3" opacity="0.3"/>
      <path d="M -244 -54 C -170 -66, -90 -72, -30 -78 L -24 88 C -90 86, -170 86, -244 86 Z" ${skin}/>
      <path d="M -240 70 C -170 76, -90 80, -26 84" fill="none" stroke="#A86F58" stroke-width="10" opacity="0.35" stroke-linecap="round"/>
      <!-- the back of the hand, its knuckles and tendons -->
      <path d="M -40 -80 C 40 -100, 140 -102, 198 -86 C 216 -40, 216 40, 198 84 C 140 98, 40 100, -36 92 C -62 40, -62 -40, -40 -80 Z" ${skin}/>
      <path d="M -30 84 C 40 94, 140 92, 196 80" fill="none" stroke="#A86F58" stroke-width="12" opacity="0.3" stroke-linecap="round"/>
      <path d="M -10 -56 C 60 -60, 130 -58, 182 -54 M -14 -16 C 60 -16, 130 -12, 188 -10 M -12 24 C 60 26, 130 28, 186 32 M -6 60 C 60 62, 120 64, 176 66" fill="none" stroke="#C99479" stroke-width="2.2" opacity="0.35" stroke-linecap="round"/>
      ${[-54, -12, 30, 68].map((ky, i) => `<ellipse cx="${190 - (i === 3 ? 8 : 0)}" cy="${ky}" rx="14" ry="16" fill="#F7D9C4" opacity="0.7"/>`).join('')}
      <!-- the thumb along the far side -->
      <path d="M 28 -86 C 70 -112, 122 -126, 170 -126 C 194 -126, 202 -110, 188 -100 C 152 -92, 100 -86, 58 -70 Z" ${skin}/>
      <path d="M 150 -124 C 172 -126, 188 -120, 186 -108 C 172 -110, 160 -112, 150 -114 Z" fill="#F8DECF"/>
      <path d="M 60 -96 C 96 -112, 136 -120, 168 -122" fill="none" stroke="${glow}" stroke-width="3" opacity="0.45" stroke-linecap="round"/>
      <!-- the four fingers: index on the left button, then middle, ring, little -->
      ${finger(186, -56, 332 - press * 2, -46, 40, press)}
      ${finger(196, -12, 346, -6, 42)}
      ${finger(194, 30, 328, 36, 40)}
      ${finger(184, 66, 284, 84, 34)}
      <path d="M 192 -34 C 230 -32, 280 -28, 330 -26 M 196 10 C 240 12, 290 14, 336 16 M 192 50 C 230 54, 260 60, 290 64" fill="none" stroke="#8E5A47" stroke-width="2.6" opacity="0.5" stroke-linecap="round"/>
      <!-- the screen's light along the top of the hand -->
      <path d="M -30 -82 C 50 -102, 140 -104, 198 -88" fill="none" stroke="${glow}" stroke-width="4" opacity="0.45" stroke-linecap="round"/>`;
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

  // The real app in a phone in his right hand: thumb over the right edge, fingertips round the left.
  KINDS.handPhone = {
    make(s, root) {
      KINDS.phone.make(s, root);
      const skin = 'fill="#EDBB98"';
      const tip = (x, y, r) => `<path d="M ${x} ${y - 30} C ${x - 34} ${y - 30}, ${x - 36} ${y + 30}, ${x} ${y + 30} Z" ${skin}/><path d="M ${x - 4} ${y - 22} C ${x - 22} ${y - 20}, ${x - 22} ${y + 20}, ${x - 4} ${y + 22} Z" fill="#F7DCCB" opacity="0.8"/>`;
      const back = `<svg class="hand" style="left:-260px;top:0;width:1124px;height:1900px" viewBox="-260 0 1124 1900">
        <path d="M 360 1150 C 470 1080, 650 1100, 700 1220 C 760 1360, 740 1560, 700 1900 L 330 1900 C 340 1700, 320 1400, 360 1150 Z" ${skin}/>
        <path d="M 330 1700 L 720 1700 L 700 1900 L 320 1900 Z" fill="#141312"/>
        <path d="M 326 1690 L 724 1690 L 722 1720 L 324 1720 Z" fill="#0B0A09"/></svg>`;
      const front = `<svg class="hand" style="left:-260px;top:0;width:1124px;height:1900px" viewBox="-260 0 1124 1900">
        ${tip(18, 870, 0)}${tip(14, 990, 0)}${tip(16, 1105, 0)}
        <path d="M 640 1240 C 610 1150, 590 1060, 600 980 C 606 944, 640 940, 650 972 C 668 1040, 690 1120, 712 1210 Z" ${skin}/>
        <path d="M 600 984 C 604 958, 626 950, 638 966 C 626 976, 612 984, 600 990 Z" fill="#F7DCCB" opacity="0.85"/>
        <path d="M 610 1080 C 630 1074, 650 1078, 664 1090" fill="none" stroke="#C99479" stroke-width="3" opacity="0.6" stroke-linecap="round"/></svg>`;
      s.phone.insertAdjacentHTML('afterbegin', back);
      s.phone.insertAdjacentHTML('beforeend', front);
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
