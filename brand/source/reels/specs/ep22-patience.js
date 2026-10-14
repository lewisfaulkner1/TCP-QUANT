// EP22 · The Rarest Trader in the Wild. A wildlife film at a savanna's watering hole: PATIENCE
// (toon/cast.js) fishing from the bank with its tea, the rod propped on a forked stick. FOMO runs in,
// THERE'S ONE!!, dives at a ripple and comes up with an old boot: GOT ONE!! The young ones chase every
// ripple. In his hide on the bank, the founder whispers: this one hasn't moved in 4 hours. Night comes
// and goes (a time-lapse). Still waiting. Then the float goes under: the setup. One trade, a gold fish,
// and it goes home. Most of trading is waiting. Be honest: which one are you? No voice: a wildlife
// film's score (strings, marimba, a flute) over the savanna's birds and insects; the captions are the
// narration. The base cut is for the TCP account; --variant=personal is the founder's own account. The
// characters are made up. Production notes: brand/video/reels/EPISODES.md.

// The story's moments, in seconds.
const T = { fomo: 2.6, dive: 3.62, up: 4.45, wide: 5.0, hide: 7.0, lapse: 9.0, dawn: 11.4, bite: 11.85, catch: 12.9, home: 14.6, line: 16.6, ask: 18.6, end: 20.6 };

// him in the hide, leaning on the ledge at the slit
const WATCH = { arms: 'desk', lean: 3, look: [1, 0.12], lid: 0.34, brow: [0.15, 0.2], mouth: { open: 0.1, smile: 0.15 } };
const SMIRK = { arms: 'desk', lean: 2, look: [0.6, 0.05], lid: 0.3, brow: [0, 0.35], mouth: { smirk: 1, smile: 0.1 } };
const P = (t, pose, ease) => ({ t, pose, ease });
const POSE = [
  P(0, WATCH), P(T.line - 0.02, WATCH),
  P(T.line, SMIRK), P(T.line + 0.4, { ...SMIRK, head: { rot: 4 } }), P(T.line + 0.8, { ...SMIRK, head: { rot: 0 } }), P(T.end, SMIRK),
];

// the hour: an afternoon, a night in a few seconds, the next morning
const HOUR = [{ t: 0, h: 16.4 }, { t: T.lapse + 0.1, h: 16.9 }, { t: T.dawn - 0.1, h: 30.2 }, { t: 23.4, h: 31.4 }];

// PATIENCE on the near bank, facing the water, its rod propped and its tea in its hands
const AT = { x: 820, y: 1700, s: 1.7 };
const LINE = [354, -140];
const FISHING = { face: -1, legs: 'sit', arms: 'tea', rod: 'propped', line: LINE, lid: 0.48, mouth: { smile: 0.35 } };
const BITE = { ...FISHING, bite: 1, lid: 0.12, brow: { raise: 0.7 }, mouth: { smile: 0.2, open: 0.15 } };
const GRAB = { face: -1, legs: 'sit', arms: 'pull', rod: 'held', line: LINE, bite: 1, bend: 0.9, reel: 0, lid: 0.15, brow: { raise: 0.4 }, mouth: { smile: 0.3 } };
const LANDED = { ...GRAB, reel: 1, bend: 0.25, lid: 0.4, brow: { raise: 0 }, mouth: { smile: 0.6 } };
const HOMEWARD = { face: 1, legs: 'walk', arms: 'wave', holds: 'fish', lid: 0.42, mouth: { smile: 0.55 } };
const PATIENCE = [
  { t: 0, ...AT, pose: FISHING }, { t: T.bite - 0.12, ...AT, pose: FISHING },
  { t: T.bite - 0.06, ...AT, pose: { ...FISHING, bite: 0.35 }, ease: 'out' }, { t: T.bite, ...AT, pose: FISHING },
  { t: T.bite + 0.08, ...AT, pose: BITE, ease: 'out' }, { t: T.catch + 0.1, ...AT, pose: BITE },
  { t: T.catch + 0.22, ...AT, pose: GRAB, ease: 'out' }, { t: T.catch + 0.35, ...AT, pose: GRAB },
  { t: T.catch + 0.95, ...AT, pose: LANDED, ease: 'out' }, { t: T.home - 0.02, ...AT, pose: LANDED },
  { t: T.home, ...AT, x: 540, pose: HOMEWARD, ease: 'step' }, { t: T.line, ...AT, x: 880, pose: HOMEWARD, ease: 'linear' },
  { t: T.ask - 0.05, x: 690, y: 1124, s: 0.55, pose: HOMEWARD, ease: 'step' }, { t: 23.4, x: 900, y: 1124, s: 0.55, pose: HOMEWARD, ease: 'linear' },
];

