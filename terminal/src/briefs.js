// TCP Quant Terminal: session briefs, on the Worker.
//
// Before each session opens, Lewis sends TCP AI his charts from the app. It reads them with
// the terminal's own numbers and drafts the brief: a headline, the bias, the zones to watch and
// a plan. Lewis checks and edits it, and only then does it post to the Inner Circle. After the
// session each zone is reviewed from one-minute bars and the wrap is posted as a reply. What
// Lewis corrected, his reading guide and the zone record go into the next read: that is how
// TCP AI learns his charts.
//   GET  /api/briefs                   the briefs, the zone record and what TCP AI has learned
//   POST /api/briefs                   charts in (posters): kept in Telegram, read by TCP AI
//   POST /api/briefs/<id>/read         read them again, after a read that failed
//   POST /api/briefs/<id>/post         the checked brief, posted to the Inner Circle
//   POST /api/briefs/<id>/discard      drop a draft
//   GET  /api/briefs/<id>/chart        the chart that went out with a brief
//   GET  /api/briefs/<id>/chart/<k>    any of a brief's charts (posters)
//   POST /api/briefs/teach             a poster's reading guide and reminders, a lesson, or forgetting one
//   POST /api/briefs/export            every brief and lesson as JSON lines, sent to the poster by the bot
//   scheduled()                        every 5 minutes: reminders, unfinished reads, session reviews
//
// Settings, in the Worker's environment:
//   ANTHROPIC_API_KEY  secret: TCP AI's key, from console.anthropic.com. Without it, posters
//                      write their briefs themselves and everything else works the same
//   BRIEF_MODEL        optional: the Claude model that reads the charts (default claude-opus-5)
//   BRIEF_MODE         "live" posts to the Inner Circle and counts in the record. Anything else,
//                      the default, is a test: posted to the team group, left out of the record
//   BRIEF_THREAD_ID    optional: the Inner Circle topic for briefs and wraps
//   TERMINAL_URL       optional: the terminal's address, for the reminder's button (otherwise
//                      it's learned when a poster opens the app)
//   DB, POSTER_IDS     as for the Playbook
import Anthropic, { toFile } from '@anthropic-ai/sdk';
import { MARKETS, SESSIONS, varianceBetween, fmtNum, fmtDuration } from './lib.js';
import {
  BRIEF, briefDefault, briefWindow, briefReminders, briefAsk, briefSession, briefClip, cleanZones,
  zoneOdds, reviewBrief, briefStats,
} from './brief-lib.js';

