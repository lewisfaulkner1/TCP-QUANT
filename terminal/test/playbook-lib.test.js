// The Playbook's maths: checking a plan, walking a setup through the bars that followed,
// and judging the record. Run with: cd terminal && npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAYBOOK, checkPlan, openSetup, advanceSetup, expireIfDue, closeSetup, moveSetupStop, cancelSetup,
  setupLiveR, noEdgeOdds, planR, netR, t975, wilsonBand, recordStats, recordLine, fmtR,
} from '../src/playbook-lib.js';

const T0 = Date.UTC(2026, 8, 28, 13, 30) / 1000; // Monday 13:30 UTC, gold open
const GOLD = { price: 3742.5, atr: 40, open: true };
const plan = (over = {}) => ({ symbol: 'XAUUSD', side: 'buy', kind: 'market', entry: 3742.5, sl: 3727.5, tp: 3772.5, tags: ['Sweep'], note: 'Swept the Asia low into H4 demand.', ...over });
const bar = (t, o, h, l, c) => ({ t, o, h, l, c });
// A run of one-minute bars from `t`, each [o, h, l, c].
const bars = (t, rows) => rows.map((r, i) => bar(t + i * 60, ...r));
const after = (s, rows, extra = 0) => advanceSetup(s, bars(s.checked, rows), s.checked + rows.length * 60 + extra);

// ------------------------------------------------------------------- plans
test('a sound plan is tidied: prices to the market\'s decimals, numbers from text, reasons deduplicated', () => {
  const { plan: p } = checkPlan(plan({ entry: '3,742.504', sl: 3727.5, tp: '3772.5', tags: [' Sweep ', 'sweep', 'H4  zone'], note: '  Swept   the low. ' }), GOLD);
  assert.equal(p.entry, 3742.5);
  assert.deepEqual(p.tags, ['Sweep', 'H4 zone']);
  assert.equal(p.note, 'Swept the low.');
  assert.equal(p.expiry, null, 'a market order does not wait');
  assert.equal(checkPlan(plan({ kind: 'limit', entry: 3730, sl: 3720, tp: 3760 }), GOLD).plan.expiry, 24, 'a pending order waits a day by default');
});

test('plans that make no sense are refused, with the field to fix', () => {
  const bad = (over, field, quote = GOLD) => {
    const r = checkPlan(plan(over), quote);
    assert.ok(r.error, JSON.stringify(over));
    assert.equal(r.field, field, r.error);
  };
  bad({ symbol: 'EURUSD' }, 'symbol');
  bad({ side: 'long' }, 'side');
  bad({ kind: 'twap' }, 'kind');
  bad({ entry: '' }, 'entry');
  bad({ sl: 3750 }, 'sl'); // a buy's stop above its entry
  bad({ side: 'sell' }, 'sl'); // the same prices as a sell
  bad({ tp: 3740 }, 'tp');
  bad({ tp: 3746 }, 'tp'); // 0.23R
  bad({ tp: 4100 }, 'tp'); // 23.8R
  bad({ note: 'why' }, 'note');
  bad({ note: 'x'.repeat(401) }, 'note');
  bad({ tags: ['<script>'] }, 'tags');
  bad({ tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }, 'tags');
  bad({ kind: 'limit', entry: 3730, sl: 3720, tp: 3760, expiry: 0 }, 'expiry');
  bad({ kind: 'limit', entry: 3730, sl: 3720, tp: 3760, expiry: 1.5 }, 'expiry');
});

test('a market order is logged at the price now: not later, not while the market is shut', () => {
  assert.ok(checkPlan(plan({ entry: 3745 }), GOLD).plan, 'within a tenth of the daily range');
  assert.equal(checkPlan(plan({ entry: 3750, sl: 3735, tp: 3780 }), GOLD).field, 'entry', 'a price the market has left');
  assert.equal(checkPlan(plan(), { ...GOLD, open: false }).field, 'kind');
  assert.equal(checkPlan(plan({ entry: 3742.5, sl: 3740, tp: 3790 }), { ...GOLD, price: 3739.9 }).field, 'sl', 'already through the stop');
  assert.equal(checkPlan(plan({ side: 'sell', entry: 3742.5, sl: 3752.5, tp: 3739 }), { ...GOLD, price: 3738.9 }).field, 'tp', 'already through the target');
  assert.ok(checkPlan(plan(), null).plan, 'without a quote, only the plan itself is checked');
});

