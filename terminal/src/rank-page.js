// TCP Quant Terminal: the page's leaderboard (the Ranks tab) and MT5 connection (the Account tab).
// build.mjs puts the shared maths (lib.js to ranks-lib.js) in front of this file and app.js after
// it, all in one script. Nothing here runs on load: app.js calls rkInit() once the member is signed in.

const rk = {
  data: null, // the last answer from /api/ranks
  at: 0,
  loading: null,
  mine: null, // the last answer from /api/mt5
  mineAt: 0,
  mineLoading: null,
  period: 'week',
  when: { week: null, month: null }, // true: the last one; false: this one; null: this one unless it's empty
  by: 'gain',
  form: { public: true },
  busy: false,
  renaming: false,
  curve: { drawn: '', anim: 0 },
  demo: null,
};
const RK_TABLES = { day: ['day'], week: ['week', 'lastWeek'], month: ['month', 'lastMonth'] };
const RK_WORDS = { day: 'that day', week: 'this week', lastWeek: 'last week', month: 'this month', lastMonth: 'last month' };
const rkDate = (key, opts) => new Date(key + 'T12:00:00Z').toLocaleDateString([], { timeZone: 'UTC', ...opts });
const rkClass = (v) => (v > RANKS.flat ? 'up' : v < -RANKS.flat ? 'down' : '');

// ------------------------------------------------------------------- data
// One load at a time; a forced reload asked for during one runs after it.
function rkLoad(force = false) {
  if (!force && rk.data && !rk.data.error && clock() - rk.at < 30) return Promise.resolve();
  if (rk.loading) return force ? rk.loading.then(() => rkLoad(true)) : rk.loading;
  rk.loading = (async () => {
    try {
      rk.data = demo ? rkDemo().ranks : await call('/api/ranks');
      rk.at = clock();
    } catch (err) {
      if (!rk.data || rk.data.error) rk.data = { error: err.message };
    }
    rkRender();
    rkMeasured();
  })().finally(() => { rk.loading = null; });
  return rk.loading;
}

function rkMineLoad(force = false) {
  if (!force && rk.mine && !rk.mine.error && clock() - rk.mineAt < 20) return Promise.resolve();
  if (rk.mineLoading) return force ? rk.mineLoading.then(() => rkMineLoad(true)) : rk.mineLoading;
  rk.mineLoading = (async () => {
    try {
      rk.mine = demo ? rkDemo().mine : await call('/api/mt5');
      rk.mineAt = clock();
    } catch (err) {
      if (!rk.mine || rk.mine.error) rk.mine = { error: err.message };
    }
    rkAccount();
    rkRender();
  })().finally(() => { rk.mineLoading = null; });
  return rk.mineLoading;
}

// The member's investor password, sealed on this phone to the TCP bridge's public key (RSA-OAEP
// with SHA-256) together with the account it belongs to. Only the bridge's private key opens it.
async function rkSeal(spki, payload) {
  const der = Uint8Array.from(atob(spki), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('spki', der, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
  const data = new TextEncoder().encode(JSON.stringify(payload));
  if (data.length > key.algorithm.modulusLength / 8 - 66) throw Object.assign(new Error('That password is too long.'), { field: 'password' });
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, data));
  let text = '';
  for (const b of sealed) text += String.fromCharCode(b);
  return btoa(text);
}

// ------------------------------------------------------------ the tables
// Which table the chips point at: this week (or month) unless it's empty and last week's isn't.
function rkKey() {
  const [now, last] = RK_TABLES[rk.period];
  if (!last) return now;
  const pick = rk.when[rk.period];
  if (pick != null) return pick ? last : now;
  const t = rk.data && rk.data.tables && rk.data.tables[now];
  return t && t.traders ? now : last;
}

function rkChips() {
  for (const b of $('rkPeriod').querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.v === rk.period));
  const k = rkKey();
  const t = rk.data && rk.data.tables && rk.data.tables[k];
  const [now, last] = RK_TABLES[rk.period];
  $('rkWhen').innerHTML = last
    ? [now, last].map((v) => `<button type="button" data-v="${v}" aria-pressed="${v === k}">${RANKS.periods[v]}</button>`).join('')
    : `<span class="hint">${t ? pbEsc(rkDate(t.key, { weekday: 'long', day: 'numeric', month: 'short' })) : ''}</span>`;
  $('rkBy').hidden = rk.period === 'day';
  for (const b of $('rkBy').querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.v === rk.by));
}

