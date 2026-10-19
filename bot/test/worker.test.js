// End-to-end tests: each test posts a Telegram update to the Worker, exactly as
// Telegram would, and checks the Bot API calls the Worker makes in response.
// Run with: cd bot && npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';
import { fakeD1 } from './d1.js';

const ENV = {
  BOT_TOKEN: 'TEST-TOKEN-0000',
  WEBHOOK_SECRET: 'test_secret_123',
  ADMIN_CHAT_ID: '-1001',
  INNER_CIRCLE_CHAT_ID: '-1002',
  PUPRIME_LINK: 'https://example.com/pu',
  VANTAGE_LINK: 'https://example.com/va',
  PUPRIME_CODE: 'PU123',
  VANTAGE_CODE: 'VA456',
};
const USER = { id: 555, first_name: 'Sam', last_name: 'Lee', username: 'samlee' };

let calls;
function telegram(responder = () => ({ ok: true, result: {} })) {
  calls = [];
  globalThis.fetch = async (url, init) => {
    const method = String(url).split('/').pop();
    const payload = JSON.parse(init.body);
    calls.push({ url: String(url), method, payload });
    return new Response(JSON.stringify(responder(method, payload)), { headers: { 'content-type': 'application/json' } });
  };
}

async function deliver(update, env = ENV, secret = env.WEBHOOK_SECRET) {
  const req = new Request('https://tcp-bot.example.workers.dev/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': secret },
    body: JSON.stringify(update),
  });
  return worker.fetch(req, env);
}

const dm = (text, extra = {}) => ({ message: { message_id: 10, chat: { id: 555, type: 'private' }, from: USER, text, ...extra } });
const press = (data) => ({
  callback_query: { id: 'cq1', from: USER, data, message: { message_id: 20, chat: { id: 555, type: 'private' } } },
});
const teamMsg = (text, card, extra = {}) => ({
  message: {
    message_id: 30, chat: { id: -1001, type: 'supergroup' }, from: { id: 1, first_name: 'Lewis' }, text,
    reply_to_message: card && { message_id: 29, from: { id: 99, is_bot: true }, text: card }, ...extra,
  },
});
const sent = (chatId) => calls.filter((c) => c.method === 'sendMessage' && String(c.payload.chat_id) === String(chatId));
const buttonsOf = (payload) => payload.reply_markup.inline_keyboard.flat();

test('/start with a source tag greets, then asks the 18+ question with two buttons', async () => {
  telegram();
  const res = await deliver(dm('/start ig'));
  assert.equal(res.status, 200);
  const [greeting, question] = sent(555).map((c) => c.payload);
  assert.match(greeting.text, /Thanks for reaching out/);
  assert.match(question.text, /Are you 18 years old or older\?/);
  assert.deepEqual(buttonsOf(question).map((b) => b.callback_data), ['age:y:ig', 'age:n']);
});

test('an unsafe source tag falls back to "direct"', async () => {
  telegram();
  await deliver(dm('/start <script>'));
  assert.equal(buttonsOf(sent(555)[1].payload)[0].callback_data, 'age:y:direct');
});

test('18+ yes: qualifies, explains, asks about the broker, and posts a lead card', async () => {
  telegram();
  await deliver(press('age:y:ig'));
  assert.deepEqual(calls.slice(0, 2).map((c) => c.method), ['answerCallbackQuery', 'editMessageReplyMarkup']);
  assert.deepEqual(calls[1].payload.reply_markup, { inline_keyboard: [] }, 'buttons removed from the answered question');
  const toUser = sent(555).map((c) => c.payload);
  assert.match(toUser[0].text, /you qualified/);
  assert.match(toUser[1].text, /partner of both and may earn a commission/);
  assert.match(toUser[1].text, /high risk of losing money/);
  assert.deepEqual(buttonsOf(toUser[2]).map((b) => b.callback_data), ['brk:pu:ig', 'brk:va:ig', 'brk:none:ig']);
  const [card] = sent(-1001).map((c) => c.payload);
  assert.equal(card.parse_mode, 'HTML');
  for (const bit of ['New lead', 'Sam Lee · @samlee', 'Source: ig', 'ID: 555']) assert.ok(card.text.includes(bit), bit);
});

