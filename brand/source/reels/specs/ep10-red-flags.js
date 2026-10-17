// EP10 · The Museum of Red Flags. The master brief's EP10 (what a good trading group actually looks
// like), reworked without the word "free": habits, not a sign-up. FOMO tours a museum. Gallery 1, red
// flags in glass cases: the rented Lambo (is that his?! A car is not a track record); the screenshot
// that never posts a loss (FOMO presses on the glass, I WANT IN!!, the alarm goes off and PATIENCE, the
// guard, says don't touch); the GUARANTEED stamp. Gallery 2, green flags: the plan posted before the
// result, an example record with its losses. FOMO yawns: boring. The founder, the guide: boring is a
// green flag. Seen any red flags in your DMs? No voice: a gallery's minuet on a harpsichord over the
// hall's quiet. The base cut is for the TCP account; --variant=personal is the founder's own account.
// The plan and the record are examples; the exhibits and the characters are made up. Production
// notes: brand/video/reels/EPISODES.md.

// The story's moments, in seconds.
const T = { lambo: 2.4, win: 4.6, alarm: 6.0, guar: 8.6, green: 10.6, plan: 13.0, losses: 14.8, him: 16.6, ask: 18.6, end: 20.6 };

// him, the guide, at the lectern in gallery 2
const GUIDE = { arms: 'desk', lean: 2, look: [0.9, 0.1], lid: 0.3, brow: [0.1, 0.25], mouth: { smile: 0.2 } };
const SMIRK = { arms: 'desk', lean: 2, look: [0.6, 0.05], lid: 0.3, brow: [0, 0.35], mouth: { smirk: 1, smile: 0.1 } };
const ASK = { arms: 'desk', lean: 2, look: [-0.3, 0.05], lid: 0.28, brow: [0.45, 0.4], mouth: { smile: 0.2 } };
const P = (t, pose, ease) => ({ t, pose, ease });
const POSE = [
  P(0, GUIDE), P(T.him - 0.02, GUIDE),
  P(T.him, SMIRK), P(T.him + 0.4, { ...SMIRK, head: { rot: 4 } }), P(T.him + 0.8, { ...SMIRK, head: { rot: 0 } }), P(T.ask - 0.02, SMIRK),
  P(T.ask, ASK), P(T.end, ASK),
];

// FOMO on the tour
const F = { y: 1720, s: 1.3 };
const WOW = { legs: 'walk', arms: 'down', face: 1, look: [0.5, -0.6], brow: { raise: 0.8 }, mouth: { smile: 0.5, open: 0.45, teeth: 1 } };
const LOOK = { legs: 'stand', arms: 'point', face: 1, look: [1, -0.4], shake: 0.35, brow: { raise: 0.9 }, mouth: { smile: 0.7, open: 0.5, teeth: 1 } };
const PRESS = { legs: 'stand', arms: 'grab', face: 1, lean: 10, look: [1, -0.3], shake: 0.6, brow: { raise: 1 }, mouth: { smile: 0.8, open: 0.6, teeth: 1 } };
const ALARM = { legs: 'stand', arms: 'up', face: 1, hop: 30, lid: 0, look: [0.4, -0.4], shake: 1, brow: { raise: 1, worry: 0.6 }, mouth: { open: 0.8, o: 1, teeth: 0 } };
const CAUGHT = { legs: 'stand', arms: 'down', face: 1, look: [1, 0.1], lid: 0.35, shake: 0.2, brow: { worry: 0.6 }, mouth: { smile: -0.3, open: 0, teeth: 0 } };
const STAMP = { legs: 'stand', arms: 'down', face: 1, look: [1, -0.4], brow: { raise: 0.8 }, mouth: { smile: 0.4, open: 0.35, teeth: 1 } };
const YAWN = { legs: 'stand', arms: 'down', face: 1, look: [0.3, -0.2], lid: 0.85, shake: 0, brow: { raise: 0.2 }, mouth: { open: 0.9, o: 1, teeth: 0 } };
const BORED = { ...YAWN, lid: 0.55, mouth: { open: 0, o: 0, smile: -0.35 } };
const FOMO = [
  { t: 0, x: 120, y: 1840, s: 1.6, pose: WOW }, { t: T.lambo - 0.01, x: 420, y: 1840, s: 1.6, pose: WOW, ease: 'linear' },
  { t: T.lambo, x: 470, ...F, pose: LOOK, ease: 'step' }, { t: T.win - 0.01, x: 480, ...F, pose: LOOK },
  { t: T.win, x: 1310, ...F, pose: LOOK, ease: 'step' }, { t: T.win + 0.5, x: 1355, ...F, pose: PRESS }, { t: T.alarm - 0.02, x: 1360, ...F, pose: PRESS },
  { t: T.alarm + 0.12, x: 1330, ...F, pose: ALARM, ease: 'out' }, { t: T.alarm + 0.5, x: 1320, ...F, pose: ALARM }, { t: T.alarm + 0.8, x: 1320, ...F, pose: CAUGHT },
  { t: T.guar, x: 2120, ...F, pose: STAMP, ease: 'step' }, { t: T.green - 0.01, x: 2130, ...F, pose: STAMP },
  { t: T.green, x: 3430, ...F, pose: BORED, ease: 'step' }, { t: T.green + 0.5, x: 3430, ...F, pose: YAWN }, { t: T.green + 1.6, x: 3430, ...F, pose: YAWN },
  { t: T.green + 2.0, x: 3430, ...F, pose: BORED }, { t: 24, x: 3430, ...F, pose: BORED },
];

