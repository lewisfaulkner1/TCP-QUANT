// EP24 · The Rollercoaster. A theme park at sunset, and a rollercoaster whose track is a price chart:
// from the START station up the first climb, down the big drop (a safety net under it: STOP), up again
// and on to the TARGET station, higher than the first peak. PATIENCE (front seat, with its tea) and
// FEAR (middle seat) set off; FOMO leaps on at the very top (WAIT FOR MEEE!!): FOMO gets on at the top.
// The drop: LET ME OFF!! At the bottom FEAR jumps off, and FOMO with it: FEAR gets off at the bottom.
// PATIENCE rides the plan to TARGET. The founder, at the ride's controls (RIDE AT YOUR OWN RISK): FOMO
// buys the top, FEAR sells the bottom. Which seat are you in? No voice: a fairground organ over the
// park, the chain lift's clack on the climb. The base cut is for the TCP account; --variant=personal
// is the founder's own account. The track is a drawing, not a market; the characters are made up.
// Production notes: brand/video/reels/EPISODES.md.

// The story's moments, in seconds.
const T = { climb: 2.6, top: 5.0, join: 5.3, drop: 6.6, bottom: 8.0, off: 8.4, rise: 10.2, arrive: 12.6, him: 13.4, wide: 15.4, ask: 17.4, end: 19.4 };
const DUR = 22.2;

// the track: a chart, through these points (x along the park, y down), smoothed and measured by length
const RAIL = [[-200, 1500], [300, 1500], [600, 1180], [900, 680], [1050, 610], [1180, 680], [1500, 1520], [1640, 1590], [1780, 1520],
  [2150, 960], [2300, 900], [2450, 960], [2650, 1120], [2800, 1110], [3200, 640], [3450, 520], [3700, 500], [4200, 500]];
