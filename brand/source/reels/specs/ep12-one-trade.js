// EP12 · One Trade Is Not a Personality Test. One trade closes at the stop and the founder spirals:
// terrible trader, broken strategy, time to quit. Then: it was 1 trade. A loss is a cost, not a
// verdict; judge the next 100, not the last 1. No voice: the cuts sit on a 120 bpm grid and the music
// drops out for the turn. The base cut is for the TCP account; --variant=personal is the founder's
// own account. The chart on his monitor is EP02's example chart (labelled on it). No results are
// shown. Production notes: brand/video/reels/EPISODES.md.

// The story's moments, in seconds.
const T = { hit: 0.3, shock: 2.0, doom: 3.5, broken: 5.0, quit: 6.5, eye: 8.0, one: 9.5, hundred: 11.5, cost: 14.5, smirk: 17.0, end: 18.5 };

// One pose track for every shot, so a cut never changes what he's doing.
const PHONE = { arms: 'phone', lean: 1, look: [0.3, 0.7], lid: 0.3, brow: [-0.2, -0.1], mouth: { smile: -0.2 } };
const SHOCK = { arms: 'phone', lean: 0, look: [0.3, 0.65], wide: 1, lid: 0, brow: [1, 1], mouth: { open: 0.3 } };
const DOOM = { arms: 'phone', lean: -1, look: [0.3, 0.55], lid: 0.22, brow: [0.85, 0.8], mouth: { smile: -0.6 }, head: { rot: -2 } };
const BROKEN = { arms: 'desk', lean: 3, look: [1, 0.25], lid: 0.3, brow: [0.6, 0.5], mouth: { smile: -0.5 }, head: { rot: 3 } };
const QUIT = { arms: 'rest', lean: -2, look: [0.3, 0.85], lid: 0.55, brow: [0.75, 0.7], mouth: { smile: -0.55 }, head: { rot: -4 } };
const SIDE_EYE = { arms: 'rest', lean: -1, look: [-1, 0.08], lid: 0.46, brow: [0.25, -0.2], mouth: { smile: -0.25 } };
const FOLD = { arms: 'fold', lean: -3, look: [0.8, 0.2], lid: 0.42, brow: [0.1, 0.45], mouth: { smile: -0.25 } };
const CALM = { arms: 'fold', lean: -2.5, look: [0.75, 0.15], lid: 0.32, brow: [0, 0.2], mouth: { smile: 0.05 } };
const SMIRK = { arms: 'fold', lean: -2, look: [0.6, 0.05], lid: 0.3, brow: [0, 0.35], mouth: { smirk: 1, smile: 0.1 } };
const P = (t, pose, ease) => ({ t, pose, ease });
const POSE = [
  P(0, PHONE), P(0.28, PHONE),
  P(0.45, { ...PHONE, lid: 0.1, brow: [0.4, 0.5], mouth: { open: 0.1 } }), P(1.98, { ...PHONE, lid: 0.15, brow: [0.3, 0.4] }),
  P(T.shock, SHOCK), P(3.48, SHOCK),
  P(T.doom, DOOM), P(4.98, DOOM),
  P(T.broken, BROKEN), P(6.48, BROKEN),
  P(T.quit, QUIT), P(7.98, QUIT),
  // the turn: the side-eye to camera, in silence
  P(T.eye, SIDE_EYE), P(9.48, SIDE_EYE),
  P(T.one, FOLD), P(11.48, FOLD),
  P(T.hundred, CALM), P(16.98, CALM),
  P(T.smirk, SMIRK), P(17.4, { ...SMIRK, head: { rot: 4 } }), P(17.8, { ...SMIRK, head: { rot: 0 } }),
];

// EP02's example chart on his monitor, after his breakout buy was stopped out.
const CHART = [{ t: 0, i: 25.97 }];

const shot = (set, from, to, cam, more = {}) => ({ kind: 'toon', set, from, to, cam, pose: POSE, chart: CHART, fi: 0.01, fo: 0.01, ...more });
const FACE = { dof: { bg: 7 } };

