# TCP — The Crypto Playbooks · brand kit

Tagline: **Trade the playbook.**

## Logo concepts

| | Concept | Idea | Profile picture |
|---|---|---|---|
| A | Playbook | An open book whose spine is a candlestick | `logo/a-playbook/profile-picture-1080.png` |
| B | Mint | A minted gold coin: gold today, crypto next | `logo/b-mint/profile-picture-1080.png` |
| C | Monogram | The C of TCP holds a candlestick | `logo/c-monogram/profile-picture-1080.png` |

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

`source/build_logos.py` draws every logo from code; `source/render.js`
turns the SVGs into PNGs. To change a colour or shape, edit the script and
rebuild (needs Python with `fonttools`, plus Archivo from Google Fonts saved
as `source/fonts/archivo-semiexp-600.ttf` and `source/fonts/archivo-700.ttf`):

```
cd brand/source && python3 build_logos.py out
```
