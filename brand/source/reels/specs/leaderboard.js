// For trending sounds: the leaderboard that shows each trader's worst day and open trades. Demo data.
const SPEC = {
  title: 'A leaderboard that shows the worst day',
  duration: 10,
  cover: 1.0,
  bpm: 120,
  seed: 29,
  scenes: [
    { kind: 'head', from: 0, to: 2.8, y: 560, l1: 'A leaderboard', l2: 'that shows\nthe worst day.', delay: -0.5, fi: 0.01 },
    {
      kind: 'phone', from: 2.4, to: 8.2, tag: 'DEMO DATA', shots: [{ shot: 'ranks', from: 2.4, u0: 0 }],
      pose: [{ t: 2.4, x: 540, y: 2400, s: 0.9, rx: 30, ry: 20, rz: -8 }, { t: 3.3, x: 540, y: 860, s: 0.9, rx: 6, ry: 8, rz: 0 }, { t: 8.2, x: 540, y: 850, s: 0.98, rx: 3, ry: -8, rz: 0 }],
    },
    { kind: 'end', from: 8.1, to: 10, cta: 'Follow for more', sub: 'Percentages only. Never balances.', fo: 0.01, risk: 'Coming to the TCP Inner Circle. Demo data shown. Trading carries risk.' },
  ],
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
