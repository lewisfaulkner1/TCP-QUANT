// The Playbook end to end: logging setups, the chained record, the posts to Telegram, the
// 5-minute check and the buttons. Telegram, D1 and the price feeds are stood in for.
// Run with: cd terminal && npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, createHash } from 'node:crypto';
import worker, { resetCaches, checkPlaybook } from '../src/worker.js';
import bundle from '../dist/worker.js';
import { MARKETS, marketStatus } from '../src/lib.js';
import { fakeD1 } from './d1.js';

const TOKEN = '123456:TEST-TOKEN';
const LEWIS = 777;
const SAM = 555;
const MON = Date.UTC(2026, 8, 28, 13, 30) / 1000; // Monday 13:30 UTC: gold open, London and New York
const realNow = Date.now;
let clockAt = MON;
const at = (t) => { clockAt = t; Date.now = () => t * 1000; };
test.beforeEach(() => at(MON));
test.afterEach(() => { Date.now = realNow; resetCaches(); });

const setting = (over = {}) => ({
  BOT_TOKEN: TOKEN, INNER_CIRCLE_CHAT_ID: '-1002', ADMIN_CHAT_ID: '-1001', TWELVE_DATA_KEY: 'td-key',
  POSTER_IDS: `${LEWIS}, 999`, DB: fakeD1(), ...over,
});

