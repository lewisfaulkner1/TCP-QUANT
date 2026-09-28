// For trending sounds: the lot-size calculator. Demo prices.
const SPEC = {
  title: 'Stop guessing your lot size',
  duration: 9.5,
  cover: 1.0,
  bpm: 120,
  seed: 31,
  scenes: [
    { kind: 'head', from: 0, to: 2.6, y: 600, l1: 'Stop guessing', l2: 'your lot size.', delay: -0.5, fi: 0.01 },
    {
      kind: 'phone', from: 2.2, to: 7.7, shots: [{ shot: 'risk', from: 2.2, u0: 0.3 }],
      pose: [{ t: 2.2, x: 540, y: 2400, s: 0.9, rx: 30, ry: -20, rz: 8 }, { t: 3.1, x: 540, y: 860, s: 0.9, rx: 6, ry: -8, rz: 0 }, { t: 7.7, x: 540, y: 850, s: 0.98, rx: 3, ry: 8, rz: 0 }],
    },
    { kind: 'end', from: 7.6, to: 9.5, cta: 'Follow for more', sub: 'Risk first. Every trade.', fo: 0.01, risk: 'Education, not financial advice. Trading carries risk. Demo prices shown.' },
  ],
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
