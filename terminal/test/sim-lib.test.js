// The prop challenge simulator's maths: the random numbers, the doubt in a win rate, one challenge
// trade by trade, the known answers it must match, and the form. Run with: cd terminal && npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SIM, simRng, simHash, simGamma, drawRate, simEdge, breakEvenRate, runChallenge, simulate, simSummary,
  simAnswer, simSweep, simInputs,
} from '../src/sim-lib.js';

const base = { rate: 0.5, rr: 1, cost: 0, risk: 0.01, perDay: 2, target: 0.10, daily: 0, max: 0.10, trailing: false, days: 0 };
const near = (a, b, eps, what = '') => assert.ok(Math.abs(a - b) <= eps, `${what} ${a} is not within ${eps} of ${b}`);
// A script of trades: true is a win. runChallenge wins when the number is below p (0.5 here).
const script = (wins) => { let i = 0; return () => (wins[i++] ? 0.1 : 0.9); };

test('the random numbers repeat from the same seed and stay between 0 and 1', () => {
  const a = simRng(42);
  const b = simRng(42);
  const xs = Array.from({ length: 1000 }, () => a());
  assert.deepEqual(xs, Array.from({ length: 1000 }, () => b()));
  assert.ok(xs.every((x) => x >= 0 && x < 1));
  near(xs.reduce((s, x) => s + x, 0) / xs.length, 0.5, 0.03, 'mean');
  assert.notEqual(simHash(7, 0), simHash(7, 1));
  assert.notEqual(simHash(7, 0), simHash(8, 0));
});

test('a win rate from few trades is a wide guess; from many, a narrow one', () => {
  const next = simRng(1);
  // Gamma(a) has mean a and variance a.
  const g = Array.from({ length: 20000 }, () => simGamma(3.5, next));
  const gm = g.reduce((s, x) => s + x, 0) / g.length;
  near(gm, 3.5, 0.06, 'gamma mean');
  near(g.reduce((s, x) => s + (x - gm) ** 2, 0) / g.length, 3.5, 0.15, 'gamma variance');
  assert.equal(drawRate(0.47, 0, next), 0.47);
  const spread = (n) => {
    const d = Array.from({ length: 20000 }, () => drawRate(0.5, n, next));
    const m = d.reduce((s, x) => s + x, 0) / d.length;
    return { m, sd: Math.sqrt(d.reduce((s, x) => s + (x - m) ** 2, 0) / d.length) };
  };
  // Beta(26, 26): mean 0.5, sd 0.0687. Beta(501, 501): sd 0.0158.
  const few = spread(50);
  near(few.m, 0.5, 0.003, 'mean from 50');
  near(few.sd, 0.0687, 0.002, 'sd from 50');
  near(spread(1000).sd, 0.0158, 0.001, 'sd from 1,000');
});

test('one challenge, trade by trade: pass, the daily limit, the loss limit, time', () => {
  // Every trade wins: 2% a win (1% at 2R), so 5 wins reach 10%, on day 3 at 2 trades a day.
  assert.deepEqual(runChallenge({ ...base, rr: 2 }, 1, simRng(1)), { end: 'pass', day: 3 });
  // Costs come off every trade: 1R less 0.25R is 0.75% a win, so 3% takes 4 wins.
  const curve = [];
  assert.deepEqual(runChallenge({ ...base, cost: 0.25, target: 0.03, perDay: 1 }, 1, simRng(1), curve), { end: 'pass', day: 4 });
  near(curve[0], 0.0075, 1e-12);
  // Every trade loses 2%: three in a day is 6%, past a 5% daily limit before the 10% loss limit.
  assert.deepEqual(runChallenge({ ...base, risk: 0.02, perDay: 3, daily: 0.05 }, 0, simRng(1)), { end: 'daily', day: 1 });
  // Two a day is 4% a day: under the daily limit, until the loss limit is reached on day 3.
  assert.deepEqual(runChallenge({ ...base, risk: 0.02, perDay: 2, daily: 0.05 }, 0, simRng(1)), { end: 'max', day: 3 });
  // Reaching the limit exactly counts: 5 losses of 2% is 10%.
  assert.deepEqual(runChallenge({ ...base, risk: 0.02, perDay: 5 }, 0, simRng(1)), { end: 'max', day: 1 });
  // A coin toss at 0.1% a trade can't reach 10% in 5 days of 2 trades.
  assert.deepEqual(runChallenge({ ...base, risk: 0.001, days: 5 }, 0.5, simRng(3)), { end: 'time', day: 5 });
});

test('a trailing loss limit follows the highest balance up, and stops at the start', () => {
  const o = { ...base, max: 0.06, trailing: true, perDay: 20, target: 0.5 };
  // Up 4%, then 6 losses: down to −2%, which is 6% below the high.
  const upDown = [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0];
  assert.deepEqual(runChallenge(o, 0.5, script(upDown)), { end: 'max', day: 1 });
  const trail = [];
  runChallenge(o, 0.5, script(upDown), trail);
  assert.equal(trail.length, 10);
  // A static limit lets the same trades carry on.
  const still = [];
  runChallenge({ ...o, trailing: false, days: 1, perDay: 12 }, 0.5, script(upDown), still);
  assert.equal(still.length, 12);
  // Up 7%: the limit has stopped at the starting balance, so falling back to it ends the challenge.
  const back = [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0];
  const c = [];
  assert.equal(runChallenge(o, 0.5, script(back), c).end, 'max');
  assert.equal(c.length, 14);
  near(c.at(-1), 0, 1e-12);
});

