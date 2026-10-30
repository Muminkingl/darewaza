import { createHmac, timingSafeEqual } from 'node:crypto';

// Fixed server-side allowlist. Never authorize against initDataUnsafe or a submitted ID.
export const ADMIN_IDS: ReadonlySet<number> = new Set([5549806778, 300993380, 1468696739, 7294439693]);
export const AUTH_MAX_AGE_SECONDS = 3600;

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export interface TelegramUser { id: number; first_name: string; last_name?: string; username?: string }

export function validateInitData(raw: string, token: string, now = Math.floor(Date.now() / 1000)): TelegramUser {
  if (!raw || raw.length > 16384) throw new HttpError(401, 'Open Studio from Telegram to continue.');
  const params = new URLSearchParams(raw);
  const keys = [...params.keys()];
  if (new Set(keys).size !== keys.length) throw new HttpError(401, 'Invalid Telegram session.');
  const hash = params.get('hash');
  if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) throw new HttpError(401, 'Invalid Telegram session.');
  params.delete('hash');
  const check = [...params.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, value]) => `${key}=${value}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  const expected = createHmac('sha256', secret).update(check).digest();
  if (!timingSafeEqual(expected, Buffer.from(hash, 'hex'))) throw new HttpError(401, 'Invalid Telegram session.');
  const date = Number(params.get('auth_date'));
  if (!Number.isSafeInteger(date) || date <= 0 || date > now + 30 || now - date > AUTH_MAX_AGE_SECONDS) {
    throw new HttpError(401, 'Your session expired. Close and reopen Studio in Telegram.');
  }
  let user: TelegramUser;
  try { user = JSON.parse(params.get('user') || 'null'); } catch { throw new HttpError(401, 'Invalid Telegram user.'); }
  if (!user || !Number.isSafeInteger(user.id) || typeof user.first_name !== 'string') throw new HttpError(401, 'Invalid Telegram user.');
  if (!ADMIN_IDS.has(user.id)) throw new HttpError(403, 'This Studio is available to approved administrators only.');
  return user;
}

export function authenticate(authorization: string | string[] | undefined): TelegramUser {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new HttpError(503, 'Studio is not configured yet.');
  if (typeof authorization !== 'string' || !authorization.startsWith('tma ')) throw new HttpError(401, 'Open Studio from Telegram to continue.');
  return validateInitData(authorization.slice(4), token);
}
