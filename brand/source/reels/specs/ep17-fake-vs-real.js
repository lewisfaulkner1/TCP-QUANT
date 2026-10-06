// EP17 · Fake Trader vs Real Trader. The founder plays both, four quick pairs: 27 indicators or 1 plan;
// chases the breakout or waits for the pullback; posts the wins or logs every trade; blames the market
// or checks the plan. The difference happens before the entry. No voice: the cuts sit on a 120 bpm
// grid. The base cut is for the TCP account; --variant=personal is the founder's own account. The
// chart is EP08's example chart (labelled on it). Production notes: brand/video/reels/EPISODES.md.

// The story's moments, in seconds: each pair is fake, then real.
const T = { f1: 2.0, r1: 3.5, f2: 5.0, r2: 6.5, f3: 8.0, r3: 9.5, f4: 11.0, r4: 12.5, lesson: 14.0, smirk: 17.0, end: 18.5 };

const AT_SCREEN = { arms: 'desk', lean: 3, look: [1, 0.25], lid: 0.22, brow: [-0.5, -0.4], mouth: { smile: -0.3 }, head: { rot: 3 } };
const CHASE = { arms: 'desk', lean: 5.5, look: [1, 0.18], wide: 1, lid: 0, brow: [-0.6, -0.5], mouth: { open: 0.25 }, head: { rot: 4, dx: 8 } };
const SHOW_OFF = { arms: 'phone', lean: 1, look: [-1, 0.1], lid: 0.1, brow: [0.5, 0.6], mouth: { smile: 0.6 } };
const LOGGING = { arms: 'desk', lean: 2.5, look: [1, 0.28], lid: 0.3, brow: [0, 0.1], mouth: { smile: 0.05 } };
const BLAME = { arms: 'desk', lean: 5, look: [1, 0.2], lid: 0.12, brow: [-0.95, -0.85], mouth: { smile: -0.55 }, head: { rot: 5, dx: 7 } };
const CALM = { arms: 'fold', lean: -2.5, look: [0.75, 0.15], lid: 0.32, brow: [0, 0.2], mouth: { smile: 0.05 } };
const SMIRK = { arms: 'fold', lean: -2, look: [0.6, 0.05], lid: 0.3, brow: [0, 0.35], mouth: { smirk: 1, smile: 0.1 } };
const P = (t, pose, ease) => ({ t, pose, ease });
const POSE = [
  P(0, AT_SCREEN), P(4.98, AT_SCREEN),
  P(T.f2, CHASE), P(6.48, CHASE),
  P(T.r2, CALM), P(7.98, CALM),
  P(T.f3, SHOW_OFF), P(9.48, SHOW_OFF),
  P(T.r3, LOGGING), P(10.98, LOGGING),
  P(T.f4, BLAME), P(12.48, BLAME),
  P(T.r4, CALM), P(16.98, CALM),
  P(T.smirk, SMIRK), P(17.4, { ...SMIRK, head: { rot: 4 } }), P(17.8, { ...SMIRK, head: { rot: 0 } }), P(T.end, SMIRK),
];

// EP08's chart: all 27 indicators for the fake trader, then clean.
const C = (t, ind, i) => ({ t, story: 'clutter', i, ind });
const CHART = [C(0, 27, 63.9), C(3.48, 27, 63.9), C(3.5, 0, 63.9), C(4.98, 0, 63.9), C(T.f2, 0, 40.5), C(6.48, 0, 45.2), C(T.r2, 0, 45.2), C(T.end, 0, 63.9)];

const shot = (set, from, to, cam, more = {}) => ({ kind: 'toon', set, from, to, cam, pose: POSE, chart: CHART, fi: 0.01, fo: 0.01, ...more });
const WHOLE = [{ s: 0.6, x: 900, y: 1040 }, { s: 0.62, x: 893, y: 1036 }];
const SCREEN = (a, b) => shot('screen', a, b, [{ t: a, ...WHOLE[0] }, { t: b, ...WHOLE[1], ease: 'linear' }]);
const FACE = (a, b) => shot('desk', a, b, [{ t: a, s: 2.05, x: 405, y: 900 }, { t: b, s: 2.2, x: 405, y: 894, ease: 'linear' }], { dof: { bg: 7 } });
const MED = (a, b) => shot('desk', a, b, [{ t: a, s: 1.15, x: 490, y: 1000 }, { t: b, s: 1.24, x: 480, y: 990, ease: 'linear' }], { dof: { bg: 3 } });
// a fake line in white, a real one with its answer in gold
const SAY = (text, a, b) => ({ kind: 'caption', from: a + 0.05, to: b, y: 280, text, fi: 0.01, fo: 0.01 });

const SPEC = {
  title: 'EP17 · Fake Trader vs Real Trader',
  modules: ['toon/founder.js', 'toon/toon.js'],
  duration: 21.3,
  cover: 0.9,
  style: 'drive',
  bpm: 120,
  seed: 17,
  sound: false,
  sfx: true,
  scenes: [
    // 1 · the hook
    MED(0, T.f1),
    { id: 'hook', kind: 'caption', from: -0.5, to: T.f1, y: 280, text: 'fake trader\nvs real trader', sfx: false, fi: 0.01 },
    // 2 · four pairs
    SCREEN(T.f1, T.r1), SAY('fake trader:\n27 indicators.', T.f1, T.r1),
    SCREEN(T.r1, T.f2), SAY('real trader:\n*1 plan.*', T.r1, T.f2),
    FACE(T.f2, T.r2), SAY('fake trader:\nchases the breakout.', T.f2, T.r2),
    FACE(T.r2, T.f3), SAY('real trader:\n*waits for the pullback.*', T.r2, T.f3),
    MED(T.f3, T.r3), SAY('fake trader:\nposts the wins.', T.f3, T.r3),
    MED(T.r3, T.f4), SAY('real trader:\n*logs every trade.*', T.r3, T.f4),
    FACE(T.f4, T.r4), SAY('fake trader:\nblames the market.', T.f4, T.r4),
    FACE(T.r4, T.lesson), SAY('real trader:\n*checks the plan.*', T.r4, T.lesson),
    // 3 · the line
    shot('desk', T.lesson, T.smirk, [{ t: T.lesson, s: 1.0, x: 540, y: 960 }, { t: T.smirk, s: 1.12, x: 528, y: 945, ease: 'linear' }]),
    { kind: 'caption', from: T.lesson + 0.1, to: T.smirk, y: 300, text: 'the difference happens\nbefore the entry.', fi: 0.01, fo: 0.01 },
    FACE(T.smirk, T.end),
    { kind: 'caption', style: 'steps', text: 'plan first → click last', from: T.smirk + 0.05, to: T.end, y: 290, sfx: false, fi: 0.01, fo: 0.01 },
    // 4 · the end card: one ask
    { id: 'end', kind: 'end', from: T.end, to: 21.3, cta: 'Follow TCP', sub: 'One lesson an episode.', fo: 0.01,
      risk: 'Education, not financial advice. Trading carries risk.\nExample chart, not real trades.' },
  ],
  cues: [
    { t: T.lesson - 0.02, sfx: 'mute', until: 15.0 },
    { t: T.smirk, sfx: 'rise' },
    { t: T.end, sfx: 'whoosh' },
  ],
  variants: {
    // the founder's own account: no bug, and a follow for him
    personal: {
      bug: false,
      scenes: {
        end: { cta: 'Follow for the next one', sub: 'Fake trader vs real trader.' },
      },
    },
  },
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
