// EP07 · The Pilot Calls a Trade. The cabin chime, the seatbelt sign, and the captain on the speaker:
// we're approaching resistance; please keep your stop losses fastened; expect some volatility;
// position sizes in the upright position. The founder's stop is already in. Risk management is the
// seatbelt: you don't put it on mid-turbulence. No voice: a bossa at 104 bpm under the cabin's roar,
// the cuts on its bars. The base cut is for the TCP account; --variant=personal is the founder's own
// account. Production notes: brand/video/reels/EPISODES.md.

// The story's moments, in seconds: a bar is 2.308 s.
const B = 2.3077;
const T = { pa1: B, huh: 2 * B, belts: 3 * B, vol: 4 * B, calm: 5 * B, upright: 6 * B, seatbelt: 7 * B, mid: 8 * B, end: 9 * B };

const READ = { arms: 'phone', lean: -1, look: [0.6, 0.3], lid: 0.04, brow: [0.2, 0.3], mouth: { smile: 0.1 } };
const LOOKUP = { arms: 'phone', lean: -0.5, look: [0.45, -0.3], lid: 0.0, brow: [0.75, 0.85], mouth: { open: 0.08 } };
const CALM = { arms: 'fold', lean: -3, look: [0.6, 0.1], lid: 0.32, brow: [0.1, 0.3], mouth: { smirk: 0.8, smile: 0.1 } };
const GRIN = { arms: 'fold', lean: -2.5, look: [-1, 0.05], lid: 0.3, brow: [0.3, 0.4], mouth: { smile: 0.55 } };
const P = (t, pose, ease) => ({ t, pose, ease });
const POSE = [
  P(0, READ), P(T.huh - 0.02, READ),
  P(T.huh, LOOKUP), P(T.belts - 0.02, LOOKUP),
  P(T.belts, READ), P(T.calm - 0.02, READ),
  P(T.calm, CALM), P(T.seatbelt - 0.02, CALM),
  P(T.seatbelt, GRIN), P(T.seatbelt + 0.4, { ...GRIN, head: { rot: 4 } }), P(T.seatbelt + 0.8, { ...GRIN, head: { rot: 0 } }), P(T.end, GRIN),
];
const CHART = [{ t: 0, story: 'clutter', i: 52, ind: 0 }, { t: T.end, story: 'clutter', i: 63.9, ind: 0, ease: 'linear' }];

const shot = (set, from, to, cam, more = {}) => ({ kind: 'toon', set, from, to, cam, pose: POSE, chart: CHART, fi: 0.01, fo: 0.01, ...more });
const PANEL = (a, b, more = {}) => shot('panel', a, b, [{ t: a, s: 1.0, x: 540, y: 900 }, { t: b, s: 1.06, x: 540, y: 905, ease: 'linear' }], more);
const WINDOW = (a, b, more = {}) => shot('window', a, b, [{ t: a, s: 1.0, x: 540, y: 900 }, { t: b, s: 1.06, x: 540, y: 900, ease: 'linear' }], more);
const WIDE = (a, b, more = {}) => shot('cabin', a, b, [{ t: a, s: 1.0, x: 540, y: 960 }, { t: b, s: 1.06, x: 530, y: 955, ease: 'linear' }], { dof: { bg: 3 }, ...more });
const FACE = (a, b) => shot('cabin', a, b, [{ t: a, s: 2.05, x: 400, y: 900 }, { t: b, s: 2.2, x: 400, y: 894, ease: 'linear' }], { dof: { bg: 6 } });
const PA = (text, a, b) => ({ kind: 'caption', style: 'note', num: 'C', text: 'YOUR CAPTAIN', sub: text, from: a + 0.35, to: b, y: 330, sfx: false, fi: 0.08, fo: 0.01 });

const SPEC = {
  title: 'EP07 · The Pilot Calls a Trade',
  modules: ['toon/founder.js', 'toon/toon.js'],
  duration: 9 * B + 2.8,
  cover: 0.9,
  style: 'lounge',
  bpm: 104,
  seed: 7,
  ambience: 'cabin',
  sound: false,
  sfx: true,
  scenes: [
    // 1 · the hook: the chime, the sign
    PANEL(0, T.pa1, { sign: [[0.3, T.pa1]], pa: [] }),
    { id: 'hook', kind: 'caption', from: -0.5, to: T.pa1, y: 250, text: 'when your pilot\nis also a trader:', sfx: false, fi: 0.01 },
    // 2 · resistance?
    WIDE(T.pa1, T.huh),
    PA('we’re approaching resistance.', T.pa1, T.huh),
    FACE(T.huh, T.belts),
    { kind: 'caption', from: T.huh + 0.1, to: T.belts, y: 270, text: '…resistance?', fi: 0.01, fo: 0.01 },
    // 3 · stop losses fastened
    PANEL(T.belts, T.vol, { sign: [[T.belts + 0.3, T.vol]], pa: [[T.belts + 0.35, T.vol]] }),
    PA('please keep your stop losses fastened.', T.belts, T.vol),
    // 4 · volatility: turbulence at the window
    WINDOW(T.vol, T.calm, { turb: [[T.vol + 0.2, T.calm, 1.2]] }),
    PA('expect some volatility.', T.vol, T.calm),
    // 5 · his stop's already in
    WIDE(T.calm, T.upright, { turb: [[T.calm, T.calm + 1.1, 0.6]] }),
    { kind: 'caption', from: T.calm + 0.1, to: T.upright, y: 270, text: 'stop’s already in.', fi: 0.01, fo: 0.01 },
    PANEL(T.upright, T.seatbelt, { sign: [[T.upright, T.seatbelt]], pa: [[T.upright + 0.35, T.seatbelt]] }),
    PA('position sizes in the upright position.', T.upright, T.seatbelt),
    // 6 · the lesson
    FACE(T.seatbelt, T.mid),
    { kind: 'caption', from: T.seatbelt + 0.1, to: T.mid, y: 270, text: 'risk management\nis the seatbelt.', fi: 0.01, fo: 0.01 },
    WINDOW(T.mid, T.end),
    { kind: 'caption', from: T.mid + 0.1, to: T.end, y: 250, text: 'you don’t put it on\nmid-turbulence.', fi: 0.01, fo: 0.01 },
    // 7 · the end card: one ask
    { id: 'end', kind: 'end', from: T.end, to: 9 * B + 2.8, cta: 'Follow TCP', sub: 'One lesson an episode.', fi: 0.3, fo: 0.01,
      risk: 'Education, not financial advice. Trading carries risk.' },
  ],
  cues: [
    { t: 0.1, sfx: 'chime' }, { t: T.belts + 0.05, sfx: 'chime' }, { t: T.upright + 0.05, sfx: 'chime' },
    { t: T.belts + 0.3, sfx: 'ding' },
    { t: T.vol + 0.2, sfx: 'whoosh' },
    { t: T.seatbelt, sfx: 'rise' },
    { t: T.end, sfx: 'whoosh' },
  ],
  variants: {
    personal: {
      bug: false,
      scenes: { end: { cta: 'Follow for the next one', sub: 'The pilot calls a trade.' } },
    },
  },
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
