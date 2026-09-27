// TCP Quant Terminal: the page. build.mjs puts lib.js in front of this file and
// both inside app.html, so every name from lib.js is in scope here.
// ------------------------------------------------------------------ setup
const BOT = 'TCPInnerCircleBot';
const tg = window.Telegram && window.Telegram.WebApp;
const demo = new URLSearchParams(location.search).has('demo');
const $ = (id) => document.getElementById(id);
const store = {
  get: (k) => { try { return localStorage.getItem('tcp.' + k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem('tcp.' + k, v); } catch {} },
};
for (const el of document.querySelectorAll('[data-crown]')) el.replaceWith($('crown').content.cloneNode(true));
if (tg) {
  tg.ready();
  tg.expand();
  try { tg.setHeaderColor('#0E0D0B'); tg.setBackgroundColor('#0E0D0B'); tg.disableVerticalSwipes && tg.disableVerticalSwipes(); } catch {}
}
const haptic = () => { try { tg && tg.HapticFeedback.selectionChanged(); } catch {} };
const clock = () => Math.floor(Date.now() / 1000);
const money = (v, ccy) => (ccy === 'GBP' ? '£' : ccy === 'EUR' ? '€' : '$') + fmtNum(v, 2);
const signed = (v, d) => (v > 0 ? '+' : v < 0 ? '−' : '') + fmtNum(Math.abs(v), d);
const pct = (p) => (p == null ? '—' : p >= 0.995 ? '>99%' : p < 0.005 ? '<1%' : `${Math.round(p * 100)}%`);
const ago = (t) => { const s = clock() - t; return s < 10 ? 'just now' : s < 90 ? `${s}s ago` : `${fmtDuration(s)} ago`; };
const ordinal = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
const tzOffset = () => -new Date().getTimezoneOffset() * 60; // the chart shows the member's local time

// ------------------------------------------------------------------- data
async function call(path) {
  const res = await fetch(path, { headers: { authorization: 'tma ' + (tg ? tg.initData : '') } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.message || 'Something went wrong'), { code: body.error, status: res.status });
  return body;
}

async function post(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { authorization: 'tma ' + (tg ? tg.initData : ''), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || 'Something went wrong'), { code: data.error });
  return data;
}

// Demo mode (?demo): two months of made-up prices, run through the same engine. No member data.
const demoWalk = {};
function demoData(symbol) {
  const m = MARKETS[symbol];
  let seed = symbol === 'XAUUSD' ? 11 : 29;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const normal = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());
  const now = clock();
  const quiet = symbol === 'XAUUSD' ? 0.0011 : 0.0035;
  const hourSd = (h) => (h >= 8 && h < 12 ? quiet * 2.6 : h >= 3 && h < 8 ? quiet * 1.6 : quiet);
  const bars = [];
  let price = symbol === 'XAUUSD' ? 3712 : 64250;
  for (let t = Math.floor((now - 90 * 86400) / 900) * 900; t <= now - 900; t += 900) {
    if (!marketOpen(t, m)) continue;
    const sd = hourSd(nyHour(t)) / 2 / Math.sqrt(3);
    const o = price;
    let h = o;
    let l = o;
    for (let k = 0; k < 3; k++) { price *= Math.exp(sd * normal()); h = Math.max(h, price); l = Math.min(l, price); }
    bars.push({ t, o, h, l, c: price });
  }
  const hourly = groupBars(bars, (b) => Math.floor(b.t / 3600)).map((b) => ({ t: Math.floor(b.t / 3600) * 3600, o: b.o, h: b.h, l: b.l, c: b.c }));
  const snap = snapshot(m, toDays(hourly, m), bars.slice(-400), now);
  const profile = volProfile(hourly);
  demoWalk[symbol] = { price: snap.price, sd: (t) => hourSd(nyHour(t)), normal };
  return {
    ...snap,
    engine: { profile, dayEnd: dayEnd(snap.day, m), state: marketState([...hourly, { t: now, o: snap.price, h: snap.price, l: snap.price, c: snap.price }], profile), check: calibrate(hourly, m) },
    spark: hourly.slice(-47).map((b) => b.c).concat(snap.price),
    bars: bars.slice(-192).map((b) => [b.t, b.o, b.h, b.l, b.c]),
    source: 'demo data', updated: now - 20, stale: false, fx: { USD: 1, GBP: 1.34, EUR: 1.17 },
  };
}

// ------------------------------------------------------------------ state
const state = { symbol: store.get('symbol') === 'BTCUSD' ? 'BTCUSD' : 'XAUUSD', data: {}, fx: null, streaming: false };
const live = {}; // symbol -> { price, high, low, t }
const current = () => state.data[state.symbol];
function quoteOf(symbol) {
  const d = state.data[symbol];
  const l = live[symbol];
  if (!d || d.error) return null;
  return { price: l ? l.price : d.price, high: l ? l.high : d.dayHigh, low: l ? l.low : d.dayLow };
}

// A new price from the stream (or the demo): the quote, today's range, the last candle and the odds follow it.
function onTick(symbol, price, t) {
  const d = state.data[symbol];
  if (!d || d.error || !(price > 0)) return;
  const m = MARKETS[symbol];
  const l = (live[symbol] ||= { price: d.price, high: d.dayHigh ?? d.price, low: d.dayLow ?? d.price });
  const direction = Math.sign(price - l.price);
  l.price = price;
  l.t = t;
  if (dayKey(t, m) !== d.day) { loadMarket(symbol); return; }
  l.high = Math.max(l.high, price);
  l.low = Math.min(l.low, price);
  const slot = Math.floor(t / 900) * 900;
  const last = d.bars[d.bars.length - 1];
  if (last && last[0] === slot) { last[2] = Math.max(last[2], price); last[3] = Math.min(last[3], price); last[4] = price; }
  else if (!last || slot > last[0]) d.bars.push([slot, last ? last[4] : price, Math.max(price, last ? last[4] : price), Math.min(price, last ? last[4] : price), price]);
  if (symbol === state.symbol) {
    if (series) series.update(candle(d.bars[d.bars.length - 1]));
    frame(direction);
  }
}

let pendingDirection = 0;
let framed = false;
function frame(direction = 0) {
  if (direction) pendingDirection = direction;
  if (framed) return;
  framed = true;
  requestAnimationFrame(() => {
    framed = false;
    renderPrice(pendingDirection);
    pendingDirection = 0;
    renderOdds();
    renderTesting();
    queueBriefing();
  });
}

// The briefing follows the price at most once a second, always ending on the latest tick.
let briefTimer = 0;
function queueBriefing() {
  if (!briefTimer) briefTimer = setTimeout(() => { briefTimer = 0; renderBriefing(); }, 1000);
}

