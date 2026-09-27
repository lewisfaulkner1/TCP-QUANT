# Onboarding bot: the flow

Built: `bot/worker.js` (a Cloudflare Worker). Setup: `bot/SETUP.md`. Quoted
messages are Lewis's wording; everything is editable in the `TEXT` block at the
top of `worker.js`.

## 1. Greeting (sent automatically on /start)

> 👋 Thanks for reaching out
> Lewis or his team will be with you shortly to assist you further

## 2. Eligibility

> Hey, how are you doing?
>
> Before we get started I need to make sure you are eligible to join our community.
>
> Are you 18 years old or older?
>
> Once answered I will get the rest of the details sent across and I will answer any questions you may have. Thanks!

Buttons: **✅ Yes, I'm 18+** · **No, I'm under 18**

- **Yes** →
  > 👍🏼 Great, you qualified. Let's get you set up!

  then a short "how the Inner Circle works" message (with the partner disclosure and risk line),
  and a 🟡 **New lead** card goes to the team group.
- **No** → a polite close.

## 3. Broker account

> Do you already have a PU Prime or Vantage account?

Buttons: **Yes, PU Prime** · **Yes, Vantage** · **Not yet**

- **Not yet** → choose a broker → sign-up steps with a button to Lewis's partner link.
- **Yes** → steps to move the account under Lewis's partner code (people who already signed up
  through the link skip straight to Done).

## 4. Account number

After **✅ Done** the bot asks for the account number. The reply goes to the team group as a
🟢 **Ready to verify** card, with the broker and the **Source** the person came from (the tag in their
link: `ig`, `tt`, `card`, `card_sam` ...), so a sign-up can be credited to the right platform or team card.

## 5. Hand-off

In the team group:

- Reply to any card to message that person through the bot.
- Reply `/approve` to send a single-use Inner Circle invite (expires in 7 days).
- Anything else people send the bot arrives as a 💬 **Message** card.

## 6. Referral scoreboard

With the optional database, `/stats` in the team group counts each link's people through Start →
18+ → account number → approved, for the last 7 days and all time, with an optional Monday post.
A team member's card and link count together. Setup: `bot/SETUP.md`, section 6.
