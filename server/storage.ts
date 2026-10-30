import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { IMAGE_BUCKET, imageUrl } from '../shared/catalog.js';
import { database } from './database.js';
import { HttpError } from './auth.js';

let client: SupabaseClient | undefined;
export function storage() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new HttpError(503, 'Image storage is not configured.');
  client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(10000) }) } });
  return client.storage.from(IMAGE_BUCKET);
}
export function publicImage(path: string | null) { return imageUrl(process.env.SUPABASE_URL, path); }

export async function verifyImage(path: string | null, sectionId: string) {
  if (!path) return;
  if (!path.startsWith(`${sectionId}/`)) throw new HttpError(400, 'Invalid image for this section.');
  const result = await database().query('select 1 from storage.objects where bucket_id=$1 and name=$2', [IMAGE_BUCKET, path]);
  if (!result.rowCount) throw new HttpError(400, 'The image upload is not complete. Please try again.');
}

export async function removeUnusedImages(paths: string[]) {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return;
  const result = await database().query('select image_path from public.catalog_sections where image_path=any($1::text[])', [unique]);
  const used = new Set(result.rows.map(row => row.image_path));
  const unused = unique.filter(path => !used.has(path));
  for (let offset = 0; offset < unused.length; offset += 1000) {
    const { error } = await storage().remove(unused.slice(offset, offset + 1000));
    if (error) throw new HttpError(502, 'Could not remove an unused image.');
  }
}
