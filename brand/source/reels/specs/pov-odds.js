// For trending sounds: "POV: your app shows the odds", then the terminal's odds on each level. Demo prices.
const SPEC = {
  title: 'POV: your app shows the odds',
  duration: 9.5,
  cover: 1.2,
  bpm: 120,
  seed: 23,
  scenes: [
    { kind: 'head', from: 0, to: 2.6, y: 560, big: true, l1: 'POV:', l2: 'your app shows the odds.', delay: -0.5, fi: 0.01 },
    {
      kind: 'phone', from: 2.2, to: 7.6, shots: [{ shot: 'odds', from: 2.2, u0: 1.5 }],
      pose: [{ t: 2.2, x: 540, y: 2400, s: 0.9, rx: 30, ry: -20, rz: 8 }, { t: 3.1, x: 540, y: 860, s: 0.9, rx: 6, ry: -8, rz: 0 }, { t: 7.6, x: 540, y: 850, s: 0.98, rx: 3, ry: 8, rz: 0 }],
    },
    { kind: 'end', from: 7.5, to: 9.5, cta: 'Follow for more', sub: 'Probabilities, not promises.', fo: 0.01, risk: 'Education, not financial advice. Trading carries risk. Demo prices shown.' },
  ],
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
