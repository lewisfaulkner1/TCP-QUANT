// Reads the engine's event files from the outbox, posts each one to Telegram, and remembers
// what it posted. Test mode (the default) posts everything to the test chat; a strategy only
// reaches the members' group when config.mode is "live" AND that strategy has "live": true.
import fs from 'node:fs';
import path from 'node:path';
import { validateEvent, eventKey, closeR, decimalsFor, CLOSING } from './events.js';
import { localParts, isoWeek, weekLabel, reportWeek } from './time.js';
import { signalCaption, updateText, weeklyCaption, esc } from './format.js';

class PublishError extends Error {}
const SIZES = ['square', 'portrait', 'story'];

export function normaliseConfig(c = {}) {
  return {
    mode: c.mode === 'live' ? 'live' : 'test',
    outbox: c.outbox,
    dataDir: c.data_dir,
    display_tz: c.display_tz || 'Europe/London',
    card_size: SIZES.includes(c.card_size) ? c.card_size : 'portrait',
    update_cards: c.update_cards !== false,
    chats: { test: null, test_thread: null, signals: null, signals_thread: null, results: null, results_thread: null, alerts: null, ...(c.chats || {}) },
    strategies: c.strategies || {},
    weekly: { enabled: true, day: 'sat', time: '09:00', ...(c.weekly || {}) },
    instruments: c.instruments || {},
    max_attempts: Number.isInteger(c.max_attempts) ? c.max_attempts : 12,
    orphan_minutes: Number.isFinite(c.orphan_minutes) ? c.orphan_minutes : 30,
  };
}

const defaultLog = (level, msg) => console[level === 'error' ? 'error' : 'log'](`${new Date().toISOString()} ${level.toUpperCase()} ${msg}`);

