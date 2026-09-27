// TCP Quant Terminal: the Playbook's maths, shared by the Worker and the page.
// Pure functions, nothing stored. Times are Unix seconds (UTC); bars are
// { t, o, h, l, c } with t the bar's open time, oldest first.
//
// A setup is a trade plan logged before its result: gold or Bitcoin, buy or sell,
// a market, limit or stop order, an entry, a stop and one target, the reasons, and
// the engine's read of the market at that moment. advanceSetup() walks it through
// the bars that followed the way the orders would have filled, and settles every
// doubt against the setup, so the record can only look worse than the truth:
//   - a limit order fills at its price, never better;
//   - a stop order, or a stop, that the market gaps through fills at the open;
//   - on the bar an order fills, its stop counts and its target doesn't;
//   - when one bar reaches both the stop and the target, the stop came first.
// Results are in R, as the signal publisher counts them: the move from the fill to
// the exit over the planned risk, |entry - stop|.
//
// Judging the record. If the market moves at random, a trade's expected result is
// zero before costs, whatever its stop, target or management; its target comes
// before its stop with odds risk / (risk + reward), the "no-edge odds". So an edge
// is an average result, after costs, above zero by more than luck explains. The
// band around the average is where the true average sits with 95% confidence
// (Student's t), and the record gets a verdict only after PLAYBOOK.firstRead results.
import { MARKETS, fmtNum } from './lib.js';

export const PLAYBOOK = {
  spread: { XAUUSD: 0.3, BTCUSD: 20 }, // assumed round-trip cost, in price, taken off every result
  scratch: 0.05, // a result within 0.05R of zero is a scratch, neither won nor lost
  firstRead: 20, // results before the record gets a verdict
  tagRead: 5, // results with a reason, market or session before it gets its own average
  maxTags: 6,
  minNote: 8,
  maxNote: 400,
  expiry: [4, 24, 168], // hours a limit or stop order can wait for its price
  rr: [0.3, 20], // the target's distance, in R, that a plan may use
};

const pbRound = (v, d) => Math.round(v * 10 ** d) / 10 ** d;

// A result in R for posts and the page: +2.0R, −1.0R (a true minus sign).
export const fmtR = (v, d = 1) => (Number.isFinite(v) ? (v > 0 ? '+' : v < 0 ? '−' : '') + fmtNum(Math.abs(v), d) + 'R' : '—');

