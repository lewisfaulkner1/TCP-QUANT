# Signal events

The trading engine tells the publisher what happened by dropping one small JSON file per event into
the **outbox** folder. The publisher posts it and moves it to `data/sent/`. A file it can't use goes to
`data/failed/` with a `.error.txt` next to it saying why, and an alert goes to the team chat.

From Python, use `emit/tcp_signals.py` (it writes these files for you). Any other program, an MT5 EA
included, can write them directly: write to `name.json.tmp` first, then rename it to `name.json`, so the
publisher never reads a half-written file. Start file names with a UTC timestamp
(`20260928T133000123456-...json`); the publisher handles them in name order.

## open: a new signal

```json
{"v": 1, "type": "open", "id": "QT1-XAUUSD-20260928T133000", "strategy": "QT1",
 "instrument": "XAUUSD", "side": "buy", "order": "market",
 "entry": 3742.50, "sl": 3727.50, "tp": [3772.50], "time": "2026-09-28T13:30:00Z"}
```

| Field | Rule |
|---|---|
| `v` | always `1` |
| `id` | 1–64 letters, digits or `. _ : -`; unique per signal; every update uses it |
| `strategy` | must be listed in `config.strategies`, or the signal isn't posted anywhere |
| `instrument` | 2–12 characters, e.g. `XAUUSD`, `BTCUSD`, `MGC` |
| `side` | `buy` or `sell` |
| `order` | `market` (default), `limit` or `stop` |
| `entry`, `sl` | prices; for a buy the stop is below the entry, for a sell above |
| `tp` | one or two targets, nearest first |
| `time` | ISO 8601 with a time zone, e.g. `2026-09-28T13:30:00Z` |
| `decimals` | optional; price decimals to show (known markets have defaults) |
| `note` | optional, up to 420 characters; shown as the "Why" line |

## update: what happened next

```json
{"v": 1, "type": "update", "id": "QT1-XAUUSD-20260928T133000", "event": "tp", "time": "2026-09-28T15:00:00Z"}
```

| `event` | Meaning | `price` |
|---|---|---|
| `tp` | first target hit | optional (the fill; defaults to the target) |
| `tp2` | second target hit | optional |
| `sl` | stopped out | optional (the fill; defaults to the current stop) |
| `be` | closed at breakeven | optional |
| `closed` | closed by hand or by a rule | required, or give `r` instead |
| `sl_moved` | stop moved (e.g. to breakeven) | required: the new stop |
| `cancelled` | a limit or stop order was never filled | – |

Each update is posted as a **reply** to its signal. Closing events (`tp`, `tp2`, `sl`, `be`, `closed`) get
a stamped card (TP HIT, STOPPED, BREAKEVEN, CLOSED) with the result.

## How the result is worked out

R is measured against the **original** stop distance:
`R = (exit − entry) ÷ |entry − original stop|`, turned round for sells, to 2 decimals.
So a buy from 3742.50 with its stop at 3727.50 (15.00 of risk) that exits at 3772.50 is +2.0R; a stop
moved to entry and then hit is 0.0R; a stop filled 1.50 worse than planned is −1.1R.

## What gets posted where

- `config.mode` is `test` by default: **every** post goes to the private test chat.
- A strategy reaches the members' group only when `mode` is `live` **and** that strategy has `"live": true`.
- An event whose `strategy` isn't in the config is refused.
- The same event dropped twice (even under another file name) is posted once.
- An update that arrives before its signal waits; after `orphan_minutes` (30) it's set aside with an alert.
