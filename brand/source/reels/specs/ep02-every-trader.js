// EP02 · Every Trader Has Done This. The founder, animated, chases a breakout, calls the reversal a
// fakeout, flips, and is stopped out again; the replay shows what was really happening (the trap, the
// structure turning, the pullback), then the Quant Terminal on his phone. No voice: the jokes are
// in the timing, so the cuts sit on a 120 bpm grid (a beat is 0.5 s) and the music drops out on both
// stop-outs. The base cut is for the TCP account; --variant=personal is the founder's own account.
// The chart is an example (labelled on it), not a market's history. Production notes:
// brand/video/reels/EPISODES.md.

// The story's moments, in seconds.
const T = { buy: 3.45, stop1: 4.3, sell: 7.45, stop2: 8.6, replay: 12, end: 23.8 };

// One pose track for every shot, so a cut never changes what he's doing.
const AT_SCREEN = { arms: 'desk', lean: 3, look: [1, 0.25], lid: 0.22, brow: [-0.5, -0.4], mouth: { smile: -0.3 }, head: { rot: 3 } };
const P = (t, pose, ease) => ({ t, pose, ease });
const POSE = [
  P(0, AT_SCREEN),
  P(1.8, { ...AT_SCREEN, lean: 4.5, head: { rot: 4.5, dx: 5 } }),
  P(3.1, { ...AT_SCREEN, lean: 4.5, head: { rot: 4.5, dx: 5 } }),
  P(3.15, { ...AT_SCREEN, lean: 4.5, head: { rot: 4.5, dx: 5 }, hand: { click: 1 } }),
  P(3.32, { ...AT_SCREEN, lean: 4.5, head: { rot: 4.5, dx: 5 } }),
  // stopped out: frozen, then the side-eye to camera
  P(4.6, { arms: 'desk', lean: 2, look: [0.9, 0.2], lid: 0.42, mouth: { smile: -0.15 } }),
  P(5.0, { arms: 'desk', lean: 2, look: [0.9, 0.2], lid: 0.42, mouth: { smile: -0.15 } }),
  P(5.3, { arms: 'desk', lean: 2, look: [-1, 0.08], lid: 0.46, brow: [0.25, -0.2], mouth: { smile: -0.25 } }),
  P(5.98, { arms: 'desk', lean: 2, look: [-1, 0.08], lid: 0.46, brow: [0.25, -0.2], mouth: { smile: -0.25 } }),
  // back in: the sell
  P(6.0, AT_SCREEN),
  P(7.1, { ...AT_SCREEN, lean: 4 }),
  P(7.15, { ...AT_SCREEN, lean: 4, hand: { click: 1 } }),
  P(7.32, { ...AT_SCREEN, lean: 4 }),
  P(8.88, { ...AT_SCREEN, lean: 4 }),
  // stopped out again: disbelief
  P(8.9, { arms: 'desk', lean: 0, wide: 1, lid: 0, brow: [1, 1], mouth: { open: 0.32 }, look: [0.9, 0.12], head: { rot: -2 } }),
  P(9.98, { arms: 'desk', lean: -1, wide: 1, lid: 0, brow: [1, 0.9], mouth: { open: 0.26 }, look: [0.9, 0.12], head: { rot: -3 } }),
  // leans back, arms folded: what actually happened?
  P(10.0, { arms: 'fold', lean: -3, look: [0.8, 0.2], lid: 0.42, brow: [0.1, 0.45], mouth: { smile: -0.25 } }),
  P(11.9, { arms: 'fold', lean: -3.5, look: [0.85, 0.22], lid: 0.38, brow: [0.2, 0.5], mouth: { smile: -0.25 }, head: { rot: 2 } }),
  // he sees it: a small smirk and a nod
  P(18.4, { arms: 'fold', lean: -2, look: [0.6, 0.05], lid: 0.32, brow: [0, 0.35], mouth: { smirk: 0.2, smile: 0 } }),
  P(18.8, { arms: 'fold', lean: -2, look: [0.6, 0.05], lid: 0.3, brow: [0, 0.35], mouth: { smirk: 1, smile: 0.1 } }),
  P(19.1, { arms: 'fold', lean: -2, look: [0.6, 0.05], lid: 0.3, brow: [0, 0.35], mouth: { smirk: 1, smile: 0.1 }, head: { rot: 4 } }),
  P(19.4, { arms: 'fold', lean: -2, look: [0.6, 0.05], lid: 0.3, brow: [0, 0.35], mouth: { smirk: 1, smile: 0.1 }, head: { rot: 0 } }),
];