// Signs Mini App data the way Telegram does, at the mocked time.
function signed(user) {
  const fields = { auth_date: String(clockAt), query_id: 'AAE1', user: JSON.stringify(user) };
  const check = Object.keys(fields).sort().map((k) => `${k}=${fields[k]}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(TOKEN).digest();
  return new URLSearchParams({ ...fields, hash: createHmac('sha256', secret).update(check).digest('hex') }).toString();
}
const lewis = () => signed({ id: LEWIS, first_name: 'Lewis' });
const sam = () => signed({ id: SAM, first_name: 'Sam' });

// ------------------------------------------------------------ mocked internet
// Telegram records every call; sendPhoto answers with two sizes of the picture. Gold and
// Bitcoin come from `gold(t)` and `btc(t)`: one-minute bars, [open, high, low, close].
let sent;
let feeds;
let gold;
let btc;
const FLAT_GOLD = () => [3742.5, 3743, 3742, 3742.5];
const FLAT_BTC = () => [64000, 64020, 63980, 64000];
const PICTURE = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 1, 0, 72]);
const clockNow = () => Math.floor(Date.now() / 1000);
const utc = (s) => Date.parse(s.replace(' ', 'T') + 'Z') / 1000;
const stamp = (t) => new Date(t * 1000).toISOString().replace('T', ' ').slice(0, 19);

async function formFields(form) {
  const out = {};
  for (const [key, value] of form.entries()) {
    out[key] = typeof value === 'string' ? value : { name: value.name, type: value.type, bytes: new Uint8Array(await value.arrayBuffer()) };
  }
  return out;
}

function internet({ goldBar = FLAT_GOLD, btcBar = FLAT_BTC, refuse = [] } = {}) {
  sent = [];
  feeds = [];
  gold = goldBar;
  btc = btcBar;
  let nextMessage = 100;
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(String(url));
    const q = (k) => u.searchParams.get(k);
    const reply = (body, code = 200) => new Response(JSON.stringify(body), { status: code, headers: { 'content-type': 'application/json' } });
    if (u.hostname === 'api.telegram.org') {
      if (u.pathname.startsWith('/file/')) return new Response(PICTURE, { headers: { 'content-type': 'application/octet-stream' } });
      const method = u.pathname.split('/').pop();
      const body = init.body instanceof FormData ? await formFields(init.body) : JSON.parse(init.body || '{}');
      sent.push({ method, body, url: u.href });
      if (method === 'getChatMember') return reply({ ok: true, result: { status: 'member' } });
      if (refuse.includes(method)) return reply({ ok: false, description: 'Forbidden: bot was blocked by the user' }, 403);
      if (method === 'getFile') return reply({ ok: true, result: { file_id: body.file_id, file_path: 'photos/file_7.jpg' } });
      const result = { message_id: nextMessage++ };
      if (method === 'sendPhoto') result.photo = [{ file_id: 'small-id', width: 90 }, { file_id: 'large-id', width: 1280 }];
      return reply({ ok: true, result });
    }
    feeds.push(u);
    if (u.hostname === 'api.twelvedata.com') return reply(twelve(q));
    if (u.hostname === 'api.exchange.coinbase.com') {
      const step = Number(q('granularity'));
      const [from, to] = [Date.parse(q('start')) / 1000, Date.parse(q('end')) / 1000];
      const rows = [];
      for (let t = Math.ceil(from / step) * step; t <= Math.min(to, clockNow()); t += step) {
        const [o, h, l, c] = step === 60 ? btc(t) : [64000, 64400, 63600, 64000];
        rows.push([t, l, h, o, c, 5]);
      }
      return reply(rows.slice(-300).reverse());
    }
    if (u.hostname === 'api.frankfurter.app') return reply({ base: 'USD', date: '2026-09-28', rates: { GBP: 0.75, EUR: 0.85 } });
    return reply({}, 404);
  };
}

// Twelve Data, newest first, on gold's hours. Hourly and 15-minute bars sit at 3742.50 with a
// $20 range an hour; one-minute bars come from gold(t), between start_date and end_date if given.
function twelve(q) {
  const step = { '1min': 60, '15min': 900, '1h': 3600 }[q('interval')];
  const from = q('start_date') ? utc(q('start_date')) : null;
  const to = Math.min(q('end_date') ? utc(q('end_date')) : Infinity, clockNow());
  const values = [];
  for (let t = Math.floor(to / step) * step; values.length < Number(q('outputsize') || 30) && (from == null || t >= from); t -= step) {
    if (!marketStatus(MARKETS.XAUUSD, t).open) continue;
    const [o, h, l, c] = step === 60 ? gold(t) : [3742.5, 3752.5, 3732.5, 3742.5];
    values.push({ datetime: stamp(t), open: String(o), high: String(h), low: String(l), close: String(c) });
  }
  if (!values.length) return { code: 400, message: 'No data is available on the specified dates. Try setting different start/end dates.', status: 'error' };
  return { status: 'ok', values };
}

const posts = () => sent.filter((c) => c.method !== 'getChatMember');
const minuteCalls = () => feeds.filter((u) => u.hostname === 'api.twelvedata.com' && u.searchParams.get('interval') === '1min');

// ------------------------------------------------------------------ requests
const GOLD_BUY = {
  symbol: 'XAUUSD', side: 'buy', kind: 'market', entry: 3742.5, sl: 3727.5, tp: 3772.5,
  tags: ['Liquidity sweep', 'H4 zone'], note: 'Swept the Asia low into H4 demand, rejection on the 15-minute chart.',
};

function logSetup(env, setup, { as = lewis, photo = null, w = worker } = {}) {
  const form = new FormData();
  form.append('setup', JSON.stringify(setup));
  if (photo) form.append('photo', new Blob([photo], { type: 'image/jpeg' }), 'chart.jpg');
  return w.fetch(new Request('https://terminal.example/api/playbook', { method: 'POST', headers: { authorization: `tma ${as()}` }, body: form }), env);
}
const get = (env, path = '/api/playbook', as = sam, w = worker) =>
  w.fetch(new Request(`https://terminal.example${path}`, { headers: { authorization: `tma ${as()}` } }), env);
const press = (env, n, body, as = lewis) =>
  worker.fetch(new Request(`https://terminal.example/api/playbook/${n}`, {
    method: 'POST', headers: { authorization: `tma ${as()}`, 'content-type': 'application/json' }, body: JSON.stringify(body),
  }), env);
const exportRecord = (env, as = lewis) =>
  worker.fetch(new Request('https://terminal.example/api/playbook/export', { method: 'POST', headers: { authorization: `tma ${as()}` } }), env);

// The record checked independently of the Worker's code: each entry names the hash before it
// and hashes to its own.
const sha = (s) => createHash('sha256').update(s).digest('hex');
function chain(env) {
  let prev = '0'.repeat(64);
  return env.DB.sqlite.prepare('SELECT * FROM record ORDER BY i').all().map((r) => {
    assert.equal(r.prev, prev, `entry ${r.i} names the entry before it`);
    assert.equal(r.hash, sha(`${r.prev}\n${r.body}`), `entry ${r.i} hashes to its own hash`);
    prev = r.hash;
    return { ...r, body: JSON.parse(r.body) };
  });
}
const row = (env, n) => env.DB.sqlite.prepare('SELECT * FROM setups WHERE n = ?').get(n);

// ------------------------------------------------------------------- logging
test('a poster logs a setup: checked, stored with the engine\'s read, chained, and posted to the team group while testing', async () => {
  internet();
  const env = setting();
  const res = await logSetup(env, GOLD_BUY);
  assert.equal(res.status, 200);
  const { setup } = await res.json();
  assert.equal(setup.n, 1);
  assert.equal(setup.status, 'open');
  assert.equal(setup.fill, 3742.5);
  assert.equal(setup.test, true);
  assert.match(setup.ref, /^[0-9a-f]{8}$/);
  assert.equal(setup.author, 'Lewis');
  assert.equal(setup.engine.noEdge, 0.333);
  assert.deepEqual(setup.engine.sessions, ['london', 'newyork']);
  assert.equal(setup.authorId, undefined, 'no Telegram ids go to the page');

  const [post] = posts();
  assert.equal(post.method, 'sendMessage');
  assert.equal(post.body.chat_id, '-1001', 'a test goes to the team group');
  assert.equal(post.body.parse_mode, 'HTML');
  for (const bit of ['🧪 <b>TEST</b>', '👑 <b>PLAYBOOK #1</b> · XAUUSD <b>BUY</b>', '<pre>Entry   3,742.50\nStop    3,727.50\nTarget  3,772.50  2.0R</pre>',
    '#Liquidity_sweep #H4_zone', 'No-edge odds for this stop and target: <b>33%</b>', `ref ${setup.ref}`]) {
    assert.ok(post.body.text.includes(bit), bit);
  }
  assert.ok(!post.body.text.includes('Record:'), 'a test post carries no record');

  const stored = row(env, 1);
  assert.equal(stored.message, 100);
  assert.equal(stored.chat, '-1001');
  const context = JSON.parse(stored.context);
  assert.equal(context.price, 3742.5);
  assert.equal(context.atr, 20);
  assert.equal(context.weekday, 1);
  assert.equal(context.nyHour, 9);
  assert.equal(context.levels.length, 4);
  const [entry] = chain(env);
  assert.equal(entry.type, 'posted');
  assert.equal(entry.hash.slice(0, 8), setup.ref);
  assert.deepEqual(entry.body.plan, { symbol: 'XAUUSD', side: 'buy', kind: 'market', entry: 3742.5, sl: 3727.5, tp: 3772.5, expires: null, tags: ['Liquidity sweep', 'H4 zone'], note: GOLD_BUY.note });
});

test('only posters log setups, and only sound, honest plans', async () => {
  internet();
  const env = setting();
  let res = await logSetup(env, GOLD_BUY, { as: sam });
  assert.equal(res.status, 403);
  assert.equal((await res.json()).error, 'not_poster');
  res = await logSetup(env, { ...GOLD_BUY, entry: 3760, sl: 3745, tp: 3790 });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).field, 'entry', 'a market order away from the live price');
  res = await logSetup(env, { ...GOLD_BUY, sl: 3750 });
  assert.equal((await res.json()).field, 'sl');
  res = await logSetup(env, { ...GOLD_BUY, kind: 'limit', entry: 3750, sl: 3740, tp: 3770 });
  assert.equal((await res.json()).field, 'entry', 'a buy limit above the price');
  res = await logSetup(env, { ...GOLD_BUY, note: '' });
  assert.equal((await res.json()).field, 'note');
  assert.equal(posts().length, 0);
  assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM setups').get().n, 0);
});

