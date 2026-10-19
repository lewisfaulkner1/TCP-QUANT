#!/usr/bin/env node
// TCP signal publisher: command line. Run `node src/cli.js help` for the commands.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore, verifyLedger } from './store.js';
import { createTelegram } from './telegram.js';
import { createPublisher } from './publisher.js';
import { validateEvent } from './events.js';
import { localParts, reportWeek } from './time.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const HELP = `TCP signal publisher

  node src/cli.js run            post events from the outbox as they arrive (keep this running)
  node src/cli.js once           post what's in the outbox now, then stop
  node src/cli.js test-post      send an EXAMPLE card to the test chat, to check the token and chat id
  node src/cli.js demo           drop a sample signal and its take-profit into the outbox
  node src/cli.js preview FILE   draw the card for an open event to preview.png, without posting
  node src/cli.js weekly         post last week's results now   (--week 2026-W39, --test)
  node src/cli.js verify-ledger  check that the record of posts hasn't been edited

  --config PATH   config file (default: config.json next to package.json)`;

function parseArgs(argv) {
  const [cmd = 'help', ...rest] = argv; const opts = {}; const pos = [];
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a.startsWith('--')) { const k = a.slice(2); const next = rest[i + 1]; opts[k] = next && !next.startsWith('--') ? (i++, next) : true; }
    else pos.push(a);
  }
  return { cmd, opts, pos };
}

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

function loadConfig(file) {
  if (!fs.existsSync(file)) throw new Error(`No config at ${file}. Copy config.example.json to config.json and fill it in.`);
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const dir = path.dirname(path.resolve(file));
  const abs = (p, dflt) => { const v = p || dflt; return path.isAbsolute(v) ? v : path.join(dir, v); };
  raw.outbox = abs(raw.outbox, 'outbox');
  raw.data_dir = abs(raw.data_dir, 'data');
  try { new Intl.DateTimeFormat('en-GB', { timeZone: raw.display_tz || 'Europe/London' }); }
  catch { throw new Error(`display_tz "${raw.display_tz}" isn't a time zone name like Europe/London`); }
  return raw;
}

async function renderer() {
  const { renderSignalCard, renderResultsCard } = await import('./render.js');
  return { signal: renderSignalCard, results: renderResultsCard };
}

function setup(opts, { needToken = true } = {}) {
  loadEnv(path.join(root, '.env'));
  const config = loadConfig(opts.config || path.join(root, 'config.json'));
  const telegram = needToken ? createTelegram({ token: process.env.TELEGRAM_BOT_TOKEN }) : null;
  return { config, telegram };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const { cmd, opts, pos } = parseArgs(process.argv.slice(2));
  if (cmd === 'help' || opts.help) { console.log(HELP); return; }

  if (cmd === 'verify-ledger') {
    const { config } = setup(opts, { needToken: false });
    const res = verifyLedger(path.join(config.data_dir, 'ledger.jsonl'));
    console.log(res.ok ? `Ledger OK: ${res.entries} entries, none changed.` : `Ledger problem at line ${res.line}: ${res.reason}.`);
    process.exitCode = res.ok ? 0 : 1; return;
  }

  if (cmd === 'demo') {
    const { config } = setup(opts, { needToken: false });
    fs.mkdirSync(config.outbox, { recursive: true });
    const strategy = Object.keys(config.strategies || {})[0] || 'QT1';
    const t = new Date(); const id = `DEMO-${t.getTime()}`; const stamp = t.toISOString().replace(/[-:.]/g, '');
    const write = (name, obj) => { const f = path.join(config.outbox, name); fs.writeFileSync(f + '.tmp', JSON.stringify(obj, null, 1)); fs.renameSync(f + '.tmp', f); };
    write(`${stamp}-1-open-${id}.json`, { v: 1, type: 'open', id, strategy, instrument: 'XAUUSD', side: 'buy', order: 'market', entry: 3742.5, sl: 3727.5, tp: [3772.5], time: t.toISOString(), note: 'Demo signal from the publisher, not a real trade.' });
    write(`${stamp}-2-update-${id}.json`, { v: 1, type: 'update', id, event: 'tp', price: 3772.5, time: new Date(t.getTime() + 60000).toISOString() });
    console.log(`Wrote a demo signal and its take-profit to ${config.outbox}. Run "once" (test mode) to post them to the test chat.`);
    return;
  }

  if (cmd === 'preview') {
    const { config } = setup(opts, { needToken: false });
    if (!pos[0]) throw new Error('Give the event file: node src/cli.js preview path/to/event.json');
    const ev = JSON.parse(fs.readFileSync(pos[0], 'utf8'));
    const problem = validateEvent(ev); if (problem) throw new Error(`That event can't be used: ${problem}`);
    if (ev.type !== 'open') throw new Error('preview needs an open event');
    const store = createStore(path.join(config.data_dir, 'preview-tmp'));
    const pub = createPublisher({ config, store, telegram: null, render: null });
    const render = await renderer();
    const out = opts.out || 'preview.png';
    fs.writeFileSync(out, render.signal(pub.cardFor(pub.buildSignal(ev)), opts.size || pub.config.card_size));
    fs.rmSync(path.join(config.data_dir, 'preview-tmp'), { recursive: true, force: true });
    console.log(`Card written to ${out}`); return;
  }

  const { config, telegram } = setup(opts);
  const store = createStore(config.data_dir);
  const pub = createPublisher({ config, store, telegram, render: await renderer() });
  const cfg = pub.config;

  if (cmd === 'test-post') {
    if (!cfg.chats.test) throw new Error('Set chats.test in the config first (the chat id of your private test group).');
    const render = await renderer();
    const png = render.signal({ kind: 'algo', instrument: 'XAUUSD', order: 'market', side: 'buy', entry: '3742.50', sl: '3727.50', tp: '3772.50', tp2: '', status: 'live', closedR: '', when: '', tz: '', ref: 'TEST', why: '', example: true }, cfg.card_size);
    await telegram.sendPhoto({ chat: cfg.chats.test, thread: cfg.chats.test_thread, png, name: 'test.png', caption: 'Test post from the TCP signal publisher. If you can see this, the token and chat id work.' });
    console.log('Sent. Check the test chat.'); return;
  }

  if (cmd === 'weekly') {
    const week = opts.week || reportWeek(localParts(new Date(), cfg.display_tz).date);
    const posted = await pub.postWeekly(week, { live: !opts.test, force: Boolean(opts.force) });
    console.log(posted ? `Posted results for ${week}.` : `No closed trades in ${week}, so nothing was posted (add --force to post an empty card).`);
    return;
  }

  if (cmd === 'once') { await pub.tick(); console.log('Outbox processed.'); return; }

  if (cmd === 'run') {
    const every = Math.max(1, Number(opts.every) || 2) * 1000;
    const live = Object.entries(cfg.strategies).filter(([, s]) => s.live).map(([k]) => k);
    console.log(`TCP signal publisher: mode ${cfg.mode}; outbox ${cfg.outbox}; ` +
      (cfg.mode === 'live' ? `live strategies: ${live.join(', ') || 'none'}` : 'every post goes to the test chat'));
    let stopping = false;
    const stop = () => { if (!stopping) { stopping = true; console.log('Stopping after this pass...'); } };
    process.on('SIGINT', stop); process.on('SIGTERM', stop);
    while (!stopping) {
      try { await pub.tick(); } catch (e) { console.error(`${new Date().toISOString()} ERROR pass failed: ${e.message}`); }
      await sleep(every);
    }
    return;
  }

  console.log(HELP);
  process.exitCode = 1;
}

main().catch((e) => { console.error(e.message); process.exitCode = 1; });
