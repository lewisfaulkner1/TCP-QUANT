// TCP Quant Terminal: the prop challenge simulator's maths, for the page.
//
// A member's numbers played through a prop firm's challenge thousands of times. Each simulated
// challenge takes one trade at a time. Every trade closes at its stop (−1R) or its target (+R), less
// costs, and risks a fixed share of the starting balance, a set number of trades a day. A challenge
// ends when the balance reaches the profit target (a pass), loses the day's limit (daily), falls to
// the loss limit (max), or runs out of days. Reaching a limit counts as breaking it.
//
// A win rate measured over 30 trades is a rough guess: when it's 50%, the true rate could be anywhere
// from about 33% to 67%. So each simulated trader draws their true win rate from what those trades
// allow (a beta distribution), and the pass chance carries that doubt. The same challenge with no
// edge (a win rate that only breaks even after costs) is the line to beat.
//
// Everything is seeded, so the same numbers always give the same answer. A sweep of risk levels
// uses the same traders and the same trades at every level, so the levels differ only by the risk.

export const SIM = {
  paths: 4000, // simulated challenges for each answer
  sweep: [0.0025, 0.005, 0.0075, 0.01, 0.015, 0.02, 0.03], // risk per trade, as a share of the starting balance
  keep: 40, // paths kept for the chart
  maxDays: 750, // with no time limit, a challenge still going after this many trading days (3 years) is left unfinished
  seed: 7,
  presets: {
    phase1: { label: '2-step · phase 1', target: 0.10, daily: 0.05, max: 0.10, trailing: false, days: 0 },
    phase2: { label: '2-step · phase 2', target: 0.05, daily: 0.05, max: 0.10, trailing: false, days: 0 },
    oneStep: { label: '1-step', target: 0.10, daily: 0.03, max: 0.06, trailing: true, days: 0 },
  },
};

// ------------------------------------------------------------ random numbers
// mulberry32: small and fast, and the same numbers from the same seed on every phone.
export function simRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One seed per path and purpose, from the answer's seed (murmur3's finaliser).
export function simHash(a, b) {
  let h = (a ^ Math.imul(b + 1, 0x9E3779B1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85EBCA6B);
  h = Math.imul(h ^ (h >>> 13), 0xC2B2AE35);
  return (h ^ (h >>> 16)) >>> 0;
}

function simNormal(next) {
  let u = next();
  while (u === 0) u = next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next());
}

// Gamma(a) for a ≥ 1: Marsaglia and Tsang's method.
export function simGamma(a, next) {
  const d = a - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x;
    let v;
    do { x = simNormal(next); v = 1 + c * x; } while (v <= 0);
    v = v * v * v;
    const u = next();
    if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

// A trader's true win rate, when `rate` was measured over `n` trades: a draw from
// Beta(wins + 1, losses + 1). n = 0 takes the rate as exactly right.
export function drawRate(rate, n, next) {
  if (!n) return rate;
  const x = simGamma(rate * n + 1, next);
  return x / (x + simGamma((1 - rate) * n + 1, next));
}

// ------------------------------------------------------------ the challenge
// o: { rate, rr, cost, risk, perDay, target, daily, max, trailing, days }, shares as fractions
// (0.1 is 10%), rr and cost in R. daily 0 means no daily limit, days 0 no time limit. A trailing
// loss limit follows the highest balance up and stops at the starting balance.

// What a trade is worth on average, in R after costs, and the win rate that only breaks even.
export const simEdge = (o) => o.rate * (o.rr - o.cost) - (1 - o.rate) * (1 + o.cost);
export const breakEvenRate = (o) => (1 + o.cost) / (o.rr + 1);

// One challenge for a trader whose true win rate is p. `next` gives the trades' random numbers;
// `curve`, if given, collects the profit (a share of the starting balance) after each trade.
export function runChallenge(o, p, next, curve) {
  const win = o.risk * (o.rr - o.cost);
  const loss = o.risk * (1 + o.cost);
  const last = o.days || SIM.maxDays;
  const eps = 1e-9;
  let e = 0;
  let high = 0;
  for (let day = 1; day <= last; day++) {
    const start = e;
    for (let t = 0; t < o.perDay; t++) {
      e += next() < p ? win : -loss;
      if (curve) curve.push(e);
      if (e >= o.target - eps) return { end: 'pass', day };
      if (e > high) high = e;
      const floor = o.trailing ? Math.min(high - o.max, 0) : -o.max;
      if (e <= floor + eps) return { end: 'max', day };
      if (o.daily && start - e >= o.daily - eps) return { end: 'daily', day };
    }
  }
  return { end: o.days ? 'time' : 'open', day: last };
}

// Plays the challenge `paths` times. n is how many trades the win rate comes from (0: exactly
// right). Counts how each ended, with the days each pass took, the true win rates drawn, and the
// first `keep` paths to draw.
export function simulate(o, { n = 0, paths = SIM.paths, seed = SIM.seed, keep = 0 } = {}) {
  const out = { paths, pass: 0, daily: 0, max: 0, time: 0, open: 0, days: [], rates: [], curves: [] };
  for (let i = 0; i < paths; i++) {
    const p = drawRate(o.rate, n, simRng(simHash(seed, 2 * i)));
    const curve = i < keep ? [] : null;
    const r = runChallenge(o, p, simRng(simHash(seed, 2 * i + 1)), curve);
    out[r.end] += 1;
    if (r.end === 'pass') out.days.push(r.day);
    if (n) out.rates.push(p);
    if (curve) out.curves.push({ end: r.end, points: curve });
  }
  out.days.sort((a, b) => a - b);
  out.rates.sort((a, b) => a - b);
  return out;
}

const simAt = (sorted, f) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(f * sorted.length))] : null);

