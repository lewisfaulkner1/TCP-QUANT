// The leaderboard's maths: periods, compounding, the tables, a trader's own stats, and the checks
// on what the bridge and members send. Run with: cd terminal && npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RANKS, rankPct, prevTradingDay, currentPeriods, periodRange, inPeriod, compound, tScore, periodStats, rankTable,
  viewTable, leaderboard, personalStats, cleanDay, cleanOpen, cleanNick, cleanAccount,
} from '../src/ranks-lib.js';

const day = (d, ret, trades = 2, won = 1, lost = 1, gw = 0.02, gl = 0.01) => ({ day: d, ret, trades, won, lost, gw, gl });
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

test('periods: the last full trading day, the week and month so far, and the ones before', () => {
  assert.equal(prevTradingDay('2026-09-29'), '2026-09-28'); // Tuesday → Monday
  assert.equal(prevTradingDay('2026-09-28'), '2026-09-25'); // Monday → Friday
  assert.deepEqual(currentPeriods('2026-10-01'), { day: '2026-09-30', week: '2026-09-28', lastWeek: '2026-09-21', month: '2026-10', lastMonth: '2026-09' });
  assert.equal(currentPeriods('2026-01-05').lastMonth, '2025-12');
  assert.deepEqual(periodRange('lastWeek', '2026-09-21'), { from: '2026-09-21', to: '2026-09-27' });
  assert.deepEqual(periodRange('month', '2026-09'), { from: '2026-09-01', to: '2026-09-31' });
  const days = ['2026-08-31', '2026-09-01', '2026-09-27', '2026-09-28', '2026-10-01'].map((d) => day(d, 0.01));
  assert.deepEqual(inPeriod(days, 'month', '2026-09').map((d) => d.day), ['2026-09-01', '2026-09-27', '2026-09-28']);
  assert.deepEqual(inPeriod(days, 'week', '2026-09-28').map((d) => d.day), ['2026-09-28', '2026-10-01']);
  assert.deepEqual(inPeriod(days, 'day', '2026-09-27').map((d) => d.day), ['2026-09-27']);
  assert.equal(rankPct(0.0342), '+3.42%');
  assert.equal(rankPct(-0.008), '−0.80%');
  assert.equal(rankPct(0), '0.00%');
});

test('a week compounds its days; the best and worst are of the days that traded', () => {
  near(compound([0.1, -0.1]), -0.01);
  // The third day has no closed trade (an entry's commission, say): it counts in the return, not as a day.
  const s = periodStats([day('2026-09-28', 0.02, 3, 2, 1), day('2026-09-29', -0.01, 1, 0, 1), day('2026-09-30', -0.02, 0, 0, 0)]);
  near(s.ret, 1.02 * 0.99 * 0.98 - 1, 1e-6);
  assert.deepEqual([s.trades, s.won, s.lost, s.days, s.best, s.worst], [4, 2, 2, 2, 0.02, -0.01]);
  assert.equal(s.score, null, 'two traded days are too few for a score');
});

test('the consistency score is the t-score of the traded days, and needs three that differ', () => {
  const rets = [0.01, 0.02, -0.005, 0.015];
  const logs = rets.map(Math.log1p);
  const mean = logs.reduce((a, v) => a + v) / logs.length;
  const sd = Math.sqrt(logs.reduce((a, v) => a + (v - mean) ** 2, 0) / (logs.length - 1));
  near(tScore(logs.length, logs.reduce((a, v) => a + v), logs.reduce((a, v) => a + v * v, 0)), Math.round((mean / (sd / 2)) * 100) / 100);
  assert.equal(periodStats(rets.map((r, i) => day(`2026-09-2${i + 1}`, r))).score, tScore(4, logs.reduce((a, v) => a + v), logs.reduce((a, v) => a + v * v, 0)));
  assert.equal(tScore(2, 0.02, 0.0002), null);
  assert.equal(tScore(3, 0.03, 0.0003), null, 'three identical days have no spread');
});

test('the table: traders with a closed trade, highest first, with green and red counted', () => {
  const traders = [
    { id: 1, nick: 'Alpha', days: [day('2026-09-28', 0.03), day('2026-09-29', 0.01)] },
    { id: 2, nick: 'Bravo', open: -0.12, days: [day('2026-09-28', -0.02), day('2026-09-29', 0.005)] },
    { id: 3, nick: 'Charlie', days: [day('2026-09-28', 0.03, 4)] },
    { id: 4, nick: 'Delta', days: [day('2026-09-28', 0, 0, 0, 0)] }, // no trades: not ranked
    { id: 5, nick: 'Echo', days: [day('2026-09-21', 0.5)] }, // last week: not this week's
  ];
  const week = leaderboard(traders, 'week', '2026-09-28', 2);
  assert.deepEqual(week.rows.map((r) => [r.rank, r.nick]), [[1, 'Alpha'], [2, 'Charlie'], [3, 'Bravo']]);
  assert.deepEqual([week.traders, week.green, week.red, week.mine], [3, 2, 1, 3]);
  assert.equal(week.rows[2].me, true);
  assert.equal(week.rows[0].me, false);
  assert.equal(week.rows[2].worst, -0.02);
  assert.equal(week.rows[2].open, -0.12, 'open trades show beside the closed ones');
  for (const r of week.rows) assert.equal(r.id, undefined, 'no ids go out');
  const day28 = leaderboard(traders, 'day', '2026-09-28');
  assert.deepEqual(day28.rows.map((r) => r.nick), ['Charlie', 'Alpha', 'Bravo'], 'a tie goes to more trades');
  assert.deepEqual(leaderboard(traders, 'lastWeek', '2026-09-21').rows.map((r) => r.nick), ['Echo']);
});

