// TCP Quant Terminal: the page's Playbook. build.mjs puts lib.js and playbook-lib.js in front
// of this file and app.js after it, all in one script. Nothing here runs on load: the
// functions use app.js's helpers ($, call, tg, demo, quoteOf, ...) when they're called, and
// app.js calls pbInit() once the member is signed in.

const pb = {
  data: null, // the last answer from /api/playbook
  at: 0, // when it came
  loading: null,
  opened: new Set(), // history rows showing their detail
  rows: 12, // history rows shown
  form: { symbol: 'XAUUSD', side: 'buy', kind: 'market', expiry: 24, tags: [], photo: null, liveEntry: true },
  busy: false,
  curve: { drawn: '', hover: null, anim: 0 },
  photos: {}, // setup number -> object URL of its chart
  toastTimer: 0,
};
const pbEsc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pbDate = (t) => new Date(t * 1000).toLocaleDateString([], { day: 'numeric', month: 'short' });
const pbKind = (s) => (s.kind === 'market' ? '' : ` ${s.kind.toUpperCase()}`);
const PB_SESSIONS = { sydney: 'Sydney session', tokyo: 'Tokyo session', london: 'London session', newyork: 'New York session' };

// ------------------------------------------------------------------- data
async function pbSend(path, body) {
  const form = body instanceof FormData;
  const res = await fetch(path, {
    method: 'POST',
    headers: { authorization: 'tma ' + (tg ? tg.initData : ''), ...(form ? {} : { 'content-type': 'application/json' }) },
    body: form ? body : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || 'Something went wrong. Try again.'), { code: data.error, field: data.field });
  return data;
}

// One load at a time; a forced reload asked for during one runs after it.
function pbLoad(force = false) {
  if (!force && pb.data && !pb.data.error && clock() - pb.at < 30) return Promise.resolve();
  if (pb.loading) return force ? pb.loading.then(() => pbLoad(true)) : pb.loading;
  pb.loading = (async () => {
    try {
      pb.data = demo ? pbDemo() : await call('/api/playbook');
      pb.at = clock();
    } catch (err) {
      if (!pb.data || pb.data.error) pb.data = { error: err.message };
    }
    pbRender();
  })().finally(() => { pb.loading = null; });
  return pb.loading;
}

// Setups on a market other than the one on screen still need its prices for their live R.
function pbPrices() {
  const d = pb.data;
  if (!d || !d.setups) return;
  for (const symbol of new Set(d.setups.filter(isActive).map((s) => s.symbol))) {
    if (!state.data[symbol] || clock() - (state.data[symbol].updated || 0) > 90) loadMarket(symbol);
  }
}

// ----------------------------------------------------------------- render
function pbFab() {
  const poster = !!(pb.data && pb.data.canPost && pb.data.ready);
  const show = poster && !$('signals').hidden;
  $('pbNew').hidden = !show;
  $('pbExport').hidden = !poster;
  document.body.classList.toggle('with-fab', show || !$('brNew').hidden);
}

// Posters: the bot sends the whole record as a file (JSON lines, the chain checked).
async function pbExport() {
  if (demo) return pbToast('Demo: there is no record to send.');
  $('pbExport').disabled = true;
  try {
    const res = await pbSend('/api/playbook/export', {});
    pbToast(`Sent to you in Telegram: ${res.setups} setups, ${res.entries} entries, ${res.intact ? 'chain intact' : `chain broken at entry ${res.brokenAt}`}.`);
  } catch (err) {
    pbToast(err.message);
  } finally {
    $('pbExport').disabled = false;
  }
}

function pbRender() {
  const d = pb.data;
  pbFab();
  pbMemory();
  if (!d) return;
  const quiet = (tag, text) => {
    $('pbTag').textContent = tag;
    $('pbBody').hidden = true;
    $('pbEmpty').hidden = false;
    $('pbEmpty').textContent = text;
  };
  if (d.error) {
    quiet('offline', d.error);
    for (const id of ['pbHistoryCard', 'pbReadsCard']) $(id).hidden = true;
    $('pbActive').innerHTML = '';
    return;
  }
  if (!d.ready) {
    quiet('starts soon', "The Playbook opens soon: Lewis's setups, logged before the result, with every result tracked to the end.");
    return;
  }
  const st = d.stats;
  const tag = d.canPost && d.mode !== 'live' ? 'test mode' : st.setups ? `${st.setups} logged` : d.canPost ? 'ready' : 'starts soon';
  if (!st.setups) {
    quiet(tag, d.canPost
      ? d.mode === 'live' ? 'Nothing logged yet. Tap + LOG A SETUP: it goes to the Inner Circle and its result is tracked to the end.'
        : 'Test mode: setups you log go to the team group only and stay out of this record. Switch PLAYBOOK_MODE to live when you are ready.'
      : 'No setups yet. When Lewis logs one, it appears here and in the Inner Circle, and its result is tracked to the end.');
  } else {
    $('pbTag').textContent = tag;
    $('pbBody').hidden = false;
    $('pbEmpty').hidden = true;
    $('pbResults').textContent = st.results;
    $('pbWL').textContent = `${st.won} · ${st.lost}`;
    $('pbAvg').textContent = fmtR(st.avg, 2);
    $('pbTotal').textContent = st.results ? fmtR(st.total, 1) : '—';
    const v = pbVerdict(st);
    $('pbVerdict').className = `pb-verdict ${v.cls}`;
    $('pbVerdict').innerHTML = `<span class="icon" aria-hidden="true">${v.icon}</span><div><b>${v.title}</b><span>${v.text}</span></div>` +
      (v.progress != null ? `<div class="pb-progress"><i style="width:${Math.round(v.progress * 100)}%"></i></div>` : '');
    const tf = st.targetFirst;
    $('pbFirst').innerHTML = tf.n
      ? `Target before stop: <b>${tf.hits} of ${tf.n}</b> (${Math.round((tf.hits / tf.n) * 100)}%), where no edge would give <b>${pct(tf.noEdge)}</b> for the same stops and targets.`
      : '';
    pbCurve();
  }
  pbActive();
  pbHistory();
  pbReads();
  pbLive();
}

