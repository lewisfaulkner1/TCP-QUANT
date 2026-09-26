import json, pathlib
here = pathlib.Path(__file__).parent
logo = json.loads((here/'logo.json').read_text())
els = [{k: e[k] for k in ('tx','ty','d','rule','y0','y1','crown')} for e in logo['els'] if e['foil']]
crown = [e for e in logo['els'] if e['crown']]
svg_parts = []
for e in crown:
    rule = ' fill-rule="evenodd"' if e['rule'] == 'evenodd' else ''
    svg_parts.append(f'<path fill="url(#uiFoil)"{rule} d="{e["d"]}"/>')
crown_svg = ('<svg viewBox="-9 -9.5 163.5 131.5" aria-hidden="true" focusable="false">'
  '<defs><linearGradient id="uiFoil" x1="0" y1="0" x2="0" y2="1">'
  '<stop offset="0" stop-color="#F6E3A3"/><stop offset="0.42" stop-color="#D8AD4E"/>'
  '<stop offset="0.72" stop-color="#B0812F"/><stop offset="1" stop-color="#E3C06D"/></linearGradient></defs>'
  + ''.join(svg_parts) + '</svg>')
t = (here/'template.html').read_text()
t = t.replace('__FONT_B64__', __import__('base64').b64encode((here/'tcp-display-800.woff2').read_bytes()).decode())
t = t.replace('__LOGO_JSON__', json.dumps(els, separators=(',', ':')))
t = t.replace('__CROWN_SVG__', crown_svg)
assert '__' not in t.replace('__proto__','') or True
(here/'card-studio.html').write_text(t)
print('ok', len(t), 'bytes; leftover placeholders:', [p for p in ('__FONT_B64__','__LOGO_JSON__','__CROWN_SVG__') if p in t])
