// Prop challenge maths 01: the same trader, the same edge, at 1% and 3% a trade on a standard phase 1.
// The simulator (terminal/src/sim-lib.js), from 50 trades: 45% wins at 1.5R with 0.05R of costs (+0.07R
// a trade), 2 trades a day, target 10%, daily limit 5%, max loss 10% static. At 1% a trade, 65% pass;
// at 3%, 31%, and every other one ends on the daily limit: 2 losses of 3.15% are 6.3% in a day.
const SPEC = {
  title: 'Same trader, same edge',
  voice: [
    { id: 'a', say: 'Buying a prop challenge? Do the maths first.' },
    { id: 'b', say: 'Say you win forty-five per cent of your trades, at one and a half R. After costs, that\'s a small edge.', show: 'Say you win 45% of your trades, at 1.5R. After costs, that\'s a small edge.', pause: 0.3 },
    { id: 'c', say: 'Risk one per cent a trade on a standard phase one, and about two in three of you pass.', show: 'Risk 1% a trade on a standard phase 1, and about 2 in 3 of you pass.', pause: 0.35 },
    { id: 'd', say: 'Risk three per cent, and it\'s less than one in three.', show: 'Risk 3%, and it\'s less than 1 in 3.', pause: 0.3 },
    { id: 'e', say: 'Two losing trades in one day now break the five per cent daily limit.', show: '2 losing trades in 1 day now break the 5% daily limit.' },
    { id: 'f', say: 'Same trader. Same edge. Only the risk changed.', pause: 0.4 },
    { id: 'g', say: 'Follow TCP for the maths behind trading.', pause: 0.35 },
  ],
  tail: 2.6,
  cover: 0.9,
  seed: 31,
  subsY: 1462,
  scenes: [
    { kind: 'kicker', from: 0, to: 'a.end', text: 'Prop challenge maths · 01', y: 480, fi: 0.01 },
    { kind: 'head', from: 0, to: 'a.end', y: 600, big: true, l1: 'Prop challenge?', l2: 'Do the maths first.', delay: -0.5, fi: 0.01 },
    { kind: 'head', from: 'a.end', to: 'c', y: 360, small: true, l1: 'Your trading', step: 0.04 },
    {
      kind: 'list', from: 'a.end', to: 'c', y: 520,
      items: [
        { text: 'Wins 45% of trades', ok: true, at: 'b+0.9' },
        { text: '1.5R a win', ok: true, at: 'b+2.4' },
        { text: 'Small edge after costs', ok: true, at: 'b+4.2' },
      ],
    },
    { kind: 'note', from: 'b+4.2', to: 'c', y: 1000, text: '+0.07R a trade after 0.05R of spread and commission.' },
    {
      kind: 'phone', from: 'c', to: 'f', tag: 'SIMULATED',
      shots: [{ shot: 'prop', from: 'c', u0: 0.4 }, { shot: 'prop', from: 'd', u0: 5.9 }, { shot: 'prop', from: 'e', u0: 7.7, speed: 0.15 }],
      pose: [
        { t: 'c', x: 540, y: 2400, s: 0.9, rx: 30, ry: -20, rz: 8 },
        { t: 'c+0.9', x: 540, y: 820, s: 0.86, rx: 6, ry: -8, rz: 0 },
        { t: 'd', x: 520, y: 810, s: 0.9, rx: 4, ry: 8, rz: 0 },
        { t: 'e', x: 540, y: 800, s: 0.93, rx: 3, ry: -6, rz: 0 },
        { t: 'f', x: 560, y: 790, s: 0.95, rx: 3, ry: 6, rz: 0 },
      ],
    },
    { kind: 'head', from: 'f', to: 'g', y: 520, l1: 'Same trader.\nSame edge.', l2: 'Only the risk\nchanged.' },
    { kind: 'note', from: 'f', to: 'g', y: 1080, text: 'Simulated from 50 trades: 45% wins at 1.5R, 2 trades a day. Target 10%, daily limit 5%, max loss 10%.' },
    { kind: 'end', from: 'g', to: 'g.end+2.6', cta: 'Follow for more', sub: 'The maths behind trading.', fo: 0.01, risk: 'Education, not financial advice. Trading carries risk. Simulated results.' },
  ],
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
