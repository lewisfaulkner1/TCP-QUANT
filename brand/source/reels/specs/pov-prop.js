// For trending sounds: "POV: you checked your pass chance before paying for the challenge." The
// simulator at 1% a trade (65% pass), then at 3% (31%, the rest on the daily limit). Simulated results.
const SPEC = {
  title: 'POV: you checked your pass chance',
  duration: 10,
  cover: 1.2,
  bpm: 120,
  seed: 33,
  scenes: [
    { kind: 'head', from: 0, to: 2.6, y: 520, big: true, l1: 'POV:', l2: 'you checked your pass chance before paying.', delay: -0.5, fi: 0.01 },
    {
      kind: 'phone', from: 2.2, to: 8.1, tag: 'SIMULATED',
      shots: [{ shot: 'prop', from: 2.2, u0: 0.4 }, { shot: 'prop', from: 4.6, u0: 5.9 }, { shot: 'prop', from: 6.4, u0: 7.7, speed: 0.2 }],
      pose: [{ t: 2.2, x: 540, y: 2400, s: 0.9, rx: 30, ry: -20, rz: 8 }, { t: 3.1, x: 540, y: 860, s: 0.9, rx: 6, ry: -8, rz: 0 }, { t: 8.1, x: 540, y: 850, s: 0.98, rx: 3, ry: 8, rz: 0 }],
    },
    { kind: 'end', from: 8.0, to: 10, cta: 'Follow for more', sub: 'The maths behind trading.', fo: 0.01, risk: 'Education, not financial advice. Trading carries risk. Simulated results.' },
  ],
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
