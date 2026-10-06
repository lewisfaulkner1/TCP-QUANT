// Honest trading 01: the Playbook. Setups logged before the result, followed to the end automatically,
// chained so any later edit would show, and measured against no edge. Demo data in the app.
const SPEC = {
  title: 'Logged before the result',
  voice: [
    { id: 'a', say: 'Most signal groups post their wins after they happen.' },
    { id: 'b', say: 'Green screenshots. The losers quietly deleted.' },
    { id: 'c', say: 'In TCP, every setup is logged before the result: entry, stop and target, time-stamped.', pause: 0.4 },
    { id: 'd', say: "Then it's followed to the end automatically, and chained into a record where any later edit would show." },
    { id: 'e', say: 'Wins and losses, measured against what no edge would give.', pause: 0.3 },
    { id: 'f', say: "That's the Playbook. Follow TCP for honest numbers.", pause: 0.35 },
  ],
  tail: 2.6,
  cover: 0.9,
  seed: 13,
  scenes: [
    { kind: 'kicker', from: 0, to: 'a.end', text: 'Honest trading · 01', y: 480, fi: 0.01 },
    { kind: 'head', from: 0, to: 'a.end', y: 600, big: true, l1: 'They post the wins.', l2: 'After.', delay: -0.5, fi: 0.01 },
    {
      kind: 'list', from: 'a.end', to: 'c', y: 600,
      items: [{ text: 'Green screenshots', ok: false, at: 'b+0.1' }, { text: 'Losers deleted', ok: false, at: 'b+1.3' }],
    },
    {
      kind: 'phone', from: 'c', to: 'd', tag: 'DEMO DATA',
      shots: [{ shot: 'playbook', from: 'c', u0: 0 }],
      pose: [
        { t: 'c', x: 540, y: 2400, s: 0.9, rx: 30, ry: 20, rz: -8 },
        { t: 'c+0.9', x: 540, y: 800, s: 0.86, rx: 6, ry: 8, rz: 0 },
        { t: 'd', x: 540, y: 790, s: 0.912, rx: 4, ry: -6, rz: 0 },
      ],
    },
    {
      kind: 'chain', from: 'd', to: 'e', y: 440,
      blocks: [
        { title: 'Gold · buy limit', meta: 'Logged 13:41 · before the result', hash: 'a91f', at: 'd+0.1' },
        { title: 'Filled 13:58', meta: 'Chained to #a91f', hash: '4c07', at: 'd+1.4' },
        { title: 'Target hit · +2.0R', meta: 'Chained to #4c07', hash: 'e2d5', at: 'd+2.7' },
      ],
    },
    {
      kind: 'phone', from: 'e', to: 'f', tag: 'DEMO DATA',
      shots: [{ shot: 'playbook', from: 'e', u0: 5.2 }],
      pose: [
        { t: 'e', x: 540, y: 790, s: 0.894, rx: 4, ry: 8, rz: 0 },
        { t: 'f', x: 540, y: 780, s: 0.929, rx: 3, ry: -6, rz: 0 },
      ],
    },
    { kind: 'end', from: 'f', to: 'f.end+2.6', cta: 'Follow for more', sub: 'Honest numbers.', fo: 0.01, risk: 'Education, not financial advice. Trading carries risk. Demo data shown.' },
  ],
  subsY: 1462,
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