test('live: to the Inner Circle topic, with the chart as the photo, and members can see the chart', async () => {
  internet();
  const env = setting({ PLAYBOOK_MODE: 'live', PLAYBOOK_THREAD_ID: '42' });
  const res = await logSetup(env, GOLD_BUY, { photo: PICTURE });
  assert.equal(res.status, 200);
  const [post] = posts();
  assert.equal(post.method, 'sendPhoto');
  assert.equal(post.body.chat_id, '-1002');
  assert.equal(post.body.message_thread_id, '42');
  assert.ok(post.body.caption.includes('PLAYBOOK #1'));
  assert.ok(post.body.caption.includes('The first result starts the record.'));
  assert.deepEqual(post.body.photo.bytes, PICTURE);
  assert.equal(row(env, 1).photo, 'large-id');
  const pic = await get(env, '/api/playbook/1/photo');
  assert.equal(pic.headers.get('content-type'), 'image/jpeg');
  assert.deepEqual(new Uint8Array(await pic.arrayBuffer()), PICTURE);
  assert.equal(sent.find((c) => c.method === 'getFile').body.file_id, 'large-id');
  const bad = await logSetup(env, GOLD_BUY, { photo: new TextEncoder().encode('<html>not a picture</html>') });
  assert.equal(bad.status, 400);
  assert.equal((await bad.json()).field, 'photo');
});

