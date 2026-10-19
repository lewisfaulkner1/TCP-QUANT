// The Python helper the engine uses must write events the publisher accepts, in order.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEvent } from '../src/events.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const python = ['python3', 'python', 'py'].find((p) => spawnSync(p, ['--version']).status === 0);

test('events written by the Python helper pass the publisher checks, oldest first', { skip: !python && 'Python not installed' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tcp-emit-'));
  const script = `
import sys; sys.path.insert(0, ${JSON.stringify(path.join(here, '..', 'emit'))})
from tcp_signals import Outbox
box = Outbox(${JSON.stringify(dir)})
sid = box.open(strategy="QT1", instrument="xauusd", side="sell", entry=3742.5, sl=3757.5, tp=[3712.5, 3697.5], note="Test")
box.update(sid, "sl_moved", price=3742.5)
box.update(sid, "closed", price=3730.0)
try:
    box.open(strategy="QT1", instrument="XAUUSD", side="buy", entry=10, sl=11, tp=12)
except ValueError as e:
    print("refused:", e)
`;
  const run = spawnSync(python, ['-c', script], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /refused: for a buy, sl must be below entry/);
  const files = fs.readdirSync(dir).sort();
  assert.equal(files.length, 3);
  assert.ok(files.every((f) => f.endsWith('.json')), 'no temporary files left behind');
  const events = files.map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  assert.deepEqual(events.map((e) => e.type + ':' + (e.event || '')), ['open:', 'update:sl_moved', 'update:closed']);
  for (const e of events) assert.equal(validateEvent(e), null, JSON.stringify(e));
  assert.equal(events[0].instrument, 'XAUUSD');
  assert.equal(events[1].id, events[0].id);
});
