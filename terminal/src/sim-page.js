// ---------------------------------------------------------- prop challenge
// The Risk tab's second view: a member's numbers played through a prop firm's challenge thousands of
// times, on the phone (sim-lib.js). The pass chance, how the rest end, the paths, the line with no
// edge, and the pass chance at each risk level. Nothing is sent anywhere.
const sim = { n: 50, trailing: false, o: null, nUsed: 0, answer: null, ext: null, key: '', timer: 0, run: 0, anim: 0 };
const SIM_FIELDS = {
  rate: ['simRate', '45'], rr: ['simRr', '1.5'], risk: ['simRisk', '1'], perDay: ['simPerDay', '2'], cost: ['simCost', '0.05'],
  target: ['simTarget', '10'], daily: ['simDaily', '5'], max: ['simMax', '10'], days: ['simDays', ''],
};
const SIM_ENDS = [
  ['pass', 'Passed', '#D8AD4E'], ['daily', 'Daily limit', '#8C7BD1'], ['max', 'Max loss', '#E0613F'],
  ['time', 'Out of time', '#8A8274'], ['open', 'Still going after 3 years', '#4A4436'],
];
const SIM_LINES = {
  pass: 'rgba(216,173,78,.5)', daily: 'rgba(140,123,209,.5)', max: 'rgba(224,97,63,.4)', time: 'rgba(166,157,140,.32)', open: 'rgba(166,157,140,.22)',
};
const simNum = (v) => String(Math.round(v * 100) / 100);
const simR = (v) => `${v >= 0 ? '+' : '−'}${fmtNum(Math.abs(v), 2)}R`;

function simInit() {
  for (const [key, [id, first]] of Object.entries(SIM_FIELDS)) {
    const saved = store.get('sim.' + key);
    $(id).value = saved == null ? first : saved;
    $(id).addEventListener('input', () => { store.set('sim.' + key, $(id).value); simQueue(); });
  }
  const n = store.get('sim.n');
  if (n != null && n !== '' && Number.isFinite(Number(n))) sim.n = Number(n);
  sim.trailing = store.get('sim.trailing') === '1';
  $('simPreset').innerHTML = Object.entries(SIM.presets).map(([k, p]) => `<button data-preset="${k}">${pbEsc(p.label)}</button>`).join('');
  $('simView').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.n != null) { sim.n = Number(b.dataset.n); store.set('sim.n', b.dataset.n); }
    else if (b.dataset.trail != null) { sim.trailing = b.dataset.trail === '1'; store.set('sim.trailing', b.dataset.trail); }
    else if (b.dataset.preset) {
      const p = SIM.presets[b.dataset.preset];
      const set = (key, v) => { $(SIM_FIELDS[key][0]).value = v; store.set('sim.' + key, v); };
      set('target', simNum(p.target * 100));
      set('daily', p.daily ? simNum(p.daily * 100) : '');
      set('max', simNum(p.max * 100));
      set('days', p.days ? String(p.days) : '');
      sim.trailing = p.trailing;
      store.set('sim.trailing', p.trailing ? '1' : '0');
    } else return;
    haptic();
    simQueue(0);
  });
  for (const b of document.querySelectorAll('#riskMode button')) b.addEventListener('click', () => { haptic(); simMode(b.dataset.mode); });
  addEventListener('resize', () => { if (sim.answer && !$('simView').hidden) simDraw(1); });
  simMode(store.get('risk.mode') === 'sim' ? 'sim' : 'size');
}

function simMode(mode) {
  store.set('risk.mode', mode);
  for (const b of document.querySelectorAll('#riskMode button')) b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
  $('sizeView').hidden = mode !== 'size';
  $('simView').hidden = mode !== 'sim';
  if (mode === 'sim') simShow();
}

// When the Risk tab or the view comes into sight: work out the answer, or redraw the paths.
function simShow() {
  if ($('risk').hidden || $('simView').hidden) return;
  if (sim.answer) simAnimate();
  else simQueue(0);
}

// Which chips are on: the win rate's trades, static or trailing, and a preset the numbers match.
function simMark() {
  for (const b of document.querySelectorAll('#simN button')) b.setAttribute('aria-pressed', String(Number(b.dataset.n) === sim.n));
  for (const b of document.querySelectorAll('#simTrail button')) b.setAttribute('aria-pressed', String((b.dataset.trail === '1') === sim.trailing));
  const v = (key) => parseFloat($(SIM_FIELDS[key][0]).value) || 0;
  for (const b of document.querySelectorAll('#simPreset button')) {
    const p = SIM.presets[b.dataset.preset];
    const same = Math.abs(v('target') - p.target * 100) < 1e-9 && Math.abs(v('daily') - p.daily * 100) < 1e-9
      && Math.abs(v('max') - p.max * 100) < 1e-9 && v('days') === p.days && sim.trailing === p.trailing;
    b.setAttribute('aria-pressed', String(same));
  }
}

function simQueue(delay = 300) {
  simMark();
  clearTimeout(sim.timer);
  sim.timer = setTimeout(simCompute, delay);
}