// Bitcoin streams tick by tick, first from the exchange the Worker's prices came from.
// A stream that won't connect or goes quiet hands over to the next exchange.
const STREAMS = {
  coinbase: {
    name: 'Coinbase', url: 'wss://ws-feed.exchange.coinbase.com',
    hello: { type: 'subscribe', product_ids: ['BTC-USD'], channels: ['ticker'] },
    tick: (m) => (m.type === 'ticker' && m.product_id === 'BTC-USD' ? [+m.price, Date.parse(m.time) / 1000] : null),
  },
  bitstamp: {
    name: 'Bitstamp', url: 'wss://ws.bitstamp.net',
    hello: { event: 'bts:subscribe', data: { channel: 'live_trades_btcusd' } },
    tick: (m) => (m.event === 'trade' && m.data ? [+m.data.price, +m.data.timestamp] : null),
  },
  kraken: {
    name: 'Kraken', url: 'wss://ws.kraken.com/v2',
    hello: { method: 'subscribe', params: { channel: 'ticker', symbol: ['BTC/USD'] } },
    tick: (m) => (m.channel === 'ticker' && Array.isArray(m.data) && m.data[0] ? [+m.data[0].last, 0] : null),
  },
  binance: {
    name: 'Binance', url: 'wss://data-stream.binance.vision/ws/btcusdt@miniTicker',
    hello: null,
    tick: (m) => (m.e === '24hrMiniTicker' ? [+m.c, m.E / 1000] : null),
  },
};
let ws = null;
let wsTimer = null;
let wsQuiet = null;
const wsFailed = new Set(); // exchanges that gave no price since the last one that did
let wsRounds = 0; // full rounds of exchanges with no price, for the back-off
function streamBitcoin(on) {
  if (demo) return;
  clearTimeout(wsTimer);
  if (!on) {
    if (ws) { ws.onclose = null; ws.close(); ws = null; }
    clearTimeout(wsQuiet);
    state.streaming = false;
    return;
  }
  if (ws) return;
  const d = state.data.BTCUSD;
  const first = d && STREAMS[d.feed] ? d.feed : 'coinbase';
  const order = [first, ...Object.keys(STREAMS).filter((k) => k !== first)];
  if (order.every((k) => wsFailed.has(k))) { wsFailed.clear(); wsRounds++; }
  const key = order.find((k) => !wsFailed.has(k));
  const feed = STREAMS[key];
  let heard = false;
  let sock;
  const retry = () => {
    // The next exchange straight away; after a whole round with no price, wait longer each time.
    const wait = wsFailed.size < order.length ? 1000 : Math.min(60e3, 5000 * 2 ** wsRounds);
    if (state.symbol === 'BTCUSD' && document.visibilityState === 'visible') wsTimer = setTimeout(() => streamBitcoin(true), wait);
  };
  try { sock = ws = new WebSocket(feed.url); } catch { ws = null; wsFailed.add(key); retry(); return; }
  // Nothing for 10 seconds (30 once prices have been flowing): close it and try again.
  const watch = () => { clearTimeout(wsQuiet); wsQuiet = setTimeout(() => sock.close(), heard ? 30e3 : 10e3); };
  watch();
  sock.onopen = () => { if (feed.hello) sock.send(JSON.stringify(feed.hello)); };
  sock.onmessage = (e) => {
    let msg;
    try { msg = JSON.parse(e.data); } catch { return; }
    const tick = feed.tick(msg);
    if (!tick || !(tick[0] > 0)) return;
    if (!heard) { heard = true; wsFailed.clear(); wsRounds = 0; }
    watch();
    state.streaming = key;
    onTick('BTCUSD', tick[0], tick[1] > 0 ? tick[1] : clock());
  };
  sock.onclose = () => {
    if (ws !== sock) return;
    ws = null;
    clearTimeout(wsQuiet);
    state.streaming = false;
    if (!heard) wsFailed.add(key); // a stream that gave prices and dropped reconnects to the same exchange
    retry();
  };
  sock.onerror = () => sock.close();
}

// Demo ticks: the same random walk, second by second, so previews move like the real thing.
function demoTick() {
  const w = demoWalk[state.symbol];
  const m = MARKETS[state.symbol];
  const now = Date.now() / 1000;
  if (!w || !marketStatus(m, now).open) return;
  w.price *= Math.exp(w.sd(now) * Math.sqrt(1.5 / 3600) * 2.2 * w.normal());
  onTick(state.symbol, w.price, now);
}

// ---------------------------------------------------------------- engine strip
function renderEngine(now) {
  const d = current();
  const m = MARKETS[state.symbol];
  const open = marketStatus(m, now).open;
  const el = $('engine');
  let mode = 'live';
  let text = 'starting…';
  if (d && !d.error) {
    if (demo) text = 'demo prices · ticking';
    else if (!open) { mode = 'closed'; const s = marketStatus(m, now); text = `opens in ${fmtDuration(s.opensAt - now)}`; }
    else if (d.stale) { mode = 'delayed'; text = `last prices ${ago(d.updated)}`; }
    else if (state.symbol === 'BTCUSD' && state.streaming) text = `${STREAMS[state.streaming].name} ticks`;
    else text = `synced ${ago(d.updated)}`;
  }
  el.className = `engine ${mode}`;
  $('engineState').textContent = demo ? 'DEMO' : mode === 'live' ? 'LIVE' : mode === 'closed' ? 'CLOSED' : 'DELAYED';
  $('engineSync').textContent = text;
}

// ------------------------------------------------------------------ quote
function renderStatus(now) {
  const m = MARKETS[state.symbol];
  const s = marketStatus(m, now);
  const pill = $('status');
  pill.classList.toggle('open', s.open);
  pill.lastElementChild.textContent = m.day === 'utc' ? 'Open 24/7'
    : s.open ? `Open · ${s.weekendClose ? 'weekend' : 'break'} in ${fmtDuration(s.closesAt - now)}`
    : `${s.reason === 'weekend' ? 'Weekend' : 'Break'} · opens in ${fmtDuration(s.opensAt - now)}`;
}

function renderPrice(direction = 0) {
  const d = current();
  const q = quoteOf(state.symbol);
  if (!q) return;
  const el = $('price');
  el.textContent = fmtNum(q.price, d.digits);
  if (direction) {
    el.classList.remove('tick-up', 'tick-down');
    void el.offsetWidth; // restart the flash
    el.classList.add(direction > 0 ? 'tick-up' : 'tick-down');
  }
  const change = d.dayOpen != null ? q.price - d.dayOpen : null;
  const ch = $('change');
  ch.className = 'change ' + (change > 0 ? 'up' : change < 0 ? 'down' : '');
  ch.textContent = change == null ? 'No trading yet today' : `${signed(change, d.digits)} (${signed((change / d.dayOpen) * 100, 2)}%) today`;
  if (!direction || Date.now() - sparkAt > 2000) { sparkAt = Date.now(); renderSpark(d, q.price); }
}
let sparkAt = 0;

function renderSpark(d, price) {
  const values = d.spark.slice(0, -1).concat(price);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const x = (i) => (i / (values.length - 1)) * 110 + 1;
  const y = (v) => 44 - ((v - lo) / (hi - lo || 1)) * 40;
  const path = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const rising = price >= values[0];
  const color = rising ? '#35A68C' : '#E0613F';
  $('spark').innerHTML = `<defs><linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>` +
    `<path d="${path} L111 46 L1 46 Z" fill="url(#sparkFill)"/><path d="${path}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/>` +
    `<circle cx="${x(values.length - 1)}" cy="${y(price)}" r="2.6" fill="${color}"><animate attributeName="r" values="2.6;5;2.6" dur="1.8s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;.5;1" dur="1.8s" repeatCount="indefinite"/></circle>`;
}

// ------------------------------------------------------------------ chart
let chart = null;
let series = null;
let lines = [];
let coneLines = [];
let framedFor = null;
const candle = ([t, o, h, l, c]) => ({ time: t + tzOffset(), open: o, high: h, low: l, close: c });

function ensureChart() {
  if (chart || !window.LightweightCharts) return !!chart;
  if ($('chartNote')) $('chartNote').remove();
  chart = LightweightCharts.createChart($('chart'), {
    autoSize: true,
    layout: { background: { type: 'solid', color: 'transparent' }, textColor: '#A69D8C', fontFamily: 'JetBrains Mono', fontSize: 10 },
    grid: { vertLines: { color: 'rgba(58,52,41,.35)' }, horzLines: { color: 'rgba(58,52,41,.35)' } },
    rightPriceScale: { borderColor: '#2E2A22', scaleMargins: { top: 0.1, bottom: 0.08 } },
    timeScale: { borderColor: '#2E2A22', timeVisible: true, secondsVisible: false, rightOffset: 2 },
    crosshair: { mode: 1, vertLine: { color: '#6B6352', labelBackgroundColor: '#3A3429' }, horzLine: { color: '#6B6352', labelBackgroundColor: '#3A3429' } },
  });
  series = chart.addCandlestickSeries({ upColor: '#35A68C', downColor: '#E0613F', borderVisible: false, wickUpColor: '#35A68C', wickDownColor: '#E0613F' });
  coneLines = [
    ['rgba(166,157,140,.75)', 1], ['rgba(227,192,109,.9)', 2], ['rgba(227,192,109,.9)', 2], ['rgba(166,157,140,.75)', 1],
  ].map(([color, lineStyle]) => chart.addLineSeries({ color, lineWidth: 1, lineStyle, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false }));
  return true;
}

