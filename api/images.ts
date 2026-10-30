import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { authenticate, HttpError } from '../server/auth.js';
import { fail } from '../server/http.js';
import { publicImage, removeUnusedImages, storage } from '../server/storage.js';
import { IMAGE_PATH_PATTERN, MAX_IMAGE_BYTES } from '../shared/catalog.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'no-store');
  try {
    authenticate(request.headers.authorization);
    if (request.method === 'POST') {
      const input = z.object({ section_id: z.uuid(), type: z.enum(['image/webp', 'image/jpeg', 'image/png']), size: z.number().int().positive().max(MAX_IMAGE_BYTES) }).strict().parse(request.body);
      const extension = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' }[input.type];
      const path = `${input.section_id}/${randomUUID()}.${extension}`;
      const { data, error } = await storage().createSignedUploadUrl(path);
      if (error) throw new HttpError(502, 'Unable to prepare the image upload. Please try again.');
      return response.json({ path, signedUrl: data.signedUrl, publicUrl: publicImage(path) });
    }
    if (request.method === 'DELETE') {
      const { path } = z.object({ path: z.string().regex(IMAGE_PATH_PATTERN) }).strict().parse(request.body);
      await removeUnusedImages([path]);
      return response.json({ ok: true });
    }
    response.setHeader('Allow', 'POST, DELETE'); throw new HttpError(405, 'Method not allowed.');
  } catch (error) { return fail(response, error); }
}