function simCompute() {
  if ($('simView').hidden) return;
  const f = Object.fromEntries(Object.entries(SIM_FIELDS).map(([key, [id]]) => [key, $(id).value]));
  const r = simInputs({ ...f, n: sim.n, trailing: sim.trailing });
  $('simErr').hidden = !r.error;
  if (r.error) {
    sim.run += 1; // stops a sweep that's still going
    sim.answer = null;
    sim.key = '';
    $('simErr').textContent = r.error;
    $('simPass').textContent = '—';
    $('simLine').innerHTML = `<span class="warn">${pbEsc(r.error)}</span>`;
    $('simBody').hidden = true;
    $('simSweepCard').hidden = true;
    return;
  }
  const key = JSON.stringify(r);
  if (key === sim.key && sim.answer) return;
  const run = ++sim.run;
  sim.key = key;
  sim.o = r.o;
  sim.nUsed = r.n;
  sim.answer = simAnswer(r.o, r.n);
  // The chart runs as long as 4 in 5 of its paths: the slowest run off the right-hand edge.
  const lens = sim.answer.curves.map((c) => c.points.length).sort((x, y) => x - y);
  const len = lens[Math.min(lens.length - 1, Math.floor(lens.length * 0.8))];
  const all = sim.answer.curves.flatMap((c) => { const seen = c.points.slice(0, len); return [Math.max(...seen), Math.min(...seen)]; });
  sim.ext = { len, hi: Math.max(r.o.target, ...all) * 100, lo: Math.min(-r.o.max, ...all) * 100 };
  simRender();
  simSweepRun(run, r.o, r.n);
}

function simRender() {
  const a = sim.answer;
  const o = sim.o;
  const n = sim.nUsed;
  $('simBody').hidden = false;
  $('simPass').textContent = pct(a.main.pass);
  $('simLine').textContent = `of ${fmtNum(SIM.paths, 0)} simulated challenges with your numbers below${n ? ', allowing for the doubt in your win rate' : ''}`;
  const ends = SIM_ENDS.filter(([k]) => a.main[k] > 0);
  $('simBar').innerHTML = ends.map(([k, , c]) => `<i style="width:${a.main[k] * 100}%;background:${c}"></i>`).join('');
  $('simLegend').innerHTML = ends.map(([k, label, c]) => `<span style="--c:${c}">${label}<b>${pct(a.main[k])}</b></span>`).join('');
  $('simFacts').innerHTML = [
    ['With no edge', pct(a.flat.pass)],
    a.exact && ['If your win rate is exactly right', pct(a.exact.pass)],
    ['Each trade, after costs', simR(a.edge)],
    ['Win rate to break even', `${fmtNum(a.breakEven * 100, 1)}%`],
    a.main.median != null && ['Trading days to pass, typically', String(a.main.median)],
    a.main.median != null && ['Half of passes take', `${a.main.p25} to ${a.main.p75} days`],
  ].filter(Boolean).map(([k, v]) => `<div>${k}<b>${v}</b></div>`).join('');
  const bits = [];
  if (n) bits.push(`From <b>${n}</b> trades, a ${simNum(o.rate * 100)}% win rate could really be anywhere from <b>${pct(a.rateLow)}</b> to <b>${pct(a.rateHigh)}</b>. That doubt is in the pass chance.`);
  bits.push(a.edge > 0
    ? `Your numbers make <b>${simR(a.edge)}</b> a trade after costs. With no edge, this challenge passes <b>${pct(a.flat.pass)}</b> of the time: that's the line to beat.`
    : `Your numbers lose <b>${fmtNum(-a.edge, 2)}R</b> a trade after costs, so a pass would be luck. A trader with no edge passes <b>${pct(a.flat.pass)}</b> of the time.`);
  if (a.main.daily >= 0.05) bits.push(`<b>${pct(a.main.daily)}</b> end on the daily limit: less risk on each trade, or fewer trades a day, makes that rarer.`);
  if (a.main.time >= 0.05) bits.push(`<b>${pct(a.main.time)}</b> run out of days.`);
  if (a.main.open >= 0.01) bits.push(`<b>${pct(a.main.open)}</b> are still going after 3 years of trading days.`);
  $('simNote').innerHTML = bits.join(' ');
  simAnimate();
}

// The pass chance at each risk level, one level at a time so the page stays quick. A newer answer
// stops an older sweep.
function simSweepRun(run, o, n) {
  const levels = simLevels(o);
  const done = levels.map((risk) => (risk === o.risk ? sim.answer.main.pass : null));
  $('simSweepCard').hidden = false;
  simSweepShow(levels, done, o, false);
  let i = 0;
  const step = () => {
    if (run !== sim.run) return;
    while (i < levels.length && done[i] != null) i += 1;
    if (i >= levels.length) { simSweepShow(levels, done, o, true); return; }
    done[i] = simSummary(simulate({ ...o, risk: levels[i] }, { n })).pass;
    simSweepShow(levels, done, o, false);
    setTimeout(step, 0);
  };
  setTimeout(step, 0);
}