const LINE_STYLE = {
  pdh: ['PDH', '#D8AD4E', 2], pdl: ['PDL', '#D8AD4E', 2], pwh: ['PWH', '#E3C06D', 0], pwl: ['PWL', '#E3C06D', 0],
  tokyo_h: ['Asia H', '#8C7BD1', 2], tokyo_l: ['Asia L', '#8C7BD1', 2],
};

function renderChart(d) {
  if (!ensureChart()) {
    if (!window.LightweightCharts && $('chartNote')) $('chartNote').textContent = "The chart couldn't load. Everything else is live.";
    return;
  }
  series.applyOptions({ priceFormat: { type: 'price', precision: d.digits, minMove: 1 / 10 ** d.digits } });
  series.setData(d.bars.map(candle));
  for (const l of lines) series.removePriceLine(l);
  lines = d.levels.filter((l) => LINE_STYLE[l.id]).map((l) => {
    const [title, color, lineStyle] = LINE_STYLE[l.id];
    return series.createPriceLine({ price: l.price, color, lineWidth: 1, lineStyle, axisLabelVisible: true, title });
  });
  const points = renderCone(clock());
  if (framedFor !== state.symbol) {
    framedFor = state.symbol;
    chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, d.bars.length - 88), to: d.bars.length + Math.min(points, 40) + 1 });
  }
}

// The 68% and 95% cones from now to the close, on the chart's 15-minute grid.
function renderCone(now) {
  const d = current();
  if (!chart || !d || d.error) return 0;
  const m = MARKETS[state.symbol];
  const q = quoteOf(state.symbol);
  const empty = () => { for (const s of coneLines) s.setData([]); return 0; };
  if (!marketStatus(m, now).open || !d.engine) return empty();
  const slot = Math.floor(now / 900) * 900;
  const points = cone(q.price, d.engine.profile, now, d.engine.dayEnd).filter((p) => p.t % 900 === 0 || p.t === d.engine.dayEnd);
  if (!points.length) return empty();
  const off = tzOffset();
  const apex = { time: slot + off, value: q.price };
  ['u2', 'u1', 'l1', 'l2'].forEach((key, i) => coneLines[i].setData([apex, ...points.filter((p) => p.t > slot).map((p) => ({ time: p.t + off, value: p[key] }))]));
  return points.length;
}

// ------------------------------------------------------------ probability
let levelOrder = '';
function renderOdds() {
  const d = current();
  const q = quoteOf(state.symbol);
  if (!d || d.error || !q || !d.engine) return;
  const now = clock();
  const m = MARKETS[state.symbol];
  const open = marketStatus(m, now).open;
  const variance = open ? varianceBetween(d.engine.profile, now, d.engine.dayEnd) : 0;
  $('closeIn').textContent = open ? `close in ${fmtDuration(d.engine.dayEnd - now)}` : 'market closed';
  if (variance > 0) {
    const [l1, u1] = band(q.price, variance, 1);
    const [l2, u2] = band(q.price, variance, 2);
    const pair = (lo, hi) => `<small>HIGH</small>${fmtNum(hi, d.digits)}<br><small>LOW&nbsp;</small>${fmtNum(lo, d.digits)}`;
    $('band68').innerHTML = pair(l1, u1);
    $('band95').innerHTML = pair(l2, u2);
  } else {
    $('band68').textContent = $('band95').textContent = 'at the open';
  }
  const odds = levelOdds(d.levels, q.price, q.high, q.low, variance);
  const inPlay = odds.filter((o) => !o.touched);
  const touched = odds.filter((o) => o.touched);
  const order = `${open}|` + odds.map((o) => o.id + (o.touched ? '*' : o.side === 'above' ? '+' : '-')).join();
  if (order !== levelOrder) {
    levelOrder = order;
    const rows = inPlay.map((o) => `
      <div class="lv ${o.side}" data-id="${o.id}">
        <div class="lv-top"><span class="lv-name">${o.name}</span><b class="lv-price">${fmtNum(o.price, d.digits)}</b><em class="lv-dist"></em></div>
        ${open ? '<div class="lv-odds"><div class="lv-bar"><i></i></div><span class="lv-pct"></span></div>' : ''}
      </div>`);
    const at = inPlay.findIndex((o) => o.side === 'below');
    rows.splice(at < 0 ? rows.length : at, 0, '<div class="lv now"><span>Price now</span><b id="lvNow"></b></div>');
    $('levels').innerHTML = (open ? '' : '<div class="closed-note">The market is closed: the odds come back at the open.</div>') + rows.join('') +
      (touched.length ? `<div class="touched"><span class="label">Touched today</span>${touched.map((o) => `<span>${o.name} ${fmtNum(o.price, d.digits)}</span>`).join('')}</div>` : '');
  }
  for (const o of inPlay) {
    const row = $('levels').querySelector(`[data-id="${o.id}"]`);
    if (!row) continue;
    row.querySelector('.lv-dist').textContent = signed(o.price - q.price, d.digits);
    if (!open) continue;
    const width = `${Math.max(1.5, o.touch * 100)}%`;
    requestAnimationFrame(() => { row.querySelector('.lv-bar i').style.width = width; });
    row.querySelector('.lv-pct').textContent = pct(o.touch);
  }
  if ($('lvNow')) $('lvNow').textContent = fmtNum(q.price, d.digits);
}

// ---------------------------------------------------------- market state
function meter(label, value, note, width) {
  return `<div class="meter"><div class="row"><small>${label}</small><b>${value}</b></div>
    <div class="track"><i style="width:0" data-w="${width}"></i></div><div class="meta" style="margin-top:6px">${note}</div></div>`;
}
const grow = (root) => requestAnimationFrame(() => requestAnimationFrame(() => {
  for (const i of root.querySelectorAll('[data-w]')) { i.style.width = `${i.dataset.w}%`; if (i.dataset.l) i.style.left = `${i.dataset.l}%`; }
}));
const volWord = (rank) => (rank < 25 ? 'Quiet' : rank < 60 ? 'Normal' : rank < 85 ? 'Active' : 'Extreme');
const trendWord = (eff) => (eff < 20 ? 'Choppy' : eff < 45 ? 'Two-way' : eff < 70 ? 'Trending' : 'Strong trend');
function renderState(d) {
  const s = d.engine && d.engine.state;
  if (!s) { $('state').innerHTML = '<div class="meta">The engine needs more history for this market.</div>'; return; }
  const rank = Math.round(s.volRank * 100);
  const eff = Math.round(s.efficiency * 100);
  const mom = [['1h', s.momentum.h1], ['4h', s.momentum.h4], ['24h', s.momentum.h24]].map(([k, z]) => {
    const c = Math.max(-3, Math.min(3, z || 0));
    const w = (Math.abs(c) / 3) * 50;
    return `<div class="mom"><span>${k}</span><div class="track mid"><i class="${c >= 0 ? 'pos' : 'neg'}" style="left:50%;width:0" data-l="${c >= 0 ? 50 : 50 - w}" data-w="${w}"></i></div><em class="${c > 0 ? 'up' : c < 0 ? 'down' : ''}">${c >= 0 ? '+' : '−'}${Math.abs(z || 0).toFixed(1)}σ</em></div>`;
  }).join('');
  $('state').innerHTML =
    meter('Volatility, last 24h', `${volWord(rank)} · ${ordinal(rank)} pct`, 'Ranked against the last two months.', Math.max(3, rank)) +
    meter('Trend efficiency, last 24h', `${trendWord(eff)} · ${eff}%`, 'Net move ÷ total distance travelled.', Math.max(3, eff)) +
    `<div class="meter"><div class="row"><small>Momentum</small><b style="font-size:12px;color:var(--stone)">in standard deviations</b></div>${mom}</div>`;
  grow($('state'));
}

