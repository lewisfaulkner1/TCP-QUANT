# TCP roadmap

What's built, what comes next, and the decisions behind it. Updated as work lands.

## Built

- **Brand:** logo pack, intro and outro videos, the Quant Terminal launch film, business cards with a
  tracked QR code, captions.
- **Reels** (`brand/source/reels`): a studio that turns a short script into a finished vertical video,
  with an AI voice, word-by-word subtitles, graphics, footage of the terminal and original music. Batch 1
  is 14 reels for TikTok and Instagram (the Trading maths series, the terminal, the Playbook, the
  leaderboard, prop challenge maths, the brand sting) and the welcome video, with captions and a two-week plan
  (`brand/video/reels/POSTS.md`) and the profile setup (`community/SOCIAL.md`).
- **Animated episodes** (`brand/source/reels/toon`, `brand/video/reels/EPISODES.md`): the founder as an
  animated character, drawn in code so he looks the same in every shot, for the TikTok series in the
  animated master brief. EP02, *Every Trader Has Done This*, is made in two cuts (TCP's account and the
  founder's), with its production package and posting times. Lewis approved character sheet V6 on
  5 October 2026.
- **Community:** the Inner Circle kit (description, welcome, rules, post formats, topics, banner), and
  the pinned posts for Start here (`community/PINNED.md`).
- **Onboarding bot:** link in bio → 18+ check → broker → verification → single-use invite, with the
  lead's source on every card and a referral scoreboard.
- **Signal publisher:** the algo's signals, updates and weekly results as branded cards, test mode first.
- **Quant Terminal** (Telegram Mini App):
  - markets: live gold and Bitcoin, levels, the probability engine and its model check, the probability
    swarm, market state, volatility by hour, sessions;
  - risk: lot sizes for USD, GBP and EUR accounts, with each target's no-edge odds; and the prop challenge
    simulator: a member's numbers through a challenge 4,000 times on their phone, the pass chance against
    a trader with no edge, allowing for how sure their win rate is, and the pass chance at each risk level;
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

- **The reels teach; the bot sells.** No reel asks viewers to open an account: in the UK, inviting people
  to open a CFD account is a financial promotion. The link in bio leads to the bot, which shows the
  partner disclosure and risk warning first. AI voices are labelled, demo data is labelled, and every
  figure in a reel is worked out.
- **The animated founder is drawn, not generated.** A character built from fixed shapes can't drift
  between shots, which AI video still does. Episodes ask viewers to follow, not to join: the Inner Circle
  needs a broker account, so it isn't advertised as free. Story charts say they're examples.

## Next, free

1. **The week's leaderboard in the Inner Circle:** every Saturday, the top of the week's table as a
   branded card with the green and red counts and each trader's worst day, test mode first. No prizes.
2. **Price and odds alerts:** a Telegram message when gold or Bitcoin reaches a level, or when the chance
   of a touch passes a line. Runs on the existing 5-minute check.
3. **Economic calendar and news risk:** this week's high-impact events (NFP, CPI, FOMC) on the Markets
   tab, with a warning before them and the engine's widened range around them.
4. **The simulator for a funded or personal account:** the drawdowns and losing streaks a win rate and R
   imply over a year, beside the prop challenge. Pure maths, in the Risk tab.
5. **Macro card:** real yields and the dollar against gold (FRED, free key), and positioning from the
   CFTC's weekly Commitments of Traders.
6. **Session statistics:** how gold usually moves in each session and on each weekday, from its own
   history, with sample sizes.
7. **The website:** the same terminal in a normal browser with Telegram Login (free), then installable
   on phones as an app from the website (a PWA, free).
8. **More animated episodes:** the rest of the master brief, made with the approved founder, one idea
   each.

## When there's a budget

- **TCP AI on:** an Anthropic key for the session briefs (about $0.20 to $0.30 a brief).
- **Ask TCP AI**, **AI trade reviews** from each member's MT5 history, **Snap to log**, a weekly **AI coach**.
- **Members' private chart checks**, capped per day.
- **Verified connections at scale:** the bridge on an always-on Windows VPS instead of a PC.
- **App Store and Google Play:** the same app wrapped for the stores (Apple charges $99 a year, Google $25
  once). Store review is stricter for trading apps: disclaimers, data collection and, if you charge inside
  the app, the stores' own payments.
