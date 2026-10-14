// Minimal Telegram Bot API client for sending. The token only ever appears in the request URL;
// it is never logged and never included in an error message.

export class TelegramError extends Error {
  constructor(message, { transient = false, retryAfter } = {}) {
    super(message);
    this.transient = transient;
    this.retryAfter = retryAfter;
  }
}

export function createTelegram({ token, fetchImpl = globalThis.fetch }) {
  if (!/^\d+:[A-Za-z0-9_-]{30,}$/.test(String(token || ''))) {
    throw new Error('TELEGRAM_BOT_TOKEN is missing or malformed. Set it in signals/.env (see SETUP.md).');
  }
  const base = `https://api.telegram.org/bot${token}/`;

  async function call(method, params, photo) {
    let res;
    try {
      if (photo) {
        const form = new FormData();
        for (const [k, v] of Object.entries(params)) {
          if (v === undefined || v === null) continue;
          form.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
        }
        form.append('photo', new Blob([photo.data], { type: 'image/png' }), photo.name);
        res = await fetchImpl(base + method, { method: 'POST', body: form });
      } else {
        res = await fetchImpl(base + method, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(params),
        });
      }
    } catch {
      throw new TelegramError(`${method}: couldn't reach Telegram`, { transient: true });
    }
    let data;
    try { data = await res.json(); } catch {
      throw new TelegramError(`${method}: unreadable reply (HTTP ${res.status})`, { transient: res.status >= 500 });
    }
    if (data.ok) return data.result;
    const code = data.error_code;
    throw new TelegramError(`${method}: ${data.description || 'error ' + code}`, {
      transient: code === 429 || code >= 500,
      retryAfter: data.parameters?.retry_after,
    });
  }

  const where = (chat, thread) => ({ chat_id: chat, message_thread_id: thread ?? undefined });
  const reply = (id) => (id ? { reply_parameters: { message_id: id, allow_sending_without_reply: true } } : {});

  return {
    sendPhoto: ({ chat, thread, png, name = 'card.png', caption, replyTo }) =>
      call('sendPhoto', { ...where(chat, thread), caption, parse_mode: 'HTML', ...reply(replyTo) }, { data: png, name }),
    sendMessage: ({ chat, thread, text, replyTo }) =>
      call('sendMessage', { ...where(chat, thread), text, parse_mode: 'HTML', link_preview_options: { is_disabled: true }, ...reply(replyTo) }),
  };
}
