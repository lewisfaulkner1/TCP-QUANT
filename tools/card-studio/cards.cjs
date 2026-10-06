/*
 * TCP card drawing: one source for the Card Studio page and the VPS signal publisher.
 * Canvas 2D only. The caller passes Path2D (the browser's, or @napi-rs/canvas's in Node)
 * and registers the fonts named in F before drawing.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.createTCPCards = factory;
})(typeof self !== 'undefined' ? self : this, function createTCPCards(env) {
  'use strict';
  const Path2D = env.Path2D;

  /* ---------- brand constants ---------- */
  const C = {ink:'#0E0D0B',panel:'#15130F',line:'#2E2A22',line2:'#3A3429',gold:'#D8AD4E',goldSoft:'#E3C06D',
    ivory:'#F2ECDF',stone:'#A69D8C',royal:'#241640',up:'#35A68C',down:'#E0613F'};
  const F = {display:'"TCP Display", Archivo, sans-serif', sans:'Archivo, "Helvetica Neue", Arial, sans-serif',
    serif:'"Instrument Serif", Georgia, serif', mono:'"JetBrains Mono", ui-monospace, Menlo, monospace'};
  const FOIL = [[0,'#F6E3A3'],[0.42,'#D8AD4E'],[0.72,'#B0812F'],[1,'#E3C06D']];
  const LOGO = [{"tx":8.12,"ty":12.81,"d":"M11.6 94.27L0 26.59L43.51 55.59L72.51 7.25L101.52 55.59L145.02 26.59L133.42 94.27ZM11.6 102.72H133.42V120.85H11.6ZM29 53.18H33.36V61.63H38.43V84.6H33.36V89.43H29V84.6H23.93V61.63H29ZM70.34 29H74.69V39.88H79.76V79.76H74.69V89.43H70.34V79.76H65.26V39.88H70.34ZM111.67 53.18H116.02V61.63H121.09V84.6H116.02V89.43H111.67V84.6H106.59V61.63H111.67Z","rule":"evenodd","y0":7.25,"y1":120.85,"crown":true},{"tx":8.12,"ty":12.81,"d":"M-8.12 20.54A8.12 8.12 0 1 0 8.12 20.54A8.12 8.12 0 1 0 -8.12 20.54Z","rule":"nonzero","y0":12.42,"y1":28.66,"crown":true},{"tx":8.12,"ty":12.81,"d":"M62.940000000000005 1.21A9.57 9.57 0 1 0 82.08000000000001 1.21A9.57 9.57 0 1 0 62.940000000000005 1.21Z","rule":"nonzero","y0":-8.36,"y1":10.78,"crown":true},{"tx":8.12,"ty":12.81,"d":"M136.9 20.54A8.12 8.12 0 1 0 153.14000000000001 20.54A8.12 8.12 0 1 0 136.9 20.54Z","rule":"nonzero","y0":12.42,"y1":28.66,"crown":true},{"tx":201.27,"ty":0,"d":"M0 0H88V24H56V100H32V24H0Z","rule":"nonzero","y0":0,"y1":100,"crown":false},{"tx":201.27,"ty":0,"d":"M188.06 28A51.5 51.5 0 1 0 188.06 72L158 72A27.5 27.5 0 1 1 158 28Z","rule":"nonzero","y0":-1.5,"y1":101.5,"crown":false},{"tx":201.27,"ty":0,"d":"M202 0H251A35 35 0 0 1 286 35A35 35 0 0 1 251 70H226V100H202ZM226 24V46H251A11 11 0 0 0 262 35A11 11 0 0 0 251 24Z","rule":"evenodd","y0":0,"y1":100,"crown":false}];
  const LOGO_BOX = {x:0, y:4.45, w:487.27, h:129.21};   // crown + TCP, in logo units
  const CROWN_BOX = {x:0, y:4.45, w:161.26, h:129.21};
  const logoEls = LOGO.map(e => Object.assign({}, e, {p: new Path2D(e.d)}));
  const SIZES = {square:[1080,1080], portrait:[1080,1350], story:[1080,1920]};
  const MINUS = '−';
  const CAP = {display:0.686, mono:0.73, sans:0.70};

  /* ---------- number helpers ---------- */
  function num(v){ const c = String(v == null ? '' : v).replace(/[,\s]/g,'').replace(/[−–]/g,'-'); if (c === '' || c === '-' || isNaN(+c)) return null; return +c; }
  function decimals(v){ const c = String(v || '').replace(/[,\s]/g,''); const i = c.indexOf('.'); return i < 0 ? 0 : c.length - i - 1; }
  function fmtPrice(v){ const n = num(v); if (n === null) return '—'; const d = Math.min(decimals(v), 6); return n.toLocaleString('en-GB',{minimumFractionDigits:d, maximumFractionDigits:d}); }
  function fmtDiff(n, d){ const s = Math.abs(n).toLocaleString('en-GB',{minimumFractionDigits:d, maximumFractionDigits:d}); return (n > 0 ? '+' : n < 0 ? MINUS : '') + s; }
  function fmtR(r){ const v = Math.round(r * 10) / 10; if (v === 0) return '0.0R'; return (v > 0 ? '+' : MINUS) + Math.abs(v).toFixed(1) + 'R'; }
  function plainR(r){ return fmtR(r).replace(MINUS,'-'); }

  function signalModel(s){
    const entry = num(s.entry), sl = num(s.sl), tp = num(s.tp), tp2 = num(s.tp2);
    const risk = entry !== null && sl !== null ? Math.abs(entry - sl) : null;
    const rr1 = risk && tp !== null ? Math.abs(tp - entry) / risk : null;
    const rr2 = risk && tp2 !== null ? Math.abs(tp2 - entry) / risk : null;
    const dec = Math.max(decimals(s.entry), decimals(s.sl), decimals(s.tp), decimals(s.tp2));
    const warnings = [];
    if (entry !== null && sl !== null && tp !== null) {
      if (s.side === 'buy' && !(sl < entry && tp > entry)) warnings.push('For a buy, the stop loss goes below the entry and the take profit above it.');
      if (s.side === 'sell' && !(sl > entry && tp < entry)) warnings.push('For a sell, the stop loss goes above the entry and the take profit below it.');
    }
    if (tp2 !== null && tp !== null && entry !== null && Math.abs(tp2 - entry) <= Math.abs(tp - entry)) warnings.push('Take profit 2 should be further from the entry than take profit 1.');
    let result = null, stamp = null;
    if (s.status === 'tp' && rr1 !== null) { result = rr1; stamp = 'TP HIT'; }
    else if (s.status === 'tp2' && (rr2 !== null || rr1 !== null)) { result = rr2 !== null ? rr2 : rr1; stamp = rr2 !== null ? 'TP2 HIT' : 'TP HIT'; }
    else if (s.status === 'sl') { result = -1; stamp = 'STOPPED'; }
    else if (s.status === 'be') { result = 0; stamp = 'BREAKEVEN'; }
    else if (s.status === 'closed') { const r = num(s.closedR); result = r; stamp = 'CLOSED'; }
    else if (s.status === 'tp' || s.status === 'tp2') { stamp = 'TP HIT'; }
    if (stamp && typeof s.resultR === 'number' && Number.isFinite(s.resultR)) result = s.resultR;
    return {entry, sl, tp, tp2, risk, rr1, rr2, dec, warnings, result, stamp};
  }

  const DAYS = {mon:'MON',monday:'MON',tue:'TUE',tues:'TUE',tuesday:'TUE',wed:'WED',wednesday:'WED',thu:'THU',thur:'THU',thurs:'THU',thursday:'THU',fri:'FRI',friday:'FRI',sat:'SAT',saturday:'SAT',sun:'SUN',sunday:'SUN'};
  function parseTrades(text){
    const trades = [], errors = [];
    String(text || '').split(/\r?\n/).forEach((raw, i) => {
      const line = raw.trim(); if (!line) return;
      const toks = line.replace(/[,;|\t]+/g,' ').split(/\s+/);
      let day = '', side = '', r = null, market = '';
      for (const tok of toks) {
        const t = tok.toLowerCase();
        if (!day && DAYS[t]) { day = DAYS[t]; continue; }
        if (!day && /^\d{1,2}[\/.]\d{1,2}$/.test(t)) { day = tok; continue; }
        if (!side && /^(buy|long|b)$/.test(t)) { side = 'buy'; continue; }
        if (!side && /^(sell|short|s)$/.test(t)) { side = 'sell'; continue; }
        if (r === null && /^(be|breakeven|b\/e)$/.test(t)) { r = 0; continue; }
        if (r === null && /^[+\-−–]?\d+(\.\d+)?r?$/i.test(t)) { r = parseFloat(t.replace(/[−–]/,'-').replace(/r$/i,'')); continue; }
        if (!market && /^[a-z0-9.!\/_-]{2,12}$/i.test(tok)) { market = tok.toUpperCase(); continue; }
      }
      const missing = [];
      if (!market) missing.push('the market');
      if (!side) missing.push('buy or sell');
      if (r === null) missing.push('the result in R');
      if (missing.length) errors.push({n: i + 1, line, missing}); else trades.push({day, market, side, r});
    });
    return {trades, errors};
  }
  function resultsModel(res){
    const {trades, errors} = Array.isArray(res.trades) ? {trades: res.trades, errors: []} : parseTrades(res.lines);
    const wins = trades.filter(t => t.r > 0).length, losses = trades.filter(t => t.r < 0).length;
    const be = trades.length - wins - losses;
    const net = trades.reduce((a, t) => a + t.r, 0);
    const rate = trades.length ? Math.round(wins / trades.length * 100) : 0;
    let cum = 0; const curve = [0].concat(trades.map(t => (cum += t.r)));
    return {trades, errors, wins, losses, be, net, rate, curve};
  }

  /* ---------- canvas helpers ---------- */
  function setFont(ctx, weight, size, family, style){ ctx.font = `${style ? style + ' ' : ''}${weight} ${Math.round(size)}px ${family}`; }
  function trackedWidth(ctx, text, sp){ const ch = Array.from(text); return ch.reduce((a, c) => a + ctx.measureText(c).width, 0) + sp * Math.max(0, ch.length - 1); }
  function tracked(ctx, text, x, y, sp, align){
    const ch = Array.from(text); const ws = ch.map(c => ctx.measureText(c).width);
    const w = ws.reduce((a, b) => a + b, 0) + sp * Math.max(0, ch.length - 1);
    let cx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    const prev = ctx.textAlign; ctx.textAlign = 'left';
    ch.forEach((c, i) => { ctx.fillText(c, cx, y); cx += ws[i] + sp; });
    ctx.textAlign = prev; return w;
  }
  function fitSize(ctx, text, weight, family, maxSize, maxWidth, minSize){
    let s = maxSize; setFont(ctx, weight, s, family);
    while (s > minSize && ctx.measureText(text).width > maxWidth) { s -= 2; setFont(ctx, weight, s, family); }
    return s;
  }
  function fitTracked(ctx, text, weight, family, maxSize, maxWidth, spFactor){
    let s = maxSize; setFont(ctx, weight, s, family);
    while (s > 11 && trackedWidth(ctx, text, s * spFactor) > maxWidth) { s -= 0.5; setFont(ctx, weight, s, family); }
    return s;
  }
  function storyCrown(ctx, W, H){ ctx.save(); ctx.globalAlpha = 0.07; const h = 150; drawLogo(ctx, (W - CROWN_BOX.w * h / CROWN_BOX.h) / 2, H - 250, h, true); ctx.restore(); }
  function wrap(ctx, text, maxWidth){
    const words = String(text).replace(/\s+/g,' ').trim().split(' '); const lines = []; let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width <= maxWidth || !cur) { cur = test; } else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur); return lines;
  }
  function rr(ctx, x, y, w, h, r){ const p = new Path2D(); r = Math.min(r, h / 2, w / 2);
    p.moveTo(x + r, y); p.arcTo(x + w, y, x + w, y + h, r); p.arcTo(x + w, y + h, x, y + h, r); p.arcTo(x, y + h, x, y, r); p.arcTo(x, y, x + w, y, r); p.closePath(); return p; }
  function foilGradient(ctx, y0, y1){ const g = ctx.createLinearGradient(0, y0, 0, y1); FOIL.forEach(([o, c]) => g.addColorStop(o, c)); return g; }

  function drawLogo(ctx, x, y, h, crownOnly){
    const box = crownOnly ? CROWN_BOX : LOGO_BOX; const s = h / box.h;
    ctx.save(); ctx.translate(x - box.x * s, y - box.y * s); ctx.scale(s, s);
    for (const e of logoEls) {
      if (crownOnly && !e.crown) continue;
      ctx.save(); ctx.translate(e.tx, e.ty);
      ctx.fillStyle = foilGradient(ctx, e.y0, e.y1);
      ctx.fill(e.p, e.rule); ctx.restore();
    }
    ctx.restore(); return box.w * s;
  }
  function drawBackground(ctx, W, H){
    ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H);
    let g = ctx.createRadialGradient(W * 0.92, -H * 0.02, 0, W * 0.92, -H * 0.02, W * 0.95);
    g.addColorStop(0, 'rgba(216,173,78,0.16)'); g.addColorStop(1, 'rgba(216,173,78,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    g = ctx.createRadialGradient(-W * 0.05, H * 1.02, 0, -W * 0.05, H * 1.02, W * 0.9);
    g.addColorStop(0, 'rgba(58,34,104,0.42)'); g.addColorStop(1, 'rgba(36,22,64,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function drawTag(ctx, text, xRight, yMid, size, royal){
    setFont(ctx, 600, size, F.mono); const sp = size * 0.16;
    const tw = trackedWidth(ctx, text, sp); const padX = size * 0.95, h = Math.round(size * 2.05);
    const x = xRight - tw - padX * 2, y = yMid - h / 2; const p = rr(ctx, x, y, tw + padX * 2, h, h / 2);
    if (royal) { ctx.fillStyle = C.royal; ctx.fill(p); }
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(216,173,78,0.75)'; ctx.stroke(p);
    ctx.fillStyle = C.gold; tracked(ctx, text, x + padX, yMid + size * CAP.mono / 2, sp);
  }
  function triangle(ctx, x, cy, size, up){
    ctx.beginPath();
    if (up) { ctx.moveTo(x, cy + size * 0.43); ctx.lineTo(x + size, cy + size * 0.43); ctx.lineTo(x + size / 2, cy - size * 0.47); }
    else { ctx.moveTo(x, cy - size * 0.43); ctx.lineTo(x + size, cy - size * 0.43); ctx.lineTo(x + size / 2, cy + size * 0.47); }
    ctx.closePath(); ctx.fill();
  }
  function drawExample(ctx, W, H){
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.36);
    setFont(ctx, 800, W * 0.19, F.display); ctx.textAlign = 'center';
    ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(14,13,11,0.55)'; ctx.strokeText('EXAMPLE', 0, W * 0.065);
    ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(227,192,109,0.6)'; ctx.strokeText('EXAMPLE', 0, W * 0.065);
    setFont(ctx, 600, 26, F.mono); ctx.fillStyle = 'rgba(227,192,109,0.75)';
    tracked(ctx, 'SAMPLE DATA · NOT A REAL TRADE', 0, W * 0.065 + 58, 4, 'center');
    ctx.restore();
  }
  function ticketPath(x, y, w, h, r, notchY, nr){
    const p = new Path2D();
    p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.arcTo(x + w, y, x + w, y + r, r);
    p.lineTo(x + w, notchY - nr); p.arc(x + w, notchY, nr, -Math.PI / 2, Math.PI / 2, true);
    p.lineTo(x + w, y + h - r); p.arcTo(x + w, y + h, x + w - r, y + h, r);
    p.lineTo(x + r, y + h); p.arcTo(x, y + h, x, y + h - r, r);
    p.lineTo(x, notchY + nr); p.arc(x, notchY, nr, Math.PI / 2, -Math.PI / 2, true);
    p.lineTo(x, y + r); p.arcTo(x, y, x + r, y, r); p.closePath(); return p;
  }
  function drawStamp(ctx, cx, cy, size, text, sub, color, angle){
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
    setFont(ctx, 800, size, F.display); const tw = ctx.measureText(text).width;
    const subSize = size * 0.46; setFont(ctx, 600, subSize, F.mono); const sw = sub ? trackedWidth(ctx, sub, subSize * 0.08) : 0;
    const padX = size * 0.5, padY = size * 0.34;
    const innerH = size * CAP.display + (sub ? subSize * 0.5 + subSize * CAP.mono : 0);
    const w = Math.max(tw, sw) + padX * 2, h = innerH + padY * 2;
    ctx.globalAlpha = 0.94;
    ctx.fillStyle = 'rgba(14,13,11,0.78)'; ctx.fill(rr(ctx, -w / 2, -h / 2, w, h, 14));
    ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.stroke(rr(ctx, -w / 2, -h / 2, w, h, 14));
    ctx.lineWidth = 2; ctx.stroke(rr(ctx, -w / 2 + 9, -h / 2 + 9, w - 18, h - 18, 8));
    ctx.fillStyle = color; setFont(ctx, 800, size, F.display); ctx.textAlign = 'center';
    const top = -h / 2 + padY;
    ctx.fillText(text, 0, top + size * CAP.display);
    if (sub) { ctx.fillStyle = C.ivory; setFont(ctx, 600, subSize, F.mono); tracked(ctx, sub, 0, top + size * CAP.display + subSize * 0.5 + subSize * CAP.mono, subSize * 0.08, 'center'); }
    ctx.restore();
    return {w, h};
  }
  function stampMeasure(ctx, size, text, sub){
    setFont(ctx, 800, size, F.display); const tw = ctx.measureText(text).width;
    const subSize = size * 0.46; setFont(ctx, 600, subSize, F.mono); const sw = sub ? trackedWidth(ctx, sub, subSize * 0.08) : 0;
    const w = Math.max(tw, sw) + size; const h = size * CAP.display + (sub ? subSize * 0.5 + subSize * CAP.mono : 0) + size * 0.68;
    const a = 0.14; return {w: w * Math.cos(a) + h * Math.sin(a), h: w * Math.sin(a) + h * Math.cos(a)};
  }

  /* ---------- signal card ---------- */
  const SIG = {
    square:   {m:40, pad:44, top:50,  logoH:52, headGap:30, tag:21, instr:116, pill:76, pillFont:42, label:22, value:50, sub:0,  gap:15, rr:50, whyH:34, why:26, footTop:1080-54, footSerif:32, legal:18, notch:22, stamp:46},
    portrait: {m:48, pad:56, top:62,  logoH:60, headGap:38, tag:22, instr:146, pill:90,  pillFont:50, label:24, value:58, sub:23, gap:20, rr:58, whyH:40, why:29, footTop:1350-62, footSerif:37, legal:20, notch:26, stamp:56},
    story:    {m:48, pad:60, top:236, logoH:70, headGap:48, tag:24, instr:168, pill:104, pillFont:58, label:27, value:70, sub:26, gap:28, rr:70, whyH:46, why:33, footTop:1920-296, footSerif:43, legal:22, notch:28, stamp:66},
  };
  function drawSignal(ctx, W, H, s, sizeKey){
    const L = SIG[sizeKey]; const M = signalModel(s);
    drawBackground(ctx, W, H);
    const tX = L.m, tW = W - L.m * 2, x0 = tX + L.pad, x1 = tX + tW - L.pad;

    drawLogo(ctx, x0, L.top, L.logoH);
    drawTag(ctx, s.kind === 'aplus' ? 'A+ SETUP' : 'ALGORITHMIC SIGNAL', x1, L.top + L.logoH / 2, L.tag, s.kind === 'aplus');

    const tTop = L.top + L.logoH + L.headGap;
    const footBase = L.footTop;
    const tBot = footBase - L.footSerif * 1.55;

    // measure the top section
    const capL = L.label * CAP.mono;
    const side = s.side === 'sell' ? 'sell' : 'buy';
    setFont(ctx, 800, L.pillFont, F.display);
    const pillW = L.pillFont * 0.55 * 2 + L.pillFont * 0.55 + L.pillFont * 0.3 + ctx.measureText(side === 'buy' ? 'BUY' : 'SELL').width;
    const instrText = (s.instrument || '').trim().toUpperCase() || 'MARKET';
    const instrSize = fitSize(ctx, instrText, 800, F.display, L.instr, x1 - x0 - pillW - 36, 48);
    const capI = instrSize * CAP.display;

    let y = tTop + L.pad * 0.85;
    const metaBase = y + capL;
    const instrTop = metaBase + L.gap * 1.35;
    const instrBase = instrTop + Math.max(capI, L.pill * 0.78);
    const notchY = instrBase + L.gap * 1.9 + (sizeKey === 'square' ? 0 : 6);

    // ticket body
    const tp = ticketPath(tX, tTop, tW, tBot - tTop, 26, notchY, L.notch);
    ctx.fillStyle = C.panel; ctx.fill(tp); ctx.lineWidth = 2; ctx.strokeStyle = C.line; ctx.stroke(tp);
    ctx.save(); ctx.setLineDash([14, 12]); ctx.strokeStyle = C.line2; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(tX + L.notch + 18, notchY); ctx.lineTo(tX + tW - L.notch - 18, notchY); ctx.stroke(); ctx.restore();

    // meta row
    setFont(ctx, 500, L.label, F.mono); ctx.fillStyle = C.stone;
    tracked(ctx, 'INSTRUMENT', x0, metaBase, L.label * 0.14);
    const orderText = s.order === 'limit' ? `${side.toUpperCase()} LIMIT` : s.order === 'stop' ? `${side.toUpperCase()} STOP` : 'MARKET ORDER';
    const ow = tracked(ctx, orderText, x1, metaBase, L.label * 0.14, 'right');
    if (s.status === 'live') {
      const liveW = trackedWidth(ctx, 'LIVE', L.label * 0.14); const lx = x1 - ow - 34 - liveW;
      ctx.fillStyle = C.ivory; tracked(ctx, 'LIVE', lx, metaBase, L.label * 0.14);
      ctx.fillStyle = C.up; ctx.beginPath(); ctx.arc(lx - L.label * 0.62, metaBase - capL / 2, L.label * 0.26, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.line2; ctx.fillRect(x1 - ow - 18, metaBase - capL, 2, capL);
    }

    // instrument + side pill
    setFont(ctx, 800, instrSize, F.display); ctx.fillStyle = C.ivory; ctx.fillText(instrText, x0, instrBase - (Math.max(capI, L.pill * 0.78) - capI) / 2);
    const pillMid = instrBase - Math.max(capI, L.pill * 0.78) / 2;
    {
      const f = L.pillFont, tri = f * 0.55, gap = f * 0.3, padX = f * 0.55, h = L.pill;
      setFont(ctx, 800, f, F.display); const label = side === 'buy' ? 'BUY' : 'SELL'; const w = padX * 2 + tri + gap + ctx.measureText(label).width;
      const px = x1 - w; ctx.fillStyle = side === 'buy' ? C.up : C.down; ctx.fill(rr(ctx, px, pillMid - h / 2, w, h, h / 2));
      ctx.fillStyle = C.ink; triangle(ctx, px + padX, pillMid, tri, side === 'buy');
      ctx.fillText(label, px + padX + tri + gap, pillMid + f * CAP.display / 2);
    }

    // field rows
    const rows = [['ENTRY', s.entry, null], ['STOP LOSS', s.sl, M.entry !== null && M.sl !== null ? M.sl - M.entry : null], ['TAKE PROFIT', s.tp, M.entry !== null && M.tp !== null ? M.tp - M.entry : null]];
    if (String(s.tp2 || '').trim()) rows.push(['TAKE PROFIT 2', s.tp2, M.entry !== null && M.tp2 !== null ? M.tp2 - M.entry : null]);
    const capV = L.value * CAP.mono, subH = L.sub ? L.sub * 1.55 : 0;
    const rowH = capV + subH;
    const bottomBase = tBot - L.pad * 0.8;
    const fieldsTop = notchY + L.gap * 2.1;
    const rrBlock = L.gap * 1.6 + 2 + L.gap * 1.6 + L.rr * CAP.display;
    const needFields = rows.length * rowH + (rows.length - 1) * L.gap + rrBlock;
    const baseAvail = bottomBase - L.label * 2.2 - fieldsTop - needFields;
    const whyLh = L.why * 1.42, whyHead = L.gap * 2.3 + L.whyH * 0.72 + L.why * 0.5;
    let whyLines = [];
    if (s.kind === 'aplus' && String(s.why || '').trim()) { setFont(ctx, 400, L.why, F.sans); whyLines = wrap(ctx, s.why, x1 - x0); }
    const showWhy = whyLines.length > 0 && baseAvail > whyHead + whyLh * 1.2;
    const whyMax = showWhy ? Math.max(1, Math.floor((baseAvail - whyHead - L.why * 0.2) / whyLh)) : 0;
    const whyUsed = Math.min(whyLines.length, whyMax);
    const spare = baseAvail - (showWhy ? whyHead + whyUsed * whyLh : 0) - L.label * 0.2;
    const rowGap = L.gap + Math.max(0, Math.min(spare / (rows.length + 1.5), L.gap * 2.6));

    let fy = fieldsTop; let labelRight = 0, valueLeft = Infinity; const fieldBand = [fy, 0];
    rows.forEach(([label, val, diff], i) => {
      const base = fy + capV;
      setFont(ctx, 500, L.label, F.mono); ctx.fillStyle = C.stone;
      labelRight = Math.max(labelRight, x0 + tracked(ctx, label, x0, base, L.label * 0.14));
      setFont(ctx, 500, L.value, F.mono); ctx.fillStyle = String(val || '').trim() ? C.ivory : C.stone; ctx.textAlign = 'right';
      const vt = fmtPrice(val); ctx.fillText(vt, x1, base); valueLeft = Math.min(valueLeft, x1 - ctx.measureText(vt).width); ctx.textAlign = 'left';
      if (L.sub && diff !== null) { setFont(ctx, 500, L.sub, F.mono); ctx.fillStyle = C.stone; ctx.textAlign = 'right'; ctx.fillText(fmtDiff(diff, M.dec), x1, base + L.sub * 1.5); ctx.textAlign = 'left'; }
      fy = base + subH + (i < rows.length - 1 ? rowGap : 0);
    });
    fieldBand[1] = fy;
    fy += rowGap * 0.85;
    ctx.fillStyle = C.line; ctx.fillRect(x0, fy, x1 - x0, 2);
    fy += L.gap * 1.5;
    const rrBase = fy + L.rr * CAP.display;
    setFont(ctx, 500, L.label, F.mono); ctx.fillStyle = C.stone; tracked(ctx, 'RISK : REWARD', x0, rrBase, L.label * 0.14);
    const rrText = M.rr1 === null ? '—' : `1 : ${M.rr1.toFixed(1)}${M.rr2 !== null ? '  ·  ' + M.rr2.toFixed(1) : ''}`;
    setFont(ctx, 800, L.rr, F.display); ctx.fillStyle = C.gold; ctx.textAlign = 'right'; ctx.fillText(rrText, x1, rrBase); ctx.textAlign = 'left';
    fy = rrBase;

    if (showWhy) {
      let wy = fy + L.gap * 2.3 + L.whyH * 0.72;
      setFont(ctx, 400, L.whyH, F.serif, 'italic'); ctx.fillStyle = C.gold; ctx.fillText('Why I took it', x0, wy);
      setFont(ctx, 400, L.why, F.sans); ctx.fillStyle = 'rgba(242,236,223,0.9)';
      const lh = whyLh; const lines = whyLines; const maxLines = whyUsed;
      const shown = lines.slice(0, maxLines);
      if (lines.length > maxLines) { let last = shown[shown.length - 1]; while (last.length && ctx.measureText(last + '…').width > x1 - x0) last = last.slice(0, -1); shown[shown.length - 1] = last.replace(/\s+\S*$/, '') + '…'; }
      shown.forEach((ln, i) => ctx.fillText(ln, x0, wy + L.why * 0.5 + lh * (i + 1) - L.why * 0.3));
    }

    // bottom row
    setFont(ctx, 500, L.label, F.mono); ctx.fillStyle = C.stone;
    tracked(ctx, whenText(s.when, s.tz), x0, bottomBase, L.label * 0.1);
    if (String(s.ref || '').trim()) tracked(ctx, 'NO. ' + String(s.ref).trim().toUpperCase(), x1, bottomBase, L.label * 0.1, 'right');

    // status stamp
    if (s.status !== 'live' && M.stamp) {
      const color = s.status === 'sl' ? C.down : s.status === 'be' ? C.stone : s.status === 'closed' ? C.gold : C.up;
      const sub = M.result === null ? '' : fmtR(M.result);
      const bandL = labelRight + 28, bandR = valueLeft - 28; let size = L.stamp; let dims = stampMeasure(ctx, size, M.stamp, sub);
      while (dims.w > bandR - bandL && size > L.stamp * 0.66) { size -= 2; dims = stampMeasure(ctx, size, M.stamp, sub); }
      if (dims.w <= bandR - bandL) {
        drawStamp(ctx, (bandL + bandR) / 2, (fieldBand[0] + fieldBand[1]) / 2, size, M.stamp, sub, color, -0.14);
      } else {
        const sh = L.label * 2.2, sy = notchY - sh / 2;
        setFont(ctx, 600, L.label, F.mono); const txt = M.stamp + (sub ? '  ' + sub : ''); const tw = trackedWidth(ctx, txt, L.label * 0.14) + L.label * 2.4;
        ctx.fillStyle = C.ink; ctx.fill(rr(ctx, (W - tw) / 2, sy, tw, sh, sh / 2)); ctx.lineWidth = 2; ctx.strokeStyle = color; ctx.stroke(rr(ctx, (W - tw) / 2, sy, tw, sh, sh / 2));
        ctx.fillStyle = C.ivory; tracked(ctx, txt, W / 2, sy + sh / 2 + L.label * CAP.mono / 2, L.label * 0.14, 'center');
      }
    }

    // footer
    setFont(ctx, 400, L.footSerif, F.serif, 'italic'); ctx.fillStyle = C.ivory; ctx.fillText('Trade the playbook.', x0, footBase);
    const serifW = ctx.measureText('Trade the playbook.').width;
    const legal = 'NOT FINANCIAL ADVICE · HIGH RISK · 18+';
    const lsz = fitTracked(ctx, legal, 500, F.mono, L.legal, x1 - x0 - serifW - 40, 0.1); ctx.fillStyle = C.stone;
    tracked(ctx, legal, x1, footBase, lsz * 0.1, 'right');

    if (sizeKey === 'story') storyCrown(ctx, W, H);
    if (s.example) drawExample(ctx, W, H);
  }
  function whenText(when, tz){
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(when || '');
    if (!m) return '';
    const MON = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    return `${+m[3]} ${MON[+m[2] - 1]} ${m[1]} · ${m[4]}:${m[5]}${tz ? ' ' + String(tz).trim().toUpperCase() : ''}`;
  }

  /* ---------- results card ---------- */
  const RES = {
    square:   {m:40, pad:40, top:48,  logoH:50, headGap:44, tag:21, title:58, dates:21, heroLabel:20, hero:96,  statLabel:19, statVal:42, curve:0,   row:24, rowH:42, head:19, footTop:1080-88, footSerif:30, legal:18},
    portrait: {m:48, pad:48, top:60,  logoH:58, headGap:58, tag:22, title:78, dates:23, heroLabel:22, hero:128, statLabel:21, statVal:52, curve:128, row:26, rowH:46, head:20, footTop:1350-96, footSerif:34, legal:19},
    story:    {m:48, pad:56, top:236, logoH:68, headGap:64, tag:24, title:92, dates:26, heroLabel:25, hero:150, statLabel:24, statVal:60, curve:170, row:30, rowH:54, head:22, footTop:1920-330, footSerif:40, legal:20},
  };
  function drawResults(ctx, W, H, res, sizeKey){
    const L = RES[sizeKey]; const R = resultsModel(res);
    drawBackground(ctx, W, H);
    const pX = L.m, pW = W - L.m * 2, x0 = pX + L.pad, x1 = pX + pW - L.pad;

    drawLogo(ctx, x0, L.top, L.logoH);
    drawTag(ctx, 'WEEKLY RESULTS', x1, L.top + L.logoH / 2, L.tag, false);

    // title row
    const titleBase = L.top + L.logoH + L.headGap + L.title * CAP.display;
    const title = String(res.title || '').trim() || 'This week';
    setFont(ctx, 600, L.dates, F.mono); const datesText = String(res.dates || '').trim().toUpperCase(); const dW = trackedWidth(ctx, datesText, L.dates * 0.1);
    const tSize = fitSize(ctx, title, 800, F.display, L.title, x1 - x0 - dW - 32, 36);
    setFont(ctx, 800, tSize, F.display); ctx.fillStyle = C.ivory; ctx.fillText(title, x0, titleBase);
    setFont(ctx, 600, L.dates, F.mono); ctx.fillStyle = C.stone; tracked(ctx, datesText, x1, titleBase, L.dates * 0.1, 'right');

    // summary panel
    const panTop = titleBase + L.title * 0.42;
    let y = panTop + L.pad * 0.8;
    const heroLabelBase = y + L.heroLabel * CAP.mono;
    const heroBase = heroLabelBase + L.heroLabel * 0.9 + L.hero * CAP.display;
    const statLabelBase = heroBase + L.hero * 0.34 + L.statLabel * CAP.mono;
    const statValBase = statLabelBase + L.statLabel * 0.75 + L.statVal * CAP.display;
    let panBot = statValBase + L.pad * 0.8;
    const curveTop = statValBase + L.pad * 0.95, curveH = L.curve;
    if (curveH) panBot = curveTop + L.statLabel * 1.9 + curveH + L.pad * 0.7;
    ctx.fillStyle = C.panel; ctx.fill(rr(ctx, pX, panTop, pW, panBot - panTop, 26)); ctx.lineWidth = 2; ctx.strokeStyle = C.line; ctx.stroke(rr(ctx, pX, panTop, pW, panBot - panTop, 26));

    setFont(ctx, 500, L.heroLabel, F.mono); ctx.fillStyle = C.stone; tracked(ctx, 'NET RESULT', x0, heroLabelBase, L.heroLabel * 0.14);
    const netText = R.trades.length ? fmtR(R.net) : '0.0R';
    const heroSize = fitSize(ctx, netText, 800, F.display, L.hero, x1 - x0 - L.hero * 0.6, 60);
    setFont(ctx, 800, heroSize, F.display); ctx.fillStyle = C.ivory; ctx.fillText(netText, x0, heroBase);
    const nw = ctx.measureText(netText).width; const nv = Math.round(R.net * 10) / 10;
    if (R.trades.length && nv !== 0) { ctx.fillStyle = nv > 0 ? C.up : C.down; triangle(ctx, x0 + nw + heroSize * 0.14, heroBase - heroSize * CAP.display / 2, heroSize * 0.3, nv > 0); }

    const stats = [['TRADES', String(R.trades.length)], ['WINS', String(R.wins)], ['LOSSES', String(R.losses)], ['BREAKEVEN', String(R.be)], ['WIN RATE', R.trades.length ? R.rate + '%' : '—']];
    const tileW = (x1 - x0) / stats.length;
    stats.forEach(([lab, val], i) => {
      const tx = x0 + i * tileW + (i ? L.statLabel * 1.1 : 0);
      if (i) { ctx.fillStyle = C.line2; ctx.fillRect(x0 + i * tileW, statLabelBase - L.statLabel * CAP.mono, 2, statValBase - statLabelBase + L.statLabel * CAP.mono); }
      setFont(ctx, 500, L.statLabel, F.mono); ctx.fillStyle = C.stone; tracked(ctx, lab, tx, statLabelBase, L.statLabel * 0.1);
      setFont(ctx, 800, L.statVal, F.display); ctx.fillStyle = C.ivory; ctx.fillText(val, tx, statValBase);
    });

    if (curveH) {
      ctx.fillStyle = C.line; ctx.fillRect(x0, curveTop - L.pad * 0.45, x1 - x0, 2);
      setFont(ctx, 500, L.statLabel, F.mono); ctx.fillStyle = C.stone;
      const cLabelBase = curveTop + L.statLabel * CAP.mono + 4; tracked(ctx, 'CUMULATIVE R, TRADE BY TRADE', x0, cLabelBase, L.statLabel * 0.1);
      const top = cLabelBase + L.statLabel * 1.2, bot = top + curveH;
      const pts = R.curve; const lo = Math.min(0, ...pts), hi = Math.max(0, ...pts); const span = (hi - lo) || 1;
      const labW = 70; const cx0 = x0 + labW, cx1 = x1 - 16;
      const xs = i => pts.length > 1 ? cx0 + (cx1 - cx0) * i / (pts.length - 1) : cx0;
      const ys = v => bot - (v - lo) / span * (bot - top);
      const zy = ys(0);
      ctx.fillStyle = C.line2; ctx.fillRect(cx0, zy - 1, cx1 - cx0, 2);
      setFont(ctx, 500, Math.max(22, L.statLabel * 1.05), F.mono); ctx.fillStyle = C.stone; ctx.textAlign = 'right'; ctx.fillText('0R', cx0 - 14, zy + L.statLabel * 0.38); ctx.textAlign = 'left';
      if (pts.length > 1) {
        ctx.beginPath(); pts.forEach((v, i) => { const X = xs(i), Y = ys(v); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
        ctx.lineTo(xs(pts.length - 1), zy); ctx.lineTo(xs(0), zy); ctx.closePath(); ctx.fillStyle = 'rgba(216,173,78,0.12)'; ctx.fill();
        ctx.beginPath(); pts.forEach((v, i) => { const X = xs(i), Y = ys(v); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
        ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = C.gold; ctx.stroke();
        const ex = xs(pts.length - 1), ey = ys(pts[pts.length - 1]);
        ctx.fillStyle = C.panel; ctx.beginPath(); ctx.arc(ex, ey, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(ex, ey, 9, 0, Math.PI * 2); ctx.fill();
        setFont(ctx, 600, Math.max(24, L.statLabel * 1.2), F.mono); ctx.fillStyle = C.ivory; ctx.textAlign = 'right';
        const endLabel = fmtR(pts[pts.length - 1]); const above = ey - top > L.statLabel * 2;
        ctx.fillText(endLabel, ex - 2, above ? ey - 24 : ey + 24 + L.statLabel * 0.8); ctx.textAlign = 'left';
      }
    }

    // trade list
    const footBase = L.footTop;
    const listTop = panBot + L.rowH * 0.9;
    const listBottom = footBase - L.footSerif * 1.6;
    const headBase = listTop + L.head * CAP.mono;
    const firstRowTop = headBase + L.head * 0.9;
    const avail = listBottom - firstRowTop;
    const total = R.trades.length;
    let cols = 1, rowH = L.rowH;
    if (total * L.rowH > avail) { if (total * L.rowH * 0.86 <= avail) rowH = avail / total; else cols = 2; }
    const perCol = Math.max(1, Math.floor(avail / rowH));
    const capacity = perCol * cols;
    const shownTrades = total > capacity ? R.trades.slice(0, capacity) : R.trades;
    const colGap = 56; const colW = cols === 2 ? (x1 - x0 - colGap) / 2 : x1 - x0;
    const rowsPerCol = cols === 2 ? Math.ceil(shownTrades.length / 2) : Math.max(1, shownTrades.length);
    if (cols === 2) rowH = Math.min(L.rowH * 1.3, avail / rowsPerCol);
    const maxAbs = Math.max(1, ...R.trades.map(t => Math.abs(t.r)));
    const rowFont = cols === 2 ? Math.round(L.row * 0.94) : L.row;
    setFont(ctx, 500, rowFont, F.mono);
    const cw = ctx.measureText('0').width, triS = rowFont * 0.62;
    const dayW = ctx.measureText('WED').width + cw * 1.3;
    const mkMax = cols === 2 ? cw * 7 : cw * 10;
    const mkW = Math.min(Math.max(cw * 4, ...shownTrades.map(t => ctx.measureText(t.market).width)), mkMax) + cw * 1.3;
    const sideW = triS + cw * 0.6 + ctx.measureText('SELL').width + cw * 1.3;
    const valW = ctx.measureText('+10.0R').width;
    let layout;
    if (cols === 2) {
      let bw = colW - dayW - mkW - sideW - valW - cw * 1.2; bw = bw < 40 ? 0 : Math.min(bw, 90);
      layout = {day: 0, market: dayW, side: dayW + mkW, bar: colW - valW - cw * 1.2 - bw, barW: bw, valueRight: colW, mkLimit: mkW - cw * 1.1};
    } else {
      const market = Math.max(dayW, colW * 0.13), side = Math.max(market + mkW, colW * 0.4);
      const bar = Math.max(side + sideW, colW * 0.6);
      layout = {day: 0, market, side, bar, barW: Math.max(0, Math.min(Math.round(colW * 0.17), colW - valW - cw * 1.2 - bar)), valueRight: colW, mkLimit: side - market - cw * 1.1};
    }
    if (!total) {
      setFont(ctx, 400, L.footSerif, F.serif, 'italic'); ctx.fillStyle = C.stone; ctx.fillText(res.emptyText || 'No trades yet. Add them on the left.', x0, firstRowTop + L.rowH * 0.8);
    }
    for (let c = 0; c < cols && total; c++) {
      if (c * rowsPerCol >= shownTrades.length) break;
      const cx = x0 + c * (colW + colGap);
      setFont(ctx, 500, L.head, F.mono); ctx.fillStyle = C.stone;
      tracked(ctx, 'DAY', cx + layout.day, headBase, L.head * 0.12);
      tracked(ctx, 'MARKET', cx + layout.market, headBase, L.head * 0.12);
      tracked(ctx, 'SIDE', cx + layout.side, headBase, L.head * 0.12);
      tracked(ctx, 'RESULT', cx + layout.valueRight, headBase, L.head * 0.12, 'right');
    }
    shownTrades.forEach((t, i) => {
      const c = Math.floor(i / rowsPerCol), r = i % rowsPerCol; const cx = x0 + c * (colW + colGap);
      const top = firstRowTop + r * rowH; const base = top + rowH / 2 + rowFont * CAP.mono / 2;
      ctx.fillStyle = C.line; ctx.fillRect(cx, top, colW, 1.5);
      setFont(ctx, 500, rowFont, F.mono); ctx.fillStyle = C.ivory;
      ctx.fillText(t.day || '—', cx + layout.day, base);
      let mk = t.market; while (mk.length > 3 && ctx.measureText(mk).width > layout.mkLimit) mk = mk.slice(0, -1);
      ctx.fillText(mk, cx + layout.market, base);
      ctx.fillStyle = t.side === 'buy' ? C.up : C.down;
      triangle(ctx, cx + layout.side, base - rowFont * CAP.mono / 2, triS, t.side === 'buy');
      ctx.fillStyle = C.ivory; ctx.fillText(t.side === 'buy' ? 'BUY' : 'SELL', cx + layout.side + triS + cw * 0.6, base);
      const barW = layout.barW, bx = cx + layout.bar + barW / 2, bh = Math.max(8, rowFont * 0.42), by = base - rowFont * CAP.mono / 2 - bh / 2;
      const len = Math.abs(t.r) / maxAbs * (barW / 2 - 2);
      if (barW > 0) { ctx.fillStyle = C.line2; ctx.fillRect(bx - 1, by - 5, 2, bh + 10); }
      if (barW <= 0) { /* no room for bars in this layout */ }
      else if (t.r > 0) { ctx.fillStyle = C.up; ctx.fill(rr(ctx, bx + 1, by, Math.max(len, 6), bh, 4)); ctx.fillRect(bx + 1, by, Math.min(5, len), bh); }
      else if (t.r < 0) { ctx.fillStyle = C.down; ctx.fill(rr(ctx, bx - 1 - Math.max(len, 6), by, Math.max(len, 6), bh, 4)); ctx.fillRect(bx - 1 - Math.min(5, len), by, Math.min(5, len), bh); }
      else { ctx.fillStyle = C.stone; ctx.beginPath(); ctx.arc(bx, by + bh / 2, 5, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = C.ivory; ctx.textAlign = 'right'; ctx.fillText(fmtR(t.r), cx + layout.valueRight, base); ctx.textAlign = 'left';
    });

    // footer
    const allShown = shownTrades.length === total;
    setFont(ctx, 400, L.footSerif, F.serif, 'italic'); ctx.fillStyle = C.gold;
    ctx.fillText(allShown ? 'Every trade shown, losses included.' : `Showing ${shownTrades.length} of ${total} trades. The totals include all of them.`, x0, footBase);
    const legalR = "PAST RESULTS DON'T GUARANTEE FUTURE RESULTS · NOT FINANCIAL ADVICE · 18+";
    const lsz = fitTracked(ctx, legalR, 500, F.mono, L.legal, x1 - x0, 0.06); ctx.fillStyle = C.stone;
    tracked(ctx, legalR, x0, footBase + L.legal * 2.1, lsz * 0.06);

    if (sizeKey === 'story') storyCrown(ctx, W, H);
    if (res.example) drawExample(ctx, W, H);
    return R;
  }

  /* ---------- captions ---------- */
  function captionSignal(s){
    const M = signalModel(s); const mk = (s.instrument || 'MARKET').trim().toUpperCase(); const side = s.side === 'sell' ? 'SELL' : 'BUY';
    const order = s.order === 'limit' ? ` LIMIT` : s.order === 'stop' ? ` STOP` : '';
    const lines = [`${mk} · ${side}${order}`];
    if (M.entry !== null) lines.push(`Entry ${fmtPrice(s.entry)}`);
    if (M.sl !== null) lines.push(`Stop loss ${fmtPrice(s.sl)}`);
    if (M.tp !== null) lines.push(`Take profit ${fmtPrice(s.tp)}`);
    if (M.tp2 !== null) lines.push(`Take profit 2 ${fmtPrice(s.tp2)}`);
    if (M.rr1 !== null) lines.push(`Risk : reward 1 : ${M.rr1.toFixed(1)}${M.rr2 !== null ? ' / ' + M.rr2.toFixed(1) : ''}`);
    if (s.status !== 'live' && M.stamp) lines.push('', `${({tp:'Take profit hit', tp2:'Take profit 2 hit', sl:'Stop loss hit', be:'Closed at breakeven', closed:'Closed early'})[s.status]}${M.result !== null ? ': ' + plainR(M.result) : ''}`);
    if (s.kind === 'aplus' && String(s.why || '').trim()) lines.push('', 'Why I took it: ' + String(s.why).trim());
    lines.push('', s.kind === 'aplus' ? 'A+ setup · TCP — The Crypto Playbook' : 'Algorithmic signal · TCP Quant Terminal', 'Not financial advice. Trading is high risk. 18+');
    return lines.join('\n');
  }
  function captionResults(res){
    const R = resultsModel(res);
    const head = `${String(res.title || '').trim() || 'This week'}${String(res.dates || '').trim() ? ' · ' + String(res.dates).trim() : ''}`;
    if (!R.trades.length) return head + '\nNo trades logged yet.';
    return [head,
      `Net ${plainR(R.net)} · ${R.trades.length} trades · ${R.wins} wins · ${R.losses} losses${R.be ? ' · ' + R.be + ' breakeven' : ''} · win rate ${R.rate}%`,
      '', 'Every trade shown, losses included.',
      "Past results don't guarantee future results. Not financial advice. 18+"].join('\n');
  }

  return {C, F, FOIL, LOGO, SIZES, MINUS, CAP, SIG, RES, num, decimals, fmtPrice, fmtDiff, fmtR, plainR, signalModel, parseTrades, resultsModel, whenText, drawLogo, drawSignal, drawResults, captionSignal, captionResults};
});