// ------------------------------------------------------------ volatility
function renderVolatility(d) {
  $('range').textContent = d.todayRange ? fmtNum(d.todayRange, d.digits) : '—';
  $('rangePct').textContent = d.rangePct != null && d.todayRange ? `${Math.round(d.rangePct)}%` : '—';
  $('gaugeFill').style.width = `${Math.min(100, ((d.rangePct || 0) / 150) * 100)}%`;
  $('atrLine').textContent = d.atr ? `An average day (ATR 14) moves ${fmtNum(d.atr, d.digits)}.` + (d.rangePct > 100 ? ' Today is already bigger than usual.' : '') : '';
}

// ------------------------------------------------------------ model check
function renderCheck(d) {
  const c = d.engine && d.engine.check;
  if (!c) { $('check').innerHTML = '<div class="meta">The model check needs about six weeks of history for this market.</div>'; return; }
  const W = 320;
  const H = 180;
  const x = (p) => 34 + p * (W - 46);
  const y = (p) => H - 26 - p * (H - 40);
  const grid = [0, 0.5, 1].map((p) => `<line x1="${x(0)}" x2="${x(1)}" y1="${y(p)}" y2="${y(p)}" stroke="#2E2A22"/><text x="${x(0) - 6}" y="${y(p) + 3.5}" text-anchor="end" fill="#8A8274" font-size="9" font-family="JetBrains Mono">${p * 100}%</text>`).join('');
  const xs = [0, 0.5, 1].map((p) => `<text x="${x(p)}" y="${H - 10}" text-anchor="middle" fill="#8A8274" font-size="9" font-family="JetBrains Mono">${p * 100}%</text>`).join('');
  const max = Math.max(...c.bins.map((b) => b.n));
  const dots = c.bins.map((b) => `<circle cx="${x(b.predicted)}" cy="${y(b.observed)}" r="${4 + 7 * Math.sqrt(b.n / max)}" fill="rgba(216,173,78,.22)" stroke="#E3C06D" stroke-width="1.4"/>`).join('');
  $('check').innerHTML = `
    <svg id="checkChart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Forecast against outcome">
      ${grid}${xs}
      <line x1="${x(0)}" y1="${y(0)}" x2="${x(1)}" y2="${y(1)}" stroke="#A69D8C" stroke-dasharray="4 4" stroke-width="1"/>
      <line x1="${x(0.02)}" x2="${x(0.1)}" y1="${y(0.86)}" y2="${y(0.86)}" stroke="#A69D8C" stroke-dasharray="4 4"/>
      <text x="${x(0.12)}" y="${y(0.86) + 3}" fill="#A69D8C" font-size="9" font-family="JetBrains Mono">honest line</text>
      ${dots}
      <text x="${x(0.5)}" y="12" text-anchor="middle" fill="#A69D8C" font-size="9" font-family="JetBrains Mono">what happened ↑ · what the engine said →</text>
    </svg>
    <div class="check-stats">
      <div><b>${c.n.toLocaleString('en-GB')}</b><span>forecasts</span></div>
      <div><b>${c.days}</b><span>days replayed</span></div>
      <div><b>${c.skill > 0 ? '+' : ''}${Math.round(c.skill * 100)}%</b><span>vs guessing</span></div>
    </div>
    <div class="fine">Each dot groups forecasts of a touch on the previous day's high or low, made hour by hour on days the engine hadn't seen. Dots on the line mean it said 30% and it happened 30% of the time.${c.skill < 0 ? ' <span class="warn">On this market the engine is currently doing worse than a flat guess, so treat its odds with extra care.</span>' : ''}</div>`;
}

