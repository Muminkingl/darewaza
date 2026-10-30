import type { VercelRequest, VercelResponse } from '@vercel/node';
import { timingSafeEqual } from 'node:crypto';
import { ADMIN_IDS, HttpError } from '../server/auth.js';
import { fail } from '../server/http.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    if (request.method !== 'POST') { response.setHeader('Allow', 'POST'); throw new HttpError(405, 'Method not allowed.'); }
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    const supplied = request.headers['x-telegram-bot-api-secret-token'];
    if (!secret || typeof supplied !== 'string' || Buffer.byteLength(secret) !== Buffer.byteLength(supplied) ||
      !timingSafeEqual(Buffer.from(secret), Buffer.from(supplied))) throw new HttpError(401, 'Unauthorized webhook.');
    const message = request.body?.message;
    // Only approved users in private chats can cause a bot reply.
    if (!message || message.chat?.type !== 'private' || !ADMIN_IDS.has(message.from?.id) ||
      message.chat.id !== message.from.id || !/^\/(start|studio|help)(?:@\w+)?(?:\s|$)/.test(message.text || '')) {
      return response.json({ ok: true });
    }
    const appUrl = process.env.APP_URL;
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!appUrl || !token) throw new HttpError(503, 'Bot is not configured yet.');
    const menu = await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: message.chat.id, menu_button: { type: 'web_app', text: 'Open Studio', web_app: { url: appUrl } } }),
      signal: AbortSignal.timeout(10_000),
    });
    const menuPayload = await menu.json() as { ok: boolean };
    if (!menu.ok || !menuPayload.ok) throw new HttpError(502, 'Telegram could not configure the Studio button.');
    const result = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: message.chat.id,
        text: 'بەخێربێیت بۆ ستۆدیۆی سەیارە.\nبەشەکان و ژێربەشەکانت لێرە بەڕێوەببە.',
        reply_markup: { inline_keyboard: [[{ text: 'Open Studio', web_app: { url: appUrl } }]] },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const payload = await result.json() as { ok: boolean };
    if (!result.ok || !payload.ok) throw new HttpError(502, 'Telegram could not deliver the response.');
    return response.json({ ok: true });
  } catch (error) { return fail(response, error); }
}