test('a caption too long for a photo goes as the photo, then the text', async () => {
  internet();
  const env = setting({ PLAYBOOK_MODE: 'live' });
  // Every & becomes &amp; in the post, so this 396-character reason makes a caption over Telegram's 1,024.
  const wordy = { ...GOLD_BUY, note: 'R&R & S&D & '.repeat(33).trim(), tags: ['Liquidity sweep', 'H4 zone', 'Fib pocket', 'Rejection', 'Structure break', 'Reclaim'] };
  assert.equal((await logSetup(env, wordy)).status, 200);
  assert.deepEqual(posts().map((c) => c.method), ['sendMessage'], 'no photo: one message');
  assert.equal((await logSetup(env, wordy, { photo: PICTURE })).status, 200);
  const last = posts().slice(-2);
  assert.deepEqual(last.map((c) => c.method), ['sendPhoto', 'sendMessage']);
  assert.equal(last[0].body.caption, undefined);
  assert.ok(last[1].body.text.length > 1024);
  assert.equal(row(env, 2).message, 102, 'replies go to the text');
  assert.equal(row(env, 2).photo, 'large-id');
});

test('a post that fails still leaves the setup logged, and says so', async () => {
  internet({ refuse: ['sendMessage'] });
  const env = setting();
  const res = await logSetup(env, GOLD_BUY);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.match(body.warning, /^Logged as #1, but the post didn't go out/);
  assert.equal(row(env, 1).message, null);
});

test('without a database the Playbook waits quietly, and says what it needs', async () => {
  internet();
  const env = setting({ DB: undefined });
  assert.deepEqual(await (await get(env)).json(), { ready: false });
  const res = await logSetup(env, GOLD_BUY);
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, 'no_db');
});

// ---------------------------------------------------------------- the check
test('the 5-minute check: a target hit is posted as a reply, and the record counts it', async () => {
  internet({ goldBar: (t) => (t >= MON + 600 ? [3760, 3775, 3759, 3774] : FLAT_GOLD()) });
  const env = setting({ PLAYBOOK_MODE: 'live', PLAYBOOK_THREAD_ID: '42' });
  await logSetup(env, GOLD_BUY);
  at(MON + 20 * 60);
  await checkPlaybook(env, MON + 20 * 60);
  const stored = row(env, 1);
  assert.equal(stored.status, 'won');
  assert.equal(stored.reason, 'tp');
  assert.equal(stored.r, 2);
  assert.equal(stored.closed, MON + 600);
  const result = posts().at(-1);
  assert.equal(result.body.chat_id, '-1002');
  assert.equal(result.body.message_thread_id, 42);
  assert.deepEqual(result.body.reply_parameters, { message_id: 100, allow_sending_without_reply: true });
  assert.equal(result.body.text, '✅ TARGET HIT · <b>#1 +2.0R</b>\nXAUUSD BUY · in 3,742.50 · out 3,772.50 · 10m\nRecord: 1 result · 1 won · 0 lost · average +1.98R after costs');
  assert.deepEqual(chain(env).map((e) => e.type), ['posted', 'tp']);
  const view = await (await get(env)).json();
  assert.equal(view.stats.results, 1);
  assert.equal(view.stats.won, 1);
  assert.equal(view.stats.curve.length, 1);
  assert.equal(view.setups[0].status, 'won');
  assert.equal(view.record.entries, 2);
});

