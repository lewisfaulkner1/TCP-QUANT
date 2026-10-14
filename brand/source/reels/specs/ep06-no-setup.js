// EP06 · Why We Don't Post Every Trade. A press conference: the founder at the table under the
// lights, the TCP backdrop behind him, microphones in front, the press shouting. Setup today? Gold
// long? What's the entry? He leans in: no setup. Silence, one flash. Four hours later, price reaches
// the zone: setup. The room goes off, and the plan comes up on the big screen, logged before the
// result (an example). We post when the plan says, not when the chat does: no setup is a decision too.
// From the master brief's EP06. No voice: a news theme at 120 bpm, the cuts on its bars; the music
// drops out for "no setup". The base cut is for the TCP account; --variant=personal is the founder's
// own account. The plan is an example with example prices; the press and the outlets are made up.
// Production notes: brand/video/reels/EPISODES.md.

// The story's moments, in seconds: a bar is 2 s.
const T = { crowd: 2.0, no: 4.0, later: 6.0, setup: 8.0, plan: 10.0, chat: 12.5, line: 14.5, end: 16.5 };

const CALM = { arms: 'fold', lean: -1, look: [1, 0.15], lid: 0.32, brow: [0, 0.15], mouth: { smile: 0 } };
const LEAN = { arms: 'fold', lean: 3, look: [0.9, 0.12], lid: 0.36, brow: [0.1, 0.1], mouth: { open: 0.16, smile: -0.1 } };
const FLAT = { arms: 'fold', lean: 2, look: [0.9, 0.12], lid: 0.46, brow: [0.05, 0.1], mouth: { smile: -0.15 } };
const SMIRK = { arms: 'fold', lean: -2, look: [0.6, 0.05], lid: 0.3, brow: [0, 0.35], mouth: { smirk: 1, smile: 0.1 } };
const P = (t, pose, ease) => ({ t, pose, ease });
const POSE = [
  P(0, CALM), P(T.no - 0.02, CALM), P(T.no, LEAN), P(T.no + 0.5, LEAN), P(T.no + 0.8, FLAT), P(T.setup - 0.02, FLAT),
  P(T.setup, LEAN), P(T.setup + 0.5, LEAN), P(T.setup + 0.8, CALM), P(T.line - 0.02, CALM),
  P(T.line, SMIRK), P(T.line + 0.4, { ...SMIRK, head: { rot: 4 } }), P(T.line + 0.8, { ...SMIRK, head: { rot: 0 } }), P(T.end, SMIRK),
];
// EP08's example chart on the big screen, coming back into the zone
const CHART = [{ t: 0, story: 'clutter', i: 50, ind: 0 }, { t: T.plan, story: 'clutter', i: 57.6, ind: 0, ease: 'linear' }];
const SCREEN = [[0, 'logo'], [T.later, 'chart'], [T.plan, 'plan']];
// the cameras: busy, then one in the silence, then the whole room
const FLASHES = [0.25, 0.7, 1.15, 1.6, 1.95, 2.3, 2.75, 3.1, 3.55, 3.85, T.no + 0.7,
  ...Array.from({ length: 6 }, (_, k) => T.setup + 0.05 + k * 0.24), T.chat + 0.2, T.chat + 0.9, T.chat + 1.5];

const shot = (a, b, cam, more = {}) => ({ kind: 'toon', set: 'press', from: a, to: b, cam, pose: POSE, chart: CHART, screen: SCREEN, flashes: FLASHES, bigFlashes: [T.setup + 0.05], fi: 0.01, fo: 0.01, ...more });
const WIDE = (a, b) => shot(a, b, [{ t: a, s: 1.0, x: 540, y: 1000 }, { t: b, s: 1.04, x: 540, y: 1000, ease: 'linear' }]);
const CROWD = (a, b) => shot(a, b, [{ t: a, s: 1.3, x: 560, y: 1180 }, { t: b, s: 1.36, x: 556, y: 1176, ease: 'linear' }], { dof: { fg: 4 } });
const FACE = (a, b) => shot(a, b, [{ t: a, s: 2.05, x: 400, y: 900 }, { t: b, s: 2.2, x: 400, y: 894, ease: 'linear' }], { dof: { bg: 6 } });
const BIG = (a, b) => shot(a, b, [{ t: a, s: 2.0, x: 836, y: 800 }, { t: b, s: 2.08, x: 836, y: 802, ease: 'linear' }]);
const ASK = (text, a, b, x, y, tail = 'b') => ({ kind: 'bubble', tag: 'PRESS', tagColour: '#C8281E', text, from: a, to: b, x, y, tail, fo: 0.01 });