test('limit and stop orders must wait on the right side of the price', () => {
  const ok = (side, kind, entry) => checkPlan(plan({ side, kind, entry, sl: side === 'buy' ? entry - 10 : entry + 10, tp: side === 'buy' ? entry + 20 : entry - 20 }), GOLD);
  assert.ok(ok('buy', 'limit', 3730).plan);
  assert.equal(ok('buy', 'limit', 3750).field, 'entry');
  assert.ok(ok('buy', 'stop', 3750).plan);
  assert.equal(ok('buy', 'stop', 3730).field, 'entry');
  assert.ok(ok('sell', 'limit', 3750).plan);
  assert.equal(ok('sell', 'limit', 3730).field, 'entry');
  assert.ok(ok('sell', 'stop', 3730).plan);
  assert.equal(ok('sell', 'stop', 3750).field, 'entry');
  assert.equal(ok('buy', 'limit', 3742.5).field, 'entry', 'at the price is not a limit');
});

test('no-edge odds are risk over risk plus reward', () => {
  assert.equal(noEdgeOdds(plan()), 1 / 3);
  assert.equal(noEdgeOdds(plan({ tp: 3757.5 })), 0.5);
});

// -------------------------------------------------------------- the setup
test('a market order is open at once; the minute it was logged in is never scanned', () => {
  const s = openSetup(checkPlan(plan(), GOLD).plan, T0 + 25);
  assert.equal(s.status, 'open');
  assert.equal(s.fill, 3742.5);
  assert.equal(s.checked, T0 + 60);
  // a bar in the logging minute that went through the stop doesn't count
  const r = advanceSetup(s, [bar(T0, 3742, 3743, 3720, 3742), bar(T0 + 60, 3742, 3745, 3740, 3744)], T0 + 180);
  assert.equal(r.setup.status, 'open');
  assert.equal(r.setup.checked, T0 + 120);
});

test('target first: won at the target; stop first: lost at the stop; both in one bar: the stop', () => {
  const s = openSetup(plan(), T0);
  let r = after(s, [[3742.5, 3750, 3740, 3748], [3748, 3773, 3747, 3770]]);
  assert.equal(r.setup.status, 'won');
  assert.equal(r.setup.reason, 'tp');
  assert.equal(r.setup.r, 2);
  assert.deepEqual(r.events, [{ type: 'tp', at: s.checked + 60, price: 3772.5, r: 2 }]);
  r = after(s, [[3742.5, 3744, 3727, 3730]]);
  assert.equal(r.setup.status, 'lost');
  assert.equal(r.setup.r, -1);
  r = after(s, [[3742.5, 3775, 3725, 3750]]);
  assert.equal(r.setup.reason, 'sl', 'the stop is assumed to come first');
});

test('a stop the market gaps through fills at the open, worse than planned', () => {
  const s = openSetup(plan(), T0);
  const r = after(s, [[3720, 3722, 3715, 3718]]);
  assert.equal(r.setup.exit, 3720);
  assert.equal(r.setup.r, -1.5);
});

test('a target is a limit: filled at its price even when the market gaps past it', () => {
  const r = after(openSetup(plan(), T0), [[3780, 3785, 3779, 3781]]);
  assert.equal(r.setup.exit, 3772.5);
  assert.equal(r.setup.r, 2);
});

