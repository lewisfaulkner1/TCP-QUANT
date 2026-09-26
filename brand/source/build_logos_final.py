"""TCP final logo candidates: the Crown Candles crown over TCP, in two
voices. "bold" sets TCP in the heavy geometric wordmark; "regal" sets it in
Cinzel. Each comes flat and in a gold-foil finish.
Usage: python3 build_logos_final.py <out_dir>
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_logos import (GOLD, GOLD_DEEP, INK, IVORY, WORD_W, Font, ntos, svg,  # noqa: E402
                         wordmark, write)

NAME = "THE CRYPTO PLAYBOOK"
DESC = Font("archivo-semiexp-600.ttf")
REGAL = Font("cinzel-700.ttf")
REGAL_TRACK = 0.06

FOIL = ('<linearGradient id="{id}" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#F6E3A3"/><stop offset="0.42" stop-color="#D8AD4E"/>'
        '<stop offset="0.72" stop-color="#B0812F"/><stop offset="1" stop-color="#E3C06D"/></linearGradient>')


class Paint:
    """Fill colours for one rendering: crown, word, descriptor (+ optional foil)."""
    def __init__(self, crown, word, desc, foil=False):
        self.crown, self.word, self.desc, self.foil = crown, word, desc, foil

    def defs(self):
        return f"<defs>{FOIL.format(id='foil')}</defs>" if self.foil else ""

    def c(self):
        return "url(#foil)" if self.foil else self.crown


ON_DARK = Paint(GOLD, IVORY, GOLD)
ON_DARK_FOIL = Paint(GOLD, IVORY, GOLD, foil=True)
ALL_GOLD_FOIL = Paint(GOLD, "url(#foil)", GOLD, foil=True)
ON_LIGHT = Paint(GOLD_DEEP, INK, GOLD_DEEP)


# ------------------------------------------------------------------ crown
CROWN_ASPECT = 1.2  # width / height of the crown box


def crown(fill, x, y, w):
    """The Crown Candles crown in the box (x, y, w, w / 1.2). Candles are true holes."""
    h = w / CROWN_ASPECT

    def P(px, py):
        return f"{ntos(x + px * w)} {ntos(y + py * h)}"

    def Y(v):
        return y + v * h
    d = ["M" + "L".join(P(*p) for p in [(0.08, 0.78), (0.0, 0.22), (0.30, 0.46), (0.5, 0.06),
                                         (0.70, 0.46), (1.0, 0.22), (0.92, 0.78)]) + "Z",
         f"M{P(0.08, 0.85)}H{ntos(x + 0.92 * w)}V{ntos(y + h)}H{ntos(x + 0.08 * w)}Z"]
    for cx, wt, bt, bb, wb in ((0.215, 0.44, 0.51, 0.70, 0.74), (0.5, 0.24, 0.33, 0.66, 0.74),
                               (0.785, 0.44, 0.51, 0.70, 0.74)):
        X, ww, bw = x + cx * w, 0.03 * w, 0.10 * w
        d.append(f"M{ntos(X - ww / 2)} {ntos(Y(wt))}H{ntos(X + ww / 2)}V{ntos(Y(bt))}H{ntos(X + bw / 2)}"
                 f"V{ntos(Y(bb))}H{ntos(X + ww / 2)}V{ntos(Y(wb))}H{ntos(X - ww / 2)}V{ntos(Y(bb))}"
                 f"H{ntos(X - bw / 2)}V{ntos(Y(bt))}H{ntos(X - ww / 2)}Z")
    jewels = "".join(f'<circle cx="{ntos(x + px * w)}" cy="{ntos(y + py * h)}" r="{ntos(r * w)}" fill="{fill}"/>'
                     for px, py, r in ((0.0, 0.17, 0.056), (0.5, 0.01, 0.066), (1.0, 0.17, 0.056)))
    return f'<path fill="{fill}" fill-rule="evenodd" d="{"".join(d)}"/>{jewels}'


def crown_bounds(x, y, w):
    """Ink bounds of crown(): jewels reach past the box on three sides."""
    h = w / CROWN_ASPECT
    return (x - 0.056 * w, y + 0.01 * h - 0.066 * w, x + w + 0.056 * w, y + h)


# ------------------------------------------------------------- the words
def word_bold(fill):
    return wordmark(fill), WORD_W


def word_regal(fill):
    size = 100 * REGAL.upm / REGAL.cap
    xmin, _, xmax, _ = REGAL.bounds("TCP", size, REGAL_TRACK)
    return f'<path fill="{fill}" d="{REGAL.run("TCP", size, REGAL_TRACK, -xmin, 100)}"/>', xmax - xmin


WORDS = {"bold": word_bold, "regal": word_regal}
CROWN_RATIO = {"bold": 0.58, "regal": 0.54}  # crown width / word width in the stacked lockup


def descriptor(text, width, fill, top, rules=False, gap=28.0, tracking=0.30):
    """Tracked caps under the word; with `rules`, hairlines flank a shorter line of text."""
    if not rules:
        size, x0 = DESC.fit_width(text, width, tracking)
        base = top + gap + size * DESC.cap / DESC.upm
        return f'<path fill="{fill}" d="{DESC.run(text, size, tracking, x0, base)}"/>', base
    tw = width * 0.70
    size, x0 = DESC.fit_width(text, tw, tracking)
    cap = size * DESC.cap / DESC.upm
    base = top + gap + cap
    ox = (width - tw) / 2
    line_y = base - cap / 2 - 0.6
    rule_gap = cap * 1.1
    rules_d = (f"M0 {ntos(line_y)}H{ntos(ox - rule_gap)}v1.2H0z"
               f"M{ntos(ox + tw + rule_gap)} {ntos(line_y)}H{ntos(width)}v1.2H{ntos(ox + tw + rule_gap)}z")
    return (f'<path fill="{fill}" d="{DESC.run(text, size, tracking, x0 + ox, base)}{rules_d}"/>', base)


# --------------------------------------------------------------- lockups
PAD = 8


def stacked(voice, paint, text=NAME, rules=False):
    word, ww = WORDS[voice](paint.word)
    cw = ww * CROWN_RATIO[voice]
    cx0 = (ww - cw) / 2
    _, top, _, cbottom = crown_bounds(cx0, 0, cw)
    gap = 0.20 * 100
    wy = cbottom + gap
    dsvg, base = descriptor(text, ww, paint.desc, 100, rules)
    body = (paint.defs() + crown(paint.c(), cx0, 0, cw)
            + f'<g transform="translate(0 {ntos(wy)})">{word}{dsvg}</g>')
    h = wy + base - top
    return svg(ww + 2 * PAD, h + 2 * PAD, body,
               vb=f"{-PAD} {ntos(top - PAD)} {ntos(ww + 2 * PAD)} {ntos(h + 2 * PAD)}")


def horizontal(voice, paint, text=NAME, rules=False):
    word, ww = WORDS[voice](paint.word)
    dsvg, base = descriptor(text, ww, paint.desc, 100, rules)
    cw = base * 1.05  # crown about as wide as the word block is tall
    ch = cw / CROWN_ASPECT
    x0, y0, x1, y1 = crown_bounds(0, 0, cw)
    cy = (base - (y1 - y0)) / 2 - y0  # centre the crown's ink on the word block
    gap = 0.40 * 100
    wx = x1 - x0 + gap
    body = (paint.defs() + f'<g transform="translate({ntos(-x0)} {ntos(cy)})">{crown(paint.c(), 0, 0, cw)}</g>'
            + f'<g transform="translate({ntos(wx)} 0)">{word}{dsvg}</g>')
    w = wx + ww
    top, bottom = min(0.0, cy + y0), max(base, cy + ch)
    return svg(w + 2 * PAD, bottom - top + 2 * PAD, body,
               vb=f"{-PAD} {ntos(top - PAD)} {ntos(w + 2 * PAD)} {ntos(bottom - top + 2 * PAD)}")


def icon(paint):
    """The crown alone."""
    w = 200
    x0, y0, x1, y1 = crown_bounds(0, 0, w)
    body = paint.defs() + crown(paint.c(), 0, 0, w)
    return svg(x1 - x0 + 2 * PAD, y1 - y0 + 2 * PAD, body,
               vb=f"{ntos(x0 - PAD)} {ntos(y0 - PAD)} {ntos(x1 - x0 + 2 * PAD)} {ntos(y1 - y0 + 2 * PAD)}")


def badge(voice, paint):
    """Crown over TCP without the descriptor: for profile pictures."""
    word, ww = WORDS[voice](paint.word)
    cw = ww * CROWN_RATIO[voice]
    cx0 = (ww - cw) / 2
    _, top, _, cbottom = crown_bounds(cx0, 0, cw)
    wy = cbottom + 20
    body = paint.defs() + crown(paint.c(), cx0, 0, cw) + f'<g transform="translate(0 {ntos(wy)})">{word}</g>'
    h = wy + 100 - top
    return svg(ww + 2 * PAD, h + 2 * PAD, body,
               vb=f"{-PAD} {ntos(top - PAD)} {ntos(ww + 2 * PAD)} {ntos(h + 2 * PAD)}")


if __name__ == "__main__":
    write("icon/crown-gold.svg", icon(ON_DARK))
    write("icon/crown-foil.svg", icon(ON_DARK_FOIL))
    write("icon/crown-deepgold.svg", icon(ON_LIGHT))
    for voice in ("bold", "regal"):
        for tag, paint in (("on-dark", ON_DARK), ("on-dark-foil", ON_DARK_FOIL), ("all-gold-foil", ALL_GOLD_FOIL),
                           ("on-light", ON_LIGHT)):
            write(f"{voice}/stacked-{tag}.svg", stacked(voice, paint))
            write(f"{voice}/horizontal-{tag}.svg", horizontal(voice, paint))
        write(f"{voice}/inner-circle-stacked-on-dark.svg", stacked(voice, ON_DARK, text="INNER CIRCLE"))
        write(f"{voice}/inner-circle-horizontal-on-dark.svg", horizontal(voice, ON_DARK, text="INNER CIRCLE"))
        write(f"{voice}/badge-on-dark.svg", badge(voice, ON_DARK))
        write(f"{voice}/badge-on-dark-foil.svg", badge(voice, ON_DARK_FOIL))
