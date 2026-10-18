// The Fast Lane · 2 · Red Light. At a red light at night, a red car in front revs at it. He waits. It
// goes on red, past a speed camera: flash. Six points and a fine. Then the light goes red and amber,
// then green, and he moves off. No setup is a red light: wait for your green. How many red lights did
// you jump this week? Trap at 140 bpm, the cuts on its bars. The cars are cartoon props, not trading
// results. The base cut is for the TCP account; --variant=personal is the founder's own account.
// Notes: brand/video/reels/EPISODES.md.

const B = 60 / 140 * 4;
const T = { watch: 2 * B, jump: 3 * B, fine: 5 * B, green: 6 * B, face: 8 * B, ask: 10 * B, end: 12 * B };

const WAIT = { arms: 'wheel', look: [1, 0.05], lid: 0.34, brow: [0.1, 0.15], mouth: { smile: -0.05 } };
const UNIMPRESSED = { arms: 'wheel', look: [1, 0.08], lid: 0.42, brow: [-0.15, 0.4], mouth: { smile: -0.25 } };
const SMIRK = { arms: 'wheel', look: [0.7, 0.05], lid: 0.3, brow: [0.1, 0.45], mouth: { smirk: 1, smile: 0.15 } };
const ASK = { arms: 'wheel', look: [-0.6, 0.05], lid: 0.26, brow: [0.5, 0.45], mouth: { smile: 0.15 } };
const P = (t, pose) => ({ t, pose });
const POSE = [
  P(0, WAIT), P(T.watch - 0.02, WAIT), P(T.watch, UNIMPRESSED), P(T.fine - 0.02, UNIMPRESSED),
  P(T.fine, SMIRK), P(T.face - 0.02, SMIRK), P(T.face, WAIT), P(T.face + 1.7, SMIRK), P(T.ask - 0.02, SMIRK), P(T.ask, ASK), P(T.end, ASK),
];

// the road: stopped at the light until it's green, then moving off and through the junction
const ROAD = [{ t: 0, speed: 0, bend: 0 }, { t: T.green + 1.2, speed: 0, bend: 0 }, { t: T.face, speed: 34, bend: 0 }];
const DASH = [{ t: 0, speed: 0, fuel: 0.7, brake: 1 }, { t: T.green + 1.15, speed: 0, fuel: 0.7, brake: 1 }, { t: T.green + 1.2, speed: 0, fuel: 0.7, brake: 0 }, { t: T.end, speed: 34, fuel: 0.7, brake: 0 }];
const SIGNAL = [[0, 'red'], [T.green + 0.2, 'redamber'], [T.green + 1.0, 'green']];
const LIGHTZ = [{ t: 0, z: 0.5 }, { t: T.green + 1.2, z: 0.5 }, { t: T.face, z: 0.12, ease: 'linear' }];
// the red car in front: waiting, revving, then gone on red
const AHEAD = [{ t: 0, z: 0.42, side: 0, brake: 1 }, { t: T.jump + 0.1, z: 0.42, side: 0, brake: 1 }, { t: T.jump + 0.2, z: 0.43, side: 0, brake: 0 }, { t: T.jump + 1.4, z: 1.05, side: 0, brake: 0 }];
const CAMERA = [{ kind: 'camera', side: -0.6, keys: [{ t: 0, z: 0.66 }, { t: T.green + 1.2, z: 0.66 }, { t: T.face, z: 0.3, ease: 'linear' }] }];

const shot = (set, a, b, cam, more = {}) => ({ kind: 'toon', set, from: a, to: b, cam, pose: POSE, road: ROAD, dash: DASH, signal: SIGNAL, lightz: LIGHTZ, ahead: AHEAD, sign: CAMERA,
  flash: [T.jump + 1.45], flow: [{ t: 0, k: 0 }, { t: T.green + 1.2, k: 0 }, { t: T.face, k: 0.4 }], fi: 0.01, fo: 0.01, ...more });
const POV = (a, b) => shot('road', a, b, [{ t: a, s: 1.0, x: 540, y: 960 }, { t: b, s: 1.04, x: 540, y: 950, ease: 'linear' }]);
const WHEEL = (a, b) => shot('driver', a, b, [{ t: a, s: 1.5, x: 530, y: 740 }, { t: b, s: 1.56, x: 532, y: 736, ease: 'linear' }], { dof: { bg: 3 } });
const FACE = (a, b) => shot('driver', a, b, [{ t: a, s: 2.05, x: 372, y: 880 }, { t: b, s: 2.18, x: 372, y: 874, ease: 'linear' }], { dof: { bg: 6 }, screen: false });
const LINE = (text, a, b, more = {}) => ({ kind: 'caption', from: a, to: b, y: 300, text, fi: 0.01, fo: 0.01, ...more });

const SPEC = {
  title: 'The Fast Lane · 2 · Red Light',
  outfit: 'givenchy-hoodie',
  modules: ['toon/founder.js', 'toon/toon.js', 'toon/fastlane.js'],
  duration: T.end + 2.4,
  cover: 0.9,
  style: 'trap',
  bpm: 140,
  seed: 102,
  sound: false,
  sfx: true,
  scenes: [
    // 1 · the hook: a red light, the car in front revving at it
    POV(0, T.watch),
    { id: 'kicker', kind: 'kicker', from: -0.5, to: T.watch, y: 250, text: 'The Fast Lane · 2', fi: 0.01 },
    { id: 'hook', kind: 'caption', from: -0.5, to: T.watch, y: 300, text: 'red light.\nthe car in front *revs.*', sfx: false, fi: 0.01 },
    // 2 · he waits
    WHEEL(T.watch, T.jump),
    LINE('he can’t wait.', T.watch + 0.1, T.jump),
    // 3 · it goes on red; the camera
    POV(T.jump, T.fine),
    LINE('he goes on red.', T.jump + 0.1, T.jump + 1.45),
    LINE('*flash.*', T.jump + 1.45, T.fine, { sfx: false }),
    // 4 · the fine
    FACE(T.fine, T.green),
    LINE('6 points.\nand a *fine.*', T.fine + 0.1, T.green),
    // 5 · green
    POV(T.green, T.face),
    LINE('then it’s *green.*', T.green + 1.0, T.green + 2.2),
    LINE('and he goes.', T.green + 2.2, T.face),
    // 6 · the lesson
    FACE(T.face, T.ask),
    LINE('no setup?\nthat’s a *red light.*', T.face + 0.1, T.face + 1.7),
    LINE('wait for\nyour *green.*', T.face + 1.7, T.ask),
    WHEEL(T.ask, T.end),
    LINE('how many red lights\nhave *you* jumped?', T.ask + 0.1, T.end),
    // 7 · the end card: one ask
    { id: 'end', kind: 'end', from: T.end, to: T.end + 2.4, cta: 'Follow TCP', sub: 'One lesson an episode.', fo: 0.01,
      risk: 'Education, not financial advice. Trading carries risk.\nCartoon cars, not trading results.' },
  ],
  cues: [
    { t: 0.7, sfx: 'rev' },
    { t: T.jump + 0.05, sfx: 'tyres' },
    { t: T.jump + 1.45, sfx: 'flash' },
    { t: T.green + 0.2, sfx: 'blip' },
    { t: T.green + 1.0, sfx: 'ding' },
  ],
  variants: {
    personal: {
      bug: false,
      scenes: { kicker: null, end: { cta: 'Follow for the next one', sub: 'Wait for your green.' } },
    },
  },
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