test('a buy limit fills at its price; on its fill bar the stop counts and the target does not', () => {
  const s = openSetup(checkPlan(plan({ kind: 'limit', entry: 3730, sl: 3720, tp: 3750 }), GOLD).plan, T0);
  assert.equal(s.status, 'pending');
  assert.equal(s.expires, T0 + 24 * 3600);
  let r = after(s, [[3735, 3736, 3731, 3733], [3733, 3752, 3729, 3751]]);
  assert.equal(r.setup.status, 'open', 'filled, and the target on the same bar is not counted');
  assert.equal(r.setup.fill, 3730);
  assert.deepEqual(r.events.map((e) => e.type), ['filled']);
  r = after(r.setup, [[3751, 3751, 3749, 3750]]);
  assert.equal(r.setup.status, 'won');
  assert.equal(r.setup.r, 2);
  r = after(s, [[3733, 3734, 3718, 3725]]);
  assert.deepEqual(r.events.map((e) => e.type), ['filled', 'sl'], 'filled and stopped on one bar');
  assert.equal(r.setup.r, -1);
});

test('a limit never fills better than its price, even on a gap', () => {
  const s = openSetup(checkPlan(plan({ kind: 'limit', entry: 3730, sl: 3720, tp: 3750 }), GOLD).plan, T0);
  const r = after(s, [[3726, 3728, 3725, 3727]]);
  assert.equal(r.setup.fill, 3730);
});

test('a buy stop that gaps through its entry fills at the open, and R counts from the fill', () => {
  const s = openSetup(checkPlan(plan({ kind: 'stop', entry: 3750, sl: 3740, tp: 3770 }), GOLD).plan, T0);
  let r = after(s, [[3748, 3749, 3745, 3746], [3753, 3755, 3752, 3754]]);
  assert.equal(r.setup.fill, 3753);
  r = after(r.setup, [[3754, 3771, 3753, 3770]]);
  assert.equal(r.setup.r, 1.7, '(3770 - 3753) / 10');
  const plain = after(s, [[3748, 3751, 3747, 3750]]);
  assert.equal(plain.setup.fill, 3750, 'no gap: filled at the entry');
});

test('sells mirror buys', () => {
  const s = openSetup(checkPlan(plan({ side: 'sell', kind: 'limit', entry: 3750, sl: 3760, tp: 3730 }), GOLD).plan, T0);
  let r = after(s, [[3745, 3751, 3744, 3749]]);
  assert.equal(r.setup.status, 'open');
  r = after(r.setup, [[3749, 3750, 3729, 3731]]);
  assert.equal(r.setup.status, 'won');
  assert.equal(r.setup.r, 2);
  const stopped = after(openSetup(checkPlan(plan({ side: 'sell', entry: 3742.5, sl: 3752.5, tp: 3722.5 }), GOLD).plan, T0), [[3743, 3755, 3741, 3754]]);
  assert.equal(stopped.setup.r, -1);
});

test('an order not filled by its time expires; bars still forming wait for the next check', () => {
  const s = openSetup(checkPlan(plan({ kind: 'limit', entry: 3730, sl: 3720, tp: 3750, expiry: 1 }), GOLD).plan, T0);
  const quiet = Array.from({ length: 61 }, () => [3740, 3741, 3739, 3740]);
  let r = after(s, quiet);
  assert.equal(r.setup.status, 'expired');
  assert.equal(r.setup.closed, s.expires);
  assert.deepEqual(r.events, [{ type: 'expired', at: s.expires }]);
  r = advanceSetup(s, bars(s.checked, [[3740, 3741, 3739, 3740], [3735, 3736, 3725, 3726]]), s.checked + 90);
  assert.equal(r.setup.status, 'pending', 'the second bar has not finished');
  assert.equal(r.setup.checked, s.checked + 60);
});

test('a pending order whose time ran out while the market was shut expires then', () => {
  const s = openSetup(checkPlan(plan({ kind: 'limit', entry: 3730, sl: 3720, tp: 3750, expiry: 4 }), GOLD).plan, T0);
  assert.deepEqual(expireIfDue(s, s.expires - 1).events, []);
  const r = expireIfDue(s, s.expires + 10);
  assert.equal(r.setup.status, 'expired');
  assert.equal(r.setup.closed, s.expires);
  assert.deepEqual(expireIfDue(openSetup(plan(), T0), T0 + 1e6).events, [], 'only pending orders expire');
});

