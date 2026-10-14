// EP11 · The Market Is Not Your Enemy. A stop-out lands; the founder takes it personally ("it knew",
// "it waits for me"); then the market replies: "sorry, who's this?". He folds his arms: fair. Price
// doesn't know your entry or your stop, so don't make it personal: plan it, place it, leave it. No
// voice: the cuts sit on a 120 bpm grid and the music drops out for the reply. The base cut is for
// the TCP account; --variant=personal is the founder's own account. The chart on his monitor is
// EP02's example chart (labelled on it). Production notes: brand/video/reels/EPISODES.md.

// The story's moments, in seconds.
const T = { stop: 0.3, knew: 2.0, waits: 3.5, every: 5.0, reply: 6.5, eye: 8.5, fair: 10.0, lesson: 12.0, smirk: 17.0, end: 18.5 };

// One pose track for every shot, so a cut never changes what he's doing.
const AT_SCREEN = { arms: 'desk', lean: 3, look: [1, 0.25], lid: 0.22, brow: [-0.5, -0.4], mouth: { smile: -0.3 }, head: { rot: 3 } };
const SQUINT = { arms: 'desk', lean: 4.5, look: [1, 0.22], lid: 0.58, brow: [-0.75, -0.65], mouth: { smile: -0.35 }, head: { rot: 4.5, dx: 6 } };
const ANGRY = { arms: 'desk', lean: 5, look: [1, 0.2], lid: 0.12, brow: [-0.95, -0.85], mouth: { smile: -0.55 }, head: { rot: 5, dx: 7 } };
const RANT = { arms: 'desk', lean: 5.5, look: [1, 0.18], wide: 1, lid: 0, brow: [-0.7, -0.6], mouth: { open: 0.3 }, head: { rot: 4, dx: 8 } };
const SIDE_EYE = { arms: 'desk', lean: 2, look: [-1, 0.08], lid: 0.46, brow: [0.25, -0.2], mouth: { smile: -0.25 } };
const FOLD = { arms: 'fold', lean: -3, look: [0.8, 0.2], lid: 0.42, brow: [0.1, 0.45], mouth: { smile: -0.25 } };
const CALM = { arms: 'fold', lean: -2.5, look: [0.75, 0.15], lid: 0.32, brow: [0, 0.2], mouth: { smile: 0.05 } };
const SMIRK = { arms: 'fold', lean: -2, look: [0.6, 0.05], lid: 0.3, brow: [0, 0.35], mouth: { smirk: 1, smile: 0.1 } };
const P = (t, pose, ease) => ({ t, pose, ease });
const POSE = [
  P(0, AT_SCREEN), P(0.28, AT_SCREEN),
  // the stop: a flinch
  P(0.4, { ...AT_SCREEN, lean: 1.5, lid: 0.1, brow: [0.3, 0.4], mouth: { open: 0.12 } }),
  P(1.98, { ...AT_SCREEN, lean: 2, lid: 0.3, brow: [-0.3, -0.2] }),
  P(T.knew, SQUINT), P(3.48, SQUINT),
  P(T.waits, ANGRY), P(4.98, ANGRY),
  P(T.every, RANT), P(6.48, { ...RANT, head: { rot: 3, dx: 9 } }),
  // the reply: frozen, then the side-eye to camera
  P(T.reply, { ...RANT, mouth: { open: 0.1 } }), P(8.48, { ...ANGRY, lid: 0.3 }),
  P(T.eye, SIDE_EYE), P(9.98, SIDE_EYE),
  // fair enough: arms folded, leaning back
  P(T.fair, FOLD), P(11.98, FOLD),
  P(T.lesson, CALM), P(16.98, CALM),
  P(T.smirk, SMIRK), P(17.4, { ...SMIRK, head: { rot: 4 } }), P(17.8, { ...SMIRK, head: { rot: 0 } }),
];

// One chart track: EP02's example chart, his breakout buy, stopped out in the first moment.
const C = (t, i, more, ease) => ({ t, i, ...more, ease });
const CHART = [C(0, 25.2), C(T.stop, 'stop1', {}, 'linear'), C(1.2, 25.97), C(T.end, 25.97)];

const shot = (set, from, to, cam, more = {}) => ({ kind: 'toon', set, from, to, cam, pose: POSE, chart: CHART, fi: 0.01, fo: 0.01, ...more });
const FACE = { dof: { bg: 7 } };