function pbVerdict(st) {
  const n = st.results;
  if (st.verdict === 'collecting') {
    return { cls: 'collecting', icon: n, progress: n / st.firstRead, title: `Collecting: ${n} of ${st.firstRead}`,
      text: `The first read comes at ${st.firstRead} results. Until then, any average is mostly luck.` };
  }
  const band = `${fmtR(st.band[0], 2)} to ${fmtR(st.band[1], 2)}`;
  if (st.verdict === 'ahead') return { cls: 'ahead', icon: '▲', title: 'Ahead of no edge', text: `After ${n} results the whole band (${band}) is above zero: early evidence of an edge, tested again with every setup.` };
  if (st.verdict === 'behind') return { cls: 'behind', icon: '▼', title: 'Behind no edge', text: `After ${n} results the whole band (${band}) is below zero.` };
  return { cls: 'unclear', icon: '≈', title: 'Too close to call', text: `After ${n} results the band (${band}) still spans zero: no edge shown either way yet.` };
}

// The chart: the average result after each close (the line), the band the true average
// likely sits in (95%), and each result as a dot, filled if won and hollow if lost.
function pbCurve() {
  if ($('signals').hidden) return; // drawn (and animated) when the tab opens
  const pts = pb.data.stats.curve;
  const key = pts.map((p) => `${p.n}:${p.mean}`).join(',');
  if (key === pb.curve.drawn) return pbDraw(1);
  pb.curve.drawn = key;
  cancelAnimationFrame(pb.curve.anim);
  if (reduceMotion) return pbDraw(1);
  const began = performance.now();
  const step = (ts) => {
    const t = Math.min(1, (ts - began) / 900);
    pbDraw(1 - (1 - t) ** 3);
    if (t < 1) pb.curve.anim = requestAnimationFrame(step);
  };
  pb.curve.anim = requestAnimationFrame(step);
}

function pbGeometry() {
  const cv = $('pbCurve');
  const w = cv.clientWidth;
  const h = cv.clientHeight;
  const pts = pb.data.stats.curve;
  const pad = { l: 36, r: 56, t: 10, b: 22 };
  // The scale follows the results and the average; the early band, wide on a few results,
  // is cut off at the edges rather than squeezing everything else flat.
  let lo = -1.5;
  let hi = 1.5;
  for (const p of pts) {
    lo = Math.min(lo, p.mean - 0.3, Math.max(p.r, -2.5) - 0.3);
    hi = Math.max(hi, p.mean + 0.3, Math.min(p.r, 3.5) + 0.3);
  }
  lo = Math.max(Math.floor(lo * 2) / 2, -3);
  hi = Math.min(Math.ceil(hi * 2) / 2, 4);
  const n = pts.length;
  return {
    w, h, pad, lo, hi, n, pts,
    x: (i) => pad.l + (n <= 1 ? (w - pad.l - pad.r) / 2 : (i / (n - 1)) * (w - pad.l - pad.r)),
    y: (v) => pad.t + ((hi - Math.min(hi, Math.max(lo, v))) / (hi - lo)) * (h - pad.t - pad.b),
  };
}