function rkRender() {
  const d = rk.data;
  $('rkDemoTag').hidden = !demo;
  rkChips();
  const board = $('rkBoard');
  $('rkYou').hidden = true;
  $('rkHidden').hidden = true;
  const m = rk.mine;
  $('rkJoin').hidden = !(m && m.ready && m.open && !m.link);
  if (!d) {
    $('rkSplit').innerHTML = '';
    $('rkSync').textContent = '';
    board.innerHTML = '<div class="rk-empty"><div class="skeleton" style="height:14px;margin:0 20% 12px"></div><div class="skeleton" style="height:14px;margin:0 30%"></div></div>';
    return;
  }
  if (d.error || !d.ready) {
    $('rkSplit').innerHTML = '';
    $('rkSync').textContent = '';
    board.innerHTML = `<div class="rk-empty"><b>${d.error ? 'Couldn\'t load the leaderboard' : 'The leaderboard isn\'t on yet'}</b>${pbEsc(d.error || 'It opens once TCP\'s database is set up.')}</div>`;
    return;
  }
  const k = rkKey();
  const t = d.tables[k];
  const steady = rk.by === 'steady' && t.steady;
  const view = steady ? t.steady : t;
  const words = RK_WORDS[k];
  // green and red
  const flat = t.traders - t.green - t.red;
  $('rkSplit').innerHTML = t.traders
    ? `<div class="bar"><i class="g" style="width:${(t.green / t.traders) * 100}%"></i><i class="r" style="width:${(t.red / t.traders) * 100}%;margin-left:auto"></i></div>
       <div class="words"><span><b class="up">${t.green}</b> green</span><span>${t.traders} trader${t.traders === 1 ? '' : 's'}${flat ? ` · ${flat} flat` : ''}</span><span><b class="down">${t.red}</b> red</span></div>`
    : '';
  if (t.mine) {
    const me = t.rows.find((r) => r.me);
    $('rkYou').innerHTML = `You're <b>${ordinal(t.mine)}</b> of ${t.traders} ${words}${me ? `, <b>${rankPct(me.ret)}</b>` : ''}.`;
    $('rkYou').hidden = false;
  }
  rkSyncLine();
  // the rows
  if (!view.rows.length) {
    board.innerHTML = steady
      ? `<div class="rk-empty"><b>Too early to rank</b>Consistency needs three trading days that differ, and nobody has them ${words} yet.</div>`
      : d.connected || demo
        ? `<div class="rk-empty"><b>No closed trades ${words}</b>The table fills as connected members close trades.</div>`
        : `<div class="rk-empty"><b>${d.open ? 'Be the first on the board' : 'The leaderboard opens soon'}</b>Members connect MT5 read-only, and the table fills from their closed trades: percentages only, never balances.</div>`;
    return;
  }
  let html = '';
  view.rows.forEach((r, i) => {
    if (i && r.rank > view.rows[i - 1].rank + 1) html += '<div class="rk-gap">⋯</div>';
    html += rkRow(r, k, steady, d.canHide);
  });
  board.innerHTML = html;
  // posters: the names taken off the table
  if (d.canHide && d.hidden && d.hidden.length) {
    $('rkHidden').innerHTML = `<h2 class="label">Taken off the leaderboard</h2>${d.hidden.map((n) => `<div class="row"><span>${pbEsc(n)}</span><button class="link" type="button" data-unhide="${pbEsc(n)}">Put back</button></div>`).join('')}`;
    $('rkHidden').hidden = false;
  }
}

