import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { authenticate, HttpError } from '../server/auth.js';
import { database } from '../server/database.js';
import { fail } from '../server/http.js';
import { PAGE_SIZE, SECTION_ICONS } from '../shared/catalog.js';

const uuid = z.uuid();
const fields = {
  name: z.string().trim().min(1, 'Enter a section name.').max(100, 'Use 100 characters or fewer.'),
  description: z.string().trim().max(500).default(''),
  icon: z.enum(SECTION_ICONS).default('folder'),
  position: z.number().int().min(0).max(2147483647).default(0),
};
const createSchema = z.object({ ...fields, root_key: z.enum(['parts', 'accessories']), parent_id: uuid.nullable().default(null) }).strict();
const updateSchema = z.object({ ...fields, id: uuid }).strict();

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'no-store');
  try {
    authenticate(request.headers.authorization);
    const db = database();
    if (request.method === 'GET') {
      const query = z.object({
        root: z.enum(['parts', 'accessories']),
        parent: uuid.optional(),
        offset: z.coerce.number().int().min(0).max(2147483600).default(0),
        q: z.string().trim().max(100).default(''),
      }).parse(request.query);
      const result = await db.query(
        `select * from public.catalog_sections
         where root_key = $1 and parent_id is not distinct from $2::uuid
         and ($3 = '' or strpos(lower(name), lower($3)) > 0)
         order by position, created_at, id limit $4 offset $5`,
        [query.root, query.parent || null, query.q, PAGE_SIZE + 1, query.offset],
      );
      return response.json({ sections: result.rows.slice(0, PAGE_SIZE), hasMore: result.rows.length > PAGE_SIZE });
    }
    if (request.method === 'POST') {
      const input = createSchema.parse(request.body);
      const result = await db.query(
        `insert into public.catalog_sections (root_key, parent_id, name, description, icon, position)
         values ($1, $2, $3, $4, $5, $6) returning *`,
        [input.root_key, input.parent_id, input.name, input.description, input.icon, input.position],
      );
      return response.status(201).json({ section: result.rows[0] });
    }
    if (request.method === 'PATCH') {
      const input = updateSchema.parse(request.body);
      const result = await db.query(
        'update public.catalog_sections set name=$1, description=$2, icon=$3, position=$4 where id=$5 returning *',
        [input.name, input.description, input.icon, input.position, input.id],
      );
      if (!result.rowCount) throw new HttpError(404, 'This section no longer exists.');
      return response.json({ section: result.rows[0] });
    }
    if (request.method === 'DELETE') {
      const { id } = z.object({ id: uuid }).strict().parse(request.body);
      const result = await db.query('delete from public.catalog_sections where id=$1 returning id', [id]);
      if (!result.rowCount) throw new HttpError(404, 'This section no longer exists.');
      return response.json({ deleted: id });
    }
    response.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    throw new HttpError(405, 'Method not allowed.');
  } catch (error) { return fail(response, error); }
}
