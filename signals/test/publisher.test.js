// End-to-end tests: event files in, Telegram calls out. Telegram is replaced by a recording fake.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createStore, verifyLedger } from '../src/store.js';
import { createTelegram } from '../src/telegram.js';
import { createPublisher } from '../src/publisher.js';
import { validateEvent, closeR } from '../src/events.js';
import { isoWeek, reportWeek, weekLabel } from '../src/time.js';

const TOKEN = '123456789:AAAbbbCCCdddEEEfffGGGhhhIIIjjjKKKlll';
const ok = (id) => ({ status: 200, json: async () => ({ ok: true, result: { message_id: id } }) });
const tgError = (code, description, parameters) => ({ status: code, json: async () => ({ ok: false, error_code: code, description, parameters }) });

function fakeFetch(respond) {
  const calls = []; let next = 100;
  const fn = async (url, init) => {
    const method = url.split('/').pop();
    let params;
    if (init.body instanceof FormData) {
      params = {};
      for (const [k, v] of init.body.entries()) params[k] = typeof v === 'string' ? v : { file: v.name, size: v.size };
    } else params = JSON.parse(init.body);
    const call = { url, method, params };
    calls.push(call);
    const custom = respond && respond(call, calls.length);
    if (custom instanceof Error) throw custom;
    return custom || ok(next++);
  };
  fn.calls = calls;
  return fn;
}

function world({ config = {}, respond, start = '2026-09-28T13:30:00Z' } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tcp-pub-'));
  const cfg = {
    mode: 'test', outbox: path.join(dir, 'outbox'), data_dir: path.join(dir, 'data'), display_tz: 'Europe/London',
    chats: { test: '-100111', signals: '-100222', signals_thread: 3, results: '-100222', results_thread: 5, alerts: '-100333' },
    strategies: { QT1: { label: 'TCP Quant Terminal', live: false } },
    ...config,
  };
  fs.mkdirSync(cfg.outbox, { recursive: true });
  const clock = { t: new Date(start) };
  const fetchImpl = fakeFetch(respond);
  const telegram = createTelegram({ token: TOKEN, fetchImpl });
  const drawn = { cards: [], results: [] };
  const render = {
    signal: (card) => { drawn.cards.push(card); return Buffer.from('png-signal'); },
    results: (res) => { drawn.results.push(res); return Buffer.from('png-results'); },
  };
  const logs = [];
  const store = createStore(cfg.data_dir, { now: () => clock.t });
  const pub = createPublisher({ config: cfg, store, telegram, render, log: (l, m) => logs.push(`${l} ${m}`), now: () => clock.t });
  let n = 0;
  const drop = (obj, name) => {
    const file = path.join(cfg.outbox, name || `${String(++n).padStart(4, '0')}-${obj.type}-${obj.id}.json`);
    fs.writeFileSync(file, JSON.stringify(obj));
    fs.utimesSync(file, clock.t, clock.t);
    return path.basename(file);
  };
  const advance = (ms) => { clock.t = new Date(clock.t.getTime() + ms); };
  const listDir = (...p) => { const d = path.join(cfg.data_dir, ...p); return fs.existsSync(d) ? fs.readdirSync(d) : []; };
  return { cfg, pub, store, calls: fetchImpl.calls, drawn, logs, drop, advance, clock, outbox: () => fs.readdirSync(cfg.outbox), listDir };
}

const OPEN = (over = {}) => ({ v: 1, type: 'open', id: 'QT1-1', strategy: 'QT1', instrument: 'XAUUSD', side: 'buy', order: 'market',
  entry: 3742.5, sl: 3727.5, tp: [3772.5], time: '2026-09-28T13:30:00Z', ...over });
const UPD = (event, over = {}) => ({ v: 1, type: 'update', id: 'QT1-1', event, time: '2026-09-28T15:00:00Z', ...over });
const replyTo = (call) => JSON.parse(call.params.reply_parameters || 'null')?.message_id ?? call.params.reply_parameters?.message_id;