function rkRow(r, k, steady, canHide) {
  const bits = [`${r.won}W ${r.lost}L`];
  if (k !== 'day' && r.worst != null) bits.push(`worst <span class="${r.worst < -RANKS.flat ? 'down' : ''}">${rankPct(r.worst, 1)}</span>`);
  if (r.open != null && Math.abs(r.open) >= 0.005) bits.push(`open <span class="${r.open < 0 ? 'down' : ''}">${rankPct(r.open, 1)}</span>`);
  if (canHide && !r.me) bits.push(`<button class="link" type="button" data-hide="${pbEsc(r.nick)}">hide</button>`);
  const right = steady
    ? `${fmtNum(r.score, 2)}<small>${rankPct(r.ret)}</small>`
    : `${rankPct(r.ret)}<small>${k === 'day' ? '' : `${r.days} day${r.days === 1 ? '' : 's'}`}</small>`;
  return `<div class="rk-row${r.rank <= 3 ? ` p${r.rank}` : ''}${r.me ? ' me' : ''}"><span class="rk-rank">${r.rank}</span>`
    + `<div class="rk-who"><b>${pbEsc(r.nick)}${r.me ? '<span class="you">YOU</span>' : ''}</b><small>${bits.map((b) => `<i>${b}</i>`).join(' · ')}</small></div>`
    + `<span class="rk-ret ${steady ? '' : rkClass(r.ret)}">${right}</span></div>`;
}

function rkSyncLine() {
  const d = rk.data;
  if (!d || !d.ready) return;
  const parts = [`${d.connected} account${d.connected === 1 ? '' : 's'} connected`];
  if (d.synced) parts.push(`last read ${ago(d.synced)}`);
  $('rkSync').textContent = parts.join(' · ');
}

// ---------------------------------------------------------- your account
function rkAccount() {
  const m = rk.mine;
  const st = $('mtState');
  const body = $('mtBody');
  const state = (cls, text) => { st.className = `state ${cls}`; st.textContent = text; };
  $('mtNotify').hidden = true;
  if (!m) {
    state('soon-tag', 'Loading');
    body.innerHTML = '<p class="mt-text">Checking…</p>';
  } else if (m.error || !m.ready) {
    state('soon-tag', 'Not yet');
    body.innerHTML = `<p class="mt-text">${pbEsc(m.error || 'Connecting MT5 opens once TCP\'s database is set up.')}</p>`;
  } else if (!m.link) {
    if (!m.open) {
      state('soon-tag', 'Coming soon');
      body.innerHTML = '<p class="mt-text">Connect your MT5 account read-only to see your results here and join the leaderboard. Only percentages are shared, never your balance.</p>';
      $('mtNotify').hidden = false;
    } else {
      state('soon-tag', 'Not connected');
      body.innerHTML = '<p class="mt-text">Connect your MT5 account read-only to see your results here and join the leaderboard. Only percentages are shared, never your balance.</p>'
        + '<button class="cta pb-submit" type="button" data-act="connect">CONNECT MT5</button>';
    }
  } else {
    const l = m.link;
    if (l.status === 'active') state('live', 'Live');
    else if (l.status === 'failed') state('failed', 'Needs you');
    else state('pending', 'Checking');
    const board = l.hidden ? 'Taken off by TCP' : l.public ? l.nick : `${l.nick} (hidden)`;
    const facts = [
      ['Broker', l.brokerName], ['Server', l.server], ['Account', l.login],
      ['On the leaderboard as', board], ['Since', rkDate(l.since, { day: 'numeric', month: 'short', year: 'numeric' })],
    ];
    if (l.synced) facts.push(['Last read', ago(l.synced)]);
    let notes = '';
    if (l.status === 'pending') notes += '<p class="mt-note">TCP\'s bridge logs in read-only on its next run, usually within half an hour, and the bot messages you when it\'s done.</p>';
    if (l.error) notes += `<p class="mt-note${l.status === 'failed' ? ' bad' : ''}">${pbEsc(l.error)}</p>`;
    if (l.hidden) notes += '<p class="mt-note">TCP has taken you off the leaderboard. Your stats still show here. Ask the team if you think that\'s wrong.</p>';
    const rename = rk.renaming
      ? `<div class="field" style="margin:14px 0 0"><label for="mtRename">New name</label><div class="inputs"><input id="mtRename" maxlength="20" autocomplete="off" value="${pbEsc(l.nick)}"><button class="mt-save" type="button" data-act="save-name">SAVE</button></div><div class="pb-error" id="mtRenameError" role="alert" hidden></div></div>`
      : '';
    const actions = l.status === 'failed'
      ? '<button type="button" class="gold" data-act="connect">RECONNECT</button>'
      : `<button type="button" data-act="rename">RENAME</button>${l.hidden ? '' : `<button type="button" data-act="public">${l.public ? 'HIDE ME' : 'SHOW ME'}</button>`}`;
    body.innerHTML = `<div class="mt-facts">${facts.map(([k, v]) => `<div><span>${k}</span><b>${pbEsc(v)}</b></div>`).join('')}</div>${notes}${rename}`
      + `<div class="mt-actions">${actions}<button type="button" class="quiet" data-act="disconnect">DISCONNECT</button></div>`;
  }
  rkMeasured();
}