const SPEC = {
  title: 'EP12 · One Trade Is Not a Personality Test',
  modules: ['toon/founder.js', 'toon/toon.js'],
  duration: 21.3,
  cover: 0.9,
  style: 'drive',
  bpm: 120,
  seed: 12,
  sound: false,
  sfx: true,
  scenes: [
    // 1 · the hook: the notification on his phone
    shot('desk', 0, T.shock, [{ t: 0, s: 1.15, x: 500, y: 1000 }, { t: T.shock, s: 1.24, x: 495, y: 990, ease: 'linear' }], { dof: { bg: 2 } }),
    { id: 'kicker', kind: 'kicker', from: -0.5, to: T.shock, y: 250, text: 'One trade is not a personality test', fi: 0.01 },
    { id: 'hook', kind: 'caption', from: -0.5, to: T.shock, y: 300, text: 'lost 1 trade.', sfx: false, fi: 0.01 },
    { kind: 'caption', style: 'note', num: '!', text: 'TRADE CLOSED', sub: 'stop loss hit · −1R', from: T.hit, to: T.shock, y: 420, sfx: false, fi: 0.08, fo: 0.01 },
    // 2 · the spiral
    shot('desk', T.shock, T.doom, [{ t: T.shock, s: 2.05, x: 410, y: 900 }, { t: T.doom, s: 2.2, x: 412, y: 896, ease: 'linear' }], FACE),
    { kind: 'caption', from: T.shock + 0.1, to: T.doom, y: 300, text: 'so obviously…', fi: 0.01, fo: 0.01 },
    shot('desk', T.doom, T.broken, [{ t: T.doom, s: 2.3, x: 405, y: 900 }, { t: T.broken, s: 2.45, x: 405, y: 895, ease: 'linear' }], FACE),
    { kind: 'caption', from: T.doom + 0.05, to: T.broken, y: 300, text: 'I’m a terrible trader.', fi: 0.01, fo: 0.01 },
    shot('desk', T.broken, T.quit, [{ t: T.broken, s: 1.0, x: 540, y: 960 }, { t: T.quit, s: 1.08, x: 545, y: 950, ease: 'linear' }]),
    { kind: 'caption', from: T.broken + 0.05, to: T.quit, y: 300, text: 'my strategy’s broken.', fi: 0.01, fo: 0.01 },
    shot('desk', T.quit, T.eye, [{ t: T.quit, s: 2.1, x: 405, y: 905 }, { t: T.eye, s: 2.3, x: 405, y: 900, ease: 'linear' }], FACE),
    { kind: 'caption', from: T.quit + 0.05, to: T.eye, y: 300, text: 'I should quit.', fi: 0.01, fo: 0.01 },
    // 3 · the turn
    shot('desk', T.eye, T.one, [{ t: T.eye, s: 2.05, x: 400, y: 900 }, { t: T.one, s: 2.25, x: 400, y: 892, ease: 'linear' }], FACE),
    shot('desk', T.one, T.hundred, [{ t: T.one, s: 1.15, x: 480, y: 1000 }, { t: T.hundred, s: 1.28, x: 450, y: 990, ease: 'linear' }], { dof: { bg: 2 } }),
    { kind: 'caption', from: T.one + 0.1, to: T.hundred, y: 300, text: 'it was 1 trade.', fi: 0.01, fo: 0.01 },
    // 4 · the lesson
    shot('desk', T.hundred, T.smirk, [{ t: T.hundred, s: 1.0, x: 540, y: 960 }, { t: T.smirk, s: 1.14, x: 528, y: 945, ease: 'linear' }]),
    { kind: 'caption', style: 'note', num: '1', text: 'TRADE 1 OF 100', sub: 'the other 99 haven’t happened yet', from: T.hundred + 0.05, to: T.cost, y: 260, fi: 0.08, fo: 0.01 },
    { kind: 'caption', from: T.cost, to: T.smirk, y: 300, text: 'a loss is a cost.\nnot a verdict.', fi: 0.01, fo: 0.01 },
    shot('desk', T.smirk, T.end, [{ t: T.smirk, s: 2.0, x: 370, y: 900 }, { t: T.end, s: 2.12, x: 370, y: 900, ease: 'linear' }], FACE),
    { kind: 'caption', style: 'steps', text: 'judge the 100 · not the 1', from: T.smirk + 0.05, to: T.end, y: 290, sfx: false, fi: 0.01, fo: 0.01 },
    // 5 · the end card: one ask
    { id: 'end', kind: 'end', from: T.end, to: 21.3, cta: 'Follow TCP', sub: 'One lesson an episode.', fo: 0.01,
      risk: 'Education, not financial advice. Trading carries risk.\nExample chart, not real trades.' },
  ],
  cues: [
    { t: T.hit + 0.02, sfx: 'pop' },
    { t: T.eye - 0.02, sfx: 'mute', until: T.one },
    { t: T.one, sfx: 'whoosh' },
    { t: T.smirk, sfx: 'rise' },
    { t: T.end, sfx: 'whoosh' },
  ],
  variants: {
    // the founder's own account: no series title or bug, and a follow for him
    personal: {
      bug: false,
      scenes: {
        kicker: null,
        end: { cta: 'Follow for the next one', sub: 'One trade is not a personality test.' },
      },
    },
  },
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
