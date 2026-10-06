// EP08 · The Day I Deleted 27 Indicators. The founder's chart is buried under indicators; how it got
// that way (one at a time, "just one more"); they all disagree; he right-clicks, removes them all, and
// finds the price again. Now he uses one: his own, TCP QT, its look drawn on the same example chart
// with example values (Lewis made its look public on 6 October 2026; how it works stays out of the
// repo). Then its dashboard up close: trend, zones and order flow on one chart. No voice: the cuts sit
// on a 120 bpm grid and the music drops out for the side-eye and the menu. The base cut is for the TCP
// account; --variant=personal is the founder's own account. The chart is an example (labelled on it),
// with every indicator worked out from its candles. Production notes: brand/video/reels/EPISODES.md.

// The story's moments, in seconds.
const T = { squint: 2.0, rebuild: 3.0, full: 6.5, eye: 8.0, menu: 9.0, click: 9.75, wipe: 10.0, clean: 11.0, view: 12.5, smirk: 15.0, panel: 16.5, whole: 18.5, end: 20.5 };

// One pose track for every shot, so a cut never changes what he's doing.
const AT_SCREEN = { arms: 'desk', lean: 3, look: [1, 0.25], lid: 0.22, brow: [-0.5, -0.4], mouth: { smile: -0.3 }, head: { rot: 3 } };
const SQUINT = { arms: 'desk', lean: 4.5, look: [1, 0.22], lid: 0.58, brow: [-0.75, -0.65], mouth: { smile: -0.35 }, head: { rot: 4.5, dx: 6 } };
const SIDE_EYE = { arms: 'desk', lean: 2, look: [-1, 0.08], lid: 0.46, brow: [0.25, -0.2], mouth: { smile: -0.25 } };
const SMIRK = { arms: 'desk', lean: 1, look: [0.6, 0.05], lid: 0.3, brow: [0, 0.35], mouth: { smirk: 1, smile: 0.1 } };
const P = (t, pose, ease) => ({ t, pose, ease });
const POSE = [
  P(0, AT_SCREEN),
  P(1.8, SQUINT), P(2.98, SQUINT),
  P(3.0, AT_SCREEN), P(7.98, AT_SCREEN),
  // all 27 on: the side-eye to camera
  P(8.0, SIDE_EYE), P(8.98, SIDE_EYE),
  // back to the screen: the menu, the click
  P(9.0, AT_SCREEN), P(9.7, AT_SCREEN), P(9.75, { ...AT_SCREEN, hand: { click: 1 } }), P(9.9, AT_SCREEN),
  P(14.98, { ...AT_SCREEN, lean: 1 }),
  // he sees the clean chart: a small smirk and a nod
  P(15.0, SMIRK), P(15.4, { ...SMIRK, head: { rot: 4 } }), P(15.8, { ...SMIRK, head: { rot: 0 } }),
];

// One chart track for every shot. ind is how many indicators are on: 27, then back to 1 for how it
// started, climbing faster and faster to 27, then wiped to 0; tcp brings his own view in.
const C = (t, more, ease) => ({ t, story: 'clutter', i: 63.3 + (t / 23.3) * 0.65, ind: 0, menu: 0, hover: 0, tcp: 0, ...more, ease });
const RISE = (u) => 1 + 26 * Math.pow(u, 1.8);                   // the climb from 1 to 27
const rebuild = [];
for (let k = 0; k <= 28; k++) { const t = 3.5 + (2.8 * k) / 28; rebuild.push(C(t, { ind: RISE(k / 28) }, 'linear')); }
const CHART = [
  C(0, { ind: 27 }), C(2.98, { ind: 27 }),
  C(3.0, { ind: 1 }), ...rebuild, C(8.98, { ind: 27 }),
  C(9.0, { ind: 27 }), C(9.12, { ind: 27, menu: 1 }, 'out'), C(9.3, { ind: 27, menu: 1 }), C(9.42, { ind: 27, menu: 1, hover: 1 }),
  C(9.78, { ind: 27, menu: 1, hover: 1 }), C(9.84, { ind: 27 }), C(10.0, { ind: 27 }),
  C(10.9, { ind: 0 }, 'linear'),
  C(12.55, { ind: 0 }), C(14.9, { tcp: 1 }, 'linear'), C(23.3, { tcp: 1 }, 'linear'),
];
// when each indicator comes on during the climb, for the sounds
const ON = Array.from({ length: 26 }, (_, j) => 3.5 + 2.8 * Math.pow((j + 1) / 26, 1 / 1.8));

const shot = (set, from, to, cam, more = {}) => ({ kind: 'toon', set, from, to, cam, pose: POSE, chart: CHART, fi: 0.01, fo: 0.01, ...more });
const WHOLE = { s: 0.6, x: 900, y: 1040 };                       // the whole monitor in frame
// The closest the camera gets with the legend (top left) and the count (top right) both in frame;
// a push past it heads for the count, so the number is never cut.
const HEADER = { s: 0.62, x: 893 };