function rkMeasured() {
  const m = rk.mine;
  const l = m && m.link;
  const s = m && m.stats;
  const has = !!(l && s && s.days > 0);
  const tag = $('mtMeasuredTag');
  tag.className = `state ${has ? 'live' : 'soon-tag'}`;
  tag.textContent = has ? `${s.days} day${s.days === 1 ? '' : 's'}` : !l ? 'After connecting' : l.status === 'failed' ? 'Paused' : 'No trades yet';
  const pf = !has || s.profitFactor == null ? '—' : s.profitFactor === Infinity ? '∞' : fmtNum(s.profitFactor, 2);
  const tiles = [
    ['Total', has ? rankPct(s.total) : '—', has ? rkClass(s.total) : ''],
    ['Profit factor', pf, ''],
    ['Win rate', has && s.winRate != null ? `${Math.round(s.winRate * 100)}%` : '—', ''],
    ['Average day', has ? rankPct(s.avgDay) : '—', has ? rkClass(s.avgDay) : ''],
    ['Max drawdown', has ? (s.maxDrawdown > 0 ? `−${fmtNum(s.maxDrawdown * 100, 2)}%` : '0.00%') : '—', has && s.maxDrawdown > 0 ? 'down' : ''],
    ['Worst day', has ? rankPct(s.worst) : '—', has ? rkClass(s.worst) : ''],
  ];
  $('mtStats').className = `rk-stats${has ? '' : ' empty'}`;
  $('mtStats').innerHTML = tiles.map(([k, v, c]) => `<div><span>${k}</span><b class="${c}">${v}</b></div>`).join('');
  // the last day, this week and this month, with your place on each table
  const periods = m && m.periods;
  $('mtPeriods').hidden = !has || !periods;
  if (has && periods) {
    const tables = rk.data && rk.data.tables;
    $('mtPeriods').innerHTML = [['day', 'Last day'], ['week', 'This week'], ['month', 'This month']].map(([k, name]) => {
      const p = periods[k];
      const place = tables && tables[k] && tables[k].mine ? `<small>${ordinal(tables[k].mine)}</small>` : '';
      return `<div>${name}<b class="${p.trades ? rkClass(p.ret) : ''}">${p.trades ? rankPct(p.ret) : '—'}${place}</b></div>`;
    }).join('');
  }
  $('mtCurve').hidden = !has || s.curve.length < 2;
  if (has && s.curve.length >= 2) rkCurve();
  $('mtVerdict').innerHTML = has ? rkVerdict(s) : '';
  $('mtMeasuredNote').textContent = has
    ? `Since ${rkDate(l.since, { day: 'numeric', month: 'short' })}: closed trades only, as percentages of your balance at the start of each day.${demo ? ' Demo: made-up trades with no edge.' : ''}`
    : 'From the day you connect: closed trades only, as percentages of your balance. Your equity curve, win rate, profit factor and consistency show here.';
}

