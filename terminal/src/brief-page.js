// TCP Quant Terminal: the page's session briefs, on the AI tab. build.mjs puts the shared maths
// (lib.js, playbook-lib.js, brief-lib.js) and the Playbook's page code in front of this file and
// app.js after it, all in one script. Nothing here runs on load: the functions use app.js's
// helpers ($, call, tg, demo, quoteOf, ...) and the Playbook's (pbSend, pbToast, pbConfirm,
// pbEsc) when they're called, and app.js calls brInit() once the member is signed in.

const br = {
  data: null, // the last answer from /api/briefs
  at: 0,
  loading: null,
  form: { session: null, symbol: 'XAUUSD', charts: [], note: '' }, // charts: [{ blob, url }]
  step: 'charts', // the sheet: charts, reading or draft
  brief: null, // the brief being checked
  edit: null, // the draft as edited: { headline, bias, reason, zones, plan, chart, lesson }
  busy: false,
  readStart: 0,
  thumbs: {}, // 'id:k' -> object URL of a chart the Worker kept
  photos: {}, // brief id -> object URL of its posted chart
  opened: new Set(), // history rows showing their detail
  demo: null,
};
const BR_BIAS = { long: 'Long', short: 'Short', neutral: 'Neutral' };
const brSessionName = (id) => (briefSession(id) || { name: id }).name;
const brPrice = (symbol, v) => fmtNum(v, MARKETS[symbol].digits);
const brRange = (symbol, z) => (z.low === z.high ? brPrice(symbol, z.low) : `${brPrice(symbol, z.low)}–${brPrice(symbol, z.high)}`);
const brZoneName = (z) => z.label || [z.tf, BRIEF.kinds[z.kind]].filter(Boolean).join(' ');
const brUntil = (t) => { const s = t - clock(); return s > 0 ? `in ${fmtDuration(s)}` : `${fmtDuration(-s)} ago`; };

// ------------------------------------------------------------------- data
function brLoad(force = false) {
  if (!force && br.data && !br.data.error && clock() - br.at < 30) return Promise.resolve();
  if (br.loading) return force ? br.loading.then(() => brLoad(true)) : br.loading;
  br.loading = (async () => {
    try {
      br.data = demo ? brDemo() : await call('/api/briefs');
      br.at = clock();
    } catch (err) {
      if (!br.data || br.data.error) br.data = { error: err.message };
    }
    brRender();
    renderChartZones();
  })().finally(() => { br.loading = null; });
  return br.loading;
}

const brPoster = () => !!(br.data && br.data.ready && br.data.canPost);

function brFab() {
  $('brNew').hidden = !(brPoster() && !$('ai').hidden);
  document.body.classList.toggle('with-fab', !$('brNew').hidden || !$('pbNew').hidden);
}

// The newest posted brief whose session is still to come or running, for the Markets chart.
function brActive(symbol) {
  const d = br.data;
  const b = d && d.briefs && d.briefs.find((x) => x.status === 'posted' && x.symbol === symbol && x.closes > clock() && x.final);
  return b ? [b] : [];
}

// ----------------------------------------------------------------- render
function brRender() {
  const d = br.data;
  brFab();
  brMemory();
  if (!d) return;
  if (d.error || !d.ready) {
    $('brMode').hidden = true;
    $('brNext').hidden = true;
    $('brRecordCard').hidden = true;
    $('brHistoryCard').hidden = true;
    $('brList').innerHTML = `<p class="pb-empty card-empty">${pbEsc(d.error || 'Session briefs start soon: before each session, Lewis\'s charts read by TCP AI, the zones to watch and a plan, and every zone scored afterwards.')}</p>`;
    return;
  }
  $('brMode').hidden = !d.canPost;
  $('brMode').textContent = d.mode === 'live' ? 'Live' : 'Test mode';
  $('brMode').className = `state ${d.mode === 'live' ? 'live' : 'testing'}`;
  brNext();
  brList();
  brHistory();
  brRecord();
  brLive();
}

function brNext() {
  const w = briefDefault(clock());
  $('brNext').hidden = !w;
  if (!w) return;
  const s = briefSession(w.id);
  const has = br.data.briefs.some((b) => b.session === w.id && b.day === w.key && b.status === 'posted');
  $('brNextIcon').textContent = s.icon;
  $('brNextName').textContent = `${s.name}${w.weekly ? ' · week ahead' : ''}`;
  $('brNextWhen').dataset.open = w.open;
  $('brNextTag').textContent = has ? 'brief out' : br.data.canPost ? 'your brief' : 'brief before the open';
  $('brAsk').hidden = !br.data.canPost || has;
  $('brAsk').innerHTML = `Charts to send: ${briefAsk(w).map((t) => `<b>${t}</b>`).join(' ')}`;
}

// Cards for today's briefs: running or still to come, plus the poster's drafts; the rest are history.
function brList() {
  const d = br.data;
  const now = clock();
  const cards = d.briefs.filter((b) => (b.status === 'posted' && b.closes > now - 6 * 3600) || (d.canPost && ['reading', 'draft', 'failed'].includes(b.status)));
  if (!d.briefs.length) {
    $('brList').innerHTML = `<p class="pb-empty card-empty">${d.canPost
      ? d.mode === 'live' ? 'No briefs yet. Tap + SEND CHARTS before a session: TCP AI reads them and you check the draft before it posts.'
        : 'Test mode: briefs you post go to the team group only. Tap + SEND CHARTS to try it. Switch BRIEF_MODE to live when you are ready.'
      : 'Before each session, Lewis\'s brief lands here and in the Inner Circle: the zones to watch, the plan, and the odds of price reaching each zone.'}</p>`;
    return;
  }
  $('brList').innerHTML = cards.map((b) => (b.status === 'posted' ? brCard(b) : brDraftCard(b))).join('');
}

