// TCP Quant Terminal: the market maths, shared by the Worker and the page.
// Pure functions, no dependencies. Times are Unix seconds (UTC); bars are
// { t, o, h, l, c } with t the bar's open time, oldest first.
//
// These are standard, public reference levels (previous day and week, opens,
// session ranges, round numbers). No strategy rules live here: the algo's own
// zones join the terminal only after they pass their forward test.

export const MARKETS = {
  XAUUSD: { symbol: 'XAUUSD', name: 'Gold', digits: 2, contract: 100, day: 'ny', round: 50 },
  BTCUSD: { symbol: 'BTCUSD', name: 'Bitcoin', digits: 2, contract: 1, day: 'utc', round: 1000 },
};

// Forex sessions in local time, Monday to Friday.
export const SESSIONS = [
  { id: 'sydney', name: 'Sydney', tz: 'Australia/Sydney', open: 7, close: 16 },
  { id: 'tokyo', name: 'Tokyo', range: 'Asia', tz: 'Asia/Tokyo', open: 9, close: 18 },
  { id: 'london', name: 'London', range: 'London', tz: 'Europe/London', open: 8, close: 17 },
  { id: 'newyork', name: 'New York', range: 'New York', tz: 'America/New_York', open: 8, close: 17 },
];

// ------------------------------------------------------------ time zones
const formatters = {};
export function zoned(ts, tz) {
  formatters[tz] ||= new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hourCycle: 'h23', weekday: 'short',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = {};
  for (const { type, value } of formatters[tz].formatToParts(new Date(ts * 1000))) p[type] = value;
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, min: +p.minute, s: +p.second, wd: p.weekday };
}

// The UTC time of a wall-clock time in a time zone (DST-aware).
export function wallToUtc(tz, y, m, d, h = 0, min = 0) {
  const wall = Date.UTC(y, m - 1, d, h, min) / 1000;
  let ts = wall;
  for (let i = 0; i < 3; i++) {
    const z = zoned(ts, tz);
    const offset = Date.UTC(z.y, z.m - 1, z.d, z.h, z.min, z.s) / 1000 - ts;
    const next = wall - offset;
    if (next === ts) break;
    ts = next;
  }
  return ts;
}

const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const addDays = (key, n) => new Date(Date.parse(key + 'T00:00:00Z') + n * 86400e3).toISOString().slice(0, 10);
const weekdayOf = (key) => new Date(key + 'T00:00:00Z').getUTCDay(); // 0 Sunday ... 6 Saturday
export const mondayOf = (key) => addDays(key, -((weekdayOf(key) + 6) % 7));