// Consistency, said plainly, and only once there are enough days to say anything.
function rkVerdict(s) {
  const need = RANKS.steady;
  let cls = 'collecting';
  let title = 'Too early to tell';
  let text = `${s.days} of ${need} trading days. Until then, a good or bad run says little about skill.`;
  if (s.days >= need && s.score != null) {
    const score = fmtNum(s.score, 2);
    if (s.score >= 2) {
      cls = 'ahead';
      title = 'Unlikely to be luck';
      text = `Consistency ${score} over ${s.days} days. Luck alone gets this far about 1 time in 40.`;
    } else if (s.score <= -2) {
      cls = 'behind';
      title = 'Losing more than luck explains';
      text = `Consistency ${score} over ${s.days} days. Worth looking at your risk per trade and your worst days.`;
    } else {
      cls = '';
      title = 'Can\'t tell from luck yet';
      text = `Consistency ${score} over ${s.days} days. Between −2 and 2, results like these often come from luck.`;
    }
  }
  return `<div class="pb-verdict ${cls}"><span class="icon">${cls === 'ahead' ? '▲' : cls === 'behind' ? '▼' : '≈'}</span><div><b>${title}</b><span>${text}</span></div></div>`;
}

// The curve of closed trades since connecting, as a percentage from the start.
function rkCurve() {
  const pts = rk.mine.stats.curve;
  const key = pts.map((p) => `${p.day}:${p.eq}`).join(',');
  if ($('account').hidden) return;
  if (key === rk.curve.drawn) return rkDrawCurve(1);
  rk.curve.drawn = key;
  cancelAnimationFrame(rk.curve.anim);
  if (reduceMotion) return rkDrawCurve(1);
  const began = performance.now();
  const step = (ts) => {
    const t = Math.min(1, (ts - began) / 900);
    rkDrawCurve(1 - (1 - t) ** 3);
    if (t < 1) rk.curve.anim = requestAnimationFrame(step);
  };
  rk.curve.anim = requestAnimationFrame(step);
}

