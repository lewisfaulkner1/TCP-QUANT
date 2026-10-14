// Trading maths 03: what 10 losses in a row do at different risk per trade (compounded: 1% → −9.6%,
// 5% → −40.1%, 10% → −65.1%), and the recovery maths (−50% needs +100%).
const SPEC = {
  title: 'The 1% rule',
  voice: [
    { id: 'a', say: "Ten losing trades in a row. Here's what that does to your account.", show: "10 losing trades in a row. Here's what that does to your account." },
    { id: 'b', say: "Risking one per cent a trade, you're down about ten per cent.", show: "Risking 1% a trade, you're down about 10%.", pause: 0.35 },
    { id: 'c', say: "Risking five per cent, you're down forty.", show: "Risking 5%, you're down 40%." },
    { id: 'd', say: "Risking ten per cent, you've lost two thirds of your account.", show: "Risking 10%, you've lost two thirds of your account." },
    { id: 'e', say: "And to come back from a fifty per cent loss, you have to double what's left.", show: "And to come back from a 50% loss, you have to double what's left.", pause: 0.4 },
    { id: 'f', say: "Small risk isn't boring. It's how you're still trading next year.", pause: 0.4 },
    { id: 'g', say: 'Follow TCP for the maths behind trading.', pause: 0.35 },
  ],
  tail: 2.6,
  cover: 0.9,
  seed: 7,
  scenes: [
    { kind: 'kicker', from: 0, to: 'a.end', text: 'Trading maths · 03', y: 480, fi: 0.01 },
    { kind: 'head', from: 0, to: 'a.end', y: 600, big: true, l1: '10 losses\nin a row.', l2: "What's left?", delay: -0.5, fi: 0.01 },
    { kind: 'head', from: 'a.end', to: 'e', y: 360, small: true, l1: 'Risk per trade', step: 0.04 },
    {
      kind: 'drain', from: 'a.end', to: 'e', y: 600, losses: 10, run: ['a.end+0.3', 'b'],
      accounts: [
        { label: '1%', r: 0.01, hot: ['b', 'c'] },
        { label: '2%', r: 0.02 },
        { label: '5%', r: 0.05, hot: ['c', 'd'] },
        { label: '10%', r: 0.10, hot: ['d', 'e'] },
      ],
    },
    { kind: 'stamp', from: 'e', to: 'f', y: 560, text: '+100%', sub: 'to recover from −50%', foil: true },
    { kind: 'head', from: 'f', to: 'g', y: 560, l1: "Small risk\nisn't boring.", l2: 'It keeps you trading.' },
    { kind: 'end', from: 'g', to: 'g.end+2.6', cta: 'Follow for more', sub: 'The maths behind trading.', fo: 0.01 },
  ],
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
