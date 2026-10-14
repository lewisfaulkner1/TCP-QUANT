// MT5 connections and the leaderboard end to end: a member seals their investor password on the
// phone, the Worker keeps only the ciphertext, the TCP bridge collects the links and sends daily
// percentages back, and the tables rank them. Telegram and D1 are stood in for; the encryption is
// real (RSA-OAEP with SHA-256, as on the phone and in bridge/). Run with: cd terminal && npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import worker, { resetCaches } from '../src/worker.js';
import bundle from '../dist/worker.js';
import { RANKS, leaderboard, rankTable, viewTable, periodStats, inPeriod, cleanDay, personalStats } from '../src/ranks-lib.js';
import { fakeD1 } from './d1.js';

const TOKEN = '123456:TEST-TOKEN';
const BRIDGE = 'bridge-token-for-tests';
const LEWIS = 777;
const SAM = 555;
const ALEX = 556;
const JO = 557;
const KIM = 558;
const iso = (s) => Date.parse(s) / 1000;
const MONDAY = iso('2026-09-28T12:00:00Z');
const WEDNESDAY = iso('2026-09-30T12:00:00Z');
const realNow = Date.now;
let clockAt = MONDAY;
const at = (t) => { clockAt = t; Date.now = () => t * 1000; };
test.beforeEach(() => at(MONDAY));
test.afterEach(() => { Date.now = realNow; resetCaches(); });

// ------------------------------------------------------------------ the keys
const rsa = (bits) => crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: bits, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt']);
const PAIR = await rsa(3072);
const SPKI = Buffer.from(await crypto.subtle.exportKey('spki', PAIR.publicKey)).toString('base64');
const KEY_ID = Buffer.from(await crypto.subtle.digest('SHA-256', Buffer.from(SPKI, 'base64'))).toString('hex').slice(0, 16);

// What the page does: the account and password, sealed to the bridge's key.
async function seal(payload, spki = SPKI) {
  const key = await crypto.subtle.importKey('spki', Buffer.from(spki, 'base64'), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
  return Buffer.from(await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, new TextEncoder().encode(JSON.stringify(payload)))).toString('base64');
}
// What the bridge does with it.
async function unseal(secret) {
  return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, PAIR.privateKey, Buffer.from(secret, 'base64'))));
}

const setting = (over = {}) => ({
  BOT_TOKEN: TOKEN, INNER_CIRCLE_CHAT_ID: '-1002', ADMIN_CHAT_ID: '-1001', POSTER_IDS: `${LEWIS}`,
  BRIDGE_PUBLIC_KEY: SPKI, BRIDGE_TOKEN: BRIDGE, DB: fakeD1(), ...over,
});

