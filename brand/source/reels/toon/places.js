// New places for the founder and the trading emotions (toon/cast.js), added to the toon kind's sets.
// Load after founder.js, toon.js and cast.js. Each set returns its layers, back to front, like the
// others ({ f: depth, svg, blur }); a shot's cast is { who: track } (tracks as in cast.js), drawn in
// the set's own space and in depth order.
//
//   lineup    the police line-up: the height chart, the numbers, the suspects, seen through the glass
//   observe   the dark room behind the one-way glass: him at the desk, the line-up bright beyond it
//   cafe      a café by day: him at the counter in the window, a flat white, the laptop, the street
//   press     a press conference: the TCP backdrop and its screen, the microphones, the press, flashes
//   ring      a boxing ring at night: him in his corner, gold ropes, the big screen, the towel
//   gameshow  TAKE IT OR LEAVE IT: him at a podium, the trade on the big screen, the two buttons
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
  // Its floor is at y 1380; the four places are at x 270, 450, 630 and 810. The wall's lines are
  // 10 cm apart (60 units): the suspects come up to about 40 cm.
  const SPOTS = [270, 450, 630, 810], FLOOR = 1380;
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
      T.topShade(id),
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

  // ------------------------------------------------------------ the café
  // Daytime: him at the oak counter in the window of a café, the laptop on his right, a flat white
  // (a crown in its foam), the street behind him through steel-framed glass, a red bus going by. The
  // counter's top is at y 1448; anything standing on it stands at about y 1500.
  SETS.cafe = (s, t, st, p, id) => {
    p.light = { ...p.light, tint: '#FFF1DC', rim: 1 };
    const busX = ((t * 150 + 400) % 2800) - 1100;
    const houses = [0, 1, 2, 3, 4].map((i) => {
      const x = -260 + i * 230;
      const win = [0, 1].map((r) => [0, 1].map((c) => `<rect x="${x + 40 + c * 90}" y="${560 + r * 190}" width="56" height="110" fill="#2E3A44"/><rect x="${x + 40 + c * 90}" y="${560 + r * 190}" width="56" height="110" fill="none" stroke="#F1E9DA" stroke-width="6"/>`).join('')).join('');
      return `<rect x="${x}" y="470" width="230" height="660" fill="${i % 2 ? '#9C5A44' : '#A86650'}"/><rect x="${x}" y="470" width="230" height="16" fill="#E9DFCF"/>${win}
        <rect x="${x + 82}" y="960" width="66" height="170" fill="#22303A"/>`;
    }).join('');
    const bus = `<g transform="translate(${n(busX)} 0)"><rect x="0" y="760" width="560" height="350" rx="26" fill="#C8281E"/><rect x="0" y="940" width="560" height="10" fill="#9E1C14"/>
      ${[0, 1, 2, 3].map((i) => `<rect x="${30 + i * 128}" y="790" width="104" height="70" rx="8" fill="#2A3238"/><rect x="${30 + i * 128}" y="970" width="104" height="66" rx="8" fill="#2A3238"/>`).join('')}
      <circle cx="110" cy="1110" r="40" fill="#151515"/><circle cx="450" cy="1110" r="40" fill="#151515"/></g>`;
    const bg = `<defs><linearGradient id="${id}cs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFD9EE"/><stop offset="1" stop-color="#F3E7D2"/></linearGradient>
        <linearGradient id="${id}cw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EFE5D3"/><stop offset="1" stop-color="#D9CBB4"/></linearGradient>
        <radialGradient id="${id}bulb" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFD48A" stop-opacity="0.7"/><stop offset="1" stop-color="#FFD48A" stop-opacity="0"/></radialGradient>
        <clipPath id="${id}cwin"><rect x="-240" y="180" width="900" height="1060"/></clipPath></defs>
      <rect x="-600" y="-600" width="2280" height="3120" fill="url(#${id}cw)"/>
      <g clip-path="url(#${id}cwin)"><rect x="-240" y="180" width="900" height="1060" fill="url(#${id}cs)"/>${houses}
        <rect x="-240" y="1130" width="900" height="110" fill="#8E8A82"/>${bus}<rect x="-240" y="180" width="900" height="1060" fill="#FFF6E6" opacity="0.18"/></g>
      ${[-20, 200, 420].map((x) => `<rect x="${x}" y="180" width="14" height="1060" fill="#1C1C1C"/>`).join('')}
      <rect x="-240" y="520" width="900" height="12" fill="#1C1C1C"/><rect x="-260" y="166" width="940" height="1094" fill="none" stroke="#1C1C1C" stroke-width="28"/>
      <!-- the chalkboard -->
      <g transform="translate(770 300)"><rect x="-14" y="-14" width="308" height="540" rx="10" fill="#7A5634"/><rect width="280" height="512" rx="4" fill="#2B302D"/>
        <text x="140" y="70" text-anchor="middle" font-family="Serif" font-style="italic" font-size="56" fill="#F2EEE4">Menu</text>
        ${[['flat white', '3.40'], ['cortado', '3.10'], ['oat latte', '3.60'], ['tea', '2.50'], ['patience', 'free']].map(([a, b], i) => `<text x="26" y="${150 + i * 66}" font-family="Serif" font-style="italic" font-size="36" fill="${a === 'patience' ? '#F3D27A' : '#E8E3D8'}">${a}</text><text x="256" y="${150 + i * 66}" text-anchor="end" font-family="Serif" font-style="italic" font-size="36" fill="${a === 'patience' ? '#F3D27A' : '#E8E3D8'}">${b}</text>`).join('')}
        <path d="M 30 470 Q 140 448 250 470" fill="none" stroke="#E8E3D8" stroke-width="3" opacity="0.6"/></g>
      <!-- pendant lamps -->
      ${[330, 690].map((x, i) => `<line x1="${x}" y1="-300" x2="${x}" y2="${300 + i * 40}" stroke="#2A2420" stroke-width="5"/><path d="M ${x - 70} ${360 + i * 40} L ${x - 30} ${300 + i * 40} L ${x + 30} ${300 + i * 40} L ${x + 70} ${360 + i * 40} Z" fill="#2E2A26"/>
        <circle cx="${x}" cy="${372 + i * 40}" r="120" fill="url(#${id}bulb)"/><circle cx="${x}" cy="${366 + i * 40}" r="16" fill="#FFE8B8"/>`).join('')}
      <!-- the plant -->
      <g transform="translate(1040 1448)"><path d="M -70 0 L 70 0 L 56 -130 L -56 -130 Z" fill="#C9B79C"/>
        ${[[-60, -330, -40], [20, -420, 10], [80, -300, 50], [-110, -230, -70], [110, -200, 70]].map(([x, y, r]) => `<path d="M 0 -130 Q ${x / 2} ${(y - 130) / 2} ${x} ${y}" fill="none" stroke="#2F5A35" stroke-width="7"/>
          <ellipse cx="${x}" cy="${y}" rx="78" ry="54" transform="rotate(${r} ${x} ${y})" fill="#2F6B3A"/><path d="M ${x - 60} ${y} L ${x + 60} ${y}" transform="rotate(${r} ${x} ${y})" stroke="#24502C" stroke-width="5"/>`).join('')}</g>`;
    const place = `translate(${HIM.x} ${HIM.y}) scale(${HIM.s})`;
    const onTable = (p.arms || 'rest') === 'desk', nearArm = `<g transform="${place}">${F.founderSVG(p, id + 'f', 'arm')}</g>`;
    const subject = `
      <g transform="${place}">${F.founderSVG(p, id + 'f', 'body')}</g>
      ${onTable ? '' : nearArm}
      <!-- the laptop, on the right of the counter -->
      <g transform="translate(790 1130) skewY(-9) scale(0.6 1)">${T.monitor(st, id + 'c', 440)}</g>
      <path d="M 790 1118 L 783 1122 L 783 1396 L 790 1392 Z" fill="#9AA0A8"/>
      <path d="M 740 1440 L 1060 1390 L 1090 1420 L 762 1476 Z" fill="#B9BEC5"/><path d="M 762 1432 L 1054 1386 L 1070 1400 L 776 1446 Z" fill="#8E949C"/>
      <!-- the counter: oak, the window's light along its edge -->
      <path d="M -300 1448 L 1400 1448 L 1400 1530 L -300 1530 Z" fill="#B88A5A"/>
      ${T.grain(-300, 1452, 1400, 1526, 23)}
      <path d="M -300 1450 L 1400 1450" stroke="#E7C89C" stroke-width="3" opacity="0.9"/>
      <!-- the flat white, a crown in its foam -->
      <g transform="translate(560 1478)"><ellipse cx="0" cy="12" rx="74" ry="14" fill="#000" opacity="0.15"/><ellipse cx="0" cy="6" rx="66" ry="13" fill="#F6F3EE" stroke="#D8D2C8" stroke-width="2"/>
        <path d="M -40 -50 L 40 -50 L 33 0 C 24 9, -24 9, -33 0 Z" fill="#FBF9F5" stroke="#D8D2C8" stroke-width="2"/><ellipse cx="0" cy="-50" rx="40" ry="8" fill="#B07A4C"/>
        ${crown(0, -50, 0.12, '#F6EBDD')}
        <path d="M 38 -40 C 62 -40, 62 -14, 34 -14" fill="none" stroke="#FBF9F5" stroke-width="9"/></g>
      ${T.steam(560, 1420, t, id)}
      ${castOf(s, t, id)}
      ${onTable ? nearArm : ''}
      <path d="M -300 1530 L 1400 1530 L 1400 2400 L -300 2400 Z" fill="#7E5A38"/><path d="M -300 1530 L 1400 1530" stroke="#5C4028" stroke-width="6"/>
      ${Array.from({ length: 20 }, (_, i) => `<path d="M ${-300 + i * 90} 1536 L ${-300 + i * 90} 2400" stroke="#694A2E" stroke-width="4" opacity="0.7"/><path d="M ${-296 + i * 90} 1536 L ${-296 + i * 90} 2400" stroke="#9A7149" stroke-width="2" opacity="0.4"/>`).join('')}
      <rect x="-300" y="1760" width="1700" height="18" rx="9" fill="#C9A35C"/><rect x="-300" y="1762" width="1700" height="5" rx="2" fill="#F1D89A" opacity="0.8"/>`;
    return [{ f: 0.35, svg: bg, blur: s.dof && s.dof.bg }, { f: 1, svg: subject, blur: s.dof && s.dof.all }, T.topShade(id)];
  };

  // ------------------------------------------------------------ the press conference
  // Him at a press table under the lights, the TCP backdrop behind (crowns, the big screen on the
  // right), microphones with their flags in front, the press in silhouette at the bottom, flashes.
  // The table's top is at y 1448. s.screen: [[t, 'chart' | 'plan'], …]; s.flashes: [t, …] (a camera
  // goes off: a small burst in the crowd); s.bigFlashes: [t, …] (the whole room lights up once: kept
  // rare, never more than 3 a second, for viewers sensitive to flashing).
  const FLAGS = [['PIP NEWS', '#C8281E'], ['CANDLE TV', '#1F6FD1'], ['WICK FM', '#E8A317'], ['THE SPREAD', '#2E9E6A']];
  function planCard(id) {
    const row = (y, a, b, col = '#E9E4D8') => `<text x="28" y="${y}" font-family="JB Mono" font-weight="600" font-size="22" fill="#8C8577">${a}</text><text x="412" y="${y}" text-anchor="end" font-family="JB Mono" font-weight="600" font-size="24" fill="${col}">${b}</text>`;
    return `<rect width="440" height="300" fill="#0B0D11"/><rect x="10" y="10" width="420" height="280" rx="10" fill="#121620" stroke="#D8AD4E" stroke-width="3"/>
      ${crown(46, 46, 0.14)}<text x="74" y="56" font-family="TCP Display" font-weight="800" font-size="24" fill="#F6E3A3">TCP · PLAYBOOK</text>
      <g transform="translate(330 30) rotate(8)"><rect x="-10" y="-4" width="96" height="30" rx="4" fill="none" stroke="#E0613F" stroke-width="3"/><text x="38" y="19" text-anchor="middle" font-family="JB Mono" font-weight="600" font-size="17" fill="#E0613F">EXAMPLE</text></g>
      ${row(112, 'GOLD', 'BUY LIMIT', '#35D08F')}${row(156, 'entry', '4,112.40')}${row(198, 'stop', '4,104.90', '#FF8A6E')}${row(240, 'target', '4,127.40', '#35D08F')}
      <text x="28" y="276" font-family="JB Mono" font-weight="500" font-size="17" fill="#8C8577">logged before the result</text>`;
  }
  SETS.press = (s, t, st, p, id) => {
    p.light = { ...p.light, tint: '#EEF2FF', rim: 1 };
    const mode = (s.screen || []).filter(([a]) => t >= at(a)).map(([, m]) => m).pop() || 'logo';
    const pattern = [];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 7; c++) {
      const x = -200 + c * 240 + (r % 2 ? 120 : 0), y = -120 + r * 190;
      pattern.push(`${crown(x, y, 0.16, '#3A3322')}<text x="${x}" y="${y + 44}" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="22" fill="#3A3322">TCP</text>`);
    }
    const screen = mode === 'plan' ? planCard(id) : mode === 'chart'
      ? `<rect width="440" height="300" fill="#0A0D11"/><g transform="translate(6 10) scale(0.5)">${T.chartSVG(st, id + 'sc', true)}</g>`
      : `<rect width="440" height="300" fill="#0B0D11"/>${crown(220, 120, 0.42)}<text x="220" y="230" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="40" fill="#F6E3A3">TCP</text>`;
    const bg = `<defs><radialGradient id="${id}spot" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.32"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
        <linearGradient id="${id}beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.16"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient></defs>
      <rect x="-600" y="-600" width="2280" height="3120" fill="#0C1017"/>
      ${pattern.join('')}
      <ellipse cx="380" cy="760" rx="560" ry="620" fill="url(#${id}spot)"/>
      <path d="M 120 -300 L 300 -300 L 640 1448 L -40 1448 Z" fill="url(#${id}beam)"/>`;
    const place = `translate(${HIM.x} ${HIM.y}) scale(${HIM.s})`;
    const onTable = (p.arms || 'rest') === 'desk', nearArm = `<g transform="${place}">${F.founderSVG(p, id + 'f', 'arm')}</g>`;
    const mic = (x, i) => {
      const [name, col] = FLAGS[i];
      return `<g transform="translate(${x} 1452)"><ellipse cx="0" cy="0" rx="34" ry="8" fill="#0A0A0B"/><path d="M 0 0 L 0 -120" stroke="#2A2C30" stroke-width="7"/>
        <rect x="-34" y="-176" width="68" height="46" rx="6" fill="${col}"/><text x="0" y="-147" text-anchor="middle" font-family="JB Mono" font-weight="600" font-size="11.5" fill="#FFFFFF">${name}</text>
        <rect x="-15" y="-232" width="30" height="58" rx="15" fill="#1A1B1E"/><rect x="-15" y="-232" width="30" height="30" rx="15" fill="#2C2E33"/></g>`;
    };
    const subject = `
      <g transform="translate(616 640)"><rect x="-16" y="-16" width="472" height="332" rx="8" fill="#050608"/>${screen}
        <rect width="440" height="300" fill="url(#${id}beam)" opacity="0.35"/></g>
      <g transform="${place}">${F.founderSVG(p, id + 'f', 'body')}</g>
      ${onTable ? '' : nearArm}
      <path d="M -300 1448 L 1400 1448 L 1400 1500 L -300 1500 Z" fill="#15171B"/><path d="M -300 1450 L 1400 1450" stroke="#3A3E46" stroke-width="3"/>
      ${[600, 690, 780, 870].map(mic).join('')}
      <g transform="translate(980 1452)"><path d="M -18 0 L -22 -74 L 22 -74 L 18 0 Z" fill="#CFE6F2" opacity="0.55" stroke="#9FB7C4" stroke-width="2"/><rect x="-20" y="-40" width="40" height="38" fill="#9DD3EE" opacity="0.35"/></g>
      ${castOf(s, t, id)}
      ${onTable ? nearArm : ''}
      <path d="M -300 1500 L 1400 1500 L 1400 2400 L -300 2400 Z" fill="#1A1C22"/><path d="M -300 1500 L 1400 1500" stroke="#3C414C" stroke-width="5"/>
      ${crown(540, 1610, 0.32)}<text x="540" y="1700" text-anchor="middle" font-family="JB Mono" font-weight="600" font-size="22" letter-spacing="6" fill="#8C7A50">THE CRYPTO PLAYBOOK</text>`;
    // the press: heads and shoulders in silhouette, phones and recorders up, lit from the stage
    const bob = (k) => Math.sin(t * 3.1 + k * 1.7) * 6;
    const heads = [[-40, 1760, 1.1, 0], [170, 1700, 0.95, 1], [380, 1790, 1.15, 2], [600, 1720, 1.0, 3], [820, 1780, 1.1, 4], [1040, 1710, 0.95, 5]];
    const RIM = '#6E7FA6', SIL = '#0A0C11';
    const press = heads.map(([x, y, k, i]) => {
      const up = i % 2 === 0 && i !== 2, hy = y + bob(i);
      const arm = up ? `<path d="M ${x + 50 * k} ${hy + 110 * k} C ${x + 70 * k} ${hy + 20 * k}, ${x + 80 * k} ${hy - 90 * k}, ${x + 90 * k} ${hy - 150 * k}" stroke="${SIL}" stroke-width="${30 * k}" stroke-linecap="round" fill="none"/>
          <path d="M ${x + 64 * k} ${hy + 10 * k} C ${x + 76 * k} ${hy - 60 * k}, ${x + 82 * k} ${hy - 100 * k}, ${x + 88 * k} ${hy - 140 * k}" stroke="${RIM}" stroke-width="${4 * k}" fill="none" opacity="0.7"/>
          <g transform="translate(${x + 90 * k} ${hy - 190 * k}) rotate(${-8 + i * 3})"><rect x="${-60 * k}" y="${-70 * k}" width="${120 * k}" height="${140 * k}" rx="${30 * k}" fill="#9EC5FF" opacity="0.18"/>
            <rect x="${-24 * k}" y="${-42 * k}" width="${48 * k}" height="${84 * k}" rx="${8 * k}" fill="${SIL}"/><rect x="${-19 * k}" y="${-36 * k}" width="${38 * k}" height="${68 * k}" rx="${4 * k}" fill="#BCD7FF"/>
            <rect x="${-14 * k}" y="${-24 * k}" width="${28 * k}" height="${20 * k}" fill="#6E8FC7"/></g>` : '';
      // the TV camera on the shoulder of the one in the middle
      const cam = i === 2 ? `<g transform="translate(${x + 30 * k} ${hy - 40 * k})"><rect x="${-120 * k}" y="${-60 * k}" width="${190 * k}" height="${100 * k}" rx="${12 * k}" fill="${SIL}"/>
          <rect x="${70 * k}" y="${-46 * k}" width="${50 * k}" height="${72 * k}" rx="${8 * k}" fill="#11141B"/><circle cx="${120 * k}" cy="${-10 * k}" r="${30 * k}" fill="#11141B" stroke="${RIM}" stroke-width="${3 * k}"/>
          <rect x="${-70 * k}" y="${-92 * k}" width="${90 * k}" height="${14 * k}" rx="${6 * k}" fill="${SIL}"/><circle cx="${-96 * k}" cy="${-40 * k}" r="${7 * k}" fill="#FF3B30"/>
          <path d="M ${-120 * k} ${-58 * k} L ${60 * k} ${-58 * k}" stroke="${RIM}" stroke-width="${4 * k}" opacity="0.8"/></g>` : '';
      return `${arm}<ellipse cx="${x}" cy="${hy}" rx="${58 * k}" ry="${70 * k}" fill="${SIL}"/><path d="M ${x - 150 * k} ${hy + 320 * k} C ${x - 140 * k} ${hy + 90 * k}, ${x + 140 * k} ${hy + 90 * k}, ${x + 150 * k} ${hy + 320 * k} Z" fill="${SIL}"/>
        <path d="M ${x - 54 * k} ${hy - 16 * k} C ${x - 46 * k} ${hy - 66 * k}, ${x + 40 * k} ${hy - 76 * k}, ${x + 56 * k} ${hy - 22 * k}" stroke="${RIM}" stroke-width="${6 * k}" fill="none" opacity="0.9"/>
        <path d="M ${x - 120 * k} ${hy + 140 * k} C ${x - 80 * k} ${hy + 96 * k}, ${x + 80 * k} ${hy + 96 * k}, ${x + 120 * k} ${hy + 140 * k}" stroke="${RIM}" stroke-width="${5 * k}" fill="none" opacity="0.6"/>${cam}`;
    }).join('');
    const flashes = (s.flashes || []).map((f) => t - at(f)).filter((d) => d >= 0 && d < 0.16);
    const fl = flashes.map((d, j) => {
      const r = 1 - d / 0.16, x = 120 + ((j * 397 + Math.floor(t * 7) * 131) % 860), y = 1560 + ((j * 211) % 160);
      return `<circle cx="${x}" cy="${y}" r="${n(160 * r)}" fill="url(#${id}flash)"/><circle cx="${x}" cy="${y}" r="${n(26 * r)}" fill="#FFFFFF"/>`;
    }).join('');
    const pressLayer = `<defs><radialGradient id="${id}flash" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.95"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient></defs>${press}${fl}`;
    const big = (s.bigFlashes || []).map((f) => t - at(f)).filter((d) => d >= 0 && d < 0.2);
    const wash = big.length ? `<rect width="1080" height="1920" fill="#FFFFFF" opacity="${n(0.22 * (1 - Math.min(...big) / 0.2))}"/>` : '';
    return [{ f: 0.4, svg: bg, blur: s.dof && s.dof.bg }, { f: 1, svg: subject, blur: s.dof && s.dof.all }, { f: 1.25, svg: pressLayer, blur: s.dof && s.dof.fg }, T.topShade(id), { f: 0, svg: wash }];
  };

  // ------------------------------------------------------------ the boxing ring
  // Fight night: him on the stool in his corner, the gold ropes across in front of him, the black
  // apron (TCP in gold) hiding the stool, the arena dark behind with the big screen over the ring.
  // The ring's edge is at y 1448. s.screen: [[t, 'stopped' | 'done' | 'logo'], …]; s.towel: [from, to]
  // (the towel thrown in, from his corner to the middle of the ring).
  SETS.ring = (s, t, st, p, id) => {
    p.light = { ...p.light, tint: '#FFF4E6', rim: 1 };
    const mode = (s.screen || []).filter(([a]) => t >= at(a)).map(([, m]) => m).pop() || 'logo';
    const crowd = [];
    for (let r = 0; r < 6; r++) for (let c = 0; c < 14; c++) {
      const x = -260 + c * 120 + (r % 2 ? 60 : 0) + Math.sin(c * 7 + r) * 14, y = 620 + r * 90, k = 0.7 + r * 0.08;
      crowd.push(`<circle cx="${n(x)}" cy="${n(y + Math.sin(t * 2.4 + c + r) * 3)}" r="${n(26 * k)}" fill="#0E0F14"/><path d="M ${n(x - 44 * k)} ${n(y + 80 * k)} C ${n(x - 40 * k)} ${n(y + 20 * k)}, ${n(x + 40 * k)} ${n(y + 20 * k)}, ${n(x + 44 * k)} ${n(y + 80 * k)} Z" fill="#0E0F14"/>
        <path d="M ${n(x - 22 * k)} ${n(y - 12 * k)} Q ${n(x)} ${n(y - 30 * k)} ${n(x + 22 * k)} ${n(y - 12 * k)}" stroke="#3A3F52" stroke-width="3" fill="none"/>`);
    }
    const scr = mode === 'stopped'
      ? `<rect width="480" height="280" fill="#0B0D11"/><text x="240" y="62" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="34" fill="#F4F1EA">ROUND 1</text>
        <path d="M 40 110 L 110 130 L 160 120 L 220 150 L 270 140 L 330 200 L 380 190 L 440 236" fill="none" stroke="#E0613F" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>
        <rect x="120" y="214" width="240" height="44" rx="6" fill="#E0613F"/><text x="240" y="245" text-anchor="middle" font-family="JB Mono" font-weight="600" font-size="24" fill="#1A0703">STOPPED OUT</text>`
      : mode === 'done'
        ? `<rect width="480" height="280" fill="#0B0D11"/>${crown(240, 100, 0.34)}<text x="240" y="210" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="40" fill="#F6E3A3">DONE FOR TODAY</text>`
        : `<rect width="480" height="280" fill="#0B0D11"/>${crown(240, 110, 0.4)}<text x="240" y="222" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="40" fill="#F6E3A3">FIGHT NIGHT</text>`;
    const bg = `<defs><linearGradient id="${id}rb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF6E0" stop-opacity="0.22"/><stop offset="1" stop-color="#FFF6E0" stop-opacity="0"/></linearGradient>
        <radialGradient id="${id}rg" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFE9C2" stop-opacity="0.28"/><stop offset="1" stop-color="#FFE9C2" stop-opacity="0"/></radialGradient></defs>
      <rect x="-600" y="-600" width="2280" height="3120" fill="#07080C"/>
      ${crowd.join('')}
      <g transform="translate(600 470) scale(0.88)"><rect x="-20" y="-20" width="520" height="320" rx="10" fill="#020203"/>${scr}<rect x="-20" y="-20" width="520" height="320" rx="10" fill="none" stroke="#1E2028" stroke-width="6"/></g>
      <path d="M 400 -400 L 680 -400 L 1100 1500 L -20 1500 Z" fill="url(#${id}rb)"/>
      <ellipse cx="560" cy="1300" rx="700" ry="380" fill="url(#${id}rg)"/>`;
    const place = `translate(${HIM.x} ${HIM.y}) scale(${HIM.s})`;
    const nearArm = `<g transform="${place}">${F.founderSVG(p, id + 'f', 'arm')}</g>`;
    // the corner behind him: the post and its pads; the ring's floor going back
    const corner = `<path d="M -300 1300 L 1400 1300 L 1400 1448 L -300 1448 Z" fill="#2B2D33"/>
      <rect x="40" y="620" width="34" height="860" fill="#1B1C20"/>
      ${[760, 920, 1080].map((y) => `<rect x="22" y="${y}" width="70" height="96" rx="14" fill="#16171B" stroke="#D8AD4E" stroke-width="3"/>${crown(57, y + 48, 0.12)}`).join('')}
      ${[800, 960, 1120].map((y, i) => `<path d="M 92 ${y} L 1400 ${y - 80 + i * 10}" stroke="#8C7238" stroke-width="10" stroke-linecap="round"/>`).join('')}`;
    // the near ropes, gold, sagging a little, in front of him
    const ropes = [1150, 1285, 1420].map((y) => `<path d="M -300 ${y} Q 540 ${y + 22} 1400 ${y}" stroke="#7A5B1E" stroke-width="22" fill="none"/>
      <path d="M -300 ${y - 4} Q 540 ${y + 18} 1400 ${y - 4}" stroke="#D8AD4E" stroke-width="15" fill="none"/><path d="M -300 ${y - 8} Q 540 ${y + 14} 1400 ${y - 8}" stroke="#F6E3A3" stroke-width="4" fill="none" opacity="0.8"/>`).join('');
    // the towel, thrown in
    let towel = '';
    if (s.towel) {
      const [a, b] = s.towel.map(at), u = cl((t - a) / (b - a));
      if (t >= a) {
        const x = mix(470, 560, u), y = mix(1230, 1432, u) - Math.sin(u * Math.PI) * 130, r = u * 400;
        towel = `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(r)}) scale(${n(u >= 1 ? 1.6 : 1.3)} ${n(u >= 1 ? 0.55 : 1.3)})"><path d="M -60 -34 C -20 -48, 30 -40, 62 -30 C 56 0, 60 20, 66 38 C 20 30, -24 44, -62 34 C -54 10, -58 -12, -60 -34 Z" fill="#F7F5F0" stroke="#1A120C" stroke-width="4"/>
          <path d="M -50 -20 C -10 -30, 30 -24, 54 -18 M -48 22 C -8 14, 30 22, 56 26" stroke="#C8BFAE" stroke-width="4" fill="none"/></g>`;
      }
    }
    const apron = `<path d="M -300 1448 L 1400 1448 L 1400 2400 L -300 2400 Z" fill="#0D0E11"/><path d="M -300 1448 L 1400 1448" stroke="#2E3138" stroke-width="8"/>
      ${[-120, 240, 600, 960].map((x) => `${crown(x, 1640, 0.26)}<text x="${x}" y="1740" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="56" fill="#D8AD4E">TCP</text>`).join('')}`;
    const subject = `${corner}
      <g transform="${place}">${F.founderSVG(p, id + 'f', 'body')}</g>
      ${nearArm}
      ${towel}
      ${ropes}
      ${apron}
      <clipPath id="${id}edge"><rect x="-600" y="-600" width="2280" height="2072"/></clipPath>
      <g clip-path="url(#${id}edge)">${castOf(s, t, id)}</g>`;
    return [{ f: 0.3, svg: bg, blur: s.dof && s.dof.bg }, { f: 1, svg: subject, blur: s.dof && s.dof.all }, T.topShade(id)];
  };

  // ------------------------------------------------------------ the game show
  // TAKE IT OR LEAVE IT: him at a contestant's podium (its top at y 1448), the big screen beside his
  // head with the trade on it, the stage's rays and chasing bulbs behind. On the podium, TAKE IT (gold)
  // and LEAVE IT (purple). s.board: [{ t, k, g, badge, press }]: how far the price line has run (k, 0
  // to 1), where GREED has dragged the target (g, screen units, or null), a badge ('hit' or 'taken'),
  // and the TAKE IT button pressed (press, 0 to 1). Numbers blend between keys; badges switch.
  // the price's path on the screen (440 x 300): up to the target at y 110, a little past it, then down
  const PATH = [[24, 262], [60, 240], [92, 250], [126, 214], [160, 222], [196, 176], [226, 186], [258, 138], [286, 112], [304, 96], [322, 104], [342, 150], [364, 196], [388, 238], [414, 270]];
  function boardAt(keys, t) {
    const ks = keys.map((k) => ({ ...k, at: at(k.t) }));
    let a = ks[0], b = ks[0];
    for (const k of ks) { if (k.at <= t) a = k; if (k.at > t) { b = k; break; } b = k; }
    const u = b.at > a.at ? cl((t - a.at) / (b.at - a.at)) : 1;
    const num = (key, d = 0) => mix(a[key] ?? d, b[key] ?? a[key] ?? d, u);
    return { k: num('k'), g: a.g == null && b.g == null ? null : num('g', 110), press: num('press'), badge: a.badge || null };
  }
  function gameScreen(q, t, id) {
    const pts = [], L = PATH.length - 1, end = q.k * L;
    for (let i = 0; i <= Math.floor(end); i++) pts.push(PATH[i]);
    if (end < L && end > 0) { const i = Math.floor(end), f = end - i; pts.push([mix(PATH[i][0], PATH[i + 1][0], f), mix(PATH[i][1], PATH[i + 1][1], f)]); }
    const last = pts[pts.length - 1] || PATH[0], down = pts.length > 11;
    const line = (y, col, label, dash = '10 8') => `<path d="M 16 ${n(y)} L 424 ${n(y)}" stroke="${col}" stroke-width="4" stroke-dasharray="${dash}"/><rect x="${300 - label.length * 5}" y="${n(y - 30)}" width="${label.length * 10 + 24}" height="24" rx="5" fill="${col}"/>
      <text x="${312 - label.length * 5 + label.length * 5}" y="${n(y - 12)}" text-anchor="middle" font-family="JB Mono" font-weight="600" font-size="15" fill="#0B0A1F">${label}</text>`;
    const badge = q.badge === 'hit'
      ? `<g opacity="${n(0.6 + 0.4 * Math.abs(Math.sin(t * 9)))}"><rect x="14" y="14" width="196" height="44" rx="9" fill="#F6E3A3"/><text x="112" y="45" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="24" fill="#1A120C">TARGET HIT</text></g>`
      : q.badge === 'taken'
        ? `<rect x="14" y="14" width="168" height="44" rx="9" fill="#35A68C"/><path d="M 32 36 L 44 48 L 64 24" stroke="#FFFFFF" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><text x="120" y="45" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="24" fill="#FFFFFF">TAKEN</text>` : '';
    return `<rect width="440" height="300" fill="#0B0A1F"/>
      ${[1, 2, 3, 4].map((i) => `<path d="M 0 ${i * 60} L 440 ${i * 60}" stroke="#1E1B3A" stroke-width="2"/>`).join('')}
      ${line(110, '#D8AD4E', 'TARGET')}
      ${q.g != null ? line(q.g, '#A47CFF', 'GREED’S TARGET', '6 6') : ''}
      ${pts.length > 1 ? `<path d="M ${pts.map((p) => `${n(p[0])} ${n(p[1])}`).join(' L ')}" fill="none" stroke="${down ? '#E0613F' : '#35D08F'}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>
        <circle cx="${n(last[0])}" cy="${n(last[1])}" r="9" fill="${down ? '#E0613F' : '#35D08F'}"/>` : ''}
      ${badge}`;
  }
  SETS.gameshow = (s, t, st, p, id) => {
    p.light = { ...p.light, tint: '#F2E9FF', rim: 1 };
    const q = boardAt(s.board || [{ t: 0, k: 0 }], t);
    const rays = Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2 + t * 0.08, a2 = a + 0.11; return `<path d="M 540 700 L ${n(540 + Math.cos(a) * 1800)} ${n(700 + Math.sin(a) * 1800)} L ${n(540 + Math.cos(a2) * 1800)} ${n(700 + Math.sin(a2) * 1800)} Z" fill="#FFFFFF" opacity="${i % 2 ? 0.035 : 0.07}"/>`; }).join('');
    const bulbs = [];
    for (let i = 0; i < 40; i++) {
      const u = i / 40, x = u < 0.5 ? -200 + u * 2 * 1480 : -200 + (1 - (u - 0.5) * 2) * 1480, y = u < 0.5 ? 160 : 1300;
      const on = Math.floor(t * 8 + i) % 3 === 0;
      bulbs.push(`<circle cx="${n(x)}" cy="${y}" r="12" fill="${on ? '#FFE9A8' : '#6B5A2A'}"/>${on ? `<circle cx="${n(x)}" cy="${y}" r="26" fill="#FFE9A8" opacity="0.25"/>` : ''}`);
    }
    const bg = `<defs><radialGradient id="${id}gs" cx="0.5" cy="0.4" r="0.7"><stop offset="0" stop-color="#3B1F7A"/><stop offset="1" stop-color="#0D0820"/></radialGradient></defs>
      <rect x="-600" y="-600" width="2280" height="3120" fill="url(#${id}gs)"/>${rays}${bulbs.join('')}`;
    const place = `translate(${HIM.x} ${HIM.y}) scale(${HIM.s})`;
    const nearArm = `<g transform="${place}">${F.founderSVG(p, id + 'f', 'arm')}</g>`;
    const dome = (x, col, dark, label, press) => `<g transform="translate(${x} 1508)"><ellipse cx="0" cy="10" rx="62" ry="17" fill="#09060F"/><ellipse cx="0" cy="${n(4 + press * 6)}" rx="50" ry="14" fill="${dark}"/>
      <path d="M -46 ${n(2 + press * 6)} C -46 ${n(-34 + press * 18)}, 46 ${n(-34 + press * 18)}, 46 ${n(2 + press * 6)} Z" fill="${col}"/>${press > 0.5 ? `<circle cx="0" cy="-8" r="70" fill="${col}" opacity="0.3"/>` : ''}
      <ellipse cx="-14" cy="${n(-16 + press * 14)}" rx="16" ry="6" fill="#FFFFFF" opacity="0.5"/>
      <text x="0" y="52" text-anchor="middle" font-family="JB Mono" font-weight="600" font-size="20" fill="${col}">${label}</text></g>`;
    const subject = `
      <g transform="translate(616 640)"><rect x="-18" y="-18" width="476" height="336" rx="10" fill="#050308" stroke="#D8AD4E" stroke-width="4"/>${gameScreen(q, t, id)}</g>
      <g transform="${place}">${F.founderSVG(p, id + 'f', 'body')}</g>
      ${nearArm}
      <!-- the podium -->
      <path d="M -300 1448 L 1400 1448 L 1400 1570 L -300 1570 Z" fill="#20163F"/><path d="M -300 1450 L 1400 1450" stroke="#D8AD4E" stroke-width="6"/>
      ${dome(560, '#F2C24E', '#8C6A1E', 'TAKE IT', q.press)}${dome(740, '#A47CFF', '#4B2C99', 'LEAVE IT', 0)}
      <clipPath id="${id}pod"><rect x="-600" y="-600" width="2280" height="2172"/></clipPath>
      <g clip-path="url(#${id}pod)">${castOf(s, t, id)}</g>
      <path d="M -300 1570 L 1400 1570 L 1400 2400 L -300 2400 Z" fill="#170F30"/><path d="M -300 1570 L 1400 1570" stroke="#3A2A6B" stroke-width="6"/>
      ${Array.from({ length: 22 }, (_, i) => `<circle cx="${-280 + i * 80}" cy="1600" r="9" fill="${Math.floor(t * 6 + i) % 2 ? '#FFE9A8' : '#5E4B22'}"/>`).join('')}
      ${crown(540, 1700, 0.28)}<text x="540" y="1790" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="52" fill="#F6E3A3">TAKE IT</text>
      <text x="540" y="1846" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="34" fill="#C9B5FF">OR LEAVE IT</text>`;
    return [{ f: 0.35, svg: bg, blur: s.dof && s.dof.bg }, { f: 1, svg: subject, blur: s.dof && s.dof.all }, T.topShade(id)];
  };

  T.castOf = castOf;
  T.SPOTS = SPOTS;
})();
