// EP19 · Greed at the Take Profit. A game show: TAKE IT OR LEAVE IT. The founder at his podium, the
// trade on the big screen beside him. Target hit: take it, or leave it? GREED (toon/cast.js) pops up
// on the podium: leave it, it's going higher. It drags the target up the screen: just a bit more. He
// takes it. The price turns and falls through both lines; GREED faints. Your target was set when you
// were calm. Ever let greed move your target? No voice: big-band swing at 120 bpm, the cuts on its
// bars. The base cut is for the TCP account; --variant=personal is the founder's own account. The
// chart is a drawing, not a market; the show and the characters are made up. Production notes:
// brand/video/reels/EPISODES.md.

// The story's moments, in seconds: a bar is 2 s.
const T = { hit: 2.0, greed: 4.0, more: 6.0, take: 8.0, button: 9.0, turn: 10.0, faint: 11.2, line: 12.0, ask: 14.0, end: 16.0 };

const WATCH = { arms: 'fold', lean: -1, look: [1, -0.15], lid: 0.3, brow: [0.1, 0.2], mouth: { smile: 0.05 } };
const AT_GREED = { arms: 'fold', lean: -1.5, look: [1, 0.4], lid: 0.42, brow: [0.2, 0.45], mouth: { smile: -0.1 } };
const TAKE = { arms: 'fold', lean: 2.5, look: [0.9, 0.05], lid: 0.3, brow: [0, 0.1], mouth: { open: 0.15, smile: 0.05 } };
const SMIRK = { arms: 'fold', lean: -2, look: [0.6, 0.05], lid: 0.3, brow: [0, 0.35], mouth: { smirk: 1, smile: 0.1 } };
const P = (t, pose, ease) => ({ t, pose, ease });
const POSE = [
  P(0, WATCH), P(T.greed + 0.4, WATCH), P(T.greed + 0.7, AT_GREED), P(T.take - 0.02, AT_GREED),
  P(T.take, TAKE), P(T.take + 0.5, TAKE), P(T.take + 0.8, WATCH), P(T.line - 0.02, WATCH),
  P(T.line, SMIRK), P(T.line + 0.4, { ...SMIRK, head: { rot: 4 } }), P(T.line + 0.8, { ...SMIRK, head: { rot: 0 } }), P(T.end, SMIRK),
];

// the screen: the price runs up to the target, GREED drags its own target higher, he takes it at the
// target, and the price falls back through both
const BOARD = [
  { t: 0, k: 0.12 }, { t: T.hit, k: 0.6, badge: 'hit' }, { t: T.more, k: 0.62, g: 110, badge: 'hit' },
  { t: T.take - 0.4, k: 0.66, g: 46, badge: 'hit' }, { t: T.button + 0.1, k: 0.66, g: 46, badge: 'taken', press: 0 },
  { t: T.button + 0.25, k: 0.66, g: 46, badge: 'taken', press: 1 }, { t: T.button + 0.8, k: 0.66, g: 46, badge: 'taken', press: 0 },
  { t: T.turn, k: 0.7, g: 46, badge: 'taken' }, { t: T.faint, k: 1, g: 46, badge: 'taken' },
];

// GREED on the podium, by the LEAVE IT button (the podium's top is at y 1448; it stands at y 1508)
const AT = { x: 870, y: 1508, s: 1.15 };
const GRAB = { arms: 'grab', look: [-0.7, -0.5], mouth: { open: 0.45, smile: 0.6, teeth: 1 } };
const REACH = { arms: 'point', face: -1, look: [-0.8, -0.9], mouth: { open: 0.3, smile: 0.7, teeth: 1 } };
const GASP = { arms: 'up', look: [-0.6, -0.4], lid: 0, brow: { raise: 1 }, mouth: { open: 0.8, smile: -0.3, teeth: 0 } };
const OUT = { arms: 'down', lid: 1, squash: 0.75, lean: -12, mouth: { smile: -0.4, open: 0, teeth: 0 } };
const GREED = [
  { t: 0, ...AT, y: 1900, pose: GRAB }, { t: T.greed + 0.05, ...AT, y: 1900, pose: GRAB },
  { t: T.greed + 0.4, ...AT, pose: GRAB, ease: 'back' },
  { t: T.more - 0.05, ...AT, pose: GRAB }, { t: T.more + 0.2, ...AT, pose: REACH },
  { t: T.button + 0.05, ...AT, pose: REACH }, { t: T.button + 0.3, ...AT, pose: GASP },
  { t: T.faint - 0.05, ...AT, pose: GASP }, { t: T.faint + 0.4, ...AT, pose: OUT },
];

