// EP18 · Revenge Trading. Fight night: the founder on his stool in the corner, the big screen over
// the ring reading ROUND 1 · STOPPED OUT. You take a loss; then HE turns up. REVENGE (toon/cast.js)
// jumps up onto the apron in its boxing gloves: get back in there, double the size, win it back. He
// looks at it. Nah. The towel goes in. You're quitting?! Not quitting: done for today. A loss is a
// cost, not a fight; the market's open again tomorrow. No voice: a fight night's drums
// and brass at 96 bpm, the cuts on its bars. The base cut is for the TCP account; --variant=personal
// is the founder's own account. The characters are made up. Production notes:
// brand/video/reels/EPISODES.md.

// The story's moments, in seconds: a bar is 2.5 s.
const T = { him: 2.5, double: 5.0, nah: 7.5, towel: 8.75, quit: 10.0, cost: 12.5, line: 15.0, end: 17.5 };

const DOWN = { arms: 'fold', lean: 1, look: [0.6, 0.55], lid: 0.46, brow: [0.2, 0.3], mouth: { smile: -0.25 } };
const AT_IT = { arms: 'fold', lean: -1, look: [1, 0.2], lid: 0.44, brow: [-0.1, 0.3], mouth: { smile: -0.15 } };
const NAH = { arms: 'fold', lean: -2, look: [-1, 0.08], lid: 0.4, brow: [0.3, -0.1], mouth: { smile: 0.05 } };
const CALM = { arms: 'fold', lean: -3, look: [0.7, 0.15], lid: 0.32, brow: [0, 0.15], mouth: { smile: 0.1 } };
const SMIRK = { arms: 'fold', lean: -2, look: [0.6, 0.05], lid: 0.3, brow: [0, 0.35], mouth: { smirk: 1, smile: 0.1 } };
const P = (t, pose, ease) => ({ t, pose, ease });
const POSE = [
  P(0, DOWN), P(T.him + 0.4, DOWN), P(T.him + 0.8, AT_IT), P(T.nah - 0.02, AT_IT),
  P(T.nah, NAH), P(T.quit - 0.02, NAH), P(T.quit, CALM), P(T.line - 0.02, CALM),
  P(T.line, SMIRK), P(T.line + 0.4, { ...SMIRK, head: { rot: 4 } }), P(T.line + 0.8, { ...SMIRK, head: { rot: 0 } }), P(T.end, SMIRK),
];

// REVENGE on the ring's edge to his right (the edge is at y 1448), facing him
const AT = { x: 775, y: 1462, s: 1.45 };
const SHOUT = { arms: 'up', face: -1, look: [-1, 0], mouth: { open: 0.7, smile: -0.4, teeth: 1 } };
const GUARD = { arms: 'guard', face: -1, look: [-1, 0.1] };
const PUNCH = { arms: 'punch', face: -1, lean: 8, look: [-1, 0], mouth: { open: 0.5, smile: -0.6, teeth: 1 } };
const jabs = (a, b) => { const k = []; for (let t = a, j = 0; t < b - 0.1; t += 0.4, j++) k.push({ t, ...AT, pose: j % 2 ? GUARD : PUNCH, ease: 'out' }); return k; };
const REVENGE = [
  { t: 0, ...AT, y: 1900, pose: SHOUT }, { t: T.him + 0.05, ...AT, y: 1900, pose: SHOUT },
  { t: T.him + 0.45, ...AT, pose: SHOUT, ease: 'back' },
  { t: T.him + 1.3, ...AT, pose: SHOUT }, { t: T.him + 1.6, ...AT, pose: GUARD },
  ...jabs(T.double, T.nah),
  { t: T.nah, ...AT, pose: GUARD },
  { t: T.towel + 0.5, ...AT, pose: { arms: 'guard', face: -1, look: [-0.6, 0.4] } },
  { t: T.towel + 0.75, ...AT, pose: { arms: 'up', face: -1, look: [-0.4, 0.5], brow: { raise: 1, angry: 0 }, lid: 0, mouth: { open: 0.75, smile: -0.2, teeth: 0 } } },
  { t: T.quit - 0.05, ...AT, pose: { arms: 'up', face: -1, look: [-0.4, 0.5], brow: { raise: 1, angry: 0 }, lid: 0, mouth: { open: 0.75, smile: -0.2, teeth: 0 } } },
  { t: T.quit + 0.1, ...AT, pose: { arms: 'hips', face: -1, look: [-1, 0], mouth: { smile: -0.8, open: 0 }, lid: 0.25 } },
  { t: T.cost - 0.05, ...AT, pose: { arms: 'hips', face: -1, look: [-1, 0], mouth: { smile: -0.8, open: 0 }, lid: 0.25 } },
  { t: T.cost + 0.2, ...AT, pose: { arms: 'hips', face: -1, look: [-1, 0], mouth: { smile: -0.8, open: 0 }, lid: 0.25 } },
  { t: T.cost + 1.3, ...AT, pose: { arms: 'hips', face: -1, look: [-1, 0], mouth: { smile: -0.8, open: 0 }, lid: 0.25 } },
  { t: T.cost + 1.6, ...AT, pose: { arms: 'down', legs: 'walk', look: [1, 0], lid: 0.3, mouth: { smile: -0.5 } } },
  { t: T.line, ...AT, x: 1300, pose: { arms: 'down', legs: 'walk', look: [1, 0], lid: 0.3, mouth: { smile: -0.5 } }, ease: 'linear' },
];