function pbDraw(progress) {
  const cv = $('pbCurve');
  if (!pb.data || !pb.data.stats || !cv.clientWidth) return;
  const g = pbGeometry();
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  if (cv.width !== Math.round(g.w * dpr) || cv.height !== Math.round(g.h * dpr)) {
    cv.width = Math.round(g.w * dpr);
    cv.height = Math.round(g.h * dpr);
  }
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, g.w, g.h);
  const right = g.w - g.pad.r;
  ctx.font = '500 10px "JetBrains Mono", ui-monospace, monospace';
  ctx.textBaseline = 'middle';
  // hairline grid on whole R, and the zero line a step brighter: no edge
  for (let v = Math.ceil(g.lo); v <= Math.floor(g.hi); v++) {
    const yy = Math.round(g.y(v)) + 0.5;
    ctx.strokeStyle = v === 0 ? '#5A5346' : '#26231C';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g.pad.l, yy);
    ctx.lineTo(right, yy);
    ctx.stroke();
    ctx.fillStyle = '#8A8274';
    ctx.textAlign = 'right';
    ctx.fillText(v === 0 ? '0R' : `${v > 0 ? '+' : '−'}${Math.abs(v)}R`, g.pad.l - 6, yy);
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8A8274';
  ctx.fillText('no edge', right + 6, g.y(0) + (g.n && Math.abs(g.y(g.pts[g.n - 1].mean) - g.y(0)) < 12 ? 11 : 0));
  // x axis: result numbers at the ends
  ctx.textBaseline = 'alphabetic';
  if (g.n) {
    ctx.textAlign = 'left';
    ctx.fillText('1st result', g.pad.l, g.h - 4);
    if (g.n > 1) { ctx.textAlign = 'right'; ctx.fillText(`${ordinal(g.n)}`, right, g.h - 4); }
  }
  if (!g.n) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#A69D8C';
    ctx.font = '400 13px Archivo, system-ui, sans-serif';
    ctx.fillText('The first result starts the line.', (g.pad.l + right) / 2, g.y(0) - 14);
    return;
  }
  const m = Math.max(1, Math.round(g.n * progress));
  // the band, clipped to the plot
  const banded = [];
  for (let i = 0; i < m; i++) if (g.pts[i].band) banded.push(i);
  if (banded.length > 1) {
    const top = g.pad.t;
    const bottom = g.h - g.pad.b;
    const clampY = (v) => Math.max(top, Math.min(bottom, g.y(v)));
    ctx.beginPath();
    banded.forEach((i, k) => (k ? ctx.lineTo(g.x(i), clampY(g.pts[i].band[1])) : ctx.moveTo(g.x(i), clampY(g.pts[i].band[1]))));
    for (let k = banded.length - 1; k >= 0; k--) ctx.lineTo(g.x(banded[k]), clampY(g.pts[banded[k]].band[0]));
    ctx.closePath();
    ctx.fillStyle = 'rgba(216,173,78,0.16)';
    ctx.fill();
  }
  // each result: context, so muted
  for (let i = 0; i < m; i++) {
    const p = g.pts[i];
    ctx.beginPath();
    ctx.arc(g.x(i), g.y(Math.max(-2.5, Math.min(3.5, p.r))), 3.5, 0, Math.PI * 2);
    if (p.status === 'lost') {
      ctx.strokeStyle = 'rgba(224,97,63,0.85)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    } else {
      ctx.fillStyle = p.status === 'won' ? 'rgba(53,166,140,0.8)' : 'rgba(138,130,116,0.9)';
      ctx.fill();
    }
  }
  // the average: the accent
  ctx.beginPath();
  for (let i = 0; i < m; i++) (i ? ctx.lineTo(g.x(i), g.y(g.pts[i].mean)) : ctx.moveTo(g.x(i), g.y(g.pts[i].mean)));
  ctx.strokeStyle = '#D8AD4E';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
  const end = g.pts[m - 1];
  ctx.beginPath();
  ctx.arc(g.x(m - 1), g.y(end.mean), 4.5, 0, Math.PI * 2);
  ctx.fillStyle = '#D8AD4E';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#16140F';
  ctx.stroke();
  if (m === g.n) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#F2ECDF';
    ctx.font = '600 11px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillText(fmtR(end.mean, 2), right + 6, g.y(end.mean) + (Math.abs(g.y(end.mean) - g.y(0)) < 12 ? -6 : 0));
  }
  // the crosshair
  const hi = pb.curve.hover;
  if (hi != null && hi < m) {
    const xx = Math.round(g.x(hi)) + 0.5;
    ctx.strokeStyle = 'rgba(242,236,223,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xx, g.pad.t);
    ctx.lineTo(xx, g.h - g.pad.b);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(g.x(hi), g.y(g.pts[hi].mean), 4, 0, Math.PI * 2);
    ctx.fillStyle = '#D8AD4E';
    ctx.fill();
  }
}

// Touch or hover: the nearest result, its setup and the average and band after it.
function pbHover(i) {
  const tip = $('pbTip');
  const pts = pb.data && pb.data.stats ? pb.data.stats.curve : [];
  if (i == null || !pts[i]) {
    pb.curve.hover = null;
    tip.hidden = true;
    pbDraw(1);
    return;
  }
  pb.curve.hover = i;
  pbDraw(1);
  const p = pts[i];
  const word = p.status === 'won' ? 'won' : p.status === 'lost' ? 'lost' : 'scratch';
  tip.innerHTML = `<b>${fmtR(p.r, 2)}</b> · #${p.n} ${word}, after costs<br><span class="k"></span>average after ${i + 1}: <b>${fmtR(p.mean, 2)}</b>` +
    (p.band ? `<br>95% band: ${fmtR(p.band[0], 2)} to ${fmtR(p.band[1], 2)}` : '<br>no band until 3 results');
  tip.hidden = false;
  const g = pbGeometry();
  const left = Math.max(0, Math.min(g.w - tip.offsetWidth, g.x(i) - tip.offsetWidth / 2));
  tip.style.left = `${left}px`;
}

function pbPoint(e) {
  const pts = pb.data && pb.data.stats ? pb.data.stats.curve : [];
  if (!pts.length) return null;
  const g = pbGeometry();
  const x = e.clientX - $('pbCurve').getBoundingClientRect().left;
  let best = 0;
  for (let i = 1; i < pts.length; i++) if (Math.abs(g.x(i) - x) < Math.abs(g.x(best) - x)) best = i;
  return best;
}

// ----------------------------------------------------------- live setups
function pbActive() {
  const d = pb.data;
  const active = d.setups.filter(isActive);
  $('pbActive').innerHTML = active.map((s) => pbCard(s, d.canPost)).join('');
}

