# TCP — The Crypto Playbook · brand kit

Tagline: **Trade the playbook.**

## Official logo

The gold crown with three candlesticks cut through it, above TCP and THE
CRYPTO PLAYBOOK, in metallic gold throughout. Chosen 26 Sep 2026.
Everything is in `logo/official/`:

| File | Use |
|---|---|
| `tcp-logo-stacked` | The main logo: posts, videos, website |
| `tcp-logo-horizontal` | Banners and headers (X, YouTube, email) |
| `tcp-badge` | Crown + TCP without the tagline, for tight spaces |
| `tcp-crown` | The crown alone: watermarks, favicons, stickers |
| `tcp-inner-circle-stacked` / `-horizontal` | The Telegram group and members' material |
| `profile-picture-1080.png` (+ `-royal`) | Profile picture: crown + TCP |
| `profile-picture-crown-1080.png` (+ `-royal`) | Profile picture: the crown only |
| `…-flat` | Flat gold, for small sizes, print and embroidery |
| `…-on-light` | Deep gold, for white or light backgrounds |

`.svg` files stay sharp at any size (web, print, merch). `.png` files have a
transparent background and are the ones to upload to social apps.

## Palette

| Name | Hex | Use |
|---|---|---|
| Ink | `#0E0D0B` | Backgrounds |
| Coal | `#1A1814` | Cards and panels |
| Gold | `#D8AD4E` | Accents, buttons, flat logo |
| Gold foil | `#F6E3A3` → `#D8AD4E` → `#B0812F` → `#E3C06D` | The logo only (top-to-bottom gradient) |
| Deep gold | `#7C5A1C` | Gold on light backgrounds |
| Ivory | `#F2ECDF` | Text on dark; light backgrounds |
| Stone | `#A69D8C` | Secondary text |
| Royal | `#241640` | Inner Circle ground; carries on the old logo's purple |

## Type (free on Google Fonts)

- **Archivo Expanded ExtraBold** (weight 800, width 125) — headlines
- **Instrument Serif Italic** — one accent word per headline, in gold
- **Archivo** Regular — body copy
- **JetBrains Mono** — labels, tickers and prices

## House rules

- Keep the risk line on every promotional graphic.
- Disclose the PU Prime partner link wherever you ask people to open an account.
- Show results in full, losses included, or don't show them.

## Explorations (for reference)

- `logo/final/` — the final two, Regal and Bold, before the choice (`overview.png`)
- `logo/round-2/` — round 2: Crown Candles, Crowned Coin, Candle Wings, Crown Serif (`overview.png`)
- `logo/a-playbook/`, `logo/b-mint/`, `logo/c-monogram/`, `logo/wordmark/` — round 1

## Rebuilding the logo files

`source/build_logos_final.py` draws the official logo (and the final two)
from code; `source/build_logos_r2.py` and `source/build_logos.py` draw the
earlier rounds; `source/render.js` turns SVGs into PNGs. To change a colour
or shape, edit the script and rebuild. This needs Python with `fonttools`,
plus these Google Fonts saved in `source/fonts/`: `archivo-semiexp-600.ttf`,
`archivo-700.ttf`, `instrument-serif.ttf` and `cinzel-700.ttf`.

```
cd brand/source && python3 build_logos_final.py out_final
```
