// EP23 · The Race. FOMO against PATIENCE, the hare and the tortoise, on race night in a floodlit
// stadium: the final of the 100 pips, the finish line TAKE PROFIT. At the gun FOMO goes all in and is
// gone (SEE YA!!); PATIENCE is having a tea. Halfway, FOMO has nothing left and ends up flat on its
// back; PATIENCE keeps walking, past it, through the tape: lovely. Up in the commentary box the founder
// calls it: you don't need to be first; you need to still be in the race. Hare or tortoise? No voice:
// a sports broadcast's theme over the crowd, the cuts on its bars. The base cut is for the TCP account;
// --variant=personal is the founder's own account. The characters are made up. Production notes:
// brand/video/reels/EPISODES.md.

// The story's moments, in seconds: a bar is 2 s.
const T = { gun: 2.4, tea: 4.6, burn: 6.6, flat: 7.6, pass: 8.8, finish: 11.0, tape: 11.95, booth: 13.0, still: 15.0, ask: 17.0, end: 19.0 };

// him in the commentary box, at the desk
const CALL = { arms: 'desk', lean: 3, look: [1, 0.2], lid: 0.32, brow: [0.2, 0.2], mouth: { open: 0.12, smile: 0.15 } };
const ASK = { arms: 'desk', lean: 2, look: [-0.3, 0.05], lid: 0.28, brow: [0.4, 0.4], mouth: { smile: 0.2 } };
const P = (t, pose, ease) => ({ t, pose, ease });
const POSE = [
  P(0, CALL), P(T.ask - 0.02, CALL),
  P(T.ask, ASK), P(T.ask + 0.4, { ...ASK, head: { rot: 4 } }), P(T.ask + 0.8, { ...ASK, head: { rot: 0 } }), P(T.end, ASK),
];

// FOMO in lane 1: jittery in its blocks, gone at the gun, out of breath, flat on its back
const L1 = { y: 1650, s: 1.25 };
const BLOCKS = { legs: 'tuck', arms: 'down', lean: 16, shake: 0.9, look: [1, 0], mouth: { smile: 0.6, open: 0.3, teeth: 1 } };
const SPRINT = { legs: 'run', arms: 'pull', lean: 12, shake: 0, look: [1, 0], mouth: { smile: 0.8, open: 0.5, teeth: 1 } };
const TIRED = { legs: 'walk', arms: 'down', lean: 22, shake: 1, lid: 0.5, look: [0.6, 0.4], brow: { worry: 0.7 }, mouth: { smile: -0.2, open: 0.7, teeth: 0 } };
const FLAT = { legs: 'stand', arms: 'up', lean: -88, shake: 0.12, lid: 1, brow: { worry: 0.5 }, mouth: { smile: -0.3, open: 0.45, teeth: 0 } };
const FOMO = [
  { t: 0, x: 330, ...L1, pose: BLOCKS }, { t: T.gun - 0.02, x: 330, ...L1, pose: BLOCKS },
  { t: T.gun + 0.12, x: 400, ...L1, pose: SPRINT, ease: 'out' }, { t: T.tea, x: 2100, ...L1, pose: SPRINT, ease: 'linear' },
  { t: T.burn, x: 2200, ...L1, pose: TIRED }, { t: T.flat - 0.05, x: 2300, ...L1, pose: TIRED, ease: 'linear' },
  { t: T.flat + 0.2, x: 2300, ...L1, pose: FLAT, ease: 'out' }, { t: 22, x: 2300, ...L1, pose: FLAT },
];

// PATIENCE in lane 2, its tea in its hands the whole way
const L2 = { y: 1440, s: 1.15 };
const STAND = { arms: 'tea', legs: 'stand', face: 1, lid: 0.48, mouth: { smile: 0.35 } };
const WALK = { ...STAND, legs: 'walk' };
const GLANCE = { ...WALK, look: [0.3, 0.8], lid: 0.4, brow: { raise: 0.3 } };
const PATIENCE = [
  { t: 0, x: 600, ...L2, pose: STAND }, { t: T.gun + 0.5, x: 600, ...L2, pose: STAND },
  { t: T.gun + 0.8, x: 612, ...L2, pose: WALK }, { t: T.tea, x: 690, ...L2, pose: WALK, ease: 'linear' }, { t: T.burn, x: 860, ...L2, pose: WALK, ease: 'linear' },
  { t: T.pass, x: 2050, ...L2, pose: WALK, ease: 'step' }, { t: T.pass + 0.9, x: 2260, ...L2, pose: WALK, ease: 'linear' },
  { t: T.pass + 1.2, x: 2330, ...L2, pose: GLANCE, ease: 'linear' }, { t: T.pass + 1.7, x: 2445, ...L2, pose: GLANCE, ease: 'linear' },
  { t: T.pass + 2.0, x: 2515, ...L2, pose: WALK, ease: 'linear' }, { t: T.finish - 0.01, x: 2560, ...L2, pose: WALK, ease: 'linear' },
  { t: T.finish, x: 2982, ...L2, pose: WALK, ease: 'step' }, { t: T.booth, x: 3534, ...L2, pose: { ...WALK, mouth: { smile: 0.55 } }, ease: 'linear' },
  { t: T.still, x: 3480, ...L2, pose: { ...STAND, face: -1 }, ease: 'step' }, { t: 22, x: 3480, ...L2, pose: { ...STAND, face: -1 } },
];

