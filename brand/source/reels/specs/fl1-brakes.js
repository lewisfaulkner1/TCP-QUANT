// The Fast Lane · 1 · The Brakes. His car at night, the door up, him in the driver's seat: the
// fastest cars have the best brakes. The door comes down, the engine wakes, the road at speed: not to
// go slow, but to take the bends. He brakes before the bend (the brake light on the dash, the speed
// falling): your stop loss is your brakes. Through the bend: set it before the bend, not in it. No
// brakes isn't brave; it's a crash. Back on the street, would you drive this without brakes? It
// revs and pulls away. Drift phonk at 140 bpm, the
// cuts on its bars. The car is a cartoon prop, not a trading result. The base cut is for the TCP
// account; --variant=personal is the founder's own account. Notes: brand/video/reels/EPISODES.md.

const B = 60 / 140 * 4;
const T = { wide: B, start: 2 * B, road: 3 * B, brake: 5 * B, bend: 6 * B, face: 8 * B, ask: 10 * B, end: 12 * B };

const SEAT = { arms: 'rest', look: [-0.5, 0.05], lid: 0.3, brow: [0.15, 0.3], mouth: { smirk: 0.9, smile: 0.1 } };
const AHEAD = { arms: 'wheel', look: [1, 0.05], lid: 0.32, brow: [0, 0.1], mouth: { smile: 0 } };
const BRAKE = { arms: 'wheel', lean: 3, look: [1, 0.1], lid: 0.2, brow: [-0.5, -0.4], mouth: { smile: -0.2 } };
const CALM = { arms: 'wheel', look: [0.9, 0], lid: 0.3, brow: [0.1, 0.2], mouth: { smirk: 0.6, smile: 0.1 } };
const ASK = { arms: 'wheel', look: [-0.6, 0.05], lid: 0.26, brow: [0.5, 0.45], mouth: { smile: 0.15 } };
const P = (t, pose) => ({ t, pose });
const POSE = [
  P(0, SEAT), P(T.start - 0.02, SEAT),
  P(T.start, AHEAD), P(T.brake - 0.02, AHEAD), P(T.brake, BRAKE), P(T.bend - 0.02, BRAKE),
  P(T.bend, CALM), P(T.face + 1.2, CALM), P(T.face + 1.7, { ...CALM, mouth: { smirk: 1, smile: 0.2 } }), P(T.ask - 0.02, { ...CALM, mouth: { smirk: 1, smile: 0.2 } }),
  P(T.ask, ASK), P(T.end, ASK),
];

// the road: speed in mph, the bend (0 straight, 0.6 to the right)
const ROAD = [
  { t: T.road, speed: 82, bend: 0 }, { t: T.brake, speed: 124, bend: 0, ease: 'linear' },
  { t: T.bend, speed: 58, bend: 0.05 }, { t: T.bend + 1.2, speed: 56, bend: 0.62 }, { t: T.face, speed: 58, bend: 0.6, ease: 'linear' },
];
const DASH = [
  { t: T.start, speed: 0, fuel: 0.82, brake: 0 }, { t: T.road, speed: 30, fuel: 0.82, brake: 0 }, { t: T.road + 0.2, speed: 82, fuel: 0.82, brake: 0 }, { t: T.brake, speed: 124, fuel: 0.8, brake: 0 },
  { t: T.brake + 0.15, speed: 120, fuel: 0.8, brake: 1, ease: 'out' }, { t: T.bend - 0.2, speed: 60, fuel: 0.8, brake: 1, ease: 'linear' },
  { t: T.bend, speed: 58, fuel: 0.8, brake: 0 }, { t: T.end, speed: 66, fuel: 0.79, brake: 0 },
];
const SIGN = [{ kind: 'bend', side: -0.58, keys: [{ t: T.road + 1.9, z: 1 }, { t: T.brake, z: 0.42, ease: 'linear' }, { t: T.bend, z: 0.42 }, { t: T.bend + 2.2, z: 0.03, ease: 'linear' }] }];

const shot = (set, a, b, cam, more = {}) => ({ kind: 'toon', set, from: a, to: b, cam, pose: POSE, road: ROAD, dash: DASH, sign: SIGN,
  // the car pulls away at the end, gone just before the end card
  drive: [{ t: T.ask + 1.6, x: 0 }, { t: T.end + 0.6, x: -2000 }],
  flow: [{ t: 0, k: 0 }, { t: T.start + 1.0, k: 0 }, { t: T.road, k: 0.5 }, { t: T.road + 0.3, k: 1 }],
  door: [{ t: 0, k: 1 }, { t: T.wide + 0.25, k: 1 }, { t: T.wide + 1.15, k: 0 }], lights: [{ t: 0, k: 0.15 }, { t: T.wide + 1.2, k: 0.15 }, { t: T.wide + 1.3, k: 1 }], fi: 0.01, fo: 0.01, ...more });
