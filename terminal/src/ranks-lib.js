// TCP Quant Terminal: the leaderboard's maths, shared by the Worker and the page.
//
// Members who connect MT5 are measured on closed trades, from their account's own history, read
// only. The bridge sends one row per trading day: the day's return on the balance at its start
// (deposits and withdrawals set aside), how many trades closed, won and lost, and the gross wins and
// losses as fractions of that balance. No balance leaves the bridge. Weeks and months compound the
// days. Tables show how many traders were green and red, each one's worst day beside the gain, and
// what their open trades stand at: a list of top gains alone rewards gambling, and a record of
// closed trades alone can hide losers left open.
import { mondayOf, fmtNum } from './lib.js';

export const RANKS = {
  periods: { day: 'Day', week: 'This week', lastWeek: 'Last week', month: 'This month', lastMonth: 'Last month' },
  top: 50, // rows shown; the viewer's own row is added below if they're further down
  brokers: { puprime: 'PU Prime', vantage: 'Vantage' },
  steady: 20, // traded days before a consistency score says much
  tries: 5, // connections a member can make in a day: each one is a login at their broker
  reportDays: 100, // days the bridge can send at once
  flat: 1e-6, // a return this close to zero is neither green nor red
};

const rkRound = (v, d = 6) => (Number.isFinite(v) ? Math.round(v * 10 ** d) / 10 ** d : null);
const rkDay = /^\d{4}-\d{2}-\d{2}$/;
const rkShift = (key, n) => new Date(Date.parse(key + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const rkPrevMonth = (m) => {
  const [y, mo] = m.split('-').map(Number);
  return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, '0')}`;
};

// A return as members read it: +3.42%, −0.80%.
export const rankPct = (v, d = 2) => (Number.isFinite(v) ? `${v > 0 ? '+' : v < 0 ? '−' : ''}${fmtNum(Math.abs(v) * 100, d)}%` : '—');

// ------------------------------------------------------------------- periods
// The trading day before `key`, Monday back to Friday.
export function prevTradingDay(key) {
  let d = rkShift(key, -1);
  while ([0, 6].includes(new Date(d + 'T00:00:00Z').getUTCDay())) d = rkShift(d, -1);
  return d;
}

// The tables when `today` is the current trading day: the last full day, the week and month so far,
// and the week and month before them (the ones members look at over a weekend or on the 1st).
export function currentPeriods(today) {
  const week = mondayOf(today);
  const month = today.slice(0, 7);
  return { day: prevTradingDay(today), week, lastWeek: rkShift(week, -7), month, lastMonth: rkPrevMonth(month) };
}

// The first and last day of a period, as its key names it: a day, a week's Monday or a month.
export function periodRange(period, key) {
  if (period === 'day') return { from: key, to: key };
  if (period === 'week' || period === 'lastWeek') return { from: key, to: rkShift(key, 6) };
  return { from: `${key}-01`, to: `${key}-31` };
}

// The day rows that fall in a period.
export function inPeriod(days, period, key) {
  const { from, to } = periodRange(period, key);
  return days.filter((d) => d.day >= from && d.day <= to);
}

// ---------------------------------------------------------------- the tables
export const compound = (rets) => rets.reduce((a, r) => a * (1 + r), 1) - 1;

// How sure a record is that the average day isn't zero: the mean of the traded days' log returns
// over its standard error (a t-score). Needs three days that differ.
export function tScore(n, sum, sumSq) {
  if (!(n >= 3)) return null;
  const mean = sum / n;
  const variance = (sumSq - n * mean * mean) / (n - 1);
  if (!(variance > 1e-12)) return null;
  return rkRound(mean / Math.sqrt(variance / n), 2);
}

// A period's figures from its sums, the same whether they were added up here or by the database:
// lr is the sum of every day's log return, tl and tl2 the sum and sum of squares of the traded days'.
export function finishStats({ lr, trades, won, lost, days, best, worst, tl, tl2 }) {
  return {
    ret: rkRound(Math.expm1(lr)), trades, won, lost, days,
    best: rkRound(best), worst: rkRound(worst), score: tScore(days, tl, tl2),
  };
}

// One trader's period: the compounded return, trades, the best and worst day, and the consistency.
export function periodStats(days) {
  const s = { lr: 0, trades: 0, won: 0, lost: 0, days: 0, best: null, worst: null, tl: 0, tl2: 0 };
  for (const d of days) {
    const lr = Math.log1p(d.ret);
    s.lr += lr;
    s.trades += d.trades;
    s.won += d.won;
    s.lost += d.lost;
    if (d.trades > 0) {
      s.days++;
      s.tl += lr;
      s.tl2 += lr * lr;
      s.best = s.best == null ? d.ret : Math.max(s.best, d.ret);
      s.worst = s.worst == null ? d.ret : Math.min(s.worst, d.ret);
    }
  }
  return finishStats(s);
}

// Every trader with a closed trade in the period, ranked by return (or by consistency, among those
// with a score), then by more trades and the name; with the count of green and red.
export function rankTable(rows, by = 'ret') {
  const list = rows.filter((r) => r.trades > 0 && (by !== 'score' || r.score != null)).map((r) => ({ ...r }));
  list.sort((a, b) => b[by] - a[by] || b.ret - a.ret || b.trades - a.trades || (a.nick < b.nick ? -1 : a.nick > b.nick ? 1 : 0));
  list.forEach((r, i) => { r.rank = i + 1; });
  return {
    traders: list.length,
    green: list.filter((r) => r.ret > RANKS.flat).length,
    red: list.filter((r) => r.ret < -RANKS.flat).length,
    rows: list,
  };
}

// What one viewer sees of a table: the top rows and their own below them, without anyone's id.
export function viewTable(table, me = null) {
  const mine = me == null ? null : table.rows.find((r) => r.id === me) || null;
  const shown = table.rows.slice(0, RANKS.top);
  if (mine && mine.rank > RANKS.top) shown.push(mine);
  return {
    traders: table.traders, green: table.green, red: table.red,
    rows: shown.map(({ id, ...r }) => ({ ...r, me: me != null && id === me })),
    mine: mine ? mine.rank : null,
  };
}

// The table for one period from each trader's day rows: traders are { id, nick, open, days }.
export function leaderboard(traders, period, key, me = null) {
  const rows = traders.map((t) => ({ id: t.id, nick: t.nick, open: t.open ?? null, ...periodStats(inPeriod(t.days, period, key)) }));
  return { period, key, ...viewTable(rankTable(rows), me) };
}

// ------------------------------------------------------------ your trading
// Everything since connecting: win rate, profit factor (gross wins over gross losses), the average
// traded day, the best and worst day, the compounded total, the largest fall from a high on the
// curve of closed trades, and the consistency score.
export function personalStats(days) {
  const sorted = [...days].sort((a, b) => (a.day < b.day ? -1 : 1));
  const traded = sorted.filter((d) => d.trades > 0);
  const won = sorted.reduce((a, d) => a + d.won, 0);
  const lost = sorted.reduce((a, d) => a + d.lost, 0);
  const gw = sorted.reduce((a, d) => a + d.gw, 0);
  const gl = sorted.reduce((a, d) => a + d.gl, 0);
  let eq = 1;
  let peak = 1;
  let drawdown = 0;
  const curve = [];
  for (const d of sorted) {
    eq *= 1 + d.ret;
    peak = Math.max(peak, eq);
    drawdown = Math.max(drawdown, 1 - eq / peak);
    curve.push({ day: d.day, eq: rkRound(eq) });
  }
  const logs = traded.map((d) => Math.log1p(d.ret));
  return {
    days: traded.length,
    trades: sorted.reduce((a, d) => a + d.trades, 0),
    won, lost,
    winRate: won + lost ? rkRound(won / (won + lost), 4) : null,
    profitFactor: gl > 0 ? rkRound(gw / gl, 3) : gw > 0 ? Infinity : null,
    avgDay: traded.length ? rkRound(traded.reduce((a, d) => a + d.ret, 0) / traded.length) : null,
    best: traded.length ? rkRound(Math.max(...traded.map((d) => d.ret))) : null,
    worst: traded.length ? rkRound(Math.min(...traded.map((d) => d.ret))) : null,
    total: rkRound(eq - 1),
    maxDrawdown: rkRound(drawdown),
    score: tScore(logs.length, logs.reduce((a, v) => a + v, 0), logs.reduce((a, v) => a + v * v, 0)),
    curve,
  };
}

// ------------------------------------------------------------------- checks
// A day from the bridge, or null if it can't be right: a date, a return between −100% and +1,000%,
// whole counts that add up, and gross wins and losses that aren't negative. A day that lost
// everything is kept as −99.99%, so the log return stays finite.
export function cleanDay(row) {
  if (!row || typeof row !== 'object' || !rkDay.test(String(row.day))) return null;
  const t = Date.parse(row.day + 'T00:00:00Z');
  if (!Number.isFinite(t) || new Date(t).toISOString().slice(0, 10) !== row.day) return null; // 2026-02-30 isn't a day
  const n = (v) => (Number.isInteger(v) && v >= 0 && v <= 10000 ? v : null);
  const f = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : null);
  const out = { day: row.day, ret: f(row.ret, -1, 10), trades: n(row.trades), won: n(row.won), lost: n(row.lost), gw: f(row.gw, 0, 100), gl: f(row.gl, 0, 100) };
  if (Object.values(out).some((v) => v === null)) return null;
  if (out.won + out.lost > out.trades) return null;
  const ret = rkRound(Math.max(out.ret, -0.9999));
  return { ...out, ret, lr: Math.log1p(ret), gw: rkRound(out.gw), gl: rkRound(out.gl) };
}

// What a trader's open trades stand at, as a fraction of their balance, or null.
export const cleanOpen = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= -1 && v <= 10 ? rkRound(v, 4) : null);

// A leaderboard name: 2 to 20 letters, numbers, spaces and . _ -, starting with a letter or number,
// and not one that passes for TCP's own.
const rkReserved = /(^|[^a-z])(tcp|admin|official|support|moderator|crypto ?playbook)([^a-z]|$)/i;
export function cleanNick(value) {
  const s = String(value ?? '').replace(/\s+/g, ' ').trim();
  return /^[\p{L}\p{N}][\p{L}\p{N} ._-]{1,19}$/u.test(s) && !rkReserved.test(s) ? s : null;
}

// An MT5 account at one of TCP's brokers: the login's digits, and the server as MT5 shows it
// (a live PU Prime or Vantage server, not a demo). Returns the broker too.
export function cleanAccount({ login, server }) {
  const l = String(login ?? '').replace(/\s+/g, '');
  const s = String(server ?? '').replace(/\s+/g, ' ').trim();
  if (!/^\d{4,12}$/.test(l)) return { error: 'The account number is the digits MT5 shows for your account.', field: 'login' };
  if (!s || s.length > 64 || /demo/i.test(s)) return { error: 'Enter the live server name exactly as MT5 shows it under your account.', field: 'server' };
  const broker = /^pu[\s-]*prime/i.test(s) ? 'puprime' : /^vantage/i.test(s) ? 'vantage' : null;
  if (!broker) return { error: 'The leaderboard is for PU Prime and Vantage accounts.', field: 'server' };
  return { login: l, server: s, broker };
}
