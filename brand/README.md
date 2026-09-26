# TCP — The Crypto Playbooks · brand kit

Tagline: **Trade the playbook.**

## Logo concepts

| | Concept | Idea | Profile picture |
|---|---|---|---|
| A | Playbook | An open book whose spine is a candlestick | `logo/a-playbook/profile-picture-1080.png` |
| B | Mint | A minted gold coin: gold today, crypto next | `logo/b-mint/profile-picture-1080.png` |
| C | Monogram | The C of TCP holds a candlestick | `logo/c-monogram/profile-picture-1080.png` |

### Round 2

Built on what the TCP Inner Circle already knows: the crown, the coin and the
wings. These use the name as it appears on the current logo, THE CRYPTO
PLAYBOOK. Files are in `logo/round-2/`.

| | Concept | Idea | Profile picture |
|---|---|---|---|
| D | Crown Candles | A crown with three candlesticks cut through it | `d-crown-candles/profile-picture-1080.png` (+ `-royal`) |
| E | Crowned Coin | The current logo grown up: crown on a coin, a candle in place of the ₿ | `e-crowned-coin/profile-picture-1080.png` (+ `-royal`) |
| F | Candle Wings | A candlestick with swept wings | `f-candle-wings/profile-picture-1080.png` |
| G | Crown Serif | A small crown over TCP in an elegant serif | `g-crown-serif/profile-picture-1080.png` |

D also has `inner-circle-on-dark`, the lockup for the Telegram group.

The campaign graphics use concept A until one is chosen.

## Files

Each concept folder holds:

- `icon-gold` — the mark alone, for dark backgrounds
- `icon-deepgold` — the mark alone, for light backgrounds
- `lockup-on-dark` / `lockup-on-light` — mark + TCP wordmark + THE CRYPTO PLAYBOOKS
- `lockup-stacked-on-dark` — mark above the wordmark (A and B)
- `profile-picture-1080.png` — ready to upload as a profile picture
- B only: `coin` (full seal with ring text) and `coin-simple` (for small sizes)

`logo/wordmark/` is the TCP wordmark with no mark.

`.svg` files stay sharp at any size (web, print, merch). `.png` files have a
transparent background and are the ones to upload to social apps.

## Palette

| Name | Hex | Use |
|---|---|---|
| Ink | `#0E0D0B` | Backgrounds |
| Coal | `#1A1814` | Cards and panels |
| Gold | `#D8AD4E` | Logo, accents, buttons |
| Deep gold | `#7C5A1C` | Gold on light backgrounds |
| Ivory | `#F2ECDF` | Text on dark; light backgrounds |
| Stone | `#A69D8C` | Secondary text |
| Royal | `#241640` | Optional ground; carries on the current logo's purple |

## Type (free on Google Fonts)

- **Archivo Expanded ExtraBold** (weight 800, width 125) — headlines
- **Instrument Serif Italic** — one accent word per headline, in gold
- **Archivo** Regular — body copy
- **JetBrains Mono** — labels, tickers and prices

## House rules

- Keep the risk line on every promotional graphic.
- Disclose the PU Prime partner link wherever you ask people to open an account.
- Show results in full, losses included, or don't show them.

## Rebuilding the logo files

`source/build_logos.py` (round 1) and `source/build_logos_r2.py` (round 2)
draw every logo from code; `source/render.js` turns the SVGs into PNGs. To
change a colour or shape, edit the script and rebuild. This needs Python with
`fonttools`, plus these Google Fonts saved in `source/fonts/`:
`archivo-semiexp-600.ttf`, `archivo-700.ttf` and `instrument-serif.ttf`.

```
cd brand/source && python3 build_logos.py out && python3 build_logos_r2.py out2
```
