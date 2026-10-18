// The Fast Lane · 3 · Recalculating. Night on the motorway, the sat nav says turn off in 200 m, and
// he misses the exit. It happens. RECALCULATING. You don't spin round on a motorway: no U-turns. The
// new route is two minutes longer, and he takes the next exit, signed NEXT SETUP. Missed the entry?
// Don't chase it: there's always another setup. Ever chased a trade you missed? Lo-fi at 84 bpm for a
// late drive, the cuts on its bars. The car is a cartoon prop, not a trading result. The base cut is
// for the TCP account; --variant=personal is the founder's own account. Notes: EPISODES.md.

const B = 60 / 84 * 4;
const T = { miss: B, recalc: 2 * B, uturn: 3 * B, next: 4 * B, take: 5 * B, face: 6 * B, ask: 7 * B, end: 8 * B };

const DRIVE = { arms: 'wheel', look: [1, 0.05], lid: 0.32, brow: [0, 0.1], mouth: { smile: 0 } };
const OOPS = { arms: 'wheel', look: [0.6, 0.15], lid: 0.2, brow: [0.5, 0.2], mouth: { smile: -0.1 } };
const CALM = { arms: 'wheel', look: [0.9, 0], lid: 0.3, brow: [0.1, 0.2], mouth: { smirk: 0.7, smile: 0.1 } };
const ASK = { arms: 'wheel', look: [-0.6, 0.05], lid: 0.26, brow: [0.5, 0.45], mouth: { smile: 0.15 } };
const P = (t, pose) => ({ t, pose });
const POSE = [P(0, DRIVE), P(T.recalc - 0.02, DRIVE), P(T.recalc, OOPS), P(T.recalc + 1.2, CALM), P(T.ask - 0.02, CALM), P(T.ask, ASK), P(T.end, ASK)];

const ROAD = [{ t: 0, speed: 64, bend: 0 }, { t: T.take, speed: 64, bend: 0 }, { t: T.take + 1.4, speed: 48, bend: -0.55 }, { t: T.face, speed: 44, bend: -0.6 }];
const DASH = [{ t: 0, speed: 64, fuel: 0.6 }, { t: T.take, speed: 64, fuel: 0.6 }, { t: T.end, speed: 44, fuel: 0.59 }];
const NAV = [[0, 'TURN OFF LEFT', 'in 200 m'], [T.miss + 2.1, 'RECALCULATING…', ''], [T.uturn + 0.8, 'NEW ROUTE', '+2 min · next exit'], [T.take + 1.6, 'ON ROUTE', '']];
const SIGNS = [
  { kind: 'exit', text: 'EXIT', side: -0.58, keys: [{ t: 0, z: 0.9 }, { t: T.miss, z: 0.62, ease: 'linear' }, { t: T.recalc, z: 0.02, ease: 'linear' }] },
  { kind: 'uturn', side: -0.58, keys: [{ t: T.uturn, z: 0.75 }, { t: T.next, z: 0.02, ease: 'linear' }] },
  { kind: 'exit', text: 'NEXT SETUP', side: -0.58, keys: [{ t: T.take, z: 0.8 }, { t: T.face, z: 0.05, ease: 'linear' }] },
];

const shot = (set, a, b, cam, more = {}) => ({ kind: 'toon', set, from: a, to: b, cam, pose: POSE, road: ROAD, dash: DASH, nav: NAV, sign: SIGNS, flow: [{ t: 0, k: 0.8 }], fi: 0.01, fo: 0.01, ...more });
const POV = (a, b) => shot('road', a, b, [{ t: a, s: 1.0, x: 540, y: 960 }, { t: b, s: 1.04, x: 540, y: 950, ease: 'linear' }]);
const WHEEL = (a, b) => shot('driver', a, b, [{ t: a, s: 1.5, x: 530, y: 740 }, { t: b, s: 1.56, x: 532, y: 736, ease: 'linear' }], { dof: { bg: 3 } });
const FACE = (a, b) => shot('driver', a, b, [{ t: a, s: 2.05, x: 372, y: 880 }, { t: b, s: 2.18, x: 372, y: 874, ease: 'linear' }], { dof: { bg: 6 }, screen: false });
const LINE = (text, a, b, more = {}) => ({ kind: 'caption', from: a, to: b, y: 300, text, fi: 0.01, fo: 0.01, ...more });

const SPEC = {
  title: 'The Fast Lane · 3 · Recalculating',
  outfit: 'lv-varsity',
  modules: ['toon/founder.js', 'toon/toon.js', 'toon/fastlane.js'],
  duration: T.end + 2.4,
  cover: 0.9,
  style: 'lofi',
  bpm: 84,
  seed: 103,
  sound: false,
  sfx: true,
  scenes: [
    // 1 · the hook: the sat nav says turn off
    WHEEL(0, T.miss),
    { id: 'kicker', kind: 'kicker', from: -0.5, to: T.miss, y: 250, text: 'The Fast Lane · 3', fi: 0.01 },
    { id: 'hook', kind: 'caption', from: -0.5, to: T.miss, y: 300, text: 'you miss\nyour *exit.*', sfx: false, fi: 0.01 },
    // 2 · the exit goes by
    POV(T.miss, T.recalc),
    LINE('it happens.', T.miss + 0.2, T.recalc),
    // 3 · recalculating
    WHEEL(T.recalc, T.uturn),
    LINE('you don’t spin round\non the *motorway.*', T.recalc + 0.1, T.uturn),
    // 4 · no U-turns; the new route
    POV(T.uturn, T.next),
    LINE('no U-turns.', T.uturn + 0.1, T.uturn + 1.4),
    LINE('+2 minutes.\nthat’s all.', T.uturn + 1.4, T.next),
    // 5 · the next exit
    FACE(T.next, T.take),
    LINE('you take\nthe *next exit.*', T.next + 0.1, T.take),
    POV(T.take, T.face),
    LINE('missed the entry?\ndon’t *chase* it.', T.take + 0.1, T.face),
    // 6 · the lesson
    FACE(T.face, T.ask),
    LINE('there’s always\n*another* setup.', T.face + 0.1, T.ask),
    WHEEL(T.ask, T.end),
    LINE('ever chased a trade\nyou missed?', T.ask + 0.1, T.end),
    // 7 · the end card: one ask
    { id: 'end', kind: 'end', from: T.end, to: T.end + 2.4, cta: 'Follow TCP', sub: 'One lesson an episode.', fo: 0.01,
      risk: 'Education, not financial advice. Trading carries risk.\nA cartoon car, not a trading result.' },
  ],
  cues: [
    { t: 0.4, sfx: 'gps' },
    { t: T.miss + 2.1, sfx: 'gps' },
    { t: T.uturn + 0.8, sfx: 'ding' },
    { t: T.take + 0.3, sfx: 'indicator' },
  ],
  variants: {
    personal: {
      bug: false,
      scenes: { kicker: null, end: { cta: 'Follow for the next one', sub: 'There’s always another setup.' } },
    },
  },
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
