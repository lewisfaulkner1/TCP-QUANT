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
//   cinema    a horror film's late showing: him in a red velvet seat, the screen's cold flicker
//   film      that film up close, THE TRADE, from the row behind: his cap and FEAR in silhouette
//   waterhole a savanna's watering hole for a wildlife film: the sky by the hour, the water, the near bank
//   hide      inside the film-maker's hide on that bank: canvas, the long lens, the slit's bright view
//   track     a floodlit stadium on race night, side on: the stands, the boards, the lanes, the finish
//   booth     the commentary box above it: him at the desk with a microphone, the stadium behind
//   museum    the museum of red flags, side on: gallery 1's exhibits in glass cases, gallery 2's green flags
//   gallery   him in gallery 2 as the guide, at a lectern, the green wall and its frames behind him
//   coaster   a theme park at sunset: a rollercoaster whose track is a price chart, START to TARGET
//   operator  him at the ride's controls: the lever, RIDE AT YOUR OWN RISK, the ride through the glass
(function () {
  const T = window.Toon, C = window.Cast, F = window.Founder;
  const { SETS, HIM, n, cl, mix, crown } = T;
  const INK = '#1A120C';

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
    // GREED's line shows only from the key that first gives it, then follows the keys after
    return { k: num('k'), g: a.g == null ? null : num('g', a.g), press: num('press'), badge: a.badge || null };
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

  // ------------------------------------------------------------ the cinema
  // A late showing of a horror film called THE TRADE: him in a red velvet seat, the screen off to the
  // right lighting the rows in a cold flicker, the row in front's seat backs below (their tops at y
  // 1448). The film itself is the set 'film'. s.film: [{ t, k, closed, hit, scare }]: how far the price
  // has run (k, 0 to 1), whether it's been closed (and where), the target hit, and a jump-scare flash.
  const FILM = [[80, 520], [150, 548], [210, 530], [270, 590], [320, 612], [370, 572], [420, 515], [470, 500], [520, 540], [580, 470],
    [640, 420], [700, 360], [760, 380], [820, 300], [880, 250], [940, 214], [1000, 206]];
  const CLOSE_K = 7 / 16;
  function filmAt(keys, t) {
    const ks = (keys || [{ t: 0, k: 0 }]).map((k) => ({ ...k, at: at(k.t) }));
    let a = ks[0], b = ks[0];
    for (const k of ks) { if (k.at <= t) a = k; if (k.at > t) { b = k; break; } b = k; }
    const u = b.at > a.at ? cl((t - a.at) / (b.at - a.at)) : 1;
    return { k: mix(a.k ?? 0, b.k ?? a.k ?? 0, u), closed: !!a.closed, hit: !!a.hit, title: !!a.title, scare: ks.filter((k) => k.scare).map((k) => t - k.at).filter((d) => d >= 0 && d < 0.5)[0] };
  }
  function filmSVG(q, t, id) {
    const L = FILM.length - 1, end = q.k * L, pts = [];
    for (let i = 0; i <= Math.floor(end); i++) pts.push(FILM[i]);
    if (end < L && end > 0) { const i = Math.floor(end), f = end - i; pts.push([mix(FILM[i][0], FILM[i + 1][0], f), mix(FILM[i][1], FILM[i + 1][1], f)]); }
    const last = pts[pts.length - 1] || FILM[0];
    const lineAt = (y, col, label, dash = '') => `<path d="M 40 ${y} L 1040 ${y}" stroke="${col}" stroke-width="4" ${dash ? `stroke-dasharray="${dash}"` : ''} opacity="0.9"/>
      <text x="960" y="${y - 14}" text-anchor="end" font-family="JB Mono" font-weight="600" font-size="30" fill="${col}">${label}</text>`;
    const stamp = (x, y, w, bg, fg, text, k = 1) => `<g transform="translate(${n(x)} ${n(y)}) scale(${n(k)})"><rect x="${-w / 2}" y="-32" width="${w}" height="64" rx="10" fill="${bg}"/>
      <text x="0" y="11" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="30" fill="${fg}">${text}</text></g>`;
    const pop = q.scare != null ? 1.35 - 0.35 * (1 - Math.pow(1 - cl(q.scare / 0.22), 3)) : 1;
    const ck = CLOSE_K * L, cp = FILM[Math.round(ck)];
    const flick = 0.92 + Math.sin(t * 31) * 0.03 + Math.sin(t * 7.3) * 0.03;
    return `<defs><radialGradient id="${id}fv" cx="0.5" cy="0.5" r="0.7"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.75"/></radialGradient></defs>
      <rect x="0" y="0" width="1080" height="900" fill="#07090D"/>
      <g opacity="${n(flick)}">
        ${[1, 2, 3, 4, 5, 6].map((i) => `<path d="M 0 ${i * 128} L 1080 ${i * 128}" stroke="#141822" stroke-width="2"/>`).join('')}
        ${lineAt(206, '#D8AD4E', 'TARGET', '14 10')}${lineAt(520, '#C9C3B6', 'ENTRY', '6 8')}${lineAt(760, '#E0613F', 'STOP')}
        ${pts.length > 1 ? `<path d="M ${pts.map((p) => `${n(p[0])} ${n(p[1])}`).join(' L ')}" fill="none" stroke="#7FE0B3" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/>
          <circle cx="${n(last[0])}" cy="${n(last[1])}" r="14" fill="#7FE0B3"/><circle cx="${n(last[0])}" cy="${n(last[1])}" r="30" fill="#7FE0B3" opacity="0.2"/>` : ''}
        ${q.closed && end >= ck ? `<path d="M ${cp[0]} ${cp[1] + 16} L ${cp[0] + 50} ${cp[1] + 86}" stroke="#9CCBF2" stroke-width="4"/>
          <circle cx="${cp[0]}" cy="${cp[1]}" r="16" fill="none" stroke="#9CCBF2" stroke-width="5"/>${stamp(cp[0] + 140, cp[1] + 118, 370, '#9CCBF2', '#0E2236', 'CLOSED +2 PIPS')}` : ''}
        ${q.hit ? stamp(800, 120, 300, '#D8AD4E', '#1A120C', 'TARGET HIT', pop) : ''}
        ${q.title ? `<text x="540" y="420" text-anchor="middle" font-family="Serif" font-style="italic" font-size="150" fill="#E9E4D8">The Trade</text><text x="540" y="500" text-anchor="middle" font-family="JB Mono" font-weight="600" font-size="28" letter-spacing="10" fill="#9C968A">A HORROR IN ONE POSITION</text>` : ''}
      </g>
      ${q.scare != null ? `<rect width="1080" height="900" fill="#FFFFFF" opacity="${n(0.5 * (1 - q.scare / 0.5))}"/>` : ''}
      <rect width="1080" height="900" fill="url(#${id}fv)"/>`;
  }
  // the film, up close, from the row behind: the screen over the heads, him (his cap) and FEAR next to
  // him black against it with a cold rim that flickers with the film. FEAR's outline follows its track.
  SETS.film = (s, t, st, p, id) => {
    const q = filmAt(s.film, t);
    const flick = 0.8 + Math.sin(t * 23) * 0.08 + Math.sin(t * 5.1) * 0.1 + (q.scare != null ? (1 - q.scare / 0.5) * 0.9 : 0);
    const track = s.cast && s.cast.fear;
    let fear = '';
    if (track) {
      const f = C.at('fear', track, t);
      f.pose.__full = true;
      fear = `<g transform="translate(700 1690) scale(1.5)">${C.svg('fear', f.pose, t, id + 'fs')}</g>`;
    }
    const head = (x, y, k) => `<ellipse cx="${x}" cy="${y}" rx="${n(46 * k)}" ry="${n(56 * k)}"/><path d="M ${n(x - 120 * k)} ${n(y + 280 * k)} C ${n(x - 112 * k)} ${n(y + 70 * k)}, ${n(x + 112 * k)} ${n(y + 70 * k)}, ${n(x + 120 * k)} ${n(y + 280 * k)} Z"/>`;
    // him from behind: the cap's dome and button, his head, neck and shoulders
    const him = `<ellipse cx="300" cy="1330" rx="116" ry="138"/>
      <path d="M 178 1290 C 172 1172, 246 1124, 304 1124 C 366 1124, 434 1170, 426 1290 Z"/><circle cx="304" cy="1122" r="11"/>
      <path d="M 236 1430 L 370 1430 L 392 1510 C 500 1530, 590 1590, 620 1920 L -20 1920 C 10 1590, 96 1530, 212 1510 Z"/>`;
    const people = `${head(90, 1236, 0.7)}${head(540, 1252, 0.66)}${head(990, 1226, 0.72)}${head(1080, 1400, 1.4)}${him}${fear}`;
    const seats = `<rect x="40" y="1640" width="530" height="400" rx="46"/><rect x="600" y="1640" width="530" height="400" rx="46"/>`;
    const svg = `<defs><filter id="${id}rim" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="3"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0.62  0 0 0 0 0.76  0 0 0 0 0.98  0 0 0 ${n(cl(0.55 * flick, 0, 1))} 0"/></filter>
        <filter id="${id}sil" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB"><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0.008  0 0 0 0 0.011  0 0 0 0 0.02  0 0 0 1 0"/></filter>
        <linearGradient id="${id}wl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A2130"/><stop offset="1" stop-color="#07080C"/></linearGradient></defs>
      <rect x="-600" y="-600" width="2280" height="3120" fill="#05060A"/>
      ${[24, 14, 6].map((d) => `<rect x="${-d}" y="${300 - d}" width="${1080 + 2 * d}" height="${900 + 2 * d}" rx="${d}" fill="#7FA6D9" opacity="${n(0.05 * flick)}"/>`).join('')}
      <g transform="translate(0 300)">${filmSVG(q, t, id)}</g>
      <rect x="-600" y="1200" width="2280" height="1320" fill="url(#${id}wl)"/>
      <ellipse cx="540" cy="1210" rx="700" ry="90" fill="#7FA6D9" opacity="${n(0.1 * flick)}"/>
      <g filter="url(#${id}rim)">${people}</g><g filter="url(#${id}sil)">${people}</g>
      <g filter="url(#${id}rim)">${seats}</g><g fill="#160406">${seats}</g>`;
    return [{ f: 1, svg }];
  };
  SETS.cinema = (s, t, st, p, id) => {
    const q = filmAt(s.film, t);
    const flick = 0.75 + Math.sin(t * 23) * 0.08 + Math.sin(t * 5.1) * 0.1 + (q.scare != null ? (1 - q.scare / 0.5) * 0.9 : 0);
    p.light = { ...p.light, tint: '#CFE0FF', rim: 1 };
    const seat = (x, y, w, h) => `<path d="M ${x - w / 2} ${y + h} L ${x - w / 2} ${y + 40} C ${x - w / 2} ${y}, ${x + w / 2} ${y}, ${x + w / 2} ${y + 40} L ${x + w / 2} ${y + h} Z" fill="#6E1218"/>
      <path d="M ${x - w / 2 + 16} ${y + h} L ${x - w / 2 + 16} ${y + 50} C ${x - w / 2 + 16} ${y + 22}, ${x + w / 2 - 16} ${y + 22}, ${x + w / 2 - 16} ${y + 50} L ${x + w / 2 - 16} ${y + h} Z" fill="#8E1A22"/>
      ${[1, 2, 3].map((i) => `<path d="M ${x - w / 2 + 16 + i * (w - 32) / 4} ${y + 40} L ${x - w / 2 + 16 + i * (w - 32) / 4} ${y + h}" stroke="#6E1218" stroke-width="5"/>`).join('')}`;
    const rowsBehind = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) {
      const x = -140 + c * 250 + (r % 2 ? 125 : 0), y = 460 + r * 150, k = 0.5 + r * 0.12;
      rowsBehind.push(`<g opacity="${0.5 + r * 0.15}">${seat(x, y, 200 * k, 260 * k)}</g>`);
      if ((c + r) % 3 === 0) rowsBehind.push(`<ellipse cx="${x}" cy="${y - 20 * k}" rx="${44 * k}" ry="${52 * k}" fill="#06070B"/><path d="M ${x + 30 * k} ${y - 60 * k} Q ${x + 48 * k} ${y - 20 * k} ${x + 34 * k} ${y + 10 * k}" stroke="#7FA6D9" stroke-width="4" fill="none" opacity="0.6"/>`);
    }
    const bg = `<defs><linearGradient id="${id}cw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#06070B"/><stop offset="1" stop-color="#121722"/></linearGradient></defs>
      <rect x="-600" y="-600" width="2280" height="3120" fill="url(#${id}cw)"/>
      ${[[-60, 300], [1140, 300]].map(([x, y]) => `<rect x="${x - 18}" y="${y}" width="36" height="70" rx="8" fill="#3A2416"/><ellipse cx="${x}" cy="${y + 20}" rx="60" ry="80" fill="#F2B866" opacity="0.12"/>`).join('')}
      ${rowsBehind.join('')}`;
    const place = `translate(${HIM.x} ${HIM.y}) scale(${HIM.s})`;
    const nearArm = `<g transform="${place}">${F.founderSVG(p, id + 'f', 'arm')}</g>`;
    const subject = `
      ${seat(330, 640, 470, 860)}
      ${seat(800, 860, 340, 640)}
      <g transform="${place}">${F.founderSVG(p, id + 'f', 'body')}</g>
      ${nearArm}
      <path d="M 560 1180 L 640 1180 L 640 1470 L 560 1470 Z" fill="#2A0C10"/><rect x="548" y="1166" width="104" height="26" rx="10" fill="#3A1218"/>
      <clipPath id="${id}cin"><rect x="-600" y="-600" width="2280" height="2060"/></clipPath>
      <g clip-path="url(#${id}cin)">${castOf(s, t, id)}</g>
      ${[[110, 1448, 420], [560, 1448, 420], [1010, 1448, 420]].map(([x, y, w]) => seat(x, y, w, 700)).join('')}`;
    const glow = `<defs><linearGradient id="${id}sl" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#BFD8FF" stop-opacity="0.55"/><stop offset="0.6" stop-color="#BFD8FF" stop-opacity="0.08"/><stop offset="1" stop-color="#BFD8FF" stop-opacity="0"/></linearGradient>
        <radialGradient id="${id}cv" cx="0.45" cy="0.48" r="0.75"><stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.7"/></radialGradient></defs>
      <rect width="1080" height="1920" fill="url(#${id}sl)" opacity="${n(cl(flick, 0, 1.6) * 0.5)}" style="mix-blend-mode:screen"/>
      <rect width="1080" height="1920" fill="url(#${id}cv)"/>`;
    return [{ f: 0.4, svg: bg, blur: s.dof && s.dof.bg }, { f: 1, svg: subject, blur: s.dof && s.dof.all }, { f: 0, svg: glow }, T.topShade(id)];
  };

  // ------------------------------------------------------------ the watering hole
  // A savanna's watering hole, for a wildlife film. The sky and its light follow the hour (s.hour:
  // [{ t, h }], h in hours, past 24 the next day): the sun, the moon and the stars, clouds that race
  // when the hours do. The far bank and its acacias, the water (y 1120 to 1660), the near bank, and the
  // hide on the left with his cap peeking out. A cast member whose pose has `wade` stands in the water
  // up to that height (its own units). s.splash: [[t, x, y]].
  const SKY = [ // hour, top, bottom, dark, stars
    [0, '#060B1E', '#131D3E', 0.7, 1], [4.6, '#0B1230', '#2A2A55', 0.64, 0.9], [5.6, '#2C3570', '#D27A78', 0.36, 0.3],
    [6.6, '#5C77B8', '#FFC48A', 0.1, 0], [8.5, '#5E9BD8', '#D6EAF2', 0, 0], [12, '#4C8ED8', '#C4E2F2', 0, 0],
    [15.5, '#4F8CD6', '#F4D9A6', 0, 0], [17.6, '#5B6FC0', '#FFB56A', 0.06, 0], [18.9, '#3A3C78', '#F08A5E', 0.28, 0.1],
    [20.2, '#141A44', '#4A3A72', 0.58, 0.6], [21.5, '#070C22', '#18204A', 0.68, 0.95], [24, '#060B1E', '#131D3E', 0.7, 1]];
  const hexMix = (a, b, k) => {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const c = (sh) => Math.round(mix((pa >> sh) & 255, (pb >> sh) & 255, cl(k)));
    return `#${((1 << 24) + (c(16) << 16) + (c(8) << 8) + c(0)).toString(16).slice(1)}`;
  };
  function skyAt(h) {
    const hh = ((h % 24) + 24) % 24;
    let i = 0;
    while (i < SKY.length - 2 && SKY[i + 1][0] <= hh) i++;
    const a = SKY[i], b = SKY[i + 1], k = cl((hh - a[0]) / (b[0] - a[0]));
    return { h, hh, top: hexMix(a[1], b[1], k), bottom: hexMix(a[2], b[2], k), dark: mix(a[3], b[3], k), stars: mix(a[4], b[4], k) };
  }
  function hourAt(keys, t) {
    const ks = (keys || [{ t: 0, h: 15 }]).map((k) => ({ ...k, at: at(k.t) }));
    if (t <= ks[0].at) return ks[0].h;
    for (let i = 0; i < ks.length - 1; i++) {
      const a = ks[i], b = ks[i + 1];
      if (t < b.at) { const u = cl((t - a.at) / (b.at - a.at)); return mix(a.h, b.h, u * u * (3 - 2 * u)); }
    }
    return ks[ks.length - 1].h;
  }
  const acacia = (x, y, k, col) => `<g transform="translate(${x} ${y}) scale(${k})" fill="${col}"><path d="M -7 0 L -5 -110 Q -30 -142 -62 -164 L -55 -171 Q -22 -152 -1 -132 Q 16 -164 52 -180 L 57 -173 Q 26 -154 7 -116 L 9 0 Z"/>
    <ellipse cx="0" cy="-186" rx="150" ry="24"/><ellipse cx="-66" cy="-196" rx="84" ry="19"/><ellipse cx="74" cy="-193" rx="92" ry="21"/><ellipse cx="8" cy="-204" rx="70" ry="16"/></g>`;
  // the sky, the sun or the moon, the stars and clouds, the far hills: shared with the hide's slit
  function savannaFar(sky, id) {
    const sunK = (sky.hh - 12) / 6.4, moonH = sky.hh < 12 ? sky.hh + 24 : sky.hh, moonK = (moonH - 24.5) / 5.8;
    const sun = Math.abs(sunK) < 1.05 ? [540 + sunK * 720, 1010 - Math.cos(cl(Math.abs(sunK), 0, 1) * Math.PI / 2) * 660] : null;
    const moon = Math.abs(moonK) < 1.05 ? [540 + moonK * 720, 1010 - Math.cos(cl(Math.abs(moonK), 0, 1) * Math.PI / 2) * 600] : null;
    const low = sun ? cl((sun[1] - 520) / 480) : 0;
    const stars = sky.stars > 0.02 ? Array.from({ length: 46 }, (_, i) => {
      const x = (i * 137.5 + 40) % 1080, y = 60 + ((i * 251) % 820), tw = 0.6 + 0.4 * Math.sin(i * 1.7 + sky.h * 9);
      return `<circle cx="${n(x)}" cy="${n(y)}" r="${1.6 + (i % 3) * 0.8}" fill="#FFFFFF" opacity="${n(sky.stars * tw)}"/>`;
    }).join('') : '';
    const drift = (sky.h * 260) % 2600;
    const clouds = [[0, 300, 1], [900, 430, 0.8], [1700, 220, 1.2]].map(([x0, y, k]) => {
      const x = ((x0 + drift) % 2600) - 700;
      const col = hexMix(sky.bottom, '#FFFFFF', 0.75 - sky.dark * 0.6);
      return `<g transform="translate(${n(x)} ${y}) scale(${k * 0.8})" fill="${col}" opacity="${n(0.6 - sky.dark * 0.4)}"><ellipse cx="0" cy="0" rx="150" ry="34"/><ellipse cx="-70" cy="-18" rx="80" ry="34"/><ellipse cx="60" cy="-26" rx="90" ry="40"/></g>`;
    }).join('');
    const hill = hexMix(sky.bottom, '#3B3A40', 0.55 + sky.dark * 0.3), hill2 = hexMix(sky.bottom, '#2C2C2A', 0.72 + sky.dark * 0.2);
    return `<defs><linearGradient id="${id}sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky.top}"/><stop offset="1" stop-color="${sky.bottom}"/></linearGradient>
        <radialGradient id="${id}sg"><stop offset="0" stop-color="#FFE7B0" stop-opacity="0.8"/><stop offset="1" stop-color="#FFE7B0" stop-opacity="0"/></radialGradient></defs>
      <rect x="-600" y="-600" width="2280" height="1700" fill="url(#${id}sk)"/>${stars}
      ${sun ? `<circle cx="${n(sun[0])}" cy="${n(sun[1])}" r="230" fill="url(#${id}sg)"/><circle cx="${n(sun[0])}" cy="${n(sun[1])}" r="62" fill="${hexMix('#FFF4D6', '#FF9B4A', low)}"/>` : ''}
      ${moon ? `<g opacity="${n(cl(sky.dark * 1.6))}"><circle cx="${n(moon[0])}" cy="${n(moon[1])}" r="44" fill="#F3EED8"/><circle cx="${n(moon[0] + 20)}" cy="${n(moon[1] - 10)}" r="40" fill="${sky.top}" opacity="0.9"/></g>` : ''}
      ${clouds}
      <path d="M -600 1000 L -600 930 Q -300 860 -40 930 Q 240 880 470 950 Q 700 890 940 940 Q 1200 870 1680 930 L 1680 1000 Z" fill="${hill}"/>
      <path d="M -600 1060 L -600 990 Q -200 960 160 1000 Q 520 960 860 1004 Q 1200 970 1680 996 L 1680 1060 Z" fill="${hill2}"/>`;
  }
  SETS.waterhole = (s, t, st, p, id) => {
    const sky = skyAt(hourAt(s.hour, t));
    const tree = hexMix(sky.bottom, '#1E1A14', 0.78 + sky.dark * 0.2);
    const grass = hexMix('#D8B460', '#2A2E3A', sky.dark), grassD = hexMix('#A4823C', '#1A1E28', sky.dark);
    const bank = hexMix('#8C7636', '#1C2026', sky.dark), bankD = hexMix('#5E4E22', '#12151A', sky.dark);
    const sunK = (sky.hh - 12) / 6.4, sunX = 540 + sunK * 720, sunUp = Math.abs(sunK) < 1;
    const far = `${savannaFar(sky, id)}
      ${acacia(150, 1068, 1.25, tree)}${acacia(800, 1050, 0.62, tree)}${acacia(1010, 1062, 0.9, tree)}`;
    const blades = (x0, x1, y, h, col, seed) => {
      let d = '';
      for (let x = x0, i = 0; x < x1; x += 14, i++) { const hh2 = h * (0.6 + 0.4 * Math.abs(Math.sin(i * 1.9 + seed))), lean = Math.sin(t * 1.3 + i * 0.7) * 4; d += `M ${x} ${y} L ${n(x + 5 + lean)} ${n(y - hh2)} L ${x + 10} ${y} `; }
      return `<path d="${d}Z" fill="${col}"/>`;
    };
    const shine = (k) => hexMix(sky.bottom, '#FFFFFF', k);
    const water = `<defs><linearGradient id="${id}wt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hexMix(sky.bottom, '#3C8296', 0.45)}"/><stop offset="1" stop-color="${hexMix(sky.top, '#0E3442', 0.5)}"/></linearGradient></defs>
      <rect x="-600" y="1110" width="2280" height="600" fill="url(#${id}wt)"/>
      ${Array.from({ length: 12 }, (_, i) => { const y = 1150 + i * 42 + (i % 2) * 8, w = 160 + (i * 73) % 220, x = ((i * 311 + t * (10 + i * 3)) % 1500) - 260; return `<path d="M ${n(x)} ${y} L ${n(x + w)} ${y}" stroke="${shine(0.5)}" stroke-width="3" opacity="${n(0.22 - sky.dark * 0.12)}" stroke-linecap="round"/>`; }).join('')}
      ${sunUp ? Array.from({ length: 9 }, (_, i) => `<path d="M ${n(sunX - 40 + Math.sin(t * 3 + i) * 30)} ${1140 + i * 30} l ${60 + (i % 3) * 30} 0" stroke="#FFE3A8" stroke-width="5" opacity="${n(0.5 - i * 0.04)}" stroke-linecap="round"/>`).join('') : ''}
      <path d="M -600 1110 L 1680 1110 L 1680 1136 Q 1000 1150 540 1132 Q 100 1150 -600 1134 Z" fill="${hexMix(grassD, '#000000', 0.35)}" opacity="0.7"/>
      ${blades(-600, 1680, 1118, 34, grass, 1)}
      ${[[-30, 1136], [70, 1130], [960, 1132], [1040, 1138]].map(([x, y]) => `<path d="M ${x} ${y} q -6 -60 -2 -110 M ${x + 10} ${y} q 6 -70 14 -120 M ${x + 20} ${y} q 2 -50 0 -90" stroke="${grassD}" stroke-width="5" fill="none"/>`).join('')}`;
    // the near bank, rising to the right where PATIENCE sits; the hide on the left
    const leaf = (i) => hexMix(i % 2 ? '#5E7032' : '#3E4C22', '#141A12', sky.dark);
    const hideBush = `<g transform="translate(200 1700)">
        <path d="M -190 0 C -200 -60, -150 -120, -60 -110 C -20 -150, 70 -150, 110 -100 C 170 -110, 210 -50, 200 0 Z" fill="${hexMix('#4A5A2A', '#141A12', sky.dark)}"/>
        ${Array.from({ length: 18 }, (_, i) => { const a2 = (i / 18) * Math.PI, r = 120 + (i % 3) * 14, lx = Math.cos(a2) * -r * 1.4 + 10, ly = -Math.sin(a2) * r * 0.9; return `<ellipse cx="${n(lx)}" cy="${n(ly)}" rx="34" ry="16" transform="rotate(${n(-a2 * 57 + 90)} ${n(lx)} ${n(ly)})" fill="${leaf(i)}"/>`; }).join('')}
        <rect x="-70" y="-74" width="150" height="20" rx="8" fill="#0C0E0A"/>
        <path d="M 74 -64 L 128 -60 L 128 -50 L 74 -54 Z" fill="#1A1C20"/>
        <g transform="translate(-6 -150) scale(1.35)"><path d="M -40 8 C -40 -30, 40 -30, 44 6 Z" fill="#141518"/><path d="M 32 2 Q 60 0 76 8 L 36 10 Z" fill="#101114"/>${crown(2, -12, 0.12, '#D8AD4E')}</g>
        ${[3, 7, 11, 15].map((i) => { const a2 = (i / 18) * Math.PI, r = 150, lx = Math.cos(a2) * -r * 1.2 + 10, ly = -Math.sin(a2) * r * 0.85; return `<ellipse cx="${n(lx)}" cy="${n(ly)}" rx="30" ry="14" transform="rotate(${n(-a2 * 57 + 90)} ${n(lx)} ${n(ly)})" fill="${leaf(i + 1)}"/>`; }).join('')}</g>`;
    const tufts = [[-20, 1760, 1.2], [330, 1720, 0.9], [560, 1800, 1.4], [980, 1760, 1.1], [1180, 1840, 1.3], [120, 1880, 1.5], [760, 1900, 1.2]].map(([x, y, k]) =>
      `<path d="M ${x - 30 * k} ${y} L ${x - 16 * k} ${y - 60 * k} L ${x - 8 * k} ${y} L ${x} ${y - 80 * k} L ${x + 8 * k} ${y} L ${x + 18 * k} ${y - 56 * k} L ${x + 30 * k} ${y} Z" fill="${grassD}"/>`).join('');
    const nearBank = `<path d="M -600 1690 Q -100 1668 300 1676 Q 620 1680 760 1648 Q 900 1626 1100 1632 L 1680 1640 L 1680 2500 L -600 2500 Z" fill="${bank}"/>
      <path d="M -600 1690 Q -100 1668 300 1676 Q 620 1680 760 1648 Q 900 1626 1100 1632 L 1680 1640" stroke="${bankD}" stroke-width="8" fill="none"/>
      ${[[-120, 1820, 260, 40], [420, 1760, 200, 26], [700, 1880, 300, 44], [1100, 1790, 220, 30]].map(([x, y, w, h]) => `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${h}" fill="${bankD}" opacity="0.35"/>`).join('')}
      ${[[260, 1780, 16], [292, 1790, 10], [640, 1840, 20], [1010, 1880, 14], [40, 1900, 18], [1060, 1730, 11]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r * 1.4}" ry="${r}" fill="${hexMix('#9C9488', '#20232A', sky.dark)}"/><ellipse cx="${x - r * 0.3}" cy="${y - r * 0.35}" rx="${r * 0.6}" ry="${r * 0.3}" fill="#FFFFFF" opacity="${n(0.25 - sky.dark * 0.2)}"/>`).join('')}
      ${blades(-600, 1680, 1700, 30, grass, 3)}${tufts}`;
    // the cast, each from its track; in the water up to its pose's `wade`
    const list = Object.entries(s.cast || {}).map(([who, track]) => ({ who, q: C.at(who, track, t) })).sort((a, b) => a.q.y - b.q.y);
    const cast = list.map(({ who, q }) => {
      q.pose.__full = true;
      const g = `<g transform="translate(${n(q.x)} ${n(q.y)}) scale(${n(q.s)})">${C.svg(who, q.pose, t, id + who)}</g>`;
      const wade = q.pose.wade || 0;
      if (wade <= 1) return g;
      const wy = q.y - wade * q.s, rx = C.WHO[who].W * q.s * 0.62, ring = (t * 0.9) % 1;
      const bubbles = wade > 200 ? [0, 1, 2].map((i) => { const u = (t * 1.6 + i * 0.33) % 1; return `<circle cx="${n(q.x + Math.sin(t * 5 + i * 2) * 14 + (i - 1) * 16)}" cy="${n(wy - u * 40)}" r="${5 + i * 2}" fill="none" stroke="#FFFFFF" stroke-width="2.4" opacity="${n(1 - u)}"/>`; }).join('') : '';
      return `<clipPath id="${id}${who}w"><rect x="-600" y="-600" width="2280" height="${n(wy + 600)}"/></clipPath><g clip-path="url(#${id}${who}w)">${g}</g>
        <ellipse cx="${n(q.x)}" cy="${n(wy)}" rx="${n(rx)}" ry="${n(rx * 0.16)}" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.7"/>
        <ellipse cx="${n(q.x)}" cy="${n(wy + 2)}" rx="${n(rx * (1.1 + ring * 0.9))}" ry="${n(rx * 0.16 * (1.1 + ring * 0.9))}" fill="none" stroke="#FFFFFF" stroke-width="2.2" opacity="${n(0.5 * (1 - ring))}"/>${bubbles}`;
    }).join('');
    // splashes: spray up and out, and a ring
    const splashes = (s.splash || []).map(([t0, x, y]) => {
      const d = t - at(t0);
      if (d < 0 || d > 0.9) return '';
      const u = d / 0.9;
      const drops = Array.from({ length: 16 }, (_, i) => {
        const a2 = -Math.PI / 2 + (i - 7.5) * 0.17, v = 330 + (i % 4) * 60;
        const px = x + Math.cos(a2) * v * d * 1.1, py = y + Math.sin(a2) * v * d + 900 * d * d;
        return py < y + 10 ? `<circle cx="${n(px)}" cy="${n(py)}" r="${7 + (i % 3) * 2}" fill="#E8F6FF" stroke="${INK}" stroke-width="2" opacity="${n(1 - u * 0.6)}"/>` : '';
      }).join('');
      const crownH = 110 * Math.sin(Math.min(1, d / 0.45) * Math.PI);
      return `<path d="M ${x - 90} ${y} Q ${x - 70} ${n(y - crownH)} ${x - 46} ${y} Q ${x - 24} ${n(y - crownH * 1.3)} ${x} ${y} Q ${x + 24} ${n(y - crownH * 1.25)} ${x + 46} ${y} Q ${x + 70} ${n(y - crownH * 0.95)} ${x + 90} ${y} Z" fill="#E8F6FF" stroke="${INK}" stroke-width="3" opacity="${n(1 - u * 0.5)}"/>
        ${drops}<ellipse cx="${x}" cy="${y + 4}" rx="${n(80 + u * 160)}" ry="${n(14 + u * 26)}" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="${n(0.8 * (1 - u))}"/>`;
    }).join('');
    const fg = `${blades(-600, 1680, 2070, 260, hexMix('#7E6A30', '#151820', sky.dark), 5)}`;
    const night = `<rect x="-600" y="-600" width="2280" height="3120" fill="#081028" opacity="${n(sky.dark * 0.5)}"/>`;
    return [{ f: 0.3, svg: far, blur: s.dof && s.dof.bg }, { f: 0.75, svg: water, blur: s.dof && s.dof.mid },
      { f: 1, svg: `${hideBush}${nearBank}${cast}${splashes}`, blur: s.dof && s.dof.all }, { f: 1.3, svg: fg, blur: 6 }, { f: 1, svg: night }, T.topShade(id)];
  };

  // ------------------------------------------------------------ the hide
  // Inside the film-maker's hide on that bank: olive canvas and netting, the slit on the right with the
  // watering hole bright beyond it at the hour (s.hour), the long lens on its tripod, and him at the
  // ledge (its top at y 1448) with binoculars, a flask with the crown and a notebook.
  SETS.hide = (s, t, st, p, id) => {
    const sky = skyAt(hourAt(s.hour, t));
    p.light = { ...p.light, tint: hexMix('#E6F0D4', '#B8C4E8', sky.dark * 1.2), rim: 1 };
    const view = `<svg x="700" y="640" width="720" height="260" viewBox="0 640 1080 390" preserveAspectRatio="xMidYMid slice">${savannaFar(sky, id + 'v')}
        <rect x="0" y="1000" width="1080" height="120" fill="${hexMix('#C9A55A', '#22283A', sky.dark)}"/><rect x="0" y="1050" width="1080" height="80" fill="${hexMix(sky.bottom, '#2F4A52', 0.35)}"/></svg>`;
    const bg = `<defs><linearGradient id="${id}cv" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1F2516"/><stop offset="0.6" stop-color="#2E3620"/><stop offset="1" stop-color="#263019"/></linearGradient>
        <linearGradient id="${id}ray" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hexMix(sky.bottom, '#FFFFFF', 0.4)}" stop-opacity="${n(0.22 - sky.dark * 0.18)}"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient></defs>
      <rect x="-600" y="-600" width="2280" height="3120" fill="url(#${id}cv)"/>
      ${Array.from({ length: 12 }, (_, i) => `<path d="M ${-300 + i * 150} -600 Q ${-280 + i * 150 + (i % 2 ? 30 : -30)} 600 ${-300 + i * 150} 2400" stroke="#151A0F" stroke-width="${10 + (i % 3) * 6}" fill="none" opacity="0.55"/>`).join('')}
      <rect x="686" y="626" width="748" height="288" rx="18" fill="#141810"/>
      ${view}
      ${Array.from({ length: 16 }, (_, i) => `<path d="M ${700 + i * 48} 640 l 24 260" stroke="#2A3220" stroke-width="2" opacity="0.5"/>`).join('')}
      <path d="M 700 900 L 1400 900 L 900 1700 L 0 1700 Z" fill="url(#${id}ray)"/>
      <g transform="translate(1060 790)"><rect x="-90" y="-60" width="150" height="110" rx="14" fill="#1A1C1F"/><rect x="40" y="-44" width="300" height="80" rx="10" fill="#26292D"/>
        <rect x="320" y="-50" width="40" height="92" rx="8" fill="#101113"/><circle cx="-40" cy="-6" r="22" fill="#0E0F11" stroke="#3A3E44" stroke-width="4"/>
        <path d="M -10 50 L -120 690 M -10 50 L 40 690 M -10 50 L 140 690" stroke="#15171A" stroke-width="12"/></g>`;
    const place = `translate(${HIM.x} ${HIM.y}) scale(${HIM.s})`;
    const onTable = (p.arms || 'rest') === 'desk', nearArm = `<g transform="${place}">${F.founderSVG(p, id + 'f', 'arm')}</g>`;
    const subject = `
      <g transform="${place}">${F.founderSVG(p, id + 'f', 'body')}</g>
      ${onTable ? '' : nearArm}
      <path d="M -300 1448 L 1400 1448 L 1400 1520 L -300 1520 Z" fill="#7A5A36"/>${T.grain(-300, 1452, 1400, 1516, 41)}
      <path d="M -300 1450 L 1400 1450" stroke="#B48C5C" stroke-width="3"/>
      <g transform="translate(700 1448)"><rect x="-58" y="-62" width="44" height="62" rx="14" fill="#202226"/><rect x="-6" y="-62" width="44" height="62" rx="14" fill="#202226"/><rect x="-18" y="-46" width="16" height="20" fill="#2C2F34"/>
        <circle cx="-36" cy="-62" r="16" fill="#3A4048"/><circle cx="16" cy="-62" r="16" fill="#3A4048"/></g>
      <g transform="translate(900 1448)"><rect x="-34" y="-150" width="68" height="150" rx="16" fill="#2B4A3A"/><rect x="-26" y="-176" width="52" height="30" rx="8" fill="#1C2A22"/>${crown(0, -80, 0.2, '#D8AD4E')}</g>
      <g transform="translate(1040 1448) skewX(-20)"><rect x="-70" y="-20" width="130" height="20" fill="#E8E0CC"/><rect x="-70" y="-24" width="130" height="6" fill="#C9583A"/></g>
      ${onTable ? nearArm : ''}
      <path d="M -300 1520 L 1400 1520 L 1400 2400 L -300 2400 Z" fill="#20261A"/>`;
    return [{ f: 0.4, svg: bg, blur: s.dof && s.dof.bg }, { f: 1, svg: subject, blur: s.dof && s.dof.all }, T.topShade(id)];
  };

  // ------------------------------------------------------------ the race
  // A floodlit stadium on race night, side on and a little from above: the crowd in the stands, the
  // scoreboard, the floodlights, the boards along the track (TCP's among made-up sponsors), and the
  // track itself, x along the race: the start at x 300 (lane 2's staggered on to x 540), the finish
  // (TAKE PROFIT) at x 3200, lane 2's runner at y 1440, lane 1's at y 1650. s.board: [[t, 'race' | 'result']]; s.tape: when the tape
  // breaks; s.dust: [[t, x, y]]; s.confetti: when the gold confetti falls.
  const lean = (x, y) => [x + (1700 - y) * 0.17, y];          // the track's slight slant: further is to the right
  const boardAd = (x, i, id) => {
    const ads = [['TCP', '#0B0B0D', '#D8AD4E'], ['PIP NEWS', '#1F4FA8', '#FFFFFF'], ['TCP', '#0B0B0D', '#D8AD4E'], ['CANDLE TV', '#B3261E', '#FFFFFF'], ['TCP', '#0B0B0D', '#D8AD4E'], ['WICK FM', '#2E7D4F', '#FFFFFF']][i % 6];
    return `<g transform="translate(${x} 1236)"><rect x="0" y="0" width="340" height="92" rx="4" fill="${ads[1]}"/>
      ${ads[0] === 'TCP' ? `${crown(92, 46, 0.2, ads[2])}<text x="200" y="64" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="52" fill="${ads[2]}">TCP</text>`
        : `<text x="170" y="62" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="40" fill="${ads[2]}">${ads[0]}</text>`}
      <rect x="0" y="0" width="340" height="92" rx="4" fill="url(#${id}bgl)" opacity="0.3"/></g>`;
  };
  SETS.track = (s, t, st, p, id) => {
    const mode = (s.board || []).filter(([a]) => t >= at(a)).map(([, m]) => m).pop() || 'race';
    const cheer = s.confetti != null && t >= at(s.confetti) ? 1 : 0;
    // the stands: rows of the crowd, a bit of movement, more after the finish
    const crowd = [];
    for (let r = 0; r < 7; r++) {
      const y = 640 + r * 74, k = 0.75 + r * 0.06;
      crowd.push(`<rect x="-700" y="${y - 6}" width="3400" height="74" fill="${r % 2 ? '#141B30' : '#18213A'}"/>`);
      for (let c = 0; c < 70; c++) {
        const x = -680 + c * 48 + (r % 2 ? 24 : 0), seed = (r * 71 + c * 37) % 97;
        const col = ['#C9483A', '#E8B33C', '#3F7FD8', '#E9E4D8', '#5BB06A', '#8C5CD8', '#2A2F3E'][seed % 7];
        const jump = cheer ? Math.max(0, Math.sin(t * 9 + seed)) * 12 : Math.sin(t * 2 + seed) * 1.5;
        crowd.push(`<circle cx="${x}" cy="${n(y + 22 - jump)}" r="${n(12 * k)}" fill="#2B2420"/><path d="M ${x - 17 * k} ${n(y + 64 - jump)} Q ${x} ${n(y + 30 - jump)} ${x + 17 * k} ${n(y + 64 - jump)} Z" fill="${col}"/>`);
      }
    }
    const tower = (x) => `<g transform="translate(${x} 0)"><path d="M -8 900 L -4 220 L 4 220 L 8 900 Z" fill="#2A3048"/><rect x="-80" y="150" width="160" height="80" rx="6" fill="#2A3048"/>
      ${[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => `<circle cx="${-56 + c * 37}" cy="${170 + r * 22}" r="9" fill="#FFF6DA"/>`).join('')).join('')}
      <circle cx="0" cy="190" r="260" fill="url(#${id}fl)"/></g>`;
    const board = mode === 'result'
      ? `<text x="230" y="96" text-anchor="middle" font-family="JB Mono" font-weight="600" font-size="26" letter-spacing="6" fill="#9FB3D8">RESULT</text>
        <text x="40" y="168" font-family="TCP Display" font-weight="800" font-size="50" fill="#F6E3A3">1  PATIENCE</text><text x="40" y="232" font-family="TCP Display" font-weight="800" font-size="50" fill="#6E7894">2  —</text>`
      : `<text x="230" y="96" text-anchor="middle" font-family="JB Mono" font-weight="600" font-size="26" letter-spacing="6" fill="#9FB3D8">FINAL · 100 PIPS</text>
        <text x="40" y="168" font-family="TCP Display" font-weight="800" font-size="50" fill="#E9E4D8">1  FOMO</text><text x="40" y="232" font-family="TCP Display" font-weight="800" font-size="50" fill="#E9E4D8">2  PATIENCE</text>`;
    const bg = `<defs><linearGradient id="${id}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#060A1A"/><stop offset="1" stop-color="#1A2547"/></linearGradient>
        <radialGradient id="${id}fl"><stop offset="0" stop-color="#FFF4D0" stop-opacity="0.5"/><stop offset="1" stop-color="#FFF4D0" stop-opacity="0"/></radialGradient></defs>
      <rect x="-700" y="-600" width="3600" height="3120" fill="url(#${id}sky)"/>
      ${tower(-120)}${tower(1240)}${tower(2500)}
      <rect x="-700" y="600" width="3600" height="580" fill="#0E1426"/>${crowd.join('')}
      <rect x="-700" y="1150" width="3600" height="40" fill="#0B0F1C"/>
      <g transform="translate(760 470)"><rect x="-16" y="-16" width="492" height="292" rx="10" fill="#05070C"/><rect width="460" height="260" fill="#0B1020"/>${board}
        ${crown(400, 50, 0.16)}</g>`;
    // the boards along the track
    const boards = `<defs><linearGradient id="${id}bgl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient></defs>
      <rect x="-700" y="1226" width="4800" height="112" fill="#0A0D16"/>${Array.from({ length: 13 }, (_, i) => boardAd(-600 + i * 360, i, id)).join('')}`;
    // the track: lanes, lines, the start and the finish, distance marks
    const lane = (y0, y1, col) => `<path d="M -700 ${y0} L 4400 ${y0} L 4400 ${y1} L -700 ${y1} Z" fill="${col}"/>`;
    const line = (x, y0 = 1720, y1 = 1300) => { const a2 = lean(x, y0), b2 = lean(x, y1); return `M ${n(a2[0])} ${a2[1]} L ${n(b2[0])} ${b2[1]}`; };
    const tapeT = s.tape != null ? t - at(s.tape) : -1;
    const FX = 3200, near = lean(FX, 1720), far = lean(FX, 1300);
    const post = (pt, h) => `<rect x="${n(pt[0] - 9)}" y="${pt[1] - h}" width="18" height="${h}" fill="#E9E4D8"/><rect x="${n(pt[0] - 9)}" y="${pt[1] - h}" width="18" height="${h}" fill="none" stroke="#1A120C" stroke-width="3"/>`;
    const tapeY = (pt) => pt[1] - 150;
    const tape = tapeT < 0
      ? `<path d="M ${n(near[0])} ${tapeY(near)} L ${n(far[0])} ${tapeY(far)}" stroke="#E8B33C" stroke-width="9"/>`
      : [[near, -1], [far, 1]].map(([pt, d]) => { const u = Math.min(1, tapeT / 0.6); return `<path d="M ${n(pt[0])} ${tapeY(pt)} q ${n(30 * d * (1 - u) + 10)} ${n(60 + u * 60)} ${n(14 * d + 6)} ${n(140 * u + 40)}" stroke="#E8B33C" stroke-width="9" fill="none"/>`; }).join('');
    const arch = `${post(far, 380)}<g transform="translate(${n(far[0])} ${far[1] - 410})"><rect x="-220" y="-10" width="440" height="96" rx="8" fill="#0B0B0D" stroke="#D8AD4E" stroke-width="4"/>
        ${crown(-176, 38, 0.15)}<text x="-128" y="56" font-family="TCP Display" font-weight="800" font-size="42" fill="#D8AD4E">TAKE PROFIT</text></g>`;
    const dust = (s.dust || []).map(([t0, x, y]) => {
      const d = t - at(t0);
      if (d < 0 || d > 1) return '';
      return [0, 1, 2, 3, 4].map((i) => `<circle cx="${n(x - 20 - i * 26 - d * 60)}" cy="${n(y - 20 - i * 6 - d * 30)}" r="${n(18 + i * 6 + d * 30)}" fill="#D9B48E" opacity="${n(0.6 * (1 - d))}"/>`).join('');
    }).join('');
    const track = `${lane(1260, 1300, '#7E2E1E')}${lane(1300, 1720, '#B8452B')}
      ${[1300, 1500, 1720].map((y) => `<path d="M -700 ${y} L 4400 ${y}" stroke="#F2EEE4" stroke-width="5"/>`).join('')}
      ${lane(1720, 2600, '#2F6B3A')}${Array.from({ length: 30 }, (_, i) => `<path d="M ${-700 + i * 180} 1720 l 90 900" stroke="#2A6034" stroke-width="40" opacity="0.5"/>`).join('')}
      <path d="${line(300, 1720, 1500)}" stroke="#F2EEE4" stroke-width="14"/><path d="${line(540, 1500, 1300)}" stroke="#F2EEE4" stroke-width="14"/>
      ${[[1025, '25'], [1750, '50'], [2475, '75']].map(([x, l]) => `<g transform="translate(${n(lean(x, 1700)[0])} 1700)"><text x="0" y="0" font-family="TCP Display" font-weight="800" font-size="34" fill="#F2EEE4" opacity="0.75">${l}</text></g>`).join('')}
      <path d="${line(FX)}" stroke="#F2EEE4" stroke-width="16"/><path d="${line(FX + 16)}" stroke="#1A120C" stroke-width="5" stroke-dasharray="18 18"/>
      ${[[590, 1428], [360, 1638]].map(([x, y]) => `<g transform="translate(${x} ${y})"><path d="M -40 10 L -10 -26 L 4 -26 L -20 10 Z" fill="#9CA3AE" stroke="#1A120C" stroke-width="3"/><path d="M -6 10 L 22 -20 L 34 -20 L 12 10 Z" fill="#9CA3AE" stroke="#1A120C" stroke-width="3"/></g>`).join('')}`;
    const confetti = s.confetti != null && t >= at(s.confetti) ? Array.from({ length: 46 }, (_, i) => {
      const d = t - at(s.confetti), x = FX - 500 + ((i * 137) % 1100) + Math.sin(d * 3 + i) * 30, y = 150 + ((i * 251) % 700) + d * (260 + (i % 5) * 40) - 250;
      return `<rect x="${n(x)}" y="${n(y)}" width="14" height="22" rx="3" fill="${i % 3 ? '#E8B33C' : '#F6E3A3'}" transform="rotate(${n(d * 200 + i * 40)} ${n(x + 7)} ${n(y + 11)})"/>`;
    }).join('') : '';
    const subject = `${track}${arch}${dust}${castOf(s, t, id)}${tape}${post(near, 170)}${confetti}`;
    const fg = `<rect x="-700" y="2050" width="5200" height="40" fill="#1A1F2C"/>${Array.from({ length: 40 }, (_, i) => `<rect x="${-700 + i * 130}" y="1960" width="14" height="130" fill="#1A1F2C"/>`).join('')}`;
    return [{ f: 0.25, svg: bg, blur: s.dof && s.dof.bg }, { f: 0.6, svg: boards, blur: s.dof && s.dof.mid }, { f: 1, svg: subject, blur: s.dof && s.dof.all }, { f: 1.35, svg: fg, blur: 7 }, T.topShade(id)];
  };

  // the commentary box: him at the desk, a microphone with TCP's flag, a monitor with the race on it,
  // and the stadium through the glass behind (floodlights, the crowd as lights)
  SETS.booth = (s, t, st, p, id) => {
    p.light = { ...p.light, tint: '#F4EFE6', rim: 1 };
    const bokeh = Array.from({ length: 40 }, (_, i) => {
      const x = 60 + ((i * 97) % 1100), y = 640 + ((i * 53) % 420), r = 6 + (i % 4) * 3;
      const col = ['#E8B33C', '#C9483A', '#3F7FD8', '#E9E4D8'][i % 4];
      return `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" opacity="${n(0.35 + 0.25 * Math.sin(t * 2 + i))}"/>`;
    }).join('');
    const bg = `<defs><linearGradient id="${id}bs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070B1A"/><stop offset="1" stop-color="#1A2547"/></linearGradient>
        <radialGradient id="${id}bf"><stop offset="0" stop-color="#FFF4D0" stop-opacity="0.55"/><stop offset="1" stop-color="#FFF4D0" stop-opacity="0"/></radialGradient></defs>
      <rect x="-600" y="-600" width="2280" height="3120" fill="#14161C"/>
      <rect x="-200" y="200" width="1500" height="1000" fill="url(#${id}bs)"/>
      ${[[120, 330], [980, 300]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="230" fill="url(#${id}bf)"/>${[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => `<circle cx="${x - 48 + c * 32}" cy="${y - 20 + r * 20}" r="8" fill="#FFF6DA"/>`).join('')).join('')}`).join('')}
      <rect x="-200" y="620" width="1500" height="460" fill="#101629"/>${bokeh}
      <rect x="-200" y="1080" width="1500" height="120" fill="#7E2E1E"/><path d="M -200 1120 L 1300 1120 M -200 1160 L 1300 1160" stroke="#E9E4D8" stroke-width="4" opacity="0.6"/>
      ${[-200, 360, 920].map((x) => `<rect x="${x - 14}" y="200" width="28" height="1000" fill="#0C0E12"/>`).join('')}
      <rect x="-200" y="186" width="1500" height="28" fill="#0C0E12"/><rect x="-200" y="1190" width="1500" height="40" fill="#0C0E12"/>`;
    const place = `translate(${HIM.x} ${HIM.y}) scale(${HIM.s})`;
    const onTable = (p.arms || 'rest') === 'desk', nearArm = `<g transform="${place}">${F.founderSVG(p, id + 'f', 'arm')}</g>`;
    const subject = `
      <g transform="translate(860 1180)"><rect x="-150" y="-110" width="300" height="200" rx="10" fill="#0B0D11"/><rect x="-136" y="-96" width="272" height="160" fill="#B8452B"/>
        <path d="M -136 -40 L 136 -40 M -136 20 L 136 20" stroke="#F2EEE4" stroke-width="3"/><circle cx="${n(-60 + ((t * 40) % 200))}" cy="-10" r="10" fill="#D8AD4E"/><circle cx="90" cy="46" r="10" fill="#22C55E"/>
        <path d="M -20 90 L 20 90 L 34 120 L -34 120 Z" fill="#0B0D11"/></g>
      <g transform="${place}">${F.founderSVG(p, id + 'f', 'body')}</g>
      ${onTable ? '' : nearArm}
      <path d="M -300 1448 L 1400 1448 L 1400 1520 L -300 1520 Z" fill="#2A2420"/><path d="M -300 1450 L 1400 1450" stroke="#5A4A3C" stroke-width="3"/>
      <g transform="translate(680 1452)"><ellipse cx="0" cy="0" rx="40" ry="9" fill="#0A0A0B"/><path d="M 0 0 L 0 -120" stroke="#2A2C30" stroke-width="7"/>
        <rect x="-38" y="-178" width="76" height="50" rx="6" fill="#0B0B0D" stroke="#D8AD4E" stroke-width="3"/>${crown(0, -158, 0.1)}<text x="0" y="-136" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="14" fill="#D8AD4E">TCP</text>
        <rect x="-16" y="-236" width="32" height="60" rx="16" fill="#1A1B1E"/><rect x="-16" y="-236" width="32" height="32" rx="16" fill="#2C2E33"/></g>
      <g transform="translate(980 1448) skewX(-18)"><rect x="-70" y="-14" width="140" height="14" fill="#E8E0CC"/><path d="M -56 -10 L 50 -10" stroke="#8C8576" stroke-width="2"/></g>
      ${onTable ? nearArm : ''}
      <path d="M -300 1520 L 1400 1520 L 1400 2400 L -300 2400 Z" fill="#1C1A18"/>`;
    return [{ f: 0.4, svg: bg, blur: s.dof && s.dof.bg }, { f: 1, svg: subject, blur: s.dof && s.dof.all }, T.topShade(id)];
  };

  // ------------------------------------------------------------ the museum of red flags
  // Side on, x along the hall: the entrance and its banner, gallery 1 on burgundy walls (exhibits in
  // glass cases on plinths: the rented Lambo at x 700, the 100% screenshot at 1500, the GUARANTEED
  // stamp at 2300), then the arch into gallery 2 on green walls (the plan logged before the result,
  // framed at x 3200; an example record with its losses at 3900). The floor is at y 1640.
  // s.alarm: when the alarm goes off (a small beacon on the wall, slower than three a second).
  const plinth = (x, inner, plaque, sub, id2) => `<g transform="translate(${x} 0)">
      <path d="M -260 300 L 260 300 L 170 1240 L -170 1240 Z" fill="url(#${id2}cone)"/>
      <rect x="-150" y="1240" width="300" height="330" fill="#ECE7DC"/><rect x="-150" y="1240" width="300" height="330" fill="url(#${id2}pl)"/>
      <rect x="-166" y="1226" width="332" height="22" fill="#F6F2EA"/><rect x="-166" y="1562" width="332" height="18" fill="#D6D0C4"/>
      <rect x="-118" y="1330" width="236" height="74" rx="4" fill="#B8913E"/><rect x="-112" y="1336" width="224" height="62" rx="3" fill="#CFA750"/>
      <text x="0" y="1362" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="19" fill="#2A1C0C">${plaque}</text>
      <text x="0" y="1388" text-anchor="middle" font-family="Serif" font-style="italic" font-size="17" fill="#3A2810">${sub}</text>
      <g transform="translate(0 1230)">${inner}</g>
      <rect x="-140" y="926" width="280" height="300" fill="#DDEEFF" opacity="0.1"/><rect x="-140" y="926" width="280" height="300" fill="none" stroke="#F4F8FF" stroke-width="4" opacity="0.7"/>
      <path d="M -110 950 L -60 950 L -130 1180 Z" fill="#FFFFFF" opacity="0.18"/></g>`;
  const LAMBO = `<g transform="translate(0 -40)"><ellipse cx="0" cy="34" rx="120" ry="12" fill="#000" opacity="0.25"/><ellipse cx="0" cy="30" rx="104" ry="10" fill="#2A2A2E"/>
      <path d="M -100 20 L -92 -6 L -40 -30 L 30 -34 L 92 -10 L 104 14 L 100 22 Z" fill="#F2C230" stroke="#1A120C" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M -36 -26 L 20 -30 L 52 -14 L -30 -12 Z" fill="#1E2A38" stroke="#1A120C" stroke-width="2.5"/>
      <circle cx="-58" cy="20" r="17" fill="#1A1B1E" stroke="#1A120C" stroke-width="3"/><circle cx="62" cy="20" r="17" fill="#1A1B1E" stroke="#1A120C" stroke-width="3"/>
      <circle cx="-58" cy="20" r="7" fill="#9CA3AE"/><circle cx="62" cy="20" r="7" fill="#9CA3AE"/>
      <g transform="translate(80 -86) rotate(12)"><rect x="-38" y="-16" width="76" height="32" rx="4" fill="#FFFDF6" stroke="#1A120C" stroke-width="2"/><text x="0" y="6" text-anchor="middle" font-family="JB Mono" font-weight="600" font-size="13" fill="#C8281E">RENTED</text></g></g>`;
  const WINRATE = `<g transform="translate(0 -150)"><rect x="-62" y="-100" width="124" height="214" rx="16" fill="#0E1116" stroke="#C9A24A" stroke-width="8"/>
      <rect x="-50" y="-86" width="100" height="186" rx="6" fill="#0B1F1A"/>
      <text x="0" y="-56" text-anchor="middle" font-family="JB Mono" font-weight="600" font-size="12" fill="#7BF0C0">WIN RATE</text>
      <text x="0" y="-20" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="34" fill="#35D08F">100%</text>
      ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${-40 + i * 14}" y="${70 - 14 - i * 8}" width="10" height="${14 + i * 8}" fill="#35D08F"/>`).join('')}
      <text x="0" y="92" text-anchor="middle" font-family="JB Mono" font-weight="600" font-size="10" fill="#7BF0C0">NO LOSSES EVER</text></g>`;
  const STAMP = `<g transform="translate(0 -80)"><rect x="-124" y="10" width="248" height="46" rx="4" fill="#FFFDF6" stroke="#1A120C" stroke-width="2.5" transform="rotate(-4)"/>
      <text x="0" y="43" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="24" fill="#C8281E" transform="rotate(-4)" opacity="0.9">GUARANTEED</text>
      <g transform="translate(40 -40) rotate(18)"><rect x="-30" y="0" width="60" height="22" rx="3" fill="#7A3A1E" stroke="#1A120C" stroke-width="2.5"/><rect x="-9" y="-62" width="18" height="64" rx="6" fill="#8C5A36" stroke="#1A120C" stroke-width="2.5"/><circle cx="0" cy="-70" r="18" fill="#7A3A1E" stroke="#1A120C" stroke-width="2.5"/></g></g>`;
  const frame = (x, y, w, h, inner, plaque) => `<g transform="translate(${x} ${y})"><rect x="${-w / 2 - 26}" y="-26" width="${w + 52}" height="${h + 52}" fill="#B8913E" stroke="#7A5A20" stroke-width="4"/>
      <rect x="${-w / 2 - 12}" y="-12" width="${w + 24}" height="${h + 24}" fill="#D9B45C"/><g transform="translate(${-w / 2} 0)">${inner}</g>
      <g transform="translate(0 ${h + 70})"><rect x="-150" y="0" width="300" height="56" rx="4" fill="#2E8A57"/><text x="0" y="36" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="20" fill="#FFFFFF">${plaque}</text></g></g>`;
  const RECORD = (() => {
    const res = [1, -1, 1, 1, -1, -1, 1, -1, 1, -1];
    return `<rect width="440" height="300" fill="#0B0D11"/><text x="24" y="44" font-family="TCP Display" font-weight="800" font-size="24" fill="#F6E3A3">WINS AND LOSSES</text>
      <g transform="translate(330 22) rotate(8)"><rect x="-10" y="-4" width="96" height="30" rx="4" fill="none" stroke="#E0613F" stroke-width="3"/><text x="38" y="19" text-anchor="middle" font-family="JB Mono" font-weight="600" font-size="17" fill="#E0613F">EXAMPLE</text></g>
      <path d="M 24 170 L 416 170" stroke="#3A3F4A" stroke-width="2"/>
      ${res.map((r, i) => `<rect x="${36 + i * 38}" y="${r > 0 ? 170 - 70 : 170}" width="26" height="70" fill="${r > 0 ? '#35D08F' : '#E0613F'}"/>`).join('')}
      <text x="24" y="276" font-family="JB Mono" font-weight="500" font-size="17" fill="#8C8577">every result, the losses too</text>`;
  })();
  SETS.museum = (s, t, st, p, id) => {
    const alarm = s.alarm != null ? t - at(s.alarm) : -1, ringing = alarm >= 0 && alarm < 2.2;
    const wall = (x0, x1, col, dark) => `<rect x="${x0}" y="200" width="${x1 - x0}" height="1240" fill="${col}"/><rect x="${x0}" y="1180" width="${x1 - x0}" height="260" fill="${dark}"/>
      <rect x="${x0}" y="1172" width="${x1 - x0}" height="14" fill="#C9A24A"/><rect x="${x0}" y="200" width="${x1 - x0}" height="70" fill="${dark}"/><rect x="${x0}" y="266" width="${x1 - x0}" height="10" fill="#C9A24A"/>`;
    const bg = `<defs><linearGradient id="${id}cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF4D6" stop-opacity="0.32"/><stop offset="1" stop-color="#FFF4D6" stop-opacity="0.02"/></linearGradient>
        <linearGradient id="${id}pl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.12"/><stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.18"/></linearGradient>
        <linearGradient id="${id}fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CFC6B8"/><stop offset="1" stop-color="#9C9284"/></linearGradient></defs>
      <rect x="-800" y="-600" width="6000" height="3120" fill="#1A1412"/>
      ${wall(-800, 2700, '#5A1E24', '#3E1418')}${wall(2700, 5000, '#1E4A34', '#143426')}
      <path d="M 2620 1440 L 2620 560 Q 2700 440 2780 560 L 2780 1440 Z" fill="#120E0C"/><path d="M 2600 1440 L 2600 560 Q 2700 410 2800 560 L 2800 1440" fill="none" stroke="#C9A24A" stroke-width="12"/>
      <g transform="translate(3640 280)"><rect x="-190" y="-42" width="380" height="84" rx="6" fill="#0E2A1E" stroke="#C9A24A" stroke-width="4"/><text x="0" y="-6" text-anchor="middle" font-family="JB Mono" font-weight="600" font-size="18" letter-spacing="6" fill="#9FD8B4">GALLERY 2</text>
        <text x="0" y="28" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="30" fill="#E9F6EC">GREEN FLAGS</text></g>
      ${[[1150, 'ONLY UP', 'up'], [1900, 'TO THE MOON', 'moon']].map(([x, title, kind]) => `<g transform="translate(${x} 770)"><rect x="-130" y="-160" width="260" height="300" fill="#B8913E" stroke="#7A5A20" stroke-width="4"/><rect x="-112" y="-142" width="224" height="264" fill="#EDE4D0"/>
        ${kind === 'up' ? `<path d="M 0 100 L 0 -110 M -40 -70 L 0 -120 L 40 -70" stroke="#2E9A5C" stroke-width="16" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
          : `<circle cx="60" cy="-90" r="30" fill="#D8D2C4" stroke="#9C9484" stroke-width="3"/><g transform="translate(-20 30) rotate(35)"><path d="M 0 -70 C 22 -40, 22 20, 14 40 L -14 40 C -22 20, -22 -40, 0 -70 Z" fill="#E9E4D8" stroke="#1A120C" stroke-width="4"/><circle cx="0" cy="-14" r="10" fill="#3F7FD8" stroke="#1A120C" stroke-width="3"/><path d="M -10 40 L 0 70 L 10 40 Z" fill="#E8A317"/></g>`}
        <rect x="-70" y="150" width="140" height="30" rx="3" fill="#CFA750"/><text x="0" y="171" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="15" fill="#2A1C0C">${title}</text></g>`).join('')}
      <g transform="translate(560 650) scale(1.22)"><path d="M -400 -140 L -380 -420 M 400 -140 L 380 -420" stroke="#2A2420" stroke-width="5"/><rect x="-420" y="-150" width="840" height="166" rx="6" fill="#120E0C" stroke="#C9A24A" stroke-width="5"/>
        <text x="0" y="-98" text-anchor="middle" font-family="JB Mono" font-weight="600" font-size="22" letter-spacing="8" fill="#C9A24A">THE MUSEUM OF</text>
        <text x="0" y="-30" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="50" fill="#F2EEE4">TRADING <tspan fill="#E0613F">RED FLAGS</tspan></text>${crown(-372, -102, 0.12)}${crown(372, -102, 0.12)}</g>
      ${frame(3250, 640, 440, 300, planCard(id), 'LOGGED BEFORE THE RESULT')}
      ${frame(3850, 640, 440, 300, RECORD, 'LOSSES SHOWN TOO')}
      <g transform="translate(1720 760)"><rect x="-26" y="-10" width="52" height="20" rx="4" fill="#2A2420"/><path d="M -22 -10 A 22 24 0 0 1 22 -10 Z" fill="${ringing && Math.floor(alarm * 2.4) % 2 === 0 ? '#FF3B30' : '#7A1E1A'}"/>
        ${ringing && Math.floor(alarm * 2.4) % 2 === 0 ? `<circle cx="0" cy="-16" r="70" fill="#FF3B30" opacity="0.25"/>` : ''}</g>`;
    const floor = `<rect x="-800" y="1440" width="6000" height="1200" fill="url(#${id}fl)"/>
      ${Array.from({ length: 30 }, (_, i) => `<path d="M ${-800 + i * 200} 1440 L ${-900 + i * 200 - 300} 2640" stroke="#B8AE9E" stroke-width="3" opacity="0.6"/>`).join('')}
      <path d="M -800 1560 L 5200 1560 M -800 1760 L 5200 1760 M -800 2040 L 5200 2040" stroke="#B8AE9E" stroke-width="3" opacity="0.5"/>`;
    const exhibits = `${plinth(700, LAMBO, 'THE RENTED LAMBO', 'c. every weekend', id)}${plinth(1500, WINRATE, 'NEVER POSTS A LOSS', 'screenshot, cropped', id)}${plinth(2300, STAMP, 'GUARANTEED PROFITS', 'they never are', id)}`;
    // the bench and the rope in gallery 2
    const rope = `${[3060, 4040].map((x) => `<rect x="${x - 8}" y="1460" width="16" height="140" fill="#C9A24A"/><circle cx="${x}" cy="1458" r="14" fill="#E2BE62"/>`).join('')}
      <path d="M 3060 1470 Q 3550 1560 4040 1470" stroke="#8E1A22" stroke-width="12" fill="none"/>`;
    const subject = `${floor}${exhibits}${rope}${castOf(s, t, id)}`;
    // the walls stand right behind the plinths, so they move with the room
    return [{ f: 1, svg: bg, blur: s.dof && s.dof.bg }, { f: 1, svg: subject, blur: s.dof && s.dof.all }, T.topShade(id)];
  };

  // gallery 2, for him: the guide at a lectern, the green wall with its two frames behind him
  SETS.gallery = (s, t, st, p, id) => {
    p.light = { ...p.light, tint: '#FFF3DE', rim: 1 };
    const bg = `<defs><radialGradient id="${id}gs" cx="0.5" cy="0.4" r="0.6"><stop offset="0" stop-color="#FFF4D6" stop-opacity="0.22"/><stop offset="1" stop-color="#FFF4D6" stop-opacity="0"/></radialGradient></defs>
      <rect x="-600" y="-600" width="2280" height="3120" fill="#1E4A34"/><rect x="-600" y="1180" width="2280" height="400" fill="#143426"/><rect x="-600" y="1172" width="2280" height="14" fill="#C9A24A"/>
      <rect x="-600" y="-600" width="2280" height="870" fill="#143426"/><rect x="-600" y="266" width="2280" height="10" fill="#C9A24A"/>
      <g transform="translate(-60 0)">${frame(140, 560, 440, 300, planCard(id), 'LOGGED BEFORE THE RESULT')}</g>
      <g transform="translate(160 0)">${frame(840, 560, 440, 300, RECORD, 'LOSSES SHOWN TOO')}</g>
      <ellipse cx="540" cy="700" rx="700" ry="600" fill="url(#${id}gs)"/>`;
    const place = `translate(${HIM.x} ${HIM.y}) scale(${HIM.s})`;
    const onTable = (p.arms || 'rest') === 'desk', nearArm = `<g transform="${place}">${F.founderSVG(p, id + 'f', 'arm')}</g>`;
    const subject = `
      <g transform="${place}">${F.founderSVG(p, id + 'f', 'body')}</g>
      ${onTable ? '' : nearArm}
      <path d="M 200 1448 L 760 1448 L 720 2400 L 240 2400 Z" fill="#5C3A22"/><path d="M 180 1436 L 780 1436 L 780 1460 L 180 1460 Z" fill="#7A5232"/>
      <g transform="translate(480 1560)"><rect x="-110" y="0" width="220" height="46" rx="4" fill="#B8913E"/><text x="0" y="31" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="20" fill="#2A1C0C">GUIDED TOURS</text></g>
      ${onTable ? nearArm : ''}`;
    return [{ f: 0.4, svg: bg, blur: s.dof && s.dof.bg }, { f: 1, svg: subject, blur: s.dof && s.dof.all }, T.topShade(id)];
  };

  // ------------------------------------------------------------ the rollercoaster
  // A theme park at sunset and a rollercoaster whose track is a price chart. s.ride: { track: points
  // along the rail (from the spec), car: [x, y, angle] for every frame (30 a second), seats: { who:
  // [from, to, seat] } }: a rider in a seat (0 at the front) rides in the car, tilted with it; outside
  // those times it stands where its own track says. The START station is at the left, the TARGET
  // station at the top right; a safety net marked STOP hangs under the bottom of the big drop.
  SETS.coaster = (s, t, st, p, id) => {
    const R = s.ride || { track: [], car: [[0, 0, 0]], seats: {} };
    const car = R.car[Math.min(R.car.length - 1, Math.max(0, Math.round(t * 30)))];
    const pts = R.track;
    // the sky, the far side of the park
    const lights = Array.from({ length: 34 }, (_, i) => { const x = -600 + i * 150, y = 1300 + Math.sin(i * 0.9) * 18; return `<circle cx="${x}" cy="${n(y)}" r="7" fill="#FFE3A0" opacity="${n(0.6 + 0.3 * Math.sin(t * 3 + i))}"/>`; }).join('');
    const wheel = (cx, cy, r) => `<g transform="translate(${cx} ${cy})"><circle r="${r}" fill="none" stroke="#3A2440" stroke-width="10"/>
      ${Array.from({ length: 12 }, (_, i) => { const a2 = (i / 12) * Math.PI * 2 + t * 0.15; return `<path d="M 0 0 L ${n(Math.cos(a2) * r)} ${n(Math.sin(a2) * r)}" stroke="#3A2440" stroke-width="5"/><rect x="${n(Math.cos(a2) * r - 22)}" y="${n(Math.sin(a2) * r)}" width="44" height="34" rx="6" fill="#4A2C50"/>`; }).join('')}
      <path d="M -60 ${r + 200} L 0 0 L 60 ${r + 200}" stroke="#3A2440" stroke-width="14" fill="none"/></g>`;
    const bg = `<defs><linearGradient id="${id}ss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3B2A6E"/><stop offset="0.55" stop-color="#E8735A"/><stop offset="1" stop-color="#FFC27A"/></linearGradient>
        <radialGradient id="${id}sun"><stop offset="0" stop-color="#FFE7B0"/><stop offset="1" stop-color="#FFE7B0" stop-opacity="0"/></radialGradient></defs>
      <rect x="-1500" y="-800" width="8000" height="3200" fill="url(#${id}ss)"/>
      <circle cx="2600" cy="1180" r="320" fill="url(#${id}sun)" opacity="0.8"/><circle cx="2600" cy="1180" r="110" fill="#FFF0C8"/>
      ${wheel(-150, 900, 420)}${wheel(4300, 980, 340)}
      ${[[400, 1330, 1.0, '#C8281E'], [1300, 1340, 0.8, '#2E5FB0'], [3300, 1330, 0.9, '#C8281E'], [3900, 1340, 0.7, '#E8A317']].map(([x, y, k, c]) => `<g transform="translate(${x} ${y}) scale(${k})"><path d="M -160 0 L 0 -150 L 160 0 Z" fill="${c}"/><path d="M -160 0 L 0 -150 L 0 0 Z" fill="#000" opacity="0.15"/><rect x="-140" y="0" width="280" height="90" fill="#F2EEE4"/></g>`).join('')}
      <path d="M -1500 1420 L 6500 1420 L 6500 2400 L -1500 2400 Z" fill="#3E2F48"/>${lights}`;
    // the track: supports to the ground, the spine, the rail, the ties
    const step = 3, path = pts.length ? `M ${pts.map(([x, y]) => `${x} ${y}`).join(' L ')}` : '';
    const supports = [], ties = [];
    for (let i = 0; i < pts.length - 1; i += step) {
      const [x, y] = pts[i], [x1, y1] = pts[Math.min(pts.length - 1, i + 1)], a2 = Math.atan2(y1 - y, x1 - x);
      ties.push(`<path d="M ${n(x - Math.sin(a2) * 12)} ${n(y + Math.cos(a2) * 12)} L ${n(x + Math.sin(a2) * 14)} ${n(y - Math.cos(a2) * 14)}" stroke="#5A4A3A" stroke-width="5"/>`);
      if (i % (step * 5) === 0 && y < 1780) supports.push(`<path d="M ${x} ${y + 20} L ${x - 30} 1800 M ${x} ${y + 20} L ${x + 30} 1800" stroke="#6E6A78" stroke-width="9"/><path d="M ${x - 22} ${n(y + (1800 - y) * 0.5)} L ${x + 22} ${n(y + (1800 - y) * 0.5)}" stroke="#6E6A78" stroke-width="6"/>`);
    }
    const track = `${supports.join('')}<path d="${path}" stroke="#2A2230" stroke-width="22" fill="none" stroke-linejoin="round"/>${ties.join('')}
      <path d="${path}" stroke="#E8A317" stroke-width="7" fill="none" stroke-linejoin="round"/>`;
    // the stations, FOMO's platform at the top, the safety net
    const station = (x0, x1, y, label, gold) => `<rect x="${x0}" y="${y + 14}" width="${x1 - x0}" height="40" fill="#5A4A3A"/>
      ${Array.from({ length: Math.floor((x1 - x0) / 140) + 1 }, (_, i) => `<path d="M ${x0 + 20 + i * 140} ${y + 54} L ${x0 + 20 + i * 140} 1800" stroke="#6E6A78" stroke-width="12"/>`).join('')}
      <path d="M ${x0 - 20} ${y - 230} L ${x1 + 20} ${y - 230} L ${x1} ${y - 190} L ${x0} ${y - 190} Z" fill="${gold ? '#D8AD4E' : '#C8281E'}"/>${[x0 + 20, x1 - 20].map((x) => `<rect x="${x - 6}" y="${y - 190}" width="12" height="204" fill="#2A2230"/>`).join('')}
      <g transform="translate(${(x0 + x1) / 2} ${y - 300})"><rect x="-150" y="-50" width="300" height="100" rx="10" fill="#0B0B0D" stroke="${gold ? '#D8AD4E' : '#F2EEE4'}" stroke-width="5"/>
        ${gold ? crown(-112, 0, 0.15) : ''}<text x="${gold ? 30 : 0}" y="18" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="48" fill="${gold ? '#D8AD4E' : '#F2EEE4'}">${label}</text></g>`;
    const fomoDeck = `<rect x="1080" y="650" width="150" height="16" fill="#5A4A3A"/><path d="M 1100 666 L 1100 1800 M 1210 666 L 1210 1800" stroke="#6E6A78" stroke-width="8"/>
      ${Array.from({ length: 22 }, (_, i) => `<path d="M 1100 ${700 + i * 50} L 1210 ${700 + i * 50}" stroke="#6E6A78" stroke-width="5"/>`).join('')}`;
    const net = `<g transform="translate(1640 1700)"><path d="M -230 0 L -230 100 M 230 0 L 230 100" stroke="#6E6A78" stroke-width="12"/>
      <path d="M -230 10 Q 0 70 230 10" stroke="#E9E4D8" stroke-width="5" fill="none"/>${Array.from({ length: 9 }, (_, i) => `<path d="M ${-200 + i * 50} ${14 + Math.sin(((i + 0.5) / 9) * Math.PI) * 44} L ${-200 + i * 50} 0" stroke="#E9E4D8" stroke-width="3"/>`).join('')}
      <g transform="translate(-230 -30)"><rect x="-56" y="-26" width="112" height="52" rx="6" fill="#C8281E" stroke="#1A120C" stroke-width="3"/><text x="0" y="14" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="34" fill="#FFFFFF">STOP</text></g></g>`;
    // the car and its riders
    const seatX = [140, 30, -80];
    const riders = [], loose = [];
    for (const [who, track] of Object.entries(s.cast || {})) {
      const q = C.at(who, track, t);
      q.pose.__full = true;
      const w = (R.seats || {})[who];
      if (w && t >= at(w[0]) && t < at(w[1])) riders.push(`<g transform="translate(${seatX[w[2]]} -36) scale(${n(q.s)})">${C.svg(who, q.pose, t, id + who)}</g>`);
      else loose.push(`<g transform="translate(${n(q.x)} ${n(q.y)}) scale(${n(q.s)})">${C.svg(who, q.pose, t, id + who)}</g>`);
    }
    const carSVG = `<g transform="translate(${car[0]} ${car[1]}) rotate(${car[2]})">${riders.join('')}
      <path d="M -150 -86 L 200 -86 C 226 -86, 236 -60, 232 -14 L -156 -14 C -160 -50, -160 -76, -150 -86 Z" fill="#C8281E" stroke="#1A120C" stroke-width="5" stroke-linejoin="round"/>
      <path d="M -150 -58 L 228 -58" stroke="#D8AD4E" stroke-width="10"/>${crown(196, -36, 0.1, '#F6E3A3')}
      ${[-120, -10, 100, 200].map((x) => `<circle cx="${x}" cy="-8" r="14" fill="#2A2230" stroke="#1A120C" stroke-width="3"/>`).join('')}</g>`;
    const subject = `${station(-200, 300, 1500, 'START', false)}${station(3480, 4200, 500, 'TARGET', true)}${fomoDeck}${net}${track}${carSVG}${loose.join('')}
      <path d="M -1500 1800 L 6500 1800 L 6500 2600 L -1500 2600 Z" fill="#2F5A3A"/><path d="M -1500 1800 L 6500 1800" stroke="#24452D" stroke-width="8"/>`;
    return [{ f: 0.3, svg: bg, blur: s.dof && s.dof.bg }, { f: 1, svg: subject, blur: s.dof && s.dof.all }, T.topShade(id)];
  };

  // the ride's controls: him at the desk with the big lever, the sign hanging in front, the ride
  // through the glass behind him at sunset
  SETS.operator = (s, t, st, p, id) => {
    p.light = { ...p.light, tint: '#FFE6CC', rim: 1 };
    const bg = `<defs><linearGradient id="${id}os" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3B2A6E"/><stop offset="0.6" stop-color="#E8735A"/><stop offset="1" stop-color="#FFC27A"/></linearGradient></defs>
      <rect x="-600" y="-600" width="2280" height="3120" fill="#2A2230"/>
      <rect x="-200" y="200" width="1500" height="1000" fill="url(#${id}os)"/>
      <path d="M -200 1000 Q 100 400 300 360 Q 420 340 520 600 Q 700 1100 900 820 Q 1050 600 1300 500" stroke="#2A2230" stroke-width="26" fill="none"/>
      <path d="M -200 1000 Q 100 400 300 360 Q 420 340 520 600 Q 700 1100 900 820 Q 1050 600 1300 500" stroke="#E8A317" stroke-width="8" fill="none"/>
      ${[-200, 360, 920].map((x) => `<rect x="${x - 14}" y="200" width="28" height="1000" fill="#1A1620"/>`).join('')}<rect x="-200" y="186" width="1500" height="28" fill="#1A1620"/><rect x="-200" y="1190" width="1500" height="40" fill="#1A1620"/>`;
    const place = `translate(${HIM.x} ${HIM.y}) scale(${HIM.s})`;
    const onTable = (p.arms || 'rest') === 'desk', nearArm = `<g transform="${place}">${F.founderSVG(p, id + 'f', 'arm')}</g>`;
    const subject = `
      <g transform="${place}">${F.founderSVG(p, id + 'f', 'body')}</g>
      ${onTable ? '' : nearArm}
      <path d="M -300 1448 L 1400 1448 L 1400 1530 L -300 1530 Z" fill="#3A3442"/><path d="M -300 1450 L 1400 1450" stroke="#5A5266" stroke-width="3"/>
      <g transform="translate(860 1448)"><rect x="-80" y="-30" width="160" height="30" rx="6" fill="#1A1620"/><path d="M -10 -30 L 40 -200" stroke="#9CA3AE" stroke-width="16" stroke-linecap="round"/><circle cx="44" cy="-208" r="30" fill="#C8281E" stroke="#1A120C" stroke-width="4"/></g>
      ${[[640, '#22C55E'], [700, '#E8A317'], [760, '#C8281E']].map(([x, c]) => `<circle cx="${x}" cy="1440" r="16" fill="${c}" stroke="#1A120C" stroke-width="3"/>`).join('')}
      ${onTable ? nearArm : ''}
      <path d="M -300 1530 L 1400 1530 L 1400 2400 L -300 2400 Z" fill="#221E28"/>
      <g transform="translate(600 548)"><path d="M -34 -60 L -34 -260 M 34 -60 L 34 -260" stroke="#5A5266" stroke-width="4"/><rect x="-46" y="-62" width="92" height="104" rx="6" fill="#F2C230" stroke="#1A120C" stroke-width="4"/>
        <text x="0" y="-32" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="15" fill="#1A120C">RIDE AT</text><text x="0" y="-12" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="15" fill="#1A120C">YOUR OWN</text>
        <text x="0" y="12" text-anchor="middle" font-family="TCP Display" font-weight="800" font-size="19" fill="#C8281E">RISK</text><path d="M -30 26 L 30 26" stroke="#1A120C" stroke-width="3"/></g>`;
    return [{ f: 0.4, svg: bg, blur: s.dof && s.dof.bg }, { f: 1, svg: subject, blur: s.dof && s.dof.all }, T.topShade(id)];
  };

  T.castOf = castOf;
  T.SPOTS = SPOTS;
})();