// ------------------------------------------------------------------ the plan
// Tidies a plan and checks that it makes sense and, given the live `quote`
// ({ price, atr, open }), that it's honest: a market order at the price now, a
// limit or stop order on the right side of it. Returns { plan } or { error, field }.
export function checkPlan(input, quote) {
  const p = input || {};
  const market = MARKETS[p.symbol];
  if (!market) return { error: 'Pick gold or Bitcoin.', field: 'symbol' };
  if (p.side !== 'buy' && p.side !== 'sell') return { error: 'Pick buy or sell.', field: 'side' };
  if (!['market', 'limit', 'stop'].includes(p.kind)) return { error: 'Pick a market, limit or stop order.', field: 'kind' };
  const price = (v) => pbRound(typeof v === 'string' ? parseFloat(v.replace(/,/g, '')) : Number(v), market.digits);
  const [entry, sl, tp] = [p.entry, p.sl, p.tp].map(price);
  for (const [field, v, name] of [['entry', entry, 'entry'], ['sl', sl, 'stop'], ['tp', tp, 'target']]) {
    if (!(v > 0)) return { error: `Enter the ${name} price.`, field };
  }
  const buy = p.side === 'buy';
  if (buy ? !(sl < entry) : !(sl > entry)) return { error: `For a ${p.side}, the stop goes ${buy ? 'below' : 'above'} the entry.`, field: 'sl' };
  if (buy ? !(tp > entry) : !(tp < entry)) return { error: `For a ${p.side}, the target goes ${buy ? 'above' : 'below'} the entry.`, field: 'tp' };
  const rr = Math.abs(tp - entry) / Math.abs(entry - sl);
  if (rr < PLAYBOOK.rr[0] || rr > PLAYBOOK.rr[1]) {
    return { error: `The target is ${fmtNum(rr, 1)}R away: keep it between ${PLAYBOOK.rr[0]}R and ${PLAYBOOK.rr[1]}R.`, field: 'tp' };
  }
  const tags = [];
  for (const raw of Array.isArray(p.tags) ? p.tags : []) {
    const tag = String(raw).replace(/\s+/g, ' ').trim().slice(0, 24).trim();
    if (!tag || tags.some((t) => t.toLowerCase() === tag.toLowerCase())) continue;
    if (!/^[\p{L}\p{N}][\p{L}\p{N} &+./'-]*$/u.test(tag)) return { error: `"${tag}": a reason is a few words (letters, numbers, & + . / ' -).`, field: 'tags' };
    tags.push(tag);
  }
  if (tags.length > PLAYBOOK.maxTags) return { error: `Up to ${PLAYBOOK.maxTags} reasons.`, field: 'tags' };
  const note = String(p.note || '').replace(/\s+/g, ' ').trim();
  if (note.length < PLAYBOOK.minNote) return { error: 'Say why, in a sentence: it goes out with the setup.', field: 'note' };
  if (note.length > PLAYBOOK.maxNote) return { error: `Keep the why under ${PLAYBOOK.maxNote} characters.`, field: 'note' };
  const pending = p.kind !== 'market';
  const expiry = pending ? Number(p.expiry ?? 24) : null;
  if (pending && !(Number.isInteger(expiry) && expiry >= 1 && expiry <= 168)) return { error: 'Pick how long the order waits for its price.', field: 'expiry' };
  const plan = { symbol: market.symbol, side: p.side, kind: p.kind, entry, sl, tp, tags, note, expiry };
  if (!quote || !(quote.price > 0)) return { plan };

  const live = quote.price;
  const f = (v) => fmtNum(v, market.digits);
  if (p.kind === 'market') {
    if (quote.open === false) return { error: `${market.name} is closed: use a limit or stop order, or wait for the open.`, field: 'kind' };
    const tolerance = Math.max((quote.atr || 0) * 0.1, live * 0.0005);
    if (Math.abs(entry - live) > tolerance) {
      return { error: `The live price is ${f(live)}. A market order is logged at the price now; for another price, use a limit or stop order.`, field: 'entry' };
    }
    const pastStop = buy ? live <= sl : live >= sl;
    const pastTarget = buy ? live >= tp : live <= tp;
    if (pastStop || pastTarget) return { error: `The live price (${f(live)}) is already past the ${pastStop ? 'stop' : 'target'}.`, field: pastStop ? 'sl' : 'tp' };
  } else {
    // A buy limit or a sell stop waits below the price; a sell limit or a buy stop above it.
    const want = (p.kind === 'limit') === buy ? 'below' : 'above';
    if (entry === live || (want === 'below') !== entry < live) {
      return { error: `A ${p.side} ${p.kind} goes ${want} the live price (${f(live)}).`, field: 'entry' };
    }
  }
  return { plan };
}

// With no edge, the chance the target comes before the stop.
export function noEdgeOdds(s) {
  const risk = Math.abs(s.entry - s.sl);
  return risk / (risk + Math.abs(s.tp - s.entry));
}

// ------------------------------------------------------------------ the setup
// A setup from a checked plan, logged at `at`. A market order is filled at once, at its
// entry. The minute it was logged in isn't scanned: its prices may come from before it.
export function openSetup(plan, at) {
  const market = plan.kind === 'market';
  return {
    symbol: plan.symbol, side: plan.side, kind: plan.kind, entry: plan.entry, sl: plan.sl, tp: plan.tp,
    tags: plan.tags, note: plan.note, stop: plan.sl, created: at,
    expires: market ? null : at + plan.expiry * 3600,
    status: market ? 'open' : 'pending',
    filled: market ? at : null, fill: market ? plan.entry : null,
    closed: null, exit: null, r: null, reason: null,
    checked: Math.ceil(at / 60) * 60,
  };
}

export const isActive = (s) => s.status === 'pending' || s.status === 'open';

// A result in R: from the fill to the exit, over the planned risk.
export function planR(s, exit) {
  const move = s.side === 'buy' ? exit - s.fill : s.fill - exit;
  return pbRound(move / Math.abs(s.entry - s.sl), 2);
}

function settleSetup(s, at, exit, reason) {
  s.closed = at;
  s.exit = exit;
  s.r = planR(s, exit);
  s.reason = reason;
  s.status = s.r > PLAYBOOK.scratch ? 'won' : s.r < -PLAYBOOK.scratch ? 'lost' : 'scratch';
  return { type: reason, at, price: exit, r: s.r };
}

// Which stop was hit: the planned one, one moved to the fill (breakeven), or one trailed elsewhere.
const stopReason = (s) => (s.stop === s.sl ? 'sl' : s.stop === s.fill ? 'be' : 'trail');

// The price a pending order fills at on bar `b`, or null.
function fillOf(s, b) {
  const buy = s.side === 'buy';
  if (s.kind === 'limit') return (buy ? b.l <= s.entry : b.h >= s.entry) ? s.entry : null;
  if (buy) return b.h >= s.entry ? Math.max(s.entry, b.o) : null;
  return b.l <= s.entry ? Math.min(s.entry, b.o) : null;
}

function expireSetup(s) {
  s.status = 'expired';
  s.closed = s.expires;
  return { type: 'expired', at: s.expires };
}

// Walks a pending or open setup through `bars` of `step` seconds, from where it was last
// checked up to the last bar that has finished by `now`. A coarser bar that started before
// the last check still counts: nothing in its earlier part had touched anything, or the
// setup would have closed then. Returns the setup as it now stands and what happened.
export function advanceSetup(setup, bars, now, step = 60) {
  const s = { ...setup };
  const events = [];
  const buy = s.side === 'buy';
  for (const b of bars) {
    if (!isActive(s)) break;
    if (b.t + step <= s.checked) continue;
    if (b.t + step > now) break;
    if (s.status === 'pending') {
      if (s.expires != null && b.t >= s.expires) {
        events.push(expireSetup(s));
        break;
      }
      const fill = fillOf(s, b);
      if (fill != null) {
        s.status = 'open';
        s.filled = b.t;
        s.fill = fill;
        events.push({ type: 'filled', at: b.t, price: fill });
        if (buy ? b.l <= s.stop : b.h >= s.stop) events.push(settleSetup(s, b.t, s.stop, stopReason(s)));
      }
    } else if (buy ? b.l <= s.stop : b.h >= s.stop) {
      const gapped = buy ? b.o < s.stop : b.o > s.stop;
      events.push(settleSetup(s, b.t, gapped ? b.o : s.stop, stopReason(s)));
    } else if (buy ? b.h >= s.tp : b.l <= s.tp) {
      events.push(settleSetup(s, b.t, s.tp, 'tp'));
    }
    s.checked = b.t + step;
  }
  return { setup: s, events };
}

// A pending order whose time is up while its market was shut, so it can't have filled.
export function expireIfDue(setup, now) {
  const s = { ...setup };
  if (s.status !== 'pending' || s.expires == null || s.expires > now) return { setup: s, events: [] };
  return { setup: s, events: [expireSetup(s)] };
}

// By hand: close an open setup at `price`, move its stop, or cancel an order that hasn't filled.
export function closeSetup(setup, at, price) {
  const s = { ...setup };
  return { setup: s, events: [settleSetup(s, at, price, 'manual')] };
}
export function moveSetupStop(setup, at, price) {
  return { setup: { ...setup, stop: price }, events: [{ type: 'stop', at, price }] };
}
export function cancelSetup(setup, at) {
  return { setup: { ...setup, status: 'cancelled', closed: at }, events: [{ type: 'cancelled', at }] };
}

// Where an open setup stands at `price`, in R.
export function setupLiveR(s, price) {
  if (s.status !== 'open' || !(price > 0)) return null;
  return (s.side === 'buy' ? price - s.fill : s.fill - price) / Math.abs(s.entry - s.sl);
}

// ----------------------------------------------------------------- the record
const DONE = ['won', 'lost', 'scratch'];
export const isResult = (s) => DONE.includes(s.status);

// A result after the assumed round-trip spread.
export const netR = (s) => s.r - (PLAYBOOK.spread[s.symbol] || 0) / Math.abs(s.entry - s.sl);

// The 97.5th percentile of Student's t with `df` degrees of freedom: a 95% two-sided band.
const T975 = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145, 2.131,
  2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042];
export function t975(df) {
  if (df <= T975.length) return T975[df - 1];
  const z = 1.959964; // beyond the table, the Cornish-Fisher expansion (exact to 3 decimals)
  return z + (z ** 3 + z) / (4 * df) + (5 * z ** 5 + 16 * z ** 3 + 3 * z) / (96 * df * df);
}

// The 95% band for a true average, from `n` results with this mean and sum of squared deviations.
function meanBand(n, mean, ss) {
  if (n < 3) return null;
  const half = t975(n - 1) * Math.sqrt(ss / (n - 1) / n);
  return [mean - half, mean + half];
}

// Wilson's 95% band for a proportion, k of n.
export function wilsonBand(k, n) {
  if (!n) return null;
  const z = 1.959964;
  const p = k / n;
  const z2 = z * z;
  const mid = (p + z2 / (2 * n)) / (1 + z2 / n);
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n);
  return [Math.max(0, mid - half), Math.min(1, mid + half)];
}

function groupResults(done, keysOf) {
  const groups = new Map();
  for (const s of done) {
    for (const label of keysOf(s)) {
      const key = String(label).toLowerCase();
      const g = groups.get(key) || { key: label, n: 0, sum: 0, won: 0, lost: 0 };
      g.n += 1;
      g.sum += netR(s);
      if (s.status === 'won') g.won += 1;
      if (s.status === 'lost') g.lost += 1;
      groups.set(key, g);
    }
  }
  return [...groups.values()]
    .map((g) => ({ key: g.key, n: g.n, avg: pbRound(g.sum / g.n, 3), won: g.won, lost: g.lost }))
    .sort((a, b) => b.n - a.n || String(a.key).localeCompare(String(b.key)));
}

// The record, from every setup: counts, the average after costs with its band, the
// verdict, the curve of how the average settled as results came in, target-before-stop
// against the no-edge odds, and averages by reason, market and session.
export function recordStats(setups) {
  const done = setups.filter(isResult).sort((a, b) => a.closed - b.closed || a.n - b.n);
  const curve = [];
  let n = 0;
  let mean = 0;
  let ss = 0;
  let total = 0;
  let peak = 0;
  let drawdown = 0;
  for (const s of done) {
    const x = netR(s);
    n += 1;
    const d = x - mean;
    mean += d / n;
    ss += d * (x - mean);
    total += x;
    peak = Math.max(peak, total);
    drawdown = Math.max(drawdown, peak - total);
    const band = meanBand(n, mean, ss);
    curve.push({ n: s.n, r: pbRound(x, 3), mean: pbRound(mean, 3), band: band && band.map((v) => pbRound(v, 3)), status: s.status });
  }
  const band = meanBand(n, mean, ss);
  const clean = done.filter((s) => s.reason === 'tp' || s.reason === 'sl');
  const hits = clean.filter((s) => s.reason === 'tp').length;
  const count = (status) => setups.filter((s) => s.status === status).length;
  return {
    setups: setups.length,
    open: count('open'),
    pending: count('pending'),
    results: n,
    won: count('won'),
    lost: count('lost'),
    scratch: count('scratch'),
    avg: n ? pbRound(mean, 3) : null,
    total: pbRound(total, 2),
    band: band && band.map((v) => pbRound(v, 3)),
    drawdown: pbRound(drawdown, 2),
    firstRead: PLAYBOOK.firstRead,
    verdict: n < PLAYBOOK.firstRead || !band ? 'collecting' : band[0] > 0 ? 'ahead' : band[1] < 0 ? 'behind' : 'unclear',
    targetFirst: {
      n: clean.length,
      hits,
      band: wilsonBand(hits, clean.length),
      noEdge: clean.length ? pbRound(clean.reduce((a, s) => a + noEdgeOdds(s), 0) / clean.length, 3) : null,
    },
    byTag: groupResults(done, (s) => s.tags || []),
    byMarket: groupResults(done, (s) => [s.symbol]),
    bySession: groupResults(done, (s) => (s.engine && s.engine.sessions) || []),
    curve,
  };
}

// One line for posts: where the record stands.
export function recordLine(st) {
  if (!st || !st.results) return 'The first result starts the record.';
  return `Record: ${st.results} result${st.results === 1 ? '' : 's'} · ${st.won} won · ${st.lost} lost` +
    `${st.scratch ? ` · ${st.scratch} scratch` : ''} · average ${fmtR(st.avg, 2)} after costs`;
}
