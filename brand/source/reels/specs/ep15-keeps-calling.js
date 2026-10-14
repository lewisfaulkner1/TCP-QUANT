// EP15 · The Market Keeps Calling Me. The founder leans back while the market rings: Gold, Gold
// again, then Bitcoin, then a message ("big move. you in?"). He declines every one: every move wants
// an answer, but he only answers the calls he planned for. No voice: the cuts sit on a 120 bpm grid.
// The base cut is for the TCP account; --variant=personal is the founder's own account. The chart on
// his monitor is EP08's example chart (labelled on it). Production notes: brand/video/reels/EPISODES.md.

// The story's moments, in seconds.
const T = { notnow: 2.0, again: 3.5, declined: 5.0, btc: 6.5, msg: 8.0, every: 9.5, pick: 11.0, plan: 13.5, steps: 16.0, end: 17.5 };

const BACK = { arms: 'fold', lean: -3.5, look: [0.35, 0.12], lid: 0.35, brow: [0.05, 0.15], mouth: { smile: 0.05 } };
const UNIMPRESSED = { arms: 'fold', lean: -3, look: [-1, 0.08], lid: 0.5, brow: [0.15, -0.1], mouth: { smile: -0.2 } };
const DEADPAN = { arms: 'fold', lean: -3, look: [-1, 0.05], lid: 0.56, brow: [0, 0], mouth: { smile: -0.1 } };
const GLANCE = { arms: 'fold', lean: -2.5, look: [0.9, 0.2], lid: 0.3, brow: [0.4, 0.5], mouth: { smile: -0.1 } };
const CALM = { arms: 'fold', lean: -2.5, look: [0.75, 0.15], lid: 0.32, brow: [0, 0.2], mouth: { smile: 0.05 } };
const SMIRK = { arms: 'fold', lean: -2, look: [0.6, 0.05], lid: 0.3, brow: [0, 0.35], mouth: { smirk: 1, smile: 0.1 } };
const P = (t, pose, ease) => ({ t, pose, ease });
const POSE = [
  P(0, BACK), P(1.98, BACK),
  P(T.notnow, UNIMPRESSED), P(3.48, UNIMPRESSED),
  P(T.again, BACK), P(4.98, { ...BACK, lid: 0.45 }),
  P(T.declined, DEADPAN), P(6.48, DEADPAN),
  P(T.btc, GLANCE), P(7.98, GLANCE),
  P(T.msg, { ...GLANCE, brow: [0.6, 0.7] }), P(9.48, { ...GLANCE, brow: [0.5, 0.6] }),
  P(T.every, CALM), P(13.48, CALM),
  P(T.plan, SMIRK), P(13.9, { ...SMIRK, head: { rot: 4 } }), P(14.3, { ...SMIRK, head: { rot: 0 } }), P(T.end, SMIRK),
];

// EP08's clean chart on his monitor, candles printing the whole time: the market keeps moving.
const CHART = [{ t: 0, story: 'clutter', i: 46, ind: 0 }, { t: T.end, story: 'clutter', i: 63.9, ind: 0, ease: 'linear' }];

const shot = (set, from, to, cam, more = {}) => ({ kind: 'toon', set, from, to, cam, pose: POSE, chart: CHART, fi: 0.01, fo: 0.01, ...more });
const MED = (a, b) => shot('desk', a, b, [{ t: a, s: 1.15, x: 480, y: 1000 }, { t: b, s: 1.24, x: 470, y: 992, ease: 'linear' }], { dof: { bg: 6 } });
const FACE = (a, b) => shot('desk', a, b, [{ t: a, s: 2.05, x: 400, y: 900 }, { t: b, s: 2.2, x: 400, y: 894, ease: 'linear' }], { dof: { bg: 7 } });
const CALL = (num, who, sub, a, b) => ({ kind: 'caption', style: 'note', num, text: who, sub, from: a, to: b, y: 430, fi: 0.08, fo: 0.01 });

