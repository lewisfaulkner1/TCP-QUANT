// EP14 · POV: You Finally Stop Chasing Candles. EP02's mistake, avoided: a breakout runs and the
// founder doesn't click. It tops out (that would've been him) and keeps falling (still not in), then
// turns; he takes the pullback and lets price come to him. No result is shown. No voice: the cuts sit
// on a 120 bpm grid. The base cut is for the TCP account; --variant=personal is the founder's own
// account. The chart is EP08's example chart with no indicators and no trades on it (labelled
// example). Production notes: brand/video/reels/EPISODES.md.

// The story's moments, in seconds.
const T = { tempt: 2.0, hold: 3.0, rev: 3.5, relief: 4.6, fake: 6.0, still: 8.0, back: 9.5, click: 12.0, calm: 12.5, smirk: 14.5, end: 16.0 };

const AT_SCREEN = { arms: 'desk', lean: 3, look: [1, 0.25], lid: 0.22, brow: [-0.5, -0.4], mouth: { smile: -0.3 }, head: { rot: 3 } };
const TEMPT = { arms: 'desk', lean: 4.5, look: [1, 0.22], lid: 0.45, brow: [-0.6, -0.5], mouth: { smile: -0.1 }, head: { rot: 4.5, dx: 6 } };
const RELIEF = { arms: 'desk', lean: 1, look: [1, 0.25], lid: 0.2, brow: [0.55, 0.65], mouth: { smile: 0.2 } };
const SMUG = { arms: 'desk', lean: 2, look: [-1, 0.08], lid: 0.4, brow: [0.3, 0.05], mouth: { smirk: 0.7, smile: 0.05 } };
const CALM = { arms: 'desk', lean: 1.5, look: [1, 0.25], lid: 0.28, brow: [0, 0.15], mouth: { smile: 0.1 } };
const SMIRK = { arms: 'fold', lean: -2, look: [0.6, 0.05], lid: 0.3, brow: [0, 0.35], mouth: { smirk: 1, smile: 0.1 } };
const P = (t, pose, ease) => ({ t, pose, ease });
const POSE = [
  P(0, AT_SCREEN), P(1.98, AT_SCREEN),
  P(T.tempt, TEMPT), P(4.58, TEMPT),
  P(T.relief, RELIEF), P(5.98, RELIEF),
  P(T.fake, AT_SCREEN), P(7.98, AT_SCREEN),
  P(T.still, SMUG), P(9.48, SMUG),
  P(T.back, AT_SCREEN), P(12.1, AT_SCREEN), P(12.15, { ...AT_SCREEN, hand: { click: 1 } }), P(12.32, AT_SCREEN),
  P(T.calm, CALM), P(14.48, CALM),
  P(T.smirk, SMIRK), P(14.9, { ...SMIRK, head: { rot: 4 } }), P(15.3, { ...SMIRK, head: { rot: 0 } }),
];

// EP08's clean chart, candles printing: the run to the high, the drop, the turn.
const C = (t, i, ease) => ({ t, story: 'clutter', i, ind: 0, ease });
const CHART = [
  C(0, 38.2), C(T.tempt, 44.6, 'linear'), C(T.rev, 45.3), C(T.relief, 48.2, 'linear'),
  C(T.fake, 48.4), C(T.still, 51.6, 'linear'), C(T.back, 51.8), C(T.click, 55.6, 'linear'), C(T.end, 58.4, 'linear'),
];

const shot = (set, from, to, cam, more = {}) => ({ kind: 'toon', set, from, to, cam, pose: POSE, chart: CHART, fi: 0.01, fo: 0.01, ...more });
const FACE = { dof: { bg: 7 } };

