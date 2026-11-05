import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { waitUntil } from '@vercel/functions';
import { z } from 'zod';
import { authenticate, HttpError } from '../server/auth.js';
import { database } from '../server/database.js';
import { fail } from '../server/http.js';
import { publicImage, removeUnusedImages, verifyImage } from '../server/storage.js';
import { IMAGE_PATH_PATTERN, PAGE_SIZE, SECTION_ICONS, type Section } from '../shared/catalog.js';

const uuid = z.uuid();
const fields = {
  name: z.string().trim().min(1, 'Enter a section name.').max(100),
  name_en: z.string().trim().max(100).optional(),
  name_ar: z.string().trim().max(100).optional(),
  description: z.string().trim().max(500).default(''),
  icon: z.enum(SECTION_ICONS).default('folder'),
  position: z.number().int().min(0).max(2147483647).default(0),
  is_terminal: z.boolean().default(false),
  price_usd: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/, 'نرخی دۆلار دروست بنووسە.').nullable().default(null),
  price_iqd: z.string().regex(/^\d{1,14}$/, 'نرخی دینار بە ژمارەی تەواو بنووسە.').nullable().default(null),
  image_path: z.string().regex(IMAGE_PATH_PATTERN).nullable().default(null),
};
function productFields(input: { is_terminal: boolean; price_usd: string | null; price_iqd: string | null; image_path: string | null }, context: z.RefinementCtx) {
  if (input.is_terminal && input.price_usd == null && input.price_iqd == null) context.addIssue({ code: 'custom', message: 'تکایە نرخی دۆلار یان دینار بنووسە.', path: ['price_usd'] });
  if (!input.is_terminal && (input.price_usd != null || input.price_iqd != null || input.image_path != null)) context.addIssue({ code: 'custom', message: 'نرخ و وێنە تەنها بۆ کاڵای کۆتاییە.', path: ['is_terminal'] });
}
export const createSchema = z.object({ ...fields, id: uuid.optional(), root_key: z.enum(['parts', 'accessories']), parent_id: uuid.nullable().default(null) }).strict().superRefine(productFields);
const version = z.number({ error: 'تکایە ستۆدیۆ نوێ بکەرەوە و دووبارە هەوڵ بدە.' }).int().positive();
export const updateSchema = z.object({ ...fields, id: uuid, version }).strict().superRefine(productFields);
const present = (row: Section) => ({ ...row, image_url: publicImage(row.image_path) });

