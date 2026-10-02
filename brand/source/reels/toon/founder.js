// The TCP founder as an animated character: one vector drawing, built from parameters, so the face,
// cap, chain and clothes are identical in every shot (the thing AI video can't hold steady).
//
// founderSVG(pose, id) returns an SVG <g> in the character's own space: the head's centre near 0,0,
// the cap's top at about y -160, the chin at about y 112, the torso down to y 560. A shot places
// and scales it. Every pose field is a number or a named part, so two poses can be blended:
// blendPose(a, b, k).
//
// pose = {
//   view: '34' (three-quarter, facing right) | 'back',
//   flip: false (true faces left),
//   head: { rot, dx, dy },            degrees and units, pivoting at the neck
//   lean,                              the body's lean in degrees
//   look: [x, y],                      where the eyes point, -1..1 (x+ is the way he faces)
//   lid,                               0 open .. 1 shut (0.28 is his usual calm)
//   wide,                              0..1 eyes widened (disbelief)
//   blink,                             0..1, set by the animator
//   brow: [near, far],                 raise each brow, -1 (frown) .. 1 (up)
//   mouth: { open, smile, smirk },     0..1, -1..1, 0..1
//   cap: 'fwd' | 'back' | 'none', shades: 0..1 (sunglasses on),
//   arms: 'rest' | 'desk' | 'fold' | 'phone',
//   hand: { x, y, click },             the mouse hand's offset and its click (desk)
//   light: { key: 1 (from the right) | -1, tint: '#hex', rim: 0..1 }
// }
(function () {
  const C = {
    skin: '#EDBB98', skinMid: '#DCA283', skinShade: '#B97B5F', skinDeep: '#93594A', skinLight: '#F8D9C3', blush: '#E28E78',
    lip: '#C27866', lipDark: '#7A4033',
    hair: '#3E2B20', hairDark: '#22160F', hairLight: '#71513C',
    cap: '#191919', capDark: '#0C0C0C', capLight: '#3A3938',
    top: '#161514', topDark: '#0B0A09', topLight: '#3A352F',
    pearl: '#F2F0EB', pearlShade: '#A7A198',
    white: '#F5F0EA', iris: '#5E412D', irisDark: '#3A271B', pupil: '#140E0A', lash: '#22160F',
    gold: '#D8AD4E', goldHi: '#F6E3A3', goldLo: '#B0812F',
    lens: '#0A0A0C',
  };
  const n = (v) => Math.round(v * 100) / 100;
  const lerp = (a, b, k) => a + (b - a) * k;

  const BASE = {
    view: '34', flip: false,
    head: { rot: 0, dx: 0, dy: 0 }, lean: 0,
    look: [0.35, 0], lid: 0.28, wide: 0, blink: 0, brow: [0, 0],
    mouth: { open: 0, smile: -0.1, smirk: 0 },
    cap: 'fwd', shades: 0, arms: 'rest',
    hand: { x: 0, y: 0, click: 0 },
    light: { key: 1, tint: '#C9DBFF', rim: 0.6 },
  };

  // A full pose from a partial one.
  function pose(p = {}) {
    const out = JSON.parse(JSON.stringify(BASE));
    for (const k in p) {
      if (p[k] && typeof p[k] === 'object' && !Array.isArray(p[k])) out[k] = { ...out[k], ...p[k] };
      else out[k] = p[k];
    }
    return out;
  }

  // Blend two full poses: numbers interpolate, named parts switch half-way.
  function blendPose(a, b, k) {
    const mix = (x, y) => {
      if (typeof x === 'number' && typeof y === 'number') return lerp(x, y, k);
      if (Array.isArray(x)) return x.map((v, i) => mix(v, y[i]));
      if (x && typeof x === 'object') { const o = {}; for (const key in x) o[key] = mix(x[key], y[key]); return o; }
      return k < 0.5 ? x : y;
    };
    return mix(a, b);
  }

  // ------------------------------------------------------------ face parts
  // An eye: fixed corners, the upper lid's curve moving with lid, wide and blink.
  function eye(cx, cy, w, near, p, id) {
    const open = Math.max(0, Math.min(1.25, 1 - Math.max(p.lid, p.blink) + p.wide * 0.4));
    const x0 = cx - w / 2, x1 = cx + w / 2;
    const y0 = cy + 1, y1 = cy - 1;
    const up = cy - (near ? 14 : 10) * open - 0.5;
    const lo = cy + (near ? 6 : 5) * Math.min(1, 0.35 + open);
    const shape = `M ${n(x0)} ${n(y0)} C ${n(x0 + w * 0.2)} ${n(up)}, ${n(x1 - w * 0.32)} ${n(up - 1)}, ${n(x1)} ${n(y1)} C ${n(x1 - w * 0.25)} ${n(lo)}, ${n(x0 + w * 0.28)} ${n(lo + 1)}, ${n(x0)} ${n(y0)} Z`;
    const ix = cx + w * 0.06 + p.look[0] * w * 0.2, iy = cy - 1 + p.look[1] * 3;
    const r = near ? 7.8 : 6.3;
    const clip = `${id}eye${near ? 'n' : 'f'}`;
    const lash = `M ${n(x0 - 2)} ${n(y0 + 0.5)} C ${n(x0 + w * 0.2)} ${n(up - 1.2)}, ${n(x1 - w * 0.32)} ${n(up - 2.2)}, ${n(x1 + 3)} ${n(y1 - 1.5)}`;
    const ch = 13 + p.wide * 4;
    const crease = `M ${n(x0 + 4)} ${n(cy - ch)} C ${n(x0 + w * 0.3)} ${n(cy - ch - 7)}, ${n(x1 - w * 0.3)} ${n(cy - ch - 7)}, ${n(x1 - 1)} ${n(cy - ch + 2)}`;
    return `
      <clipPath id="${clip}"><path d="${shape}"/></clipPath>
      <path d="${shape}" fill="${C.white}"/>
      <g clip-path="url(#${clip})">
        <circle cx="${n(ix)}" cy="${n(iy)}" r="${r}" fill="${C.iris}"/>
        <circle cx="${n(ix)}" cy="${n(iy)}" r="${n(r - 0.8)}" fill="none" stroke="${C.irisDark}" stroke-width="1.6"/>
        <circle cx="${n(ix)}" cy="${n(iy)}" r="${n(r * 0.48)}" fill="${C.pupil}"/>
        <circle cx="${n(ix + r * 0.36)}" cy="${n(iy - r * 0.36)}" r="${n(r * 0.24)}" fill="#fff" opacity="0.92"/>
        <path d="M ${n(x0 - 2)} ${n(up - 6)} L ${n(x1 + 2)} ${n(up - 6)} L ${n(x1 + 2)} ${n(up + 4)} C ${n(cx)} ${n(up + 1)}, ${n(cx)} ${n(up + 1)}, ${n(x0 - 2)} ${n(up + 4)} Z" fill="${C.skinDeep}" opacity="0.22"/>
      </g>
      <path d="${lash}" fill="none" stroke="${C.lash}" stroke-width="${near ? 3.6 : 3}" stroke-linecap="round"/>
      <path d="M ${n(x1 - 1)} ${n(y1 - 1)} l ${near ? 5 : 4} -3" fill="none" stroke="${C.lash}" stroke-width="${near ? 2.6 : 2.2}" stroke-linecap="round"/>
      <path d="${crease}" fill="none" stroke="${C.skinShade}" stroke-width="1.8" stroke-linecap="round" opacity="${n(0.75 * Math.min(1, open))}"/>
      <path d="M ${n(x0 + 5)} ${n(lo + 3)} Q ${n(cx)} ${n(lo + 6)} ${n(x1 - 5)} ${n(lo + 2)}" fill="none" stroke="${C.skinShade}" stroke-width="1.3" opacity="0.55"/>`;
  }

  function brow(x0, y0, x1, y1, raise, thick) {
    const dy = -raise * 7;
    const inner = y0 + dy + Math.max(0, -raise) * 5; // a frown pulls the inner end down
    const outer = y1 + dy * 0.8;
    const mx = (x0 + x1) / 2, my = (inner + outer) / 2 - 4 - Math.max(0, raise) * 2;
    return `<path d="M ${n(x0)} ${n(inner + thick * 0.4)} C ${n(x0 + 4)} ${n(inner - thick * 0.7)}, ${n(mx)} ${n(my - thick * 0.5)}, ${n(x1)} ${n(outer)} C ${n(mx + 4)} ${n(my + thick * 0.45)}, ${n(x0 + 10)} ${n(inner + thick * 0.75)}, ${n(x0)} ${n(inner + thick * 0.4)} Z" fill="${C.hair}"/>`;
  }

  function mouth(p) {
    const { open, smile, smirk } = p.mouth;
    const x0 = 47, y0 = 63 - smile * 2, x1 = 88, y1 = 61 - smile * 3 - smirk * 7;
    const mid = 64 + smile * 3 - smirk * 1.5, mx = (x0 + x1) / 2;
    if (open > 0.05) {
      const drop = 3 + open * 17;
      return `<path d="M ${x0} ${n(y0)} Q ${n(mx)} ${n(mid - 2)} ${x1} ${n(y1)} Q ${n(mx + 3)} ${n(mid + drop)} ${x0} ${n(y0)} Z" fill="${C.lipDark}"/>
        <path d="M ${x0 + 6} ${n(y0 + 0.5)} Q ${n(mx)} ${n(mid - 1)} ${x1 - 6} ${n(y1 + 0.5)} L ${x1 - 8} ${n(y1 + 2.5 + open * 2)} Q ${n(mx)} ${n(mid + 2)} ${x0 + 8} ${n(y0 + 2.5 + open * 2)} Z" fill="${C.white}" opacity="${n(Math.min(1, open * 2))}"/>
        <path d="M ${x0 + 9} ${n(y0 + drop * 0.62)} Q ${n(mx)} ${n(mid + drop * 0.95)} ${x1 - 9} ${n(y1 + drop * 0.55)}" fill="none" stroke="${C.lip}" stroke-width="2.4" opacity="0.85"/>`;
    }
    return `<path d="M ${x0} ${n(y0)} Q ${n(mx)} ${n(mid)} ${x1} ${n(y1)}" fill="none" stroke="${C.lipDark}" stroke-width="3" stroke-linecap="round"/>
      <path d="M ${x0 + 10} ${n(y0 + 7)} Q ${n(mx + 2)} ${n(mid + 9)} ${x1 - 11} ${n(y1 + 6.5)}" fill="none" stroke="${C.lip}" stroke-width="4" stroke-linecap="round" opacity="0.4"/>
      ${smirk > 0.15 ? `<path d="M ${x1} ${n(y1)} q 4 -1 5.5 -5" fill="none" stroke="${C.skinShade}" stroke-width="2" stroke-linecap="round" opacity="${n(smirk)}"/>` : ''}`;
  }

  function crownMark(fill) {
    const k = window.CROWN;
    if (!k) return '';
    return `<g transform="translate(-100 -88)"><path d="${k.path}" fill="${fill}" fill-rule="evenodd"/>${k.circles.map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`).join('')}</g>`;
  }

  // ------------------------------------------------------------ caps
  const CROWN_PATH = 'M -122 -30 C -130 -100, -76 -160, -2 -162 C 62 -162, 102 -120, 106 -64 C 60 -54, -36 -46, -122 -30 Z';
  function capFwd(p, id) {
    return `
      <path d="${CROWN_PATH}" fill="url(#${id}capg)"/>
      <path d="M -2 -162 C 34 -142, 58 -104, 68 -60" fill="none" stroke="${C.capDark}" stroke-width="2.6"/>
      <path d="M -2 -162 C -28 -134, -48 -92, -56 -44" fill="none" stroke="${C.capDark}" stroke-width="2.6"/>
      <path d="M -2 -162 C 56 -152, 94 -120, 104 -78" fill="none" stroke="${C.capLight}" stroke-width="1.6" opacity="0.45"/>
      <path d="M -2 -162 C 34 -142, 58 -104, 68 -60" fill="none" stroke="${C.capLight}" stroke-width="1" opacity="0.3" transform="translate(3 0)"/>
      <circle cx="-34" cy="-118" r="3" fill="${C.capDark}"/><circle cx="44" cy="-130" r="3" fill="${C.capDark}"/>
      <ellipse cx="-2" cy="-162" rx="9" ry="4.4" fill="${C.capLight}"/>
      <g transform="translate(46 -100) rotate(9) skewY(-6) scale(0.2)">${crownMark(C.gold)}</g>
      <path d="M -122 -30 C -36 -46, 60 -54, 106 -64 L 106 -56 C 60 -46, -36 -38, -120 -22 Z" fill="${C.capDark}"/>
      <path d="M 106 -64 C 104 -100, 90 -126, 70 -144" fill="none" stroke="${p.light.tint}" stroke-width="3" opacity="${n(0.3 * p.light.rim)}" stroke-linecap="round"/>
      <!-- the bill: top, stitching, underside, and the light along its edge -->
      <path d="M 16 -64 C 70 -84, 150 -86, 200 -58 C 204 -54, 202 -50, 196 -48 C 152 -48, 106 -45, 96 -52 C 70 -57, 42 -59, 16 -64 Z" fill="url(#${id}billg)"/>
      <path d="M 52 -74 C 104 -86, 158 -82, 192 -60" fill="none" stroke="${C.capLight}" stroke-width="1.4" stroke-dasharray="4 4" opacity="0.5"/>
      <path d="M 70 -70 C 112 -78, 156 -75, 184 -58" fill="none" stroke="${C.capLight}" stroke-width="1.2" stroke-dasharray="4 4" opacity="0.35"/>
      <path d="M 96 -52 C 106 -45, 152 -48, 196 -48 C 186 -40, 150 -34, 120 -36 C 106 -38, 98 -44, 96 -52 Z" fill="${C.capDark}"/>
      <path d="M 16 -64 C 70 -84, 150 -86, 200 -58" fill="none" stroke="${p.light.tint}" stroke-width="2.4" opacity="${n(0.45 * p.light.rim)}" stroke-linecap="round"/>`;
  }

  function capBack(p, id) {
    return `
      <path d="M -112 -40 C -138 -52, -170 -52, -186 -38 C -176 -30, -150 -26, -120 -28 Z" fill="url(#${id}billg)"/>
      <path d="M -112 -40 C -138 -52, -170 -52, -186 -38" fill="none" stroke="${C.capLight}" stroke-width="2" opacity="0.5"/>
      <path d="${CROWN_PATH}" fill="url(#${id}capg)"/>
      <path d="M -2 -162 C 34 -142, 58 -104, 68 -60" fill="none" stroke="${C.capDark}" stroke-width="2.6"/>
      <path d="M -2 -162 C -28 -134, -48 -92, -56 -44" fill="none" stroke="${C.capDark}" stroke-width="2.6"/>
      <ellipse cx="-2" cy="-162" rx="9" ry="4.4" fill="${C.capLight}"/>
      <path d="M 44 -96 C 60 -96, 76 -86, 86 -70 L 74 -64 C 66 -76, 56 -82, 40 -84 Z" fill="${C.hair}"/>
      <path d="M 34 -98 C 56 -98, 82 -86, 98 -68" fill="none" stroke="${C.capDark}" stroke-width="7" stroke-linecap="round"/>
      <rect x="52" y="-88" width="10" height="6" rx="1.5" fill="#6E6A64" transform="rotate(28 57 -85)"/>
      <path d="M -122 -30 C -36 -46, 60 -54, 106 -64 L 106 -56 C 60 -46, -36 -38, -120 -22 Z" fill="${C.capDark}"/>`;
  }

  function shades() {
    return `
      <path d="M -6 -18 C -4 -24, 44 -26, 52 -18 C 54 -6, 48 8, 30 10 C 10 11, -4 4, -6 -18 Z" fill="url(#lensg)"/>
      <path d="M 62 -20 C 66 -26, 92 -26, 98 -18 C 99 -8, 94 4, 80 5 C 66 6, 60 -4, 62 -20 Z" fill="url(#lensg)"/>
      <path d="M 52 -18 C 55 -21, 59 -21, 62 -19" fill="none" stroke="${C.lens}" stroke-width="4"/>
      <path d="M -6 -16 L -44 -12" fill="none" stroke="${C.lens}" stroke-width="5" stroke-linecap="round"/>
      <path d="M 4 -14 C 14 -20, 34 -20, 44 -14" fill="none" stroke="#fff" stroke-width="2.6" opacity="0.3" stroke-linecap="round"/>
      <path d="M 68 -16 C 74 -20, 86 -20, 92 -15" fill="none" stroke="#fff" stroke-width="2.2" opacity="0.24" stroke-linecap="round"/>`;
  }

  // ------------------------------------------------------------ the head, three-quarter view
  const FACE = 'M -98 -48 C -102 -104, -52 -142, 0 -142 C 50 -142, 88 -104, 93 -60 C 96 -44, 100 -34, 101 -24 C 101 -16, 97 -10, 97 -4 C 98 6, 103 14, 103 24 C 103 38, 98 50, 95 60 C 92 74, 90 86, 85 97 C 79 107, 70 112, 58 112 C 32 110, 4 100, -18 86 C -30 78, -38 68, -44 56 C -60 46, -84 28, -96 0 Z';
  function head34(p, id) {
    const capped = p.cap === 'fwd';
    return `
      <!-- the face, with soft form shading -->
      <path id="${id}face" d="${FACE}" fill="url(#${id}skin)"/>
      <g clip-path="url(#${id}faceclip)">
        <path d="M -104 -40 C -76 -44, -56 -26, -46 -2 C -34 26, -18 52, 0 74 C 18 94, 40 108, 70 116 L -40 130 L -120 40 Z" fill="${C.skinShade}" opacity="0.5" filter="url(#${id}soft)"/>
        <path d="M 30 22 C 48 34, 72 36, 96 28 C 92 40, 84 46, 72 48 C 56 46, 40 38, 30 22 Z" fill="${C.skinShade}" opacity="0.3" filter="url(#${id}soft)"/>
        <ellipse cx="54" cy="30" rx="20" ry="10" fill="${C.blush}" opacity="0.16" filter="url(#${id}soft)"/>
        <path d="M 60 100 C 70 102, 78 98, 82 92" fill="none" stroke="${C.skinLight}" stroke-width="5" opacity="0.5" stroke-linecap="round" filter="url(#${id}soft)"/>
      </g>
      <path d="M 93 -60 C 96 -44, 100 -34, 101 -24 C 101 -16, 97 -10, 97 -4 C 98 6, 103 14, 103 24 C 103 38, 98 50, 95 60 C 92 74, 90 86, 85 97" fill="none" stroke="${p.light.tint}" stroke-width="3.4" opacity="${n(0.55 * p.light.rim)}" stroke-linecap="round"/>
      <!-- short hair on the side of the head, above and behind the ear, flicking out at the nape -->
      <path d="M -124 -26 C -66 -40, -40 -44, -24 -46 C -26 -34, -28 -24, -30 -16 C -40 -26, -56 -28, -66 -18 C -74 -6, -72 14, -66 30 C -72 36, -78 40, -86 46 C -84 38, -84 32, -88 28 C -94 36, -100 40, -108 42 C -104 34, -104 26, -106 20 C -114 8, -122 -8, -124 -26 Z" fill="${C.hair}"/>
      <path d="M -100 -14 C -102 4, -98 20, -92 30" fill="none" stroke="${C.hairLight}" stroke-width="2.2" opacity="0.55" stroke-linecap="round"/>
      <path d="M -84 -18 C -86 0, -82 16, -78 26" fill="none" stroke="${C.hairDark}" stroke-width="2" opacity="0.6" stroke-linecap="round"/>
      <!-- the ear, on top of the hair -->
      <path d="M -34 -16 C -52 -26, -70 -12, -66 8 C -63 24, -55 36, -40 38 C -32 28, -30 -4, -34 -16 Z" fill="${C.skinMid}"/>
      <path d="M -43 -7 C -55 -10, -60 2, -57 14 C -55 22, -51 27, -45 29" fill="none" stroke="${C.skinShade}" stroke-width="3" stroke-linecap="round"/>
      <path d="M -40 6 C -46 6, -48 12, -46 16" fill="none" stroke="${C.skinDeep}" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
      <path d="M -34 -16 C -30 -4, -31 24, -38 36" fill="none" stroke="${C.skinShade}" stroke-width="2" opacity="0.5"/>
      <!-- eyes and brows -->
      ${eye(24, -2, 40, true, p, id)}
      ${eye(79, -4, 23, false, p, id)}
      ${brow(-2, -25, 48, -27, p.brow[0], 8.5)}
      ${brow(64, -28, 95, -24, p.brow[1], 7)}
      <!-- nose -->
      <path d="M 86 -8 C 92 6, 100 17, 105 25 C 109 31, 107 38, 99 40 C 95 41, 92 40, 89 38 L 85 30 Z" fill="url(#${id}skin)"/>
      <path d="M 85 -6 C 87 8, 88 22, 87 33 C 90 37, 94 39, 98 39 C 93 32, 91 18, 89 4 Z" fill="${C.skinShade}" opacity="0.45" filter="url(#${id}soft)"/>
      <path d="M 92 37 C 95 35, 98 35, 101 37" fill="none" stroke="${C.skinDeep}" stroke-width="2.4" stroke-linecap="round" opacity="0.8"/>
      <path d="M 105 25 C 109 30, 108 36, 102 39" fill="none" stroke="${p.light.tint}" stroke-width="2.2" opacity="${n(0.55 * p.light.rim)}" stroke-linecap="round"/>
      ${mouth(p)}
      <!-- sideburn; fringe when the cap is off or backwards -->
      <path d="M -26 -46 C -22 -32, -22 -18, -24 -4 L -17 -10 C -15 -24, -14 -36, -12 -48 Z" fill="${C.hair}"/>
      ${capped ? '' : `
        <path d="M -16 -84 C 8 -98, 46 -96, 70 -84 C 80 -78, 88 -70, 94 -60 C 80 -64, 70 -66, 62 -62 C 58 -72, 46 -76, 34 -72 C 26 -80, 10 -80, -6 -74 Z" fill="${C.hair}"/>
        <path d="M 22 -92 C 42 -90, 58 -82, 68 -70" fill="none" stroke="${C.hairLight}" stroke-width="2.4" opacity="0.7" stroke-linecap="round"/>`}
      <!-- the bill's shadow over the forehead and eyes -->
      ${capped ? `<rect x="-110" y="-70" width="220" height="80" fill="url(#${id}capshadow)" clip-path="url(#${id}faceclip)"/>` : ''}
      ${p.cap === 'fwd' ? capFwd(p, id) : p.cap === 'back' ? capBack(p, id) : `<path d="M -112 -46 C -120 -110, -60 -156, 2 -158 C 62 -160, 98 -118, 96 -66 C 70 -76, 40 -86, 10 -82 C -30 -78, -70 -62, -112 -46 Z" fill="${C.hair}"/>
        <path d="M -80 -100 C -50 -130, 10 -146, 60 -126" fill="none" stroke="${C.hairLight}" stroke-width="3" opacity="0.5" stroke-linecap="round"/>`}
      ${p.shades > 0.01 ? `<g opacity="${n(Math.min(1, p.shades * 1.5))}" transform="translate(0 ${n((1 - p.shades) * -46)})">${shades()}</g>` : ''}`;
  }

  // ------------------------------------------------------------ the body
  const TOP = 'M -58 156 C -100 158, -160 172, -186 206 C -206 236, -210 300, -202 400 L -188 580 L 128 580 C 140 440, 152 320, 150 254 C 146 210, 112 172, 56 158 C 30 176, -32 176, -58 156 Z';
  function torso34(p, id) {
    return `
      <!-- neck, in the jaw's shadow at the top -->
      <path d="M -46 54 C -48 90, -50 126, -56 162 L 52 162 C 46 138, 42 118, 44 100 C 24 108, -14 92, -46 54 Z" fill="url(#${id}neck)"/>
      <path d="M -46 54 C -40 70, -28 84, -10 94" fill="none" stroke="${C.skinDeep}" stroke-width="5" opacity="0.35" filter="url(#${id}soft)"/>
      <!-- the crewneck -->
      <path d="${TOP}" fill="url(#${id}top)"/>
      <path d="M -58 156 C -30 178, 30 178, 56 158" fill="none" stroke="${C.topDark}" stroke-width="13" stroke-linecap="round"/>
      <path d="M -58 154 C -30 174, 30 174, 56 156" fill="none" stroke="${C.topLight}" stroke-width="1.6" opacity="0.5"/>
      <path d="M 56 158 C 112 172, 148 210, 152 254 C 156 320, 150 440, 146 560" fill="none" stroke="${p.light.tint}" stroke-width="4.5" opacity="${n(0.4 * p.light.rim)}"/>
      <path d="M -140 300 C -124 360, -124 440, -132 540" fill="none" stroke="${C.topDark}" stroke-width="6" opacity="0.8" stroke-linecap="round"/>
      <path d="M 40 260 C 70 300, 84 360, 86 430" fill="none" stroke="${C.topDark}" stroke-width="4" opacity="0.6" stroke-linecap="round"/>
      ${pearls()}`;
  }

  // The pearl chain, worn over the top: hangs round the front of the neck.
  function pearls() {
    const out = [];
    const N = 24;
    for (let i = 0; i <= N; i++) {
      const k = i / N;
      const x = lerp(-56, 56, k);
      const y = 168 + Math.sin(k * Math.PI) * 30 - k * 4;
      out.push(`<circle cx="${n(x)}" cy="${n(y)}" r="5" fill="${C.pearl}"/><circle cx="${n(x + 1.5)}" cy="${n(y + 1.6)}" r="3" fill="${C.pearlShade}" opacity="0.5"/><circle cx="${n(x - 1.4)}" cy="${n(y - 1.6)}" r="1.4" fill="#fff"/>`);
    }
    return out.join('');
  }

  // Arms: the far arm is drawn behind the body, the near arm over it.
  function arms34(p, id, layer) {
    const sleeve = `fill="url(#${id}top)"`;
    if (p.arms === 'fold') {
      if (layer === 'back') return '';
      return `
        <path d="M -192 236 C -214 300, -206 372, -160 394 C -96 418, 10 412, 108 388 C 136 380, 140 352, 120 342 C 60 354, -40 362, -122 350 C -150 340, -160 304, -150 254 Z" ${sleeve}/>
        <path d="M 150 270 C 160 322, 152 370, 122 388 C 60 404, -40 410, -98 392 C -70 378, 40 370, 104 354 C 124 338, 132 306, 132 278 Z" fill="${C.top}"/>
        <path d="M -98 392 C -40 410, 60 404, 122 388" fill="none" stroke="${C.topDark}" stroke-width="5"/>
        ${handShape(-112, 364, -10, 'tuck')}
        ${handShape(116, 344, 160, 'grip')}`;
    }
    if (p.arms === 'desk') {
      const hx = 196 + p.hand.x, hy = 420 + p.hand.y;
      if (layer === 'back') return `<path d="M 118 246 C 150 290, 172 352, 188 402 L 242 392 C 218 340, 192 290, 160 244 Z" fill="${C.topDark}"/>${handShape(226, 394, 6, 'keys')}`;
      return `
        <path d="M -186 232 C -212 300, -206 380, -162 420 C -102 454, 40 452, ${n(hx - 40)} ${n(hy + 6)} L ${n(hx - 36)} ${n(hy - 44)} C 40 398, -80 400, -126 384 C -150 366, -156 316, -148 254 Z" ${sleeve}/>
        <path d="M -126 384 C -80 400, 40 398, ${n(hx - 36)} ${n(hy - 44)}" fill="none" stroke="${C.topLight}" stroke-width="2.2" opacity="0.45"/>
        ${handShape(hx, hy - 16, 0, p.hand.click > 0.5 ? 'mouseDown' : 'mouse')}`;
    }
    if (p.arms === 'phone') {
      if (layer === 'back') return '';
      return `
        <path d="M -186 232 C -212 300, -208 372, -168 398 C -118 424, -40 424, 30 392 L 22 346 C -40 368, -100 368, -130 354 C -150 334, -156 300, -148 254 Z" ${sleeve}/>
        ${handShape(40, 370, -24, 'phone')}`;
    }
    if (layer === 'back') return '';
    return `<path d="M -192 236 C -214 310, -218 420, -210 540 L -160 540 C -156 440, -150 350, -146 264 Z" ${sleeve}/>`;
  }

  // Hands: simple, and five-fingered wherever fingers show.
  function handShape(x, y, rot, kind) {
    const skin = `fill="${C.skin}"`;
    const line = `fill="none" stroke="${C.skinShade}" stroke-width="2.2" stroke-linecap="round"`;
    let body = '';
    if (kind === 'mouse' || kind === 'mouseDown') {
      const d = kind === 'mouseDown' ? 3 : 0;
      body = `
        <ellipse cx="34" cy="22" rx="34" ry="20" fill="#1C1C1E"/>
        <path d="M 6 18 C 14 12, 40 10, 64 18" fill="none" stroke="#3A3A3E" stroke-width="2"/>
        <path d="M -40 -4 C -20 -18, 30 -20, 58 ${-8 + d} C 66 ${-4 + d}, 66 ${8 + d}, 56 ${12 + d} C 30 18, -10 20, -36 16 C -48 12, -50 2, -40 -4 Z" ${skin}/>
        <path d="M 20 ${-12 + d} C 34 ${-12 + d}, 48 ${-8 + d}, 58 ${-4 + d}" ${line}/>
        <path d="M 16 ${-3 + d} C 32 ${-3 + d}, 46 ${1 + d}, 58 ${4 + d}" ${line} opacity="0.6"/>
        <path d="M 12 6 C 28 7, 42 10, 54 12" ${line} opacity="0.6"/>
        <path d="M -12 12 C 0 18, 12 22, 22 22" ${line}/>`;
    } else if (kind === 'phone') {
      body = `
        <rect x="-22" y="-96" width="56" height="112" rx="10" fill="#0E0E10" stroke="#3A3A3E" stroke-width="2.4"/>
        <rect x="-17" y="-90" width="46" height="100" rx="7" fill="#1B2533"/>
        <path d="M -30 -10 C -36 -4, -36 14, -26 22 C -8 34, 22 34, 36 22 C 42 14, 40 0, 34 -6 L 34 6 C 20 14, -6 14, -22 4 Z" ${skin}/>
        <path d="M -30 -10 C -40 -20, -40 -40, -32 -50 C -26 -54, -22 -48, -24 -40 C -26 -30, -24 -18, -20 -10 Z" ${skin}/>`;
    } else if (kind === 'tuck') {
      body = `<path d="M -26 -16 C -8 -24, 22 -22, 34 -10 C 38 0, 34 12, 20 14 C 0 16, -20 10, -28 2 Z" ${skin}/>
        <path d="M -2 -16 C 8 -18, 20 -14, 28 -6" ${line}/>`;
    } else if (kind === 'keys') {
      body = `<path d="M -20 -10 C 0 -17, 28 -15, 42 -6 C 48 -2, 48 6, 42 9 C 28 13, 4 13, -16 9 C -26 5, -26 -6, -20 -10 Z" fill="${C.skinMid}"/>
        <path d="M 16 -12 C 24 -10, 32 -6, 38 0 M 12 -3 C 22 -1, 30 3, 38 7" ${line} opacity="0.5"/>`;
    } else if (kind === 'grip') {
      body = `<path d="M -20 -14 C -4 -22, 20 -18, 28 -6 C 30 4, 24 12, 12 14 C -6 16, -18 8, -22 0 Z" ${skin}/>
        <path d="M -6 -12 C 4 -14, 14 -10, 20 -4" ${line}/><path d="M -10 -2 C 0 -4, 12 0, 18 6" ${line} opacity="0.6"/>`;
    }
    return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)})">${body}</g>`;
  }

  // ------------------------------------------------------------ from behind
  function back(p, id) {
    return `
      <path d="M -52 40 C -54 84, -58 116, -60 150 L 60 150 C 58 116, 54 84, 52 40 Z" fill="url(#${id}neck)"/>
      <path d="M -150 228 C -150 186, -104 152, -46 144 C -20 154, 20 154, 46 144 C 104 152, 150 186, 150 228 L 156 580 L -156 580 Z" fill="url(#${id}topb)"/>
      <path d="M -46 144 C -20 154, 20 154, 46 144" fill="none" stroke="${C.topDark}" stroke-width="10" stroke-linecap="round"/>
      <path d="M -52 96 C -30 106, 30 106, 52 96" fill="none" stroke="${C.skinShade}" stroke-width="5" opacity="0.4" filter="url(#${id}soft)"/>
      <path d="M -82 -18 C -94 -22, -100 -8, -97 6 C -94 18, -88 24, -80 22 Z" fill="${C.skinMid}"/>
      <path d="M 82 -18 C 94 -22, 100 -8, 97 6 C 94 18, 88 24, 80 22 Z" fill="${C.skinMid}"/>
      <path d="M -84 -28 C -88 8, -80 42, -60 66 C -50 64, -40 70, -32 80 C -22 72, -10 74, -2 84 C 4 74, 16 72, 24 80 C 32 70, 44 64, 60 66 C 80 42, 88 8, 84 -28 Z" fill="${C.hair}"/>
      <path d="M -54 -12 C -56 14, -50 36, -40 52 M -20 -4 C -20 22, -16 44, -10 60 M 18 -4 C 18 22, 14 44, 8 60 M 54 -12 C 56 14, 50 36, 40 52" fill="none" stroke="${C.hairDark}" stroke-width="2.4" opacity="0.55" stroke-linecap="round"/>
      <path d="M -72 -8 C -72 16, -66 34, -56 48 M 72 -8 C 72 16, 66 34, 56 48" fill="none" stroke="${C.hairLight}" stroke-width="2" opacity="0.4" stroke-linecap="round"/>
      <path d="M -100 -30 C -104 -108, -54 -156, 0 -158 C 54 -156, 104 -108, 100 -30 C 60 -40, -60 -40, -100 -30 Z" fill="url(#${id}capg)"/>
      <path d="M 0 -158 L 0 -40" stroke="${C.capDark}" stroke-width="2.4"/>
      <path d="M 0 -158 C -40 -140, -62 -96, -66 -40 M 0 -158 C 40 -140, 62 -96, 66 -40" fill="none" stroke="${C.capDark}" stroke-width="2" opacity="0.8"/>
      <ellipse cx="0" cy="-158" rx="8" ry="4" fill="${C.capLight}"/>
      ${p.cap === 'back' ? '' : `
        <path d="M -34 -34 C -32 -64, 32 -64, 34 -34 Z" fill="${C.hair}"/>
        <path d="M -40 -34 C -36 -70, 36 -70, 40 -34" fill="none" stroke="${C.capDark}" stroke-width="6"/>
        <rect x="-30" y="-44" width="60" height="9" rx="4" fill="${C.capDark}"/>
        <rect x="-8" y="-45" width="16" height="11" rx="2" fill="#6E6A64"/>`}
      <path d="M -100 -30 C -60 -40, 60 -40, 100 -30 L 100 -22 C 60 -32, -60 -32, -100 -22 Z" fill="${C.capDark}"/>`;
  }

  function defs(p, id) {
    const key = p.light.key;
    return `<defs>
      <linearGradient id="${id}skin" x1="0" y1="0" x2="1" y2="0.25">
        <stop offset="0" stop-color="${C.skinMid}"/><stop offset="0.5" stop-color="${C.skin}"/><stop offset="1" stop-color="${C.skinLight}"/>
      </linearGradient>
      <linearGradient id="${id}neck" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${C.skinDeep}"/><stop offset="0.5" stop-color="${C.skinShade}"/><stop offset="1" stop-color="${C.skinMid}"/>
      </linearGradient>
      <linearGradient id="${id}capg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${C.capLight}"/><stop offset="0.45" stop-color="${C.cap}"/><stop offset="1" stop-color="${C.capDark}"/>
      </linearGradient>
      <linearGradient id="${id}billg" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${C.capDark}"/><stop offset="0.5" stop-color="${C.cap}"/><stop offset="1" stop-color="#242424"/>
      </linearGradient>
      <linearGradient id="${id}top" x1="0" y1="0" x2="1" y2="0.3">
        <stop offset="0" stop-color="${C.topDark}"/><stop offset="0.6" stop-color="${C.top}"/><stop offset="1" stop-color="${C.topLight}"/>
      </linearGradient>
      <linearGradient id="${id}topb" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${C.topLight}"/><stop offset="0.3" stop-color="${C.top}"/><stop offset="1" stop-color="${C.topDark}"/>
      </linearGradient>
      <linearGradient id="${id}capshadow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2A140C" stop-opacity="0.6"/><stop offset="0.5" stop-color="#2A140C" stop-opacity="0.28"/><stop offset="1" stop-color="#2A140C" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="lensg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#2A2A30"/><stop offset="0.5" stop-color="${C.lens}"/><stop offset="1" stop-color="#050506"/>
      </linearGradient>
      <filter id="${id}soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4"/></filter>
      <clipPath id="${id}faceclip"><path d="${FACE}"/></clipPath>
    </defs>`;
  }

  // The whole character: far arm, body, head, near arm, in that order. part 'body' leaves out the near
  // arm and 'arm' draws only that, so a set can put a desk between them; 'arm' uses the gradients
  // the 'body' part defines, so draw both into one document.
  function founderSVG(p, id = 'f', part = 'all') {
    p = p.view ? p : pose(p);
    const flip = p.flip ? 'scale(-1 1)' : '';
    if (p.view === 'back') return part === 'arm' ? '' : `<g transform="${flip}">${defs(p, id)}${back(p, id)}</g>`;
    const body = `<g transform="translate(0 -20)">${arms34(p, id, 'back')}${torso34(p, id)}</g>
        <g transform="translate(${n(p.head.dx)} ${n(p.head.dy)}) rotate(${n(p.head.rot)} 0 110)">${head34(p, id)}</g>`;
    const arm = `<g transform="translate(0 -20)">${arms34(p, id, 'front')}</g>`;
    return `<g transform="${flip}">${part === 'arm' ? '' : defs(p, id)}
      <g transform="rotate(${n(p.lean)} 0 520)">${part === 'body' ? body : part === 'arm' ? arm : body + arm}</g></g>`;
  }

  window.Founder = { pose, blendPose, founderSVG, colours: C };
})();