function brDraftCard(b) {
  const s = briefSession(b.session);
  const what = b.status === 'reading' ? 'TCP AI is reading your charts…' : b.status === 'failed' ? pbEsc(b.error || 'The read failed.') : 'Ready for you to check.';
  return `<div class="card br-card draft">
    <div class="br-top"><span class="br-icon">${s.icon}</span><b>${s.name}</b><span class="br-sym">${b.symbol}</span>
      <span class="pb-state ${b.status === 'reading' ? 'pending' : 'test'}">${b.status === 'reading' ? 'READING' : b.status === 'failed' ? 'NOT READ' : 'DRAFT'}</span></div>
    <p class="br-reason">${what}</p>
    <div class="pb-buttons"><button type="button" class="gold" data-open="${b.id}"${b.status === 'reading' ? ' disabled' : ''}>${b.status === 'failed' ? 'TRY AGAIN OR WRITE IT' : 'CHECK AND POST'}</button></div>
  </div>`;
}

function brCard(b) {
  const s = briefSession(b.session);
  const f = b.final;
  const now = clock();
  const state = b.review ? 'done' : now < b.opens ? 'soon' : now < b.closes ? 'live' : 'closed';
  const word = { soon: `OPENS ${brUntil(b.opens).toUpperCase()}`, live: 'SESSION OPEN', closed: 'SCORING', done: 'SCORED' }[state];
  const zones = brZones(b).map((z, i) => `<div class="br-zone ${z.kind}">
      <i aria-hidden="true"></i><div><b>${brRange(b.symbol, z)}</b><span>${pbEsc(brZoneName(z))}${z.why ? ` · ${pbEsc(z.why)}` : ''}</span></div>
      <em data-zone="${b.id}:${i}" class="${brZoneStatus(b, z).cls}">${brZoneStatus(b, z).text}</em></div>`).join('');
  const r = b.review;
  return `<div class="card br-card${b.test ? ' test' : ''}">
    <div class="br-top"><span class="br-icon">${s.icon}</span><b>${s.name}</b><span class="br-sym">${b.symbol}</span>
      <span class="pb-state ${state === 'live' ? 'open' : state === 'soon' ? 'pending' : ''}" data-when="${b.id}">${word}</span>${b.test ? '<span class="pb-state test">TEST</span>' : ''}</div>
    <h3 class="br-headline">${pbEsc(f.headline)}</h3>
    <p class="br-reason"><span class="br-bias ${f.bias}">${f.bias.toUpperCase()}</span>${pbEsc(f.reason || '')}</p>
    <div class="br-zones">${zones}</div>
    <div class="br-plan"><b>PLAN</b><ul>${f.plan.map((l) => `<li>${pbEsc(l)}</li>`).join('')}</ul></div>
    ${r ? `<div class="br-wrap">${r.counted ? `Reached <b>${r.reached} of ${r.counted}</b> · a random walk would reach <b>${fmtNum(r.expected, 1)}</b>` : 'Price was inside every zone when it went out.'}</div>` : ''}
    <div class="pb-meta">${b.ai ? `Charts read by TCP AI, checked by ${pbEsc(b.author)}` : `By ${pbEsc(b.author)}`} · ${timeLabel(b.posted)} · brief #${b.id}</div>
    ${b.photo ? `<div class="pb-buttons"><button type="button" data-chart="${b.id}">VIEW CHART</button></div>` : ''}
  </div>`;
}

// A posted brief's zones, highest first: once the session is scored, with what price did at each.
const brZones = (b) => [...(b.review ? b.review.zones : b.final.zones)].sort((x, y) => y.high - x.high);

// Where a zone stands: after the session, the review; before and during it, whether price has
// reached it since the brief went out (15-minute bars and the live price), else the odds it will
// before the close from here, if price moves at random.
function brZoneStatus(b, z) {
  const r = z.review;
  if (r) {
    if (r.reached === null) return { text: 'was there', cls: '' };
    if (!r.reached) return { text: `not reached · ${pct(z.odds)}`, cls: 'br-miss' };
    return { text: `✓ ${brPrice(b.symbol, r.away)} back · ${brPrice(b.symbol, r.through)} on`, cls: 'br-hit' };
  }
  const d = state.data[b.symbol];
  const q = quoteOf(b.symbol);
  const now = clock();
  if (!d || d.error || !q || !(q.price > 0)) return { text: `${pct(z.odds)} to reach`, cls: '' };
  const bars = (d.bars || []).map(([t, o, h, l, c]) => ({ t, o, h, l, c }));
  const seen = reviewZone(z, bars, { from: b.posted + 900, to: now + 900, price: b.price, atr: null, step: 900 });
  if (seen.reached === null) return { text: 'here at the post', cls: '' };
  if (seen.reached || zoneSide(z, q.price) === 'inside' || (zoneSide(z, b.price) === 'below' ? q.price <= z.high : q.price >= z.low)) return { text: '✓ reached', cls: 'br-hit' };
  if (now >= b.closes || !d.engine) return { text: `${pct(z.odds)} to reach`, cls: '' };
  const odds = zoneOdds(z, q.price, varianceBetween(d.engine.profile, now, b.closes));
  return { text: `${pct(odds)} to reach`, cls: '' };
}

// Every second on the AI tab: countdowns and each zone's live odds.
function brLive() {
  const d = br.data;
  if (!d || !d.briefs || $('ai').hidden) return;
  const w = $('brNextWhen');
  if (w.dataset.open) {
    const s = Number(w.dataset.open) - clock();
    w.textContent = s > 0 ? `opens in ${fmtDuration(s)}` : `opened ${fmtDuration(-s)} ago`;
  }
  for (const b of d.briefs) {
    if (b.status !== 'posted' || !b.final) continue;
    brZones(b).forEach((z, i) => {
      const el = document.querySelector(`[data-zone="${b.id}:${i}"]`);
      if (!el) return;
      const st = brZoneStatus(b, z);
      if (el.textContent !== st.text) el.textContent = st.text;
      el.className = st.cls;
    });
  }
}

