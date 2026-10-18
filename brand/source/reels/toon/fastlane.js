// The Fast Lane: the founder's supercar and his jet, for a series about discipline at speed. The car
// and the jet are cartoon props: drawn for the metaphor, never shown as what trading paid for.
//
//   street   his car on a wet street at night, side on and facing left: gloss black, gold wheels, the
//            TCP crown on its nose. Its near door (his, the driver's) is a scissor door: s.door:
//            [{ t, k }] lifts it (0 shut, 1 up). Him in the driver's seat behind it, seen through the
//            opening (or faintly through the tinted glass when it's shut). s.drive: [{ t, x }] moves
//            the car along the road (negative is forwards, to the left); s.lights: [{ t, k }] its lights;
//            s.tag: a dealer's sticker on the door's glass (TEST DRIVE)
//   driver   him at the wheel, from the passenger seat: hands on the wheel, the dials behind it, the
//            city going past his window and the road through the windscreen. s.dash: [{ t, speed,
//            fuel, brake }] (speed in mph, fuel 0..1, brake 0..1 lights the brake light on the dash);
//            s.nav: [[t, 'TEXT', 'small line']] the sat nav's banner; s.flow: how fast the city
//            passes (keys, 0 parked .. 1 at speed); s.beside: [{ t, x }] another car's silhouette in
//            his window (a red car pulling up, then gone)
//   road     through the windscreen: the road ahead at night, its lines rushing under, lamps passing,
//            the dash and the wheel's rim below. s.road: [{ t, speed, bend }] (bend -1 left .. 1
//            right); s.sign: [{ t, z, kind }] a sign coming up (z its distance, 1 far .. 0 here; kind
//            'bend' | 'uturn' | 'exit' | 'camera'); s.signal: [[t, 'red' | 'amber' | 'green']], a traffic
//            light ahead (s.lightz: [{ t, z }] its distance); s.nav as in driver; s.flash: [t] a speed
//            camera's flash; s.ahead: [{ t, z, side, brake }] a car ahead, from behind
//   tarmac   his jet on the apron at sunrise, side on and facing left, its airstair down, a red carpet.
//            s.climb: [{ t, k }] him on the stairs (0 at the foot, 1 in the doorway)
(function () {
  const T = window.Toon, F = window.Founder;
  const { SETS, HIM, n, cl, mix, crown, keyed, numBlend, GOLD } = T;
  const GOLDHI = T.GOLDHI || '#F6E3A3';
  const val = (keys, t, key, dflt = 0) => (keys && keys.length ? keyed(keys, t, numBlend)[key] ?? dflt : dflt);
  const step = (list, t, dflt) => { let v = dflt; for (const k of list || []) if (t >= at(k[0])) v = k; return v; };
  const smoothstep = (k) => k * k * (3 - 2 * k);

  // ------------------------------------------------------------ the car, side on, facing left
  // Car space: its nose at x 0, its tail at x 1000, the ground at y 0, its roof at y -250 (1.15 m high,
  // 4.6 m long). The wheels' centres at x 180 and 770, 80 in radius.
  const BODY = 'M 6 -82 C 30 -100, 90 -118, 160 -132 C 210 -142, 240 -156, 262 -170 L 318 -210 C 350 -232, 380 -246, 430 -250 L 560 -250 C 600 -248, 630 -238, 680 -222 C 760 -200, 860 -172, 958 -152 C 972 -146, 980 -132, 980 -110 L 976 -62 C 974 -48, 966 -40, 952 -38 L 868 -36 A 98 98 0 0 0 672 -36 L 278 -36 A 98 98 0 0 0 82 -36 L 26 -34 C 12 -34, 2 -44, 0 -58 Z';
  // the side window: from the A-pillar's foot up to the roof, back to the C-pillar
  const DLO = 'M 286 -196 L 338 -228 C 362 -240, 392 -244, 432 -244 L 548 -244 C 580 -242, 604 -232, 624 -220 L 640 -206 C 600 -196, 560 -190, 520 -188 L 360 -186 C 320 -186, 300 -190, 286 -196 Z';
  // the door: its front edge behind the front wheel, up the A-pillar, over the roof to the window's
  // back, down to the sill; it pivots near its front at the A-pillar's foot
  const DOOR = 'M 292 -60 L 284 -150 L 286 -196 L 338 -228 C 362 -240, 392 -244, 432 -244 L 548 -244 C 572 -243, 590 -238, 606 -230 L 600 -150 L 586 -60 Z';
  const HINGE = [292, -140];
  function wheel(id, cx, spin, glow) {
    let spokes = '';
    for (let i = 0; i < 10; i++) {
      const a = spin + (i * Math.PI) / 5, a2 = a + 0.13;
      spokes += `<path d="M ${n(cx + Math.cos(a) * 15)} ${n(-80 + Math.sin(a) * 15)} L ${n(cx + Math.cos(a) * 60)} ${n(-80 + Math.sin(a) * 60)} L ${n(cx + Math.cos(a2) * 60)} ${n(-80 + Math.sin(a2) * 60)} L ${n(cx + Math.cos(a2) * 15)} ${n(-80 + Math.sin(a2) * 15)} Z" fill="url(#${id}cgold)"/>`;
    }
    return `<circle cx="${cx}" cy="-80" r="80" fill="#0B0B0D"/><circle cx="${cx}" cy="-80" r="80" fill="none" stroke="#1E1E22" stroke-width="5"/>
      <circle cx="${cx}" cy="-80" r="66" fill="#141416"/>
      <path d="M ${cx - 30} -120 C ${cx - 10} -132, ${cx + 22} -132, ${cx + 40} -116 L ${cx + 34} -98 C ${cx + 20} -110, ${cx - 6} -112, ${cx - 22} -104 Z" fill="${GOLD}" opacity="0.9"/>
      ${spokes}
      <circle cx="${cx}" cy="-80" r="64" fill="none" stroke="url(#${id}cgold)" stroke-width="6"/>
      <circle cx="${cx}" cy="-80" r="17" fill="#121214" stroke="url(#${id}cgold)" stroke-width="3"/>${crown(cx, -80, 0.07)}
      <path d="M ${cx - 58} -112 A 66 66 0 0 1 ${cx + 30} -138" fill="none" stroke="${glow}" stroke-width="3" opacity="0.35"/>`;
  }
  // The car: k.door (0..1), k.spin (wheel turn, radians), k.lights (0..1), k.tag, k.inside: what is
  // drawn in the cabin (him), k.reflect: drawn as its own reflection (no cabin, no glow)
  function car(id, k) {
    const ang = -78 * smoothstep(cl(k.door || 0));
    const lit = cl(k.lights || 0);
    const doorSkin = `<path d="${DOOR} ${DLO}" fill="url(#${id}cpaint)" fill-rule="evenodd"/>
      <clipPath id="${id}cdc"><path d="${DOOR}"/></clipPath>
      <g clip-path="url(#${id}cdc)">
        <path d="${DLO}" fill="url(#${id}cglass)" opacity="0.86"/>
        <path d="M 300 -196 L 350 -226 L 380 -226 L 330 -196 Z" fill="#FFFFFF" opacity="0.08"/>
        <path d="M 300 -150 C 420 -158, 520 -160, 604 -156" stroke="${GOLD}" stroke-width="2.5" fill="none" opacity="0.85"/>
        <path d="M 296 -120 C 420 -126, 520 -126, 600 -122" stroke="#3A3C44" stroke-width="2" fill="none" opacity="0.6"/>
        ${k.tag ? `<g transform="translate(566 -206)"><rect x="-34" y="-11" width="68" height="22" rx="3" fill="#F4F1EA"/><text x="0" y="5" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="10" fill="#C8281E">${k.tag}</text></g>` : ''}
      </g>
      <path d="${DOOR}" fill="none" stroke="#050506" stroke-width="2.5"/>
      <path d="M 560 -140 L 584 -140" stroke="#5A5C66" stroke-width="5" stroke-linecap="round"/>`;
    const cabin = `<clipPath id="${id}cop"><path d="${DOOR}"/></clipPath>
      <g clip-path="url(#${id}cop)">
        <rect x="270" y="-260" width="360" height="240" fill="#0B0C10"/>
        <path d="M 600 -240 L 640 -240 L 640 -40 L 560 -40 Z" fill="#141519"/>
        ${k.inside || ''}
        <path d="M 270 -70 L 630 -70 L 630 -30 L 270 -30 Z" fill="#17181C"/><path d="M 270 -70 L 630 -70" stroke="${GOLD}" stroke-width="2" opacity="0.6"/>
      </g>`;
    return `
      ${k.reflect ? '' : cabin}
      <g ${k.reflect ? '' : `mask="url(#${id}chole)"`}>
      <path d="${BODY}" fill="url(#${id}cpaint)"/>
      <path d="M 900 -160 L 968 -176 L 976 -164 L 958 -150 Z" fill="#0B0C0F"/><path d="M 900 -160 L 968 -176" stroke="#3A3F4C" stroke-width="2"/>
      <path d="M 40 -96 C 200 -138, 560 -170, 960 -134" fill="none" stroke="url(#${id}cline)" stroke-width="7" opacity="0.75"/>
      <path d="M 70 -60 L 270 -58 M 700 -56 L 950 -60" stroke="#26272D" stroke-width="3" opacity="0.8"/>
      <path d="M 616 -178 L 700 -170 L 690 -96 L 640 -104 Z" fill="#050506"/><path d="M 626 -170 L 692 -164" stroke="#2A2B31" stroke-width="2"/>
      ${[0, 1, 2, 3].map((i) => `<path d="M ${634 + i * 13} -162 L ${630 + i * 13} -108" stroke="#1A1B1F" stroke-width="3"/>`).join('')}
      <path d="M 640 -206 C 600 -196, 560 -190, 520 -188 L 360 -186 C 320 -186, 300 -190, 286 -196" fill="none" stroke="#050506" stroke-width="3"/>
      <path d="M 16 -84 L 70 -100 L 92 -96 L 40 -78 Z" fill="${lit > 0.05 ? '#EAF4FF' : '#3A4150'}"/>
      ${lit > 0.05 && !k.reflect ? `<ellipse cx="40" cy="-88" rx="${n(120 * lit)}" ry="${n(30 * lit)}" fill="url(#${id}cbeam)" opacity="${n(lit)}"/>` : ''}
      <path d="M 960 -132 L 978 -126 L 978 -96 L 964 -100 Z" fill="${lit > 0.05 ? '#FF3A2E' : '#5A1414'}"/>
      ${lit > 0.05 && !k.reflect ? `<ellipse cx="972" cy="-112" rx="${n(46 * lit)}" ry="${n(22 * lit)}" fill="#FF3A2E" opacity="${n(0.35 * lit)}" filter="url(#${id}cb6)"/>` : ''}
      ${crown(118, -122, 0.1)}
      <path d="M 300 -244 C 400 -252, 520 -252, 600 -244" stroke="#9FB4D8" stroke-width="3" fill="none" opacity="0.45"/>
      <path d="M 262 -172 L 300 -168 L 296 -150 L 270 -152 Z" fill="#0B0C0F"/><path d="M 262 -172 L 300 -168" stroke="#4A4F5C" stroke-width="2"/>
      </g>
      ${wheel(id, 180, k.spin || 0, '#9FB4D8')}${wheel(id, 770, k.spin || 0, '#9FB4D8')}
      <path d="M 278 -36 A 98 98 0 0 0 82 -36 M 868 -36 A 98 98 0 0 0 672 -36" fill="none" stroke="#050506" stroke-width="4"/>

      ${k.reflect ? `<path d="${DOOR}" fill="url(#${id}cpaint)"/>` : `<g transform="rotate(${n(ang)} ${HINGE[0]} ${HINGE[1]})">${doorSkin}</g>`}`;
  }
  function carDefs(id) {
    return `<defs>
      <linearGradient id="${id}cpaint" x1="0" y1="-250" x2="0" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3B4152"/><stop offset="0.22" stop-color="#15171D"/><stop offset="0.5" stop-color="#0D0E12"/><stop offset="0.62" stop-color="#2A2E3A"/><stop offset="0.7" stop-color="#0B0C0F"/><stop offset="1" stop-color="#060607"/></linearGradient>
      <linearGradient id="${id}cglass" x1="0" y1="-244" x2="0" y2="-186" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#2A3346"/><stop offset="1" stop-color="#090B10"/></linearGradient>
      <linearGradient id="${id}cline" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.3" stop-color="#C9D6F2" stop-opacity="0.8"/><stop offset="0.7" stop-color="#FFFFFF" stop-opacity="0.9"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>
      <linearGradient id="${id}cgold" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="${GOLDHI}"/><stop offset="0.5" stop-color="${GOLD}"/><stop offset="1" stop-color="#8C6420"/></linearGradient>
      <radialGradient id="${id}cbeam" cx="0" cy="0.5" r="1"><stop offset="0" stop-color="#EAF4FF" stop-opacity="0.9"/><stop offset="1" stop-color="#EAF4FF" stop-opacity="0"/></radialGradient>
      <filter id="${id}cb6" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="6"/></filter>
      <mask id="${id}chole" maskUnits="userSpaceOnUse" x="-200" y="-500" width="1400" height="700"><rect x="-200" y="-500" width="1400" height="700" fill="#fff"/><path d="${DOOR}" fill="#000"/></mask>
    </defs>`;
  }

  // ------------------------------------------------------------ the street
  // The car's nose at x 40, the kerb behind it; the ground at y 1500. Him in the driver's seat: a 0.228
  // scale founder (a car 1000 long is 4.6 m), his head under the roof.
  const STREET = { x: 40, y: 1500, him: { x: 430, y: -205, s: 0.228 } };
  SETS.street = (s, t, st, p, id) => {
    p.light = { ...p.light, tint: '#F6C27A', rim: 0.9 };
    p.flip = true;
    const door = val(s.door, t, 'k'), lights = val(s.lights, t, 'k'), dx = val(s.drive, t, 'x');
    const spin = dx / 80;
    const r = rng(41);
    // the skyline: towers with lit windows, a dusk sky, the moon
    let towers = '';
    for (let i = 0; i < 9; i++) {
      const x = -380 + i * 230 + r() * 60, w = 140 + r() * 90, top = 520 + r() * 420;
      let lit = '';
      for (let wy = top + 24; wy < 1290; wy += 30) for (let wx = x + 14; wx < x + w - 14; wx += 24) if (r() < 0.3) lit += `<rect x="${n(wx)}" y="${n(wy)}" width="11" height="15" fill="${r() < 0.85 ? '#F6C46A' : '#BFD4FF'}" opacity="${n(0.35 + r() * 0.5)}"/>`;
      towers += `<rect x="${n(x)}" y="${n(top)}" width="${n(w)}" height="${n(1320 - top)}" fill="${i % 2 ? '#10121C' : '#0C0E17'}"/>${lit}`;
    }
    const bg = `<defs><linearGradient id="${id}ssky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070A18"/><stop offset="0.55" stop-color="#1A2147"/><stop offset="1" stop-color="#5A3A55"/></linearGradient></defs>
      <rect x="-800" y="-600" width="2680" height="3120" fill="url(#${id}ssky)"/>
      <circle cx="820" cy="300" r="46" fill="#F3EEDD" opacity="0.9"/><circle cx="820" cy="300" r="120" fill="#F3EEDD" opacity="0.06"/>
      ${T.bokeh(-600, 200, 2200, 500, 40, 7, [1, 2.4]).replace(/opacity="[\d.]+"/g, 'opacity="0.5"')}
      ${towers}
      <rect x="-800" y="1300" width="2680" height="40" fill="#0A0B12"/>
      <g opacity="0.8">${T.bokeh(-600, 1150, 2200, 160, 46, 12, [4, 14])}</g>`;
    // lamps along the pavement behind the car, and their pools of light
    const lamps = [-260, 300, 860, 1420].map((x) => `<rect x="${x - 7}" y="1010" width="14" height="330" fill="#0E0F14"/><path d="M ${x} 1016 C ${x} 990, ${x + 40} 980, ${x + 62} 990" stroke="#0E0F14" stroke-width="9" fill="none"/>
      <ellipse cx="${x + 64}" cy="996" rx="20" ry="8" fill="#FFE1A8"/><ellipse cx="${x + 64}" cy="1000" rx="90" ry="60" fill="#FFD28A" opacity="0.18"/>
      <path d="M ${x + 50} 1000 L ${x - 60} 1340 L ${x + 190} 1340 L ${x + 78} 1000 Z" fill="#FFD28A" opacity="0.05"/>`).join('');
    const mid = `${lamps}<rect x="-800" y="1338" width="2680" height="26" fill="#2A2B33"/><rect x="-800" y="1336" width="2680" height="4" fill="#4A4C58"/>`;
    // him in the driver's seat: the seat's back behind him, the wheel ahead of him
    const h = STREET.him;
    const inside = `<g>
      <path d="M 520 -236 C 548 -236, 566 -220, 566 -196 L 566 -40 L 470 -40 L 486 -200 C 490 -224, 502 -236, 520 -236 Z" fill="#17171B"/>
      <path d="M 528 -228 C 546 -228, 556 -214, 556 -196 L 556 -60" stroke="${GOLD}" stroke-width="1.6" fill="none" stroke-dasharray="4 3" opacity="0.8"/>${crown(524, -206, 0.07)}
      <g transform="translate(${h.x} ${h.y}) scale(${h.s})">${F.founderSVG(p, id + 'f', 'all')}</g>
      <ellipse cx="352" cy="-128" rx="16" ry="44" fill="none" stroke="#202024" stroke-width="9" transform="rotate(-14 352 -128)"/>
      <path d="M 300 -110 L 380 -112 L 384 -80 L 300 -78 Z" fill="#101114"/></g>`;
    const subject = `${carDefs(id)}${carDefs(id + 'r')}
      <defs><linearGradient id="${id}swet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E1018"/><stop offset="1" stop-color="#05060A"/></linearGradient>
        <linearGradient id="${id}sref" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.32"/><stop offset="0.6" stop-color="#fff" stop-opacity="0"/></linearGradient>
        <mask id="${id}srm"><rect x="-800" y="${STREET.y}" width="2680" height="420" fill="url(#${id}sref)"/></mask></defs>
      <rect x="-800" y="1362" width="2680" height="1200" fill="url(#${id}swet)"/>
      ${[-260, 300, 860, 1420].map((x) => `<path d="M ${x + 50} 1520 L ${x + 30} 1900 L ${x + 110} 1900 L ${x + 76} 1520 Z" fill="#FFD28A" opacity="0.12"/>`).join('')}
      <g mask="url(#${id}srm)"><g transform="translate(${STREET.x + dx} ${STREET.y}) scale(1 -1)">${car(id + 'r', { spin, lights, reflect: true })}</g></g>
      <ellipse cx="${n(STREET.x + dx + 480)}" cy="${STREET.y + 4}" rx="520" ry="16" fill="#000" opacity="0.7"/>
      <g transform="translate(${STREET.x + dx} ${STREET.y})">${car(id, { door, spin, lights, tag: s.tag, inside })}</g>
      ${lights > 0.05 ? `<path d="M ${n(STREET.x + dx + 20)} ${STREET.y - 86} L ${n(STREET.x + dx - 700)} ${STREET.y - 10} L ${n(STREET.x + dx - 700)} ${STREET.y + 120} Z" fill="#EAF4FF" opacity="${n(0.08 * lights)}"/>` : ''}`;
    return [{ f: 0.3, svg: bg, blur: s.dof && s.dof.bg }, { f: 0.6, svg: mid, blur: s.dof && s.dof.mid }, { f: 1, svg: subject, blur: s.dof && s.dof.all }, T.topShade(id)];
  };
  // ------------------------------------------------------------ the driver's seat
  // From the passenger seat: him at the wheel facing right (the car's nose is to the right), the
  // windscreen in front of him, his window behind him with the city going past.
  SETS.driver = (s, t, st, p, id) => {
    p.light = { ...p.light, tint: '#9CC4FF', rim: 1 };
    const flow = val(s.flow, t, 'k', 0), speed = val(s.dash, t, 'speed'), fuel = val(s.dash, t, 'fuel', 0.8), brake = val(s.dash, t, 'brake');
    // how far the city has gone past: the integral of the flow
    let run = 0;
    for (let u = 0; u < t; u += 1 / 30) run += val(s.flow, u, 'k', 0) / 30;
    const r = rng(23);
    let city = '';
    for (let i = 0; i < 16; i++) {
      const w = 120 + r() * 120, top = 500 + r() * 380, span = 16 * 220;
      const x = ((i * 220 - run * 1400) % span + span) % span - 900;
      let lit = '';
      const rr = rng(100 + i);
      for (let wy = top + 20; wy < 1200; wy += 28) for (let wx = x + 12; wx < x + w - 12; wx += 22) if (rr() < 0.32) lit += `<rect x="${n(wx)}" y="${n(wy)}" width="10" height="14" fill="${rr() < 0.85 ? '#F6C46A' : '#BFD4FF'}" opacity="${n(0.35 + rr() * 0.5)}"/>`;
      city += `<rect x="${n(x)}" y="${n(top)}" width="${n(w)}" height="${n(1300 - top)}" fill="${i % 2 ? '#0F1220' : '#0B0E19'}"/>${lit}`;
    }
    const lampx = (i) => ((i * 700 - run * 2600) % 2800 + 2800) % 2800 - 900;
    const lamps = [0, 1, 2, 3].map((i) => `<rect x="${n(lampx(i))}" y="560" width="12" height="700" fill="#0B0C12"/><ellipse cx="${n(lampx(i) + 6)}" cy="560" rx="${n(26 + flow * 80)}" ry="12" fill="#FFE1A8" opacity="0.9"/>`).join('');
    // the other car in his window
    const bx = val(s.beside, t, 'x', 4000);
    const beside = bx < 3000 ? `<g transform="translate(${n(bx)} 1010)"><path d="M 0 120 C 30 60, 120 40, 220 30 L 420 24 C 520 30, 600 60, 650 120 L 660 200 L -10 200 Z" fill="#7A0F12"/>
      <path d="M 170 40 L 240 -10 C 280 -24, 380 -24, 420 -10 L 470 30 Z" fill="#14161E"/><ellipse cx="330" cy="0" rx="34" ry="30" fill="#05060A"/>
      <path d="M 40 100 C 200 70, 460 70, 640 100" stroke="#E04848" stroke-width="5" fill="none" opacity="0.6"/></g>` : '';
    const bg = `<defs><linearGradient id="${id}dsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070A18"/><stop offset="1" stop-color="#22284A"/></linearGradient></defs>
      <rect x="-900" y="-600" width="2880" height="3120" fill="url(#${id}dsky)"/>
      <g filter="url(#${id}dmb)">${city}${lamps}</g>${beside}
      <filter id="${id}dmb" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${n(1 + flow * 7)} 1"/></filter>`;
    const place = `translate(${HIM.x} ${HIM.y}) scale(${HIM.s})`;
    // the dash's display, behind the wheel where the dials would be: the speed, a fuel bar, the brake
    // light, the sat nav's banner
    const sp = cl(speed / 180), nav = step(s.nav, t, null);
    // (the readouts sit in the clear part of the wheel's top, between the rim, the hub and its upper
    // spoke, which cuts in from the left lower down: the speed, then the bar and BRAKE a little to the
    // right; the sat nav's banner sits above the rim, clear of its gold mark; s.screen false hides it,
    // for close-ups, where only its cut edge would show)
    const screen = s.screen === false ? '' : `<g transform="translate(570 1110)">
      ${nav ? `<rect x="-12" y="-136" width="244" height="84" rx="16" fill="#06070A" stroke="#2A2D36" stroke-width="4"/><rect x="0" y="-124" width="220" height="60" rx="10" fill="#1B6FE0"/>
        <text x="110" y="${nav[2] ? -98 : -86}" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="${nav[1].length > 12 ? 17 : 22}" fill="#FFFFFF">${nav[1]}</text>
        ${nav[2] ? `<text x="110" y="-74" text-anchor="middle" font-family="JB Mono" font-weight="600" font-size="13" fill="#D6E6FF">${nav[2]}</text>` : ''}` : ''}
      <rect x="-12" y="-12" width="244" height="164" rx="18" fill="#06070A" stroke="#2A2D36" stroke-width="4"/>
      <text x="${Math.round(speed) > 99 ? 117 : 114}" y="66" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="${Math.round(speed) > 99 ? 36 : 50}" fill="#F2F4F8">${Math.round(speed)}</text>
      <text x="122" y="88" text-anchor="middle" font-family="JB Mono" font-weight="600" font-size="13" fill="#7D8496">MPH</text>
      <rect x="98" y="97" width="84" height="7" rx="3.5" fill="#1F222B"/><rect x="98" y="97" width="${n(84 * sp)}" height="7" rx="3.5" fill="${speed > 100 ? '#FF5A4E' : '#5FB8FF'}"/>
      <rect x="108" y="112" width="78" height="20" rx="6" fill="${brake > 0.05 ? '#C8281E' : '#14151A'}"/><text x="147" y="126.5" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="12" fill="${brake > 0.05 ? '#FFFFFF' : '#3A3C45'}">BRAKE</text></g>`;
    const subject = `
      <!-- his window behind him: its frame, the B-pillar; the windscreen's A-pillar ahead of him -->
      <path d="M -400 -400 L 1500 -400 L 1500 470 C 1100 440, 700 440, 300 470 L -400 520 Z" fill="#0A0B0F"/>
      <path d="M -400 520 C 0 470, 400 460, 700 470" stroke="#1E2029" stroke-width="10" fill="none"/>
      <path d="M -400 1240 L 760 1250 L 760 1300 L -400 1300 Z" fill="#101116"/>
      <path d="M 120 470 L 60 1250 L 0 1250 L 40 470 Z" fill="#0C0D11"/>
      <path d="M 760 470 C 840 480, 900 520, 960 640 L 1500 1180 L 1500 1300 L 860 1300 L 760 1250 Z" fill="#0A0B0F" opacity="0.55"/>
      <path d="M 700 470 L 1040 820 L 1100 820 L 770 460 Z" fill="#111218"/>
      <!-- the seat: a bucket seat in black leather, gold stitching, the crown on its headrest -->
      <path d="M 40 640 C 40 520, 120 470, 240 470 L 380 470 C 480 470, 540 530, 540 640 L 560 1900 L 20 1900 Z" fill="#141419"/>
      <path d="M 90 650 C 90 560, 150 520, 240 520 L 370 520 C 450 520, 494 568, 494 650 L 510 1900 L 70 1900 Z" fill="#1B1B21"/>
      <path d="M 96 660 C 96 572, 154 532, 240 532 L 368 532 C 444 532, 486 576, 486 660" stroke="${GOLD}" stroke-width="2.5" fill="none" stroke-dasharray="7 5" opacity="0.8"/>
      <g transform="${place}">${F.founderSVG(p, id + 'f', 'body')}</g>
      <!-- the dash: the binnacle and its dials, the wheel, the centre console -->
      <path d="M 640 1180 C 760 1120, 980 1100, 1500 1110 L 1500 1500 L 640 1500 Z" fill="#0C0D11"/>
      <path d="M 640 1180 C 760 1120, 980 1100, 1500 1110" stroke="#2C2F38" stroke-width="5" fill="none"/>
      ${screen}
      <g transform="translate(${HIM.x} ${HIM.y}) scale(${HIM.s})"><g transform="rotate(-6 236 320)">
        <path d="M 236 320 L 200 214 M 236 320 L 200 426 M 236 320 L 290 320" stroke="#121317" stroke-width="24"/>
        <ellipse cx="236" cy="320" rx="34" ry="62" fill="#141519" stroke="#2C2E36" stroke-width="4"/>${crown(236, 320, 0.2)}
        <ellipse cx="236" cy="320" rx="74" ry="186" fill="none" stroke="#08080A" stroke-width="32"/>
        <ellipse cx="236" cy="320" rx="74" ry="186" fill="none" stroke="#23242A" stroke-width="22"/>
        <ellipse cx="236" cy="320" rx="74" ry="186" fill="none" stroke="${GOLD}" stroke-width="1.6" stroke-dasharray="5 6" opacity="0.6"/>
        <path d="M 236 134 A 74 186 0 0 1 280 144" stroke="${GOLD}" stroke-width="22" fill="none"/>
        <path d="M 182 190 A 74 186 0 0 1 236 134" stroke="#4A4C56" stroke-width="5" fill="none" opacity="0.7"/></g></g>
      <g transform="${place}">${F.founderSVG(p, id + 'f', 'arm')}</g>
      <ellipse cx="900" cy="1180" rx="380" ry="200" fill="#5FB8FF" opacity="${n(0.06 + flow * 0.04)}" style="mix-blend-mode:screen"/>
      ${brake > 0.05 ? `<rect x="-400" y="-400" width="1900" height="2400" fill="#FF2A1E" opacity="${n(brake * 0.08)}" style="mix-blend-mode:screen"/>` : ''}`;
    return [{ f: 0.25, svg: bg, blur: s.dof && s.dof.bg }, { f: 1, svg: subject, blur: s.dof && s.dof.all }, T.topShade(id)];
  };

  // ------------------------------------------------------------ the road, through the windscreen
  // The horizon at y 840, the road's vanishing point moving with the bend. Depth z runs from 1 (far)
  // to 0 (at the car); a thing at z is drawn at the screen height y = 840 + 900 * (1 - z) ** 2.4.
  SETS.road = (s, t, st, p, id) => {
    const speed = val(s.road, t, 'speed', 60), bend = val(s.road, t, 'bend', 0);
    let run = 0;
    for (let u = 0; u < t; u += 1 / 30) run += val(s.road, u, 'speed', 60) / 30;
    const VP = [540 + bend * 760, 840];
    const proj = (z, side) => {
      const y = 840 + 960 * Math.pow(1 - z, 2.6), k = (y - 840) / 960;
      const cx = 540 + bend * 760 * Math.pow(1 - k, 2.4);
      return [cx + side * 1500 * k, y, k];
    };
    // the road's edges and its dashed centre line, the dashes rushing towards us. We drive on the left:
    // the camera sits in the left lane, the centre line to its right, the far lane beyond it
    const edge = (side) => Array.from({ length: 30 }, (_, i) => proj(1 - i / 29, side)).map((q) => `${n(q[0])} ${n(q[1])}`).join(' L ');
    let dashes = '';
    for (let i = 0; i < 14; i++) {
      const z0 = 1 - (((i / 14 + run / 520) % 1) + 1) % 1, z1 = Math.max(0, z0 - 0.025);
      const a = proj(z0, 0.244), b = proj(z0, 0.256), c = proj(z1, 0.256), d = proj(z1, 0.244);
      dashes += `<path d="M ${n(a[0])} ${n(a[1])} L ${n(b[0])} ${n(b[1])} L ${n(c[0])} ${n(c[1])} L ${n(d[0])} ${n(d[1])} Z" fill="#F2F0E8" opacity="${n(0.4 + a[2] * 0.6)}"/>`;
    }
    // lamps on both sides, passing
    let lamps = '';
    for (let i = 0; i < 8; i++) {
      const z = 1 - (((i / 8 + run / 900) % 1) + 1) % 1;
      for (const side of [-0.42, 0.95]) {
        const [x, y, k] = proj(z, side), hgt = 2400 * k + 14;
        lamps += `<rect x="${n(x - 2 - 6 * k)}" y="${n(y - hgt)}" width="${n(4 + 12 * k)}" height="${n(hgt)}" fill="#0B0C12"/><ellipse cx="${n(x - side * 30 * k)}" cy="${n(y - hgt)}" rx="${n(6 + 50 * k)}" ry="${n(3 + 16 * k)}" fill="#FFE1A8" opacity="${n(0.6 + 0.4 * k)}"/>
          <ellipse cx="${n(x - side * 30 * k)}" cy="${n(y - hgt)}" rx="${n(20 + 140 * k)}" ry="${n(10 + 60 * k)}" fill="#FFD28A" opacity="${n(0.08 + 0.1 * k)}"/>`;
      }
    }
    // the sign or the lights coming up
    const things = [];
    for (const sg of s.sign || []) {
      const z = val(sg.keys, t, 'z', 2);
      if (z > 1 || z < 0.02) continue;
      const [x, y, k] = proj(z, sg.side ?? -0.5), w = 30 + 420 * k;
      const face = sg.kind === 'bend'
        ? `<path d="M 0 ${n(-w * 0.95)} L ${n(w * 0.5)} ${n(-w * 0.1)} L ${n(-w * 0.5)} ${n(-w * 0.1)} Z" fill="#FFFFFF" stroke="#D11F1F" stroke-width="${n(w * 0.08)}" stroke-linejoin="round"/><path d="M ${n(-w * 0.1)} ${n(-w * 0.22)} C ${n(-w * 0.1)} ${n(-w * 0.45)}, ${n(w * 0.12)} ${n(-w * 0.45)}, ${n(w * 0.12)} ${n(-w * 0.62)}" stroke="#111" stroke-width="${n(w * 0.06)}" fill="none"/>`
        : sg.kind === 'uturn'
          ? `<circle cx="0" cy="${n(-w * 0.5)}" r="${n(w * 0.45)}" fill="#FFFFFF" stroke="#D11F1F" stroke-width="${n(w * 0.08)}"/><path d="M ${n(-w * 0.12)} ${n(-w * 0.25)} L ${n(-w * 0.12)} ${n(-w * 0.6)} C ${n(-w * 0.12)} ${n(-w * 0.78)}, ${n(w * 0.16)} ${n(-w * 0.78)}, ${n(w * 0.16)} ${n(-w * 0.6)} L ${n(w * 0.16)} ${n(-w * 0.45)}" stroke="#111" stroke-width="${n(w * 0.06)}" fill="none"/><path d="M ${n(-w * 0.3)} ${n(-w * 0.82)} L ${n(w * 0.3)} ${n(-w * 0.18)}" stroke="#D11F1F" stroke-width="${n(w * 0.07)}"/>`
          : sg.kind === 'camera'
            ? `<rect x="${n(-w * 0.18)}" y="${n(-w * 0.9)}" width="${n(w * 0.36)}" height="${n(w * 0.5)}" fill="#E8C547" stroke="#111" stroke-width="${n(w * 0.03)}"/><circle cx="0" cy="${n(-w * 0.7)}" r="${n(w * 0.08)}" fill="#111"/>`
            : `<rect x="${n(-w * 0.6)}" y="${n(-w * 0.62)}" width="${n(w * 1.2)}" height="${n(w * 0.5)}" rx="${n(w * 0.05)}" fill="#1E6B3A" stroke="#FFFFFF" stroke-width="${n(w * 0.025)}"/><text x="0" y="${n(-w * 0.28)}" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="${n(w * 0.2)}" fill="#FFFFFF">${sg.text || 'EXIT'}</text>`;
      things.push({ z, svg: `<g transform="translate(${n(x)} ${n(y)})"><rect x="${n(-w * 0.02)}" y="${n(-w * 0.1)}" width="${n(w * 0.04 + 1)}" height="${n(w * 0.1 + 2)}" fill="#2A2B33"/>
        <rect x="${n(-w * 0.025)}" y="${n(-w * 0.12)}" width="${n(w * 0.05 + 1)}" height="${n(w * 0.12)}" fill="#3A3C46"/><g transform="translate(0 ${n(-w * 0.1)})">${face}</g></g>` });
    }
    // a car ahead, seen from behind: its body, its rear window, its tail lights (brighter when braking)
    if (s.ahead) {
      const az = val(s.ahead, t, 'z', 2), side = val(s.ahead, t, 'side', 0), lit = val(s.ahead, t, 'brake', 0);
      if (az <= 1 && az > 0.02) {
        const [x, y, k] = proj(az, side), w = 40 + 900 * k;
        // its tyres, the body and bumper, the rear window and roof, the tail lights (a glow when braking), the plate
        const W2 = (v) => n(v * w);
        things.push({ z: az, svg: `<g transform="translate(${n(x)} ${n(y)})"><ellipse cx="0" cy="${W2(-0.01)}" rx="${W2(0.56)}" ry="${W2(0.04)}" fill="#000" opacity="0.55"/>
          <rect x="${W2(-0.48)}" y="${W2(-0.13)}" width="${W2(0.13)}" height="${W2(0.13)}" rx="${W2(0.02)}" fill="#0A0A0C"/><rect x="${W2(0.35)}" y="${W2(-0.13)}" width="${W2(0.13)}" height="${W2(0.13)}" rx="${W2(0.02)}" fill="#0A0A0C"/>
          <path d="M ${W2(-0.4)} ${W2(-0.54)} L ${W2(0.4)} ${W2(-0.54)} L ${W2(0.47)} ${W2(-0.36)} L ${W2(-0.47)} ${W2(-0.36)} Z" fill="#7A0E12"/>
          <path d="M ${W2(-0.34)} ${W2(-0.51)} L ${W2(0.34)} ${W2(-0.51)} L ${W2(0.41)} ${W2(-0.38)} L ${W2(-0.41)} ${W2(-0.38)} Z" fill="#14161E"/><path d="M ${W2(-0.3)} ${W2(-0.49)} L ${W2(-0.12)} ${W2(-0.49)} L ${W2(-0.2)} ${W2(-0.4)} L ${W2(-0.37)} ${W2(-0.4)} Z" fill="#FFFFFF" opacity="0.08"/>
          <rect x="${W2(-0.52)}" y="${W2(-0.37)}" width="${W2(1.04)}" height="${W2(0.27)}" rx="${W2(0.05)}" fill="#9C1418"/>
          <rect x="${W2(-0.5)}" y="${W2(-0.14)}" width="${W2(1)}" height="${W2(0.06)}" rx="${W2(0.02)}" fill="#3A0A0C"/>
          ${[-1, 1].map((q) => `<rect x="${W2(q > 0 ? 0.3 : -0.48)}" y="${W2(-0.33)}" width="${W2(0.18)}" height="${W2(0.06)}" rx="${W2(0.015)}" fill="${lit > 0.5 ? '#FF4A3E' : '#E0302A'}"/>${lit > 0.05 ? `<ellipse cx="${W2(q * 0.39)}" cy="${W2(-0.3)}" rx="${W2(0.13)}" ry="${W2(0.05)}" fill="#FF3A2E" opacity="${n(0.35 * lit)}"/>` : ''}`).join('')}
          <rect x="${W2(-0.1)}" y="${W2(-0.25)}" width="${W2(0.2)}" height="${W2(0.06)}" rx="${W2(0.01)}" fill="#F2C230"/></g>` });
      }
    }
    const sig = step(s.signal, t, null), lightZ = val(s.lightz, t, 'z', 2);
    if (sig && lightZ <= 1 && lightZ > 0.02) {
      const [x, y, k] = proj(lightZ, -0.4), w = 26 + 260 * k, pole = 30 + 760 * k;
      const lamp = (i, col, on) => `<circle cx="0" cy="${n(-pole - w * (1.25 - i * 0.42))}" r="${n(w * 0.16)}" fill="${on ? col : '#1A1A1E'}"/>${on ? `<circle cx="0" cy="${n(-pole - w * (1.25 - i * 0.42))}" r="${n(w * 0.5)}" fill="${col}" opacity="0.22"/>` : ''}`;
      things.push({ z: lightZ, svg: `<g transform="translate(${n(x)} ${n(y)})"><rect x="${n(-w * 0.04)}" y="${n(-pole)}" width="${n(w * 0.08 + 1)}" height="${n(pole)}" fill="#1A1B21"/>
        <rect x="${n(-w * 0.26)}" y="${n(-pole - w * 1.48)}" width="${n(w * 0.52)}" height="${n(w * 1.36)}" rx="${n(w * 0.08)}" fill="#0B0B0E" stroke="#2A2B32" stroke-width="${n(1 + w * 0.02)}"/>
        ${lamp(0, '#FF3B30', sig[1] === 'red' || sig[1] === 'redamber')}${lamp(1, '#FFB020', sig[1] === 'amber' || sig[1] === 'redamber')}${lamp(2, '#2FD06A', sig[1] === 'green')}</g>` });
      // the stop line across the road
      const a = proj(lightZ - 0.01, -0.25), b = proj(lightZ - 0.01, 0.25), c = proj(lightZ - 0.03, 0.25), d = proj(lightZ - 0.03, -0.25);
      things.push({ z: lightZ + 0.001, svg: `<path d="M ${n(a[0])} ${n(a[1])} L ${n(b[0])} ${n(b[1])} L ${n(c[0])} ${n(c[1])} L ${n(d[0])} ${n(d[1])} Z" fill="#F2F0E8" opacity="0.85"/>` });
    }
    things.sort((a, b) => b.z - a.z);
    const fl = (s.flash || []).map((f) => t - at(f)).filter((d) => d >= 0 && d < 0.35)[0];
    const r = rng(77);
    let sky = '';
    for (let i = 0; i < 12; i++) {
      const x = -300 + i * 150 + r() * 40, w = 90 + r() * 90, top = 560 + r() * 240;
      sky += `<rect x="${n(x - bend * 160)}" y="${n(top)}" width="${n(w)}" height="${n(860 - top)}" fill="${i % 2 ? '#0E1120' : '#0B0E1A'}"/>`;
      const rr = rng(200 + i);
      for (let wy = top + 14; wy < 830; wy += 22) for (let wx = x + 10; wx < x + w - 10; wx += 18) if (rr() < 0.3) sky += `<rect x="${n(wx - bend * 160)}" y="${n(wy)}" width="8" height="11" fill="#F6C46A" opacity="${n(0.3 + rr() * 0.5)}"/>`;
    }
    const sp = cl(speed / 180);
    const subject = `<defs><linearGradient id="${id}rsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05070F"/><stop offset="1" stop-color="#1F2648"/></linearGradient>
        <linearGradient id="${id}rtar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A1C24"/><stop offset="1" stop-color="#0A0B0F"/></linearGradient></defs>
      <rect x="-400" y="-400" width="1900" height="1260" fill="url(#${id}rsky)"/>${sky}
      <rect x="-400" y="838" width="1900" height="1400" fill="#07080C"/>
      <path d="M ${edge(-0.25)} L ${edge(0.75).split(' L ').reverse().join(' L ')} Z" fill="url(#${id}rtar)"/>
      <path d="M ${edge(-0.25)}" stroke="#D9D6CC" stroke-width="5" fill="none" opacity="0.7"/><path d="M ${edge(0.75)}" stroke="#D9D6CC" stroke-width="5" fill="none" opacity="0.7"/>
      ${dashes}${lamps}${things.map((q) => q.svg).join('')}
      ${fl != null ? `<rect x="-400" y="-400" width="1900" height="2400" fill="#FFFFFF" opacity="${n(0.75 * (1 - fl / 0.35))}"/>` : ''}
      <!-- the windscreen's frame, the mirror and the crown hanging from it -->
      <path d="M -400 -400 L 1500 -400 L 1500 300 C 1100 250, -20 250, -400 300 Z" fill="#07080B"/>
      <path d="M -400 300 C -20 250, 1100 250, 1500 300" stroke="#1C1E25" stroke-width="10" fill="none"/>
      <path d="M -400 300 L 120 300 L -40 1500 L -400 1500 Z" fill="#08090C"/><path d="M 1500 300 L 960 300 L 1120 1500 L 1500 1500 Z" fill="#08090C"/>
      <rect x="420" y="300" width="240" height="70" rx="20" fill="#0B0C10" stroke="#24262E" stroke-width="4"/><rect x="434" y="312" width="212" height="46" rx="14" fill="#141826"/>
      <path d="M 540 370 L 540 440" stroke="#8C7238" stroke-width="2"/>${crown(540, 462, 0.16)}
      <!-- the dash and the wheel's rim, its stitching and the gold mark at twelve -->
      <path d="M -400 1340 C 100 1240, 980 1240, 1500 1340 L 1500 2400 L -400 2400 Z" fill="#0B0C10"/>
      <path d="M -400 1340 C 100 1240, 980 1240, 1500 1340" stroke="#2A2D36" stroke-width="6" fill="none"/>
      <path d="M 120 1920 C 120 1520, 960 1520, 960 1920" stroke="#0A0A0C" stroke-width="80" fill="none"/>
      <path d="M 120 1920 C 120 1520, 960 1520, 960 1920" stroke="#23242A" stroke-width="58" fill="none"/>
      <path d="M 120 1920 C 120 1520, 960 1520, 960 1920" stroke="${GOLD}" stroke-width="2" fill="none" stroke-dasharray="6 6" opacity="0.6"/>
      <path d="M 540 1610 L 540 1640" stroke="${GOLD}" stroke-width="58"/>
      <g transform="translate(540 1420)"><rect x="-150" y="-62" width="300" height="104" rx="20" fill="#06070A" stroke="#2A2D36" stroke-width="4"/>
        <text x="-20" y="18" text-anchor="end" font-family="TCP Display" font-weight="800" font-size="64" fill="#F2F4F8">${Math.round(speed)}</text><text x="0" y="16" font-family="JB Mono" font-weight="600" font-size="20" fill="#7D8496">MPH</text>
        <rect x="-130" y="30" width="${n(260 * sp)}" height="6" rx="3" fill="${speed > 100 ? '#FF5A4E' : '#5FB8FF'}"/></g>
      <rect x="-400" y="-400" width="1900" height="2400" fill="#5FB8FF" opacity="0.03" style="mix-blend-mode:screen"/>`;
    return [{ f: 1, svg: subject, blur: s.dof && s.dof.all }, T.topShade(id)];
  };

  // ------------------------------------------------------------ the tarmac
  // His jet on the apron at sunrise, side on and facing left. 150 units to a metre: the apron at y
  // 1500, the cabin floor (the door's sill) 1 m up, the fuselage 2 m deep. The door behind the
  // cockpit; the airstair from its sill down to a red carpet, with a solid side wall as high as his
  // hips, so that from here only his top half shows as he climbs. Him: a 0.157 scale founder.
  const JET = { ground: 1500, door: [450, 1066, 140, 280], foot: [900, 1500] };
  SETS.tarmac = (s, t, st, p, id) => {
    p.light = { ...p.light, tint: '#FFC98A', rim: 1 };
    p.flip = true;
    const k = cl(val(s.climb, t, 'k', 0));
    const bg = `<defs><linearGradient id="${id}tsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B3A6E"/><stop offset="0.45" stop-color="#C77A6A"/><stop offset="0.75" stop-color="#F6B97A"/><stop offset="1" stop-color="#FFE0A8"/></linearGradient>
        <radialGradient id="${id}tsun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFF4D6"/><stop offset="0.25" stop-color="#FFE3A6" stop-opacity="0.8"/><stop offset="1" stop-color="#FFC88A" stop-opacity="0"/></radialGradient></defs>
      <rect x="-1400" y="-800" width="4400" height="3600" fill="url(#${id}tsky)"/>
      <circle cx="160" cy="1150" r="300" fill="url(#${id}tsun)"/><circle cx="160" cy="1150" r="70" fill="#FFF6DC"/>
      ${[[-300, 640, 300], [400, 520, 240], [900, 700, 340], [1500, 600, 300], [2200, 680, 260]].map(([x, y, w]) => `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${n(w * 0.12)}" fill="#F7C9A0" opacity="0.35"/>`).join('')}
      <path d="M -1400 1240 L -500 1200 L -380 1230 L -200 1180 L 0 1230 L 300 1200 L 520 1236 L 800 1196 L 1100 1232 L 1400 1210 L 1800 1236 L 2200 1200 L 3000 1240 L 3000 1300 L -1400 1300 Z" fill="#6E5A6A" opacity="0.7"/>
      <rect x="-1400" y="1290" width="4400" height="30" fill="#8B7377" opacity="0.6"/>
      ${[-900, -300, 1300, 2300].map((x) => `<rect x="${x}" y="1180" width="16" height="110" fill="#4A3E48" opacity="0.8"/><rect x="${x - 40}" y="1170" width="96" height="14" fill="#4A3E48" opacity="0.8"/>`).join('')}`;
    const [DX, DY, DW, DH] = JET.door, sill = DY + DH, [fx, fy] = JET.foot;
    const jet = `<defs><linearGradient id="${id}tfus" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.45" stop-color="#F1EDE7"/><stop offset="0.8" stop-color="#CFC8BE"/><stop offset="1" stop-color="#A39B91"/></linearGradient>
        <linearGradient id="${id}tapr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B9A79A"/><stop offset="1" stop-color="#6F625B"/></linearGradient>
        <linearGradient id="${id}tglow" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFC98A" stop-opacity="0.55"/><stop offset="1" stop-color="#FFC98A" stop-opacity="0"/></linearGradient></defs>
      <rect x="-1400" y="1300" width="4400" height="1500" fill="url(#${id}tapr)"/>
      <path d="M -1400 1580 L 3000 1580" stroke="#E8C547" stroke-width="10" opacity="0.8"/><path d="M -1400 1720 L 3000 1720" stroke="#F2EEE6" stroke-width="6" opacity="0.4"/>
      <ellipse cx="1000" cy="1506" rx="1050" ry="26" fill="#000" opacity="0.28"/>
      <!-- the tail: the fin, the T on top, the crown -->
      <path d="M 1760 1080 L 1870 760 L 1990 760 L 2020 1150 Z" fill="url(#${id}tfus)"/><path d="M 1800 780 L 2080 770 L 2090 800 L 1820 806 Z" fill="#E9E4DC"/>
      <path d="M 1840 860 L 1990 856" stroke="${GOLD}" stroke-width="10"/>${crown(1930, 950, 0.28)}
      <!-- the engine on its pylon -->
      <path d="M 1560 1060 L 1660 1110 L 1640 1130 L 1550 1090 Z" fill="#D9D3CA"/>
      <rect x="1480" y="990" width="300" height="96" rx="48" fill="url(#${id}tfus)"/><ellipse cx="1486" cy="1038" rx="20" ry="46" fill="#2A2E38"/><ellipse cx="1486" cy="1038" rx="10" ry="30" fill="#4A505E"/>
      <path d="M 1560 1010 L 1740 1010" stroke="${GOLD}" stroke-width="4" opacity="0.8"/>
      <!-- the fuselage: the nose at left, the cockpit's windows, the oval cabin windows, a gold cheatline -->
      <path d="M 100 1300 C 120 1170, 250 1084, 420 1066 L 1700 1040 C 1820 1044, 1920 1100, 2020 1180 L 2040 1260 C 1940 1330, 1820 1350, 1700 1350 L 420 1350 C 250 1350, 130 1336, 100 1300 Z" fill="url(#${id}tfus)"/>
      <path d="M 160 1170 C 190 1124, 240 1100, 300 1094 L 330 1128 C 278 1134, 226 1146, 188 1176 Z" fill="#1B2232"/><path d="M 340 1094 L 400 1090 L 404 1124 L 352 1128 Z" fill="#1B2232"/>
      <path d="M 120 1262 C 400 1252, 1200 1240, 2030 1236" stroke="${GOLD}" stroke-width="10" fill="none"/>
      <path d="M 120 1276 C 400 1266, 1200 1254, 2030 1250" stroke="#1B2232" stroke-width="4" fill="none" opacity="0.6"/>
      ${[660, 790, 920, 1050, 1180, 1310, 1440].map((x) => `<rect x="${x}" y="1130" width="56" height="70" rx="26" fill="#1B2232"/><rect x="${x + 7}" y="1137" width="17" height="32" rx="8" fill="#FFFFFF" opacity="0.25"/><ellipse cx="${x + 28}" cy="1165" rx="44" ry="50" fill="#FFD28A" opacity="0.07"/>`).join('')}
      <!-- the wing, swept back towards us, its winglet with the crown -->
      <path d="M 900 1330 L 1260 1320 L 1500 1420 L 1420 1440 L 1060 1400 Z" fill="#DCD6CD"/><path d="M 900 1330 L 1260 1320 L 1500 1420" stroke="#F8F6F2" stroke-width="5" fill="none"/>
      <path d="M 1430 1420 L 1500 1420 L 1540 1330 L 1510 1332 Z" fill="#E9E4DC"/>${crown(1508, 1386, 0.1)}
      <!-- the gear -->
      <rect x="276" y="1350" width="14" height="110" fill="#5A5550"/><circle cx="283" cy="1468" r="30" fill="#141416"/><circle cx="283" cy="1468" r="12" fill="#8C8378"/>
      <rect x="1196" y="1380" width="18" height="80" fill="#5A5550"/><circle cx="1188" cy="1462" r="38" fill="#141416"/><circle cx="1230" cy="1462" r="38" fill="#141416"/><circle cx="1188" cy="1462" r="14" fill="#8C8378"/><circle cx="1230" cy="1462" r="14" fill="#8C8378"/>
      <!-- the doorway: the warm cabin inside, the door's frame -->
      <rect x="${DX}" y="${DY}" width="${DW}" height="${DH}" rx="22" fill="#2A1C12"/>
      <rect x="${DX}" y="${DY}" width="${DW}" height="${DH}" rx="22" fill="url(#${id}tglow)"/>
      <rect x="${DX + 26}" y="${DY + 40}" width="60" height="70" rx="20" fill="#F2D6A8" opacity="0.35"/>
      <rect x="${DX}" y="${DY}" width="${DW}" height="${DH}" rx="22" fill="none" stroke="#9B9189" stroke-width="5"/>`;
    // the stairs: from the sill down to the carpet, the steps behind him, the wall in front of him
    const A = [DX + DW, sill], B = [fx, fy];
    const at2 = (u) => [mix(A[0], B[0], u), mix(A[1], B[1], u)];
    const steps = Array.from({ length: 7 }, (_, i) => { const [x, y] = at2((i + 0.5) / 7); return `<path d="M ${n(x - 40)} ${n(y)} L ${n(x + 30)} ${n(y)}" stroke="#4E4844" stroke-width="7"/><path d="M ${n(x - 40)} ${n(y - 4)} L ${n(x + 30)} ${n(y - 4)}" stroke="#7A726A" stroke-width="2"/>`; }).join('');
    const stairsBack = `<path d="M ${A[0] - 20} ${A[1] - 6} L ${B[0] + 40} ${B[1] - 6} L ${B[0] + 40} ${B[1] + 4} L ${A[0] - 20} ${A[1] + 10} Z" fill="#3E3935"/>${steps}`;
    const H = 172;
    const ext = (u) => at2(u);
    const [w0, w1] = [ext(-0.06), ext(1.08)];
    const wall = `<path d="M ${n(w0[0])} ${n(w0[1] - H)} L ${n(w1[0])} ${n(w1[1] - H)} L ${n(w1[0])} ${n(w1[1] + 6)} L ${n(w0[0])} ${n(w0[1] + 60)} Z" fill="url(#${id}tfus)"/>
      <path d="M ${n(w0[0])} ${n(w0[1] - H + 30)} L ${n(w1[0])} ${n(w1[1] - H + 30)}" stroke="${GOLD}" stroke-width="6"/>
      <path d="M ${n(w0[0])} ${n(w0[1] - H)} L ${n(w1[0])} ${n(w1[1] - H)}" stroke="#8C8378" stroke-width="9" stroke-linecap="round"/>
      <path d="M ${n(w0[0])} ${n(w0[1] - H)} L ${n(w1[0])} ${n(w1[1] - H)}" stroke="#E9E4DC" stroke-width="3" stroke-linecap="round"/>
      <path d="M ${n(w1[0])} ${n(w1[1] + 6)} L ${n(w0[0])} ${n(w0[1] + 60)}" stroke="#7A726A" stroke-width="4"/>`;
    const carpet = `<path d="M ${fx - 30} ${fy} L ${fx + 700} ${fy} L ${fx + 820} ${fy + 190} L ${fx - 60} ${fy + 190} Z" fill="#9E1C22"/><path d="M ${fx - 30} ${fy} L ${fx + 700} ${fy}" stroke="${GOLD}" stroke-width="5"/>
      <path d="M ${fx - 44} ${fy + 96} L ${fx + 760} ${fy + 96}" stroke="#7E141A" stroke-width="3" opacity="0.6"/>`;
    // him: his feet on the stair at k (0 at the foot, 1 at the sill), his top half above the wall
    const hs = 0.157, foot = k < 1 ? at2(1 - k) : A, bob = Math.abs(Math.sin(k * Math.PI * 7)) * 4;
    const him = `<g transform="translate(${n(foot[0] + 10)} ${n(foot[1] - 248 - bob)}) scale(${hs})">${F.founderSVG(p, id + 'f', 'all')}</g>`;
    const subject = `${jet}${carpet}${stairsBack}${him}${wall}`;
    return [{ f: 0.3, svg: bg, blur: s.dof && s.dof.bg }, { f: 1, svg: subject, blur: s.dof && s.dof.all }, T.topShade(id)];
  };
})();
