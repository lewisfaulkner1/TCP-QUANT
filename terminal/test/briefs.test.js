// Session briefs end to end: charts in, TCP AI's read, the checked brief posted, what it learns,
// reminders, unfinished reads, the review after each session, and the export. Telegram, D1,
// the price feeds and Anthropic's API are stood in for. Run with: cd terminal && npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import worker, { resetCaches, checkBriefs } from '../src/worker.js';
import bundle from '../dist/worker.js';
import { MARKETS, marketStatus } from '../src/lib.js';
import { fakeD1 } from './d1.js';

const TOKEN = '123456:TEST-TOKEN';
const KEY = 'sk-ant-test-key';
const LEWIS = 777;
const SAM = 555;
const iso = (s) => Date.parse(s) / 1000;
const MONDAY = iso('2026-09-28T06:30:00Z'); // London opens at 07:00 UTC, in 30 minutes
const realNow = Date.now;
let clockAt = MONDAY;
const at = (t) => { clockAt = t; Date.now = () => t * 1000; };
test.beforeEach(() => at(MONDAY));
test.afterEach(() => { Date.now = realNow; resetCaches(); });

const setting = (over = {}) => ({
  BOT_TOKEN: TOKEN, INNER_CIRCLE_CHAT_ID: '-1002', ADMIN_CHAT_ID: '-1001', TWELVE_DATA_KEY: 'td-key',
  POSTER_IDS: `${LEWIS}, 999`, ANTHROPIC_API_KEY: KEY, DB: fakeD1(), ...over,
});

