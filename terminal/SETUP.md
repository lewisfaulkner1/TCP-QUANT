# TCP Quant Terminal · setup

About 15 minutes, and free. The terminal opens inside Telegram for Inner Circle members. It has:
- live gold and Bitcoin charts with key levels and a probability cone;
- a probability engine with its own model check, a plain-English briefing, and the probability swarm;
- market state, volatility, when each market moves hour by hour, and a session clock;
- a lot-size calculator with the odds for each target;
- **the Playbook**: Lewis's setups, logged before the result with his reasons and chart, followed to the
  end automatically, posted to the Inner Circle, and scored in a record that shows whether they beat
  the no-edge odds (step 4);
- Signals, AI and Account tabs that show what's coming (signals, copy trading, account connection, AI),
  each with a **Notify me** button that tells the team who wants it.

You need the Cloudflare account the bot runs on, BotFather, and a free Twelve Data account.

## 1. Put the terminal online (Cloudflare Workers, free)

1. In Cloudflare, go to **Workers & Pages → Create → Create Worker**, name it `tcp-terminal`, and press **Deploy**.
2. Press **Edit code**, delete what's there, paste the whole of `terminal/dist/worker.js`, and press **Deploy**.
3. In the Worker's **Settings → Variables and Secrets**, add:
   - `BOT_TOKEN` (**Secret**): the same token as the onboarding bot. The terminal uses it to check that
     people really opened it from Telegram, and to ask Telegram who's in the Inner Circle.
   - `INNER_CIRCLE_CHAT_ID` (Text): the same number as in the bot's settings.
   - `ADMIN_CHAT_ID` (Text): the team group. The team gets in too, and **Notify me** taps are posted there.
     The bot must be an admin there for Telegram to answer. Without it, Notify me still thanks the member
     but nobody is told.
   - `TWELVE_DATA_KEY` (**Secret**): see step 2.

   Press **Deploy**.
4. Note the Worker's address, for example `https://tcp-terminal.yourname.workers.dev`. Opened in a normal
   browser it says "Open the terminal from Telegram". That's expected.

## 2. Gold prices: a free Twelve Data key

1. Sign up at **twelvedata.com** (the free Basic plan).
2. Copy the API key from your dashboard into the `TWELVE_DATA_KEY` secret, and press **Deploy**.

The free plan allows 800 requests a day. While gold is open, the terminal refreshes its 15-minute bars
every 150 seconds and two months of hourly history once an hour. Every member shares each refresh:
about 575 requests on a weekday, far fewer at weekends. If the allowance ever runs out, members see the
last prices, marked as such. Gold's feed can send flat prices while gold is shut (weekends and the
daily break); the terminal drops those, so at the weekend the chart ends at Friday's close.

Bitcoin needs no key. It comes from Coinbase, with Bitstamp, Kraken and Binance as back-ups: some exchanges
turn away requests from Cloudflare, so the terminal tries the next one and remembers which answered. In the
app, Bitcoin streams live tick by tick from whichever exchange connects, and the status bar names it. Truly
live gold will come with the paid MT5 connection later.

## 3. Open it from Telegram

1. In **@BotFather**, send `/newapp` and pick your bot. Then:
   - Title: `TCP Quant Terminal`
   - Description: `Levels, sessions and risk for the TCP Inner Circle.`
   - Photo: `terminal/brand/app-photo-640x360.png`
   - GIF: send `/empty`
   - Web App URL: your Worker's address from step 1
   - Short name: `terminal`

   BotFather replies with the link: `https://t.me/YourBotUsername/terminal`.
2. Optional: send `/setmenubutton` to BotFather, pick the bot, send the Worker's address, and call it
   `Terminal`. A Terminal button then sits by the message box in the bot.
3. Post the link in the Inner Circle and pin it, for example:
   `📊 The TCP Quant Terminal: https://t.me/YourBotUsername/terminal`
4. Test it from your phone. You should see Markets. Anyone outside the Inner Circle sees "Members only"
   and a button into the bot, which the scoreboard counts under `terminal`.

The Cloudflare and BotFather wording may differ slightly; the steps are the same.

## 4. The Playbook (about 10 minutes)

The Playbook needs a small database and a timer. Both are free.