const shot = (a, b, cam, more = {}) => ({ kind: 'toon', set: 'gameshow', from: a, to: b, cam, pose: POSE, board: BOARD, cast: { greed: GREED }, fi: 0.01, fo: 0.01, ...more });
const WIDE = (a, b) => shot(a, b, [{ t: a, s: 1.0, x: 540, y: 1000 }, { t: b, s: 1.04, x: 540, y: 1000, ease: 'linear' }]);
const STAGE = (a, b) => shot(a, b, [{ t: a, s: 1.35, x: 700, y: 860 }, { t: b, s: 1.42, x: 704, y: 860, ease: 'linear' }], { dof: { bg: 3 } });
const PODIUM = (a, b) => shot(a, b, [{ t: a, s: 1.3, x: 700, y: 1250 }, { t: b, s: 1.36, x: 704, y: 1252, ease: 'linear' }], { dof: { bg: 4 } });
const FACE = (a, b) => shot(a, b, [{ t: a, s: 2.05, x: 400, y: 900 }, { t: b, s: 2.2, x: 400, y: 894, ease: 'linear' }], { dof: { bg: 7 } });
// (the screen fills the frame: nothing of him or GREED shows at its edges)
const SCREEN = (a, b) => shot(a, b, [{ t: a, s: 2.15, x: 836, y: 796 }, { t: b, s: 2.22, x: 836, y: 798, ease: 'linear' }], { cast: {} });
const SAY = (text, a, b, x, y, tail = 'br') => ({ kind: 'bubble', who: 'greed', text, from: a, to: b, x, y, tail, fo: 0.01 });

const SPEC = {
  title: 'EP19 · Greed at the Take Profit',
  outfit: 'versace-crew',
  modules: ['toon/founder.js', 'toon/toon.js', 'toon/cast.js', 'toon/places.js'],
  duration: 18.8,
  cover: 0.9,
  style: 'gameshow',
  bpm: 120,
  seed: 19,
  sound: false,
  sfx: true,
  scenes: [
    // 1 · the hook: the show, the price running at the target
    WIDE(0, T.hit),
    { id: 'hook', kind: 'caption', from: -0.5, to: T.hit, y: 230, text: 'target hit.\n*GREED* has a say:', sfx: false, fi: 0.01 },
    // 2 · the question
    STAGE(T.hit, T.greed),
    { kind: 'caption', style: 'note', num: '?', text: 'THE HOST', sub: 'take it… or leave it?', from: T.hit + 0.1, to: T.greed, y: 280, sfx: false, fi: 0.08, fo: 0.01 },
    // 3 · GREED
    PODIUM(T.greed, T.more), SAY('LEAVE IT!!\nIT’S GOING HIGHER!', T.greed + 0.45, T.more, 600, 700),
    PODIUM(T.more, T.take), SAY('JUST A BIT MORE…', T.more + 0.2, T.take, 600, 720),
    // 4 · take it
    FACE(T.take, T.button),
    { kind: 'caption', from: T.take + 0.1, to: T.button, y: 300, text: '*take it.*', fi: 0.01, fo: 0.01 },
    PODIUM(T.button, T.turn), SAY('NOOO—', T.button + 0.35, T.turn, 640, 720),
    // 5 · the turn, and GREED goes down
    SCREEN(T.turn, T.faint),
    PODIUM(T.faint, T.line),
    // 6 · the lesson
    FACE(T.line, T.ask),
    { kind: 'caption', from: T.line + 0.05, to: T.ask, y: 300, text: 'your target was set\nwhen you were calm.', fi: 0.01, fo: 0.01 },
    WIDE(T.ask, T.end),
    { kind: 'caption', from: T.ask + 0.05, to: T.end, y: 230, text: 'ever let greed\nmove your target?', fi: 0.01, fo: 0.01 },
    // 7 · the end card: one ask
    { id: 'end', kind: 'end', from: T.end, to: 18.8, cta: 'Follow TCP', sub: 'One lesson an episode.', fo: 0.01,
      risk: 'Education, not financial advice. Trading carries risk.\nA drawn chart, not a real trade. The show and characters are made up.' },
  ],
  cues: [
    { t: T.hit + 0.05, sfx: 'drumroll' },
    { t: T.greed + 0.3, sfx: 'boing' },
    { t: T.button + 0.25, sfx: 'ding' }, { t: T.button + 0.3, sfx: 'applause' },
    { t: T.faint + 0.3, sfx: 'buzzer' },
    { t: T.line, sfx: 'rise' },
    { t: T.end, sfx: 'whoosh' },
  ],
  variants: {
    personal: {
      bug: false,
      scenes: { end: { cta: 'Follow for the next one', sub: 'Greed at the take profit.' } },
    },
  },
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