test('the known answers: a fair game passes as often as the gambler\'s ruin says', () => {
  // ±1% a trade between +10% and −10%: a fair coin reaches either first half the time.
  near(simSummary(simulate(base)).pass, 0.5, 0.03, 'fair');
  // At 55% wins it's (1 − (q/p)^10) / (1 − (q/p)^20) = 88.15%.
  const q = 0.45 / 0.55;
  near(simSummary(simulate({ ...base, rate: 0.55 })).pass, (1 - q ** 10) / (1 - q ** 20), 0.02, 'edge');
  // With no edge at any reward to risk, a small risk passes about target / (target + limit) of the time.
  const flat = { ...base, rr: 2, risk: 0.005, rate: breakEvenRate({ rr: 2, cost: 0 }) };
  near(simSummary(simulate(flat)).pass, 0.5, 0.04, 'no edge at 2R');
  near(simSummary(simulate({ ...flat, target: 0.05 })).pass, 10 / 15, 0.04, 'no edge, 5% target');
});

test('the edge in R, and the win rate that only breaks even after costs', () => {
  near(simEdge({ rate: 0.5, rr: 2, cost: 0 }), 0.5, 1e-12);
  near(simEdge({ rate: 0.4, rr: 1.5, cost: 0.1 }), 0.4 * 1.4 - 0.6 * 1.1, 1e-12);
  near(breakEvenRate({ rr: 1, cost: 0 }), 0.5, 1e-12);
  near(breakEvenRate({ rr: 3, cost: 0 }), 0.25, 1e-12);
  const o = { rr: 2, cost: 0.05 };
  near(simEdge({ ...o, rate: breakEvenRate(o) }), 0, 1e-12);
});

test('doubt about a good win rate lowers the pass chance, and the answer repeats exactly', () => {
  const o = { ...base, rate: 0.6 };
  const sure = simSummary(simulate(o)).pass;
  const unsure = simSummary(simulate(o, { n: 20 })).pass;
  assert.ok(unsure < sure - 0.05, `${unsure} vs ${sure}`);
  assert.deepEqual(simulate(o, { n: 20 }), simulate(o, { n: 20 }));
  const a = simAnswer(o, 50);
  assert.ok(a.rateLow < 0.6 && a.rateHigh > 0.6);
  // Beta(31, 21): 95% of true rates between about 46% and 72%.
  near(a.rateLow, 0.463, 0.02, 'low');
  near(a.rateHigh, 0.724, 0.02, 'high');
  assert.equal(a.curves.length, SIM.keep);
  assert.ok(a.curves.every((c) => c.points.length > 0 && ['pass', 'daily', 'max', 'time', 'open'].includes(c.end)));
  const shares = ['pass', 'daily', 'max', 'time', 'open'].reduce((s, k) => s + a.main[k], 0);
  near(shares, 1, 1e-12);
  assert.ok(a.main.p25 <= a.main.median && a.main.median <= a.main.p75);
  assert.equal(simAnswer(o, 0).exact, null);
});

test('the sweep: the same trades at every risk, the member\'s own risk included', () => {
  const o = { ...base, rate: 0.45, rr: 1.5, cost: 0.05, risk: 0.008, daily: 0.05 };
  const s = simSweep(o, 50);
  assert.deepEqual(s.map((r) => r.risk), [0.0025, 0.005, 0.0075, 0.008, 0.01, 0.015, 0.02, 0.03]);
  assert.equal(s.find((r) => r.risk === 0.008).pass, simSummary(simulate(o, { n: 50 })).pass);
  // At 3% a trade and 2 trades a day, two losses break a 5% daily limit; at 1% they can't.
  assert.equal(simSummary(simulate({ ...o, risk: 0.01 })).daily, 0);
  assert.ok(simSummary(simulate({ ...o, risk: 0.03 })).daily > 0.1);
});

test('fast enough for a phone: the answer and the sweep for a slow case', () => {
  // No edge, no time limit, 1 trade a day: the longest challenges there are.
  const o = { ...base, perDay: 1, rate: breakEvenRate({ rr: 1, cost: 0.05 }), cost: 0.05 };
  const t = performance.now();
  simAnswer(o, 50);
  simSweep(o, 50);
  const ms = performance.now() - t;
  assert.ok(ms < 1500, `${ms.toFixed(0)} ms`);
});

test('the form: numbers as typed, checked, with an error to show', () => {
  const f = { rate: '45', rr: '1.5', cost: '0.05', risk: '1', perDay: '2', target: '10', daily: '5', max: '10', trailing: true, days: '', n: '50' };
  assert.deepEqual(simInputs(f), {
    o: { rate: 0.45, rr: 1.5, cost: 0.05, risk: 0.01, perDay: 2, target: 0.1, daily: 0.05, max: 0.1, trailing: true, days: 0 }, n: 50,
  });
  assert.equal(simInputs({ ...f, daily: '' }).o.daily, 0);
  assert.equal(simInputs({ ...f, cost: '' }).o.cost, 0);
  assert.equal(simInputs({ ...f, n: 0 }).n, 0);
  assert.equal(simInputs({ ...f, rate: '1,5' }).error, undefined); // 15%
  for (const bad of [{ rate: '0' }, { rate: '100' }, { rate: 'abc' }, { rr: '0' }, { cost: '1.6' }, { cost: '-1' }, { risk: '0' }, { risk: '11' },
    { perDay: '1.5' }, { perDay: '0' }, { target: '0' }, { daily: '60' }, { max: '0' }, { days: '2.5' }, { days: '400' }, { n: '3' }]) {
    assert.ok(simInputs({ ...f, ...bad }).error, JSON.stringify(bad));
  }
});
