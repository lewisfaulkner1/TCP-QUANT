// The trading emotions: FOMO, REVENGE, GREED, FEAR and PATIENCE, the founder's recurring cast. Each
// is a candlestick come to life: a candle's body, its wick for hair, rubber-hose arms and legs, white
// cartoon gloves and trainers. FOMO is a green candle that can't sit still, REVENGE a red one in
// boxing gloves, GREED a fat purple one in a top hat with dollars for eyes, FEAR a small pale doji
// that sweats, and PATIENCE a short gold one with the crown on its chest, a lit wick and a cup of
// tea: the TCP one. They're made up, drawn in code with the founder's ink and light, so they're the
// same in every shot.
//
//   Cast.svg(who, pose, t, id)   one of them at the origin (between its feet, on the ground), facing us
//   Cast.at(track, t)            a track [{ t, x, y, s, pose, ease }] blended at t: { x, y, s, pose }
//   Cast.place(who, track, t, id)  the same, drawn where the track puts it
//   Cast.WHO                     their names, colours and builds
//
// A pose: { arms, legs, face (1 or -1: the way it turns), lean, squash, hop, shake, look: [x, y], lid,
// brow: { raise, angry, worry }, mouth: { smile, open, teeth, wavy }, card, screen }. Arms: down,
// point, pull, phone, guard, punch, grab, rub, hug, tea, shrug, up, sign, hips, wave. Legs: stand,
// walk, run, sit, tuck. Blinks and breathing are added.
//
// It also adds a speech-bubble kind for them: { kind: 'bubble', who, text, x, y, tail, size }.
(function () {
  const n = (v) => Math.round(v * 100) / 100;
  const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const mix = (a, b, k) => a + (b - a) * k;
  const INK = '#1A120C', WHITE = '#FFFDF6', GLOVE_SHADE = '#DCD6CA';
  const LEG = 46;

  const WHO = {
    fomo: { name: 'FOMO', body: '#2FB98A', dark: '#1B7C5C', lite: '#8BE8C6', limb: '#145C45', W: 108, H: 164, r: 18, wick: 'spark', eyes: 'wide', shoe: '#F3EFE6', sole: '#2FB98A', tag: '#2FB98A' },
    revenge: { name: 'REVENGE', body: '#E0613F', dark: '#A23E26', lite: '#F8A98C', limb: '#7A2817', W: 124, H: 146, r: 16, wick: 'smoke', eyes: 'angry', shoe: '#2A1C16', sole: '#E0613F', gloves: '#8E1F14', band: '#F3EFE6', tag: '#E0613F' },
    greed: { name: 'GREED', body: '#8A5CF0', dark: '#5A36B4', lite: '#C2A8FF', limb: '#3D2286', W: 150, H: 138, r: 34, wick: 'plain', eyes: 'dollar', shoe: '#F3EFE6', sole: '#8A5CF0', hat: true, tag: '#8A5CF0' },
    fear: { name: 'FEAR', body: '#9CCBF2', dark: '#5F90BE', lite: '#DDEEFF', limb: '#3C6A94', W: 86, H: 114, r: 16, wick: 'droop', eyes: 'worried', shoe: '#F3EFE6', sole: '#5F90BE', sweat: true, tag: '#5F90BE' },
    patience: { name: 'PATIENCE', body: '#D8AD4E', dark: '#9C7226', lite: '#F6E3A3', limb: '#6B4A17', W: 128, H: 118, r: 24, wick: 'flame', eyes: 'calm', shoe: '#2A1C16', sole: '#D8AD4E', badge: true, tag: '#D8AD4E' },
  };

  const BASE = { arms: 'down', legs: 'stand', face: 1, lean: 0, squash: 0, hop: 0, shake: 0, look: [0, 0], lid: 0, brow: { raise: 0, angry: 0, worry: 0 }, mouth: { smile: 0.25, open: 0, teeth: 0, wavy: 0 }, card: '', screen: '' };
  const DEFAULTS = {
    fomo: { brow: { raise: 0.6 }, mouth: { smile: 0.6, open: 0.25, teeth: 1 }, shake: 0.35 },
    revenge: { brow: { angry: 1 }, mouth: { smile: -0.5, open: 0.12, teeth: 1 }, arms: 'guard' },
    greed: { lid: 0.18, mouth: { smile: 0.7, teeth: 1 }, arms: 'rub' },
    fear: { brow: { worry: 1 }, mouth: { wavy: 1, smile: -0.2 }, shake: 0.5, arms: 'hug' },
    patience: { lid: 0.48, mouth: { smile: 0.35 }, arms: 'tea' },
  };
  function pose(who, p = {}) {
    const d = DEFAULTS[who] || {};
    return {
      ...BASE, ...d, ...p,
      brow: { ...BASE.brow, ...(d.brow || {}), ...(p.brow || {}) },
      mouth: { ...BASE.mouth, ...(d.mouth || {}), ...(p.mouth || {}) },
      look: p.look || d.look || BASE.look,
    };
  }

  // ------------------------------------------------------------ pieces
  const rrect = (x0, y0, x1, y1, r) => `M ${n(x0 + r)} ${n(y0)} H ${n(x1 - r)} Q ${n(x1)} ${n(y0)} ${n(x1)} ${n(y0 + r)} V ${n(y1 - r)} Q ${n(x1)} ${n(y1)} ${n(x1 - r)} ${n(y1)} H ${n(x0 + r)} Q ${n(x0)} ${n(y1)} ${n(x0)} ${n(y1 - r)} V ${n(y0 + r)} Q ${n(x0)} ${n(y0)} ${n(x0 + r)} ${n(y0)} Z`;
  const line = (d, w, col = INK, extra = '') => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
  const limb = (d, c) => `${line(d, 13)}${line(d, 6.5, c.limb)}`;

  // A white cartoon glove at (x, y) pointing at angle a (degrees): open (a mitten, the thumb out),
  // fist, point or hold. side: which side of the body it's on, for the thumb.
  function glove(x, y, a, kind, side) {
    const cuff = `<rect x="-23" y="-9.5" width="12" height="19" rx="4.5" fill="${WHITE}" stroke="${INK}" stroke-width="3.4"/><path d="M -17 -8 V 8" stroke="${GLOVE_SHADE}" stroke-width="2.4"/>`;
    const thumb = (ty) => `<ellipse cx="-1" cy="${ty}" rx="6.5" ry="8.5" transform="rotate(${ty < 0 ? -30 : 30} -1 ${ty})" fill="${WHITE}" stroke="${INK}" stroke-width="3.2"/>`;
    const ty = side < 0 ? 11 : -11;
    let inner;
    if (kind === 'open') {
      inner = `${thumb(ty)}<path d="M -12 -11 C -5 -17, 12 -15, 17 -8 C 21 -2, 21 4, 17 9 C 12 15, -5 17, -12 11 C -15 5, -15 -5, -12 -11 Z" fill="${WHITE}" stroke="${INK}" stroke-width="3.4"/>
        ${line('M 11 -6 L 18 -5', 2.4)}${line('M 12 2 L 19 3', 2.4)}${line('M -6 -8 Q -1 0 -6 8', 2.2, GLOVE_SHADE)}`;
    } else if (kind === 'point') {
      inner = `<rect x="2" y="-5" width="27" height="10" rx="5" fill="${WHITE}" stroke="${INK}" stroke-width="3.2"/>${thumb(ty)}
        <circle cx="0" cy="0" r="12.5" fill="${WHITE}" stroke="${INK}" stroke-width="3.4"/>${line('M 5 -6 Q 9 -2 5 3', 2.4)}`;
    } else {
      inner = `${thumb(ty * 0.8)}<circle cx="0" cy="0" r="13" fill="${WHITE}" stroke="${INK}" stroke-width="3.4"/>
        ${line('M 6 -8 Q 11 -5 11 -1', 2.4)}${line('M 6 1 Q 11 3 10 8', 2.4)}`;
    }
    return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(a)}) scale(1.12)">${cuff}${inner}</g>`;
  }
  // A boxing glove.
  function boxing(x, y, a, col) {
    return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(a)})">
      <rect x="-30" y="-11" width="16" height="22" rx="5" fill="${WHITE}" stroke="${INK}" stroke-width="3.4"/>
      <path d="M -16 -15 C -10 -26, 18 -27, 23 -10 C 27 2, 22 19, 4 20 C -8 21, -16 14, -16 4 Z" fill="${col}" stroke="${INK}" stroke-width="3.6"/>
      <path d="M -12 2 C -18 10, -10 18, -2 14" fill="none" stroke="${INK}" stroke-width="3"/>
      <path d="M -6 -18 C 2 -22, 12 -21, 18 -14" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity="0.45"/></g>`;
  }
  // A trainer, its toe pointing the way (1 or -1).
  function shoe(x, y, dir, c) {
    return `<g transform="translate(${n(x)} ${n(y)}) scale(${dir} 1)">
      <path d="M -13 -13 C -5 -19, 12 -17, 19 -8 C 23 -3, 21 2, 13 2 L -12 2 C -17 2, -18 -9, -13 -13 Z" fill="${c.shoe}" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>
      <path d="M -14 -2 L 20 -2" stroke="${c.sole}" stroke-width="4" stroke-linecap="round"/>
      <path d="M -3 -14 L 3 -8 M 3 -15 L 8 -9" stroke="${INK}" stroke-width="2" stroke-linecap="round" opacity="0.7"/></g>`;
  }
  // The arms' poses: each hand's place from its shoulder ([dx, dy]), the glove and the way it points.
  const ARMS = {
    down: { L: [-14, 54, 'open', 100], R: [14, 54, 'open', 80] },
    hips: { L: [-34, 36, 'fist', 150], R: [34, 36, 'fist', 30] },
    wave: { L: [-14, 54, 'open', 100], R: [40, -58, 'open', -70] },
    point: { L: [-14, 54, 'open', 100], R: [58, -50, 'point', -40] },
    pull: { L: [74, 10, 'fist', 0], R: [70, 18, 'fist', 0] },
    phone: { L: [-14, 54, 'open', 100], R: [56, -44, 'hold', -60] },
    guard: { L: [-16, -40, 'box', -110], R: [16, -40, 'box', -70] },
    punch: { L: [-16, -40, 'box', -110], R: [92, -30, 'box', 0] },
    grab: { L: [-58, -18, 'open', 200], R: [58, -22, 'open', -20] },
    rub: { L: [52, 24, 'open', 20], R: [-50, 26, 'open', 160] },
    hug: { L: [64, 6, 'open', 10], R: [-62, 10, 'open', 170] },
    tea: { L: [36, 24, 'hold', 20], R: [-36, 24, 'hold', 160] },
    shrug: { L: [-52, -12, 'open', 220], R: [52, -12, 'open', -40] },
    up: { L: [-40, -76, 'open', -110], R: [40, -76, 'open', -70] },
    sign: { L: [14, 34, 'hold', 0], R: [-14, 34, 'hold', 180] },
  };

  // ------------------------------------------------------------ one of them
  function svg(who, raw, t = 0, id = 'c') {
    const c = WHO[who], p = raw && raw.__full ? raw : pose(who, raw);
    const { W, H, r } = c;
    const f = p.face < 0 ? -1 : 1;
    // life: breathing, blinks, a shake for the nervous ones
    const breath = Math.sin(t * 2.3 + W) * 0.018;
    const seed = W * 7 + H;
    const bt = (t + (seed % 37) * 0.11) % 3.4, blink = bt < 0.13 ? Math.sin((bt / 0.13) * Math.PI) : 0;
    const lid = Math.max(p.lid, blink);
    const sx = p.shake ? (Math.sin(t * 61 + seed) * 2.6 + Math.sin(t * 37) * 1.4) * p.shake : 0;
    const sy = p.shake ? Math.cos(t * 53 + seed) * 1.6 * p.shake : 0;
    const sq = cl(p.squash + breath, -0.3, 1);
    const sit = p.legs === 'sit', legLen = sit ? 8 : LEG;
    const y1 = -legLen - p.hop, y0 = y1 - H;                   // the body's bottom and top
    const x0 = -W / 2, x1 = W / 2;
    const o = [];
    // the shadow on the ground
    o.push(`<ellipse cx="0" cy="2" rx="${n(W * 0.56)}" ry="10" fill="#000" opacity="${n(0.24 * cl(1 - p.hop / 120))}"/>`);
    const body = [];
    // legs and trainers
    const hipX = W * 0.2;
    let feet;
    if (sit) feet = [[-W * 0.36, -4, -1], [W * 0.36, -4, 1]];
    else if (p.legs === 'tuck') feet = [[-hipX + 2, y1 + 22, -1], [hipX - 2, y1 + 22, 1]];
    else if (p.legs === 'walk' || p.legs === 'run') {
      const sp = p.legs === 'run' ? 15 : 8, amp = p.legs === 'run' ? 20 : 12, ph = t * sp;
      feet = [[-hipX - 4 + Math.sin(ph) * amp * f, -Math.max(0, Math.cos(ph)) * amp * 0.7, -1], [hipX + 4 - Math.sin(ph) * amp * f, -Math.max(0, -Math.cos(ph)) * amp * 0.7, 1]];
    } else feet = [[-hipX - 6, 0, -1], [hipX + 6, 0, 1]];
    if (sit) {
      body.push(limb(`M ${n(-hipX)} ${n(y1 - 4)} C ${n(-hipX)} ${n(y1 + 18)}, ${n(W * 0.3)} ${n(-2)}, ${n(W * 0.36)} -6`, c));
      body.push(limb(`M ${n(hipX)} ${n(y1 - 4)} C ${n(hipX)} ${n(y1 + 18)}, ${n(-W * 0.3)} ${n(-2)}, ${n(-W * 0.36)} -6`, c));
    } else feet.forEach(([fx, fy], i) => {
      const hx = i ? hipX : -hipX;
      body.push(limb(`M ${n(hx)} ${n(y1 - 6)} Q ${n(hx + (fx - hx) * 0.2 + (i ? 6 : -6))} ${n((y1 + fy) / 2)} ${n(fx)} ${n(fy - 8)}`, c));
    });
    feet.forEach(([fx, fy, dir]) => body.push(shoe(fx, fy - 2, dir, c)));
    // the arms behind the body come first for hands that cross over it; the rest after
    const A = ARMS[p.arms] || ARMS.down;
    const shY = y0 + H * 0.52, sh = { L: [x0 + 4, shY], R: [x1 - 4, shY] };
    const hand = (side) => {
      const [dx, dy, kind, ang] = A[side];
      const s0 = sh[side === 'L' ? (f > 0 ? 'L' : 'R') : (f > 0 ? 'R' : 'L')];
      const hx = s0[0] + dx * f, hy = s0[1] + dy;
      return { s0, hx, hy, kind, ang: f > 0 ? ang : 180 - ang, side };
    };
    const hands = [hand('L'), hand('R')];
    const armPath = (h) => {
      const mx = (h.s0[0] + h.hx) / 2, my = (h.s0[1] + h.hy) / 2;
      const dx = h.hx - h.s0[0], dy = h.hy - h.s0[1], len = Math.hypot(dx, dy) || 1;
      const bend = Math.min(18, len * 0.25) * (h.s0[0] < 0 ? -1 : 1);
      return `M ${n(h.s0[0])} ${n(h.s0[1])} Q ${n(mx - (dy / len) * bend)} ${n(my + (dx / len) * bend * 0.4 + 8)} ${n(h.hx)} ${n(h.hy)}`;
    };
    // a hand crosses the body when it ends on the far side of the middle from its shoulder
    const crosses = (h) => (h.s0[0] < 0 ? h.hx > -W * 0.15 : h.hx < W * 0.15) && h.hy > y0 && h.hy < y1 + 10;
    const drawHand = (h) => (h.kind === 'box' ? boxing(h.hx, h.hy, h.ang, c.gloves || '#8E1F14') : glove(h.hx, h.hy, h.ang, h.kind, h.s0[0] < 0 ? -1 : 1));
    const behind = hands.filter((h) => !crosses(h));
    behind.forEach((h) => body.push(limb(armPath(h), c)));
    // REVENGE's headband tails, behind the body
    if (c.band) body.push(`<path d="M ${n(x0 + 6)} ${n(y0 + 4)} C ${n(x0 - 14)} ${n(y0 + Math.sin(t * 6) * 4)}, ${n(x0 - 28)} ${n(y0 + 16)}, ${n(x0 - 40)} ${n(y0 + 12 + Math.sin(t * 7) * 6)} L ${n(x0 - 34)} ${n(y0 + 24)} C ${n(x0 - 22)} ${n(y0 + 22)}, ${n(x0 - 12)} ${n(y0 + 18)}, ${n(x0 + 6)} ${n(y0 + 14)} Z" fill="${c.band}" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>`);
    // the wick, and what's at its tip
    const top = c.hat ? y0 - 50 : y0;
    if (c.wick === 'droop') body.push(line(`M 0 ${n(top + 2)} C 0 ${n(top - 26)}, ${n(16 * f)} ${n(top - 32)}, ${n(24 * f)} ${n(top - 18)}`, 6));
    else if (c.wick === 'spark') body.push(line(`M 0 ${n(top + 2)} C 5 ${n(top - 14)}, -5 ${n(top - 26)}, 2 ${n(top - 40)}`, 6));
    else body.push(line(`M 0 ${n(top + 2)} L 0 ${n(top - (c.hat ? 20 : 34))}`, 6));
    if (c.wick === 'spark') {
      const k = 1 + Math.sin(t * 41) * 0.25 + Math.sin(t * 23) * 0.15, sxp = 2, syp = top - 44;
      body.push(`<g transform="translate(${sxp} ${n(syp)}) scale(${n(k)}) rotate(${n(t * 90)})"><path d="M 0 -15 L 4 -4 L 15 0 L 4 4 L 0 15 L -4 4 L -15 0 L -4 -4 Z" fill="#FFE27A" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><circle r="3.6" fill="#FFFFFF"/></g>`);
    }
    if (c.wick === 'smoke') {
      for (let i = 0; i < 3; i++) {
        const u = ((t * 0.7 + i / 3) % 1), sy2 = top - 38 - u * 70, sxp = Math.sin(u * 6 + i) * 10;
        body.push(`<circle cx="${n(sxp)}" cy="${n(sy2)}" r="${n(7 + u * 12)}" fill="#8F8780" opacity="${n(0.55 * (1 - u))}"/>`);
      }
    }
    if (c.wick === 'flame') {
      const k = 1 + Math.sin(t * 9) * 0.06 + Math.sin(t * 13.7) * 0.04;
      body.push(`<circle cx="0" cy="${n(top - 46)}" r="34" fill="url(#${id}glow)"/>
        <g transform="translate(0 ${n(top - 34)}) scale(${n(k)} ${n(2 - k)})"><path d="M 0 -26 C 9 -14, 12 -6, 9 2 C 6 9, -6 9, -9 2 C -12 -6, -8 -15, 0 -26 Z" fill="#F6B03C" stroke="${INK}" stroke-width="2.6"/>
        <path d="M 0 -14 C 4 -7, 5 -2, 3 2 C 1 5, -3 5, -4 1 C -5 -3, -3 -8, 0 -14 Z" fill="#FFF1B8"/></g>`);
    }
    // the body: the candle, its light and shade, its ink
    const bd = rrect(x0, y0, x1, y1, r);
    body.push(`<clipPath id="${id}bd"><path d="${bd}"/></clipPath>
      <path d="${bd}" fill="${c.body}"/>
      <g clip-path="url(#${id}bd)">
        <path d="M ${n(x1 - W * 0.3)} ${n(y0 - 4)} C ${n(x1 - W * 0.36)} ${n(y0 + H * 0.4)}, ${n(x1 - W * 0.36)} ${n(y1 - H * 0.3)}, ${n(x1 - W * 0.28)} ${n(y1 + 4)} L ${n(x1 + 4)} ${n(y1 + 4)} L ${n(x1 + 4)} ${n(y0 - 4)} Z" fill="${c.dark}" opacity="0.55"/>
        <rect x="${n(x0 - 2)}" y="${n(y1 - 20)}" width="${n(W + 4)}" height="24" fill="${c.dark}" opacity="0.35"/>
        <rect x="${n(x0 + 11)}" y="${n(y0 + 14)}" width="11" height="${n(H * 0.5)}" rx="5.5" fill="${c.lite}" opacity="0.85"/>
        <circle cx="${n(x0 + 16.5)}" cy="${n(y0 + 14 + H * 0.5 + 14)}" r="5" fill="${c.lite}" opacity="0.85"/>
      </g>
      <path d="${bd}" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linejoin="round"/>`);
    // REVENGE's headband
    if (c.band) body.push(`<g clip-path="url(#${id}bd)"><rect x="${n(x0 - 4)}" y="${n(y0 + 2)}" width="${n(W + 8)}" height="13" fill="${c.band}"/>
      <path d="M ${n(x0)} ${n(y0 + 15)} H ${n(x1)}" stroke="${INK}" stroke-width="3"/></g>`);
    // GREED's top hat, the wick through its crown
    if (c.hat) body.push(`<g transform="rotate(${n(-6 * f)} 0 ${n(y0)})">
      <path d="M ${n(-W * 0.27)} ${n(y0 + 4)} L ${n(-W * 0.24)} ${n(y0 - 50)} L ${n(W * 0.24)} ${n(y0 - 50)} L ${n(W * 0.27)} ${n(y0 + 4)} Z" fill="#1E1630" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <rect x="${n(-W * 0.265)}" y="${n(y0 - 12)}" width="${n(W * 0.53)}" height="11" fill="${c.body}" stroke="${INK}" stroke-width="3"/>
      <ellipse cx="0" cy="${n(y0 + 4)}" rx="${n(W * 0.42)}" ry="9" fill="#1E1630" stroke="${INK}" stroke-width="4"/>
      <path d="M ${n(-W * 0.16)} ${n(y0 - 44)} L ${n(-W * 0.15)} ${n(y0 - 18)}" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity="0.25"/></g>`);
    // the face
    const ex = Math.max(15, W * 0.2), ey = y0 + Math.min(H * 0.3, 48) + (c.band ? 6 : 0);
    let rx = Math.min(17, Math.max(11, W * 0.13));
    if (c.eyes === 'wide') rx *= 1.15;
    const ry = rx * 1.3;
    const lx = cl(p.look[0], -1, 1), ly = cl(p.look[1], -1, 1);
    [-1, 1].forEach((side) => {
      const cx = side * ex + lx * 3, cy = ey + ly * 2, eid = `${id}e${side > 0 ? 'r' : 'l'}`;
      const inner = side * -1;                                    // +1 when the inner corner is to the right
      const angry = p.brow.angry || 0, worry = p.brow.worry || 0;
      const lidBase = cy - ry + 2 * ry * cl(lid + angry * 0.18);
      const slant = (angry * 0.42 - worry * 0.2) * ry;            // inner corner lower when angry
      const yIn = lidBase + slant, yOut = lidBase - slant * 0.4;
      const yL = inner > 0 ? yOut : yIn, yR = inner > 0 ? yIn : yOut;
      if (lid > 0.9) {
        body.push(line(`M ${n(cx - rx)} ${n(cy + 2)} Q ${n(cx)} ${n(cy + ry * 0.5)} ${n(cx + rx)} ${n(cy + 2)}`, 4.2));
        const by2 = cy - ry * 0.5 - 8 - (p.brow.raise || 0) * 6;
        body.push(line(`M ${n(cx - inner * rx * 0.95)} ${n(by2)} Q ${n(cx)} ${n(by2 - 5)} ${n(cx + inner * rx * 0.75)} ${n(by2 + (p.brow.angry || 0) * 8 - (p.brow.worry || 0) * 8)}`, 6));
        return;
      }
      body.push(`<clipPath id="${eid}"><ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}"/></clipPath>
        <ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="${WHITE}"/>
        <g clip-path="url(#${eid})">
          ${c.eyes === 'dollar'
    ? `<text x="${n(cx + lx * rx * 0.3)}" y="${n(cy + ry * 0.48 + ly * 3)}" text-anchor="middle" font-family="Archivo" font-weight="800" font-size="${n(ry * 1.55)}" fill="#1B9C6C">$</text>`
    : `<ellipse cx="${n(cx + lx * rx * 0.42)}" cy="${n(cy + ly * ry * 0.38 + 2)}" rx="${n(rx * (c.eyes === 'worried' ? 0.38 : 0.52))}" ry="${n(ry * (c.eyes === 'worried' ? 0.4 : 0.56))}" fill="${INK}"/>
             <circle cx="${n(cx + lx * rx * 0.42 - rx * 0.18)}" cy="${n(cy + ly * ry * 0.38 - ry * 0.16)}" r="${n(rx * 0.19)}" fill="#FFFFFF"/>`}
          ${lid > 0.02 || angry > 0.02 || worry > 0.02 ? `<path d="M ${n(cx - rx - 2)} ${n(cy - ry - 4)} H ${n(cx + rx + 2)} V ${n(yR)} L ${n(cx - rx - 2)} ${n(yL)} Z" fill="${c.body}"/>
          <path d="M ${n(cx - rx - 2)} ${n(yL)} L ${n(cx + rx + 2)} ${n(yR)}" stroke="${INK}" stroke-width="3.2"/>` : ''}
        </g>
        <ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="none" stroke="${INK}" stroke-width="3.6"/>`);
      // the brow
      const raise = (p.brow.raise || 0) * 8 + worry * 4 - angry * 2;
      const by = cy - ry - 9 - raise, bIn = angry * 9 - worry * 9;
      const xOut = cx - inner * rx * 0.95, xIn = cx + inner * rx * 0.75;
      body.push(line(`M ${n(xOut)} ${n(by - 2)} Q ${n((xOut + xIn) / 2)} ${n(by - 6 + bIn * 0.2)} ${n(xIn)} ${n(by + bIn)}`, 6));
    });
    // the mouth
    const my = ey + ry + Math.min(16, H * 0.1) + 6, mw = Math.max(13, W * 0.17), sm = p.mouth.smile || 0, op = cl(p.mouth.open || 0);
    if (p.mouth.wavy > 0.5) {
      let d = `M ${n(-mw)} ${n(my)}`;
      for (let i = 1; i <= 6; i++) d += ` L ${n(-mw + (2 * mw * i) / 6)} ${n(my + (i % 2 ? -4 : 4) + Math.sin(t * 30) * 1.2)}`;
      body.push(line(d, 4));
    } else if (op < 0.06) {
      body.push(line(`M ${n(-mw)} ${n(my - sm * 4)} Q 0 ${n(my + sm * mw * 0.9)} ${n(mw)} ${n(my - sm * 4)}`, 5));
    } else {
      const topY = my - sm * 4, ctl = my + sm * mw * 0.45, bot = my + op * mw * 1.7 + Math.max(0, sm) * mw * 0.5;
      const md = `M ${n(-mw)} ${n(topY)} Q 0 ${n(ctl)} ${n(mw)} ${n(topY)} Q ${n(mw * 0.6)} ${n(bot)} 0 ${n(bot)} Q ${n(-mw * 0.6)} ${n(bot)} ${n(-mw)} ${n(topY)} Z`;
      body.push(`<clipPath id="${id}m"><path d="${md}"/></clipPath><path d="${md}" fill="#3A1410"/>
        <g clip-path="url(#${id}m)"><ellipse cx="0" cy="${n(bot + 2)}" rx="${n(mw * 0.6)}" ry="${n(Math.max(4, (bot - topY) * 0.45))}" fill="#E46A63"/>
        ${p.mouth.teeth ? `<rect x="${n(-mw)}" y="${n(topY - 8)}" width="${n(mw * 2)}" height="${n(Math.min(12, (bot - topY) * 0.42) + 8)}" fill="${WHITE}"/>` : ''}</g>
        <path d="${md}" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`);
    }
    // FEAR's sweat
    if (c.sweat) {
      for (let i = 0; i < 2; i++) {
        const u = (t * 0.6 + i * 0.5) % 1, dx2 = (i ? 1 : -1) * (W / 2 + 6), dy2 = y0 + 18 + u * 40;
        body.push(`<path d="M ${n(dx2)} ${n(dy2 - 9)} C ${n(dx2 + 5)} ${n(dy2 - 2)}, ${n(dx2 + 5)} ${n(dy2 + 4)}, ${n(dx2)} ${n(dy2 + 5)} C ${n(dx2 - 5)} ${n(dy2 + 4)}, ${n(dx2 - 5)} ${n(dy2 - 2)}, ${n(dx2)} ${n(dy2 - 9)} Z" fill="#E8F6FF" stroke="${INK}" stroke-width="2.2" opacity="${n(1 - u * 0.7)}"/>`);
      }
    }
    // PATIENCE's crown
    if (c.badge && window.CROWN) {
      const k = window.CROWN, cy2 = Math.min(y1 - 20, my + 34);
      body.push(`<g transform="translate(0 ${n(cy2)}) scale(0.13) translate(-100 -88)"><path d="${k.path}" fill="#7A5520" fill-rule="evenodd"/>${k.circles.map(([cx, cy, rr]) => `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="#7A5520"/>`).join('')}</g>`);
    }
    // what they hold, then the arms that cross the body, and the hands
    const front = hands.filter((h) => crosses(h));
    const mid = [(hands[0].hx + hands[1].hx) / 2, (hands[0].hy + hands[1].hy) / 2];
    const prop = [];
    if (p.arms === 'phone') {
      const ph = hands.find((h) => h.kind === 'hold') || hands[1];
      prop.push(`<g transform="translate(${n(ph.hx + 6 * f)} ${n(ph.hy - 34)}) rotate(${n(8 * f)})"><rect x="-26" y="-46" width="52" height="92" rx="9" fill="#0E1116" stroke="${INK}" stroke-width="3.6"/>
        <rect x="-21" y="-38" width="42" height="72" rx="4" fill="#0B1F1A"/>
        <path d="M -17 22 L -9 12 L -3 16 L 5 -2 L 10 2 L 17 -24" fill="none" stroke="#35D08F" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round"/>
        ${p.screen ? `<text x="0" y="-18" text-anchor="middle" font-family="JB Mono" font-weight="600" font-size="11" fill="#7BF0C0">${p.screen}</text>` : ''}</g>`);
    }
    if (p.arms === 'tea') {
      const sx2 = mid[0], sy3 = mid[1] - 6;
      prop.push(`<g transform="translate(${n(sx2)} ${n(sy3)})"><path d="M -20 -18 L 20 -18 L 16 10 C 12 16, -12 16, -16 10 Z" fill="${WHITE}" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/>
        <path d="M 19 -12 C 30 -12, 30 4, 17 4" fill="none" stroke="${INK}" stroke-width="3.4"/><rect x="-18" y="-18" width="36" height="5" fill="${c.body}"/>
        ${[0, 1].map((i) => { const u = (t * 0.35 + i * 0.5) % 1; return `<path d="M ${n(-5 + i * 9)} ${n(-24 - u * 34)} q 6 -8 0 -16" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="${n(0.5 * Math.sin(u * Math.PI))}"/>`; }).join('')}</g>`);
    }
    if (p.arms === 'sign' && p.card) {
      prop.push(`<g transform="translate(${n(mid[0])} ${n(mid[1] + 10)})"><rect x="-44" y="-30" width="88" height="56" rx="6" fill="${WHITE}" stroke="${INK}" stroke-width="3.6"/>
        <text x="0" y="16" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="40" fill="${INK}">${p.card}</text></g>`);
    }
    body.push(...prop);
    front.forEach((h) => body.push(limb(armPath(h), c)));
    hands.forEach((h) => body.push(drawHand(h)));
    // squash about the feet, lean about the feet, then the shake
    const scx = 1 + sq * 0.16, scy = 1 - sq * 0.24;
    o.push(`<g transform="translate(${n(sx)} ${n(sy)}) rotate(${n(p.lean * f)}) scale(${n(scx)} ${n(scy)})">${body.join('')}</g>`);
    const defs = c.wick === 'flame' ? `<defs><radialGradient id="${id}glow"><stop offset="0" stop-color="#FFD98A" stop-opacity="0.75"/><stop offset="1" stop-color="#FFD98A" stop-opacity="0"/></radialGradient></defs>` : '';
    return `<g>${defs}${o.join('')}</g>`;
  }

  // ------------------------------------------------------------ tracks
  function blend(a, b, k) {
    const o = {};
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const va = a[key], vb = b[key];
      if (typeof va === 'number' && typeof vb === 'number') o[key] = mix(va, vb, k);
      else if (Array.isArray(va) && Array.isArray(vb)) o[key] = va.map((v, i) => mix(v, vb[i] ?? v, k));
      else if (va && vb && typeof va === 'object' && typeof vb === 'object') o[key] = blend(va, vb, k);
      else o[key] = k < 0.5 ? (va ?? vb) : (vb ?? va);
    }
    return o;
  }
  const easeIO = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const easeOut = (k) => 1 - Math.pow(1 - k, 3);
  const backOut = (k) => { const s = 1.7; const u = k - 1; return u * u * ((s + 1) * u + s) + 1; };
  // A track's keys: { t, x, y, s, pose, ease: 'io' | 'out' | 'linear' | 'back' | 'step' }. Each key's
  // pose is complete (filled from the character's defaults), so a blend always has both ends.
  function at(who, track, t) {
    const T = (v) => (typeof window.at === 'function' ? window.at(v) : v);
    const ks = track.map((k) => ({ ...k, at: T(k.t), pose: pose(who, k.pose || {}) }));
    const pick = (a) => ({ x: a.x, y: a.y, s: a.s ?? 1, pose: a.pose });
    if (t <= ks[0].at) return pick(ks[0]);
    for (let i = 0; i < ks.length - 1; i++) {
      const a = ks[i], b = ks[i + 1];
      if (t < b.at) {
        const u = cl((t - a.at) / Math.max(1e-6, b.at - a.at));
        if (b.ease === 'step') return pick(a);
        const k = b.ease === 'linear' ? u : b.ease === 'out' ? easeOut(u) : b.ease === 'back' ? backOut(u) : easeIO(u);
        return { x: mix(a.x, b.x, k), y: mix(a.y, b.y, k), s: mix(a.s ?? 1, b.s ?? 1, k), pose: blend(a.pose, b.pose, cl(k)) };
      }
    }
    return pick(ks[ks.length - 1]);
  }
  function place(who, track, t, id) {
    const q = at(who, track, t);
    q.pose.__full = true;
    return `<g transform="translate(${n(q.x)} ${n(q.y)}) scale(${n(q.s)})">${svg(who, q.pose, t, id)}</g>`;
  }

  window.Cast = { WHO, pose, svg, at, place };

  // ------------------------------------------------------------ speech bubbles
  // { kind: 'bubble', who, text, x, y, tail: 'bl' | 'br' | 'b' | 'tl' | 'tr', size, tag, tagColour }: a
  // white bubble with its speaker's name tag (or tag, for anyone else), centred on (x, y), its tail
  // towards the speaker. It pops in.
  if (typeof KINDS !== 'undefined') {
    const st = document.createElement('style');
    st.textContent = `
      .bubble { position: absolute; max-width: 800px; padding: 28px 42px 32px; background: #FFFDF6; border: 6px solid #1A120C; border-radius: 46px;
        font: 800 60px/1.04 "TCP Display"; letter-spacing: -0.02em; color: #1A120C; text-align: center; box-shadow: 0 16px 0 rgba(0,0,0,.32); white-space: nowrap; }
      .bubble .w { margin: 0 .08em; }
      .bubble .w.foil { background: none; color: #B07A1E; -webkit-text-fill-color: #B07A1E; }
      .bubble em { position: absolute; top: -34px; left: 34px; padding: 8px 16px 9px; border: 5px solid #1A120C; border-radius: 14px;
        font: 700 30px/1 "JB Mono"; font-style: normal; letter-spacing: .08em; color: #FFFDF6; }
      .bubble svg { position: absolute; width: 90px; height: 70px; overflow: visible; }`;
    document.head.appendChild(st);
    const TAILS = {
      bl: { css: 'left:70px;bottom:-62px', d: 'M 0 0 L 6 64 L 52 0', origin: '20% 100%' },
      br: { css: 'right:70px;bottom:-62px', d: 'M 0 0 L 78 64 L 52 0', origin: '80% 100%' },
      b: { css: 'left:calc(50% - 30px);bottom:-62px', d: 'M 0 0 L 30 66 L 60 0', origin: '50% 100%' },
      tl: { css: 'left:70px;top:-62px', d: 'M 0 70 L 6 6 L 52 70', origin: '20% 0%' },
      tr: { css: 'right:70px;top:-62px', d: 'M 0 70 L 78 6 L 52 70', origin: '80% 0%' },
    };
    KINDS.bubble = {
      make(s, root) {
        const c = WHO[s.who] || {}, tail = TAILS[s.tail || 'bl'];
        s.node = el('div', 'bubble', root);
        if (s.size) s.node.style.fontSize = `${s.size}px`;
        const name = c.name || s.tag, bg = c.tag || s.tagColour || '#3B4250';
        const tag = name ? `<em style="background:${bg};color:${s.who === 'patience' ? '#1A120C' : '#FFFDF6'}">${esc(name)}</em>` : '';
        const flat = tail.d.replace(/^M (\S+) (\S+) .* L (\S+) (\S+)$/, 'M $1 $2 L $3 $4');
        s.node.innerHTML = `${tag}<span>${wordsOf(s.text)}</span><svg style="${tail.css}" viewBox="0 0 90 70"><path d="${tail.d}" fill="#FFFDF6" stroke="#1A120C" stroke-width="6" stroke-linejoin="round"/><path d="${flat}" stroke="#FFFDF6" stroke-width="9"/></svg>`;
        css(s.node, { left: `${s.x || 540}px`, top: `${s.y || 600}px`, transformOrigin: tail.origin });
        s.cues = s.sfx === false ? [] : [{ t: s.a, sfx: s.sfx || 'pop' }];
      },
      draw(s, t) {
        const k = E.outBack(seg(t, s.a, s.a + 0.24));
        css(s.node, { opacity: clamp(seg(t, s.a, s.a + 0.06)) * s.pOut, transform: `translate(-50%, -50%) scale(${n(0.55 + 0.45 * k)})` });
      },
    };
  }
})();
