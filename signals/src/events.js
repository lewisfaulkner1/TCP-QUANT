// The event files the trading engine drops into the outbox, and the maths on them.
// Schema: signals/EVENTS.md.

const ID_RE = /^[A-Za-z0-9._:-]{1,64}$/;
const MARKET_RE = /^[A-Z0-9.!/_-]{2,12}$/;
const ORDERS = ['market', 'limit', 'stop'];
export const UPDATE_EVENTS = ['tp', 'tp2', 'sl', 'be', 'closed', 'sl_moved', 'cancelled'];
export const CLOSING = new Set(['tp', 'tp2', 'sl', 'be', 'closed']);

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isTime = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) && !Number.isNaN(Date.parse(v));

/** Returns null when the event is usable, otherwise a sentence saying what's wrong. */
export function validateEvent(e) {
  if (!e || typeof e !== 'object' || Array.isArray(e)) return 'the file is not a JSON object';
  if (e.v !== 1) return 'v must be 1';
  if (!ID_RE.test(String(e.id ?? ''))) return 'id must be 1-64 letters, digits or . _ : -';
  if (!isTime(e.time)) return 'time must be an ISO 8601 timestamp, like 2026-09-28T13:30:00Z';
  if (e.type === 'open') {
    if (typeof e.strategy !== 'string' || !e.strategy.trim()) return 'strategy is required';
    if (!MARKET_RE.test(String(e.instrument ?? '').toUpperCase())) return 'instrument must be 2-12 characters, like XAUUSD';
    if (e.side !== 'buy' && e.side !== 'sell') return 'side must be buy or sell';
    if (e.order !== undefined && !ORDERS.includes(e.order)) return 'order must be market, limit or stop';
    if (!isNum(e.entry) || e.entry <= 0) return 'entry must be a positive number';
    if (!isNum(e.sl) || e.sl <= 0) return 'sl must be a positive number';
    const tp = Array.isArray(e.tp) ? e.tp : [e.tp];
    if (tp.length < 1 || tp.length > 2 || !tp.every((x) => isNum(x) && x > 0)) return 'tp must be one or two positive numbers';
    const up = e.side === 'buy';
    if (up ? !(e.sl < e.entry) : !(e.sl > e.entry)) return `for a ${e.side}, sl must be ${up ? 'below' : 'above'} entry`;
    if (up ? !(tp[0] > e.entry) : !(tp[0] < e.entry)) return `for a ${e.side}, tp must be ${up ? 'above' : 'below'} entry`;
    if (tp.length === 2 && (up ? !(tp[1] > tp[0]) : !(tp[1] < tp[0]))) return 'the second tp must be further from entry than the first';
    if (e.decimals !== undefined && !(Number.isInteger(e.decimals) && e.decimals >= 0 && e.decimals <= 6)) return 'decimals must be a whole number from 0 to 6';
    if (e.note !== undefined && (typeof e.note !== 'string' || e.note.length > 420)) return 'note must be text of 420 characters or fewer';
    return null;
  }
  if (e.type === 'update') {
    if (!UPDATE_EVENTS.includes(e.event)) return `event must be one of ${UPDATE_EVENTS.join(', ')}`;
    if (e.price !== undefined && (!isNum(e.price) || e.price <= 0)) return 'price must be a positive number';
    if (e.r !== undefined && !isNum(e.r)) return 'r must be a number';
    if (e.event === 'sl_moved' && e.price === undefined) return 'sl_moved needs price (the new stop)';
    if (e.event === 'closed' && e.price === undefined && e.r === undefined) return 'closed needs price or r';
    return null;
  }
  return 'type must be open or update';
}

/** The same event arriving twice (even under another file name) is posted once. */
export function eventKey(e) {
  return e.type === 'open' ? `open:${e.id}` : `update:${e.id}:${e.event}:${e.time}:${e.price ?? ''}`;
}

const round2 = (v) => Math.round(v * 100) / 100;

/** Result in R of a closing update, measured against the ORIGINAL stop distance. */
export function closeR(sig, upd) {
  const risk = Math.abs(sig.entry - sig.sl);
  const dir = sig.side === 'buy' ? 1 : -1;
  let exit;
  switch (upd.event) {
    case 'tp': exit = upd.price ?? sig.tp[0]; break;
    case 'tp2': exit = upd.price ?? sig.tp[1] ?? sig.tp[0]; break;
    case 'sl': exit = upd.price ?? sig.currentSl ?? sig.sl; break;
    case 'be': exit = upd.price ?? sig.entry; break;
    case 'closed':
      if (upd.price === undefined) return round2(upd.r);
      exit = upd.price; break;
    default: return null;
  }
  return round2(((exit - sig.entry) * dir) / risk);
}

// Price decimals shown for known markets; config.instruments overrides these.
const DEFAULT_DECIMALS = { XAUUSD: 2, XAGUSD: 3, BTCUSD: 2, ETHUSD: 2, GC: 1, MGC: 1, SI: 3, ES: 2, NQ: 2, US30: 1, NAS100: 1 };

/** Decimals for display: the event's own, the configured or known ones, else what the numbers need (at least 2). */
export function decimalsFor(e, instruments = {}) {
  if (Number.isInteger(e.decimals)) return e.decimals;
  const mk = String(e.instrument).toUpperCase();
  const conf = instruments[mk];
  if (conf && Number.isInteger(conf.decimals)) return conf.decimals;
  if (mk in DEFAULT_DECIMALS) return DEFAULT_DECIMALS[mk];
  const nums = [e.entry, e.sl, ...(Array.isArray(e.tp) ? e.tp : [e.tp])];
  return Math.min(6, Math.max(2, ...nums.map((n) => (String(n).split('.')[1] || '').length)));
}
