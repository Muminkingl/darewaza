import test from 'node:test';
import assert from 'node:assert/strict';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import session from '../api/session';
import sections from '../api/sections';
import telegram from '../api/telegram';

function response() {
  let code = 200; let body: unknown;
  const value = {
    setHeader() {}, status(status: number) { code = status; return value; }, json(payload: unknown) { body = payload; return value; },
  } as unknown as VercelResponse;
  return { value, get code() { return code; }, get body() { return body; } };
}

test('all catalog methods deny unauthenticated requests before database access', async () => {
  process.env.TELEGRAM_BOT_TOKEN = 'test-only-token';
  delete process.env.DATABASE_URL;
  for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
    const res = response();
    await sections({ method, headers: {}, query: {}, body: {} } as VercelRequest, res.value);
    assert.equal(res.code, 401);
  }
});
test('session endpoint requires signed Telegram data', () => {
  const res = response();
  session({ method: 'GET', headers: {} } as VercelRequest, res.value);
  assert.equal(res.code, 401);
});
test('webhook rejects missing or incorrect webhook secrets', async () => {
  process.env.TELEGRAM_WEBHOOK_SECRET = 'test-webhook-secret';
  for (const headers of [{}, { 'x-telegram-bot-api-secret-token': 'wrong' }]) {
    const res = response();
    await telegram({ method: 'POST', headers } as VercelRequest, res.value);
    assert.equal(res.code, 401);
  }
});
test('webhook ignores unapproved users and group messages without making outbound calls', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Unexpected Telegram API call.'); };
  try {
    for (const [id, type] of [[12345, 'private'], [5549806778, 'group']] as const) {
      const res = response();
      await telegram({ method: 'POST', headers: { 'x-telegram-bot-api-secret-token': 'test-webhook-secret' }, body: { message: { text: '/start', from: { id }, chat: { id, type } } } } as unknown as VercelRequest, res.value);
      assert.equal(res.code, 200); assert.deepEqual(res.body, { ok: true });
    }
  } finally { globalThis.fetch = originalFetch; }
});