const SPEC = {
  title: 'EP15 · The Market Keeps Calling Me',
  modules: ['toon/founder.js', 'toon/toon.js'],
  duration: 20.3,
  cover: 0.9,
  style: 'drive',
  bpm: 120,
  seed: 15,
  sound: false,
  sfx: true,
  scenes: [
    // 1 · the hook: it rings
    MED(0, T.notnow),
    { id: 'hook', kind: 'caption', from: -0.5, to: T.notnow, y: 280, text: 'the market keeps\ncalling me.', sfx: false, fi: 0.01 },
    CALL('G', 'GOLD', 'incoming call…', 0.25, T.notnow),
    // 2 · not now; again; declined
    FACE(T.notnow, T.again),
    { kind: 'caption', from: T.notnow + 0.1, to: T.again, y: 300, text: 'not now.', fi: 0.01, fo: 0.01 },
    MED(T.again, T.declined),
    CALL('G', 'GOLD', 'incoming call… (2)', T.again + 0.1, T.declined),
    { kind: 'caption', from: T.again + 0.1, to: T.declined, y: 280, text: 'again.', sfx: false, fi: 0.01, fo: 0.01 },
    FACE(T.declined, T.btc),
    { kind: 'caption', from: T.declined + 0.1, to: T.btc, y: 300, text: 'declined.', fi: 0.01, fo: 0.01 },
    // 3 · Bitcoin, then the message
    MED(T.btc, T.every),
    CALL('B', 'BITCOIN', 'incoming call…', T.btc + 0.1, T.msg),
    { kind: 'caption', from: T.btc + 0.1, to: T.msg, y: 280, text: 'now Bitcoin.', sfx: false, fi: 0.01, fo: 0.01 },
    CALL('G', 'GOLD', 'big move. you in?', T.msg + 0.1, T.every),
    // 4 · the lesson
    FACE(T.every, T.pick),
    { kind: 'caption', from: T.every + 0.05, to: T.pick, y: 300, text: 'every move\nwants an answer.', fi: 0.01, fo: 0.01 },
    shot('desk', T.pick, T.steps, [{ t: T.pick, s: 1.0, x: 540, y: 960 }, { t: T.steps, s: 1.12, x: 528, y: 945, ease: 'linear' }]),
    { kind: 'caption', from: T.pick + 0.05, to: T.plan, y: 300, text: 'you don’t have to\npick up every time.', fi: 0.01, fo: 0.01 },
    { kind: 'caption', from: T.plan, to: T.steps, y: 300, text: 'I only answer\nthe calls I planned for.', fi: 0.01, fo: 0.01 },
    shot('desk', T.steps, T.end, [{ t: T.steps, s: 2.0, x: 370, y: 900 }, { t: T.end, s: 2.12, x: 370, y: 900, ease: 'linear' }], { dof: { bg: 7 } }),
    { kind: 'caption', style: 'steps', text: 'plan → wait → answer', from: T.steps + 0.05, to: T.end, y: 290, sfx: false, fi: 0.01, fo: 0.01 },
    // 5 · the end card: one ask
    { id: 'end', kind: 'end', from: T.end, to: 20.3, cta: 'Follow TCP', sub: 'One lesson an episode.', fo: 0.01,
      risk: 'Education, not financial advice. Trading carries risk.\nExample chart, not real trades.' },
  ],
  cues: [
    { t: T.every - 0.02, sfx: 'mute', until: T.pick },
    { t: T.pick, sfx: 'whoosh' },
    { t: T.plan, sfx: 'rise' },
    { t: T.end, sfx: 'whoosh' },
  ],
  variants: {
    // the founder's own account: no bug, and a follow for him
    personal: {
      bug: false,
      scenes: {
        end: { cta: 'Follow for the next one', sub: 'The market keeps calling.' },
      },
    },
  },
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