test('gold is checked every 15 minutes at most and not while it is shut; an order that ran out then expires', async () => {
  const FRI = Date.UTC(2026, 9, 2, 20) / 1000; // Friday 16:00 New York
  at(FRI);
  internet();
  const env = setting({ PLAYBOOK_MODE: 'live' });
  const res = await logSetup(env, { ...GOLD_BUY, kind: 'limit', entry: 3730, sl: 3720, tp: 3750, expiry: 4 });
  assert.equal((await res.json()).setup.status, 'pending');
  const check = async (t) => { at(t); await checkPlaybook(env, t); };
  await check(FRI + 300);
  assert.equal(minuteCalls().length, 0, 'too soon');
  await check(FRI + 900);
  assert.equal(minuteCalls().length, 1);
  assert.equal(row(env, 1).checked, FRI + 900);
  await check(FRI + 3900); // 17:05 New York: shut, but the last hour of trading still needs its check
  assert.equal(minuteCalls().length, 2);
  assert.equal(row(env, 1).checked, FRI + 3600, 'up to the close');
  await check(FRI + 5 * 3600); // 21:00 New York, after the order's time ran out
  assert.equal(minuteCalls().length, 2, 'no bars while gold is shut');
  assert.equal(row(env, 1).status, 'expired');
  assert.equal(posts().at(-1).body.text, "⌛ <b>#1 EXPIRED</b>: the price never came, so it doesn't count");
  await check(FRI + 6 * 3600);
  assert.equal(posts().filter((c) => c.body.text && c.body.text.includes('EXPIRED')).length, 1, 'once');
});

test('Bitcoin is checked from the exchanges every 5 minutes: a buy stop fills, then stops out', async () => {
  internet({
    btcBar: (t) => (t >= MON + 300 ? [64100, 64110, 63850, 63860] : t >= MON + 120 ? [64050, 64150, 64040, 64120] : FLAT_BTC()),
  });
  const env = setting({ PLAYBOOK_MODE: 'live' });
  const res = await logSetup(env, { symbol: 'BTCUSD', side: 'buy', kind: 'stop', entry: 64100, sl: 63900, tp: 64500, tags: [], note: 'Breakout above the Asia high.' });
  assert.equal((await res.json()).setup.status, 'pending');
  at(MON + 600);
  await checkPlaybook(env, MON + 600);
  const stored = row(env, 1);
  assert.equal(stored.status, 'lost');
  assert.equal(stored.fill, 64100);
  assert.equal(stored.r, -1);
  const texts = posts().slice(1).map((c) => c.body.text);
  assert.equal(texts[0], '▶️ <b>#1 FILLED</b> at 64,100.00');
  assert.ok(texts[1].startsWith('❌ STOPPED OUT · <b>#1 −1.0R</b>\nBTCUSD BUY STOP · in 64,100.00 · out 63,900.00 · 3m'), texts[1]);
  assert.deepEqual(chain(env).map((e) => e.type), ['posted', 'filled', 'sl']);
});

test('the Cron Trigger runs the check through the Worker\'s own entry point', async () => {
  internet({ goldBar: (t) => (t >= MON + 300 ? [3730, 3731, 3720, 3725] : FLAT_GOLD()) });
  const env = setting();
  await logSetup(env, GOLD_BUY);
  at(MON + 1800);
  const waits = [];
  await worker.scheduled({ cron: '*/5 * * * *' }, env, { waitUntil: (p) => waits.push(p) });
  await Promise.all(waits);
  assert.equal(row(env, 1).status, 'lost');
  assert.equal(typeof bundle.scheduled, 'function', 'the pasted bundle has the handler too');
});

