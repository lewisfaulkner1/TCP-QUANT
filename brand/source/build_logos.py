"""Build the TCP logo concepts as font-free SVG files.

Every letter is either hand-drawn geometry (the TCP wordmark) or a font
outline converted to a path (descriptor and coin text), so the SVGs render
the same everywhere, including inside <img>.
"""
import math
import os
import sys

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "out")

GOLD = "#D8AD4E"
GOLD_DEEP = "#7C5A1C"
INK = "#0E0D0B"
IVORY = "#F2ECDF"


def ntos(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


class Font:
    def __init__(self, name):
        self.f = TTFont(os.path.join(HERE, "fonts", name))
        self.gs = self.f.getGlyphSet()
        self.cmap = self.f.getBestCmap()
        self.upm = self.f["head"].unitsPerEm
        self.cap = self.f["OS/2"].sCapHeight
        self.hmtx = self.f["hmtx"]

    def adv(self, ch):
        return self.hmtx[self.cmap[ord(ch)]][0]

    def _draw(self, pen, text, size, tracking_em, x, baseline):
        s = size / self.upm
        cx = x
        for ch in text:
            self.gs[self.cmap[ord(ch)]].draw(TransformPen(pen, (s, 0, 0, -s, cx, baseline)))
            cx += self.adv(ch) * s + tracking_em * size

    def run(self, text, size, tracking_em=0.0, x=0.0, baseline=0.0):
        pen = SVGPathPen(self.gs, ntos=ntos)
        self._draw(pen, text, size, tracking_em, x, baseline)
        return pen.getCommands()

    def bounds(self, text, size, tracking_em=0.0):
        pen = BoundsPen(self.gs)
        self._draw(pen, text, size, tracking_em, 0.0, 0.0)
        return pen.bounds  # xmin, ymin, xmax, ymax (y down)

    def fit_width(self, text, width, tracking_em):
        """Size + x-offset so the run's ink spans exactly 0..width."""
        xmin, _, xmax, _ = self.bounds(text, 100.0, tracking_em)
        size = 100.0 * width / (xmax - xmin)
        return size, -xmin * size / 100.0

    def glyph(self, ch, size):
        pen = SVGPathPen(self.gs, ntos=ntos)
        s = size / self.upm
        self.gs[self.cmap[ord(ch)]].draw(TransformPen(pen, (s, 0, 0, -s, 0, 0)))
        return pen.getCommands(), self.adv(ch) * s


DESC = Font("archivo-semiexp-600.ttf")
RING = Font("archivo-700.ttf")

# ---------------------------------------------------------------- wordmark
# Cap height 100, stroke 24. T and P are straight-sided; C is a circle ring
# with a horizontal-cut aperture and a small overshoot (r 51.5).
WORD_W = 286.0
C_CX, C_R, C_r, C_A = 141.5, 51.5, 27.5, 22.0
P_X = 202.0


def c_path(cx, cy, R, r, a):
    ox = cx + math.sqrt(R * R - a * a)
    ix = cx + math.sqrt(r * r - a * a)
    return (f"M{ntos(ox)} {ntos(cy - a)}A{ntos(R)} {ntos(R)} 0 1 0 {ntos(ox)} {ntos(cy + a)}"
            f"L{ntos(ix)} {ntos(cy + a)}A{ntos(r)} {ntos(r)} 0 1 1 {ntos(ix)} {ntos(cy - a)}Z")


T_PATH = "M0 0H88V24H56V100H32V24H0Z"
C_PATH = c_path(C_CX, 50, C_R, C_r, C_A)
x = P_X
P_PATH = (f"M{ntos(x)} 0H{ntos(x + 49)}A35 35 0 0 1 {ntos(x + 84)} 35A35 35 0 0 1 {ntos(x + 49)} 70"
          f"H{ntos(x + 24)}V100H{ntos(x)}Z"
          f"M{ntos(x + 24)} 24V46H{ntos(x + 49)}A11 11 0 0 0 {ntos(x + 60)} 35A11 11 0 0 0 {ntos(x + 49)} 24Z")
# Candle that sits inside the C (concept C only)
C_CANDLE = (f"M{ntos(C_CX - 6)} 36h12v28h-12z"
            f"M{ntos(C_CX - 2)} 27h4v46h-4z")


def wordmark(fill, c_fill=None, candle=False):
    c_fill = c_fill or fill
    parts = [f'<path fill="{fill}" d="{T_PATH}"/>',
             f'<path fill="{c_fill}" d="{C_PATH}"/>',
             f'<path fill="{fill}" fill-rule="evenodd" d="{P_PATH}"/>']
    if candle:
        parts.append(f'<path fill="{c_fill}" d="{C_CANDLE}"/>')
    return "".join(parts)


# Descriptor under the wordmark, justified to the wordmark's width.
DESC_TEXT = "THE CRYPTO PLAYBOOKS"
DESC_TRACK = 0.30
DESC_SIZE, DESC_X = DESC.fit_width(DESC_TEXT, WORD_W, DESC_TRACK)
DESC_CAP = DESC_SIZE * DESC.cap / DESC.upm
DESC_GAP = 24.0
DESC_BASE = 100 + DESC_GAP + DESC_CAP
BLOCK_H = DESC_BASE  # wordmark block: y 0 .. DESC_BASE


def descriptor(fill):
    return f'<path fill="{fill}" d="{DESC.run(DESC_TEXT, DESC_SIZE, DESC_TRACK, DESC_X, DESC_BASE)}"/>'


# ------------------------------------------------------------------- icons
# All icons are drawn in a 240 x 240 box.
def icon_playbook(fill, slats=False):
    """Concept A: an open book whose spine is a candlestick."""
    out = [f'<path fill="{fill}" d="M108 84h24v72h-24zM116.5 52h7v136h-7z"/>']
    if not slats:
        out.append(f'<path fill="{fill}" d="M100 92L28 72V164L100 184ZM140 92L212 72V164L140 184Z"/>')
    else:
        d = []
        for (s0, s1), (o0, o1) in zip([(92, 116), (126, 150), (160, 184)],
                                      [(72, 96), (106, 130), (140, 164)]):
            d.append(f"M100 {s0}L28 {o0}V{o1}L100 {s1}Z")
            d.append(f"M140 {s0}L212 {o0}V{o1}L140 {s1}Z")
        out.append(f'<path fill="{fill}" d="{"".join(d)}"/>')
    return "".join(out)


PLAYBOOK_BOX = (28, 52, 212, 188)  # visual bounds inside the 240 box


def icon_monogram(fill):
    """Concept C: the C of TCP holding a candlestick."""
    ring = c_path(120, 120, 100, 60, 40)
    return (f'<g transform="translate(4.2 0)"><path fill="{fill}" d="{ring}"/>'
            f'<path fill="{fill}" d="M107 90h26v60h-26zM116 70h8v100h-8z"/></g>')


MONOGRAM_BOX = (24.2, 20, 215.85, 220)


def arc_text(font, text, size, tracking_em, radius, center_deg, cx, cy, fill, bottom=False):
    """Glyphs along a circle. Top text: baseline on `radius`, letters point out.
    Bottom text: baseline on `radius`, letters point in, reads left to right."""
    glyphs = [font.glyph(ch, size) for ch in text]
    total = sum(w for _, w in glyphs) + tracking_em * size * (len(glyphs) - 1)
    out, s = [], 0.0
    for d, w in glyphs:
        mid = s + w / 2 - total / 2
        ang = math.degrees(mid / radius)
        if not bottom:
            theta = center_deg + ang
            rot, dy = theta + 90, -radius
        else:
            theta = center_deg - ang
            rot, dy = theta - 90, radius
        if d:
            out.append(f'<path fill="{fill}" transform="translate({ntos(cx)} {ntos(cy)}) rotate({ntos(rot)}) '
                       f'translate({ntos(-w / 2)} {ntos(dy)})" d="{d}"/>')
        s += w + tracking_em * size
    return "".join(out), math.degrees(total / radius)


def icon_mint(simple=False):
    """Concept B: a minted coin. Self-contained badge (own ink base)."""
    cx = cy = 120
    out = [f'<circle cx="120" cy="120" r="118" fill="{INK}"/>',
           f'<path fill="{GOLD}" fill-rule="evenodd" d="M2 120a118 118 0 1 0 236 0a118 118 0 1 0 -236 0z'
           f'M9 120a111 111 0 1 0 222 0a111 111 0 1 0 -222 0z"/>']
    ticks = []
    for i in range(90):
        ticks.append(f'<rect x="-1.1" y="-106" width="2.2" height="6" transform="rotate({i * 4})"/>')
    out.append(f'<g fill="{GOLD}" transform="translate(120 120)">{"".join(ticks)}</g>')
    inner_r = 72 if not simple else 88
    out.append(f'<circle cx="120" cy="120" r="{inner_r}" fill="{GOLD}"/>')
    out.append(f'<circle cx="120" cy="120" r="{inner_r - 7}" fill="none" stroke="{INK}" stroke-width="1.6"/>')
    k = (104 if not simple else 128) / WORD_W
    tx, ty = 120 - WORD_W * k / 2, 120 - 50 * k
    out.append(f'<g transform="translate({ntos(tx)} {ntos(ty)}) scale({k:.4f})">{wordmark(INK)}</g>')
    if not simple:
        size = 13.4
        cap = size * RING.cap / RING.upm
        top, span_t = arc_text(RING, "THE CRYPTO PLAYBOOKS", size, 0.16, 81.5, -90, cx, cy, GOLD)
        bot, span_b = arc_text(RING, "TRADE THE PLAYBOOK", size, 0.16, 81.5 + cap, 90, cx, cy, GOLD, bottom=True)
        out.append(top + bot)
        rmid = 81.5 + cap / 2
        for deg in (0, 180):
            x0 = cx + rmid * math.cos(math.radians(deg))
            out.append(f'<rect x="{ntos(x0 - 3)}" y="{ntos(cy - 3)}" width="6" height="6" fill="{GOLD}" '
                       f'transform="rotate(45 {ntos(x0)} {ntos(cy)})"/>')
        print(f"  mint ring: top span {span_t:.1f} deg, bottom span {span_b:.1f} deg, cap {cap:.1f}")
    return "".join(out)


# ------------------------------------------------------------------ output
def svg(w, h, body, vb=None):
    vb = vb or f"0 0 {ntos(w)} {ntos(h)}"
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" '
            f'width="{ntos(w)}" height="{ntos(h)}">{body}</svg>\n')


