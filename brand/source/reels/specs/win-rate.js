// Trading maths 01: a high win rate can still lose money; risk to reward decides the break-even.
// 7 wins at +£1 and 3 losses at −£3 is −£2. Break-even win rate at 1:R is 1 / (1 + R): 50%, 33%, 25%.
const SPEC = {
  title: 'Win rate is a trap',
  voice: [
    { id: 'a', say: 'You can win seven trades out of ten, and still lose money.', show: 'You can win 7 trades out of 10, and still lose money.' },
    { id: 'b', say: "Make one pound when you're right. Lose three when you're wrong.", show: "Make £1 when you're right. Lose £3 when you're wrong." },
    { id: 'c', say: "Ten trades later, you're down two pounds.", show: "10 trades later, you're down £2." },
    { id: 'd', say: 'Now flip it. Risk one to make two, and you only need to win one trade in three to break even.', show: 'Now flip it. Risk 1 to make 2, and you only need to win 1 trade in 3 to break even.', pause: 0.45 },
    { id: 'e', say: "Risk one to make three? It's one in four.", show: "Risk 1 to make 3? It's 1 in 4." },
    { id: 'f', say: 'Your win rate means nothing without your risk to reward.', pause: 0.4 },
    { id: 'g', say: 'Follow TCP for the maths behind trading.', pause: 0.35 },
  ],
  tail: 2.6,
  cover: 0.9,
  seed: 3,
  scenes: [
    { kind: 'kicker', from: 0, to: 'b', text: 'Trading maths · 01', y: 480, fi: 0.01 },
    { kind: 'head', from: 0, to: 'b', y: 600, big: true, l1: '70% win rate.', l2: 'Still losing?', delay: -0.5, fi: 0.01 },
    { kind: 'head', from: 'b', to: 'd', y: 360, small: true, l1: '10 trades', step: 0.04 },
    {
      kind: 'tiles', from: 'b', to: 'd', y: 560, totalLabel: 'TOTAL', flip: ['b+0.5', 'c.end-0.6'],
      items: [1, 1, -3, 1, 1, -3, 1, 1, 1, -3].map((v) => ({ value: v, label: v > 0 ? '+£1' : '−£3' })),
    },
    { kind: 'head', from: 'd', to: 'f', y: 360, small: true, l1: 'Win rate to break even', step: 0.04 },
    {
      kind: 'table', from: 'd', to: 'f', y: 560, dim: true,
      rows: [
        { k: 'Risk 1 : make 1', v: '50%', sub: '1 win in 2' },
        { k: 'Risk 1 : make 2', v: '33%', sub: '1 win in 3', hot: ['d+1.2', 'e'] },
        { k: 'Risk 1 : make 3', v: '25%', sub: '1 win in 4', hot: ['e', 'f'] },
      ],
    },
    { kind: 'note', from: 'd', to: 'f', y: 1150, text: 'Before spread and commission, which push each line up a little.' },
    { kind: 'head', from: 'f', to: 'g', y: 560, l1: 'Win rate means nothing', l2: 'without risk to reward.' },
    { kind: 'end', from: 'g', to: 'g.end+2.6', cta: 'Follow for more', sub: 'The maths behind trading.', fo: 0.01 },
  ],
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
