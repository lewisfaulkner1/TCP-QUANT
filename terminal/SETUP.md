# TCP Quant Terminal · setup

About 15 minutes, and free. The terminal opens inside Telegram for Inner Circle members. It has:
- live gold and Bitcoin charts with key levels and a probability cone;
- a probability engine with its own model check, a plain-English briefing, and the probability swarm;
- market state, volatility, when each market moves hour by hour, and a session clock;
- a lot-size calculator with the odds for each target;
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

## Updating

Paste the new `terminal/dist/worker.js` into **Edit code** and press **Deploy**. Settings stay as they are.

## Good to know

- **Who gets in:** anyone in the Inner Circle (or the team group). Telegram vouches for who opened it,
  and the terminal asks Telegram whether they're a member, reusing the answer for up to 10 minutes. Someone
  who leaves loses access within 10 minutes; someone just approved gets in within a minute.
- **Nothing is stored** and nobody logs in. The bot token stays in Cloudflare's secrets and never reaches the page.
  The only thing the terminal sends anywhere is a Notify me tap: the member's name, @username and Telegram ID,
  posted to the team group.
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

- Source: `src/lib.js` (the maths, shared by the page and the Worker), `src/app.html`, `src/app.css` and
  `src/app.js` (the page's markup, styles and script), `src/worker.js` (the Worker), `src/fonts/` (Latin
  subsets of the brand fonts, SIL Open Font License).
- `npm run build` writes `dist/worker.js`, the one file for the dashboard. `npm test` builds, then runs 37 tests:
  - the maths: trading days across daylight saving, levels, sessions and lot sizes;
  - the probability engine, including a simulated market with no edge on which its forecasts must come
    true at the rate they claim, and a timing check for the Workers CPU limit;
  - Telegram sign-in, the members-only gate, caching, the price feeds (each Bitcoin exchange failing in
    turn, and gold's closed-hours bars) and Notify me;
  - a check that the built file serves the page and signs members in the same way.
- Add `?demo` to the address to see made-up prices in a browser, for design work. It shows no member data,
  and Notify me there tells nobody.
