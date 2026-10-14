// Brand sting, for trending sounds: gold paths wander like prices, then gather into the crown.
const SPEC = {
  title: 'Probabilities, not promises',
  duration: 8,
  cover: 5.6,
  bpm: 120,
  seed: 21,
  scenes: [
    { kind: 'swarm', from: 0, to: 8, gather: 3.6, cy: 900, fi: 0.01, fo: 0.01 },
    { kind: 'head', from: 0, to: 3.5, y: 420, big: true, l1: 'Every trade', l2: 'is a probability.', delay: -0.5, fi: 0.01 },
    { kind: 'head', from: 4.9, to: 8, y: 1130, big: true, l1: '*TCP*', l2: 'Probabilities,\nnot promises.', fo: 0.01 },
  ],
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