function pbCard(s, canPost) {
  const m = MARKETS[s.symbol];
  const f = (v) => fmtNum(v, m.digits);
  const rr = Math.abs(s.tp - s.entry) / Math.abs(s.entry - s.sl);
  const open = s.status === 'open';
  const buttons = [];
  if (s.photo) buttons.push(`<button type="button" data-photo="${s.n}">VIEW CHART</button>`);
  if (canPost && open) {
    if (s.stop !== s.fill) buttons.push(`<button type="button" class="gold" data-act="breakeven" data-n="${s.n}">BREAKEVEN</button>`);
    buttons.push(`<button type="button" data-act="stop" data-n="${s.n}">MOVE STOP</button>`, `<button type="button" class="gold" data-act="close" data-n="${s.n}">CLOSE NOW</button>`);
  }
  if (canPost && !open) buttons.push(`<button type="button" data-act="cancel" data-n="${s.n}">CANCEL ORDER</button>`);
  const stopWord = s.stop === s.sl ? 'Stop' : s.stop === s.fill ? 'Stop · at entry' : 'Stop · moved';
  return `<div class="card pb-setup${s.test ? ' test' : ''}">
    <div class="sig-top"><b>${s.symbol}</b><span class="sig-side ${s.side}">${s.side.toUpperCase()}${pbKind(s)}</span>
      <span class="pb-state ${s.status}">${open ? 'LIVE' : 'WAITING FOR PRICE'}</span>${s.test ? '<span class="pb-state test">TEST</span>' : ''}
      <span class="sig-time">#${s.n} · ${timeLabel(s.created)}</span></div>
    <div class="sig-grid">
      <div><span>${open ? 'Filled' : 'Entry'}</span><b>${f(open ? s.fill : s.entry)}</b></div>
      <div><span>${stopWord}</span><b>${f(s.stop)}</b></div>
      <div><span>Target · ${fmtNum(rr, 1)}R</span><b>${f(s.tp)}</b></div>
      <div><span>${open ? 'Now' : 'Price now'}</span><b class="pb-now" data-live="${s.n}">—</b></div>
    </div>
    <div class="pb-track" data-track="${s.n}" aria-hidden="true"><div class="ends"><span>STOP</span><span>TARGET</span></div><div class="rail"></div><i class="mark"></i><i class="dot"></i></div>
    <p class="pb-why"><b>WHY</b>${pbEsc(s.note)}</p>
    ${s.tags.length ? `<div class="pb-tags">${s.tags.map((t) => `<span>#${pbEsc(t)}</span>`).join('')}</div>` : ''}
    <div class="pb-meta">No-edge odds ${pct(noEdgeOdds(s))} · logged ${ago(s.created)}${open ? '' : ` · waits until ${s.expires - clock() > 20 * 3600 ? `${pbDate(s.expires)} ` : ''}${timeLabel(s.expires)}`}${s.ref ? ` · ref ${pbEsc(s.ref)}` : ''}</div>
    ${buttons.length ? `<div class="pb-buttons">${buttons.join('')}</div>` : ''}
    <div class="pb-stoprow" data-stoprow="${s.n}" hidden><input inputmode="decimal" placeholder="New stop" aria-label="New stop for #${s.n}"><button type="button" data-act="stop-go" data-n="${s.n}">MOVE</button></div>
  </div>`;
}

// Every second while the Signals tab shows: live R, and where the price sits between stop and target.
function pbLive() {
  const d = pb.data;
  if (!d || !d.setups) return;
  for (const s of d.setups) {
    if (!isActive(s)) continue;
    const el = document.querySelector(`[data-live="${s.n}"]`);
    if (!el) continue;
    const q = quoteOf(s.symbol);
    const price = q && q.price;
    const track = document.querySelector(`[data-track="${s.n}"]`);
    const at = (v) => `${Math.max(-1, Math.min(101, ((v - s.stop) / (s.tp - s.stop)) * 100))}%`;
    track.querySelector('.mark').style.left = at(s.status === 'open' ? s.fill : s.entry);
    if (!(price > 0)) {
      el.textContent = '—';
      track.querySelector('.dot').hidden = true;
      continue;
    }
    track.querySelector('.dot').hidden = false;
    track.querySelector('.dot').style.left = at(price);
    if (s.status === 'open') {
      const r = setupLiveR(s, price);
      el.textContent = fmtR(r, 2);
      el.className = `pb-now ${r > 0.005 ? 'up' : r < -0.005 ? 'down' : ''}`;
    } else {
      el.textContent = fmtNum(price, MARKETS[s.symbol].digits);
    }
  }
}