function brHistory() {
  const d = br.data;
  const now = clock();
  const old = d.briefs.filter((b) => b.status === 'posted' && b.closes <= now - 6 * 3600);
  $('brHistoryCard').hidden = !old.length;
  if (!old.length) return;
  $('brCount').textContent = `${old.length} earlier`;
  $('brHistory').innerHTML = old.slice(0, 20).map((b) => {
    const s = briefSession(b.session);
    const r = b.review;
    const open = br.opened.has(b.id);
    return `<div class="pb-row br-row" data-brrow="${b.id}" role="button" tabindex="0" aria-expanded="${open}">
        <span class="n">${s.icon}</span>
        <span class="what">${s.name} · ${b.symbol}${b.test ? ' · TEST' : ''}<small>${pbEsc(b.final.headline)} · ${pbDate(b.posted)}</small></span>
        <span class="r">${r ? `${r.reached}/${r.counted}` : '—'}<small>${r ? 'reached' : 'not scored'}</small></span>
      </div>${open ? `<div class="pb-detail">${brCard(b).replace(/^<div class="card br-card[^"]*">/, '<div class="br-inline">')}</div>` : ''}`;
  }).join('');
}

function brRecord() {
  const st = br.data.stats;
  $('brRecordCard').hidden = !st || !st.zones;
  if (!st || !st.zones) return;
  $('brBriefs').textContent = st.briefs;
  $('brZoneCount').textContent = st.zones;
  $('brReached').innerHTML = `${st.reached}<small>of ${st.zones}</small>`;
  $('brTurn').innerHTML = st.turn.n ? `${st.turn.avg > 0 ? '+' : st.turn.avg < 0 ? '−' : ''}${fmtNum(Math.abs(st.turn.avg), 2)}<small>ATR</small>` : '—';
  const v = brVerdict(st);
  $('brVerdict').className = `pb-verdict ${v.cls}`;
  $('brVerdict').innerHTML = `<span class="icon" aria-hidden="true">${v.icon}</span><div><b>${v.title}</b><span>${v.text}</span></div>` +
    (v.progress != null ? `<div class="pb-progress"><i style="width:${Math.round(v.progress * 100)}%"></i></div>` : '');
  $('brReach').innerHTML = `Reached <b>${st.reached} of ${st.zones}</b> (${pct(st.reach.rate)}), where a random walk would reach <b>${fmtNum(st.expected, 1)}</b> (${pct(st.reach.noEdge)}).`;
  const rows = st.turn.n < st.firstRead ? [] : [...st.byKind.map((g) => [g, BRIEF.kinds[g.key]]), ...st.bySession.map((g) => [g, brSessionName(g.key)])].filter(([g]) => g.turns >= 5);
  $('brReads').hidden = !rows.length;
  $('brReads').innerHTML = rows.map(([g, name]) => {
    const w = Math.min(50, Math.abs(g.turn) * 100);
    const bar = g.turn >= 0 ? `left:50%;width:${w}%;background:var(--up)` : `left:${50 - w}%;width:${w}%;background:var(--down)`;
    return `<div class="pb-read"><span>${pbEsc(name)} <small>${g.reached}/${g.zones}</small></span><span class="bar"><i style="${bar}"></i></span><b>${g.turn > 0 ? '+' : ''}${fmtNum(g.turn, 2)}</b></div>`;
  }).join('');
}

function brVerdict(st) {
  const n = st.turn.n;
  if (st.verdict === 'collecting') {
    return { cls: 'collecting', icon: n, progress: n / st.firstRead, title: `Collecting: ${n} of ${st.firstRead} zones reached`,
      text: `The first read comes at ${st.firstRead} reached zones. Until then, any average is mostly luck.` };
  }
  const band = `${fmtNum(st.turn.band[0], 2)} to ${fmtNum(st.turn.band[1], 2)} ATR`;
  if (st.verdict === 'turning') return { cls: 'ahead', icon: '▲', title: 'Zones turn price', text: `After ${n} reached zones the whole band (${band}) is above zero: price has gone back from them more than chance explains.` };
  if (st.verdict === 'breaking') return { cls: 'behind', icon: '▼', title: 'Price goes through', text: `After ${n} reached zones the whole band (${band}) is below zero: price has gone on through them more than back.` };
  return { cls: 'unclear', icon: '≈', title: 'Too close to call', text: `After ${n} reached zones the band (${band}) still spans zero: no sign yet that the zones turn price more than chance.` };
}

// The memory card: what TCP AI reads before each brief, and the Playbook it will learn from.
function brMemory() {
  const m = br.data && br.data.memory;
  $('memCharts').textContent = m ? m.charts : 0;
  $('memLessons').textContent = m ? m.lessons : 0;
  $('memZones').textContent = br.data && br.data.stats ? br.data.stats.zones : 0;
  $('brTeach').hidden = !brPoster();
  $('brExport').hidden = !brPoster();
}

// ------------------------------------------------------------- the sheet
async function brShrink(file) {
  // Charts go up as JPEGs at most 2,576 pixels on the long side: the most TCP AI reads, and
  // enough for the panel's small text.
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2576 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  } catch {
    return file.size <= 8e6 ? file : null;
  }
}

function brSheet(open, { session = null, brief = null } = {}) {
  $('brSheet').hidden = !open;
  document.body.style.overflow = open ? 'hidden' : '';
  if (!open) return;
  if (brief) return brOpenDraft(brief);
  const f = br.form;
  for (const c of f.charts) URL.revokeObjectURL(c.url);
  const w = briefDefault(clock());
  Object.assign(f, { session: session || (w && w.id) || 'london', symbol: state.symbol, charts: [], note: '' });
  $('brNote').value = '';
  br.brief = null;
  br.edit = null;
  brStep('charts');
}

function brStep(step) {
  br.step = step;
  for (const s of ['charts', 'reading', 'draft']) $(`brStep_${s}`).hidden = s !== step;
  $('brSheetTitle').textContent = step === 'draft' ? `${brSessionName(br.brief ? br.brief.session : br.form.session)} brief` : 'Session brief';
  $('brError').hidden = true;
  if (step === 'charts') brChartsForm();
  if (step === 'draft') brDraftForm();
  $('brSheet').querySelector('.sheet-body').scrollTop = 0;
}

