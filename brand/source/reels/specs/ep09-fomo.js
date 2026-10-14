// EP09 · If FOMO Was a Person. In a café by day, FOMO (toon/cast.js) pops up from behind the
// founder's flat white: it's pumping. It shoves its phone at him (everyone's in), pulls his sleeve
// towards the laptop, shouts last chance at the green candle, and the chart turns. …nvm. FOMO buys
// the top; the plan waits for the pullback. Then the next green candle, and FOMO's back: every
// single time, so the end runs into the start. From the master brief's EP09. No voice: a cartoon's
// bounce at 128 bpm, the cuts on its bars. The base cut is for the TCP account; --variant=personal is
// the founder's own account. The chart is EP08's example chart (labelled on it); the characters are
// made up. Production notes: brand/video/reels/EPISODES.md.

// The story's moments, in seconds: a bar is 1.875 s.
const T = { show: 1.875, pull: 3.75, last: 5.625, dump: 7.5, him: 9.375, plan: 11.25, again: 13.125, end: 15.0 };

const DEADPAN = { arms: 'fold', lean: -2, look: [0.75, 0.4], lid: 0.44, brow: [0.15, 0.2], mouth: { smile: -0.15 } };
const SIDE_EYE = { arms: 'fold', lean: -2.5, look: [-1, 0.08], lid: 0.46, brow: [0.25, -0.15], mouth: { smile: -0.25 } };
const SMIRK = { arms: 'fold', lean: -2, look: [0.6, 0.05], lid: 0.3, brow: [0, 0.35], mouth: { smirk: 1, smile: 0.1 } };
const ROLL = { arms: 'fold', lean: -2.5, look: [0.15, -0.85], lid: 0.2, brow: [0.5, 0.6], mouth: { smile: -0.2 } };
const P = (t, pose, ease) => ({ t, pose, ease });
const POSE = [
  P(0, DEADPAN), P(T.pull - 0.02, DEADPAN),
  P(T.pull, SIDE_EYE), P(T.last - 0.02, SIDE_EYE),
  P(T.last, DEADPAN), P(T.him - 0.02, DEADPAN),
  P(T.him, SMIRK), P(T.him + 0.4, { ...SMIRK, head: { rot: 4 } }), P(T.him + 0.8, { ...SMIRK, head: { rot: 0 } }), P(T.again - 0.02, SMIRK),
  P(T.again, DEADPAN), P(T.again + 0.6, DEADPAN), P(T.again + 0.9, ROLL), P(T.end, ROLL),
];

// EP08's example chart, live: the rally, the turn, and the next push
const C = (t, i, ease) => ({ t, story: 'clutter', i, ind: 0, ease });
const CHART = [C(0, 38.4), C(T.dump, 45.3, 'linear'), C(T.dump + 1.5, 51.4, 'linear'), C(T.again, 53.2, 'linear'), C(T.end + 2.8, 56.5, 'linear')];

// FOMO on the counter (its top is at y 1448; it stands at y 1500)
const HYPE = { arms: 'up', look: [-0.6, -0.2], mouth: { open: 0.6, smile: 0.5, teeth: 1 } };
const SAG = { arms: 'down', squash: 0.6, lid: 0.45, brow: { worry: 1, raise: 0 }, look: [0.2, 0.7], mouth: { smile: -0.6, open: 0, teeth: 0 }, shake: 0 };
const hops = (a, b, x) => { const k = []; for (let t = a, j = 0; t < b; t += 0.234, j++) k.push({ t, x, y: 1500, s: 1, pose: { arms: 'point', look: [1, -0.4], hop: j % 2 ? 26 : 0, mouth: { open: 0.55, smile: 0.4, teeth: 1 } }, ease: 'out' }); return k; };
const FOMO = [
  { t: 0, x: 660, y: 1720, s: 1, pose: HYPE }, { t: 0.22, x: 660, y: 1720, s: 1, pose: HYPE },
  { t: 0.55, x: 660, y: 1500, s: 1, pose: HYPE, ease: 'back' },
  { t: T.show - 0.05, x: 660, y: 1500, s: 1, pose: HYPE },
  { t: T.show + 0.1, x: 660, y: 1500, s: 1, pose: { arms: 'phone', face: -1, screen: '+$4,000', look: [-0.8, -0.1], mouth: { open: 0.5, smile: 0.6, teeth: 1 } } },
  { t: T.pull - 0.05, x: 660, y: 1500, s: 1, pose: { arms: 'phone', face: -1, screen: '+$4,000', look: [-0.8, -0.1], mouth: { open: 0.5, smile: 0.6, teeth: 1 } } },
  { t: T.pull + 0.15, x: 640, y: 1500, s: 1, pose: { arms: 'pull', face: -1, legs: 'walk', lean: -16, look: [-1, 0], brow: { worry: 0.7 }, mouth: { open: 0.35, smile: -0.3, teeth: 1 } } },
  { t: T.last - 0.1, x: 650, y: 1500, s: 1, pose: { arms: 'pull', face: -1, legs: 'walk', lean: -18, look: [-1, 0], brow: { worry: 0.9 }, mouth: { open: 0.45, smile: -0.4, teeth: 1 } } },
  ...hops(T.last + 0.05, T.dump, 720),
  { t: T.dump, x: 720, y: 1500, s: 1, pose: { arms: 'point', look: [1, -0.2], mouth: { open: 0.4, smile: -0.2, teeth: 0 }, shake: 0 } },
  { t: T.dump + 0.35, x: 720, y: 1500, s: 1, pose: { arms: 'down', look: [1, 0], lid: 0, brow: { raise: 1 }, mouth: { open: 0.3, smile: -0.2, teeth: 0 }, shake: 0 } },
  { t: T.dump + 0.75, x: 720, y: 1500, s: 1, pose: SAG },
  { t: T.again - 0.05, x: 720, y: 1500, s: 1, pose: SAG },
  { t: T.again + 0.3, x: 700, y: 1500, s: 1, pose: { ...HYPE, look: [-0.5, -0.3], hop: 30, legs: 'tuck' }, ease: 'back' },
  { t: T.again + 0.6, x: 700, y: 1500, s: 1, pose: { ...HYPE, look: [-0.5, -0.3] } },
];

