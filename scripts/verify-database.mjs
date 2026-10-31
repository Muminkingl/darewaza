import pg from 'pg';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { rootCertificates } from 'node:tls';
const ca = await readFile(new URL('../supabase/prod-ca-2021.crt', import.meta.url), 'utf8');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true, ca: [...rootCertificates, ca] } });
await client.connect();
try {
  await client.query('begin');
  const created = await client.query("insert into public.catalog_sections (root_key,name) values ('parts','__verification__') returning id");
  const first = created.rows[0].id;
  let parent = first;
  for (let depth = 1; depth <= 35; depth++) {
    const child = await client.query("insert into public.catalog_sections(root_key,parent_id,name) values ('parts',$1,$2) returning id", [parent, `__depth_${depth}__`]);
    parent = child.rows[0].id;
  }
  await client.query("insert into public.catalog_sections(root_key,parent_id,name) select 'parts',$1,'__sibling_' || n from generate_series(1,85) n", [first]);
  const children = await client.query('select count(*)::int as n from public.catalog_sections where parent_id=$1', [first]);
  assert.equal(children.rows[0].n, 86);
  console.log('Verified 35 nested levels and 86 siblings (no fixed application depth or child limit).');

  async function denied(sql, params, code) {
    await client.query('savepoint permission_check');
    let actual;
    try { await client.query(sql, params); } catch (error) { actual = error.code; }
    await client.query('rollback to savepoint permission_check');
    assert.equal(actual, code);
  }
  await denied("insert into public.catalog_sections(root_key,parent_id,name) values ('accessories',$1,'wrong-root')", [first], '23503');
  await denied('update public.catalog_sections set parent_id=$1 where id=$2', [parent, first], '23514');
  console.log('Verified cross-catalog parents and cycle-forming moves are rejected.');

  for (const role of ['anon', 'authenticated']) {
    await client.query(`set local role ${role}`);
    if(role==='anon')await denied('select id from public.catalog_sections where id=$1',[first],'42501');
    else {const readable = await client.query('select id from public.catalog_sections where id=$1', [first]);assert.equal(readable.rowCount, 1);}
    await denied("insert into public.catalog_sections(root_key,name) values ('parts','forbidden')", [], '42501');
    await denied('update public.catalog_sections set name=$1 where id=$2', ['forbidden', first], '42501');
    await denied('delete from public.catalog_sections where id=$1', [first], '42501');
    await client.query('reset role');
  }
  console.log('Verified catalog reads require authentication and customers cannot create, edit or delete.');
  await client.query('delete from public.catalog_sections where id=$1', [first]);
  const remaining = await client.query("select count(*)::int as n from public.catalog_sections where name like '__depth_%' or name like '__sibling_%'");
  assert.equal(remaining.rows[0].n, 0);
  console.log('Verified recursive cascade deletion.');
  await client.query('rollback');

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const result = await fetch(`${url}/rest/v1/catalog_sections?select=id&limit=1`, { headers: { apikey: anon, Authorization: `Bearer ${anon}` } });
  assert.equal(result.status, 401);
  console.log('Verified anonymous catalog access is denied by the REST endpoint.');
  console.log('All database checks passed. Test records were rolled back.');
} catch (error) {
  await client.query('rollback').catch(() => {});
  console.error('Database verification failed:', error.message); process.exitCode = 1;
} finally { await client.end(); }
