// The terminal Worker end to end: Telegram sign-in, the members-only gate and the
// market data, with Telegram and the price feeds mocked. Run with: cd terminal && npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import worker, { verifyInitData, membership, resetCaches } from '../src/worker.js';
import bundle from '../dist/worker.js';
import { MARKETS, marketStatus } from '../src/lib.js';

const TOKEN = '123456:TEST-TOKEN';
const ENV = { BOT_TOKEN: TOKEN, INNER_CIRCLE_CHAT_ID: '-1002', ADMIN_CHAT_ID: '-1001', TWELVE_DATA_KEY: 'td-key' };
const NOW = Date.UTC(2026, 8, 23, 15) / 1000; // Wednesday 15:00 UTC
const realNow = Date.now;
const at = (t) => { Date.now = () => t * 1000; };
test.afterEach(() => { Date.now = realNow; resetCaches(); });

// Signs Mini App data the way Telegram does, independently of the Worker's code.
function signed(fields, token = TOKEN) {
  const check = Object.keys(fields).sort().map((k) => `${k}=${fields[k]}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  return new URLSearchParams({ ...fields, hash: createHmac('sha256', secret).update(check).digest('hex') }).toString();
}
const sam = (authDate = NOW) => signed({ auth_date: String(authDate), query_id: 'AAE1', user: JSON.stringify({ id: 555, first_name: 'Sam', username: 'samlee' }) });

// ------------------------------------------------------------ mocked internet
// Telegram answers getChatMember from `status` (chat id -> status, an object, or 'error').
let calls;
function setup({ status = { '-1002': 'member', '-1001': 'left' }, twelve = 'ok', coinbase = 'ok', fx = 'ok' } = {}) {
  calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(String(url));
    calls.push(u);
    const reply = (body, code = 200) => new Response(JSON.stringify(body), { status: code, headers: { 'content-type': 'application/json' } });
    if (u.hostname === 'api.telegram.org') {
      const s = status[JSON.parse(init.body).chat_id];
      if (!s || s === 'error') return reply({ ok: false, description: 'Bad Request: chat not found' });
      return reply({ ok: true, result: typeof s === 'object' ? s : { status: s } });
    }
    if (u.hostname === 'api.twelvedata.com') {
      if (twelve !== 'ok') return reply({ status: 'error', code: 429, message: 'You have run out of API credits' });
      return reply({ status: 'ok', values: goldValues(u.searchParams.get('interval')) });
    }
    if (u.hostname === 'api.exchange.coinbase.com') {
      if (coinbase !== 'ok') return reply({ message: 'down' }, 503);
      return reply(btcRows(Number(u.searchParams.get('granularity')), u.searchParams.get('start'), u.searchParams.get('end')));
    }
    if (u.hostname === 'api.frankfurter.app') {
      return fx === 'ok' ? reply({ base: 'USD', date: '2026-09-23', rates: { GBP: 0.75, EUR: 0.85 } }) : reply({}, 500);
    }
    return reply({}, 404);
  };
}

// Gold on the broker schedule: flat at 2000 with a spike to 2010 on Tuesday 13:00 UTC.
function goldValues(interval) {
  const step = interval === '1h' ? 3600 : 900;
  const out = [];
  let i = 0;
  for (let t = NOW - (interval === '1h' ? 70 : 3) * 86400; t < NOW; t += step) {
    if (!marketStatus(MARKETS.XAUUSD, t).open) continue;
    const spike = t === Date.UTC(2026, 8, 22, 13) / 1000;
    const d = new Date(t * 1000).toISOString().replace('T', ' ').slice(0, 19);
    const close = (i++ % 2 ? 2000.5 : 1999.5).toFixed(2);
    out.push({ datetime: d, open: '2000.00', high: spike ? '2010.00' : '2001.00', low: '1999.00', close });
  }
  return out.reverse();
}
function btcRows(granularity, start, end) {
  const to = end ? Date.parse(end) / 1000 : NOW;
  const from = start ? Date.parse(start) / 1000 : Math.floor(NOW / granularity) * granularity - 299 * granularity;
  const rows = [];
  for (let t = Math.ceil(from / granularity) * granularity; t < to && t <= NOW && rows.length < 300; t += granularity) {
    const spike = t >= Date.UTC(2026, 8, 22) / 1000 && t < Date.UTC(2026, 8, 22, 1) / 1000;
    rows.push([t, 64000, spike ? 66000 : 65000, 64500, t % (2 * granularity) ? 64510 : 64490, 10]);
  }
  return rows.reverse();
}

const get = (path, initData = sam(), env = ENV, w = worker) =>
  w.fetch(new Request(`https://terminal.example${path}`, { headers: initData ? { authorization: `tma ${initData}` } : {} }), env);

// ------------------------------------------------------------------ sign-in
test("Telegram's signature is checked: tampering, another bot's token and old or future sign-ins fail", async () => {
  assert.deepEqual(await verifyInitData(sam(), TOKEN, NOW), { id: 555, first_name: 'Sam', username: 'samlee' });
  const tampered = sam().replace('Sam', 'Eve');
  assert.equal(await verifyInitData(tampered, TOKEN, NOW), null);
  assert.equal(await verifyInitData(signed({ auth_date: String(NOW), user: '{"id":555}' }, '999:OTHER'), TOKEN, NOW), null);
  assert.equal(await verifyInitData(sam(NOW - 25 * 3600), TOKEN, NOW), null, 'older than a day');
  assert.equal(await verifyInitData(sam(NOW + 3600), TOKEN, NOW), null, 'from the future');
  assert.equal(await verifyInitData('user=%7B%22id%22%3A555%7D&auth_date=1', TOKEN, NOW), null, 'no hash');
  assert.equal(await verifyInitData('', TOKEN, NOW), null);
});

test('the API needs a Telegram sign-in', async () => {
  setup();
  at(NOW);
  const res = await get('/api/me', null);
  assert.equal(res.status, 401);
  assert.equal((await res.json()).error, 'signed_out');
  assert.equal(calls.length, 0, 'Telegram is not even asked');
});

test('Inner Circle members get in; the team gets in too; everyone else is turned away politely', async () => {
  at(NOW);
  setup({ status: { '-1002': 'member', '-1001': 'left' } });
  let res = await get('/api/me');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { user: { id: 555, first_name: 'Sam', username: 'samlee' }, role: 'member' });

  resetCaches();
  setup({ status: { '-1002': 'left', '-1001': 'administrator' } });
  assert.equal((await (await get('/api/me')).json()).role, 'team');

  resetCaches();
  setup({ status: { '-1002': { status: 'restricted', is_member: true }, '-1001': 'left' } });
  assert.equal((await (await get('/api/me')).json()).role, 'member');

  for (const status of ['left', 'kicked', 'error']) {
    resetCaches();
    setup({ status: { '-1002': status, '-1001': status } });
    res = await get('/api/me');
    assert.equal(res.status, 403, status);
    assert.match((await res.json()).message, /Inner Circle members/);
  }
});

test('membership answers are reused for 10 minutes, and a "no" for only a minute', async () => {
  setup({ status: { '-1002': 'member' } });
  assert.equal(await membership(ENV, 555, NOW), 'member');
  assert.equal(await membership(ENV, 555, NOW + 500), 'member');
  assert.equal(calls.length, 1);
  await membership(ENV, 555, NOW + 601);
  assert.equal(calls.length, 2);

  resetCaches();
  setup({ status: { '-1002': 'left', '-1001': 'left' } });
  await membership(ENV, 777, NOW);
  await membership(ENV, 777, NOW + 30);
  assert.equal(calls.length, 2, 'both groups asked once');
  await membership(ENV, 777, NOW + 61);
  assert.equal(calls.length, 4, 'asked again after a minute');
});

// ------------------------------------------------------------------ markets
test('gold: levels, volatility, the chart and exchange rates, from Twelve Data', async () => {
  setup();
  at(NOW);
  const res = await get('/api/markets?symbol=XAUUSD');
  assert.equal(res.status, 200);
  const d = await res.json();
  assert.equal(d.symbol, 'XAUUSD');
  assert.ok(Math.abs(d.price - 2000) <= 0.5);
  assert.equal(d.levels.find((l) => l.id === 'pdh').price, 2010);
  assert.equal(d.levels.find((l) => l.id === 'pdl').price, 1999);
  assert.equal(d.bars.length, 192);
  assert.equal(d.engine.profile.length, 24);
  assert.ok(d.engine.profile.every((v) => v > 0));
  assert.equal(d.engine.dayEnd, Date.UTC(2026, 8, 23, 21) / 1000, 'gold closes at 17:00 New York');
  assert.ok(d.engine.state && Number.isFinite(d.engine.state.efficiency));
  // The flat test market gives the model check too few forecasts to score (it returns null);
  // lib.test.js checks the model on a simulated market.
  assert.ok('check' in d.engine, 'the model check rides along');
  assert.equal(d.spark.length, 48);
  assert.equal(d.dayHigh, 2001);
  assert.deepEqual(Object.keys(d.fx), ['USD', 'GBP', 'EUR']);
  assert.ok(Math.abs(d.fx.GBP - 1 / 0.75) < 1e-9);
  assert.equal(d.stale, false);
  const td = calls.filter((u) => u.hostname === 'api.twelvedata.com');
  assert.deepEqual(td.map((u) => u.searchParams.get('interval')).sort(), ['15min', '1h']);
  assert.equal(td.find((u) => u.searchParams.get('interval') === '1h').searchParams.get('outputsize'), '1500');
  assert.ok(td.every((u) => u.searchParams.get('apikey') === 'td-key' && u.searchParams.get('symbol') === 'XAU/USD'));
});

test('bitcoin: UTC days from Coinbase', async () => {
  setup();
  at(NOW);
  const d = await (await get('/api/markets?symbol=BTCUSD')).json();
  assert.ok([64490, 64510].includes(d.price));
  assert.equal(d.levels.find((l) => l.id === 'pdh').price, 66000);
  assert.match(d.source, /Coinbase/);
  const hourly = calls.filter((u) => u.searchParams.get('granularity') === '3600');
  assert.equal(hourly.length, 5, 'two months of hourly history in five windows');
  assert.equal(d.engine.dayEnd, Date.UTC(2026, 8, 24) / 1000, 'Bitcoin days end at midnight UTC');
});

test('prices are cached, so the free data allowance lasts; a failed refresh serves the last prices, marked stale', async () => {
  setup();
  at(NOW);
  await get('/api/markets?symbol=XAUUSD');
  await get('/api/markets?symbol=XAUUSD');
  assert.equal(calls.filter((u) => u.hostname === 'api.twelvedata.com').length, 2, 'one refresh (two requests), then the cache');
  at(NOW + 151);
  await get('/api/markets?symbol=XAUUSD');
  assert.deepEqual(calls.filter((u) => u.hostname === 'api.twelvedata.com').map((u) => u.searchParams.get('interval')).slice(2), ['15min'], 'recent bars refresh, history waits');

  setup({ twelve: 'error' });
  at(NOW + 400);
  const errors = [];
  const original = console.error;
  console.error = (...a) => errors.push(a.join(' '));
  try {
    const d = await (await get('/api/markets?symbol=XAUUSD')).json();
    assert.equal(d.stale, true);
    assert.ok(Math.abs(d.price - 2000) <= 0.5);
  } finally {
    console.error = original;
  }
  assert.ok(errors.some((e) => e.includes('run out of API credits')));
});

test('without a Twelve Data key, gold says how to set it up; with no data at all, a clear message', async () => {
  setup();
  at(NOW);
  let res = await get('/api/markets?symbol=XAUUSD', sam(), { ...ENV, TWELVE_DATA_KEY: '' });
  assert.equal(res.status, 503);
  assert.match((await res.json()).message, /Twelve Data key/);

  resetCaches();
  setup({ coinbase: 'down' });
  const original = console.error;
  console.error = () => {};
  try {
    res = await get('/api/markets?symbol=BTCUSD');
  } finally {
    console.error = original;
  }
  assert.equal(res.status, 503);
  assert.match((await res.json()).message, /unavailable right now/);
  assert.equal((await get('/api/markets?symbol=EURUSD')).status, 400);
});

test('if exchange rates fail, prices still load (the calculator then asks for USD)', async () => {
  setup({ fx: 'down' });
  at(NOW);
  const original = console.error;
  console.error = () => {};
  let d;
  try {
    d = await (await get('/api/markets?symbol=BTCUSD')).json();
  } finally {
    console.error = original;
  }
  assert.ok([64490, 64510].includes(d.price));
  assert.equal(d.fx, null);
});

test('gold data refreshes hourly while gold is closed, every 5 minutes while open', async () => {
  const saturday = Date.UTC(2026, 8, 26, 12) / 1000;
  setup();
  at(saturday);
  assert.equal((await get('/api/markets?symbol=XAUUSD', sam(saturday))).status, 200);
  at(saturday + 1800);
  await get('/api/markets?symbol=XAUUSD', sam(saturday));
  assert.equal(calls.filter((u) => u.hostname === 'api.twelvedata.com').length, 2, 'no refresh within the hour');
});

// ------------------------------------------------------------------ the page
test('the page, fonts and security headers are served; the bundle for the dashboard works the same', async () => {
  for (const w of [worker, bundle]) {
    const res = await get('/', null, ENV, w);
    assert.equal(res.status, 200);
    const csp = res.headers.get('content-security-policy');
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /connect-src 'self' wss:\/\/ws-feed\.exchange\.coinbase\.com/);
    const html = await res.text();
    assert.ok(html.includes('function lotSize('), 'the maths is inlined');
    assert.ok(!html.includes('/*LIB*/'));
    assert.match(html, /integrity="sha384-/);
    const font = await get('/fonts/jetbrains-mono-600.woff2', null, ENV, w);
    assert.equal(font.headers.get('content-type'), 'font/woff2');
    assert.equal((await get('/nope', null, ENV, w)).status, 404);
  }
  setup();
  at(NOW);
  assert.equal((await get('/api/me', sam(), ENV, bundle)).status, 200);
});

test('failed Telegram calls are logged without the token', async () => {
  setup({ status: { '-1002': 'error', '-1001': 'error' } });
  at(NOW);
  const logged = [];
  const original = console.error;
  console.error = (...a) => logged.push(a.join(' '));
  try {
    await get('/api/me');
  } finally {
    console.error = original;
  }
  assert.ok(logged.length > 0);
  assert.ok(logged.every((l) => !l.includes(TOKEN)));
});