const SPEC = {
  title: 'EP11 · The Market Is Not Your Enemy',
  modules: ['toon/founder.js', 'toon/toon.js'],
  duration: 21.3,
  cover: 0.9,
  style: 'drive',
  bpm: 120,
  seed: 11,
  sound: false,
  sfx: true,
  scenes: [
    // 1 · the hook: over his shoulder, the stop-out lands
    shot('ots', 0, T.knew, [{ t: 0, s: 1.12, x: 560, y: 880 }, { t: T.knew, s: 1.2, x: 565, y: 885, ease: 'linear' }], { hits: [T.stop] }),
    { id: 'kicker', kind: 'kicker', from: -0.5, to: T.knew, y: 250, text: 'The market is not your enemy', fi: 0.01 },
    { id: 'hook', kind: 'caption', from: -0.5, to: T.knew, y: 300, text: 'it took my stop.\nagain.', sfx: false, fi: 0.01 },
    { kind: 'caption', style: 'note', num: '!', text: 'STOP LOSS HIT', sub: 'closed at your stop', from: T.stop, to: T.knew, y: 640, sfx: false, fi: 0.08, fo: 0.01 },
    // 2 · he takes it personally
    shot('desk', T.knew, T.waits, [{ t: T.knew, s: 2.05, x: 410, y: 900 }, { t: T.waits, s: 2.2, x: 412, y: 896, ease: 'linear' }], FACE),
    { kind: 'caption', from: T.knew + 0.1, to: T.waits, y: 300, text: 'it knew.', fi: 0.01, fo: 0.01 },
    shot('desk', T.waits, T.every, [{ t: T.waits, s: 2.3, x: 405, y: 895 }, { t: T.every, s: 2.45, x: 405, y: 890, ease: 'linear' }], FACE),
    { kind: 'caption', from: T.waits + 0.05, to: T.every, y: 300, text: 'it waits for me.', fi: 0.01, fo: 0.01 },
    shot('desk', T.every, T.reply, [{ t: T.every, s: 1.15, x: 500, y: 1000 }, { t: T.reply, s: 1.25, x: 490, y: 990, ease: 'linear' }], { dof: { bg: 2 } }),
    { kind: 'caption', from: T.every + 0.05, to: T.reply, y: 300, text: 'every. single. time.', fi: 0.01, fo: 0.01 },
    // 3 · the market replies, in silence
    shot('ots', T.reply, T.eye, [{ t: T.reply, s: 1.1, x: 560, y: 900 }, { t: T.eye, s: 1.16, x: 560, y: 900, ease: 'linear' }]),
    { kind: 'caption', style: 'note', num: 'G', text: 'GOLD', sub: 'sorry, who’s this?', from: T.reply + 0.15, to: T.eye, y: 640, fi: 0.08, fo: 0.01 },
    // 4 · the side-eye
    shot('desk', T.eye, T.fair, [{ t: T.eye, s: 2.05, x: 400, y: 900 }, { t: T.fair, s: 2.25, x: 400, y: 892, ease: 'linear' }], FACE),
    // 5 · fair
    shot('desk', T.fair, T.lesson, [{ t: T.fair, s: 1.15, x: 480, y: 1000 }, { t: T.lesson, s: 1.28, x: 450, y: 990, ease: 'linear' }], { dof: { bg: 2 } }),
    { kind: 'caption', from: T.fair + 0.25, to: T.lesson, y: 300, text: 'fair.', fi: 0.01, fo: 0.01 },
    // 6 · the lesson
    shot('desk', T.lesson, T.smirk, [{ t: T.lesson, s: 1.0, x: 540, y: 960 }, { t: T.smirk, s: 1.12, x: 530, y: 945, ease: 'linear' }]),
    { kind: 'caption', from: T.lesson + 0.05, to: 13.6, y: 300, text: 'price doesn’t know\nyour entry.', fi: 0.01, fo: 0.01 },
    { kind: 'caption', from: 13.6, to: 15.0, y: 300, text: 'or your stop.', fi: 0.01, fo: 0.01 },
    { kind: 'caption', from: 15.0, to: T.smirk, y: 300, text: 'so stop making it\npersonal.', fi: 0.01, fo: 0.01 },
    // 7 · plan it, place it, leave it
    shot('desk', T.smirk, T.end, [{ t: T.smirk, s: 2.0, x: 370, y: 900 }, { t: T.end, s: 2.12, x: 370, y: 900, ease: 'linear' }], FACE),
    { kind: 'caption', style: 'steps', text: 'plan it → place it → leave it', from: T.smirk + 0.05, to: T.end, y: 290, sfx: false, fi: 0.01, fo: 0.01 },
    // 8 · the end card: one ask
    { id: 'end', kind: 'end', from: T.end, to: 21.3, cta: 'Follow TCP', sub: 'One lesson an episode.', fo: 0.01,
      risk: 'Education, not financial advice. Trading carries risk.\nExample chart, not real trades.' },
  ],
  cues: [
    { t: T.stop + 0.02, sfx: 'pop' },
    { t: T.reply - 0.02, sfx: 'mute', until: T.fair },
    { t: T.fair, sfx: 'whoosh' },
    { t: T.smirk, sfx: 'rise' },
    { t: T.end, sfx: 'whoosh' },
  ],
  variants: {
    // the founder's own account: no series title or bug, and a follow for him
    personal: {
      bug: false,
      scenes: {
        kicker: null,
        end: { cta: 'Follow for the next one', sub: 'The market is not your enemy.' },
      },
    },
  },
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
