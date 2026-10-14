// EP20 · The Line-Up. Every bad trade has a suspect. Four of the trading emotions stand in a police
// line-up, 40 cm tall against the height chart; the founder watches through the one-way glass. Each
// steps forward and gives itself away: FOMO (it was pumping), REVENGE (I just wanted it back), GREED
// (it was going higher), FEAR (I closed it too early). "…it was all of them." The only one with an
// alibi is PATIENCE, on his desk with its tea: it was waiting for the setup. Which one's in your
// line-up? Introduces the cast (toon/cast.js). No voice: a detective's jazz at 96 bpm, the cuts on its
// bars. The base cut is for the TCP account; --variant=personal is the founder's own account. The
// characters are made up. Production notes: brand/video/reels/EPISODES.md.

// The story's moments, in seconds: a bar is 2.5 s.
const T = { him: 2.5, n1: 3.75, n2: 6.25, n3: 8.75, n4: 11.25, all: 13.75, alibi: 15.0, ask: 17.5, end: 20.0 };

const WATCH = { arms: 'fold', lean: -2, look: [1, 0.12], lid: 0.38, brow: [0.1, 0.2], mouth: { smile: -0.15 } };
const RAISE = { ...WATCH, brow: [0.85, 0.05], lid: 0.28 };
const SIDE_EYE = { arms: 'fold', lean: -2.5, look: [-1, 0.08], lid: 0.46, brow: [0.25, -0.15], mouth: { smile: -0.25 } };
const SMIRK = { arms: 'fold', lean: -2, look: [0.7, 0.2], lid: 0.3, brow: [0, 0.35], mouth: { smirk: 1, smile: 0.1 } };
const P = (t, pose, ease) => ({ t, pose, ease });
const POSE = [
  P(0, WATCH), P(T.him + 0.6, WATCH), P(T.him + 0.9, RAISE), P(T.all - 0.02, RAISE),
  P(T.all, SIDE_EYE), P(T.alibi - 0.02, SIDE_EYE),
  P(T.alibi, SMIRK), P(T.alibi + 0.4, { ...SMIRK, head: { rot: 4 } }), P(T.alibi + 0.8, { ...SMIRK, head: { rot: 0 } }), P(T.end, SMIRK),
];

// The suspects: each waits in its place, steps forward when its number's called, and steps back.
const FLOOR = 1380, X = [270, 450, 630, 810];
const GUILTY = { look: [0, 0.75], lid: 0.42, brow: { worry: 0.8 }, mouth: { smile: -0.45, open: 0, teeth: 0 } };
const suspect = (i, idle, talk, called) => {
  const a = called, b = called + 2.5, x = X[i];
  return [
    { t: 0, x, y: FLOOR, s: 1, pose: idle },
    { t: a + 0.15, x, y: FLOOR, s: 1, pose: idle },
    { t: a + 0.55, x, y: FLOOR + 70, s: 1.12, pose: talk, ease: 'back' },
    { t: b - 0.1, x, y: FLOOR + 70, s: 1.12, pose: talk },
    { t: b + 0.3, x, y: FLOOR, s: 1, pose: idle },
    { t: T.ask - 0.2, x, y: FLOOR, s: 1, pose: idle },
    { t: T.ask + 0.2, x, y: FLOOR, s: 1, pose: { ...idle, ...GUILTY } },
  ];
};
const CAST = {
  fomo: suspect(0, { arms: 'down', look: [0.3, 0] }, { arms: 'phone', screen: '+$4,000', look: [0.2, 0], mouth: { open: 0.55, smile: 0.5, teeth: 1 }, hop: 0 }, T.n1),
  revenge: suspect(1, { arms: 'guard' }, { arms: 'punch', lean: 6, mouth: { open: 0.5, smile: -0.6, teeth: 1 } }, T.n2),
  greed: suspect(2, { arms: 'rub' }, { arms: 'grab', look: [0.4, -0.3], mouth: { open: 0.35, smile: 0.6, teeth: 1 } }, T.n3),
  fear: suspect(3, { arms: 'hug' }, { arms: 'up', mouth: { open: 0.5, wavy: 0, smile: -0.5 }, shake: 0.8 }, T.n4),
};
// the same four, small, beyond the glass in the founder's shots
const BEYOND = Object.fromEntries(Object.entries(CAST).map(([who, tr]) => [who, tr]));
const TEA = [{ t: 0, x: 790, y: 1452, s: 1.25, pose: { legs: 'sit', arms: 'tea', look: [-0.3, -0.2], lid: 0.5 } }];