function rkDrawCurve(progress) {
  const cv = $('mtCurve');
  const pts = rk.mine && rk.mine.stats ? rk.mine.stats.curve : [];
  if (!cv.clientWidth || pts.length < 2) return;
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
  const vals = [0, ...pts.map((p) => (p.eq - 1) * 100)];
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  const padV = Math.max(0.5, (hi - lo) * 0.12);
  lo -= padV;
  hi += padV;
  const pad = { l: 40, r: 10, t: 10, b: 20 };
  const n = pts.length;
  const x = (i) => pad.l + (i / n) * (w - pad.l - pad.r);
  const y = (v) => pad.t + ((hi - v) / (hi - lo)) * (h - pad.t - pad.b);
  ctx.font = '500 10px "JetBrains Mono", ui-monospace, monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  // the start line, and the top and bottom of the scale
  for (const v of [hi - padV, 0, lo + padV]) {
    const yy = Math.round(y(v)) + 0.5;
    ctx.strokeStyle = v === 0 ? '#5A5346' : '#26231C';
    ctx.beginPath();
    ctx.moveTo(pad.l, yy);
    ctx.lineTo(w - pad.r, yy);
    ctx.stroke();
    ctx.fillStyle = '#8A8274';
    ctx.fillText(v === 0 ? '0%' : `${v > 0 ? '+' : '−'}${fmtNum(Math.abs(v), 1)}%`, pad.l - 6, yy);
  }
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillText(rkDate(pts[0].day, { day: 'numeric', month: 'short' }), pad.l, h - 4);
  ctx.textAlign = 'right';
  ctx.fillText(rkDate(pts[n - 1].day, { day: 'numeric', month: 'short' }), w - pad.r, h - 4);
  // the line from the start, drawn in as it appears
  const shown = Math.max(1, Math.round(n * progress));
  const line = [[x(0), y(0)], ...pts.slice(0, shown).map((p, i) => [x(i + 1), y((p.eq - 1) * 100)])];
  const last = (pts[shown - 1].eq - 1) * 100;
  const colour = last >= 0 ? '#35A68C' : '#E0613F';
  const fill = ctx.createLinearGradient(0, pad.t, 0, h - pad.b);
  fill.addColorStop(0, last >= 0 ? 'rgba(53,166,140,.22)' : 'rgba(224,97,63,.05)');
  fill.addColorStop(1, last >= 0 ? 'rgba(53,166,140,.02)' : 'rgba(224,97,63,.22)');
  ctx.beginPath();
  ctx.moveTo(line[0][0], y(0));
  for (const [px, py] of line) ctx.lineTo(px, py);
  ctx.lineTo(line[line.length - 1][0], y(0));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.beginPath();
  line.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();
  const [ex, ey] = line[line.length - 1];
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

// ------------------------------------------------------- connect, change
function rkSheet(open) {
  $('mtSheet').hidden = !open;
  document.body.style.overflow = open ? 'hidden' : '';
  $('mtPassword').value = '';
  if (!open) return;
  const l = rk.mine && rk.mine.link;
  $('mtLogin').value = '';
  $('mtServer').value = l ? l.server : '';
  $('mtNick').value = l ? l.nick : '';
  $('mtConsent').checked = false;
  rk.form.public = l ? l.public : true;
  rkFormSync();
  rkFormError('');
}

function rkFormSync() {
  for (const b of $('mtPublic').querySelectorAll('button')) b.setAttribute('aria-pressed', String((b.dataset.v === 'on') === rk.form.public));
}

function rkFormError(message, field) {
  $('mtError').textContent = message;
  $('mtError').hidden = !message;
  const input = { login: 'mtLogin', server: 'mtServer', password: 'mtPassword', nick: 'mtNick', consent: 'mtConsent' }[field];
  if (input) $(input).focus();
  if (message) $('mtError').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

async function rkSubmit() {
  if (rk.busy) return;
  const account = cleanAccount({ login: $('mtLogin').value, server: $('mtServer').value });
  if (account.error) return rkFormError(account.error, account.field);
  if (!$('mtPassword').value) return rkFormError('Enter the investor password.', 'password');
  const nick = cleanNick($('mtNick').value);
  if (!nick) return rkFormError('Pick a name for the leaderboard: 2 to 20 letters or numbers, and not one that looks like TCP\'s own.', 'nick');
  if (!$('mtConsent').checked) return rkFormError('Tick the box to confirm it\'s your investor (read-only) password.', 'consent');
  const button = $('mtSubmit');
  rk.busy = true;
  button.disabled = true;
  button.textContent = 'ENCRYPTING…';
  try {
    if (demo) {
      $('mtPassword').value = '';
      rkDemoConnect(account, nick, rk.form.public);
    } else {
      const m = rk.mine;
      if (!m || !m.key) throw new Error('Connecting MT5 isn\'t open yet.');
      if (!window.crypto || !crypto.subtle) throw new Error('This phone can\'t encrypt the password here. Update Telegram and try again.');
      const secret = await rkSeal(m.key, { v: 1, login: account.login, server: account.server, password: $('mtPassword').value });
      $('mtPassword').value = '';
      button.textContent = 'CONNECTING…';
      await pbSend('/api/mt5', { login: account.login, server: account.server, secret, keyId: m.keyId, nick, public: rk.form.public, consent: true });
    }
    rkSheet(false);
    pbToast('Connected. TCP reads your account on its next run, and the bot messages you when it\'s done.');
    await rkMineLoad(true);
    rkLoad(true);
  } catch (err) {
    rkFormError(err.message, err.field);
    if (err.field === 'password' && err.code === 'invalid') rkMineLoad(true); // the key may have changed
  } finally {
    rk.busy = false;
    button.disabled = false;
    button.textContent = 'ENCRYPT AND CONNECT';
  }
}

async function rkChange(body) {
  if (demo) return rkDemoChange(body);
  await pbSend('/api/mt5/settings', body);
}

async function rkAct(act) {
  haptic();
  const l = rk.mine && rk.mine.link;
  try {
    if (act === 'connect') return rkSheet(true);
    if (act === 'rename') {
      rk.renaming = !rk.renaming;
      rkAccount();
      if (rk.renaming) $('mtRename').focus();
      return;
    }
    if (act === 'save-name') {
      const nick = cleanNick($('mtRename').value);
      if (!nick) {
        $('mtRenameError').textContent = '2 to 20 letters or numbers, and not one that looks like TCP\'s own.';
        $('mtRenameError').hidden = false;
        return;
      }
      await rkChange({ nick });
      rk.renaming = false;
      pbToast(`You're ${nick} on the leaderboard now.`);
    }
    if (act === 'public') {
      await rkChange({ public: !l.public });
      pbToast(l.public ? 'You\'re off the leaderboard. Your stats still show here.' : 'You\'re on the leaderboard.');
    }
    if (act === 'disconnect') {
      if (!(await pbConfirm('Disconnect MT5? Your link and every day recorded for it are deleted. You can connect again any time.'))) return;
      if (demo) rkDemoChange({ disconnect: true });
      else await pbSend('/api/mt5/disconnect', {});
      pbToast('Disconnected. Your link and its record are deleted.');
    }
    await rkMineLoad(true);
    rkLoad(true);
  } catch (err) {
    if (act === 'save-name' && $('mtRenameError')) {
      $('mtRenameError').textContent = err.message;
      $('mtRenameError').hidden = false;
    } else pbToast(err.message);
  }
}

async function rkHide(nick, hidden) {
  haptic();
  if (hidden && !(await pbConfirm(`Take ${nick} off the leaderboard? They keep their own stats, and can't put themselves back.`))) return;
  try {
    if (!demo) await pbSend('/api/ranks/hide', { nick, hidden });
    pbToast(hidden ? `${nick} is off the leaderboard.` : `${nick} can show on the leaderboard again.`);
    rkLoad(true);
  } catch (err) {
    pbToast(err.message);
  }
}

function rkInit() {
  $('rkPeriod').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    haptic();
    rk.period = b.dataset.v;
    store.set('rk.period', rk.period);
    rkRender();
  });
  $('rkWhen').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    haptic();
    rk.when[rk.period] = b.dataset.v === RK_TABLES[rk.period][1];
    rkRender();
  });
  $('rkBy').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    haptic();
    rk.by = b.dataset.v;
    rkRender();
  });
  $('rkBoard').addEventListener('click', (e) => {
    const b = e.target.closest('[data-hide]');
    if (b) rkHide(b.dataset.hide, true);
  });
  $('rkHidden').addEventListener('click', (e) => {
    const b = e.target.closest('[data-unhide]');
    if (b) rkHide(b.dataset.unhide, false);
  });
  $('rkJoinGo').addEventListener('click', () => { haptic(); showTab('account'); rkSheet(true); });
  $('mtBody').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (b) rkAct(b.dataset.act);
  });
  $('mtBody').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'mtRename') rkAct('save-name'); });
  $('mtClose').addEventListener('click', () => rkSheet(false));
  $('mtSheet').addEventListener('click', (e) => { if (e.target === $('mtSheet')) rkSheet(false); });
  $('mtPublic').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    haptic();
    rk.form.public = b.dataset.v === 'on';
    rkFormSync();
  });
  $('mtSubmit').addEventListener('click', rkSubmit);
  $('mtSheet').addEventListener('input', () => { if (!$('mtError').hidden) rkFormError(''); });
  const saved = store.get('rk.period');
  if (RK_TABLES[saved]) rk.period = saved;
  window.addEventListener('resize', () => { if (rk.mine && rk.mine.stats && !$('account').hidden) rkDrawCurve(1); });
}

