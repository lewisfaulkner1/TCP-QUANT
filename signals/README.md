# TCP signal publisher

Runs on the VPS next to the trading engine and turns what the algorithm does into posts in the
TCP Inner Circle: a branded card for every signal, a reply for every update, and the weekly results.

```
trading engine ──writes──▶ outbox/*.json ──▶ publisher ──▶ Telegram (📈 Signals, 📊 Results topics)
                                               │
                                               └─▶ data/ledger.jsonl (every post, tamper-evident)
```

## What members see

- **New signal:** the signal card (the same design as the Card Studio) with the agreed text:
  market, direction, entry, stop, target, risk:reward, the "Why" line, and "Updates follow as replies".
- **Updates** as replies to the signal: stop moved, take profit hit (with a TP HIT card), stopped out,
  breakeven, closed, cancelled. Results are in R.
- **Weekly results** every Saturday at 09:00 UK time: the results card with every trade closed that week,
  wins and losses, plus trades still open and orders cancelled.

## Safety

- **Test mode by default.** Everything goes to your private test chat until you switch it on.
- **Per-strategy switch.** A strategy only reaches members when `mode` is `live` and the strategy has
  `"live": true`. Keep QT1 on test until it has passed its holdout verdict.
- **Nothing trades.** The publisher only reads event files and posts messages. It never connects to
  MT5 or a broker, and it doesn't touch the EA or the execution code.
- **The ledger.** Every post is appended to `data/ledger.jsonl`, each line chained to the one before by a
  hash, so `verify-ledger` shows if the record was ever edited. With Telegram's own timestamps, that's a
  track record you can show.
- **The bot token** stays in `.env` on the VPS. It's never logged or written anywhere else.

## Files

| Path | What it is |
|---|---|
| `src/cli.js` | the commands (`run`, `once`, `test-post`, `demo`, `preview`, `weekly`, `verify-ledger`) |
| `src/publisher.js` | reads the outbox, routes, posts, retries, weekly results |
| `src/render.js` | draws the cards with `tools/card-studio/cards.cjs`, the Card Studio's own drawing code |
| `emit/tcp_signals.py` | what the engine calls to write events |
| `EVENTS.md` | the event format |
| `SETUP.md` | installing it on the VPS |
| `fonts/` | the card fonts (SIL Open Font License; licences included) |

Tests: `npm test` (22 end-to-end tests; Telegram is replaced by a recording fake).
