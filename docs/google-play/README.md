# Darewaza Android release

Android package: `com.trxstudio.darewaza`, matching the existing Play Console app. Version: `1.0.0`, version code `2`. iOS retains `com.darewaza.app`.

Run `npm run build:android` on the configured Windows workstation. The script loads only public Expo variables from `.env`, generates Android through Expo prebuild, and creates the signed App Bundle and release APK in `artifacts/google-play/`. Use `--skip-prebuild` only to resume an unchanged native configuration.

Local tooling: Android SDK 37, build tools 36.0.0, NDK 27.1, CMake 3.22.1 with Ninja 1.13.2 (Windows long-path support), and the Android Studio JBR. Override Java with `DAREWAZA_JAVA_HOME` and the SDK with `ANDROID_HOME`. The target SDK is 36 and the minimum SDK is 24. Release builds enable Hermes, code shrinking and resource shrinking, and include arm64-v8a and x86_64.

Back up `credentials/darewaza-upload.jks` and `credentials/android-signing.json` privately. They are required to sign future updates. Never commit or deploy them. The Google service-account JSON is also excluded from Git, Vercel and EAS upload archives. EAS cloud builds require separate configuration using the same upload key; the local release build does not use paid build services.

`listing.json` contains English and Arabic listing copy. The customer app also supports Kurdish Sorani. Brand and native screenshot artifacts are under the ignored release directory. Use real native screenshots for Play listings.

The customer app is not deployed as a website. Vercel contains only the protected Telegram Studio, backend and public policy/deletion resources. External account and saved-data deletion requests can be submitted to the published support email; in-app deletion is immediate. Leave the optional Play listing website field empty. Apple sign-in appears only after its Supabase provider is enabled, so the Android reviewer does not see an unfinished sign-in option.

`data-safety.csv` uses the schema exported from Play Console. It declares name, email, account ID, optional car/profile information, optional foreground location processed through the OS geocoder, catalog searches, saved-item actions, and technical identifiers used in infrastructure security logs. Supabase and Vercel process data as service providers. Do not claim that provider logs or geocoding are ephemeral; search terms may also occur in provider request logs. No advertising, marketing or analytics purpose is declared. Account and saved-data deletion use the public deletion page. Update the declaration if app behavior or infrastructure changes.

The IARC questionnaire describes an online product catalog without violent, sexual, substance-related or age-restricted content, user-to-user sharing, digital purchases, gambling or rewards. The intended audience is adults. The store category is Auto & Vehicles. TRX Studio is the developer's branding; this setup does not assert incorporation.

Closed testing uses the existing Alpha track and the existing Internal Testers email list. Listing inclusion is not tester opt-in. Google requires at least 12 opted-in testers for at least 14 continuous days before a qualifying personal account can apply for production access. A review submission and its approval are separate from that testing period. Do not claim completion until the Console confirms the test is available.