const CAR = (a, b) => shot('street', a, b, [{ t: a, s: 1.1, x: 540, y: 1270 }, { t: b, s: 1.22, x: 520, y: 1290, ease: 'linear' }], { dof: { bg: 2, mid: 1 } });
const DOOR = (a, b) => shot('street', a, b, [{ t: a, s: 2.7, x: 470, y: 1300 }, { t: b, s: 2.85, x: 466, y: 1302, ease: 'linear' }], { dof: { bg: 6, mid: 3 } });
const POV = (a, b) => shot('road', a, b, [{ t: a, s: 1.0, x: 540, y: 960 }, { t: b, s: 1.03, x: 540, y: 950, ease: 'linear' }]);
const WHEEL = (a, b) => shot('driver', a, b, [{ t: a, s: 1.5, x: 530, y: 740 }, { t: b, s: 1.56, x: 532, y: 736, ease: 'linear' }], { dof: { bg: 3 } });
const FACE = (a, b) => shot('driver', a, b, [{ t: a, s: 2.05, x: 372, y: 880 }, { t: b, s: 2.18, x: 372, y: 874, ease: 'linear' }], { dof: { bg: 6 }, screen: false });
const LINE = (text, a, b, more = {}) => ({ kind: 'caption', from: a, to: b, y: 300, text, fi: 0.01, fo: 0.01, ...more });

const SPEC = {
  title: 'The Fast Lane · 1 · The Brakes',
  outfit: 'versace-zip',
  modules: ['toon/founder.js', 'toon/toon.js', 'toon/fastlane.js'],
  duration: T.end + 2.4,
  cover: 0.9,
  style: 'phonk',
  bpm: 140,
  seed: 101,
  sound: false,
  sfx: true,
  scenes: [
    // 1 · the hook: him at the wheel, the door up; then the whole car as the door comes down
    DOOR(0, T.wide),
    CAR(T.wide, T.start),
    { id: 'kicker', kind: 'kicker', from: -0.5, to: T.start, y: 250, text: 'The Fast Lane · 1', fi: 0.01 },
    { id: 'hook', kind: 'caption', from: -0.5, to: T.start, y: 300, text: 'the fastest cars\nhave the best *brakes.*', sfx: false, fi: 0.01 },
    // 2 · the engine wakes
    WHEEL(T.start, T.road),
    // 3 · at speed
    POV(T.road, T.brake),
    LINE('not to go slow.', T.road + 0.1, T.road + 1.75),
    LINE('to take\nthe *bends.*', T.road + 1.75, T.brake),
    // 4 · he brakes before the bend
    WHEEL(T.brake, T.bend),
    LINE('your stop loss\nis your *brakes.*', T.brake + 0.1, T.bend),
    // 5 · through the bend
    POV(T.bend, T.face),
    LINE('set them *before*\nthe bend.', T.bend + 0.1, T.bend + 1.8),
    LINE('not *in* it.', T.bend + 1.8, T.face),
    // 6 · the lesson
    FACE(T.face, T.ask),
    LINE('no brakes\nisn’t brave.', T.face + 0.1, T.face + 1.7),
    LINE('it’s a *crash.*', T.face + 1.7, T.ask),
    CAR(T.ask, T.end),
    LINE('would you drive this\nwithout brakes?', T.ask + 0.1, T.end),
    // 7 · the end card: one ask
    { id: 'end', kind: 'end', from: T.end, to: T.end + 2.4, cta: 'Follow TCP', sub: 'One lesson an episode.', fo: 0.01,
      risk: 'Education, not financial advice. Trading carries risk.\nA cartoon car, not a trading result.' },
  ],
  cues: [
    { t: T.wide + 1.1, sfx: 'door' },
    { t: T.wide + 1.3, sfx: 'click' },
    { t: T.start + 0.25, sfx: 'rev' },
    { t: T.brake + 0.05, sfx: 'tyres' },
    { t: T.bend + 0.3, sfx: 'indicator' },
    { t: T.ask + 1.45, sfx: 'rev' },
  ],
  variants: {
    personal: {
      bug: false,
      scenes: { kicker: null, end: { cta: 'Follow for the next one', sub: 'Your stop loss is your brakes.' } },
    },
  },
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
