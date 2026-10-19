// The Fast Lane · 6 · Test Drive. His car at night with a TEST DRIVE sticker on the door glass, the
// door up, him at the wheel: you'd never buy this without a test drive. The door comes down, the sat
// nav says TEST DRIVE, 30 min. So why go live without a demo? Learn how it handles: the brakes, the
// bends, the blind spots. A demo account is your test drive. Did you test drive your strategy? Drift
// phonk at 140 bpm (its second riff), the cuts on its bars. The car is a cartoon prop, not a trading
// result. The base cut is for the TCP account; --variant=personal is the founder's own account.
// Notes: brand/video/reels/EPISODES.md.

const B = 60 / 140 * 4;
const T = { wide: B, start: 2 * B, road: 3 * B, handle: 5 * B, bend: 6 * B, face: 8 * B, ask: 10 * B, end: 12 * B };

const SEAT = { arms: 'rest', look: [-0.5, 0.05], lid: 0.3, brow: [0.15, 0.3], mouth: { smirk: 0.9, smile: 0.1 } };
const AHEAD = { arms: 'wheel', look: [1, 0.05], lid: 0.32, brow: [0, 0.1], mouth: { smile: 0 } };
const FOCUS = { arms: 'wheel', lean: 2, look: [1, 0.1], lid: 0.24, brow: [-0.2, 0.1], mouth: { smile: -0.05 } };
const CALM = { arms: 'wheel', look: [0.9, 0], lid: 0.3, brow: [0.1, 0.2], mouth: { smirk: 0.7, smile: 0.1 } };
const ASK = { arms: 'wheel', look: [-0.6, 0.05], lid: 0.26, brow: [0.5, 0.45], mouth: { smile: 0.15 } };
const P = (t, pose) => ({ t, pose });
const POSE = [
  P(0, SEAT), P(T.start - 0.02, SEAT), P(T.start, AHEAD), P(T.handle - 0.02, AHEAD), P(T.handle, FOCUS), P(T.bend - 0.02, FOCUS),
  P(T.bend, CALM), P(T.ask - 0.02, CALM), P(T.ask, ASK), P(T.end, ASK),
];
const ROAD = [{ t: T.road, speed: 38, bend: 0 }, { t: T.handle, speed: 52, bend: -0.2 }, { t: T.bend, speed: 46, bend: 0.1 }, { t: T.bend + 1.3, speed: 40, bend: 0.55 }, { t: T.face, speed: 44, bend: 0.3 }];
const DASH = [{ t: T.start, speed: 0, fuel: 0.95, brake: 0 }, { t: T.road, speed: 30, fuel: 0.95, brake: 0 }, { t: T.handle, speed: 52, fuel: 0.94, brake: 0 },
  { t: T.handle + 0.6, speed: 52, fuel: 0.94, brake: 1 }, { t: T.handle + 1.2, speed: 40, fuel: 0.94, brake: 0 }, { t: T.end, speed: 44, fuel: 0.93, brake: 0 }];
const SIGN = [{ kind: 'bend', side: -0.58, keys: [{ t: T.road + 1.6, z: 1 }, { t: T.bend + 1.0, z: 0.03, ease: 'linear' }] }];

const shot = (set, a, b, cam, more = {}) => ({ kind: 'toon', set, from: a, to: b, cam, pose: POSE, road: ROAD, dash: DASH, sign: SIGN, tag: 'TEST DRIVE',
  nav: [[0, 'TEST DRIVE', '30 min · demo'], [T.handle, 'TEST DRIVE', '24 min left']],
  flow: [{ t: 0, k: 0 }, { t: T.start + 1.0, k: 0 }, { t: T.road, k: 0.4 }, { t: T.road + 0.3, k: 0.6 }],
  door: [{ t: 0, k: 1 }, { t: T.wide + 0.25, k: 1 }, { t: T.wide + 1.15, k: 0 }], lights: [{ t: 0, k: 0.15 }, { t: T.wide + 1.2, k: 0.15 }, { t: T.wide + 1.3, k: 1 }], fi: 0.01, fo: 0.01, ...more });
