# TCP onboarding bot · setup

About 20 minutes, and free. You need Telegram, a free Cloudflare account, and
your PU Prime and Vantage partner links and codes. A laptop makes step 2
easier than a phone.

## 1. Create the bot in Telegram

1. Open **@BotFather** in Telegram and send `/newbot`.
2. Name: `TCP Inner Circle`. Username: anything ending in `bot`, for example `TCPInnerCircleBot`.
3. BotFather replies with a **token** (it looks like `123456789:AA…`). The token is the bot's
   password: never post it in a chat, a screenshot or GitHub. You'll paste it once, into Cloudflare.
4. Send `/setuserpic`, pick the bot, and send
   `brand/logo/official/profile-picture-crown-royal-1080.png`.

## 2. Put the bot online (Cloudflare Workers, free)

1. Sign up at **dash.cloudflare.com**.
2. Go to **Workers & Pages → Create → Create Worker**, name it `tcp-bot`, and press **Deploy**.
3. Press **Edit code**, delete what's there, paste the whole of `bot/worker.js`, and press **Deploy**.
4. Note the Worker's address, for example `https://tcp-bot.yourname.workers.dev`.
5. In the Worker's **Settings → Variables and Secrets**, add two **Secrets**:
   - `BOT_TOKEN`: the token from BotFather
   - `WEBHOOK_SECRET`: make up 30 or more letters and numbers (only `-` and `_` are allowed as symbols)
6. Open this address in your browser, with your own Worker address and secret:
   `https://tcp-bot.yourname.workers.dev/setup?key=YOUR_WEBHOOK_SECRET`
   You should see `"ok": true`. The bot now answers messages.

The Cloudflare menu names may be worded slightly differently; the steps are the same.

## 3. Connect your groups and partner details

1. Create a private **team group** (for example "TCP Leads") with you and your team, and add the bot.
2. Send `/id` in the team group. The bot replies `Chat ID: -100…`. In Cloudflare, add a
   variable `ADMIN_CHAT_ID` (type Text) with that number, minus sign included.
3. Add the bot to the **TCP Inner Circle** as an admin with permission to **invite users via link**.
   Send `/id` there and add `INNER_CIRCLE_CHAT_ID` the same way. Delete the `/id` messages afterwards.
4. Add your partner details as Text variables: `PUPRIME_LINK`, `VANTAGE_LINK`, `PUPRIME_CODE`,
   `VANTAGE_CODE`. Press **Deploy**.

## 4. Test the whole flow

From your phone open `https://t.me/YourBotUsername?start=test`, then:

1. Tap **Yes, I'm 18+**, then **Not yet**, then **PU Prime**, then **✅ Done**.
2. Reply with a made-up account number.
3. In the team group you should see two cards: 🟡 **New lead** and 🟢 **Ready to verify**.
4. Reply to a card with a message: it arrives in your chat with the bot.
5. Reply `/approve` to the Ready to verify card: you receive a single-use Inner Circle invite.

## 5. Your link in bio

| Platform | Link |
|---|---|
| Instagram | `https://t.me/YourBotUsername?start=ig` |
| TikTok | `https://t.me/YourBotUsername?start=tt` |
| X | `https://t.me/YourBotUsername?start=x` |
| YouTube | `https://t.me/YourBotUsername?start=yt` |
| Business cards | the QR code on the card (`?start=card`; team cards use `card_<name>`, see `brand/business-cards/`) |
| A team member | `https://t.me/YourBotUsername?start=<name>`, e.g. `?start=sam` (their card uses `card_sam`) |

The tag after `start=` shows on each lead card as **Source**, so you can see which platform
brings members in.

## 6. Referral scoreboard (optional, free)

`/stats` in the team group shows each link's people at every step: tapped Start, passed the age
check, sent an account number, approved. It covers the last 7 days and all time. A team member's
card and link share one row (`card_laura` counts as `laura`), and whoever brings in the most
approvals comes first.

1. In Cloudflare, go to **Storage & Databases → D1 SQL Database → Create** and name it `tcp-bot-db`.
2. Open the `tcp-bot` Worker, then **Settings → Bindings → Add → D1 database**. Variable name: `DB`.
   Database: `tcp-bot-db`. Press **Deploy**.
3. If you haven't yet, paste the latest `bot/worker.js` (**Edit code**) and press **Deploy**. The bot
   creates its table itself.
4. For a Monday summary in the team group: **Settings → Trigger Events → Add → Cron Triggers**, and
   enter `0 8 * * 1` (Mondays at 08:00 UTC, which is 09:00 in UK summer time).
5. Send `/stats` in the team group. If other bots are in the group, send `/stats@YourBotUsername`.

How it counts:

- Each person counts once per step: the first time they reach it, under the link they came through.
- An approval counts only when the invite reached them.
- People who tapped Start before the database was added aren't on it.

Privacy: the scoreboard stores each person's Telegram ID, the steps they reached, the link they came
through and when. No names, messages or account numbers. To remove someone, open the database's
**Console** in Cloudflare and run `DELETE FROM steps WHERE user_id = 123456789;` with their ID (it's
on their cards).

## Daily use

- 🟡 **New lead · 18+**: someone passed the age check.
- 🟢 **Ready to verify**: someone sent their account number. The card shows their broker and
  where they came from (Source). Check the account in your partner portal, then reply `/approve`
  to the card. They get a single-use invite that expires in 7 days.
- 💬 **Message**: someone wrote to the bot. Reply to the card to answer; your reply is sent from the bot.
- 🏆 `/stats`: the referral scoreboard (section 6).

Keep your other Inner Circle invite links switched off, so every new member comes through the bot.

## Changing the wording

Every message is in the `TEXT` block at the top of `worker.js`. Edit it in Cloudflare
(**Edit code**), then **Deploy**. Keep the `(PU Prime · new account)` line at the end of
`accountQuestion`: the bot reads it back when someone replies.

## If something's wrong

- **The bot doesn't reply:** open the `/setup` link again and check `BOT_TOKEN`.
- **No cards in the team group:** `ADMIN_CHAT_ID` must be the exact number, minus sign included.
- **`/approve` says it couldn't create the invite:** the bot must be an admin in the Inner Circle
  with permission to invite users.
- **Anything else:** the Worker's **Logs** tab in Cloudflare shows each failed step (never the token).

## Good to know

- **Cost:** Cloudflare's free plan allows 100,000 requests a day, far more than the bot needs, and
  D1's free allowance is far more than the scoreboard needs.
- **Privacy:** without the scoreboard the bot stores nothing, and leads live in your Telegram team
  group. With it, see section 6 for what's stored.
- **Security:** the token and webhook secret live only in Cloudflare's encrypted secrets. This
  repository is public, so never put them in a file here.
- **Tests:** `cd bot && npm test` runs the whole conversation end to end without contacting Telegram.
  The scoreboard tests use Node's built-in SQLite in place of D1 (Node 22.13 or later).
