// Inside the Quant Terminal 01: the odds before you trade. The engine's odds of touching each level
// before the close, the range it's likely to close in, the swarm, and the model check. Demo prices.
const SPEC = {
  title: 'Know the odds before you trade',
  voice: [
    { id: 'a', say: 'Before you take a trade, do you know the odds?' },
    { id: 'b', say: 'The TCP Quant Terminal prices every key level on gold, live.', pause: 0.35 },
    { id: 'c', say: "The chance price touches yesterday's high before the close. The range it's likely to finish in." },
    { id: 'd', say: 'It draws hundreds of possible paths to the close, and checks its own forecasts against what really happened.', pause: 0.3 },
    { id: 'e', say: 'No hype. Just probabilities.', pause: 0.4 },
    { id: 'f', say: 'Follow TCP for probabilities, not promises.', pause: 0.35 },
  ],
  tail: 3.2,
  cover: 0.9,
  seed: 11,
  subsY: 1462,
  scenes: [
    { kind: 'kicker', from: 0, to: 'a.end', text: 'Inside the Quant Terminal', y: 480, fi: 0.01 },
    { kind: 'head', from: 0, to: 'a.end', y: 600, big: true, l1: 'Do you know', l2: 'the odds?', delay: -0.5, fi: 0.01 },
    {
      kind: 'phone', from: 'a.end', to: 'e',
      shots: [{ shot: 'odds', from: 'a.end', u0: 0 }, { shot: 'swarm', from: 'd', u0: 0.5 }],
      pose: [
        { t: 'a.end', x: 540, y: 2400, s: 0.9, rx: 30, ry: -20, rz: 8 },
        { t: 'a.end+0.9', x: 540, y: 820, s: 0.86, rx: 6, ry: -8, rz: 0 },
        { t: 'c', x: 520, y: 810, s: 0.894, rx: 4, ry: 8, rz: 0 },
        { t: 'd', x: 540, y: 800, s: 0.929, rx: 3, ry: -6, rz: 0 },
        { t: 'e', x: 560, y: 790, s: 0.946, rx: 3, ry: 6, rz: 0 },
      ],
    },
    { kind: 'head', from: 'e', to: 'f', y: 600, l1: 'No hype.', l2: 'Just probabilities.' },
    { kind: 'end', from: 'f', to: 'f.end+3.2', cta: 'Follow for more', sub: 'Probabilities, not promises.', fo: 0.01, risk: 'Education, not financial advice. Trading carries risk. Demo prices shown.' },
  ],
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
