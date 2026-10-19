// TCP Quant Terminal: the Playbook, on the Worker.
//
// Lewis's setups, logged before the result and followed to the end automatically.
//   GET  /api/playbook            the setups and the record, for members
//   POST /api/playbook            log a setup (posters only): checked against the live price,
//                                 kept with the engine's read of the market, posted to Telegram
//   POST /api/playbook/<n>        breakeven, move the stop, close now, or cancel an unfilled order
//   GET  /api/playbook/<n>/photo  a setup's chart, through the Worker (Telegram's file link holds the token)
//   POST /api/playbook/export     the whole record as JSON lines, sent to the poster by the bot
//   scheduled()                   every 5 minutes: fills, targets and stops from one-minute bars
//
// Storage is Cloudflare D1 (binding DB); the tables are made on first use. Nothing is edited
// or deleted: a setup's plan is fixed when it's logged, and everything that happens to it is
// added to a chained record (each entry holds the hash of the one before), so a later edit
// shows. Every post carries the start of its entry's hash.
//
// Settings, in the Worker's environment:
//   DB                  the D1 database
//   POSTER_IDS          Telegram user ids that may log and manage setups, comma separated
//   PLAYBOOK_MODE       "live" posts to the Inner Circle and counts in the record. Anything else,
//                       the default, is a test: posted to the team group, left out of the record
//   PLAYBOOK_THREAD_ID  optional: the Inner Circle topic for setups and their results
//   PLAYBOOK_TAGS       optional: the reasons to suggest, comma separated
import { MARKETS, marketOpen, marketStatus, sessionClock, nyHour, nyOffset, tradeOdds, fmtNum, fmtDuration } from './lib.js';
import {
  checkPlan, openSetup, advanceSetup, expireIfDue, closeSetup, moveSetupStop, cancelSetup,
  isActive, noEdgeOdds, recordStats, recordLine, fmtR, PLAYBOOK,
} from './playbook-lib.js';