function brChartsForm() {
  const f = br.form;
  const d = br.data || {};
  const now = clock();
  $('brSession').innerHTML = BRIEF.sessions.map((s) => {
    const w = briefWindow(s.id, now);
    const when = !w ? '' : w.open > now ? ` · ${fmtDuration(w.open - now)}` : ' · open';
    return `<button type="button" data-v="${s.id}" aria-pressed="${f.session === s.id}">${s.name}${when}</button>`;
  }).join('');
  for (const b of $('brSymbol').querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.v === f.symbol));
  const w = briefWindow(f.session, now);
  $('brAskLine').innerHTML = `TCP AI asks for ${briefAsk(w).map((t) => `<b>${t}</b>`).join(' ')}: pick them all at once, in any order.`;
  $('brThumbs').innerHTML = f.charts.map((c, i) => `<figure><img src="${c.url}" alt="Chart ${i + 1}"><button type="button" data-drop="${i}" aria-label="Remove chart ${i + 1}">×</button><figcaption>${i + 1}</figcaption></figure>`).join('');
  $('brPickText').textContent = f.charts.length ? `${f.charts.length} chart${f.charts.length === 1 ? '' : 's'} · tap to add more` : 'Add your chart screenshots';
  const ai = d.ai || demo;
  $('brRead').textContent = ai ? 'READ MY CHARTS' : 'KEEP THE CHARTS AND WRITE IT';
  $('brRead').disabled = !f.charts.length || br.busy;
  const me = d.me;
  $('brReadNote').textContent = ai
    ? `TCP AI reads them with the terminal's numbers and drafts the brief. Nothing posts until you've checked it.${me ? ` ${me.readsToday} of ${me.limit} reads today.` : ''}`
    : 'TCP AI is off (no ANTHROPIC_API_KEY): the charts are kept, and you write the brief.';
}

async function brAddCharts(files) {
  const f = br.form;
  const room = BRIEF.maxCharts - f.charts.length;
  if (files.length > room) pbToast(`Up to ${BRIEF.maxCharts} charts: the first ${Math.max(0, room)} were added.`);
  $('brPickText').textContent = 'Preparing the pictures…';
  for (const file of [...files].slice(0, Math.max(0, room))) {
    const blob = await brShrink(file);
    if (blob) f.charts.push({ blob, url: URL.createObjectURL(blob) });
  }
  brChartsForm();
}

async function brSubmit() {
  if (br.busy || !br.form.charts.length) return;
  const f = br.form;
  f.note = $('brNote').value;
  br.busy = true;
  br.readStart = clock();
  const ai = (br.data && br.data.ai) || demo;
  if (ai) brStep('reading');
  try {
    let res;
    if (demo) {
      await new Promise((r) => setTimeout(r, 2400));
      res = { brief: brDemoRead() };
    } else {
      const form = new FormData();
      form.append('brief', JSON.stringify({ symbol: f.symbol, session: f.session, note: f.note }));
      f.charts.forEach((c, i) => form.append('chart', c.blob, `chart-${i + 1}.jpg`));
      res = await pbSend('/api/briefs', form);
    }
    if (res.warning) pbToast(res.warning);
    br.brief = res.brief;
    br.edit = null;
    brStep('draft');
    brLoad(true);
  } catch (err) {
    brStep('charts');
    brError(err.message);
  } finally {
    br.busy = false;
    if (br.step === 'charts') brChartsForm();
  }
}

// The reading screen's clock.
function brReadingTick() {
  if (br.step !== 'reading' || $('brSheet').hidden) return;
  const s = clock() - br.readStart;
  $('brElapsed').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  $('brReadingWhat').textContent = `TCP AI is reading your ${br.form.charts.length} chart${br.form.charts.length === 1 ? '' : 's'}`;
}

async function brOpenDraft(id) {
  const b = br.data && br.data.briefs.find((x) => x.id === id);
  if (!b) return pbToast('That brief is gone.');
  br.brief = b;
  br.edit = null;
  br.form.charts = [];
  brStep('draft');
}

// The draft as the poster edits it: TCP AI's, or empty when there's no read.
function brEditOf(b) {
  const d = b.draft || { headline: '', bias: 'neutral', reason: '', zones: [], plan: [], chart: 1, warnings: [] };
  return {
    headline: d.headline, bias: d.bias, reason: d.reason,
    zones: d.zones.map((z) => ({ kind: z.kind, low: z.low, high: z.high, tf: z.tf || '', label: z.label || '', why: z.why || '' })),
    plan: d.plan.join('\n'), chart: d.chart || 1, lesson: '',
  };
}

function brDraftForm() {
  const b = br.brief;
  br.edit ||= brEditOf(b);
  const e = br.edit;
  const failed = b.status === 'failed';
  $('brFailed').hidden = !failed;
  $('brFailedText').textContent = b.error || '';
  const warn = (b.draft && b.draft.warnings) || [];
  $('brWarnings').hidden = !warn.length;
  $('brWarnings').innerHTML = warn.map((w) => `<div>⚠︎ ${pbEsc(w)}</div>`).join('');
  $('brReadCard').hidden = !b.read;
  if (b.read) {
    const r = b.read;
    $('brReadBody').innerHTML = [
      ...r.charts.map((c) => `<div class="br-readrow"><b>${c.chart ?? '?'} · ${pbEsc(c.timeframe)}</b><span>${c.trend}${c.price ? ` · ${brPrice(b.symbol, c.price)}` : ''} — ${pbEsc(c.summary)}</span></div>`),
      r.panel.length ? `<div class="br-panel">${r.panel.map((p) => `<div><span>${pbEsc(p.section ? `${p.section} · ` : '')}${pbEsc(p.row)}</span><b>${pbEsc(p.value)}</b></div>`).join('')}</div>` : '',
      r.unreadable.length ? `<div class="br-readrow"><b>Couldn't read</b><span>${r.unreadable.map(pbEsc).join('; ')}</span></div>` : '',
      `<div class="pb-meta">${pbEsc(b.model || '')}${b.cost != null ? ` · this read cost about $${b.cost.toFixed(2)}` : ''}${r.confidence ? ` · confidence ${r.confidence}` : ''}</div>`,
    ].join('');
  }
  $('brHeadline').value = e.headline;
  for (const x of $('brBias').querySelectorAll('button')) x.setAttribute('aria-pressed', String(x.dataset.v === e.bias));
  $('brReason').value = e.reason;
  brZoneRows();
  $('brPlan').value = e.plan;
  $('brLesson').value = e.lesson;
  brPostCharts();
  const live = br.data && br.data.mode === 'live';
  $('brPost').textContent = live ? 'POST TO THE INNER CIRCLE' : 'POST TO THE TEAM (TEST)';
  $('brPostNote').textContent = live
    ? 'Posted to the Inner Circle with the zones\' odds. After the session, each zone is scored and the wrap is posted as a reply.'
    : 'Test mode: posted to the team group only, and left out of the record.';
}