// ---------------------------------------------------------------- the buttons
test('buttons: breakeven, a stop on the wrong side refused, close at the latest price, then nothing more', async () => {
  internet({ goldBar: (t) => (t >= MON + 600 ? [3750, 3752, 3749, 3751] : FLAT_GOLD()) });
  const env = setting({ PLAYBOOK_MODE: 'live' });
  await logSetup(env, GOLD_BUY);
  at(MON + 900);
  let res = await press(env, 1, { action: 'breakeven' });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).setup.stop, 3742.5);
  assert.equal(posts().at(-1).body.text, '🛡 <b>#1 STOP MOVED</b> to 3,742.50 (breakeven)');
  res = await press(env, 1, { action: 'stop', price: 3755 });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).message, "The price is 3,751.00: a buy's stop has to sit below it.");
  res = await press(env, 1, { action: 'cancel' });
  assert.equal(res.status, 400);
  res = await press(env, 1, { action: 'close' });
  const closed = (await res.json()).setup;
  assert.equal(closed.status, 'won');
  assert.equal(closed.exit, 3751);
  assert.equal(closed.r, 0.57);
  assert.ok(posts().at(-1).body.text.startsWith('✋ CLOSED · <b>#1 +0.6R</b>'));
  res = await press(env, 1, { action: 'close' });
  assert.equal(res.status, 409);
  assert.equal((await res.json()).message, '#1 has already closed at +0.6R.');
  assert.equal((await press(env, 1, { action: 'close' }, sam)).status, 403);
  assert.deepEqual(chain(env).map((e) => e.type), ['posted', 'stop', 'manual']);
});

test('a tap that comes after the target posts the target, not the tap', async () => {
  internet({ goldBar: (t) => (t >= MON + 300 ? [3765, 3775, 3764, 3770] : FLAT_GOLD()) });
  const env = setting();
  await logSetup(env, GOLD_BUY);
  at(MON + 600);
  const res = await press(env, 1, { action: 'close' });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.message, '#1 had already closed at +2.0R before your tap.');
  assert.equal(body.setup.reason, 'tp');
  assert.ok(posts().at(-1).body.text.startsWith('🧪 ✅ TARGET HIT'));
});

test('no closing at an old price: while gold is shut, Close waits for the open', async () => {
  const FRI = Date.UTC(2026, 9, 2, 20) / 1000; // Friday 16:00 New York
  at(FRI);
  internet();
  const env = setting();
  await logSetup(env, GOLD_BUY);
  at(FRI + 6 * 3600); // Friday 22:00 New York: the last price is five hours old
  const res = await press(env, 1, { action: 'close' });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).message, 'Gold has no fresh price while it’s closed. Try again when it\'s trading.');
  assert.equal(row(env, 1).status, 'open');
});

test('a tap in the same minute as the setup still has a price to close at', async () => {
  internet({ btcBar: () => [64100, 64150, 64050, 64120] });
  const env = setting();
  at(MON + 12);
  await logSetup(env, { symbol: 'BTCUSD', side: 'buy', kind: 'market', entry: 64000, sl: 63500, tp: 65000, tags: [], note: 'Reclaimed the Asia low.' });
  at(MON + 40);
  const res = await press(env, 1, { action: 'close' });
  assert.equal(res.status, 200);
  const { setup } = await res.json();
  assert.equal(setup.exit, 64120);
  assert.equal(setup.r, 0.24);
});

test('an order that has not filled can be cancelled; a filled one cannot', async () => {
  internet();
  const env = setting();
  await logSetup(env, { ...GOLD_BUY, kind: 'limit', entry: 3730, sl: 3720, tp: 3750 });
  at(MON + 300);
  let res = await press(env, 1, { action: 'close' });
  assert.equal((await res.json()).message, "#1 hasn't filled yet: cancel it instead.");
  res = await press(env, 1, { action: 'cancel' });
  assert.equal((await res.json()).setup.status, 'cancelled');
  assert.equal(posts().at(-1).body.text, '🧪 ✖️ <b>#1 CANCELLED</b> before it filled');
});