const SPEC = {
  title: 'EP14 · POV: You Finally Stop Chasing Candles',
  modules: ['toon/founder.js', 'toon/toon.js'],
  duration: 18.8,
  cover: 0.9,
  style: 'drive',
  bpm: 120,
  seed: 14,
  sound: false,
  sfx: true,
  scenes: [
    // 1 · the hook: the breakout, over his shoulder
    shot('ots', 0, T.tempt, [{ t: 0, s: 1.04, x: 540, y: 900 }, { t: T.tempt, s: 1.12, x: 560, y: 890, ease: 'linear' }]),
    { id: 'kicker', kind: 'kicker', from: -0.5, to: T.tempt, y: 250, text: 'Every trader… part 2', fi: 0.01 },
    { id: 'hook', kind: 'caption', from: -0.5, to: T.tempt, y: 300, text: 'POV: you finally\nstop chasing candles.', sfx: false, fi: 0.01 },
    // 2 · tempted; the hand on the mouse stays still
    shot('desk', T.tempt, T.hold, [{ t: T.tempt, s: 2.05, x: 410, y: 900 }, { t: T.hold, s: 2.2, x: 412, y: 896, ease: 'linear' }], FACE),
    { kind: 'caption', from: T.tempt + 0.1, to: T.hold, y: 300, text: 'it’s breaking out…', fi: 0.01, fo: 0.01 },
    shot('mouse', T.hold, T.rev, [{ t: T.hold, s: 1.0, x: 560, y: 1080 }, { t: T.rev, s: 1.04, x: 570, y: 1080 }]),
    { kind: 'caption', from: T.hold, to: T.relief, y: 300, text: '…and I don’t click.', fi: 0.01, fo: 0.01 },
    // 3 · it reverses
    shot('ots', T.rev, T.relief, [{ t: T.rev, s: 1.14, x: 560, y: 870 }, { t: T.relief, s: 1.22, x: 560, y: 880, ease: 'linear' }]),
    shot('desk', T.relief, T.fake, [{ t: T.relief, s: 2.05, x: 410, y: 900 }, { t: T.fake, s: 2.25, x: 410, y: 890, ease: 'linear' }], FACE),
    { kind: 'caption', from: T.relief + 0.1, to: T.fake, y: 300, text: 'that would’ve been me.', fi: 0.01, fo: 0.01 },
    // 4 · then it fakes the other way
    shot('ots', T.fake, T.still, [{ t: T.fake, s: 1.04, x: 540, y: 900 }, { t: T.still, s: 1.12, x: 560, y: 930, ease: 'linear' }]),
    { kind: 'caption', from: T.fake + 0.05, to: T.still, y: 300, text: 'and keeps going.', fi: 0.01, fo: 0.01 },
    shot('desk', T.still, T.back, [{ t: T.still, s: 2.05, x: 400, y: 900 }, { t: T.back, s: 2.25, x: 400, y: 892, ease: 'linear' }], FACE),
    { kind: 'caption', from: T.still + 0.1, to: T.back, y: 300, text: 'still not in.', fi: 0.01, fo: 0.01 },
    // 5 · it comes back; the pullback, the click
    shot('ots', T.back, T.click, [{ t: T.back, s: 1.06, x: 560, y: 900 }, { t: T.click, s: 1.16, x: 590, y: 890, ease: 'linear' }]),
    { kind: 'caption', from: T.back + 0.05, to: T.click, y: 300, text: 'then it turns.', fi: 0.01, fo: 0.01 },
    shot('mouse', T.click, T.calm, [{ t: T.click, s: 1.0, x: 560, y: 1080 }, { t: T.calm, s: 1.06, x: 580, y: 1080 }]),
    shot('desk', T.calm, T.smirk, [{ t: T.calm, s: 1.15, x: 500, y: 1000 }, { t: T.smirk, s: 1.24, x: 492, y: 990, ease: 'linear' }], { dof: { bg: 2 } }),
    { kind: 'caption', from: T.calm + 0.05, to: T.smirk, y: 300, text: 'now I let price\ncome to me.', fi: 0.01, fo: 0.01 },
    shot('desk', T.smirk, T.end, [{ t: T.smirk, s: 2.0, x: 370, y: 900 }, { t: T.end, s: 2.12, x: 370, y: 900, ease: 'linear' }], FACE),
    { kind: 'caption', style: 'steps', text: 'trap → structure → pullback', from: T.smirk + 0.05, to: T.end, y: 290, sfx: false, fi: 0.01, fo: 0.01 },
    // 6 · the end card: one ask
    { id: 'end', kind: 'end', from: T.end, to: 18.8, cta: 'Follow TCP', sub: 'One lesson an episode.', fo: 0.01,
      risk: 'Education, not financial advice. Trading carries risk.\nExample chart, not real trades.' },
  ],
  cues: [
    { t: T.rev + 0.3, sfx: 'mute', until: T.fake },
    { t: T.click + 0.15, sfx: 'click' },
    { t: T.smirk, sfx: 'rise' },
    { t: T.end, sfx: 'whoosh' },
  ],
  variants: {
    // the founder's own account: no series title or bug, and a follow for him
    personal: {
      bug: false,
      scenes: {
        kicker: null,
        end: { cta: 'Follow for the next one', sub: 'Every trader has done this. Part 2.' },
      },
    },
  },
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
