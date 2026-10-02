# TCP — The Crypto Playbook · notes for Claude

Read this first in every session. It's the project's memory: what exists, the rules that always
apply, and where things stand. Keep it current when something changes.

## The business

TCP is Lewis's trading community. Markets: XAUUSD now, GC and BTC later. People join the Inner Circle
(the VIP Telegram group) by opening a PU Prime or Vantage account through Lewis's partner link. Lewis
can't pay for services yet: prefer free tiers, and ask before anything that costs money.

## Rules that always apply

- **This repository is public.** No secrets (tokens, keys, passwords, chat IDs beyond placeholders), no
  trading-strategy rules, and no team members' names. Lewis's indicator (TCP Quant Terminal v11.7) and
  his reading of it stay out of the repo: the guide TCP AI reads lives in the terminal's database.
- **Money and members.** Anything that posts to members starts in test mode (the team group). Captions
  that ask people to open an account end with the partner disclosure and the risk line.
- **Honest numbers.** Every record is measured against what no edge would give (no-edge odds, a random
  walk), shows losses as well as wins, and gives a verdict only after enough results. Demo data sits at
  the no-edge line on purpose. Never present made-up results as real.
- **No backtesting Lewis's checklist here.** The algo research (QT1) runs on his laptop with its own
  pre-registered rules; testing his method in this repo would spoil it.
- **Copy** is plain British English: short sentences, everyday words, the number before the adjective.

## What's here

| Folder | What | Tests |
|---|---|---|
| `bot/` | Onboarding bot (Cloudflare Worker): link in bio → 18+ → broker → verified → Inner Circle invite; referral scoreboard (D1) | `cd bot && npm test` |
| `terminal/` | Quant Terminal, a Telegram Mini App on one Worker: markets and the probability engine, risk calculator and prop challenge simulator, the Playbook, session briefs (TCP AI), MT5 connection and the leaderboard | `cd terminal && npm install && npm test` |
| `bridge/` | TCP bridge for a Windows PC with MT5: reads connected members' accounts read-only and sends the Worker percentages only | `cd bridge && python3.12 -m unittest -v` |
| `signals/` | Signal publisher for the VPS: the algo's signals and results as branded cards | `cd signals && npm install && npm test` |
| `tools/card-studio/` | Card Studio (a private Claude artifact) for signal and results images | — |
| `brand/source/reels/` | Reel studio: a short script → a vertical video with an AI voice, subtitles, graphics, terminal footage and original music; `toon/` adds the animated founder for the TikTok episodes (`brand/video/reels/EPISODES.md`) | see its README |
| `brand/`, `community/` | Logo pack, videos and reels (`brand/video/reels/POSTS.md`), captions, business cards; the Inner Circle kit, pinned posts and socials setup | — |

The terminal builds into one file, `terminal/dist/worker.js`, which Lewis pastes into the Cloudflare
dashboard. Always run `npm test` (it builds first) and commit the rebuilt `dist/worker.js`.

## Constraints to design for

- Cloudflare Workers free plan: 10 ms of CPU per request. Heavy maths runs once and is cached; big JSON
  isn't parsed on hot paths.
- Twelve Data free plan: 800 requests a day for gold, about 675 already used (the terminal, the
  Playbook's checks, brief reviews).
- D1 (`DB`) holds the Playbook, session briefs and MT5 links; tables are made on first use.
- One Cron Trigger every 5 minutes drives the Playbook's checks and the briefs' reminders and reviews.
- TCP AI (Claude through the official Anthropic SDK, bundled by `terminal/build.mjs`) is off until
  `ANTHROPIC_API_KEY` is set. Every feature must work without it.
- The leaderboard is off until `BRIDGE_PUBLIC_KEY` is set, and fills only while the bridge runs on
  Lewis's PC. The Worker must never be able to read an investor password: the page seals it to the
  bridge's key, and only the bridge's private key opens it. Nothing that carries a balance leaves the
  bridge. The bridge never trades.
- D1 on the free plan counts each statement in a batch as a query: bulk writes go through one
  `json_each` statement, and tables are added up in SQL.
- In the cloud container, run the bridge's tests with `python3.12`: the default `python3` (3.11) has
  a broken system `cryptography`.
- The cloud container reaches PyPI and npm but not GitHub releases or Hugging Face: the reels' voice
  model comes from an npm package (see `brand/source/reels/README.md`). Models aren't committed.
- Reels teach and never ask viewers to open an account (a UK financial promotion); the link in bio and
  the bot do that, with the disclosures. Label AI voices and demo data.
- The animated founder (`toon/founder.js`) is canonical once Lewis approves the sheet: change his look
  only on purpose. His reference photos are personal: keep them out of the repo.

## Where things stand

See `docs/ROADMAP.md` for what's done, what's next and why. Work happens on branch
`claude/running-s499kz`, in pull request lewisfaulkner1/TCP-QUANT#1.
