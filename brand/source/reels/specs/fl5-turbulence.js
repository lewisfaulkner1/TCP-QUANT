// The Fast Lane · 5 · Turbulence. His jet hits rough air: the cabin shakes, the belt sign pings on,
// the wing flexes. He stays calm. Turbulence isn't a crash, and the pilot doesn't turn back. Price
// shakes too: that's normal. Size your trade for the bumps: too big and every bump feels like a
// crash. The bumps pass. Is your size built for turbulence? A harpsichord minuet at 108 bpm, playing
// on through the bumps, the cuts on its bars. The jet is a cartoon prop, not a trading result. The
// base cut is for the TCP account; --variant=personal is the founder's own account. Notes: EPISODES.md.

const B = 60 / 108 * 4;
const T = { sign: B, cup: 2 * B, face: 3 * B, wing: 4 * B, big: 5 * B, pass: 6 * B, ask: 7 * B, end: 8 * B };

const CALM = { arms: 'fold', lean: -3, look: [0.5, 0.1], lid: 0.32, brow: [0, 0.15], mouth: { smile: 0.12 } };
const SMIRK = { arms: 'fold', lean: -2.5, look: [0.6, 0.05], lid: 0.3, brow: [0, 0.35], mouth: { smirk: 1, smile: 0.1 } };
const ASK = { arms: 'fold', lean: -2, look: [-0.4, 0.05], lid: 0.28, brow: [0.45, 0.45], mouth: { smile: 0.15 } };
const P = (t, pose) => ({ t, pose });
const POSE = [P(0, CALM), P(T.face - 0.02, CALM), P(T.face, SMIRK), P(T.wing - 0.02, SMIRK), P(T.wing, CALM), P(T.ask - 0.02, CALM), P(T.ask, ASK), P(T.end, ASK)];
const CHART = [{ t: 0, story: 'clutter', i: 50, ind: 0 }, { t: T.end, story: 'clutter', i: 58, ind: 0, ease: 'linear' }];
// rough air until the bumps pass
const TURB = [[0, T.pass, 1.1]];

const shot = (set, a, b, cam, more = {}) => ({ kind: 'toon', set, from: a, to: b, cam, pose: POSE, chart: CHART, turb: TURB, sign: [[T.sign - 0.1, T.end]], fi: 0.01, fo: 0.01, ...more });
const WIDE = (a, b) => shot('cabin', a, b, [{ t: a, s: 1.0, x: 540, y: 960 }, { t: b, s: 1.06, x: 530, y: 955, ease: 'linear' }], { dof: { bg: 2 } });
const TABLE = (a, b) => shot('cabin', a, b, [{ t: a, s: 1.9, x: 880, y: 1380 }, { t: b, s: 2.0, x: 880, y: 1384, ease: 'linear' }], { dof: { bg: 6 } });
const FACE = (a, b) => shot('cabin', a, b, [{ t: a, s: 2.05, x: 400, y: 900 }, { t: b, s: 2.2, x: 400, y: 894, ease: 'linear' }], { dof: { bg: 6 } });
const PANEL = (a, b) => shot('panel', a, b, [{ t: a, s: 1.0, x: 540, y: 900 }, { t: b, s: 1.06, x: 540, y: 905, ease: 'linear' }]);
const WINDOW = (a, b) => shot('window', a, b, [{ t: a, s: 1.0, x: 540, y: 900 }, { t: b, s: 1.07, x: 540, y: 900, ease: 'linear' }]);
const LINE = (text, a, b, more = {}) => ({ kind: 'caption', from: a, to: b, y: 300, text, fi: 0.01, fo: 0.01, ...more });

const SPEC = {
  title: 'The Fast Lane · 5 · Turbulence',
  outfit: 'saint-laurent-crew',
  modules: ['toon/founder.js', 'toon/toon.js', 'toon/fastlane.js'],
  duration: T.end + 2.4,
  cover: 0.9,
  style: 'classical',
  bpm: 108,
  seed: 105,
  ambience: 'cabin',
  sound: false,
  sfx: true,
  scenes: [
    // 1 · the hook: the cabin shaking, him calm
    WIDE(0, T.sign),
    { id: 'kicker', kind: 'kicker', from: -0.5, to: T.sign, y: 250, text: 'The Fast Lane · 5', fi: 0.01 },
    { id: 'hook', kind: 'caption', from: -0.5, to: T.sign, y: 300, text: 'turbulence\nisn’t a *crash.*', sfx: false, fi: 0.01 },
    // 2 · the belt sign
    PANEL(T.sign, T.cup),
    LINE('the belt sign goes on.\nthat’s all.', T.sign + 0.15, T.cup),
    // 3 · the table rattles
    TABLE(T.cup, T.face),
    LINE('the pilot doesn’t\n*turn back.*', T.cup + 0.1, T.face),
    FACE(T.face, T.wing),
    LINE('price shakes too.\nthat’s *normal.*', T.face + 0.1, T.wing),
    // 4 · size for the bumps
    WINDOW(T.wing, T.big),
    LINE('size your trade\nfor the *bumps.*', T.wing + 0.1, T.big),
    WIDE(T.big, T.pass),
    LINE('too big, and bumps\nfeel like *crashes.*', T.big + 0.1, T.pass),
    // 5 · the bumps pass
    FACE(T.pass, T.ask),
    LINE('the bumps pass.', T.pass + 0.3, T.ask),
    FACE(T.ask, T.end),
    LINE('is your size built\nfor turbulence?', T.ask + 0.1, T.end),
    // 6 · the end card: one ask
    { id: 'end', kind: 'end', from: T.end, to: T.end + 2.4, cta: 'Follow TCP', sub: 'One lesson an episode.', fo: 0.01,
      risk: 'Education, not financial advice. Trading carries risk.\nA cartoon jet, not a trading result.' },
  ],
  cues: [
    { t: T.sign + 0.05, sfx: 'chime' },
    { t: T.sign + 0.6, sfx: 'belt' },
    { t: T.cup + 0.4, sfx: 'click' },
    { t: T.pass, sfx: 'ding' },
  ],
  variants: {
    personal: {
      bug: false,
      scenes: { kicker: null, end: { cta: 'Follow for the next one', sub: 'Size your trade for the bumps.' } },
    },
  },
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
