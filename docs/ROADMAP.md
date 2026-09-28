# TCP roadmap

What's built, what comes next, and the decisions behind it. Updated as work lands.

## Built

- **Brand:** logo pack, intro and outro videos, the Quant Terminal launch film, business cards with a
  tracked QR code, captions.
- **Community:** the Inner Circle kit (description, welcome, rules, post formats, topics, banner).
- **Onboarding bot:** link in bio → 18+ check → broker → verification → single-use invite, with the
  lead's source on every card and a referral scoreboard.
- **Signal publisher:** the algo's signals, updates and weekly results as branded cards, test mode first.
- **Quant Terminal** (Telegram Mini App):
  - markets: live gold and Bitcoin, levels, the probability engine and its model check, the probability
    swarm, market state, volatility by hour, sessions;
  - risk: lot sizes for USD, GBP and EUR accounts, with each target's no-edge odds;
  - the Playbook: Lewis's setups logged before the result, followed to the end, in a hash-chained record
    measured against no edge;
  - session briefs: Lewis's charts before each session, a draft from TCP AI (when it has a key), his
    check, the post, and every zone scored afterwards against a random walk;
  - the leaderboard: members connect MT5 read-only (the password encrypted on their phone, read only
    by the TCP bridge), and the Ranks tab shows the day, this and last week, and this and last month in
    percentages, with green and red counts, each trader's worst day and open trades, and a consistency
    ranking; under Account each member sees their own trading measured, with a verdict after 20 days.
- **TCP bridge** (`bridge/`): the Windows program that reads connected accounts and sends percentages.

## Decisions

- **Chart analysis that posts to the main chat stays with Lewis** (and anyone he names as a poster): one
  voice, checked before it goes out, and one cost. Members get their own private chart checks later, as a
  perk with a daily cap, never posted, once TCP AI has a budget.
- **TCP AI learns from Lewis's corrections, not by retraining.** His reading guide, what he changed in
  each draft and how the zones did go into every read. Everything is exportable as a dataset for training
  a model later.
- **The leaderboard shows percentages only.** Members connect MT5 with their investor (read-only)
  password, which is encrypted on their phone so that only the TCP bridge can read it: the Worker and its
  database never can. The bridge reads closed trades from the account's own history and sends back
  daily percentages; no balance leaves the bridge. Opt-in, with a nickname. It shows how many traders
  were green and red, and the worst day beside each week's and month's gain, because a table of top gains
  alone rewards gambling. No prizes for the biggest daily gain.

## Next, free

1. **The week's leaderboard in the Inner Circle:** every Saturday, the top of the week's table as a
   branded card with the green and red counts and each trader's worst day, test mode first. No prizes.
2. **Price and odds alerts:** a Telegram message when gold or Bitcoin reaches a level, or when the chance
   of a touch passes a line. Runs on the existing 5-minute check.
3. **Economic calendar and news risk:** this week's high-impact events (NFP, CPI, FOMC) on the Markets
   tab, with a warning before them and the engine's widened range around them.
4. **Edge simulator:** a member enters their win rate and average R; a thousand simulated futures show
   the drawdowns and losing streaks those numbers imply. Pure maths, in the Risk tab.
5. **Macro card:** real yields and the dollar against gold (FRED, free key), and positioning from the
   CFTC's weekly Commitments of Traders.
6. **Session statistics:** how gold usually moves in each session and on each weekday, from its own
   history, with sample sizes.
7. **The website:** the same terminal in a normal browser with Telegram Login (free), then installable
   on phones as an app from the website (a PWA, free).

## When there's a budget

- **TCP AI on:** an Anthropic key for the session briefs (about $0.20 to $0.30 a brief).
- **Ask TCP AI**, **AI trade reviews** from each member's MT5 history, **Snap to log**, a weekly **AI coach**.
- **Members' private chart checks**, capped per day.
- **Verified connections at scale:** the bridge on an always-on Windows VPS instead of a PC.
- **App Store and Google Play:** the same app wrapped for the stores (Apple charges $99 a year, Google $25
  once). Store review is stricter for trading apps: disclaimers, data collection and, if you charge inside
  the app, the stores' own payments.
