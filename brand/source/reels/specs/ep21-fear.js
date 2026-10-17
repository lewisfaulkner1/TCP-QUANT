// EP21 · Fear Closes Winners Early. A late showing of a horror film called THE TRADE: the founder
// calm in a red velvet seat, FEAR (toon/cast.js) in the next one with a bucket of popcorn. On the
// screen the price dips towards the stop: IT'S GOING DOWN!! (popcorn everywhere). It creeps back to
// just above the entry, and FEAR grabs the phone: CLOSE IT!! CLOSED +2 PIPS. Then the price runs all
// the way to the target without them, to a jump scare. …oh. Fear closes winners early; the stop was
// in, let the plan work. Ever closed a winner too early? No voice: a horror film's score (a drone, a
// heartbeat, a music box), the cuts on its phrases. The base cut is for the TCP account;
// --variant=personal is the founder's own account. The chart is a drawing, not a market; the film
// and the characters are made up. Production notes: brand/video/reels/EPISODES.md.

// The story's moments, in seconds.
const T = { film: 2.4, scream: 4.4, up: 6.0, close: 7.6, run: 9.4, scare: 11.3, oh: 12.1, him: 13.4, plan: 15.4, ask: 17.4, end: 19.4 };

const CALM = { arms: 'fold', lean: -2.5, look: [1, -0.25], lid: 0.34, brow: [0, 0.15], mouth: { smile: 0.05 } };
const GLANCE = { arms: 'fold', lean: -2.5, look: [1, 0.35], lid: 0.36, brow: [0.55, 0.1], mouth: { smile: -0.1 } };
const SMIRK = { arms: 'fold', lean: -2, look: [0.6, 0.05], lid: 0.3, brow: [0, 0.35], mouth: { smirk: 1, smile: 0.1 } };
const ASK = { arms: 'fold', lean: -2, look: [-0.3, 0.05], lid: 0.28, brow: [0.4, 0.4], mouth: { smile: 0.15 } };
const P = (t, pose, ease) => ({ t, pose, ease });
const POSE = [
  P(0, CALM), P(T.him - 0.02, CALM),
  P(T.him, SMIRK), P(T.him + 0.4, { ...SMIRK, head: { rot: 4 } }), P(T.him + 0.8, { ...SMIRK, head: { rot: 0 } }), P(T.plan - 0.02, SMIRK),
  P(T.plan, CALM), P(T.plan + 0.9, CALM), P(T.plan + 1.2, GLANCE), P(T.ask - 0.02, GLANCE),
  P(T.ask, ASK), P(T.end, ASK),
];

// the film: the title, the dip, back to just above the entry, closed, then the run to the target
const CLOSE_K = 7 / 16;
const FILM = [
  { t: 0, k: 0, title: true }, { t: 3.2, k: 0 }, { t: T.scream, k: 0.27 }, { t: T.up, k: 0.27 },
  { t: T.close, k: CLOSE_K }, { t: T.close + 0.95, k: CLOSE_K, closed: true }, { t: T.run, k: CLOSE_K, closed: true },
  { t: T.scare, k: 1, closed: true, hit: true, scare: true }, { t: 23, k: 1, closed: true, hit: true },
];

// FEAR in the next seat (it stands on the cushion; the row in front hides its feet)
const AT = { x: 800, y: 1468, s: 1.6 };
const HIDE = { arms: 'tub', popcorn: true, shake: 0.6, look: [1, -0.15], brow: { worry: 1 }, mouth: { wavy: 1, smile: -0.2 } };
const SCREAM = { arms: 'up', popcorn: false, drop: 1, spill: 1, shake: 1, hop: 22, lid: 0, look: [1, -0.1], brow: { worry: 1, raise: 1 }, mouth: { open: 0.9, o: 1, wavy: 0 } };
const PEEK = { arms: 'tub', popcorn: true, shake: 0.4, lid: 0.25, look: [1, -0.2], brow: { worry: 0.8 }, mouth: { wavy: 1 } };
const GRAB = { arms: 'phone', popcorn: false, drop: 1, screen: 'CLOSE', shake: 1, look: [0.7, -0.3], brow: { worry: 1 }, mouth: { open: 0.65, o: 1, wavy: 0 } };
const JUMP = { arms: 'up', popcorn: false, drop: 1, spill: 1, shake: 1, hop: 34, lid: 0, look: [1, -0.2], brow: { worry: 1, raise: 1 }, mouth: { open: 0.9, o: 1, wavy: 0 } };
const FROZEN = { arms: 'down', popcorn: false, drop: 1, shake: 0, lid: 0, squash: 0.25, look: [1, -0.2], brow: { raise: 1, worry: 0.4 }, mouth: { open: 0.3, wavy: 0, smile: -0.3 } };
const SINK = { arms: 'down', popcorn: false, drop: 1, shake: 0.2, lid: 0.45, squash: 0.1, look: [-0.7, -0.1], brow: { worry: 1 }, mouth: { wavy: 1 } };
const FEAR = [
  { t: 0, ...AT, pose: HIDE }, { t: T.scream - 0.05, ...AT, pose: HIDE }, { t: T.scream + 0.12, ...AT, pose: SCREAM, ease: 'out' },
  { t: T.up - 0.05, ...AT, pose: SCREAM }, { t: T.up + 0.2, ...AT, pose: PEEK }, { t: T.close - 0.05, ...AT, pose: PEEK },
  { t: T.close + 0.15, ...AT, pose: GRAB, ease: 'out' }, { t: T.run - 0.05, ...AT, pose: GRAB },
  { t: T.run + 0.2, ...AT, pose: PEEK }, { t: T.scare, ...AT, pose: PEEK }, { t: T.scare + 0.12, ...AT, pose: JUMP, ease: 'out' },
  { t: T.scare + 0.5, ...AT, pose: JUMP }, { t: T.oh - 0.1, ...AT, pose: FROZEN },
  { t: T.plan + 0.3, ...AT, pose: FROZEN }, { t: T.plan + 0.7, ...AT, pose: SINK }, { t: T.ask, ...AT, y: AT.y + 120, pose: SINK, ease: 'linear' },
];

