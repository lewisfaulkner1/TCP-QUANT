// The Fast Lane · 4 · Flight Plan. Sunrise on the apron: his jet, a red carpet, him climbing the
// stairs to its door. No pilot takes off without a flight plan: the route (where you get in), the fuel (how
// much you risk) and the alternate (where you land if it goes wrong). Then you fly it. Your trade
// needs one too: no plan, no take-off. Do you file a plan before every trade? A lounge bossa at
// 100 bpm under the cabin's hum, the cuts on its bars. The jet is a cartoon prop, not a trading
// result. The base cut is for the TCP account; --variant=personal is the founder's own account.
// Notes: brand/video/reels/EPISODES.md.

const B = 60 / 100 * 4;
const T = { follow: B, cabin: 2 * B, fly: 4 * B, face: 5 * B, rule: 6 * B, ask: 7 * B, end: 8 * B };

const CLIMB = { arms: 'rest', look: [1, -0.25], lid: 0.28, brow: [0.1, 0.2], mouth: { smile: 0.05 } };
const BACK = { arms: 'rest', look: [-0.7, 0.05], lid: 0.28, brow: [0.2, 0.4], mouth: { smirk: 1, smile: 0.15 } };
const READ = { arms: 'phone', lean: 1, look: [0.4, 0.62], lid: 0.12, brow: [0.3, 0.4], mouth: { smile: 0 } };
const CALM = { arms: 'fold', lean: -3, look: [0.5, 0.1], lid: 0.32, brow: [0, 0.15], mouth: { smile: 0.12 } };
const ASK = { arms: 'fold', lean: -2, look: [-0.4, 0.05], lid: 0.28, brow: [0.45, 0.45], mouth: { smile: 0.15 } };
const P = (t, pose) => ({ t, pose });
const POSE = [
  P(0, CLIMB), P(T.cabin - 0.9, CLIMB), P(T.cabin - 0.5, BACK), P(T.cabin - 0.02, BACK),
  P(T.cabin, READ), P(T.fly - 0.02, READ), P(T.fly, CALM), P(T.ask - 0.02, CALM), P(T.ask, ASK), P(T.end, ASK),
];
// the laptop on his table: EP08's clean example chart, quietly printing
const CHART = [{ t: 0, story: 'clutter', i: 50, ind: 0 }, { t: T.end, story: 'clutter', i: 60, ind: 0, ease: 'linear' }];

const shot = (set, a, b, cam, more = {}) => ({ kind: 'toon', set, from: a, to: b, cam, pose: POSE, chart: CHART, climb: [{ t: 0, k: 0 }, { t: T.cabin - 0.95, k: 1, ease: 'linear' }], fi: 0.01, fo: 0.01, ...more });
const APRON = (a, b) => shot('tarmac', a, b, [{ t: a, s: 1.26, x: 700, y: 1330 }, { t: b, s: 1.34, x: 684, y: 1324, ease: 'linear' }], { dof: { bg: 2 } });
const STAIRS = (a, b) => shot('tarmac', a, b, [{ t: a, s: 2.3, x: 700, y: 1290 }, { t: b - 0.9, s: 2.5, x: 548, y: 1196, ease: 'linear' }, { t: b, s: 2.54, x: 544, y: 1192, ease: 'linear' }], { dof: { bg: 5 } });
const WIDE = (a, b) => shot('cabin', a, b, [{ t: a, s: 1.0, x: 540, y: 960 }, { t: b, s: 1.06, x: 530, y: 955, ease: 'linear' }], { dof: { bg: 2 } });
const FACE = (a, b) => shot('cabin', a, b, [{ t: a, s: 2.05, x: 400, y: 900 }, { t: b, s: 2.2, x: 400, y: 894, ease: 'linear' }], { dof: { bg: 6 } });
const WINDOW = (a, b) => shot('window', a, b, [{ t: a, s: 1.0, x: 540, y: 900 }, { t: b, s: 1.07, x: 540, y: 900, ease: 'linear' }]);
const LINE = (text, a, b, more = {}) => ({ kind: 'caption', from: a, to: b, y: 300, text, fi: 0.01, fo: 0.01, ...more });
const NOTE = (num, text, sub, a, b) => ({ kind: 'caption', style: 'note', num, text, sub, from: a, to: b, y: 300, fi: 0.01, fo: 0.01 });

const SPEC = {
  title: 'The Fast Lane · 4 · Flight Plan',
  outfit: 'dior-puffer',
  modules: ['toon/founder.js', 'toon/toon.js', 'toon/fastlane.js'],
  duration: T.end + 2.4,
  cover: 0.9,
  style: 'lounge',
  bpm: 100,
  seed: 104,
  ambience: 'cabin',
  sound: false,
  sfx: true,
  scenes: [
    // 1 · the hook: the jet at sunrise, him on the stairs
    APRON(0, T.follow),
    { id: 'kicker', kind: 'kicker', from: -0.5, to: T.cabin, y: 250, text: 'The Fast Lane · 4', fi: 0.01 },
    { id: 'hook', kind: 'caption', from: -0.5, to: T.cabin, y: 300, text: 'no pilot takes off\nwithout a *flight plan.*', sfx: false, fi: 0.01 },
    STAIRS(T.follow, T.cabin),
    // 2 · the plan, three lines
    WIDE(T.cabin, T.fly),
    NOTE('1', 'THE ROUTE', 'where you get in', T.cabin + 0.15, T.cabin + 1.6),
    NOTE('2', 'THE FUEL', 'how much you risk', T.cabin + 1.6, T.cabin + 3.2),
    NOTE('3', 'THE ALTERNATE', 'where you land if it goes wrong', T.cabin + 3.2, T.fly),
    // 3 · then you fly it
    WINDOW(T.fly, T.face),
    LINE('then you\n*fly it.*', T.fly + 0.15, T.face),
    // 4 · the lesson
    FACE(T.face, T.rule),
    LINE('your trade needs\n*one too.*', T.face + 0.1, T.rule),
    WIDE(T.rule, T.ask),
    LINE('no plan,\nno *take-off.*', T.rule + 0.1, T.ask),
    FACE(T.ask, T.end),
    LINE('do you file a plan\nbefore every trade?', T.ask + 0.1, T.end),
    // 5 · the end card: one ask
    { id: 'end', kind: 'end', from: T.end, to: T.end + 2.4, cta: 'Follow TCP', sub: 'One lesson an episode.', fo: 0.01,
      risk: 'Education, not financial advice. Trading carries risk.\nA cartoon jet, not a trading result.' },
  ],
  cues: [
    { t: 1.0, sfx: 'jet' },
    { t: T.cabin + 0.05, sfx: 'chime' },
    { t: T.fly + 0.05, sfx: 'whoosh' },
  ],
  variants: {
    personal: {
      bug: false,
      scenes: { kicker: null, end: { cta: 'Follow for the next one', sub: 'No plan, no take-off.' } },
    },
  },
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
