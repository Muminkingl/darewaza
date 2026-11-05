import 'dotenv/config';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../api/sections';
import { database } from '../server/database';
import images from '../api/images';
import { removeUnusedImages } from '../server/storage';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('Set TELEGRAM_BOT_TOKEN and DATABASE_URL in .env.');
const params = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id: 5549806778, first_name: 'Verification' }) });
const secret = createHmac('sha256', 'WebAppData').update(token).digest();
const check = [...params.entries()].sort(([a], [b]) => a < b ? -1 : 1).map(([key, value]) => `${key}=${value}`).join('\n');
params.set('hash', createHmac('sha256', secret).update(check).digest('hex'));

const remote = process.argv.includes('--remote');
async function request(method: string, body?: unknown, query: Record<string, string> = {}, endpoint = 'sections') {
  if (remote) {
    const response = await fetch(`${process.env.APP_URL}/api/${endpoint}?${new URLSearchParams(query)}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `tma ${params}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20000) });
    return { status: response.status, result: await response.json() };
  }
  let status = 200;
  let result: any;
  const res = { setHeader() {}, status(code: number) { status = code; return res; }, json(data: unknown) { result = data; return res; } } as unknown as VercelResponse;
  await (endpoint === 'images' ? images : handler)({ method, headers: { authorization: `tma ${params}` }, query, body } as VercelRequest, res);
  return { status, result };
}
let top: string | undefined;
let uploadedPath: string | undefined;
try {
  const name = `__api_verification_${randomUUID()}`;
  const created = await request('POST', { root_key: 'parts', parent_id: null, name, icon: 'car', position: 2 });
  assert.equal(created.status, 201); top = created.result.section.id;
  const child = await request('POST', { root_key: 'parts', parent_id: top, name: 'test-child' });
  assert.equal(child.status, 201);
  const grandchild = await request('POST', { root_key: 'parts', parent_id: child.result.section.id, name: 'test-grandchild' });
  assert.equal(grandchild.status, 201);
  const edit = await request('PATCH', { id: child.result.section.id, version: child.result.section.version, name: 'test-edited', description: 'Updated', icon: 'wrench', position: 3 });
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
  const deletion = await request('DELETE', { id: child.result.section.id, version: edit.result.section.version });
  assert.equal(deletion.status, 200);
  const gone = await database().query('select id from public.catalog_sections where id=$1', [grandchild.result.section.id]);
  assert.equal(gone.rowCount, 0);
  const duplicateDelete = await request('DELETE', { id: child.result.section.id, version: edit.result.section.version });
  assert.equal(duplicateDelete.status, 404);
  console.log('Live API verified: create, nested children, edit, search, pagination, root isolation, validation and cascade deletion.');
  const finalInput = { root_key: 'parts', parent_id: top, name: 'final-item-check', is_terminal: true, price_usd: '12.50', price_iqd: '16500' };
  const final = await request('POST', finalInput);
  assert.equal(final.status, 201, JSON.stringify(final.result));
  assert.equal(final.result.section.price_usd, '12.50'); assert.equal(final.result.section.price_iqd, '16500');
  assert.equal((await request('POST', { root_key: 'parts', parent_id: final.result.section.id, name: 'not-allowed' })).status, 409);
  assert.equal((await request('PATCH', { id: top, version: created.result.section.version, name, is_terminal: true, price_usd: '1' })).status, 409);
  assert.equal((await request('POST', { ...finalInput, price_usd: null, price_iqd: null })).status, 201);
  assert.equal((await request('POST', { ...finalInput, price_iqd: '1.5' })).status, 400);
  console.log('Verified final items, USD/IQD precision, and database-enforced leaf boundaries.');

  const simultaneous = await Promise.all(Array.from({ length: 6 }, (_, index) => request('POST', { root_key: 'parts', parent_id: top, name: `concurrent-${index}` })));
  assert.ok(simultaneous.every(result => result.status === 201));
  const target = simultaneous[0].result.section;
  const edits = await Promise.all(Array.from({ length: 6 }, (_, index) => request('PATCH', { id: target.id, version: target.version, name: `concurrent-edit-${index}` })));
  assert.equal(edits.filter(result => result.status === 200).length, 1); assert.equal(edits.filter(result => result.status === 409).length, 5);
  assert.equal((await request('DELETE', { id: target.id, version: target.version })).status, 409);
  const repeatedId = randomUUID();
  const repeated = await Promise.all(Array.from({ length: 6 }, () => request('POST', { id: repeatedId, root_key: 'parts', parent_id: top, name: 'safe-retry' })));
  assert.equal(repeated.filter(result => result.status === 201).length, 1); assert.ok(repeated.every(result => [200, 201].includes(result.status)));
  console.log('Verified six concurrent creates, conflict-safe edits, stale-delete protection and duplicate-free retries.');

  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=', 'base64');
  const signed = await request('POST', { section_id: final.result.section.id, type: 'image/png', size: png.length }, {}, 'images');
  assert.equal(signed.status, 200, JSON.stringify(signed.result)); uploadedPath = signed.result.path;
  const form = new FormData(); form.append('cacheControl', '31536000'); form.append('', new Blob([png], { type: 'image/png' }));
  const upload = await fetch(signed.result.signedUrl, { method: 'PUT', headers: { 'x-upsert': 'false' }, body: form });
  assert.equal(upload.status, 200, 'Signed image upload failed.');
  const pictured = await request('PATCH', { id: final.result.section.id, version: final.result.section.version, name: finalInput.name, is_terminal: true, price_usd: '12.50', price_iqd: '16500', image_path: uploadedPath });
  assert.equal(pictured.status, 200, JSON.stringify(pictured.result));
  assert.equal((await fetch(pictured.result.section.image_url)).status, 200);
  await request('DELETE', { path: uploadedPath }, {}, 'images');
  assert.equal((await database().query('select 1 from storage.objects where bucket_id=$1 and name=$2', ['catalog-images', uploadedPath])).rowCount, 1);
  console.log('Verified signed image upload, public preview and protection of images used by products.');
} finally {
  if (top) await database().query('delete from public.catalog_sections where id=$1', [top]);
  if (uploadedPath) await removeUnusedImages([uploadedPath]);
  await database().end();
  console.log('Temporary API verification records removed.');
}
