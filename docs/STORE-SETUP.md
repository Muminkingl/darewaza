# Darewaza release setup

The customer app is mobile only. Vercel serves the Telegram Studio at `/` with its four-ID allowlist, backend endpoints and required legal/deletion resources. No customer browser bundle is deployed; old `/app/` URLs redirect to the deletion resource. Native builds use Expo SDK 58. Android uses the existing Play Console package `com.trxstudio.darewaza`; iOS uses `com.darewaza.app`. The name is **Darewaza**; SVG brand masters and the generated 1024px icon are in `assets/brand/`.

## Authentication

Email/password sign-in is a normal Supabase login. The requested reviewer account has been provisioned in Supabase, with no password embedded in the app or repository. Put its credentials in the stores’ private review notes. There is no tester bypass and no public email-signup UI.

Google is enabled in the connected Supabase project. In Supabase Authentication → URL Configuration, allow both:

- `darewaza://auth/callback` for installed builds.
- `https://darewaza.vercel.app/app/` for the web app and online account deletion.

Use a development build or installed app for native OAuth testing; Expo Go does not own the `darewaza` URL scheme. In Google Cloud, use the Supabase callback URL displayed by its provider configuration as the authorized redirect URI. Complete the Google consent screen and publish it or allow the relevant test accounts while it is in testing mode.

Apple is wired but its provider is currently disabled, as requested until credentials are available. Before enabling it:

1. Enable Sign in with Apple for `com.darewaza.app` in Apple Developer and configure that identifier in the Supabase Apple provider.
2. Configure an Apple Services ID for web/Android OAuth and its Supabase return URL. Add it to Supabase’s allowed client IDs.
3. Set server-only Vercel variables `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` (the `.p8` content), `APPLE_NATIVE_CLIENT_ID=com.darewaza.app`, and `APPLE_WEB_CLIENT_ID` (the Services ID). These support Apple token revocation during account deletion. Never use `EXPO_PUBLIC_` for these.
4. Redeploy, then enable the Supabase Apple provider and test with a real Apple account. iOS uses the native Apple sheet with a nonce; other platforms use PKCE OAuth. Renew the web Apple client secret before its six-month expiry.

Account deletion authenticates the customer token on the server. It revokes Apple authorization where relevant, then hard-deletes the Supabase auth user; foreign keys cascade to the customer profile, saved cars, garage preference and saved items. It cannot delete a different user ID supplied by a caller. The native Apple deletion flow asks for a fresh authorization code. On web/Android, a fresh Apple sign-in supplies the provider refresh token; if unavailable, the app asks the user to sign in again.

## Store URLs and disclosures

- Privacy policy: https://darewaza.vercel.app/privacy
- Terms: https://darewaza.vercel.app/terms
- Account deletion: https://darewaza.vercel.app/delete-account
- Support: contact@trxstudio.xyz

Privacy and terms are available in Kurdish Sorani, English, and Arabic, both in the app and on public pages. Online deletion opens the web app directly at a deletion confirmation after sign-in; no installed app is required.

Complete App Store Connect’s App Privacy and Google Play’s Data Safety forms from the actual build and provider configuration. Account ID, email/name, saved content, saved vehicle details and language preference are linked to the account for app functionality. Location is optional, used to identify a city, and coordinates are not stored by our backend; native reverse geocoding uses the OS service. City is stored locally. Supabase/Vercel process authentication/operational traffic and logs. There are no ads, analytics SDKs, tracking permission, payments, or orders in this release. Provider log/backups retention must match the published policy.

Store submissions still require your developer account details, age/content rating, store listing, real screenshots, signing/provisioning, Google consent settings, and completed Apple configuration. The implemented flows are not a guarantee of store approval. Apple requires account deletion inside apps with account creation; Google additionally requires an external deletion resource. See [Apple account deletion](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion) and [Google Play account deletion](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).

## Performance and verification

The free tier is supported by avoiding realtime subscriptions and background polling. Catalog pages contain 40 rows; saved pages contain 30. Search starts at two characters after a 250ms debounce and uses a trigram index. List screens are virtualized; membership checks are batched. SWR caches by query/account, deduplicates requests for 15 seconds, and refreshes on foreground/focus or pull-to-refresh. Customer RLS predicates and paging indexes begin with the account ID. Native auth uses SecureStore; only public Supabase identifiers enter the app bundle.

Run `npm run typecheck`, `npm test`, `npm run db:verify`, and `npm run api:verify`. With the local API running, `npx tsx scripts/verify-customer.ts` tests two accounts, row isolation, denied forged ownership, removal of history storage, concurrent saves, and real account deletion with cascade cleanup. Add `--remote` to verify the deployed account endpoint. Temporary auth accounts are removed, and catalog test rows are rolled back.

For a native build: `npx eas-cli build --profile preview --platform android` or `npx eas-cli build --profile production --platform all`. iOS builds and submission need the Apple Developer configuration above. `npm run build` packages the Studio, customer web app, brand, and legal pages into `dist`; deploy the repository root to Vercel.

Vehicle models and explicit compatibility are managed in Telegram Studio. Folder links are shortcuts and do not imply fitment for descendants. Vehicle search/model selection uses cursor paging, compatibility queries use model/section indexes, and personal cars are protected by RLS. Run `npx tsx scripts/verify-vehicles.ts` and `npx tsx scripts/verify-vehicle-api.ts --remote` for the additional ownership, compatibility, cascade and concurrent edit checks.
