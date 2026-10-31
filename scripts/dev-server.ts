import 'dotenv/config';
import http from 'node:http';
import { createServer } from 'vite';
import { createHmac, randomBytes } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import session from '../api/session';
import sections from '../api/sections';
import telegramHandler from '../api/telegram';
import images from '../api/images';
import account from '../api/account';

// Local review mode uses an ephemeral signing key, never the live bot token.
// It is opt-in, loopback-only, and is not included in any production entry point.
const review = process.argv.includes('--review');
if (review) process.env.TELEGRAM_BOT_TOKEN = randomBytes(32).toString('hex');
const vite = await createServer({
  configFile: 'admin/vite.config.ts',
  server: { middlewareMode: true },
  plugins: review ? [{
    name: 'local-telegram-review',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const params = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id: 5549806778, first_name: 'بەڕێوەبەر' }) });
        const check = [...params.entries()].sort(([a], [b]) => a < b ? -1 : 1).map(([key, value]) => `${key}=${value}`).join('\n');
        const secret = createHmac('sha256', 'WebAppData').update(process.env.TELEGRAM_BOT_TOKEN!).digest();
        params.set('hash', createHmac('sha256', secret).update(check).digest('hex'));
        return html.replace('</head>', `<script>window.Telegram={WebApp:{initData:${JSON.stringify(params.toString())},ready(){},expand(){},setHeaderColor(){},setBackgroundColor(){}}}</script></head>`);
      },
    },
  }] : [],
});

const handlers: Record<string, typeof sections | typeof session> = { '/api/session': session, '/api/sections': sections, '/api/telegram': telegramHandler, '/api/images': images, '/api/account':account };
const server = http.createServer(async (incoming, outgoing) => {
  const url = new URL(incoming.url || '/', 'http://127.0.0.1:3000');
  const handler = handlers[url.pathname];
  if (!handler) { vite.middlewares(incoming, outgoing); return; }
  try {
    let raw = '';
    for await (const chunk of incoming) { raw += chunk; if (raw.length > 32_768) { outgoing.writeHead(413); outgoing.end(); return; } }
    const request = Object.assign(incoming, { query: Object.fromEntries(url.searchParams), body: raw ? JSON.parse(raw) : undefined }) as VercelRequest;
    const response = outgoing as VercelResponse;
    response.status = code => { response.statusCode = code; return response; };
    response.json = body => { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(body)); return response; };
    await handler(request, response);
  } catch { if (!outgoing.headersSent) outgoing.writeHead(400, { 'Content-Type': 'application/json' }); outgoing.end(JSON.stringify({ error: 'Invalid request.' })); }
});
server.listen(3000, '127.0.0.1', () => console.log(`Studio: http://127.0.0.1:3000${review ? ' (local review mode)' : ' (Telegram required)'}`));
