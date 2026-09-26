// TCP onboarding bot: a Cloudflare Worker (free plan), no dependencies.
//
// Flow: link in bio -> /start -> greeting + 18+ check -> about + broker
// question -> sign-up steps (partner link) or transfer steps (partner code)
// -> account number -> lead card in the team group -> the team replies to
// talk, or replies /approve to send a single-use Inner Circle invite.
//
// Stateless: each step travels in the button data or in the message being
// replied to, so the bot keeps no database. Leads live in the team group.
//
// Settings live in the Worker's environment, never in this file:
//   BOT_TOKEN, WEBHOOK_SECRET        secrets
//   ADMIN_CHAT_ID                    the team's private group (lead cards)
//   INNER_CIRCLE_CHAT_ID             the Inner Circle group (bot is admin)
//   PUPRIME_LINK, VANTAGE_LINK       partner sign-up links
//   PUPRIME_CODE, VANTAGE_CODE       partner codes for account transfers

// ------------------------------------------------------------------ wording
// Edit any message here, then Deploy. Keep the ({broker} · {kind}) line in
// accountQuestion: the bot reads it back when someone replies.
const TEXT = {
  greeting: '👋 Thanks for reaching out\nLewis or his team will be with you shortly to assist you further',
  ageQuestion:
    'Hey, how are you doing?\n\n' +
    'Before we get started I need to make sure you are eligible to join our community.\n\n' +
    'Are you 18 years old or older?\n\n' +
    'Once answered I will get the rest of the details sent across and I will answer any questions you may have. Thanks!',
  ageYesButton: "✅ Yes, I'm 18+",
  ageNoButton: "No, I'm under 18",
  qualified: "👍🏼 Great, you qualified. Let's get you set up!",
  underage:
    "Thanks for letting us know. You need to be 18 or over to join the TCP Inner Circle, so we can't go any " +
    "further for now. You're welcome back once you turn 18.",
  about:
    "Here's how the TCP Inner Circle works 👑\n\n" +
    '• Quant trading system: the TCP Quant Terminal on your charts\n' +
    '• Algorithmic signals, every trading day\n' +
    '• A+ setups, with the reasoning behind every trade\n' +
    '• Transparent results: wins and losses, posted in full\n' +
    '• Mentorship and direct access to Lewis\n\n' +
    'Membership comes with a trading account at one of our partner brokers, PU Prime or Vantage. ' +
    "I'm a partner of both and may earn a commission on accounts opened through my links.\n\n" +
    'Trading CFDs and crypto carries a high risk of losing money. Nothing here is financial advice.',
  brokerQuestion: 'Do you already have a PU Prime or Vantage account?',
  hasPuButton: 'Yes, PU Prime',
  hasVaButton: 'Yes, Vantage',
  notYetButton: 'Not yet',
  chooseBroker: 'No problem. Which broker would you like to open your account with?',
  newSteps: (broker) =>
    `Here's how to get set up with ${broker}:\n\n` +
    '1. Tap the button below to open your account through my partner link\n' +
    '2. Verify your account (ID and proof of address)\n' +
    '3. Fund your account\n' +
    '4. Come back here and tap ✅ Done',
  linkMissing: "\n\n(The sign-up link isn't set up yet. Reply here and we'll send it to you.)",
  openButton: (broker) => `🔗 Open my ${broker} account`,
  transferSteps: (broker, code) =>
    `To join the Inner Circle, your ${broker} account needs to be linked to my partner code.\n\n` +
    `1. Contact ${broker} support (live chat or email) from the email address on your account\n` +
    `2. Ask them to move your account under partner code: ${code || "(reply here and we'll send it)"}\n` +
    '3. Once they confirm, come back here and tap ✅ Done\n\n' +
    'Opened it through my link already? Skip straight to ✅ Done.',
  doneButton: '✅ Done',
  accountQuestion: (broker, kind) =>
    `Brilliant 👑 Reply to this message with your ${broker} account number so the team can verify it ` +
    `and unlock your access.\n\n(${broker} · ${kind})`,
  accountThanks: 'Got it ✅ The team will verify your account and send your Inner Circle invite here shortly.',
  invite: (link) =>
    "You're in 👑\n\nWelcome to the TCP Inner Circle. Here's your private invite link. " +
    `It works once, so keep it to yourself:\n${link}\n\nStart with the pinned welcome message and the rules.`,
  help: 'Tap /start to get set up, or send a message here and the team will reply.',
  shortDescription: 'TCP — The Crypto Playbook 👑 Get set up for the TCP Inner Circle in a few taps.',
  description:
    'Welcome to TCP — The Crypto Playbook 👑\n\n' +
    'This bot gets you set up for the TCP Inner Circle: the quant trading system, algorithmic signals, ' +
    'A+ setups and mentorship.\n\n' +
    'Tap Start to begin. 18+ only. Trading carries a high risk of losing money. Nothing here is financial advice.',
};

