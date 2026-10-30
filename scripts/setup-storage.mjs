import { createClient } from '@supabase/supabase-js';
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const bucket = 'catalog-images';
const options = { public: true, fileSizeLimit: 2 * 1024 * 1024, allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'] };
const { data: existing, error: lookupError } = await client.storage.getBucket(bucket);
if (lookupError && !/not found/i.test(lookupError.message)) throw lookupError;
const { error } = existing ? await client.storage.updateBucket(bucket, options) : await client.storage.createBucket(bucket, options);
if (error) throw error;
console.log('Image storage configured: public image reads, signed admin uploads, 2 MB maximum.');