function simSweepShow(levels, done, o, finished) {
  const best = finished ? Math.max(...done) : null;
  const top = finished ? levels[done.indexOf(best)] : null;
  $('simSweep').innerHTML = levels.map((risk, i) => {
    const p = done[i];
    const cls = ['sw', risk === o.risk ? 'me' : '', finished && risk === top ? 'best' : ''].filter(Boolean).join(' ');
    return `<div class="${cls}"><span>${simNum(risk * 100)}%</span><i><b style="width:${p == null ? 0 : Math.max(1, p * 100)}%"></b></i><em>${p == null ? '…' : pct(p)}</em></div>`;
  }).join('');
  if (!finished) { $('simSweepNote').textContent = 'Playing the challenge at each risk level…'; return; }
  const mine = done[levels.indexOf(o.risk)];
  const bits = [top === o.risk
    ? `Your <b>${simNum(o.risk * 100)}%</b> a trade passes most often.`
    : `The most passes come at <b>${simNum(top * 100)}%</b> a trade (${pct(best)}), against ${pct(mine)} at your ${simNum(o.risk * 100)}%.`];
  if (sim.answer.edge <= 0) bits.push('Without an edge, more risk only ends the challenge sooner, before the losses add up. It can pass more often here, but a funded account traded that way still loses.');
  else if (!o.days && top === levels[0]) bits.push('With an edge and no time limit, a smaller risk passes more often. It just takes longer.');
  $('simSweepNote').innerHTML = bits.join(' ');
}

function simAnimate() {
  cancelAnimationFrame(sim.anim);
  if (reduceMotion) { simDraw(1); return; }
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / 1200);
    simDraw(1 - (1 - k) ** 2);
    if (k < 1) sim.anim = requestAnimationFrame(step);
  };
  sim.anim = requestAnimationFrame(step);
}

// 40 of the challenges, drawn in as they happen: the target above, the loss limit below.
function simDraw(progress) {
  const cv = $('simChart');
  const a = sim.answer;
  if (!a || !cv.clientWidth) return;
  const w = cv.clientWidth;
  const h = cv.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
  }
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const o = sim.o;
  const { len } = sim.ext;
  const padV = (sim.ext.hi - sim.ext.lo) * 0.08;
  const hi = sim.ext.hi + padV;
  const lo = sim.ext.lo - padV;
  const pad = { l: 40, r: 10, t: 8, b: 20 };
  const x = (i) => pad.l + (i / len) * (w - pad.l - pad.r);
  const y = (v) => pad.t + ((hi - v) / (hi - lo)) * (h - pad.t - pad.b);
  ctx.font = '500 10px "JetBrains Mono", ui-monospace, monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  const target = o.target * 100;
  const floor = -o.max * 100;
  for (const [v, colour, dash] of [[target, 'rgba(216,173,78,.75)', [4, 4]], [0, '#5A5346', []], [floor, 'rgba(224,97,63,.75)', [4, 4]]]) {
    const yy = Math.round(y(v)) + 0.5;
    ctx.setLineDash(dash);
    ctx.strokeStyle = colour;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, yy);
    ctx.lineTo(w - pad.r, yy);
    ctx.stroke();
    ctx.fillStyle = '#8A8274';
    ctx.fillText(v === 0 ? '0%' : `${v > 0 ? '+' : '−'}${simNum(Math.abs(v))}%`, pad.l - 6, yy);
  }
  ctx.setLineDash([]);
  ctx.textBaseline = 'alphabetic';
  if (o.trailing) { ctx.fillText('TRAILS UP', w - pad.r, Math.round(y(floor)) - 5); }
  ctx.textAlign = 'left';
  ctx.fillText('Day 1', pad.l, h - 4);
  ctx.textAlign = 'right';
  ctx.fillText(`Day ${Math.ceil(len / o.perDay)}`, w - pad.r, h - 4);
  // failures under passes; a long path is thinned to about a point and a half a pixel
  const order = { time: 0, open: 0, daily: 1, max: 1, pass: 2 };
  const stride = Math.max(1, Math.floor(len / ((w - pad.l - pad.r) * 1.5)));
  const shown = progress * len;
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';
  for (const c of [...a.curves].sort((p, q) => order[p.end] - order[q.end])) {
    const last = Math.min(c.points.length, Math.floor(shown));
    if (last < 1) continue;
    ctx.strokeStyle = SIM_LINES[c.end];
    ctx.beginPath();
    ctx.moveTo(x(0), y(0));
    for (let i = stride - 1; i < last - 1; i += stride) ctx.lineTo(x(i + 1), y(c.points[i] * 100));
    ctx.lineTo(x(last), y(c.points[last - 1] * 100));
    ctx.stroke();
    if (last === c.points.length) {
      ctx.fillStyle = { pass: '#D8AD4E', daily: '#8C7BD1', max: '#E0613F' }[c.end] || '#8A8274';
      ctx.beginPath();
      ctx.arc(x(last), y(c.points[last - 1] * 100), 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
