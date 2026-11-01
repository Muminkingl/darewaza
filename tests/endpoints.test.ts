import test from 'node:test';
import assert from 'node:assert/strict';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import session from '../api/session';
import sections from '../api/sections';
import telegram from '../api/telegram';
import images from '../api/images';
import account from '../api/account';
import vehicles from '../api/vehicles';

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
test('all vehicle administration methods require Telegram authentication', async () => {
  for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
    const res = response();
    await vehicles({method,headers:{},query:{},body:{}} as VercelRequest,res.value);
    assert.equal(res.code,401);
  }
});
test('account deletion requires a real customer session and rejects foreign origins',async()=>{
  for(const headers of [{},{authorization:'not-a-bearer-token'}]){const res=response();await account({method:'DELETE',headers,body:{confirm:true}} as VercelRequest,res.value);assert.equal(res.code,401);}
  const res=response();await account({method:'DELETE',headers:{origin:'https://untrusted.example'},body:{confirm:true}} as VercelRequest,res.value);assert.equal(res.code,403);
});
test('image upload and cleanup require signed administrator access', async () => {
  for (const method of ['POST', 'DELETE']) {
    const res = response();
    await images({ method, headers: {}, body: {} } as VercelRequest, res.value);
    assert.equal(res.code, 401);
  }
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