// ---------------------------------------------------------------- history
function pbHistory() {
  const done = pb.data.setups.filter((s) => !isActive(s));
  $('pbHistoryCard').hidden = !done.length;
  if (!done.length) return;
  $('pbCount').textContent = `${done.length} closed`;
  const rows = done.slice(0, pb.rows).map((s) => {
    const result = isResult(s);
    const how = { tp: 'Target', sl: 'Stop', be: 'Stop at entry', trail: 'Trailing stop', manual: 'Closed by hand' }[s.reason] ||
      (s.status === 'expired' ? 'Expired, never filled' : 'Cancelled before it filled');
    const held = result && s.filled ? ` · ${fmtDuration(s.closed - s.filled)}` : '';
    const cls = result ? s.status : 'void';
    const open = pb.opened.has(s.n);
    const detail = open ? `<div class="pb-detail">
        <p class="pb-why"><b>WHY</b>${pbEsc(s.note)}</p>
        ${s.tags.length ? `<div class="pb-tags">${s.tags.map((t) => `<span>#${pbEsc(t)}</span>`).join('')}</div>` : ''}
        <div class="pb-meta">Entry ${fmtNum(s.entry, MARKETS[s.symbol].digits)} · stop ${fmtNum(s.sl, MARKETS[s.symbol].digits)} · target ${fmtNum(s.tp, MARKETS[s.symbol].digits)}${s.exit != null ? ` · out ${fmtNum(s.exit, MARKETS[s.symbol].digits)}` : ''}<br>
          No-edge odds ${pct(noEdgeOdds(s))} · logged ${pbDate(s.created)} ${timeLabel(s.created)}${s.ref ? ` · ref ${pbEsc(s.ref)}` : ''}</div>
        ${s.photo ? `<div class="pb-buttons"><button type="button" data-photo="${s.n}">VIEW CHART</button></div>` : ''}
      </div>` : '';
    return `<div class="pb-row ${cls}" data-row="${s.n}" role="button" tabindex="0" aria-expanded="${open}">
        <span class="n">#${s.n}</span>
        <span class="what">${s.symbol} ${s.side.toUpperCase()}${pbKind(s)}${s.test ? ' · TEST' : ''}<small>${how} · ${pbDate(s.closed || s.created)}${held}</small></span>
        <span class="r">${result ? fmtR(s.r) : '—'}</span>
      </div>${detail}`;
  });
  $('pbHistory').innerHTML = rows.join('') + (done.length > pb.rows ? `<button class="pb-more" type="button" id="pbMore">SHOW ${Math.min(12, done.length - pb.rows)} MORE</button>` : '');
}

function pbReads() {
  const st = pb.data.stats;
  const names = (g, kind) => (kind === 'market' ? MARKETS[g.key].name : kind === 'session' ? PB_SESSIONS[g.key] || g.key : `#${g.key}`);
  const rows = st.results < st.firstRead ? [] : [
    ...st.byTag.map((g) => [g, 'tag']), ...st.byMarket.map((g) => [g, 'market']), ...st.bySession.map((g) => [g, 'session']),
  ].filter(([g]) => g.n >= PLAYBOOK.tagRead);
  $('pbReadsCard').hidden = !rows.length;
  $('pbReads').innerHTML = rows.map(([g, kind]) => {
    const w = Math.min(50, (Math.abs(g.avg) / 2) * 50);
    const bar = g.avg >= 0 ? `left:50%;width:${w}%;background:var(--up)` : `left:${50 - w}%;width:${w}%;background:var(--down)`;
    return `<div class="pb-read"><span>${pbEsc(names(g, kind))} <small>${g.n}</small></span><span class="bar"><i style="${bar}"></i></span><b>${fmtR(g.avg, 2)}</b></div>`;
  }).join('');
}

// The AI tab's memory card: the Playbook, the record TCP AI will also learn from.
function pbMemory() {
  const d = pb.data;
  const record = d && d.setups ? d.setups.filter((s) => !s.test) : [];
  const results = record.filter(isResult).length;
  $('memPlaybook').textContent = record.length
    ? `It will also learn from the Playbook: ${record.length} setup${record.length === 1 ? '' : 's'} with Lewis's reasons, ${results} with a result.`
    : '';
}

// ----------------------------------------------------------------- the form
function pbSheet(open) {
  $('pbSheet').hidden = !open;
  document.body.style.overflow = open ? 'hidden' : '';
  if (!open) return;
  const f = pb.form;
  f.symbol = state.symbol;
  f.tags = [];
  f.photo = null;
  f.liveEntry = true;
  for (const id of ['pbSl', 'pbTp', 'pbNote', 'pbTagNew']) $(id).value = '';
  $('pbPhotoPreview').hidden = true;
  $('pbPhotoText').textContent = 'Add a screenshot of your chart';
  $('pbError').hidden = true;
  pbFormSync();
}

function pbFormSync() {
  const f = pb.form;
  for (const [id, key] of [['pbSymbol', 'symbol'], ['pbSide', 'side'], ['pbKind', 'kind'], ['pbExpiry', 'expiry']]) {
    for (const b of $(id).querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.v === String(f[key])));
  }
  $('pbExpiryField').hidden = f.kind === 'market';
  if (f.liveEntry) {
    const q = quoteOf(f.symbol);
    $('pbEntry').value = q && q.price > 0 ? q.price.toFixed(MARKETS[f.symbol].digits) : '';
    if (!q) loadMarket(f.symbol);
  }
  const suggestions = [...new Set([...(pb.data && pb.data.tags) || [], ...f.tags])];
  $('pbTags').innerHTML = suggestions.map((t) => `<button type="button" data-tag="${pbEsc(t)}" aria-pressed="${f.tags.includes(t)}">${pbEsc(t)}</button>`).join('');
  pbPlanLine();
  const live = pb.data && pb.data.mode === 'live';
  $('pbSubmitNote').textContent = live
    ? 'Posted to the Inner Circle with the time. The plan can’t be edited or deleted afterwards: only its stop can move, and it can be closed.'
    : 'Test mode: posted to the team group only, and left out of the record.';
}