const LINEUP = (a, b, cam, more = {}) => ({ kind: 'toon', set: 'lineup', from: a, to: b, cam, cast: CAST, pose: POSE, fi: 0.01, fo: 0.01, ...more });
const ROOM = (a, b, cam, more = {}) => ({ kind: 'toon', set: 'observe', from: a, to: b, cam, pose: POSE, beyond: BEYOND, fi: 0.01, fo: 0.01, ...more });
const WIDE = (a, b) => LINEUP(a, b, [{ t: a, s: 1.42, x: 540, y: 1190 }, { t: b, s: 1.48, x: 540, y: 1196, ease: 'linear' }]);
const CLOSE = (i, a, b) => LINEUP(a, b, [{ t: a, s: 1.5, x: X[i], y: 1090 }, { t: b, s: 1.6, x: X[i], y: 1100, ease: 'linear' }], { dof: { bg: 3 } });
const FACE = (a, b) => ROOM(a, b, [{ t: a, s: 2.05, x: 400, y: 900 }, { t: b, s: 2.2, x: 400, y: 894, ease: 'linear' }], { dof: { bg: 6 } });
const CALL = (num, a) => ({ kind: 'caption', style: 'note', num: String(num), text: `NUMBER ${num}`, sub: 'step forward.', from: a + 0.1, to: a + 0.85, y: 280, sfx: false, fi: 0.06, fo: 0.01 });
const SAY = (who, text, a, b, more = {}) => ({ kind: 'bubble', who, text, from: a, to: b, x: 540, y: 760, tail: 'b', fo: 0.01, ...more });

const SPEC = {
  title: 'EP20 · The Line-Up',
  modules: ['toon/founder.js', 'toon/toon.js', 'toon/cast.js', 'toon/places.js'],
  duration: 22.8,
  cover: 0.9,
  style: 'noir',
  bpm: 96,
  seed: 20,
  sound: false,
  sfx: true,
  scenes: [
    // 1 · the hook: the line-up
    WIDE(0, T.him),
    { id: 'hook', kind: 'caption', from: -0.5, to: T.him, y: 230, text: 'every bad trade\nhas a suspect.', sfx: false, fi: 0.01 },
    // 2 · him, behind the glass
    FACE(T.him, T.n1),
    { kind: 'caption', from: T.him + 0.1, to: T.n1, y: 300, text: 'line them up.', fi: 0.01, fo: 0.01 },
    // 3 · the suspects, one by one
    CLOSE(0, T.n1, T.n2), CALL(1, T.n1), SAY('fomo', 'IT WAS PUMPING!!', T.n1 + 0.75, T.n2),
    CLOSE(1, T.n2, T.n3), CALL(2, T.n2), SAY('revenge', 'I JUST WANTED\nIT BACK!', T.n2 + 0.75, T.n3, { y: 740 }),
    CLOSE(2, T.n3, T.n4), CALL(3, T.n3), SAY('greed', 'IT WAS GOING\nHIGHER…', T.n3 + 0.75, T.n4, { y: 740 }),
    CLOSE(3, T.n4, T.all), CALL(4, T.n4), SAY('fear', 'I CLOSED IT\nTOO EARLY…', T.n4 + 0.75, T.all, { y: 780 }),
    // 4 · the verdict, in silence
    FACE(T.all, T.alibi),
    { kind: 'caption', from: T.all + 0.1, to: T.alibi, y: 300, text: '…it was all of them.', fi: 0.01, fo: 0.01 },
    // 5 · the one with an alibi
    ROOM(T.alibi, T.ask, [{ t: T.alibi, s: 1.9, x: 760, y: 1300 }, { t: T.ask, s: 2.0, x: 765, y: 1305, ease: 'linear' }], { cast: { patience: TEA }, dof: { bg: 5 } }),
    { kind: 'caption', from: T.alibi + 0.05, to: T.ask, y: 250, text: 'the only one\nwith an alibi:', fi: 0.01, fo: 0.01 },
    SAY('patience', 'I WAS WAITING\nFOR THE SETUP.', T.alibi + 0.8, T.ask, { x: 560, y: 620 }),
    // 6 · the question
    WIDE(T.ask, T.end),
    { kind: 'caption', from: T.ask + 0.05, to: T.end, y: 230, text: 'which one’s in\nyour line-up?', fi: 0.01, fo: 0.01 },
    // 7 · the end card: one ask
    { id: 'end', kind: 'end', from: T.end, to: 22.8, cta: 'Follow TCP', sub: 'One lesson an episode.', fo: 0.01,
      risk: 'Education, not financial advice. Trading carries risk.\nThe characters are made up.' },
  ],
  cues: [
    { t: 0.12, sfx: 'buzzer' },
    ...[T.n1, T.n2, T.n3, T.n4].map((t) => ({ t: t + 0.08, sfx: 'buzzer' })),
    { t: T.n1 + 0.2, sfx: 'boing' },
    { t: T.n2 + 0.55, sfx: 'punch' },
    { t: T.all - 0.02, sfx: 'mute', until: T.alibi },
    { t: T.alibi, sfx: 'chime' },
    { t: T.ask, sfx: 'whoosh' },
    { t: T.end, sfx: 'whoosh' },
  ],
  variants: {
    personal: {
      bug: false,
      scenes: { end: { cta: 'Follow for the next one', sub: 'Every bad trade has a suspect.' } },
    },
  },
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