test('coarser bars after a long gap include the one the last check fell inside', () => {
  const s = { ...openSetup(plan(), T0), checked: T0 + 7 * 60 };
  const r = advanceSetup(s, [bar(T0, 3742, 3745, 3740, 3744), bar(T0 + 900, 3744, 3746, 3720, 3721)], T0 + 1800, 900);
  assert.equal(r.setup.status, 'lost');
  assert.equal(r.setup.checked, T0 + 1800);
  const early = advanceSetup(s, [bar(T0 - 900, 3742, 3745, 3700, 3744)], T0 + 1800, 900);
  assert.equal(early.setup.status, 'open', 'a bar that ended before the check is skipped');
});

test('stops moved by hand: to breakeven is a scratch, trailed into profit is a win', () => {
  const s = openSetup(plan(), T0);
  const be = moveSetupStop(s, T0 + 120, s.fill);
  assert.deepEqual(be.events, [{ type: 'stop', at: T0 + 120, price: 3742.5 }]);
  let r = after(be.setup, [[3745, 3746, 3742, 3743]]);
  assert.equal(r.setup.reason, 'be');
  assert.equal(r.setup.status, 'scratch');
  assert.equal(r.setup.r, 0);
  const trail = moveSetupStop(s, T0 + 120, 3757.5).setup;
  r = after(trail, [[3760, 3761, 3756, 3757]]);
  assert.equal(r.setup.reason, 'trail');
  assert.equal(r.setup.status, 'won');
  assert.equal(r.setup.r, 1);
});

test('closing by hand scores the price given; cancelling is only for orders that never filled', () => {
  const s = openSetup(plan(), T0);
  const c = closeSetup(s, T0 + 600, 3750);
  assert.equal(c.setup.r, 0.5);
  assert.equal(c.setup.reason, 'manual');
  assert.equal(c.setup.status, 'won');
  const p = openSetup(checkPlan(plan({ kind: 'limit', entry: 3730, sl: 3720, tp: 3750 }), GOLD).plan, T0);
  assert.equal(cancelSetup(p, T0 + 60).setup.status, 'cancelled');
});

test('live R follows the price for open setups only', () => {
  const s = openSetup(plan(), T0);
  assert.equal(setupLiveR(s, 3750), 0.5);
  assert.equal(setupLiveR({ ...s, side: 'sell', sl: 3757.5, tp: 3712.5 }, 3735), 0.5);
  assert.equal(setupLiveR({ ...s, status: 'won' }, 3750), null);
  assert.equal(planR(s, 3727.5), -1);
});

// -------------------------------------------------------------- the record
test("Student's t: the table and the expansion beyond it agree", () => {
  assert.equal(t975(1), 12.706);
  assert.equal(t975(30), 2.042);
  assert.ok(Math.abs(t975(31) - 2.04) < 0.002);
  assert.ok(Math.abs(t975(120) - 1.98) < 0.002);
  assert.ok(Math.abs(t975(1e6) - 1.96) < 0.001);
});

test("Wilson's band for a proportion", () => {
  const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 0.002);
  assert.ok(near(wilsonBand(5, 10), [0.237, 0.763]));
  assert.ok(near(wilsonBand(0, 10), [0, 0.278]));
  assert.equal(wilsonBand(0, 0), null);
});

let seq = 0;
const closed = (r, extra = {}) => {
  seq += 1;
  const s = { ...openSetup(plan(extra.plan), T0 + seq * 3600), n: seq, tags: ['Sweep'], engine: { sessions: ['london'] } };
  const reason = r >= 2 ? 'tp' : r <= -1 ? 'sl' : 'manual';
  return { ...s, status: r > 0.05 ? 'won' : r < -0.05 ? 'lost' : 'scratch', closed: s.created + 1800, r, reason, ...extra };
};

test('results are judged after the assumed spread', () => {
  const s = closed(2);
  assert.equal(netR(s), 2 - 0.3 / 15);
  assert.equal(netR({ ...s, symbol: 'BTCUSD', entry: 64000, sl: 63000 }), 2 - 20 / 1000);
});

