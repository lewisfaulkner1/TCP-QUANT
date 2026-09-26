// Real drawing with @napi-rs/canvas and the bundled fonts: checks the PNGs come out at the right size.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSignalCard, renderResultsCard } from '../src/render.js';

const size = (png) => [png.readUInt32BE(16), png.readUInt32BE(20)];
const isPng = (png) => png.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

test('signal and results cards render as PNGs at every size', () => {
  const card = { kind: 'algo', instrument: 'XAUUSD', order: 'market', side: 'buy', entry: '3742.50', sl: '3727.50', tp: '3772.50', tp2: '',
    status: 'tp', resultR: 2, closedR: '', when: '2026-09-28T14:30', tz: 'BST', ref: '0928-01', why: '', example: false };
  const results = { title: 'Week 40', dates: '28 Sep – 2 Oct 2026', example: false,
    trades: [{ day: 'MON', market: 'XAUUSD', side: 'buy', r: 2 }, { day: 'TUE', market: 'XAUUSD', side: 'sell', r: -1 }] };
  for (const [name, w, h] of [['square', 1080, 1080], ['portrait', 1080, 1350], ['story', 1080, 1920]]) {
    const a = renderSignalCard(card, name), b = renderResultsCard(results, name);
    assert.ok(isPng(a) && isPng(b));
    assert.deepEqual(size(a), [w, h]);
    assert.deepEqual(size(b), [w, h]);
    assert.ok(a.length > 20000, 'the card has real content');
  }
  assert.throws(() => renderSignalCard(card, 'banner'), /unknown card size/);
});
