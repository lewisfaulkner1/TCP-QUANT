// EP01 · Trading From 40,000 Feet. On a flight: the wing and the clouds, then the founder in his seat.
// No setup yet, so he doesn't force one; he waits, and looks out. The alert he set before take-off
// fires; he checks the plan on his phone (the real Quant Terminal, demo prices); then back to the
// view. Freedom isn't staring at charts all day; it's having a process. No voice: lo-fi at 84 bpm under
// the cabin's roar, the cuts on its bars. The base cut is for the TCP account; --variant=personal is
// the founder's own account. Production notes: brand/video/reels/EPISODES.md.

// The story's moments, in seconds: a bar is 2.857 s.
const T = { cabin: 2.86, face: 5.71, wait: 8.57, alert: 11.43, phone: 14.29, free: 17.14, end: 20.0 };

const RELAX = { arms: 'phone', lean: -1, look: [0.6, 0.3], lid: 0.04, brow: [0.2, 0.3], mouth: { smile: 0.1 } };
const CALM = { arms: 'fold', lean: -3, look: [0.5, 0.15], lid: 0.32, brow: [0, 0.15], mouth: { smile: 0.12 } };
const GAZE = { arms: 'fold', lean: -3.5, look: [-1, -0.05], lid: 0.3, brow: [0.05, 0.15], mouth: { smile: 0.18 } };
const ALERT = { arms: 'desk', lean: 3, look: [1, 0.25], lid: 0.18, brow: [0.35, 0.45], mouth: { smile: 0 } };
const P = (t, pose, ease) => ({ t, pose, ease });
const POSE = [
  P(0, RELAX), P(T.face - 0.02, { ...RELAX, look: [0.35, 0.6] }),
  P(T.face, CALM), P(7.2, CALM), P(8.0, GAZE), P(T.alert - 0.02, GAZE),
  P(T.alert, { ...ALERT, lean: 0, lid: 0.25 }), P(11.9, ALERT), P(T.phone - 0.02, ALERT),
  P(T.phone, RELAX), P(T.end, GAZE),
];
// the laptop on his table: EP08's clean example chart, quietly printing
const CHART = [{ t: 0, story: 'clutter', i: 50, ind: 0 }, { t: T.end, story: 'clutter', i: 63.9, ind: 0, ease: 'linear' }];

const shot = (set, from, to, cam, more = {}) => ({ kind: 'toon', set, from, to, cam, pose: POSE, chart: CHART, fi: 0.01, fo: 0.01, ...more });
const WINDOW = (a, b, more = {}) => shot('window', a, b, [{ t: a, s: 1.0, x: 540, y: 900 }, { t: b, s: 1.07, x: 540, y: 900, ease: 'linear' }], more);
const WIDE = (a, b) => shot('cabin', a, b, [{ t: a, s: 1.0, x: 540, y: 960 }, { t: b, s: 1.06, x: 530, y: 955, ease: 'linear' }], { dof: { bg: 2 } });
const FACE = (a, b) => shot('cabin', a, b, [{ t: a, s: 2.05, x: 400, y: 900 }, { t: b, s: 2.2, x: 400, y: 894, ease: 'linear' }], { dof: { bg: 6 } });

const SPEC = {
  title: 'EP01 · Trading From 40,000 Feet',
  modules: ['toon/founder.js', 'toon/toon.js'],
  duration: 22.9,
  cover: 0.9,
  style: 'lofi',
  bpm: 84,
  seed: 1,
  ambience: 'cabin',
  sound: false,
  sfx: true,
  scenes: [
    // 1 · the hook: the wing, the clouds
    WINDOW(0, T.cabin),
    { id: 'hook', kind: 'caption', from: -0.5, to: T.cabin, y: 250, text: 'trading from\n40,000 feet.', sfx: false, fi: 0.01 },
    // 2 · no setup yet
    WIDE(T.cabin, T.face),
    { kind: 'caption', from: T.cabin + 0.1, to: T.face, y: 270, text: 'no setup yet.', fi: 0.01, fo: 0.01 },
    FACE(T.face, T.wait),
    { kind: 'caption', from: T.face + 0.1, to: T.wait, y: 270, text: 'so I don’t force one.', fi: 0.01, fo: 0.01 },
    // 3 · he waits; the clouds go by faster
    WINDOW(T.wait, T.alert, { speed: 3 }),
    { kind: 'caption', from: T.wait + 0.1, to: 10.0, y: 250, text: 'I wait.', fi: 0.01, fo: 0.01 },
    { kind: 'caption', from: 10.0, to: T.alert, y: 250, text: 'an hour later…', fi: 0.01, fo: 0.01 },
    // 4 · the alert he set before take-off
    WIDE(T.alert, T.phone),
    { kind: 'caption', style: 'note', num: '!', text: 'ALERT', sub: 'price at your level', from: T.alert + 0.05, to: 12.9, y: 330, sfx: false, fi: 0.08, fo: 0.01 },
    { kind: 'caption', from: 12.9, to: T.phone, y: 270, text: 'the alert I set\nbefore take-off.', fi: 0.01, fo: 0.01 },
    // 5 · the plan, on his phone; the cabin behind
    shot('cabin', T.phone, T.free, [{ t: T.phone, s: 1.1, x: 540, y: 960 }], { dof: { bg: 18, all: 16 } }),
    {
      kind: 'handPhone', from: T.phone, to: T.free, tag: 'DEMO PRICES', fi: 0.25,
      shots: [{ shot: 'brief', from: T.phone, u0: 0.6 }],
      pose: [{ t: T.phone, x: 560, y: 1240, s: 0.84, rx: 14, ry: -10, rz: 3 }, { t: 14.9, x: 560, y: 1110, s: 0.9, rx: 6, ry: -6, rz: 1 }, { t: T.free, x: 556, y: 1090, s: 0.94, rx: 4, ry: 4, rz: 0 }],
    },
    { kind: 'caption', from: 14.5, to: T.free, y: 230, size: 56, text: 'check the plan.\nnot the chart all day.', fi: 0.01, fo: 0.15 },
    // 6 · back to the view
    WINDOW(T.free, T.end),
    { kind: 'caption', from: T.free + 0.1, to: 18.6, y: 250, text: 'freedom isn’t staring\nat charts all day.', fi: 0.01, fo: 0.01 },
    { kind: 'caption', from: 18.6, to: T.end, y: 250, text: 'it’s having a process.', fi: 0.01, fo: 0.01 },
    // 7 · the end card: one ask
    { id: 'end', kind: 'end', from: T.end, to: 22.9, cta: 'Follow TCP', sub: 'One lesson an episode.', fi: 0.3, fo: 0.01,
      risk: 'Education, not financial advice. Trading carries risk.\nApp shown with demo prices.' },
  ],
  cues: [
    { t: T.alert + 0.05, sfx: 'ding' },
    { t: T.phone, sfx: 'whoosh' },
    { t: T.free, sfx: 'rise' },
    { t: T.end, sfx: 'whoosh' },
  ],
  variants: {
    personal: {
      bug: false,
      scenes: { end: { cta: 'Follow for the next one', sub: 'Trading from 40,000 feet.' } },
    },
  },
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
