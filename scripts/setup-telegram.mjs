const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const rawUrl = process.argv[2] || process.env.APP_URL;
if (!token) throw new Error('Set TELEGRAM_BOT_TOKEN in .env.');

async function call(method, body = {}) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!result.ok) throw new Error(`${method}: ${result.description || response.status}`);
  return result.result;
}

// Read-only mode can verify the token without configuring or messaging the bot.
if (process.argv.includes('--check')) {
  const bot = await call('getMe');
  console.log(`Bot token verified: @${bot.username}`);
  process.exit(0);
}
if (!secret || !rawUrl) throw new Error('Set TELEGRAM_WEBHOOK_SECRET and APP_URL in .env, or pass the deployment URL as the argument.');
const url = new URL(rawUrl);
if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('APP_URL must be your HTTPS deployment origin, for example https://sayara.vercel.app');
const appUrl = url.origin;
const health = await fetch(`${appUrl}/api/session`, { signal: AbortSignal.timeout(15000) });
const healthBody = await health.json().catch(() => null);
if (health.status !== 401 || healthBody?.error !== 'Open Studio from Telegram to continue.') throw new Error(`The deployed auth endpoint is not ready (HTTP ${health.status}). Check the Vercel environment variables and ensure the production URL is publicly reachable without Vercel Deployment Protection.`);
await call('setWebhook', { url: `${appUrl}/api/telegram`, secret_token: secret, allowed_updates: ['message'] });
// Unapproved users get no Studio button and no bot response.
await call('setChatMenuButton', { menu_button: { type: 'commands' } });
for (const id of [5549806778, 300993380, 1468696739, 7294439693]) {
  try { await call('setChatMenuButton', { chat_id: id, menu_button: { type: 'web_app', text: 'Open Studio', web_app: { url: appUrl } } }); }
  catch (error) {
    if (/chat not found|user not found/i.test(error.message)) console.log(`Admin ${id}: send /start to the bot once; the webhook will configure the button.`);
    else throw error;
  }
}
const bot = await call('getMe');
console.log(`Configured @${bot.username} at ${appUrl}. Approved admins can send /start and tap Open Studio.`);