// The trading day a moment belongs to. Gold's day ends at 17:00 New York (as on
// broker charts), and a weekend belongs to the Monday after it; Bitcoin uses UTC days.
export function dayKey(ts, market) {
  if (market.day === 'utc') {
    const d = new Date(ts * 1000);
    return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  const z = zoned(ts + 7 * 3600, 'America/New_York');
  const key = iso(z.y, z.m, z.d);
  const wd = weekdayOf(key);
  return wd === 6 ? addDays(key, 2) : wd === 0 ? addDays(key, 1) : key;
}

// ------------------------------------------------------------------- bars
// Merge bars (or days) that share a key into one bar per key.
export function groupBars(bars, keyOf) {
  const out = [];
  for (const b of bars) {
    const key = keyOf(b);
    const last = out[out.length - 1];
    if (last && last.key === key) {
      last.h = Math.max(last.h, b.h);
      last.l = Math.min(last.l, b.l);
      last.c = b.c;
    } else {
      out.push({ key, t: b.t, o: b.o, h: b.h, l: b.l, c: b.c });
    }
  }
  return out;
}

export const toDays = (bars, market) => groupBars(bars, (b) => dayKey(b.t, market));

// Wilder's average true range over completed days.
export function atr(days, period = 14) {
  if (days.length < period + 1) return null;
  const tr = days.slice(1).map((d, i) => Math.max(d.h - d.l, Math.abs(d.h - days[i].c), Math.abs(d.l - days[i].c)));
  let value = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (const x of tr.slice(period)) value = (value * (period - 1) + x) / period;
  return value;
}

function rangeOf(bars, from, to) {
  const inside = bars.filter((b) => b.t >= from && b.t < to);
  if (!inside.length) return null;
  return { high: Math.max(...inside.map((b) => b.h)), low: Math.min(...inside.map((b) => b.l)) };
}

// Session windows on a trading day's date, in UTC.
export function sessionWindow(session, key) {
  const [y, m, d] = key.split('-').map(Number);
  return { from: wallToUtc(session.tz, y, m, d, session.open), to: wallToUtc(session.tz, y, m, d, session.close) };
}

// ---------------------------------------------------------------- snapshot
// days: daily bars (the last may be today's, still forming); intraday: 15-minute bars.
export function snapshot(market, days, intraday, now) {
  const today = dayKey(now, market);
  const done = days.filter((d) => d.key < today);
  const current = days.find((d) => d.key === today) || null;
  const prev = done[done.length - 1] || null;
  const price = intraday.length ? intraday[intraday.length - 1].c : current ? current.c : prev ? prev.c : null;

  const thisWeek = mondayOf(today);
  const weeks = groupBars(done, (d) => mondayOf(d.key));
  const prevWeek = [...weeks].reverse().find((w) => w.key < thisWeek) || null;
  const weekOpenDay = days.find((d) => mondayOf(d.key) === thisWeek) || null;

  const averageRange = atr(done);
  const todayRange = current ? current.h - current.l : 0;

  const levels = [];
  const add = (id, name, value) => { if (Number.isFinite(value)) levels.push({ id, name, price: value }); };
  if (prev) { add('pdh', 'Previous day high', prev.h); add('pdl', 'Previous day low', prev.l); }
  if (prevWeek) { add('pwh', 'Previous week high', prevWeek.h); add('pwl', 'Previous week low', prevWeek.l); }
  if (current) add('do', 'Day open', current.o);
  if (weekOpenDay) add('wo', 'Week open', weekOpenDay.o);

  const sessions = {};
  for (const s of SESSIONS.filter((x) => x.range)) {
    const { from, to } = sessionWindow(s, today);
    const r = from <= now ? rangeOf(intraday, from, Math.min(to, now + 1)) : null;
    sessions[s.id] = r && { ...r, from, to, done: now >= to };
    if (r) { add(`${s.id}_h`, `${s.range} high`, r.high); add(`${s.id}_l`, `${s.range} low`, r.low); }
  }
  if (Number.isFinite(price)) {
    const below = Math.floor(price / market.round) * market.round;
    add('round_up', 'Round number', below + market.round);
    add('round_down', 'Round number', below === price ? below - market.round : below);
  }
  levels.sort((a, b) => b.price - a.price);

  return {
    symbol: market.symbol, name: market.name, digits: market.digits, day: today,
    price,
    dayOpen: current ? current.o : null,
    change: current && Number.isFinite(price) ? price - current.o : null,
    changePct: current && Number.isFinite(price) ? ((price - current.o) / current.o) * 100 : null,
    atr: averageRange,
    todayRange,
    rangePct: averageRange ? (todayRange / averageRange) * 100 : null,
    levels,
    sessions,
  };
}

// ------------------------------------------------------------ session clock
// Which sessions are open at `now`, and when each next opens or closes.
export function sessionClock(now) {
  return SESSIONS.map((s) => {
    const z = zoned(now, s.tz);
    const base = iso(z.y, z.m, z.d);
    let open = null;
    let next = null;
    for (let i = -1; i <= 7 && !next; i++) {
      const key = addDays(base, i);
      const wd = weekdayOf(key);
      if (wd === 0 || wd === 6) continue;
      const w = sessionWindow(s, key);
      if (w.from <= now && now < w.to) open = w;
      else if (w.from > now && !next) next = w;
    }
    return open
      ? { id: s.id, name: s.name, open: true, closesIn: open.to - now, until: open.to }
      : { id: s.id, name: s.name, open: false, opensIn: next ? next.from - now : null, at: next && next.from };
  });
}

// Gold closes from Friday 17:00 to Sunday 18:00 New York, with a daily break
// from 17:00 to 18:00; Bitcoin never closes.
export function marketStatus(market, now) {
  if (market.day === 'utc') return { open: true };
  const z = zoned(now, 'America/New_York');
  const key = iso(z.y, z.m, z.d);
  const wd = weekdayOf(key);
  const hour = z.h + z.min / 60;
  const at = (dayOffset, h) => {
    const [y, m, d] = addDays(key, dayOffset).split('-').map(Number);
    return wallToUtc('America/New_York', y, m, d, h);
  };
  if (wd === 6) return { open: false, reason: 'weekend', opensAt: at(1, 18) };
  if (wd === 0 && hour < 18) return { open: false, reason: 'weekend', opensAt: at(0, 18) };
  if (wd === 5 && hour >= 17) return { open: false, reason: 'weekend', opensAt: at(2, 18) };
  if (hour >= 17 && hour < 18) return { open: false, reason: 'daily break', opensAt: at(0, 18) };
  const closeDay = hour >= 18 ? 1 : 0;
  return { open: true, closesAt: at(closeDay, 17), weekendClose: weekdayOf(addDays(key, closeDay)) === 5 };
}

// ------------------------------------------------------------------- risk
// usdPerUnit: the US-dollar value of one unit of the account currency
// (1 for USD accounts; about 1.3 for GBP). Lots round down to the broker's step.
export function lotSize({ balance, riskPct, entry, stop, contract, usdPerUnit = 1, step = 0.01, min = 0.01 }) {
  const riskMoney = (balance * riskPct) / 100;
  const distance = Math.abs(entry - stop);
  const riskPerLot = (distance * contract) / usdPerUnit; // account currency lost at the stop, per 1.00 lot
  if (!(riskMoney > 0) || !(riskPerLot > 0)) return null;
  const lots = Math.floor(riskMoney / riskPerLot / step + 1e-9) * step;
  const rounded = Math.round(lots * 100) / 100;
  const side = entry > stop ? 'long' : 'short';
  const r = (k) => (side === 'long' ? entry + k * distance : entry - k * distance);
  return {
    side, riskMoney, distance, riskPerLot,
    lots: rounded,
    tooSmall: rounded < min,
    actualRisk: rounded * riskPerLot,
    perPoint: (rounded * contract) / usdPerUnit, // account currency per $1 move
    targets: [1, 2, 3].map((k) => ({ r: k, price: r(k), profit: k * rounded * riskPerLot })),
  };
}

// ------------------------------------------------------------- formatting
export const fmtNum = (v, digits = 2) =>
  Number.isFinite(v) ? v.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '—';

export function fmtDuration(seconds) {
  if (!Number.isFinite(seconds)) return '—';
  const m = Math.max(0, Math.round(seconds / 60));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  if (d) return `${d}d ${h}h`;
  return h ? `${h}h ${m % 60}m` : `${m % 60}m`;
}