test('the record: counts, average, band and drawdown, in the order results closed', () => {
  const setups = [closed(2), closed(-1), closed(-1), closed(2), closed(0)];
  setups.push({ ...openSetup(plan(), T0), n: 99 });
  setups[0].closed = T0 + 1e6; // closed last, though logged first
  const st = recordStats(setups);
  assert.equal(st.setups, 6);
  assert.equal(st.open, 1);
  assert.equal(st.results, 5);
  assert.deepEqual([st.won, st.lost, st.scratch], [2, 2, 1]);
  const fee = 0.3 / 15;
  assert.ok(Math.abs(st.avg - (2 - fee * 5) / 5) < 1e-3);
  assert.equal(st.curve.length, 5);
  assert.equal(st.curve[4].n, setups[0].n);
  assert.equal(st.curve[1].band, null, 'no band from two results');
  assert.ok(st.curve[2].band[0] < st.curve[2].mean && st.curve[2].band[1] > st.curve[2].mean);
  assert.equal(st.verdict, 'collecting');
  assert.ok(Math.abs(st.drawdown - (2 + 2 * fee)) < 0.01, 'the two losses that came first');
  assert.deepEqual(st.targetFirst, { n: 4, hits: 2, band: wilsonBand(2, 4), noEdge: 0.333 });
  assert.deepEqual(st.byTag.map((g) => [g.key, g.n]), [['Sweep', 5]]);
  assert.deepEqual(st.bySession.map((g) => g.key), ['london']);
});

test('reasons group whatever their capitals', () => {
  const st = recordStats([closed(2, { tags: ['Sweep'] }), closed(-1, { tags: ['sweep', 'News'] })]);
  assert.deepEqual(st.byTag.map((g) => [g.key, g.n]), [['Sweep', 2], ['News', 1]]);
});

test('the verdict waits for 20 results, then asks whether the whole band clears zero', () => {
  const many = (rs) => recordStats(rs.map((r) => closed(r)));
  assert.equal(many(Array(19).fill(2)).verdict, 'collecting');
  assert.equal(many([...Array(12).fill(2), ...Array(8).fill(-1)]).verdict, 'ahead');
  assert.equal(many([...Array(2).fill(2), ...Array(18).fill(-1)]).verdict, 'behind');
  assert.equal(many([...Array(4).fill(2), ...Array(16).fill(-1)]).verdict, 'unclear', 'losing on average, but not by more than luck explains');
  assert.equal(many([...Array(7).fill(2), ...Array(13).fill(-1)]).verdict, 'unclear');
});

// A seeded random source, so the simulations below give the same answer every run.
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

test('with no edge, a record rarely looks like one: 2R trades won at their no-edge odds', () => {
  const random = rng(7);
  const verdicts = { ahead: 0, behind: 0, unclear: 0 };
  for (let k = 0; k < 400; k++) {
    const st = recordStats(Array.from({ length: 40 }, () => closed(random() < 1 / 3 ? 2 : -1)));
    verdicts[st.verdict] += 1;
  }
  assert.ok(verdicts.ahead / 400 < 0.03, `looked ahead ${verdicts.ahead} times in 400`);
  assert.ok(verdicts.unclear > 300, JSON.stringify(verdicts));
});

test('the band holds the true average about 95% of the time', () => {
  const random = rng(11);
  const truth = (0.45 * 2 - 0.55) - 0.3 / 15; // a real edge: 45% at 2R, after costs
  let inside = 0;
  for (let k = 0; k < 400; k++) {
    const st = recordStats(Array.from({ length: 60 }, () => closed(random() < 0.45 ? 2 : -1)));
    if (st.band[0] <= truth && truth <= st.band[1]) inside += 1;
  }
  assert.ok(inside / 400 > 0.92 && inside / 400 < 0.98, `${inside} of 400`);
});

test('posts carry the record in one line', () => {
  assert.equal(recordLine({ results: 0 }), 'The first result starts the record.');
  assert.equal(recordLine(recordStats([closed(2), closed(-1)])), `Record: 2 results · 1 won · 1 lost · average ${fmtR((1 - 0.04) / 2, 2)} after costs`);
  assert.equal(fmtR(-1), '−1.0R');
  assert.equal(fmtR(2), '+2.0R');
  assert.equal(fmtR(0), '0.0R');
  assert.equal(PLAYBOOK.firstRead, 20);
});