test('a new signal is posted as a card with the agreed signal text, to the test chat by default', async () => {
  const w = world();
  w.drop(OPEN({ note: 'Swept the Asian low into the H4 zone.' }));
  await w.pub.tick();
  assert.equal(w.calls.length, 1);
  const c = w.calls[0];
  assert.equal(c.method, 'sendPhoto');
  assert.equal(c.params.chat_id, '-100111');
  assert.equal(c.params.parse_mode, 'HTML');
  assert.equal(c.params.photo.file, 'XAUUSD-buy-0928-01.png');
  for (const s of ['📈 <b>SIGNAL · 28 Sep 2026</b>', 'Market: <b>XAUUSD</b>', 'Direction: <b>BUY</b>', 'Entry: <code>3,742.50</code>',
    'Stop loss: <code>3,727.50</code>', 'Take profit: <code>3,772.50</code>', 'Risk:Reward: 1:2.0', 'Why: Swept the Asian low into the H4 zone.',
    'Updates follow as replies until the trade is closed.', 'TCP Quant Terminal · Ref 0928-01 · Not financial advice.']) {
    assert.ok(c.params.caption.includes(s), `caption is missing: ${s}`);
  }
  const card = w.drawn.cards[0];
  assert.deepEqual([card.instrument, card.side, card.entry, card.sl, card.tp, card.when, card.tz, card.ref, card.example],
    ['XAUUSD', 'buy', '3742.50', '3727.50', '3772.50', '2026-09-28T14:30', 'BST', '0928-01', false]);
  assert.deepEqual(w.outbox(), []);
  assert.equal(w.listDir('sent', '2026-09').length, 1);
});

test('a strategy reaches the members group only when the mode is live and the strategy is live', async () => {
  const cases = [
    { mode: 'test', live: true, chat: '-100111' },
    { mode: 'live', live: false, chat: '-100111' },
    { mode: 'live', live: true, chat: '-100222', thread: '3' },
  ];
  for (const k of cases) {
    const w = world({ config: { mode: k.mode, strategies: { QT1: { live: k.live } } } });
    w.drop(OPEN());
    await w.pub.tick();
    assert.equal(w.calls[0].params.chat_id, k.chat, JSON.stringify(k));
    assert.equal(w.calls[0].params.message_thread_id, k.thread, JSON.stringify(k));
  }
});

test('a take-profit replies to its signal with a stamped card and the result in R', async () => {
  const w = world();
  w.drop(OPEN()); await w.pub.tick();
  w.drop(UPD('tp')); await w.pub.tick();
  const c = w.calls[1];
  assert.equal(c.method, 'sendPhoto');
  assert.equal(replyTo(c), 100);
  assert.ok(c.params.caption.startsWith('✅ <b>Take profit hit</b> · +2.0R'), c.params.caption);
  assert.ok(c.params.caption.includes('XAUUSD BUY · Ref 0928-01'));
  assert.equal(w.drawn.cards[1].status, 'tp');
  assert.equal(w.drawn.cards[1].resultR, 2);
  const sig = w.store.getSignal('QT1-1');
  assert.deepEqual([sig.status, sig.r, sig.exit], ['closed', 2, 'tp']);
});

test('a stop moved to entry, then hit, reads as breakeven', async () => {
  const w = world();
  w.drop(OPEN()); await w.pub.tick();
  w.drop(UPD('sl_moved', { price: 3742.5, time: '2026-09-28T14:10:00Z' })); await w.pub.tick();
  assert.equal(w.calls[1].method, 'sendMessage');
  assert.equal(w.calls[1].params.reply_parameters.message_id, 100);
  assert.ok(w.calls[1].params.text.startsWith('🔒 <b>Stop moved</b> to <code>3,742.50</code> (breakeven)'), w.calls[1].params.text);
  w.drop(UPD('sl', { time: '2026-09-28T15:20:00Z' })); await w.pub.tick();
  assert.ok(w.calls[2].params.caption.startsWith('➖ <b>Stopped at breakeven</b> · 0.0R'), w.calls[2].params.caption);
  assert.equal(w.store.getSignal('QT1-1').r, 0);
});