// --------------------------------------------------------------------- demo
// Made-up traders whose days are a random walk with no edge, so about as many finish red as green,
// as a table with no skill in it should. The demo's own account is one of them.
function rkDemo() {
  if (rk.demo) return rk.demo;
  let seed = 20260928;
  const random = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const normal = () => Math.sqrt(-2 * Math.log(random() || 1e-9)) * Math.cos(2 * Math.PI * random());
  const today = dayKey(clock(), MARKETS.XAUUSD);
  const names = ['Aurum', 'Pip Hunter', 'Asia Range', 'Night Owl', 'Wick Reader', 'London Open', 'Slow Money', 'Zone Sniper', 'Mean Revert',
    'Trend Friend', 'Quiet Hands', 'Sweep Seeker', 'Rollover', 'Fib Pocket', 'Round Number', 'The Patient', 'Late Entry', 'Demo Trader'];
  const traders = names.map((nick, i) => {
    const size = 0.003 + random() * 0.02; // each trader's own risk
    const days = [];
    for (let back = 70; back >= 1; back--) {
      const day = new Date(Date.parse(today + 'T12:00:00Z') - back * 864e5).toISOString().slice(0, 10);
      if ([0, 6].includes(new Date(day + 'T12:00:00Z').getUTCDay()) || random() < 0.35) continue;
      const trades = 1 + Math.floor(random() * 4);
      const ret = Math.max(-0.2, normal() * size);
      const won = Math.min(trades, Math.max(0, Math.round(trades / 2 + normal() * 0.8 + (ret > 0 ? 0.5 : -0.5))));
      days.push(cleanDay({ day, ret, trades, won, lost: trades - won, gw: Math.abs(ret) * 1.4, gl: Math.abs(ret) * 1.4 - ret }));
    }
    return { id: i, nick, open: Math.round(normal() * size * 1.5 * 1e4) / 1e4, days: days.filter(Boolean) };
  });
  const state = new URLSearchParams(location.search).get('mt');
  rk.demo = { traders, me: traders.length - 1, state: ['none', 'pending', 'failed', 'closed'].includes(state) ? state : 'active', public: true };
  rkDemoBuild();
  return rk.demo;
}