// Each ending's share, and the days a pass takes: the median and the middle half.
export function simSummary(r) {
  const share = (k) => r[k] / r.paths;
  return {
    pass: share('pass'), daily: share('daily'), max: share('max'), time: share('time'), open: share('open'),
    median: simAt(r.days, 0.5), p25: simAt(r.days, 0.25), p75: simAt(r.days, 0.75),
  };
}

// Everything the page shows first: the pass chance with the doubt in the win rate, with the rate
// exactly right, and with no edge; how the rest end; the days to pass; the paths to draw; and the
// range the true win rate could be in (95% of the draws).
export function simAnswer(o, n) {
  const main = simulate(o, { n, keep: SIM.keep });
  const exact = n ? simSummary(simulate(o)) : null;
  const flat = simSummary(simulate({ ...o, rate: breakEvenRate(o) }));
  return {
    main: simSummary(main), exact, flat, curves: main.curves,
    edge: simEdge(o), breakEven: breakEvenRate(o),
    rateLow: n ? simAt(main.rates, 0.025) : null, rateHigh: n ? simAt(main.rates, 0.975) : null,
  };
}

// The risk levels to compare: the sweep's, and the member's own.
export const simLevels = (o, risks = SIM.sweep) => [...new Set([...risks, o.risk])].sort((a, b) => a - b);

// The pass chance at each risk level, from the same traders and trades. (The page works through the
// levels one at a time, so it stays responsive on a slow phone.)
export function simSweep(o, n, risks = SIM.sweep) {
  return simLevels(o, risks).map((risk) => ({ risk, pass: simSummary(simulate({ ...o, risk }, { n })).pass }));
}

// ----------------------------------------------------------------- the form
// The member's inputs (percentages as typed) checked and turned into o, or an error to show.
export function simInputs(f) {
  const v = (x) => (typeof x === 'string' ? parseFloat(x.replace(/,/g, '')) : Number(x));
  const rate = v(f.rate) / 100;
  const rr = v(f.rr);
  const cost = f.cost === '' || f.cost == null ? 0 : v(f.cost);
  const risk = v(f.risk) / 100;
  const perDay = v(f.perDay);
  const target = v(f.target) / 100;
  const daily = f.daily === '' || f.daily == null ? 0 : v(f.daily) / 100;
  const max = v(f.max) / 100;
  const days = f.days === '' || f.days == null ? 0 : v(f.days);
  const n = v(f.n) || 0;
  const bad = (m) => ({ error: m });
  if (!(rate > 0 && rate < 1)) return bad('Enter a win rate between 1% and 99%.');
  if (!(rr >= 0.1 && rr <= 20)) return bad('Enter a reward to risk between 0.1 and 20.');
  if (!(cost >= 0 && cost < Math.min(1, rr))) return bad('Costs are a share of 1R: between 0 and 1, and less than the reward.');
  if (!(risk > 0 && risk <= 0.1)) return bad('Enter a risk per trade between 0.01% and 10%.');
  if (!(Number.isInteger(perDay) && perDay >= 1 && perDay <= 20)) return bad('Enter trades a day as a whole number from 1 to 20.');
  if (!(target > 0 && target <= 1)) return bad('Enter a profit target between 0.1% and 100%.');
  if (!(daily >= 0 && daily <= 0.5)) return bad('Enter a daily loss limit up to 50%, or 0 for none.');
  if (!(max > 0 && max <= 1)) return bad('Enter a loss limit between 0.1% and 100%.');
  if (!(Number.isInteger(days) && days >= 0 && days <= 365)) return bad('Enter a time limit in trading days up to 365, or 0 for none.');
  if (!(Number.isInteger(n) && (n === 0 || (n >= 5 && n <= 100000)))) return bad('Enter how many trades your win rate is from (5 or more), or pick Exact.');
  return { o: { rate, rr, cost, risk, perDay, target, daily, max, trailing: !!f.trailing, days }, n };
}
