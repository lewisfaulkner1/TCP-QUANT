// The Fast Lane: the founder's supercar and his jet, for a series about discipline at speed. The car
// and the jet are cartoon props: drawn for the metaphor, never shown as what trading paid for.
//
//   street   his car on a wet street at night, side on and facing left: gloss black, gold wheels, the
//            TCP crown on its nose. Its near door (his, the driver's) is a scissor door: s.door:
//            [{ t, k }] lifts it (0 shut, 1 up). Him in the driver's seat behind it, seen through the
//            opening (or faintly through the tinted glass when it's shut). s.drive: [{ t, x }] moves
//            the car along the road (negative is forwards, to the left); s.lights: [{ t, k }] its lights;
//            s.tag: a dealer's sticker at the front of the door's window (TEST DRIVE)
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
  // A mid-engined V12 supercar drawn to a real one's proportions (the scissor-doored Lamborghini
  // Aventador LP 700-4: 4.78 m long, 1.14 m high, a 2.70 m wheelbase, 255/35 R19 tyres at the front
  // and 335/30 R20 at the back) and its design language (one wedge line from nose to tail, a raked
  // windscreen, angular arches, a crease rising to the back, the big side intake), in our own lines,
  // with the TCP crown and no maker's badge. Car space: the nose at x 0, the tail at x 1000 (a unit is
  // 4.78 mm), the ground at y 0, the roof at y -238.
  const FW = { x: 222, r: 69, rim: 50 }, RW = { x: 787, r: 74, rim: 53 };
  // the wheel arches, angular as on the real car and a little clear of the tyres
  const ARCH_F = [[132, -28], [138, -96], [172, -150], [268, -152], [302, -112], [310, -28]];
  const ARCH_R = [[694, -28], [700, -104], [732, -162], [839, -164], [875, -120], [882, -28]];
  const pts = (list) => list.map(([x, y]) => `${x} ${y}`).join(' L ');
  const rev = (list) => list.slice().reverse();
  // the body: the nose, the bonnet rising to the windscreen, the roof, the engine cover falling to the
  // tail, the diffuser, then back along the bottom through the arches and the sill
  const BODY = `M 12 -22 C 4 -30, 0 -44, 0 -60 C 2 -76, 10 -92, 24 -102 C 90 -118, 200 -142, 300 -160
    C 360 -190, 420 -218, 468 -232 C 500 -239, 556 -239, 592 -234 C 700 -224, 830 -210, 930 -201 L 988 -196 L 999 -188
    C 1001 -160, 1000 -120, 995 -84 L 984 -60 L 962 -44 L 940 -38 L ${pts(rev(ARCH_R))} L ${pts(rev(ARCH_F))} L 40 -26 Z`;
  // the side window: the A-pillar's foot, up the windscreen's edge, along the roof, down its back
  // edge and forward along the beltline, which rises towards the back
  const DLO = 'M 334 -172 L 462 -225 C 496 -232, 552 -232, 582 -228 L 612 -186 C 520 -183, 420 -178, 334 -172 Z';
  // the scissor door: behind the front arch, up the A-pillar, over the roof, down its back edge to the
  // side intake and the sill; it swings up about a hinge at the A-pillar's foot
  const DOOR = 'M 314 -36 L 308 -148 L 322 -166 L 466 -229 C 500 -236, 556 -236, 588 -232 L 634 -152 L 606 -36 Z';
  const HINGE = [310, -150];
  // the character line: from the door's front, rising along it to the side intake and on over the
  // rear haunch to the tail
  const CREASE = 'M 300 -118 C 420 -128, 540 -140, 636 -150 L 722 -162 C 790 -172, 900 -182, 996 -187';
  // a wheel: the tyre and its sidewall, the drilled disc and its calliper (which stays put as the
  // wheel turns), five twin spokes in gold, the lug nuts and the crown on the centre cap
  function wheel(id, w, spin, glow) {
    const cx = w.x, cy = -w.r, R = w.r, M = w.rim, P = (r, a) => `${n(cx + Math.cos(a) * r)} ${n(cy + Math.sin(a) * r)}`;
    let holes = '', spokes = '', nuts = '';
    for (let i = 0; i < 24; i++) holes += `<circle cx="${n(cx + Math.cos(spin + i * Math.PI / 12) * M * 0.7)}" cy="${n(cy + Math.sin(spin + i * Math.PI / 12) * M * 0.7)}" r="1.6" fill="#1A1B1F"/>`;
    for (let i = 0; i < 5; i++) {
      const a = spin + (i * 2 * Math.PI) / 5;
      // each spoke a stem from the hub that splits in two towards the rim; its side face, darker,
      // shows its depth
      for (const d of [-0.2, 0.2]) {
        const b = a + d;
        spokes += `<path d="M ${P(M * 0.26, a - 0.16)} L ${P(M * 0.52, a + d * 0.35 - 0.1)} L ${P(M - 1, b - 0.07)} L ${P(M - 1, b + 0.07)} L ${P(M * 0.52, a + d * 0.35 + 0.1)} L ${P(M * 0.26, a + 0.16)} Z" fill="#6E5320"/>`;
        spokes += `<path d="M ${P(M * 0.26, a - 0.13)} L ${P(M * 0.52, a + d * 0.35 - 0.08)} L ${P(M - 2, b - 0.055)} L ${P(M - 2, b + 0.055)} L ${P(M * 0.52, a + d * 0.35 + 0.08)} L ${P(M * 0.26, a + 0.13)} Z" fill="url(#${id}cgold)"/>`;
      }
      nuts += `<circle cx="${n(cx + Math.cos(a + Math.PI / 5) * M * 0.35)}" cy="${n(cy + Math.sin(a + Math.PI / 5) * M * 0.35)}" r="2.2" fill="#8C6420"/>`;
    }
    // the calliper over the disc, behind the spokes, at the top towards the back of the car
    const ca = [-1.25, -0.45], co = M * 0.86, ci = M * 0.54;
    const calliper = `<path d="M ${P(co, ca[0])} A ${n(co)} ${n(co)} 0 0 1 ${P(co, ca[1])} L ${P(ci, ca[1])} A ${n(ci)} ${n(ci)} 0 0 0 ${P(ci, ca[0])} Z" fill="#B3121A"/>
      <path d="M ${P(co - 2, ca[0] + 0.06)} A ${n(co - 2)} ${n(co - 2)} 0 0 1 ${P(co - 2, ca[1] - 0.06)}" stroke="#E2484E" stroke-width="2" fill="none" opacity="0.8"/>`;
    return `<circle cx="${cx}" cy="${n(cy)}" r="${R}" fill="#09090B"/>
      <circle cx="${cx}" cy="${n(cy)}" r="${n((R + M) / 2)}" fill="none" stroke="#18181C" stroke-width="${n(R - M - 4)}"/>
      <path d="M ${P(R - 3, -2.5)} A ${R - 3} ${R - 3} 0 0 1 ${P(R - 3, -0.65)}" stroke="#30313A" stroke-width="2.6" fill="none" opacity="0.9"/>
      <circle cx="${cx}" cy="${n(cy)}" r="${M}" fill="#0D0D10"/>
      <circle cx="${cx}" cy="${n(cy)}" r="${n(M * 0.82)}" fill="#4A4C53"/><circle cx="${cx}" cy="${n(cy)}" r="${n(M * 0.82)}" fill="none" stroke="#2C2D33" stroke-width="2.5"/>
      <circle cx="${cx}" cy="${n(cy)}" r="${n(M * 0.58)}" fill="none" stroke="#5E6068" stroke-width="1.6" opacity="0.7"/>${holes}
      <circle cx="${cx}" cy="${n(cy)}" r="${n(M * 0.37)}" fill="#26272C"/>
      ${calliper}
      ${spokes}
      <circle cx="${cx}" cy="${n(cy)}" r="${M - 1}" fill="none" stroke="url(#${id}cgold)" stroke-width="3.6"/>
      <circle cx="${cx}" cy="${n(cy)}" r="${M - 3}" fill="none" stroke="#5C4418" stroke-width="1" opacity="0.8"/>
      <circle cx="${cx}" cy="${n(cy)}" r="${n(M * 0.28)}" fill="url(#${id}cgold)"/>${nuts}
      <circle cx="${cx}" cy="${n(cy)}" r="${n(M * 0.2)}" fill="#121214" stroke="#8C6420" stroke-width="1.3"/>${crown(cx, cy, 0.055)}
      <path d="M ${P(M + 6, -2.6)} A ${M + 6} ${M + 6} 0 0 1 ${P(M + 6, -1.6)}" fill="none" stroke="${glow}" stroke-width="2.6" opacity="0.3"/>`;
  }
  // The car: k.door (0..1), k.spin (wheel turn, radians), k.lights (0..1), k.tag, k.inside: what is
  // drawn in the cabin (him), k.reflect: drawn as its own reflection (no cabin, no glow)
  function car(id, k) {
    const ang = -76 * smoothstep(cl(k.door || 0));
    const lit = cl(k.lights || 0);
    // the door's skin: the paint and its gloss, the glass, the crease running on from the body, the
    // wing mirror at the door's front, the dealer's sticker at the front of the window
    const doorSkin = `<path d="${DOOR} ${DLO}" fill="url(#${id}cpaint)" fill-rule="evenodd"/>
      <clipPath id="${id}cdc"><path d="${DOOR}"/></clipPath>
      <g clip-path="url(#${id}cdc)">
        <rect x="290" y="-240" width="360" height="120" fill="url(#${id}csky)"/>
        <path d="${DLO}" fill="url(#${id}cglass)"/>
        <path d="M 352 -176 L 440 -216 L 470 -216 L 386 -177 Z" fill="#FFFFFF" opacity="0.07"/>
        <path d="M 488 -228 L 530 -229 L 486 -182 L 456 -181 Z" fill="#FFFFFF" opacity="0.04"/>
        <path d="${CREASE}" stroke="url(#${id}cline)" stroke-width="2.6" fill="none"/>
        <path d="${CREASE}" stroke="#030304" stroke-width="2" fill="none" transform="translate(0 4)" opacity="0.8"/>
        <path d="M 320 -100 C 420 -110, 520 -118, 630 -126" stroke="#9FB4D8" stroke-width="5" fill="none" opacity="0.07"/>
        <path d="M 316 -58 L 606 -56" stroke="#24262D" stroke-width="2" opacity="0.7"/>
        ${k.tag ? `<g transform="translate(474 -195) rotate(-3)"><rect x="-38" y="-10" width="76" height="20" rx="3" fill="#F4F1EA"/><rect x="-35" y="-7" width="70" height="14" rx="2" fill="none" stroke="#C8281E" stroke-width="0.8"/><text x="0" y="3.6" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="8.4" fill="#C8281E">${k.tag}</text></g>` : ''}
      </g>
      <path d="${DOOR}" fill="none" stroke="#020203" stroke-width="2"/>
      <path d="${DLO}" fill="none" stroke="#020203" stroke-width="2.6"/>
      <path d="M 338 -172 L 344 -180" stroke="#0A0B0E" stroke-width="5" stroke-linecap="round"/>
      <path d="M 314 -186 L 348 -195 L 358 -183 L 324 -176 Z" fill="url(#${id}cpaint)" stroke="#020203" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M 318 -187 L 348 -194" stroke="#9FB4D8" stroke-width="1.4" opacity="0.6"/>`;
    const cabin = `<clipPath id="${id}cop"><path d="${DOOR}"/></clipPath>
      <g clip-path="url(#${id}cop)">
        <rect x="290" y="-250" width="360" height="230" fill="#0B0C10"/>
        <path d="M 590 -240 L 650 -240 L 650 -40 L 580 -40 Z" fill="#141519"/>
        ${k.inside || ''}
        <path d="M 290 -62 L 650 -62 L 650 -30 L 290 -30 Z" fill="#17181C"/><path d="M 290 -62 L 650 -62" stroke="${GOLD}" stroke-width="2" opacity="0.6"/>
      </g>`;
    // the engine cover's louvres, following it down towards the tail
    let louvres = '';
    for (let i = 0; i < 10; i++) {
      const x = 640 + i * 26, y = -230 + i * 2.8;
      louvres += `<path d="M ${x} ${n(y)} L ${x + 16} ${n(y + 1.4)}" stroke="#1C1E25" stroke-width="3" stroke-linecap="round"/>`;
    }
    const wells = `<path d="M ${pts(ARCH_F)} Z" fill="#030304"/><path d="M ${pts(ARCH_R)} Z" fill="#030304"/>`;
    return `
      ${k.reflect ? '' : cabin}
      <g ${k.reflect ? '' : `mask="url(#${id}chole)"`}>
      <clipPath id="${id}cbc"><path d="${BODY}"/></clipPath>
      <path d="${BODY}" fill="url(#${id}cpaint)"/>
      <g clip-path="url(#${id}cbc)">
        <!-- the sky in the upper surfaces, the street in the side, a soft horizon line between -->
        <rect x="-10" y="-250" width="1020" height="120" fill="url(#${id}csky)"/>
        <path d="M 30 -98 C 200 -122, 420 -130, 620 -138 C 780 -146, 900 -160, 1000 -168" stroke="#9FB4D8" stroke-width="7" fill="none" opacity="0.08"/>
        <path d="M 120 -104 C 300 -112, 520 -118, 700 -126" stroke="#C8D6F0" stroke-width="1.6" fill="none" opacity="0.28"/>
        <rect x="-10" y="-70" width="1020" height="60" fill="#000" opacity="0.35"/>
        ${[[180, -128], [520, -142], [860, -176]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="26" ry="3" fill="#FFE1A8" opacity="0.22"/>`).join('')}
      </g>
      <!-- the character line and its highlight; the sill's crisp edge and the carbon skirt -->
      <path d="${CREASE}" stroke="url(#${id}cline)" stroke-width="2.6" fill="none"/>
      <path d="${CREASE}" stroke="#030304" stroke-width="2" fill="none" transform="translate(0 4)" opacity="0.8"/>
      <path d="M 310 -52 L 694 -54 L 694 -28 L 310 -28 Z" fill="#0A0A0C"/><path d="M 310 -52 L 694 -54" stroke="#2E313A" stroke-width="1.8"/>
      <!-- the nose: the bonnet's edge, the crown, the slim headlight with its Y of light, the intake and
        splitter under it -->
      <path d="M 26 -100 C 100 -118, 210 -142, 300 -160" stroke="#3A3F4C" stroke-width="1.6" fill="none" opacity="0.8"/>
      ${crown(54, -104, 0.07)}
      <path d="M 12 -88 L 98 -112 L 106 -106 L 22 -82 Z" fill="#11131A" stroke="#020203" stroke-width="1.4"/>
      <path d="M 26 -88 L 60 -98 M 60 -98 L 74 -106 M 60 -98 L 78 -97" stroke="${lit > 0.05 ? '#FFFFFF' : '#5A6378'}" stroke-width="2" stroke-linecap="round" opacity="${lit > 0.05 ? n(0.45 + 0.55 * lit) : 1}"/>
      ${lit > 0.05 && !k.reflect ? `<ellipse cx="34" cy="-90" rx="34" ry="9" fill="#EAF4FF" opacity="${n(0.6 * lit)}" filter="url(#${id}cb6)"/>
        <path d="M 14 -92 L -320 -134 L -320 -24 L 14 -72 Z" fill="url(#${id}cbeam2)" opacity="${n(0.4 * lit)}" filter="url(#${id}cb6)"/>` : ''}
      <path d="M 6 -46 L 92 -62 L 120 -36 L 16 -28 Z" fill="#050506"/>
      ${[0, 1, 2].map((i) => `<path d="M ${30 + i * 26} -54 L ${42 + i * 26} -32" stroke="#16171C" stroke-width="2.4"/>`).join('')}
      <path d="M 4 -24 L 132 -26" stroke="#22242B" stroke-width="3"/>
      <!-- the bonnet's vent, the engine cover and its louvres, the roof catching the sky -->
      <path d="M 214 -142 L 268 -152 L 270 -147 L 216 -137 Z" fill="#050506"/>
      <path d="M 600 -234 C 700 -224, 830 -210, 928 -201 L 924 -192 C 830 -201, 700 -214, 604 -224 Z" fill="#0A0B0F"/>${louvres}
      <path d="M 606 -232 C 700 -223, 820 -211, 920 -202" stroke="#8FA2C8" stroke-width="1.8" fill="none" opacity="0.35"/>
      <path d="M 430 -224 C 480 -238, 560 -239, 620 -232" stroke="#B4C6E6" stroke-width="2.6" fill="none" opacity="0.5"/>
      <!-- the side intake behind the door, its fins, and the scoop on the haunch above it -->
      <path d="M 606 -40 L 636 -150 L 722 -160 L 699 -104 L 693 -40 Z" fill="#030304"/>
      ${[0, 1, 2, 3, 4].map((i) => `<path d="M ${n(640 + i * 17)} ${n(-148 - i * 2.4)} L ${n(612 + i * 17)} -42" stroke="#14151A" stroke-width="2.4"/>`).join('')}
      <path d="M 606 -40 L 636 -150 L 722 -160" stroke="#3A3F4C" stroke-width="1.8" fill="none"/>
      <path d="M 646 -204 L 712 -212 L 716 -198 L 652 -192 Z" fill="#030304"/><path d="M 646 -204 L 712 -212" stroke="#4A4F5C" stroke-width="1.6"/>
      <!-- the tail: the light's slim Y and its glow, the diffuser's fins, the tail's edge -->
      <path d="M 948 -199 L 998 -192 L 999 -184 L 950 -191 Z" fill="${lit > 0.05 ? '#FF3A2E' : '#5A1414'}"/>
      <path d="M 958 -195 L 976 -194 L 986 -199 M 976 -194 L 988 -189" stroke="${lit > 0.05 ? '#FFB0A8' : '#7A2020'}" stroke-width="1.6" stroke-linecap="round"/>
      ${lit > 0.05 && !k.reflect ? `<ellipse cx="972" cy="-193" rx="${n(56 * lit)}" ry="${n(16 * lit)}" fill="#FF3A2E" opacity="${n(0.35 * lit)}" filter="url(#${id}cb6)"/>` : ''}
      <path d="M 930 -62 L 992 -72 L 984 -46 L 932 -38 Z" fill="#050506"/>
      ${[0, 1, 2].map((i) => `<path d="M ${944 + i * 16} -64 L ${940 + i * 16} -40" stroke="#1B1C22" stroke-width="2.6"/>`).join('')}
      <path d="M 999 -188 C 1001 -160, 1000 -120, 995 -84" stroke="#2A2D36" stroke-width="2" fill="none"/>
      <!-- the C-pillar's edge behind the window -->
      <path d="M 588 -232 L 634 -152" stroke="#020203" stroke-width="2" opacity="0.9"/>
      </g>
      ${wells}
      ${wheel(id, FW, k.spin || 0, '#9FB4D8')}${wheel(id, RW, k.spin || 0, '#9FB4D8')}
      <path d="M ${pts(ARCH_F)} M ${pts(ARCH_R)}" fill="none" stroke="#020203" stroke-width="3" stroke-linejoin="round"/>
      <path d="M 138 -96 L 172 -150 L 268 -152 M 700 -104 L 732 -162 L 839 -164" fill="none" stroke="url(#${id}cline)" stroke-width="2" opacity="0.55"/>
      ${k.reflect ? `<path d="${DOOR}" fill="url(#${id}cpaint)"/>` : `<g transform="rotate(${n(ang)} ${HINGE[0]} ${HINGE[1]})">${doorSkin}</g>`}`;
  }
  function carDefs(id) {
    return `<defs>
      <linearGradient id="${id}cpaint" x1="0" y1="-240" x2="0" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#2C3242"/><stop offset="0.2" stop-color="#14161C"/><stop offset="0.45" stop-color="#0C0D11"/><stop offset="0.58" stop-color="#1C1F28"/><stop offset="0.66" stop-color="#0B0C0F"/><stop offset="1" stop-color="#050506"/></linearGradient>
      <linearGradient id="${id}csky" x1="0" y1="-250" x2="0" y2="-130" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#9FB4D8" stop-opacity="0.26"/><stop offset="0.5" stop-color="#5A6A8E" stop-opacity="0.1"/><stop offset="1" stop-color="#5A6A8E" stop-opacity="0"/></linearGradient>
      <linearGradient id="${id}cglass" x1="0" y1="-232" x2="0" y2="-172" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#2A3346"/><stop offset="1" stop-color="#090B10"/></linearGradient>
      <linearGradient id="${id}cline" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.3" stop-color="#C9D6F2" stop-opacity="0.8"/><stop offset="0.7" stop-color="#FFFFFF" stop-opacity="0.9"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>
      <linearGradient id="${id}cgold" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="${GOLDHI}"/><stop offset="0.5" stop-color="${GOLD}"/><stop offset="1" stop-color="#8C6420"/></linearGradient>
      <linearGradient id="${id}cbeam2" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#EAF4FF" stop-opacity="0.55"/><stop offset="1" stop-color="#EAF4FF" stop-opacity="0"/></linearGradient>
      <filter id="${id}cb6" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="6"/></filter>
      <mask id="${id}chole" maskUnits="userSpaceOnUse" x="-200" y="-500" width="1400" height="700"><rect x="-200" y="-500" width="1400" height="700" fill="#fff"/><path d="${DOOR}" fill="#000"/></mask>
    </defs>`;
  }

  // ------------------------------------------------------------ the street
  // The car's nose at x 40, the kerb behind it; the ground at y 1500. Him in the driver's seat: a 0.228
  // scale founder (a car 1000 long is 4.6 m), his head under the roof.
  const STREET = { x: 40, y: 1500, him: { x: 520, y: -194, s: 0.228 } };
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
      <path d="M 598 -224 C 622 -224, 636 -210, 636 -190 L 636 -40 L 552 -40 L 566 -192 C 570 -214, 580 -224, 598 -224 Z" fill="#17171B"/>
      <path d="M 604 -216 C 620 -216, 628 -204, 628 -190 L 628 -60" stroke="${GOLD}" stroke-width="1.6" fill="none" stroke-dasharray="4 3" opacity="0.8"/>${crown(600, -198, 0.07)}
      <g transform="translate(${h.x} ${h.y}) scale(${h.s})">${F.founderSVG(p, id + 'f', 'all')}</g>
      <ellipse cx="452" cy="-140" rx="14" ry="40" fill="none" stroke="#202024" stroke-width="8" transform="rotate(-18 452 -140)"/>
      <path d="M 396 -150 L 468 -158 L 472 -128 L 396 -122 Z" fill="#101114"/></g>`;
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
        // a modern saloon from behind, in proportion to a real one (1.85 m wide, 1.45 m high): its tyres
        // and their sidewalls, the bumper, diffuser and twin exhausts, the boot and its shut line, the
        // full-width tail lights (brighter, with the high brake light, when braking), the yellow rear
        // plate, the rear screen between its C-pillars, the roof and the wing mirrors
        const W2 = (v) => n(v * w);
        const tail = lit > 0.5 ? '#FF4A3E' : '#C8231E', bar = lit > 0.5 ? '#FFD0C8' : '#F06A60';
        things.push({ z: az, svg: `<g transform="translate(${n(x)} ${n(y)})"><ellipse cx="0" cy="${W2(-0.005)}" rx="${W2(0.58)}" ry="${W2(0.035)}" fill="#000" opacity="0.6"/>
          ${[-1, 1].map((q) => `<rect x="${W2(q > 0 ? 0.33 : -0.47)}" y="${W2(-0.15)}" width="${W2(0.14)}" height="${W2(0.15)}" rx="${W2(0.025)}" fill="#0A0A0C"/><rect x="${W2(q > 0 ? 0.345 : -0.455)}" y="${W2(-0.14)}" width="${W2(0.11)}" height="${W2(0.12)}" rx="${W2(0.02)}" fill="none" stroke="#24252B" stroke-width="${W2(0.008)}"/>`).join('')}
          <path d="M ${W2(-0.5)} ${W2(-0.42)} C ${W2(-0.5)} ${W2(-0.47)}, ${W2(-0.46)} ${W2(-0.49)}, ${W2(-0.4)} ${W2(-0.5)} L ${W2(0.4)} ${W2(-0.5)} C ${W2(0.46)} ${W2(-0.49)}, ${W2(0.5)} ${W2(-0.47)}, ${W2(0.5)} ${W2(-0.42)} L ${W2(0.5)} ${W2(-0.16)} C ${W2(0.5)} ${W2(-0.12)}, ${W2(0.47)} ${W2(-0.1)}, ${W2(0.42)} ${W2(-0.1)} L ${W2(-0.42)} ${W2(-0.1)} C ${W2(-0.47)} ${W2(-0.1)}, ${W2(-0.5)} ${W2(-0.12)}, ${W2(-0.5)} ${W2(-0.16)} Z" fill="#9C1418"/>
          <path d="M ${W2(-0.49)} ${W2(-0.44)} L ${W2(0.49)} ${W2(-0.44)} L ${W2(0.49)} ${W2(-0.38)} L ${W2(-0.49)} ${W2(-0.38)} Z" fill="#C0262A" opacity="0.55"/>
          <path d="M ${W2(-0.36)} ${W2(-0.66)} C ${W2(-0.33)} ${W2(-0.7)}, ${W2(-0.27)} ${W2(-0.72)}, ${W2(-0.2)} ${W2(-0.72)} L ${W2(0.2)} ${W2(-0.72)} C ${W2(0.27)} ${W2(-0.72)}, ${W2(0.33)} ${W2(-0.7)}, ${W2(0.36)} ${W2(-0.66)} L ${W2(0.45)} ${W2(-0.48)} L ${W2(-0.45)} ${W2(-0.48)} Z" fill="#8A1216"/>
          <path d="M ${W2(-0.3)} ${W2(-0.65)} L ${W2(0.3)} ${W2(-0.65)} L ${W2(0.37)} ${W2(-0.5)} L ${W2(-0.37)} ${W2(-0.5)} Z" fill="#12141B"/>
          <path d="M ${W2(-0.26)} ${W2(-0.63)} L ${W2(-0.08)} ${W2(-0.63)} L ${W2(-0.18)} ${W2(-0.52)} L ${W2(-0.33)} ${W2(-0.52)} Z" fill="#FFFFFF" opacity="0.07"/>
          <rect x="${W2(-0.07)}" y="${W2(-0.665)}" width="${W2(0.14)}" height="${W2(0.012)}" rx="${W2(0.006)}" fill="${lit > 0.5 ? '#FF3A2E' : '#4A0E10'}"/>
          ${[-1, 1].map((q) => `<path d="M ${W2(q * 0.46)} ${W2(-0.52)} L ${W2(q * 0.56)} ${W2(-0.54)} L ${W2(q * 0.57)} ${W2(-0.48)} L ${W2(q * 0.47)} ${W2(-0.47)} Z" fill="#7A0E12"/>`).join('')}
          <path d="M ${W2(-0.3)} ${W2(-0.47)} L ${W2(-0.32)} ${W2(-0.3)} L ${W2(0.32)} ${W2(-0.3)} L ${W2(0.3)} ${W2(-0.47)}" fill="none" stroke="#5A0A0D" stroke-width="${W2(0.006)}"/>
          ${[-1, 1].map((q) => `<path d="M ${W2(q * 0.49)} ${W2(-0.43)} L ${W2(q * 0.2)} ${W2(-0.43)} L ${W2(q * 0.2)} ${W2(-0.385)} L ${W2(q * 0.49)} ${W2(-0.37)} Z" fill="${tail}"/><path d="M ${W2(q * 0.47)} ${W2(-0.405)} L ${W2(q * 0.22)} ${W2(-0.405)}" stroke="${bar}" stroke-width="${W2(0.008)}"/>${lit > 0.05 ? `<ellipse cx="${W2(q * 0.35)}" cy="${W2(-0.4)}" rx="${W2(0.16)}" ry="${W2(0.045)}" fill="#FF3A2E" opacity="${n(0.4 * lit)}"/>` : ''}`).join('')}
          <path d="M ${W2(-0.2)} ${W2(-0.405)} L ${W2(0.2)} ${W2(-0.405)}" stroke="${lit > 0.5 ? '#FF6A5E' : '#7A1414'}" stroke-width="${W2(0.006)}"/>
          <rect x="${W2(-0.13)}" y="${W2(-0.29)}" width="${W2(0.26)}" height="${W2(0.07)}" rx="${W2(0.008)}" fill="#F2C230"/>
          ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${W2(-0.105 + i * 0.031)}" y="${W2(-0.275)}" width="${W2(0.018)}" height="${W2(0.04)}" fill="#1A1A1A"/>`).join('')}
          <path d="M ${W2(-0.44)} ${W2(-0.2)} L ${W2(0.44)} ${W2(-0.2)} L ${W2(0.42)} ${W2(-0.1)} L ${W2(-0.42)} ${W2(-0.1)} Z" fill="#6E0C10"/>
          <path d="M ${W2(-0.3)} ${W2(-0.14)} L ${W2(0.3)} ${W2(-0.14)} L ${W2(0.28)} ${W2(-0.1)} L ${W2(-0.28)} ${W2(-0.1)} Z" fill="#141418"/>
          ${[-1, 1].map((q) => `<ellipse cx="${W2(q * 0.24)}" cy="${W2(-0.125)}" rx="${W2(0.035)}" ry="${W2(0.016)}" fill="#050506" stroke="#5A5C66" stroke-width="${W2(0.006)}"/>`).join('')}
          ${[-1, 1].map((q) => `<rect x="${W2(q > 0 ? 0.36 : -0.42)}" y="${W2(-0.19)}" width="${W2(0.06)}" height="${W2(0.015)}" fill="#7A1414"/>`).join('')}</g>` });
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
  // 1500, the cabin floor (the door's sill) 1.2 m up, the fuselage 2 m deep, the door 1.55 m high and
  // 0.8 m wide behind the cockpit, its own door swung back against the fuselage. At the door, a VIP
  // stair truck as at any airport: a platform level with the sill, seven 17 cm steps down to the
  // apron at 35 degrees, solid side panels 0.85 m above the steps with a handrail on top (so, as on
  // real ones, people on it show from the waist up), the bottom step left open with the red carpet
  // down it, and the truck's chassis and wheels under it. Him: a 1.70 m founder (0.182 scale).
  const JET = { ground: 1500, door: [452, 1088, 120, 232], foot: [848, 1500] };
  const STAIR = { top: [596, 1320], rise: 180 / 7, tread: 42, steps: 7, rail: 128, open: 800, deck: 436 };
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
        <linearGradient id="${id}tglow" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFC98A" stop-opacity="0.55"/><stop offset="1" stop-color="#FFC98A" stop-opacity="0"/></linearGradient>
        <linearGradient id="${id}tpanel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBF8F3"/><stop offset="0.55" stop-color="#ECE6DD"/><stop offset="1" stop-color="#C9C1B6"/></linearGradient></defs>
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
      <rect x="${DX}" y="${DY}" width="${DW}" height="${DH}" rx="22" fill="none" stroke="#9B9189" stroke-width="5"/>
      <rect x="${DX - DW - 10}" y="${DY + 4}" width="${DW}" height="${DH - 8}" rx="20" fill="#E9E4DC" stroke="#9B9189" stroke-width="4"/>
      <rect x="${DX - DW + 18}" y="${DY + 40}" width="${DW - 56}" height="56" rx="18" fill="#C9C1B6"/>
      <rect x="${DX - 30}" y="${DY + DH / 2}" width="14" height="4" rx="2" fill="#7A726A"/>`;
    // the stair truck. Nosing j (0 at the platform's edge) at x0 + j*tread, y0 + j*rise; the last riser
    // meets the apron
    const [x0, y0] = STAIR.top, R = STAIR.rise, Tr = STAIR.tread, N = STAIR.steps, RH = STAIR.rail;
    const nose = (x) => (x <= x0 ? y0 : y0 + ((x - x0) / Tr) * R);
    const xEnd = x0 + (N - 1) * Tr, open = STAIR.open, deck = STAIR.deck;
    const railY = (x) => nose(Math.min(x, open)) - RH;
    // the chassis and wheels under it, the struts up to the platform, a brace under the steps
    const chassis = `<path d="M ${deck - 16} 1440 L ${open - 30} 1440 L ${open - 30} 1462 L ${deck - 16} 1462 Z" fill="#3A3D45"/>
      <path d="M ${deck - 16} 1440 L ${open - 30} 1440" stroke="#5A5E68" stroke-width="2"/>
      ${[deck + 12, x0 - 12].map((x) => `<rect x="${x - 6}" y="${y0 + 18}" width="12" height="${1440 - y0 - 18}" fill="#4A4E58"/>`).join('')}
      <path d="M ${x0 - 8} ${y0 + 40} L ${open - 40} 1440" stroke="#4A4E58" stroke-width="9"/>
      ${[deck + 34, open - 70].map((x) => `<circle cx="${x}" cy="1476" r="24" fill="#141416"/><circle cx="${x}" cy="1476" r="11" fill="#7A7F8A"/><circle cx="${x}" cy="1476" r="4" fill="#3A3D45"/>`).join('')}
      <path d="M ${deck - 16} 1452 L ${deck - 30} 1452 L ${deck - 30} 1492 L ${deck - 40} 1500 L ${deck - 10} 1500 L ${deck - 20} 1492 Z" fill="#4A4E58"/>`;
    // the open bottom step: its side, the carpet down its tread and riser, and down the last riser onto
    // the apron
    const lastY = nose(xEnd);
    const steps = `<path d="M ${open} ${n(nose(open))} L ${xEnd - Tr + 6} ${n(nose(open))} L ${xEnd - Tr + 6} ${n(lastY)} L ${xEnd} ${n(lastY)} L ${xEnd} ${JET.ground} L ${open} ${JET.ground} Z" fill="#D9D3CA"/>
      <path d="M ${xEnd - Tr + 6} ${n(nose(open))} L ${xEnd - Tr + 6} ${n(lastY)} L ${xEnd} ${n(lastY)} L ${xEnd} ${JET.ground}" fill="none" stroke="#9E1C22" stroke-width="6" stroke-linejoin="round"/>
      <path d="M ${open} ${n(nose(open) - 3)} L ${xEnd - Tr + 9} ${n(nose(open) - 3)}" stroke="#9E1C22" stroke-width="6"/>
      <path d="M ${open} ${n(nose(open) + 22)} L ${xEnd - Tr + 3} ${n(nose(open) + 22)} M ${xEnd - Tr + 9} ${n(lastY + 22)} L ${xEnd - 3} ${n(lastY + 22)}" stroke="#B8B1A7" stroke-width="2"/>`;
    // the side panels: the platform's, level with the sill, and the stairs', parallel to the steps, as
    // high above them as his waist; a gold stripe, the crown; the handrail on top, carried on over the
    // open step on a post
    const yA = y0 - RH, yB = nose(open) - RH, base = 30;
    const panel = `<path d="M ${deck} ${yA} L ${x0} ${yA} L ${open} ${n(yB)} L ${open} ${n(nose(open) + base)} L ${x0} ${y0 + base} L ${deck} ${y0 + base} Z" fill="url(#${id}tpanel)"/>
      <path d="M ${deck} ${yA + 18} L ${x0} ${yA + 18} L ${open} ${n(yB + 18)}" stroke="${GOLD}" stroke-width="5" fill="none"/>
      <path d="M ${deck} ${y0 + base} L ${x0} ${y0 + base} L ${open} ${n(nose(open) + base)}" stroke="#8C8378" stroke-width="3" fill="none"/>
      <path d="M ${x0} ${yA + 4} L ${x0} ${y0 + base}" stroke="#B8B1A7" stroke-width="2"/>
      <path d="M ${open} ${n(yB)} L ${open} ${n(nose(open) + base)}" stroke="#8C8378" stroke-width="3"/>
      ${crown((deck + x0) / 2, yA + 66, 0.16)}
      <path d="M ${deck - 8} ${yA - 4} L ${x0} ${yA - 4} L ${xEnd + 6} ${n(railY(xEnd + 6) - 4 + (xEnd + 6 - open) / Tr * R)}" stroke="#7A7F8A" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M ${deck - 8} ${yA - 6} L ${x0} ${yA - 6} L ${xEnd + 6} ${n(railY(xEnd + 6) - 6 + (xEnd + 6 - open) / Tr * R)}" stroke="#E4E7EC" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="${xEnd - 2}" y="${n(railY(xEnd) + (xEnd - open) / Tr * R)}" width="7" height="${n(lastY - railY(xEnd) - (xEnd - open) / Tr * R)}" fill="#7A7F8A"/>
      <rect x="${deck - 12}" y="${yA - 4}" width="7" height="${RH + base + 4}" fill="#7A7F8A"/>`;
    const carpet = `<path d="M ${xEnd - 2} ${fy} L ${xEnd + 700} ${fy} L ${xEnd + 820} ${fy + 190} L ${xEnd - 40} ${fy + 190} Z" fill="#9E1C22"/><path d="M ${xEnd - 2} ${fy} L ${xEnd + 700} ${fy}" stroke="${GOLD}" stroke-width="5"/>
      <path d="M ${xEnd - 20} ${fy + 96} L ${xEnd + 760} ${fy + 96}" stroke="#7E141A" stroke-width="3" opacity="0.6"/>`;
    // him: up the steps from the fifth (k 0) to the platform's edge (k 0.8), then across it to the
    // door (k 1), a small lift at each step; behind the panels from the waist down
    const hs = 0.182, xs = x0 + 4.2 * Tr, door = DX + DW / 2;
    const fxk = k < 0.8 ? mix(xs, x0, k / 0.8) : mix(x0, door, (k - 0.8) / 0.2);
    const stepIdx = (xs - fxk) / Tr, bob = fxk > x0 ? Math.sin(Math.PI * (stepIdx % 1)) * 4 : Math.abs(Math.sin(Math.PI * (x0 - fxk) / 34)) * 2;
    const footY = nose(fxk) - bob;
    const him = `<g transform="translate(${n(fxk)} ${n(footY - 1258 * hs)}) scale(${hs})">${F.founderSVG(p, id + 'f', 'all')}</g>`;
    const subject = `${jet}${chassis}${carpet}${him}${steps}${panel}`;
    return [{ f: 0.3, svg: bg, blur: s.dof && s.dof.bg }, { f: 1, svg: subject, blur: s.dof && s.dof.all }, T.topShade(id)];
  };
})();