// telegram(env, method, payload) calls the Bot API; sendFiles(env, method, fields, files) does
// the same with files attached ([{ field, blob, name }]); loadMarket(env, symbol, at) is the
// terminal's market data; minuteBars(env, symbol, from, to) gives { bars, step }.
export function createBriefs({ telegram, sendFiles, loadMarket, minuteBars }) {
  const SCHEMA = [
    `CREATE TABLE IF NOT EXISTS briefs (
      id INTEGER PRIMARY KEY, created INTEGER NOT NULL, author_id INTEGER NOT NULL, author TEXT NOT NULL,
      session TEXT NOT NULL, day TEXT NOT NULL, opens INTEGER NOT NULL, closes INTEGER NOT NULL, symbol TEXT NOT NULL,
      note TEXT NOT NULL, context TEXT NOT NULL, charts TEXT NOT NULL, status TEXT NOT NULL, test INTEGER NOT NULL,
      model TEXT, usage TEXT, error TEXT, attempts INTEGER NOT NULL DEFAULT 0, read_at INTEGER, read TEXT, draft TEXT,
      final TEXT, lesson TEXT, posted INTEGER, price REAL, chat TEXT, thread INTEGER, message INTEGER, photo TEXT,
      review TEXT, reviewed INTEGER, wrap INTEGER)`,
    'CREATE INDEX IF NOT EXISTS briefs_status ON briefs (status)',
    `CREATE TABLE IF NOT EXISTS brief_people (
      author_id INTEGER PRIMARY KEY, guide TEXT NOT NULL, prefs TEXT NOT NULL, updated INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS brief_lessons (
      i INTEGER PRIMARY KEY, author_id INTEGER NOT NULL, created INTEGER NOT NULL, brief INTEGER, kind TEXT NOT NULL, text TEXT NOT NULL)`,
    'CREATE TABLE IF NOT EXISTS brief_kv (key TEXT PRIMARY KEY, value TEXT NOT NULL, at INTEGER NOT NULL)',
  ];
  const MODEL = 'claude-opus-5';
  // Models that take the server-side fallback: a request one of them declines runs on the model
  // Anthropic recommends for that case, in the same call.
  const FALLBACK = new Set(['claude-opus-5', 'claude-opus-5-5', 'claude-fable-5', 'claude-fable-5-1']);
  // US dollars per million input and output tokens, for the cost shown to posters.
  const PRICES = {
    'claude-opus-5': [5, 25], 'claude-opus-5-5': [4, 20], 'claude-fable-5': [10, 50], 'claude-fable-5-1': [10, 50],
    'claude-opus-4-8': [5, 25], 'claude-sonnet-5': [2, 10], 'claude-haiku-4-5': [1, 5],
  };
  const MAX_CHART = 8e6;
  const DAILY_READS = 12; // per poster per day, a cap on cost
  const LESSONS = 15; // the newest lessons that go into each read
  const VIEW_TTL = 15;
  const ready = new WeakSet();
  const views = new Map();
  let origin = null;

  const reply = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  const refuse = (message, field, status = 400) => reply({ error: 'invalid', message, field }, status);
  const liveMode = (env) => env.BRIEF_MODE === 'live';
  const posterIds = (env) => String(env.POSTER_IDS || '').split(/[\s,]+/).filter(Boolean).map(Number);
  const nameOf = (user) => [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'TCP';
  const round = (v, d = 3) => (Number.isFinite(v) ? Math.round(v * 10 ** d) / 10 ** d : null);
  const parse = (text, fallback) => { try { return text ? JSON.parse(text) : fallback; } catch { return fallback; } };

  async function prepare(env) {
    if (ready.has(env.DB)) return;
    await env.DB.batch(SCHEMA.map((sql) => env.DB.prepare(sql)));
    ready.add(env.DB);
  }

  // ---------------------------------------------------------------- storage
  function fromRow(row) {
    const context = parse(row.context, {});
    return {
      id: row.id, created: row.created, authorId: row.author_id, author: row.author, session: row.session, day: row.day,
      opens: row.opens, closes: row.closes, symbol: row.symbol, note: row.note, context, weekly: !!context.weekly,
      charts: parse(row.charts, []), status: row.status, test: !!row.test, model: row.model, usage: parse(row.usage, null),
      error: row.error, attempts: row.attempts, readAt: row.read_at, read: parse(row.read, null), draft: parse(row.draft, null),
      final: parse(row.final, null), lesson: row.lesson, posted: row.posted, price: row.price, chat: row.chat,
      thread: row.thread, message: row.message, photo: row.photo, review: parse(row.review, null), reviewed: row.reviewed, wrap: row.wrap,
    };
  }

  const costOf = (model, u) => {
    const p = PRICES[model];
    if (!p || !u) return null;
    const input = (u.input_tokens || 0) + 1.25 * (u.cache_creation_input_tokens || 0) + 0.1 * (u.cache_read_input_tokens || 0);
    return round((input * p[0] + (u.output_tokens || 0) * p[1]) / 1e6, 4);
  };

  // What the page gets. Members see posted live briefs; posters also see drafts, TCP AI's read,
  // what the read cost, and the charts they sent.
  function shown(b, poster) {
    const out = {
      id: b.id, session: b.session, day: b.day, opens: b.opens, closes: b.closes, symbol: b.symbol, author: b.author,
      status: b.status, test: b.test, created: b.created, posted: b.posted, price: b.price, final: b.final, photo: !!b.photo,
      ai: !!b.model, review: b.review, reviewed: b.reviewed,
    };
    if (!poster) return out;
    return {
      ...out, note: b.note, charts: b.charts.map((c) => ({ k: c.k, kept: !!c.file })), read: b.read, draft: b.draft,
      model: b.model, cost: costOf(b.model, b.usage), error: b.error, lesson: b.lesson, atr: b.context.atr ?? null,
    };
  }

  const kvGet = async (env, key) => (await env.DB.prepare('SELECT value FROM brief_kv WHERE key = ?').bind(key).first())?.value ?? null;
  const kvSet = (env, key, value, at) =>
    env.DB.prepare('INSERT INTO brief_kv (key, value, at) VALUES (?, ?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value, at = excluded.at')
      .bind(key, value, at).run();

  const defaultPrefs = (env) => ({ remind: !!env.ANTHROPIC_API_KEY, sessions: BRIEF.sessions.map((s) => s.id), lead: BRIEF.lead });
  async function personOf(env, id) {
    const row = await env.DB.prepare('SELECT guide, prefs FROM brief_people WHERE author_id = ?').bind(id).first();
    return { guide: row ? row.guide : '', prefs: { ...defaultPrefs(env), ...(row ? parse(row.prefs, {}) : {}) } };
  }
  const lessonsOf = async (env, id, limit) => (await env.DB.prepare(
    'SELECT i, created, brief, kind, text FROM brief_lessons WHERE author_id = ? ORDER BY i DESC LIMIT ?',
  ).bind(id, limit).all()).results;

  // ------------------------------------------------------------ TCP AI's read
  const SYSTEM = [
    'You are TCP AI, the chart reader for TCP – The Crypto Playbook, a trading community. Shortly before a trading',
    'session opens, one of its analysts sends you screenshots of their TradingView charts: one market on several',
    'timeframes, usually with their own indicator drawn on it and its panel of readings.',
    '',
    'First, read the charts. For each one: its timeframe, the latest price on its price scale, the direction of the move,',
    'the zones and levels drawn with their prices, and every row of any indicator panel exactly as written. Numbers must',
    'come from what is printed on the chart: labels, the price scale, the panel. If something is not legible, list it',
    'under "unreadable"; never estimate a price you cannot read. When the same panel appears on several charts, read the',
    'clearest.',
    '',
    'Then draft the analyst\'s brief for the session, in their voice, for the members of the community: a one-line',
    'headline; the bias (long, short or neutral) with its reason in a sentence; up to five zones to watch, each with its',
    'exact low and high (a single level has the same low and high), what it is and why it matters; and a plan of two to',
    'four short if-then lines for the session. Kinds of zone: demand (below price, where buyers stepped in), supply',
    '(above price, where sellers did), liquidity (a high or low where stops rest, such as a session, day or week extreme',
    'or a major swing) and level (any other single price that matters). Base all of it on what the charts and the',
    'terminal\'s numbers show. Do not add percentages or odds (the terminal adds its own), promise outcomes, or tell',
    'anyone what size to trade.',
    '',
    'The analyst checks and edits your draft before anything is posted, and their corrections from earlier briefs are',
    'below: follow them. Write in plain British English, briefly, with prices in the market\'s decimals.',
  ].join('\n');

  const nullable = (type) => ({ anyOf: [{ type }, { type: 'null' }] });
  const text = (description) => ({ type: 'string', description });
  const READ = {
    type: 'object',
    additionalProperties: false,
    required: ['charts', 'panel', 'headline', 'bias', 'reason', 'zones', 'plan', 'chart_to_post', 'unreadable', 'confidence'],
    properties: {
      charts: {
        type: 'array',
        description: 'One entry per chart, in the order they were sent.',
        items: {
          type: 'object', additionalProperties: false, required: ['chart', 'timeframe', 'price', 'trend', 'summary'],
          properties: {
            chart: { type: 'integer', description: 'The chart\'s number.' },
            timeframe: text('As shown on the chart, e.g. 15m, 1H, 4H, 1D.'),
            price: { ...nullable('number'), description: 'The latest price on the price scale, or null if not legible.' },
            trend: { type: 'string', enum: ['up', 'down', 'sideways', 'unclear'] },
            summary: text('What this chart shows, in a sentence or two.'),
          },
        },
      },
      panel: {
        type: 'array',
        description: 'Every row of the indicator panel, exactly as written, from the clearest chart. Empty if there is no panel.',
        items: {
          type: 'object', additionalProperties: false, required: ['section', 'row', 'value'],
          properties: { section: text('The panel section the row is in.'), row: text('The row\'s name.'), value: text('Its value or values, as written.') },
        },
      },
      headline: text('One line for members.'),
      bias: { type: 'string', enum: ['long', 'short', 'neutral'] },
      reason: text('The reason for the bias, in a sentence.'),
      zones: {
        type: 'array',
        description: 'Up to five zones to watch this session.',
        items: {
          type: 'object', additionalProperties: false, required: ['kind', 'low', 'high', 'timeframe', 'label', 'why'],
          properties: {
            kind: { type: 'string', enum: ['demand', 'supply', 'liquidity', 'level'] },
            low: { type: 'number' },
            high: { type: 'number' },
            timeframe: text('The timeframe the zone is from.'),
            label: text('A short name for members, e.g. "4H demand" or "Asia high".'),
            why: text('Why it matters, in a few words.'),
          },
        },
      },
      plan: { type: 'array', description: 'Two to four short if-then lines for the session.', items: { type: 'string' } },
      chart_to_post: { type: 'integer', description: 'The number of the chart that best shows the plan, to go out with the brief.' },
      unreadable: { type: 'array', items: { type: 'string' }, description: 'Anything that could not be read.' },
      confidence: { type: 'string', enum: ['high', 'medium', 'low'], description: 'How sure you are of the read.' },
    },
  };

  // '15', '15m', 'M15' -> '15M'; '60', '1h', 'H1' -> '1H'; 'D', '1D', 'daily' -> '1D'.
  function tfName(value) {
    const t = String(value || '').toUpperCase().replace(/\s+/g, '');
    let m = t.match(/^([MHDW])(\d+)$/);
    const s = m ? m[2] + m[1] : t;
    m = s.match(/^(\d*)(M|MIN|MINS|MINUTES?|H|HR|HRS|HOURS?|D|DAY|DAILY|W|WK|WEEK|WEEKLY)?$/);
    if (!m) return briefClip(value, 12);
    const n = Number(m[1] || 1);
    const unit = (m[2] || 'M')[0];
    if (unit === 'M') return n % 1440 === 0 ? `${n / 1440}D` : n % 60 === 0 ? `${n / 60}H` : `${n}M`;
    return `${n}${unit}`;
  }

  // Up to four plan lines, from lines of text or a list, bullets and blanks dropped.
  function planLines(input) {
    const raw = Array.isArray(input) ? input : String(input ?? '').split('\n');
    const lines = raw.map((l) => briefClip(String(l).replace(/^\s*(?:[-*•–·]|\d+[.)])\s*/, ''), 240)).filter(Boolean).slice(0, 4);
    let total = 0;
    return lines.filter((l) => (total += l.length) <= BRIEF.text.plan);
  }

  // The terminal's numbers for the read, as text.
  function contextText(b, ask, at) {
    const m = MARKETS[b.symbol];
    const c = b.context;
    const f = (v) => fmtNum(v, m.digits);
    const s = briefSession(b.session);
    const opens = b.opens - at;
    const lines = [
      `Market: ${b.symbol} (${m.name}). Session: ${s.name}, ${opens > 0 ? `opens in ${fmtDuration(opens)}` : `opened ${fmtDuration(-opens)} ago`}, closes in ${fmtDuration(b.closes - at)}.`,
      `The analyst was asked for these timeframes: ${ask.join(', ')}.`,
      '',
      `The terminal's numbers now, from ${c.source || 'its feed'} (a broker's chart can differ a little):`,
      `price ${f(c.price)}; today's range ${f(c.dayHigh)} to ${f(c.dayLow)}` +
        (c.rangePct != null ? `, ${Math.round(c.rangePct)}% of an average day` : '') + `; average daily range ${f(c.atr)}`,
    ];
    if (c.levels && c.levels.length) lines.push(c.levels.map((l) => `${l.name} ${f(l.price)}`).join('; '));
    if (c.state) {
      lines.push(`volatility rank ${Math.round(c.state.vol * 100)}%; trend efficiency ${c.state.trend} (0 choppy, 1 one-way); ` +
        `momentum ${['h1', 'h4', 'h24'].map((k) => `${k.slice(1)}h ${c.state.momentum[k] > 0 ? '+' : ''}${c.state.momentum[k]}`).join(', ')} (standard deviations)`);
    }
    return lines;
  }

  function recordText(st) {
    if (!st || !st.zones) return [];
    const row = (g) => `- ${g.key}: ${g.zones} zones, ${g.reached} reached (a random walk: ${g.expected})` +
      (g.turns ? `, average turn ${g.turn > 0 ? '+' : ''}${g.turn} over ${g.turns}` : '');
    return ['', 'How the zones in their posted briefs have done so far: how many price reached against how many a random walk would, ' +
      'and the average turn back after reaching them, in average daily ranges (above zero, they held price back). Small counts are mostly noise.',
    ...st.byKind.map(row)];
  }

  // Charts go to Anthropic's Files API once (no re-sending a picture on a retry) and are kept a week.
  async function uploadCharts(client, env, b, blobs) {
    for (const c of b.charts) {
      if (c.anthropic) continue;
      const blob = blobs ? blobs[c.k - 1] : await keptBlob(env, c.file);
      if (!blob) throw failed('The charts weren\'t kept, so they can\'t be read again: send them again.');
      const type = pictureType(new Uint8Array(await blob.slice(0, 12).arrayBuffer())) || 'image/jpeg';
      const file = await client.files.upload({
        file: await toFile(blob, `brief-${b.id}-chart-${c.k}.${type.slice(6).replace('jpeg', 'jpg')}`, { type }),
        expires_in_seconds: 7 * 86400,
      });
      c.anthropic = file.id;
    }
  }

  // What went wrong, in words for the poster; the log gets the status only.
  function readFailure(err) {
    if (err instanceof Anthropic.AuthenticationError) return 'TCP AI\'s key was refused: check ANTHROPIC_API_KEY in Cloudflare.';
    if (err instanceof Anthropic.PermissionDeniedError) return 'TCP AI\'s key isn\'t allowed to do this: check the Anthropic account.';
    if (err instanceof Anthropic.RateLimitError) return 'TCP AI is busy: try again in a minute.';
    if (err instanceof Anthropic.BadRequestError) return 'TCP AI couldn\'t take these charts. Try sending them again.';
    if (err instanceof Anthropic.APIConnectionTimeoutError) return 'TCP AI took too long to answer: try again.';
    if (err instanceof Anthropic.APIConnectionError) return 'TCP AI couldn\'t be reached: try again in a minute.';
    if (err instanceof Anthropic.APIError) return 'TCP AI had a problem: try again in a minute.';
    return err && err.poster ? err.message : 'TCP AI\'s read didn\'t work: try again.';
  }
  const failed = (message) => Object.assign(new Error(message), { poster: true });

  async function askClaude(env, b, content) {
    // The key and address are set here, so nothing in the environment can change where charts go.
    const client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY, authToken: null, baseURL: 'https://api.anthropic.com',
      fetch: (url, init) => fetch(url, init), maxRetries: 1, timeout: 170e3,
    });
    return { client, send: async () => {
      const model = env.BRIEF_MODEL || MODEL;
      // One request, not streamed: the answer is a few thousand tokens, and parsing one reply
      // costs the Worker far less CPU than thousands of stream events.
      const request = {
        model, max_tokens: 16000, system: SYSTEM,
        output_config: { effort: 'high', format: { type: 'json_schema', schema: READ } },
        messages: [{ role: 'user', content: content() }],
      };
      const res = FALLBACK.has(model)
        ? await client.beta.messages.create({ ...request, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
        : await client.messages.create(request);
      if (res.stop_reason === 'refusal') throw failed('TCP AI declined to read these charts.');
      if (res.stop_reason === 'max_tokens') throw failed('TCP AI\'s read was cut short: try again.');
      const answer = res.content.filter((x) => x.type === 'text').map((x) => x.text).join('');
      const raw = parse(answer, null);
      if (!raw || typeof raw !== 'object') throw failed('TCP AI\'s answer didn\'t come back in shape: try again.');
      return { raw, model: res.model || model, usage: res.usage };
    } };
  }

  // TCP AI's read as a draft for the poster: the zones checked like the poster's own, the odds
  // of reaching each from the price when the charts came in, and anything worth a second look.
  function draftOf(raw, b) {
    const c = b.context;
    const m = MARKETS[b.symbol];
    const f = (v) => fmtNum(v, m.digits);
    const n = b.charts.length;
    const charts = (Array.isArray(raw.charts) ? raw.charts : []).slice(0, n).map((x) => ({
      chart: Number.isInteger(x.chart) ? x.chart : null, timeframe: tfName(x.timeframe),
      price: Number.isFinite(x.price) && x.price > 0 ? x.price : null,
      trend: ['up', 'down', 'sideways', 'unclear'].includes(x.trend) ? x.trend : 'unclear', summary: briefClip(x.summary, 400),
    }));
    const panel = (Array.isArray(raw.panel) ? raw.panel : []).slice(0, 80)
      .map((p) => ({ section: briefClip(p && p.section, 40), row: briefClip(p && p.row, 60), value: briefClip(p && p.value, 80) }))
      .filter((p) => p.row || p.value);
    const { zones, dropped } = cleanZones((Array.isArray(raw.zones) ? raw.zones : []).map((z) => ({ ...z, tf: z && z.timeframe })),
      { symbol: b.symbol, price: c.price, atr: c.atr });
    const warnings = dropped.map((d) => `Left out ${d.zone}: ${d.why}.`);
    const prices = charts.map((x) => x.price).filter(Boolean).sort((x, y) => x - y);
    if (prices.length && c.price > 0) {
      const mid = prices[Math.floor(prices.length / 2)];
      if (Math.abs(mid - c.price) > Math.max(0.3 * (c.atr || 0), c.price * 0.002)) {
        warnings.push(`The charts show about ${f(mid)} but the price is ${f(c.price)}: are they today's?`);
      }
    }
    const seen = new Set(charts.map((x) => x.timeframe));
    const missing = briefAsk(b.weekly ? { weekly: true } : null).filter((t) => !seen.has(t));
    if (charts.length && missing.length) warnings.push(`Not among the charts: ${missing.join(', ')}.`);
    if (raw.confidence === 'low') warnings.push('TCP AI wasn\'t confident in this read: check it closely.');
    const hourly = charts.find((x) => x.timeframe === '1H' || x.timeframe === '15M');
    const chart = Number.isInteger(raw.chart_to_post) && raw.chart_to_post >= 1 && raw.chart_to_post <= n
      ? raw.chart_to_post : hourly && hourly.chart >= 1 && hourly.chart <= n ? hourly.chart : 1;
    return {
      read: {
        charts, panel, confidence: ['high', 'medium', 'low'].includes(raw.confidence) ? raw.confidence : null,
        unreadable: (Array.isArray(raw.unreadable) ? raw.unreadable : []).slice(0, 12).map((u) => briefClip(u, 160)).filter(Boolean),
      },
      draft: {
        headline: briefClip(raw.headline, BRIEF.text.headline),
        bias: ['long', 'short', 'neutral'].includes(raw.bias) ? raw.bias : 'neutral',
        reason: briefClip(raw.reason, BRIEF.text.reason),
        zones: zones.map((z) => ({ ...z, odds: round(zoneOdds(z, c.price, c.variance), 3) })),
        plan: planLines(raw.plan),
        chart,
        warnings,
      },
    };
  }

  // Reads a brief's charts: `blobs` are the pictures just sent, or, on a retry, they come back
  // from Telegram. Saves the draft, or the reason it failed, and returns the brief.
  async function runRead(env, b, blobs, at) {
    const person = await personOf(env, b.authorId);
    const lessons = await lessonsOf(env, b.authorId, LESSONS);
    const stats = briefStats(await recordRows(env));
    await env.DB.prepare('UPDATE briefs SET status = ?, read_at = ?, attempts = attempts + 1, error = NULL WHERE id = ?')
      .bind('reading', at, b.id).run();
    b.status = 'reading';
    try {
      const ask = briefAsk(b.weekly ? { weekly: true } : null);
      const { client, send } = await askClaude(env, b, () => {
        const blocks = [];
        for (const c of b.charts) {
          blocks.push({ type: 'text', text: `Chart ${c.k}` });
          blocks.push({ type: 'image', source: { type: 'file', file_id: c.anthropic } });
        }
        const lines = contextText(b, ask, at);
        if (person.guide) lines.push('', 'The analyst\'s guide to reading their charts:', '<guide>', person.guide, '</guide>');
        if (lessons.length) lines.push('', 'What the analyst corrected or taught you before, newest first:', ...lessons.map((l) => `- ${l.text}`));
        lines.push(...recordText(stats));
        if (b.note) lines.push('', `The analyst's note for this session: ${b.note}`);
        lines.push('', 'Read the charts and draft the brief.');
        blocks.push({ type: 'text', text: lines.join('\n') });
        return blocks;
      });
      await uploadCharts(client, env, b, blobs);
      await env.DB.prepare('UPDATE briefs SET charts = ? WHERE id = ?').bind(JSON.stringify(b.charts), b.id).run();
      const { raw, model, usage } = await send();
      const { read, draft } = draftOf(raw, b);
      Object.assign(b, { status: 'draft', read, draft, model, usage, error: null });
      await env.DB.prepare("UPDATE briefs SET status = 'draft', read = ?, draft = ?, model = ?, usage = ?, error = NULL WHERE id = ? AND status = 'reading'")
        .bind(JSON.stringify(read), JSON.stringify(draft), model, JSON.stringify(usage || null), b.id).run();
    } catch (err) {
      console.error(`brief ${b.id} read failed: ${err && err.status ? `HTTP ${err.status}` : err && err.message}`);
      b.status = 'failed';
      b.error = readFailure(err);
      await env.DB.prepare("UPDATE briefs SET status = 'failed', error = ? WHERE id = ? AND status = 'reading'").bind(b.error, b.id).run();
    }
    views.clear();
    return b;
  }

  // ---------------------------------------------------------------- Telegram
  // A picture's type from its first bytes: JPEG, PNG or WebP, or null.
  function pictureType(b) {
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
    if (String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return 'image/webp';
    return null;
  }
  const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const KIND_ICON = { demand: '🟢', supply: '🔴', liquidity: '🟡', level: '⚪' };

  async function keptBlob(env, fileId) {
    if (!fileId) return null;
    const file = await telegram(env, 'getFile', { file_id: fileId });
    if (!file.ok) return null;
    const res = await fetch(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${file.result.file_path}`);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    return new Blob([bytes], { type: pictureType(bytes) || 'image/jpeg' });
  }

  // The charts, kept as files (not recompressed photos) in the poster's chat with the bot, or
  // in the team group if the bot can't message them. Returns each chart's Telegram file id.
  async function keep(env, user, b, blobs) {
    const s = briefSession(b.session);
    const caption = `📥 ${s.name} brief #${b.id} · ${b.symbol} · ${blobs.length} chart${blobs.length === 1 ? '' : 's'}, as TCP AI got them`;
    const files = blobs.map((blob, i) => ({ field: `chart${i + 1}`, blob, name: `brief-${b.id}-chart-${i + 1}.jpg` }));
    for (const chat of [user.id, env.ADMIN_CHAT_ID].filter(Boolean)) {
      const res = files.length === 1
        ? await sendFiles(env, 'sendDocument', { chat_id: chat, caption, disable_notification: true }, [{ ...files[0], field: 'document' }])
        : await sendFiles(env, 'sendMediaGroup', {
          chat_id: chat, disable_notification: true,
          media: files.map((f, i) => ({ type: 'document', media: `attach://${f.field}`, ...(i === files.length - 1 ? { caption } : {}) })),
        }, files);
      if (res.ok) return (Array.isArray(res.result) ? res.result : [res.result]).map((m) => (m.document ? m.document.file_id : null));
    }
    return [];
  }

  const f = (b, v) => fmtNum(v, MARKETS[b.symbol].digits);
  const range = (b, z) => (z.low === z.high ? f(b, z.low) : `${f(b, z.low)}–${f(b, z.high)}`);
  const zoneName = (z) => z.label || [z.tf, BRIEF.kinds[z.kind]].filter(Boolean).join(' ');
  const oddsText = (p) => (p >= 0.995 ? 'here now' : p < 0.005 ? '<1%' : `${Math.round(p * 100)}%`);

  function recordLine(st) {
    if (!st || !st.zones) return null;
    return `Zone record: ${st.reached} of ${st.zones} reached (a random walk: ${fmtNum(st.expected, 1)})` +
      (st.turn.n ? ` · average turn ${st.turn.avg > 0 ? '+' : st.turn.avg < 0 ? '−' : ''}${fmtNum(Math.abs(st.turn.avg), 2)} ATR` : '');
  }

  function postText(b, final, stats, at) {
    const s = briefSession(b.session);
    const opens = b.opens - at;
    const minutes = Math.round(opens / 60);
    const when = minutes >= 60 ? `OPENS IN ${Math.floor(minutes / 60)} H${minutes % 60 ? ` ${minutes % 60} MIN` : ''}`
      : minutes >= 1 ? `OPENS IN ${minutes} MIN` : opens > -300 ? 'IS OPENING' : 'IS OPEN';
    const zones = [...final.zones].sort((x, y) => y.high - x.high).map((z) =>
      `${KIND_ICON[z.kind]} <b>${range(b, z)}</b> · ${esc(zoneName(z))} · ${oddsText(z.odds)}${z.why ? `\n↳ <i>${esc(z.why)}</i>` : ''}`);
    return [
      b.test ? '🧪 <b>TEST</b> · only the team sees this\n' : null,
      `${s.icon} <b>${s.name.toUpperCase()} ${when}</b> · ${b.symbol}${b.weekly ? ' · week ahead' : ''}`,
      `<b>${esc(final.headline)}</b>`,
      `Bias: <b>${final.bias.toUpperCase()}</b>${final.reason ? ` · ${esc(final.reason)}` : ''}`,
      '',
      '<b>ZONES TO WATCH</b>',
      ...zones,
      '',
      '<b>PLAN</b>',
      ...final.plan.map((l) => `• ${esc(l)}`),
      '',
      `<i>% = the chance price reaches the zone before ${s.name} closes if it moves at random: reach, not direction.</i>`,
      stats ? recordLine(stats) : null,
      `#Brief #${s.name.replace(/\s+/g, '')} #${b.symbol}`,
      `<i>${b.model ? `Charts read by TCP AI, checked by ${esc(b.author)}` : `By ${esc(b.author)}`} · brief #${b.id} · not financial advice</i>`,
    ].filter((line) => line !== null).join('\n');
  }

  function wrapText(b, review, stats) {
    const s = briefSession(b.session);
    const lines = [...review.zones].sort((x, y) => y.high - x.high).map((z) => {
      const r = z.review;
      const head = `<b>${range(b, z)}</b> ${esc(zoneName(z))}`;
      if (r.reached === null) return `➖ ${head} · price was already there`;
      if (!r.reached) return `⬜ ${head} · not reached (${oddsText(z.odds)})`;
      return `✅ ${head} · reached after ${fmtDuration(r.at - b.posted)}, then ${f(b, r.away)} back, ${f(b, r.through)} on through`;
    });
    return [
      `${b.test ? '🧪 ' : ''}🏁 <b>${s.name.toUpperCase()} WRAP</b> · ${b.symbol} · brief #${b.id}`,
      '',
      ...lines,
      '',
      review.counted ? `Reached ${review.reached} of ${review.counted} · a random walk would reach ${fmtNum(review.expected, 1)}` : 'Price was inside every zone when the brief went out.',
      stats ? recordLine(stats) : null,
    ].filter((line) => line !== null).join('\n');
  }

  // Posts the brief: tests to the team group, live briefs to the Inner Circle (in the briefs'
  // topic, if set), with the chosen chart as a photo when it was kept.
  async function announce(env, b, text, photo) {
    const chat = b.test ? env.ADMIN_CHAT_ID : env.INNER_CIRCLE_CHAT_ID;
    const thread = b.test ? null : Number(env.BRIEF_THREAD_ID) || null;
    if (!chat) return { error: `${b.test ? 'ADMIN_CHAT_ID' : 'INNER_CIRCLE_CHAT_ID'} is not set` };
    const where = { chat_id: chat, ...(thread ? { message_thread_id: thread } : {}) };
    let fileId = null;
    if (photo) {
      const captioned = text.length <= 1024;
      const pic = await sendFiles(env, 'sendPhoto', captioned ? { ...where, caption: text, parse_mode: 'HTML' } : where, [{ field: 'photo', blob: photo, name: 'chart.jpg' }]);
      if (pic.ok) {
        const sizes = pic.result.photo || [];
        fileId = sizes.length ? sizes[sizes.length - 1].file_id : null;
        if (captioned) return { chat: String(chat), thread, message: pic.result.message_id, photo: fileId };
      }
    }
    const res = await telegram(env, 'sendMessage', { ...where, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
    if (!res.ok) return { error: res.description || 'Telegram refused the post', photo: fileId };
    return { chat: String(chat), thread, message: res.result.message_id, photo: fileId };
  }

  // ------------------------------------------------------------------ lessons
  // What the poster changed from TCP AI's draft, as one line for its memory.
  function editsOf(b, draft, final) {
    const changes = [];
    if (draft.bias !== final.bias) changes.push(`bias ${draft.bias} → ${final.bias}`);
    const same = (x, y) => x.kind === y.kind && x.low === y.low && x.high === y.high;
    const overlap = (x, y) => x.low <= y.high && y.low <= x.high;
    const used = new Set();
    for (const d of draft.zones) {
      if (final.zones.some((z) => same(z, d))) continue;
      const moved = final.zones.find((z) => !used.has(z) && !draft.zones.some((x) => same(x, z)) && overlap(z, d));
      if (moved) {
        used.add(moved);
        changes.push(`${zoneName(d)} ${range(b, d)} → ${moved.kind === d.kind ? '' : `${moved.kind} `}${range(b, moved)}`);
      } else changes.push(`removed ${zoneName(d)} ${range(b, d)}`);
    }
    for (const z of final.zones) {
      if (!draft.zones.some((d) => same(d, z)) && !used.has(z)) changes.push(`added ${zoneName(z)} ${range(b, z)} (${z.kind})`);
    }
    const flat = (lines) => lines.join(' ').toLowerCase().replace(/\s+/g, ' ');
    if (flat(draft.plan) !== flat(final.plan)) changes.push('rewrote the plan');
    if (!changes.length) return null;
    return briefClip(`${briefSession(b.session).name} ${b.day}, ${b.symbol}: ${changes.join('; ')}`, BRIEF.text.lesson);
  }

  // ------------------------------------------------------------------- routes
  // The zone record reads only the reviews: the charts, reads and drafts can be large, and the
  // Worker has 10 ms of CPU a request.
  const recordRows = async (env) => (await env.DB.prepare(
    "SELECT session, symbol, posted, test, review FROM briefs WHERE status = 'posted' AND review IS NOT NULL",
  ).all()).results.map((r) => ({ ...r, test: !!r.test, review: parse(r.review, null) }));

  async function view(env, poster, user, at) {
    const key = poster ? `poster:${user.id}` : 'member';
    const hit = views.get(key);
    if (hit && at - hit.at < VIEW_TTL) return hit.body;
    // The newest 40 briefs; TCP AI's read and draft only for the poster's unposted ones.
    const list = (await env.DB.prepare(
      `SELECT id, created, author, session, day, opens, closes, symbol, note, context, charts, status, test, model, usage, error,
         final, lesson, posted, price, photo, review, reviewed,
         CASE WHEN status IN ('reading', 'draft', 'failed') THEN read END AS read, CASE WHEN status IN ('reading', 'draft', 'failed') THEN draft END AS draft
       FROM briefs WHERE ${poster ? "status != 'discarded'" : "status = 'posted' AND test = 0"} ORDER BY id DESC LIMIT 40`,
    ).all()).results.map(fromRow);
    const counts = await env.DB.prepare(
      `SELECT (SELECT COUNT(*) FROM brief_lessons) AS lessons, (SELECT COUNT(*) FROM briefs WHERE status = 'posted' AND test = 0) AS posted,
         (SELECT COUNT(*) FROM briefs WHERE model IS NOT NULL AND status IN ('draft', 'posted')) AS reads,
         (SELECT COALESCE(SUM(json_array_length(charts)), 0) FROM briefs WHERE model IS NOT NULL AND status IN ('draft', 'posted')) AS charts`,
    ).first();
    const windows = BRIEF.sessions.map((s) => ({ id: s.id, name: s.name, window: briefWindow(s.id, at) }));
    const next = briefDefault(at);
    const body = {
      ready: true, ai: !!env.ANTHROPIC_API_KEY, mode: liveMode(env) ? 'live' : 'test', canPost: poster,
      next: next && { ...next, ask: briefAsk(next) },
      sessions: windows,
      briefs: list.map((b) => shown(b, poster)),
      stats: briefStats(await recordRows(env)),
      memory: { briefs: counts.posted, charts: counts.charts, reads: counts.reads, lessons: counts.lessons },
    };
    if (poster) {
      const person = await personOf(env, user.id);
      body.me = { guide: person.guide, prefs: person.prefs, lessons: await lessonsOf(env, user.id, 40), readsToday: await readsToday(env, user.id, at), limit: limitOf(env) };
    }
    views.set(key, { at, body });
    return body;
  }

  const limitOf = (env) => Number(env.BRIEF_DAILY_READS) || DAILY_READS;
  const readsToday = async (env, id, at) => (await env.DB.prepare('SELECT COUNT(*) AS n FROM briefs WHERE author_id = ? AND created >= ?')
    .bind(id, at - (at % 86400)).first()).n;

  const isPicture = async (file) => !!pictureType(new Uint8Array(await file.slice(0, 12).arrayBuffer()));

  // The terminal's read of the market when the charts came in: what TCP AI reads with them,
  // and the odds of each zone from here to the session's close.
  function contextOf(m, w, at) {
    const digits = MARKETS[m.symbol].digits;
    const state = m.engine && m.engine.state;
    return {
      price: m.price, atr: round(m.atr, digits), dayHigh: m.dayHigh, dayLow: m.dayLow, rangePct: round(m.rangePct, 0),
      levels: (m.levels || []).map((l) => ({ id: l.id, name: l.name, price: l.price })),
      variance: m.engine && m.engine.profile ? varianceBetween(m.engine.profile, at, w.close) : null,
      state: state ? { vol: round(state.volRank, 2), trend: round(state.efficiency, 2), momentum: { h1: round(state.momentum.h1, 2), h4: round(state.momentum.h4, 2), h24: round(state.momentum.h24, 2) } } : null,
      source: m.source, weekly: !!w.weekly,
    };
  }

  async function create(request, env, user, at, ctx) {
    const form = await request.formData().catch(() => null);
    let input = null;
    try { input = form && JSON.parse(form.get('brief')); } catch { input = null; }
    if (!input || typeof input !== 'object') return refuse('Send the charts.');
    const blobs = form.getAll('chart').filter((x) => x && typeof x === 'object' && x.size);
    if (!blobs.length) return refuse('Add at least one chart.', 'charts');
    if (blobs.length > BRIEF.maxCharts) return refuse(`Up to ${BRIEF.maxCharts} charts at a time.`, 'charts');
    for (const blob of blobs) {
      if (blob.size > MAX_CHART) return refuse('A chart is too big: 8 MB at most.', 'charts');
      if (!(await isPicture(blob))) return refuse('Charts have to be JPEG, PNG or WebP pictures.', 'charts');
    }
    if (!MARKETS[input.symbol]) return refuse('Pick gold or Bitcoin.', 'symbol');
    const w = briefWindow(input.session, at);
    if (!w) return refuse('Pick the session.', 'session');
    const ai = !!env.ANTHROPIC_API_KEY;
    if (ai && (await readsToday(env, user.id, at)) >= limitOf(env)) {
      return refuse('That\'s today\'s limit of chart reads: TCP AI is back tomorrow.', 'charts', 429);
    }
    let m;
    try {
      m = await loadMarket(env, input.symbol, at);
    } catch {
      return reply({ error: 'unavailable', message: 'Prices are unavailable, so the charts can\'t be checked against them. Try again in a minute.' }, 503);
    }
    const context = contextOf(m, w, at);
    const b = {
      created: at, authorId: user.id, author: nameOf(user), session: w.id, day: w.key, opens: w.open, closes: w.close,
      symbol: input.symbol, note: briefClip(input.note, BRIEF.text.note), context, weekly: !!w.weekly,
      charts: blobs.map((blob, i) => ({ k: i + 1, size: blob.size })), status: ai ? 'reading' : 'draft', test: !liveMode(env),
      read: null, draft: null, model: null, usage: null, error: null,
    };
    const row = await env.DB.prepare(
      `INSERT INTO briefs (created, author_id, author, session, day, opens, closes, symbol, note, context, charts, status, test, read_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    ).bind(b.created, b.authorId, b.author, b.session, b.day, b.opens, b.closes, b.symbol, b.note, JSON.stringify(context),
      JSON.stringify(b.charts), b.status, b.test ? 1 : 0, at).first();
    b.id = row.id;
    b.attempts = 0;
    const kept = await keep(env, user, b, blobs);
    b.charts = b.charts.map((c, i) => ({ ...c, file: kept[i] || null }));
    await env.DB.prepare('UPDATE briefs SET charts = ? WHERE id = ?').bind(JSON.stringify(b.charts), b.id).run();
    views.clear();
    const warning = [
      ai ? null : 'TCP AI is off (no ANTHROPIC_API_KEY), so write this brief yourself.',
      kept.some(Boolean) ? null : 'The bot couldn\'t keep the charts in Telegram, so this brief will post without one.',
    ].filter(Boolean).join(' ') || null;
    if (!ai) return reply({ brief: shown(b, true), warning });
    // The read carries on for a while if the app is closed; the check every 5 minutes finishes
    // any it didn't.
    const reading = runRead(env, b, blobs, at);
    if (ctx) ctx.waitUntil(reading.catch(() => {}));
    await reading;
    return reply({ brief: shown(b, true), ...(warning ? { warning } : {}) });
  }

  async function reread(env, id, at) {
    const row = await env.DB.prepare('SELECT * FROM briefs WHERE id = ?').bind(id).first();
    if (!row) return reply({ error: 'not_found', message: `There's no brief #${id}.` }, 404);
    const b = fromRow(row);
    if (!env.ANTHROPIC_API_KEY) return refuse('TCP AI is off (no ANTHROPIC_API_KEY).');
    // One read at a time, however many taps: the first to move it from failed to reading reads it.
    const claimed = await env.DB.prepare("UPDATE briefs SET status = 'reading', read_at = ? WHERE id = ? AND status = 'failed'").bind(at, id).run();
    if (claimed.meta.changes !== 1) return reply({ error: 'busy', message: b.status === 'reading' ? 'TCP AI is still reading these.' : 'This brief has been read.' }, 409);
    return reply({ brief: shown(await runRead(env, b, null, at), true) });
  }

  async function postBrief(request, env, id, at) {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return refuse('Send the brief.');
    const row = await env.DB.prepare('SELECT * FROM briefs WHERE id = ?').bind(id).first();
    if (!row) return reply({ error: 'not_found', message: `There's no brief #${id}.` }, 404);
    const b = fromRow(row);
    if (b.status === 'posted') return reply({ error: 'posted', message: `Brief #${id} has already gone out.` }, 409);
    if (b.status === 'discarded') return reply({ error: 'discarded', message: `Brief #${id} was dropped.` }, 409);
    if (b.status === 'reading') return reply({ error: 'busy', message: 'TCP AI is still reading these charts.' }, 409);
    if (at >= b.closes) return refuse(`${briefSession(b.session).name} has closed: this brief can't go out now.`);
    let m;
    try {
      m = await loadMarket(env, b.symbol, at);
    } catch {
      return reply({ error: 'unavailable', message: 'Prices are unavailable, so the zones can\'t be checked. Try again in a minute.' }, 503);
    }
    const headline = briefClip(body.headline, BRIEF.text.headline);
    if (!headline) return refuse('Add a headline.', 'headline');
    if (!['long', 'short', 'neutral'].includes(body.bias)) return refuse('Pick the bias.', 'bias');
    const { zones, dropped } = cleanZones(body.zones, { symbol: b.symbol, price: m.price, atr: m.atr });
    if (dropped.length) return refuse(`Zone ${dropped[0].zone}: ${dropped[0].why}.`, 'zones');
    if (!zones.length) return refuse('Add at least one zone.', 'zones');
    const plan = planLines(body.plan);
    if (!plan.length) return refuse('Write the plan.', 'plan');
    const variance = m.engine && m.engine.profile ? varianceBetween(m.engine.profile, at, b.closes) : 0;
    const chart = b.charts.find((c) => c.k === Number(body.chart) && c.file) || null;
    const final = {
      headline, bias: body.bias, reason: briefClip(body.reason, BRIEF.text.reason),
      zones: zones.map((z) => ({ ...z, odds: round(zoneOdds(z, m.price, variance), 3) })), plan, chart: chart ? chart.k : null,
    };
    const lesson = briefClip(body.lesson, BRIEF.text.lesson);
    // Only one post per brief, whoever taps first.
    const claimed = await env.DB.prepare(
      "UPDATE briefs SET status = 'posted', posted = ?, price = ?, final = ?, lesson = ? WHERE id = ? AND status IN ('draft', 'failed')",
    ).bind(at, m.price, JSON.stringify(final), lesson || null, id).run();
    if (claimed.meta.changes !== 1) return reply({ error: 'busy', message: 'It changed a moment ago. Refresh and try again.' }, 409);
    Object.assign(b, { status: 'posted', posted: at, price: m.price, final, lesson });
    const edits = b.draft ? editsOf(b, b.draft, final) : null;
    for (const [kind, text] of [['edit', edits], ['note', lesson]]) {
      if (text) await env.DB.prepare('INSERT INTO brief_lessons (author_id, created, brief, kind, text) VALUES (?, ?, ?, ?, ?)').bind(b.authorId, at, b.id, kind, text).run();
    }
    const stats = b.test ? null : briefStats(await recordRows(env));
    const photo = chart ? await keptBlob(env, chart.file) : null;
    const out = await announce(env, b, postText(b, final, stats, at), photo);
    Object.assign(b, { chat: out.chat || null, thread: out.thread || null, message: out.message || null, photo: out.photo || null });
    await env.DB.prepare('UPDATE briefs SET chat = ?, thread = ?, message = ?, photo = ? WHERE id = ?').bind(b.chat, b.thread, b.message, b.photo, b.id).run();
    views.clear();
    return reply({ brief: shown(b, true), ...(out.error ? { warning: `Kept as brief #${b.id}, but the post didn't go out: ${out.error}.` } : {}) });
  }

  async function discard(env, id) {
    const res = await env.DB.prepare("UPDATE briefs SET status = 'discarded' WHERE id = ? AND status IN ('draft', 'failed', 'reading')").bind(id).run();
    views.clear();
    if (res.meta.changes !== 1) return reply({ error: 'busy', message: 'That brief can\'t be dropped now.' }, 409);
    return reply({ ok: true });
  }

  async function teach(request, env, user, at) {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return refuse('Nothing to save.');
    const person = await personOf(env, user.id);
    let { guide, prefs } = person;
    if (typeof body.guide === 'string') guide = body.guide.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').trim().slice(0, BRIEF.text.guide);
    if (body.prefs && typeof body.prefs === 'object') {
      const p = body.prefs;
      prefs = {
        remind: typeof p.remind === 'boolean' ? p.remind : prefs.remind,
        sessions: Array.isArray(p.sessions) ? BRIEF.sessions.map((s) => s.id).filter((id) => p.sessions.includes(id)) : prefs.sessions,
        lead: BRIEF.leads.includes(Number(p.lead)) ? Number(p.lead) : prefs.lead,
      };
    }
    await env.DB.prepare(
      'INSERT INTO brief_people (author_id, guide, prefs, updated) VALUES (?, ?, ?, ?) ON CONFLICT (author_id) DO UPDATE SET guide = excluded.guide, prefs = excluded.prefs, updated = excluded.updated',
    ).bind(user.id, guide, JSON.stringify(prefs), at).run();
    if (typeof body.lesson === 'string' && briefClip(body.lesson, BRIEF.text.lesson)) {
      await env.DB.prepare('INSERT INTO brief_lessons (author_id, created, brief, kind, text) VALUES (?, ?, NULL, ?, ?)').bind(user.id, at, 'note', briefClip(body.lesson, BRIEF.text.lesson)).run();
    }
    if (Number.isInteger(body.forget)) await env.DB.prepare('DELETE FROM brief_lessons WHERE i = ? AND author_id = ?').bind(body.forget, user.id).run();
    views.clear();
    return reply({ me: { guide, prefs, lessons: await lessonsOf(env, user.id, 40), readsToday: await readsToday(env, user.id, at), limit: limitOf(env) } });
  }

  async function chartOf(env, id, k, poster) {
    const row = await env.DB.prepare('SELECT charts, photo, status, test FROM briefs WHERE id = ?').bind(id).first();
    let fileId = null;
    if (row && k == null && row.photo && row.status === 'posted' && (!row.test || poster)) fileId = row.photo;
    if (row && k != null && poster) fileId = (parse(row.charts, []).find((c) => c.k === k) || {}).file || null;
    if (!fileId) return reply({ error: 'not_found' }, 404);
    const file = await telegram(env, 'getFile', { file_id: fileId });
    const res = file.ok ? await fetch(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${file.result.file_path}`) : null;
    if (!res || !res.ok) return reply({ error: 'unavailable', message: 'The chart isn\'t available right now.' }, 502);
    return new Response(res.body, { headers: { 'content-type': 'image/jpeg', 'cache-control': 'private, max-age=86400' } });
  }

  // Every brief and lesson as JSON lines, for TCP AI's training and for checking: charts are
  // listed by their Telegram file ids, and Telegram ids of people and chats are left out.
  async function exportAll(env, user, at) {
    // The stored JSON goes into the file as it is, without being parsed and written out again.
    const FIELDS = ['id', 'created', 'author', 'session', 'day', 'opens', 'closes', 'symbol', 'note', 'status', 'test', 'model', 'error',
      'attempts', 'lesson', 'posted', 'price', 'photo', 'reviewed'];
    const STORED = ['context', 'charts', 'usage', 'read', 'draft', 'final', 'review'];
    const rows = (await env.DB.prepare(`SELECT ${[...FIELDS, ...STORED].join(', ')} FROM briefs ORDER BY id`).all()).results;
    const lessons = (await env.DB.prepare('SELECT i, created, brief, kind, text FROM brief_lessons WHERE author_id = ? ORDER BY i').bind(user.id).all()).results;
    const person = await personOf(env, user.id);
    const lines = [
      JSON.stringify({ type: 'about', exported: new Date(at * 1000).toISOString(), briefs: rows.length, lessons: lessons.length, record: briefStats(await recordRows(env)),
        note: 'Charts are listed by their Telegram file ids (telegram) and their Anthropic file ids (anthropic, kept a week). No Telegram ids of people or chats are included.' }),
      JSON.stringify({ type: 'guide', text: person.guide }),
      ...rows.map((r) => `{"type":"brief",${FIELDS.map((k) => `${JSON.stringify(k)}:${JSON.stringify(r[k] ?? null)}`).join(',')},` +
        `${STORED.map((k) => `${JSON.stringify(k)}:${r[k] || 'null'}`).join(',')}}`),
      ...lessons.map((l) => JSON.stringify({ type: 'lesson', ...l })),
    ];
    const file = new Blob([lines.join('\n') + '\n'], { type: 'application/x-ndjson' });
    const day = new Date(at * 1000).toISOString().slice(0, 10);
    const sent = await sendFiles(env, 'sendDocument', {
      chat_id: user.id, caption: `TCP AI's session briefs: ${rows.length} briefs, ${lessons.length} lessons.`,
    }, [{ field: 'document', blob: file, name: `tcp-briefs-${day}.jsonl` }]);
    if (!sent.ok) return reply({ error: 'not_sent', message: 'The bot couldn\'t message you. Open @TCPInnerCircleBot, press Start, and try again.' }, 409);
    return reply({ ok: true, briefs: rows.length, lessons: lessons.length });
  }

  async function api(request, env, path, user, at, ctx) {
    if (!env.DB) {
      return request.method === 'GET' && path === '/api/briefs'
        ? reply({ ready: false, ai: !!env.ANTHROPIC_API_KEY })
        : reply({ error: 'no_db', message: 'Session briefs need the database: see terminal/SETUP.md.' }, 503);
    }
    try {
      await prepare(env);
      const poster = posterIds(env).includes(user.id);
      if (poster && !env.TERMINAL_URL) {
        const here = new URL(request.url).origin;
        if (here !== origin) { origin = here; await kvSet(env, 'origin', here, at); }
      }
      const chart = path.match(/^\/api\/briefs\/(\d+)\/chart(?:\/(\d+))?$/);
      if (request.method === 'GET' && path === '/api/briefs') return reply(await view(env, poster, user, at));
      if (request.method === 'GET' && chart) return chartOf(env, Number(chart[1]), chart[2] ? Number(chart[2]) : null, poster);
      if (request.method !== 'POST') return reply({ error: 'not_found' }, 404);
      if (!poster) return reply({ error: 'not_poster', message: 'Only Lewis and the people he names can send briefs.' }, 403);
      if (path === '/api/briefs') return create(request, env, user, at, ctx);
      if (path === '/api/briefs/teach') return teach(request, env, user, at);
      if (path === '/api/briefs/export') return exportAll(env, user, at);
      const one = path.match(/^\/api\/briefs\/(\d+)\/(read|post|discard)$/);
      if (one && one[2] === 'read') return reread(env, Number(one[1]), at);
      if (one && one[2] === 'post') return postBrief(request, env, Number(one[1]), at);
      if (one) return discard(env, Number(one[1]));
      return reply({ error: 'not_found' }, 404);
    } catch (err) {
      console.error(`briefs ${request.method} ${path} failed: ${err && err.message}`);
      return reply({ error: 'unavailable', message: 'Session briefs are unavailable right now. Try again in a minute.' }, 503);
    }
  }

  // ------------------------------------------------------------- the check
  // Reminders: each poster, before each session they asked for, once.
  async function remind(env, at) {
    const ids = posterIds(env);
    if (!ids.length) return;
    const url = env.TERMINAL_URL ? String(env.TERMINAL_URL).replace(/\/+$/, '') : await kvGet(env, 'origin');
    for (const id of ids) {
      const { prefs } = await personOf(env, id);
      if (!prefs.remind) continue;
      for (const w of briefReminders(at, prefs.lead)) {
        if (!prefs.sessions.includes(w.id)) continue;
        const sent = await env.DB.prepare('INSERT OR IGNORE INTO brief_kv (key, value, at) VALUES (?, ?, ?)').bind(`sent:${id}:${w.id}:${w.key}`, '1', at).run();
        if (sent.meta.changes !== 1) continue;
        const s = briefSession(w.id);
        const tz = SESSIONS.find((x) => x.id === s.session).tz;
        const local = new Date(w.open * 1000).toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
        await telegram(env, 'sendMessage', {
          chat_id: id, parse_mode: 'HTML',
          text: `${s.icon} <b>${s.name} opens in ${fmtDuration(w.open - at)}</b> (${local} ${s.city} time)\n` +
            `Send TCP AI your charts: <b>${briefAsk(w).join(' · ')}</b>${w.weekly ? ' (the daily for the week ahead)' : ''}\n\n` +
            'It reads them and drafts the brief. Nothing posts until you\'ve checked it.',
          ...(url ? { reply_markup: { inline_keyboard: [[{ text: '📈 SEND CHARTS', web_app: { url: `${url}/?brief=${w.id}` } }]] } } : {}),
        });
      }
    }
  }

  // A read the app didn't wait for (closed mid-read) is finished here, and the poster told.
  async function recover(env, at) {
    await env.DB.prepare("UPDATE briefs SET status = 'failed', error = ? WHERE status = 'reading' AND attempts >= 3 AND read_at < ?")
      .bind('TCP AI couldn\'t finish reading these charts. Send them again, or write the brief yourself.', at - 600).run();
    if (!env.ANTHROPIC_API_KEY) return;
    const row = await env.DB.prepare("SELECT * FROM briefs WHERE status = 'reading' AND read_at < ? AND attempts < 3 ORDER BY id LIMIT 1").bind(at - 240).first();
    if (!row) return;
    const b = fromRow(row);
    // Two checks at once (they can overlap) read it once.
    const claimed = await env.DB.prepare("UPDATE briefs SET read_at = ? WHERE id = ? AND status = 'reading' AND read_at = ?").bind(at, b.id, b.readAt).run();
    if (claimed.meta.changes !== 1) return;
    await runRead(env, b, null, at);
    const s = briefSession(b.session);
    const url = env.TERMINAL_URL ? String(env.TERMINAL_URL).replace(/\/+$/, '') : await kvGet(env, 'origin');
    await telegram(env, 'sendMessage', {
      chat_id: b.authorId,
      text: b.status === 'draft' ? `✍️ Your ${s.name} brief #${b.id} is ready to check.` : `⚠️ Your ${s.name} brief #${b.id}: ${b.error}`,
      ...(url ? { reply_markup: { inline_keyboard: [[{ text: 'OPEN', web_app: { url: `${url}/?brief=${b.session}` } }]] } } : {}),
    });
  }

  // After each session closes: what price did at each zone, posted as a reply to the brief.
  async function reviewDue(env, at) {
    const due = (await env.DB.prepare("SELECT * FROM briefs WHERE status = 'posted' AND reviewed IS NULL AND closes <= ? ORDER BY closes LIMIT 2")
      .bind(at - 120).all()).results.map(fromRow);
    for (const b of due) {
      let review = null;
      if (b.posted < b.closes) {
        let got;
        try {
          got = await minuteBars(env, b.symbol, b.posted, b.closes);
        } catch (err) {
          console.error(`brief ${b.id} review failed: ${err.message}`);
          if (at - b.closes < 86400) continue;
          got = null;
        }
        review = got ? reviewBrief(b.final.zones, got.bars, { from: b.posted, to: b.closes, price: b.price, atr: b.context.atr, step: got.step }) : null;
      }
      const done = await env.DB.prepare('UPDATE briefs SET review = ?, reviewed = ? WHERE id = ? AND reviewed IS NULL')
        .bind(JSON.stringify(review), at, b.id).run();
      if (done.meta.changes !== 1 || !review || !b.chat) continue;
      b.review = review;
      const stats = b.test ? null : briefStats(await recordRows(env));
      const sent = await telegram(env, 'sendMessage', {
        chat_id: b.chat, text: wrapText(b, review, stats), parse_mode: 'HTML',
        ...(b.thread ? { message_thread_id: b.thread } : {}),
        ...(b.message ? { reply_parameters: { message_id: b.message, allow_sending_without_reply: true } } : {}),
      });
      if (sent.ok) await env.DB.prepare('UPDATE briefs SET wrap = ? WHERE id = ?').bind(sent.result.message_id, b.id).run();
    }
    if (due.length) views.clear();
  }

  async function scheduled(env, at) {
    if (!env.DB) return;
    await prepare(env);
    for (const [name, step] of [['reminders', remind], ['reads', recover], ['reviews', reviewDue]]) {
      try {
        await step(env, at);
      } catch (err) {
        console.error(`briefs ${name} failed: ${err && err.message}`);
      }
    }
  }

  return { api, scheduled, reset: () => { views.clear(); origin = null; } };
}