const pbNum = (id) => parseFloat(String($(id).value).replace(/,/g, ''));
function pbInput() {
  const f = pb.form;
  return { symbol: f.symbol, side: f.side, kind: f.kind, entry: pbNum('pbEntry'), sl: pbNum('pbSl'), tp: pbNum('pbTp'), tags: f.tags, note: $('pbNote').value, expiry: f.kind === 'market' ? null : f.expiry };
}

function pbPlanLine() {
  const p = pbInput();
  const m = MARKETS[p.symbol];
  const risk = Math.abs(p.entry - p.sl);
  const reward = Math.abs(p.tp - p.entry);
  const ok = risk > 0 && reward > 0 && (p.side === 'buy' ? p.sl < p.entry && p.tp > p.entry : p.sl > p.entry && p.tp < p.entry);
  $('pbPlan').innerHTML = ok
    ? `<b>${fmtNum(reward / risk, 1)}R</b> target · risk <b>${fmtNum(risk, m.digits)}</b> · no-edge odds <b>${pct(risk / (risk + reward))}</b>`
    : `Enter the stop ${p.side === 'buy' ? 'below' : 'above'} the entry and the target ${p.side === 'buy' ? 'above' : 'below'} it.`;
}

function pbFormError(message) {
  $('pbError').textContent = message;
  $('pbError').hidden = !message;
  if (message) $('pbError').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function pbConfirm(text) {
  return new Promise((resolve) => {
    if (tg && tg.showConfirm && !demo) {
      try { tg.showConfirm(text, (ok) => resolve(!!ok)); return; } catch {}
    }
    resolve(window.confirm(text));
  });
}

function pbToast(text) {
  const t = $('toast');
  t.textContent = text;
  t.hidden = false;
  clearTimeout(pb.toastTimer);
  pb.toastTimer = setTimeout(() => { t.hidden = true; }, 4200);
}

// Phone screenshots can be large: the chart goes up as a JPEG at most 1,600 pixels across.
async function pbShrink(file) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86));
  } catch {
    return file.size <= 5e6 ? file : null;
  }
}

async function pbSubmit() {
  if (pb.busy) return;
  const input = pbInput();
  const d = state.data[input.symbol];
  const q = quoteOf(input.symbol);
  const checked = checkPlan(input, q ? { price: q.price, atr: d && d.atr, open: marketStatus(MARKETS[input.symbol], clock()).open } : null);
  if (checked.error) return pbFormError(checked.error);
  pbFormError('');
  const live = pb.data && pb.data.mode === 'live';
  if (!(await pbConfirm(live ? "Post this setup to the Inner Circle? It can't be edited or deleted afterwards." : 'Test mode: post this setup to the team group?'))) return;
  pb.busy = true;
  $('pbSubmit').disabled = true;
  $('pbSubmit').textContent = 'POSTING…';
  try {
    if (demo) {
      pbDemoAdd(checked.plan);
      pbToast('Demo: logged here only, nothing was posted.');
    } else {
      const form = new FormData();
      form.append('setup', JSON.stringify(input));
      if (pb.form.photo) form.append('photo', pb.form.photo, 'chart.jpg');
      const res = await pbSend('/api/playbook', form);
      pbToast(res.warning || `Logged as #${res.setup.n} and posted.`);
    }
    try { tg && tg.HapticFeedback.notificationOccurred('success'); } catch {}
    pbSheet(false);
    await pbLoad(true);
  } catch (err) {
    pbFormError(err.message);
  } finally {
    pb.busy = false;
    $('pbSubmit').disabled = false;
    $('pbSubmit').textContent = 'LOG AND POST';
  }
}

async function pbAct(n, action, price) {
  const words = { close: `Close #${n} at the market price now?`, cancel: `Cancel #${n} before it fills?`, breakeven: `Move #${n}'s stop to its entry?` };
  if (words[action] && !(await pbConfirm(words[action]))) return;
  try {
    if (demo) {
      pbDemoAct(n, action, price);
      pbToast('Demo: changed here only.');
    } else {
      const res = await pbSend(`/api/playbook/${n}`, { action, ...(price != null ? { price } : {}) });
      pbToast(res.message || { close: `#${n} closed.`, cancel: `#${n} cancelled.`, breakeven: `#${n}'s stop is at its entry.`, stop: `#${n}'s stop moved.` }[action]);
    }
    haptic();
    await pbLoad(true);
  } catch (err) {
    pbToast(err.message);
  }
}

async function pbPhoto(n) {
  try {
    let url = pb.photos[n];
    if (!url) {
      const res = await fetch(`/api/playbook/${n}/photo`, { headers: { authorization: 'tma ' + (tg ? tg.initData : '') } });
      if (!res.ok) throw new Error("The chart isn't available right now.");
      url = pb.photos[n] = URL.createObjectURL(await res.blob());
    }
    $('pbViewerImg').src = url;
    $('pbViewer').hidden = false;
  } catch (err) {
    pbToast(err.message);
  }
}

