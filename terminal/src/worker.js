// TCP Quant Terminal: a members-only Telegram Mini App on a Cloudflare Worker (free plan).
//
// Members open it from the bot. Telegram signs who they are (the Mini App's
// initData, checked here with the bot token), and the Worker asks Telegram
// whether they're in the Inner Circle (or the team group) before sending
// any data. Nobody logs in and nothing is stored.
//
// Each market's answer carries the probability engine's inputs (see lib.js):
// the hour-by-hour volatility profile from two months of hourly bars, the time
// of today's close, the market state, and the out-of-sample model check. The
// page recomputes the odds from these every second and on every price.
//
// Settings live in the Worker's environment, never in this file:
//   BOT_TOKEN              secret: the onboarding bot's token
//   INNER_CIRCLE_CHAT_ID   members of this group get in
//   ADMIN_CHAT_ID          optional: the team group gets in too
//   TWELVE_DATA_KEY        secret: a free twelvedata.com key, for gold prices
import { MARKETS, toDays, snapshot, marketStatus, volProfile, marketState, calibrate, dayEnd } from './lib.js';
import { PAGE, FONTS } from './assets.js';

const SIGN_IN_MAX_AGE = 24 * 3600; // Telegram's signature on a Mini App session
const MEMBER_TTL = 600; // seconds a "yes, member" answer is reused
const NON_MEMBER_TTL = 60; // so a newly approved member gets in within a minute
// Refresh rates. Gold's free allowance is 800 requests a day: 15-minute bars every
// 150 seconds (about 550 a day) plus hourly history once an hour (about 23).
const TTL = {
  XAUUSD: { recent: 150, history: 3600 },
  BTCUSD: { recent: 60, history: 3600 },
  closed: 6 * 3600, // gold's prices don't move while it's closed
  check: 6 * 3600, // the model check changes slowly
  fx: 6 * 3600,
};
const HISTORY_BARS = 1500; // hourly: about two months, for the volatility profile and the model check
const CHART_BARS = 192; // 15-minute bars: two days

const now = () => Math.floor(Date.now() / 1000);
const enc = (s) => new TextEncoder().encode(s);
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

// ------------------------------------------------------------ Telegram sign-in
async function hmac(key, data) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, data);
}

