// TCP Quant Terminal: session briefs, the maths shared by the Worker and the page.
//
// Before each session opens, Lewis sends TCP AI his charts. It reads them and drafts the zones
// to watch and a plan; Lewis checks and edits the draft, and only then does it post. After the
// session, what price did at each zone is measured, and the record says which zones matter:
//   reach  how often price got to a zone, against the engine's odds of it getting there if it
//          moved at random (a zone that draws price in beats them);
//   turn   from the bar that reached a zone, how far price went back the way it came against
//          how far it went on through, in average daily ranges. Both are measured from that
//          bar's close over the same bars, so on a random walk they are equal on average: a zone
//          that holds price back shows a turn above zero.
// Zones are prices Lewis chooses; nothing here says how to find them.
import { MARKETS, SESSIONS, zoned, sessionWindow, touchProb } from './lib.js';
import { meanBand, wilsonBand } from './playbook-lib.js';

export const BRIEF = {
  sessions: [
    { id: 'asia', name: 'Asia', city: 'Tokyo', session: 'tokyo', icon: '🌏' },
    { id: 'london', name: 'London', city: 'London', session: 'london', icon: '🌍' },
    { id: 'newyork', name: 'New York', city: 'New York', session: 'newyork', icon: '🌎' },
  ],
  timeframes: ['5M', '15M', '30M', '1H', '4H'], // asked for before each session
  weekly: '1D', // and the daily chart before the week's first session
  kinds: { demand: 'Demand', supply: 'Supply', liquidity: 'Liquidity', level: 'Level' },
  maxCharts: 6,
  maxZones: 6,
  lead: 45, // minutes before the open that the reminder goes out
  leads: [30, 45, 60],
  late: 3600, // a new brief is for a session that opened this recently, or else the next
  firstRead: 20, // zones reached before the record gives a verdict
  text: { headline: 120, reason: 240, plan: 900, note: 600, label: 40, why: 200, lesson: 400, guide: 6000 },
};