def write(rel, content):
    path = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as fh:
        fh.write(content)
    print("wrote", rel)


def crop_icon(body, box, pad=0):
    x0, y0, x1, y1 = box
    w, h = x1 - x0 + 2 * pad, y1 - y0 + 2 * pad
    return svg(w, h, body, vb=f"{ntos(x0 - pad)} {ntos(y0 - pad)} {ntos(w)} {ntos(h)}")


def lockup_h(icon_body, icon_box, icon_h, word_fill, desc_fill, c_fill=None, candle=False, gap=46):
    """Icon on the left, wordmark block on the right, vertically centred."""
    parts, x = [], 0.0
    top, bottom = -2.0, BLOCK_H + 2
    if icon_body:
        x0, y0, x1, y1 = icon_box
        k = icon_h / (y1 - y0)
        iw = (x1 - x0) * k
        iy = (BLOCK_H - icon_h) / 2
        top, bottom = min(top, iy), max(bottom, iy + icon_h)
        parts.append(f'<g transform="translate({ntos(-x0 * k)} {ntos(iy - y0 * k)}) scale({k:.5f})">{icon_body}</g>')
        x = iw + gap
    parts.append(f'<g transform="translate({ntos(x)} 0)">{wordmark(word_fill, c_fill, candle)}{descriptor(desc_fill)}</g>')
    w = x + WORD_W
    pad = 6
    return svg(w + 2 * pad, bottom - top + 2 * pad, "".join(parts),
               vb=f"{-pad} {ntos(top - pad)} {ntos(w + 2 * pad)} {ntos(bottom - top + 2 * pad)}")