async function conflict(id: string, response: VercelResponse) {
  const current = await database().query('select * from public.catalog_sections where id=$1', [id]);
  if (!current.rowCount) throw new HttpError(404, 'This section no longer exists.');
  return response.status(409).json({ error: 'بەڕێوەبەرێکی دیکە ئەم بەشەی گۆڕیوە. وەشانی نوێ بار بکەوە.', section: present(current.rows[0]) });
}
async function cleanup(paths: string[]) {
  if (!paths.length) return;
  const task = removeUnusedImages(paths).catch(() => console.error('Unused catalog image cleanup failed.'));
  if (process.env.VERCEL) waitUntil(task); else await task;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'no-store');
  try {
    authenticate(request.headers.authorization);
    const db = database();
    if (request.method === 'GET') {
      const query = z.object({ root: z.enum(['parts', 'accessories']), parent: uuid.optional(), id: uuid.optional(), offset: z.coerce.number().int().min(0).max(2147483600).default(0), q: z.string().trim().max(100).default('') }).parse(request.query);
      if (query.id) {
        const result = await db.query('select s.*, exists(select 1 from public.catalog_sections c where c.parent_id=s.id and c.root_key=s.root_key) as has_children from public.catalog_sections s where s.id=$1 and s.root_key=$2', [query.id, query.root]);
        if (!result.rowCount) throw new HttpError(404, 'This section no longer exists.');
        return response.json({ section: present(result.rows[0]) });
      }
      const values: (string | number)[] = [query.root];
      const parentClause = query.parent ? `s.parent_id=$${values.push(query.parent)}::uuid` : 's.parent_id is null';
      const searchParam = values.push(query.q ? `%${query.q.replace(/[\\%_]/g, '\\$&')}%` : ''), limitParam = values.push(PAGE_SIZE + 1), offsetParam = values.push(query.offset);
      const result = await db.query(
        `select s.*, exists(select 1 from public.catalog_sections c where c.root_key=s.root_key and c.parent_id=s.id) as has_children
         from public.catalog_sections s where s.root_key=$1 and ${parentClause}
         and ($${searchParam}='' or s.search_name ilike $${searchParam})
         order by s.position, s.created_at, s.id limit $${limitParam} offset $${offsetParam}`, values,
      );
      return response.json({ sections: result.rows.slice(0, PAGE_SIZE).map(present), hasMore: result.rows.length > PAGE_SIZE });
    }
    if (request.method === 'POST') {
      const input = createSchema.parse(request.body);
      const id = input.id || randomUUID();
      await verifyImage(input.image_path, id);
      const result = await db.query(
        `insert into public.catalog_sections (id,root_key,parent_id,name,description,icon,position,is_terminal,price_usd,price_iqd,image_path,name_en,name_ar)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) on conflict(id) do nothing returning *`,
        [id, input.root_key, input.parent_id, input.name, input.description, input.icon, input.position, input.is_terminal, input.price_usd, input.price_iqd, input.image_path, input.name_en || '', input.name_ar || ''],
      );
      if (result.rowCount) return response.status(201).json({ section: present(result.rows[0]) });
      const existing = (await db.query('select * from public.catalog_sections where id=$1', [id])).rows[0];
      const same = existing && ['root_key', 'parent_id', 'name', 'description', 'icon', 'position', 'is_terminal', 'image_path'].every(key => existing[key] === input[key as keyof typeof input]) &&
        ['price_usd', 'price_iqd'].every(key => existing[key] == null ? input[key as keyof typeof input] == null : Number(existing[key]) === Number(input[key as keyof typeof input]));
      const sameTranslations = existing && existing.name_en === (input.name_en || '') && existing.name_ar === (input.name_ar || '');
      if (!same || !sameTranslations) throw new HttpError(409, 'ئەم بەشە پێشتر پاشەکەوت کراوە. ستۆدیۆ نوێ بکەرەوە.');
      return response.json({ section: present(existing) });
    }
    if (request.method === 'PATCH') {
      const input = updateSchema.parse(request.body);
      await verifyImage(input.image_path, input.id);
      const previous = await db.query('select image_path from public.catalog_sections where id=$1', [input.id]);
      const result = await db.query(
        `update public.catalog_sections set name=$1,description=$2,icon=$3,position=$4,is_terminal=$5,price_usd=$6,price_iqd=$7,image_path=$8,
         name_en=coalesce($11,name_en),name_ar=coalesce($12,name_ar)
         where id=$9 and version=$10 returning *`,
        [input.name, input.description, input.icon, input.position, input.is_terminal, input.price_usd, input.price_iqd, input.image_path, input.id, input.version, input.name_en ?? null, input.name_ar ?? null],
      );
      if (!result.rowCount) return await conflict(input.id, response);
      const oldPath = previous.rows[0]?.image_path;
      if (oldPath && oldPath !== input.image_path) await cleanup([oldPath]);
      return response.json({ section: present(result.rows[0]) });
    }
    if (request.method === 'DELETE') {
      const input = z.object({ id: uuid, version }).strict().parse(request.body);
      const result = await db.query(
        `with recursive subtree as (
           select id,image_path from public.catalog_sections where id=$1
           union all select c.id,c.image_path from public.catalog_sections c join subtree p on c.parent_id=p.id
         ), removed as (delete from public.catalog_sections where id=$1 and version=$2 returning id)
         select (select id from removed) as removed_id, array(select image_path from subtree where image_path is not null) as paths`, [input.id, input.version],
      );
      if (!result.rows[0]?.removed_id) return await conflict(input.id, response);
      await cleanup(result.rows[0].paths || []);
      return response.json({ deleted: input.id });
    }
    response.setHeader('Allow', 'GET, POST, PATCH, DELETE'); throw new HttpError(405, 'Method not allowed.');
  } catch (error) { return fail(response, error); }
}
