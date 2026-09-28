# TCP bridge

The TCP bridge puts members' MT5 results on the Quant Terminal's leaderboard. It runs on a Windows PC
with MT5. Every 30 minutes it reads each connected account with its **investor (read-only)** password
and sends the terminal **percentages only**: each day's gain or loss, and how many trades closed, won
and lost. No balance, no password and no account details leave the PC.

It never places, changes or closes a trade. There's no code in it that could, and a test checks
that.

## How it works

1. A member opens **Account → Connect MT5** in the terminal and types their account number, server
   and investor password. The app encrypts the password **on their phone** with this bridge's public
   key. The terminal only ever holds the encrypted copy, which it can't read.
2. The bridge asks the terminal for the connected accounts and opens each password with its private
   key, in memory only. It logs in to MT5 read-only and checks the account. It must be a live PU Prime
   or Vantage account, and the password must be the investor one.
3. It works out each trading day from the account's own deal history (`daystats.py`):
   - The day's result is closed trades, commissions, swaps and fees, over the balance at the start of
     the day plus that day's deposits.
   - Withdrawals aren't taken off, so moving money never makes a day look better.
   - Bonus credit is left out.
   - A trade counts on the day its position fully closes, with everything it cost.
4. It sends those rows, and what open trades stand at as a percentage, to the terminal. The terminal
   ranks the day, the week and the month.

The bot messages the member when their account connects, or tells them what to fix if it can't:
- a wrong password
- a master password
- a demo account
- another broker

## What you need

- A Windows PC that's on while you want results updated. It could become a Windows VPS later.
- **Python 3.11 or newer** (64-bit). If you already have it, `py --version` in a command prompt shows
  which. If not, get it from [python.org](https://www.python.org/downloads/windows/) and tick
  *Add python.exe to PATH* when you install it.
- **A copy of MT5 for each broker, used only by the bridge**: PU Prime now, and Vantage once members use
  it. Not the MT5 you trade with, and never the one an EA runs in: the bridge logs its copy in to other
  people's accounts, one after another.

All of it is free.

## Setting it up

1. Get this `bridge` folder: on GitHub, open the repository on the branch the terminal was built from
   (`claude/running-s499kz` until it's merged into `main`), then **Code → Download ZIP**. Unzip it and
   copy the `bridge` folder to somewhere like `C:\TCP\bridge`. Don't use a folder that OneDrive or
   Dropbox syncs.
2. Install PU Prime's MT5 again, into `C:\TCP\MT5-PUPrime` (on the installer's first screen, **Settings**
   lets you choose the folder). Start it once, log in to your own account with its investor password
   (below), then close it. Do the same for Vantage, into `C:\TCP\MT5-Vantage`, when you need it.
3. Open a command prompt in the bridge folder and install what it needs:
   ```
   py -m pip install -r requirements.txt
   ```
   If you have more than one Python, `py` uses the newest. The MT5 package works with 3.11 to 3.14.
4. Make the keys:
   ```
   py make_keys.py
   ```
   - Choose a passphrase of 12 characters or more and keep it somewhere safe, offline.
   - This writes three files to `secrets\` and prints the key's id.
5. In Cloudflare, open the terminal's Worker, then **Settings → Variables and Secrets**:
   - `BRIDGE_PUBLIC_KEY`, as text: everything in `secrets\bridge_public.txt`
   - `BRIDGE_TOKEN`, as a **secret**: everything in `secrets\bridge_token.txt`

   Then deploy. Connecting opens in the app once `BRIDGE_PUBLIC_KEY` is set.
6. Copy `config.example.json` to `config.json` and fill it in:
   - `worker_url`: the terminal's address, the same one the bot opens
   - `terminals`: where each MT5 is. Use forward slashes, like `C:/TCP/MT5-PUPrime/terminal64.exe`.
     Leave out `vantage` until you've installed it: Vantage accounts wait until then.
7. Check it all fits together:
   ```
   py tcp_bridge.py --check
   ```
   It shows this bridge's key id and the terminal's, which must match. It also shows how many
   accounts are waiting, whether it can find each MT5, and whether the MT5 package is installed for
   this Python.
8. Try it with your own account. In the terminal, open **Account → Connect MT5** and enter your
   account number, the server exactly as MT5 shows it (like `PUPrime-Live 3`) and your investor
   password. Then run one pass:
   ```
   py tcp_bridge.py --once
   ```
   The log should say `ok` and how many days it read. The bot messages you, and you're on the
   **Ranks** tab.
9. Start it: double-click **start_bridge.bat** and type the passphrase. Leave the window open. It reads
   every account every 30 minutes and logs each run to the window and to `bridge.log`.

## Your investor password

Every MT5 account has two passwords. The master one trades; the investor one can only look. The
leaderboard only ever takes the investor one.

If you don't have it, set one in MT5: **Tools → Options → Server → Change**, choose the investor
(read-only) password, and enter a new one. Your broker's client area can reset it too. Members do the
same, and the pinned leaderboard post tells them how.

## What the log means

Each account shows as the first characters of its link id, its broker and the last four digits of its
account number:

| Result | What happened | What the bridge does next |
|---|---|---|
| `ok, N days` | read and sent | reads it again next run |
| `login` | the account number, server or password is wrong (the line above it gives MT5's own words) | stops trying: repeated wrong passwords can lock an account. The member is told to reconnect. |
| `master` | the member typed their master (trading) password | refused before anything is read; the member is told to change it and reconnect with the investor one |
| `demo` / `broker` | a demo account, or not PU Prime or Vantage | stops; the member is told |
| `mismatch` | MT5 opened a different account from the one entered | stops; the member is told to reconnect |
| `key` | sealed with a key this bridge doesn't have (after `--replace`) | stops; the member is told to reconnect |
| `unreachable` | MT5 or the broker didn't answer | tries again, waiting longer each time (up to 8 runs) |
| `waiting` | skipped this run after an `unreachable` | |

## Keeping it safe

- **Keep `secrets\` private.** Never share, email or upload it. Git already leaves it out of the
  repository, along with `config.json` and the log.
- **The private key is locked with your passphrase**, and the bridge asks for it each time it starts.
  You can set `TCP_BRIDGE_PASSPHRASE` instead for unattended starts, but then anyone who can use the
  PC can use the key.
- **Use a Windows account only you use**, lock the PC when you leave it, and turn on device encryption
  (BitLocker) if the PC has it.
- **MT5 remembers the accounts it logs in to.** They're read-only, but keep that copy of MT5 for the
  bridge only. If a member types their master password by mistake, the bridge refuses it straight
  away and tells them to change it. Remove that account from MT5 too (Navigator → Accounts → right
  click → Delete).
- **If the PC or the secrets folder is lost:**
  - Run `make_keys.py --replace` and put the new public key into Cloudflare. Every member will need
    to reconnect.
  - Run `make_keys.py --new-token` and put the new token into Cloudflare.

## Limits

- Results update only while the bridge is running.
- An account counts from the day it's connected. Reconnecting the same account keeps its record;
  connecting a different one starts again.
- Anyone who knows an account's investor password could connect it. It must be a live PU Prime or
  Vantage account, and there are no prizes, so there's little to gain.
- Each member can make 5 connections a day, because each one is a login at their broker.

## Tests

On any computer with Python 3.11 or newer (MT5 isn't needed; stand-ins take its place):

```
py -m unittest -v
```

The tests cover the daily maths and every refusal, and check that nothing secret is logged or
printed. They also check that the terminal page's own encryption, run in Node, opens with this
bridge's key.
