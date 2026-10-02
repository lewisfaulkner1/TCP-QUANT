// What the publisher remembers between restarts, plus an append-only ledger of everything it posted.
// Each ledger line carries the hash of the line before it, so an edited or deleted line shows up
// in `verify-ledger`. Telegram's own message timestamps are the public side of the same record.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const GENESIS = 'genesis';

export function createStore(dir, { now = () => new Date() } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const stateFile = path.join(dir, 'state.json');
  const ledgerFile = path.join(dir, 'ledger.jsonl');

  const state = { signals: {}, processed: {}, refs: {}, weekly: {} };
  if (fs.existsSync(stateFile)) Object.assign(state, JSON.parse(fs.readFileSync(stateFile, 'utf8')));

  let last = { seq: 0, hash: GENESIS };
  if (fs.existsSync(ledgerFile)) {
    const lines = fs.readFileSync(ledgerFile, 'utf8').split('\n').filter(Boolean);
    if (lines.length) { const l = JSON.parse(lines[lines.length - 1]); last = { seq: l.seq, hash: l.hash }; }
  }

  function save() {
    const tmp = stateFile + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(state, null, 1));
    fs.renameSync(tmp, stateFile);
  }

  return {
    state,
    save,
    ledgerFile,
    getSignal: (id) => state.signals[id],
    putSignal(sig) { state.signals[sig.id] = sig; },
    isProcessed: (key) => Boolean(state.processed[key]),
    markProcessed(key) { state.processed[key] = now().toISOString(); },
    /** The reference the next signal on this local date gets, e.g. 0928-01, 0928-02 ... */
    peekRef(localDate) {
      const n = (state.refs[localDate] || 0) + 1;
      return `${localDate.slice(5, 7)}${localDate.slice(8, 10)}-${String(n).padStart(2, '0')}`;
    },
    /** Called once the signal is posted, so a failed attempt doesn't leave a gap in the numbering. */
    useRef(localDate) { state.refs[localDate] = (state.refs[localDate] || 0) + 1; },
    append(record) {
      const entry = { seq: last.seq + 1, at: now().toISOString(), prev: last.hash, ...record };
      const hash = sha(JSON.stringify(entry));
      fs.appendFileSync(ledgerFile, JSON.stringify({ ...entry, hash }) + '\n');
      last = { seq: entry.seq, hash };
    },
  };
}

/** Walks the ledger and checks every line's hash and its link to the line before. */
export function verifyLedger(file) {
  if (!fs.existsSync(file)) return { ok: true, entries: 0 };
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  let prev = GENESIS;
  for (let i = 0; i < lines.length; i++) {
    let obj;
    try { obj = JSON.parse(lines[i]); } catch { return { ok: false, line: i + 1, reason: 'not valid JSON' }; }
    const { hash, ...rest } = obj;
    if (rest.seq !== i + 1) return { ok: false, line: i + 1, reason: 'sequence number out of order' };
    if (rest.prev !== prev) return { ok: false, line: i + 1, reason: 'link to the previous line is broken' };
    if (sha(JSON.stringify(rest)) !== hash) return { ok: false, line: i + 1, reason: 'contents were changed after writing' };
    prev = hash;
  }
  return { ok: true, entries: lines.length };
}
