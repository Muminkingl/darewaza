import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate, HttpError } from '../server/auth.js';
import { fail } from '../server/http.js';

export default function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'no-store');
  try {
    if (request.method !== 'GET') { response.setHeader('Allow', 'GET'); throw new HttpError(405, 'Method not allowed.'); }
    const user = authenticate(request.headers.authorization);
    return response.json({ user: { id: user.id, first_name: user.first_name } });
  } catch (error) { return fail(response, error); }
}
