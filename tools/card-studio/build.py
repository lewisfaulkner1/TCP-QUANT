"""Builds card-studio.html from template.html. Run: python3 build.py

Inlines the shared drawing code (cards.cjs, also used by signals/ on the VPS), the display font
(tcp-display-800.woff2) and the header crown (from logo.json, the official logo's geometry).
"""
import base64
import json
import pathlib

here = pathlib.Path(__file__).parent
logo = json.loads((here / 'logo.json').read_text())
crown = [e for e in logo['els'] if e['crown']]
def path_el(e):
    rule = ' fill-rule="evenodd"' if e['rule'] == 'evenodd' else ''
    return f'<path fill="url(#uiFoil)"{rule} d="{e["d"]}"/>'


paths = ''.join(path_el(e) for e in crown)
crown_svg = ('<svg viewBox="-9 -9.5 163.5 131.5" aria-hidden="true" focusable="false">'
             '<defs><linearGradient id="uiFoil" x1="0" y1="0" x2="0" y2="1">'
             '<stop offset="0" stop-color="#F6E3A3"/><stop offset="0.42" stop-color="#D8AD4E"/>'
             '<stop offset="0.72" stop-color="#B0812F"/><stop offset="1" stop-color="#E3C06D"/></linearGradient></defs>'
             + paths + '</svg>')

page = (here / 'template.html').read_text()
page = page.replace('__FONT_B64__', base64.b64encode((here / 'tcp-display-800.woff2').read_bytes()).decode())
page = page.replace('__CARDS_JS__', (here / 'cards.cjs').read_text())
page = page.replace('__CROWN_SVG__', crown_svg)
left = [p for p in ('__FONT_B64__', '__CARDS_JS__', '__CROWN_SVG__') if p in page]
assert not left, f'placeholders left: {left}'
(here / 'card-studio.html').write_text(page)
print(f'card-studio.html written ({len(page):,} bytes)')
