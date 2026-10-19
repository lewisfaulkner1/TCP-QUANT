// Trading maths 04: "10% a month" compounded is ×3.1 a year, ×31 in 3 years, ×304 in 5. Berkshire
// Hathaway's compounded annual gain, 1965 to 2024, was about 20% (its annual letters).
const SPEC = {
  title: '10% a month',
  voice: [
    { id: 'a', say: 'Someone promises you ten per cent a month. Sounds modest?', show: 'Someone promises you 10% a month. Sounds modest?' },
    { id: 'b', say: "Compound it for a year, and that's three times your money.", show: "Compound it for a year, and that's 3 times your money.", pause: 0.35 },
    { id: 'c', say: 'Three years: thirty-one times.', show: '3 years: 31 times.' },
    { id: 'd', say: 'Five years: three hundred times.', show: '5 years: 300 times.' },
    { id: 'e', say: "Warren Buffett's company has averaged about twenty per cent a year, for decades.", show: "Warren Buffett's company has averaged about 20% a year, for decades.", pause: 0.45 },
    { id: 'f', say: "So when someone promises ten per cent a month, ask what they're really selling.", show: "So when someone promises 10% a month, ask what they're really selling.", pause: 0.35 },
    { id: 'g', say: 'At TCP, every setup is measured against pure chance. Follow for honest numbers.', pause: 0.35 },
  ],
  tail: 2.6,
  cover: 0.9,
  seed: 9,
  scenes: [
    { kind: 'kicker', from: 0, to: 'b', text: 'Trading maths · 04', y: 480, fi: 0.01 },
    { kind: 'head', from: 0, to: 'b', y: 600, big: true, l1: '10% a month.', l2: 'Sounds modest?', delay: -0.5, fi: 0.01 },
    { kind: 'head', from: 'b', to: 'e', y: 360, small: true, l1: '10% a month, compounded', step: 0.04 },
    {
      kind: 'curve', from: 'b', to: 'e', y: 560, rate: 0.1, months: 60,
      marks: [
        { m: 12, at: 'b+1.6', top: 3.3, label: '×3.1', sub: 'AFTER 1 YEAR' },
        { m: 36, from: 12, at: 'c+1.1', prevTop: 3.3, top: 33, label: '×31', sub: 'AFTER 3 YEARS' },
        { m: 60, from: 36, at: 'd+1.1', prevTop: 33, top: 320, label: '×304', sub: 'AFTER 5 YEARS' },
      ],
    },
    {
      kind: 'vs', from: 'e', to: 'f', y: 520,
      left: { small: 'THE PROMISE', big: '+214%', span: 'a year (10% a month)', mark: '?', at: 'e' },
      right: { small: 'BUFFETT', big: '≈20%', span: 'a year, for decades', mark: '✓', good: true, at: 'e+1.4' },
    },
    { kind: 'head', from: 'f', to: 'g', y: 560, l1: "Ask what they're", l2: 'really selling.' },
    { kind: 'end', from: 'g', to: 'g.end+2.6', cta: 'Follow for more', sub: 'Honest numbers.', fo: 0.01 },
  ],
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
