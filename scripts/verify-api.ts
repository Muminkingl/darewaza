import 'dotenv/config';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../api/sections';
import { database } from '../server/database';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('Set TELEGRAM_BOT_TOKEN and DATABASE_URL in .env.');
const params = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id: 5549806778, first_name: 'Verification' }) });
const secret = createHmac('sha256', 'WebAppData').update(token).digest();
const check = [...params.entries()].sort(([a], [b]) => a < b ? -1 : 1).map(([key, value]) => `${key}=${value}`).join('\n');
params.set('hash', createHmac('sha256', secret).update(check).digest('hex'));

async function request(method: string, body?: unknown, query: Record<string, string> = {}) {
  let status = 200;
  let result: any;
  const res = { setHeader() {}, status(code: number) { status = code; return res; }, json(data: unknown) { result = data; return res; } } as unknown as VercelResponse;
  await handler({ method, headers: { authorization: `tma ${params}` }, query, body } as VercelRequest, res);
  return { status, result };
}
let top: string | undefined;
try {
  const name = `__api_verification_${randomUUID()}`;
  const created = await request('POST', { root_key: 'parts', parent_id: null, name, icon: 'car', position: 2 });
  assert.equal(created.status, 201); top = created.result.section.id;
  const child = await request('POST', { root_key: 'parts', parent_id: top, name: 'test-child' });
  assert.equal(child.status, 201);
  const grandchild = await request('POST', { root_key: 'parts', parent_id: child.result.section.id, name: 'test-grandchild' });
  assert.equal(grandchild.status, 201);
  const edit = await request('PATCH', { id: child.result.section.id, name: 'test-edited', description: 'Updated', icon: 'wrench', position: 3 });
  assert.equal(edit.status, 200); assert.equal(edit.result.section.name, 'test-edited');
  await database().query("insert into public.catalog_sections(root_key,parent_id,name) select 'parts',$1,'verification-page-' || n from generate_series(1,45) n", [top]);
  const page1 = await request('GET', undefined, { root: 'parts', parent: top! });
  assert.equal(page1.status, 200); assert.equal(page1.result.sections.length, 40); assert.equal(page1.result.hasMore, true);
  const page2 = await request('GET', undefined, { root: 'parts', parent: top!, offset: '40' });
  assert.equal(page2.result.sections.length, 6); assert.equal(page2.result.hasMore, false);
  assert.equal(new Set([...page1.result.sections, ...page2.result.sections].map(item => item.id)).size, 46);
  const search = await request('GET', undefined, { root: 'parts', parent: top!, q: 'test-edited' });
  assert.equal(search.result.sections.length, 1);
  const isolated = await request('GET', undefined, { root: 'accessories', parent: top! });
  assert.equal(isolated.result.sections.length, 0);
  const wrongRoot = await request('POST', { root_key: 'accessories', parent_id: top, name: 'wrong-root' });
  assert.equal(wrongRoot.status, 409);
  const invalid = await request('POST', { root_key: 'parts', parent_id: top, name: '   ' });
  assert.equal(invalid.status, 400);
  const deletion = await request('DELETE', { id: child.result.section.id });
  assert.equal(deletion.status, 200);
  const gone = await database().query('select id from public.catalog_sections where id=$1', [grandchild.result.section.id]);
  assert.equal(gone.rowCount, 0);
  const duplicateDelete = await request('DELETE', { id: child.result.section.id });
  assert.equal(duplicateDelete.status, 404);
  console.log('Live API verified: create, nested children, edit, search, pagination, root isolation, validation and cascade deletion.');
} finally {
  if (top) await database().query('delete from public.catalog_sections where id=$1', [top]);
  await database().end();
  console.log('Temporary API verification records removed.');
}
