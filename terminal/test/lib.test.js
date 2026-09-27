// The terminal's market maths: trading days, levels, volatility, sessions and lot sizes.
// Run with: cd terminal && npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { MARKETS, dayKey, wallToUtc, toDays, atr, snapshot, sessionClock, marketStatus, lotSize, fmtDuration, fmtNum } from '../src/lib.js';

const GOLD = MARKETS.XAUUSD;
const BTC = MARKETS.BTCUSD;
const utc = (y, m, d, h = 0, min = 0) => Date.UTC(y, m - 1, d, h, min) / 1000;

// Synthetic gold: hourly bars on the broker schedule (Sunday 18:00 to Friday 17:00
// New York, with the 17:00-18:00 break). On trading day k every bar sits at
// 2000 + 10k, the 13:00 UTC bar reaches 8 above and the 03:00 UTC bar 6 below.
function goldBars(fromMonday, until) {
  const bars = [];
  let k = -1;
  let lastKey = null;
  for (let t = utc(...fromMonday) - 2 * 3600; t < until; t += 3600) {
    const key = dayKey(t, GOLD);
    const ny = new Date((t - 4 * 3600) * 1000); // September: New York is UTC-4
    const nyDay = ny.getUTCDay();
    const nyHour = ny.getUTCHours();
    if (nyDay === 6 || (nyDay === 5 && nyHour >= 17) || (nyDay === 0 && nyHour < 18) || nyHour === 17) continue;
    if (key !== lastKey) { k += 1; lastKey = key; }
    const base = 2000 + 10 * k;
    const hour = new Date(t * 1000).getUTCHours();
    bars.push({ t, o: base, h: hour === 13 ? base + 8 : base + 1, l: hour === 3 ? base - 6 : base - 1, c: base });
  }
  return bars;
}

test("gold's trading day ends at 17:00 New York, summer and winter, and a weekend belongs to Monday", () => {
  assert.equal(dayKey(utc(2026, 9, 23, 20, 59), GOLD), '2026-09-23'); // 16:59 EDT
  assert.equal(dayKey(utc(2026, 9, 23, 21, 0), GOLD), '2026-09-24'); // 17:00 EDT
  assert.equal(dayKey(utc(2026, 1, 7, 21, 30), GOLD), '2026-01-07'); // 16:30 EST
  assert.equal(dayKey(utc(2026, 1, 7, 22, 0), GOLD), '2026-01-08'); // 17:00 EST
  assert.equal(dayKey(utc(2026, 9, 26, 12), GOLD), '2026-09-28'); // Saturday
  assert.equal(dayKey(utc(2026, 9, 27, 22), GOLD), '2026-09-28'); // Sunday 18:00 EDT open
  assert.equal(dayKey(utc(2026, 9, 26, 23, 59), BTC), '2026-09-26'); // Bitcoin keeps UTC days
});

test('wall-clock times convert to UTC across daylight saving changes', () => {
  assert.equal(wallToUtc('Europe/London', 2026, 10, 23, 8), utc(2026, 10, 23, 7)); // BST
  assert.equal(wallToUtc('Europe/London', 2026, 10, 26, 8), utc(2026, 10, 26, 8)); // GMT
  assert.equal(wallToUtc('America/New_York', 2026, 3, 9, 8), utc(2026, 3, 9, 12)); // EDT from 8 March
  assert.equal(wallToUtc('Asia/Tokyo', 2026, 9, 23, 9), utc(2026, 9, 23, 0));
});

test('hourly bars become broker days, and ATR is the average true range', () => {
  const days = toDays(goldBars([2026, 8, 31], utc(2026, 9, 5)), GOLD);
  assert.deepEqual(days.map((d) => d.key), ['2026-08-31', '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04']);
  assert.deepEqual([days[1].o, days[1].h, days[1].l, days[1].c], [2010, 2018, 2004, 2010]);
  const flat = Array.from({ length: 20 }, (_, i) => ({ key: String(i), o: 100, h: 105, l: 95, c: 100 }));
  assert.equal(atr(flat), 10);
  assert.equal(atr(flat.slice(0, 14)), null, 'needs 15 days');
});

test('a mid-week gold snapshot: previous day and week, opens, session ranges, volatility, round numbers', () => {
  const now = utc(2026, 9, 23, 15); // Wednesday 11:00 New York
  const bars = goldBars([2026, 8, 31], now);
  const s = snapshot(GOLD, toDays(bars, GOLD), bars, now);
  assert.equal(s.day, '2026-09-23');
  assert.equal(s.price, 2170);
  assert.equal(s.dayOpen, 2170);
  assert.equal(s.change, 0);
  assert.equal(s.atr, 18);
  assert.equal(s.todayRange, 14);
  assert.ok(Math.abs(s.rangePct - 77.78) < 0.01);
  assert.deepEqual(s.levels.map((l) => [l.id, l.price]), [
    ['round_up', 2200], ['london_h', 2178], ['newyork_h', 2178], ['tokyo_h', 2171], ['do', 2170],
    ['london_l', 2169], ['newyork_l', 2169], ['pdh', 2168], ['tokyo_l', 2164], ['pdl', 2154],
    ['wo', 2150], ['round_down', 2150], ['pwh', 2148], ['pwl', 2094],
  ]);
  assert.equal(s.levels.find((l) => l.id === 'tokyo_h').name, 'Asia high');
  assert.equal(s.sessions.tokyo.done, true);
  assert.equal(s.sessions.london.done, false);
});

