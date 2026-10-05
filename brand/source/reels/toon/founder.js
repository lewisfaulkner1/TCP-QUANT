// The TCP founder as an animated character, drawn as a detailed 2D cartoon: ink lines that taper,
// two tones of shade with soft edges, the screen's light in front of him, and detailed eyes. One
// drawing built from parameters, so his face, cap, chain and clothes are the same in every shot.
// His cap, collar and pearl chain are small 3D models turned to his angle and projected, so they sit
// in true perspective from the front, turned and from behind. Every blur works in sRGB: Chromium's
// default (linear light) leaves hard steps in soft shading on black cloth.
//
// founderSVG(pose, id, part) returns an SVG <g> in the character's own space: the head's centre near
// 0,0, the cap's top at about y -142, the chin at about y 116, the torso down to y 580. A shot places
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
    line: '#3A2118', lineSoft: '#64382A', lineHair: '#1C120C', lineCloth: '#050505',
    skin: '#EEBF9E', skinHi: '#FADDC8', skinMid: '#E0A787', skinShade: '#C8876B', skinDeep: '#A2614B', skinOcc: '#774131', stubble: '#6F5D58',
    lipUp: '#B47362', lipLow: '#C7836F', moustache: '#5C3F2A', lipLine: '#5E3328', mouthIn: '#3E1612', teeth: '#F4EEE6', tongue: '#B9605A',
    hair: '#4A3324', hairDark: '#251810', hairLight: '#7E5C40', hairTip: '#A07C58', brow: '#352218',
    white: '#F2ECE5', whiteShade: '#D3C6BB', iris: '#4A3020', irisLight: '#7A5434', irisDark: '#22140B', pupil: '#110B08', lash: '#24170F',
    cap: '#1E1E21', capHi: '#36363C', capDark: '#0E0E10', stitch: '#4C4C55', eyelet: '#2C2C31',
    gold: '#D8AD4E', goldHi: '#F8E3A6', goldLo: '#9E7428',
    top: '#211F1E', topHi: '#3A3734', topDark: '#100F0E', stitchTop: '#3C3936',
    pearl: '#EFEBE3', pearlShade: '#ADA597', lens: '#0B0B0E',
  };
  const n = (v) => Math.round(v * 100) / 100;
  const lerp = (a, b, k) => a + (b - a) * k;
  const xy = (p) => `${n(p[0])} ${n(p[1])}`;
  const RAD = Math.PI / 180;

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

  // ------------------------------------------------------------ the face
  // His own proportions, taken from photos of him and turned 40° to the right, then stylised: eyes a
  // little bigger, curves simplified. Head space: eye line at y 0, chin at y 116, nose tip at x 90.
  // The near eye's outer corner is on the left; the far eye sits between the bridge of the nose and
  // the far edge of the face. Nothing crosses anything else.

  // Eyes. A and B are the corners, left to right; rise and drop are how far the lids open above and
  // below the line between them; the shape lists say where along it each lid is fullest.
  const EYES = {
    near: { A: [21.5, -1.1], B: [52.9, 1.2], rise: 9.6, drop: 3.7, r: 7, sq: 1,
      up: [[0, 0], [0.22, 0.5], [0.46, 0.9], [0.66, 1], [0.86, 0.8], [1, 0]],
      low: [[1, 0], [0.82, 0.6], [0.6, 0.94], [0.4, 1], [0.2, 0.7], [0, 0]] },
    far: { A: [80.4, 2.1], B: [99.6, 1.2], rise: 7.6, drop: 3.1, r: 5.9, sq: 0.78,
      up: [[0, 0], [0.14, 0.55], [0.38, 0.9], [0.6, 1], [0.84, 0.84], [1, 0]],
      low: [[1, 0], [0.88, 0.62], [0.7, 1], [0.48, 0.8], [0.24, 0.36], [0, 0]] },
  };
  function eye(near, p, id) {
    const E = near ? EYES.near : EYES.far, { A, B } = E;
    const at = (k, dy = 0) => [lerp(A[0], B[0], k), lerp(A[1], B[1], k) + dy];
    const open = Math.max(0, Math.min(1.35, 1 - Math.max(p.lid, p.blink) * 1.05 + p.wide * 0.45));
    const rise = E.rise * open;
    const drop = E.drop * (0.72 + 0.28 * Math.min(1, open)) + p.wide * 1.4;
    const lineW = near ? 2.7 : 2.3;
    const taper = near ? [0.3, 0.38] : [0.38, 0.3];             // thins at both corners: no flick
    const crease = (dy, op) => ink(E.up.slice(1, 5).map(([k, f]) => at(k, -rise * f - dy - p.wide * 2)), 1.6, C.skinShade, [0.45, 0.45], op);
    const sock = blob([at(-0.08, -1), at(0.18, -rise - 8), at(0.62, -rise - 10), at(1.06, -3), at(0.62, -rise * 0.4), at(0.2, -rise * 0.3)], C.skinShade, 0.46, ` filter="url(#${id}soft)"`)
      + blob(near ? [[50, -12], [58, -10], [64, -2], [60, 6], [53, 4]] : [[76, -8], [80.5, -6], [81, 2], [78, 6], [75.5, 1]], C.skinShade, 0.4, ` filter="url(#${id}soft)"`);
    if (open < 0.12) {
      const shut = [A, at(0.3, E.drop * 0.55), at(0.62, E.drop * 0.6), B];
      return `${sock}${ink(shut, lineW, C.lash, taper)}${crease(4, 0.55)}`;
    }
    const up = E.up.map(([k, f]) => at(k, -rise * f));
    const low = E.low.map(([k, f]) => at(k, drop * f));
    const r = E.r, rx = r * E.sq;
    const ix = lerp(A[0], B[0], 0.52) + p.look[0] * (B[0] - A[0]) * 0.17;
    const iy = lerp(A[1], B[1], 0.52) - 1.3 + p.look[1] * 2.6 - p.wide * 0.6;
    const clip = `${id}eye${near ? 'n' : 'f'}`, shape = loop(up, low);
    return `
      ${sock}
      <clipPath id="${clip}"><path d="${shape}"/></clipPath>
      <path d="${shape}" fill="url(#${id}sclera)"/>
      <g clip-path="url(#${clip})">
        <ellipse cx="${n(ix)}" cy="${n(iy)}" rx="${n(rx)}" ry="${n(r)}" fill="url(#${id}iris)" stroke="${C.irisDark}" stroke-width="1"/>
        <ellipse cx="${n(ix + rx * 0.04)}" cy="${n(iy + r * 0.04)}" rx="${n(rx * 0.44)}" ry="${n(r * 0.44)}" fill="${C.pupil}"/>
        ${ink(up, 6.5, C.skinOcc, [0, 0], 0.38)}
        <circle cx="${n(ix + rx * 0.36)}" cy="${n(iy - r * 0.36)}" r="${n(r * 0.24)}" fill="#fff" opacity="0.92"/>
        <circle cx="${n(ix - rx * 0.34)}" cy="${n(iy + r * 0.34)}" r="${n(r * 0.1)}" fill="#fff" opacity="0.6"/>
      </g>
      ${ink(low.slice(1, 5), 1.3, C.skinShade, [0.4, 0.4], 0.55)}
      ${ink(up, lineW, C.lash, taper)}
      ${crease(3.1, 0.42)}`;
  }

  // Brows: thick, low and fairly straight, the head squared off by the nose, the tail thinning
  // towards the temple. Raised, the whole brow lifts and the head arches; lowered, the head drops.
  function brow(near, raise) {
    const up = -Math.max(0, raise) * 7, down = Math.max(0, -raise);
    const head = (pt, k) => [pt[0] - (near ? 1 : -1) * down * 2 * k, pt[1] + up * (0.6 + 0.4 * k) + down * 5 * k - down * 0.6];
    // top edge and bottom edge, tail first (near brow) or head first (far brow), with how "head" each point is
    const N = { top: [[13, -14.2, 0], [23, -20.4, 0.1], [35.5, -23.6, 0.35], [49, -23.4, 0.7], [61, -21.6, 1], [64.4, -18, 1]],
      bot: [[63.6, -13.6, 1], [50, -16.4, 0.7], [37, -17.2, 0.35], [25.5, -15.4, 0.1], [13, -14.2, 0]] };
    const F = { top: [[83.2, -16.6, 1], [85.5, -20.8, 1], [94, -22.6, 0.6], [101.5, -22.2, 0.3], [106.5, -18.4, 0]],
      bot: [[106.5, -18.4, 0], [102, -16.6, 0.3], [94.5, -16.2, 0.6], [85.4, -13, 1]] };
    const B = near ? N : F;
    const top = B.top.map(([x, y, k]) => head([x, y], k)), bot = B.bot.map(([x, y, k]) => head([x, y], k));
    const r = rnd(near ? 5 : 9);
    const shape = `${smooth(top)} L ${xy(bot[0])} ${smooth(bot).replace(/^M [-\d.]+ [-\d.]+/, '')} Z`;
    const cid = `brow${near ? 'n' : 'f'}${Math.round(raise * 100)}`;
    let hairs = '';
    sample(top, 3).forEach(([x, y], i) => {
      if (i % 2) return;
      const lean = near ? -1 : 1;
      hairs += ink([[x + lean * 1.2, y + 5.5 + r()], [x - lean * 1.6, y + 1.4]], 1, C.hairLight, [0.4, 0.4], 0.3);
    });
    return `<clipPath id="${cid}"><path d="${shape}"/></clipPath>
      <path d="${shape}" fill="${C.brow}"/>
      <g clip-path="url(#${cid})">${hairs}${ink(off(bot, 0, -0.6), 2, C.lineHair, [0.2, 0.2], 0.5)}</g>`;
  }

  // ------------------------------------------------------------ nose, mouth, ear
  // A straight nose with a rounded tip: the bridge's far side is one line from between the brows
  // down to the tip, the near side is shade, then the tip, the nostril and the curve of its wing.
  function nose(p, id) {
    return `
      ${blob([[73.5, -2], [77.5, 8], [81.5, 18], [84.5, 26], [79, 31], [70, 33.5], [64, 35], [66.5, 26], [70.5, 15], [72, 5]], C.skinShade, 0.42, ` filter="url(#${id}soft)"`)}
      ${blob([[62, 45.5], [72, 47.5], [82, 47.5], [86, 50.5], [76, 53.5], [64, 51.5]], C.skinDeep, 0.38, ` filter="url(#${id}soft)"`)}
      ${blob([[59, 37], [64.5, 33.5], [70, 34.5], [68.5, 40], [63, 44.5], [58.5, 43]], C.skinShade, 0.5, ` filter="url(#${id}soft)"`)}
      ${ink([[78.5, 3], [82.5, 12.5], [86, 22.5]], 2.6, C.skinHi, [0.35, 0.35], 0.75)}
      ${ink([[74.8, -3], [77.4, 4.5], [81.2, 12.5], [85.2, 19.5], [88.6, 26], [90, 32], [88.6, 37.6], [85, 41.6]], 2.1, C.lineSoft, [0.5, 0.25], 0.95)}
      ${ink([[85.6, 41.2], [82.6, 43.6], [79.6, 44.8]], 1.6, C.lineSoft, [0.3, 0.5], 0.7)}
      ${blob([[69.5, 43.6], [74.5, 42.6], [79.4, 44.4], [76.5, 46.4], [71, 46.3]], C.skinOcc, 0.9)}
      ${ink([[65.5, 35.4], [61, 38.2], [60, 42.2], [62.8, 45.2], [68, 45.8]], 1.8, C.lineSoft, [0.4, 0.3], 0.75)}
      <ellipse cx="86.2" cy="30.4" rx="2.9" ry="2.2" fill="#fff" opacity="0.5"/>`;
  }

  // Full lips, the lower one fuller: the line of the mouth, the upper lip a shade darker than his skin,
  // the lower lip catching the light with its shadow under it. A faint moustache above.
  function mouth(p, id) {
    const { open, smile, smirk } = p.mouth;
    const nearUp = smile * 3.4 - Math.max(0, -smile) * 0.6, farUp = smile * 2.6 + smirk * 6;
    const gap = open > 0.04 ? 2 + open * 15 : 0;
    const L = [47.5, 71.8 - nearUp], R = [86.4, 72.4 - farUp];
    const line = [L, [54, 70.4 - nearUp * 0.4], [62, 69.2 + smile * 0.5], [70, 68.6 + smile * 0.8], [77, 68.8 + smile * 0.6 - smirk * 0.6], [82.5, 69.8 - farUp * 0.45], R];
    const low = line.map(([x, y], i) => [x, y + gap * [0, 0.55, 0.9, 1, 0.95, 0.6, 0][i]]);
    const upLip = [L, [52, 68 - nearUp * 0.5], [58, 64.8], [65, 61.6], [72.5, 59.4], [78.6, 61.2], [84.4, 59.8], [87.8, 63.6], [88.4, 68], R];
    const lowLip = [R, [86.6, 76.4 + gap * 0.7], [83, 81 + gap], [75, 83.4 + gap], [66, 82.2 + gap], [57.5, 78.4 + gap * 0.9], [51, 74.6 + gap * 0.5], L];
    let inside = '';
    if (gap) {
      const hole = loop(line, [...low].reverse());
      inside = `<clipPath id="${id}mouth"><path d="${hole}"/></clipPath>
        <path d="${hole}" fill="${C.mouthIn}"/>
        <g clip-path="url(#${id}mouth)">
          ${ink(off(line, 0, 2.6), 7, C.teeth, [0.15, 0.15])}
          ${[57, 64, 71, 78].map((x) => `<path d="M ${x} ${n(lerp(69.5, 69, (x - 57) / 21) + 1.4)} l 0.4 4.2" stroke="#C9C0B6" stroke-width="0.8"/>`).join('')}
          ${open > 0.3 ? `<ellipse cx="69" cy="${n(69 + gap + 1.5)}" rx="12" ry="${n(4 + open * 3)}" fill="${C.tongue}"/>` : ''}
        </g>`;
    }
    return `
      ${blob([[50.5, 63.2], [57, 58.6], [65, 55.4], [73, 53.6], [80.5, 53.8], [86.6, 56.6], [88.4, 60.4], [84, 60.2], [77, 59.8], [70, 59.2], [62, 60.4], [55, 62.6]], C.moustache, 0.34, ` filter="url(#${id}softer)"`)}
      <path d="${loop(upLip.slice(0, -1), [R, ...[...line].reverse().slice(1)])}" fill="${C.lipUp}" opacity="0.5"/>
      <path d="${loop(lowLip, low.slice(1))}" fill="${C.lipLow}" opacity="0.16"/>
      ${ink([[64, 75.4 + gap], [70.5, 76.4 + gap], [76.5, 75.8 + gap]], 2.4, C.skinHi, [0.45, 0.45], 0.5)}
      ${ink([[56, 85 + gap * 0.9], [67.5, 88.4 + gap], [80, 86.6 + gap]], 6, C.skinShade, [0.45, 0.45], 0.62, ` filter="url(#${id}soft)"`)}
      ${ink([[61, 85.4 + gap * 0.9], [69.5, 87.4 + gap], [77.5, 86 + gap]], 1.5, C.skinDeep, [0.45, 0.45], 0.6)}
      ${inside}
      ${ink(upLip.slice(2, 8), 1.1, C.lipLine, [0.35, 0.35], 0.22)}
      ${ink(line, 2.5, C.lipLine, [0.22, 0.22])}
      ${gap ? ink(low, 1.5, C.lipLine, [0.3, 0.3], 0.7) : ''}
      ${ink([[L[0] + 2.4, L[1] - 0.6], L, [L[0] - 1.6, L[1] + 1.6]], 1.7, C.lipLine, [0.3, 0.6], 0.6)}
      ${smirk > 0.15 ? ink([[R[0], R[1]], [R[0] + 3, R[1] - 2.4], [R[0] + 4, R[1] - 6.5]], 1.6, C.skinShade, [0.2, 0.6], smirk) : ''}
      ${smile > 0.35 ? ink([[46, 56], [42.5, 64], [43.5, 72]], 1.6, C.skinShade, [0.4, 0.4], (smile - 0.35) * 1.5) : ''}`;
  }

  function ear(id) {
    return `<g transform="translate(-34 12) scale(0.88) translate(34 -12)">${earShape(id)}</g>`;
  }
  function earShape(id) {
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
  // Short and tidy, like his: cut close at the sides and back, under the cap. A sideburn in front of
  // the ear with a little skin between them, the hairline round the top of the ear and down behind
  // it to the nape, where it fades into the skin. Short strokes that grow down and back give it
  // texture; it's darkest under the cap and lighter where it thins.
  const HAIR = [[-6, -64], [-12, -50], [-18, -38], [-22, -26], [-24.5, -12], [-26.5, 0], [-28, 9.5], [-30, 12.5], [-31, 2], [-31.5, -10],
    [-34.5, -19], [-41, -24.5], [-49, -26.5], [-57, -24], [-63, -16], [-66.5, -4], [-67.5, 9], [-65.5, 21], [-63, 31], [-63.5, 41], [-64, 47.5],
    [-67.5, 40], [-73, 30], [-78, 18], [-81.5, 4], [-83.5, -10], [-84, -26], [-84, -44], [-62, -60], [-30, -66]];
  const HAIR_BACK = [[-64, 47.5], [-67.5, 40], [-73, 30], [-78, 18], [-81.5, 4], [-83.5, -10], [-84, -26]];
  function inside(pt, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  const HAIR_STROKES = (() => {
    const r = rnd(7), out = [];
    for (let tries = 0; out.length < 110 && tries < 4000; tries++) {
      const x = lerp(-86, -8, r()), y = lerp(-60, 48, r());
      if (!inside([x, y], HAIR)) continue;
      const side = x > -32 && y > -30;                            // the sideburn grows straight down
      const ang = (side ? 96 : 104 + (y + 40) * 0.25) * RAD + (r() - 0.5) * 0.35;
      const len = (side ? 5 : 6.5) + r() * 4;
      out.push({ pts: [[x, y], [x + Math.cos(ang) * len * 0.5 - 0.6, y + Math.sin(ang) * len * 0.5], [x + Math.cos(ang) * len, y + Math.sin(ang) * len]], w: 1 + r() * 0.8, light: r() < 0.38 });
    }
    return out;
  })();
  function sideHair(id) {
    const shape = smooth(HAIR, true);
    return `
      <clipPath id="${id}hairclip"><path d="${shape}"/></clipPath>
      <path d="${shape}" fill="url(#${id}hairg)" opacity="0.55" filter="url(#${id}softer)" clip-path="url(#${id}faceclip)"/>
      <path d="${shape}" fill="url(#${id}hairg)"/>
      <g clip-path="url(#${id}hairclip)">
        ${HAIR_STROKES.map((s) => ink(s.pts, s.w, s.light ? C.hairLight : C.hairDark, [0.4, 0.5], s.light ? 0.4 : 0.6)).join('')}
        ${ink([[-40, -26], [-52, -29], [-62, -24]], 7, C.hairDark, [0.3, 0.3], 0.35, ` filter="url(#${id}soft)"`)}
        ${ink([[-30, 12], [-28, -4], [-25, -22]], 4, '#8C6A54', [0.2, 0.6], 0.5, ` filter="url(#${id}softer)"`)}
        ${ink([[-64, 47], [-63, 34], [-65, 22]], 5, '#8C6A54', [0.2, 0.6], 0.45, ` filter="url(#${id}softer)"`)}
      </g>
      ${ink(HAIR_BACK, 1.8, C.lineHair, [0.25, 0.05], 0.75)}`;
  }
  // The hair on top, when the cap is off: the same short cut, a little longer on top and pushed
  // forward into a soft fringe over his forehead, lighter where the light catches the top.
  const TOP_HAIR = [[-84, -24], [-88, -62], [-76, -104], [-44, -134], [6, -143], [50, -136], [82, -114], [97, -84], [97, -60],
    [91, -58], [83, -61.5], [73, -59], [63, -63.5], [52, -60.5], [40, -63], [29, -59], [17, -61.5], [6, -57], [-6, -54.5], [-15, -48], [-14, -60], [-40, -62]];
  const TOP_STROKES = (() => {
    const r = rnd(17), out = [];
    for (let tries = 0; out.length < 90 && tries < 4000; tries++) {
      const x = lerp(-84, 96, r()), y = lerp(-140, -58, r());
      if (!inside([x, y], TOP_HAIR)) continue;
      const ang = (18 + (x + 80) * 0.22) * RAD + (r() - 0.5) * 0.3, len = 9 + r() * 6;
      out.push({ pts: [[x, y], [x + Math.cos(ang) * len * 0.5, y + Math.sin(ang) * len * 0.5 - 1], [x + Math.cos(ang) * len, y + Math.sin(ang) * len]], w: 1.1 + r() * 0.8, light: r() < 0.4 });
    }
    return out;
  })();
  function fringe(id) {
    const shape = smooth(TOP_HAIR, true);
    return `
      <clipPath id="${id}tophair"><path d="${shape}"/></clipPath>
      <path d="${shape}" fill="url(#${id}hairg)"/>
      <g clip-path="url(#${id}tophair)">
        ${blob([[-90, -40], [-80, -100], [-40, -80], [-30, -40]], C.hairDark, 0.55, ` filter="url(#${id}soft2)"`)}
        ${TOP_STROKES.map((s) => ink(s.pts, s.w, s.light ? C.hairLight : C.hairDark, [0.4, 0.5], s.light ? 0.45 : 0.6)).join('')}
        ${ink([[-30, -124], [10, -136], [50, -126]], 7, C.hairLight, [0.4, 0.4], 0.35, ` filter="url(#${id}soft)"`)}
      </g>
      ${ink(TOP_HAIR.slice(0, 9), 1.8, C.lineHair, [0.05, 0.2], 0.75)}
      ${ink(TOP_HAIR.slice(8, 20), 1.2, C.lineHair, [0.1, 0.2], 0.45)}`;
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
  // ------------------------------------------------------------ the cap, modelled in 3D
  // His cap is a small 3D model turned to the same angle as his face, so the crown, its seams, the
  // eyelets, the button, the brim and the crown logo all sit in true perspective, and one model gives
  // the cap worn forward, worn backwards and seen from behind. Head frame: x to his left, y up, z the
  // way he faces, in head units, with the middle of the cap's band at the origin.
  //   the band: an oval A wide and B deep (half sizes), its front TILT higher than its middle;
  //   the crown: rises from the band to the button, H above the middle and ZT in front of it, full
  //     at the sides (E1) and round over the top (E2);
  //   the brim: grows out of the front, PB radians either side of it, BRIM long in the middle and
  //     tapering into the crown at its ends, angled down (DROP) and curved down at its sides (CURVE,
  //     in proportion to how far it reaches there, so its ends lie flat into the crown);
  //   the opening at the back: W0 radians either side, T0 of the way up, with the strap across it.
  // It's painted like the rest of him: a few flat tones with soft edges, worked out from how each
  // part of the cap faces the screen's light, not shaded patch by patch.
  const CAP = {
    A: 82, B: 101, TILT: 20,
    H: 95, ZT: 4, E1: 0.92, E2: 0.98,
    PB: 1.34, BRIM: 64, TAPER: 0.7, FWD: 1.1, DROP: 0.15, CURVE: 24, THICK: 3,
    W0: 0.42, T0: 0.3,
  };
  const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit3 = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const hexRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  function mixC(a, b, k) {
    const A = hexRGB(a), B = hexRGB(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * Math.max(0, Math.min(1, k))).toString(16).padStart(2, '0')).join('');
  }
  // a point on the crown: phi round the band from his forehead (to his left is +), t from the band
  // (0) to the button (1)
  function crownPt(phi, t) {
    const a = t * Math.PI / 2, r = Math.pow(Math.cos(a), CAP.E1), h = Math.pow(Math.sin(a), CAP.E2);
    const y0 = CAP.TILT * Math.cos(phi);
    return [CAP.A * Math.sin(phi) * r, y0 + (CAP.H - y0) * h, CAP.B * Math.cos(phi) * r + CAP.ZT * (1 - r)];
  }
  function crownN(phi, t) {
    const t0 = Math.min(t, 0.994), e = 1e-3, p = crownPt(phi, t0);
    return unit3(cross3(sub3(crownPt(phi + e, t0), p), sub3(crownPt(phi, t0 + e), p)));
  }
  // a point on the top of the brim: u from one end (-1) to the other (1), s from the crown (0) to its
  // edge (1); spin turns the cap round his head (0 forward, pi backwards)
  function brimPt(u, s, spin) {
    const phi = u * CAP.PB + spin, root = crownPt(phi, 0);
    const nx = Math.sin(phi) / CAP.A, nz = Math.cos(phi) / CAP.B, l = Math.hypot(nx, nz);
    const fx = Math.sin(spin), fz = Math.cos(spin);
    let dx = nx / l + CAP.FWD * fx, dz = nz / l + CAP.FWD * fz;
    const dl = Math.hypot(dx, dz);
    dx /= dl; dz /= dl;
    const d = CAP.BRIM * Math.pow(Math.max(0, 1 - u * u), CAP.TAPER) * s;
    const x = root[0] + dx * d, z = root[2] + dz * d, side = (x * fz - z * fx) / 90;
    return [x, root[1] - CAP.DROP * d - CAP.CURVE * side * side * (d / CAP.BRIM), z];
  }
  function brimN(u, s, spin) {
    const e = 1e-3, u0 = Math.max(-0.995, Math.min(0.994, u)), s0 = Math.max(0.01, Math.min(s, 0.995)), p = brimPt(u0, s0, spin);
    return unit3(cross3(sub3(brimPt(u0, s0 + e, spin), p), sub3(brimPt(u0 + e, s0, spin), p)));
  }
  // a point on the underside of the brim
  function brimLow(u, s, spin) {
    const q = brimPt(u, s, spin), n = brimN(u, s, spin);
    return [q[0] - n[0] * CAP.THICK, q[1] - n[1] * CAP.THICK, q[2] - n[2] * CAP.THICK];
  }
  // The camera: turned yaw degrees about the vertical, tipped pitch degrees (above is +), and the
  // middle of the band placed at X, Y in head space. at() returns head-space x, y and a depth.
  function cam3(yaw, pitch, X, Y) {
    const cy = Math.cos(yaw * RAD), sy = Math.sin(yaw * RAD), cp = Math.cos(pitch * RAD), sp = Math.sin(pitch * RAD);
    const rot = (q) => { const x1 = q[0] * cy + q[2] * sy, z1 = -q[0] * sy + q[2] * cy; return [x1, q[1] * cp - z1 * sp, q[1] * sp + z1 * cp]; };
    return { rot, yaw, at: (q) => { const v = rot(q); return [X + v[0], Y - v[1], v[2]]; } };
  }
  const CAP_VIEWS = { '34': [40, 0, 7, -44], back: [180, 0, 0, -44] };
  const angDiff = (a, b) => { let d = (a - b) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; };
  // The outline of the set of (u, v) where test > 0, scanning rows of v for the run of u where it
  // holds (one run a row: the regions here are single blobs), each end found by halving. The first
  // and last rows are followed along their length, so a curved edge stays curved.
  function region(test, at, u0, u1, NU, v0, v1, NV) {
    const rows = [];
    const U = (i) => u0 + ((u1 - u0) * i) / NU;
    const edge = (a, b, v) => { for (let k = 0; k < 7; k++) { const m = (a + b) / 2; if (test(m, v) > 0) a = m; else b = m; } return a; };
    for (let j = 0; j <= NV; j++) {
      const v = v0 + ((v1 - v0) * j) / NV;
      let lo = -1, hi = -1;
      for (let i = 0; i <= NU; i++) if (test(U(i), v) > 0) { if (lo < 0) lo = i; hi = i; }
      if (lo < 0) continue;
      rows.push({ v, a: lo > 0 ? edge(U(lo), U(lo - 1), v) : U(lo), b: hi < NU ? edge(U(hi), U(hi + 1), v) : U(hi) });
    }
    if (rows.length < 2) return null;
    const along = (r, rev) => {
      const k = Math.max(2, Math.ceil((Math.abs(r.b - r.a) / Math.abs(u1 - u0)) * NU)), out = [];
      for (let i = 0; i <= k; i++) { const t = rev ? 1 - i / k : i / k; out.push(at(r.a + (r.b - r.a) * t, r.v)); }
      return out;
    };
    const first = rows[0], last = rows[rows.length - 1], mid = rows.slice(1, -1);
    return [...along(first, false), ...mid.map((r) => at(r.b, r.v)), ...along(last, true), ...mid.reverse().map((r) => at(r.a, r.v))];
  }
  // The model, turned, projected and painted once for each way it's worn, seen and lit.
  const capCache = {};
  function capModel(spin, view, key) {
    const id = `${spin}|${view}|${key}`;
    if (capCache[id]) return capCache[id];
    const cam = cam3(...CAP_VIEWS[view]);
    const facing = (n) => cam.rot(n)[2];
    const back = spin + Math.PI;
    const opening = (phi, t) => t < CAP.T0 && Math.abs(angDiff(phi, back)) < CAP.W0 * Math.sqrt(1 - (t / CAP.T0) ** 2);
    const Lt = unit3([0.62 * key, 0.42, 0.66]), Hv = unit3([Lt[0], Lt[1], Lt[2] + 1]);
    const lit = (nv) => dot3(nv, Lt), spec = (nv) => Math.pow(Math.max(0, dot3(nv, Hv)), 18);
    const c0 = -cam.yaw * RAD;
    const crownAt = (phi, t) => cam.at(crownPt(phi, t));
    const onCrown = (fn) => region((phi, t) => {
      const nv = cam.rot(crownN(phi, t));
      return Math.min(fn(nv), nv[2] * 8, opening(phi, t) ? -1 : 1);
    }, crownAt, c0 - Math.PI, c0 + Math.PI, 180, 0, 0.992, 40);
    // the outline: the band where it faces us, then over the top
    const band = [];
    for (let i = 0; i <= 180; i++) {
      const phi = c0 - Math.PI + (i / 180) * 2 * Math.PI;
      if (facing(crownN(phi, 0.02)) > 0) band.push({ phi, p: crownAt(phi, 0) });
    }
    const all = [];
    for (let i = 0; i < 120; i++) for (let j = 0; j <= 16; j++) all.push(crownAt((i / 120) * 2 * Math.PI, j / 16));
    const top = topChain(all);
    const L = band[0].p, R = band[band.length - 1].p;
    const outline = [...band.map((b) => b.p), ...top.filter((q) => q[0] > L[0] + 0.5 && q[0] < R[0] - 0.5).reverse()];
    // the crown's tones: in the light, catching it, the sheen, and the screen's colour at the edge
    const tones = [
      onCrown((nv) => lit(nv) + 0.05),
      onCrown((nv) => lit(nv) - 0.42),
      onCrown((nv) => spec(nv) - 0.5),
    ];
    const rim = onCrown((nv) => nv[0] * key - 0.62);
    // seams from the band to the button, between the six panels
    const seams = [];
    for (let k = 0; k < 6; k++) {
      const phi = spin + (k * Math.PI) / 3;
      const ts = [];
      for (let j = 0; j <= 48; j++) {
        const t = (j / 48) * 0.965;
        if (facing(crownN(phi, t)) > 0.03 && !opening(phi, t + 0.01)) ts.push(t);
      }
      if (ts.length > 2) {
        const at = (dl, list) => list.map((t) => {
          const r = Math.pow(Math.cos(t * Math.PI / 2), CAP.E1);
          return crownAt(phi + dl / (Math.hypot(CAP.A * Math.cos(phi), CAP.B * Math.sin(phi)) * Math.max(r, 0.08)), t);
        });
        const st = ts.filter((t) => t < 0.9);
        const fade = Math.max(0, Math.min(1, (facing(crownN(phi, 0.3)) - 0.05) / 0.3));
        seams.push({ mid: at(0, ts), lit: at(1.4 * key, ts), a: at(2.6, st), b: at(-2.6, st), fade });
      }
    }
    // small flat things laid on the crown (eyelets, studs, the logo): a centre and two directions
    const frame = (phi, t) => {
      const o = crownPt(phi, t), e = 0.004;
      const du = unit3(sub3(crownPt(phi + e, t), o)), dv = unit3(sub3(crownPt(phi, t - e), o));
      const O = cam.at(o), U = cam.at([o[0] + du[0], o[1] + du[1], o[2] + du[2]]), V = cam.at([o[0] + dv[0], o[1] + dv[1], o[2] + dv[2]]);
      return { o: O, u: [U[0] - O[0], U[1] - O[1]], v: [V[0] - O[0], V[1] - O[1]], k: facing(crownN(phi, t)) };
    };
    const eyelets = [];
    for (let k = 0; k < 6; k++) {
      const f = frame(spin + ((k + 0.5) * Math.PI) / 3, 0.7);
      if (f.k > 0.15) eyelets.push(f);
    }
    const logo = frame(spin, 0.3);
    const bo = crownPt(0, 1), BO = cam.at(bo), BU = cam.at([bo[0] + 1, bo[1], bo[2]]);
    const button = { o: BO, w: Math.hypot(BU[0] - BO[0], BU[1] - BO[1]) };
    // the opening at the back and the strap across it
    let hole = null, strap = null;
    if (facing(crownN(back, 0.1)) > 0.05) {
      hole = [];
      for (let i = 0; i <= 40; i++) {
        const a = Math.PI - (i / 40) * Math.PI;
        hole.push(crownAt(back + CAP.W0 * Math.cos(a), CAP.T0 * Math.sin(a)));
      }
      const sw = CAP.W0 + 0.06, edge = [], low = [];
      for (let i = 0; i <= 24; i++) {
        const phi = back - sw + (i / 24) * 2 * sw;
        edge.push(crownAt(phi, 0.085));
        low.push(crownAt(phi, 0));
      }
      const studs = [];
      for (let i = 0; i < 7; i++) studs.push(frame(back - CAP.W0 * 0.78 + (i / 6) * CAP.W0 * 1.56, 0.043));
      strap = { edge, low, studs };
    }
    // the brim: the part whose root the crown hides is drawn before the head, the rest after it
    const rootSeen = (u) => facing(crownN(u * CAP.PB + spin, 0.02)) > 0;
    let uc = null;
    for (let i = 0; i < 200; i++) { const u = -1 + (2 * i) / 200; if (rootSeen(u) !== rootSeen(u + 0.01)) uc = u + 0.005; }
    const parts = [];
    const ranges = uc === null ? [[-1, 1]] : [[-1, uc], [uc, 1]];
    for (const [ua, ub] of ranges) {
      const front = rootSeen((ua + ub) / 2);
      const topAt = (u, s) => cam.at(brimPt(u, s, spin)), lowAt = (u, s) => cam.at(brimLow(u, s, spin));
      const topN = (u, s) => cam.rot(brimN(u, s, spin));
      const NU = Math.max(8, Math.round(90 * (ub - ua) / 2));
      const topFill = region((u, s) => topN(u, s)[2] * 8, topAt, ua, ub, NU, 0, 1, 14);
      const topLit = region((u, s) => { const nv = topN(u, s); return Math.min(lit(nv) - 0.42, nv[2] * 8); }, topAt, ua, ub, NU, 0, 1, 14);
      const under = region((u, s) => -topN(u, s)[2] * 8, lowAt, ua, ub, NU, 0, 1, 14);
      const edgeTop = [], edgeLow = [];
      for (let i = 0; i <= NU; i++) { const u = ua + ((ub - ua) * i) / NU; edgeTop.push(topAt(u, 1)); edgeLow.push(lowAt(u, 1)); }
      // rows of stitching a set distance in from the edge, fainter where we see them edge-on
      const rows = [];
      for (let k = 0; k < 7; k++) {
        const dist = 4.5 + k * 5.8;
        let run = [], f = 0;
        const flush = () => { if (run.length > 2) rows.push({ pts: run, op: Math.max(0, Math.min(1, (f / run.length - 0.08) / 0.3)) }); run = []; f = 0; };
        for (let i = 0; i <= NU * 2; i++) {
          const u = ua + ((ub - ua) * i) / (NU * 2), len = CAP.BRIM * Math.pow(Math.max(0, 1 - u * u), CAP.TAPER);
          const s = 1 - dist / Math.max(len, 1e-6), nz = len > dist + 3 ? topN(u, s)[2] : -1;
          if (nz > 0.03) { run.push(topAt(u, s)); f += nz; } else flush();
        }
        flush();
      }
      parts.push({ front, topFill, topLit, under, edgeTop, edgeLow, rows });
    }
    const model = { band: band.map((b) => b.p), outline, tones, rim, seams, eyelets, logo, button, hole, strap, parts };
    capCache[id] = model;
    return model;
  }
  // The top of the outline of a set of points (screen y is down), left to right.
  function topChain(points) {
    const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], hi = [];
    for (const q of p) {
      while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
      lo.push(q);
      while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], q) >= 0) hi.pop();
      hi.push(q);
    }
    const mean = (c) => c.reduce((s, q) => s + q[1], 0) / c.length;
    return mean(lo) < mean(hi) ? lo : hi;
  }
  const poly = (q) => `M ${q.map(xy).join(' L ')} Z`;

  // The cap as SVG: 'under' goes before the head (the brim where the crown hides its root), 'over'
  // after it, and 'band' is the edge of the crown where it meets his head.
  function capSVG(p, id, spin, view) {
    const key = p.light.key < 0 ? -1 : 1;
    const M = capModel(spin, view, key);
    const T = [mixC(C.capDark, C.cap, 0.3), mixC(C.cap, C.capDark, 0.1), mixC(C.cap, C.capHi, 0.5), mixC(C.capHi, '#6A6A74', 0.35)];
    const fill = (q, c, extra = '') => (q ? `<path d="${poly(q)}" fill="${c}"${extra}/>` : '');
    const dash = (pts, op) => `<path d="${smooth(pts)}" fill="none" stroke="${C.stitch}" stroke-width="0.95" stroke-dasharray="2.8 2.2" stroke-linecap="round" opacity="${n(op)}"/>`;
    // the brim: first every face of it in the line colour, a little larger, so the whole brim has
    // one clean outline; then its underside, its edge, its top and the light on it, and the stitching
    const brim = (front) => M.parts.filter((b) => b.front === front).map((b) => {
      const rimQ = [...b.edgeTop, ...b.edgeLow.slice().reverse()];
      const line = (q) => (q ? `<path d="${poly(q)}" fill="#050506" stroke="#050506" stroke-width="3.2" stroke-linejoin="round"/>` : '');
      return `
        ${line(b.under)}${line(rimQ)}${line(b.topFill)}
        ${fill(b.under, mixC(C.capDark, '#000000', 0.3))}
        <path d="${poly(rimQ)}" fill="${mixC(C.capDark, C.cap, 0.5)}"/>
        ${fill(b.topFill, T[1])}
        ${b.topLit ? `<g filter="url(#${id}softer)">${fill(b.topLit, T[2], ' opacity="0.8"')}</g>` : ''}
        ${b.rows.map((r) => dash(r.pts, 0.72 * r.op)).join('')}`;
    }).join('');
    const clip = `${id}capc`;
    const holePath = M.hole ? ` ${poly(M.hole)}` : '';
    const seams = M.seams.map((s) => `${ink(s.lit, 1.6, C.capHi, [0.1, 0.3], 0.3 * s.fade)}${ink(s.mid, 1.9, '#060607', [0.05, 0.2], 0.85)}
      ${s.a.length > 1 ? dash(s.a, 0.78 * s.fade) : ''}${s.b.length > 1 ? dash(s.b, 0.78 * s.fade) : ''}`).join('');
    const flat = (f, body) => `<g transform="matrix(${n(f.u[0])} ${n(f.u[1])} ${n(f.v[0])} ${n(f.v[1])} ${n(f.o[0])} ${n(f.o[1])})">${body}</g>`;
    const eyelets = M.eyelets.map((f) => flat(f, `<circle r="4" fill="${C.eyelet}" stroke="#060607" stroke-width="0.8"/><circle r="1.8" fill="#050506"/>`)).join('');
    const L = M.logo;
    const logo = L.k > 0.08 ? `<g transform="matrix(${n(L.u[0] * 0.185)} ${n(L.u[1] * 0.185)} ${n(L.v[0] * 0.185)} ${n(L.v[1] * 0.185)} ${n(L.o[0])} ${n(L.o[1])})">${embroidery(id)}</g>` : '';
    const { o: [bx, by], w: bw0 } = M.button, bw = 7.5 * bw0;
    const button = `<path d="M ${n(bx - bw)} ${n(by + 0.8)} C ${n(bx - bw)} ${n(by - 3.6)}, ${n(bx + bw)} ${n(by - 3.6)}, ${n(bx + bw)} ${n(by + 0.8)} Z" fill="${C.cap}" stroke="#050506" stroke-width="1.4"/>
      ${ink([[bx - bw * 0.5 * key, by - 1.6], [bx + bw * 0.1 * key, by - 2.4]], 1.6, C.capHi, [0.3, 0.3], 0.7)}`;
    const strap = M.strap ? `
      <path d="${poly([...M.strap.low, ...M.strap.edge.slice().reverse()])}" fill="${C.capDark}"/>
      ${ink(M.strap.edge, 1.4, C.capHi, [0.1, 0.1], 0.5)}
      ${M.strap.studs.map((f) => flat(f, `<circle r="2.3" fill="#2E2E34"/><circle cx="-0.6" cy="-0.6" r="0.9" fill="#55555E"/>`)).join('')}` : '';
    const holeInk = M.hole ? `${ink(M.hole, 4, C.capDark, [0.05, 0.05], 0.95)}${ink(M.hole, 1.6, '#050506', [0.05, 0.05])}` : '';
    return {
      under: brim(false),
      over: `
        <clipPath id="${clip}"><path d="${poly(M.outline)}${holePath}" clip-rule="evenodd"/></clipPath>
        <path d="${poly(M.outline)}${holePath}" fill="${T[0]}" fill-rule="evenodd"/>
        <g clip-path="url(#${clip})">
          <g filter="url(#${id}softer)">${fill(M.tones[0], T[1])}${fill(M.tones[1], T[2])}</g>
          <g filter="url(#${id}soft)">${fill(M.tones[2], T[3], ' opacity="0.7"')}${fill(M.rim, p.light.tint, ` opacity="${n(0.4 * p.light.rim)}"`)}</g>
          ${seams}${eyelets}
        </g>
        ${holeInk}${strap}
        ${logo}
        ${button}
        ${brim(true)}
        <path d="${smooth(M.outline, true)}" fill="none" stroke="#050506" stroke-width="2.2" stroke-linejoin="round"/>`,
      band: M.band,
    };
  }

  // With the cap on backwards his hair fills the opening above the strap, brushed back; the rest is
  // tucked under the band.
  function capFringe(p, id) {
    const M = capModel(Math.PI, '34', p.light.key < 0 ? -1 : 1);
    if (!M.hole) return '';
    const xs = M.hole.map((q) => q[0]), ys = M.hole.map((q) => q[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const r = rnd(21);
    let strands = '';
    for (let i = 0; i < 30; i++) {
      const x = lerp(x0 - 2, x1 + 2, r()), y = lerp(y0 - 2, y1 + 4, r());
      strands += ink([[x, y], [x - 2 - r() * 2, y - 4 - r() * 3], [x - 3 - r() * 3, y - 8 - r() * 3]], 1.1 + r() * 0.7, r() < 0.4 ? C.hairLight : C.hairDark, [0.4, 0.5], 0.5);
    }
    return `
      <path d="${poly(M.hole)}" fill="${C.hair}" stroke="${C.hair}" stroke-width="6" stroke-linejoin="round"/>
      <clipPath id="${id}holeclip"><path d="${poly(M.hole)}"/></clipPath>
      <g clip-path="url(#${id}holeclip)">${strands}${ink(M.hole.slice(2, -2), 7, C.hairDark, [0.2, 0.2], 0.6, ` filter="url(#${id}soft)"`)}</g>`;
  }

  // Sunglasses: thin black frames, dark lenses with the screen's light caught in them.
  function shades(p) {
    const lensL = [[12, -15], [32, -20], [54, -17], [58, -9], [53, 6], [37, 11], [18, 9], [10, -2]];
    const lensR = [[75, -16], [88, -19.5], [101, -16], [103, -6], [99.5, 5], [88, 8.5], [77.5, 5], [74, -6]];
    const glint = (x, y, s) => `<path d="M ${x} ${y} l ${n(14 * s)} ${n(-4 * s)} l ${n(3 * s)} ${n(12 * s)} l ${n(-14 * s)} ${n(4 * s)} Z" fill="${p.light.tint}" opacity="0.35"/>`;
    return `
      ${blob(lensL, 'url(#lensg)')}${blob(lensR, 'url(#lensg)')}
      ${glint(30, -9, 1)}${glint(85, -10, 0.7)}
      ${ink([[18, -10], [34, -15], [50, -12]], 2.6, '#fff', [0.4, 0.4], 0.3)}
      ${ink([...lensL, lensL[0]], 2.4, C.lens, [0, 0])}${ink([...lensR, lensR[0]], 2, C.lens, [0, 0])}
      ${ink([[57, -13], [65, -16], [75, -12]], 3, C.lens, [0.1, 0.1])}
      ${ink([[11, -10], [-12, -9], [-34, -7]], 3.6, C.lens, [0.05, 0.3])}`;
  }

  // ------------------------------------------------------------ the head, three-quarter view
  // The far edge of the face from under the cap to the chin (brow ridge, temple, cheekbone, then in
  // to the chin), and the jaw from the chin back to under the ear.
  const FAR_EDGE = [[92, -62], [95.5, -48], [99.5, -38], [103.5, -28], [106.2, -18], [106.4, -9], [105.6, 0], [104.4, 8], [104, 17], [104, 27], [103.4, 37], [102.4, 47], [100.6, 57], [98.2, 67], [95.8, 77], [93, 86.5], [89.8, 95], [86, 103], [81, 110], [73.6, 114.8], [64, 116.4]];
  const JAW = [[64, 116.4], [52, 114.8], [40, 110.6], [28.6, 104.8], [17.6, 98], [6.2, 89.4], [-5.2, 79.4], [-15, 67.6], [-22, 56.4], [-26.5, 47]];
  const FACE = `${smooth([...FAR_EDGE, ...JAW.slice(1), [-40, 51], [-54, 50], [-66, 41], [-75, 26], [-80, 8]])} L -81 -30 C -80 -92, -40 -126, 8 -126 C 54 -126, 86 -100, 92 -62 Z`;
  function head34(p, id) {
    const tint = p.light.tint, rim = p.light.rim;
    const cap = p.cap === 'fwd' || p.cap === 'back' ? capSVG(p, id, p.cap === 'back' ? Math.PI : 0, '34') : null;
    return `
      ${cap ? cap.under : ''}
      <path d="${FACE}" fill="url(#${id}skin)"/>
      <g clip-path="url(#${id}faceclip)">
        ${blob([[-112, -72], [-24, -62], [-8, -24], [-4, 14], [2, 48], [14, 76], [34, 98], [56, 114], [72, 128], [-40, 136], [-124, 60]], C.skinShade, 0.5, ` filter="url(#${id}soft2)"`)}
        ${ink([[-14, 40], [4, 50], [22, 58], [40, 64]], 11, C.skinShade, [0.35, 0.35], 0.32, ` filter="url(#${id}soft2)"`)}
        ${blob([[46, 96], [62, 94], [80, 96], [90, 104], [82, 114], [64, 117], [48, 112]], C.stubble, 0.13, ` filter="url(#${id}soft2)"`)}
        ${ink([[-24, 58], [-6, 82], [20, 100], [48, 114], [72, 118]], 13, C.skinDeep, [0.2, 0.2], 0.32, ` filter="url(#${id}soft)"`)}
        <ellipse cx="30" cy="23" rx="18" ry="8" fill="${C.skinHi}" opacity="0.42" filter="url(#${id}soft)"/>
        <ellipse cx="62" cy="-36" rx="24" ry="7" fill="${C.skinHi}" opacity="0.32" filter="url(#${id}soft)"/>
        <ellipse cx="76" cy="104" rx="8" ry="5" fill="${C.skinHi}" opacity="0.5" filter="url(#${id}soft)"/>
        ${ink(JAW.slice(0, 8).map(([x, y]) => [x + 2, y - 5]), 12, C.stubble, [0.2, 0.2], 0.07, ` filter="url(#${id}soft2)"`)}
        ${ink([[57, 47], [52.5, 55], [49.5, 63]], 3, C.skinShade, [0.3, 0.5], 0.45, ` filter="url(#${id}softer)"`)}
        ${ink(off(FAR_EDGE.slice(1, 20), -4, 0), 8, tint, [0.2, 0.2], 0.42 * rim, ` filter="url(#${id}soft)"`)}
      </g>
      ${cap ? `<path d="M ${cap.band.map(xy).join(' L ')} L ${cap.band.slice().reverse().map(([x, y]) => xy([x, y + (p.cap === 'back' ? 9 : 26)])).join(' L ')} Z" fill="url(#${id}capshadow)" clip-path="url(#${id}faceclip)" filter="url(#${id}soft)"/>` : ''}
      ${sideHair(id)}
      ${ear(id)}
      ${eye(true, p, id)}${eye(false, p, id)}
      ${brow(true, p.brow[0])}${brow(false, p.brow[1])}
      ${nose(p, id)}
      ${mouth(p, id)}
      ${ink([...FAR_EDGE.slice(1), ...JAW.slice(1)], 2.5, C.line, [0.06, 0.1])}
      ${p.cap === 'back' ? capFringe(p, id) : ''}
      ${cap ? cap.over : fringe(id)}
      ${p.shades > 0.01 ? `<g opacity="${n(Math.min(1, p.shades * 1.5))}" transform="translate(0 ${n((1 - p.shades) * -46)})">${shades(p)}</g>` : ''}`;
  }
  // ------------------------------------------------------------ the body
  // His neck, an oversized black crewneck and the pearl chain, turned 40° like his face. The collar
  // and the chain are 3D shapes projected like the cap, so the collar rings his neck and the chain
  // wraps round it and drapes down his chest in true perspective (its far side foreshortened). The
  // crewneck has dropped shoulders that round into wide sleeves, a boxy body, and one outline round
  // body and sleeves. Body space is the body group's own: the head's, 20 lower. Body frame for the
  // 3D parts: x to his left, y up, z the way he faces, the origin in the middle of his neck where
  // it meets the collar.
  const BODY_VIEWS = { '34': [40, 0, -4, 165], back: [180, 0, 0, 145] };
  // the collar: a ribbed band round the base of his neck, its front lower than its back; outer is
  // the edge lying on his shoulders, inner the edge against his neck
  const collarPt = (th, outer) => (outer
    ? [74 * Math.sin(th), -4 - 22 * Math.cos(th), 72 * Math.cos(th) - 4]
    : [57 * Math.sin(th), 8 - 22 * Math.cos(th), 58 * Math.cos(th) - 4]);
  // the chain: around the back of his neck on the collar, then off it at his collarbones and down
  // his chest to a low point over his sternum
  const CHAIN = { R: [66, 65], LIFT: 0, OFF: 0.98, LOW: -118, ZLOW: 115, BEAD: 3.1 };
  function chainPath() {
    const pts = [];
    // round the back it lies on the collar band, halfway between its edges
    const ring = (th) => [CHAIN.R[0] * Math.sin(th), 2 - 22 * Math.cos(th) + CHAIN.LIFT, CHAIN.R[1] * Math.cos(th) - 4];
    // the back: from where it leaves the collar on his far side, round the back, to his near side
    for (let i = 0; i <= 60; i++) pts.push(ring(CHAIN.OFF + (i / 60) * (2 * Math.PI - 2 * CHAIN.OFF)));
    // the front: a U hanging from those two points, lying on his chest
    const A = ring(-CHAIN.OFF);
    for (let i = 1; i < 60; i++) {
      const u = -1 + (2 * i) / 60, k = 1 - Math.pow(Math.abs(u), 1.7);
      const x = A[0] * -u * (1 + 0.22 * (1 - u * u));
      pts.push([x, A[1] + (CHAIN.LOW - A[1]) * k, A[2] + (CHAIN.ZLOW - A[2]) * Math.pow(k, 0.7)]);
    }
    return pts;
  }
  const bodyCache = {};
  function bodyModel(view) {
    if (bodyCache[view]) return bodyCache[view];
    const cam = cam3(...BODY_VIEWS[view]);
    const c0 = -cam.yaw * RAD;
    const seen = (th) => cam.rot([Math.sin(th) / 74, 0, Math.cos(th) / 72])[2] > 0;
    // the collar's two halves: the front one passes in front of his neck, the back one behind it
    const front = [], back = [];
    for (let i = 0; i <= 120; i++) {
      const th = c0 - Math.PI + (i / 120) * 2 * Math.PI;
      (seen(th) ? front : back).push({ th, o: cam.at(collarPt(th, true)), n: cam.at(collarPt(th, false)) });
    }
    // the back half runs from the front half's end round to its start
    const k = back.findIndex((b, i) => i > 0 && b.th - back[i - 1].th > 0.1);
    const backRun = k > 0 ? [...back.slice(k), ...back.slice(0, k)] : back;
    // the chain's beads, evenly spaced along it, each with its depth
    const path = chainPath();
    const beads = [];
    let carry = 0;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i], L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      let t = carry;
      while (t < L) {
        const q = [a[0] + (b[0] - a[0]) * t / L, a[1] + (b[1] - a[1]) * t / L, a[2] + (b[2] - a[2]) * t / L];
        const s = cam.at(q), zr = cam.rot([q[0], 0, q[2] + 4])[2];
        beads.push({ p: s, z: s[2], behind: zr < 0, low: q[1] < -22 });
        t += CHAIN.BEAD * 2.15;
      }
      carry = t - L;
    }
    const model = { front, back: backRun, beads };
    bodyCache[view] = model;
    return model;
  }

  // The neck, from under his jaw into the collar.
  function neckSVG(p, id, M) {
    const ring = M.front.map((f) => f.n);
    const L = ring[0], R = ring[ring.length - 1];
    const d = `M -60 58 C -61 88, -61 118, ${xy(L)} L ${ring.slice(1).map(xy).join(' L ')} C ${n(R[0] - 1)} ${n(R[1] - 22)}, 49 132, 52 112 L 52 86 C 20 74, -30 58, -60 58 Z`;
    return `
      <clipPath id="${id}neckc"><path d="${d}"/></clipPath>
      <path d="${d}" fill="url(#${id}neck)"/>
      <g clip-path="url(#${id}neckc)">
        ${ink([[-30, 72], [4, 104], [30, 126], [56, 140]], 26, C.skinDeep, [0.2, 0.2], 0.5, ` filter="url(#${id}soft2)"`)}
        ${ink([[-48, 84], [-30, 118], [-6, 150], [16, 172]], 9, C.skinShade, [0.3, 0.3], 0.4, ` filter="url(#${id}soft)"`)}
        ${ink([[-62, 70], [-62, 110], [-64, 146]], 12, C.skinShade, [0.2, 0.2], 0.45, ` filter="url(#${id}soft)"`)}
        ${ink([[40, 136], [42, 152], [40, 170]], 7, C.skinHi, [0.3, 0.3], 0.35, ` filter="url(#${id}soft)"`)}
        ${ink(off(ring, 0, -4), 8, C.skinDeep, [0.1, 0.1], 0.45, ` filter="url(#${id}soft)"`)}
      </g>
      ${ink([[44, 138], [47.5, 143], [46, 149]], 1.6, C.skinShade, [0.3, 0.3], 0.55)}
      ${ink([[-60, 60], [-61, 100], [-62, 130], [L[0], L[1]]], 2.1, C.line, [0.1, 0.05], 0.85)}
      ${ink([[52, 116], [49, 136], [48.5, 152], [R[0], R[1]]], 1.9, C.line, [0.2, 0.05], 0.8)}`;
  }
  // The ribbed collar: its back half (the inside of the band, behind his neck) and its front half.
  function collarSVG(M, part) {
    const run = part === 'back' ? M.back : M.front;
    if (run.length < 2) return '';
    const outer = run.map((f) => f.o), inner = run.map((f) => f.n);
    const band = `M ${[...outer, ...inner.slice().reverse()].map(xy).join(' L ')} Z`;
    let ribs = '';
    run.forEach((f, i) => { if (i % 2 === 0) ribs += `<path d="M ${xy(f.n)} L ${xy(f.o)}" stroke="${part === 'back' ? C.topDark : C.topHi}" stroke-width="0.9" opacity="${part === 'back' ? 0.6 : 0.42}"/>`; });
    return `<path d="${band}" fill="${part === 'back' ? mixC(C.topDark, '#000000', 0.25) : C.top}" stroke="${C.lineCloth}" stroke-width="1.2" stroke-linejoin="round"/>
      ${ribs}
      ${part === 'back' ? '' : `${ink(inner, 1.4, C.topHi, [0.1, 0.1], 0.45)}${ink(outer, 2, C.lineCloth, [0.03, 0.03], 0.95)}`}`;
  }
  // The pearl chain: the beads behind his neck go before the neck, the rest after the collar, nearest
  // last, each a small pearl with its light, a fine dark edge, and its shadow on the shirt.
  function chainSVG(M, id, part) {
    const list = M.beads.filter((b) => (part === 'back' ? b.behind : !b.behind)).sort((a, b) => a.z - b.z);
    if (!list.length) return '';
    const r = CHAIN.BEAD;
    const shadow = part === 'back' ? '' : `<g opacity="0.45" filter="url(#${id}softer)">${list.filter((b) => b.low).map((b) => `<circle cx="${n(b.p[0] + 1.4)}" cy="${n(b.p[1] + 2.6)}" r="${n(r * 1.05)}" fill="#000"/>`).join('')}</g>`;
    return `${shadow}${list.map((b) => `<circle cx="${n(b.p[0])}" cy="${n(b.p[1])}" r="${r}" fill="url(#${id}pearl)" stroke="#7E776B" stroke-width="0.55"/>
      <circle cx="${n(b.p[0] + 0.9)}" cy="${n(b.p[1] - 1.1)}" r="0.9" fill="#fff" opacity="0.95"/>`).join('')}`;
  }

  // The crewneck's outline: from the collar over his near shoulder, down his near side, along the
  // bottom, up his far side and over his far shoulder to behind his neck.
  const SHOULDER_NEAR = [[-79.4, 153.4], [-97, 160], [-119, 171], [-139, 187], [-154, 207], [-163, 230]];
  const SIDE_NEAR = [[-163, 230], [-170, 262], [-173, 320], [-174, 420], [-173, 520], [-172, 600]];
  const SIDE_FAR = [[162, 600], [164, 520], [166, 420], [165, 335], [161, 285], [152, 248], [137, 222]];
  const SHOULDER_FAR = [[137, 222], [118, 202], [94, 186], [72, 177], [50, 171]];
  const TORSO = `${smooth([...SHOULDER_NEAR, ...SIDE_NEAR.slice(1)])} L 162 600 ${smooth([...SIDE_FAR, ...SHOULDER_FAR.slice(1)]).replace(/^M/, 'L')} L 31 161.5 L 0.8 153.4 L -30 148 L -52.9 147 L -70 149 Z`;
  function torso34(p, id) {
    const tint = p.light.tint, rim = p.light.rim;
    const M = bodyModel('34');
    return `
      <path d="${TORSO}" fill="${C.top}"/>
      <g clip-path="url(#${id}topclip)">
        ${blob([[-180, 228], [-146, 236], [-122, 320], [-118, 620], [-190, 620]], C.topDark, 0.7, ` filter="url(#${id}soft2)"`)}
        ${blob([[30, 196], [118, 204], [158, 272], [154, 620], [70, 620], [40, 390]], C.topHi, 0.38, ` filter="url(#${id}soft2)"`)}
        ${ink(off(M.front.map((f) => f.o), 0, 7), 10, C.topDark, [0.15, 0.15], 0.6, ` filter="url(#${id}soft)"`)}
        ${ink(off(SHOULDER_NEAR.slice(1), 4, 9), 9, C.topHi, [0.3, 0.3], 0.22, ` filter="url(#${id}soft)"`)}
        ${ink(off(SHOULDER_FAR.slice(0, 4), -4, 9), 9, C.topHi, [0.3, 0.3], 0.3, ` filter="url(#${id}soft)"`)}
        ${ink([[-112, 318], [-84, 352], [-52, 384], [-30, 418]], 3.2, C.topDark, [0.4, 0.4], 0.55)}
        ${ink([[-106, 312], [-78, 344], [-50, 374]], 1.8, C.topHi, [0.4, 0.4], 0.35)}
        ${ink([[124, 300], [118, 360], [116, 430], [120, 520]], 3, C.topDark, [0.4, 0.4], 0.5)}
        ${ink([[132, 306], [127, 362], [125, 428]], 1.6, C.topHi, [0.4, 0.4], 0.32)}
        ${ink([[-28, 470], [-22, 540], [-20, 610]], 2.6, C.topDark, [0.4, 0.2], 0.4)}
        ${ink(off(SIDE_FAR.slice(1).reverse(), -3, 0), 7, tint, [0.15, 0.3], 0.38 * rim, ` filter="url(#${id}softer)"`)}
      </g>
      <path d="${smooth([[137, 222], [146, 252], [151, 286]])}" fill="none" stroke="${C.stitchTop}" stroke-width="1" stroke-dasharray="3 2.5"/>
      ${ink([...SHOULDER_NEAR, ...SIDE_NEAR.slice(1)], 2.4, C.lineCloth, [0.03, 0.03], 0.92)}
      ${ink([...SIDE_FAR, ...SHOULDER_FAR.slice(1)], 2.2, C.lineCloth, [0.03, 0.12], 0.88)}
      ${collarSVG(M, 'back')}
      ${chainSVG(M, id, 'back')}
      ${neckSVG(p, id, M)}
      ${collarSVG(M, 'front')}
      ${chainSVG(M, id, 'front')}`;
  }

  // A sleeve from its two edges, shoulder (or wherever it comes into view) to cuff: one outline,
  // the side away from the light in shade, folds where it bends, the fabric gathered above a ribbed
  // cuff. out and inn run from the top to the cuff; the cuff is the last stretch of each.
  function sleeve(id, s, light = 1) {
    const out = s.out, inn = s.inn, cuffK = s.cuff ?? 16;
    const shape = `${smooth(out)} L ${xy(inn[inn.length - 1])} ${smooth(inn.slice().reverse()).replace(/^M [-\d.]+ [-\d.]+/, '')}${s.seam ? ` ${smooth(s.seam).replace(/^M [-\d.]+ [-\d.]+/, '')}` : ''} Z`;
    // the cuff: the ends of both edges, cuffK back from the end
    const back = (pts, d) => {
      let left = d;
      for (let i = pts.length - 1; i > 0; i--) {
        const a = pts[i], b = pts[i - 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (L >= left) return [a[0] + (b[0] - a[0]) * left / L, a[1] + (b[1] - a[1]) * left / L];
        left -= L;
      }
      return pts[0];
    };
    const o1 = out[out.length - 1], i1 = inn[inn.length - 1], o0 = back(out, cuffK), i0 = back(inn, cuffK);
    const o2 = back(out, cuffK + 10), i2 = back(inn, cuffK + 10), o3 = back(out, cuffK + 22), i3 = back(inn, cuffK + 22);
    let ribs = '';
    for (let k = 1; k < 9; k++) {
      const t = k / 9;
      ribs += `<path d="M ${xy([lerp(o0[0], i0[0], t), lerp(o0[1], i0[1], t)])} L ${xy([lerp(o1[0], i1[0], t), lerp(o1[1], i1[1], t)])}" stroke="${C.topHi}" stroke-width="0.9" opacity="0.4"/>`;
    }
    const mid = (a, b, t, bow) => {
      const m = [lerp(a[0], b[0], t), lerp(a[1], b[1], t)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      return [m[0] + (-dy / L) * bow, m[1] + (dx / L) * bow];
    };
    const lit = light > 0 ? s.litEdge || 'inn' : s.litEdge === 'inn' ? 'out' : 'inn';
    const litPts = lit === 'inn' ? inn : out, darkPts = lit === 'inn' ? out : inn;
    const fx = id.replace(/[^\w]/g, '');
    return {
      body: `
      <defs><filter color-interpolation-filters="sRGB" id="${fx}x" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
        <filter color-interpolation-filters="sRGB" id="${fx}y" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
        <clipPath id="${id}"><path d="${shape}"/></clipPath></defs>
      <path d="${shape}" fill="${C.top}"/>
      <g clip-path="url(#${id})">
        ${ink(darkPts, 16, C.topDark, [0.1, 0.1], 0.75, ` filter="url(#${fx}x)"`)}
        ${ink(litPts, 9, C.topHi, [0.15, 0.15], 0.4, ` filter="url(#${fx}y)"`)}
        ${(s.folds || []).map((f) => `${ink(f, 2.8, C.topDark, [0.4, 0.4], 0.6)}${ink(off(f, -1.5, -1.8), 1.4, C.topHi, [0.4, 0.4], 0.32)}`).join('')}
        ${ink([o3, mid(o3, i3, 0.5, 2.5), i3], 2.2, C.topDark, [0.3, 0.3], 0.55)}${ink([o2, mid(o2, i2, 0.5, 2), i2], 2.2, C.topDark, [0.3, 0.3], 0.5)}
      </g>
      ${s.seam ? `<path d="${smooth(s.seam)}" fill="none" stroke="${C.stitchTop}" stroke-width="1" stroke-dasharray="3 2.5"/>` : ''}
      ${ink(out, 2.4, C.lineCloth, [s.outTaper ?? 0.03, 0.03], 0.92)}
      ${ink(inn, 2.1, C.lineCloth, [s.innTaper ?? 0.2, 0.03], 0.88)}`,
      cuff: `
      <path d="M ${xy(o0)} L ${xy(o1)} L ${xy(i1)} L ${xy(i0)} Z" fill="${mixC(C.top, C.topDark, 0.35)}"/>
      ${ribs}
      ${ink([o0, mid(o0, i0, 0.5, 1.5), i0], 1.4, C.lineCloth, [0.1, 0.1], 0.7)}
      ${ink([o0, o1], 2.4, C.lineCloth, [0.05, 0.05], 0.92)}${ink([i0, i1], 2.1, C.lineCloth, [0.05, 0.05], 0.88)}
      ${ink([o1, mid(o1, i1, 0.5, 2), i1], 2.1, C.lineCloth, [0.05, 0.05], 0.92)}`,
    };
  }

  // The arms for each pose. The hands keep the places the sets rely on (the mouse, the keyboard, the
  // phone); the sleeves come down from his dropped shoulders to them. The far arm is drawn only where
  // it shows past his body.
  const ARMS = {
    rest: {
      near: { out: [[-163, 230], [-175, 262], [-183, 310], [-187, 370], [-188, 430], [-188, 480], [-191, 520]],
        inn: [[-128, 300], [-136, 340], [-141, 400], [-143, 450], [-143, 490], [-144, 520]],
        seam: [[-128, 300], [-140, 262], [-163, 230]], innTaper: 0.35,
        folds: [[[-180, 352], [-168, 368], [-152, 372]], [[-182, 384], [-166, 396], [-150, 398]]] },
      hands: [{ x: -168, y: 520, rot: 90, kind: 'hang', o: { scale: 1.3 } }],
    },
    desk: {
      near: { out: [[-163, 230], [-176, 262], [-185, 315], [-188, 370], [-182, 412], [-160, 440], [-110, 456], [-30, 460], [60, 450], [120, 436], [157, 425]],
        inn: [[-128, 300], [-136, 335], [-140, 368], [-130, 392], [-90, 404], [-20, 408], [60, 400], [120, 388], [159, 379]],
        seam: [[-128, 300], [-140, 262], [-163, 230]], innTaper: 0.3,
        folds: [[[-152, 376], [-140, 392], [-124, 398]], [[-170, 400], [-154, 414], [-136, 418]], [[-60, 412], [-40, 432], [-30, 452]]] },
      far: { out: [[150, 244], [196, 274], [242, 310], [284, 348], [308, 368]], inn: [[160, 312], [204, 336], [246, 366], [294, 398]],
        cuff: 12, clipFar: true, outTaper: 0.2, innTaper: 0.2 },
      hands: [{ x: 302, y: 382, rot: 12, kind: 'keys', o: { scale: 1.15 }, far: true }, { mouse: true }],
    },
    fold: {
      near: { out: [[-163, 230], [-178, 265], [-186, 320], [-182, 368], [-160, 395], [-100, 410], [0, 410], [70, 392], [107, 367]],
        inn: [[-128, 300], [-138, 330], [-140, 352], [-110, 362], [-40, 366], [40, 354], [98, 336]],
        seam: [[-128, 300], [-140, 262], [-163, 230]], innTaper: 0.3,
        folds: [[[-150, 356], [-140, 372], [-124, 378]], [[-30, 368], [-20, 386], [-14, 404]]] },
      far: { out: [[150, 248], [162, 290], [166, 340], [158, 384], [130, 402], [60, 412], [-20, 410], [-80, 398], [-97, 396]],
        inn: [[140, 300], [138, 336], [120, 360], [60, 372], [-20, 376], [-76, 372], [-93, 368]], outTaper: 0.2, innTaper: 0.25,
        folds: [[[128, 362], [134, 380], [128, 396]], [[20, 378], [28, 394], [24, 410]]] },
      order: ['near', 'far'],
      hands: [{ x: -96, y: 382, rot: 33, kind: 'grip', o: { flip: true, scale: 1.12 } }, { x: 104, y: 350, rot: -38, kind: 'grip', o: { scale: 1.1 } }],
    },
    phone: {
      near: { out: [[-163, 230], [-178, 265], [-186, 320], [-182, 372], [-160, 400], [-110, 418], [-40, 416], [28, 395]],
        inn: [[-128, 300], [-138, 330], [-140, 352], [-110, 362], [-50, 366], [20, 348]],
        seam: [[-128, 300], [-140, 262], [-163, 230]], innTaper: 0.3,
        folds: [[[-150, 356], [-140, 372], [-124, 378]]] },
      hands: [{ x: 26, y: 370, rot: -46, kind: 'phoneBack', o: { scale: 1.15 } }],
      phone: true,
    },
  };
  // the part of the picture to the right of his body's far side, for the far arm
  const FAR_CLIP = `M ${[...SIDE_FAR.slice().reverse(), ...SHOULDER_FAR.slice(1)].map(xy).join(' L ')} L 50 100 L 420 100 L 420 640 L 162 640 Z`;
  function arms34(p, id, layer) {
    if (layer === 'back') return '';
    const A = ARMS[p.arms] || ARMS.rest;
    const key = p.light.key < 0 ? -1 : 1;
    const hand = (h) => handShape(h.x, h.y, h.rot, h.kind, id, h.o);
    // the mouse hand can move: the end of the sleeve follows it
    const hx = p.hand.x || 0, hy = p.hand.y || 0;
    const follow = (pts) => pts.map(([x, y], i) => { const k = Math.max(0, 1 - (pts.length - 1 - i) * 0.35); return [x + hx * k, y + hy * k]; });
    const spec = (part) => (A[part] && A.hands.some((h) => h.mouse) && part === 'near'
      ? { ...A[part], out: follow(A[part].out), inn: follow(A[part].inn) }
      : A[part]);
    const S = {};
    for (const part of ['far', 'near']) if (A[part]) S[part] = sleeve(`${id}sl${part}`, spec(part), key);
    const handsOf = (part) => A.hands.filter((h) => !h.mouse && (part === 'far' ? !!h.far : !h.far)).map(hand).join('');
    let out = '';
    if (A.phone) {
      out += `<g transform="translate(90 298) rotate(-12)"><rect x="-25" y="-52" width="50" height="100" rx="9" fill="#18181B" stroke="#3A3A3E" stroke-width="2.2"/>
          <rect x="-17" y="-44" width="16" height="22" rx="5" fill="#0C0C0E"/><circle cx="-9" cy="-38" r="3.6" fill="#2A2A31"/><circle cx="-9" cy="-28" r="3.6" fill="#2A2A31"/>
          <path d="M 23 -44 L 23 40" stroke="${p.light.tint}" stroke-width="2" opacity="0.35"/></g>`;
    }
    if (A.hands.some((h) => h.mouse)) {
      const mx = 196 + hx, my = 420 + hy;
      out += `<ellipse cx="${n(mx + 30)}" cy="${n(my - 8)}" rx="38" ry="21" fill="#1C1C1F"/><path d="M ${n(mx + 2)} ${n(my - 14)} C ${n(mx + 16)} ${n(my - 24)}, ${n(mx + 46)} ${n(my - 24)}, ${n(mx + 66)} ${n(my - 12)}" fill="none" stroke="#45454C" stroke-width="2"/>
        ${handShape(mx - 37, my - 19, -3, p.hand.click > 0.5 ? 'mouseDown' : 'mouse', id, { scale: 1.15 })}`;
    }
    if (p.arms === 'fold') return out + S.near.body + S.far.body + A.hands.map(hand).join('') + S.near.cuff + S.far.cuff;
    for (const part of ['far', 'near']) {
      if (!S[part]) continue;
      const body = A[part].clipFar ? `<clipPath id="${id}farc"><path d="${FAR_CLIP}"/></clipPath><g clip-path="url(#${id}farc)">${S[part].body}</g>` : S[part].body;
      out += handsOf(part) + body + S[part].cuff;
    }
    return out;
  }

  // ------------------------------------------------------------ hands
  // A hand from its skeleton: a palm and five fingers, each finger a chain of bones with an angle at
  // every joint. Every part is first stroked wide in the line colour, so the whole hand has one
  // clean outline; then the fingers are filled back to front with a fine line where one lies over
  // the next, the palm over their roots, the thumb over the palm, and last the nails, the creases at
  // the knuckles and the shade on the side away from the light. Five fingers, always.
  // Hand space: the wrist at 0,0, the fingers towards +x, the thumb on the -y side; head units.
  const HAND = {
    palm: [[0, -15.5], [16, -20.5], [36, -22.5], [50.5, -21], [55, -9], [55.5, 3], [52.5, 14], [45.5, 20.5], [30, 21.5], [12, 19], [0, 15]],
    base: { index: [50, -14.5], middle: [53.5, -4.6], ring: [52.5, 5], little: [47.5, 13.6], thumb: [9, -12.5] },
    lens: { index: [19.5, 12, 9.5], middle: [21.5, 13, 10], ring: [19.5, 12, 9.5], little: [15, 9.5, 8.5], thumb: [20, 14, 11.5] },
    w: { index: 11.6, middle: 12.2, ring: 11.4, little: 9.8, thumb: 13.4 },
  };
  const rad = (a) => a * Math.PI / 180;
  // pose: { index: [a1, a2, a3] (degrees, absolute), ..., thumb: [a1, a2, a3], len: { index: k } (foreshortening),
  //         hide: ['little'] (left out), front: ['thumb'] (drawn over the palm), nails: true, light: 1 | -1 }
  function handSVG(pose, opt = {}) {
    const lw = opt.lw ?? 2.3, sep = opt.sep ?? 1.25, cid = `hp${(opt.id || 'h')}${Math.round(Math.random() * 1e6)}`;
    const skin = opt.skin || C.skin, line = opt.line || C.line;
    const names = ['little', 'ring', 'middle', 'index', 'thumb'].filter((f) => pose[f] && !(pose.hide || []).includes(f));
    const chain = {};
    for (const f of names) {
      const k = (pose.len && pose.len[f]) || 1;
      const ks = Array.isArray(k) ? k : [k, k, k];
      let [x, y] = (pose.basePos && pose.basePos[f]) || HAND.base[f];
      const pts = [[x, y]];
      pose[f].forEach((a, i) => { x += Math.cos(rad(a)) * HAND.lens[f][i] * ks[i]; y += Math.sin(rad(a)) * HAND.lens[f][i] * ks[i]; pts.push([x, y]); });
      chain[f] = pts;
    }
    const w = (f, i) => HAND.w[f] * [1, 0.93, 0.86][i];
    const seg = (f, i, extra, col, op = 1) => `<path d="M ${xy(chain[f][i])} L ${xy(chain[f][i + 1])}" stroke="${col}" stroke-width="${n(w(f, i) + extra)}" stroke-linecap="round"${op < 1 ? ` opacity="${op}"` : ''}/>`;
    const finger = (f, extra, col, op) => chain[f].slice(0, -1).map((_, i) => seg(f, i, extra, col, op)).join('');
    const palm = pose.palm === false ? '' : `<path d="${smooth(pose.palmPts || HAND.palm, true)}"`;
    const front = names.filter((f) => (pose.front || []).includes(f));
    const backs = names.filter((f) => !front.includes(f));
    // the shade: a band along each finger's shadow side, and the palm's far edge
    const sh = pose.light === -1 ? -1 : 1;
    const shadeOf = (f) => chain[f].slice(0, -1).map((p, i) => {
      if (f === 'thumb' && i === 0) return '';
      const q = chain[f][i + 1], dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1;
      const o = w(f, i) * 0.26 * sh, ox = -dy / L * o, oy = dx / L * o;
      return `<path d="M ${xy([p[0] + ox, p[1] + oy])} L ${xy([q[0] + ox, q[1] + oy])}" stroke="${C.skinShade}" stroke-width="${n(w(f, i) * 0.4)}" stroke-linecap="round" opacity="0.36"/>`;
    }).join('');
    const nail = (f) => {
      if (!pose.nails || f === 'thumb' && !pose.thumbNail) return '';
      const P = chain[f], a = P[P.length - 2], b = P[P.length - 1];
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI, L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const ww = w(f, 2);
      return `<g transform="translate(${xy(b)}) rotate(${n(ang)})"><rect x="${n(-L * 0.55)}" y="${n(-ww * 0.3)}" width="${n(L * 0.55 + ww * 0.12)}" height="${n(ww * 0.6)}" rx="${n(ww * 0.28)}" fill="${C.skinHi}" stroke="${C.skinShade}" stroke-width="${n(lw * 0.39)}"/></g>`;
    };
    const creases = (f) => {
      if (f === 'thumb' || !pose.creases) return '';
      const P = chain[f];
      return [1, 2].map((j) => {
        const a = P[j - 1], b = P[j + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
        const nx = -dy / L, ny = dx / L, hw = w(f, j) * 0.3;
        return `<path d="M ${xy([P[j][0] + nx * hw, P[j][1] + ny * hw])} Q ${xy([P[j][0] + dx / L * 1.6, P[j][1] + dy / L * 1.6])} ${xy([P[j][0] - nx * hw, P[j][1] - ny * hw])}" fill="none" stroke="${C.skinDeep}" stroke-width="${n(lw * 0.48)}" stroke-linecap="round" opacity="${j === 1 ? 0.35 : 0.55}"/>`;
      }).join('');
    };
    const knuckles = pose.knuckles === false || pose.palm === false ? '' : ['index', 'middle', 'ring', 'little'].filter((f) => chain[f]).map((f) => `<ellipse cx="${n(chain[f][0][0] - 2)}" cy="${n(chain[f][0][1])}" rx="3.4" ry="2.8" fill="${C.skinHi}" opacity="0.18"/>`).join('');
    return `
      <g stroke-linejoin="round">
        ${palm ? (opt.openWrist ? `<path d="${smooth(pose.palmPts || HAND.palm)}" fill="none" stroke="${line}" stroke-width="${n(lw * 2)}"/>` : `${palm} fill="${line}" stroke="${line}" stroke-width="${n(lw * 2)}"/>`) : ''}
        ${names.map((f) => finger(f, lw * 2, line)).join('')}
        ${backs.map((f) => finger(f, sep * 2, line, 0.7) + finger(f, 0, skin) + shadeOf(f)).join('')}
        ${palm ? `${palm} fill="${skin}"/>` : ''}
        ${palm && pose.palmShade !== false ? `<clipPath id="${cid}">${palm}/></clipPath><path d="${smooth((pose.palmPts || HAND.palm).slice(sh > 0 ? 5 : 0, sh > 0 ? 11 : 5))}" fill="none" stroke="${C.skinShade}" stroke-width="10" opacity="0.45" stroke-linecap="round" clip-path="url(#${cid})"/>` : ''}
        ${knuckles}
        ${front.map((f) => chain[f].slice(0, -1).map((_, i) => i === 0 && f === 'thumb' ? '' : seg(f, i, sep * 2, line, 0.85)).join('') + finger(f, 0, skin) + shadeOf(f)).join('')}
        ${names.map((f) => nail(f) + creases(f)).join('')}
        ${opt.rim ? `<path d="${smooth((pose.palmPts || HAND.palm).slice(0, 4))}" fill="none" stroke="${opt.rim}" stroke-width="${n(lw * 0.9)}" stroke-linecap="round" opacity="0.5"/>` : ''}
      </g>`;
  }
  // The poses he uses. Angles in degrees in hand space; a positive angle turns towards the little
  // finger, which is how fingers look as they curl when the back of the hand faces us.
  const HANDS = {
    // hanging relaxed at his side, the back of the hand out, the thumb in front
    hang: { index: [-3, 10, 26], middle: [1, 15, 32], ring: [6, 21, 40], little: [12, 28, 48], thumb: [-46, -20, -2],
      len: { index: [1, 0.9, 0.85], middle: [1, 0.88, 0.82], ring: [1, 0.86, 0.8], little: [1, 0.85, 0.78] }, nails: true, creases: true, front: ['thumb'] },
    // on the mouse: index and middle forward on the buttons, ring and little curled at its side
    mouse: { index: [-5, 2, 14], middle: [0, 5, 18], ring: [6, 18, 40], little: [14, 30, 52], thumb: [-34, -6, 6],
      len: { index: [1, 0.95, 0.8], middle: [1, 0.95, 0.8], ring: [1, 0.85, 0.7], little: [1, 0.8, 0.65] }, nails: true, creases: true, front: ['thumb'] },
    // on the keys, fingers curled down onto them
    keys: { index: [-4, 22, 50], middle: [0, 26, 56], ring: [5, 30, 60], little: [12, 36, 64], thumb: [-30, 0, 10],
      len: { index: [1, 0.7, 0.55], middle: [1, 0.7, 0.55], ring: [1, 0.7, 0.55], little: [1, 0.7, 0.55] }, nails: false, creases: true, front: ['thumb'] },
    // holding the phone: fingers wrapped round its back, only their tips show past its edge (drawn
    // under the phone), the thumb over the front
    phone: { index: [-10, -60, -110], middle: [-4, -58, -108], ring: [4, -52, -100], little: [12, -44, -90], thumb: [-60, -40, -24],
      len: { index: [1, 0.8, 0.7], middle: [1, 0.8, 0.7], ring: [1, 0.8, 0.7], little: [1, 0.8, 0.7] }, nails: false, creases: false, front: ['thumb'], thumbNail: true },
    // gripping the other arm when his arms are folded: the back of the hand on it, the fingers
    // curling round its far side, the thumb tucked out of sight
    grip: { index: [-6, 10, 26], middle: [-2, 12, 28], ring: [4, 15, 30], little: [10, 18, 34], thumb: [-40, -10, 10], hide: ['thumb'],
      len: { index: [1, 0.62, 0.32], middle: [1, 0.62, 0.32], ring: [1, 0.62, 0.32], little: [1, 0.6, 0.3] }, nails: false, creases: true },
    // holding the phone from behind: the back of the hand on the phone's back, the fingers across it,
    // their tips curling round its far edge, the thumb on the screen side out of sight
    phoneBack: { index: [36, 44, 80], middle: [40, 47, 84], ring: [44, 50, 88], little: [50, 56, 92], thumb: [-40, -10, 10], hide: ['thumb'],
      len: { index: [1, 0.95, 0.75], middle: [1, 0.95, 0.75], ring: [1, 0.95, 0.75], little: [1, 0.95, 0.75] }, nails: true, creases: true },
    // four fingers over the far upper arm, from under it (arms folded): no palm, no thumb
    wrap: { index: [0, 16, 42], middle: [2, 18, 44], ring: [4, 20, 46], little: [6, 22, 48], palm: false, knuckles: false,
      basePos: { index: [0, -15], middle: [1, -4.6], ring: [1, 5.4], little: [0, 15] },
      len: { index: [0.9, 0.9, 0.8], middle: [0.95, 0.9, 0.8], ring: [0.9, 0.9, 0.8], little: [0.75, 0.85, 0.75] }, nails: true, creases: true },
  };

  // A hand placed at the wrist: rot turns it, flip mirrors it (index on the other side), and kind
  // picks the pose. 'mouseDown' presses the index finger.
  function handShape(x, y, rot, kind, id, o = {}) {
    const P = { ...HANDS[kind === 'mouseDown' ? 'mouse' : kind] };
    if (kind === 'mouseDown') P.index = [-5, 9, 26];
    if (o.only) { P.hide = ['index', 'middle', 'ring', 'little', 'thumb'].filter((f) => !o.only.includes(f)); P.palm = o.only.includes('palm') ? P.palm : false; }
    if (o.hide) P.hide = [...(P.hide || []), ...o.hide];
    // the wrist always goes into a cuff, so it has no line across it
    return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)}) scale(${n(o.flip ? -(o.scale || 1) : (o.scale || 1))} ${n(o.scale || 1)})">${handSVG(P, { id, openWrist: true })}</g>`;
  }

  // ------------------------------------------------------------ from behind
  // The same cap model seen from behind (the opening with his hair through it, the strap across),
  // his short back and sides tapering to the nape, the backs of his ears, his neck and the crewneck.
  const BACK_HAIR = [[-79, -50], [-80.5, -30], [-79, -12], [-75.5, 4], [-70.5, 18], [-63.5, 31], [-55, 41.5], [-43, 49], [-22, 52.5], [0, 53.5],
    [22, 52.5], [43, 49], [55, 41.5], [63.5, 31], [70.5, 18], [75.5, 4], [79, -12], [80.5, -30], [79, -50], [40, -64], [-40, -64]];
  const BACK_HAIR_STROKES = (() => {
    const r = rnd(13), out = [];
    for (let tries = 0; out.length < 120 && tries < 5000; tries++) {
      const x = lerp(-80, 80, r()), y = lerp(-56, 52, r());
      if (!inside([x, y], BACK_HAIR)) continue;
      const ang = (90 - x * 0.3) * RAD + (r() - 0.5) * 0.3, len = 6 + r() * 4;
      out.push({ pts: [[x, y], [x + Math.cos(ang) * len * 0.5, y + Math.sin(ang) * len * 0.5], [x + Math.cos(ang) * len, y + Math.sin(ang) * len]], w: 1 + r() * 0.8, light: r() < 0.38 });
    }
    return out;
  })();
  function backEar(s, p) {
    const S2 = (pts) => pts.map(([x, y]) => [x * s, y]);
    const pts = S2([[-71, -19], [-79.5, -22.5], [-86.5, -16.5], [-89.8, -3], [-89.2, 12], [-86, 25], [-80.5, 34.5], [-74, 36.5], [-70, 31]]);
    return `${blob(pts, C.skinMid)}
      ${blob(S2([[-72, -16], [-78, -18], [-80, -4], [-79, 14], [-76, 28], [-71, 30]]), C.skinShade, 0.7)}
      ${ink(S2([[-80.5, -19.5], [-86.5, -12], [-88, 2], [-87, 16], [-83.5, 27], [-78, 34]]), 2.6, p.light.tint, [0.3, 0.3], 0.3 * p.light.rim)}
      ${ink(S2([[-77, -16.5], [-83.5, -10], [-85, 4], [-83, 19], [-78.5, 29.5]]), 1.8, C.skinDeep, [0.3, 0.4], 0.6)}
      ${ink(pts.slice(1, 8), 1.9, C.line, [0.15, 0.3])}`;
  }
  // The crewneck from behind: dropped shoulders rounding into the sleeves, the collar's back
  // standing up round his neck with the chain lying on it, his back in shade with the screen's light
  // round its edges.
  const BACK_SIDE = 'C -110 156, -150 170, -178 196 C -196 214, -203 246, -204 290 L -206 580 L 206 580 L 204 290 C 203 246, 196 214, 178 196 C 150 170, 110 156';
  function backTorso(p, id) {
    const M = bodyModel('back');
    const tint = p.light.tint, rim = p.light.rim;
    // the collar a little past where it turns away, its ends tucked behind his neck, and the top
    // of the shirt following its outer edge, so no skin shows between collar and shirt
    const cam = cam3(...BODY_VIEWS.back), run = [];
    for (let i = 0; i <= 60; i++) { const th = (70 + (i / 60) * 220) * RAD; run.push({ th, o: cam.at(collarPt(th, true)), n: cam.at(collarPt(th, false)) }); }
    const C2 = { front: run };
    const rimArc = run.map((f) => f.o).sort((a, b) => b[0] - a[0]);
    const R0 = rimArc[0], L0 = rimArc[rimArc.length - 1];
    const BACK_TOP = `M ${xy(L0)} ${BACK_SIDE} ${xy(R0)} L ${rimArc.slice(1).map(xy).join(' L ')} Z`;
    const edgeL = [[-74, 149], [-110, 156], [-150, 170], [-178, 196], [-196, 214], [-203, 246], [-204, 290], [-206, 580]];
    const edgeR = edgeL.map(([x, y]) => [-x, y]);
    return `
      <clipPath id="${id}btop"><path d="${BACK_TOP}"/></clipPath>
      <path d="${BACK_TOP}" fill="${C.top}"/>
      <g clip-path="url(#${id}btop)">
        ${blob([[-150, 240], [-60, 220], [0, 260], [60, 220], [150, 240], [140, 620], [-140, 620]], C.topDark, 0.55, ` filter="url(#${id}soft2)"`)}
        ${ink(off(edgeL.slice(0, 6), 4, 7), 9, C.topHi, [0.3, 0.3], 0.3, ` filter="url(#${id}soft)"`)}${ink(off(edgeR.slice(0, 6), -4, 7), 9, C.topHi, [0.3, 0.3], 0.3, ` filter="url(#${id}soft)"`)}
        ${ink(off(edgeL.slice(2), 3, 0), 6, tint, [0.2, 0.3], 0.3 * rim, ` filter="url(#${id}softer)"`)}${ink(off(edgeR.slice(2), -3, 0), 6, tint, [0.2, 0.3], 0.3 * rim, ` filter="url(#${id}softer)"`)}
        ${ink([[-92, 250], [-84, 330], [-88, 420]], 3, C.topDark, [0.4, 0.4], 0.5)}${ink([[96, 250], [88, 330], [90, 430]], 3, C.topDark, [0.4, 0.4], 0.5)}
        ${ink([[-8, 300], [0, 400], [4, 520]], 2.6, C.topDark, [0.4, 0.3], 0.35)}
      </g>
      <path d="${smooth([[-178, 196], [-160, 236], [-150, 290]])}" fill="none" stroke="${C.stitchTop}" stroke-width="1" stroke-dasharray="3 2.5"/>
      <path d="${smooth([[178, 196], [160, 236], [150, 290]])}" fill="none" stroke="${C.stitchTop}" stroke-width="1" stroke-dasharray="3 2.5"/>
      ${ink(edgeL, 2.4, C.lineCloth, [0.05, 0.03], 0.9)}${ink(edgeR, 2.4, C.lineCloth, [0.05, 0.03], 0.9)}
      <clipPath id="${id}bnotneck"><path d="M -300 -100 H 300 V 700 H -300 Z ${BACK_NECK}" clip-rule="evenodd"/>
        <path d="M ${[...M.front.map((f) => f.o), ...M.front.map((f) => f.n).reverse()].map(xy).join(' L ')} Z"/></clipPath>
      <g clip-path="url(#${id}bnotneck)">${collarSVG(C2, 'front')}</g>
      ${chainSVG(M, id, 'front')}`;
  }
  const BACK_NECK = 'M -50 36 C -51 66, -52 96, -54 116 C -56 130, -58 140, -61 152 L -61 175 L 61 175 L 61 152 C 58 140, 56 130, 54 116 C 52 96, 51 66, 50 36 Z';
  function back(p, id) {
    const cap = p.cap === 'none' ? null : capSVG(p, id, p.cap === 'back' ? Math.PI : 0, 'back');
    const M = cap ? capModel(p.cap === 'back' ? Math.PI : 0, 'back', p.light.key < 0 ? -1 : 1) : null;
    const shape = smooth(BACK_HAIR, true);
    const holeHair = M && M.hole ? `<path d="${poly(M.hole)}" fill="${C.hairDark}" stroke="${C.hairDark}" stroke-width="5" stroke-linejoin="round"/>
      <clipPath id="${id}bhole"><path d="${poly(M.hole)}"/></clipPath>
      <g clip-path="url(#${id}bhole)">${BACK_HAIR_STROKES.slice(0, 40).map((s) => ink(off(s.pts, 0, -40), s.w, s.light ? C.hairLight : C.hair, [0.4, 0.5], 0.55)).join('')}</g>` : '';
    return `
      ${cap ? cap.under : ''}
      <clipPath id="${id}bneck"><path d="${BACK_NECK}"/></clipPath>
      <path d="${BACK_NECK}" fill="url(#${id}neck)"/>
      <g clip-path="url(#${id}bneck)">
        ${ink([[-30, 64], [-33, 104], [-40, 146]], 3, C.skinShade, [0.3, 0.3], 0.45)}${ink([[30, 64], [33, 104], [40, 146]], 3, C.skinShade, [0.3, 0.3], 0.45)}
        ${ink([[-4, 70], [0, 110], [2, 140]], 6, C.skinShade, [0.3, 0.3], 0.18, ` filter="url(#${id}soft)"`)}
        ${blob([[-56, 46], [-20, 60], [20, 60], [56, 46], [56, 76], [0, 84], [-56, 76]], C.skinDeep, 0.35, ` filter="url(#${id}soft)"`)}
      </g>
      ${ink([[-50, 36], [-51.5, 72], [-53.5, 112], [-58, 146]], 2, C.line, [0.1, 0.1], 0.8)}${ink([[50, 36], [51.5, 72], [53.5, 112], [58, 146]], 2, C.line, [0.1, 0.1], 0.8)}
      ${backEar(1, p)}${backEar(-1, p)}
      <clipPath id="${id}bhair"><path d="${shape}"/></clipPath>
      <path d="${shape}" fill="url(#${id}hairg)"/>
      <g clip-path="url(#${id}bhair)">
        ${BACK_HAIR_STROKES.map((s) => ink(s.pts, s.w, s.light ? C.hairLight : C.hairDark, [0.4, 0.5], s.light ? 0.4 : 0.6)).join('')}
        ${ink([[-44, 50], [-22, 54], [0, 55], [22, 54], [44, 50]], 6, '#8C6A54', [0.2, 0.2], 0.45, ` filter="url(#${id}softer)"`)}
      </g>
      ${ink(BACK_HAIR.slice(0, 7), 1.8, C.lineHair, [0.3, 0.1], 0.7)}${ink(BACK_HAIR.slice(12, 19), 1.8, C.lineHair, [0.1, 0.3], 0.7)}
      ${backTorso(p, id)}
      ${holeHair}
      ${cap ? cap.over : ''}`;
  }

  function defs(p, id) {
    return `<defs>
      <linearGradient id="${id}skin" gradientUnits="userSpaceOnUse" x1="-100" y1="-40" x2="112" y2="10">
        <stop offset="0" stop-color="${C.skinMid}"/><stop offset="0.45" stop-color="${C.skin}"/><stop offset="1" stop-color="${C.skinHi}"/>
      </linearGradient>
      <linearGradient id="${id}hairg" gradientUnits="userSpaceOnUse" x1="0" y1="-50" x2="0" y2="48">
        <stop offset="0" stop-color="${C.hairDark}"/><stop offset="0.35" stop-color="${C.hair}"/><stop offset="0.75" stop-color="${C.hair}"/><stop offset="1" stop-color="#7C5C46"/>
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
      <linearGradient id="${id}capshadow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2A140C" stop-opacity="0.62"/><stop offset="0.55" stop-color="#2A140C" stop-opacity="0.3"/><stop offset="1" stop-color="#2A140C" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="lensg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#2A2A32"/><stop offset="0.5" stop-color="${C.lens}"/><stop offset="1" stop-color="#050506"/>
      </linearGradient>
      <filter color-interpolation-filters="sRGB" id="${id}softer" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="1.4"/></filter>
      <filter color-interpolation-filters="sRGB" id="${id}soft" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="3"/></filter>
      <filter color-interpolation-filters="sRGB" id="${id}soft2" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="5"/></filter>
      <clipPath id="${id}faceclip"><path d="${FACE}"/></clipPath>
      <clipPath id="${id}topclip"><path d="${TORSO}"/></clipPath>
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

  window.Founder = { pose, blendPose, founderSVG, handSVG, HANDS, colours: C };
})();