function brZoneRows() {
  const b = br.brief;
  const e = br.edit;
  $('brZones').innerHTML = e.zones.map((z, i) => `<div class="br-zrow ${z.kind}" data-i="${i}">
      <select data-f="kind" aria-label="Kind of zone ${i + 1}">${Object.entries(BRIEF.kinds).map(([k, v]) => `<option value="${k}"${k === z.kind ? ' selected' : ''}>${v}</option>`).join('')}</select>
      <input data-f="low" inputmode="decimal" value="${z.low ?? ''}" aria-label="Low of zone ${i + 1}" placeholder="Low">
      <input data-f="high" inputmode="decimal" value="${z.high ?? ''}" aria-label="High of zone ${i + 1}" placeholder="High">
      <button type="button" class="br-x" data-zdrop="${i}" aria-label="Remove zone ${i + 1}">×</button>
      <input data-f="label" value="${pbEsc(z.label)}" maxlength="40" placeholder="Name, e.g. 4H demand" aria-label="Name of zone ${i + 1}">
      <input data-f="why" value="${pbEsc(z.why)}" maxlength="200" placeholder="Why it matters" aria-label="Why zone ${i + 1} matters">
      <small data-zodds="${i}">${brEditOdds(b, z)}</small>
    </div>`).join('') || '<p class="fine" style="margin:0 0 8px">No zones yet: add the ones that matter this session.</p>';
  $('brAddZone').hidden = e.zones.length >= BRIEF.maxZones;
}

// A zone's odds while it's edited: from the live price to the session's close, moving at random.
function brEditOdds(b, z) {
  const low = parseFloat(String(z.low).replace(/,/g, ''));
  const high = parseFloat(String(z.high === '' ? z.low : z.high).replace(/,/g, ''));
  const d = state.data[b.symbol];
  const q = quoteOf(b.symbol);
  if (!(low > 0) || !(high > 0) || !d || !d.engine || !q) return '';
  const zone = { low: Math.min(low, high), high: Math.max(low, high) };
  if (zoneSide(zone, q.price) === 'inside') return 'price is in it now';
  const odds = zoneOdds(zone, q.price, varianceBetween(d.engine.profile, clock(), b.closes));
  return `${pct(odds)} chance price reaches it before ${brSessionName(b.session)} closes, moving at random`;
}

function brPostCharts() {
  const b = br.brief;
  const e = br.edit;
  const local = br.form.charts;
  const count = local.length || (b.charts ? b.charts.length : 0);
  $('brChartPick').innerHTML = Array.from({ length: count }, (_, i) => {
    const k = i + 1;
    const url = local[i] ? local[i].url : br.thumbs[`${b.id}:${k}`] || '';
    return `<button type="button" data-k="${k}" aria-pressed="${e.chart === k}">${url ? `<img src="${url}" alt="Chart ${k}">` : `<span>${k}</span>`}</button>`;
  }).join('');
  $('brChartField').hidden = !count;
  if (!local.length && !demo && b.charts) {
    for (const c of b.charts) {
      const key = `${b.id}:${c.k}`;
      if (!c.kept || br.thumbs[key]) continue;
      br.thumbs[key] = '';
      fetch(`/api/briefs/${b.id}/chart/${c.k}`, { headers: { authorization: 'tma ' + (tg ? tg.initData : '') } })
        .then((r) => (r.ok ? r.blob() : null)).then((blob) => {
          if (!blob) return;
          br.thumbs[key] = URL.createObjectURL(blob);
          if (br.brief && br.brief.id === b.id && br.step === 'draft') brPostCharts();
        }).catch(() => {});
    }
  }
}

// Reads the editor into br.edit.
function brCollect() {
  const e = br.edit;
  e.headline = $('brHeadline').value;
  e.reason = $('brReason').value;
  e.plan = $('brPlan').value;
  e.lesson = $('brLesson').value;
  e.zones = [...$('brZones').querySelectorAll('.br-zrow')].map((row) => {
    const get = (k) => row.querySelector(`[data-f="${k}"]`).value;
    const num = (v) => (String(v).trim() === '' ? '' : parseFloat(String(v).replace(/,/g, '')));
    return { kind: get('kind'), low: num(get('low')), high: num(get('high')), label: get('label'), why: get('why'), tf: '' };
  }).map((z, i) => ({ ...z, tf: (br.edit.zones[i] && br.edit.zones[i].tf) || '' }));
  return e;
}

async function brPost() {
  if (br.busy) return;
  const e = brCollect();
  const b = br.brief;
  if (!e.headline.trim()) return brError('Add a headline.');
  if (!e.zones.length) return brError('Add at least one zone.');
  if (!e.plan.trim()) return brError('Write the plan.');
  const live = br.data && br.data.mode === 'live';
  if (!(await pbConfirm(live ? `Post the ${brSessionName(b.session)} brief to the Inner Circle?` : 'Test mode: post this brief to the team group?'))) return;
  br.busy = true;
  $('brPost').disabled = true;
  $('brPost').textContent = 'POSTING…';
  try {
    const body = { headline: e.headline, bias: e.bias, reason: e.reason, zones: e.zones.map((z) => ({ ...z, high: z.high === '' ? z.low : z.high })), plan: e.plan, chart: e.chart, lesson: e.lesson };
    const res = demo ? { brief: brDemoPost(b, body) } : await pbSend(`/api/briefs/${b.id}/post`, body);
    pbToast(res.warning || `Brief #${res.brief.id} posted.`);
    try { tg && tg.HapticFeedback.notificationOccurred('success'); } catch {}
    brSheet(false);
    await brLoad(true);
  } catch (err) {
    brError(err.message);
  } finally {
    br.busy = false;
    $('brPost').disabled = false;
    if (br.step === 'draft') brDraftForm();
  }
}

