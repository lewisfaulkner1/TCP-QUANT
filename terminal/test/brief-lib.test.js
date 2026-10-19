// Session briefs' maths: when each session opens and when its reminder is due, checking
// zones, and reviewing what price did at them. Run with: cd terminal && npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { touchProb } from '../src/lib.js';
import {
  BRIEF, briefWindows, briefDefault, briefWindow, briefReminders, briefAsk, cleanZones,
  zoneSide, zoneEdge, zoneOdds, reviewZone, reviewBrief, briefStats,
} from '../src/brief-lib.js';

const utc = (s) => Date.parse(s) / 1000;
const hhmm = (t) => new Date(t * 1000).toISOString().slice(11, 16);
const GOLD = { symbol: 'XAUUSD', price: 4212.4, atr: 30 };

// ------------------------------------------------------------------ schedule
test('sessions open at their own cities\' 9:00 (Tokyo) and 8:00 (London, New York), through daylight saving', () => {
  const on = (day, id) => briefWindows(utc(`${day}T00:30:00Z`)).find((w) => w.id === id && w.key === day);
  // Monday 28 September 2026: British and US summer time.
  assert.equal(hhmm(on('2026-09-28', 'asia').open), '00:00');
  assert.equal(hhmm(on('2026-09-28', 'asia').close), '09:00');
  assert.equal(hhmm(on('2026-09-28', 'london').open), '07:00');
  assert.equal(hhmm(on('2026-09-28', 'london').close), '16:00');
  assert.equal(hhmm(on('2026-09-28', 'newyork').open), '12:00');
  assert.equal(hhmm(on('2026-09-28', 'newyork').close), '21:00');
  // Monday 12 January 2026: winter time in both.
  assert.equal(hhmm(on('2026-01-12', 'london').open), '08:00');
  assert.equal(hhmm(on('2026-01-12', 'newyork').open), '13:00');
  // Monday 16 March 2026: New York has moved its clocks and London hasn't, so they're 4 hours apart.
  assert.equal(hhmm(on('2026-03-16', 'london').open), '08:00');
  assert.equal(hhmm(on('2026-03-16', 'newyork').open), '12:00');
});

test('there are no sessions at the weekend, and Monday\'s Asia open starts the week', () => {
  const week = briefWindows(utc('2026-09-26T12:00:00Z'), 8); // from Saturday
  for (const w of week) assert.ok(![0, 6].includes(new Date(w.key + 'T00:00:00Z').getUTCDay()), w.key);
  const weekly = week.filter((w) => w.weekly);
  assert.ok(weekly.length >= 1);
  for (const w of weekly) assert.equal(w.id, 'asia');
  assert.equal(new Date(weekly[0].key + 'T00:00:00Z').getUTCDay(), 1);
  assert.deepEqual(briefAsk(weekly[0]), ['5M', '15M', '30M', '1H', '4H', '1D']);
  assert.deepEqual(briefAsk(week.find((w) => !w.weekly)), ['5M', '15M', '30M', '1H', '4H']);
});

test('a new brief is for the session that opened within the hour, or else the next one', () => {
  assert.equal(briefDefault(utc('2026-09-28T06:30:00Z')).id, 'london'); // opens in 30 minutes
  assert.equal(briefDefault(utc('2026-09-28T07:50:00Z')).id, 'london'); // opened 50 minutes ago
  assert.equal(briefDefault(utc('2026-09-28T08:10:00Z')).id, 'newyork'); // London is past its first hour
  const friday = briefDefault(utc('2026-10-02T21:30:00Z')); // after Friday's close: Monday's Asia
  assert.equal(friday.id, 'asia');
  assert.equal(friday.key, '2026-10-05');
  assert.equal(friday.weekly, true);
});

test('a named session is the one running, or the next of that name', () => {
  assert.equal(hhmm(briefWindow('london', utc('2026-09-28T10:00:00Z')).open), '07:00');
  assert.equal(briefWindow('london', utc('2026-09-28T10:00:00Z')).key, '2026-09-28');
  assert.equal(briefWindow('asia', utc('2026-09-28T10:00:00Z')).key, '2026-09-29'); // Monday's has closed
  assert.equal(briefWindow('mars', utc('2026-09-28T10:00:00Z')), null);
});

