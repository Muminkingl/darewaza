import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { rootCertificates } from 'node:tls';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required. Use the session pooler URL in .env.');
const ca = await readFile(new URL('../supabase/prod-ca-2021.crt', import.meta.url), 'utf8');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true, ca: [...rootCertificates, ca] } });
try {
  await client.connect();
  await client.query('begin');
  await client.query("select pg_advisory_xact_lock(hashtext('sayara_migrations'))");
  await client.query('create schema if not exists sayara_private');
  await client.query('revoke all on schema sayara_private from public, anon, authenticated');
  await client.query('create table if not exists sayara_private.migrations (name text primary key, applied_at timestamptz not null default now())');
  const migration = '001_catalog.sql';
  const applied = await client.query('select name from sayara_private.migrations where name = $1', [migration]);
  if (!applied.rowCount) {
    await client.query(await readFile(new URL(`../supabase/migrations/${migration}`, import.meta.url), 'utf8'));
    await client.query('insert into sayara_private.migrations(name) values ($1)', [migration]);
    console.log(`Applied ${migration}.`);
  } else console.log('Database is already up to date.');
  await client.query('commit');
} catch (error) {
  await client.query('rollback').catch(() => {});
  console.error('Migration failed:', error.message);
  process.exitCode = 1;
} finally { await client.end(); }