async function brDiscard() {
  const b = br.brief;
  if (!(await pbConfirm('Drop this draft? Nothing is posted.'))) return;
  try {
    if (demo) brDemoDrop(b.id);
    else await pbSend(`/api/briefs/${b.id}/discard`, {});
    brSheet(false);
    brLoad(true);
  } catch (err) {
    brError(err.message);
  }
}

async function brRetry() {
  const b = br.brief;
  br.busy = true;
  br.readStart = clock();
  brStep('reading');
  try {
    const res = demo ? { brief: brDemoRead() } : await pbSend(`/api/briefs/${b.id}/read`, {});
    br.brief = res.brief;
    br.edit = null;
    brStep('draft');
    brLoad(true);
  } catch (err) {
    brStep('draft');
    brError(err.message);
  } finally {
    br.busy = false;
  }
}

function brError(message) {
  $('brError').textContent = message;
  $('brError').hidden = !message;
  if (message) $('brError').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// ------------------------------------------------------------- teach
function brTeachSheet(open) {
  $('brTeachSheet').hidden = !open;
  document.body.style.overflow = open ? 'hidden' : '';
  if (open) brTeachRender();
}

function brTeachRender() {
  const me = (br.data && br.data.me) || { guide: '', prefs: { remind: false, sessions: [], lead: BRIEF.lead }, lessons: [] };
  $('brGuide').value = me.guide;
  const p = me.prefs;
  for (const x of $('brRemind').querySelectorAll('button')) x.setAttribute('aria-pressed', String((x.dataset.v === 'on') === p.remind));
  $('brRemindSessions').innerHTML = BRIEF.sessions.map((s) => `<button type="button" data-v="${s.id}" aria-pressed="${p.sessions.includes(s.id)}">${s.name}</button>`).join('');
  for (const x of $('brLead').querySelectorAll('button')) x.setAttribute('aria-pressed', String(Number(x.dataset.v) === p.lead));
  $('brLessons').innerHTML = me.lessons.length
    ? me.lessons.map((l) => `<div class="br-lesson"><span><small>${pbDate(l.created)} · ${l.kind === 'edit' ? 'your edits' : 'you said'}</small>${pbEsc(l.text)}</span><button type="button" data-forget="${l.i}">FORGET</button></div>`).join('')
    : '<p class="fine" style="margin:0">Nothing yet. When you change TCP AI\'s draft before posting, what you changed is kept here and read before the next brief.</p>';
}

async function brTeachSave(extra = {}) {
  const me = br.data && br.data.me;
  if (!me) return;
  const prefs = {
    remind: $('brRemind').querySelector('[aria-pressed="true"]').dataset.v === 'on',
    sessions: [...$('brRemindSessions').querySelectorAll('[aria-pressed="true"]')].map((x) => x.dataset.v),
    lead: Number(($('brLead').querySelector('[aria-pressed="true"]') || { dataset: { v: BRIEF.lead } }).dataset.v),
  };
  const body = { guide: $('brGuide').value, prefs, ...extra };
  const lesson = $('brNewLesson').value.trim();
  if (lesson && !extra.forget) body.lesson = lesson;
  try {
    if (demo) {
      Object.assign(me, { guide: body.guide, prefs });
      if (body.lesson) me.lessons.unshift({ i: Date.now(), created: clock(), kind: 'note', text: body.lesson });
      if (extra.forget) me.lessons = me.lessons.filter((l) => l.i !== extra.forget);
    } else {
      br.data.me = (await pbSend('/api/briefs/teach', body)).me;
    }
    $('brNewLesson').value = '';
    brTeachRender();
    if (!extra.forget) pbToast('Saved. TCP AI reads this before every brief.');
  } catch (err) {
    pbToast(err.message);
  }
}

async function brExportAll() {
  if (demo) return pbToast('Demo: there is no data to send.');
  try {
    const res = await pbSend('/api/briefs/export', {});
    pbToast(`Sent to you in Telegram: ${res.briefs} briefs and ${res.lessons} lessons.`);
  } catch (err) {
    pbToast(err.message);
  }
}

async function brViewChart(id) {
  try {
    let url = br.photos[id];
    if (!url) {
      if (demo) throw new Error('Demo: there is no chart to show.');
      const res = await fetch(`/api/briefs/${id}/chart`, { headers: { authorization: 'tma ' + (tg ? tg.initData : '') } });
      if (!res.ok) throw new Error("The chart isn't available right now.");
      url = br.photos[id] = URL.createObjectURL(await res.blob());
    }
    $('pbViewerImg').src = url;
    $('pbViewer').hidden = false;
  } catch (err) {
    pbToast(err.message);
  }
}

// ------------------------------------------------------------------- wiring
function brInit() {
  $('brNew').addEventListener('click', () => { haptic(); brSheet(true); });
  $('brClose').addEventListener('click', () => brSheet(false));
  $('brSheet').addEventListener('click', (e) => { if (e.target === $('brSheet')) brSheet(false); });
  $('brSession').addEventListener('click', (e) => {
    const x = e.target.closest('button[data-v]');
    if (!x) return;
    haptic();
    br.form.session = x.dataset.v;
    brChartsForm();
  });
  $('brSymbol').addEventListener('click', (e) => {
    const x = e.target.closest('button[data-v]');
    if (!x) return;
    haptic();
    br.form.symbol = x.dataset.v;
    if (!state.data[x.dataset.v]) loadMarket(x.dataset.v);
    brChartsForm();
  });
  $('brFiles').addEventListener('change', async () => {
    const files = $('brFiles').files;
    if (files && files.length) await brAddCharts(files);
    $('brFiles').value = '';
  });
  $('brThumbs').addEventListener('click', (e) => {
    const x = e.target.closest('[data-drop]');
    if (!x) return;
    const [c] = br.form.charts.splice(Number(x.dataset.drop), 1);
    if (c) URL.revokeObjectURL(c.url);
    brChartsForm();
  });
  $('brRead').addEventListener('click', brSubmit);
  $('brBias').addEventListener('click', (e) => {
    const x = e.target.closest('button[data-v]');
    if (!x) return;
    haptic();
    brCollect().bias = x.dataset.v;
    brDraftForm();
  });
  $('brZones').addEventListener('input', (e) => {
    const row = e.target.closest('.br-zrow');
    if (!row) return;
    const i = Number(row.dataset.i);
    const z = brCollect().zones[i];
    if (e.target.dataset.f === 'kind') row.className = `br-zrow ${z.kind}`;
    const odds = row.querySelector('[data-zodds]');
    odds.textContent = brEditOdds(br.brief, z);
  });
  $('brZones').addEventListener('click', (e) => {
    const x = e.target.closest('[data-zdrop]');
    if (!x) return;
    brCollect().zones.splice(Number(x.dataset.zdrop), 1);
    brZoneRows();
  });
  $('brAddZone').addEventListener('click', () => {
    const e = brCollect();
    if (e.zones.length >= BRIEF.maxZones) return;
    e.zones.push({ kind: 'level', low: '', high: '', label: '', why: '', tf: '' });
    brZoneRows();
    const rows = $('brZones').querySelectorAll('.br-zrow');
    rows[rows.length - 1].querySelector('[data-f="low"]').focus();
  });
  $('brChartPick').addEventListener('click', (e) => {
    const x = e.target.closest('button[data-k]');
    if (!x) return;
    brCollect().chart = Number(x.dataset.k);
    brPostCharts();
  });
  $('brPost').addEventListener('click', brPost);
  $('brDrop').addEventListener('click', brDiscard);
  $('brRetry').addEventListener('click', brRetry);
  $('brManual').addEventListener('click', () => { $('brFailed').hidden = true; $('brHeadline').focus(); });

  $('brTeach').addEventListener('click', () => brTeachSheet(true));
  $('brTeachClose').addEventListener('click', () => brTeachSheet(false));
  $('brTeachSheet').addEventListener('click', (e) => { if (e.target === $('brTeachSheet')) brTeachSheet(false); });
  for (const id of ['brRemind', 'brLead']) {
    $(id).addEventListener('click', (e) => {
      const x = e.target.closest('button[data-v]');
      if (!x) return;
      for (const y of $(id).querySelectorAll('button')) y.setAttribute('aria-pressed', String(y === x));
    });
  }
  $('brRemindSessions').addEventListener('click', (e) => {
    const x = e.target.closest('button[data-v]');
    if (x) x.setAttribute('aria-pressed', String(x.getAttribute('aria-pressed') !== 'true'));
  });
  $('brTeachSave').addEventListener('click', () => brTeachSave());
  $('brLessons').addEventListener('click', (e) => {
    const x = e.target.closest('[data-forget]');
    if (x) brTeachSave({ forget: Number(x.dataset.forget) });
  });
  $('brExport').addEventListener('click', brExportAll);

  const clicks = (e) => {
    const chart = e.target.closest('[data-chart]');
    if (chart) return brViewChart(Number(chart.dataset.chart));
    const open = e.target.closest('[data-open]');
    if (open) { haptic(); $('brSheet').hidden = false; document.body.style.overflow = 'hidden'; return brOpenDraft(Number(open.dataset.open)); }
    const row = e.target.closest('[data-brrow]');
    if (row) {
      const id = Number(row.dataset.brrow);
      if (br.opened.has(id)) br.opened.delete(id);
      else br.opened.add(id);
      haptic();
      brHistory();
    }
  };
  $('brList').addEventListener('click', clicks);
  $('brHistoryCard').addEventListener('click', clicks);
  $('brHistoryCard').addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-brrow]')) { e.preventDefault(); clicks(e); } });

  // Opened from the reminder's button (?brief=london): the AI tab, and the charts sheet for a poster.
  const asked = new URLSearchParams(location.search).get('brief');
  brLoad().then(() => {
    if (!asked || !briefSession(asked)) return;
    showTab('ai');
    if (!brPoster()) return;
    const draft = br.data.briefs.find((b) => b.session === asked && ['draft', 'failed'].includes(b.status));
    if (draft) { $('brSheet').hidden = false; document.body.style.overflow = 'hidden'; brOpenDraft(draft.id); } else brSheet(true, { session: asked });
  });
}

