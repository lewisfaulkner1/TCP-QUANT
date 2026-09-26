# TCP Card Studio

A single-page tool that makes branded images for Telegram and socials:

- **Signal card**: market, buy or sell, entry, stop loss, take profits, risk : reward, status stamp
  (TP hit, stopped, breakeven, closed early), and a "Why I took it" note for A+ setups.
- **Weekly results card**: net R, trades, wins, losses, breakeven, win rate, the cumulative-R line
  and every trade in the week.

Each card comes in three sizes (1080 × 1080, 1080 × 1350, 1080 × 1920) and has a matching caption
to copy. Example data is watermarked EXAMPLE until it's edited, so a sample card can't be posted by
mistake. Drafts are kept in the viewer's own browser.

Live page: published as a private Claude artifact ("TCP Card Studio"). Share it from its Share menu.

## Editing

`card-studio.html` is generated. The card drawing lives in **`cards.cjs`**, which the VPS signal
publisher (`signals/`) uses too, so both draw identical cards. Change `cards.cjs` (the cards) or
`template.html` (the page), then run:

```
python3 build.py
```

`build.py` inlines `cards.cjs`, the display font (`tcp-display-800.woff2`, Archivo Expanded ExtraBold,
SIL OFL, subset to Latin) and the header crown (from `logo.json`, the official logo's geometry). Body,
serif and mono faces load from Google Fonts on the page; the VPS bundles them in `signals/fonts/`.

Win/loss colours (`#35A68C` / `#E0613F`) were checked against the card background for colour-blind
separation.