const shot = (set, a, b, cam, more = {}) => ({ kind: 'toon', set, from: a, to: b, cam, pose: POSE, film: FILM, cast: { fear: FEAR }, fi: 0.01, fo: 0.01, ...more });
const ROWS = (a, b) => shot('cinema', a, b, [{ t: a, s: 1.12, x: 600, y: 1060 }, { t: b, s: 1.17, x: 602, y: 1062, ease: 'linear' }], { dof: { bg: 3 } });
const NEXT = (a, b) => shot('cinema', a, b, [{ t: a, s: 1.9, x: 800, y: 1270 }, { t: b, s: 2.0, x: 800, y: 1272, ease: 'linear' }], { dof: { bg: 5 } });
const SCREEN = (a, b) => shot('film', a, b, [{ t: a, s: 1.0, x: 540, y: 960 }, { t: b, s: 1.04, x: 540, y: 952, ease: 'linear' }]);
const FACE = (a, b) => shot('cinema', a, b, [{ t: a, s: 2.05, x: 400, y: 900 }, { t: b, s: 2.2, x: 400, y: 894, ease: 'linear' }], { dof: { bg: 7 }, cast: {} });
const SAY = (text, a, b, more = {}) => ({ kind: 'bubble', who: 'fear', text, from: a, to: b, x: 560, y: 560, tail: 'br', fo: 0.01, ...more });

const SPEC = {
  title: 'EP21 · Fear Closes Winners Early',
  outfit: 'amiri-hoodie',
  modules: ['toon/founder.js', 'toon/toon.js', 'toon/cast.js', 'toon/places.js'],
  duration: 22.2,
  cover: 0.9,
  style: 'horror',
  bpm: 80,
  seed: 21,
  sound: false,
  sfx: true,
  scenes: [
    // 1 · the hook: the late showing, FEAR in the next seat
    ROWS(0, T.film),
    { id: 'hook', kind: 'caption', from: -0.5, to: T.film, y: 230, text: 'watching your trade\nnext to *FEAR*:', sfx: false, fi: 0.01 },
    // 2 · the film; the dip
    SCREEN(T.film, T.scream),
    NEXT(T.scream, T.up), SAY('IT’S GOING\nDOWN!!', T.scream + 0.1, T.up),
    // 3 · back up a little; closed
    SCREEN(T.up, T.close),
    NEXT(T.close, T.run), SAY('CLOSE IT!!\nCLOSE IT!!', T.close + 0.15, T.run),
    // 4 · the run to the target, and the jump scare
    SCREEN(T.run, T.oh),
    NEXT(T.oh, T.him), SAY('…oh.', T.oh + 0.15, T.him, { size: 54, sfx: false }),
    // 5 · the lesson; FEAR sinks into its seat
    FACE(T.him, T.plan),
    { kind: 'caption', from: T.him + 0.1, to: T.plan, y: 300, text: 'fear closes\nwinners early.', fi: 0.01, fo: 0.01 },
    ROWS(T.plan, T.ask),
    { kind: 'caption', from: T.plan + 0.05, to: T.ask, y: 230, text: 'the stop was in.\nlet the plan *work.*', fi: 0.01, fo: 0.01 },
    FACE(T.ask, T.end),
    { kind: 'caption', from: T.ask + 0.05, to: T.end, y: 300, text: 'ever closed a winner\ntoo early?', fi: 0.01, fo: 0.01 },
    // 6 · the end card: one ask
    { id: 'end', kind: 'end', from: T.end, to: 22.2, cta: 'Follow TCP', sub: 'One lesson an episode.', fo: 0.01,
      risk: 'Education, not financial advice. Trading carries risk.\nA drawn chart, not a real trade. The characters are made up.' },
  ],
  cues: [
    { t: 3.4, sfx: 'creak' },
    { t: T.scream, sfx: 'whoosh' },
    { t: T.close + 0.9, sfx: 'click' },
    { t: T.scare, sfx: 'stinger' },
    { t: T.oh, sfx: 'mute', until: T.him },
    { t: T.end, sfx: 'whoosh' },
  ],
  variants: {
    personal: {
      bug: false,
      scenes: { end: { cta: 'Follow for the next one', sub: 'Fear closes winners early.' } },
    },
  },
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