// One chart track for every shot: candles shown (i, or a named moment), the replay's notes and badge.
const C = (t, i, more, ease) => ({ t, i, ...more, ease });
const CHART = [
  C(0, 21.2), C(1.95, 23.3), C(3.0, 24.55), C(T.buy, 'buy'), C(3.9, 24.98), C(T.stop1, 'stop1', {}, 'linear'), C(4.6, 25.97),
  C(6.0, 26.2), C(7.0, 33.45), C(T.sell, 'sell'), C(8.15, 34.97), C(T.stop2, 'stop2', {}, 'linear'), C(8.9, 35.97),
  // the replay: rewind, play the trades back, then each note as its candle prints
  C(T.replay, 35.97, { replay: 1 }), C(12.15, 35.97, { replay: 1 }), C(12.65, 21, { replay: 1 }),
  C(13.6, 35.97, { replay: 1 }), C(13.9, 35.97, { replay: 1, notes: 1, dim: 0.5 }),
  C(14.8, 38.97, { replay: 1, notes: 1, dim: 0.5 }), C(15.1, 38.97, { replay: 1, notes: 2, dim: 0.5 }),
  C(16.0, 41.97, { replay: 1, notes: 2, dim: 0.5 }), C(16.3, 41.97, { replay: 1, notes: 3, dim: 0.5 }),
  C(17.0, 41.97, { replay: 1, notes: 3, dim: 0.5 }), C(18.4, 56, { replay: 1, notes: 3, dim: 0.5 }),
];

const MS = [{ t: 0, s: 1.0, x: 540, y: 960 }];
const shot = (set, from, to, cam, more = {}) => ({ kind: 'toon', set, from, to, cam, pose: POSE, chart: CHART, fi: 0.01, fo: 0.01, ...more });