test('a sell stopped out with slippage reports the real result', async () => {
  const w = world();
  w.drop(OPEN({ side: 'sell', sl: 3757.5, tp: [3712.5] })); await w.pub.tick();
  w.drop(UPD('sl', { price: 3759 })); await w.pub.tick();
  assert.ok(w.calls[1].params.caption.startsWith('🔴 <b>Stopped out</b> · −1.1R'), w.calls[1].params.caption);
  assert.equal(w.drawn.cards[1].status, 'sl');
  assert.equal(w.drawn.cards[1].resultR, -1.1);
});

test('an update that arrives before its signal waits, then replies once the signal is posted', async () => {
  const w = world();
  w.drop(UPD('tp'), '0001-update.json');
  w.drop(OPEN(), '0002-open.json');
  await w.pub.tick();
  assert.deepEqual(w.calls.map((c) => c.method), ['sendPhoto']);
  assert.deepEqual(w.outbox(), ['0001-update.json']);
  w.advance(11000); await w.pub.tick();
  assert.equal(w.calls.length, 2);
  assert.equal(replyTo(w.calls[1]), 100);
  assert.deepEqual(w.outbox(), []);
});

test('an update for a signal that never arrived is set aside after 30 minutes, with an alert', async () => {
  const w = world();
  w.drop(UPD('tp', { id: 'NOPE' }));
  await w.pub.tick();
  assert.equal(w.calls.length, 0);
  w.advance(31 * 60000); await w.pub.tick();
  assert.equal(w.listDir('failed').filter((f) => f.endsWith('.json')).length, 1);
  assert.equal(w.calls[0].method, 'sendMessage');
  assert.equal(w.calls[0].params.chat_id, '-100333');
  assert.match(w.calls[0].params.text, /nothing to reply to/);
});

test('the same event dropped twice is posted once', async () => {
  const w = world();
  w.drop(OPEN(), 'a.json');
  w.drop(OPEN(), 'b.json');
  await w.pub.tick();
  assert.equal(w.calls.length, 1);
  assert.equal(w.listDir('sent', '2026-09').length, 2);
});

test('the same stop move dropped twice is posted once', async () => {
  const w = world();
  w.drop(OPEN()); await w.pub.tick();
  const move = UPD('sl_moved', { price: 3742.5, time: '2026-09-28T14:10:00Z' });
  w.drop(move, 'm1.json'); w.drop(move, 'm2.json');
  await w.pub.tick();
  assert.deepEqual(w.calls.map((c) => c.method), ['sendPhoto', 'sendMessage']);
});

