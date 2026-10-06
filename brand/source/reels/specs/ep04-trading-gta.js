// EP04 · If Trading Was GTA. The city from above at night, his car on the sat nav: left onto FOMO Ave
// (nothing there: recalculating), Revenge Rd (road closed: stopped out), then floor it down
// Overleverage St to the river: margin call. Respawn. New route: wait for liquidity at the red light
// while the market goes past, then Patience Way, Plan St, and the pin: level complete. Same city,
// better route: the plan is the map. No voice: trap at 140 bpm, a game's sounds. The base cut is for
// the TCP account; --variant=personal is the founder's own account. The map and its street names are
// made up. Production notes: brand/video/reels/EPISODES.md.

const T = { go: 2.2, recalc: 4.4, revenge: 4.9, closed: 6.3, floor: 7.1, margin: 9.3, respawn: 11.6, wait: 12.4, green: 14.4, plan: 15.6, arrive: 16.6, over: 17.0, end: 20.2 };

const CONFIDENT = { arms: 'rest', look: [1, 0.2], lid: 0.12, brow: [-0.2, -0.1], mouth: { smile: 0.3 } };
const ANNOYED = { arms: 'rest', look: [1, 0.22], lid: 0.3, brow: [-0.8, -0.7], mouth: { smile: -0.4 } };
const ANGRY = { arms: 'rest', look: [1, 0.2], lid: 0.08, brow: [-0.95, -0.85], mouth: { open: 0.22 } };
const SHOCK = { arms: 'rest', look: [1, 0.15], wide: 1, lid: 0, brow: [1, 1], mouth: { open: 0.35 } };
const CALM = { arms: 'rest', look: [1, 0.2], lid: 0.3, brow: [0, 0.2], mouth: { smile: 0.05 } };
const SMIRK = { arms: 'rest', look: [-1, 0.05], lid: 0.28, brow: [0, 0.35], mouth: { smirk: 1, smile: 0.1 } };
const P = (t, pose) => ({ t, pose });
const POSE = [P(0, CONFIDENT), P(T.recalc, ANNOYED), P(T.closed, ANGRY), P(T.margin, SHOCK), P(T.respawn, CALM), P(T.arrive, SMIRK)];

const A1 = [[0, 200], [0, -480], [-960, -480]], A2 = [[-960, -480], [-960, -1150]], A3 = [[-960, -1150], [-960, -960], [-1480, -960]];
const B = [[0, 200], [0, -480], [0, -1920], [960, -1920]];
const RED = '#FF4B3E', PURPLE = '#B26BFF', GOLDEN = '#E6C15A';

const SPEC = {
  title: 'EP04 · If Trading Was GTA',
  modules: ['toon/founder.js', 'toon/toon.js'],
  duration: 23.0,
  cover: 0.9,
  style: 'trap',
  bpm: 140,
  seed: 4,
  sound: false,
  sfx: true,
  scenes: [
    {
      kind: 'toon', set: 'map', from: 0, to: T.end, fi: 0.01, fo: 0.01, pose: POSE, chart: [{ t: 0, i: 21 }],
      route: [
        { t: 0, x: 0, y: 200 }, { t: T.go, x: 0, y: 200 },
        { t: 3.0, x: 0, y: -480, ease: 'in' }, { t: T.recalc, x: -960, y: -480 }, { t: T.revenge, x: -960, y: -480 },
        { t: T.closed, x: -960, y: -1150, ease: 'in' }, { t: T.floor, x: -960, y: -1150 },
        { t: 7.6, x: -960, y: -960, rev: true, ease: 'io' }, { t: T.margin, x: -1480, y: -960, ease: 'in' }, { t: 10.9, x: -1480, y: -960 },
        { t: T.respawn, x: 0, y: 200, jump: true },
        { t: T.wait, x: 0, y: -400, ease: 'out' }, { t: T.green, x: 0, y: -400 },
        { t: T.plan, x: 0, y: -1920, ease: 'in' }, { t: T.arrive, x: 900, y: -1920 }, { t: 23, x: 900, y: -1920 },
      ],
      legs: [
        { from: T.go, to: T.recalc, pts: A1 }, { from: T.revenge, to: T.closed, pts: A2 }, { from: T.floor, to: T.margin, pts: A3 },
        { from: T.respawn, to: T.arrive, pts: B, colour: GOLDEN },
        { from: T.over, to: 23, pts: [...A1, ...A2.slice(1), ...A3.slice(1)], colour: RED }, { from: T.over, to: 23, pts: B, colour: GOLDEN },
      ],
      stars: [[0, 0], [T.recalc, 1], [T.closed, 2], [T.margin, 3], [T.arrive + 0.1, 0]],
      gps: [
        [T.go, 'turn left: FOMO AVE', false, '←'], [T.recalc, 'RECALCULATING…', true],
        [T.revenge, 'take REVENGE RD', false, '→'], [T.closed, 'ROAD CLOSED', true],
        [T.floor, 'floor it: OVERLEVERAGE ST', false, '←'], [T.margin, 'NO ROUTE', true],
        [T.respawn, 'new route: WAIT FOR LIQUIDITY', false, '↑'], [T.green, 'go: PATIENCE WAY', false, '↑'],
        [T.plan, 'turn right: PLAN ST', false, '→'], [T.arrive, 'you have arrived', false, '✓'],
        [18.2, '', false],
      ],
      banners: [[T.closed + 0.05, T.floor, 'STOPPED OUT', RED], [T.margin + 0.05, 10.9, 'MARGIN CALL', RED], [T.arrive + 0.1, 18.2, 'LEVEL COMPLETE', '#F6E3A3']],
      wait: [T.wait, T.green],
      overview: [T.over, -240, -860, 0.42],
      flash: [T.respawn],
      pin: { x: 960, y: -1920, label: 'LIQUIDITY' },
    },
    { id: 'hook', kind: 'caption', from: -0.5, to: T.go, y: 230, text: 'if trading\nwas GTA', sfx: false, fi: 0.01 },
    { kind: 'caption', from: 18.2, to: 19.2, y: 230, text: 'same city.\nbetter route.', fi: 0.01, fo: 0.01 },
    { kind: 'caption', from: 19.2, to: T.end, y: 230, text: 'the plan is the map.', fi: 0.01, fo: 0.01 },
    { id: 'end', kind: 'end', from: T.end, to: 23.0, cta: 'Follow TCP', sub: 'One lesson an episode.', fo: 0.01,
      risk: 'Education, not financial advice. Trading carries risk.\nThe map and its streets are made up.' },
  ],
  cues: [
    { t: T.go, sfx: 'gps' }, { t: T.recalc, sfx: 'error' }, { t: T.revenge, sfx: 'gps' },
    { t: T.closed, sfx: 'slam' }, { t: T.floor, sfx: 'gps' }, { t: T.margin, sfx: 'slam' },
    { t: T.margin + 0.05, sfx: 'mute', until: T.respawn },
    { t: T.respawn, sfx: 'blip' }, { t: T.green, sfx: 'gps' }, { t: T.plan, sfx: 'gps' },
    { t: T.arrive + 0.1, sfx: 'level' }, { t: T.end, sfx: 'whoosh' },
  ],
  variants: {
    personal: {
      bug: false,
      scenes: { end: { cta: 'Follow for the next one', sub: 'If trading was GTA.' } },
    },
  },
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
