import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { ADMIN_IDS, AUTH_MAX_AGE_SECONDS, HttpError, validateInitData } from '../server/auth';

const token = 'test-only-bot-token';
const now = 1_800_000_000;
function sign(values: Record<string, string>, signingToken = token) {
  const params = new URLSearchParams(values);
  const check = [...params.entries()].sort(([a], [b]) => a < b ? -1 : 1).map(([key, value]) => `${key}=${value}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(signingToken).digest();
  params.set('hash', createHmac('sha256', secret).update(check).digest('hex'));
  return params.toString();
}
const session = (id = 5549806778, date = now) => sign({ auth_date: String(date), query_id: 'AAE-test', user: JSON.stringify({ id, first_name: 'Admin' }) });
const status = (code: number) => (error: unknown) => error instanceof HttpError && error.status === code;

test('accepts valid Telegram signatures for precisely the four approved IDs', () => {
  assert.equal(ADMIN_IDS.size, 4);
  for (const id of [5549806778, 300993380, 1468696739, 7294439693]) assert.equal(validateInitData(session(id), token, now).id, id);
});
test('rejects a genuinely signed Telegram user outside the allowlist', () => assert.throws(() => validateInitData(session(123456), token, now), status(403)));
test('rejects tampering with the user ID or name', () => assert.throws(() => validateInitData(session().replace('Admin', 'Attacker'), token, now), status(401)));
test('rejects a signature made with another bot token', () => assert.throws(() => validateInitData(session(), 'other-token', now), status(401)));
test('rejects expired and future sessions', () => {
  assert.throws(() => validateInitData(session(5549806778, now - AUTH_MAX_AGE_SECONDS - 1), token, now), status(401));
  assert.throws(() => validateInitData(session(5549806778, now + 31), token, now), status(401));
});
test('rejects missing data, duplicate fields and non-hex hashes without crashing', () => {
  for (const raw of ['', session() + '&user=anything', session().replace(/hash=.*/, 'hash=' + 'x'.repeat(64)), 'x'.repeat(17000)]) assert.throws(() => validateInitData(raw, token, now), status(401));
});
test('rejects invalid signed user data and string-valued IDs', () => {
  for (const user of ['invalid-json', 'null', JSON.stringify({ id: '5549806778', first_name: 'Admin' })]) assert.throws(() => validateInitData(sign({ auth_date: String(now), user }), token, now), status(401));
});
test('includes the optional signature field in Telegram HMAC verification', () => {
  const raw = sign({ auth_date: String(now), user: JSON.stringify({ id: 5549806778, first_name: 'Admin' }), signature: 'telegram-ed25519-signature' });
  assert.equal(validateInitData(raw, token, now).id, 5549806778);
});
