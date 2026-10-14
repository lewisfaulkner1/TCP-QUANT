// For trending sounds: which trader makes money? The answer shows after a beat, so viewers guess first. A: 70% wins, risk 3 to make 1: 7 x £1 − 3 x £3 = −£2
// per 10 trades. B: 40% wins, risk 1 to make 2: 4 x £2 − 6 x £1 = +£2 per 10 trades.
const SPEC = {
  title: 'Which trader makes money?',
  duration: 9.5,
  cover: 1.0,
  bpm: 120,
  seed: 25,
  scenes: [
    { kind: 'head', from: 0, to: 7.6, y: 300, l1: 'Which trader', l2: 'makes money?', delay: -0.5, fi: 0.01, fo: 0.3 },
    {
      kind: 'vs', from: 1.0, to: 7.6, y: 700, reveal: 4.4,
      left: { small: 'TRADER A', big: '70%', span: 'wins · risks 3 to make 1', mark: '−£2', at: 1.0 },
      right: { small: 'TRADER B', big: '40%', span: 'wins · risks 1 to make 2', mark: '+£2', good: true, at: 2.0 },
    },
    { kind: 'note', from: 2.5, to: 4.4, y: 1250, text: 'After 10 trades, who is up?' },
    { kind: 'note', from: 4.8, to: 7.6, y: 1250, text: 'Every 10 trades. Win rate means nothing without risk to reward.' },
    { kind: 'end', from: 7.5, to: 9.5, cta: 'Follow for more', sub: 'The maths behind trading.', fo: 0.01 },
  ],
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
