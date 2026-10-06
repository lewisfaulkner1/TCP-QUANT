// EP16 · Trading Group Chat at 3 AM. 3am, phone in hand, the group chat won't stop: BUY GOLD NOW,
// it's going to 5,000, SELL SELL SELL, post your PnL. He mutes it for 8 hours. Noise isn't a plan; if
// it's not in your plan, it's not your trade. No voice: the cuts sit on a 120 bpm grid. The base cut
// is for the TCP account; --variant=personal is the founder's own account. The chat's names are made
// up. The chart on his monitor is EP08's example chart (labelled on it). Production notes:
// brand/video/reels/EPISODES.md.

// The story's moments, in seconds.
const T = { face: 5.0, more: 6.5, eye: 9.5, muted: 11.0, noise: 12.5, plan: 14.5, smirk: 16.5, end: 18.0 };

const SLEEPY = { arms: 'phone', lean: 0, look: [0.3, 0.7], lid: 0.55, brow: [0.2, 0.3], mouth: { smile: -0.1 } };
const DEADPAN = { arms: 'phone', lean: -0.5, look: [0.3, 0.65], lid: 0.5, brow: [0.45, 0.55], mouth: { smile: -0.2 } };
const SIDE_EYE = { arms: 'phone', lean: -1, look: [-1, 0.08], lid: 0.5, brow: [0.25, -0.15], mouth: { smile: -0.25 } };
const DONE = { arms: 'fold', lean: -3, look: [0.6, 0.12], lid: 0.42, brow: [0.05, 0.2], mouth: { smile: 0.1 } };
const CALM = { arms: 'fold', lean: -2.5, look: [0.75, 0.15], lid: 0.34, brow: [0, 0.2], mouth: { smile: 0.05 } };
const SMIRK = { arms: 'fold', lean: -2, look: [0.6, 0.05], lid: 0.3, brow: [0, 0.35], mouth: { smirk: 1, smile: 0.1 } };
const P = (t, pose, ease) => ({ t, pose, ease });
const POSE = [
  P(0, SLEEPY), P(4.98, { ...SLEEPY, lid: 0.6 }),
  P(T.face, DEADPAN), P(9.48, DEADPAN),
  P(T.eye, SIDE_EYE), P(10.98, SIDE_EYE),
  P(T.muted, DONE), P(12.48, DONE),
  P(T.noise, CALM), P(16.48, CALM),
  P(T.smirk, SMIRK), P(16.9, { ...SMIRK, head: { rot: 4 } }), P(17.3, { ...SMIRK, head: { rot: 0 } }), P(T.end, SMIRK),
];

// EP08's clean chart on his monitor, quiet: it's 3am.
const CHART = [{ t: 0, story: 'clutter', i: 63.9, ind: 0 }];

const shot = (set, from, to, cam, more = {}) => ({ kind: 'toon', set, from, to, cam, pose: POSE, chart: CHART, fi: 0.01, fo: 0.01, ...more });
// the room, with space above him for the messages; the background soft so they read
const WIDE = (a, b) => shot('desk', a, b, [{ t: a, s: 1.0, x: 540, y: 860 }, { t: b, s: 1.05, x: 535, y: 858, ease: 'linear' }], { dof: { bg: 6 } });
const FACE = (a, b) => shot('desk', a, b, [{ t: a, s: 2.05, x: 400, y: 900 }, { t: b, s: 2.2, x: 400, y: 894, ease: 'linear' }], { dof: { bg: 7 } });
const MSG = (num, who, text, a, b, y) => ({ kind: 'caption', style: 'note', num, text: who, sub: text, from: a, to: b, y, fi: 0.08, fo: 0.01 });

const SPEC = {
  title: 'EP16 · Trading Group Chat at 3 AM',
  modules: ['toon/founder.js', 'toon/toon.js'],
  duration: 20.8,
  cover: 0.9,
  style: 'drive',
  bpm: 120,
  seed: 16,
  sound: false,
  sfx: true,
  scenes: [
    // 1 · the hook: 3am, and the chat fills up
    WIDE(0, T.face),
    { id: 'hook', kind: 'caption', from: -0.5, to: T.face, y: 240, text: '3am. the group chat:', sfx: false, fi: 0.01 },
    MSG('K', 'KING_FX', 'BUY GOLD NOW', 0.25, T.face, 340),
    MSG('M', 'MOONBOY', 'it’s going to 5,000', 1.6, T.face, 465),
    MSG('P', 'PIP_LORD', 'SELL SELL SELL', 3.0, T.face, 590),
    // 2 · it's 3am
    FACE(T.face, T.more),
    { kind: 'caption', from: T.face + 0.1, to: T.more, y: 300, text: 'it’s 3am.', fi: 0.01, fo: 0.01 },
    // 3 · still going
    WIDE(T.more, T.eye),
    { kind: 'caption', from: T.more, to: T.eye, y: 240, text: 'still going.', sfx: false, fi: 0.01, fo: 0.01 },
    MSG('G', 'GOLDBULL99', 'who’s still in??', T.more + 0.1, T.eye, 350),
    MSG('K', 'KING_FX', 'post your PnL', 8.0, T.eye, 480),
    // 4 · the side-eye, in silence; then muted
    FACE(T.eye, T.muted),
    WIDE(T.muted, T.noise),
    MSG('!', 'GROUP MUTED', 'for 8 hours', T.muted + 0.1, T.noise, 420),
    // 5 · the lesson
    shot('desk', T.noise, T.smirk, [{ t: T.noise, s: 1.15, x: 480, y: 1000 }, { t: T.smirk, s: 1.26, x: 465, y: 990, ease: 'linear' }], { dof: { bg: 2 } }),
    { kind: 'caption', from: T.noise + 0.05, to: T.plan, y: 300, text: 'noise isn’t a plan.', fi: 0.01, fo: 0.01 },
    { kind: 'caption', from: T.plan, to: T.smirk, y: 300, text: 'if it’s not in your plan,\nit’s not your trade.', fi: 0.01, fo: 0.01 },
    FACE(T.smirk, T.end),
    { kind: 'caption', style: 'steps', text: 'mute → sleep → plan', from: T.smirk + 0.05, to: T.end, y: 290, sfx: false, fi: 0.01, fo: 0.01 },
    // 6 · the end card: one ask
    { id: 'end', kind: 'end', from: T.end, to: 20.8, cta: 'Follow TCP', sub: 'One lesson an episode.', fo: 0.01,
      risk: 'Education, not financial advice. Trading carries risk.\nExample chart, not real trades. The chat is made up.' },
  ],
  cues: [
    { t: T.eye - 0.02, sfx: 'mute', until: T.muted },
    { t: T.noise, sfx: 'whoosh' },
    { t: T.smirk, sfx: 'rise' },
    { t: T.end, sfx: 'whoosh' },
  ],
  variants: {
    // the founder's own account: no bug, and a follow for him
    personal: {
      bug: false,
      scenes: {
        end: { cta: 'Follow for the next one', sub: 'Trading group chat at 3am.' },
      },
    },
  },
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
