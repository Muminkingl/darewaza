# سەیارە · Sayara

An Expo React Native catalog for Android and iOS, with a separate Telegram Mini App for managing sections. Kurdish Sorani interface, local Arabic fonts, navy location header, and exactly two home cards: **مەوادەکان** and **جوانکاریەکان**.

The customer app only reads Supabase. There are no administration controls in it. Both cards use the same nested catalog, while the Studio opens on مەوادەکان by default. The catalog is intentionally empty until an administrator adds real sections.

## Run the customer app

Node.js 22.13 or later is required. Dependencies and local environment values are already configured in this checkout.

```powershell
npm ci
npm start
```

This project uses Expo SDK 58 and includes `expo-dev-client`. For a development build, use `npx expo run:android` with an Android SDK installed, or `npx eas-cli build --profile development --platform android`, then run `npm start`. iOS local native builds require macOS; EAS can build iOS remotely. You can also use a compatible Expo Go build from https://expo.dev/go with `npm start -- --go`; a store version of Expo Go for an older SDK will not open it.

```powershell
npm run web
```

The first launch offers location detection, manual city selection, and “choose later.” Denying permission leaves manual selection available. Any city can be typed. The selection is saved on the device. Location currently sets the header city; it does not filter the catalog or get stored in Supabase. Native location uses foreground permission only. The browser preview can identify nearby supported Iraqi cities without sending coordinates to a third-party geocoder.

## Deploy the project root to Vercel

Deploy **this root folder**, not `admin/` or `dist/`. `vercel.json` builds the Studio and deploys the three `/api` functions. The native app is built separately through Expo/EAS.

Vercel settings are already declared:

| Setting | Value |
| --- | --- |
| Framework | Other |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node.js | 24.x recommended; 22.13+ supported |

Add these **server environment variables** to Vercel, copying their values from the local `.env`:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Supabase **session pooler**, port **5432** |
| `TELEGRAM_BOT_TOKEN` | Bot API token |
| `TELEGRAM_WEBHOOK_SECRET` | Generated webhook secret already saved locally |
| `APP_URL` | Your stable production origin, e.g. `https://sayara.vercel.app` |

Local `.env` files are excluded from Git and Vercel uploads. They are **not automatically uploaded as Vercel environment variables**. Set production variables in the Vercel dashboard, then redeploy if necessary. The production URL must be reachable by Telegram without Vercel Deployment Protection; the Studio's own server-side Telegram checks control admin access. The database connection verifies TLS using Supabase's public CA certificate, bundled in `supabase/prod-ca-2021.crt`.

The Expo customer bundle needs only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`; these are already in `.env`. Supply the same two values in EAS when building in the cloud. Never prefix a bot token, database URL, or service role key with `EXPO_PUBLIC_` or `VITE_`.

## Connect Telegram after deployment

After the site is live, set `APP_URL` in local `.env` to the same production origin used in Vercel. Then run:

```powershell
npm run bot:setup
# Or supply the origin directly:
npm run bot:setup -- https://YOUR_PROJECT.vercel.app
```

This registers the webhook at `/api/telegram` and configures the **Open Studio** button for exactly these four Telegram users:

- `5549806778`
- `300993380`
- `1468696739`
- `7294439693`

Open **@darewazabot**, send `/start`, and tap **Open Studio**. An admin who has never started the bot must send `/start` once; the webhook then installs their menu button. Other users get no bot reply, and every Studio API request independently rejects them. You can share the deployment URL back in the chat to complete this setup.

Studio verifies Telegram's signed `initData` on the server using HMAC-SHA256, checks session age (one hour) and the exact allowlist, and validates every mutation. Browser-only access displays a locked screen. If a session expires, close and reopen the Mini App. The server never trusts `initDataUnsafe`, a URL user ID, or the frontend's claims.

## Manage the catalog

In Studio, select مەوادەکان, tap **بەشی نوێ**, enter a name (for example BMW), optionally choose an icon, description and sort order, then save. Open the section and repeat for its subsections. Add as many siblings and levels as needed; there is no application-imposed nesting limit. Use the breadcrumbs or Telegram back button to return to an ancestor.

Each row's `…` menu offers editing and deletion. Lower sort numbers appear first. Deleting a section also deletes all its descendants and requires a confirmation in Studio. Moving an existing section to another parent is intentionally unsupported, which prevents hierarchy cycles. Both root catalogs are separate and cannot share a child across roots.

Sections are paginated rather than loading the entire hierarchy at once. Customer pages refresh when opened, when the app returns to the foreground, or when pulled down to refresh. No products, cart, payment flow, or customer accounts are included in this first version.

## Database and verification

The first migration has already been applied to the supplied Supabase project. Re-running it is safe:

```powershell
npm run db:migrate
npm run db:verify
npm run api:verify
npm test
npm run typecheck
npm run build
npm run export:mobile-web
```

`db:verify` checks 35 nested levels, 86 siblings, the parent/root constraint, cascade deletion, anonymous read access, and write rejection for both `anon` and `authenticated` roles. Test data is rolled back. Public clients have SELECT grants and an RLS read policy, with no write grants or write policies. Admin API writes go through the session pooler only after Telegram verification.

## Local Studio development

```powershell
npm run dev
```

Open http://127.0.0.1:3000. It shows the locked screen outside Telegram.

For local UI review, `npm run dev -- --review` supplies a local Telegram test session signed with an ephemeral key. It binds to loopback, uses no live bot signing token, and is excluded from production entry points. It connects to your configured database, so any sections you save there are real. No authentication bypass exists in the production build or Vercel functions.

## Telegram's own hosting

Telegram now offers [Telegram Serverless](https://core.telegram.org/bots/serverless), including Mini App hosting. It requires enabling Serverless in BotFather and obtaining a separate CLI access token. This checkout implements the Vercel route requested here, including the direct PostgreSQL session-pooler connection. It does not deploy to Telegram Serverless automatically.

## Project layout

```text
App.tsx                    Customer React Native app
src/                       Native location, catalog hooks, components
admin/                     Telegram Mini App (React + Vite)
api/                       Vercel session, catalog and webhook endpoints
server/                    Server-only authentication and pooler connection
shared/                    Catalog types and the two root definitions
supabase/migrations/       Versioned database schema and RLS grants
scripts/                   Local development, migration, verification, bot setup
tests/                     Signature, allowlist and endpoint security checks
```
