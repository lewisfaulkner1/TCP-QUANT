// For trending sounds: what TCP will never do, and what it does instead.
const SPEC = {
  title: 'Things TCP will never do',
  duration: 10,
  cover: 5.0,
  bpm: 120,
  seed: 27,
  scenes: [
    { kind: 'head', from: 0, to: 8, y: 300, small: true, l1: 'Things TCP', l2: 'will never do', delay: -0.5, fi: 0.01 },
    {
      kind: 'list', from: 0.5, to: 8, y: 640,
      items: [
        { text: 'Post only the wins', ok: false, at: 1.0 },
        { text: 'Promise 10% a month', ok: false, at: 2.0 },
        { text: 'Delete the losers', ok: false, at: 3.0 },
        { text: 'Hide the worst day', ok: false, at: 4.0 },
        { text: 'Log every setup before the result', ok: true, at: 5.5 },
      ],
    },
    { kind: 'end', from: 8, to: 10, cta: 'Follow for more', sub: 'Honest numbers.', fo: 0.01 },
  ],
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