export function createPublisher({ config, store, telegram, render, log = defaultLog, now = () => new Date() }) {
  const cfg = normaliseConfig(config);
  const retries = new Map(); // file name -> {attempts, at}
  const weeklyRetryAt = new Map();

  const label = (strategy) => cfg.strategies[strategy]?.label || 'Algorithmic signal';

  function route(strategy) {
    const live = cfg.mode === 'live' && cfg.strategies[strategy]?.live === true;
    return live
      ? { live, chat: cfg.chats.signals, thread: cfg.chats.signals_thread }
      : { live, chat: cfg.chats.test, thread: cfg.chats.test_thread };
  }

  // The Card Studio card shape (tools/card-studio/cards.cjs) for a stored signal.
  function cardFor(sig, extra = {}) {
    const f = (n) => (n === undefined || n === null ? '' : n.toFixed(sig.decimals));
    return {
      kind: 'algo', instrument: sig.instrument, order: sig.order, side: sig.side,
      entry: f(sig.entry), sl: f(sig.sl), tp: f(sig.tp[0]), tp2: f(sig.tp[1]),
      status: 'live', closedR: '', when: `${sig.localDate}T${sig.localTime}`, tz: sig.tzLabel,
      ref: sig.ref, why: '', example: false, ...extra,
    };
  }
  function stampFor(event, r) {
    if (event === 'tp' || event === 'tp2') return { status: event, resultR: r };
    if (event === 'be') return { status: 'be', resultR: r };
    if (event === 'closed') return { status: 'closed', closedR: String(r), resultR: r };
    if (r > 0.05) return { status: 'closed', closedR: String(r), resultR: r };
    if (r >= -0.05) return { status: 'be', resultR: 0 };
    return { status: 'sl', resultR: r };
  }

  async function alert(text) {
    if (!cfg.chats.alerts) return;
    try { await telegram.sendMessage({ chat: cfg.chats.alerts, text: `⚠️ <b>Signal publisher</b>\n${esc(text)}` }); }
    catch (e) { log('error', `alert not sent: ${e.message}`); }
  }

  /** A stored signal from a validated open event. */
  function buildSignal(ev, r = route(ev.strategy)) {
    const lp = localParts(ev.time, cfg.display_tz);
    const tp = Array.isArray(ev.tp) ? ev.tp : [ev.tp];
    return {
      id: ev.id, strategy: ev.strategy, instrument: ev.instrument.toUpperCase(), side: ev.side, order: ev.order || 'market',
      entry: ev.entry, sl: ev.sl, tp, currentSl: ev.sl, decimals: decimalsFor(ev, cfg.instruments), note: ev.note || '',
      time: ev.time, localDate: lp.date, localTime: lp.time, tzLabel: lp.tz, ref: store.peekRef(lp.date),
      live: r.live, chat: r.chat, thread: r.thread, status: 'open', updates: [],
    };
  }

  async function handleOpen(ev) {
    if (!cfg.strategies[ev.strategy]) throw new PublishError(`strategy "${ev.strategy}" isn't listed in config.strategies, so it isn't posted anywhere`);
    if (store.getSignal(ev.id)) return 'duplicate';
    const r = route(ev.strategy);
    if (!r.chat) throw new PublishError(r.live ? 'chats.signals is not set in the config' : 'chats.test is not set in the config');
    const sig = buildSignal(ev, r);
    const lp = { date: sig.localDate };
    const png = render.signal(cardFor(sig), cfg.card_size);
    const msg = await telegram.sendPhoto({
      chat: r.chat, thread: r.thread, png, name: `${sig.instrument}-${sig.side}-${sig.ref}.png`,
      caption: signalCaption(sig, label(sig.strategy)),
    });
    store.useRef(lp.date);
    sig.messageId = msg.message_id;
    store.putSignal(sig);
    store.append({ kind: 'open', id: sig.id, strategy: sig.strategy, instrument: sig.instrument, side: sig.side, order: sig.order,
      entry: sig.entry, sl: sig.sl, tp: sig.tp, time: sig.time, ref: sig.ref, live: sig.live, chat: sig.chat, message_id: sig.messageId });
    log('info', `posted ${sig.instrument} ${sig.side} ${sig.ref} to ${sig.live ? 'the members group' : 'the test chat'}`);
    return 'posted';
  }

  async function handleUpdate(ev) {
    const sig = store.getSignal(ev.id);
    if (!sig) return 'waiting';
    if (sig.status !== 'open') {
      log('info', `ignored ${ev.event} for ${sig.ref}: that trade is already ${sig.status}`);
      return 'ignored';
    }
    const closing = CLOSING.has(ev.event);
    const r = closing ? closeR(sig, ev) : null;
    const text = updateText(sig, ev, r);
    const common = { chat: sig.chat, thread: sig.thread, replyTo: sig.messageId };
    const msg = closing && cfg.update_cards
      ? await telegram.sendPhoto({ ...common, png: render.signal(cardFor(sig, stampFor(ev.event, r)), cfg.card_size), name: `${sig.instrument}-${sig.ref}-${ev.event}.png`, caption: text })
      : await telegram.sendMessage({ ...common, text });
    if (ev.event === 'sl_moved') sig.currentSl = ev.price;
    if (closing || ev.event === 'cancelled') {
      sig.status = closing ? 'closed' : 'cancelled';
      sig.closedAt = ev.time;
      sig.closeLocalDate = localParts(ev.time, cfg.display_tz).date;
      sig.r = r;
      sig.exit = ev.event;
    }
    sig.updates.push({ event: ev.event, time: ev.time, price: ev.price, r, message_id: msg.message_id });
    store.putSignal(sig);
    store.append({ kind: 'update', id: sig.id, ref: sig.ref, event: ev.event, time: ev.time, price: ev.price, r, live: sig.live, message_id: msg.message_id });
    log('info', `posted ${ev.event} for ${sig.ref}${r !== null ? ' (' + r + 'R)' : ''}`);
    return 'posted';
  }

  function moveTo(dir, file, note) {
    fs.mkdirSync(dir, { recursive: true });
    const from = path.join(cfg.outbox, file), to = path.join(dir, file);
    try { fs.renameSync(from, to); }
    catch (e) {
      if (e.code !== 'EXDEV') throw e;
      fs.copyFileSync(from, to); fs.unlinkSync(from);
    }
    if (note) fs.writeFileSync(to + '.error.txt', note + '\n');
  }
  const sentDir = () => path.join(cfg.dataDir, 'sent', now().toISOString().slice(0, 7));
  const failedDir = () => path.join(cfg.dataDir, 'failed');

  async function fail(file, reason) {
    moveTo(failedDir(), file, reason);
    retries.delete(file);
    log('error', `${file} moved to failed: ${reason}`);
    await alert(`${file} was not posted: ${reason}. It's in the failed folder.`);
  }

  async function processFile(file) {
    const full = path.join(cfg.outbox, file);
    let ev;
    try { ev = JSON.parse(fs.readFileSync(full, 'utf8')); }
    catch { return fail(file, 'the file is not valid JSON'); }
    const problem = validateEvent(ev);
    if (problem) return fail(file, problem);
    const key = eventKey(ev);
    if (store.isProcessed(key)) { moveTo(sentDir(), file); log('info', `${file} was already posted; skipped`); return; }
    try {
      const outcome = ev.type === 'open' ? await handleOpen(ev) : await handleUpdate(ev);
      if (outcome === 'waiting') {
        const age = now() - fs.statSync(full).mtimeMs;
        if (age > cfg.orphan_minutes * 60000) return fail(file, `no signal with id "${ev.id}" was posted, so this update has nothing to reply to`);
        retries.set(file, { attempts: 0, at: now().getTime() + 10000 });
        return;
      }
      store.markProcessed(key);
      store.save();
      retries.delete(file);
      moveTo(sentDir(), file);
    } catch (e) {
      if (e.transient) {
        const r = retries.get(file) || { attempts: 0 };
        r.attempts += 1;
        if (r.attempts > cfg.max_attempts) return fail(file, `Telegram kept failing (${e.message})`);
        const wait = e.retryAfter ? e.retryAfter * 1000 : Math.min(2000 * 2 ** r.attempts, 300000);
        r.at = now().getTime() + wait;
        retries.set(file, r);
        log('error', `${file}: ${e.message}; trying again in ${Math.round(wait / 1000)}s`);
        return;
      }
      return fail(file, e.message);
    }
  }

  function weekStats(trades) {
    const wins = trades.filter((t) => t.r > 0.05).length, losses = trades.filter((t) => t.r < -0.05).length;
    return { trades, wins, losses, be: trades.length - wins - losses, net: trades.reduce((a, t) => a + t.r, 0) };
  }

  /** Posts the results card for an ISO week (e.g. 2026-W39). Returns false when there's nothing to post. */
  async function postWeekly(weekKey, { live = true, force = false } = {}) {
    const sigs = Object.values(store.state.signals).filter((s) => s.live === live);
    const closed = sigs.filter((s) => s.status === 'closed' && isoWeek(s.closeLocalDate) === weekKey)
      .sort((a, b) => Date.parse(a.closedAt) - Date.parse(b.closedAt));
    const cancelled = sigs.filter((s) => s.status === 'cancelled' && isoWeek(s.closeLocalDate) === weekKey).length;
    const open = sigs.filter((s) => s.status === 'open').length;
    if (!closed.length && !cancelled && !force) return false;
    const dest = live ? { chat: cfg.chats.results, thread: cfg.chats.results_thread } : { chat: cfg.chats.test, thread: cfg.chats.test_thread };
    if (!dest.chat) throw new PublishError(live ? 'chats.results is not set in the config' : 'chats.test is not set in the config');
    const trades = closed.map((s) => ({ day: localParts(s.closedAt, cfg.display_tz).weekday.toUpperCase(), market: s.instrument, side: s.side, r: s.r }));
    const lbl = weekLabel(weekKey);
    const png = render.results({ title: lbl.title, dates: lbl.dates, trades, example: false, emptyText: 'No trades closed this week.' }, cfg.card_size);
    const stats = weekStats(trades);
    const msg = await telegram.sendPhoto({ ...dest, png, name: `results-${weekKey}.png`, caption: weeklyCaption(lbl, stats, { open, cancelled }) });
    store.state.weekly[`${live ? 'live' : 'test'}:${weekKey}`] = { posted_at: now().toISOString(), message_id: msg.message_id };
    store.append({ kind: 'weekly', week: weekKey, live, trades: trades.length, net: Math.round(stats.net * 100) / 100, message_id: msg.message_id });
    store.save();
    log('info', `posted weekly results for ${weekKey} (${live ? 'members' : 'test'})`);
    return true;
  }

  async function weeklyDue() {
    if (!cfg.weekly.enabled) return;
    const lp = localParts(now(), cfg.display_tz);
    if (lp.weekday.toLowerCase() !== String(cfg.weekly.day).slice(0, 3).toLowerCase() || lp.time < cfg.weekly.time) return;
    const week = reportWeek(lp.date);
    for (const live of [true, false]) {
      const key = `${live ? 'live' : 'test'}:${week}`;
      if (store.state.weekly[key] || (weeklyRetryAt.get(key) || 0) > now().getTime()) continue;
      try {
        const posted = await postWeekly(week, { live });
        if (!posted) { store.state.weekly[key] = { skipped: 'no trades' }; store.save(); }
      } catch (e) {
        weeklyRetryAt.set(key, now().getTime() + 600000);
        log('error', `weekly results for ${week} not posted: ${e.message}`);
        await alert(`Weekly results for ${week} were not posted: ${e.message}. Trying again in 10 minutes.`);
      }
    }
  }

  /** One pass: post everything waiting in the outbox (oldest first), then the weekly results if due. */
  async function tick() {
    fs.mkdirSync(cfg.outbox, { recursive: true });
    const files = fs.readdirSync(cfg.outbox).filter((f) => f.endsWith('.json')).sort();
    for (const file of files) {
      const r = retries.get(file);
      if (r && r.at > now().getTime()) continue;
      await processFile(file);
    }
    await weeklyDue();
  }

  return { tick, postWeekly, route, cardFor, buildSignal, config: cfg };
}