const BROKERS = { pu: 'PU Prime', va: 'Vantage' };
const KINDS = { n: 'new account', t: 'transfer' };
const ACCOUNT_TAG = /\((PU Prime|Vantage) · (new account|transfer)\)/;
const LEAD_ID = /\bID: (\d+)/;

// ------------------------------------------------------------ pure logic
// handleUpdate turns one Telegram update into a list of Bot API calls:
// { method, payload }, or { method: 'approve', ... } which needs a result
// from Telegram (the invite link) before its next step.

function configFrom(env) {
  return {
    adminChatId: env.ADMIN_CHAT_ID || '',
    innerCircleChatId: env.INNER_CIRCLE_CHAT_ID || '',
    links: { pu: env.PUPRIME_LINK || '', va: env.VANTAGE_LINK || '' },
    codes: { pu: env.PUPRIME_CODE || '', va: env.VANTAGE_CODE || '' },
  };
}

function handleUpdate(update, cfg) {
  if (update.callback_query) return onButton(update.callback_query, cfg);
  const msg = update.message;
  if (!msg || !msg.chat) return [];
  return msg.chat.type === 'private' ? onPrivate(msg, cfg) : onGroup(msg, cfg);
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const send = (chatId, text, extra = {}) => ({ method: 'sendMessage', payload: { chat_id: chatId, text, ...extra } });
const buttons = (rows) => ({ reply_markup: { inline_keyboard: rows } });
const btn = (text, data) => ({ text, callback_data: data });
const react = (chatId, messageId) => ({
  method: 'setMessageReaction',
  payload: { chat_id: chatId, message_id: messageId, reaction: [{ type: 'emoji', emoji: '👍' }] },
});
const command = (text) => (/^\/([a-z_]+)(?:@\w+)?(?:\s+(.*))?$/i.exec(text.trim()) || []).slice(1);

function who(user) {
  const name = esc([user.first_name, user.last_name].filter(Boolean).join(' ') || 'Unknown');
  return user.username ? `${name} · @${esc(user.username)}` : name;
}

function toTeam(cfg, html) {
  return cfg.adminChatId ? [send(cfg.adminChatId, html, { parse_mode: 'HTML' })] : [];
}

function onPrivate(msg, cfg) {
  const chat = msg.chat.id;
  const text = msg.text || '';
  const [cmd, arg] = command(text);

  if (cmd === 'start') {
    const source = /^[\w-]{1,32}$/.test(arg || '') ? arg : 'direct';
    return [
      send(chat, TEXT.greeting),
      send(chat, TEXT.ageQuestion, buttons([[btn(TEXT.ageYesButton, `age:y:${source}`)], [btn(TEXT.ageNoButton, 'age:n')]])),
    ];
  }
  if (cmd === 'help') return [send(chat, TEXT.help)];
  if (cmd === 'id') return [send(chat, `Chat ID: ${chat}`)];

  // An account number: a reply to our question, or a message that is just digits.
  const asked = ACCOUNT_TAG.exec(msg.reply_to_message?.from?.is_bot ? msg.reply_to_message.text || '' : '');
  if (text && (asked || /^\s*\d{5,12}\s*$/.test(text))) {
    const broker = asked ? `${asked[1]} · ${asked[2]}` : 'not stated';
    return [
      send(chat, TEXT.accountThanks),
      ...toTeam(cfg, `🟢 <b>Ready to verify</b>\n${who(msg.from)}\nBroker: ${broker}\n` +
        `Account: <code>${esc(text.trim().slice(0, 64))}</code>\nID: ${msg.from.id}\n\n` +
        'Reply /approve to send their Inner Circle invite, or reply with a message to answer them.'),
    ];
  }

  // Anything else goes to the team; a 👍 tells the sender it arrived.
  if (!cfg.adminChatId) return [send(chat, TEXT.help)];
  const card = `💬 <b>Message</b>\n${who(msg.from)}\nID: ${msg.from.id}` + (text ? `\n\n${esc(text)}` : '');
  const actions = [react(chat, msg.message_id), ...toTeam(cfg, card)];
  if (!text) actions.push({ method: 'copyMessage', payload: { chat_id: cfg.adminChatId, from_chat_id: chat, message_id: msg.message_id } });
  return actions;
}

function onButton(cq, cfg) {
  const chat = cq.message?.chat?.id;
  const [step, a, b] = String(cq.data || '').split(':');
  const done = [{ method: 'answerCallbackQuery', payload: { callback_query_id: cq.id } }];
  if (!chat) return done;
  // Take the buttons off the message that was answered, so it can't be pressed twice.
  done.push({ method: 'editMessageReplyMarkup', payload: { chat_id: chat, message_id: cq.message.message_id, reply_markup: { inline_keyboard: [] } } });

  if (step === 'age' && a === 'y') {
    const source = /^[\w-]{1,32}$/.test(b || '') ? b : 'direct';
    return [
      ...done,
      send(chat, TEXT.qualified),
      send(chat, TEXT.about),
      send(chat, TEXT.brokerQuestion, buttons([[btn(TEXT.hasPuButton, 'brk:pu'), btn(TEXT.hasVaButton, 'brk:va')], [btn(TEXT.notYetButton, 'brk:none')]])),
      ...toTeam(cfg, `🟡 <b>New lead · 18+</b>\n${who(cq.from)}\nSource: ${esc(source)}\nID: ${cq.from.id}`),
    ];
  }
  if (step === 'age' && a === 'n') return [...done, send(chat, TEXT.underage)];
  if (step === 'brk' && a === 'none') {
    return [...done, send(chat, TEXT.chooseBroker, buttons([[btn('PU Prime', 'new:pu'), btn('Vantage', 'new:va')]]))];
  }
  if (step === 'brk' && BROKERS[a]) {
    return [...done, send(chat, TEXT.transferSteps(BROKERS[a], cfg.codes[a]), buttons([[btn(TEXT.doneButton, `done:${a}:t`)]]))];
  }
  if (step === 'new' && BROKERS[a]) {
    const link = cfg.links[a];
    const rows = [[btn(TEXT.doneButton, `done:${a}:n`)]];
    if (link) rows.unshift([{ text: TEXT.openButton(BROKERS[a]), url: link }]);
    return [...done, send(chat, TEXT.newSteps(BROKERS[a]) + (link ? '' : TEXT.linkMissing), buttons(rows))];
  }
  if (step === 'done' && BROKERS[a] && KINDS[b]) {
    return [...done, send(chat, TEXT.accountQuestion(BROKERS[a], KINDS[b]), {
      reply_markup: { force_reply: true, input_field_placeholder: 'Account number' },
    })];
  }
  return done.slice(0, 1);
}

function onGroup(msg, cfg) {
  const text = msg.text || '';
  const [cmd] = command(text);
  if (cmd === 'id') return [send(msg.chat.id, `Chat ID: ${msg.chat.id}`)];
  if (!cfg.adminChatId || String(msg.chat.id) !== String(cfg.adminChatId)) return [];

  // The team replies to one of the bot's cards: the card names the person.
  const card = msg.reply_to_message;
  const lead = card?.from?.is_bot ? LEAD_ID.exec(card.text || card.caption || '') : null;
  if (!lead) return [];
  const userId = lead[1];
  if (cmd === 'approve') return [{ method: 'approve', userId, adminChatId: msg.chat.id, replyTo: msg.message_id }];
  if (text && !text.startsWith('/')) return [send(userId, text), react(msg.chat.id, msg.message_id)];
  if (!text) {
    return [{ method: 'copyMessage', payload: { chat_id: userId, from_chat_id: msg.chat.id, message_id: msg.message_id } },
      react(msg.chat.id, msg.message_id)];
  }
  return [];
}

// ------------------------------------------------------------- Telegram I/O
async function telegram(env, method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({ ok: false, description: `HTTP ${res.status}` }));
  // Log the method and Telegram's reason only: the request URL holds the token.
  if (!data.ok) console.error(`telegram ${method} failed: ${data.description}`);
  return data;
}