test('ranked by consistency, only traders with a score are listed', () => {
  const rows = [
    { id: 1, nick: 'Steady', ret: 0.03, trades: 20, score: 3.1 },
    { id: 2, nick: 'Lucky', ret: 0.2, trades: 3, score: 0.8 },
    { id: 3, nick: 'New', ret: 0.05, trades: 2, score: null },
  ];
  assert.deepEqual(rankTable(rows, 'score').rows.map((r) => [r.rank, r.nick]), [[1, 'Steady'], [2, 'Lucky']]);
  assert.deepEqual(rankTable(rows).rows.map((r) => r.nick), ['Lucky', 'New', 'Steady']);
});

test('a long table shows the top 50, and the viewer\'s own row below it', () => {
  const traders = Array.from({ length: 80 }, (_, i) => ({ id: i, nick: `T${i}`, days: [day('2026-09-28', (80 - i) / 1000)] }));
  const t = leaderboard(traders, 'day', '2026-09-28', 70);
  assert.equal(t.rows.length, RANKS.top + 1);
  assert.deepEqual(t.rows.at(-1), { nick: 'T70', open: null, ret: 0.01, trades: 2, won: 1, lost: 1, days: 1, best: 0.01, worst: 0.01, score: null, rank: 71, me: true });
  assert.equal(leaderboard(traders, 'day', '2026-09-28', 3).rows.length, RANKS.top);
  const table = rankTable(traders.map((tr) => ({ id: tr.id, nick: tr.nick, ...periodStats(tr.days) })));
  assert.deepEqual(viewTable(table, 999).mine, null, 'someone not on the table sees no row of theirs');
});

test('your own stats: win rate, profit factor, average day, drawdown on the curve of closed trades', () => {
  const s = personalStats([
    day('2026-09-29', -0.1, 2, 0, 2, 0, 0.1),
    day('2026-09-28', 0.2, 3, 3, 0, 0.2, 0),
    day('2026-09-30', 0.05, 1, 1, 0, 0.05, 0),
  ]);
  assert.deepEqual([s.days, s.trades, s.won, s.lost], [3, 6, 4, 2]);
  near(s.winRate, 4 / 6, 1e-4);
  near(s.profitFactor, 2.5, 1e-3);
  near(s.avgDay, (0.2 - 0.1 + 0.05) / 3, 1e-6);
  near(s.total, 1.2 * 0.9 * 1.05 - 1, 1e-6);
  near(s.maxDrawdown, 0.1, 1e-6);
  assert.equal(typeof s.score, 'number');
  assert.deepEqual(s.curve.map((c) => c.day), ['2026-09-28', '2026-09-29', '2026-09-30'], 'in date order');
  assert.equal(personalStats([day('2026-09-28', 0.01, 1, 1, 0, 0.01, 0)]).profitFactor, Infinity);
  assert.deepEqual(personalStats([]), { days: 0, trades: 0, won: 0, lost: 0, winRate: null, profitFactor: null, avgDay: null, best: null, worst: null, total: 0, maxDrawdown: 0, score: null, curve: [] });
});

test('what the bridge sends is checked, row by row', () => {
  const clean = cleanDay(day('2026-09-28', 0.0123456789));
  assert.deepEqual(clean, { day: '2026-09-28', ret: 0.012346, lr: Math.log1p(0.012346), trades: 2, won: 1, lost: 1, gw: 0.02, gl: 0.01 });
  assert.equal(cleanDay(day('2026-09-28', -1)).ret, -0.9999, 'a day that lost everything stays finite');
  for (const bad of [
    null, { ...day('2026-09-28', 0.01), day: '28/09/2026' }, day('2026-02-30', 0.01), day('2026-09-28', -1.5), day('2026-09-28', 11),
    day('2026-09-28', NaN), day('2026-09-28', '0.01'), day('2026-09-28', 0.01, 2.5), day('2026-09-28', 0.01, 2, 2, 1),
    day('2026-09-28', 0.01, -1, 0, 0), day('2026-09-28', 0.01, 2, 1, 1, -0.1),
  ]) assert.equal(cleanDay(bad), null, JSON.stringify(bad));
  assert.equal(cleanOpen(-0.123456), -0.1235);
  for (const bad of [undefined, null, '0.1', NaN, -1.2, Infinity]) assert.equal(cleanOpen(bad), null);
});

test('names and accounts are checked', () => {
  assert.equal(cleanNick('  Gold   Hunter '), 'Gold Hunter');
  assert.equal(cleanNick('Élodie_99'), 'Élodie_99');
  assert.equal(cleanNick('tcpfan'), 'tcpfan');
  for (const bad of ['A', '_lead', 'x'.repeat(21), '<b>hi</b>', '', null, 'TCP Official', 'Admin', 'gold_tcp', 'The Crypto Playbook', 'Support 24']) {
    assert.equal(cleanNick(bad), null, String(bad));
  }
  assert.deepEqual(cleanAccount({ login: ' 1234 5678 ', server: 'PUPrime-Live 3' }), { login: '12345678', server: 'PUPrime-Live 3', broker: 'puprime' });
  assert.equal(cleanAccount({ login: '555666', server: 'VantageInternational-Live 2' }).broker, 'vantage');
  assert.equal(cleanAccount({ login: 'abc', server: 'PUPrime-Live' }).field, 'login');
  assert.equal(cleanAccount({ login: '555666', server: 'PUPrime-Demo' }).field, 'server');
  assert.match(cleanAccount({ login: '555666', server: 'ICMarketsSC-Live' }).error, /PU Prime and Vantage/);
});