const SPEC = {
  title: 'EP06 · Why We Don’t Post Every Trade',
  modules: ['toon/founder.js', 'toon/toon.js', 'toon/cast.js', 'toon/places.js'],
  duration: 19.3,
  cover: 0.9,
  style: 'news',
  bpm: 120,
  seed: 6,
  sound: false,
  sfx: true,
  scenes: [
    // 1 · the hook: the press conference
    WIDE(0, T.crowd),
    { id: 'hook', kind: 'caption', from: -0.5, to: T.crowd, y: 230, text: 'why we don’t post\na trade every day:', sfx: false, fi: 0.01 },
    ASK('SETUP TODAY?!', 0.35, T.crowd, 760, 1080),
    // 2 · the press
    CROWD(T.crowd, T.no),
    ASK('GOLD LONG?!', T.crowd + 0.1, 3.1, 330, 760, 'bl'),
    ASK('WHAT’S THE ENTRY?!', 3.0, T.no, 720, 1000, 'br'),
    // 3 · no setup, in silence
    FACE(T.no, T.later),
    { kind: 'caption', from: T.no + 0.15, to: T.later, y: 300, text: '*no setup.*', fi: 0.01, fo: 0.01 },
    // 4 · four hours later, price comes back
    WIDE(T.later, T.setup),
    { kind: 'caption', from: T.later + 0.1, to: T.setup, y: 230, text: '4 hours later…', fi: 0.01, fo: 0.01 },
    // 5 · setup
    FACE(T.setup, T.plan),
    { kind: 'caption', from: T.setup + 0.1, to: T.plan, y: 300, text: '*setup.*', fi: 0.01, fo: 0.01 },
    // 6 · the plan on the big screen, logged before the result
    BIG(T.plan, T.chat),
    { kind: 'caption', from: T.plan + 0.1, to: T.chat, y: 230, text: 'we post when\nthe plan says.', fi: 0.01, fo: 0.01 },
    // 7 · not when the chat does
    WIDE(T.chat, T.line),
    { kind: 'caption', from: T.chat + 0.05, to: T.line, y: 230, text: 'not when\nthe chat does.', fi: 0.01, fo: 0.01 },
    // 8 · the line
    FACE(T.line, T.end),
    { kind: 'caption', from: T.line + 0.05, to: T.end, y: 300, text: 'no setup is\na decision too.', fi: 0.01, fo: 0.01 },
    // 9 · the end card: one ask
    { id: 'end', kind: 'end', from: T.end, to: 19.3, cta: 'Follow TCP', sub: 'One lesson an episode.', fo: 0.01,
      risk: 'Education, not financial advice. Trading carries risk.\nExample plan with example prices, not a real trade.' },
  ],
  cues: [
    ...[0.25, 1.15, 1.95, 2.75, 3.55].map((t) => ({ t, sfx: 'flash' })),
    { t: T.no - 0.02, sfx: 'mute', until: T.later },
    { t: T.no + 0.7, sfx: 'flash' },
    ...[0, 1, 2, 3].map((k) => ({ t: T.later + 0.2 + k * 0.5, sfx: 'tick' })),
    { t: T.setup + 0.05, sfx: 'flash' }, { t: T.setup + 0.1, sfx: 'applause' },
    { t: T.plan, sfx: 'whoosh' },
    { t: T.chat + 0.2, sfx: 'flash' },
    { t: T.line, sfx: 'rise' },
    { t: T.end, sfx: 'whoosh' },
  ],
  variants: {
    personal: {
      bug: false,
      scenes: { end: { cta: 'Follow for the next one', sub: 'Why we don’t post every trade.' } },
    },
  },
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
