import pg from 'pg';
import { readFileSync } from 'node:fs';
import { rootCertificates } from 'node:tls';
import { HttpError } from './auth.js';
import { attachDatabasePool } from '@vercel/functions';

let pool: pg.Pool | undefined;
export function database(): pg.Pool {
  if (!process.env.DATABASE_URL) throw new HttpError(503, 'The database connection is not configured.');
  if (!pool) {
    pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true, ca: [...rootCertificates, readFileSync(new URL('../supabase/prod-ca-2021.crt', import.meta.url), 'utf8')] },
    max: 3,
    statement_timeout: 8000,
    query_timeout: 10000,
    application_name: 'sayara-studio',
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
    });
    attachDatabasePool(pool);
    pool.on('error', error => console.error('Idle database connection closed', { code: (error as { code?: string }).code || 'unknown' }));
  }
  return pool;
}