test('a reminder falls due at the lead time before each open, once in its 15-minute window', () => {
  const due = (iso, lead) => briefReminders(utc(iso), lead).map((w) => w.id);
  assert.deepEqual(due('2026-09-28T06:14:00Z'), []);
  assert.deepEqual(due('2026-09-28T06:15:00Z'), ['london']);
  assert.deepEqual(due('2026-09-28T06:25:00Z'), ['london'], 'a missed check still sends it');
  assert.deepEqual(due('2026-09-28T06:31:00Z'), []);
  assert.deepEqual(due('2026-09-28T06:00:00Z', 60), ['london']);
  assert.deepEqual(due('2026-09-28T11:15:00Z'), ['newyork']);
  assert.deepEqual(due('2026-09-27T23:15:00Z'), ['asia'], 'Sunday night, for Monday\'s Asia open');
  assert.deepEqual(due('2026-09-26T06:15:00Z'), [], 'nothing on a Saturday');
});

// --------------------------------------------------------------------- zones
test('zones are tidied: known kinds, low below high, the market\'s decimals, numbers from text', () => {
  const { zones, dropped } = cleanZones([
    { kind: 'demand', low: '4,216.004', high: 4208.3, tf: '4H', label: '  4H demand ', why: 'H4 zone at the fib' },
    { kind: 'level', low: 4236, high: null, label: 'PDH' },
    { kind: 'supply', low: 4250, high: 4256.55, label: 'Supply' },
    { kind: 'demand', low: 4208.3, high: 4216, label: 'again' },
    { kind: 'fairy', low: 4200, high: 4201 },
    { kind: 'supply', low: null, high: undefined },
    { kind: 'supply', low: 4600, high: 4610 },
    { kind: 'demand', low: 4100, high: 4200 },
  ], GOLD);
  assert.deepEqual(zones.map((z) => [z.kind, z.low, z.high]), [['supply', 4250, 4256.55], ['level', 4236, 4236], ['demand', 4208.3, 4216]]);
  assert.equal(zones[2].label, '4H demand');
  assert.equal(zones[2].tf, '4H');
  assert.deepEqual(dropped.map((d) => d.why), ['unknown kind', 'no price', 'too far from the price', 'too wide']);
});

test('at most six zones, the nearest to the price kept', () => {
  const list = Array.from({ length: 9 }, (_, i) => ({ kind: 'level', low: 4212.4 + (i + 1) * 5 * (i % 2 ? 1 : -1) }));
  const { zones, dropped } = cleanZones(list, GOLD);
  assert.equal(zones.length, BRIEF.maxZones);
  assert.equal(dropped.length, 3);
  const far = Math.max(...zones.map((z) => Math.abs(z.low - 4212.4)));
  for (const d of dropped) assert.match(d.why, /more than 6/);
  assert.ok(far <= 30, `kept one ${far} away`);
});

test('a zone\'s side, the edge price meets first, and its odds', () => {
  const z = { low: 4200, high: 4205 };
  assert.equal(zoneSide(z, 4212), 'below');
  assert.equal(zoneEdge(z, 4212), 4205);
  assert.equal(zoneSide(z, 4190), 'above');
  assert.equal(zoneEdge(z, 4190), 4200);
  assert.equal(zoneSide(z, 4202), 'inside');
  assert.equal(zoneOdds(z, 4202, 1e-5), 1);
  assert.equal(zoneOdds(z, 4212, 1e-5), touchProb(4212, 4205, 1e-5));
  assert.ok(zoneOdds({ low: 4180, high: 4185 }, 4212, 1e-5) < zoneOdds(z, 4212, 1e-5), 'further is less likely');
});

// -------------------------------------------------------------------- review
const bar = (t, o, h, l, c) => ({ t, o, h, l, c });
const T = utc('2026-09-28T07:00:00Z');
const window = { from: T + 30, to: T + 600, price: 4212, atr: 20, step: 60 };

