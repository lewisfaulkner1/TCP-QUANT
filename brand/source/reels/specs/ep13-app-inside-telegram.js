// EP13 · The App Inside Telegram. The founder picks up his phone; from his point of view, the real
// Quant Terminal in demo mode, one screen at a time: the market at a glance, the odds on each level,
// the lot size, a brief before each session, the prop challenge simulator. No voice. The base cut is
// for the TCP account; --variant=personal is the founder's own account. App footage is the real
// terminal with demo prices (labelled). Production notes: brand/video/reels/EPISODES.md.

// The story's moments, in seconds.
const T = { phone: 2.5, odds: 6.5, risk: 10.0, brief: 13.5, prop: 17.0, smirk: 20.0, end: 21.5 };

const HOLD = { arms: 'phone', lean: 1, look: [0.3, 0.7], lid: 0.28, brow: [0.1, 0.2], mouth: { smile: 0.15 } };
const SMIRK = { arms: 'fold', lean: -2, look: [0.6, 0.05], lid: 0.3, brow: [0, 0.35], mouth: { smirk: 1, smile: 0.1 } };
const P = (t, pose, ease) => ({ t, pose, ease });
const POSE = [
  P(0, HOLD), P(1.2, { ...HOLD, head: { rot: 2 } }), P(2.48, { ...HOLD, head: { rot: 1 } }),
  P(T.smirk, SMIRK), P(20.4, { ...SMIRK, head: { rot: 4 } }), P(20.8, { ...SMIRK, head: { rot: 0 } }),
];
const CHART = [{ t: 0, i: 21.2 }];
const shot = (set, from, to, cam, more = {}) => ({ kind: 'toon', set, from, to, cam, pose: POSE, chart: CHART, fi: 0.01, fo: 0.01, ...more });

const SPEC = {
  title: 'EP13 · The App Inside Telegram',
  modules: ['toon/founder.js', 'toon/toon.js'],
  duration: 24.3,
  cover: 0.9,
  style: 'drive',
  bpm: 120,
  seed: 13,
  sound: false,
  sfx: true,
  scenes: [
    // 1 · the hook: him with his phone
    shot('desk', 0, T.phone, [{ t: 0, s: 1.15, x: 500, y: 1000 }, { t: T.phone, s: 1.26, x: 492, y: 988, ease: 'linear' }], { dof: { bg: 2 } }),
    { id: 'kicker', kind: 'kicker', from: -0.5, to: T.phone, y: 250, text: 'The app inside Telegram', fi: 0.01 },
    { id: 'hook', kind: 'caption', from: -0.5, to: T.phone, y: 300, text: 'a trading terminal…\ninside Telegram.', sfx: false, fi: 0.01 },
    // 2 · his point of view: the real app, screen by screen, the room behind
    shot('desk', T.phone, T.smirk, [{ t: T.phone, s: 1.1, x: 540, y: 960 }], { dof: { bg: 18, all: 16 } }),
    {
      kind: 'handPhone', from: T.phone, to: T.smirk, tag: 'DEMO PRICES', fi: 0.25,
      shots: [
        { shot: 'markets', from: T.phone, u0: 0.4 }, { shot: 'odds', from: T.odds, u0: 1.5 }, { shot: 'risk', from: T.risk, u0: 0.6 },
        { shot: 'brief', from: T.brief, u0: 0.6 }, { shot: 'prop', from: T.prop, u0: 1.2 },
      ],
      pose: [{ t: T.phone, x: 560, y: 1240, s: 0.84, rx: 14, ry: -10, rz: 3 }, { t: 3.1, x: 560, y: 1110, s: 0.9, rx: 6, ry: -6, rz: 1 }, { t: T.smirk, x: 556, y: 1090, s: 0.94, rx: 4, ry: 4, rz: 0 }],
    },
    { kind: 'caption', from: 2.8, to: T.odds, y: 230, size: 56, text: 'the market,\nat a glance.', fi: 0.01, fo: 0.01 },
    { kind: 'caption', from: T.odds, to: T.risk, y: 230, size: 56, text: 'the odds on\nevery level.', fi: 0.01, fo: 0.01 },
    { kind: 'caption', from: T.risk, to: T.brief, y: 230, size: 56, text: 'your lot size,\nworked out.', fi: 0.01, fo: 0.01 },
    { kind: 'caption', from: T.brief, to: T.prop, y: 230, size: 56, text: 'a brief before\neach session.', fi: 0.01, fo: 0.01 },
    { kind: 'caption', from: T.prop, to: T.smirk, y: 230, size: 56, text: 'and a prop challenge\nsimulator.', fi: 0.01, fo: 0.15 },
    // 3 · him again: a small smirk
    shot('desk', T.smirk, T.end, [{ t: T.smirk, s: 2.0, x: 370, y: 900 }, { t: T.end, s: 2.12, x: 370, y: 900, ease: 'linear' }], { dof: { bg: 7 } }),
    { kind: 'caption', from: T.smirk + 0.05, to: T.end, y: 300, text: 'all in the chat app\nyou already use.', fi: 0.01, fo: 0.01 },
    // 4 · the end card: one ask
    { id: 'end', kind: 'end', from: T.end, to: 24.3, cta: 'Follow TCP', sub: 'The Quant Terminal, inside Telegram.', fo: 0.01,
      risk: 'Education, not financial advice. Trading carries risk.\nApp shown with demo prices.' },
  ],
  cues: [
    { t: T.phone, sfx: 'whoosh' },
    { t: T.odds, sfx: 'click' }, { t: T.risk, sfx: 'click' }, { t: T.brief, sfx: 'click' }, { t: T.prop, sfx: 'click' },
    { t: T.smirk, sfx: 'rise' },
    { t: T.end, sfx: 'whoosh' },
  ],
  variants: {
    // the founder's own account: no series title or bug, and a follow for him
    personal: {
      bug: false,
      scenes: {
        kicker: null,
        end: { cta: 'Follow for the next one', sub: 'What we’re building at TCP.' },
      },
    },
  },
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