function sameText(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
export async function verifyInitData(initData, botToken, at = now()) {
  if (!initData || !botToken) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash') || '';
  params.delete('hash');
  const check = [...params].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = await hmac(enc('WebAppData'), enc(botToken));
  if (!sameText(hex(await hmac(secret, enc(check))), hash.toLowerCase())) return null;
  const authDate = Number(params.get('auth_date'));
  if (!(authDate > at - SIGN_IN_MAX_AGE && authDate <= at + 60)) return null;
  let user;
  try {
    user = JSON.parse(params.get('user') || 'null');
  } catch {
    return null;
  }
  return user && Number.isInteger(user.id) ? user : null;
}

async function telegram(env, method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  // Log the method and Telegram's reason only: the request URL holds the token.
  const data = await res.json().catch(() => ({ ok: false, description: `HTTP ${res.status}` }));
  if (!data.ok) console.error(`telegram ${method} failed: ${data.description}`);
  return data;
}

const members = new Map(); // user id -> { role, until }

export async function membership(env, userId, at = now()) {
  const hit = members.get(userId);
  if (hit && hit.until > at) return hit.role;
  let role = null;
  for (const [chat, name] of [[env.INNER_CIRCLE_CHAT_ID, 'member'], [env.ADMIN_CHAT_ID, 'team']]) {
    if (!chat) continue;
    const r = await telegram(env, 'getChatMember', { chat_id: chat, user_id: userId });
    const status = r.ok ? r.result.status : '';
    if (['creator', 'administrator', 'member'].includes(status) || (status === 'restricted' && r.result.is_member)) {
      role = name;
      break;
    }
  }
  members.set(userId, { role, until: at + (role ? MEMBER_TTL : NON_MEMBER_TTL) });
  return role;
}

// ----------------------------------------------------------------- market data
const cache = new Map(); // key -> { value, at }

// Serve fresh data when it's young enough; on a failed refresh, serve the last good copy marked stale.
async function cached(key, ttl, load, at = now()) {
  const hit = cache.get(key);
  if (hit && at - hit.at < ttl) return { ...hit.value, stale: false };
  try {
    const value = await load();
    cache.set(key, { value, at });
    return { ...value, stale: false };
  } catch (err) {
    console.error(`${key} failed: ${err.message}`);
    if (hit) return { ...hit.value, stale: true };
    throw err;
  }
}

async function getJson(url, headers = {}) {
  const res = await fetch(url, { headers: { 'user-agent': 'TCP-Quant-Terminal/1.0', ...headers } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Twelve Data: [{ datetime: '2026-09-23 14:00:00', open, high, low, close }], newest first.
async function twelveData(env, interval, size) {
  const url = `https://api.twelvedata.com/time_series?symbol=XAU/USD&interval=${interval}&outputsize=${size}&timezone=UTC&apikey=${encodeURIComponent(env.TWELVE_DATA_KEY)}`;
  const data = await getJson(url);
  if (data.status !== 'ok' || !Array.isArray(data.values)) throw new Error(`Twelve Data: ${data.message || 'no data'}`);
  return data.values
    .map((v) => ({ t: Date.parse(v.datetime.replace(' ', 'T') + 'Z') / 1000, o: +v.open, h: +v.high, l: +v.low, c: +v.close }))
    .sort((a, b) => a.t - b.t);
}

// Coinbase Exchange: [[time, low, high, open, close, volume]], newest first, 300 at most.
async function coinbase(granularity, start, end) {
  const range = start ? `&start=${new Date(start * 1000).toISOString()}&end=${new Date(end * 1000).toISOString()}` : '';
  const rows = await getJson(`https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=${granularity}${range}`);
  if (!Array.isArray(rows)) throw new Error('Coinbase: no data');
  return rows.map(([t, l, h, o, c]) => ({ t, o, h, l, c }));
}

const tidy = (bars) => [...new Map(bars.map((b) => [b.t, b])).values()].sort((a, b) => a.t - b.t);

// Hourly history: the volatility profile, previous days and weeks, and the model check.
async function loadHistory(env, symbol, at) {
  if (symbol === 'XAUUSD') return twelveData(env, '1h', HISTORY_BARS);
  const hour = Math.floor(at / 3600) * 3600;
  const windows = [];
  for (let end = hour + 3600; windows.length < HISTORY_BARS / 300; end -= 300 * 3600) windows.push(coinbase(3600, end - 300 * 3600, end));
  return tidy((await Promise.all(windows)).flat());
}

const loadRecent = (env, symbol) => (symbol === 'XAUUSD' ? twelveData(env, '15min', 200) : coinbase(900).then(tidy));

async function loadMarket(env, symbol, at) {
  const market = MARKETS[symbol];
  const open = marketStatus(market, at).open;
  const ttl = TTL[symbol];
  const [history, recent] = await Promise.all([
    cached(`${symbol}:1h`, open ? ttl.history : TTL.closed, async () => {
      const bars = await loadHistory(env, symbol, at);
      return { bars, profile: volProfile(bars) };
    }, at),
    cached(`${symbol}:15m`, open ? ttl.recent : TTL.closed, async () => ({ bars: await loadRecent(env, symbol) }), at),
  ]);
  const check = await cached(`${symbol}:check`, TTL.check, async () => ({ result: calibrate(history.bars, market) }), at).catch(() => ({ result: null }));
  const snap = snapshot(market, toDays(history.bars, market), recent.bars, at);
  const live = { t: at, o: snap.price, h: snap.price, l: snap.price, c: snap.price };
  return {
    ...snap,
    engine: {
      profile: history.profile,
      dayEnd: dayEnd(snap.day, market),
      state: marketState([...history.bars, live], history.profile),
      check: check.result,
    },
    spark: history.bars.slice(-47).map((b) => b.c).concat(snap.price),
    bars: recent.bars.slice(-CHART_BARS).map((b) => [b.t, b.o, b.h, b.l, b.c]),
    source: symbol === 'XAUUSD' ? 'Twelve Data (XAU/USD spot)' : 'Coinbase (BTC-USD)',
    updated: at,
    stale: history.stale || recent.stale,
  };
}

// USD per unit of account currency, for GBP and EUR accounts (ECB rates).
async function loadFx() {
  const data = await getJson('https://api.frankfurter.app/latest?from=USD&to=GBP,EUR');
  const rates = data.rates || {};
  if (!(rates.GBP > 0 && rates.EUR > 0)) throw new Error('FX: no rates');
  return { usdPerUnit: { USD: 1, GBP: 1 / rates.GBP, EUR: 1 / rates.EUR }, date: data.date };
}

// ------------------------------------------------------------------- routes
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

const SECURITY = {
  'content-security-policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://telegram.org https://cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self' wss://ws-feed.exchange.coinbase.com",
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
};

async function api(request, env, path, url) {
  const initData = (request.headers.get('authorization') || '').replace(/^tma /, '');
  const user = await verifyInitData(initData, env.BOT_TOKEN);
  if (!user) return json({ error: 'signed_out', message: 'Open the terminal from Telegram.' }, 401);
  const role = await membership(env, user.id);
  if (!role) return json({ error: 'not_member', message: 'The Quant Terminal is for TCP Inner Circle members.' }, 403);

  if (path === '/api/me') return json({ user: { id: user.id, first_name: user.first_name || '', username: user.username || '' }, role });

  if (path === '/api/markets') {
    const symbol = url.searchParams.get('symbol');
    if (!MARKETS[symbol]) return json({ error: 'unknown_symbol' }, 400);
    if (symbol === 'XAUUSD' && !env.TWELVE_DATA_KEY) {
      return json({ error: 'no_key', message: 'Gold prices need a free Twelve Data key: see terminal/SETUP.md.' }, 503);
    }
    const at = now();
    try {
      const [market, fx] = await Promise.all([
        loadMarket(env, symbol, at),
        cached('fx', TTL.fx, loadFx, at).catch(() => null),
      ]);
      return json({ ...market, fx: fx && fx.usdPerUnit });
    } catch {
      return json({ error: 'unavailable', message: 'Prices are unavailable right now. Try again in a minute.' }, 503);
    }
  }
  return json({ error: 'not_found' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path.startsWith('/api/')) return api(request, env, path, url);
    if (path.startsWith('/fonts/') && FONTS[path.slice(7)]) {
      const bytes = Uint8Array.from(atob(FONTS[path.slice(7)]), (c) => c.charCodeAt(0));
      return new Response(bytes, { headers: { 'content-type': 'font/woff2', 'cache-control': 'public, max-age=31536000, immutable' } });
    }
    if (path === '/' || path === '/index.html') {
      return new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache', ...SECURITY } });
    }
    return new Response('Not found', { status: 404 });
  },
};

// For tests: forget cached answers between cases.
export function resetCaches() {
  members.clear();
  cache.clear();
}