test('the review starts after the minute the brief went out, and stops at the close', () => {
  const zone = { low: 4200, high: 4205 };
  // The minute it was posted in dips into the zone: some of that came before the post, so it doesn't count.
  const bars = [bar(T, 4212, 4213, 4204, 4211), bar(T + 60, 4211, 4212, 4209, 4210), bar(T + 120, 4210, 4211, 4206, 4207)];
  assert.deepEqual(reviewZone(zone, bars, window), { side: 'below', reached: false });
  // A bar that finishes after the close doesn't count either.
  const late = [...bars, bar(T + 570, 4207, 4207, 4199, 4200)];
  assert.equal(reviewZone(zone, late, window).reached, false);
  assert.equal(reviewZone(zone, late, { ...window, to: T + 630 }).reached, true);
});

test('from the bar that reached it: how far price went back, and how far on through', () => {
  const below = { low: 4200, high: 4205 };
  const bars = [
    bar(T + 60, 4212, 4212, 4208, 4209),
    bar(T + 120, 4209, 4209, 4203, 4204), // reaches the zone, closes at 4204
    bar(T + 180, 4204, 4206, 4199, 4205), // 5 through
    bar(T + 240, 4205, 4213, 4204, 4212), // 9 back
    bar(T + 300, 4212, 4214, 4210, 4211), // 10 back
  ];
  const r = reviewZone(below, bars, window);
  assert.equal(r.reached, true);
  assert.equal(r.at, T + 120);
  assert.equal(r.close, 4204);
  assert.equal(r.away, 10);
  assert.equal(r.through, 5);
  assert.equal(r.turn, 0.25, '(10 - 5) / 20');
  // A zone above, reached from below: back is down, through is up.
  const above = { low: 4218, high: 4222 };
  const up = [bar(T + 60, 4212, 4219, 4211, 4218), bar(T + 120, 4218, 4225, 4217, 4224), bar(T + 180, 4224, 4224, 4210, 4211)];
  const u = reviewZone(above, up, window);
  assert.deepEqual([u.reached, u.away, u.through, u.turn], [true, 8, 7, 0.05]);
  // Reached in the last minute: nothing after it, so no turn either way.
  const last = reviewZone(below, [bar(T + 540, 4206, 4206, 4201, 4202)], window);
  assert.deepEqual([last.reached, last.away, last.through, last.turn], [true, 0, 0, 0]);
  // Price already inside the zone when the brief went out: left out.
  assert.deepEqual(reviewZone({ low: 4210, high: 4215 }, bars, window), { side: 'inside', reached: null });
});

test('a brief\'s zones reviewed together, with the count for the wrap', () => {
  const zones = [
    { kind: 'supply', low: 4230, high: 4235, odds: 0.3 },
    { kind: 'demand', low: 4200, high: 4205, odds: 0.5 },
    { kind: 'level', low: 4211, high: 4213, odds: 1 },
  ];
  const r = reviewBrief(zones, [bar(T + 60, 4212, 4212, 4203, 4204), bar(T + 120, 4204, 4209, 4204, 4208)], window);
  assert.equal(r.counted, 2, 'the zone price was inside is left out');
  assert.equal(r.reached, 1);
  assert.equal(r.expected, 0.8);
  assert.equal(r.zones[1].review.away, 5);
});

// -------------------------------------------------------------------- record
const reviewed = (turns, over = {}) => ({
  session: 'london', symbol: 'XAUUSD', posted: 1, test: false, ...over,
  review: { zones: turns.map((t) => ({ kind: 'demand', odds: 0.5, review: t === null ? { reached: false } : { reached: true, turn: t } })) },
});

test('the record: zones reached against the random walk\'s expectation, and the average turn', () => {
  const st = briefStats([
    reviewed([0.4, null, -0.1]),
    reviewed([0.3], { session: 'asia' }),
    reviewed([5, 5, 5], { test: true }), // test briefs don't count
    { session: 'london', posted: 3, review: null }, // not reviewed yet
    { ...reviewed([]), review: { zones: [{ kind: 'level', odds: 1, review: { reached: null } }] } }, // inside when posted
  ]);
  assert.equal(st.briefs, 3);
  assert.equal(st.zones, 4);
  assert.equal(st.reached, 3);
  assert.equal(st.expected, 2);
  assert.equal(st.reach.rate, 0.75);
  assert.equal(st.reach.noEdge, 0.5);
  assert.equal(st.turn.n, 3);
  assert.equal(st.turn.avg, 0.2);
  assert.equal(st.verdict, 'collecting');
  assert.deepEqual(st.bySession.map((g) => [g.key, g.zones, g.reached]), [['london', 3, 2], ['asia', 1, 1]]);
  assert.equal(st.curve.length, 3);
});