const SPEC = {
  title: 'EP08 · The Day I Deleted 27 Indicators',
  modules: ['toon/founder.js', 'toon/toon.js'],
  duration: 23.3,
  cover: 0.9,
  style: 'drive',
  bpm: 120,
  seed: 8,
  sound: false,
  sfx: true,
  scenes: [
    // 1 · the hook: the chart, buried
    shot('screen', 0, T.squint, [{ t: 0, ...WHOLE }, { t: T.squint, ...HEADER, y: 1036, ease: 'linear' }]),
    { id: 'hook', kind: 'caption', from: -0.5, to: T.squint, y: 250, text: 'the day I deleted\n27 indicators', sfx: false, fi: 0.01 },
    // 2 · him, squinting at it
    shot('desk', T.squint, T.rebuild, [{ t: T.squint, s: 2.05, x: 410, y: 900 }, { t: T.rebuild, s: 2.2, x: 412, y: 896, ease: 'linear' }], { dof: { bg: 7 } }),
    { kind: 'caption', from: T.squint + 0.1, to: T.rebuild, y: 300, text: 'I couldn’t find the price.', fi: 0.01, fo: 0.01 },
    // 3 · how it happened: one, then just one more
    shot('screen', T.rebuild, T.full, [{ t: T.rebuild, ...HEADER, y: 1040 }, { t: T.full, ...WHOLE, ease: 'linear' }]),
    { kind: 'caption', from: T.rebuild + 0.05, to: 4.4, y: 250, text: 'it started with one.', fi: 0.01, fo: 0.01 },
    { kind: 'caption', from: 4.4, to: T.full, y: 250, text: 'just one more indicator…', fi: 0.01, fo: 0.01 },
    // 4 · all 27, all disagreeing
    shot('screen', T.full, T.eye, [{ t: T.full, ...WHOLE }, { t: T.eye, s: 0.7, x: 995, y: 1020, ease: 'linear' }]),
    { kind: 'caption', from: T.full + 0.05, to: T.eye, y: 250, text: 'every one had an opinion.', fi: 0.01, fo: 0.01 },
    // 5 · the side-eye, in silence
    shot('desk', T.eye, T.menu, [{ t: T.eye, s: 2.05, x: 400, y: 900 }, { t: T.menu, s: 2.25, x: 400, y: 892, ease: 'linear' }], { dof: { bg: 7 } }),
    // 6 · the menu, the click
    shot('screen', T.menu, 9.6, [{ t: T.menu, s: 1.0, x: 1215, y: 960 }, { t: 9.6, s: 1.06, x: 1243, y: 960, ease: 'linear' }]),
    shot('mouse', 9.6, T.wipe, [{ t: 9.6, s: 1.0, x: 560, y: 1080 }, { t: T.wipe, s: 1.05, x: 575, y: 1080 }]),
    // 7 · the wipe, and the price again
    shot('screen', T.wipe, T.view, [{ t: T.wipe, ...HEADER, y: 1040 }, { t: T.view, s: 0.7, x: 960, y: 1030, ease: 'linear' }]),
    { kind: 'caption', from: T.clean, to: T.view, y: 250, text: 'oh. there it is.', fi: 0.01, fo: 0.01 },
    // 8 · now one indicator: his own
    shot('screen', T.view, T.smirk, [{ t: T.view, ...WHOLE }, { t: T.smirk, ...HEADER, y: 1036, ease: 'linear' }]),
    { kind: 'caption', from: 12.6, to: 13.8, y: 250, text: 'now I use one.', fi: 0.01, fo: 0.01 },
    { kind: 'caption', from: 13.8, to: T.smirk, y: 250, text: '*my own.*', fi: 0.01, fo: 0.01 },
    // 9 · he sees it: a small smirk and a nod
    shot('desk', T.smirk, T.panel, [{ t: T.smirk, s: 1.12, x: 500, y: 1000 }, { t: T.panel, s: 1.2, x: 490, y: 995, ease: 'linear' }], { dof: { bg: 2 } }),
    // 10 · its dashboard up close, then the whole chart again
    shot('screen', T.panel, T.whole, [{ t: T.panel, s: 1.3, x: 1414, y: 891 }, { t: T.whole, s: 1.33, x: 1414, y: 894, ease: 'linear' }]),
    { kind: 'caption', from: T.panel + 0.1, to: T.whole, y: 210, text: 'trend, zones,\norder flow.', fi: 0.01, fo: 0.01 },
    shot('screen', T.whole, T.end, [{ t: T.whole, ...WHOLE }, { t: T.end, ...HEADER, y: 1036, ease: 'linear' }]),
    { kind: 'caption', from: T.whole + 0.05, to: T.end, y: 250, text: 'on one chart.', fi: 0.01, fo: 0.01 },
    // 11 · the end card: one ask
    { id: 'end', kind: 'end', from: T.end, to: 23.3, cta: 'Follow TCP', sub: 'One lesson an episode.', fo: 0.01,
      risk: 'Education, not financial advice. Trading carries risk.\nExample chart with example values, not real trades.' },
  ],
  cues: [
    { t: T.rebuild + 0.02, sfx: 'pop' },
    ...ON.map((t, j) => ({ t, sfx: j < 8 ? 'pop' : 'tick' })),
    { t: T.eye - 0.02, sfx: 'mute', until: 10.95 },
    { t: 9.02, sfx: 'click' }, { t: T.click, sfx: 'click' },
    { t: T.wipe + 0.02, sfx: 'whoosh' },
    // his view comes in: a pop for each layer, a tick for each block of the dashboard
    ...[12.55, 13.02, 13.3, 13.61, 13.91].map((t) => ({ t, sfx: 'pop' })),
    ...[14.15, 14.41, 14.64].map((t) => ({ t, sfx: 'tick' })),
    { t: T.panel, sfx: 'whoosh' },
    { t: T.end, sfx: 'whoosh' },
  ],
  variants: {
    // the founder's own account: no TCP bug, and a follow for him
    personal: {
      bug: false,
      scenes: {
        end: { cta: 'Follow for the next one', sub: 'The day I deleted 27 indicators.' },
      },
    },
  },
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