const CAR = (a, b) => shot('street', a, b, [{ t: a, s: 0.94, x: 540, y: 1330 }, { t: b, s: 1.0, x: 532, y: 1334, ease: 'linear' }], { dof: { bg: 2, mid: 1 } });
const DOOR = (a, b) => shot('street', a, b, [{ t: a, s: 2.1, x: 500, y: 1298 }, { t: b, s: 2.2, x: 496, y: 1300, ease: 'linear' }], { dof: { bg: 6, mid: 3 } });
const POV = (a, b) => shot('road', a, b, [{ t: a, s: 1.0, x: 540, y: 960 }, { t: b, s: 1.03, x: 540, y: 950, ease: 'linear' }]);
const WHEEL = (a, b) => shot('driver', a, b, [{ t: a, s: 1.5, x: 530, y: 740 }, { t: b, s: 1.56, x: 532, y: 736, ease: 'linear' }], { dof: { bg: 3 } });
const FACE = (a, b) => shot('driver', a, b, [{ t: a, s: 2.05, x: 372, y: 880 }, { t: b, s: 2.18, x: 372, y: 874, ease: 'linear' }], { dof: { bg: 6 }, screen: false });
const LINE = (text, a, b, more = {}) => ({ kind: 'caption', from: a, to: b, y: 300, text, fi: 0.01, fo: 0.01, ...more });

const SPEC = {
  title: 'The Fast Lane · 6 · Test Drive',
  outfit: 'gucci-varsity',
  modules: ['toon/founder.js', 'toon/toon.js', 'toon/fastlane.js'],
  duration: T.end + 2.4,
  cover: 0.9,
  style: 'phonk',
  bpm: 140,
  seed: 106,
  sound: false,
  sfx: true,
  scenes: [
    // 1 · the hook: the TEST DRIVE sticker, the door up, him at the wheel; the door comes down
    DOOR(0, T.wide),
    CAR(T.wide, T.start),
    { id: 'kicker', kind: 'kicker', from: -0.5, to: T.start, y: 250, text: 'The Fast Lane · 6', fi: 0.01 },
    { id: 'hook', kind: 'caption', from: -0.5, to: T.start, y: 300, text: 'you’d never buy this\nwithout a *test drive.*', sfx: false, fi: 0.01 },
    // 2 · the engine wakes; the sat nav says TEST DRIVE
    WHEEL(T.start, T.road),
    // 3 · on the road
    POV(T.road, T.handle),
    LINE('so why go live\nwithout a *demo?*', T.road + 0.1, T.handle),
    WHEEL(T.handle, T.bend),
    LINE('learn how\nit *handles.*', T.handle + 0.1, T.bend),
    POV(T.bend, T.face),
    LINE('the brakes.\nthe bends.', T.bend + 0.1, T.bend + 1.7),
    LINE('the *blind spots.*', T.bend + 1.7, T.face),
    // 4 · the lesson
    FACE(T.face, T.ask),
    LINE('a demo account\nis your *test drive.*', T.face + 0.1, T.ask),
    WHEEL(T.ask, T.end),
    LINE('did you test drive\nyour strategy?', T.ask + 0.1, T.end),
    // 5 · the end card: one ask
    { id: 'end', kind: 'end', from: T.end, to: T.end + 2.4, cta: 'Follow TCP', sub: 'One lesson an episode.', fo: 0.01,
      risk: 'Education, not financial advice. Trading carries risk.\nA cartoon car, not a trading result.' },
  ],
  cues: [
    { t: T.wide + 1.1, sfx: 'door' },
    { t: T.wide + 1.3, sfx: 'click' },
    { t: T.start + 0.25, sfx: 'rev' },
    { t: T.start + 0.9, sfx: 'gps' },
    { t: T.handle + 0.6, sfx: 'tyres' },
    { t: T.bend + 0.3, sfx: 'indicator' },
  ],
  variants: {
    personal: {
      bug: false,
      scenes: { kicker: null, end: { cta: 'Follow for the next one', sub: 'A demo account is your test drive.' } },
    },
  },
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
