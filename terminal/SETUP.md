# TCP Quant Terminal · setup

About 15 minutes, and free. The terminal opens inside Telegram for Inner Circle members:
live gold and Bitcoin charts with key levels, volatility, the session clock and a lot-size
calculator. You need the Cloudflare account the bot runs on, BotFather, and a free Twelve Data account.

## 1. Put the terminal online (Cloudflare Workers, free)

1. In Cloudflare, go to **Workers & Pages → Create → Create Worker**, name it `tcp-terminal`, and press **Deploy**.
2. Press **Edit code**, delete what's there, paste the whole of `terminal/dist/worker.js`, and press **Deploy**.
3. In the Worker's **Settings → Variables and Secrets**, add:
   - `BOT_TOKEN` (**Secret**): the same token as the onboarding bot. The terminal uses it to check that
     people really opened it from Telegram, and to ask Telegram who's in the Inner Circle.
   - `INNER_CIRCLE_CHAT_ID` (Text): the same number as in the bot's settings.
   - `ADMIN_CHAT_ID` (Text, optional): the team group, so the team gets in too. The bot must be an admin
     there for Telegram to answer.
   - `TWELVE_DATA_KEY` (**Secret**): see step 2.

   Press **Deploy**.
4. Note the Worker's address, for example `https://tcp-terminal.yourname.workers.dev`. Opened in a normal
   browser it says "Open the terminal from Telegram". That's expected.

## 2. Gold prices: a free Twelve Data key

1. Sign up at **twelvedata.com** (the free Basic plan).
2. Copy the API key from your dashboard into the `TWELVE_DATA_KEY` secret, and press **Deploy**.

The free plan allows 800 requests a day. The terminal refreshes gold every 5 minutes while gold is open
and shares each refresh with every member: about 550 requests on a weekday, far fewer at weekends. If
the allowance ever runs out, members see the last prices, marked as such. Bitcoin comes from Coinbase
and needs no key.

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
- **The data:** gold is XAU/USD spot from Twelve Data, Bitcoin is BTC-USD from Coinbase, and exchange rates
  for GBP and EUR accounts are the European Central Bank's. Brokers' prices differ slightly.
- **The levels** are standard reference levels: previous day and week, today's opens, session highs and lows,
  and round numbers. Gold's day ends at 17:00 New York, as on broker charts; Bitcoin uses UTC days.
  The algo's own zones join the terminal only after the forward test.
- **The calculator** rounds down to 0.01 lots. Members can check their broker's contract size in MT5.

## For developers

- Source: `src/lib.js` (the maths, shared by the page and the Worker), `src/app.html` (the page),
  `src/worker.js` (the Worker), `src/fonts/` (Latin subsets of the brand fonts, SIL Open Font License).
- `npm run build` writes `dist/worker.js`, the one file for the dashboard. `npm test` builds, then runs
  22 tests: the maths (trading days across daylight saving, levels, sessions, lot sizes), Telegram sign-in,
  the members-only gate, caching and the price feeds, plus a check that the built file serves the page and
  signs members in the same way.
- Add `?demo` to the address to see made-up prices in a browser, for design work. It shows no member data.
