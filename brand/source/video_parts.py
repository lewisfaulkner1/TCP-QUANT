"""Split the official TCP logo into animatable parts (JSON for the video renderer).

Geometry is the same as build_logos_final.stacked("bold", ...): crown over the
TCP wordmark over THE CRYPTO PLAYBOOK, in logo units.
"""
import json
import os
import sys

sys.argv = [sys.argv[0], "out_video"]
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_logos import C_PATH, P_PATH, T_PATH, WORD_W, ntos  # noqa: E402
from build_logos_final import CROWN_ASPECT, CROWN_RATIO, DESC, NAME  # noqa: E402

cw = WORD_W * CROWN_RATIO["bold"]
ch = cw / CROWN_ASPECT
cx0 = (WORD_W - cw) / 2


def P(px, py):
    return f"{ntos(cx0 + px * cw)} {ntos(py * ch)}"


body = ("M" + "L".join(P(*p) for p in [(0.08, 0.78), (0.0, 0.22), (0.30, 0.46), (0.5, 0.06),
                                         (0.70, 0.46), (1.0, 0.22), (0.92, 0.78)]) + "Z"
        + f"M{P(0.08, 0.85)}H{ntos(cx0 + 0.92 * cw)}V{ntos(ch)}H{ntos(cx0 + 0.08 * cw)}Z")
candles = []
for cx, wt, bt, bb, wb in ((0.215, 0.44, 0.51, 0.70, 0.74), (0.5, 0.24, 0.33, 0.66, 0.74),
                           (0.785, 0.44, 0.51, 0.70, 0.74)):
    X, ww, bw = cx0 + cx * cw, 0.03 * cw, 0.10 * cw
    Y = lambda v: v * ch  # noqa: E731
    d = (f"M{ntos(X - ww / 2)} {ntos(Y(wt))}H{ntos(X + ww / 2)}V{ntos(Y(bt))}H{ntos(X + bw / 2)}"
         f"V{ntos(Y(bb))}H{ntos(X + ww / 2)}V{ntos(Y(wb))}H{ntos(X - ww / 2)}V{ntos(Y(bb))}"
         f"H{ntos(X - bw / 2)}V{ntos(Y(bt))}H{ntos(X - ww / 2)}Z")
    candles.append({"d": d, "x": X, "top": Y(wt), "bottom": Y(wb)})
jewels = [{"cx": cx0 + px * cw, "cy": py * ch, "r": r * cw}
          for px, py, r in ((0.0, 0.17, 0.056), (0.5, 0.01, 0.066), (1.0, 0.17, 0.056))]

crown_top = 0.01 * ch - 0.066 * cw
word_y = ch + 20  # same gap as the stacked lockup
size, x0 = DESC.fit_width(NAME, WORD_W, 0.30)
cap = size * DESC.cap / DESC.upm
base = 100 + 28 + cap
desc_d = DESC.run(NAME, size, 0.30, x0, base)

parts = {
    "width": WORD_W, "top": crown_top, "bottom": word_y + base,
    "crown": {"d": "".join([body] + [c["d"] for c in candles]), "cx": cx0 + cw / 2, "cy": ch / 2,
              "top": crown_top, "bottom": ch},
    "candles": candles, "jewels": jewels,
    "word": {"y": word_y, "T": T_PATH, "C": C_PATH, "P": P_PATH},
    "desc": {"d": desc_d, "top": base - cap, "bottom": base},
}
os.makedirs("out_video", exist_ok=True)
with open("out_video/parts.json", "w") as fh:
    json.dump(parts, fh)
print(f"logo units: width {WORD_W}, top {crown_top:.2f}, bottom {word_y + base:.2f}; crown {cw:.1f}x{ch:.1f}")
