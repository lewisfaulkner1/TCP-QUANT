// Trading maths 02: losing streaks are normal. Over 100 trades that each win half the time, a run of
// 5 or more losses happens 81% of the time and 6 or more 55% (exact, by dynamic programming).
const SPEC = {
  title: 'Losing streaks are normal',
  voice: [
    { id: 'a', say: 'Flip a coin a hundred times.', show: 'Flip a coin 100 times.' },
    { id: 'b', say: 'What are the odds you get five tails in a row?', show: 'What are the odds of 5 tails in a row?' },
    { id: 'c', say: 'About eighty per cent.', show: 'About 80%.', pause: 0.5 },
    { id: 'd', say: 'Six in a row? Still more likely than not.', show: '6 in a row? Still more likely than not.' },
    { id: 'e', say: "Trade a strategy that wins half the time, and a run of five or six losses isn't bad luck. It's normal.", show: "Trade a strategy that wins half the time, and a run of 5 or 6 losses isn't bad luck. It's normal.", pause: 0.4 },
    { id: 'f', say: "So size your risk for the streak you'll have, not the one you hope for.", pause: 0.35 },
    { id: 'g', say: 'Follow TCP for the maths behind trading.', pause: 0.35 },
  ],
  tail: 2.6,
  cover: 0.9,
  seed: 5,
  scenes: [
    { kind: 'kicker', from: 0, to: 'b', text: 'Trading maths · 02', y: 480, fi: 0.01 },
    { kind: 'head', from: 0, to: 'b', y: 600, big: true, l1: '5 losses\nin a row.', l2: 'Bad luck?', delay: -0.5, fi: 0.01 },
    { kind: 'coins', from: 'b', to: 'e', y: 530, size: 54, fill: ['b', 'b.end+0.2'], highlight: 'd', streak: 6, seed: 40 },
    { kind: 'stamp', from: 'c', to: 'd', y: 300, size: 'm', text: '81%', sub: '5+ losses in a row', foil: true, flash: false },
    { kind: 'stamp', from: 'd', to: 'e', y: 300, size: 'm', text: '55%', sub: '6+ losses in a row', foil: true, flash: false },
    { kind: 'note', from: 'c', to: 'e', y: 1185, text: 'Over 100 trades, each a 50% win.' },
    { kind: 'head', from: 'e', to: 'f', y: 560, l1: '5 or 6 losses\nin a row', l2: 'is normal.' },
    { kind: 'head', from: 'f', to: 'g', y: 560, l1: 'Size your risk', l2: "for the streak you'll have." },
    { kind: 'end', from: 'g', to: 'g.end+2.6', cta: 'Follow for more', sub: 'The maths behind trading.', fo: 0.01 },
  ],
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
