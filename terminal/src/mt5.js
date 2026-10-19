// TCP Quant Terminal: MT5 connections and the leaderboard, on the Worker.
//
// A member connects their MT5 account in the app with its investor password, which MT5 makes
// read-only: it can see trades, never place them or move money. The page encrypts it on the phone
// to the TCP bridge's public key (RSA-OAEP, SHA-256) before sending it, so this Worker and its
// database only ever hold ciphertext that the bridge alone can open. The bridge (a Windows PC with
// MT5, see bridge/) collects the links, logs in read-only, works out each trading day's
// closed-trade return from the account's own history, and sends back percentages. No balance is
// sent or kept.
//   GET  /api/mt5              your link (status, name, leaderboard choice), your stats, the bridge's key
//   POST /api/mt5              connect: the account, its server, the encrypted password, a name
//   POST /api/mt5/settings     change your name, or whether you're on the leaderboard
//   POST /api/mt5/disconnect   delete your link and every day recorded for it
//   GET  /api/ranks            the tables: the last full day, this and last week, this and last month
//   POST /api/ranks/hide       take a name off the leaderboard, or put it back (posters)
//   GET  /bridge/links         for the bridge (BRIDGE_TOKEN): the accounts to read
//   POST /bridge/report        for the bridge: one account's trading days, or why it couldn't read it
//
// Settings, in the Worker's environment:
//   BRIDGE_PUBLIC_KEY  the bridge's public key (bridge/make_keys.py writes it); without it, connecting is closed
//   BRIDGE_TOKEN       secret: the bridge's password for /bridge/*
//   DB, POSTER_IDS     as for the Playbook
import { MARKETS, dayKey } from './lib.js';
import {
  RANKS, currentPeriods, periodRange, finishStats, rankTable, viewTable, personalStats, periodStats, inPeriod,
  cleanDay, cleanOpen, cleanNick, cleanAccount,
} from './ranks-lib.js';

