// The TCP founder as an animated character, drawn as a detailed 2D cartoon: ink lines that taper,
// two tones of shade with soft edges, the screen's light in front of him, and detailed eyes. One
// drawing built from parameters, so his face, cap, chain and clothes are the same in every shot.
// His cap, collar and pearl chain are small 3D models turned to his angle and projected, so they sit
// in true perspective from the front, turned and from behind. He is built strong: a thick neck, round
// shoulders, a deep chest narrowing to the waist; each arm is a shoulder, elbow and wrist placed as
// it would be seen from this angle, its sleeve following the muscle under it. His hands are drawn
// from their bones to real proportions. His black crewneck carries an AMIRI wordmark wrapped round
// his chest (a print stays readable when he faces the other way). Every blur works in sRGB:
// Chromium's default (linear light) leaves hard steps in soft shading on black cloth.
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
    pearl: '#EFEBE3', pearlShade: '#ADA597', lens: '#0B0B0E', print: '#E6DECD',
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
    ? [78 * Math.sin(th), -4 - 22 * Math.cos(th), 76 * Math.cos(th) - 4]
    : [61 * Math.sin(th), 8 - 22 * Math.cos(th), 62 * Math.cos(th) - 4]);
  // the chain: around the back of his neck on the collar, then off it at his collarbones and down
  // his chest to a low point over his sternum
  const CHAIN = { R: [70, 69], LIFT: 0, OFF: 0.98, LOW: -118, ZLOW: 115, BEAD: 3.1 };
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
    const d = `M -63 58 C -64 88, -65 118, ${xy(L)} L ${ring.slice(1).map(xy).join(' L ')} C ${n(R[0] - 1)} ${n(R[1] - 22)}, 52 132, 54 112 L 54 86 C 20 74, -30 58, -63 58 Z`;
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

  // The crewneck's outline round his body; his arms are drawn over it. From the collar down the
  // slope of his near trapezius to his shoulder, under his near arm and down his side, along the
  // bottom, up his far side and round the edge of his far chest (his far arm is behind it), over his
  // far trapezius to the collar, and round the back of the collar. Broad shoulders and a deep chest,
  // narrowing to the waist.
  const TORSO_NEAR = [[-83.8, 155.1], [-100, 161.5], [-114, 169.5], [-127, 179], [-140, 191], [-151, 210], [-157, 240], [-158, 290], [-152, 350], [-143, 420], [-136, 490], [-133, 600]];
  const TORSO_FAR = [[124, 600], [126, 520], [131, 450], [139, 385], [146, 333], [148, 298], [145, 268], [137, 242], [124, 217], [108, 199], [89, 188], [70.6, 182.9]];
  const COLLAR_BACK = (() => {
    const cam = cam3(...BODY_VIEWS['34']);
    return Array.from({ length: 18 }, (_, i) => cam.at(collarPt((55 + (i * 172) / 17) * RAD, true)));
  })();
  const TORSO = `${smooth(TORSO_NEAR)} L 124 600 ${smooth(TORSO_FAR).replace(/^M/, 'L')} L ${COLLAR_BACK.map(xy).join(' L ')} Z`;
  // The AMIRI wordmark printed across his chest: each letter laid on the curve of his chest at its own
  // place and turned with it, so the word wraps round him like a real print, foreshortening on the far
  // side. Letter shapes from Liberation Serif (SIL Open Font License), cap height 1, baseline at 0.
  const GLYPHS = {"A":{"d":"M0.344 -0.04V0H0.015V-0.04L0.128 -0.06L0.469 -1.008H0.611L0.965 -0.06L1.092 -0.04V0H0.669V-0.04L0.803 -0.06L0.704 -0.348H0.31L0.21 -0.06ZM0.504 -0.901 0.333 -0.415H0.681Z","adv":1.1029},"M":{"d":"M0.643 0H0.617L0.251 -0.86V-0.06L0.385 -0.04V0H0.044V-0.04L0.172 -0.06V-0.941L0.044 -0.96V-1H0.347L0.672 -0.239L1.027 -1H1.313V-0.96L1.185 -0.941V-0.06L1.313 -0.04V0H0.908V-0.04L1.042 -0.06V-0.86Z","adv":1.3579},"I":{"d":"M0.327 -0.06 0.455 -0.04V0H0.055V-0.04L0.183 -0.06V-0.941L0.055 -0.96V-1H0.455V-0.96L0.327 -0.941Z","adv":0.5086},"R":{"d":"M0.316 -0.438V-0.06L0.468 -0.04V0H0.054V-0.04L0.172 -0.06V-0.941L0.044 -0.96V-1H0.476Q0.664 -1 0.753 -0.937Q0.843 -0.873 0.843 -0.733Q0.843 -0.633 0.788 -0.56Q0.734 -0.488 0.638 -0.459L0.908 -0.06L1.016 -0.04V0H0.777L0.496 -0.438ZM0.694 -0.723Q0.694 -0.837 0.639 -0.885Q0.583 -0.933 0.444 -0.933H0.316V-0.506H0.448Q0.582 -0.506 0.638 -0.555Q0.694 -0.605 0.694 -0.723Z","adv":1.0186}};
  const WORDMARK = { text: 'AMIRI', h: 29, track: 0.34, y: -153, W: 215, D: 118, c: 2 };
  // When he faces the other way the whole drawing is mirrored, but a print never is: then the
  // letters go in the other order, each mirrored back.
  const wordmarkCache = {};
  function wordmark(flip) {
    if (wordmarkCache[flip]) return wordmarkCache[flip];
    const g = WORDMARK, cam = cam3(...BODY_VIEWS['34']);
    const text = flip ? [...g.text].reverse().join('') : g.text;
    const adv = [...text].map((ch) => GLYPHS[ch].adv);
    const total = adv.reduce((s, a) => s + a, 0) + g.track * (g.text.length - 1);
    // an arc length round his chest from its middle, to the angle there
    const arcTo = (s) => {
      let th = 0, run = 0;
      const step = 0.001 * Math.sign(s);
      while (Math.abs(run) < Math.abs(s)) { run += Math.hypot(g.W * Math.cos(th), g.D * Math.sin(th)) * Math.abs(step); th += step; }
      return th;
    };
    let pos = -total / 2;
    const letters = [...text].map((ch, i) => {
      const mid = (pos + adv[i] / 2) * g.h;
      pos += adv[i] + g.track;
      const th = arcTo(mid);
      const P = [g.W * Math.sin(th), g.y, g.c + g.D * Math.cos(th)];
      const t = unit3([g.W * Math.cos(th), 0, -g.D * Math.sin(th)]);
      const O = cam.at(P), U = cam.at([P[0] + t[0], P[1], P[2] + t[2]]), V = cam.at([P[0], P[1] - 1, P[2]]);
      const u = [(U[0] - O[0]) * g.h, (U[1] - O[1]) * g.h], v = [(V[0] - O[0]) * g.h, (V[1] - O[1]) * g.h];
      return `<path transform="matrix(${n(u[0])} ${n(u[1])} ${n(v[0])} ${n(v[1])} ${n(O[0])} ${n(O[1])})${flip ? ' scale(-1 1)' : ''} translate(${n(-adv[i] / 2)} 0.5)" d="${GLYPHS[ch].d}"/>`;
    }).join('');
    wordmarkCache[flip] = letters;
    return letters;
  }
  function torso34(p, id) {
    const tint = p.light.tint, rim = p.light.rim;
    const M = bodyModel('34');
    const f = (k) => ` filter="url(#${id}${k})"`;
    return `
      <path d="${TORSO}" fill="${C.top}"/>
      <g clip-path="url(#${id}topclip)">
        ${blob([[-180, 176], [-118, 196], [-98, 300], [-92, 620], [-190, 620]], C.topDark, 0.62, f('soft2'))}
        ${blob([[78, 206], [128, 218], [150, 292], [142, 430], [104, 430], [86, 300]], C.topHi, 0.3, f('soft2'))}
        <g fill="#000" opacity="0.35" transform="translate(${p.flip ? -0.8 : 0.8} 1)">${wordmark(!!p.flip)}</g>
        <g fill="${C.print}">${wordmark(!!p.flip)}</g>
        ${ink(off(M.front.map((q) => q.o), 0, 7), 10, C.topDark, [0.15, 0.15], 0.6, f('soft'))}
        ${ink(off(TORSO_NEAR.slice(1, 5), 3, 9), 12, C.topHi, [0.3, 0.3], 0.26, f('soft'))}
        ${ink(off(TORSO_FAR.slice(7, 11).reverse(), -3, 9), 10, C.topHi, [0.3, 0.3], 0.3, f('soft'))}
        ${ink([[-112, 302], [-60, 338], [0, 354], [62, 352], [110, 338], [146, 314]], 16, C.topDark, [0.2, 0.25], 0.55, f('soft2'))}
        ${ink([[-80, 286], [-20, 296], [40, 298], [100, 290], [136, 278]], 14, C.topHi, [0.3, 0.3], 0.1, f('soft2'))}
        ${ink([[-100, 250], [-40, 262], [30, 268]], 24, C.topHi, [0.3, 0.3], 0.1, f('soft2'))}
        ${ink([[88, 248], [118, 260], [140, 282]], 16, C.topHi, [0.3, 0.3], 0.2, f('soft2'))}
        ${ink([[69, 238], [70, 280], [69, 330]], 5, C.topDark, [0.3, 0.3], 0.2, f('soft'))}
        ${ink([[-96, 300], [-74, 314], [-50, 322]], 2.4, C.topDark, [0.4, 0.4], 0.45)}
        ${ink([[-94, 293], [-72, 306]], 1.3, C.topHi, [0.4, 0.4], 0.28)}
        ${ink([[146, 332], [130, 344], [112, 350]], 2.2, C.topDark, [0.4, 0.4], 0.4)}
        ${ink([[-110, 542], [-40, 558], [50, 554], [112, 542]], 2.4, C.topDark, [0.3, 0.3], 0.3)}
        ${ink([[-90, 530], [-20, 542]], 1.3, C.topHi, [0.3, 0.3], 0.2)}
        ${ink(off(TORSO_FAR.slice(2, 8), -9, 0), 16, tint, [0.25, 0.3], 0.12 * rim, f('soft2'))}
      </g>
      ${ink(TORSO_NEAR, 2.4, C.lineCloth, [0.03, 0.03], 0.92)}
      ${ink(TORSO_FAR, 2.2, C.lineCloth, [0.03, 0.12], 0.88)}
      ${collarSVG(M, 'back')}
      ${chainSVG(M, id, 'back')}
      ${neckSVG(p, id, M)}
      ${collarSVG(M, 'front')}
      ${chainSVG(M, id, 'front')}`;
  }

  // A sleeve from its two edges, shoulder to cuff: one outline, the side away from the light in
  // shade, the muscle under it modelled in light and shadow, creases where it bends, the fabric
  // gathered above a ribbed cuff. out and inn run from the top to the cuff; the cuff is the last
  // stretch of each; the seam closes the top, from the end of inn to the start of out.
  function sleeve(id, s, light = 1) {
    const out = s.out, inn = s.inn, cuffK = s.cuff ?? 16, lw = s.lw ?? 1;
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
    for (let k = 1; k < 11; k++) {
      const t = k / 11;
      ribs += `<path d="M ${xy([lerp(o0[0], i0[0], t), lerp(o0[1], i0[1], t)])} L ${xy([lerp(o1[0], i1[0], t), lerp(o1[1], i1[1], t)])}" stroke="${C.topHi}" stroke-width="${n(0.9 * lw)}" opacity="0.4"/>`;
    }
    const mid = (a, b, t, bow) => {
      const m = [lerp(a[0], b[0], t), lerp(a[1], b[1], t)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      return [m[0] + (-dy / L) * bow, m[1] + (dx / L) * bow];
    };
    const litEdge = s.litEdge || 'inn';
    const lit = light > 0 ? litEdge : litEdge === 'inn' ? 'out' : 'inn';
    const litPts = lit === 'inn' ? inn : out, darkPts = lit === 'inn' ? out : inn;
    const fx = id.replace(/[^\w]/g, '');
    return {
      body: `
      <defs><filter color-interpolation-filters="sRGB" id="${fx}x" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
        <filter color-interpolation-filters="sRGB" id="${fx}y" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
        <filter color-interpolation-filters="sRGB" id="${fx}z" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.4"/></filter>
        <clipPath id="${id}"><path d="${shape}"/></clipPath></defs>
      <path d="${shape}" fill="${C.top}"/>
      <g clip-path="url(#${id})">
        ${ink(darkPts, 22, C.topDark, [0.1, 0.1], 0.75, ` filter="url(#${fx}x)"`)}
        ${ink(litPts, 10, C.topHi, [0.15, 0.15], 0.42, ` filter="url(#${fx}y)"`)}
        ${s.shade ? s.shade(fx) : ''}
        ${s.rim ? ink(litPts, 7, s.rim.colour, [0.1, 0.2], s.rim.op, ` filter="url(#${fx}z)"`) : ''}
        ${(s.folds || []).map((f) => `${ink(f, 2.6, C.topDark, [0.4, 0.4], 0.55)}${ink(off(f, -1.4, -1.7), 1.3, C.topHi, [0.4, 0.4], 0.3)}`).join('')}
        ${ink([o3, mid(o3, i3, 0.5, 3), i3], 2.2, C.topDark, [0.3, 0.3], 0.5)}${ink([o2, mid(o2, i2, 0.5, 2.4), i2], 2.2, C.topDark, [0.3, 0.3], 0.5)}
        ${ink(off([o3, mid(o3, i3, 0.5, 3), i3], 0, -2), 1.2, C.topHi, [0.3, 0.3], 0.25)}
      </g>
      ${s.seam ? `<path d="${smooth(s.seam)}" fill="none" stroke="${C.stitchTop}" stroke-width="1" stroke-dasharray="3 2.5"/>` : ''}
      ${ink(out, 2.4 * lw, C.lineCloth, [s.outTaper ?? 0.03, 0.03], 0.92)}
      ${ink(inn, 2.1 * lw, C.lineCloth, [s.innTaper ?? 0.2, 0.03], 0.88)}`,
      cuff: `
      <path d="M ${xy(o0)} L ${xy(o1)} L ${xy(i1)} L ${xy(i0)} Z" fill="${mixC(C.top, C.topDark, 0.35)}"/>
      ${ribs}
      ${ink([o0, mid(o0, i0, 0.5, 1.5), i0], 1.4 * lw, C.lineCloth, [0.1, 0.1], 0.7)}
      ${ink([o0, o1], 2.4 * lw, C.lineCloth, [0.05, 0.05], 0.92)}${ink([i0, i1], 2.1 * lw, C.lineCloth, [0.05, 0.05], 0.88)}
      ${ink([o1, mid(o1, i1, 0.5, 2), i1], 2.1 * lw, C.lineCloth, [0.05, 0.05], 0.92)}`,
    };
  }

  // Each arm is three joints in the picture, S the shoulder, E the elbow and W the wrist (body space),
  // placed where his arm would be seen from this angle, so the upper arm and forearm keep their
  // lengths, shortening only as they come towards us. T is the top of his shoulder, where the sleeve
  // leaves the line of his trapezius, Td the way that line runs there. The sleeve follows the muscle
  // under it: the deltoid capping the shoulder, the biceps in front of the upper arm and the triceps
  // behind, the forearm thick below the elbow and narrowing into the cuff; the point of the elbow
  // rounds the outside of the bend, the inside creases. Radii in body units along each bone, from the
  // joint above (0) to the joint below (1).
  const MUSCLE = {
    upper: { back: [[0, 46], [0.25, 47], [0.45, 44], [0.62, 47.5], [0.82, 44], [1, 37]], front: [[0, 40], [0.25, 44], [0.55, 51], [0.75, 47], [0.92, 39], [1, 35]] },
    fore: { back: [[0, 37], [0.15, 42], [0.35, 40], [0.65, 32], [1, 26]], front: [[0, 35], [0.2, 44], [0.4, 40], [0.7, 31], [1, 26]] },
  };
  // the deltoid rounding out over the top of the upper arm, more on its outer side
  const deltoid = (t, amp) => amp * Math.exp(-(((t - 0.17) / 0.15) ** 2));
  const radius = (k, t) => {
    for (let i = 1; i < k.length; i++) {
      if (t <= k[i][0]) { const u = (t - k[i - 1][0]) / (k[i][0] - k[i - 1][0]); return lerp(k[i - 1][1], k[i][1], u * u * (3 - 2 * u)); }
    }
    return k[k.length - 1][1];
  };
  // where two segments cross, if they do
  function crossing(a, b, c, d) {
    const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]], den = r[0] * s[1] - r[1] * s[0];
    if (Math.abs(den) < 1e-9) return null;
    const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [a[0] + r[0] * t, a[1] + r[1] * t] : null;
  }
  // The sleeve's edges for an arm: out the side away from his body (with the deltoid's cap), inn the
  // side towards it (from the armpit), the seam between, its creases and its modelling.
  function armSleeve(J) {
    const { S, E, W, T, Td } = J;
    const u = [E[0] - S[0], E[1] - S[1]], f = [W[0] - E[0], W[1] - E[1]];
    const Lu = Math.hypot(u[0], u[1]), Lf = Math.hypot(f[0], f[1]);
    const NU = [-u[1] / Lu, u[0] / Lu], NF = [-f[1] / Lf, f[0] / Lf];
    // side A is to the left of the bone going down the arm as the picture has it (+1), side B to the
    // right (-1); the point of the elbow, and the triceps above it, are on the outside of the bend
    const bend = u[0] * f[1] - u[1] * f[0], sgBack = (J.backA ?? bend < 0) ? 1 : -1, sgFront = -sgBack;
    const N = 12;
    const U = (t, r) => [S[0] + u[0] * t + NU[0] * r, S[1] + u[1] * t + NU[1] * r];
    const F = (t, r) => [E[0] + f[0] * t + NF[0] * r, E[1] + f[1] * t + NF[1] * r];
    const sgOut = J.outer === 'A' ? 1 : -1;
    const edge = (sg) => {
      const ku = sg === sgBack ? MUSCLE.upper.back : MUSCLE.upper.front, kf = sg === sgBack ? MUSCLE.fore.back : MUSCLE.fore.front;
      const up = [], fo = [], amp = sg === sgOut ? 12 : 3;
      for (let i = 0; i <= N; i++) up.push(U(i / N, (radius(ku, i / N) + deltoid(i / N, amp)) * sg));
      for (let i = 0; i <= N; i++) fo.push(F(i / N, radius(kf, i / N) * sg));
      if ((sg > 0) === (bend < 0)) {
        const a = up[N], b = fo[0], a0 = Math.atan2(a[1] - E[1], a[0] - E[0]);
        let da = Math.atan2(b[1] - E[1], b[0] - E[0]) - a0;
        while (da > Math.PI) da -= 2 * Math.PI;
        while (da < -Math.PI) da += 2 * Math.PI;
        const r0 = Math.hypot(a[0] - E[0], a[1] - E[1]), r1 = Math.hypot(b[0] - E[0], b[1] - E[1]);
        const k = Math.max(1, Math.ceil(Math.abs(da) / 0.25)), arc = [];
        for (let i = 1; i < k; i++) { const t = i / k, r = lerp(r0, r1, t) * (1 + 0.05 * Math.sin(Math.PI * t)); arc.push([E[0] + Math.cos(a0 + da * t) * r, E[1] + Math.sin(a0 + da * t) * r]); }
        return { pts: [...up, ...arc, ...fo.slice(1)], crease: null, nUp: up.length + arc.length };
      }
      for (let i = N; i > N / 2; i--) {
        for (let j = 0; j < N / 2; j++) {
          const X = crossing(up[i - 1], up[i], fo[j], fo[j + 1]);
          if (X) return { pts: [...up.slice(0, i), X, ...fo.slice(j + 1)], crease: X, nUp: i + 1 };
        }
      }
      return { pts: [...up, ...fo.slice(1)], crease: [(up[N][0] + fo[0][0]) / 2, (up[N][1] + fo[0][1]) / 2], nUp: up.length };
    };
    const O = edge(sgOut), I = edge(-sgOut);
    // the deltoid: from the top of the shoulder, round, to its widest, and on down the outer edge
    const k = 2, P1 = O.pts[k], P0 = O.pts[k - 1], P2 = O.pts[k + 1];
    const dl = Math.hypot(P2[0] - P0[0], P2[1] - P0[1]), d1 = [(P2[0] - P0[0]) / dl, (P2[1] - P0[1]) / dl];
    const L = Math.hypot(P1[0] - T[0], P1[1] - T[1]);
    const c1 = [T[0] + Td[0] * L * 0.55, T[1] + Td[1] * L * 0.55], c2 = [P1[0] - d1[0] * L * 0.55, P1[1] - d1[1] * L * 0.55];
    const cap = [];
    for (let i = 0; i < 7; i++) {
      const t = i / 7, m = 1 - t;
      cap.push([0, 1].map((q) => m * m * m * T[q] + 3 * m * m * t * c1[q] + 3 * m * t * t * c2[q] + t * t * t * P1[q]));
    }
    const out = [...cap, ...O.pts.slice(k)];
    const inn = I.pts.slice(3);
    const nOut = [NU[0] * sgOut, NU[1] * sgOut];
    const seam = [inn[0], [lerp(inn[0][0], T[0], 0.5) + nOut[0] * 9, lerp(inn[0][1], T[1], 0.5) + nOut[1] * 9], T];
    // the creases inside the elbow, fanning out from where the edges meet
    const inside = O.crease ? O : I, sgIn = O.crease ? sgOut : -sgOut, X = inside.crease;
    const uh = [u[0] / Lu, u[1] / Lu], fh = [f[0] / Lf, f[1] / Lf], nIn = [NU[0] * sgIn, NU[1] * sgIn], nInF = [NF[0] * sgIn, NF[1] * sgIn];
    const P = (p, a, ka, b, kb) => [p[0] + a[0] * ka + b[0] * kb, p[1] + a[1] * ka + b[1] * kb];
    const sharp = Math.min(1, Math.abs(bend) / (Lu * Lf * 0.5));
    const folds = sharp > 0.2 ? [
      [P(X, uh, -16, nIn, -3), P(X, uh, -7, nIn, -16), P(X, uh, 2, nIn, -30)],
      [P(X, fh, 10, nInF, -3), P(X, fh, 7, nInF, -15), P(X, fh, 9, nInF, -27)],
      [P(X, uh, -30, nIn, -6), P(X, uh, -24, nIn, -16)],
    ] : [
      [P(X, uh, -14, nIn, -4), P(X, uh, -2, nIn, -14), P(X, fh, 10, nIn, -22)],
      [P(X, fh, 16, nInF, -4), P(X, fh, 24, nInF, -14)],
    ];
    const rf = (t) => radius(MUSCLE.upper.front, t), rff = (t) => radius(MUSCLE.fore.front, t);
    const shade = (fx) => `
        ${ink([...cap.slice(1), ...O.pts.slice(k, k + 3)].map((p) => [lerp(p[0], S[0], 0.3), lerp(p[1], S[1], 0.3)]), 16, C.topHi, [0.3, 0.3], 0.2, ` filter="url(#${fx}y)"`)}
        ${ink([U(0.36, 56 * sgOut), U(0.43, 40 * sgOut), U(0.5, 22 * sgOut)], 5, C.topDark, [0.3, 0.3], 0.3, ` filter="url(#${fx}z)"`)}
        ${ink([U(0.34, rf(0.34) * sgFront * 0.92), U(0.42, rf(0.42) * sgFront * 0.5), U(0.5, rf(0.5) * sgFront * 0.1)], 4.5, C.topDark, [0.3, 0.3], 0.32, ` filter="url(#${fx}z)"`)}
        ${ink([U(0.38, rf(0.38) * sgFront * 0.5), U(0.52, rf(0.52) * sgFront * 0.52), U(0.66, rf(0.66) * sgFront * 0.48)], 18, C.topHi, [0.3, 0.3], 0.15, ` filter="url(#${fx}y)"`)}
        ${ink([U(0.8, rf(0.8) * sgFront * 0.8), U(0.88, rf(0.88) * sgFront * 0.55), U(0.95, rf(0.95) * sgFront * 0.25)], 9, C.topDark, [0.3, 0.3], 0.32, ` filter="url(#${fx}z)"`)}
        ${ink([F(0.08, rff(0.08) * sgFront * 0.5), F(0.24, rff(0.24) * sgFront * 0.5), F(0.4, rff(0.4) * sgFront * 0.45)], 14, C.topHi, [0.3, 0.3], 0.13, ` filter="url(#${fx}y)"`)}`;
    return { out, inn, seam, folds, shade, litEdge: J.lit || 'inn', cuff: 16, crease: X, outUpper: out.slice(0, cap.length + O.nUp - k) };
  }

  // The arms in each pose, as joints. Both shoulders stay where his body puts them; the hands keep
  // the places the sets rely on (the mouse, the keyboard, the phone). His far arm is behind his body,
  // seen only past its far side, except where it crosses in front (arms folded). Hands are turned
  // from the line of the forearm by rot degrees.
  const SHOULDERS = {
    near: { S: [-128, 225], T: [-127, 179], Td: [-0.8, 0.6], outer: 'A', lit: 'inn' },
    far: { S: [119, 228], T: [92, 189.4], Td: [0.94, 0.34], outer: 'B', lit: 'out' },
  };
  const HAND_SCALE = 1.45;
  const ARMS = {
    rest: {
      far: { E: [128, 450], W: [146, 640] },
      near: { E: [-146, 448], W: [-128, 640], hand: { kind: 'hang', rot: 5 } },
    },
    desk: {
      far: { E: [205, 390], W: [305, 380], hand: { kind: 'keys', rot: 4 } },
      near: { E: [-66, 400], W: [98, 408], hand: { kind: 'mouse', rot: -6 }, mouse: true },
    },
    fold: {
      far: { E: [206, 448], W: [16, 442], hand: { kind: 'grip', rot: 15, flip: true }, cross: true },
      near: { E: [-135, 410], W: [62, 356], hand: { kind: 'grip', rot: -2 } },
    },
    phone: {
      far: { E: [128, 450], W: [146, 640] },
      near: { E: [-120, 412], W: [38, 352], hand: { kind: 'phoneBack', rot: -29 }, phone: true },
    },
  };
  // the part of the picture past his body's far side, for his far arm (just outside the line round
  // his body, so that line stays whole)
  const FAR_CLIP = (() => {
    const pts = sample(TORSO_FAR, 10), edge = [];
    pts.forEach((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      edge.push([p[0] - (dy / L) * 1.2, p[1] + (dx / L) * 1.2]);
    });
    return `M ${edge.map(xy).join(' L ')} L 70 90 L 560 90 L 560 760 L ${n(edge[0][0])} 760 Z`;
  })();
  const armCache = {};
  function armOf(pose, part, hx = 0, hy = 0) {
    const key = `${pose}|${part}|${hx}|${hy}`;
    if (armCache[key]) return armCache[key];
    const A = ARMS[pose][part], J = { ...SHOULDERS[part], ...A };
    if (A.mouse) { J.W = [A.W[0] + hx, A.W[1] + hy]; J.E = [A.E[0] + hx * 0.35, A.E[1] + hy * 0.35]; }
    const s = armSleeve(J);
    const ang = Math.atan2(J.W[1] - J.E[1], J.W[0] - J.E[0]) / RAD;
    const res = { s, J, ang };
    armCache[key] = res;
    return res;
  }
  function arms34(p, id, layer) {
    if (layer === 'back') return '';
    const pose = ARMS[p.arms] ? p.arms : 'rest', A = ARMS[pose];
    const key = p.light.key < 0 ? -1 : 1;
    const hx = p.hand.x || 0, hy = p.hand.y || 0;
    const far = armOf(pose, 'far'), near = armOf(pose, 'near', hx, hy);
    const SF = sleeve(`${id}slfar`, { ...far.s, rim: { colour: p.light.tint, op: 0.4 * p.light.rim } }, key), SN = sleeve(`${id}slnear`, near.s, key);
    const handOf = (arm, part) => {
      const h = A[part].hand;
      if (!h) return '';
      const kind = h.kind === 'mouse' && p.hand.click > 0.5 ? 'mouseDown' : h.kind;
      const rot = (h.flip ? arm.ang + 180 : arm.ang) + h.rot;
      return handShape(arm.J.W[0], arm.J.W[1], rot, kind, id, { scale: HAND_SCALE, flip: !!h.flip, key });
    };
    // his far arm, behind his body; when his arms are folded its forearm crosses in front, so the
    // sleeve is split by a line across the elbow: the upper arm behind, the forearm in front
    let out = `<clipPath id="${id}farc"><path d="${FAR_CLIP}"/></clipPath>`;
    let farArm = `<g clip-path="url(#${id}farc)">${SF.body}${handOf(far, 'far')}${SF.cuff}</g>`;
    let farFore = '', nearHand = '';
    if (A.far.cross) {
      // the split runs from the crease inside his elbow through the joint, so the forearm comes out
      // in front with its own edges whole
      const { E, W } = far.J, X = far.s.crease, c = [E[0] - X[0], E[1] - X[1]], cl = Math.hypot(c[0], c[1]), ch = [c[0] / cl, c[1] / cl];
      const f = [W[0] - E[0], W[1] - E[1]], L = Math.hypot(f[0], f[1]), t = [f[0] / L, f[1] / L], nn = [-t[1], t[0]];
      const a = [X[0] - ch[0] * 1500, X[1] - ch[1] * 1500], b = [E[0] + ch[0] * 1500, E[1] + ch[1] * 1500];
      const q = (P, k) => xy([P[0] + t[0] * k, P[1] + t[1] * k]);
      out += `<clipPath id="${id}farup"><path d="M ${xy(a)} L ${xy(b)} L ${q(b, -3000)} L ${q(a, -3000)} Z"/></clipPath>
        <clipPath id="${id}farfo"><path d="M ${xy(a)} L ${xy(b)} L ${q(b, L + 120)} L ${q(a, L + 120)} Z"/></clipPath>`;
      farArm = `<g clip-path="url(#${id}farc)"><g clip-path="url(#${id}farup)">${SF.body}</g></g>`;
      // his hands tucked: the near one under his far arm (out of sight past the edge of his chest, the
      // line of which is drawn again over it), the far one behind his near elbow
      farFore = `<g clip-path="url(#${id}farfo)">${SF.body}</g>${handOf(far, 'far')}${SF.cuff}`;
      const contour = sample(TORSO_FAR, 10).filter((q) => q[1] > 232 && q[1] < 404);
      nearHand = `<g clip-path="url(#${id}topclip)">${handOf(near, 'near')}</g>${ink(contour, 2.2, C.lineCloth, [0.15, 0.15], 0.88)}`;
    }
    let mouse = '';
    if (A.near.mouse) {
      // the mouse: a low dome under his palm, its side showing below his hand, the screen's light
      // along its top, its shadow on the desk
      const W = near.J.W, m = [W[0] + 86, W[1] + 24];
      const dome = `M ${n(m[0] - 54)} ${n(m[1] + 8)} C ${n(m[0] - 56)} ${n(m[1] - 14)}, ${n(m[0] - 20)} ${n(m[1] - 24)}, ${n(m[0] + 14)} ${n(m[1] - 22)} C ${n(m[0] + 44)} ${n(m[1] - 20)}, ${n(m[0] + 58)} ${n(m[1] - 8)}, ${n(m[0] + 56)} ${n(m[1] + 6)} C ${n(m[0] + 54)} ${n(m[1] + 18)}, ${n(m[0] - 52)} ${n(m[1] + 22)}, ${n(m[0] - 54)} ${n(m[1] + 8)} Z`;
      mouse = `<ellipse cx="${n(m[0] + 2)}" cy="${n(m[1] + 18)}" rx="60" ry="9" fill="#000" opacity="0.45" filter="url(#${id}soft)"/>
        <path d="${dome}" fill="#1D1D21" stroke="#0A0A0C" stroke-width="2"/>
        <path d="M ${n(m[0] - 50)} ${n(m[1] + 10)} C ${n(m[0] - 20)} ${n(m[1] + 16)}, ${n(m[0] + 30)} ${n(m[1] + 14)}, ${n(m[0] + 52)} ${n(m[1] + 6)}" fill="none" stroke="#2C2C32" stroke-width="3" opacity="0.8"/>
        <path d="M ${n(m[0] - 30)} ${n(m[1] - 17)} C ${n(m[0] - 6)} ${n(m[1] - 23)}, ${n(m[0] + 30)} ${n(m[1] - 21)}, ${n(m[0] + 50)} ${n(m[1] - 9)}" fill="none" stroke="${p.light.tint}" stroke-width="2.4" opacity="${n(0.5 * p.light.rim)}"/>`;
    }
    // the phone, its back to us, lying in his palm: the back of his hand over its lower half, his
    // fingers across it and round its far edge, out of sight past it
    let phone = '', phoneClip = '';
    if (A.near.phone) {
      const place = 'translate(88 300) rotate(-14) scale(1.26)';
      phone = `<g transform="${place}"><rect x="-25" y="-52" width="50" height="100" rx="9" fill="#18181B" stroke="#3A3A3E" stroke-width="2.2"/>
          <rect x="-17" y="-44" width="16" height="22" rx="5" fill="#0C0C0E"/><circle cx="-9" cy="-38" r="3.6" fill="#2A2A31"/><circle cx="-9" cy="-28" r="3.6" fill="#2A2A31"/>
          <path d="M 23 -44 L 23 40" stroke="${p.light.tint}" stroke-width="2" opacity="0.35"/></g>`;
      phoneClip = `<clipPath id="${id}phc"><rect x="-500" y="-500" width="${500 + 24}" height="1000" transform="${place}"/></clipPath>`;
    }
    if (A.far.cross) {
      // arms folded: his near forearm on top, in front; his far forearm below it, nearer his body
      out += `${farArm}${farFore}${SN.body}${nearHand}${SN.cuff}`;
    } else {
      const nh = A.near.phone ? `${phoneClip}<g clip-path="url(#${id}phc)">${handOf(near, 'near')}</g>` : handOf(near, 'near');
      out += `${farArm}${phone}${mouse}${SN.body}${nh}${SN.cuff}`;
    }
    return out;
  }

  // ------------------------------------------------------------ hands
  // A hand drawn from its skeleton, to real proportions: a palm and five fingers, each finger a chain
  // of three bones with an angle at every joint. Each finger is one smooth shape that follows its
  // bones, a touch wider over each joint than along the bone, rounding off at the tip; the fingers
  // have the wrinkles over their joints and real nails, and the back of the hand its knuckles and the
  // tendons running to them. Everything is first drawn a little larger in the line colour, so the
  // hand has one fine outline; then the fingers are filled back to front with a finer line where one
  // lies over the next, the palm over their roots, the thumb over the palm. The light falls from the
  // side it comes from in the shot. Five fingers, always.
  // Hand space: the wrist at 0,0, the fingers towards +x, the thumb on the -y side; head units.
  const HAND = {
    palm: [[0, -15.5], [14, -19.5], [30, -21.5], [44, -21], [51.5, -18], [54.5, -9], [55, 2], [52.5, 12.5], [47.5, 19], [36, 21], [20, 19.5], [8, 17], [0, 15.5]],
    base: { index: [50.5, -14], middle: [53, -4.4], ring: [51.5, 5.4], little: [47, 14.2], thumb: [8, -12.5] },
    lens: { index: [20.8, 12.4, 9], middle: [23, 14, 9.8], ring: [21.6, 13.4, 9.4], little: [16.8, 10, 8.4], thumb: [19, 14.5, 12] },
    w: { index: 11, middle: 11.5, ring: 10.7, little: 9.4, thumb: 11.2 },
  };
  const rad = (a) => a * Math.PI / 180;
  const SKIN = { nail: '#EDBCA9', nailEdge: '#F5DCCF', nailMoon: '#F2CDBE', crease: '#B07058' };
  // One finger (or the thumb) as a closed outline along its bones P (knuckle, two joints, tip), w
  // wide at the knuckle. Returns the outline and, for each joint, where it is and which way it runs.
  function fingerOutline(P, w, thumb = false) {
    const S = sample(P, 8), L = [0];
    for (let i = 1; i < S.length; i++) L.push(L[i - 1] + Math.hypot(S[i][0] - S[i - 1][0], S[i][1] - S[i - 1][1]));
    const tot = L[L.length - 1] || 1, seg = [0];
    for (let i = 1; i < P.length; i++) seg.push(seg[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const J1 = seg[1] / seg[3], J2 = seg[2] / seg[3];
    const prof = thumb
      ? [[0, 1.25], [J1 / 2, 1.08], [J1, 0.98], [(J1 + J2) / 2, 0.9], [J2, 0.9], [(J2 + 1) / 2, 0.84], [1, 0.8]]
      : [[0, 1], [J1 / 2, 0.93], [J1, 0.96], [(J1 + J2) / 2, 0.875], [J2, 0.885], [(J2 + 1) / 2, 0.845], [1, 0.82]];
    const wAt = (u) => {
      for (let i = 1; i < prof.length; i++) if (u <= prof[i][0]) { const [a, wa] = prof[i - 1], [b, wb] = prof[i]; return w * (wa + (wb - wa) * (u - a) / ((b - a) || 1)); }
      return w * 0.82;
    };
    const left = [], right = [], dir = [];
    S.forEach((p, i) => {
      const q0 = S[Math.max(0, i - 1)], q1 = S[Math.min(S.length - 1, i + 1)];
      let dx = q1[0] - q0[0], dy = q1[1] - q0[1];
      const l = Math.hypot(dx, dy) || 1;
      dx /= l; dy /= l;
      const h = wAt(L[i] / tot) / 2;
      left.push([p[0] - dy * h, p[1] + dx * h]);
      right.push([p[0] + dy * h, p[1] - dx * h]);
      dir.push([dx, dy]);
    });
    // the tip: rounded, a little squared off where the nail ends
    const end = S[S.length - 1], [dx, dy] = dir[dir.length - 1], h = wAt(1) / 2, cap = [];
    for (let k = 1; k < 12; k++) {
      const t = Math.PI / 2 - (k / 12) * Math.PI;
      const along = Math.pow(Math.max(0, Math.cos(t)), 0.7) * h * 1.04, across = Math.sin(t) * h;
      cap.push([end[0] + dx * along - dy * across, end[1] + dy * along + dx * across]);
    }
    const k1 = L.findIndex((v) => v / tot >= J1);
    return { outline: [...left, ...cap, ...right.slice().reverse()], left, right, cap, k1, S, dir, w: wAt };
  }
  // pose: { index: [a1, a2, a3] (degrees, absolute), ..., thumb: [a1, a2, a3], len: { index: k } (foreshortening),
  //         hide: ['little'] (left out), front: ['thumb'] (drawn over the palm), nails: true }
  // opt: { lw, sep (line widths), id, openWrist (no line across the wrist), rim (colour of a rim of
  //        light along the top), light: [x, y] (towards the light, in hand space) }
  function handSVG(pose, opt = {}) {
    const lw = opt.lw ?? 1.2, sep = opt.sep ?? 0.7, cid = `hp${(opt.id || 'h')}${Math.round(Math.random() * 1e6)}`;
    const skin = opt.skin || C.skin, line = opt.line || C.line;
    const light = opt.light ? opt.light : [0.6, -0.8];
    const names = ['little', 'ring', 'middle', 'index', 'thumb'].filter((f) => pose[f] && !(pose.hide || []).includes(f));
    const chain = {}, shape = {};
    for (const f of names) {
      const k = (pose.len && pose.len[f]) || 1, ks = Array.isArray(k) ? k : [k, k, k];
      let [x, y] = (pose.basePos && pose.basePos[f]) || HAND.base[f];
      const pts = [[x, y]];
      pose[f].forEach((a, i) => { x += Math.cos(rad(a)) * HAND.lens[f][i] * ks[i]; y += Math.sin(rad(a)) * HAND.lens[f][i] * ks[i]; pts.push([x, y]); });
      chain[f] = pts;
      shape[f] = fingerOutline(pts, HAND.w[f], f === 'thumb');
    }
    const palmPts = pose.palmPts || HAND.palm;
    const palmD = smooth(palmPts, true), hasPalm = pose.palm !== false;
    const front = names.filter((f) => (pose.front || []).includes(f)), backs = names.filter((f) => !front.includes(f));
    const P = (q) => `M ${q.map(xy).join(' L ')} Z`;
    const lit = (d) => (-d[1] * light[0] + d[0] * light[1] > 0 ? 1 : -1);      // which side of a bone faces the light
    // the shade and light down each finger, the wrinkles over its joints, the nail, inside its outline
    const detail = (f) => {
      const F = shape[f], ch = chain[f], s = F.S;
      const mid = Math.floor(s.length / 2), side = lit(F.dir[mid]);
      const along = (o, a, b) => s.slice(a, b).map((p, i) => { const d = F.dir[a + i], hw = F.w(0.5) * o; return [p[0] - d[1] * hw * side, p[1] + d[0] * hw * side]; });
      let out = `<clipPath id="${cid}${f}"><path d="${P(F.outline)}"/></clipPath><g clip-path="url(#${cid}${f})">`;
      out += ink(along(-0.36, f === 'thumb' ? F.k1 : 1, s.length), HAND.w[f] * 0.5, C.skinShade, [0.15, 0.15], 0.55, ` filter="url(#${cid}b)"`);
      out += ink(along(0.3, f === 'thumb' ? F.k1 : 2, s.length - 2), HAND.w[f] * 0.2, C.skinHi, [0.3, 0.3], 0.5, ` filter="url(#${cid}b)"`);
      if (pose.creases && f === 'thumb') {
        const a = ch[1], b = ch[3], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, hw = HAND.w[f] * 0.26, c = ch[2];
        out += `<path d="M ${xy([c[0] - uy * hw, c[1] + ux * hw])} Q ${xy([c[0] + ux * 1.6, c[1] + uy * 1.6])} ${xy([c[0] + uy * hw, c[1] - ux * hw])}" fill="none" stroke="${SKIN.crease}" stroke-width="${n(lw * 0.42)}" stroke-linecap="round" opacity="0.32"/>`;
      }
      if (pose.creases && f !== 'thumb') {
        // over the middle joint: three short wrinkles; over the last joint: two
        [[1, [-0.9, 0.9], 0.27, [0.28, 0.36]], [2, [0.2], 0.2, [0.26]]].forEach(([j, offs, span, ops]) => {
          const a = ch[j - 1], b = ch[j + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
          const hw = HAND.w[f] * span;
          offs.forEach((o, i) => {
            const c = [ch[j][0] + ux * o, ch[j][1] + uy * o];
            const bow = 1.6 + i * 0.5, hw2 = hw * (i % 2 ? 0.8 : 1);
            out += `<path d="M ${xy([c[0] - uy * hw2 - ux * 0.4, c[1] + ux * hw2 - uy * 0.4])} Q ${xy([c[0] + ux * bow, c[1] + uy * bow])} ${xy([c[0] + uy * hw2 * 0.9 - ux * 0.2, c[1] - ux * hw2 * 0.9 - uy * 0.2])}" fill="none" stroke="${SKIN.crease}" stroke-width="${n(lw * 0.42)}" stroke-linecap="round" opacity="${ops[i]}"/>`;
          });
        });
        // a little light on the middle knuckle
        out += `<ellipse cx="${n(ch[1][0])}" cy="${n(ch[1][1])}" rx="${n(HAND.w[f] * 0.32)}" ry="${n(HAND.w[f] * 0.22)}" fill="${C.skinHi}" opacity="0.35" filter="url(#${cid}b)"/>`;
      }
      if (pose.nails && (f !== 'thumb' || pose.thumbNail)) {
        const a = ch[2], b = ch[3], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
        const ang = Math.atan2(dy, dx) * 180 / Math.PI, len = L * 0.62, wid = F.w(1) * (f === 'thumb' ? 0.46 : 0.66);   // the thumb's nail is seen from the side
        const cx = a[0] + dx / L * (L * 0.66), cy = a[1] + dy / L * (L * 0.66);
        out += `<g transform="translate(${n(cx)} ${n(cy)}) rotate(${n(ang)})">
          <rect x="${n(-len / 2)}" y="${n(-wid / 2)}" width="${n(len)}" height="${n(wid)}" rx="${n(wid * 0.46)}" fill="${SKIN.nail}" stroke="${C.skinShade}" stroke-width="${n(lw * 0.36)}" stroke-opacity="0.8"/>
          <rect x="${n(len * 0.3)}" y="${n(-wid / 2 + 0.3)}" width="${n(len * 0.2)}" height="${n(wid - 0.6)}" rx="${n(wid * 0.4)}" fill="${SKIN.nailEdge}" opacity="0.85"/>
          <ellipse cx="${n(-len * 0.34)}" cy="0" rx="${n(len * 0.12)}" ry="${n(wid * 0.3)}" fill="${SKIN.nailMoon}" opacity="0.8"/>
          <ellipse cx="${n(-len * 0.06)}" cy="${n(-wid * 0.2 * side)}" rx="${n(len * 0.2)}" ry="${n(wid * 0.09)}" fill="#fff" opacity="0.35"/>
          <path d="M ${n(-len / 2 - 0.4)} ${n(-wid * 0.42)} Q ${n(-len / 2 - 1.3)} 0 ${n(-len / 2 - 0.4)} ${n(wid * 0.42)}" fill="none" stroke="${C.skinShade}" stroke-width="${n(lw * 0.45)}" opacity="0.6"/></g>`;
      }
      return out + '</g>';
    };
    // the back of the hand: shade towards the edge away from the light and the wrist, the knuckles,
    // and the tendons running from them towards the wrist
    const palmDetail = () => {
      if (!hasPalm) return '';
      const sideY = light[1] > 0 ? -1 : 1;
      const knuck = ['index', 'middle', 'ring', 'little'].filter((f) => chain[f] && pose.knuckles !== false);
      return `<clipPath id="${cid}p"><path d="${palmD}"/></clipPath><g clip-path="url(#${cid}p)">
        ${ink([[2, 18 * sideY], [24, 21 * sideY], [46, 18 * sideY]], 12, C.skinShade, [0.2, 0.2], 0.45, ` filter="url(#${cid}b2)"`)}
        ${ink([[0, -14], [0, 0], [0, 14]], 10, C.skinShade, [0.2, 0.2], 0.3, ` filter="url(#${cid}b2)"`)}
        ${knuck.map((f) => { const b = HAND.base[f]; return ink([[b[0] - 6, b[1] * 0.96], [26, b[1] * 0.62], [10, b[1] * 0.4]], 2.6, C.skinHi, [0.3, 0.6], 0.18, ` filter="url(#${cid}b2)"`); }).join('')}
        ${knuck.map((f) => { const b = chain[f][0]; return `<ellipse cx="${n(b[0] - 1.5)}" cy="${n(b[1])}" rx="3.4" ry="2.7" fill="${C.skinHi}" opacity="0.26" filter="url(#${cid}b)"/>`; }).join('')}
        ${knuck.slice(1).map((f, i) => { const a = chain[knuck[i]][0], b = chain[f][0]; return `<ellipse cx="${n((a[0] + b[0]) / 2 - 5)}" cy="${n((a[1] + b[1]) / 2)}" rx="5" ry="1.2" fill="${C.skinShade}" opacity="0.14" filter="url(#${cid}b)"/>`; }).join('')}
      </g>`;
    };
    const fill = (f, withSep) => `${withSep ? (f === 'thumb'
      ? `<path d="M ${[...shape[f].left.slice(shape[f].k1), ...shape[f].cap, ...shape[f].right.slice(shape[f].k1).reverse()].map(xy).join(' L ')}" fill="none" stroke="${line}" stroke-width="${n(sep * 2)}" opacity="0.8"/>`
      : `<path d="${P(shape[f].outline)}" fill="none" stroke="${line}" stroke-width="${n(sep * 2)}" opacity="0.75"/>`) : ''}
      <path d="${P(shape[f].outline)}" fill="${skin}"/>${detail(f)}`;
    return `
      <defs><filter color-interpolation-filters="sRGB" id="${cid}b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.1"/></filter>
        <filter color-interpolation-filters="sRGB" id="${cid}b2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.6"/></filter></defs>
      <g stroke-linejoin="round">
        ${hasPalm ? (opt.openWrist ? `<path d="${smooth(palmPts)}" fill="none" stroke="${line}" stroke-width="${n(lw * 2)}"/>` : `<path d="${palmD}" fill="${line}" stroke="${line}" stroke-width="${n(lw * 2)}"/>`) : ''}
        ${names.map((f) => `<path d="${P(shape[f].outline)}" fill="${line}" stroke="${line}" stroke-width="${n(lw * 2)}"/>`).join('')}
        ${backs.map((f) => fill(f, true)).join('')}
        ${hasPalm ? `<path d="${palmD}" fill="${skin}"/>${palmDetail()}` : ''}
        ${opt.rim ? `<path d="${smooth(palmPts.slice(0, 5))}" fill="none" stroke="${opt.rim}" stroke-width="${n(lw * 1.4)}" stroke-linecap="round" opacity="0.4" clip-path="url(#${cid}p)"/>` : ''}
        ${front.map((f) => fill(f, true)).join('')}
      </g>`;
  }
  // The poses he uses. Angles in degrees in hand space; a positive angle turns towards the little
  // finger, which is how fingers look as they curl when the back of the hand faces us.
  const HANDS = {
    // hanging relaxed at his side, the back of the hand out, the thumb in front
    hang: { index: [-2, 9, 20], middle: [1, 12, 24], ring: [4.5, 15.5, 28], little: [8, 19.5, 34], thumb: [-36, -14, 0],
      len: { index: [1, 0.92, 0.88], middle: [1, 0.9, 0.86], ring: [1, 0.88, 0.84], little: [1, 0.88, 0.82] }, nails: true, creases: true, front: ['thumb'], thumbNail: true },
    // on the mouse: index and middle forward on the buttons, ring and little curled at its side
    mouse: { index: [-5, 2, 10], middle: [0, 4, 12], ring: [6, 14, 30], little: [13, 24, 42], thumb: [-34, -8, 2],
      len: { index: [1, 0.97, 0.9], middle: [1, 0.97, 0.9], ring: [1, 0.88, 0.78], little: [1, 0.84, 0.72] }, nails: true, creases: true, front: ['thumb'], thumbNail: true },
    // on the keys, fingers curled down onto them
    keys: { index: [-4, 20, 46], middle: [0, 24, 52], ring: [5, 28, 56], little: [11, 33, 60], thumb: [-30, -2, 8],
      len: { index: [1, 0.74, 0.6], middle: [1, 0.74, 0.6], ring: [1, 0.74, 0.6], little: [1, 0.74, 0.6] }, nails: false, creases: true, front: ['thumb'] },
    // holding the phone: fingers wrapped round its back, only their tips show past its edge (drawn
    // under the phone), the thumb over the front
    phone: { index: [-10, -60, -110], middle: [-4, -58, -108], ring: [4, -52, -100], little: [12, -44, -90], thumb: [-60, -40, -24],
      len: { index: [1, 0.8, 0.7], middle: [1, 0.8, 0.7], ring: [1, 0.8, 0.7], little: [1, 0.8, 0.7] }, nails: false, creases: false, front: ['thumb'], thumbNail: true },
    // gripping the other arm when his arms are folded: the back of the hand on it, the fingers
    // curling round its far side, the thumb tucked out of sight
    grip: { index: [-6, 10, 26], middle: [-2, 12, 28], ring: [4, 15, 30], little: [10, 18, 34], thumb: [-40, -10, 10], hide: ['thumb'],
      len: { index: [1, 0.64, 0.34], middle: [1, 0.64, 0.34], ring: [1, 0.64, 0.34], little: [1, 0.62, 0.32] }, nails: false, creases: true },
    // holding the phone from behind: the back of the hand on the phone's back, the fingers across it,
    // their tips curling round its far edge, the thumb on the screen side out of sight
    phoneBack: { index: [36, 44, 74], middle: [40, 47, 78], ring: [44, 50, 82], little: [50, 56, 86], thumb: [-40, -10, 10], hide: ['thumb'],
      len: { index: [1, 0.95, 0.8], middle: [1, 0.95, 0.8], ring: [1, 0.95, 0.8], little: [1, 0.95, 0.8] }, nails: true, creases: true },
  };
  // A hand placed in the body's drawing: its wrist at x, y, turned rot degrees, flipped for a left
  // hand. The wrist always goes into a cuff, so it has no line across it. key is the side the screen's
  // light comes from (1 right, -1 left).
  function handShape(x, y, rot, kind, id, o = {}) {
    const P = { ...HANDS[kind === 'mouseDown' ? 'mouse' : kind] };
    if (kind === 'mouseDown') P.index = [-5, 9, 22];
    if (o.only) { P.hide = ['index', 'middle', 'ring', 'little', 'thumb'].filter((f) => !o.only.includes(f)); P.palm = o.only.includes('palm') ? P.palm : false; }
    if (o.hide) P.hide = [...(P.hide || []), ...o.hide];
    const r = rad(rot), Lx = 0.75 * (o.key || 1), Ly = -0.66;
    let lx = Lx * Math.cos(r) + Ly * Math.sin(r), ly = -Lx * Math.sin(r) + Ly * Math.cos(r);
    if (o.flip) lx = -lx;
    const s = o.scale || 1;
    return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)}) scale(${n(o.flip ? -s : s)} ${n(s)})">${handSVG(P, { id, openWrist: true, light: [lx, ly] })}</g>`;
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
  // The crewneck from behind: his trapezius sloping from his neck to round deltoids, his arms down
  // his sides, his back broad under them and narrowing to the waist; the collar's back standing up
  // round his neck with the chain lying on it, his back in shade with the screen's light round its
  // edges.
  const BACK_EDGE = [[-104, 152], [-136, 162], [-166, 179], [-193, 197], [-212, 220], [-220, 250], [-220, 290], [-214, 340], [-206, 390], [-193, 440], [-180, 500], [-172, 580]];
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
    const edgeL = [L0, ...BACK_EDGE], edgeR = edgeL.map(([x, y]) => [-x, y]);
    const BACK_TOP = `${smooth(edgeL)} L ${xy(edgeR[edgeR.length - 1])} ${smooth(edgeR.slice().reverse()).replace(/^M [-\d.]+ [-\d.]+/, '')} L ${rimArc.slice(1).map(xy).join(' L ')} Z`;
    return `
      <clipPath id="${id}btop"><path d="${BACK_TOP}"/></clipPath>
      <path d="${BACK_TOP}" fill="${C.top}"/>
      <g clip-path="url(#${id}btop)">
        ${blob([[-160, 300], [-60, 290], [0, 320], [60, 290], [160, 300], [150, 620], [-150, 620]], C.topDark, 0.55, ` filter="url(#${id}soft2)"`)}
        ${ink(off(edgeL.slice(1, 7), 4, 9), 13, C.topHi, [0.3, 0.3], 0.3, ` filter="url(#${id}soft)"`)}${ink(off(edgeR.slice(1, 7), -4, 9), 13, C.topHi, [0.3, 0.3], 0.3, ` filter="url(#${id}soft)"`)}
        ${blob([[-130, 214], [-60, 212], [-40, 260], [-70, 300], [-126, 290]], C.topHi, 0.12, ` filter="url(#${id}soft2)"`)}${blob([[130, 214], [60, 212], [40, 260], [70, 300], [126, 290]], C.topHi, 0.12, ` filter="url(#${id}soft2)"`)}
        ${ink(off(edgeL.slice(5), 3, 0), 6, tint, [0.2, 0.3], 0.3 * rim, ` filter="url(#${id}softer)"`)}${ink(off(edgeR.slice(5), -3, 0), 6, tint, [0.2, 0.3], 0.3 * rim, ` filter="url(#${id}softer)"`)}
        ${ink([[-160, 262], [-164, 330], [-172, 410]], 3, C.topDark, [0.3, 0.4], 0.5)}${ink([[160, 262], [164, 330], [172, 410]], 3, C.topDark, [0.3, 0.4], 0.5)}
        ${ink([[-156, 266], [-159, 320]], 1.4, C.topHi, [0.3, 0.4], 0.25)}${ink([[156, 266], [159, 320]], 1.4, C.topHi, [0.3, 0.4], 0.25)}
        ${ink([[-120, 330], [-80, 342], [-40, 336]], 10, C.topDark, [0.3, 0.3], 0.3, ` filter="url(#${id}soft)"`)}${ink([[120, 330], [80, 342], [40, 336]], 10, C.topDark, [0.3, 0.3], 0.3, ` filter="url(#${id}soft)"`)}
        ${ink([[0, 214], [-1, 300], [0, 400], [2, 540]], 6, C.topDark, [0.3, 0.3], 0.3, ` filter="url(#${id}soft)"`)}
      </g>
      <path d="${smooth([[-166, 179], [-150, 222], [-148, 262]])}" fill="none" stroke="${C.stitchTop}" stroke-width="1" stroke-dasharray="3 2.5"/>
      <path d="${smooth([[166, 179], [150, 222], [148, 262]])}" fill="none" stroke="${C.stitchTop}" stroke-width="1" stroke-dasharray="3 2.5"/>
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

  window.Founder = { pose, blendPose, founderSVG, handSVG, HANDS, HAND_SCALE, sleeveSVG: sleeve, colours: C };
})();