// -------------------------------------------------------------------- demo
// Made-up briefs for design work (?demo), around the demo price. The zone record sits at the
// random walk's line on purpose, so a screenshot of it can't pass for a record that shows an edge.
function brDemo() {
  if (br.demo) return br.demo;
  const now = clock();
  const q = quoteOf('XAUUSD');
  const p = q ? q.price : 3742.5;
  const cents = (v) => Math.round(v * 100) / 100;
  const london = briefWindows(now).filter((w) => w.id === 'london' && w.close > now - 3600)[0];
  const asia = briefWindows(now).filter((w) => w.id === 'asia' && w.open < now).pop();
  const zonesAt = (x) => [
    { kind: 'supply', low: cents(x + 12), high: cents(x + 16.5), tf: '4H', label: '4H supply', why: 'Sellers twice last week', odds: 0.31 },
    { kind: 'liquidity', low: cents(x + 7.5), high: cents(x + 7.5), tf: '1H', label: 'Asia high', why: 'Stops above it', odds: 0.52 },
    { kind: 'demand', low: cents(x - 14), high: cents(x - 9.5), tf: '4H', label: '4H demand', why: 'H4 zone at the fib pocket, first tap', odds: 0.44 },
  ];
  const briefs = [];
  let id = 30;
  // Earlier briefs, scored: reached about as often as a random walk would, turning either way.
  let a = 7;
  const random = () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
  for (let k = 9; k >= 1; k--) {
    const posted = now - k * 26 * 3600;
    const plain = zonesAt(p - 20 + random() * 40);
    const zones = plain.map((z) => {
      const reached = random() < z.odds;
      const turn = (random() - 0.5) * 0.8;
      return { ...z, review: reached ? { reached: true, at: posted + 3600 * (1 + random() * 4), away: cents(8 + turn * 10), through: cents(8 - turn * 10), turn } : { reached: false } };
    });
    const reached = zones.filter((z) => z.review.reached).length;
    const session = ['asia', 'london', 'newyork'][k % 3];
    briefs.push({
      id: id--, session, day: '', opens: posted + 1800, closes: posted + 9 * 3600, symbol: 'XAUUSD', author: 'Lewis', status: 'posted', test: false,
      posted, price: p, photo: false, ai: true, reviewed: posted + 9 * 3600,
      final: { headline: ['Range day: fade the edges', 'Buyers in control above the Asia low', 'Sellers defend last week\'s high'][k % 3], bias: ['neutral', 'long', 'short'][k % 3],
        reason: 'The 4H matrix is split and the day is inside value.', zones: plain, plan: ['Wait for the edge, then the reaction.'], chart: 1 },
      review: { zones, counted: 3, reached, expected: 1.27 },
    });
  }
  if (asia) {
    const zones = zonesAt(p + 3);
    const scored = asia.close < now;
    const reviewed = zones.map((z, i) => ({ ...z, review: i === 2 ? { reached: true, at: asia.open + 5400, away: 9.4, through: 2.1, turn: 0.36 } : { reached: false } }));
    briefs.push({ id: 31, session: 'asia', day: asia.key, opens: asia.open, closes: asia.close, symbol: 'XAUUSD', author: 'Lewis', status: 'posted', test: false,
      posted: asia.open - 1500, price: p + 3, photo: false, ai: true, reviewed: scored ? asia.close + 300 : null,
      final: { headline: 'Quiet Asia: the range is the plan', bias: 'neutral', reason: 'No sweep yet; the 4H is still inside last week\'s value.', zones, plan: ['Fade the range edges while it holds.'], chart: 1 },
      review: scored ? { zones: reviewed, counted: 3, reached: 1, expected: 1.27 } : null });
  }
  if (london) {
    briefs.push({ id: 32, session: 'london', day: london.key, opens: london.open, closes: london.close, symbol: 'XAUUSD', author: 'Lewis', status: 'posted', test: false,
      posted: Math.min(now - 600, london.open - 1500), price: p, photo: false, ai: true, reviewed: null, review: null,
      final: { headline: 'Buyers defending the 4H demand into London', bias: 'long', reason: 'Asia held the zone twice and the trend matrix is bull 3/4.',
        zones: zonesAt(p), plan: ['A sweep of the demand that closes back above is the long, toward the Asia high.', 'A close below the demand: stand aside until New York.'], chart: 2 } });
  }
  briefs.sort((x, y) => y.id - x.id);
  br.demo = {
    ready: true, ai: true, mode: 'live', canPost: true, briefs, next: null,
    me: { guide: '', prefs: { remind: true, sessions: ['asia', 'london', 'newyork'], lead: 45 }, lessons: [
      { i: 2, created: now - 90000, kind: 'edit', text: 'London, XAUUSD: bias long → neutral; removed Asia high; rewrote the plan' },
      { i: 1, created: now - 200000, kind: 'note', text: 'The Asia high only matters once it has been swept.' }], readsToday: 1, limit: 12 },
  };
  br.demo.stats = briefStats(briefs);
  br.demo.memory = { briefs: briefs.length, charts: briefs.length * 5, reads: briefs.length, lessons: 2 };
  return br.demo;
}

