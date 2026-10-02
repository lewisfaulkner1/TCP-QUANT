// The TCP founder as an animated character, drawn as a detailed 2D cartoon: ink lines that taper,
// two tones of shade with soft edges, the screen's light in front of him, and detailed eyes. One
// drawing built from parameters, so his face, cap, chain and clothes are the same in every shot.
//
// founderSVG(pose, id, part) returns an SVG <g> in the character's own space: the head's centre near
// 0,0, the cap's top at about y -162, the chin at about y 112, the torso down to y 560. A shot places
// and scales it. part 'body' leaves out the near arm and 'arm' draws only that (it uses the body's
// gradients, so draw both into one document). Every pose field is a number or a named part, so two
// poses blend: blendPose(a, b, k).
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
    line: '#3A2118', lineHair: '#1C120C', lineCloth: '#050505',
    skin: '#EEBF9E', skinHi: '#FADDC8', skinMid: '#E0A787', skinShade: '#C8876B', skinDeep: '#A2614B', skinOcc: '#774131', stubble: '#6F5D58',
    lipLow: '#C98B78', lipLine: '#5E3328', mouthIn: '#3E1612', teeth: '#F4EEE6', tongue: '#B9605A',
    hair: '#4B3426', hairDark: '#281A12', hairLight: '#9C7459', brow: '#352218',
    white: '#F2ECE5', whiteShade: '#D3C6BB', iris: '#5E3F2A', irisLight: '#8E6844', irisDark: '#2E1C11', pupil: '#110B08', lash: '#24170F',
    cap: '#1E1E21', capHi: '#36363C', capDark: '#0E0E10', stitch: '#4C4C55', eyelet: '#2C2C31',
    gold: '#D8AD4E', goldHi: '#F8E3A6', goldLo: '#9E7428',
    top: '#211F1E', topHi: '#3A3734', topDark: '#100F0E', stitchTop: '#3C3936',
    pearl: '#EFEBE3', pearlShade: '#ADA597', lens: '#0B0B0E',
  };
  const n = (v) => Math.round(v * 100) / 100;
  const lerp = (a, b, k) => a + (b - a) * k;
  const xy = (p) => `${n(p[0])} ${n(p[1])}`;

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
    const mixed = (x, y) => {
      if (typeof x === 'number' && typeof y === 'number') return lerp(x, y, k);
      if (Array.isArray(x)) return x.map((v, i) => mixed(v, y[i]));
      if (x && typeof x === 'object') { const o = {}; for (const key in x) o[key] = mixed(x[key], y[key]); return o; }
      return k < 0.5 ? x : y;
    };
    return mixed(a, b);
  }

  // ------------------------------------------------------------ drawing helpers
  // A smooth path through points (Catmull-Rom, as cubic Béziers).
  function smooth(pts, closed = false) {
    const P = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
    let d = `M ${xy(P[1])}`;
    for (let i = 1; i < P.length - 2; i++) {
      const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
      d += ` C ${xy([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])}, ${xy([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])}, ${xy(p2)}`;
    }
    return closed ? `${d} Z` : d;
  }
  // Two open curves joined into one closed shape (the second starts where the first ends).
  const loop = (a, b) => `${smooth(a)} L ${xy(b[0])} ${smooth(b).replace(/^M [-\d.]+ [-\d.]+/, '')} Z`;
  // Points along that curve.
  function sample(pts, per = 10) {
    const P = [pts[0], ...pts, pts[pts.length - 1]];
    const out = [];
    for (let i = 1; i < P.length - 2; i++) {
      const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
      for (let j = 0; j < per; j++) {
        const t = j / per, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t3)));
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  // An ink line through points, w wide at its fullest and tapering to its ends (taper is the share of
  // its length each end takes to reach full width).
  function ink(pts, w, fill = C.line, taper = [0.3, 0.3], op = 1, extra = '') {
    const S = sample(pts, 12);
    const L = [0];
    for (let i = 1; i < S.length; i++) L.push(L[i - 1] + Math.hypot(S[i][0] - S[i - 1][0], S[i][1] - S[i - 1][1]));
    const total = L[L.length - 1] || 1;
    const a = [], b = [];
    S.forEach((p, i) => {
      const q0 = S[Math.max(0, i - 1)], q1 = S[Math.min(S.length - 1, i + 1)];
      let dx = q1[0] - q0[0], dy = q1[1] - q0[1];
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      const u = L[i] / total;
      const k = Math.max(0, Math.min(1, taper[0] ? u / taper[0] : 1, taper[1] ? (1 - u) / taper[1] : 1));
      const h = (w / 2) * (0.12 + 0.88 * Math.pow(k, 0.65));
      a.push([p[0] - dy * h, p[1] + dx * h]);
      b.push([p[0] + dy * h, p[1] - dx * h]);
    });
    const ring = a.concat(b.reverse());
    return `<path d="M ${ring.map(xy).join(' L ')} Z" fill="${fill}"${op < 1 ? ` opacity="${n(op)}"` : ''}${extra}/>`;
  }
  const blob = (pts, fill, op = 1, extra = '') => `<path d="${smooth(pts, true)}" fill="${fill}"${op < 1 ? ` opacity="${n(op)}"` : ''}${extra}/>`;
  const off = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);
  // A little seeded randomness, so hair and stitches are the same every frame.
  function rnd(seed) {
    return () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
  }

  // ------------------------------------------------------------ the eyes
  // An almond eye under a heavy lid: one clean lid line, no lashes drawn, a small iris tucked under
  // the lid, one highlight. The near eye's outer corner is on the left; the far eye, beyond the bridge
  // of the nose, is narrower and partly hidden by it.
  function eye(near, p, id) {
    const A = near ? [1, 1] : [70, -1.5], B = near ? [44, 2.5] : [91, -3];
    const at = (k, dy = 0) => [lerp(A[0], B[0], k), lerp(A[1], B[1], k) + dy];
    const open = Math.max(0, Math.min(1.3, 1 - Math.max(p.lid, p.blink) * 1.05 + p.wide * 0.45));
    const rise = (near ? 10.5 : 8.5) * open;
    const pk = near ? 0.55 : 0.45;
    const drop = (near ? 4.6 : 3.6) * (0.65 + 0.35 * Math.min(1, open));
    const lineW = near ? 2.7 : 2.3;
    const outer = near ? A : B, dir = near ? -1 : 1;
    const tail = [outer[0] + dir * 3.5, outer[1] + 2];
    const crease = ink([at(0.15, -rise - 4.5 - p.wide * 2), at(pk, -rise - 6 - p.wide * 3), at(0.85, -rise * 0.8 - 4.5 - p.wide * 2)], 1.5, C.skinShade, [0.4, 0.4], 0.6);
    if (open < 0.12) {
      const shut = [A, at(0.35, drop * 0.45), at(0.65, drop * 0.45), B];
      return `${ink(near ? [tail, ...shut] : [...shut, tail], lineW, C.lash, [0.15, 0.15])}${crease}`;
    }
    const upper = [A, at(pk * 0.4, -rise * 0.7), at(pk, -rise), at(pk + (1 - pk) * 0.55, -rise * 0.78), B];
    const lower = [B, at(0.78, drop * 0.8), at(0.46, drop), at(0.16, drop * 0.7), A];
    const w = B[0] - A[0];
    const r = near ? 7.4 : 5.9, rx = near ? r : r * 0.78;
    const ix = (A[0] + B[0]) / 2 + w * 0.03 + p.look[0] * w * 0.2, iy = (A[1] + B[1]) / 2 - 1.2 + p.look[1] * 2.8;
    const clip = `${id}eye${near ? 'n' : 'f'}`;
    return `
      <clipPath id="${clip}"><path d="${loop(upper, lower)}"/></clipPath>
      <path d="${loop(upper, lower)}" fill="url(#${id}sclera)"/>
      <g clip-path="url(#${clip})">
        <ellipse cx="${n(ix)}" cy="${n(iy)}" rx="${n(rx)}" ry="${n(r)}" fill="url(#${id}iris)"/>
        <ellipse cx="${n(ix)}" cy="${n(iy)}" rx="${n(rx * 0.45)}" ry="${n(r * 0.45)}" fill="${C.pupil}"/>
        ${ink(upper, 7, C.skinOcc, [0, 0], 0.35)}
        <circle cx="${n(ix + rx * 0.32)}" cy="${n(iy - r * 0.34)}" r="${n(r * 0.22)}" fill="#fff" opacity="0.9"/>
      </g>
      ${ink(lower.slice(near ? 2 : 0, near ? 5 : 3), 1.2, C.skinShade, [0.4, 0.4], 0.5)}
      ${ink(near ? [tail, ...upper] : [...upper, tail], lineW, C.lash, [0.12, 0.12])}
      ${crease}`;
  }

  // A brow: thick and fairly straight, low over the eye, squared at the head by the nose.
  function brow(near, raise) {
    const up = -raise * 6, frown = Math.max(0, -raise);
    const T = near ? [-10, -18.5 + up * 0.8] : [97, -19.5 + up * 0.8];
    const H = near ? [50 - frown * 3, -22.5 + up + frown * 4.5] : [64 + frown * 3, -24 + up + frown * 4.5];
    const M = near ? [21, -25.5 + up - Math.max(0, raise) * 1.5] : [81, -26.5 + up];
    const pts = near ? [T, M, H] : [H, M, T];
    let hairs = '';
    const S = sample(pts, 8);
    for (let i = 1; i < S.length - 1; i += 1) {
      const k = i / (S.length - 1);
      const headness = near ? k : 1 - k;
      const lat = near ? -1 : 1;
      const dx = lat * (1 - headness * 0.75), dy = -(0.3 + headness * 0.6);
      const len = Math.hypot(dx, dy);
      const [x, y] = S[i];
      const yo = (i % 3 - 1) * 2;
      hairs += ink([[x - dx / len * 3, y - dy / len * 3 + yo], [x + dx / len * 4, y + dy / len * 4 + yo]], 1.2, C.lineHair, [0.25, 0.6], 0.8);
    }
    return `${ink(pts, near ? 10 : 8.5, C.brow, near ? [0.7, 0.04] : [0.04, 0.7])}${hairs}`;
  }

  // ------------------------------------------------------------ nose, mouth, ear
  // A straight nose, its bridge along the far edge of the face and its tip out past the cheek, as in
  // the first sheet.
  function nose(p, id) {
    const shape = [[89, -9], [95, 2], [103, 14], [110.5, 24], [113, 31], [109, 38.5], [101, 41], [93, 41.5], [87, 39], [84, 33], [85.5, 24], [87.5, 10]];
    return `
      <path d="${smooth(shape, true)}" fill="url(#${id}skin)"/>
      ${blob([[86, -4], [90, 10], [92, 24], [90, 34], [84, 35], [81.5, 25], [82.5, 8]], C.skinShade, 0.45, ` filter="url(#${id}soft)"`)}
      ${blob([[80, 42], [92, 43], [101, 45], [93, 50], [82, 48.5]], C.skinShade, 0.4, ` filter="url(#${id}soft)"`)}
      ${ink([[93, -2], [100, 8], [107, 18]], 2.4, C.skinHi, [0.3, 0.3], 0.65)}
      ${ink([[91.5, -7], [99, 5], [106.5, 16.5], [112.5, 27.5]], 2.2, C.line, [0.6, 0.05], 0.85)}
      ${ink([[113, 28], [112, 35], [106.5, 39.8], [99, 41.4]], 2.4, C.line, [0.1, 0.4])}
      ${blob([[94, 36.5], [99, 37.5], [104, 39.5], [100.5, 41.3], [95, 40.8]], C.skinOcc, 0.85)}
      ${ink([[87.5, 27], [84, 33], [86, 39], [92, 41.3]], 2, C.line, [0.45, 0.25], 0.85)}
      <ellipse cx="107.5" cy="25.5" rx="3" ry="2.1" fill="#fff" opacity="0.45"/>`;
  }

  // A plain mouth: one line, the lower lip in a little shade, no colour to speak of.
  function mouth(p, id) {
    const { open, smile, smirk } = p.mouth;
    const L = [53, 64.5 - smile * 3 + Math.max(0, -smile) * 1.4];
    const R = [94, 61.5 - smile * 3.4 - smirk * 6.5];
    const gap = open > 0.04 ? 2.5 + open * 16 : 0;
    const line = [L, [63, 64.2 + smile * 0.6], [76, 63.8 + smile * 1.1 - smirk * 1.3], [86, 62.6 - smirk * 3.2], R];
    const low = line.map(([x, y], i) => [x, y + gap * [0, 0.85, 1, 0.82, 0][i]]);
    let inside = '';
    if (gap) {
      const hole = loop(line, [...low].reverse());
      inside = `<clipPath id="${id}mouth"><path d="${hole}"/></clipPath>
        <path d="${hole}" fill="${C.mouthIn}"/>
        <g clip-path="url(#${id}mouth)">
          ${ink(off(line, 0, 2), 7, C.teeth, [0.12, 0.12])}
          ${[66, 72, 78, 84].map((x) => `<path d="M ${x} ${n(lerp(line[1][1], line[3][1], (x - 63) / 23) + 1)} l 0.5 4" stroke="#C9C0B6" stroke-width="0.8"/>`).join('')}
          ${open > 0.3 ? `<ellipse cx="76" cy="${n(64 + gap + 1)}" rx="12" ry="${n(4 + open * 3)}" fill="${C.tongue}"/>` : ''}
        </g>`;
    }
    return `
      ${blob([[57, 62.5], [70, 59], [78, 60], [86, 58.5], [92, 61], [86, 62.8], [72, 63.4], [59, 64.4]], C.skinShade, 0.25)}
      ${blob([[60, 66 + gap], [76, 67 + gap], [88, 65 + gap], [84, 70.5 + gap], [72, 72 + gap], [62, 69.5 + gap]], C.lipLow, 0.3)}
      ${ink([[64, 75.5 + gap], [75, 77 + gap], [85, 74.5 + gap]], 3.4, C.skinShade, [0.4, 0.4], 0.55, ` filter="url(#${id}soft)"`)}
      ${inside}
      ${ink(line, 2.4, C.lipLine, [0.2, 0.2])}
      ${gap ? ink(low, 1.6, C.lipLine, [0.3, 0.3], 0.7) : ''}
      ${ink([[L[0] + 2.5, L[1] - 0.4], L, [L[0] - 2, L[1] + 1.4]], 1.8, C.lipLine, [0.3, 0.6], 0.7)}
      ${smirk > 0.15 ? ink([[R[0] - 1, R[1]], [R[0] + 3, R[1] - 2.5], [R[0] + 4.5, R[1] - 6.5]], 1.7, C.skinShade, [0.2, 0.6], smirk) : ''}
      ${smile > 0.35 ? ink([[57, 50], [53, 58], [54, 66]], 1.6, C.skinShade, [0.4, 0.4], (smile - 0.35) * 1.5) : ''}`;
  }

  function ear(id) {
    const rim = [[-33, -17], [-44, -25], [-57, -22], [-65, -10], [-66.5, 6], [-62, 20], [-55, 31], [-48, 40], [-40, 41.5], [-35, 33]];
    return `
      ${blob(rim, C.skinMid)}
      ${blob([[-38, -14], [-52, -17], [-60, -6], [-59, 10], [-54, 24], [-47, 31], [-40, 29], [-36.5, 16], [-36.5, 0]], C.skinShade, 0.6)}
      ${ink([[-40, -17], [-53, -18.5], [-61, -6], [-60, 12], [-53, 27]], 2.6, C.skinDeep, [0.2, 0.5], 0.85)}
      ${ink([[-46.5, -8], [-53.5, 2], [-52.5, 14], [-46, 24]], 2.2, C.skinDeep, [0.3, 0.4], 0.75)}
      ${ink([[-45, -4], [-51, 4], [-50, 13]], 1.6, C.skinHi, [0.4, 0.4], 0.45)}
      ${blob([[-43.5, 4], [-39, 7], [-39, 15], [-43.5, 17.5], [-46.5, 11]], C.skinDeep, 0.7)}
      ${ink([[-36.5, 5], [-33, 10.5], [-35, 16.5]], 3.2, C.skinMid, [0.3, 0.3])}
      <ellipse cx="-44" cy="35" rx="3.6" ry="2.8" fill="${C.skinHi}" opacity="0.55"/>
      ${ink(rim.slice(0, 9), 1.9, C.line, [0.15, 0.3])}`;
  }

  // ------------------------------------------------------------ hair
  // Short dark-brown hair under the cap: the side above and behind the ear, the sideburn, and the
  // back falling to the nape in a few flicks. Strands for texture, highlights where the light falls.
  function sideHair(id) {
    const r = rnd(7);
    const mass = [[-126, -26], [-84, -37], [-46, -44], [-27, -47], [-22.5, -31], [-23.5, -12], [-27.5, -8], [-31, -18], [-38, -24.5], [-50, -28.5], [-62, -24.5], [-68.5, -11], [-70.5, 3], [-72, 14], [-80, 20], [-88, 18.5], [-96, 23], [-104, 18], [-112, 16], [-118, 6], [-123, -8]];
    let strands = '', lights = '';
    for (let i = 0; i < 18; i++) {
      const k = i / 17;
      const x0 = lerp(-120, -32, k) + (r() - 0.5) * 3;
      const y0 = lerp(-28, -44, k) + 2;
      const len = lerp(40, 26, k) * (0.85 + r() * 0.3);
      const x1 = x0 - lerp(16, 6, k) - r() * 4, y1 = y0 + len;
      strands += ink([[x0, y0], [lerp(x0, x1, 0.45) - 1, lerp(y0, y1, 0.5)], [x1, y1]], 1.5 + r() * 0.7, C.hairDark, [0.15, 0.75], 0.8);
      if (i % 3 === 1) lights += ink([[x0 + 1, y0 + 4], [x0 - 4, y0 + len * 0.45]], 1.6, C.hairLight, [0.3, 0.6], 0.6);
    }
    return `
      ${blob(mass, C.hair)}
      ${blob([[-70, 0], [-72, 12], [-82, 17], [-96, 19], [-110, 13], [-118, 2], [-104, 4], [-88, 2]], C.hairDark, 0.45)}
      ${strands}${lights}
      ${[0, 1, 2, 3].map((i) => ink([[-28 + i * 1.4, -45], [-27.5 + i * 1.2, -28], [-28 + i * 1.1, -12 - i * 2]], 1.1, C.hairDark, [0.2, 0.5], 0.75)).join('')}
      ${ink(mass.slice(5, 21), 1.5, C.lineHair, [0.1, 0.1], 0.6)}`;
  }
  // The hair on top, when the cap is off or backwards: a textured crop swept towards his face.
  function fringe() {
    const r = rnd(3);
    const edge = [[-114, -44], [-118, -96], [-84, -142], [-20, -162], [40, -156], [84, -126], [100, -86], [96, -60], [88, -66], [80, -56], [70, -66], [58, -58], [48, -70], [34, -62], [22, -76], [6, -70], [-8, -82], [-30, -74], [-60, -62], [-90, -52]];
    let strands = '';
    for (let i = 0; i < 16; i++) {
      const k = i / 15;
      const x0 = lerp(-100, 50, k) + (r() - 0.5) * 6, y0 = -150 + Math.abs(k - 0.4) * 30;
      const x1 = x0 + 30 + r() * 12, y1 = y0 + 62 + r() * 16;
      strands += ink([[x0, y0], [lerp(x0, x1, 0.5) + 6, lerp(y0, y1, 0.5) - 4], [x1, y1]], 2 + r(), C.hairDark, [0.2, 0.7], 0.75);
    }
    return `${blob(edge, C.hair)}
      ${blob([[-110, -60], [-100, -100], [-60, -80], [-20, -78], [-40, -66], [-90, -52]], C.hairDark, 0.4)}
      ${strands}
      ${ink([[-70, -128], [-20, -146], [30, -140]], 4, C.hairLight, [0.4, 0.4], 0.55)}
      ${ink([[-30, -120], [10, -132], [50, -122]], 2.5, C.hairLight, [0.4, 0.4], 0.45)}
      ${ink(edge, 1.8, C.lineHair, [0.05, 0.05], 0.7)}`;
  }

  // ------------------------------------------------------------ caps
  function crownMark(fill) {
    const k = window.CROWN;
    if (!k) return '';
    return `<g transform="translate(-100 -88)"><path d="${k.path}" fill="${fill}" fill-rule="evenodd"/>${k.circles.map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`).join('')}</g>`;
  }
  // The crown, embroidered in gold thread: a shadow under it, satin-stitch sheen, a darker edge.
  function embroidery(id) {
    const k = window.CROWN;
    if (!k) return '';
    let satin = '';
    for (let i = -14; i < 16; i++) satin += `<path d="M ${-120 + i * 16} 120 L ${-20 + i * 16} -120" stroke="${C.goldHi}" stroke-width="5" opacity="0.28"/>`;
    return `
      <clipPath id="${id}crownclip"><path d="${k.path}" transform="translate(-100 -88)" fill-rule="evenodd"/>${k.circles.map(([cx, cy, r]) => `<circle cx="${cx - 100}" cy="${cy - 88}" r="${r}"/>`).join('')}</clipPath>
      <g transform="translate(5 8)" opacity="0.55">${crownMark('#000')}</g>
      ${crownMark(`url(#${id}goldg)`)}
      <g clip-path="url(#${id}crownclip)">${satin}</g>
      <g transform="translate(-100 -88)"><path d="${k.path}" fill="none" stroke="${C.goldLo}" stroke-width="5" fill-rule="evenodd"/></g>`;
  }
  const CROWN_PATH = 'M -122 -30 C -130 -100, -76 -160, -2 -162 C 62 -162, 102 -120, 106 -64 C 60 -54, -36 -46, -122 -30 Z';
  const CAP_EDGE = [[-122, -30], [-117, -80], [-92.8, -121.5], [-53, -150.4], [-2, -162], [41.3, -154.6], [74.5, -134], [96.4, -102.9], [106, -64]];
  function stitchLine(pts, dx = 2.6) {
    return `<path d="${smooth(off(pts, -dx, 0))}" fill="none" stroke="${C.stitch}" stroke-width="1.1" stroke-dasharray="3 2.6" opacity="0.8"/>
      <path d="${smooth(off(pts, dx, 0))}" fill="none" stroke="${C.stitch}" stroke-width="1.1" stroke-dasharray="3 2.6" opacity="0.8"/>`;
  }
  function capFwd(p, id) {
    const front = [[-2, -162], [36, -136], [56, -100], [66, -58]];
    const side = [[-2, -162], [-30, -132], [-48, -92], [-56, -42]];
    const far = [[-2, -162], [50, -146], [84, -114], [99, -78]];
    const rows = [0, 1, 2, 3, 4, 5].map((i) => {
      const k = i * 5.2;
      return `<path d="${smooth([[24 + k * 0.5, -66 - k * 0.6], [80, -80 + k * 0.7], [140, -80.5 + k * 0.75], [188 - k * 1.1, -60 + k * 0.4]])}" fill="none" stroke="${C.stitch}" stroke-width="1.1" stroke-dasharray="3.2 2.4" opacity="${n(0.75 - i * 0.07)}"/>`;
    }).join('');
    return `
      <path d="${CROWN_PATH}" fill="url(#${id}capg)"/>
      <g clip-path="url(#${id}capclip)">
        ${blob([[-130, -40], [-60, -150], [-20, -150], [-44, -90], [-56, -40]], C.capDark, 0.6, ` filter="url(#${id}soft)"`)}
        ${blob([[40, -130], [80, -128], [104, -80], [70, -60], [56, -96]], C.capHi, 0.55, ` filter="url(#${id}soft)"`)}
        ${blob([[-122, -30], [106, -64], [106, -54], [-120, -20]], C.capDark, 0.8)}
      </g>
      ${ink(front, 2.2, C.capDark, [0.1, 0.1])}${stitchLine(front)}
      ${ink(side, 2.2, C.capDark, [0.1, 0.1])}${stitchLine(side)}
      ${ink(far, 1.8, C.capDark, [0.1, 0.3], 0.8)}
      ${[[-30, -120], [52, -128], [-80, -96]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="3.6" ry="3" fill="${C.eyelet}"/><ellipse cx="${x}" cy="${y}" rx="1.6" ry="1.3" fill="#060607"/>`).join('')}
      <ellipse cx="-2" cy="-161" rx="10" ry="5" fill="${C.cap}"/><ellipse cx="-4" cy="-163" rx="5" ry="2" fill="${C.capHi}"/>
      <g transform="translate(47 -101) rotate(9) skewY(-6) scale(0.2)">${embroidery(id)}</g>
      <path d="M -122 -30 C -36 -46, 60 -54, 106 -64 L 106 -55 C 60 -45, -36 -37, -120 -21 Z" fill="${C.capDark}"/>
      ${ink([[-120, -27], [-36, -42.5], [60, -51], [105, -60]], 1.2, C.capHi, [0.2, 0.2], 0.5)}
      ${ink([[103, -66], [94, -102], [73, -131], [44, -150]], 3, p.light.tint, [0.2, 0.5], 0.32 * p.light.rim)}
      <!-- the bill: top, rows of stitching, the edge, the dark underside -->
      <path d="M 16 -64 C 70 -84, 150 -87, 201 -59 C 206 -55, 204 -50, 197 -48 C 152 -48, 106 -45, 96 -52 C 70 -57, 42 -59, 16 -64 Z" fill="url(#${id}billg)"/>
      ${rows}
      <path d="M 96 -52 C 106 -45, 152 -48, 197 -48 C 187 -40, 150 -34, 120 -36 C 106 -38, 98 -44, 96 -52 Z" fill="${C.capDark}"/>
      ${ink([[104, -82.5], [150, -86.5], [201, -59]], 2.6, p.light.tint, [0.3, 0.1], 0.5 * p.light.rim)}
      ${ink([[201, -58], [197, -48.5], [150, -47.5], [100, -51]], 1.8, C.capHi, [0.1, 0.4], 0.6)}
      ${ink(CAP_EDGE, 2.2, '#050506', [0.05, 0.05], 0.9)}`;
  }

  function capBack(p, id) {
    return `
      <path d="M -112 -40 C -138 -52, -170 -52, -186 -38 C -176 -30, -150 -26, -120 -28 Z" fill="url(#${id}billg)"/>
      ${ink([[-114, -40], [-140, -49], [-168, -48], [-185, -38]], 2, C.capHi, [0.1, 0.3], 0.5)}
      <path d="${CROWN_PATH}" fill="url(#${id}capg)"/>
      ${ink([[-2, -162], [36, -136], [56, -100], [66, -58]], 2.2, C.capDark, [0.1, 0.1])}
      ${ink([[-2, -162], [-30, -132], [-48, -92], [-56, -42]], 2.2, C.capDark, [0.1, 0.1])}
      <ellipse cx="-2" cy="-161" rx="10" ry="5" fill="${C.cap}"/>
      <path d="M 44 -96 C 60 -96, 76 -86, 86 -70 L 74 -64 C 66 -76, 56 -82, 40 -84 Z" fill="${C.hair}"/>
      <path d="M 34 -98 C 56 -98, 82 -86, 98 -68" fill="none" stroke="${C.capDark}" stroke-width="7" stroke-linecap="round"/>
      <rect x="52" y="-88" width="10" height="6" rx="1.5" fill="#6E6A64" transform="rotate(28 57 -85)"/>
      <path d="M -122 -30 C -36 -46, 60 -54, 106 -64 L 106 -56 C 60 -46, -36 -38, -120 -22 Z" fill="${C.capDark}"/>
      ${ink(CAP_EDGE, 2.2, '#050506', [0.05, 0.05], 0.9)}`;
  }

  // Sunglasses: thin black frames, dark lenses with the screen's light caught in them.
  function shades(p) {
    const lensL = [[-6, -19], [20, -25], [48, -22], [52, -14], [46, 4], [28, 10], [6, 8], [-5, -4]];
    const lensR = [[62, -21], [80, -26], [97, -21], [98, -10], [93, 3], [79, 6], [65, 2], [61, -10]];
    const glint = (x, y, s) => `<path d="M ${x} ${y} l ${n(14 * s)} ${n(-4 * s)} l ${n(3 * s)} ${n(12 * s)} l ${n(-14 * s)} ${n(4 * s)} Z" fill="${p.light.tint}" opacity="0.35"/>`;
    return `
      ${blob(lensL, 'url(#lensg)')}${blob(lensR, 'url(#lensg)')}
      ${glint(18, -12, 1)}${glint(76, -14, 0.75)}
      ${ink([[2, -14], [20, -19], [40, -15]], 2.6, '#fff', [0.4, 0.4], 0.3)}
      ${ink([...lensL, lensL[0]], 2.4, C.lens, [0, 0])}${ink([...lensR, lensR[0]], 2, C.lens, [0, 0])}
      ${ink([[50, -19], [55, -22], [61, -19]], 3, C.lens, [0.1, 0.1])}
      ${ink([[-6, -16], [-30, -14], [-46, -11]], 3.6, C.lens, [0.05, 0.3])}`;
  }

  // ------------------------------------------------------------ the head, three-quarter view
  const FACE = 'M -98 -48 C -102 -104, -52 -142, 0 -142 C 50 -142, 88 -104, 93 -60 C 96 -44, 100 -34, 101 -24 C 101 -16, 97 -10, 97 -4 C 98 6, 103 14, 103 24 C 103 38, 99 50, 96 62 C 94 76, 93 90, 91 100 C 89 108, 82 115, 68 116.5 C 50 118, 22 112, -8 100 C -24 93, -38 86, -46 74 C -54 58, -84 32, -96 0 Z';
  function head34(p, id) {
    const capped = p.cap === 'fwd';
    const tint = p.light.tint, rim = p.light.rim;
    return `
      <path d="${FACE}" fill="url(#${id}skin)"/>
      <g clip-path="url(#${id}faceclip)">
        ${ink([[80, -56], [88, -24], [90, 8], [92, 38], [88, 68], [82, 96]], 22, C.skinHi, [0.15, 0.15], 0.4, ` filter="url(#${id}soft2)"`)}
        ${ink([[96, -40], [101, 0], [102, 40], [94, 80]], 6, tint, [0.2, 0.2], 0.3 * rim, ` filter="url(#${id}soft)"`)}
        ${blob([[-112, -70], [-14, -54], [-12, -22], [-16, 8], [-10, 40], [4, 66], [20, 90], [38, 110], [54, 124], [-40, 134], [-122, 60]], C.skinShade, 0.42, ` filter="url(#${id}soft2)"`)}
        ${ink([[-30, 46], [-4, 58], [24, 72]], 10, C.skinShade, [0.3, 0.3], 0.3, ` filter="url(#${id}soft2)"`)}
        ${ink([[-48, 66], [-14, 94], [30, 110], [68, 116]], 12, C.skinDeep, [0.2, 0.2], 0.3, ` filter="url(#${id}soft)"`)}
        ${ink([[84, 41], [68, 50], [57, 60]], 2.4, C.skinShade, [0.3, 0.5], 0.35, ` filter="url(#${id}soft)"`)}
        <ellipse cx="30" cy="-9" rx="27" ry="10" fill="${C.skinMid}" opacity="0.55" filter="url(#${id}soft)"/>
        <ellipse cx="84" cy="-9" rx="11" ry="7" fill="${C.skinMid}" opacity="0.5" filter="url(#${id}soft)"/>
        <ellipse cx="22" cy="30" rx="19" ry="9" fill="${C.skinHi}" opacity="0.5" filter="url(#${id}soft)"/>
        ${ink([[-40, 70], [-14, 94], [24, 110], [62, 117], [86, 108]], 16, C.stubble, [0.2, 0.2], 0.1, ` filter="url(#${id}soft2)"`)}
        ${blob([[56, 47], [76, 44.5], [94, 46], [95, 54], [76, 53], [56, 57]], C.stubble, 0.1, ` filter="url(#${id}soft)"`)}
        <ellipse cx="80" cy="101" rx="9" ry="5" fill="${C.skinHi}" opacity="0.5" filter="url(#${id}soft)"/>
        ${ink([[93, -60], [101, -24], [97, -4], [103, 24], [95, 60], [88, 98]], 8, tint, [0.2, 0.2], 0.45 * rim, ` filter="url(#${id}soft)"`)}
      </g>
      ${sideHair(id)}
      ${ear(id)}
      ${eye(true, p, id)}${eye(false, p, id)}
      ${brow(true, p.brow[0])}${brow(false, p.brow[1])}
      ${nose(p, id)}
      ${mouth(p, id)}
      ${ink([[-52, 62], [-46, 74], [-30, 88], [-8, 100], [20, 111], [46, 117.5], [68, 116.5], [83, 112], [91, 100]], 3, C.line, [0.12, 0.08])}
      ${ink([[91, 100], [93.5, 86], [96, 66], [99.5, 50], [103, 30], [103, 18], [99, 6], [97, -4], [100, -20], [100, -34]], 2, C.line, [0.05, 0.45])}
      ${capped ? `<path d="M -40 -50 C 0 -56, 60 -62, 108 -66 L 110 -34 C 80 -24, 40 -20, 0 -24 C -20 -28, -34 -36, -40 -50 Z" fill="url(#${id}capshadow)" clip-path="url(#${id}faceclip)" filter="url(#${id}soft)"/>` : ''}
      ${p.cap === 'fwd' ? capFwd(p, id) : p.cap === 'back' ? capBack(p, id) : fringe()}
      ${p.shades > 0.01 ? `<g opacity="${n(Math.min(1, p.shades * 1.5))}" transform="translate(0 ${n((1 - p.shades) * -46)})">${shades(p)}</g>` : ''}`;
  }

  // ------------------------------------------------------------ the body
  const NECK = 'M -56 50 C -58 92, -62 128, -72 168 L 66 168 C 58 142, 52 120, 54 104 C 30 112, -18 94, -56 50 Z';
  const TOP = 'M -64 156 C -104 158, -156 168, -182 192 C -202 212, -210 270, -204 360 L -192 580 L 132 580 C 142 452, 154 336, 154 264 C 152 214, 118 176, 62 158 C 34 180, -36 180, -64 156 Z';
  const TOP_EDGE_NEAR = [[-64, 156], [-104, 158], [-150, 166], [-182, 192], [-204, 236], [-208, 300], [-204, 360], [-192, 580]];
  const TOP_EDGE_FAR = [[62, 158], [116, 176], [148, 214], [154, 264], [150, 340], [142, 452], [132, 580]];
  function torso34(p, id) {
    const tint = p.light.tint, rim = p.light.rim;
    let ribs = '';
    for (let i = 0; i <= 24; i++) {
      const k = i / 24, x = lerp(-62, 60, k);
      const y0 = 157 + Math.sin(k * Math.PI) * 21 - k * 1.5;
      ribs += `<path d="M ${n(x)} ${n(y0)} L ${n(x + (k - 0.5) * 3)} ${n(y0 + 10)}" stroke="${C.topHi}" stroke-width="0.9" opacity="0.4"/>`;
    }
    return `
      <!-- the neck: the jaw's shadow across it, the muscle down its side, the throat -->
      <path d="${NECK}" fill="url(#${id}neck)"/>
      ${blob([[-56, 52], [-12, 92], [54, 106], [56, 124], [12, 122], [-46, 100]], C.skinDeep, 0.55, ` filter="url(#${id}soft)"`)}
      ${ink([[-44, 68], [-24, 112], [2, 156]], 4, C.skinShade, [0.3, 0.3], 0.45)}
      <ellipse cx="46" cy="128" rx="5" ry="8" fill="${C.skinHi}" opacity="0.4"/>
      ${ink([[40, 138], [46, 141], [52, 136]], 1.8, C.skinShade, [0.3, 0.3], 0.65)}
      ${ink([[54, 106], [50, 128], [54, 150], [62, 166]], 1.8, C.line, [0.2, 0.2], 0.8)}
      ${ink([[-56, 56], [-60, 112], [-70, 166]], 2.2, C.line, [0.1, 0.1], 0.8)}
      <!-- the crewneck: shade, folds, seams, the ribbed collar -->
      <path d="${TOP}" fill="url(#${id}top)"/>
      <g clip-path="url(#${id}topclip)">
        ${blob([[-214, 196], [-152, 186], [-120, 300], [-128, 600], [-224, 600]], C.topDark, 0.6, ` filter="url(#${id}soft2)"`)}
        ${blob([[40, 200], [122, 190], [162, 262], [154, 600], [76, 600], [62, 330]], C.topHi, 0.5, ` filter="url(#${id}soft2)"`)}
        ${ink([[-60, 172], [0, 194], [58, 174]], 9, C.topDark, [0.2, 0.2], 0.55, ` filter="url(#${id}soft)"`)}
        ${ink([[-40, 266], [-4, 306], [26, 368]], 3.6, C.topDark, [0.4, 0.4], 0.6)}
        ${ink([[-30, 270], [4, 314]], 2, C.topHi, [0.4, 0.4], 0.45)}
        ${ink([[112, 300], [98, 360], [102, 432]], 3.2, C.topDark, [0.4, 0.4], 0.7)}
        ${ink([[118, 306], [106, 362]], 1.8, C.topHi, [0.4, 0.4], 0.4)}
        ${ink([[-60, 470], [-20, 500], [30, 520]], 3, C.topDark, [0.4, 0.4], 0.5)}
        ${ink([[-100, 420], [-70, 446], [-40, 452]], 2.6, C.topDark, [0.4, 0.4], 0.45)}
      </g>
      ${ink([[-60, 160], [-110, 170], [-162, 190]], 1.8, C.lineCloth, [0.1, 0.3], 0.9)}
      <path d="${smooth([[-60, 164], [-110, 174], [-160, 194]])}" fill="none" stroke="${C.stitchTop}" stroke-width="1" stroke-dasharray="3 2.5"/>
      ${ink([[-162, 192], [-176, 250], [-170, 320], [-156, 364]], 1.6, C.lineCloth, [0.2, 0.3], 0.8)}
      <path d="M -64 156 C -34 180, 34 180, 62 158 L 60 169 C 32 191, -34 191, -62 167 Z" fill="${C.topDark}"/>
      ${ribs}
      ${ink([[-64, 155], [-34, 178], [0, 181], [34, 177], [62, 157]], 1.6, C.lineCloth, [0.1, 0.1], 0.9)}
      ${ink([[-62, 167], [-34, 189], [0, 192], [32, 189], [60, 169]], 1.2, C.lineCloth, [0.1, 0.1], 0.6)}
      ${ink(TOP_EDGE_FAR, 4.5, tint, [0.1, 0.2], 0.42 * rim)}
      ${ink(TOP_EDGE_NEAR, 2.4, C.lineCloth, [0.05, 0.05], 0.9)}
      ${ink(TOP_EDGE_FAR, 2, C.lineCloth, [0.05, 0.05], 0.8)}
      ${pearls(id)}`;
  }

  // The pearl chain, worn over the top round the front of the neck, its shadow on the collar.
  function pearls(id) {
    const N = 24, pts = [];
    for (let i = 0; i <= N; i++) {
      const k = i / N;
      pts.push([lerp(-58, 58, k), 170 + Math.sin(k * Math.PI) * 30 - k * 4]);
    }
    return `${ink(off(pts, 1, 4), 7, '#000', [0.1, 0.1], 0.35, ` filter="url(#${id}soft)"`)}
      ${pts.map(([x, y]) => `<circle cx="${n(x)}" cy="${n(y)}" r="5.3" fill="url(#${id}pearl)"/><circle cx="${n(x + 1.6)}" cy="${n(y - 1.8)}" r="1.3" fill="#fff"/>`).join('')}`;
  }

  // Arms: the far arm is drawn behind the body, the near arm over it. Sleeves have folds at the
  // elbow and ribbed cuffs.
  function arms34(p, id, layer) {
    const sleeve = `fill="url(#${id}top)"`;
    const cuff = (pts) => `${ink(pts, 11, C.topDark, [0.1, 0.1], 0.95)}${ink(pts, 11, C.topHi, [0.1, 0.1], 0.18)}`;
    if (p.arms === 'fold') {
      if (layer === 'back') return '';
      return `
        <path d="M -192 236 C -214 300, -206 372, -160 394 C -96 418, 10 412, 108 388 C 136 380, 140 352, 120 342 C 60 354, -40 362, -122 350 C -150 340, -160 304, -150 254 Z" ${sleeve}/>
        ${ink([[-188, 296], [-174, 348], [-146, 374]], 3.4, C.topDark, [0.3, 0.3], 0.85)}
        ${ink([[-196, 330], [-186, 366]], 2.4, C.topDark, [0.3, 0.3], 0.7)}
        ${ink([[-110, 362], [-40, 366], [20, 360]], 2.8, C.topDark, [0.3, 0.3], 0.6)}
        ${ink([[-100, 352], [-30, 356]], 2, C.topHi, [0.3, 0.3], 0.5)}
        <path d="M 150 270 C 160 322, 152 370, 122 388 C 60 404, -40 410, -98 392 C -70 378, 40 370, 104 354 C 124 338, 132 306, 132 278 Z" fill="${C.top}"/>
        ${ink([[-60, 392], [10, 398], [80, 388]], 2.6, C.topDark, [0.3, 0.3], 0.7)}
        ${ink([[-98, 392], [-40, 410], [60, 404], [122, 388]], 2.4, C.lineCloth, [0.1, 0.1], 0.9)}
        ${ink([[-192, 236], [-212, 300], [-206, 372], [-160, 394]], 2.4, C.lineCloth, [0.05, 0.1], 0.9)}
        ${cuff([[-128, 350], [-122, 366]])}${cuff([[104, 354], [112, 340]])}
        ${handShape(-112, 364, -10, 'tuck', id)}
        ${handShape(116, 344, 160, 'grip', id)}`;
    }
    if (p.arms === 'desk') {
      const hx = 196 + p.hand.x, hy = 420 + p.hand.y;
      if (layer === 'back') return `<path d="M 118 246 C 150 290, 172 352, 188 402 L 242 392 C 218 340, 192 290, 160 244 Z" fill="${C.topDark}"/>${handShape(226, 394, 6, 'keys', id)}`;
      return `
        <path d="M -186 232 C -212 300, -206 380, -162 420 C -102 454, 40 452, ${n(hx - 40)} ${n(hy + 6)} L ${n(hx - 36)} ${n(hy - 44)} C 40 398, -80 400, -126 384 C -150 366, -156 316, -148 254 Z" ${sleeve}/>
        ${ink([[-182, 330], [-170, 382], [-142, 414]], 3.2, C.topDark, [0.3, 0.3], 0.85)}
        ${ink([[-196, 350], [-186, 392]], 2.4, C.topDark, [0.3, 0.3], 0.7)}
        ${ink([[-110, 406], [-40, 414], [40, 416]], 2.4, C.topHi, [0.3, 0.3], 0.5)}
        ${ink([[-60, 438], [0, 444], [60, 438]], 2.6, C.topDark, [0.3, 0.3], 0.6)}
        ${ink([[-186, 232], [-212, 300], [-206, 380], [-162, 420], [-102, 454], [40, 452], [hx - 40, hy + 6]], 2.4, C.lineCloth, [0.05, 0.05], 0.9)}
        ${cuff([[hx - 42, hy + 2], [hx - 38, hy - 40]])}
        ${handShape(hx, hy - 16, 0, p.hand.click > 0.5 ? 'mouseDown' : 'mouse', id)}`;
    }
    if (p.arms === 'phone') {
      if (layer === 'back') return '';
      return `
        <path d="M -186 232 C -212 300, -208 372, -168 398 C -118 424, -40 424, 30 392 L 22 346 C -40 368, -100 368, -130 354 C -150 334, -156 300, -148 254 Z" ${sleeve}/>
        ${ink([[-182, 320], [-170, 370], [-146, 392]], 3.2, C.topDark, [0.3, 0.3], 0.8)}
        ${ink([[-186, 232], [-212, 300], [-208, 372], [-168, 398], [-118, 424], [-40, 424], [30, 392]], 2.4, C.lineCloth, [0.05, 0.05], 0.9)}
        ${cuff([[26, 394], [20, 348]])}
        ${handShape(40, 370, -24, 'phone', id)}`;
    }
    if (layer === 'back') return '';
    // hanging at his side: the elbow, the forearm a little forward, the hand relaxed
    const outer = [[-180, 196], [-202, 216], [-215, 270], [-217, 350], [-209, 430], [-197, 500], [-188, 526]];
    const inner = [[-146, 526], [-150, 500], [-158, 432], [-160, 352], [-156, 282], [-146, 238]];
    return `
      ${ink(off(inner, 4, 0), 14, '#000', [0.1, 0.1], 0.35, ` filter="url(#${id}soft)"`)}
      <path d="${loop(outer, inner)}" ${sleeve}/>
      ${ink([[-210, 352], [-190, 372], [-166, 366]], 3, C.topDark, [0.3, 0.3], 0.8)}
      ${ink([[-206, 382], [-186, 396], [-164, 392]], 2.4, C.topDark, [0.3, 0.3], 0.6)}
      ${ink([[-170, 230], [-180, 300], [-182, 340]], 2.6, C.topHi, [0.3, 0.3], 0.45)}
      ${ink(outer, 2.4, C.lineCloth, [0.05, 0.05], 0.9)}${ink(inner, 2, C.lineCloth, [0.05, 0.05], 0.85)}
      ${cuff([[-190, 512], [-148, 512]])}
      ${handShape(-170, 546, 0, 'hang', id)}`;
  }

  // Hands: five fingers wherever fingers show, knuckles and nails, shade on the side away from the screen.
  function handShape(x, y, rot, kind, id) {
    const skin = `fill="url(#${id}skin)"`;
    const crease = (pts, op = 0.7) => ink(pts, 1.6, C.skinDeep, [0.3, 0.3], op);
    const nail = (cx, cy, a) => `<ellipse cx="${cx}" cy="${cy}" rx="4.2" ry="2.8" transform="rotate(${a} ${cx} ${cy})" fill="${C.skinHi}" opacity="0.9"/>`;
    let body = '';
    if (kind === 'mouse' || kind === 'mouseDown') {
      const d = kind === 'mouseDown' ? 3 : 0;
      body = `
        <ellipse cx="34" cy="22" rx="35" ry="20" fill="#1C1C1F"/>
        <path d="M 4 16 C 14 8, 44 6, 66 16" fill="none" stroke="#45454C" stroke-width="2"/>
        <path d="M -40 -4 C -20 -18, 30 -21, 58 ${-8 + d} C 67 ${-4 + d}, 67 ${8 + d}, 56 ${12 + d} C 30 18, -10 20, -36 16 C -48 12, -50 2, -40 -4 Z" ${skin}/>
        ${ink([[-38, 12], [-10, 18], [30, 16], [56, 12 + d]], 4, C.skinDeep, [0.3, 0.3], 0.45)}
        ${crease([[20, -12 + d], [34, -12 + d], [48, -8 + d], [58, -4 + d]])}
        ${crease([[16, -3 + d], [32, -3 + d], [46, 1 + d], [58, 4 + d]], 0.55)}
        ${crease([[12, 6], [28, 7], [42, 10], [54, 12]], 0.55)}
        ${nail(57, -6 + d, 10)}${nail(58, 3 + d, 12)}
        ${[[4, -14], [14, -15], [24, -14]].map(([a, b]) => `<ellipse cx="${a}" cy="${b}" rx="4" ry="3" fill="${C.skinHi}" opacity="0.55"/>`).join('')}
        ${ink([[-40, -4], [-20, -18], [30, -21], [58, -8 + d]], 1.7, C.line, [0.1, 0.2], 0.8)}`;
    } else if (kind === 'phone') {
      body = `
        <rect x="-22" y="-96" width="56" height="112" rx="10" fill="#0E0E10" stroke="#3A3A3E" stroke-width="2.4"/>
        <rect x="-17" y="-90" width="46" height="100" rx="7" fill="#1B2533"/>
        <path d="M -30 -10 C -36 -4, -36 14, -26 22 C -8 34, 22 34, 36 22 C 42 14, 40 0, 34 -6 L 34 6 C 20 14, -6 14, -22 4 Z" ${skin}/>
        <path d="M -30 -10 C -40 -20, -40 -40, -32 -50 C -26 -54, -22 -48, -24 -40 C -26 -30, -24 -18, -20 -10 Z" ${skin}/>
        ${nail(-28, -46, 80)}
        ${crease([[-22, 12], [0, 18], [26, 16]])}
        ${ink([[-30, -10], [-36, 4], [-26, 22], [-8, 32], [22, 32], [36, 22]], 1.7, C.line, [0.1, 0.1], 0.8)}`;
    } else if (kind === 'tuck') {
      body = `<path d="M -26 -16 C -8 -24, 22 -22, 34 -10 C 38 0, 34 12, 20 14 C 0 16, -20 10, -28 2 Z" ${skin}/>
        ${crease([[-2, -16], [8, -18], [20, -14], [28, -6]])}${crease([[-6, -6], [6, -8], [18, -4], [26, 2]], 0.5)}
        ${nail(30, -4, 40)}
        ${ink([[-26, -16], [-8, -24], [22, -22], [34, -10], [38, 0], [34, 12], [20, 14]], 1.6, C.line, [0.1, 0.1], 0.8)}`;
    } else if (kind === 'grip') {
      body = `<path d="M -20 -14 C -4 -22, 20 -18, 28 -6 C 30 4, 24 12, 12 14 C -6 16, -18 8, -22 0 Z" ${skin}/>
        ${crease([[-6, -12], [4, -14], [14, -10], [20, -4]])}${crease([[-10, -2], [0, -4], [12, 0], [18, 6]], 0.5)}
        ${nail(22, 4, -30)}
        ${ink([[-20, -14], [-4, -22], [20, -18], [28, -6], [30, 4], [24, 12], [12, 14]], 1.6, C.line, [0.1, 0.1], 0.8)}`;
    } else if (kind === 'hang') {
      body = `<path d="M -20 -30 C -6 -34, 12 -34, 22 -28 C 26 -8, 24 12, 18 26 C 12 38, 0 44, -10 40 C -19 34, -23 18, -24 2 C -25 -12, -24 -22, -20 -30 Z" ${skin}/>
        <path d="M 16 -16 C 26 -10, 32 4, 30 18 C 28 24, 22 24, 20 18 C 20 8, 18 -2, 12 -10 Z" ${skin}/>
        ${crease([[-15, 12], [-13, 28], [-9, 37]], 0.6)}${crease([[-5, 14], [-3, 31], [1, 40]], 0.6)}${crease([[5, 12], [7, 28], [9, 34]], 0.5)}
        ${nail(-8, 36, 80)}${nail(2, 39, 80)}${nail(25, 20, 70)}
        ${ink([[-20, -30], [-24, 2], [-19, 34], [-10, 40], [0, 44], [12, 38], [18, 26]], 1.6, C.line, [0.1, 0.1], 0.8)}`;
    } else if (kind === 'keys') {
      body = `<path d="M -20 -10 C 0 -17, 28 -15, 42 -6 C 48 -2, 48 6, 42 9 C 28 13, 4 13, -16 9 C -26 5, -26 -6, -20 -10 Z" fill="${C.skinShade}"/>
        ${crease([[16, -12], [24, -10], [32, -6], [38, 0]], 0.5)}${crease([[12, -3], [22, -1], [30, 3], [38, 7]], 0.5)}`;
    }
    return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)})">${body}</g>`;
  }

  // ------------------------------------------------------------ from behind
  function back(p, id) {
    const r = rnd(11);
    let strands = '';
    for (let i = 0; i < 18; i++) {
      const x = lerp(-76, 76, i / 17) + (r() - 0.5) * 4;
      strands += ink([[x * 0.9, -26], [x * 0.95 + (r() - 0.5) * 6, 14], [x * 0.85, 46 + r() * 16]], 1.6, C.hairDark, [0.2, 0.6], 0.8);
    }
    return `
      <path d="M -58 36 C -60 84, -62 116, -68 150 L 68 150 C 62 116, 60 84, 58 36 Z" fill="url(#${id}neck)"/>
      ${ink([[-30, 70], [-34, 110], [-38, 146]], 3, C.skinShade, [0.3, 0.3], 0.5)}${ink([[30, 70], [34, 110], [38, 146]], 3, C.skinShade, [0.3, 0.3], 0.5)}
      <path d="M -156 230 C -156 186, -108 152, -50 144 C -22 154, 22 154, 50 144 C 108 152, 156 186, 156 230 L 150 580 L -150 580 Z" fill="url(#${id}topb)"/>
      ${blob([[-110, 230], [-60, 240], [-50, 330], [-100, 350], [-130, 300]], C.topHi, 0.35, ` filter="url(#${id}soft2)"`)}${blob([[110, 230], [60, 240], [50, 330], [100, 350], [130, 300]], C.topHi, 0.3, ` filter="url(#${id}soft2)"`)}
      ${ink([[-120, 250], [-90, 300], [-80, 380]], 4, C.topDark, [0.3, 0.3], 0.6)}${ink([[110, 250], [86, 310], [84, 400]], 4, C.topDark, [0.3, 0.3], 0.6)}
      ${ink([[-20, 400], [0, 460], [10, 540]], 3, C.topDark, [0.3, 0.3], 0.45)}
      <path d="M -46 144 C -20 154, 20 154, 46 144 L 44 156 C 18 166, -18 166, -44 156 Z" fill="${C.topDark}"/>
      ${ink([[-150, 580], [-156, 230], [-156, 186], [-108, 152], [-50, 144]], 2.4, C.lineCloth, [0.05, 0.05], 0.9)}${ink([[50, 144], [108, 152], [156, 186], [156, 230], [150, 580]], 2.4, C.lineCloth, [0.05, 0.05], 0.9)}
      ${blob([[-82, -18], [-94, -22], [-100, -8], [-97, 6], [-94, 18], [-88, 24], [-80, 22]], C.skinMid)}${ink([[-84, -16], [-94, -16], [-96, 0], [-92, 16]], 2, C.skinDeep, [0.2, 0.4], 0.7)}
      ${blob([[82, -18], [94, -22], [100, -8], [97, 6], [94, 18], [88, 24], [80, 22]], C.skinMid)}${ink([[84, -16], [94, -16], [96, 0], [92, 16]], 2, C.skinDeep, [0.2, 0.4], 0.7)}
      ${blob([[-84, -30], [-88, 6], [-80, 36], [-66, 56], [-50, 58], [-36, 66], [-20, 62], [-6, 70], [8, 64], [22, 68], [36, 60], [52, 60], [68, 52], [82, 30], [88, 2], [84, -30]], C.hair)}
      ${ink([[-66, 56], [-50, 58], [-36, 66], [-20, 62], [-6, 70], [8, 64], [22, 68], [36, 60], [52, 60], [68, 52]], 1.6, C.lineHair, [0.1, 0.1], 0.6)}
      ${strands}
      ${ink([[-60, -16], [-62, 10], [-54, 34]], 2.4, C.hairLight, [0.3, 0.5], 0.5)}${ink([[40, -16], [44, 10], [40, 30]], 2.4, C.hairLight, [0.3, 0.5], 0.5)}
      <path d="M -100 -30 C -104 -108, -54 -156, 0 -158 C 54 -156, 104 -108, 100 -30 C 60 -40, -60 -40, -100 -30 Z" fill="url(#${id}capg)"/>
      ${ink([[0, -158], [0, -40]], 2.4, C.capDark, [0.05, 0.05])}${stitchLine([[0, -158], [0, -100], [0, -40]])}
      ${ink([[0, -158], [-40, -140], [-62, -96], [-66, -40]], 2, C.capDark, [0.05, 0.05], 0.8)}${ink([[0, -158], [40, -140], [62, -96], [66, -40]], 2, C.capDark, [0.05, 0.05], 0.8)}
      <ellipse cx="0" cy="-158" rx="9" ry="4.5" fill="${C.capHi}"/>
      ${p.cap === 'back' ? '' : `
        <path d="M -34 -34 C -32 -64, 32 -64, 34 -34 Z" fill="${C.hair}"/>
        <path d="M -40 -34 C -36 -70, 36 -70, 40 -34" fill="none" stroke="${C.capDark}" stroke-width="6"/>
        <rect x="-30" y="-44" width="60" height="9" rx="4" fill="${C.capDark}"/>
        <rect x="-8" y="-45.5" width="16" height="12" rx="2" fill="#6E6A64"/><rect x="-5" y="-43" width="10" height="7" rx="1" fill="#46433E"/>`}
      <path d="M -100 -30 C -60 -40, 60 -40, 100 -30 L 100 -22 C 60 -32, -60 -32, -100 -22 Z" fill="${C.capDark}"/>
      ${ink([[-100, -30], [-93.7, -82.6], [-71.8, -122.5], [-39, -148.1], [0, -158], [39, -148.1], [71.8, -122.5], [93.7, -82.6], [100, -30]], 2.2, '#050506', [0.05, 0.05], 0.9)}`;
  }

  function defs(p, id) {
    return `<defs>
      <linearGradient id="${id}skin" x1="0" y1="0" x2="1" y2="0.3">
        <stop offset="0" stop-color="${C.skinMid}"/><stop offset="0.45" stop-color="${C.skin}"/><stop offset="1" stop-color="${C.skinHi}"/>
      </linearGradient>
      <linearGradient id="${id}neck" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${C.skinDeep}"/><stop offset="0.45" stop-color="${C.skinShade}"/><stop offset="1" stop-color="${C.skinMid}"/>
      </linearGradient>
      <radialGradient id="${id}sclera" cx="0.55" cy="0.6" r="0.6">
        <stop offset="0.5" stop-color="${C.white}"/><stop offset="1" stop-color="${C.whiteShade}"/>
      </radialGradient>
      <radialGradient id="${id}iris" cx="0.45" cy="0.55" r="0.55">
        <stop offset="0" stop-color="${C.irisLight}"/><stop offset="0.55" stop-color="${C.iris}"/><stop offset="1" stop-color="${C.irisDark}"/>
      </radialGradient>
      <radialGradient id="${id}pearl" cx="0.38" cy="0.32" r="0.72">
        <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.4" stop-color="${C.pearl}"/><stop offset="1" stop-color="${C.pearlShade}"/>
      </radialGradient>
      <linearGradient id="${id}goldg" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stop-color="${C.goldHi}"/><stop offset="0.45" stop-color="${C.gold}"/><stop offset="1" stop-color="${C.goldLo}"/>
      </linearGradient>
      <linearGradient id="${id}capg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${C.capHi}"/><stop offset="0.45" stop-color="${C.cap}"/><stop offset="1" stop-color="${C.capDark}"/>
      </linearGradient>
      <linearGradient id="${id}billg" x1="0" y1="0" x2="1" y2="0.2">
        <stop offset="0" stop-color="${C.capDark}"/><stop offset="0.55" stop-color="${C.cap}"/><stop offset="1" stop-color="#2A2A2F"/>
      </linearGradient>
      <linearGradient id="${id}top" x1="0" y1="0" x2="1" y2="0.3">
        <stop offset="0" stop-color="${C.topDark}"/><stop offset="0.6" stop-color="${C.top}"/><stop offset="1" stop-color="${C.topHi}"/>
      </linearGradient>
      <linearGradient id="${id}topb" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${C.topHi}"/><stop offset="0.3" stop-color="${C.top}"/><stop offset="1" stop-color="${C.topDark}"/>
      </linearGradient>
      <linearGradient id="${id}capshadow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2A140C" stop-opacity="0.62"/><stop offset="0.55" stop-color="#2A140C" stop-opacity="0.3"/><stop offset="1" stop-color="#2A140C" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="lensg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#2A2A32"/><stop offset="0.5" stop-color="${C.lens}"/><stop offset="1" stop-color="#050506"/>
      </linearGradient>
      <filter id="${id}soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>
      <filter id="${id}soft2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>
      <clipPath id="${id}faceclip"><path d="${FACE}"/></clipPath>
      <clipPath id="${id}capclip"><path d="${CROWN_PATH}"/></clipPath>
      <clipPath id="${id}topclip"><path d="${TOP}"/></clipPath>
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
