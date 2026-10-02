// TCP Quant Terminal: the market maths, shared by the Worker and the page.
// Pure functions, no dependencies. Times are Unix seconds (UTC); bars are
// { t, o, h, l, c } with t the bar's open time, oldest first.
//
// These are standard, public reference levels (previous day and week, opens,
// session ranges, round numbers) and a probability engine built on a plain,
// stated model: price as a trendless random walk with each market's own
// hour-by-hour volatility. It forecasts reach, not direction, and it checks
// itself against history (calibrate). No strategy rules live here: the algo's
// own zones join the terminal only after they pass their forward test.

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

// New York time without Intl, for loops over thousands of bars (a Worker on the free
// plan gets 10 ms of CPU per request). US daylight saving runs from the second Sunday
// in March, 02:00 local (07:00 UTC), to the first Sunday in November, 02:00 local (06:00 UTC).
function nthSunday(y, month, n, hourUtc) {
  const first = new Date(Date.UTC(y, month - 1, 1)).getUTCDay();
  return Date.UTC(y, month - 1, 1 + ((7 - first) % 7) + 7 * (n - 1), hourUtc) / 1000;
}
const usDst = {};
export function nyOffset(ts) {
  // The year only picks the daylight-saving window, and both windows sit far from New
  // Year, so the average Gregorian year (365.2425 days) is exact enough and needs no Date.
  const y = 1970 + Math.floor(ts / 31556952);
  const [from, to] = (usDst[y] ||= [nthSunday(y, 3, 2, 7), nthSunday(y, 11, 1, 6)]);
  return ts >= from && ts < to ? -4 * 3600 : -5 * 3600;
}
const DAY = 86400;
export const nyHour = (ts) => Math.floor(((((ts + nyOffset(ts)) % DAY) + DAY) % DAY) / 3600);

// The same yes/no as marketStatus(market, ts).open, fast enough for thousands of bars:
// gold shuts from Friday 17:00 to Sunday 18:00 New York, and from 17:00 to 18:00 each day.
export function marketOpen(ts, market) {
  if (market.day === 'utc') return true;
  const local = ts + nyOffset(ts);
  const days = Math.floor(local / DAY);
  const hour = (local - days * DAY) / 3600;
  const weekday = (((days + 4) % 7) + 7) % 7; // 0 is Sunday: 1 January 1970 was a Thursday
  if (hour >= 17 && hour < 18) return false;
  return !(weekday === 6 || (weekday === 0 && hour < 18) || (weekday === 5 && hour >= 17));
}

// A trading day as a whole number of days since 1970 (fast; dayKey gives the same day as text).
function dayIndex(ts, market) {
  if (market.day === 'utc') return Math.floor(ts / DAY);
  const i = Math.floor((ts + nyOffset(ts) + 7 * 3600) / DAY);
  const wd = (i + 4) % 7; // 1 January 1970 was a Thursday; 0 is Sunday
  return wd === 6 ? i + 2 : wd === 0 ? i + 1 : i;
}

const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const addDays = (key, n) => new Date(Date.parse(key + 'T00:00:00Z') + n * 86400e3).toISOString().slice(0, 10);
const weekdayOf = (key) => new Date(key + 'T00:00:00Z').getUTCDay(); // 0 Sunday ... 6 Saturday
export const mondayOf = (key) => addDays(key, -((weekdayOf(key) + 6) % 7));

// The trading day a moment belongs to. Gold's day ends at 17:00 New York (as on
// broker charts), and a weekend belongs to the Monday after it; Bitcoin uses UTC days.
const keyOf = (index) => new Date(index * DAY * 1000).toISOString().slice(0, 10);
export const dayKey = (ts, market) => keyOf(dayIndex(ts, market));

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

export function toDays(bars, market) {
  const days = [];
  let index = null;
  for (const b of bars) {
    const i = dayIndex(b.t, market);
    const last = days[days.length - 1];
    if (last && i === index) {
      last.h = Math.max(last.h, b.h);
      last.l = Math.min(last.l, b.l);
      last.c = b.c;
    } else {
      index = i;
      days.push({ key: keyOf(i), t: b.t, o: b.o, h: b.h, l: b.l, c: b.c });
    }
  }
  return days;
}

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
  let current = days.find((d) => d.key === today) || null;
  const fresh = intraday.filter((b) => dayKey(b.t, market) === today);
  if (fresh.length) {
    current = {
      key: today, t: current ? current.t : fresh[0].t, o: current ? current.o : fresh[0].o,
      h: Math.max(current ? current.h : -Infinity, ...fresh.map((b) => b.h)),
      l: Math.min(current ? current.l : Infinity, ...fresh.map((b) => b.l)),
      c: fresh[fresh.length - 1].c,
    };
  }
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
    dayHigh: current ? current.h : null,
    dayLow: current ? current.l : null,
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