// PATIENCE, the guard, with its tea
const G = { y: 1720, s: 1.15 };
const GUARD = { arms: 'tea', legs: 'stand', face: -1, lid: 0.45, look: [-1, 0.1], brow: { raise: 0.2 }, mouth: { smile: 0.1 } };
const PATIENCE = [
  { t: 0, x: 1900, ...G, pose: { ...GUARD, legs: 'walk' } }, { t: T.alarm + 0.2, x: 1900, ...G, pose: { ...GUARD, legs: 'walk' } },
  { t: T.alarm + 0.55, x: 1650, ...G, pose: { ...GUARD, legs: 'walk' }, ease: 'out' }, { t: T.alarm + 0.6, x: 1650, ...G, pose: GUARD },
  { t: T.green, x: 3690, ...G, pose: { ...GUARD, look: [-0.6, 0], mouth: { smile: 0.35 } }, ease: 'step' }, { t: 24, x: 3690, ...G, pose: { ...GUARD, look: [-0.6, 0], mouth: { smile: 0.35 } } },
];

const shot = (set, a, b, cam, more = {}) => ({ kind: 'toon', set, from: a, to: b, cam, pose: POSE, cast: { fomo: FOMO, patience: PATIENCE }, alarm: T.alarm, fi: 0.01, fo: 0.01, ...more });
const HALL = (a, b, c0, c1, more) => shot('museum', a, b, [{ t: a, ...c0 }, { t: b, ...c1, ease: 'linear' }], { dof: { bg: 2 }, ...more });
const FACE = (a, b) => shot('gallery', a, b, [{ t: a, s: 2.05, x: 400, y: 900 }, { t: b, s: 2.2, x: 400, y: 894, ease: 'linear' }], { dof: { bg: 7 }, cast: {} });
const SAY = (who, text, a, b, x, y, tail = 'b', more = {}) => ({ kind: 'bubble', who, text, from: a, to: b, x, y, tail, fo: 0.01, ...more });