// ------------------------------------------------------------------- wiring
function pbInit() {
  $('pbNew').addEventListener('click', () => { haptic(); pbSheet(true); });
  $('pbClose').addEventListener('click', () => pbSheet(false));
  $('pbSheet').addEventListener('click', (e) => { if (e.target === $('pbSheet')) pbSheet(false); });
  for (const [id, key] of [['pbSymbol', 'symbol'], ['pbSide', 'side'], ['pbKind', 'kind'], ['pbExpiry', 'expiry']]) {
    $(id).addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      haptic();
      const f = pb.form;
      const value = key === 'expiry' ? Number(b.dataset.v) : b.dataset.v;
      if (key === 'symbol' && value !== f.symbol) { $('pbSl').value = ''; $('pbTp').value = ''; f.liveEntry = f.kind === 'market'; }
      if (key === 'kind') f.liveEntry = value === 'market';
      f[key] = value;
      pbFormSync();
    });
  }
  $('pbEntry').addEventListener('input', () => { pb.form.liveEntry = false; pbPlanLine(); });
  for (const id of ['pbSl', 'pbTp']) $(id).addEventListener('input', pbPlanLine);
  $('pbTags').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tag]');
    if (!b) return;
    const f = pb.form;
    const tag = b.dataset.tag;
    if (f.tags.includes(tag)) f.tags = f.tags.filter((t) => t !== tag);
    else if (f.tags.length < PLAYBOOK.maxTags) f.tags.push(tag);
    else return pbFormError(`Up to ${PLAYBOOK.maxTags} reasons.`);
    haptic();
    pbFormSync();
  });
  const addTag = () => {
    const tag = $('pbTagNew').value.replace(/\s+/g, ' ').trim().slice(0, 24);
    $('pbTagNew').value = '';
    if (!tag || pb.form.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
    if (pb.form.tags.length >= PLAYBOOK.maxTags) return pbFormError(`Up to ${PLAYBOOK.maxTags} reasons.`);
    pb.form.tags.push(tag);
    pbFormSync();
  };
  $('pbTagNew').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } });
  $('pbTagNew').addEventListener('blur', addTag);
  $('pbPhoto').addEventListener('change', async () => {
    const file = $('pbPhoto').files[0];
    if (!file) return;
    $('pbPhotoText').textContent = 'Preparing the picture…';
    const photo = await pbShrink(file);
    pb.form.photo = photo;
    $('pbPhotoText').textContent = photo ? 'Tap to change the picture' : 'That picture is too big: pick another.';
    $('pbPhotoPreview').hidden = !photo;
    if (photo) $('pbPhotoPreview').src = URL.createObjectURL(photo);
  });
  $('pbSubmit').addEventListener('click', pbSubmit);
  $('pbExport').addEventListener('click', pbExport);

  const clicks = (e) => {
    const photo = e.target.closest('[data-photo]');
    if (photo) return pbPhoto(Number(photo.dataset.photo));
    const act = e.target.closest('[data-act]');
    if (act) {
      const n = Number(act.dataset.n);
      if (act.dataset.act === 'stop') {
        const row = document.querySelector(`[data-stoprow="${n}"]`);
        row.hidden = !row.hidden;
        if (!row.hidden) row.querySelector('input').focus();
        return;
      }
      if (act.dataset.act === 'stop-go') {
        const value = parseFloat(String(document.querySelector(`[data-stoprow="${n}"] input`).value).replace(/,/g, ''));
        if (!(value > 0)) return pbToast('Enter the new stop.');
        return pbAct(n, 'stop', value);
      }
      return pbAct(n, act.dataset.act);
    }
    if (e.target.id === 'pbMore') { pb.rows += 12; return pbHistory(); }
    const row = e.target.closest('[data-row]');
    if (row) {
      const n = Number(row.dataset.row);
      if (pb.opened.has(n)) pb.opened.delete(n);
      else pb.opened.add(n);
      haptic();
      pbHistory();
    }
  };
  $('pbActive').addEventListener('click', clicks);
  $('pbHistoryCard').addEventListener('click', clicks);
  $('pbHistoryCard').addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-row]')) { e.preventDefault(); clicks(e); } });
  $('pbViewer').addEventListener('click', () => { $('pbViewer').hidden = true; });

  const cv = $('pbCurve');
  cv.tabIndex = 0;
  cv.addEventListener('pointermove', (e) => pbHover(pbPoint(e)));
  cv.addEventListener('pointerdown', (e) => pbHover(pbPoint(e)));
  cv.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') pbHover(null); });
  cv.addEventListener('focus', () => {
    const pts = pb.data && pb.data.stats ? pb.data.stats.curve : [];
    if (pts.length && pb.curve.hover == null) pbHover(pts.length - 1); // a tap has already picked its point
  });
  cv.addEventListener('blur', () => pbHover(null));
  cv.addEventListener('keydown', (e) => {
    const pts = pb.data && pb.data.stats ? pb.data.stats.curve : [];
    if (!pts.length || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    const i = pb.curve.hover == null ? pts.length - 1 : pb.curve.hover + (e.key === 'ArrowLeft' ? -1 : 1);
    pbHover(Math.max(0, Math.min(pts.length - 1, i)));
  });
  document.addEventListener('pointerdown', (e) => { if (pb.curve.hover != null && e.target !== cv) pbHover(null); });
  let resized = 0;
  window.addEventListener('resize', () => { clearTimeout(resized); resized = setTimeout(() => pb.data && pb.data.stats && pbDraw(1), 150); });
  pbLoad();
}