const SPEC = {
  title: 'EP02 · Every Trader Has Done This',
  modules: ['toon/founder.js', 'toon/toon.js'],
  duration: 26.6,
  cover: 0.9,
  style: 'drive',
  bpm: 120,
  seed: 22,
  sound: false,
  sfx: true,
  scenes: [
    // 1 · the hook: his eyes on the screen, then the desk; one more breakout
    shot('desk', 0, 1.0, [{ t: 0, s: 2.0, x: 420, y: 930 }, { t: 1.0, s: 2.1, x: 425, y: 925, ease: 'linear' }], { dof: { bg: 7 } }),
    shot('desk', 1.0, 2.0, [{ t: 1.0, s: 1.0, x: 540, y: 960 }, { t: 2.0, s: 1.06, x: 530, y: 940, ease: 'linear' }]),
    // the hook is on screen from the very first frame (what a scrolling viewer sees)
    { id: 'kicker', kind: 'kicker', from: -0.5, to: 2.0, y: 250, text: 'Every trader has done this', fi: 0.01 },
    { id: 'hook', kind: 'caption', from: -0.5, to: 2.0, y: 300, text: 'just one more\nbreakout…', sfx: false, fi: 0.01 },
    // 2 · the breakout, the click, the buy, the slam
    shot('ots', 2.0, 3.0, [{ t: 2.0, s: 1.04, x: 540, y: 900 }, { t: 3.0, s: 1.1, x: 560, y: 890, ease: 'linear' }]),
    shot('mouse', 3.0, 3.4, [{ t: 3.0, s: 1.0, x: 560, y: 1080 }, { t: 3.4, s: 1.06, x: 580, y: 1080 }]),
    shot('ots', 3.4, 4.6, [{ t: 3.4, s: 1.14, x: 560, y: 870 }, { t: 4.6, s: 1.22, x: 560, y: 880, ease: 'linear' }], { hits: [T.stop1] }),
    // 3 · fakeout
    shot('desk', 4.6, 6.0, [{ t: 4.6, s: 2.05, x: 410, y: 900 }, { t: 6.0, s: 2.25, x: 410, y: 890, ease: 'linear' }], { dof: { bg: 7 } }),
    { kind: 'caption', from: 5.1, to: 6.0, y: 300, text: 'fakeout.', fi: 0.01, fo: 0.01 },
    // 4 · so he flips it
    shot('ots', 6.0, 7.0, [{ t: 6.0, s: 1.04, x: 540, y: 900 }, { t: 7.0, s: 1.1, x: 540, y: 920, ease: 'linear' }]),
    { kind: 'caption', from: 6.1, to: 8.9, y: 300, text: 'so I flipped it.', fi: 0.01, fo: 0.01 },
    shot('mouse', 7.0, 7.4, [{ t: 7.0, s: 1.0, x: 560, y: 1080 }, { t: 7.4, s: 1.06, x: 580, y: 1080 }]),
    shot('ots', 7.4, 8.9, [{ t: 7.4, s: 1.12, x: 560, y: 940 }, { t: 8.9, s: 1.22, x: 580, y: 960, ease: 'linear' }], { hits: [T.stop2] }),
    // 5 · twice
    shot('desk', 8.9, 10.0, [{ t: 8.9, s: 2.0, x: 390, y: 900 }, { t: 10.0, s: 2.3, x: 390, y: 890, ease: 'linear' }], { dof: { bg: 7 } }),
    { kind: 'caption', from: 9.15, to: 10.0, y: 300, text: 'twice.', fi: 0.01, fo: 0.01 },
    // 6 · leans back: what actually happened?
    shot('desk', 10.0, 12.0, [{ t: 10.0, s: 1.15, x: 480, y: 1000 }, { t: 12.0, s: 1.28, x: 450, y: 990, ease: 'linear' }], { dof: { bg: 2 } }),
    { kind: 'caption', from: 10.25, to: 12.0, y: 300, text: 'ok. what actually\nhappened?', fi: 0.01, fo: 0.01 },
    // 7 · the replay: the camera follows the story along the chart; each note as its mark appears
    shot('screen', T.replay, 18.4, [
      { t: 12, s: 1.0, x: 900, y: 960 }, { t: 12.65, s: 1.0, x: 800, y: 960 }, { t: 13.6, s: 1.0, x: 975, y: 960 },
      { t: 14.8, s: 1.0, x: 990, y: 960 }, { t: 15.3, s: 1.0, x: 1040, y: 960 }, { t: 16.0, s: 1.0, x: 1080, y: 960 }, { t: 16.5, s: 1.0, x: 1120, y: 960 },
      { t: 17.0, s: 1.0, x: 1130, y: 960 }, { t: 18.4, s: 0.82, x: 1180, y: 960 }]),
    { kind: 'caption', style: 'note', num: 1, text: 'THE TRAP', sub: 'both of those trades', from: 13.9, to: 15.1, y: 240, sfx: false, fi: 0.01, fo: 0.1 },
    { kind: 'caption', style: 'note', num: 2, text: 'STRUCTURE TURNS', sub: 'a higher high', from: 15.1, to: 16.3, y: 240, sfx: false, fi: 0.01, fo: 0.1 },
    { kind: 'caption', style: 'note', num: 3, text: 'THE PULLBACK', sub: 'then you get in', from: 16.3, to: 17.2, y: 240, sfx: false, fi: 0.01, fo: 0.1 },
    { kind: 'caption', style: 'steps', text: 'trap → structure → pullback', from: 17.2, to: 18.4, y: 290, sfx: false, fi: 0.01, fo: 0.01 },
    // 8 · he sees it
    shot('desk', 18.4, 19.8, [{ t: 18.4, s: 2.0, x: 370, y: 900 }, { t: 19.8, s: 2.15, x: 370, y: 900, ease: 'linear' }], { dof: { bg: 7 } }),
    // 9 · the Quant Terminal on his phone, the room behind
    shot('desk', 19.8, T.end, [{ t: 19.8, s: 1.1, x: 540, y: 960 }], { dof: { bg: 18, all: 16 } }),
    {
      kind: 'handPhone', from: 19.8, to: T.end, tag: 'DEMO PRICES', fi: 0.25,
      shots: [{ shot: 'markets', from: 19.8, u0: 2.4 }],
      pose: [{ t: 19.8, x: 560, y: 1240, s: 0.84, rx: 14, ry: -10, rz: 3 }, { t: 20.4, x: 560, y: 1110, s: 0.9, rx: 6, ry: -6, rz: 1 }, { t: T.end, x: 556, y: 1090, s: 0.94, rx: 4, ry: 4, rz: 0 }],
    },
    { kind: 'caption', from: 20.0, to: 21.9, y: 230, size: 56, text: 'traps get set at the levels\neveryone watches.', fi: 0.01, fo: 0.15 },
    { kind: 'caption', from: 21.9, to: T.end, y: 230, size: 56, text: 'the *Quant Terminal*\nmarks them for me.', fi: 0.01, fo: 0.2 },
    // 10 · the end card: one ask
    { id: 'end', kind: 'end', from: T.end, to: 26.6, cta: 'Follow TCP', sub: 'The Quant Terminal, inside Telegram.', fo: 0.01,
      risk: 'Education, not financial advice. Trading carries risk.\nExample chart, not real trades. App shown with demo prices.' },
  ],
  cues: [
    { t: 3.15, sfx: 'click' }, { t: 7.15, sfx: 'click' },
    { t: T.stop1 + 0.04, sfx: 'mute', until: 6.0 }, { t: T.stop2 + 0.04, sfx: 'mute', until: 10.0 },
    { t: 12.12, sfx: 'whoosh' }, { t: 13.9, sfx: 'pop' }, { t: 15.1, sfx: 'pop' }, { t: 16.3, sfx: 'pop' }, { t: 17.0, sfx: 'rise' },
  ],
  variants: {
    // the founder's own account: no series title or bug, and a follow for him
    personal: {
      bug: false,
      scenes: {
        kicker: null,
        end: { cta: 'Follow for the next one', sub: 'Every trader has done this.' },
      },
    },
  },
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
