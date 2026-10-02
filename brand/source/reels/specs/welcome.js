// The welcome video for new Inner Circle members, pinned in Start here: the rules, opening the Quant
// Terminal, each tab, the briefs, the leaderboard and notifications, in about a minute. Demo prices.
const SPEC = {
  title: 'Welcome to the TCP Inner Circle',
  style: 'calm',
  sound: false, // it's posted in Telegram as it is, so no silent copy for trending sounds
  bpm: 96,
  seed: 41,
  tail: 3.4,
  cover: 1.6,
  subsY: 1500,
  voice: [
    { id: 'a', say: 'Welcome to the TCP Inner Circle.' },
    { id: 'b', say: "Here's how to get the most from it, in about a minute.", pause: 0.3 },
    { id: 'c', say: 'First, read the pinned rules. Keep your risk small, and remember: nothing here is financial advice.', pause: 0.5 },
    { id: 'd', say: 'Next, open the Quant Terminal. Tap Terminal in your chat with the bot, or the pinned link.', pause: 0.5 },
    { id: 'e', say: "On Markets, you'll see gold and Bitcoin, the key levels, and the odds of each one being touched before the close." },
    { id: 'f', say: 'On Risk, work out your lot size before every trade.' },
    { id: 'g', say: 'Under Signals, the Playbook shows every setup Lewis logs, before the result, and how each one ends.' },
    { id: 'h', say: "Before each session, Lewis's brief lands in the group, with the zones to watch and the plan." },
    { id: 'i', say: 'Under Account, connect your MT5 to see your own stats and join the leaderboard. Only percentages are shared, never your balance.', show: 'Under Account, connect your MT5 to see your own stats and join the leaderboard. Only percentages are shared, never your balance.' },
    { id: 'j', say: "Turn on notifications for signals and briefs, so you don't miss the London and New York opens.", pause: 0.5 },
    { id: 'k', say: 'Any questions, ask in the chat. Welcome in.', pause: 0.5 },
  ],
  scenes: [
    { kind: 'swarm', from: 0, to: 'c', gather: 0.4, cy: 520, fi: 0.01 },
    { kind: 'head', from: 0, to: 'c', y: 760, l1: 'Welcome to the', l2: 'Inner Circle.', delay: 0.6 },
    { kind: 'kicker', from: 'b', to: 'c', text: 'Start here · 1 minute', y: 1110 },
    { kind: 'head', from: 'c', to: 'd', y: 330, small: true, l1: 'First', step: 0.04 },
    {
      kind: 'list', from: 'c', to: 'd', y: 520,
      items: [
        { text: 'Read the pinned rules', ok: true, at: 'c+0.3' },
        { text: 'Keep your risk small', ok: true, at: 'c+1.6' },
        { text: 'Not financial advice', ok: true, at: 'c+3.6' },
      ],
    },
    { kind: 'kicker', from: 'd', to: 'e', text: 'Open the Quant Terminal', y: 262 },
    { kind: 'kicker', from: 'e', to: 'f', text: 'Markets', y: 262 },
    { kind: 'kicker', from: 'f', to: 'g', text: 'Risk', y: 262 },
    { kind: 'kicker', from: 'g', to: 'h', text: 'Signals · The Playbook', y: 262 },
    { kind: 'kicker', from: 'h', to: 'i', text: 'Session briefs', y: 262 },
    { kind: 'kicker', from: 'i', to: 'j', text: 'Account · Your stats', y: 262 },
    {
      kind: 'phone', from: 'd', to: 'j',
      shots: [
        { shot: 'markets', from: 'd', u0: 0 },
        { shot: 'odds', from: 'e', u0: 0.8 },
        { shot: 'risk', from: 'f', u0: 0 },
        { shot: 'playbook', from: 'g', u0: 0 },
        { shot: 'brief', from: 'h', u0: 0 },
        { shot: 'measured', from: 'i', u0: 0 },
      ],
      pose: [
        { t: 'd', x: 540, y: 2400, s: 0.9, rx: 30, ry: -20, rz: 8 },
        { t: 'd+1.0', x: 540, y: 860, s: 0.82, rx: 6, ry: -8, rz: 0 },
        { t: 'e', x: 540, y: 850, s: 0.86, rx: 4, ry: 8, rz: 0 },
        { t: 'f', x: 540, y: 850, s: 0.86, rx: 4, ry: -8, rz: 0 },
        { t: 'g', x: 540, y: 850, s: 0.86, rx: 4, ry: 8, rz: 0 },
        { t: 'h', x: 540, y: 850, s: 0.86, rx: 4, ry: -8, rz: 0 },
        { t: 'i', x: 540, y: 850, s: 0.86, rx: 4, ry: 8, rz: 0 },
        { t: 'j', x: 540, y: 850, s: 0.88, rx: 3, ry: -6, rz: 0 },
      ],
    },
    { kind: 'head', from: 'j', to: 'k', y: 330, small: true, l1: 'Turn on notifications', step: 0.04 },
    {
      kind: 'list', from: 'j', to: 'k', y: 520,
      items: [
        { text: 'Signals', ok: true, at: 'j+0.9' },
        { text: 'Session briefs', ok: true, at: 'j+1.5' },
        { text: 'Announcements', ok: true, at: 'j+2.1' },
      ],
    },
    { kind: 'end', from: 'k', to: 'k.end+3.4', what: 'THE INNER CIRCLE', cta: 'Welcome in', sub: 'Ask anything in the chat.', fo: 0.01, risk: 'Trading carries a high risk of losing money. Nothing here is financial advice. 18+.\nDemo prices shown.' },
  ],
};
if (typeof module !== 'undefined' && module) module.exports = SPEC; else window.SPEC = SPEC;