// A made-up read of the demo's charts.
function brDemoRead() {
  const d = brDemo();
  const q = quoteOf(br.form.symbol) || quoteOf('XAUUSD');
  const p = q ? q.price : 3742.5;
  const w = briefWindow(br.form.session, clock()) || briefDefault(clock());
  const cents = (v) => Math.round(v * 100) / 100;
  const b = {
    id: 40, session: w.id, day: w.key, opens: w.open, closes: w.close, symbol: br.form.symbol, author: 'Demo', status: 'draft', test: false,
    charts: br.form.charts.map((c, i) => ({ k: i + 1, kept: true })), model: 'claude-opus-5', cost: 0.21, ai: true,
    read: {
      charts: br.form.charts.map((c, i) => ({ chart: i + 1, timeframe: ['5M', '15M', '30M', '1H', '4H', '1D'][i] || '?', price: cents(p), trend: i < 3 ? 'up' : 'sideways', summary: i < 3 ? 'Higher lows since the Asia low was swept.' : 'Inside last week\'s range.' })),
      panel: [{ section: 'trend matrix', row: 'aligned', value: 'bull 3/4 · bull 3/4' }, { section: 'setup', row: 'next H4 zone', value: `${brPrice('XAUUSD', p - 9.5)} · ${brPrice('XAUUSD', p + 12)}` }],
      unreadable: [], confidence: 'medium',
    },
    draft: {
      headline: 'Buyers defending the 4H demand into the open', bias: 'long', reason: 'The zone held in Asia and the matrix is bull 3/4.',
      zones: [
        { kind: 'supply', low: cents(p + 12), high: cents(p + 16.5), tf: '4H', label: '4H supply', why: 'Sellers twice last week', odds: 0.31 },
        { kind: 'demand', low: cents(p - 14), high: cents(p - 9.5), tf: '4H', label: '4H demand', why: 'H4 zone at the fib pocket', odds: 0.44 },
      ],
      plan: ['A sweep of the demand that closes back above is the long.', 'A close below it: wait for New York.'], chart: Math.min(2, br.form.charts.length || 1),
      warnings: br.form.charts.length < 5 ? [`Not among the charts: ${['5M', '15M', '30M', '1H', '4H'].slice(br.form.charts.length).join(', ')}.`] : [],
    },
  };
  d.briefs = d.briefs.filter((x) => x.id !== 40);
  d.briefs.unshift(b);
  return b;
}

function brDemoPost(b, body) {
  const d = brDemo();
  const q = quoteOf(b.symbol);
  const posted = { ...b, status: 'posted', posted: clock(), price: q ? q.price : 3742.5, final: { ...body, plan: String(body.plan).split('\n').filter(Boolean), zones: body.zones.map((z) => ({ ...z, odds: 0.4 })) } };
  d.briefs = d.briefs.filter((x) => x.id !== b.id);
  d.briefs.unshift(posted);
  return posted;
}

function brDemoDrop(id) {
  const d = brDemo();
  d.briefs = d.briefs.filter((x) => x.id !== id);
}