// FOMO: runs in along the bank, leaps, under, and up with an old boot; still there all night
const IN = { x: 600, y: 1440, s: 1.3 };
const RUN = { legs: 'run', arms: 'point', face: 1, shake: 0, mouth: { smile: 0.7, open: 0.5, teeth: 1 } };
const BOOT = { arms: 'wave', holds: 'boot', wade: 62, face: 1, brow: { raise: 0.8 }, mouth: { smile: 0.8, open: 0.55, teeth: 1 } };
const COLD = { ...BOOT, shake: 1, lid: 0.3, brow: { raise: 0, worry: 0.6 }, mouth: { smile: -0.3, open: 0, teeth: 0 } };
const SAD = { ...BOOT, shake: 0.35, lid: 0.45, look: [0.6, 0.2], brow: { raise: 0, worry: 0.8 }, mouth: { smile: -0.6, open: 0, teeth: 0 } };
const FOMO = [
  { t: 0, x: -260, y: 1700, s: 1.3, pose: RUN }, { t: T.fomo, x: -260, y: 1700, s: 1.3, pose: RUN },
  { t: T.dive - 0.3, x: 380, y: 1700, s: 1.3, pose: RUN, ease: 'linear' },
  { t: T.dive - 0.14, x: 490, y: 1580, s: 1.3, pose: { ...RUN, legs: 'tuck', arms: 'up', hop: 110 }, ease: 'out' },
  { t: T.dive, ...IN, pose: { ...RUN, legs: 'tuck', arms: 'up', hop: 0, wade: 80 } },
  { t: T.dive + 0.2, ...IN, y: IN.y + 300 * IN.s, pose: { ...RUN, legs: 'tuck', arms: 'up', wade: 380 } }, { t: T.up - 0.1, ...IN, y: IN.y + 300 * IN.s, pose: { ...RUN, arms: 'up', wade: 380 } },
  { t: T.up, ...IN, pose: BOOT, ease: 'back' }, { t: T.lapse, ...IN, pose: BOOT },
  { t: T.lapse + 0.8, ...IN, pose: COLD }, { t: T.dawn, ...IN, pose: COLD }, { t: T.dawn + 0.6, ...IN, pose: SAD },
  { t: T.home, ...IN, pose: SAD }, { t: T.home + 0.4, ...IN, pose: { ...SAD, look: [1, 0], face: 1 } },
];

const shot = (set, a, b, cam, more = {}) => ({ kind: 'toon', set, from: a, to: b, cam, pose: POSE, hour: HOUR, cast: { patience: PATIENCE, fomo: FOMO }, splash: [[T.dive, 600, 1336], [T.catch + 0.3, 218, 1462]], fi: 0.01, fo: 0.01, ...more });
const WIDE = (a, b) => shot('waterhole', a, b, [{ t: a, s: 1.15, x: 560, y: 1150 }, { t: b, s: 1.19, x: 562, y: 1152, ease: 'linear' }], { dof: { bg: 2 } });
const DIVE = (a, b) => shot('waterhole', a, b, [{ t: a, s: 1.45, x: 420, y: 1340 }, { t: b, s: 1.5, x: 440, y: 1340, ease: 'linear' }], { dof: { bg: 4 } });
const FLOAT = (a, b) => shot('waterhole', a, b, [{ t: a, s: 2.1, x: 240, y: 1390 }, { t: b, s: 2.2, x: 240, y: 1396, ease: 'linear' }], { dof: { bg: 6, mid: 2 } });
const BANK = (a, b) => shot('waterhole', a, b, [{ t: a, s: 1.2, x: 520, y: 1380 }, { t: b, s: 1.25, x: 520, y: 1384, ease: 'linear' }], { dof: { bg: 4 } });
const FACE = (a, b) => shot('hide', a, b, [{ t: a, s: 2.05, x: 400, y: 900 }, { t: b, s: 2.2, x: 400, y: 894, ease: 'linear' }], { dof: { bg: 7 }, cast: {} });
const SAY = (who, text, a, b, x, y, tail = 'b', more = {}) => ({ kind: 'bubble', who, text, from: a, to: b, x, y, tail, fo: 0.01, ...more });