// -------------------------------------------------------------------- demo
// Made-up setups for design work (?demo). Their results sit near the no-edge odds on
// purpose, so a screenshot of the demo can never pass for a winning record.
function pbDemo() {
  if (pb.demo) return pb.demo;
  let a = 99;
  const random = () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
  const reasons = ['H4 zone', 'Fib pocket', 'Liquidity sweep', 'Rejection', 'Structure break', 'Reclaim', 'Session open'];
  const notes = ['Swept the Asia low into the zone, then a rejection candle on the 15-minute chart.',
    'Retest of the broken high, with the reclaim holding on the close.',
    'Pullback into the pocket of the last impulse after a sweep of the previous day low.',
    'London open ran the stops above the Asia high and rejected the zone.'];
  const results = [2, -1, -1, 2, -1, -1, 0, 2, -1, -1, -1, 2, -1, 2, -1, -1, 1.4, -1, 2, -1, -1, 2, -1, -1];
  const now = clock();
  const setups = results.map((r, i) => {
    const symbol = random() < 0.72 ? 'XAUUSD' : 'BTCUSD';
    const side = random() < 0.55 ? 'buy' : 'sell';
    const px = symbol === 'XAUUSD' ? 3700 + random() * 80 : Math.round(62000 + random() * 3000);
    const risk = symbol === 'XAUUSD' ? 8 + Math.round(random() * 10) : 250 + Math.round(random() * 250);
    const dir = side === 'buy' ? 1 : -1;
    const created = now - (results.length - i) * 17 * 3600 - Math.round(random() * 3600);
    const entry = Math.round(px * 100) / 100;
    const s = {
      n: i + 1, symbol, side, kind: 'market', entry, sl: entry - dir * risk, tp: entry + dir * risk * 2, created, expires: null,
      tags: reasons.filter(() => random() < 0.35).slice(0, 4), note: notes[i % notes.length], author: 'Lewis', photo: false,
      filled: created, fill: entry, test: false, ref: Math.floor(random() * 0xffffffff).toString(16).padStart(8, '0'),
      engine: { sessions: random() < 0.6 ? ['london'] : ['newyork'], vol: random(), trend: random(), noEdge: 0.333 },
    };
    const reason = r === 2 ? 'tp' : r === -1 ? 'sl' : r === 0 ? 'be' : 'trail';
    s.stop = reason === 'be' ? entry : reason === 'trail' ? entry + dir * risk * r : s.sl;
    return { ...s, status: r > 0 ? 'won' : r < 0 ? 'lost' : 'scratch', closed: created + 3600 + Math.round(random() * 5 * 3600), exit: entry + dir * risk * r, r, reason };
  });
  const gold = quoteOf('XAUUSD');
  const btcNow = quoteOf('BTCUSD');
  const gp = gold ? gold.price : 3742.5;
  const bp = btcNow ? btcNow.price : 64000;
  const cents = (v) => Math.round(v * 100) / 100;
  setups.push({
    n: 25, symbol: 'XAUUSD', side: 'buy', kind: 'market', entry: cents(gp - 4), sl: cents(gp - 16), stop: cents(gp - 16),
    tp: cents(gp + 20), created: now - 2 * 3600, expires: null, tags: ['Liquidity sweep', 'H4 zone'], note: notes[0],
    author: 'Lewis', photo: false, status: 'open', filled: now - 2 * 3600, fill: cents(gp - 4), closed: null, exit: null,
    r: null, reason: null, test: false, ref: '4c1e9a07', engine: { sessions: ['london', 'newyork'], vol: 0.6, trend: 0.4, noEdge: 0.333 },
  });
  setups.push({
    n: 26, symbol: 'BTCUSD', side: 'sell', kind: 'limit', entry: Math.round(bp + 600), sl: Math.round(bp + 1100), stop: Math.round(bp + 1100), tp: Math.round(bp - 400),
    created: now - 1800, expires: now + 22 * 3600, tags: ['Fib pocket'], note: notes[2], author: 'Lewis', photo: false, status: 'pending',
    filled: null, fill: null, closed: null, exit: null, r: null, reason: null, test: false, ref: 'b27f10d3',
    engine: { sessions: ['london'], vol: 0.4, trend: 0.3, noEdge: 0.333 },
  });
  setups.reverse();
  pb.demo = { ready: true, mode: 'live', canPost: true, setups, tags: reasons, record: { entries: 60, head: '9e03c2b1' } };
  pb.demo.stats = recordStats(setups);
  return pb.demo;
}

function pbDemoAdd(plan) {
  const d = pbDemo();
  const s = { ...openSetup(plan, clock()), n: Math.max(...d.setups.map((x) => x.n)) + 1, author: 'Demo', photo: false, test: false, ref: 'demo0000',
    engine: { sessions: [], vol: null, trend: null, noEdge: noEdgeOdds(plan) } };
  d.setups.unshift(s);
  d.stats = recordStats(d.setups);
}

function pbDemoAct(n, action, price) {
  const d = pbDemo();
  const i = d.setups.findIndex((s) => s.n === n);
  const s = d.setups[i];
  const q = quoteOf(s.symbol);
  const now = clock();
  const next = action === 'close' ? closeSetup(s, now, q.price) : action === 'cancel' ? cancelSetup(s, now)
    : moveSetupStop(s, now, action === 'breakeven' ? s.fill : price);
  d.setups[i] = next.setup;
  d.stats = recordStats(d.setups);
}