test('the verdict waits for 20 reached zones, then needs the whole band clear of zero', () => {
  const many = (turns) => briefStats(turns.map((t) => reviewed([t])));
  assert.equal(many(Array(19).fill(0.5)).verdict, 'collecting');
  assert.equal(many([...Array(10).fill(0.6), ...Array(10).fill(0.4)]).verdict, 'turning');
  assert.equal(many([...Array(10).fill(-0.6), ...Array(10).fill(-0.4)]).verdict, 'breaking');
  assert.equal(many([...Array(10).fill(0.5), ...Array(10).fill(-0.45)]).verdict, 'unclear');
});

// A seeded random source, so the simulations give the same answer every run.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (random) => Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());

// One simulated brief: a zone some way above or below the price, then a session of one-minute
// bars on a random walk (4 steps a minute). `push` moves price away from the zone once it's
// been reached: a zone that really holds price back.
function simulate(random, push = 0) {
  const minutes = 240;
  const sd = 0.4; // price move per step
  const price = 2000;
  const distance = 1 + random() * 14;
  const zone = random() < 0.5 ? { low: price - distance - 3, high: price - distance } : { low: price + distance, high: price + distance + 3 };
  const below = zone.high < price;
  const bars = [];
  let p = price;
  let hit = false;
  for (let m = 0; m < minutes; m++) {
    const o = p;
    let h = p;
    let l = p;
    for (let k = 0; k < 4; k++) {
      p += sd * gauss(random) + (hit ? (below ? push : -push) : 0);
      h = Math.max(h, p);
      l = Math.min(l, p);
    }
    bars.push(bar(T + 60 + m * 60, o, h, l, p));
    if (below ? l <= zone.high : h >= zone.low) hit = true;
  }
  const variance = (sd / price) ** 2 * 4 * minutes;
  return { zone: { kind: below ? 'demand' : 'supply', ...zone, odds: zoneOdds(zone, price, variance) }, bars, price };
}
const simWindow = (price) => ({ from: T + 30, to: T + 60 + 240 * 60, price, atr: 20, step: 60 });

test('on a random walk, zones are reached about as often as the engine\'s odds say, and turn price no more than chance', () => {
  const random = rng(5);
  let odds = 0;
  let reached = 0;
  const turns = [];
  for (let k = 0; k < 1500; k++) {
    const s = simulate(random);
    const r = reviewZone(s.zone, s.bars, simWindow(s.price));
    odds += s.zone.odds;
    if (r.reached) { reached += 1; turns.push(r.turn); }
  }
  assert.ok(Math.abs(reached - odds) / 1500 < 0.04, `reached ${reached}, the odds said ${odds.toFixed(0)}`);
  const mean = turns.reduce((a, b) => a + b, 0) / turns.length;
  const sd = Math.sqrt(turns.reduce((a, b) => a + (b - mean) ** 2, 0) / (turns.length - 1));
  assert.ok(Math.abs(mean) < 2.6 * (sd / Math.sqrt(turns.length)), `average turn ${mean.toFixed(3)} over ${turns.length}`);
});

test('with no edge, the record rarely says zones turn price; with one, it usually does', () => {
  const random = rng(9);
  const record = (push) => {
    const briefs = [];
    for (let k = 0; k < 60 && briefs.filter((b) => b.review.zones[0].review.reached).length < 25; k++) {
      const s = simulate(random, push);
      briefs.push({ session: 'london', posted: k, review: { zones: [{ ...s.zone, review: reviewZone(s.zone, s.bars, simWindow(s.price)) }] } });
    }
    return briefStats(briefs).verdict;
  };
  const none = { turning: 0, breaking: 0, unclear: 0, collecting: 0 };
  for (let k = 0; k < 150; k++) none[record(0)] += 1;
  assert.ok(none.turning / 150 < 0.05, `looked like an edge ${none.turning} times in 150`);
  assert.ok(none.breaking / 150 < 0.05, JSON.stringify(none));
  let real = 0;
  for (let k = 0; k < 60; k++) if (record(0.06) === 'turning') real += 1;
  assert.ok(real / 60 > 0.7, `found a real edge ${real} times in 60`);
});
