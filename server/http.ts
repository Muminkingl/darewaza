import type { VercelResponse } from '@vercel/node';
import { ZodError } from 'zod';
import { HttpError } from './auth.js';

export function fail(response: VercelResponse, error: unknown) {
  response.setHeader('Cache-Control', 'no-store');
  if (error instanceof HttpError) return response.status(error.status).json({ error: error.message });
  if (error instanceof ZodError) return response.status(400).json({ error: error.issues[0]?.message || 'Invalid input.' });
  const code = (error as { code?: string })?.code;
  if (code === 'P0001') return response.status(409).json({ error: 'کاڵای کۆتایی ناتوانێت ژێربەشی هەبێت. سەرەتا ژێربەشەکان بپشکنە.' });
  if (code === '57014') return response.status(503).json({ error: 'پەیوەندییەکە خاو بووە. تکایە دووبارە هەوڵ بدە.' });
  if (code === '23503') return response.status(409).json({ error: 'The parent section no longer exists. Refresh and try again.' });
  if (code === '23514') return response.status(400).json({ error: 'The section contains an invalid value.' });
  // Do not log connection strings, Telegram initData, query values, or secrets.
  console.error('Studio request failed', { code: code || 'unknown', type: error instanceof Error ? error.name : 'unknown' });
  return response.status(500).json({ error: 'Something went wrong. Please try again.' });
}