test('on a weekend, gold looks ahead to Monday: Friday is the previous day, the week just gone is the previous week', () => {
  const bars = goldBars([2026, 8, 31], utc(2026, 9, 25, 21));
  const now = utc(2026, 9, 26, 12); // Saturday
  const s = snapshot(GOLD, toDays(bars, GOLD), bars, now);
  const level = (id) => s.levels.find((l) => l.id === id)?.price;
  assert.equal(s.day, '2026-09-28');
  assert.equal(s.dayOpen, null);
  assert.equal(s.todayRange, 0);
  assert.equal(level('pdh'), 2198);
  assert.equal(level('pdl'), 2184);
  assert.equal(level('pwh'), 2198);
  assert.equal(level('pwl'), 2144);
  assert.equal(level('wo'), undefined, 'the new week has not opened');
  assert.equal(s.sessions.london, null);
});

test('Bitcoin uses UTC days and Monday-to-Sunday weeks', () => {
  const days = [];
  for (let d = 1; d <= 27; d++) days.push({ key: `2026-09-${String(d).padStart(2, '0')}`, t: utc(2026, 9, d), o: 60000 + d * 100, h: 60000 + d * 100 + 500, l: 60000 + d * 100 - 400, c: 60000 + d * 100 });
  const now = utc(2026, 9, 27, 18); // Sunday
  const s = snapshot(BTC, days, [{ t: now - 900, o: 62700, h: 62750, l: 62650, c: 62720 }], now);
  const level = (id) => s.levels.find((l) => l.id === id)?.price;
  assert.equal(s.day, '2026-09-27');
  assert.equal(level('pdh'), 62600 + 500);
  assert.equal(level('pwh'), 62000 + 500); // Sunday 20 September closes the previous week
  assert.equal(level('pwl'), 61400 - 400); // Monday 14 September
  assert.equal(level('wo'), 62100); // Monday 21 September
  assert.equal(level('round_up'), 63000);
  assert.equal(level('round_down'), 62000);
});

test('the session clock says which sessions are open and when the others open', () => {
  const clock = Object.fromEntries(sessionClock(utc(2026, 9, 28, 9)).map((s) => [s.id, s]));
  assert.equal(clock.london.open, true);
  assert.equal(clock.london.closesIn, 7 * 3600);
  assert.equal(clock.newyork.open, false);
  assert.equal(clock.newyork.opensIn, 3 * 3600);
  assert.equal(clock.tokyo.opensIn, 15 * 3600);
  const weekend = Object.fromEntries(sessionClock(utc(2026, 9, 26, 12)).map((s) => [s.id, s]));
  assert.ok(Object.values(weekend).every((s) => !s.open));
  assert.equal(weekend.london.at, utc(2026, 9, 28, 7)); // Monday 08:00 BST
});

test('gold is closed at the weekend and in the daily break; Bitcoin never closes', () => {
  assert.deepEqual(marketStatus(GOLD, utc(2026, 9, 23, 15)), { open: true, closesAt: utc(2026, 9, 23, 21), weekendClose: false });
  assert.deepEqual(marketStatus(GOLD, utc(2026, 9, 23, 21, 30)), { open: false, reason: 'daily break', opensAt: utc(2026, 9, 23, 22) });
  assert.deepEqual(marketStatus(GOLD, utc(2026, 9, 24, 23)), { open: true, closesAt: utc(2026, 9, 25, 21), weekendClose: true });
  assert.deepEqual(marketStatus(GOLD, utc(2026, 9, 26, 12)), { open: false, reason: 'weekend', opensAt: utc(2026, 9, 27, 22) });
  assert.equal(marketStatus(GOLD, utc(2026, 1, 7, 22, 30)).reason, 'daily break'); // 17:30 EST
  assert.deepEqual(marketStatus(BTC, utc(2026, 9, 26, 12)), { open: true });
});

test('lot size: risk ÷ (stop distance × contract size), rounded down to 0.01', () => {
  const gold = lotSize({ balance: 10000, riskPct: 1, entry: 3742.5, stop: 3737.5, contract: 100 });
  assert.equal(gold.lots, 0.2);
  assert.equal(gold.side, 'long');
  assert.equal(gold.perPoint, 20);
  assert.deepEqual(gold.targets.map((t) => t.price), [3747.5, 3752.5, 3757.5]);

  const pounds = lotSize({ balance: 10000, riskPct: 1, entry: 3742.5, stop: 3737.5, contract: 100, usdPerUnit: 1.25 });
  assert.equal(pounds.lots, 0.25);
  assert.equal(pounds.riskPerLot, 400);

  assert.equal(lotSize({ balance: 5000, riskPct: 2, entry: 65000, stop: 64000, contract: 1 }).lots, 0.1);
  assert.equal(lotSize({ balance: 10000, riskPct: 1, entry: 3742, stop: 3735, contract: 100 }).lots, 0.14);

  const short = lotSize({ balance: 10000, riskPct: 1, entry: 3740, stop: 3745, contract: 100 });
  assert.equal(short.side, 'short');
  assert.deepEqual(short.targets.map((t) => t.price), [3735, 3730, 3725]);

  const tiny = lotSize({ balance: 100, riskPct: 1, entry: 3740, stop: 3735, contract: 100 });
  assert.equal(tiny.lots, 0);
  assert.equal(tiny.tooSmall, true);
  assert.equal(lotSize({ balance: 1000, riskPct: 1, entry: 3740, stop: 3740, contract: 100 }), null, 'no stop, no size');
});

test('numbers and durations read naturally', () => {
  assert.equal(fmtNum(3742.5), '3,742.50');
  assert.equal(fmtNum(NaN), '—');
  assert.equal(fmtDuration(125 * 60), '2h 5m');
  assert.equal(fmtDuration(3 * 86400 + 60), '3d 0h');
  assert.equal(fmtDuration(20 * 60), '20m');
});