// ------------------------------------------------------- probability engine
// The model: over the rest of the trading day, log price moves like a trendless
// random walk whose variance follows the market's own hour-of-day pattern (gold is
// quiet in Asia and busy at the London and New York opens). Under that model the
// reflection principle gives the chance of touching a level before the close.
// calibrate() replays history out of sample to show how honest the numbers are.

// Standard normal CDF (Abramowitz and Stegun 7.1.26, error below 1.5e-7).
export function normCdf(x) {
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * z);
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z);
  return x >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

// Variance of hourly log returns for each hour of the day (New York time), from
// hourly bars. Thin hours are pulled towards the all-hours average.
export function volProfile(hourly, shrink = 5) {
  const sums = new Array(24).fill(0);
  const counts = new Array(24).fill(0);
  for (let i = 1; i < hourly.length; i++) {
    const a = hourly[i - 1];
    const b = hourly[i];
    if (b.t - a.t !== 3600 || !(a.c > 0) || !(b.c > 0)) continue; // skip breaks and weekends
    const r = Math.log(b.c / a.c);
    const h = nyHour(b.t);
    sums[h] += r * r;
    counts[h] += 1;
  }
  const n = counts.reduce((a, b) => a + b, 0);
  const overall = n ? sums.reduce((a, b) => a + b, 0) / n : 0;
  return sums.map((s, h) => (s + shrink * overall) / (counts[h] + shrink));
}

// Expected variance of log price between two moments, hour by hour.
export function varianceBetween(profile, from, to) {
  let v = 0;
  for (let t = from; t < to;) {
    const next = Math.min(to, (Math.floor(t / 3600) + 1) * 3600);
    v += (profile[nyHour(t)] * (next - t)) / 3600;
    t = next;
  }
  return v;
}

// When the current trading day ends: 17:00 New York for gold, midnight UTC for Bitcoin.
export function dayEnd(key, market) {
  const [y, m, d] = key.split('-').map(Number);
  if (market.day === 'utc') return Date.UTC(y, m - 1, d + 1) / 1000;
  const naive = Date.UTC(y, m - 1, d, 17) / 1000;
  return naive - nyOffset(naive);
}

// Chance of touching `level` before the close, with `variance` of log price left.
export function touchProb(price, level, variance) {
  if (!(price > 0) || !(level > 0)) return null;
  if (!(variance > 0)) return price === level ? 1 : 0;
  const z = Math.abs(Math.log(level / price)) / Math.sqrt(variance);
  return Math.min(1, 2 * (1 - normCdf(z)));
}

// Chance of closing beyond `level`, on its side of the price.
export function beyondProb(price, level, variance) {
  if (!(variance > 0)) return 0;
  return 1 - normCdf(Math.abs(Math.log(level / price)) / Math.sqrt(variance));
}

// The band that holds the close with a given probability (k = 1: 68%, k = 2: 95%).
export const band = (price, variance, k) => [price * Math.exp(-k * Math.sqrt(variance)), price * Math.exp(k * Math.sqrt(variance))];

// The widening cone from now to the close, every `step` seconds.
export function cone(price, profile, from, to, step = 900) {
  const points = [];
  let v = 0;
  for (let t = from; t < to;) {
    const next = Math.min(to, (Math.floor(t / step) + 1) * step);
    v += varianceBetween(profile, t, next);
    t = next;
    const [l1, u1] = band(price, v, 1);
    const [l2, u2] = band(price, v, 2);
    points.push({ t, l1, u1, l2, u2 });
  }
  return points;
}

// Probabilities for each level that can still be reached today. Levels inside
// today's range have already been touched.
export function levelOdds(levels, price, high, low, variance) {
  return levels.map((l) => {
    const touched = Number.isFinite(high) && Number.isFinite(low) && l.price <= high && l.price >= low;
    return { ...l, side: l.price >= price ? 'above' : 'below', touched,
      touch: touched ? 1 : touchProb(price, l.price, variance),
      close: beyondProb(price, l.price, variance) };
  });
}

// Descriptive state of the market from hourly bars: trend efficiency over the last
// 24 hours (0 = choppy, 1 = one-way), momentum in standard deviations over 1, 4 and
// 24 hours, and where the last 24 hours' volatility ranks against the history.
export function marketState(hourly, profile) {
  const n = hourly.length;
  if (n < 50) return null;
  const closes = hourly.map((b) => b.c);
  const last = closes[n - 1];
  const window = closes.slice(-25);
  let path = 0;
  for (let i = 1; i < window.length; i++) path += Math.abs(window[i] - window[i - 1]);
  const efficiency = path ? Math.abs(window[window.length - 1] - window[0]) / path : 0;
  const hourVar = profile.reduce((a, b) => a + b, 0) / 24;
  const momentum = (h) => Math.log(last / closes[n - 1 - h]) / Math.sqrt(hourVar * h);
  const sq = [0];
  for (let i = 1; i < n; i++) sq.push(sq[i - 1] + Math.log(closes[i] / closes[i - 1]) ** 2);
  const rv = (i) => sq[i] - sq[i - 24];
  const now = rv(n - 1);
  const past = [];
  for (let i = 24; i < n - 24; i += 6) past.push(rv(i));
  const rank = past.filter((x) => x < now).length / past.length;
  return { efficiency, momentum: { h1: momentum(1), h4: momentum(4), h24: momentum(24) }, volRank: rank, vol24: Math.sqrt(now) };
}