const PTS = [];
for (let i = 0; i < RAIL.length - 1; i++) {
  const p0 = RAIL[Math.max(0, i - 1)], p1 = RAIL[i], p2 = RAIL[i + 1], p3 = RAIL[Math.min(RAIL.length - 1, i + 2)];
  for (let k = 0; k < 40; k++) {
    const u = k / 40, u2 = u * u, u3 = u2 * u;
    const c = (j) => 0.5 * (2 * p1[j] + (p2[j] - p0[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u2 + (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * u3);
    PTS.push([Math.round(c(0) * 10) / 10, Math.round(c(1) * 10) / 10]);
  }
}
PTS.push(RAIL[RAIL.length - 1]);
const LEN = [0];
for (let i = 1; i < PTS.length; i++) LEN.push(LEN[i - 1] + Math.hypot(PTS[i][0] - PTS[i - 1][0], PTS[i][1] - PTS[i - 1][1]));
const along = (d) => {
  let lo = 0, hi = PTS.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (LEN[m] <= d) lo = m; else hi = m; }
  const f = Math.min(1, Math.max(0, (d - LEN[lo]) / Math.max(1e-6, LEN[hi] - LEN[lo])));
  const [x0, y0] = PTS[lo], [x1, y1] = PTS[hi];
  return { x: x0 + (x1 - x0) * f, y: y0 + (y1 - y0) * f, a: (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI };
};
// where the car is (distance along the track) at each moment: slow up the chain lift, fast down the drop
const TOP = 1050, BOTTOM = 1640;
const dAt = (x) => { let i = 0; while (i < PTS.length - 1 && PTS[i][0] < x) i++; return LEN[i]; };
const RIDE = [
  { t: 0, d: dAt(80) }, { t: T.climb, d: dAt(130), ease: 'io' }, { t: T.top, d: dAt(TOP - 40), ease: 'linear' },
  { t: T.drop, d: dAt(TOP + 40), ease: 'linear' }, { t: T.bottom, d: dAt(BOTTOM), ease: 'in' }, { t: T.rise, d: dAt(2150), ease: 'out' },
  { t: T.arrive, d: dAt(3720), ease: 'io' }, { t: DUR, d: dAt(3740), ease: 'linear' },
];
const EASE = { linear: (u) => u, in: (u) => u * u, out: (u) => 1 - (1 - u) * (1 - u), io: (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2) };
const dTime = (t) => {
  if (t <= RIDE[0].t) return RIDE[0].d;
  for (let i = 1; i < RIDE.length; i++) if (t < RIDE[i].t) { const a = RIDE[i - 1], b = RIDE[i]; return a.d + (b.d - a.d) * EASE[b.ease || 'linear']((t - a.t) / (b.t - a.t)); }
  return RIDE[RIDE.length - 1].d;
};
const CAR = Array.from({ length: Math.ceil(DUR * 30) + 1 }, (_, f) => { const q = along(dTime(f / 30)); return [Math.round(q.x), Math.round(q.y), Math.round(q.a * 10) / 10]; });
const carAt = (t) => CAR[Math.min(CAR.length - 1, Math.max(0, Math.round(t * 30)))];
// a camera that follows the car, a key every fifth of a second
const follow = (a, b, s, dx, dy) => {
  const k = [];
  for (let t = a; t < b + 0.001; t += 0.2) { const c = carAt(Math.min(t, b)); k.push({ t: Math.min(t, b), s, x: c[0] + dx, y: c[1] + dy, ease: 'linear' }); }
  return k;
};

// him at the ride's controls
const WATCH = { arms: 'desk', lean: 2, look: [1, -0.2], lid: 0.3, brow: [0.1, 0.25], mouth: { smile: 0.2 } };
const SMIRK = { arms: 'desk', lean: 2, look: [0.6, 0.05], lid: 0.3, brow: [0, 0.35], mouth: { smirk: 1, smile: 0.1 } };
const ASK = { arms: 'desk', lean: 2, look: [-0.3, 0.05], lid: 0.28, brow: [0.45, 0.4], mouth: { smile: 0.2 } };
const P = (t, pose, ease) => ({ t, pose, ease });
const POSE = [
  P(0, WATCH), P(T.him - 0.02, WATCH),
  P(T.him, SMIRK), P(T.him + 0.4, { ...SMIRK, head: { rot: 4 } }), P(T.him + 0.8, { ...SMIRK, head: { rot: 0 } }), P(T.ask - 0.02, SMIRK),
  P(T.ask, ASK), P(T.end, ASK),
];

// the riders: who sits where, and when ([from, to, seat]: 0 at the front)
const SEATS = { patience: [0, 99, 0], fear: [0, T.off, 1], fomo: [T.join, T.off, 2] };
const CALM = { arms: 'tea', face: 1, lid: 0.48, mouth: { smile: 0.35 } };
const SCARED = { arms: 'hug', face: 1, shake: 0.7, look: [1, -0.1], brow: { worry: 1 }, mouth: { wavy: 1 } };
const SCREAM = { arms: 'up', face: 1, shake: 1, lid: 0, look: [1, -0.2], brow: { worry: 1, raise: 1 }, mouth: { open: 0.85, o: 1, wavy: 0 } };
const EAGER = { arms: 'up', face: 1, shake: 0.4, brow: { raise: 0.9 }, mouth: { smile: 0.8, open: 0.55, teeth: 1 } };
const DIZZY = { arms: 'down', face: 1, lean: -8, shake: 0.3, lid: 0.6, look: [0.3, 0.4], brow: { worry: 0.6 }, mouth: { wavy: 1, smile: -0.3 } };
const at0 = (t) => { const c = carAt(t); return { x: c[0], y: c[1] }; };
const GROUND = 1800;
const PATIENCE = [
  { t: 0, x: 0, y: 0, s: 0.95, pose: CALM }, { t: T.drop, x: 0, y: 0, s: 0.95, pose: CALM },
  { t: T.drop + 0.4, x: 0, y: 0, s: 0.95, pose: { ...CALM, lid: 0.3, mouth: { smile: 0.55 } } }, { t: DUR, x: 0, y: 0, s: 0.95, pose: { ...CALM, lid: 0.3, mouth: { smile: 0.55 } } },
];
const FEAR = [
  { t: 0, x: 0, y: 0, s: 0.95, pose: SCARED }, { t: T.drop - 0.05, x: 0, y: 0, s: 0.95, pose: SCARED },
  { t: T.drop + 0.15, x: 0, y: 0, s: 0.95, pose: SCREAM, ease: 'out' }, { t: T.off - 0.01, x: 0, y: 0, s: 0.95, pose: SCREAM },
  { t: T.off, x: at0(T.off).x - 160, y: GROUND, s: 1.1, pose: { ...SCREAM, legs: 'tuck', hop: 120 }, ease: 'step' },
  { t: T.off + 0.5, x: at0(T.off).x - 270, y: GROUND, s: 1.1, pose: { ...DIZZY, hop: 0 }, ease: 'out' }, { t: DUR, x: at0(T.off).x - 270, y: GROUND, s: 1.1, pose: DIZZY },
];
const FOMO = [
  { t: 0, x: TOP + 30, y: 640, s: 0.95, pose: EAGER }, { t: T.join - 0.25, x: TOP + 30, y: 640, s: 0.95, pose: { ...EAGER, hop: 30, legs: 'tuck' } },
  { t: T.join, x: 0, y: 0, s: 0.95, pose: EAGER, ease: 'step' }, { t: T.drop - 0.05, x: 0, y: 0, s: 0.95, pose: EAGER },
  { t: T.drop + 0.15, x: 0, y: 0, s: 0.95, pose: { ...SCREAM, mouth: { open: 0.85, o: 1, teeth: 0 } }, ease: 'out' }, { t: T.off - 0.01, x: 0, y: 0, s: 0.95, pose: SCREAM },
  { t: T.off, x: at0(T.off).x - 60, y: GROUND, s: 1.15, pose: { ...SCREAM, legs: 'tuck', hop: 140 }, ease: 'step' },
  { t: T.off + 0.55, x: at0(T.off).x - 150, y: GROUND, s: 1.15, pose: { ...DIZZY, hop: 0 }, ease: 'out' }, { t: DUR, x: at0(T.off).x - 150, y: GROUND, s: 1.15, pose: DIZZY },
];

const ride = { track: PTS, car: CAR, seats: SEATS };
const shot = (set, a, b, cam, more = {}) => ({ kind: 'toon', set, from: a, to: b, cam, pose: POSE, cast: { patience: PATIENCE, fear: FEAR, fomo: FOMO }, ride, fi: 0.01, fo: 0.01, ...more });
const PARK = (a, b, cam, more) => shot('coaster', a, b, cam, { dof: { bg: 3 }, ...more });
const FACE = (a, b) => shot('operator', a, b, [{ t: a, s: 2.05, x: 400, y: 900 }, { t: b, s: 2.2, x: 400, y: 894, ease: 'linear' }], { dof: { bg: 7 }, cast: {} });
const SAY = (who, text, a, b, x, y, tail = 'b', more = {}) => ({ kind: 'bubble', who, text, from: a, to: b, x, y, tail, fo: 0.01, ...more });

const SPEC = {
  title: 'EP24 · The Rollercoaster',
  modules: ['toon/founder.js', 'toon/toon.js', 'toon/cast.js', 'toon/places.js'],
  duration: DUR,
  cover: 0.9,
  style: 'fair',
  bpm: 120,
  seed: 24,
  ambience: 'crowd',
  sound: false,
  sfx: true,
  scenes: [
    // 1 · the hook: the whole ride, a chart
    PARK(0, T.climb, [{ t: 0, s: 0.85, x: 560, y: 1150 }, { t: T.climb, s: 0.88, x: 570, y: 1150, ease: 'linear' }]),
    { id: 'hook', kind: 'caption', from: -0.5, to: T.climb, y: 230, text: 'every trade is a\n*rollercoaster:*', sfx: false, fi: 0.01 },
    // 2 · up the chain lift; FOMO jumps on at the top
    PARK(T.climb, T.drop, follow(T.climb, T.drop, 1.35, 60, -90)),
    SAY('fomo', 'WAIT FOR\nMEEE!!', T.top - 0.6, T.join, 640, 700, 'br'),
    { kind: 'caption', from: T.join + 0.2, to: T.drop, y: 230, text: 'FOMO gets on\nat the top.', fi: 0.01, fo: 0.01 },
    // 3 · the drop
    PARK(T.drop, T.off, follow(T.drop, T.off, 1.1, 120, -40)),
    SAY('fear', 'LET ME\nOFF!!', T.drop + 0.4, T.off, 560, 640, 'b'),
    // 4 · off at the bottom
    PARK(T.off, T.rise, [{ t: T.off, s: 1.0, x: 1700, y: 1120 }, { t: T.rise, s: 1.04, x: 1720, y: 1120, ease: 'linear' }]),
    { kind: 'caption', from: T.off + 0.4, to: T.rise, y: 230, text: 'FEAR gets off\nat the bottom.', fi: 0.01, fo: 0.01 },
    // 5 · PATIENCE rides on to the target
    PARK(T.rise, T.him, follow(T.rise, T.him, 1.2, 40, -60)),
    { kind: 'caption', from: T.rise + 0.1, to: T.him, y: 230, text: 'PATIENCE rides\nthe *plan.*', fi: 0.01, fo: 0.01 },
    // 6 · the controls
    FACE(T.him, T.wide),
    { kind: 'caption', from: T.him + 0.1, to: T.wide, y: 300, text: 'FOMO buys the top.\nFEAR sells the bottom.', fi: 0.01, fo: 0.01 },
    // 7 · the whole ride again: who's where
    PARK(T.wide, T.ask, [{ t: T.wide, s: 0.4, x: 2750, y: 80 }, { t: T.ask, s: 0.42, x: 2760, y: 120, ease: 'linear' }]),
    { kind: 'caption', from: T.wide + 0.05, to: T.ask, y: 230, text: 'the stop was the net.\nit never got there.', fi: 0.01, fo: 0.01 },
    // 8 · the question
    FACE(T.ask, T.end),
    { kind: 'caption', from: T.ask + 0.05, to: T.end, y: 300, text: 'which seat\nare you in?', fi: 0.01, fo: 0.01 },
    // 9 · the end card: one ask
    { id: 'end', kind: 'end', from: T.end, to: DUR, cta: 'Follow TCP', sub: 'One lesson an episode.', fo: 0.01,
      risk: 'Education, not financial advice. Trading carries risk.\nA drawn track, not a real market. The characters are made up.' },
  ],
  cues: [
    ...Array.from({ length: 18 }, (_, i) => ({ t: T.climb + 0.1 + i * 0.13, sfx: 'tick' })),
    { t: T.join - 0.2, sfx: 'whoosh' },
    { t: T.drop, sfx: 'slide' }, { t: T.drop + 0.1, sfx: 'cheer' },
    { t: T.off, sfx: 'boing' },
    { t: T.arrive - 0.2, sfx: 'ding' },
    { t: T.him, sfx: 'whoosh' },
    { t: T.end, sfx: 'whoosh' },
  ],
  variants: {
    personal: {
      bug: false,
      scenes: { end: { cta: 'Follow for the next one', sub: 'Which seat are you in?' } },
    },
  },
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