function signed(user) {
  const fields = { auth_date: String(clockAt), query_id: 'AAE1', user: JSON.stringify(user) };
  const check = Object.keys(fields).sort().map((k) => `${k}=${fields[k]}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(TOKEN).digest();
  return new URLSearchParams({ ...fields, hash: createHmac('sha256', secret).update(check).digest('hex') }).toString();
}
const lewis = () => signed({ id: LEWIS, first_name: 'Lewis' });
const sam = () => signed({ id: SAM, first_name: 'Sam' });

// ------------------------------------------------------------ TCP AI's answers
const READ = {
  charts: [
    { chart: 1, timeframe: '15m', price: 3742.4, trend: 'up', summary: 'Higher lows since Asia.' },
    { chart: 2, timeframe: 'H1', price: 3742.5, trend: 'up', summary: 'Holding above the 4H demand.' },
    { chart: 3, timeframe: '240', price: 3742.6, trend: 'sideways', summary: 'A range between 3725 and 3760.' },
  ],
  panel: [
    { section: 'trend matrix', row: '1H', value: '▲ bull · ▲ stack' },
    { section: 'setup', row: 'next H4 zone', value: '3730.00 · 3755.00' },
  ],
  headline: 'Buyers defending 3725–3730 into London',
  bias: 'long',
  reason: 'The 4H demand held twice in Asia and the matrix is bull 3/4.',
  zones: [
    { kind: 'demand', low: 3725, high: 3730, timeframe: '4H', label: '4H demand', why: 'H4 zone at the fib pocket' },
    { kind: 'supply', low: 3755, high: 3760, timeframe: '4H', label: '4H supply', why: 'Sellers twice last week' },
    { kind: 'liquidity', low: 3752.5, high: 3752.5, timeframe: '1H', label: 'Asia high', why: 'Stops above it' },
    { kind: 'demand', low: 3100, high: 3110, timeframe: '1D', label: 'Far away', why: 'Last month' },
  ],
  plan: ['If price sweeps 3725–3730 and closes back above, look for longs toward 3752.5.', '- If it closes below 3725, wait for New York.'],
  chart_to_post: 2,
  unreadable: ['The 4H panel is cut off at the bottom.'],
  confidence: 'high',
};
const message = (content, over = {}) => ({
  id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5', stop_reason: 'end_turn', stop_sequence: null,
  content: [{ type: 'thinking', thinking: '', signature: 'sig' }, ...content], usage: { input_tokens: 20000, output_tokens: 4000 }, ...over,
});
const answers = {
  good: () => ({ body: message([{ type: 'text', text: JSON.stringify(READ) }]) }),
  refused: () => ({ body: message([], { stop_reason: 'refusal' }) }),
  cut: () => ({ body: message([{ type: 'text', text: '{"charts": [' }], { stop_reason: 'max_tokens' }) }),
  garbled: () => ({ body: message([{ type: 'text', text: 'Here is my read: the charts look bullish.' }]) }),
  badKey: () => ({ status: 401, body: { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } } }),
};

// ------------------------------------------------------------ mocked internet
let sent;
let claude;
let gold;
let feeds;
const PICTURE = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 1, 0, 72]);
const PNG_LIKE_TEXT = new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0, 0, 0, 0, 0, 0, 0]);
const clockNow = () => Math.floor(Date.now() / 1000);
const stamp = (t) => new Date(t * 1000).toISOString().replace('T', ' ').slice(0, 19);
const fromStamp = (s) => Date.parse(s.replace(' ', 'T') + 'Z') / 1000;

async function fields(form) {
  const out = {};
  for (const [key, value] of form.entries()) {
    out[key] = typeof value === 'string' ? value : { name: value.name, type: value.type, size: value.size, text: value.size < 200000 ? await value.text() : null };
  }
  return out;
}

function internet({ answer = answers.good, goldBar = () => [3742.5, 3743, 3742, 3742.5], refuse = [] } = {}) {
  sent = [];
  feeds = [];
  claude = { files: [], reads: [], answer };
  gold = goldBar;
  let nextMessage = 100;
  let nextFile = 0;
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(String(url));
    const q = (k) => u.searchParams.get(k);
    const reply = (body, code = 200) => new Response(JSON.stringify(body), { status: code, headers: { 'content-type': 'application/json' } });
    if (u.hostname === 'api.anthropic.com') {
      const req = new Request(u, { ...init, duplex: 'half' });
      const headers = Object.fromEntries(req.headers);
      if (u.pathname === '/v1/files') {
        const form = await req.formData();
        const file = form.get('file');
        const id = `file_${++nextFile}`;
        claude.files.push({ id, name: file.name, type: file.type, size: file.size, expires: form.get('expires_in_seconds'), headers });
        return reply({ id, type: 'file', filename: file.name, mime_type: file.type, size_bytes: file.size, created_at: new Date().toISOString() });
      }
      if (u.pathname === '/v1/messages') {
        const body = await req.json();
        claude.reads.push({ body, headers });
        const { status = 200, body: out } = claude.answer(body);
        return reply(out, status);
      }
      return reply({ type: 'error', error: { type: 'not_found_error', message: 'no' } }, 404);
    }
    if (u.hostname === 'api.telegram.org') {
      if (u.pathname.startsWith('/file/')) return new Response(PICTURE, { headers: { 'content-type': 'application/octet-stream' } });
      const method = u.pathname.split('/').pop();
      const body = init.body instanceof FormData ? await fields(init.body) : JSON.parse(init.body || '{}');
      sent.push({ method, body });
      if (method === 'getChatMember') return reply({ ok: true, result: { status: 'member' } });
      if (refuse.includes(method) || refuse.includes(`${method}:${body.chat_id}`)) return reply({ ok: false, description: 'Forbidden: bot was blocked by the user' }, 403);
      if (method === 'getFile') return reply({ ok: true, result: { file_id: body.file_id, file_path: `documents/${body.file_id}.jpg` } });
      if (method === 'sendMediaGroup') {
        return reply({ ok: true, result: JSON.parse(body.media).map((m, i) => ({ message_id: nextMessage++, document: { file_id: `doc-${i + 1}` } })) });
      }
      const result = { message_id: nextMessage++ };
      if (method === 'sendDocument') result.document = { file_id: 'doc-1' };
      if (method === 'sendPhoto') result.photo = [{ file_id: 'small-id', width: 90 }, { file_id: 'large-id', width: 1280 }];
      return reply({ ok: true, result });
    }
    if (u.hostname === 'api.twelvedata.com') {
      feeds.push(u.searchParams);
      return reply(twelve(q));
    }
    if (u.hostname === 'api.frankfurter.app') return reply({ base: 'USD', date: '2026-09-28', rates: { GBP: 0.75, EUR: 0.85 } });
    return reply({}, 404);
  };
}

// Twelve Data, newest first, on gold's hours. Hourly closes swing $1.50 either side of 3742.50
// (so the engine has volatility to work with), 15-minute bars sit at 3742.50, and one-minute
// bars come from gold(t).
function twelve(q) {
  const step = { '1min': 60, '15min': 900, '1h': 3600 }[q('interval')];
  const from = q('start_date') ? fromStamp(q('start_date')) : null;
  const to = Math.min(q('end_date') ? fromStamp(q('end_date')) : Infinity, clockNow());
  const values = [];
  for (let t = Math.floor(to / step) * step; values.length < Number(q('outputsize') || 30) && (from == null || t >= from); t -= step) {
    if (!marketStatus(MARKETS.XAUUSD, t).open) continue;
    const swing = (t / 3600) % 2 ? 1.5 : -1.5;
    const [o, h, l, c] = step === 60 ? gold(t) : step === 3600 ? [3742.5, 3752.5, 3732.5, 3742.5 + swing] : [3742.5, 3747.5, 3737.5, 3742.5];
    values.push({ datetime: stamp(t), open: String(o), high: String(h), low: String(l), close: String(c) });
  }
  if (!values.length) return { code: 400, message: 'No data is available on the specified dates.', status: 'error' };
  return { status: 'ok', values };
}

const posts = () => sent.filter((c) => c.method !== 'getChatMember');
const pending = [];
const ctx = { waitUntil: (p) => pending.push(p) };

// ------------------------------------------------------------------ requests
const LONDON = { symbol: 'XAUUSD', session: 'london', note: 'Watching the Asia low.' };

function sendCharts(env, brief = LONDON, { as = lewis, charts = 3, picture = PICTURE, w = worker } = {}) {
  const form = new FormData();
  form.append('brief', JSON.stringify(brief));
  for (let i = 0; i < charts; i++) form.append('chart', new Blob([picture], { type: 'image/jpeg' }), `IMG_${i + 1}.jpg`);
  return w.fetch(new Request('https://terminal.example/api/briefs', { method: 'POST', headers: { authorization: `tma ${as()}` }, body: form }), env, ctx);
}
const get = (env, path = '/api/briefs', as = sam, w = worker) =>
  w.fetch(new Request(`https://terminal.example${path}`, { headers: { authorization: `tma ${as()}` } }), env, ctx);
const send = (env, path, body, as = lewis, w = worker) =>
  w.fetch(new Request(`https://terminal.example${path}`, {
    method: 'POST', headers: { authorization: `tma ${as()}`, 'content-type': 'application/json' }, body: JSON.stringify(body),
  }), env, ctx);

// Lewis's edits to TCP AI's draft: the bias to neutral, the demand zone moved, the Asia high
// dropped, a level added, and the plan rewritten.
const EDITED = {
  headline: 'Two-way into London: 3725–3730 is the line',
  bias: 'neutral',
  reason: 'Asia held the demand, but the 4H is still a range.',
  zones: [
    { kind: 'supply', low: 3755, high: 3760, tf: '4H', label: '4H supply', why: 'Sellers twice last week' },
    { kind: 'demand', low: 3726, high: 3731, tf: '4H', label: '4H demand', why: 'H4 zone at the fib pocket' },
    { kind: 'level', low: 3738, high: 3738, tf: '1H', label: 'VWAP', why: '' },
  ],
  plan: 'Above 3738: patience, supply first at 3755.\nA sweep of 3726–3731 that closes back above is the long.',
  chart: 2,
  lesson: 'The Asia high only matters once it has been swept.',
};

// ------------------------------------------------------------------- tests
test('members see an empty record; only posters can send charts; without the database it says so', async () => {
  internet();
  const env = setting();
  const view = await (await get(env)).json();
  assert.equal(view.ready, true);
  assert.equal(view.canPost, false);
  assert.equal(view.ai, true);
  assert.equal(view.next.id, 'london');
  assert.deepEqual(view.next.ask, ['5M', '15M', '30M', '1H', '4H']);
  assert.deepEqual(view.briefs, []);
  assert.equal(view.me, undefined, 'a member gets no poster settings');
  const refused = await sendCharts(env, LONDON, { as: sam });
  assert.equal(refused.status, 403);
  assert.equal((await refused.json()).error, 'not_poster');
  assert.equal(claude.files.length + claude.reads.length, 0);
  const bare = setting({ DB: undefined });
  assert.deepEqual(await (await get(bare)).json(), { ready: false, ai: true });
  assert.equal((await sendCharts(bare)).status, 503);
});

test('charts are checked before anything is kept or read', async () => {
  internet();
  const env = setting();
  const bad = async (res, field, status = 400) => {
    assert.equal(res.status, status);
    assert.equal((await res.json()).field, field);
  };
  await bad(await sendCharts(env, LONDON, { charts: 0 }), 'charts');
  await bad(await sendCharts(env, LONDON, { charts: 7 }), 'charts');
  await bad(await sendCharts(env, LONDON, { picture: PNG_LIKE_TEXT }), 'charts');
  await bad(await sendCharts(env, { ...LONDON, symbol: 'EURUSD' }), 'symbol');
  await bad(await sendCharts(env, { ...LONDON, session: 'sydney' }), 'session');
  assert.equal(claude.files.length + claude.reads.length, 0);
  assert.deepEqual(posts(), []);
});

test('charts in: kept in Telegram, read by TCP AI with the terminal\'s numbers, and a draft back', async () => {
  internet();
  const env = setting();
  const res = await sendCharts(env);
  assert.equal(res.status, 200);
  const { brief } = await res.json();
  assert.equal(brief.status, 'draft');
  assert.equal(brief.session, 'london');
  assert.equal(brief.opens, iso('2026-09-28T07:00:00Z'));
  assert.deepEqual(brief.charts, [{ k: 1, kept: true }, { k: 2, kept: true }, { k: 3, kept: true }]);
  // The draft: zones checked like Lewis's own, highest first, each with its odds.
  const d = brief.draft;
  assert.equal(d.headline, READ.headline);
  assert.equal(d.bias, 'long');
  assert.deepEqual(d.zones.map((z) => [z.kind, z.low, z.high, z.tf]), [['supply', 3755, 3760, '4H'], ['liquidity', 3752.5, 3752.5, '1H'], ['demand', 3725, 3730, '4H']]);
  for (const z of d.zones) assert.ok(z.odds > 0 && z.odds < 1, `${z.label} odds ${z.odds}`);
  assert.ok(d.zones[1].odds > d.zones[0].odds, 'the nearer zone is likelier');
  assert.deepEqual(d.plan, [READ.plan[0], 'If it closes below 3725, wait for New York.']);
  assert.equal(d.chart, 2);
  assert.deepEqual(d.warnings, ['Left out Far away: too far from the price.', 'Not among the charts: 5M, 30M.']);
  assert.deepEqual(brief.read.charts.map((c) => c.timeframe), ['15M', '1H', '4H']);
  assert.equal(brief.read.panel.length, 2);
  assert.deepEqual(brief.read.unreadable, READ.unreadable);
  assert.equal(brief.model, 'claude-opus-5');
  assert.equal(brief.cost, 0.2, '20,000 tokens in at $5 and 4,000 out at $25 a million');
  // Kept in Lewis's chat with the bot, as files, quietly.
  const album = posts().find((c) => c.method === 'sendMediaGroup');
  assert.equal(album.body.chat_id, String(LEWIS));
  assert.equal(album.body.disable_notification, 'true');
  const media = JSON.parse(album.body.media);
  assert.deepEqual(media.map((m) => [m.type, m.media]), [['document', 'attach://chart1'], ['document', 'attach://chart2'], ['document', 'attach://chart3']]);
  assert.match(media[2].caption, /London brief #1 · XAUUSD · 3 charts/);
  assert.equal(album.body.chart1.name, 'brief-1-chart-1.jpg');
  // Each chart went to Anthropic once, kept for a week, with only the key to sign it.
  assert.deepEqual(claude.files.map((f) => [f.name, f.type, f.expires]), [1, 2, 3].map((k) => [`brief-1-chart-${k}.jpg`, 'image/jpeg', '604800']));
  for (const f of claude.files) {
    assert.equal(f.headers['x-api-key'], KEY);
    assert.equal(f.headers.authorization, undefined);
  }
  // One read: the model, the server-side fallback, structured output, and the charts in order.
  assert.equal(claude.reads.length, 1);
  const { body, headers } = claude.reads[0];
  assert.equal(body.model, 'claude-opus-5');
  assert.equal(body.max_tokens, 16000);
  assert.equal(body.fallbacks, 'default');
  assert.match(headers['anthropic-beta'], /server-side-fallback-2026-07-01/);
  assert.equal(body.output_config.effort, 'high');
  assert.equal(body.output_config.format.type, 'json_schema');
  assert.ok(body.output_config.format.schema.required.includes('zones'));
  assert.match(body.system, /You are TCP AI/);
  const content = body.messages[0].content;
  assert.deepEqual(content.slice(0, 6).map((c) => (c.type === 'text' ? c.text : c.source.file_id)), ['Chart 1', 'file_1', 'Chart 2', 'file_2', 'Chart 3', 'file_3']);
  const words = content[6].text;
  for (const part of ['Market: XAUUSD (Gold)', 'Session: London, opens in 30m', 'asked for these timeframes: 5M, 15M, 30M, 1H, 4H',
    'price 3,742.50', 'average daily range', "The analyst's note for this session: Watching the Asia low."]) {
    assert.ok(words.includes(part), `the read's text has "${part}"`);
  }
  assert.ok(!words.includes('<guide>'), 'no guide yet');
  // Members still see nothing: it's a draft.
  assert.deepEqual((await (await get(env)).json()).briefs, []);
  const mine = await (await get(env, '/api/briefs', lewis)).json();
  assert.equal(mine.briefs[0].status, 'draft');
  assert.equal(mine.me.readsToday, 1);
});

test('the checked brief posts once, test mode to the team group, and what Lewis changed becomes a lesson', async () => {
  internet();
  const env = setting();
  await sendCharts(env);
  sent = [];
  const res = await send(env, '/api/briefs/1/post', EDITED);
  assert.equal(res.status, 200);
  const { brief } = await res.json();
  assert.equal(brief.status, 'posted');
  assert.deepEqual(brief.final.zones.map((z) => [z.kind, z.low, z.high]), [['supply', 3755, 3760], ['level', 3738, 3738], ['demand', 3726, 3731]]);
  assert.deepEqual(brief.final.plan, ['Above 3738: patience, supply first at 3755.', 'A sweep of 3726–3731 that closes back above is the long.']);
  // The chart Lewis picked, fetched back from Telegram and posted as a photo with the brief.
  assert.deepEqual(posts().map((c) => c.method), ['getFile', 'sendPhoto']);
  assert.equal(posts()[0].body.file_id, 'doc-2');
  const photo = posts()[1].body;
  assert.equal(photo.chat_id, '-1001', 'test mode: the team group');
  const text = photo.caption;
  assert.ok(text.length <= 1024);
  for (const part of ['🧪 <b>TEST</b>', '🌍 <b>LONDON OPENS IN 30 MIN</b> · XAUUSD', `<b>${EDITED.headline}</b>`, 'Bias: <b>NEUTRAL</b> · Asia held',
    '🔴 <b>3,755.00–3,760.00</b> · 4H supply · ', '⚪ <b>3,738.00</b> · VWAP · ', '🟢 <b>3,726.00–3,731.00</b> · 4H demand · ',
    '↳ <i>H4 zone at the fib pocket</i>', '• Above 3738: patience', 'before London closes if it moves at random',
    '#Brief #London #XAUUSD', 'Charts read by TCP AI, checked by Lewis · brief #1 · not financial advice']) {
    assert.ok(text.includes(part), `the post has "${part}"`);
  }
  assert.ok(text.indexOf('3,755.00') < text.indexOf('3,738.00') && text.indexOf('3,738.00') < text.indexOf('3,726.00'), 'highest first');
  // What Lewis changed, and what he typed, are kept for TCP AI's next read.
  const lessons = env.DB.sqlite.prepare('SELECT kind, text, brief FROM brief_lessons ORDER BY i').all();
  assert.equal(lessons.length, 2);
  assert.equal(lessons[0].kind, 'edit');
  for (const part of ['London 2026-09-28, XAUUSD', 'bias long → neutral', '4H demand 3,725.00–3,730.00 → 3,726.00–3,731.00',
    'removed Asia high 3,752.50', 'added VWAP 3,738.00 (level)', 'rewrote the plan']) {
    assert.ok(lessons[0].text.includes(part), `the lesson has "${part}": ${lessons[0].text}`);
  }
  assert.deepEqual([lessons[1].kind, lessons[1].text, lessons[1].brief], ['note', EDITED.lesson, 1]);
  // Once only; and a test brief, and its chart, stay with the team.
  const again = await send(env, '/api/briefs/1/post', EDITED);
  assert.equal(again.status, 409);
  assert.equal((await again.json()).error, 'posted');
  assert.deepEqual((await (await get(env)).json()).briefs, []);
  assert.equal((await get(env, '/api/briefs/1/chart')).status, 404);
  assert.equal((await get(env, '/api/briefs/1/chart', lewis)).status, 200);
  assert.equal((await (await get(env, '/api/briefs', lewis)).json()).briefs[0].status, 'posted');
});

// D1 answering a moment late, as over the network: two requests then both read the brief
// before either writes.
function slow(db) {
  const late = (fn) => async (...a) => { await new Promise((r) => setTimeout(r, 5)); return fn(...a); };
  return { ...db, prepare: (sql) => {
    const wrap = (st) => ({ ...st, bind: (...v) => wrap(st.bind(...v)), first: late(st.first), all: late(st.all), run: late(st.run) });
    return wrap(db.prepare(sql));
  } };
}

test('two taps at once post once', async () => {
  internet();
  const env = setting();
  await sendCharts(env);
  env.DB = slow(env.DB);
  sent = [];
  const [a, b] = await Promise.all([send(env, '/api/briefs/1/post', EDITED), send(env, '/api/briefs/1/post', EDITED)]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
  assert.equal(posts().filter((c) => c.method === 'sendPhoto').length, 1);
});

test('the post is checked: a headline, the bias, sane zones, a plan, and the session still open', async () => {
  internet();
  const env = setting();
  await sendCharts(env);
  const bad = async (over, field) => {
    const res = await send(env, '/api/briefs/1/post', { ...EDITED, ...over });
    assert.equal(res.status, 400, JSON.stringify(over));
    assert.equal((await res.json()).field, field);
  };
  await bad({ headline: '  ' }, 'headline');
  await bad({ bias: 'up' }, 'bias');
  await bad({ zones: [] }, 'zones');
  await bad({ zones: [...EDITED.zones, { kind: 'demand', low: 3000, high: 3005 }] }, 'zones');
  await bad({ zones: [{ kind: 'demand', low: 3700, high: 3790 }] }, 'zones');
  await bad({ plan: '\n - \n' }, 'plan');
  at(iso('2026-09-28T16:00:00Z'));
  const late = await send(env, '/api/briefs/1/post', EDITED);
  assert.equal(late.status, 400);
  assert.match((await late.json()).message, /London has closed/);
  assert.deepEqual(posts().filter((c) => /^send(Photo|Message)$/.test(c.method)), []);
});

test('live mode: the Inner Circle\'s briefs topic, and members see the brief and its chart', async () => {
  internet();
  const env = setting({ BRIEF_MODE: 'live', BRIEF_THREAD_ID: '42' });
  await sendCharts(env);
  assert.deepEqual((await (await get(env)).json()).briefs, [], 'a draft is Lewis\'s until it posts');
  await send(env, '/api/briefs/1/post', EDITED);
  const photo = posts().find((c) => c.method === 'sendPhoto').body;
  assert.equal(photo.chat_id, '-1002');
  assert.equal(photo.message_thread_id, '42');
  assert.ok(!photo.caption.includes('TEST'));
  const view = await (await get(env)).json();
  assert.equal(view.mode, 'live');
  assert.equal(view.briefs.length, 1);
  const b = view.briefs[0];
  assert.equal(b.final.headline, EDITED.headline);
  assert.equal(b.photo, true);
  for (const hidden of ['read', 'draft', 'cost', 'note', 'charts', 'lesson', 'model']) assert.equal(b[hidden], undefined, `members don't get ${hidden}`);
  assert.equal(view.memory.briefs, 1);
  assert.equal(view.memory.lessons, 2);
  const chart = await get(env, '/api/briefs/1/chart');
  assert.equal(chart.status, 200);
  assert.equal(chart.headers.get('content-type'), 'image/jpeg');
  assert.equal((await get(env, '/api/briefs/1/chart/1')).status, 404, 'the other charts are the poster\'s');
  assert.equal((await get(env, '/api/briefs/1/chart/1', lewis)).status, 200);
});

test('what TCP AI learns goes into its next read: the reading guide and the lessons, newest first', async () => {
  internet();
  const env = setting();
  const guide = 'The panel is the TCP QT panel.\n\n  Its setup rows: next H4 zone, zone AT fib, confirmations.   \nRead each exactly.';
  const taught = await (await send(env, '/api/briefs/teach', { guide, prefs: { remind: true, sessions: ['london', 'mars'], lead: 30 }, lesson: 'Treat the previous day high as liquidity.' })).json();
  assert.equal(taught.me.guide, 'The panel is the TCP QT panel.\n\n  Its setup rows: next H4 zone, zone AT fib, confirmations.\nRead each exactly.');
  assert.deepEqual(taught.me.prefs, { remind: true, sessions: ['london'], lead: 30 });
  assert.equal(taught.me.lessons[0].text, 'Treat the previous day high as liquidity.');
  await sendCharts(env);
  await send(env, '/api/briefs/1/post', EDITED);
  await sendCharts(env);
  const words = claude.reads[1].body.messages[0].content.at(-1).text;
  assert.ok(words.includes(`<guide>\n${taught.me.guide}\n</guide>`));
  const lines = words.split('\n');
  const start = lines.indexOf('What the analyst corrected or taught you before, newest first:');
  assert.ok(start > 0);
  assert.equal(lines[start + 1], `- ${EDITED.lesson}`);
  assert.match(lines[start + 2], /^- London 2026-09-28, XAUUSD: bias long → neutral/);
  assert.equal(lines[start + 3], '- Treat the previous day high as liquidity.');
  // A lesson can be forgotten, and a member can't teach.
  const forget = (await (await send(env, '/api/briefs/teach', { forget: taught.me.lessons[0].i })).json()).me.lessons;
  assert.ok(!forget.some((l) => l.text.startsWith('Treat the previous')));
  assert.equal((await send(env, '/api/briefs/teach', { guide: 'x' }, sam)).status, 403);
});

test('a read that fails says why; trying again reuses the uploaded charts; Lewis can always write it himself', async () => {
  internet({ answer: answers.badKey });
  const env = setting();
  const { brief } = await (await sendCharts(env)).json();
  assert.equal(brief.status, 'failed');
  assert.match(brief.error, /key was refused: check ANTHROPIC_API_KEY/);
  assert.equal(claude.files.length, 3);
  for (const [answer, words] of [[answers.refused, /declined/], [answers.cut, /cut short/], [answers.garbled, /didn't come back in shape/]]) {
    claude.answer = answer;
    const again = (await (await send(env, '/api/briefs/1/read', {})).json()).brief;
    assert.equal(again.status, 'failed');
    assert.match(again.error, words);
  }
  claude.answer = answers.good;
  const read = (await (await send(env, '/api/briefs/1/read', {})).json()).brief;
  assert.equal(read.status, 'draft');
  assert.equal(claude.files.length, 3, 'no chart sent twice');
  assert.equal((await send(env, '/api/briefs/1/read', {})).status, 409, 'a draft isn\'t read again');
  // Two taps on Try again read once.
  claude.answer = answers.badKey;
  await sendCharts(env);
  const reads = claude.reads.length;
  claude.answer = answers.good;
  env.DB = slow(env.DB);
  const taps = await Promise.all([send(env, '/api/briefs/2/read', {}), send(env, '/api/briefs/2/read', {})]);
  assert.deepEqual(taps.map((r) => r.status).sort(), [200, 409]);
  assert.equal(claude.reads.length, reads + 1);
  // A failed read can still go out, written by hand.
  claude.answer = answers.badKey;
  await sendCharts(env);
  const hand = await (await send(env, '/api/briefs/3/post', EDITED)).json();
  assert.equal(hand.brief.status, 'posted');
  assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM brief_lessons WHERE brief = 3 AND kind = 'edit'").get().n, 0, 'nothing to learn from a draft that never was');
});

test('without an Anthropic key, the charts are kept and Lewis writes the brief himself', async () => {
  internet();
  const env = setting({ ANTHROPIC_API_KEY: undefined });
  const res = await (await sendCharts(env)).json();
  assert.equal(res.brief.status, 'draft');
  assert.equal(res.brief.draft, null);
  assert.match(res.warning, /TCP AI is off/);
  assert.equal(claude.files.length + claude.reads.length, 0);
  await send(env, '/api/briefs/1/post', EDITED);
  const caption = posts().find((c) => c.method === 'sendPhoto').body.caption;
  assert.match(caption, /By Lewis · brief #1 · not financial advice/);
  assert.equal((await (await get(env)).json()).ai, false);
});

test('reads are capped each day, and a draft can be dropped', async () => {
  internet();
  const env = setting({ BRIEF_DAILY_READS: '2' });
  await sendCharts(env);
  await sendCharts(env);
  const third = await sendCharts(env);
  assert.equal(third.status, 429);
  assert.match((await third.json()).message, /today's limit/);
  assert.equal(claude.reads.length, 2);
  assert.equal((await send(env, '/api/briefs/2/discard', {})).status, 200);
  assert.equal((await send(env, '/api/briefs/2/post', EDITED)).status, 409);
  const mine = await (await get(env, '/api/briefs', lewis)).json();
  assert.deepEqual(mine.briefs.map((b) => b.id), [1]);
  at(MONDAY + 86400);
  assert.equal((await sendCharts(env, { ...LONDON })).status, 200, 'a new day');
});

test('reminders go to each poster before the sessions they asked for, once, with a button into the app', async () => {
  internet();
  const env = setting();
  await get(env, '/api/briefs', lewis); // the app, opened by a poster: the terminal's address is learned
  at(iso('2026-09-28T06:16:00Z'));
  await checkBriefs(env, clockAt);
  const reminders = () => posts().filter((c) => c.method === 'sendMessage');
  assert.deepEqual(reminders().map((c) => c.body.chat_id), [LEWIS, 999]);
  const r = reminders()[0].body;
  assert.match(r.text, /🌍 <b>London opens in 44m<\/b> \(08:00 London time\)/);
  assert.match(r.text, /<b>5M · 15M · 30M · 1H · 4H<\/b>/);
  assert.deepEqual(r.reply_markup.inline_keyboard[0][0], { text: '📈 SEND CHARTS', web_app: { url: 'https://terminal.example/?brief=london' } });
  at(iso('2026-09-28T06:21:00Z'));
  await checkBriefs(env, clockAt);
  assert.equal(reminders().length, 2, 'once each');
  // Lewis only wants Asia and London; 999 still gets New York's.
  await send(env, '/api/briefs/teach', { prefs: { sessions: ['asia', 'london'] } });
  at(iso('2026-09-28T11:15:00Z'));
  await checkBriefs(env, clockAt);
  assert.deepEqual(reminders().slice(2).map((c) => c.body.chat_id), [999]);
  assert.match(reminders()[2].body.text, /New York opens in 45m<\/b> \(08:00 New York time\)/);
  // 999 turns them off. Sunday night, for Monday's Asia open, Lewis is asked for the daily chart too.
  await send(env, '/api/briefs/teach', { prefs: { remind: false } }, () => signed({ id: 999, first_name: 'Second poster' }));
  at(iso('2026-10-04T23:15:00Z'));
  await checkBriefs(env, clockAt);
  assert.deepEqual(reminders().slice(3).map((c) => c.body.chat_id), [LEWIS]);
  assert.match(reminders()[3].body.text, /Asia opens in 45m<\/b> \(09:00 Tokyo time\)[\s\S]*4H · 1D<\/b> \(the daily for the week ahead\)/);
});

test('reminders wait for TCP AI\'s key unless a poster turns them on, and use TERMINAL_URL when it\'s set', async () => {
  internet();
  const env = setting({ ANTHROPIC_API_KEY: undefined, TERMINAL_URL: 'https://tcp.example/' });
  at(iso('2026-09-28T06:16:00Z'));
  await checkBriefs(env, clockAt);
  assert.deepEqual(posts().filter((c) => c.method === 'sendMessage'), []);
  await send(env, '/api/briefs/teach', { prefs: { remind: true } });
  at(iso('2026-09-28T11:16:00Z'));
  await checkBriefs(env, clockAt);
  const r = posts().filter((c) => c.method === 'sendMessage');
  assert.deepEqual(r.map((c) => c.body.chat_id), [LEWIS]);
  assert.equal(r[0].body.reply_markup.inline_keyboard[0][0].web_app.url, 'https://tcp.example/?brief=newyork');
});

test('a read the app didn\'t wait for is finished by the check, and the poster is told', async () => {
  internet();
  const env = setting();
  await get(env, '/api/briefs', lewis);
  // As if the Worker stopped mid-read: the charts are kept in Telegram, not yet at Anthropic.
  env.DB.sqlite.prepare(`INSERT INTO briefs (created, author_id, author, session, day, opens, closes, symbol, note, context, charts, status, test, read_at, attempts)
    VALUES (?, ?, 'Lewis', 'london', '2026-09-28', ?, ?, 'XAUUSD', '', ?, ?, 'reading', 1, ?, 1)`).run(
    MONDAY, LEWIS, iso('2026-09-28T07:00:00Z'), iso('2026-09-28T16:00:00Z'),
    JSON.stringify({ price: 3742.5, atr: 20, variance: 1e-5, levels: [], source: 'Twelve Data' }),
    JSON.stringify([{ k: 1, size: 16, file: 'doc-1' }, { k: 2, size: 16, file: 'doc-2' }]), MONDAY,
  );
  at(MONDAY + 120);
  await checkBriefs(env, clockAt);
  assert.equal(claude.reads.length, 0, 'not yet: it may still be running');
  at(MONDAY + 300);
  await checkBriefs(env, clockAt);
  assert.deepEqual(claude.files.map((f) => f.name), ['brief-1-chart-1.jpg', 'brief-1-chart-2.jpg']);
  const told = posts().filter((c) => c.method === 'sendMessage').at(-1).body;
  assert.equal(told.chat_id, LEWIS);
  assert.equal(told.text, '✍️ Your London brief #1 is ready to check.');
  assert.equal(told.reply_markup.inline_keyboard[0][0].web_app.url, 'https://terminal.example/?brief=london');
  assert.equal((await (await get(env, '/api/briefs', lewis)).json()).briefs[0].status, 'draft');
  // One that keeps dying is given up on after three tries.
  env.DB.sqlite.prepare("UPDATE briefs SET status = 'reading', attempts = 3, read_at = ? WHERE id = 1").run(MONDAY);
  at(MONDAY + 900);
  await checkBriefs(env, clockAt);
  const b = env.DB.sqlite.prepare('SELECT status, error FROM briefs WHERE id = 1').get();
  assert.equal(b.status, 'failed');
  assert.match(b.error, /couldn't finish reading/);
});

// Gold after the brief: down from 3742.50 into the demand zone by 08:00 (reached at 07:30),
// then up to 3748 by 09:00, and flat after. Supply at 3755 is never reached.
function sessionPath(t) {
  const m = (t - iso('2026-09-28T06:30:00Z')) / 60;
  const p = m <= 60 ? 3742.5 - (15.5 * m) / 60 : m <= 120 ? 3727 + (21 * (m - 60)) / 60 : 3748;
  return [p, p + 0.3, p - 0.3, p];
}

test('after the session: each zone reviewed from one-minute bars, and the wrap posted as a reply', async () => {
  internet({ goldBar: sessionPath });
  const env = setting({ BRIEF_MODE: 'live', BRIEF_THREAD_ID: '42' });
  await sendCharts(env);
  const zones = [...EDITED.zones.slice(0, 2), { kind: 'level', low: 3740, high: 3745, label: 'Open' }];
  assert.equal((await send(env, '/api/briefs/1/post', { ...EDITED, zones })).status, 200);
  const postId = env.DB.sqlite.prepare('SELECT message FROM briefs WHERE id = 1').get().message;
  assert.ok(postId);
  sent = [];
  at(iso('2026-09-28T15:59:00Z'));
  await checkBriefs(env, clockAt);
  assert.equal(posts().filter((c) => c.method === 'sendMessage').length, 0, 'not before the close');
  at(iso('2026-09-28T16:05:00Z'));
  sent = [];
  await Promise.all([checkBriefs(env, clockAt), checkBriefs(env, clockAt)]); // two checks at once still wrap once
  assert.equal(posts().filter((c) => c.method === 'sendMessage').length, 1);
  const wrap = posts().find((c) => c.method === 'sendMessage').body;
  assert.equal(wrap.chat_id, '-1002');
  assert.equal(wrap.message_thread_id, 42);
  assert.equal(wrap.reply_parameters.message_id, postId, 'a reply to the brief\'s post');
  const lines = wrap.text.split('\n');
  assert.equal(lines[0], '🏁 <b>LONDON WRAP</b> · XAUUSD · brief #1');
  assert.match(wrap.text, /⬜ <b>3,755.00–3,760.00<\/b> 4H supply · not reached \(\d+%\)/);
  // First reached in the minute from 07:14 (price 3731.13 at its close); from there, 3748.30 back up and 3726.70 down.
  assert.match(wrap.text, /✅ <b>3,726.00–3,731.00<\/b> 4H demand · reached after 44m, then 17\.17 back, 4\.43 on through/);
  assert.match(wrap.text, /➖ <b>3,740.00–3,745.00<\/b> Open · price was already there/);
  assert.match(wrap.text, /Reached 1 of 2 · a random walk would reach [0-9.]+/);
  assert.match(wrap.text, /Zone record: 1 of 2 reached \(a random walk: 0\.[0-9]\) · average turn \+0\.[0-9]{2} ATR/);
  // The minutes asked for: from an hour before the post to the close.
  const minutes = feeds.find((q) => q.get('interval') === '1min');
  assert.equal(minutes.get('start_date'), '2026-09-28 05:30:00');
  assert.equal(minutes.get('end_date'), '2026-09-28 16:00:00');
  const view = await (await get(env)).json();
  assert.equal(view.stats.zones, 2);
  assert.equal(view.stats.reached, 1);
  assert.equal(view.stats.turn.n, 1);
  assert.ok(view.stats.turn.avg > 0, 'price went back up from the demand zone');
  assert.equal(view.briefs[0].review.reached, 1);
  sent = [];
  at(iso('2026-09-28T16:10:00Z'));
  await checkBriefs(env, clockAt);
  assert.equal(posts().filter((c) => c.method === 'sendMessage').length, 0, 'one wrap only');
});

test('the export: every brief and lesson as JSON lines, without anyone\'s Telegram ids', async () => {
  internet();
  const env = setting();
  await send(env, '/api/briefs/teach', { guide: 'Read the panel.' });
  await sendCharts(env);
  await send(env, '/api/briefs/1/post', EDITED);
  sent = [];
  const res = await (await send(env, '/api/briefs/export', {})).json();
  assert.deepEqual(res, { ok: true, briefs: 1, lessons: 2 });
  const doc = posts().find((c) => c.method === 'sendDocument').body;
  assert.equal(doc.chat_id, String(LEWIS));
  assert.match(doc.document.name, /^tcp-briefs-2026-09-28\.jsonl$/);
  const lines = doc.document.text.trim().split('\n').map((l) => JSON.parse(l));
  assert.deepEqual(lines.map((l) => l.type), ['about', 'guide', 'brief', 'lesson', 'lesson']);
  assert.equal(lines[1].text, 'Read the panel.');
  const b = lines[2];
  assert.equal(b.status, 'posted');
  assert.equal(b.final.headline, EDITED.headline);
  assert.equal(b.draft.headline, READ.headline, 'TCP AI\'s draft and Lewis\'s final side by side');
  assert.equal(b.read.charts.length, 3);
  assert.deepEqual(b.charts.map((c) => c.file), ['doc-1', 'doc-2', 'doc-3']);
  for (const key of ['author_id', 'authorId', 'chat', 'thread', 'message']) assert.ok(!(key in b), `no ${key}`);
  assert.ok(!doc.document.text.includes(String(LEWIS)), 'no Telegram user ids anywhere');
  assert.equal((await send(env, '/api/briefs/export', {}, sam)).status, 403);
});

test('the built file reads, posts and serves a brief the same way', async () => {
  internet();
  const env = setting();
  const { brief } = await (await sendCharts(env, LONDON, { w: bundle })).json();
  assert.equal(brief.status, 'draft');
  assert.equal(brief.draft.zones.length, 3);
  assert.equal(claude.reads.length, 1);
  assert.equal(claude.reads[0].body.fallbacks, 'default');
  const posted = await (await send(env, '/api/briefs/1/post', EDITED, lewis, bundle)).json();
  assert.equal(posted.brief.status, 'posted');
  const view = await (await get(env, '/api/briefs', lewis, bundle)).json();
  assert.equal(view.briefs[0].final.headline, EDITED.headline);
});