const brRound = (v, d = 2) => (Number.isFinite(v) ? Math.round(v * 10 ** d) / 10 ** d : null);
export const briefClip = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const brKey = (z) => `${z.y}-${String(z.m).padStart(2, '0')}-${String(z.d).padStart(2, '0')}`;
const brShift = (key, n) => new Date(Date.parse(key + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const brWeekday = (key) => new Date(key + 'T00:00:00Z').getUTCDay(); // 0 Sunday ... 6 Saturday
export const briefSession = (id) => BRIEF.sessions.find((s) => s.id === id) || null;

// ------------------------------------------------------------------ schedule
// A session's window on a date never changes, so each is worked out once (the time-zone
// arithmetic is the slow part, and the Worker has 10 ms of CPU a request).
const brKnown = new Map();
function brSessionWindow(s, key) {
  const id = `${s.id}|${key}`;
  let w = brKnown.get(id);
  if (!w) {
    if (brKnown.size > 400) brKnown.clear();
    brKnown.set(id, (w = sessionWindow(s, key)));
  }
  return w;
}

// Each session's windows from yesterday to `days` ahead, Monday to Friday in its own city
// (the terminal's session clock). The week's first is Asia on Monday: its brief also asks
// for the daily chart.
export function briefWindows(now, days = 8) {
  const out = [];
  for (const b of BRIEF.sessions) {
    const s = SESSIONS.find((x) => x.id === b.session);
    const today = brKey(zoned(now, s.tz));
    for (let i = -1; i <= days; i++) {
      const key = brShift(today, i);
      const wd = brWeekday(key);
      if (wd === 0 || wd === 6) continue;
      const { from, to } = brSessionWindow(s, key);
      out.push({ id: b.id, name: b.name, key, open: from, close: to, weekly: b.id === 'asia' && wd === 1 });
    }
  }
  return out.sort((a, b) => a.open - b.open);
}

// The session a new brief is for: one that opened in the last hour, or else the next to open.
export const briefDefault = (now) => briefWindows(now).find((w) => w.open > now - BRIEF.late) || null;

// A named session's window for a brief made now: the one running, or else the next.
export const briefWindow = (id, now) => briefWindows(now).find((w) => w.id === id && w.close > now) || null;

// Sessions whose reminder (`lead` minutes before the open) fell due in the last `span` seconds.
// The check runs every 5 minutes; the Worker keeps each reminder to one send.
export function briefReminders(now, lead = BRIEF.lead, span = 900) {
  return briefWindows(now, 2).filter((w) => w.open - lead * 60 <= now && w.open - lead * 60 > now - span);
}

// The charts to ask for before a session.
export const briefAsk = (w) => (w && w.weekly ? [...BRIEF.timeframes, BRIEF.weekly] : [...BRIEF.timeframes]);

// --------------------------------------------------------------------- zones
// Checks zones from TCP AI or the poster before they're kept: a known kind, real prices within
// eight average days of the market, low below high (a single price is a level), rounded to the
// market's decimals, no wider than three average days, no repeats, and at most maxZones, the
// nearest to the price. Returns them highest first, with what was dropped and why.
export function cleanZones(list, { symbol, price, atr }) {
  const m = MARKETS[symbol];
  const day = Number.isFinite(atr) && atr > 0 ? atr : Number.isFinite(price) ? price * 0.01 : null;
  const zones = [];
  const dropped = [];
  for (const z of Array.isArray(list) ? list : []) {
    if (!z || typeof z !== 'object') continue;
    const num = (v) => (v === null || v === '' || v === undefined ? NaN : Number(String(v).replace(/,/g, '')));
    let low = num(z.low);
    let high = num(z.high);
    if (!Number.isFinite(high)) high = low;
    if (!Number.isFinite(low)) low = high;
    const label = briefClip(z.label, BRIEF.text.label);
    const name = label || `${z.low ?? ''}`;
    if (!Object.hasOwn(BRIEF.kinds, z.kind)) { dropped.push({ zone: name, why: 'unknown kind' }); continue; }
    if (!(low > 0) || !(high > 0)) { dropped.push({ zone: name, why: 'no price' }); continue; }
    if (low > high) [low, high] = [high, low];
    low = brRound(low, m.digits);
    high = brRound(high, m.digits);
    if (day && Number.isFinite(price) && (high < price - 8 * day || low > price + 8 * day)) { dropped.push({ zone: name, why: 'too far from the price' }); continue; }
    if (day && high - low > 3 * day) { dropped.push({ zone: name, why: 'too wide' }); continue; }
    if (zones.some((y) => y.low === low && y.high === high && y.kind === z.kind)) continue;
    zones.push({ kind: z.kind, low, high, tf: briefClip(z.tf ?? z.timeframe, 12), label, why: briefClip(z.why, BRIEF.text.why) });
  }
  if (zones.length > BRIEF.maxZones && Number.isFinite(price)) {
    zones.sort((a, b) => Math.abs(zoneEdge(a, price) - price) - Math.abs(zoneEdge(b, price) - price));
    for (const z of zones.splice(BRIEF.maxZones)) dropped.push({ zone: z.label || String(z.low), why: `more than ${BRIEF.maxZones} zones` });
  }
  zones.splice(BRIEF.maxZones);
  zones.sort((a, b) => b.high - a.high || b.low - a.low);
  return { zones, dropped };
}

// Where a zone sits from `price`: below it, above it, or around it.
export const zoneSide = (z, price) => (price > z.high ? 'below' : price < z.low ? 'above' : 'inside');
// The part of a zone price reaches first: its top from above, its bottom from below.
export const zoneEdge = (z, price) => (price > z.high ? z.high : price < z.low ? z.low : price);
// The engine's odds of price reaching a zone with `variance` of log price to go, moving at random.
export const zoneOdds = (z, price, variance) => (zoneSide(z, price) === 'inside' ? 1 : touchProb(price, zoneEdge(z, price), variance));

// ------------------------------------------------------------------- review
// What price did at a zone after the brief went out. `from` is when it was posted (the bar
// that was forming then is left out: part of it came before), `to` is when the session closed
// (only bars finished by then count). The first bar to reach the zone marks it reached; from
// that bar's close, `away` is the furthest price then went back the way it came and `through`
// the furthest it went on, over the same later bars. `turn` is away less through, in average
// daily ranges. A zone price was already inside when the brief went out is left out.
export function reviewZone(z, bars, { from, to, price, atr, step = 60 }) {
  const side = zoneSide(z, price);
  if (side === 'inside') return { side, reached: null };
  let touch = null;
  let away = 0;
  let through = 0;
  for (const b of bars) {
    if (b.t < from) continue;
    if (b.t + step > to) break;
    if (!touch) {
      if (side === 'below' ? b.l <= z.high : b.h >= z.low) touch = { at: b.t, close: b.c };
      continue;
    }
    const c = touch.close;
    if (side === 'below') {
      away = Math.max(away, b.h - c);
      through = Math.max(through, c - b.l);
    } else {
      away = Math.max(away, c - b.l);
      through = Math.max(through, b.h - c);
    }
  }
  if (!touch) return { side, reached: false };
  const digits = 5;
  return {
    side, reached: true, at: touch.at, close: touch.close, away: brRound(away, digits), through: brRound(through, digits),
    turn: atr > 0 ? brRound((away - through) / atr, 3) : null,
  };
}

// Every zone of a brief, reviewed; and the count for the wrap.
export function reviewBrief(zones, bars, window) {
  const out = zones.map((z) => ({ ...z, review: reviewZone(z, bars, window) }));
  const counted = out.filter((z) => z.review.reached !== null);
  return {
    zones: out,
    counted: counted.length,
    reached: counted.filter((z) => z.review.reached).length,
    expected: brRound(counted.reduce((a, z) => a + (Number.isFinite(z.odds) ? z.odds : 0), 0), 2),
  };
}

// -------------------------------------------------------------------- record
function brGroup(rows, keyOf) {
  const groups = new Map();
  for (const r of rows) {
    const key = keyOf(r);
    const g = groups.get(key) || { key, zones: 0, reached: 0, expected: 0, turns: [] };
    g.zones += 1;
    g.expected += r.odds;
    if (r.review.reached) {
      g.reached += 1;
      if (r.review.turn != null) g.turns.push(r.review.turn);
    }
    groups.set(key, g);
  }
  return [...groups.values()]
    .map((g) => ({ key: g.key, zones: g.zones, reached: g.reached, expected: brRound(g.expected, 1),
      turn: g.turns.length ? brRound(g.turns.reduce((a, b) => a + b, 0) / g.turns.length, 3) : null, turns: g.turns.length }))
    .sort((a, b) => b.zones - a.zones || String(a.key).localeCompare(String(b.key)));
}

// The record from every reviewed brief that counts (test briefs don't): zones, how many were
// reached against the random walk's expectation, and the average turn with its 95% band. The
// verdict waits for firstRead reached zones: the whole band above zero means zones turned price
// more than chance would, below zero that price went through them more.
export function briefStats(briefs) {
  const rows = [];
  let reviewed = 0;
  for (const b of [...briefs].sort((x, y) => (x.posted || 0) - (y.posted || 0))) {
    if (b.test || !b.review) continue;
    reviewed += 1;
    for (const z of b.review.zones || []) {
      if (!z.review || z.review.reached === null || z.review.reached === undefined) continue;
      rows.push({ ...z, odds: Number.isFinite(z.odds) ? z.odds : 0, session: b.session, symbol: b.symbol });
    }
  }
  const reached = rows.filter((r) => r.review.reached);
  const expected = rows.reduce((a, r) => a + r.odds, 0);
  let n = 0;
  let mean = 0;
  let ss = 0;
  const curve = [];
  for (const r of reached) {
    if (r.review.turn == null) continue;
    const x = r.review.turn;
    n += 1;
    const d = x - mean;
    mean += d / n;
    ss += d * (x - mean);
    const band = meanBand(n, mean, ss);
    curve.push({ turn: x, mean: brRound(mean, 3), band: band && band.map((v) => brRound(v, 3)) });
  }
  const band = meanBand(n, mean, ss);
  return {
    briefs: reviewed,
    zones: rows.length,
    reached: reached.length,
    expected: brRound(expected, 1),
    reach: { rate: rows.length ? brRound(reached.length / rows.length, 3) : null, band: wilsonBand(reached.length, rows.length),
      noEdge: rows.length ? brRound(expected / rows.length, 3) : null },
    turn: { n, avg: n ? brRound(mean, 3) : null, band: band && band.map((v) => brRound(v, 3)) },
    firstRead: BRIEF.firstRead,
    verdict: n < BRIEF.firstRead || !band ? 'collecting' : band[0] > 0 ? 'turning' : band[1] < 0 ? 'breaking' : 'unclear',
    byKind: brGroup(rows, (r) => r.kind),
    bySession: brGroup(rows, (r) => r.session),
    curve,
  };
}
