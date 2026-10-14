// The words that go with each post. Layouts follow community/TELEGRAM.md, so automatic
// posts look the same as the ones the team writes by hand.
import { prettyDate } from './time.js';

const MINUS = '−';
export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const price = (n, dec) => n.toLocaleString('en-GB', { minimumFractionDigits: dec, maximumFractionDigits: dec });
export function fmtR(r) {
  const v = Math.round(r * 10) / 10;
  if (v === 0) return '0.0R';
  return (v > 0 ? '+' : MINUS) + Math.abs(v).toFixed(1) + 'R';
}
const rr = (sig, i) => Math.abs(sig.tp[i] - sig.entry) / Math.abs(sig.entry - sig.sl);

export function signalCaption(sig, label) {
  const side = sig.side.toUpperCase() + (sig.order && sig.order !== 'market' ? ' ' + sig.order.toUpperCase() : '');
  const lines = [
    `📈 <b>SIGNAL · ${esc(prettyDate(sig.localDate))}</b>`,
    '',
    `Market: <b>${esc(sig.instrument)}</b>`,
    `Direction: <b>${esc(side)}</b>`,
    `Entry: <code>${price(sig.entry, sig.decimals)}</code>`,
    `Stop loss: <code>${price(sig.sl, sig.decimals)}</code>`,
    sig.tp.length > 1
      ? `Take profit: <code>${price(sig.tp[0], sig.decimals)}</code> · TP2 <code>${price(sig.tp[1], sig.decimals)}</code>`
      : `Take profit: <code>${price(sig.tp[0], sig.decimals)}</code>`,
    `Risk:Reward: 1:${rr(sig, 0).toFixed(1)}${sig.tp.length > 1 ? ' · 1:' + rr(sig, 1).toFixed(1) : ''}`,
  ];
  if (sig.note) lines.push(`Why: ${esc(sig.note)}`);
  lines.push('', 'Updates follow as replies until the trade is closed.',
    `<i>${esc(label)} · Ref ${esc(sig.ref)} · Not financial advice.</i>`);
  return lines.join('\n');
}

/** Headline for an update, e.g. "✅ Take profit hit · +2.0R". */
export function updateHeadline(sig, upd, r) {
  switch (upd.event) {
    case 'tp': return `✅ <b>Take profit hit</b> · ${fmtR(r)}`;
    case 'tp2': return `✅ <b>Take profit 2 hit</b> · ${fmtR(r)}`;
    case 'sl':
      if (r > 0.05) return `✅ <b>Stopped in profit</b> · ${fmtR(r)}`;
      if (r >= -0.05) return `➖ <b>Stopped at breakeven</b> · ${fmtR(r)}`;
      return `🔴 <b>Stopped out</b> · ${fmtR(r)}`;
    case 'be': return `➖ <b>Closed at breakeven</b> · ${fmtR(r)}`;
    case 'closed': return `⏹ <b>Closed</b>${upd.price !== undefined ? ' at <code>' + price(upd.price, sig.decimals) + '</code>' : ''} · ${fmtR(r)}`;
    case 'sl_moved': {
      const be = Math.abs(upd.price - sig.entry) < 10 ** -sig.decimals / 2;
      return `🔒 <b>Stop moved</b> to <code>${price(upd.price, sig.decimals)}</code>${be ? ' (breakeven)' : ''}`;
    }
    case 'cancelled': return "✖️ <b>Cancelled</b>: the order wasn't filled";
    default: return '';
  }
}

export function updateText(sig, upd, r) {
  return `${updateHeadline(sig, upd, r)}\n${esc(sig.instrument)} ${esc(sig.side.toUpperCase())} · Ref ${esc(sig.ref)}`;
}

export function weeklyCaption(label, stats, extra = {}) {
  const lines = [`📊 <b>WEEKLY RESULTS · ${esc(label.dates)}</b>`, ''];
  if (!stats.trades.length) {
    lines.push('No trades closed this week.');
  } else {
    lines.push(
      `Trades: ${stats.trades.length}`,
      `Wins: ${stats.wins} · Losses: ${stats.losses}${stats.be ? ' · Breakeven: ' + stats.be : ''}`,
      `Net: <b>${fmtR(stats.net)}</b>`,
      '',
      'Every trade from the week is on the card, wins and losses.',
    );
  }
  if (extra.open) lines.push(`${extra.open} trade${extra.open === 1 ? '' : 's'} still open, counted in the week ${extra.open === 1 ? 'it closes' : 'they close'}.`);
  if (extra.cancelled) lines.push(`${extra.cancelled} order${extra.cancelled === 1 ? '' : 's'} cancelled before entry.`);
  lines.push('<i>Past performance is not a guide to future results. Not financial advice.</i>');
  return lines.join('\n');
}