// telegram(env, method, payload) calls the Bot API.
export function createMt5({ telegram }) {
  const SCHEMA = [
    `CREATE TABLE IF NOT EXISTS mt5_links (
      member INTEGER PRIMARY KEY, id TEXT NOT NULL UNIQUE, nick TEXT NOT NULL, nick_key TEXT NOT NULL UNIQUE,
      broker TEXT NOT NULL, server TEXT NOT NULL, login TEXT NOT NULL, account_key TEXT NOT NULL UNIQUE,
      secret TEXT NOT NULL, key_id TEXT NOT NULL, public INTEGER NOT NULL, status TEXT NOT NULL, error TEXT, open REAL, since TEXT NOT NULL, created INTEGER NOT NULL, synced INTEGER, told TEXT)`,
    `CREATE TABLE IF NOT EXISTS mt5_days (
      link TEXT NOT NULL, day TEXT NOT NULL, ret REAL NOT NULL, lr REAL NOT NULL, trades INTEGER NOT NULL,
      won INTEGER NOT NULL, lost INTEGER NOT NULL, gw REAL NOT NULL, gl REAL NOT NULL, updated INTEGER NOT NULL,
      PRIMARY KEY (link, day))`,
    'CREATE TABLE IF NOT EXISTS mt5_tries (member INTEGER NOT NULL, day TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (member, day))',
    // Members a poster has taken off the leaderboard. Kept when they disconnect, so reconnecting doesn't undo it.
    'CREATE TABLE IF NOT EXISTS mt5_hidden (member INTEGER PRIMARY KEY, at INTEGER NOT NULL)',
  ];
  // What the bridge can report, and what the member is told (once). Each of these needs the member
  // to reconnect, so the encrypted password is wiped and the bridge stops trying: a broker can lock
  // an account after repeated wrong passwords. 'unreachable' (MT5 or the broker didn't answer) is
  // tried again on the bridge's next run, and nobody is told.
  const FAILURES = {
    login: 'TCP couldn\'t log in to your MT5 account: the account number, server or investor password looks wrong. Reconnect under Account in the terminal.',
    master: 'That was your master (trading) password, so TCP didn\'t use it and hasn\'t kept it. TCP only takes the investor (read-only) password. To be safe, change your master password in MT5, then reconnect under Account with the investor one.',
    demo: 'That\'s a demo account. The leaderboard is for live accounts: reconnect with your live one under Account in the terminal.',
    broker: 'That account isn\'t at PU Prime or Vantage, so it can\'t join the leaderboard.',
    mismatch: 'The account MT5 opened didn\'t match the details you entered. Reconnect under Account in the terminal.',
    key: 'TCP renewed its security key, so it needs your investor password again: reconnect under Account in the terminal.',
    unreachable: null,
  };
  const RANKS_TTL = 60; // seconds members share one copy of the tables
  const ready = new WeakSet();
  const keys = new Map();
  const views = new Map();

  const reply = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  const refuse = (message, field, status = 400) => reply({ error: 'invalid', message, field }, status);
  const today = (at) => dayKey(at, MARKETS.XAUUSD);
  const posterIds = (env) => String(env.POSTER_IDS || '').split(/[\s,]+/).filter(Boolean).map(Number);
  const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  const newId = () => hex(crypto.getRandomValues(new Uint8Array(16)));
  const unique = (err) => /UNIQUE|constraint/i.test(String(err && err.message));
  const tell = (env, chat, text) =>
    Promise.resolve().then(() => telegram(env, 'sendMessage', { chat_id: chat, text })).catch((err) => console.error(`mt5 message failed: ${err.message}`));

  async function prepare(env) {
    if (ready.has(env.DB)) return;
    await env.DB.batch(SCHEMA.map((sql) => env.DB.prepare(sql)));
    ready.add(env.DB);
  }

  function sameText(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  // The bridge's public key (base64 SPKI, or PEM), its size and a short id: the first 16 hex digits
  // of the SHA-256 of the key, which the bridge prints too, so the two can be checked against each other.
  async function keyInfo(env) {
    const text = String(env.BRIDGE_PUBLIC_KEY || '').replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '');
    if (!text) return null;
    if (keys.has(text)) return keys.get(text);
    let info = null;
    try {
      const der = Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
      const key = await crypto.subtle.importKey('spki', der, { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['encrypt']);
      const bits = key.algorithm.modulusLength;
      if (bits < 2048) throw new Error(`a ${bits}-bit key is too short`);
      info = { spki: text, bytes: bits / 8, id: hex(await crypto.subtle.digest('SHA-256', der)).slice(0, 16) };
    } catch (err) {
      console.error(`BRIDGE_PUBLIC_KEY can't be used: ${err.message}`);
    }
    keys.set(text, info);
    return info;
  }

  const HIDDEN = 'EXISTS (SELECT 1 FROM mt5_hidden h WHERE h.member = l.member)';
  const linkOf = (env, member) => env.DB.prepare(`SELECT l.*, ${HIDDEN} AS hidden FROM mt5_links l WHERE l.member = ?`).bind(member).first();
  const daysOf = async (env, link) =>
    (await env.DB.prepare('SELECT day, ret, trades, won, lost, gw, gl FROM mt5_days WHERE link = ? ORDER BY day').bind(link).all()).results;

  // What a member sees of their own link: never the password's ciphertext, and only the end of the login.
  const shown = (l) => ({
    nick: l.nick, broker: l.broker, brokerName: RANKS.brokers[l.broker], server: l.server, login: `••••${String(l.login).slice(-4)}`,
    public: !!l.public, hidden: !!l.hidden, status: l.status, open: l.open ?? null, since: l.since, synced: l.synced ?? null,
    error: !l.error ? null : FAILURES[l.error] || 'TCP couldn\'t reach your account on its last run: it tries again on the next one.',
  });

  // ------------------------------------------------------------ member routes
  async function mine(env, user, at) {
    const key = await keyInfo(env);
    const base = { ready: true, open: !!key, key: key && key.spki, keyId: key && key.id, tries: RANKS.tries };
    const l = await linkOf(env, user.id);
    if (!l) return reply({ ...base, link: null });
    const days = await daysOf(env, l.id);
    const p = currentPeriods(today(at));
    const periods = Object.fromEntries(Object.keys(RANKS.periods).map((k) => [k, { key: p[k], ...periodStats(inPeriod(days, k, p[k])) }]));
    return reply({ ...base, link: shown(l), stats: personalStats(days), periods });
  }

  async function connect(request, env, user, at) {
    const key = await keyInfo(env);
    if (!key) return reply({ error: 'closed', message: 'Connecting MT5 opens soon.' }, 503);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return refuse('Send the account.');
    if (body.consent !== true) return refuse('Tick the box to confirm it\'s your investor (read-only) password.', 'consent');
    const account = cleanAccount(body);
    if (account.error) return refuse(account.error, account.field);
    const nick = cleanNick(body.nick);
    if (!nick) return refuse('Pick a name for the leaderboard: 2 to 20 letters or numbers, and not one that looks like TCP\'s own.', 'nick');
    if (body.keyId !== key.id) return refuse('TCP\'s security key changed while the page was open. Reload the terminal and try again.', 'password', 409);
    const secret = typeof body.secret === 'string' ? body.secret : '';
    let size = 0;
    try {
      if (/^[A-Za-z0-9+/]+={0,2}$/.test(secret)) size = atob(secret).length;
    } catch { /* not base64 */ }
    if (size !== key.bytes) return refuse('The password didn\'t arrive encrypted. Reload the terminal and try again.', 'password');

    const day = today(at);
    const tries = await env.DB.prepare('SELECT n FROM mt5_tries WHERE member = ? AND day = ?').bind(user.id, day).first();
    if (tries && tries.n >= RANKS.tries) {
      return reply({ error: 'too_many', message: `That's ${RANKS.tries} tries today. Each one is a login at your broker, and too many can lock the account: try again tomorrow.` }, 429);
    }
    // Clashes with other members. A link that failed doesn't hold its account: whoever connects it next takes it over.
    const accountKey = `${account.broker}:${account.login}`;
    const clash = (await env.DB.prepare('SELECT account_key, nick_key, status FROM mt5_links WHERE (account_key = ? OR nick_key = ?) AND member != ?')
      .bind(accountKey, nick.toLowerCase(), user.id).all()).results;
    if (clash.some((r) => r.account_key === accountKey && r.status !== 'failed')) return refuse('That account is already connected by another member.', 'login', 409);
    if (clash.some((r) => r.nick_key === nick.toLowerCase())) return refuse('That name is taken: pick another.', 'nick', 409);

    const old = await linkOf(env, user.id);
    const hidden = old ? old.hidden : (await env.DB.prepare('SELECT 1 AS x FROM mt5_hidden WHERE member = ?').bind(user.id).first()) ? 1 : 0;
    const isPublic = body.public === false ? 0 : 1;
    const statements = [
      env.DB.prepare("DELETE FROM mt5_days WHERE link IN (SELECT id FROM mt5_links WHERE account_key = ? AND status = 'failed' AND member != ?)").bind(accountKey, user.id),
      env.DB.prepare("DELETE FROM mt5_links WHERE account_key = ? AND status = 'failed' AND member != ?").bind(accountKey, user.id),
    ];
    let link;
    if (old && old.account_key === accountKey) {
      // The same account again (a new investor password, say): its days and start date stay.
      link = { ...old, nick, server: account.server, public: isPublic, status: 'pending', error: null };
      statements.push(env.DB.prepare(
        "UPDATE mt5_links SET nick = ?, nick_key = ?, server = ?, secret = ?, key_id = ?, public = ?, status = 'pending', error = NULL, told = NULL WHERE member = ?",
      ).bind(nick, nick.toLowerCase(), account.server, secret, key.id, isPublic, user.id));
    } else {
      // A different account starts again from today.
      link = {
        member: user.id, id: newId(), nick, broker: account.broker, server: account.server, login: account.login,
        public: isPublic, hidden, status: 'pending', error: null, open: null, since: day, synced: null,
      };
      if (old) statements.push(env.DB.prepare('DELETE FROM mt5_days WHERE link = ?').bind(old.id), env.DB.prepare('DELETE FROM mt5_links WHERE member = ?').bind(user.id));
      statements.push(env.DB.prepare(
        `INSERT INTO mt5_links (member, id, nick, nick_key, broker, server, login, account_key, secret, key_id, public, status, since, created)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      ).bind(user.id, link.id, nick, nick.toLowerCase(), account.broker, account.server, account.login, accountKey, secret, key.id, isPublic, day, at));
    }
    statements.push(env.DB.prepare('INSERT INTO mt5_tries (member, day, n) VALUES (?, ?, 1) ON CONFLICT (member, day) DO UPDATE SET n = n + 1').bind(user.id, day));
    try {
      await env.DB.batch(statements);
    } catch (err) {
      if (unique(err)) return refuse('That account or name was taken a moment ago. Try again.', 'login', 409);
      throw err;
    }
    views.clear();
    return reply({ link: shown(link) });
  }

  async function settings(request, env, user) {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return refuse('Nothing to change.');
    const l = await linkOf(env, user.id);
    if (!l) return reply({ error: 'not_connected', message: 'Connect your MT5 account first.' }, 404);
    let { nick } = l;
    if (body.nick !== undefined) {
      nick = cleanNick(body.nick);
      if (!nick) return refuse('Pick a name for the leaderboard: 2 to 20 letters or numbers, and not one that looks like TCP\'s own.', 'nick');
    }
    const isPublic = typeof body.public === 'boolean' ? (body.public ? 1 : 0) : l.public;
    if (isPublic && l.hidden) return refuse('TCP has taken you off the leaderboard. Ask the team if you think that\'s wrong.', 'public', 403);
    try {
      await env.DB.prepare('UPDATE mt5_links SET nick = ?, nick_key = ?, public = ? WHERE member = ?').bind(nick, nick.toLowerCase(), isPublic, user.id).run();
    } catch (err) {
      if (unique(err)) return refuse('That name is taken: pick another.', 'nick', 409);
      throw err;
    }
    views.clear();
    return reply({ link: shown({ ...l, nick, public: isPublic }) });
  }

  async function disconnect(env, user) {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM mt5_days WHERE link IN (SELECT id FROM mt5_links WHERE member = ?)').bind(user.id),
      env.DB.prepare('DELETE FROM mt5_links WHERE member = ?').bind(user.id),
    ]);
    views.clear();
    return reply({ ok: true });
  }

  async function hide(request, env, user, at) {
    if (!posterIds(env).includes(user.id)) return reply({ error: 'not_poster', message: 'Only TCP\'s posters can take names off the leaderboard.' }, 403);
    const body = await request.json().catch(() => null);
    const name = body && typeof body.nick === 'string' ? body.nick.replace(/\s+/g, ' ').trim().toLowerCase() : '';
    const l = name && await env.DB.prepare('SELECT member FROM mt5_links WHERE nick_key = ?').bind(name).first();
    if (!l) return reply({ error: 'not_found', message: 'No trader has that name.' }, 404);
    const hidden = !(body && body.hidden === false);
    await env.DB.batch(hidden
      ? [env.DB.prepare('INSERT OR IGNORE INTO mt5_hidden (member, at) VALUES (?, ?)').bind(l.member, at), env.DB.prepare('UPDATE mt5_links SET public = 0 WHERE member = ?').bind(l.member)]
      : [env.DB.prepare('DELETE FROM mt5_hidden WHERE member = ?').bind(l.member)]);
    views.clear();
    return reply({ ok: true, hidden });
  }

  // Each table's sums come from the database, one row per trader: days before a trader connected,
  // private and hidden traders, and links that need reconnecting are left out.
  const TABLE = `SELECT l.member AS id, l.nick, l.open, SUM(d.lr) AS lr, SUM(d.trades) AS trades, SUM(d.won) AS won,
      SUM(d.lost) AS lost, SUM(d.trades > 0) AS days, MAX(CASE WHEN d.trades > 0 THEN d.ret END) AS best,
      MIN(CASE WHEN d.trades > 0 THEN d.ret END) AS worst, SUM(CASE WHEN d.trades > 0 THEN d.lr END) AS tl,
      SUM(CASE WHEN d.trades > 0 THEN d.lr * d.lr END) AS tl2
    FROM mt5_links l JOIN mt5_days d ON d.link = l.id
    WHERE l.public = 1 AND l.status = 'active' AND NOT ${HIDDEN} AND d.day >= l.since AND d.day BETWEEN ? AND ?
    GROUP BY l.member HAVING SUM(d.trades) > 0`;

  async function tables(env, at) {
    const p = currentPeriods(today(at));
    const stamp = JSON.stringify(p);
    const hit = views.get('ranks');
    if (hit && at - hit.at < RANKS_TTL && hit.stamp === stamp) return hit;
    const names = Object.keys(RANKS.periods);
    const results = await env.DB.batch([
      ...names.map((k) => {
        const { from, to } = periodRange(k, p[k]);
        return env.DB.prepare(TABLE).bind(from, to);
      }),
      env.DB.prepare("SELECT COUNT(*) AS n, MAX(synced) AS synced FROM mt5_links WHERE status = 'active'"),
    ]);
    const out = { at, stamp, periods: p, tables: {} };
    names.forEach((k, i) => {
      const rows = results[i].results.map((r) => ({ id: r.id, nick: r.nick, open: r.open ?? null, ...finishStats(r) }));
      out.tables[k] = { ...periodRange(k, p[k]), key: p[k], gain: rankTable(rows), steady: k === 'day' ? null : rankTable(rows, 'score') };
    });
    const summary = results.at(-1).results[0] || {};
    out.connected = summary.n || 0;
    out.synced = summary.synced ?? null;
    views.set('ranks', out);
    return out;
  }

  async function ranks(env, user, at) {
    const key = await keyInfo(env);
    const t = await tables(env, at);
    const out = {};
    for (const [k, table] of Object.entries(t.tables)) {
      const { gain, steady, ...range } = table;
      out[k] = { ...range, ...viewTable(gain, user.id), steady: steady && viewTable(steady, user.id) };
    }
    const canHide = posterIds(env).includes(user.id);
    const hidden = canHide
      ? (await env.DB.prepare(`SELECT l.nick FROM mt5_links l WHERE ${HIDDEN} ORDER BY l.nick_key`).all()).results.map((r) => r.nick)
      : undefined;
    return reply({
      ready: true, open: !!key, canHide, hidden, periods: t.periods, tables: out,
      connected: t.connected, synced: t.synced, top: RANKS.top, steadyDays: RANKS.steady,
    });
  }

  async function api(request, env, path, user, at) {
    if (!env.DB) return request.method === 'GET' ? reply({ ready: false }) : reply({ error: 'no_db', message: 'The leaderboard needs the database: see terminal/SETUP.md.' }, 503);
    try {
      await prepare(env);
      if (request.method === 'GET' && path === '/api/ranks') return await ranks(env, user, at);
      if (request.method === 'GET' && path === '/api/mt5') return await mine(env, user, at);
      if (request.method !== 'POST') return reply({ error: 'not_found' }, 404);
      if (path === '/api/mt5') return await connect(request, env, user, at);
      if (path === '/api/mt5/settings') return await settings(request, env, user);
      if (path === '/api/mt5/disconnect') return await disconnect(env, user);
      if (path === '/api/ranks/hide') return await hide(request, env, user, at);
      return reply({ error: 'not_found' }, 404);
    } catch (err) {
      console.error(`mt5 ${request.method} ${path} failed: ${err && err.message}`);
      return reply({ error: 'unavailable', message: 'The leaderboard is unavailable right now. Try again in a minute.' }, 503);
    }
  }

  // ------------------------------------------------------------- the bridge
  // New connections first, so members hear back quickly; 'last' is the latest day already sent.
  async function links(env) {
    const key = await keyInfo(env);
    const rows = (await env.DB.prepare(
      `SELECT l.id, l.broker, l.server, l.login, l.secret, l.key_id AS keyId, l.since, l.status,
         (SELECT MAX(day) FROM mt5_days d WHERE d.link = l.id) AS last
       FROM mt5_links l WHERE l.status IN ('pending', 'active') ORDER BY l.status = 'active', l.created`,
    ).all()).results;
    return reply({ keyId: key && key.id, links: rows });
  }

  async function report(request, env, at) {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.id !== 'string') return reply({ error: 'invalid', message: 'Send the link\'s id.' }, 400);
    const l = await env.DB.prepare(`SELECT l.id, l.member, l.nick, l.public, l.status, l.told, l.since, ${HIDDEN} AS hidden FROM mt5_links l WHERE l.id = ?`).bind(body.id).first();
    if (!l) return reply({ error: 'not_found', message: 'No such link: the member may have disconnected.' }, 404);
    if (l.status === 'failed') return reply({ error: 'failed', message: 'This link waits for the member to reconnect.' }, 409);

    if (body.ok !== true) {
      const code = Object.hasOwn(FAILURES, body.error) ? body.error : 'unreachable';
      if (!FAILURES[code]) {
        await env.DB.prepare('UPDATE mt5_links SET error = ? WHERE id = ?').bind(code, l.id).run();
        return reply({ ok: true, status: l.status });
      }
      await env.DB.prepare("UPDATE mt5_links SET status = 'failed', error = ?, secret = '', told = ? WHERE id = ?").bind(code, `failed:${code}`, l.id).run();
      if (l.told !== `failed:${code}`) await tell(env, l.member, `⚠️ ${FAILURES[code]}`);
      views.clear();
      return reply({ ok: true, status: 'failed' });
    }

    const sent = Array.isArray(body.days) ? body.days : [];
    if (sent.length > RANKS.reportDays) return reply({ error: 'invalid', message: `Send at most ${RANKS.reportDays} days at a time.` }, 400);
    const limit = today(at + 86400);
    const good = sent.map(cleanDay).filter((d) => d && d.day >= l.since && d.day <= limit);
    const statements = [];
    if (good.length) {
      statements.push(env.DB.prepare(
        `INSERT INTO mt5_days (link, day, ret, lr, trades, won, lost, gw, gl, updated)
         SELECT ?1, json_extract(j.value, '$.day'), json_extract(j.value, '$.ret'), json_extract(j.value, '$.lr'),
           json_extract(j.value, '$.trades'), json_extract(j.value, '$.won'), json_extract(j.value, '$.lost'),
           json_extract(j.value, '$.gw'), json_extract(j.value, '$.gl'), ?3
         FROM json_each(?2) j WHERE true
         ON CONFLICT (link, day) DO UPDATE SET ret = excluded.ret, lr = excluded.lr, trades = excluded.trades, won = excluded.won,
           lost = excluded.lost, gw = excluded.gw, gl = excluded.gl, updated = excluded.updated`,
      ).bind(l.id, JSON.stringify(good), at));
    }
    statements.push(env.DB.prepare("UPDATE mt5_links SET status = 'active', error = NULL, open = ?, synced = ?, told = 'active' WHERE id = ? AND status != 'failed'")
      .bind(cleanOpen(body.open), at, l.id));
    await env.DB.batch(statements);
    if (l.told !== 'active') {
      const board = l.public && !l.hidden ? `, and on the leaderboard as ${l.nick}` : '';
      await tell(env, l.member, `✅ TCP can see your MT5 account now, read-only. Your results show under Account in the terminal${board}. Only percentages are shared, never your balance. Disconnect any time under Account.`);
    }
    views.clear();
    return reply({ ok: true, saved: good.length, skipped: sent.length - good.length });
  }

  async function bridge(request, env, path, at) {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer /, '');
    if (!env.BRIDGE_TOKEN || !sameText(token, env.BRIDGE_TOKEN)) return reply({ error: 'unauthorised' }, 401);
    if (!env.DB) return reply({ error: 'no_db' }, 503);
    try {
      await prepare(env);
      if (request.method === 'GET' && path === '/bridge/links') return await links(env);
      if (request.method === 'POST' && path === '/bridge/report') return await report(request, env, at);
      return reply({ error: 'not_found' }, 404);
    } catch (err) {
      console.error(`bridge ${request.method} ${path} failed: ${err && err.message}`);
      return reply({ error: 'unavailable' }, 503);
    }
  }

  return {
    api, bridge,
    reset: () => {
      views.clear();
      keys.clear();
    },
  };
}