// ------------------------------------------------------------------ the record
test('two checks at once post a result once; two setups at once keep the chain in one line', async () => {
  internet({ goldBar: (t) => (t >= MON + 300 ? [3765, 3775, 3764, 3770] : FLAT_GOLD()) });
  const env = setting();
  const [a, b] = await Promise.all([logSetup(env, GOLD_BUY), logSetup(env, GOLD_BUY)]);
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  at(MON + 1800);
  await Promise.all([checkPlaybook(env, MON + 1800), checkPlaybook(env, MON + 1800)]);
  const hits = posts().filter((c) => c.body.text && c.body.text.includes('TARGET HIT'));
  assert.equal(hits.length, 2, 'one for each setup, not four');
  assert.deepEqual(chain(env).map((e) => e.type).sort(), ['posted', 'posted', 'tp', 'tp']);
});

test('members see live setups and the record; test runs reach only the posters', async () => {
  internet();
  const env = setting();
  await logSetup(env, GOLD_BUY, { photo: PICTURE });
  env.PLAYBOOK_MODE = 'live';
  await logSetup(env, { ...GOLD_BUY, side: 'sell', sl: 3757.5, tp: 3712.5 });
  const member = await (await get(env)).json();
  assert.deepEqual(member.setups.map((s) => s.n), [2]);
  assert.equal(member.canPost, false);
  assert.equal(member.mode, 'live');
  assert.equal(member.stats.setups, 1);
  const poster = await (await get(env, '/api/playbook', lewis)).json();
  assert.deepEqual(poster.setups.map((s) => [s.n, s.test]), [[2, false], [1, true]]);
  assert.equal(poster.canPost, true);
  assert.ok(poster.tags.includes('Liquidity sweep'));
  assert.equal((await get(env, '/api/playbook/1/photo')).status, 404, "a test run's chart");
  assert.equal((await get(env, '/api/playbook/1/photo', lewis)).status, 200);
});

test('the export: every setup and entry as JSON lines, sent to the poster, with the chain checked', async () => {
  internet({ goldBar: (t) => (t >= MON + 300 ? [3765, 3775, 3764, 3770] : FLAT_GOLD()) });
  const env = setting({ PLAYBOOK_MODE: 'live' });
  await logSetup(env, GOLD_BUY);
  at(MON + 1800);
  await checkPlaybook(env, MON + 1800);
  assert.equal((await exportRecord(env, sam)).status, 403);
  let res = await exportRecord(env);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, setups: 1, entries: 2, intact: true, head: chain(env)[1].hash });
  const doc = posts().at(-1);
  assert.equal(doc.method, 'sendDocument');
  assert.equal(doc.body.chat_id, String(LEWIS));
  assert.match(doc.body.document.name, /^tcp-playbook-2026-09-28\.jsonl$/);
  const lines = new TextDecoder().decode(doc.body.document.bytes).trim().split('\n').map((l) => JSON.parse(l));
  assert.deepEqual(lines.map((l) => l.type), ['about', 'setup', 'entry', 'entry']);
  assert.equal(lines[0].intact, true);
  assert.equal(lines[1].status, 'won');
  assert.equal(lines[1].context.price, 3742.5);
  for (const hidden of ['authorId', 'chat', 'message', 'thread']) assert.ok(!(hidden in lines[1]), hidden);
  // an edit made straight in the database shows
  env.DB.sqlite.prepare("UPDATE record SET body = replace(body, '3772.5', '3790') WHERE i = 1").run();
  res = await exportRecord(env);
  assert.deepEqual(await res.json(), { ok: true, setups: 1, entries: 2, intact: false, brokenAt: 1 });
});

test('if the bot cannot message the poster, the export says how to fix it', async () => {
  internet({ refuse: ['sendDocument'] });
  const env = setting();
  await logSetup(env, GOLD_BUY);
  const res = await exportRecord(env);
  assert.equal(res.status, 409);
  assert.match((await res.json()).message, /press Start/);
});

test('the bundle for the dashboard serves the Playbook the same way', async () => {
  internet();
  const env = setting();
  assert.equal((await logSetup(env, GOLD_BUY, { w: bundle })).status, 200);
  const view = await (await get(env, '/api/playbook', lewis, bundle)).json();
  assert.equal(view.setups.length, 1);
  assert.ok(!JSON.stringify(sent.map((c) => c.body)).includes(TOKEN), 'the token is never in a message');
});