const shot = (set, a, b, cam, more = {}) => ({ kind: 'toon', set, from: a, to: b, cam, pose: POSE, cast: { fomo: FOMO, patience: PATIENCE }, board: [[0, 'race'], [T.tape, 'result']], tape: T.tape, confetti: T.tape, dust: [[T.gun, 330, 1650]], fi: 0.01, fo: 0.01, ...more });
const TRACK = (a, b, c0, c1, more) => shot('track', a, b, [{ t: a, ...c0 }, { t: b, ...c1, ease: 'linear' }], { dof: { bg: 3, mid: 1 }, ...more });
const FACE = (a, b) => shot('booth', a, b, [{ t: a, s: 2.05, x: 400, y: 900 }, { t: b, s: 2.2, x: 400, y: 894, ease: 'linear' }], { dof: { bg: 7 }, cast: {} });
const SAY = (who, text, a, b, x, y, tail = 'b', more = {}) => ({ kind: 'bubble', who, text, from: a, to: b, x, y, tail, fo: 0.01, ...more });

const SPEC = {
  title: 'EP23 · The Race',
  outfit: 'palm-zip',
  modules: ['toon/founder.js', 'toon/toon.js', 'toon/cast.js', 'toon/places.js'],
  duration: 21.8,
  cover: 0.9,
  style: 'sport',
  bpm: 120,
  seed: 23,
  ambience: 'crowd',
  sound: false,
  sfx: true,
  scenes: [
    // 1 · the hook: on the start line
    TRACK(0, T.gun, { s: 1.15, x: 560, y: 1250 }, { s: 1.19, x: 564, y: 1252 }),
    { id: 'hook', kind: 'caption', from: -0.5, to: T.gun, y: 230, text: 'FOMO vs PATIENCE:\na race to the *target.*', sfx: false, fi: 0.01 },
    // 2 · the gun: FOMO goes all in
    TRACK(T.gun, T.tea, { s: 1.25, x: 560, y: 1260 }, { s: 1.25, x: 1980, y: 1260 }),
    { kind: 'caption', from: T.gun + 0.15, to: T.tea, y: 230, text: 'FOMO goes\nall in.', fi: 0.01, fo: 0.01 },
    SAY('fomo', 'SEE YA!!', T.gun + 0.5, T.tea - 0.3, 520, 760, 'bl'),
    // 3 · PATIENCE
    TRACK(T.tea, T.burn, { s: 1.35, x: 720, y: 1270 }, { s: 1.38, x: 860, y: 1270 }),
    { kind: 'caption', from: T.tea + 0.1, to: T.burn, y: 230, text: 'PATIENCE is\nhaving a tea.', fi: 0.01, fo: 0.01 },
    // 4 · FOMO has nothing left
    TRACK(T.burn, T.pass, { s: 1.35, x: 2230, y: 1300 }, { s: 1.38, x: 2260, y: 1300 }),
    SAY('fomo', 'NEED… A…\nBREAK…', T.burn + 0.15, T.flat, 560, 740, 'b', { sfx: false }),
    { kind: 'caption', from: T.flat + 0.25, to: T.pass, y: 230, text: 'FOMO has\nnothing left.', fi: 0.01, fo: 0.01 },
    // 5 · PATIENCE keeps walking
    TRACK(T.pass, T.finish, { s: 1.25, x: 2250, y: 1300 }, { s: 1.25, x: 2420, y: 1300 }),
    { kind: 'caption', from: T.pass + 0.1, to: T.finish, y: 230, text: 'PATIENCE\nkeeps walking.', fi: 0.01, fo: 0.01 },
    // 6 · the finish: TAKE PROFIT
    TRACK(T.finish, T.booth, { s: 1.0, x: 3190, y: 1150 }, { s: 1.03, x: 3250, y: 1150 }),
    SAY('patience', 'lovely.', T.tape + 0.25, T.booth, 800, 910, 'bl', { sfx: false }),
    // 7 · the commentary box
    FACE(T.booth, T.still),
    { kind: 'caption', from: T.booth + 0.1, to: T.still, y: 300, text: 'you don’t need\nto be first.', fi: 0.01, fo: 0.01 },
    // 8 · the result, from above the line
    TRACK(T.still, T.ask, { s: 0.62, x: 2780, y: 1240 }, { s: 0.64, x: 2790, y: 1240 }),
    { kind: 'caption', from: T.still + 0.05, to: T.ask, y: 230, text: 'you need to still\nbe in the race.', fi: 0.01, fo: 0.01 },
    // 9 · the question
    FACE(T.ask, T.end),
    { kind: 'caption', from: T.ask + 0.05, to: T.end, y: 300, text: 'hare or tortoise?\nbe honest.', fi: 0.01, fo: 0.01 },
    // 10 · the end card: one ask
    { id: 'end', kind: 'end', from: T.end, to: 21.8, cta: 'Follow TCP', sub: 'One lesson an episode.', fo: 0.01,
      risk: 'Education, not financial advice. Trading carries risk.\nThe characters are made up.' },
  ],
  cues: [
    { t: T.gun, sfx: 'gun' }, { t: T.gun + 0.03, sfx: 'whoosh' },
    { t: T.burn, sfx: 'whoosh' },
    { t: T.flat, sfx: 'slam' }, { t: T.flat + 0.02, sfx: 'mute', until: T.pass }, { t: T.flat + 0.2, sfx: 'wah' },
    { t: T.tape, sfx: 'cheer' }, { t: T.tape + 0.05, sfx: 'applause' },
    { t: T.booth, sfx: 'whoosh' },
    { t: T.end, sfx: 'whoosh' },
  ],
  variants: {
    personal: {
      bug: false,
      scenes: { end: { cta: 'Follow for the next one', sub: 'Still in the race.' } },
    },
  },
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