test('18+ no: a polite close, and nothing sent to the team', async () => {
  telegram();
  await deliver(press('age:n'));
  assert.match(sent(555)[0].payload.text, /18 or over/);
  assert.equal(sent(-1001).length, 0);
});

test('has a PU Prime account: transfer steps with the partner code and a Done button', async () => {
  telegram();
  await deliver(press('brk:pu'));
  const [steps] = sent(555).map((c) => c.payload);
  assert.match(steps.text, /partner code: PU123/);
  assert.match(steps.text, /Skip straight to ✅ Done/);
  assert.deepEqual(buttonsOf(steps).map((b) => b.callback_data), ['done:pu:t']);
});

test('no account yet: choose a broker, then sign-up steps with the partner link', async () => {
  telegram();
  await deliver(press('brk:none'));
  assert.deepEqual(buttonsOf(sent(555)[0].payload).map((b) => b.callback_data), ['new:pu', 'new:va']);

  telegram();
  await deliver(press('new:va'));
  const [steps] = sent(555).map((c) => c.payload);
  assert.match(steps.text, /set up with Vantage/);
  const [open, done] = buttonsOf(steps);
  assert.equal(open.url, 'https://example.com/va');
  assert.equal(done.callback_data, 'done:va:n');
});

test('a missing partner link says so instead of showing a broken button', async () => {
  telegram();
  await deliver(press('new:pu'), { ...ENV, PUPRIME_LINK: '' });
  const [steps] = sent(555).map((c) => c.payload);
  assert.match(steps.text, /sign-up link isn't set up yet/);
  assert.ok(buttonsOf(steps).every((b) => !b.url));
});

test('Done asks for the account number; the reply reaches the team as "Ready to verify"', async () => {
  telegram();
  await deliver(press('done:pu:n'));
  const [ask] = sent(555).map((c) => c.payload);
  assert.equal(ask.reply_markup.force_reply, true);
  assert.match(ask.text, /\(PU Prime · new account\)/);

  telegram();
  await deliver(dm(' 12345678 ', { reply_to_message: { message_id: 21, from: { id: 99, is_bot: true }, text: ask.text } }));
  assert.match(sent(555)[0].payload.text, /The team will verify your account/);
  const card = sent(-1001)[0].payload.text;
  for (const bit of ['Ready to verify', 'Broker: PU Prime · new account', 'Source: not stated', '<code>12345678</code>', 'ID: 555', '/approve']) {
    assert.ok(card.includes(bit), bit);
  }
});

test('the lead source travels from /start to the Ready to verify card', async () => {
  telegram();
  await deliver(press('age:y:card_sam'));
  assert.deepEqual(buttonsOf(sent(555)[2].payload).map((b) => b.callback_data), ['brk:pu:card_sam', 'brk:va:card_sam', 'brk:none:card_sam']);
  telegram();
  await deliver(press('brk:none:card_sam'));
  assert.deepEqual(buttonsOf(sent(555)[0].payload).map((b) => b.callback_data), ['new:pu:card_sam', 'new:va:card_sam']);
  telegram();
  await deliver(press('new:va:card_sam'));
  assert.equal(buttonsOf(sent(555)[0].payload)[1].callback_data, 'done:va:n:card_sam');
  telegram();
  await deliver(press('brk:pu:card_sam'));
  assert.equal(buttonsOf(sent(555)[0].payload)[0].callback_data, 'done:pu:t:card_sam');
  telegram();
  await deliver(press('done:va:n:card_sam'));
  const [ask] = sent(555).map((c) => c.payload);
  assert.match(ask.text, /\(Vantage · new account · ref card_sam\)/);
  telegram();
  await deliver(dm('12345678', { reply_to_message: { message_id: 21, from: { id: 99, is_bot: true }, text: ask.text } }));
  const card = sent(-1001)[0].payload.text;
  for (const bit of ['Ready to verify', 'Broker: Vantage · new account', 'Source: card_sam', '<code>12345678</code>']) assert.ok(card.includes(bit), bit);
  for (const c of calls) assert.ok(!c.payload.reply_markup?.inline_keyboard?.flat().some((b) => (b.callback_data || '').length > 64), 'callback data fits 64 bytes');
});

test('a forged source in button data is dropped, not shown to the team', async () => {
  telegram();
  await deliver(press('done:pu:t:<b>x</b>'));
  assert.match(sent(555)[0].payload.text, /\(PU Prime · transfer\)$/);
});

test('a bare account number without replying still reaches the team', async () => {
  telegram();
  await deliver(dm('87654321'));
  assert.ok(sent(-1001)[0].payload.text.includes('Broker: not stated'));
});

test('any other message is relayed to the team, escaped, with a 👍 to the sender', async () => {
  telegram();
  await deliver({ message: { message_id: 11, chat: { id: 555, type: 'private' }, from: { id: 555, first_name: '<b>Evil</b> & Co' }, text: 'What is the <min> deposit?' } });
  assert.equal(calls[0].method, 'setMessageReaction');
  const card = sent(-1001)[0].payload.text;
  assert.ok(card.includes('&lt;b&gt;Evil&lt;/b&gt; &amp; Co'));
  assert.ok(card.includes('What is the &lt;min&gt; deposit?'));
  assert.ok(card.includes('ID: 555'));
});

test('photos are copied to the team under a card', async () => {
  telegram();
  await deliver({ message: { message_id: 12, chat: { id: 555, type: 'private' }, from: USER, photo: [{ file_id: 'x' }] } });
  assert.deepEqual(calls.map((c) => c.method), ['setMessageReaction', 'sendMessage', 'copyMessage']);
  assert.deepEqual(calls[2].payload, { chat_id: '-1001', from_chat_id: 555, message_id: 12 });
});

test('the team replies to a card: the reply goes to that person', async () => {
  telegram();
  await deliver(teamMsg('Hi Sam, welcome!', '💬 Message\nSam Lee\nID: 555\n\nhello'));
  assert.equal(sent(555)[0].payload.text, 'Hi Sam, welcome!');
  assert.equal(calls[1].method, 'setMessageReaction');
});

test('/approve sends a single-use Inner Circle invite and confirms to the team', async () => {
  telegram((method) => method === 'createChatInviteLink'
    ? { ok: true, result: { invite_link: 'https://t.me/+abc' } } : { ok: true, result: {} });
  await deliver(teamMsg('/approve', '🟢 Ready to verify\nSam Lee\nID: 555'));
  const [create, invite, confirm] = calls;
  assert.equal(create.method, 'createChatInviteLink');
  assert.equal(create.payload.chat_id, '-1002');
  assert.equal(create.payload.member_limit, 1);
  assert.ok(create.payload.expire_date > Date.now() / 1000);
  assert.equal(invite.payload.chat_id, '555');
  assert.match(invite.payload.text, /https:\/\/t\.me\/\+abc/);
  assert.equal(String(confirm.payload.chat_id), '-1001');
  assert.match(confirm.payload.text, /Invite sent/);
});

test('/approve without an Inner Circle chat set tells the team what to fix', async () => {
  telegram();
  await deliver(teamMsg('/approve', 'ID: 555'), { ...ENV, INNER_CIRCLE_CHAT_ID: '' });
  assert.equal(calls.length, 1);
  assert.match(calls[0].payload.text, /Set INNER_CIRCLE_CHAT_ID/);
});

test('/approve outside the team group, or not as a reply to a card, does nothing', async () => {
  telegram();
  await deliver({ message: { ...teamMsg('/approve', 'ID: 555').message, chat: { id: -9999, type: 'supergroup' } } });
  await deliver(teamMsg('/approve', null));
  await deliver({ message: { ...teamMsg('/approve', 'ID: 555').message, reply_to_message: { from: { id: 7, is_bot: false }, text: 'ID: 555' } } });
  assert.equal(calls.length, 0);
});

test('/id in any group replies with that chat id', async () => {
  telegram();
  await deliver({ message: { message_id: 1, chat: { id: -1002, type: 'supergroup' }, from: USER, text: '/id@TCPBot' } });
  assert.equal(sent(-1002)[0].payload.text, 'Chat ID: -1002');
});

test('an unknown button just stops the spinner', async () => {
  telegram();
  await deliver(press('nonsense:1'));
  assert.deepEqual(calls.map((c) => c.method), ['answerCallbackQuery']);
});

test('the webhook rejects requests without the secret header', async () => {
  telegram();
  const res = await deliver(dm('/start'), ENV, 'wrong');
  assert.equal(res.status, 403);
  assert.equal(calls.length, 0);
});

test('/setup needs the key, then connects the webhook with the secret', async () => {
  telegram();
  const denied = await worker.fetch(new Request('https://tcp-bot.example.workers.dev/setup?key=nope'), ENV);
  assert.equal(denied.status, 403);

  const res = await worker.fetch(new Request(`https://tcp-bot.example.workers.dev/setup?key=${ENV.WEBHOOK_SECRET}`), ENV);
  const body = await res.json();
  assert.equal(body.ok, true);
  const hook = calls.find((c) => c.method === 'setWebhook').payload;
  assert.equal(hook.url, 'https://tcp-bot.example.workers.dev/webhook');
  assert.equal(hook.secret_token, ENV.WEBHOOK_SECRET);
  assert.deepEqual(calls.map((c) => c.method), ['setWebhook', 'setMyCommands', 'setMyDescription', 'setMyShortDescription']);
  assert.ok(!JSON.stringify(body).includes(ENV.BOT_TOKEN), 'setup report never shows the token');
});

test('/setup explains what is wrong: secret missing, secret malformed, or key mismatch', async () => {
  telegram();
  const at = (key) => new Request(`https://tcp-bot.example.workers.dev/setup?key=${key}`);
  const missing = await worker.fetch(at('x'), { ...ENV, WEBHOOK_SECRET: '' });
  assert.equal(missing.status, 500);
  assert.match(await missing.text(), /WEBHOOK_SECRET is not set/);
  const malformed = await worker.fetch(at('x'), { ...ENV, WEBHOOK_SECRET: 'has space ' });
  assert.equal(malformed.status, 500);
  assert.match(await malformed.text(), /only use letters, numbers/);
  const mismatch = await worker.fetch(at('nope'), ENV);
  assert.equal(mismatch.status, 403);
  assert.match(await mismatch.text(), /doesn't match WEBHOOK_SECRET/);
  assert.equal(calls.length, 0, 'nothing reaches Telegram until the key matches');
});

test('bot profile texts fit Telegram limits', async () => {
  telegram();
  await worker.fetch(new Request(`https://tcp-bot.example.workers.dev/setup?key=${ENV.WEBHOOK_SECRET}`), ENV);
  const desc = calls.find((c) => c.method === 'setMyDescription').payload.description;
  const short = calls.find((c) => c.method === 'setMyShortDescription').payload.short_description;
  assert.ok(desc.length <= 512, `description ${desc.length}`);
  assert.ok(short.length <= 120, `short description ${short.length}`);
});

test('failed Telegram calls are logged without the token', async () => {
  const logged = [];
  const original = console.error;
  console.error = (...args) => logged.push(args.join(' '));
  try {
    telegram(() => ({ ok: false, description: 'Forbidden: bot was blocked by the user' }));
    await deliver(dm('/start'));
  } finally {
    console.error = original;
  }
  assert.ok(logged.length > 0);
  assert.ok(logged.every((line) => !line.includes(ENV.BOT_TOKEN)));
});

// ------------------------------------------------------------- scoreboard
const ANA = { id: 601, first_name: 'Ana' };
const BEN = { id: 602, first_name: 'Ben' };
const dmFrom = (user, text) => ({ message: { message_id: 10, chat: { id: user.id, type: 'private' }, from: user, text } });
const pressFrom = (user, data) => ({
  callback_query: { id: 'cq2', from: user, data, message: { message_id: 20, chat: { id: user.id, type: 'private' } } },
});
const tables = (html) => [...html.matchAll(/<pre>([\s\S]*?)<\/pre>/g)].map((m) => m[1].split('\n'));
const HEADER = '          Start  18+ Acct Appr';
const withDb = () => ({ ...ENV, DB: fakeD1() });
const inviteOk = (method) => (method === 'createChatInviteLink' ? { ok: true, result: { invite_link: 'https://t.me/+abc' } } : { ok: true, result: {} });

test('the scoreboard follows a lead from Start to approved, and /stats shows it to the team', async () => {
  const env = withDb();
  telegram(inviteOk);
  await deliver(dm('/start ig'), env);
  await deliver(press('age:y:ig'), env);
  await deliver(press('done:pu:n:ig'), env);
  const ask = sent(555).at(-1).payload;
  await deliver(dm('12345678', { reply_to_message: { message_id: 21, from: { id: 99, is_bot: true }, text: ask.text } }), env);
  const card = sent(-1001).at(-1).payload.text.replace(/<[^>]+>/g, ''); // what the team replies to
  await deliver(teamMsg('/approve', card), env);
  assert.match(sent(-1001).at(-1).payload.text, /Invite sent/);

  telegram();
  await deliver(teamMsg('/stats', null), env);
  const [board] = sent(-1001).map((c) => c.payload);
  assert.equal(board.parse_mode, 'HTML');
  assert.equal(board.reply_parameters.message_id, 30);
  assert.match(board.text, /Referral scoreboard/);
  const [week, all] = tables(board.text);
  assert.deepEqual(week, [HEADER, 'ig            1    1    1    1', 'Total         1    1    1    1']);
  assert.deepEqual(all, week);
  assert.ok(week.every((line) => line.length <= 30), 'fits a phone screen');
});

test('each person counts once per step, and a team member\'s card and link share one row', async () => {
  const env = withDb();
  telegram();
  await deliver(dm('/start laura'), env);
  await deliver(dm('/start laura'), env);
  await deliver(dmFrom(ANA, '/start card_laura'), env);
  await deliver(pressFrom(ANA, 'age:y:card_laura'), env);
  await deliver(dmFrom(BEN, '/start card'), env);
  telegram();
  await deliver(teamMsg('/stats', null), env);
  const [week] = tables(sent(-1001)[0].payload.text);
  assert.deepEqual(week, [HEADER, 'laura         2    1    0    0', 'card          1    0    0    0', 'Total         3    1    0    0']);
});

test('the team member who brings in approvals ranks first', async () => {
  const env = withDb();
  telegram(inviteOk);
  await deliver(dmFrom(ANA, '/start molly'), env);
  await deliver(dmFrom(BEN, '/start tt'), env);
  await deliver(pressFrom(BEN, 'age:y:tt'), env);
  await deliver(teamMsg('/approve', '🟢 Ready to verify\nAna\nBroker: Vantage · new account\nSource: card_molly\nID: 601'), env);
  telegram();
  await deliver(teamMsg('/stats', null), env);
  const [week] = tables(sent(-1001)[0].payload.text);
  assert.deepEqual(week.slice(1, 3), ['molly         1    0    0    1', 'tt            1    1    0    0']);
});

test('the last 7 days and all time are counted separately', async () => {
  const env = withDb();
  telegram();
  await deliver(dm('/start ig'), env);
  const eightDaysAgo = Math.floor(Date.now() / 1000) - 8 * 86400;
  env.DB.sqlite.prepare('INSERT INTO steps (user_id, step, source, at) VALUES (?, ?, ?, ?)').run(777, 'start', 'tt', eightDaysAgo);
  telegram();
  await deliver(teamMsg('/stats', null), env);
  const [week, all] = tables(sent(-1001)[0].payload.text);
  assert.deepEqual(week.slice(1), ['ig            1    0    0    0', 'Total         1    0    0    0']);
  assert.deepEqual(all.slice(1), ['ig            1    0    0    0', 'tt            1    0    0    0', 'Total         2    0    0    0']);
});

test('an invite that never reached the person is not counted as approved', async () => {
  const env = withDb();
  telegram((method, payload) => (method === 'createChatInviteLink' ? { ok: true, result: { invite_link: 'https://t.me/+abc' } }
    : String(payload.chat_id) === '555' ? { ok: false, description: 'Forbidden: bot was blocked by the user' } : { ok: true, result: {} }));
  await deliver(teamMsg('/approve', '🟢 Ready to verify\nSam Lee\nSource: ig\nID: 555'), env);
  telegram();
  await deliver(teamMsg('/stats', null), env);
  const text = sent(-1001)[0].payload.text;
  assert.equal(tables(text).length, 0);
  assert.match(text, /Last 7 days<\/b>\nNobody yet\./);
});

test('/stats without the database says how to turn it on, and only the team group can see it', async () => {
  telegram();
  await deliver(teamMsg('/stats', null));
  assert.match(sent(-1001)[0].payload.text, /needs its database/);

  const env = withDb();
  telegram();
  await deliver(dm('/start ig'), env);
  telegram();
  await deliver({ message: { ...teamMsg('/stats', null).message, chat: { id: -9999, type: 'supergroup' } } }, env);
  await deliver(dm('/stats'), env);
  assert.ok(calls.every((c) => !JSON.stringify(c.payload).includes('scoreboard')), 'no scoreboard outside the team group');
});

test('the Monday Cron Trigger posts the weekly scoreboard to the team group', async () => {
  const env = withDb();
  telegram();
  await deliver(dm('/start yt'), env);
  telegram();
  await worker.scheduled({ cron: '0 8 * * 1', scheduledTime: Date.now() }, env, { waitUntil() {} });
  const [post] = sent(-1001).map((c) => c.payload);
  assert.match(post.text, /Weekly referral scoreboard/);
  assert.equal(tables(post.text)[0][1], 'yt            1    0    0    0');

  telegram();
  await worker.scheduled({ cron: '0 8 * * 1', scheduledTime: Date.now() }, ENV, { waitUntil() {} });
  assert.equal(calls.length, 0, 'no database, no post');
});

test('a database failure never stops the conversation', async () => {
  const broken = {
    prepare() { throw new Error('D1_ERROR: database unavailable'); },
    async batch() { throw new Error('D1_ERROR: database unavailable'); },
  };
  const logged = [];
  const original = console.error;
  console.error = (...args) => logged.push(args.join(' '));
  try {
    telegram(inviteOk);
    await deliver(dm('/start ig'), { ...ENV, DB: broken });
    assert.equal(sent(555).length, 2, 'the greeting and the 18+ question still go out');
    telegram(inviteOk);
    await deliver(teamMsg('/approve', '🟢 Ready to verify\nSam Lee\nSource: ig\nID: 555'), { ...ENV, DB: broken });
    assert.match(sent(-1001).at(-1).payload.text, /Invite sent/);
    telegram();
    await deliver(teamMsg('/stats', null), { ...ENV, DB: broken });
    assert.match(sent(-1001)[0].payload.text, /couldn't load/);
  } finally {
    console.error = original;
  }
  assert.ok(logged.some((line) => line.includes('D1_ERROR')));
  assert.ok(logged.every((line) => !line.includes(ENV.BOT_TOKEN)));
});

test('coming back later is not a new start: a person counts from the first time they reached each step', async () => {
  const env = withDb();
  telegram();
  await deliver(dmFrom(BEN, '/start ig'), env);
  const eightDaysAgo = Math.floor(Date.now() / 1000) - 8 * 86400;
  env.DB.sqlite.prepare('INSERT INTO steps (user_id, step, source, at) VALUES (?, ?, ?, ?)').run(555, 'start', 'tt', eightDaysAgo);
  await deliver(dm('/start ig'), env);
  telegram();
  await deliver(teamMsg('/stats', null), env);
  const [week, all] = tables(sent(-1001)[0].payload.text);
  assert.deepEqual(week.slice(1), ['ig            1    0    0    0', 'Total         1    0    0    0']);
  assert.deepEqual(all.slice(1), ['ig            1    0    0    0', 'tt            1    0    0    0', 'Total         2    0    0    0']);
});

test('with many links, the top 14 get a row each and the rest share one', async () => {
  const env = withDb();
  telegram();
  for (let i = 1; i <= 20; i++) await deliver(dmFrom({ id: 700 + i, first_name: 'P' }, `/start src${String(i).padStart(2, '0')}`), env);
  telegram();
  await deliver(teamMsg('/stats', null), env);
  const text = sent(-1001)[0].payload.text;
  const [week] = tables(text);
  assert.equal(week.length, 17, 'heading, 14 links, others, total');
  assert.equal(week[14], 'src14         1    0    0    0');
  assert.equal(week[15], 'others        6    0    0    0');
  assert.equal(week[16], 'Total        20    0    0    0');
  assert.ok(text.length < 4096);
});