1. **The database.** In Cloudflare, go to **Storage & Databases → D1 SQL Database → Create**, and name it
   `tcp-playbook`. (If the bot already has a D1 database for its scoreboard, you can use that one
   instead: the Playbook's tables have their own names.) Then open the `tcp-terminal` Worker,
   **Settings → Bindings → Add → D1 database**, set the variable name to `DB`, pick the database and
   press **Deploy**. The Playbook makes its tables itself the first time it's used.
2. **Who can log setups.** In **Settings → Variables and Secrets**, add `POSTER_IDS` (Text): your Telegram
   user ID, and anyone else's you want to allow, separated by commas. To find an ID, message
   **@userinfobot**, or look at the `ID:` line on a Notify me or lead card from that person.
3. **Where setups go.** Leave `PLAYBOOK_MODE` unset at first: that's test mode, where setups go to the
   team group only and stay out of the record. Optionally add `PLAYBOOK_THREAD_ID` (Text): the Inner
   Circle topic for setups and their results, for example 📈 Signals. To find it, copy the link of any
   message in that topic: `https://t.me/c/1234567890/42/789` means the topic is `42`.
   Optionally add `PLAYBOOK_TAGS` (Text): the reasons to suggest in the form, separated by commas, for
   example the confirmations on your indicator's checklist. Reasons used before are suggested anyway.
4. **The timer.** In **Settings → Triggers → Cron Triggers**, add `*/5 * * * *` (every 5 minutes).
   This is what notices fills, targets and stops.
5. Paste the new `terminal/dist/worker.js` into **Edit code** and press **Deploy**.
6. **Try it.** Open the terminal from Telegram, go to **Signals** and tap **+ LOG A SETUP**. Log a test
   setup and check it arrives in the team group. Tap **Close now** on it to see a result posted.
7. **Go live.** Clear the test runs first if you like: in the D1 database's **Console**, run
   `DELETE FROM record; DELETE FROM setups;`. Do this only before the first live setup: after that,
   the record's chain would show the gap. Then set `PLAYBOOK_MODE` to `live` and press **Deploy**.
   From then on, setups post to the Inner Circle and count in the record.

## Updating

Paste the new `terminal/dist/worker.js` into **Edit code** and press **Deploy**. Settings stay as they are.

## Good to know

- **Who gets in:** anyone in the Inner Circle (or the team group). Telegram vouches for who opened it,
  and the terminal asks Telegram whether they're a member, reusing the answer for up to 10 minutes. Someone
  who leaves loses access within 10 minutes; someone just approved gets in within a minute.
- **Nobody logs in, and nothing about members is stored.** The bot token stays in Cloudflare's secrets and
  never reaches the page. The terminal sends a Notify me tap (the member's name, @username and Telegram ID)
  to the team group. The only thing it stores is the Playbook: the setups, who logged them, their charts'
  Telegram file IDs, and what happened to them.
- **The data:** gold is XAU/USD spot from Twelve Data; Bitcoin is BTC-USD from Coinbase, Bitstamp or Kraken
  (or BTC/USDT from Binance as a last resort), named under the price; exchange rates for GBP and EUR
  accounts are the European Central Bank's. Brokers' prices differ slightly.
- **The levels** are standard reference levels: previous day and week, today's opens, session highs and lows,
  and round numbers. Gold's day ends at 17:00 New York, as on broker charts; Bitcoin uses UTC days.
  The algo's own zones join the terminal only after the forward test.
- **The calculator** rounds down to 0.01 lots. Members can check their broker's contract size in MT5.

## What the quant engine shows

- **Chance of a touch:** for each level not yet reached today, the chance price touches it before today's
  close (17:00 New York for gold, midnight UTC for Bitcoin). The model is stated plainly on screen:
  price moves at random, with each market's own volatility for every hour of the day, measured over the
  last two months. The numbers measure reach, not direction.
- **68% and 95% close ranges:** where the close should land with those probabilities under the same model.
  On the chart they're drawn as a cone that widens towards the close.
- **The odds recompute every second:** with each new price, and as time runs down. Bitcoin's move with
  every tick.
- **Model check:** the engine replays about six weeks it hasn't seen, forecasting hour by hour whether
  the previous day's high and low would be touched. It scores itself against what happened, and shows the
  result against a flat guess. If it's ever doing worse than a flat guess, the terminal says so.
- **Market state:** volatility ranked against the last two months, trend efficiency (net move ÷ distance
  travelled) and momentum in standard deviations. These describe the market; they aren't signals.
- **Risk odds:** the chance each target (1R, 2R, 3R) comes before the stop on a market with no edge, and
  the win rate a trade needs to break even. It shows members what an edge has to beat.
- **Probability swarm:** a couple of hundred dots, each one possible path from the live price to the close,
  drawn with the same hour-by-hour volatility. A dot lights up when it touches a level; the share of dots
  that do settles on the engine's odds, and at the close they stack into the spread of where price could
  finish. It's the engine's maths, made visible. Tapping it starts a fresh run.
- **Engine briefing:** a paragraph written from the numbers, not by AI: today's move, how much of an
  average day's range is used, the likeliest level still in play, and the 68% close range.
- **When the market moves:** the typical move in each hour of the member's own day, with the current hour
  lit. Gold's daily break (17:00 to 18:00 New York) shows as a gap.
- **Testing a level:** a banner under the price when it's within a small fraction of an average day's
  range of a level it hasn't touched today.

## How the Playbook works

- **Logged before the result, and fixed.** A market order must be logged at the live price (within a tenth
  of an average day's range); a limit or stop order must wait on the right side of it. Once logged, the
  plan can't be edited or deleted: only its stop can move, and it can be closed. A close uses the latest
  price from the feed, never a typed number. There's no way to remove a losing trade.
- **Followed automatically.** Every 5 minutes the Worker reads the one-minute bars since the last check
  and settles what happened. Gold is checked every 15 minutes, to stay inside Twelve Data's free
  allowance: about 95 more requests on a weekday while a gold setup is open, so about 670 of the 800
  in all. Bitcoin is checked every 5 minutes from the exchanges.
- **Every doubt counts against the setup,** so the record can only look worse than the truth: a limit
  fills at its price and never better; a stop the market gaps through fills at the open; on the bar an
  order fills, its stop counts but its target doesn't; and when one bar reaches both the stop and the
  target, the stop came first. An order that isn't filled in time expires and doesn't count.
- **Results in R,** as the signal publisher counts them: the move from the fill to the exit, over the
  planned risk. The record takes off an assumed spread (0.30 on gold, 20 on Bitcoin) before averaging.
- **The no-edge odds** on each setup are the chance its target comes before its stop if the market moves
  at random: risk ÷ (risk + reward), 33% for a 2R target. With no edge, the average result is zero before
  costs, whatever the stop, target or management. So the record's chart shows the average after each
  result with the band the true average likely sits in (95%). The first read comes at 20 results; an
  edge shows only when the whole band clears zero. **Early reads** by reason, market and session appear
  from 20 results, labelled as questions, not evidence.
- **Posts.** Each setup goes out with the chart (if attached), the plan, the reasons as hashtags (tap one
  in Telegram to see every setup with it), the no-edge odds and the record so far. Fills, stop moves and
  results are replies to it.
- **A record that shows edits.** Everything that happens is added to a chained record: each entry holds
  the hash of the one before, so changing or deleting anything later breaks the chain. Each post carries
  the start of its entry's hash (`ref`).
- **The export.** Posters see **Send me the whole record** under the Playbook: the bot sends it to them as
  a file, one JSON line per setup and per entry, with the chain checked. This is what TCP AI will learn
  from: every setup with its reasons, the engine's read of the market at that moment (volatility, trend,
  momentum, sessions and nearby levels), and the result. (The bot has to have been started by the poster,
  which it has if you've ever pressed Start.)

## Coming soon, and Notify me

The Signals, AI and Account tabs show what's planned, each clearly marked:
- **Signals:** how a signal will travel: the algo (in forward test), the Inner Circle and the terminal,
  the TCP EA (dry run), then members' own accounts (copy trading, coming soon). Below it, an example
  signal card, stamped EXAMPLE.
- **AI:** trade reviews, market briefings, Ask TCP AI and an AI coach, all marked Soon.
- **Account:** the member's name, account connection (MT5 or wallet, read-only), the stats they'll see
  after connecting (profit factor, win rate, average R, max drawdown), and price and odds alerts.

A member who taps **Notify me** sees "You're on the list", and the team group gets a message:
`💡 Wants copy trading`, their name and @username, and `ID: 123456789`. Each member's tap is passed on once
per feature, and their phone remembers it. Nothing is added to a list anywhere else, so the team group's
messages are the list. Reply to one, as with the bot's lead cards, and the bot passes your reply to that member.

## For developers

- Source: `src/lib.js` (the maths, shared by the page and the Worker), `src/playbook-lib.js` (the
  Playbook's maths, shared too), `src/app.html`, `src/app.css`, `src/playbook-page.js` and `src/app.js`
  (the page), `src/playbook.js` and `src/worker.js` (the Worker), `src/fonts/` (Latin subsets of the brand
  fonts, SIL Open Font License).
- `npm run build` writes `dist/worker.js`, the one file for the dashboard. `npm test` builds, then runs 86 tests:
  - the maths: trading days across daylight saving, levels, sessions and lot sizes;
  - the probability engine, including a simulated market with no edge on which its forecasts must come
    true at the rate they claim, and a timing check for the Workers CPU limit;
  - Telegram sign-in, the members-only gate, caching, the price feeds (each Bitcoin exchange failing in
    turn, and gold's closed-hours bars) and Notify me;
  - a check that the built file serves the page and signs members in the same way;
  - the Playbook's maths: fills, gaps, stops and targets on the same bar, expiry, R and costs, the band
    and the verdict, including simulated records with no edge (which must rarely look like an edge) and
    with a known edge (whose band must hold the truth about 95% of the time);
  - the Playbook end to end, with D1 on Node's built-in SQLite: logging, checks against the live price,
    posts and photos, the 5-minute check (gold's 15-minute pace, closed hours, Bitcoin's exchanges), the
    buttons, two writers at once, test and live runs, and the export with a tampered entry.
- Add `?demo` to the address to see made-up prices in a browser, for design work. It shows no member data,
  and Notify me there tells nobody. Add `&gold=4286&btc=84460` to move the made-up prices to today's level
  (for promo footage). The demo Playbook's results sit near the no-edge odds on purpose, so a screenshot
  of it can't pass for a winning record.