// Out-of-sample check of the touch probabilities on the previous day's high and low.
// For each past day: a volatility profile from the `lookback` days before it only,
// then at every hourly bar a forecast for each level not yet touched, scored against
// what happened by the close.
// One pass over the bars (it runs inside the Worker's CPU budget): the profile rolls
// forward a day at a time, and the variance left to the close is a suffix sum.
export function calibrate(hourly, market, lookback = 20) {
  const days = [];
  for (let i = 0; i < hourly.length; i++) {
    const b = hourly[i];
    const a = hourly[i - 1];
    const day = dayIndex(b.t, market);
    const r2 = a && b.t - a.t === 3600 && a.c > 0 && b.c > 0 ? Math.log(b.c / a.c) ** 2 : null;
    const bar = { ...b, hour: nyHour(b.t), r2 };
    const last = days[days.length - 1];
    if (last && last.day === day) last.bars.push(bar);
    else days.push({ day, bars: [bar] });
  }
  const sums = new Array(24).fill(0);
  const counts = new Array(24).fill(0);
  const tally = (bars, sign) => {
    for (const b of bars) if (b.r2 !== null) { sums[b.hour] += sign * b.r2; counts[b.hour] += sign; }
  };
  const pairs = [];
  for (let d = 0; d < days.length - 1; d++) {
    if (d > lookback) {
      const n = counts.reduce((a, b) => a + b, 0);
      const overall = n ? sums.reduce((a, b) => a + b, 0) / n : 0;
      const profile = sums.map((s, h) => (s + 5 * overall) / (counts[h] + 5));
      const prev = days[d - 1].bars;
      let pdh = -Infinity;
      let pdl = Infinity;
      for (const b of prev) { pdh = Math.max(pdh, b.h); pdl = Math.min(pdl, b.l); }
      const bars = days[d].bars;
      const k = bars.length;
      const highAfter = new Array(k);
      const lowAfter = new Array(k);
      const varAfter = new Array(k);
      for (let i = k - 1; i >= 0; i--) {
        highAfter[i] = Math.max(bars[i].h, i + 1 < k ? highAfter[i + 1] : -Infinity);
        lowAfter[i] = Math.min(bars[i].l, i + 1 < k ? lowAfter[i + 1] : Infinity);
        varAfter[i] = profile[bars[i].hour] + (i + 1 < k ? varAfter[i + 1] : 0);
      }
      let high = -Infinity;
      let low = Infinity;
      for (let i = 0; i < k; i++) {
        const price = bars[i].o;
        if (high < pdh && price < pdh) pairs.push([touchProb(price, pdh, varAfter[i]), highAfter[i] >= pdh ? 1 : 0]);
        if (low > pdl && price > pdl) pairs.push([touchProb(price, pdl, varAfter[i]), lowAfter[i] <= pdl ? 1 : 0]);
        high = Math.max(high, bars[i].h);
        low = Math.min(low, bars[i].l);
      }
    }
    // Roll the profile's window forward: this day in, the day `lookback` back out.
    tally(days[d].bars, 1);
    if (d - lookback >= 0) tally(days[d - lookback].bars, -1);
  }
  if (pairs.length < 50) return null;
  const rate = pairs.reduce((a, [, o]) => a + o, 0) / pairs.length;
  const brier = pairs.reduce((a, [p, o]) => a + (p - o) ** 2, 0) / pairs.length;
  const reference = rate * (1 - rate); // always forecasting the average rate
  const bins = [];
  for (let k = 0; k < 5; k++) {
    const lo = k / 5;
    const hi = (k + 1) / 5;
    const inside = pairs.filter(([p]) => p >= lo && (k === 4 ? p <= hi : p < hi));
    if (!inside.length) continue;
    bins.push({ lo, hi, n: inside.length,
      predicted: inside.reduce((a, [p]) => a + p, 0) / inside.length,
      observed: inside.reduce((a, [, o]) => a + o, 0) / inside.length });
  }
  return { days: days.length - 2 - lookback, n: pairs.length, brier, skill: reference ? 1 - brier / reference : 0, bins };
}

// Baseline odds for a trade on a trendless market: the chance the target comes
// before the stop, and the typical time until one of them is hit.
export function tradeOdds(entry, stop, target, hourVar) {
  const risk = Math.abs(entry - stop);
  const reward = Math.abs(target - entry);
  if (!(risk > 0) || !(reward > 0)) return null;
  const sigma2 = hourVar * entry * entry; // price variance per hour
  return { targetFirst: risk / (risk + reward), hours: sigma2 > 0 ? (risk * reward) / sigma2 : null };
}