const SPEC = {
  title: 'EP10 · The Museum of Red Flags',
  outfit: 'dior-crew',
  modules: ['toon/founder.js', 'toon/toon.js', 'toon/cast.js', 'toon/places.js'],
  duration: 23.4,
  cover: 0.9,
  style: 'classical',
  bpm: 100,
  seed: 10,
  ambience: 'hall',
  sound: false,
  sfx: true,
  scenes: [
    // 1 · the hook: the museum's entrance
    HALL(0, T.lambo, { s: 1.0, x: 560, y: 1200 }, { s: 1.04, x: 566, y: 1204 }),
    // 2 · the rented Lambo
    HALL(T.lambo, T.win, { s: 1.3, x: 640, y: 1270 }, { s: 1.34, x: 650, y: 1270 }),
    SAY('fomo', 'IS THAT HIS?!', T.lambo + 0.15, T.lambo + 1.0, 470, 820, 'bl'),
    { kind: 'caption', from: T.lambo + 1.05, to: T.win, y: 230, text: 'a car is not\na track record.', fi: 0.01, fo: 0.01 },
    // 3 · the screenshot that never posts a loss; the alarm; the guard
    HALL(T.win, T.guar, { s: 1.3, x: 1480, y: 1270 }, { s: 1.34, x: 1490, y: 1270 }),
    SAY('fomo', '100%?!\nI WANT IN!!', T.win + 0.15, T.alarm - 0.05, 400, 440, 'b', { size: 54 }),
    SAY('patience', 'don’t touch.', T.alarm + 0.6, T.alarm + 1.55, 760, 860, 'br', { sfx: false }),
    { kind: 'caption', from: T.alarm + 1.6, to: T.guar, y: 230, text: 'no losses shown?\n*red flag.*', fi: 0.01, fo: 0.01 },
    // 4 · GUARANTEED
    HALL(T.guar, T.green, { s: 1.3, x: 2280, y: 1270 }, { s: 1.34, x: 2290, y: 1270 }),
    { kind: 'caption', from: T.guar + 0.1, to: T.green, y: 230, text: '*guaranteed?*\nnothing is.', fi: 0.01, fo: 0.01 },
    // 5 · gallery 2: the green flags, and FOMO bored
    HALL(T.green, T.plan, { s: 0.86, x: 3550, y: 1160 }, { s: 0.9, x: 3556, y: 1160 }),
    SAY('fomo', '…BORING.', T.green + 0.5, T.plan, 420, 960, 'br'),
    // 6 · the plan, posted before the result
    HALL(T.plan, T.losses, { s: 1.7, x: 3250, y: 890 }, { s: 1.76, x: 3250, y: 890 }, { dof: {}, cast: {} }),
    { kind: 'caption', from: T.plan + 0.1, to: T.losses, y: 230, text: 'the plan, posted\n*before* the result.', fi: 0.01, fo: 0.01 },
    // 7 · the losses, shown too
    HALL(T.losses, T.him, { s: 1.7, x: 3850, y: 890 }, { s: 1.76, x: 3850, y: 890 }, { dof: {}, cast: {} }),
    { kind: 'caption', from: T.losses + 0.1, to: T.him, y: 230, text: 'the losses,\nshown too.', fi: 0.01, fo: 0.01 },
    // 8 · the guide
    FACE(T.him, T.ask),
    { kind: 'caption', from: T.him + 0.1, to: T.ask, y: 300, text: 'boring is\na *green flag.*', fi: 0.01, fo: 0.01 },
    FACE(T.ask, T.end),
    { kind: 'caption', from: T.ask + 0.05, to: T.end, y: 300, text: 'seen any red flags\nin your DMs?', fi: 0.01, fo: 0.01 },
    // 9 · the end card: one ask
    { id: 'end', kind: 'end', from: T.end, to: 23.4, cta: 'Follow TCP', sub: 'One lesson an episode.', fo: 0.01,
      risk: 'Education, not financial advice. Trading carries risk.\nExample plan and record, not real trades. The characters are made up.' },
  ],
  cues: [
    { t: T.alarm, sfx: 'alarm' }, { t: T.alarm + 0.01, sfx: 'mute', until: T.alarm + 1.6 },
    { t: T.green, sfx: 'whoosh' },
    { t: T.him, sfx: 'whoosh' },
    { t: T.end, sfx: 'whoosh' },
  ],
  variants: {
    personal: {
      bug: false,
      scenes: { end: { cta: 'Follow for the next one', sub: 'Boring is a green flag.' } },
    },
  },
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