// telegram(env, method, payload) and upload(env, method, fields, field, blob, filename) call the
// Bot API; loadMarket(env, symbol, at) is the terminal's market data; minuteBars(env, symbol,
// from, to) gives { bars, step }, one-minute bars (or 15-minute ones over long gaps).
export function createPlaybook({ telegram, upload, loadMarket, minuteBars }) {
  const SCHEMA = [
    `CREATE TABLE IF NOT EXISTS setups (
      n INTEGER PRIMARY KEY, created INTEGER NOT NULL, author_id INTEGER NOT NULL, author TEXT NOT NULL,
      symbol TEXT NOT NULL, side TEXT NOT NULL, kind TEXT NOT NULL, entry REAL NOT NULL, sl REAL NOT NULL,
      tp REAL NOT NULL, stop REAL NOT NULL, expires INTEGER, tags TEXT NOT NULL, note TEXT NOT NULL,
      context TEXT NOT NULL, status TEXT NOT NULL, filled INTEGER, fill REAL, closed INTEGER, exit REAL,
      r REAL, reason TEXT, checked INTEGER NOT NULL, test INTEGER NOT NULL, ref TEXT, photo TEXT,
      chat TEXT, thread INTEGER, message INTEGER)`,
    'CREATE INDEX IF NOT EXISTS setups_status ON setups (status)',
    `CREATE TABLE IF NOT EXISTS record (
      i INTEGER PRIMARY KEY, prev TEXT NOT NULL UNIQUE, hash TEXT NOT NULL, setup INTEGER NOT NULL,
      at INTEGER NOT NULL, type TEXT NOT NULL, body TEXT NOT NULL)`,
  ];
  const GENESIS = '0'.repeat(64);
  // Seconds between checks of a market's open setups. Gold's prices cost one of Twelve Data's
  // 800 free requests a day, shared with the terminal's own; Bitcoin's exchanges are free.
  const GAP = { XAUUSD: 870, BTCUSD: 240 };
  const MAX_PHOTO = 5e6;
  const TAGS = ['H4 zone', 'Fib pocket', 'Liquidity sweep', 'Rejection', 'Structure break', 'Reclaim', 'Session open', 'News'];
  const VIEW_TTL = 15;
  const ready = new WeakSet();
  const views = new Map(); // 'poster' | 'member' -> { at, body }

  const reply = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  const refuse = (message, field, status = 400) => reply({ error: 'invalid', message, field }, status);
  const liveMode = (env) => env.PLAYBOOK_MODE === 'live';
  const posterIds = (env) => String(env.POSTER_IDS || '').split(/[\s,]+/).filter(Boolean).map(Number);
  const nameOf = (user) => [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'TCP';

  async function prepare(env) {
    if (ready.has(env.DB)) return;
    await env.DB.batch(SCHEMA.map((sql) => env.DB.prepare(sql)));
    ready.add(env.DB);
  }

  // ---------------------------------------------------------------- storage
  const engineOf = (c) => ({ sessions: c.sessions || [], vol: c.vol ?? null, trend: c.trend ?? null, noEdge: c.noEdge ?? null, hours: c.hours ?? null });

  function fromRow(row) {
    const context = JSON.parse(row.context || '{}');
    return {
      n: row.n, created: row.created, authorId: row.author_id, author: row.author,
      symbol: row.symbol, side: row.side, kind: row.kind, entry: row.entry, sl: row.sl, tp: row.tp, stop: row.stop,
      expires: row.expires, tags: JSON.parse(row.tags || '[]'), note: row.note, context,
      status: row.status, filled: row.filled, fill: row.fill, closed: row.closed, exit: row.exit, r: row.r, reason: row.reason,
      checked: row.checked, test: !!row.test, ref: row.ref, photo: row.photo, chat: row.chat, thread: row.thread, message: row.message,
      engine: engineOf(context),
    };
  }

  // What members see of a setup: no Telegram ids.
  const shown = (s) => ({
    n: s.n, symbol: s.symbol, side: s.side, kind: s.kind, entry: s.entry, sl: s.sl, tp: s.tp, stop: s.stop,
    created: s.created, expires: s.expires, tags: s.tags, note: s.note, author: s.author, photo: !!s.photo,
    status: s.status, filled: s.filled, fill: s.fill, closed: s.closed, exit: s.exit, r: s.r, reason: s.reason,
    ref: s.ref, test: s.test, engine: s.engine,
  });

  const everySetup = async (env) => (await env.DB.prepare('SELECT * FROM setups ORDER BY n DESC').all()).results.map(fromRow);
  const recordSetups = async (env) => (await everySetup(env)).filter((s) => !s.test);

  // Saves what changed, only if nobody else changed the setup since it was read (the check
  // every 5 minutes and a tap on Close could otherwise both post the same result).
  async function save(env, before, after) {
    const res = await env.DB.prepare(
      `UPDATE setups SET stop = ?, status = ?, filled = ?, fill = ?, closed = ?, exit = ?, r = ?, reason = ?, checked = ?
       WHERE n = ? AND status = ? AND checked = ? AND stop = ?`,
    ).bind(after.stop, after.status, after.filled ?? null, after.fill ?? null, after.closed ?? null, after.exit ?? null,
      after.r ?? null, after.reason ?? null, after.checked, before.n, before.status, before.checked, before.stop).run();
    views.clear();
    return res.meta.changes === 1;
  }

  async function sha256(text) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Adds an entry to the record. Each entry names the hash before it, and no two entries may
  // name the same one, so two writers at once can't fork the chain: the later one tries again.
  async function append(env, n, event) {
    const body = JSON.stringify({ setup: n, ...event });
    for (let attempt = 0; attempt < 5; attempt++) {
      const head = await env.DB.prepare('SELECT hash FROM record ORDER BY i DESC LIMIT 1').first();
      const prev = head ? head.hash : GENESIS;
      const hash = await sha256(`${prev}\n${body}`);
      try {
        await env.DB.prepare('INSERT INTO record (prev, hash, setup, at, type, body) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(prev, hash, n, event.at, event.type, body).run();
        return hash;
      } catch (err) {
        if (!/UNIQUE/i.test(String(err && err.message))) throw err;
      }
    }
    throw new Error('the record is busy');
  }

  // Walks the whole record: every entry must name the hash before it and hash to its own.
  async function verify(rows) {
    let prev = GENESIS;
    for (const row of rows) {
      if (row.prev !== prev || (await sha256(`${row.prev}\n${row.body}`)) !== row.hash) return { intact: false, brokenAt: row.i };
      prev = row.hash;
    }
    return { intact: true, head: rows.length ? prev : null };
  }

  // ------------------------------------------------------------------ posts
  const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const hashtag = (tag) => '#' + tag.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '');
  const priceOf = (s, v) => fmtNum(v, MARKETS[s.symbol].digits);
  const orderName = (s) => s.side.toUpperCase() + (s.kind === 'market' ? '' : ` ${s.kind.toUpperCase()}`);

  function setupText(s, stats) {
    const rr = Math.abs(s.tp - s.entry) / Math.abs(s.entry - s.sl);
    const f = (v) => priceOf(s, v);
    return [
      s.test ? '🧪 <b>TEST</b> · only the team sees this\n' : null,
      `👑 <b>PLAYBOOK #${s.n}</b> · ${s.symbol} <b>${orderName(s)}</b>`,
      `<pre>Entry   ${f(s.entry)}\nStop    ${f(s.sl)}\nTarget  ${f(s.tp)}  ${fmtNum(rr, 1)}R</pre>`,
      `<b>Why:</b> ${esc(s.note)}`,
      s.tags.length ? s.tags.map(hashtag).join(' ') : null,
      '',
      `No-edge odds for this stop and target: <b>${Math.round(noEdgeOdds(s) * 100)}%</b>`,
      s.kind === 'market' ? null : `The order waits ${fmtDuration(s.expires - s.created)} for its price.`,
      stats ? recordLine(stats) : null,
      `<i>Logged before the result · ref ${s.ref} · not financial advice</i>`,
    ].filter((line) => line !== null).join('\n');
  }

  function eventText(s, e, stats) {
    const f = (v) => priceOf(s, v);
    const test = s.test ? '🧪 ' : '';
    if (e.type === 'filled') return `${test}▶️ <b>#${s.n} FILLED</b> at ${f(e.price)}`;
    if (e.type === 'expired') return `${test}⌛ <b>#${s.n} EXPIRED</b>: the price never came, so it doesn't count`;
    if (e.type === 'cancelled') return `${test}✖️ <b>#${s.n} CANCELLED</b> before it filled`;
    if (e.type === 'stop') return `${test}🛡 <b>#${s.n} STOP MOVED</b> to ${f(e.price)}${e.price === s.fill ? ' (breakeven)' : ''}`;
    const head = e.type === 'tp' ? '✅ TARGET HIT'
      : e.type === 'manual' ? '✋ CLOSED'
        : e.r > PLAYBOOK.scratch ? '🔒 STOPPED IN PROFIT'
          : e.r < -PLAYBOOK.scratch ? '❌ STOPPED OUT' : '➖ OUT AT BREAKEVEN';
    return [
      `${test}${head} · <b>#${s.n} ${fmtR(e.r)}</b>`,
      `${s.symbol} ${orderName(s)} · in ${f(s.fill)} · out ${f(e.price)} · ${fmtDuration(e.at - s.filled)}`,
      stats ? recordLine(stats) : null,
    ].filter(Boolean).join('\n');
  }

  const largest = (photos) => (Array.isArray(photos) && photos.length ? photos[photos.length - 1].file_id : null);

  // Posts a new setup: tests to the team group, live setups to the Inner Circle (in the
  // Playbook's topic, if set), with the chart as the photo when there is one.
  async function announce(env, s, text, photo) {
    const chat = s.test ? env.ADMIN_CHAT_ID : env.INNER_CIRCLE_CHAT_ID;
    const thread = s.test ? null : Number(env.PLAYBOOK_THREAD_ID) || null;
    if (!chat) return { error: `${s.test ? 'ADMIN_CHAT_ID' : 'INNER_CIRCLE_CHAT_ID'} is not set` };
    const where = { chat_id: chat, ...(thread ? { message_thread_id: thread } : {}) };
    let fileId = null;
    if (photo) {
      const captioned = text.length <= 1024;
      const pic = await upload(env, 'sendPhoto', captioned ? { ...where, caption: text, parse_mode: 'HTML' } : where, 'photo', photo, 'chart.jpg');
      if (pic.ok) {
        fileId = largest(pic.result.photo);
        if (captioned) return { chat: String(chat), thread, message: pic.result.message_id, photo: fileId };
      }
    }
    const res = await telegram(env, 'sendMessage', { ...where, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
    if (!res.ok) return { error: res.description || 'Telegram refused the post', photo: fileId };
    return { chat: String(chat), thread, message: res.result.message_id, photo: fileId };
  }

  // Adds what happened to the record and replies to the setup's post with each step.
  async function publish(env, s, events) {
    const closing = events.some((e) => e.r != null);
    const stats = closing && !s.test ? recordStats(await recordSetups(env)) : null;
    for (const e of events) {
      await append(env, s.n, e);
      if (!s.chat) continue;
      await telegram(env, 'sendMessage', {
        chat_id: s.chat, text: eventText(s, e, e.r != null ? stats : null), parse_mode: 'HTML',
        ...(s.thread ? { message_thread_id: s.thread } : {}),
        ...(s.message ? { reply_parameters: { message_id: s.message, allow_sending_without_reply: true } } : {}),
      });
    }
  }

  // ---------------------------------------------------------------- context
  // The engine's read of the market when the setup was logged: what TCP AI will learn from.
  function contextOf(plan, m, at) {
    const round = (v, d) => (Number.isFinite(v) ? Math.round(v * 10 ** d) / 10 ** d : null);
    const hourVar = m.engine && m.engine.profile ? m.engine.profile.reduce((a, b) => a + b, 0) / 24 : 0;
    const odds = tradeOdds(plan.entry, plan.sl, plan.tp, hourVar);
    const state = m.engine && m.engine.state;
    const levels = (m.levels || [])
      .filter((l) => !l.id.startsWith('round'))
      .map((l) => ({ id: l.id, price: l.price, atr: m.atr ? round((l.price - plan.entry) / m.atr, 2) : null }))
      .sort((a, b) => Math.abs(a.price - plan.entry) - Math.abs(b.price - plan.entry))
      .slice(0, 4);
    return {
      price: m.price,
      atr: round(m.atr, MARKETS[plan.symbol].digits),
      noEdge: round(noEdgeOdds(plan), 3),
      hours: odds && odds.hours != null ? round(odds.hours, 1) : null,
      vol: state ? round(state.volRank, 2) : null,
      trend: state ? round(state.efficiency, 2) : null,
      momentum: state ? { h1: round(state.momentum.h1, 2), h4: round(state.momentum.h4, 2), h24: round(state.momentum.h24, 2) } : null,
      dayRange: round(m.rangePct, 0),
      sessions: sessionClock(at).filter((x) => x.open).map((x) => x.id),
      nyHour: nyHour(at),
      weekday: new Date((at + nyOffset(at)) * 1000).getUTCDay(),
      levels,
      source: m.source,
    };
  }

  // ------------------------------------------------------------------ routes
  async function view(env, poster, at) {
    const key = poster ? 'poster' : 'member';
    const hit = views.get(key);
    if (hit && at - hit.at < VIEW_TTL) return hit.body;
    const all = await everySetup(env);
    const record = all.filter((s) => !s.test);
    const chain = await env.DB.prepare('SELECT COUNT(*) AS entries, (SELECT hash FROM record ORDER BY i DESC LIMIT 1) AS head FROM record').first();
    // The reasons to suggest: the set ones first, then the ones used most.
    const used = new Map();
    for (const s of all) for (const t of s.tags) used.set(t.toLowerCase(), { tag: t, n: (used.get(t.toLowerCase())?.n || 0) + 1 });
    const set = (env.PLAYBOOK_TAGS ? String(env.PLAYBOOK_TAGS).split(',') : TAGS).map((t) => t.trim()).filter(Boolean);
    const suggested = [...set, ...[...used.values()].sort((a, b) => b.n - a.n).map((u) => u.tag)];
    const tags = suggested.filter((t, i) => suggested.findIndex((u) => u.toLowerCase() === t.toLowerCase()) === i).slice(0, 16);
    const body = {
      ready: true, mode: liveMode(env) ? 'live' : 'test', canPost: poster, stats: recordStats(record),
      setups: (poster ? all : record).slice(0, 200).map(shown), tags,
      record: { entries: chain.entries, head: chain.head ? chain.head.slice(0, 8) : null },
    };
    views.set(key, { at, body });
    return body;
  }

  async function readSetupForm(request) {
    const type = request.headers.get('content-type') || '';
    if (!type.startsWith('multipart/form-data')) return { input: await request.json().catch(() => null), photo: null };
    const form = await request.formData().catch(() => null);
    if (!form) return { input: null, photo: null };
    let input = null;
    try { input = JSON.parse(form.get('setup')); } catch { input = null; }
    const file = form.get('photo');
    return { input, photo: file && typeof file === 'object' && file.size ? file : null };
  }

  async function isPicture(photo) {
    const b = new Uint8Array(await photo.slice(0, 12).arrayBuffer());
    const jpeg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    const png = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
    const webp = String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP';
    return jpeg || png || webp;
  }

  async function create(request, env, user, at) {
    const { input, photo } = await readSetupForm(request);
    if (!input || typeof input !== 'object') return refuse('Send the setup.');
    if (photo && photo.size > MAX_PHOTO) return refuse('The chart picture is too big: 5 MB at most.', 'photo');
    if (photo && !(await isPicture(photo))) return refuse('The chart has to be a JPEG, PNG or WebP picture.', 'photo');
    if (!MARKETS[input.symbol]) return refuse('Pick gold or Bitcoin.', 'symbol');
    let m;
    try {
      m = await loadMarket(env, input.symbol, at);
    } catch {
      return reply({ error: 'unavailable', message: "Prices are unavailable, so the setup can't be checked. Try again in a minute." }, 503);
    }
    const checked = checkPlan(input, { price: m.price, atr: m.atr, open: marketStatus(MARKETS[input.symbol], at).open });
    if (checked.error) return refuse(checked.error, checked.field);
    const s = { ...openSetup(checked.plan, at), author: nameOf(user), context: contextOf(checked.plan, m, at), test: !liveMode(env) };
    const before = s.test ? null : recordStats(await recordSetups(env));
    const row = await env.DB.prepare(
      `INSERT INTO setups (created, author_id, author, symbol, side, kind, entry, sl, tp, stop, expires, tags, note, context,
         status, filled, fill, checked, test) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING n`,
    ).bind(s.created, user.id, s.author, s.symbol, s.side, s.kind, s.entry, s.sl, s.tp, s.stop, s.expires, JSON.stringify(s.tags),
      s.note, JSON.stringify(s.context), s.status, s.filled, s.fill, s.checked, s.test ? 1 : 0).first();
    s.n = row.n;
    const plan = { symbol: s.symbol, side: s.side, kind: s.kind, entry: s.entry, sl: s.sl, tp: s.tp, expires: s.expires, tags: s.tags, note: s.note };
    s.ref = (await append(env, s.n, { type: 'posted', at, plan, context: s.context, author: s.author, test: s.test })).slice(0, 8);
    await env.DB.prepare('UPDATE setups SET ref = ? WHERE n = ?').bind(s.ref, s.n).run();
    const posted = await announce(env, s, setupText(s, before), photo);
    Object.assign(s, { chat: posted.chat || null, thread: posted.thread || null, message: posted.message || null, photo: posted.photo || null });
    await env.DB.prepare('UPDATE setups SET chat = ?, thread = ?, message = ?, photo = ? WHERE n = ?')
      .bind(s.chat, s.thread, s.message, s.photo, s.n).run();
    views.clear();
    s.engine = engineOf(s.context);
    return reply({ setup: shown(s), ...(posted.error ? { warning: `Logged as #${s.n}, but the post didn't go out: ${posted.error}.` } : {}) });
  }

  const endWord = (s) => (s.status === 'expired' ? 'expired' : s.status === 'cancelled' ? 'been cancelled' : `closed at ${fmtR(s.r)}`);

  async function act(request, env, n, at) {
    const body = await request.json().catch(() => null);
    const action = body && body.action;
    if (!['breakeven', 'stop', 'close', 'cancel'].includes(action)) return refuse('Unknown action.');
    const row = await env.DB.prepare('SELECT * FROM setups WHERE n = ?').bind(n).first();
    if (!row) return reply({ error: 'not_found', message: `There's no setup #${n}.` }, 404);
    const before = fromRow(row);
    if (!isActive(before)) return reply({ error: 'closed', message: `#${n} has already ${endWord(before)}.` }, 409);
    // Catch up with the market first: the target or stop may have come since the last check.
    let got;
    try {
      got = await minuteBars(env, before.symbol, before.checked, at);
    } catch {
      return reply({ error: 'unavailable', message: "Couldn't get a fresh price. Try again in a minute." }, 503);
    }
    let { setup: s, events } = advanceSetup(before, got.bars, at, got.step);
    const take = (result) => {
      s = result.setup;
      events = events.concat(result.events);
    };
    const last = got.bars.length ? got.bars[got.bars.length - 1] : null;
    const price = last && at - last.t <= 600 ? last.c : null; // the latest minute, still forming or not
    const market = MARKETS[s.symbol];
    let message = null;
    let problem = null;
    if (!isActive(s)) {
      message = `#${n} had already ${endWord(s)} before your tap.`;
    } else if (action === 'cancel') {
      if (s.status !== 'pending') problem = "It's filled, so it can't be cancelled: close it instead.";
      else take(cancelSetup(s, at));
    } else if (s.status !== 'open') {
      problem = `#${n} hasn't filled yet: cancel it instead.`;
    } else if (price == null) {
      problem = `${market.name} has no fresh price${marketOpen(at, market) ? '' : ' while it’s closed'}. Try again when it's trading.`;
    } else if (action === 'close') {
      take(closeSetup(s, at, price));
    } else {
      const buy = s.side === 'buy';
      const level = action === 'breakeven' ? s.fill : Math.round(Number(body.price) * 10 ** market.digits) / 10 ** market.digits;
      if (!(level > 0)) problem = 'Enter the new stop.';
      else if (buy ? !(level < price) : !(level > price)) problem = `The price is ${fmtNum(price, market.digits)}: a ${s.side}'s stop has to sit ${buy ? 'below' : 'above'} it.`;
      else if (level === s.stop) problem = 'The stop is already there.';
      else take(moveSetupStop(s, at, level));
    }
    if (events.length) {
      if (!(await save(env, before, s))) return reply({ error: 'busy', message: 'It changed a moment ago. Refresh and try again.' }, 409);
      await publish(env, s, events);
    } else if (s.checked !== before.checked) {
      await save(env, before, s);
    }
    if (problem) return refuse(problem, action === 'stop' ? 'price' : 'action');
    return reply({ setup: shown(s), ...(message ? { message } : {}) });
  }

  async function photoOf(env, n, poster) {
    const row = await env.DB.prepare('SELECT photo, test FROM setups WHERE n = ?').bind(n).first();
    if (!row || !row.photo || (row.test && !poster)) return reply({ error: 'not_found' }, 404);
    const file = await telegram(env, 'getFile', { file_id: row.photo });
    if (!file.ok) return reply({ error: 'unavailable', message: "The chart isn't available right now." }, 502);
    const res = await fetch(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${file.result.file_path}`);
    if (!res.ok) return reply({ error: 'unavailable', message: "The chart isn't available right now." }, 502);
    return new Response(res.body, { headers: { 'content-type': 'image/jpeg', 'cache-control': 'private, max-age=86400' } });
  }

  // The whole record as JSON lines, for TCP AI and for anyone checking the chain: a line
  // about the file, every setup with the engine's read, then every entry of the record.
  async function exportRecord(env, user, at) {
    const setups = (await env.DB.prepare('SELECT * FROM setups ORDER BY n').all()).results.map(fromRow);
    const rows = (await env.DB.prepare('SELECT * FROM record ORDER BY i').all()).results;
    const check = await verify(rows);
    const lines = [
      { type: 'about', exported: new Date(at * 1000).toISOString(), setups: setups.length, entries: rows.length, ...check,
        note: 'R is measured on the planned risk; the record\'s averages take off an assumed spread (' +
          Object.entries(PLAYBOOK.spread).map(([k, v]) => `${k} ${v}`).join(', ') + ').' },
      ...setups.map((s) => {
        const { authorId, chat, thread, message, photo, engine, ...rest } = s;
        return { type: 'setup', ...rest, photo: !!photo };
      }),
      ...rows.map((r) => ({ type: 'entry', i: r.i, prev: r.prev, hash: r.hash, body: JSON.parse(r.body) })),
    ];
    const file = new Blob([lines.map((l) => JSON.stringify(l)).join('\n') + '\n'], { type: 'application/x-ndjson' });
    const day = new Date(at * 1000).toISOString().slice(0, 10);
    const sent = await upload(env, 'sendDocument', {
      chat_id: user.id,
      caption: `The TCP Playbook record: ${setups.length} setups, ${rows.length} entries, ${check.intact ? 'chain intact' : `chain broken at entry ${check.brokenAt}`}.`,
    }, 'document', file, `tcp-playbook-${day}.jsonl`);
    if (!sent.ok) return reply({ error: 'not_sent', message: 'The bot couldn\'t message you. Open @TCPInnerCircleBot, press Start, and try again.' }, 409);
    return reply({ ok: true, setups: setups.length, entries: rows.length, ...check });
  }

  async function api(request, env, path, user, at) {
    if (!env.DB) {
      return request.method === 'GET' && path === '/api/playbook'
        ? reply({ ready: false })
        : reply({ error: 'no_db', message: 'The Playbook needs its database: see terminal/SETUP.md.' }, 503);
    }
    try {
      await prepare(env);
      const poster = posterIds(env).includes(user.id);
      const photo = path.match(/^\/api\/playbook\/(\d+)\/photo$/);
      if (request.method === 'GET' && path === '/api/playbook') return reply(await view(env, poster, at));
      if (request.method === 'GET' && photo) return photoOf(env, Number(photo[1]), poster);
      if (request.method !== 'POST') return reply({ error: 'not_found' }, 404);
      if (!poster) return reply({ error: 'not_poster', message: 'Only Lewis and the people he names can log setups.' }, 403);
      if (path === '/api/playbook') return create(request, env, user, at);
      if (path === '/api/playbook/export') return exportRecord(env, user, at);
      const one = path.match(/^\/api\/playbook\/(\d+)$/);
      if (one) return act(request, env, Number(one[1]), at);
      return reply({ error: 'not_found' }, 404);
    } catch (err) {
      console.error(`playbook ${request.method} ${path} failed: ${err && err.message}`);
      return reply({ error: 'unavailable', message: 'The Playbook is unavailable right now. Try again in a minute.' }, 503);
    }
  }

  // ------------------------------------------------------------- the check
  // True when the market was shut the whole time, so no bars can have come.
  function shutThroughout(market, from, to) {
    if (market.day === 'utc') return false;
    for (let t = from; t <= to; t += 300) if (marketOpen(t, market)) return false;
    return !marketOpen(to, market);
  }

  // Every 5 minutes: walk each market's open setups through the bars since they were last
  // checked, and post what happened. Gold waits GAP seconds between checks.
  async function scheduled(env, at) {
    if (!env.DB) return;
    await prepare(env);
    const active = (await env.DB.prepare("SELECT * FROM setups WHERE status IN ('pending', 'open')").all()).results.map(fromRow);
    for (const symbol of Object.keys(MARKETS)) {
      const list = active.filter((s) => s.symbol === symbol);
      if (!list.length) continue;
      const from = Math.min(...list.map((s) => s.checked));
      if (at - from < GAP[symbol]) continue;
      if (shutThroughout(MARKETS[symbol], from, at)) {
        for (const s of list) {
          const r = expireIfDue(s, at);
          if (r.events.length && (await save(env, s, r.setup))) await publish(env, r.setup, r.events);
        }
        continue;
      }
      let got;
      try {
        got = await minuteBars(env, symbol, from, at);
      } catch (err) {
        console.error(`playbook check ${symbol} failed: ${err.message}`);
        continue;
      }
      for (const s of list) {
        const r = advanceSetup(s, got.bars, at, got.step);
        if (!r.events.length && r.setup.checked === s.checked) continue;
        if ((await save(env, s, r.setup)) && r.events.length) await publish(env, r.setup, r.events);
      }
    }
  }

  return { api, scheduled, reset: () => views.clear() };
}
