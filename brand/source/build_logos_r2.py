"""Round 2 logo concepts for TCP, built on what the community already knows:
the crown (TCP Inner Circle), the coin and the wings. Font-free SVGs, like
round 1. Usage: python3 build_logos_r2.py <out_dir>
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_logos import (GOLD, GOLD_DEEP, INK, IVORY, WORD_W, Font, crop_icon,  # noqa: E402
                         ntos, svg, wordmark, write)

ROYAL = "#241640"  # deep royal purple ground, a nod to the current purple wings

DESC = Font("archivo-semiexp-600.ttf")
SERIF = Font("instrument-serif.ttf")
NAME = "THE CRYPTO PLAYBOOK"


def descriptor(text, width, fill, top=100.0, gap=24.0, tracking=0.30):
    """Tracked caps justified to `width`, cap top `gap` below `top`.
    Returns (svg, baseline)."""
    size, x0 = DESC.fit_width(text, width, tracking)
    base = top + gap + size * DESC.cap / DESC.upm
    return f'<path fill="{fill}" d="{DESC.run(text, size, tracking, x0, base)}"/>', base


def crown(x, y, w, h, fill):
    """Three-point crown with jewels, in the box (x, y, w, h)."""
    pts = [(0.07, 0.80), (0.0, 0.26), (0.30, 0.52), (0.5, 0.12), (0.70, 0.52), (1.0, 0.26), (0.93, 0.80)]
    body = "M" + "L".join(f"{ntos(x + px * w)} {ntos(y + py * h)}" for px, py in pts) + "Z"
    band = f"M{ntos(x + 0.07 * w)} {ntos(y + 0.86 * h)}H{ntos(x + 0.93 * w)}V{ntos(y + h)}H{ntos(x + 0.07 * w)}Z"
    jewels = "".join(f'<circle cx="{ntos(x + px * w)}" cy="{ntos(y + py * h)}" r="{ntos(0.065 * w)}" fill="{fill}"/>'
                     for px, py in ((0.0, 0.20), (0.5, 0.06), (1.0, 0.20)))
    return f'<path fill="{fill}" d="{body}{band}"/>{jewels}'


# ------------------------------------------------------------- the icons
# All drawn in a 240 x 240 box.
def icon_crown_candles(fill):
    """D: a solid crown with three candlesticks cut through it (true holes)."""
    x, y, w, h = 24, 36, 192, 160

    def P(px, py):
        return f"{ntos(x + px * w)} {ntos(y + py * h)}"
    d = ["M" + "L".join(P(*p) for p in [(0.06, 0.78), (0.0, 0.24), (0.30, 0.42), (0.5, 0.08),
                                         (0.70, 0.42), (1.0, 0.24), (0.94, 0.78)]) + "Z",
         f"M{P(0.06, 0.84)}H{ntos(x + 0.94 * w)}V{ntos(y + h)}H{ntos(x + 0.06 * w)}Z"]
    for cx, bt, bb, wt, wb in ((0.21, 0.50, 0.68, 0.43, 0.74), (0.5, 0.32, 0.64, 0.22, 0.74),
                               (0.79, 0.50, 0.68, 0.43, 0.74)):
        X = x + cx * w
        # body and wick as one outline, so evenodd cuts a single candle-shaped hole
        d.append(f"M{ntos(X - 2.5)} {ntos(y + wt * h)}h5v{ntos((bt - wt) * h)}h6.5v{ntos((bb - bt) * h)}"
                 f"h-6.5v{ntos((wb - bb) * h)}h-5v{ntos(-(wb - bb) * h)}h-6.5v{ntos(-(bb - bt) * h)}h6.5z")
    jewels = "".join(f'<circle cx="{ntos(x + px * w)}" cy="{ntos(y + py * h)}" r="11" fill="{fill}"/>'
                     for px, py in ((0.0, 0.19), (0.5, 0.03), (1.0, 0.19)))
    return f'<path fill="{fill}" fill-rule="evenodd" d="{"".join(d)}"/>{jewels}'


CROWN_CANDLES_BOX = (13, 29.8, 227, 196)


def icon_crowned_coin(gold):
    """E: the current logo, grown up. Crown on a coin; a candle replaces the BTC
    sign. Ring and candle are true holes (evenodd), so it sits on any background."""
    def circ(r):
        return f"M{ntos(120 - r)} 146a{ntos(r)} {ntos(r)} 0 1 0 {ntos(2 * r)} 0a{ntos(r)} {ntos(r)} 0 1 0 {ntos(-2 * r)} 0z"
    candle = "M116.5 94h7v22h6.5v60h-6.5v22h-7v-22h-6.5v-60h6.5z"
    return (f'<path fill="{gold}" fill-rule="evenodd" d="{circ(84)}{circ(74.5)}{circ(71.5)}{candle}"/>'
            + crown(78, 10, 84, 46, gold))


CROWNED_COIN_BOX = (36, 7, 204, 230)


def icon_candle_wings(fill):
    """F: a candlestick with swept wings (the current logo's wings, sharpened)."""
    d = ["M108 92h24v64h-24zM116.5 58h7v128h-7z"]
    for y0, h, x_tip, rise in ((92, 20, 22, 18), (120, 20, 44, 12), (148, 20, 66, 6)):
        d.append(f"M98 {y0}L{x_tip} {y0 - rise}L{x_tip + 14} {y0 - rise + h}L98 {y0 + h}Z")
        xt = 240 - x_tip
        d.append(f"M142 {y0}L{xt} {y0 - rise}L{xt - 14} {y0 - rise + h}L142 {y0 + h}Z")
    return f'<path fill="{fill}" d="{"".join(d)}"/>'


CANDLE_WINGS_BOX = (22, 58, 218, 186)


# ---------------------------------------------------- G: serif + crown
SERIF_TRACK = 0.06


def serif_tcp(fill):
    """TCP set in Instrument Serif, cap height 100, ink starting at x=0."""
    size = 100 * SERIF.upm / SERIF.cap
    xmin, _, xmax, _ = SERIF.bounds("TCP", size, SERIF_TRACK)
    return f'<path fill="{fill}" d="{SERIF.run("TCP", size, SERIF_TRACK, -xmin, 100)}"/>', xmax - xmin


def crown_serif(crown_fill, word_fill, desc_fill=None):
    """Crown above serif TCP (and optionally the descriptor). Returns (svg, w, h)."""
    word, ww = serif_tcp(word_fill)
    cw = ww * 0.40
    ch = cw * 0.56
    gap = 20
    parts = [crown((ww - cw) / 2, 0, cw, ch, crown_fill),
             f'<g transform="translate(0 {ntos(ch + gap)})">{word}']
    h = ch + gap + 100
    if desc_fill:
        dsvg, base = descriptor(NAME, ww, desc_fill, gap=26)
        parts.append(dsvg)
        h = ch + gap + base
    parts.append("</g>")
    return "".join(parts), ww, h


# ------------------------------------------------------------- lockups
def lockup_h(icon_body, box, icon_h, word_fill, desc_fill, text=NAME, gap=46):
    x0, y0, x1, y1 = box
    dsvg, base = descriptor(text, WORD_W, desc_fill)
    k = icon_h / (y1 - y0)
    iy = (base - icon_h) / 2
    x = (x1 - x0) * k + gap
    body = (f'<g transform="translate({ntos(-x0 * k)} {ntos(iy - y0 * k)}) scale({k:.5f})">{icon_body}</g>'
            f'<g transform="translate({ntos(x)} 0)">{wordmark(word_fill)}{dsvg}</g>')
    top, bottom = min(-2.0, iy), max(base + 2, iy + icon_h)
    w, pad = x + WORD_W, 6
    return svg(w + 2 * pad, bottom - top + 2 * pad, body,
               vb=f"{-pad} {ntos(top - pad)} {ntos(w + 2 * pad)} {ntos(bottom - top + 2 * pad)}")


def lockup_stacked(icon_body, box, icon_h, word_fill, desc_fill, text=NAME, gap=46):
    x0, y0, x1, y1 = box
    k = icon_h / (y1 - y0)
    iw = (x1 - x0) * k
    dsvg, base = descriptor(text, WORD_W, desc_fill)
    body = (f'<g transform="translate({ntos((WORD_W - iw) / 2 - x0 * k)} {ntos(-y0 * k)}) scale({k:.5f})">{icon_body}</g>'
            f'<g transform="translate(0 {ntos(icon_h + gap)})">{wordmark(word_fill)}{dsvg}</g>')
    h, pad = icon_h + gap + base, 6
    return svg(WORD_W + 2 * pad, h + 2 * pad, body, vb=f"{-pad} {-pad} {ntos(WORD_W + 2 * pad)} {ntos(h + 2 * pad)}")


def plain(body, w, h, pad=6):
    return svg(w + 2 * pad, h + 2 * pad, body, vb=f"{-pad} {-pad} {ntos(w + 2 * pad)} {ntos(h + 2 * pad)}")


if __name__ == "__main__":
    # D: Crown Candles
    D = "d-crown-candles"
    write(f"{D}/icon-gold.svg", crop_icon(icon_crown_candles(GOLD), CROWN_CANDLES_BOX, 4))
    write(f"{D}/icon-deepgold.svg", crop_icon(icon_crown_candles(GOLD_DEEP), CROWN_CANDLES_BOX, 4))
    write(f"{D}/lockup-on-dark.svg", lockup_h(icon_crown_candles(GOLD), CROWN_CANDLES_BOX, 150, IVORY, GOLD))
    write(f"{D}/lockup-on-light.svg", lockup_h(icon_crown_candles(GOLD_DEEP), CROWN_CANDLES_BOX, 150, INK, GOLD_DEEP))
    write(f"{D}/lockup-stacked-on-dark.svg", lockup_stacked(icon_crown_candles(GOLD), CROWN_CANDLES_BOX, 180, IVORY, GOLD))
    write(f"{D}/inner-circle-on-dark.svg", lockup_h(icon_crown_candles(GOLD), CROWN_CANDLES_BOX, 150, IVORY, GOLD, text="INNER CIRCLE"))

    # E: Crowned Coin
    E = "e-crowned-coin"
    write(f"{E}/icon-gold.svg", crop_icon(icon_crowned_coin(GOLD), CROWNED_COIN_BOX, 4))
    write(f"{E}/icon-deepgold.svg", crop_icon(icon_crowned_coin(GOLD_DEEP), CROWNED_COIN_BOX, 4))
    write(f"{E}/lockup-on-dark.svg", lockup_h(icon_crowned_coin(GOLD), CROWNED_COIN_BOX, 176, IVORY, GOLD, gap=40))
    write(f"{E}/lockup-on-light.svg", lockup_h(icon_crowned_coin(GOLD_DEEP), CROWNED_COIN_BOX, 176, INK, GOLD_DEEP, gap=40))

    # F: Candle Wings
    F = "f-candle-wings"
    write(f"{F}/icon-gold.svg", crop_icon(icon_candle_wings(GOLD), CANDLE_WINGS_BOX, 4))
    write(f"{F}/icon-deepgold.svg", crop_icon(icon_candle_wings(GOLD_DEEP), CANDLE_WINGS_BOX, 4))
    write(f"{F}/lockup-on-dark.svg", lockup_h(icon_candle_wings(GOLD), CANDLE_WINGS_BOX, 128, IVORY, GOLD))
    write(f"{F}/lockup-on-light.svg", lockup_h(icon_candle_wings(GOLD_DEEP), CANDLE_WINGS_BOX, 128, INK, GOLD_DEEP))

    # G: Crown + serif TCP
    for tone, crown_fill, word_fill, desc_fill in (("dark", GOLD, IVORY, GOLD), ("light", GOLD_DEEP, INK, GOLD_DEEP)):
        body, w, h = crown_serif(crown_fill, word_fill)
        write(f"g-crown-serif/icon-on-{tone}.svg", plain(body, w, h))
        body, w, h = crown_serif(crown_fill, word_fill, desc_fill)
        write(f"g-crown-serif/lockup-on-{tone}.svg", plain(body, w, h))