function rkDemoBuild() {
  const dm = rk.demo;
  const p = currentPeriods(dayKey(clock(), MARKETS.XAUUSD));
  const connected = dm.state === 'active';
  const traders = dm.traders.filter((t) => t.id !== dm.me || (connected && dm.public));
  const tables = {};
  for (const k of Object.keys(RANKS.periods)) {
    const rows = traders.map((t) => ({ id: t.id, nick: t.nick, open: t.open, ...periodStats(inPeriod(t.days, k, p[k])) }));
    tables[k] = { ...periodRange(k, p[k]), key: p[k], ...viewTable(rankTable(rows), dm.me), steady: k === 'day' ? null : viewTable(rankTable(rows, 'score'), dm.me) };
  }
  dm.ranks = { ready: true, open: true, canHide: false, periods: p, tables, connected: traders.length, synced: clock() - 540, top: RANKS.top, steadyDays: RANKS.steady };
  const mine = dm.traders[dm.me];
  const since = mine.days.length ? mine.days[0].day : p.day;
  const link = { nick: mine.nick, broker: 'puprime', brokerName: 'PU Prime', server: 'PUPrime-Live 3', login: '••••5678', public: dm.public, hidden: false, open: connected ? mine.open : null, since, synced: connected ? clock() - 540 : null, error: null };
  if (dm.state === 'none' || dm.state === 'closed') dm.mine = { ready: true, open: dm.state === 'none', key: null, keyId: null, tries: RANKS.tries, link: null };
  else if (dm.state === 'pending') dm.mine = { ready: true, open: true, tries: RANKS.tries, link: { ...link, status: 'pending', since: p.day }, stats: personalStats([]), periods: null };
  else if (dm.state === 'failed') dm.mine = { ready: true, open: true, tries: RANKS.tries, link: { ...link, status: 'failed', error: 'TCP couldn\'t log in to your MT5 account: the account number, server or investor password looks wrong. Reconnect under Account in the terminal.' }, stats: personalStats([]), periods: null };
  else {
    const periods = Object.fromEntries(Object.keys(RANKS.periods).map((k) => [k, { key: p[k], ...periodStats(inPeriod(mine.days, k, p[k])) }]));
    dm.mine = { ready: true, open: true, tries: RANKS.tries, link: { ...link, status: 'active' }, stats: personalStats(mine.days), periods };
  }
}

function rkDemoConnect(account, nick, isPublic) {
  const dm = rkDemo();
  dm.traders[dm.me].nick = nick;
  dm.public = isPublic;
  dm.state = 'pending';
  rkDemoBuild();
  setTimeout(() => { dm.state = 'active'; rkDemoBuild(); rkMineLoad(true); rkLoad(true); pbToast('✅ TCP can see your MT5 account now, read-only. (Demo)'); }, 5000);
}

function rkDemoChange(body) {
  const dm = rkDemo();
  if (body.disconnect) dm.state = 'none';
  if (body.nick) dm.traders[dm.me].nick = body.nick;
  if (typeof body.public === 'boolean') dm.public = body.public;
  rkDemoBuild();
}