const SPEC = {
  title: 'EP22 · The Rarest Trader in the Wild',
  modules: ['toon/founder.js', 'toon/toon.js', 'toon/cast.js', 'toon/places.js'],
  duration: 23.4,
  cover: 0.9,
  style: 'nature',
  bpm: 92,
  seed: 22,
  ambience: 'savanna',
  sound: false,
  sfx: true,
  scenes: [
    // 1 · the hook: PATIENCE fishing, its tea
    WIDE(0, T.fomo),
    { id: 'hook', kind: 'caption', from: -0.5, to: T.fomo, y: 230, text: 'the rarest trader\nin the *wild:*', sfx: false, fi: 0.01 },
    // 2 · FOMO: a ripple, a dive, a boot
    DIVE(T.fomo, T.wide),
    SAY('fomo', 'THERE’S ONE!!', T.fomo + 0.15, T.dive - 0.05, 430, 800, 'bl'),
    SAY('fomo', 'GOT ONE!!', T.up + 0.08, T.wide, 560, 450, 'br'),
    // 3 · the young ones
    WIDE(T.wide, T.hide),
    { kind: 'caption', from: T.wide + 0.05, to: T.hide, y: 230, text: 'the young ones\nchase every ripple.', fi: 0.01, fo: 0.01 },
    // 4 · in the hide
    FACE(T.hide, T.lapse),
    { kind: 'caption', from: T.hide + 0.1, to: T.lapse, y: 300, text: 'this one hasn’t\nmoved in 4 hours.', fi: 0.01, fo: 0.01 },
    // 5 · a night goes by
    WIDE(T.lapse, T.dawn),
    { kind: 'caption', from: T.lapse + 0.1, to: T.dawn, y: 230, text: 'still waiting.', fi: 0.01, fo: 0.01 },
    // 6 · the bite
    FLOAT(T.dawn, T.catch),
    { kind: 'caption', from: T.bite + 0.05, to: T.catch, y: 230, text: '*the setup.*', fi: 0.01, fo: 0.01 },
    // 7 · one trade
    BANK(T.catch, T.home),
    { kind: 'caption', from: T.catch + 1.0, to: T.home, y: 230, text: 'one trade.', fi: 0.01, fo: 0.01 },
    // 8 · then home
    WIDE(T.home, T.line),
    { kind: 'caption', from: T.home + 0.05, to: T.line, y: 230, text: 'then it goes home.', fi: 0.01, fo: 0.01 },
    // 9 · the lesson
    FACE(T.line, T.ask),
    { kind: 'caption', from: T.line + 0.05, to: T.ask, y: 300, text: 'most of trading\nis *waiting.*', fi: 0.01, fo: 0.01 },
    // 10 · the question: FOMO in the water, PATIENCE off into the morning
    { ...WIDE(T.ask, T.end + 0.4), fo: 0.45 },
    { kind: 'caption', from: T.ask + 0.05, to: T.end, y: 230, text: 'be honest:\nwhich one are you?', fi: 0.01, fo: 0.3 },
    // 11 · the end card: one ask
    { id: 'end', kind: 'end', from: T.end, to: 23.4, cta: 'Follow TCP', sub: 'One lesson an episode.', fo: 0.01,
      risk: 'Education, not financial advice. Trading carries risk.\nThe characters are made up.' },
  ],
  cues: [
    { t: 0.4, sfx: 'bird' },
    { t: T.fomo + 0.05, sfx: 'whoosh' },
    { t: T.dive, sfx: 'splash' },
    { t: T.up, sfx: 'boing' },
    { t: T.lapse, sfx: 'whoosh' }, { t: T.dawn - 1.1, sfx: 'rise' },
    { t: T.dawn + 0.1, sfx: 'bird' },
    { t: T.bite, sfx: 'plop' }, { t: T.bite + 0.02, sfx: 'mute', until: T.catch },
    { t: T.catch + 0.25, sfx: 'reel' }, { t: T.catch + 0.3, sfx: 'splash' },
    { t: T.catch + 1.0, sfx: 'ding' },
    { t: T.end, sfx: 'whoosh' },
  ],
  variants: {
    personal: {
      bug: false,
      scenes: { end: { cta: 'Follow for the next one', sub: 'Most of trading is waiting.' } },
    },
  },
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