async function approve(action, cfg, call) {
  const reply = { reply_parameters: { message_id: action.replyTo } };
  if (!cfg.innerCircleChatId) {
    return call('sendMessage', { chat_id: action.adminChatId, text: 'Set INNER_CIRCLE_CHAT_ID in the Worker settings first.', ...reply });
  }
  const link = await call('createChatInviteLink', {
    chat_id: cfg.innerCircleChatId,
    name: `TCP ${action.userId}`.slice(0, 32),
    member_limit: 1,
    expire_date: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
  });
  if (!link.ok) {
    return call('sendMessage', { chat_id: action.adminChatId, text: `Couldn't create the invite: ${link.description}`, ...reply });
  }
  const sent = await call('sendMessage', { chat_id: action.userId, text: TEXT.invite(link.result.invite_link) });
  return call('sendMessage', {
    chat_id: action.adminChatId,
    text: sent.ok ? '✅ Invite sent (single use, expires in 7 days).' : `Couldn't message them: ${sent.description}`,
    ...reply,
  });
}

async function run(actions, cfg, call) {
  for (const action of actions) {
    try {
      if (action.method === 'approve') await approve(action, cfg, call);
      else await call(action.method, action.payload);
    } catch (err) {
      console.error(`${action.method} failed: ${err.message}`);
    }
  }
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body, null, 2), { status, headers: { 'content-type': 'application/json' } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const call = (method, payload) => telegram(env, method, payload);

    if (request.method === 'POST' && url.pathname === '/webhook') {
      if (!env.WEBHOOK_SECRET || request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.WEBHOOK_SECRET) {
        return new Response('forbidden', { status: 403 });
      }
      let update;
      try {
        update = await request.json();
      } catch {
        return new Response('bad request', { status: 400 });
      }
      const cfg = configFrom(env);
      await run(handleUpdate(update, cfg), cfg, call);
      return new Response('ok');
    }

    // One-time connection: https://<your-worker>/setup?key=<WEBHOOK_SECRET>
    if (url.pathname === '/setup') {
      // Say which part is wrong, without revealing any secret.
      if (!env.WEBHOOK_SECRET) {
        return new Response('WEBHOOK_SECRET is not set: add it in Settings → Variables and Secrets, then Deploy.', { status: 500 });
      }
      if (!/^[A-Za-z0-9_-]{1,256}$/.test(env.WEBHOOK_SECRET)) {
        return new Response('WEBHOOK_SECRET may only use letters, numbers, - and _ (no spaces): change it, then Deploy.', { status: 500 });
      }
      if (url.searchParams.get('key') !== env.WEBHOOK_SECRET) {
        return new Response("forbidden: the key in the link doesn't match WEBHOOK_SECRET.", { status: 403 });
      }
      if (!env.BOT_TOKEN) return json({ ok: false, error: 'BOT_TOKEN is not set in the Worker settings' }, 500);
      const steps = {
        webhook: await call('setWebhook', {
          url: `${url.origin}/webhook`,
          secret_token: env.WEBHOOK_SECRET,
          allowed_updates: ['message', 'callback_query'],
          drop_pending_updates: true,
        }),
        commands: await call('setMyCommands', {
          commands: [
            { command: 'start', description: 'Get set up for the Inner Circle' },
            { command: 'help', description: 'How this bot works' },
          ],
        }),
        description: await call('setMyDescription', { description: TEXT.description }),
        shortDescription: await call('setMyShortDescription', { short_description: TEXT.shortDescription }),
      };
      const report = Object.fromEntries(Object.entries(steps).map(([k, r]) => [k, r.ok ? 'ok' : r.description]));
      return json({ ok: Object.values(steps).every((r) => r.ok), ...report });
    }

    return new Response('TCP onboarding bot is running.');
  },
};