test('signals from a strategy that is not in the config are refused', async () => {
  const w = world();
  w.drop(OPEN({ strategy: 'X9' }));
  await w.pub.tick();
  assert.ok(w.calls.every((c) => c.params.chat_id === '-100333'), 'only the alert is sent');
  const err = w.listDir('failed').find((f) => f.endsWith('.error.txt'));
  assert.match(fs.readFileSync(path.join(w.cfg.data_dir, 'failed', err), 'utf8'), /isn't listed in config.strategies/);
});

test('a malformed event is refused with the reason written next to it', async () => {
  const w = world();
  w.drop(OPEN({ sl: 3750 }));
  await w.pub.tick();
  const err = w.listDir('failed').find((f) => f.endsWith('.error.txt'));
  assert.equal(fs.readFileSync(path.join(w.cfg.data_dir, 'failed', err), 'utf8').trim(), 'for a buy, sl must be below entry');
});

test("Telegram's rate limit is respected: the post waits retry_after seconds, then goes", async () => {
  const w = world({ respond: (call, n) => (n === 1 ? tgError(429, 'Too Many Requests: retry after 7', { retry_after: 7 }) : null) });
  w.drop(OPEN());
  await w.pub.tick();
  assert.equal(w.outbox().length, 1);
  assert.ok(w.logs.some((l) => l.includes('trying again in 7s')), w.logs.join('\n'));
  w.advance(5000); await w.pub.tick();
  assert.equal(w.calls.length, 1, 'not retried early');
  w.advance(3000); await w.pub.tick();
  assert.equal(w.calls.length, 2);
  assert.deepEqual(w.outbox(), []);
});

test('a post Telegram rejects outright is set aside with an alert, not retried', async () => {
  const w = world({ respond: (call) => (call.method === 'sendPhoto' ? tgError(400, 'Bad Request: chat not found') : null) });
  w.drop(OPEN());
  await w.pub.tick();
  assert.equal(w.calls.filter((c) => c.method === 'sendPhoto').length, 1);
  assert.match(w.calls[1].params.text, /chat not found/);
  assert.deepEqual(w.outbox(), []);
});

test('network failures keep the event and retry, up to the limit', async () => {
  const w = world({ config: { max_attempts: 2 }, respond: (call) => (call.method === 'sendPhoto' ? new TypeError('fetch failed') : null) });
  w.drop(OPEN());
  for (let i = 0; i < 3; i++) { await w.pub.tick(); w.advance(10 * 60000); }
  assert.equal(w.calls.filter((c) => c.method === 'sendPhoto').length, 3);
  assert.deepEqual(w.outbox(), []);
  assert.match(w.calls.at(-1).params.text, /Telegram kept failing/);
});

test('weekly results list every trade closed that week, with the net R, open and cancelled noted', async () => {
  const w = world();
  w.drop(OPEN({ id: 'A' })); await w.pub.tick();
  w.drop(UPD('tp', { id: 'A', time: '2026-09-28T16:00:00Z' })); await w.pub.tick();
  w.drop(OPEN({ id: 'B', side: 'sell', sl: 3757.5, tp: [3712.5], time: '2026-09-29T09:00:00Z' })); await w.pub.tick();
  w.drop(UPD('sl', { id: 'B', time: '2026-09-29T11:00:00Z' })); await w.pub.tick();
  w.drop(OPEN({ id: 'C', time: '2026-09-30T09:00:00Z', order: 'limit' })); await w.pub.tick();
  w.drop(UPD('cancelled', { id: 'C', time: '2026-09-30T12:00:00Z' })); await w.pub.tick();
  w.drop(OPEN({ id: 'D', time: '2026-10-01T09:00:00Z' })); await w.pub.tick();
  const posted = await w.pub.postWeekly('2026-W40', { live: false });
  assert.equal(posted, true);
  const c = w.calls.at(-1);
  assert.equal(c.method, 'sendPhoto');
  assert.equal(c.params.chat_id, '-100111');
  for (const s of ['📊 <b>WEEKLY RESULTS · 28 Sep – 2 Oct 2026</b>', 'Trades: 2', 'Wins: 1 · Losses: 1', 'Net: <b>+1.0R</b>',
    'Every trade from the week is on the card, wins and losses.', '1 trade still open', '1 order cancelled before entry.']) {
    assert.ok(c.params.caption.includes(s), `caption is missing: ${s}`);
  }
  const res = w.drawn.results.at(-1);
  assert.deepEqual([res.title, res.dates], ['Week 40', '28 Sep – 2 Oct 2026']);
  assert.deepEqual(res.trades, [{ day: 'MON', market: 'XAUUSD', side: 'buy', r: 2 }, { day: 'TUE', market: 'XAUUSD', side: 'sell', r: -1 }]);
});

test('weekly results go out by themselves once, on the configured day and time', async () => {
  const w = world({ config: { mode: 'live', strategies: { QT1: { live: true } }, weekly: { day: 'sat', time: '09:00' } } });
  w.drop(OPEN()); await w.pub.tick();
  w.drop(UPD('tp')); await w.pub.tick();
  const before = w.calls.length;
  w.clock.t = new Date('2026-10-03T07:30:00Z'); // Sat 08:30 BST: not yet
  await w.pub.tick();
  assert.equal(w.calls.length, before);
  w.clock.t = new Date('2026-10-03T08:05:00Z'); // Sat 09:05 BST
  await w.pub.tick();
  assert.equal(w.calls.length, before + 1);
  assert.equal(w.calls.at(-1).params.chat_id, '-100222');
  assert.equal(w.calls.at(-1).params.message_thread_id, '5');
  w.advance(3600000); await w.pub.tick();
  assert.equal(w.calls.length, before + 1, 'posted only once');
});

test('the ledger records every post and shows if a line was edited later', async () => {
  const w = world();
  w.drop(OPEN()); await w.pub.tick();
  w.drop(UPD('tp')); await w.pub.tick();
  const file = w.store.ledgerFile;
  assert.deepEqual(verifyLedger(file), { ok: true, entries: 2 });
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
  lines[1] = lines[1].replace('"r":2', '"r":3');
  fs.writeFileSync(file, lines.join('\n') + '\n');
  assert.deepEqual(verifyLedger(file), { ok: false, line: 2, reason: 'contents were changed after writing' });
});

test('the bot token never shows up in logs, alerts or error files', async () => {
  const w = world({ respond: (call) => (call.method === 'sendPhoto' ? tgError(401, 'Unauthorized') : null) });
  w.drop(OPEN());
  await w.pub.tick();
  const errFiles = w.listDir('failed').filter((f) => f.endsWith('.error.txt')).map((f) => fs.readFileSync(path.join(w.cfg.data_dir, 'failed', f), 'utf8'));
  const everything = [...w.logs, ...errFiles, ...w.calls.map((c) => JSON.stringify(c.params))].join('\n');
  assert.ok(!everything.includes(TOKEN) && !everything.includes(TOKEN.split(':')[1]));
  assert.throws(() => createTelegram({ token: 'nope' }), /TELEGRAM_BOT_TOKEN is missing or malformed/);
});

test('event checks and R maths', () => {
  assert.equal(validateEvent(OPEN()), null);
  assert.equal(validateEvent(OPEN({ tp: [3772.5, 3760] })), 'the second tp must be further from entry than the first');
  assert.equal(validateEvent({ ...OPEN(), time: 'yesterday' }), 'time must be an ISO 8601 timestamp, like 2026-09-28T13:30:00Z');
  assert.equal(validateEvent(UPD('closed')), 'closed needs price or r');
  const sig = { side: 'buy', entry: 100, sl: 90, tp: [120, 130], currentSl: 100 };
  assert.equal(closeR(sig, { event: 'tp' }), 2);
  assert.equal(closeR(sig, { event: 'tp2' }), 3);
  assert.equal(closeR(sig, { event: 'sl' }), 0);
  assert.equal(closeR(sig, { event: 'closed', price: 112.5 }), 1.25);
  assert.equal(closeR({ ...sig, side: 'sell', sl: 110, tp: [80], currentSl: 110 }, { event: 'sl', price: 111 }), -1.1);
});

test('week keys and labels', () => {
  assert.equal(isoWeek('2026-09-21'), '2026-W39');
  assert.equal(isoWeek('2027-01-01'), '2026-W53');
  assert.equal(reportWeek('2026-10-03'), '2026-W40');
  assert.equal(reportWeek('2026-10-05'), '2026-W40');
  assert.deepEqual(weekLabel('2026-W39'), { title: 'Week 39', dates: '21 – 25 Sep 2026' });
  assert.deepEqual(weekLabel('2026-W53'), { title: 'Week 53', dates: '28 Dec 2026 – 1 Jan 2027' });
});
