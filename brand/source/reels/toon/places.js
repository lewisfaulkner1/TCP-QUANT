// New places for the founder and the trading emotions (toon/cast.js), added to the toon kind's sets.
// Load after founder.js, toon.js and cast.js. Each set returns its layers, back to front, like the
// others ({ f: depth, svg, blur }); a shot's cast is { who: track } (tracks as in cast.js), drawn in
// the set's own space and in depth order.
//
//   lineup    the police line-up: the height chart, the numbers, the suspects, seen through the glass
//   observe   the dark room behind the one-way glass: him at the desk, the line-up bright beyond it
(function () {
  const T = window.Toon, C = window.Cast, F = window.Founder;
  const { SETS, HIM, n, cl, mix, crown } = T;

  // the cast of a shot, in depth order (further back first), each from its own track
  function castOf(s, t, id, filter = () => true) {
    const list = Object.entries(s.cast || {}).filter(([who]) => filter(who)).map(([who, track]) => ({ who, q: C.at(who, track, t), track }));
    list.sort((a, b) => a.q.y - b.q.y);
    return list.map(({ who, track }) => C.place(who, track, t, `${id}${who}`)).join('');
  }

  // ------------------------------------------------------------ the line-up
  // Its floor is at y 1380; the five places are at x 140, 340, 540, 740 and 940. The wall's lines are
  // 10 cm apart (60 units): the suspects come up to about 40 cm.
  const SPOTS = [140, 340, 540, 740, 940], FLOOR = 1380;
  function lineupWall(id) {
    const rows = [];
    for (let y = 1300 - 60; y > 520; y -= 60) {
      const k = (1300 - y) / 60;
      rows.push(`<line x1="0" x2="1080" y1="${y}" y2="${y}" stroke="#2C3330" stroke-width="${k % 2 ? 2 : 3.5}" opacity="${k % 2 ? 0.45 : 0.8}"/>
        <text x="22" y="${y - 8}" font-family="JB Mono" font-weight="600" font-size="24" fill="#2C3330" opacity="0.85">${k * 10}</text>
        <text x="1058" y="${y - 8}" text-anchor="end" font-family="JB Mono" font-weight="600" font-size="24" fill="#2C3330" opacity="0.85">${k * 10}</text>`);
    }
    const blocks = [];
    for (let r = 0; r < 13; r++) for (let c = -1; c < 8; c++) blocks.push(`<rect x="${c * 160 + (r % 2 ? 80 : 0)}" y="${520 + r * 60}" width="160" height="60" fill="none" stroke="#9AA697" stroke-width="2" opacity="0.35"/>`);
    return `<defs>
        <linearGradient id="${id}lw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D3DDCF"/><stop offset="1" stop-color="#A9B5A7"/></linearGradient>
        <linearGradient id="${id}lf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#55605A"/><stop offset="1" stop-color="#2B312E"/></linearGradient>
        <radialGradient id="${id}lt" cx="0.5" cy="0" r="0.9"><stop offset="0" stop-color="#F2FFF6" stop-opacity="0.55"/><stop offset="1" stop-color="#F2FFF6" stop-opacity="0"/></radialGradient>
        <filter id="${id}lb" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="14"/></filter></defs>
      <rect x="-500" y="-500" width="2080" height="2920" fill="#0B0C0C"/>
      <rect x="-200" y="-500" width="1480" height="1020" fill="#1C2220"/>
      ${[210, 870].map((x) => `<rect x="${x - 190}" y="452" width="380" height="18" rx="9" fill="#F4FFF7"/><rect x="${x - 200}" y="446" width="400" height="30" rx="15" fill="#E8FFF0" opacity="0.6" filter="url(#${id}lb)"/>`).join('')}
      <rect x="-200" y="520" width="1480" height="780" fill="url(#${id}lw)"/>
      ${blocks.join('')}
      <rect x="-200" y="520" width="1480" height="780" fill="url(#${id}lt)"/>
      ${rows.join('')}
      ${SPOTS.map((x, i) => `<rect x="${x - 38}" y="776" width="76" height="76" rx="6" fill="#1A1E1C"/><text x="${x}" y="834" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="52" fill="#F4F1EA">${i + 1}</text>`).join('')}
      <rect x="-200" y="1300" width="1480" height="300" fill="url(#${id}lf)"/>
      <rect x="-200" y="1292" width="1480" height="14" fill="#262B29"/>
      ${SPOTS.map((x) => `<path d="M ${x - 26} ${FLOOR} L ${x + 26} ${FLOOR} M ${x} ${FLOOR - 14} L ${x} ${FLOOR + 14}" stroke="#E8C547" stroke-width="7" stroke-linecap="round" opacity="0.85"/>`).join('')}`;
  }
  SETS.lineup = (s, t, st, p, id) => {
    const glass = `
      <defs><linearGradient id="${id}gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0.3" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.42" stop-color="#FFFFFF" stop-opacity="0.07"/>
        <stop offset="0.47" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.58" stop-color="#FFFFFF" stop-opacity="0.05"/><stop offset="0.62" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>
        <radialGradient id="${id}vg" cx="0.5" cy="0.45" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></radialGradient></defs>
      <rect width="1080" height="1920" fill="#7FB59A" opacity="0.06"/>
      <rect width="1080" height="1920" fill="url(#${id}gl)"/>
      <rect width="1080" height="1920" fill="url(#${id}vg)"/>`;
    // the sill of the window on our side, with the intercom and a coffee
    const sill = `
      <rect x="-300" y="1560" width="1680" height="600" fill="#0D0E0F"/><rect x="-300" y="1556" width="1680" height="8" fill="#3A403D"/>
      <g transform="translate(860 1600)"><rect x="-38" y="-10" width="76" height="22" rx="6" fill="#16191A" stroke="#2C3230" stroke-width="2"/>
        <path d="M 0 -8 C 0 -60, -40 -90, -70 -120" fill="none" stroke="#202425" stroke-width="9" stroke-linecap="round"/><rect x="-92" y="-146" width="34" height="46" rx="12" transform="rotate(-38 -75 -123)" fill="#1A1D1E" stroke="#2F3533" stroke-width="2"/>
        <circle cx="22" cy="0" r="5" fill="#FF5A4E"/></g>
      <g transform="translate(170 1590)"><path d="M -30 -60 L 30 -60 L 24 20 L -24 20 Z" fill="#E9E1D2" stroke="#BFB4A0" stroke-width="2"/><rect x="-32" y="-68" width="64" height="12" rx="4" fill="#2A2421"/></g>`;
    return [
      { f: 0.85, svg: lineupWall(id), blur: s.dof && s.dof.bg },
      { f: 1, svg: castOf(s, t, id) },
      { f: 1.12, svg: sill, blur: s.dof && s.dof.fg },
      { f: 0, svg: glass },
    ];
  };

  // ------------------------------------------------------------ the observation room
  // Him at the desk on the left, facing the one-way glass on the right; the line-up bright beyond it.
  SETS.observe = (s, t, st, p, id) => {
    p.light = { ...p.light, tint: '#D9EFE3', rim: 1 };
    // the line-up through the glass, small, its suspects in their places
    const beyond = `<g transform="translate(640 330) scale(0.5)">${lineupWall(id + 'w')}
      ${Object.keys(s.beyond || {}).map((who) => C.place(who, s.beyond[who], t, `${id}b${who}`)).join('')}</g>`;
    const bg = `<defs><linearGradient id="${id}ow" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0C0D0F"/><stop offset="1" stop-color="#16191B"/></linearGradient>
        <radialGradient id="${id}lamp" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#F2B866" stop-opacity="0.45"/><stop offset="1" stop-color="#F2B866" stop-opacity="0"/></radialGradient>
        <radialGradient id="${id}win" cx="0.5" cy="0.5" r="0.6"><stop offset="0" stop-color="#CFF2DD" stop-opacity="0.35"/><stop offset="1" stop-color="#CFF2DD" stop-opacity="0"/></radialGradient>
        <clipPath id="${id}wc"><rect x="640" y="330" width="560" height="980"/></clipPath>
        <filter id="${id}ob" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="22"/></filter></defs>
      <rect x="-600" y="-600" width="2280" height="3120" fill="url(#${id}ow)"/>
      ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${-300 + i * 160}" y="-200" width="4" height="1700" fill="#1E2225" opacity="0.6"/>`).join('')}
      <g clip-path="url(#${id}wc)">${beyond}<rect x="640" y="330" width="560" height="980" fill="#6FA287" opacity="0.18"/></g>
      <rect x="626" y="316" width="588" height="1008" fill="none" stroke="#2B3134" stroke-width="28"/>
      <rect x="610" y="300" width="620" height="1040" fill="none" stroke="#0A0B0C" stroke-width="6"/>
      <ellipse cx="760" cy="820" rx="520" ry="700" fill="url(#${id}win)"/>`;
    const place = `translate(${HIM.x} ${HIM.y}) scale(${HIM.s})`;
    const onTable = (p.arms || 'rest') === 'desk', nearArm = `<g transform="${place}">${F.founderSVG(p, id + 'f', 'arm')}</g>`;
    const subject = `
      <g transform="${place}">${F.founderSVG(p, id + 'f', 'body')}</g>
      ${onTable ? '' : nearArm}
      <!-- the desk: steel, the lamp's warm pool on it -->
      <path d="M -300 1448 L 1400 1448 L 1400 1520 L -300 1520 Z" fill="#2A2F33"/><path d="M -300 1450 L 1400 1450" stroke="#56606A" stroke-width="4"/>
      <ellipse cx="80" cy="1470" rx="300" ry="40" fill="url(#${id}lamp)"/>
      <g transform="translate(40 1452)"><ellipse cx="0" cy="0" rx="52" ry="12" fill="#1E2A22"/><path d="M -6 0 L -6 -150 L 70 -200" fill="none" stroke="#2C3B30" stroke-width="10" stroke-linecap="round"/>
        <path d="M 40 -238 L 130 -214 L 112 -170 L 30 -196 Z" fill="#1F6B47" stroke="#123D29" stroke-width="3"/><ellipse cx="96" cy="-186" rx="40" ry="10" transform="rotate(16 96 -186)" fill="#FFE2A8" opacity="0.8"/></g>
      <g transform="translate(620 1452)"><rect x="-36" y="-10" width="72" height="18" rx="6" fill="#16191A" stroke="#2C3230" stroke-width="2"/>
        <path d="M 0 -8 C 0 -50, 30 -80, 56 -104" fill="none" stroke="#202425" stroke-width="8" stroke-linecap="round"/><rect x="44" y="-138" width="30" height="42" rx="11" transform="rotate(36 59 -117)" fill="#1A1D1E" stroke="#2F3533" stroke-width="2"/><circle cx="-20" cy="-1" r="4.5" fill="#FF5A4E"/></g>
      <g transform="translate(980 1446) rotate(-4)"><rect x="-120" y="-16" width="240" height="22" rx="3" fill="#C9B48A"/><rect x="-120" y="-20" width="240" height="8" rx="3" fill="#D9C79F"/>
        <text x="-100" y="1" font-family="JB Mono" font-weight="600" font-size="15" fill="#5A4A2E">CASE · YOUR LAST TRADE</text></g>
      ${castOf(s, t, id)}
      ${onTable ? nearArm : ''}
      <path d="M -300 1520 L 1400 1520 L 1400 2400 L -300 2400 Z" fill="#17191B"/><path d="M -300 1520 L 1400 1520" stroke="#0A0B0C" stroke-width="6"/>
      <ellipse cx="700" cy="900" rx="520" ry="700" fill="url(#${id}win)" style="mix-blend-mode:screen" opacity="0.55"/>`;
    const vig = `<defs><radialGradient id="${id}ov" cx="0.45" cy="0.48" r="0.75"><stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.7"/></radialGradient></defs>
      <rect width="1080" height="1920" fill="url(#${id}ov)"/>`;
    return [{ f: 0.45, svg: bg, blur: s.dof && s.dof.bg }, { f: 1, svg: subject, blur: s.dof && s.dof.all }, { f: 0, svg: vig }];
  };

  T.castOf = castOf;
  T.SPOTS = SPOTS;
})();