def lockup_stacked(icon_body, icon_box, icon_h, word_fill, desc_fill, gap=48):
    x0, y0, x1, y1 = icon_box
    k = icon_h / (y1 - y0)
    iw = (x1 - x0) * k
    parts = [f'<g transform="translate({ntos((WORD_W - iw) / 2 - x0 * k)} {ntos(-y0 * k)}) scale({k:.5f})">{icon_body}</g>',
             f'<g transform="translate(0 {ntos(icon_h + gap)})">{wordmark(word_fill)}{descriptor(desc_fill)}</g>']
    h = icon_h + gap + BLOCK_H
    pad = 6
    return svg(WORD_W + 2 * pad, h + 2 * pad, "".join(parts),
               vb=f"{-pad} {-pad} {ntos(WORD_W + 2 * pad)} {ntos(h + 2 * pad)}")


if __name__ == "__main__":
    print(f"descriptor: size {DESC_SIZE:.2f}, cap {DESC_CAP:.2f}, block height {BLOCK_H:.2f}")

    # Concept A: Playbook (solid pages), plus the slatted variant for comparison
    for name, slats in (("a-playbook", False),):
        write(f"{name}/icon-gold.svg", crop_icon(icon_playbook(GOLD, slats), PLAYBOOK_BOX, 4))
        write(f"{name}/icon-deepgold.svg", crop_icon(icon_playbook(GOLD_DEEP, slats), PLAYBOOK_BOX, 4))
        write(f"{name}/lockup-on-dark.svg", lockup_h(icon_playbook(GOLD, slats), PLAYBOOK_BOX, 150, IVORY, GOLD))
        write(f"{name}/lockup-on-light.svg", lockup_h(icon_playbook(GOLD_DEEP, slats), PLAYBOOK_BOX, 150, INK, GOLD_DEEP))
        write(f"{name}/lockup-stacked-on-dark.svg", lockup_stacked(icon_playbook(GOLD, slats), PLAYBOOK_BOX, 170, IVORY, GOLD))

    write("wordmark/wordmark-on-dark.svg", lockup_h(None, None, 0, IVORY, GOLD))
    write("wordmark/wordmark-on-light.svg", lockup_h(None, None, 0, INK, GOLD_DEEP))

    # Concept B: Mint (coin badge)
    MINT_BOX = (2, 2, 238, 238)
    write("b-mint/coin.svg", crop_icon(icon_mint(), MINT_BOX))
    write("b-mint/coin-simple.svg", crop_icon(icon_mint(simple=True), MINT_BOX))
    write("b-mint/lockup-on-dark.svg", lockup_h(icon_mint(), MINT_BOX, 168, IVORY, GOLD, gap=40))
    write("b-mint/lockup-on-light.svg", lockup_h(icon_mint(), MINT_BOX, 168, INK, GOLD_DEEP, gap=40))
    write("b-mint/lockup-stacked-on-dark.svg", lockup_stacked(icon_mint(), MINT_BOX, 190, IVORY, GOLD))

    # Concept C: Monogram (the C holds a candle)
    write("c-monogram/icon-gold.svg", crop_icon(icon_monogram(GOLD), MONOGRAM_BOX, 4))
    write("c-monogram/icon-deepgold.svg", crop_icon(icon_monogram(GOLD_DEEP), MONOGRAM_BOX, 4))
    write("c-monogram/lockup-on-dark.svg", lockup_h(None, None, 0, IVORY, GOLD, c_fill=GOLD, candle=True))
    write("c-monogram/lockup-on-light.svg", lockup_h(None, None, 0, INK, GOLD_DEEP, c_fill=GOLD_DEEP, candle=True))