const shot = (a, b, cam, more = {}) => ({ kind: 'toon', set: 'ring', from: a, to: b, cam, pose: POSE, cast: { revenge: REVENGE }, screen: [[0, 'stopped'], [T.quit, 'done']], towel: [T.towel + 0.1, T.towel + 0.75], fi: 0.01, fo: 0.01, ...more });
const WIDE = (a, b) => shot(a, b, [{ t: a, s: 1.0, x: 540, y: 1100 }, { t: b, s: 1.05, x: 545, y: 1104, ease: 'linear' }], { dof: { bg: 2 } });
const CORNER = (a, b) => shot(a, b, [{ t: a, s: 1.3, x: 560, y: 1150 }, { t: b, s: 1.36, x: 566, y: 1150, ease: 'linear' }], { dof: { bg: 4 } });
const FACE = (a, b) => shot(a, b, [{ t: a, s: 2.05, x: 400, y: 900 }, { t: b, s: 2.2, x: 400, y: 894, ease: 'linear' }], { dof: { bg: 7 }, cast: {} });
const RING = (a, b) => shot(a, b, [{ t: a, s: 1.15, x: 640, y: 1180 }, { t: b, s: 1.2, x: 640, y: 1184, ease: 'linear' }], { dof: { bg: 3 } });
const SAY = (text, a, b, x, y, tail = 'br') => ({ kind: 'bubble', who: 'revenge', text, from: a, to: b, x, y, tail, fo: 0.01 });

const SPEC = {
  title: 'EP18 · Revenge Trading',
  modules: ['toon/founder.js', 'toon/toon.js', 'toon/cast.js', 'toon/places.js'],
  duration: 20.3,
  cover: 0.9,
  style: 'fight',
  bpm: 96,
  seed: 18,
  sound: false,
  sfx: true,
  scenes: [
    // 1 · the hook: the loss, and who turns up
    WIDE(0, T.him),
    { id: 'hook', kind: 'caption', from: -0.5, to: T.him, y: 230, text: 'you take a loss.\nthen *HE* turns up:', sfx: false, fi: 0.01 },
    // 2 · REVENGE
    CORNER(T.him, T.double), SAY('GET BACK\nIN THERE!', T.him + 0.5, T.double, 740, 730),
    CORNER(T.double, T.nah), SAY('DOUBLE THE SIZE!', T.double + 0.05, 6.25, 760, 760), SAY('WIN IT BACK!', 6.25, T.nah, 760, 760),
    // 3 · nah: the towel
    FACE(T.nah, T.towel),
    { kind: 'caption', from: T.nah + 0.1, to: T.towel, y: 300, text: 'nah.', fi: 0.01, fo: 0.01 },
    RING(T.towel, T.quit), SAY('YOU’RE QUITTING?!', T.towel + 0.8, T.quit, 640, 720),
    // 4 · done for today
    FACE(T.quit, T.cost),
    { kind: 'caption', from: T.quit + 0.1, to: T.cost, y: 300, text: 'not quitting.\n*done for today.*', fi: 0.01, fo: 0.01 },
    // 5 · the lesson; REVENGE walks off
    WIDE(T.cost, T.line),
    { kind: 'caption', from: T.cost + 0.05, to: T.line, y: 230, text: 'a loss is a cost.\nnot a fight.', fi: 0.01, fo: 0.01 },
    FACE(T.line, T.end),
    { kind: 'caption', from: T.line + 0.05, to: T.end, y: 300, text: 'the market’s open\nagain tomorrow.', fi: 0.01, fo: 0.01 },
    // 6 · the end card: one ask
    { id: 'end', kind: 'end', from: T.end, to: 20.3, cta: 'Follow TCP', sub: 'One lesson an episode.', fo: 0.01,
      risk: 'Education, not financial advice. Trading carries risk.\nThe characters are made up.' },
  ],
  cues: [
    { t: 0.1, sfx: 'ring' },
    { t: T.him + 0.3, sfx: 'slam' },
    ...[0, 1, 2, 3, 4, 5].map((j) => ({ t: T.double + j * 0.4, sfx: 'punch' })),
    { t: T.towel + 0.1, sfx: 'whoosh' }, { t: T.towel + 0.75, sfx: 'punch' },
    { t: T.towel + 0.76, sfx: 'mute', until: T.quit },
    { t: T.quit, sfx: 'ring' },
    { t: T.line, sfx: 'rise' },
    { t: T.end, sfx: 'whoosh' },
  ],
  variants: {
    personal: {
      bug: false,
      scenes: { end: { cta: 'Follow for the next one', sub: 'Revenge trading.' } },
    },
  },
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