// ------------------------------------------------------------ sessions
function renderSessions(now) {
  const list = sessionClock(now);
  const codes = { sydney: 'SYD', tokyo: 'TKY', london: 'LDN', newyork: 'NY' };
  const hours = Object.fromEntries(SESSIONS.map((s) => [s.id, s.close - s.open]));
  $('sessions').innerHTML = list.map((s) => {
    const progress = s.open ? 100 * (1 - s.closesIn / (hours[s.id] * 3600)) : 0;
    return `<div class="session${s.open ? ' open' : ''}">
      <span class="code">${codes[s.id]}</span>
      <div><b>${s.name}</b><small>${s.open ? `Open · closes in ${fmtDuration(s.closesIn)}` : s.opensIn != null ? `Opens in ${fmtDuration(s.opensIn)}` : 'Closed'}</small></div>
      <time>${new Date((s.open ? s.until : s.at) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
      ${s.open ? `<span class="prog" style="width:${progress.toFixed(1)}%"></span>` : ''}
    </div>`;
  }).join('');
  const open = list.filter((s) => s.open).map((s) => s.name);
  $('overlap').hidden = open.length < 2;
  $('overlap').textContent = open.length > 1 ? `${open.join(' and ')} overlap: usually the busiest hours.` : '';
  $('localTime').textContent = new Date(now * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ------------------------------------------------------------ briefing
// Plain English from the numbers on this screen. Written by the page, not by AI.
function renderBriefing() {
  const d = current();
  const q = quoteOf(state.symbol);
  if (!d || d.error || !q) { $('briefing').textContent = d && d.error ? d.message : ''; return; }
  const m = MARKETS[state.symbol];
  const now = clock();
  const open = marketStatus(m, now).open;
  const b = (t) => `<b>${t}</b>`;
  const parts = [];
  const change = d.dayOpen != null ? ((q.price - d.dayOpen) / d.dayOpen) * 100 : null;
  parts.push(change == null
    ? `${m.name} is at ${b(fmtNum(q.price, d.digits))}, waiting for today's first trade.`
    : `${m.name} is ${change >= 0 ? 'up' : 'down'} ${b(`${Math.abs(change).toFixed(2)}%`)} today at ${b(fmtNum(q.price, d.digits))}.`);
  const range = Number.isFinite(q.high) && Number.isFinite(q.low) ? q.high - q.low : d.todayRange;
  if (d.atr && range) parts.push(`It has covered ${b(`${Math.round((range / d.atr) * 100)}%`)} of an average day's range.`);
  if (open && d.engine) {
    const v = varianceBetween(d.engine.profile, now, d.engine.dayEnd);
    const inPlay = levelOdds(d.levels, q.price, q.high, q.low, v).filter((o) => !o.touched && !o.id.startsWith('round')).sort((x, y) => y.touch - x.touch);
    if (inPlay[0]) {
      parts.push(`The likeliest level still in play is the ${inPlay[0].name.toLowerCase()} at ${b(fmtNum(inPlay[0].price, d.digits))}: ` +
        `a ${b(pct(inPlay[0].touch))} chance of a touch before the close in ${fmtDuration(d.engine.dayEnd - now)}.`);
    }
    const [l1, u1] = band(q.price, v, 1);
    parts.push(`Two times in three, it closes between ${b(fmtNum(l1, d.digits))} and ${b(fmtNum(u1, d.digits))}.`);
  } else {
    parts.push('The market is closed, so the odds pick up again at the open.');
  }
  const s = d.engine && d.engine.state;
  if (s) {
    const trend = { Choppy: 'choppy', 'Two-way': 'two-way', Trending: 'trending', 'Strong trend': 'strongly trending' }[trendWord(Math.round(s.efficiency * 100))];
    parts.push(`Over the last 24 hours it has been ${trend}, on ${volWord(Math.round(s.volRank * 100)).toLowerCase()} volatility.`);
  }
  $('briefing').innerHTML = parts.join(' ');
}

// --------------------------------------------------- testing a key level
function renderTesting() {
  const d = current();
  const q = quoteOf(state.symbol);
  const el = $('testing');
  if (!d || d.error || !q || !d.atr || !marketStatus(MARKETS[state.symbol], clock()).open) { el.hidden = true; return; }
  const touched = (l) => Number.isFinite(q.high) && Number.isFinite(q.low) && l.price <= q.high && l.price >= q.low;
  const near = d.levels.filter((l) => !touched(l)).map((l) => ({ ...l, gap: Math.abs(l.price - q.price) }))
    .filter((l) => l.gap <= 0.08 * d.atr).sort((x, y) => x.gap - y.gap)[0];
  el.hidden = !near;
  if (near) el.textContent = `⚡ Testing the ${near.name.toLowerCase()} · ${fmtNum(near.gap, d.digits)} away`;
}

// ------------------------------------------------------ volatility clock
// The typical move in each hour of the member's day, from the engine's profile.
function renderVolClock(d) {
  const m = MARKETS[state.symbol];
  $('vclockTitle').textContent = `When ${m.name.toLowerCase()} moves`;
  if (!d.engine) { $('vclock').innerHTML = ''; $('vclockNote').textContent = ''; return; }
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const t0 = Math.floor(midnight.getTime() / 1000);
  const hours = Array.from({ length: 24 }, (_, i) => {
    const t = t0 + i * 3600;
    const trading = m.day === 'utc' || nyHour(t) !== 17; // gold's daily break
    return { i, move: trading ? Math.sqrt(d.engine.profile[nyHour(t)]) * d.price : 0 };
  });
  const max = Math.max(...hours.map((h) => h.move));
  const nowHour = new Date().getHours();
  const w = 320 / 24;
  const bars = hours.map((h) => {
    const height = max ? (h.move / max) * 72 : 0;
    const fill = h.i === nowHour ? 'url(#vcNow)' : 'rgba(166,157,140,.34)';
    return `<rect x="${(h.i * w + 1.5).toFixed(1)}" y="${(78 - height).toFixed(1)}" width="${(w - 3).toFixed(1)}" height="${Math.max(1, height).toFixed(1)}" rx="2" fill="${fill}"/>`;
  }).join('');
  const ticks = [0, 6, 12, 18].map((i) => `<text x="${i * w + 2}" y="93" fill="#8A8274" font-size="9" font-family="JetBrains Mono">${String(i).padStart(2, '0')}:00</text>`).join('');
  $('vclock').innerHTML = `<defs><linearGradient id="vcNow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6E3A3"/><stop offset="1" stop-color="#B0812F"/></linearGradient></defs>${bars}${ticks}`;
  const busiest = hours.reduce((a, h) => (h.move > a.move ? h : a), hours[0]);
  const here = hours[nowHour];
  $('vclockNote').textContent = `This hour typically moves about ${fmtNum(here.move, d.digits)}. The busiest hour is ${String(busiest.i).padStart(2, '0')}:00 to ${String((busiest.i + 1) % 24).padStart(2, '0')}:00 your time.`;
}

// ------------------------------------------------------ probability swarm
// A live Monte Carlo of the engine's own model. Dots launch one after another from
// the live price and flow to the close, each on its own random path stepping every
// five minutes with the hour-by-hour volatility; a Brownian-bridge check catches
// touches between steps. Every finished dot drops into the spread of closing prices
// and adds to the running share that touched each level, which settles on the
// engine's analytic odds.
const SWARM = { particles: 220, crossMs: 6500, step: 300, bins: 36, window: 700 };
const swarm = { raf: 0, visible: true, w: 0, h: 0, ctx: null, model: null, modelAt: 0, lastTs: 0, particles: [], done: [], legendAt: 0 };
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const LEVEL_COLOR = { pdh: '#D8AD4E', pdl: '#D8AD4E', pwh: '#E3C06D', pwl: '#E3C06D', do: '#F2ECDF', wo: '#F2ECDF' };
const SHORT = { pdh: 'PDH', pdl: 'PDL', pwh: 'PWH', pwl: 'PWL', do: 'Open', wo: 'Week open', round_up: 'Round', round_down: 'Round' };
const timeLabel = (t) => new Date(t * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const binOf = (m, x) => Math.max(0, Math.min(SWARM.bins - 1, Math.floor(((x - m.lo) / (m.hi - m.lo)) * SWARM.bins)));

function gaussian() {
  let u = 0;
  while (!u) u = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
}

// The model the dots follow: the variance of each five-minute step to the close,
// and the levels still in play. Rebuilt every couple of seconds from the live price.
function swarmModel() {
  const d = current();
  const q = quoteOf(state.symbol);
  const now = Date.now() / 1000;
  if (!d || d.error || !q || !d.engine || !marketStatus(MARKETS[state.symbol], now).open) return null;
  const steps = [];
  for (let t = now; t < d.engine.dayEnd;) {
    const next = Math.min(d.engine.dayEnd, (Math.floor(t / SWARM.step) + 1) * SWARM.step);
    steps.push(varianceBetween(d.engine.profile, t, next));
    t = next;
  }
  const total = steps.reduce((a, b) => a + b, 0);
  if (!(total > 0)) return null;
  const sd = Math.sqrt(total);
  const x0 = Math.log(q.price);
  const levels = levelOdds(d.levels, q.price, q.high, q.low, total)
    .filter((o) => !o.touched && Math.abs(Math.log(o.price / q.price)) < 2.8 * sd)
    .map((o) => ({ ...o, x: Math.log(o.price) }));
  return { steps, levels, x0, lo: x0 - 3 * sd, hi: x0 + 3 * sd, end: d.engine.dayEnd, digits: d.digits, symbol: state.symbol };
}

function launch(p, birth, model) {
  const n = model.steps.length;
  const xs = new Float64Array(n + 1);
  xs[0] = model.x0;
  const hits = {};
  let above = Infinity;
  let below = Infinity;
  for (let k = 0; k < n; k++) {
    const v = model.steps[k];
    const a = xs[k];
    const b = a + Math.sqrt(v) * gaussian();
    xs[k + 1] = b;
    for (const l of model.levels) {
      if (hits[l.id]) continue;
      // crossed at a step, or between steps (the chance a Brownian bridge reaches the level)
      if ((a - l.x) * (b - l.x) <= 0 || Math.random() < Math.exp((-2 * (l.x - a) * (l.x - b)) / v)) {
        hits[l.id] = k + 1;
        if (l.side === 'above') above = Math.min(above, k + 1);
        else below = Math.min(below, k + 1);
      }
    }
  }
  Object.assign(p, { birth, xs, hits, above, below, n });
}

function sizeSwarm() {
  const c = $('swarm');
  const w = c.clientWidth;
  const h = c.clientHeight;
  if (!w || !h) return false;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
  }
  swarm.ctx = c.getContext('2d');
  swarm.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  swarm.w = w;
  swarm.h = h;
  return true;
}

function drawSwarm(ts) {
  const m = swarm.model;
  const ctx = swarm.ctx;
  const W = swarm.w;
  const H = swarm.h;
  const plotW = W - 62;
  const top = 18;
  const bottom = H - 24;
  const Y = (x) => bottom - ((x - m.lo) / (m.hi - m.lo)) * (bottom - top);

  // Fade the previous frame, which leaves each dot a short trail.
  ctx.fillStyle = 'rgba(18,17,13,0.2)';
  ctx.fillRect(0, 0, W, H);
  ctx.font = '500 9.5px "JetBrains Mono", ui-monospace, monospace';
  ctx.lineWidth = 1;

  // Move the dots; finished ones drop into the closing spread and relaunch from the live price.
  const landed = [];
  for (const p of swarm.particles) {
    let age = (ts - p.birth) / SWARM.crossMs;
    if (age >= 1) {
      const bin = binOf(m, p.xs[p.n]);
      swarm.done.push({ bin, hits: p.hits });
      landed.push(bin);
      launch(p, ts, m);
      age = 0;
    }
    p.age = age;
  }
  if (swarm.done.length > SWARM.window) swarm.done.splice(0, swarm.done.length - SWARM.window);

  // The spread of closing prices so far, as bars on the right.
  const counts = new Array(SWARM.bins).fill(0);
  for (const r of swarm.done) counts[r.bin] += 1;
  const most = Math.max(1, ...counts);
  const binH = (bottom - top) / SWARM.bins;
  ctx.clearRect(plotW + 1, top - 4, W - plotW - 1, bottom - top + 8);
  counts.forEach((c, i) => {
    if (!c) return;
    const y = bottom - (i + 1) * binH;
    const len = (c / most) * (W - plotW - 10);
    const g = ctx.createLinearGradient(plotW + 4, 0, plotW + 4 + len, 0);
    g.addColorStop(0, 'rgba(176,129,47,.55)');
    g.addColorStop(1, 'rgba(246,227,163,.9)');
    ctx.fillStyle = g;
    ctx.fillRect(plotW + 4, y + 0.5, len, Math.max(1, binH - 1));
  });
  for (const bin of landed) {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(plotW + 5, bottom - (bin + 0.5) * binH, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Frame, time labels and the live price.
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(58,52,41,.9)';
  ctx.beginPath();
  ctx.moveTo(plotW + 0.5, top - 8);
  ctx.lineTo(plotW + 0.5, bottom + 6);
  ctx.stroke();
  ctx.fillStyle = '#8A8274';
  ctx.textAlign = 'left';
  ctx.fillText('now', 2, H - 7);
  ctx.fillText('the close', plotW + 5, 11);
  ctx.textAlign = 'right';
  ctx.fillText(timeLabel(m.end), plotW - 3, H - 7);
  ctx.fillStyle = '#35A68C';
  ctx.beginPath();
  ctx.arc(1.5, Y(m.x0), 3, 0, Math.PI * 2);
  ctx.fill();

  // The levels. Labels that would overlap share one line.
  const placed = [];
  for (const l of [...m.levels].sort((a, b) => b.x - a.x)) {
    const y = Math.round(Y(l.x)) + 0.5;
    const color = LEVEL_COLOR[l.id] || '#8A8274';
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.7;
    ctx.setLineDash(l.id.startsWith('round') ? [2, 4] : [5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(plotW, y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
    const near = placed.find((q) => Math.abs(q.y - y) < 11);
    if (near) near.names.push(SHORT[l.id] || l.name);
    else placed.push({ y, color, names: [SHORT[l.id] || l.name] });
  }
  ctx.textAlign = 'left';
  for (const label of placed) {
    ctx.fillStyle = label.color;
    ctx.fillText(label.names.join(' · '), 4, label.y - 4);
  }

  // The dots, lit once they've touched a level above (gold) or below (violet).
  for (const p of swarm.particles) {
    const kf = p.age * p.n;
    const k = Math.min(p.n - 1, Math.floor(kf));
    const x = p.xs[k] + (p.xs[k + 1] - p.xs[k]) * (kf - k);
    const up = p.above <= kf;
    const down = p.below <= kf;
    ctx.fillStyle = up && down ? '#FFFFFF' : up ? '#F6E3A3' : down ? '#B7AAF0' : 'rgba(216,173,78,.5)';
    ctx.beginPath();
    ctx.arc(p.age * plotW, Y(x), up || down ? 2 : 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSwarmMessage(text) {
  const ctx = swarm.ctx;
  ctx.clearRect(0, 0, swarm.w, swarm.h);
  ctx.fillStyle = '#8A8274';
  ctx.font = '500 12px "JetBrains Mono", ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(text, swarm.w / 2, swarm.h / 2);
}

function renderSwarmLegend() {
  const m = swarm.model;
  if (!m) { $('swarmLegend').innerHTML = ''; return; }
  const n = swarm.done.length;
  $('swarmLegend').innerHTML = m.levels.map((l) => {
    const share = n ? swarm.done.reduce((a, r) => a + (r.hits[l.id] ? 1 : 0), 0) / n : null;
    return `<div class="${l.side}"><span>${l.name} ${fmtNum(l.price, m.digits)}</span><b>${n ? pct(share) : '…'}</b><em>engine ${pct(l.touch)}</em></div>`;
  }).join('') || '<div><span>No key level is within reach before the close.</span></div>';
  $('swarmTag').textContent = `${n.toLocaleString('en-GB')} paths run`;
}

const swarmActive = () => !$('markets').hidden && document.visibilityState === 'visible' && swarm.visible;

function swarmFrame(ts) {
  swarm.raf = 0;
  if (!swarmActive()) return;
  if (ts - swarm.modelAt > 2000) {
    const next = swarmModel();
    swarm.modelAt = ts;
    if (!next || next.symbol !== swarm.model.symbol) { startSwarm(); return; }
    swarm.model = next;
  }
  drawSwarm(ts);
  swarm.lastTs = ts;
  if (ts - swarm.legendAt > 250) {
    swarm.legendAt = ts;
    renderSwarmLegend();
  }
  swarm.raf = requestAnimationFrame(swarmFrame);
}

// A fresh swarm: dots spread along the way to the close from the first frame.
function startSwarm() {
  cancelAnimationFrame(swarm.raf);
  swarm.raf = 0;
  if ($('markets').hidden || !sizeSwarm()) return;
  swarm.model = swarmModel();
  swarm.done = [];
  swarm.ctx.clearRect(0, 0, swarm.w, swarm.h);
  if (!swarm.model) {
    const d = current();
    drawSwarmMessage(d && !d.error && d.engine && !marketStatus(MARKETS[state.symbol], clock()).open ? 'The swarm runs while the market is open' : 'Waiting for prices…');
    $('swarmTag').textContent = 'paths to the close';
    renderSwarmLegend();
    return;
  }
  const t = performance.now();
  swarm.modelAt = swarm.lastTs = t;
  swarm.particles = Array.from({ length: SWARM.particles }, (_, i) => {
    const p = {};
    launch(p, t - (i / SWARM.particles) * SWARM.crossMs, swarm.model);
    return p;
  });
  if (reduceMotion) {
    // No motion: run the paths through once and show where they end.
    for (const p of swarm.particles) swarm.done.push({ bin: binOf(swarm.model, p.xs[p.n]), hits: p.hits });
    drawSwarm(t);
    renderSwarmLegend();
    return;
  }
  swarm.legendAt = 0;
  if (swarmActive()) swarm.raf = requestAnimationFrame(swarmFrame);
}

function resumeSwarm() {
  if (!swarm.model) { startSwarm(); return; }
  if (swarm.raf || !swarmActive() || reduceMotion) return;
  // Carry on from where the dots stopped, rather than relaunching them all at once.
  const gap = performance.now() - swarm.lastTs;
  if (gap > 0) for (const p of swarm.particles) p.birth += gap;
  swarm.raf = requestAnimationFrame(swarmFrame);
}
$('swarm').addEventListener('click', () => { haptic(); startSwarm(); });
if ('IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => { swarm.visible = entry.isIntersecting; if (swarm.visible) resumeSwarm(); }).observe($('swarm'));
}
let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { startSwarm(); restartOrb(); }, 250);
});


// ------------------------------------------------------------------ AI orb
// Dots orbiting each other in 3D, linked when they pass close: the AI tab's
// placeholder while TCP AI is coming.
const orb = { raf: 0, dots: null, ctx: null, w: 0, h: 0 };

function sizeOrb() {
  const c = $('orb');
  const w = c.clientWidth;
  const h = c.clientHeight;
  if (!w || !h) return false;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = Math.round(w * dpr);
  c.height = Math.round(h * dpr);
  orb.ctx = c.getContext('2d');
  orb.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  orb.w = w;
  orb.h = h;
  return true;
}

function drawOrb(t) {
  const ctx = orb.ctx;
  const cx = orb.w / 2;
  const cy = orb.h / 2 + 4;
  ctx.clearRect(0, 0, orb.w, orb.h);
  const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 120);
  glow.addColorStop(0, 'rgba(246,227,163,.32)');
  glow.addColorStop(0.35, 'rgba(216,173,78,.1)');
  glow.addColorStop(1, 'rgba(216,173,78,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, orb.w, orb.h);
  const points = orb.dots.map((d) => {
    const a = d.phase + t * d.speed;
    let x = Math.cos(a) * d.r;
    let y = Math.sin(a) * d.r * 0.3;
    let z = Math.sin(a) * d.r;
    [y, z] = [y * Math.cos(d.tilt) - z * Math.sin(d.tilt), y * Math.sin(d.tilt) + z * Math.cos(d.tilt)];
    const spin = d.spin + t * 0.18;
    [x, z] = [x * Math.cos(spin) + z * Math.sin(spin), -x * Math.sin(spin) + z * Math.cos(spin)];
    const scale = 240 / (240 + z);
    return { x: cx + x * scale, y: cy + y * scale, z, scale, size: d.size };
  });
  ctx.lineWidth = 0.6;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      const d2 = dx * dx + dy * dy;
      if (d2 > 900) continue;
      ctx.strokeStyle = `rgba(216,173,78,${(0.2 * (1 - d2 / 900)).toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(points[i].x, points[i].y);
      ctx.lineTo(points[j].x, points[j].y);
      ctx.stroke();
    }
  }
  points.sort((a, b) => b.z - a.z); // far side first
  for (const p of points) {
    const alpha = Math.max(0.25, Math.min(1, p.scale - 0.15));
    ctx.fillStyle = p.z < 0 ? `rgba(246,227,163,${alpha.toFixed(3)})` : `rgba(176,129,47,${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.scale, 0, Math.PI * 2);
    ctx.fill();
  }
}

function orbFrame(ts) {
  orb.raf = 0;
  if ($('ai').hidden || document.visibilityState !== 'visible') return;
  drawOrb(ts / 1000);
  orb.raf = requestAnimationFrame(orbFrame);
}

function startOrb() {
  if (orb.raf || !sizeOrb()) return;
  orb.dots ||= Array.from({ length: 90 }, () => ({
    r: 38 + Math.random() * 58, speed: (0.15 + Math.random() * 0.35) * (Math.random() < 0.5 ? -1 : 1),
    phase: Math.random() * Math.PI * 2, tilt: (Math.random() - 0.5) * 1.3, spin: Math.random() * Math.PI, size: 0.8 + Math.random() * 1.6,
  }));
  if (reduceMotion) drawOrb(0);
  else orb.raf = requestAnimationFrame(orbFrame);
}

function restartOrb() {
  cancelAnimationFrame(orb.raf);
  orb.raf = 0;
  if (!$('ai').hidden) startOrb();
}

// ------------------------------------------------------------- notify me
// Coming-soon features: a tap tells the team who wants what (once per feature).
const NOTIFIED = "✓ You're on the list";
for (const button of document.querySelectorAll('.notify')) {
  const feature = button.dataset.feature || button.closest('[data-feature]').dataset.feature;
  if (store.get('notify.' + feature)) { button.disabled = true; button.textContent = NOTIFIED; }
  button.addEventListener('click', async () => {
    haptic();
    button.disabled = true;
    button.textContent = 'Adding you…';
    try {
      if (!demo) await post('/api/interest', { feature });
      store.set('notify.' + feature, '1');
      button.textContent = NOTIFIED;
    } catch {
      button.disabled = false;
      button.textContent = 'Try again';
    }
  });
}

// ------------------------------------------------------------ everything
function renderMarket() {
  const d = current();
  const m = MARKETS[state.symbol];
  $('quoteName').textContent = `${m.name} · ${state.symbol === 'XAUUSD' ? 'spot' : 'BTC-USD'}`;
  const now = clock();
  renderStatus(now);
  renderEngine(now);
  if (!d || d.error) {
    const message = d ? d.message : 'Loading…';
    $('price').textContent = '—';
    $('change').textContent = '';
    $('spark').innerHTML = '';
    $('updated').innerHTML = `<span class="warn">${message}</span>`;
    if ($('chartNote')) $('chartNote').textContent = message;
    if (series) { series.setData([]); for (const s of coneLines) s.setData([]); }
    $('levels').innerHTML = `<div class="meta">${message}</div>`;
    levelOrder = '';
    for (const id of ['state', 'check', 'vclock']) $(id).innerHTML = '';
    $('briefing').textContent = d ? message : '';
    $('testing').hidden = true;
    cancelAnimationFrame(swarm.raf);
    swarm.raf = 0;
    swarm.model = null;
    if (sizeSwarm()) drawSwarmMessage(d ? 'Prices are unavailable' : 'Waiting for prices…');
    renderSwarmLegend();
    return;
  }
  renderPrice();
  $('updated').innerHTML = (d.stale ? '<span class="warn">Showing the last prices we had · </span>' : '') + `Source: ${d.source}`;
  renderChart(d);
  levelOrder = '';
  renderOdds();
  renderState(d);
  renderVolatility(d);
  renderVolClock(d);
  renderCheck(d);
  renderBriefing();
  renderTesting();
  // A running swarm keeps flowing; its model follows the newest prices every couple of seconds.
  if (!swarm.model || swarm.model.symbol !== state.symbol) startSwarm();
  if (!$('entry').value || $('entry').dataset.live === '1') setLiveEntry();
}

const inflight = {};
function loadMarket(symbol) {
  inflight[symbol] ||= (async () => {
    try {
      const d = demo ? demoData(symbol) : await call(`/api/markets?symbol=${symbol}`);
      state.data[symbol] = d;
      const streamed = live[symbol];
      if (streamed && streamed.t > d.updated && dayKey(streamed.t, MARKETS[symbol]) === d.day) {
        live[symbol] = { ...streamed, high: Math.max(streamed.high, d.dayHigh ?? -Infinity), low: Math.min(streamed.low, d.dayLow ?? Infinity) };
      } else delete live[symbol];
      if (d.fx) state.fx = d.fx;
    } catch (err) {
      if (!state.data[symbol] || state.data[symbol].error) state.data[symbol] = { error: err.code || 'failed', message: err.message };
    } finally {
      delete inflight[symbol];
    }
    if (symbol === state.symbol) renderMarket();
    renderRisk();
  })();
  return inflight[symbol];
}

function selectSymbol(symbol) {
  state.symbol = symbol;
  store.set('symbol', symbol);
  framedFor = null;
  for (const b of document.querySelectorAll('.segment button')) b.setAttribute('aria-pressed', String(b.dataset.symbol === symbol));
  streamBitcoin(symbol === 'BTCUSD');
  levelOrder = '';
  renderMarket();
  loadMarket(symbol);
}
for (const b of document.querySelectorAll('.segment button')) b.addEventListener('click', () => { haptic(); selectSymbol(b.dataset.symbol); });

// The heartbeat: clocks, countdowns and odds move every second, even between prices.
let beats = 0;
function heartbeat() {
  const now = clock();
  renderEngine(now);
  renderStatus(now);
  renderSessions(now);
  const left = 900 - (now % 900);
  $('candleTimer').textContent = marketOpen(now, MARKETS[state.symbol])
    ? `next candle ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
    : 'market closed';
  if (!$('markets').hidden) {
    renderOdds();
    renderTesting();
    if (++beats % 15 === 0) renderCone(now);
    if (beats % 5 === 0) renderBriefing();
  }
}

// ------------------------------------------------------------------- risk
const risk = { symbol: state.symbol };
const num = (id) => parseFloat(String($(id).value).replace(/,/g, ''));
$('balance').value = store.get('balance') || '';
$('currency').value = store.get('currency') || 'USD';
$('riskPct').value = store.get('riskPct') || '1';

function setLiveEntry() {
  const d = state.data[risk.symbol];
  const q = quoteOf(risk.symbol);
  if (q && Number.isFinite(q.price)) { $('entry').value = q.price.toFixed(d.digits); $('entry').dataset.live = '1'; }
}
function selectRiskMarket(symbol) {
  risk.symbol = symbol;
  for (const b of document.querySelectorAll('#riskMarket button')) b.setAttribute('aria-pressed', String(b.dataset.symbol === symbol));
  $('contract').value = store.get('contract.' + symbol) || String(MARKETS[symbol].contract);
  $('stop').value = '';
  setLiveEntry();
  if (!state.data[symbol] && symbol !== state.symbol) loadMarket(symbol);
  renderRisk();
}

function renderRisk() {
  const ccy = $('currency').value;
  const usdPerUnit = state.fx ? state.fx[ccy] : ccy === 'USD' ? 1 : null;
  $('fxHint').hidden = ccy === 'USD';
  $('fxHint').textContent = usdPerUnit ? `1 ${ccy} = ${fmtNum(usdPerUnit, 4)} USD (ECB rate)` : `The ${ccy} exchange rate isn't available right now, so use your USD balance.`;
  for (const b of document.querySelectorAll('#riskChips button')) b.setAttribute('aria-pressed', String(parseFloat(b.dataset.risk) === num('riskPct')));
  const d = state.data[risk.symbol];
  const digits = d && d.digits != null ? d.digits : MARKETS[risk.symbol].digits;
  const r = usdPerUnit && lotSize({ balance: num('balance'), riskPct: num('riskPct'), entry: num('entry'), stop: num('stop'), contract: num('contract'), usdPerUnit });
  const show = !!r;
  $('facts').hidden = !show;
  $('targets').hidden = !show || r.tooSmall;
  $('oddsNote').hidden = !show || r.tooSmall;
  if (!show) {
    $('lots').textContent = '—';
    $('lotsLine').textContent = !usdPerUnit ? 'Switch the account to USD for now.' : 'Enter your balance, entry and stop loss.';
    return;
  }
  $('lots').textContent = r.tooSmall ? '0.00' : fmtNum(r.lots, 2);
  $('lotsLine').innerHTML = r.tooSmall
    ? '<span class="warn">Below the 0.01 minimum: this stop is too wide for this risk.</span>'
    : `${r.side === 'long' ? 'Buy' : 'Sell'} ${risk.symbol}, risking ${money(r.actualRisk, ccy)}`;
  $('facts').innerHTML = [
    ['Risk budget', `${money(r.riskMoney, ccy)} (${fmtNum(num('riskPct'), 2)}%)`],
    ['Stop distance', fmtNum(r.distance, digits)],
    ['Each $1 price move', money(r.perPoint, ccy)],
    ['Loss per 1.00 lot at stop', money(r.riskPerLot, ccy)],
  ].map(([k, v]) => `<div>${k}<b>${v}</b></div>`).join('');
  const hourVar = d && d.engine ? d.engine.profile.reduce((a, b) => a + b, 0) / 24 : 0;
  const odds = r.targets.map((t) => tradeOdds(num('entry'), num('stop'), t.price, hourVar));
  $('targets').tBodies[0].innerHTML = r.targets.map((t, i) => `<tr><td>${t.r}R</td><td>${fmtNum(t.price, digits)}</td><td>${pct(odds[i] && odds[i].targetFirst)}</td><td class="up">+${money(t.profit, ccy)}</td></tr>`).join('');
  const first = odds[0];
  $('oddsNote').innerHTML = `<b>ODDS</b> are the chance the target comes before the stop if the market moves at random. A 2R trade needs to win more than <b>${pct(1 / 3)}</b> of the time to make money; beating those odds is what an edge means.` +
    (first && first.hours ? ` At this market's usual volatility, a 1R trade like this one is typically decided in about <b>${fmtDuration(first.hours * 3600)}</b>.` : '');
}

for (const id of ['balance', 'currency', 'riskPct', 'entry', 'stop', 'contract']) {
  $(id).addEventListener('input', () => {
    if (id === 'entry') $('entry').dataset.live = '0';
    if (['balance', 'currency', 'riskPct'].includes(id)) store.set(id, $(id).value);
    if (id === 'contract') store.set('contract.' + risk.symbol, $(id).value);
    renderRisk();
  });
}
$('currency').addEventListener('change', renderRisk);
for (const b of document.querySelectorAll('#riskChips button')) b.addEventListener('click', () => { $('riskPct').value = b.dataset.risk; store.set('riskPct', b.dataset.risk); haptic(); renderRisk(); });
for (const b of document.querySelectorAll('#riskMarket button')) b.addEventListener('click', () => { haptic(); selectRiskMarket(b.dataset.symbol); });
$('useLive').addEventListener('click', () => { setLiveEntry(); renderRisk(); });

// ------------------------------------------------------------------- tabs
function showTab(tab) {
  for (const s of document.querySelectorAll('main > section')) s.hidden = s.id !== tab;
  for (const b of document.querySelectorAll('nav button')) {
    if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  }
  if (tab === 'markets') { levelOrder = ''; renderOdds(); resumeSwarm(); }
  if (tab === 'ai') startOrb();
  window.scrollTo(0, 0);
}
for (const b of document.querySelectorAll('nav button')) b.addEventListener('click', () => { haptic(); showTab(b.dataset.tab); });

// ------------------------------------------------------------ sign-in gate
function gate(title, text, cta) {
  $('gateTitle').textContent = title;
  $('gateText').textContent = text;
  const a = $('gateCta');
  a.hidden = !cta;
  if (cta) {
    a.textContent = cta.label;
    a.href = cta.href;
    a.onclick = (e) => { if (tg && tg.openTelegramLink) { e.preventDefault(); tg.openTelegramLink(cta.href); } };
  }
}

async function start() {
  if (!demo) {
    if (!tg || !tg.initData) {
      return gate('Open the terminal from Telegram', 'The TCP Quant Terminal opens inside Telegram, for Inner Circle members.', { label: 'OPEN IN TELEGRAM', href: `https://t.me/${BOT}` });
    }
    try {
      const me = await call('/api/me');
      $('whoName').textContent = me.user.first_name;
      $('whoInitial').textContent = $('profileInitial').textContent = (me.user.first_name || '?').slice(0, 1).toUpperCase();
      $('who').hidden = false;
      $('profileName').textContent = me.user.first_name + (me.user.username ? ` · @${me.user.username}` : '');
      $('profileRole').textContent = me.role === 'team' ? 'TCP team' : 'TCP Inner Circle member';
    } catch (err) {
      if (err.code === 'not_member') {
        return gate('Members only', 'The Quant Terminal is part of the TCP Inner Circle. Join, and it unlocks here.', { label: 'JOIN THE INNER CIRCLE', href: `https://t.me/${BOT}?start=terminal` });
      }
      return gate("Couldn't sign you in", 'Close the terminal and open it again from the bot.', null);
    }
  } else {
    $('whoName').textContent = $('profileName').textContent = 'Demo';
    $('whoInitial').textContent = $('profileInitial').textContent = 'D';
    $('profileRole').textContent = 'Demo mode: made-up prices';
    $('who').hidden = false;
    window.tcpDemo = { price: (p) => { demoWalk[state.symbol].price = p; onTick(state.symbol, p, Date.now() / 1000); } }; // for previews
  }
  $('gate').hidden = true;
  selectSymbol(state.symbol);
  selectRiskMarket(state.symbol);
  heartbeat();
  setInterval(heartbeat, 1000);
  setInterval(() => document.visibilityState === 'visible' && !demo && loadMarket(state.symbol), 60e3);
  if (demo) setInterval(demoTick, 1500);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      loadMarket(state.symbol);
      streamBitcoin(state.symbol === 'BTCUSD');
      resumeSwarm();
      restartOrb();
    }
    else streamBitcoin(false);
  });
}
start();