function signed(id, name) {
  const fields = { auth_date: String(clockAt), query_id: 'AAE1', user: JSON.stringify({ id, first_name: name }) };
  const check = Object.keys(fields).sort().map((k) => `${k}=${fields[k]}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(TOKEN).digest();
  return new URLSearchParams({ ...fields, hash: createHmac('sha256', secret).update(check).digest('hex') }).toString();
}
const sam = () => signed(SAM, 'Sam');
const alex = () => signed(ALEX, 'Alex');
const jo = () => signed(JO, 'Jo');
const kim = () => signed(KIM, 'Kim');
const lewis = () => signed(LEWIS, 'Lewis');

// ------------------------------------------------------------ mocked internet
let sent;
function internet() {
  sent = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(String(url));
    const reply = (body, code = 200) => new Response(JSON.stringify(body), { status: code, headers: { 'content-type': 'application/json' } });
    if (u.hostname === 'api.telegram.org') {
      const method = u.pathname.split('/').pop();
      const body = JSON.parse(init.body || '{}');
      if (method === 'getChatMember') return reply({ ok: true, result: { status: 'member' } });
      sent.push({ method, body });
      return reply({ ok: true, result: { message_id: 1 } });
    }
    return reply({}, 404);
  };
}
const told = (id) => sent.filter((m) => m.method === 'sendMessage' && m.body.chat_id === id).map((m) => m.body.text);

// ------------------------------------------------------------------ requests
const get = (env, path, as = sam, w = worker) =>
  w.fetch(new Request(`https://terminal.example${path}`, { headers: { authorization: `tma ${as()}` } }), env, {});
const send = (env, path, body, as = sam, w = worker) =>
  w.fetch(new Request(`https://terminal.example${path}`, {
    method: 'POST', headers: { authorization: `tma ${as()}`, 'content-type': 'application/json' }, body: JSON.stringify(body),
  }), env, {});
const bridge = (env, path, body, { token = BRIDGE, w = worker } = {}) =>
  w.fetch(new Request(`https://terminal.example${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(token == null ? {} : { authorization: `Bearer ${token}` }), 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }), env, {});

const ACCOUNT = { login: '12345678', server: 'PUPrime-Live 3', password: 'inv-Pass#1' };
async function connect(env, as = sam, { login = ACCOUNT.login, server = ACCOUNT.server, password = ACCOUNT.password, nick = 'Gold Hunter', ...over } = {}, w = worker) {
  const secret = await seal({ v: 1, login, server, password });
  return send(env, '/api/mt5', { login, server, secret, keyId: KEY_ID, nick, public: true, consent: true, ...over }, as, w);
}
const linkId = async (env, member) => (await env.DB.prepare('SELECT id FROM mt5_links WHERE member = ?').bind(member).first()).id;
const day = (d, ret, trades = 2, won = 1, lost = 1, gw = 0.02, gl = 0.01) => ({ day: d, ret, trades, won, lost, gw, gl });
const everything = (db) => db.sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all()
  .map(({ name }) => JSON.stringify(db.sqlite.prepare(`SELECT * FROM ${name}`).all())).join('\n');

async function quietly(fn) {
  const original = console.error;
  const logged = [];
  console.error = (...a) => logged.push(a.join(' '));
  try { return { result: await fn(), logged }; } finally { console.error = original; }
}

// -------------------------------------------------------------------- tests
test('connecting waits for the bridge key; without the database it says so', async () => {
  internet();
  const closed = setting({ BRIDGE_PUBLIC_KEY: undefined });
  assert.deepEqual(await (await get(closed, '/api/mt5')).json(), { ready: true, open: false, key: null, keyId: null, tries: RANKS.tries, link: null });
  const refused = await connect(closed);
  assert.equal(refused.status, 503);
  assert.equal((await refused.json()).error, 'closed');
  const { result, logged } = await quietly(async () => (await get(setting({ BRIDGE_PUBLIC_KEY: 'bm90IGEga2V5' }), '/api/mt5')).json());
  assert.equal(result.open, false, 'a key that can\'t be used keeps connecting closed');
  assert.match(logged.join(), /BRIDGE_PUBLIC_KEY can't be used/);
  const pem = `-----BEGIN PUBLIC KEY-----\n${SPKI.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----\n`;
  assert.equal((await (await get(setting({ BRIDGE_PUBLIC_KEY: pem }), '/api/mt5')).json()).keyId, KEY_ID, 'PEM works too');
  const bare = setting({ DB: undefined });
  assert.deepEqual(await (await get(bare, '/api/mt5')).json(), { ready: false });
  assert.deepEqual(await (await get(bare, '/api/ranks')).json(), { ready: false });
  assert.equal((await connect(bare)).status, 503);
});

test('a member connects: the password is sealed on the phone and only the bridge can open it', async () => {
  internet();
  const env = setting();
  const view = await (await get(env, '/api/mt5')).json();
  assert.deepEqual(view, { ready: true, open: true, key: SPKI, keyId: KEY_ID, tries: RANKS.tries, link: null });
  const res = await connect(env);
  assert.equal(res.status, 200);
  const { link } = await res.json();
  assert.deepEqual(link, {
    nick: 'Gold Hunter', broker: 'puprime', brokerName: 'PU Prime', server: 'PUPrime-Live 3', login: '••••5678',
    public: true, hidden: false, status: 'pending', open: null, since: '2026-09-28', synced: null, error: null,
  });
  // The database holds ciphertext only, and the bridge's key opens it.
  const stored = everything(env.DB);
  assert.ok(!stored.includes(ACCOUNT.password), 'the password is never stored');
  const row = await env.DB.prepare('SELECT secret, key_id FROM mt5_links WHERE member = ?').bind(SAM).first();
  assert.equal(Buffer.from(row.secret, 'base64').length, 384);
  assert.equal(row.key_id, KEY_ID);
  assert.deepEqual(await unseal(row.secret), { v: 1, ...ACCOUNT });
  // The member sees their link; nobody else does.
  const mine = await (await get(env, '/api/mt5')).json();
  assert.deepEqual(mine.link, link);
  assert.deepEqual(mine.stats, personalStats([]));
  assert.equal(mine.periods.week.key, '2026-09-28');
  assert.equal((await (await get(env, '/api/mt5', alex)).json()).link, null);
  // The bridge sees what it needs to log in.
  const links = await (await bridge(env, '/bridge/links')).json();
  assert.equal(links.keyId, KEY_ID);
  assert.deepEqual(links.links.map(({ secret, ...l }) => l), [{
    id: await linkId(env, SAM), broker: 'puprime', server: 'PUPrime-Live 3', login: '12345678', keyId: KEY_ID, since: '2026-09-28', status: 'pending', last: null,
  }]);
  assert.equal(links.links[0].secret, row.secret);
});

test('what members send is checked before anything is kept', async () => {
  internet();
  const env = setting();
  const bad = async (res, field, status = 400) => {
    assert.equal(res.status, status);
    assert.equal((await res.json()).field, field);
  };
  await bad(await connect(env, sam, { consent: false }), 'consent');
  await bad(await connect(env, sam, { login: 'abc' }), 'login');
  await bad(await connect(env, sam, { server: 'PUPrime-Demo' }), 'server');
  await bad(await connect(env, sam, { server: 'ICMarketsSC-Live01' }), 'server');
  await bad(await connect(env, sam, { nick: 'TCP Official' }), 'nick');
  await bad(await connect(env, sam, { nick: 'x' }), 'nick');
  await bad(await connect(env, sam, { keyId: 'old-key' }), 'password', 409);
  await bad(await connect(env, sam, { secret: ACCOUNT.password }), 'password');
  await bad(await connect(env, sam, { secret: 'not base64!' }), 'password');
  const small = await rsa(2048);
  const smallSpki = Buffer.from(await crypto.subtle.exportKey('spki', small.publicKey)).toString('base64');
  await bad(await connect(env, sam, { secret: await seal({ v: 1, ...ACCOUNT }, smallSpki) }), 'password');
  assert.equal((await send(env, '/api/mt5', 'nonsense')).status, 400);
  assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM mt5_links').get().n, 0);
  assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM mt5_tries').get().n, 0, 'a refused connection isn\'t a try');
});

test('an account or name already taken is refused; a failed link gives its account up', async () => {
  internet();
  const env = setting();
  assert.equal((await connect(env, sam)).status, 200);
  const taken = await connect(env, alex, { nick: 'Alex' });
  assert.equal(taken.status, 409);
  assert.match((await taken.json()).message, /already connected by another member/);
  const vantage = { login: '87654321', server: 'VantageInternational-Live 5' };
  const name = await connect(env, alex, { ...vantage, nick: 'gold  HUNTER' });
  assert.equal(name.status, 409);
  assert.equal((await name.json()).field, 'nick');
  assert.equal((await connect(env, alex, { ...vantage, nick: 'Alex' })).status, 200);
  // Sam's password turns out to be wrong: the account is free for whoever really has it.
  await bridge(env, '/bridge/report', { id: await linkId(env, SAM), ok: false, error: 'login' });
  assert.equal((await connect(env, jo, { nick: 'Jo' })).status, 200);
  assert.equal((await (await get(env, '/api/mt5')).json()).link, null);
});

test('five connections a day at most: each is a login at the broker', async () => {
  internet();
  const env = setting();
  for (let i = 0; i < RANKS.tries; i++) assert.equal((await connect(env, sam, { login: `1000000${i}` })).status, 200);
  const sixth = await connect(env, sam, { login: '10000009' });
  assert.equal(sixth.status, 429);
  assert.match((await sixth.json()).message, /try again tomorrow/);
  at(MONDAY + 86400);
  assert.equal((await connect(env, sam, { login: '10000009' })).status, 200);
});

test('the bridge needs its own token; members can\'t reach its routes', async () => {
  internet();
  const env = setting();
  await connect(env);
  for (const token of [null, '', 'wrong', `${BRIDGE}x`]) assert.equal((await bridge(env, '/bridge/links', undefined, { token })).status, 401, String(token));
  assert.equal((await bridge(setting({ BRIDGE_TOKEN: undefined }), '/bridge/links', undefined, { token: '' })).status, 401);
  const asMember = await worker.fetch(new Request('https://terminal.example/bridge/links', { headers: { authorization: `tma ${sam()}` } }), env, {});
  assert.equal(asMember.status, 401);
  assert.equal((await bridge(env, '/bridge/links')).status, 200);
  assert.equal((await bridge(env, '/bridge/other')).status, 404);
  assert.equal((await bridge(env, '/bridge/report', { ok: true })).status, 400);
  assert.equal((await bridge(env, '/bridge/report', { id: 'nope', ok: true, days: [] })).status, 404);
  assert.equal((await bridge(setting({ DB: undefined }), '/bridge/links')).status, 503);
});

test('the bridge reports days: they\'re checked, the member is told once, and the tables show them', async () => {
  internet();
  const env = setting();
  await connect(env);
  const id = await linkId(env, SAM);
  at(WEDNESDAY);
  const days = [
    day('2026-09-25', 0.5), // before connecting: not counted
    day('2026-09-28', 0.02, 3, 2, 1, 0.03, 0.01),
    day('2026-09-29', -0.005, 1, 0, 1, 0, 0.005),
    { ...day('2026-09-29', 0.01), won: 3 }, // doesn't add up
    day('2026-10-05', 0.01), // in the future
  ];
  const res = await (await bridge(env, '/bridge/report', { id, ok: true, days, open: -0.034 })).json();
  assert.deepEqual(res, { ok: true, saved: 2, skipped: 3 });
  assert.equal(told(SAM).length, 1);
  assert.match(told(SAM)[0], /^✅ TCP can see your MT5 account now, read-only\. .*on the leaderboard as Gold Hunter\. Only percentages are shared, never your balance/);
  await bridge(env, '/bridge/report', { id, ok: true, days: days.slice(1, 3), open: -0.034 });
  assert.equal(told(SAM).length, 1, 'told once');
  assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM mt5_days').get().n, 2, 'a day sent again replaces itself');
  const columns = env.DB.sqlite.prepare('PRAGMA table_info(mt5_days)').all().map((c) => c.name);
  assert.deepEqual(columns, ['link', 'day', 'ret', 'lr', 'trades', 'won', 'lost', 'gw', 'gl', 'updated'], 'percentages and counts only: no balance');

  const mine = await (await get(env, '/api/mt5')).json();
  assert.equal(mine.link.status, 'active');
  assert.equal(mine.link.synced, WEDNESDAY);
  assert.equal(mine.link.open, -0.034);
  assert.deepEqual(mine.stats, personalStats([days[1], days[2]]));
  assert.equal(mine.periods.day.key, '2026-09-29');
  assert.equal(mine.periods.day.ret, -0.005);
  assert.ok(Math.abs(mine.periods.week.ret - (1.02 * 0.995 - 1)) < 1e-6);

  const ranks = await (await get(env, '/api/ranks', alex)).json();
  assert.equal(ranks.ready, true);
  assert.equal(ranks.canHide, false);
  assert.equal(ranks.hidden, undefined, 'members don\'t see who\'s been hidden');
  assert.deepEqual(ranks.periods, { day: '2026-09-29', week: '2026-09-28', lastWeek: '2026-09-21', month: '2026-09', lastMonth: '2026-08' });
  assert.equal(ranks.connected, 1);
  assert.equal(ranks.synced, WEDNESDAY);
  const dayTable = ranks.tables.day;
  assert.deepEqual([dayTable.from, dayTable.to, dayTable.traders, dayTable.green, dayTable.red, dayTable.mine, dayTable.steady], ['2026-09-29', '2026-09-29', 1, 0, 1, null, null]);
  assert.deepEqual(dayTable.rows, [{ nick: 'Gold Hunter', open: -0.034, ret: -0.005, trades: 1, won: 0, lost: 1, days: 1, best: -0.005, worst: -0.005, score: null, rank: 1, me: false }]);
  assert.equal(ranks.tables.week.rows[0].trades, 4);
  assert.deepEqual(ranks.tables.lastWeek.rows, [], 'the day before connecting doesn\'t count');
  const own = await (await get(env, '/api/ranks')).json();
  assert.deepEqual([own.tables.week.mine, own.tables.week.rows[0].me], [1, true]);
});

test('a failure the member must fix: the sealed password is wiped, the bridge stops, the member is told once', async () => {
  internet();
  const env = setting();
  await connect(env);
  const id = await linkId(env, SAM);
  // A run that couldn't reach MT5 just waits for the next one.
  for (const error of ['unreachable', 'something new']) {
    assert.deepEqual(await (await bridge(env, '/bridge/report', { id, ok: false, error })).json(), { ok: true, status: 'pending' });
  }
  assert.deepEqual(told(SAM), []);
  const waiting = (await (await get(env, '/api/mt5')).json()).link;
  assert.equal(waiting.status, 'pending');
  assert.match(waiting.error, /tries again on the next one/);
  // A master password: never used, and wiped.
  assert.deepEqual(await (await bridge(env, '/bridge/report', { id, ok: false, error: 'master' })).json(), { ok: true, status: 'failed' });
  assert.equal((await env.DB.prepare('SELECT secret FROM mt5_links WHERE id = ?').bind(id).first()).secret, '');
  assert.equal(told(SAM).length, 1);
  assert.match(told(SAM)[0], /^⚠️ That was your master \(trading\) password/);
  assert.deepEqual((await (await bridge(env, '/bridge/links')).json()).links, [], 'the bridge stops trying');
  assert.equal((await bridge(env, '/bridge/report', { id, ok: false, error: 'master' })).status, 409);
  assert.equal((await bridge(env, '/bridge/report', { id, ok: true, days: [day('2026-09-28', 0.01)] })).status, 409);
  assert.equal(told(SAM).length, 1, 'told once');
  const failed = (await (await get(env, '/api/mt5')).json()).link;
  assert.equal(failed.status, 'failed');
  assert.match(failed.error, /investor \(read-only\) password/);
});

test('every failure has its own message', async () => {
  internet();
  const env = setting();
  const expected = { login: /looks wrong/, demo: /demo account/, broker: /isn't at PU Prime or Vantage/, mismatch: /didn't match/, key: /renewed its security key/ };
  let n = 0;
  for (const [error, text] of Object.entries(expected)) {
    at(MONDAY + 86400 * n++);
    await connect(env, sam, { login: `2000000${n}` });
    await bridge(env, '/bridge/report', { id: await linkId(env, SAM), ok: false, error });
    assert.match(told(SAM).at(-1), text, error);
    assert.match((await (await get(env, '/api/mt5')).json()).link.error, text);
  }
});

test('reconnecting the same account keeps its record; another account starts again', async () => {
  internet();
  const env = setting();
  await connect(env);
  const id = await linkId(env, SAM);
  at(WEDNESDAY);
  await bridge(env, '/bridge/report', { id, ok: true, days: [day('2026-09-28', 0.02), day('2026-09-29', 0.01)] });
  // A new investor password and a new name for the same account.
  const again = await (await connect(env, sam, { password: 'new-Pass#2', nick: 'Aurum' })).json();
  assert.deepEqual([again.link.status, again.link.since, again.link.nick], ['pending', '2026-09-28', 'Aurum']);
  assert.equal(await linkId(env, SAM), id);
  assert.equal((await unseal((await env.DB.prepare('SELECT secret FROM mt5_links WHERE id = ?').bind(id).first()).secret)).password, 'new-Pass#2');
  assert.equal((await (await get(env, '/api/mt5')).json()).stats.days, 2, 'the record stays');
  await bridge(env, '/bridge/report', { id, ok: true, days: [] });
  assert.equal(told(SAM).length, 2, 'told again that it works');
  // A different account starts from today.
  const other = await (await connect(env, sam, { login: '99999999', nick: 'Aurum' })).json();
  assert.equal(other.link.since, '2026-09-30');
  assert.notEqual(await linkId(env, SAM), id);
  assert.equal((await (await get(env, '/api/mt5')).json()).stats.days, 0);
  assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM mt5_days').get().n, 0);
  assert.equal((await bridge(env, '/bridge/report', { id, ok: true, days: [] })).status, 404, 'the old link is gone');
});

test('private, hidden and failed traders are left off the tables; a poster\'s hide survives reconnecting', async () => {
  internet();
  const env = setting();
  const accounts = [[sam, 'Gold Hunter', '11111111'], [alex, 'Quiet One', '22222222'], [jo, 'Loud Name', '33333333'], [kim, 'Kim FX', '44444444']];
  for (const [as, nick, login] of accounts) assert.equal((await connect(env, as, { nick, login, public: nick !== 'Quiet One' })).status, 200);
  at(WEDNESDAY);
  for (const member of [SAM, ALEX, JO, KIM]) await bridge(env, '/bridge/report', { id: await linkId(env, member), ok: true, days: [day('2026-09-29', member / 100000)] });
  const names = async (as = sam) => (await (await get(env, '/api/ranks', as)).json()).tables.day.rows.map((r) => r.nick);
  assert.deepEqual(await names(), ['Kim FX', 'Loud Name', 'Gold Hunter']);
  // Kim's password stops working: off the tables until they reconnect.
  await bridge(env, '/bridge/report', { id: await linkId(env, KIM), ok: false, error: 'login' });
  assert.deepEqual(await names(), ['Loud Name', 'Gold Hunter']);
  // Only posters can hide a name.
  assert.equal((await send(env, '/api/ranks/hide', { nick: 'Loud Name' }, sam)).status, 403);
  assert.equal((await send(env, '/api/ranks/hide', { nick: 'Nobody' }, lewis)).status, 404);
  assert.deepEqual(await (await send(env, '/api/ranks/hide', { nick: ' loud  name ' }, lewis)).json(), { ok: true, hidden: true });
  assert.deepEqual(await names(), ['Gold Hunter']);
  const asLewis = await (await get(env, '/api/ranks', lewis)).json();
  assert.deepEqual([asLewis.canHide, asLewis.hidden], [true, ['Loud Name']]);
  const refused = await send(env, '/api/mt5/settings', { public: true }, jo);
  assert.equal(refused.status, 403);
  assert.match((await refused.json()).message, /taken you off the leaderboard/);
  // Disconnecting and connecting again doesn't undo it.
  await send(env, '/api/mt5/disconnect', {}, jo);
  await connect(env, jo, { nick: 'Loud Name', login: '33333333' });
  assert.equal((await (await get(env, '/api/mt5', jo)).json()).link.hidden, true);
  await bridge(env, '/bridge/report', { id: await linkId(env, JO), ok: true, days: [day('2026-09-30', 0.01)] });
  assert.equal(told(JO).at(-1).includes('leaderboard'), false, 'a hidden member isn\'t told they\'re on it');
  const week = async () => (await (await get(env, '/api/ranks')).json()).tables.week.rows.map((r) => r.nick);
  assert.equal((await env.DB.prepare('SELECT public FROM mt5_links WHERE member = ?').bind(JO).first()).public, 1, 'connected with the switch on');
  assert.equal((await week()).includes('Loud Name'), false, 'still off the table');
  // Put back, they choose to show again.
  assert.deepEqual(await (await send(env, '/api/ranks/hide', { nick: 'Loud Name', hidden: false }, lewis)).json(), { ok: true, hidden: false });
  assert.equal((await send(env, '/api/mt5/settings', { public: true }, jo)).status, 200);
  assert.equal((await (await get(env, '/api/ranks')).json()).tables.week.rows.some((r) => r.nick === 'Loud Name'), true);
});

test('settings: a new name, or off the leaderboard and back', async () => {
  internet();
  const env = setting();
  assert.equal((await send(env, '/api/mt5/settings', { nick: 'Solo' })).status, 404);
  await connect(env);
  await connect(env, alex, { login: '22222222', nick: 'Alex' });
  const taken = await send(env, '/api/mt5/settings', { nick: 'ALEX' });
  assert.equal(taken.status, 409);
  assert.equal((await send(env, '/api/mt5/settings', { nick: 'Admin' })).status, 400);
  assert.deepEqual((await (await send(env, '/api/mt5/settings', { nick: 'Aurum', public: false })).json()).link.nick, 'Aurum');
  at(WEDNESDAY);
  await bridge(env, '/bridge/report', { id: await linkId(env, SAM), ok: true, days: [day('2026-09-29', 0.01)] });
  assert.deepEqual((await (await get(env, '/api/ranks')).json()).tables.day.rows, []);
  await send(env, '/api/mt5/settings', { public: true });
  assert.deepEqual((await (await get(env, '/api/ranks')).json()).tables.day.rows.map((r) => r.nick), ['Aurum'], 'shows at once, not after the cache');
});

test('disconnecting deletes the link and every day recorded for it', async () => {
  internet();
  const env = setting();
  await connect(env);
  at(WEDNESDAY);
  await bridge(env, '/bridge/report', { id: await linkId(env, SAM), ok: true, days: [day('2026-09-29', 0.01)] });
  assert.deepEqual(await (await send(env, '/api/mt5/disconnect', {})).json(), { ok: true });
  assert.equal((await (await get(env, '/api/mt5')).json()).link, null);
  for (const table of ['mt5_links', 'mt5_days']) assert.equal(env.DB.sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, 0, table);
  assert.deepEqual((await (await bridge(env, '/bridge/links')).json()).links, []);
  assert.deepEqual((await (await get(env, '/api/ranks')).json()).tables.day.rows, []);
});

test('the database adds the tables up exactly as the maths does', async () => {
  internet();
  const env = setting();
  let seed = 7;
  const random = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const traders = [];
  at(iso('2026-08-17T12:00:00Z'));
  for (let i = 0; i < 14; i++) {
    const member = 1000 + i;
    const as = () => signed(member, `M${i}`);
    assert.equal((await connect(env, as, { login: String(30000000 + i), nick: `Trader ${i}` })).status, 200);
    const days = [];
    for (let t = iso('2026-08-17T12:00:00Z'); t <= iso('2026-10-02T12:00:00Z'); t += 86400) {
      const d = new Date(t * 1000).toISOString().slice(0, 10);
      if (random() < 0.35) continue;
      const trades = Math.floor(random() * 5);
      const won = Math.floor(random() * (trades + 1));
      days.push(day(d, Math.round((random() - 0.47) * 0.06 * 1e6) / 1e6, trades, won, trades - won, random() * 0.03, random() * 0.03));
    }
    traders.push({ id: member, nick: `Trader ${i}`, as, days: days.map(cleanDay), open: Math.round((random() - 0.6) * 0.1 * 1e4) / 1e4 });
  }
  at(iso('2026-10-02T12:00:00Z'));
  for (const t of traders) {
    const res = await (await bridge(env, '/bridge/report', { id: await linkId(env, t.id), ok: true, days: t.days, open: t.open })).json();
    assert.equal(res.saved, t.days.length);
  }
  const me = traders[5];
  const ranks = await (await get(env, '/api/ranks', me.as)).json();
  for (const [k, key] of Object.entries(ranks.periods)) {
    const { period, key: _, ...expected } = leaderboard(traders, k, key, me.id);
    const table = ranks.tables[k];
    assert.deepEqual({ traders: table.traders, green: table.green, red: table.red, rows: table.rows, mine: table.mine }, expected, k);
    if (k === 'day') continue;
    const rows = traders.map((t) => ({ id: t.id, nick: t.nick, open: t.open, ...periodStats(inPeriod(t.days, k, key)) }));
    const { traders: n, green, red, ...steady } = viewTable(rankTable(rows, 'score'), me.id);
    assert.deepEqual(table.steady, { traders: n, green, red, ...steady }, `${k} by consistency`);
  }
  assert.ok(ranks.tables.lastMonth.steady.rows.length > 5, 'a full month gives most traders a score');
  assert.deepEqual(ranks.tables.month.steady.rows, [], 'two days into October, nobody has three traded days yet');
});

test('two members connecting one account at the same moment: one gets it', async () => {
  internet();
  const env = setting();
  const slow = (db) => {
    const late = (fn) => async (...a) => { await new Promise((r) => setTimeout(r, 5)); return fn(...a); };
    return { ...db, prepare: (sql) => {
      const wrap = (st) => ({ ...st, bind: (...v) => wrap(st.bind(...v)), first: late(st.first), all: late(st.all), run: late(st.run) });
      return wrap(db.prepare(sql));
    } };
  };
  env.DB = slow(env.DB);
  const [a, b] = await Promise.all([connect(env, sam, { nick: 'First' }), connect(env, alex, { nick: 'Second' })]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
  assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM mt5_links').get().n, 1);
});

test('the bundle for the dashboard serves the leaderboard the same way', async () => {
  internet();
  const env = setting();
  assert.equal((await connect(env, sam, {}, bundle)).status, 200);
  at(WEDNESDAY);
  const links = await (await bridge(env, '/bridge/links', undefined, { w: bundle })).json();
  assert.deepEqual(await unseal(links.links[0].secret), { v: 1, ...ACCOUNT });
  await bridge(env, '/bridge/report', { id: links.links[0].id, ok: true, days: [day('2026-09-29', 0.0123)] }, { w: bundle });
  const ranks = await (await get(env, '/api/ranks', sam, bundle)).json();
  assert.deepEqual(ranks.tables.day.rows.map((r) => [r.nick, r.ret, r.me]), [['Gold Hunter', 0.0123, true]]);
});