const shot = (a, b, cam, more = {}) => ({ kind: 'toon', set: 'cafe', from: a, to: b, cam, pose: POSE, chart: CHART, cast: { fomo: FOMO }, fi: 0.01, fo: 0.01, ...more });
const WIDE = (a, b) => shot(a, b, [{ t: a, s: 1.15, x: 570, y: 1060 }, { t: b, s: 1.2, x: 575, y: 1062, ease: 'linear' }], { dof: { bg: 3 } });
const TABLE = (a, b) => shot(a, b, [{ t: a, s: 1.6, x: 640, y: 1330 }, { t: b, s: 1.68, x: 640, y: 1334, ease: 'linear' }], { dof: { bg: 5 } });
const LAPTOP = (a, b) => shot(a, b, [{ t: a, s: 1.55, x: 830, y: 1290 }, { t: b, s: 1.62, x: 834, y: 1292, ease: 'linear' }], { dof: { bg: 5 } });
const FACE = (a, b) => shot(a, b, [{ t: a, s: 2.05, x: 400, y: 900 }, { t: b, s: 2.2, x: 400, y: 894, ease: 'linear' }], { dof: { bg: 7 } });
const SAY = (text, a, b, x, y, more = {}) => ({ kind: 'bubble', who: 'fomo', text, from: a, to: b, x, y, tail: 'b', fo: 0.01, ...more });

const SPEC = {
  title: 'EP09 · If FOMO Was a Person',
  modules: ['toon/founder.js', 'toon/toon.js', 'toon/cast.js', 'toon/places.js'],
  duration: 17.8,
  cover: 0.9,
  style: 'bounce',
  bpm: 128,
  seed: 9,
  sound: false,
  sfx: true,
  scenes: [
    // 1 · the hook: FOMO pops up behind his coffee
    WIDE(0, T.show),
    { id: 'hook', kind: 'caption', from: -0.5, to: T.show, y: 230, text: 'if FOMO\nwas a person:', sfx: false, fi: 0.01 },
    SAY('IT’S PUMPING!!', 0.55, T.show, 720, 1010, { tail: 'bl' }),
    // 2 · everyone's in
    TABLE(T.show, T.pull), SAY('EVERYONE’S IN!', T.show + 0.1, T.pull, 520, 560),
    // 3 · the sleeve
    WIDE(T.pull, T.last), SAY('COME ONNN!', T.pull + 0.2, T.last, 730, 1010, { tail: 'bl' }),
    // 4 · last chance, at the laptop
    LAPTOP(T.last, T.dump), SAY('LAST CHANCE!!', T.last + 0.1, T.dump, 470, 520),
    // 5 · the turn
    LAPTOP(T.dump, T.him), SAY('…nvm.', T.dump + 0.8, T.him, 380, 820, { size: 52, sfx: false }),
    // 6 · the lesson
    FACE(T.him, T.again),
    { kind: 'caption', from: T.him + 0.1, to: T.plan, y: 300, text: 'FOMO buys the top.', fi: 0.01, fo: 0.01 },
    { kind: 'caption', from: T.plan, to: T.again, y: 300, text: 'the plan waits\nfor the *pullback.*', fi: 0.01, fo: 0.01 },
    // 7 · and it's back
    WIDE(T.again, T.end), SAY('IT’S PUMPING!!', T.again + 0.3, T.end, 730, 1010, { tail: 'bl' }),
    { kind: 'caption', from: T.again + 0.05, to: T.end, y: 230, text: 'every. single. time.', fi: 0.01, fo: 0.01 },
    // 8 · the end card: one ask
    { id: 'end', kind: 'end', from: T.end, to: 17.8, cta: 'Follow TCP', sub: 'One lesson an episode.', fo: 0.01,
      risk: 'Education, not financial advice. Trading carries risk.\nExample chart, not real trades. The characters are made up.' },
  ],
  cues: [
    { t: 0.3, sfx: 'boing' },
    ...[0, 2, 4].map((j) => ({ t: T.last + 0.05 + j * 0.234, sfx: 'boing' })),
    { t: T.dump + 0.7, sfx: 'mute', until: T.him },
    { t: T.dump + 0.75, sfx: 'wah' },
    { t: T.again + 0.1, sfx: 'boing' },
    { t: T.end, sfx: 'whoosh' },
  ],
  variants: {
    personal: {
      bug: false,
      scenes: { end: { cta: 'Follow for the next one', sub: 'If FOMO was a person.' } },
    },
  },
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
