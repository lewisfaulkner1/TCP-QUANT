# Setting up the signal publisher on the VPS

About 20 minutes. Written for a Windows VPS; the same steps work on Linux.

## 1. Install

1. Install **Node.js 22 LTS** from nodejs.org (the Windows installer; keep the defaults).
2. Install **Git for Windows** from git-scm.com, then in PowerShell:
   ```
   git clone https://github.com/lewisfaulkner1/TCP-QUANT.git C:\tcp\TCP-QUANT
   cd C:\tcp\TCP-QUANT\signals
   npm install
   ```

## 2. A private test chat

1. In Telegram, create a group with just you in it (for example "TCP Signals Test") and add the bot.
2. Send `/id` in it. The onboarding bot replies with the chat id (`-100…`).

Everything posts here until you switch a strategy live.

## 3. Config and token

In `C:\tcp\TCP-QUANT\signals`:

1. Copy `.env.example` to `.env` and put the bot token after `TELEGRAM_BOT_TOKEN=`
   (the same token the onboarding bot uses; it stays on the VPS).
2. Copy `config.example.json` to `config.json` and set:
   - `"test"`: the test chat id from step 2
   - `"alerts"`: your team group's id (where problems are reported), or leave it `null`
   - `"outbox"`: the folder the engine writes to, e.g. `"C:/tcp/signals/outbox"`
   - `"data_dir"`: where the publisher keeps its state and ledger, e.g. `"C:/tcp/signals/data"`

## 4. Check it works

```
node src/cli.js test-post
node src/cli.js demo
node src/cli.js once
```

`test-post` sends an EXAMPLE card. `demo` + `once` post a demo signal and its take-profit reply,
so you can see exactly what members will get.

## 5. Keep it running

Use Task Scheduler (built into Windows):

1. **Create Task** → General: name `TCP Signals`, tick *Run whether user is logged on or not*.
2. Triggers: **At startup**.
3. Actions: **Start a program**
   - Program: `C:\Program Files\nodejs\node.exe`
   - Arguments: `src\cli.js run`
   - Start in: `C:\tcp\TCP-QUANT\signals`
4. Settings: tick *If the task fails, restart every 1 minute*.

Run it once from Task Scheduler and send yourself `node src/cli.js demo` to confirm it posts.

## 6. The members' group (only after QT1 passes)

1. Add the bot as an admin of the TCP Inner Circle (it already is, for invites).
2. Topic ids: open the 📈 Signals topic, copy its link (`https://t.me/c/1234567890/3`); the last number
   is the topic id. Do the same for 📊 Results.
3. In `config.json`: `"signals"` and `"results"` = the Inner Circle chat id, `"signals_thread"` and
   `"results_thread"` = the topic ids.
4. When a strategy has passed its verdict: set `"mode": "live"` and that strategy's `"live": true`,
   then restart the task. Strategies still on test keep posting to the test chat.

## 7. Connect the engine

In the engine (a later, separate step on the laptop, once QT1 has a verdict):

```python
from tcp_signals import Outbox          # signals/emit/tcp_signals.py
box = Outbox(r"C:\tcp\signals\outbox")
sid = box.open(strategy="QT1", instrument="XAUUSD", side="buy", entry=3742.50, sl=3727.50, tp=3772.50)
box.update(sid, "tp")
```

The event format is in `EVENTS.md`.

## Everyday commands

| Command | What it does |
|---|---|
| `node src/cli.js weekly` | post last week's results now (add `--test` for the test chat) |
| `node src/cli.js preview event.json` | draw a signal's card to `preview.png` without posting |
| `node src/cli.js verify-ledger` | check that the record of posts hasn't been edited |

Problems show up in the alerts chat and in `data/failed/` (each file has an `.error.txt` saying why).
