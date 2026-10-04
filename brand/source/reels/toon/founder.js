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
  // His dark-brown hair under the cap, in overlapping locks that sweep back and down to soft points:
  // longer at the back, shorter over the ear, a sideburn in front of it. Each lock has its own
  // outline and a streak of light; the ends are lighter where the sun has bleached them.
  const LOCKS = [
    { pts: [[-121, -30], [-125, -10], [-127, 7], [-139, 20]], w: 24 },
    { pts: [[-107, -34], [-109, -12], [-112, 8], [-123, 24]], w: 24 },
    { pts: [[-93, -37], [-95, -14], [-97, 5], [-107, 20]], w: 22 },
    { pts: [[-79, -40], [-81, -19], [-83, -1], [-92, 13]], w: 20 },
    { pts: [[-65, -42], [-67, -25], [-69, -9], [-77, 3]], w: 18 },
    { pts: [[-51, -44], [-53, -31], [-56, -19], [-63, -11]], w: 15 },
  ];
  function sideHair(id) {
    const lock = ({ pts, w }) => `
      ${ink(pts, w + 3, C.lineHair, [0, 0.95])}
      ${ink(pts, w, `url(#${id}hairg)`, [0, 0.95])}
      ${ink(off(pts.slice(0, 3), w * 0.16, 0), w * 0.16, C.hairLight, [0.3, 0.45], 0.6)}
      ${ink(off(pts, -w * 0.2, 2), w * 0.3, C.hairDark, [0.1, 0.9], 0.45)}`;
    return `
      ${blob([[-127, -27], [-84, -38], [-46, -44], [-29, -47], [-27, -30], [-34, -18], [-50, -20], [-66, -12], [-82, 2], [-102, 10], [-121, 8]], C.hairDark)}
      ${LOCKS.map(lock).join('')}
      ${ink([[-35.5, -46], [-33.5, -28], [-31.4, -10], [-31.6, 4]], 11, C.lineHair, [0, 0.9])}
      ${ink([[-35.5, -46], [-33.5, -28], [-31.4, -10], [-31.6, 4]], 8.5, C.hair, [0, 0.9])}
      ${ink([[-34, -40], [-32.6, -24], [-31.4, -12]], 1.6, C.hairLight, [0.3, 0.5], 0.5)}`;
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

  // With the cap on backwards his fringe shows under its band, falling onto his forehead.
  function capFringe(id) {
    const L = [[[84, -60], [89, -47], [91, -37]], [[70, -58], [75, -44], [78, -29]], [[55, -55], [60, -43], [61, -32]], [[40, -53], [45, -40], [48, -26]], [[25, -50], [30, -39], [31, -30]], [[10, -47], [15, -37], [18, -29]]];
    return L.map((pts) => `${ink(pts, 21, C.lineHair, [0, 0.92])}${ink(pts, 18, C.hair, [0, 0.92])}${ink(pts.slice(1), 8, C.hairTip, [0.5, 0.92], 0.55)}${ink(off(pts.slice(0, 2), 3, 0), 2.4, C.hairLight, [0.3, 0.5], 0.55)}`).join('');
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
  const FACE = `${smooth([...FAR_EDGE, ...JAW.slice(1), [-40, 50], [-62, 42], [-84, 28], [-96, 0]])} L -98 -48 C -102 -104, -52 -142, 0 -142 C 46 -142, 82 -110, 92 -62 Z`;
  function head34(p, id) {
    const capped = p.cap === 'fwd';
    const tint = p.light.tint, rim = p.light.rim;
    return `
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
      ${sideHair(id)}
      ${ear(id)}
      ${eye(true, p, id)}${eye(false, p, id)}
      ${brow(true, p.brow[0])}${brow(false, p.brow[1])}
      ${nose(p, id)}
      ${mouth(p, id)}
      ${ink([...FAR_EDGE.slice(1), ...JAW.slice(1)], 2.5, C.line, [0.06, 0.1])}
      ${capped ? `<path d="M -40 -50 C 0 -56, 60 -62, 108 -66 L 110 -32 C 80 -24, 40 -22, 0 -26 C -20 -30, -34 -38, -40 -50 Z" fill="url(#${id}capshadow)" clip-path="url(#${id}faceclip)" filter="url(#${id}soft)"/>` : ''}
      ${p.cap === 'fwd' ? capFwd(p, id) : p.cap === 'back' ? capFringe(id) + capBack(p, id) : fringe()}
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
        ${handShape(-96, 382, 33, 'grip', id, { flip: true, scale: 0.92 })}
        ${handShape(104, 350, -38, 'grip', id, { scale: 0.88 })}
        ${cuff([[-92, 368], [-96, 396]])}${cuff([[100, 336], [104, 364]])}`;
    }
    if (p.arms === 'desk') {
      const hx = 196 + p.hand.x, hy = 420 + p.hand.y;
      if (layer === 'back') return `<path d="M 118 246 C 150 290, 172 352, 188 402 L 242 392 C 218 340, 192 290, 160 244 Z" fill="${C.topDark}"/>${handShape(206, 392, 18, 'keys', id, { scale: 0.9 })}<path d="M 186 402 L 230 386" stroke="${C.topDark}" stroke-width="12" stroke-linecap="round"/>`;
      return `
        <path d="M -186 232 C -212 300, -206 380, -162 420 C -102 454, 40 452, ${n(hx - 40)} ${n(hy + 6)} L ${n(hx - 36)} ${n(hy - 44)} C 40 398, -80 400, -126 384 C -150 366, -156 316, -148 254 Z" ${sleeve}/>
        ${ink([[-182, 330], [-170, 382], [-142, 414]], 3.2, C.topDark, [0.3, 0.3], 0.85)}
        ${ink([[-196, 350], [-186, 392]], 2.4, C.topDark, [0.3, 0.3], 0.7)}
        ${ink([[-110, 406], [-40, 414], [40, 416]], 2.4, C.topHi, [0.3, 0.3], 0.5)}
        ${ink([[-60, 438], [0, 444], [60, 438]], 2.6, C.topDark, [0.3, 0.3], 0.6)}
        ${ink([[-186, 232], [-212, 300], [-206, 380], [-162, 420], [-102, 454], [40, 452], [hx - 40, hy + 6]], 2.4, C.lineCloth, [0.05, 0.05], 0.9)}
        <ellipse cx="${n(hx + 30)}" cy="${n(hy - 8)}" rx="38" ry="21" fill="#1C1C1F"/><path d="M ${n(hx + 2)} ${n(hy - 14)} C ${n(hx + 16)} ${n(hy - 24)}, ${n(hx + 46)} ${n(hy - 24)}, ${n(hx + 66)} ${n(hy - 12)}" fill="none" stroke="#45454C" stroke-width="2"/>
        ${handShape(hx - 37, hy - 19, -3, p.hand.click > 0.5 ? 'mouseDown' : 'mouse', id)}
        ${cuff([[hx - 42, hy + 2], [hx - 38, hy - 40]])}`;
    }
    if (p.arms === 'phone') {
      if (layer === 'back') return '';
      return `
        <path d="M -186 232 C -212 300, -208 372, -168 398 C -118 424, -40 424, 30 392 L 22 346 C -40 368, -100 368, -130 354 C -150 334, -156 300, -148 254 Z" ${sleeve}/>
        ${ink([[-182, 320], [-170, 370], [-146, 392]], 3.2, C.topDark, [0.3, 0.3], 0.8)}
        ${ink([[-186, 232], [-212, 300], [-208, 372], [-168, 398], [-118, 424], [-40, 424], [30, 392]], 2.4, C.lineCloth, [0.05, 0.05], 0.9)}
        <g transform="translate(90 298) rotate(-12)"><rect x="-25" y="-52" width="50" height="100" rx="9" fill="#18181B" stroke="#3A3A3E" stroke-width="2.2"/>
          <rect x="-17" y="-44" width="16" height="22" rx="5" fill="#0C0C0E"/><circle cx="-9" cy="-38" r="3.6" fill="#2A2A31"/><circle cx="-9" cy="-28" r="3.6" fill="#2A2A31"/>
          <path d="M 23 -44 L 23 40" stroke="${p.light.tint}" stroke-width="2" opacity="0.35"/></g>
        ${handShape(26, 370, -46, 'phoneBack', id)}
        ${cuff([[26, 394], [20, 348]])}`;
    }
    if (layer === 'back') return '';
    // hanging at his side: the elbow, the forearm a little forward, the hand relaxed
    const outer = [[-180, 196], [-202, 216], [-215, 270], [-217, 350], [-209, 430], [-197, 500], [-188, 526]];
    const inner = [[-146, 526], [-150, 500], [-158, 432], [-160, 352], [-156, 282], [-146, 238]];
    return `
      ${ink(off(inner, 4, 0), 14, '#000', [0.1, 0.1], 0.35, ` filter="url(#${id}soft)"`)}
      ${handShape(-168, 518, 90, 'hang', id, { scale: 1.05 })}
      <path d="${loop(outer, inner)}" ${sleeve}/>
      ${ink([[-210, 352], [-190, 372], [-166, 366]], 3, C.topDark, [0.3, 0.3], 0.8)}
      ${ink([[-206, 382], [-186, 396], [-164, 392]], 2.4, C.topDark, [0.3, 0.3], 0.6)}
      ${ink([[-170, 230], [-180, 300], [-182, 340]], 2.6, C.topHi, [0.3, 0.3], 0.45)}
      ${ink(outer, 2.4, C.lineCloth, [0.05, 0.05], 0.9)}${ink(inner, 2, C.lineCloth, [0.05, 0.05], 0.85)}
      ${cuff([[-190, 520], [-148, 520]])}`;
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
    return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)}) scale(${n(o.flip ? -(o.scale || 1) : (o.scale || 1))} ${n(o.scale || 1)})">${handSVG(P, { id })}</g>`;
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
      <linearGradient id="${id}skin" gradientUnits="userSpaceOnUse" x1="-100" y1="-40" x2="112" y2="10">
        <stop offset="0" stop-color="${C.skinMid}"/><stop offset="0.45" stop-color="${C.skin}"/><stop offset="1" stop-color="${C.skinHi}"/>
      </linearGradient>
      <linearGradient id="${id}hairg" gradientUnits="userSpaceOnUse" x1="0" y1="-46" x2="0" y2="28">
        <stop offset="0" stop-color="${C.hairDark}"/><stop offset="0.3" stop-color="${C.hair}"/><stop offset="0.78" stop-color="${C.hair}"/><stop offset="1" stop-color="${C.hairTip}"/>
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
      <filter id="${id}softer" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="1.4"/></filter>
      <filter id="${id}soft" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="3"/></filter>
      <filter id="${id}soft2" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="5"/></filter>
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

  window.Founder = { pose, blendPose, founderSVG, handSVG, HANDS, colours: C };
})();
