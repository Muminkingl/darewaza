# Darewaza

An Expo React Native catalog for Android and iOS, with a separate Telegram Mini App for managing sections. Kurdish Sorani by default, English and Arabic, local Arabic fonts, a navy/mint doorway brand, and two home collections: **پارچەی یەدەگ** and **جوانکاریەکان**.

The customer app reads the catalog and lets signed-in customers manage their own profile and saved sections. The bottom bar has Saved, Home in the center, and Profile at the trailing edge (right in English, left in Kurdish/Arabic). Search is in the header. There are no catalog administration controls. Both collections use the same nested catalog; the Telegram Studio opens on spare parts by default. See [store and authentication setup](docs/STORE-SETUP.md) for Google/Apple configuration, review notes, privacy disclosures, and native builds.

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

Deploy **this root folder**, not `admin/` or `dist/`. `vercel.json` builds the Studio at `/`, the customer web app at `/app/`, public privacy/terms/deletion pages, and the `/api` functions. Installed Android/iOS apps are built separately through Expo/EAS.

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
| `SUPABASE_URL` | Supabase project URL, used for product images |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for signed image uploads and cleanup |

Local `.env` files are excluded from Git and Vercel uploads. They are **not automatically uploaded as Vercel environment variables**. Set production variables in the Vercel dashboard, then redeploy if necessary. The production URL must be reachable by Telegram without Vercel Deployment Protection; the Studio's own server-side Telegram checks control admin access. The database connection verifies TLS using Supabase's public CA certificate, bundled in `supabase/prod-ca-2021.crt`.

The Expo customer bundle uses only the public Supabase URL/anon key and account API origin. `src/lib/publicConfig.ts` contains the connected project's public defaults, protected by database RLS. `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `EXPO_PUBLIC_API_URL` override these when needed. Never prefix a bot token, database URL, or service role key with `EXPO_PUBLIC_` or `VITE_`.

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

In Studio, select پارچەی یەدەگ, tap **بەشی نوێ**, enter a name (for example BMW), optionally choose an icon, description and sort order, then save. Open the section and repeat for its subsections. Add as many siblings and levels as needed; there is no application-imposed nesting limit. Use the breadcrumbs or Telegram back button to return to an ancestor.

Each row's `…` menu offers editing and deletion. Lower sort numbers appear first. Deleting a section also deletes all its descendants and requires a confirmation in Studio. Moving an existing section to another parent is intentionally unsupported, which prevents hierarchy cycles. Both root catalogs are separate and cannot share a child across roots.

Turn on **ئەمە کاڵای کۆتاییە** to create a final item. Enter a USD price, an IQD price, or both independently; no exchange rate is assumed. Prices accept Arabic/Persian digits. IQD uses whole dinars; USD supports two decimals. Both prices remain editable. Final items can have a photo and open a detail view with the full image at the top; tap it to enlarge. Folders with existing children cannot become final items, and final items cannot contain children. These rules are also enforced in the database.

Images are resized to a maximum 1600-pixel side and compressed before uploading directly to Supabase through a signed URL. The image bucket allows public reads for the customer catalog, limits files to 2 MB, and has no anonymous write policy. Every upload/cleanup API request requires an approved Telegram signature. Images use unique paths to avoid stale CDN replacements; unused images are cleaned up after edits/deletions.

Sections are paginated rather than loading the entire hierarchy at once. Studio and customer screens cache pages and debounce searches. Customer data refreshes on foreground/focus or pull-to-refresh. Version checks reject conflicting catalog edits/deletions. Stable creation IDs prevent duplicates on retried saves. Customer accounts use Supabase Auth, with private saved items. No cart, orders, or payment flow is included.

## My Car and vehicle compatibility

Customers can save several cars, switch their selected car, edit/remove them in Profile → My cars, open catalog shortcuts from Home, and filter Search by the selected car or all vehicles. Engine and trim suggestions come from actual store rules. Cars and the selected vehicle sync privately to the account and are removed by account deletion. Browsing remains available without saving a car.

In Telegram Studio, use **مارکە و مۆدێلەکان** to add/edit make and model names. Deactivate a model to hide it from new customer selections while keeping existing cars and links. Open a section’s **… → ئۆتۆمبێلە پەیوەندیدارەکان**, or the vehicle button inside the section, to add/edit/remove links with a year range and optional engine/trim restrictions. A folder link is a navigation shortcut only; it never asserts compatibility for descendants. A final item needs its own explicit vehicle rules. One item can support many vehicles without duplicate products. Empty engine/trim restrictions mean all engines/trims, so use them only when accurate. Vehicle names and compatibility must be entered by the store; no guessed year ranges or third-party fitment data are imported.

The database separates shared models/rules from RLS-protected personal cars. It indexes model matching and section lookups. Vehicle results and the customer model picker use cursor pagination (40 rows plus one look-ahead); saved-car lists are paginated, compatibility lists load only on expansion, and no catalog tree download, polling, or per-row fit queries are used. Writes have optimistic version checks; retrying a create uses the same UUID. Studio retains the same four administrator IDs.

Run `npx tsx scripts/verify-vehicles.ts` for database ownership, exact/partial compatibility and cursor tests, and `npx tsx scripts/verify-vehicle-api.ts --remote` for live endpoint and six-session concurrency checks. Both clean their temporary fixtures.

## Database and verification

The first migration has already been applied to the supplied Supabase project. Re-running it is safe:

```powershell
npm run db:migrate
npm run storage:setup
npm run db:verify
npm run api:verify
npm test
npm run typecheck
npm run build
npm run export:mobile-web
```

`db:verify` checks 35 nested levels, 86 siblings, parent/root constraints, cascade deletion, anonymous read rejection, and catalog write rejection for customers. Test data is rolled back. Catalog reads require authentication. Customer tables have account-scoped RLS, indexed paging, and cascading auth-user deletion. Catalog writes go through the session pooler after Telegram verification. `npx tsx scripts/verify-customer.ts` additionally checks account isolation, six concurrent saves, removal of history storage, and full account deletion using disposable test accounts.

`api:verify` also exercises six concurrent creates, conflicting edits, stale deletes, duplicate-free retries, final-item boundaries, both currencies, and signed image uploads. It removes only its own temporary records and images. Use `npm run api:verify -- --remote` to run those checks against `APP_URL` after a production deployment. The image bucket has already been configured for this project; `storage:setup` is idempotent.

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
